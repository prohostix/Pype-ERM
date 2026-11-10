/**
 * AI Reports chat: drop into any panel with <AIReportBuilder panel="finance" />.
 *
 * Text chat: each question goes to POST /ai-reports/generate together with the
 * previous report's spec, so follow-ups ("only Chennai", "by month") refine it.
 * Voice mode: full-screen orb; listen → think → speak the summary → listen again.
 * Removing a filter chip re-runs with POST /ai-reports/run (no AI call).
 */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Mic, Send, X, RotateCcw, Volume2, Square, MicOff, IndianRupee, TrendingUp, GraduationCap, Wallet, Receipt, Trophy, Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';
import api from '@/lib/api';
import { isAxiosError } from 'axios';
import { AIOrb, OrbAvatar, type OrbState } from './AIOrb';
import { ReportCard } from './ReportView';
import { useVoice } from './useVoice';
import { useLiveVoice } from './useLiveVoice';
import { type Catalog, type Lang, type Result, type Spec, summarize } from './reportUtils';

interface Message {
  id: number;
  role: 'user' | 'assistant';
  text: string;
  speech?: string;
  result?: Result;
  pending?: boolean;
  error?: boolean;
}

let nextId = 1;

/** Spoken immediately after the question is heard (browser voice mode) */
const ACKS: Record<Lang, string[]> = {
  en: ['Let me check.', 'One moment.', 'Checking that now.', 'Sure, let me look.'],
  ml: ['ഒന്ന് നോക്കട്ടെ.', 'ഒരു നിമിഷം.', 'ഇപ്പോൾ നോക്കാം.'],
};

/** UI strings that change with the voice language */
const T: Record<Lang, Record<string, string>> = {
  en: { tap: 'Tap the orb to talk', connecting: 'Connecting…', listening: 'Listening…', muted: 'Muted · tap to unmute', thinking: 'Thinking…', speaking: 'Speaking…',
        greet: 'would you like to know?', ask: 'Ask in plain language', askVoice: ', type below or tap the orb to talk', placeholder: 'Ask about collections, enrollments, expenses…',
        followUp: 'Ask a follow-up, e.g. "only Chennai" or "split by month"', noVoice: '' },
  ml: { tap: 'സംസാരിക്കാൻ ഓർബിൽ തൊടൂ', connecting: 'കണക്റ്റ് ചെയ്യുന്നു…', listening: 'കേൾക്കുന്നു…', muted: 'മ്യൂട്ട് · അൺമ്യൂട്ട് ചെയ്യാൻ തൊടൂ', thinking: 'ആലോചിക്കുന്നു…', speaking: 'സംസാരിക്കുന്നു…',
        greet: 'എന്താണ് അറിയേണ്ടത്?', ask: 'മലയാളത്തിലോ ഇംഗ്ലീഷിലോ ചോദിക്കാം', askVoice: ', താഴെ ടൈപ്പ് ചെയ്യുകയോ ഓർബിൽ തൊട്ട് സംസാരിക്കുകയോ ചെയ്യൂ', placeholder: 'ഫീസ്, അഡ്മിഷൻ, ചെലവുകൾ… എന്നിവയെക്കുറിച്ച് ചോദിക്കൂ',
        followUp: 'തുടർചോദ്യം ചോദിക്കൂ, ഉദാ: "ചെന്നൈ മാത്രം" അല്ലെങ്കിൽ "മാസം തിരിച്ച്"', noVoice: 'ഈ ഉപകരണത്തിൽ മലയാളം ശബ്ദം ഇല്ല — മറുപടി ടെക്സ്റ്റായി കാണിക്കും.' },
};

function initialLang(): Lang {
  try { return localStorage.getItem('aiReportsLang') === 'ml' ? 'ml' : 'en'; } catch { return 'en'; }
}

const errMsg = (e: unknown, fallback: string): string =>
  (isAxiosError(e) && (e.response?.data as { message?: string } | undefined)?.message) || fallback;

