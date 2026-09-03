import { useState, useEffect } from 'react';
import { Plus, Trash2, CheckCircle, XCircle, Clock, RefreshCw, ChevronDown, ChevronUp, CalendarPlus, ShieldAlert, FileText, UserCircle2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Switch } from '@/components/ui/switch';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { useAuth } from '@/hooks/useAuth';
import api from '@/lib/api';

interface LeaveRequest {
  id: string;
  employeeId: string;
  user?: { name: string; email: string; designation?: string } | null;
  departmentId?: string;
  department?: { name: string } | null;
  type: string;
  startDate: string;
  endDate: string;
  reason: string;
  status: 'pending' | 'dept_approved' | 'approved' | 'rejected';
  deptAdminRemarks?: string;
  hrRemarks?: string;
  deptApprover?: { name: string } | null;
  hrApprover?: { name: string } | null;
  appliedAt: string;
  createdAt: string;
  isHalfDay?: boolean;
  halfDayType?: string;
}

const STATUS_CONFIG: Record<string, { label: string; color: string }> = {
  pending:      { label: 'Pending',          color: 'bg-yellow-500/10 text-yellow-600 border-yellow-500/20' },
  dept_approved:{ label: 'Dept Approved',    color: 'bg-blue-500/10 text-blue-600 border-blue-500/20' },
  approved:     { label: 'Fully Approved',   color: 'bg-green-500/10 text-green-600 border-green-500/20' },
  rejected:     { label: 'Rejected',         color: 'bg-red-500/10 text-red-600 border-red-500/20' },
};

const DEPT_MANAGER_ROLES = ['ops_admin', 'finance_admin', 'finance_sub_admin', 'sales_admin', 'sales_sub_admin', 'center_admin', 'ops_sub_admin'];

