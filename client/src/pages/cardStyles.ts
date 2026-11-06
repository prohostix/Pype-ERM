/** Shared "premium" card look: soft gradient, layered shadow, inner highlight, lift on hover. */
const BASE =
  'relative rounded-3xl border border-slate-200/60 ring-1 ring-inset ring-white/80 ' +
  'shadow-[0_1px_2px_rgba(16,24,40,0.04),0_10px_28px_-10px_rgba(16,24,40,0.10)] ' +
  'hover:-translate-y-1 hover:border-[#54b947]/40 ' +
  'hover:shadow-[0_2px_4px_rgba(16,24,40,0.04),0_24px_44px_-14px_rgba(44,119,34,0.28)] ' +
  'transition-all duration-300 ease-out ';

export const PREMIUM_CARD = BASE + 'bg-gradient-to-br from-white via-white to-emerald-50/80';
export const PREMIUM_CARD_ALT = BASE + 'bg-gradient-to-br from-slate-50 via-white to-slate-100/70';
export const PREMIUM_CARD_STATIC = PREMIUM_CARD.replace('hover:-translate-y-1 ', '');
export const ICON_CHIP =
  'flex items-center justify-center text-white rounded-xl bg-gradient-to-br from-[#6bd05a] via-[#54b947] to-[#2c7722] ' +
  'shadow-lg shadow-[#54b947]/30 ring-1 ring-inset ring-white/30';
