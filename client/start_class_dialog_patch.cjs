const fs = require('fs');
const path = './src/components/panels/FacultyClassContentPanel.tsx';

let code = fs.readFileSync(path, 'utf8');

if (!code.includes('StartClassDialog')) {
  // Add state variables
  code = code.replace(
    '  const [historyDialogOpen, setHistoryDialogOpen] = useState(false);',
    `  // Start Class Modal
  const [startClassDialogOpen, setStartClassDialogOpen] = useState(false);
  const [startClassLesson, setStartClassLesson] = useState<any>(null);
  const [startClassBatchId, setStartClassBatchId] = useState<string>('');
  
  const [historyDialogOpen, setHistoryDialogOpen] = useState(false);`
  );

  // Add handleStartClass API call
  const startClassFunc = `
  const handleStartClassSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!startClassBatchId) return toast.error('Please select a batch');
    
    // determine faculty for this batch
    const existingAssignment = startClassLesson?.batchAssignments?.find((ba: any) => ba.academicBatchId === startClassBatchId);
    const facultyId = existingAssignment?.facultyId || startClassLesson?.facultyId;
    
    if (!facultyId) return toast.error('No teacher assigned to this lesson/batch');

    try {
      await api.post('/faculty-portal/sessions/start', {
        academicClassId: academicClass.id,
        classModuleId: startClassLesson.classModuleId,
        moduleLessonId: startClassLesson.id,
        academicBatchId: startClassBatchId,
        facultyId: facultyId
      });
      toast.success('Class session started successfully!');
      setStartClassDialogOpen(false);
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to start class');
    }
  };
`;

  code = code.replace('  // --- MODULE ACTIONS ---', startClassFunc + '\n  // --- MODULE ACTIONS ---');

  // Add button to the UI
  code = code.replace(
    '<Clock className="w-3.5 h-3.5 mr-1" /> History\n                              </Button>',
    `<Clock className="w-3.5 h-3.5 mr-1" /> History
                              </Button>
                              <Button variant="ghost" size="sm" onClick={() => { 
                                setStartClassLesson(lesson); 
                                setStartClassBatchId('');
                                setStartClassDialogOpen(true); 
                              }} className="h-7 text-xs text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 border border-emerald-200 bg-white shadow-sm px-3 ml-1">
                                <Play className="w-3.5 h-3.5 mr-1.5" /> Start Class
                              </Button>`
  );
  
  // import Play
  code = code.replace('Clock }', 'Clock, Play }');

  // Add Dialog
  const dialogCode = `
      {/* Start Class Dialog */}
      <Dialog open={startClassDialogOpen} onOpenChange={setStartClassDialogOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Start Live Class</DialogTitle></DialogHeader>
          <form onSubmit={handleStartClassSubmit} className="space-y-4 pt-4">
            <div className="space-y-2">
              <Label>Select Batch *</Label>
              <Select value={startClassBatchId} onValueChange={setStartClassBatchId}>
                <SelectTrigger className="w-full"><SelectValue placeholder="Select a batch" /></SelectTrigger>
                <SelectContent>
                  {batches.map(b => (
                    <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            {startClassBatchId && startClassLesson && (
              <div className="p-3 bg-muted rounded-md text-sm">
                <strong>Assigned Teacher:</strong> {
                  (() => {
                    const ba = startClassLesson.batchAssignments?.find((x: any) => x.academicBatchId === startClassBatchId);
                    const fId = ba?.facultyId || startClassLesson.facultyId;
                    const f = facultyList.find(x => x.id === fId);
                    return f ? f.name : <span className="text-red-500 font-bold">Unassigned</span>;
                  })()
                }
              </div>
            )}

            <div className="flex justify-end gap-2 pt-4 border-t mt-4">
              <Button type="button" variant="outline" onClick={() => setStartClassDialogOpen(false)}>Cancel</Button>
              <Button type="submit" className="bg-emerald-600 hover:bg-emerald-700">Start Session</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
`;
  code = code.replace('{/* Assign Teacher Dialog */}', dialogCode + '\n      {/* Assign Teacher Dialog */}');

  fs.writeFileSync(path, code);
  console.log("Patched successfully");
} else {
  console.log("Already patched");
}
