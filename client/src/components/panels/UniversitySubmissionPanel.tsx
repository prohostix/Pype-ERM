import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { RefreshCw, Search } from 'lucide-react';
import { toast } from 'sonner';
import api from '@/lib/api';
import { ListPagination } from '@/components/ui/list-pagination';

export function UniversitySubmissionPanel() {
  const [students, setStudents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
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
      const res = await api.get('/students');
      setStudents(res.data.data || []);
    } catch (e) {
      console.error(e);
      toast.error('Failed to fetch submissions');
    } finally {
      setLoading(false);
    }
  };

  const markSubmitted = async (id: string) => {
    try {
      const student = students.find(s => s.id === id);
      if (!student) return;
      
      const updatedProgress = { ...(student.admissionProgress || {}), universitySubmitted: true };
      await api.put(`/students/${id}`, { admissionProgress: updatedProgress });
      
      toast.success('Marked as submitted to University!');
      fetchStudents();
    } catch (e) {
      console.error(e);
      toast.error('Failed to mark as submitted');
    }
  };

  const centers = Array.from(new Set(students.map(s => s.center?.name).filter(Boolean))).sort();
  const programs = Array.from(new Set(students.map(s => s.program?.name).filter(Boolean))).sort();

  const applyFilters = (s: any) => {
    const q = searchQuery.toLowerCase();
    const matchesSearch = s.name?.toLowerCase().includes(q) || 
                          s.email?.toLowerCase().includes(q) || 
                          s.university?.name?.toLowerCase().includes(q) ||
                          s.program?.name?.toLowerCase().includes(q);
    const matchesCenter = centerFilter === 'all' || s.center?.name === centerFilter;
    const matchesProgram = programFilter === 'all' || s.program?.name === programFilter;
    return matchesSearch && matchesCenter && matchesProgram;
  };

  const pendingStudents = students.filter(s => {
    const isPending = !s.admissionProgress?.universitySubmitted && !s.admissionProgress?.uni_sub?.completed;
    if (!isPending) return false;
    return applyFilters(s);
  });
  
  const submittedStudents = students.filter(s => {
    const isSubmitted = s.admissionProgress?.universitySubmitted || s.admissionProgress?.uni_sub?.completed;
    if (!isSubmitted) return false;
    return applyFilters(s);
  });

  const sel = 'h-11 rounded-full border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 outline-none focus:border-[#54b947]';
  const activeList = activeTab === 'pending' ? pendingStudents : submittedStudents;
  const pageCount = Math.max(1, Math.ceil(activeList.length / itemsPerPage));
  const safePage = Math.min(currentPage, pageCount);
  const pageRows = activeList.slice((safePage - 1) * itemsPerPage, safePage * itemsPerPage);

  return (
    <div className="space-y-6 wizard-form">
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-2xl sm:text-3xl font-semibold tracking-tight">University Submission</h2>
          <p className="text-muted-foreground text-sm mt-1.5">Track and manage student applications pending university submission</p>
        </div>
        <Button variant="outline" onClick={fetchStudents} disabled={loading} className="h-11 px-5 rounded-full bg-white border-slate-200 hover:bg-[#eaf6e6]">
          <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      <div className="rounded-3xl bg-white border border-slate-100 p-4 space-y-4">
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="h-auto bg-[#f4f6f3] p-1.5 rounded-full gap-1 w-fit max-w-full">
            <TabsTrigger value="pending" className="rounded-full px-5 py-2 text-sm font-semibold text-slate-600 data-[state=active]:bg-[#8ae47e] data-[state=active]:text-[#0b1d14] data-[state=active]:shadow-none">Pending Submission ({pendingStudents.length})</TabsTrigger>
            <TabsTrigger value="submitted" className="rounded-full px-5 py-2 text-sm font-semibold text-slate-600 data-[state=active]:bg-[#8ae47e] data-[state=active]:text-[#0b1d14] data-[state=active]:shadow-none">Submitted ({submittedStudents.length})</TabsTrigger>
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
            {centers.map(c => (
              <option key={c as string} value={c as string}>{c as React.ReactNode}</option>
            ))}
          </select>
          <select className={sel + (programFilter !== 'all' ? ' !bg-[#8ae47e] !border-[#8ae47e] !text-[#0b1d14]' : '')} value={programFilter} onChange={e => setProgramFilter(e.target.value)}>
            <option value="all">All Programs</option>
            {programs.map(p => (
              <option key={p as string} value={p as string}>{p as React.ReactNode}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="rounded-3xl bg-white border border-slate-100 overflow-hidden">
        <div className="px-6 py-5 flex items-center justify-between border-b border-slate-100">
          <h3 className="text-lg font-semibold tracking-tight">{activeTab === 'pending' ? 'Pending Submission' : 'Submitted to University'}</h3>
          {!loading && <span className="rounded-full bg-[#eaf6e6] text-[#256c1d] text-xs font-semibold px-3 py-1">{activeList.length} students</span>}
        </div>
        <div className="p-4 sm:p-5">
          {loading ? (
            <div className="space-y-3">{[1, 2, 3].map(i => <div key={i} className="h-20 bg-slate-100 rounded-2xl animate-pulse" />)}</div>
          ) : activeList.length === 0 ? (
            <div className="text-center py-14 text-muted-foreground">
              <p className="text-sm">
                {activeTab === 'pending'
                  ? (searchQuery ? 'No students found matching your search.' : 'All files are submitted to universities!')
                  : 'No students have been submitted yet.'}
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {pageRows.map((student) => (
                <div key={student.id} className="flex flex-col md:flex-row md:items-center justify-between gap-3 p-4 sm:p-5 rounded-2xl bg-[#f4f6f3] hover:bg-[#eef5ec] transition-colors">
                  <div className="min-w-0">
                    <div className="font-semibold text-slate-900">{student.name}</div>
                    <div className="text-xs text-muted-foreground mt-0.5">{student.admissionNo || 'N/A'}</div>
                    <div className="flex flex-wrap items-center gap-2 mt-2">
                      <span className="text-sm text-slate-700">{student.program?.name || 'N/A'}</span>
                      <span className="rounded-full bg-white px-3 py-0.5 text-xs font-semibold text-slate-600">{student.university?.name || 'Assigned'}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 justify-between md:justify-end">
                    {activeTab === 'pending' ? (
                      <>
                        <span className="rounded-full bg-[#dff3da] text-[#256c1d] text-[11px] font-semibold px-3 py-1">Documents verified</span>
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button className="h-10 rounded-full px-5 bg-[#8ae47e] hover:bg-[#7bd96f] text-[#0b1d14] font-semibold">
                              Mark Submitted
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent className="rounded-[2rem] border-0 bg-white p-6 sm:p-8" {...{ style: { fontFamily: "Urbanist, ui-sans-serif, system-ui, sans-serif" } }}>
                            <AlertDialogHeader>
                              <AlertDialogTitle className="text-xl font-semibold tracking-tight">Confirm Submission</AlertDialogTitle>
                              <AlertDialogDescription>
                                Are you sure you want to mark {student.name}'s application as submitted to the university?
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel className="h-11 px-6 rounded-full">Cancel</AlertDialogCancel>
                              <AlertDialogAction className="h-11 px-6 rounded-full bg-[#8ae47e] hover:bg-[#7bd96f] text-[#0b1d14] font-semibold" onClick={() => markSubmitted(student.id)}>
                                Confirm
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </>
                    ) : (
                      <span className="rounded-full bg-[#dff3da] text-[#256c1d] text-[11px] font-semibold px-3 py-1">Submitted</span>
                    )}
                  </div>
                </div>
              ))}
              <ListPagination
                total={activeList.length}
                page={safePage}
                pageSize={itemsPerPage}
                onPageChange={setCurrentPage}
                onPageSizeChange={(n) => { setItemsPerPage(n); setCurrentPage(1); }}
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
