import { useState, useEffect, useCallback } from 'react';
import { Globe2, RefreshCw, Plus, Ban, RotateCcw, MapPin, Pencil, KeyRound } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
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

const emptyForm = { name: '', code: '', email: '', password: '', contact: '', city: '', state: '', country: '', destinationCountries: '' };

const parseCountries = (v: string) => v.split(',').map(s => s.trim()).filter(Boolean);

export function StudyAbroadPartnersPanel() {
  const { user } = useAuth();
  const role = user?.role || '';
  const isOrg = ['org_admin', 'superadmin'].includes(role);
  const canCreate = ['sales_admin', 'sales_sub_admin', 'ops_admin', 'org_admin', 'superadmin'].includes(role);
  const canEditCountries = ['ops_admin', 'ops_sub_admin', 'org_admin', 'superadmin'].includes(role);
  const canEdit = ['ops_admin', 'sales_admin', 'sales_sub_admin', 'org_admin', 'superadmin'].includes(role);
  const canReset = ['ops_admin', 'ops_sub_admin', 'sales_admin', 'sales_sub_admin', 'org_admin', 'superadmin'].includes(role);

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
  const [countriesText, setCountriesText] = useState('');
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
        destinationCountries: parseCountries(form.destinationCountries),
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
      await api.put(`/study-abroad/partners/${countriesFor.id}/countries`, { destinationCountries: parseCountries(countriesText) });
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
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2"><Globe2 className="w-6 h-6" />Study Abroad Partners</h2>
          <p className="text-muted-foreground text-sm mt-1">Onboard and manage overseas-education partners.</p>
        </div>
        <div className="flex gap-2">
          <select className="border rounded-md px-3 py-2 text-sm bg-background" value={filter} onChange={e => setFilter(e.target.value)}>
            <option value="all">All statuses</option>
            {Object.entries(PARTNER_STATUS).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
          </select>
          <Button variant="outline" size="sm" onClick={load} disabled={loading}>
            <RefreshCw className={cn('w-4 h-4 mr-2', loading && 'animate-spin')} />Refresh
          </Button>
          {canCreate && <Button size="sm" onClick={() => setCreateOpen(true)}><Plus className="w-4 h-4 mr-2" />New Partner</Button>}
        </div>
      </div>

      {loading ? (
        <div className="space-y-3">{[1, 2, 3].map(i => <div key={i} className="h-24 bg-muted rounded-xl animate-pulse" />)}</div>
      ) : partners.length === 0 ? (
        <Card><CardContent className="py-16 text-center text-muted-foreground">No study abroad partners found.</CardContent></Card>
      ) : (
        <div className="space-y-3">
          {partners.map(p => {
            const st = PARTNER_STATUS[p.status] || { label: p.status, className: 'bg-muted text-muted-foreground' };
            return (
              <Card key={p.id} className="hover:border-primary/30 transition-colors">
                <CardContent className="p-5 space-y-3">
                  <div className="flex items-start justify-between gap-4 flex-wrap">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <Badge className={cn('text-[10px] uppercase font-bold', st.className)}>{st.label}</Badge>
                        <Badge variant="outline" className="text-xs">{p.code}</Badge>
                      </div>
                      <span className="font-semibold">{p.name}</span>
                      <div className="text-sm text-muted-foreground mt-1 flex flex-wrap gap-x-4">
                        {p.email && <span title="Login email">Login: <strong className="text-foreground">{p.email}</strong></span>}
                        {p.contact && <span>{p.contact}</span>}
                        {(p.city || p.country) && <span>{[p.city, p.country].filter(Boolean).join(', ')}</span>}
                        <span>Applications: <strong className="text-foreground">{p._count?.enrollments ?? 0}</strong></span>
                      </div>
                      <div className="flex flex-wrap items-center gap-1.5 mt-2">
                        <MapPin className="w-3.5 h-3.5 text-muted-foreground" />
                        {p.destinationCountries.length === 0
                          ? <span className="text-xs text-muted-foreground">No countries allocated (all allowed)</span>
                          : p.destinationCountries.map(c => <Badge key={c} variant="secondary" className="text-xs">{c}</Badge>)}
                        {canEditCountries && (
                          <button className="text-xs text-primary hover:underline ml-1" onClick={() => { setCountriesFor(p); setCountriesText(p.destinationCountries.join(', ')); }}>
                            Edit
                          </button>
                        )}
                      </div>
                    </div>
                    <div className="flex gap-2 flex-wrap">
                      {canEdit && <Button size="sm" variant="outline" onClick={() => openEdit(p)}><Pencil className="w-4 h-4 mr-1" />Edit</Button>}
                      {canReset && <Button size="sm" variant="outline" onClick={() => { setResetFor(p); setResetPasswordText(''); }}><KeyRound className="w-4 h-4 mr-1" />Login / password</Button>}
                      {actionsFor(p).map(a => (
                        <Button
                          key={a.type} size="sm" variant="outline"
                          className={a.tone === 'ok' ? 'text-success border-success/30 hover:bg-success/10' : 'text-destructive border-destructive/30 hover:bg-destructive/10'}
                          onClick={() => { setAction({ type: a.type, partner: p }); setRemarks(''); }}
                        >
                          <a.icon className="w-4 h-4 mr-1" />{a.label}
                        </Button>
                      ))}
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Create */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>New Study Abroad Partner</DialogTitle>
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
              <Label>Destination countries (comma separated)</Label>
              <Input value={form.destinationCountries} onChange={e => setForm(f => ({ ...f, destinationCountries: e.target.value }))} placeholder="UK, Canada, Australia" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateOpen(false)}>Cancel</Button>
            <Button onClick={submitCreate} disabled={saving || !form.name.trim() || !form.code.trim() || !form.email.trim() || (!!form.password && form.password.length < 8)}>Create</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Login details, shown once */}
      <Dialog open={!!created} onOpenChange={o => !o && setCreated(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Partner login details</DialogTitle>
            <DialogDescription>
              Shown only once — the password is not stored in readable form. They have also been emailed to the partner.
            </DialogDescription>
          </DialogHeader>
          <div className="rounded-lg border p-4 space-y-1 text-sm font-mono break-all">
            <div>Partner: {created?.name}</div>
            <div>Login URL: {loginUrl}</div>
            <div>Email: {created?.email}</div>
            <div>Password: {created?.password}{created?.generated ? '  (generated)' : ''}</div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => created && copyLogin(created)}>Copy login details</Button>
            <Button onClick={() => setCreated(null)}>Done</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Set / reset the partner's password */}
      <Dialog open={!!resetFor} onOpenChange={o => !o && setResetFor(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Login &amp; password</DialogTitle>
            <DialogDescription>{resetFor?.name} signs in with <strong>{resetFor?.email}</strong>.</DialogDescription>
          </DialogHeader>
          <div className="space-y-2 py-2">
            <Label>New password (optional)</Label>
            <Input value={resetPasswordText} onChange={e => setResetPasswordText(e.target.value)} placeholder="Leave blank to generate one — minimum 8 characters" />
            <p className="text-[11px] text-muted-foreground">The current password stops working immediately. The new details are shown once and emailed to the partner.</p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setResetFor(null)}>Cancel</Button>
            <Button onClick={submitReset} disabled={!!resetPasswordText && resetPasswordText.length < 8}>Set password</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Review actions */}
      <Dialog open={!!action} onOpenChange={o => !o && setAction(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{action ? ACTION_COPY[action.type].title : ''}</DialogTitle>
            <DialogDescription>{action?.partner.name}</DialogDescription>
          </DialogHeader>
          <div className="space-y-2 py-2">
            <Label>Remarks{action && ACTION_COPY[action.type].needsRemarks ? ' (required)' : ' (optional)'}</Label>
            <Input value={remarks} onChange={e => setRemarks(e.target.value)} placeholder="Add a note…" />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAction(null)}>Cancel</Button>
            <Button
              variant={action && ACTION_COPY[action.type].destructive ? 'destructive' : 'default'}
              onClick={runAction}
              disabled={!!action && ACTION_COPY[action.type].needsRemarks && !remarks.trim()}
            >Confirm</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Countries */}
      <Dialog open={!!countriesFor} onOpenChange={o => !o && setCountriesFor(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Destination countries</DialogTitle>
            <DialogDescription>{countriesFor?.name} can submit applications only for these countries. Leave empty to allow all.</DialogDescription>
          </DialogHeader>
          <div className="space-y-2 py-2">
            <Label>Countries (comma separated)</Label>
            <Input value={countriesText} onChange={e => setCountriesText(e.target.value)} placeholder="UK, Canada, Australia" />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCountriesFor(null)}>Cancel</Button>
            <Button onClick={saveCountries}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit */}
      <Dialog open={!!editing} onOpenChange={o => !o && setEditing(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit partner</DialogTitle>
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
            <Button variant="outline" onClick={() => setEditing(null)}>Cancel</Button>
            <Button onClick={saveEdit} disabled={!editForm.name.trim()}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
