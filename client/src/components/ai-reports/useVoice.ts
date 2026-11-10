/**
 * Browser voice: speech-to-text (Web Speech API), text-to-speech (speechSynthesis)
 * and a 0..1 audio level for the orb. No server or AI cost.
 * Speech recognition works in Chrome, Edge and Safari (not Firefox) and needs
 * HTTPS or localhost.
 */
import { useCallback, useEffect, useRef, useState } from 'react';

type EndReason = 'final' | 'no-speech' | 'aborted' | 'denied' | 'error';

// Minimal Web Speech API types (not in TypeScript's DOM lib)
interface RecognitionResultEvent { results: ArrayLike<{ isFinal: boolean; 0: { transcript: string } }> }
interface RecognitionErrorEvent { error: string }
interface Recognition {
  lang: string; interimResults: boolean; continuous: boolean; maxAlternatives: number;
  onresult: ((e: RecognitionResultEvent) => void) | null;
  onerror: ((e: RecognitionErrorEvent) => void) | null;
  onend: (() => void) | null;
  start(): void; stop(): void; abort(): void;
}
type RecognitionCtor = new () => Recognition;
const SR: RecognitionCtor | undefined = typeof window !== 'undefined'
  ? (window as unknown as { SpeechRecognition?: RecognitionCtor; webkitSpeechRecognition?: RecognitionCtor }).SpeechRecognition
    ?? (window as unknown as { webkitSpeechRecognition?: RecognitionCtor }).webkitSpeechRecognition
  : undefined;

/** Fetches spoken audio for `text` from the server (used when the device has no voice for the language) */
export type RemoteSpeak = (text: string, signal: AbortSignal) => Promise<Blob>;

