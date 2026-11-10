/**
 * AI Reports: server-side text-to-speech (Gemini TTS) for languages most devices
 * can't speak themselves — currently Malayalam.
 *
 * Only the short sentence to be spoken is sent (the app never puts student or staff
 * names in spoken text). Results are cached so repeated phrases play instantly.
 */
import { createHash } from 'crypto';
import type { GoogleGenAI } from '@google/genai';
import { ReportError } from './compiler.js';

const TTS_LANGS = (process.env.AI_TTS_LANGS || 'ml').split(',').map((s) => s.trim()).filter(Boolean);
const MAX_CHARS = 600;
// Audio clips are ~0.3–0.5 MB each: cap the cache by total size, not count
const CACHE_MAX_BYTES = parseInt(process.env.AI_TTS_CACHE_MB || '30', 10) * 1024 * 1024;
let cacheBytes = 0;

export const ttsLanguages = (): string[] => (process.env.GEMINI_API_KEY ? TTS_LANGS : []);

const models = () => (process.env.GEMINI_TTS_MODEL || 'gemini-3.8-flash-tts,gemini-3.1-flash-tts-preview').split(',').map((m) => m.trim()).filter(Boolean);

let client: GoogleGenAI | null = null;
const cache = new Map<string, Buffer>();

/** Raw 16-bit mono PCM → WAV (some models return audio/L16) */
function pcmToWav(pcm: Buffer, rate: number): Buffer {
  const h = Buffer.alloc(44);
  h.write('RIFF', 0); h.writeUInt32LE(36 + pcm.length, 4); h.write('WAVEfmt ', 8);
  h.writeUInt32LE(16, 16); h.writeUInt16LE(1, 20); h.writeUInt16LE(1, 22);
  h.writeUInt32LE(rate, 24); h.writeUInt32LE(rate * 2, 28); h.writeUInt16LE(2, 32); h.writeUInt16LE(16, 34);
  h.write('data', 36); h.writeUInt32LE(pcm.length, 40);
  return Buffer.concat([h, pcm]);
}

/** Returns WAV audio for `text` in `language` */
export async function synthesize(text: string, language: string): Promise<Buffer> {
  const clean = text.replace(/\s+/g, ' ').trim().slice(0, MAX_CHARS);
  if (!clean) throw new ReportError(400, 'Nothing to speak');
  if (!ttsLanguages().includes(language)) throw new ReportError(400, `Server voice is not enabled for "${language}"`);

  const key = createHash('sha256').update(`${language}|${process.env.GEMINI_TTS_VOICE || 'Kore'}|${clean}`).digest('hex');
  const hit = cache.get(key);
  if (hit) return hit;

  const genai = await import('@google/genai').catch(() => null);
  if (!genai) throw new ReportError(503, 'Server voice is unavailable on this server.');
  client ??= new genai.GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY!, apiVersion: 'v1beta', httpOptions: { retryOptions: { attempts: 1 } } });

  let lastErr: unknown;
  for (const model of models()) {
    try {
      const res = await client.models.generateContent({
        model,
        contents: clean,
        config: {
          abortSignal: AbortSignal.timeout(15_000),
          responseModalities: ['AUDIO'],
          speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: process.env.GEMINI_TTS_VOICE || 'Kore' } } },
        },
      });
      const part = res.candidates?.[0]?.content?.parts?.find((p) => p.inlineData?.data);
      if (!part?.inlineData?.data) throw new Error('no audio returned');
      const bytes = Buffer.from(part.inlineData.data, 'base64');
      const mime = part.inlineData.mimeType || '';
      const rate = Number(/rate=(\d+)/.exec(mime)?.[1]) || 24000;
      const wav = bytes.subarray(0, 4).toString() === 'RIFF' ? bytes : pcmToWav(bytes, rate);
      while (cache.size && cacheBytes + wav.length > CACHE_MAX_BYTES) {
        const oldest = cache.keys().next().value as string;
        cacheBytes -= cache.get(oldest)!.length;
        cache.delete(oldest);
      }
      if (wav.length <= CACHE_MAX_BYTES) { cache.set(key, wav); cacheBytes += wav.length; }
      return wav;
    } catch (err) {
      lastErr = err;
      console.error(`[ai-reports] TTS ${model} failed:`, err instanceof Error ? err.message.slice(0, 200) : err);
    }
  }
  if (lastErr instanceof ReportError) throw lastErr;
  throw new ReportError(502, 'Could not generate speech right now.');
}
