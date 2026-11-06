import { useEffect, useState } from 'react';
import { CheckCircle2, Loader2, MessageCircle, Send } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import api from '@/lib/api';

function ReplyList({ replies }: { replies: any[] }) {
  if (!replies?.length) return null;
  return (
    <div className="space-y-2 pl-3 border-l-2 border-border/60">
      {replies.map((reply) => (
        <div key={reply.id} className="text-xs">
          <p className="font-semibold text-foreground">
            {reply.faculty?.name || reply.student?.name || 'Former user'}
            {reply.faculty && <span className="ml-1.5 font-medium text-emerald-600 dark:text-emerald-400">Faculty</span>}
          </p>
          <p className="text-muted-foreground whitespace-pre-line break-words">{reply.message}</p>
        </div>
      ))}
    </div>
  );
}

export function LessonDoubtsTab({ lessonId }: { lessonId: string }) {
  const [doubts, setDoubts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [question, setQuestion] = useState('');
  const [posting, setPosting] = useState(false);
  const [replyDrafts, setReplyDrafts] = useState<Record<string, string>>({});
  const [replyingId, setReplyingId] = useState<string | null>(null);

  const fetchDoubts = async () => {
    try {
      const res = await api.get(`/student-portal/lessons/${lessonId}/doubts`);
      setDoubts(res.data.data || []);
    } catch {
      toast.error('Failed to load doubts');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    setLoading(true);
    fetchDoubts();
  }, [lessonId]);

  const handleAsk = async () => {
    if (!question.trim()) return;
    setPosting(true);
    try {
      await api.post(`/student-portal/lessons/${lessonId}/doubts`, { question });
      setQuestion('');
      fetchDoubts();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to post your doubt');
    } finally {
      setPosting(false);
    }
  };

  const handleReply = async (doubtId: string) => {
    const message = replyDrafts[doubtId]?.trim();
    if (!message) return;
    setReplyingId(doubtId);
    try {
      await api.post(`/student-portal/doubts/${doubtId}/replies`, { message });
      setReplyDrafts((prev) => ({ ...prev, [doubtId]: '' }));
      fetchDoubts();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to post your reply');
    } finally {
      setReplyingId(null);
    }
  };

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Textarea
          rows={2}
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          placeholder="Ask a question about this lesson. Your classmates can see it too."
          aria-label="Your question"
          className="text-xs resize-none"
        />
        <div className="flex justify-end">
          <Button size="sm" onClick={handleAsk} disabled={posting || !question.trim()} className="h-8 text-xs gap-1.5">
            {posting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
            Ask Doubt
          </Button>
        </div>
      </div>

      {loading ? (
        <div className="py-6 text-center text-xs text-muted-foreground">Loading doubts...</div>
      ) : doubts.length === 0 ? (
        <div className="text-center py-8 border border-dashed rounded-xl bg-muted/10 space-y-1">
          <MessageCircle className="w-7 h-7 text-muted-foreground/30 mx-auto" />
          <p className="text-xs text-muted-foreground">No doubts yet. Be the first to ask.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {doubts.map((doubt) => (
            <div key={doubt.id} className="rounded-xl border border-border/50 bg-card/40 p-3 space-y-2.5">
              <div className="flex items-start justify-between gap-2">
                <p className="text-xs font-semibold text-foreground">
                  {doubt.student?.name || 'Student'}
                  {doubt.isMine && <span className="ml-1.5 font-medium text-muted-foreground">(You)</span>}
                </p>
                {doubt.status === 'answered' && (
                  <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-emerald-600 dark:text-emerald-400 shrink-0">
                    <CheckCircle2 className="w-3 h-3" /> Answered
                  </span>
                )}
              </div>
              <p className="text-xs sm:text-sm text-foreground/90 whitespace-pre-line break-words">{doubt.question}</p>
              <ReplyList replies={doubt.replies} />
              <div className="flex items-center gap-2">
                <input
                  value={replyDrafts[doubt.id] || ''}
                  onChange={(e) => setReplyDrafts((prev) => ({ ...prev, [doubt.id]: e.target.value }))}
                  placeholder="Write a reply..."
                  aria-label={`Reply to ${doubt.student?.name || 'this doubt'}`}
                  className="flex-1 min-w-0 h-8 rounded-lg border border-border/60 bg-background px-2.5 text-xs outline-none focus-visible:ring-1 focus-visible:ring-primary"
                />
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleReply(doubt.id)}
                  disabled={replyingId === doubt.id || !replyDrafts[doubt.id]?.trim()}
                  className="h-8 text-xs"
                >
                  Reply
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
