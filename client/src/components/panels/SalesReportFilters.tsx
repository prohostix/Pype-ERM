import { useEffect, useState } from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import api from '@/lib/api';

export interface ReportFilter {
  /** 'YYYY-MM', or 'all' for every month */
  month: string;
  /** a team member's id, or 'all' for the whole team */
  counselorId: string;
}

export const DEFAULT_REPORT_FILTER: ReportFilter = { month: 'all', counselorId: 'all' };

/** Query parameters for the /sales/reports/* endpoints */
export function reportParams(f: ReportFilter): Record<string, string> {
  const params: Record<string, string> = {};
  if (f.month !== 'all') params.month = f.month;
  if (f.counselorId !== 'all') params.counselorId = f.counselorId;
  return params;
}

const monthOptions = (() => {
  const now = new Date();
  return Array.from({ length: 24 }, (_, i) => {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    return {
      value: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`,
      label: d.toLocaleDateString('en-GB', { month: 'long', year: 'numeric' }),
    };
  });
})();

/** Month and counselor pickers shared by the sales admin report pages */
export function SalesReportFilters({ value, onChange }: { value: ReportFilter; onChange: (f: ReportFilter) => void }) {
  const [members, setMembers] = useState<{ id: string; name: string; designation?: string }[]>([]);

  useEffect(() => {
    api.get('/sales/reports/members').then((r) => setMembers(r.data.data || [])).catch(() => {});
  }, []);

  return (
    <div className="flex flex-wrap items-center gap-2">
      <Select value={value.month} onValueChange={(month) => onChange({ ...value, month })}>
        <SelectTrigger className="h-9 w-44"><SelectValue placeholder="Month" /></SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All months</SelectItem>
          {monthOptions.map((m) => <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>)}
        </SelectContent>
      </Select>
      <Select value={value.counselorId} onValueChange={(counselorId) => onChange({ ...value, counselorId })}>
        <SelectTrigger className="h-9 w-52"><SelectValue placeholder="Counselor" /></SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All counselors</SelectItem>
          {members.map((m) => <SelectItem key={m.id} value={m.id}>{m.name}</SelectItem>)}
        </SelectContent>
      </Select>
    </div>
  );
}
