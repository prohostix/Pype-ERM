import { useState, useEffect } from 'react';
import { RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import api from '@/lib/api';
import { toast } from 'sonner';
import { ListPagination } from '@/components/ui/list-pagination';

interface Escalation {
  id: string;
  type: string;
  reason: string;
  impact: string;
  status: string;
  currentLevel: number;
  maxLevel: number;
  raisedAt: string;
  chain: { level: number; role: string; action?: string; remarks?: string; actionAt?: string }[];
}

const STATUS_COLOR: Record<string, string> = {
  active:   'bg-amber-100 text-amber-700',
  resolved: 'bg-[#dff3da] text-[#256c1d]',
};

const IMPACT_COLOR: Record<string, string> = {
  critical: 'bg-red-100 text-red-700',
  high:     'bg-orange-100 text-orange-700',
  medium:   'bg-amber-100 text-amber-700',
  low:      'bg-sky-100 text-sky-700',
};

const TYPE_LABELS: Record<string, string> = {
  task_overdue:    'Task Overdue',
  approval_delay:  'Approval Delay',
  compliance:      'Compliance Issue',
  credential_reveal: 'Credential Issue',
};

function timeAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const hrs = Math.floor(diff / 3600000);
  if (hrs < 1) return 'just now';
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

export function EmployeeEscalationsPanel() {
  const [escalations, setEscalations] = useState<Escalation[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [form, setForm] = useState({
    type: 'approval_delay' as string,
    description: '',
    impact: 'medium' as string,
  });

  const fetchEscalations = async () => {
    setLoading(true);
    try {
      const res = await api.get('/escalations');
      // Show only escalations raised by the current user (server filters by org, we show all they can see)
      setEscalations(res.data.data || []);
    } catch {
      setEscalations([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchEscalations(); }, []);
  useEffect(() => { setPage(1); }, [pageSize]);

  const handleSubmit = async () => {
    if (!form.description.trim()) {
      toast.error('Please describe the issue');
      return;
    }
    setSaving(true);
    try {
      await api.post('/escalations', {
        type: form.type,
        reason: form.description,
        impact: form.impact,
        currentLevel: 1,
        maxLevel: 3,
      });
      toast.success('Escalation raised successfully');
      setShowForm(false);
      setForm({ type: 'approval_delay', description: '', impact: 'medium' });
      fetchEscalations();
    } catch (e: any) {
      toast.error(e.response?.data?.message || 'Failed to raise escalation');
    } finally {
      setSaving(false);
    }
  };

  const active = escalations.filter(e => e.status === 'active').length;
  const resolved = escalations.filter(e => e.status === 'resolved').length;

  const rows = escalations.slice((page - 1) * pageSize, page * pageSize);
  const field = 'w-full h-11 rounded-2xl border border-slate-200 bg-white px-4 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#8ae47e]';

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-2xl sm:text-3xl font-semibold tracking-tight">My Escalations</h2>
          <p className="text-muted-foreground text-sm mt-1.5">Raise and track issues that need management attention</p>
        </div>
        <div className="flex items-center gap-3">
          <Button variant="outline" onClick={fetchEscalations} disabled={loading} className="h-11 px-5 rounded-full bg-white border-slate-200 hover:bg-[#eaf6e6]">
            <RefreshCw className={cn('w-4 h-4 mr-2', loading && 'animate-spin')} />Refresh
          </Button>
          <Button onClick={() => setShowForm(v => !v)} className="h-11 px-5 rounded-full bg-[#8ae47e] hover:bg-[#7bd96f] text-[#0b1d14] font-semibold">
            {showForm ? 'Close form' : 'Raise Escalation'}
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="rounded-3xl bg-white border border-slate-100 overflow-hidden">
        <div className="grid grid-cols-3 divide-x divide-slate-100">
          {[
            { label: 'Active', value: active, tone: active > 0 ? 'text-amber-600' : 'text-slate-900' },
            { label: 'Resolved', value: resolved, tone: 'text-[#256c1d]' },
            { label: 'Total', value: escalations.length, tone: 'text-slate-900' },
          ].map((k) => (
            <div key={k.label} className="p-5 sm:p-6">
              <p className="text-sm font-medium text-slate-500">{k.label}</p>
              <p className={cn('text-3xl sm:text-4xl font-semibold tracking-tight mt-2 tabular-nums', k.tone)}>{loading ? '…' : k.value}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Raise form */}
      {showForm && (
        <div className="rounded-3xl bg-white border border-slate-100 overflow-hidden">
          <div className="px-6 py-5 border-b border-slate-100">
            <h3 className="text-lg font-semibold tracking-tight">Raise a new escalation</h3>
            <p className="text-sm text-muted-foreground mt-0.5">This will be visible to your department admin and escalated to management if unresolved</p>
          </div>
          <div className="p-5 sm:p-6 space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-slate-700">Issue type</label>
                <select className={field} value={form.type} onChange={e => setForm(f => ({ ...f, type: e.target.value }))}>
                  <option value="approval_delay">Approval Delay</option>
                  <option value="task_overdue">Task / Deadline Issue</option>
                  <option value="compliance">Compliance Issue</option>
                  <option value="credential_reveal">Credential / Access Issue</option>
                </select>
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-slate-700">Impact level</label>
                <select className={field} value={form.impact} onChange={e => setForm(f => ({ ...f, impact: e.target.value }))}>
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                  <option value="critical">Critical</option>
                </select>
              </div>
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-slate-700">Description</label>
              <textarea
                className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 resize-none focus:outline-none focus:ring-2 focus:ring-[#8ae47e]"
                rows={4}
                placeholder="Describe the issue clearly — what happened, when, and what you need..."
                value={form.description}
                onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
              />
            </div>
            <div className="flex gap-2 justify-end">
              <Button variant="outline" onClick={() => setShowForm(false)} className="h-11 px-5 rounded-full bg-white border-slate-200 hover:bg-[#eaf6e6]">Cancel</Button>
              <Button onClick={handleSubmit} disabled={saving} className="h-11 px-5 rounded-full bg-[#8ae47e] hover:bg-[#7bd96f] text-[#0b1d14] font-semibold">
                {saving ? 'Submitting…' : 'Submit escalation'}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* List */}
      <div className="rounded-3xl bg-white border border-slate-100 overflow-hidden">
        <div className="px-6 py-5 border-b border-slate-100">
          <h3 className="text-lg font-semibold tracking-tight">Your escalations</h3>
          <p className="text-sm text-muted-foreground mt-0.5">Tap one to see its activity chain</p>
        </div>
        <div className="p-5 sm:p-6 space-y-2">
          {loading ? (
            [1, 2, 3].map(i => <div key={i} className="h-20 rounded-2xl bg-slate-100 animate-pulse" />)
          ) : escalations.length === 0 ? (
            <div className="py-12 text-center">
              <p className="font-semibold text-slate-900">No escalations yet</p>
              <p className="text-sm text-muted-foreground mt-1">Use "Raise Escalation" if you have an issue that needs attention.</p>
            </div>
          ) : rows.map(esc => (
            <div key={esc.id} className={cn('rounded-2xl transition-colors cursor-pointer px-4 py-4 sm:px-5', expanded === esc.id ? 'bg-[#eef5ec]' : 'bg-[#f4f6f3] hover:bg-[#eef5ec]')}
              onClick={() => setExpanded(expanded === esc.id ? null : esc.id)}>
              <div className="flex items-center gap-2 flex-wrap mb-2">
                <span className={cn('rounded-full px-3 py-0.5 text-xs font-semibold capitalize', STATUS_COLOR[esc.status] || 'bg-slate-100 text-slate-600')}>{esc.status}</span>
                <span className={cn('rounded-full px-3 py-0.5 text-xs font-semibold capitalize', IMPACT_COLOR[esc.impact] || 'bg-slate-100 text-slate-600')}>{esc.impact}</span>
                <span className="rounded-full bg-white px-3 py-0.5 text-xs font-semibold text-slate-700">{TYPE_LABELS[esc.type] || esc.type}</span>
                <span className="text-xs text-muted-foreground">{timeAgo(esc.raisedAt)}</span>
              </div>
              <p className={cn('text-sm text-slate-900', expanded === esc.id ? '' : 'line-clamp-2')}>{esc.reason}</p>
              <div className="flex items-center gap-1.5 mt-3">
                <span className="text-xs text-muted-foreground mr-1">Level</span>
                {Array.from({ length: esc.maxLevel }).map((_, i) => (
                  <div key={i} className={cn('w-6 h-2 rounded-full', i < esc.currentLevel ? 'bg-[#54b947]' : 'bg-white')} />
                ))}
                <span className="text-xs text-muted-foreground ml-1 tabular-nums">{esc.currentLevel}/{esc.maxLevel}</span>
              </div>

              {expanded === esc.id && esc.chain.length > 0 && (
                <div className="mt-4 pt-4 border-t border-white space-y-3">
                  <p className="text-sm font-semibold text-slate-900">Activity chain</p>
                  {esc.chain.map((step, i) => (
                    <div key={i} className="flex items-start gap-3 text-sm">
                      <span className="w-6 h-6 rounded-full bg-white text-xs font-semibold text-slate-700 flex items-center justify-center shrink-0">{step.level}</span>
                      <div>
                        <span className="font-semibold capitalize">{step.role}</span>
                        {step.action && <span className="text-muted-foreground"> — {step.action}</span>}
                        {step.remarks && <p className="text-muted-foreground mt-0.5">{step.remarks}</p>}
                        {step.actionAt && <p className="text-xs text-muted-foreground mt-0.5">{new Date(step.actionAt).toLocaleString()}</p>}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
          {!loading && <ListPagination total={escalations.length} page={page} pageSize={pageSize} onPageChange={setPage} onPageSizeChange={setPageSize} />}
        </div>
      </div>
    </div>
  );
}
