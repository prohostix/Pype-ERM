import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Save, RefreshCw, CheckCircle } from 'lucide-react';
import { toast } from 'sonner';
import api from '@/lib/api';

export function EnrollmentNumberUpdatePanel() {
  const [students, setStudents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [updates, setUpdates] = useState<Record<string, string>>({});

  useEffect(() => {
    fetchStudents();
  }, []);

  const fetchStudents = async () => {
    setLoading(true);
    try {
      const res = await api.get('/student?missingEnrollment=true');
      setStudents(res.data.data || []);
      setUpdates({});
    } catch (e) {
      console.error(e);
      toast.error('Failed to fetch students');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateChange = (studentId: string, val: string) => {
    setUpdates(prev => ({ ...prev, [studentId]: val }));
  };

  const saveUpdates = async () => {
    const payloads = Object.entries(updates).map(([id, enrollmentNo]) => ({ id, enrollmentNo }));
    if (payloads.length === 0) {
      toast.info('No changes to save');
      return;
    }
    
    setSaving(true);
    try {
      await api.post('/student/bulk-enrollment-update', { updates: payloads });
      toast.success(`Successfully updated ${payloads.length} enrollment numbers!`);
      fetchStudents();
    } catch (e) {
      console.error(e);
      toast.error('Failed to save updates');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card className="border-none shadow-none">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Enrollment Number Update</CardTitle>
            <CardDescription>Assign official university enrollment numbers to admitted students</CardDescription>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={fetchStudents} disabled={loading}>
              <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
            <Button size="sm" onClick={saveUpdates} disabled={saving || Object.keys(updates).length === 0}>
              <Save className="w-4 h-4 mr-2" />
              Save Changes
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="flex justify-center p-8"><RefreshCw className="w-6 h-6 animate-spin text-muted-foreground" /></div>
        ) : students.length === 0 ? (
          <div className="flex flex-col items-center justify-center p-8 text-center border rounded-lg border-dashed">
            <CheckCircle className="w-8 h-8 text-green-500 mb-2" />
            <p className="text-muted-foreground">All admitted students have enrollment numbers!</p>
          </div>
        ) : (
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Student</TableHead>
                  <TableHead>Program / Batch</TableHead>
                  <TableHead>Center</TableHead>
                  <TableHead className="w-[300px]">Enrollment Number</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {students.map((student) => (
                  <TableRow key={student.id}>
                    <TableCell>
                      <div className="font-medium">{student.name}</div>
                      <div className="text-xs text-muted-foreground">{student.email}</div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="mb-1">{student.session?.program?.name || 'N/A'}</Badge>
                      <div className="text-xs text-muted-foreground">{student.session?.name}</div>
                    </TableCell>
                    <TableCell>
                      <div className="text-sm">{student.center?.name || 'Direct'}</div>
                    </TableCell>
                    <TableCell>
                      <Input
                        placeholder="Enter Enrollment No."
                        value={updates[student.id] !== undefined ? updates[student.id] : (student.enrollmentNo || '')}
                        onChange={(e) => handleUpdateChange(student.id, e.target.value)}
                        className="h-8 max-w-[250px]"
                      />
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
