import React, { useState } from 'react';
import {
  X,
  Check,
  Copy,
  Trash2,
  Send,
  Bot,
  RefreshCw,
  PhoneCall,
  CheckCircle2,
  AlertTriangle,
  Lock
} from 'lucide-react';
import { getPrimarySendAction } from '../utils/sendDispatcher';
import { getFollowUpStatus } from '../lib/followUp.js';

const STAGES = ['New', 'Contacted', 'Interested', 'Paid', 'Lost'];
const CHANNELS = [
  'WhatsApp',
  'Facebook Messenger',
  'Facebook comment',
  'Website form',
  'Phone call note'
];
const REPLY_LANGUAGES = ['Auto', 'Banglish', 'Bangla', 'English'];

export function LeadDetailModal({
  lead,
  nowMs,
  teamMembers = [],
  onClose,
  onUpdateStatus,
  onUpdateLeadFields,
  onToggleResolveLead,
  onAddNote,
  onDeleteLead,
  onGenerateReply,
  onSendReply,
  onOpenKnowledgeBase,
  generatingLeadId
}) {
  // All hooks declared unconditionally BEFORE any early return
  const [copiedReply, setCopiedReply] = useState(false);
  const [copiedMessage, setCopiedMessage] = useState(false);
  const [newNoteText, setNewNoteText] = useState('');
  const [editedReply, setEditedReply] = useState(null);
  const [selectedReplyLang, setSelectedReplyLang] = useState(
    lead?.replyLanguage || 'Auto'
  );

  if (!lead) return null;

  const customReply =
    editedReply !== null ? editedReply : lead.suggestedReply || '';
  const setCustomReply = (val) => setEditedReply(val);

  const isGenerating = generatingLeadId === lead.id;
  const sendAction = getPrimarySendAction(lead, customReply);
  const followStatus = getFollowUpStatus(lead, nowMs);
  const editedSet = new Set(lead.editedFields || []);

  const handleCopyReply = () => {
    if (!customReply) return;
    navigator.clipboard.writeText(customReply);
    setCopiedReply(true);
    setTimeout(() => setCopiedReply(false), 2000);
  };

  const handleCopyMessage = () => {
    navigator.clipboard.writeText(lead.message);
    setCopiedMessage(true);
    setTimeout(() => setCopiedMessage(false), 2000);
  };

  const handleAddNoteSubmit = (e) => {
    e.preventDefault();
    if (!newNoteText.trim()) return;
    onAddNote(lead.id, newNoteText.trim());
    setNewNoteText('');
  };

  const messageList =
    Array.isArray(lead.messages) && lead.messages.length > 0
      ? lead.messages
      : [{ id: 'm1', receivedAt: lead.receivedAt, channel: lead.channel, text: lead.message }];

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 flex items-end sm:items-center justify-center p-0 sm:p-4"
    >
      <div
        className="relative bg-white border-t sm:border border-[#DCE1E7] rounded-t-xl sm:rounded-md w-full max-w-3xl shadow-xl overflow-hidden flex flex-col max-h-[92dvh] sm:max-h-[92vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-[#DCE1E7] flex items-start justify-between bg-[#F8FAFC]">
          <div className="space-y-1">
            <div className="flex flex-wrap items-center gap-2">
              <span className="px-2 py-0.5 text-xs font-semibold rounded bg-[#E0F2FE] text-[#0369A1] border border-[#BAE6FD]">
                {lead.channel}
              </span>
              <span className="text-xs text-[#64748B]">
                Received: {lead.receivedAt}
              </span>
              {lead.lastContactedAt && (
                <span className="text-xs text-[#059669] font-medium">
                  • Last Contact: {lead.lastContactedAt}
                </span>
              )}
              {followStatus.isOverdue && (
                <span className="px-2 py-0.5 text-[11px] font-bold rounded bg-[#FEF2F2] text-[#DC2626] border border-[#FECACA]">
                  ⏰ {followStatus.reason}
                </span>
              )}
            </div>

            <h2 className="text-lg sm:text-xl font-bold text-[#1E293B]">
              {lead.senderName}
            </h2>

            {lead.aiSummary && (
              <p className="text-xs text-[#334155] font-medium">
                AI Summary: {lead.aiSummary}
              </p>
            )}
          </div>

          <button
            onClick={onClose}
            className="p-1.5 text-[#64748B] hover:text-[#1E293B] rounded hover:bg-[#E2E8F0] transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-4 sm:p-5 overflow-y-auto space-y-5 flex-1 text-[#1E293B]">
          {/* Support & Escalation Resolution Banner */}
          {lead.leadType === 'Support' && (
            <div
              className={`p-3.5 rounded-md border flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                lead.isResolved
                  ? 'bg-[#ECFDF5] border-[#A7F3D0] text-[#065F46]'
                  : 'bg-[#FEF2F2] border-[#FECACA] text-[#991B1B]'
              }`}
            >
              <div className="flex items-start space-x-2.5">
                {lead.isResolved ? (
                  <CheckCircle2 className="h-5 w-5 text-[#059669] shrink-0 mt-0.5" />
                ) : (
                  <AlertTriangle className="h-5 w-5 text-[#DC2626] shrink-0 mt-0.5" />
                )}
                <div>
                  <div className="text-xs font-bold uppercase tracking-wider">
                    {lead.isResolved
                      ? 'Support Case Resolved'
                      : 'Open Support / Refund Escalation'}
                  </div>
                  <p className="text-[11px] opacity-90 mt-0.5">
                    {lead.isResolved
                      ? `Resolved${lead.resolvedAt ? ` on ${lead.resolvedAt}` : ''}.`
                      : 'Once handled, click Mark Resolved to clear from open support alerts.'}
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => onToggleResolveLead && onToggleResolveLead(lead.id)}
                className={`px-3.5 py-2 rounded text-xs font-semibold shrink-0 transition-colors shadow-2xs flex items-center justify-center space-x-1.5 ${
                  lead.isResolved
                    ? 'bg-white text-[#475569] border border-[#CBD5E1]'
                    : 'bg-[#059669] hover:bg-[#047857] text-white'
                }`}
              >
                <Check className="h-3.5 w-3.5" />
                <span>{lead.isResolved ? 'Reopen Case' : 'Mark Resolved'}</span>
              </button>
            </div>
          )}

          {/* Editable Core Fields Grid (Human edits lock fields from being overwritten by AI reruns) */}
          <div className="bg-[#F8FAFC] p-3.5 rounded border border-[#DCE1E7] space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-[#64748B] uppercase tracking-wider">
                Lead Details (Editable — Human edits are preserved on AI re-runs)
              </span>
              {editedSet.size > 0 && (
                <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-[#059669] bg-[#ECFDF5] px-2 py-0.5 rounded border border-[#A7F3D0]">
                  <Lock className="h-2.5 w-2.5" />
                  {editedSet.size} field{editedSet.size > 1 ? 's' : ''} human-verified
                </span>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 text-xs">
              <div>
                <label className="text-[11px] font-semibold text-[#64748B] block mb-1">
                  1. Name
                </label>
                <input
                  type="text"
                  value={lead.senderName || ''}
                  onChange={(e) =>
                    onUpdateLeadFields &&
                    onUpdateLeadFields(lead.id, { senderName: e.target.value })
                  }
                  className="w-full py-1.5 px-2 rounded bg-white border border-[#CBD5E1] font-semibold text-[#1E293B]"
                />
              </div>

              <div>
                <label className="text-[11px] font-semibold text-[#64748B] block mb-1">
                  2. Phone
                </label>
                <input
                  type="text"
                  value={lead.phone || ''}
                  placeholder="No phone yet"
                  onChange={(e) =>
                    onUpdateLeadFields &&
                    onUpdateLeadFields(lead.id, { phone: e.target.value })
                  }
                  className="w-full py-1.5 px-2 rounded bg-white border border-[#CBD5E1] font-mono text-[#1E293B]"
                />
              </div>

              <div>
                <label className="text-[11px] font-semibold text-[#64748B] block mb-1">
                  3. Where From (Channel)
                </label>
                <select
                  value={lead.channel || 'WhatsApp'}
                  onChange={(e) =>
                    onUpdateLeadFields &&
                    onUpdateLeadFields(lead.id, { channel: e.target.value })
                  }
                  className="w-full py-1.5 px-2 rounded bg-white border border-[#CBD5E1] text-[#1E293B]"
                >
                  {CHANNELS.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-[11px] font-semibold text-[#64748B] block mb-1">
                  4. What They Want (Interest)
                </label>
                <select
                  value={lead.interest || 'Bootcamp'}
                  onChange={(e) =>
                    onUpdateLeadFields &&
                    onUpdateLeadFields(lead.id, { interest: e.target.value })
                  }
                  className="w-full py-1.5 px-2 rounded bg-white border border-[#CBD5E1] font-semibold text-[#1E293B]"
                >
                  <option value="Bootcamp">Bootcamp</option>
                  <option value="Fellowship">Fellowship</option>
                  <option value="Corporate Training">Corporate Training</option>
                  <option value="Unknown">Unknown / Unspecified</option>
                </select>
              </div>

              <div>
                <label className="text-[11px] font-semibold text-[#64748B] block mb-1">
                  Record Classification
                </label>
                <select
                  value={lead.leadType || 'Sales'}
                  onChange={(e) =>
                    onUpdateLeadFields &&
                    onUpdateLeadFields(lead.id, { leadType: e.target.value })
                  }
                  className="w-full py-1.5 px-2 rounded bg-white border border-[#CBD5E1] font-semibold text-[#1E293B]"
                >
                  <option value="Sales">Sales Pipeline Lead</option>
                  <option value="Support">Support / Refund Case</option>
                  <option value="Job Seeker">Job Seeker / Intern</option>
                  <option value="Spam">Spam / Bot</option>
                </select>
              </div>

              <div>
                <label className="text-[11px] font-semibold text-[#64748B] block mb-1">
                  Assigned Team Owner
                </label>
                <select
                  value={lead.owner || 'Unassigned'}
                  onChange={(e) =>
                    onUpdateLeadFields &&
                    onUpdateLeadFields(lead.id, { owner: e.target.value })
                  }
                  className="w-full py-1.5 px-2 rounded bg-white border border-[#CBD5E1] text-[#1E293B]"
                >
                  {teamMembers.map((m) => (
                    <option key={m} value={m}>
                      {m}
                    </option>
                  ))}
                </select>
              </div>

              <div className="sm:col-span-2">
                <label className="text-[11px] font-semibold text-[#64748B] block mb-1">
                  Scheduled Next Follow-up (YYYY-MM-DD HH:mm)
                </label>
                <input
                  type="text"
                  value={lead.nextFollowUpAt || ''}
                  placeholder="e.g. 2026-10-27 17:00"
                  onChange={(e) =>
                    onUpdateLeadFields &&
                    onUpdateLeadFields(lead.id, { nextFollowUpAt: e.target.value })
                  }
                  className="w-full py-1.5 px-2 rounded bg-white border border-[#CBD5E1] font-mono text-[#1E293B]"
                />
              </div>

              <div>
                <label className="text-[11px] font-semibold text-[#64748B] block mb-1">
                  Corporate Team Size
                </label>
                <input
                  type="number"
                  value={lead.teamSize || ''}
                  placeholder="N/A"
                  onChange={(e) =>
                    onUpdateLeadFields &&
                    onUpdateLeadFields(lead.id, {
                      teamSize: e.target.value ? Number(e.target.value) : null
                    })
                  }
                  className="w-full py-1.5 px-2 rounded bg-white border border-[#CBD5E1] font-mono text-[#1E293B]"
                />
              </div>
            </div>
          </div>

          {/* Pipeline Stage Selector Bar */}
          <div>
            <label className="text-[11px] font-bold text-[#64748B] uppercase tracking-wider block mb-1.5">
              5. Pipeline Stage (New → Contacted → Interested → Paid / Lost)
            </label>
            <div className="grid grid-cols-5 gap-1.5 p-1 bg-[#F1F5F9] rounded border border-[#DCE1E7]">
              {STAGES.map((stg) => {
                const isActive = lead.status === stg;
                return (
                  <button
                    key={stg}
                    onClick={() => onUpdateStatus(lead.id, stg)}
                    className={`py-1.5 text-xs font-semibold rounded transition-colors ${
                      isActive
                        ? 'bg-[#0067FF] text-white shadow-2xs'
                        : 'text-[#475569] hover:bg-white'
                    }`}
                  >
                    {stg}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Customer Message History (Shows merged duplicate thread when repeatCount > 1) */}
          <div className="bg-[#F8FAFC] p-3.5 rounded border border-[#DCE1E7] space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-[#64748B] uppercase tracking-wider">
                Customer Message Thread ({messageList.length}{' '}
                {messageList.length === 1 ? 'message' : 'messages merged'})
              </span>
              <div className="flex items-center space-x-2">
                <span className="px-2 py-0.5 text-[10px] font-semibold rounded bg-white text-[#475569] border border-[#CBD5E1]">
                  Detected Language: {lead.language || 'English'}
                </span>
                <button
                  onClick={handleCopyMessage}
                  className="text-xs text-[#64748B] hover:text-[#1E293B] flex items-center space-x-1"
                >
                  {copiedMessage ? (
                    <Check className="h-3 w-3 text-[#059669]" />
                  ) : (
                    <Copy className="h-3 w-3" />
                  )}
                  <span>{copiedMessage ? 'Copied' : 'Copy'}</span>
                </button>
              </div>
            </div>

            <div className="space-y-2">
              {messageList.map((m, idx) => (
                <div
                  key={m.id || idx}
                  className="p-2.5 rounded bg-white border border-[#E2E8F0] text-xs"
                >
                  <div className="flex items-center justify-between text-[10px] text-[#64748B] mb-1">
                    <span className="font-semibold text-[#334155]">
                      Message #{idx + 1} via {m.channel || lead.channel}
                    </span>
                    <span className="font-mono">{m.receivedAt}</span>
                  </div>
                  <p className="text-sm text-[#1E293B] whitespace-pre-wrap">
                    &ldquo;{m.text}&rdquo;
                  </p>
                </div>
              ))}
            </div>
          </div>

          {/* Missing Knowledge Base Facts Alert */}
          {lead.missingFacts && lead.missingFacts.length > 0 && (
            <div className="p-3 rounded bg-[#FFFBEB] border border-[#FDE68A] flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
              <div className="flex items-start space-x-2 text-[#92400E]">
                <AlertTriangle className="h-4 w-4 text-[#D97706] shrink-0 mt-0.5" />
                <span>
                  <strong>Reply needs Knowledge Base facts:</strong>{' '}
                  {lead.missingFacts.join(', ')}. Currently marked TBC, so the reply promises team confirmation instead of guessing.
                </span>
              </div>
              {onOpenKnowledgeBase && (
                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    onOpenKnowledgeBase();
                  }}
                  className="px-2.5 py-1 rounded text-[11px] font-semibold bg-white border border-[#F59E0B] text-[#B45309] shrink-0 hover:bg-[#FEF3C7]"
                >
                  Edit Knowledge Base
                </button>
              )}
            </div>
          )}

          {/* AI Suggested Reply + Reply Language Override + Direct Send */}
          <div className="bg-white p-4 rounded border border-[#DCE1E7]">
            <div className="flex flex-wrap items-center justify-between gap-2 mb-3 pb-2.5 border-b border-[#EEF1F5]">
              <div className="flex items-center space-x-2">
                <div className="p-1.5 rounded bg-[#0067FF] text-white">
                  <Bot className="h-4 w-4" />
                </div>
                <div>
                  <h3 className="text-xs font-bold uppercase tracking-wider text-[#1E293B]">
                    AI Reply Composer (
                    {lead.aiSource === 'ai' ? 'Server AI Verified' : 'Rules Baseline'})
                  </h3>
                  <span className="text-[11px] text-[#64748B]">
                    Matches customer language or override below
                  </span>
                </div>
              </div>

              {/* Language Override + Regenerate Controls */}
              <div className="flex flex-wrap items-center gap-1.5">
                <select
                  value={selectedReplyLang}
                  onChange={(e) => {
                    const nextLang = e.target.value;
                    setSelectedReplyLang(nextLang);
                    if (onUpdateLeadFields) {
                      onUpdateLeadFields(lead.id, { replyLanguage: nextLang }, false);
                    }
                  }}
                  className="text-xs py-1 px-2 rounded border border-[#CBD5E1] bg-[#F8FAFC] text-[#1E293B] font-medium"
                  title="Reply language override"
                >
                  {REPLY_LANGUAGES.map((l) => (
                    <option key={l} value={l}>
                      {l === 'Auto' ? `Auto (${lead.language})` : `Reply in ${l}`}
                    </option>
                  ))}
                </select>

                <button
                  onClick={() => onGenerateReply(lead, selectedReplyLang)}
                  disabled={isGenerating}
                  className="px-2.5 py-1 rounded text-xs font-semibold text-[#0067FF] hover:bg-[#EBF2FF] bg-[#F8FAFC] border border-[#BFDBFE] transition-colors flex items-center gap-1 disabled:opacity-50"
                >
                  <RefreshCw className={`h-3 w-3 ${isGenerating ? 'animate-spin' : ''}`} />
                  <span>{lead.aiSource === 'ai' ? 'Regenerate AI' : 'Run Server AI'}</span>
                </button>

                {customReply && (
                  <button
                    onClick={handleCopyReply}
                    className="flex items-center space-x-1 px-2.5 py-1 rounded text-xs font-semibold bg-[#F8FAFC] border border-[#CBD5E1] text-[#334155] hover:bg-[#F1F5F9]"
                  >
                    {copiedReply ? (
                      <>
                        <Check className="h-3 w-3 text-[#059669]" />
                        <span>Copied</span>
                      </>
                    ) : (
                      <>
                        <Copy className="h-3 w-3" />
                        <span>Copy</span>
                      </>
                    )}
                  </button>
                )}
              </div>
            </div>

            <div className="space-y-3">
              <textarea
                value={customReply}
                onChange={(e) => setCustomReply(e.target.value)}
                rows={4}
                placeholder="Click Run Server AI to generate a grounded reply..."
                className="w-full text-xs sm:text-sm p-3 bg-white border border-[#CBD5E1] rounded focus:outline-none focus:border-[#0067FF] text-[#1E293B] leading-relaxed"
              />

              <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5 pt-2 border-t border-[#EEF1F5]">
                <span className="text-[11px] text-[#64748B]">
                  Sending copies the reply, opens <strong>{sendAction.appName}</strong>, updates <strong>lastContactedAt</strong>, and advances stage to <strong>Contacted</strong>.
                </span>

                <div className="flex items-center space-x-2 shrink-0">
                  {lead.phone && (
                    <a
                      href={`tel:${lead.phone}`}
                      className="inline-flex items-center space-x-1 px-3 py-1.5 rounded text-xs font-semibold bg-white text-[#334155] border border-[#CBD5E1] hover:bg-[#F8FAFC]"
                    >
                      <PhoneCall className="h-3.5 w-3.5 text-[#059669]" />
                      <span>Call</span>
                    </a>
                  )}

                  {customReply && (
                    <button
                      type="button"
                      onClick={() => onSendReply && onSendReply(lead, customReply)}
                      className={`inline-flex items-center justify-center space-x-1.5 px-4 py-2 rounded text-xs font-semibold shadow-xs transition-colors ${sendAction.colorClass}`}
                    >
                      <Send className="h-3.5 w-3.5" />
                      <span>{sendAction.label}</span>
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Internal Team Notes & History */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-[11px] font-bold text-[#64748B] uppercase tracking-wider">
                Activity Log &amp; Follow-up Notes
              </h3>
              <span className="text-xs text-[#64748B]">
                {(lead.notes || []).length} entries
              </span>
            </div>

            <form onSubmit={handleAddNoteSubmit} className="flex gap-2 mb-3">
              <input
                type="text"
                placeholder="Add follow-up note (e.g. Called student, confirmed schedule)..."
                value={newNoteText}
                onChange={(e) => setNewNoteText(e.target.value)}
                className="flex-1 text-xs py-2 px-3 bg-white border border-[#CBD5E1] rounded focus:outline-none focus:border-[#0067FF]"
              />
              <button
                type="submit"
                disabled={!newNoteText.trim()}
                className="px-3.5 py-2 text-xs font-semibold text-white bg-[#17223B] hover:bg-[#1E293B] rounded disabled:opacity-50"
              >
                Add Note
              </button>
            </form>

            <div className="space-y-1.5">
              {(lead.notes || []).map((note, idx) => (
                <div
                  key={note.id || idx}
                  className="p-2.5 rounded bg-[#F8FAFC] border border-[#EEF1F5] text-xs flex items-start justify-between"
                >
                  <span className="text-[#334155]">{note.text}</span>
                  <span className="text-[10px] text-[#64748B] font-mono shrink-0 ml-3">
                    {note.date}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-5 py-3 border-t border-[#DCE1E7] flex items-center justify-between bg-[#F8FAFC]">
          <button
            onClick={() => onDeleteLead && onDeleteLead(lead.id)}
            className="flex items-center space-x-1 text-xs text-[#DC2626] hover:underline font-semibold"
          >
            <Trash2 className="h-3.5 w-3.5" />
            <span>Delete Record</span>
          </button>

          <button
            onClick={onClose}
            className="px-4 py-1.5 text-xs font-semibold text-[#334155] bg-white hover:bg-[#F1F5F9] border border-[#CBD5E1] rounded"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
