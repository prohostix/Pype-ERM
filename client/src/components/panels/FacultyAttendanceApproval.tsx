import { useState, useEffect } from 'react';
import { ArrowLeft, CheckCircle, XCircle, Loader2, UserCheck, Calendar, Search, Filter } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import api from '@/lib/api';
import { toast } from 'sonner';

export function FacultyAttendanceApproval({ academicClass, onBack }: { academicClass: any, onBack: () => void }) {
  const [sessions, setSessions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedSession, setSelectedSession] = useState<any>(null);
  const [remarks, setRemarks] = useState('');
  const [approvalDialogOpen, setApprovalDialogOpen] = useState(false);
  const [approvalStatus, setApprovalStatus] = useState<'APPROVED' | 'REJECTED' | null>(null);
  const [saving, setSaving] = useState(false);
  
  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');

  useEffect(() => {
    fetchAttendances();
  }, [academicClass.id]);

  const fetchAttendances = async () => {
    try {
      const res = await api.get(`/faculty-portal/classes/${academicClass.id}/faculty-attendances`);
      setSessions(res.data.data || []);
    } catch (err) {
      toast.error('Failed to load faculty attendances');
    } finally {
      setLoading(false);
    }
  };

  const openApprovalDialog = (session: any, status: 'APPROVED' | 'REJECTED') => {
    setSelectedSession(session);
    setApprovalStatus(status);
    setRemarks(session.facultyPunchRemarks || '');
    setApprovalDialogOpen(true);
  };

  const handleApproveReject = async () => {
    if (!selectedSession || !approvalStatus) return;
    setSaving(true);
    try {
      await api.post(`/faculty-portal/sessions/${selectedSession.id}/approve-punch`, {
        status: approvalStatus,
        remarks
      });
      toast.success(`Attendance ${approvalStatus.toLowerCase()}`);
      setApprovalDialogOpen(false);
      fetchAttendances();
    } catch (err) {
      toast.error('Failed to update status');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-[60vh] text-muted-foreground">
        <Loader2 className="w-10 h-10 animate-spin mb-4 text-indigo-500" />
        <p>Loading attendance records...</p>
      </div>
    );
  }

  const filteredSessions = sessions.filter(session => {
    const matchesSearch = session.faculty?.name?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === 'ALL' || (session.facultyPunchStatus || 'PENDING') === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const groupedSessions = filteredSessions.reduce((acc: any, session: any) => {
    const batchName = session.academicBatch?.name || 'Unknown Batch';
    if (!acc[batchName]) acc[batchName] = [];
    acc[batchName].push(session);
    return acc;
  }, {});

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={onBack}>
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <div>
          <h2 className="text-xl font-bold tracking-tight flex items-center gap-2">
            <UserCheck className="w-5 h-5 text-indigo-500" />
            Faculty Attendance Approvals
          </h2>
          <p className="text-muted-foreground text-sm">Class: {academicClass.name}</p>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row gap-4 bg-white dark:bg-slate-950 p-4 rounded-xl border shadow-sm">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input 
            placeholder="Search by teacher name..." 
            className="pl-9"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
          />
        </div>
        <div className="flex items-center gap-2 sm:w-[250px]">
          <Filter className="w-4 h-4 text-muted-foreground" />
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="flex-1">
              <SelectValue placeholder="Filter by status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">All Statuses</SelectItem>
              <SelectItem value="PENDING">Pending</SelectItem>
              <SelectItem value="APPROVED">Approved</SelectItem>
              <SelectItem value="REJECTED">Rejected</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {Object.entries(groupedSessions).map(([batchName, batchSessions]: [string, any]) => (
        <Card key={batchName} className="mb-6 overflow-hidden">
          <div className="bg-indigo-50/50 dark:bg-indigo-950/20 px-5 py-3 border-b flex items-center justify-between">
            <h3 className="font-semibold text-indigo-900 dark:text-indigo-300">Batch: {batchName}</h3>
            <Badge variant="outline" className="bg-white dark:bg-slate-900">{batchSessions.length} Sessions</Badge>
          </div>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead className="bg-muted/30 text-muted-foreground border-b uppercase text-xs">
                  <tr>
                    <th className="px-6 py-4 font-semibold">Date & Session</th>
                    <th className="px-6 py-4 font-semibold">Teacher</th>
                    <th className="px-6 py-4 font-semibold">Punch In</th>
                    <th className="px-6 py-4 font-semibold">Punch Out</th>
                    <th className="px-6 py-4 font-semibold">Status</th>
                    <th className="px-6 py-4 font-semibold text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {batchSessions.map((session: any) => (
                    <tr key={session.id} className="hover:bg-slate-50 transition-colors">
                      <td className="px-6 py-4">
                        <div className="font-medium">{session.moduleLesson?.title}</div>
                        <div className="text-xs text-muted-foreground flex items-center gap-1 mt-1">
                          <Calendar className="w-3 h-3" />
                          {new Date(session.createdAt).toLocaleDateString()}
                        </div>
                      </td>
                      <td className="px-6 py-4 font-medium">{session.faculty?.name}</td>
                      <td className="px-6 py-4">
                        {session.facultyPunchInTime ? new Date(session.facultyPunchInTime).toLocaleTimeString() : '-'}
                      </td>
                      <td className="px-6 py-4">
                        {session.facultyPunchOutTime ? new Date(session.facultyPunchOutTime).toLocaleTimeString() : '-'}
                      </td>
                      <td className="px-6 py-4">
                        <Badge variant={
                          session.facultyPunchStatus === 'APPROVED' ? 'default' :
                          session.facultyPunchStatus === 'REJECTED' ? 'destructive' : 'secondary'
                        } className={session.facultyPunchStatus === 'APPROVED' ? 'bg-emerald-500 hover:bg-emerald-600' : ''}>
                          {session.facultyPunchStatus || 'PENDING'}
                        </Badge>
                      </td>
                      <td className="px-6 py-4 text-right">
                        {(!session.facultyPunchStatus || session.facultyPunchStatus === 'PENDING') ? (
                          <div className="flex items-center justify-end gap-2">
                            <Button 
                              size="sm" 
                              variant="outline" 
                              className="text-emerald-600 border-emerald-200 hover:bg-emerald-50"
                              onClick={() => openApprovalDialog(session, 'APPROVED')}
                            >
                              <CheckCircle className="w-4 h-4 mr-1" /> Approve
                            </Button>
                            <Button 
                              size="sm" 
                              variant="outline" 
                              className="text-red-600 border-red-200 hover:bg-red-50"
                              onClick={() => openApprovalDialog(session, 'REJECTED')}
                            >
                              <XCircle className="w-4 h-4 mr-1" /> Reject
                            </Button>
                          </div>
                        ) : (
                          <span className="text-xs text-muted-foreground italic">Processed</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      ))}

      {Object.keys(groupedSessions).length === 0 && (
        <Card>
          <CardContent className="p-12 text-center text-muted-foreground italic">
            No faculty attendance records found for this class.
          </CardContent>
        </Card>
      )}

      <Dialog open={approvalDialogOpen} onOpenChange={setApprovalDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {approvalStatus === 'APPROVED' ? 'Approve' : 'Reject'} Attendance
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-4">
            <p className="text-sm text-muted-foreground">
              You are about to <strong>{approvalStatus?.toLowerCase()}</strong> the attendance record for <strong>{selectedSession?.faculty?.name}</strong>.
            </p>
            <div className="space-y-2">
              <Label>Remarks / Reason (Optional)</Label>
              <Input 
                placeholder="E.g., Approved based on manual verification..."
                value={remarks}
                onChange={e => setRemarks(e.target.value)}
              />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="ghost" onClick={() => setApprovalDialogOpen(false)}>Cancel</Button>
              <Button 
                onClick={handleApproveReject} 
                disabled={saving}
                variant={approvalStatus === 'APPROVED' ? 'default' : 'destructive'}
              >
                {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
                Confirm {approvalStatus === 'APPROVED' ? 'Approval' : 'Rejection'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
