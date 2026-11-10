/**
 * Animated AI orb: a 3D sphere made of dots whose surface folds and ripples
 * (canvas 2D, no libraries). Blue on top, violet/pink underneath.
 *
 * States:
 *  idle      slow, gentle morphing
 *  listening surface ripples with the microphone level
 *  thinking  faster churning folds
 *  speaking  pulses with the voice
 */
import { useEffect, useRef } from 'react';
import { cn } from '@/lib/utils';

export type OrbState = 'idle' | 'listening' | 'thinking' | 'speaking';

const STATE = {
  idle:      { amp: 0.17, speed: 0.35, spin: 0.10 },
  listening: { amp: 0.19, speed: 0.6,  spin: 0.14 },
  thinking:  { amp: 0.27, speed: 1.5,  spin: 0.45 },
  speaking:  { amp: 0.21, speed: 0.8,  spin: 0.18 },
} as const;

// Color stops by screen height (top → bottom), like the reference: sky blue → blue → violet → pink
const DARK_STOPS = [[125, 215, 255], [70, 190, 255], [72, 168, 255], [90, 150, 255], [170, 140, 255], [240, 130, 250]];
const LIGHT_STOPS = [[2, 132, 199], [14, 116, 220], [37, 99, 235], [59, 90, 230], [109, 40, 217], [192, 38, 211]];
const COLOR_STEPS = 12;
const ALPHA_STEPS = 6;

function lerpStops(stops: number[][], t: number): number[] {
  const x = Math.min(0.999, Math.max(0, t)) * (stops.length - 1);
  const i = Math.floor(x), f = x - i;
  return stops[i].map((c, k) => Math.round(c + (stops[i + 1][k] - c) * f));
}

/** Unit-sphere grid points (latitude rings × longitude segments) — gives the "rows of dots" look */
function buildGrid(rings: number, segs: number): Float32Array {
  const pts: number[] = [];
  for (let i = 1; i < rings; i++) {
    const phi = (i / rings) * Math.PI;
    const y = Math.cos(phi), r = Math.sin(phi);
    const n = Math.max(6, Math.round(segs * r)); // fewer dots near the poles
    for (let j = 0; j < n; j++) {
      const th = (j / n) * Math.PI * 2;
      pts.push(Math.cos(th) * r, y, Math.sin(th) * r);
    }
  }
  return new Float32Array(pts);
}

/** "Crumpled cloth" displacement: smooth swells plus ridged creases */
const ridge = (v: number) => 0.5 - Math.abs(Math.sin(v)); // sharp crease along sin(v) = 0
function fold(x: number, y: number, z: number, t: number): number {
  return (
    Math.sin(1.6 * x + 1.1 * t) * Math.cos(1.9 * y - 0.8 * t) * 0.5 +
    Math.sin(2.3 * z + 1.4 * y + 0.9 * t) * 0.32 +
    ridge(2.6 * x - 2.1 * z + 0.7 * y + 1.2 * t) * 0.45 +
    ridge(2.2 * y + 1.8 * z - 1.5 * x - 0.9 * t) * 0.3 +
    Math.sin(4.6 * y + 3.2 * x - 1.7 * t) * Math.cos(3.9 * z + 1.1 * t) * 0.14
  );
}

