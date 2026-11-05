// Central State & Actions Hook for BIAI CRM
// Dual-Sync Architecture: Real-time Supabase cloud sync + resilient local storage backup.

import { useState, useEffect, useCallback, useRef } from 'react';
import rawSampleCSV from '../data/sample-enquiries.csv?raw';
import { parseCSV, buildCSVWithBOM } from '../lib/csv.js';
import { normalizeBDPhone } from '../lib/phone.js';
import { analyzeWithRules } from '../lib/rulesFallback.js';
import {
  findDuplicateByPhone,
  mergeIncomingLeadIntoExisting,
  deduplicateLeadList
} from '../lib/dedupe.js';
import { processQueueWithConcurrency } from '../lib/aiQueue.js';
import {
  isSupabaseConfigured,
  fetchLeadsFromCloud,
  upsertLeadToCloud,
  batchUpsertLeadsToCloud,
  deleteLeadFromCloud,
  fetchAppSettingFromCloud,
  saveAppSettingToCloud,
  subscribeToCloudChanges,
  loadStoredLeads,
  saveStoredLeads,
  loadKnowledgeBase,
  saveKnowledgeBase,
  resetKnowledgeBase,
  loadTeamMembers,
  saveTeamMembers,
  dbRowToLead
} from '../lib/storage.js';
import { analyzeEnquiry } from '../services/aiService.js';
import { dispatchLeadReply } from '../utils/sendDispatcher.js';

function nowFormatted() {
  return new Date().toISOString().replace('T', ' ').slice(0, 16);
}

// Parse BIAI's verbatim 20 sample enquiries from sample-enquiries.csv
export function buildInitialSampleLeads(kb) {
  const rawRows = parseCSV(rawSampleCSV);
  const rawLeadList = rawRows.map((row, idx) => {
    const id = row['id'] || String(idx + 1);
    const channel = row['channel'] || 'WhatsApp';
    const receivedAt = row['received at'] || nowFormatted();
    const senderName = row['sender name'] || '';
    const phone = normalizeBDPhone(row['phone'] || '');
    const message = row['message'] || '';

    const baseline = analyzeWithRules({
      message,
      channel,
      senderName,
      phone,
      receivedAt,
      replyLanguage: 'Auto',
      kb
    });

    return {
      id: `sample_${id}`,
      sampleId: id,
      channel: baseline.detectedChannel,
      receivedAt,
      senderName: baseline.extractedName,
      phone: baseline.extractedPhone,
      message,
      messages: [
        {
          id: `msg_${id}_1`,
          receivedAt,
          channel,
          text: message
        }
      ],
      repeatCount: 1,
      leadType: baseline.leadType,
      interest: baseline.interest,
      status: baseline.recommendedStatus,
      urgency: baseline.urgency,
      language: baseline.detectedLanguage,
      replyLanguage: 'Auto',
      teamSize: baseline.teamSize,
      flags: baseline.flags,
      owner: 'Unassigned',
      nextFollowUpAt: baseline.nextFollowUpAt || '',
      lastContactedAt: '',
      isResolved: false,
      resolvedAt: null,
      aiSummary: baseline.aiSummary,
      nextAction: baseline.nextAction,
      suggestedReply: baseline.suggestedReply,
      missingFacts: baseline.missingFacts || [],
      aiSource: 'rules',
      editedFields: [],
      notes: [
        {
          id: `n_init_${id}`,
          date: receivedAt,
          text: `Imported from BIAI sample-enquiries.csv (Row #${id}).`
        }
      ]
    };
  });

  return deduplicateLeadList(rawLeadList);
}

