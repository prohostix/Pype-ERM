import { useState } from 'react';
import { Calendar, List, ChevronLeft, ChevronRight, CheckCircle } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import api from '@/lib/api';
import { toast } from 'sonner';

interface AttendanceCalendarProps {
  employeeId: string;
  employeeName: string;
  records: any[];
  onRefresh: () => void;
  onToggleView: () => void;
  isHR: boolean;
}

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

export function AttendanceCalendar({
  employeeId,
  employeeName,
  records,
  onRefresh,
  onToggleView,
  isHR
}: AttendanceCalendarProps) {
  const today = new Date();
  const [selectedYear, setSelectedYear] = useState<number>(today.getFullYear());
  const [selectedMonth, setSelectedMonth] = useState<number>(today.getMonth()); // 0-indexed
  const [loading, setLoading] = useState(false);

  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [selectedDayRecord, setSelectedDayRecord] = useState<any>(null);
  const [editForm, setEditForm] = useState({
    status: 'present',
    checkIn: '09:00',
    checkOut: '18:00',
    notes: ''
  });
  const [saving, setSaving] = useState(false);

  // Generate years list (e.g. +/- 3 years)
  const years = Array.from({ length: 7 }, (_, i) => today.getFullYear() - 3 + i);

  // Get total days in the selected month
  const totalDays = new Date(selectedYear, selectedMonth + 1, 0).getDate();
  // Get first day of the month weekday index (0: Sunday, 1: Monday, etc.)
  const firstDayIndex = new Date(selectedYear, selectedMonth, 1).getDay();

  // Create array of day objects
  const calendarDays = [];
  
  // Pad preceding empty slots
  for (let i = 0; i < firstDayIndex; i++) {
    calendarDays.push(null);
  }

  // Populate days of the month
  for (let day = 1; day <= totalDays; day++) {
    const currentDate = new Date(selectedYear, selectedMonth, day);
    // Find attendance record for this day
    const record = records.find(r => {
      const recDate = new Date(r.date);
      return recDate.getFullYear() === selectedYear &&
             recDate.getMonth() === selectedMonth &&
             recDate.getDate() === day;
    });

    calendarDays.push({
      day,
      date: currentDate,
      record
    });
  }

  // Calculate statistics for the selected month
  let presentCount = 0;
  let absentCount = 0;
  let halfDayCount = 0;
  let leaveCount = 0;
  let weekOffCount = 0;

  for (let day = 1; day <= totalDays; day++) {
    const date = new Date(selectedYear, selectedMonth, day);
    const dayOfWeek = date.getDay(); // 0 is Sunday, 6 is Saturday
    const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;

    const record = records.find(r => {
      const recDate = new Date(r.date);
      return recDate.getFullYear() === selectedYear &&
             recDate.getMonth() === selectedMonth &&
             recDate.getDate() === day;
    });

    if (record) {
      if (record.status === 'present' || record.status === 'late') {
        presentCount++;
      } else if (record.status === 'absent') {
        absentCount++;
      } else if (record.status === 'half_day') {
        halfDayCount++;
      } else if (record.status === 'leave') {
        leaveCount++;
      }
    } else if (isWeekend) {
      weekOffCount++;
    }
  }

  const handlePrevMonth = () => {
    if (selectedMonth === 0) {
      setSelectedMonth(11);
      setSelectedYear(prev => prev - 1);
    } else {
      setSelectedMonth(prev => prev - 1);
    }
  };

  const handleNextMonth = () => {
    if (selectedMonth === 11) {
      setSelectedMonth(0);
      setSelectedYear(prev => prev + 1);
    } else {
      setSelectedMonth(prev => prev + 1);
    }
  };

  const handleDayClick = (dayObj: any) => {
    if (!dayObj || !isHR) return;
    const { day, record, date } = dayObj;
    
    setSelectedDayRecord({ day, date, record });
    setEditForm({
      status: record?.status || 'present',
      checkIn: record?.checkIn ? new Date(record.checkIn).toTimeString().slice(0, 5) : '09:00',
      checkOut: record?.checkOut ? new Date(record.checkOut).toTimeString().slice(0, 5) : '18:00',
      notes: record?.notes || ''
    });
    setEditDialogOpen(true);
  };

  const handleSaveDayAttendance = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedDayRecord) return;
    setSaving(true);
    
    try {
      const dateString = new Date(selectedYear, selectedMonth, selectedDayRecord.day).toISOString().split('T')[0];
      const toISO = (time: string) => {
        if (!time) return undefined;
        return new Date(`${dateString}T${time}:00`).toISOString();
      };

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
      console.error('Failed to update status:', error);
      toast.error(error.response?.data?.message || 'Failed to update attendance');
    } finally {
      setSaving(false);
    }
  };

  const handleMarkAllPresent = async () => {
    if (!confirm(`Are you sure you want to mark all weekdays in ${MONTHS[selectedMonth]} ${selectedYear} as Present for ${employeeName}?`)) return;
    setLoading(true);
    try {
      // Mark weekdays that don't have records as present
      const promises = [];
      for (let day = 1; day <= totalDays; day++) {
        const date = new Date(selectedYear, selectedMonth, day);
        const dayOfWeek = date.getDay();
        const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;

        // Skip weekend or existing records
        const hasRecord = records.some(r => {
          const recDate = new Date(r.date);
          return recDate.getFullYear() === selectedYear &&
                 recDate.getMonth() === selectedMonth &&
                 recDate.getDate() === day;
        });

        if (!isWeekend && !hasRecord) {
          const dateString = date.toISOString().split('T')[0];
          promises.push(
            api.post('/hr/attendance', {
              employeeId,
              date: date.toISOString(),
              status: 'present',
              checkIn: new Date(`${dateString}T09:00:00`).toISOString(),
              checkOut: new Date(`${dateString}T18:00:00`).toISOString(),
              notes: 'Bulk marked present'
            })
          );
        }
      }

      if (promises.length === 0) {
        toast.info('All weekdays already have registered attendance.');
        return;
      }

      await Promise.all(promises);
      toast.success(`Successfully marked present for ${promises.length} weekdays!`);
      onRefresh();
    } catch (err: any) {
      console.error(err);
      toast.error('Failed to mark weekdays present');
    } finally {
      setLoading(false);
    }
  };

  const getDayColor = (dayObj: any) => {
    if (!dayObj) return 'bg-transparent border-transparent';
    const { date, record } = dayObj;
    const dayOfWeek = date.getDay();
    const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;

    if (record) {
      switch (record.status) {
        case 'present':
        case 'late':
          return 'bg-emerald-500 text-white hover:bg-emerald-600';
        case 'absent':
          return 'bg-rose-500 text-white hover:bg-rose-600';
        case 'half_day':
          return 'bg-amber-500 text-white hover:bg-amber-600';
        case 'leave':
          return 'bg-purple-500 text-white hover:bg-purple-600';
        default:
          return 'bg-slate-500 text-white';
      }
    }

    if (isWeekend) return 'bg-slate-400 dark:bg-slate-600 text-white hover:opacity-90';
    return 'bg-slate-100 dark:bg-slate-800/40 text-muted-foreground border border-border hover:bg-muted';
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
            <span>Click any day to update (HR only)</span>
          </div>
        </div>

        {/* Top Dropdown month year selector */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-1.5 bg-background border border-border rounded-lg px-2 py-1 shadow-sm">
            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={handlePrevMonth}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Select 
              value={selectedMonth.toString()} 
              onValueChange={(val) => setSelectedMonth(parseInt(val))}
            >
              <SelectTrigger className="h-7 border-none bg-transparent shadow-none focus:ring-0 w-[110px] text-xs font-bold">
                <SelectValue placeholder="Month" />
              </SelectTrigger>
              <SelectContent>
                {MONTHS.map((m, idx) => (
                  <SelectItem key={m} value={idx.toString()} className="text-xs">{m}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select 
              value={selectedYear.toString()} 
              onValueChange={(val) => setSelectedYear(parseInt(val))}
            >
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
              <Button 
                variant="outline" 
                size="sm" 
                className="h-9 text-xs font-semibold gap-1.5"
                onClick={handleMarkAllPresent}
                disabled={loading}
              >
                <CheckCircle className="w-3.5 h-3.5 text-primary" /> Mark Weekdays Present
              </Button>
            )}
            <Button 
              variant="outline" 
              size="sm" 
              className="h-9 text-xs font-semibold gap-1.5"
              onClick={onToggleView}
            >
              <List className="w-3.5 h-3.5" /> List View
            </Button>
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="pt-6 space-y-8">
        {/* Month Summary Cards */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <div className="flex items-center gap-3 p-3.5 rounded-xl border border-emerald-500/10 bg-emerald-500/5">
            <div className="w-2.5 h-10 bg-emerald-500 rounded-full shrink-0" />
            <div>
              <span className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider block">Present</span>
              <span className="text-2xl font-black text-emerald-600 dark:text-emerald-400 leading-none block mt-1">{presentCount}</span>
            </div>
          </div>
          <div className="flex items-center gap-3 p-3.5 rounded-xl border border-rose-500/10 bg-rose-500/5">
            <div className="w-2.5 h-10 bg-rose-500 rounded-full shrink-0" />
            <div>
              <span className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider block">Absent</span>
              <span className="text-2xl font-black text-rose-600 dark:text-rose-400 leading-none block mt-1">{absentCount}</span>
            </div>
          </div>
          <div className="flex items-center gap-3 p-3.5 rounded-xl border border-amber-500/10 bg-amber-500/5">
            <div className="w-2.5 h-10 bg-amber-500 rounded-full shrink-0" />
            <div>
              <span className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider block">Half Day</span>
              <span className="text-2xl font-black text-amber-600 dark:text-amber-400 leading-none block mt-1">{halfDayCount}</span>
            </div>
          </div>
          <div className="flex items-center gap-3 p-3.5 rounded-xl border border-purple-500/10 bg-purple-500/5">
            <div className="w-2.5 h-10 bg-purple-500 rounded-full shrink-0" />
            <div>
              <span className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider block">Paid Leave</span>
              <span className="text-2xl font-black text-purple-600 dark:text-purple-400 leading-none block mt-1">{leaveCount.toFixed(1)}</span>
            </div>
          </div>
          <div className="flex items-center gap-3 p-3.5 rounded-xl border border-slate-500/10 bg-slate-500/5 col-span-2 md:col-span-1">
            <div className="w-2.5 h-10 bg-slate-400 dark:bg-slate-600 rounded-full shrink-0" />
            <div>
              <span className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider block">Week Off</span>
              <span className="text-2xl font-black text-slate-600 dark:text-slate-400 leading-none block mt-1">{weekOffCount}</span>
            </div>
          </div>
        </div>

        {/* Calendar Grid */}
        <div className="border border-border/80 rounded-xl p-4 bg-background/50">
          <div className="grid grid-cols-7 gap-2 text-center text-xs font-bold text-muted-foreground uppercase tracking-wider pb-3 border-b border-border/60">
            <div>Sun</div>
            <div>Mon</div>
            <div>Tue</div>
            <div>Wed</div>
            <div>Thu</div>
            <div>Fri</div>
            <div>Sat</div>
          </div>
          
          <div className="grid grid-cols-7 gap-2 mt-3">
            {calendarDays.map((dayObj, index) => {
              if (dayObj === null) {
                return <div key={`empty-${index}`} className="aspect-square" />;
              }

              const formattedDay = dayObj.day < 10 ? `0${dayObj.day}` : dayObj.day.toString();
              return (
                <button
                  key={`day-${dayObj.day}`}
                  className={`aspect-square rounded-lg flex flex-col items-center justify-center font-bold text-sm transition-all shadow-sm ${getDayColor(dayObj)} ${isHR ? 'cursor-pointer hover:scale-105 active:scale-95' : 'cursor-default'}`}
                  onClick={() => handleDayClick(dayObj)}
                  title={dayObj.record?.notes ? `Notes: ${dayObj.record.notes}` : undefined}
                >
                  <span>{formattedDay}</span>
                  {dayObj.record?.isLate && (
                    <span className="w-1.5 h-1.5 bg-red-400 rounded-full mt-0.5" title="Late Check-in" />
                  )}
                </button>
              );
            })}
          </div>
        </div>
      </CardContent>

      {/* Edit Day Attendance Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-base">
              Edit Attendance: {selectedDayRecord?.date ? new Date(selectedDayRecord.date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : ''}
            </DialogTitle>
          </DialogHeader>
          
          <form onSubmit={handleSaveDayAttendance} className="space-y-4 pt-2">
            <div>
              <Label>Status</Label>
              <Select 
                value={editForm.status} 
                onValueChange={(val) => setEditForm(prev => ({ ...prev, status: val }))}
              >
                <SelectTrigger className="w-full mt-1.5">
                  <SelectValue placeholder="Select status" />
                </SelectTrigger>
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
                <Input 
                  type="time" 
                  value={editForm.checkIn} 
                  onChange={e => setEditForm(prev => ({ ...prev, checkIn: e.target.value }))}
                  className="mt-1.5"
                />
              </div>
              <div>
                <Label>Check Out</Label>
                <Input 
                  type="time" 
                  value={editForm.checkOut} 
                  onChange={e => setEditForm(prev => ({ ...prev, checkOut: e.target.value }))}
                  className="mt-1.5"
                />
              </div>
            </div>

            <div>
              <Label>Remarks / Notes</Label>
              <Input 
                value={editForm.notes} 
                onChange={e => setEditForm(prev => ({ ...prev, notes: e.target.value }))}
                placeholder="e.g. Work from home, client visit"
                className="mt-1.5"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="outline" size="sm" onClick={() => setEditDialogOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" size="sm" disabled={saving}>
                {saving ? 'Saving...' : 'Save Changes'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
