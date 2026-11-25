import { useEffect, useState } from 'react';
import { ArrowLeft, History, Search, ShieldCheck, TriangleAlert, UserRound } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ListPagination } from '@/components/ui/list-pagination';
import { confirmDialog } from '@/lib/confirm';
import type { AccessAction } from '@/lib/access';
import { cn } from '@/lib/utils';
import api from '@/lib/api';

type Setting = 'default' | 'allow' | 'deny';
interface ActionRow { action: AccessAction; allowed: boolean; byDefault: boolean; override?: 'allow' | 'deny' }
interface PageRow { key: string; label: string; group: string; blockOnly: boolean; actions: ActionRow[] }
interface Detail {
  user: { id: string; name: string; email: string; role: string; branch: string | null; department: string | null };
  features: PageRow[];
  version: string;
  setupRequired: boolean;
}

const SETTINGS: { id: Setting; label: string; active: string }[] = [
  { id: 'default', label: 'Role', active: 'bg-[#0b1d14] text-white' },
  { id: 'allow', label: 'Allow', active: 'bg-[#8ae47e] text-[#0b1d14]' },
  { id: 'deny', label: 'Block', active: 'bg-rose-600 text-white' },
];
const CHANGED = 'Changed';

const title = (value: string) => value.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
const errorText = (e: any, fallback: string) => e.response?.data?.message || fallback;
const initials = (name?: string) => (name || '?').trim().split(/\s+/).slice(0, 2).map((p) => p[0]).join('').toUpperCase();

/** What each action will be after saving. Mirrors the server rule in access/resolve.ts. */
const preview = (page: PageRow, settingOf: (action: AccessAction) => Setting) => {
  const allowed = new Set(page.actions
    .filter((a) => (settingOf(a.action) === 'default' ? a.byDefault : settingOf(a.action) === 'allow'))
    .map((a) => a.action));
  if (page.actions.some((a) => settingOf(a.action) === 'allow') && settingOf('view') !== 'deny') allowed.add('view');
  return allowed.has('view') ? allowed : new Set<AccessAction>();
};

const leaveEdits = () => confirmDialog({
  title: 'Discard unsaved changes?',
  message: 'The changes for this person have not been saved.',
  confirmText: 'Discard',
  tone: 'danger',
});

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
  const [dirty, setDirty] = useState(false);

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

  const open = async (id: string | null) => {
    if (id === selected || (dirty && !(await leaveEdits()))) return;
    setDirty(false);
    setSelected(id);
  };

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

      <div className="grid grid-cols-1 lg:grid-cols-[340px_minmax(0,1fr)] gap-4 items-start">
        {/* People. On small screens this gives way to the chosen person. */}
        <aside className={cn('rounded-3xl bg-white border border-slate-100 p-4 space-y-3', selected && 'hidden lg:block')}>
          <div className="flex items-center justify-between">
            <h3 className="font-semibold tracking-tight">People</h3>
            {!loading && <span className="rounded-full bg-[#eaf6e6] text-[#256c1d] text-xs font-semibold px-3 py-1">{total.toLocaleString()}</span>}
          </div>
          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <Input value={searchInput} onChange={(e) => setSearchInput(e.target.value)} placeholder="Search name or email" aria-label="Search people"
              className="pl-11 h-11 rounded-full bg-[#f4f6f3] border-transparent" />
          </div>
          <select value={role} onChange={(e) => { setRole(e.target.value); setPage(1); }} aria-label="User type"
            className="w-full h-11 rounded-full border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700">
            <option value="">All user types</option>
            {roles.map((r) => <option key={r} value={r}>{title(r)}</option>)}
          </select>

          {loading ? (
            <div className="space-y-2">{[1, 2, 3, 4, 5].map((i) => <div key={i} className="h-16 rounded-2xl bg-slate-100 animate-pulse" />)}</div>
          ) : users.length === 0 ? (
            <p className="py-10 text-center text-sm text-muted-foreground">No people found.</p>
          ) : (
            <>
              <ul className="space-y-1.5">
                {users.map((u) => {
                  const active = u.id === selected;
                  return (
                    <li key={u.id}>
                      <button type="button" onClick={() => open(u.id)} aria-current={active || undefined}
                        className={cn('w-full flex items-center gap-3 rounded-2xl p-3 text-left transition-colors', active ? 'bg-[#0b1d14] text-white' : 'bg-[#f4f6f3] hover:bg-[#eaf6e6]')}>
                        <span className={cn('flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-sm font-semibold', active ? 'bg-[#8ae47e] text-[#0b1d14]' : 'bg-white text-[#256c1d]')}>
                          {initials(u.name)}
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-sm font-semibold">{u.name}</span>
                          <span className={cn('block truncate text-xs', active ? 'text-white/70' : 'text-muted-foreground')}>
                            {title(u.role)} · {u.branch?.name || 'No branch'}
                          </span>
                        </span>
                        {u.overrides > 0 && (
                          <span title={`${u.overrides} custom ${u.overrides === 1 ? 'setting' : 'settings'}`}
                            className="rounded-full bg-amber-100 text-amber-700 text-[11px] font-bold px-2 py-0.5 tabular-nums">{u.overrides}</span>
                        )}
                      </button>
                    </li>
                  );
                })}
              </ul>
              <ListPagination total={total} page={page} pageSize={pageSize} onPageChange={setPage} onPageSizeChange={(n) => { setPageSize(n); setPage(1); }}
                className="lg:!flex-col [&_nav]:flex-wrap [&_nav]:justify-center" />
            </>
          )}
        </aside>

        {selected ? (
          <UserAccess key={selected} userId={selected} onBack={() => open(null)} onDirty={setDirty} onSaved={() => setReload((k) => k + 1)}
            onFailed={() => { setDirty(false); setSelected(null); }} />
        ) : (
          <div className="hidden lg:flex flex-col items-center justify-center text-center rounded-3xl border border-dashed border-slate-200 bg-white py-28 px-6">
            <span className="w-16 h-16 rounded-2xl bg-[#eaf6e6] text-[#256c1d] flex items-center justify-center mb-4"><ShieldCheck className="w-7 h-7" /></span>
            <p className="font-semibold">Select a person</p>
            <p className="text-sm text-muted-foreground mt-1 max-w-sm">Their pages and actions appear here. Leave a setting on Role to keep what their role gives.</p>
          </div>
        )}
      </div>
    </div>
  );
}

