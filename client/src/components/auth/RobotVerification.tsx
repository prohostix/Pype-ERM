import React, { useState } from 'react';
import { Check, Loader2, ShieldCheck } from 'lucide-react';
import { cn } from '@/lib/utils';

interface RobotVerificationProps {
  isVerified: boolean;
  onVerify: (verified: boolean) => void;
  disabled?: boolean;
  hasError?: boolean;
  className?: string;
}

export const RobotVerification: React.FC<RobotVerificationProps> = ({
  isVerified,
  onVerify,
  disabled = false,
  hasError = false,
  className,
}) => {
  const [isVerifying, setIsVerifying] = useState(false);

  const handleClick = (e: React.MouseEvent) => {
    if (disabled || isVerified || isVerifying) return;

    // Bot detection check 1: Native browser event trust
    if (e.isTrusted === false) {
      console.warn('[Security] Programmatic click detected - robot entry blocked.');
      onVerify(false);
      return;
    }

    // Bot detection check 2: Synthetic event without coordinates
    if (e.clientX === 0 && e.clientY === 0 && e.screenX === 0 && e.screenY === 0) {
      console.warn('[Security] Coordinate check failed - robot entry blocked.');
      onVerify(false);
      return;
    }

    setIsVerifying(true);

    // Simulate authentic verification challenge (650ms verification duration)
    setTimeout(() => {
      setIsVerifying(false);
      onVerify(true);
    }, 650);
  };

  return (
    <div
      className={cn(
        "relative flex items-center justify-between px-4 py-3 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md rounded-2xl border transition-all duration-200 select-none",
        isVerified
          ? "border-[#54b947]/60 shadow-[0_2px_14px_rgba(84,185,71,0.12)] bg-[#54b947]/5"
          : hasError
          ? "border-red-400 bg-red-50/50 shadow-[0_2px_10px_rgba(239,68,68,0.06)]"
          : "border-white/60 shadow-[0_2px_10px_rgba(0,0,0,0.02)] hover:border-slate-300 bg-white/80",
        disabled && "opacity-60 pointer-events-none",
        className
      )}
    >
      {/* Left: Checkbox + Label */}
      <div className="flex items-center gap-3.5">
        <button
          type="button"
          id="robot-verify-checkbox"
          aria-label="I'm not a robot"
          onClick={handleClick}
          disabled={disabled || isVerified || isVerifying}
          className={cn(
            "relative w-7 h-7 rounded-[7px] border-2 transition-all flex items-center justify-center flex-shrink-0 focus:outline-none focus:ring-4 focus:ring-[#54b947]/20",
            isVerified
              ? "border-[#54b947] bg-[#54b947] text-white shadow-sm"
              : isVerifying
              ? "border-slate-300 bg-slate-50 cursor-wait"
              : hasError
              ? "border-red-400 bg-white hover:border-red-500 cursor-pointer shadow-inner"
              : "border-slate-400/80 bg-white hover:border-slate-600 hover:bg-slate-50 cursor-pointer shadow-inner"
          )}
        >
          {isVerifying ? (
            <Loader2 className="w-4 h-4 text-[#54b947] animate-spin" />
          ) : isVerified ? (
            <Check className="w-4 h-4 stroke-[3] animate-in zoom-in-75 duration-200" />
          ) : null}
        </button>

        <label
          htmlFor="robot-verify-checkbox"
          onClick={handleClick}
          className={cn(
            "text-[14px] font-medium transition-colors cursor-pointer",
            isVerified ? "text-slate-900 font-semibold" : "text-slate-700 hover:text-slate-900"
          )}
        >
          I'm not a robot
        </label>
      </div>

      {/* Right: Security & Privacy Branding */}
      <div className="flex flex-col items-center justify-center pl-3.5 border-l border-slate-200/80">
        <div className="flex items-center justify-center text-[#54b947] drop-shadow-xs">
          <ShieldCheck className="w-6 h-6 text-[#54b947]" />
        </div>
        <div className="text-[10px] text-slate-500 font-bold tracking-tight leading-none mt-1 select-none">
          reCAPTCHA
        </div>
        <div className="flex items-center gap-1 text-[8px] text-slate-400 leading-none mt-0.5 select-none font-medium">
          <span>Privacy</span>
          <span>•</span>
          <span>Terms</span>
        </div>
      </div>
    </div>
  );
};
