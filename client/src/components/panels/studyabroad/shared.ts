// Shared labels/colours for the Study Abroad Partner screens.
import api from '@/lib/api';

export const PARTNER_STATUS: Record<string, { label: string; className: string }> = {
  active: { label: 'Active', className: 'bg-success/10 text-success' },
  suspended: { label: 'Suspended', className: 'bg-destructive/10 text-destructive' },
};

export const apiError = (e: any, fallback: string): string => e?.response?.data?.message || fallback;

export const money = (n?: number | null): string => `₹${Number(n || 0).toLocaleString()}`;

export const fmtDate = (d?: string | null): string => (d ? new Date(d).toLocaleDateString() : '—');

/** Resolve an uploaded file path (/uploads/...) to a URL the browser can open. */
export const fileHref = (url?: string | null): string => api.getFileUrl(url) || '#';

// Program catalog served by GET /study-abroad/me/catalog (country → university → program).
export interface CatalogIntake { id: string; month: number; year: number; session: string; open: boolean }
export interface CatalogProgram { id: string; name: string; duration: number; courseType: string; specialisations: string[]; intakes: CatalogIntake[] }
export interface CatalogUniversity { id: string; name: string; logo?: string | null; enrollmentFormConfig?: any; programs: CatalogProgram[] }
export interface CatalogCountry { country: string; universities: CatalogUniversity[] }

/** Where a partner pressed Apply in Search Programs, so the wizard can skip ahead. */
export interface Prefill { country: string; university: string; programId: string; specialisation?: string }

export const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
export const MONTH_NAMES = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
export const fmtMonths = (m: number) => (m < 12 ? `${m} months` : m % 12 === 0 ? `${m / 12} year${m / 12 > 1 ? 's' : ''}` : `${Math.floor(m / 12)}y ${m % 12}m`);

// ── Study Abroad pipeline (separate from the core enrollment flow) ──
export const PIPELINE_STAGES: { key: string; label: string }[] = [
  { key: 'application', label: 'Application' },
  { key: 'interview', label: 'Interview' },
  { key: 'offer', label: 'Offer' },
  { key: 'payment', label: 'Payment' },
  { key: 'visa_documents', label: 'Visa documents' },
  { key: 'visa_decision', label: 'Visa decision' },
  { key: 'enrolled', label: 'Enrolled' },
  { key: 'commission_released', label: 'Commission' },
];

export const TERMINAL_LABELS: Record<string, string> = {
  withdrawn: 'Withdrawn', interview_failed: 'Interview not cleared', offer_declined: 'Offer declined', visa_refused: 'Visa refused',
};

export const stageLabel = (stage: string): string =>
  PIPELINE_STAGES.find(s => s.key === stage)?.label || TERMINAL_LABELS[stage] || stage;

export const stageTone = (stage: string): string =>
  TERMINAL_LABELS[stage] ? 'bg-destructive/10 text-destructive'
    : ['enrolled', 'commission_released'].includes(stage) ? 'bg-success/10 text-success'
    : 'bg-primary/10 text-primary';

/** What the application is waiting for, in plain words. */
export const waitingFor = (a: any): string => {
  const sd = a.stageData || {};
  switch (a.stage) {
    case 'application': return sd.application?.status === 'rejected' ? 'Partner to fix documents' : 'Review documents';
    case 'interview': return sd.interview?.status === 'scheduled' ? 'Record interview result' : 'Schedule interview';
    case 'offer': return sd.offer?.status === 'issued' ? 'Partner to accept the offer' : 'Record the offer';
    case 'payment': return sd.payment?.status === 'submitted' ? 'Verify payment' : sd.payment?.status === 'rejected' ? 'Partner to resubmit payment' : 'Partner to pay';
    case 'visa_documents': return sd.visaDocuments?.status === 'submitted' ? 'Verify visa documents' : sd.visaDocuments?.status === 'rejected' ? 'Partner to resubmit' : 'Partner to upload visa documents';
    case 'visa_decision': return 'Record visa decision';
    case 'enrolled': return a.commissionStatus === 'payable' ? 'Release commission' : 'Complete';
    case 'commission_released': return 'Complete';
    default: return '';
  }
};

export const COMMISSION_STATUS: Record<string, { label: string; className: string }> = {
  not_eligible: { label: 'None', className: 'bg-muted text-muted-foreground' },
  payable: { label: 'Payable', className: 'bg-warning/10 text-warning' },
  released: { label: 'Released', className: 'bg-success/10 text-success' },
  void: { label: 'Void', className: 'bg-destructive/10 text-destructive' },
};

/** Stages where the journey ended without an enrolled student. */
export const CLOSED_STAGES = ['withdrawn', 'interview_failed', 'offer_declined', 'visa_refused'];

export const commissionLabel = (type?: string, value?: number): string =>
  type === 'percentage' ? `${value}% of the verified payment` : type === 'fixed' ? `${Number(value || 0).toLocaleString()} per student` : 'No commission';
