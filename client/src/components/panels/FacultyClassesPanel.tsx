import { useState, useEffect } from 'react';
import { 
  BookOpen, 
  Users, 
  ChevronRight,
  ArrowLeft,
  GraduationCap,
  Folder,
  Loader2,
  Clock,
  CheckCircle2,
  Star,
  BarChart2
} from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import api from '@/lib/api';
import { toast } from 'sonner';
import { FacultyClassContentPanel } from './FacultyClassContentPanel';
import { FacultyBatchDashboardPanel } from './FacultyBatchDashboardPanel';
import { AcademicBatchesPanel } from './AcademicBatchesPanel';
import { FacultyAttendanceApproval } from './FacultyAttendanceApproval';
import { FacultyClassReviews } from './FacultyClassReviews';
import OnlineClassAnalyticsPanel from './OnlineClassAnalyticsPanel';

export function FacultyClassesPanel() {
  const [view, setView] = useState<string>('classes');
  const [classes, setClasses] = useState<any[]>([]);
  const [batches, setBatches] = useState<any[]>([]);
  const [students, setStudents] = useState<any[]>([]);
  
  const [selectedClass, setSelectedClass] = useState<any | null>(null);
  const [selectedBatch, setSelectedBatch] = useState<any | null>(null);
  const [loading, setLoading] = useState(false);

  // Sessions Modal
  const [sessionsDialogOpen, setSessionsDialogOpen] = useState(false);
  const [batchSessions, setBatchSessions] = useState<any[]>([]);
  const [loadingSessions, setLoadingSessions] = useState(false);
  const [activeBatchName, setActiveBatchName] = useState('');
  
  // View Attendance Modal
  const [viewAttendanceDialogOpen, setViewAttendanceDialogOpen] = useState(false);
  const [attendanceSessionId, setAttendanceSessionId] = useState<string | null>(null);
  const [attendanceRecords, setAttendanceRecords] = useState<any[]>([]);
  const [loadingAttendance, setLoadingAttendance] = useState(false);

  useEffect(() => {
    fetchClasses();
  }, []);

  const fetchClasses = async () => {
    setLoading(true);
    try {
      const res = await api.get('/faculty-portal/classes');
      setClasses(res.data.data || []);
    } catch (err) {
      toast.error('Failed to fetch classes');
    } finally {
      setLoading(false);
    }
  };

  const fetchBatches = async (classId: string) => {
    setLoading(true);
    try {
      const res = await api.get(`/faculty-portal/classes/${classId}/batches`);
      setBatches(res.data.data || []);
      setView('batches');
    } catch (err) {
      toast.error('Failed to fetch batches');
    } finally {
      setLoading(false);
    }
  };

  const fetchStudents = async (batchId: string) => {
    setLoading(true);
    try {
      const res = await api.get(`/faculty-portal/batches/${batchId}/students`);
      setStudents(res.data.data || []);
      setView('students');
    } catch (err) {
      toast.error('Failed to fetch students');
    } finally {
      setLoading(false);
    }
  };

  // Sessions and Attendance logic has been moved to the Batch Dashboard.

  const handleClassClick = async (c: any) => {
    setSelectedClass(c);
    if (c.academicCenter?.type === 'online') {
      setLoading(true);
      try {
        const res = await api.get(`/faculty-portal/classes/${c.id}/batches`);
        const fetchedBatches = res.data.data || [];
        setBatches(fetchedBatches);
        if (fetchedBatches.length > 0) {
          setSelectedBatch(fetchedBatches[0]);
          const studentsRes = await api.get(`/faculty-portal/batches/${fetchedBatches[0].id}/students`);
          setStudents(studentsRes.data.data || []);
          setView('students');
        } else {
          toast.error('No global batch found for this online class.');
        }
      } catch (err) {
        toast.error('Failed to fetch online students');
      } finally {
        setLoading(false);
      }
    } else {
      fetchBatches(c.id);
    }
  };
  if (view === 'students') {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => setView(selectedClass?.academicCenter?.type === 'online' ? 'classes' : 'batches')}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div>
            <h2 className="text-xl font-bold tracking-tight flex items-center gap-2">
              <Users className="w-5 h-5 text-indigo-500" />
              Students in {selectedBatch?.name}
            </h2>
            <p className="text-muted-foreground text-sm">Class: {selectedClass?.name}</p>
          </div>
        </div>

        <Card className="border-none shadow-sm">
          <CardContent className="p-0">
            {loading ? (
              <div className="p-8 text-center text-muted-foreground">Loading students...</div>
            ) : students.length > 0 ? (
              <div className="divide-y">
                {students.map((s, i) => (
                  <div key={i} className="flex items-center justify-between p-4 hover:bg-muted/50 transition-colors">
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center font-bold">
                        {s.name.charAt(0)}
                      </div>
                      <div>
                        <p className="font-semibold">{s.name}</p>
                        <p className="text-sm text-muted-foreground">{s.email} | {s.phone}</p>
                      </div>
                    </div>
                    <Badge variant={s.status === 'enrolled' ? 'default' : 'secondary'}>{s.status}</Badge>
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-12 text-center">
                <Users className="w-12 h-12 text-muted-foreground/30 mx-auto mb-3" />
                <p className="text-muted-foreground font-medium">No students enrolled yet.</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    );
  }

  if (view === 'content' && selectedClass) {
    return <FacultyClassContentPanel academicClass={selectedClass} onBack={() => setView('classes')} />;
  }

  if (view === 'batchDashboard' && selectedClass && selectedBatch) {
    return <FacultyBatchDashboardPanel academicClass={selectedClass} academicBatch={selectedBatch} onBack={() => setView('batches')} />;
  }

  if (view === 'allocations' && selectedClass) {
    return <AcademicBatchesPanel academicClass={selectedClass} onBack={() => setView('classes')} />;
  }

  if (view === 'facultyAttendance' && selectedClass) {
    return <FacultyAttendanceApproval academicClass={selectedClass} onBack={() => setView('classes')} />;
  }

  if (view === 'onlineAnalytics' && selectedClass) {
    return <OnlineClassAnalyticsPanel academicClass={selectedClass} onBack={() => setView('classes')} />;
  }

  if (view === 'reviews' && selectedClass) {
    return <FacultyClassReviews academicClass={selectedClass} onBack={() => setView('classes')} />;
  }

  if (view === 'batches') {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => setView('classes')}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div>
            <h2 className="text-xl font-bold tracking-tight flex items-center gap-2">
              <BookOpen className="w-5 h-5 text-indigo-500" />
              Batches for {selectedClass?.name}
            </h2>
            <p className="text-muted-foreground text-sm">Select a batch to view enrolled students.</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {loading ? (
            <div className="col-span-full p-8 text-center text-muted-foreground">Loading batches...</div>
          ) : batches.length > 0 ? (
            batches.map((b, i) => (
              <Card key={i} className="group relative overflow-hidden cursor-pointer border-0 shadow-sm hover:shadow-xl transition-all duration-300 rounded-2xl" onClick={() => { setSelectedBatch(b); fetchStudents(b.id); }}>
                {/* Background styling - Solid White/Dark with subtle gradient */}
                <div className="absolute inset-0 bg-white dark:bg-slate-900 z-0" />
                <div className="absolute inset-0 bg-gradient-to-br from-indigo-50/50 to-blue-50/50 dark:from-indigo-950/20 dark:to-blue-950/20 z-0" />
                
                {/* Left Accent Line instead of top */}
                <div className="absolute left-0 top-0 bottom-0 w-1.5 bg-gradient-to-b from-indigo-500 to-blue-600 transform origin-bottom scale-y-75 group-hover:scale-y-100 transition-transform duration-500 ease-out z-10" />
                
                {/* Decorative blob */}
                <div className="absolute -right-8 -top-8 w-32 h-32 bg-gradient-to-br from-indigo-400/10 to-blue-500/10 rounded-full blur-2xl group-hover:scale-150 transition-transform duration-700 ease-out z-0" />
                
                <div className="relative z-10 p-6 space-y-5">
                  <div className="flex justify-between items-start gap-4">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-indigo-100/80 text-indigo-700 dark:bg-indigo-900/50 dark:text-indigo-300">
                          Batch
                        </span>
                        <Badge variant={b.status === 'active' ? 'default' : 'secondary'} className={`capitalize h-5 text-[10px] ${b.status === 'active' ? 'bg-indigo-500 hover:bg-indigo-600' : ''}`}>
                          {b.status}
                        </Badge>
                      </div>
                      <h3 className="text-xl font-extrabold text-slate-800 dark:text-slate-100 line-clamp-1 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors duration-300">
                        {b.name}
                      </h3>
                      <p className="text-sm font-medium text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                        <BookOpen className="w-3.5 h-3.5 text-blue-500" />
                        {b.program?.name || 'Program N/A'}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-4 bg-slate-50/80 dark:bg-slate-950/50 rounded-xl p-3 border border-slate-100 dark:border-slate-800">
                    <div className="w-10 h-10 rounded-lg bg-indigo-100 dark:bg-indigo-900/30 flex items-center justify-center text-indigo-600 dark:text-indigo-400">
                      <Users className="w-5 h-5" />
                    </div>
                    <div className="flex flex-col">
                      <span className="text-xs font-semibold text-slate-500">Enrolled Students</span>
                      <div className="flex items-baseline gap-1">
                        <span className="text-lg font-bold text-slate-700 dark:text-slate-200">{b._count?.students || 0}</span>
                        <span className="text-xs text-slate-400 font-medium">/ {b.capacity}</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex gap-2 pt-2">
                    <Button 
                      variant="default" 
                      size="sm" 
                      onClick={(e) => { e.stopPropagation(); setSelectedBatch(b); setView('batchDashboard'); }} 
                      className="flex-1 rounded-xl bg-gradient-to-r from-indigo-500 to-blue-600 hover:from-indigo-600 hover:to-blue-700 shadow-md shadow-indigo-500/20 text-white border-0"
                    >
                      <BookOpen className="w-4 h-4 mr-2" /> Manage
                    </Button>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="flex-1 rounded-xl border-slate-200 dark:border-slate-800 text-slate-600 hover:text-indigo-700 hover:bg-indigo-50 dark:hover:bg-indigo-950 dark:hover:text-indigo-400"
                    >
                      Students <ChevronRight className="w-4 h-4 ml-1" />
                    </Button>
                  </div>
                </div>
              </Card>
            ))
          ) : (
            <div className="col-span-full p-12 text-center border rounded-lg bg-background">
              <BookOpen className="w-12 h-12 text-muted-foreground/30 mx-auto mb-3" />
              <p className="text-muted-foreground font-medium">No batches found for this class.</p>
            </div>
          )}
        </div>
      </div>
    );
  }

  // DEFAULT RETURN (classes view)

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold tracking-tight flex items-center gap-2">
          <GraduationCap className="w-5 h-5 text-indigo-500" />
          My Assigned Classes
        </h2>
        <p className="text-muted-foreground text-sm">Classes where you are assigned as the Principal In-charge.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {loading ? (
          <div className="col-span-full p-8 text-center text-muted-foreground">Loading classes...</div>
        ) : classes.length > 0 ? (
          classes.map((c, i) => (
            <Card key={i} className="group relative overflow-hidden cursor-pointer border-0 shadow-sm hover:shadow-xl transition-all duration-300" onClick={() => handleClassClick(c)}>
              {/* Background styling */}
              <div className="absolute inset-0 bg-gradient-to-br from-indigo-50/80 to-blue-50/30 dark:from-indigo-950/40 dark:to-slate-900/40 opacity-100 transition-opacity duration-300" />
              <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/5 to-blue-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
              
              {/* Top Accent Line */}
              <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-indigo-500 via-blue-500 to-cyan-400 transform origin-left scale-x-100 transition-transform duration-500 ease-out" />
              
              <div className="relative z-10 p-5 space-y-4">
                <div className="flex justify-between items-start gap-4">
                  <div className="space-y-1.5">
                    <h3 className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-br from-slate-900 to-slate-700 dark:from-slate-100 dark:to-slate-300 line-clamp-1 group-hover:from-indigo-600 group-hover:to-blue-600 dark:group-hover:from-indigo-400 dark:group-hover:to-blue-400 transition-all duration-300">
                      {c.name}
                    </h3>
                    <p className="text-sm font-medium text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                      <GraduationCap className="w-4 h-4 text-indigo-400" />
                      {c.organization?.name || 'Organization'}
                    </p>
                  </div>
                  <div className="flex flex-col gap-1 items-end shrink-0">
                    <Badge variant={c.status === 'active' ? 'default' : 'secondary'} className={`capitalize shadow-sm ${c.status === 'active' ? 'bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700' : ''}`}>
                      {c.status}
                    </Badge>
                    <Badge variant="outline" className={`text-[10px] uppercase tracking-wider px-2 py-0.5 font-bold ${c.academicCenter?.type === 'online' ? 'border-sky-500/30 text-sky-600 bg-sky-500/10' : 'border-emerald-500/30 text-emerald-600 bg-emerald-500/10'}`}>
                      {c.academicCenter?.type === 'online' ? 'Online Class' : 'Offline Class'}
                    </Badge>
                  </div>
                </div>

                {c.academicCenter?.type !== 'online' && (
                  <div className="flex items-center gap-3">
                    <div className="flex-1 bg-white/60 dark:bg-slate-950/60 backdrop-blur-sm rounded-xl p-3 border border-slate-200/50 dark:border-slate-800/50 flex items-center justify-center gap-2 shadow-sm transition-transform duration-300 group-hover:-translate-y-0.5">
                      <BookOpen className="w-5 h-5 text-indigo-500" />
                      <div className="flex flex-col">
                        <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Batches</span>
                        <span className="font-bold text-slate-700 dark:text-slate-200 leading-none">{c._count?.batches || 0}</span>
                      </div>
                    </div>
                  </div>
                )}

                <div className="flex flex-wrap items-center justify-between pt-4 gap-2 border-t border-slate-200/50 dark:border-slate-800/50">
                  <div className="flex flex-wrap gap-2">
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="h-9 px-4 rounded-full text-indigo-700 bg-indigo-50 border-indigo-200 hover:bg-indigo-600 hover:text-white hover:border-indigo-600 shadow-sm transition-all duration-300"
                      onClick={(e) => { e.stopPropagation(); setView('content'); setSelectedClass(c); }}
                    >
                      <Folder className="w-4 h-4 mr-2" /> 
                      <span className="font-semibold text-xs tracking-wide">Configure</span>
                    </Button>
                    {c.academicCenter?.type !== 'online' && (
                      <Button 
                        variant="outline" 
                        size="sm" 
                        className="h-9 px-4 rounded-full text-teal-700 bg-teal-50 border-teal-200 hover:bg-teal-600 hover:text-white hover:border-teal-600 shadow-sm transition-all duration-300"
                        onClick={(e) => { e.stopPropagation(); setView('allocations'); setSelectedClass(c); }}
                      >
                        <Users className="w-4 h-4 mr-2" /> 
                        <span className="font-semibold text-xs tracking-wide">Allocate Students</span>
                      </Button>
                    )}
                    {c.academicCenter?.type !== 'online' && (
                      <Button 
                        variant="outline" 
                        size="sm" 
                        className="h-9 px-4 rounded-full text-amber-700 bg-amber-50 border-amber-200 hover:bg-amber-600 hover:text-white hover:border-amber-600 shadow-sm transition-all duration-300"
                        onClick={(e) => { e.stopPropagation(); setView('facultyAttendance'); setSelectedClass(c); }}
                      >
                        <CheckCircle2 className="w-4 h-4 mr-2" /> 
                        <span className="font-semibold text-xs tracking-wide">Approvals</span>
                      </Button>
                    )}
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="h-9 px-4 rounded-full text-purple-700 bg-purple-50 border-purple-200 hover:bg-purple-600 hover:text-white hover:border-purple-600 shadow-sm transition-all duration-300"
                      onClick={(e) => { e.stopPropagation(); setView('reviews'); setSelectedClass(c); }}
                    >
                      <Star className="w-4 h-4 mr-2" /> 
                      <span className="font-semibold text-xs tracking-wide">Reviews</span>
                    </Button>
                    {c.academicCenter?.type === 'online' && (
                      <Button 
                        variant="outline" 
                        size="sm" 
                        className="h-9 px-4 rounded-full text-pink-700 bg-pink-50 border-pink-200 hover:bg-pink-600 hover:text-white hover:border-pink-600 shadow-sm transition-all duration-300"
                        onClick={(e) => { e.stopPropagation(); setView('onlineAnalytics'); setSelectedClass(c); }}
                      >
                        <BarChart2 className="w-4 h-4 mr-2" /> 
                        <span className="font-semibold text-xs tracking-wide">Analytics</span>
                      </Button>
                    )}
                  </div>
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    className="h-9 px-4 rounded-full text-slate-600 hover:text-blue-700 hover:bg-blue-50 transition-all duration-300 group-hover:translate-x-1"
                    onClick={(e) => { e.stopPropagation(); handleClassClick(c); }}
                  >
                    <span className="font-semibold text-xs tracking-wide mr-1">{c.academicCenter?.type === 'online' ? 'View Students' : 'View Batches'}</span>
                    <ChevronRight className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </Card>
          ))
        ) : (
          <div className="col-span-full p-12 text-center border rounded-lg bg-background shadow-sm">
            <GraduationCap className="w-12 h-12 text-muted-foreground/30 mx-auto mb-3" />
            <p className="text-muted-foreground font-medium text-lg">No assigned classes</p>
            <p className="text-muted-foreground/80 text-sm mt-1">You are not currently assigned as Principal In-charge for any academic classes.</p>
          </div>
        )}
      </div>
    </div>
  );
}
