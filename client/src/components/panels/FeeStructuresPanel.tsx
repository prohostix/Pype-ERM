import { useState, useEffect } from 'react';
import { Plus, Edit, Trash2, DollarSign } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import api from '@/lib/api';
import { toast } from 'sonner';

export function FeeStructuresPanel() {
  const [fees, setFees] = useState<any[]>([]);
  const [programs, setPrograms] = useState<any[]>([]);
  const [sessions, setSessions] = useState<any[]>([]);
  const [universities, setUniversities] = useState<any[]>([]);
  const [selectedUniversityId, setSelectedUniversityId] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    programId: '',
    sessionId: 'standard_all',
    registrationFee: '0',
    tuitionFee: '0',
    examFee: '0',
    gstPercentage: '18',
    billingCycle: 'per_year',
    currency: 'INR',
    effectiveFrom: '',
    additionalFees: ''
  });

  useEffect(() => {
    fetchFees();
    fetchPrograms();
    fetchSessions();
    fetchUniversities();
  }, []);

  const fetchFees = async () => {
    setLoading(true);
    try {
      const res = await api.get('/finance/fees');
      setFees(res.data.data || []);
    } catch (err) {
      console.error('Failed to fetch fees:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchPrograms = async () => {
    try {
      const res = await api.get('/operations/programs');
      setPrograms(res.data.data || []);
    } catch (err) {
      console.error('Failed to fetch programs:', err);
    }
  };

  const fetchSessions = async () => {
    try {
      const res = await api.get('/operations/sessions');
      setSessions(res.data.data || []);
    } catch (err) {
      console.error('Failed to fetch sessions:', err);
    }
  };

  const fetchUniversities = async () => {
    try {
      const res = await api.get('/operations/universities');
      setUniversities(res.data.data || []);
    } catch (err) {
      console.error('Failed to fetch universities:', err);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const additionalFees = formData.additionalFees
      ? formData.additionalFees.split(',').map(s => {
          const [label, amount] = s.trim().split(':');
          return { label: label?.trim(), amount: Number(amount) };
        }).filter(f => f.label && !isNaN(f.amount))
      : [];

    const payload = {
      programId: formData.programId,
      sessionId: formData.sessionId === 'standard_all' || !formData.sessionId ? null : formData.sessionId,
      registrationFee: Number(formData.registrationFee),
      tuitionFee: Number(formData.tuitionFee),
      examFee: Number(formData.examFee),
      gstPercentage: Number(formData.gstPercentage),
      billingCycle: formData.billingCycle,
      currency: formData.currency,
      effectiveFrom: formData.effectiveFrom || null,
      additionalFees
    };

    try {
      if (editingId) {
        await api.put(`/finance/fees/${editingId}`, payload);
        toast.success('Fee structure updated successfully');
      } else {
        await api.post('/finance/fees', payload);
        toast.success('Fee structure created successfully');
      }
      setDialogOpen(false);
      resetForm();
      fetchFees();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to save fee structure');
    }
  };

  const handleEdit = (f: any) => {
    const progId = typeof f.programId === 'object' ? (f.programId?.id || f.programId?.id) : f.programId;
    const sessId = typeof f.sessionId === 'object' ? (f.sessionId?.id || f.sessionId?.id) : f.sessionId;
    const addFeesStr = Array.isArray(f.additionalFees)
      ? f.additionalFees.map((af: any) => `${af.label}:${af.amount}`).join(', ')
      : '';

    const programObj = programs.find(p => p.id === progId);
    const univId = programObj?.universityId || '';
    setSelectedUniversityId(univId);

    setEditingId(f.id);
    setFormData({
      programId: progId?.toString() || '',
      sessionId: sessId?.toString() || 'standard_all',
      registrationFee: f.registrationFee?.toString() || '0',
      tuitionFee: f.tuitionFee?.toString() || '0',
      examFee: f.examFee?.toString() || '0',
      gstPercentage: f.gstPercentage?.toString() || '18',
      billingCycle: f.billingCycle || 'per_year',
      currency: f.currency || 'INR',
      effectiveFrom: f.effectiveFrom ? f.effectiveFrom.slice(0, 10) : '',
      additionalFees: addFeesStr
    });
    setDialogOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this fee structure?')) return;
    try {
      await api.delete(`/finance/fees/${id}`);
      toast.success('Fee structure deleted successfully');
      fetchFees();
    } catch (err) {
      console.error('Failed to delete fee structure:', err);
    }
  };

  const resetForm = () => {
    setEditingId(null);
    setSelectedUniversityId('');
    setFormData({
      programId: '',
      sessionId: 'standard_all',
      registrationFee: '0',
      tuitionFee: '0',
      examFee: '0',
      gstPercentage: '18',
      billingCycle: 'per_year',
      currency: 'INR',
      effectiveFrom: '',
      additionalFees: ''
    });
  };

  // Filter programs based on selected university
  const filteredPrograms = selectedUniversityId
    ? programs.filter(p => p.universityId === selectedUniversityId)
    : [];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Fee Structure Management</h2>
          <p className="text-muted-foreground">Manage program fees and billing structures</p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={(open) => { setDialogOpen(open); if (!open) resetForm(); }}>
          <DialogTrigger asChild>
            <Button><Plus className="w-4 h-4 mr-2" />Add Fee Structure</Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>{editingId ? 'Edit Fee Structure' : 'Add New Fee Structure'}</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label>University</Label>
                <Select value={selectedUniversityId} onValueChange={(v) => { setSelectedUniversityId(v); setFormData({ ...formData, programId: '' }); }}>
                  <SelectTrigger><SelectValue placeholder="Select university first" /></SelectTrigger>
                  <SelectContent>
                    {universities.filter(u => u && u.id).map((u) => (
                      <SelectItem key={u.id} value={u.id.toString()}>
                        {u.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>Program</Label>
                <Select value={formData.programId} onValueChange={(v) => setFormData({ ...formData, programId: v })} disabled={!selectedUniversityId}>
                  <SelectTrigger><SelectValue placeholder={selectedUniversityId ? "Select program" : "Select university first"}/></SelectTrigger>
                  <SelectContent>
                    {filteredPrograms.map((p) => (
                      <SelectItem key={p.id} value={p.id.toString()}>
                        {p.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>Admission Session</Label>
                <Select value={formData.sessionId} onValueChange={(v) => setFormData({ ...formData, sessionId: v })}>
                  <SelectTrigger><SelectValue placeholder="Standard / All Sessions" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="standard_all">Standard / All Sessions</SelectItem>
                    {sessions.filter(s => s && s.id).map((s) => (
                      <SelectItem key={s.id} value={s.id}>
                        {s.name} ({s.status})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Billing Cycle</Label>
                  <Select value={formData.billingCycle} onValueChange={(v) => setFormData({ ...formData, billingCycle: v })}>
                    <SelectTrigger><SelectValue placeholder="Billing Cycle" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="per_semester">Per Semester</SelectItem>
                      <SelectItem value="per_year">Per Year</SelectItem>
                      <SelectItem value="total">Total (one-time)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Currency</Label>
                  <Input value={formData.currency} onChange={(e) => setFormData({ ...formData, currency: e.target.value })} required placeholder="INR" />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Registration Fee</Label>
                  <Input type="number" min="0" value={formData.registrationFee} onChange={(e) => setFormData({ ...formData, registrationFee: e.target.value })} required />
                </div>
                <div>
                  <Label>Tuition / Base Fee</Label>
                  <Input type="number" min="0" value={formData.tuitionFee} onChange={(e) => setFormData({ ...formData, tuitionFee: e.target.value })} required />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Exam Fee</Label>
                  <Input type="number" min="0" value={formData.examFee} onChange={(e) => setFormData({ ...formData, examFee: e.target.value })} required />
                </div>
                <div>
                  <Label>GST %</Label>
                  <Input type="number" min="0" max="100" value={formData.gstPercentage} onChange={(e) => setFormData({ ...formData, gstPercentage: e.target.value })} required />
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4">
                <div>
                  <Label>Effective From</Label>
                  <Input type="date" value={formData.effectiveFrom} onChange={(e) => setFormData({ ...formData, effectiveFrom: e.target.value })} />
                </div>
                <div>
                  <Label>Additional Fees <span className="text-muted-foreground text-xs">(label:amount, comma-separated)</span></Label>
                  <Input value={formData.additionalFees} onChange={(e) => setFormData({ ...formData, additionalFees: e.target.value })} placeholder="Registration:500, Exam:200" />
                </div>
              </div>

              <div className="flex gap-2">
                <Button type="submit" className="flex-1">Save</Button>
                <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader><CardTitle>Fee Structures</CardTitle></CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8">Loading...</div>
          ) : fees.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">No fee structures found</div>
          ) : (
            <div className="space-y-2">
              {fees.filter(f => f && f.id).map((f) => {
                const fid = f.id;
                const progName = typeof f.programId === 'object' ? f.programId?.name : (f.program?.name || '');
                const univName = typeof f.programId === 'object' ? f.programId?.university?.name : (f.program?.university?.name || '');
                const sessionName = f.session?.name || '';
                const total = (f.registrationFee || 0) + (f.tuitionFee || 0) + (f.examFee || 0);
                
                return (
                  <div key={fid} className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50">
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center">
                        <DollarSign className="w-5 h-5 text-green-600" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="font-medium">
                          {progName || 'Unknown Program'} 
                          {univName && <span className="text-sm text-muted-foreground ml-1">({univName})</span>}
                          {sessionName && (
                            <span className="text-xs bg-muted text-muted-foreground rounded-full px-2 py-0.5 ml-2 font-normal">
                              {sessionName}
                            </span>
                          )}
                        </div>
                        <div className="text-sm text-muted-foreground mt-1 flex flex-wrap gap-2 items-center">
                          <Badge variant="outline">{f.currency || 'INR'} {total.toLocaleString()} total</Badge>
                          <span className="text-xs">Reg: {f.registrationFee} • Tuition: {f.tuitionFee} • Exam: {f.examFee} • GST: {f.gstPercentage}%</span>
                          <Badge variant="secondary" className="capitalize text-xs">{f.billingCycle?.replace('_', ' ') || 'Per Year'}</Badge>
                        </div>
                        {Array.isArray(f.additionalFees) && f.additionalFees.length > 0 && (
                          <div className="flex items-center gap-2 mt-2 flex-wrap">
                            <span className="text-xs text-muted-foreground">Additional:</span>
                            {f.additionalFees.map((af: any, idx: number) => (
                              <Badge key={idx} variant="outline" className="text-[10px]">{af.label}: {af.amount}</Badge>
                            ))}
                          </div>
                        )}
                        {f.effectiveFrom && (
                          <div className="text-[11px] text-muted-foreground mt-1">
                            Effective From: {new Date(f.effectiveFrom).toLocaleDateString()}
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button variant="ghost" size="sm" onClick={() => handleEdit(f)}><Edit className="w-4 h-4" /></Button>
                      <Button variant="ghost" size="sm" onClick={() => handleDelete(fid)}><Trash2 className="w-4 h-4" /></Button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
