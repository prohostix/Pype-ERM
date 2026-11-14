import { useState, useEffect, useCallback } from 'react';
import { Globe2, XCircle, Plus, Search } from 'lucide-react';
import { Tabs, TabsContent } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import api from '@/lib/api';
import { toast } from 'sonner';
import { ApplyWizard } from '@/components/panels/studyabroad/ApplyWizard';
import { EnrolledStudents } from '@/components/panels/studyabroad/EnrolledStudents';
import { PipelineApplications } from '@/components/panels/studyabroad/PipelineApplications';
import { ProgramSearch } from '@/components/panels/studyabroad/ProgramSearch';
import { type Prefill, PARTNER_STATUS, apiError, fmtDate, stageLabel, stageTone, CLOSED_STAGES } from '@/components/panels/studyabroad/shared';

interface Me {
  id: string;
  name: string;
  status: string;
  destinationCountries: string[];
  enrollmentCounts: Record<string, number>;
}

const NavTabs: Record<string, string> = { overview: 'dashboard', catalog: 'catalog', apply: 'apply', applications: 'applications', enrolled: 'enrolled' };

export function ModernStudyAbroadPartnerDashboard({ initialTab, onNavigate }: { initialTab?: string; onNavigate?: (tab: string) => void }) {
  const [activeTab, setActiveTab] = useState(initialTab && initialTab !== 'dashboard' ? initialTab : 'overview');
  const [me, setMe] = useState<Me | null>(null);
  const [loading, setLoading] = useState(true);
  const [disabled, setDisabled] = useState(false);
  const [prefill, setPrefill] = useState<Prefill | null>(null);

  useEffect(() => { setActiveTab(initialTab && initialTab !== 'dashboard' ? initialTab : 'overview'); }, [initialTab]);

  const loadMe = useCallback(async () => {
    try {
      const res = await api.get('/study-abroad/me');
      setMe(res.data.data);
    } catch (e: any) {
      if (e?.response?.data?.code === 'FEATURE_DISABLED') setDisabled(true);
      else toast.error(apiError(e, 'Failed to load your partner account'));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadMe(); }, [loadMe]);

  const go = (tab: string) => {
    setActiveTab(tab);
    onNavigate?.(NavTabs[tab] || tab);
  };

  const isActive = me?.status === 'active';
  const shown = isActive ? activeTab : 'overview';

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-primary to-primary/70 text-primary-foreground p-6 sm:p-8">
        <Globe2 className="absolute -right-6 -top-6 w-40 h-40 opacity-10" />
        <div className="relative flex items-start justify-between gap-3 flex-wrap">
          <div className="space-y-1">
            <p className="text-xs uppercase tracking-[0.2em] opacity-80">Study Abroad Partner Portal</p>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">{me?.name ? `Welcome, ${me.name}` : 'Welcome'}</h1>
            <p className="text-sm opacity-90">Find programs, submit student applications and track every one in one place.</p>
          </div>
          {me && <Badge className="uppercase text-[10px] font-bold bg-white/20 text-white hover:bg-white/20">{PARTNER_STATUS[me.status]?.label || me.status}</Badge>}
        </div>
      </div>

      {loading ? (
        <div className="space-y-3">{[1, 2].map(i => <div key={i} className="h-28 bg-muted rounded-xl animate-pulse" />)}</div>
      ) : disabled ? (
        <Card><CardContent className="py-16 text-center space-y-2">
          <XCircle className="w-10 h-10 text-destructive mx-auto" />
          <h3 className="font-semibold">Portal unavailable</h3>
          <p className="text-sm text-muted-foreground">Study Abroad Partner access is currently turned off for this organization. Please contact them.</p>
        </CardContent></Card>
      ) : !me ? (
        <Card><CardContent className="py-16 text-center text-muted-foreground">Your partner account could not be loaded.</CardContent></Card>
      ) : (
        <Tabs value={shown} onValueChange={go} className="space-y-6">
          <TabsContent value="overview"><Overview me={me} onGo={go} /></TabsContent>
          <TabsContent value="catalog"><ProgramSearch onApply={p => { setPrefill(p); go('apply'); }} /></TabsContent>
          <TabsContent value="apply"><ApplyWizard prefill={prefill} onDone={() => { loadMe(); go('applications'); }} /></TabsContent>
          <TabsContent value="applications"><PipelineApplications /></TabsContent>
          <TabsContent value="enrolled"><EnrolledStudents /></TabsContent>
        </Tabs>
      )}
    </div>
  );
}

// ─── Overview ───────────────────────────────────────────────────────────────

