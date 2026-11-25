import { useState, useEffect, useCallback } from 'react';
import { Globe2, RefreshCw, Plus, Ban, RotateCcw, MapPin, Pencil, KeyRound } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { cn } from '@/lib/utils';
import api from '@/lib/api';
import { toast } from 'sonner';
import { useAuth } from '@/hooks/useAuth';
import { PARTNER_STATUS, apiError, fmtDate } from './studyabroad/shared';
import { mayOn } from '@/lib/access';

interface Partner {
  id: string;
  name: string;
  code: string;
  email?: string;
  contact?: string;
  city?: string;
  state?: string;
  country?: string;
  status: string;
  destinationCountries: string[];
  address?: string | null;
  createdAt: string;
  _count?: { enrollments: number };
}

type Action = 'suspend' | 'reactivate';

const ACTION_COPY: Record<Action, { title: string; needsRemarks: boolean; destructive?: boolean }> = {
  suspend: { title: 'Suspend partner', needsRemarks: true, destructive: true },
  reactivate: { title: 'Reactivate partner', needsRemarks: false },
};

const emptyForm = { name: '', code: '', email: '', password: '', contact: '', city: '', state: '', country: '', destinationCountries: [] as string[] };

/** Pick destination countries from the organization's own list (managed in University management). */
function CountryPicker({ options, value, onChange }: { options: string[]; value: string[]; onChange: (v: string[]) => void }) {
  if (options.length === 0) {
    return <p className="text-xs text-muted-foreground">No countries yet. Add them in University management first, then pick them here. Leave empty to allow all.</p>;
  }
  const toggle = (c: string) => onChange(value.includes(c) ? value.filter(x => x !== c) : [...value, c]);
  return (
    <div className="flex flex-wrap gap-2">
      {options.map(c => (
        <button key={c} type="button" onClick={() => toggle(c)}
          className={`text-xs px-3 py-1.5 rounded-full border transition-colors ${value.includes(c) ? 'bg-primary text-primary-foreground border-primary' : 'hover:bg-muted'}`}>{c}</button>
      ))}
    </div>
  );
}

