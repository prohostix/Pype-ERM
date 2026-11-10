/**
 * AI Reports: the AI provider.
 *
 * Turns a plain-language question into a report spec (JSON). For the spec the AI
 * only gets the dataset descriptions and the question, never database rows.
 *
 * Provider is picked with AI_PROVIDER: "grok" (xAI) or "gemini".
 * Talk-back answers (generateAnswer) need report totals, so they run on Grok only —
 * report results are never sent to Gemini.
 */
import type { GoogleGenAI } from '@google/genai';
import { AGGS, CHARTS, INTERVALS, OPS, ReportError } from './compiler.js';
import { grokChat, grokConfigured } from './grok.js';

export interface SpecRequest {
  prompt: string;
  catalog: string;        // describeDatasets() output
  datasetKeys: string[];
  previousSpec?: unknown; // for follow-ups like "now split by month"
  /** What this user is allowed to see, e.g. "only their branch (Chennai)" */
  scopeLabel?: string;
  /** Reply language: 'en' (default) or 'ml' (Malayalam) */
  language?: Language;
}

export type Language = 'en' | 'ml';
export const parseLanguage = (v: unknown): Language => (v === 'ml' ? 'ml' : 'en');

/** Instruction appended to prompts so replies come back in the user's language */
export function languageRule(language: Language | undefined, what: string): string {
  if (language !== 'ml') return '';
  return `\nLanguage: the user speaks Malayalam. Write ${what} in natural, simple Malayalam (മലയാളം script). Keep numbers as digits; say amounts as ലക്ഷം / കോടി രൂപ. Keep dataset keys, field keys and filter values exactly as listed (English).`;
}

type SpecGenerator = (req: SpecRequest) => Promise<any>;

const TZ_OFFSET = process.env.REPORT_TZ_OFFSET || '+05:30';

export function todayLocal(): string {
  const m = /^([+-])(\d{2}):(\d{2})$/.exec(TZ_OFFSET);
  const offsetMin = m ? (m[1] === '-' ? -1 : 1) * (parseInt(m[2]) * 60 + parseInt(m[3])) : 330;
  const d = new Date(Date.now() + offsetMin * 60_000);
  return `${d.toISOString().slice(0, 10)} (${d.toLocaleDateString('en-US', { weekday: 'long', timeZone: 'UTC' })})`;
}

/** Shared context: date, the user's data access and the allowed datasets */
export function promptContext(req: Pick<SpecRequest, 'catalog' | 'scopeLabel'>): string {
  return `Today is ${todayLocal()}. Timezone offset ${TZ_OFFSET}. Currency is INR. The Indian financial year runs 1 April to 31 March.

${req.scopeLabel ? `Data access: this user can see ${req.scopeLabel}. The server applies this restriction automatically to every report; never add filters for it, and mention it when the user asks what a report covers.\n\n` : ''}You may ONLY use these datasets and fields:

${req.catalog}

`;
}

