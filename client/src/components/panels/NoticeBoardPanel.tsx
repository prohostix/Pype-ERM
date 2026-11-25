import { useState, useEffect } from 'react';
import { Megaphone, CalendarDays, BarChart2, RefreshCw, CheckCircle } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from 'sonner';
import api from '@/lib/api';
import { useAuth } from '@/hooks/useAuth';

const PRIORITY_COLORS: Record<string, string> = {
  high: 'bg-red-100 text-red-700',
  medium: 'bg-amber-100 text-amber-700',
  low: 'bg-[#dff3da] text-[#256c1d]',
};

const TYPE_COLORS: Record<string, string> = {
  general: 'bg-blue-100 text-blue-800',
  hr: 'bg-purple-100 text-purple-800',
  ops: 'bg-orange-100 text-orange-800',
  finance: 'bg-emerald-100 text-emerald-800',
  sales: 'bg-cyan-100 text-cyan-800',
};

const HOLIDAY_TYPE_COLORS: Record<string, string> = {
  national: 'bg-blue-100 text-blue-800',
  regional: 'bg-purple-100 text-purple-800',
  company: 'bg-green-100 text-green-800',
};

export function NoticeBoardPanel() {
  const { user } = useAuth();
  const [announcements, setAnnouncements] = useState<any[]>([]);
  const [holidays, setHolidays] = useState<any[]>([]);
  const [polls, setPolls] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [votedPolls, setVotedPolls] = useState<Record<string, number[]>>({});

  useEffect(() => { fetchAll(); }, []);

  const fetchAll = async () => {
    setLoading(true);
    try {
      const [aRes, hRes, pRes] = await Promise.all([
        api.get('/hr/announcements'),
        api.get('/hr/holidays'),
        api.get('/hr/polls'),
      ]);
      setAnnouncements(aRes.data.data || []);
      setHolidays(hRes.data.data || []);
      setPolls((pRes.data.data || []).filter((p: any) => p.isActive));
    } catch { toast.error('Failed to load notice board'); }
    finally { setLoading(false); }
  };

  const handleVote = async (pollId: string, optionIndex: number) => {
    const poll = polls.find(p => p.id === pollId);
    if (!poll) return;
    const current = votedPolls[pollId] || [];
    let newIndexes: number[];
    if (poll.allowMultiple) {
      newIndexes = current.includes(optionIndex)
        ? current.filter((i: number) => i !== optionIndex)
        : [...current, optionIndex];
    } else {
      newIndexes = [optionIndex];
    }
    try {
      await api.post(`/hr/polls/${pollId}/vote`, { optionIndexes: newIndexes });
      setVotedPolls(prev => ({ ...prev, [pollId]: newIndexes }));
      fetchAll();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to vote');
    }
  };

  const totalVotes = (poll: any) => poll.options.reduce((s: number, o: any) => s + o.votes.length, 0);
  const pct = (votes: number, total: number) => total === 0 ? 0 : Math.round((votes / total) * 100);
  const hasVoted = (poll: any) => {
    const uid = user?.id || (user as any)?.id;
    return poll.options.some((o: any) => o.votes.includes(uid));
  };
  const myVotes = (poll: any) => {
    const uid = user?.id || (user as any)?.id;
    return poll.options.map((o: any, i: number) => o.votes.includes(uid) ? i : -1).filter((i: number) => i >= 0);
  };

  const upcomingHolidays = holidays
    .filter(h => new Date(h.date) >= new Date())
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-2xl sm:text-3xl font-semibold tracking-tight">Notice Board</h2>
          <p className="text-muted-foreground text-sm mt-1.5">Announcements, holidays, and polls from HR</p>
        </div>
        <Button variant="outline" onClick={fetchAll} className="h-11 px-5 rounded-full bg-white border-slate-200 hover:bg-[#eaf6e6]">
          <RefreshCw className="w-4 h-4 mr-2" /> Refresh
        </Button>
      </div>

      <Tabs defaultValue="announcements">
        <TabsList className="h-auto flex-wrap gap-1.5 bg-white p-2 rounded-3xl border border-slate-100 w-fit max-w-full">
          <TabsTrigger value="announcements" className="rounded-full px-4 py-2 text-sm font-semibold text-slate-600 data-[state=active]:bg-[#8ae47e] data-[state=active]:text-[#0b1d14] data-[state=active]:shadow-none">
            <Megaphone className="w-4 h-4 mr-1.5" />
            Announcements {announcements.length > 0 && `(${announcements.length})`}
          </TabsTrigger>
          <TabsTrigger value="holidays" className="rounded-full px-4 py-2 text-sm font-semibold text-slate-600 data-[state=active]:bg-[#8ae47e] data-[state=active]:text-[#0b1d14] data-[state=active]:shadow-none">
            <CalendarDays className="w-4 h-4 mr-1.5" />
            Holidays {upcomingHolidays.length > 0 && `(${upcomingHolidays.length})`}
          </TabsTrigger>
          <TabsTrigger value="polls" className="rounded-full px-4 py-2 text-sm font-semibold text-slate-600 data-[state=active]:bg-[#8ae47e] data-[state=active]:text-[#0b1d14] data-[state=active]:shadow-none">
            <BarChart2 className="w-4 h-4 mr-1.5" />
            Polls {polls.length > 0 && `(${polls.length})`}
          </TabsTrigger>
        </TabsList>

        {/* Announcements */}
        <TabsContent value="announcements" className="mt-6">
          {loading ? (
            <div className="space-y-3">{[1,2,3].map(i => <div key={i} className="h-24 bg-slate-100 rounded-3xl animate-pulse" />)}</div>
          ) : announcements.length === 0 ? (
            <div className="rounded-3xl bg-white border border-slate-100 py-14 text-center text-muted-foreground"><div className="w-14 h-14 rounded-2xl bg-[#eaf6e6] text-[#256c1d] flex items-center justify-center mx-auto mb-3"><Megaphone className="w-6 h-6" /></div><p className="text-sm">No announcements</p></div>
          ) : (
            <div className="space-y-3">
              {announcements.map(a => (
                <Card key={a.id} className={`rounded-3xl bg-white shadow-none py-0 gap-0 border ${a.priority === 'high' ? 'border-red-200' : 'border-slate-100'}`}>
                  <CardContent className="p-5 sm:p-6">
                    <div className="flex items-start gap-3">
                      <div className="w-11 h-11 rounded-2xl bg-[#eaf6e6] text-[#256c1d] flex items-center justify-center shrink-0">
                        <Megaphone className="w-5 h-5" />
                      </div>
                      <div className="flex-1">
                        <p className="font-semibold text-slate-900">{a.title}</p>
                        <p className="text-sm text-muted-foreground mt-1">{a.content}</p>
                        <div className="flex flex-wrap gap-2 mt-2">
                          <Badge className={`text-xs rounded-full border-0 px-3 ${TYPE_COLORS[a.type] || ''}`}>{a.type}</Badge>
                          <Badge className={`text-xs rounded-full border-0 px-3 ${PRIORITY_COLORS[a.priority] || ''}`}>{a.priority}</Badge>
                          {a.postedBy?.name && <span className="text-xs text-muted-foreground">— {a.postedBy.name}</span>}
                          <span className="text-xs text-muted-foreground">{new Date(a.postedAt || a.createdAt).toLocaleDateString()}</span>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        {/* Holidays */}
        <TabsContent value="holidays" className="mt-6">
          {loading ? (
            <div className="space-y-3">{[1,2,3].map(i => <div key={i} className="h-20 bg-slate-100 rounded-3xl animate-pulse" />)}</div>
          ) : holidays.length === 0 ? (
            <div className="rounded-3xl bg-white border border-slate-100 py-14 text-center text-muted-foreground"><div className="w-14 h-14 rounded-2xl bg-[#eaf6e6] text-[#256c1d] flex items-center justify-center mx-auto mb-3"><CalendarDays className="w-6 h-6" /></div><p className="text-sm">No holidays published yet</p></div>
          ) : (
            <div className="space-y-3">
              {/* Upcoming */}
              {upcomingHolidays.length > 0 && (
                <div>
                  <p className="text-sm font-semibold text-muted-foreground mb-2">Upcoming</p>
                  <div className="space-y-2">
                    {upcomingHolidays.map(h => {
                      const d = new Date(h.date);
                      const isToday = d.toDateString() === new Date().toDateString();
                      return (
                        <Card key={h.id} className={`rounded-3xl bg-white shadow-none py-0 gap-0 border ${isToday ? 'border-[#8ae47e]' : 'border-slate-100'}`}>
                          <CardContent className="p-4 flex items-center gap-4">
                            <div className="flex flex-col items-center justify-center w-14 h-14 bg-[#eaf6e6] text-[#256c1d] rounded-2xl shrink-0">
                              <span className="text-lg font-bold leading-none">{d.getDate()}</span>
                              <span className="text-xs text-muted-foreground uppercase">{d.toLocaleDateString('en-US', { month: 'short' })}</span>
                            </div>
                            <div className="flex-1">
                              <p className="font-semibold text-sm">{h.name}</p>
                              <p className="text-xs text-muted-foreground">{d.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>
                            </div>
                            <Badge className={`text-xs rounded-full border-0 px-3 ${HOLIDAY_TYPE_COLORS[h.type] || ''}`}>{h.type}</Badge>
                            {isToday && <Badge className="text-xs rounded-full bg-[#8ae47e] text-[#0b1d14] border-0 px-3">Today</Badge>}
                          </CardContent>
                        </Card>
                      );
                    })}
                  </div>
                </div>
              )}
              {/* Past */}
              {holidays.filter(h => new Date(h.date) < new Date()).length > 0 && (
                <div>
                  <p className="text-sm font-semibold text-muted-foreground mb-2 mt-4">Past</p>
                  <div className="space-y-2 opacity-60">
                    {holidays.filter(h => new Date(h.date) < new Date()).map(h => {
                      const d = new Date(h.date);
                      return (
                        <div key={h.id} className="flex items-center gap-4 p-4 rounded-3xl bg-[#f4f6f3]">
                          <div className="flex flex-col items-center justify-center w-14 h-14 bg-white rounded-2xl shrink-0">
                            <span className="text-lg font-bold leading-none">{d.getDate()}</span>
                            <span className="text-xs text-muted-foreground uppercase">{d.toLocaleDateString('en-US', { month: 'short' })}</span>
                          </div>
                          <div className="flex-1">
                            <p className="font-medium text-sm">{h.name}</p>
                            <p className="text-xs text-muted-foreground">{d.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>
                          </div>
                          <Badge variant="outline" className="text-xs rounded-full bg-white border-0 px-3">{h.type}</Badge>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          )}
        </TabsContent>

        {/* Polls */}
        <TabsContent value="polls" className="mt-6">
          {loading ? (
            <div className="space-y-4">{[1,2].map(i => <div key={i} className="h-44 bg-slate-100 rounded-3xl animate-pulse" />)}</div>
          ) : polls.length === 0 ? (
            <div className="rounded-3xl bg-white border border-slate-100 py-14 text-center text-muted-foreground"><div className="w-14 h-14 rounded-2xl bg-[#eaf6e6] text-[#256c1d] flex items-center justify-center mx-auto mb-3"><BarChart2 className="w-6 h-6" /></div><p className="text-sm">No active polls</p></div>
          ) : (
            <div className="space-y-4">
              {polls.map(poll => {
                const total = totalVotes(poll);
                const voted = hasVoted(poll);
                const myVoteIdxs = myVotes(poll);
                const expired = poll.expiresAt && new Date(poll.expiresAt) < new Date();
                const canVote = !expired;

                return (
                  <Card key={poll.id} className="rounded-3xl bg-white border border-slate-100 shadow-none py-6 gap-4">
                    <CardHeader className="px-6 pb-0">
                      <CardTitle className="text-base font-semibold">{poll.question}</CardTitle>
                      <div className="flex flex-wrap gap-2">
                        {poll.allowMultiple && <Badge variant="outline" className="text-xs rounded-full bg-[#f4f6f3] border-0">Multi-choice</Badge>}
                        {poll.expiresAt && <span className="text-xs text-muted-foreground">Expires {new Date(poll.expiresAt).toLocaleDateString()}</span>}
                        <span className="text-xs text-muted-foreground">{total} vote{total !== 1 ? 's' : ''}</span>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-2 px-6">
                      {poll.options.map((opt: any, idx: number) => {
                        const isMyVote = myVoteIdxs.includes(idx);
                        const optPct = pct(opt.votes.length, total);
                        return (
                          <button
                            key={idx}
                            className={`w-full text-left p-4 rounded-2xl border transition-colors relative overflow-hidden ${
                              isMyVote ? 'border-[#8ae47e] bg-[#eaf6e6]' : canVote && !voted ? 'border-transparent bg-[#f4f6f3] hover:bg-[#eef5ec]' : 'border-transparent bg-[#f4f6f3] cursor-default'
                            }`}
                            onClick={() => canVote ? handleVote(poll.id, idx) : undefined}
                          >
                            {(voted || !canVote) && (
                              <div className="absolute inset-y-0 left-0 bg-[#cfe9c9]/60 rounded-2xl" style={{ width: `${optPct}%` }} />
                            )}
                            <div className="relative flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                {isMyVote && <CheckCircle className="w-4 h-4 text-[#256c1d] shrink-0" />}
                                <span className="text-sm font-medium">{opt.text}</span>
                              </div>
                              {(voted || !canVote) && (
                                <span className="text-xs font-semibold text-muted-foreground">{optPct}% ({opt.votes.length})</span>
                              )}
                            </div>
                          </button>
                        );
                      })}
                      {canVote && !voted && <p className="text-xs text-muted-foreground pt-1">Click an option to vote</p>}
                      {voted && <p className="text-xs text-[#256c1d] font-medium pt-1">You voted — click another option to change</p>}
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
