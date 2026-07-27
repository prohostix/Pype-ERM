import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { RefreshCw, CheckCircle } from 'lucide-react';
import { toast } from 'sonner';
import api from '@/lib/api';

export function ReRegistrationPanel() {
  const [students, setStudents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchStudents();
  }, []);

  const fetchStudents = async () => {
    setLoading(true);
    try {
      // Mocking fetch for now
      const res = await api.get('/student');
      setStudents(res.data.data?.slice(0, 3) || []);
    } catch (e) {
      console.error(e);
      toast.error('Failed to fetch re-registrations');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="border-none shadow-none">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Re-registration</CardTitle>
            <CardDescription>Manage upcoming semester re-registrations</CardDescription>
          </div>
          <Button variant="outline" size="sm" onClick={fetchStudents} disabled={loading}>
            <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="flex justify-center p-8"><RefreshCw className="w-6 h-6 animate-spin text-muted-foreground" /></div>
        ) : students.length === 0 ? (
          <div className="flex flex-col items-center justify-center p-8 text-center border rounded-lg border-dashed">
            <CheckCircle className="w-8 h-8 text-green-500 mb-2" />
            <p className="text-muted-foreground">No pending re-registrations!</p>
          </div>
        ) : (
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Student</TableHead>
                  <TableHead>Program</TableHead>
                  <TableHead>Current Sem</TableHead>
                  <TableHead>Next Sem</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {students.map((student) => (
                  <TableRow key={student.id}>
                    <TableCell>
                      <div className="font-medium">{student.name}</div>
                      <div className="text-xs text-muted-foreground">{student.enrollmentNo || 'N/A'}</div>
                    </TableCell>
                    <TableCell>
                      <div className="text-sm">{student.session?.program?.name || 'N/A'}</div>
                    </TableCell>
                    <TableCell>Semester 1</TableCell>
                    <TableCell>Semester 2</TableCell>
                    <TableCell>
                      <Badge variant="outline" className="text-orange-500 bg-orange-50">Pending Fee</Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button size="sm" variant="outline">View Details</Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
