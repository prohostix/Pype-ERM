import { useState, useEffect } from 'react';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { toast } from 'sonner';
import api from '@/lib/api';

const RULES = [
  {
    key: 'autoPunchOutAsHalfDay',
    label: 'Mark Missing Punch-Out as Half Day',
    description: 'When enabled, employees who forget to punch out will be automatically marked as Half Day, and half a day is taken from casual, sick or earned leave (unpaid only if none is left). HR can cancel it by marking the day Present or Late. When disabled, checkout is marked at the regular shift punch-out time.',
  },
  {
    key: 'absentAsUnpaidLeave',
    label: 'Mark Missing Punch-In as Unpaid Leave',
    description: 'When enabled, an employee with no punch-in on a working day is marked Absent with one day of unpaid leave, which reduces pay. Approved leave or an HR correction cancels it. Starts from salary cycles beginning after 26 November 2026.',
  },
];

/** The missed punch-out and punch-in rules. Only the organisation admin may change them. */
export function AttendanceRulesCard() {
  const [officeHours, setOfficeHours] = useState<Record<string, any> | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    api.get('/attendance/settings')
      .then((res) => setOfficeHours(res.data.data?.officeHours || null))
      .catch(() => toast.error('Failed to load attendance rules'))
      .finally(() => setLoading(false));
  }, []);

  const toggle = async (key: string, checked: boolean) => {
    setSaving(true);
    try {
      // Only the changed rule is sent; the server keeps the rest of the attendance settings
      const res = await api.put('/attendance/settings', { officeHours: { [key]: checked } });
      setOfficeHours(res.data.data.officeHours);
      toast.success('Attendance rule saved');
    } catch (e: any) {
      toast.error(e.response?.data?.message || 'Failed to save attendance rule');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return null;

  return (
    <div className="rounded-3xl bg-white border border-slate-100 p-6 sm:p-8 space-y-3">
      <h3 className="text-base font-semibold">Attendance Rules</h3>
      {!officeHours && (
        <p className="text-sm text-muted-foreground">HR needs to save the attendance settings before these rules can be changed.</p>
      )}
      {RULES.map((rule) => (
        <div key={rule.key} className="flex items-center justify-between gap-4 p-4 rounded-2xl bg-[#f4f6f3]">
          <div className="space-y-0.5 pr-2">
            <Label className="text-sm font-semibold cursor-pointer" htmlFor={rule.key}>{rule.label}</Label>
            <p className="text-xs text-muted-foreground leading-relaxed">{rule.description}</p>
          </div>
          <Switch
            id={rule.key}
            checked={Boolean(officeHours?.[rule.key])}
            disabled={!officeHours || saving}
            onCheckedChange={(checked) => toggle(rule.key, checked)}
          />
        </div>
      ))}
    </div>
  );
}
