import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { RefreshCw, CheckCircle, Send, Building2 } from 'lucide-react';
import { toast } from 'sonner';
import api from '@/lib/api';

export function UniversitySubmissionPanel() {
  const [students, setStudents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchStudents();
  }, []);

  const fetchStudents = async () => {
    setLoading(true);
    try {
      // Mocking fetch for now until we build the specific status filter
      const res = await api.get('/students');
      setStudents(res.data.data?.slice(0, 5) || []);
    } catch (e) {
      console.error(e);
      toast.error('Failed to fetch submissions');
    } finally {
      setLoading(false);
    }
  };

  const markSubmitted = (id: string) => {
    toast.success('Marked as submitted to University!');
    setStudents(students.filter(s => s.id !== id));
  };

  return (
    <Card className="border-none shadow-none">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>University Submission</CardTitle>
            <CardDescription>Track and manage student applications pending university submission</CardDescription>
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
            <p className="text-muted-foreground">All files are submitted to universities!</p>
          </div>
        ) : (
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Student</TableHead>
                  <TableHead>Program</TableHead>
                  <TableHead>University</TableHead>
                  <TableHead>Documents</TableHead>
                  <TableHead className="text-right">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {students.map((student) => (
                  <TableRow key={student.id}>
                    <TableCell>
                      <div className="font-medium">{student.name}</div>
                      <div className="text-xs text-muted-foreground">{student.admissionNo || 'N/A'}</div>
                    </TableCell>
                    <TableCell>
                      <div className="text-sm">{student.session?.program?.name || 'N/A'}</div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="flex w-fit items-center gap-1">
                        <Building2 className="w-3 h-3" />
                        {student.university?.name || 'Assigned'}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary" className="bg-green-100 text-green-700">Verified</Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button size="sm" onClick={() => markSubmitted(student.id)}>
                        <Send className="w-4 h-4 mr-2" />
                        Mark Submitted
                      </Button>
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
