interface ListPaginationProps {
  total: number;
  page: number;
  pageSize: number;
  onPageChange: (page: number) => void;
  onPageSizeChange: (size: number) => void;
  className?: string;
}

/** Footer with "Showing x–y of z", a Rows selector and numbered pages. Always visible when there are results. */
export function ListPagination({ total, page, pageSize, onPageChange, onPageSizeChange, className = '' }: ListPaginationProps) {
  if (total <= 0) return null;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const current = Math.min(page, totalPages);
  const pages: (number | '…')[] = [];
  const add = (n: number | '…') => { if (pages[pages.length - 1] !== n) pages.push(n); };
  for (let n = 1; n <= totalPages; n++) {
    if (n === 1 || n === totalPages || Math.abs(n - current) <= 1) add(n);
    else if (pages[pages.length - 1] !== '…') add('…');
  }
  const nav = 'h-9 min-w-9 px-3 rounded-full text-sm font-medium transition-colors disabled:opacity-40 disabled:pointer-events-none';
  return (
    <div className={`flex flex-col lg:flex-row items-center justify-between gap-4 pt-5 mt-2 border-t border-slate-100 ${className}`}>
      <div className="flex flex-wrap items-center justify-center gap-3 text-sm text-muted-foreground">
        <span>
          Showing <span className="font-semibold text-foreground">{(current - 1) * pageSize + 1}–{Math.min(current * pageSize, total)}</span> of <span className="font-semibold text-foreground">{total.toLocaleString()}</span>
        </span>
        <label className="flex items-center gap-2">
          Rows
          <select value={pageSize} onChange={(e) => onPageSizeChange(Number(e.target.value))} className="h-9 rounded-full border border-slate-200 bg-white px-3 text-sm text-slate-700">
            {[5, 10, 25, 50].map(n => <option key={n} value={n}>{n}</option>)}
          </select>
        </label>
      </div>
      <nav className="flex items-center gap-1" aria-label="Pagination">
        <button type="button" className={`${nav} text-slate-600 hover:bg-[#f4f6f3]`} onClick={() => onPageChange(current - 1)} disabled={current <= 1}>Previous</button>
        {pages.map((n, i) => n === '…' ? (
          <span key={`e${i}`} className="px-1 text-slate-400">…</span>
        ) : (
          <button key={n} type="button" onClick={() => onPageChange(n)} aria-current={n === current ? 'page' : undefined}
            className={`${nav} tabular-nums ${n === current ? 'bg-[#0b1d14] text-white' : 'text-slate-600 hover:bg-[#f4f6f3]'}`}>{n}</button>
        ))}
        <button type="button" className={`${nav} text-slate-600 hover:bg-[#f4f6f3]`} onClick={() => onPageChange(current + 1)} disabled={current >= totalPages}>Next</button>
      </nav>
    </div>
  );
}