interface UserAccessProps {
  userId: string;
  onBack: () => void;
  onDirty: (dirty: boolean) => void;
  onSaved: () => void;
  onFailed: () => void;
}

function UserAccess({ userId, onBack, onDirty, onSaved, onFailed }: UserAccessProps) {
  const [detail, setDetail] = useState<Detail | null>(null);
  const [edits, setEdits] = useState<Record<string, Setting>>({});
  const [reason, setReason] = useState('');
  const [saving, setSaving] = useState(false);
  const [tab, setTab] = useState<'permissions' | 'history'>('permissions');
  const [history, setHistory] = useState<any[]>([]);
  const [historyTotal, setHistoryTotal] = useState(0);
  const [historyPage, setHistoryPage] = useState(1);
  const [historySize, setHistorySize] = useState(10);
  const [version, setVersion] = useState(0);
  const [group, setGroup] = useState('Students and admissions');
  const [find, setFind] = useState('');

  useEffect(() => {
    let outdated = false;
    api.get(`/access/users/${userId}`)
      .then((res) => { if (!outdated) { setDetail(res.data.data); setEdits({}); } })
      .catch((e) => { if (!outdated) { toast.error(errorText(e, 'Failed to load access')); onFailed(); } });
    return () => { outdated = true; };
  }, [userId, version]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    let outdated = false;
    api.get(`/access/users/${userId}/history`, { params: { page: historyPage, limit: historySize } })
      .then((res) => { if (!outdated) { setHistory(res.data.data || []); setHistoryTotal(res.data.total || 0); } })
      .catch(() => { if (!outdated) setHistory([]); });
    return () => { outdated = true; };
  }, [userId, historyPage, historySize, version]);

  const saved = (page: PageRow, action: AccessAction): Setting => page.actions.find((a) => a.action === action)?.override || 'default';
  const settingOf = (page: PageRow) => (action: AccessAction): Setting => edits[`${page.key}.${action}`] ?? saved(page, action);

  const pages = detail?.features || [];
  const changes = pages.flatMap((page) => page.actions
    .filter((a) => settingOf(page)(a.action) !== saved(page, a.action))
    .map((a) => ({ featureKey: page.key, action: a.action, effect: settingOf(page)(a.action) })));
  const dirty = changes.length > 0;
  useEffect(() => { onDirty(dirty); }, [dirty]); // eslint-disable-line react-hooks/exhaustive-deps

  /** Settings as they would be after saving */
  const countOf = (effect: Setting) => pages.reduce((n, p) => n + p.actions.filter((a) => settingOf(p)(a.action) === effect).length, 0);
  const isCustom = (p: PageRow) => p.actions.some((a) => a.override || settingOf(p)(a.action) !== 'default');
  const customPages = pages.filter(isCustom);
  const groups = [...new Set(pages.map((p) => p.group))];
  // Searching looks through every group
  const query = find.trim().toLowerCase();
  const shown = pages.filter((p) => (query ? p.label.toLowerCase().includes(query) : group === CHANGED ? isCustom(p) : p.group === group));

  const setMany = (page: PageRow, actions: AccessAction[], value: Setting) =>
    setEdits((current) => ({ ...current, ...Object.fromEntries(actions.map((a) => [`${page.key}.${a}`, value])) }));
  const resetAll = () => setEdits(Object.fromEntries(pages.flatMap((page) =>
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
    // With no branch there is nothing to narrow the data to
    if (!detail.user.branch && changes.some((c) => c.effect === 'allow') && !(await confirmDialog({
      title: 'Allow for all branches?',
      message: `${detail.user.name} has no branch, so the pages you allow show data from every branch in your organization.`,
      confirmText: 'Allow', tone: 'danger',
    }))) return;
    // These pages control accounts and who is in charge, so they can lead to wider access
    const structure = [...new Set(changes
      .filter((c) => c.effect === 'allow' && c.action !== 'view' && ['users', 'departments', 'branches', 'org_chart', 'managers'].includes(c.featureKey))
      .map((c) => detail.features.find((p) => p.key === c.featureKey)?.label))];
    if (structure.length > 0 && !(await confirmDialog({
      title: 'Allow account and structure changes?',
      message: `${detail.user.name} will be able to change ${structure.join(', ')}. This affects who can do what, so give it only to someone you trust.`,
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

  const labelOf = (key: string) => pages.find((p) => p.key === key)?.label || key;

  if (!detail) {
    return (
      <div className="space-y-4">
        <div className="h-28 rounded-3xl bg-slate-100 animate-pulse" />
        <div className="h-80 rounded-3xl bg-slate-100 animate-pulse" />
      </div>
    );
  }

  const blocked = countOf('deny');
  const allowed = countOf('allow');

  return (
    <div className="space-y-4 min-w-0">
      <button type="button" onClick={onBack} className="lg:hidden inline-flex items-center gap-2 text-sm font-semibold text-slate-600">
        <ArrowLeft className="w-4 h-4" />All people
      </button>

      {/* Who is being changed */}
      <section className="rounded-3xl bg-white border border-slate-100 p-5 sm:p-6 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-4 min-w-0">
            <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-[#eaf6e6] text-lg font-semibold text-[#256c1d]">{initials(detail.user.name)}</span>
            <div className="min-w-0">
              <h3 className="text-xl font-semibold tracking-tight truncate">{detail.user.name}</h3>
              <p className="text-sm text-muted-foreground truncate">{detail.user.email}</p>
            </div>
          </div>
          <div className="flex gap-2">
            <div className="rounded-2xl bg-[#eaf6e6] px-4 py-2 text-center min-w-[5rem]">
              <p className="text-lg font-semibold tabular-nums text-[#256c1d]">{allowed}</p>
              <p className="text-[11px] font-medium text-slate-600">Allowed</p>
            </div>
            <div className="rounded-2xl bg-rose-50 px-4 py-2 text-center min-w-[5rem]">
              <p className="text-lg font-semibold tabular-nums text-rose-600">{blocked}</p>
              <p className="text-[11px] font-medium text-slate-600">Blocked</p>
            </div>
          </div>
        </div>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap gap-2">
            {[title(detail.user.role), detail.user.department, detail.user.branch || 'No branch'].filter(Boolean).map((chip) => (
              <span key={chip} className="rounded-full bg-[#f4f6f3] px-3 py-1 text-xs font-semibold text-slate-700">{chip}</span>
            ))}
          </div>
          <Button type="button" variant="outline" onClick={resetAll} disabled={!pages.some((p) => p.actions.some((a) => a.override))}
            className="h-10 rounded-full px-5 bg-white border-slate-200 font-semibold">Reset all to role</Button>
        </div>
        {!detail.user.branch && (
          <p className="flex items-start gap-2 rounded-2xl bg-amber-50 text-amber-800 text-sm px-4 py-3">
            <TriangleAlert className="w-4 h-4 mt-0.5 shrink-0" />This person has no branch. Anything you allow covers every branch in your organization.
          </p>
        )}
      </section>

      <div className="flex gap-1 bg-white border border-slate-100 p-1.5 rounded-full w-fit" role="tablist">
        {([['permissions', 'Permissions', UserRound], ['history', `History${historyTotal ? ` (${historyTotal})` : ''}`, History]] as const).map(([id, label, Icon]) => (
          <button key={id} type="button" role="tab" aria-selected={tab === id} onClick={() => setTab(id)}
            className={cn('inline-flex items-center gap-2 rounded-full px-5 py-2 text-sm font-semibold transition-colors', tab === id ? 'bg-[#8ae47e] text-[#0b1d14]' : 'text-slate-600 hover:bg-[#f4f6f3]')}>
            <Icon className="w-4 h-4" />{label}
          </button>
        ))}
      </div>

      {tab === 'permissions' ? (
        <>
          <section className="rounded-3xl bg-white border border-slate-100 p-4 space-y-3">
            <div className="relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <Input value={find} onChange={(e) => setFind(e.target.value)} placeholder={`Search all ${pages.length} pages`} aria-label="Search pages"
                className="pl-11 h-11 rounded-full bg-[#f4f6f3] border-transparent" />
            </div>
            <div className="flex flex-wrap gap-2">
              {[...groups, CHANGED].map((g) => {
                const active = !query && group === g;
                const count = g === CHANGED ? customPages.length : customPages.filter((p) => p.group === g).length;
                return (
                  <button key={g} type="button" aria-pressed={active} onClick={() => { setGroup(g); setFind(''); }}
                    className={cn('inline-flex items-center gap-2 rounded-full border px-4 py-2 text-xs font-semibold transition-colors',
                      active ? 'bg-[#0b1d14] border-[#0b1d14] text-white' : 'bg-white border-slate-200 text-slate-600 hover:bg-[#f4f6f3]')}>
                    {g}
                    {count > 0 && <span className="rounded-full bg-amber-100 text-amber-700 px-1.5 text-[11px] font-bold tabular-nums">{count}</span>}
                  </button>
                );
              })}
            </div>
          </section>

          {shown.length === 0 ? (
            <p className="rounded-3xl bg-white border border-slate-100 py-12 text-center text-sm text-muted-foreground">
              {query ? 'No page matches your search.' : 'Nothing has been changed for this person.'}
            </p>
          ) : (
            <div className="grid grid-cols-1 2xl:grid-cols-2 gap-4 items-start">
              {shown.map((page) => {
                const result = preview(page, settingOf(page));
                const all = page.actions.map((a) => a.action);
                const blockedButAllowed = settingOf(page)('view') === 'deny' && all.some((a) => settingOf(page)(a) === 'allow');
                const allRole = all.every((a) => settingOf(page)(a) === 'default');
                return (
                  <section key={page.key} className={cn('rounded-3xl bg-white border overflow-hidden', isCustom(page) ? 'border-amber-200' : 'border-slate-100')}>
                    <div className="flex flex-wrap items-center justify-between gap-2 px-5 py-4 border-b border-slate-100">
                      <div className="flex flex-wrap items-center gap-2">
                        <h4 className="font-semibold tracking-tight">{page.label}</h4>
                        {query && <span className="text-xs text-muted-foreground">{page.group}</span>}
                        {page.blockOnly && (
                          <span title="This page can be taken away. Who has it is still decided by role."
                            className="rounded-full bg-slate-100 text-slate-600 px-2.5 py-0.5 text-[11px] font-semibold">Block only</span>
                        )}
                      </div>
                      <button type="button" onClick={() => setMany(page, all, allRole ? 'deny' : 'default')}
                        className="text-xs font-semibold text-slate-500 hover:text-slate-900">
                        {allRole ? 'Block all' : 'Reset to role'}
                      </button>
                    </div>
                    {blockedButAllowed && <p className="bg-amber-50 text-amber-800 text-xs px-5 py-2">View is blocked, so nothing else on this page will work.</p>}
                    <ul className="divide-y divide-slate-100">
                      {page.actions.map((a) => {
                        const can = result.has(a.action);
                        const changed = settingOf(page)(a.action) !== saved(page, a.action);
                        return (
                          <li key={a.action} className="flex items-center justify-between gap-3 px-5 py-3">
                            <div className="flex items-center gap-3 min-w-0">
                              <span aria-hidden className={cn('h-2.5 w-2.5 shrink-0 rounded-full', can ? 'bg-[#54b947]' : 'bg-slate-300')} />
                              <div className="min-w-0">
                                <p className="text-sm font-semibold capitalize text-slate-800">
                                  {a.action}{changed && <span className="ml-2 text-[11px] font-semibold text-amber-600 normal-case">Unsaved</span>}
                                </p>
                                <p className="text-xs text-muted-foreground">
                                  {page.blockOnly
                                    ? (can ? 'Follows their role' : 'Blocked')
                                    : `${can ? 'Can' : 'Cannot'} · role gives ${a.byDefault ? 'yes' : 'no'}`}
                                </p>
                              </div>
                            </div>
                            <div className="flex shrink-0 gap-0.5 bg-[#f4f6f3] p-1 rounded-full" role="group" aria-label={`${page.label}: ${a.action}`}>
                              {SETTINGS.filter((option) => !page.blockOnly || option.id !== 'allow').map((option) => {
                                const active = settingOf(page)(a.action) === option.id;
                                return (
                                  <button key={option.id} type="button" aria-pressed={active}
                                    onClick={() => setMany(page, [a.action], option.id)}
                                    className={cn('rounded-full px-3 py-1.5 text-xs font-semibold transition-colors',
                                      active ? option.active : 'text-slate-600 hover:bg-white')}>
                                    {option.label}
                                  </button>
                                );
                              })}
                            </div>
                          </li>
                        );
                      })}
                    </ul>
                  </section>
                );
              })}
            </div>
          )}
        </>
      ) : (
        <section className="rounded-3xl bg-white border border-slate-100 p-4 sm:p-5 space-y-3">
          {history.length === 0 ? (
            <p className="py-10 text-center text-sm text-muted-foreground">No changes have been made for this person.</p>
          ) : (
            <>
              {history.map((h) => (
                <div key={h.id} className="rounded-2xl bg-[#f4f6f3] p-4">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="text-sm font-semibold">{labelOf(h.featureKey)} · {title(h.action)}</p>
                    <div className="flex gap-2">
                      <span className={cn('rounded-full px-3 py-0.5 text-[11px] font-semibold', h.effect === 'deny' ? 'bg-rose-100 text-rose-700' : 'bg-[#dff3da] text-[#256c1d]')}>
                        {h.effect === 'deny' ? 'Blocked' : 'Allowed'}
                      </span>
                      {h.revokedAt && <span className="rounded-full bg-slate-200 text-slate-600 px-3 py-0.5 text-[11px] font-semibold">Ended</span>}
                    </div>
                  </div>
                  <p className="text-sm text-slate-700 mt-1.5">{h.reason}</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {new Date(h.createdAt).toLocaleString()} by {h.grantedBy}
                    {h.revokedAt && ` · ended ${new Date(h.revokedAt).toLocaleString()} by ${h.revokedBy}`}
                  </p>
                </div>
              ))}
              <ListPagination total={historyTotal} page={historyPage} pageSize={historySize} onPageChange={setHistoryPage} onPageSizeChange={(n) => { setHistorySize(n); setHistoryPage(1); }} />
            </>
          )}
        </section>
      )}

      {/* Stays in view while there is something to save */}
      {dirty && (
        <div className="sticky bottom-0 z-10 rounded-3xl bg-[#0b1d14] text-white p-4 shadow-[0_20px_50px_-20px_rgba(4,18,10,0.6)] flex flex-col md:flex-row md:items-center gap-3">
          <p className="text-sm font-semibold whitespace-nowrap">{changes.length} unsaved {changes.length === 1 ? 'change' : 'changes'}</p>
          <Input value={reason} onChange={(e) => setReason(e.target.value)} maxLength={500} placeholder="Reason for this change (required)" aria-label="Reason for this change"
            className="h-11 flex-1 rounded-full bg-white text-slate-900 border-transparent px-5" />
          <div className="flex gap-2 justify-end">
            <Button type="button" variant="ghost" onClick={() => { setEdits({}); setReason(''); }} className="h-11 rounded-full px-5 text-white hover:bg-white/10 hover:text-white">Discard</Button>
            <Button type="button" onClick={save} disabled={saving || !reason.trim() || detail.setupRequired}
              className="h-11 rounded-full px-6 bg-[#8ae47e] hover:bg-[#7bd96f] text-[#0b1d14] font-semibold">
              {saving ? 'Saving...' : 'Save changes'}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
