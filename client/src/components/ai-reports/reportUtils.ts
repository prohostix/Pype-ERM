/** Shared types, formatting and the spoken/written summary for AI Reports. */

export type ChartType = 'bar' | 'line' | 'pie' | 'table' | 'kpi';
export interface Filter { field: string; op: string; value?: string; values?: string[] }
export interface Spec {
  title: string; dataset: string; mode: 'aggregate' | 'list';
  metrics: { field?: string; agg: string }[]; groupBy: string[];
  timeBucket?: { field: string; interval: string } | null;
  filters: Filter[]; columns: string[]; sort?: { by: string; dir: string } | null;
  limit: number; chart: ChartType;
}
export interface Column { key: string; label: string; type: 'string' | 'number' | 'date' | 'datetime' | 'boolean' }
export interface Result {
  spec: Spec; columns: Column[]; rows: Record<string, unknown>[];
  meta: { scannedRows: number; truncated: boolean; totalGroups?: number };
  /** Which data this user can see, set by the server, e.g. "Only your branch (Chennai)" */
  access?: string;
}
export interface Catalog {
  datasets: { key: string; label: string; fields: { key: string; label: string }[] }[];
  suggestions: string[];
  /** Live voice + spoken answers are on (Grok configured on the server) */
  liveVoice?: boolean;
  /** Languages the server can speak (e.g. ['ml']) — used when the device has no voice */
  serverVoice?: string[];
}

export const nf = new Intl.NumberFormat('en-IN', { maximumFractionDigits: 2 });
export const compact = new Intl.NumberFormat('en-IN', { notation: 'compact', maximumFractionDigits: 1 });
export const isMoney = (key: string) => key !== 'count' && /amount|total|tax|paid/i.test(key);

/** Dimensions whose values are people's names — never put in spoken text (it may go to a voice service) */
const PERSON_DIMS = new Set(['studentName', 'student', 'name', 'employee', 'assignee', 'assigner', 'salesPerson', 'referredBy', 'receivedBy', 'contactName', 'faculty']);

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const MONTHS_LONG = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

/** "2026-09" → "Sep 2026", "2026-Q3" → "Q3 2026", "2026-09-15" → "15 Sep 2026" */
export function prettyBucket(v: unknown, long = false): string {
  const s = String(v ?? '');
  let m = /^(\d{4})-(\d{2})$/.exec(s);
  if (m) return `${(long ? MONTHS_LONG : MONTHS)[+m[2] - 1]} ${m[1]}`;
  m = /^(\d{4})-Q([1-4])$/.exec(s);
  if (m) return `Q${m[2]} ${m[1]}`;
  m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s);
  if (m) return `${+m[3]} ${(long ? MONTHS_LONG : MONTHS)[+m[2] - 1]} ${m[1]}`;
  return s;
}