export function StudyAbroadPartnersPanel() {
  const { user } = useAuth();
  const role = user?.role || '';
  const isOrg = ['org_admin', 'superadmin'].includes(role) || mayOn(user, 'study_abroad', 'edit', false);
  const canCreate = mayOn(user, 'study_abroad', 'create', ['sales_admin', 'sales_sub_admin', 'ops_admin', 'org_admin', 'superadmin'].includes(role));
  const canEditCountries = mayOn(user, 'study_abroad', 'edit', ['ops_admin', 'ops_sub_admin', 'org_admin', 'superadmin'].includes(role));
  const canEdit = mayOn(user, 'study_abroad', 'edit', ['ops_admin', 'sales_admin', 'sales_sub_admin', 'org_admin', 'superadmin'].includes(role));
  const canReset = mayOn(user, 'study_abroad', 'edit', ['ops_admin', 'ops_sub_admin', 'sales_admin', 'sales_sub_admin', 'org_admin', 'superadmin'].includes(role));

  const [partners, setPartners] = useState<Partner[]>([]);
  const [loading, setLoading] = useState(false);
  const [filter, setFilter] = useState('all');

  const [createOpen, setCreateOpen] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [created, setCreated] = useState<{ email: string; password: string; name: string; generated?: boolean } | null>(null);
  const [resetFor, setResetFor] = useState<Partner | null>(null);
  const [resetPasswordText, setResetPasswordText] = useState('');

  // Where the partner signs in: the organization's own login page when it has one.
  const loginUrl = (() => {
    const slug = (user as any)?.organization?.customLoginSlug;
    return slug ? `${window.location.origin}/login/${slug}` : window.location.origin;
  })();
  const copyLogin = (c: { email: string; password: string }) => {
    navigator.clipboard?.writeText(`Login URL: ${loginUrl}\nEmail: ${c.email}\nPassword: ${c.password}`)
      .then(() => toast.success('Login details copied'), () => toast.error('Copy failed'));
  };

  const [action, setAction] = useState<{ type: Action; partner: Partner } | null>(null);
  const [remarks, setRemarks] = useState('');
  const [countriesFor, setCountriesFor] = useState<Partner | null>(null);
  const [countriesSel, setCountriesSel] = useState<string[]>([]);
  const [countryOptions, setCountryOptions] = useState<string[]>([]);
  useEffect(() => {
    api.get('/operations/countries').then(r => setCountryOptions((r.data.data || []).map((c: any) => c.name))).catch(() => {});
  }, []);
  const [editing, setEditing] = useState<Partner | null>(null);
  const [editForm, setEditForm] = useState({ name: '', email: '', contact: '', address: '', city: '', state: '', country: '' });

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get('/study-abroad/partners', { params: filter === 'all' ? {} : { status: filter } });
      setPartners(res.data.data || []);
    } catch (e) {
      toast.error(apiError(e, 'Failed to load study abroad partners'));
    } finally {
      setLoading(false);
    }
  }, [filter]);

  useEffect(() => { load(); }, [load]);

  const submitCreate = async () => {
    setSaving(true);
    try {
      const res = await api.post('/study-abroad/partners', {
        ...form,
        password: form.password || undefined,
        destinationCountries: form.destinationCountries,
      });
      setCreated({ ...res.data.credentials, name: form.name });
      setCreateOpen(false);
      setForm(emptyForm);
      load();
    } catch (e) {
      toast.error(apiError(e, 'Failed to create partner'));
    } finally {
      setSaving(false);
    }
  };

  const runAction = async () => {
    if (!action) return;
    try {
      await api.put(`/study-abroad/partners/${action.partner.id}/${action.type}`, { remarks: remarks.trim() || undefined });
      toast.success('Updated');
      setAction(null);
      setRemarks('');
      load();
    } catch (e) {
      toast.error(apiError(e, 'Action failed'));
    }
  };

  const saveCountries = async () => {
    if (!countriesFor) return;
    try {
      await api.put(`/study-abroad/partners/${countriesFor.id}/countries`, { destinationCountries: countriesSel });
      toast.success('Destination countries updated');
      setCountriesFor(null);
      load();
    } catch (e) {
      toast.error(apiError(e, 'Failed to update countries'));
    }
  };

  const openEdit = (p: Partner) => {
    setEditing(p);
    setEditForm({ name: p.name || '', email: p.email || '', contact: p.contact || '', address: p.address || '', city: p.city || '', state: p.state || '', country: p.country || '' });
  };

  const saveEdit = async () => {
    if (!editing) return;
    try {
      await api.put(`/study-abroad/partners/${editing.id}`, editForm);
      toast.success('Partner updated');
      setEditing(null);
      load();
    } catch (e) {
      toast.error(apiError(e, 'Failed to update partner'));
    }
  };

  const submitReset = async () => {
    if (!resetFor) return;
    try {
      const res = await api.put(`/study-abroad/partners/${resetFor.id}/reset-password`, { password: resetPasswordText || undefined });
      setCreated({ ...res.data.credentials, name: resetFor.name });
      setResetFor(null);
      setResetPasswordText('');
    } catch (e) {
      toast.error(apiError(e, 'Failed to set password'));
    }
  };

  const actionsFor = (p: Partner) => {
    const list: { type: Action; label: string; icon: any; tone?: 'ok' | 'bad' }[] = [];
    if (isOrg && p.status === 'active') list.push({ type: 'suspend', label: 'Suspend', icon: Ban, tone: 'bad' });
    if (isOrg && p.status === 'suspended') list.push({ type: 'reactivate', label: 'Reactivate', icon: RotateCcw, tone: 'ok' });
    return list;
  };

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <h2 className="text-2xl sm:text-3xl font-semibold tracking-tight flex items-center gap-3">
            <span className="w-11 h-11 rounded-2xl bg-[#eaf6e6] text-[#256c1d] flex items-center justify-center"><Globe2 className="w-5 h-5" /></span>
            Study Abroad Partners
          </h2>
          <p className="text-muted-foreground text-sm mt-1.5">Onboard and manage overseas-education partners.</p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <select className={cn('h-11 rounded-full px-4 text-sm font-semibold border outline-none', filter !== 'all' ? 'bg-[#8ae47e] border-[#8ae47e] text-[#0b1d14]' : 'bg-white border-slate-200 text-slate-600')} value={filter} onChange={e => setFilter(e.target.value)}>
            <option value="all">All statuses</option>
            {Object.entries(PARTNER_STATUS).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
          </select>
          <Button variant="outline" onClick={load} disabled={loading} className="h-11 px-5 rounded-full bg-white border-slate-200 hover:bg-[#eaf6e6]">
            <RefreshCw className={cn('w-4 h-4 mr-2', loading && 'animate-spin')} />Refresh
          </Button>
          {canCreate && <Button className="h-11 px-5 rounded-full bg-[#8ae47e] hover:bg-[#7bd96f] text-[#0b1d14] font-semibold" onClick={() => setCreateOpen(true)}><Plus className="w-4 h-4 mr-2" />New Partner</Button>}
        </div>
      </div>

      {loading ? (
        <div className="space-y-3">{[1, 2, 3].map(i => <div key={i} className="h-28 bg-slate-100 rounded-3xl animate-pulse" />)}</div>
      ) : partners.length === 0 ? (
        <div className="rounded-3xl bg-white border border-slate-100 py-16 text-center text-muted-foreground">
          <div className="w-14 h-14 rounded-2xl bg-[#eaf6e6] text-[#256c1d] flex items-center justify-center mx-auto mb-3"><Globe2 className="w-6 h-6" /></div>
          <p className="text-sm">No study abroad partners found.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {partners.map(p => {
            const st = PARTNER_STATUS[p.status] || { label: p.status, className: 'bg-muted text-muted-foreground' };
            return (
              <div key={p.id} className="rounded-3xl bg-white border border-slate-100 hover:border-[#8ae47e] transition-colors">
                <div className="p-5 sm:p-6 space-y-3">
                  <div className="flex items-start justify-between gap-4 flex-wrap">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <Badge className={cn('text-[10px] uppercase font-bold rounded-full px-2.5', st.className)}>{st.label}</Badge>
                        <Badge variant="outline" className="text-xs rounded-full bg-[#f4f6f3] border-0 font-mono">{p.code}</Badge>
                      </div>
                      <span className="font-semibold text-lg text-slate-900">{p.name}</span>
                      <div className="text-sm text-muted-foreground mt-1 flex flex-wrap gap-x-4">
                        {p.email && <span title="Login email">Login: <strong className="text-foreground">{p.email}</strong></span>}
                        {p.contact && <span>{p.contact}</span>}
                        {(p.city || p.country) && <span>{[p.city, p.country].filter(Boolean).join(', ')}</span>}
                        <span>Applications: <strong className="text-foreground">{p._count?.enrollments ?? 0}</strong></span>
                      </div>
                      <div className="flex flex-wrap items-center gap-1.5 mt-2">
                        <MapPin className="w-3.5 h-3.5 text-[#256c1d]" />
                        {p.destinationCountries.length === 0
                          ? <span className="text-xs text-muted-foreground">No countries allocated (all allowed)</span>
                          : p.destinationCountries.map(c => <Badge key={c} variant="secondary" className="text-xs rounded-full bg-[#eaf6e6] text-[#256c1d] border-0">{c}</Badge>)}
                        {canEditCountries && (
                          <button className="text-xs font-semibold text-[#256c1d] hover:underline ml-1" onClick={() => { setCountriesFor(p); setCountriesSel(p.destinationCountries.filter(c => countryOptions.includes(c))); }}>
                            Edit
                          </button>
                        )}
                      </div>
                    </div>
                    <div className="flex gap-2 flex-wrap">
                      {canEdit && <Button size="sm" variant="outline" className="h-9 rounded-full px-4 border-[#cfe9c9] text-[#256c1d] bg-white hover:bg-[#eaf6e6]" onClick={() => openEdit(p)}><Pencil className="w-4 h-4 mr-1" />Edit</Button>}
                      {canReset && <Button size="sm" variant="outline" className="h-9 rounded-full px-4 border-[#cfe9c9] text-[#256c1d] bg-white hover:bg-[#eaf6e6]" onClick={() => { setResetFor(p); setResetPasswordText(''); }}><KeyRound className="w-4 h-4 mr-1" />Login / password</Button>}
                      {actionsFor(p).map(a => (
                        <Button
                          key={a.type} size="sm" variant="outline"
                          className={cn('h-9 rounded-full px-4 bg-white', a.tone === 'ok' ? 'text-[#256c1d] border-[#cfe9c9] hover:bg-[#eaf6e6]' : 'text-red-600 border-red-200 hover:bg-red-50')}
                          onClick={() => { setAction({ type: a.type, partner: p }); setRemarks(''); }}
                        >
                          <a.icon className="w-4 h-4 mr-1" />{a.label}
                        </Button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Create */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="wizard-form rounded-[2rem] border-0 bg-white p-6 sm:p-8" style={{ fontFamily: "Urbanist, ui-sans-serif, system-ui, sans-serif" }}>
          <DialogHeader>
            <DialogTitle className="text-xl font-semibold tracking-tight">New Study Abroad Partner</DialogTitle>
            <DialogDescription>The partner is active immediately. Their login is created with the email below and the details are emailed to them.</DialogDescription>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-3 py-2">
            {([['name', 'Partner name *'], ['code', 'Code *'], ['email', 'Email *'], ['contact', 'Phone'], ['city', 'City'], ['state', 'State'], ['country', 'Country']] as const).map(([k, label]) => (
              <div key={k} className={cn('space-y-1', k === 'name' && 'col-span-2')}>
                <Label>{label}</Label>
                <Input value={form[k]} onChange={e => setForm(f => ({ ...f, [k]: e.target.value }))} />
              </div>
            ))}
            <div className="space-y-1 col-span-2">
              <Label>Login password (optional)</Label>
              <Input value={form.password} onChange={e => setForm(f => ({ ...f, password: e.target.value }))} placeholder="Leave blank to generate one — minimum 8 characters" />
              <p className="text-[11px] text-muted-foreground">The partner signs in with the email above and this password.</p>
            </div>
            <div className="space-y-1 col-span-2">
              <Label>Destination countries</Label>
              <CountryPicker options={countryOptions} value={form.destinationCountries} onChange={v => setForm(f => ({ ...f, destinationCountries: v }))} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" className="h-11 px-6 rounded-full" onClick={() => setCreateOpen(false)}>Cancel</Button>
            <Button className="h-11 px-6 rounded-full bg-[#8ae47e] hover:bg-[#7bd96f] text-[#0b1d14] font-semibold" onClick={submitCreate} disabled={saving || !form.name.trim() || !form.code.trim() || !form.email.trim() || (!!form.password && form.password.length < 8)}>Create</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Login details, shown once */}
      <Dialog open={!!created} onOpenChange={o => !o && setCreated(null)}>
        <DialogContent className="wizard-form rounded-[2rem] border-0 bg-white p-6 sm:p-8" style={{ fontFamily: "Urbanist, ui-sans-serif, system-ui, sans-serif" }}>
          <DialogHeader>
            <DialogTitle className="text-xl font-semibold tracking-tight">Partner login details</DialogTitle>
            <DialogDescription>
              Shown only once — the password is not stored in readable form. They have also been emailed to the partner.
            </DialogDescription>
          </DialogHeader>
          <div className="rounded-2xl bg-[#f4f6f3] p-4 space-y-1 text-sm font-mono break-all">
            <div>Partner: {created?.name}</div>
            <div>Login URL: {loginUrl}</div>
            <div>Email: {created?.email}</div>
            <div>Password: {created?.password}{created?.generated ? '  (generated)' : ''}</div>
          </div>
          <DialogFooter>
            <Button variant="outline" className="h-11 px-6 rounded-full" onClick={() => created && copyLogin(created)}>Copy login details</Button>
            <Button className="h-11 px-6 rounded-full bg-[#8ae47e] hover:bg-[#7bd96f] text-[#0b1d14] font-semibold" onClick={() => setCreated(null)}>Done</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Set / reset the partner's password */}
      <Dialog open={!!resetFor} onOpenChange={o => !o && setResetFor(null)}>
        <DialogContent className="wizard-form rounded-[2rem] border-0 bg-white p-6 sm:p-8" style={{ fontFamily: "Urbanist, ui-sans-serif, system-ui, sans-serif" }}>
          <DialogHeader>
            <DialogTitle className="text-xl font-semibold tracking-tight">Login &amp; password</DialogTitle>
            <DialogDescription>{resetFor?.name} signs in with <strong>{resetFor?.email}</strong>.</DialogDescription>
          </DialogHeader>
          <div className="space-y-2 py-2">
            <Label>New password (optional)</Label>
            <Input value={resetPasswordText} onChange={e => setResetPasswordText(e.target.value)} placeholder="Leave blank to generate one — minimum 8 characters" />
            <p className="text-[11px] text-muted-foreground">The current password stops working immediately. The new details are shown once and emailed to the partner.</p>
          </div>
          <DialogFooter>
            <Button variant="outline" className="h-11 px-6 rounded-full" onClick={() => setResetFor(null)}>Cancel</Button>
            <Button className="h-11 px-6 rounded-full bg-[#8ae47e] hover:bg-[#7bd96f] text-[#0b1d14] font-semibold" onClick={submitReset} disabled={!!resetPasswordText && resetPasswordText.length < 8}>Set password</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Review actions */}
      <Dialog open={!!action} onOpenChange={o => !o && setAction(null)}>
        <DialogContent className="wizard-form rounded-[2rem] border-0 bg-white p-6 sm:p-8" style={{ fontFamily: "Urbanist, ui-sans-serif, system-ui, sans-serif" }}>
          <DialogHeader>
            <DialogTitle className="text-xl font-semibold tracking-tight">{action ? ACTION_COPY[action.type].title : ''}</DialogTitle>
            <DialogDescription>{action?.partner.name}</DialogDescription>
          </DialogHeader>
          <div className="space-y-2 py-2">
            <Label>Remarks{action && ACTION_COPY[action.type].needsRemarks ? ' (required)' : ' (optional)'}</Label>
            <Input value={remarks} onChange={e => setRemarks(e.target.value)} placeholder="Add a note…" />
          </div>
          <DialogFooter>
            <Button variant="outline" className="h-11 px-6 rounded-full" onClick={() => setAction(null)}>Cancel</Button>
            <Button
              className={cn('h-11 px-6 rounded-full font-semibold', action && ACTION_COPY[action.type].destructive ? 'bg-red-600 hover:bg-red-700 text-white' : 'bg-[#8ae47e] hover:bg-[#7bd96f] text-[#0b1d14]')}
              onClick={runAction}
              disabled={!!action && ACTION_COPY[action.type].needsRemarks && !remarks.trim()}
            >Confirm</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Countries */}
      <Dialog open={!!countriesFor} onOpenChange={o => !o && setCountriesFor(null)}>
        <DialogContent className="wizard-form rounded-[2rem] border-0 bg-white p-6 sm:p-8" style={{ fontFamily: "Urbanist, ui-sans-serif, system-ui, sans-serif" }}>
          <DialogHeader>
            <DialogTitle className="text-xl font-semibold tracking-tight">Destination countries</DialogTitle>
            <DialogDescription>{countriesFor?.name} can submit applications only for these countries. Leave empty to allow all.</DialogDescription>
          </DialogHeader>
          <div className="space-y-2 py-2">
            <Label>Countries</Label>
            <CountryPicker options={countryOptions} value={countriesSel} onChange={setCountriesSel} />
          </div>
          <DialogFooter>
            <Button variant="outline" className="h-11 px-6 rounded-full" onClick={() => setCountriesFor(null)}>Cancel</Button>
            <Button className="h-11 px-6 rounded-full bg-[#8ae47e] hover:bg-[#7bd96f] text-[#0b1d14] font-semibold" onClick={saveCountries}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit */}
      <Dialog open={!!editing} onOpenChange={o => !o && setEditing(null)}>
        <DialogContent className="wizard-form rounded-[2rem] border-0 bg-white p-6 sm:p-8" style={{ fontFamily: "Urbanist, ui-sans-serif, system-ui, sans-serif" }}>
          <DialogHeader>
            <DialogTitle className="text-xl font-semibold tracking-tight">Edit partner</DialogTitle>
            <DialogDescription>{editing?.code} · registered {fmtDate(editing?.createdAt)}</DialogDescription>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-3 py-2">
            {([['name', 'Partner name'], ['email', 'Login email'], ['contact', 'Phone'], ['address', 'Address'], ['city', 'City'], ['state', 'State'], ['country', 'Country']] as const).map(([k, label]) => (
              <div key={k} className={cn('space-y-1', (k === 'name' || k === 'email') && 'col-span-2')}>
                <Label>{label}</Label>
                <Input value={editForm[k]} onChange={e => setEditForm(f => ({ ...f, [k]: e.target.value }))} />
                {k === 'email' && <p className="text-[11px] text-muted-foreground">This is the partner's sign-in email — changing it changes how they log in. Name and phone also update their login account.</p>}
              </div>
            ))}
          </div>
          <DialogFooter>
            <Button variant="outline" className="h-11 px-6 rounded-full" onClick={() => setEditing(null)}>Cancel</Button>
            <Button className="h-11 px-6 rounded-full bg-[#8ae47e] hover:bg-[#7bd96f] text-[#0b1d14] font-semibold" onClick={saveEdit} disabled={!editForm.name.trim()}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
