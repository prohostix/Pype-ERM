import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Eye, EyeOff, ShieldAlert, AlertCircle, ArrowLeft } from 'lucide-react';
import { RobotVerification } from '@/components/auth/RobotVerification';

/** A decorative circle that drifts with the cursor (via --mx/--my on the card) and can be dragged; it eases back when released. */
function DragCircle({ className, style, depth }: { className: string; style?: React.CSSProperties; depth: number }) {
  const [pos, setPos] = useState({ x: 0, y: 0 });
  const [dragging, setDragging] = useState(false);
  const start = useRef<{ px: number; py: number } | null>(null);

  return (
    <div
      aria-hidden="true"
      className={`${className} cursor-grab active:cursor-grabbing touch-none select-none`}
      style={{
        ...style,
        transform: `translate3d(calc(var(--mx, 0) * ${depth}px + ${pos.x}px), calc(var(--my, 0) * ${depth}px + ${pos.y}px), 0)`,
        transition: dragging ? 'none' : 'transform 0.6s cubic-bezier(0.34, 1.56, 0.64, 1)',
      }}
      onPointerDown={(e) => {
        e.currentTarget.setPointerCapture(e.pointerId);
        start.current = { px: e.clientX - pos.x, py: e.clientY - pos.y };
        setDragging(true);
      }}
      onPointerMove={(e) => {
        if (!start.current) return;
        setPos({ x: e.clientX - start.current.px, y: e.clientY - start.current.py });
      }}
      onPointerUp={() => { start.current = null; setDragging(false); setPos({ x: 0, y: 0 }); }}
      onPointerCancel={() => { start.current = null; setDragging(false); setPos({ x: 0, y: 0 }); }}
    />
  );
}

