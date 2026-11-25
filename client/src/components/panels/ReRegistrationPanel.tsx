import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { RefreshCw, Search } from 'lucide-react';
import { toast } from 'sonner';
import api from '@/lib/api';
import { ListPagination } from '@/components/ui/list-pagination';

export function ReRegistrationPanel() {
  const [students, setStudents] = useState<any[]>([]);
  const [completedStudents, setCompletedStudents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedStudent, setSelectedStudent] = useState<any>(null);
  const [activeTab, setActiveTab] = useState('pending');
  const [searchQuery, setSearchQuery] = useState('');
  const [centerFilter, setCenterFilter] = useState('all');
  const [programFilter, setProgramFilter] = useState('all');

  // Pagination State
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);

  useEffect(() => {
    setCurrentPage(1);
  }, [activeTab, searchQuery, centerFilter, programFilter]);

  useEffect(() => {
    fetchStudents();
  }, []);

  const fetchStudents = async () => {
    setLoading(true);
    try {
      const [pendingRes, completedRes] = await Promise.all([
        api.get('/students?reregCompleted=false'),
        api.get('/students?reregCompleted=true')
      ]);
      setStudents(pendingRes.data.data || []);
      setCompletedStudents(completedRes.data.data || []);
    } catch (e) {
      console.error(e);
      toast.error('Failed to fetch re-registrations');
    } finally {
      setLoading(false);
    }
  };

  const allStudents = [...students, ...completedStudents];
  const centers = Array.from(new Set(allStudents.map(s => s.center?.name).filter(Boolean))).sort() as string[];
  const programs = Array.from(new Set(allStudents.map(s => s.program?.name).filter(Boolean))).sort() as string[];
  const applyFilters = (s: any) => {
    const q = searchQuery.toLowerCase();
    const matchesSearch = s.name?.toLowerCase().includes(q) ||
                          s.email?.toLowerCase().includes(q) ||
                          s.enrollmentNo?.toLowerCase().includes(q) ||
                          s.program?.name?.toLowerCase().includes(q);
    const matchesCenter = centerFilter === 'all' || s.center?.name === centerFilter;
    const matchesProgram = programFilter === 'all' || s.program?.name === programFilter;
    return matchesSearch && matchesCenter && matchesProgram;
  };
  const filteredPending = students.filter(applyFilters);
  const filteredCompleted = completedStudents.filter(applyFilters);
  const activeList = activeTab === 'pending' ? filteredPending : filteredCompleted;
  const pageCount = Math.max(1, Math.ceil(activeList.length / itemsPerPage));
  const safePage = Math.min(currentPage, pageCount);
  const pageRows = activeList.slice((safePage - 1) * itemsPerPage, safePage * itemsPerPage);
  const grouped = pageRows.reduce((acc: Record<string, any[]>, student) => {
    const uniName = student.university?.name || student.program?.university?.name || 'Unknown University';
    const progName = student.program?.name || 'Unknown Program';
    const groupKey = `${uniName} - ${progName}`;
    if (!acc[groupKey]) acc[groupKey] = [];
    acc[groupKey].push(student);
    return acc;
  }, {});
  const sel = 'h-11 rounded-full border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 outline-none focus:border-[#54b947]';

  return (
    <div className="space-y-6 wizard-form">
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-2xl sm:text-3xl font-semibold tracking-tight">Re-registration</h2>
          <p className="text-muted-foreground text-sm mt-1.5">Manage upcoming semester re-registrations</p>
        </div>
        <Button variant="outline" onClick={fetchStudents} disabled={loading} className="h-11 px-5 rounded-full bg-white border-slate-200 hover:bg-[#eaf6e6]">
          <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      <div className="rounded-3xl bg-white border border-slate-100 p-4 space-y-4">
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="h-auto bg-[#f4f6f3] p-1.5 rounded-full gap-1 w-fit max-w-full">
            <TabsTrigger value="pending" className="rounded-full px-5 py-2 text-sm font-semibold text-slate-600 data-[state=active]:bg-[#8ae47e] data-[state=active]:text-[#0b1d14] data-[state=active]:shadow-none">Pending ({students.length})</TabsTrigger>
            <TabsTrigger value="completed" className="rounded-full px-5 py-2 text-sm font-semibold text-slate-600 data-[state=active]:bg-[#8ae47e] data-[state=active]:text-[#0b1d14] data-[state=active]:shadow-none">Completed ({completedStudents.length})</TabsTrigger>
          </TabsList>
        </Tabs>
        <div className="flex flex-col lg:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <Input
              type="search"
              placeholder="Search students..."
              className="pl-11 h-11 rounded-full bg-[#f4f6f3] border-transparent"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <select className={sel + (centerFilter !== 'all' ? ' !bg-[#8ae47e] !border-[#8ae47e] !text-[#0b1d14]' : '')} value={centerFilter} onChange={e => setCenterFilter(e.target.value)}>
            <option value="all">All Centers</option>
            {centers.map(c => (<option key={c} value={c}>{c}</option>))}
          </select>
          <select className={sel + (programFilter !== 'all' ? ' !bg-[#8ae47e] !border-[#8ae47e] !text-[#0b1d14]' : '')} value={programFilter} onChange={e => setProgramFilter(e.target.value)}>
            <option value="all">All Programs</option>
            {programs.map(p => (<option key={p} value={p}>{p}</option>))}
          </select>
        </div>
      </div>

      {loading ? (
        <div className="space-y-3">{[1, 2, 3].map(i => <div key={i} className="h-24 bg-slate-100 rounded-3xl animate-pulse" />)}</div>
      ) : activeList.length === 0 ? (
        <div className="rounded-3xl bg-white border border-slate-100 py-16 text-center text-sm text-muted-foreground">
          {activeTab === 'pending'
            ? (searchQuery ? 'No pending re-registrations found matching your search.' : 'No pending re-registrations!')
            : (searchQuery ? 'No completed re-registrations found matching your search.' : 'No completed re-registrations yet.')}
        </div>
      ) : (
        <div className="space-y-4">
          {Object.entries(grouped).map(([groupKey, group]) => (
            <div key={groupKey} className="rounded-3xl bg-white border border-slate-100 overflow-hidden">
              <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between gap-3">
                <h3 className="font-semibold tracking-tight text-slate-900">{groupKey}</h3>
                <span className="rounded-full bg-[#eaf6e6] text-[#256c1d] text-xs font-semibold px-3 py-1">{group.length}</span>
              </div>
              <div className="p-4 sm:p-5 space-y-3">
                {group.map((student) => {
                  const currentSem = student.reregStatus?.currentSemester || student.academicProgress?.length || 1;
                  const nextSem = student.reregStatus?.nextSemester || (currentSem + 1);
                  return (
                    <div key={student.id} className="flex flex-col md:flex-row md:items-center justify-between gap-3 p-4 rounded-2xl bg-[#f4f6f3] hover:bg-[#eef5ec] transition-colors">
                      <div className="min-w-0">
                        <div className="font-semibold text-slate-900">{student.name}</div>
                        <div className="text-xs text-muted-foreground mt-0.5">{student.enrollmentNo || 'N/A'}</div>
                      </div>
                      <div className="flex flex-wrap items-center gap-3 md:justify-end">
                        <span className="text-sm text-slate-600">Semester {currentSem} → <span className="font-semibold text-slate-900">Semester {nextSem}</span></span>
                        {activeTab === 'pending' ? (
                          <span className="rounded-full bg-amber-100 text-amber-700 text-[11px] font-semibold px-3 py-1">Pending Fee</span>
                        ) : (
                          <span className="rounded-full bg-[#dff3da] text-[#256c1d] text-[11px] font-semibold px-3 py-1">Completed</span>
                        )}
                        <Button variant="outline" className="h-10 rounded-full px-5 bg-white border-[#cfe9c9] text-[#256c1d] hover:bg-[#eaf6e6] font-semibold" onClick={() => setSelectedStudent(student)}>View Details</Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
          <div className="rounded-3xl bg-white border border-slate-100 px-5 pb-5">
            <ListPagination
              total={activeList.length}
              page={safePage}
              pageSize={itemsPerPage}
              onPageChange={setCurrentPage}
              onPageSizeChange={(n) => { setItemsPerPage(n); setCurrentPage(1); }}
            />
          </div>
        </div>
      )}

      {selectedStudent && (
        <Dialog open={!!selectedStudent} onOpenChange={(open) => !open && setSelectedStudent(null)}>
          <DialogContent className="wizard-form sm:max-w-[460px] rounded-[2rem] border-0 bg-white p-6 sm:p-8" style={{ fontFamily: "Urbanist, ui-sans-serif, system-ui, sans-serif" }}>
            <DialogHeader>
              <DialogTitle className="text-xl font-semibold tracking-tight">Re-registration Details</DialogTitle>
              <DialogDescription>
                Review and process re-registration for {selectedStudent.name}
              </DialogDescription>
            </DialogHeader>
            <div className="rounded-2xl bg-[#f4f6f3] p-4 space-y-3">
              {[
                ['Student Name', selectedStudent.name],
                ['Enrollment No', selectedStudent.enrollmentNo || 'N/A'],
                ['Program', selectedStudent.program?.name || 'N/A'],
                ['Current Sem', 'Semester 1'],
                ['Next Sem', 'Semester 2'],
              ].map(([k, v]) => (
                <div key={k} className="flex items-center justify-between gap-4 text-sm">
                  <span className="text-slate-500">{k}</span>
                  <span className="font-semibold text-slate-900 text-right">{v}</span>
                </div>
              ))}
              <div className="flex items-center justify-between gap-4 text-sm">
                <span className="text-slate-500">Status</span>
                <span className="rounded-full bg-amber-100 text-amber-700 text-[11px] font-semibold px-3 py-1">Pending Fee</span>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" className="h-11 px-6 rounded-full" onClick={() => setSelectedStudent(null)}>Cancel</Button>
              {activeTab === 'pending' && (
                <Button className="h-11 px-6 rounded-full bg-[#8ae47e] hover:bg-[#7bd96f] text-[#0b1d14] font-semibold" onClick={async () => {
                  try {
                    await api.put(`/students/${selectedStudent.id}`, {
                      reregStatus: { ...selectedStudent.reregStatus, completed: true, completedAt: new Date().toISOString() },
                    });
                    toast.success('Re-registration marked as completed!');
                    setSelectedStudent(null);
                    fetchStudents();
                  } catch (e: any) {
                    toast.error(e.response?.data?.message || 'Failed to update student');
                  }
                }}>Mark Completed</Button>
              )}
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
