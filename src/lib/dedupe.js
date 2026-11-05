// Duplicate Lead Detection & Conversation History Merger for BIAI CRM
// Merges incoming enquiries that share the same normalized Bangladeshi phone number
// (e.g. Rafi Ahmed #1 and #12 on 01711000001) into a single lead with full message history.

import { normalizeBDPhone } from './phone.js';

export function findDuplicateByPhone(existingLeads = [], phone = '') {
  const norm = normalizeBDPhone(phone);
  if (!norm) return null;
  return (
    existingLeads.find((l) => normalizeBDPhone(l.phone) === norm) || null
  );
}

export function findPossibleNameMatch(existingLeads = [], senderName = '', phone = '') {
  if (normalizeBDPhone(phone)) return null;
  const clean = String(senderName || '')
    .toLowerCase()
    .replace(/\(.*\)/, '')
    .trim();
  if (!clean || clean.length < 3 || clean.startsWith('lead ') || clean === 'new enquiry') {
    return null;
  }
  return (
    existingLeads.find(
      (l) =>
        String(l.senderName || '')
          .toLowerCase()
          .replace(/\(.*\)/, '')
          .trim() === clean
    ) || null
  );
}

export function mergeIncomingLeadIntoExisting(existingLead, incomingLead) {
  const existingMessages = Array.isArray(existingLead.messages) && existingLead.messages.length > 0
    ? existingLead.messages
    : [
        {
          id: `msg_${existingLead.id}_initial`,
          receivedAt: existingLead.receivedAt,
          channel: existingLead.channel,
          text: existingLead.message
        }
      ];

  const incomingMsgObj = {
    id: `msg_${incomingLead.id || Date.now()}`,
    receivedAt: incomingLead.receivedAt || new Date().toISOString().replace('T', ' ').slice(0, 16),
    channel: incomingLead.channel || existingLead.channel,
    text: incomingLead.message
  };

  // Avoid adding exact duplicate message text at the exact same timestamp
  const alreadyPresent = existingMessages.some(
    (m) => m.text === incomingMsgObj.text && m.receivedAt === incomingMsgObj.receivedAt
  );

  const mergedMessages = alreadyPresent
    ? existingMessages
    : [...existingMessages, incomingMsgObj];

  const combinedText = mergedMessages.map((m) => m.text).join(' | Follow-up: ');

  const mergedFlags = Array.from(
    new Set([
      ...(existingLead.flags || []),
      ...(incomingLead.flags || []),
      'repeat-contact'
    ])
  );

  const mergeNote = {
    id: `n_merge_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
    date: incomingMsgObj.receivedAt,
    text: `Merged repeat enquiry (${mergedMessages.length} messages total from ${existingLead.phone}): "${incomingLead.message}"`
  };

  const edited = new Set(existingLead.editedFields || []);

  return {
    ...existingLead,
    // Keep latest message visible while preserving full history in messages[]
    message: incomingLead.message || existingLead.message,
    combinedContext: combinedText,
    receivedAt: incomingLead.receivedAt || existingLead.receivedAt,
    messages: mergedMessages,
    repeatCount: mergedMessages.length,
    // Respect human-edited fields; otherwise upgrade urgency or fill blanks
    interest:
      edited.has('interest') || existingLead.interest !== 'Unknown'
        ? existingLead.interest
        : incomingLead.interest || existingLead.interest,
    urgency:
      edited.has('urgency')
        ? existingLead.urgency
        : incomingLead.urgency === 'high' || existingLead.urgency === 'high'
          ? 'high'
          : 'normal',
    suggestedReply: incomingLead.suggestedReply || existingLead.suggestedReply,
    aiSummary: incomingLead.aiSummary || existingLead.aiSummary,
    nextAction: incomingLead.nextAction || existingLead.nextAction,
    missingFacts: incomingLead.missingFacts || existingLead.missingFacts || [],
    flags: mergedFlags,
    notes: alreadyPresent
      ? existingLead.notes || []
      : [mergeNote, ...(existingLead.notes || [])]
  };
}

export function deduplicateLeadList(leads = []) {
  const result = [];
  const phoneIndexMap = new Map();

  for (const item of leads) {
    const normPhone = normalizeBDPhone(item.phone);
    const prepared = {
      ...item,
      phone: normPhone || item.phone || '',
      messages:
        Array.isArray(item.messages) && item.messages.length > 0
          ? item.messages
          : [
              {
                id: `msg_${item.id}`,
                receivedAt: item.receivedAt,
                channel: item.channel,
                text: item.message
              }
            ],
      repeatCount:
        Array.isArray(item.messages) && item.messages.length > 0
          ? item.messages.length
          : 1
    };

    if (normPhone && phoneIndexMap.has(normPhone)) {
      const idx = phoneIndexMap.get(normPhone);
      result[idx] = mergeIncomingLeadIntoExisting(result[idx], prepared);
    } else {
      if (normPhone) {
        phoneIndexMap.set(normPhone, result.length);
      }
      result.push(prepared);
    }
  }

  return result;
}

