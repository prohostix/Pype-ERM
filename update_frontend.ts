import fs from 'fs';

let content = fs.readFileSync('client/src/components/panels/AcademicBatchesPanel.tsx', 'utf-8');

// Add imports
if (!content.includes('ArrowRightLeft')) {
  content = content.replace(/Users,/, 'Users, ArrowRightLeft, History, Clock,');
}
if (!content.includes('Select, SelectContent, SelectItem, SelectTrigger, SelectValue')) {
  content = content.replace(/} from '\@\/components\/ui\/select';/, ', Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from \'@/components/ui/select\';');
}

// Add state
const stateInsert = `  const [transferDialogOpen, setTransferDialogOpen] = useState(false);
  const [transferStudent, setTransferStudent] = useState<any | null>(null);
  const [transferToBatchId, setTransferToBatchId] = useState('');
  const [transferReason, setTransferReason] = useState('');
  const [historyDialogOpen, setHistoryDialogOpen] = useState(false);
  const [transferHistory, setTransferHistory] = useState<any[]>([]);`;

if (!content.includes('transferDialogOpen')) {
  content = content.replace(/(const \[selectedStudentIds, setSelectedStudentIds\] = useState<string\[\]>\(\[\]\);)/, `$1\n${stateInsert}`);
}

// Add Handlers
const handlersInsert = `
  const handleTransfer = async () => {
    if (!transferToBatchId) return toast.error('Please select a destination batch');
    try {
      await api.post(\`/academic-batches/\${activeBatch.id}/transfer\`, {
        studentId: transferStudent.id,
        toBatchId: transferToBatchId,
        reason: transferReason
      });
      toast.success('Student transferred successfully');
      setTransferDialogOpen(false);
      setTransferStudent(null);
      setTransferToBatchId('');
      setTransferReason('');
      fetchBatches();
      // Refresh allocation dialog stats if still open
      const statsRes = await api.get(\`/academic-batches/\${activeBatch.id}/students\`);
      setBatchStats(statsRes.data.data);
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to transfer student');
    }
  };

  const openHistoryModal = async () => {
    setHistoryDialogOpen(true);
    try {
      const res = await api.get(\`/academic-classes/\${classId}/transfer-history\`);
      setTransferHistory(res.data.data);
    } catch (err: any) {
      toast.error('Failed to load transfer history');
    }
  };
`;

if (!content.includes('handleTransfer')) {
  content = content.replace(/(\/\/ Allocation Handlers)/, `${handlersInsert}\n$1`);
}

// Add History Button to header
const historyBtnInsert = `
        {canWrite && (
          <Button onClick={openHistoryModal} variant="outline" className="mr-2">
            <History className="w-4 h-4 mr-2" /> Transfer History
          </Button>
        )}
`;

if (!content.includes('Transfer History')) {
  content = content.replace(/(<Button onClick=\{resetForm\}>)/, `${historyBtnInsert}\n        $1`);
}

// Add Transfer button in enrolled list
const transferBtnInsert = `
                            {canWrite && (
                              <Button 
                                type="button" 
                                variant="ghost" 
                                size="sm" 
                                className="h-8 text-xs shrink-0" 
                                onClick={() => {
                                  setTransferStudent(student);
                                  setTransferDialogOpen(true);
                                }}
                              >
                                <ArrowRightLeft className="w-3 h-3 mr-1" /> Transfer
                              </Button>
                            )}
`;

if (!content.includes('ArrowRightLeft className="w-3 h-3 mr-1"')) {
  content = content.replace(/(<p className="text-xs text-muted-foreground">ID: \{student\.enrollmentNo \|\| 'N\/A'\}<\/p>\s*<\/div>)/, `$1\n${transferBtnInsert}`);
}

// Add Modals at the end of the file
const modalsInsert = `
      {/* Transfer Dialog */}
      <Dialog open={transferDialogOpen} onOpenChange={setTransferDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Transfer Student</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-4">
            <div>
              <Label>Student</Label>
              <div className="font-medium p-2 bg-muted/50 rounded-md mt-1">{transferStudent?.name} ({transferStudent?.enrollmentNo})</div>
            </div>
            <div>
              <Label>Destination Batch</Label>
              <Select value={transferToBatchId} onValueChange={setTransferToBatchId}>
                <SelectTrigger className="mt-1">
                  <SelectValue placeholder="Select target batch" />
                </SelectTrigger>
                <SelectContent>
                  {batches.filter(b => b.id !== activeBatch?.id).map(b => (
                    <SelectItem key={b.id} value={b.id}>{b.name} (Capacity: {b.capacity ? b.capacity : 'Unlimited'})</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Reason (Optional)</Label>
              <Input value={transferReason} onChange={e => setTransferReason(e.target.value)} placeholder="Reason for transfer" className="mt-1" />
            </div>
          </div>
          <DialogFooter className="mt-6">
            <Button variant="outline" onClick={() => setTransferDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleTransfer}>Confirm Transfer</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* History Dialog */}
      <Dialog open={historyDialogOpen} onOpenChange={setHistoryDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[80vh] flex flex-col">
          <DialogHeader className="shrink-0">
            <DialogTitle className="flex items-center gap-2"><History className="w-5 h-5 text-teal-600" /> Transfer History</DialogTitle>
          </DialogHeader>
          <div className="overflow-y-auto p-2 flex-1 custom-scrollbar">
            {transferHistory.length === 0 ? (
              <div className="text-center p-8 text-muted-foreground">No transfers have occurred in this class yet.</div>
            ) : (
              <div className="space-y-4">
                {transferHistory.map((log: any) => (
                  <div key={log.id} className="border border-border/50 bg-muted/20 p-4 rounded-xl flex items-start gap-4">
                    <div className="bg-white dark:bg-slate-800 p-2 rounded-full shadow-sm shrink-0">
                      <Clock className="w-4 h-4 text-slate-500" />
                    </div>
                    <div className="flex-1 text-sm">
                      <p><strong>{log.student?.name}</strong> was transferred from <strong>{log.fromBatch?.name}</strong> to <strong>{log.toBatch?.name}</strong>.</p>
                      {log.reason && <p className="text-muted-foreground italic mt-1">"{log.reason}"</p>}
                      <div className="flex items-center gap-2 mt-2 text-xs text-muted-foreground">
                        <span>By {log.transferredBy?.name}</span>
                        <span>•</span>
                        <span>{new Date(log.createdAt).toLocaleString()}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
`;

if (!content.includes('Transfer Dialog')) {
  content = content.replace(/(<\/div>\s*)$/, `${modalsInsert}\n$1`);
}

fs.writeFileSync('client/src/components/panels/AcademicBatchesPanel.tsx', content);

