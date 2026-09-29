import { useState, useEffect } from 'react';
import { Users, UserCheck, UserX, Clock, CalendarOff, Search, FileText } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import api from '@/lib/api';

export function CeoAttendancePanel() {
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    totalStrength: 0,
    present: 0,
    absent: 0,
    onLeave: 0,
    late: 0
  });
  const [attendanceRecords, setAttendanceRecords] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      // Get today's date in YYYY-MM-DD
      const today = new Date().toISOString().split('T')[0];
      
      // Fetch all employees to get total strength
      const usersRes = await api.getUsers();
      const allEmployees = (usersRes.data || []).filter((u: any) => 
        !['superadmin', 'org_admin', 'center_admin', 'student'].includes(u.role)
      );
      
      // Fetch today's attendance
      const attendanceRes = await api.getAttendance({ date: today });
      const todayAttendance = attendanceRes.data || [];
      
      // Fetch today's leaves (assume approved leaves for today)
      // Getting all leaves and filtering locally for simplicity, assuming API doesn't have ?date
      const leavesRes = await api.getLeaveRequests();
      const allLeaves = leavesRes.data || [];
      
      const todayLeaves = allLeaves.filter((l: any) => {
        if (l.status !== 'approved') return false;
        const start = new Date(l.startDate).toISOString().split('T')[0];
        const end = new Date(l.endDate).toISOString().split('T')[0];
        return today >= start && today <= end;
      });

      const presentCount = todayAttendance.filter((a: any) => a.status === 'present').length;
      const lateCount = todayAttendance.filter((a: any) => a.isLate || a.status === 'late').length;
      const leaveCount = todayLeaves.length;
      const absentCount = Math.max(0, allEmployees.length - presentCount - leaveCount);

      setStats({
        totalStrength: allEmployees.length,
        present: presentCount,
        absent: absentCount,
        onLeave: leaveCount,
        late: lateCount
      });

      setAttendanceRecords(todayAttendance);
    } catch (err) {
      console.error('Failed to fetch CEO attendance stats', err);
    } finally {
      setLoading(false);
    }
  };

  const filteredRecords = attendanceRecords.filter(record => 
    record.user?.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    record.user?.email?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-slate-100">Daily Attendance Overview</h2>
          <p className="text-muted-foreground text-sm">Monitor today's workforce strength, attendance, and leaves across the organization.</p>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <Card className="bg-white dark:bg-slate-900 shadow-sm border-blue-100 dark:border-blue-900">
          <CardContent className="p-4 flex flex-col items-center justify-center text-center">
            <div className="w-10 h-10 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center mb-2">
              <Users className="w-5 h-5" />
            </div>
            <div className="text-2xl font-bold text-slate-800 dark:text-slate-100">{stats.totalStrength}</div>
            <div className="text-xs text-muted-foreground font-medium uppercase mt-1">Total Strength</div>
          </CardContent>
        </Card>

        <Card className="bg-white dark:bg-slate-900 shadow-sm border-emerald-100 dark:border-emerald-900">
          <CardContent className="p-4 flex flex-col items-center justify-center text-center">
            <div className="w-10 h-10 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mb-2">
              <UserCheck className="w-5 h-5" />
            </div>
            <div className="text-2xl font-bold text-slate-800 dark:text-slate-100">{stats.present}</div>
            <div className="text-xs text-muted-foreground font-medium uppercase mt-1">Present</div>
          </CardContent>
        </Card>

        <Card className="bg-white dark:bg-slate-900 shadow-sm border-rose-100 dark:border-rose-900">
          <CardContent className="p-4 flex flex-col items-center justify-center text-center">
            <div className="w-10 h-10 rounded-full bg-rose-100 text-rose-600 flex items-center justify-center mb-2">
              <UserX className="w-5 h-5" />
            </div>
            <div className="text-2xl font-bold text-slate-800 dark:text-slate-100">{stats.absent}</div>
            <div className="text-xs text-muted-foreground font-medium uppercase mt-1">Absent</div>
          </CardContent>
        </Card>

        <Card className="bg-white dark:bg-slate-900 shadow-sm border-violet-100 dark:border-violet-900">
          <CardContent className="p-4 flex flex-col items-center justify-center text-center">
            <div className="w-10 h-10 rounded-full bg-violet-100 text-violet-600 flex items-center justify-center mb-2">
              <CalendarOff className="w-5 h-5" />
            </div>
            <div className="text-2xl font-bold text-slate-800 dark:text-slate-100">{stats.onLeave}</div>
            <div className="text-xs text-muted-foreground font-medium uppercase mt-1">On Leave</div>
          </CardContent>
        </Card>

        <Card className="bg-white dark:bg-slate-900 shadow-sm border-amber-100 dark:border-amber-900">
          <CardContent className="p-4 flex flex-col items-center justify-center text-center">
            <div className="w-10 h-10 rounded-full bg-amber-100 text-amber-600 flex items-center justify-center mb-2">
              <Clock className="w-5 h-5" />
            </div>
            <div className="text-2xl font-bold text-slate-800 dark:text-slate-100">{stats.late}</div>
            <div className="text-xs text-muted-foreground font-medium uppercase mt-1">Late In</div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="flex flex-col sm:flex-row sm:items-center sm:justify-between p-5 border-b border-border/40 bg-muted/10">
          <CardTitle className="text-lg">Today's Attendance Roster</CardTitle>
          <div className="relative w-full sm:w-64 mt-3 sm:mt-0">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input 
              placeholder="Search employee..." 
              className="pl-8" 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <div className="p-8 text-center text-muted-foreground">Loading roster...</div>
          ) : filteredRecords.length === 0 ? (
            <div className="p-8 flex flex-col items-center justify-center text-muted-foreground">
              <FileText className="w-8 h-8 mb-2 opacity-20" />
              <p>No attendance records found for today.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-muted/50 border-b">
                    <th className="text-left font-semibold py-3 px-4">Employee</th>
                    <th className="text-left font-semibold py-3 px-4">Department</th>
                    <th className="text-left font-semibold py-3 px-4">Status</th>
                    <th className="text-left font-semibold py-3 px-4">Punch In</th>
                    <th className="text-left font-semibold py-3 px-4">Punch Out</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {filteredRecords.map((record) => {
                    const isLate = record.isLate || record.status === 'late';
                    return (
                      <tr key={record.id} className="hover:bg-muted/20 transition-colors">
                        <td className="py-3 px-4">
                          <div className="font-semibold text-slate-800 dark:text-slate-200">{record.user?.name}</div>
                          <div className="text-xs text-muted-foreground">{record.user?.email}</div>
                        </td>
                        <td className="py-3 px-4 text-muted-foreground">
                          {record.user?.department?.name || '-'}
                        </td>
                        <td className="py-3 px-4">
                          <Badge variant="outline" className={
                            record.status === 'present' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' :
                            record.status === 'absent' ? 'bg-rose-50 text-rose-700 border-rose-200' :
                            record.status === 'half_day' ? 'bg-amber-50 text-amber-700 border-amber-200' :
                            'bg-slate-50 text-slate-700 border-slate-200'
                          }>
                            {record.status?.replace('_', ' ').toUpperCase() || 'UNKNOWN'}
                          </Badge>
                          {isLate && (
                            <Badge variant="outline" className="ml-2 bg-amber-50 text-amber-700 border-amber-200">
                              LATE
                            </Badge>
                          )}
                        </td>
                        <td className="py-3 px-4">
                          {record.punchIn ? new Date(record.punchIn).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '-'}
                        </td>
                        <td className="py-3 px-4">
                          {record.punchOut ? new Date(record.punchOut).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '-'}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
