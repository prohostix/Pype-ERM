import { useState, useEffect } from 'react';
import {
  GraduationCap, Search, RefreshCw, Eye, Upload, FileText,
  Calendar, Phone, Mail, MapPin, User, Plus, Edit, Trash2, BookOpen, Building2, ChevronRight
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger } from '@/components/ui/dialog';
import api from '@/lib/api';
import { toast } from 'sonner';

interface Document {
  type: string;
  url: string;
  uploadedAt?: string;
  uploadedBy?: string;
}

interface Student {
  id: string;
  enrollmentNo: string;
  admissionNo?: string;
  admissionDate?: string;
  name: string;
  email: string;
  phone: string;
  altPhone?: string;
  fatherName?: string;
  fatherPhone?: string;
  motherName?: string;
  motherPhone?: string;
  religion?: string;
  caste?: string;
  dob?: string;
  address: string;
  pinCode?: string;
  status: string;
  isPrevious: boolean;
  photo?: string;
  createdAt: string;
  program?: { id: string; name: string; code: string } | any;
  center?: { id: string; name: string; code: string } | any;
  documents?: Document[];
}

export function SalesEnrolledStudentsPanel() {
  const [students, setStudents] = useState<Student[]>([]);
  const [programs, setPrograms] = useState<any[]>([]);
  const [universities, setUniversities] = useState<any[]>([]);
  const [branches, setBranches] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  const [profileOpen, setProfileOpen] = useState(false);

  // Form states
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formStep, setFormStep] = useState(0); // 0=Admission, 1=Personal, 2=Family, 3=Documents

  const [formData, setFormData] = useState<any>({
    isPrevious: false,
    branchId: '',
    universityId: '',
    programId: '',
    enrollmentNo: '',
    admissionNo: '',
    admissionDate: '',
    status: 'pending',
    name: '',
    email: '',
    phone: '',
    dob: '',
    address: '',
    pinCode: '',
    altPhone: '',
    religion: '',
    caste: '',
    photo: '',
    fatherName: '',
    fatherPhone: '',
    motherName: '',
    motherPhone: '',
    documents: [] as any[],
    centerId: ''
  });

  const generateAdmissionNo = () => {
    const prefix = 'ADM';
    const year = new Date().getFullYear().toString().slice(-2);
    const random = Math.floor(10000 + Math.random() * 90000);
    return `${prefix}${year}${random}`;
  };

  const fetchStudents = async () => {
    setLoading(true);
    try {
      const res = await api.get('/students');
      setStudents(res.data.data || []);
    } catch (e: any) {
      toast.error(e.response?.data?.message || 'Failed to load students');
    } finally {
      setLoading(false);
    }
  };

  const fetchPrograms = async () => {
    try {
      const response = await api.get('/operations/programs');
      setPrograms(response.data.data || []);
    } catch (e) {
      console.error(e);
    }
  };

  const fetchUniversities = async () => {
    try {
      const response = await api.get('/operations/universities');
      setUniversities(response.data.data || []);
    } catch (e) {
      console.error(e);
    }
  };

  const fetchBranches = async () => {
    try {
      const res = await api.get('/org/branches');
      if (res.data.success) {
        setBranches(res.data.data || []);
      }
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    fetchStudents();
    fetchPrograms();
    fetchUniversities();
    fetchBranches();
  }, []);

  const handleOpenProfile = (student: Student) => {
    setSelectedStudent(student);
    setProfileOpen(true);
  };

  const filteredPrograms = formData.universityId
    ? programs.filter((p: any) => p.universityId === formData.universityId)
    : programs;

  const resetForm = () => {
    setEditingId(null);
    setFormStep(0);
    setFormData({
      isPrevious: false,
      branchId: '',
      universityId: '',
      programId: '',
      enrollmentNo: '',
      admissionNo: '',
      admissionDate: '',
      status: 'pending',
      name: '',
      email: '',
      phone: '',
      dob: '',
      address: '',
      pinCode: '',
      altPhone: '',
      religion: '',
      caste: '',
      photo: '',
      fatherName: '',
      fatherPhone: '',
      motherName: '',
      motherPhone: '',
      documents: [],
      centerId: ''
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.programId || formData.programId.trim() === '') {
      toast.error('Please select a Program');
      return;
    }
    if (!formData.photo || formData.photo.trim() === '') {
      toast.error('Please upload a Student Photo');
      setFormStep(1);
      return;
    }
    const requiredDocs = ['Aadhaar Card', 'SSLC Certificate', 'Plus Two Certificate'];
    const missingDocs = requiredDocs.filter(docType => {
      const doc = (formData.documents || []).find((d: any) => d.type === docType);
      return !doc || !doc.url;
    });
    if (missingDocs.length > 0) {
      toast.error(`Please upload all required documents. Missing: ${missingDocs.join(', ')}`);
      setFormStep(3);
      return;
    }

    try {
      if (editingId) {
        await api.put(`/students/${editingId}`, formData);
        toast.success('Student updated successfully');
      } else {
        await api.post('/students', formData);
        toast.success('Student enrolled successfully');
      }
      setDialogOpen(false);
      resetForm();
      fetchStudents();
    } catch (error: any) {
      console.error(error);
      toast.error(error.response?.data?.message || 'Failed to save student');
    }
  };

  const handleEdit = (student: any) => {
    const studentId = student.id;
    const programId = typeof student.programId === 'object' ? student.programId?.id : student.programId;
    const centerId = typeof student.centerId === 'object' ? student.centerId?.id : student.centerId;
    const branchId = typeof student.branchId === 'object' ? student.branchId?.id : student.branchId;
    setEditingId(studentId);
    setFormStep(0);
    setFormData({
      isPrevious: student.isPrevious || false,
      branchId: branchId?.toString() || '',
      universityId: student.universityId || '',
      programId: programId?.toString() || '',
      enrollmentNo: student.enrollmentNo || '',
      admissionNo: student.admissionNo || '',
      admissionDate: student.admissionDate ? new Date(student.admissionDate).toISOString().split('T')[0] : '',
      status: student.status || 'active',
      name: student.name || '',
      email: student.email || '',
      phone: student.phone || '',
      dob: student.dob ? new Date(student.dob).toISOString().split('T')[0] : '',
      address: student.address || '',
      pinCode: student.pinCode || '',
      altPhone: student.altPhone || '',
      religion: student.religion || '',
      caste: student.caste || '',
      photo: student.photo || '',
      fatherName: student.fatherName || '',
      fatherPhone: student.fatherPhone || '',
      motherName: student.motherName || '',
      motherPhone: student.motherPhone || '',
      documents: student.documents || [],
      centerId: centerId?.toString() || ''
    });
    setDialogOpen(true);
  };

  const filtered = students.filter(s => {
    const term = search.toLowerCase();
    return (
      s.name.toLowerCase().includes(term) ||
      s.email.toLowerCase().includes(term) ||
      s.enrollmentNo.toLowerCase().includes(term) ||
      (s.program?.name || '').toLowerCase().includes(term) ||
      (s.center?.name || '').toLowerCase().includes(term)
    );
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-2xl font-bold">Enrolled Students</h2>
          <p className="text-sm text-muted-foreground mt-1">
            View active student profiles, enroll new students, and manage documents
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={fetchStudents} disabled={loading}>
            <RefreshCw className={loading ? 'w-4 h-4 mr-2 animate-spin' : 'w-4 h-4 mr-2'} />
            Refresh
          </Button>

          {/* ADD STUDENT TRIGGER */}
          <Dialog open={dialogOpen} onOpenChange={(open) => { setDialogOpen(open); if (!open) resetForm(); }}>
            <DialogTrigger asChild>
              <Button size="sm"><Plus className="w-4 h-4 mr-2" />Enroll Student</Button>
            </DialogTrigger>
            <DialogContent className="max-w-3xl max-h-[92vh] flex flex-col">
              <DialogHeader className="pb-2 border-b">
                <DialogTitle className="text-lg">{editingId ? 'Edit Student Record' : 'Enroll New Student'}</DialogTitle>
                <div className="flex items-center gap-1 pt-2">
                  {['Admission Info', 'Personal Details', 'Family Info', 'Documents'].map((step, i) => (
                    <button
                      key={i}
                      type="button"
                      onClick={() => setFormStep(i)}
                      className={`flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
                        formStep === i
                          ? 'bg-primary text-primary-foreground shadow'
                          : 'bg-slate-100 dark:bg-slate-800 text-muted-foreground hover:bg-slate-200 dark:hover:bg-slate-700'
                      }`}
                    >
                      {i === 0 && <BookOpen className="w-3 h-3" />}
                      {i === 1 && <User className="w-3 h-3" />}
                      {i === 2 && <Building2 className="w-3 h-3" />}
                      {i === 3 && <FileText className="w-3 h-3" />}
                      {step}
                    </button>
                  ))}
                </div>
              </DialogHeader>

              <form onSubmit={handleSubmit} className="flex flex-col flex-1 min-h-0 overflow-hidden">
                <div className="flex-1 overflow-y-auto pr-2 max-h-[60vh] space-y-4 py-3">

                  {/* STEP 0: ADMISSION */}
                  {formStep === 0 && (
                    <div className="space-y-4">
                      <div className="flex items-center gap-3 p-3 rounded-xl border border-amber-200 bg-amber-50 dark:bg-amber-950/20 dark:border-amber-900">
                        <input
                          type="checkbox"
                          id="salesIsPrevious"
                          checked={formData.isPrevious}
                          onChange={(e) => setFormData({...formData, isPrevious: e.target.checked})}
                          className="w-4 h-4 rounded border-slate-300 accent-amber-600"
                        />
                        <div>
                          <Label htmlFor="salesIsPrevious" className="cursor-pointer font-semibold text-amber-800 dark:text-amber-400">Mark as Previous Student</Label>
                          <p className="text-xs text-amber-700 dark:text-amber-500 mt-0.5">Enable this for students admitted before the system setup</p>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <Label className="font-medium">Branch <span className="text-xs text-muted-foreground font-normal">(optional)</span></Label>
                          <Select value={formData.branchId} onValueChange={(v) => setFormData({...formData, branchId: v === '__none__' ? '' : v})}>
                            <SelectTrigger><SelectValue placeholder="Select branch..." /></SelectTrigger>
                            <SelectContent>
                              <SelectItem value="__none__">— No Branch —</SelectItem>
                              {branches.filter((b: any) => b && b.id).map((b: any) => (
                                <SelectItem key={b.id} value={b.id}>{b.name} ({b.code})</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div>
                          <Label className="font-medium">University *</Label>
                          <Select value={formData.universityId} onValueChange={(v) => setFormData({...formData, universityId: v, programId: ''})}>
                            <SelectTrigger><SelectValue placeholder="Select university..." /></SelectTrigger>
                            <SelectContent>
                              {universities.filter((u: any) => u && u.id).map((u: any) => (
                                <SelectItem key={u.id} value={u.id}>{u.name}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      </div>

                      <div>
                        <Label className="font-medium">Program *</Label>
                        <Select value={formData.programId} onValueChange={(v) => setFormData({...formData, programId: v})} disabled={!formData.universityId}>
                          <SelectTrigger>
                            <SelectValue placeholder={formData.universityId ? 'Select program...' : 'Select a university first'} />
                          </SelectTrigger>
                          <SelectContent>
                            {filteredPrograms.filter((p: any) => p && p.id).map((p: any) => (
                              <SelectItem key={p.id} value={p.id}>{p.name} {p.code ? `(${p.code})` : ''}</SelectItem>
                            ))}
                            {filteredPrograms.length === 0 && (
                              <div className="px-3 py-2 text-sm text-muted-foreground">No programs found for this university</div>
                            )}
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <Label className="font-medium">Enrollment Number *</Label>
                          <Input
                            placeholder="e.g. PYPEER001"
                            value={formData.enrollmentNo}
                            onChange={(e) => setFormData({...formData, enrollmentNo: e.target.value})}
                            required
                          />
                        </div>
                        <div>
                          <Label className="font-medium">Admission Number</Label>
                          <div className="flex gap-2">
                            <Input
                              placeholder="Auto-generated"
                              value={formData.admissionNo}
                              onChange={(e) => setFormData({...formData, admissionNo: e.target.value})}
                            />
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              className="shrink-0"
                              onClick={() => setFormData({...formData, admissionNo: generateAdmissionNo()})}
                            >
                              Generate
                            </Button>
                          </div>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <Label className="font-medium">{formData.isPrevious ? 'Previous Admission Date *' : 'Admission Date'}</Label>
                          <Input
                            type="date"
                            value={formData.admissionDate}
                            onChange={(e) => setFormData({...formData, admissionDate: e.target.value})}
                            required={formData.isPrevious}
                          />
                        </div>
                        <div>
                          <Label className="font-medium">Status</Label>
                          <Select value={formData.status} onValueChange={(v) => setFormData({...formData, status: v})}>
                            <SelectTrigger><SelectValue /></SelectTrigger>
                            <SelectContent>
                              <SelectItem value="pending">Pending</SelectItem>
                              <SelectItem value="active">Active</SelectItem>
                              <SelectItem value="inactive">Inactive</SelectItem>
                              <SelectItem value="completed">Completed</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* STEP 1: PERSONAL DETAILS */}
                  {formStep === 1 && (
                    <div className="space-y-4">
                      <div>
                        <Label className="font-medium">Full Name *</Label>
                        <Input value={formData.name} onChange={(e) => setFormData({...formData, name: e.target.value})} required placeholder="Student's full name" />
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <Label className="font-medium">Email *</Label>
                          <Input type="email" value={formData.email} onChange={(e) => setFormData({...formData, email: e.target.value})} required placeholder="student@example.com" />
                        </div>
                        <div>
                          <Label className="font-medium">Contact Number *</Label>
                          <Input value={formData.phone} onChange={(e) => setFormData({...formData, phone: e.target.value})} required placeholder="10-digit mobile" />
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <Label className="font-medium">Date of Birth</Label>
                          <Input type="date" value={formData.dob} onChange={(e) => setFormData({...formData, dob: e.target.value})} />
                        </div>
                        <div>
                          <Label className="font-medium">Alternate Phone</Label>
                          <Input value={formData.altPhone} onChange={(e) => setFormData({...formData, altPhone: e.target.value})} placeholder="Optional" />
                        </div>
                      </div>
                      <div>
                        <Label className="font-medium">Address *</Label>
                        <Textarea value={formData.address} onChange={(e) => setFormData({...formData, address: e.target.value})} required placeholder="Full residential address" rows={2} />
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <Label className="font-medium">PIN Code</Label>
                          <Input value={formData.pinCode} onChange={(e) => setFormData({...formData, pinCode: e.target.value})} placeholder="6-digit PIN" maxLength={6} />
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <Label className="font-medium">Religion</Label>
                          <Input value={formData.religion} onChange={(e) => setFormData({...formData, religion: e.target.value})} placeholder="e.g. Hindu, Muslim, Christian" />
                        </div>
                        <div>
                          <Label className="font-medium">Caste / Category</Label>
                          <Input value={formData.caste} onChange={(e) => setFormData({...formData, caste: e.target.value})} placeholder="e.g. OBC, SC, ST, General" />
                        </div>
                      </div>
                      {/* Photo Upload */}
                      <div>
                        <Label className="font-medium font-semibold text-slate-800 dark:text-slate-200">Student Photo *</Label>
                        <div className="flex items-center gap-4 mt-2 p-3 rounded-xl border bg-slate-50 dark:bg-slate-900/20">
                          {formData.photo ? (
                            <div className="relative group">
                              <img src={formData.photo.startsWith('http') ? formData.photo : `${api.getBaseUrl().replace('/api/v1', '')}${formData.photo}`} alt="Student" className="w-20 h-20 rounded-full object-cover border-2 border-primary/30" />
                              <button
                                type="button"
                                onClick={() => setFormData({...formData, photo: ''})}
                                className="absolute -top-1 -right-1 bg-rose-500 text-white rounded-full p-1 hover:bg-rose-600 transition-colors shadow-sm"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          ) : (
                            <div className="w-20 h-20 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center border-2 border-dashed border-slate-350">
                              <User className="w-9 h-9 text-slate-400" />
                            </div>
                          )}
                          <div className="flex-1 space-y-2">
                            <input
                              type="file"
                              accept="image/*"
                              required={!formData.photo}
                              id="salesStudentPhotoUpload"
                              className="hidden"
                              onChange={async (e) => {
                                const file = e.target.files?.[0];
                                if (!file) return;
                                const toastId = toast.loading('Uploading photo...');
                                try {
                                  const uploadData = new FormData();
                                  uploadData.append('file', file);
                                  const res = await api.post('/auth/upload', uploadData, {
                                    headers: { 'Content-Type': 'multipart/form-data' }
                                  });
                                  setFormData({ ...formData, photo: res.data.url });
                                  toast.success('Photo uploaded successfully', { id: toastId });
                                } catch (err) {
                                  toast.error('Failed to upload photo', { id: toastId });
                                }
                              }}
                            />
                            <Label
                              htmlFor="salesStudentPhotoUpload"
                              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border bg-white dark:bg-slate-850 hover:bg-slate-50 cursor-pointer text-xs font-semibold shadow-sm transition-all"
                            >
                              <Upload className="w-3.5 h-3.5" />
                              Select Photo
                            </Label>
                            <p className="text-[11px] text-muted-foreground">JPG, PNG allowed (Max 10MB)</p>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* STEP 2: FAMILY INFO */}
                  {formStep === 2 && (
                    <div className="space-y-5">
                      <div className="p-4 rounded-xl border bg-blue-50/50 dark:bg-blue-950/10 space-y-4">
                        <h4 className="font-semibold text-slate-800 dark:text-slate-200 flex items-center gap-2">
                          <User className="w-4 h-4 text-blue-500" /> Father's Information
                        </h4>
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <Label className="font-medium">Father's Name</Label>
                            <Input value={formData.fatherName} onChange={(e) => setFormData({...formData, fatherName: e.target.value})} placeholder="Father's full name" />
                          </div>
                          <div>
                            <Label className="font-medium">Father's Mobile</Label>
                            <Input value={formData.fatherPhone} onChange={(e) => setFormData({...formData, fatherPhone: e.target.value})} placeholder="10-digit mobile" />
                          </div>
                        </div>
                      </div>
                      <div className="p-4 rounded-xl border bg-pink-50/50 dark:bg-pink-950/10 space-y-4">
                        <h4 className="font-semibold text-slate-800 dark:text-slate-200 flex items-center gap-2">
                          <User className="w-4 h-4 text-pink-500" /> Mother's Information
                        </h4>
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <Label className="font-medium">Mother's Name</Label>
                            <Input value={formData.motherName} onChange={(e) => setFormData({...formData, motherName: e.target.value})} placeholder="Mother's full name" />
                          </div>
                          <div>
                            <Label className="font-medium">Mother's Mobile</Label>
                            <Input value={formData.motherPhone} onChange={(e) => setFormData({...formData, motherPhone: e.target.value})} placeholder="10-digit mobile" />
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* STEP 3: DOCUMENTS */}
                  {formStep === 3 && (
                    <div className="space-y-4">
                      <p className="text-sm text-amber-600 dark:text-amber-400 font-semibold">Please upload the required files directly. All files must be uploaded to save the student record.</p>
                      {['Aadhaar Card', 'SSLC Certificate', 'Plus Two Certificate', 'Transfer Certificate', 'Birth Certificate', 'Other'].map((docType) => {
                        const isOptional = ['Transfer Certificate', 'Birth Certificate', 'Other'].includes(docType);
                        const existing = (formData.documents || []).find((d: any) => d.type === docType);
                        const elementId = `sales-doc-upload-${docType.replace(/\s+/g, '-')}`;
                        return (
                          <div key={docType} className="flex items-center justify-between p-3 rounded-xl border bg-slate-50 dark:bg-slate-900/10 gap-4">
                            <div className="flex-1 min-w-0">
                              <div className="text-sm font-semibold text-slate-800 dark:text-slate-200">
                                {docType} {isOptional ? <span className="text-xs text-muted-foreground font-normal">(optional)</span> : '*'}
                              </div>
                              {existing?.url ? (
                                <div className="text-xs text-emerald-600 dark:text-emerald-400 font-medium mt-1 truncate">
                                  ✓ Uploaded: {existing.url.split('/').pop()}
                                </div>
                              ) : isOptional ? (
                                <div className="text-xs text-muted-foreground font-medium mt-1">
                                  Optional
                                </div>
                              ) : (
                                <div className="text-xs text-rose-500 font-medium mt-1">
                                  ⚠️ Required
                                </div>
                              )}
                            </div>
                            <div className="flex items-center gap-2 shrink-0">
                              {existing?.url && (
                                <a
                                  href={existing.url.startsWith('http') ? existing.url : `${api.getBaseUrl().replace('/api/v1', '')}${existing.url}`}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="inline-flex items-center px-2.5 py-1.5 rounded-lg border bg-white dark:bg-slate-800 text-xs font-medium hover:bg-slate-50 cursor-pointer shadow-sm"
                                >
                                  View
                                </a>
                              )}
                              <input
                                type="file"
                                id={elementId}
                                className="hidden"
                                onChange={async (e) => {
                                  const file = e.target.files?.[0];
                                  if (!file) return;
                                  const toastId = toast.loading(`Uploading ${docType}...`);
                                  try {
                                    const uploadData = new FormData();
                                    uploadData.append('file', file);
                                    const res = await api.post('/auth/upload', uploadData, {
                                      headers: { 'Content-Type': 'multipart/form-data' }
                                    });
                                    const newDocs = (formData.documents || []).filter((d: any) => d.type !== docType);
                                    newDocs.push({ type: docType, url: res.data.url });
                                    setFormData({ ...formData, documents: newDocs });
                                    toast.success(`${docType} uploaded successfully`, { id: toastId });
                                  } catch (err) {
                                    toast.error(`Failed to upload ${docType}`, { id: toastId });
                                  }
                                }}
                              />
                              <Label
                                htmlFor={elementId}
                                className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-primary text-primary-foreground text-xs font-semibold hover:bg-primary/90 cursor-pointer shadow-sm"
                              >
                                <Upload className="w-3 h-3" />
                                {existing?.url ? 'Change File' : 'Upload File'}
                              </Label>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}

                </div>

                {/* Footer buttons */}
                <div className="flex items-center justify-between pt-3 border-t mt-3">
                  <Button type="button" variant="outline" onClick={() => setFormStep(Math.max(0, formStep - 1))} disabled={formStep === 0}>
                    ← Back
                  </Button>
                  <div className="text-xs text-muted-foreground">Step {formStep + 1} of 4</div>
                  {formStep < 3 ? (
                    <Button type="button" onClick={() => setFormStep(formStep + 1)}>
                      Next <ChevronRight className="w-4 h-4 ml-1" />
                    </Button>
                  ) : (
                    <Button type="submit" className="bg-primary">
                      {editingId ? 'Update Student' : 'Save Student'}
                    </Button>
                  )}
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Search Bar */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          placeholder="Search students by name, email, enrollment number, program or center..."
          className="pl-9 bg-card"
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
      </div>

      {/* Student List */}
      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map(i => (
            <div key={i} className="h-20 bg-muted rounded-xl animate-pulse" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <Card>
          <CardContent className="py-16 text-center text-muted-foreground">
            <GraduationCap className="w-10 h-10 mx-auto mb-3 opacity-30" />
            <p className="font-medium">No students found</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-3">
          {filtered.map(student => (
            <Card
              key={student.id}
              className="hover:border-primary/40 cursor-pointer transition-all duration-250 hover:shadow-md"
              onClick={() => handleOpenProfile(student)}
            >
              <CardContent className="p-4 flex items-center justify-between gap-4">
                <div className="flex items-center gap-4 min-w-0">
                  <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center text-primary shrink-0">
                    <GraduationCap className="w-6 h-6" />
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <h4 className="font-semibold text-slate-900 dark:text-slate-100 truncate">{student.name}</h4>
                      <Badge variant="outline" className="text-[10px] uppercase bg-green-50 text-green-700 border-green-200">
                        {student.status}
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground font-mono">
                      {student.enrollmentNo}
                    </p>
                    <div className="flex flex-wrap gap-x-4 gap-y-0.5 mt-1.5 text-xs text-muted-foreground font-medium">
                      <span className="flex items-center gap-1"><Mail className="w-3.5 h-3.5" />{student.email}</span>
                      <span className="flex items-center gap-1"><Phone className="w-3.5 h-3.5" />{student.phone}</span>
                      {student.program && <span>📚 {student.program.name}</span>}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                  <Button variant="ghost" size="icon" onClick={() => handleEdit(student)}>
                    <Edit className="w-4 h-4 text-slate-600" />
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => handleOpenProfile(student)} className="gap-1">
                    <Eye className="w-4 h-4" /> View Profile
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Student Profile & Documents Modal */}
      <Dialog open={profileOpen} onOpenChange={setProfileOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          {selectedStudent && (
            <>
              <DialogHeader>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-primary/15 flex items-center justify-center text-primary shrink-0">
                    <GraduationCap className="w-5 h-5" />
                  </div>
                  <div>
                    <DialogTitle className="text-xl">{selectedStudent.name}</DialogTitle>
                    <p className="text-xs text-muted-foreground font-mono mt-0.5">{selectedStudent.enrollmentNo}</p>
                  </div>
                </div>
              </DialogHeader>

              <div className="space-y-6 py-4">
                {/* Personal Information */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-muted/30 p-4 rounded-xl">
                  <div className="space-y-3">
                    <div className="flex items-start gap-2.5">
                      <User className="w-4 h-4 text-muted-foreground mt-0.5" />
                      <div>
                        <p className="text-[10px] uppercase font-bold text-muted-foreground">Father's Name</p>
                        <p className="text-sm font-medium">{selectedStudent.fatherName || 'N/A'}</p>
                      </div>
                    </div>

                    <div className="flex items-start gap-2.5">
                      <Calendar className="w-4 h-4 text-muted-foreground mt-0.5" />
                      <div>
                        <p className="text-[10px] uppercase font-bold text-muted-foreground">Date of Birth</p>
                        <p className="text-sm font-medium">
                          {selectedStudent.dob ? new Date(selectedStudent.dob).toLocaleDateString() : 'N/A'}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-start gap-2.5">
                      <Mail className="w-4 h-4 text-muted-foreground mt-0.5" />
                      <div>
                        <p className="text-[10px] uppercase font-bold text-muted-foreground">Email</p>
                        <p className="text-sm font-medium">{selectedStudent.email}</p>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <div className="flex items-start gap-2.5">
                      <Phone className="w-4 h-4 text-muted-foreground mt-0.5" />
                      <div>
                        <p className="text-[10px] uppercase font-bold text-muted-foreground">Phone Number</p>
                        <p className="text-sm font-medium">{selectedStudent.phone}</p>
                      </div>
                    </div>

                    {selectedStudent.altPhone && (
                      <div className="flex items-start gap-2.5">
                        <Phone className="w-4 h-4 text-muted-foreground mt-0.5" />
                        <div>
                          <p className="text-[10px] uppercase font-bold text-muted-foreground">Alternative Phone</p>
                          <p className="text-sm font-medium">{selectedStudent.altPhone}</p>
                        </div>
                      </div>
                    )}

                    <div className="flex items-start gap-2.5">
                      <MapPin className="w-4 h-4 text-muted-foreground mt-0.5" />
                      <div>
                        <p className="text-[10px] uppercase font-bold text-muted-foreground">Address &amp; Pin Code</p>
                        <p className="text-sm font-medium">
                          {selectedStudent.address}
                          {selectedStudent.pinCode && ` - ${selectedStudent.pinCode}`}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Academic Context */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="border rounded-xl p-4">
                    <p className="text-[10px] uppercase font-bold text-muted-foreground mb-1">Academic Program</p>
                    <p className="font-semibold text-sm">{selectedStudent.program?.name || 'N/A'}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">Code: {selectedStudent.program?.code || 'N/A'}</p>
                  </div>
                  <div className="border rounded-xl p-4">
                    <p className="text-[10px] uppercase font-bold text-muted-foreground mb-1">Assigned Study Center</p>
                    <p className="font-semibold text-sm">{selectedStudent.center?.name || 'N/A'}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">Code: {selectedStudent.center?.code || 'N/A'}</p>
                  </div>
                </div>

                {/* Documents List */}
                <div className="space-y-4">
                  <h3 className="font-bold text-base border-b pb-2 flex items-center gap-2">
                    <FileText className="w-4 h-4 text-primary" /> Student Documents
                  </h3>

                  <div className="space-y-2">
                    {!selectedStudent.documents || selectedStudent.documents.length === 0 ? (
                      <p className="text-sm text-muted-foreground text-center py-4 bg-muted/10 rounded-xl border border-dashed">
                        No documents uploaded yet.
                      </p>
                    ) : (
                      selectedStudent.documents.map((doc, idx) => (
                        <div
                          key={idx}
                          className="flex items-center justify-between p-3 border rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800/40 text-sm"
                        >
                          <div className="flex items-center gap-3">
                            <div className="p-2 bg-primary/10 text-primary rounded-lg">
                              <FileText className="w-4 h-4" />
                            </div>
                            <div>
                              <p className="font-semibold text-slate-800 dark:text-slate-200">{doc.type || 'Document'}</p>
                              {doc.uploadedAt && (
                                <p className="text-[10px] text-muted-foreground mt-0.5">
                                  Uploaded on {new Date(doc.uploadedAt).toLocaleString()}
                                  {doc.uploadedBy && ` by ${doc.uploadedBy}`}
                                </p>
                              )}
                            </div>
                          </div>
                          <Button variant="outline" size="sm" asChild>
                            <a
                              href={doc.url.startsWith('/') ? `${api.getBaseUrl().replace('/api/v1', '')}${doc.url}` : doc.url}
                              target="_blank"
                              rel="noreferrer"
                              className="font-medium flex items-center gap-1"
                            >
                              View File
                            </a>
                          </Button>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </div>

              <DialogFooter>
                <Button onClick={() => setProfileOpen(false)}>Close Profile</Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
