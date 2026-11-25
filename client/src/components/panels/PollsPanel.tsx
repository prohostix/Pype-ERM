import { useState, useEffect } from 'react';
import { Plus, Trash2, RefreshCw, BarChart2, CheckCircle } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { toast } from 'sonner';
import api from '@/lib/api';
import { useAuth } from '@/hooks/useAuth';

interface PollOption {
  text: string;
  votes: string[];
}

interface Poll {
  id: string;
  question: string;
  options: PollOption[];
  createdBy?: { name: string };
  expiresAt?: string;
  isActive: boolean;
  allowMultiple: boolean;
  createdAt: string;
}

export function PollsPanel() {
  const { user } = useAuth();
  const isHR = user?.role === 'hr_admin' || user?.role === 'hr_sub_admin';
  const [polls, setPolls] = useState<Poll[]>([]);
  const [loading, setLoading] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const [votedPolls, setVotedPolls] = useState<Record<string, number[]>>({});

  const [form, setForm] = useState({
    question: '',
    options: ['', ''],
    expiresAt: '',
    allowMultiple: false,
  });

  useEffect(() => { fetchPolls(); }, []);

  const fetchPolls = async () => {
    setLoading(true);
    try {
      const res = await api.get('/hr/polls');
      setPolls(res.data.data || []);
    } catch { toast.error('Failed to load polls'); }
    finally { setLoading(false); }
  };

  const handleCreate = async () => {
    const opts = form.options.filter(o => o.trim());
    if (!form.question.trim() || opts.length < 2) {
      toast.error('Question and at least 2 options required');
      return;
    }
    try {
      await api.post('/hr/polls', {
        question: form.question,
        options: opts,
        expiresAt: form.expiresAt || undefined,
        allowMultiple: form.allowMultiple,
      });
      toast.success('Poll created');
      setCreateOpen(false);
      setForm({ question: '', options: ['', ''], expiresAt: '', allowMultiple: false });
      fetchPolls();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to create poll');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this poll?')) return;
    try {
      await api.delete(`/hr/polls/${id}`);
      toast.success('Poll deleted');
      fetchPolls();
    } catch { toast.error('Failed to delete'); }
  };

  const handleToggleActive = async (poll: Poll) => {
    try {
      await api.put(`/hr/polls/${poll.id}`, { isActive: !poll.isActive });
      fetchPolls();
    } catch { toast.error('Failed to update'); }
  };

  const handleVote = async (pollId: string, optionIndex: number) => {
    const current = votedPolls[pollId] || [];
    const poll = polls.find(p => p.id === pollId);
    if (!poll) return;

    let newIndexes: number[];
    if (poll.allowMultiple) {
      newIndexes = current.includes(optionIndex)
        ? current.filter(i => i !== optionIndex)
        : [...current, optionIndex];
    } else {
      newIndexes = [optionIndex];
    }

    try {
      await api.post(`/hr/polls/${pollId}/vote`, { optionIndexes: newIndexes });
      setVotedPolls(prev => ({ ...prev, [pollId]: newIndexes }));
      fetchPolls();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to vote');
    }
  };

  const totalVotes = (poll: Poll) => poll.options.reduce((s, o) => s + o.votes.length, 0);
  const pct = (votes: number, total: number) => total === 0 ? 0 : Math.round((votes / total) * 100);
  const hasVoted = (poll: Poll) => {
    const uid = user?.id || (user as any)?.id;
    return poll.options.some(o => o.votes.includes(uid));
  };
  const myVotes = (poll: Poll) => {
    const uid = user?.id || (user as any)?.id;
    return poll.options.map((o, i) => o.votes.includes(uid) ? i : -1).filter(i => i >= 0);
  };

  return (
    <div className="space-y-6 wizard-form">
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-2xl sm:text-3xl font-semibold tracking-tight">Polls</h2>
          <p className="text-muted-foreground text-sm mt-1.5">
            {isHR ? 'Create polls for all employees to vote on' : 'Vote on active polls from HR'}
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={fetchPolls} className="h-11 px-5 rounded-full bg-white border-slate-200 hover:bg-[#eaf6e6]">
            <RefreshCw className="w-4 h-4 mr-2" /> Refresh
          </Button>
          {isHR && (
            <Button onClick={() => setCreateOpen(true)} className="h-11 px-5 rounded-full bg-[#8ae47e] hover:bg-[#7bd96f] text-[#0b1d14] font-semibold">
              <Plus className="w-4 h-4 mr-2" /> Create Poll
            </Button>
          )}
        </div>
      </div>

      {loading ? (
        <div className="space-y-4">{[1,2].map(i => <div key={i} className="h-44 bg-slate-100 rounded-3xl animate-pulse" />)}</div>
      ) : polls.length === 0 ? (
        <div className="rounded-3xl bg-white border border-slate-100 py-16 text-center text-muted-foreground">
          <div className="w-14 h-14 rounded-2xl bg-[#eaf6e6] text-[#256c1d] flex items-center justify-center mx-auto mb-3"><BarChart2 className="w-6 h-6" /></div>
          <p className="text-sm">No polls yet</p>
          {isHR && <p className="text-xs mt-1">Create a poll to gather employee feedback</p>}
        </div>
      ) : (
        <div className="space-y-4">
          {polls.map(poll => {
            const total = totalVotes(poll);
            const voted = hasVoted(poll);
            const myVoteIdxs = myVotes(poll);
            const expired = poll.expiresAt && new Date(poll.expiresAt) < new Date();
            const canVote = poll.isActive && !expired;

            return (
              <Card key={poll.id} className={`rounded-3xl bg-white border border-slate-100 shadow-none py-6 gap-4 ${!poll.isActive || expired ? 'opacity-70' : ''}`}>
                <CardHeader className="px-6 pb-0">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1">
                      <CardTitle className="text-lg font-semibold tracking-tight">{poll.question}</CardTitle>
                      <div className="flex flex-wrap gap-2 mt-1">
                        <Badge className={`text-xs rounded-full border-0 px-3 ${poll.isActive && !expired ? 'bg-[#dff3da] text-[#256c1d]' : 'bg-slate-200/70 text-slate-600'}`}>
                          {expired ? 'Expired' : poll.isActive ? 'Active' : 'Closed'}
                        </Badge>
                        {poll.allowMultiple && <Badge variant="outline" className="text-xs rounded-full bg-[#f4f6f3] border-0 px-3">Multi-choice</Badge>}
                        {poll.expiresAt && (
                          <span className="text-xs text-muted-foreground">
                            Expires {new Date(poll.expiresAt).toLocaleDateString()}
                          </span>
                        )}
                        <span className="text-xs text-muted-foreground">{total} vote{total !== 1 ? 's' : ''}</span>
                      </div>
                    </div>
                    {isHR && (
                      <div className="flex items-center gap-2 shrink-0">
                        <Switch checked={poll.isActive} onCheckedChange={() => handleToggleActive(poll)} />
                        <Button variant="ghost" size="sm" className="rounded-full hover:bg-red-50" onClick={() => handleDelete(poll.id)}>
                          <Trash2 className="w-4 h-4 text-red-500" />
                        </Button>
                      </div>
                    )}
                  </div>
                </CardHeader>
                <CardContent className="space-y-2 px-6">
                  {poll.options.map((opt, idx) => {
                    const isMyVote = myVoteIdxs.includes(idx);
                    const optPct = pct(opt.votes.length, total);
                    return (
                      <div key={idx}>
                        <button
                          className={`w-full text-left p-4 rounded-2xl border transition-colors relative overflow-hidden ${
                            isMyVote
                              ? 'border-[#8ae47e] bg-[#eaf6e6]'
                              : canVote && !voted
                              ? 'border-transparent bg-[#f4f6f3] hover:bg-[#eef5ec]'
                              : 'border-transparent bg-[#f4f6f3] cursor-default'
                          }`}
                          onClick={() => canVote ? handleVote(poll.id, idx) : undefined}
                          disabled={!canVote && !voted}
                        >
                          {/* Progress bar background */}
                          {(voted || !canVote) && (
                            <div
                              className="absolute inset-y-0 left-0 bg-[#cfe9c9]/60 rounded-2xl transition-all"
                              style={{ width: `${optPct}%` }}
                            />
                          )}
                          <div className="relative flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              {isMyVote && <CheckCircle className="w-4 h-4 text-[#256c1d] shrink-0" />}
                              <span className="text-sm font-medium">{opt.text}</span>
                            </div>
                            {(voted || !canVote) && (
                              <span className="text-xs font-semibold text-muted-foreground">
                                {optPct}% ({opt.votes.length})
                              </span>
                            )}
                          </div>
                        </button>
                      </div>
                    );
                  })}
                  {canVote && !voted && (
                    <p className="text-xs text-muted-foreground pt-1">Click an option to vote</p>
                  )}
                  {voted && canVote && (
                    <p className="text-xs text-[#256c1d] font-medium pt-1">You voted — click another option to change your vote</p>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Create Poll Dialog */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="wizard-form max-w-md rounded-[2rem] border-0 bg-white p-6 sm:p-8" style={{ fontFamily: "Urbanist, ui-sans-serif, system-ui, sans-serif" }}>
          <DialogHeader><DialogTitle className="text-xl font-semibold tracking-tight">Create Poll</DialogTitle></DialogHeader>
          <div className="space-y-4 pt-2">
            <div className="space-y-1">
              <Label>Question</Label>
              <Input
                value={form.question}
                onChange={e => setForm(f => ({ ...f, question: e.target.value }))}
                placeholder="What would you like to ask?"
              />
            </div>
            <div className="space-y-2">
              <Label>Options</Label>
              {form.options.map((opt, idx) => (
                <div key={idx} className="flex gap-2">
                  <Input
                    value={opt}
                    onChange={e => {
                      const opts = [...form.options];
                      opts[idx] = e.target.value;
                      setForm(f => ({ ...f, options: opts }));
                    }}
                    placeholder={`Option ${idx + 1}`}
                  />
                  {form.options.length > 2 && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="h-11 w-11 rounded-full text-red-500 hover:text-red-600 hover:bg-red-50 shrink-0"
                      onClick={() => setForm(f => ({ ...f, options: f.options.filter((_, i) => i !== idx) }))}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  )}
                </div>
              ))}
              <Button
                type="button"
                variant="outline"
                className="h-10 rounded-full px-5 border-dashed border-[#8ae47e] text-[#256c1d] hover:bg-[#eaf6e6]"
                onClick={() => setForm(f => ({ ...f, options: [...f.options, ''] }))}
              >
                <Plus className="w-4 h-4 mr-1" /> Add Option
              </Button>
            </div>
            <div className="space-y-1">
              <Label>Expires On (optional)</Label>
              <Input
                type="date"
                value={form.expiresAt}
                onChange={e => setForm(f => ({ ...f, expiresAt: e.target.value }))}
              />
            </div>
            <div className="flex items-center gap-3 rounded-2xl bg-[#f4f6f3] p-4">
              <Switch
                checked={form.allowMultiple}
                onCheckedChange={v => setForm(f => ({ ...f, allowMultiple: v }))}
              />
              <Label>Allow multiple choices</Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" className="h-11 px-6 rounded-full" onClick={() => setCreateOpen(false)}>Cancel</Button>
            <Button className="h-11 px-6 rounded-full bg-[#8ae47e] hover:bg-[#7bd96f] text-[#0b1d14] font-semibold" onClick={handleCreate}>Create Poll</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
