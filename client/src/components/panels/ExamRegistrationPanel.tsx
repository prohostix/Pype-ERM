import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { RefreshCw, CheckCircle } from 'lucide-react';
import { toast } from 'sonner';
import api from '@/lib/api';

export function ExamRegistrationPanel() {
  const [registrations, setRegistrations] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Pagination State
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 50;

  useEffect(() => {
    fetchRegistrations();
  }, []);

  const fetchRegistrations = async () => {
    setLoading(true);
    try {
      const res = await api.get('/exams');
      setRegistrations(res.data.data || []);
    } catch (e) {
      console.error(e);
      toast.error('Failed to fetch exam registrations');
    } finally {
      setLoading(false);
    }
  };

  const updateStatus = async (id: string, status: string) => {
    try {
      await api.put(`/exams/${id}`, { status });
      toast.success(`Registration ${status}`);
      fetchRegistrations();
    } catch (e) {
      toast.error('Failed to update status');
    }
  };

  return (
    <Card className="border-none shadow-none">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Exam Registration</CardTitle>
            <CardDescription>Manage student exam applications and approvals</CardDescription>
          </div>
          <Button variant="outline" size="sm" onClick={fetchRegistrations} disabled={loading}>
            <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="flex justify-center p-8"><RefreshCw className="w-6 h-6 animate-spin text-muted-foreground" /></div>
        ) : registrations.length === 0 ? (
          <div className="flex flex-col items-center justify-center p-8 text-center border rounded-lg border-dashed">
            <CheckCircle className="w-8 h-8 text-green-500 mb-2" />
            <p className="text-muted-foreground">No pending exam registrations!</p>
          </div>
        ) : (
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Student</TableHead>
                  <TableHead>Semester / Year</TableHead>
                  <TableHead>Subject Codes</TableHead>
                  <TableHead>Exam Center</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(() => {

                  const paginatedRegistrations = registrations.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);
                  return (
                    <>
                {paginatedRegistrations.map((reg) => (
                  <TableRow key={reg.id}>
                    <TableCell>
                      <div className="font-medium">{reg.student?.name}</div>
                      <div className="text-xs text-muted-foreground">{reg.student?.enrollmentNo || 'N/A'}</div>
                    </TableCell>
                    <TableCell>{reg.semester}</TableCell>
                    <TableCell>{reg.subjectCodes}</TableCell>
                    <TableCell>{reg.examCenter || 'N/A'}</TableCell>
                    <TableCell>
                      <Badge variant={reg.status === 'approved' ? 'default' : reg.status === 'rejected' ? 'destructive' : 'secondary'} className={reg.status === 'pending' ? "bg-blue-100 text-blue-700" : ""}>
                        {reg.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right flex justify-end gap-2">
                      {reg.status === 'pending' && (
                        <>
                          <Button size="sm" variant="outline" onClick={() => updateStatus(reg.id, 'approved')}>Approve</Button>
                          <Button size="sm" variant="destructive" onClick={() => updateStatus(reg.id, 'rejected')}>Reject</Button>
                        </>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
                    </>
                  );
                })()}
              </TableBody>
            </Table>
            
            {/* Pagination Controls */}
            {(() => {
              const totalPages = Math.max(1, Math.ceil(registrations.length / itemsPerPage));
              if (totalPages <= 1) return null;
              return (
                <div className="flex items-center justify-between p-4 border-t bg-slate-50 dark:bg-slate-900/20">
                  <div className="text-sm text-muted-foreground">
                    Showing {(currentPage - 1) * itemsPerPage + 1} to {Math.min(currentPage * itemsPerPage, registrations.length)} of {registrations.length} registrations
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
                      Page {currentPage} of {totalPages}
                    </div>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                      disabled={currentPage === totalPages}
                    >
                      Next
                    </Button>
                  </div>
                </div>
              );
            })()}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
