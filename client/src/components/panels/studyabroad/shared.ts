// Shared labels/colours for the Study Abroad Partner screens.
import api from '@/lib/api';

export const PARTNER_STATUS: Record<string, { label: string; className: string }> = {
  active: { label: 'Active', className: 'bg-success/10 text-success' },
  suspended: { label: 'Suspended', className: 'bg-destructive/10 text-destructive' },
};

export const APPLICATION_STATUS: Record<string, { label: string; className: string }> = {
  document_review: { label: 'Document review', className: 'bg-warning/10 text-warning' },
  finance_review: { label: 'Finance review', className: 'bg-primary/10 text-primary' },
  enrolled: { label: 'Enrolled', className: 'bg-success/10 text-success' },
  ops_rejected: { label: 'Rejected by Operations', className: 'bg-destructive/10 text-destructive' },
  finance_rejected: { label: 'Rejected by Finance', className: 'bg-destructive/10 text-destructive' },
};

export const apiError = (e: any, fallback: string): string => e?.response?.data?.message || fallback;

export const money = (n?: number | null): string => `₹${Number(n || 0).toLocaleString()}`;

export const fmtDate = (d?: string | null): string => (d ? new Date(d).toLocaleDateString() : '—');

/** Resolve an uploaded file path (/uploads/...) to a URL the browser can open. */
export const fileHref = (url?: string | null): string => api.getFileUrl(url) || '#';
