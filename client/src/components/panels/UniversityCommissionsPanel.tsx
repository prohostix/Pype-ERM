import { useState, useEffect } from 'react';
import { CheckCircle2, AlertCircle, Landmark } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import api from '@/lib/api';
import { toast } from 'sonner';

import { CS, numLocale } from '@/lib/currency';
import { ListPagination } from '@/components/ui/list-pagination';
interface CommissionRecord {
  id: string;
  amountReceived: number;
  dateReceived: string;
  status: string;
  notes: string;
}

interface StudentWithCommissions {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  status: string;
  createdAt: string;
  program: {
    name: string;
    university: {
      id: string;
      name: string;
      isAcademicPartnerOnly?: boolean;
    };
    feeStructures: Array<{
      id: string;
      universityFee: number;
      commissionRate: number;
      yearlyFees: any;
      billingCycle: string;
    }>;
  };
  commissions: CommissionRecord[];
}

export function UniversityCommissionsPanel() {
  const [students, setStudents] = useState<StudentWithCommissions[]>([]);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState<StudentWithCommissions | null>(null);
  const [formData, setFormData] = useState({
    amountReceived: '',
    notes: '',
    status: 'received'
  });

  useEffect(() => {
    fetchCommissions();
  }, []);

  const fetchCommissions = async () => {
    setLoading(true);
    try {
      const res = await api.get('/finance/commissions');
      setStudents(res.data.data || []);
    } catch (err) {
      console.error('Failed to fetch university commissions:', err);
      toast.error('Failed to load commissions');
    } finally {
      setLoading(false);
    }
  };

  const handleRecordClick = (student: StudentWithCommissions) => {
    setSelectedStudent(student);
    setFormData({
      amountReceived: '',
      notes: '',
      status: 'received'
    });
    setDialogOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedStudent) return;

    const payload = {
      studentId: selectedStudent.id,
      universityId: selectedStudent.program.university.id,
      amountReceived: Number(formData.amountReceived),
      notes: formData.notes,
      status: formData.status
    };

    try {
      await api.post('/finance/commissions', payload);
      toast.success('University commission payment recorded successfully');
      setDialogOpen(false);
      fetchCommissions();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to record commission');
    }
  };

  // Helper calculation functions
  const calculateCommissionData = (student: StudentWithCommissions) => {
    let feeStructure = student.program?.feeStructures?.find(f => f.sessionId === student.sessionId && f.specialisation === student.specialisation);
    if (!feeStructure) feeStructure = student.program?.feeStructures?.find(f => f.sessionId === student.sessionId && !f.specialisation);
    if (!feeStructure) feeStructure = student.program?.feeStructures?.[0];
    let totalUniversityFee = 0;
    let expectedCommission = 0;
    let baseCommissionRate = 0;

    if (feeStructure) {
      if ((feeStructure.billingCycle === 'per_year' || feeStructure.billingCycle === 'per_semester') && Array.isArray(feeStructure.yearlyFees) && feeStructure.yearlyFees.length > 0) {
        feeStructure.yearlyFees.forEach((yf: any) => {
          const uFee = Number(yf.universityFee || 0);
          const cRate = Number(yf.commissionRate || 0);
          totalUniversityFee += uFee;
          expectedCommission += (uFee * cRate) / 100;
        });
        if (feeStructure.yearlyFees.length > 0) {
          baseCommissionRate = Number(feeStructure.yearlyFees[0].commissionRate || 0);
        }
      } else {
        totalUniversityFee = feeStructure.universityFee || 0;
        baseCommissionRate = feeStructure.commissionRate || 0;
        expectedCommission = (totalUniversityFee * baseCommissionRate) / 100;
      }
    }

    const received = student.commissions.reduce((sum, c) => sum + (c.amountReceived || 0), 0);
    const balance = Math.max(0, expectedCommission - received);
    
    let statusLabel = 'Unpaid';
    let statusColor = 'bg-rose-500/10 text-rose-500 border-rose-500/20';

    if (received >= expectedCommission && expectedCommission > 0) {
      statusLabel = 'Fully Received';
      statusColor = 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20';
    } else if (received > 0) {
      statusLabel = 'Partially Received';
      statusColor = 'bg-amber-500/10 text-amber-500 border-amber-500/20';
    }

    return {
      totalUniversityFee,
      expectedCommission,
      baseCommissionRate,
      received,
      balance,
      statusLabel,
      statusColor
    };
  };

  const getOverallStats = () => {
    let totalExpected = 0;
    let totalReceived = 0;
    students.forEach(s => {
      const { expectedCommission, received } = calculateCommissionData(s);
      totalExpected += expectedCommission;
      totalReceived += received;
    });
    return {
      expected: totalExpected,
      received: totalReceived,
      pending: Math.max(0, totalExpected - totalReceived)
    };
  };

  const stats = getOverallStats();

  const ledger = students.filter((student) => calculateCommissionData(student).expectedCommission > 0);
  const currentPage = Math.min(page, Math.max(1, Math.ceil(ledger.length / pageSize)));
  const pagedLedger = ledger.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  return (
    <div className="space-y-6 wizard-form">
      <div>
        <h2 className="text-2xl sm:text-3xl font-semibold tracking-tight">University Commission Management</h2>
        <p className="text-muted-foreground text-sm mt-1.5">Track and log commissions received from universities against student admissions</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {[
          { label: 'Total Expected Commission', value: stats.expected, color: 'text-slate-900', box: 'bg-[#f4f6f3] text-slate-600', Icon: Landmark },
          { label: 'Total Received Commission', value: stats.received, color: 'text-[#256c1d]', box: 'bg-[#eaf6e6] text-[#256c1d]', Icon: CheckCircle2 },
          { label: 'Total Outstanding Balance', value: stats.pending, color: 'text-amber-600', box: 'bg-amber-50 text-amber-600', Icon: AlertCircle },
        ].map(({ label, value, color, box, Icon }) => (
          <div key={label} className="rounded-3xl bg-white border border-slate-100 p-6 flex items-center justify-between gap-3">
            <div className="min-w-0">
              <p className="text-xs font-medium text-slate-500">{label}</p>
              <p className={`text-3xl font-semibold tracking-tight mt-1 truncate ${color}`}>{CS()}{value.toLocaleString(numLocale())}</p>
            </div>
            <div className={`w-11 h-11 rounded-2xl shrink-0 flex items-center justify-center ${box}`}><Icon className="w-5 h-5" /></div>
          </div>
        ))}
      </div>

      <div className="rounded-3xl bg-white border border-slate-100 overflow-hidden">
        <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between gap-3 flex-wrap">
          <div>
            <h3 className="text-lg font-semibold tracking-tight">Admissions &amp; Commissions Ledger</h3>
            <p className="text-sm text-muted-foreground">View expected payouts and recorded payments for each student</p>
          </div>
          {!loading && <span className="rounded-full bg-[#eaf6e6] text-[#256c1d] text-xs font-semibold px-3 py-1">{ledger.length} students</span>}
        </div>
        <div className="p-4 sm:p-5">
          {loading ? (
            <div className="space-y-3">{[1, 2, 3].map(i => <div key={i} className="h-20 bg-slate-100 rounded-2xl animate-pulse" />)}</div>
          ) : students.length === 0 ? (
            <div className="text-center py-14 text-muted-foreground">
              <div className="w-14 h-14 rounded-2xl bg-[#eaf6e6] text-[#256c1d] flex items-center justify-center mx-auto mb-3"><Landmark className="w-6 h-6" /></div>
              <p className="text-sm">No student admissions found</p>
            </div>
          ) : (
            <div className="space-y-3">
              {pagedLedger.map((student) => {
                const { totalUniversityFee, expectedCommission, baseCommissionRate, received, balance, statusLabel, statusColor } = calculateCommissionData(student);
                return (
                  <div key={student.id} className="rounded-2xl bg-[#f4f6f3] hover:bg-[#eef5ec] transition-colors p-4 flex flex-col 2xl:flex-row 2xl:items-center justify-between gap-4">
                    <div className="min-w-0 2xl:w-1/4">
                      <p className="font-semibold text-slate-900 truncate">{student.name}</p>
                      <p className="text-xs text-muted-foreground truncate">{student.email}</p>
                      <div className="flex items-center flex-wrap gap-2 mt-2">
                        <span className="text-sm font-medium text-slate-700">{student.program?.name || 'N/A'}</span>
                        <span className="text-xs text-muted-foreground">{student.program?.university?.name || 'N/A'}</span>
                        {student.program?.university?.isAcademicPartnerOnly && (
                          <Badge variant="outline" className="text-[10px] px-2 rounded-full bg-white text-slate-600 border-slate-200">Academic Partner</Badge>
                        )}
                      </div>
                    </div>
                    <div className="grid grid-cols-2 sm:grid-cols-5 gap-4 text-right 2xl:flex-1">
                      <div><p className="text-[11px] text-slate-500">University Fee</p><p className="font-semibold text-slate-900">{CS()}{totalUniversityFee.toLocaleString(numLocale())}</p></div>
                      <div><p className="text-[11px] text-slate-500">Comm. Rate</p><p className="font-semibold text-slate-900">{baseCommissionRate}%</p></div>
                      <div><p className="text-[11px] text-slate-500">Expected</p><p className="font-semibold text-[#256c1d]">{CS()}{expectedCommission.toLocaleString(numLocale())}</p></div>
                      <div><p className="text-[11px] text-slate-500">Received</p><p className="font-semibold text-[#256c1d]">{CS()}{received.toLocaleString(numLocale())}</p></div>
                      <div><p className="text-[11px] text-slate-500">Balance</p><p className="font-semibold text-amber-600">{CS()}{balance.toLocaleString(numLocale())}</p></div>
                    </div>
                    <div className="flex items-center gap-3 justify-between 2xl:justify-end">
                      <Badge variant="outline" className={`rounded-full px-3 ${statusColor}`}>{statusLabel}</Badge>
                      <Button
                        variant="outline"
                        className="h-10 rounded-full px-5 bg-white border-[#cfe9c9] text-[#256c1d] hover:bg-[#eaf6e6] font-semibold"
                        onClick={() => handleRecordClick(student)}
                        disabled={balance === 0 && expectedCommission > 0}
                      >
                        Log Payout
                      </Button>
                    </div>
                  </div>
                );
              })}
              <ListPagination total={ledger.length} page={currentPage} pageSize={pageSize} onPageChange={setPage} onPageSizeChange={(n) => { setPageSize(n); setPage(1); }} />
            </div>
          )}
        </div>
      </div>

      {/* Record Commission Payment Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="wizard-form max-w-md rounded-[2rem] border-0 bg-white p-6 sm:p-8" style={{ fontFamily: "Urbanist, ui-sans-serif, system-ui, sans-serif" }}>
          <DialogHeader>
            <DialogTitle className="text-xl font-semibold tracking-tight">Log Received Commission</DialogTitle>
          </DialogHeader>
          {selectedStudent && (() => {
            const { expectedCommission, received, balance } = calculateCommissionData(selectedStudent);
            return (
              <form onSubmit={handleSubmit} className="space-y-4 pt-2">
                <div className="p-4 rounded-2xl bg-[#f4f6f3] space-y-1">
                  <p className="text-xs text-muted-foreground">Expected Commission: <span className="font-bold text-foreground">{CS()}{expectedCommission.toLocaleString(numLocale())}</span></p>
                  <p className="text-xs text-muted-foreground">Already Received: <span className="font-semibold text-[#256c1d]">{CS()}{received.toLocaleString(numLocale())}</span></p>
                  <p className="text-xs text-muted-foreground">Remaining Balance: <span className="font-semibold text-amber-600">{CS()}{balance.toLocaleString(numLocale())}</span></p>
                </div>

                <div className="space-y-1">
                  <Label>Amount Received ({CS()})</Label>
                  <Input
                    type="number"
                    min="1"
                    max={balance}
                    placeholder="Enter amount received"
                    value={formData.amountReceived}
                    onChange={(e) => setFormData({ ...formData, amountReceived: e.target.value })}
                    required
                  />
                </div>

                <div className="space-y-1">
                  <Label>Payment Notes</Label>
                  <Input
                    placeholder="e.g. Received via Bank Transfer, Ref# 12345"
                    value={formData.notes}
                    onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  />
                </div>

                <div className="space-y-1">
                  <Label>Payout Status</Label>
                  <select
                    className="w-full h-11 rounded-xl border border-transparent bg-[#f4f6f3] px-3 text-sm outline-none focus:bg-white focus:border-[#54b947] focus:ring-4 focus:ring-[#54b947]/20"
                    value={formData.status}
                    onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                  >
                    <option value="received">Received / Cleared</option>
                    <option value="pending">Pending Clearing</option>
                  </select>
                </div>

                <div className="flex gap-2 border-t border-slate-100 pt-4">
                  <Button type="submit" className="flex-1 h-11 rounded-full bg-[#8ae47e] hover:bg-[#7bd96f] text-[#0b1d14] font-semibold">Submit Payout</Button>
                  <Button type="button" variant="outline" className="h-11 px-6 rounded-full" onClick={() => setDialogOpen(false)}>Cancel</Button>
                </div>
              </form>
            );
          })()}
        </DialogContent>
      </Dialog>
    </div>
  );
}
