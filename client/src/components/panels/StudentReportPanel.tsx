import { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Download, Users, GraduationCap, Building2, UserCheck, Loader2, Search } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, Legend, ResponsiveContainer } from 'recharts';
import api from '@/lib/api';
import { toast } from 'sonner';

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8', '#82ca9d', '#ffc658'];

export function StudentReportPanel() {
  const [students, setStudents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [programFilter, setProgramFilter] = useState('all');

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const res = await api.get('/students');
      if (res.data.success) {
        setStudents(res.data.data);
      }
    } catch (err: any) {
      toast.error(err.message || 'Failed to fetch students data');
    } finally {
      setLoading(false);
    }
  };

  // Extract unique programs for the filter dropdown
  const uniquePrograms = useMemo(() => {
    const programs = new Set<string>();
    students.forEach(s => {
      if (s.program?.name) programs.add(s.program.name);
    });
    return Array.from(programs).sort();
  }, [students]);

  // Apply filters
  const filteredStudents = useMemo(() => {
    return students.filter(student => {
      const matchesSearch = 
        (student.name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (student.email || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (student.phone || '').includes(searchTerm);
      
      const matchesStatus = statusFilter === 'all' || 
        (statusFilter === 'completed' ? student.isPrevious === true : student.status === statusFilter && student.isPrevious !== true);
        
      const matchesProgram = programFilter === 'all' || student.program?.name === programFilter;

      return matchesSearch && matchesStatus && matchesProgram;
    });
  }, [students, searchTerm, statusFilter, programFilter]);

  // Aggregate Data for Charts
  const programData = useMemo(() => {
    const counts: Record<string, number> = {};
    filteredStudents.forEach(s => {
      const p = s.program?.name || 'Unknown';
      counts[p] = (counts[p] || 0) + 1;
    });
    return Object.keys(counts).map(key => ({ name: key, value: counts[key] }));
  }, [filteredStudents]);

  const statusData = useMemo(() => {
    const counts: Record<string, number> = {
      pending: 0,
      admitted: 0,
      cancelled: 0,
      completed: 0
    };
    filteredStudents.forEach(s => {
      if (s.isPrevious) {
        counts.completed++;
      } else if (counts[s.status] !== undefined) {
        counts[s.status]++;
      } else {
        counts[s.status] = 1;
      }
    });
    return Object.keys(counts).map(key => ({ 
      name: key.charAt(0).toUpperCase() + key.slice(1), 
      count: counts[key] 
    }));
  }, [filteredStudents]);

  const handleExportCSV = async () => {
    try {
      if (filteredStudents.length === 0) {
        toast.warning('No data to export');
        return;
      }
      
      const XLSX = await import('xlsx');
      
      const exportData = filteredStudents.map(student => ({
        'Name': student.name,
        'Email': student.email,
        'Phone': student.phone,
        'Enrollment No': student.enrollmentNo || 'N/A',
        'Status': student.isPrevious ? 'Completed' : (student.status.charAt(0).toUpperCase() + student.status.slice(1)),
        'Program': student.program?.name || 'N/A',
        'Branch': student.branch?.name || 'Main Office',
        'Center': student.center?.name || 'N/A',
        'University': student.university?.name || 'N/A',
        'Join Date': new Date(student.joinDate).toLocaleDateString(),
      }));

      const worksheet = XLSX.utils.json_to_sheet(exportData);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, 'Students Report');
      XLSX.writeFile(workbook, 'student_report.xlsx');
      
      toast.success('Report exported successfully');
    } catch (err) {
      console.error(err);
      toast.error('Failed to export report');
    }
  };

  return (
    <Card className="border-none shadow-none bg-transparent">
      <CardHeader className="px-0">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <CardTitle>Student Report</CardTitle>
            <CardDescription>Comprehensive analytics and reporting for students</CardDescription>
          </div>
          <Button onClick={handleExportCSV} className="w-full md:w-auto gap-2">
            <Download className="w-4 h-4" />
            Export CSV
          </Button>
        </div>
      </CardHeader>

      <CardContent className="px-0 space-y-6">
        {/* Filters */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="relative">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search students..."
              className="pl-8"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger>
              <SelectValue placeholder="Filter by Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Statuses</SelectItem>
              <SelectItem value="pending">Pending</SelectItem>
              <SelectItem value="admitted">Admitted</SelectItem>
              <SelectItem value="cancelled">Cancelled</SelectItem>
              <SelectItem value="completed">Completed</SelectItem>
            </SelectContent>
          </Select>

          <Select value={programFilter} onValueChange={setProgramFilter}>
            <SelectTrigger>
              <SelectValue placeholder="Filter by Program" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Programs</SelectItem>
              {uniquePrograms.map(p => (
                <SelectItem key={p} value={p}>{p}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {loading ? (
          <div className="flex items-center justify-center p-12">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        ) : (
          <>
            {/* Summary Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <Card>
                <CardContent className="p-6 flex items-center gap-4">
                  <div className="p-3 bg-blue-100 text-blue-600 rounded-lg dark:bg-blue-900/50 dark:text-blue-400">
                    <Users className="w-6 h-6" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Total Students</p>
                    <p className="text-2xl font-bold">{filteredStudents.length}</p>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-6 flex items-center gap-4">
                  <div className="p-3 bg-green-100 text-green-600 rounded-lg dark:bg-green-900/50 dark:text-green-400">
                    <UserCheck className="w-6 h-6" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Active (Admitted)</p>
                    <p className="text-2xl font-bold">
                      {filteredStudents.filter(s => s.status === 'admitted' && !s.isPrevious).length}
                    </p>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-6 flex items-center gap-4">
                  <div className="p-3 bg-purple-100 text-purple-600 rounded-lg dark:bg-purple-900/50 dark:text-purple-400">
                    <GraduationCap className="w-6 h-6" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Completed</p>
                    <p className="text-2xl font-bold">
                      {filteredStudents.filter(s => s.isPrevious).length}
                    </p>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-6 flex items-center gap-4">
                  <div className="p-3 bg-orange-100 text-orange-600 rounded-lg dark:bg-orange-900/50 dark:text-orange-400">
                    <Building2 className="w-6 h-6" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Pending</p>
                    <p className="text-2xl font-bold">
                      {filteredStudents.filter(s => s.status === 'pending' && !s.isPrevious).length}
                    </p>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Charts */}
            {filteredStudents.length > 0 && (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Students by Program</CardTitle>
                  </CardHeader>
                  <CardContent className="h-[300px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={programData}
                          cx="50%"
                          cy="50%"
                          labelLine={false}
                          label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}
                          outerRadius={80}
                          fill="#8884d8"
                          dataKey="value"
                        >
                          {programData.map((_, index) => (
                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                          ))}
                        </Pie>
                        <RechartsTooltip />
                        <Legend />
                      </PieChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Students by Status</CardTitle>
                  </CardHeader>
                  <CardContent className="h-[300px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={statusData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} />
                        <XAxis dataKey="name" />
                        <YAxis allowDecimals={false} />
                        <RechartsTooltip />
                        <Bar dataKey="count" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>
              </div>
            )}

            {/* Data Table */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Student Directory</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="rounded-md border overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b bg-muted/50 text-left">
                        <th className="p-3 font-medium">Name</th>
                        <th className="p-3 font-medium">Contact</th>
                        <th className="p-3 font-medium">Program</th>
                        <th className="p-3 font-medium">Branch</th>
                        <th className="p-3 font-medium">Status</th>
                        <th className="p-3 font-medium">Join Date</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredStudents.length === 0 ? (
                        <tr>
                          <td colSpan={6} className="p-8 text-center text-muted-foreground">
                            No students found matching the selected filters.
                          </td>
                        </tr>
                      ) : (
                        filteredStudents.slice(0, 50).map((student) => (
                          <tr key={student.id} className="border-b last:border-0 hover:bg-muted/50">
                            <td className="p-3 font-medium">{student.name}</td>
                            <td className="p-3">
                              <div className="text-xs">{student.email}</div>
                              <div className="text-xs text-muted-foreground">{student.phone}</div>
                            </td>
                            <td className="p-3 text-muted-foreground">{student.program?.name || '-'}</td>
                            <td className="p-3 text-muted-foreground">{student.branch?.name || 'Main Office'}</td>
                            <td className="p-3">
                              {student.isPrevious ? (
                                <span className="inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300">
                                  Completed
                                </span>
                              ) : (
                                <span className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold ${
                                  student.status === 'admitted' 
                                    ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300'
                                    : student.status === 'cancelled'
                                    ? 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300'
                                    : 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300'
                                }`}>
                                  {student.status.charAt(0).toUpperCase() + student.status.slice(1)}
                                </span>
                              )}
                            </td>
                            <td className="p-3 text-muted-foreground">
                              {new Date(student.joinDate).toLocaleDateString()}
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
                {filteredStudents.length > 50 && (
                  <div className="mt-4 text-center text-sm text-muted-foreground">
                    Showing top 50 of {filteredStudents.length} students. Export to CSV to see all.
                  </div>
                )}
              </CardContent>
            </Card>
          </>
        )}
      </CardContent>
    </Card>
  );
}
