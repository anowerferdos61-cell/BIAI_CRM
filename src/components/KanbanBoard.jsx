import React, { useState } from 'react';
import {
  MessageSquare,
  Phone,
  Clock,
  ChevronRight,
  ChevronLeft,
  Globe,
  PhoneCall,
  Copy,
  Check,
  Loader2,
  Send,
  Bot,
  UserCheck
} from 'lucide-react';
import { FacebookIcon } from './Icons';
import { getPrimarySendAction } from '../utils/sendDispatcher';
import { getFollowUpStatus } from '../lib/followUp.js';

const COLUMNS = [
  {
    id: 'New',
    title: 'New',
    subtitle: 'Uncontacted sales enquiries',
    headerBg: 'bg-[#EDE9FE] border-[#DDD6FE] text-[#4C1D95]',
    badgeBg: 'bg-white text-[#5B21B6]',
    activePillBg: 'bg-[#5B21B6] text-white border-[#5B21B6]'
  },
  {
    id: 'Contacted',
    title: 'Contacted',
    subtitle: 'First reply or call made',
    headerBg: 'bg-[#E0F2FE] border-[#BAE6FD] text-[#075985]',
    badgeBg: 'bg-white text-[#0369A1]',
    activePillBg: 'bg-[#0284C7] text-white border-[#0284C7]'
  },
  {
    id: 'Interested',
    title: 'Interested',
    subtitle: 'Discussing schedule, quote or payment',
    headerBg: 'bg-[#FEF3C7] border-[#FDE68A] text-[#92400E]',
    badgeBg: 'bg-white text-[#B45309]',
    activePillBg: 'bg-[#D97706] text-white border-[#D97706]'
  },
  {
    id: 'Paid',
    title: 'Paid',
    subtitle: 'Enrolled & payment confirmed',
    headerBg: 'bg-[#D1FAE5] border-[#A7F3D0] text-[#065F46]',
    badgeBg: 'bg-white text-[#047857]',
    activePillBg: 'bg-[#059669] text-white border-[#059669]'
  },
  {
    id: 'Lost',
    title: 'Lost',
    subtitle: 'Sales lead declined or unresponsive',
    headerBg: 'bg-[#E2E8F0] border-[#CBD5E1] text-[#334155]',
    badgeBg: 'bg-white text-[#475569]',
    activePillBg: 'bg-[#475569] text-white border-[#475569]'
  }
];

