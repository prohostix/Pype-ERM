import { useState, useEffect, useMemo } from 'react';
import { Search } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, Legend, ResponsiveContainer } from 'recharts';
import { ListPagination } from '@/components/ui/list-pagination';
import { ReportHeader, ReportCard, ReportStats, RankList, ReportLoading, REPORT_COLORS, reportTooltipStyle, reportGridStroke } from './ReportKit';
import api from '@/lib/api';
import { toast } from 'sonner';


export function StudentReportPanel() {
  const [students, setStudents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [programFilter, setProgramFilter] = useState('all');

  // Pagination State
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);

  // Reset to first page when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, statusFilter, programFilter]);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const res = await api.get('/students');
      if (res.data.success) {
        setStudents(res.data.data);
      }
    } catch (err: any) {
      toast.error(err.message || 'Failed to fetch students data');
    } finally {
      setLoading(false);
    }
  };

  // Extract unique programs for the filter dropdown
  const uniquePrograms = useMemo(() => {
    const programs = new Set<string>();
    students.forEach(s => {
      if (s.program?.name) programs.add(s.program.name);
    });
    return Array.from(programs).sort();
  }, [students]);

  // Apply filters
  const filteredStudents = useMemo(() => {
    return students.filter(student => {
      const matchesSearch = 
        (student.name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (student.email || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (student.phone || '').includes(searchTerm);
      
      const matchesStatus = statusFilter === 'all' || 
        (statusFilter === 'completed' ? student.isPrevious === true : student.status === statusFilter && student.isPrevious !== true);
        
      const matchesProgram = programFilter === 'all' || student.program?.name === programFilter;

      return matchesSearch && matchesStatus && matchesProgram;
    });
  }, [students, searchTerm, statusFilter, programFilter]);

  const paginatedStudents = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filteredStudents.slice(start, start + itemsPerPage);
  }, [filteredStudents, currentPage, itemsPerPage]);

  // Aggregate Data for Charts
  const programData = useMemo(() => {
    const counts: Record<string, number> = {};
    filteredStudents.forEach(s => {
      const p = s.program?.name || 'Unknown';
      counts[p] = (counts[p] || 0) + 1;
    });
    return Object.keys(counts).map(key => ({ name: key, value: counts[key] }));
  }, [filteredStudents]);

  const statusData = useMemo(() => {
    const counts: Record<string, number> = {
      pending: 0,
      admitted: 0,
      cancelled: 0,
      completed: 0
    };
    filteredStudents.forEach(s => {
      if (s.isPrevious) {
        counts.completed++;
      } else if (counts[s.status] !== undefined) {
        counts[s.status]++;
      } else {
        counts[s.status] = 1;
      }
    });
    return Object.keys(counts).map(key => ({ 
      name: key.charAt(0).toUpperCase() + key.slice(1), 
      count: counts[key] 
    }));
  }, [filteredStudents]);

  const tally = (keyOf: (s: any) => string) => {
    const m: Record<string, number> = {};
    filteredStudents.forEach(s => { const k = keyOf(s); m[k] = (m[k] || 0) + 1; });
    return Object.keys(m).map(k => ({ name: k, value: m[k] })).sort((a, b) => b.value - a.value);
  };
  const title = (v: string) => v.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
  const byBranch = useMemo(() => tally(s => s.branch?.name || 'Main Office'), [filteredStudents]);
  const byCenter = useMemo(() => tally(s => s.center?.name || 'Direct').slice(0, 10), [filteredStudents]);
  const byUniversity = useMemo(() => tally(s => s.university?.name || 'Unknown').slice(0, 10), [filteredStudents]);
  const byGender = useMemo(() => tally(s => title(s.gender || 'Not specified')), [filteredStudents]);
  const bySource = useMemo(() => tally(s => title(s.source || 'Direct')), [filteredStudents]);
  const joinTrend = useMemo(() => {
    const today = new Date();
    const months: { name: string; count: number; key: string }[] = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date(today.getFullYear(), today.getMonth() - i, 1);
      months.push({ key: `${d.getFullYear()}-${d.getMonth()}`, name: d.toLocaleDateString('en-US', { month: 'short', year: 'numeric' }), count: 0 });
    }
    filteredStudents.forEach(s => {
      if (!s.joinDate) return;
      const d = new Date(s.joinDate);
      const m = months.find(x => x.key === `${d.getFullYear()}-${d.getMonth()}`);
      if (m) m.count++;
    });
    return months;
  }, [filteredStudents]);
  const thisMonthJoins = joinTrend[joinTrend.length - 1]?.count ?? 0;
  const lastMonthJoins = joinTrend[joinTrend.length - 2]?.count ?? 0;
  const withEnrollmentNo = filteredStudents.filter(s => !!s.enrollmentNo).length;

  const handleExportCSV = async () => {
    try {
      if (filteredStudents.length === 0) {
        toast.warning('No data to export');
        return;
      }
      
      const XLSX = await import('xlsx');
      
      const exportData = filteredStudents.map(student => ({
        'Name': student.name,
        'Email': student.email,
        'Phone': student.phone,
        'Enrollment No': student.enrollmentNo || 'N/A',
        'Status': student.isPrevious ? 'Completed' : (student.status.charAt(0).toUpperCase() + student.status.slice(1)),
        'Program': student.program?.name || 'N/A',
        'Branch': student.branch?.name || 'Main Office',
        'Center': student.center?.name || 'N/A',
        'University': student.university?.name || 'N/A',
        'Join Date': new Date(student.joinDate).toLocaleDateString(),
      }));

      const worksheet = XLSX.utils.json_to_sheet(exportData);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, 'Students Report');
      XLSX.writeFile(workbook, 'student_report.xlsx');
      
      toast.success('Report exported successfully');
    } catch (err) {
      console.error(err);
      toast.error('Failed to export report');
    }
  };

  const fieldCls = 'h-11 rounded-full bg-white border-slate-200 px-5 font-semibold';
  const statusPill = (student: any) =>
    student.isPrevious ? 'bg-violet-100 text-violet-700'
      : student.status === 'admitted' ? 'bg-[#dff3da] text-[#256c1d]'
      : student.status === 'cancelled' ? 'bg-red-100 text-red-700'
      : 'bg-amber-100 text-amber-700';

  return (
    <div className="space-y-6 wizard-form">
      <ReportHeader
        title="Student Report"
        description="Comprehensive analytics and reporting for students"
        onExport={handleExportCSV}
      />

      {/* Filters */}
      <div className="rounded-3xl bg-white border border-slate-100 p-4 grid grid-cols-1 md:grid-cols-3 gap-3">
        <div className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <Input
            placeholder="Search students..."
            className="pl-11 h-11 rounded-full bg-[#f4f6f3] border-transparent"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className={fieldCls + (statusFilter !== 'all' ? ' !bg-[#8ae47e] !border-[#8ae47e] !text-[#0b1d14]' : '')}>
            <SelectValue placeholder="Filter by Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            <SelectItem value="pending">Pending</SelectItem>
            <SelectItem value="admitted">Admitted</SelectItem>
            <SelectItem value="cancelled">Cancelled</SelectItem>
            <SelectItem value="completed">Completed</SelectItem>
          </SelectContent>
        </Select>
        <Select value={programFilter} onValueChange={setProgramFilter}>
          <SelectTrigger className={fieldCls + (programFilter !== 'all' ? ' !bg-[#8ae47e] !border-[#8ae47e] !text-[#0b1d14]' : '')}>
            <SelectValue placeholder="Filter by Program" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Programs</SelectItem>
            {uniquePrograms.map(p => (
              <SelectItem key={p} value={p}>{p}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {loading ? (
        <ReportLoading />
      ) : (
        <>
          <ReportStats
            items={[
              { label: 'Total Students', value: filteredStudents.length },
              { label: 'Active (Admitted)', value: filteredStudents.filter(s => s.status === 'admitted' && !s.isPrevious).length, tone: 'good' },
              { label: 'Completed', value: filteredStudents.filter(s => s.isPrevious).length },
              { label: 'Pending', value: filteredStudents.filter(s => s.status === 'pending' && !s.isPrevious).length, tone: 'warn' },
              { label: 'Joined This Month', value: thisMonthJoins, note: lastMonthJoins > 0 ? `${thisMonthJoins >= lastMonthJoins ? '+' : ''}${Math.round(((thisMonthJoins - lastMonthJoins) / lastMonthJoins) * 100)}% vs last month` : 'No previous month to compare' },
              { label: 'With Enrollment No.', value: withEnrollmentNo, note: filteredStudents.length ? `${Math.round((withEnrollmentNo / filteredStudents.length) * 100)}% of students` : undefined },
            ]}
          />

          {/* Charts */}
          {filteredStudents.length > 0 && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <ReportCard title="Students by Program">
                <div className="h-[300px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={programData} cx="50%" cy="50%" innerRadius={55} outerRadius={90} paddingAngle={3} dataKey="value">
                        {programData.map((_, index) => (
                          <Cell key={`cell-${index}`} fill={REPORT_COLORS[index % REPORT_COLORS.length]} />
                        ))}
                      </Pie>
                      <RechartsTooltip contentStyle={reportTooltipStyle} />
                      <Legend iconType="circle" wrapperStyle={{ fontSize: 12 }} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </ReportCard>

              <ReportCard title="Students by Status">
                <div className="h-[300px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={statusData} margin={{ top: 10, right: 20, left: 0, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={reportGridStroke} />
                      <XAxis dataKey="name" axisLine={false} tickLine={false} />
                      <YAxis allowDecimals={false} axisLine={false} tickLine={false} />
                      <RechartsTooltip cursor={{ fill: '#f4f6f3' }} contentStyle={reportTooltipStyle} />
                      <Bar dataKey="count" fill="#54b947" radius={[10, 10, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </ReportCard>
            </div>
          )}

          {filteredStudents.length > 0 && (
            <>
              <ReportCard title="New Students per Month" subtitle="Last 6 months, based on join date">
                <div className="h-[260px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={joinTrend}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={reportGridStroke} />
                      <XAxis dataKey="name" axisLine={false} tickLine={false} />
                      <YAxis allowDecimals={false} axisLine={false} tickLine={false} />
                      <RechartsTooltip cursor={{ fill: '#f4f6f3' }} contentStyle={reportTooltipStyle} />
                      <Bar dataKey="count" name="New students" fill="#54b947" radius={[10, 10, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </ReportCard>

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                <ReportCard title="By Branch"><RankList rows={byBranch} /></ReportCard>
                <ReportCard title="By University" subtitle="Top 10"><RankList rows={byUniversity} /></ReportCard>
                <ReportCard title="By Study Center" subtitle="Top 10"><RankList rows={byCenter} /></ReportCard>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                <ReportCard title="By Gender"><RankList rows={byGender} /></ReportCard>
                <ReportCard title="By Source"><RankList rows={bySource} /></ReportCard>
              </div>
            </>
          )}

          {/* Student directory */}
          <div className="rounded-3xl bg-white border border-slate-100 overflow-hidden">
            <div className="px-6 py-5 flex items-center justify-between border-b border-slate-100">
              <h3 className="text-lg font-semibold tracking-tight">Student Directory</h3>
              <span className="rounded-full bg-[#eaf6e6] text-[#256c1d] text-xs font-semibold px-3 py-1">{filteredStudents.length} students</span>
            </div>
            <div className="p-4 sm:p-5">
              {filteredStudents.length === 0 ? (
                <div className="py-14 text-center text-sm text-muted-foreground">No students found matching the selected filters.</div>
              ) : (
                <div className="space-y-3">
                  {paginatedStudents.map((student) => (
                    <div key={student.id} className="flex flex-col md:flex-row md:items-center justify-between gap-3 p-4 sm:p-5 rounded-2xl bg-[#f4f6f3] hover:bg-[#eef5ec] transition-colors">
                      <div className="min-w-0">
                        <div className="font-semibold text-slate-900">{student.name}</div>
                        <div className="text-xs text-muted-foreground mt-0.5">{student.email}{student.phone ? ` · ${student.phone}` : ''}</div>
                        <div className="text-xs text-slate-600 mt-1.5">
                          {student.program?.name || '-'} · {student.branch?.name || 'Main Office'}
                        </div>
                      </div>
                      <div className="flex items-center gap-3 md:justify-end">
                        <span className="text-xs text-muted-foreground">Joined {new Date(student.joinDate).toLocaleDateString()}</span>
                        <span className={`rounded-full px-3 py-1 text-[11px] font-semibold capitalize ${statusPill(student)}`}>
                          {student.isPrevious ? 'Completed' : student.status}
                        </span>
                      </div>
                    </div>
                  ))}
                  <ListPagination
                    total={filteredStudents.length}
                    page={Math.min(currentPage, Math.max(1, Math.ceil(filteredStudents.length / itemsPerPage)))}
                    pageSize={itemsPerPage}
                    onPageChange={setCurrentPage}
                    onPageSizeChange={(n) => { setItemsPerPage(n); setCurrentPage(1); }}
                  />
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
