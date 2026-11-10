/**
 * AI Reports: HTTP endpoints (mounted at /api/v1/ai-reports)
 *
 *   GET  /catalog?panel=finance   datasets + suggested questions for the panel
 *   POST /generate                { panel, prompt, previousSpec? }  → AI builds the spec, server runs it
 *   POST /run                     { panel, spec }                   → re-run an edited spec, no AI call
 *   POST /voice/session           { panel }                         → short-lived Grok Voice token + session setup
 *   POST /voice/tool              { panel, name, arguments }        → run_report called by the live voice AI
 *   POST /tts                     { text, language }                → spoken audio (WAV) for languages devices lack (Malayalam)
 *
 * Every request builds the user's access context (access.ts) from the login token;
 * the panel only picks which datasets are offered. superadmin is not allowed.
 */
import express, { Response } from 'express';
import rateLimit from 'express-rate-limit';
import { protect, AuthRequest } from '../../middleware/auth.js';
import prisma from '../../lib/prisma.js';
import { SUGGESTIONS, datasetsFor, describeDatasets } from './datasets.js';
import { ReportError, runSpec, validateSpec } from './compiler.js';
import { generateAnswer, generateReportSpec, parseLanguage, talkBackEnabled } from './provider.js';
import { aiPayload, voiceSession } from './voice.js';
import { mintVoiceToken } from './grok.js';
import { synthesize, ttsLanguages } from './tts.js';
import { AccessError, accessLabel, buildContext } from './access.js';

const router = express.Router();
router.use(protect);

// AI calls cost money: limit per user (not per IP)
const generateLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: parseInt(process.env.AI_REPORTS_PER_USER_PER_HOUR || '60', 10),
  keyGenerator: (req) => (req as AuthRequest).user?.id || 'anonymous',
  standardHeaders: true,
  legacyHeaders: false,
  handler: (_req, res) => {
    res.status(429).json({ success: false, message: 'You have reached the hourly limit for AI reports. Please try again later.' });
  },
});

const perUserLimiter = (max: number, message: string) => rateLimit({
  windowMs: 60 * 60 * 1000,
  max,
  keyGenerator: (req) => (req as AuthRequest).user?.id || 'anonymous',
  standardHeaders: true,
  legacyHeaders: false,
  handler: (_req, res) => { res.status(429).json({ success: false, message }); },
});
// Live voice costs per minute: limit how many sessions a user can start per hour
const voiceSessionLimiter = perUserLimiter(parseInt(process.env.AI_VOICE_SESSIONS_PER_HOUR || '20', 10), 'You have reached the hourly limit for voice sessions. Please try again later.');
const ttsLimiter = perUserLimiter(parseInt(process.env.AI_TTS_PER_USER_PER_HOUR || '300', 10), 'You have reached the hourly limit for spoken answers.');
const voiceToolLimiter = perUserLimiter(parseInt(process.env.AI_VOICE_REPORTS_PER_HOUR || '120', 10), 'You have reached the hourly limit for voice reports.');

// ─── Spec cache ─────────────────────────────────────────────────────────────────
// The AI's spec depends only on the question, today's date, the follow-up context and
// which datasets/scope description the user has — never on data. Repeated questions
// (e.g. suggestion chips) skip the AI; the query itself always runs fresh with the
// user's own scope.
const SPEC_TTL_MS = 10 * 60 * 1000;
const specCache = new Map<string, { at: number; raw: any }>();
function cachedSpec(key: string) {
  const hit = specCache.get(key);
  if (hit && Date.now() - hit.at < SPEC_TTL_MS) return hit.raw;
  if (hit) specCache.delete(key);
  return undefined;
}
function storeSpec(key: string, raw: any) {
  if (specCache.size >= 500) specCache.delete(specCache.keys().next().value as string);
  specCache.set(key, { at: Date.now(), raw });
}

const panelOf = (v: unknown) => (typeof v === 'string' && /^[a-z_]{1,40}$/.test(v) ? v : '');

function sendError(res: Response, err: unknown) {
  if (err instanceof ReportError || err instanceof AccessError) {
    res.status(err.status).json({ success: false, message: err.message });
    return;
  }
  console.error('[ai-reports] error', err);
  res.status(500).json({ success: false, message: 'Could not build the report. Please try again.' });
}

