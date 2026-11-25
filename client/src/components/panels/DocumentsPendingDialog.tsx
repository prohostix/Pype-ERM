import { useEffect, useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ListPagination } from '@/components/ui/list-pagination';
import api from '@/lib/api';

interface PendingStudent {
  id: string;
  name: string;
  enrollmentNo?: string;
  unapprovedDocs: { name?: string; type?: string; status?: string }[];
  photoStatus?: string;
}

/** The students behind the overview's "Documents Pending" count, one page at a time. */
export function DocumentsPendingDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [rows, setRows] = useState<PendingStudent[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!open) return;
    let outdated = false;
    setLoading(true);
    setError('');
    api.get('/dashboard/documents-pending', { params: { page, limit: pageSize } })
      .then((res) => {
        if (outdated) return;
        setRows(res.data.data || []);
        setTotal(res.data.total || 0);
      })
      .catch((e) => { if (!outdated) setError(e.response?.data?.message || 'Failed to load students'); })
      .finally(() => { if (!outdated) setLoading(false); });
    return () => { outdated = true; };
  }, [open, page, pageSize]);

  return (
    <Dialog open={open} onOpenChange={(next) => { if (!next) { setPage(1); onClose(); } }}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto rounded-[2rem] border-0 bg-white p-6 sm:p-8">
        <DialogHeader>
          <DialogTitle className="text-xl font-semibold tracking-tight">Documents Pending</DialogTitle>
          <DialogDescription>Students whose uploaded documents or photo need action.</DialogDescription>
        </DialogHeader>
        {loading ? (
          <div className="space-y-3">{[1, 2, 3].map((i) => <div key={i} className="h-16 rounded-2xl bg-slate-100 animate-pulse" />)}</div>
        ) : error ? (
          <p className="py-8 text-center text-sm text-red-600">{error}</p>
        ) : rows.length === 0 ? (
          <p className="py-8 text-center text-sm text-muted-foreground">No documents are waiting for action.</p>
        ) : (
          <div className="space-y-3">
            {rows.map((student) => (
              <div key={student.id} className="rounded-2xl bg-[#f4f6f3] p-4">
                <p className="font-semibold text-slate-900">{student.name}</p>
                <p className="text-xs text-muted-foreground mt-0.5">{student.enrollmentNo || 'No enrollment number'}</p>
                <div className="flex flex-wrap gap-2 mt-2">
                  {student.unapprovedDocs.map((doc, i) => (
                    <span key={i} className={`rounded-full px-3 py-1 text-xs font-semibold ${doc.status === 'rejected' ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-700'}`}>
                      {doc.name || doc.type || 'Document'} · {doc.status || 'pending'}
                    </span>
                  ))}
                  {student.photoStatus !== 'approved' && (
                    <span className={`rounded-full px-3 py-1 text-xs font-semibold ${student.photoStatus === 'rejected' ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-700'}`}>
                      Photo · {student.photoStatus || 'pending'}
                    </span>
                  )}
                </div>
              </div>
            ))}
            <ListPagination total={total} page={page} pageSize={pageSize} onPageChange={setPage} onPageSizeChange={(n) => { setPageSize(n); setPage(1); }} />
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
