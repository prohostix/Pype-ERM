import { useState, useEffect } from 'react';
import { CheckCircle2, AlertCircle, DollarSign, Landmark } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import api from '@/lib/api';
import { toast } from 'sonner';

interface PaymentRecord {
  id: string;
  amountPaid: number;
  datePaid: string;
  status: string;
  notes: string;
}

interface StudentWithPayments {
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
    };
    feeStructures: Array<{
      id: string;
      universityFee: number;
      commissionRate: number;
      yearlyFees: any;
      billingCycle: string;
    }>;
  };
  universityPayments: PaymentRecord[];
}

export function UniversityPaymentsPanel() {
  const [students, setStudents] = useState<StudentWithPayments[]>([]);
  const [loading, setLoading] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState<StudentWithPayments | null>(null);
  const [formData, setFormData] = useState({
    amountPaid: '',
    notes: '',
    status: 'received'
  });

  useEffect(() => {
    fetchCommissions();
  }, []);

  const fetchCommissions = async () => {
    setLoading(true);
    try {
      const res = await api.get('/finance/university-payments');
      setStudents(res.data.data || []);
    } catch (err) {
      console.error('Failed to fetch university commissions:', err);
      toast.error('Failed to load payments');
    } finally {
      setLoading(false);
    }
  };

  const handleRecordClick = (student: StudentWithPayments) => {
    setSelectedStudent(student);
    setFormData({
      amountPaid: '',
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
      amountPaid: Number(formData.amountPaid),
      notes: formData.notes,
      status: formData.status
    };

    try {
      await api.post('/finance/university-payments', payload);
      toast.success('University payment recorded successfully');
      setDialogOpen(false);
      fetchCommissions();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to record payment');
    }
  };

  // Helper calculation functions
  const calculatePaymentData = (student: StudentWithPayments) => {
    const feeStructure = student.program?.feeStructures?.[0];
    let totalUniversityFee = 0;

    if (feeStructure) {
      if (feeStructure.billingCycle === 'per_year' && Array.isArray(feeStructure.yearlyFees) && feeStructure.yearlyFees.length > 0) {
        feeStructure.yearlyFees.forEach((yf: any) => {
          const uFee = Number(yf.universityFee || 0);
          totalUniversityFee += uFee;
          
        });
      } else {
        totalUniversityFee = feeStructure.universityFee || 0;
      }
    }

    const received = student.universityPayments.reduce((sum, c) => sum + (c.amountPaid || 0), 0);
    const balance = Math.max(0, totalUniversityFee - received);
    
    let statusLabel = 'Unpaid';
    let statusColor = 'bg-rose-500/10 text-rose-500 border-rose-500/20';

    if (received >= totalUniversityFee && totalUniversityFee > 0) {
      statusLabel = 'Fully Paid';
      statusColor = 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20';
    } else if (received > 0) {
      statusLabel = 'Partially Paid';
      statusColor = 'bg-amber-500/10 text-amber-500 border-amber-500/20';
    }

    return {
      totalUniversityFee,
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
      const { totalUniversityFee, received } = calculatePaymentData(s);
      totalExpected += totalUniversityFee;
      totalReceived += received;
    });
    return {
      expected: totalExpected,
      received: totalReceived,
      pending: Math.max(0, totalExpected - totalReceived)
    };
  };

  const stats = getOverallStats();

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold">University Payments Management</h2>
        <p className="text-muted-foreground">Track and log payments made to universities against student admissions</p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="border-none shadow-sm bg-card/60 backdrop-blur">
          <CardContent className="p-5 flex items-center justify-between">
            <div>
              <p className="text-xs text-muted-foreground uppercase font-semibold">Total Expected Payment</p>
              <p className="text-2xl font-bold mt-1">₹{stats.expected.toLocaleString('en-IN')}</p>
            </div>
            <div className="p-3 bg-primary/10 rounded-full text-primary">
              <Landmark className="w-6 h-6" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-none shadow-sm bg-card/60 backdrop-blur">
          <CardContent className="p-5 flex items-center justify-between">
            <div>
              <p className="text-xs text-muted-foreground uppercase font-semibold">Total Amount Paid</p>
              <p className="text-2xl font-bold mt-1 text-emerald-500">₹{stats.received.toLocaleString('en-IN')}</p>
            </div>
            <div className="p-3 bg-emerald-500/10 rounded-full text-emerald-500">
              <CheckCircle2 className="w-6 h-6" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-none shadow-sm bg-card/60 backdrop-blur">
          <CardContent className="p-5 flex items-center justify-between">
            <div>
              <p className="text-xs text-muted-foreground uppercase font-semibold">Total Outstanding Balance</p>
              <p className="text-2xl font-bold mt-1 text-amber-500">₹{stats.pending.toLocaleString('en-IN')}</p>
            </div>
            <div className="p-3 bg-amber-500/10 rounded-full text-amber-500">
              <AlertCircle className="w-6 h-6" />
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>University Fee Ledger</CardTitle>
          <CardDescription>View expected and recorded university fee payments for each student</CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8">Loading...</div>
          ) : students.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">No student admissions found</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm border-collapse">
                <thead>
                  <tr className="border-b border-border bg-muted/30">
                    <th className="p-3 font-semibold text-muted-foreground">Student</th>
                    <th className="p-3 font-semibold text-muted-foreground">University &amp; Program</th>
                    <th className="p-3 font-semibold text-muted-foreground text-right">University Fee</th>
                    <th className="p-3 font-semibold text-muted-foreground text-right">Paid</th>
                    <th className="p-3 font-semibold text-muted-foreground text-right">Balance</th>
                    <th className="p-3 font-semibold text-muted-foreground">Status</th>
                    <th className="p-3 font-semibold text-muted-foreground text-center">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {students
                    .filter((student) => {
                      const { totalUniversityFee } = calculatePaymentData(student);
                      return totalUniversityFee > 0;
                    })
                    .map((student) => {
                      const {
                      totalUniversityFee,
                      received,
                      balance,
                      statusLabel,
                      statusColor
                    } = calculatePaymentData(student);

                    return (
                      <tr key={student.id} className="border-b border-border hover:bg-muted/10 transition-colors">
                        <td className="p-3 font-medium">
                          <div>
                            <p className="font-semibold text-foreground">{student.name}</p>
                            <p className="text-[10px] text-muted-foreground">{student.email}</p>
                          </div>
                        </td>
                        <td className="p-3">
                          <div>
                            <p className="font-semibold text-foreground">{student.program?.name || 'N/A'}</p>
                            <p className="text-[10px] text-muted-foreground">{student.program?.university?.name || 'N/A'}</p>
                          </div>
                        </td>
                        <td className="p-3 text-right">₹{totalUniversityFee.toLocaleString('en-IN')}</td>
                        <td className="p-3 text-right text-emerald-500 font-medium">₹{received.toLocaleString('en-IN')}</td>
                        <td className="p-3 text-right text-amber-500 font-semibold">₹{balance.toLocaleString('en-IN')}</td>
                        <td className="p-3">
                          <Badge variant="outline" className={statusColor}>{statusLabel}</Badge>
                        </td>
                        <td className="p-3 text-center">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleRecordClick(student)}
                            disabled={balance === 0 && totalUniversityFee > 0}
                          >
                            <DollarSign className="w-3.5 h-3.5 mr-1" /> Log Payout
                          </Button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Record Commission Payment Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Log Payment Made</DialogTitle>
          </DialogHeader>
          {selectedStudent && (() => {
            const { totalUniversityFee, received, balance } = calculatePaymentData(selectedStudent);
            return (
              <form onSubmit={handleSubmit} className="space-y-4 pt-2">
                <div className="p-3 rounded-lg bg-muted/40 space-y-1">
                  <p className="text-xs text-muted-foreground">Expected Payment: <span className="font-bold text-foreground">₹{totalUniversityFee.toLocaleString('en-IN')}</span></p>
                  <p className="text-xs text-muted-foreground">Already Paid: <span className="font-bold text-emerald-500">₹{received.toLocaleString('en-IN')}</span></p>
                  <p className="text-xs text-muted-foreground">Remaining Balance: <span className="font-bold text-amber-500">₹{balance.toLocaleString('en-IN')}</span></p>
                </div>

                <div className="space-y-1">
                  <Label>Amount Paid (₹)</Label>
                  <Input
                    type="number"
                    min="1"
                    max={balance}
                    placeholder="Enter amount paid"
                    value={formData.amountPaid}
                    onChange={(e) => setFormData({ ...formData, amountPaid: e.target.value })}
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
                  <Label>Payment Status</Label>
                  <select
                    className="w-full border border-border rounded-lg px-3 py-2 text-sm bg-background"
                    value={formData.status}
                    onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                  >
                    <option value="received">Paid / Cleared</option>
                    <option value="pending">Pending Clearing</option>
                  </select>
                </div>

                <div className="flex gap-2 border-t pt-4">
                  <Button type="submit" className="flex-1">Submit Payment</Button>
                  <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
                </div>
              </form>
            );
          })()}
        </DialogContent>
      </Dialog>
    </div>
  );
}
