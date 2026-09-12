import fs from 'fs';

let content = fs.readFileSync('client/src/components/panels/AcademicBatchesPanel.tsx', 'utf-8');

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
            <DialogTitle className="flex items-center gap-2"><History className="w-5 h-5 text-teal-600" /> Transfer & Allocation History</DialogTitle>
          </DialogHeader>
          <div className="overflow-y-auto p-2 flex-1 custom-scrollbar">
            {transferHistory.length === 0 ? (
              <div className="text-center p-8 text-muted-foreground">No transfers or allocations have occurred in this class yet.</div>
            ) : (
              <div className="space-y-4">
                {transferHistory.map((log: any) => (
                  <div key={log.id} className="border border-border/50 bg-muted/20 p-4 rounded-xl flex items-start gap-4">
                    <div className="bg-white dark:bg-slate-800 p-2 rounded-full shadow-sm shrink-0">
                      <Clock className="w-4 h-4 text-slate-500" />
                    </div>
                    <div className="flex-1 text-sm">
                      {log.fromBatch ? (
                        <p><strong>{log.student?.name}</strong> was transferred from <strong>{log.fromBatch?.name}</strong> to <strong>{log.toBatch?.name}</strong>.</p>
                      ) : (
                        <p><strong>{log.student?.name}</strong> was allocated to <strong>{log.toBatch?.name}</strong>.</p>
                      )}
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
  content = content.replace(/(<\/div>\s*);\s*\}\s*)$/, `${modalsInsert}\n$1`);
  fs.writeFileSync('client/src/components/panels/AcademicBatchesPanel.tsx', content);
}
