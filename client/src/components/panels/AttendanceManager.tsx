import { useState, useEffect } from 'react';
import { ArrowLeft, Check, X, Clock, Loader2, Save, StopCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import api from '@/lib/api';
import { toast } from 'sonner';

export function AttendanceManager({ sessionId, sessionData, onBack }: { sessionId: string, sessionData: any, onBack: () => void }) {
  const [students, setStudents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [ending, setEnding] = useState(false);
  const [punchInTime, setPunchInTime] = useState<string | null>(sessionData?.facultyPunchInTime || null);
  const [punchOutTime, setPunchOutTime] = useState<string | null>(sessionData?.facultyPunchOutTime || null);
  const [punchStatus, setPunchStatus] = useState<string | null>(sessionData?.facultyPunchStatus || null);
  const [punchRemarks, setPunchRemarks] = useState<string | null>(sessionData?.facultyPunchRemarks || null);
  const [punching, setPunching] = useState(false);

  useEffect(() => {
    fetchStudents();
  }, [sessionId]);

  const fetchStudents = async () => {
    try {
      const res = await api.get(`/faculty-portal/sessions/${sessionId}/students`);
      const mapped = res.data.data.map((item: any) => ({
        id: item.student.id,
        name: item.student.studentName,
        admissionNumber: item.student.admissionNumber,
        status: item.attendance?.status || 'PRESENT', // default to present
        remarks: item.attendance?.remarks || ''
      }));
      setStudents(mapped);
    } catch (err) {
      toast.error('Failed to load students');
    } finally {
      setLoading(false);
    }
  };

  const updateStudentStatus = (studentId: string, status: string) => {
    setStudents(prev => prev.map(s => s.id === studentId ? { ...s, status } : s));
  };

  const updateStudentRemarks = (studentId: string, remarks: string) => {
    setStudents(prev => prev.map(s => s.id === studentId ? { ...s, remarks } : s));
  };

  const handleSaveAttendance = async () => {
    setSaving(true);
    try {
      const payload = {
        attendances: students.map(s => ({
          studentId: s.id,
          status: s.status,
          remarks: s.remarks
        }))
      };
      await api.post(`/faculty-portal/sessions/${sessionId}/attendance`, payload);
      toast.success('Attendance saved successfully');
    } catch (err) {
      toast.error('Failed to save attendance');
    } finally {
      setSaving(false);
    }
  };

  const handlePunchIn = async () => {
    setPunching(true);
    try {
      const res = await api.post(`/faculty-portal/sessions/${sessionId}/punch-in`);
      setPunchInTime(res.data.data.facultyPunchInTime);
      setPunchStatus(res.data.data.facultyPunchStatus);
      toast.success('Punched in successfully');
    } catch (err) {
      toast.error('Failed to punch in');
    } finally {
      setPunching(false);
    }
  };

  const handlePunchOut = async () => {
    setPunching(true);
    try {
      const res = await api.post(`/faculty-portal/sessions/${sessionId}/punch-out`);
      setPunchOutTime(res.data.data.facultyPunchOutTime);
      toast.success('Punched out successfully');
    } catch (err) {
      toast.error('Failed to punch out');
    } finally {
      setPunching(false);
    }
  };

  const handleEndSession = async () => {
    if (!confirm('Are you sure you want to end this class session? You will no longer be able to edit attendance.')) return;
    
    setEnding(true);
    try {
      // Auto-save attendance before ending
      const payload = {
        attendances: students.map(s => ({
          studentId: s.id,
          status: s.status,
          remarks: s.remarks
        }))
      };
      await api.post(`/faculty-portal/sessions/${sessionId}/attendance`, payload);
      
      await api.post(`/faculty-portal/sessions/${sessionId}/end`);
      toast.success('Session ended successfully');
      onBack();
    } catch (err) {
      toast.error('Failed to end session');
      setEnding(false);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-[60vh] text-muted-foreground">
        <Loader2 className="w-8 h-8 animate-spin mb-4 text-emerald-500" />
        <p>Loading class roster...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white dark:bg-slate-950 p-6 rounded-2xl border shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <Button variant="ghost" size="sm" onClick={onBack} className="mb-2 -ml-2 text-muted-foreground hover:text-foreground">
            <ArrowLeft className="w-4 h-4 mr-1" /> Back to Sessions
          </Button>
          <div className="flex items-center gap-2">
            <div className="w-2.5 h-2.5 rounded-full bg-red-500 animate-pulse" />
            <h2 className="text-2xl font-bold tracking-tight">Live: {sessionData?.moduleLesson?.title}</h2>
          </div>
          <p className="text-muted-foreground text-sm mt-1">
            {sessionData?.academicClass?.name} • {sessionData?.classModule?.title} • {sessionData?.academicBatch?.name}
          </p>
        </div>
        
        <div className="flex items-center gap-3">
          <Button variant="outline" onClick={handleSaveAttendance} disabled={saving} className="min-w-[120px]">
            {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
            Save Draft
          </Button>
          <Button variant="destructive" onClick={handleEndSession} disabled={ending || saving} className="min-w-[120px]">
            {ending ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <StopCircle className="w-4 h-4 mr-2" />}
            End Class
          </Button>
        </div>
      </div>

      {/* Faculty Attendance Panel */}
      <div className="bg-gradient-to-r from-indigo-50 to-blue-50 dark:from-indigo-950/20 dark:to-blue-950/20 p-5 rounded-2xl border border-indigo-100 dark:border-indigo-900/50 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h3 className="font-semibold text-indigo-900 dark:text-indigo-300 flex items-center gap-2">
              <Clock className="w-4 h-4" /> My Attendance (Faculty)
            </h3>
            <div className="text-sm mt-1 flex flex-wrap gap-x-6 gap-y-1 text-slate-600 dark:text-slate-400">
              <p>Punch In: {punchInTime ? new Date(punchInTime).toLocaleTimeString() : <span className="italic text-slate-400">Not recorded</span>}</p>
              <p>Punch Out: {punchOutTime ? new Date(punchOutTime).toLocaleTimeString() : <span className="italic text-slate-400">Not recorded</span>}</p>
              {punchStatus && (
                <p>Status: <span className={`font-bold ${punchStatus === 'APPROVED' ? 'text-emerald-600' : punchStatus === 'REJECTED' ? 'text-red-600' : 'text-amber-600'}`}>{punchStatus}</span></p>
              )}
            </div>
            {punchRemarks && <p className="text-xs text-red-500 mt-1 font-medium">Principal Remarks: {punchRemarks}</p>}
          </div>
          <div className="flex items-center gap-2">
            {!punchInTime ? (
              <Button onClick={handlePunchIn} disabled={punching} className="bg-indigo-600 hover:bg-indigo-700 text-white shadow-md">
                {punching ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Check className="w-4 h-4 mr-2" />}
                Punch In Now
              </Button>
            ) : !punchOutTime ? (
              <Button onClick={handlePunchOut} disabled={punching} className="bg-amber-500 hover:bg-amber-600 text-white shadow-md">
                {punching ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Clock className="w-4 h-4 mr-2" />}
                Punch Out
              </Button>
            ) : (
              <Button disabled variant="outline" className="opacity-50">
                Attendance Recorded
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Student List */}
      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="bg-muted/50 text-muted-foreground border-b uppercase text-xs">
                <tr>
                  <th className="px-6 py-4 font-semibold">Student Name</th>
                  <th className="px-6 py-4 font-semibold">Admission No</th>
                  <th className="px-6 py-4 font-semibold">Attendance</th>
                  <th className="px-6 py-4 font-semibold">Remarks (Optional)</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {students.map(student => (
                  <tr key={student.id} className="hover:bg-muted/30 transition-colors">
                    <td className="px-6 py-4 font-medium">{student.name}</td>
                    <td className="px-6 py-4 text-muted-foreground">{student.admissionNumber}</td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-1.5">
                        <Button 
                          size="sm" 
                          variant={student.status === 'PRESENT' ? 'default' : 'outline'}
                          className={`h-8 px-3 rounded-full ${student.status === 'PRESENT' ? 'bg-emerald-500 hover:bg-emerald-600' : ''}`}
                          onClick={() => updateStudentStatus(student.id, 'PRESENT')}
                        >
                          <Check className="w-3.5 h-3.5 mr-1" /> P
                        </Button>
                        <Button 
                          size="sm" 
                          variant={student.status === 'ABSENT' ? 'destructive' : 'outline'}
                          className={`h-8 px-3 rounded-full`}
                          onClick={() => updateStudentStatus(student.id, 'ABSENT')}
                        >
                          <X className="w-3.5 h-3.5 mr-1" /> A
                        </Button>
                        <Button 
                          size="sm" 
                          variant={student.status === 'LATE' ? 'default' : 'outline'}
                          className={`h-8 px-3 rounded-full ${student.status === 'LATE' ? 'bg-amber-500 hover:bg-amber-600 text-white' : ''}`}
                          onClick={() => updateStudentStatus(student.id, 'LATE')}
                        >
                          <Clock className="w-3.5 h-3.5 mr-1" /> L
                        </Button>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <Input 
                        placeholder="Add note..." 
                        value={student.remarks} 
                        onChange={(e) => updateStudentRemarks(student.id, e.target.value)}
                        className="h-8 text-xs max-w-[200px]"
                      />
                    </td>
                  </tr>
                ))}
                {students.length === 0 && (
                  <tr>
                    <td colSpan={4} className="px-6 py-8 text-center text-muted-foreground italic">
                      No students enrolled in this batch.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
