
import { useState, useEffect } from 'react';
import { 
  ArrowLeft,
  GraduationCap,
  MapPin,
  Phone,
  Mail,
  CreditCard,
  FileText,
  Key,
  Copy,
  RefreshCw,
  BookOpen,
  Eye,
  UserX,
  AlertTriangle
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
import { PlaceholderPanel } from '@/components/panels/PlaceholderPanel';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
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
  const branchName = student.branch?.name || student.branchId?.name || 'Main Campus';

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button variant="outline" size="icon" onClick={onBack} className="h-8 w-8">
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <h2 className="text-xl font-bold">Student Profile</h2>
        </div>
        {student.status === 'completed' || student.isPrevious ? (
          <Badge className="bg-emerald-600 text-white px-3 py-1 uppercase font-bold tracking-wider">
            🎓 Completed
          </Badge>
        ) : (
          <Badge variant="secondary" className="px-3 py-1 uppercase">{student.status}</Badge>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Left Column: Summary Card */}
        <Card className="md:col-span-1 shadow-sm border-border bg-card">
          <CardContent className="pt-6">
            <div className="flex flex-col items-center text-center space-y-4">
              <Avatar className="w-24 h-24 border-4 border-background shadow-lg">
                <AvatarImage src={photoUrl} />
                <AvatarFallback className="bg-primary/10 text-primary text-2xl font-bold">
                  {student.name.substring(0, 2).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              
              <div>
                <h3 className="text-xl font-bold">{student.name}</h3>
                <p className="text-sm font-medium text-muted-foreground mt-1">
                  {student.enrollmentNo || 'Pending Enrollment No'}
                </p>
                <div className="flex items-center justify-center gap-2 mt-3 text-sm text-slate-600 dark:text-slate-400">
                  <GraduationCap className="w-4 h-4" />
                  <span>{programName}</span>
                </div>
              </div>
            </div>

            <div className="mt-8 space-y-4">
              <div className="flex items-center gap-3 text-sm">
                <div className="p-2 bg-muted rounded-md"><Mail className="w-4 h-4 text-muted-foreground" /></div>
                <div className="truncate font-medium">{student.email}</div>
              </div>
              <div className="flex items-center gap-3 text-sm">
                <div className="p-2 bg-muted rounded-md"><Phone className="w-4 h-4 text-muted-foreground" /></div>
                <div className="font-medium">{student.phone}</div>
              </div>
              <div className="flex items-center gap-3 text-sm">
                <div className="p-2 bg-muted rounded-md"><MapPin className="w-4 h-4 text-muted-foreground" /></div>
                <div className="font-medium truncate">{student.address || 'Address not provided'}</div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Right Column: Tabs */}
        <div className="md:col-span-2">
          <Card className="shadow-sm border-border bg-card h-full">
            <Tabs defaultValue="personal" className="w-full">
              <CardHeader className="border-b pb-0">
                <TabsList className="w-full justify-start h-auto bg-transparent p-0 gap-6 overflow-x-auto rounded-none border-b border-transparent">
                  <TabsTrigger value="personal" className="pb-3 rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none px-1 whitespace-nowrap">
                    Personal Details
                  </TabsTrigger>
                  <TabsTrigger value="enrollments" className="pb-3 rounded-none border-b-2 border-transparent data-[state=active]:border-emerald-600 data-[state=active]:bg-transparent data-[state=active]:shadow-none px-1 whitespace-nowrap flex items-center gap-1.5 font-bold text-emerald-700 dark:text-emerald-400">
                    <GraduationCap className="w-4 h-4" /> Enrollments &amp; Upgrades ({enrollments.length})
                  </TabsTrigger>
                  <TabsTrigger value="documents" className="pb-3 rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none px-1 whitespace-nowrap">
                    Documents
                  </TabsTrigger>
                  <TabsTrigger value="fees" className="pb-3 rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none px-1 whitespace-nowrap">
                    Fee Details
                  </TabsTrigger>
                  <TabsTrigger value="university" className="pb-3 rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none px-1 whitespace-nowrap">
                    University Details
                  </TabsTrigger>
                  <TabsTrigger value="portal" className="pb-3 rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none px-1 whitespace-nowrap">
                    Student Portal
                  </TabsTrigger>
                  <TabsTrigger value="progress" className="pb-3 rounded-none border-b-2 border-transparent data-[state=active]:border-amber-500 data-[state=active]:bg-transparent data-[state=active]:shadow-none px-1 whitespace-nowrap flex items-center gap-1.5 font-bold">
                    <span className="text-amber-500">⭐</span> Student Progress
                  </TabsTrigger>
                  <TabsTrigger value="communication" className="pb-3 rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none px-1 whitespace-nowrap">
                    Communication History
                  </TabsTrigger>
                  <TabsTrigger value="remarks" className="pb-3 rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none px-1 whitespace-nowrap">
                    Remarks
                  </TabsTrigger>
                </TabsList>
              </CardHeader>
              <CardContent className="p-6">
                
                {/* Personal Details Tab */}
                <TabsContent value="personal" className="space-y-6 mt-0">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-y-6 gap-x-8">
                    <div>
                      <p className="text-xs text-muted-foreground uppercase font-semibold tracking-wider">Date of Birth</p>
                      <p className="font-medium mt-1">
                        {student.dob ? format(new Date(student.dob), 'dd MMM yyyy') : 'N/A'}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground uppercase font-semibold tracking-wider">Alternate Phone</p>
                      <p className="font-medium mt-1">{student.altPhone || 'N/A'}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground uppercase font-semibold tracking-wider">Father's Name</p>
                      <p className="font-medium mt-1">{student.fatherName || 'N/A'}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground uppercase font-semibold tracking-wider">Mother's Name</p>
                      <p className="font-medium mt-1">{student.motherName || 'N/A'}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground uppercase font-semibold tracking-wider">Religion / Caste</p>
                      <p className="font-medium mt-1">{student.religion || 'N/A'} {student.caste ? `/ ${student.caste}` : ''}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground uppercase font-semibold tracking-wider">Pin Code</p>
                      <p className="font-medium mt-1">{student.pinCode || 'N/A'}</p>
                    </div>
                  </div>
                </TabsContent>

                {/* University Details Tab (Replaced Academic Info) */}
                <TabsContent value="university" className="space-y-6 mt-0">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-y-6 gap-x-8">
                    <div>
                      <p className="text-xs text-muted-foreground uppercase font-semibold tracking-wider">University</p>
                      <p className="font-medium mt-1">{universityName}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground uppercase font-semibold tracking-wider">Program</p>
                      <p className="font-medium mt-1">{programName} {student.specialisation ? `- ${student.specialisation}` : ''}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground uppercase font-semibold tracking-wider">Branch</p>
                      <p className="font-medium mt-1">{branchName}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground uppercase font-semibold tracking-wider">Admission Date</p>
                      <p className="font-medium mt-1">
                        {student.admissionDate 
                          ? format(new Date(student.admissionDate), 'dd MMM yyyy') 
                          : (student.enrollments?.[0]?.createdAt 
                              ? format(new Date(student.enrollments[0].createdAt), 'dd MMM yyyy') 
                              : (student.createdAt ? format(new Date(student.createdAt), 'dd MMM yyyy') : 'N/A'))}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground uppercase font-semibold tracking-wider">Session</p>
                      <p className="font-medium mt-1">{student.session?.name || student.sessionId || 'N/A'}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground uppercase font-semibold tracking-wider">Enrolled At</p>
                      <p className="font-medium mt-1">
                        {student.enrolledAt ? format(new Date(student.enrolledAt), 'dd MMM yyyy, hh:mm a') : 'N/A'}
                      </p>
                    </div>
                  </div>
                </TabsContent>

                {/* Fees Tab */}
                <TabsContent value="fees" className="mt-0">
                  <div className="space-y-4">
                    {(() => {
                      const allFees = [
                        ...(student.paymentSchedules || []),
                        ...(student.enrollments?.flatMap((e: any) => e.payment ? [e.payment] : []).map((ep: any) => ({
                          id: ep.id,
                          title: 'Initial Admission Fee',
                          amount: ep.amount,
                          dueDate: ep.createdAt,
                          status: 'paid',
                          paidAt: ep.debitedAt || ep.createdAt,
                          isEnrollmentPayment: true
                        })) || [])
                      ];
                      
                      allFees.sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime());

                      if (allFees.length === 0) {
                        return (
                          <div className="text-center py-10 space-y-3">
                            <CreditCard className="w-10 h-10 mx-auto text-muted-foreground opacity-50" />
                            <h4 className="text-base font-semibold">No Fee Records Found</h4>
                            <p className="text-sm text-muted-foreground">This student does not have any fee records yet.</p>
                          </div>
                        );
                      }

                      return (
                        <div className="border rounded-md">
                          <Table>
                            <TableHeader>
                              <TableRow>
                                <TableHead>Title</TableHead>
                                <TableHead>Due Date</TableHead>
                                <TableHead>Amount</TableHead>
                                <TableHead>Status</TableHead>
                                <TableHead>Paid At</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {allFees.map((schedule: any) => (
                                <TableRow key={schedule.id}>
                                  <TableCell className="font-medium">
                                    {schedule.title}
                                    {schedule.isOldFee && <Badge variant="outline" className="ml-2 text-[10px]">OLD FEE</Badge>}
                                    {schedule.isEnrollmentPayment && <Badge variant="secondary" className="ml-2 text-[10px] bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300">ADMISSION</Badge>}
                                  </TableCell>
                                  <TableCell>
                                    {schedule.dueDate ? format(new Date(schedule.dueDate), 'dd MMM yyyy') : 'N/A'}
                                  </TableCell>
                                  <TableCell>
                                    {new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(schedule.amount)}
                                  </TableCell>
                                  <TableCell>
                                    <Badge 
                                      variant={schedule.status === 'paid' ? 'default' : schedule.status === 'overdue' ? 'destructive' : 'secondary'}
                                      className={schedule.status === 'paid' ? "bg-green-500 hover:bg-green-600 uppercase" : "uppercase"}
                                    >
                                      {schedule.status}
                                    </Badge>
                                  </TableCell>
                                  <TableCell>
                                    {schedule.paidAt ? format(new Date(schedule.paidAt), 'dd MMM yyyy') : '-'}
                                  </TableCell>
                                </TableRow>
                              ))}
                            </TableBody>
                          </Table>
                        </div>
                      );
                    })()}
                  </div>
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
