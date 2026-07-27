import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { RefreshCw, CheckCircle } from 'lucide-react';
import { toast } from 'sonner';
import api from '@/lib/api';

export function ReRegistrationPanel() {
  const [students, setStudents] = useState<any[]>([]);
  const [completedStudents, setCompletedStudents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedStudent, setSelectedStudent] = useState<any>(null);
  const [activeTab, setActiveTab] = useState('pending');

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
          <TabsList className="mb-4">
            <TabsTrigger value="pending">Pending ({students.length})</TabsTrigger>
            <TabsTrigger value="completed">Completed ({completedStudents.length})</TabsTrigger>
          </TabsList>

          <TabsContent value="pending" className="m-0">
            {loading ? (
              <div className="flex justify-center p-8"><RefreshCw className="w-6 h-6 animate-spin text-muted-foreground" /></div>
            ) : students.length === 0 ? (
              <div className="flex flex-col items-center justify-center p-8 text-center border rounded-lg border-dashed">
                <CheckCircle className="w-8 h-8 text-green-500 mb-2" />
                <p className="text-muted-foreground">No pending re-registrations!</p>
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
                    {students.map((student) => (
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
              </div>
            )}
          </TabsContent>

          <TabsContent value="completed" className="m-0">
            {loading ? (
              <div className="flex justify-center p-8"><RefreshCw className="w-6 h-6 animate-spin text-muted-foreground" /></div>
            ) : completedStudents.length === 0 ? (
              <div className="flex flex-col items-center justify-center p-8 text-center border rounded-lg border-dashed">
                <p className="text-muted-foreground">No completed re-registrations yet.</p>
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
                    {completedStudents.map((student) => (
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
              </div>
            )}
          </TabsContent>
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
