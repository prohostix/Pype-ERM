import { useState, useEffect } from 'react';
import { Calendar, List, ChevronLeft, ChevronRight, CheckCircle, Clock, LogIn, LogOut, Camera, MapPin, FileText } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import api from '@/lib/api';
import { toast } from 'sonner';

interface AttendanceCalendarProps {
  employeeId: string;
  employeeName: string;
  records: any[];
  holidays: any[];
  onRefresh: () => void;
  onToggleView: () => void;
  isHR: boolean;
}

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

const STATUS_LABELS: Record<string, { label: string; color: string }> = {
  present: { label: 'Present', color: 'bg-emerald-100 text-emerald-700 border-emerald-300' },
  late:    { label: 'Late Check-in', color: 'bg-amber-100 text-amber-700 border-amber-300' },
  absent:  { label: 'Absent', color: 'bg-rose-100 text-rose-700 border-rose-300' },
  half_day:{ label: 'Half Day', color: 'bg-orange-100 text-orange-700 border-orange-300' },
  leave:   { label: 'Paid Leave', color: 'bg-purple-100 text-purple-700 border-purple-300' },
};

function formatTime(isoString: string | null | undefined): string {
  if (!isoString) return '—';
  return new Date(isoString).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true });
}

function calcWorkingHours(checkIn: string | null, checkOut: string | null): string {
  if (!checkIn || !checkOut) return '—';
  const diff = (new Date(checkOut).getTime() - new Date(checkIn).getTime()) / 3600000;
  if (diff <= 0) return '—';
  const h = Math.floor(diff);
  const m = Math.round((diff - h) * 60);
  return `${h}h ${m}m`;
}

