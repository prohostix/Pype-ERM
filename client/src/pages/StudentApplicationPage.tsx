import { useState, useEffect } from 'react';
import { GraduationCap, CheckCircle, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import axios from 'axios';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:6478/api/v1';

interface Program {
  id: string;
  name: string;
  code: string;
  courseType: string;
  university: { name: string; code: string };
  feeStructures?: { allowInitialFee: boolean }[];
}

interface InviteData {
  organizationName: string;
  referrerName: string;
  programs: Program[];
  token: string;
}

export default function StudentApplicationPage() {
  const urlParams = new URLSearchParams(window.location.search);
  const token = urlParams.get('student_token') || urlParams.get('token');

  const [inviteData, setInviteData] = useState<InviteData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const [form, setForm] = useState({
    studentName: '',
    studentEmail: '',
    studentPhone: '',
    studentAddress: '',
    programId: '',
    fatherName: '',
    dob: '',
    altPhone: '',
    pinCode: '',
    paymentPlan: '',
  });

  useEffect(() => {
    if (!token) {
      setError('Invalid link — no token found.');
      setLoading(false);
      return;
    }
    axios.get(`${API_BASE}/public/student-apply/${token}`)
      .then(res => {
        setInviteData(res.data.data);
        setLoading(false);
      })
      .catch(err => {
        setError(err.response?.data?.message || 'Invalid or expired link.');
        setLoading(false);
      });
  }, [token]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.programId) { setError('Please select a program'); return; }
    setSubmitting(true);
    setError('');
    try {
      await axios.post(`${API_BASE}/public/student-apply/${token}`, form);
      setSubmitted(true);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Submission failed. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary" />
      </div>
    );
  }

  if (error && !inviteData) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4">
        <Card className="max-w-md w-full">
          <CardContent className="pt-8 pb-8 text-center">
            <AlertCircle className="w-12 h-12 text-destructive mx-auto mb-4" />
            <h2 className="text-xl font-bold mb-2">Invalid Link</h2>
            <p className="text-muted-foreground">{error}</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (submitted) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4">
        <Card className="max-w-md w-full">
          <CardContent className="pt-8 pb-8 text-center">
            <CheckCircle className="w-12 h-12 text-green-500 mx-auto mb-4" />
            <h2 className="text-xl font-bold mb-2">Application Submitted!</h2>
            <p className="text-muted-foreground">
              Your application has been received and is under review by our team. You will be contacted once it's processed.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <div className="w-full max-w-lg">
        {/* Header */}
        <div className="text-center mb-6">
          <div className="w-12 h-12 bg-primary rounded-xl flex items-center justify-center mx-auto mb-3">
            <GraduationCap className="w-6 h-6 text-white" />
          </div>
          <h1 className="text-2xl font-bold">{inviteData?.organizationName}</h1>
          <p className="text-muted-foreground text-sm mt-1">
            Referred by <span className="font-medium">{inviteData?.referrerName}</span>
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Student Application Form</CardTitle>
            <CardDescription>Fill in your details to apply for enrollment</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <Label>Full Name *</Label>
                  <Input
                    value={form.studentName}
                    onChange={e => setForm(f => ({ ...f, studentName: e.target.value }))}
                    placeholder="Your full name"
                    required
                  />
                </div>
                <div className="space-y-1">
                  <Label>Father's Name *</Label>
                  <Input
                    value={form.fatherName}
                    onChange={e => setForm(f => ({ ...f, fatherName: e.target.value }))}
                    placeholder="Father's full name"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <Label>Email Address *</Label>
                  <Input
                    type="email"
                    value={form.studentEmail}
                    onChange={e => setForm(f => ({ ...f, studentEmail: e.target.value }))}
                    placeholder="your@email.com"
                    required
                  />
                </div>
                <div className="space-y-1">
                  <Label>Date of Birth *</Label>
                  <Input
                    type="date"
                    value={form.dob}
                    onChange={e => setForm(f => ({ ...f, dob: e.target.value }))}
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <Label>Phone Number *</Label>
                  <Input
                    value={form.studentPhone}
                    onChange={e => setForm(f => ({ ...f, studentPhone: e.target.value }))}
                    placeholder="+91 XXXXX XXXXX"
                    required
                  />
                </div>
                <div className="space-y-1">
                  <Label>Alternative Phone</Label>
                  <Input
                    value={form.altPhone}
                    onChange={e => setForm(f => ({ ...f, altPhone: e.target.value }))}
                    placeholder="+91 XXXXX XXXXX"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="md:col-span-2 space-y-1">
                  <Label>Address *</Label>
                  <Input
                    value={form.studentAddress}
                    onChange={e => setForm(f => ({ ...f, studentAddress: e.target.value }))}
                    placeholder="Your full address"
                    required
                  />
                </div>
                <div className="space-y-1">
                  <Label>Pin Code *</Label>
                  <Input
                    value={form.pinCode}
                    onChange={e => setForm(f => ({ ...f, pinCode: e.target.value }))}
                    placeholder="Pincode"
                    required
                  />
                </div>
              </div>
              <div className="space-y-1">
                <Label>Program *</Label>
                <Select value={form.programId} onValueChange={v => setForm(f => ({ ...f, programId: v }))}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a program" />
                  </SelectTrigger>
                  <SelectContent>
                    {inviteData?.programs.map(p => (
                      <SelectItem key={p.id} value={p.id}>
                        {p.name} — {p.university.name} ({p.courseType})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {inviteData?.programs.find(p => p.id === form.programId)?.feeStructures?.[0]?.allowInitialFee && (
                <div className="space-y-1">
                  <Label>Payment Plan (Optional)</Label>
                  <Select value={form.paymentPlan} onValueChange={v => setForm(f => ({ ...f, paymentPlan: v }))}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select a plan" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="lumpsum">One-Time Payment (Lump Sum)</SelectItem>
                      <SelectItem value="installment">Installment Plan</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )}

              {error && (
                <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg">
                  {error}
                </div>
              )}

              <Button type="submit" className="w-full" disabled={submitting}>
                {submitting ? 'Submitting...' : 'Submit Application'}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
