import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { GraduationCap, Upload, FileText, Send } from 'lucide-react';
import api from '@/lib/api';
import { toast } from 'sonner';

export function ProvisionalEnrollmentPanel() {
  const [programs, setPrograms] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  
  const [form, setForm] = useState({ 
    studentName: '', 
    studentEmail: '', 
    studentPhone: '', 
    universityId: 'all',
    programId: ''
  });
  const [receiptFile, setReceiptFile] = useState<File | null>(null);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const progsRes = await api.get('/enrollment/programs');
      setPrograms(progsRes.data.data || []);
    } catch (e) {
      toast.error('Failed to load programs');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async () => {
    if (!form.studentName || !form.studentPhone || !form.studentEmail || !form.programId) {
      toast.error('Please fill in all details');
      return;
    }
    if (!receiptFile) {
      toast.error('Please upload a payment receipt');
      return;
    }

    setSubmitting(true);
    try {
      // 1. Create Provisional Enrollment
      const res = await api.post('/enrollment/enroll', {
        ...form,
        isProvisional: true,
        status: 'provisional_finance_pending',
        studentAddress: 'To be filled', // placeholder
      });
      
      const enrollmentId = res.data.data.id;

      // 2. Upload Receipt
      const formData = new FormData();
      formData.append('receipt', receiptFile);
      await api.post(`/enrollment/${enrollmentId}/receipt`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });

      toast.success('Provisional Enrollment submitted to Finance');
      setForm({ studentName: '', studentEmail: '', studentPhone: '', universityId: 'all', programId: '' });
      setReceiptFile(null);
    } catch (e: any) {
      toast.error(e.response?.data?.message || 'Submission failed');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <h2 className="text-2xl font-bold">Provisional Enrollment</h2>
        <p className="text-muted-foreground text-sm mt-1">Quickly enroll a student with minimal details and send directly to Finance for receipt verification.</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Student Details</CardTitle>
          <CardDescription>Enter basic information to initiate provisional enrollment.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-1">
            <Label>University</Label>
            <Select 
              value={form.universityId} 
              onValueChange={v => setForm(f => ({ ...f, universityId: v, programId: '' }))}
            >
              <SelectTrigger><SelectValue placeholder="All Universities" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Universities</SelectItem>
                {Array.from(new Map(
                  programs
                    .filter(p => p.university && p.university.id)
                    .map(p => [p.university.id, p.university])
                ).values()).map((u: any) => (
                  <SelectItem key={u.id} value={u.id}>{u.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1">
            <Label>Program</Label>
            <Select value={form.programId} onValueChange={v => setForm(f => ({ ...f, programId: v }))}>
              <SelectTrigger><SelectValue placeholder="Select a program" /></SelectTrigger>
              <SelectContent>
                {(form.universityId === 'all' ? programs : programs.filter(p => p.university?.id === form.universityId)).map(p => (
                  <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          
          <div className="space-y-1">
            <Label>Student Full Name</Label>
            <Input value={form.studentName} onChange={e => setForm(f => ({ ...f, studentName: e.target.value }))} placeholder="John Doe" />
          </div>

          <div className="space-y-1">
            <Label>Email</Label>
            <Input type="email" value={form.studentEmail} onChange={e => setForm(f => ({ ...f, studentEmail: e.target.value }))} placeholder="john@example.com" />
          </div>

          <div className="space-y-1">
            <Label>Phone Number</Label>
            <Input value={form.studentPhone} onChange={e => setForm(f => ({ ...f, studentPhone: e.target.value }))} placeholder="+91 9876543210" />
          </div>

          <div className="space-y-1 pt-2">
            <Label>Payment Receipt</Label>
            <div className="border-2 border-dashed border-border rounded-lg p-6 text-center hover:bg-muted/50 transition-colors cursor-pointer"
                 onClick={() => document.getElementById('receipt-upload')?.click()}
            >
              <input 
                id="receipt-upload" 
                type="file" 
                className="hidden" 
                accept="image/*,.pdf"
                onChange={(e) => {
                  if (e.target.files && e.target.files[0]) {
                    setReceiptFile(e.target.files[0]);
                  }
                }}
              />
              <div className="flex flex-col items-center justify-center space-y-2">
                <div className="p-3 bg-primary/10 text-primary rounded-full">
                  <Upload className="w-6 h-6" />
                </div>
                <div className="text-sm">
                  {receiptFile ? (
                    <span className="font-medium text-primary">{receiptFile.name}</span>
                  ) : (
                    <span className="text-muted-foreground">Click to upload receipt (JPG, PNG, PDF)</span>
                  )}
                </div>
              </div>
            </div>
          </div>

          <Button className="w-full mt-4" onClick={handleSubmit} disabled={submitting}>
            {submitting ? 'Submitting...' : 'Submit to Finance'}
            {!submitting && <Send className="w-4 h-4 ml-2" />}
          </Button>
        </CardContent>
      </Card>
      
      <ProvisionalEnrollmentsList />
    </div>
  );
}

export function ProvisionalEnrollmentsList() {
  const [enrollments, setEnrollments] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchEnrollments();
  }, []);

  const fetchEnrollments = async () => {
    setLoading(true);
    try {
      const res = await api.get('/enrollment/provisional');
      setEnrollments(res.data.data || []);
    } catch (e) {
      toast.error('Failed to load your provisional enrollments');
    } finally {
      setLoading(false);
    }
  };

  

  return (
    <Card className="mt-8">
      <CardHeader>
        <CardTitle>My Provisional Enrollments</CardTitle>
        <CardDescription>View your provisional enrollments and complete the verified ones.</CardDescription>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="space-y-2">{[1,2].map(i => <div key={i} className="h-16 bg-muted rounded-md animate-pulse" />)}</div>
        ) : enrollments.length === 0 ? (
          <p className="text-center text-muted-foreground py-8">You have no provisional enrollments.</p>
        ) : (
          <div className="space-y-4">
            {enrollments.map((e) => (
              <div key={e.id} className="flex flex-col md:flex-row md:items-center justify-between p-4 bg-muted/30 rounded-xl border">
                <div className="space-y-1">
                  <p className="font-bold text-sm">{e.studentName}</p>
                  <p className="text-xs text-muted-foreground">{e.studentEmail} • {e.studentPhone}</p>
                  <p className="text-xs font-medium bg-primary/10 text-primary w-fit px-2 py-0.5 rounded-full">{e.program?.name}</p>
                </div>
                
                <div className="mt-4 md:mt-0 flex items-center gap-3">
                  <span className={`text-xs font-bold px-2 py-1 rounded-full ${e.status === 'provisional_finance_verified' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}`}>
                    {e.status === 'provisional_finance_verified' ? 'Finance Verified' : 'Pending Verification'}
                  </span>
                  
                  {e.status === 'provisional_finance_verified' && (
                    <span className="text-[10px] text-muted-foreground uppercase">Go to Direct Enrollment to complete</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
