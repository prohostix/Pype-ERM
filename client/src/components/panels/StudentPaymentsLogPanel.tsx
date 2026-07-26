import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Search, ChevronDown, ChevronRight, Plus } from 'lucide-react';
import api from '@/lib/api';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';

export function StudentPaymentsLogPanel() {
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [universityFilter, setUniversityFilter] = useState('all');
  const [programFilter, setProgramFilter] = useState('all');
  const [branchFilter, setBranchFilter] = useState('all');
  const [sortOption, setSortOption] = useState('recent');
  const [expandedRows, setExpandedRows] = useState<Record<string, boolean>>({});

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

  const filteredLogs = logs.filter((log: any) => {
    const matchesSearch = log.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          log.enrollmentNo?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          log.programName?.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesUniversity = universityFilter === 'all' || log.universityName === universityFilter;
    const matchesProgram = programFilter === 'all' || log.programName === programFilter;
    const matchesBranch = branchFilter === 'all' || log.branchName === branchFilter;

    return matchesSearch && matchesUniversity && matchesProgram && matchesBranch;
  }).sort((a, b) => {
    switch (sortOption) {
      case 'name-asc': return (a.name || '').localeCompare(b.name || '');
      case 'name-desc': return (b.name || '').localeCompare(a.name || '');
      case 'balance-desc': return (b.balance || 0) - (a.balance || 0);
      case 'balance-asc': return (a.balance || 0) - (b.balance || 0);
      case 'recent': default: return 0;
    }
  });

  return (
    <div className="space-y-6 max-w-7xl mx-auto p-4 md:p-6 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-foreground">Student Payments Log</h2>
          <p className="text-muted-foreground text-sm mt-1">
            Track student payments against their program structure.
          </p>
        </div>
      </div>

      <Card className="border-none bg-card/65 backdrop-blur-md shadow-md">
        <CardHeader className="flex flex-col gap-4">
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <div>
              <CardTitle className="text-base">Payment Logs Directory</CardTitle>
              <CardDescription>View comprehensive status of student fee completion</CardDescription>
            </div>
            <div className="relative w-full md:w-64">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by name, enrollment, program..."
                className="pl-9 h-9"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <Select value={universityFilter} onValueChange={setUniversityFilter}>
              <SelectTrigger className="w-[180px] h-8 text-xs">
                <SelectValue placeholder="University" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Universities</SelectItem>
                {universities.map(u => <SelectItem key={u} value={u as string}>{u as string}</SelectItem>)}
              </SelectContent>
            </Select>

            <Select value={programFilter} onValueChange={setProgramFilter}>
              <SelectTrigger className="w-[180px] h-8 text-xs">
                <SelectValue placeholder="Program" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Programs</SelectItem>
                {programs.map(p => <SelectItem key={p} value={p as string}>{p as string}</SelectItem>)}
              </SelectContent>
            </Select>

            <Select value={branchFilter} onValueChange={setBranchFilter}>
              <SelectTrigger className="w-[180px] h-8 text-xs">
                <SelectValue placeholder="Branch" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Branches</SelectItem>
                {branches.map(b => <SelectItem key={b} value={b as string}>{b as string}</SelectItem>)}
              </SelectContent>
            </Select>

            <Select value={sortOption} onValueChange={setSortOption}>
              <SelectTrigger className="w-[180px] h-8 text-xs ml-auto">
                <SelectValue placeholder="Sort By" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="recent">Recently Added</SelectItem>
                <SelectItem value="name-asc">Name (A-Z)</SelectItem>
                <SelectItem value="name-desc">Name (Z-A)</SelectItem>
                <SelectItem value="balance-desc">Balance (High to Low)</SelectItem>
                <SelectItem value="balance-asc">Balance (Low to High)</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center p-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
            </div>
          ) : filteredLogs.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">No payment records found.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-sm">
                <thead>
                  <tr className="border-b border-border text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    <th className="pb-3 pr-4">Student Details</th>
                    <th className="pb-3 px-4">Program</th>
                    <th className="pb-3 px-4 text-right">Total Fee</th>
                    <th className="pb-3 px-4 text-right">Amount Received</th>
                    <th className="pb-3 px-4 text-right">Balance</th>
                    <th className="pb-3 pl-4">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/60">
                  {filteredLogs.map((log: any) => (
                    <React.Fragment key={log.studentId}>
                      <tr className="hover:bg-background/20 cursor-pointer" onClick={() => toggleRow(log.studentId)}>
                        <td className="py-3 px-4 pl-0">
                          <div className="flex items-center gap-2">
                            {expandedRows[log.studentId] ? <ChevronDown className="h-4 w-4 text-muted-foreground" /> : <ChevronRight className="h-4 w-4 text-muted-foreground" />}
                            <div>
                              <span className="font-bold text-foreground block">{log.name}</span>
                              <span className="text-[10px] text-muted-foreground">{log.enrollmentNo || 'No Enrollment No.'}</span>
                            </div>
                          </div>
                        </td>
                        <td className="py-3 px-4 text-muted-foreground">
                          {log.programName}
                        </td>
                        <td className="py-3 px-4 text-right font-medium text-foreground">
                          ₹{log.totalFee?.toLocaleString('en-IN') || 0}
                          {log.discountAmount > 0 && (
                            <div className="text-[10px] text-green-600 mt-0.5" title={log.discountReason}>
                              (-₹{log.discountAmount.toLocaleString('en-IN')} off)
                            </div>
                          )}
                        </td>
                        <td className="py-3 px-4 text-right font-medium text-emerald-600">
                          ₹{log.totalPaid?.toLocaleString('en-IN') || 0}
                        </td>
                        <td className="py-3 px-4 text-right font-semibold text-amber-600">
                          ₹{log.balance?.toLocaleString('en-IN') || 0}
                        </td>
                        <td className="py-3 pl-4">
                          {log.status === 'Completed' ? (
                            <Badge className="bg-emerald-500/10 text-emerald-600 hover:bg-emerald-500/20 border-none">
                              Completed
                            </Badge>
                          ) : (
                            <Badge variant="secondary" className="bg-amber-500/10 text-amber-600 hover:bg-amber-500/20 border-none">
                              Pending
                            </Badge>
                          )}
                        </td>
                      </tr>
                      {expandedRows[log.studentId] && log.breakdown && log.breakdown.length > 0 && (
                        <tr className="bg-muted/20">
                          <td colSpan={6} className="p-4 border-l-2 border-primary">
                            <div className="flex justify-between items-center mb-4">
                              <h4 className="font-semibold text-foreground text-sm">Fee Breakdown</h4>
                              <Button variant="outline" size="sm" onClick={(e) => {
                                e.stopPropagation();
                                setSelectedStudentId(log.studentId);
                                setExtraFeeDialogOpen(true);
                              }}>
                                <Plus className="w-4 h-4 mr-1" /> Add Extra Fee
                              </Button>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                              {log.breakdown.map((b: any, i: number) => (
                                <div key={i} className="bg-background rounded-md border border-border p-3 flex flex-col gap-1 shadow-sm">
                                  <div className="flex justify-between items-center mb-1">
                                    <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">{b.year}</span>
                                    {b.dueDate && (
                                      <span className="text-[10px] bg-muted px-2 py-0.5 rounded text-muted-foreground">
                                        Due: {new Date(b.dueDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                                      </span>
                                    )}
                                  </div>
                                  <div className="flex justify-between items-center text-sm mt-1">
                                    <span className="text-muted-foreground">Total:</span>
                                    <span className="font-semibold text-foreground">₹{b.totalFee?.toLocaleString('en-IN') || 0}</span>
                                  </div>
                                  <div className="flex justify-between items-center text-sm">
                                    <span className="text-muted-foreground">Received:</span>
                                    <span className="font-medium text-emerald-600">₹{b.paid?.toLocaleString('en-IN') || 0}</span>
                                  </div>
                                  <div className="flex justify-between items-center text-sm border-t border-border mt-1 pt-1">
                                    <span className="text-muted-foreground">Balance:</span>
                                    <span className="font-semibold text-amber-600">₹{b.balance?.toLocaleString('en-IN') || 0}</span>
                                  </div>
                                  <div className="mt-3 pt-3 border-t border-border flex justify-end">
                                    <Button variant="outline" size="sm" className="w-full text-xs h-8" onClick={(e) => {
                                      e.stopPropagation();
                                      setSelectedStudentId(log.studentId);
                                      setSelectedScheduleId(b.scheduleId || null);
                                      setPaymentDialogOpen(true);
                                    }}>
                                      <Plus className="w-3 h-3 mr-1" />
                                      Record Receipt
                                    </Button>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={paymentDialogOpen} onOpenChange={(open) => { setPaymentDialogOpen(open); if (!open) setFormData({ amount: '', method: 'Bank Transfer', referenceNo: '', date: new Date().toISOString().split('T')[0], notes: '' }); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Record Receipt</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleRecordPayment} className="space-y-4">
            <div>
              <Label>Amount (₹)</Label>
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
              <Button type="button" variant="outline" onClick={() => setPaymentDialogOpen(false)}>Cancel</Button>
              <Button type="submit">Save Receipt</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={extraFeeDialogOpen} onOpenChange={(open) => { setExtraFeeDialogOpen(open); if (!open) setExtraFeeData({ title: '', amount: '', dueDate: new Date().toISOString().split('T')[0], remarks: '' }); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Extra Fee</DialogTitle>
            <DialogDescription>Add a late fee, library fine, or other miscellaneous charge.</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleAddExtraFee} className="space-y-4">
            <div>
              <Label>Fee Title</Label>
              <Input required placeholder="e.g. Late Payment Fee" value={extraFeeData.title} onChange={(e) => setExtraFeeData({ ...extraFeeData, title: e.target.value })} />
            </div>
            <div>
              <Label>Amount (₹)</Label>
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
              <Button type="button" variant="outline" onClick={() => setExtraFeeDialogOpen(false)}>Cancel</Button>
              <Button type="submit">Add Fee</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