/** Rules for building a report spec (shared by text chat and the voice run_report tool) */
export const SPEC_RULES = `- Pick the single dataset that best answers the question.
- mode "aggregate" for totals, counts, breakdowns and trends. mode "list" only when the user asks to list/show individual records; then fill "columns".
- metrics: {agg:"count"} counts records; sum/avg/min/max need a field marked sum/avg.
- Conditional counts: {agg:"count_if", field, values} counts records whose field is one of values; {agg:"percent_if", field, values} gives that as a % of all records in the group. Use several of them side by side, e.g. attendance per employee: count_if present ["true"] (present days), count_if status ["absent"], count_if status ["leave"], count_if isLate ["true"], percent_if present ["true"] (attendance %, of working days), avg workingHours.
- Staff attendance: for today, "who is absent/present", absent lists, or per-employee/department present-absent counts use staff_day_status (it includes people who have not punched in). For one person, filter employee with "contains". "Today" = filter date eq today; for lists of who is absent use mode "list" with columns employee, employeeCode, department, branch, status, checkIn.
- groupBy: only fields marked groupable. For trends over time use timeBucket {field: <date field>, interval} instead of grouping by a date. At most 2 groupings in total, counting the time bucket.
- filters: whenever the message mentions a time period (today, this week, this month, last 3 months, this year, this financial year, since March…), you MUST add a date filter for it — never drop it. Always write dates as absolute YYYY-MM-DD values, worked out from today. "Last 3 months" = gte the date 3 months before today. "This month" = gte the 1st of this month. "This year" = gte 1 January. Use the dataset's default date field unless the question names another date.
- Use "in" with "values" for several values. For fields with listed values or known values, use exactly those spellings.
- "Top N" = sort by the metric desc and set limit N. Sort "by" uses output column keys: "count", or "<agg>_<field>" such as "sum_amount", or a groupBy field key.
- chart: "line" for time trends, "bar" for comparing categories, "pie" only for a share-of-total breakdown with few categories, "kpi" for a single number with no grouping, "table" for lists.
- title: short, human-readable report title that matches what this user can see (see "Data access"): e.g. an employee asking for "everyone's salary" only gets their own payroll, so title it "My payroll".
`;

export function systemPrompt(req: SpecRequest): string {
  return `You turn questions from staff of an education ERP into report specs. The question may be in English or Malayalam.${languageRule(req.language, '"reply" and "title"')}
${promptContext(req)}First decide "intent":
- "report" when the message asks for data you can build from these datasets (including follow-ups that change the previous report).
- "reply" for everything else, with a short, friendly answer in "reply" (1-3 sentences, plain text):
  • questions ABOUT the current report ("which branch is this?", "what dates does this cover?", "what does count mean?") → answer from the previous report's dataset, filters and grouping. Reports cover the data this user can access (see "Data access") unless a filter narrows them; say so when relevant.
  • data the datasets don't have (e.g. a field that isn't listed) → say it isn't available and suggest the closest report you CAN build.
  • greetings, thanks, off-topic or unclear messages → reply briefly and say what you can report on.
  Never invent numbers in a reply. When intent is "reply", fill the other required fields with anything; they are ignored.

How to build the spec (intent "report"):
${SPEC_RULES}${req.previousSpec ? `\nThis is a conversation. The previous report was:\n${JSON.stringify(req.previousSpec)}\nIf the new message is a follow-up ("only Chennai", "split by month", "top 5", "as a pie chart", "what about last year"), modify that report and keep everything the user doesn't ask to change. If it is a new topic, build a new report from scratch.` : ''}`;
}

export function responseSchema(datasetKeys: string[]) {
  const str = (description: string, extra: Record<string, unknown> = {}) => ({ type: 'string', description, ...extra });
  return {
    type: 'object',
    properties: {
      intent: str('"report" to build a report, "reply" to answer in text only', { enum: ['report', 'reply'] }),
      reply: str('Text answer to the user when intent is "reply"'),
      title: str('Report title'),
      dataset: str('Dataset key', { enum: datasetKeys }),
      mode: str('aggregate or list', { enum: ['aggregate', 'list'] }),
      metrics: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            agg: str('Aggregation', { enum: [...AGGS] }),
            field: str('Field key (omit for count)'),
            values: { type: 'array', items: { type: 'string' }, description: 'For count_if / percent_if: the values of `field` to count, e.g. ["absent"]' },
          },
          required: ['agg'],
        },
      },
      groupBy: { type: 'array', items: str('Groupable field key'), maxItems: 2 },
      timeBucket: {
        type: 'object',
        properties: { field: str('Date field key'), interval: str('Bucket size', { enum: [...INTERVALS] }) },
        required: ['field', 'interval'],
      },
      filters: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            field: str('Field key'),
            op: str('Operator', { enum: [...OPS] }),
            value: str('Value as text; dates as YYYY-MM-DD; booleans as true/false'),
            values: { type: 'array', items: { type: 'string' }, description: 'Values for op "in"' },
          },
          required: ['field', 'op'],
        },
      },
      columns: { type: 'array', items: str('Field key to show (list mode)') },
      sort: {
        type: 'object',
        properties: { by: str('Output column key'), dir: str('Direction', { enum: ['asc', 'desc'] }) },
        required: ['by', 'dir'],
      },
      limit: { type: 'integer', description: 'Max rows/groups', minimum: 1, maximum: 500 },
      chart: str('Chart type', { enum: [...CHARTS] }),
    },
    required: ['intent', 'title', 'dataset', 'mode', 'chart'],
    propertyOrdering: ['intent', 'reply', 'title', 'dataset', 'mode', 'metrics', 'groupBy', 'timeBucket', 'filters', 'columns', 'sort', 'limit', 'chart'],
  };
}

