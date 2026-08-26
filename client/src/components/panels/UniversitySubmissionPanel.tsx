import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { RefreshCw, CheckCircle, Send, Building2, Search } from 'lucide-react';
import { toast } from 'sonner';
import api from '@/lib/api';

export function UniversitySubmissionPanel() {
  const [students, setStudents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('pending');
  const [searchQuery, setSearchQuery] = useState('');

  // Pagination State
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 50;

  useEffect(() => {
    setCurrentPage(1);
  }, [activeTab, searchQuery]);

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

  const pendingStudents = students.filter(s => {
    const isPending = !s.admissionProgress?.universitySubmitted;
    if (!isPending) return false;
    const q = searchQuery.toLowerCase();
    return s.name?.toLowerCase().includes(q) || 
           s.email?.toLowerCase().includes(q) || 
           s.university?.name?.toLowerCase().includes(q) ||
           s.program?.name?.toLowerCase().includes(q);
  });
  
  const submittedStudents = students.filter(s => {
    const isSubmitted = s.admissionProgress?.universitySubmitted;
    if (!isSubmitted) return false;
    const q = searchQuery.toLowerCase();
    return s.name?.toLowerCase().includes(q) || 
           s.email?.toLowerCase().includes(q) || 
           s.university?.name?.toLowerCase().includes(q) ||
           s.program?.name?.toLowerCase().includes(q);
  });

  return (
    <Card className="border-none shadow-none">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>University Submission</CardTitle>
            <CardDescription>Track and manage student applications pending university submission</CardDescription>
          </div>
          <Button variant="outline" size="sm" onClick={fetchStudents} disabled={loading}>
            <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-4 gap-4">
            <TabsList>
              <TabsTrigger value="pending">Pending Submission ({pendingStudents.length})</TabsTrigger>
              <TabsTrigger value="submitted">Submitted ({submittedStudents.length})</TabsTrigger>
            </TabsList>
            <div className="relative w-full sm:w-64">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                type="search"
                placeholder="Search students..."
                className="pl-8"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
          </div>
          
          {(() => {
            const totalPendingPages = Math.max(1, Math.ceil(pendingStudents.length / itemsPerPage));
            const paginatedPending = pendingStudents.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);
            return (
          <TabsContent value="pending" className="m-0">
            {loading ? (
              <div className="flex justify-center p-8"><RefreshCw className="w-6 h-6 animate-spin text-muted-foreground" /></div>
            ) : pendingStudents.length === 0 ? (
              <div className="flex flex-col items-center justify-center p-8 text-center border rounded-lg border-dashed">
                <CheckCircle className="w-8 h-8 text-green-500 mb-2" />
                <p className="text-muted-foreground">{searchQuery ? 'No students found matching your search.' : 'All files are submitted to universities!'}</p>
              </div>
            ) : (
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Student</TableHead>
                      <TableHead>Program</TableHead>
                      <TableHead>University</TableHead>
                      <TableHead>Documents</TableHead>
                      <TableHead className="text-right">Action</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {paginatedPending.map((student) => (
                      <TableRow key={student.id}>
                        <TableCell>
                          <div className="font-medium">{student.name}</div>
                          <div className="text-xs text-muted-foreground">{student.admissionNo || 'N/A'}</div>
                        </TableCell>
                        <TableCell>
                          <div className="text-sm">{student.program?.name || 'N/A'}</div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className="flex w-fit items-center gap-1">
                            <Building2 className="w-3 h-3" />
                            {student.university?.name || 'Assigned'}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge variant="secondary" className="bg-green-100 text-green-700">Verified</Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button size="sm">
                                <Send className="w-4 h-4 mr-2" />
                                Mark Submitted
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Confirm Submission</AlertDialogTitle>
                                <AlertDialogDescription>
                                  Are you sure you want to mark {student.name}'s application as submitted to the university?
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                <AlertDialogAction onClick={() => markSubmitted(student.id)}>
                                  Confirm
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
                
                {/* Pagination Controls */}
                {totalPendingPages > 1 && (
                  <div className="flex items-center justify-between p-4 border-t bg-slate-50 dark:bg-slate-900/20">
                    <div className="text-sm text-muted-foreground">
                      Showing {(currentPage - 1) * itemsPerPage + 1} to {Math.min(currentPage * itemsPerPage, pendingStudents.length)} of {pendingStudents.length} students
                    </div>
                    <div className="flex items-center gap-2">
                      <Button 
                        variant="outline" 
                        size="sm" 
                        onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                        disabled={currentPage === 1}
                      >
                        Previous
                      </Button>
                      <div className="text-sm font-medium px-2">
                        Page {currentPage} of {totalPendingPages}
                      </div>
                      <Button 
                        variant="outline" 
                        size="sm" 
                        onClick={() => setCurrentPage(p => Math.min(totalPendingPages, p + 1))}
                        disabled={currentPage === totalPendingPages}
                      >
                        Next
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </TabsContent>
          );
          })()}
          
          {(() => {
            const totalSubmittedPages = Math.max(1, Math.ceil(submittedStudents.length / itemsPerPage));
            const paginatedSubmitted = submittedStudents.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);
            return (
          <TabsContent value="submitted" className="m-0">
            {loading ? (
              <div className="flex justify-center p-8"><RefreshCw className="w-6 h-6 animate-spin text-muted-foreground" /></div>
            ) : submittedStudents.length === 0 ? (
              <div className="flex flex-col items-center justify-center p-8 text-center border rounded-lg border-dashed">
                <p className="text-muted-foreground">No students have been submitted yet.</p>
              </div>
            ) : (
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Student</TableHead>
                      <TableHead>Program</TableHead>
                      <TableHead>University</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {paginatedSubmitted.map((student) => (
                      <TableRow key={student.id}>
                        <TableCell>
                          <div className="font-medium">{student.name}</div>
                          <div className="text-xs text-muted-foreground">{student.admissionNo || 'N/A'}</div>
                        </TableCell>
                        <TableCell>
                          <div className="text-sm">{student.program?.name || 'N/A'}</div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className="flex w-fit items-center gap-1">
                            <Building2 className="w-3 h-3" />
                            {student.university?.name || 'Assigned'}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge variant="secondary" className="bg-green-100 text-green-700">
                            <CheckCircle className="w-3 h-3 mr-1 inline-block" />
                            Submitted
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
                
                {/* Pagination Controls */}
                {totalSubmittedPages > 1 && (
                  <div className="flex items-center justify-between p-4 border-t bg-slate-50 dark:bg-slate-900/20">
                    <div className="text-sm text-muted-foreground">
                      Showing {(currentPage - 1) * itemsPerPage + 1} to {Math.min(currentPage * itemsPerPage, submittedStudents.length)} of {submittedStudents.length} students
                    </div>
                    <div className="flex items-center gap-2">
                      <Button 
                        variant="outline" 
                        size="sm" 
                        onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                        disabled={currentPage === 1}
                      >
                        Previous
                      </Button>
                      <div className="text-sm font-medium px-2">
                        Page {currentPage} of {totalSubmittedPages}
                      </div>
                      <Button 
                        variant="outline" 
                        size="sm" 
                        onClick={() => setCurrentPage(p => Math.min(totalSubmittedPages, p + 1))}
                        disabled={currentPage === totalSubmittedPages}
                      >
                        Next
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </TabsContent>
          );
          })()}
        </Tabs>
      </CardContent>
    </Card>
  );
}
