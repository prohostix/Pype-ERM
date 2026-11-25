import { useState, useEffect } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { ReportHeader, ReportCard, ReportStats, ReportEmpty, ReportLoading, downloadCsv, reportTooltipStyle, reportGridStroke } from './ReportKit';
import { toast } from 'sonner';
import api from '@/lib/api';

export function UniversityReportPanel() {
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<any>(null);

  const fetchReport = async () => {
    setLoading(true);
    try {
      const res = await api.get('/operations/reports/universities');
      setData(res.data);
    } catch (error) {
      console.error('Failed to fetch university report', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReport();
  }, []);

  const handleExport = () => {
    const rows = (data?.data || []).map((u: any) => ({
      University: u.name, Code: u.code, Status: u.status, Country: u.country || '',
      Students: u.totalStudents, Admitted: u.admitted, Pending: u.pending, Completed: u.completed,
      Programs: u.totalPrograms, Sessions: u.totalSessions, 'Open Sessions': u.openSessions,
    }));
    if (!downloadCsv('university_report.csv', rows)) toast.warning('No data to export');
  };

  return (
    <div className="space-y-6">
      <ReportHeader
        title="University Report"
        description="Track metrics and performance across all universities"
        loading={loading}
        onRefresh={fetchReport}
        onExport={handleExport}
      />

      {!data && loading ? (
        <ReportLoading />
      ) : !data ? (
        <div className="rounded-3xl bg-white border border-slate-100 py-16 text-center text-sm text-muted-foreground">No data available.</div>
      ) : (
        <div className="space-y-4">
          <ReportStats
            items={[
              { label: 'Total Universities', value: data.totalUniversities },
              { label: 'Active', value: data.summary?.active ?? 0, tone: 'good' },
              { label: 'Total Students', value: data.summary?.totalStudents ?? 0 },
              { label: 'Total Programs', value: data.summary?.totalPrograms ?? 0 },
              { label: 'Avg. Students / University', value: data.summary?.avgStudents ?? 0, note: `${data.summary?.withoutStudents ?? 0} with no students` },
            ]}
          />

          <div className="grid gap-4 grid-cols-1 lg:grid-cols-2">
            <ReportCard title="Students per University">
              <div className="h-[340px]">
                {data.data?.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={data.data}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={reportGridStroke} />
                      <XAxis dataKey="code" axisLine={false} tickLine={false} />
                      <YAxis allowDecimals={false} axisLine={false} tickLine={false} />
                      <Tooltip cursor={{ fill: '#f4f6f3' }} contentStyle={reportTooltipStyle} />
                      <Bar dataKey="totalStudents" name="Students Enrolled" fill="#54b947" radius={[10, 10, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                ) : <ReportEmpty message="No student data by university" />}
              </div>
            </ReportCard>

            <ReportCard title="Programs per University">
              <div className="h-[340px]">
                {data.data?.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={data.data} layout="vertical" margin={{ left: 40 }}>
                      <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke={reportGridStroke} />
                      <XAxis type="number" allowDecimals={false} axisLine={false} tickLine={false} />
                      <YAxis dataKey="name" type="category" width={140} tick={{ fontSize: 12 }} axisLine={false} tickLine={false} />
                      <Tooltip cursor={{ fill: '#f4f6f3' }} contentStyle={reportTooltipStyle} />
                      <Bar dataKey="totalPrograms" name="Active Programs" fill="#8ae47e" radius={[0, 10, 10, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                ) : <ReportEmpty message="No programs data by university" />}
              </div>
            </ReportCard>
          </div>

          <ReportCard title="University Details" subtitle="Students, programs and admission sessions per university">
            {data.data?.length > 0 ? (
              <div className="space-y-3">
                {data.data.map((u: any) => (
                  <div key={u.id} className="rounded-2xl bg-[#f4f6f3] p-4 sm:p-5 flex flex-col lg:flex-row lg:items-center justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-semibold text-slate-900">{u.name}</span>
                        <span className="rounded-full bg-white px-3 py-0.5 text-xs font-semibold font-mono text-slate-700">{u.code}</span>
                        <span className={`rounded-full px-3 py-0.5 text-[11px] font-semibold capitalize ${u.status === 'active' ? 'bg-[#dff3da] text-[#256c1d]' : 'bg-slate-200/70 text-slate-600'}`}>{u.status}</span>
                      </div>
                      {u.country && <p className="text-xs text-muted-foreground mt-1">{u.country}</p>}
                    </div>
                    <div className="grid grid-cols-3 sm:grid-cols-6 gap-4 text-center lg:text-right">
                      {[
                        ['Students', u.totalStudents], ['Admitted', u.admitted], ['Pending', u.pending],
                        ['Programs', u.totalPrograms], ['Sessions', u.totalSessions], ['Open', u.openSessions],
                      ].map(([k, v]) => (
                        <div key={k as string}><p className="text-[11px] text-slate-500">{k}</p><p className="text-lg font-semibold text-slate-900">{v}</p></div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            ) : <ReportEmpty message="No universities found" />}
          </ReportCard>
        </div>
      )}
    </div>
  );
}
