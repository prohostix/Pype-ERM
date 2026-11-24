/** Shared "premium" card look: soft gradient, layered shadow, inner highlight, lift on hover. */
const BASE =
  'relative rounded-[28px] border-0 hover:-translate-y-1 ' +
  'hover:shadow-[0_24px_44px_-18px_rgba(44,119,34,0.28)] ' +
  'transition-all duration-300 ease-out ';

export const PREMIUM_CARD = BASE + 'bg-[#f4f6f3]';
export const PREMIUM_CARD_ALT = BASE + 'bg-[#f6f6f4]';
export const PREMIUM_CARD_STATIC = PREMIUM_CARD.replace('hover:-translate-y-1 ', '');
export const ICON_CHIP =
  'flex items-center justify-center text-white rounded-xl bg-gradient-to-br from-[#6bd05a] via-[#54b947] to-[#2c7722] ' +
  'shadow-lg shadow-[#54b947]/30 ring-1 ring-inset ring-white/30';
