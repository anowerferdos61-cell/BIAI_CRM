import React, { useState } from 'react';
import {
  Search,
  Clock,
  X,
  Upload,
  Plus,
  Filter,
  Menu,
  Loader2
} from 'lucide-react';

const TAB_TITLES = {
  overview: {
    title: 'Home Dashboard'
  },
  pipeline: {
    title: 'Sales Pipeline (New → Contacted → Interested → Paid / Lost)'
  },
  enquiries: {
    title: 'All Enquiries & Bulk Operations'
  },
  support: {
    title: 'Support, Job Seekers & Spam Inbox'
  },
  'magic-paste': {
    title: 'Paste & Analyze Enquiry'
  },
  'weekly-summary': {
    title: 'Weekly AI Pipeline Report'
  },
  database: {
    title: 'Knowledge Base, Team & System Settings'
  }
};

export function Header({
  activeTab,
  setActiveTab,
  searchQuery,
  setSearchQuery,
  overdueCount = 0,
  syncStatus = 'synced',
  batchProgress = null,
  activeFilterLabel,
  onClearAllFilters,
  onClickOverdue,
  onOpenBulkImport,
  onOpenMobileMenu
}) {
  const [mobileSearchOpen, setMobileSearchOpen] = useState(false);
  const meta = TAB_TITLES[activeTab] || TAB_TITLES.overview;

  const getSyncBadge = () => {
    switch (syncStatus) {
      case 'synced':
        return (
          <span
            title="Connected and synchronized in realtime with Supabase cloud database"
            className="hidden md:inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded text-[11px] font-semibold bg-[#ECFDF5] text-[#059669] border border-[#A7F3D0]"
          >
            <span className="h-2 w-2 rounded-full bg-[#10B981] animate-pulse" />
            <span>Cloud Synced</span>
          </span>
        );
      case 'connecting':
        return (
          <span
            title="Connecting to Supabase database..."
            className="hidden md:inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded text-[11px] font-semibold bg-[#FFFBEB] text-[#B45309] border border-[#FDE68A]"
          >
            <span className="h-2 w-2 rounded-full bg-[#F59E0B] animate-ping" />
            <span>Syncing Cloud...</span>
          </span>
        );
      case 'offline':
        return (
          <span
            title="Supabase unreachable or offline. Using local cached storage."
            className="hidden md:inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded text-[11px] font-semibold bg-[#FEF2F2] text-[#DC2626] border border-[#FECACA]"
          >
            <span className="h-2 w-2 rounded-full bg-[#EF4444]" />
            <span>Local Offline Cache</span>
          </span>
        );
      default:
        return (
          <span
            title="Local browser storage mode"
            className="hidden md:inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded text-[11px] font-semibold bg-[#F1F5F9] text-[#64748B] border border-[#DCE1E7]"
          >
            <span className="h-2 w-2 rounded-full bg-[#94A3B8]" />
            <span>Local Storage</span>
          </span>
        );
    }
  };

  return (
    <header className="bg-white border-b border-[#DCE1E7] sticky top-0 z-30">
      <div className="px-3 sm:px-6 h-12 flex items-center justify-between gap-2 sm:gap-4">
        <div className="flex items-center space-x-2 sm:space-x-3 min-w-0">
          <button
            type="button"
            onClick={onOpenMobileMenu}
            className="p-1.5 -ml-1 rounded text-[#334155] hover:bg-[#F1F5F9] lg:hidden shrink-0"
            aria-label="Open Navigation Menu"
          >
            <Menu className="h-5 w-5" />
          </button>

          <h1 className="text-sm sm:text-[15px] font-bold text-[#1E293B] truncate">
            {meta.title}
          </h1>

          {getSyncBadge()}

          {activeFilterLabel && (
            <span className="hidden sm:inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded text-xs font-medium bg-[#EBF2FF] text-[#0067FF] border border-[#BBD6FF] truncate max-w-[260px]">
              <Filter className="h-3 w-3 shrink-0" />
              <span className="truncate">{activeFilterLabel}</span>
              <button
                onClick={onClearAllFilters}
                className="ml-0.5 hover:text-[#DC2626] shrink-0"
                title="Clear filter"
              >
                <X className="h-3 w-3" />
              </button>
            </span>
          )}
        </div>

        <div className="flex items-center space-x-1.5 sm:space-x-2.5 shrink-0">
          {/* Live AI Batch Queue Progress Pill */}
          {batchProgress && (
            <div className="inline-flex items-center space-x-1.5 px-2.5 py-1 rounded text-xs font-semibold bg-[#EBF2FF] text-[#0067FF] border border-[#BBD6FF]">
              <Loader2 className="h-3.5 w-3.5 animate-spin shrink-0" />
              <span>
                AI: {batchProgress.completed}/{batchProgress.total}
              </span>
            </div>
          )}

          {/* Desktop / Tablet Search Input */}
          <div className="hidden sm:block relative w-48 md:w-64">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-[#64748B]" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                if (activeTab === 'overview' && e.target.value.trim()) {
                  setActiveTab('pipeline');
                }
              }}
              placeholder="Search name, phone, message..."
              className="w-full pl-8 pr-7 py-1 text-xs bg-[#F8FAFC] border border-[#CBD5E1] rounded text-[#1E293B] placeholder-[#94A3B8] focus:outline-none focus:bg-white focus:border-[#0067FF]"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-[#64748B] hover:text-[#1E293B]"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>

          <button
            type="button"
            onClick={() => setMobileSearchOpen(!mobileSearchOpen)}
            className={`sm:hidden p-1.5 rounded border ${
              mobileSearchOpen || searchQuery
                ? 'bg-[#EBF2FF] text-[#0067FF] border-[#BBD6FF]'
                : 'bg-white text-[#475569] border-[#CBD5E1]'
            }`}
            aria-label="Toggle Search"
          >
            <Search className="h-4 w-4" />
          </button>

          {overdueCount > 0 && (
            <button
              onClick={onClickOverdue}
              title="View sales leads needing follow-up (>48h or scheduled due)"
              className="inline-flex items-center space-x-1 px-2 sm:px-2.5 py-1 rounded text-xs font-semibold bg-[#FEF2F2] hover:bg-[#FEE2E2] text-[#DC2626] border border-[#FECACA] transition-colors"
            >
              <Clock className="h-3.5 w-3.5" />
              <span className="hidden md:inline">{overdueCount} Follow-up Due</span>
              <span className="md:hidden">{overdueCount}</span>
            </button>
          )}

          <button
            onClick={onOpenBulkImport}
            className="inline-flex items-center space-x-1.5 px-2.5 sm:px-3 py-1.5 sm:py-1 rounded text-xs font-semibold text-[#334155] bg-white hover:bg-[#F8FAFC] border border-[#CBD5E1] transition-colors"
            title="Import CSV or Multi-line Enquiries"
          >
            <Upload className="h-3.5 w-3.5 text-[#64748B]" />
            <span className="hidden sm:inline">Import CSV</span>
          </button>

          <button
            onClick={() => setActiveTab('magic-paste')}
            className="inline-flex items-center space-x-1 px-2.5 sm:px-3 py-1.5 sm:py-1 rounded text-xs font-semibold text-white bg-[#0067FF] hover:bg-[#0055D4] transition-colors shadow-xs"
          >
            <Plus className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Paste Enquiry</span>
            <span className="sm:hidden">Paste</span>
          </button>
        </div>
      </div>

      {(mobileSearchOpen || searchQuery || activeFilterLabel) && (
        <div className="sm:hidden px-3 pb-2.5 pt-1 border-t border-[#EEF1F5] bg-[#F8FAFC] space-y-2">
          {(mobileSearchOpen || searchQuery) && (
            <div className="relative w-full">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-[#64748B]" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  if (activeTab === 'overview' && e.target.value.trim()) {
                    setActiveTab('pipeline');
                  }
                }}
                placeholder="Search name, phone, or message..."
                className="w-full pl-8 pr-8 py-1.5 text-xs bg-white border border-[#CBD5E1] rounded text-[#1E293B] placeholder-[#94A3B8] focus:outline-none focus:border-[#0067FF]"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[#64748B]"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
            </div>
          )}

          {activeFilterLabel && (
            <div className="flex items-center justify-between px-2.5 py-1 rounded text-xs font-medium bg-[#EBF2FF] text-[#0067FF] border border-[#BBD6FF]">
              <span className="flex items-center gap-1.5 truncate">
                <Filter className="h-3 w-3 shrink-0" />
                <span className="truncate">{activeFilterLabel}</span>
              </span>
              <button
                onClick={onClearAllFilters}
                className="text-xs font-semibold text-[#DC2626] ml-2 shrink-0"
              >
                Clear
              </button>
            </div>
          )}
        </div>
      )}
    </header>
  );
}
