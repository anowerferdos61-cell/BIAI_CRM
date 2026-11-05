import React from 'react';
import {
  Users,
  Clock,
  Briefcase,
  AlertTriangle,
  ArrowUpRight,
  Send,
  Loader2,
  MessageSquare,
  Globe,
  PhoneCall,
  Upload,
  Plus,
  Bot,
  CalendarClock,
  Sparkles
} from 'lucide-react';
import { FacebookIcon } from './Icons';
import { getPrimarySendAction } from '../utils/sendDispatcher';
import { computePipelineStats } from '../lib/weeklyStats.js';
import { getFollowUpStatus } from '../lib/followUp.js';

export function OverviewDashboard({
  leads = [],
  nowMs,
  onDrillDown,
  onSelectLead,
  onGenerateReply,
  onSendReply,
  onSnoozeFollowUp,
  onRunBatchAI,
  batchProgress,
  generatingLeadId,
  onOpenBulkImport,
  onGoToMagicPaste,
  onGoToSupport
}) {
  const stats = computePipelineStats(leads, nowMs);
  const salesCount = stats.salesCount;
  const rulesOnlyCount = leads.filter(
    (l) => l.aiSource !== 'ai' && l.leadType !== 'Spam'
  ).length;

  // 1. Sales Pipeline Stage Funnel (Sales leads only)
  const stagesData = [
    { id: 'New', label: 'New (Uncontacted)', color: 'bg-[#7C3AED]' },
    { id: 'Contacted', label: 'Contacted', color: 'bg-[#0284C7]' },
    { id: 'Interested', label: 'Interested', color: 'bg-[#D97706]' },
    { id: 'Paid', label: 'Paid / Enrolled', color: 'bg-[#059669]' },
    { id: 'Lost', label: 'Lost', color: 'bg-[#64748B]' }
  ].map((st) => {
    const count = stats.byStage[st.id] || 0;
    const pct = salesCount > 0 ? Math.round((count / salesCount) * 100) : 0;
    return { ...st, count, pct };
  });

  // 2. Channel Breakdown (All enquiries)
  const channelsData = [
    {
      id: 'WhatsApp',
      label: 'WhatsApp',
      color: 'bg-[#059669]',
      icon: MessageSquare,
      iconColor: 'text-[#059669]'
    },
    {
      id: 'Facebook Messenger',
      label: 'FB Messenger',
      color: 'bg-[#0067FF]',
      icon: FacebookIcon,
      iconColor: 'text-[#0067FF]'
    },
    {
      id: 'Facebook comment',
      label: 'FB Comments',
      color: 'bg-[#0284C7]',
      icon: FacebookIcon,
      iconColor: 'text-[#0284C7]'
    },
    {
      id: 'Website form',
      label: 'Website Form',
      color: 'bg-[#475569]',
      icon: Globe,
      iconColor: 'text-[#475569]'
    },
    {
      id: 'Phone call note',
      label: 'Phone Call Note',
      color: 'bg-[#D97706]',
      icon: PhoneCall,
      iconColor: 'text-[#D97706]'
    }
  ].map((ch) => {
    const count = stats.byChannel[ch.id] || 0;
    const pct =
      stats.totalEnquiries > 0
        ? Math.round((count / stats.totalEnquiries) * 100)
        : 0;
    return { ...ch, count, pct };
  });

  // 3. Program Interest Breakdown (Sales leads) + Non-Sales Split
  const interestData = [
    {
      id: 'Bootcamp',
      label: '3-Day Bootcamp',
      color: 'bg-[#0067FF]',
      count: stats.byInterest.Bootcamp,
      isSales: true
    },
    {
      id: 'Fellowship',
      label: 'AI Fellowship',
      color: 'bg-[#0284C7]',
      count: stats.byInterest.Fellowship,
      isSales: true
    },
    {
      id: 'Corporate Training',
      label: `Corporate Training (${stats.totalCorporateSeats} seats)`,
      color: 'bg-[#059669]',
      count: stats.byInterest['Corporate Training'],
      isSales: true
    },
    {
      id: 'Unknown',
      label: 'Sales (Program Unspecified)',
      color: 'bg-[#64748B]',
      count: stats.byInterest.Unknown,
      isSales: true
    }
  ];

  return (
    <div className="space-y-4 sm:space-y-5 pb-10">
      {/* Live AI Analysis Banner if sample data hasn't been analyzed by server AI yet */}
      {rulesOnlyCount > 0 && (
        <div className="bg-white border border-[#BBD6FF] rounded-md p-3.5 sm:px-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs">
          <div className="flex items-start sm:items-center space-x-3">
            <div className="p-2 rounded bg-[#EBF2FF] text-[#0067FF] shrink-0">
              <Sparkles className="h-4 w-4" />
            </div>
            <div>
              <h3 className="text-xs sm:text-sm font-bold text-[#1E293B]">
                {rulesOnlyCount} enquiries currently using baseline rule extraction
              </h3>
              <p className="text-xs text-[#64748B]">
                Click to run the server-side AI across all {rulesOnlyCount} enquiries (concurrency=3) to generate live summaries & dialect-matched replies.
              </p>
            </div>
          </div>

          <button
            onClick={() => onRunBatchAI && onRunBatchAI()}
            disabled={Boolean(batchProgress)}
            className="inline-flex items-center justify-center space-x-1.5 px-3.5 py-2 rounded text-xs font-semibold text-white bg-[#0067FF] hover:bg-[#0055D4] disabled:opacity-60 shrink-0 transition-colors"
          >
            {batchProgress ? (
              <>
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                <span>
                  Analyzing {batchProgress.completed}/{batchProgress.total}...
                </span>
              </>
            ) : (
              <>
                <Bot className="h-3.5 w-3.5" />
                <span>Analyze All {rulesOnlyCount} via AI</span>
              </>
            )}
          </button>
        </div>
      )}

      {/* Critical Support Escalation Banner (e.g. #16 Habibur Rahman or #7 Farzana Rahman) */}
      {stats.openSupportLeads.length > 0 && (
        <div className="bg-[#FEF2F2] border border-[#FECACA] rounded-md p-3.5 sm:px-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-start space-x-3">
            <AlertTriangle className="h-5 w-5 text-[#DC2626] shrink-0 mt-0.5" />
            <div>
              <h3 className="text-xs sm:text-sm font-bold text-[#991B1B]">
                {stats.openSupportLeads.length} Urgent Support / Escalation Case{stats.openSupportLeads.length > 1 ? 's' : ''} Open
              </h3>
              <p className="text-xs text-[#7F1D1D] mt-0.5">
                {stats.openSupportLeads
                  .map((l) => `${l.senderName} (${l.aiSummary || l.message.slice(0, 60)})`)
                  .join(' • ')}
              </p>
            </div>
          </div>
          <button
            onClick={onGoToSupport}
            className="px-3 py-1.5 rounded text-xs font-semibold bg-[#DC2626] text-white hover:bg-[#B91C1C] shrink-0 self-start sm:self-center"
          >
            Open Support Inbox
          </button>
        </div>
      )}

      {/* 1. Top Row: 4 Clickable KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Sales Pipeline Leads */}
        <div
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
          className="group bg-white p-4 rounded-md border border-[#DCE1E7] hover:border-[#0067FF] shadow-xs transition-all cursor-pointer"
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-bold text-[#64748B] uppercase tracking-wider">
              Active Sales Leads
            </span>
            <div className="p-1.5 rounded bg-[#F1F5F9] text-[#0067FF]">
              <Users className="h-4 w-4" />
            </div>
          </div>
          <div className="text-2xl font-bold text-[#1E293B]">{salesCount}</div>
          <div className="mt-2 pt-2 border-t border-[#EEF1F5] flex items-center justify-between text-xs text-[#0067FF] font-medium">
            <span className="text-[#64748B]">
              {stats.totalEnquiries} total records ({stats.repeatLeadsCount} repeat merged)
            </span>
            <span className="flex items-center shrink-0">
              Pipeline <ArrowUpRight className="h-3.5 w-3.5 ml-0.5" />
            </span>
          </div>
        </div>

        {/* Card 2: Follow-ups Due (>48h across New, Contacted, Interested + Scheduled) */}
        <div
          onClick={() =>
            onDrillDown({
              tab: 'pipeline',
              urgency: 'overdue',
              interest: 'all',
              channel: 'All Channels',
              stage: 'all',
              owner: 'all'
            })
          }
          className="group bg-white p-4 rounded-md border border-[#DCE1E7] border-l-4 border-l-[#DC2626] hover:border-[#DC2626] shadow-xs transition-all cursor-pointer"
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-bold text-[#DC2626] uppercase tracking-wider">
              Follow-ups Due (&gt;48h / Scheduled)
            </span>
            <div className="p-1.5 rounded bg-[#FEF2F2] text-[#DC2626]">
              <Clock className="h-4 w-4" />
            </div>
          </div>
          <div className="text-2xl font-bold text-[#DC2626]">
            {stats.overdueCount}
          </div>
          <div className="mt-2 pt-2 border-t border-[#EEF1F5] flex items-center justify-between text-xs text-[#DC2626] font-medium">
            <span className="text-[#64748B]">
              Across New, Contacted &amp; Interested
            </span>
            <span className="flex items-center shrink-0">
              Filter <ArrowUpRight className="h-3.5 w-3.5 ml-0.5" />
            </span>
          </div>
        </div>

        {/* Card 3: Corporate Training B2B */}
        <div
          onClick={() =>
            onDrillDown({
              tab: 'pipeline',
              interest: 'Corporate Training',
              urgency: 'all',
              channel: 'All Channels',
              stage: 'all',
              owner: 'all'
            })
          }
          className="group bg-white p-4 rounded-md border border-[#DCE1E7] border-l-4 border-l-[#059669] hover:border-[#059669] shadow-xs transition-all cursor-pointer"
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-bold text-[#059669] uppercase tracking-wider">
              Corporate B2B Enquiries
            </span>
            <div className="p-1.5 rounded bg-[#ECFDF5] text-[#059669]">
              <Briefcase className="h-4 w-4" />
            </div>
          </div>
          <div className="text-2xl font-bold text-[#1E293B]">
            {stats.corporateCount}{' '}
            <span className="text-xs font-normal text-[#64748B]">
              ({stats.totalCorporateSeats} employees)
            </span>
          </div>
          <div className="mt-2 pt-2 border-t border-[#EEF1F5] flex items-center justify-between text-xs text-[#059669] font-medium">
            <span className="text-[#64748B]">
              Textile, Bank &amp; Garment teams
            </span>
            <span className="flex items-center shrink-0">
              View B2B <ArrowUpRight className="h-3.5 w-3.5 ml-0.5" />
            </span>
          </div>
        </div>

        {/* Card 4: Non-Sales Triage (Support, Job Seekers, Spam) */}
        <div
          onClick={onGoToSupport}
          className="group bg-white p-4 rounded-md border border-[#DCE1E7] border-l-4 border-l-[#D97706] hover:border-[#D97706] shadow-xs transition-all cursor-pointer"
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-bold text-[#D97706] uppercase tracking-wider">
              Support, HR &amp; Spam Triage
            </span>
            <div className="p-1.5 rounded bg-[#FFFBEB] text-[#D97706]">
              <AlertTriangle className="h-4 w-4" />
            </div>
          </div>
          <div className="text-2xl font-bold text-[#1E293B]">
            {stats.openSupportCount}{' '}
            <span className="text-xs font-normal text-[#64748B]">
              open support ({stats.spamCount} spam, {stats.jobSeekerCount} job)
            </span>
          </div>
          <div className="mt-2 pt-2 border-t border-[#EEF1F5] flex items-center justify-between text-xs text-[#D97706] font-medium">
            <span className="text-[#64748B]">Kept separate from sales funnel</span>
            <span className="flex items-center shrink-0">
              Triage Inbox <ArrowUpRight className="h-3.5 w-3.5 ml-0.5" />
            </span>
          </div>
        </div>
      </div>

      {/* 2. Middle Row: 3 Interactive Breakdown Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Chart 1: Sales Pipeline Stages */}
        <div className="bg-white p-5 rounded-md border border-[#DCE1E7] shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-3 mb-4 border-b border-[#EEF1F5]">
              <div>
                <h2 className="text-sm font-bold text-[#1E293B]">
                  Sales Pipeline by Stage
                </h2>
                <p className="text-xs text-[#64748B]">
                  Click any stage to filter the Kanban board
                </p>
              </div>
              <span className="text-[11px] font-semibold text-[#0067FF] bg-[#EBF2FF] px-2 py-0.5 rounded">
                {salesCount} Sales Leads
              </span>
            </div>

            <div className="space-y-3">
              {stagesData.map((st) => (
                <button
                  key={st.id}
                  onClick={() =>
                    onDrillDown({
                      tab: 'pipeline',
                      stage: st.id,
                      interest: 'all',
                      channel: 'All Channels',
                      urgency: 'all',
                      owner: 'all'
                    })
                  }
                  className="w-full text-left group p-1.5 -mx-1.5 rounded hover:bg-[#F8FAFC] transition-colors"
                >
                  <div className="flex items-center justify-between text-xs mb-1">
                    <span className="font-semibold text-[#334155] group-hover:text-[#0067FF] flex items-center">
                      {st.label}
                    </span>
                    <span className="text-[#64748B] font-mono">
                      <strong className="text-[#1E293B]">{st.count}</strong> ({st.pct}%)
                    </span>
                  </div>
                  <div className="w-full h-2 bg-[#F1F5F9] rounded-sm overflow-hidden">
                    <div
                      className={`h-full ${st.color} rounded-sm transition-all duration-300`}
                      style={{ width: `${Math.max(st.pct, st.count > 0 ? 6 : 0)}%` }}
                    />
                  </div>
                </button>
              ))}
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-[#EEF1F5] flex items-center justify-between text-xs text-[#64748B]">
            <span>Unassigned sales leads: <strong className="text-[#1E293B]">{stats.unassignedSalesCount}</strong></span>
            <span> Missing phone: <strong className="text-[#D97706]">{stats.missingPhoneCount}</strong></span>
          </div>
        </div>

        {/* Chart 2: Source Channel Breakdown */}
        <div className="bg-white p-5 rounded-md border border-[#DCE1E7] shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-3 mb-4 border-b border-[#EEF1F5]">
              <div>
                <h2 className="text-sm font-bold text-[#1E293B]">
                  Enquiries by Source Channel
                </h2>
                <p className="text-xs text-[#64748B]">
                  Click a channel to inspect its enquiries
                </p>
              </div>
            </div>

            <div className="space-y-3">
              {channelsData.map((ch) => {
                const Icon = ch.icon;
                return (
                  <button
                    key={ch.id}
                    onClick={() =>
                      onDrillDown({
                        tab: 'enquiries',
                        channel: ch.id,
                        interest: 'all',
                        urgency: 'all',
                        stage: 'all',
                        owner: 'all'
                      })
                    }
                    className="w-full text-left group p-1.5 -mx-1.5 rounded hover:bg-[#F8FAFC] transition-colors"
                  >
                    <div className="flex items-center justify-between text-xs mb-1">
                      <span className="font-semibold text-[#334155] group-hover:text-[#0067FF] flex items-center space-x-2">
                        <Icon className={`h-3.5 w-3.5 ${ch.iconColor}`} />
                        <span>{ch.label}</span>
                      </span>
                      <span className="text-[#64748B] font-mono">
                        <strong className="text-[#1E293B]">{ch.count}</strong> ({ch.pct}%)
                      </span>
                    </div>
                    <div className="w-full h-2 bg-[#F1F5F9] rounded-sm overflow-hidden">
                      <div
                        className={`h-full ${ch.color} rounded-sm transition-all duration-300`}
                        style={{ width: `${Math.max(ch.pct, ch.count > 0 ? 6 : 0)}%` }}
                      />
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-[#EEF1F5] flex items-center justify-between text-xs text-[#64748B]">
            <span>Languages:</span>
            <span className="font-mono text-[#1E293B]">
              Banglish {stats.byLanguage.Banglish} • Bangla {stats.byLanguage.Bangla} • EN {stats.byLanguage.English}
            </span>
          </div>
        </div>

        {/* Chart 3: Program Interest & Non-Sales Separation */}
        <div className="bg-white p-5 rounded-md border border-[#DCE1E7] shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-3 mb-4 border-b border-[#EEF1F5]">
              <div>
                <h2 className="text-sm font-bold text-[#1E293B]">
                  What People Want (Programs)
                </h2>
                <p className="text-xs text-[#64748B]">
                  Bootcamp, Fellowship &amp; Corporate Training
                </p>
              </div>
            </div>

            <div className="space-y-3">
              {interestData.map((item) => {
                const pct =
                  salesCount > 0 ? Math.round((item.count / salesCount) * 100) : 0;
                return (
                  <button
                    key={item.id}
                    onClick={() =>
                      onDrillDown({
                        tab: 'pipeline',
                        interest: item.id,
                        channel: 'All Channels',
                        urgency: 'all',
                        stage: 'all',
                        owner: 'all'
                      })
                    }
                    className="w-full text-left group p-1.5 -mx-1.5 rounded hover:bg-[#F8FAFC] transition-colors"
                  >
                    <div className="flex items-center justify-between text-xs mb-1">
                      <span className="font-semibold text-[#334155] group-hover:text-[#0067FF]">
                        {item.label}
                      </span>
                      <span className="text-[#64748B] font-mono">
                        <strong className="text-[#1E293B]">{item.count}</strong> ({pct}%)
                      </span>
                    </div>
                    <div className="w-full h-2 bg-[#F1F5F9] rounded-sm overflow-hidden">
                      <div
                        className={`h-full ${item.color} rounded-sm transition-all duration-300`}
                        style={{ width: `${Math.max(pct, item.count > 0 ? 6 : 0)}%` }}
                      />
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-[#EEF1F5] flex items-center justify-between gap-2">
            <button
              onClick={onGoToMagicPaste}
              className="flex-1 py-1.5 px-3 rounded text-xs font-semibold bg-[#0067FF] text-white hover:bg-[#0055D4] flex items-center justify-center space-x-1.5"
            >
              <Plus className="h-3.5 w-3.5" />
              <span>Paste New Enquiry</span>
            </button>
            <button
              onClick={onOpenBulkImport}
              className="py-1.5 px-3 rounded text-xs font-semibold bg-white text-[#334155] border border-[#CBD5E1] hover:bg-[#F8FAFC] flex items-center space-x-1.5"
            >
              <Upload className="h-3.5 w-3.5" />
              <span>Import CSV</span>
            </button>
          </div>
        </div>
      </div>

      {/* 3. Follow-ups Due & Priority Chase Queue */}
      <div className="bg-white rounded-md border border-[#DCE1E7] shadow-xs overflow-hidden">
        <div className="p-4 border-b border-[#DCE1E7] flex flex-col sm:flex-row sm:items-center justify-between gap-2 bg-[#F8FAFC]">
          <div>
            <h2 className="text-sm font-bold text-[#1E293B]">
              Priority Follow-up Queue (Chase First &amp; 48h+ Overdue)
            </h2>
            <p className="text-xs text-[#64748B]">
              Ranked by corporate team size, repeat contact, scheduled callback time, and 48-hour inactivity
            </p>
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
            className="text-xs font-semibold text-[#0067FF] hover:underline self-start sm:self-center"
          >
            Open Full Kanban Board →
          </button>
        </div>

        <div className="divide-y divide-[#EEF1F5]">
          {stats.chaseFirst.length === 0 ? (
            <div className="p-8 text-center text-xs text-[#64748B]">
              All open sales leads are up to date!
            </div>
          ) : (
            stats.chaseFirst.map((lead) => {
              const isGenerating = generatingLeadId === lead.id;
              const sendAction = getPrimarySendAction(lead, lead.suggestedReply);
              const followStatus = getFollowUpStatus(lead, nowMs);

              return (
                <div
                  key={lead.id}
                  onClick={() => onSelectLead(lead)}
                  className="p-3.5 sm:px-5 hover:bg-[#F8FAFC] transition-colors flex flex-col lg:flex-row lg:items-center justify-between gap-3 cursor-pointer"
                >
                  <div className="space-y-1 max-w-2xl">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-bold text-xs text-[#1E293B]">
                        {lead.senderName}
                      </span>
                      <span className="px-2 py-0.5 text-[10px] font-semibold rounded bg-[#F1F5F9] text-[#334155] border border-[#E2E8F0]">
                        {lead.channel}
                      </span>
                      <span className="px-2 py-0.5 text-[10px] font-semibold rounded bg-[#EBF2FF] text-[#0067FF]">
                        {lead.interest}
                      </span>
                      <span className="px-2 py-0.5 text-[10px] font-semibold rounded bg-[#F8FAFC] text-[#475569] border border-[#CBD5E1]">
                        Stage: {lead.status}
                      </span>
                      {(lead.repeatCount || 1) > 1 && (
                        <span className="px-2 py-0.5 text-[10px] font-bold rounded bg-[#FEF3C7] text-[#B45309] border border-[#FDE68A]">
                          Repeat ({lead.repeatCount} messages)
                        </span>
                      )}
                      {followStatus.isOverdue && (
                        <span className="px-2 py-0.5 text-[10px] font-bold rounded bg-[#FEF2F2] text-[#DC2626] border border-[#FECACA]">
                          ⏰ {followStatus.reason}
                        </span>
                      )}
                      <span className="text-[11px] text-[#64748B] font-mono">
                        {lead.phone || 'No phone yet'}
                      </span>
                    </div>

                    <p className="text-xs text-[#334155] font-medium">
                      {lead.aiSummary || lead.message}
                    </p>
                    <p className="text-[11px] text-[#64748B] line-clamp-1">
                      Raw message ({lead.language}): &ldquo;{lead.message}&rdquo;
                    </p>
                  </div>

                  <div
                    className="flex flex-wrap items-center gap-2 shrink-0"
                    onClick={(e) => e.stopPropagation()}
                  >
                    {onSnoozeFollowUp && followStatus.isOverdue && (
                      <button
                        onClick={() => onSnoozeFollowUp(lead.id, 24)}
                        className="inline-flex items-center space-x-1 px-2.5 py-1.5 rounded text-xs font-medium text-[#475569] bg-white hover:bg-[#F1F5F9] border border-[#CBD5E1]"
                        title="Snooze reminder for 24 hours"
                      >
                        <CalendarClock className="h-3.5 w-3.5" />
                        <span>+1d</span>
                      </button>
                    )}

                    <button
                      onClick={() => onGenerateReply(lead)}
                      disabled={isGenerating}
                      className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded text-xs font-semibold text-[#0067FF] bg-[#EBF2FF] hover:bg-[#DBEAFE] border border-[#BBD6FF] transition-colors disabled:opacity-50"
                    >
                      {isGenerating ? (
                        <>
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          <span>Drafting...</span>
                        </>
                      ) : (
                        <>
                          <Bot className="h-3.5 w-3.5" />
                          <span>
                            {lead.aiSource === 'ai' ? 'Regenerate AI' : 'Analyze via AI'}
                          </span>
                        </>
                      )}
                    </button>

                    {lead.suggestedReply && (
                      <button
                        onClick={() => onSendReply(lead, lead.suggestedReply)}
                        className={`inline-flex items-center space-x-1.5 px-3 py-1.5 rounded text-xs font-semibold transition-colors ${sendAction.colorClass}`}
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
      </div>
    </div>
  );
}
