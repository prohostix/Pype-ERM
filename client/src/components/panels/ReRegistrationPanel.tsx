import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { RefreshCw, CheckCircle, Search } from 'lucide-react';
import { toast } from 'sonner';
import api from '@/lib/api';

export function ReRegistrationPanel() {
  const [students, setStudents] = useState<any[]>([]);
  const [completedStudents, setCompletedStudents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedStudent, setSelectedStudent] = useState<any>(null);
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

  return (
    <Card className="border-none shadow-none">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Re-registration</CardTitle>
            <CardDescription>Manage upcoming semester re-registrations</CardDescription>
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
              <TabsTrigger value="pending">Pending ({students.length})</TabsTrigger>
              <TabsTrigger value="completed">Completed ({completedStudents.length})</TabsTrigger>
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
            const filteredPending = students.filter(s => {
              const q = searchQuery.toLowerCase();
              return s.name?.toLowerCase().includes(q) || 
                     s.email?.toLowerCase().includes(q) || 
                     s.enrollmentNo?.toLowerCase().includes(q) ||
                     s.program?.name?.toLowerCase().includes(q);
            });
            const filteredCompleted = completedStudents.filter(s => {
              const q = searchQuery.toLowerCase();
              return s.name?.toLowerCase().includes(q) || 
                     s.email?.toLowerCase().includes(q) || 
                     s.enrollmentNo?.toLowerCase().includes(q) ||
                     s.program?.name?.toLowerCase().includes(q);
            });

            const totalPendingPages = Math.max(1, Math.ceil(filteredPending.length / itemsPerPage));
            const paginatedPending = filteredPending.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);
            return (
          <TabsContent value="pending" className="m-0">
            {loading ? (
              <div className="flex justify-center p-8"><RefreshCw className="w-6 h-6 animate-spin text-muted-foreground" /></div>
            ) : filteredPending.length === 0 ? (
              <div className="flex flex-col items-center justify-center p-8 text-center border rounded-lg border-dashed">
                <CheckCircle className="w-8 h-8 text-green-500 mb-2" />
                <p className="text-muted-foreground">{searchQuery ? 'No pending re-registrations found matching your search.' : 'No pending re-registrations!'}</p>
              </div>
            ) : (
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Student</TableHead>
                      <TableHead>Program</TableHead>
                      <TableHead>Current Sem</TableHead>
                      <TableHead>Next Sem</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Action</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {paginatedPending.map((student) => (
                      <TableRow key={student.id}>
                        <TableCell>
                          <div className="font-medium">{student.name}</div>
                          <div className="text-xs text-muted-foreground">{student.enrollmentNo || 'N/A'}</div>
                        </TableCell>
                        <TableCell>
                          <div className="text-sm">{student.program?.name || 'N/A'}</div>
                        </TableCell>
                        <TableCell>Semester 1</TableCell>
                        <TableCell>Semester 2</TableCell>
                        <TableCell>
                          <Badge variant="outline" className="text-orange-500 bg-orange-50">Pending Fee</Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <Button size="sm" variant="outline" onClick={() => setSelectedStudent(student)}>View Details</Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
                
                {/* Pagination Controls */}
                {totalPendingPages > 1 && (
                  <div className="flex items-center justify-between p-4 border-t bg-slate-50 dark:bg-slate-900/20">
                    <div className="text-sm text-muted-foreground">
                      Showing {(currentPage - 1) * itemsPerPage + 1} to {Math.min(currentPage * itemsPerPage, filteredPending.length)} of {filteredPending.length} students
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
            const filteredPending = students.filter(s => {
              const q = searchQuery.toLowerCase();
              return s.name?.toLowerCase().includes(q) || 
                     s.email?.toLowerCase().includes(q) || 
                     s.enrollmentNo?.toLowerCase().includes(q) ||
                     s.program?.name?.toLowerCase().includes(q);
            });
            const filteredCompleted = completedStudents.filter(s => {
              const q = searchQuery.toLowerCase();
              return s.name?.toLowerCase().includes(q) || 
                     s.email?.toLowerCase().includes(q) || 
                     s.enrollmentNo?.toLowerCase().includes(q) ||
                     s.program?.name?.toLowerCase().includes(q);
            });
            const totalCompletedPages = Math.max(1, Math.ceil(filteredCompleted.length / itemsPerPage));
            const paginatedCompleted = filteredCompleted.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

            return (
          <TabsContent value="completed" className="m-0">
            {loading ? (
              <div className="flex justify-center p-8"><RefreshCw className="w-6 h-6 animate-spin text-muted-foreground" /></div>
            ) : filteredCompleted.length === 0 ? (
              <div className="flex flex-col items-center justify-center p-8 text-center border rounded-lg border-dashed">
                <CheckCircle className="w-8 h-8 text-green-500 mb-2" />
                <p className="text-muted-foreground">{searchQuery ? 'No completed re-registrations found matching your search.' : 'No completed re-registrations yet.'}</p>
              </div>
            ) : (
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Student</TableHead>
                      <TableHead>Program</TableHead>
                      <TableHead>Current Sem</TableHead>
                      <TableHead>Next Sem</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Action</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {paginatedCompleted.map((student) => (
                      <TableRow key={student.id}>
                        <TableCell>
                          <div className="font-medium">{student.name}</div>
                          <div className="text-xs text-muted-foreground">{student.enrollmentNo || 'N/A'}</div>
                        </TableCell>
                        <TableCell>
                          <div className="text-sm">{student.program?.name || 'N/A'}</div>
                        </TableCell>
                        <TableCell>Semester 1</TableCell>
                        <TableCell>Semester 2</TableCell>
                        <TableCell>
                          <Badge variant="outline" className="text-green-600 bg-green-50 border-green-200">Completed</Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <Button size="sm" variant="outline" onClick={() => setSelectedStudent(student)}>View Details</Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
                
                {/* Pagination Controls */}
                {totalCompletedPages > 1 && (
                  <div className="flex items-center justify-between p-4 border-t bg-slate-50 dark:bg-slate-900/20">
                    <div className="text-sm text-muted-foreground">
                      Showing {(currentPage - 1) * itemsPerPage + 1} to {Math.min(currentPage * itemsPerPage, filteredCompleted.length)} of {filteredCompleted.length} students
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
                        Page {currentPage} of {totalCompletedPages}
                      </div>
                      <Button 
                        variant="outline" 
                        size="sm" 
                        onClick={() => setCurrentPage(p => Math.min(totalCompletedPages, p + 1))}
                        disabled={currentPage === totalCompletedPages}
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

      {selectedStudent && (
        <Dialog open={!!selectedStudent} onOpenChange={(open) => !open && setSelectedStudent(null)}>
          <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
              <DialogTitle>Re-registration Details</DialogTitle>
              <DialogDescription>
                Review and process re-registration for {selectedStudent.name}
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-4 items-center gap-4">
                <span className="font-medium text-sm text-muted-foreground">Student Name</span>
                <span className="col-span-3 text-sm font-medium">{selectedStudent.name}</span>
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <span className="font-medium text-sm text-muted-foreground">Enrollment No</span>
                <span className="col-span-3 text-sm">{selectedStudent.enrollmentNo || 'N/A'}</span>
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <span className="font-medium text-sm text-muted-foreground">Program</span>
                <span className="col-span-3 text-sm">{selectedStudent.program?.name || 'N/A'}</span>
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <span className="font-medium text-sm text-muted-foreground">Current Sem</span>
                <span className="col-span-3 text-sm">Semester 1</span>
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <span className="font-medium text-sm text-muted-foreground">Next Sem</span>
                <span className="col-span-3 text-sm">Semester 2</span>
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <span className="font-medium text-sm text-muted-foreground">Status</span>
                <span className="col-span-3">
                  <Badge variant="outline" className="text-orange-500 bg-orange-50">Pending Fee</Badge>
                </span>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setSelectedStudent(null)}>Cancel</Button>
              {activeTab === 'pending' && (
                <Button onClick={async () => {
                  try {
                    await api.patch(`/students/${selectedStudent.id}`, { reregStatus: { completed: true } });
                    toast.success('Re-registration marked as completed!');
                    setSelectedStudent(null);
                    fetchStudents();
                  } catch (e) {
                    toast.error('Failed to update student');
                  }
                }}>Mark Completed</Button>
              )}
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </Card>
  );
}