export function fmt(v: unknown, col?: Column): string {
  if (v === null || v === undefined || v === '') return '—';
  if (col?.type === 'number' && typeof v === 'number') return (isMoney(col.key) ? '₹' : '') + nf.format(v);
  if (col?.type === 'datetime') {
    const d = new Date(v as string);
    return isNaN(d.getTime()) ? String(v) : d.toLocaleString('en-IN', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit', hour12: true });
  }
  if (col?.type === 'date') {
    const d = new Date(v as string);
    return isNaN(d.getTime()) ? String(v) : d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
  }
  if (typeof v === 'boolean') return v ? 'Yes' : 'No';
  return String(v);
}

/** Indian-style number for speech: 1.5 lakh, 2.3 crore */
function spokenNumber(n: number, money: boolean): string {
  const abs = Math.abs(n);
  const r = (x: number) => (Math.round(x * 10) / 10).toString();
  const words =
    abs >= 1e7 ? `${r(n / 1e7)} crore` :
    abs >= 1e5 ? `${r(n / 1e5)} lakh` :
    abs >= 1e3 && money ? `${r(n / 1e3)} thousand` :
    nf.format(Math.round(n * 100) / 100);
  return money ? `${words} rupees` : words;
}

function shortMoney(n: number, money: boolean): string {
  return (money ? '₹' : '') + nf.format(Math.round(n));
}

/**
 * A one-to-two sentence summary of the result: `text` for the chat bubble,
 * `speech` for text-to-speech. Built from the numbers, no extra AI call.
 */
function summarizeEn(result: Result): { text: string; speech: string } {
  const { spec, columns, rows, meta } = result;
  if (rows.length === 0) {
    const t = 'No data matches this report. Try widening the date range or removing a filter.';
    return { text: t, speech: t };
  }

  if (spec.mode === 'list') {
    const moneyCol = columns.find((c) => c.type === 'number' && isMoney(c.key));
    const total = moneyCol ? rows.reduce((s, r) => s + (Number(r[moneyCol.key]) || 0), 0) : 0;
    const more = meta.truncated ? ' (showing the first ' + rows.length + ')' : '';
    return {
      text: `Found ${rows.length} record${rows.length === 1 ? '' : 's'}${more}${moneyCol ? `, totalling ${shortMoney(total, true)}` : ''}.`,
      speech: `I found ${rows.length} record${rows.length === 1 ? '' : 's'}${moneyCol ? `, totalling ${spokenNumber(total, true)}` : ''}.`,
    };
  }

  const dims = [...(spec.timeBucket ? [spec.timeBucket.field] : []), ...spec.groupBy];
  const metric = columns.find((c) => c.type === 'number' && !dims.includes(c.key));
  if (!metric) return { text: spec.title, speech: spec.title };
  const money = isMoney(metric.key);
  const val = (r: Record<string, unknown>) => Number(r[metric.key]) || 0;
  const label = metric.label.toLowerCase();

  // Headline numbers
  if (dims.length === 0) {
    const parts = columns.filter((c) => c.type === 'number');
    return {
      text: parts.map((c) => `${c.label}: ${fmt(rows[0][c.key], c)}`).join(' · '),
      speech: parts.map((c) => `${c.label} is ${spokenNumber(Number(rows[0][c.key]) || 0, isMoney(c.key))}`).join('. ') + '.',
    };
  }

  const dimCol = columns.find((c) => c.key === dims[0])!;
  const total = rows.reduce((s, r) => s + val(r), 0);

  // Time trend
  if (spec.timeBucket && dims.length === 1) {
    const first = rows[0], last = rows[rows.length - 1];
    const peak = rows.reduce((a, b) => (val(b) > val(a) ? b : a));
    const t = `${metric.label} totals ${shortMoney(total, money)} across ${rows.length} periods. Highest in ${prettyBucket(peak[dims[0]])} (${shortMoney(val(peak), money)}).`;
    const s = rows.length > 1
      ? `From ${prettyBucket(first[dims[0]], true)} to ${prettyBucket(last[dims[0]], true)}, ${label} totals ${spokenNumber(total, money)}. The highest was ${prettyBucket(peak[dims[0]], true)}, at ${spokenNumber(val(peak), money)}.`
      : `${metric.label} for ${prettyBucket(first[dims[0]], true)} is ${spokenNumber(total, money)}.`;
    return { text: t, speech: s };
  }

  // Category breakdown
  const top = rows.reduce((a, b) => (val(b) > val(a) ? b : a));
  const share = total > 0 ? Math.round((val(top) / total) * 100) : 0;
  const groupsWord = `${rows.length} ${dimCol.label.toLowerCase()}${rows.length === 1 ? '' : ' groups'}`;
  if (dims.length === 1) {
    const spokenName = PERSON_DIMS.has(dims[0]) ? 'The top person' : String(top[dims[0]]);
    return {
      text: `${String(top[dims[0]])} leads with ${shortMoney(val(top), money)} (${share}% of ${shortMoney(total, money)} across ${groupsWord}).`,
      speech: rows.length === 1
        ? `${spokenName} has ${spokenNumber(val(top), money)}.`
        : `${spokenName} is on top with ${spokenNumber(val(top), money)}, that's ${share} percent of the total ${spokenNumber(total, money)}.`,
    };
  }
  return {
    text: `${metric.label} totals ${shortMoney(total, money)}, broken down by ${dimCol.label.toLowerCase()} and ${columns.find((c) => c.key === dims[1])?.label.toLowerCase()}.`,
    speech: `The total ${label} is ${spokenNumber(total, money)}. I've broken it down on screen.`,
  };
}

// ─── Malayalam ──────────────────────────────────────────────────────────────────

export type Lang = 'en' | 'ml';

const ML_MONTHS = ['ജനുവരി', 'ഫെബ്രുവരി', 'മാർച്ച്', 'ഏപ്രിൽ', 'മേയ്', 'ജൂൺ', 'ജൂലൈ', 'ഓഗസ്റ്റ്', 'സെപ്റ്റംബർ', 'ഒക്ടോബർ', 'നവംബർ', 'ഡിസംബർ'];

/** "2026-09" → "സെപ്റ്റംബർ 2026" (other bucket shapes fall back to prettyBucket) */
function mlBucket(v: unknown): string {
  const s = String(v ?? '');
  let m = /^(\d{4})-(\d{2})$/.exec(s);
  if (m) return `${ML_MONTHS[+m[2] - 1]} ${m[1]}`;
  m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s);
  if (m) return `${ML_MONTHS[+m[2] - 1]} ${+m[3]}, ${m[1]}`;
  return prettyBucket(v);
}

/** Indian-style amount for Malayalam speech: 12.4 ലക്ഷം രൂപ */
function mlSpoken(n: number, money: boolean): string {
  const abs = Math.abs(n);
  const r = (x: number) => (Math.round(x * 10) / 10).toString();
  const words =
    abs >= 1e7 ? `${r(n / 1e7)} കോടി` :
    abs >= 1e5 ? `${r(n / 1e5)} ലക്ഷം` :
    abs >= 1e3 && money ? `${r(n / 1e3)} ആയിരം` :
    nf.format(Math.round(n * 100) / 100);
  return money ? `${words} രൂപ` : words;
}

