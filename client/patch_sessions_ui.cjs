const fs = require('fs');
const path = './src/components/panels/FacultyClassContentPanel.tsx';
let code = fs.readFileSync(path, 'utf8');

// 1. Add state
const oldState = `  const [lessonHistory, setLessonHistory] = useState<any[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);`;
const newState = oldState + `

  // Sessions Modal
  const [sessionsDialogOpen, setSessionsDialogOpen] = useState(false);
  const [lessonSessions, setLessonSessions] = useState<any[]>([]);
  const [loadingSessions, setLoadingSessions] = useState(false);
  
  // View Attendance Modal
  const [viewAttendanceDialogOpen, setViewAttendanceDialogOpen] = useState(false);
  const [attendanceSessionId, setAttendanceSessionId] = useState<string | null>(null);
  const [attendanceRecords, setAttendanceRecords] = useState<any[]>([]);
  const [loadingAttendance, setLoadingAttendance] = useState(false);
`;
code = code.replace(oldState, newState);

// 2. Add fetch methods
const oldFetchMethod = `  const fetchHistory = async (lesson: any) => {`;
const newFetchMethod = `
  const fetchSessions = async (lesson: any) => {
    setAssignLesson(lesson);
    setSessionsDialogOpen(true);
    setLoadingSessions(true);
    try {
      const res = await api.get(\`/faculty-portal/lessons/\${lesson.id}/sessions\`);
      setLessonSessions(res.data.data || []);
    } catch (err: any) {
      toast.error('Failed to load sessions');
    } finally {
      setLoadingSessions(false);
    }
  };

  const fetchAttendance = async (sessionId: string) => {
    setAttendanceSessionId(sessionId);
    setViewAttendanceDialogOpen(true);
    setLoadingAttendance(true);
    try {
      const res = await api.get(\`/faculty-portal/sessions/\${sessionId}/students\`);
      setAttendanceRecords(res.data.data || []);
    } catch (err: any) {
      toast.error('Failed to load attendance');
    } finally {
      setLoadingAttendance(false);
    }
  };

` + oldFetchMethod;
code = code.replace(oldFetchMethod, newFetchMethod);

// 3. Add Sessions button
const oldButton = `                              <Button variant="ghost" size="sm" onClick={() => fetchHistory(lesson)} className="h-7 text-xs text-slate-600 hover:text-slate-800 hover:bg-slate-100">
                                <Clock className="w-3.5 h-3.5 mr-1" /> History
                              </Button>`;
const newButton = oldButton + `
                              <Button variant="ghost" size="sm" onClick={() => fetchSessions(lesson)} className="h-7 text-xs text-orange-600 hover:text-orange-700 hover:bg-orange-50 border border-orange-200 bg-white shadow-sm px-3 ml-1">
                                <Users className="w-3.5 h-3.5 mr-1" /> Sessions
                              </Button>`;
code = code.replace(oldButton, newButton);

// 4. Add Dialogs
const dialogsToAppend = `
      {/* Sessions Dialog */}
      <Dialog open={sessionsDialogOpen} onOpenChange={setSessionsDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Past & Ongoing Sessions</DialogTitle>
            <p className="text-sm text-muted-foreground">Sessions for: <span className="font-semibold text-foreground">{assignLesson?.title}</span></p>
          </DialogHeader>
          <div className="pt-4 pb-2 px-1 space-y-3">
            {loadingSessions ? (
              <div className="py-12 text-center text-muted-foreground flex items-center justify-center gap-2">
                <Loader2 className="w-5 h-5 animate-spin" /> Loading sessions...
              </div>
            ) : lessonSessions.length === 0 ? (
              <div className="py-12 text-center text-muted-foreground">
                <p>No sessions recorded yet.</p>
              </div>
            ) : (
              lessonSessions.map(session => (
                <div key={session.id} className="flex flex-col sm:flex-row sm:items-center justify-between p-3 bg-slate-50 border rounded-lg gap-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <h4 className="font-semibold">{session.academicBatch?.name}</h4>
                      <Badge variant={session.status === 'COMPLETED' ? 'outline' : 'default'} className={session.status === 'IN_PROGRESS' ? 'bg-red-500 text-white animate-pulse' : ''}>
                        {session.status}
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground mt-1">Teacher: {session.faculty?.name || 'Unknown'}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {new Date(session.createdAt).toLocaleDateString()} at {new Date(session.createdAt).toLocaleTimeString()}
                    </p>
                  </div>
                  <div>
                    {session.status === 'COMPLETED' && (
                      <Button variant="outline" size="sm" onClick={() => fetchAttendance(session.id)}>
                        View Attendance
                      </Button>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* View Attendance Dialog */}
      <Dialog open={viewAttendanceDialogOpen} onOpenChange={setViewAttendanceDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Session Attendance</DialogTitle>
          </DialogHeader>
          <div className="pt-4 pb-2 px-1 space-y-2">
            {loadingAttendance ? (
              <div className="py-12 text-center flex items-center justify-center">
                <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
              </div>
            ) : attendanceRecords.length === 0 ? (
              <div className="py-8 text-center text-muted-foreground">No students found.</div>
            ) : (
              attendanceRecords.map((record: any) => (
                <div key={record.student?.id} className="flex items-center justify-between p-2 border-b last:border-0">
                  <div>
                    <p className="font-medium">{record.student?.studentName || record.student?.name}</p>
                    <p className="text-xs text-muted-foreground">{record.student?.admissionNumber || record.student?.enrollmentNo}</p>
                  </div>
                  <Badge variant={
                    record.attendance?.status === 'PRESENT' ? 'default' :
                    record.attendance?.status === 'ABSENT' ? 'destructive' :
                    record.attendance?.status === 'LATE' ? 'secondary' : 'outline'
                  }>
                    {record.attendance?.status || 'UNMARKED'}
                  </Badge>
                </div>
              ))
            )}
          </div>
        </DialogContent>
      </Dialog>
`;

const insertionPoint = `      {/* History Dialog with Simple Timeline */}`;
code = code.replace(insertionPoint, dialogsToAppend + "\n" + insertionPoint);

fs.writeFileSync(path, code);
console.log('Patched FacultyClassContentPanel');
