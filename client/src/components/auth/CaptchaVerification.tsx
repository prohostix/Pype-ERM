import React, { useEffect, useRef, useState, useCallback } from 'react';
import { Input } from '@/components/ui/input';
import { ShieldCheck, RotateCw, Volume2, CheckCircle2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface CaptchaVerificationProps {
  code: string;
  value: string;
  onChange: (val: string) => void;
  onRefresh: () => void;
  isMatched: boolean;
  disabled?: boolean;
  className?: string;
}

export const CaptchaVerification: React.FC<CaptchaVerificationProps> = ({
  code,
  value,
  onChange,
  onRefresh,
  isMatched,
  disabled = false,
  className,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [isRotating, setIsRotating] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);

  // Draw distorted characters with background noise on canvas
  const drawCaptcha = useCallback((text: string) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    const displayWidth = 140;
    const displayHeight = 42;

    canvas.width = displayWidth * dpr;
    canvas.height = displayHeight * dpr;
    canvas.style.width = `${displayWidth}px`;
    canvas.style.height = `${displayHeight}px`;

    ctx.scale(dpr, dpr);

    // Dynamic gradient background matching brand aesthetics
    const gradient = ctx.createLinearGradient(0, 0, displayWidth, displayHeight);
    gradient.addColorStop(0, '#f0fdf4'); // green-50
    gradient.addColorStop(0.5, '#f8fafc'); // slate-50
    gradient.addColorStop(1, '#ecfdf5'); // emerald-50
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, displayWidth, displayHeight);

    // Decorative noise lines (bezier curves)
    const lineColors = [
      'rgba(84, 185, 71, 0.35)',
      'rgba(44, 119, 34, 0.3)',
      'rgba(15, 118, 110, 0.28)',
      'rgba(71, 85, 105, 0.25)',
    ];

    for (let i = 0; i < 3; i++) {
      ctx.strokeStyle = lineColors[i % lineColors.length];
      ctx.lineWidth = 1.2 + Math.random() * 0.8;
      ctx.beginPath();
      ctx.moveTo(Math.random() * 20, Math.random() * displayHeight);
      ctx.bezierCurveTo(
        displayWidth * 0.3,
        Math.random() * displayHeight,
        displayWidth * 0.6,
        Math.random() * displayHeight,
        displayWidth - Math.random() * 20,
        Math.random() * displayHeight
      );
      ctx.stroke();
    }

    // Noise speckles/dots
    for (let i = 0; i < 30; i++) {
      ctx.fillStyle = `rgba(${Math.floor(Math.random() * 60 + 20)}, ${Math.floor(
        Math.random() * 120 + 40
      )}, ${Math.floor(Math.random() * 80 + 20)}, ${0.2 + Math.random() * 0.35})`;
      ctx.beginPath();
      ctx.arc(
        Math.random() * displayWidth,
        Math.random() * displayHeight,
        Math.random() * 1.5 + 0.5,
        0,
        Math.PI * 2
      );
      ctx.fill();
    }

    // Render each character with random rotation, font, and color
    const charWidth = displayWidth / (text.length + 0.9);
    const fontFamilies = [
      'system-ui',
      'Inter',
      'Segoe UI',
      'Roboto',
      'Verdana',
      'Arial',
    ];
    const textColors = [
      '#15803d', // green-700
      '#166534', // green-800
      '#0f766e', // teal-700
      '#1e293b', // slate-800
      '#047857', // emerald-700
      '#1a4f15', // brand dark green
    ];

    for (let i = 0; i < text.length; i++) {
      const char = text[i];
      const x = 14 + i * charWidth;
      const y = displayHeight / 2 + (Math.random() * 4 - 2);
      const angle = (Math.random() - 0.5) * 0.38; // ~ -11 to +11 degrees
      const font = fontFamilies[Math.floor(Math.random() * fontFamilies.length)];
      const color = textColors[Math.floor(Math.random() * textColors.length)];

      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(angle);
      ctx.font = `bold 21px ${font}`;
      ctx.fillStyle = color;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.shadowColor = 'rgba(0, 0, 0, 0.12)';
      ctx.shadowBlur = 2;
      ctx.shadowOffsetX = 1;
      ctx.shadowOffsetY = 1;
      ctx.fillText(char, 0, 0);
      ctx.restore();
    }
  }, []);

  useEffect(() => {
    if (code) {
      drawCaptcha(code);
    }
  }, [code, drawCaptcha]);

  const handleRefreshClick = () => {
    if (disabled) return;
    setIsRotating(true);
    onRefresh();
    setTimeout(() => setIsRotating(false), 500);
  };

  const speakCaptcha = () => {
    if (disabled || !('speechSynthesis' in window)) return;
    setIsSpeaking(true);
    window.speechSynthesis.cancel();
    
    // Spell out letters with slight pause for clarity
    const spokenText = `Security verification code: ${code.split('').join(' . ')}`;
    const utterance = new SpeechSynthesisUtterance(spokenText);
    utterance.rate = 0.8;
    utterance.pitch = 1.0;
    utterance.onend = () => setIsSpeaking(false);
    utterance.onerror = () => setIsSpeaking(false);
    window.speechSynthesis.speak(utterance);
  };

  return (
    <div
      className={cn(
        'rounded-2xl border border-slate-200/80 bg-white/70 backdrop-blur-md p-3.5 shadow-[0_2px_12px_rgba(0,0,0,0.03)] transition-all space-y-2.5',
        disabled && 'opacity-60 pointer-events-none',
        className
      )}
    >
      {/* Header Info */}
      <div className="flex items-center justify-between text-xs font-medium text-slate-600 px-0.5">
        <span className="flex items-center gap-1.5 font-semibold text-slate-700">
          <ShieldCheck className="w-4 h-4 text-[#54b947]" />
          Bot Protection
        </span>
        {isMatched ? (
          <span className="inline-flex items-center gap-1 text-[#2c7722] font-semibold text-[11px] bg-green-50 px-2 py-0.5 rounded-full border border-green-200/60">
            <CheckCircle2 className="w-3.5 h-3.5 text-[#54b947]" />
            Verified
          </span>
        ) : (
          <span className="text-[11px] text-slate-400">Type the characters</span>
        )}
      </div>

      {/* Main Row: Canvas + Controls + Input */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5">
        {/* Canvas & Action Buttons */}
        <div className="flex items-center gap-1.5 justify-between sm:justify-start">
          <div
            onClick={handleRefreshClick}
            className="relative rounded-xl border border-slate-200/90 bg-white overflow-hidden shadow-sm cursor-pointer group select-none hover:border-[#54b947]/50 transition-colors"
            title="Click image to refresh verification code"
          >
            <canvas ref={canvasRef} className="block" />
            <div className="absolute inset-0 bg-black/0 group-hover:bg-[#54b947]/5 transition-colors pointer-events-none" />
          </div>

          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={handleRefreshClick}
              disabled={disabled}
              title="Generate new verification code"
              className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-100/80 active:bg-slate-200/80 rounded-xl transition-all border border-transparent hover:border-slate-200/80 focus:outline-none"
            >
              <RotateCw
                className={cn(
                  'w-4 h-4 transition-transform duration-500',
                  isRotating && 'rotate-180 text-[#54b947]'
                )}
              />
            </button>
            <button
              type="button"
              onClick={speakCaptcha}
              disabled={disabled}
              title="Listen to audio code"
              className={cn(
                'p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-100/80 active:bg-slate-200/80 rounded-xl transition-all border border-transparent hover:border-slate-200/80 focus:outline-none',
                isSpeaking && 'text-[#54b947] bg-green-50 border-green-200'
              )}
            >
              <Volume2 className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Captcha Input */}
        <div className="flex-1 relative">
          <Input
            id="captcha-input"
            type="text"
            value={value}
            onChange={(e) => onChange(e.target.value.toUpperCase())}
            placeholder="Enter code"
            maxLength={6}
            autoCapitalize="characters"
            autoComplete="off"
            spellCheck="false"
            disabled={disabled}
            className={cn(
              'h-11 rounded-xl border-slate-200/90 bg-white/90 text-center tracking-widest font-mono font-bold text-sm uppercase transition-all shadow-[0_2px_8px_rgba(0,0,0,0.02)] pr-8',
              'focus:bg-white focus:border-[#54b947] focus:ring-4 focus:ring-[#54b947]/20',
              isMatched &&
                'border-[#54b947] ring-2 ring-[#54b947]/20 bg-green-50/20 text-[#166534]'
            )}
            required
          />
          {isMatched && (
            <CheckCircle2 className="w-4 h-4 text-[#54b947] absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          )}
        </div>
      </div>
    </div>
  );
};
