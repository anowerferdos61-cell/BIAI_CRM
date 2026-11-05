import React, { useState } from 'react';
import {
  LifeBuoy,
  ShieldAlert,
  Briefcase,
  CheckCircle2,
  Clock,
  Send,
  Bot,
  Loader2,
  Phone,
  ArrowRightLeft
} from 'lucide-react';
import { getPrimarySendAction } from '../utils/sendDispatcher';

export function SupportInboxView({
  leads = [],
  onSelectLead,
  onGenerateReply,
  onSendReply,
  onToggleResolveLead,
  onReclassifyToSales,
  generatingLeadId
}) {
  const [filterType, setFilterType] = useState('all'); // 'all' | 'Support' | 'Job Seeker' | 'Spam'

  const nonSalesLeads = leads.filter((l) => (l.leadType || 'Sales') !== 'Sales');
  const supportLeads = nonSalesLeads.filter((l) => l.leadType === 'Support');
  const openSupportCount = supportLeads.filter((l) => !l.isResolved).length;
  const resolvedSupportCount = supportLeads.filter((l) => l.isResolved).length;
  const jobLeads = nonSalesLeads.filter((l) => l.leadType === 'Job Seeker');
  const spamLeads = nonSalesLeads.filter((l) => l.leadType === 'Spam');

  const visibleLeads =
    filterType === 'all'
      ? nonSalesLeads
      : filterType === 'open-support'
        ? supportLeads.filter((l) => !l.isResolved)
        : filterType === 'resolved-support'
          ? supportLeads.filter((l) => l.isResolved)
          : nonSalesLeads.filter((l) => l.leadType === filterType);

  return (
    <div className="space-y-4 pb-10">
      {/* Top Info Header */}
      <div className="bg-white p-4 sm:p-5 rounded-md border border-[#DCE1E7] shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-start space-x-3">
          <div className="p-2.5 rounded bg-[#D97706] text-white shrink-0">
            <LifeBuoy className="h-5 w-5" />
          </div>
          <div>
            <h2 className="text-base font-bold text-[#1E293B]">
              Non-Sales Triage Inbox (Support, Job Seekers &amp; Spam)
            </h2>
            <p className="text-xs text-[#64748B] mt-0.5">
              These {nonSalesLeads.length} enquiries are separated from the Sales Pipeline so support issues, job applicants, and crypto spam bots never distort your sales conversion metrics.
            </p>
          </div>
        </div>

        {/* Category Filter Tabs */}
        <div className="flex flex-wrap items-center gap-1.5 shrink-0">
          <button
            onClick={() => setFilterType('all')}
            className={`px-3 py-1.5 rounded text-xs font-semibold transition-colors ${
              filterType === 'all'
                ? 'bg-[#17223B] text-white'
                : 'bg-[#F1F5F9] text-[#475569] hover:bg-[#E2E8F0]'
            }`}
          >
            All ({nonSalesLeads.length})
          </button>
          <button
            onClick={() => setFilterType('Support')}
            className={`px-3 py-1.5 rounded text-xs font-semibold transition-colors inline-flex items-center space-x-1 ${
              filterType === 'Support'
                ? 'bg-[#DC2626] text-white'
                : 'bg-[#FEF2F2] text-[#DC2626] border border-[#FECACA]'
            }`}
          >
            <LifeBuoy className="h-3.5 w-3.5" />
            <span>
              Support ({openSupportCount > 0 ? `${openSupportCount} Open` : '0 Open'}{resolvedSupportCount > 0 ? `, ${resolvedSupportCount} Resolved` : ''})
            </span>
          </button>
          {openSupportCount > 0 && (
            <button
              onClick={() => setFilterType('open-support')}
              className={`px-3 py-1.5 rounded text-xs font-semibold transition-colors inline-flex items-center space-x-1 ${
                filterType === 'open-support'
                  ? 'bg-[#B45309] text-white'
                  : 'bg-[#FFFBEB] text-[#B45309] border border-[#FDE68A]'
              }`}
            >
              <span>🚨 Urgent Action Required ({openSupportCount})</span>
            </button>
          )}
          {resolvedSupportCount > 0 && (
            <button
              onClick={() => setFilterType('resolved-support')}
              className={`px-3 py-1.5 rounded text-xs font-semibold transition-colors inline-flex items-center space-x-1 ${
                filterType === 'resolved-support'
                  ? 'bg-[#059669] text-white'
                  : 'bg-[#ECFDF5] text-[#059669] border border-[#A7F3D0]'
              }`}
            >
              <span>✓ Resolved Cases ({resolvedSupportCount})</span>
            </button>
          )}
          <button
            onClick={() => setFilterType('Job Seeker')}
            className={`px-3 py-1.5 rounded text-xs font-semibold transition-colors inline-flex items-center space-x-1 ${
              filterType === 'Job Seeker'
                ? 'bg-[#0284C7] text-white'
                : 'bg-[#E0F2FE] text-[#0369A1] border border-[#BAE6FD]'
            }`}
          >
            <Briefcase className="h-3.5 w-3.5" />
            <span>Job Seekers ({jobLeads.length})</span>
          </button>
          <button
            onClick={() => setFilterType('Spam')}
            className={`px-3 py-1.5 rounded text-xs font-semibold transition-colors inline-flex items-center space-x-1 ${
              filterType === 'Spam'
                ? 'bg-[#475569] text-white'
                : 'bg-[#F1F5F9] text-[#64748B] border border-[#CBD5E1]'
            }`}
          >
            <ShieldAlert className="h-3.5 w-3.5" />
            <span>Spam Filtered ({spamLeads.length})</span>
          </button>
        </div>
      </div>

      {/* Records List */}
      <div className="space-y-3">
        {visibleLeads.length === 0 ? (
          <div className="bg-white p-10 rounded-md border border-[#DCE1E7] text-center text-xs text-[#64748B]">
            No records in this triage category.
          </div>
        ) : (
          visibleLeads.map((lead) => {
            const isGenerating = generatingLeadId === lead.id;
            const sendAction = getPrimarySendAction(lead, lead.suggestedReply);

            return (
              <div
                key={lead.id}
                onClick={() => onSelectLead(lead)}
                className={`bg-white p-4 rounded-md border shadow-xs transition-all cursor-pointer hover:border-[#0067FF] ${
                  lead.leadType === 'Support' && !lead.isResolved
                    ? 'border-[#FCA5A5] border-l-4 border-l-[#DC2626]'
                    : 'border-[#DCE1E7]'
                }`}
              >
                <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-4">
                  <div className="space-y-2 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-sm font-bold text-[#1E293B]">
                        {lead.senderName}
                      </span>

                      <span
                        className={`px-2 py-0.5 text-[11px] font-bold rounded ${
                          lead.leadType === 'Support'
                            ? 'bg-[#FEF2F2] text-[#DC2626] border border-[#FECACA]'
                            : lead.leadType === 'Job Seeker'
                              ? 'bg-[#E0F2FE] text-[#0369A1] border border-[#BAE6FD]'
                              : 'bg-[#F1F5F9] text-[#64748B] border border-[#CBD5E1]'
                        }`}
                      >
                        {lead.leadType}
                      </span>

                      <span className="px-2 py-0.5 text-[11px] font-medium rounded bg-[#F8FAFC] text-[#475569] border border-[#E2E8F0]">
                        {lead.channel}
                      </span>

                      <span className="text-xs text-[#64748B] font-mono flex items-center">
                        {lead.phone ? (
                          <>
                            <Phone className="h-3 w-3 mr-1 text-[#059669]" />
                            {lead.phone}
                          </>
                        ) : (
                          'No phone'
                        )}
                      </span>

                      <span className="text-xs text-[#64748B]">
                        Received: {lead.receivedAt}
                      </span>

                      {lead.leadType === 'Support' && (
                        <span
                          className={`px-2 py-0.5 text-[11px] font-bold rounded ${
                            lead.isResolved
                              ? 'bg-[#ECFDF5] text-[#059669] border border-[#A7F3D0]'
                              : 'bg-[#FFFBEB] text-[#B45309] border border-[#FDE68A]'
                          }`}
                        >
                          {lead.isResolved ? '✓ Resolved' : '⏰ Action Required'}
                        </span>
                      )}
                    </div>

                    {lead.aiSummary && (
                      <div className="text-xs font-semibold text-[#1E293B]">
                        AI Summary: {lead.aiSummary}{' '}
                        {lead.nextAction && (
                          <span className="text-[#0067FF] font-normal">
                            — Next step: {lead.nextAction}
                          </span>
                        )}
                      </div>
                    )}

                    <div className="p-2.5 rounded bg-[#F8FAFC] border border-[#EEF1F5] text-xs text-[#334155]">
                      &ldquo;{lead.message}&rdquo;
                    </div>

                    {lead.suggestedReply && (
                      <div className="p-2.5 rounded bg-[#F0F7FF] border border-[#BFDBFE] text-xs text-[#1E293B]">
                        <div className="text-[10px] font-bold uppercase text-[#0067FF] mb-1">
                          Suggested Reply ({lead.language}):
                        </div>
                        <p>{lead.suggestedReply}</p>
                      </div>
                    )}
                  </div>

                  {/* Action Buttons */}
                  <div
                    className="flex flex-wrap lg:flex-col items-stretch gap-2 shrink-0"
                    onClick={(e) => e.stopPropagation()}
                  >
                    {lead.leadType === 'Support' && (
                      <button
                        onClick={() => onToggleResolveLead(lead.id)}
                        className={`px-3 py-1.5 rounded text-xs font-semibold inline-flex items-center justify-center space-x-1.5 border transition-colors ${
                          lead.isResolved
                            ? 'bg-white text-[#475569] border-[#CBD5E1] hover:bg-[#F8FAFC]'
                            : 'bg-[#059669] text-white border-[#059669] hover:bg-[#047857]'
                        }`}
                      >
                        {lead.isResolved ? (
                          <>
                            <Clock className="h-3.5 w-3.5" />
                            <span>Reopen Case</span>
                          </>
                        ) : (
                          <>
                            <CheckCircle2 className="h-3.5 w-3.5" />
                            <span>Mark Resolved</span>
                          </>
                        )}
                      </button>
                    )}

                    {lead.leadType !== 'Spam' && (
                      <button
                        onClick={() => onGenerateReply(lead)}
                        disabled={isGenerating}
                        className="px-3 py-1.5 rounded text-xs font-semibold text-[#0067FF] bg-[#EBF2FF] hover:bg-[#DBEAFE] border border-[#BBD6FF] inline-flex items-center justify-center space-x-1.5 disabled:opacity-50"
                      >
                        {isGenerating ? (
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        ) : (
                          <Bot className="h-3.5 w-3.5" />
                        )}
                        <span>
                          {lead.aiSource === 'ai' ? 'Regenerate Reply' : 'Analyze via AI'}
                        </span>
                      </button>
                    )}

                    {lead.suggestedReply && lead.leadType !== 'Spam' && (
                      <button
                        onClick={() => onSendReply(lead, lead.suggestedReply)}
                        className={`px-3 py-1.5 rounded text-xs font-semibold inline-flex items-center justify-center space-x-1.5 ${sendAction.colorClass}`}
                      >
                        <Send className="h-3.5 w-3.5" />
                        <span>{sendAction.shortLabel}</span>
                      </button>
                    )}

                    <button
                      onClick={() => onReclassifyToSales(lead.id)}
                      className="px-3 py-1.5 rounded text-[11px] font-medium text-[#64748B] bg-white hover:bg-[#F8FAFC] border border-[#DCE1E7] inline-flex items-center justify-center space-x-1"
                      title="Move this record into the Sales Pipeline"
                    >
                      <ArrowRightLeft className="h-3 w-3" />
                      <span>Move to Sales Pipeline</span>
                    </button>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}

