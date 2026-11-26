import { useState, useEffect } from 'react';
import { Save, Calendar } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import api from '@/lib/api';
import { salaryCycleDates } from '@/lib/salaryCycle';

interface SalaryCycle {
  type: 'monthly_day' | 'custom_range';
  startDay: number;
  endDay: number;
  cycleMode: 'previous_to_current' | 'same_month';
  customStartDate?: string;
  customEndDate?: string;
}

export function SalaryCyclePanel() {
  const [salaryCycle, setSalaryCycle] = useState<SalaryCycle>({
    type: 'monthly_day',
    startDay: 1,
    endDay: 31,
    cycleMode: 'same_month',
    customStartDate: '',
    customEndDate: '',
  });
  const [cycleSaving, setCycleSaving] = useState(false);

  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    api.get('/hr/salary-cycle')
      .then(res => {
        if (res.data.data) setSalaryCycle(res.data.data);
        setLoaded(true);
      })
      // Saving stays off, so the defaults on screen cannot overwrite the saved dates
      .catch(() => toast.error('Failed to load salary dates'));
  }, []);

  const handleSaveCycle = async () => {
    setCycleSaving(true);
    try {
      await api.put('/hr/salary-cycle', salaryCycle);
      toast.success('Salary calculation date range updated successfully');
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to update salary cycle');
    } finally {
      setCycleSaving(false);
    }
  };

  const getCyclePreview = () => {
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth();

    if (salaryCycle.type === 'custom_range') {
      if (salaryCycle.customStartDate && salaryCycle.customEndDate) {
        try {
          const [sy, sm, sd] = salaryCycle.customStartDate.split('-').map(Number);
          const [ey, em, ed] = salaryCycle.customEndDate.split('-').map(Number);
          const sDate = new Date(sy, sm - 1, sd);
          const eDate = new Date(ey, em - 1, ed);
          return `${format(sDate, 'dd MMM yyyy')} — ${format(eDate, 'dd MMM yyyy')}`;
        } catch {
          return `${salaryCycle.customStartDate} to ${salaryCycle.customEndDate}`;
        }
      }
      return 'Dates not set';
    }

    const { startDate, endDate } = salaryCycleDates({
      startDay: Number(salaryCycle.startDay) || 1,
      endDay: Number(salaryCycle.endDay) || 31,
      cycleMode: salaryCycle.cycleMode,
    }, currentYear, currentMonth + 1);
    return `${format(startDate, 'dd MMM yyyy')} — ${format(endDate, 'dd MMM yyyy')}`;
  };

  return (
    <div className="space-y-6 wizard-form fee-form">
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-2xl sm:text-3xl font-semibold tracking-tight">Salary Cycle</h2>
          <p className="text-muted-foreground text-sm mt-1.5">Set the organization-wide pay period used for attendance deductions and payroll</p>
        </div>
        <Button
          onClick={handleSaveCycle}
          disabled={cycleSaving || !loaded}
          className="h-11 px-5 rounded-full bg-[#8ae47e] hover:bg-[#7bd96f] text-[#0b1d14] font-semibold"
        >
          <Save className="w-4 h-4 mr-1.5" />
          {cycleSaving ? 'Saving...' : 'Save Salary Dates'}
        </Button>
      </div>

      {/* Salary Cycle / Calculation Date Range */}
      <Card className="rounded-3xl bg-white border border-slate-100 shadow-none overflow-hidden py-0 gap-0">
        <CardContent className="p-5 sm:p-6 space-y-5">
          {/* Cycle Type Selector & Presets */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 pb-4 border-b border-slate-100">
            <div className="flex items-center gap-2">
              <Label className="text-xs font-semibold text-slate-600 mr-1">Format</Label>
              <div className="inline-flex rounded-full bg-[#f4f6f3] p-1">
                <button
                  type="button"
                  onClick={() => setSalaryCycle(prev => ({ ...prev, type: 'monthly_day' }))}
                  className={cn(
                    "px-4 py-1.5 text-xs font-semibold rounded-full transition-all",
                    salaryCycle.type === 'monthly_day'
                      ? "bg-[#8ae47e] text-[#0b1d14]"
                      : "text-slate-600 hover:text-slate-900"
                  )}
                >
                  Monthly Day Cycle
                </button>
                <button
                  type="button"
                  onClick={() => setSalaryCycle(prev => ({ ...prev, type: 'custom_range' }))}
                  className={cn(
                    "px-4 py-1.5 text-xs font-semibold rounded-full transition-all",
                    salaryCycle.type === 'custom_range'
                      ? "bg-[#8ae47e] text-[#0b1d14]"
                      : "text-slate-600 hover:text-slate-900"
                  )}
                >
                  Custom Date Range
                </button>
              </div>
            </div>

            {salaryCycle.type === 'monthly_day' && (
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="text-xs text-muted-foreground mr-1">Quick Presets:</span>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="h-9 text-xs px-4 rounded-full border-slate-200 bg-white hover:bg-[#eaf6e6]"
                  onClick={() => setSalaryCycle(prev => ({ ...prev, startDay: 1, endDay: 31, cycleMode: 'same_month' }))}
                >
                  1st — End of Month (Default)
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="h-9 text-xs px-4 rounded-full border-slate-200 bg-white hover:bg-[#eaf6e6]"
                  onClick={() => setSalaryCycle(prev => ({ ...prev, startDay: 26, endDay: 25, cycleMode: 'previous_to_current' }))}
                >
                  26th — 25th
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="h-9 text-xs px-4 rounded-full border-slate-200 bg-white hover:bg-[#eaf6e6]"
                  onClick={() => setSalaryCycle(prev => ({ ...prev, startDay: 21, endDay: 20, cycleMode: 'previous_to_current' }))}
                >
                  21st — 20th
                </Button>
              </div>
            )}
          </div>

          {/* Form Controls */}
          {salaryCycle.type === 'monthly_day' ? (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="space-y-1.5">
                <Label className="text-xs font-medium text-foreground">
                  Salary Date From <span className="text-muted-foreground font-normal">(Start Day)</span>
                </Label>
                <div className="relative">
                  <Input 
                    type="number" 
                    min={1} 
                    max={31} 
                    value={salaryCycle.startDay || ''}
                    onChange={e => {
                      const val = e.target.value === '' ? 1 : Math.min(31, Math.max(1, Number(e.target.value)));
                      setSalaryCycle(prev => ({ ...prev, startDay: val }));
                    }}
                    className="pr-12 font-medium"
                    placeholder="1"
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground pointer-events-none">
                    th/st
                  </span>
                </div>
                <p className="text-[11px] text-muted-foreground">Day of month (1 to 31)</p>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-medium text-foreground">
                  Salary Date To <span className="text-muted-foreground font-normal">(End Day)</span>
                </Label>
                <div className="relative">
                  <Input 
                    type="number" 
                    min={1} 
                    max={31} 
                    value={salaryCycle.endDay || ''}
                    onChange={e => {
                      const val = e.target.value === '' ? 31 : Math.min(31, Math.max(1, Number(e.target.value)));
                      setSalaryCycle(prev => ({ ...prev, endDay: val }));
                    }}
                    className="pr-12 font-medium"
                    placeholder="31"
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground pointer-events-none">
                    th/st
                  </span>
                </div>
                <p className="text-[11px] text-muted-foreground">Day of month (1 to 31). 31 means the last day</p>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-medium text-foreground">Cycle Month Rule</Label>
                <Select 
                  value={salaryCycle.cycleMode} 
                  onValueChange={(val: any) => setSalaryCycle(prev => ({ ...prev, cycleMode: val }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select rule" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="previous_to_current">
                      Prev Month to Current Month (e.g. 26th – 25th)
                    </SelectItem>
                    <SelectItem value="same_month">
                      Within Same Month (e.g. 1st – end of month)
                    </SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-[11px] text-muted-foreground">Determines calendar month boundary</p>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className="text-xs font-medium text-foreground">Salary Date From (Start Date)</Label>
                <Input 
                  type="date" 
                  value={salaryCycle.customStartDate || ''}
                  onChange={e => setSalaryCycle(prev => ({ ...prev, customStartDate: e.target.value }))}
                  />
                <p className="text-[11px] text-muted-foreground">First day of attendance & salary calculation</p>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-medium text-foreground">Salary Date To (End Date)</Label>
                <Input 
                  type="date" 
                  value={salaryCycle.customEndDate || ''}
                  onChange={e => setSalaryCycle(prev => ({ ...prev, customEndDate: e.target.value }))}
                  />
                <p className="text-[11px] text-muted-foreground">Final day included in this salary cycle</p>
              </div>
            </div>
          )}

          {/* Active Preview Banner */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-4 rounded-2xl bg-[#eaf6e6] text-xs text-[#256c1d]">
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4 flex-shrink-0" />
              <span>
                <strong>Active Period for Current Month:</strong> {getCyclePreview()}
              </span>
            </div>
            <span className="text-[11px] text-muted-foreground">
              Attendance, late deductions, and leave deductions will strictly apply to these dates.
            </span>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
