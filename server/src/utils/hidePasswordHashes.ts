/**
 * Last line of defence: no JSON response carries a stored password hash, whichever query included
 * the account. Used as Express's JSON replacer. Other values named `password` are left alone.
 */
export const hidePasswordHashes = (key: string, value: unknown): unknown =>
  key === 'password' && typeof value === 'string' && /^\$2[aby]\$\d{2}\$/.test(value) ? undefined : value;
