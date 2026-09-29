import { useState, useEffect } from 'react';
import { RefreshCw, Upload, AlertCircle } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { StudentsPanel } from './StudentsPanel';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import api from '@/lib/api';
import { toast } from 'sonner';

interface Enrollment {
  id: string;
  enrollmentNumber?: string;
  studentName: string;
  studentEmail: string;
  programId: string;
  program?: { name: string; code: string; courseType: string };
  student?: { documents?: any[]; admissionProgress?: any };
  documents?: any[];
  status: string;
  departmentRemarks?: string;
  createdAt: string;
}

const STATUS_COLOR: Record<string, string> = {
  payment_pending: 'bg-muted text-muted-foreground',
  document_review: 'bg-info/10 text-info',
  dept_review: 'bg-warning/10 text-warning',
  finance_review: 'bg-orange-100 text-orange-700',
  enrolled: 'bg-success/10 text-success',
  rejected: 'bg-destructive/10 text-destructive',
  receipt_submitted: 'bg-indigo-100 text-indigo-700',
};

export function StudyCenterEnrollmentsPanel() {
  const [enrollments, setEnrollments] = useState<Enrollment[]>([]);
  const [loading, setLoading] = useState(false);
  const [statusFilter, setStatusFilter] = useState('');
  const [enrollDialogOpen, setEnrollDialogOpen] = useState(false);
  const [verifyingStudent, setVerifyingStudent] = useState<any>(null);

  const fetch = async () => {
    setLoading(true);
    try {
      const params = statusFilter ? `?status=${statusFilter}` : '';
      const res = await api.get(`/enrollment/enrollments${params}`);
      setEnrollments(res.data.data || []);
    } catch (e: any) {
      toast.error(e.response?.data?.message || 'Failed to load');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetch(); }, [statusFilter]);

  const getProgramName = (e: Enrollment) => {
    if (e.program) return `${e.program.name} (${e.program.code})`;
    return 'N/A';
  };

  const STATUSES = ['', 'payment_pending', 'receipt_submitted', 'document_review', 'dept_review', 'finance_review', 'enrolled', 'rejected'];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">My Enrollments</h2>
          <p className="text-muted-foreground text-sm mt-1">Track all student enrollments submitted by your center.</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={fetch} disabled={loading}>
            <RefreshCw className={cn('w-4 h-4 mr-2', loading && 'animate-spin')} />Refresh
          </Button>

          <StudentsPanel
            triggerOpen={enrollDialogOpen}
            isSalesMode={true}
            onOpenChange={(open) => {
              setEnrollDialogOpen(open);
              if (!open) {
                setVerifyingStudent(null);
                fetch();
              }
            }}
            completingEnrollment={verifyingStudent}
          />
        </div>
      </div>

      <div className="flex gap-2 flex-wrap">
        {STATUSES.map(s => (
          <button
            key={s}
            onClick={() => setStatusFilter(s)}
            className={cn(
              'px-4 py-1.5 rounded-full text-xs font-bold border transition-all shadow-sm',
              statusFilter === s ? 'bg-primary text-primary-foreground border-primary shadow-md scale-[1.02]' : 'bg-white dark:bg-slate-900 border-border hover:border-primary/40 hover:bg-slate-50 dark:hover:bg-slate-800'
            )}
          >
            {s ? s.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase()) : 'All'}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="space-y-3">{[1,2,3].map(i => <div key={i} className="h-20 bg-muted rounded-xl animate-pulse" />)}</div>
      ) : enrollments.length === 0 ? (
        <Card><CardContent className="py-16 text-center text-muted-foreground">No enrollments found.</CardContent></Card>
      ) : (
        <div className="space-y-3">
          {enrollments.map(e => {
            const docs = e.student?.documents || e.documents || [];
            const photoStatus = e.student?.admissionProgress?.photoStatus;
            const hasRejected = docs.some((d: any) => d && d.status === 'rejected') || photoStatus === 'rejected';

            return (
              <Card key={e.id} className="hover:border-primary/30 transition-colors">
                <CardContent className="p-5">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <Badge className={cn('text-[10px] uppercase font-bold', STATUS_COLOR[e.status] || 'bg-muted text-muted-foreground')}>
                          {e.status.replace(/_/g, ' ')}
                        </Badge>
                        {e.enrollmentNumber && <span className="text-xs text-muted-foreground">{e.enrollmentNumber}</span>}
                      </div>
                      <h4 className="font-semibold">{e.studentName}</h4>
                      <div className="flex items-center gap-4 mt-1 text-sm text-muted-foreground flex-wrap">
                        <span>{e.studentEmail}</span>
                        <span>{e.studentPhone}</span>
                        <span>{getProgramName(e)}</span>
                        <span>{new Date(e.createdAt).toLocaleDateString()}</span>
                      </div>
                      
                      {e.status === 'rejected' && e.departmentRemarks && (
                        <div className="mt-3 p-3 bg-red-50 border border-red-100 rounded-md flex items-start gap-2">
                          <AlertCircle className="w-4 h-4 text-red-600 mt-0.5 shrink-0" />
                          <div className="text-xs text-red-800">
                            <span className="font-semibold block mb-1">Rejection Remarks:</span>
                            {e.departmentRemarks}
                          </div>
                        </div>
                      )}

                      {(e.status === 'rejected' || e.status === 'ops_rejected') && hasRejected && (
                        <div className="mt-4 pt-4 border-t">
                          <Button size="sm" className="bg-rose-600 hover:bg-rose-700 font-semibold" onClick={() => {
                            setVerifyingStudent(e);
                            setEnrollDialogOpen(true);
                          }}>
                            <Upload className="w-4 h-4 mr-2" /> Re-upload Rejected Documents
                          </Button>
                        </div>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
