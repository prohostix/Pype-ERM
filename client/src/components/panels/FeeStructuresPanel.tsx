import { useState, useEffect } from 'react';
import { Plus, Edit, Trash2, DollarSign, Search, X } from 'lucide-react';
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
    universityId: '',
    feeLevel: 'program' as 'program' | 'university',
    sessionId: 'standard_all',
    registrationFee: '0',
    tuitionFee: '0',
    examFee: '0',
    universityFee: '0',
    commissionRate: '0',
    gstPercentage: '18',
    billingCycle: 'per_year',
    currency: 'INR',
    effectiveFrom: '',
    additionalFees: ''
  });
  const [yearlyFees, setYearlyFees] = useState<any[]>([]);
  const [sortBy, setSortBy] = useState<'university' | 'program' | 'session' | 'total_fee'>('program');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
  // Filter bar state
  const [filterUniversity, setFilterUniversity] = useState<string>('all');
  const [filterProgram, setFilterProgram] = useState<string>('all');
  const [filterSession, setFilterSession] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');

  useEffect(() => {
    if (formData.programId && (formData.billingCycle === 'per_year' || formData.billingCycle === 'per_semester')) {
      const prog = programs.find(p => p.id === formData.programId);
      const durationMonths = prog?.duration || 12;
      let periodsCount = 0;
      let periodNames: string[] = [];

      if (formData.billingCycle === 'per_semester' && prog?.hasSemesters && Array.isArray(prog.semesters) && prog.semesters.length > 0) {
        periodsCount = prog.semesters.length;
        periodNames = prog.semesters.map((s: any) => s.name);
      } else if (formData.billingCycle === 'per_semester') {
        periodsCount = Math.ceil(durationMonths / 6);
        periodNames = Array.from({ length: periodsCount }, (_, i) => `Semester ${i + 1}`);
      } else {
        periodsCount = Math.ceil(durationMonths / 12);
        periodNames = Array.from({ length: periodsCount }, (_, i) => `Year ${i + 1}`);
      }

      setYearlyFees(prev => {
        const next = [...prev];
        while (next.length < periodsCount) {
          next.push({
            year: next.length + 1,
            registrationFee: '0',
            tuitionFee: '0',
            universityFee: '0',
            examFee: '0',
            commissionRate: '0'
          });
        }
        const synced = next.slice(0, periodsCount).map((item, idx) => ({
          ...item,
          year: idx + 1,
          periodName: periodNames[idx] || (formData.billingCycle === 'per_year' ? `Year ${idx + 1}` : `Semester ${idx + 1}`)
        }));
        return synced;
      });
    } else {
      setYearlyFees([]);
    }
  }, [formData.programId, formData.billingCycle, programs]);

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

    const formattedYearlyFees = yearlyFees.map(yf => ({
      year: Number(yf.year),
      registrationFee: Number(yf.registrationFee || 0),
      tuitionFee: Number(yf.tuitionFee || 0),
      universityFee: Number(yf.universityFee || 0),
      examFee: Number(yf.examFee || 0),
      commissionRate: Number(yf.commissionRate || 0)
    }));

    const payload: any = {
      feeLevel: formData.feeLevel,
      sessionId: formData.sessionId === 'standard_all' || !formData.sessionId ? null : formData.sessionId,
      registrationFee: Number(formData.registrationFee),
      tuitionFee: Number(formData.tuitionFee),
      examFee: Number(formData.examFee),
      universityFee: Number(formData.universityFee),
      commissionRate: Number(formData.commissionRate),
      yearlyFees: formattedYearlyFees,
      gstPercentage: Number(formData.gstPercentage),
      billingCycle: formData.billingCycle,
      currency: formData.currency,
      effectiveFrom: formData.effectiveFrom || null,
      additionalFees
    };

    if (!formData.programId) { toast.error('Please select a Program'); return; }
    payload.programId = formData.programId;
    payload.universityId = selectedUniversityId;

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
    const feeLevelVal = f.feeLevel || (f.universityId && !f.programId ? 'university' : 'program');
    const universityIdVal = f.universityId || univId || '';
    setSelectedUniversityId(universityIdVal);

    const savedYearlyFees = Array.isArray(f.yearlyFees) ? f.yearlyFees : [];
    setYearlyFees(savedYearlyFees.map((yf: any) => ({
      year: yf.year,
      registrationFee: yf.registrationFee?.toString() || '0',
      tuitionFee: yf.tuitionFee?.toString() || '0',
      universityFee: yf.universityFee?.toString() || '0',
      examFee: yf.examFee?.toString() || '0',
      commissionRate: yf.commissionRate?.toString() || '0'
    })));

    setEditingId(f.id);
    setFormData({
      programId: progId?.toString() || '',
      universityId: universityIdVal?.toString() || '',
      feeLevel: feeLevelVal as 'program' | 'university',
      sessionId: sessId?.toString() || 'standard_all',
      registrationFee: f.registrationFee?.toString() || '0',
      tuitionFee: f.tuitionFee?.toString() || '0',
      examFee: f.examFee?.toString() || '0',
      universityFee: f.universityFee?.toString() || '0',
      commissionRate: f.commissionRate?.toString() || '0',
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
    setYearlyFees([]);
    setFormData({
      programId: '',
      universityId: '',
      feeLevel: 'program',
      sessionId: 'standard_all',
      registrationFee: '0',
      tuitionFee: '0',
      examFee: '0',
      universityFee: '0',
      commissionRate: '0',
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
          <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{editingId ? 'Edit Fee Structure' : 'Add New Fee Structure'}</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label>University <span className="text-rose-500">*</span></Label>
                <Select value={selectedUniversityId} onValueChange={(v) => { setSelectedUniversityId(v); setFormData({ ...formData, programId: '', universityId: v }); }}>
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
                <Label>Program <span className="text-rose-500">*</span></Label>
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

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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

              {(formData.billingCycle === 'per_year' || formData.billingCycle === 'per_semester') && yearlyFees.length > 0 ? (
                <div className="space-y-4 border-t pt-4">
                  <h3 className="font-semibold text-sm">
                    {formData.billingCycle === 'per_year' ? 'Yearly' : 'Semester'} Fee Breakdown ({yearlyFees.length} {formData.billingCycle === 'per_year' ? 'Years' : 'Semesters'})
                  </h3>
                  {yearlyFees.map((yf, idx) => (
                    <Card key={yf.year} className="bg-muted/20 border">
                      <CardContent className="p-4 space-y-3">
                        <h4 className="font-medium text-xs text-primary">{yf.periodName}</h4>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          <div>
                            <Label className="text-[10px] uppercase">Registration Fee</Label>
                            <Input type="number" min="0" value={yf.registrationFee} onChange={(e) => {
                              const updated = [...yearlyFees];
                              updated[idx].registrationFee = e.target.value;
                              setYearlyFees(updated);
                            }} required />
                          </div>
                          <div>
                            <Label className="text-[10px] uppercase">Tuition / Base Fee</Label>
                            <Input type="number" min="0" value={yf.tuitionFee} onChange={(e) => {
                              const updated = [...yearlyFees];
                              updated[idx].tuitionFee = e.target.value;
                              setYearlyFees(updated);
                            }} required />
                          </div>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                          <div>
                            <Label className="text-[10px] uppercase">University Fee</Label>
                            <Input type="number" min="0" value={yf.universityFee} onChange={(e) => {
                              const updated = [...yearlyFees];
                              updated[idx].universityFee = e.target.value;
                              setYearlyFees(updated);
                            }} required />
                          </div>
                          <div>
                            <Label className="text-[10px] uppercase">Exam Fee</Label>
                            <Input type="number" min="0" value={yf.examFee} onChange={(e) => {
                              const updated = [...yearlyFees];
                              updated[idx].examFee = e.target.value;
                              setYearlyFees(updated);
                            }} required />
                          </div>
                          <div>
                            <Label className="text-[10px] uppercase">Commission Rate (%)</Label>
                            <Input type="number" min="0" max="100" value={yf.commissionRate} onChange={(e) => {
                              const updated = [...yearlyFees];
                              updated[idx].commissionRate = e.target.value;
                              setYearlyFees(updated);
                            }} required />
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              ) : (
                <>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <Label>Registration Fee</Label>
                      <Input type="number" min="0" value={formData.registrationFee} onChange={(e) => setFormData({ ...formData, registrationFee: e.target.value })} required />
                    </div>
                    <div>
                      <Label>Tuition / Base Fee</Label>
                      <Input type="number" min="0" value={formData.tuitionFee} onChange={(e) => setFormData({ ...formData, tuitionFee: e.target.value })} required />
                    </div>
                    <div>
                      <Label>University Fee</Label>
                      <Input type="number" min="0" value={formData.universityFee} onChange={(e) => setFormData({ ...formData, universityFee: e.target.value })} required />
                    </div>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <Label>Exam Fee</Label>
                      <Input type="number" min="0" value={formData.examFee} onChange={(e) => setFormData({ ...formData, examFee: e.target.value })} required />
                    </div>
                    <div>
                      <Label>GST %</Label>
                      <Input type="number" min="0" max="100" value={formData.gstPercentage} onChange={(e) => setFormData({ ...formData, gstPercentage: e.target.value })} required />
                    </div>
                    <div>
                      <Label>Commission Rate (%)</Label>
                      <Input type="number" min="0" max="100" value={formData.commissionRate} onChange={(e) => setFormData({ ...formData, commissionRate: e.target.value })} required />
                    </div>
                  </div>
                </>
              )}

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
        <CardHeader className="space-y-3 pb-3">
          <CardTitle>Fee Structures</CardTitle>

          {/* Search bar */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              className="pl-9 h-9 text-sm"
              placeholder="Search by program, university or session..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            {searchQuery && (
              <button
                type="button"
                className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                onClick={() => setSearchQuery('')}
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* Filter + Sort row */}
          <div className="flex flex-wrap items-center gap-2">
            {/* University filter */}
            <Select value={filterUniversity} onValueChange={setFilterUniversity}>
              <SelectTrigger className="h-8 text-xs w-40">
                <SelectValue placeholder="All Universities" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Universities</SelectItem>
                {universities.filter(u => u?.id).map(u => (
                  <SelectItem key={u.id} value={u.id}>{u.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Program filter */}
            <Select value={filterProgram} onValueChange={setFilterProgram}>
              <SelectTrigger className="h-8 text-xs w-36">
                <SelectValue placeholder="All Programs" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Programs</SelectItem>
                {programs.filter(p => p?.id).map(p => (
                  <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Session filter */}
            <Select value={filterSession} onValueChange={setFilterSession}>
              <SelectTrigger className="h-8 text-xs w-44">
                <SelectValue placeholder="All Sessions" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Sessions</SelectItem>
                {sessions.filter(s => s?.id).map(s => (
                  <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            <div className="h-4 w-px bg-border mx-1" />

            {/* Sort by */}
            <span className="text-xs text-muted-foreground">Sort:</span>
            <Select value={sortBy} onValueChange={(v: any) => setSortBy(v)}>
              <SelectTrigger className="h-8 text-xs w-36">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="university">University</SelectItem>
                <SelectItem value="program">Program</SelectItem>
                <SelectItem value="session">Session</SelectItem>
                <SelectItem value="total_fee">Total Fee</SelectItem>
              </SelectContent>
            </Select>
            <Select value={sortOrder} onValueChange={(v: any) => setSortOrder(v)}>
              <SelectTrigger className="h-8 text-xs w-24">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="asc">Asc ↑</SelectItem>
                <SelectItem value="desc">Desc ↓</SelectItem>
              </SelectContent>
            </Select>

            {/* Reset button — shown only when any filter is active */}
            {(filterUniversity !== 'all' || filterProgram !== 'all' || filterSession !== 'all' || searchQuery) && (
              <Button
                variant="ghost"
                size="sm"
                className="h-8 text-xs text-rose-500 hover:text-rose-600"
                onClick={() => {
                  setFilterUniversity('all');
                  setFilterProgram('all');
                  setFilterSession('all');
                  setSearchQuery('');
                }}
              >
                <X className="w-3 h-3 mr-1" /> Reset Filters
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8">Loading...</div>
          ) : fees.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">No fee structures found</div>
          ) : (
            <div className="space-y-2">
              {(() => {
                const getFeeTotals = (f: any) => {
                  let reg = Number(f.registrationFee) || 0;
                  let tui = Number(f.tuitionFee) || 0;
                  let ex = Number(f.examFee) || 0;
                  if ((f.billingCycle === 'per_year' || f.billingCycle === 'per_semester') && Array.isArray(f.yearlyFees) && f.yearlyFees.length > 0) {
                    reg = f.yearlyFees.reduce((sum: number, y: any) => sum + (Number(y.registrationFee) || 0), 0);
                    tui = f.yearlyFees.reduce((sum: number, y: any) => sum + (Number(y.tuitionFee) || 0), 0);
                    ex = f.yearlyFees.reduce((sum: number, y: any) => sum + (Number(y.examFee) || 0), 0);
                  }
                  return { reg, tui, ex, total: reg + tui + ex };
                };
                
                return [...fees]
                // --- Apply filters ---
                .filter(f => {
                  if (!f?.id) return false;
                  const progName = (typeof f.programId === 'object' ? f.programId?.name : f.program?.name) || '';
                  const univName = (typeof f.programId === 'object' ? f.programId?.university?.name : f.program?.university?.name) || f.university?.name || '';
                  const univId   = (typeof f.programId === 'object' ? f.programId?.universityId : f.program?.universityId) || f.universityId || '';
                  const progId   = (typeof f.programId === 'object' ? f.programId?.id : f.programId) || f.program?.id || '';
                  const sessId   = (typeof f.sessionId === 'object' ? f.sessionId?.id : f.sessionId) || f.session?.id || '';
                  const sessName = f.session?.name || '';

                  if (filterUniversity !== 'all' && univId !== filterUniversity) return false;
                  if (filterProgram   !== 'all' && progId !== filterProgram)   return false;
                  if (filterSession   !== 'all' && sessId !== filterSession)   return false;

                  if (searchQuery) {
                    const q = searchQuery.toLowerCase();
                    if (
                      !progName.toLowerCase().includes(q) &&
                      !univName.toLowerCase().includes(q) &&
                      !sessName.toLowerCase().includes(q)
                    ) return false;
                  }
                  return true;
                })
                // --- Sort ---
                .sort((a, b) => {
                  let comparison = 0;
                  if (sortBy === 'university') {
                    const aUniv = a.university?.name || (typeof a.programId === 'object' ? a.programId?.university?.name : a.program?.university?.name) || '';
                    const bUniv = b.university?.name || (typeof b.programId === 'object' ? b.programId?.university?.name : b.program?.university?.name) || '';
                    comparison = aUniv.localeCompare(bUniv);
                  } else if (sortBy === 'program') {
                    const aProg = typeof a.programId === 'object' ? a.programId?.name : (a.program?.name || '');
                    const bProg = typeof b.programId === 'object' ? b.programId?.name : (b.program?.name || '');
                    comparison = aProg.localeCompare(bProg);
                  } else if (sortBy === 'session') {
                    const aSess = a.session?.name || '';
                    const bSess = b.session?.name || '';
                    comparison = aSess.localeCompare(bSess);
                  } else if (sortBy === 'total_fee') {
                    const aTotals = getFeeTotals(a);
                    const bTotals = getFeeTotals(b);
                    comparison = aTotals.total - bTotals.total;
                  }
                  return sortOrder === 'asc' ? comparison : -comparison;
                })
                .map((f) => {
                  const fid = f.id;
                const progName = typeof f.programId === 'object' ? f.programId?.name : (f.program?.name || '');
                const univName = typeof f.programId === 'object' ? f.programId?.university?.name : (f.program?.university?.name || '');
                const sessionName = f.session?.name || '';
                const feeTotals = getFeeTotals(f);
                
                return (
                  <div key={fid} className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50">
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center">
                        <DollarSign className="w-5 h-5 text-green-600" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="font-medium flex items-center gap-2 flex-wrap">
                          {f.feeLevel === 'university' ? (
                            <>
                              <span>{f.university?.name || univName || 'Unknown University'}</span>
                              <Badge className="text-[10px] bg-amber-100 text-amber-700 dark:bg-amber-900/30">University Level</Badge>
                            </>
                          ) : (
                            <>
                              {progName || 'Unknown Program'}
                              {(univName || f.university?.name) && (
                                <span className="text-sm text-muted-foreground">({univName || f.university?.name})</span>
                              )}
                              <Badge className="text-[10px] bg-blue-100 text-blue-700 dark:bg-blue-900/30">Program Level</Badge>
                            </>
                          )}
                          {sessionName && (
                            <span className="text-xs bg-muted text-muted-foreground rounded-full px-2 py-0.5 font-normal">
                              {sessionName}
                            </span>
                          )}
                        </div>
                        <div className="text-sm text-muted-foreground mt-1 flex flex-wrap gap-2 items-center">
                          <Badge variant="outline">{f.currency || 'INR'} {feeTotals.total.toLocaleString()} total</Badge>
                          <span className="text-xs">Reg: {feeTotals.reg} • Tuition: {feeTotals.tui} • Exam: {feeTotals.ex} • GST: {f.gstPercentage}%</span>
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
              });
            })()}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
