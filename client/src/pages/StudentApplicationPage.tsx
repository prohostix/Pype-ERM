import { useState, useEffect, useRef } from 'react';
import { UploadCloud, Upload, Trash2, CheckCircle, GraduationCap, AlertCircle } from 'lucide-react';
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
  university: { name: string; code: string; logo?: string | null };
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
    gender: '',
    category: '',
    religion: '',
    maritalStatus: '',
    employmentStatus: '',
    caste: '',
    motherName: '',
    motherPhone: '',
    fatherPhone: '',
    guardianName: '',
    familyPhone: '',
    paymentPlan: '',
    photo: '',
    documents: [] as any[],
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
        if (res.data.data?.programs?.length === 1) {
          setForm(f => ({ ...f, programId: res.data.data.programs[0].id }));
        }
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

  const selectedProgram = inviteData?.programs.find(p => p.id === form.programId) || inviteData?.programs[0];

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <div className="w-full max-w-3xl">
        {/* Header */}
        <div className="text-center mb-6">
          <div className="w-24 h-24 bg-white rounded-xl flex items-center justify-center mx-auto mb-3 overflow-hidden shadow-sm border p-2">
            {selectedProgram?.university?.logo ? (
              <img src={selectedProgram.university.logo} alt={selectedProgram.university.name} className="w-full h-full object-contain" />
            ) : (
              <GraduationCap className="w-10 h-10 text-primary" />
            )}
          </div>
          <h1 className="text-2xl font-bold text-slate-800">{selectedProgram?.university?.name || inviteData?.organizationName}</h1>
          <p className="text-muted-foreground font-medium mt-1">
            {selectedProgram?.name} {selectedProgram?.courseType ? `(${selectedProgram.courseType})` : ''}
          </p>
          <p className="text-muted-foreground text-xs mt-3 border-t border-slate-200 pt-3 inline-block">
            Referred by <span className="font-medium text-slate-700">{inviteData?.referrerName}</span> • {inviteData?.organizationName}
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Student Application Form</CardTitle>
            <CardDescription>Fill in your details to apply for enrollment</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-8">
              {/* Admission Details */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold border-b pb-2">1. Admission Details</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                  {selectedProgram?.feeStructures?.[0]?.allowInitialFee && (
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
                </div>
              </div>

              {/* Personal Details */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold border-b pb-2">2. Personal Details</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <Label>Full Name *</Label>
                    <Input value={form.studentName} onChange={e => setForm(f => ({ ...f, studentName: e.target.value }))} placeholder="Your full name" required />
                  </div>
                  <div className="space-y-1">
                    <Label>Email Address *</Label>
                    <Input type="email" value={form.studentEmail} onChange={e => setForm(f => ({ ...f, studentEmail: e.target.value }))} placeholder="your@email.com" required />
                  </div>
                  <div className="space-y-1">
                    <Label>Phone Number *</Label>
                    <Input value={form.studentPhone} onChange={e => setForm(f => ({ ...f, studentPhone: e.target.value }))} placeholder="+91 XXXXX XXXXX" required />
                  </div>
                  <div className="space-y-1">
                    <Label>Alternative Phone</Label>
                    <Input value={form.altPhone} onChange={e => setForm(f => ({ ...f, altPhone: e.target.value }))} placeholder="+91 XXXXX XXXXX" />
                  </div>
                  <div className="space-y-1">
                    <Label>Date of Birth</Label>
                    <Input type="date" value={form.dob} onChange={e => setForm(f => ({ ...f, dob: e.target.value }))} />
                  </div>
                  <div className="space-y-1">
                    <Label>Gender</Label>
                    <Select value={form.gender} onValueChange={v => setForm(f => ({ ...f, gender: v }))}>
                      <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Male">Male</SelectItem>
                        <SelectItem value="Female">Female</SelectItem>
                        <SelectItem value="Other">Other</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1">
                    <Label>Category</Label>
                    <Select value={form.category} onValueChange={v => setForm(f => ({ ...f, category: v }))}>
                      <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="General">General</SelectItem>
                        <SelectItem value="OBC">OBC</SelectItem>
                        <SelectItem value="SC">SC</SelectItem>
                        <SelectItem value="ST">ST</SelectItem>
                        <SelectItem value="Other">Other</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1">
                    <Label>Religion</Label>
                    <Input value={form.religion} onChange={e => setForm(f => ({ ...f, religion: e.target.value }))} placeholder="e.g. Hindu, Muslim, Christian, etc." />
                  </div>
                  <div className="space-y-1">
                    <Label>Marital Status</Label>
                    <Select value={form.maritalStatus} onValueChange={v => setForm(f => ({ ...f, maritalStatus: v }))}>
                      <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Single">Single</SelectItem>
                        <SelectItem value="Married">Married</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1">
                    <Label>Employment Status</Label>
                    <Select value={form.employmentStatus} onValueChange={v => setForm(f => ({ ...f, employmentStatus: v }))}>
                      <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Employed">Employed</SelectItem>
                        <SelectItem value="Unemployed">Unemployed</SelectItem>
                        <SelectItem value="Student">Student</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1">
                    <Label>Caste</Label>
                    <Input value={form.caste} onChange={e => setForm(f => ({ ...f, caste: e.target.value }))} />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
                  <div className="md:col-span-2 space-y-1">
                    <Label>Address</Label>
                    <Input value={form.studentAddress} onChange={e => setForm(f => ({ ...f, studentAddress: e.target.value }))} placeholder="Your full address" />
                  </div>
                  <div className="space-y-1">
                    <Label>Pin Code</Label>
                    <Input value={form.pinCode} onChange={e => setForm(f => ({ ...f, pinCode: e.target.value }))} placeholder="Pincode" />
                  </div>
                </div>
              </div>

              {/* Family Details */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold border-b pb-2">3. Family Details</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <Label>Father's Name</Label>
                    <Input value={form.fatherName} onChange={e => setForm(f => ({ ...f, fatherName: e.target.value }))} placeholder="Father's full name" />
                  </div>
                  <div className="space-y-1">
                    <Label>Father's Phone</Label>
                    <Input value={form.fatherPhone} onChange={e => setForm(f => ({ ...f, fatherPhone: e.target.value }))} placeholder="+91 XXXXX XXXXX" />
                  </div>
                  <div className="space-y-1">
                    <Label>Mother's Name</Label>
                    <Input value={form.motherName} onChange={e => setForm(f => ({ ...f, motherName: e.target.value }))} placeholder="Mother's full name" />
                  </div>
                  <div className="space-y-1">
                    <Label>Mother's Phone</Label>
                    <Input value={form.motherPhone} onChange={e => setForm(f => ({ ...f, motherPhone: e.target.value }))} placeholder="+91 XXXXX XXXXX" />
                  </div>
                  <div className="space-y-1">
                    <Label>Guardian's Name</Label>
                    <Input value={form.guardianName} onChange={e => setForm(f => ({ ...f, guardianName: e.target.value }))} />
                  </div>
                  <div className="space-y-1">
                    <Label>Family Phone</Label>
                    <Input value={form.familyPhone} onChange={e => setForm(f => ({ ...f, familyPhone: e.target.value }))} />
                  </div>
                </div>
              </div>

              {/* Document & Photo Upload */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold border-b pb-2">4. Documents & Photo</h3>
                <div className="grid grid-cols-1 gap-4">
                  
                  {/* Photo Upload */}
                  <div className="space-y-1.5">
                    <Label className="text-sm font-semibold text-slate-700">Profile Photo</Label>
                    <div className="flex items-center gap-4">
                      {form.photo ? (
                        <div className="relative group cursor-pointer inline-block">
                          <img src={form.photo.startsWith('http') ? form.photo : `${API_BASE.replace('/api', '')}${form.photo}`} alt="Student" className="w-16 h-16 rounded-full object-cover border" />
                          <button
                            type="button"
                            onClick={() => setForm({...form, photo: ''})}
                            className="absolute -top-1 -right-1 bg-rose-500 text-white rounded-full p-1 hover:bg-rose-600 transition-colors shadow-sm"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ) : (
                        <div className="w-16 h-16 rounded-full bg-slate-100 flex items-center justify-center border border-dashed border-slate-300">
                          <UploadCloud className="w-6 h-6 text-slate-400" />
                        </div>
                      )}
                      <div className="flex-1">
                        <Input 
                          type="file" 
                          accept="image/*"
                          className="text-xs file:h-7 file:py-0 file:px-2"
                          onChange={async (e) => {
                            if (e.target.files && e.target.files[0]) {
                              const uploadData = new FormData();
                              uploadData.append('file', e.target.files[0]);
                              try {
                                const res = await axios.post(`${API_BASE}/public/upload`, uploadData);
                                setForm({ ...form, photo: res.data.url });
                              } catch (err) {
                                setError('Failed to upload photo');
                              }
                            }
                          }}
                        />
                        <p className="text-xs text-muted-foreground mt-1">Upload a clear passport-size photo (JPEG/PNG)</p>
                      </div>
                    </div>
                  </div>

                  {/* Documents Upload */}
                  <div className="space-y-3 pt-2">
                    <Label className="text-sm font-semibold text-slate-700">Supporting Documents</Label>
                    <p className="text-xs text-muted-foreground mb-3">Please upload necessary certificates (Aadhaar, SSLC, Plus Two, Degree, etc.)</p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {['Aadhaar Card', 'SSLC Certificate', 'Plus Two Certificate', 'Transfer Certificate', 'Birth Certificate', 'Degree Certificate', 'Other'].map((docType) => {
                        const existing = (form.documents || []).find((d: any) => d.type === docType);
                        return (
                          <div key={docType} className="p-3 rounded-lg border bg-slate-50 flex flex-col justify-between">
                            <div className="flex justify-between items-start mb-2">
                              <span className="text-sm font-medium">{docType}</span>
                              {existing?.url ? (
                                <a 
                                  href={`${API_BASE.replace('/api', '')}${existing.url}`} 
                                  target="_blank" 
                                  rel="noreferrer"
                                  className="text-xs text-primary hover:underline flex items-center"
                                >
                                  <CheckCircle className="w-3 h-3 mr-1" /> View
                                </a>
                              ) : (
                                <span className="text-xs text-muted-foreground">Not uploaded</span>
                              )}
                            </div>
                            <Input
                              type="file"
                              className="text-xs file:h-7 file:py-0 file:px-2 cursor-pointer"
                              onChange={async (e) => {
                                const file = e.target.files?.[0];
                                if (!file) return;
                                try {
                                  const uploadData = new FormData();
                                  uploadData.append('file', file);
                                  const res = await axios.post(`${API_BASE}/public/upload`, uploadData);
                                  
                                  const newDocs = (form.documents || []).filter((d: any) => d.type !== docType);
                                  newDocs.push({ type: docType, url: res.data.url });
                                  setForm({ ...form, documents: newDocs });
                                } catch (err) {
                                  setError(`Failed to upload ${docType}`);
                                }
                              }}
                            />
                          </div>
                        );
                      })}
                    </div>
                  </div>

                </div>
              </div>

              {error && (
                <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg">
                  {error}
                </div>
              )}

              <Button type="submit" className="w-full text-lg h-12" disabled={submitting}>
                {submitting ? 'Submitting...' : 'Submit Application'}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