// ─── Gemini ────────────────────────────────────────────────────────────────────

let gemini: GoogleGenAI | null = null;
// Loaded on first use (not at server start): the SDK needs Node 22+, and AI reports
// must never be able to stop the rest of the API from booting.
let genai: typeof import('@google/genai') | null = null;

/**
 * GEMINI_MODEL may list several models separated by commas. They are tried in
 * order: if one is overloaded (503) or unavailable (404), the next one is used.
 */
const geminiModels = () =>
  (process.env.GEMINI_MODEL || 'gemini-3.1-flash-lite,gemini-3.5-flash-lite,gemini-3.5-flash')
    .split(',').map((m) => m.trim()).filter(Boolean);

const geminiGenerator: SpecGenerator = async (req) => {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new ReportError(503, 'AI reports are not configured (GEMINI_API_KEY missing)');
  if (!genai) {
    try {
      genai = await import('@google/genai');
    } catch (err) {
      console.error('[ai-reports] could not load @google/genai (needs Node 22+)', err);
      throw new ReportError(503, 'AI reports are unavailable on this server.');
    }
  }
  const { GoogleGenAI, ApiError, ThinkingLevel } = genai;
  gemini ??= new GoogleGenAI({
    apiKey,
    // Preview models (e.g. gemini-3.1-pro-preview) are only on v1beta
    apiVersion: process.env.GEMINI_API_VERSION || 'v1beta',
    // Fail fast and move to the next model instead of waiting on retries
    httpOptions: { retryOptions: { attempts: 1 } },
  });

  const models = geminiModels();
  let lastErr: unknown;
  for (const model of models) {
    // Minimal thinking is fastest; some models only accept LOW, so retry once with that
    const levels = model.startsWith('gemini-2.') ? [null] : [ThinkingLevel.MINIMAL, ThinkingLevel.LOW];
    for (const level of levels) {
      try {
        const res = await gemini.models.generateContent({
          model,
          contents: req.prompt,
          config: {
            // Hard per-model time limit: a stalled model must not hold the user up
            abortSignal: AbortSignal.timeout(MODEL_TIMEOUT_MS),
            systemInstruction: systemPrompt(req),
            responseMimeType: 'application/json',
            responseJsonSchema: responseSchema(req.datasetKeys),
            // Building a spec is a simple mapping task: little "thinking" cuts seconds off every request
            thinkingConfig: level ? { thinkingLevel: level } : { thinkingBudget: 0 },
          },
        });
        const text = res.text;
        if (!text) throw new ReportError(502, 'The AI returned an empty answer. Please rephrase and try again.');
        return JSON.parse(text);
      } catch (err) {
        lastErr = err;
        if (err instanceof ApiError) {
          console.error(`[ai-reports] Gemini API error (${model})`, err.status, err.message.slice(0, 300));
          if (err.status === 400 && /thinking level/i.test(err.message)) continue; // try the next thinking level
          if (err.status === 404 || err.status === 429 || err.status >= 500) break; // try the next model (each has its own quota)
        } else if (isTimeoutOrNetwork(err)) {
          console.error(`[ai-reports] Gemini ${model} timed out / network error — trying the next model`);
          break;
        }
        return failGemini(err, ApiError);
      }
    }
  }

  return failGemini(lastErr, ApiError);
};