export function AIOrb({ state = 'idle', size = 200, getLevel, onClick, className, label, still = false }: {
  state?: OrbState;
  size?: number;
  /** 0..1 audio level (mic while listening, voice while speaking) */
  getLevel?: () => number;
  onClick?: () => void;
  className?: string;
  label?: string;
  /** Draw one frame only (for small avatars) */
  still?: boolean;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const stateRef = useRef(state);
  const levelRef = useRef(getLevel);
  useEffect(() => { stateRef.current = state; levelRef.current = getLevel; });

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) return;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = size * dpr;
    canvas.height = size * dpr;
    ctx.scale(dpr, dpr);

    const reduced = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    // Dot density scales with size (≈ 7k dots at 320px, a few hundred for avatars)
    const rings = Math.max(14, Math.min(76, Math.round(size / 4.2)));
    const grid = buildGrid(rings, Math.round(rings * 1.9));
    const count = grid.length / 3;
    const sx = new Float32Array(count), sy = new Float32Array(count), sr = new Float32Array(count);
    const bucketOf = new Int16Array(count);
    const nBuckets = COLOR_STEPS * ALPHA_STEPS;
    const bucketCount = new Int32Array(nBuckets);
    const order = new Int32Array(count);

    let amp: number = STATE.idle.amp, speed: number = STATE.idle.speed, spin: number = STATE.idle.spin;
    let level = 0, morphT = 0, angle = 0.6, last = performance.now(), raf = 0;

    const draw = (now: number) => {
      const dt = Math.min((now - last) / 1000, 0.05);
      last = now;
      const st = STATE[stateRef.current];
      const target = stateRef.current === 'listening' || stateRef.current === 'speaking' ? Math.min(1, levelRef.current?.() ?? 0) : 0;
      level += (target - level) * Math.min(1, dt * (target > level ? 14 : 5)); // fast attack, slow release
      const k = Math.min(1, dt * 2.5);
      amp += (st.amp - amp) * k; speed += (st.speed - speed) * k; spin += (st.spin - spin) * k;
      const motion = reduced ? 0.25 : 1;
      morphT += dt * (speed + level * 1.2) * motion;
      angle += dt * spin * motion;

      const dark = document.documentElement.classList.contains('dark') || !!canvas.closest('[data-orb-dark]');
      const stops = dark ? DARK_STOPS : LIGHT_STOPS;
      const cx = size / 2, cy = size / 2;
      const R = size * 0.35 * (1 + level * 0.06);
      const A = amp + level * 0.22; // displacement strength
      const cosA = Math.cos(angle), sinA = Math.sin(angle);
      const tilt = 0.35, cosT = Math.cos(tilt), sinT = Math.sin(tilt);
      const camera = 3.2;
      const dotBase = Math.max(0.8, size / 195);

      ctx.clearRect(0, 0, size, size);
      if (dark) {
        const glow = ctx.createRadialGradient(cx, cy, R * 0.2, cx, cy, R * 1.6);
        glow.addColorStop(0, `rgba(59, 130, 246, ${0.16 + level * 0.18})`);
        glow.addColorStop(1, 'rgba(59, 130, 246, 0)');
        ctx.fillStyle = glow;
        ctx.fillRect(0, 0, size, size);
      }

      // Project points and bucket them by (color, alpha) to keep fillStyle changes low
      bucketCount.fill(0);
      for (let i = 0; i < count; i++) {
        const x = grid[i * 3], y = grid[i * 3 + 1], z = grid[i * 3 + 2];
        const d = 1 + A * fold(x * 1.3, y * 1.3, z * 1.3, morphT) + level * 0.05 * Math.sin(9 * y + now / 90);
        let px = x * d, py = y * d, pz = z * d;
        // spin around Y, then tilt around X
        const rx = px * cosA + pz * sinA;
        const rz = -px * sinA + pz * cosA;
        px = rx; pz = rz;
        const ty = py * cosT - pz * sinT;
        const tz = py * sinT + pz * cosT;
        py = ty; pz = tz;
        const persp = camera / (camera - pz);
        sx[i] = cx + px * R * persp;
        sy[i] = cy + py * R * persp;
        sr[i] = dotBase * persp * (0.75 + 0.35 * (pz + 1));
        const depth = (pz + 1.2) / 2.4; // 0 back … 1 front
        const ai = Math.min(ALPHA_STEPS - 1, Math.max(0, Math.floor(depth * ALPHA_STEPS)));
        const ci = Math.min(COLOR_STEPS - 1, Math.max(0, Math.floor(((py * persp + 1.15) / 2.3) * COLOR_STEPS)));
        const b = ci * ALPHA_STEPS + ai;
        bucketOf[i] = b;
        bucketCount[b]++;
      }
      // counting sort by bucket
      let acc = 0;
      const start = new Int32Array(nBuckets);
      for (let b = 0; b < nBuckets; b++) { start[b] = acc; acc += bucketCount[b]; }
      const fillPos = start.slice();
      for (let i = 0; i < count; i++) order[fillPos[bucketOf[i]]++] = i;

      ctx.globalCompositeOperation = dark ? 'lighter' : 'source-over';
      for (let b = 0; b < nBuckets; b++) {
        if (!bucketCount[b]) continue;
        const ci = Math.floor(b / ALPHA_STEPS), ai = b % ALPHA_STEPS;
        const [r, g, bl] = lerpStops(stops, (ci + 0.5) / COLOR_STEPS);
        const alpha = Math.min(1, (dark ? 0.1 : 0.08) + ((ai + 0.5) / ALPHA_STEPS) ** 1.1 * 0.95);
        ctx.fillStyle = `rgba(${r}, ${g}, ${bl}, ${alpha.toFixed(3)})`;
        ctx.beginPath();
        for (let n = start[b], end = start[b] + bucketCount[b]; n < end; n++) {
          const i = order[n], s = sr[i];
          ctx.rect(sx[i] - s / 2, sy[i] - s / 2, s, s);
        }
        ctx.fill();
      }
      ctx.globalCompositeOperation = 'source-over';

      if (!still) raf = requestAnimationFrame(draw);
    };
    raf = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(raf);
  }, [size, still]);

  const Tag = onClick ? 'button' : 'div';
  return (
    <Tag
      type={onClick ? 'button' : undefined}
      onClick={onClick}
      aria-label={label}
      className={cn('relative inline-flex min-h-0 shrink-0 items-center justify-center rounded-full outline-none focus-visible:ring-2 focus-visible:ring-primary', onClick && 'cursor-pointer', className)}
      style={{ width: size, height: size }}
    >
      <canvas ref={canvasRef} style={{ width: size, height: size }} aria-hidden />
    </Tag>
  );
}

/** Small orb for chat avatars on a dark disc: a static frame, or animated when given a state */
export function OrbAvatar({ className, state }: { className?: string; state?: OrbState }) {
  return (
    <div aria-hidden data-orb-dark className={cn('flex h-7 w-7 shrink-0 items-center justify-center overflow-hidden rounded-full bg-[#05060f]', className)}>
      <AIOrb size={40} still={!state} state={state ?? 'idle'} />
    </div>
  );
}
