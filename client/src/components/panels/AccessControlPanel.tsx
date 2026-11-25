import { useCallback, useEffect, useState } from 'react';
import { Search } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ListPagination } from '@/components/ui/list-pagination';
import { confirmDialog } from '@/lib/confirm';
import type { AccessAction } from '@/lib/access';
import { cn } from '@/lib/utils';
import api from '@/lib/api';

type Setting = 'default' | 'allow' | 'deny';
interface ActionRow { action: AccessAction; allowed: boolean; byDefault: boolean; override?: 'allow' | 'deny' }
interface PageRow { key: string; label: string; group: string; actions: ActionRow[] }
interface Detail {
  user: { id: string; name: string; email: string; role: string; branch: string | null; department: string | null };
  features: PageRow[];
  version: string;
  setupRequired: boolean;
}

const SETTINGS: { id: Setting; label: string }[] = [
  { id: 'default', label: 'Default' },
  { id: 'allow', label: 'Allow' },
  { id: 'deny', label: 'Block' },
];
const title = (value: string) => value.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
const errorText = (e: any, fallback: string) => e.response?.data?.message || fallback;

/** What each action will be after saving. Mirrors the server rule in access/resolve.ts. */
const preview = (page: PageRow, settingOf: (action: AccessAction) => Setting) => {
  const allowed = new Set(page.actions
    .filter((a) => (settingOf(a.action) === 'default' ? a.byDefault : settingOf(a.action) === 'allow'))
    .map((a) => a.action));
  if (page.actions.some((a) => settingOf(a.action) === 'allow') && settingOf('view') !== 'deny') allowed.add('view');
  return allowed.has('view') ? allowed : new Set<AccessAction>();
};

export function AccessControlPanel() {
  const [users, setUsers] = useState<any[]>([]);
  const [roles, setRoles] = useState<string[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const [role, setRole] = useState('');
  const [loading, setLoading] = useState(true);
  const [setupRequired, setSetupRequired] = useState(false);
  const [reload, setReload] = useState(0);
  const [selected, setSelected] = useState<string | null>(null);

  useEffect(() => {
    const timer = setTimeout(() => {
      if (searchInput.trim() === search) return;
      setSearch(searchInput.trim());
      setPage(1);
    }, 400);
    return () => clearTimeout(timer);
  }, [searchInput, search]);

  useEffect(() => {
    let outdated = false;
    setLoading(true);
    api.get('/access/users', { params: { page, limit: pageSize, search: search || undefined, role: role || undefined } })
      .then((res) => {
        if (outdated) return;
        setUsers(res.data.data || []);
        setTotal(res.data.total || 0);
        setRoles(res.data.roles || []);
        setSetupRequired(Boolean(res.data.setupRequired));
      })
      .catch((e) => { if (!outdated) toast.error(errorText(e, 'Failed to load users')); })
      .finally(() => { if (!outdated) setLoading(false); });
    return () => { outdated = true; };
  }, [page, pageSize, search, role, reload]);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl sm:text-3xl font-semibold tracking-tight">Access Control</h2>
        <p className="text-muted-foreground text-sm mt-1.5">Choose what each person can see and do, on top of their role.</p>
      </div>

      {setupRequired && (
        <p className="rounded-2xl bg-amber-50 text-amber-800 text-sm px-4 py-3">
          You can look at current access, but changes cannot be saved until the database table is created.
        </p>
      )}

      <div className="rounded-3xl bg-white border border-slate-100 p-4 sm:p-5 space-y-4">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <Input value={searchInput} onChange={(e) => setSearchInput(e.target.value)} placeholder="Search by name or email" className="pl-11 h-11 rounded-full bg-[#f4f6f3] border-transparent" />
          </div>
          <select value={role} onChange={(e) => { setRole(e.target.value); setPage(1); }} className="h-11 rounded-full border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700">
            <option value="">All user types</option>
            {roles.map((r) => <option key={r} value={r}>{title(r)}</option>)}
          </select>
        </div>

        {loading ? (
          <div className="space-y-3">{[1, 2, 3].map((i) => <div key={i} className="h-20 rounded-2xl bg-slate-100 animate-pulse" />)}</div>
        ) : users.length === 0 ? (
          <p className="py-12 text-center text-sm text-muted-foreground">No users found.</p>
        ) : (
          <div className="space-y-3">
            {users.map((u) => (
              <div key={u.id} className="flex flex-col md:flex-row md:items-center justify-between gap-3 p-4 rounded-2xl bg-[#f4f6f3]">
                <div className="min-w-0">
                  <p className="font-semibold text-slate-900">{u.name}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">{u.email}</p>
                  <p className="text-xs text-slate-600 mt-1">{[title(u.role), u.department?.name, u.branch?.name || 'No branch'].filter(Boolean).join(' · ')}</p>
                </div>
                <div className="flex items-center gap-3">
                  {u.overrides > 0 && <span className="rounded-full bg-amber-100 text-amber-700 text-xs font-semibold px-3 py-1">{u.overrides} {u.overrides === 1 ? 'override' : 'overrides'}</span>}
                  <Button variant="outline" onClick={() => setSelected(u.id)} className="h-10 rounded-full px-5 bg-white border-slate-200 hover:bg-[#eaf6e6] font-semibold">Manage Access</Button>
                </div>
              </div>
            ))}
            <ListPagination total={total} page={page} pageSize={pageSize} onPageChange={setPage} onPageSizeChange={(n) => { setPageSize(n); setPage(1); }} />
          </div>
        )}
      </div>

      {selected && <UserAccessDialog userId={selected} onClose={() => setSelected(null)} onSaved={() => setReload((k) => k + 1)} />}
    </div>
  );
}

