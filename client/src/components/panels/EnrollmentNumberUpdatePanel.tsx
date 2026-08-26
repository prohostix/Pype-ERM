import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Save, RefreshCw, CheckCircle, Search } from 'lucide-react';
import { toast } from 'sonner';
import api from '@/lib/api';

export function EnrollmentNumberUpdatePanel() {
  const [students, setStudents] = useState<any[]>([]);
  const [updatedStudents, setUpdatedStudents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [updates, setUpdates] = useState<Record<string, string>>({});
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

  const filteredPending = students.filter(s => 
    s.name?.toLowerCase().includes(searchQuery.toLowerCase()) || 
    s.email?.toLowerCase().includes(searchQuery.toLowerCase()) || 
    s.center?.name?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredUpdated = updatedStudents.filter(s => 
    s.name?.toLowerCase().includes(searchQuery.toLowerCase()) || 
    s.email?.toLowerCase().includes(searchQuery.toLowerCase()) || 
    s.center?.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    s.enrollmentNo?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <Card className="border-none shadow-none">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Enrollment Number Update</CardTitle>
            <CardDescription>Assign official university enrollment numbers to admitted students</CardDescription>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={fetchStudents} disabled={loading}>
              <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
            {activeTab === 'pending' && (
              <Button size="sm" onClick={saveUpdates} disabled={saving || Object.keys(updates).length === 0}>
                <Save className="w-4 h-4 mr-2" />
                Save Changes
              </Button>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-4 gap-4">
            <TabsList>
              <TabsTrigger value="pending">Pending Update ({filteredPending.length})</TabsTrigger>
              <TabsTrigger value="updated">Updated ({filteredUpdated.length})</TabsTrigger>
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
            const totalPendingPages = Math.max(1, Math.ceil(filteredPending.length / itemsPerPage));
            const paginatedPending = filteredPending.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);
            return (
          <TabsContent value="pending" className="m-0">
            {loading ? (
              <div className="flex justify-center p-8"><RefreshCw className="w-6 h-6 animate-spin text-muted-foreground" /></div>
            ) : filteredPending.length === 0 ? (
              <div className="flex flex-col items-center justify-center p-8 text-center border rounded-lg border-dashed">
                <CheckCircle className="w-8 h-8 text-green-500 mb-2" />
                <p className="text-muted-foreground">{students.length === 0 ? 'All admitted students have enrollment numbers!' : 'No students found matching your search.'}</p>
              </div>
            ) : (
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Student</TableHead>
                      <TableHead>Program / Batch</TableHead>
                      <TableHead>Center</TableHead>
                      <TableHead className="w-[300px]">Enrollment Number</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {paginatedPending.map((student) => (
                      <TableRow key={student.id}>
                        <TableCell>
                          <div className="font-medium">{student.name}</div>
                          <div className="text-xs text-muted-foreground">{student.email}</div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className="mb-1">{student.program?.name || 'N/A'}</Badge>
                          <div className="text-xs text-muted-foreground">{student.session?.name}</div>
                        </TableCell>
                        <TableCell>
                          <div className="text-sm">{student.center?.name || 'Direct'}</div>
                        </TableCell>
                        <TableCell>
                          <Input
                            placeholder="Enter Enrollment No."
                            value={updates[student.id] !== undefined ? updates[student.id] : (student.enrollmentNo || '')}
                            onChange={(e) => handleUpdateChange(student.id, e.target.value)}
                            className="h-8 max-w-[250px]"
                          />
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
            const totalUpdatedPages = Math.max(1, Math.ceil(filteredUpdated.length / itemsPerPage));
            const paginatedUpdated = filteredUpdated.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);
            return (
          <TabsContent value="updated" className="m-0">
            {loading ? (
              <div className="flex justify-center p-8"><RefreshCw className="w-6 h-6 animate-spin text-muted-foreground" /></div>
            ) : filteredUpdated.length === 0 ? (
              <div className="flex flex-col items-center justify-center p-8 text-center border rounded-lg border-dashed">
                <p className="text-muted-foreground">{updatedStudents.length === 0 ? 'No students have been updated yet.' : 'No students found matching your search.'}</p>
              </div>
            ) : (
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Student</TableHead>
                      <TableHead>Program / Batch</TableHead>
                      <TableHead>Center</TableHead>
                      <TableHead>Enrollment Number</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {paginatedUpdated.map((student) => (
                      <TableRow key={student.id}>
                        <TableCell>
                          <div className="font-medium">{student.name}</div>
                          <div className="text-xs text-muted-foreground">{student.email}</div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className="mb-1">{student.program?.name || 'N/A'}</Badge>
                          <div className="text-xs text-muted-foreground">{student.session?.name}</div>
                        </TableCell>
                        <TableCell>
                          <div className="text-sm">{student.center?.name || 'Direct'}</div>
                        </TableCell>
                        <TableCell>
                          <div className="font-semibold text-primary">{student.enrollmentNo}</div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
                {/* Pagination Controls */}
                {totalUpdatedPages > 1 && (
                  <div className="flex items-center justify-between p-4 border-t bg-slate-50 dark:bg-slate-900/20">
                    <div className="text-sm text-muted-foreground">
                      Showing {(currentPage - 1) * itemsPerPage + 1} to {Math.min(currentPage * itemsPerPage, filteredUpdated.length)} of {filteredUpdated.length} students
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
                        Page {currentPage} of {totalUpdatedPages}
                      </div>
                      <Button 
                        variant="outline" 
                        size="sm" 
                        onClick={() => setCurrentPage(p => Math.min(totalUpdatedPages, p + 1))}
                        disabled={currentPage === totalUpdatedPages}
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
