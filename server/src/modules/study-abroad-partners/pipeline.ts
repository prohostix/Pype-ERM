/**
 * Study Abroad pipeline — stage definitions and commission maths.
 * Self-contained: nothing here is shared with the core Enrollment flow.
 */
export const STAGES = [
  'application', 'interview', 'offer', 'payment', 'visa_documents', 'visa_decision', 'enrolled', 'commission_released',
] as const;
export type Stage = typeof STAGES[number];

/** Journeys that ended without an enrolled student. */
export const TERMINAL_STAGES = ['withdrawn', 'interview_failed', 'offer_declined', 'visa_refused'] as const;

export const STAGE_LABELS: Record<string, string> = {
  application: 'Application submission',
  interview: 'Interview',
  offer: 'Offer received',
  payment: 'Payment',
  visa_documents: 'Visa documents',
  visa_decision: 'Visa decision',
  enrolled: 'Student enrollment',
  commission_released: 'Commission release',
  withdrawn: 'Withdrawn',
  interview_failed: 'Interview not cleared',
  offer_declined: 'Offer declined',
  visa_refused: 'Visa refused',
};

export const isTerminal = (stage: string): boolean => (TERMINAL_STAGES as readonly string[]).includes(stage);

export type CommissionTerms = { type: 'none' | 'percentage' | 'fixed'; value: number };

/**
 * Commission for one enrolled student. Percentage is taken on the payment verified at the Payment stage;
 * fixed is a flat amount per enrolled student. Rounded to 2 decimals.
 */
export const calcCommission = (terms: CommissionTerms, verifiedPayment: number): number => {
  if (!terms || terms.type === 'none' || !(terms.value > 0)) return 0;
  const raw = terms.type === 'percentage' ? (verifiedPayment * terms.value) / 100 : terms.value;
  return Math.round((raw + Number.EPSILON) * 100) / 100;
};

const norm = (s: string) => s.trim().toLowerCase();
const sameDoc = (a: string, b: string) =>
  norm(a) === norm(b)
  || (norm(a) === 'transfer certificate' && norm(b) === 'tc / migration / affidavit')
  || (norm(a) === 'tc / migration / affidavit' && norm(b) === 'transfer certificate');

const DEFAULT_REQUIRED_DOCS = ['Aadhaar Card', 'SSLC Certificate', 'Plus Two Certificate'];
const DEFAULT_REQUIRED_FIELDS = ['email', 'dob', 'address', 'pinCode', 'fatherName', 'photo'];

/** The university's enrollment form rules (required fields / documents), with the same defaults as the forms. */
export const formRules = (raw: unknown): { requiredFields: string[]; requiredDocuments: string[] } => {
  let conf: any = raw;
  if (typeof raw === 'string') { try { conf = JSON.parse(raw); } catch { conf = null; } }
  return {
    requiredFields: Array.isArray(conf?.requiredFields) ? conf.requiredFields : DEFAULT_REQUIRED_FIELDS,
    requiredDocuments: Array.isArray(conf?.requiredDocuments) ? conf.requiredDocuments : DEFAULT_REQUIRED_DOCS,
  };
};

export const missingDocuments = (required: string[], uploaded: { type?: string }[]): string[] =>
  required.filter(r => !uploaded.some(d => d?.type && sameDoc(r, d.type)));
