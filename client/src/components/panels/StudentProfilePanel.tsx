
import { useState } from 'react';
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
  RefreshCw
} from 'lucide-react';
import { toast } from 'sonner';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { StudentProgressTab } from '@/components/panels/StudentProgressTab';
import { PlaceholderPanel } from '@/components/panels/PlaceholderPanel';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { format } from 'date-fns';
import api from '@/lib/api';

export function StudentProfilePanel({ student: initialStudent, onBack }: { student: any; onBack: () => void }) {
  const [student, setStudent] = useState<any>(initialStudent);
  const [isResetting, setIsResetting] = useState(false);
  
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

  const universityName = student.university?.name || student.universityId?.name || 'Not Assigned';
  const programName = student.program?.name || student.programId?.name || 'Not Assigned';
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
        <Badge variant="secondary" className="px-3 py-1 uppercase">{student.status}</Badge>
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
                      <p className="font-medium mt-1">{programName}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground uppercase font-semibold tracking-wider">Branch</p>
                      <p className="font-medium mt-1">{branchName}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground uppercase font-semibold tracking-wider">Admission Date</p>
                      <p className="font-medium mt-1">
                        {student.admissionDate ? format(new Date(student.admissionDate), 'dd MMM yyyy') : 'N/A'}
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
                  <StudentProgressTab student={student} />
                </TabsContent>

              </CardContent>
            </Tabs>
          </Card>
        </div>
      </div>
    </div>
  );
}