export function Login() {
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  // Bot Protection States
  const [isRobotVerified, setIsRobotVerified] = useState(false);
  const [robotError, setRobotError] = useState(false);
  const [honeypot, setHoneypot] = useState('');
  const [lockoutSeconds, setLockoutSeconds] = useState(0);
  const formMountTime = useRef<number>(Date.now());
  const panelRef = useRef<HTMLDivElement>(null);

  // The circles on the left card drift towards the cursor, each at its own depth.
  const moveCircles = (e: React.MouseEvent<HTMLDivElement>) => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const el = panelRef.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    el.style.setProperty('--mx', String((e.clientX - r.left) / r.width - 0.5));
    el.style.setProperty('--my', String((e.clientY - r.top) / r.height - 0.5));
  };
  const resetCircles = () => {
    panelRef.current?.style.setProperty('--mx', '0');
    panelRef.current?.style.setProperty('--my', '0');
  };

  // Handle Lockout countdown timer
  useEffect(() => {
    if (lockoutSeconds <= 0) return;
    const timer = setInterval(() => {
      setLockoutSeconds((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          setError('');
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [lockoutSeconds]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setRobotError(false);

    // 1. Lockout check
    if (lockoutSeconds > 0) {
      setError(`Too many failed attempts. Please wait ${lockoutSeconds} seconds.`);
      return;
    }

    // 2. Honeypot check (Bots fill hidden fields automatically)
    if (honeypot.trim() !== '') {
      console.warn('Bot submission blocked via honeypot');
      setError('Bot activity detected. Form submission blocked.');
      return;
    }

    // 3. Human speed check (Automated scripts submit in milliseconds)
    const timeSinceMount = Date.now() - formMountTime.current;
    if (timeSinceMount < 400) {
      setError('Submission too rapid. Please verify you are human and try again.');
      return;
    }

    // 4. Robot verification check
    if (!isRobotVerified) {
      setRobotError(true);
      setError('Please verify that you are not a robot.');
      return;
    }

    // 5. Proceed with credentials authentication
    setIsLoading(true);

    const success = await login(email, password);
    if (!success) {
      setError('Invalid email or password');
      // Reset robot verification to require re-verification after failed login attempts
      setIsRobotVerified(false);
    } else {
      window.history.replaceState({}, '', '/');
    }

    setIsLoading(false);
  };

  const inputCls = 'h-13 min-h-[52px] rounded-xl border-slate-200 bg-white focus:border-[#54b947] focus:ring-4 focus:ring-[#54b947]/20 transition-all text-base px-4';

  return (
    <div style={{ fontFamily: "Urbanist, ui-sans-serif, system-ui, sans-serif" }} className="min-h-[100dvh] bg-white text-slate-900">
      <div className="relative w-full min-h-[100dvh] bg-white flex flex-col md:flex-row p-2 sm:p-3">

        {/* Left: brand panel */}
        <div ref={panelRef} onMouseMove={moveCircles} onMouseLeave={resetCircles} className="hidden md:flex md:w-[46%] relative overflow-hidden rounded-2xl flex-col justify-between p-7"
          style={{ background: 'linear-gradient(160deg, #f4faf2 0%, #e6f4e2 55%, #f7fbf6 100%)' }}>
          <div aria-hidden="true" className="absolute -top-24 -left-10 w-[110%] h-[260px] rounded-full bg-white/70 blur-2xl" />
          <DragCircle depth={90} className="absolute right-[-60px] top-[210px] w-[200px] h-[200px] rounded-full" style={{ background: 'radial-gradient(circle at 35% 30%, #8ae47e, #54b947 70%)', opacity: 0.85 }} />
          <DragCircle depth={-130} className="absolute left-[-44px] top-[330px] w-[90px] h-[90px] rounded-full" style={{ background: 'radial-gradient(circle at 35% 30%, #8ae47e, #54b947 70%)', opacity: 0.8 }} />
          <DragCircle depth={-50} className="absolute right-[-120px] top-[270px] w-[330px] h-[330px] rounded-full border border-white/70 bg-white/30 backdrop-blur-sm" />

          <a href="/" aria-label="PYPE ERM home" className="relative z-10 inline-flex items-center gap-2.5 w-fit">
            <img src="/erm-logo-green.png" alt="PYPE ERM" className="h-14 w-auto" />
            <span className="flex items-baseline gap-1 leading-none">
              <span className="text-3xl font-bold tracking-tight text-slate-500">pype</span>
              <span className="text-2xl font-black tracking-wider text-slate-900">ERM</span>
            </span>
          </a>

          <div className="relative z-10">
            <h2 className="text-4xl lg:text-[44px] font-medium tracking-tight text-[#0b2e18] mb-3 leading-[1.1]">Welcome back. Everything is right where you left it.</h2>
            <p className="text-base lg:text-lg leading-relaxed text-slate-600 max-w-md">Sign in to pick up your admissions, fees, attendance and approvals.</p>
          </div>
        </div>

        {/* Right: form */}
        <div className="flex-1 flex flex-col items-center justify-center px-5 sm:px-10 py-12 relative">
          <a href="/" className="absolute top-3 right-3 sm:top-4 sm:right-4 inline-flex items-center gap-2 h-10 px-4 rounded-full border border-slate-200 text-sm font-medium text-slate-600 hover:bg-slate-50 transition-colors">
            <ArrowLeft className="w-3.5 h-3.5" /> Back to Home
          </a>

          <div className="w-full max-w-[440px]">
            <div className="flex flex-col items-center text-center mb-8">
              <img src="/erm-logo-green.png" alt="PYPE ERM" className="h-20 w-auto mb-4" />
              <h1 className="text-3xl sm:text-4xl font-medium tracking-tight text-slate-900">Welcome to PYPE ERM</h1>
              <p className="text-slate-500 text-base mt-2">Sign in with your credentials to continue</p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="opacity-0 absolute -z-50 pointer-events-none h-0 w-0 overflow-hidden" aria-hidden="true">
                <label htmlFor="website_url_hp">Security Field</label>
                <input id="website_url_hp" type="text" name="website_url_hp" value={honeypot} onChange={(e) => setHoneypot(e.target.value)} tabIndex={-1} autoComplete="off" />
              </div>

              <div className="space-y-1.5">
                <label htmlFor="email" className="text-sm font-semibold text-slate-700">Email</label>
                <Input id="email" type="email" placeholder="Enter your email" value={email} onChange={(e) => setEmail(e.target.value)} className={inputCls} required disabled={lockoutSeconds > 0 || isLoading} />
              </div>

              <div className="space-y-1.5">
                <label htmlFor="password" className="text-sm font-semibold text-slate-700">Password</label>
                <div className="relative">
                  <Input id="password" type={showPassword ? 'text' : 'password'} placeholder="Enter your password" value={password} onChange={(e) => setPassword(e.target.value)} className={`${inputCls} pr-11`} required disabled={lockoutSeconds > 0 || isLoading} />
                  <button type="button" onClick={() => setShowPassword(!showPassword)} tabIndex={-1} aria-label={showPassword ? 'Hide password' : 'Show password'} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 focus:outline-none">
                    {showPassword ? <EyeOff className="h-4.5 w-4.5" /> : <Eye className="h-4.5 w-4.5" />}
                  </button>
                </div>
              </div>

              <RobotVerification
                isVerified={isRobotVerified}
                onVerify={(verified) => {
                  setIsRobotVerified(verified);
                  if (verified) { setRobotError(false); setError(''); }
                  else { setRobotError(true); setError('Verification failed. Please try again.'); }
                }}
                disabled={lockoutSeconds > 0 || isLoading}
                hasError={robotError}
              />

              {error && (
                <div className="p-3 bg-red-50 border border-red-200 text-red-600 text-sm rounded-xl font-medium flex items-center justify-center gap-2 animate-in fade-in slide-in-from-top-1 duration-200">
                  <AlertCircle className="w-4 h-4 flex-shrink-0" /><span>{error}</span>
                </div>
              )}

              {lockoutSeconds > 0 && (
                <div className="p-3 bg-amber-50 border border-amber-200 text-amber-800 text-sm rounded-xl font-medium flex items-center justify-center gap-2">
                  <ShieldAlert className="w-4 h-4 text-amber-600 flex-shrink-0" />
                  <span>Security cooldown active. Please wait {lockoutSeconds} seconds.</span>
                </div>
              )}

              <Button
                type="submit"
                className="group w-full h-[52px] rounded-xl text-base font-semibold text-white bg-gradient-to-b from-[#2b3a2f] to-[#0b140e] hover:from-[#256c1d] hover:to-[#14401a] shadow-md transition-all transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                disabled={isLoading || lockoutSeconds > 0}
              >
                {isLoading ? 'Signing in...' : lockoutSeconds > 0 ? `Cooldown (${lockoutSeconds}s)` : 'Sign in to account'}
              </Button>
            </form>

            <p className="text-center text-sm text-slate-500 mt-7 leading-relaxed">
              Your data is protected and access is limited to your role.<br />
              <a href="/privacy-policy" className="text-[#256c1d] font-medium hover:underline">Privacy details</a>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
