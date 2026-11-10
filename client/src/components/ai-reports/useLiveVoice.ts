/**
 * Live voice chat with Grok Voice (xAI realtime API).
 *
 * - The server mints a short-lived token (POST /ai-reports/voice/session); the API key
 *   never reaches the browser.
 * - Mic audio is streamed as 24 kHz PCM16; Grok's voice is played back as it arrives.
 * - Server-side voice detection: when the user starts talking, playback stops (barge-in).
 * - When Grok calls run_report, the arguments go to OUR server (POST /ai-reports/voice/tool),
 *   which runs the report with this user's access scope and returns totals for Grok.
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import api from '@/lib/api';
import type { Result } from './reportUtils';

export type LiveStatus = 'off' | 'connecting' | 'listening' | 'thinking' | 'speaking' | 'error';

interface Callbacks {
  onUserText?: (text: string, final: boolean) => void;
  onAssistantText?: (text: string, final: boolean) => void;
  onReport?: (result: Result) => void;
  onError?: (message: string) => void;
}

interface SessionInfo {
  token: string; model: string; voice: string; instructions: string; tools: unknown[]; maxSeconds: number; languageHint?: string;
}

/** Fields we read from realtime server events */
interface RtEvent {
  type: string;
  delta?: string;
  transcript?: string;
  call_id?: string;
  name?: string;
  arguments?: string;
  message?: string;
  error?: { message?: string };
}

const RATE = 24000;
// Overridable for local testing against a mock server
const XAI_REALTIME = import.meta.env.VITE_XAI_REALTIME_URL || 'wss://api.x.ai/v1/realtime';

// AudioWorklet that forwards raw mic samples to the main thread
const CAPTURE_WORKLET = `
class PcmCapture extends AudioWorkletProcessor {
  process(inputs) { const ch = inputs[0] && inputs[0][0]; if (ch) this.port.postMessage(ch.slice(0)); return true; }
}
registerProcessor('pcm-capture', PcmCapture);`;

function floatToPcm16Base64(chunks: Float32Array[]): string {
  const total = chunks.reduce((n, c) => n + c.length, 0);
  const buf = new ArrayBuffer(total * 2);
  const view = new DataView(buf);
  let o = 0;
  for (const c of chunks) for (let i = 0; i < c.length; i++, o += 2) {
    const s = Math.max(-1, Math.min(1, c[i]));
    view.setInt16(o, s < 0 ? s * 0x8000 : s * 0x7fff, true);
  }
  const bytes = new Uint8Array(buf);
  let bin = '';
  for (let i = 0; i < bytes.length; i += 0x8000) bin += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  return btoa(bin);
}

function pcm16Base64ToFloat(b64: string): Float32Array {
  const bin = atob(b64);
  const n = bin.length >> 1;
  const out = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    let v = bin.charCodeAt(i * 2) | (bin.charCodeAt(i * 2 + 1) << 8);
    if (v >= 0x8000) v -= 0x10000;
    out[i] = v / 0x8000;
  }
  return out;
}

const errText = (e: unknown, fallback: string) =>
  ((e as { response?: { data?: { message?: string } } })?.response?.data?.message) || fallback;

