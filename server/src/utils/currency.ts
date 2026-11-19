// Organisation currency: the symbol shown with amounts. Amounts are plain numbers; changing
// the currency never converts them. Stored in Organization.metadata.currency = { code }.
import prisma from '../lib/prisma.js';

export interface CurrencyDef { code: string; name: string; symbol: string; locale: string }

// `symbol` is shown on screens; PDFs use pdfSymbol() because the built-in PDF font lacks some glyphs.
export const CURRENCIES: CurrencyDef[] = [
  { code: 'INR', name: 'Indian Rupee', symbol: '₹', locale: 'en-IN' },
  { code: 'USD', name: 'US Dollar', symbol: '$', locale: 'en-US' },
  { code: 'EUR', name: 'Euro', symbol: '€', locale: 'en-IE' },
  { code: 'GBP', name: 'British Pound', symbol: '£', locale: 'en-GB' },
  { code: 'AED', name: 'UAE Dirham', symbol: 'AED ', locale: 'en-US' },
  { code: 'SAR', name: 'Saudi Riyal', symbol: 'SAR ', locale: 'en-US' },
  { code: 'QAR', name: 'Qatari Riyal', symbol: 'QAR ', locale: 'en-US' },
  { code: 'KWD', name: 'Kuwaiti Dinar', symbol: 'KWD ', locale: 'en-US' },
  { code: 'OMR', name: 'Omani Rial', symbol: 'OMR ', locale: 'en-US' },
  { code: 'BHD', name: 'Bahraini Dinar', symbol: 'BHD ', locale: 'en-US' },
  { code: 'SGD', name: 'Singapore Dollar', symbol: 'S$', locale: 'en-SG' },
  { code: 'MYR', name: 'Malaysian Ringgit', symbol: 'RM ', locale: 'en-MY' },
  { code: 'AUD', name: 'Australian Dollar', symbol: 'A$', locale: 'en-AU' },
  { code: 'CAD', name: 'Canadian Dollar', symbol: 'C$', locale: 'en-CA' },
  { code: 'NZD', name: 'New Zealand Dollar', symbol: 'NZ$', locale: 'en-NZ' },
  { code: 'LKR', name: 'Sri Lankan Rupee', symbol: 'Rs ', locale: 'en-LK' },
  { code: 'NPR', name: 'Nepalese Rupee', symbol: 'Rs ', locale: 'en-IN' },
  { code: 'PKR', name: 'Pakistani Rupee', symbol: 'Rs ', locale: 'en-PK' },
  { code: 'BDT', name: 'Bangladeshi Taka', symbol: 'BDT ', locale: 'en-IN' },
  { code: 'ZAR', name: 'South African Rand', symbol: 'R ', locale: 'en-ZA' },
  { code: 'NGN', name: 'Nigerian Naira', symbol: 'NGN ', locale: 'en-NG' },
  { code: 'KES', name: 'Kenyan Shilling', symbol: 'KSh ', locale: 'en-KE' },
];

export const DEFAULT_CURRENCY = 'INR';
export const findCurrency = (code?: string | null): CurrencyDef =>
  CURRENCIES.find((c) => c.code === (code || '').toUpperCase()) || CURRENCIES[0];

// Number grouping follows the currency's locale (Indian grouping for INR/NPR/BDT).
export const formatAmount = (n: number, code?: string | null, opts?: Intl.NumberFormatOptions) =>
  Number(n || 0).toLocaleString(findCurrency(code).locale, opts);

export const formatMoney = (n: number, code?: string | null, opts?: Intl.NumberFormatOptions) =>
  `${findCurrency(code).symbol}${formatAmount(n, code, opts)}`;

// The built-in PDF font cannot draw every symbol; keep ₹ as the receipts already did, use the code otherwise.
export const pdfSymbol = (code?: string | null) => {
  const c = findCurrency(code);
  return ['INR', 'USD', 'EUR', 'GBP'].includes(c.code) ? c.symbol : `${c.code} `;
};

const cache = new Map<string, { code: string; at: number }>();
export async function getOrgCurrencyCode(organizationId?: string | null): Promise<string> {
  if (!organizationId) return DEFAULT_CURRENCY;
  const hit = cache.get(organizationId);
  if (hit && Date.now() - hit.at < 60_000) return hit.code;
  const org = await prisma.organization.findUnique({ where: { id: organizationId }, select: { metadata: true } }).catch(() => null);
  const code = findCurrency(((org?.metadata as any) || {}).currency?.code).code;
  cache.set(organizationId, { code, at: Date.now() });
  return code;
}
export const clearCurrencyCache = (organizationId: string) => cache.delete(organizationId);
