import React from 'react';
import {
  Filter,
  Building2,
  GraduationCap,
  Award,
  Clock,
  HelpCircle
} from 'lucide-react';

export function FiltersBar({
  searchQuery,
  setSearchQuery,
  selectedInterest = 'all',
  setSelectedInterest,
  selectedChannel = 'All Channels',
  setSelectedChannel,
  selectedUrgency = 'all',
  setSelectedUrgency,
  selectedOwner = 'all',
  setSelectedOwner,
  teamMembers = [],
  totalCount = 0,
  filteredCount = 0
}) {
  const interests = [
    { id: 'all', label: 'All Programs', icon: Filter },
    { id: 'Bootcamp', label: 'Bootcamp', icon: GraduationCap },
    { id: 'Fellowship', label: 'Fellowship', icon: Award },
    { id: 'Corporate Training', label: 'Corporate Training', icon: Building2 },
    { id: 'Unknown', label: 'Unspecified', icon: HelpCircle }
  ];

  const channels = [
    'All Channels',
    'WhatsApp',
    'Facebook Messenger',
    'Facebook comment',
    'Website form',
    'Phone call note'
  ];

  const isFiltered =
    searchQuery ||
    selectedInterest !== 'all' ||
    selectedChannel !== 'All Channels' ||
    selectedUrgency !== 'all' ||
    (selectedOwner && selectedOwner !== 'all');

  const resetAllFilters = () => {
    setSearchQuery('');
    setSelectedInterest('all');
    setSelectedChannel('All Channels');
    setSelectedUrgency('all');
    if (setSelectedOwner) setSelectedOwner('all');
  };

  return (
    <div className="bg-white p-2.5 sm:px-4 sm:py-2.5 rounded-md border border-[#DCE1E7] mb-3 sm:mb-4 flex flex-col lg:flex-row lg:items-center justify-between gap-2.5">
      {/* Left: Program Interest Pills + Overdue Quick Toggle */}
      <div className="flex items-center space-x-1 overflow-x-auto pb-1 lg:pb-0 -mx-1 px-1">
        {interests.map((item) => {
          const Icon = item.icon;
          const isActive = selectedInterest === item.id;
          return (
            <button
              key={item.id}
              onClick={() => setSelectedInterest(item.id)}
              className={`flex items-center space-x-1.5 px-2.5 py-1.5 sm:py-1 rounded text-xs font-medium whitespace-nowrap transition-colors shrink-0 ${
                isActive
                  ? 'bg-[#0067FF] text-white font-semibold'
                  : 'text-[#475569] bg-[#F8FAFC] sm:bg-transparent hover:bg-[#F1F5F9] hover:text-[#1E293B]'
              }`}
            >
              <Icon className="h-3.5 w-3.5 shrink-0" />
              <span>{item.label}</span>
            </button>
          );
        })}

        <button
          onClick={() =>
            setSelectedUrgency(selectedUrgency === 'overdue' ? 'all' : 'overdue')
          }
          className={`flex items-center space-x-1.5 px-2.5 py-1.5 sm:py-1 rounded text-xs font-medium whitespace-nowrap transition-colors shrink-0 border ${
            selectedUrgency === 'overdue'
              ? 'bg-[#DC2626] text-white border-[#DC2626] font-semibold'
              : 'text-[#DC2626] bg-[#FEF2F2] border-[#FECACA] hover:bg-[#FEE2E2]'
          }`}
        >
          <Clock className="h-3.5 w-3.5 shrink-0" />
          <span>48h+ Follow-up Due</span>
        </button>
      </div>

      {/* Right: Channel Select, Owner Select & Record Count */}
      <div className="flex flex-wrap items-center justify-between sm:justify-end gap-2 pt-2 lg:pt-0 border-t lg:border-t-0 border-[#EEF1F5] shrink-0">
        <div className="flex flex-wrap items-center gap-2">
          <select
            value={selectedChannel}
            onChange={(e) => setSelectedChannel(e.target.value)}
            className="text-xs py-1.5 sm:py-1 px-2 bg-white border border-[#CBD5E1] rounded text-[#334155] font-medium focus:outline-none focus:border-[#0067FF]"
          >
            {channels.map((ch) => (
              <option key={ch} value={ch}>
                {ch}
              </option>
            ))}
          </select>

          {setSelectedOwner && (
            <select
              value={selectedOwner}
              onChange={(e) => setSelectedOwner(e.target.value)}
              className="text-xs py-1.5 sm:py-1 px-2 bg-white border border-[#CBD5E1] rounded text-[#334155] font-medium focus:outline-none focus:border-[#0067FF]"
            >
              <option value="all">All Owners</option>
              {teamMembers.map((m) => (
                <option key={m} value={m}>
                  {m}
                </option>
              ))}
            </select>
          )}

          {isFiltered && (
            <button
              onClick={resetAllFilters}
              className="text-xs text-[#DC2626] hover:underline font-semibold px-1.5"
            >
              Reset
            </button>
          )}
        </div>

        <span className="text-[11px] sm:text-xs text-[#64748B] pl-2.5 border-l border-[#E2E8F0]">
          Showing <strong className="text-[#1E293B]">{filteredCount}</strong>/{totalCount}
        </span>
      </div>
    </div>
  );
}
