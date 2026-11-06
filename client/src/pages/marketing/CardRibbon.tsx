import { useId } from 'react';

/** The brand's flowing green ribbon, drawn behind the content of a dark card. The card needs `relative overflow-hidden`. */
export function CardRibbon({ strength = 0.55 }: { strength?: number }) {
  const id = useId();
  return (
    <svg aria-hidden="true" className="absolute inset-0 w-full h-full pointer-events-none" viewBox="0 0 400 600" preserveAspectRatio="none">
      <defs>
        <linearGradient id={`${id}-top`} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#54b947" /><stop offset="50%" stopColor="#2e8229" /><stop offset="100%" stopColor="#124317" />
        </linearGradient>
        <linearGradient id={`${id}-bottom`} x1="100%" y1="100%" x2="0%" y2="0%">
          <stop offset="0%" stopColor="#54b947" /><stop offset="100%" stopColor="#1a5323" />
        </linearGradient>
      </defs>
      <path d="M0,0 L220,0 C280,250 150,350 0,550 Z" fill={`url(#${id}-top)`} opacity={strength} />
      <path d="M400,600 L100,600 C250,450 400,300 400,100 Z" fill={`url(#${id}-bottom)`} opacity={strength} />
    </svg>
  );
}