const MODEL_TIMEOUT_MS = parseInt(process.env.GEMINI_MODEL_TIMEOUT_MS || '8000', 10);

function isTimeoutOrNetwork(err: unknown): boolean {
  const e = err as { name?: string; message?: string; cause?: unknown } | null;
  return !!e && (e.name === 'AbortError' || e.name === 'TimeoutError' || /abort|timed? ?out|fetch failed|ECONNRESET|ETIMEDOUT|socket/i.test(String(e.message)));
}

function failGemini(err: unknown, ApiError: typeof import('@google/genai').ApiError): never {
  if (isTimeoutOrNetwork(err)) throw new ReportError(504, 'The AI took too long to answer. Please try again.');
  if (err instanceof ReportError) throw err;
  if (err instanceof SyntaxError) throw new ReportError(502, 'The AI returned an invalid report. Please try again.');
  if (err instanceof ApiError) {
    if (err.status === 429) throw new ReportError(429, 'AI usage limit reached. Please try again in a minute.');
    if (err.status === 400 || err.status === 403) throw new ReportError(502, 'AI service rejected the request (check GEMINI_API_KEY / GEMINI_MODEL).');
    throw new ReportError(502, 'AI service is busy right now. Please try again in a moment.');
  }
  console.error('[ai-reports] Gemini call failed', err);
  throw new ReportError(502, 'AI service is unavailable. Please try again.');
}

// ─── Grok (xAI) ────────────────────────────────────────────────────────────────

const grokGenerator: SpecGenerator = async (req) => {
  // propertyOrdering is a Gemini-only keyword
  const { propertyOrdering: _ordering, ...schema } = responseSchema(req.datasetKeys);
  void _ordering;
  return grokChat(
    [{ role: 'system', content: systemPrompt(req) }, { role: 'user', content: req.prompt }],
    { schema },
  );
};

export const aiProvider = () => (process.env.AI_PROVIDER || (grokConfigured() ? 'grok' : 'gemini')).toLowerCase();

function getGenerator(): SpecGenerator {
  const provider = aiProvider();
  switch (provider) {
    case 'grok': return grokGenerator;
    case 'gemini': return geminiGenerator;
    default: throw new ReportError(503, `Unknown AI_PROVIDER: ${provider}`);
  }
}

export function generateReportSpec(req: SpecRequest): Promise<any> {
  return getGenerator()(req);
}

/** True when the AI may talk about report numbers (Grok only — never Gemini) */
export const talkBackEnabled = () => aiProvider() === 'grok' && grokConfigured();

/**
 * Conversational answer about a report, from its totals (see aiPayload in voice.ts).
 * Returns null when talk-back is off or the call fails — the client then shows its
 * built-in summary sentence instead.
 */
export async function generateAnswer(question: string, title: string, totals: unknown, scopeLabel?: string, language?: Language): Promise<string | null> {
  if (!talkBackEnabled()) return null;
  try {
    return await grokChat([
      {
        role: 'system',
        content: `You are a friendly analyst for an education ERP, talking to a staff member. Today is ${todayLocal()}. Currency is INR (use ₹ and Indian digit grouping, lakh/crore for large amounts).
${scopeLabel ? `The data covers what this user can see: ${scopeLabel}.
` : ''}Answer their question in 1-3 short sentences using ONLY the report totals provided. Lead with the key number or insight, then one useful observation (top/bottom item, trend, share). Never invent numbers or names; if the totals can't answer it, say so. Plain text, no markdown, no lists.${languageRule(language, 'your answer')}`,
      },
      { role: 'user', content: `Question: ${question}
Report: ${title}
Totals (JSON): ${JSON.stringify(totals)}` },
    ], { maxTokens: 300 });
  } catch (err) {
    console.error('[ai-reports] talk-back failed', err instanceof Error ? err.message : err);
    return null;
  }
}
