import React, { useState, useCallback } from 'react';
import { Check } from 'lucide-react';
import { useNow } from './hooks/useNow.js';
import { useLeads } from './hooks/useLeads.js';
import { needsFollowUp } from './lib/followUp.js';
import { Sidebar } from './components/Sidebar';
import { Header } from './components/Header';
import { FiltersBar } from './components/FiltersBar';
import { OverviewDashboard } from './components/OverviewDashboard';
import { KanbanBoard } from './components/KanbanBoard';
import { TableView } from './components/TableView';
import { SupportInboxView } from './components/SupportInboxView';
import { MagicPasteView } from './components/MagicPasteView';
import { WeeklySummaryView } from './components/WeeklySummaryView';
import { DatabaseSettingsView } from './components/DatabaseSettingsView';
import { LeadDetailModal } from './components/LeadDetailModal';
import { BulkImportModal } from './components/BulkImportModal';

export default function App() {
  const nowMs = useNow(60000);

  // Toast Notification
  const [toastMessage, setToastMessage] = useState(null);
  const showToast = useCallback((msg) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  }, []);

  // Central Leads, Knowledge Base, Team & AI Queue Hook
  const {
    leads,
    setLeads,
    knowledgeBase,
    updateKnowledgeBase,
    handleResetKnowledgeBase,
    teamMembers,
    updateTeamMembers,
    syncStatus,
    generatingLeadId,
    batchProgress,
    generateReplyForLead,
    runBatchAIAnalysis,
    ingestLead,
    bulkImportLeads,
    updateLeadFields,
    updateLeadStatus,
    sendReplyForLead,
    toggleResolveLead,
    snoozeFollowUp,
    addNoteToLead,
    deleteLead,
    reloadVerbatimSamples,
    exportLeadsToCSV
  } = useLeads({ showToast });

  // Navigation & Sidebar State
  const [activeTab, setActiveTab] = useState('overview');
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  // Filter State
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedInterest, setSelectedInterest] = useState('all');
  const [selectedChannel, setSelectedChannel] = useState('All Channels');
  const [selectedUrgency, setSelectedUrgency] = useState('all');
  const [selectedStage, setSelectedStage] = useState('all');
  const [selectedOwner, setSelectedOwner] = useState('all');

  // Modals State
  const [selectedLeadId, setSelectedLeadId] = useState(null);
  const [isBulkImportOpen, setIsBulkImportOpen] = useState(false);

  const selectedLead = selectedLeadId
    ? leads.find((l) => l.id === selectedLeadId) || null
    : null;

  const handleDrillDown = ({
    tab = 'pipeline',
    interest = 'all',
    channel = 'All Channels',
    urgency = 'all',
    stage = 'all',
    owner = 'all'
  }) => {
    setSelectedInterest(interest);
    setSelectedChannel(channel);
    setSelectedUrgency(urgency);
    setSelectedStage(stage);
    setSelectedOwner(owner);
    setActiveTab(tab);
  };

  const handleClearAllFilters = () => {
    setSearchQuery('');
    setSelectedInterest('all');
    setSelectedChannel('All Channels');
    setSelectedUrgency('all');
    setSelectedStage('all');
    setSelectedOwner('all');
  };

  // Filter helper
  const matchesFilters = (lead, { salesOnly = false } = {}) => {
    if (salesOnly && (lead.leadType || 'Sales') !== 'Sales') {
      return false;
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchName = (lead.senderName || '').toLowerCase().includes(q);
      const matchPhone = (lead.phone || '').toLowerCase().includes(q);
      const matchMsg = (lead.message || '').toLowerCase().includes(q);
      const matchSum = (lead.aiSummary || '').toLowerCase().includes(q);
      if (!matchName && !matchPhone && !matchMsg && !matchSum) return false;
    }

    if (selectedInterest !== 'all' && lead.interest !== selectedInterest) {
      return false;
    }

    if (selectedChannel !== 'All Channels' && lead.channel !== selectedChannel) {
      return false;
    }

    if (selectedStage !== 'all' && lead.status !== selectedStage) {
      return false;
    }

    if (
      selectedOwner !== 'all' &&
      (lead.owner || 'Unassigned') !== selectedOwner
    ) {
      return false;
    }

    if (selectedUrgency === 'overdue' && !needsFollowUp(lead, nowMs)) {
      return false;
    }

    return true;
  };

  const salesLeads = leads.filter((l) => (l.leadType || 'Sales') === 'Sales');
  const filteredSalesLeads = leads.filter((l) =>
    matchesFilters(l, { salesOnly: true })
  );
  const filteredAllLeads = leads.filter((l) =>
    matchesFilters(l, { salesOnly: false })
  );

  const overdueCount = salesLeads.filter((l) => needsFollowUp(l, nowMs)).length;

  // Build active filter breadcrumb label for Header
  const activeFilters = [];
  if (selectedInterest !== 'all') activeFilters.push(selectedInterest);
  if (selectedChannel !== 'All Channels') activeFilters.push(selectedChannel);
  if (selectedStage !== 'all') activeFilters.push(`Stage: ${selectedStage}`);
  if (selectedOwner !== 'all') activeFilters.push(`Owner: ${selectedOwner}`);
  if (selectedUrgency === 'overdue') activeFilters.push('48h+ Follow-up Due');
  const activeFilterLabel =
    activeFilters.length > 0 ? activeFilters.join(' • ') : null;

  return (
    <div className="flex h-screen bg-[#F3F5F9] text-[#1E293B] font-sans overflow-hidden">
      <Sidebar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        isCollapsed={isSidebarCollapsed}
        setIsCollapsed={setIsSidebarCollapsed}
        isMobileOpen={isMobileMenuOpen}
        setIsMobileOpen={setIsMobileMenuOpen}
        leads={leads}
        nowMs={nowMs}
        onDrillDown={handleDrillDown}
      />

      <div className="flex-1 flex flex-col h-full overflow-hidden min-w-0">
        <Header
          activeTab={activeTab}
          setActiveTab={setActiveTab}
          searchQuery={searchQuery}
          setSearchQuery={setSearchQuery}
          overdueCount={overdueCount}
          syncStatus={syncStatus}
          batchProgress={batchProgress}
          activeFilterLabel={activeFilterLabel}
          onClearAllFilters={handleClearAllFilters}
          onClickOverdue={() =>
            handleDrillDown({
              tab: 'pipeline',
              urgency: 'overdue',
              interest: 'all',
              channel: 'All Channels',
              stage: 'all',
              owner: 'all'
            })
          }
          onOpenBulkImport={() => setIsBulkImportOpen(true)}
          onOpenMobileMenu={() => setIsMobileMenuOpen(true)}
        />

        <main className="flex-1 overflow-y-auto px-3 sm:px-6 lg:px-8 pt-4 pb-20 lg:py-5 scrollbar-thin">
          {/* TAB 1: DASHBOARD OVERVIEW */}
          {activeTab === 'overview' && (
            <OverviewDashboard
              leads={leads}
              nowMs={nowMs}
              onDrillDown={handleDrillDown}
              onSelectLead={(lead) => setSelectedLeadId(lead.id)}
              onGenerateReply={generateReplyForLead}
              onSendReply={sendReplyForLead}
              onToggleResolveLead={toggleResolveLead}
              onSnoozeFollowUp={snoozeFollowUp}
              onRunBatchAI={() => runBatchAIAnalysis(leads)}
              batchProgress={batchProgress}
              generatingLeadId={generatingLeadId}
              onOpenBulkImport={() => setIsBulkImportOpen(true)}
              onGoToMagicPaste={() => setActiveTab('magic-paste')}
              onGoToSupport={() => setActiveTab('support')}
            />
          )}

          {/* TAB 2: SALES PIPELINE KANBAN (Sales Leads Only) */}
          {activeTab === 'pipeline' && (
            <>
              <FiltersBar
                searchQuery={searchQuery}
                setSearchQuery={setSearchQuery}
                selectedInterest={selectedInterest}
                setSelectedInterest={setSelectedInterest}
                selectedChannel={selectedChannel}
                setSelectedChannel={setSelectedChannel}
                selectedUrgency={selectedUrgency}
                setSelectedUrgency={setSelectedUrgency}
                selectedOwner={selectedOwner}
                setSelectedOwner={setSelectedOwner}
                teamMembers={teamMembers}
                totalCount={salesLeads.length}
                filteredCount={filteredSalesLeads.length}
              />
              <KanbanBoard
                leads={filteredSalesLeads}
                nowMs={nowMs}
                onUpdateStatus={updateLeadStatus}
                onSelectLead={(lead) => setSelectedLeadId(lead.id)}
                onGenerateReply={generateReplyForLead}
                onSendReply={sendReplyForLead}
                generatingLeadId={generatingLeadId}
                selectedStage={selectedStage}
                setSelectedStage={setSelectedStage}
              />
            </>
          )}

          {/* TAB 3: ALL ENQUIRIES SPREADSHEET */}
          {activeTab === 'enquiries' && (
            <>
              <FiltersBar
                searchQuery={searchQuery}
                setSearchQuery={setSearchQuery}
                selectedInterest={selectedInterest}
                setSelectedInterest={setSelectedInterest}
                selectedChannel={selectedChannel}
                setSelectedChannel={setSelectedChannel}
                selectedUrgency={selectedUrgency}
                setSelectedUrgency={setSelectedUrgency}
                selectedOwner={selectedOwner}
                setSelectedOwner={setSelectedOwner}
                teamMembers={teamMembers}
                totalCount={leads.length}
                filteredCount={filteredAllLeads.length}
              />
              <TableView
                leads={filteredAllLeads}
                nowMs={nowMs}
                teamMembers={teamMembers}
                onUpdateStatus={updateLeadStatus}
                onUpdateLeadFields={updateLeadFields}
                onSelectLead={(lead) => setSelectedLeadId(lead.id)}
                onGenerateReply={generateReplyForLead}
                onSendReply={sendReplyForLead}
                onToggleResolveLead={toggleResolveLead}
                generatingLeadId={generatingLeadId}
                onOpenBulkImport={() => setIsBulkImportOpen(true)}
                onExportCSV={exportLeadsToCSV}
                onBatchGenerateReplies={(list) => runBatchAIAnalysis(list)}
                batchProgress={batchProgress}
              />
            </>
          )}

          {/* TAB 4: NON-SALES TRIAGE INBOX (Support, Job Seekers, Spam) */}
          {activeTab === 'support' && (
            <SupportInboxView
              leads={leads}
              onSelectLead={(lead) => setSelectedLeadId(lead.id)}
              onGenerateReply={generateReplyForLead}
              onSendReply={sendReplyForLead}
              onToggleResolveLead={toggleResolveLead}
              onReclassifyToSales={(id) => {
                updateLeadFields(id, { leadType: 'Sales', status: 'New' });
                showToast('Moved record to Sales Pipeline.');
              }}
              generatingLeadId={generatingLeadId}
            />
          )}

          {/* TAB 5: PASTE & ANALYZE ENQUIRY */}
          {activeTab === 'magic-paste' && (
            <MagicPasteView
              leads={leads}
              teamMembers={teamMembers}
              knowledgeBase={knowledgeBase}
              onIngestLead={(newLead, opts) => {
                ingestLead(newLead, opts);
                setActiveTab(newLead.leadType === 'Sales' ? 'pipeline' : 'support');
              }}
              onOpenKnowledgeBase={() => setActiveTab('database')}
            />
          )}

          {/* TAB 6: WEEKLY AI SUMMARY */}
          {activeTab === 'weekly-summary' && (
            <WeeklySummaryView
              leads={leads}
              nowMs={nowMs}
              onDrillDown={handleDrillDown}
              onSelectLead={(lead) => setSelectedLeadId(lead.id)}
              onGoToSupport={() => setActiveTab('support')}
              onOpenKnowledgeBase={() => setActiveTab('database')}
            />
          )}

          {/* TAB 7: KNOWLEDGE BASE, TEAM & SETTINGS */}
          {activeTab === 'database' && (
            <DatabaseSettingsView
              leads={leads}
              knowledgeBase={knowledgeBase}
              onUpdateKnowledgeBase={updateKnowledgeBase}
              onResetKnowledgeBase={handleResetKnowledgeBase}
              teamMembers={teamMembers}
              onUpdateTeamMembers={updateTeamMembers}
              onReloadSamples={reloadVerbatimSamples}
              onExportCSV={exportLeadsToCSV}
              onRestoreJSONDatabase={(restoredList) => {
                setLeads(restoredList);
                showToast(`Restored ${restoredList.length} records to CRM.`);
              }}
            />
          )}
        </main>
      </div>

      {/* Lead Detail Modal */}
      {selectedLead && (
        <LeadDetailModal
          key={`${selectedLead.id}_${selectedLead.suggestedReply || ''}`}
          lead={selectedLead}
          nowMs={nowMs}
          teamMembers={teamMembers}
          onClose={() => setSelectedLeadId(null)}
          onUpdateStatus={updateLeadStatus}
          onUpdateLeadFields={updateLeadFields}
          onToggleResolveLead={toggleResolveLead}
          onAddNote={addNoteToLead}
          onDeleteLead={(id) => {
            deleteLead(id);
            setSelectedLeadId(null);
          }}
          onGenerateReply={generateReplyForLead}
          onSendReply={sendReplyForLead}
          onOpenKnowledgeBase={() => setActiveTab('database')}
          generatingLeadId={generatingLeadId}
        />
      )}

      {/* Bulk Import Modal */}
      {isBulkImportOpen && (
        <BulkImportModal
          knowledgeBase={knowledgeBase}
          onClose={() => setIsBulkImportOpen(false)}
          onBulkImportLeads={(list) => {
            bulkImportLeads(list);
            setActiveTab('enquiries');
          }}
        />
      )}

      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-16 lg:bottom-5 right-4 sm:right-5 z-50 flex items-center space-x-2 bg-[#17223B] text-white px-4 py-2.5 rounded-md shadow-lg border border-[#2D3B5A] text-xs font-medium max-w-[90vw]">
          <Check className="h-4 w-4 text-[#10B981] shrink-0" />
          <span className="truncate">{toastMessage}</span>
        </div>
      )}
    </div>
  );
}