function UserAccessDialog({ userId, onClose, onSaved }: { userId: string; onClose: () => void; onSaved: () => void }) {
  const [detail, setDetail] = useState<Detail | null>(null);
  const [edits, setEdits] = useState<Record<string, Setting>>({});
  const [reason, setReason] = useState('');
  const [saving, setSaving] = useState(false);
  const [history, setHistory] = useState<any[]>([]);
  const [historyTotal, setHistoryTotal] = useState(0);
  const [historyPage, setHistoryPage] = useState(1);
  const [historySize, setHistorySize] = useState(5);
  const [version, setVersion] = useState(0);

  const load = useCallback(() => {
    api.get(`/access/users/${userId}`)
      .then((res) => { setDetail(res.data.data); setEdits({}); })
      .catch((e) => { toast.error(errorText(e, 'Failed to load access')); onClose(); });
  }, [userId]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => { load(); }, [load, version]);

  useEffect(() => {
    api.get(`/access/users/${userId}/history`, { params: { page: historyPage, limit: historySize } })
      .then((res) => { setHistory(res.data.data || []); setHistoryTotal(res.data.total || 0); })
      .catch(() => setHistory([]));
  }, [userId, historyPage, historySize, version]);

  const saved = (page: PageRow, action: AccessAction): Setting => page.actions.find((a) => a.action === action)?.override || 'default';
  const settingOf = (page: PageRow) => (action: AccessAction): Setting => edits[`${page.key}.${action}`] ?? saved(page, action);

  const changes = (detail?.features || []).flatMap((page) => page.actions
    .filter((a) => settingOf(page)(a.action) !== saved(page, a.action))
    .map((a) => ({ featureKey: page.key, action: a.action, effect: settingOf(page)(a.action) })));
  const hasOverrides = detail?.features.some((p) => p.actions.some((a) => a.override));

  const set = (page: PageRow, action: AccessAction, value: Setting) => setEdits((current) => ({ ...current, [`${page.key}.${action}`]: value }));

  const resetAll = () => setEdits(Object.fromEntries((detail?.features || []).flatMap((page) =>
    page.actions.filter((a) => a.override).map((a) => [`${page.key}.${a.action}`, 'default' as Setting]))));

  const save = async () => {
    if (!detail) return;
    // Giving away deletion or approval to someone whose role lacks it deserves a second look
    const sensitive = changes.filter((c) => c.effect === 'allow' && (c.action === 'delete' || c.action === 'approve')
      && !detail.features.find((p) => p.key === c.featureKey)?.actions.find((a) => a.action === c.action)?.byDefault);
    if (sensitive.length > 0 && !(await confirmDialog({
      title: 'Allow sensitive actions?',
      message: `${detail.user.name} will be able to ${[...new Set(sensitive.map((c) => c.action))].join(' and ')}. Their role does not normally allow this.`,
      confirmText: 'Allow', tone: 'danger',
    }))) return;
    setSaving(true);
    try {
      await api.put(`/access/users/${userId}`, { changes, reason, version: detail.version });
      toast.success('Access updated');
      setReason('');
      setHistoryPage(1);
      setVersion((v) => v + 1);
      onSaved();
    } catch (e: any) {
      toast.error(errorText(e, 'Failed to save access'));
      if (e.response?.status === 409) setVersion((v) => v + 1);
    } finally {
      setSaving(false);
    }
  };

  const labelOf = (key: string) => detail?.features.find((p) => p.key === key)?.label || key;

  return (
    <Dialog open onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent className="wizard-form sm:max-w-3xl max-h-[92vh] overflow-y-auto rounded-[2rem] border-0 bg-white p-6 sm:p-8" style={{ fontFamily: 'Urbanist, ui-sans-serif, system-ui, sans-serif' }}>
        <DialogHeader>
          <DialogTitle className="text-xl font-semibold tracking-tight">{detail?.user.name || 'Access'}</DialogTitle>
          <DialogDescription>
            {detail ? [title(detail.user.role), detail.user.department, detail.user.branch || 'No branch'].filter(Boolean).join(' · ') : 'Loading'}
          </DialogDescription>
        </DialogHeader>

        {!detail ? (
          <div className="h-40 rounded-2xl bg-slate-100 animate-pulse" />
        ) : (
          <div className="space-y-5">
            {!detail.user.branch && (
              <p className="rounded-2xl bg-amber-50 text-amber-800 text-sm px-4 py-3">This user has no branch, so actions can be blocked but not allowed. Assign a branch first.</p>
            )}
            {detail.features.map((page) => {
              const result = preview(page, settingOf(page));
              const blockedButAllowed = settingOf(page)('view') === 'deny' && page.actions.some((a) => settingOf(page)(a.action) === 'allow');
              return (
                <section key={page.key} className="rounded-3xl bg-[#f4f6f3] p-4 sm:p-5 space-y-3">
                  <h3 className="font-semibold tracking-tight">{page.label}</h3>
                  {blockedButAllowed && <p className="text-xs text-amber-700">View is blocked, so nothing else on this page will work.</p>}
                  {page.actions.map((a) => (
                    <div key={a.action} className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <div>
                        <p className="text-sm font-semibold capitalize text-slate-800">{a.action}</p>
                        <p className="text-xs text-muted-foreground">
                          Role default: {a.byDefault ? 'yes' : 'no'} · Result: <span className={result.has(a.action) ? 'text-[#256c1d] font-semibold' : 'text-slate-500 font-semibold'}>{result.has(a.action) ? 'can' : 'cannot'}</span>
                        </p>
                      </div>
                      <div className="flex gap-1 bg-white p-1 rounded-full w-fit" role="group" aria-label={`${page.label}: ${a.action}`}>
                        {SETTINGS.map((option) => {
                          const active = settingOf(page)(a.action) === option.id;
                          return (
                            <button key={option.id} type="button" aria-pressed={active}
                              disabled={option.id === 'allow' && !detail.user.branch}
                              onClick={() => set(page, a.action, option.id)}
                              className={cn('rounded-full px-3.5 py-1.5 text-xs font-semibold transition-colors disabled:opacity-40',
                                !active ? 'text-slate-600 hover:bg-[#f4f6f3]' : option.id === 'deny' ? 'bg-rose-600 text-white' : option.id === 'allow' ? 'bg-[#8ae47e] text-[#0b1d14]' : 'bg-slate-800 text-white')}>
                              {option.label}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </section>
              );
            })}

            <div className="space-y-2">
              <label htmlFor="access-reason" className="text-sm font-semibold">Reason <span className="text-rose-500">*</span></label>
              <Input id="access-reason" value={reason} onChange={(e) => setReason(e.target.value)} maxLength={500} placeholder="Why is this changing?" className="h-11 rounded-xl" />
            </div>
            <div className="flex flex-wrap justify-between gap-3">
              <Button type="button" variant="ghost" className="h-11 rounded-full px-5" disabled={!hasOverrides} onClick={resetAll}>Reset All to Default</Button>
              <div className="flex gap-2">
                <Button type="button" variant="outline" className="h-11 rounded-full px-6" onClick={onClose}>Close</Button>
                <Button type="button" onClick={save} disabled={saving || changes.length === 0 || !reason.trim() || detail.setupRequired}
                  className="h-11 rounded-full px-6 bg-[#8ae47e] hover:bg-[#7bd96f] text-[#0b1d14] font-semibold">
                  {saving ? 'Saving...' : `Save${changes.length ? ` (${changes.length})` : ''}`}
                </Button>
              </div>
            </div>

            {historyTotal > 0 && (
              <section className="space-y-2 pt-4 border-t border-slate-100">
                <h3 className="font-semibold tracking-tight">History</h3>
                {history.map((h) => (
                  <div key={h.id} className="rounded-2xl bg-[#f4f6f3] px-4 py-3 text-sm">
                    <p className="font-semibold">{labelOf(h.featureKey)} · {title(h.action)} · {h.effect === 'deny' ? 'Blocked' : 'Allowed'}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {new Date(h.createdAt).toLocaleString()} by {h.grantedBy}. {h.reason}
                      {h.revokedAt && ` Ended ${new Date(h.revokedAt).toLocaleString()} by ${h.revokedBy}.`}
                    </p>
                  </div>
                ))}
                <ListPagination total={historyTotal} page={historyPage} pageSize={historySize} onPageChange={setHistoryPage} onPageSizeChange={(n) => { setHistorySize(n); setHistoryPage(1); }} />
              </section>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
