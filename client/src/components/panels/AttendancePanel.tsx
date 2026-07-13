import { useState, useEffect } from 'react';
import { Plus, Edit, Trash2, Calendar, Users, Download } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/hooks/useAuth';
import api from '@/lib/api';
import { AttendanceCalendar } from '@/components/attendance/AttendanceCalendar';
import { toast } from 'sonner';

interface AttendancePanelProps {
  isMyPortal?: boolean;
}

export function AttendancePanel({ isMyPortal = false }: AttendancePanelProps) {
  const { user } = useAuth();
  const isHR = !isMyPortal && user?.role === 'hr_admin';
  const canViewAll = !isMyPortal && ['hr_admin', 'org_admin', 'ceo'].includes(user?.role || '');
  const [attendance, setAttendance] = useState<any[]>([]);
  const [employees, setEmployees] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  
  // HR admins default to list view (with date filter), others to calendar
  const [viewMode, setViewMode] = useState<'list' | 'calendar'>(canViewAll ? 'list' : 'calendar');
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<string>('');
  const [dateFilter, setDateFilter] = useState<string>(new Date().toISOString().split('T')[0]);
  const [sortOrder, setSortOrder] = useState<'desc' | 'asc'>('desc');

  const [formData, setFormData] = useState({
    employeeId: '',
    date: new Date().toISOString().split('T')[0],
    status: 'present',
    checkIn: '09:00',
    checkOut: '18:00',
    notes: ''
  });

  useEffect(() => {
    fetchAttendance();
    if (canViewAll) fetchEmployees();
  }, []);

  useEffect(() => {
    if (employees.length > 0 && !selectedEmployeeId) {
      const me = employees.find(e => e.id === user?.id);
      setSelectedEmployeeId(me ? me.id.toString() : employees[0].id.toString());
    }
  }, [employees]);

  const fetchAttendance = async (date?: string) => {
    setLoading(true);
    try {
      const endpoint = canViewAll ? '/hr/attendance' : '/hr/attendance/my';
      const params: Record<string, string> = {};
      const effectiveDate = date !== undefined ? date : dateFilter;
      if (effectiveDate) params.date = effectiveDate;
      const response = await api.get(endpoint, { params });
      setAttendance(response.data.data || []);
    } catch (error) {
      console.error('Failed to fetch attendance:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDateFilterChange = (newDate: string) => {
    setDateFilter(newDate);
    fetchAttendance(newDate);
  };

  const handleExportExcel = async () => {
    try {
      const XLSX = await import('xlsx');
      const exportData = attendance.map(rec => {
        const empName = rec.employeeId?.name || rec.employee?.name || rec.user?.name || 'Unknown';
        const empEmail = rec.employeeId?.email || rec.employee?.email || rec.user?.email || '';
        return {
          'Employee Name': empName,
          'Email': empEmail,
          'Date': rec.date ? new Date(rec.date).toLocaleDateString('en-IN') : '',
          'Status': rec.status?.replace('_', ' ').toUpperCase() || 'PRESENT',
          'Check-In': rec.checkIn ? new Date(rec.checkIn).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '--',
          'Check-Out': rec.checkOut ? new Date(rec.checkOut).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '--',
          'Late Check-In': rec.isLate ? 'YES' : 'NO',
          'Late Minutes': rec.lateMinutes || 0,
          'Working Hours': rec.workingHours || 0,
          'Notes': rec.notes || ''
        };
      });

      const worksheet = XLSX.utils.json_to_sheet(exportData);
      worksheet['!cols'] = [22, 28, 14, 14, 12, 12, 16, 14, 14, 26].map(w => ({ wch: w }));
      
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, 'Attendance');
      XLSX.writeFile(workbook, 'employee_attendance_report.xlsx');
      toast.success('Attendance report exported successfully!');
    } catch (error) {
      console.error('Failed to export excel:', error);
      toast.error('Failed to export excel');
    }
  };

  const fetchEmployees = async () => {
    try {
      const response = await api.get('/users');
      setEmployees(response.data.data || []);
    } catch (error) {
      console.error('Failed to fetch employees:', error);
    }
  };

  const activeEmployeeId = selectedEmployeeId || user?.id?.toString() || '';
  const activeEmployeeName = employees.find(e => e.id.toString() === activeEmployeeId)?.name || user?.name || 'Employee';

  const activeEmployeeRecords = attendance.filter(rec => {
    const empId = rec.employeeId?.id || rec.employeeId || rec.user?.id || '';
    return empId.toString() === activeEmployeeId;
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const toISO = (date: string, time: string) => {
        if (!date || !time) return undefined;
        return new Date(`${date}T${time}:00`).toISOString();
      };
      const payload: any = {
        employeeId: formData.employeeId,
        date: new Date(formData.date).toISOString(),
        status: formData.status,
        notes: formData.notes,
      };
      if (formData.checkIn) payload.checkIn = toISO(formData.date, formData.checkIn);
      if (formData.checkOut) payload.checkOut = toISO(formData.date, formData.checkOut);

      if (editingId) {
        await api.put(`/hr/attendance/${editingId}`, payload);
      } else {
        await api.post('/hr/attendance', payload);
      }
      setDialogOpen(false);
      resetForm();
      fetchAttendance();
    } catch (error: any) {
      console.error('Failed to save attendance:', error);
      alert(error.response?.data?.message || 'Failed to save attendance');
    }
  };

  const handleEdit = (record: any) => {
    const recId = record.id;
    const empId = record.employeeId?.id || record.employeeId || '';
    setEditingId(recId);
    setFormData({
      employeeId: empId?.toString() || '',
      date: record.date ? new Date(record.date).toISOString().split('T')[0] : '',
      status: record.status || 'present',
      checkIn: record.checkIn ? new Date(record.checkIn).toTimeString().slice(0, 5) : '09:00',
      checkOut: record.checkOut ? new Date(record.checkOut).toTimeString().slice(0, 5) : '18:00',
      notes: record.notes || ''
    });
    setDialogOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this attendance record?')) return;
    try {
      await api.delete(`/hr/attendance/${id}`);
      fetchAttendance();
    } catch (error) {
      console.error('Failed to delete attendance:', error);
    }
  };

  const resetForm = () => {
    setEditingId(null);
    setFormData({
      employeeId: '',
      date: new Date().toISOString().split('T')[0],
      status: 'present',
      checkIn: '09:00',
      checkOut: '18:00',
      notes: ''
    });
  };

  const getStatusBadge = (status: string) => {
    const variants: any = {
      present: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400 border-none',
      absent: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400 border-none',
      late: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400 border-none',
      half_day: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400 border-none',
      leave: 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400 border-none'
    };
    return <Badge className={variants[status] || ''}>{status?.replace('_', ' ')}</Badge>;
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold">Attendance {canViewAll ? 'Management' : 'Records'}</h2>
          <p className="text-muted-foreground">{canViewAll ? 'Track and manage employee attendance' : 'Your attendance history'}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {canViewAll && viewMode === 'calendar' && (
            <div className="flex items-center gap-2 bg-background border border-border rounded-lg px-3 py-1.5 shadow-sm">
              <Users className="w-4 h-4 text-muted-foreground" />
              <Select value={selectedEmployeeId} onValueChange={setSelectedEmployeeId}>
                <SelectTrigger className="h-7 border-none bg-transparent shadow-none focus:ring-0 w-[180px] text-xs font-bold">
                  <SelectValue placeholder="Select Employee" />
                </SelectTrigger>
                <SelectContent>
                  {employees.map(emp => (
                    <SelectItem key={emp.id} value={emp.id.toString()} className="text-xs">
                      {emp.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {canViewAll && (
            <Button variant="outline" size="sm" onClick={handleExportExcel} className="h-9 text-xs font-semibold gap-1.5 border-dashed border-primary hover:border-primary/80">
              <Download className="w-4 h-4 text-primary" /> Download Report
            </Button>
          )}

          {isHR && (
            <Dialog open={dialogOpen} onOpenChange={(open) => { setDialogOpen(open); if (!open) resetForm(); }}>
              <DialogTrigger asChild>
                <Button><Plus className="w-4 h-4 mr-2" />Mark Attendance</Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>{editingId ? 'Edit Attendance' : 'Mark Attendance'}</DialogTitle>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div>
                    <Label>Employee</Label>
                    <Select value={formData.employeeId} onValueChange={(value) => setFormData({...formData, employeeId: value})}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select employee" />
                      </SelectTrigger>
                      <SelectContent>
                        {employees.filter(emp => emp && emp.id).map((emp) => (
                          <SelectItem key={emp.id} value={emp.id.toString()}>
                            {emp.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Date</Label>
                    <Input type="date" value={formData.date} onChange={(e) => setFormData({...formData, date: e.target.value})} required />
                  </div>
                  <div>
                    <Label>Status</Label>
                    <Select value={formData.status} onValueChange={(value) => setFormData({...formData, status: value})}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="present">Present</SelectItem>
                        <SelectItem value="absent">Absent</SelectItem>
                        <SelectItem value="late">Late</SelectItem>
                        <SelectItem value="half_day">Half Day</SelectItem>
                        <SelectItem value="leave">Leave</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label>Check In</Label>
                      <Input type="time" value={formData.checkIn} onChange={(e) => setFormData({...formData, checkIn: e.target.value})} />
                    </div>
                    <div>
                      <Label>Check Out</Label>
                      <Input type="time" value={formData.checkOut} onChange={(e) => setFormData({...formData, checkOut: e.target.value})} />
                    </div>
                  </div>
                  <div>
                    <Label>Notes</Label>
                    <Input value={formData.notes} onChange={(e) => setFormData({...formData, notes: e.target.value})} placeholder="Optional notes" />
                  </div>
                  <div className="flex gap-2">
                    <Button type="submit" className="flex-1">Save</Button>
                    <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
                  </div>
                </form>
              </DialogContent>
            </Dialog>
          )}
        </div>
      </div>

      {viewMode === 'calendar' ? (
        <AttendanceCalendar
          employeeId={activeEmployeeId}
          employeeName={activeEmployeeName}
          records={activeEmployeeRecords}
          onRefresh={fetchAttendance}
          onToggleView={() => setViewMode('list')}
          isHR={isHR}
        />
      ) : (
        <Card className="border-none shadow-xl bg-card/65 backdrop-blur-xl">
          <CardHeader className="flex flex-row items-center justify-between pb-6 border-b border-border/40">
            <CardTitle>Attendance Records List</CardTitle>
            <Button variant="outline" size="sm" onClick={() => setViewMode('calendar')} className="gap-1.5 h-9 text-xs font-semibold">
              <Calendar className="w-3.5 h-3.5" /> Calendar View
            </Button>
          </CardHeader>
          <CardContent className="pt-6">
            {/* Date filter bar */}
            <div className="flex flex-wrap items-center justify-between gap-3 mb-5 p-3 rounded-xl bg-muted/30 border border-border/40">
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4 text-muted-foreground" />
                <span className="text-xs font-semibold text-muted-foreground">Filter by Date</span>
                <input
                  type="date"
                  value={dateFilter}
                  onChange={(e) => handleDateFilterChange(e.target.value)}
                  className="border border-border rounded-lg px-3 py-1.5 text-sm bg-background focus:outline-none focus:ring-1 focus:ring-primary"
                />
                {dateFilter && (
                  <button
                    onClick={() => handleDateFilterChange('')}
                    className="text-xs text-muted-foreground hover:text-foreground underline"
                  >
                    Clear
                  </button>
                )}
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs text-muted-foreground font-medium">Sort:</span>
                <button
                  onClick={() => setSortOrder(sortOrder === 'desc' ? 'asc' : 'desc')}
                  className="text-xs font-semibold px-3 py-1.5 rounded-lg border border-border bg-background hover:bg-muted transition-colors"
                >
                  {sortOrder === 'desc' ? '↓ Newest First' : '↑ Oldest First'}
                </button>
              </div>
            </div>
            {loading ? (
              <div className="text-center py-8">Loading...</div>
            ) : attendance.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">No attendance records found</div>
            ) : (
              <div className="space-y-3">
                {[...attendance]
                  .filter(rec => rec && rec.id)
                  .sort((a, b) => {
                    const dateA = new Date(a.date).getTime();
                    const dateB = new Date(b.date).getTime();
                    return sortOrder === 'desc' ? dateB - dateA : dateA - dateB;
                  })
                  .map((record) => {
                  const recId = record.id;
                  const empName = record.employeeId?.name || record.employee?.name || record.user?.name || 'Unknown';
                  return (
                    <div key={recId} className="flex items-center justify-between p-4 border border-border/60 rounded-xl hover:bg-muted/30 transition-colors">
                      <div className="flex-1">
                        <div className="font-bold text-sm text-foreground">{empName}</div>
                        <div className="text-xs text-muted-foreground mt-1">
                          {new Date(record.date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })} • {record.checkIn ? new Date(record.checkIn).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) : '--'} - {record.checkOut ? new Date(record.checkOut).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) : '--'}
                        </div>
                        {record.notes && <div className="text-xs text-slate-500 mt-1 italic">"{record.notes}"</div>}
                      </div>
                      <div className="flex items-center gap-3">
                        {getStatusBadge(record.status)}
                        {isHR && (
                          <div className="flex items-center gap-1">
                            <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-foreground" onClick={() => handleEdit(record)}>
                              <Edit className="w-4 h-4" />
                            </Button>
                            <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-destructive" onClick={() => handleDelete(recId)}>
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
