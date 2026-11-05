import React, { useState } from 'react';
import {
  Check,
  Copy,
  ArrowUpDown,
  Loader2,
  Send,
  Upload,
  Download,
  Phone,
  Bot,
  Clock
} from 'lucide-react';
import { getPrimarySendAction } from '../utils/sendDispatcher';
import { getFollowUpStatus } from '../lib/followUp.js';

export function TableView({
  leads = [],
  nowMs,
  teamMembers = [],
  onUpdateStatus,
  onUpdateLeadFields,
  onSelectLead,
  onGenerateReply,
  onSendReply,
  onToggleResolveLead,
  generatingLeadId,
  onOpenBulkImport,
  onExportCSV,
  onBatchGenerateReplies,
  batchProgress
}) {
  const [copiedId, setCopiedId] = useState(null);
  const [sortField, setSortField] = useState('receivedAt');
  const [sortOrder, setSortOrder] = useState('desc');

  const handleSort = (field) => {
    if (sortField === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortOrder('desc');
    }
  };

  const sortedLeads = [...leads].sort((a, b) => {
    const aVal = a[sortField] || '';
    const bVal = b[sortField] || '';
    if (aVal < bVal) return sortOrder === 'asc' ? -1 : 1;
    if (aVal > bVal) return sortOrder === 'asc' ? 1 : -1;
    return 0;
  });

  const handleCopyReply = (e, replyText, id) => {
    e.stopPropagation();
    navigator.clipboard.writeText(replyText);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const getRibbonBadge = (lead) => {
    if (lead.leadType === 'Support') {
      if (lead.isResolved) {
        return (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              if (onToggleResolveLead) onToggleResolveLead(lead.id);
            }}
            className="inline-flex items-center gap-0.5 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider bg-[#059669] text-white rounded-xs"
          >
            <Check className="h-2.5 w-2.5" />
            <span>Resolved</span>
          </button>
        );
      }
      return (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            if (onToggleResolveLead) onToggleResolveLead(lead.id);
          }}
          className="inline-flex items-center gap-1 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider bg-[#DC2626] hover:bg-[#059669] text-white rounded-xs transition-colors"
        >
          <span>Support • Mark Resolved</span>
        </button>
      );
    }

    if (lead.interest === 'Corporate Training') {
      return (
        <span className="inline-block px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider bg-[#059669] text-white rounded-xs">
          Corporate{lead.teamSize ? ` (${lead.teamSize} staff)` : ' B2B'}
        </span>
      );
    }

    const follow = getFollowUpStatus(lead, nowMs);
    if (follow.isOverdue) {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider bg-[#DC2626] text-white rounded-xs">
          <Clock className="h-2.5 w-2.5" />
          <span>48h+ Due</span>
        </span>
      );
    }
    return null;
  };

  const nonSpamLeads = leads.filter((l) => l.leadType !== 'Spam');

  return (
    <div className="space-y-4 pb-10">
      {/* Top Action Bar */}
      <div className="bg-white p-3.5 sm:p-4 rounded-md border border-[#DCE1E7] flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs">
        <div>
          <h3 className="text-sm font-bold text-[#1E293B]">
            All Enquiries &amp; Spreadsheet View ({leads.length} Records)
          </h3>
          <p className="text-xs text-[#64748B]">
            Inspect all sales and non-sales enquiries, assign team owners, run batch AI, or export UTF-8 CSV.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {nonSpamLeads.length > 0 && onBatchGenerateReplies && (
            <button
              onClick={() => onBatchGenerateReplies(nonSpamLeads)}
              disabled={Boolean(batchProgress)}
              className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded text-xs font-semibold text-white bg-[#0067FF] hover:bg-[#0055D4] disabled:opacity-50 shadow-xs transition-colors"
            >
              {batchProgress ? (
                <>
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  <span>
                    AI Queue ({batchProgress.completed}/{batchProgress.total})...
                  </span>
                </>
              ) : (
                <>
                  <Bot className="h-3.5 w-3.5" />
                  <span>Analyze Visible via AI ({nonSpamLeads.length})</span>
                </>
              )}
            </button>
          )}

          <button
            onClick={onOpenBulkImport}
            className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded text-xs font-semibold text-[#1E293B] bg-white hover:bg-[#F8FAFC] border border-[#CBD5E1] transition-colors"
          >
            <Upload className="h-3.5 w-3.5 text-[#64748B]" />
            <span>Import CSV</span>
          </button>

          <button
            onClick={onExportCSV}
            className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded text-xs font-semibold text-[#1E293B] bg-white hover:bg-[#F8FAFC] border border-[#CBD5E1] transition-colors"
          >
            <Download className="h-3.5 w-3.5 text-[#64748B]" />
            <span>Export CSV (UTF-8 BOM)</span>
          </button>
        </div>
      </div>

      {/* 1. MOBILE COMPACT CARD LIST (<768px) */}
      <div className="md:hidden space-y-2.5">
        {sortedLeads.length === 0 ? (
          <div className="bg-white p-8 rounded-md border border-[#DCE1E7] text-center text-xs text-[#64748B]">
            No enquiries found matching the active filter criteria.
          </div>
        ) : (
          sortedLeads.map((lead) => {
            const isGenerating = generatingLeadId === lead.id;
            const hasReply = Boolean(lead.suggestedReply);
            const sendAction = getPrimarySendAction(lead, lead.suggestedReply);

            return (
              <div
                key={lead.id}
                onClick={() => onSelectLead(lead)}
                className="bg-white rounded-md border border-[#DCE1E7] p-3.5 shadow-2xs space-y-2.5 active:bg-[#F8FAFC]"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-1.5 mb-1">
                      {getRibbonBadge(lead)}
                      <span className="font-bold text-sm text-[#0067FF] truncate">
                        {lead.senderName}
                      </span>
                      {(lead.repeatCount || 1) > 1 && (
                        <span className="px-1.5 py-0.5 text-[10px] font-bold rounded bg-[#FEF3C7] text-[#B45309]">
                          {lead.repeatCount}x
                        </span>
                      )}
                    </div>
                    <div className="flex flex-wrap items-center gap-2 text-[11px] text-[#64748B]">
                      {lead.phone ? (
                        <span className="font-mono text-[#334155] flex items-center">
                          <Phone className="h-2.5 w-2.5 mr-1 text-[#059669]" />
                          {lead.phone}
                        </span>
                      ) : (
                        <span className="text-[#D97706] italic">No phone</span>
                      )}
                      <span>•</span>
                      <span>{lead.channel}</span>
                    </div>
                  </div>

                  <div onClick={(e) => e.stopPropagation()} className="shrink-0">
                    <select
                      value={lead.status}
                      onChange={(e) => onUpdateStatus(lead.id, e.target.value)}
                      className="text-xs font-semibold rounded px-2 py-1 border border-[#CBD5E1] bg-[#F8FAFC] text-[#1E293B]"
                    >
                      <option value="New">New</option>
                      <option value="Contacted">Contacted</option>
                      <option value="Interested">Interested</option>
                      <option value="Paid">Paid</option>
                      <option value="Lost">Lost</option>
                    </select>
                  </div>
                </div>

                {lead.aiSummary && (
                  <p className="text-xs font-medium text-[#1E293B]">
                    {lead.aiSummary}
                  </p>
                )}

                <p className="text-xs text-[#475569] bg-[#F8FAFC] p-2 rounded border border-[#EEF1F5] line-clamp-2">
                  &ldquo;{lead.message}&rdquo;
                </p>

                <div
                  className="pt-2 border-t border-[#EEF1F5] flex items-center justify-end gap-2"
                  onClick={(e) => e.stopPropagation()}
                >
                  <button
                    onClick={() => onGenerateReply(lead)}
                    disabled={isGenerating}
                    className="inline-flex items-center space-x-1 px-2.5 py-1.5 rounded text-xs font-semibold text-[#0067FF] bg-[#F0F7FF] border border-[#BFDBFE]"
                  >
                    {isGenerating ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <Bot className="h-3.5 w-3.5" />
                    )}
                    <span>{lead.aiSource === 'ai' ? 'Re-draft' : 'AI Draft'}</span>
                  </button>

                  {hasReply && (
                    <button
                      onClick={() => onSendReply(lead, lead.suggestedReply)}
                      className={`inline-flex items-center space-x-1 px-3 py-1.5 rounded text-xs font-semibold ${sendAction.colorClass}`}
                    >
                      <Send className="h-3.5 w-3.5" />
                      <span>{sendAction.shortLabel}</span>
                    </button>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* 2. DESKTOP SPREADSHEET TABLE (hidden md:block) */}
      <div className="hidden md:block bg-white rounded-md border border-[#DCE1E7] shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead className="bg-[#F8FAFC] text-[11px] font-bold uppercase text-[#64748B] border-b border-[#DCE1E7] tracking-wider">
              <tr>
                <th
                  onClick={() => handleSort('senderName')}
                  className="py-3 px-4 cursor-pointer hover:text-[#1E293B]"
                >
                  <div className="flex items-center space-x-1">
                    <span>Lead Name &amp; Phone</span>
                    <ArrowUpDown className="h-3 w-3" />
                  </div>
                </th>
                <th
                  onClick={() => handleSort('channel')}
                  className="py-3 px-3 cursor-pointer hover:text-[#1E293B]"
                >
                  <div className="flex items-center space-x-1">
                    <span>Source &amp; Time</span>
                    <ArrowUpDown className="h-3 w-3" />
                  </div>
                </th>
                <th
                  onClick={() => handleSort('interest')}
                  className="py-3 px-3 cursor-pointer hover:text-[#1E293B]"
                >
                  <div className="flex items-center space-x-1">
                    <span>Type &amp; Interest</span>
                    <ArrowUpDown className="h-3 w-3" />
                  </div>
                </th>
                <th className="py-3 px-3">Owner</th>
                <th className="py-3 px-4 max-w-xs">Enquiry &amp; AI Summary</th>
                <th
                  onClick={() => handleSort('status')}
                  className="py-3 px-3 cursor-pointer hover:text-[#1E293B]"
                >
                  <div className="flex items-center space-x-1">
                    <span>Stage</span>
                    <ArrowUpDown className="h-3 w-3" />
                  </div>
                </th>
                <th className="py-3 px-4 text-right">AI Reply &amp; Send</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#EEF1F5] text-xs">
              {sortedLeads.length === 0 ? (
                <tr>
                  <td colSpan="7" className="py-12 text-center text-[#64748B]">
                    No enquiries found matching the active filter criteria.
                  </td>
                </tr>
              ) : (
                sortedLeads.map((lead) => {
                  const isGenerating = generatingLeadId === lead.id;
                  const hasReply = Boolean(lead.suggestedReply);
                  const sendAction = getPrimarySendAction(lead, lead.suggestedReply);

                  return (
                    <tr
                      key={lead.id}
                      onClick={() => onSelectLead(lead)}
                      className="hover:bg-[#F8FAFC] transition-colors cursor-pointer"
                    >
                      {/* Col 1: Name, Ribbon & Phone */}
                      <td className="py-3 px-4 align-top">
                        <div className="mb-1 flex flex-wrap items-center gap-1">
                          {getRibbonBadge(lead)}
                          {(lead.repeatCount || 1) > 1 && (
                            <span className="px-1.5 py-0.5 text-[10px] font-bold rounded bg-[#FEF3C7] text-[#B45309] border border-[#FDE68A]">
                              Repeat ({lead.repeatCount}x)
                            </span>
                          )}
                        </div>
                        <div className="font-semibold text-[#0067FF] hover:underline text-[13px]">
                          {lead.senderName}
                        </div>
                        <div className="text-[11px] text-[#64748B] font-mono flex items-center mt-0.5">
                          {lead.phone ? (
                            <>
                              <Phone className="h-2.5 w-2.5 mr-1 text-[#059669]" />
                              {lead.phone}
                            </>
                          ) : (
                            <span className="text-[#D97706] italic font-sans">
                              No phone
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Col 2: Channel & Date */}
                      <td className="py-3 px-3 align-top whitespace-nowrap">
                        <div className="font-semibold text-[#334155]">
                          {lead.channel}
                        </div>
                        <div className="text-[10px] text-[#64748B]">
                          {lead.receivedAt}
                        </div>
                        {lead.nextFollowUpAt && (
                          <div className="text-[10px] text-[#0067FF] font-medium mt-0.5">
                            Follow-up: {lead.nextFollowUpAt}
                          </div>
                        )}
                      </td>

                      {/* Col 3: Lead Type & Interest */}
                      <td className="py-3 px-3 align-top whitespace-nowrap">
                        <div className="flex items-center gap-1">
                          <span
                            className={`px-1.5 py-0.5 text-[10px] font-bold rounded ${
                              (lead.leadType || 'Sales') === 'Sales'
                                ? 'bg-[#EBF2FF] text-[#0067FF]'
                                : lead.leadType === 'Support'
                                  ? 'bg-[#FEF2F2] text-[#DC2626]'
                                  : 'bg-[#F1F5F9] text-[#64748B]'
                            }`}
                          >
                            {lead.leadType || 'Sales'}
                          </span>
                          <span className="font-semibold text-[#1E293B]">
                            {lead.interest}
                          </span>
                        </div>
                        <div className="text-[10px] text-[#64748B] mt-0.5">
                          Lang: <strong>{lead.language}</strong> •{' '}
                          <span
                            className={
                              lead.aiSource === 'ai'
                                ? 'text-[#059669] font-semibold'
                                : 'text-[#64748B]'
                            }
                          >
                            {lead.aiSource === 'ai' ? 'AI Verified' : 'Rules Baseline'}
                          </span>
                        </div>
                      </td>

                      {/* Col 4: Owner Dropdown */}
                      <td
                        className="py-3 px-3 align-top whitespace-nowrap"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <select
                          value={lead.owner || 'Unassigned'}
                          onChange={(e) =>
                            onUpdateLeadFields &&
                            onUpdateLeadFields(lead.id, { owner: e.target.value })
                          }
                          className="text-xs rounded px-2 py-1 border border-[#CBD5E1] bg-white text-[#334155]"
                        >
                          {teamMembers.map((m) => (
                            <option key={m} value={m}>
                              {m}
                            </option>
                          ))}
                        </select>
                      </td>

                      {/* Col 5: Message & AI Summary */}
                      <td className="py-3 px-4 align-top max-w-xs">
                        {lead.aiSummary && (
                          <div className="font-semibold text-[#1E293B] mb-0.5 line-clamp-1">
                            {lead.aiSummary}
                          </div>
                        )}
                        <p className="text-[#475569] line-clamp-2">
                          &ldquo;{lead.message}&rdquo;
                        </p>
                      </td>

                      {/* Col 6: Status Dropdown */}
                      <td
                        className="py-3 px-3 align-top whitespace-nowrap"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <select
                          value={lead.status}
                          onChange={(e) => onUpdateStatus(lead.id, e.target.value)}
                          className="text-xs font-semibold rounded px-2.5 py-1 border border-[#CBD5E1] bg-white text-[#1E293B] focus:outline-none focus:border-[#0067FF]"
                        >
                          <option value="New">New</option>
                          <option value="Contacted">Contacted</option>
                          <option value="Interested">Interested</option>
                          <option value="Paid">Paid</option>
                          <option value="Lost">Lost</option>
                        </select>
                      </td>

                      {/* Col 7: Reply & Direct Send */}
                      <td
                        className="py-3 px-4 align-top text-right whitespace-nowrap"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <div className="flex items-center justify-end space-x-1.5">
                          <button
                            onClick={() => onGenerateReply(lead)}
                            disabled={isGenerating}
                            className="inline-flex items-center space-x-1 px-2.5 py-1.5 rounded text-xs font-semibold text-[#0067FF] bg-[#F0F7FF] hover:bg-[#E0EFFE] border border-[#BFDBFE] disabled:opacity-50"
                          >
                            {isGenerating ? (
                              <Loader2 className="h-3.5 w-3.5 animate-spin" />
                            ) : (
                              <Bot className="h-3.5 w-3.5" />
                            )}
                            <span>{lead.aiSource === 'ai' ? 'Re-draft' : 'AI Draft'}</span>
                          </button>

                          {hasReply && (
                            <>
                              <button
                                onClick={() => onSendReply(lead, lead.suggestedReply)}
                                className={`inline-flex items-center space-x-1 px-2.5 py-1.5 rounded text-xs font-semibold shadow-2xs transition-colors ${sendAction.colorClass}`}
                              >
                                <Send className="h-3 w-3" />
                                <span>{sendAction.shortLabel}</span>
                              </button>
                              <button
                                onClick={(e) =>
                                  handleCopyReply(e, lead.suggestedReply, lead.id)
                                }
                                title="Copy Reply Text"
                                className="p-1.5 rounded border border-[#CBD5E1] bg-white hover:bg-[#F8FAFC] text-[#475569]"
                              >
                                {copiedId === lead.id ? (
                                  <Check className="h-3.5 w-3.5 text-[#059669]" />
                                ) : (
                                  <Copy className="h-3.5 w-3.5" />
                                )}
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