export function KanbanBoard({
  leads = [],
  nowMs,
  onUpdateStatus,
  onSelectLead,
  onGenerateReply,
  onSendReply,
  generatingLeadId,
  selectedStage = 'all',
  setSelectedStage
}) {
  const [draggedLeadId, setDraggedLeadId] = useState(null);
  const [copiedId, setCopiedId] = useState(null);
  const [mobileActiveStage, setMobileActiveStage] = useState('New');

  const getChannelIcon = (channel) => {
    switch (channel) {
      case 'WhatsApp':
        return (
          <span className="inline-flex items-center text-[#059669] font-medium">
            <MessageSquare className="h-3 w-3 mr-1" /> WhatsApp
          </span>
        );
      case 'Facebook Messenger':
        return (
          <span className="inline-flex items-center text-[#0067FF] font-medium">
            <FacebookIcon className="h-3 w-3 mr-1" /> Messenger
          </span>
        );
      case 'Facebook comment':
        return (
          <span className="inline-flex items-center text-[#0284C7] font-medium">
            <FacebookIcon className="h-3 w-3 mr-1" /> FB Comment
          </span>
        );
      case 'Website form':
        return (
          <span className="inline-flex items-center text-[#475569] font-medium">
            <Globe className="h-3 w-3 mr-1" /> Website
          </span>
        );
      case 'Phone call note':
        return (
          <span className="inline-flex items-center text-[#D97706] font-medium">
            <PhoneCall className="h-3 w-3 mr-1" /> Phone Call
          </span>
        );
      default:
        return <span className="inline-flex items-center text-[#64748B]">{channel}</span>;
    }
  };

  const getInterestBadge = (interest, teamSize) => {
    switch (interest) {
      case 'Corporate Training':
        return (
          <span className="px-2 py-0.5 text-[10px] font-semibold rounded bg-[#ECFDF5] text-[#047857] border border-[#A7F3D0]">
            Corporate{teamSize ? ` (${teamSize} staff)` : ' Training'}
          </span>
        );
      case 'Fellowship':
        return (
          <span className="px-2 py-0.5 text-[10px] font-semibold rounded bg-[#E0F2FE] text-[#0369A1] border border-[#BAE6FD]">
            Fellowship
          </span>
        );
      case 'Bootcamp':
        return (
          <span className="px-2 py-0.5 text-[10px] font-semibold rounded bg-[#EEF2FF] text-[#1D4ED8] border border-[#C7D2FE]">
            Bootcamp
          </span>
        );
      default:
        return (
          <span className="px-2 py-0.5 text-[10px] font-semibold rounded bg-[#F1F5F9] text-[#475569] border border-[#CBD5E1]">
            Program TBC
          </span>
        );
    }
  };

  const handleDragStart = (e, id) => {
    setDraggedLeadId(id);
    e.dataTransfer.setData('text/plain', id);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDrop = (e, targetStatus) => {
    e.preventDefault();
    const id = e.dataTransfer.getData('text/plain') || draggedLeadId;
    if (id && targetStatus) {
      onUpdateStatus(id, targetStatus);
    }
    setDraggedLeadId(null);
  };

  const handleCopyReply = (e, replyText, id) => {
    e.stopPropagation();
    navigator.clipboard.writeText(replyText);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const moveLead = (e, lead, direction) => {
    e.stopPropagation();
    const currentIndex = COLUMNS.findIndex((c) => c.id === lead.status);
    if (currentIndex === -1) return;
    const nextIndex = currentIndex + direction;
    if (nextIndex >= 0 && nextIndex < COLUMNS.length) {
      const targetStage = COLUMNS[nextIndex].id;
      onUpdateStatus(lead.id, targetStage);
    }
  };

  const visibleColumns =
    selectedStage && selectedStage !== 'all'
      ? COLUMNS.filter((c) => c.id === selectedStage)
      : COLUMNS;

  const effectiveMobileStage =
    selectedStage && selectedStage !== 'all' ? selectedStage : mobileActiveStage;

  return (
    <div className="space-y-3 pb-8">
      {selectedStage && selectedStage !== 'all' && (
        <div className="bg-white border border-[#DCE1E7] rounded-md px-3 sm:px-4 py-2.5 flex items-center justify-between text-xs shadow-xs">
          <span className="font-medium text-[#1E293B]">
            Filtered by Pipeline Stage:{' '}
            <strong className="text-[#0067FF]">{selectedStage}</strong>
          </span>
          <button
            onClick={() => setSelectedStage && setSelectedStage('all')}
            className="px-3 py-1 rounded font-semibold bg-[#0067FF] text-white hover:bg-[#0055D4]"
          >
            Show All 5 Stages
          </button>
        </div>
      )}

      {/* MOBILE STAGE SWITCHER BAR (<768px) */}
      {(!selectedStage || selectedStage === 'all') && (
        <div className="md:hidden bg-white p-2 rounded-md border border-[#DCE1E7] shadow-xs">
          <div className="text-[10px] font-bold uppercase tracking-wider text-[#64748B] mb-1.5 px-1">
            Tap Stage to View Leads
          </div>
          <div className="grid grid-cols-5 gap-1">
            {COLUMNS.map((col) => {
              const count = leads.filter((l) => l.status === col.id).length;
              const isSelected = effectiveMobileStage === col.id;
              return (
                <button
                  key={col.id}
                  type="button"
                  onClick={() => setMobileActiveStage(col.id)}
                  className={`flex flex-col items-center justify-center py-1.5 px-1 rounded border text-center transition-all ${
                    isSelected
                      ? col.activePillBg
                      : 'bg-[#F8FAFC] text-[#475569] border-[#E2E8F0]'
                  }`}
                >
                  <span className="text-[10px] font-bold truncate w-full">
                    {col.title}
                  </span>
                  <span
                    className={`text-[11px] font-extrabold mt-0.5 ${
                      isSelected ? 'text-white' : 'text-[#1E293B]'
                    }`}
                  >
                    {count}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* KANBAN COLUMNS GRID */}
      <div
        className={`grid grid-cols-1 ${
          visibleColumns.length === 1
            ? 'md:grid-cols-1 max-w-3xl'
            : 'md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5'
        } gap-3 items-start`}
      >
        {visibleColumns.map((column) => {
          const columnLeads = leads.filter((lead) => lead.status === column.id);
          const overdueInCol = columnLeads.filter(
            (l) => getFollowUpStatus(l, nowMs).isOverdue
          ).length;
          const isHiddenOnMobile =
            (!selectedStage || selectedStage === 'all') &&
            column.id !== effectiveMobileStage;

          return (
            <div
              key={column.id}
              onDragOver={handleDragOver}
              onDrop={(e) => handleDrop(e, column.id)}
              className={`${
                isHiddenOnMobile ? 'hidden md:flex' : 'flex'
              } bg-[#EBEEF5] rounded-md border border-[#DCE1E7] p-2.5 flex-col min-h-[420px] md:min-h-[620px]`}
            >
              {/* Column Header */}
              <div className={`p-2.5 rounded border mb-2.5 ${column.headerBg}`}>
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-bold text-xs uppercase tracking-wider">
                      {column.title}
                    </h3>
                    <p className="text-[11px] opacity-80">{column.subtitle}</p>
                  </div>
                  <span
                    className={`px-2 py-0.5 text-xs font-bold rounded shadow-2xs ${column.badgeBg}`}
                  >
                    {columnLeads.length}
                  </span>
                </div>

                <div className="mt-1.5 pt-1.5 border-t border-black/10 flex items-center justify-between text-[11px] font-semibold">
                  <span>48h+ / Scheduled Due:</span>
                  <span>{overdueInCol}</span>
                </div>
              </div>

              {/* Cards Container */}
              <div className="flex-1 space-y-2 md:overflow-y-auto md:max-h-[750px] pr-0.5">
                {columnLeads.length === 0 ? (
                  <div className="h-28 border border-dashed border-[#CBD5E1] rounded bg-white/50 flex items-center justify-center text-xs text-[#64748B]">
                    No leads in {column.title}
                  </div>
                ) : (
                  columnLeads.map((lead) => {
                    const followStatus = getFollowUpStatus(lead, nowMs);
                    const isGenerating = generatingLeadId === lead.id;
                    const hasReply = Boolean(lead.suggestedReply);
                    const sendAction = getPrimarySendAction(lead, lead.suggestedReply);

                    return (
                      <div
                        key={lead.id}
                        draggable
                        onDragStart={(e) => handleDragStart(e, lead.id)}
                        onClick={() => onSelectLead(lead)}
                        className={`group relative bg-white rounded-md p-3 border transition-all cursor-grab active:cursor-grabbing hover:border-[#0067FF] shadow-2xs ${
                          followStatus.isOverdue
                            ? 'border-[#FCA5A5] border-l-4 border-l-[#DC2626]'
                            : 'border-[#DCE1E7]'
                        }`}
                      >
                        {/* 48h / Scheduled Overdue Ribbon */}
                        {followStatus.isOverdue && (
                          <div className="mb-2 px-2 py-0.5 rounded bg-[#FEF2F2] border border-[#FECACA] flex items-center justify-between text-[10px] font-semibold text-[#DC2626]">
                            <span className="flex items-center truncate">
                              <Clock className="h-3 w-3 mr-1 shrink-0" />
                              <span className="truncate">{followStatus.reason}</span>
                            </span>
                          </div>
                        )}

                        {/* Sender Name & Channel */}
                        <div className="flex items-start justify-between gap-1 mb-1">
                          <div className="font-semibold text-[13px] text-[#0067FF] group-hover:underline line-clamp-1">
                            {lead.senderName}
                          </div>
                          <div className="text-[10px] shrink-0">
                            {getChannelIcon(lead.channel)}
                          </div>
                        </div>

                        {/* Phone & Date */}
                        <div className="flex items-center justify-between text-[11px] text-[#64748B] mb-2 font-mono">
                          {lead.phone ? (
                            <span className="text-[#334155] flex items-center">
                              <Phone className="h-2.5 w-2.5 mr-1 text-[#64748B]" />
                              {lead.phone}
                            </span>
                          ) : (
                            <span className="italic text-[#D97706] font-sans text-[10px]">
                              No phone provided
                            </span>
                          )}
                          <span className="text-[10px]">
                            {(lead.receivedAt || '').split(' ')[0]}
                          </span>
                        </div>

                        {/* AI Summary Line */}
                        {lead.aiSummary && (
                          <div className="text-[11px] font-medium text-[#1E293B] mb-1.5 line-clamp-2">
                            {lead.aiSummary}
                          </div>
                        )}

                        {/* Customer Raw Message */}
                        <p className="text-xs text-[#475569] line-clamp-2 bg-[#F8FAFC] p-2 rounded border border-[#EEF1F5] mb-2">
                          &ldquo;{lead.message}&rdquo;
                        </p>

                        {/* Badges: Program Interest, Repeat Count, Owner & AI Source */}
                        <div className="flex flex-wrap items-center gap-1 mb-2">
                          {getInterestBadge(lead.interest, lead.teamSize)}

                          {(lead.repeatCount || 1) > 1 && (
                            <span
                              title="Multiple enquiries from same phone number merged automatically"
                              className="px-1.5 py-0.5 text-[10px] font-semibold rounded bg-[#FFFBEB] text-[#B45309] border border-[#FDE68A]"
                            >
                              Repeat ({lead.repeatCount}x)
                            </span>
                          )}

                          {lead.owner && lead.owner !== 'Unassigned' && (
                            <span className="px-1.5 py-0.5 text-[10px] font-medium rounded bg-[#F1F5F9] text-[#334155] inline-flex items-center gap-0.5">
                              <UserCheck className="h-2.5 w-2.5" />
                              {lead.owner.split(' ')[0]}
                            </span>
                          )}

                          <span
                            className={`px-1.5 py-0.5 text-[9px] font-semibold rounded ${
                              lead.aiSource === 'ai'
                                ? 'bg-[#ECFDF5] text-[#059669]'
                                : 'bg-[#F1F5F9] text-[#64748B]'
                            }`}
                          >
                            {lead.aiSource === 'ai' ? 'AI Verified' : 'Rules Baseline'}
                          </span>
                        </div>

                        {/* AI Reply Preview Box */}
                        {hasReply && (
                          <div
                            onClick={(e) => e.stopPropagation()}
                            className="mb-2 p-2 rounded bg-[#F8FAFC] border border-[#DCE1E7] text-[11px]"
                          >
                            <div className="flex items-center justify-between mb-1">
                              <span className="font-semibold text-[10px] text-[#0067FF]">
                                Reply ({lead.replyLanguage && lead.replyLanguage !== 'Auto' ? lead.replyLanguage : lead.language}):
                              </span>
                              <button
                                onClick={(e) =>
                                  handleCopyReply(e, lead.suggestedReply, lead.id)
                                }
                                className="text-[10px] text-[#64748B] hover:text-[#1E293B] flex items-center gap-0.5"
                              >
                                {copiedId === lead.id ? (
                                  <>
                                    <Check className="h-2.5 w-2.5 text-[#059669]" />
                                    <span>Copied</span>
                                  </>
                                ) : (
                                  <>
                                    <Copy className="h-2.5 w-2.5" />
                                    <span>Copy</span>
                                  </>
                                )}
                              </button>
                            </div>
                            <p
                              onClick={() => onSelectLead(lead)}
                              className="text-[#334155] line-clamp-2 cursor-pointer"
                            >
                              {lead.suggestedReply}
                            </p>
                          </div>
                        )}

                        {/* Card Footer: Send + AI Regenerate + Stage Arrows */}
                        <div className="pt-2 border-t border-[#EEF1F5] flex items-center justify-between gap-1.5 text-xs">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              if (onGenerateReply) onGenerateReply(lead);
                            }}
                            disabled={isGenerating}
                            title="Run server AI to analyze & draft reply"
                            className="px-2 py-1.5 rounded text-[11px] font-semibold text-[#0067FF] bg-[#F0F7FF] hover:bg-[#E0EFFE] border border-[#BFDBFE] disabled:opacity-50 transition-colors inline-flex items-center space-x-1"
                          >
                            {isGenerating ? (
                              <Loader2 className="h-3 w-3 animate-spin" />
                            ) : (
                              <Bot className="h-3 w-3" />
                            )}
                            <span>{lead.aiSource === 'ai' ? 'Re-draft' : 'AI Draft'}</span>
                          </button>

                          {hasReply && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                if (onSendReply) onSendReply(lead, lead.suggestedReply);
                              }}
                              title={`Open ${sendAction.appName} & mark Contacted`}
                              className={`flex-1 flex items-center justify-center space-x-1 px-2 py-1.5 rounded text-[11px] font-semibold shadow-2xs transition-colors ${sendAction.colorClass}`}
                            >
                              <Send className="h-3 w-3" />
                              <span className="truncate">{sendAction.shortLabel}</span>
                            </button>
                          )}

                          <div className="flex items-center space-x-1 shrink-0">
                            {column.id !== 'New' && (
                              <button
                                onClick={(e) => moveLead(e, lead, -1)}
                                title="Move to previous stage"
                                className="p-1 rounded bg-[#F8FAFC] hover:bg-[#F1F5F9] border border-[#DCE1E7] text-[#475569]"
                              >
                                <ChevronLeft className="h-3.5 w-3.5" />
                              </button>
                            )}
                            {column.id !== 'Lost' && (
                              <button
                                onClick={(e) => moveLead(e, lead, 1)}
                                title="Move to next stage"
                                className="p-1 rounded bg-[#F8FAFC] hover:bg-[#F1F5F9] border border-[#DCE1E7] text-[#475569]"
                              >
                                <ChevronRight className="h-3.5 w-3.5" />
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