export function useLiveVoice(panel: string, callbacks: Callbacks, language: 'en' | 'ml' = 'en') {
  const [status, setStatus] = useState<LiveStatus>('off');
  const [muted, setMutedState] = useState(false);
  const cb = useRef(callbacks);
  useEffect(() => { cb.current = callbacks; });

  const ws = useRef<WebSocket | null>(null);
  const ctx = useRef<AudioContext | null>(null);
  const stream = useRef<MediaStream | null>(null);
  const micAnalyser = useRef<AnalyserNode | null>(null);
  const outAnalyser = useRef<AnalyserNode | null>(null);
  const outGain = useRef<GainNode | null>(null);
  const playhead = useRef(0);
  const sources = useRef<AudioBufferSourceNode[]>([]);
  const pending = useRef<Float32Array[]>([]);
  const mutedRef = useRef(false);
  const responseActive = useRef(false);
  const needResponse = useRef(false);
  const userPartial = useRef('');
  const assistantText = useRef('');
  const timers = useRef<number[]>([]);
  const statusRef = useRef<LiveStatus>('off');
  const levelBuf = useRef<Uint8Array | null>(null);

  const set = (s: LiveStatus) => { statusRef.current = s; setStatus(s); };
  const send = (msg: unknown) => { if (ws.current?.readyState === WebSocket.OPEN) ws.current.send(JSON.stringify(msg)); };

  const stopPlayback = () => {
    for (const s of sources.current) { try { s.stop(); } catch { /* already stopped */ } }
    sources.current = [];
    playhead.current = ctx.current?.currentTime ?? 0;
  };

  const play = (b64: string) => {
    const ac = ctx.current;
    if (!ac || !outGain.current) return;
    const samples = pcm16Base64ToFloat(b64);
    if (!samples.length) return;
    const buf = ac.createBuffer(1, samples.length, RATE);
    buf.copyToChannel(samples as Float32Array<ArrayBuffer>, 0);
    const src = ac.createBufferSource();
    src.buffer = buf;
    src.connect(outGain.current);
    const at = Math.max(ac.currentTime + 0.03, playhead.current);
    src.start(at);
    playhead.current = at + buf.duration;
    sources.current.push(src);
    src.onended = () => { sources.current = sources.current.filter((x) => x !== src); };
    if (statusRef.current !== 'speaking') set('speaking');
  };

  const stop = useCallback(() => {
    timers.current.forEach((t) => { window.clearTimeout(t); window.clearInterval(t); });
    timers.current = [];
    if (ws.current) { ws.current.onclose = null; ws.current.close(); ws.current = null; }
    stopPlayback();
    stream.current?.getTracks().forEach((t) => t.stop());
    stream.current = null;
    ctx.current?.close().catch(() => {});
    ctx.current = null;
    micAnalyser.current = outAnalyser.current = null;
    responseActive.current = needResponse.current = false;
    set('off');
  }, []);

  useEffect(() => stop, [stop]);

  const fail = (message: string) => {
    cb.current.onError?.(message);
    stop();
    set('error');
  };

  const runTool = async (callId: string, name: string, args: string) => {
    set('thinking');
    let output: unknown;
    try {
      const res = await api.post('/ai-reports/voice/tool', { panel, name, arguments: args });
      const data = res.data.data;
      const { forAI, ...result } = data;
      cb.current.onReport?.(result as Result);
      output = forAI;
    } catch (e) {
      output = { error: errText(e, 'The report could not be run.') };
    }
    send({ type: 'conversation.item.create', item: { type: 'function_call_output', call_id: callId, output: JSON.stringify(output) } });
    if (responseActive.current) needResponse.current = true;
    else send({ type: 'response.create' });
  };

  const onEvent = (e: RtEvent) => {
    switch (e.type) {
      case 'input_audio_buffer.speech_started':
        // Barge-in: the user talks over the AI → stop its voice right away
        stopPlayback();
        if (responseActive.current) send({ type: 'response.cancel' });
        userPartial.current = '';
        set('listening');
        break;
      case 'input_audio_buffer.speech_stopped':
        set('thinking');
        break;
      case 'conversation.item.input_audio_transcription.updated':
      case 'conversation.item.input_audio_transcription.delta':
        userPartial.current = e.transcript ?? (userPartial.current + (e.delta ?? ''));
        cb.current.onUserText?.(userPartial.current, false);
        break;
      case 'conversation.item.input_audio_transcription.completed':
        if (e.transcript?.trim()) cb.current.onUserText?.(String(e.transcript).trim(), true);
        userPartial.current = '';
        break;
      case 'response.created':
        responseActive.current = true;
        assistantText.current = '';
        break;
      case 'response.output_audio.delta':
      case 'response.audio.delta':
        if (e.delta) play(e.delta);
        break;
      case 'response.output_audio_transcript.delta':
      case 'response.audio_transcript.delta':
      case 'response.output_text.delta':
        assistantText.current += e.delta ?? '';
        cb.current.onAssistantText?.(assistantText.current, false);
        break;
      case 'response.output_audio_transcript.done':
      case 'response.audio_transcript.done':
        cb.current.onAssistantText?.(e.transcript ?? assistantText.current, true);
        assistantText.current = '';
        break;
      case 'response.function_call_arguments.done':
        void runTool(e.call_id ?? '', e.name ?? '', e.arguments ?? '{}');
        break;
      case 'response.done':
        responseActive.current = false;
        if (needResponse.current) { needResponse.current = false; send({ type: 'response.create' }); }
        break;
      case 'error': {
        const msg = e.error?.message ?? e.message ?? 'Voice error';
        console.warn('[live-voice]', msg, e);
        if (/auth|token|expired|unauthori/i.test(msg)) fail('The voice session expired. Tap the mic to start again.');
        break;
      }
    }
  };

  const start = useCallback(async () => {
    if (statusRef.current !== 'off' && statusRef.current !== 'error') return;
    set('connecting');
    let session: SessionInfo;
    try {
      session = (await api.post('/ai-reports/voice/session', { panel, language })).data.data;
    } catch (e) {
      fail(errText(e, 'Could not start voice chat.'));
      return;
    }

    // Audio graph: mic → analyser → capture worklet ; playback → gain → analyser → speakers
    try {
      stream.current = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true, channelCount: 1 } });
    } catch {
      fail('Microphone access is blocked. Allow it in the browser address bar and try again.');
      return;
    }
    const ac = new AudioContext({ sampleRate: RATE });
    ctx.current = ac;
    await ac.resume();
    const workletUrl = URL.createObjectURL(new Blob([CAPTURE_WORKLET], { type: 'application/javascript' }));
    await ac.audioWorklet.addModule(workletUrl);
    URL.revokeObjectURL(workletUrl);
    const mic = ac.createMediaStreamSource(stream.current);
    micAnalyser.current = ac.createAnalyser();
    micAnalyser.current.fftSize = 512;
    const capture = new AudioWorkletNode(ac, 'pcm-capture');
    mic.connect(micAnalyser.current);
    mic.connect(capture);
    outGain.current = ac.createGain();
    outAnalyser.current = ac.createAnalyser();
    outAnalyser.current.fftSize = 512;
    outGain.current.connect(outAnalyser.current);
    outAnalyser.current.connect(ac.destination);
    levelBuf.current = new Uint8Array(512);
    playhead.current = ac.currentTime;

    // ~100 ms chunks to the server
    capture.port.onmessage = (ev: MessageEvent<Float32Array>) => {
      if (mutedRef.current || ws.current?.readyState !== WebSocket.OPEN) return;
      pending.current.push(ev.data);
      if (pending.current.reduce((n, c) => n + c.length, 0) >= RATE / 10) {
        send({ type: 'input_audio_buffer.append', audio: floatToPcm16Base64(pending.current) });
        pending.current = [];
      }
    };

    const socket = new WebSocket(`${XAI_REALTIME}?model=${encodeURIComponent(session.model)}`, [`xai-client-secret.${session.token}`]);
    ws.current = socket;
    socket.onopen = () => {
      send({
        type: 'session.update',
        session: {
          voice: session.voice,
          instructions: session.instructions,
          turn_detection: { type: 'server_vad' },
          tools: session.tools,
          audio: {
            input: { format: { type: 'audio/pcm', rate: RATE }, transcription: { language_hint: session.languageHint || 'en' } },
            output: { format: { type: 'audio/pcm', rate: RATE } },
          },
        },
      });
      set('listening');
      // Greet so the user knows it's live
      send({ type: 'response.create' });
    };
    socket.onmessage = (m) => {
      if (typeof m.data !== 'string') return;
      try { onEvent(JSON.parse(m.data)); } catch { /* ignore malformed event */ }
    };
    socket.onerror = () => console.warn('[live-voice] socket error');
    socket.onclose = (ev) => {
      ws.current = null;
      if (statusRef.current !== 'off') fail(ev.code === 1000 ? 'Voice session ended.' : 'The voice connection dropped. Tap the mic to reconnect.');
    };

    // Speaking → listening when the queued audio has finished playing
    timers.current.push(window.setInterval(() => {
      if (statusRef.current === 'speaking' && ctx.current && ctx.current.currentTime > playhead.current + 0.1 && !responseActive.current) set('listening');
    }, 150));
    // Hard cap on session length (cost control)
    timers.current.push(window.setTimeout(() => fail('Voice session time limit reached. Tap the mic to start a new one.'), session.maxSeconds * 1000));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [panel, language]);

  const setMuted = useCallback((m: boolean) => { mutedRef.current = m; setMutedState(m); if (m) pending.current = []; }, []);

  /** 0..1 level for the orb: AI voice while speaking, otherwise the mic */
  const getLevel = useCallback(() => {
    const a = statusRef.current === 'speaking' ? outAnalyser.current : micAnalyser.current;
    const buf = levelBuf.current;
    if (!a || !buf || (mutedRef.current && statusRef.current !== 'speaking')) return 0;
    a.getByteTimeDomainData(buf as Uint8Array<ArrayBuffer>);
    let sum = 0;
    for (let i = 0; i < buf.length; i++) { const v = (buf[i] - 128) / 128; sum += v * v; }
    return Math.min(1, Math.sqrt(sum / buf.length) * 5);
  }, []);

  return { status, start, stop, muted, setMuted, getLevel };
}
