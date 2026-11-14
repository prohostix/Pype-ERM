// Documents a university can ask for on the enrollment forms (Direct Enrollment, Academic Partner,
// Study Abroad, Sales verification). Each university decides per document:
//   - requiredDocuments: mandatory (must be uploaded)
//   - visibleDocuments : the "eye" - shown on the form at all. Required documents are always shown.

export const DOCUMENT_GROUPS: { title: string; docs: string[] }[] = [
  { title: 'Identity', docs: ['Aadhaar Card', 'Passport', 'Birth Certificate'] },
  {
    title: 'Academics',
    docs: [
      '10th Certificate', '12th Certificate', 'SSLC Certificate', 'Plus Two Certificate',
      'UG Certificate', 'UG Transcript / Marksheet', 'PG Certificate', 'PG Transcript / Marksheet', 'Degree Certificate',
    ],
  },
  {
    title: 'Application',
    docs: ['LOR (Letter of Recommendation)', 'SOP (Statement of Purpose)', 'MOI / Language Certificate', 'CV', 'Other Certificates (GMAT / German)'],
  },
  { title: 'Other', docs: ['Transfer Certificate', 'TC / Migration / Affidavit', 'Other'] },
];

export const DOCUMENT_CATALOG: string[] = DOCUMENT_GROUPS.flatMap(g => g.docs);

export const DEFAULT_REQUIRED_DOCUMENTS = ['Aadhaar Card', 'SSLC Certificate', 'Plus Two Certificate'];

/** What the forms showed before visibility existed - used for universities that never saved a choice. */
export const LEGACY_VISIBLE_DOCUMENTS = [
  'Aadhaar Card', 'SSLC Certificate', 'Plus Two Certificate', 'Transfer Certificate',
  'TC / Migration / Affidavit', 'Birth Certificate', 'Degree Certificate', 'Other',
];

const norm = (s: string) => s.trim().toLowerCase();

export const sameDocType = (a: string, b: string): boolean =>
  norm(a) === norm(b)
  || (norm(a) === 'transfer certificate' && norm(b) === 'tc / migration / affidavit')
  || (norm(a) === 'tc / migration / affidavit' && norm(b) === 'transfer certificate');

const parse = (raw: unknown): any => {
  if (typeof raw === 'string') { try { return JSON.parse(raw); } catch { return null; } }
  return raw && typeof raw === 'object' ? raw : null;
};

/** Visible list stored on a university, or the legacy list when it has never been set. */
export const visibleDocumentsOf = (raw: unknown): string[] => {
  const conf = parse(raw);
  return Array.isArray(conf?.visibleDocuments) ? conf.visibleDocuments : LEGACY_VISIBLE_DOCUMENTS;
};

/**
 * Document types to render on an enrollment form, in catalog order.
 * `required` overrides the university's required list (e.g. an upgrade adds one).
 */
export const visibleDocTypes = (raw: unknown, required?: string[]): string[] => {
  const conf = parse(raw);
  const req: string[] = required ?? (Array.isArray(conf?.requiredDocuments) ? conf.requiredDocuments : DEFAULT_REQUIRED_DOCUMENTS);
  const shown = visibleDocumentsOf(raw);
  const isShown = (d: string) => shown.some(s => sameDocType(s, d)) || req.some(r => sameDocType(r, d));
  const list = DOCUMENT_CATALOG.filter(isShown);
  // Required documents that are not in the catalog (older or custom names) must still be uploadable.
  for (const r of req) if (!list.some(d => sameDocType(d, r))) list.push(r);
  return list;
};
