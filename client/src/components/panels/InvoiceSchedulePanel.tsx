import { useState, useEffect } from 'react';
import { CalendarDays, FileText, Search, PlusCircle, CheckCircle, Clock, AlertCircle, Zap } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import api from '@/lib/api';
import { toast } from 'sonner';

export function InvoiceSchedulePanel() {
  const [students, setStudents] = useState<any[]>([]);
  const [search, setSearch] = useState('');
  const [selectedStudent, setSelectedStudent] = useState<any>(null);
  const [plan, setPlan] = useState<{ student: any; schedules: any[] } | null>(null);
  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState<string | null>(null);
  const [generatingAll, setGeneratingAll] = useState(false);

  // Pagination State
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 50;

  useEffect(() => {
    setCurrentPage(1);
  }, [search]);

  useEffect(() => {
    api.get('/students').then(r => setStudents(r.data.data || [])).catch(() => {});
  }, []);

  const loadPlan = async (student: any) => {
    setSelectedStudent(student);
    setLoading(true);
    setPlan(null);
    try {
      const res = await api.get(`/finance/payment-plan/${student.id}`);
      setPlan(res.data.data);
    } catch { toast.error('Failed to load payment plan'); }
    finally { setLoading(false); }
  };

  const generateOne = async (scheduleId: string) => {
    setGenerating(scheduleId);
    try {
      await api.post(`/finance/payment-plan/schedule/${scheduleId}/invoice`);
      toast.success('Invoice generated!');
      loadPlan(selectedStudent);
    } catch (e: any) {
      toast.error(e.response?.data?.message || 'Failed to generate invoice');
    } finally { setGenerating(null); }
  };

  const generateAll = async () => {
    if (!selectedStudent) return;
    setGeneratingAll(true);
    try {
      const res = await api.post(`/finance/payment-plan/student/${selectedStudent.id}/generate-all`);
      const { created, skipped } = res.data.data;
      toast.success(`Generated ${created} invoices (${skipped} already existed)`);
      loadPlan(selectedStudent);
    } catch (e: any) {
      toast.error(e.response?.data?.message || 'Failed');
    } finally { setGeneratingAll(false); }
  };

  const filteredStudents = students.filter(s =>
    !search || s.name?.toLowerCase().includes(search.toLowerCase()) ||
    s.enrollmentNo?.toLowerCase().includes(search.toLowerCase())
  );

  const totalPages = Math.max(1, Math.ceil(filteredStudents.length / itemsPerPage));
  const paginatedStudents = filteredStudents.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  const scheduleStatusIcon = (s: any) => {
    if (s.status === 'paid') return <CheckCircle className="w-4 h-4 text-emerald-500" />;
    if (s.status === 'overdue') return <AlertCircle className="w-4 h-4 text-rose-500" />;
    return <Clock className="w-4 h-4 text-amber-500" />;
  };

  const invoiceStatus = (s: any) => {
    if (!s.invoices || s.invoices.length === 0) return null;
    const inv = s.invoices[0];
    const colors: Record<string, string> = {
      paid: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30',
      pending: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30',
      draft: 'bg-slate-100 text-slate-600',
    };
    return <Badge className={colors[inv.status] || ''}>{inv.invoiceNo} — {inv.status}</Badge>;
  };

  return (
    <div className="grid grid-cols-12 gap-4 min-h-[600px]">
      {/* Student list */}
      <div className="col-span-4">
        <Card className="h-full">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <CalendarDays className="w-4 h-4 text-indigo-500" /> Select Student
            </CardTitle>
            <div className="relative mt-1">
              <Search className="absolute left-2.5 top-2 w-4 h-4 text-muted-foreground" />
              <Input placeholder="Search student..." className="pl-8 h-8 text-sm" value={search} onChange={e => setSearch(e.target.value)} />
            </div>
          </CardHeader>
          <CardContent className="overflow-y-auto max-h-[560px] pr-1">
            {filteredStudents.length === 0 ? (
              <div className="text-center text-sm text-muted-foreground py-8">No students found</div>
            ) : (
              <div className="space-y-1.5">
                {paginatedStudents.map(s => (
                  <button
                    key={s.id}
                    className={`w-full text-left p-2.5 rounded-lg border transition-colors text-sm
                      ${selectedStudent?.id === s.id ? 'bg-primary/10 border-primary/30' : 'hover:bg-slate-50 dark:hover:bg-slate-800/40 border-transparent'}`}
                    onClick={() => loadPlan(s)}
                  >
                    <div className="font-medium truncate">{s.name}</div>
                    <div className="text-xs text-muted-foreground">{s.enrollmentNo} • {s.program?.name || 'No program'}</div>
                  </button>
                ))}
              </div>
            )}
            
            {/* Pagination Controls */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between pt-4 pb-2 border-t mt-4">
                <div className="text-sm text-muted-foreground">
                  Showing {(currentPage - 1) * itemsPerPage + 1} to {Math.min(currentPage * itemsPerPage, filteredStudents.length)} of {filteredStudents.length} students
                </div>
                <div className="flex items-center gap-2">
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                    disabled={currentPage === 1}
                  >
                    Previous
                  </Button>
                  <div className="text-sm font-medium px-2">
                    Page {currentPage} of {totalPages}
                  </div>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                    disabled={currentPage === totalPages}
                  >
                    Next
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Payment Plan */}
      <div className="col-span-8">
        <Card className="h-full">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <FileText className="w-5 h-5 text-indigo-500" />
                {selectedStudent ? `Payment Plan — ${selectedStudent.name}` : 'Payment Plan'}
              </CardTitle>
              {plan && plan.schedules.length > 0 && (
                <Button size="sm" onClick={generateAll} disabled={generatingAll} className="gap-1.5 bg-indigo-600 hover:bg-indigo-700 text-white">
                  <Zap className="w-3.5 h-3.5" /> {generatingAll ? 'Generating...' : 'Generate All Invoices'}
                </Button>
              )}
            </div>
          </CardHeader>
          <CardContent>
            {!selectedStudent ? (
              <div className="text-center py-20 text-muted-foreground">
                <CalendarDays className="w-10 h-10 mx-auto mb-2 opacity-30" />
                <p>Select a student to view their payment schedule</p>
              </div>
            ) : loading ? (
              <div className="text-center py-20 text-muted-foreground">Loading schedule...</div>
            ) : !plan || plan.schedules.length === 0 ? (
              <div className="text-center py-20 text-muted-foreground">
                <Clock className="w-10 h-10 mx-auto mb-2 opacity-30" />
                <p>No payment schedule configured for this student.</p>
                <p className="text-xs mt-1">Go to Students → Payment Schedule to add installments.</p>
              </div>
            ) : (
              <div className="space-y-3 max-h-[520px] overflow-y-auto pr-1">
                {/* Timeline */}
                {plan.schedules.map((s: any, i: number) => (
                  <div key={s.id} className="relative flex items-start gap-4 pl-2">
                    {/* Timeline line */}
                    {i < plan.schedules.length - 1 && (
                      <div className="absolute left-[18px] top-10 bottom-0 w-px bg-slate-200 dark:bg-slate-700" />
                    )}
                    <div className="flex-shrink-0 mt-1">{scheduleStatusIcon(s)}</div>
                    <div className={`flex-1 p-3.5 rounded-xl border transition-colors
                      ${s.status === 'paid' ? 'bg-emerald-50/50 dark:bg-emerald-900/10 border-emerald-200 dark:border-emerald-800/30' :
                      s.status === 'overdue' ? 'bg-rose-50/50 dark:bg-rose-900/10 border-rose-200 dark:border-rose-800/30' :
                      'bg-slate-50 dark:bg-slate-900/30 border-slate-200 dark:border-slate-700'}`}>
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1">
                          <div className="font-semibold text-sm">
                            Installment {i + 1} — {s.title}
                            {s.isOldFee && <Badge className="ml-2 text-xs bg-orange-100 text-orange-700">Old Fee</Badge>}
                          </div>
                          <div className="text-xs text-muted-foreground mt-0.5">
                            Due: <strong>{new Date(s.dueDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</strong>
                          </div>
                          <div className="text-lg font-bold text-indigo-600 dark:text-indigo-400 mt-1">₹{s.amount.toLocaleString('en-IN')}</div>
                          {s.remarks && <div className="text-xs text-muted-foreground mt-1">{s.remarks}</div>}
                          {invoiceStatus(s) && <div className="mt-2">{invoiceStatus(s)}</div>}
                        </div>
                        <div className="flex-shrink-0">
                          {s.invoices?.length === 0 ? (
                            <Button size="sm" variant="outline" className="gap-1 text-xs h-7"
                              onClick={() => generateOne(s.id)} disabled={generating === s.id}>
                              <PlusCircle className="w-3 h-3" />
                              {generating === s.id ? 'Creating...' : 'Create Invoice'}
                            </Button>
                          ) : (
                            <Badge className="bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400">Invoice Created</Badge>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
