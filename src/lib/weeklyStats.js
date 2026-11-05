// Deterministic Weekly Statistics & Pipeline Aggregator for BIAI CRM
// All metrics are computed directly from actual lead records — never invented by AI.

import { needsFollowUp } from './followUp.js';

export function computePipelineStats(leads = [], nowMs = Date.now()) {
  const salesLeads = leads.filter((l) => (l.leadType || 'Sales') === 'Sales');
  const supportLeads = leads.filter((l) => l.leadType === 'Support');
  const openSupportLeads = supportLeads.filter((l) => !l.isResolved);
  const resolvedSupportLeads = supportLeads.filter((l) => l.isResolved);
  const spamLeads = leads.filter((l) => l.leadType === 'Spam');
  const jobSeekerLeads = leads.filter((l) => l.leadType === 'Job Seeker');
  const otherLeads = leads.filter((l) => l.leadType === 'Other');

  // Stage counts (Sales leads only)
  const byStage = {
    New: 0,
    Contacted: 0,
    Interested: 0,
    Paid: 0,
    Lost: 0
  };
  for (const lead of salesLeads) {
    if (byStage[lead.status] !== undefined) {
      byStage[lead.status] += 1;
    } else {
      byStage.New += 1;
    }
  }

  // Program interest counts (Sales leads)
  const byInterest = {
    Bootcamp: 0,
    Fellowship: 0,
    'Corporate Training': 0,
    Unknown: 0
  };
  for (const lead of salesLeads) {
    const key = byInterest[lead.interest] !== undefined ? lead.interest : 'Unknown';
    byInterest[key] += 1;
  }

  // Channel distribution (all leads)
  const byChannel = {};
  for (const lead of leads) {
    const ch = lead.channel || 'Unknown';
    byChannel[ch] = (byChannel[ch] || 0) + 1;
  }

  // Language distribution
  const byLanguage = { Bangla: 0, Banglish: 0, English: 0 };
  for (const lead of leads) {
    const lang = lead.language || 'English';
    byLanguage[lang] = (byLanguage[lang] || 0) + 1;
  }

  // Follow-up & team assignment metrics
  const overdueLeads = salesLeads.filter((l) => needsFollowUp(l, nowMs));
  const unassignedSalesLeads = salesLeads.filter(
    (l) => !l.owner || l.owner === 'Unassigned'
  );
  const repeatLeads = leads.filter((l) => (l.repeatCount || (l.messages?.length || 1)) > 1);
  const missingPhoneLeads = salesLeads.filter((l) => !l.phone);

  // Corporate leads & total seats requested
  const corporateLeads = salesLeads.filter((l) => l.interest === 'Corporate Training');
  const totalCorporateSeats = corporateLeads.reduce(
    (sum, l) => sum + (Number(l.teamSize) || 0),
    0
  );

  // Aggregate missing Knowledge Base facts flagged across all leads
  const missingFactCounts = {};
  for (const lead of leads) {
    for (const fact of lead.missingFacts || []) {
      missingFactCounts[fact] = (missingFactCounts[fact] || 0) + 1;
    }
  }
  const topMissingFacts = Object.entries(missingFactCounts)
    .sort((a, b) => b[1] - a[1])
    .map(([fact, count]) => ({ fact, count }));

  // Owner workload
  const byOwner = {};
  for (const lead of salesLeads) {
    const owner = lead.owner && lead.owner !== 'Unassigned' ? lead.owner : 'Unassigned';
    byOwner[owner] = (byOwner[owner] || 0) + 1;
  }

  // Deterministic "Chase First" ranking (used both to feed AI and when AI is offline)
  const chaseFirst = [...salesLeads]
    .filter((l) => l.status !== 'Paid' && l.status !== 'Lost')
    .sort((a, b) => {
      const score = (item) => {
        let s = 0;
        if (item.interest === 'Corporate Training') s += 50;
        if ((item.repeatCount || 1) > 1) s += 35;
        if (item.urgency === 'high') s += 25;
        if (needsFollowUp(item, nowMs)) s += 20;
        if (item.phone) s += 10;
        return s;
      };
      return score(b) - score(a);
    })
    .slice(0, 6);

  return {
    totalEnquiries: leads.length,
    totalMessagesIngested: leads.reduce(
      (sum, l) => sum + (l.messages?.length || 1),
      0
    ),
    salesCount: salesLeads.length,
    supportCount: supportLeads.length,
    openSupportCount: openSupportLeads.length,
    resolvedSupportCount: resolvedSupportLeads.length,
    spamCount: spamLeads.length,
    jobSeekerCount: jobSeekerLeads.length,
    otherCount: otherLeads.length,
    byStage,
    byInterest,
    byChannel,
    byLanguage,
    overdueCount: overdueLeads.length,
    overdueLeads,
    unassignedSalesCount: unassignedSalesLeads.length,
    repeatLeadsCount: repeatLeads.length,
    missingPhoneCount: missingPhoneLeads.length,
    corporateCount: corporateLeads.length,
    totalCorporateSeats,
    corporateLeads,
    openSupportLeads,
    topMissingFacts,
    byOwner,
    chaseFirst
  };
}

