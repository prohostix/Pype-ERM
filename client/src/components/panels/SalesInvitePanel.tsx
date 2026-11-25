import { useState, useEffect } from 'react';
import { Plus, Copy, Check, RefreshCw, Link, RotateCcw, ChevronRight, ChevronLeft, Calendar, Clock, GraduationCap, BookOpen } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import api from '@/lib/api';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

interface University { id: string; name: string; code: string; }
interface Program { id: string; name: string; code: string; universityId: string; courseType: string; specialisations?: string[]; }
interface Session { id: string; name: string; startDate: string; endDate: string; status: string; universityId?: string | null; }
interface Invite {
  id: string;
  token: string;
  universityIds: University[];
  programIds: Program[];
  sessionIds: { id: string; name: string }[];
  status: 'pending' | 'used' | 'expired';
  expiresAt: string;
  inviteUrl?: string;
  createdAt: string;
}

const STATUS_COLOR: Record<string, string> = {
  pending: 'bg-[#e3f7dd] text-[#1f6a17]',
  used: 'bg-slate-100 text-slate-600',
  expired: 'bg-rose-50 text-rose-700',
};
const STATUS_DOT: Record<string, string> = { pending: 'bg-[#54b947]', used: 'bg-slate-400', expired: 'bg-rose-500' };