export function useVoice(lang = 'en-IN', remote?: RemoteSpeak) {
  const sttSupported = !!SR;
  const ttsSupported = typeof window !== 'undefined' && 'speechSynthesis' in window;

  const [listening, setListening] = useState(false);
  const [speaking, setSpeaking] = useState(false);
  const [interim, setInterim] = useState('');
  /** A voice exists for this language on this device (English always falls back to the default voice) */
  const [hasVoice, setHasVoice] = useState(lang.startsWith('en'));

  const recRef = useRef<Recognition | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const bufRef = useRef<Uint8Array | null>(null);
  const speakBoostRef = useRef(0);
  const speakingRef = useRef(false);
  const voiceRef = useRef<SpeechSynthesisVoice | null>(null);
  const remoteRef = useRef(remote);
  useEffect(() => { remoteRef.current = remote; }, [remote]);
  const audioEl = useRef<HTMLAudioElement | null>(null);
  const fetchAbort = useRef<AbortController | null>(null);
  const audioCache = useRef(new Map<string, Blob>());

  // Pick a voice for the language (voices load asynchronously in Chrome)
  useEffect(() => {
    if (!ttsSupported) return;
    const pick = () => {
      const voices = window.speechSynthesis.getVoices();
      const base = lang.split('-')[0];
      voiceRef.current =
        voices.find((v) => v.lang === lang && /google|natural|neural/i.test(v.name)) ||
        voices.find((v) => v.lang === lang) ||
        voices.find((v) => v.lang.startsWith(base) && /google|natural|neural|samantha/i.test(v.name)) ||
        voices.find((v) => v.lang.startsWith(base)) || null;
      setHasVoice(base === 'en' || !!voiceRef.current || !!remoteRef.current);
    };
    pick();
    window.speechSynthesis.addEventListener('voiceschanged', pick);
    return () => window.speechSynthesis.removeEventListener('voiceschanged', pick);
  }, [lang, ttsSupported]);

  /** Microphone level meter (kept open for the whole voice session to avoid re-prompting) */
  const ensureMeter = useCallback(async () => {
    if (streamRef.current) return;
    const stream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true } });
    streamRef.current = stream;
    const ctx = new AudioContext();
    const analyser = ctx.createAnalyser();
    analyser.fftSize = 512;
    ctx.createMediaStreamSource(stream).connect(analyser);
    audioCtxRef.current = ctx;
    analyserRef.current = analyser;
    bufRef.current = new Uint8Array(analyser.fftSize);
  }, []);

  const stopSpeaking = useCallback(() => {
    fetchAbort.current?.abort();
    fetchAbort.current = null;
    audioEl.current?.pause();
    if (ttsSupported) window.speechSynthesis.cancel();
    speakingRef.current = false;
    setSpeaking(false);
  }, [ttsSupported]);

  /** Listen for one utterance. onFinal gets the recognised text; onEnd fires when nothing usable was heard. */
  const listen = useCallback(async (onFinal: (text: string) => void, onEnd?: (reason: EndReason) => void) => {
    if (!SR) { onEnd?.('error'); return; }
    stopSpeaking();
    recRef.current?.abort();
    try {
      await ensureMeter();
    } catch {
      onEnd?.('denied');
      return;
    }
    const rec = new SR();
    rec.lang = lang;
    rec.interimResults = true;
    rec.continuous = false;
    rec.maxAlternatives = 1;
    let finalText = '';
    let reason: EndReason = 'no-speech';

    rec.onresult = (e) => {
      let text = '';
      for (let i = 0; i < e.results.length; i++) {
        text += e.results[i][0].transcript;
        if (e.results[i].isFinal) finalText = text;
      }
      setInterim(text);
    };
    rec.onerror = (e) => {
      reason = e.error === 'not-allowed' || e.error === 'service-not-allowed' ? 'denied'
        : e.error === 'no-speech' ? 'no-speech'
        : e.error === 'aborted' ? 'aborted' : 'error';
    };
    rec.onend = () => {
      recRef.current = null;
      setListening(false);
      const text = finalText.trim();
      if (text) onFinal(text);
      else onEnd?.(reason);
    };
    recRef.current = rec;
    setInterim('');
    setListening(true);
    rec.start();
  }, [lang, ensureMeter, stopSpeaking]);

  /** Stop listening and use what was heard so far */
  const stopListening = useCallback(() => recRef.current?.stop(), []);

  /** Call from a tap/click: lets later server audio play (iOS/Safari autoplay rules) */
  const unlockAudio = useCallback(() => {
    if (!audioEl.current) audioEl.current = new Audio();
    const a = audioEl.current;
    a.muted = true;
    a.play().catch(() => {}).finally(() => { a.pause(); a.muted = false; });
  }, []);

  /** Fetch (and cache) server audio for a phrase without playing it */
  const preload = useCallback((text: string) => {
    const r = remoteRef.current;
    if (!r || audioCache.current.has(text)) return;
    r(text, new AbortController().signal).then((b) => audioCache.current.set(text, b)).catch(() => {});
  }, []);

  const speakRemote = useCallback((text: string, onDone?: () => void) => {
    stopSpeaking();
    const ctrl = new AbortController();
    fetchAbort.current = ctrl;
    speakingRef.current = true;
    setSpeaking(true);
    const finish = () => {
      if (!speakingRef.current) return;
      speakingRef.current = false;
      setSpeaking(false);
      onDone?.();
    };
    const cached = audioCache.current.get(text);
    (cached ? Promise.resolve(cached) : remoteRef.current!(text, ctrl.signal))
      .then((blob) => {
        if (ctrl.signal.aborted) return;
        if (audioCache.current.size > 50) audioCache.current.delete(audioCache.current.keys().next().value as string);
        audioCache.current.set(text, blob);
        if (!audioEl.current) audioEl.current = new Audio();
        const a = audioEl.current;
        const url = URL.createObjectURL(blob);
        a.src = url;
        a.onended = () => { URL.revokeObjectURL(url); finish(); };
        a.onerror = () => { URL.revokeObjectURL(url); finish(); };
        speakBoostRef.current = 0.4;
        a.play().catch(finish);
      })
      .catch(() => { if (!ctrl.signal.aborted) finish(); });
  }, [stopSpeaking]);

  const speak = useCallback((text: string, onDone?: () => void) => {
    if (remoteRef.current && text) { speakRemote(text, onDone); return; }
    // No voice for this language (e.g. Malayalam on a Mac): don't read it in an English voice
    if (!ttsSupported || !text || (!lang.startsWith('en') && !voiceRef.current)) { onDone?.(); return; }
    window.speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(text);
    u.lang = lang;
    if (voiceRef.current) u.voice = voiceRef.current;
    u.rate = 1.02;
    u.onstart = () => { speakingRef.current = true; setSpeaking(true); };
    u.onboundary = () => { speakBoostRef.current = 0.45; };
    const finish = () => {
      if (!speakingRef.current) return; // cancelled
      speakingRef.current = false;
      setSpeaking(false);
      onDone?.();
    };
    u.onend = finish;
    u.onerror = finish;
    speakingRef.current = true;
    setSpeaking(true);
    window.speechSynthesis.speak(u);
  }, [lang, ttsSupported, speakRemote]);

  /** Release mic + audio + speech (call when voice mode closes) */
  const release = useCallback(() => {
    recRef.current?.abort();
    recRef.current = null;
    stopSpeaking();
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    audioCtxRef.current?.close().catch(() => {});
    audioCtxRef.current = null;
    analyserRef.current = null;
    setListening(false);
    setInterim('');
  }, [stopSpeaking]);

  useEffect(() => release, [release]);

  /** 0..1 level for the orb: mic RMS while listening, a synthetic pulse while speaking */
  const getLevel = useCallback(() => {
    if (speakingRef.current) {
      const t = performance.now() / 1000;
      speakBoostRef.current *= 0.92;
      return 0.25 + 0.3 * Math.abs(Math.sin(t * 8.5) * Math.sin(t * 3.3)) + speakBoostRef.current;
    }
    const analyser = analyserRef.current, buf = bufRef.current;
    if (!analyser || !buf) return 0;
    analyser.getByteTimeDomainData(buf as Uint8Array<ArrayBuffer>);
    let sum = 0;
    for (let i = 0; i < buf.length; i++) { const v = (buf[i] - 128) / 128; sum += v * v; }
    return Math.min(1, Math.sqrt(sum / buf.length) * 5);
  }, []);

  return { sttSupported, ttsSupported: ttsSupported || !!remote, hasVoice: hasVoice || !!remote, unlockAudio, preload, listening, speaking, interim, listen, stopListening, speak, stopSpeaking, release, getLevel };
}