function Overview({ me, onGo }: { me: Me; onGo: (t: string) => void }) {
  const [apps, setApps] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (me.status !== 'active') { setLoading(false); return; }
    api.get('/study-abroad/me/applications').then(r => setApps(r.data.data || [])).catch(() => {}).finally(() => setLoading(false));
  }, [me.status]);

  if (me.status === 'suspended') {
    return (
      <Card><CardContent className="p-6 text-center space-y-2">
        <XCircle className="w-10 h-10 text-destructive mx-auto" />
        <h3 className="font-semibold">Account suspended</h3>
        <p className="text-sm text-muted-foreground">Please contact the organization to reactivate your account.</p>
      </CardContent></Card>
    );
  }

  const c = me.enrollmentCounts; // applications per pipeline stage
  const total = Object.values(c).reduce((n, v) => n + v, 0);
  const closed = CLOSED_STAGES.reduce((n, k) => n + (c[k] || 0), 0);
  const enrolled = (c.enrolled || 0) + (c.commission_released || 0);
  const inProgress = total - closed - enrolled;
  const byCountry = Object.entries(apps.reduce<Record<string, number>>((m, a) => { const k = a.country || 'Other'; m[k] = (m[k] || 0) + 1; return m; }, {}))
    .sort((x, y) => y[1] - x[1]).slice(0, 6);
  const topCountry = byCountry[0]?.[1] || 1;
  const stages: [string, number, string][] = [
    ['Application', c.application || 0, 'bg-warning'],
    ['Interview', c.interview || 0, 'bg-primary'],
    ['Offer', c.offer || 0, 'bg-primary'],
    ['Payment', c.payment || 0, 'bg-primary'],
    ['Visa', (c.visa_documents || 0) + (c.visa_decision || 0), 'bg-primary'],
    ['Enrolled', enrolled, 'bg-success'],
    ['Closed', closed, 'bg-destructive'],
  ];

  return (
    <div className="space-y-6">
      <div className="flex gap-2 flex-wrap justify-end">
        <Button variant="outline" onClick={() => onGo('catalog')}><Search className="w-4 h-4 mr-2" />Search programs</Button>
        <Button onClick={() => onGo('apply')}><Plus className="w-4 h-4 mr-2" />New application</Button>
      </div>

      <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
        <Stat label="All applications" value={total} tone="border-l-primary" onClick={() => onGo('applications')} />
        <Stat label="In progress" value={inProgress} tone="border-l-warning" onClick={() => onGo('applications')} />
        <Stat label="Enrolled" value={enrolled} tone="border-l-success" onClick={() => onGo('enrolled')} />
        <Stat label="Closed" value={closed} tone="border-l-destructive" onClick={() => onGo('applications')} />
      </div>

      <div className="grid gap-6 lg:grid-cols-5">
        <Card className="lg:col-span-3">
          <CardHeader className="flex-row items-center justify-between space-y-0 pb-3">
            <CardTitle className="text-base">Recent applications</CardTitle>
            {apps.length > 0 && <button className="text-xs text-primary hover:underline" onClick={() => onGo('applications')}>View all</button>}
          </CardHeader>
          <CardContent className="space-y-1">
            {loading ? <div className="h-32 bg-muted rounded-lg animate-pulse" />
            : apps.length === 0 ? (
              <div className="py-10 text-center space-y-3">
                <p className="text-sm text-muted-foreground">No applications yet. Start with a program search.</p>
                <Button size="sm" onClick={() => onGo('catalog')}>Search programs</Button>
              </div>
            ) : apps.slice(0, 5).map(a => (
              <button key={a.id} type="button" onClick={() => onGo('applications')}
                className="w-full text-left flex items-center justify-between gap-3 rounded-lg px-3 py-2.5 hover:bg-muted/60 transition-colors">
                <div className="min-w-0">
                  <p className="font-medium text-sm truncate">{a.studentName}</p>
                  <p className="text-xs text-muted-foreground truncate">{[a.programName, a.universityName, a.country].filter(Boolean).join(' · ')}</p>
                </div>
                <div className="text-right shrink-0">
                  <Badge className={cn('text-[10px] uppercase font-bold', stageTone(a.stage))}>{stageLabel(a.stage)}</Badge>
                  <p className="text-[11px] text-muted-foreground mt-1">{fmtDate(a.createdAt)}</p>
                </div>
              </button>
            ))}
          </CardContent>
        </Card>

        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader className="pb-3"><CardTitle className="text-base">Application pipeline</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              {stages.map(([label, n, bar]) => (
                <div key={label} className="space-y-1">
                  <div className="flex justify-between text-sm"><span>{label}</span><span className="font-semibold">{n}</span></div>
                  <div className="h-2 rounded-full bg-muted overflow-hidden"><div className={cn('h-full rounded-full', bar)} style={{ width: `${total ? (n / total) * 100 : 0}%` }} /></div>
                </div>
              ))}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3"><CardTitle className="text-base">Applications by country</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              {byCountry.length === 0 ? <p className="text-sm text-muted-foreground">Country totals appear once you have applications.</p>
              : byCountry.map(([country, n]) => (
                <div key={country} className="space-y-1">
                  <div className="flex justify-between text-sm"><span className="flex items-center gap-1.5"><Globe2 className="w-3.5 h-3.5 text-muted-foreground" />{country}</span><span className="font-semibold">{n}</span></div>
                  <div className="h-2 rounded-full bg-muted overflow-hidden"><div className="h-full rounded-full bg-primary" style={{ width: `${(n / topCountry) * 100}%` }} /></div>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

function Stat({ label, value, tone, onClick }: { label: string; value: number; tone: string; onClick?: () => void }) {
  return (
    <Card className={cn('cursor-pointer hover:shadow-md transition-shadow border-l-4', tone)} onClick={onClick}>
      <CardContent className="p-5">
        <p className="text-xs uppercase tracking-widest text-muted-foreground font-bold">{label}</p>
        <p className="text-3xl font-bold mt-1">{value}</p>
      </CardContent>
    </Card>
  );
}
