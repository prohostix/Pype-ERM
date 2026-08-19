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
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100/80 flex items-center justify-center p-4 py-12 font-sans selection:bg-primary/10">
      <div className="w-full max-w-4xl relative">
        {/* Decorative background blur */}
        <div className="absolute top-0 -left-4 w-72 h-72 bg-primary/5 rounded-full mix-blend-multiply filter blur-3xl opacity-70 animate-pulse" />
        <div className="absolute top-0 -right-4 w-72 h-72 bg-blue-400/5 rounded-full mix-blend-multiply filter blur-3xl opacity-70 animate-pulse animation-delay-2000" />

        <div className="relative">
          {/* Header */}
          <div className="text-center mb-10">
            <div className="w-28 h-28 bg-white rounded-2xl flex items-center justify-center mx-auto mb-5 shadow-lg shadow-black/5 ring-4 ring-white border border-slate-100 p-3 relative overflow-hidden group">
              <div className="absolute inset-0 bg-gradient-to-tr from-slate-50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
              {selectedProgram?.university?.logo ? (
                <img 
                  src={selectedProgram.university.logo.startsWith('http') ? selectedProgram.university.logo : `${API_BASE}${selectedProgram.university.logo.startsWith('/') ? selectedProgram.university.logo : '/' + selectedProgram.university.logo}`} 
                  alt={selectedProgram.university.name} 
                  className="w-full h-full object-contain relative z-10 transition-transform duration-500 group-hover:scale-105" 
                />
              ) : (
                <GraduationCap className="w-12 h-12 text-primary relative z-10" />
              )}
            </div>
            <h1 className="text-3xl font-extrabold text-slate-800 tracking-tight">{selectedProgram?.university?.name || inviteData?.organizationName}</h1>
            <p className="text-muted-foreground font-medium mt-2 text-lg">
              {selectedProgram?.name} {selectedProgram?.courseType ? `(${selectedProgram.courseType})` : ''}
            </p>
            <div className="inline-flex items-center justify-center mt-4 bg-white/60 backdrop-blur-sm border border-slate-200/60 shadow-sm px-4 py-1.5 rounded-full">
              <p className="text-muted-foreground text-xs font-medium">
                Referred by <span className="font-bold text-slate-700">{inviteData?.referrerName}</span> <span className="mx-1 text-slate-300">•</span> {inviteData?.organizationName}
              </p>
            </div>
          </div>

          <Card className="shadow-2xl shadow-black/[0.03] border-slate-200/60 bg-white/95 backdrop-blur-sm overflow-hidden">
            <div className="h-1.5 w-full bg-gradient-to-r from-primary via-primary/80 to-blue-500" />
            <CardHeader className="bg-slate-50/50 border-b border-slate-100 pb-6 pt-8 px-8">
              <CardTitle className="text-2xl">Student Application Form</CardTitle>
              <CardDescription className="text-base mt-1">Please fill in your details accurately to apply for enrollment</CardDescription>
            </CardHeader>
            <CardContent className="p-8">
              <form onSubmit={handleSubmit} className="space-y-10">
                {/* Admission Details */}
                <div className="space-y-5">
                  <div className="flex items-center gap-3 border-b border-slate-200 pb-3">
                    <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-sm">1</div>
                    <h3 className="text-xl font-semibold text-slate-800 tracking-tight">Admission Details</h3>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pl-11">
                    <div className="space-y-2">
                      <Label className="text-slate-600 font-medium">Program <span className="text-red-500">*</span></Label>
                      <Select value={form.programId} onValueChange={v => setForm(f => ({ ...f, programId: v }))}>
                        <SelectTrigger className="h-11 bg-white">
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
                      <div className="space-y-2">
                        <Label className="text-slate-600 font-medium">Payment Plan <span className="text-slate-400 font-normal text-xs ml-1">(Optional)</span></Label>
                        <Select value={form.paymentPlan} onValueChange={v => setForm(f => ({ ...f, paymentPlan: v }))}>
                          <SelectTrigger className="h-11 bg-white">
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
                <div className="space-y-5">
                  <div className="flex items-center gap-3 border-b border-slate-200 pb-3">
                    <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-sm">2</div>
                    <h3 className="text-xl font-semibold text-slate-800 tracking-tight">Personal Details</h3>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pl-11">
                    <div className="space-y-2">
                      <Label className="text-slate-600 font-medium">Full Name <span className="text-red-500">*</span></Label>
                      <Input className="h-11 bg-white" value={form.studentName} onChange={e => setForm(f => ({ ...f, studentName: e.target.value }))} placeholder="Your full name" required />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-slate-600 font-medium">Email Address <span className="text-red-500">*</span></Label>
                      <Input className="h-11 bg-white" type="email" value={form.studentEmail} onChange={e => setForm(f => ({ ...f, studentEmail: e.target.value }))} placeholder="your@email.com" required />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-slate-600 font-medium">Phone Number <span className="text-red-500">*</span></Label>
                      <Input className="h-11 bg-white" value={form.studentPhone} onChange={e => setForm(f => ({ ...f, studentPhone: e.target.value }))} placeholder="+91 XXXXX XXXXX" required />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-slate-600 font-medium">Alternative Phone</Label>
                      <Input className="h-11 bg-white" value={form.altPhone} onChange={e => setForm(f => ({ ...f, altPhone: e.target.value }))} placeholder="+91 XXXXX XXXXX" />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-slate-600 font-medium">Date of Birth</Label>
                      <Input className="h-11 bg-white" type="date" value={form.dob} onChange={e => setForm(f => ({ ...f, dob: e.target.value }))} />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-slate-600 font-medium">Gender</Label>
                      <Select value={form.gender} onValueChange={v => setForm(f => ({ ...f, gender: v }))}>
                        <SelectTrigger className="h-11 bg-white"><SelectValue placeholder="Select" /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Male">Male</SelectItem>
                          <SelectItem value="Female">Female</SelectItem>
                          <SelectItem value="Other">Other</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label className="text-slate-600 font-medium">Category</Label>
                      <Select value={form.category} onValueChange={v => setForm(f => ({ ...f, category: v }))}>
                        <SelectTrigger className="h-11 bg-white"><SelectValue placeholder="Select" /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="General">General</SelectItem>
                          <SelectItem value="OBC">OBC</SelectItem>
                          <SelectItem value="SC">SC</SelectItem>
                          <SelectItem value="ST">ST</SelectItem>
                          <SelectItem value="Other">Other</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label className="text-slate-600 font-medium">Religion</Label>
                      <Input className="h-11 bg-white" value={form.religion} onChange={e => setForm(f => ({ ...f, religion: e.target.value }))} placeholder="e.g. Hindu, Muslim, Christian, etc." />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-slate-600 font-medium">Marital Status</Label>
                      <Select value={form.maritalStatus} onValueChange={v => setForm(f => ({ ...f, maritalStatus: v }))}>
                        <SelectTrigger className="h-11 bg-white"><SelectValue placeholder="Select" /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Single">Single</SelectItem>
                          <SelectItem value="Married">Married</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label className="text-slate-600 font-medium">Employment Status</Label>
                      <Select value={form.employmentStatus} onValueChange={v => setForm(f => ({ ...f, employmentStatus: v }))}>
                        <SelectTrigger className="h-11 bg-white"><SelectValue placeholder="Select" /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Employed">Employed</SelectItem>
                          <SelectItem value="Unemployed">Unemployed</SelectItem>
                          <SelectItem value="Student">Student</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2 md:col-span-2">
                      <Label className="text-slate-600 font-medium">Caste</Label>
                      <Input className="h-11 bg-white" value={form.caste} onChange={e => setForm(f => ({ ...f, caste: e.target.value }))} />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pl-11 pt-2">
                    <div className="md:col-span-2 space-y-2">
                      <Label className="text-slate-600 font-medium">Address</Label>
                      <Input className="h-11 bg-white" value={form.studentAddress} onChange={e => setForm(f => ({ ...f, studentAddress: e.target.value }))} placeholder="Your full residential address" />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-slate-600 font-medium">Pin Code</Label>
                      <Input className="h-11 bg-white" value={form.pinCode} onChange={e => setForm(f => ({ ...f, pinCode: e.target.value }))} placeholder="Postal Code" />
                    </div>
                  </div>
                </div>

                {/* Family Details */}
                <div className="space-y-5">
                  <div className="flex items-center gap-3 border-b border-slate-200 pb-3">
                    <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-sm">3</div>
                    <h3 className="text-xl font-semibold text-slate-800 tracking-tight">Family Details</h3>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pl-11">
                    <div className="space-y-2">
                      <Label className="text-slate-600 font-medium">Father's Name</Label>
                      <Input className="h-11 bg-white" value={form.fatherName} onChange={e => setForm(f => ({ ...f, fatherName: e.target.value }))} placeholder="Father's full name" />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-slate-600 font-medium">Father's Phone</Label>
                      <Input className="h-11 bg-white" value={form.fatherPhone} onChange={e => setForm(f => ({ ...f, fatherPhone: e.target.value }))} placeholder="+91 XXXXX XXXXX" />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-slate-600 font-medium">Mother's Name</Label>
                      <Input className="h-11 bg-white" value={form.motherName} onChange={e => setForm(f => ({ ...f, motherName: e.target.value }))} placeholder="Mother's full name" />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-slate-600 font-medium">Mother's Phone</Label>
                      <Input className="h-11 bg-white" value={form.motherPhone} onChange={e => setForm(f => ({ ...f, motherPhone: e.target.value }))} placeholder="+91 XXXXX XXXXX" />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-slate-600 font-medium">Guardian's Name</Label>
                      <Input className="h-11 bg-white" value={form.guardianName} onChange={e => setForm(f => ({ ...f, guardianName: e.target.value }))} placeholder="If applicable" />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-slate-600 font-medium">Family Phone</Label>
                      <Input className="h-11 bg-white" value={form.familyPhone} onChange={e => setForm(f => ({ ...f, familyPhone: e.target.value }))} placeholder="General family contact" />
                    </div>
                  </div>
                </div>

                {/* Document & Photo Upload */}
                <div className="space-y-5">
                  <div className="flex items-center gap-3 border-b border-slate-200 pb-3">
                    <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-sm">4</div>
                    <h3 className="text-xl font-semibold text-slate-800 tracking-tight">Documents & Photo</h3>
                  </div>
                  <div className="grid grid-cols-1 gap-8 pl-11">
                    
                    {/* Photo Upload */}
                    <div className="space-y-3 bg-slate-50/50 p-6 rounded-xl border border-slate-100">
                      <Label className="text-base font-semibold text-slate-800">Profile Photo</Label>
                      <div className="flex items-center gap-6">
                        {form.photo ? (
                          <div className="relative group cursor-pointer inline-block">
                            <div className="w-24 h-24 rounded-full overflow-hidden border-4 border-white shadow-md">
                              <img src={form.photo.startsWith('http') ? form.photo : `${API_BASE}${form.photo.startsWith('/') ? form.photo : '/' + form.photo}`} alt="Student" className="w-full h-full object-cover" />
                            </div>
                            <button
                              type="button"
                              onClick={() => setForm({...form, photo: ''})}
                              className="absolute top-0 right-0 bg-rose-500 text-white rounded-full p-1.5 hover:bg-rose-600 transition-colors shadow-sm z-10 scale-0 group-hover:scale-100 origin-center duration-200"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        ) : (
                          <div className="w-24 h-24 rounded-full bg-white flex items-center justify-center border-2 border-dashed border-slate-300 shadow-sm text-slate-400 hover:text-primary hover:border-primary/50 transition-colors">
                            <UploadCloud className="w-8 h-8" />
                          </div>
                        )}
                        <div className="flex-1 max-w-sm">
                          <Input 
                            type="file" 
                            accept="image/*"
                            className="text-sm bg-white h-11 cursor-pointer file:cursor-pointer file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-xs file:font-semibold file:bg-primary/10 file:text-primary hover:file:bg-primary/20"
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
                          <p className="text-xs text-muted-foreground mt-2">Upload a clear passport-size photo (JPEG/PNG format, max 5MB)</p>
                        </div>
                      </div>
                    </div>

                    {/* Documents Upload */}
                    <div className="space-y-4">
                      <div>
                        <Label className="text-base font-semibold text-slate-800">Supporting Documents</Label>
                        <p className="text-sm text-muted-foreground mt-1">Please upload the necessary certificates for verification</p>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {['Aadhaar Card', 'SSLC Certificate', 'Plus Two Certificate', 'Transfer Certificate', 'Birth Certificate', 'Degree Certificate', 'Other'].map((docType) => {
                          const existing = (form.documents || []).find((d: any) => d.type === docType);
                          return (
                            <div key={docType} className="p-4 rounded-xl border border-slate-200/60 bg-white hover:border-primary/30 hover:shadow-md hover:shadow-primary/5 transition-all duration-300 flex flex-col justify-between group">
                              <div className="flex justify-between items-start mb-4">
                                <span className="text-sm font-semibold text-slate-700 group-hover:text-slate-900">{docType}</span>
                                {existing?.url ? (
                                  <a 
                                    href={existing.url.startsWith('http') ? existing.url : `${API_BASE}${existing.url.startsWith('/') ? existing.url : '/' + existing.url}`} 
                                    target="_blank" 
                                    rel="noreferrer"
                                    className="text-xs text-primary bg-primary/10 px-2 py-1 rounded-md font-medium hover:bg-primary/20 flex items-center transition-colors"
                                  >
                                    <CheckCircle className="w-3.5 h-3.5 mr-1" /> Verified
                                  </a>
                                ) : (
                                  <span className="text-xs font-medium text-slate-400 bg-slate-100 px-2 py-1 rounded-md">Pending</span>
                                )}
                              </div>
                              <Input
                                type="file"
                                className="text-xs bg-slate-50 border-slate-200 h-9 cursor-pointer file:cursor-pointer file:h-full file:mr-2 file:px-3 file:border-0 file:bg-transparent file:text-slate-500 file:font-medium hover:bg-slate-100 transition-colors"
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
                  <div className="p-4 bg-red-50 border border-red-200 text-red-700 text-sm font-medium rounded-xl flex items-center gap-3">
                    <AlertCircle className="w-5 h-5 shrink-0" />
                    {error}
                  </div>
                )}

                <div className="pt-4 border-t border-slate-100">
                  <Button type="submit" className="w-full text-lg h-14 rounded-xl shadow-lg shadow-primary/20 hover:shadow-primary/30 transition-all active:scale-[0.99] font-bold" disabled={submitting}>
                    {submitting ? 'Submitting Application...' : 'Submit Application Form'}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