export function SalesInvitePanel() {
  const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'used' | 'expired'>('all');
  const [invites, setInvites] = useState<Invite[]>([]);
  const [universities, setUniversities] = useState<University[]>([]);
  const [programs, setPrograms] = useState<Program[]>([]);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [totalSteps, setTotalSteps] = useState<2 | 3>(2);
  const [selectedUnis, setSelectedUnis] = useState<string[]>([]);
  const [selectedPrograms, setSelectedPrograms] = useState<string[]>([]);
  const [selectedSpecializations, setSelectedSpecializations] = useState<Record<string, string[]>>({});
  const [selectedSessions, setSelectedSessions] = useState<string[]>([]);
  const [loadingPrograms, setLoadingPrograms] = useState(false);
  const [loadingSessions, setLoadingSessions] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [copied, setCopied] = useState<string | null>(null);
  const [regenerating, setRegenerating] = useState<string | null>(null);

  const [config, setConfig] = useState<any>(null);

  useEffect(() => {
    fetchConfig();
    fetchInvites();
    fetchUniversities();
  }, []);

  const fetchConfig = async () => {
    try {
      const res = await api.get('/organizations/enrollment-link-config');
      if (res.data.success) setConfig(res.data.data);
    } catch (_) {}
  };

  const fetchInvites = async () => {
    setLoading(true);
    try {
      const res = await api.get('/sales/invites');
      setInvites(res.data.data || []);
    } catch (e: any) {
      toast.error(e.response?.data?.message || 'Failed to load invites');
    } finally {
      setLoading(false);
    }
  };

  const fetchUniversities = async () => {
    try {
      const res = await api.get('/operations/universities');
      setUniversities(res.data.data || []);
    } catch (_) {}
  };

  const fetchPrograms = async (uniIds: string[]) => {
    if (uniIds.length === 0 && config?.universityStep !== 'hidden') { setPrograms([]); return; }
    setLoadingPrograms(true);
    try {
      const qs = uniIds.length > 0 ? `?universityIds=${uniIds.join(',')}` : '';
      const res = await api.get(`/sales/programs-by-university${qs}`);
      setPrograms(res.data.data || []);
    } catch (_) {
      setPrograms([]);
    } finally {
      setLoadingPrograms(false);
    }
  };

  const fetchSessions = async (uniIds: string[]) => {
    setLoadingSessions(true);
    try {
      const qs = uniIds.length > 0 ? `?universityIds=${uniIds.join(',')}` : '';
      const res = await api.get(`/sales/sessions-by-university${qs}`);
      setSessions(res.data.data || []);
      return res.data.data || [];
    } catch (_) {
      setSessions([]);
      return [];
    } finally {
      setLoadingSessions(false);
    }
  };

  const toggleUni = (id: string) =>
    setSelectedUnis(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);

  const toggleProgram = (id: string) =>
    setSelectedPrograms(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);

  const toggleSpecialization = (programId: string, spec: string) => {
    setSelectedSpecializations(prev => {
      const current = prev[programId] || [];
      const updated = current.includes(spec) ? current.filter(x => x !== spec) : [...current, spec];
      return { ...prev, [programId]: updated };
    });
  };

  const toggleSession = (id: string) =>
    setSelectedSessions(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);

  const handleOpenDialog = async () => {
    setOpen(true);
    let currentStep: 1 | 2 | 3 | 4 = 1;
    let maxSteps: 2 | 3 | 4 = 2;

    if (config?.universityStep === 'hidden') {
      if (config?.programStep === 'hidden') {
        if (config?.specializationStep === 'hidden') {
          if (config?.sessionStep === 'hidden') {
            // All steps hidden — generate directly
            setOpen(false);
            handleGenerate();
            return;
          } else {
            currentStep = 4;
            maxSteps = 4;
            await fetchSessions([]);
          }
        } else {
          currentStep = 3;
          maxSteps = 4; // Or 3 if session is hidden
        }
      } else {
        currentStep = 2;
        await fetchPrograms([]);
      }
    }
    setStep(currentStep as any);
    setTotalSteps(maxSteps as any);
  };

  const handleNextStep = async () => {
    if (config?.universityStep === 'mandatory' && selectedUnis.length === 0) { 
      toast.error('Select at least one university'); 
      return; 
    }
    if (config?.programStep === 'hidden') {
      // skip program step & specialization step
      const fetchedSessions = await fetchSessions(selectedUnis);
      if (fetchedSessions.length > 0 && config?.sessionStep !== 'hidden') {
        setTotalSteps(4);
        setStep(4 as any);
      } else {
        setTotalSteps(2);
        handleGenerate();
      }
      return;
    }
    await fetchPrograms(selectedUnis);
    setStep(2);
  };

  const handleProgramNext = async () => {
    if (config?.programStep === 'mandatory' && selectedPrograms.length === 0) {
      toast.error('Select at least one program');
      return;
    }
    const hasSpecializations = programs.filter(p => selectedPrograms.includes(p.id)).some(p => p.specialisations && p.specialisations.length > 0);
    if (hasSpecializations && config?.specializationStep !== 'hidden') {
      setStep(3);
      setTotalSteps(4);
      return;
    }
    
    if (config?.sessionStep === 'hidden') {
      handleGenerate();
      return;
    }
    const fetchedSessions = await fetchSessions(selectedUnis);
    if (fetchedSessions.length > 0) {
      setTotalSteps(4);
      setStep(4 as any);
    } else {
      handleGenerate();
    }
  };

  const handleSpecializationNext = async () => {
    if (config?.specializationStep === 'mandatory') {
      const selectedProgs = programs.filter(p => selectedPrograms.includes(p.id));
      for (const p of selectedProgs) {
        if (p.specialisations && p.specialisations.length > 0) {
          const selectedForProg = selectedSpecializations[p.id] || [];
          if (selectedForProg.length === 0) {
            toast.error(`Select at least one specialization for program: ${p.name}`);
            return;
          }
        }
      }
    }

    if (config?.sessionStep === 'hidden') {
      handleGenerate();
      return;
    }
    const fetchedSessions = await fetchSessions(selectedUnis);
    if (fetchedSessions.length > 0) {
      setTotalSteps(4);
      setStep(4 as any);
    } else {
      handleGenerate();
    }
  };

  const handleSessionNext = async () => {
    if (config?.sessionStep === 'mandatory' && selectedSessions.length === 0) {
      toast.error('Select at least one session');
      return;
    }
    handleGenerate();
  };

  const handleGenerate = async () => {
    setSubmitting(true);
    try {
      const res = await api.post('/sales/invites', {
        universityIds: selectedUnis,
        programIds: selectedPrograms,
        specializations: selectedSpecializations,
        sessionIds: selectedSessions,
      });
      toast.success('Invite link generated');
      closeDialog();
      fetchInvites();
      const newToken = res.data.data?.token;
      if (newToken) {
        const url = `${window.location.origin}/student-apply?token=${newToken}`;
        navigator.clipboard.writeText(url).catch(() => {});
        toast.info('Link copied to clipboard');
      }
    } catch (e: any) {
      toast.error(e.response?.data?.message || 'Failed to generate invite');
    } finally {
      setSubmitting(false);
    }
  };

  const closeDialog = () => {
    setOpen(false);
    setSelectedUnis([]);
    setSelectedPrograms([]);
    setSelectedSpecializations({});
    setSelectedSessions([]);
    setPrograms([]);
    setSessions([]);
  };

  const copyLink = (invite: Invite) => {
    // Always build from current origin so it works in any environment
    const url = `${window.location.origin}/student-apply?token=${invite.token}`;
    navigator.clipboard.writeText(url).then(() => {
      setCopied(invite.id);
      setTimeout(() => setCopied(null), 2000);
    });
  };

  const handleRegenerate = async (invite: Invite) => {
    setRegenerating(invite.id);
    try {
      const res = await api.patch(`/sales/invites/${invite.id}/regenerate`);
      toast.success('New invite link generated');
      const newToken = res.data.data?.token;
      if (newToken) {
        const url = `${window.location.origin}/student-apply?token=${newToken}`;
        navigator.clipboard.writeText(url).catch(() => {});
        toast.info('New link copied to clipboard');
      }
      fetchInvites();
    } catch (e: any) {
      toast.error(e.response?.data?.message || 'Failed to regenerate invite');
    } finally {
      setRegenerating(null);
    }
  };

  // Group programs by university name for display
  const programsByUni = programs.reduce<Record<string, { uniName: string; programs: Program[] }>>((acc, p) => {
    const uni = universities.find(u => u.id === p.universityId);
    const key = p.universityId;
    if (!acc[key]) acc[key] = { uniName: uni?.name || 'Unknown', programs: [] };
    acc[key].programs.push(p);
    return acc;
  }, {});

  // Group sessions by university for display
  const sessionsByUni = sessions.reduce<Record<string, { uniName: string; sessions: Session[] }>>((acc, s) => {
    const uniId = s.universityId || '_global';
    const uni = universities.find(u => u.id === uniId);
    if (!acc[uniId]) acc[uniId] = { uniName: uni?.name || 'All Universities', sessions: [] };
    acc[uniId].sessions.push(s);
    return acc;
  }, {});

  const counts = {
    all: invites.length,
    pending: invites.filter(i => i.status === 'pending').length,
    used: invites.filter(i => i.status === 'used').length,
    expired: invites.filter(i => i.status === 'expired').length,
  };
  const visibleInvites = invites.filter(i => statusFilter === 'all' || i.status === statusFilter);

  const ROW = 'flex items-center gap-3 rounded-2xl px-4 py-3 cursor-pointer border transition-colors';

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 lg:gap-6">
        <div>
          <h2 className="text-2xl sm:text-3xl font-semibold tracking-tight text-foreground">Invite Links</h2>
          <p className="text-muted-foreground text-sm mt-1.5 max-w-2xl">Generate invite links for prospective academic partners.</p>
        </div>
        <div className="flex gap-2.5 shrink-0">
          <Button variant="outline" onClick={fetchInvites} disabled={loading} className="h-11 px-5 rounded-full bg-white border-slate-200 text-sm font-medium gap-2 shadow-sm hover:bg-slate-50">
            <RefreshCw className={cn('w-4 h-4', loading && 'animate-spin')} />Refresh
          </Button>
          <Button onClick={handleOpenDialog} className="h-11 px-5 rounded-full text-sm font-semibold gap-2 bg-[#8ae47e] hover:bg-[#7bd96f] text-[#0b1d14] shadow-sm">
            <Plus className="w-4 h-4" />Generate Invite
          </Button>
        </div>
      </div>

      {/* Summary */}
      {invites.length > 0 && (
        <div className="grid grid-cols-2 xl:grid-cols-4 gap-4 sm:gap-5">
          {[
            { label: 'Total links', value: counts.all, icon: Link },
            { label: 'Pending', value: counts.pending, icon: Clock },
            { label: 'Used', value: counts.used, icon: Check },
            { label: 'Expired', value: counts.expired, icon: RotateCcw },
          ].map(({ label, value, icon: Icon }) => (
            <Card key={label} className="rounded-3xl gap-0">
              <CardContent className="p-6 flex items-center justify-between gap-4">
                <div>
                  <p className="text-xs font-medium text-muted-foreground">{label}</p>
                  <p className="text-3xl font-semibold tracking-tight mt-1">{value}</p>
                </div>
                <div className="w-12 h-12 rounded-2xl bg-[#eaf6e6] text-[#256c1d] flex items-center justify-center shrink-0">
                  <Icon className="w-5 h-5" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Status filter */}
      {invites.length > 0 && (
        <div className="flex flex-wrap items-center gap-2">
          {([
            { id: 'all', label: 'All' },
            { id: 'pending', label: 'Pending' },
            { id: 'used', label: 'Used' },
            { id: 'expired', label: 'Expired' },
          ] as const).map(f => (
            <button
              key={f.id}
              onClick={() => setStatusFilter(f.id)}
              className={cn('px-4 py-2 rounded-full text-xs font-semibold transition-colors', statusFilter === f.id ? 'bg-[#0b1d14] text-white' : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50')}
            >
              {f.label} ({counts[f.id]})
            </button>
          ))}
        </div>
      )}

      {loading ? (
        <div className="space-y-3">{[1,2,3].map(i => <div key={i} className="h-24 bg-[#f4f6f3] rounded-3xl animate-pulse" />)}</div>
      ) : invites.length === 0 ? (
        <div className="border border-dashed border-slate-300 rounded-3xl p-16 text-center bg-white">
          <div className="w-14 h-14 rounded-full bg-[#f4f6f3] flex items-center justify-center mx-auto mb-3">
            <Link className="h-6 w-6 text-muted-foreground" />
          </div>
          <p className="text-foreground font-medium mb-1">No invite links yet</p>
          <p className="text-sm text-muted-foreground mb-6">Generate one to get started.</p>
          <Button onClick={handleOpenDialog} className="h-11 px-6 rounded-full bg-[#8ae47e] hover:bg-[#7bd96f] text-[#0b1d14] font-semibold"><Plus className="h-4 w-4 mr-2" />Generate Invite</Button>
        </div>
      ) : visibleInvites.length === 0 ? (
        <div className="rounded-3xl border border-dashed border-slate-300 bg-white py-14 text-center text-sm text-muted-foreground">No {statusFilter} invite links.</div>
      ) : (
        <div className="space-y-4">
          {visibleInvites.map(inv => (
            <Card key={inv.id} className="rounded-3xl gap-0 hover:-translate-y-0.5 transition-all duration-300">
              <CardContent className="p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-5">
                <div className="flex items-start gap-4 min-w-0 flex-1">
                  <div className="w-12 h-12 rounded-2xl bg-[#eaf6e6] text-[#256c1d] flex items-center justify-center shrink-0">
                    <Link className="w-5 h-5" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2.5 flex-wrap">
                      <span className={cn('inline-flex items-center gap-1.5 text-[11px] font-semibold px-2.5 py-1 rounded-full capitalize', STATUS_COLOR[inv.status])}>
                        <span className={cn('w-1.5 h-1.5 rounded-full', STATUS_DOT[inv.status])} />{inv.status}
                      </span>
                      <span className="text-xs text-muted-foreground flex items-center gap-1"><Clock className="w-3 h-3" />Expires {new Date(inv.expiresAt).toLocaleDateString()}</span>
                    </div>
                    <p className="text-sm font-mono text-slate-600 truncate mt-2 px-3 py-1.5 rounded-full bg-[#f4f6f3] w-fit max-w-full">{inv.token.substring(0, 24)}...</p>
                    <div className="flex flex-wrap gap-1.5 mt-3">
                      {inv.universityIds.map(u => (
                        <span key={u.id} className="inline-flex items-center gap-1 text-[11px] font-medium px-2.5 py-1 rounded-full bg-[#e3f7dd] text-[#1f6a17]"><GraduationCap className="w-3 h-3" />{u.name}</span>
                      ))}
                      {inv.programIds && inv.programIds.map(p => (
                        <span key={p.id} className="inline-flex items-center gap-1 text-[11px] font-medium px-2.5 py-1 rounded-full bg-[#f1f3ef] text-slate-600"><BookOpen className="w-3 h-3" />{p.name}</span>
                      ))}
                      {inv.sessionIds && inv.sessionIds.map(sess => (
                        <span key={sess.id} className="inline-flex items-center gap-1 text-[11px] font-medium px-2.5 py-1 rounded-full bg-white border border-slate-200 text-slate-600"><Calendar className="w-3 h-3" />{sess.name}</span>
                      ))}
                    </div>
                  </div>
                </div>
                <div className="flex gap-2 shrink-0">
                  {inv.status === 'pending' && (
                    <Button onClick={() => copyLink(inv)} className="h-11 px-5 rounded-full bg-slate-900 hover:bg-slate-800 text-white font-semibold gap-2">
                      {copied === inv.id ? <Check className="w-4 h-4 text-[#8ae47e]" /> : <Copy className="w-4 h-4" />}
                      {copied === inv.id ? 'Copied' : 'Copy link'}
                    </Button>
                  )}
                  {(inv.status === 'used' || inv.status === 'expired') && (
                    <Button variant="outline" onClick={() => handleRegenerate(inv)} disabled={regenerating === inv.id} className="h-11 px-5 rounded-full bg-white border-slate-200 font-semibold gap-2 hover:bg-[#eaf6e6]">
                      <RotateCcw className={cn('w-4 h-4', regenerating === inv.id && 'animate-spin')} />Regenerate
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={open} onOpenChange={closeDialog}>
        <DialogContent className="w-[95vw] sm:max-w-xl p-0 gap-0 overflow-hidden rounded-[2rem] border-0 bg-white max-h-[92vh] flex flex-col">
          <div className="flex items-start gap-4 px-6 sm:px-8 pt-7 pb-4 shrink-0">
            <div className="w-12 h-12 rounded-2xl bg-[#eaf6e6] text-[#256c1d] flex items-center justify-center shrink-0">
              <Link className="w-5 h-5" />
            </div>
            <DialogHeader className="space-y-1 text-left">
              <DialogTitle className="text-2xl font-semibold tracking-tight text-foreground text-left">Generate Invite Link</DialogTitle>
              <DialogDescription className="text-sm text-muted-foreground text-left">Step {step} of {totalSteps}</DialogDescription>
            </DialogHeader>
          </div>

          {/* Progress */}
          <div className="px-6 sm:px-8 pb-4 shrink-0">
            <div className="flex gap-1.5">
              {Array.from({ length: totalSteps }).map((_, i) => (
                <span key={i} className={cn('h-1.5 flex-1 rounded-full transition-colors', i < step ? 'bg-[#54b947]' : 'bg-[#e9ece7]')} />
              ))}
            </div>
          </div>

          <div className="flex-1 overflow-y-auto px-6 sm:px-8 pb-4">
            {step === 1 && (
              <div className="space-y-3">
                <Label className="text-sm font-semibold">Select universities</Label>
                {universities.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No universities available.</p>
                ) : (
                  <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
                    {universities.map(u => {
                      const on = selectedUnis.includes(u.id);
                      return (
                        <label key={u.id} htmlFor={`uni-${u.id}`} className={cn(ROW, on ? 'bg-[#eaf6e6] border-[#54b947]/40' : 'bg-white border-slate-200 hover:bg-[#f4f6f3]')}>
                          <Checkbox id={`uni-${u.id}`} checked={on} onCheckedChange={() => toggleUni(u.id)} />
                          <span className="text-sm font-medium flex-1">{u.name}</span>
                          <span className="text-[11px] font-medium px-2.5 py-0.5 rounded-full bg-white text-slate-500">{u.code}</span>
                        </label>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {step === 2 && (
              <div className="space-y-3">
                <Label className="text-sm font-semibold">Select programs {config?.programStep === 'optional' && <span className="text-muted-foreground font-normal">(optional)</span>}</Label>
                {loadingPrograms ? (
                  <div className="space-y-2">{[1,2,3].map(i => <div key={i} className="h-12 bg-[#f4f6f3] rounded-2xl animate-pulse" />)}</div>
                ) : programs.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No active programs found for selected universities. You can still generate the invite.</p>
                ) : (
                  <div className="space-y-5 max-h-72 overflow-y-auto pr-1">
                    {Object.entries(programsByUni).map(([uniId, { uniName, programs: uniPrograms }]) => (
                      <div key={uniId}>
                        <p className="text-xs font-semibold text-muted-foreground mb-2">{uniName}</p>
                        <div className="space-y-2">
                          {uniPrograms.map(p => {
                            const on = selectedPrograms.includes(p.id);
                            return (
                              <label key={p.id} htmlFor={`prog-${p.id}`} className={cn(ROW, on ? 'bg-[#eaf6e6] border-[#54b947]/40' : 'bg-white border-slate-200 hover:bg-[#f4f6f3]')}>
                                <Checkbox id={`prog-${p.id}`} checked={on} onCheckedChange={() => toggleProgram(p.id)} />
                                <span className="text-sm font-medium flex-1">{p.name} <span className="text-muted-foreground text-xs font-normal">({p.code})</span></span>
                                <span className="text-[11px] font-medium px-2.5 py-0.5 rounded-full bg-white text-slate-500">{p.courseType}</span>
                              </label>
                            );
                          })}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {step === 3 && (
              <div className="space-y-3">
                <Label className="text-sm font-semibold">Select specializations {config?.specializationStep === 'optional' && <span className="text-muted-foreground font-normal">(optional)</span>}</Label>
                <div className="space-y-5 max-h-72 overflow-y-auto pr-1">
                  {programs.filter(p => selectedPrograms.includes(p.id) && p.specialisations && p.specialisations.length > 0).map(p => (
                    <div key={p.id}>
                      <p className="text-xs font-semibold text-muted-foreground mb-2">{p.name}</p>
                      <div className="space-y-2">
                        {p.specialisations!.map(spec => {
                          const on = (selectedSpecializations[p.id] || []).includes(spec);
                          return (
                            <label key={spec} htmlFor={`spec-${p.id}-${spec}`} className={cn(ROW, on ? 'bg-[#eaf6e6] border-[#54b947]/40' : 'bg-white border-slate-200 hover:bg-[#f4f6f3]')}>
                              <Checkbox
                                id={`spec-${p.id}-${spec}`}
                                checked={on}
                                onCheckedChange={() => toggleSpecialization(p.id, spec)}
                              />
                              <span className="text-sm font-medium flex-1">{spec}</span>
                            </label>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {step === 4 && (
              <div className="space-y-3">
                <Label className="text-sm font-semibold">Select sessions {config?.sessionStep === 'optional' && <span className="text-muted-foreground font-normal">(optional)</span>}</Label>
                {loadingSessions ? (
                  <div className="space-y-2">{[1,2,3].map(i => <div key={i} className="h-12 bg-[#f4f6f3] rounded-2xl animate-pulse" />)}</div>
                ) : sessions.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No active sessions found. You can still generate the invite.</p>
                ) : (
                  <div className="space-y-5 max-h-72 overflow-y-auto pr-1">
                    {Object.entries(sessionsByUni).map(([uniId, { uniName, sessions: uniSessions }]) => (
                      <div key={uniId}>
                        <p className="text-xs font-semibold text-muted-foreground mb-2">{uniName}</p>
                        <div className="space-y-2">
                          {uniSessions.map(sess => {
                            const on = selectedSessions.includes(sess.id);
                            return (
                              <label key={sess.id} htmlFor={`sess-${sess.id}`} className={cn(ROW, on ? 'bg-[#eaf6e6] border-[#54b947]/40' : 'bg-white border-slate-200 hover:bg-[#f4f6f3]')}>
                                <Checkbox id={`sess-${sess.id}`} checked={on} onCheckedChange={() => toggleSession(sess.id)} />
                                <span className="text-sm font-medium flex-1">
                                  {sess.name}
                                  <span className="block text-muted-foreground text-xs font-normal mt-0.5">
                                    {new Date(sess.startDate).toLocaleDateString()} — {new Date(sess.endDate).toLocaleDateString()}
                                  </span>
                                </span>
                                <span className="text-[11px] font-medium px-2.5 py-0.5 rounded-full bg-white text-slate-500 capitalize">{sess.status}</span>
                              </label>
                            );
                          })}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          <DialogFooter className="px-6 sm:px-8 py-5 border-t border-slate-100 gap-2 sm:gap-2 shrink-0 flex-col-reverse sm:flex-row">
            {step > 1 && config?.universityStep !== 'hidden' && (
              <Button variant="outline" className="h-11 rounded-full px-5 bg-white border-slate-200 font-semibold" onClick={() => {
                if (step === 4 && config?.specializationStep !== 'hidden') {
                  const hasSpecializations = programs.filter(p => selectedPrograms.includes(p.id)).some(p => p.specialisations && p.specialisations.length > 0);
                  if (hasSpecializations) setStep(3);
                  else if (config?.programStep !== 'hidden') setStep(2);
                  else setStep(1);
                }
                else if (step === 3 && config?.programStep !== 'hidden') setStep(2);
                else setStep(1);
              }}>
                <ChevronLeft className="w-4 h-4 mr-1" />Back
              </Button>
            )}
            <Button variant="ghost" onClick={closeDialog} className="h-11 rounded-full px-6 text-slate-600 hover:text-slate-900 font-semibold">Cancel</Button>
            {step === 1 ? (
              <Button onClick={handleNextStep} className="h-11 rounded-full px-7 bg-slate-900 hover:bg-slate-800 text-white font-semibold">
                Next <ChevronRight className="w-4 h-4 ml-1" />
              </Button>
            ) : step === 2 ? (
              <Button onClick={handleProgramNext} disabled={loadingSessions} className="h-11 rounded-full px-7 bg-slate-900 hover:bg-slate-800 text-white font-semibold">
                {loadingSessions ? 'Checking sessions...' : 'Next'} <ChevronRight className="w-4 h-4 ml-1" />
              </Button>
            ) : step === 3 ? (
              <Button onClick={handleSpecializationNext} disabled={loadingSessions} className="h-11 rounded-full px-7 bg-slate-900 hover:bg-slate-800 text-white font-semibold">
                Next <ChevronRight className="w-4 h-4 ml-1" />
              </Button>
            ) : (
              <Button onClick={handleSessionNext} disabled={submitting} className="h-11 rounded-full px-7 bg-[#8ae47e] hover:bg-[#7bd96f] text-[#0b1d14] font-semibold">
                {submitting ? 'Generating...' : 'Generate & Copy Link'}
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
