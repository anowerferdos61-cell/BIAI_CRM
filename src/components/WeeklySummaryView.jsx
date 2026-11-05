import React, { useState } from 'react';
import {
  FileText,
  Building2,
  AlertTriangle,
  Copy,
  Check,
  Loader2,
  RefreshCw,
  ArrowUpRight,
  HelpCircle,
  Send
} from 'lucide-react';
import { computePipelineStats } from '../lib/weeklyStats.js';
import { generateWeeklySummaryNarrative } from '../services/aiService.js';

export function WeeklySummaryView({
  leads = [],
  nowMs,
  onDrillDown,
  onSelectLead,
  onGoToSupport,
  onOpenKnowledgeBase
}) {
  const [copied, setCopied] = useState(false);
  const [loadingAI, setLoadingAI] = useState(false);
  const [aiNarrative, setAiNarrative] = useState(null);
  const [aiError, setAiError] = useState(null);

  // All metrics are computed deterministically from real lead records
  const stats = computePipelineStats(leads, nowMs);

  const handleRunLiveAISummary = async () => {
    setLoadingAI(true);
    setAiError(null);
    try {
      const res = await generateWeeklySummaryNarrative({ stats, leads });
      if (res.ok && res.report) {
        setAiNarrative(res.report);
      } else {
        setAiError(res.error || 'AI narrative unavailable');
      }
    } finally {
      setLoadingAI(false);
    }
  };

  // Dynamic, truthful overview computed from current `leads`
  const computedOverview = `${stats.totalEnquiries} unique enquiries (${stats.totalMessagesIngested} total messages ingested) across ${Object.keys(stats.byChannel).length} channels. ${stats.salesCount} are active Sales leads (${stats.byInterest.Bootcamp} Bootcamp, ${stats.byInterest.Fellowship} Fellowship, ${stats.byInterest['Corporate Training']} Corporate Training totaling ${stats.totalCorporateSeats} employees), while ${stats.openSupportCount} open support cases, ${stats.jobSeekerCount} job applicant, and ${stats.spamCount} spam message are triaged separately. ${stats.overdueCount} sales leads currently need follow-up (>48h or scheduled callback due).`;

  const headlineText = aiNarrative?.executiveOverview || computedOverview;

  const chaseList =
    aiNarrative?.chaseFirst && aiNarrative.chaseFirst.length > 0
      ? aiNarrative.chaseFirst
      : stats.chaseFirst.map((l) => ({
          id: l.id,
          name: l.senderName,
          reason:
            l.interest === 'Corporate Training'
              ? `Corporate Training (${l.teamSize || 'team'} staff) via ${l.channel}`
              : (l.repeatCount || 1) > 1
                ? `Repeat contact (${l.repeatCount} messages) — ${l.interest}`
                : `${l.interest} (${l.language}) — Stage: ${l.status}`,
          action: l.nextAction || 'Send reply and confirm schedule/details'
        }));

  const escalationList =
    aiNarrative?.supportAndEscalations &&
    aiNarrative.supportAndEscalations.length > 0
      ? aiNarrative.supportAndEscalations
      : stats.openSupportLeads.map(
          (l) =>
            `${l.senderName} (${l.phone || l.channel}): ${l.aiSummary || l.message}`
        );

  const faqGaps =
    aiNarrative?.faqAndKnowledgeGaps &&
    aiNarrative.faqAndKnowledgeGaps.length > 0
      ? aiNarrative.faqAndKnowledgeGaps
      : stats.topMissingFacts.map(
          (item) =>
            `${item.fact} — requested in ${item.count} enquir${item.count > 1 ? 'ies' : 'y'} (currently TBC in Knowledge Base)`
        );

  const fullTextReport = [
    'BIAI CRM — Weekly Pipeline & Action Summary',
    '',
    `Overview:`,
    headlineText,
    '',
    `Pipeline Breakdown (${stats.salesCount} Sales Leads):`,
    `- New: ${stats.byStage.New} | Contacted: ${stats.byStage.Contacted} | Interested: ${stats.byStage.Interested} | Paid: ${stats.byStage.Paid} | Lost: ${stats.byStage.Lost}`,
    `- Programs: Bootcamp (${stats.byInterest.Bootcamp}), Fellowship (${stats.byInterest.Fellowship}), Corporate (${stats.byInterest['Corporate Training']} leads / ${stats.totalCorporateSeats} staff)`,
    `- Follow-ups Due (>48h / Scheduled): ${stats.overdueCount}`,
    '',
    `Top Leads to Chase First:`,
    ...chaseList.map((c, i) => `${i + 1}. ${c.name} — ${c.reason} -> ${c.action}`),
    '',
    `Open Support & Escalations (${escalationList.length}):`,
    ...(escalationList.length > 0
      ? escalationList.map((e) => `- ${e}`)
      : ['- No open support escalations.']),
    '',
    `Recurring Questions & Knowledge Base Gaps:`,
    ...(faqGaps.length > 0
      ? faqGaps.map((g) => `- ${g}`)
      : ['- All requested program details are configured in the Knowledge Base.'])
  ].join('\n');

  const handleCopy = () => {
    navigator.clipboard.writeText(fullTextReport);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleShareWhatsApp = () => {
    const url = `https://wa.me/?text=${encodeURIComponent(fullTextReport)}`;
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  return (
    <div className="space-y-5 pb-10">
      {/* Header Bar */}
      <div className="bg-white p-4 rounded-md border border-[#DCE1E7] flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-xs">
        <div className="flex items-center space-x-3">
          <div className="p-2.5 rounded bg-[#0067FF] text-white">
            <FileText className="h-5 w-5" />
          </div>
          <div>
            <h2 className="text-base font-bold text-[#1E293B]">
              Weekly Pipeline &amp; AI Action Summary
            </h2>
            <p className="text-xs text-[#64748B]">
              Metrics are computed directly from your {stats.totalEnquiries} active records; AI writes the narrative &amp; chase priorities
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={handleRunLiveAISummary}
            disabled={loadingAI}
            className="inline-flex items-center space-x-1.5 px-3.5 py-2 rounded text-xs font-semibold text-white bg-[#0067FF] hover:bg-[#0055D4] disabled:opacity-50 shadow-xs transition-colors"
          >
            {loadingAI ? (
              <>
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                <span>Generating AI Summary...</span>
              </>
            ) : (
              <>
                <RefreshCw className="h-3.5 w-3.5" />
                <span>
                  {aiNarrative ? 'Regenerate AI Narrative' : 'Generate AI Narrative'}
                </span>
              </>
            )}
          </button>

          <button
            onClick={handleCopy}
            className="inline-flex items-center space-x-1.5 px-3 py-2 rounded text-xs font-semibold text-[#334155] bg-white hover:bg-[#F8FAFC] border border-[#CBD5E1]"
          >
            {copied ? (
              <Check className="h-3.5 w-3.5 text-[#059669]" />
            ) : (
              <Copy className="h-3.5 w-3.5" />
            )}
            <span>{copied ? 'Copied' : 'Copy Report'}</span>
          </button>

          <button
            onClick={handleShareWhatsApp}
            className="inline-flex items-center space-x-1.5 px-3 py-2 rounded text-xs font-semibold text-white bg-[#059669] hover:bg-[#047857]"
          >
            <Send className="h-3.5 w-3.5" />
            <span>Share on WhatsApp</span>
          </button>
        </div>
      </div>

      {/* Honest AI Offline Notice if API failed */}
      {aiError && (
        <div className="p-3 rounded bg-[#FFFBEB] border border-[#FDE68A] text-xs text-[#92400E] flex items-center justify-between">
          <span>
            <strong>AI Narrative Offline ({aiError}):</strong> Showing exact computed pipeline statistics and deterministic priority rankings below.
          </span>
        </div>
      )}

      {/* Computed KPI Strip */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 text-xs">
        <div className="bg-white p-3 rounded border border-[#DCE1E7]">
          <div className="text-[10px] font-bold uppercase text-[#64748B]">
            Total Enquiries
          </div>
          <div className="text-xl font-bold text-[#1E293B] mt-0.5">
            {stats.totalEnquiries}
          </div>
          <div className="text-[11px] text-[#64748B]">
            {stats.totalMessagesIngested} messages total
          </div>
        </div>

        <div className="bg-white p-3 rounded border border-[#DCE1E7]">
          <div className="text-[10px] font-bold uppercase text-[#0067FF]">
            Sales Pipeline
          </div>
          <div className="text-xl font-bold text-[#1E293B] mt-0.5">
            {stats.salesCount}
          </div>
          <div className="text-[11px] text-[#64748B]">
            New {stats.byStage.New} • Contacted {stats.byStage.Contacted}
          </div>
        </div>

        <div className="bg-white p-3 rounded border border-[#DCE1E7]">
          <div className="text-[10px] font-bold uppercase text-[#059669]">
            Corporate B2B
          </div>
          <div className="text-xl font-bold text-[#1E293B] mt-0.5">
            {stats.corporateCount}
          </div>
          <div className="text-[11px] text-[#059669] font-medium">
            {stats.totalCorporateSeats} employees total
          </div>
        </div>

        <div className="bg-white p-3 rounded border border-[#DCE1E7]">
          <div className="text-[10px] font-bold uppercase text-[#DC2626]">
            Follow-ups Due
          </div>
          <div className="text-xl font-bold text-[#DC2626] mt-0.5">
            {stats.overdueCount}
          </div>
          <div className="text-[11px] text-[#64748B]">&gt;48h or scheduled</div>
        </div>

        <div className="bg-white p-3 rounded border border-[#DCE1E7]">
          <div className="text-[10px] font-bold uppercase text-[#D97706]">
            Open Support
          </div>
          <div className="text-xl font-bold text-[#1E293B] mt-0.5">
            {stats.openSupportCount}
          </div>
          <div className="text-[11px] text-[#64748B]">
            {stats.resolvedSupportCount} resolved
          </div>
        </div>

        <div className="bg-white p-3 rounded border border-[#DCE1E7]">
          <div className="text-[10px] font-bold uppercase text-[#64748B]">
            Repeat Merged
          </div>
          <div className="text-xl font-bold text-[#1E293B] mt-0.5">
            {stats.repeatLeadsCount}
          </div>
          <div className="text-[11px] text-[#64748B]">
            {stats.missingPhoneCount} missing phone
          </div>
        </div>
      </div>

      {/* Executive Headline Banner */}
      <div className="bg-white p-5 rounded-md border border-[#DCE1E7] border-l-4 border-l-[#0067FF] shadow-xs">
        <div className="flex items-center justify-between mb-1">
          <span className="text-[11px] font-bold uppercase tracking-wider text-[#0067FF]">
            Executive Overview ({aiNarrative ? 'AI Generated' : 'Computed from Live Data'})
          </span>
          {aiNarrative?.generatedAt && (
            <span className="text-[10px] text-[#64748B] font-mono">
              Generated {aiNarrative.generatedAt.slice(0, 16).replace('T', ' ')}
            </span>
          )}
        </div>
        <p className="text-sm font-medium leading-relaxed text-[#1E293B]">
          {headlineText}
        </p>
      </div>

      {/* Two Column Breakdown: Chase First List & Open Support Escalations */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Top Leads to Chase First */}
        <div className="bg-white p-4 rounded-md border border-[#DCE1E7] shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-2.5 mb-3 border-b border-[#EEF1F5]">
              <div className="flex items-center space-x-2 text-[#059669] font-bold text-xs uppercase tracking-wider">
                <Building2 className="h-4 w-4" />
                <span>Which Leads to Chase First ({chaseList.length})</span>
              </div>
              <button
                onClick={() =>
                  onDrillDown({
                    tab: 'pipeline',
                    interest: 'all',
                    channel: 'All Channels',
                    urgency: 'all',
                    stage: 'all',
                    owner: 'all'
                  })
                }
                className="text-xs font-semibold text-[#0067FF] hover:underline flex items-center"
              >
                Open Pipeline <ArrowUpRight className="h-3.5 w-3.5 ml-0.5" />
              </button>
            </div>

            {chaseList.length === 0 ? (
              <div className="p-6 text-center text-xs text-[#64748B]">
                No open sales leads waiting to be chased.
              </div>
            ) : (
              <ul className="space-y-2 text-xs text-[#334155]">
                {chaseList.map((item, idx) => {
                  const matchingLead = leads.find(
                    (l) => l.id === item.id || l.senderName === item.name
                  );
                  return (
                    <li
                      key={idx}
                      onClick={() =>
                        matchingLead && onSelectLead && onSelectLead(matchingLead)
                      }
                      className={`p-3 rounded bg-[#F8FAFC] border border-[#DCE1E7] border-l-3 border-l-[#059669] leading-relaxed ${
                        matchingLead ? 'cursor-pointer hover:border-[#0067FF]' : ''
                      }`}
                    >
                      <div className="font-bold text-[#1E293B]">
                        {idx + 1}. {item.name}
                      </div>
                      <div className="text-[#475569] mt-0.5">{item.reason}</div>
                      {item.action && (
                        <div className="text-[#0067FF] font-medium mt-0.5">
                          Action: {item.action}
                        </div>
                      )}
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </div>

        {/* Open Support & Escalations */}
        <div className="bg-white p-4 rounded-md border border-[#DCE1E7] shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-2.5 mb-3 border-b border-[#EEF1F5]">
              <div className="flex items-center space-x-2 text-[#DC2626] font-bold text-xs uppercase tracking-wider">
                <AlertTriangle className="h-4 w-4" />
                <span>Open Support &amp; Refund Escalations</span>
              </div>
              {onGoToSupport && (
                <button
                  onClick={onGoToSupport}
                  className="text-xs font-semibold text-[#0067FF] hover:underline flex items-center"
                >
                  Support Inbox <ArrowUpRight className="h-3.5 w-3.5 ml-0.5" />
                </button>
              )}
            </div>

            {escalationList.length === 0 ? (
              <div className="p-6 text-center text-xs text-[#059669] bg-[#ECFDF5] rounded border border-[#A7F3D0]">
                All support and refund cases are resolved!
              </div>
            ) : (
              <ul className="space-y-2 text-xs text-[#334155]">
                {escalationList.map((alertText, idx) => (
                  <li
                    key={idx}
                    className="p-3 rounded bg-[#FEF2F2]/60 border border-[#FECACA] border-l-3 border-l-[#DC2626] leading-relaxed"
                  >
                    {alertText}
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="mt-3 py-2 px-3 rounded bg-[#F8FAFC] border border-[#DCE1E7] text-[11px] text-[#64748B] flex items-center justify-between">
            <span>
              Non-Sales Filtered:{' '}
              <strong className="text-[#1E293B]">
                {stats.spamCount} Spam &amp; {stats.jobSeekerCount} Job Seeker
              </strong>
            </span>
            <span className="font-semibold text-[#059669]">Kept out of Lost stage</span>
          </div>
        </div>
      </div>

      {/* Recurring Questions & Knowledge Base Gaps */}
      <div className="bg-white p-4 rounded-md border border-[#DCE1E7] shadow-xs">
        <div className="flex items-center justify-between pb-2.5 mb-3 border-b border-[#EEF1F5]">
          <div className="flex items-center space-x-2 text-xs font-bold uppercase tracking-wider text-[#1E293B]">
            <HelpCircle className="h-4 w-4 text-[#0067FF]" />
            <span>Recurring Customer Questions &amp; Knowledge Base Gaps</span>
          </div>
          {onOpenKnowledgeBase && (
            <button
              onClick={onOpenKnowledgeBase}
              className="text-xs font-semibold text-[#0067FF] hover:underline flex items-center"
            >
              Fill Knowledge Base <ArrowUpRight className="h-3.5 w-3.5 ml-0.5" />
            </button>
          )}
        </div>

        {faqGaps.length === 0 ? (
          <div className="text-xs text-[#64748B] p-4 bg-[#F8FAFC] rounded">
            No missing Knowledge Base facts detected across current enquiries.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
            {faqGaps.map((rec, idx) => (
              <div
                key={idx}
                className="p-3 rounded bg-[#F8FAFC] border border-[#DCE1E7] leading-relaxed text-[#334155]"
              >
                <span className="font-bold text-[#0067FF] mr-1.5">
                  {idx + 1}.
                </span>
                {rec}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
