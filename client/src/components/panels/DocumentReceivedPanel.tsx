import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { RefreshCw, FileBox, Plus } from 'lucide-react';
import { toast } from 'sonner';
import api from '@/lib/api';

export function DocumentReceivedPanel() {
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Pagination State
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 50;
  const [showReceivedModal, setShowReceivedModal] = useState(false);
  const [students, setStudents] = useState<any[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    studentId: '',
    documentName: '',
    documentType: 'mark_sheet',
    status: 'received',
    notes: ''
  });

  useEffect(() => {
    fetchLogs();
    api.get('/students').then(r => setStudents(r.data.data || [])).catch(() => {});
  }, []);

  const fetchLogs = async () => {
    setLoading(true);
    try {
      const res = await api.get('/documents?type=received');
      setLogs(res.data.data || []);
    } catch (e) {
      console.error(e);
      toast.error('Failed to fetch received documents');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="border-none shadow-none">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Documents Received</CardTitle>
            <CardDescription>Log and track inbound physical documents</CardDescription>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={fetchLogs} disabled={loading}>
              <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
            <Button size="sm" onClick={() => setShowReceivedModal(true)}>
              <Plus className="w-4 h-4 mr-2" />
              Log Received
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="flex justify-center p-8"><RefreshCw className="w-6 h-6 animate-spin text-muted-foreground" /></div>
        ) : logs.length === 0 ? (
          <div className="flex flex-col items-center justify-center p-8 text-center border rounded-lg border-dashed">
            <FileBox className="w-8 h-8 text-muted-foreground mb-2" />
            <p className="text-muted-foreground">No documents received yet</p>
          </div>
        ) : (
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Student</TableHead>
                  <TableHead>Document Type</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(() => {

                  const paginatedLogs = logs.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);
                  return (
                    <>
                      {paginatedLogs.map((log) => (
                        <TableRow key={log.id}>
                    <TableCell>
                      <div className="font-medium">{log.student?.name || 'N/A'}</div>
                      <div className="text-xs text-muted-foreground">{log.student?.enrollmentNo || 'N/A'}</div>
                    </TableCell>
                    <TableCell className="capitalize">{log.documentType.replace('_', ' ')}</TableCell>
                    <TableCell>{log.documentName}</TableCell>
                    <TableCell>
                      <Badge variant="secondary">{log.status}</Badge>
                    </TableCell>
                    <TableCell className="text-right">
                        <Button size="sm" variant="outline">View</Button>
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
              const totalPages = Math.max(1, Math.ceil(logs.length / itemsPerPage));
              if (totalPages <= 1) return null;
              return (
                <div className="flex items-center justify-between p-4 border-t bg-slate-50 dark:bg-slate-900/20">
                  <div className="text-sm text-muted-foreground">
                    Showing {(currentPage - 1) * itemsPerPage + 1} to {Math.min(currentPage * itemsPerPage, logs.length)} of {logs.length} logs
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

      <Dialog open={showReceivedModal} onOpenChange={setShowReceivedModal}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Log Received Document</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Student</Label>
              <Select value={formData.studentId} onValueChange={(val) => setFormData({ ...formData, studentId: val })}>
                <SelectTrigger><SelectValue placeholder="Select Student" /></SelectTrigger>
                <SelectContent>
                  {students.map(s => <SelectItem key={s.id} value={s.id}>{s.name} ({s.enrollmentNo || 'N/A'})</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-2">
              <Label>Document Type</Label>
              <Select value={formData.documentType} onValueChange={(val) => setFormData({ ...formData, documentType: val })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="mark_sheet">Mark Sheet</SelectItem>
                  <SelectItem value="degree_certificate">Degree Certificate</SelectItem>
                  <SelectItem value="provisional">Provisional</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Document Name</Label>
              <Input 
                placeholder="e.g. Sem 1 Marksheet" 
                value={formData.documentName} 
                onChange={(e) => setFormData({ ...formData, documentName: e.target.value })} 
              />
            </div>

            <div className="space-y-2">
              <Label>Status</Label>
              <Select value={formData.status} onValueChange={(val) => setFormData({ ...formData, status: val })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="received">Received</SelectItem>
                  <SelectItem value="verified">Verified</SelectItem>
                  <SelectItem value="rejected">Rejected</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowReceivedModal(false)}>Cancel</Button>
            <Button disabled={isSubmitting} onClick={async () => {
              if (!formData.studentId || !formData.documentName) {
                toast.error('Student and Document Name are required');
                return;
              }
              setIsSubmitting(true);
              try {
                await api.post('/documents', { ...formData, type: 'received', deliveryDate: new Date().toISOString() });
                toast.success('Document received logged successfully');
                setShowReceivedModal(false);
                fetchLogs();
                setFormData({
                  studentId: '', documentName: '', documentType: 'mark_sheet', status: 'received', notes: ''
                });
              } catch (e) {
                toast.error('Failed to log document');
              } finally {
                setIsSubmitting(false);
              }
            }}>
              {isSubmitting ? 'Logging...' : 'Log Received'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
