import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Eye, EyeOff, ShieldAlert, AlertCircle } from 'lucide-react';
import { RobotVerification } from '@/components/auth/RobotVerification';

const BrandRibbon = () => (
  <svg 
    className="absolute inset-0 w-full h-full object-cover pointer-events-none -z-10" 
    viewBox="0 0 1440 900" 
    preserveAspectRatio="xMidYMid slice" 
    xmlns="http://www.w3.org/2000/svg"
  >
    <defs>
      <linearGradient id="ribbonGrad" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#54b947" /> 
        <stop offset="50%" stopColor="#8ae47e" /> 
        <stop offset="100%" stopColor="#2c7722" /> 
      </linearGradient>
      <linearGradient id="ribbonGrad2" x1="100%" y1="0%" x2="0%" y2="100%">
        <stop offset="0%" stopColor="#67cf57" stopOpacity="0.85" />
        <stop offset="100%" stopColor="#1a4f15" stopOpacity="0.9" />
      </linearGradient>
      
      {/* Drop shadow for ribbon */}
      <filter id="ribbonShadow" x="-20%" y="-20%" width="140%" height="140%">
        <feDropShadow dx="0" dy="20" stdDeviation="30" floodOpacity="0.16" floodColor="#1a4f15"/>
      </filter>
    </defs>
    
    <rect width="100%" height="100%" fill="#f8fbf7" />

    {/* The ribbon stroke 1 */}
    <path 
      d="M -100 800 C 300 900, 500 100, 1000 300 C 1300 400, 1200 900, 1600 700" 
      fill="none" 
      stroke="url(#ribbonGrad)" 
      strokeWidth="140" 
      strokeLinecap="round" 
      filter="url(#ribbonShadow)"
    />
    
    {/* The ribbon stroke 2 crossing */}
    <path 
      d="M 1200 -200 C 1100 200, 1400 600, 900 800 C 400 1000, 200 300, -200 200" 
      fill="none" 
      stroke="url(#ribbonGrad2)" 
      strokeWidth="110" 
      strokeLinecap="round" 
      filter="url(#ribbonShadow)"
    />
  </svg>
);

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

  return (
    <div className="min-h-screen relative flex items-center justify-center p-4 sm:p-8 font-sans text-slate-900 overflow-hidden">
      
      <BrandRibbon />

      {/* Top Left Logo Area */}
      <div className="absolute top-6 left-6 sm:top-8 sm:left-10 flex items-center gap-3.5">
        <div className="flex items-center justify-center">
          <img src="/erm-logo-green.png" alt="Pype ERM" className="h-20 sm:h-24 w-auto drop-shadow-sm" />
        </div>
        <div className="flex items-baseline gap-1.5 whitespace-nowrap select-none mt-1">
          <span className="text-2xl sm:text-[28px] font-bold tracking-tight text-slate-500">pype</span>
          <span className="text-[18px] sm:text-[21px] font-black tracking-wider text-slate-900">ERM</span>
        </div>
      </div>

      {/* Main Glassmorphism Card (Wide, 2 columns) */}
      <div className="w-full max-w-[1000px] min-h-[600px] bg-white/70 backdrop-blur-3xl rounded-[2.5rem] shadow-[0_30px_60px_rgba(0,0,0,0.08),inset_0_1px_0_rgba(255,255,255,0.6)] border border-white/60 overflow-hidden relative z-10 flex flex-col md:flex-row">
        
        {/* Left Column: Form */}
        <div className="w-full md:w-1/2 p-8 sm:p-12 md:p-14 flex flex-col justify-center relative">
          <div className="mb-6 sm:mb-8">
            <h1 className="text-[30px] sm:text-[32px] font-bold tracking-tight text-slate-900 mb-2">Sign in to your account</h1>
            <p className="text-slate-500 text-[14px] sm:text-[15px]">Welcome back! Login with your credentials</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Honeypot field (hidden off-screen for bot trapping) */}
            <div className="opacity-0 absolute -z-50 pointer-events-none h-0 w-0 overflow-hidden" aria-hidden="true">
              <label htmlFor="website_url_hp">Security Field</label>
              <input
                id="website_url_hp"
                type="text"
                name="website_url_hp"
                value={honeypot}
                onChange={(e) => setHoneypot(e.target.value)}
                tabIndex={-1}
                autoComplete="off"
              />
            </div>

            <div className="space-y-1.5">
              <Input
                id="email"
                type="email"
                placeholder="Email address"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="h-12 rounded-2xl border-white/60 bg-white/80 focus:bg-white focus:border-[#54b947] focus:ring-4 focus:ring-[#54b947]/20 shadow-[0_2px_10px_rgba(0,0,0,0.02)] transition-all text-base px-5"
                required
                disabled={lockoutSeconds > 0 || isLoading}
              />
            </div>

            <div className="space-y-1.5 relative">
              <Input
                id="password"
                type={showPassword ? "text" : "password"}
                placeholder="Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="h-12 rounded-2xl border-white/60 bg-white/80 focus:bg-white focus:border-[#54b947] focus:ring-4 focus:ring-[#54b947]/20 shadow-[0_2px_10px_rgba(0,0,0,0.02)] transition-all pr-12 text-base px-5"
                required
                disabled={lockoutSeconds > 0 || isLoading}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                tabIndex={-1}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 focus:outline-none"
              >
                {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
              </button>
            </div>

            {/* "I'm not a robot" Bot-Prevention Checkbox Section */}
            <RobotVerification
              isVerified={isRobotVerified}
              onVerify={(verified) => {
                setIsRobotVerified(verified);
                if (verified) {
                  setRobotError(false);
                  setError('');
                } else {
                  setRobotError(true);
                  setError('Verification failed. Please try again.');
                }
              }}
              disabled={lockoutSeconds > 0 || isLoading}
              hasError={robotError}
            />

            {error && (
              <div className="p-3 bg-red-50/95 border border-red-200/80 text-red-600 text-sm rounded-xl font-medium flex items-center justify-center gap-2 animate-in fade-in slide-in-from-top-1 duration-200">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                <span>{error}</span>
              </div>
            )}

            {lockoutSeconds > 0 && (
              <div className="p-3 bg-amber-50/95 border border-amber-200 text-amber-800 text-xs rounded-xl font-medium flex items-center justify-center gap-2">
                <ShieldAlert className="w-4 h-4 text-amber-600 flex-shrink-0" />
                <span>Security cooldown active. Please wait {lockoutSeconds} seconds.</span>
              </div>
            )}

            <div className="pt-1.5">
              <Button
                type="submit"
                className="w-full h-12 bg-slate-900 hover:bg-[#439c36] text-white rounded-2xl text-[15px] font-semibold shadow-lg hover:shadow-[#54b947]/20 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                disabled={isLoading || lockoutSeconds > 0}
              >
                {isLoading ? (
                  'Signing in...'
                ) : lockoutSeconds > 0 ? (
                  `Cooldown (${lockoutSeconds}s)`
                ) : (
                  'Sign in to account'
                )}
              </Button>
            </div>
          </form>
        </div>

        {/* Right Column: Text & Graphic */}
        <div className="hidden md:flex w-1/2 p-12 flex-col justify-end text-white relative overflow-hidden bg-[#091f14]">
          {/* Abstract Fluid Background matching green branding */}
          <svg className="absolute inset-0 w-full h-full object-cover z-0" viewBox="0 0 400 600" preserveAspectRatio="none">
            <defs>
              <linearGradient id="waveBase" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#103822" />
                <stop offset="100%" stopColor="#05150c" />
              </linearGradient>
              <linearGradient id="waveTop" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#54b947" />
                <stop offset="50%" stopColor="#2e8229" />
                <stop offset="100%" stopColor="#124317" />
              </linearGradient>
              <linearGradient id="waveBottom" x1="100%" y1="100%" x2="0%" y2="0%">
                <stop offset="0%" stopColor="#54b947" />
                <stop offset="100%" stopColor="#1a5323" />
              </linearGradient>
              <filter id="blurShadow">
                <feDropShadow dx="10" dy="10" stdDeviation="20" floodColor="#000" floodOpacity="0.5"/>
              </filter>
            </defs>
            <rect width="100%" height="100%" fill="url(#waveBase)" />
            
            <path d="M0,0 L220,0 C280,250 150,350 0,550 Z" fill="url(#waveTop)" filter="url(#blurShadow)" />
            <path d="M400,600 L100,600 C250,450 400,300 400,100 Z" fill="url(#waveBottom)" filter="url(#blurShadow)" />
            
            <circle cx="50" cy="150" r="120" fill="#54b947" filter="blur(80px)" opacity="0.35" />
            <circle cx="350" cy="450" r="150" fill="#8ae47e" filter="blur(80px)" opacity="0.25" />
          </svg>
          
          {/* Top Right Logo matching erm-logo-green.png */}
          <div className="absolute top-10 right-10 z-20 bg-white/95 backdrop-blur-md p-3 rounded-2xl shadow-xl border border-white/40">
            <img src="/erm-logo-green.png" alt="Pype ERM" className="w-12 h-12 object-contain" />
          </div>
          
          <div className="relative z-10 flex flex-col items-start text-left w-full pb-4">
            <h2 className="text-[34px] font-bold tracking-tight leading-tight">
              Next-generation<br />academic management.
            </h2>
          </div>
        </div>

      </div>

    </div>
  );
}