/** Genitive ("of"): "25.5 ലക്ഷം രൂപ" → "25.5 ലക്ഷം രൂപയുടെ", plain numbers → "120-ന്റെ" */
const mlOf = (spoken: string) => (spoken.endsWith(' രൂപ') ? `${spoken}യുടെ` : `${spoken}-ന്റെ`);

function summarizeMl(result: Result): { text: string; speech: string } {
  const { spec, columns, rows, meta } = result;
  if (rows.length === 0) {
    const t = 'ഈ റിപ്പോർട്ടിന് ഡാറ്റ ഒന്നും ലഭ്യമല്ല. തീയതി പരിധി കൂട്ടുകയോ ഒരു ഫിൽട്ടർ നീക്കം ചെയ്യുകയോ ചെയ്യൂ.';
    return { text: t, speech: t };
  }

  if (spec.mode === 'list') {
    const moneyCol = columns.find((c) => c.type === 'number' && isMoney(c.key));
    const total = moneyCol ? rows.reduce((s, r) => s + (Number(r[moneyCol.key]) || 0), 0) : 0;
    const more = meta.truncated ? ` (ആദ്യത്തെ ${rows.length} എണ്ണം കാണിക്കുന്നു)` : '';
    return {
      text: `${rows.length} റെക്കോർഡുകൾ കണ്ടെത്തി${more}${moneyCol ? `, ആകെ ${shortMoney(total, true)}` : ''}.`,
      speech: `${rows.length} റെക്കോർഡുകൾ കണ്ടെത്തി${moneyCol ? `, ആകെ ${mlSpoken(total, true)}` : ''}.`,
    };
  }

  const dims = [...(spec.timeBucket ? [spec.timeBucket.field] : []), ...spec.groupBy];
  const metric = columns.find((c) => c.type === 'number' && !dims.includes(c.key));
  if (!metric) return { text: spec.title, speech: spec.title };
  const money = isMoney(metric.key);
  const val = (r: Record<string, unknown>) => Number(r[metric.key]) || 0;

  if (dims.length === 0) {
    const parts = columns.filter((c) => c.type === 'number');
    return {
      text: parts.map((c) => `${c.label}: ${fmt(rows[0][c.key], c)}`).join(' · '),
      speech: parts.map((c) => `${c.label} ${mlSpoken(Number(rows[0][c.key]) || 0, isMoney(c.key))}`).join('. ') + '.',
    };
  }

  const total = rows.reduce((s, r) => s + val(r), 0);

  if (spec.timeBucket && dims.length === 1) {
    const first = rows[0], last = rows[rows.length - 1];
    const peak = rows.reduce((a, b) => (val(b) > val(a) ? b : a));
    const k = dims[0];
    return {
      text: `${rows.length} കാലയളവുകളിൽ ആകെ ${shortMoney(total, money)}. ഏറ്റവും കൂടുതൽ ${mlBucket(peak[k])}-ൽ (${shortMoney(val(peak), money)}).`,
      speech: rows.length > 1
        ? `${mlBucket(first[k])} മുതൽ ${mlBucket(last[k])} വരെ ആകെ ${mlSpoken(total, money)}. ഏറ്റവും കൂടുതൽ ${mlBucket(peak[k])}-ൽ ആണ്, ${mlSpoken(val(peak), money)}.`
        : `${mlBucket(first[k])}-ൽ ആകെ ${mlSpoken(total, money)}.`,
    };
  }

  const top = rows.reduce((a, b) => (val(b) > val(a) ? b : a));
  const share = total > 0 ? Math.round((val(top) / total) * 100) : 0;
  const name = String(top[dims[0]]);
  const spokenName = PERSON_DIMS.has(dims[0]) ? 'മുന്നിലുള്ളയാൾ' : name;
  if (dims.length === 1) {
    return {
      text: `${name} ആണ് മുന്നിൽ — ${shortMoney(val(top), money)} (${rows.length} ഗ്രൂപ്പുകളിലായി ആകെ ${shortMoney(total, money)}-ന്റെ ${share}%).`,
      speech: rows.length === 1
        ? `${spokenName}: ${mlSpoken(val(top), money)}.`
        : `${spokenName === name ? `${name} ആണ് മുന്നിൽ` : spokenName}, ${mlSpoken(val(top), money)}. അത് ആകെ ${mlOf(mlSpoken(total, money))} ${share} ശതമാനമാണ്.`,
    };
  }
  return {
    text: `ആകെ ${shortMoney(total, money)}. വിശദമായ വിഭജനം താഴെ കാണാം.`,
    speech: `ആകെ ${mlSpoken(total, money)}. വിശദാംശങ്ങൾ സ്ക്രീനിൽ കാണാം.`,
  };
}

/**
 * A one-to-two sentence summary of the result: `text` for the chat bubble,
 * `speech` for text-to-speech. Built on the device from the numbers — no AI call.
 */
export function summarize(result: Result, lang: Lang = 'en'): { text: string; speech: string } {
  return lang === 'ml' ? summarizeMl(result) : summarizeEn(result);
}