export function AttendanceCalendar({
  employeeId,
  employeeName,
  records,
  holidays,
  onRefresh,
  onToggleView,
  isHR
}: AttendanceCalendarProps) {
  const today = new Date();
  const [selectedYear, setSelectedYear] = useState<number>(today.getFullYear());
  const [selectedMonth, setSelectedMonth] = useState<number>(today.getMonth()); // 0-indexed
  const [loading, setLoading] = useState(false);
  const [workingDays, setWorkingDays] = useState<string[]>(['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday']);

  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const res = await api.get('/attendance/settings');
        if (res.data?.data?.officeHours?.workingDays) {
          setWorkingDays(res.data.data.officeHours.workingDays);
        }
      } catch (err) {
        console.error('Failed to fetch working days settings:', err);
      }
    };
    fetchSettings();
  }, []);

  // Detail/view modal (for all users)
  const [detailOpen, setDetailOpen] = useState(false);
  const [detailRecord, setDetailRecord] = useState<any>(null);

  // Edit modal (HR only)
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [selectedDayRecord, setSelectedDayRecord] = useState<any>(null);
  const [editForm, setEditForm] = useState({
    status: 'present',
    checkIn: '09:00',
    checkOut: '18:00',
    notes: ''
  });
  const [saving, setSaving] = useState(false);

  // Selfie lightbox
  const [selfieOpen, setSelfieOpen] = useState(false);
  const [selfieUrl, setSelfieUrl] = useState<string>('');

  // Generate years list
  const years = Array.from({ length: 7 }, (_, i) => today.getFullYear() - 3 + i);

  const totalDays = new Date(selectedYear, selectedMonth + 1, 0).getDate();
  const firstDayIndex = new Date(selectedYear, selectedMonth, 1).getDay();

  const calendarDays: any[] = [];
  for (let i = 0; i < firstDayIndex; i++) calendarDays.push(null);
  for (let day = 1; day <= totalDays; day++) {
    const currentDate = new Date(selectedYear, selectedMonth, day);
    const record = records.find(r => {
      const recDate = new Date(r.date);
      return recDate.getFullYear() === selectedYear &&
             recDate.getMonth() === selectedMonth &&
             recDate.getDate() === day;
    });
    calendarDays.push({ day, date: currentDate, record });
  }

  // Build a set of holiday dates for O(1) lookups: 'YYYY-MM-DD'
  const holidayDateSet = new Set(
    (holidays || []).map((h: any) => {
      const d = new Date(h.date);
      return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    })
  );

  const isHolidayDate = (date: Date): boolean => {
    const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
    return holidayDateSet.has(key);
  };

  const isWeekOff = (date: Date): boolean => {
    const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const dayName = days[date.getDay()];
    return !workingDays.includes(dayName);
  };

  const isPast = (date: Date): boolean => {
    const todayMidnight = new Date();
    todayMidnight.setHours(0, 0, 0, 0);
    return date < todayMidnight;
  };

  // Statistics — count absent for days with no record, past, not weekend, not holiday
  let presentCount = 0, lateCount = 0, absentCount = 0, halfDayCount = 0, leaveCount = 0, weekOffCount = 0, holidayCount = 0;
  for (let day = 1; day <= totalDays; day++) {
    const date = new Date(selectedYear, selectedMonth, day);
    const record = records.find(r => {
      const recDate = new Date(r.date);
      return recDate.getFullYear() === selectedYear && recDate.getMonth() === selectedMonth && recDate.getDate() === day;
    });

    if (record) {
      if (record.status === 'present') {
        if (record.isLate) lateCount++;
        else presentCount++;
      } else if (record.status === 'late' || record.isLate) lateCount++;
      else if (record.status === 'absent') absentCount++;
      else if (record.status === 'half_day') halfDayCount++;
      else if (record.status === 'leave') leaveCount++;
    } else if (isHolidayDate(date)) {
      holidayCount++;
    } else if (isWeekOff(date)) {
      weekOffCount++;
    } else if (isPast(date)) {
      // Workday in the past with no record → absent
      absentCount++;
    }
  }

  const handlePrevMonth = () => {
    if (selectedMonth === 0) { setSelectedMonth(11); setSelectedYear(prev => prev - 1); }
    else setSelectedMonth(prev => prev - 1);
  };
  const handleNextMonth = () => {
    if (selectedMonth === 11) { setSelectedMonth(0); setSelectedYear(prev => prev + 1); }
    else setSelectedMonth(prev => prev + 1);
  };

  const handleDayClick = (dayObj: any) => {
    if (!dayObj) return;
    const { day, record, date } = dayObj;

    if (isHR) {
      // HR → open edit modal
      setSelectedDayRecord({ day, date, record });
      setEditForm({
        status: record?.status || 'present',
        checkIn: record?.checkIn ? new Date(record.checkIn).toTimeString().slice(0, 5) : '09:00',
        checkOut: record?.checkOut ? new Date(record.checkOut).toTimeString().slice(0, 5) : '18:00',
        notes: record?.notes || ''
      });
      setEditDialogOpen(true);
    } else {
      // Employee → open read-only detail modal for:
      // - Days with a record
      // - Auto-absent days (past workday, no record)
      // - Holidays
      // Skip only future days and weekends with no record
      const skipClick = !record && !isHolidayDate(date) && (!isPast(date) || isWeekOff(date));
      if (skipClick) return;
      setDetailRecord({ day, date, record });
      setDetailOpen(true);
    }
  };

  const handleSaveDayAttendance = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedDayRecord) return;
    setSaving(true);
    try {
      const dateString = new Date(selectedYear, selectedMonth, selectedDayRecord.day).toISOString().split('T')[0];
      const toISO = (time: string) => time ? new Date(`${dateString}T${time}:00`).toISOString() : undefined;
      const payload: any = {
        employeeId,
        date: new Date(selectedYear, selectedMonth, selectedDayRecord.day).toISOString(),
        status: editForm.status,
        notes: editForm.notes
      };
      if (editForm.checkIn) payload.checkIn = toISO(editForm.checkIn);
      if (editForm.checkOut) payload.checkOut = toISO(editForm.checkOut);

      if (selectedDayRecord.record?.id) {
        await api.put(`/hr/attendance/${selectedDayRecord.record.id}`, payload);
      } else {
        await api.post('/hr/attendance', payload);
      }
      toast.success(`Attendance updated for ${MONTHS[selectedMonth]} ${selectedDayRecord.day}`);
      setEditDialogOpen(false);
      onRefresh();
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to update attendance');
    } finally {
      setSaving(false);
    }
  };

  const handleMarkAllPresent = async () => {
    if (!confirm(`Mark all weekdays in ${MONTHS[selectedMonth]} ${selectedYear} as Present for ${employeeName}?`)) return;
    setLoading(true);
    try {
      const promises = [];
      for (let day = 1; day <= totalDays; day++) {
        const date = new Date(selectedYear, selectedMonth, day);
        if (isWeekOff(date)) continue;
        const hasRecord = records.some(r => {
          const recDate = new Date(r.date);
          return recDate.getFullYear() === selectedYear && recDate.getMonth() === selectedMonth && recDate.getDate() === day;
        });
        if (!hasRecord) {
          const dateString = date.toISOString().split('T')[0];
          promises.push(api.post('/hr/attendance', {
            employeeId, date: date.toISOString(), status: 'present',
            checkIn: new Date(`${dateString}T09:00:00`).toISOString(),
            checkOut: new Date(`${dateString}T18:00:00`).toISOString(),
            notes: 'Bulk marked present'
          }));
        }
      }
      if (promises.length === 0) { toast.info('All weekdays already have attendance.'); return; }
      await Promise.all(promises);
      toast.success(`Marked ${promises.length} weekdays present!`);
      onRefresh();
    } catch (err: any) {
      toast.error('Failed to mark weekdays present');
    } finally {
      setLoading(false);
    }
  };

  const getDayColor = (dayObj: any) => {
    if (!dayObj) return 'bg-transparent border-transparent';
    const { date, record } = dayObj;

    if (record) {
      switch (record.status) {
        case 'present':
        case 'late':   return 'bg-emerald-500 text-white hover:bg-emerald-600';
        case 'absent': return 'bg-rose-500 text-white hover:bg-rose-600';
        case 'half_day': return 'bg-amber-500 text-white hover:bg-amber-600';
        case 'leave':  return 'bg-purple-500 text-white hover:bg-purple-600';
        default:       return 'bg-slate-500 text-white';
      }
    }

    // No record — determine by date type
    if (isHolidayDate(date)) return 'bg-orange-400 text-white hover:bg-orange-500';   // Holiday
    if (isWeekOff(date)) return 'bg-slate-400 dark:bg-slate-600 text-white hover:opacity-90'; // Weekend
    if (isPast(date)) return 'bg-rose-500 text-white hover:bg-rose-600'; // Auto-absent: workday, no record
    return 'bg-slate-100 dark:bg-slate-800/40 text-muted-foreground border border-border hover:bg-muted'; // Future
  };

  const resolvePhotoUrl = (url: string | null | undefined): string | null => {
    if (!url) return null;
    return api.getFileUrl(url);
  };

  return (
    <Card className="border border-slate-200/60 dark:border-slate-800/60 shadow-xl rounded-2xl bg-card/60 backdrop-blur-xl overflow-hidden">
      <CardHeader className="flex flex-col sm:flex-row items-center justify-between p-5 sm:p-6 border-b border-border/40 bg-muted/20 gap-4">
        <div className="flex items-center gap-3 w-full sm:w-auto">
          <div className="p-3 bg-primary/10 rounded-2xl shrink-0">
            <Calendar className="w-6 h-6 text-primary" />
          </div>
          <div>
            <CardTitle className="text-xl font-bold">Month-wise Calendar</CardTitle>
            <div className="text-xs text-muted-foreground mt-1 flex flex-wrap items-center gap-2">
              <span className="font-bold text-foreground bg-background px-2 py-0.5 rounded-md shadow-sm border border-border/50">{employeeName}</span>
              <span className="hidden sm:inline">•</span>
              <span>{isHR ? 'Click any day to edit' : 'Click any day to view details'}</span>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-end gap-3 w-full sm:w-auto">
          <div className="flex items-center gap-1.5 bg-background border border-slate-200/50 dark:border-slate-800/50 rounded-xl p-1 shadow-sm">
            <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg hover:bg-muted" onClick={handlePrevMonth}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Select value={selectedMonth.toString()} onValueChange={(val) => setSelectedMonth(parseInt(val))}>
              <SelectTrigger className="h-8 border-none bg-transparent shadow-none focus:ring-0 w-[110px] text-xs font-bold px-2">
                <SelectValue placeholder="Month" />
              </SelectTrigger>
              <SelectContent className="rounded-xl">
                {MONTHS.map((m, idx) => (
                  <SelectItem key={m} value={idx.toString()} className="text-xs">{m}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={selectedYear.toString()} onValueChange={(val) => setSelectedYear(parseInt(val))}>
              <SelectTrigger className="h-8 border-none bg-transparent shadow-none focus:ring-0 w-[80px] text-xs font-bold px-2">
                <SelectValue placeholder="Year" />
              </SelectTrigger>
              <SelectContent className="rounded-xl">
                {years.map(y => (
                  <SelectItem key={y} value={y.toString()} className="text-xs">{y}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg hover:bg-muted" onClick={handleNextMonth}>
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>

          <div className="flex items-center gap-2">
            {isHR && (
              <Button variant="outline" size="sm" className="h-10 rounded-xl shadow-sm text-xs font-semibold gap-1.5 px-4"
                onClick={handleMarkAllPresent} disabled={loading}>
                <CheckCircle className="w-4 h-4 text-primary" /> Mark Weekdays
              </Button>
            )}
            <Button variant="outline" size="sm" className="h-10 rounded-xl shadow-sm text-xs font-semibold gap-1.5 px-4 transition-transform hover:scale-105" onClick={onToggleView}>
              <List className="w-4 h-4 text-primary" /> List View
            </Button>
          </div>
        </div>
      </CardHeader>

      <CardContent className="p-5 sm:p-6 space-y-8">
        {/* Summary KPIs */}
        <div className="grid grid-cols-2 md:grid-cols-7 gap-3">
          {[
            { label: 'Present', count: presentCount, color: 'emerald' },
            { label: 'Late', count: lateCount, color: 'yellow' },
            { label: 'Absent', count: absentCount, color: 'rose' },
            { label: 'Half Day', count: halfDayCount, color: 'amber' },
            { label: 'Paid Leave', count: leaveCount, color: 'purple' },
            { label: 'Holiday', count: holidayCount, color: 'orange' },
            { label: 'Week Off', count: weekOffCount, color: 'slate' },
          ].map(({ label, count, color }) => (
            <div key={label} className={`flex flex-col justify-center items-center gap-1.5 p-3 rounded-2xl border border-${color}-500/20 bg-background/50 hover:bg-${color}-500/5 shadow-sm transition-colors text-center`}>
              <span className="text-[10px] uppercase font-bold text-muted-foreground tracking-widest">{label}</span>
              <span className={`text-3xl font-black text-${color}-600 dark:text-${color}-400 leading-none`}>{count}</span>
            </div>
          ))}
        </div>

        {/* Calendar Grid */}
        <div className="rounded-3xl p-5 bg-muted/30 border border-slate-200/60 dark:border-slate-800/60 shadow-inner">
          <div className="grid grid-cols-7 gap-2 text-center text-[11px] font-bold text-muted-foreground uppercase tracking-widest pb-3 border-b border-border/40">
            {['Sun','Mon','Tue','Wed','Thu','Fri','Sat'].map(d => <div key={d}>{d}</div>)}
          </div>
          <div className="grid grid-cols-7 gap-3 mt-4">
            {calendarDays.map((dayObj, index) => {
              if (dayObj === null) return <div key={`empty-${index}`} className="aspect-square" />;
              const formattedDay = dayObj.day < 10 ? `0${dayObj.day}` : dayObj.day.toString();
              const isWeekend = isWeekOff(dayObj.date);
              const hasInPhoto = !!dayObj.record?.checkInPhoto;
              const hasOutPhoto = !!dayObj.record?.checkOutPhoto;
              const isClickable = !!dayObj.record || (isHR && !isWeekend);
              return (
                <button
                  key={`day-${dayObj.day}`}
                  className={`aspect-square rounded-2xl flex flex-col items-center justify-center font-black text-sm sm:text-base transition-all shadow-sm border ${getDayColor(dayObj)} ${isClickable ? 'cursor-pointer hover:-translate-y-0.5 hover:shadow-md' : 'cursor-default'}`}
                  onClick={() => handleDayClick(dayObj)}
                  title={dayObj.record?.notes ? `Notes: ${dayObj.record.notes}` : undefined}
                >
                  <span>{formattedDay}</span>
                  {dayObj.record?.isLate && (
                    <span className="w-1.5 h-1.5 bg-yellow-300 rounded-full mt-1 shadow-sm" title="Late Check-in" />
                  )}
                  {(hasInPhoto || hasOutPhoto) && (
                    <Camera className="w-3 h-3 mt-1 opacity-80" title="Selfie attached" />
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Legend */}
        <div className="flex flex-wrap justify-center sm:justify-start gap-4 text-[11px] font-medium text-muted-foreground bg-background/50 p-3 rounded-2xl border border-border/40 shadow-sm">
          <span className="flex items-center gap-1.5"><span className="w-3.5 h-3.5 rounded-md bg-emerald-500 shadow-sm" />Present / Late</span>
          <span className="flex items-center gap-1.5"><span className="w-3.5 h-3.5 rounded-md bg-rose-500 shadow-sm" />Absent</span>
          <span className="flex items-center gap-1.5"><span className="w-3.5 h-3.5 rounded-md bg-amber-500 shadow-sm" />Half Day</span>
          <span className="flex items-center gap-1.5"><span className="w-3.5 h-3.5 rounded-md bg-purple-500 shadow-sm" />Leave</span>
          <span className="flex items-center gap-1.5"><span className="w-3.5 h-3.5 rounded-md bg-orange-400 shadow-sm" />Holiday</span>
          <span className="flex items-center gap-1.5"><span className="w-3.5 h-3.5 rounded-md bg-slate-400 shadow-sm" />Week Off</span>
          <span className="flex items-center gap-1.5"><Camera className="w-3.5 h-3.5 text-muted-foreground" />Selfie attached</span>
        </div>
      </CardContent>

      {/* ─── Day Detail Modal (all users) ─── */}
      <Dialog open={detailOpen} onOpenChange={setDetailOpen}>
        <DialogContent className="max-w-md border-0 shadow-2xl rounded-3xl overflow-hidden p-0">
          <div className="bg-primary/5 p-6 border-b border-primary/10 flex items-center gap-3">
            <div className="p-2.5 bg-primary/10 rounded-2xl text-primary">
              <Calendar className="w-5 h-5" />
            </div>
            <div>
              <DialogTitle className="text-xl font-bold">
                {detailRecord?.date
                  ? new Date(detailRecord.date).toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'short', year: 'numeric' })
                  : ''}
              </DialogTitle>
              <p className="text-sm text-muted-foreground mt-0.5">Daily attendance details</p>
            </div>
          </div>

          <div className="p-6">
            {detailRecord?.record ? (
              <div className="space-y-5">
                {/* Status badge */}
                <div className="flex items-center gap-3 bg-muted/30 p-3 rounded-2xl border border-border/40">
                  <span className="text-xs text-muted-foreground font-bold uppercase tracking-wider">Status</span>
                  <Badge className={`text-[10px] uppercase font-bold tracking-wider px-2.5 py-0.5 rounded-full shadow-sm ${STATUS_LABELS[detailRecord.record.status]?.color || 'bg-slate-100 text-slate-700'}`}>
                    {STATUS_LABELS[detailRecord.record.status]?.label || detailRecord.record.status}
                  </Badge>
                  {detailRecord.record.isLate && (
                    <Badge className="text-[10px] uppercase font-bold tracking-wider px-2.5 py-0.5 rounded-full bg-red-100 text-red-700 border-red-200 shadow-sm">Late</Badge>
                  )}
                </div>

                {/* Punch times */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="p-4 rounded-2xl border bg-emerald-50 dark:bg-emerald-900/10 border-emerald-200 dark:border-emerald-800 shadow-sm relative overflow-hidden">
                    <div className="absolute -right-4 -top-4 opacity-5">
                      <LogIn className="w-20 h-20" />
                    </div>
                    <div className="flex items-center gap-2 text-emerald-700 dark:text-emerald-400 mb-2">
                      <LogIn className="w-4 h-4" />
                      <span className="text-[10px] font-bold uppercase tracking-widest">Punch In</span>
                    </div>
                    <span className="text-xl font-black text-emerald-700 dark:text-emerald-300">
                      {formatTime(detailRecord.record.checkIn)}
                    </span>
                  </div>
                  <div className="p-4 rounded-2xl border bg-rose-50 dark:bg-rose-900/10 border-rose-200 dark:border-rose-800 shadow-sm relative overflow-hidden">
                    <div className="absolute -right-4 -top-4 opacity-5">
                      <LogOut className="w-20 h-20" />
                    </div>
                    <div className="flex items-center gap-2 text-rose-700 dark:text-rose-400 mb-2">
                      <LogOut className="w-4 h-4" />
                      <span className="text-[10px] font-bold uppercase tracking-widest">Punch Out</span>
                    </div>
                    <span className="text-xl font-black text-rose-700 dark:text-rose-300">
                      {formatTime(detailRecord.record.checkOut)}
                    </span>
                  </div>
                </div>

                {/* Working hours */}
                <div className="flex items-center gap-3 p-4 rounded-2xl border bg-blue-50 dark:bg-blue-900/10 border-blue-200 dark:border-blue-800 shadow-sm">
                  <div className="p-2 bg-blue-100 dark:bg-blue-900/40 rounded-xl">
                    <Clock className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                  </div>
                  <div className="flex-1">
                    <span className="text-[10px] font-bold uppercase tracking-widest text-blue-700/70 dark:text-blue-400/70 block">Working Hours</span>
                    <span className="text-lg font-black text-blue-700 dark:text-blue-300">
                      {calcWorkingHours(detailRecord.record.checkIn, detailRecord.record.checkOut)}
                    </span>
                  </div>
                </div>

                {/* Location info if available */}
                {(detailRecord.record.checkInLocation || detailRecord.record.checkOutLocation) && (
                  <div className="p-4 rounded-2xl border bg-muted/30 shadow-sm space-y-2">
                    <div className="flex items-center gap-2 font-bold text-xs uppercase tracking-wider text-muted-foreground mb-2">
                      <MapPin className="w-4 h-4" /> Location
                    </div>
                    {detailRecord.record.checkInLocation?.address && (
                      <div className="flex items-start gap-2 bg-background p-2.5 rounded-xl border border-border/50 text-xs">
                        <span className="font-bold text-emerald-600 shrink-0">IN:</span>
                        <span className="text-muted-foreground">{detailRecord.record.checkInLocation.address}</span>
                      </div>
                    )}
                    {detailRecord.record.checkOutLocation?.address && (
                      <div className="flex items-start gap-2 bg-background p-2.5 rounded-xl border border-border/50 text-xs">
                        <span className="font-bold text-rose-600 shrink-0">OUT:</span>
                        <span className="text-muted-foreground">{detailRecord.record.checkOutLocation.address}</span>
                      </div>
                    )}
                  </div>
                )}

                {/* Notes */}
                {detailRecord.record.notes && (
                  <div className="flex items-start gap-3 p-4 rounded-2xl border bg-yellow-500/5 border-yellow-500/20 text-sm shadow-sm">
                    <div className="p-1.5 bg-yellow-500/10 rounded-lg shrink-0">
                      <FileText className="w-4 h-4 text-yellow-600" />
                    </div>
                    <span className="text-yellow-800 dark:text-yellow-500/90 leading-relaxed font-medium pt-1 italic">"{detailRecord.record.notes}"</span>
                  </div>
                )}

                {/* Selfie photos */}
                {(detailRecord.record.checkInPhoto || detailRecord.record.checkOutPhoto) && (
                  <div className="space-y-3 pt-2">
                    <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-muted-foreground">
                      <Camera className="w-4 h-4" /> Selfie Attachments
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      {detailRecord.record.checkInPhoto && (
                        <div className="space-y-2">
                          <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-wider text-center bg-muted/50 py-1 rounded-md">Punch In Selfie</p>
                          <button
                            className="w-full overflow-hidden rounded-2xl border-2 border-border shadow-sm hover:border-primary/50 hover:shadow-md transition-all group"
                            onClick={() => { setSelfieUrl(resolvePhotoUrl(detailRecord.record.checkInPhoto) || ''); setSelfieOpen(true); }}
                          >
                            <img
                              src={resolvePhotoUrl(detailRecord.record.checkInPhoto) || ''}
                              alt="Punch-in selfie"
                              className="w-full h-32 object-cover group-hover:scale-105 transition-transform duration-500"
                              onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                            />
                          </button>
                        </div>
                      )}
                      {detailRecord.record.checkOutPhoto && (
                        <div className="space-y-2">
                          <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-wider text-center bg-muted/50 py-1 rounded-md">Punch Out Selfie</p>
                          <button
                            className="w-full overflow-hidden rounded-2xl border-2 border-border shadow-sm hover:border-primary/50 hover:shadow-md transition-all group"
                            onClick={() => { setSelfieUrl(resolvePhotoUrl(detailRecord.record.checkOutPhoto) || ''); setSelfieOpen(true); }}
                          >
                            <img
                              src={resolvePhotoUrl(detailRecord.record.checkOutPhoto) || ''}
                              alt="Punch-out selfie"
                              className="w-full h-32 object-cover group-hover:scale-105 transition-transform duration-500"
                              onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                            />
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="text-center py-12 px-6 rounded-2xl border-2 border-dashed border-border/50 bg-muted/10">
                {detailRecord && isHolidayDate(detailRecord.date) ? (
                  <div className="space-y-2">
                    <div className="text-4xl mb-3">🎉</div>
                    <p className="font-bold text-lg text-orange-600">
                      {holidays.find((h: any) => {
                        const hd = new Date(h.date);
                        return hd.getDate() === detailRecord.day &&
                               hd.getMonth() === detailRecord.date.getMonth() &&
                               hd.getFullYear() === detailRecord.date.getFullYear();
                      })?.name || 'Public Holiday'}
                    </p>
                    <p className="text-muted-foreground text-sm">This day is a designated holiday.</p>
                  </div>
                ) : detailRecord && isWeekOff(detailRecord.date) ? (
                  <div className="space-y-2">
                    <div className="text-4xl mb-3">😴</div>
                    <p className="font-bold text-lg text-slate-500">Weekend / Day Off</p>
                    <p className="text-muted-foreground text-sm">No attendance required today.</p>
                  </div>
                ) : detailRecord && isPast(detailRecord.date) ? (
                  <div className="space-y-2">
                    <div className="text-4xl mb-3">❌</div>
                    <p className="font-bold text-lg text-rose-600">Absent</p>
                    <p className="text-muted-foreground text-sm">No punch-in recorded for this working day.</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <Calendar className="w-10 h-10 text-muted-foreground opacity-30 mx-auto mb-3" />
                    <p className="font-bold text-lg">No Record</p>
                    <p className="text-muted-foreground text-sm">No attendance logged for this date.</p>
                  </div>
                )}
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* ─── Selfie Lightbox ─── */}
      <Dialog open={selfieOpen} onOpenChange={setSelfieOpen}>
        <DialogContent className="max-w-md border-0 shadow-2xl rounded-3xl p-1 bg-black/90 overflow-hidden">
          <img src={selfieUrl} alt="Selfie" className="w-full h-auto max-h-[80vh] rounded-2xl object-contain" />
        </DialogContent>
      </Dialog>

      {/* ─── HR Edit Day Attendance Dialog ─── */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="max-w-md border-0 shadow-2xl rounded-3xl overflow-hidden p-0">
          <div className="bg-primary/5 p-6 border-b border-primary/10 flex items-center gap-3">
            <div className="p-2.5 bg-primary/10 rounded-2xl text-primary">
              <Calendar className="w-5 h-5" />
            </div>
            <div>
              <DialogTitle className="text-xl font-bold">Edit Attendance</DialogTitle>
              <p className="text-sm text-muted-foreground mt-0.5">
                {selectedDayRecord?.date
                  ? new Date(selectedDayRecord.date).toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' })
                  : ''}
              </p>
            </div>
          </div>

          <div className="p-6">
            {/* If there's a record with selfies, show them in the edit modal too */}
            {selectedDayRecord?.record && (selectedDayRecord.record.checkInPhoto || selectedDayRecord.record.checkOutPhoto) && (
              <div className="flex gap-4 mb-6 bg-muted/30 p-3 rounded-2xl border border-border/40">
                {selectedDayRecord.record.checkInPhoto && (
                  <div className="flex-1 text-center space-y-1">
                    <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-widest">In Selfie</p>
                    <button onClick={() => { setSelfieUrl(resolvePhotoUrl(selectedDayRecord.record.checkInPhoto) || ''); setSelfieOpen(true); }} className="w-full">
                      <img src={resolvePhotoUrl(selectedDayRecord.record.checkInPhoto) || ''} alt="In selfie"
                        className="h-16 w-full object-cover rounded-xl border border-border shadow-sm hover:opacity-80 transition-opacity" />
                    </button>
                  </div>
                )}
                {selectedDayRecord.record.checkOutPhoto && (
                  <div className="flex-1 text-center space-y-1">
                    <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-widest">Out Selfie</p>
                    <button onClick={() => { setSelfieUrl(resolvePhotoUrl(selectedDayRecord.record.checkOutPhoto) || ''); setSelfieOpen(true); }} className="w-full">
                      <img src={resolvePhotoUrl(selectedDayRecord.record.checkOutPhoto) || ''} alt="Out selfie"
                        className="h-16 w-full object-cover rounded-xl border border-border shadow-sm hover:opacity-80 transition-opacity" />
                    </button>
                  </div>
                )}
              </div>
            )}

            <form onSubmit={handleSaveDayAttendance} className="space-y-5">
              <div className="space-y-2">
                <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Status</Label>
                <Select value={editForm.status} onValueChange={(val) => setEditForm(prev => ({ ...prev, status: val }))}>
                  <SelectTrigger className="w-full rounded-xl h-11 shadow-sm"><SelectValue placeholder="Select status" /></SelectTrigger>
                  <SelectContent className="rounded-xl">
                    <SelectItem value="present">Present</SelectItem>
                    <SelectItem value="absent">Absent</SelectItem>
                    <SelectItem value="half_day">Half Day</SelectItem>
                    <SelectItem value="leave">Leave / Paid Leave</SelectItem>
                    <SelectItem value="late">Late Check-in</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-4 bg-muted/20 p-4 rounded-2xl border border-border/40">
                <div className="space-y-2">
                  <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Check In</Label>
                  <Input type="time" value={editForm.checkIn}
                    onChange={e => setEditForm(prev => ({ ...prev, checkIn: e.target.value }))}
                    className="rounded-xl h-10 shadow-sm" />
                </div>
                <div className="space-y-2">
                  <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Check Out</Label>
                  <Input type="time" value={editForm.checkOut}
                    onChange={e => setEditForm(prev => ({ ...prev, checkOut: e.target.value }))}
                    className="rounded-xl h-10 shadow-sm" />
                </div>
              </div>
              <div className="space-y-2">
                <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Remarks / Notes</Label>
                <Input value={editForm.notes}
                  onChange={e => setEditForm(prev => ({ ...prev, notes: e.target.value }))}
                  placeholder="e.g. Work from home, client visit"
                  className="rounded-xl h-11 shadow-sm" />
              </div>
              <div className="flex justify-end gap-2 pt-4">
                <Button type="button" variant="ghost" className="rounded-xl" onClick={() => setEditDialogOpen(false)}>Cancel</Button>
                <Button type="submit" className="rounded-xl px-6 shadow-md" disabled={saving}>{saving ? 'Saving...' : 'Save Changes'}</Button>
              </div>
            </form>
          </div>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
