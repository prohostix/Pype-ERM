// statusHistory is a plain JSON column. Some older code saved entries with
// Prisma's list-only `push`, which stored {"push": {...}} instead of a list, so
// accept either shape when reading and always write a real array.
export const historyList = (raw: any): any[] =>
  Array.isArray(raw) ? raw : (raw && typeof raw === 'object' ? Object.values(raw) : []);

export const appendHistory = (raw: any, entry: any): any[] => [...historyList(raw), entry];