export function LeavesPanel({ isMyPortal = false }: { isMyPortal?: boolean }) {
  const { user } = useAuth();
  const [leaves, setLeaves] = useState<LeaveRequest[]>([]);
  const [balances, setBalances] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('all');

  // Create dialog
  const [createOpen, setCreateOpen] = useState(false);
  const [form, setForm] = useState({ type: 'sick', startDate: '', endDate: '', reason: '', isHalfDay: false, halfDayType: 'first_half' });
  const [submitting, setSubmitting] = useState(false);

  // Action dialog (approve/reject with remarks)
  const [actionDialog, setActionDialog] = useState(false);
  const [actionLeave, setActionLeave] = useState<LeaveRequest | null>(null);
  const [actionType, setActionType] = useState<'dept' | 'hr'>('dept');
  const [actionMode, setActionMode] = useState<'approve' | 'reject'>('approve');
  const [remarks, setRemarks] = useState('');
  const [actionSubmitting, setActionSubmitting] = useState(false);

  // Delete dialog
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteLeave, setDeleteLeave] = useState<LeaveRequest | null>(null);

  // Expanded card for remarks
  const [expanded, setExpanded] = useState<string | null>(null);

  const role = user?.role || '';
  const userId = user?.id?.toString() || '';
  const isBranchManager = Boolean((user as any)?.isBranchManager);
  const isDeptManager = DEPT_MANAGER_ROLES.includes(role) || isBranchManager;
  const isHR = role === 'hr_admin' || role === 'hr_sub_admin';
  const isEmployee = !isDeptManager && !isHR && role !== 'superadmin' && role !== 'org_admin' && role !== 'ceo';

  const currentMonthStr = `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, '0')}`;
  const [selectedMonth, setSelectedMonth] = useState(currentMonthStr);

  const fetchLeaves = async () => {
    setLoading(true);
    try {
      const endpoint = (isEmployee || isMyPortal) ? '/hr/leaves/my' : '/hr/leaves';
      const res = await api.get(endpoint);
      setLeaves(res.data.data || []);

      if (isEmployee || isMyPortal) {
        const balRes = await api.get(`/hr/leaves/balance?month=${selectedMonth}`);
        setBalances(balRes.data.data);
      }
    } catch {
      toast.error('Failed to fetch leave requests');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchLeaves(); }, [selectedMonth]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await api.post('/hr/leaves', form);
      toast.success('Leave request submitted. Your department manager will review it.');
      setCreateOpen(false);
      setForm({ type: 'sick', startDate: '', endDate: '', reason: '', isHalfDay: false, halfDayType: 'first_half' });
      fetchLeaves();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to submit leave request');
    } finally {
      setSubmitting(false);
    }
  };

  const openAction = (leave: LeaveRequest, type: 'dept' | 'hr', mode: 'approve' | 'reject') => {
    setActionLeave(leave);
    setActionType(type);
    setActionMode(mode);
    setRemarks('');
    setActionDialog(true);
  };

  const handleAction = async () => {
    if (!actionLeave) return;
    if (actionMode === 'reject' && !remarks.trim()) {
      toast.error('Please provide a reason for rejection');
      return;
    }
    setActionSubmitting(true);
    try {
      const endpoint = actionType === 'dept'
        ? `/hr/leaves/${actionLeave.id}/dept-approve`
        : `/hr/leaves/${actionLeave.id}/hr-approve`;
      await api.patch(endpoint, { action: actionMode, remarks });
      toast.success(actionMode === 'approve' ? 'Leave approved' : 'Leave rejected');
      setActionDialog(false);
      fetchLeaves();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Action failed');
    } finally {
      setActionSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteLeave) return;
    try {
      await api.delete(`/hr/leaves/${deleteLeave.id}`);
      toast.success('Leave request deleted');
      setDeleteOpen(false);
      fetchLeaves();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to delete');
    }
  };

  // Filter tabs
  const filtered = leaves.filter(l => {
    if (activeTab === 'all') return true;
    if (activeTab === 'mine') return l.employeeId === userId;
    return l.status === activeTab;
  });

  const counts = {
    all: leaves.length,
    pending: leaves.filter(l => l.status === 'pending').length,
    dept_approved: leaves.filter(l => l.status === 'dept_approved').length,
    approved: leaves.filter(l => l.status === 'approved').length,
    rejected: leaves.filter(l => l.status === 'rejected').length,
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-primary/10 rounded-2xl">
            <CalendarPlus className="w-6 h-6 text-primary" />
          </div>
          <div>
            <h2 className="text-2xl font-bold">Leave Requests</h2>
            <p className="text-muted-foreground text-sm mt-1">
              {isDeptManager
                ? 'Review and approve leave requests from your department.'
                : isHR
                ? 'Final approval for department-approved leave requests.'
                : 'Submit and track your leave requests.'}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <Button variant="outline" size="sm" onClick={fetchLeaves} disabled={loading} className="rounded-xl border-slate-200/60 shadow-sm h-10 px-4">
            <RefreshCw className={cn('w-4 h-4 mr-2 text-muted-foreground', loading && 'animate-spin')} />
            Refresh
          </Button>
          {!isHR && (
            <Button size="sm" onClick={() => setCreateOpen(true)} className="rounded-xl shadow-md h-10 px-4 transition-transform hover:scale-105 active:scale-95">
              <Plus className="w-4 h-4 mr-2" />
              New Request
            </Button>
          )}
        </div>
      </div>

      {/* My Leave Balances */}
      {/* My Leave Balances */}
      {balances && (
        <div className="mb-6">
          <div className="flex justify-between items-center mb-3">
            <h3 className="text-lg font-semibold">My Leave Balances</h3>
            <Input 
              type="month" 
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              className="w-48"
            />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Sick Leave */}
            <Card className="border border-slate-200/60 dark:border-slate-800/60 shadow-sm rounded-2xl bg-card/60 backdrop-blur-xl">
              <CardContent className="pt-5 pb-5">
                <div className="flex justify-between items-start mb-2">
                  <p className="font-medium">Sick Leave</p>
                  <Badge variant="outline">{balances.sick.available.toFixed(1)} Available</Badge>
                </div>
                <div className="text-sm text-muted-foreground mb-1">
                  Accrued (This Month): {balances.sick.accrued.toFixed(1)}
                </div>
                <div className="text-sm text-muted-foreground">
                  Taken: {balances.sick.used.toFixed(1)}
                </div>
              </CardContent>
            </Card>

            {/* Casual Leave */}
            <Card className="border border-slate-200/60 dark:border-slate-800/60 shadow-sm rounded-2xl bg-card/60 backdrop-blur-xl">
              <CardContent className="pt-5 pb-5">
                <div className="flex justify-between items-start mb-2">
                  <p className="font-medium">Casual Leave</p>
                  <Badge variant="outline" className="bg-blue-500/10 text-blue-600 border-blue-200">{balances.casual.available.toFixed(1)} Available</Badge>
                </div>
                <div className="text-sm text-muted-foreground mb-1">
                  Accrued (Last 3m): {(balances.casual.accrued * 3).toFixed(1)}
                </div>
                <div className="text-sm text-muted-foreground mb-1">
                  Taken: {balances.casual.used.toFixed(1)}
                </div>
                {balances.casual.carryForward > 0 && (
                  <Badge variant="secondary" className="text-xs mt-1">
                    +{balances.casual.carryForward.toFixed(1)} Carry Forward
                  </Badge>
                )}
              </CardContent>
            </Card>

            {/* Earned Leave */}
            <Card className="border border-slate-200/60 dark:border-slate-800/60 shadow-sm rounded-2xl bg-card/60 backdrop-blur-xl">
              <CardContent className="pt-5 pb-5">
                <div className="flex justify-between items-start mb-2">
                  <p className="font-medium">Earned Leave</p>
                  <Badge variant="outline">{balances.earned.available.toFixed(1)} Available</Badge>
                </div>
                <div className="text-sm text-muted-foreground mb-1">
                  Accrued (YTD): {balances.earned.accrued.toFixed(1)}
                </div>
                <div className="text-sm text-muted-foreground">
                  Taken: {balances.earned.used.toFixed(1)}
                </div>
              </CardContent>
            </Card>

            {/* Unpaid */}
            <Card className="border border-slate-200/60 dark:border-slate-800/60 shadow-sm rounded-2xl bg-red-500/5 backdrop-blur-xl border-red-500/20">
              <CardContent className="pt-5 pb-5">
                <div className="flex justify-between items-start mb-2">
                  <p className="font-medium text-red-600">Loss of Pay</p>
                  <Badge variant="destructive">{balances.unpaid.taken.toFixed(1)} Days</Badge>
                </div>
                <div className="text-sm text-muted-foreground mt-2">
                  Leaves marked as unpaid due to insufficient balance.
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      )}

      {/* Summary KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Pending', count: counts.pending, color: 'text-yellow-600', bg: 'bg-yellow-500/10' },
          { label: 'Dept Approved', count: counts.dept_approved, color: 'text-blue-600', bg: 'bg-blue-500/10' },
          { label: 'Approved', count: counts.approved, color: 'text-green-600', bg: 'bg-green-500/10' },
          { label: 'Rejected', count: counts.rejected, color: 'text-red-600', bg: 'bg-red-500/10' },
        ].map(({ label, count, color, bg }) => (
          <Card key={label} className="border border-slate-200/60 dark:border-slate-800/60 shadow-sm hover:shadow-md transition-shadow rounded-2xl bg-card/60 backdrop-blur-xl">
            <CardContent className="pt-5 pb-5 flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground mb-1">{label}</p>
                <p className={cn('text-3xl font-bold', color)}>{count}</p>
              </div>
              <div className={cn("p-3 rounded-2xl", bg)}>
                <FileText className={cn("w-5 h-5", color)} />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="flex-wrap h-auto gap-1 bg-muted/40 p-1.5 rounded-2xl border border-slate-200/50 dark:border-slate-800/50">
          <TabsTrigger value="all" className="rounded-xl data-[state=active]:shadow-sm">All ({counts.all})</TabsTrigger>
          <TabsTrigger value="pending" className="rounded-xl data-[state=active]:shadow-sm">Pending ({counts.pending})</TabsTrigger>
          <TabsTrigger value="dept_approved" className="rounded-xl data-[state=active]:shadow-sm">Dept Approved ({counts.dept_approved})</TabsTrigger>
          <TabsTrigger value="approved" className="rounded-xl data-[state=active]:shadow-sm">Approved ({counts.approved})</TabsTrigger>
          <TabsTrigger value="rejected" className="rounded-xl data-[state=active]:shadow-sm">Rejected ({counts.rejected})</TabsTrigger>
          {!isEmployee && !isMyPortal && <TabsTrigger value="mine" className="rounded-xl data-[state=active]:shadow-sm">My Requests</TabsTrigger>}
        </TabsList>

        <TabsContent value={activeTab} className="mt-6">
          {loading ? (
            <div className="space-y-4">
              {[1,2,3].map(i => <div key={i} className="h-32 bg-muted/40 rounded-2xl animate-pulse" />)}
            </div>
          ) : filtered.length === 0 ? (
            <Card className="border border-slate-200/60 dark:border-slate-800/60 shadow-sm rounded-2xl bg-card/40 backdrop-blur-sm border-dashed">
              <CardContent className="py-20 text-center text-muted-foreground flex flex-col items-center">
                <div className="p-4 bg-muted/50 rounded-full mb-4">
                  <Clock className="w-8 h-8 opacity-40" />
                </div>
                <p className="text-lg font-medium">No leave requests found</p>
                <p className="text-sm opacity-70 mt-1">Check back later or submit a new request.</p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {filtered.map(leave => {
                const cfg = STATUS_CONFIG[leave.status] || STATUS_CONFIG.pending;
                const isExpanded = expanded === leave.id;
                const isOwner = leave.employeeId === userId;
                const canDeptAct = isDeptManager && leave.status === 'pending';
                const canHRAct = isHR && leave.status === 'dept_approved';

                return (
                  <Card key={leave.id} className="border border-slate-200/60 dark:border-slate-800/60 shadow-sm hover:shadow-lg rounded-2xl hover:border-primary/30 transition-all duration-300 bg-card/60 backdrop-blur-xl group overflow-hidden">
                    <CardContent className="p-0">
                      <div className="p-5 sm:p-6 flex flex-col sm:flex-row items-start justify-between gap-5">
                        <div className="flex-1 min-w-0">
                          {/* Top row */}
                          <div className="flex items-center gap-2 flex-wrap mb-3">
                            <Badge className={cn('text-[11px] font-bold uppercase border px-2.5 py-0.5 rounded-full', cfg.color)}>
                              {cfg.label}
                            </Badge>
                            <Badge variant="outline" className="text-[11px] capitalize rounded-full bg-background/50 backdrop-blur-sm">{leave.type} Leave</Badge>
                            {leave.department && (
                              <Badge variant="outline" className="text-[11px] rounded-full bg-background/50 backdrop-blur-sm">{leave.department.name}</Badge>
                            )}
                            {leave.isHalfDay && (
                              <Badge variant="outline" className="text-[11px] bg-primary/10 text-primary border-primary/20 rounded-full">
                                Half Day ({leave.halfDayType === 'first_half' ? '1st Half' : '2nd Half'})
                              </Badge>
                            )}
                          </div>

                          {/* Employee name */}
                          <div className="flex items-center gap-3 mb-2">
                            <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center text-primary">
                              <UserCircle2 className="w-5 h-5" />
                            </div>
                            <div>
                              <p className="font-bold text-base">
                                {leave.user?.name || 'Employee'}
                              </p>
                              {leave.user?.designation && (
                                <p className="text-muted-foreground text-xs">{leave.user.designation}</p>
                              )}
                            </div>
                          </div>

                          {/* Dates + reason */}
                          <div className="bg-muted/30 rounded-xl p-3 mt-3 border border-border/40">
                            <div className="flex items-center gap-2 text-xs font-medium text-foreground/80 mb-1.5">
                              <Clock className="w-3.5 h-3.5 text-muted-foreground" />
                              <span>{new Date(leave.startDate).toLocaleDateString('en-US', { dateStyle: 'medium' })}</span>
                              <span className="text-muted-foreground">→</span>
                              <span>{new Date(leave.endDate).toLocaleDateString('en-US', { dateStyle: 'medium' })}</span>
                            </div>
                            <p className="text-sm text-muted-foreground leading-relaxed">
                              "{leave.reason}"
                            </p>
                          </div>

                          {/* Expandable remarks */}
                          {(leave.deptAdminRemarks || leave.hrRemarks) && (
                            <button
                              className="flex items-center gap-1.5 mt-3 text-xs font-medium text-primary hover:text-primary/80 transition-colors bg-primary/5 px-2.5 py-1 rounded-full"
                              onClick={() => setExpanded(isExpanded ? null : leave.id)}
                            >
                              {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                              {isExpanded ? 'Hide Review Remarks' : 'View Review Remarks'}
                            </button>
                          )}

                          {isExpanded && (
                            <div className="mt-3 space-y-3 text-sm bg-muted/20 p-4 rounded-xl border border-border/40">
                              {leave.deptAdminRemarks && (
                                <div className="space-y-1">
                                  <div className="flex items-center gap-2">
                                    <span className="font-semibold text-foreground/80 text-xs uppercase tracking-wider">Dept Manager</span>
                                    {leave.deptApprover && (
                                      <span className="text-xs text-muted-foreground">— {leave.deptApprover.name}</span>
                                    )}
                                  </div>
                                  <p className="text-muted-foreground text-sm bg-background/50 p-2 rounded-lg border border-border/30">{leave.deptAdminRemarks}</p>
                                </div>
                              )}
                              {leave.hrRemarks && (
                                <div className="space-y-1">
                                  <div className="flex items-center gap-2">
                                    <span className="font-semibold text-foreground/80 text-xs uppercase tracking-wider">HR Admin</span>
                                    {leave.hrApprover && (
                                      <span className="text-xs text-muted-foreground">— {leave.hrApprover.name}</span>
                                    )}
                                  </div>
                                  <p className="text-muted-foreground text-sm bg-background/50 p-2 rounded-lg border border-border/30">{leave.hrRemarks}</p>
                                </div>
                              )}
                            </div>
                          )}
                        </div>

                        {/* Action buttons & Workflow */}
                        <div className="flex flex-col sm:items-end justify-between gap-6 shrink-0 w-full sm:w-auto">
                          
                          <div className="flex sm:flex-col gap-2 w-full sm:w-auto md:opacity-0 md:group-hover:opacity-100 transition-opacity duration-300">
                            {canDeptAct && (
                              <>
                                <Button size="sm" className="rounded-xl shadow-sm h-9 bg-green-600 hover:bg-green-700 text-white w-full sm:w-auto" onClick={() => openAction(leave, 'dept', 'approve')}>
                                  <CheckCircle className="w-4 h-4 mr-1.5" /> Approve
                                </Button>
                                <Button size="sm" variant="outline" className="rounded-xl border-red-200 shadow-sm h-9 text-red-600 hover:bg-red-50 hover:text-red-700 w-full sm:w-auto" onClick={() => openAction(leave, 'dept', 'reject')}>
                                  <XCircle className="w-4 h-4 mr-1.5" /> Reject
                                </Button>
                              </>
                            )}
                            {canHRAct && (
                              <>
                                <Button size="sm" className="rounded-xl shadow-sm h-9 bg-green-600 hover:bg-green-700 text-white w-full sm:w-auto" onClick={() => openAction(leave, 'hr', 'approve')}>
                                  <CheckCircle className="w-4 h-4 mr-1.5" /> Final Approve
                                </Button>
                                <Button size="sm" variant="outline" className="rounded-xl border-red-200 shadow-sm h-9 text-red-600 hover:bg-red-50 hover:text-red-700 w-full sm:w-auto" onClick={() => openAction(leave, 'hr', 'reject')}>
                                  <XCircle className="w-4 h-4 mr-1.5" /> Reject
                                </Button>
                              </>
                            )}
                            {isOwner && leave.status === 'pending' && (
                              <Button size="sm" variant="ghost" className="rounded-xl h-9 text-red-500 hover:text-red-600 hover:bg-red-50 w-full sm:w-auto" onClick={() => { setDeleteLeave(leave); setDeleteOpen(true); }}>
                                <Trash2 className="w-4 h-4 mr-1.5" /> Withdraw Request
                              </Button>
                            )}
                          </div>
                          
                          {/* Workflow progress bar */}
                          <div className="flex items-center gap-2 text-[10px] text-muted-foreground w-full sm:w-auto justify-center sm:justify-end">
                            <StepDot active={true} done={true} label="Submitted" />
                            <div className={cn('w-8 sm:w-6 h-[2px] rounded-full', leave.status !== 'pending' ? 'bg-primary' : 'bg-muted')} />
                            <StepDot
                              active={leave.status !== 'pending'}
                              done={['dept_approved', 'approved'].includes(leave.status)}
                              rejected={leave.status === 'rejected' && !!leave.deptAdminRemarks && !leave.hrRemarks}
                              label="Dept Manager"
                            />
                            <div className={cn('w-8 sm:w-6 h-[2px] rounded-full', leave.status === 'approved' ? 'bg-primary' : 'bg-muted')} />
                            <StepDot
                              active={leave.status === 'approved' || (leave.status === 'rejected' && !!leave.hrRemarks)}
                              done={leave.status === 'approved'}
                              rejected={leave.status === 'rejected' && !!leave.hrRemarks}
                              label="HR Admin"
                            />
                          </div>

                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Create Leave Dialog */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="max-w-md border-0 shadow-2xl rounded-3xl overflow-hidden p-0">
          <div className="bg-primary/5 p-6 border-b border-primary/10 flex items-center gap-3">
            <div className="p-2.5 bg-primary/10 rounded-2xl text-primary">
              <CalendarPlus className="w-5 h-5" />
            </div>
            <div>
              <DialogTitle className="text-xl">Submit Leave Request</DialogTitle>
              <p className="text-sm text-muted-foreground mt-0.5">Fill out the details below to request time off.</p>
            </div>
          </div>
          
          <form onSubmit={handleCreate} className="p-6 space-y-5">
            <div className="space-y-2">
              <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Leave Type</Label>
              <Select value={form.type} onValueChange={v => setForm(f => ({ ...f, type: v }))}>
                <SelectTrigger className="rounded-xl h-11"><SelectValue /></SelectTrigger>
                <SelectContent className="rounded-xl">
                  <SelectItem value="sick">Sick Leave</SelectItem>
                  <SelectItem value="casual">Casual Leave</SelectItem>
                  <SelectItem value="earned">Earned Leave</SelectItem>
                  <SelectItem value="unpaid">Unpaid Leave</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              <div className="space-y-2">
                <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Start Date</Label>
                <Input type="date" className="rounded-xl h-11" value={form.startDate} onChange={e => setForm(f => ({ ...f, startDate: e.target.value, endDate: f.isHalfDay ? e.target.value : f.endDate }))} required />
              </div>
              <div className="space-y-2">
                <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">End Date</Label>
                <Input type="date" className="rounded-xl h-11" value={form.endDate} onChange={e => setForm(f => ({ ...f, endDate: e.target.value }))} required disabled={form.isHalfDay} />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 bg-muted/30 p-4 rounded-2xl border border-border/40">
              <div className="flex items-center space-x-3">
                <Switch
                  id="isHalfDay"
                  checked={form.isHalfDay}
                  onCheckedChange={(checked) => {
                    setForm(f => ({ 
                      ...f, 
                      isHalfDay: checked, 
                      endDate: checked ? f.startDate : f.endDate 
                    }));
                  }}
                />
                <Label htmlFor="isHalfDay" className="cursor-pointer font-semibold">Half Day Leave?</Label>
              </div>

              {form.isHalfDay && (
                <div className="space-y-2">
                  <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Which Half?</Label>
                  <Select value={form.halfDayType} onValueChange={v => setForm(f => ({ ...f, halfDayType: v }))}>
                    <SelectTrigger className="rounded-xl h-10"><SelectValue /></SelectTrigger>
                    <SelectContent className="rounded-xl">
                      <SelectItem value="first_half">First Half</SelectItem>
                      <SelectItem value="second_half">Second Half</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>

            <div className="space-y-2">
              <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Reason</Label>
              <Textarea 
                className="rounded-xl resize-none"
                value={form.reason} 
                onChange={e => setForm(f => ({ ...f, reason: e.target.value }))} 
                placeholder="Explain the reason for your leave in detail..." 
                rows={3} 
                required 
              />
            </div>
            <div className="pt-2 flex justify-end gap-2">
              <Button type="button" variant="ghost" className="rounded-xl" onClick={() => setCreateOpen(false)}>Cancel</Button>
              <Button type="submit" className="rounded-xl px-6" disabled={submitting}>{submitting ? 'Submitting...' : 'Submit Request'}</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Approve/Reject Action Dialog */}
      <Dialog open={actionDialog} onOpenChange={setActionDialog}>
        <DialogContent className="max-w-md border-0 shadow-2xl rounded-3xl overflow-hidden p-0">
          <div className={cn("p-6 border-b flex items-center gap-3", actionMode === 'approve' ? 'bg-green-500/10 border-green-500/10 text-green-700' : 'bg-red-500/10 border-red-500/10 text-red-700')}>
            <div className={cn("p-2.5 rounded-2xl", actionMode === 'approve' ? 'bg-green-500/20' : 'bg-red-500/20')}>
              <ShieldAlert className="w-5 h-5" />
            </div>
            <div>
              <DialogTitle className="text-xl">
                {actionMode === 'approve' ? 'Approve' : 'Reject'} Request
              </DialogTitle>
              <p className="text-sm opacity-80 mt-0.5">
                ({actionType === 'dept' ? 'Department' : 'HR'} Review)
              </p>
            </div>
          </div>
          
          <div className="p-6 space-y-5">
            {actionLeave && (
              <div className="p-4 rounded-2xl bg-muted/40 border border-border/40 text-sm space-y-2">
                <p className="font-bold text-base flex items-center gap-2">
                  <UserCircle2 className="w-4 h-4 text-muted-foreground" />
                  {actionLeave.user?.name || 'Employee'}
                </p>
                <div className="flex items-center gap-2 flex-wrap text-xs font-medium">
                  <Badge variant="outline" className="capitalize bg-background rounded-full px-2">{actionLeave.type} leave</Badge>
                  <span className="text-muted-foreground">{new Date(actionLeave.startDate).toLocaleDateString()} → {new Date(actionLeave.endDate).toLocaleDateString()}</span>
                </div>
                <p className="text-muted-foreground text-sm italic mt-2">"{actionLeave.reason}"</p>
              </div>
            )}
            <div className="space-y-2">
              <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                {actionMode === 'reject' ? 'Rejection Reason' : 'Remarks'}{' '}
                {actionMode === 'reject' && <span className="text-destructive">*</span>}
              </Label>
              <Textarea
                className="rounded-xl resize-none focus-visible:ring-1"
                value={remarks}
                onChange={e => setRemarks(e.target.value)}
                placeholder={actionMode === 'reject' ? 'Explain why this leave is being rejected...' : 'Optional review remarks...'}
                rows={3}
              />
            </div>
            <div className="pt-2 flex justify-end gap-2">
              <Button variant="ghost" className="rounded-xl" onClick={() => setActionDialog(false)}>Cancel</Button>
              <Button
                onClick={handleAction}
                disabled={actionSubmitting}
                className={cn("rounded-xl px-6", actionMode === 'approve' ? 'bg-green-600 hover:bg-green-700 text-white' : 'bg-red-600 hover:bg-red-700 text-white')}
              >
                {actionSubmitting ? 'Processing...' : actionMode === 'approve' ? 'Confirm Approval' : 'Confirm Rejection'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Dialog */}
      <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <DialogContent className="max-w-sm border-0 shadow-2xl rounded-3xl overflow-hidden p-0">
          <div className="bg-red-500/10 p-6 border-b border-red-500/10 flex items-center gap-3">
            <div className="p-2.5 bg-red-500/20 rounded-2xl text-red-600">
              <Trash2 className="w-5 h-5" />
            </div>
            <div>
              <DialogTitle className="text-xl text-red-600">Withdraw Request</DialogTitle>
            </div>
          </div>
          <div className="p-6">
            <p className="text-sm text-muted-foreground leading-relaxed mb-6">Are you sure you want to withdraw this leave request? This action cannot be undone.</p>
            <div className="flex justify-end gap-2">
              <Button variant="ghost" className="rounded-xl" onClick={() => setDeleteOpen(false)}>Cancel</Button>
              <Button variant="destructive" className="rounded-xl px-6" onClick={handleDelete}>Withdraw</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function StepDot({ active, done, rejected, label }: { active: boolean; done: boolean; rejected?: boolean; label: string }) {
  return (
    <div className="flex flex-col items-center gap-1.5">
      <div className={cn(
        'w-6 h-6 rounded-full flex items-center justify-center transition-all duration-300',
        done ? 'bg-green-500 text-white shadow-md shadow-green-500/30' :
        rejected ? 'bg-red-500 text-white shadow-md shadow-red-500/30' :
        active ? 'bg-primary text-white shadow-md shadow-primary/30 ring-4 ring-primary/20' :
        'bg-muted border border-border text-muted-foreground'
      )}>
        {done && <CheckCircle className="w-3.5 h-3.5" />}
        {rejected && <XCircle className="w-3.5 h-3.5" />}
        {active && !done && !rejected && <div className="w-2 h-2 rounded-full bg-white animate-pulse" />}
        {!active && !done && !rejected && <div className="w-1.5 h-1.5 rounded-full bg-muted-foreground/30" />}
      </div>
      <span className={cn(
        "text-[10px] font-bold whitespace-nowrap transition-colors tracking-wide", 
        done ? "text-green-600 dark:text-green-500" :
        rejected ? "text-red-600 dark:text-red-500" :
        active ? "text-primary" : 
        "text-muted-foreground"
      )}>
        {label}
      </span>
    </div>
  );
}
