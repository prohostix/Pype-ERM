import React, { useState, useEffect } from 'react';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { AlertTriangle, CheckCircle2, ChevronDown, Download, IndianRupee, Plus, Search, Users, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import api from '@/lib/api';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';

import { CS, numLocale } from '@/lib/currency';
import { ListPagination } from '@/components/ui/list-pagination';
export function StudentPaymentsLogPanel() {
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [universityFilter, setUniversityFilter] = useState('all');
  const [programFilter, setProgramFilter] = useState('all');
  const [branchFilter, setBranchFilter] = useState('all');
  const [sortOption, setSortOption] = useState('recent');
  const [expandedRows, setExpandedRows] = useState<Record<string, boolean>>({});
  const [statusTab, setStatusTab] = useState<'all' | 'pending' | 'completed' | 'overdue'>('all');
  const [page, setPage] = useState(1);

  const [paymentDialogOpen, setPaymentDialogOpen] = useState(false);
  const [extraFeeDialogOpen, setExtraFeeDialogOpen] = useState(false);
  const [selectedStudentId, setSelectedStudentId] = useState('');
  const [selectedScheduleId, setSelectedScheduleId] = useState<string | null>(null);
  const [formData, setFormData] = useState({ amount: '', method: 'Bank Transfer', referenceNo: '', date: new Date().toISOString().split('T')[0], notes: '' });
  const [extraFeeData, setExtraFeeData] = useState({ title: '', amount: '', dueDate: new Date().toISOString().split('T')[0], remarks: '' });

  useEffect(() => {
    fetchLogs();
  }, []);

  const fetchLogs = async () => {
    setLoading(true);
    try {
      const response = await api.get('/finance/student-payments-log');
      if (response.data.success) {
        setLogs(response.data.data || []);
      }
    } catch (error) {
      console.error('Failed to fetch student payments log:', error);
      toast.error('Failed to load student payments log');
    } finally {
      setLoading(false);
    }
  };

  const handleRecordPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.post('/finance/payments', {
        ...formData,
        studentId: selectedStudentId,
        ...(selectedScheduleId ? { scheduleId: selectedScheduleId } : {})
      });
      setPaymentDialogOpen(false);
      setFormData({ amount: '', method: 'Bank Transfer', referenceNo: '', date: new Date().toISOString().split('T')[0], notes: '' });
      fetchLogs();
      toast.success('Payment recorded successfully');
    } catch (error: any) {
      console.error('Failed to record payment:', error);
      toast.error(error.response?.data?.message || 'Failed to record payment');
    }
  };

  const handleAddExtraFee = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.post('/finance/student-payments-log/extra-fee', {
        ...extraFeeData,
        studentId: selectedStudentId
      });
      setExtraFeeDialogOpen(false);
      setExtraFeeData({ title: '', amount: '', dueDate: new Date().toISOString().split('T')[0], remarks: '' });
      fetchLogs();
      toast.success('Extra fee added successfully');
    } catch (error: any) {
      console.error('Failed to add extra fee:', error);
      toast.error(error.response?.data?.message || 'Failed to add extra fee');
    }
  };

  const toggleRow = (studentId: string) => {
    setExpandedRows((prev) => ({
      ...prev,
      [studentId]: !prev[studentId],
    }));
  };

  const universities = Array.from(new Set(logs.map(l => l.universityName).filter(Boolean)));
  const programs = Array.from(new Set(logs.map(l => l.programName).filter(Boolean)));
  const branches = Array.from(new Set(logs.map(l => l.branchName).filter(Boolean)));

  const isOverdue = (log: any) =>
    log.status !== 'Completed' && (log.breakdown || []).some((b: any) => b.balance > 0 && b.dueDate && new Date(b.dueDate).getTime() < Date.now());

  // everything except the status tab, so the tab counts stay meaningful
  const baseFiltered = logs.filter((log: any) => {
    const q = searchQuery.toLowerCase();
    const matchesSearch = !q || log.name?.toLowerCase().includes(q) || log.enrollmentNo?.toLowerCase().includes(q) || log.programName?.toLowerCase().includes(q);
    return matchesSearch
      && (universityFilter === 'all' || log.universityName === universityFilter)
      && (programFilter === 'all' || log.programName === programFilter)
      && (branchFilter === 'all' || log.branchName === branchFilter);
  });

  const tabCounts = {
    all: baseFiltered.length,
    pending: baseFiltered.filter((l) => l.status !== 'Completed').length,
    completed: baseFiltered.filter((l) => l.status === 'Completed').length,
    overdue: baseFiltered.filter(isOverdue).length,
  };

  const filteredLogs = baseFiltered
    .filter((l) => statusTab === 'all' || (statusTab === 'completed' ? l.status === 'Completed' : statusTab === 'pending' ? l.status !== 'Completed' : isOverdue(l)))
    .sort((a, b) => {
      switch (sortOption) {
        case 'name-asc': return (a.name || '').localeCompare(b.name || '');
        case 'name-desc': return (b.name || '').localeCompare(a.name || '');
        case 'balance-desc': return (b.balance || 0) - (a.balance || 0);
        case 'balance-asc': return (a.balance || 0) - (b.balance || 0);
        case 'recent': default: return 0;
      }
    });

  const totals = filteredLogs.reduce((t, l) => ({
    fee: t.fee + (l.totalFee || 0), paid: t.paid + (l.totalPaid || 0), balance: t.balance + (l.balance || 0),
    owing: t.owing + ((l.balance || 0) > 0 ? 1 : 0),
  }), { fee: 0, paid: 0, balance: 0, owing: 0 });
  const collectedPct = totals.fee > 0 ? Math.min(100, Math.round((totals.paid / totals.fee) * 100)) : 0;

  const [PAGE_SIZE, setPageSize] = useState(10);
  const pageCount = Math.max(1, Math.ceil(filteredLogs.length / PAGE_SIZE));
  const currentPage = Math.min(page, pageCount);
  const pageRows = filteredLogs.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);
  useEffect(() => { setPage(1); }, [searchQuery, universityFilter, programFilter, branchFilter, sortOption, statusTab]);

  const hasFilters = !!searchQuery || universityFilter !== 'all' || programFilter !== 'all' || branchFilter !== 'all' || statusTab !== 'all';
  const clearFilters = () => { setSearchQuery(''); setUniversityFilter('all'); setProgramFilter('all'); setBranchFilter('all'); setStatusTab('all'); };

  const inr = (n: number) => `${CS()}${(n || 0).toLocaleString(numLocale())}`;
  const initials = (name: string) => (name || '?').split(/\s+/).slice(0, 2).map((w) => w[0]).join('').toUpperCase();
  const pctOf = (paid: number, total: number) => (total > 0 ? Math.min(100, Math.round((paid / total) * 100)) : 0);

  const exportCsv = () => {
    const esc = (v: any) => `"${String(v ?? '').replace(/"/g, '""')}"`;
    const header = ['Student', 'Enrollment No', 'University', 'Program', 'Branch', 'Total Fee', 'Received', 'Balance', 'Status'];
    const lines = filteredLogs.map((l) => [l.name, l.enrollmentNo, l.universityName, l.programName, l.branchName, l.totalFee, l.totalPaid, l.balance, l.status].map(esc).join(','));
    const blob = new Blob([[header.map(esc).join(','), ...lines].join('\n')], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `student-payments-${new Date().toISOString().slice(0, 10)}.csv`; a.click();
    URL.revokeObjectURL(url);
  };

  const tabs: { id: typeof statusTab; label: string }[] = [
    { id: 'all', label: 'All' }, { id: 'pending', label: 'Pending' }, { id: 'overdue', label: 'Overdue' }, { id: 'completed', label: 'Completed' },
  ];

  return (
    <div className="space-y-6 wizard-form animate-in fade-in duration-500">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
        <div>
          <h2 className="text-2xl sm:text-3xl font-semibold tracking-tight">Student Payments Log</h2>
          <p className="text-muted-foreground text-sm mt-1.5">Every student's total fee, what has been received and what is still due.</p>
        </div>
        <Button variant="outline" onClick={exportCsv} disabled={filteredLogs.length === 0} className="h-11 px-5 rounded-full bg-white border-slate-200 hover:bg-[#eaf6e6]"><Download className="w-4 h-4 mr-1.5" />Export CSV</Button>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <SummaryTile icon={IndianRupee} label="Total fee" value={inr(totals.fee)} sub={`${filteredLogs.length} student${filteredLogs.length === 1 ? '' : 's'}`} tone="slate" />
        <SummaryTile icon={CheckCircle2} label="Received" value={inr(totals.paid)} sub={`${collectedPct}% collected`} tone="emerald" />
        <SummaryTile icon={AlertTriangle} label="Balance due" value={inr(totals.balance)} sub={`${totals.owing} student${totals.owing === 1 ? '' : 's'} owe fees`} tone="amber" />
        <div className="rounded-3xl bg-white border border-slate-100 p-5 flex flex-col justify-center">
          <p className="text-xs font-medium text-slate-500">Collection progress</p>
          <p className="text-3xl font-semibold tracking-tight mt-1">{collectedPct}%</p>
          <div className="h-2.5 rounded-full bg-[#eaf6e6] mt-3 overflow-hidden"><div className="h-full rounded-full bg-[#54b947] transition-all" style={{ width: `${collectedPct}%` }} /></div>
        </div>
      </div>

      {/* Toolbar */}
      <div className="rounded-3xl bg-white border border-slate-100 p-4 space-y-4">
        <div className="flex flex-col lg:flex-row gap-3 lg:items-center">
          <div className="relative flex-1">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <Input placeholder="Search by name, enrollment no. or program" className="pl-11 h-11 rounded-full bg-[#f4f6f3] border-transparent" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} />
          </div>
          <div className="flex flex-wrap gap-2">
            <FilterSelect value={universityFilter} onChange={setUniversityFilter} all="All universities" items={universities as string[]} />
            <FilterSelect value={programFilter} onChange={setProgramFilter} all="All programs" items={programs as string[]} />
            <FilterSelect value={branchFilter} onChange={setBranchFilter} all="All branches" items={branches as string[]} />
            <Select value={sortOption} onValueChange={setSortOption}>
              <SelectTrigger className="w-[170px] h-11 rounded-full px-4 text-xs font-semibold bg-white border-slate-200"><SelectValue placeholder="Sort by" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="recent">Recently added</SelectItem>
                <SelectItem value="name-asc">Name (A-Z)</SelectItem>
                <SelectItem value="name-desc">Name (Z-A)</SelectItem>
                <SelectItem value="balance-desc">Balance (high to low)</SelectItem>
                <SelectItem value="balance-asc">Balance (low to high)</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2 pt-1">
          {tabs.map((t) => (
            <button key={t.id} onClick={() => setStatusTab(t.id)}
              className={cn('inline-flex items-center gap-2 rounded-full pl-4 pr-2 py-1.5 text-sm font-semibold border transition',
                statusTab === t.id ? 'bg-[#8ae47e] text-[#0b1d14] border-[#8ae47e]' : 'bg-white text-slate-600 border-slate-200 hover:bg-[#eaf6e6] hover:border-[#cfe9c9]')}>
              {t.label}
              <span className={cn('text-xs rounded-full min-w-6 h-6 px-2 flex items-center justify-center tabular-nums', statusTab === t.id ? 'bg-white/70' : 'bg-slate-100')}>{tabCounts[t.id]}</span>
            </button>
          ))}
          {hasFilters && (
            <button onClick={clearFilters} className="ml-auto text-xs text-muted-foreground hover:text-foreground inline-flex items-center gap-1"><X className="w-3.5 h-3.5" />Clear filters</button>
          )}
        </div>
      </div>

      {/* List */}
      {loading ? (
        <div className="space-y-3">{[0, 1, 2, 3].map((i) => <div key={i} className="h-24 rounded-3xl bg-slate-100 animate-pulse" />)}</div>
      ) : filteredLogs.length === 0 ? (
        <div className="rounded-3xl bg-white border border-slate-100 p-12 text-center">
          <div className="w-14 h-14 rounded-2xl bg-[#eaf6e6] text-[#256c1d] flex items-center justify-center mx-auto"><Users className="w-6 h-6" /></div>
          <p className="font-semibold mt-3">No payment records found</p>
          <p className="text-sm text-muted-foreground mt-1">{hasFilters ? 'Try changing or clearing the filters.' : 'Records appear here once students have fees.'}</p>
          {hasFilters && <Button variant="outline" className="mt-4 h-10 rounded-full px-5" onClick={clearFilters}>Clear filters</Button>}
        </div>
      ) : (
        <div className="space-y-3">
          {pageRows.map((log: any) => {
            const open = !!expandedRows[log.studentId];
            const pct = pctOf(log.totalPaid, log.totalFee);
            const done = log.status === 'Completed';
            const overdue = isOverdue(log);
            return (
              <div key={log.studentId} className={cn('rounded-3xl bg-white border border-slate-100 transition overflow-hidden hover:border-[#cfe9c9]', open && 'border-[#8ae47e]')}>
                <button className="w-full text-left p-4 sm:p-5 grid grid-cols-[auto_1fr_auto] lg:grid-cols-[minmax(220px,1.3fr)_minmax(160px,1fr)_minmax(180px,1.2fr)_auto_auto] gap-x-4 gap-y-3 items-center" onClick={() => toggleRow(log.studentId)}>
                  {/* Student */}
                  <div className="flex items-center gap-3 min-w-0 col-span-2 lg:col-span-1">
                    <div className="w-11 h-11 rounded-2xl bg-[#eaf6e6] text-[#256c1d] font-semibold text-sm flex items-center justify-center shrink-0">{initials(log.name)}</div>
                    <div className="min-w-0">
                      <p className="font-semibold truncate">{log.name}</p>
                      <p className="text-xs text-muted-foreground truncate">{log.enrollmentNo || 'No enrollment no.'}</p>
                    </div>
                  </div>
                  {/* Status (mobile position) */}
                  <div className="lg:hidden justify-self-end"><StatusChip done={done} overdue={overdue} /></div>
                  {/* Program */}
                  <div className="min-w-0 col-span-3 lg:col-span-1 text-sm">
                    <p className="truncate font-medium">{log.programName || '-'}</p>
                    <p className="text-xs text-muted-foreground truncate">{[log.universityName, log.branchName].filter(Boolean).join(' · ') || '-'}</p>
                    {log.paymentPlan && log.paymentPlan !== 'N/A' && <span className="inline-block text-[10px] bg-[#f4f6f3] text-slate-600 font-semibold rounded-full px-2.5 py-0.5 mt-1 capitalize">{String(log.paymentPlan).replace('_', ' ')} plan</span>}
                  </div>
                  {/* Money */}
                  <div className="col-span-3 lg:col-span-1">
                    <div className="flex items-baseline justify-between text-sm">
                      <span className="font-semibold text-[#256c1d]">{inr(log.totalPaid)}</span>
                      <span className="text-xs text-muted-foreground">of {inr(log.totalFee)}</span>
                    </div>
                    <div className="h-2 rounded-full bg-[#f1f2ef] mt-1.5 overflow-hidden"><div className={cn('h-full rounded-full transition-all', done ? 'bg-[#54b947]' : overdue ? 'bg-red-500' : 'bg-amber-500')} style={{ width: `${pct}%` }} /></div>
                    {log.discountAmount > 0 && <p className="text-[10px] text-green-600 mt-1" title={log.discountReason}>{CS()}{log.discountAmount.toLocaleString(numLocale())} discount applied</p>}
                  </div>
                  {/* Balance */}
                  <div className="hidden lg:block text-right min-w-[96px]">
                    <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">Balance</p>
                    <p className={cn('text-lg font-semibold', (log.balance || 0) > 0 ? 'text-amber-600' : 'text-[#256c1d]')}>{inr(log.balance)}</p>
                  </div>
                  <div className="hidden lg:flex items-center gap-2 justify-end">
                    <StatusChip done={done} overdue={overdue} />
                    <ChevronDown className={cn('w-4 h-4 text-muted-foreground transition-transform', open && 'rotate-180')} />
                  </div>
                  {/* Balance on mobile */}
                  <div className="lg:hidden col-span-3 flex items-center justify-between text-sm border-t pt-2">
                    <span className="text-muted-foreground">Balance</span>
                    <span className={cn('font-bold', (log.balance || 0) > 0 ? 'text-amber-600' : 'text-[#256c1d]')}>{inr(log.balance)}</span>
                  </div>
                </button>

                {open && (
                  <div className="border-t border-slate-100 bg-[#f4f6f3] p-4 sm:p-5">
                    <div className="flex flex-wrap justify-between items-center gap-2 mb-4">
                      <h4 className="font-semibold text-sm flex items-center gap-2">Fee breakdown</h4>
                      <Button variant="outline" size="sm" className="h-9 rounded-full px-4 bg-white border-[#cfe9c9] text-[#256c1d] hover:bg-[#eaf6e6]" onClick={() => { setSelectedStudentId(log.studentId); setExtraFeeDialogOpen(true); }}>
                        <Plus className="w-4 h-4 mr-1" />Add extra fee
                      </Button>
                    </div>
                    {log.breakdown && log.breakdown.length > 0 ? (
                      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
                        {log.breakdown.map((b: any, i: number) => {
                          const bp = pctOf(b.paid, b.totalFee);
                          const late = b.balance > 0 && b.dueDate && new Date(b.dueDate).getTime() < Date.now();
                          return (
                            <div key={i} className="bg-white rounded-2xl p-4 flex flex-col gap-2">
                              <div className="flex justify-between items-center gap-2">
                                <span className="text-sm font-semibold truncate">{b.year}</span>
                                {b.dueDate && (
                                  <span className={cn('text-[10px] px-2 py-0.5 rounded-full shrink-0', late ? 'bg-red-100 text-red-700' : 'bg-[#f4f6f3] text-slate-600')}>
                                    {late ? 'Overdue · ' : 'Due '}{new Date(b.dueDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                                  </span>
                                )}
                              </div>
                              <div className="h-1.5 rounded-full bg-muted overflow-hidden"><div className={cn('h-full rounded-full', b.balance > 0 ? (late ? 'bg-red-500' : 'bg-amber-500') : 'bg-emerald-500')} style={{ width: `${bp}%` }} /></div>
                              <div className="grid grid-cols-3 text-center text-xs pt-1">
                                <div><p className="text-muted-foreground">Total</p><p className="font-semibold text-sm">{inr(b.totalFee)}</p></div>
                                <div><p className="text-muted-foreground">Received</p><p className="font-semibold text-sm text-[#256c1d]">{inr(b.paid)}</p></div>
                                <div><p className="text-muted-foreground">Balance</p><p className="font-semibold text-sm text-amber-600">{inr(b.balance)}</p></div>
                              </div>
                              {b.balance > 0 && (
                                <Button variant="outline" size="sm" className="w-full text-xs h-9 mt-1 rounded-full border-[#cfe9c9] text-[#256c1d] hover:bg-[#eaf6e6]" onClick={() => { setSelectedStudentId(log.studentId); setSelectedScheduleId(b.scheduleId || null); setPaymentDialogOpen(true); }}>
                                  <Plus className="w-3 h-3 mr-1" />Record receipt
                                </Button>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    ) : (
                      <p className="text-sm text-muted-foreground">No fee breakdown is available for this student yet.</p>
                    )}
                  </div>
                )}
              </div>
            );
          })}

          <ListPagination total={filteredLogs.length} page={currentPage} pageSize={PAGE_SIZE} onPageChange={setPage} onPageSizeChange={(n) => { setPageSize(n); setPage(1); }} />
        </div>
      )}

      <Dialog open={paymentDialogOpen} onOpenChange={(open) => { setPaymentDialogOpen(open); if (!open) setFormData({ amount: '', method: 'Bank Transfer', referenceNo: '', date: new Date().toISOString().split('T')[0], notes: '' }); }}>
        <DialogContent className="wizard-form rounded-[2rem] border-0 bg-white p-6 sm:p-8" style={{ fontFamily: "Urbanist, ui-sans-serif, system-ui, sans-serif" }}>
          <DialogHeader>
            <DialogTitle className="text-xl font-semibold tracking-tight">Record Receipt</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleRecordPayment} className="space-y-4">
            <div>
              <Label>Amount ({CS()})</Label>
              <Input type="number" required value={formData.amount} onChange={(e) => setFormData({ ...formData, amount: e.target.value })} />
            </div>
            <div>
              <Label>Payment Method</Label>
              <Select value={formData.method} onValueChange={(v) => setFormData({ ...formData, method: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="Cash">Cash</SelectItem>
                  <SelectItem value="Bank Transfer">Bank Transfer</SelectItem>
                  <SelectItem value="Cheque">Cheque</SelectItem>
                  <SelectItem value="Card">Card</SelectItem>
                  <SelectItem value="UPI">UPI</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Reference No.</Label>
              <Input value={formData.referenceNo} onChange={(e) => setFormData({ ...formData, referenceNo: e.target.value })} />
            </div>
            <div>
              <Label>Date</Label>
              <Input type="date" required value={formData.date} onChange={(e) => setFormData({ ...formData, date: e.target.value })} />
            </div>
            <div>
              <Label>Notes</Label>
              <Input value={formData.notes} onChange={(e) => setFormData({ ...formData, notes: e.target.value })} />
            </div>
            <div className="flex justify-end gap-2 pt-4 border-t">
              <Button type="button" variant="outline" className="h-11 px-6 rounded-full" onClick={() => setPaymentDialogOpen(false)}>Cancel</Button>
              <Button type="submit" className="h-11 px-6 rounded-full bg-[#8ae47e] hover:bg-[#7bd96f] text-[#0b1d14] font-semibold">Save Receipt</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={extraFeeDialogOpen} onOpenChange={(open) => { setExtraFeeDialogOpen(open); if (!open) setExtraFeeData({ title: '', amount: '', dueDate: new Date().toISOString().split('T')[0], remarks: '' }); }}>
        <DialogContent className="wizard-form rounded-[2rem] border-0 bg-white p-6 sm:p-8" style={{ fontFamily: "Urbanist, ui-sans-serif, system-ui, sans-serif" }}>
          <DialogHeader>
            <DialogTitle className="text-xl font-semibold tracking-tight">Add Extra Fee</DialogTitle>
            <DialogDescription>Add a late fee, library fine, or other miscellaneous charge.</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleAddExtraFee} className="space-y-4">
            <div>
              <Label>Fee Title</Label>
              <Input required placeholder="e.g. Late Payment Fee" value={extraFeeData.title} onChange={(e) => setExtraFeeData({ ...extraFeeData, title: e.target.value })} />
            </div>
            <div>
              <Label>Amount ({CS()})</Label>
              <Input type="number" required min="1" value={extraFeeData.amount} onChange={(e) => setExtraFeeData({ ...extraFeeData, amount: e.target.value })} />
            </div>
            <div>
              <Label>Due Date</Label>
              <Input type="date" required value={extraFeeData.dueDate} onChange={(e) => setExtraFeeData({ ...extraFeeData, dueDate: e.target.value })} />
            </div>
            <div>
              <Label>Remarks (Optional)</Label>
              <Input value={extraFeeData.remarks} onChange={(e) => setExtraFeeData({ ...extraFeeData, remarks: e.target.value })} />
            </div>
            <div className="flex justify-end gap-2 pt-4 border-t">
              <Button type="button" variant="outline" className="h-11 px-6 rounded-full" onClick={() => setExtraFeeDialogOpen(false)}>Cancel</Button>
              <Button type="submit" className="h-11 px-6 rounded-full bg-[#8ae47e] hover:bg-[#7bd96f] text-[#0b1d14] font-semibold">Add Fee</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function SummaryTile({ icon: Icon, label, value, sub, tone }: { icon: any; label: string; value: string; sub: string; tone: 'slate' | 'emerald' | 'amber' }) {
  const tones = {
    slate: 'bg-[#f4f6f3] text-slate-600',
    emerald: 'bg-[#eaf6e6] text-[#256c1d]',
    amber: 'bg-amber-50 text-amber-600',
  };
  return (
    <div className="rounded-3xl bg-white border border-slate-100 p-5 flex items-center justify-between gap-3">
      <div className="min-w-0">
        <p className="text-xs font-medium text-slate-500">{label}</p>
        <p className="text-3xl font-semibold tracking-tight leading-tight truncate mt-1">{value}</p>
        <p className="text-[11px] text-muted-foreground truncate mt-0.5">{sub}</p>
      </div>
      <div className={cn('w-11 h-11 rounded-2xl shrink-0 flex items-center justify-center', tones[tone])}><Icon className="w-5 h-5" /></div>
    </div>
  );
}

function StatusChip({ done, overdue }: { done: boolean; overdue: boolean }) {
  if (done) return <Badge className="bg-[#dff3da] text-[#256c1d] hover:bg-[#dff3da] border-none rounded-full px-3">Completed</Badge>;
  if (overdue) return <Badge className="bg-red-100 text-red-700 hover:bg-red-100 border-none rounded-full px-3">Overdue</Badge>;
  return <Badge className="bg-amber-100 text-amber-700 hover:bg-amber-100 border-none rounded-full px-3">Pending</Badge>;
}

function FilterSelect({ value, onChange, all, items }: { value: string; onChange: (v: string) => void; all: string; items: string[] }) {
  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger className="w-[170px] h-11 rounded-full px-4 text-xs font-semibold bg-white border-slate-200"><SelectValue placeholder={all} /></SelectTrigger>
      <SelectContent>
        <SelectItem value="all">{all}</SelectItem>
        {items.map((i) => <SelectItem key={i} value={i}>{i}</SelectItem>)}
      </SelectContent>
    </Select>
  );
}