function audit(req: AuthRequest, action: string, detail: Record<string, unknown>) {
  if (!req.user?.organizationId || req.user.role === 'faculty') return; // faculty are not User rows
  prisma.auditLog.create({
    data: {
      organizationId: req.user.organizationId,
      userId: req.user.id,
      action,
      entityType: 'ai_report',
      entityId: String(detail.dataset ?? 'none'),
      newValue: detail as any,
      ipAddress: req.ip || '0.0.0.0',
    },
  }).catch((e) => console.error('[ai-reports] audit log error', e));
}

router.get('/catalog', async (req: AuthRequest, res: Response) => {
  const panel = panelOf(req.query.panel);
  let allowed: ReturnType<typeof datasetsFor> = {};
  try {
    allowed = datasetsFor(panel, await buildContext(req.user));
  } catch (err) {
    if (!(err instanceof AccessError)) { sendError(res, err); return; }
  }
  res.json({
    success: true,
    data: {
      datasets: Object.entries(allowed).map(([key, d]) => ({
        key,
        label: d.label,
        description: d.description,
        fields: Object.entries(d.fields).map(([fk, f]) => ({ key: fk, label: f.label, type: f.type, values: f.values ?? f.hints })),
      })),
      suggestions: Object.keys(allowed).length ? SUGGESTIONS[panel] ?? [] : [],
      /** Live voice + spoken answers need Grok (report totals never go to Gemini) */
      liveVoice: talkBackEnabled(),
      /** Languages the server can speak (sent to Gemini TTS: the sentence only) */
      serverVoice: ttsLanguages(),
    },
  });
});

router.post('/generate', generateLimiter, async (req: AuthRequest, res: Response) => {
  const started = Date.now();
  const panel = panelOf(req.body?.panel);
  const prompt = typeof req.body?.prompt === 'string' ? req.body.prompt.trim() : '';
  const language = parseLanguage(req.body?.language);
  try {
    if (!prompt) throw new ReportError(400, 'Please type a question');
    if (prompt.length > 1000) throw new ReportError(400, 'Question is too long (max 1000 characters)');

    const ctx = await buildContext(req.user);
    const allowed = datasetsFor(panel, ctx);
    if (Object.keys(allowed).length === 0) throw new ReportError(403, 'AI reports are not available for your role in this panel');

    const previousSpec = req.body?.previousSpec && typeof req.body.previousSpec === 'object' ? req.body.previousSpec : undefined;
    const cacheKey = JSON.stringify([new Date().toISOString().slice(0, 10), language, Object.keys(allowed), ctx.scopeLabel, prompt.toLowerCase().replace(/\s+/g, ' '), previousSpec ?? null]);
    let raw = cachedSpec(cacheKey);
    const cached = raw !== undefined;
    if (!cached) {
      raw = await generateReportSpec({
        prompt,
        catalog: describeDatasets(allowed),
        datasetKeys: Object.keys(allowed),
        scopeLabel: ctx.scopeLabel,
        previousSpec,
        language,
      });
      storeSpec(cacheKey, raw);
    }
    const aiMs = Date.now() - started;

    // Text-only answer (question about the report, unsupported data, small talk): don't run anything
    if (raw?.intent !== 'report') {
      const reply = String(raw?.reply || raw?.clarify || '').trim()
        || `I can build reports on ${Object.values(allowed).map((d) => d.label.toLowerCase()).join(', ')}. What would you like to see?`;
      audit(req, 'AI_REPORT_REPLY', { panel, prompt, ms: Date.now() - started });
      res.json({ success: true, data: { clarify: reply } });
      return;
    }

    const { spec, ds } = validateSpec(raw, allowed);
    const dbStart = Date.now();
    const result = await runSpec(spec, ds, ctx);
    const dbMs = Date.now() - dbStart;
    // Talk-back: Grok explains the totals (null when Grok is off → client shows its summary)
    const answerStart = Date.now();
    const answer = await generateAnswer(prompt, spec.title, aiPayload(spec, result), ctx.scopeLabel, language);
    const timings = { aiMs, dbMs, answerMs: answer ? Date.now() - answerStart : 0, totalMs: Date.now() - started, cached };
    console.log(`[ai-reports] ${spec.dataset} ai=${aiMs}ms${cached ? ' (cached)' : ''} db=${dbMs}ms (${result.meta.scannedRows} rows) answer=${timings.answerMs}ms total=${timings.totalMs}ms`);
    audit(req, 'AI_REPORT_GENERATE', { panel, prompt, dataset: spec.dataset, rows: result.rows.length, totalsSentToAI: !!answer, ...timings });
    res.setHeader('Server-Timing', `ai;dur=${aiMs}, db;dur=${dbMs}, answer;dur=${timings.answerMs}`);
    res.json({ success: true, data: { spec, ...result, answer: answer ?? undefined, timings, access: accessLabel(ctx, ds.scope(ctx)) } });
  } catch (err) {
    audit(req, 'AI_REPORT_ERROR', { panel, prompt, error: err instanceof Error ? err.message : String(err) });
    sendError(res, err);
  }
});