function suggestionIcon(s: string) {
  const t = s.toLowerCase();
  if (/top \d|best|highest/.test(t)) return Trophy;
  if (/monthly|trend|line chart|over time/.test(t)) return TrendingUp;
  if (/wallet|top-up/.test(t)) return Wallet;
  if (/expense|claim|invoice/.test(t)) return Receipt;
  if (/enrol|admission|student/.test(t)) return GraduationCap;
  if (/fee|collection|payment|revenue/.test(t)) return IndianRupee;
  return Sparkles;
}

const hoverLevel = () => 0.28 + 0.12 * Math.sin(performance.now() / 260);

/** Hero orb size from the viewport (big, but leaves room for the text and suggestions) */
function useHeroSize() {
  const calc = () => (typeof window === 'undefined' ? 280 : Math.round(Math.max(170, Math.min(320, window.innerWidth * 0.62, window.innerHeight * 0.3))));
  const [size, setSize] = useState(calc);
  useEffect(() => {
    const onResize = () => setSize(calc());
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);
  return size;
}

function firstName(): string {
  try { return (JSON.parse(localStorage.getItem('user') || '{}').name || '').split(' ')[0]; } catch { return ''; }
}

export function AIReportBuilder({ panel }: { panel: string }) {
  const [catalog, setCatalog] = useState<Catalog | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [busy, setBusy] = useState(false);
  const [rerunning, setRerunning] = useState<number | null>(null);
  const [voiceOpen, setVoiceOpen] = useState(false);
  const [voiceHint, setVoiceHint] = useState<string | null>(null);
  const [voiceAnswer, setVoiceAnswer] = useState('');
  const [lastHeard, setLastHeard] = useState('');
  const [orbHover, setOrbHover] = useState(false);
  const [lang, setLangState] = useState<Lang>(initialLang);
  const langRef = useRef<Lang>(lang);
  langRef.current = lang;
  const setLang = (l: Lang) => {
    setLangState(l);
    try { localStorage.setItem('aiReportsLang', l); } catch { /* storage unavailable */ }
  };
  const t = T[lang];
  const heroSize = useHeroSize();

  const messagesRef = useRef<Message[]>([]);
  messagesRef.current = messages;
  const voiceOpenRef = useRef(false);
  voiceOpenRef.current = voiceOpen;
  const noSpeechRef = useRef(0);
  const endRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // Malayalam: speak with the server's voice (works on every device). Only the sentence is sent.
  const serverVoice = !!catalog?.serverVoice?.includes(lang);
  const remoteSpeak = useCallback(
    (text: string, signal: AbortSignal) =>
      api.post('/ai-reports/tts', { text, language: langRef.current }, { responseType: 'blob', signal }).then((r) => r.data as Blob),
    [],
  );
  const voice = useVoice(lang === 'ml' ? 'ml-IN' : 'en-IN', serverVoice ? remoteSpeak : undefined);
  const name = useMemo(firstName, []);

  useEffect(() => {
    api.get(`/ai-reports/catalog?panel=${panel}`)
      .then((r) => setCatalog(r.data.data))
      .catch(() => setCatalog({ datasets: [], suggestions: [] }));
  }, [panel]);

  useEffect(() => { endRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' }); }, [messages]);

  const fieldLabelFor = useCallback((dataset: string) => {
    const ds = catalog?.datasets.find((d) => d.key === dataset);
    return (key: string) => ds?.fields.find((f) => f.key === key)?.label ?? key;
  }, [catalog]);

  const patch = (id: number, m: Partial<Message>) =>
    setMessages((list) => list.map((x) => (x.id === id ? { ...x, ...m } : x)));

  /** Ask a question; resolves with the text to speak */
  const ask = useCallback(async (question: string): Promise<string> => {
    const q = question.trim();
    if (!q) return '';
    const previousSpec = [...messagesRef.current].reverse().find((m) => m.result)?.result?.spec;
    const pendingId = nextId++;
    setMessages((list) => [...list, { id: nextId++, role: 'user', text: q }, { id: pendingId, role: 'assistant', text: '', pending: true }]);
    setBusy(true);
    try {
      const res = await api.post('/ai-reports/generate', { panel, prompt: q, previousSpec, language: langRef.current });
      const data = res.data.data;
      if (data.clarify) {
        patch(pendingId, { pending: false, text: data.clarify, speech: data.clarify });
        return data.clarify;
      }
      const s = summarize(data, langRef.current);
      const answer: string | undefined = data.answer; // Grok talk-back (when configured)
      patch(pendingId, { pending: false, text: answer ?? s.text, speech: answer ?? s.speech, result: data });
      return answer ?? s.speech;
    } catch (e) {
      const msg = errMsg(e, 'Could not build the report. Please try again.');
      patch(pendingId, { pending: false, text: msg, speech: msg, error: true });
      return msg;
    } finally {
      setBusy(false);
    }
  }, [panel]);

  const send = () => {
    if (busy || !input.trim()) return;
    const q = input;
    setInput('');
    ask(q);
  };

  const rerun = async (id: number, spec: Spec) => {
    setRerunning(id);
    try {
      const res = await api.post('/ai-reports/run', { panel, spec });
      const s = summarize(res.data.data, langRef.current);
      patch(id, { result: res.data.data, text: s.text, speech: s.speech });
    } catch (e) {
      patch(id, { text: errMsg(e, 'Could not update the report.'), error: true });
    } finally {
      setRerunning(null);
    }
  };

  // ─── Live voice (Grok) ───────────────────────────────────────────────────────
  // Spoken turns become chat messages; reports Grok runs appear as cards.

  const liveMode = !!catalog?.liveVoice;
  const canVoice = liveMode || voice.sttSupported;
  const liveAssistantId = useRef<number | null>(null);
  const [liveUser, setLiveUser] = useState('');
  const [liveAssistant, setLiveAssistant] = useState('');

  const live = useLiveVoice(panel, {
    onUserText: (text, final) => {
      setLiveUser(text);
      if (final) {
        setMessages((l) => [...l, { id: nextId++, role: 'user', text }]);
        liveAssistantId.current = null;
      }
    },
    onAssistantText: (text, final) => {
      setLiveAssistant(text);
      const id = liveAssistantId.current;
      if (id === null) {
        const newId = nextId++;
        liveAssistantId.current = newId;
        setMessages((l) => [...l, { id: newId, role: 'assistant', text, speech: text }]);
      } else {
        patch(id, { text, speech: text });
      }
      if (final) liveAssistantId.current = null;
    },
    onReport: (result) => {
      const id = nextId++;
      liveAssistantId.current = id; // Grok's next sentence explains this report
      setMessages((l) => [...l, { id, role: 'assistant', text: '', result }]);
    },
    onError: (message) => setVoiceHint(message),
  }, lang);

  // ─── Voice loop (browser speech; used when Grok isn't configured) ────────────

  const startListening = useCallback(() => {
    setVoiceHint(null);
    voice.listen(
      async (text) => {
        noSpeechRef.current = 0;
        setLastHeard(text);
        setVoiceAnswer('');
        // Answer right away while the report runs, so there's no dead silence
        const acks = ACKS[langRef.current];
        const ack = acks[Math.floor(Math.random() * acks.length)];
        const ackDone = new Promise<void>((resolve) => voice.speak(ack, resolve));
        const speech = await ask(text);
        if (!voiceOpenRef.current) return;
        await Promise.race([ackDone, new Promise((r) => setTimeout(r, 1500))]);
        if (!voiceOpenRef.current) return;
        setVoiceAnswer(speech);
        voice.speak(speech, () => { if (voiceOpenRef.current) startListening(); });
      },
      (reason) => {
        if (!voiceOpenRef.current) return;
        if (reason === 'denied') setVoiceHint('Microphone access is blocked. Allow it in the browser address bar, then tap the orb.');
        else if (reason === 'no-speech' && ++noSpeechRef.current < 2) startListening();
        else if (reason !== 'aborted') setVoiceHint('Tap the orb to talk');
      },
    );
  }, [voice, ask]);

  const openVoice = () => {
    voice.stopSpeaking();
    voice.unlockAudio(); // this tap allows later spoken answers to play (iPhone/Safari)
    if (serverVoice) ACKS[langRef.current].forEach((a) => voice.preload(a)); // instant "one moment" phrases
    if (liveMode) {
      setVoiceHint(null); setLiveUser(''); setLiveAssistant('');
      setVoiceOpen(true);
      voiceOpenRef.current = true;
      void live.start();
      return;
    }
    noSpeechRef.current = 0;
    setLastHeard(''); setVoiceAnswer(''); setVoiceHint(null);
    setVoiceOpen(true);
    voiceOpenRef.current = true;
    startListening();
  };

  const closeVoice = useCallback(() => {
    voiceOpenRef.current = false;
    setVoiceOpen(false);
    voice.release();
    live.stop();
  }, [voice, live]);

  const orbTap = () => {
    if (liveMode) {
      if (live.status === 'off' || live.status === 'error') { setVoiceHint(null); void live.start(); }
      else live.setMuted(!live.muted);
      return;
    }
    if (busy) return;
    if (voice.listening) voice.stopListening();
    else { noSpeechRef.current = 0; startListening(); } // also interrupts speaking
  };

  useEffect(() => {
    if (!voiceOpen) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') closeVoice(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [voiceOpen, closeVoice]);

  const liveOrb: OrbState = live.muted ? 'idle'
    : live.status === 'listening' ? 'listening'
    : live.status === 'speaking' ? 'speaking'
    : live.status === 'thinking' || live.status === 'connecting' ? 'thinking' : 'idle';
  const orbState: OrbState = liveMode ? liveOrb
    : voice.listening ? 'listening' : busy ? 'thinking' : voice.speaking ? 'speaking' : 'idle';
  const status = voiceHint ?? (liveMode
    ? { off: t.tap, error: t.tap, connecting: t.connecting, listening: live.muted ? t.muted : t.listening, thinking: t.thinking, speaking: t.speaking }[live.status]
    : { listening: t.listening, thinking: t.thinking, speaking: t.speaking, idle: t.tap }[orbState]);
  // Browser voice mode without a Malayalam voice on this device: say so once
  const noVoiceHint = !liveMode && !voice.hasVoice ? t.noVoice : '';
  const caption = liveMode
    ? (live.status === 'speaking' ? liveAssistant : liveUser)
    : voice.listening ? voice.interim : busy ? lastHeard : voiceAnswer || lastHeard;
  const micActive = liveMode ? live.status !== 'off' && live.status !== 'error' && !live.muted : voice.listening;
  const voiceLevel = liveMode ? live.getLevel : voice.getLevel;

  // ─── Render ──────────────────────────────────────────────────────────────────

  if (catalog && catalog.datasets.length === 0) {
    return (
      <div className="m-4 rounded-xl border p-8 text-center text-muted-foreground">
        AI reports are not available for your role in this panel yet.
      </div>
    );
  }

  const empty = messages.length === 0;
  const chatOrbState: OrbState = busy ? 'thinking' : voice.speaking ? 'speaking' : 'idle';
  const chatStatus = { thinking: 'Analysing your data…', speaking: 'Speaking…', idle: 'Ready · ask a follow-up', listening: 'Listening…' }[chatOrbState];

  return (
    <>
      <div
        {...(empty ? { 'data-orb-dark': '' } : {})}
        className={cn(
          'relative flex h-[calc(100dvh-9rem)] min-h-[600px] flex-col overflow-hidden rounded-2xl border',
          empty ? 'border-white/10 bg-[#03040b] text-white' : 'bg-card',
        )}
      >
        {/* Stage background (welcome screen) */}
        {empty && (
          <div aria-hidden className="pointer-events-none absolute inset-0">
            <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_50%_32%,rgba(56,130,246,0.22),transparent_58%)]" />
            <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_50%_105%,rgba(168,85,247,0.18),transparent_55%)]" />
            <div
              className="absolute inset-0"
              style={{
                backgroundImage: 'radial-gradient(rgba(255,255,255,0.07) 1px, transparent 1px)',
                backgroundSize: '22px 22px',
                maskImage: 'radial-gradient(ellipse at 50% 40%, black 25%, transparent 72%)',
                WebkitMaskImage: 'radial-gradient(ellipse at 50% 40%, black 25%, transparent 72%)',
              }}
            />
          </div>
        )}

        {/* Header */}
        {empty ? (
          <div className="relative flex items-center gap-2 px-5 pt-4 text-xs font-medium text-white/60">
            <OrbAvatar className="h-5 w-5" /> AI Assistant <ExperimentalTag />
            <span className="rounded-full border border-white/10 px-2 py-0.5 text-[10px] uppercase tracking-wider text-white/45">{panel.replace('_', ' ')}</span>
            <span className="ml-auto"><LangToggle lang={lang} onChange={(l) => { voice.stopSpeaking(); setLang(l); }} disabled={voiceOpen} /></span>
          </div>
        ) : (
          <div data-orb-dark className="relative flex items-center justify-between gap-3 overflow-hidden bg-[#03040b] px-3 py-2 text-white sm:px-4">
            <div aria-hidden className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_8%_50%,rgba(56,130,246,0.28),transparent_45%)]" />
            <div className="relative flex min-w-0 items-center gap-2">
              <AIOrb size={58} state={chatOrbState} getLevel={voice.getLevel} onClick={canVoice ? openVoice : undefined} label="Start voice chat" />
              <div className="min-w-0">
                <div className="flex items-center gap-1.5 text-sm font-semibold leading-tight">AI Assistant <ExperimentalTag /></div>
                <div className={cn('truncate text-xs', busy ? 'text-sky-300' : 'text-white/55')} aria-live="polite">{chatStatus}</div>
              </div>
            </div>
            <div className="relative flex items-center gap-1">
              <LangToggle lang={lang} onChange={(l) => { voice.stopSpeaking(); setLang(l); }} disabled={voiceOpen} />
              {canVoice && (
                <button
                  onClick={openVoice}
                  disabled={busy}
                  className="flex h-9 items-center gap-1.5 rounded-full border border-white/15 bg-white/5 px-3 text-xs font-medium text-white/85 transition hover:bg-white/10 disabled:opacity-40"
                >
                  <Mic className="h-3.5 w-3.5" /> <span className="hidden sm:inline">Talk</span>
                </button>
              )}
              <button
                onClick={() => { voice.stopSpeaking(); setMessages([]); }}
                disabled={busy}
                className="flex h-9 items-center gap-1.5 rounded-full px-3 text-xs font-medium text-white/70 transition hover:bg-white/10 hover:text-white disabled:opacity-40"
              >
                <RotateCcw className="h-3.5 w-3.5" /><span className="hidden sm:inline">New chat</span>
              </button>
            </div>
          </div>
        )}

        {/* Thread */}
        <div className="relative flex-1 overflow-y-auto px-3 py-4 sm:px-6">
          {empty ? (
            <div className="mx-auto flex min-h-full w-full max-w-3xl flex-col items-center justify-center gap-6 py-2 text-center">
              <div
                className="relative"
                onMouseEnter={() => setOrbHover(true)}
                onMouseLeave={() => setOrbHover(false)}
              >
                <div aria-hidden className="pointer-events-none absolute -inset-[10%] rounded-full border border-white/[0.06]" />
                <div aria-hidden className="pointer-events-none absolute -inset-[24%] rounded-full border border-white/[0.035]" />
                <AIOrb
                  size={heroSize}
                  state={orbHover ? 'listening' : 'idle'}
                  getLevel={hoverLevel}
                  onClick={canVoice ? openVoice : undefined}
                  label="Start voice chat"
                />
              </div>
              <div className="max-w-xl">
                <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.3em] text-sky-300/70">AI Reports</p>
                <h2 className="bg-gradient-to-r from-sky-300 via-blue-100 to-fuchsia-300 bg-clip-text text-2xl font-semibold leading-tight text-transparent sm:text-3xl">
                  {lang === 'ml' ? `${name ? `${name}, ` : ''}${t.greet}` : `${name ? `Hi ${name}, what` : 'What'} would you like to know?`}
                </h2>
                <p className="mt-2 text-sm text-white/55">
                  {t.ask}{canVoice ? t.askVoice : ''}.
                </p>
              </div>
              {!!catalog?.suggestions.length && (
                <div className="grid w-full grid-cols-1 gap-2.5 sm:grid-cols-2">
                  {catalog.suggestions.slice(0, 6).map((s) => {
                    const Icon = suggestionIcon(s);
                    return (
                      <button
                        key={s}
                        onClick={() => ask(s)}
                        disabled={busy}
                        className="group flex items-center gap-3 rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2.5 text-left text-sm text-white/75 backdrop-blur transition hover:-translate-y-0.5 hover:border-sky-400/40 hover:bg-white/[0.08] hover:text-white disabled:opacity-50"
                      >
                        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-sky-500/25 to-fuchsia-500/25 text-sky-200 transition group-hover:from-sky-500/40 group-hover:to-fuchsia-500/40">
                          <Icon className="h-4 w-4" />
                        </span>
                        <span className="leading-snug">{s}</span>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          ) : (
            <div className="mx-auto max-w-4xl space-y-5">
              {messages.map((m) => m.role === 'user' ? (
                <div key={m.id} className="flex justify-end">
                  <div className="max-w-[80%] rounded-2xl rounded-br-md bg-gradient-to-br from-sky-500 to-indigo-600 px-3.5 py-2 text-sm text-white shadow-sm">{m.text}</div>
                </div>
              ) : (
                <div key={m.id} className="flex gap-2.5">
                  <OrbAvatar className="mt-0.5" state={m.pending ? 'thinking' : undefined} />
                  <div className="min-w-0 flex-1 space-y-2.5">
                    {m.pending ? (
                      <p className="h-7 animate-pulse pt-1 text-sm text-muted-foreground">Analysing your data…</p>
                    ) : (
                      <div className="flex items-start gap-1">
                        <p className={cn('pt-0.5 text-sm leading-relaxed', m.error && 'text-destructive')}>{m.text}</p>
                        {voice.ttsSupported && m.speech && !m.error && (
                          <button
                            onClick={() => { voice.unlockAudio(); if (voice.speaking) voice.stopSpeaking(); else voice.speak(m.speech!); }}
                            className="min-h-0 shrink-0 rounded p-1 text-muted-foreground hover:text-foreground"
                            aria-label={voice.speaking ? 'Stop reading' : 'Read aloud'}
                            title={voice.speaking ? 'Stop' : 'Read aloud'}
                          >
                            {voice.speaking ? <Square className="h-3.5 w-3.5" /> : <Volume2 className="h-3.5 w-3.5" />}
                          </button>
                        )}
                      </div>
                    )}
                    {m.result && (
                      <ReportCard
                        key={JSON.stringify(m.result.spec)}
                        result={m.result}
                        fieldLabel={fieldLabelFor(m.result.spec.dataset)}
                        busy={rerunning === m.id}
                        onChangeSpec={(spec) => rerun(m.id, spec)}
                      />
                    )}
                  </div>
                </div>
              ))}
              <div ref={endRef} />
            </div>
          )}
        </div>

        {/* Composer */}
        <div className={cn('relative p-3', !empty && 'border-t')}>
          <div className={cn(
            'mx-auto rounded-2xl bg-gradient-to-r from-sky-500/60 via-indigo-500/50 to-fuchsia-500/60 p-px',
            empty ? 'max-w-3xl shadow-[0_0_40px_-10px_rgba(99,102,241,0.7)]' : 'max-w-4xl',
          )}>
            <div className={cn('flex items-end gap-1.5 rounded-[15px] p-1.5', empty ? 'bg-[#0a0d1c]' : 'bg-background')}>
              <textarea
                ref={inputRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); } }}
                placeholder={empty ? t.placeholder : t.followUp}
                rows={1}
                maxLength={1000}
                className={cn(
                  'max-h-32 min-h-[40px] min-w-0 flex-1 resize-none bg-transparent px-2.5 py-2 text-sm outline-none',
                  empty ? 'text-white placeholder:text-white/40' : 'placeholder:text-muted-foreground',
                )}
                style={{ fieldSizing: 'content' } as React.CSSProperties}
              />
              <button
                type="button"
                onClick={openVoice}
                disabled={!canVoice || busy}
                title={canVoice ? (liveMode ? 'Live voice chat' : 'Voice chat') : 'Voice needs Chrome, Edge or Safari'}
                aria-label="Voice chat"
                className={cn(
                  'flex h-10 w-10 shrink-0 items-center justify-center rounded-full transition disabled:opacity-40',
                  empty ? 'text-white/80 hover:bg-white/10' : 'text-muted-foreground hover:bg-muted hover:text-foreground',
                )}
              >
                {canVoice ? <Mic className="h-5 w-5" /> : <MicOff className="h-5 w-5" />}
              </button>
              <button
                type="button"
                onClick={send}
                disabled={busy || !input.trim()}
                aria-label="Send"
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-sky-500 to-violet-600 text-white shadow-[0_0_16px_-2px_rgba(99,102,241,0.6)] transition hover:brightness-110 disabled:opacity-40 disabled:shadow-none"
              >
                <Send className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Voice mode */}
      {voiceOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Voice chat"
          data-orb-dark
          className="fixed inset-0 z-50 flex flex-col items-center justify-between bg-[#020308]/[.97] px-4 py-6 text-white backdrop-blur-md animate-in fade-in duration-300"
        >
          <div className="flex w-full max-w-3xl items-center justify-between">
            <div className="flex items-center gap-2 text-sm text-white/70"><OrbAvatar className="h-5 w-5" /> AI Assistant <ExperimentalTag /></div>
            <button onClick={closeVoice} className="rounded-full p-2 text-white/70 hover:bg-white/10 hover:text-white" aria-label="Close voice chat">
              <X className="h-5 w-5" />
            </button>
          </div>

          <div className="flex flex-col items-center gap-6">
            <AIOrb
              size={Math.min(320, typeof window !== 'undefined' ? window.innerWidth * 0.72 : 320)}
              state={orbState}
              getLevel={voiceLevel}
              onClick={orbTap}
              label={micActive ? (liveMode ? 'Mute' : 'Stop listening') : 'Talk'}
            />
            <div className="text-sm font-medium uppercase tracking-[0.2em] text-white/60" aria-live="polite">{status}</div>
            {noVoiceHint && <p className="max-w-md text-center text-xs text-amber-200/80">{noVoiceHint}</p>}
            <p className="min-h-[3.5rem] max-w-xl text-center text-lg leading-relaxed text-white/90 sm:text-xl">
              {caption || (orbState === 'listening' ? 'Ask me about your data…' : '')}
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={orbTap}
              disabled={!liveMode && busy}
              className={cn('flex h-14 w-14 items-center justify-center rounded-full border border-white/15 transition-colors disabled:opacity-40',
                micActive ? 'bg-white text-[#020308]' : 'bg-white/10 hover:bg-white/20')}
              aria-label={micActive ? (liveMode ? 'Mute microphone' : 'Stop listening') : 'Start listening'}
            >
              {micActive ? (liveMode ? <Mic className="h-6 w-6" /> : <Square className="h-5 w-5" />) : liveMode && live.muted ? <MicOff className="h-6 w-6" /> : <Mic className="h-6 w-6" />}
            </button>
            {messages.some((m) => m.result) && (
              <button onClick={closeVoice} className="h-14 rounded-full border border-white/15 bg-white/10 px-5 text-sm hover:bg-white/20">
                View reports
              </button>
            )}
          </div>
        </div>
      )}
    </>
  );
}

