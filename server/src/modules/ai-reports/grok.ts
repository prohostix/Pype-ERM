/**
 * AI Reports: minimal xAI (Grok) client — chat completions and realtime voice tokens.
 * Uses the platform fetch (no SDK). Key: XAI_API_KEY (create at https://console.x.ai).
 *
 * Report results are only ever sent to Grok (never to Gemini), and only as totals
 * (see aiPayload in voice.ts).
 */
import { ReportError } from './compiler.js';

const XAI_BASE = 'https://api.x.ai/v1';

export const grokConfigured = () => !!process.env.XAI_API_KEY;
export const grokTextModel = () => process.env.XAI_MODEL || 'grok-4.7';
export const grokVoiceModel = () => process.env.XAI_VOICE_MODEL || 'grok-voice-3.0';
export const grokVoice = () => process.env.XAI_VOICE || 'eve';

async function xai(path: string, body: unknown, timeoutMs = 60_000): Promise<any> {
  const key = process.env.XAI_API_KEY;
  if (!key) throw new ReportError(503, 'Grok is not configured (XAI_API_KEY missing)');
  let res: Response;
  try {
    res = await fetch(`${XAI_BASE}${path}`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(timeoutMs),
    });
  } catch (err) {
    console.error('[ai-reports] Grok request failed', path, err);
    throw new ReportError(502, 'AI service is unavailable. Please try again.');
  }
  if (!res.ok) {
    const text = (await res.text().catch(() => '')).slice(0, 300);
    console.error(`[ai-reports] Grok API error ${res.status} ${path}`, text);
    if (res.status === 401 || res.status === 403 || (res.status === 400 && /api key/i.test(text))) {
      throw new ReportError(502, 'AI service rejected the request (check XAI_API_KEY).');
    }
    if (res.status === 429) throw new ReportError(429, 'AI usage limit reached. Please try again in a minute.');
    throw new ReportError(502, 'AI service is busy right now. Please try again in a moment.');
  }
  return res.json();
}

type ChatMessage = { role: 'system' | 'user' | 'assistant'; content: string };

/** Chat completion. With `schema`, the reply is parsed as JSON matching it. */
export async function grokChat(messages: ChatMessage[], opts: { schema?: object; maxTokens?: number } = {}): Promise<any> {
  const data = await xai('/chat/completions', {
    model: grokTextModel(),
    messages,
    ...(opts.maxTokens ? { max_tokens: opts.maxTokens } : {}),
    ...(opts.schema ? { response_format: { type: 'json_schema', json_schema: { name: 'report_spec', schema: opts.schema } } } : {}),
  });
  const text: string | undefined = data?.choices?.[0]?.message?.content;
  if (!text) throw new ReportError(502, 'The AI returned an empty answer. Please rephrase and try again.');
  if (!opts.schema) return text.trim();
  try {
    return JSON.parse(text);
  } catch {
    throw new ReportError(502, 'The AI returned an invalid report. Please try again.');
  }
}

/**
 * Short-lived token for the browser's realtime voice WebSocket, so the API key
 * never reaches the browser. Browser connects with subprotocol `xai-client-secret.<value>`.
 */
export async function mintVoiceToken(seconds = 300): Promise<{ value: string; expiresAt: number }> {
  const data = await xai('/realtime/client_secrets', { expires_after: { seconds } }, 15_000);
  if (!data?.value) throw new ReportError(502, 'Could not start a voice session.');
  return { value: String(data.value), expiresAt: Number(data.expires_at) || 0 };
}
