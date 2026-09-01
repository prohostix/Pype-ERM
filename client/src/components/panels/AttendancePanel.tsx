import { useState, useEffect } from 'react';
import { Plus, Edit, Trash2, Calendar, Users, Download, Camera } from 'lucide-react';
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
  const isHR = !isMyPortal && (user?.role === 'hr_admin' || user?.role === 'hr_sub_admin');
  const canViewAll = !isMyPortal && ['hr_admin', 'hr_sub_admin', 'org_admin', 'ceo'].includes(user?.role || '');
  const [attendance, setAttendance] = useState<any[]>([]);
  const [calendarAttendance, setCalendarAttendance] = useState<any[]>([]);
  const [holidays, setHolidays] = useState<any[]>([]);
  const [employees, setEmployees] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [photoViewerOpen, setPhotoViewerOpen] = useState(false);
  const [selectedPhoto, setSelectedPhoto] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  
  // HR admins default to list view (with date filter), others to calendar
  const [viewMode, setViewMode] = useState<'list' | 'calendar'>(canViewAll ? 'list' : 'calendar');
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<string>('');
  const [dateFilter, setDateFilter] = useState<string>(new Date().toISOString().split('T')[0]);
  const [sortOrder, setSortOrder] = useState<'desc' | 'asc' | 'late'>('desc');
  const [statusFilter, setStatusFilter] = useState<string>('all');

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

  const fetchAttendance = async (date?: string, status?: string) => {
    setLoading(true);
    try {
      const endpoint = canViewAll ? '/hr/attendance' : '/hr/attendance/my';
      const params: Record<string, string> = {};
      const effectiveDate = date !== undefined ? date : dateFilter;
      const effectiveStatus = status !== undefined ? status : statusFilter;
      if (effectiveDate) params.date = effectiveDate;
      if (effectiveStatus && effectiveStatus !== 'all') params.status = effectiveStatus;
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
    fetchAttendance(newDate, statusFilter);
  };

  const handleStatusFilterChange = (newStatus: string) => {
    setStatusFilter(newStatus);
    fetchAttendance(dateFilter, newStatus);
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
      setEmployees((response.data.data || []).filter((u: any) => u.status !== 'resigned'));
    } catch (error) {
      console.error('Failed to fetch employees:', error);
    }
  };

  const activeEmployeeId = selectedEmployeeId || user?.id?.toString() || '';
  const activeEmployeeName = employees.find(e => e.id.toString() === activeEmployeeId)?.name || user?.name || 'Employee';

  useEffect(() => {
    if (viewMode === 'calendar' && activeEmployeeId) {
      fetchCalendarAttendance(activeEmployeeId);
    }
  }, [viewMode, activeEmployeeId]);

  const fetchCalendarAttendance = async (userId: string) => {
    try {
      const [attendanceRes, holidaysRes] = await Promise.all([
        api.get(`/attendance/user/${userId}`),
        api.get('/hr/holidays')
      ]);
      setCalendarAttendance(attendanceRes.data.data || []);
      setHolidays(holidaysRes.data.data || []);
    } catch (error) {
      console.error('Failed to fetch calendar attendance:', error);
    }
  };



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
      toast.error(error.response?.data?.message || 'Failed to save attendance');
    }
  };

  const handleEdit = (record: any) => {
    const recId = record.id;
    const empId = record.employeeId?.id || record.employeeId || '';
    setEditingId(recId && !recId.toString().startsWith('absent-') ? recId : null);
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
    const baseStyle = "border-none rounded-full px-2.5 uppercase text-[10px] font-bold tracking-wider shadow-sm";
    const variants: any = {
      present: `bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-400 ${baseStyle}`,
      absent: `bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-400 ${baseStyle}`,
      late: `bg-yellow-100 text-yellow-800 dark:bg-yellow-900/40 dark:text-yellow-400 ${baseStyle}`,
      half_day: `bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-400 ${baseStyle}`,
      leave: `bg-purple-100 text-purple-800 dark:bg-purple-900/40 dark:text-purple-400 ${baseStyle}`
    };
    return <Badge className={variants[status] || baseStyle}>{status?.replace('_', ' ')}</Badge>;
  };

  const resolvePhotoUrl = (url: string | null | undefined): string | null => {
    if (!url) return null;
    return api.getFileUrl(url);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-primary/10 rounded-2xl">
            <Calendar className="w-6 h-6 text-primary" />
          </div>
          <div>
            <h2 className="text-2xl font-bold">Attendance {canViewAll ? 'Management' : 'Records'}</h2>
            <p className="text-muted-foreground text-sm mt-1">{canViewAll ? 'Track and manage employee attendance.' : 'Your personal attendance history.'}</p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          {canViewAll && viewMode === 'calendar' && (
            <div className="flex items-center gap-2 bg-muted/40 border border-slate-200/50 dark:border-slate-800/50 rounded-xl p-1.5 shadow-sm">
              <div className="bg-background rounded-lg p-1.5 shadow-sm">
                <Users className="w-4 h-4 text-primary" />
              </div>
              <Select value={selectedEmployeeId} onValueChange={setSelectedEmployeeId}>
                <SelectTrigger className="h-8 border-none bg-transparent shadow-none focus:ring-0 w-[180px] text-xs font-bold px-2">
                  <SelectValue placeholder="Select Employee" />
                </SelectTrigger>
                <SelectContent className="rounded-xl">
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
            <Button variant="outline" size="sm" onClick={handleExportExcel} className="rounded-xl border-slate-200/60 shadow-sm h-10 px-4 gap-2 text-xs font-semibold">
              <Download className="w-4 h-4 text-primary" /> Download Report
            </Button>
          )}

          {isHR && (
            <Dialog open={dialogOpen} onOpenChange={(open) => { setDialogOpen(open); if (!open) resetForm(); }}>
              <DialogTrigger asChild>
                <Button className="rounded-xl shadow-md h-10 px-4 transition-transform hover:scale-105 active:scale-95">
                  <Plus className="w-4 h-4 mr-2" /> Mark Attendance
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-md border-0 shadow-2xl rounded-3xl overflow-hidden p-0">
                <div className="bg-primary/5 p-6 border-b border-primary/10 flex items-center gap-3">
                  <div className="p-2.5 bg-primary/10 rounded-2xl text-primary">
                    <Calendar className="w-5 h-5" />
                  </div>
                  <div>
                    <DialogTitle className="text-xl">{editingId ? 'Edit Attendance' : 'Mark Attendance'}</DialogTitle>
                    <p className="text-sm text-muted-foreground mt-0.5">Manually record or edit an employee's punch.</p>
                  </div>
                </div>
                <form onSubmit={handleSubmit} className="p-6 space-y-5">
                  <div className="space-y-2">
                    <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Employee</Label>
                    <Select value={formData.employeeId} onValueChange={(value) => setFormData({...formData, employeeId: value})}>
                      <SelectTrigger className="rounded-xl h-11">
                        <SelectValue placeholder="Select employee" />
                      </SelectTrigger>
                      <SelectContent className="rounded-xl">
                        {employees.filter(emp => emp && emp.id).map((emp) => (
                          <SelectItem key={emp.id} value={emp.id.toString()}>
                            {emp.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Date</Label>
                    <Input type="date" className="rounded-xl h-11" value={formData.date} onChange={(e) => setFormData({...formData, date: e.target.value})} required />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Status</Label>
                    <Select value={formData.status} onValueChange={(value) => setFormData({...formData, status: value})}>
                      <SelectTrigger className="rounded-xl h-11">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="rounded-xl">
                        <SelectItem value="present">Present</SelectItem>
                        <SelectItem value="absent">Absent</SelectItem>
                        <SelectItem value="late">Late</SelectItem>
                        <SelectItem value="half_day">Half Day</SelectItem>
                        <SelectItem value="leave">Leave</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 bg-muted/30 p-4 rounded-2xl border border-border/40">
                    <div className="space-y-2">
                      <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Check In</Label>
                      <Input type="time" className="rounded-xl h-10" value={formData.checkIn} onChange={(e) => setFormData({...formData, checkIn: e.target.value})} />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Check Out</Label>
                      <Input type="time" className="rounded-xl h-10" value={formData.checkOut} onChange={(e) => setFormData({...formData, checkOut: e.target.value})} />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Notes</Label>
                    <Input className="rounded-xl h-11" value={formData.notes} onChange={(e) => setFormData({...formData, notes: e.target.value})} placeholder="Optional notes" />
                  </div>
                  <div className="pt-2 flex justify-end gap-2">
                    <Button type="button" variant="ghost" className="rounded-xl" onClick={() => setDialogOpen(false)}>Cancel</Button>
                    <Button type="submit" className="rounded-xl px-6">Save Record</Button>
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
          records={calendarAttendance}
          holidays={holidays}
          onRefresh={() => fetchCalendarAttendance(activeEmployeeId)}
          onToggleView={() => setViewMode('list')}
          isHR={isHR}
        />
      ) : (
        <Card className="border border-slate-200/60 dark:border-slate-800/60 shadow-xl rounded-2xl bg-card/60 backdrop-blur-xl overflow-hidden">
          <CardHeader className="flex flex-row items-center justify-between p-5 sm:p-6 border-b border-border/40 bg-muted/20">
            <div className="flex items-center gap-4">
              <CardTitle className="text-lg">Attendance Records</CardTitle>
              {viewMode === 'list' && (
                <Badge variant="outline" className="bg-yellow-500/10 text-yellow-600 border-yellow-500/20 font-bold shadow-sm rounded-full px-3">
                  Late: {attendance.filter(r => r.isLate || r.status === 'late').length} {canViewAll && dateFilter ? 'Users' : 'Records'}
                </Badge>
              )}
            </div>
            <Button variant="outline" size="sm" onClick={() => setViewMode('calendar')} className="gap-2 rounded-xl border-slate-200/60 shadow-sm h-9 text-xs font-semibold px-4 transition-transform hover:scale-105">
              <Calendar className="w-4 h-4 text-primary" /> Calendar View
            </Button>
          </CardHeader>
          <CardContent className="p-5 sm:p-6">
            {/* Filter bar */}
            <div className="flex flex-col sm:flex-row sm:flex-wrap items-start sm:items-center justify-between gap-4 mb-6 p-4 rounded-2xl bg-muted/40 border border-slate-200/50 dark:border-slate-800/50 shadow-sm">
              <div className="flex items-center gap-3">
                <div className="bg-background p-2 rounded-xl shadow-sm border border-border/50">
                  <Calendar className="w-4 h-4 text-primary" />
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="date"
                    value={dateFilter}
                    onChange={(e) => handleDateFilterChange(e.target.value)}
                    className="border border-border/50 rounded-xl px-3 py-1.5 text-sm bg-background shadow-sm focus:outline-none focus:ring-2 focus:ring-primary/20 h-9"
                  />
                  {dateFilter && (
                    <button
                      onClick={() => handleDateFilterChange('')}
                      className="text-xs font-semibold text-muted-foreground hover:text-foreground underline decoration-dashed underline-offset-4"
                    >
                      Clear
                    </button>
                  )}
                </div>
              </div>
              
              <div className="flex items-center gap-4 w-full sm:w-auto">
                <div className="flex items-center gap-2 flex-1 sm:flex-initial">
                  <span className="text-xs text-muted-foreground font-semibold uppercase tracking-wider hidden md:inline">Status</span>
                  <Select value={statusFilter} onValueChange={handleStatusFilterChange}>
                    <SelectTrigger className="h-9 rounded-xl border-border/50 bg-background w-full sm:w-[130px] text-xs shadow-sm font-medium">
                      <SelectValue placeholder="All Statuses" />
                    </SelectTrigger>
                    <SelectContent className="rounded-xl">
                      <SelectItem value="all">All</SelectItem>
                      <SelectItem value="present">Present</SelectItem>
                      <SelectItem value="absent">Absent</SelectItem>
                      <SelectItem value="late">Late</SelectItem>
                      <SelectItem value="half_day">Half Day</SelectItem>
                      <SelectItem value="leave">Leave</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex items-center gap-2 flex-1 sm:flex-initial">
                  <span className="text-xs text-muted-foreground font-semibold uppercase tracking-wider hidden md:inline">Sort</span>
                  <Select value={sortOrder} onValueChange={(val: any) => setSortOrder(val)}>
                    <SelectTrigger className="h-9 rounded-xl border-border/50 bg-background w-full sm:w-[140px] text-xs shadow-sm font-medium">
                      <SelectValue placeholder="Sort" />
                    </SelectTrigger>
                    <SelectContent className="rounded-xl">
                      <SelectItem value="desc">↓ Newest First</SelectItem>
                      <SelectItem value="asc">↑ Oldest First</SelectItem>
                      <SelectItem value="late">Late First</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>

            {/* List */}
            {loading ? (
              <div className="space-y-3">
                {[1,2,3].map(i => <div key={i} className="h-20 bg-muted/40 rounded-2xl animate-pulse border border-border/50" />)}
              </div>
            ) : attendance.length === 0 ? (
              <div className="text-center py-16 px-4 rounded-2xl border-2 border-dashed border-border/60 bg-muted/10">
                <div className="bg-muted/50 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Calendar className="w-8 h-8 text-muted-foreground opacity-50" />
                </div>
                <h3 className="text-lg font-bold text-foreground">No records found</h3>
                <p className="text-sm text-muted-foreground mt-1">There are no attendance records matching your current filters.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {[...attendance]
                  .filter(rec => rec && rec.id)
                  .sort((a, b) => {
                    if (sortOrder === 'late') {
                      const lateA = a.isLate ? (a.lateMinutes || 1) : 0;
                      const lateB = b.isLate ? (b.lateMinutes || 1) : 0;
                      if (lateA !== lateB) return lateB - lateA;
                      return new Date(b.date).getTime() - new Date(a.date).getTime();
                    }
                    const dateA = new Date(a.date).getTime();
                    const dateB = new Date(b.date).getTime();
                    return sortOrder === 'desc' ? dateB - dateA : dateA - dateB;
                  })
                  .map((record) => {
                  const recId = record.id;
                  const empName = record.employeeId?.name || record.employee?.name || record.user?.name || 'Unknown';
                  return (
                    <div key={recId} className="group flex flex-col sm:flex-row sm:items-center justify-between p-5 border border-slate-200/60 dark:border-slate-800/60 rounded-2xl bg-card/40 hover:bg-card/80 backdrop-blur-xl shadow-sm hover:shadow-md transition-all duration-300 gap-4 overflow-hidden relative">
                      {record.isLate && (
                        <div className="absolute left-0 top-0 bottom-0 w-1 bg-yellow-500 rounded-l-2xl" />
                      )}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-3 mb-3">
                          <div className="font-bold text-base text-foreground truncate">{empName}</div>
                          {getStatusBadge(record.status)}
                        </div>
                        
                        <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-xs font-medium">
                          <div className="flex items-center text-muted-foreground bg-muted/40 px-2.5 py-1.5 rounded-lg border border-border/40 shadow-sm">
                            <Calendar className="w-3.5 h-3.5 mr-1.5 text-foreground/70" />
                            {new Date(record.date).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })}
                          </div>
                          
                          <div className="flex items-center gap-2">
                            <div className="flex items-center gap-1.5 bg-primary/5 text-primary px-2.5 py-1.5 rounded-lg border border-primary/10 shadow-sm">
                              <span className="opacity-70 text-[10px] uppercase tracking-wider font-bold">In</span>
                              <span>{record.checkIn ? new Date(record.checkIn).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) : '--'}</span>
                              {record.checkInPhoto && (
                                <button onClick={() => { setSelectedPhoto(record.checkInPhoto); setPhotoViewerOpen(true); }} className="p-0.5 hover:bg-primary/20 rounded-md transition-colors ml-1" title="View Check-in Photo">
                                  <Camera className="w-3.5 h-3.5" />
                                </button>
                              )}
                            </div>
                            <span className="text-muted-foreground/50">→</span>
                            <div className="flex items-center gap-1.5 bg-primary/5 text-primary px-2.5 py-1.5 rounded-lg border border-primary/10 shadow-sm">
                              <span className="opacity-70 text-[10px] uppercase tracking-wider font-bold">Out</span>
                              <span>{record.checkOut ? new Date(record.checkOut).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) : '--'}</span>
                              {record.checkOutPhoto && (
                                <button onClick={() => { setSelectedPhoto(record.checkOutPhoto); setPhotoViewerOpen(true); }} className="p-0.5 hover:bg-primary/20 rounded-md transition-colors ml-1" title="View Check-out Photo">
                                  <Camera className="w-3.5 h-3.5" />
                                </button>
                              )}
                            </div>
                          </div>
                        </div>
                        {record.notes && (
                          <div className="mt-4 text-sm text-muted-foreground bg-muted/30 p-3 rounded-xl border border-border/30 italic">
                            "{record.notes}"
                          </div>
                        )}
                      </div>
                      
                      {isHR && (
                        <div className="flex items-center justify-end gap-2 shrink-0 md:opacity-0 md:group-hover:opacity-100 transition-opacity duration-300">
                          <Button variant="outline" size="sm" className="h-9 rounded-xl shadow-sm border-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 gap-1.5 px-3" onClick={() => handleEdit(record)}>
                            <Edit className="w-3.5 h-3.5 text-muted-foreground" /> Edit
                          </Button>
                          {recId && !recId.toString().startsWith('absent-') && (
                            <Button variant="outline" size="sm" className="h-9 rounded-xl shadow-sm border-red-200 hover:bg-red-50 dark:hover:bg-red-900/20 text-red-600 hover:text-red-700 gap-1.5 px-3" onClick={() => handleDelete(recId)}>
                              <Trash2 className="w-3.5 h-3.5" /> Delete
                            </Button>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      <Dialog open={photoViewerOpen} onOpenChange={setPhotoViewerOpen}>
        <DialogContent className="sm:max-w-md p-1">
          {selectedPhoto && (
            <img src={resolvePhotoUrl(selectedPhoto) || ''} alt="Punch Photo" className="w-full rounded-lg" />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
