// Organisation currency for the whole app. Amounts are plain numbers; only the symbol and the
// digit grouping change. The code is loaded once after login (see CurrencyBoundary in App.tsx).

export interface CurrencyOption { code: string; name: string; symbol: string; locale: string }

export const FALLBACK_CURRENCIES: CurrencyOption[] = [
  { code: 'INR', name: 'Indian Rupee', symbol: '₹', locale: 'en-IN' },
  { code: 'USD', name: 'US Dollar', symbol: '$', locale: 'en-US' },
];

let options: CurrencyOption[] = FALLBACK_CURRENCIES;
let current: CurrencyOption = FALLBACK_CURRENCIES[0];

export function setCurrencyOptions(list: CurrencyOption[]) {
  if (Array.isArray(list) && list.length) options = list;
}

export function setCurrency(code?: string | null) {
  current = options.find((c) => c.code === (code || '').toUpperCase()) || options[0];
}

export const getCurrencyCode = () => current.code;

/** Currency symbol, e.g. "₹" or "$". Use in place of a hardcoded ₹. */
export const CS = () => current.symbol;

/** Locale for formatting amounts (Indian grouping for INR, international for the rest). */
export const numLocale = () => current.locale;

/** "₹1,23,456" / "$123,456" */
export const money = (n: number | string | null | undefined, opts?: Intl.NumberFormatOptions) =>
  `${current.symbol}${Number(n || 0).toLocaleString(current.locale, opts)}`;

/** Short form of a large amount: lakh/crore for Indian grouping, K/M/B otherwise. e.g. "₹1.20 L", "$120.00K" */
export const compactMoney = (n: number, digits = 2): string => {
  const v = Math.abs(Number(n) || 0);
  const sign = Number(n) < 0 ? '-' : '';
  const s = current.symbol;
  if (current.locale === 'en-IN') {
    if (v >= 1e7) return `${sign}${s}${(v / 1e7).toFixed(digits)} Cr`;
    if (v >= 1e5) return `${sign}${s}${(v / 1e5).toFixed(digits)} L`;
  } else {
    if (v >= 1e9) return `${sign}${s}${(v / 1e9).toFixed(digits)}B`;
    if (v >= 1e6) return `${sign}${s}${(v / 1e6).toFixed(digits)}M`;
    if (v >= 1e3) return `${sign}${s}${(v / 1e3).toFixed(digits)}K`;
  }
  return `${sign}${s}${Math.round(v).toLocaleString(current.locale)}`;
};
