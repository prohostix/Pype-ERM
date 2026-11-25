import { useState, useEffect } from 'react';
import { RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import api from '@/lib/api';
import { ListPagination } from '@/components/ui/list-pagination';
import { toast } from 'sonner';

import { CS } from '@/lib/currency';
interface TeamMember {
  id: string;
  name: string;
  designation: string;
  status: string;
  enrollments: number;
  revenue: number;
  targetCount: number;
  targetTotal: number;
  targetProgress: number;
  score: number;
}

const scoreColor = (score: number) => {
  if (score >= 75) return 'text-[#256c1d]';
  if (score >= 50) return 'text-amber-600';
  return 'text-slate-600';
};

export function TeamPerformancePanel() {
  const [team, setTeam] = useState<TeamMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const fetch = async () => {
    setLoading(true);
    try {
      const res = await api.get('/sales/team-performance');
      setTeam(res.data.data || []);
    } catch (err: any) {
      setTeam([]);
      toast.error(err.response?.data?.message || 'Failed to load team performance');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetch(); }, []);

  const totalEnrollments = team.reduce((s, m) => s + m.enrollments, 0);
  const totalRevenue = team.reduce((s, m) => s + m.revenue, 0);
  const avgScore = team.length ? Math.round(team.reduce((s, m) => s + m.score, 0) / team.length) : 0;

  const safePage = Math.min(page, Math.max(1, Math.ceil(team.length / pageSize)));
  const rows = team.slice((safePage - 1) * pageSize, safePage * pageSize);
  const topPerformer = team[0];

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-2xl sm:text-3xl font-semibold tracking-tight">My Team</h2>
          <p className="text-muted-foreground text-sm mt-1.5">Sales performance &amp; enrollment stats for your team</p>
        </div>
        <Button variant="outline" onClick={fetch} disabled={loading} className="h-11 px-5 rounded-full bg-white border-slate-200 hover:bg-[#eaf6e6]">
          <RefreshCw className={cn('w-4 h-4 mr-2', loading && 'animate-spin')} />
          Refresh
        </Button>
      </div>

      {/* Summary strip */}
      <div className="rounded-3xl bg-white border border-slate-100 overflow-hidden">
        <div className="grid grid-cols-2 lg:grid-cols-5 divide-x divide-y lg:divide-y-0 divide-slate-100">
          <div className="p-5 sm:p-6">
            <p className="text-sm font-medium text-slate-500">Team Size</p>
            <p className="text-3xl font-semibold tracking-tight text-slate-900 mt-2">{loading ? '...' : team.length}</p>
          </div>
          <div className="p-5 sm:p-6">
            <p className="text-sm font-medium text-slate-500">Total Enrollments</p>
            <p className="text-3xl font-semibold tracking-tight text-slate-900 mt-2">{loading ? '...' : totalEnrollments}</p>
          </div>
          <div className="p-5 sm:p-6">
            <p className="text-sm font-medium text-slate-500">Total Revenue</p>
            <p className="text-3xl font-semibold tracking-tight text-slate-900 mt-2 truncate">{loading ? '...' : `${CS()}${totalRevenue.toLocaleString()}`}</p>
          </div>
          <div className="p-5 sm:p-6">
            <p className="text-sm font-medium text-slate-500">Avg Target Progress</p>
            <p className={cn('text-3xl font-semibold tracking-tight mt-2', scoreColor(avgScore))}>{loading ? '...' : `${avgScore}%`}</p>
          </div>
          <div className="p-5 sm:p-6 col-span-2 lg:col-span-1">
            <p className="text-sm font-medium text-slate-500">Top Performer</p>
            <p className="text-xl font-semibold tracking-tight text-slate-900 mt-2 truncate">{loading ? '...' : (topPerformer?.name || '—')}</p>
            {topPerformer && <p className="text-xs text-muted-foreground mt-1">Score {topPerformer.score}</p>}
          </div>
        </div>
      </div>

      {/* Team leaderboard */}
      <div className="rounded-3xl bg-white border border-slate-100 overflow-hidden">
        <div className="px-6 py-5 flex items-center justify-between border-b border-slate-100">
          <div>
            <h3 className="text-lg font-semibold tracking-tight">Team Leaderboard</h3>
            <p className="text-sm text-muted-foreground mt-0.5">Ranked by target progress</p>
          </div>
          {!loading && <span className="rounded-full bg-[#eaf6e6] text-[#256c1d] text-xs font-semibold px-3 py-1">{team.length} members</span>}
        </div>
        <div className="p-4 sm:p-5">
          {loading ? (
            <div className="space-y-3">
              {[1, 2, 3].map(i => <div key={i} className="h-20 bg-slate-100 rounded-2xl animate-pulse" />)}
            </div>
          ) : team.length === 0 ? (
            <div className="py-14 text-center text-muted-foreground">
              <p className="font-medium text-slate-900">No teammates found</p>
              <p className="text-sm mt-1">Team members in your department will appear here.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {rows.map((member, idx) => {
                const rank = (safePage - 1) * pageSize + idx + 1;
                return (
                  <div key={member.id} className="flex flex-col lg:flex-row lg:items-center gap-4 p-4 sm:p-5 rounded-2xl bg-[#f4f6f3] hover:bg-[#eef5ec] transition-colors">
                    <div className="flex items-center gap-4 flex-1 min-w-0">
                      <span className={cn('w-9 h-9 rounded-full flex items-center justify-center text-sm font-semibold shrink-0', rank === 1 ? 'bg-[#8ae47e] text-[#0b1d14]' : 'bg-white text-slate-600')}>
                        {rank}
                      </span>
                      <div className="w-11 h-11 rounded-2xl bg-white text-slate-700 flex items-center justify-center font-semibold shrink-0">
                        {(member.name?.trim()?.[0] || '?').toUpperCase()}
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="font-semibold text-slate-900 truncate">{member.name}</p>
                          <span className={cn('rounded-full px-2.5 py-0.5 text-[10px] font-semibold capitalize', member.status === 'active' ? 'bg-[#dff3da] text-[#256c1d]' : 'bg-slate-200/70 text-slate-600')}>{member.status}</span>
                        </div>
                        <p className="text-xs text-muted-foreground truncate">{member.designation}</p>
                      </div>
                    </div>

                    <div className="grid grid-cols-4 gap-4 items-center lg:flex lg:gap-8 lg:shrink-0">
                      <div className="text-center">
                        <p className="text-[11px] text-slate-500">Enrollments</p>
                        <p className="font-semibold text-lg text-slate-900">{member.enrollments}</p>
                      </div>
                      <div className="text-center">
                        <p className="text-[11px] text-slate-500">Revenue</p>
                        <p className="font-semibold text-lg text-slate-900">{CS()}{member.revenue.toLocaleString()}</p>
                      </div>
                      <div className="text-center lg:min-w-[120px]">
                        <p className="text-[11px] text-slate-500">Target ({member.targetTotal})</p>
                        <div className="h-2 w-full lg:w-28 bg-white rounded-full overflow-hidden mt-2 mx-auto">
                          <div className="h-full rounded-full bg-[#54b947]" style={{ width: `${Math.min(100, member.targetProgress)}%` }} />
                        </div>
                        <p className="text-[11px] text-muted-foreground mt-1">{member.targetProgress}% achieved</p>
                      </div>
                      <div className="text-center lg:min-w-[56px]">
                        <p className="text-[11px] text-slate-500">Score</p>
                        <p className={cn('text-xl font-semibold', scoreColor(member.score))}>{member.score}</p>
                      </div>
                    </div>
                  </div>
                );
              })}
              <ListPagination
                total={team.length}
                page={safePage}
                pageSize={pageSize}
                onPageChange={setPage}
                onPageSizeChange={(n) => { setPageSize(n); setPage(1); }}
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