router.post('/run', async (req: AuthRequest, res: Response) => {
  const panel = panelOf(req.body?.panel);
  try {
    const ctx = await buildContext(req.user);
    const { spec, ds } = validateSpec(req.body?.spec, datasetsFor(panel, ctx));
    const result = await runSpec(spec, ds, ctx);
    res.json({ success: true, data: { spec, ...result, access: accessLabel(ctx, ds.scope(ctx)) } });
  } catch (err) {
    sendError(res, err);
  }
});

router.post('/voice/session', voiceSessionLimiter, async (req: AuthRequest, res: Response) => {
  const panel = panelOf(req.body?.panel);
  try {
    if (!talkBackEnabled()) throw new ReportError(503, 'Live voice needs Grok to be configured (XAI_API_KEY).');
    const ctx = await buildContext(req.user);
    const allowed = datasetsFor(panel, ctx);
    if (Object.keys(allowed).length === 0) throw new ReportError(403, 'AI reports are not available for your role in this panel');
    const session = voiceSession({ allowed, catalog: describeDatasets(allowed), scopeLabel: ctx.scopeLabel, userName: req.user.name, language: parseLanguage(req.body?.language) });
    const token = await mintVoiceToken(300);
    audit(req, 'AI_VOICE_SESSION', { panel, dataset: 'voice' });
    res.json({ success: true, data: { token: token.value, expiresAt: token.expiresAt, ...session } });
  } catch (err) {
    sendError(res, err);
  }
});

router.post('/voice/tool', voiceToolLimiter, async (req: AuthRequest, res: Response) => {
  const panel = panelOf(req.body?.panel);
  try {
    if (req.body?.name !== 'run_report') throw new ReportError(400, `Unknown tool: ${String(req.body?.name)}`);
    let args = req.body?.arguments;
    if (typeof args === 'string') {
      try { args = JSON.parse(args); } catch { throw new ReportError(400, 'Invalid tool arguments'); }
    }
    const ctx = await buildContext(req.user);
    const { spec, ds } = validateSpec(args, datasetsFor(panel, ctx));
    const result = await runSpec(spec, ds, ctx);
    audit(req, 'AI_VOICE_REPORT', { panel, dataset: spec.dataset, rows: result.rows.length, totalsSentToAI: true });
    res.json({ success: true, data: { spec, ...result, access: accessLabel(ctx, ds.scope(ctx)), forAI: aiPayload(spec, result) } });
  } catch (err) {
    sendError(res, err);
  }
});

router.post('/tts', ttsLimiter, async (req: AuthRequest, res: Response) => {
  try {
    await buildContext(req.user); // same role gate as every AI report request
    const text = typeof req.body?.text === 'string' ? req.body.text : '';
    if (text.length > 1000) throw new ReportError(400, 'Text too long');
    const wav = await synthesize(text, parseLanguage(req.body?.language));
    res.setHeader('Content-Type', 'audio/wav');
    res.setHeader('Cache-Control', 'private, max-age=600');
    res.send(wav);
  } catch (err) {
    sendError(res, err);
  }
});

export default router;
