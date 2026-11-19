
import { useState, useEffect } from 'react';
import { 
  ArrowLeft,
  GraduationCap,
  MapPin,
  Phone,
  Mail,
  FileText,
  Key,
  Copy,
  RefreshCw,
  BookOpen,
  Eye,
  UserX,
  AlertTriangle,
  User,
  Wallet,
  Building2,
  KeyRound,
  Star,
  MessageSquare,
  StickyNote,
  Hash
} from 'lucide-react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { toast } from 'sonner';
import { StudentProgressTab } from '@/components/panels/StudentProgressTab';
import { StudentFeesTab, StudentCommunicationTab, StudentRemarksTab, StudentCustomFilters } from '@/components/panels/StudentProfileTabs';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { format } from 'date-fns';
import { useAuth } from '@/hooks/useAuth';
import api from '@/lib/api';

export function StudentProfilePanel({ student: initialStudent, onBack }: { student: any; onBack: () => void }) {
  const { user } = useAuth();
  const isOrgAdmin = ['org_admin', 'superadmin'].includes(user?.role || '');
  const [student, setStudent] = useState<any>(initialStudent);
  const [isResetting, setIsResetting] = useState(false);
  const [enrollments, setEnrollments] = useState<any[]>([]);
  const [loadingEnrollments, setLoadingEnrollments] = useState(false);

  // Enrollment Dropout Dialog State
  const [dropoutDialogOpen, setDropoutDialogOpen] = useState(false);
  const [dropoutEnrollment, setDropoutEnrollment] = useState<any>(null);
  const [dropoutReason, setDropoutReason] = useState('Financial Constraints');
  const [dropoutCustomReason, setDropoutCustomReason] = useState('');
  const [dropoutRemarks, setDropoutRemarks] = useState('');
  const [dropoutDate, setDropoutDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [dropoutSyncStudent, setDropoutSyncStudent] = useState(true);
  const [dropoutSubmitting, setDropoutSubmitting] = useState(false);

  const handleOpenDropout = (enrollment: any) => {
    setDropoutEnrollment(enrollment);
    setDropoutReason('Financial Constraints');
    setDropoutCustomReason('');
    setDropoutRemarks('');
    setDropoutDate(new Date().toISOString().split('T')[0]);
    setDropoutSyncStudent(true);
    setDropoutDialogOpen(true);
  };

  const handleConfirmDropout = async () => {
    if (!student || !dropoutEnrollment) return;
    setDropoutSubmitting(true);
    try {
      const finalReason = dropoutReason === 'Other' && dropoutCustomReason.trim()
        ? `Other: ${dropoutCustomReason.trim()}`
        : dropoutReason;

      await api.markEnrollmentDropout(student.id, dropoutEnrollment.id, {
        reason: finalReason,
        remarks: dropoutRemarks.trim(),
        dropoutDate,
        updateStudentStatus: dropoutSyncStudent,
      });

      toast.success('Enrollment marked as dropped successfully');
      setDropoutDialogOpen(false);
      refreshData();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to mark enrollment as dropped');
    } finally {
      setDropoutSubmitting(false);
    }
  };

  const refreshData = () => {
    if (student?.id) {
      setLoadingEnrollments(true);
      Promise.all([
        api.get(`/students/${student.id}`),
        api.get(`/students/${student.id}/enrollments`)
      ])
        .then(([sRes, eRes]) => {
          if (sRes.data?.data) setStudent(sRes.data.data);
          if (eRes.data?.data) setEnrollments(eRes.data.data);
        })
        .catch(console.error)
        .finally(() => setLoadingEnrollments(false));
    }
  };

  useEffect(() => {
    refreshData();
  }, [student?.id]);
  
  const handleResetPassword = async () => {
    try {
      setIsResetting(true);
      const newPassword = Math.random().toString(36).slice(-8);
      const response = await api.put(`/students/${student.id}`, {
        credentials: {
          email: student.email,
          password: newPassword
        }
      });
      if (response.data.success) {
        setStudent(response.data.data);
        toast.success('Password reset successfully.');
      }
    } catch (error: any) {
      console.error(error);
      toast.error(error.response?.data?.message || 'Failed to reset password');
    } finally {
      setIsResetting(false);
    }
  };

  if (!student) return null;

  const photoUrl = student.photo 
    ? api.getFileUrl(student.photo)
    : undefined;

  const latestEnrollment = enrollments && enrollments.length > 0 ? enrollments[0] : null;
  const universityName = latestEnrollment?.program?.university?.name || student.university?.name || student.universityId?.name || 'Not Assigned';
  const programName = latestEnrollment?.program?.name || student.program?.name || student.programId?.name || 'Not Assigned';
  const branchName = student.branch?.name || student.branchId?.name || 'Not assigned';
  const fmt = (d: any, pattern = 'dd MMM yyyy') => {
    if (!d) return 'N/A';
    const dt = new Date(d);
    return isNaN(dt.getTime()) ? 'N/A' : format(dt, pattern);
  };

  const joined = student.admissionDate || student.enrollments?.[0]?.createdAt || student.createdAt;
  const completed = student.status === 'completed' || student.isPrevious;

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2 text-sm text-muted-foreground min-w-0">
          <Button variant="outline" size="icon" onClick={onBack} className="h-8 w-8 shrink-0">
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <span>Students</span><span>/</span><span className="font-medium text-foreground truncate">{student.name}</span>
        </div>
        {completed ? (
          <Badge className="bg-emerald-600 text-white px-3 py-1 uppercase font-bold tracking-wider">Completed</Badge>
        ) : (
          <Badge variant="secondary" className="px-3 py-1 uppercase">{student.status}</Badge>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Left Column: Summary Card */}
        <Card className="md:col-span-1 overflow-hidden shadow-sm border-border bg-card self-start">
          <div className="h-20 bg-gradient-to-r from-primary/25 via-primary/10 to-transparent" />
          <CardContent className="pt-0 pb-6">
            <div className="flex flex-col items-center text-center -mt-12">
              <Avatar className="w-24 h-24 border-4 border-background shadow-lg">
                <AvatarImage src={photoUrl} />
                <AvatarFallback className="bg-primary/10 text-primary text-2xl font-bold">
                  {(student.name || '?').substring(0, 2).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <h3 className="text-xl font-bold mt-3">{student.name}</h3>
              <p className="text-sm font-medium text-muted-foreground mt-1 inline-flex items-center gap-1">
                <Hash className="w-3.5 h-3.5" />{student.enrollmentNo || 'Enrollment no. pending'}
              </p>
              {student.admissionNo && <p className="text-xs text-muted-foreground mt-0.5">Admission No: {student.admissionNo}</p>}
              <div className="flex items-center justify-center gap-2 mt-2 text-sm text-slate-600 dark:text-slate-400">
                <GraduationCap className="w-4 h-4 shrink-0" />
                <span>{programName}</span>
              </div>
              {student.videoBlocked && (
                <Badge variant="destructive" className="mt-3 text-[10px] uppercase" title={student.videoBlockReason || ''}>Videos blocked</Badge>
              )}
            </div>

            <div className="mt-6 space-y-2.5">
              {[
                { icon: Mail, label: 'Email', value: student.email || 'Not provided' },
                { icon: Phone, label: 'Phone', value: student.phone || 'Not provided' },
                { icon: MapPin, label: 'Address', value: student.address || 'Not provided' },
              ].map(({ icon: Icon, label, value }) => (
                <div key={label} className="flex items-center gap-3 rounded-xl border bg-muted/30 px-3 py-2.5 min-w-0">
                  <div className="p-2 rounded-lg bg-background border shrink-0"><Icon className="w-4 h-4 text-muted-foreground" /></div>
                  <div className="min-w-0">
                    <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">{label}</p>
                    <p className="text-sm font-medium truncate" title={String(value)}>{value}</p>
                  </div>
                </div>
              ))}
            </div>

            <div className="grid grid-cols-2 gap-2.5 mt-2.5">
              {[
                { label: 'University', value: universityName },
                { label: 'Branch', value: branchName },
                { label: 'Session', value: student.session?.name || 'N/A' },
                { label: 'Admitted on', value: fmt(joined) },
              ].map(({ label, value }) => (
                <div key={label} className="rounded-xl border px-3 py-2.5 min-w-0">
                  <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">{label}</p>
                  <p className="text-sm font-semibold mt-0.5 truncate" title={String(value)}>{value}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Right Column: Tabs */}
        <div className="md:col-span-2">
          <Card className="shadow-sm border-border bg-card h-full">
            <Tabs defaultValue="personal" className="w-full">
              <CardHeader className="border-b p-3 sm:p-4">
                <TabsList className="w-full justify-start h-auto bg-transparent p-0 gap-1.5 overflow-x-auto rounded-none">
                  <TabsTrigger value="personal" className="gap-1.5 rounded-full px-3.5 py-1.5 text-sm font-medium text-muted-foreground data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-sm whitespace-nowrap">
                    <User className="w-4 h-4" /> Personal
                  </TabsTrigger>
                  <TabsTrigger value="enrollments" className="gap-1.5 rounded-full px-3.5 py-1.5 text-sm font-medium text-muted-foreground data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-sm whitespace-nowrap">
                    <GraduationCap className="w-4 h-4" /> Enrollments <span className="opacity-70">({enrollments.length})</span>
                  </TabsTrigger>
                  <TabsTrigger value="documents" className="gap-1.5 rounded-full px-3.5 py-1.5 text-sm font-medium text-muted-foreground data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-sm whitespace-nowrap">
                    <FileText className="w-4 h-4" /> Documents
                  </TabsTrigger>
                  <TabsTrigger value="fees" className="gap-1.5 rounded-full px-3.5 py-1.5 text-sm font-medium text-muted-foreground data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-sm whitespace-nowrap">
                    <Wallet className="w-4 h-4" /> Fees
                  </TabsTrigger>
                  <TabsTrigger value="university" className="gap-1.5 rounded-full px-3.5 py-1.5 text-sm font-medium text-muted-foreground data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-sm whitespace-nowrap">
                    <Building2 className="w-4 h-4" /> University
                  </TabsTrigger>
                  <TabsTrigger value="portal" className="gap-1.5 rounded-full px-3.5 py-1.5 text-sm font-medium text-muted-foreground data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-sm whitespace-nowrap">
                    <KeyRound className="w-4 h-4" /> Portal access
                  </TabsTrigger>
                  <TabsTrigger value="progress" className="gap-1.5 rounded-full px-3.5 py-1.5 text-sm font-medium text-muted-foreground data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-sm whitespace-nowrap">
                    <Star className="w-4 h-4" /> Progress
                  </TabsTrigger>
                  <TabsTrigger value="communication" className="gap-1.5 rounded-full px-3.5 py-1.5 text-sm font-medium text-muted-foreground data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-sm whitespace-nowrap">
                    <MessageSquare className="w-4 h-4" /> Messages
                  </TabsTrigger>
                  <TabsTrigger value="remarks" className="gap-1.5 rounded-full px-3.5 py-1.5 text-sm font-medium text-muted-foreground data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-sm whitespace-nowrap">
                    <StickyNote className="w-4 h-4" /> Remarks
                  </TabsTrigger>
                </TabsList>
              </CardHeader>
              <CardContent className="p-5 sm:p-6">

                {/* Personal Details Tab */}
                <TabsContent value="personal" className="space-y-8 mt-0">
                  <StudentCustomFilters studentId={student.id} />
                  <Section title="Identity">
                    <Field label="Date of Birth" value={fmt(student.dob)} />
                    <Field label="Gender" value={student.gender} capitalize />
                    <Field label="Marital Status" value={student.maritalStatus} capitalize />
                    <Field label="Category" value={student.category} capitalize />
                    <Field label="Religion / Caste" value={[student.religion, student.caste].filter(Boolean).join(' / ')} />
                    <Field label="Employment Status" value={student.employmentStatus} capitalize />
                  </Section>
                  <Section title="Family">
                    <Field label="Father's Name" value={student.fatherName} />
                    <Field label="Father's Phone" value={student.fatherPhone} />
                    <Field label="Mother's Name" value={student.motherName} />
                    <Field label="Mother's Phone" value={student.motherPhone} />
                    <Field label="Guardian" value={student.guardianName} />
                    <Field label="Family Phone" value={student.familyPhone} />
                  </Section>
                  <Section title="Contact">
                    <Field label="Alternate Phone" value={student.altPhone} />
                    <Field label="Pin Code" value={student.pinCode} />
                    <Field label="Address" value={student.address} wide />
                  </Section>
                </TabsContent>

                {/* University Details Tab */}
                <TabsContent value="university" className="space-y-8 mt-0">
                  <Section title="Academic">
                    <Field label="University" value={universityName} />
                    <Field label="Program" value={`${programName}${student.specialisation ? ` - ${student.specialisation}` : ''}`} />
                    <Field label="Session" value={student.session?.name || student.sessionId} />
                    <Field label="Branch" value={branchName} />
                  </Section>
                  <Section title="Dates">
                    <Field label="Admission Date" value={fmt(joined)} />
                    <Field label="Enrolled At" value={fmt(student.enrolledAt, 'dd MMM yyyy, hh:mm a')} />
                  </Section>
                </TabsContent>

                {/* Fees Tab */}
                <TabsContent value="fees" className="mt-0">
                  <StudentFeesTab student={student} />
                </TabsContent>

                {/* Documents Tab */}
                <TabsContent value="documents" className="mt-0">
                  <div className="space-y-4">
                    {student.documents && Array.isArray(student.documents) && student.documents.length > 0 ? (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        {student.documents.map((doc: any, index: number) => (
                          <div key={index} className="flex items-center gap-3 p-3 border border-border rounded-lg bg-muted/30">
                            <FileText className="w-8 h-8 text-primary" />
                            <div className="overflow-hidden">
                              <p className="text-sm font-semibold truncate">{doc.name || 'Document'}</p>
                              <p className="text-xs text-muted-foreground uppercase">{doc.type || 'Unknown Type'}</p>
                            </div>
                            <Button variant="ghost" size="sm" className="ml-auto" onClick={() => window.open(api.getFileUrl(doc.url), '_blank')}>
                              View
                            </Button>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-center py-10 space-y-3">
                        <FileText className="w-10 h-10 mx-auto text-muted-foreground opacity-50" />
                        <h4 className="text-base font-semibold">No Documents Found</h4>
                        <p className="text-sm text-muted-foreground">The student has not uploaded any documents yet.</p>
                      </div>
                    )}
                  </div>
                </TabsContent>

                {/* Student Portal Tab */}
                <TabsContent value="portal" className="mt-0">
                  <div className="space-y-6">
                    <div className="flex flex-col gap-2">
                      <h3 className="text-lg font-bold">Portal Access Credentials</h3>
                      <p className="text-sm text-muted-foreground">
                        Students can log in to the student portal using these credentials to view their progress, download documents, and check fee statuses.
                      </p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="border rounded-lg p-4 space-y-4 bg-muted/20">
                        <div>
                          <p className="text-xs text-muted-foreground uppercase font-semibold mb-1">Portal Login URL</p>
                          <div className="flex items-center gap-2">
                            <code className="text-sm bg-muted px-2 py-1 rounded select-all">
                              {typeof window !== 'undefined' ? window.location.origin.replace('admin', 'student') + '/student-portal' : 'https://portal.example.com'}
                            </code>
                          </div>
                        </div>

                        <div>
                          <p className="text-xs text-muted-foreground uppercase font-semibold mb-1">Login Email</p>
                          <div className="flex items-center gap-2">
                            <Mail className="w-4 h-4 text-muted-foreground" />
                            <span className="font-medium select-all">{student.email}</span>
                          </div>
                        </div>

                        <div>
                          <p className="text-xs text-muted-foreground uppercase font-semibold mb-1">Current Password</p>
                          <div className="flex items-center gap-2">
                            <Key className="w-4 h-4 text-muted-foreground" />
                            {student.credentials?.password ? (
                              <div className="flex items-center gap-2">
                                <span className="font-medium tracking-wide font-mono select-all">{student.credentials.password}</span>
                                <Button 
                                  variant="ghost" 
                                  size="icon" 
                                  className="h-6 w-6 ml-1" 
                                  onClick={() => {
                                    navigator.clipboard.writeText(student.credentials.password);
                                    toast.success('Password copied to clipboard');
                                  }}
                                  title="Copy Password"
                                >
                                  <Copy className="w-3 h-3" />
                                </Button>
                              </div>
                            ) : (
                              <span className="text-muted-foreground italic text-sm">Not set or obscured</span>
                            )}
                          </div>
                        </div>
                      </div>
                      
                      <div className="flex flex-col justify-center space-y-4 border rounded-lg p-6 bg-muted/10">
                        <div className="text-center space-y-2 mb-2">
                          <RefreshCw className="w-8 h-8 text-muted-foreground mx-auto" />
                          <h4 className="font-semibold">Reset Password</h4>
                          <p className="text-sm text-muted-foreground">Generate a new random password for this student. The old password will immediately become invalid.</p>
                        </div>
                        <Button 
                          onClick={handleResetPassword} 
                          disabled={isResetting} 
                          className="w-full"
                          variant="destructive"
                        >
                          {isResetting ? 'Resetting...' : 'Generate New Password'}
                        </Button>
                      </div>
                    </div>
                  </div>
                </TabsContent>

                {/* Student Progress Tab */}
                <TabsContent value="progress" className="mt-0">
                  <StudentProgressTab student={student} enrollments={enrollments} onUpdate={refreshData} />
                </TabsContent>

                <TabsContent value="communication" className="mt-0">
                  <StudentCommunicationTab studentId={student.id} />
                </TabsContent>

                <TabsContent value="remarks" className="mt-0">
                  <StudentRemarksTab studentId={student.id} />
                </TabsContent>

                {/* All Enrollments & Upgrades Tab */}
                <TabsContent value="enrollments" className="space-y-4 mt-0">
                  <div className="flex items-center justify-between pb-2 border-b">
                    <div>
                      <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">Student Program Enrollments</h3>
                      <p className="text-xs text-muted-foreground">All academic programs, completed courses, and upgrades linked to this student profile.</p>
                    </div>
                    {student.isPrevious && (
                      <Badge className="bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300 border-amber-300">
                        Alumni / Completed
                      </Badge>
                    )}
                  </div>

                  {loadingEnrollments ? (
                    <div className="py-12 flex flex-col items-center justify-center gap-2 text-muted-foreground">
                      <RefreshCw className="w-6 h-6 animate-spin text-primary" />
                      <p className="text-xs">Loading student enrollments...</p>
                    </div>
                  ) : enrollments.length === 0 ? (
                    <div className="py-8 text-center text-muted-foreground text-sm border rounded-xl border-dashed">
                      No enrollment history records found.
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {enrollments.map((enr: any, idx: number) => {
                        const isUpgrade = enr.isUpgrade || enr.status === 'ops_upgrade_verification';
                        const isCompletedProgram = enr.status === 'completed' || (enrollments.length === 1 && (student.status === 'completed' || student.isPrevious));
                        
                        // Resolve academic semester progress
                        const acTerms = Array.isArray(enr.academicProgress) && enr.academicProgress.length > 0
                          ? enr.academicProgress
                          : (enrollments.length === 1 && Array.isArray(student.academicProgress) && student.academicProgress.length > 0 ? student.academicProgress : []);
                        const passedTerms = acTerms.filter((t: any) => t.isSaved && (t.resultStatus === 'Passed' || t.resultStatus === 'Pass'));

                        return (
                          <div key={enr.id} className="p-4 rounded-2xl border bg-card hover:border-primary/40 transition-all shadow-sm space-y-3">
                            <div className="flex items-start justify-between gap-3 flex-wrap">
                              <div>
                                <div className="flex items-center gap-2 flex-wrap mb-1">
                                  <h4 className="font-bold text-slate-900 dark:text-slate-100 text-base">
                                    {enr.program?.name || 'Program'}
                                  </h4>
                                  {idx === 0 && !isCompletedProgram && enr.status !== 'dropped' && (
                                    <Badge className="bg-emerald-600/10 text-emerald-700 dark:text-emerald-400 border border-emerald-300 dark:border-emerald-800 text-[10px] font-bold uppercase tracking-wider">
                                      Latest Enrollment
                                    </Badge>
                                  )}
                                  {isCompletedProgram ? (
                                    <Badge className="bg-emerald-600 text-white text-[10px] font-bold uppercase tracking-wider">
                                      🎓 Completed
                                    </Badge>
                                  ) : isUpgrade ? (
                                    <Badge className="bg-blue-600 text-white text-[10px] font-bold uppercase tracking-wider">
                                      🎓 Upgrade
                                    </Badge>
                                  ) : enr.status === 'dropped' ? (
                                    <Badge className="bg-rose-100 text-rose-700 dark:bg-rose-950/40 dark:text-rose-400 border border-rose-200 text-[10px] uppercase font-bold">
                                      ⚠️ Dropped
                                    </Badge>
                                  ) : (
                                    <Badge variant="outline" className="text-[10px] uppercase font-bold">
                                      {enr.status?.replace(/_/g, ' ')}
                                    </Badge>
                                  )}
                                </div>
                                <p className="text-xs text-muted-foreground">
                                  {enr.program?.university?.name || 'University Partner'} • Session: {enr.session?.name || 'Standard'} {enr.specialisation ? `• Spec: ${enr.specialisation}` : ''}
                                </p>
                              </div>
                              <div className="text-right text-xs text-muted-foreground flex flex-col items-end gap-1">
                                <span className="block font-mono font-medium">{enr.enrollmentNumber || 'No Enroll No'}</span>
                                <span>Applied: {enr.createdAt ? format(new Date(enr.createdAt), 'dd MMM yyyy') : 'N/A'}</span>
                                {isOrgAdmin && enr.status !== 'dropped' && enr.status !== 'completed' && (
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    className="h-6 text-[11px] border-rose-200 text-rose-600 hover:bg-rose-50 hover:text-rose-700 dark:border-rose-900/50 dark:text-rose-400 dark:hover:bg-rose-950/40 font-medium flex items-center gap-1 shadow-sm mt-0.5"
                                    onClick={() => handleOpenDropout(enr)}
                                  >
                                    <UserX className="w-3 h-3" />
                                    Mark Dropout
                                  </Button>
                                )}
                              </div>
                            </div>

                            {/* Dropped Alert Banner */}
                            {enr.status === 'dropped' && (
                              <div className="flex items-start gap-2.5 p-3 rounded-lg bg-rose-50/80 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900/50 text-xs text-rose-800 dark:text-rose-300">
                                <AlertTriangle className="w-4 h-4 shrink-0 text-rose-600 dark:text-rose-400 mt-0.5" />
                                <div className="flex-1 space-y-0.5">
                                  <p className="font-semibold text-rose-900 dark:text-rose-200">
                                    Student Marked as Dropped Out
                                  </p>
                                  {(() => {
                                    const rawH = enr.statusHistory;
                                    const histArr: any[] = Array.isArray(rawH) ? rawH : [];
                                    const dropEntry = histArr.find((h: any) => h.status === 'dropped');
                                    return (
                                      <p className="text-[11px] text-rose-700 dark:text-rose-300">
                                        {dropEntry?.reason ? <span className="font-medium">Reason: {dropEntry.reason}</span> : null}
                                        {dropEntry?.remarks && dropEntry?.remarks !== dropEntry?.reason ? <span> — {dropEntry.remarks}</span> : null}
                                        {dropEntry?.actorName ? <span> (by {dropEntry.actorName})</span> : null}
                                      </p>
                                    );
                                  })()}
                                </div>
                              </div>
                            )}

                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-3 bg-muted/30 rounded-xl text-xs">
                              <div>
                                <span className="text-muted-foreground uppercase text-[10px] font-semibold block">Center</span>
                                <span className="font-medium">{enr.studyCenter?.name || 'Main Branch'}</span>
                              </div>
                              <div>
                                <span className="text-muted-foreground uppercase text-[10px] font-semibold block">Payment Plan</span>
                                <span className="font-medium capitalize">{enr.paymentPlan || 'Standard'}</span>
                              </div>
                              <div>
                                <span className="text-muted-foreground uppercase text-[10px] font-semibold block">Initial Fee</span>
                                <span className="font-medium">{enr.initialPaymentAmount ? `₹${enr.initialPaymentAmount}` : 'N/A'}</span>
                              </div>
                              <div>
                                <span className="text-muted-foreground uppercase text-[10px] font-semibold block">Review Stage</span>
                                <span className="font-medium capitalize">{enr.status?.replace(/_/g, ' ')}</span>
                              </div>
                            </div>

                            {/* Academic Semester Progress Breakdown */}
                            {acTerms.length > 0 && (
                              <div className="mt-3 pt-3 border-t border-border/60 space-y-2.5">
                                <div className="flex items-center justify-between">
                                  <div className="flex items-center gap-2">
                                    <BookOpen className="w-4 h-4 text-primary" />
                                    <span className="text-xs font-bold text-foreground uppercase tracking-wide">
                                      Academic Progress ({acTerms.length} Terms)
                                    </span>
                                  </div>
                                  <Badge variant="outline" className="bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 border-emerald-200 text-[11px] font-semibold">
                                    {passedTerms.length} of {acTerms.length} Passed
                                  </Badge>
                                </div>

                                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
                                  {acTerms.map((term: any) => {
                                    const isPassed = term.resultStatus === 'Passed' || term.resultStatus === 'Pass';
                                    return (
                                      <div key={term.term} className="p-2.5 rounded-xl border bg-muted/20 text-xs space-y-1">
                                        <div className="flex items-center justify-between">
                                          <span className="font-bold text-foreground">Semester {term.term}</span>
                                          <Badge variant={isPassed ? 'default' : 'secondary'} className={isPassed ? 'bg-emerald-600 text-white text-[9px]' : 'text-[9px]'}>
                                            {term.resultStatus || 'Pending'}
                                          </Badge>
                                        </div>
                                        <div className="text-[11px] text-muted-foreground flex justify-between">
                                          <span>Re-Reg: <strong>{term.reRegistration || 'Pending'}</strong></span>
                                          <span>Exam: <strong>{term.examRegistration || 'Pending'}</strong></span>
                                        </div>
                                        {(term.resultStatusDoc || term.resultProof || term.reRegistrationDoc || term.examRegistrationDoc) && (
                                          <div className="flex items-center gap-2 pt-1 border-t border-border/30">
                                            {(term.resultStatusDoc || term.resultProof) && (
                                              <a href={api.getFileUrl(term.resultStatusDoc || term.resultProof)} target="_blank" rel="noreferrer" className="text-[10px] text-blue-600 hover:underline flex items-center gap-0.5">
                                                <Eye className="w-3 h-3" /> Marksheet
                                              </a>
                                            )}
                                            {(term.reRegistrationDoc || term.reRegistrationProof) && (
                                              <a href={api.getFileUrl(term.reRegistrationDoc || term.reRegistrationProof)} target="_blank" rel="noreferrer" className="text-[10px] text-blue-600 hover:underline flex items-center gap-0.5">
                                                <Eye className="w-3 h-3" /> Re-Reg
                                              </a>
                                            )}
                                            {(term.examRegistrationDoc || term.examRegistrationProof) && (
                                              <a href={api.getFileUrl(term.examRegistrationDoc || term.examRegistrationProof)} target="_blank" rel="noreferrer" className="text-[10px] text-blue-600 hover:underline flex items-center gap-0.5">
                                                <Eye className="w-3 h-3" /> Exam
                                              </a>
                                            )}
                                          </div>
                                        )}
                                      </div>
                                    );
                                  })}
                                </div>
                              </div>
                            )}

                            {enr.departmentRemarks && (
                              <div className="p-2.5 rounded-lg bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-800 text-xs text-red-700 dark:text-red-300">
                                <strong>Operations Remarks: </strong>{enr.departmentRemarks}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </TabsContent>

              </CardContent>
            </Tabs>
          </Card>
        </div>
      </div>

      {/* Enrollment Dropout Confirmation Dialog */}
      <Dialog open={dropoutDialogOpen} onOpenChange={setDropoutDialogOpen}>
        <DialogContent className="max-w-md w-full rounded-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-rose-600">
              <UserX className="w-5 h-5" />
              Mark Enrollment Dropout
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 text-xs space-y-1">
              <p className="font-semibold text-slate-800 dark:text-slate-200">
                Student: {student?.name}
              </p>
              <p className="text-muted-foreground">
                Program: <span className="font-medium text-foreground">{dropoutEnrollment?.program?.name || 'Selected Program'}</span>
              </p>
              {dropoutEnrollment?.enrollmentNumber && (
                <p className="text-muted-foreground font-mono">
                  Enrollment No: {dropoutEnrollment.enrollmentNumber}
                </p>
              )}
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Dropout Reason *</Label>
              <Select value={dropoutReason} onValueChange={setDropoutReason}>
                <SelectTrigger>
                  <SelectValue placeholder="Select reason..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Financial Constraints">Financial Constraints</SelectItem>
                  <SelectItem value="Personal / Family Reasons">Personal / Family Reasons</SelectItem>
                  <SelectItem value="Health / Medical Issues">Health / Medical Issues</SelectItem>
                  <SelectItem value="Relocation / Moved City">Relocation / Moved City</SelectItem>
                  <SelectItem value="Academic Difficulties">Academic Difficulties</SelectItem>
                  <SelectItem value="Joined Another University / Institute">Joined Another University / Institute</SelectItem>
                  <SelectItem value="Employment / Job Conflicts">Employment / Job Conflicts</SelectItem>
                  <SelectItem value="Discontinued Attendance">Discontinued Attendance</SelectItem>
                  <SelectItem value="Other">Other Reason (Specify)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {dropoutReason === 'Other' && (
              <div className="space-y-1.5 animate-in fade-in">
                <Label className="text-xs font-semibold">Specify Reason *</Label>
                <Input
                  placeholder="Enter specific dropout reason..."
                  value={dropoutCustomReason}
                  onChange={(e) => setDropoutCustomReason(e.target.value)}
                />
              </div>
            )}

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Effective Dropout Date</Label>
              <Input
                type="date"
                value={dropoutDate}
                onChange={(e) => setDropoutDate(e.target.value)}
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Remarks / Internal Notes</Label>
              <Textarea
                rows={2}
                placeholder="Optional notes or context regarding the dropout decision..."
                value={dropoutRemarks}
                onChange={(e) => setDropoutRemarks(e.target.value)}
              />
            </div>

            <div className="flex items-start gap-2.5 p-3 rounded-xl bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900/40">
              <Checkbox
                id="profileSyncStudentStatus"
                checked={dropoutSyncStudent}
                onCheckedChange={(checked) => setDropoutSyncStudent(Boolean(checked))}
                className="mt-0.5"
              />
              <div className="text-xs">
                <label htmlFor="profileSyncStudentStatus" className="font-semibold text-amber-900 dark:text-amber-300 cursor-pointer">
                  Also update student overall status to Dropped
                </label>
                <p className="text-[11px] text-amber-700 dark:text-amber-400 mt-0.5">
                  Reflects the student as dropped across the system.
                </p>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button
                variant="outline"
                onClick={() => setDropoutDialogOpen(false)}
                disabled={dropoutSubmitting}
              >
                Cancel
              </Button>
              <Button
                className="bg-rose-600 hover:bg-rose-700 text-white font-medium"
                onClick={handleConfirmDropout}
                disabled={dropoutSubmitting || (dropoutReason === 'Other' && !dropoutCustomReason.trim())}
              >
                {dropoutSubmitting ? (
                  <>
                    <RefreshCw className="w-4 h-4 mr-1.5 animate-spin" />
                    Updating...
                  </>
                ) : (
                  <>
                    <UserX className="w-4 h-4 mr-1.5" />
                    Confirm Dropout
                  </>
                )}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}


function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-3 flex items-center gap-2">
        {title}<span className="h-px flex-1 bg-border" />
      </h3>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">{children}</div>
    </div>
  );
}

function Field({ label, value, capitalize, wide }: { label: string; value?: string | null; capitalize?: boolean; wide?: boolean }) {
  const empty = !value || !String(value).trim() || value === 'N/A';
  return (
    <div className={`rounded-xl border bg-muted/20 px-3.5 py-3 ${wide ? 'sm:col-span-2' : ''}`}>
      <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">{label}</p>
      <p className={`mt-1 text-sm font-medium break-words ${capitalize ? 'capitalize' : ''} ${empty ? 'text-muted-foreground/60' : ''}`}>{empty ? 'Not provided' : value}</p>
    </div>
  );
}
