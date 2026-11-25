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
  present: { label: 'Present', color: 'bg-[#dff3da] text-[#256c1d] border-transparent' },
  late:    { label: 'Late Check-in', color: 'bg-amber-100 text-amber-700 border-transparent' },
  absent:  { label: 'Absent', color: 'bg-red-100 text-red-700 border-transparent' },
  half_day:{ label: 'Half Day', color: 'bg-orange-100 text-orange-700 border-transparent' },
  leave:   { label: 'Paid Leave', color: 'bg-violet-100 text-violet-700 border-transparent' },
  wfh:     { label: 'Work From Home', color: 'bg-sky-100 text-sky-700 border-transparent' },
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
  let presentCount = 0, lateCount = 0, absentCount = 0, halfDayCount = 0, leaveCount = 0, weekOffCount = 0, holidayCount = 0, wfhCount = 0;
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
      else if (record.status === 'wfh') wfhCount++;
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
        case 'late':   return 'bg-[#2fb344] text-white border-[#2fb344] hover:bg-[#28a03b]';
        case 'absent': return 'bg-[#f04444] text-white border-[#f04444] hover:bg-[#e03030]';
        case 'half_day': return 'bg-[#f59e0b] text-white border-[#f59e0b] hover:bg-[#e08e08]';
        case 'leave':  return 'bg-[#8b5cf6] text-white border-[#8b5cf6] hover:bg-[#7a49e8]';
        case 'wfh':    return 'bg-[#0ea5e9] text-white border-[#0ea5e9] hover:bg-[#0b95d6]';
        default:       return 'bg-slate-500 text-white border-slate-500';
      }
    }

    // No record — determine by date type
    if (isHolidayDate(date)) return 'bg-[#fb923c] text-white border-[#fb923c] hover:bg-[#f27f22]';   // Holiday
    if (isWeekOff(date)) return 'bg-[#94a3b8] text-white border-[#94a3b8] hover:bg-[#8393ab]'; // Weekend
    if (isPast(date)) return 'bg-[#f04444] text-white border-[#f04444] hover:bg-[#e03030]'; // Auto-absent: workday, no record
    return 'bg-white text-slate-500 border-slate-200 hover:bg-[#f4f6f3]'; // Future
  };

  const resolvePhotoUrl = (url: string | null | undefined): string | null => {
    if (!url) return null;
    return api.getFileUrl(url);
  };

  return (
    <Card className="bg-transparent border-0 shadow-none py-0 gap-6 hover:shadow-none">
      <CardHeader className="flex flex-col sm:flex-row items-center justify-between px-0 py-0 gap-4">
        <div className="flex items-center gap-3 w-full sm:w-auto">
          <div>
            <CardTitle className="text-xl font-semibold tracking-tight">Month-wise Calendar</CardTitle>
            <div className="text-xs text-muted-foreground mt-1.5 flex flex-wrap items-center gap-2">
              <span className="font-semibold text-[#256c1d] bg-[#eaf6e6] px-2.5 py-0.5 rounded-full">{employeeName}</span>
              <span className="hidden sm:inline">•</span>
              <span>{isHR ? 'Click any day to edit' : 'Click any day to view details'}</span>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-end gap-3 w-full sm:w-auto">
          <div className="flex items-center gap-1 bg-white border border-slate-200 rounded-full p-1">
            <Button variant="ghost" size="icon" className="h-9 w-9 rounded-full hover:bg-[#eaf6e6]" onClick={handlePrevMonth}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Select value={selectedMonth.toString()} onValueChange={(val) => setSelectedMonth(parseInt(val))}>
              <SelectTrigger className="h-9 border-none bg-transparent shadow-none focus:ring-0 w-[110px] text-sm font-semibold px-2">
                <SelectValue placeholder="Month" />
              </SelectTrigger>
              <SelectContent className="rounded-xl">
                {MONTHS.map((m, idx) => (
                  <SelectItem key={m} value={idx.toString()} className="text-xs">{m}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={selectedYear.toString()} onValueChange={(val) => setSelectedYear(parseInt(val))}>
              <SelectTrigger className="h-9 border-none bg-transparent shadow-none focus:ring-0 w-[84px] text-sm font-semibold px-2">
                <SelectValue placeholder="Year" />
              </SelectTrigger>
              <SelectContent className="rounded-xl">
                {years.map(y => (
                  <SelectItem key={y} value={y.toString()} className="text-xs">{y}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button variant="ghost" size="icon" className="h-9 w-9 rounded-full hover:bg-[#eaf6e6]" onClick={handleNextMonth}>
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>

          <div className="flex items-center gap-2">
            {isHR && (
              <Button variant="outline" className="h-11 rounded-full bg-white border-slate-200 hover:bg-[#eaf6e6] text-sm font-semibold gap-1.5 px-5"
                onClick={handleMarkAllPresent} disabled={loading}>
                <CheckCircle className="w-4 h-4 text-[#256c1d]" /> Mark Weekdays
              </Button>
            )}
            <Button variant="outline" className="h-11 rounded-full bg-white border-[#cfe9c9] text-[#256c1d] hover:bg-[#eaf6e6] text-sm font-semibold gap-1.5 px-5" onClick={onToggleView}>
              <List className="w-4 h-4" /> List View
            </Button>
          </div>
        </div>
      </CardHeader>

      <CardContent className="px-0 py-0 space-y-6">
        {/* Summary KPIs */}
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-3">
          {[
            { label: 'Present', count: presentCount, num: 'text-[#256c1d]', dot: 'bg-[#54b947]' },
            { label: 'Late', count: lateCount, num: 'text-amber-600', dot: 'bg-amber-400' },
            { label: 'Absent', count: absentCount, num: 'text-red-600', dot: 'bg-red-400' },
            { label: 'Half Day', count: halfDayCount, num: 'text-amber-600', dot: 'bg-amber-400' },
            { label: 'Paid Leave', count: leaveCount, num: 'text-violet-600', dot: 'bg-violet-400' },
            { label: 'WFH', count: wfhCount, num: 'text-sky-600', dot: 'bg-sky-400' },
            { label: 'Holiday', count: holidayCount, num: 'text-orange-600', dot: 'bg-orange-400' },
            { label: 'Week Off', count: weekOffCount, num: 'text-slate-600', dot: 'bg-slate-400' },
          ].map(({ label, count, num, dot }) => (
            <div key={label} className="flex flex-col gap-2 p-4 rounded-2xl bg-[#f4f6f3]">
              <span className="flex items-center gap-1.5 text-xs font-medium text-slate-500"><span className={`w-2 h-2 rounded-full ${dot}`} />{label}</span>
              <span className={`text-3xl font-semibold tracking-tight leading-none ${num}`}>{count}</span>
            </div>
          ))}
        </div>

        {/* Calendar Grid */}
        <div className="rounded-3xl p-4 sm:p-6 bg-[#f4f6f3]">
          <div className="grid grid-cols-7 gap-2 text-center text-[11px] font-semibold text-slate-500 uppercase tracking-widest pb-3">
            {['Sun','Mon','Tue','Wed','Thu','Fri','Sat'].map(d => <div key={d}>{d}</div>)}
          </div>
          <div className="grid grid-cols-7 gap-2 sm:gap-3 mt-2">
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
                  className={`aspect-square rounded-2xl flex flex-col items-center justify-center font-semibold text-sm sm:text-base transition-all border ${getDayColor(dayObj)} ${isClickable ? 'cursor-pointer hover:-translate-y-0.5' : 'cursor-default'}`}
                  onClick={() => handleDayClick(dayObj)}
                  title={dayObj.record?.notes ? `Notes: ${dayObj.record.notes}` : undefined}
                >
                  <span>{formattedDay}</span>
                  {dayObj.record?.isLate && (
                    <span className="w-1.5 h-1.5 bg-yellow-300 rounded-full mt-1" title="Late Check-in" />
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
        <div className="flex flex-wrap justify-center sm:justify-start gap-x-5 gap-y-2 text-xs font-medium text-slate-600">
          <span className="flex items-center gap-2"><span className="w-4 h-4 rounded-md bg-[#2fb344]" />Present / Late</span>
          <span className="flex items-center gap-2"><span className="w-4 h-4 rounded-md bg-[#f04444]" />Absent</span>
          <span className="flex items-center gap-2"><span className="w-4 h-4 rounded-md bg-[#f59e0b]" />Half Day</span>
          <span className="flex items-center gap-2"><span className="w-4 h-4 rounded-md bg-[#8b5cf6]" />Leave</span>
          <span className="flex items-center gap-2"><span className="w-4 h-4 rounded-md bg-[#0ea5e9]" />WFH</span>
          <span className="flex items-center gap-2"><span className="w-4 h-4 rounded-md bg-[#fb923c]" />Holiday</span>
          <span className="flex items-center gap-2"><span className="w-4 h-4 rounded-md bg-[#94a3b8]" />Week Off</span>
          <span className="flex items-center gap-2"><Camera className="w-3.5 h-3.5 text-slate-500" />Selfie attached</span>
        </div>
      </CardContent>

      {/* ─── Day Detail Modal (all users) ─── */}
      <Dialog open={detailOpen} onOpenChange={setDetailOpen}>
        <DialogContent className="wizard-form max-w-md border-0 rounded-[2rem] overflow-hidden p-0 bg-white" style={{ fontFamily: "Urbanist, ui-sans-serif, system-ui, sans-serif" }}>
          <div className="bg-[#f4f6f3] p-6 border-b border-slate-100 flex items-center gap-3">
            <div className="w-11 h-11 bg-white rounded-2xl text-[#256c1d] flex items-center justify-center">
              <Calendar className="w-5 h-5" />
            </div>
            <div>
              <DialogTitle className="text-xl font-semibold tracking-tight">
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
                <div className="flex items-center gap-3 bg-[#f4f6f3] p-3.5 rounded-2xl">
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
                  <div className="p-4 rounded-2xl bg-[#eaf6e6] relative overflow-hidden">
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
                  <div className="p-4 rounded-2xl bg-red-50 relative overflow-hidden">
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
                <div className="flex items-center gap-3 p-4 rounded-2xl bg-sky-50">
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
                  <div className="p-4 rounded-2xl bg-[#f4f6f3] space-y-2">
                    <div className="flex items-center gap-2 font-bold text-xs uppercase tracking-wider text-muted-foreground mb-2">
                      <MapPin className="w-4 h-4" /> Location
                    </div>
                    {detailRecord.record.checkInLocation?.address && (
                      <div className="flex items-start gap-2 bg-white p-2.5 rounded-xl text-xs">
                        <span className="font-bold text-emerald-600 shrink-0">IN:</span>
                        <span className="text-muted-foreground">{detailRecord.record.checkInLocation.address}</span>
                      </div>
                    )}
                    {detailRecord.record.checkOutLocation?.address && (
                      <div className="flex items-start gap-2 bg-white p-2.5 rounded-xl text-xs">
                        <span className="font-bold text-rose-600 shrink-0">OUT:</span>
                        <span className="text-muted-foreground">{detailRecord.record.checkOutLocation.address}</span>
                      </div>
                    )}
                  </div>
                )}

                {/* Notes */}
                {detailRecord.record.notes && (
                  <div className="flex items-start gap-3 p-4 rounded-2xl bg-amber-50 text-sm">
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
                            className="w-full overflow-hidden rounded-2xl border-2 border-transparent hover:border-[#8ae47e] transition-all group"
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
                            className="w-full overflow-hidden rounded-2xl border-2 border-transparent hover:border-[#8ae47e] transition-all group"
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
              <div className="text-center py-12 px-6 rounded-2xl bg-[#f4f6f3]">
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
        <DialogContent className="max-w-md border-0 rounded-[2rem] p-1 bg-black/90 overflow-hidden">
          <img src={selfieUrl} alt="Selfie" className="w-full h-auto max-h-[80vh] rounded-2xl object-contain" />
        </DialogContent>
      </Dialog>

      {/* ─── HR Edit Day Attendance Dialog ─── */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="wizard-form max-w-md border-0 rounded-[2rem] overflow-hidden p-0 bg-white" style={{ fontFamily: "Urbanist, ui-sans-serif, system-ui, sans-serif" }}>
          <div className="bg-[#f4f6f3] p-6 border-b border-slate-100 flex items-center gap-3">
            <div className="w-11 h-11 bg-white rounded-2xl text-[#256c1d] flex items-center justify-center">
              <Calendar className="w-5 h-5" />
            </div>
            <div>
              <DialogTitle className="text-xl font-semibold tracking-tight">Edit Attendance</DialogTitle>
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
              <div className="flex gap-4 mb-6 bg-[#f4f6f3] p-3 rounded-2xl">
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
                    <SelectItem value="wfh">Work From Home</SelectItem>
                    <SelectItem value="late">Late Check-in</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-4 bg-[#f4f6f3] p-4 rounded-2xl">
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
                <Button type="button" variant="ghost" className="rounded-full h-11 px-6" onClick={() => setEditDialogOpen(false)}>Cancel</Button>
                <Button type="submit" className="rounded-full h-11 px-7 bg-[#8ae47e] hover:bg-[#7bd96f] text-[#0b1d14] font-semibold" disabled={saving}>{saving ? 'Saving...' : 'Save Changes'}</Button>
              </div>
            </form>
          </div>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
