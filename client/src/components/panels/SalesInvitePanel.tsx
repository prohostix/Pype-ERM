import { useState, useEffect } from 'react';
import { Plus, Copy, Check, RefreshCw, Link, RotateCcw, ChevronRight, ChevronLeft, Calendar } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
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
  pending: 'bg-success/10 text-success',
  used: 'bg-muted text-muted-foreground',
  expired: 'bg-error/10 text-error',
};

export function SalesInvitePanel() {
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

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Invite Links</h2>
          <p className="text-muted-foreground text-sm mt-1">Generate invite links for prospective study centers.</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={fetchInvites} disabled={loading}>
            <RefreshCw className={cn('w-4 h-4 mr-2', loading && 'animate-spin')} />Refresh
          </Button>
          <Button size="sm" onClick={handleOpenDialog}>
            <Plus className="w-4 h-4 mr-2" />Generate Invite
          </Button>
        </div>
      </div>

      {loading ? (
        <div className="space-y-3">{[1,2,3].map(i => <div key={i} className="h-16 bg-muted rounded-xl animate-pulse" />)}</div>
      ) : invites.length === 0 ? (
        <Card><CardContent className="py-16 text-center text-muted-foreground">
          <Link className="w-10 h-10 mx-auto mb-3 opacity-30" />
          <p>No invite links yet. Generate one to get started.</p>
        </CardContent></Card>
      ) : (
        <div className="space-y-3">
          {invites.map(inv => (
            <Card key={inv.id} className="hover:border-primary/30 transition-colors">
              <CardContent className="p-4 flex items-center justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap mb-1">
                    <Badge className={cn('text-[10px] uppercase font-bold', STATUS_COLOR[inv.status])}>{inv.status}</Badge>
                    <span className="text-xs text-muted-foreground">Expires: {new Date(inv.expiresAt).toLocaleDateString()}</span>
                  </div>
                  <p className="text-sm font-mono text-muted-foreground truncate">{inv.token.substring(0, 24)}...</p>
                  <div className="flex flex-wrap gap-1 mt-1">
                    {inv.universityIds.map(u => (
                      <Badge key={u.id} variant="outline" className="text-[10px]">{u.name}</Badge>
                    ))}
                  </div>
                  {inv.programIds && inv.programIds.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-1">
                      {inv.programIds.map(p => (
                        <Badge key={p.id} variant="secondary" className="text-[10px]">{p.name}</Badge>
                      ))}
                    </div>
                  )}
                  {inv.sessionIds && inv.sessionIds.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-1">
                      {inv.sessionIds.map(s => (
                        <Badge key={s.id} variant="outline" className="text-[10px] bg-blue-50 border-blue-200 text-blue-700">
                          <Calendar className="w-3 h-3 mr-1" />{s.name}
                        </Badge>
                      ))}
                    </div>
                  )}
                </div>
                {inv.status === 'pending' && (
                  <Button variant="outline" size="sm" onClick={() => copyLink(inv)}>
                    {copied === inv.id ? <Check className="w-4 h-4 text-success" /> : <Copy className="w-4 h-4" />}
                  </Button>
                )}
                {(inv.status === 'used' || inv.status === 'expired') && (
                  <Button variant="outline" size="sm" onClick={() => handleRegenerate(inv)} disabled={regenerating === inv.id}>
                    <RotateCcw className={cn('w-4 h-4', regenerating === inv.id && 'animate-spin')} />
                  </Button>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={open} onOpenChange={closeDialog}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              Generate Invite Link
              <span className="text-sm font-normal text-muted-foreground ml-2">Step {step} of {totalSteps}</span>
            </DialogTitle>
          </DialogHeader>

          {step === 1 && (
            <div className="space-y-3 py-2">
              <Label>Select Universities</Label>
              {universities.length === 0 ? (
                <p className="text-sm text-muted-foreground">No universities available.</p>
              ) : (
                <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
                  {universities.map(u => (
                    <div key={u.id} className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted/50">
                      <Checkbox id={`uni-${u.id}`} checked={selectedUnis.includes(u.id)} onCheckedChange={() => toggleUni(u.id)} />
                      <label htmlFor={`uni-${u.id}`} className="text-sm cursor-pointer flex-1">
                        {u.name} <span className="text-muted-foreground text-xs">({u.code})</span>
                      </label>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {step === 2 && (
            <div className="space-y-3 py-2">
              <Label>Select Programs {config?.programStep === 'optional' && <span className="text-muted-foreground font-normal">(optional)</span>}</Label>
              {loadingPrograms ? (
                <div className="space-y-2">{[1,2,3].map(i => <div key={i} className="h-8 bg-muted rounded animate-pulse" />)}</div>
              ) : programs.length === 0 ? (
                <p className="text-sm text-muted-foreground">No active programs found for selected universities. You can still generate the invite.</p>
              ) : (
                <div className="space-y-4 max-h-64 overflow-y-auto pr-1">
                  {Object.entries(programsByUni).map(([uniId, { uniName, programs: uniPrograms }]) => (
                    <div key={uniId}>
                      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1">{uniName}</p>
                      <div className="space-y-1">
                        {uniPrograms.map(p => (
                          <div key={p.id} className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted/50">
                            <Checkbox id={`prog-${p.id}`} checked={selectedPrograms.includes(p.id)} onCheckedChange={() => toggleProgram(p.id)} />
                            <label htmlFor={`prog-${p.id}`} className="text-sm cursor-pointer flex-1">
                              {p.name}
                              <span className="text-muted-foreground text-xs ml-1">({p.code})</span>
                              <Badge variant="outline" className="text-[10px] ml-1">{p.courseType}</Badge>
                            </label>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {step === 3 && (
            <div className="space-y-3 py-2">
              <Label>Select Specializations {config?.specializationStep === 'optional' && <span className="text-muted-foreground font-normal">(optional)</span>}</Label>
              <div className="space-y-4 max-h-64 overflow-y-auto pr-1">
                {programs.filter(p => selectedPrograms.includes(p.id) && p.specialisations && p.specialisations.length > 0).map(p => (
                  <div key={p.id}>
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1">{p.name}</p>
                    <div className="space-y-1">
                      {p.specialisations!.map(spec => (
                        <div key={spec} className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted/50">
                          <Checkbox 
                            id={`spec-${p.id}-${spec}`} 
                            checked={(selectedSpecializations[p.id] || []).includes(spec)} 
                            onCheckedChange={() => toggleSpecialization(p.id, spec)} 
                          />
                          <label htmlFor={`spec-${p.id}-${spec}`} className="text-sm cursor-pointer flex-1">
                            {spec}
                          </label>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {step === 4 && (
            <div className="space-y-3 py-2">
              <Label>Select Sessions {config?.sessionStep === 'optional' && <span className="text-muted-foreground font-normal">(optional)</span>}</Label>
              {loadingSessions ? (
                <div className="space-y-2">{[1,2,3].map(i => <div key={i} className="h-8 bg-muted rounded animate-pulse" />)}</div>
              ) : sessions.length === 0 ? (
                <p className="text-sm text-muted-foreground">No active sessions found. You can still generate the invite.</p>
              ) : (
                <div className="space-y-4 max-h-64 overflow-y-auto pr-1">
                  {Object.entries(sessionsByUni).map(([uniId, { uniName, sessions: uniSessions }]) => (
                    <div key={uniId}>
                      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1">{uniName}</p>
                      <div className="space-y-1">
                        {uniSessions.map(s => (
                          <div key={s.id} className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted/50">
                            <Checkbox id={`sess-${s.id}`} checked={selectedSessions.includes(s.id)} onCheckedChange={() => toggleSession(s.id)} />
                            <label htmlFor={`sess-${s.id}`} className="text-sm cursor-pointer flex-1">
                              {s.name}
                              <span className="text-muted-foreground text-xs ml-1">
                                ({new Date(s.startDate).toLocaleDateString()} — {new Date(s.endDate).toLocaleDateString()})
                              </span>
                              <Badge variant="outline" className="text-[10px] ml-1">{s.status}</Badge>
                            </label>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          <DialogFooter className="gap-2">
            {step > 1 && config?.universityStep !== 'hidden' && (
              <Button variant="outline" onClick={() => {
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
            <Button variant="outline" onClick={closeDialog}>Cancel</Button>
            {step === 1 ? (
              <Button onClick={handleNextStep}>
                Next <ChevronRight className="w-4 h-4 ml-1" />
              </Button>
            ) : step === 2 ? (
              <Button onClick={handleProgramNext} disabled={loadingSessions}>
                {loadingSessions ? 'Checking sessions...' : 'Next'} <ChevronRight className="w-4 h-4 ml-1" />
              </Button>
            ) : step === 3 ? (
              <Button onClick={handleSpecializationNext} disabled={loadingSessions}>
                Next <ChevronRight className="w-4 h-4 ml-1" />
              </Button>
            ) : (
              <Button onClick={handleSessionNext} disabled={submitting}>
                {submitting ? 'Generating...' : 'Generate & Copy Link'}
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