export default AIReportBuilder;

/** EN / മലയാളം switch (voice + answers language) */
function LangToggle({ lang, onChange, disabled }: { lang: Lang; onChange: (l: Lang) => void; disabled?: boolean }) {
  return (
    <div className="flex rounded-full border border-white/15 bg-white/5 p-0.5 text-[11px] font-medium" role="group" aria-label="Language">
      {(['en', 'ml'] as const).map((l) => (
        <button
          key={l}
          onClick={() => onChange(l)}
          disabled={disabled}
          aria-pressed={lang === l}
          className={cn('min-h-0 rounded-full px-2.5 py-1 transition disabled:opacity-50', lang === l ? 'bg-white text-[#03040b]' : 'text-white/70 hover:text-white')}
        >
          {l === 'en' ? 'EN' : 'മലയാളം'}
        </button>
      ))}
    </div>
  );
}

/** Marks the assistant as an experimental feature (answers may be wrong — check important numbers) */
function ExperimentalTag() {
  return (
    <span
      title="Experimental feature: AI answers can be wrong. Check important numbers in the regular reports."
      className="inline-flex items-center rounded-full border border-amber-300/40 bg-amber-300/10 px-1.5 py-px text-[9px] font-semibold uppercase leading-4 tracking-wider text-amber-200"
    >
      Experimental
    </span>
  );
}
