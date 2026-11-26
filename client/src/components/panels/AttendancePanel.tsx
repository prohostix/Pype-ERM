import { useState, useEffect } from 'react';
import { Plus, Edit, Trash2, Calendar, Users, Download, Camera, X, CheckCircle2, XCircle, CalendarOff, Loader2, FileSpreadsheet, Clock, LogOut } from 'lucide-react';
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
import { ListPagination } from '@/components/ui/list-pagination';
import { confirmDialog } from '@/lib/confirm';
import { isGiven, mayOn } from '@/lib/access';

interface AttendancePanelProps {
  isMyPortal?: boolean;
  initialFilter?: string;
}

export function AttendancePanel({ isMyPortal = false, initialFilter = 'all' }: AttendancePanelProps) {
  const { user } = useAuth();
  const hrRole = user?.role === 'hr_admin' || user?.role === 'hr_sub_admin';
  // Added by an Org Admin: sees the team, with only the actions they were allowed
  const given = !isMyPortal && isGiven(user, 'team_attendance');
  const mayCreate = !isMyPortal && mayOn(user, 'team_attendance', 'create', hrRole);
  const mayEdit = !isMyPortal && mayOn(user, 'team_attendance', 'edit', hrRole);
  const mayDelete = !isMyPortal && mayOn(user, 'team_attendance', 'delete', hrRole);
  const mayViewPayroll = !isMyPortal && mayOn(user, 'payroll', 'view', ['hr_admin', 'hr_sub_admin', 'superadmin'].includes(user?.role || ''));
  const canViewAll = given || !isMyPortal && ['hr_admin', 'hr_sub_admin', 'org_admin', 'ceo', 'general_manager', 'sales_admin', 'sales_sub_admin', 'sub_department_manager', 'branch_manager', 'center_admin'].includes(user?.role || '');
  const [attendance, setAttendance] = useState<any[]>([]);
  const [calendarAttendance, setCalendarAttendance] = useState<any[]>([]);
  const [holidays, setHolidays] = useState<any[]>([]);
  const [employees, setEmployees] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [photoViewerOpen, setPhotoViewerOpen] = useState(false);
  const [selectedPhoto, setSelectedPhoto] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);

  const [exportDialogOpen, setExportDialogOpen] = useState(false);
  const [exportPeriod, setExportPeriod] = useState<'date' | 'month'>('month');
  const [exportDate, setExportDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [exportMonth, setExportMonth] = useState<string>(new Date().toISOString().slice(0, 7));
  const [exportEmployeeId, setExportEmployeeId] = useState<string>('all');
  const [exporting, setExporting] = useState(false);

  // HR admins default to list view (with date filter), others to calendar
  const [viewMode, setViewMode] = useState<'list' | 'calendar'>(canViewAll ? 'list' : 'calendar');
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<string>('');
  const [dateFilter, setDateFilter] = useState<string>(new Date().toISOString().split('T')[0]);
  const [sortOrder, setSortOrder] = useState<'desc' | 'asc' | 'late'>('desc');
  const [statusFilter, setStatusFilter] = useState<string>(initialFilter);
  const [recPage, setRecPage] = useState(1);
  const [recPageSize, setRecPageSize] = useState(10);
  useEffect(() => { setRecPage(1); }, [dateFilter, statusFilter, sortOrder, attendance.length]);

  const [formData, setFormData] = useState<any>({
    employeeId: '',
    date: new Date().toISOString().split('T')[0],
    status: 'present',
    checkIn: '',
    checkOut: '',
    lateMinutes: '',
    earlyExitMinutes: '',
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

  const executeExport = async () => {
    setExporting(true);
    try {
      let startDate = exportDate;
      let endDate = exportDate;
      let reportName = 'Attendance_Report';

      if (exportPeriod === 'month') {
        const [year, month] = exportMonth.split('-');
        startDate = `${year}-${month}-01`;
        const lastDay = new Date(parseInt(year), parseInt(month), 0).getDate();
        endDate = `${year}-${month}-${lastDay}`;
        reportName = `Attendance_Report_${exportMonth}`;
      } else {
        reportName = `Attendance_Report_${exportDate}`;
      }

      if (exportEmployeeId !== 'all') {
        const empName = employees.find(e => e.id.toString() === exportEmployeeId)?.name || 'Employee';
        reportName = `${empName.replace(/\\s+/g, '_')}_${reportName}`;
      }

      const response = await api.get('/attendance/export', { 
        params: { startDate, endDate, employeeId: exportEmployeeId } 
      });
      
      const rawData = response.data.data || [];

      if (rawData.length === 0) {
        toast.warning('No attendance records found for the selected criteria.');
        setExporting(false);
        return;
      }

      const XLSX = await import('xlsx');
      
      let exportData: any[] = [];
      let worksheet;
      
      if (exportEmployeeId === 'all') {
        const aggregated: Record<string, { name: string, email: string, totalLate: number, present: number, absent: number, halfDay: number, leave: number }> = {};
        
        rawData.forEach((rec: any) => {
          const empId = rec.user?.id || rec.employeeId?.id || rec.employeeId || 'Unknown';
          const empName = rec.user?.name || rec.employeeId?.name || rec.employee?.name || 'Unknown';
          const empEmail = rec.user?.email || rec.employeeId?.email || rec.employee?.email || '';
          
          if (!aggregated[empId]) {
            aggregated[empId] = { name: empName, email: empEmail, totalLate: 0, totalEarlyExit: 0, present: 0, absent: 0, halfDay: 0, leave: 0 };
          }
          
          let lateMins = rec.lateMinutes || 0;
          let earlyMins = rec.earlyExitMinutes || 0;
          // Guarantee: half day punch-ins never count late minutes
          if (rec.status === 'half_day' || (rec.notes && rec.notes.toLowerCase().includes('half day'))) {
            lateMins = 0;
          }

          aggregated[empId].totalLate += lateMins;
          aggregated[empId].totalEarlyExit += earlyMins;
          if (rec.status === 'present' || rec.status === 'late') aggregated[empId].present++;
          else if (rec.status === 'absent') aggregated[empId].absent++;
          else if (rec.status === 'half_day') aggregated[empId].halfDay++;
          else if (rec.status === 'leave') aggregated[empId].leave++;
        });

        exportData = Object.values(aggregated).map((emp: any) => ({
          'Employee Name': emp.name,
          'Email': emp.email,
          'Total Late Minutes': emp.totalLate,
          'Total Early Exit Minutes': emp.totalEarlyExit,
          'Days Present': emp.present,
          'Days Absent': emp.absent,
          'Half Days': emp.halfDay,
          'Leaves': emp.leave
        }));
        
        worksheet = XLSX.utils.json_to_sheet(exportData);
        worksheet['!cols'] = [22, 28, 18, 22, 14, 14, 12, 12].map(w => ({ wch: w }));
      } else {
        exportData = rawData.map((rec: any) => {
          const empName = rec.employeeId?.name || rec.employee?.name || rec.user?.name || 'Unknown';
          const empEmail = rec.employeeId?.email || rec.employee?.email || rec.user?.email || '';
          let lateMins = rec.lateMinutes || 0;
          if (rec.status === 'half_day' || (rec.notes && rec.notes.toLowerCase().includes('half day'))) {
            lateMins = 0;
          }
          return {
            'Employee Name': empName,
            'Email': empEmail,
            'Date': rec.date ? new Date(rec.date).toLocaleDateString('en-IN') : '',
            'Status': rec.status?.replace('_', ' ').toUpperCase() || 'PRESENT',
            'Check-In': rec.checkIn ? new Date(rec.checkIn).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '--',
            'Check-Out': rec.checkOut ? new Date(rec.checkOut).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '--',
            'Late Check-In': (rec.isLate && lateMins > 0) ? 'YES' : 'NO',
            'Late Minutes': lateMins,
            'Early Exit': (rec.isEarlyExit && (rec.earlyExitMinutes || 0) > 0) ? 'YES' : 'NO',
            'Early Exit Minutes': rec.earlyExitMinutes || 0,
            'Working Hours': rec.workingHours || 0,
            'Notes': rec.notes || ''
          };
        });
        worksheet = XLSX.utils.json_to_sheet(exportData);
        worksheet['!cols'] = [22, 28, 14, 14, 12, 12, 16, 14, 14, 18, 14, 26].map(w => ({ wch: w }));
      }
      
      // Salary figures are monthly, and only for people who may see payroll
      let salaryFailed = false;
      if (mayViewPayroll && exportPeriod === 'month') {
        try {
          const res = await api.get('/hr/payroll/deductions-report', { params: { month: exportMonth, employeeId: exportEmployeeId } });
          const { rows } = res.data.data;
          const salaryColumns = (r?: any) => ({
            'Total Deducted': r?.totalDeductions ?? '',
            'Total Salary': r?.netSalary ?? ''
          });
          if (exportEmployeeId === 'all') {
            // One row per employee; anyone paid but without attendance gets a row too
            const byEmail = new Map<string, any>(rows.map((r: any) => [r.email, r]));
            const listed = new Set(exportData.map((e: any) => e['Email']));
            exportData = [
              ...exportData.map((e: any) => ({ ...e, ...salaryColumns(byEmail.get(e['Email'])) })),
              ...rows.filter((r: any) => !listed.has(r.email)).map((r: any) => ({ 'Employee Name': r.name, 'Email': r.email, ...salaryColumns(r) }))
            ];
          } else {
            // One row per day, so the month's figures go on the first row only and are not added up twice
            exportData = exportData.map((e: any, i: number) => ({ ...e, ...salaryColumns(i === 0 ? rows[0] : undefined) }));
          }
          const widths = worksheet['!cols'] || [];
          worksheet = XLSX.utils.json_to_sheet(exportData);
          worksheet['!cols'] = Object.keys(exportData[0]).map((key, i) => widths[i] || { wch: Math.max(16, key.length + 2) });
        } catch (error) {
          console.error('Failed to load salary deductions:', error);
          salaryFailed = true;
        }
      }

      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, 'Attendance');
      XLSX.writeFile(workbook, `${reportName}.xlsx`);
      if (salaryFailed) toast.warning('Report downloaded without salary deductions, which could not be loaded.');
      else toast.success('Attendance report exported successfully!');
      setExportDialogOpen(false);
    } catch (error) {
      console.error('Failed to export excel:', error);
      toast.error('Failed to export report. Please try again.');
    } finally {
      setExporting(false);
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
      
      payload.checkIn = formData.checkIn ? toISO(formData.date, formData.checkIn) : null;
      payload.checkOut = formData.checkOut ? toISO(formData.date, formData.checkOut) : null;

      if (formData.lateMinutes !== undefined && formData.lateMinutes !== '') {
        payload.lateMinutes = Number(formData.lateMinutes);
        payload.isLate = payload.lateMinutes > 0;
      }

      if (formData.earlyExitMinutes !== undefined && formData.earlyExitMinutes !== '') {
        payload.earlyExitMinutes = Number(formData.earlyExitMinutes);
        payload.isEarlyExit = payload.earlyExitMinutes > 0;
      }

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

  const isMockRecordId = (id: any) => {
    if (!id) return true;
    const str = id.toString();
    return str.startsWith('absent-') || str.startsWith('holiday-') || str.startsWith('leave-') || str.startsWith('week_off-');
  };

  const handleEdit = (record: any) => {
    const recId = record.id;
    const empId = record.employeeId?.id || record.employeeId || '';
    setEditingId(recId && !isMockRecordId(recId) ? recId : null);
    setFormData({
      employeeId: empId?.toString() || '',
      date: record.date ? new Date(record.date).toISOString().split('T')[0] : '',
      status: record.status || 'present',
      checkIn: record.checkIn ? new Date(record.checkIn).toTimeString().slice(0, 5) : '',
      checkOut: record.checkOut ? new Date(record.checkOut).toTimeString().slice(0, 5) : '',
      lateMinutes: record.lateMinutes || '',
      earlyExitMinutes: record.earlyExitMinutes || '',
      notes: record.notes || ''
    });
    setDialogOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (!(await confirmDialog({ title: 'Delete attendance record?', message: 'Are you sure you want to delete this attendance record?', confirmText: 'Delete', tone: 'danger' }))) return;
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
      checkIn: '',
      checkOut: '',
      lateMinutes: '',
      earlyExitMinutes: '',
      notes: ''
    });
  };

  const getStatusBadge = (status: string) => {
    const baseStyle = "border-none rounded-full px-2.5 uppercase text-[10px] font-semibold tracking-wider";
    const variants: any = {
      present: `bg-[#dff3da] text-[#256c1d] ${baseStyle}`,
      absent: `bg-red-100 text-red-700 ${baseStyle}`,
      late: `bg-amber-100 text-amber-700 ${baseStyle}`,
      half_day: `bg-sky-100 text-sky-700 ${baseStyle}`,
      leave: `bg-slate-200/70 text-slate-600 ${baseStyle}`
    };
    return <Badge className={variants[status] || baseStyle}>{status?.replace('_', ' ')}</Badge>;
  };

  const resolvePhotoUrl = (url: string | null | undefined): string | null => {
    if (!url) return null;
    return api.getFileUrl(url);
  };

  const validRecordCount = attendance.filter(rec => rec && rec.id).length;
  const safePage = Math.min(recPage, Math.max(1, Math.ceil(validRecordCount / recPageSize)));

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
        <div>
          <div>
            <h2 className="text-2xl sm:text-3xl font-semibold tracking-tight">Attendance {canViewAll ? 'Management' : 'Records'}</h2>
            <p className="text-muted-foreground text-sm mt-1.5">{canViewAll ? 'Track and manage employee attendance.' : 'Your personal attendance history.'}</p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          {canViewAll && viewMode === 'calendar' && (
            <div className="flex items-center gap-2 bg-white border border-slate-200 rounded-full pl-2 pr-1 h-11">
              <div className="bg-[#eaf6e6] rounded-full p-1.5">
                <Users className="w-4 h-4 text-[#256c1d]" />
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

          {canViewAll && user?.role !== 'ceo' && user?.role !== 'general_manager' && user?.role !== 'branch_manager' && (
            <Button variant="outline" onClick={() => setExportDialogOpen(true)} className="rounded-full bg-white border-slate-200 hover:bg-[#eaf6e6] h-11 px-5 gap-2 text-sm font-semibold">
              <Download className="w-4 h-4 text-[#256c1d]" /> Download Report
            </Button>
          )}

          <Dialog open={exportDialogOpen} onOpenChange={setExportDialogOpen}>
            <DialogContent className="max-w-md wizard-form border-0 rounded-[2rem] overflow-hidden p-0 bg-white max-h-[90vh] flex flex-col" style={{ fontFamily: "Urbanist, ui-sans-serif, system-ui, sans-serif" }}>
              <div className="bg-[#f4f6f3] p-6 border-b border-slate-100 flex items-center gap-3 shrink-0">
                <div className="w-11 h-11 bg-white rounded-2xl text-[#256c1d] flex items-center justify-center">
                  <FileSpreadsheet className="w-5 h-5" />
                </div>
                <div>
                  <DialogTitle className="text-xl font-semibold tracking-tight">Download Report</DialogTitle>
                  <p className="text-sm text-muted-foreground mt-0.5">Export attendance records to Excel.</p>
                </div>
              </div>
              <div className="p-6 space-y-5 overflow-y-auto">
                <div className="space-y-2">
                  <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Employee</Label>
                  <Select value={exportEmployeeId} onValueChange={setExportEmployeeId}>
                    <SelectTrigger className="rounded-xl h-11">
                      <SelectValue placeholder="Select an employee" />
                    </SelectTrigger>
                    <SelectContent className="rounded-xl">
                      <SelectItem value="all">All Employees</SelectItem>
                      {employees.map(emp => (
                        <SelectItem key={emp.id} value={emp.id.toString()}>{emp.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Period Type</Label>
                  <Select value={exportPeriod} onValueChange={(val: any) => setExportPeriod(val)}>
                    <SelectTrigger className="rounded-xl h-11">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="rounded-xl">
                      <SelectItem value="month">Full Month</SelectItem>
                      <SelectItem value="date">Specific Date</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {exportPeriod === 'date' ? (
                  <div className="space-y-2">
                    <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Date</Label>
                    <Input type="date" className="rounded-xl h-11" value={exportDate} onChange={(e) => setExportDate(e.target.value)} />
                  </div>
                ) : (
                  <div className="space-y-2">
                    <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Month</Label>
                    <Input type="month" className="rounded-xl h-11" value={exportMonth} onChange={(e) => setExportMonth(e.target.value)} />
                  </div>
                )}

                {mayViewPayroll && (
                  <p className="text-xs text-muted-foreground">
                    {exportPeriod === 'month'
                      ? 'Includes Total Deducted and Total Salary, worked out over the salary cycle for this month.'
                      : 'Salary deductions are included only in a monthly report.'}
                  </p>
                )}
                <div className="pt-2 flex justify-end gap-2">
                  <Button type="button" variant="ghost" className="rounded-xl" onClick={() => setExportDialogOpen(false)}>Cancel</Button>
                  <Button onClick={executeExport} disabled={exporting} className="rounded-xl px-6 gap-2">
                    {exporting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />} 
                    Export Data
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>

          {(mayCreate || mayEdit) && (
            <Dialog open={dialogOpen} onOpenChange={(open) => { setDialogOpen(open); if (!open) resetForm(); }}>
              {mayCreate && (
                <DialogTrigger asChild>
                  <Button className="rounded-full h-11 px-5 bg-[#8ae47e] hover:bg-[#7bd96f] text-[#0b1d14] font-semibold">
                    <Plus className="w-4 h-4 mr-2" /> Mark Attendance
                  </Button>
                </DialogTrigger>
              )}
              <DialogContent className="max-w-md wizard-form border-0 rounded-[2rem] overflow-hidden p-0 bg-white max-h-[90vh] flex flex-col" style={{ fontFamily: "Urbanist, ui-sans-serif, system-ui, sans-serif" }}>
                <div className="bg-[#f4f6f3] p-6 border-b border-slate-100 flex items-center gap-3 shrink-0">
                  <div className="w-11 h-11 bg-white rounded-2xl text-[#256c1d] flex items-center justify-center">
                    <Calendar className="w-5 h-5" />
                  </div>
                  <div>
                    <DialogTitle className="text-xl font-semibold tracking-tight">{editingId ? 'Edit Attendance' : 'Mark Attendance'}</DialogTitle>
                    <p className="text-sm text-muted-foreground mt-0.5">Manually record or edit an employee's punch.</p>
                  </div>
                </div>
                <form onSubmit={handleSubmit} className="p-6 space-y-5 overflow-y-auto">
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
                      <div className="relative">
                        <Input type="time" className="rounded-xl h-10 pr-8" value={formData.checkIn || ''} onChange={(e) => setFormData({...formData, checkIn: e.target.value})} />
                        {formData.checkIn && (
                          <button type="button" onClick={() => setFormData({...formData, checkIn: ''})} className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                            <X className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Check Out</Label>
                      <div className="relative">
                        <Input type="time" className="rounded-xl h-10 pr-8" value={formData.checkOut || ''} onChange={(e) => setFormData({...formData, checkOut: e.target.value})} />
                        {formData.checkOut && (
                          <button type="button" onClick={() => setFormData({...formData, checkOut: ''})} className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                            <X className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Late Minutes</Label>
                      <Input type="number" min="0" placeholder="0" className="rounded-xl h-10" value={formData.lateMinutes} onChange={(e) => setFormData({...formData, lateMinutes: e.target.value})} />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Early Exit Minutes</Label>
                      <Input type="number" min="0" placeholder="0" className="rounded-xl h-10" value={formData.earlyExitMinutes} onChange={(e) => setFormData({...formData, earlyExitMinutes: e.target.value})} />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Notes</Label>
                    <Input className="rounded-xl h-11" value={formData.notes} onChange={(e) => setFormData({...formData, notes: e.target.value})} placeholder="Optional notes" />
                  </div>
                  <div className="pt-2 flex justify-end gap-2">
                    <Button type="button" variant="ghost" className="rounded-full h-11 px-6" onClick={() => setDialogOpen(false)}>Cancel</Button>
                    <Button type="submit" className="rounded-full h-11 px-7 bg-[#8ae47e] hover:bg-[#7bd96f] text-[#0b1d14] font-semibold">Save Record</Button>
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
          isHR={mayEdit}
        />
      ) : (
        <Card className="rounded-3xl bg-white border border-slate-100 shadow-none overflow-hidden py-0 gap-0">
          <CardHeader className="flex flex-row items-center justify-between p-5 sm:p-6 border-b border-slate-100">
            <div className="flex items-center gap-4">
              <CardTitle className="text-lg font-semibold tracking-tight">Attendance Records</CardTitle>
              {viewMode === 'list' && (
                <div className="flex items-center gap-2 flex-wrap">
                  <Badge variant="outline" className="bg-amber-100 text-amber-700 border-0 font-semibold rounded-full px-3">
                    Late: {attendance.filter(r => r.isLate || r.status === 'late' || (r.lateMinutes || 0) > 0).length} {canViewAll && dateFilter ? 'Users' : 'Records'}
                  </Badge>
                  <Badge variant="outline" className="bg-[#f4f6f3] text-slate-600 border-0 font-semibold rounded-full px-3">
                    Early Exit: {attendance.filter(r => r.isEarlyExit || (r.earlyExitMinutes || 0) > 0).length} {canViewAll && dateFilter ? 'Users' : 'Records'}
                  </Badge>
                </div>
              )}
            </div>
            <Button variant="outline" onClick={() => setViewMode('calendar')} className="gap-2 rounded-full bg-white border-[#cfe9c9] text-[#256c1d] hover:bg-[#eaf6e6] h-10 text-sm font-semibold px-5">
              <Calendar className="w-4 h-4" /> Calendar View
            </Button>
          </CardHeader>
          
          {canViewAll && dateFilter && (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4 p-5 sm:p-6 border-b border-slate-100">
              <Card className="relative overflow-hidden rounded-3xl bg-[#f4f6f3] border-0 shadow-none py-0 gap-0">
                <CardContent className="p-5">
                  <p className="text-xs font-semibold text-slate-500 mb-1 flex items-center gap-2">
                    <Users className="w-3.5 h-3.5" /> Total Strength
                  </p>
                  <p className="text-3xl font-semibold tracking-tight text-slate-900 mt-2">{employees.length}</p>
                </CardContent>
              </Card>

              <Card className="relative overflow-hidden rounded-3xl bg-[#f4f6f3] border-0 shadow-none py-0 gap-0">
                <CardContent className="p-5">
                  <p className="text-xs font-semibold text-slate-500 mb-1 flex items-center gap-2">
                    <CheckCircle2 className="w-3.5 h-3.5 text-green-600" /> Present
                  </p>
                  <p className="text-3xl font-semibold tracking-tight text-slate-900 mt-2">{attendance.filter(r => r.status === 'present').length}</p>
                </CardContent>
              </Card>

              <Card className="relative overflow-hidden rounded-3xl bg-[#f4f6f3] border-0 shadow-none py-0 gap-0">
                <CardContent className="p-5">
                  <p className="text-xs font-semibold text-slate-500 mb-1 flex items-center gap-2">
                    <XCircle className="w-3.5 h-3.5 text-red-600" /> Absent
                  </p>
                  <p className="text-3xl font-semibold tracking-tight text-slate-900 mt-2">{attendance.filter(r => r.status === 'absent').length}</p>
                </CardContent>
              </Card>

              <Card className="relative overflow-hidden rounded-3xl bg-[#f4f6f3] border-0 shadow-none py-0 gap-0">
                <CardContent className="p-5">
                  <p className="text-xs font-semibold text-slate-500 mb-1 flex items-center gap-2">
                    <CalendarOff className="w-3.5 h-3.5 text-purple-600" /> On Leave
                  </p>
                  <p className="text-3xl font-semibold tracking-tight text-slate-900 mt-2">{attendance.filter(r => r.status === 'leave').length}</p>
                </CardContent>
              </Card>

              <Card className="relative overflow-hidden rounded-3xl bg-[#f4f6f3] border-0 shadow-none py-0 gap-0">
                <CardContent className="p-5">
                  <p className="text-xs font-semibold text-slate-500 mb-1 flex items-center gap-2">
                    <Clock className="w-3.5 h-3.5 text-yellow-600" /> Late Comers
                  </p>
                  <p className="text-3xl font-semibold tracking-tight text-slate-900 mt-2">
                    {attendance.filter(r => r.isLate || r.status === 'late' || (r.lateMinutes || 0) > 0).length}
                  </p>
                </CardContent>
              </Card>

              <Card className="relative overflow-hidden rounded-3xl bg-[#f4f6f3] border-0 shadow-none py-0 gap-0">
                <CardContent className="p-5">
                  <p className="text-xs font-semibold text-slate-500 mb-1 flex items-center gap-2">
                    <LogOut className="w-3.5 h-3.5 text-amber-600" /> Early Exits
                  </p>
                  <p className="text-3xl font-semibold tracking-tight text-slate-900 mt-2">
                    {attendance.filter(r => r.isEarlyExit || (r.earlyExitMinutes || 0) > 0).length}
                  </p>
                </CardContent>
              </Card>
            </div>
          )}

          <CardContent className="p-5 sm:p-6">
            {/* Filter bar */}
            <div className="flex flex-col sm:flex-row sm:flex-wrap items-start sm:items-center justify-between gap-4 mb-6 p-4 rounded-2xl bg-[#f4f6f3]">
              <div className="flex items-center gap-3">
                <div className="bg-white p-2 rounded-full">
                  <Calendar className="w-4 h-4 text-[#256c1d]" />
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="date"
                    value={dateFilter}
                    onChange={(e) => handleDateFilterChange(e.target.value)}
                    className="border border-transparent rounded-full px-4 py-1.5 text-sm bg-white focus:outline-none focus:ring-4 focus:ring-[#54b947]/20 h-10"
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
                  <span className="text-xs text-slate-500 font-semibold hidden md:inline">Status</span>
                  <Select value={statusFilter} onValueChange={handleStatusFilterChange}>
                    <SelectTrigger className="h-10 rounded-full border-transparent bg-white px-4 w-full sm:w-[140px] text-xs font-semibold">
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
                  <span className="text-xs text-slate-500 font-semibold hidden md:inline">Sort</span>
                  <Select value={sortOrder} onValueChange={(val: any) => setSortOrder(val)}>
                    <SelectTrigger className="h-10 rounded-full border-transparent bg-white px-4 w-full sm:w-[150px] text-xs font-semibold">
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
                {[1,2,3].map(i => <div key={i} className="h-20 bg-slate-100 rounded-2xl animate-pulse" />)}
              </div>
            ) : attendance.length === 0 ? (
              <div className="text-center py-14 px-4">
                <div className="bg-[#eaf6e6] text-[#256c1d] w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-3">
                  <Calendar className="w-6 h-6" />
                </div>
                <h3 className="text-lg font-semibold text-slate-900">No records found</h3>
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
                  .slice((safePage - 1) * recPageSize, safePage * recPageSize)
                  .map((record) => {
                  const recId = record.id;
                  const empName = record.employeeId?.name || record.employee?.name || record.user?.name || 'Unknown';
                  return (
                    <div key={recId} className="group relative overflow-hidden flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-5 rounded-2xl bg-[#f4f6f3] hover:bg-[#eef5ec] transition-colors">
                      {record.isLate ? (
                        <div className="absolute left-0 top-0 bottom-0 w-1 bg-yellow-500 rounded-l-2xl" />
                      ) : record.isEarlyExit ? (
                        <div className="absolute left-0 top-0 bottom-0 w-1 bg-amber-500 rounded-l-2xl" />
                      ) : null}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap mb-3">
                          <div className="font-semibold text-base text-slate-900 truncate">{empName}</div>
                          {getStatusBadge(record.status)}
                          {record.isLate && (record.lateMinutes || 0) > 0 && (
                            <Badge variant="outline" className="border-0 text-amber-700 bg-amber-100 text-[10px] font-semibold rounded-full">
                              Late: {record.lateMinutes}m
                            </Badge>
                          )}
                          {record.isEarlyExit && (record.earlyExitMinutes || 0) > 0 && (
                            <Badge variant="outline" className="border-0 text-slate-600 bg-white text-[10px] font-semibold rounded-full">
                              Early Exit: {record.earlyExitMinutes}m
                            </Badge>
                          )}
                        </div>
                        
                        <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-xs font-medium">
                          <div className="flex items-center text-slate-600 bg-white px-3 py-1.5 rounded-full">
                            <Calendar className="w-3.5 h-3.5 mr-1.5 text-foreground/70" />
                            {new Date(record.date).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })}
                          </div>
                          
                          <div className="flex items-center gap-2">
                            <div className="flex items-center gap-1.5 bg-white text-[#256c1d] px-3 py-1.5 rounded-full">
                              <span className="opacity-70 text-[10px] uppercase tracking-wider font-bold">In</span>
                              <span>{record.checkIn ? new Date(record.checkIn).toLocaleTimeString('en-US', {hour: '2-digit', minute:'2-digit', hour12: true}) : '--'}</span>
                              {record.checkInPhoto && (
                                <button onClick={() => { setSelectedPhoto(record.checkInPhoto); setPhotoViewerOpen(true); }} className="p-0.5 hover:bg-primary/20 rounded-md transition-colors ml-1" title="View Check-in Photo">
                                  <Camera className="w-3.5 h-3.5" />
                                </button>
                              )}
                            </div>
                            <span className="text-muted-foreground/50">→</span>
                            <div className="flex items-center gap-1.5 bg-white text-[#256c1d] px-3 py-1.5 rounded-full">
                              <span className="opacity-70 text-[10px] uppercase tracking-wider font-bold">Out</span>
                              <span>{record.checkOut ? new Date(record.checkOut).toLocaleTimeString('en-US', {hour: '2-digit', minute:'2-digit', hour12: true}) : '--'}</span>
                              {record.checkOutPhoto && (
                                <button onClick={() => { setSelectedPhoto(record.checkOutPhoto); setPhotoViewerOpen(true); }} className="p-0.5 hover:bg-primary/20 rounded-md transition-colors ml-1" title="View Check-out Photo">
                                  <Camera className="w-3.5 h-3.5" />
                                </button>
                              )}
                            </div>
                          </div>
                        </div>
                        {record.notes && (
                          <div className="mt-4 text-sm text-slate-600 bg-white p-3 rounded-2xl italic">
                            "{record.notes}"
                          </div>
                        )}
                      </div>
                      
                      {(mayEdit || mayDelete) && (
                        <div className="flex items-center justify-end gap-2 shrink-0">
                          {mayEdit && (
                            <Button variant="outline" size="sm" className="h-9 rounded-full border-slate-200 bg-white hover:bg-[#eaf6e6] gap-1.5 px-4" onClick={() => handleEdit(record)}>
                              <Edit className="w-3.5 h-3.5 text-muted-foreground" /> Edit
                            </Button>
                          )}
                          {mayDelete && recId && !isMockRecordId(recId) && (
                            <Button variant="outline" size="sm" className="h-9 rounded-full border-red-200 bg-white hover:bg-red-50 text-red-600 hover:text-red-700 gap-1.5 px-4" onClick={() => handleDelete(recId)}>
                              <Trash2 className="w-3.5 h-3.5" /> Delete
                            </Button>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
                <ListPagination total={validRecordCount} page={safePage} pageSize={recPageSize} onPageChange={setRecPage} onPageSizeChange={(n) => { setRecPageSize(n); setRecPage(1); }} />
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
