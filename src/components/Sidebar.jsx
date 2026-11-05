import React from 'react';
import {
  LayoutDashboard,
  Kanban,
  Table,
  LifeBuoy,
  FilePlus2,
  FileText,
  Settings,
  PanelLeftClose,
  PanelLeftOpen,
  Clock,
  Briefcase,
  AlertTriangle,
  Layers,
  X
} from 'lucide-react';
import { needsFollowUp } from '../lib/followUp.js';

export function Sidebar({
  activeTab,
  setActiveTab,
  isCollapsed,
  setIsCollapsed,
  isMobileOpen = false,
  setIsMobileOpen,
  leads = [],
  nowMs,
  onDrillDown
}) {
  const salesLeads = leads.filter((l) => (l.leadType || 'Sales') === 'Sales');
  const nonSalesLeads = leads.filter((l) => (l.leadType || 'Sales') !== 'Sales');
  const openSupportCount = leads.filter(
    (l) => l.leadType === 'Support' && !l.isResolved
  ).length;
  const overdueCount = salesLeads.filter((l) => needsFollowUp(l, nowMs)).length;
  const corporateCount = salesLeads.filter(
    (l) => l.interest === 'Corporate Training'
  ).length;

  const navItems = [
    {
      id: 'overview',
      label: 'Dashboard Overview',
      shortLabel: 'Overview',
      icon: LayoutDashboard,
      badge: null,
      description: 'Pipeline metrics & follow-ups due'
    },
    {
      id: 'pipeline',
      label: 'Sales Pipeline',
      shortLabel: 'Pipeline',
      icon: Kanban,
      badge: salesLeads.length,
      description: 'New → Contacted → Interested → Paid / Lost'
    },
    {
      id: 'enquiries',
      label: 'All Enquiries Table',
      shortLabel: 'Table',
      icon: Table,
      badge: leads.length,
      description: 'Spreadsheet view, bulk AI & CSV export'
    },
    {
      id: 'support',
      label: 'Support & Other Inbox',
      shortLabel: 'Support',
      icon: LifeBuoy,
      badge: openSupportCount > 0 ? `${openSupportCount} open` : nonSalesLeads.length,
      badgeAlert: openSupportCount > 0,
      description: 'Support, refunds, job seekers & spam filter'
    },
    {
      id: 'magic-paste',
      label: 'Paste & Analyze Lead',
      shortLabel: 'Paste',
      icon: FilePlus2,
      badge: null,
      description: 'AI field extraction & dialect-matched reply'
    },
    {
      id: 'weekly-summary',
      label: 'Weekly AI Summary',
      shortLabel: 'Summary',
      icon: FileText,
      badge: null,
      description: 'Chase-first list, escalations & FAQ gaps'
    },
    {
      id: 'database',
      label: 'Knowledge Base & Settings',
      shortLabel: 'Settings',
      icon: Settings,
      badge: null,
      description: 'Prices, policies, team roster & AI status'
    }
  ];

  const quickViews = [
    {
      label: 'Follow-ups Due (>48h)',
      count: overdueCount,
      icon: Clock,
      dotColor: 'bg-[#EF4444]',
      onClick: () => {
        onDrillDown({
          tab: 'pipeline',
          urgency: 'overdue',
          interest: 'all',
          channel: 'All Channels',
          stage: 'all',
          owner: 'all'
        });
        if (setIsMobileOpen) setIsMobileOpen(false);
      }
    },
    {
      label: 'Corporate Training Leads',
      count: corporateCount,
      icon: Briefcase,
      dotColor: 'bg-[#10B981]',
      onClick: () => {
        onDrillDown({
          tab: 'pipeline',
          interest: 'Corporate Training',
          urgency: 'all',
          channel: 'All Channels',
          stage: 'all',
          owner: 'all'
        });
        if (setIsMobileOpen) setIsMobileOpen(false);
      }
    },
    {
      label: 'Open Support & Escalations',
      count: openSupportCount,
      icon: AlertTriangle,
      dotColor: 'bg-[#F59E0B]',
      onClick: () => {
        setActiveTab('support');
        if (setIsMobileOpen) setIsMobileOpen(false);
      }
    }
  ];

  const handleSelectTab = (tabId) => {
    setActiveTab(tabId);
    if (setIsMobileOpen) setIsMobileOpen(false);
  };

  return (
    <>
      {isMobileOpen && (
        <div
          onClick={() => setIsMobileOpen && setIsMobileOpen(false)}
          className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-[1px] lg:hidden"
        />
      )}

      <aside
        className={`fixed inset-y-0 left-0 z-50 lg:static lg:z-40 ${
          isMobileOpen ? 'translate-x-0 w-64' : '-translate-x-full lg:translate-x-0'
        } ${
          isCollapsed ? 'lg:w-14' : 'lg:w-60'
        } bg-[#17223B] text-[#A3B1CC] border-r border-[#243252] flex flex-col h-full transition-all duration-200 select-none shrink-0`}
      >
        <div className="h-12 px-3 border-b border-[#243252] flex items-center justify-between bg-[#121B30]">
          <div
            onClick={() => handleSelectTab('overview')}
            className="flex items-center space-x-2.5 cursor-pointer overflow-hidden"
          >
            <div className="h-7 w-7 rounded bg-[#0067FF] flex items-center justify-center text-white font-bold text-xs shrink-0">
              <Layers className="h-4 w-4" />
            </div>
            {(!isCollapsed || isMobileOpen) && (
              <div className="truncate flex items-baseline space-x-1.5">
                <span className="font-bold text-sm text-white tracking-tight">
                  BIAI CRM
                </span>
                <span className="text-[10px] text-[#7A8BA8] font-medium">
                  Admissions
                </span>
              </div>
            )}
          </div>

          <button
            onClick={() => setIsMobileOpen && setIsMobileOpen(false)}
            className="p-1 rounded text-[#A3B1CC] hover:text-white hover:bg-[#243252] lg:hidden"
            aria-label="Close Menu"
          >
            <X className="h-4 w-4" />
          </button>

          <button
            onClick={() => setIsCollapsed(!isCollapsed)}
            title={isCollapsed ? 'Expand Sidebar' : 'Collapse Sidebar'}
            className="hidden lg:inline-flex p-1 rounded text-[#A3B1CC] hover:text-white hover:bg-[#243252] transition-colors shrink-0"
          >
            {isCollapsed ? (
              <PanelLeftOpen className="h-4 w-4" />
            ) : (
              <PanelLeftClose className="h-4 w-4" />
            )}
          </button>
        </div>

        <div className="flex-1 overflow-y-auto py-3 px-2 space-y-5 scrollbar-thin">
          <nav className="space-y-0.5">
            {(!isCollapsed || isMobileOpen) && (
              <div className="px-2.5 pb-1.5 text-[10px] font-semibold uppercase tracking-wider text-[#6E809E]">
                Workspace
              </div>
            )}
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              const showFull = !isCollapsed || isMobileOpen;
              return (
                <button
                  key={item.id}
                  onClick={() => handleSelectTab(item.id)}
                  title={!showFull ? item.label : item.description}
                  className={`w-full flex items-center ${
                    !showFull ? 'justify-center px-2 py-2.5' : 'justify-between px-2.5 py-2.5 lg:py-2'
                  } rounded text-[13px] font-medium transition-colors relative ${
                    isActive
                      ? 'bg-[#1E62D0] text-white font-semibold'
                      : 'text-[#B8C4DB] hover:text-white hover:bg-[#213050]'
                  }`}
                >
                  <div className="flex items-center space-x-2.5 min-w-0">
                    <Icon
                      className={`h-4 w-4 shrink-0 ${
                        isActive ? 'text-white' : 'text-[#8C9EBC]'
                      }`}
                    />
                    {showFull && <span className="truncate">{item.label}</span>}
                  </div>

                  {showFull && item.badge !== null && (
                    <span
                      className={`px-1.5 py-0.2 text-[11px] font-semibold rounded ${
                        item.badgeAlert
                          ? 'bg-[#DC2626] text-white'
                          : isActive
                            ? 'bg-[#154BA3] text-white'
                            : 'bg-[#223152] text-[#A3B1CC]'
                      }`}
                    >
                      {item.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </nav>

          {(!isCollapsed || isMobileOpen) && (
            <div className="pt-3 border-t border-[#243252]">
              <div className="px-2.5 pb-1.5 text-[10px] font-semibold uppercase tracking-wider text-[#6E809E]">
                Quick Filters
              </div>
              <div className="space-y-0.5">
                {quickViews.map((qv, idx) => (
                  <button
                    key={idx}
                    onClick={qv.onClick}
                    className="w-full flex items-center justify-between px-2.5 py-2 lg:py-1.5 rounded text-[12px] text-[#B8C4DB] hover:text-white hover:bg-[#213050] transition-colors text-left"
                  >
                    <span className="flex items-center space-x-2 truncate">
                      <span className={`h-2 w-2 rounded-full shrink-0 ${qv.dotColor}`} />
                      <span className="truncate">{qv.label}</span>
                    </span>
                    <span className="text-[11px] font-mono text-[#8C9EBC]">
                      {qv.count}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="p-2.5 border-t border-[#243252] bg-[#121B30]">
          {isCollapsed && !isMobileOpen ? (
            <div
              onClick={() => handleSelectTab('database')}
              title="Knowledge Base & Settings"
              className="flex items-center justify-center py-1 cursor-pointer"
            >
              <span className="h-2 w-2 rounded-full bg-[#10B981]" />
            </div>
          ) : (
            <div
              onClick={() => handleSelectTab('database')}
              className="px-2 py-1.5 rounded hover:bg-[#1E2B48] cursor-pointer transition-colors flex items-center justify-between"
            >
              <div className="flex items-center space-x-2 truncate">
                <span className="h-2 w-2 rounded-full bg-[#10B981] shrink-0" />
                <span className="text-[11px] font-medium text-[#D0D9EB] truncate">
                  BIAI Admissions Team
                </span>
              </div>
              <span className="text-[10px] text-[#7A8BA8]">Server AI</span>
            </div>
          )}
        </div>
      </aside>

      <nav className="fixed bottom-0 inset-x-0 z-40 bg-white border-t border-[#DCE1E7] flex items-center justify-around h-14 px-1 lg:hidden shadow-[0_-2px_10px_rgba(0,0,0,0.04)]">
        {navItems.slice(0, 6).map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => handleSelectTab(item.id)}
              className={`flex-1 flex flex-col items-center justify-center py-1 rounded transition-colors relative ${
                isActive ? 'text-[#0067FF] font-semibold' : 'text-[#64748B] hover:text-[#1E293B]'
              }`}
            >
              <div className="relative">
                <Icon className="h-4 w-4" />
                {item.id === 'support' && openSupportCount > 0 && (
                  <span className="absolute -top-1.5 -right-2.5 px-1 min-w-[14px] h-[14px] rounded-full bg-[#DC2626] text-white text-[9px] font-bold flex items-center justify-center">
                    {openSupportCount}
                  </span>
                )}
              </div>
              <span className="text-[10px] mt-0.5 truncate max-w-[64px]">
                {item.shortLabel}
              </span>
            </button>
          );
        })}
      </nav>
    </>
  );
}
