
import { 
  ArrowLeft,
  GraduationCap,
  MapPin,
  Phone,
  Mail,
  CreditCard,
  FileText
} from 'lucide-react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { format } from 'date-fns';
import api from '@/lib/api';

export function StudentProfilePanel({ student, onBack }: { student: any; onBack: () => void }) {
  if (!student) return null;

  const photoUrl = student.photo 
    ? (student.photo.startsWith('http') ? student.photo : `${api.getBaseUrl().replace('/api/v1', '')}${student.photo}`) 
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
                  <TabsTrigger 
                    value="personal" 
                    className="pb-3 rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none px-1"
                  >
                    Personal Details
                  </TabsTrigger>
                  <TabsTrigger 
                    value="academic" 
                    className="pb-3 rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none px-1"
                  >
                    Academic Info
                  </TabsTrigger>
                  <TabsTrigger 
                    value="fees" 
                    className="pb-3 rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none px-1"
                  >
                    Fee Details
                  </TabsTrigger>
                  <TabsTrigger 
                    value="documents" 
                    className="pb-3 rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none px-1"
                  >
                    Documents
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

                {/* Academic Info Tab */}
                <TabsContent value="academic" className="space-y-6 mt-0">
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
                  <div className="text-center py-10 space-y-3">
                    <CreditCard className="w-10 h-10 mx-auto text-muted-foreground opacity-50" />
                    <h4 className="text-base font-semibold">Fee records will appear here</h4>
                    <p className="text-sm text-muted-foreground">This section is currently under development or waiting for records.</p>
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
                            <Button variant="ghost" size="sm" className="ml-auto" onClick={() => window.open(doc.url.startsWith('http') ? doc.url : `${api.getBaseUrl().replace('/api/v1', '')}${doc.url}`, '_blank')}>
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

              </CardContent>
            </Tabs>
          </Card>
        </div>
      </div>
    </div>
  );
}
