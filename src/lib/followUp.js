// 48-Hour Follow-up & Scheduled Reminder Logic for BIAI CRM
// Works across ALL open sales stages (New, Contacted, Interested) — not just New.
// Compares against `lastContactedAt` (or `receivedAt` if never contacted) and honors `nextFollowUpAt`.

export const OPEN_SALES_STAGES = ['New', 'Contacted', 'Interested'];
export const CLOSED_SALES_STAGES = ['Paid', 'Lost'];

export function parseDateTimestamp(dateStr) {
  if (!dateStr) return NaN;
  const normalized = String(dateStr).trim().replace(' ', 'T');
  const ts = new Date(normalized).getTime();
  return ts;
}

export function getReferenceTimestamp(lead) {
  const lastContact = parseDateTimestamp(lead?.lastContactedAt);
  if (!isNaN(lastContact)) return lastContact;
  const received = parseDateTimestamp(lead?.receivedAt);
  return received;
}

export function getHoursSinceLastActivity(lead, nowMs = Date.now()) {
  const ref = getReferenceTimestamp(lead);
  if (isNaN(ref)) return 0;
  return Math.max(0, (nowMs - ref) / (1000 * 60 * 60));
}

export function getFollowUpStatus(lead, nowMs = Date.now()) {
  if (!lead) {
    return { isOverdue: false, isScheduledDue: false, hoursElapsed: 0, reason: '' };
  }

  // Check unresolved high-urgency Support cases (SLA: 4 hours)
  const leadType = lead.leadType || 'Sales';
  if (leadType === 'Support') {
    if (lead.isResolved) {
      return { isOverdue: false, isScheduledDue: false, hoursElapsed: 0, reason: '' };
    }
    const hoursElapsed = getHoursSinceLastActivity(lead, nowMs);
    const slaLimit = lead.urgency === 'high' ? 4 : 24;
    if (hoursElapsed > slaLimit) {
      return {
        isOverdue: true,
        isScheduledDue: false,
        hoursElapsed: Math.round(hoursElapsed),
        reason: `Urgent Support SLA breach (${Math.round(hoursElapsed)}h > ${slaLimit}h)`
      };
    }
    return {
      isOverdue: false,
      isScheduledDue: false,
      hoursElapsed: Math.round(hoursElapsed),
      reason: ''
    };
  }

  // Non-sales non-support leads (Spam, Job Seeker) do not have sales follow-up
  if (leadType !== 'Sales') {
    return { isOverdue: false, isScheduledDue: false, hoursElapsed: 0, reason: '' };
  }

  if (CLOSED_SALES_STAGES.includes(lead.status)) {
    return { isOverdue: false, isScheduledDue: false, hoursElapsed: 0, reason: '' };
  }

  // 1. Check explicit nextFollowUpAt if scheduled
  const scheduledTs = parseDateTimestamp(lead.nextFollowUpAt);
  if (!isNaN(scheduledTs)) {
    if (nowMs >= scheduledTs) {
      const hoursPast = Math.round((nowMs - scheduledTs) / (1000 * 60 * 60));
      return {
        isOverdue: true,
        isScheduledDue: true,
        hoursElapsed: hoursPast,
        reason: `Scheduled follow-up due (${lead.nextFollowUpAt})`
      };
    }
    // If scheduled in the future, it's not overdue yet
    return {
      isOverdue: false,
      isScheduledDue: false,
      hoursElapsed: 0,
      reason: `Scheduled for ${lead.nextFollowUpAt}`
    };
  }

  // 2. Otherwise check 48-hour inactivity since lastContactedAt (or receivedAt)
  const hoursElapsed = getHoursSinceLastActivity(lead, nowMs);
  if (hoursElapsed > 48) {
    return {
      isOverdue: true,
      isScheduledDue: false,
      hoursElapsed: Math.round(hoursElapsed),
      reason: lead.lastContactedAt
        ? `No follow-up for ${Math.round(hoursElapsed)}h since last contact`
        : `Uncontacted for ${Math.round(hoursElapsed)}h since enquiry arrived`
    };
  }

  return {
    isOverdue: false,
    isScheduledDue: false,
    hoursElapsed: Math.round(hoursElapsed),
    reason: ''
  };
}

export function needsFollowUp(lead, nowMs = Date.now()) {
  return getFollowUpStatus(lead, nowMs).isOverdue;
}

