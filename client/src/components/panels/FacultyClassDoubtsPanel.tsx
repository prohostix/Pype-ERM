import { useEffect, useState } from 'react';
import { ArrowLeft, CheckCircle2, MessageCircle, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import api from '@/lib/api';

type Filter = 'open' | 'answered' | 'all';

export function FacultyClassDoubtsPanel({ academicClass, onBack }: { academicClass: any; onBack: () => void }) {
  const [doubts, setDoubts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<Filter>('open');
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [sendingId, setSendingId] = useState<string | null>(null);

  const fetchDoubts = async () => {
    try {
      const res = await api.get(`/faculty-portal/classes/${academicClass.id}/doubts`);
      setDoubts(res.data.data || []);
    } catch {
      toast.error('Failed to load doubts');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDoubts();
  }, [academicClass.id]);

  const handleAnswer = async (doubtId: string) => {
    const message = drafts[doubtId]?.trim();
    if (!message) return;
    setSendingId(doubtId);
    try {
      await api.post(`/faculty-portal/doubts/${doubtId}/replies`, { message });
      setDrafts((prev) => ({ ...prev, [doubtId]: '' }));
      fetchDoubts();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to send answer');
    } finally {
      setSendingId(null);
    }
  };

  const handleDelete = async (doubtId: string) => {
    if (!confirm('Delete this doubt and its replies?')) return;
    try {
      await api.delete(`/faculty-portal/doubts/${doubtId}`);
      fetchDoubts();
    } catch (err: any) {
      if (!err.isDeleteRequest && err.message !== 'Delete request cancelled.') {
        toast.error(err.response?.data?.message || 'Failed to delete doubt');
      }
    }
  };

  const openCount = doubts.filter((d) => d.status === 'open').length;
  const visibleDoubts = filter === 'all' ? doubts : doubts.filter((d) => d.status === filter);
  const filters: Array<{ id: Filter; label: string }> = [
    { id: 'open', label: `Open (${openCount})` },
    { id: 'answered', label: `Answered (${doubts.length - openCount})` },
    { id: 'all', label: `All (${doubts.length})` }
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={onBack} aria-label="Back to classes">
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <div>
          <h2 className="text-xl font-bold tracking-tight flex items-center gap-2">
            <MessageCircle className="w-5 h-5 text-indigo-500" /> Student Doubts: {academicClass?.name}
          </h2>
          <p className="text-muted-foreground text-sm">Answer questions students ask on this class's lessons</p>
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        {filters.map((f) => (
          <Button key={f.id} size="sm" variant={filter === f.id ? 'default' : 'outline'} onClick={() => setFilter(f.id)}>
            {f.label}
          </Button>
        ))}
      </div>

      {loading ? (
        <div className="p-12 text-center text-muted-foreground">Loading doubts...</div>
      ) : visibleDoubts.length === 0 ? (
        <div className="p-12 text-center border rounded-lg bg-background">
          <MessageCircle className="w-10 h-10 text-muted-foreground/30 mx-auto mb-3" />
          <p className="text-muted-foreground text-sm">No {filter === 'all' ? '' : filter} doubts.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {visibleDoubts.map((doubt) => (
            <Card key={doubt.id}>
              <CardContent className="p-4 space-y-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-sm font-semibold">
                      {doubt.student?.name || 'Student'}
                      {doubt.student?.enrollmentNo && <span className="ml-2 font-normal text-xs text-muted-foreground">{doubt.student.enrollmentNo}</span>}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {doubt.moduleLesson?.title} · {new Date(doubt.createdAt).toLocaleString()}
                    </p>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    {doubt.status === 'answered' ? (
                      <Badge variant="outline" className="gap-1 text-emerald-700 border-emerald-200 bg-emerald-50 dark:bg-emerald-950/40 dark:text-emerald-400">
                        <CheckCircle2 className="w-3 h-3" /> Answered
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="text-amber-700 border-amber-200 bg-amber-50 dark:bg-amber-950/40 dark:text-amber-400">Open</Badge>
                    )}
                    <Button variant="ghost" size="icon" onClick={() => handleDelete(doubt.id)} className="h-7 w-7 text-red-500 hover:text-red-600" aria-label="Delete doubt">
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                </div>

                <p className="text-sm whitespace-pre-line break-words">{doubt.question}</p>

                {doubt.replies?.length > 0 && (
                  <div className="space-y-2 pl-3 border-l-2">
                    {doubt.replies.map((reply: any) => (
                      <div key={reply.id} className="text-sm">
                        <p className="text-xs font-semibold">
                          {reply.faculty?.name || reply.student?.name || 'Former user'}
                          {reply.faculty && <span className="ml-1.5 font-medium text-emerald-600 dark:text-emerald-400">Faculty</span>}
                        </p>
                        <p className="text-muted-foreground whitespace-pre-line break-words">{reply.message}</p>
                      </div>
                    ))}
                  </div>
                )}

                <div className="space-y-2">
                  <Textarea
                    rows={2}
                    value={drafts[doubt.id] || ''}
                    onChange={(e) => setDrafts((prev) => ({ ...prev, [doubt.id]: e.target.value }))}
                    placeholder="Write your answer..."
                    aria-label={`Answer ${doubt.student?.name || 'this student'}`}
                    className="resize-none"
                  />
                  <div className="flex justify-end">
                    <Button size="sm" onClick={() => handleAnswer(doubt.id)} disabled={sendingId === doubt.id || !drafts[doubt.id]?.trim()}>
                      Send Answer
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
