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

  const getApiBase = () => {
    return (import.meta as any).env?.VITE_API_URL || '';
  };

  const resolvePhotoUrl = (url: string | null | undefined): string | null => {
    if (!url) return null;
    if (url.startsWith('http')) return url;
    
    const baseUrl = getApiBase();
    
    let origin = '';
    let apiPath = baseUrl;
    
    if (baseUrl.startsWith('http')) {
      try {
        const parsed = new URL(baseUrl);
        origin = parsed.origin;
        apiPath = parsed.pathname;
      } catch (e) {}
    }
    
    if (apiPath && url.startsWith(apiPath)) {
      return origin ? `${origin}${url}` : url;
    }
    
    return `${baseUrl}${url}`;
  };

  return (
    <Card className="border-none shadow-xl bg-card/65 backdrop-blur-xl">
      <CardHeader className="flex flex-col sm:flex-row items-center justify-between pb-6 border-b border-border/40 gap-4">
        <div>
          <CardTitle className="text-xl font-bold flex items-center gap-2">
            <Calendar className="w-5 h-5 text-primary" /> Month-wise Attendance Calendar
          </CardTitle>
          <div className="text-xs text-muted-foreground mt-1 flex items-center gap-2">
            <span className="font-bold text-foreground">{employeeName}</span>
            <span>•</span>
            <span>{isHR ? 'Click any day to edit' : 'Click any day to view details'}</span>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-1.5 bg-background border border-border rounded-lg px-2 py-1 shadow-sm">
            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={handlePrevMonth}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Select value={selectedMonth.toString()} onValueChange={(val) => setSelectedMonth(parseInt(val))}>
              <SelectTrigger className="h-7 border-none bg-transparent shadow-none focus:ring-0 w-[110px] text-xs font-bold">
                <SelectValue placeholder="Month" />
              </SelectTrigger>
              <SelectContent>
                {MONTHS.map((m, idx) => (
                  <SelectItem key={m} value={idx.toString()} className="text-xs">{m}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={selectedYear.toString()} onValueChange={(val) => setSelectedYear(parseInt(val))}>
              <SelectTrigger className="h-7 border-none bg-transparent shadow-none focus:ring-0 w-[80px] text-xs font-bold">
                <SelectValue placeholder="Year" />
              </SelectTrigger>
              <SelectContent>
                {years.map(y => (
                  <SelectItem key={y} value={y.toString()} className="text-xs">{y}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={handleNextMonth}>
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>

          <div className="flex items-center gap-2">
            {isHR && (
              <Button variant="outline" size="sm" className="h-9 text-xs font-semibold gap-1.5"
                onClick={handleMarkAllPresent} disabled={loading}>
                <CheckCircle className="w-3.5 h-3.5 text-primary" /> Mark Weekdays Present
              </Button>
            )}
            <Button variant="outline" size="sm" className="h-9 text-xs font-semibold gap-1.5" onClick={onToggleView}>
              <List className="w-3.5 h-3.5" /> List View
            </Button>
          </div>
        </div>
      </CardHeader>

      <CardContent className="pt-6 space-y-8">
        {/* Summary */}
        <div className="grid grid-cols-2 md:grid-cols-7 gap-4">
          {[
            { label: 'Present', count: presentCount, color: 'emerald' },
            { label: 'Late', count: lateCount, color: 'yellow' },
            { label: 'Absent', count: absentCount, color: 'rose' },
            { label: 'Half Day', count: halfDayCount, color: 'amber' },
            { label: 'Paid Leave', count: leaveCount, color: 'purple' },
            { label: 'Holiday', count: holidayCount, color: 'orange' },
            { label: 'Week Off', count: weekOffCount, color: 'slate' },
          ].map(({ label, count, color }) => (
            <div key={label} className={`flex items-center gap-3 p-3.5 rounded-xl border border-${color}-500/10 bg-${color}-500/5`}>
              <div className={`w-2.5 h-10 bg-${color}-${color === 'slate' ? '400' : '500'} dark:bg-${color}-${color === 'slate' ? '600' : '500'} rounded-full shrink-0`} />
              <div>
                <span className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider block">{label}</span>
                <span className={`text-2xl font-black text-${color}-600 dark:text-${color}-400 leading-none block mt-1`}>{count}</span>
              </div>
            </div>
          ))}
        </div>

        {/* Calendar Grid */}
        <div className="border border-border/80 rounded-xl p-4 bg-background/50">
          <div className="grid grid-cols-7 gap-2 text-center text-xs font-bold text-muted-foreground uppercase tracking-wider pb-3 border-b border-border/60">
            {['Sun','Mon','Tue','Wed','Thu','Fri','Sat'].map(d => <div key={d}>{d}</div>)}
          </div>
          <div className="grid grid-cols-7 gap-2 mt-3">
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
                  className={`aspect-square rounded-lg flex flex-col items-center justify-center font-bold text-sm transition-all shadow-sm ${getDayColor(dayObj)} ${isClickable ? 'cursor-pointer hover:scale-105 active:scale-95' : 'cursor-default'}`}
                  onClick={() => handleDayClick(dayObj)}
                  title={dayObj.record?.notes ? `Notes: ${dayObj.record.notes}` : undefined}
                >
                  <span>{formattedDay}</span>
                  {dayObj.record?.isLate && (
                    <span className="w-1.5 h-1.5 bg-red-400 rounded-full mt-0.5" title="Late Check-in" />
                  )}
                  {(hasInPhoto || hasOutPhoto) && (
                    <Camera className="w-2.5 h-2.5 mt-0.5 opacity-80" title="Selfie attached" />
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Legend */}
        <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
          <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-emerald-500 inline-block" />Present / Late</span>
          <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-rose-500 inline-block" />Absent</span>
          <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-amber-500 inline-block" />Half Day</span>
          <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-purple-500 inline-block" />Leave</span>
          <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-orange-400 inline-block" />Holiday</span>
          <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-slate-400 inline-block" />Week Off</span>
          <span className="flex items-center gap-1.5"><Camera className="w-3 h-3" />Selfie attached</span>
        </div>
      </CardContent>

      {/* ─── Day Detail Modal (all users) ─── */}
      <Dialog open={detailOpen} onOpenChange={setDetailOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base">
              <Calendar className="w-4 h-4 text-primary" />
              {detailRecord?.date
                ? new Date(detailRecord.date).toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
                : ''}
            </DialogTitle>
          </DialogHeader>

          {detailRecord?.record ? (
            <div className="space-y-4 pt-1">
              {/* Status badge */}
              <div className="flex items-center gap-2">
                <span className="text-xs text-muted-foreground font-medium uppercase tracking-wide">Status</span>
                <Badge className={`text-xs font-semibold border ${STATUS_LABELS[detailRecord.record.status]?.color || 'bg-slate-100 text-slate-700'}`}>
                  {STATUS_LABELS[detailRecord.record.status]?.label || detailRecord.record.status}
                </Badge>
                {detailRecord.record.isLate && (
                  <Badge className="text-xs bg-red-100 text-red-700 border-red-300">Late</Badge>
                )}
              </div>

              {/* Punch times */}
              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 rounded-xl border bg-emerald-50 dark:bg-emerald-900/20 border-emerald-200 dark:border-emerald-800">
                  <div className="flex items-center gap-1.5 text-emerald-700 dark:text-emerald-400 mb-1">
                    <LogIn className="w-3.5 h-3.5" />
                    <span className="text-[10px] font-bold uppercase tracking-wide">Punch In</span>
                  </div>
                  <span className="text-lg font-black text-emerald-700 dark:text-emerald-300">
                    {formatTime(detailRecord.record.checkIn)}
                  </span>
                </div>
                <div className="p-3 rounded-xl border bg-rose-50 dark:bg-rose-900/20 border-rose-200 dark:border-rose-800">
                  <div className="flex items-center gap-1.5 text-rose-700 dark:text-rose-400 mb-1">
                    <LogOut className="w-3.5 h-3.5" />
                    <span className="text-[10px] font-bold uppercase tracking-wide">Punch Out</span>
                  </div>
                  <span className="text-lg font-black text-rose-700 dark:text-rose-300">
                    {formatTime(detailRecord.record.checkOut)}
                  </span>
                </div>
              </div>

              {/* Working hours */}
              <div className="flex items-center gap-2 p-3 rounded-xl border bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800">
                <Clock className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                <span className="text-xs font-bold uppercase tracking-wide text-blue-700 dark:text-blue-400">Working Hours</span>
                <span className="ml-auto font-black text-blue-700 dark:text-blue-300">
                  {calcWorkingHours(detailRecord.record.checkIn, detailRecord.record.checkOut)}
                </span>
              </div>

              {/* Location info if available */}
              {(detailRecord.record.checkInLocation || detailRecord.record.checkOutLocation) && (
                <div className="p-3 rounded-xl border bg-muted/40 text-xs space-y-1">
                  <div className="flex items-center gap-1.5 font-semibold text-muted-foreground mb-1">
                    <MapPin className="w-3.5 h-3.5" /> Location
                  </div>
                  {detailRecord.record.checkInLocation?.address && (
                    <p className="text-muted-foreground">In: {detailRecord.record.checkInLocation.address}</p>
                  )}
                  {detailRecord.record.checkOutLocation?.address && (
                    <p className="text-muted-foreground">Out: {detailRecord.record.checkOutLocation.address}</p>
                  )}
                </div>
              )}

              {/* Notes */}
              {detailRecord.record.notes && (
                <div className="flex items-start gap-2 p-3 rounded-xl border bg-muted/40 text-xs">
                  <FileText className="w-3.5 h-3.5 mt-0.5 text-muted-foreground shrink-0" />
                  <span className="text-muted-foreground">{detailRecord.record.notes}</span>
                </div>
              )}

              {/* Selfie photos */}
              {(detailRecord.record.checkInPhoto || detailRecord.record.checkOutPhoto) && (
                <div className="space-y-2">
                  <div className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wide text-muted-foreground">
                    <Camera className="w-3.5 h-3.5" /> Selfie Photos
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    {detailRecord.record.checkInPhoto && (
                      <div className="space-y-1">
                        <p className="text-[10px] text-muted-foreground font-semibold uppercase tracking-wide text-center">Punch In</p>
                        <button
                          className="w-full overflow-hidden rounded-lg border border-border hover:opacity-90 transition-opacity"
                          onClick={() => { setSelfieUrl(resolvePhotoUrl(detailRecord.record.checkInPhoto) || ''); setSelfieOpen(true); }}
                        >
                          <img
                            src={resolvePhotoUrl(detailRecord.record.checkInPhoto) || ''}
                            alt="Punch-in selfie"
                            className="w-full h-32 object-cover"
                            onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                          />
                        </button>
                      </div>
                    )}
                    {detailRecord.record.checkOutPhoto && (
                      <div className="space-y-1">
                        <p className="text-[10px] text-muted-foreground font-semibold uppercase tracking-wide text-center">Punch Out</p>
                        <button
                          className="w-full overflow-hidden rounded-lg border border-border hover:opacity-90 transition-opacity"
                          onClick={() => { setSelfieUrl(resolvePhotoUrl(detailRecord.record.checkOutPhoto) || ''); setSelfieOpen(true); }}
                        >
                          <img
                            src={resolvePhotoUrl(detailRecord.record.checkOutPhoto) || ''}
                            alt="Punch-out selfie"
                            className="w-full h-32 object-cover"
                            onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                          />
                        </button>
                      </div>
                    )}
                  </div>
                  <p className="text-[10px] text-muted-foreground text-center">Tap photo to enlarge</p>
                </div>
              )}
            </div>
          ) : (
            <div className="text-center py-8 text-sm">
              {detailRecord && isHolidayDate(detailRecord.date) ? (
                <div className="space-y-1">
                  <p className="text-2xl">🎉</p>
                  <p className="font-semibold text-orange-600">
                    {holidays.find((h: any) => {
                      const hd = new Date(h.date);
                      return hd.getDate() === detailRecord.day &&
                             hd.getMonth() === detailRecord.date.getMonth() &&
                             hd.getFullYear() === detailRecord.date.getFullYear();
                    })?.name || 'Public Holiday'}
                  </p>
                  <p className="text-muted-foreground text-xs">This day is a designated holiday</p>
                </div>
              ) : detailRecord && isWeekOff(detailRecord.date) ? (
                <div className="space-y-1">
                  <p className="text-2xl">😴</p>
                  <p className="font-semibold text-slate-500">Week Off</p>
                  <p className="text-muted-foreground text-xs">No attendance required on weekends</p>
                </div>
              ) : detailRecord && isPast(detailRecord.date) ? (
                <div className="space-y-1">
                  <p className="text-2xl">❌</p>
                  <p className="font-semibold text-rose-600">Absent</p>
                  <p className="text-muted-foreground text-xs">No punch-in recorded for this working day</p>
                </div>
              ) : (
                <p className="text-muted-foreground">No attendance record for this day.</p>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* ─── Selfie Lightbox ─── */}
      <Dialog open={selfieOpen} onOpenChange={setSelfieOpen}>
        <DialogContent className="max-w-sm p-2">
          <img src={selfieUrl} alt="Selfie" className="w-full rounded-lg object-contain max-h-[70vh]" />
        </DialogContent>
      </Dialog>

      {/* ─── HR Edit Day Attendance Dialog ─── */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-base">
              Edit Attendance: {selectedDayRecord?.date
                ? new Date(selectedDayRecord.date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
                : ''}
            </DialogTitle>
          </DialogHeader>

          {/* If there's a record with selfies, show them in the edit modal too */}
          {selectedDayRecord?.record && (selectedDayRecord.record.checkInPhoto || selectedDayRecord.record.checkOutPhoto) && (
            <div className="flex gap-2 py-1">
              {selectedDayRecord.record.checkInPhoto && (
                <div className="flex-1 text-center space-y-0.5">
                  <p className="text-[10px] text-muted-foreground font-semibold">In Selfie</p>
                  <button onClick={() => { setSelfieUrl(resolvePhotoUrl(selectedDayRecord.record.checkInPhoto) || ''); setSelfieOpen(true); }}>
                    <img src={resolvePhotoUrl(selectedDayRecord.record.checkInPhoto) || ''} alt="In selfie"
                      className="h-20 w-full object-cover rounded-lg border" />
                  </button>
                </div>
              )}
              {selectedDayRecord.record.checkOutPhoto && (
                <div className="flex-1 text-center space-y-0.5">
                  <p className="text-[10px] text-muted-foreground font-semibold">Out Selfie</p>
                  <button onClick={() => { setSelfieUrl(resolvePhotoUrl(selectedDayRecord.record.checkOutPhoto) || ''); setSelfieOpen(true); }}>
                    <img src={resolvePhotoUrl(selectedDayRecord.record.checkOutPhoto) || ''} alt="Out selfie"
                      className="h-20 w-full object-cover rounded-lg border" />
                  </button>
                </div>
              )}
            </div>
          )}

          <form onSubmit={handleSaveDayAttendance} className="space-y-4 pt-2">
            <div>
              <Label>Status</Label>
              <Select value={editForm.status} onValueChange={(val) => setEditForm(prev => ({ ...prev, status: val }))}>
                <SelectTrigger className="w-full mt-1.5"><SelectValue placeholder="Select status" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="present">Present</SelectItem>
                  <SelectItem value="absent">Absent</SelectItem>
                  <SelectItem value="half_day">Half Day</SelectItem>
                  <SelectItem value="leave">Leave / Paid Leave</SelectItem>
                  <SelectItem value="late">Late Check-in</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Check In</Label>
                <Input type="time" value={editForm.checkIn}
                  onChange={e => setEditForm(prev => ({ ...prev, checkIn: e.target.value }))}
                  className="mt-1.5" />
              </div>
              <div>
                <Label>Check Out</Label>
                <Input type="time" value={editForm.checkOut}
                  onChange={e => setEditForm(prev => ({ ...prev, checkOut: e.target.value }))}
                  className="mt-1.5" />
              </div>
            </div>
            <div>
              <Label>Remarks / Notes</Label>
              <Input value={editForm.notes}
                onChange={e => setEditForm(prev => ({ ...prev, notes: e.target.value }))}
                placeholder="e.g. Work from home, client visit"
                className="mt-1.5" />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="outline" size="sm" onClick={() => setEditDialogOpen(false)}>Cancel</Button>
              <Button type="submit" size="sm" disabled={saving}>{saving ? 'Saving...' : 'Save Changes'}</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
