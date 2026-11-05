import React, { useState } from 'react';
import {
  Database,
  BookOpen,
  Users,
  ShieldCheck,
  Download,
  Upload,
  RotateCcw,
  Check,
  AlertCircle,
  RefreshCw,
  FileJson,
  Plus,
  Trash2,
  Bot
} from 'lucide-react';
import { checkServerAIHealth } from '../services/aiService.js';
import { getKnowledgeBaseCompletion } from '../data/defaultKnowledgeBase.js';
import { getStorageMode } from '../lib/storage.js';

export function DatabaseSettingsView({
  leads = [],
  knowledgeBase,
  onUpdateKnowledgeBase,
  onResetKnowledgeBase,
  teamMembers = [],
  onUpdateTeamMembers,
  onReloadSamples,
  onExportCSV,
  onRestoreJSONDatabase
}) {
  const [draftKb, setDraftKb] = useState(() => knowledgeBase);
  const [newMemberName, setNewMemberName] = useState('');
  const [testingAI, setTestingAI] = useState(false);
  const [aiStatus, setAiStatus] = useState(null);

  const completion = getKnowledgeBaseCompletion(draftKb);
  const storageMode = getStorageMode();

  const handleKbFieldChange = (section, key, value) => {
    setDraftKb((prev) => ({
      ...prev,
      [section]: {
        ...(prev[section] || {}),
        [key]: value
      }
    }));
  };

  const handleSaveKb = (e) => {
    e.preventDefault();
    onUpdateKnowledgeBase(draftKb);
  };

  const handleResetKbClick = () => {
    onResetKnowledgeBase();
    setDraftKb(knowledgeBase);
  };

  const handleAddMember = (e) => {
    e.preventDefault();
    const trimmed = newMemberName.trim();
    if (!trimmed || teamMembers.includes(trimmed)) return;
    onUpdateTeamMembers([...teamMembers, trimmed]);
    setNewMemberName('');
  };

  const handleRemoveMember = (name) => {
    if (name === 'Unassigned') return;
    onUpdateTeamMembers(teamMembers.filter((m) => m !== name));
  };

  const handleTestAI = async () => {
    setTestingAI(true);
    setAiStatus(null);
    try {
      const res = await checkServerAIHealth();
      setAiStatus(res);
    } finally {
      setTestingAI(false);
    }
  };

  const handleExportJSON = () => {
    const payload = {
      schemaVersion: '6.0',
      exportedAt: new Date().toISOString(),
      totalRecords: leads.length,
      knowledgeBase: draftKb,
      teamMembers,
      records: leads
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], {
      type: 'application/json'
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `biai_crm_database_${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleJSONUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const parsed = JSON.parse(String(evt.target?.result || '{}'));
        const list = Array.isArray(parsed) ? parsed : parsed.records;
        if (Array.isArray(list) && list.length > 0) {
          onRestoreJSONDatabase(list);
          if (parsed.knowledgeBase) {
            setDraftKb(parsed.knowledgeBase);
            onUpdateKnowledgeBase(parsed.knowledgeBase);
          }
        } else {
          alert('Invalid JSON backup file.');
        }
      } catch {
        alert('Could not parse JSON file.');
      }
    };
    reader.readAsText(file);
  };

  return (
    <div className="space-y-6 pb-12">
      {/* 1. BIAI Official Knowledge Base Editor (Prices, Policies, Schedule) */}
      <form
        onSubmit={handleSaveKb}
        className="bg-white p-5 rounded-md border border-[#DCE1E7] shadow-xs space-y-4"
      >
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-[#EEF1F5]">
          <div className="flex items-start space-x-3">
            <div className="p-2 rounded bg-[#0067FF] text-white shrink-0">
              <BookOpen className="h-4 w-4" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-[#1E293B]">
                BIAI Official Knowledge Base &amp; Policy Grounding
              </h2>
              <p className="text-xs text-[#64748B]">
                Any field left as <code>TBC</code> tells the AI to say &ldquo;our team will confirm&rdquo; instead of inventing prices, locations, or refund promises.
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-2 shrink-0">
            <span className="px-2.5 py-1 rounded text-xs font-semibold bg-[#EBF2FF] text-[#0067FF] border border-[#BBD6FF]">
              {completion.filled} / {completion.total} facts confirmed
            </span>
            <button
              type="button"
              onClick={handleResetKbClick}
              className="px-2.5 py-1 rounded text-xs font-medium text-[#64748B] hover:text-[#1E293B] border border-[#CBD5E1] bg-white"
            >
              Reset to TBC
            </button>
            <button
              type="submit"
              className="px-3.5 py-1.5 rounded text-xs font-semibold text-white bg-[#0067FF] hover:bg-[#0055D4]"
            >
              Save Knowledge Base
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 text-xs">
          {/* Bootcamp Facts */}
          <div className="p-3.5 rounded bg-[#F8FAFC] border border-[#DCE1E7] space-y-2.5">
            <h3 className="font-bold text-[#1E293B] uppercase tracking-wider text-[11px]">
              1. 3-Day AI Bootcamp
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <div>
                <label className="text-[11px] text-[#64748B] block mb-0.5">
                  Bootcamp Fee
                </label>
                <input
                  type="text"
                  value={draftKb?.bootcamp?.fee || ''}
                  onChange={(e) =>
                    handleKbFieldChange('bootcamp', 'fee', e.target.value)
                  }
                  placeholder="TBC"
                  className="w-full py-1 px-2 rounded bg-white border border-[#CBD5E1] text-[#1E293B]"
                />
              </div>
              <div>
                <label className="text-[11px] text-[#64748B] block mb-0.5">
                  Next Cohort Start Date
                </label>
                <input
                  type="text"
                  value={draftKb?.bootcamp?.nextCohortDate || ''}
                  onChange={(e) =>
                    handleKbFieldChange('bootcamp', 'nextCohortDate', e.target.value)
                  }
                  placeholder="TBC"
                  className="w-full py-1 px-2 rounded bg-white border border-[#CBD5E1] text-[#1E293B]"
                />
              </div>
              <div>
                <label className="text-[11px] text-[#64748B] block mb-0.5">
                  Class Format (Live / Recorded)
                </label>
                <input
                  type="text"
                  value={draftKb?.bootcamp?.recordingPolicy || ''}
                  onChange={(e) =>
                    handleKbFieldChange('bootcamp', 'recordingPolicy', e.target.value)
                  }
                  placeholder="TBC"
                  className="w-full py-1 px-2 rounded bg-white border border-[#CBD5E1] text-[#1E293B]"
                />
              </div>
              <div>
                <label className="text-[11px] text-[#64748B] block mb-0.5">
                  Offline Class Venue
                </label>
                <input
                  type="text"
                  value={draftKb?.bootcamp?.location || ''}
                  onChange={(e) =>
                    handleKbFieldChange('bootcamp', 'location', e.target.value)
                  }
                  placeholder="TBC"
                  className="w-full py-1 px-2 rounded bg-white border border-[#CBD5E1] text-[#1E293B]"
                />
              </div>
              <div>
                <label className="text-[11px] text-[#64748B] block mb-0.5">
                  Certificate Policy
                </label>
                <input
                  type="text"
                  value={draftKb?.bootcamp?.certificatePolicy || ''}
                  onChange={(e) =>
                    handleKbFieldChange(
                      'bootcamp',
                      'certificatePolicy',
                      e.target.value
                    )
                  }
                  placeholder="TBC"
                  className="w-full py-1 px-2 rounded bg-white border border-[#CBD5E1] text-[#1E293B]"
                />
              </div>
              <div>
                <label className="text-[11px] text-[#64748B] block mb-0.5">
                  Free Masterclass Eligibility
                </label>
                <input
                  type="text"
                  value={draftKb?.bootcamp?.freeMasterclassPolicy || ''}
                  onChange={(e) =>
                    handleKbFieldChange(
                      'bootcamp',
                      'freeMasterclassPolicy',
                      e.target.value
                    )
                  }
                  placeholder="TBC"
                  className="w-full py-1 px-2 rounded bg-white border border-[#CBD5E1] text-[#1E293B]"
                />
              </div>
            </div>
          </div>

          {/* Fellowship Facts */}
          <div className="p-3.5 rounded bg-[#F8FAFC] border border-[#DCE1E7] space-y-2.5">
            <h3 className="font-bold text-[#1E293B] uppercase tracking-wider text-[11px]">
              2. AI Fellowship Program
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <div>
                <label className="text-[11px] text-[#64748B] block mb-0.5">
                  Fellowship Fee
                </label>
                <input
                  type="text"
                  value={draftKb?.fellowship?.fee || ''}
                  onChange={(e) =>
                    handleKbFieldChange('fellowship', 'fee', e.target.value)
                  }
                  placeholder="TBC"
                  className="w-full py-1 px-2 rounded bg-white border border-[#CBD5E1] text-[#1E293B]"
                />
              </div>
              <div>
                <label className="text-[11px] text-[#64748B] block mb-0.5">
                  Next Start Date
                </label>
                <input
                  type="text"
                  value={draftKb?.fellowship?.nextCohortDate || ''}
                  onChange={(e) =>
                    handleKbFieldChange(
                      'fellowship',
                      'nextCohortDate',
                      e.target.value
                    )
                  }
                  placeholder="TBC"
                  className="w-full py-1 px-2 rounded bg-white border border-[#CBD5E1] text-[#1E293B]"
                />
              </div>
              <div>
                <label className="text-[11px] text-[#64748B] block mb-0.5">
                  Instalment / EMI Policy
                </label>
                <input
                  type="text"
                  value={draftKb?.fellowship?.instalmentPolicy || ''}
                  onChange={(e) =>
                    handleKbFieldChange(
                      'fellowship',
                      'instalmentPolicy',
                      e.target.value
                    )
                  }
                  placeholder="TBC"
                  className="w-full py-1 px-2 rounded bg-white border border-[#CBD5E1] text-[#1E293B]"
                />
              </div>
              <div>
                <label className="text-[11px] text-[#64748B] block mb-0.5">
                  Student Discount Policy
                </label>
                <input
                  type="text"
                  value={draftKb?.fellowship?.studentDiscountPolicy || ''}
                  onChange={(e) =>
                    handleKbFieldChange(
                      'fellowship',
                      'studentDiscountPolicy',
                      e.target.value
                    )
                  }
                  placeholder="TBC"
                  className="w-full py-1 px-2 rounded bg-white border border-[#CBD5E1] text-[#1E293B]"
                />
              </div>
              <div>
                <label className="text-[11px] text-[#64748B] block mb-0.5">
                  Non-Technical Suitability
                </label>
                <input
                  type="text"
                  value={draftKb?.fellowship?.suitability || ''}
                  onChange={(e) =>
                    handleKbFieldChange('fellowship', 'suitability', e.target.value)
                  }
                  placeholder="TBC"
                  className="w-full py-1 px-2 rounded bg-white border border-[#CBD5E1] text-[#1E293B]"
                />
              </div>
              <div>
                <label className="text-[11px] text-[#64748B] block mb-0.5">
                  Career / Job Placement Policy
                </label>
                <input
                  type="text"
                  value={draftKb?.fellowship?.careerSupportPolicy || ''}
                  onChange={(e) =>
                    handleKbFieldChange(
                      'fellowship',
                      'careerSupportPolicy',
                      e.target.value
                    )
                  }
                  placeholder="TBC"
                  className="w-full py-1 px-2 rounded bg-white border border-[#CBD5E1] text-[#1E293B]"
                />
              </div>
            </div>
          </div>

          {/* Corporate & General Policies */}
          <div className="lg:col-span-2 p-3.5 rounded bg-[#F8FAFC] border border-[#DCE1E7] grid grid-cols-1 sm:grid-cols-4 gap-2.5">
            <div>
              <label className="text-[11px] font-semibold text-[#64748B] block mb-0.5">
                Corporate Pricing Model
              </label>
              <input
                type="text"
                value={draftKb?.corporate?.pricingModel || ''}
                onChange={(e) =>
                  handleKbFieldChange('corporate', 'pricingModel', e.target.value)
                }
                placeholder="TBC"
                className="w-full py-1 px-2 rounded bg-white border border-[#CBD5E1] text-[#1E293B]"
              />
            </div>
            <div>
              <label className="text-[11px] font-semibold text-[#64748B] block mb-0.5">
                Corporate Group Discount
              </label>
              <input
                type="text"
                value={draftKb?.corporate?.groupDiscountPolicy || ''}
                onChange={(e) =>
                  handleKbFieldChange(
                    'corporate',
                    'groupDiscountPolicy',
                    e.target.value
                  )
                }
                placeholder="TBC"
                className="w-full py-1 px-2 rounded bg-white border border-[#CBD5E1] text-[#1E293B]"
              />
            </div>
            <div>
              <label className="text-[11px] font-semibold text-[#64748B] block mb-0.5">
                Refund Policy
              </label>
              <input
                type="text"
                value={draftKb?.policies?.refundPolicy || ''}
                onChange={(e) =>
                  handleKbFieldChange('policies', 'refundPolicy', e.target.value)
                }
                placeholder="TBC"
                className="w-full py-1 px-2 rounded bg-white border border-[#CBD5E1] text-[#1E293B]"
              />
            </div>
            <div>
              <label className="text-[11px] font-semibold text-[#64748B] block mb-0.5">
                Careers / Internship Contact
              </label>
              <input
                type="text"
                value={draftKb?.policies?.careersContact || ''}
                onChange={(e) =>
                  handleKbFieldChange('policies', 'careersContact', e.target.value)
                }
                placeholder="TBC"
                className="w-full py-1 px-2 rounded bg-white border border-[#CBD5E1] text-[#1E293B]"
              />
            </div>
          </div>
        </div>
      </form>

      {/* 2. Team Roster & Server AI Proxy Status */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Team Members Management */}
        <div className="bg-white p-5 rounded-md border border-[#DCE1E7] shadow-xs space-y-4">
          <div className="flex items-center space-x-3 pb-3 border-b border-[#EEF1F5]">
            <div className="p-2 rounded bg-[#17223B] text-white">
              <Users className="h-4 w-4" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-[#1E293B]">
                BIAI Admissions &amp; Sales Team Roster
              </h2>
              <p className="text-xs text-[#64748B]">
                Assign enquiries to specific team members to track follow-up accountability
              </p>
            </div>
          </div>

          <form onSubmit={handleAddMember} className="flex gap-2">
            <input
              type="text"
              value={newMemberName}
              onChange={(e) => setNewMemberName(e.target.value)}
              placeholder="Add team member (e.g. Nusrat - Admissions)..."
              className="flex-1 py-1.5 px-3 text-xs bg-white border border-[#CBD5E1] rounded text-[#1E293B]"
            />
            <button
              type="submit"
              className="px-3 py-1.5 rounded text-xs font-semibold text-white bg-[#0067FF] hover:bg-[#0055D4] inline-flex items-center space-x-1"
            >
              <Plus className="h-3.5 w-3.5" />
              <span>Add</span>
            </button>
          </form>

          <div className="flex flex-wrap gap-2">
            {teamMembers.map((member) => (
              <span
                key={member}
                className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded text-xs font-medium bg-[#F8FAFC] text-[#1E293B] border border-[#DCE1E7]"
              >
                <span>{member}</span>
                {member !== 'Unassigned' && (
                  <button
                    type="button"
                    onClick={() => handleRemoveMember(member)}
                    className="text-[#94A3B8] hover:text-[#DC2626]"
                    title="Remove team member"
                  >
                    <Trash2 className="h-3 w-3" />
                  </button>
                )}
              </span>
            ))}
          </div>
        </div>

        {/* Server-Side AI Proxy Health Check (Zero Client-Exposed Keys) */}
        <div className="bg-white p-5 rounded-md border border-[#DCE1E7] shadow-xs space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-[#EEF1F5]">
            <div className="flex items-center space-x-3">
              <div className="p-2 rounded bg-[#059669] text-white">
                <ShieldCheck className="h-4 w-4" />
              </div>
              <div>
                <h2 className="text-sm font-bold text-[#1E293B]">
                  Server-Side AI Proxy Status (<code>/api/ai</code>)
                </h2>
                <p className="text-xs text-[#64748B]">
                  API key is stored strictly in server environment (<code>OPENROUTER_API_KEY</code>) — never exposed to browser JS
                </p>
              </div>
            </div>
          </div>

          <div className="flex items-center justify-between gap-3 p-3 rounded bg-[#F8FAFC] border border-[#DCE1E7] text-xs">
            <div>
              <div className="font-semibold text-[#1E293B]">
                Endpoint: <code>POST /api/ai</code>
              </div>
              <div className="text-[#64748B] mt-0.5">
                Vite server middleware in development • Vercel Serverless Function (<code>api/ai.js</code>) in production
              </div>
            </div>

            <button
              type="button"
              onClick={handleTestAI}
              disabled={testingAI}
              className="px-3.5 py-2 rounded text-xs font-semibold text-white bg-[#0067FF] hover:bg-[#0055D4] disabled:opacity-50 inline-flex items-center space-x-1.5 shrink-0"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${testingAI ? 'animate-spin' : ''}`} />
              <span>{testingAI ? 'Checking...' : 'Test AI Connection'}</span>
            </button>
          </div>

          {aiStatus && (
            <div
              className={`p-3 rounded border text-xs font-medium flex items-center space-x-2 ${
                aiStatus.ok
                  ? 'bg-[#ECFDF5] border-[#A7F3D0] text-[#047857]'
                  : 'bg-[#FEF2F2] border-[#FECACA] text-[#B91C1C]'
              }`}
            >
              {aiStatus.ok ? (
                <Check className="h-4 w-4 shrink-0" />
              ) : (
                <AlertCircle className="h-4 w-4 shrink-0" />
              )}
              <span>{aiStatus.message}</span>
            </div>
          )}
        </div>
      </div>

      {/* 3. Sample Dataset Loader, JSON Backup & Storage Adapter Info */}
      <div className="bg-white p-5 rounded-md border border-[#DCE1E7] shadow-xs space-y-4">
        <div className="flex items-start justify-between gap-4 pb-3 border-b border-[#EEF1F5]">
          <div className="flex items-center space-x-3">
            <div className="p-2 rounded bg-[#0067FF] text-white">
              <Database className="h-4 w-4" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-[#1E293B]">
                Sample Data &amp; Storage Management ({leads.length} Unique Records)
              </h2>
              <p className="text-xs text-[#64748B]">
                Storage mode: <strong>{storageMode === 'supabase-ready' ? 'Supabase Configured' : 'Browser LocalStorage (Supabase adapter ready)'}</strong>
              </p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
          <button
            type="button"
            onClick={() => onReloadSamples({ runLiveAI: true })}
            className="p-3 rounded bg-[#EBF2FF] hover:bg-[#DBEAFE] border border-[#BBD6FF] flex items-center space-x-2.5 text-left transition-colors"
          >
            <Bot className="h-4 w-4 text-[#0067FF] shrink-0" />
            <div>
              <div className="text-xs font-bold text-[#0067FF]">
                Reload 20 Samples + Run AI
              </div>
              <div className="text-[10px] text-[#1E40AF]">
                Parse raw CSV &amp; run AI queue
              </div>
            </div>
          </button>

          <button
            type="button"
            onClick={() => onReloadSamples({ runLiveAI: false })}
            className="p-3 rounded bg-[#F8FAFC] hover:bg-[#F1F5F9] border border-[#DCE1E7] flex items-center space-x-2.5 text-left transition-colors"
          >
            <RotateCcw className="h-4 w-4 text-[#475569] shrink-0" />
            <div>
              <div className="text-xs font-semibold text-[#1E293B]">
                Reset to Raw CSV Baseline
              </div>
              <div className="text-[10px] text-[#64748B]">
                20 rows (Rafi merged → 19 leads)
              </div>
            </div>
          </button>

          <button
            type="button"
            onClick={onExportCSV}
            className="p-3 rounded bg-[#F8FAFC] hover:bg-[#F1F5F9] border border-[#DCE1E7] flex items-center space-x-2.5 text-left transition-colors"
          >
            <Download className="h-4 w-4 text-[#0284C7] shrink-0" />
            <div>
              <div className="text-xs font-semibold text-[#1E293B]">
                Export CSV (UTF-8 BOM)
              </div>
              <div className="text-[10px] text-[#64748B]">Bangla-safe in Excel</div>
            </div>
          </button>

          <button
            type="button"
            onClick={handleExportJSON}
            className="p-3 rounded bg-[#F8FAFC] hover:bg-[#F1F5F9] border border-[#DCE1E7] flex items-center space-x-2.5 text-left transition-colors"
          >
            <FileJson className="h-4 w-4 text-[#0067FF] shrink-0" />
            <div>
              <div className="text-xs font-semibold text-[#1E293B]">
                Backup Snapshot (.JSON)
              </div>
              <div className="text-[10px] text-[#64748B]">Leads + Knowledge Base</div>
            </div>
          </button>

          <label className="p-3 rounded bg-[#F8FAFC] hover:bg-[#F1F5F9] border border-[#DCE1E7] flex items-center space-x-2.5 text-left transition-colors cursor-pointer">
            <Upload className="h-4 w-4 text-[#059669] shrink-0" />
            <div>
              <div className="text-xs font-semibold text-[#1E293B]">
                Restore Snapshot (.JSON)
              </div>
              <div className="text-[10px] text-[#64748B]">Upload backup file</div>
            </div>
            <input
              type="file"
              accept=".json,application/json"
              onChange={handleJSONUpload}
              className="hidden"
            />
          </label>
        </div>
      </div>
    </div>
  );
}
