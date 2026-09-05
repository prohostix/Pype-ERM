import { useState, useEffect } from 'react';
import { 
  Building2, 
  Globe, 
  Plus, 
  UserCheck, 
  Users, 
  BookOpen, 
  GraduationCap, 
  MapPin, 
  Video, 
  Search, 
  Edit3, 
  CheckCircle2, 
  Layers, 
  Mail, 
  Phone,
  Calendar,
  Sparkles,
  Trash2,
  AlertTriangle,
  RefreshCw
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import api from '@/lib/api';
import { toast } from 'sonner';
import type { AcademicCenter, AcademicCounselor } from './types';

export function AcademicCentersAdminPanel() {
  const [centers, setCenters] = useState<AcademicCenter[]>([]);
  const [counselors, setCounselors] = useState<AcademicCounselor[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeSubTab, setActiveSubTab] = useState<'centers' | 'counselors'>('centers');
  const [typeFilter, setTypeFilter] = useState<'ALL' | 'ONLINE' | 'OFFLINE'>('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  // Create / Edit Center Modal
  const [centerModalOpen, setCenterModalOpen] = useState(false);
  const [editingCenter, setEditingCenter] = useState<AcademicCenter | null>(null);
  const [availablePrograms, setAvailablePrograms] = useState<any[]>([]);
  const [programSearch, setProgramSearch] = useState('');
  const [centerForm, setCenterForm] = useState({
    name: '',
    code: '',
    type: 'OFFLINE' as 'OFFLINE' | 'ONLINE',
    address: '',
    city: '',
    state: '',
    pincode: '',
    meetingPlatform: 'Zoom',
    onlineAccessUrl: '',
    contactEmail: '',
    contactPhone: '',
    description: '',
    programIds: [] as string[],
  });

  // Counselor Registration Modal
  const [counselorModalOpen, setCounselorModalOpen] = useState(false);
  const [counselorForm, setCounselorForm] = useState({
    name: '',
    email: '',
    password: '',
    phone: '',
    specialization: '',
    centerId: '',
  });

  // Assign / Change Counselor Modal
  const [assignModalOpen, setAssignModalOpen] = useState(false);
  const [assignTargetCenter, setAssignTargetCenter] = useState<AcademicCenter | null>(null);
  const [selectedCounselorId, setSelectedCounselorId] = useState('');
  const [isPrimaryCounselor, setIsPrimaryCounselor] = useState(true);
  const [replacePreviousCounselor, setReplacePreviousCounselor] = useState(true);

  // Edit Counselor Modal
  const [editCounselorModalOpen, setEditCounselorModalOpen] = useState(false);
  const [editingCounselor, setEditingCounselor] = useState<AcademicCounselor | null>(null);
  const [editCounselorForm, setEditCounselorForm] = useState({
    name: '',
    email: '',
    phone: '',
    specialization: '',
    status: 'ACTIVE',
    password: '',
    centerIds: [] as string[],
  });

  // Delete Center Modal
  const [deleteCenterModalOpen, setDeleteCenterModalOpen] = useState(false);
  const [centerToDelete, setCenterToDelete] = useState<AcademicCenter | null>(null);
  const [deleting, setDeleting] = useState(false);

  const openDeleteCenter = (center: AcademicCenter) => {
    setCenterToDelete(center);
    setDeleteCenterModalOpen(true);
  };

  const handleDeleteCenter = async () => {
    if (!centerToDelete) return;
    setDeleting(true);
    try {
      const res = await api.delete(`/academic-center/centers/${centerToDelete.id}`);
      if (res.data.success) {
        toast.success(res.data.message || 'Academic Center deleted successfully');
        setDeleteCenterModalOpen(false);
        setCenterToDelete(null);
        fetchData();
      }
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to delete Academic Center');
    } finally {
      setDeleting(false);
    }
  };

  // Submitting states
  const [submitting, setSubmitting] = useState(false);

  // View Center Students Modal
  const [studentsModalOpen, setStudentsModalOpen] = useState(false);
  const [viewingCenterForStudents, setViewingCenterForStudents] = useState<AcademicCenter | null>(null);
  const [centerStudents, setCenterStudents] = useState<any[]>([]);
  const [studentsLoading, setStudentsLoading] = useState(false);
  const [studentSearch, setStudentSearch] = useState('');

  const openViewStudents = async (center: AcademicCenter) => {
    setViewingCenterForStudents(center);
    setStudentsModalOpen(true);
    setStudentsLoading(true);
    setStudentSearch('');
    try {
      const res = await api.get(`/academic-center/students?centerId=${center.id}`);
      if (res.data.success) {
        setCenterStudents(res.data.data || []);
      }
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to load students for this center');
    } finally {
      setStudentsLoading(false);
    }
  };

  const filteredCenterStudents = centerStudents.filter((stu) => {
    if (!studentSearch.trim()) return true;
    const q = studentSearch.toLowerCase();
    return (
      (stu.name && stu.name.toLowerCase().includes(q)) ||
      (stu.email && stu.email.toLowerCase().includes(q)) ||
      (stu.phone && stu.phone.toLowerCase().includes(q)) ||
      (stu.studentCode && stu.studentCode.toLowerCase().includes(q)) ||
      (stu.program?.name && stu.program.name.toLowerCase().includes(q)) ||
      (stu.program?.code && stu.program.code.toLowerCase().includes(q))
    );
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [centersRes, counselorsRes, programsRes] = await Promise.all([
        api.get('/academic-center/centers'),
        api.get('/academic-center/counselors'),
        api.get('/academic-center/programs'),
      ]);
      if (centersRes.data.success) {
        setCenters(centersRes.data.data || []);
      }
      if (counselorsRes.data.success) {
        setCounselors(counselorsRes.data.data || []);
      }
      if (programsRes.data.success) {
        setAvailablePrograms(programsRes.data.data || []);
      }
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to load Academic Centers');
    } finally {
      setLoading(false);
    }
  };

  const openCreateCenter = () => {
    setEditingCenter(null);
    setProgramSearch('');
    setCenterForm({
      name: '',
      code: '',
      type: 'OFFLINE',
      address: '',
      city: '',
      state: '',
      pincode: '',
      meetingPlatform: 'Zoom',
      onlineAccessUrl: '',
      contactEmail: '',
      contactPhone: '',
      description: '',
      programIds: [],
    });
    setCenterModalOpen(true);
  };

  const openEditCenter = (center: AcademicCenter) => {
    setEditingCenter(center);
    setProgramSearch('');
    setCenterForm({
      name: center.name,
      code: center.code,
      type: center.type,
      address: center.address || '',
      city: center.city || '',
      state: center.state || '',
      pincode: center.pincode || '',
      meetingPlatform: center.meetingPlatform || 'Zoom',
      onlineAccessUrl: center.onlineAccessUrl || '',
      contactEmail: center.contactEmail || '',
      contactPhone: center.contactPhone || '',
      description: center.description || '',
      programIds: center.assignedPrograms?.map((p) => p.id) || [],
    });
    setCenterModalOpen(true);
  };

  const handleSaveCenter = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!centerForm.name || !centerForm.code) {
      toast.error('Center name and code are required');
      return;
    }

    if (!centerForm.programIds || centerForm.programIds.length === 0) {
      toast.error('Please select a program to assign to this center.');
      return;
    }

    if (centerForm.programIds.length > 1) {
      toast.error('Only one program is allowed per academic center.');
      return;
    }

    setSubmitting(true);
    try {
      if (editingCenter) {
        await api.put(`/academic-center/centers/${editingCenter.id}`, centerForm);
        toast.success('Academic Center updated successfully');
      } else {
        await api.post('/academic-center/centers', centerForm);
        toast.success('Academic Center created successfully');
      }
      setCenterModalOpen(false);
      fetchData();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to save Center');
    } finally {
      setSubmitting(false);
    }
  };

  const handleRegisterCounselor = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!counselorForm.name || !counselorForm.email || !counselorForm.password) {
      toast.error('Name, email, and password are required');
      return;
    }

    setSubmitting(true);
    try {
      await api.post('/academic-center/counselors/register', counselorForm);
      toast.success('Academic Counselor registered successfully');
      setCounselorModalOpen(false);
      setCounselorForm({
        name: '',
        email: '',
        password: '',
        phone: '',
        specialization: '',
        centerId: '',
      });
      fetchData();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to register counselor');
    } finally {
      setSubmitting(false);
    }
  };

  const openAssignCounselor = (center: AcademicCenter) => {
    setAssignTargetCenter(center);
    const existingCounselors = center.counselors || [];
    const leadOrFirst = existingCounselors.find((c) => c.isPrimary) || existingCounselors[0];
    setSelectedCounselorId(leadOrFirst ? leadOrFirst.counselorId : '');
    setIsPrimaryCounselor(true);
    setReplacePreviousCounselor(true);
    setAssignModalOpen(true);
  };

  const handleAssignCounselor = async () => {
    if (!assignTargetCenter || !selectedCounselorId) {
      toast.error('Please select a counselor');
      return;
    }

    const hasExistingCounselors = Boolean(assignTargetCenter.counselors && assignTargetCenter.counselors.length > 0);

    setSubmitting(true);
    try {
      await api.post(`/academic-center/centers/${assignTargetCenter.id}/counselors`, {
        counselorId: selectedCounselorId,
        isPrimary: isPrimaryCounselor,
        replacePrevious: hasExistingCounselors ? replacePreviousCounselor : false,
      });
      toast.success(hasExistingCounselors ? 'Counselor updated successfully' : 'Counselor assigned successfully');
      setAssignModalOpen(false);
      fetchData();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to assign counselor');
    } finally {
      setSubmitting(false);
    }
  };

  const handleUnassignCounselor = async (centerId: string, counselorId: string, counselorName: string) => {
    if (!window.confirm(`Are you sure you want to remove ${counselorName} from this center?`)) {
      return;
    }
    try {
      await api.delete(`/academic-center/centers/${centerId}/counselors/${counselorId}`);
      toast.success(`${counselorName} removed from center`);
      fetchData();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to remove counselor');
    }
  };

  const openEditCounselor = (counselor: AcademicCounselor) => {
    setEditingCounselor(counselor);
    setEditCounselorForm({
      name: counselor.name,
      email: counselor.email,
      phone: counselor.phone || '',
      specialization: counselor.specialization || '',
      status: counselor.status || 'ACTIVE',
      password: '',
      centerIds: (counselor.assignedCenters || []).map((c) => c.id),
    });
    setEditCounselorModalOpen(true);
  };

  const handleUpdateCounselor = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingCounselor) return;
    if (!editCounselorForm.name || !editCounselorForm.email) {
      toast.error('Name and email are required');
      return;
    }

    setSubmitting(true);
    try {
      await api.put(`/academic-center/counselors/${editingCounselor.id}`, editCounselorForm);
      toast.success('Academic Counselor details updated successfully');
      setEditCounselorModalOpen(false);
      fetchData();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to update counselor');
    } finally {
      setSubmitting(false);
    }
  };

  const toggleEditCounselorCenter = (cId: string) => {
    setEditCounselorForm((prev) => {
      const exists = prev.centerIds.includes(cId);
      return {
        ...prev,
        centerIds: exists ? prev.centerIds.filter((id) => id !== cId) : [...prev.centerIds, cId],
      };
    });
  };

  // Metrics
  const totalCenters = centers.length;
  const onlineCenters = centers.filter((c) => c.type === 'ONLINE').length;
  const offlineCenters = centers.filter((c) => c.type === 'OFFLINE').length;
  const totalPrograms = centers.reduce((acc, c) => acc + (c.assignedPrograms?.length ?? c._count?.assignedPrograms ?? c._count?.programs ?? 0), 0);
  const totalStudents = centers.reduce((acc, c) => acc + (c._count?.students || 0), 0);

  // Filtered centers
  const filteredCenters = centers.filter((c) => {
    if (typeFilter !== 'ALL' && c.type !== typeFilter) return false;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      const matchName = c.name.toLowerCase().includes(q);
      const matchCode = c.code.toLowerCase().includes(q);
      const matchCity = c.city?.toLowerCase().includes(q) || false;
      return matchName || matchCode || matchCity;
    }
    return true;
  });

  // Filtered available programs for center assignment
  const filteredAvailablePrograms = availablePrograms.filter((p) => {
    if (!programSearch.trim()) return true;
    const q = programSearch.toLowerCase();
    return (
      p.name?.toLowerCase().includes(q) ||
      p.code?.toLowerCase().includes(q) ||
      p.university?.name?.toLowerCase().includes(q) ||
      p.university?.code?.toLowerCase().includes(q)
    );
  });

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-2xl font-bold tracking-tight">Academic Centers</h2>
            <Badge variant="outline" className="bg-primary/5 text-primary border-primary/20 text-xs font-semibold">
              Modular LMS
            </Badge>
          </div>
          <p className="text-sm text-muted-foreground mt-1">
            Manage Offline campuses and Online centers, assign Academic Counselors, and review programs & enrollments.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={() => setCounselorModalOpen(true)} className="gap-2">
            <UserCheck className="w-4 h-4 text-primary" />
            Add Counselor
          </Button>
          <Button onClick={openCreateCenter} className="gap-2 bg-primary text-primary-foreground shadow-sm">
            <Plus className="w-4 h-4" />
            Create Center
          </Button>
        </div>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        <Card className="bg-gradient-to-br from-card to-card/50 shadow-sm border-border">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Total Centers</p>
              <p className="text-2xl font-bold mt-1">{totalCenters}</p>
            </div>
            <div className="p-2.5 bg-primary/10 rounded-xl text-primary">
              <Building2 className="w-5 h-5" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-card to-card/50 shadow-sm border-border">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Offline Campuses</p>
              <p className="text-2xl font-bold mt-1 text-emerald-600 dark:text-emerald-400">{offlineCenters}</p>
            </div>
            <div className="p-2.5 bg-emerald-500/10 rounded-xl text-emerald-600 dark:text-emerald-400">
              <MapPin className="w-5 h-5" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-card to-card/50 shadow-sm border-border">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Online Centers</p>
              <p className="text-2xl font-bold mt-1 text-blue-600 dark:text-blue-400">{onlineCenters}</p>
            </div>
            <div className="p-2.5 bg-blue-500/10 rounded-xl text-blue-600 dark:text-blue-400">
              <Globe className="w-5 h-5" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-card to-card/50 shadow-sm border-border">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Counselors</p>
              <p className="text-2xl font-bold mt-1 text-indigo-600 dark:text-indigo-400">{counselors.length}</p>
            </div>
            <div className="p-2.5 bg-indigo-500/10 rounded-xl text-indigo-600 dark:text-indigo-400">
              <UserCheck className="w-5 h-5" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-card to-card/50 shadow-sm border-border">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Enrolled Students</p>
              <p className="text-2xl font-bold mt-1 text-amber-600 dark:text-amber-400">{totalStudents}</p>
            </div>
            <div className="p-2.5 bg-amber-500/10 rounded-xl text-amber-600 dark:text-amber-400">
              <GraduationCap className="w-5 h-5" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Content Tabs */}
      <Tabs value={activeSubTab} onValueChange={(v) => setActiveSubTab(v as any)} className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b pb-3">
          <TabsList className="bg-muted/60 p-1">
            <TabsTrigger value="centers" className="gap-2">
              <Building2 className="w-4 h-4" />
              Centers ({centers.length})
            </TabsTrigger>
            <TabsTrigger value="counselors" className="gap-2">
              <UserCheck className="w-4 h-4" />
              Academic Counselors ({counselors.length})
            </TabsTrigger>
          </TabsList>

          {activeSubTab === 'centers' && (
            <div className="flex items-center gap-2">
              <div className="relative w-64">
                <Search className="w-4 h-4 absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Search centers..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-8 h-9 text-xs"
                />
              </div>

              <div className="flex items-center bg-muted/40 p-0.5 rounded-lg border">
                <button
                  type="button"
                  onClick={() => setTypeFilter('ALL')}
                  className={`px-3 py-1 text-xs font-medium rounded-md transition-all ${
                    typeFilter === 'ALL' ? 'bg-background shadow-xs text-foreground' : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  All
                </button>
                <button
                  type="button"
                  onClick={() => setTypeFilter('OFFLINE')}
                  className={`px-3 py-1 text-xs font-medium rounded-md transition-all flex items-center gap-1 ${
                    typeFilter === 'OFFLINE' ? 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 font-semibold' : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  <MapPin className="w-3 h-3" />
                  Offline
                </button>
                <button
                  type="button"
                  onClick={() => setTypeFilter('ONLINE')}
                  className={`px-3 py-1 text-xs font-medium rounded-md transition-all flex items-center gap-1 ${
                    typeFilter === 'ONLINE' ? 'bg-blue-500/15 text-blue-700 dark:text-blue-300 font-semibold' : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  <Globe className="w-3 h-3" />
                  Online
                </button>
              </div>
            </div>
          )}
        </div>

        {/* TAB 1: CENTERS */}
        <TabsContent value="centers" className="m-0 space-y-4">
          {loading ? (
            <div className="flex items-center justify-center p-12 text-muted-foreground text-sm">
              Loading academic centers...
            </div>
          ) : filteredCenters.length === 0 ? (
            <Card className="border-dashed p-10 text-center">
              <Building2 className="w-12 h-12 mx-auto text-muted-foreground/50 mb-3" />
              <h3 className="text-base font-semibold">No Academic Centers Found</h3>
              <p className="text-sm text-muted-foreground mt-1 max-w-sm mx-auto">
                Get started by creating an Offline campus or an Online learning center.
              </p>
              <Button onClick={openCreateCenter} className="mt-4 gap-2">
                <Plus className="w-4 h-4" />
                Create First Center
              </Button>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              {filteredCenters.map((center) => (
                <Card key={center.id} className="relative overflow-hidden border transition-all hover:shadow-md hover:border-primary/40 flex flex-col justify-between">
                  <div>
                    {/* Top Stripe for Type */}
                    <div className={`h-1.5 w-full ${center.type === 'ONLINE' ? 'bg-gradient-to-r from-blue-500 to-indigo-600' : 'bg-gradient-to-r from-emerald-500 to-teal-600'}`} />

                    <CardHeader className="p-4 pb-3">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <div className="flex items-center gap-2">
                            <h3 className="font-semibold text-base leading-tight">{center.name}</h3>
                          </div>
                          <p className="text-xs text-muted-foreground mt-0.5 font-mono">Code: {center.code}</p>
                        </div>

                        <div className="flex items-center gap-1.5">
                          {center.type === 'ONLINE' ? (
                            <Badge className="bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-200 dark:border-blue-800 text-[11px] font-medium gap-1 px-2 py-0.5">
                              <Globe className="w-3 h-3" />
                              Online
                            </Badge>
                          ) : (
                            <Badge className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800 text-[11px] font-medium gap-1 px-2 py-0.5">
                              <MapPin className="w-3 h-3" />
                              Offline
                            </Badge>
                          )}
                          <Badge variant={center.status === 'ACTIVE' ? 'default' : 'secondary'} className="text-[10px] uppercase">
                            {center.status}
                          </Badge>
                        </div>
                      </div>

                      {center.description && (
                        <p className="text-xs text-muted-foreground line-clamp-2 mt-2">
                          {center.description}
                        </p>
                      )}
                    </CardHeader>

                    <CardContent className="p-4 pt-0 space-y-3">
                      {/* Location or Platform */}
                      <div className="p-2.5 rounded-lg bg-muted/40 text-xs space-y-1 border">
                        {center.type === 'OFFLINE' ? (
                          <div className="flex items-start gap-2 text-muted-foreground">
                            <MapPin className="w-3.5 h-3.5 mt-0.5 shrink-0 text-emerald-600" />
                            <span>
                              {center.address ? `${center.address}, ` : ''}
                              {center.city ? `${center.city}, ` : ''}
                              {center.state || ''} {center.pincode || ''}
                              {!center.address && !center.city && 'No address specified'}
                            </span>
                          </div>
                        ) : (
                          <div className="flex items-start gap-2 text-muted-foreground">
                            <Video className="w-3.5 h-3.5 mt-0.5 shrink-0 text-blue-600" />
                            <span>
                              Platform: <strong className="text-foreground">{center.meetingPlatform || 'Online Portal'}</strong>
                              {center.onlineAccessUrl && (
                                <span className="block truncate text-[11px] text-blue-600 underline">
                                  {center.onlineAccessUrl}
                                </span>
                              )}
                            </span>
                          </div>
                        )}
                      </div>

                      {/* Assigned Counselors */}
                      <div>
                        <div className="flex items-center justify-between text-xs mb-1.5">
                          <span className="font-medium text-muted-foreground flex items-center gap-1">
                            <UserCheck className="w-3 h-3 text-primary" />
                            Academic Counselor(s):
                          </span>
                          <span className="text-[11px] text-muted-foreground">
                            {center.counselors?.length || 0} assigned
                          </span>
                        </div>

                        {center.counselors && center.counselors.length > 0 ? (
                          <div className="flex items-center justify-between gap-2 p-2 rounded-lg bg-primary/5 border border-primary/15">
                            <div className="flex flex-wrap items-center gap-1.5 flex-1 min-w-0">
                              {center.counselors.map((c) => (
                                <Badge key={c.id} variant="outline" className="bg-background text-xs py-0.5 px-2 font-medium border-primary/20 shadow-xs">
                                  {c.counselor.name}
                                  {c.isPrimary && <span className="ml-1 text-[10px] text-primary font-bold">(Lead)</span>}
                                </Badge>
                              ))}
                            </div>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => openAssignCounselor(center)}
                              className="h-6 text-[11px] font-semibold text-primary hover:text-primary hover:bg-primary/10 border-primary/30 px-2 flex items-center gap-1 shrink-0"
                              title="Change Academic Counselor"
                            >
                              <RefreshCw className="w-3 h-3" />
                              Change
                            </Button>
                          </div>
                        ) : (
                          <div className="text-xs text-amber-600 dark:text-amber-400 bg-amber-500/10 border border-amber-500/20 rounded p-2 flex items-center justify-between">
                            <span>No counselor assigned yet!</span>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => openAssignCounselor(center)}
                              className="h-6 text-[11px] text-amber-700 dark:text-amber-300 hover:bg-amber-500/20 p-1 font-semibold"
                            >
                              Assign Now
                            </Button>
                          </div>
                        )}
                      </div>

                      {/* Assigned Programs */}
                      <div>
                        <div className="flex items-center justify-between text-xs mb-1.5">
                          <span className="font-medium text-muted-foreground flex items-center gap-1">
                            <BookOpen className="w-3 h-3 text-indigo-500" />
                            Assigned Programs:
                          </span>
                          <span className="text-[11px] text-muted-foreground">
                            {center.assignedPrograms?.length ?? center._count?.assignedPrograms ?? 0} assigned
                          </span>
                        </div>

                        {center.assignedPrograms && center.assignedPrograms.length > 0 ? (
                          <div className="flex flex-wrap items-center gap-1.5 p-2 rounded-lg bg-indigo-500/5 border border-indigo-500/15">
                            {center.assignedPrograms.map((p) => (
                              <Badge key={p.id} variant="outline" className="bg-background text-xs py-0.5 px-2 font-medium border-indigo-500/20 shadow-2xs">
                                {p.name} {p.code ? `(${p.code})` : ''}
                              </Badge>
                            ))}
                          </div>
                        ) : (
                          <div className="text-xs text-amber-600 dark:text-amber-400 bg-amber-500/10 border border-amber-500/20 rounded p-2 flex items-center justify-between">
                            <span>No programs assigned!</span>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => openEditCenter(center)}
                              className="h-6 text-[11px] text-amber-700 dark:text-amber-300 hover:bg-amber-500/20 p-1 font-semibold"
                            >
                              Assign Programs
                            </Button>
                          </div>
                        )}
                      </div>

                      {/* Mini Stats Footer */}
                      <div className="grid grid-cols-3 gap-2 pt-2 border-t text-center">
                        <div className="bg-muted/20 p-1.5 rounded">
                          <p className="text-[10px] text-muted-foreground uppercase font-medium">Programs</p>
                          <p className="text-sm font-semibold mt-0.5">
                            {center.assignedPrograms?.length ?? center._count?.assignedPrograms ?? center._count?.programs ?? 0}
                          </p>
                        </div>
                        <div className="bg-muted/20 p-1.5 rounded">
                          <p className="text-[10px] text-muted-foreground uppercase font-medium">Teachers</p>
                          <p className="text-sm font-semibold mt-0.5">{center._count?.teachers || 0}</p>
                        </div>
                        <button
                          type="button"
                          onClick={() => openViewStudents(center)}
                          className="bg-muted/20 hover:bg-primary/10 hover:border-primary/30 border border-transparent p-1.5 rounded transition-all cursor-pointer text-center group"
                          title="Click to view enrolled students"
                        >
                          <p className="text-[10px] text-muted-foreground group-hover:text-primary uppercase font-medium">Students</p>
                          <p className="text-sm font-semibold mt-0.5 group-hover:text-primary">{center._count?.students || 0}</p>
                        </button>
                      </div>
                    </CardContent>
                  </div>

                  {/* Actions Bar */}
                  <div className="p-3 bg-muted/20 border-t flex items-center justify-between gap-2 flex-wrap">
                    <div className="flex items-center gap-1.5">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => openAssignCounselor(center)}
                        className="text-xs h-8 gap-1.5 font-medium"
                      >
                        {center.counselors && center.counselors.length > 0 ? (
                          <>
                            <RefreshCw className="w-3.5 h-3.5 text-primary" />
                            Change Counselor
                          </>
                        ) : (
                          <>
                            <UserCheck className="w-3.5 h-3.5 text-primary" />
                            Assign Counselor
                          </>
                        )}
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => openViewStudents(center)}
                        className="text-xs h-8 gap-1.5 font-medium text-primary hover:bg-primary/10"
                        title="View enrolled students"
                      >
                        <Users className="w-3.5 h-3.5" />
                        Students ({center._count?.students || 0})
                      </Button>
                    </div>
                    <div className="flex items-center gap-1">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => openEditCenter(center)}
                        className="text-xs h-8 gap-1"
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                        Edit
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => openDeleteCenter(center)}
                        className="text-xs h-8 gap-1 text-rose-600 hover:text-rose-700 hover:bg-rose-500/10"
                        title="Delete Center"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        Delete
                      </Button>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        {/* TAB 2: COUNSELORS */}
        <TabsContent value="counselors" className="m-0 space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">
              Academic Counselors can create programs, assign teachers, upload learning resources, and register students for their assigned centers.
            </p>
            <Button onClick={() => setCounselorModalOpen(true)} className="gap-2">
              <Plus className="w-4 h-4" />
              Register Counselor
            </Button>
          </div>

          {counselors.length === 0 ? (
            <Card className="border-dashed p-8 text-center">
              <UserCheck className="w-12 h-12 mx-auto text-muted-foreground/50 mb-3" />
              <h3 className="text-base font-semibold">No Academic Counselors Registered</h3>
              <p className="text-sm text-muted-foreground mt-1 max-w-sm mx-auto">
                Register an Academic Counselor so they can manage center programs, teachers, and student admissions.
              </p>
              <Button onClick={() => setCounselorModalOpen(true)} className="mt-4 gap-2">
                <Plus className="w-4 h-4" />
                Register First Counselor
              </Button>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {counselors.map((c) => (
                <Card key={c.id} className="border transition-all hover:shadow-md">
                  <CardContent className="p-5 space-y-4">
                    <div className="flex items-start justify-between">
                      <div>
                        <h4 className="font-semibold text-base">{c.name}</h4>
                        <p className="text-xs text-primary font-medium mt-0.5">{c.specialization || 'Academic Counselor'}</p>
                      </div>
                      <Badge variant="outline" className="bg-emerald-500/10 text-emerald-600 text-[10px]">
                        ACTIVE
                      </Badge>
                    </div>

                    <div className="space-y-1.5 text-xs text-muted-foreground">
                      <div className="flex items-center gap-2">
                        <Mail className="w-3.5 h-3.5 text-muted-foreground" />
                        <span>{c.email}</span>
                      </div>
                      {c.phone && (
                        <div className="flex items-center gap-2">
                          <Phone className="w-3.5 h-3.5 text-muted-foreground" />
                          <span>{c.phone}</span>
                        </div>
                      )}
                    </div>

                    <div className="pt-2 border-t">
                      <p className="text-[11px] font-medium text-muted-foreground mb-1.5">Assigned Centers:</p>
                      {c.assignedCenters && c.assignedCenters.length > 0 ? (
                        <div className="flex flex-wrap gap-1">
                          {c.assignedCenters.map((ac) => (
                            <Badge key={ac.id} variant="secondary" className="text-[11px] gap-1 py-0.5">
                              {ac.type === 'ONLINE' ? <Globe className="w-2.5 h-2.5 text-blue-500" /> : <MapPin className="w-2.5 h-2.5 text-emerald-500" />}
                              {ac.name}
                            </Badge>
                          ))}
                        </div>
                      ) : (
                        <p className="text-xs text-muted-foreground italic">Not assigned to any center yet</p>
                      )}
                    </div>

                    <div className="grid grid-cols-3 gap-1 pt-2 border-t text-center text-xs">
                      <div>
                        <span className="text-muted-foreground text-[10px] uppercase">Programs</span>
                        <p className="font-semibold mt-0.5">{c.counts?.programs || 0}</p>
                      </div>
                      <div>
                        <span className="text-muted-foreground text-[10px] uppercase">Materials</span>
                        <p className="font-semibold mt-0.5">{c.counts?.materials || 0}</p>
                      </div>
                      <div>
                        <span className="text-muted-foreground text-[10px] uppercase">Students</span>
                        <p className="font-semibold mt-0.5">{c.counts?.students || 0}</p>
                      </div>
                    </div>

                    <div className="pt-3 border-t flex items-center justify-end">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => openEditCounselor(c)}
                        className="text-xs h-8 gap-1.5 hover:border-primary/50 text-foreground"
                      >
                        <Edit3 className="w-3.5 h-3.5 text-primary" />
                        Edit Details
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* MODAL 1: CREATE / EDIT CENTER */}
      <Dialog open={centerModalOpen} onOpenChange={setCenterModalOpen}>
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle>{editingCenter ? 'Edit Academic Center' : 'Create New Academic Center'}</DialogTitle>
            <DialogDescription>
              Specify whether this center operates as a physical Offline campus or an Online learning center.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSaveCenter} className="space-y-4 pt-2">
            {/* Type Selector (Offline vs Online) */}
            <div className="space-y-2">
              <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Center Delivery Type</Label>
              <div className="grid grid-cols-2 gap-3">
                <div
                  onClick={() => setCenterForm((prev) => ({ ...prev, type: 'OFFLINE' }))}
                  className={`p-3.5 rounded-xl border-2 cursor-pointer transition-all flex items-start gap-3 ${
                    centerForm.type === 'OFFLINE'
                      ? 'border-emerald-500 bg-emerald-500/10 shadow-xs'
                      : 'border-border hover:border-muted-foreground/30'
                  }`}
                >
                  <div className={`p-2 rounded-lg ${centerForm.type === 'OFFLINE' ? 'bg-emerald-500 text-white' : 'bg-muted text-muted-foreground'}`}>
                    <MapPin className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="font-semibold text-sm">Offline Center</h4>
                    <p className="text-xs text-muted-foreground mt-0.5">Physical campus / classroom institute</p>
                  </div>
                </div>

                <div
                  onClick={() => setCenterForm((prev) => ({ ...prev, type: 'ONLINE' }))}
                  className={`p-3.5 rounded-xl border-2 cursor-pointer transition-all flex items-start gap-3 ${
                    centerForm.type === 'ONLINE'
                      ? 'border-blue-500 bg-blue-500/10 shadow-xs'
                      : 'border-border hover:border-muted-foreground/30'
                  }`}
                >
                  <div className={`p-2 rounded-lg ${centerForm.type === 'ONLINE' ? 'bg-blue-500 text-white' : 'bg-muted text-muted-foreground'}`}>
                    <Globe className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="font-semibold text-sm">Online Center</h4>
                    <p className="text-xs text-muted-foreground mt-0.5">Virtual center with live class platform</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Basic Info */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="cName">Center Name *</Label>
                <Input
                  id="cName"
                  placeholder={centerForm.type === 'ONLINE' ? 'e.g. Apex Online Academy' : 'e.g. Metro Campus Mumbai'}
                  value={centerForm.name}
                  onChange={(e) => setCenterForm({ ...centerForm, name: e.target.value })}
                  required
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="cCode">Unique Center Code *</Label>
                <Input
                  id="cCode"
                  placeholder={centerForm.type === 'ONLINE' ? 'e.g. AC-ON-01' : 'e.g. AC-MUM-01'}
                  value={centerForm.code}
                  onChange={(e) => setCenterForm({ ...centerForm, code: e.target.value })}
                  required
                />
              </div>
            </div>

            {/* Conditional Fields based on Offline vs. Online */}
            {centerForm.type === 'OFFLINE' ? (
              <div className="space-y-3 p-3.5 bg-emerald-500/5 rounded-xl border border-emerald-500/20">
                <h5 className="text-xs font-semibold text-emerald-700 dark:text-emerald-300 uppercase tracking-wider flex items-center gap-1.5">
                  <MapPin className="w-3.5 h-3.5" />
                  Physical Campus Location
                </h5>

                <div className="space-y-1.5">
                  <Label htmlFor="cAddress">Address</Label>
                  <Input
                    id="cAddress"
                    placeholder="Building, Street, Landmark"
                    value={centerForm.address}
                    onChange={(e) => setCenterForm({ ...centerForm, address: e.target.value })}
                  />
                </div>

                <div className="grid grid-cols-3 gap-2">
                  <div className="space-y-1">
                    <Label htmlFor="cCity">City</Label>
                    <Input
                      id="cCity"
                      placeholder="City"
                      value={centerForm.city}
                      onChange={(e) => setCenterForm({ ...centerForm, city: e.target.value })}
                    />
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="cState">State</Label>
                    <Input
                      id="cState"
                      placeholder="State"
                      value={centerForm.state}
                      onChange={(e) => setCenterForm({ ...centerForm, state: e.target.value })}
                    />
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="cPincode">Pincode</Label>
                    <Input
                      id="cPincode"
                      placeholder="Pincode"
                      value={centerForm.pincode}
                      onChange={(e) => setCenterForm({ ...centerForm, pincode: e.target.value })}
                    />
                  </div>
                </div>
              </div>
            ) : (
              <div className="space-y-3 p-3.5 bg-blue-500/5 rounded-xl border border-blue-500/20">
                <h5 className="text-xs font-semibold text-blue-700 dark:text-blue-300 uppercase tracking-wider flex items-center gap-1.5">
                  <Globe className="w-3.5 h-3.5" />
                  Online Platform Details
                </h5>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label htmlFor="cPlatform">Meeting Platform</Label>
                    <Select
                      value={centerForm.meetingPlatform}
                      onValueChange={(val) => setCenterForm({ ...centerForm, meetingPlatform: val })}
                    >
                      <SelectTrigger id="cPlatform">
                        <SelectValue placeholder="Select platform" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Zoom">Zoom</SelectItem>
                        <SelectItem value="Google Meet">Google Meet</SelectItem>
                        <SelectItem value="Microsoft Teams">Microsoft Teams</SelectItem>
                        <SelectItem value="Custom Portal">Custom Portal</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="cUrl">Access / Portal URL</Label>
                    <Input
                      id="cUrl"
                      placeholder="https://..."
                      value={centerForm.onlineAccessUrl}
                      onChange={(e) => setCenterForm({ ...centerForm, onlineAccessUrl: e.target.value })}
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Contact details */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="cEmail">Contact Email</Label>
                <Input
                  id="cEmail"
                  type="email"
                  placeholder="center@example.com"
                  value={centerForm.contactEmail}
                  onChange={(e) => setCenterForm({ ...centerForm, contactEmail: e.target.value })}
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="cPhone">Contact Phone</Label>
                <Input
                  id="cPhone"
                  placeholder="+91 9876543210"
                  value={centerForm.contactPhone}
                  onChange={(e) => setCenterForm({ ...centerForm, contactPhone: e.target.value })}
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="cDesc">Description / Notes</Label>
              <Textarea
                id="cDesc"
                rows={2}
                placeholder="Brief description of this center..."
                value={centerForm.description}
                onChange={(e) => setCenterForm({ ...centerForm, description: e.target.value })}
              />
            </div>

            {/* Assign Program (Single Program Mandatory) */}
            <div className="space-y-2.5 p-3.5 bg-muted/40 rounded-xl border">
              <div className="flex items-center justify-between">
                <div>
                  <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                    <BookOpen className="w-3.5 h-3.5 text-primary" />
                    Assigned Program (Single Program) <span className="text-destructive font-bold">*</span>
                  </Label>
                  <p className="text-[11px] text-muted-foreground mt-0.5">
                    Each academic center is bound to exactly one program. Select the program for this center.
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Badge
                    variant={centerForm.programIds.length === 1 ? 'default' : 'destructive'}
                    className="text-[11px] font-semibold"
                  >
                    {centerForm.programIds.length === 1 ? '1 Program Selected' : 'No Program Selected'}
                  </Badge>
                </div>
              </div>

              <div className="relative">
                <Search className="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-muted-foreground" />
                <Input
                  placeholder="Search programs by name, code or university..."
                  value={programSearch}
                  onChange={(e) => setProgramSearch(e.target.value)}
                  className="h-8 pl-8 text-xs bg-background"
                />
              </div>

              <div className="max-h-48 overflow-y-auto border rounded-lg p-2 space-y-1.5 bg-background">
                {filteredAvailablePrograms.length === 0 ? (
                  <div className="text-center py-4 text-xs text-muted-foreground">
                    {availablePrograms.length === 0
                      ? 'No university programs found in this organization.'
                      : 'No programs match your search query.'}
                  </div>
                ) : (
                  filteredAvailablePrograms.map((prog) => {
                    const isSelected = centerForm.programIds.includes(prog.id);
                    return (
                      <div
                        key={prog.id}
                        onClick={() => {
                          setCenterForm((prev) => ({
                            ...prev,
                            programIds: [prog.id],
                          }));
                        }}
                        className={`flex items-center justify-between p-2 rounded-lg border cursor-pointer text-xs transition-all ${
                          isSelected
                            ? 'bg-primary/10 border-primary/50 text-foreground font-medium shadow-2xs'
                            : 'hover:bg-muted/50 border-border/70 text-muted-foreground'
                        }`}
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <div
                            className={`w-4 h-4 rounded-full flex items-center justify-center border transition-colors shrink-0 ${
                              isSelected
                                ? 'border-primary bg-primary text-primary-foreground'
                                : 'border-muted-foreground/40'
                            }`}
                          >
                            {isSelected && <div className="w-1.5 h-1.5 rounded-full bg-background" />}
                          </div>
                          <div className="truncate">
                            <span className="font-semibold text-foreground">{prog.name}</span>
                            <span className="ml-1.5 text-muted-foreground text-[11px]">({prog.code})</span>
                            {prog.university && (
                              <span className="ml-2 text-[10px] px-1.5 py-0.5 rounded bg-muted font-medium text-foreground">
                                {prog.university.name || prog.university.code}
                              </span>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-1.5 shrink-0 ml-2">
                          {typeof prog._count?.students === 'number' && (
                            <span className="text-[10px] px-1.5 py-0.5 rounded bg-blue-500/10 text-blue-700 dark:text-blue-300 font-semibold border border-blue-500/20">
                              {prog._count.students} {prog._count.students === 1 ? 'student' : 'students'}
                            </span>
                          )}
                          {isSelected && (
                            <Badge variant="secondary" className="text-[10px] py-0 px-1.5 h-5 shrink-0 bg-primary/20 text-primary font-semibold">
                              Selected
                            </Badge>
                          )}
                        </div>
                      </div>
                    );
                  })
                )}
              </div>

              {centerForm.programIds.length === 0 && (
                <div className="flex items-center gap-1.5 text-xs text-destructive font-medium pt-1">
                  <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                  <span>Please select a program for this academic center.</span>
                </div>
              )}
            </div>

            <DialogFooter className="pt-2">
              <Button type="button" variant="outline" onClick={() => setCenterModalOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={submitting || centerForm.programIds.length !== 1}>
                {submitting ? 'Saving...' : editingCenter ? 'Update Center' : 'Create Center'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* MODAL 2: REGISTER COUNSELOR */}
      <Dialog open={counselorModalOpen} onOpenChange={setCounselorModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Register Academic Counselor</DialogTitle>
            <DialogDescription>
              Create credentials for an Academic Counselor so they can log in and manage center programs, learning materials, and students.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleRegisterCounselor} className="space-y-3.5 pt-2">
            <div className="space-y-1.5">
              <Label htmlFor="crName">Full Name *</Label>
              <Input
                id="crName"
                placeholder="Dr. John Doe"
                value={counselorForm.name}
                onChange={(e) => setCounselorForm({ ...counselorForm, name: e.target.value })}
                required
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="crEmail">Email Address (Login Username) *</Label>
              <Input
                id="crEmail"
                type="email"
                placeholder="counselor@institution.com"
                value={counselorForm.email}
                onChange={(e) => setCounselorForm({ ...counselorForm, email: e.target.value })}
                required
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="crPassword">Initial Password *</Label>
              <Input
                id="crPassword"
                type="password"
                placeholder="Secure password"
                value={counselorForm.password}
                onChange={(e) => setCounselorForm({ ...counselorForm, password: e.target.value })}
                required
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="crPhone">Phone Number</Label>
              <Input
                id="crPhone"
                placeholder="+91 9876543210"
                value={counselorForm.phone}
                onChange={(e) => setCounselorForm({ ...counselorForm, phone: e.target.value })}
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="crSpec">Specialization / Department</Label>
              <Input
                id="crSpec"
                placeholder="e.g. Computer Science, Medical, Management"
                value={counselorForm.specialization}
                onChange={(e) => setCounselorForm({ ...counselorForm, specialization: e.target.value })}
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="crCenter">Assign to Center (Optional)</Label>
              <Select
                value={counselorForm.centerId}
                onValueChange={(val) => setCounselorForm({ ...counselorForm, centerId: val })}
              >
                <SelectTrigger id="crCenter">
                  <SelectValue placeholder="Select center (or assign later)" />
                </SelectTrigger>
                <SelectContent>
                  {centers.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.name} ({c.type})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <DialogFooter className="pt-2">
              <Button type="button" variant="outline" onClick={() => setCounselorModalOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={submitting}>
                {submitting ? 'Registering...' : 'Register Counselor'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* MODAL 3: ASSIGN / CHANGE COUNSELOR TO CENTER */}
      <Dialog open={assignModalOpen} onOpenChange={setAssignModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {assignTargetCenter?.counselors && assignTargetCenter.counselors.length > 0 ? (
                <>
                  <RefreshCw className="w-5 h-5 text-primary" />
                  Change Academic Counselor
                </>
              ) : (
                <>
                  <UserCheck className="w-5 h-5 text-primary" />
                  Assign Academic Counselor
                </>
              )}
            </DialogTitle>
            <DialogDescription>
              {assignTargetCenter?.counselors && assignTargetCenter.counselors.length > 0 ? (
                <>Select a new counselor or reassign for <strong>{assignTargetCenter?.name}</strong>.</>
              ) : (
                <>Assign an Academic Counselor to manage <strong>{assignTargetCenter?.name}</strong>.</>
              )}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 pt-2">
            {/* Show currently assigned counselor(s) if present */}
            {assignTargetCenter?.counselors && assignTargetCenter.counselors.length > 0 && (
              <div className="p-3 rounded-lg bg-muted/50 border space-y-2">
                <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                  Currently Assigned Counselor:
                </span>
                <div className="space-y-1.5">
                  {assignTargetCenter.counselors.map((c) => (
                    <div key={c.id} className="flex items-center justify-between bg-background p-2 rounded border text-xs">
                      <div>
                        <div className="font-semibold text-foreground flex items-center gap-1.5">
                          {c.counselor.name}
                          {c.isPrimary && <Badge variant="secondary" className="text-[10px] py-0 px-1 text-primary">Lead</Badge>}
                        </div>
                        <div className="text-muted-foreground text-[11px]">{c.counselor.email}</div>
                      </div>
                      <Button
                        type="button"
                        size="sm"
                        variant="ghost"
                        onClick={() => {
                          handleUnassignCounselor(assignTargetCenter.id, c.counselorId, c.counselor.name);
                          setAssignModalOpen(false);
                        }}
                        className="h-7 text-xs text-destructive hover:text-destructive hover:bg-destructive/10 px-2"
                        title="Remove counselor from center"
                      >
                        Remove
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="space-y-1.5">
              <Label htmlFor="selCounselor">
                {assignTargetCenter?.counselors && assignTargetCenter.counselors.length > 0
                  ? 'Select New / Reassigned Counselor *'
                  : 'Select Counselor *'}
              </Label>
              <Select
                value={selectedCounselorId}
                onValueChange={(val) => setSelectedCounselorId(val)}
              >
                <SelectTrigger id="selCounselor">
                  <SelectValue placeholder="Choose a counselor" />
                </SelectTrigger>
                <SelectContent>
                  {counselors.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.name} ({c.email})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {assignTargetCenter?.counselors && assignTargetCenter.counselors.length > 0 && (
              <div className="flex items-center gap-2 pt-1">
                <input
                  type="checkbox"
                  id="replacePrev"
                  checked={replacePreviousCounselor}
                  onChange={(e) => setReplacePreviousCounselor(e.target.checked)}
                  className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
                />
                <Label htmlFor="replacePrev" className="text-xs cursor-pointer">
                  Replace currently assigned counselor (recommended)
                </Label>
              </div>
            )}

            <div className="flex items-center gap-2 pt-1">
              <input
                type="checkbox"
                id="isPrimary"
                checked={isPrimaryCounselor}
                onChange={(e) => setIsPrimaryCounselor(e.target.checked)}
                className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
              />
              <Label htmlFor="isPrimary" className="text-xs cursor-pointer">
                Designate as Primary / Lead Counselor for this Center
              </Label>
            </div>

            <DialogFooter className="pt-2">
              <Button type="button" variant="outline" onClick={() => setAssignModalOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleAssignCounselor} disabled={submitting}>
                {submitting
                  ? (assignTargetCenter?.counselors && assignTargetCenter.counselors.length > 0 ? 'Updating...' : 'Assigning...')
                  : (assignTargetCenter?.counselors && assignTargetCenter.counselors.length > 0 ? 'Change Counselor' : 'Confirm Assignment')}
              </Button>
            </DialogFooter>
          </div>
        </DialogContent>
      </Dialog>

      {/* MODAL 4: EDIT COUNSELOR DETAILS */}
      <Dialog open={editCounselorModalOpen} onOpenChange={setEditCounselorModalOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Edit Academic Counselor</DialogTitle>
            <DialogDescription>
              Update personal details, login credentials, or center assignments for <strong>{editingCounselor?.name}</strong>.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleUpdateCounselor} className="space-y-3.5 pt-2 max-h-[80vh] overflow-y-auto pr-1">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="edName">Full Name *</Label>
                <Input
                  id="edName"
                  value={editCounselorForm.name}
                  onChange={(e) => setEditCounselorForm({ ...editCounselorForm, name: e.target.value })}
                  required
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="edEmail">Email Address (Login Username) *</Label>
                <Input
                  id="edEmail"
                  type="email"
                  value={editCounselorForm.email}
                  onChange={(e) => setEditCounselorForm({ ...editCounselorForm, email: e.target.value })}
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="edPhone">Phone Number</Label>
                <Input
                  id="edPhone"
                  placeholder="+91 9876543210"
                  value={editCounselorForm.phone}
                  onChange={(e) => setEditCounselorForm({ ...editCounselorForm, phone: e.target.value })}
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="edSpec">Specialization / Department</Label>
                <Input
                  id="edSpec"
                  placeholder="e.g. Computer Science, Medical"
                  value={editCounselorForm.specialization}
                  onChange={(e) => setEditCounselorForm({ ...editCounselorForm, specialization: e.target.value })}
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="edStatus">Account Status</Label>
                <Select
                  value={editCounselorForm.status}
                  onValueChange={(val) => setEditCounselorForm({ ...editCounselorForm, status: val })}
                >
                  <SelectTrigger id="edStatus">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ACTIVE">ACTIVE</SelectItem>
                    <SelectItem value="INACTIVE">INACTIVE</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="edPass">Reset Password</Label>
                <Input
                  id="edPass"
                  type="password"
                  placeholder="Leave blank to keep current"
                  value={editCounselorForm.password}
                  onChange={(e) => setEditCounselorForm({ ...editCounselorForm, password: e.target.value })}
                />
              </div>
            </div>

            {/* Assigned Centers Selection */}
            <div className="space-y-2 pt-2 border-t">
              <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Assigned Centers:
              </Label>
              <div className="space-y-1.5 max-h-40 overflow-y-auto border p-2 rounded-lg bg-muted/20">
                {centers.length === 0 ? (
                  <p className="text-xs text-muted-foreground">No centers available</p>
                ) : (
                  centers.map((c) => {
                    const isAssigned = editCounselorForm.centerIds.includes(c.id);
                    return (
                      <div
                        key={c.id}
                        onClick={() => toggleEditCounselorCenter(c.id)}
                        className={`p-2 rounded cursor-pointer transition-all flex items-center justify-between text-xs ${
                          isAssigned ? 'bg-primary/10 border-primary/30 border text-primary font-semibold' : 'hover:bg-muted'
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          {c.type === 'ONLINE' ? (
                            <Globe className="w-3.5 h-3.5 text-blue-500" />
                          ) : (
                            <MapPin className="w-3.5 h-3.5 text-emerald-500" />
                          )}
                          <span>{c.name} ({c.code})</span>
                        </div>
                        {isAssigned && <CheckCircle2 className="w-4 h-4 text-primary" />}
                      </div>
                    );
                  })
                )}
              </div>
            </div>

            <DialogFooter className="pt-2">
              <Button type="button" variant="outline" onClick={() => setEditCounselorModalOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={submitting}>
                {submitting ? 'Updating...' : 'Save Changes'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* VIEW CENTER STUDENTS MODAL */}
      <Dialog open={studentsModalOpen} onOpenChange={setStudentsModalOpen}>
        <DialogContent className="max-w-3xl max-h-[85vh] flex flex-col">
          <DialogHeader>
            <div className="flex items-center justify-between gap-2 pr-6">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
                  <Users className="w-4 h-4" />
                </div>
                <div>
                  <DialogTitle className="text-base font-semibold">
                    {viewingCenterForStudents?.name} - Enrolled Students
                  </DialogTitle>
                  <DialogDescription className="text-xs">
                    Students enrolled in this center and its assigned programs
                  </DialogDescription>
                </div>
              </div>
              {viewingCenterForStudents && (
                <div className="flex items-center gap-1.5">
                  <Badge variant="outline" className="font-mono text-[10px]">
                    {viewingCenterForStudents.code}
                  </Badge>
                  <Badge
                    variant={viewingCenterForStudents.type === 'ONLINE' ? 'secondary' : 'default'}
                    className="text-[10px]"
                  >
                    {viewingCenterForStudents.type === 'ONLINE' ? 'Online' : 'Offline'}
                  </Badge>
                </div>
              )}
            </div>
          </DialogHeader>

          {/* Assigned Programs pills */}
          {viewingCenterForStudents?.assignedPrograms && viewingCenterForStudents.assignedPrograms.length > 0 && (
            <div className="flex items-center gap-1.5 flex-wrap px-2 py-1.5 bg-muted/30 rounded-lg text-xs">
              <span className="text-muted-foreground text-[11px] font-medium flex items-center gap-1">
                <BookOpen className="w-3 h-3 text-primary" />
                Programs:
              </span>
              {viewingCenterForStudents.assignedPrograms.map((p) => (
                <span key={p.id} className="px-2 py-0.5 rounded bg-background border text-[11px] font-medium">
                  {p.name} <span className="text-muted-foreground">({p.code})</span>
                </span>
              ))}
            </div>
          )}

          {/* Search bar & count */}
          <div className="flex items-center justify-between gap-3 pt-1">
            <div className="relative flex-1">
              <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-muted-foreground" />
              <Input
                placeholder="Search students by name, roll no, email, or phone..."
                value={studentSearch}
                onChange={(e) => setStudentSearch(e.target.value)}
                className="h-8 pl-9 text-xs"
              />
            </div>
            <Badge variant="outline" className="text-xs font-semibold px-2.5 py-1 shrink-0 bg-primary/5 text-primary border-primary/20">
              {filteredCenterStudents.length} Students
            </Badge>
          </div>

          {/* Students List / Table */}
          <div className="flex-1 overflow-y-auto border rounded-xl divide-y min-h-[250px] max-h-[50vh] bg-background">
            {studentsLoading ? (
              <div className="flex flex-col items-center justify-center py-12 text-muted-foreground gap-2">
                <RefreshCw className="w-6 h-6 animate-spin text-primary" />
                <p className="text-xs">Loading center students...</p>
              </div>
            ) : filteredCenterStudents.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-center text-muted-foreground p-4">
                <Users className="w-8 h-8 stroke-1 text-muted-foreground/50 mb-2" />
                <p className="text-sm font-medium">No students found</p>
                <p className="text-xs mt-1 max-w-sm">
                  {studentSearch
                    ? 'No students matched your search query.'
                    : 'There are currently no students registered or enrolled in this center’s programs.'}
                </p>
              </div>
            ) : (
              filteredCenterStudents.map((student, idx) => (
                <div
                  key={student.id || idx}
                  className="p-3 hover:bg-muted/30 transition-colors flex items-center justify-between gap-3 text-xs"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-8 h-8 rounded-full bg-primary/10 text-primary font-semibold flex items-center justify-center shrink-0 uppercase text-xs">
                      {student.name ? student.name.charAt(0) : 'S'}
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-foreground truncate">{student.name}</span>
                        {(student.studentCode || student.enrollmentNo) && (
                          <Badge variant="outline" className="font-mono text-[10px] px-1.5 py-0 h-4 bg-muted/40">
                            {student.studentCode || student.enrollmentNo}
                          </Badge>
                        )}
                      </div>
                      <div className="flex items-center gap-3 text-muted-foreground text-[11px] mt-0.5">
                        {student.email && (
                          <span className="flex items-center gap-1 truncate">
                            <Mail className="w-3 h-3" />
                            {student.email}
                          </span>
                        )}
                        {student.phone && (
                          <span className="flex items-center gap-1 shrink-0">
                            <Phone className="w-3 h-3" />
                            {student.phone}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 shrink-0 text-right">
                    {student.program && (
                      <div className="hidden sm:block text-right">
                        <p className="font-medium text-foreground text-xs">{student.program.name}</p>
                        <p className="text-[10px] text-muted-foreground">
                          {student.program.university?.name || student.program.code}
                        </p>
                      </div>
                    )}
                    <Badge
                      variant={
                        student.status === 'ACTIVE'
                          ? 'default'
                          : student.status === 'DOCUMENT_REVIEW'
                          ? 'secondary'
                          : 'outline'
                      }
                      className="text-[10px] px-2 py-0.5 uppercase font-semibold"
                    >
                      {student.status || 'ACTIVE'}
                    </Badge>
                  </div>
                </div>
              ))
            )}
          </div>

          <DialogFooter className="pt-2">
            <Button variant="outline" size="sm" onClick={() => setStudentsModalOpen(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* DELETE CENTER CONFIRMATION MODAL */}
      <Dialog open={deleteCenterModalOpen} onOpenChange={setDeleteCenterModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-rose-600">
              <AlertTriangle className="w-5 h-5 text-rose-600" />
              Delete Academic Center
            </DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this center? This will remove all associated schedules, materials, and teacher allocations.
            </DialogDescription>
          </DialogHeader>

          {centerToDelete && (
            <div className="p-3.5 rounded-xl bg-rose-500/5 border border-rose-500/20 text-xs space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-semibold text-sm text-foreground">{centerToDelete.name}</span>
                <Badge variant="outline" className="text-[10px] font-mono">
                  {centerToDelete.code}
                </Badge>
              </div>
              <p className="text-muted-foreground">
                Type: <strong>{centerToDelete.type === 'ONLINE' ? 'Online Center' : 'Offline Campus'}</strong>
                {centerToDelete.city && ` • ${centerToDelete.city}`}
              </p>
              <div className="flex items-center gap-4 text-[11px] text-muted-foreground pt-1 border-t border-rose-500/10">
                <span>{centerToDelete._count?.programs || 0} Programs</span>
                <span>{centerToDelete._count?.teachers || 0} Teachers</span>
                <span>{centerToDelete._count?.students || 0} Students</span>
              </div>
            </div>
          )}

          <DialogFooter className="pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setDeleteCenterModalOpen(false)}
              disabled={deleting}
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant="destructive"
              onClick={handleDeleteCenter}
              disabled={deleting}
              className="gap-1.5 bg-rose-600 hover:bg-rose-700 text-white"
            >
              <Trash2 className="w-4 h-4" />
              {deleting ? 'Deleting...' : 'Delete Center'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
