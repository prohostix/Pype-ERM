import { useEffect, useState } from 'react';
import { ArrowLeft, Download, Search, TrendingUp } from 'lucide-react';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import api from '@/lib/api';

// Spreadsheet apps run cells starting with these characters as formulas.
const csvCell = (value: unknown) => {
  const text = String(value ?? '');
  const safe = /^[=+\-@\t\r]/.test(text) ? `'${text}` : text;
  return `"${safe.replace(/"/g, '""')}"`;
};

const formatLastActive = (value: string | null) => (value ? new Date(value).toLocaleDateString() : 'Never');

export function FacultyClassProgressPanel({ academicClass, onBack }: { academicClass: any; onBack: () => void }) {
  const [rows, setRows] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [inactiveOnly, setInactiveOnly] = useState(false);

  useEffect(() => {
    api.get(`/faculty-portal/classes/${academicClass.id}/progress`)
      .then((res) => setRows(res.data.data || []))
      .catch(() => toast.error('Failed to load progress report'))
      .finally(() => setLoading(false));
  }, [academicClass.id]);

  const query = search.trim().toLowerCase();
  const visibleRows = rows.filter((row) =>
    (!inactiveOnly || row.isInactive) &&
    (!query || row.name?.toLowerCase().includes(query) || row.enrollmentNo?.toLowerCase().includes(query))
  );

  const inactiveCount = rows.filter((row) => row.isInactive).length;
  const averageCompletion = rows.length > 0
    ? Math.round(rows.reduce((sum, row) => sum + row.completionPercent, 0) / rows.length)
    : 0;

  const handleExport = () => {
    const header = ['Name', 'Enrollment No', 'Email', 'Completion %', 'Lessons Completed', 'Total Lessons', 'Videos Watched', 'Total Videos', 'Quizzes Passed', 'Total Quizzes', 'Average Quiz Score', 'Last Active', 'Inactive'];
    const lines = visibleRows.map((row) => [
      row.name, row.enrollmentNo, row.email, row.completionPercent, row.lessonsCompleted, row.totalLessons,
      row.videosWatched, row.totalVideos, row.quizzesPassed, row.totalQuizzes, row.averageQuizScore ?? '',
      formatLastActive(row.lastActiveAt), row.isInactive ? 'Yes' : 'No'
    ].map(csvCell).join(','));
    const blob = new Blob([[header.map(csvCell).join(','), ...lines].join('\n')], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${academicClass?.name || 'class'}-progress.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={onBack} aria-label="Back to classes">
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <div className="flex-1 min-w-0">
          <h2 className="text-xl font-bold tracking-tight flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-indigo-500" /> Progress Report: {academicClass?.name}
          </h2>
          <p className="text-muted-foreground text-sm">
            {rows.length} students · {averageCompletion}% average completion · {inactiveCount} inactive for over 7 days
          </p>
        </div>
        <Button variant="outline" onClick={handleExport} disabled={visibleRows.length === 0} className="shrink-0">
          <Download className="w-4 h-4 mr-2" /> Export CSV
        </Button>
      </div>

      <div className="flex flex-col sm:flex-row sm:items-center gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search name or enrollment number..."
            aria-label="Search students"
            className="pl-9"
          />
        </div>
        <Button variant={inactiveOnly ? 'default' : 'outline'} size="sm" onClick={() => setInactiveOnly((prev) => !prev)}>
          Inactive only ({inactiveCount})
        </Button>
      </div>

      {loading ? (
        <div className="p-12 text-center text-muted-foreground">Loading progress report...</div>
      ) : visibleRows.length === 0 ? (
        <div className="p-12 text-center border rounded-lg bg-background text-sm text-muted-foreground">No students to show.</div>
      ) : (
        <div className="rounded-lg border overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Student</TableHead>
                <TableHead>Completion</TableHead>
                <TableHead className="text-right">Videos</TableHead>
                <TableHead className="text-right">Quizzes</TableHead>
                <TableHead className="text-right">Avg. Score</TableHead>
                <TableHead>Last Active</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {visibleRows.map((row) => (
                <TableRow key={row.id}>
                  <TableCell>
                    <p className="font-medium">{row.name}</p>
                    {row.enrollmentNo && <p className="text-xs text-muted-foreground">{row.enrollmentNo}</p>}
                  </TableCell>
                  <TableCell className="min-w-[160px]">
                    <div className="flex items-center gap-2">
                      <div className="flex-1 h-1.5 rounded-full bg-muted overflow-hidden">
                        <div className="h-full rounded-full bg-indigo-500" style={{ width: `${row.completionPercent}%` }} />
                      </div>
                      <span className="text-xs font-medium tabular-nums w-9 text-right">{row.completionPercent}%</span>
                    </div>
                  </TableCell>
                  <TableCell className="text-right tabular-nums">{row.videosWatched}/{row.totalVideos}</TableCell>
                  <TableCell className="text-right tabular-nums">{row.quizzesPassed}/{row.totalQuizzes}</TableCell>
                  <TableCell className="text-right tabular-nums">{row.averageQuizScore === null ? '–' : `${row.averageQuizScore}%`}</TableCell>
                  <TableCell>
                    <span className="text-sm">{formatLastActive(row.lastActiveAt)}</span>
                    {row.isInactive && (
                      <Badge variant="outline" className="ml-2 text-amber-700 border-amber-200 bg-amber-50 dark:bg-amber-950/40 dark:text-amber-400">Inactive</Badge>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
