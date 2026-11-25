import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Save, RefreshCw, Search } from 'lucide-react';
import { toast } from 'sonner';
import api from '@/lib/api';
import { ListPagination } from '@/components/ui/list-pagination';

export function EnrollmentNumberUpdatePanel() {
  const [students, setStudents] = useState<any[]>([]);
  const [updatedStudents, setUpdatedStudents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [updates, setUpdates] = useState<Record<string, string>>({});
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
      const [pendingRes, updatedRes] = await Promise.all([
        api.get('/students?missingEnrollment=true'),
        api.get('/students?hasEnrollment=true')
      ]);
      setStudents(pendingRes.data.data || []);
      setUpdatedStudents(updatedRes.data.data || []);
      setUpdates({});
    } catch (e) {
      console.error(e);
      toast.error('Failed to fetch students');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateChange = (studentId: string, val: string) => {
    setUpdates(prev => ({ ...prev, [studentId]: val }));
  };

  const saveUpdates = async () => {
    const payloads = Object.entries(updates).map(([id, enrollmentNo]) => ({ id, enrollmentNo }));
    if (payloads.length === 0) {
      toast.info('No changes to save');
      return;
    }
    
    setSaving(true);
    try {
      await api.post('/students/bulk-enrollment-update', { updates: payloads });
      toast.success(`Successfully updated ${payloads.length} enrollment numbers!`);
      fetchStudents();
    } catch (e) {
      console.error(e);
      toast.error('Failed to save updates');
    } finally {
      setSaving(false);
    }
  };

  const allStudents = [...students, ...updatedStudents];
  const centers = Array.from(new Set(allStudents.map(s => s.center?.name).filter(Boolean))).sort();
  const programs = Array.from(new Set(allStudents.map(s => s.program?.name).filter(Boolean))).sort();

  const applyFilters = (s: any) => {
    const matchesSearch = s.name?.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          s.email?.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          s.center?.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          s.enrollmentNo?.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesCenter = centerFilter === 'all' || s.center?.name === centerFilter;
    const matchesProgram = programFilter === 'all' || s.program?.name === programFilter;
    
    return matchesSearch && matchesCenter && matchesProgram;
  };

  const filteredPending = students.filter(applyFilters);
  const filteredUpdated = updatedStudents.filter(applyFilters);

  const sel = 'h-11 rounded-full border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 outline-none focus:border-[#54b947]';
  const activeList = activeTab === 'pending' ? filteredPending : filteredUpdated;
  const pageCount = Math.max(1, Math.ceil(activeList.length / itemsPerPage));
  const safePage = Math.min(currentPage, pageCount);
  const pageRows = activeList.slice((safePage - 1) * itemsPerPage, safePage * itemsPerPage);

  return (
    <div className="space-y-6 wizard-form">
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-2xl sm:text-3xl font-semibold tracking-tight">Enrollment Number Update</h2>
          <p className="text-muted-foreground text-sm mt-1.5">Assign official university enrollment numbers to admitted students</p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <Button variant="outline" onClick={fetchStudents} disabled={loading} className="h-11 px-5 rounded-full bg-white border-slate-200 hover:bg-[#eaf6e6]">
            <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          {activeTab === 'pending' && (
            <Button onClick={saveUpdates} disabled={saving || Object.keys(updates).length === 0} className="h-11 px-6 rounded-full bg-[#8ae47e] hover:bg-[#7bd96f] text-[#0b1d14] font-semibold">
              <Save className="w-4 h-4 mr-2" />
              {saving ? 'Saving...' : 'Save Changes'}
            </Button>
          )}
        </div>
      </div>

      <div className="rounded-3xl bg-white border border-slate-100 p-4 space-y-4">
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="h-auto bg-[#f4f6f3] p-1.5 rounded-full gap-1 w-fit max-w-full">
            <TabsTrigger value="pending" className="rounded-full px-5 py-2 text-sm font-semibold text-slate-600 data-[state=active]:bg-[#8ae47e] data-[state=active]:text-[#0b1d14] data-[state=active]:shadow-none">Pending Update ({filteredPending.length})</TabsTrigger>
            <TabsTrigger value="updated" className="rounded-full px-5 py-2 text-sm font-semibold text-slate-600 data-[state=active]:bg-[#8ae47e] data-[state=active]:text-[#0b1d14] data-[state=active]:shadow-none">Updated ({filteredUpdated.length})</TabsTrigger>
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

      <div className="rounded-3xl bg-white border border-slate-100 overflow-hidden">
        <div className="px-6 py-5 flex items-center justify-between border-b border-slate-100">
          <h3 className="text-lg font-semibold tracking-tight">{activeTab === 'pending' ? 'Pending Update' : 'Updated Students'}</h3>
          {!loading && <span className="rounded-full bg-[#eaf6e6] text-[#256c1d] text-xs font-semibold px-3 py-1">{activeList.length} students</span>}
        </div>
        <div className="p-4 sm:p-5">
          {loading ? (
            <div className="space-y-3">{[1, 2, 3].map(i => <div key={i} className="h-20 bg-slate-100 rounded-2xl animate-pulse" />)}</div>
          ) : activeList.length === 0 ? (
            <div className="text-center py-14 text-muted-foreground">
              <p className="text-sm">
                {activeTab === 'pending'
                  ? (students.length === 0 ? 'All admitted students have enrollment numbers!' : 'No students found matching your search.')
                  : (updatedStudents.length === 0 ? 'No students have been updated yet.' : 'No students found matching your search.')}
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {pageRows.map((student) => (
                <div key={student.id} className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 p-4 sm:p-5 rounded-2xl bg-[#f4f6f3] hover:bg-[#eef5ec] transition-colors">
                  <div className="min-w-0">
                    <div className="font-semibold text-slate-900">{student.name}</div>
                    <div className="text-xs text-muted-foreground">{student.email}</div>
                    <div className="flex flex-wrap items-center gap-2 mt-2">
                      <span className="rounded-full bg-white px-3 py-0.5 text-xs font-semibold text-slate-700">
                        {student.program?.name || 'N/A'}{student.specialisation ? ` - ${student.specialisation}` : ''}
                      </span>
                      {student.session?.name && <span className="text-xs text-muted-foreground">{student.session.name}</span>}
                      <span className="text-xs text-muted-foreground">· {student.center?.name || 'Direct'}</span>
                    </div>
                  </div>
                  <div className="lg:w-72 shrink-0">
                    {activeTab === 'pending' ? (
                      <Input
                        placeholder="Enter Enrollment No."
                        value={updates[student.id] !== undefined ? updates[student.id] : (student.enrollmentNo || '')}
                        onChange={(e) => handleUpdateChange(student.id, e.target.value)}
                        className="h-11 rounded-xl bg-white border border-[#cbd5c8] focus:border-[#54b947]"
                      />
                    ) : (
                      <div className="rounded-xl bg-white px-4 py-3 text-sm">
                        <span className="block text-[11px] font-medium text-slate-500">Enrollment No.</span>
                        <span className="font-semibold text-slate-900">{student.enrollmentNo}</span>
                      </div>
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