export function useLeads({ showToast }) {
  const [knowledgeBase, setKnowledgeBase] = useState(() => loadKnowledgeBase());
  const [teamMembers, setTeamMembers] = useState(() => loadTeamMembers());
  const [syncStatus, setSyncStatus] = useState(() =>
    isSupabaseConfigured ? 'connecting' : 'local'
  );

  const [leads, setLeads] = useState(() => {
    const saved = loadStoredLeads(null);
    if (saved && saved.length > 0) {
      return saved;
    }
    return buildInitialSampleLeads(loadKnowledgeBase());
  });

  const [generatingLeadId, setGeneratingLeadId] = useState(null);
  const [batchProgress, setBatchProgress] = useState(null);

  // Sync to local storage always as offline backup
  useEffect(() => {
    saveStoredLeads(leads);
  }, [leads]);

  // Initial Cloud Hydration & Realtime Subscription
  const isHydratedRef = useRef(false);
  const kbRef = useRef(knowledgeBase);
  useEffect(() => {
    kbRef.current = knowledgeBase;
  }, [knowledgeBase]);

  useEffect(() => {
    if (!isSupabaseConfigured) {
      return;
    }

    let isMounted = true;

    async function hydrateFromCloud() {
      try {
        const [cloudLeads, cloudKb, cloudTeam] = await Promise.all([
          fetchLeadsFromCloud(),
          fetchAppSettingFromCloud('knowledge_base'),
          fetchAppSettingFromCloud('team_members')
        ]);

        if (!isMounted) return;

        if (cloudKb) {
          setKnowledgeBase(cloudKb);
          saveKnowledgeBase(cloudKb);
        }
        if (cloudTeam && Array.isArray(cloudTeam)) {
          setTeamMembers(cloudTeam);
          saveTeamMembers(cloudTeam);
        }

        if (Array.isArray(cloudLeads)) {
          if (cloudLeads.length > 0) {
            setLeads(cloudLeads);
            setSyncStatus('synced');
          } else {
            // First time setup on clean cloud DB: seed with the verbatim 20 samples
            const initialSamples = buildInitialSampleLeads(cloudKb || kbRef.current);
            setLeads(initialSamples);
            await batchUpsertLeadsToCloud(initialSamples);
            setSyncStatus('synced');
          }
        } else {
          // Cloud query error or network offline
          setSyncStatus('offline');
        }
      } catch {
        if (isMounted) setSyncStatus('offline');
      } finally {
        if (isMounted) isHydratedRef.current = true;
      }
    }

    hydrateFromCloud();

    // Setup Realtime WebSocket Listener
    const unsubscribe = subscribeToCloudChanges({
      onLeadsChange: (payload) => {
        if (!isHydratedRef.current) return;
        const { eventType, new: newRow, old: oldRow } = payload;

        if (eventType === 'INSERT' || eventType === 'UPDATE') {
          if (newRow && newRow.id) {
            const updatedLead = dbRowToLead(newRow);
            setLeads((prev) => {
              const idx = prev.findIndex((l) => l.id === updatedLead.id);
              if (idx !== -1) {
                const nextList = [...prev];
                nextList[idx] = updatedLead;
                return nextList;
              }
              return [updatedLead, ...prev];
            });
          }
        } else if (eventType === 'DELETE') {
          if (oldRow && oldRow.id) {
            setLeads((prev) => prev.filter((l) => l.id !== oldRow.id));
          }
        }
      },
      onStatusChange: (status) => {
        if (status === 'SUBSCRIBED') {
          setSyncStatus('synced');
        } else if (status === 'CLOSED' || status === 'CHANNEL_ERROR') {
          setSyncStatus('offline');
        }
      }
    });

    return () => {
      isMounted = false;
      unsubscribe();
    };
  }, []); // Run once on mount

  const updateKnowledgeBase = useCallback(
    (nextKb) => {
      setKnowledgeBase(nextKb);
      saveKnowledgeBase(nextKb);
      saveAppSettingToCloud('knowledge_base', nextKb);
      if (showToast) showToast('Knowledge Base saved & synced to Supabase.');
    },
    [showToast]
  );

  const handleResetKnowledgeBase = useCallback(() => {
    const fresh = resetKnowledgeBase();
    setKnowledgeBase(fresh);
    saveAppSettingToCloud('knowledge_base', fresh);
    if (showToast) showToast('Knowledge Base reset to default TBC template.');
  }, [showToast]);

  const updateTeamMembers = useCallback(
    (nextMembers) => {
      setTeamMembers(nextMembers);
      saveTeamMembers(nextMembers);
      saveAppSettingToCloud('team_members', nextMembers);
      if (showToast) showToast('Team roster updated & synced to Supabase.');
    },
    [showToast]
  );

  // Apply AI analysis result to a lead while respecting human-edited fields
  const applyAnalysisToLead = (lead, aiRes, overrideReplyLanguage) => {
    const edited = new Set(lead.editedFields || []);
    return {
      ...lead,
      senderName: edited.has('senderName')
        ? lead.senderName
        : aiRes.extractedName || lead.senderName,
      phone: edited.has('phone')
        ? lead.phone
        : aiRes.extractedPhone || lead.phone,
      channel: edited.has('channel')
        ? lead.channel
        : aiRes.detectedChannel || lead.channel,
      leadType: edited.has('leadType')
        ? lead.leadType
        : aiRes.leadType || lead.leadType,
      interest: edited.has('interest')
        ? lead.interest
        : aiRes.interest || lead.interest,
      status: edited.has('status')
        ? lead.status
        : aiRes.recommendedStatus || lead.status,
      urgency: edited.has('urgency')
        ? lead.urgency
        : aiRes.urgency || lead.urgency,
      language: aiRes.detectedLanguage || lead.language,
      replyLanguage: overrideReplyLanguage || lead.replyLanguage || 'Auto',
      teamSize:
        edited.has('teamSize')
          ? lead.teamSize
          : aiRes.teamSize !== undefined
            ? aiRes.teamSize
            : lead.teamSize,
      flags: Array.from(new Set([...(lead.flags || []), ...(aiRes.flags || [])])),
      nextFollowUpAt:
        edited.has('nextFollowUpAt') || lead.nextFollowUpAt
          ? lead.nextFollowUpAt
          : aiRes.nextFollowUpAt || '',
      aiSummary: aiRes.aiSummary || lead.aiSummary,
      nextAction: aiRes.nextAction || lead.nextAction,
      suggestedReply:
        aiRes.suggestedReply !== undefined
          ? aiRes.suggestedReply
          : lead.suggestedReply,
      missingFacts: aiRes.missingFacts || [],
      aiSource: aiRes.source || 'ai',
      notes: [
        {
          id: `n_ai_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
          date: nowFormatted(),
          text:
            aiRes.source === 'ai'
              ? `AI analyzed enquiry & drafted ${overrideReplyLanguage && overrideReplyLanguage !== 'Auto' ? overrideReplyLanguage : aiRes.detectedLanguage || lead.language} reply.`
              : `Rule engine drafted reply (AI proxy offline: ${aiRes.fallbackReason || 'fallback'}).`
        },
        ...(lead.notes || [])
      ]
    };
  };

  // Single-lead AI analysis & reply generation
  const generateReplyForLead = async (lead, replyLanguageOverride) => {
    if (!lead) return null;
    setGeneratingLeadId(lead.id);
    const effectiveReplyLang =
      replyLanguageOverride || lead.replyLanguage || 'Auto';

    try {
      const combinedMessage =
        Array.isArray(lead.messages) && lead.messages.length > 1
          ? lead.messages.map((m) => m.text).join('\nFollow-up message: ')
          : lead.message;

      const aiRes = await analyzeEnquiry({
        message: combinedMessage,
        channel: lead.channel,
        senderName: lead.senderName,
        phone: lead.phone,
        receivedAt: lead.receivedAt,
        replyLanguage: effectiveReplyLang,
        knowledgeBase
      });

      const updatedLead = applyAnalysisToLead(lead, aiRes, effectiveReplyLang);

      setLeads((prev) =>
        prev.map((item) => (item.id === lead.id ? updatedLead : item))
      );

      upsertLeadToCloud(updatedLead);

      if (showToast) {
        showToast(
          aiRes.source === 'ai'
            ? `AI analyzed & drafted reply for ${lead.senderName}`
            : `Drafted reply via rules fallback for ${lead.senderName}`
        );
      }
      return updatedLead;
    } finally {
      setGeneratingLeadId(null);
    }
  };

  // Batch run AI across a list of leads (concurrency=3)
  const runBatchAIAnalysis = async (targetLeads = leads, label = 'Analyzing enquiries with AI') => {
    const list = targetLeads.filter((l) => l.leadType !== 'Spam');
    if (list.length === 0) return;

    setBatchProgress({ completed: 0, total: list.length, label });
    const enrichedList = [];

    await processQueueWithConcurrency({
      items: list,
      concurrency: 3,
      processor: async (lead) => {
        const combinedMessage =
          Array.isArray(lead.messages) && lead.messages.length > 1
            ? lead.messages.map((m) => m.text).join('\nFollow-up message: ')
            : lead.message;

        const aiRes = await analyzeEnquiry({
          message: combinedMessage,
          channel: lead.channel,
          senderName: lead.senderName,
          phone: lead.phone,
          receivedAt: lead.receivedAt,
          replyLanguage: lead.replyLanguage || 'Auto',
          knowledgeBase
        });
        return { leadId: lead.id, aiRes };
      },
      onProgress: ({ completed, total, latestResult }) => {
        setBatchProgress({ completed, total, label });
        if (latestResult && latestResult.leadId && latestResult.aiRes) {
          setLeads((prev) =>
            prev.map((item) => {
              if (item.id === latestResult.leadId) {
                const updated = applyAnalysisToLead(item, latestResult.aiRes, item.replyLanguage);
                enrichedList.push(updated);
                upsertLeadToCloud(updated);
                return updated;
              }
              return item;
            })
          );
        }
      }
    });

    setBatchProgress(null);
    if (showToast) {
      showToast(`Completed AI analysis for ${list.length} enquiries & synced to cloud.`);
    }
  };

  // Ingest a single new lead
  const ingestLead = (newLead, { sendImmediately = false, replyText = '' } = {}) => {
    const normPhone = normalizeBDPhone(newLead.phone);
    const prepared = {
      ...newLead,
      id: newLead.id || `lead_${Date.now()}`,
      phone: normPhone,
      receivedAt: newLead.receivedAt || nowFormatted(),
      owner: newLead.owner || 'Unassigned',
      replyLanguage: newLead.replyLanguage || 'Auto',
      editedFields: newLead.editedFields || [],
      messages: [
        {
          id: `msg_${Date.now()}`,
          receivedAt: newLead.receivedAt || nowFormatted(),
          channel: newLead.channel || 'WhatsApp',
          text: newLead.message
        }
      ],
      repeatCount: 1
    };

    let targetLeadToCloud = prepared;
    let mergedTarget = null;
    const existing = findDuplicateByPhone(leads, normPhone);

    if (existing) {
      mergedTarget = mergeIncomingLeadIntoExisting(existing, prepared);
      targetLeadToCloud = mergedTarget;
    }

    setLeads((prev) => {
      const liveExisting = findDuplicateByPhone(prev, normPhone);
      if (liveExisting) {
        const merged = mergeIncomingLeadIntoExisting(liveExisting, prepared);
        return prev.map((item) => (item.id === liveExisting.id ? merged : item));
      }
      return [prepared, ...prev];
    });

    if (sendImmediately) {
      const leadToSend = {
        ...targetLeadToCloud,
        status: targetLeadToCloud.status === 'New' && targetLeadToCloud.leadType === 'Sales' ? 'Contacted' : targetLeadToCloud.status,
        lastContactedAt: nowFormatted()
      };
      setLeads((prev) =>
        prev.map((item) => (item.id === leadToSend.id ? leadToSend : item))
      );
      upsertLeadToCloud(leadToSend);
      dispatchLeadReply(leadToSend, replyText || leadToSend.suggestedReply, (_, __, appName) => {
        if (showToast) {
          showToast(
            mergedTarget
              ? `Merged into ${mergedTarget.senderName} & opened ${appName}`
              : `Saved ${prepared.senderName} & opened ${appName}`
          );
        }
      });
    } else {
      upsertLeadToCloud(targetLeadToCloud);
      if (showToast) {
        showToast(
          mergedTarget
            ? `Duplicate phone detected (${normPhone}) — merged into ${mergedTarget.senderName}!`
            : `Saved "${prepared.senderName}" to CRM & synced to Supabase.`
        );
      }
    }
  };

  // Bulk import leads
  const bulkImportLeads = (importedList = []) => {
    if (importedList.length === 0) return;
    let mergedCount = 0;
    let addedCount = 0;
    const finalToSync = [];

    setLeads((prev) => {
      const updated = [...prev];
      for (const rawItem of importedList) {
        const normPhone = normalizeBDPhone(rawItem.phone);
        const prepared = {
          ...rawItem,
          phone: normPhone,
          owner: rawItem.owner || 'Unassigned',
          replyLanguage: rawItem.replyLanguage || 'Auto',
          editedFields: rawItem.editedFields || [],
          messages:
            Array.isArray(rawItem.messages) && rawItem.messages.length > 0
              ? rawItem.messages
              : [
                  {
                    id: `msg_${rawItem.id || Date.now()}`,
                    receivedAt: rawItem.receivedAt || nowFormatted(),
                    channel: rawItem.channel || 'WhatsApp',
                    text: rawItem.message
                  }
                ],
          repeatCount: 1
        };

        const dupIdx = normPhone
          ? updated.findIndex((l) => normalizeBDPhone(l.phone) === normPhone)
          : -1;

        if (dupIdx !== -1) {
          updated[dupIdx] = mergeIncomingLeadIntoExisting(updated[dupIdx], prepared);
          finalToSync.push(updated[dupIdx]);
          mergedCount += 1;
        } else {
          updated.unshift(prepared);
          finalToSync.push(prepared);
          addedCount += 1;
        }
      }
      return updated;
    });

    batchUpsertLeadsToCloud(finalToSync);

    if (showToast) {
      showToast(
        mergedCount > 0
          ? `Imported ${addedCount} leads, merged ${mergedCount} duplicates, and synced to Supabase.`
          : `Imported ${addedCount} enquiries and synced to Supabase.`
      );
    }
  };

  const updateLeadFields = (id, changes = {}, markEdited = true) => {
    let targetUpdated = null;
    const currentLead = leads.find((l) => l.id === id);
    if (currentLead) {
      const editedSet = new Set(currentLead.editedFields || []);
      if (markEdited) {
        Object.keys(changes).forEach((k) => editedSet.add(k));
      }
      targetUpdated = {
        ...currentLead,
        ...changes,
        editedFields: Array.from(editedSet)
      };
      upsertLeadToCloud(targetUpdated);
    }

    setLeads((prev) =>
      prev.map((item) => {
        if (item.id !== id) return item;
        const editedSet = new Set(item.editedFields || []);
        if (markEdited) {
          Object.keys(changes).forEach((k) => editedSet.add(k));
        }
        return {
          ...item,
          ...changes,
          editedFields: Array.from(editedSet)
        };
      })
    );
  };

  const updateLeadStatus = (id, newStatus) => {
    const nowStr = nowFormatted();
    const currentLead = leads.find((l) => l.id === id);
    if (currentLead) {
      const edited = new Set(currentLead.editedFields || []);
      edited.add('status');
      const targetUpdated = {
        ...currentLead,
        status: newStatus,
        lastContactedAt:
          newStatus !== 'New' && !currentLead.lastContactedAt
            ? nowStr
            : currentLead.lastContactedAt,
        editedFields: Array.from(edited)
      };
      upsertLeadToCloud(targetUpdated);
    }

    setLeads((prev) =>
      prev.map((item) => {
        if (item.id !== id) return item;
        const edited = new Set(item.editedFields || []);
        edited.add('status');
        return {
          ...item,
          status: newStatus,
          lastContactedAt:
            newStatus !== 'New' && !item.lastContactedAt
              ? nowStr
              : item.lastContactedAt,
          editedFields: Array.from(edited)
        };
      })
    );
    if (showToast) showToast(`Stage updated to "${newStatus}" & synced.`);
  };

  const sendReplyForLead = (lead, replyText) => {
    const nowStr = nowFormatted();
    dispatchLeadReply(lead, replyText, (targetLead, finalReply, appName) => {
      const nextStatus =
        targetLead.leadType === 'Sales' && targetLead.status === 'New'
          ? 'Contacted'
          : targetLead.status;

      const sendNote = {
        id: `n_send_${Date.now()}`,
        date: nowStr,
        text: `Sent reply via ${appName}: "${finalReply.slice(0, 80)}${finalReply.length > 80 ? '...' : ''}"`
      };

      let updatedLead = null;
      setLeads((prev) =>
        prev.map((item) => {
          if (item.id !== targetLead.id) return item;
          updatedLead = {
            ...item,
            status: nextStatus,
            lastContactedAt: nowStr,
            suggestedReply: finalReply,
            notes: [sendNote, ...(item.notes || [])]
          };
          return updatedLead;
        })
      );

      if (updatedLead) {
        upsertLeadToCloud(updatedLead);
      }

      if (showToast) {
        showToast(`Opened ${appName} & recorded contact for ${targetLead.senderName}.`);
      }
    });
  };

  const toggleResolveLead = (id) => {
    const target = leads.find((l) => l.id === id);
    if (!target) return;
    const nextResolved = !target.isResolved;
    const nowStr = nowFormatted();

    const note = {
      id: `n_res_${Date.now()}`,
      date: nowStr,
      text: nextResolved
        ? 'Marked case as RESOLVED.'
        : 'Reopened case for follow-up.'
    };

    let updatedLead = null;
    setLeads((prev) =>
      prev.map((item) => {
        if (item.id !== id) return item;
        updatedLead = {
          ...item,
          isResolved: nextResolved,
          resolvedAt: nextResolved ? nowStr : null,
          lastContactedAt: nowStr,
          notes: [note, ...(item.notes || [])]
        };
        return updatedLead;
      })
    );

    if (updatedLead) {
      upsertLeadToCloud(updatedLead);
    }

    if (showToast) {
      showToast(
        nextResolved
          ? `Resolved case for ${target.senderName}.`
          : `Reopened case for ${target.senderName}.`
      );
    }
  };

  const snoozeFollowUp = (id, hours = 24) => {
    const future = new Date(Date.now() + hours * 60 * 60 * 1000);
    const pad = (n) => String(n).padStart(2, '0');
    const formatted = `${future.getFullYear()}-${pad(future.getMonth() + 1)}-${pad(future.getDate())} ${pad(future.getHours())}:${pad(future.getMinutes())}`;
    updateLeadFields(id, { nextFollowUpAt: formatted }, true);
    if (showToast) showToast(`Follow-up scheduled for ${formatted}`);
  };

  const addNoteToLead = (leadId, noteText) => {
    const newNote = {
      id: `n_${Date.now()}`,
      date: nowFormatted(),
      text: noteText
    };
    let updatedLead = null;
    setLeads((prev) =>
      prev.map((item) => {
        if (item.id !== leadId) return item;
        updatedLead = { ...item, notes: [newNote, ...(item.notes || [])] };
        return updatedLead;
      })
    );
    if (updatedLead) {
      upsertLeadToCloud(updatedLead);
    }
    if (showToast) showToast('Follow-up note saved.');
  };

  const deleteLead = (id) => {
    setLeads((prev) => prev.filter((item) => item.id !== id));
    deleteLeadFromCloud(id);
    if (showToast) showToast('Enquiry deleted.');
  };

  const reloadVerbatimSamples = async ({ runLiveAI = false } = {}) => {
    const freshSamples = buildInitialSampleLeads(knowledgeBase);
    setLeads(freshSamples);
    saveStoredLeads(freshSamples);
    await batchUpsertLeadsToCloud(freshSamples);

    if (showToast) {
      showToast(
        `Reset to 20 verbatim BIAI enquiries (${freshSamples.length} unique leads after deduplication) & synced to Supabase.`
      );
    }
    if (runLiveAI) {
      await runBatchAIAnalysis(
        freshSamples,
        'Running live AI across BIAI sample enquiries'
      );
    }
  };

  const exportLeadsToCSV = () => {
    const headers = [
      'ID',
      'Lead Type',
      'Channel',
      'Received At',
      'Last Contacted At',
      'Next Follow-Up At',
      'Sender Name',
      'Phone',
      'Interest',
      'Stage',
      'Owner',
      'Language',
      'Repeat Count',
      'AI Summary',
      'Message',
      'Suggested Reply'
    ];

    const rows = leads.map((l) => [
      l.id,
      l.leadType || 'Sales',
      l.channel || '',
      l.receivedAt || '',
      l.lastContactedAt || '',
      l.nextFollowUpAt || '',
      l.senderName || '',
      l.phone || '',
      l.interest || '',
      l.status || '',
      l.owner || 'Unassigned',
      l.language || '',
      l.repeatCount || 1,
      l.aiSummary || '',
      l.message || '',
      l.suggestedReply || ''
    ]);

    const csvString = buildCSVWithBOM(headers, rows);
    const blob = new Blob([csvString], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `biai_crm_export_${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    if (showToast) showToast('Exported UTF-8 CSV (Bangla-safe for Excel).');
  };

  return {
    leads,
    setLeads,
    knowledgeBase,
    updateKnowledgeBase,
    handleResetKnowledgeBase,
    teamMembers,
    updateTeamMembers,
    syncStatus,
    generatingLeadId,
    batchProgress,
    generateReplyForLead,
    runBatchAIAnalysis,
    ingestLead,
    bulkImportLeads,
    updateLeadFields,
    updateLeadStatus,
    sendReplyForLead,
    toggleResolveLead,
    snoozeFollowUp,
    addNoteToLead,
    deleteLead,
    reloadVerbatimSamples,
    exportLeadsToCSV
  };
}
