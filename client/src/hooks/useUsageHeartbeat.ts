import { useEffect, useRef } from 'react';
import api from '@/lib/api';

/**
 * Tells the server, every 30 seconds, whether the person is using the platform:
 *   active = this tab is in front, the window has focus and there was input recently
 *   idle   = in front but no input for IDLE_MS
 *   away   = tab hidden, or another window has focus
 * Several tabs may be open: they share one "leader" tab through localStorage so time is counted
 * once, and the beat reports the best state across all tabs (any active tab = active).
 */
const BEAT_MS = 30_000;
const IDLE_MS = 5 * 60_000;
const LEADER_KEY = 'usage_leader';
const TAB_PREFIX = 'usage_tab_';
const STALE_MS = 45_000;

type State = 'active' | 'idle' | 'away';
const safe = {
  get: (k: string) => { try { return localStorage.getItem(k); } catch { return null; } },
  set: (k: string, v: string) => { try { localStorage.setItem(k, v); } catch { /* storage blocked */ } },
  del: (k: string) => { try { localStorage.removeItem(k); } catch { /* storage blocked */ } },
};

export function useUsageHeartbeat(enabled: boolean, page: string) {
  const pageRef = useRef(page);
  pageRef.current = page;

  useEffect(() => {
    if (!enabled || typeof document === 'undefined') return;
    const tabId = Math.random().toString(36).slice(2);
    let lastInput = Date.now();
    let playing = false; // a video playing in this tab counts as being active

    const myState = (): State => {
      if (document.visibilityState !== 'visible') return 'away';
      if (!document.hasFocus()) return 'away';
      if (playing || Date.now() - lastInput < IDLE_MS) return 'active';
      return 'idle';
    };
    const publish = () => safe.set(TAB_PREFIX + tabId, JSON.stringify({ state: myState(), page: pageRef.current, ts: Date.now() }));

    // best state across every open tab of this browser
    const combined = (): { state: State; page: string } => {
      let best: State = myState(); let page = pageRef.current;
      const rank = { away: 0, idle: 1, active: 2 } as const;
      try {
        for (let i = 0; i < localStorage.length; i++) {
          const key = localStorage.key(i);
          if (!key || !key.startsWith(TAB_PREFIX)) continue;
          const v = JSON.parse(localStorage.getItem(key) || 'null');
          if (!v || Date.now() - v.ts > STALE_MS) { if (v) safe.del(key); continue; }
          if (rank[v.state as State] > rank[best]) { best = v.state; page = v.page; }
        }
      } catch { /* ignore */ }
      return { state: best, page };
    };

    const isLeader = (): boolean => {
      const raw = safe.get(LEADER_KEY);
      let cur: { id: string; ts: number } | null = null;
      try { cur = raw ? JSON.parse(raw) : null; } catch { cur = null; }
      if (!cur || cur.id === tabId || Date.now() - cur.ts > BEAT_MS * 1.6) {
        safe.set(LEADER_KEY, JSON.stringify({ id: tabId, ts: Date.now() }));
        return true;
      }
      return false;
    };

    let inFlight = false;
    const beat = async () => {
      publish();
      if (!isLeader() || inFlight || !safe.get('token')) return;
      const { state, page } = combined();
      inFlight = true;
      try { await api.post('/usage/heartbeat', { state, page }); } catch { /* never bother the user */ } finally { inFlight = false; }
    };

    const onInput = () => { lastInput = Date.now(); };
    const onChange = () => { publish(); if (document.visibilityState === 'visible') lastInput = Date.now(); void beat(); };
    const onMedia = (e: Event) => { playing = e.type === 'play' || e.type === 'playing'; };
    const events = ['mousemove', 'mousedown', 'keydown', 'wheel', 'touchstart', 'scroll'] as const;
    events.forEach((ev) => window.addEventListener(ev, onInput, { passive: true, capture: true }));
    document.addEventListener('visibilitychange', onChange);
    window.addEventListener('focus', onChange);
    window.addEventListener('blur', onChange);
    ['play', 'playing', 'pause', 'ended'].forEach((ev) => document.addEventListener(ev, onMedia, true));

    publish();
    const first = window.setTimeout(beat, 2_000);
    const timer = window.setInterval(beat, BEAT_MS);
    return () => {
      window.clearTimeout(first); window.clearInterval(timer);
      events.forEach((ev) => window.removeEventListener(ev, onInput, true));
      document.removeEventListener('visibilitychange', onChange);
      window.removeEventListener('focus', onChange); window.removeEventListener('blur', onChange);
      ['play', 'playing', 'pause', 'ended'].forEach((ev) => document.removeEventListener(ev, onMedia, true));
      safe.del(TAB_PREFIX + tabId);
      try { const cur = JSON.parse(safe.get(LEADER_KEY) || 'null'); if (cur?.id === tabId) safe.del(LEADER_KEY); } catch { /* ignore */ }
    };
  }, [enabled]);
}
