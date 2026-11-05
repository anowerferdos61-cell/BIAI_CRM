// BIAI Official Knowledge Base & Policy Configuration
// Every unverified value starts as "TBC" (To Be Confirmed) so the AI never hallucinates
// or invents fees, locations, dates, discounts, or refund promises.

export const DEFAULT_KNOWLEDGE_BASE = {
  bootcamp: {
    name: '3-Day AI Bootcamp',
    fee: 'TBC',
    duration: '3 Days',
    format: 'TBC',
    location: 'TBC',
    nextCohortDate: 'TBC',
    recordingPolicy: 'TBC',
    certificatePolicy: 'TBC',
    freeMasterclassPolicy: 'TBC'
  },
  fellowship: {
    name: 'AI Fellowship Program',
    fee: 'TBC',
    duration: 'TBC',
    format: 'TBC',
    nextCohortDate: 'TBC',
    suitability: 'TBC',
    instalmentPolicy: 'TBC',
    studentDiscountPolicy: 'TBC',
    careerSupportPolicy: 'TBC'
  },
  corporate: {
    name: 'Corporate B2B AI Training',
    pricingModel: 'TBC',
    deliveryModes: 'Online or onsite (customized per organization)',
    groupDiscountPolicy: 'TBC',
    bookingAction: 'Collect company name, team size, and preferred schedule so our corporate team can call with a tailored quote.'
  },
  policies: {
    paymentMethods: 'bKash / Nagad / Bank / Card (exact numbers shared upon registration)',
    paymentVerificationSteps: 'Ask the customer for their bKash/Nagad Transaction ID (TrxID) and sender phone number so the accounts team can verify and send confirmation.',
    refundPolicy: 'TBC',
    escalationPolicy: 'Apologize sincerely, mark as urgent escalation, and have a senior team member call the customer directly to resolve.',
    careersContact: 'TBC'
  }
};

export function isFactSet(val) {
  if (!val) return false;
  const trimmed = String(val).trim();
  if (!trimmed) return false;
  if (trimmed.toUpperCase() === 'TBC') return false;
  return true;
}

export function getKnowledgeBaseCompletion(kb = DEFAULT_KNOWLEDGE_BASE) {
  const fields = [
    kb?.bootcamp?.fee,
    kb?.bootcamp?.format,
    kb?.bootcamp?.location,
    kb?.bootcamp?.nextCohortDate,
    kb?.bootcamp?.recordingPolicy,
    kb?.bootcamp?.certificatePolicy,
    kb?.bootcamp?.freeMasterclassPolicy,
    kb?.fellowship?.fee,
    kb?.fellowship?.duration,
    kb?.fellowship?.nextCohortDate,
    kb?.fellowship?.suitability,
    kb?.fellowship?.instalmentPolicy,
    kb?.fellowship?.studentDiscountPolicy,
    kb?.fellowship?.careerSupportPolicy,
    kb?.corporate?.pricingModel,
    kb?.corporate?.groupDiscountPolicy,
    kb?.policies?.refundPolicy,
    kb?.policies?.careersContact
  ];
  const filled = fields.filter(isFactSet).length;
  return { filled, total: fields.length };
}

export function formatKnowledgeBaseForPrompt(kb = DEFAULT_KNOWLEDGE_BASE) {
  const b = { ...DEFAULT_KNOWLEDGE_BASE.bootcamp, ...(kb?.bootcamp || {}) };
  const f = { ...DEFAULT_KNOWLEDGE_BASE.fellowship, ...(kb?.fellowship || {}) };
  const c = { ...DEFAULT_KNOWLEDGE_BASE.corporate, ...(kb?.corporate || {}) };
  const p = { ...DEFAULT_KNOWLEDGE_BASE.policies, ...(kb?.policies || {}) };

  return `BIAI OFFICIAL KNOWLEDGE BASE (Facts marked "TBC" are NOT yet confirmed — DO NOT invent or guess them; instead politely tell the customer our team will confirm that specific detail shortly):

1. BOOTCAMP (${b.name}):
   - Fee: ${b.fee}
   - Duration: ${b.duration}
   - Class Format (Live/Recorded): ${b.format}
   - Recording / Add-on / Lifetime Access Policy: ${b.recordingPolicy}
   - Offline Location: ${b.location}
   - Next Cohort Start Date: ${b.nextCohortDate}
   - Certificate Policy: ${b.certificatePolicy}
   - Free Masterclass / School Student Eligibility: ${b.freeMasterclassPolicy}

2. FELLOWSHIP (${f.name}):
   - Fee: ${f.fee}
   - Duration: ${f.duration}
   - Format: ${f.format}
   - Next Cohort Start Date: ${f.nextCohortDate}
   - Non-Technical Suitability: ${f.suitability}
   - Instalment / EMI Policy: ${f.instalmentPolicy}
   - Student Discount Policy: ${f.studentDiscountPolicy}
   - Job / Career Support Policy: ${f.careerSupportPolicy}

3. CORPORATE TRAINING (${c.name}):
   - Pricing Model: ${c.pricingModel}
   - Delivery Modes: ${c.deliveryModes}
   - Group Discount Policy: ${c.groupDiscountPolicy}
   - Standard Action: ${c.bookingAction}

4. SUPPORT, REFUNDS & CAREERS:
   - Payment Methods: ${p.paymentMethods}
   - Payment Verification Steps: ${p.paymentVerificationSteps}
   - Refund & Cancellation Policy: ${p.refundPolicy}
   - Upset Customer Escalation: ${p.escalationPolicy}
   - Job / Internship Applications: ${p.careersContact}`;
}

