import { useState, useEffect } from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import {
  User, Mail, Phone, Briefcase, Building2, Calendar,
  DollarSign, Target, TrendingUp, Star, Plus, Trash2, Edit,
  Save, RefreshCw, Award, AlertCircle, FileText
} from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import api from '@/lib/api';
import { uploadFormFile } from '@/lib/uploadFile';

import { CS } from '@/lib/currency';
import { confirmDialog } from '@/lib/confirm';
// ─── Types ────────────────────────────────────────────────────────────────────
interface KPI {
  id?: string;
  title: string;
  description?: string;
  target: number;
  achieved: number;
  unit: string;
  period: string;
  status: 'on_track' | 'at_risk' | 'achieved' | 'missed';
}

interface KRA {
  id?: string;
  area: string;
  description?: string;
  weightage: number;
  rating?: number;
  remarks?: string;
}

interface SalaryConfig {
  basicSalary?: number;
  allowances?: { hra?: number; da?: number; ta?: number; medical?: number; other?: number };
  deductions?: { pf?: number; esi?: number; tds?: number; other?: number };
  lateDeductionPerMinute?: number;
  earlyExitDeductionPerMinute?: number;
  wfhDeductionPerDay?: number;
  unpaidLeaveRule?: { type: string; dailyRate?: number; firstXDays?: number; firstXRate?: number; subsequentRate?: number };
}

interface ProfileData {
  profile: any;
  user: any;
  salaryConfig: SalaryConfig | null;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
const KPI_STATUS_COLORS: Record<string, string> = {
  on_track: 'bg-[#eaf6e6] text-[#256c1d]',
  at_risk: 'bg-amber-50 text-amber-700',
  achieved: 'bg-[#e3f7dd] text-[#1f6a17]',
  missed: 'bg-rose-50 text-rose-700',
};

function StarRating({ value, onChange }: { value?: number; onChange?: (v: number) => void }) {
  return (
    <div className="flex gap-1">
      {[1, 2, 3, 4, 5].map(n => (
        <button
          key={n}
          type="button"
          onClick={() => onChange?.(n)}
          className={cn('transition-colors', onChange ? 'cursor-pointer' : 'cursor-default')}
        >
          <Star className={cn('w-4 h-4', n <= (value || 0) ? 'fill-yellow-400 text-yellow-400' : 'text-gray-300')} />
        </button>
      ))}
    </div>
  );
}

function SectionTitle({ icon: Icon, title }: { icon: any; title: string }) {
  return (
    <div className="flex items-center gap-3 mb-4">
      <div className="w-9 h-9 rounded-full bg-[#eaf6e6] text-[#256c1d] flex items-center justify-center"><Icon className="w-4 h-4" /></div>
      <h3 className="font-semibold text-base text-foreground">{title}</h3>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────
interface Props {
  userId: string | null;
  open: boolean;
  onClose: () => void;
}

export function EmployeeProfilePanel({ userId, open, onClose }: Props) {
  const [data, setData] = useState<ProfileData | null>(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [tab, setTab] = useState('overview');

  // Edit states
  const [personalForm, setPersonalForm] = useState<any>({});
  const [employmentForm, setEmploymentForm] = useState<any>({});
  const [salaryForm, setSalaryForm] = useState<any>({});
  const [salaryConfigForm, setSalaryConfigForm] = useState<SalaryConfig>({});
  const [documentsForm, setDocumentsForm] = useState<any>({});
  const [kpis, setKpisRaw] = useState<KPI[]>([]);
  const [kras, setKrasRaw] = useState<KRA[]>([]);
  const [kpiKraDirty, setKpiKraDirty] = useState(false);
  const setKpis = (v: KPI[]) => { setKpisRaw(v); setKpiKraDirty(true); };
  const setKras = (v: KRA[]) => { setKrasRaw(v); setKpiKraDirty(true); };
  const [payrolls, setPayrolls] = useState<any[]>([]);
  const [reviewForm, setReviewForm] = useState<any>({});

  // KPI/KRA dialog
  const [kpiDialog, setKpiDialog] = useState(false);
  const [kraDialog, setKraDialog] = useState(false);
  const [editKpi, setEditKpi] = useState<KPI | null>(null);
  const [editKra, setEditKra] = useState<KRA | null>(null);
  const [kpiIdx, setKpiIdx] = useState<number | null>(null);
  const [kraIdx, setKraIdx] = useState<number | null>(null);

  const fetchProfile = async () => {
    if (!userId) return;
    setLoading(true);
    try {
      const res = await api.get(`/hr/employee-profiles/${userId}`);
      const d: ProfileData = res.data.data;
      setData(d);
      const p = d.profile || {};
      const u = d.user || {};
      setPersonalForm({
        dateOfBirth: p.dateOfBirth ? p.dateOfBirth.split('T')[0] : '',
        gender: p.gender || '',
        bloodGroup: p.bloodGroup || '',
        address: p.address || '',
        city: p.city || '',
        state: p.state || '',
        pincode: p.pincode || '',
        emergencyName: p.emergencyContact?.name || '',
        emergencyPhone: p.emergencyContact?.phone || '',
        emergencyRelation: p.emergencyContact?.relation || '',
      });
      setEmploymentForm({
        employeeCode: p.employeeCode || u.userId || '',
        joinDate: p.joinDate ? p.joinDate.split('T')[0] : '',
        confirmationDate: p.confirmationDate ? p.confirmationDate.split('T')[0] : '',
        probationEndDate: p.probationEndDate ? p.probationEndDate.split('T')[0] : '',
        employmentType: p.employmentType || 'full_time',
        workLocation: p.workLocation || '',
        designation: u.designation || '',
        phone: u.phone || '',
      });
      setSalaryForm({
        ctc: p.ctc || '',
        basicSalary: p.basicSalary || '',
        bankName: p.bankName || '',
        bankAccountNo: p.bankAccountNo || '',
        ifscCode: p.ifscCode || '',
        panNumber: p.panNumber || '',
      });
      setDocumentsForm({
        jdFile: p.jdFile || '',
        offerLetterFile: p.offerLetterFile || '',
        sopFile: p.sopFile || '',
      });
      const sc = d.salaryConfig || {};
      setSalaryConfigForm({
        basicSalary: (sc as any).basicSalary || 0,
        allowances: (sc as any).allowances || { hra: 0, da: 0, ta: 0, medical: 0, other: 0 },
        deductions: (sc as any).deductions || { pf: 0, esi: 0, tds: 0, other: 0 },
        lateDeductionPerMinute: (sc as any).lateDeductionPerMinute || 0,
        earlyExitDeductionPerMinute: (sc as any).earlyExitDeductionPerMinute || 0,
        wfhDeductionPerDay: (sc as any).wfhDeductionPerDay || 0,
        unpaidLeaveRule: (sc as any).unpaidLeaveRule || { type: 'standard' },
      });
      setKpisRaw(p.kpis || []);
      setKrasRaw(p.kras || []);
      setKpiKraDirty(false);
      setReviewForm({
        lastReviewDate: p.lastReviewDate ? p.lastReviewDate.split('T')[0] : '',
        nextReviewDate: p.nextReviewDate ? p.nextReviewDate.split('T')[0] : '',
        overallRating: p.overallRating || 0,
        reviewRemarks: p.reviewRemarks || '',
      });
    } catch {
      toast.error('Failed to load employee profile');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (open && userId) { setTab('overview'); fetchProfile(); }
  }, [open, userId]);

  useEffect(() => {
    const fetchPayrolls = async () => {
      try {
        const pRes = await api.get(`/payroll?employeeId=${userId}`);
        setPayrolls(pRes.data.data || []);
      } catch (e) {
        toast.error('Failed to load payroll history');
      }
    };
    if (tab === 'payroll_history' && userId) {
      fetchPayrolls();
    }
  }, [tab, userId]);

  // ─── Save handlers ────────────────────────────────────────────────────────
  const savePersonal = async () => {
    setSaving(true);
    try {
      await api.put(`/hr/employee-profiles/${userId}`, {
        dateOfBirth: personalForm.dateOfBirth || null,
        gender: personalForm.gender || null,
        bloodGroup: personalForm.bloodGroup || null,
        address: personalForm.address,
        city: personalForm.city,
        state: personalForm.state,
        pincode: personalForm.pincode,
        emergencyContact: {
          name: personalForm.emergencyName,
          phone: personalForm.emergencyPhone,
          relation: personalForm.emergencyRelation,
        },
      });
      toast.success('Personal info saved');
      fetchProfile();
    } catch { toast.error('Save failed'); } finally { setSaving(false); }
  };

  const saveEmployment = async () => {
    setSaving(true);
    try {
      await api.put(`/hr/employee-profiles/${userId}`, {
        employeeCode: employmentForm.employeeCode,
        joinDate: employmentForm.joinDate || null,
        confirmationDate: employmentForm.confirmationDate || null,
        probationEndDate: employmentForm.probationEndDate || null,
        employmentType: employmentForm.employmentType,
        workLocation: employmentForm.workLocation,
      });
      toast.success('Employment info saved');
      fetchProfile();
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Employment details not saved');
    } finally {
      setSaving(false);
    }
  };

  const saveSalary = async () => {
    setSaving(true);
    try {
      // Salary itself is configured in the Salary Configuration panel; only bank/tax details are saved here.
      await api.patch(`/hr/employee-profiles/${userId}/salary`, {
        bankName: salaryForm.bankName,
        bankAccountNo: salaryForm.bankAccountNo,
        ifscCode: salaryForm.ifscCode,
        panNumber: salaryForm.panNumber,
      });
      toast.success('Bank details saved');
      fetchProfile();
    } catch (e: any) { toast.error(e?.response?.data?.message || 'Save failed'); } finally { setSaving(false); }
  };

  const saveKPIs = async () => {
    setSaving(true);
    try {
      await api.patch(`/hr/employee-profiles/${userId}/kpis`, { kpis });
      toast.success('KPIs saved');
      setKpiKraDirty(false);
    } catch { toast.error('Save failed'); } finally { setSaving(false); }
  };

  const saveKRAs = async () => {
    setSaving(true);
    try {
      await api.patch(`/hr/employee-profiles/${userId}/kras`, { kras });
      toast.success('KRAs saved');
      setKpiKraDirty(false);
    } catch { toast.error('Save failed'); } finally { setSaving(false); }
  };

  const saveReview = async () => {
    setSaving(true);
    try {
      await api.put(`/hr/employee-profiles/${userId}`, {
        ...reviewForm,
        overallRating: reviewForm.overallRating || null,
        lastReviewDate: reviewForm.lastReviewDate || null,
        nextReviewDate: reviewForm.nextReviewDate || null,
      });
      toast.success('Review saved');
      fetchProfile();
    } catch { toast.error('Save failed'); } finally { setSaving(false); }
  };

  const saveDocuments = async () => {
    setSaving(true);
    try {
      await api.put(`/hr/employee-profiles/${userId}`, documentsForm);
      toast.success('Documents saved');
      fetchProfile();
    } catch { toast.error('Save failed'); } finally { setSaving(false); }
  };

  const uploadDocument = async (e: React.ChangeEvent<HTMLInputElement>, field: string) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setSaving(true);
    const toastId = toast.loading('Compressing & uploading file...');
    try {
      const url = await uploadFormFile(file);
      setDocumentsForm((prev: Record<string, any>) => ({ ...prev, [field]: url }));
      toast.success('File uploaded successfully', { id: toastId });
    } catch (err: any) {
      toast.error(err.message || 'Upload failed', { id: toastId });
    } finally {
      setSaving(false);
    }
  };

  // ─── KPI helpers ──────────────────────────────────────────────────────────
  const openAddKpi = () => { setEditKpi({ title: '', target: 100, achieved: 0, unit: '%', period: '', status: 'on_track' }); setKpiIdx(null); setKpiDialog(true); };
  const openEditKpi = (kpi: KPI, idx: number) => { setEditKpi({ ...kpi }); setKpiIdx(idx); setKpiDialog(true); };
  const saveKpiDialog = () => {
    if (!editKpi) return;
    const updated = [...kpis];
    if (kpiIdx !== null) updated[kpiIdx] = editKpi; else updated.push(editKpi);
    setKpis(updated);
    setKpiDialog(false);
  };
  const removeKpi = (idx: number) => setKpis(kpis.filter((_, i) => i !== idx));

  // ─── KRA helpers ──────────────────────────────────────────────────────────
  const openAddKra = () => { setEditKra({ area: '', weightage: 10, rating: undefined }); setKraIdx(null); setKraDialog(true); };
  const openEditKra = (kra: KRA, idx: number) => { setEditKra({ ...kra }); setKraIdx(idx); setKraDialog(true); };
  const saveKraDialog = () => {
    if (!editKra) return;
    const updated = [...kras];
    if (kraIdx !== null) updated[kraIdx] = editKra; else updated.push(editKra);
    setKras(updated);
    setKraDialog(false);
  };
  const removeKra = (idx: number) => setKras(kras.filter((_, i) => i !== idx));

  const totalKraWeightage = kras.reduce((s, k) => s + (k.weightage || 0), 0);
  const avgKraRating = kras.filter(k => k.rating).length
    ? (kras.reduce((s, k) => s + (k.rating || 0), 0) / kras.filter(k => k.rating).length).toFixed(1)
    : '—';

  const user = data?.user;
  const profile = data?.profile;

  return (
    <Sheet open={open} onOpenChange={async v => {
      if (v) return;
      if (kpiKraDirty && !(await confirmDialog({ title: 'Discard unsaved changes?', message: 'You have unsaved KPI/KRA changes. Close without saving?', confirmText: 'Close Without Saving', tone: 'danger' }))) return;
      onClose();
    }}>
      <SheetContent side="right" style={{ fontFamily: "Urbanist, ui-sans-serif, system-ui, sans-serif" }} className="w-full sm:max-w-3xl overflow-y-auto p-0 border-0 bg-white sm:rounded-l-[2rem]">
        {/* Profile Header */}
        <div className="px-6 sm:px-8 pt-8 pb-5">
          <SheetHeader className="p-0">
            <div className="flex items-center gap-4 pr-10">
              <div className="w-16 h-16 rounded-2xl bg-[#eaf6e6] text-[#256c1d] flex items-center justify-center text-2xl font-semibold shrink-0">
                {user?.name?.charAt(0)?.toUpperCase() || '?'}
              </div>
              <div className="flex-1 min-w-0">
                <SheetTitle className="text-2xl font-semibold tracking-tight truncate">{user?.name || 'Employee Profile'}</SheetTitle>
                <p className="text-sm text-muted-foreground mt-0.5 capitalize">{user?.designation || user?.role?.replace(/_/g, ' ')}</p>
                <div className="flex items-center gap-1.5 mt-2 flex-wrap">
                  {user?.departmentId?.name && (
                    <span className="inline-flex items-center gap-1 text-[11px] font-medium px-2.5 py-1 rounded-full bg-[#f1f3ef] text-slate-600"><Building2 className="w-3 h-3" />{user.departmentId.name}</span>
                  )}
                  <span className={cn('inline-flex items-center gap-1.5 text-[11px] font-semibold px-2.5 py-1 rounded-full capitalize', user?.status === 'active' ? 'bg-[#e3f7dd] text-[#1f6a17]' : 'bg-slate-100 text-slate-600')}>
                    <span className={cn('w-1.5 h-1.5 rounded-full', user?.status === 'active' ? 'bg-[#54b947]' : 'bg-slate-400')} />
                    {user?.status?.replace('_', ' ')}
                  </span>
                  {profile?.employmentType && (
                    <span className="text-[11px] font-medium px-2.5 py-1 rounded-full bg-white border border-slate-200 text-slate-600 capitalize">{profile.employmentType.replace('_', ' ')}</span>
                  )}
                </div>
              </div>
              <button onClick={fetchProfile} disabled={loading} title="Refresh" className="w-10 h-10 rounded-full bg-white border border-slate-200 flex items-center justify-center text-slate-600 hover:bg-[#eaf6e6] hover:text-[#256c1d] transition-colors shrink-0 disabled:opacity-50">
                <RefreshCw className={cn('w-4 h-4', loading && 'animate-spin')} />
              </button>
            </div>
          </SheetHeader>
        </div>

        {loading ? (
          <div className="flex items-center justify-center h-64 text-muted-foreground">
            <RefreshCw className="w-5 h-5 animate-spin mr-2" /> Loading...
          </div>
        ) : (
          <Tabs value={tab} onValueChange={setTab} className="flex flex-col h-full">
            <TabsList className="flex-wrap h-auto gap-1.5 mx-6 sm:mx-8 mt-1 justify-start bg-transparent p-0">
              {['overview', 'personal', 'employment', 'salary', 'payroll_history', 'kpi', 'kra', 'review', 'documents'].map(t => (
                <TabsTrigger key={t} value={t} className="capitalize rounded-full px-4 h-9 text-xs font-semibold bg-[#f4f6f3] text-slate-600 hover:bg-[#eaf6e6] data-[state=active]:bg-[#0b1d14] data-[state=active]:text-white data-[state=active]:shadow-none">
                  {t === 'kpi' ? 'KPI' : t === 'kra' ? 'KRA' : t === 'payroll_history' ? 'Payroll History' : t === 'documents' ? 'Documents' : t.charAt(0).toUpperCase() + t.slice(1)}
                </TabsTrigger>
              ))}
            </TabsList>

            <div className="flex-1 overflow-y-auto px-6 sm:px-8 py-6 space-y-5">

              {/* ── OVERVIEW ── */}
              <TabsContent value="overview" className="space-y-4 mt-0">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <Card className="bg-[#f4f6f3] shadow-none"><CardContent className="p-5 space-y-2">
                    <p className="text-xs font-medium text-muted-foreground">Contact</p>
                    <div className="flex items-center gap-2 text-sm"><Mail className="w-4 h-4 text-muted-foreground" />{user?.email}</div>
                    {user?.phone && <div className="flex items-center gap-2 text-sm"><Phone className="w-4 h-4 text-muted-foreground" />{user.phone}</div>}
                  </CardContent></Card>
                  <Card className="bg-[#f4f6f3] shadow-none"><CardContent className="p-5 space-y-2">
                    <p className="text-xs font-medium text-muted-foreground">Employment</p>
                    <div className="flex items-center gap-2 text-sm"><Briefcase className="w-4 h-4 text-muted-foreground" />{profile?.employeeCode || user?.userId || '—'}</div>
                    {profile?.joinDate && <div className="flex items-center gap-2 text-sm"><Calendar className="w-4 h-4 text-muted-foreground" />Joined {new Date(profile.joinDate).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}</div>}
                  </CardContent></Card>
                </div>

                {/* KPI Summary */}
                {kpis.length > 0 && (
                  <Card className="bg-[#f4f6f3] shadow-none">
                    <CardHeader className="px-5 pt-5 pb-2"><CardTitle className="text-sm flex items-center gap-2"><Target className="w-4 h-4" />KPI Summary</CardTitle></CardHeader>
                    <CardContent className="px-5 pb-5 pt-1 space-y-3">
                      {kpis.map((kpi, i) => {
                        const pct = Math.min(100, Math.round((kpi.achieved / kpi.target) * 100));
                        return (
                          <div key={i}>
                            <div className="flex justify-between text-sm mb-1">
                              <span className="font-medium">{kpi.title}</span>
                              <span className="text-muted-foreground">{kpi.achieved}/{kpi.target} {kpi.unit}</span>
                            </div>
                            <div className="h-2 bg-white rounded-full overflow-hidden">
                              <div className={cn('h-full rounded-full', pct >= 100 ? 'bg-green-500' : pct >= 60 ? 'bg-emerald-500' : 'bg-yellow-500')} style={{ width: `${pct}%` }} />
                            </div>
                          </div>
                        );
                      })}
                    </CardContent>
                  </Card>
                )}

                {/* KRA Summary */}
                {kras.length > 0 && (
                  <Card className="bg-[#f4f6f3] shadow-none">
                    <CardHeader className="px-5 pt-5 pb-2"><CardTitle className="text-sm flex items-center gap-2"><Award className="w-4 h-4" />KRA Summary · Avg Rating: {avgKraRating}</CardTitle></CardHeader>
                    <CardContent className="px-5 pb-5 pt-1">
                      <div className="space-y-2">
                        {kras.map((kra, i) => (
                          <div key={i} className="flex items-center justify-between py-1.5 border-b last:border-0">
                            <div>
                              <p className="text-sm font-medium">{kra.area}</p>
                              <p className="text-xs text-muted-foreground">Weightage: {kra.weightage}%</p>
                            </div>
                            <StarRating value={kra.rating} />
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* Review info */}
                {(profile?.overallRating || profile?.nextReviewDate) && (
                  <Card className="bg-[#f4f6f3] shadow-none">
                    <CardContent className="p-5 flex items-center justify-between">
                      <div>
                        <p className="text-xs font-medium text-muted-foreground mb-1">Overall Rating</p>
                        <StarRating value={profile.overallRating} />
                      </div>
                      {profile.nextReviewDate && (
                        <div className="text-right">
                          <p className="text-xs font-medium text-muted-foreground mb-1">Next Review</p>
                          <p className="text-sm font-medium">{new Date(profile.nextReviewDate).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}</p>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                )}
              </TabsContent>

              {/* ── DOCUMENTS ── */}
              <TabsContent value="documents" className="space-y-4 mt-0">
                <SectionTitle icon={Building2} title="Employee Documents" />
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                  <Card className="bg-[#f4f6f3] shadow-none">
                    <CardHeader className="px-5 pt-5 pb-2"><CardTitle className="text-sm">Job Description (JD)</CardTitle></CardHeader>
                    <CardContent className="px-5 pb-5 pt-1 space-y-2">
                      {documentsForm.jdFile ? (
                        <div className="flex items-center justify-between p-2 border rounded text-sm">
                          <a href={documentsForm.jdFile} target="_blank" rel="noreferrer" className="text-[#256c1d] hover:underline truncate">View JD Document</a>
                          <Button variant="ghost" size="sm" onClick={() => setDocumentsForm({...documentsForm, jdFile: ''})}><Trash2 className="w-4 h-4 text-red-500"/></Button>
                        </div>
                      ) : (
                        <div>
                          <Label>Upload JD</Label>
                          <Input type="file" onChange={(e) => uploadDocument(e, 'jdFile')} disabled={saving} />
                        </div>
                      )}
                    </CardContent>
                  </Card>
                  
                  <Card className="bg-[#f4f6f3] shadow-none">
                    <CardHeader className="px-5 pt-5 pb-2"><CardTitle className="text-sm">Offer Letter</CardTitle></CardHeader>
                    <CardContent className="px-5 pb-5 pt-1 space-y-2">
                      {documentsForm.offerLetterFile ? (
                        <div className="flex items-center justify-between p-2 border rounded text-sm">
                          <a href={documentsForm.offerLetterFile} target="_blank" rel="noreferrer" className="text-[#256c1d] hover:underline truncate">View Offer Letter</a>
                          <Button variant="ghost" size="sm" onClick={() => setDocumentsForm({...documentsForm, offerLetterFile: ''})}><Trash2 className="w-4 h-4 text-red-500"/></Button>
                        </div>
                      ) : (
                        <div>
                          <Label>Upload Offer Letter</Label>
                          <Input type="file" onChange={(e) => uploadDocument(e, 'offerLetterFile')} disabled={saving} />
                        </div>
                      )}
                    </CardContent>
                  </Card>
                  
                  <Card className="bg-[#f4f6f3] shadow-none">
                    <CardHeader className="px-5 pt-5 pb-2"><CardTitle className="text-sm">SOP</CardTitle></CardHeader>
                    <CardContent className="px-5 pb-5 pt-1 space-y-2">
                      {documentsForm.sopFile ? (
                        <div className="flex items-center justify-between p-2 border rounded text-sm">
                          <a href={documentsForm.sopFile} target="_blank" rel="noreferrer" className="text-[#256c1d] hover:underline truncate">View SOP Document</a>
                          <Button variant="ghost" size="sm" onClick={() => setDocumentsForm({...documentsForm, sopFile: ''})}><Trash2 className="w-4 h-4 text-red-500"/></Button>
                        </div>
                      ) : (
                        <div>
                          <Label>Upload SOP</Label>
                          <Input type="file" onChange={(e) => uploadDocument(e, 'sopFile')} disabled={saving} />
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </div>
                <div className="flex justify-end pt-4"><Button onClick={saveDocuments} disabled={saving} className="rounded-full h-11 px-6 bg-slate-900 hover:bg-slate-800 text-white font-semibold shadow-none">{saving ? <RefreshCw className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />} Save Documents</Button></div>
              </TabsContent>

              {/* ── PERSONAL ── */}
              <TabsContent value="personal" className="space-y-4 mt-0">
                <SectionTitle icon={User} title="Personal Information" />
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div><Label>Date of Birth</Label><Input type="date" value={personalForm.dateOfBirth} onChange={e => setPersonalForm({ ...personalForm, dateOfBirth: e.target.value })} /></div>
                  <div><Label>Gender</Label>
                    <Select value={personalForm.gender} onValueChange={v => setPersonalForm({ ...personalForm, gender: v })}>
                      <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="male">Male</SelectItem>
                        <SelectItem value="female">Female</SelectItem>
                        <SelectItem value="other">Other</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div><Label>Blood Group</Label><Input value={personalForm.bloodGroup} onChange={e => setPersonalForm({ ...personalForm, bloodGroup: e.target.value })} placeholder="A+, B-, O+" /></div>
                  <div className="col-span-2"><Label>Address</Label><Input value={personalForm.address} onChange={e => setPersonalForm({ ...personalForm, address: e.target.value })} /></div>
                  <div><Label>City</Label><Input value={personalForm.city} onChange={e => setPersonalForm({ ...personalForm, city: e.target.value })} /></div>
                  <div><Label>State</Label><Input value={personalForm.state} onChange={e => setPersonalForm({ ...personalForm, state: e.target.value })} /></div>
                  <div><Label>Pincode</Label><Input value={personalForm.pincode} onChange={e => setPersonalForm({ ...personalForm, pincode: e.target.value })} /></div>
                </div>
                <SectionTitle icon={AlertCircle} title="Emergency Contact" />
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div><Label>Name</Label><Input value={personalForm.emergencyName} onChange={e => setPersonalForm({ ...personalForm, emergencyName: e.target.value })} /></div>
                  <div><Label>Phone</Label><Input value={personalForm.emergencyPhone} onChange={e => setPersonalForm({ ...personalForm, emergencyPhone: e.target.value })} /></div>
                  <div><Label>Relation</Label><Input value={personalForm.emergencyRelation} onChange={e => setPersonalForm({ ...personalForm, emergencyRelation: e.target.value })} placeholder="Spouse, Parent..." /></div>
                </div>
                <Button onClick={savePersonal} disabled={saving} className="w-full rounded-full h-11 px-6 bg-slate-900 hover:bg-slate-800 text-white font-semibold shadow-none"><Save className="w-4 h-4 mr-2" />Save Personal Info</Button>
              </TabsContent>

              {/* ── EMPLOYMENT ── */}
              <TabsContent value="employment" className="space-y-4 mt-0">
                <SectionTitle icon={Briefcase} title="Employment Details" />
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div><Label>Employee Code</Label><Input value={employmentForm.employeeCode} onChange={e => setEmploymentForm({ ...employmentForm, employeeCode: e.target.value })} /></div>
                  <div><Label>Designation</Label><Input value={employmentForm.designation} disabled /><p className="text-xs text-muted-foreground mt-1">Change in the Users screen.</p></div>
                  <div><Label>Phone</Label><Input value={employmentForm.phone} disabled /><p className="text-xs text-muted-foreground mt-1">Change in the Users screen.</p></div>
                  <div><Label>Employment Type</Label>
                    <Select value={employmentForm.employmentType} onValueChange={v => setEmploymentForm({ ...employmentForm, employmentType: v })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="full_time">Full Time</SelectItem>
                        <SelectItem value="part_time">Part Time</SelectItem>
                        <SelectItem value="contract">Contract</SelectItem>
                        <SelectItem value="intern">Intern</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div><Label>Join Date</Label><Input type="date" value={employmentForm.joinDate} onChange={e => setEmploymentForm({ ...employmentForm, joinDate: e.target.value })} /></div>
                  <div><Label>Confirmation Date</Label><Input type="date" value={employmentForm.confirmationDate} onChange={e => setEmploymentForm({ ...employmentForm, confirmationDate: e.target.value })} /></div>
                  <div><Label>Probation End Date</Label><Input type="date" value={employmentForm.probationEndDate} onChange={e => setEmploymentForm({ ...employmentForm, probationEndDate: e.target.value })} /></div>
                  <div><Label>Work Location</Label><Input value={employmentForm.workLocation} onChange={e => setEmploymentForm({ ...employmentForm, workLocation: e.target.value })} placeholder="Head Office, Remote..." /></div>
                </div>
                <Button onClick={saveEmployment} disabled={saving} className="w-full rounded-full h-11 px-6 bg-slate-900 hover:bg-slate-800 text-white font-semibold shadow-none"><Save className="w-4 h-4 mr-2" />Save Employment Info</Button>
              </TabsContent>

              {/* ── SALARY ── */}
              <TabsContent value="salary" className="space-y-4 mt-0">
                <div className="flex items-start gap-2 p-3 rounded-lg border border-emerald-200 bg-emerald-50 text-emerald-800 text-xs">
                  <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
                  <span>Note: Salary is configured in the <b>Salary Configuration</b> panel (HR &rarr; Salary Config). This tab only shows the configured salary.</span>
                </div>

                <SectionTitle icon={TrendingUp} title="Configured Salary" />
                {!data?.salaryConfig ? (
                  <div className="p-4 rounded-xl bg-muted/40 text-sm text-muted-foreground text-center">
                    No salary configured for this employee yet. Configure it in the Salary Configuration panel.
                  </div>
                ) : (() => {
                  const sc: any = data.salaryConfig;
                  const allowances = sc.allowances || {};
                  const deductions = sc.deductions || {};
                  const sum = (o: Record<string, any>) => Object.values(o).reduce((t: number, v: any) => t + (Number(v) || 0), 0);
                  const gross = (Number(sc.basicSalary) || 0) + sum(allowances);
                  const net = gross - sum(deductions);
                  const inr = (n: any) => `${CS()}${(Number(n) || 0).toLocaleString()}`;
                  const rule = sc.unpaidLeaveRule || { type: 'standard' };
                  const statusClass = sc.approvalStatus === 'approved' ? 'bg-[#e3f7dd] text-[#1f6a17]'
                    : sc.approvalStatus === 'rejected' ? 'bg-red-100 text-red-700' : 'bg-yellow-100 text-yellow-700';
                  const Row = ({ label, value }: { label: string; value: any }) => (
                    <div className="flex justify-between text-sm py-1.5 border-b border-border/40 last:border-0">
                      <span className="text-muted-foreground">{label}</span><span className="font-medium">{value}</span>
                    </div>
                  );
                  return (
                    <div className="space-y-4">
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-muted-foreground">Approval status:</span>
                        <Badge className={cn('capitalize', statusClass)}>{String(sc.approvalStatus || 'pending_approval').replace('_', ' ')}</Badge>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <Card className="bg-[#f4f6f3] shadow-none"><CardContent className="p-5">
                          <Row label="Basic (monthly)" value={inr(sc.basicSalary)} />
                          <Row label="HRA" value={inr(allowances.hra)} />
                          <Row label="DA" value={inr(allowances.da)} />
                          <Row label="TA" value={inr(allowances.ta)} />
                          <Row label="Medical" value={inr(allowances.medical)} />
                          <Row label="Other allowance" value={inr(allowances.other)} />
                        </CardContent></Card>
                        <Card className="bg-[#f4f6f3] shadow-none"><CardContent className="p-5">
                          <Row label="PF" value={inr(deductions.pf)} />
                          <Row label="ESI" value={inr(deductions.esi)} />
                          <Row label="TDS" value={inr(deductions.tds)} />
                          <Row label="Late deduction / min" value={inr(sc.lateDeductionPerMinute)} />
                          <Row label="Early exit deduction / min" value={inr(sc.earlyExitDeductionPerMinute)} />
                          <Row label="WFH deduction / day" value={`${sc.wfhDeductionPerDay || 0}%`} />
                        </CardContent></Card>
                      </div>
                      <div className="p-3 rounded-lg border bg-muted/30 text-sm">
                        <span className="text-muted-foreground">Unpaid leave rule: </span>
                        <span className="font-medium capitalize">{rule.type}</span>
                        {rule.type === 'fixed' && <span> — {inr(rule.dailyRate)} per day</span>}
                        {rule.type === 'progressive' && <span> — first {rule.firstXDays || 0} days at {inr(rule.firstXRate)}, then {inr(rule.subsequentRate)}</span>}
                      </div>
                      <div className="flex gap-4 p-3 rounded-xl bg-muted/50 text-sm">
                        <div><span className="text-muted-foreground">Gross: </span><span className="font-bold">{inr(gross)}</span></div>
                        <div><span className="text-muted-foreground">Net: </span><span className="font-bold text-green-600">{inr(net)}</span></div>
                      </div>
                    </div>
                  );
                })()}

                <SectionTitle icon={DollarSign} title="Bank & Tax Details" />
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div><Label>Bank Name</Label><Input value={salaryForm.bankName} onChange={e => setSalaryForm({ ...salaryForm, bankName: e.target.value })} /></div>
                  <div><Label>Account Number</Label><Input value={salaryForm.bankAccountNo} onChange={e => setSalaryForm({ ...salaryForm, bankAccountNo: e.target.value })} /></div>
                  <div><Label>IFSC Code</Label><Input value={salaryForm.ifscCode} onChange={e => setSalaryForm({ ...salaryForm, ifscCode: e.target.value })} /></div>
                  <div><Label>PAN Number</Label><Input value={salaryForm.panNumber} onChange={e => setSalaryForm({ ...salaryForm, panNumber: e.target.value })} /></div>
                </div>

                <Button onClick={saveSalary} disabled={saving} className="w-full rounded-full h-11 px-6 bg-slate-900 hover:bg-slate-800 text-white font-semibold shadow-none"><Save className="w-4 h-4 mr-2" />Save Bank Details</Button>
              </TabsContent>

                {/* ── PAYROLL HISTORY ── */}
              <TabsContent value="payroll_history" className="space-y-4 mt-0">
                <SectionTitle icon={FileText} title="Payslip & History" />
                <div className="grid grid-cols-1 gap-3">
                  {payrolls.length === 0 ? (
                    <div className="text-center p-8 border rounded-xl bg-muted/20 text-muted-foreground">
                      No payroll records found for this employee.
                    </div>
                  ) : (
                    payrolls.map((p: any) => (
                      <Card key={p.id} className="bg-[#f4f6f3] shadow-none">
                        <CardContent className="p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                          <div>
                            <div className="flex items-center gap-2 mb-1">
                              <span className="font-semibold text-lg">{p.month}</span>
                              <Badge className={p.status === 'paid' ? 'bg-emerald-100 text-emerald-700' : 'bg-secondary'}>{p.status.replace(/_/g, ' ')}</Badge>
                            </div>
                            <div className="text-sm text-muted-foreground flex gap-4 flex-wrap">
                              <span>Basic: {CS()}{p.basicSalary?.toLocaleString()}</span>
                              <span>Gross: {CS()}{p.grossSalary?.toLocaleString()}</span>
                              <span className="font-bold text-foreground">Net: {CS()}{p.netSalary?.toLocaleString()}</span>
                            </div>
                          </div>
                          <div className="flex gap-2">
                            {/* Expand or Download Payslip button placeholder */}
                            <Button size="sm" variant="outline" className="rounded-full bg-white border-slate-200">
                              View Details
                            </Button>
                          </div>
                        </CardContent>
                      </Card>
                    ))
                  )}
                </div>
              </TabsContent>

              {/* ── KPI ── */}
              <TabsContent value="kpi" className="space-y-4 mt-0">
                <div className="flex items-center justify-between">
                  <SectionTitle icon={Target} title={`KPIs (${kpis.length})`} />
                  <Button size="sm" onClick={openAddKpi} className="rounded-full h-9 px-4 bg-[#8ae47e] hover:bg-[#7bd96f] text-[#0b1d14] font-semibold shadow-none"><Plus className="w-4 h-4 mr-1" />Add KPI</Button>
                </div>
                {kpis.length === 0 ? (
                  <div className="border-2 border-dashed rounded-xl p-10 text-center text-muted-foreground">
                    <Target className="w-8 h-8 mx-auto mb-2 opacity-30" />
                    <p className="text-sm">No KPIs defined yet. Add the first one.</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {kpis.map((kpi, i) => {
                      const pct = Math.min(100, Math.round((kpi.achieved / kpi.target) * 100));
                      return (
                        <Card key={i} className="bg-[#f4f6f3] shadow-none">
                          <CardContent className="p-4">
                            <div className="flex items-start justify-between mb-2">
                              <div>
                                <p className="font-semibold text-sm">{kpi.title}</p>
                                {kpi.description && <p className="text-xs text-muted-foreground mt-0.5">{kpi.description}</p>}
                                <p className="text-xs text-muted-foreground mt-0.5">Period: {kpi.period}</p>
                              </div>
                              <div className="flex items-center gap-1">
                                <Badge className={cn('text-[10px]', KPI_STATUS_COLORS[kpi.status])}>{kpi.status.replace('_', ' ')}</Badge>
                                <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEditKpi(kpi, i)}><Edit className="w-3.5 h-3.5" /></Button>
                                <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => removeKpi(i)}><Trash2 className="w-3.5 h-3.5" /></Button>
                              </div>
                            </div>
                            <div className="flex items-center gap-3">
                              <div className="flex-1 h-2 bg-white rounded-full overflow-hidden">
                                <div className={cn('h-full rounded-full', pct >= 100 ? 'bg-green-500' : pct >= 60 ? 'bg-emerald-500' : 'bg-yellow-500')} style={{ width: `${pct}%` }} />
                              </div>
                              <span className="text-xs font-bold min-w-[80px] text-right">{kpi.achieved}/{kpi.target} {kpi.unit} ({pct}%)</span>
                            </div>
                          </CardContent>
                        </Card>
                      );
                    })}
                  </div>
                )}
                {kpis.length > 0 && <Button onClick={saveKPIs} disabled={saving} className="w-full rounded-full h-11 px-6 bg-slate-900 hover:bg-slate-800 text-white font-semibold shadow-none"><Save className="w-4 h-4 mr-2" />Save KPIs</Button>}
              </TabsContent>

              {/* ── KRA ── */}
              <TabsContent value="kra" className="space-y-4 mt-0">
                <div className="flex items-center justify-between">
                  <SectionTitle icon={Award} title={`KRAs (${kras.length})`} />
                  <Button size="sm" onClick={openAddKra} className="rounded-full h-9 px-4 bg-[#8ae47e] hover:bg-[#7bd96f] text-[#0b1d14] font-semibold shadow-none"><Plus className="w-4 h-4 mr-1" />Add KRA</Button>
                </div>
                {totalKraWeightage !== 100 && kras.length > 0 && (
                  <div className="flex items-center gap-2 p-3 rounded-lg bg-yellow-50 border border-yellow-200 text-yellow-700 text-sm">
                    <AlertCircle className="w-4 h-4 shrink-0" />
                    Total weightage is {totalKraWeightage}% — should be 100%
                  </div>
                )}
                {kras.length === 0 ? (
                  <div className="border-2 border-dashed rounded-xl p-10 text-center text-muted-foreground">
                    <Award className="w-8 h-8 mx-auto mb-2 opacity-30" />
                    <p className="text-sm">No KRAs defined yet. Add key result areas.</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {kras.map((kra, i) => (
                      <Card key={i} className="bg-[#f4f6f3] shadow-none">
                        <CardContent className="p-4">
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <div className="flex items-center gap-2">
                                <p className="font-semibold text-sm">{kra.area}</p>
                                <Badge variant="outline" className="text-[10px]">{kra.weightage}%</Badge>
                              </div>
                              {kra.description && <p className="text-xs text-muted-foreground mt-0.5">{kra.description}</p>}
                              <div className="flex items-center gap-3 mt-2">
                                <StarRating value={kra.rating} onChange={v => { const u = [...kras]; u[i] = { ...u[i], rating: v }; setKras(u); }} />
                                {kra.remarks && <p className="text-xs text-muted-foreground italic">"{kra.remarks}"</p>}
                              </div>
                            </div>
                            <div className="flex items-center gap-1 ml-2">
                              <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEditKra(kra, i)}><Edit className="w-3.5 h-3.5" /></Button>
                              <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => removeKra(i)}><Trash2 className="w-3.5 h-3.5" /></Button>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
                {kras.length > 0 && <Button onClick={saveKRAs} disabled={saving} className="w-full rounded-full h-11 px-6 bg-slate-900 hover:bg-slate-800 text-white font-semibold shadow-none"><Save className="w-4 h-4 mr-2" />Save KRAs</Button>}
              </TabsContent>

              {/* ── REVIEW ── */}
              <TabsContent value="review" className="space-y-4 mt-0">
                <SectionTitle icon={Star} title="Performance Review" />
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div><Label>Last Review Date</Label><Input type="date" value={reviewForm.lastReviewDate} onChange={e => setReviewForm({ ...reviewForm, lastReviewDate: e.target.value })} /></div>
                  <div><Label>Next Review Date</Label><Input type="date" value={reviewForm.nextReviewDate} onChange={e => setReviewForm({ ...reviewForm, nextReviewDate: e.target.value })} /></div>
                </div>
                <div>
                  <Label className="mb-2 block">Overall Rating</Label>
                  <StarRating value={reviewForm.overallRating} onChange={v => setReviewForm({ ...reviewForm, overallRating: v })} />
                </div>
                <div>
                  <Label>Review Remarks</Label>
                  <Textarea rows={4} value={reviewForm.reviewRemarks} onChange={e => setReviewForm({ ...reviewForm, reviewRemarks: e.target.value })} placeholder="Performance summary, achievements, areas of improvement..." />
                </div>
                <Button onClick={saveReview} disabled={saving} className="w-full rounded-full h-11 px-6 bg-slate-900 hover:bg-slate-800 text-white font-semibold shadow-none"><Save className="w-4 h-4 mr-2" />Save Review</Button>
              </TabsContent>

            </div>
          </Tabs>
        )}

        {/* KPI Dialog */}
        <Dialog open={kpiDialog} onOpenChange={setKpiDialog}>
          <DialogContent className="w-[95vw] sm:max-w-lg p-0 gap-0 overflow-hidden rounded-[2rem] border-0 bg-white max-h-[92vh] flex flex-col">
            <div className="flex items-start gap-4 px-6 sm:px-8 pt-7 pb-5 shrink-0">
              <div className="w-12 h-12 rounded-2xl bg-[#eaf6e6] text-[#256c1d] flex items-center justify-center shrink-0">
                <Target className="w-5 h-5" />
              </div>
              <DialogHeader className="space-y-1 text-left">
                <DialogTitle className="text-2xl font-semibold tracking-tight text-foreground text-left">{kpiIdx !== null ? 'Edit KPI' : 'Add KPI'}</DialogTitle>
                <p className="text-sm text-muted-foreground">Track a measurable target for this employee.</p>
              </DialogHeader>
            </div>

            {editKpi && (
              <div className="flex-1 overflow-y-auto px-6 sm:px-8 pb-4 space-y-4">
                <div className="space-y-1.5">
                  <Label className="text-sm font-semibold">Title <span className="text-rose-500">*</span></Label>
                  <Input className="h-11 rounded-xl bg-[#f4f6f3] border-transparent focus:bg-white focus:border-[#54b947] focus:ring-4 focus:ring-[#54b947]/20 text-sm px-4" value={editKpi.title} onChange={e => setEditKpi({ ...editKpi, title: e.target.value })} placeholder="e.g. Monthly admissions" />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-sm font-semibold">Description</Label>
                  <Input className="h-11 rounded-xl bg-[#f4f6f3] border-transparent focus:bg-white focus:border-[#54b947] focus:ring-4 focus:ring-[#54b947]/20 text-sm px-4" value={editKpi.description || ''} onChange={e => setEditKpi({ ...editKpi, description: e.target.value })} placeholder="What this KPI measures" />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="space-y-1.5">
                    <Label className="text-sm font-semibold">Target</Label>
                    <Input className="h-11 rounded-xl bg-[#f4f6f3] border-transparent focus:bg-white focus:border-[#54b947] focus:ring-4 focus:ring-[#54b947]/20 text-sm px-4" type="number" value={editKpi.target} onChange={e => setEditKpi({ ...editKpi, target: Number(e.target.value) })} />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-sm font-semibold">Achieved</Label>
                    <Input className="h-11 rounded-xl bg-[#f4f6f3] border-transparent focus:bg-white focus:border-[#54b947] focus:ring-4 focus:ring-[#54b947]/20 text-sm px-4" type="number" value={editKpi.achieved} onChange={e => setEditKpi({ ...editKpi, achieved: Number(e.target.value) })} />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-sm font-semibold">Unit</Label>
                    <Input className="h-11 rounded-xl bg-[#f4f6f3] border-transparent focus:bg-white focus:border-[#54b947] focus:ring-4 focus:ring-[#54b947]/20 text-sm px-4" value={editKpi.unit} onChange={e => setEditKpi({ ...editKpi, unit: e.target.value })} placeholder="%, ₹, count" />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-sm font-semibold">Period <span className="text-rose-500">*</span></Label>
                  <Input className="h-11 rounded-xl bg-[#f4f6f3] border-transparent focus:bg-white focus:border-[#54b947] focus:ring-4 focus:ring-[#54b947]/20 text-sm px-4" value={editKpi.period} onChange={e => setEditKpi({ ...editKpi, period: e.target.value })} placeholder="Q1 2025, FY 2025..." />
                </div>
                <div className="space-y-2 pb-2">
                  <Label className="text-sm font-semibold">Status</Label>
                  <div className="flex flex-wrap gap-2">
                    {([
                      ['on_track', 'On track'],
                      ['at_risk', 'At risk'],
                      ['achieved', 'Achieved'],
                      ['missed', 'Missed'],
                    ] as const).map(([val, label]) => (
                      <button
                        key={val}
                        type="button"
                        aria-pressed={editKpi.status === val}
                        onClick={() => setEditKpi({ ...editKpi, status: val as KPI['status'] })}
                        className={cn('px-4 py-2 rounded-full text-xs font-semibold border transition-colors', editKpi.status === val ? 'bg-[#8ae47e] border-[#8ae47e] text-[#0b1d14]' : 'bg-white border-slate-200 text-slate-600 hover:bg-[#f4f6f3]')}
                      >
                        {label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}

            <DialogFooter className="px-6 sm:px-8 py-5 border-t border-slate-100 gap-2 sm:gap-2 shrink-0 flex-col-reverse sm:flex-row">
              <Button variant="ghost" onClick={() => setKpiDialog(false)} className="rounded-full h-11 px-6 text-slate-600 hover:text-slate-900 font-semibold">Cancel</Button>
              <Button onClick={saveKpiDialog} disabled={!editKpi?.title || !editKpi?.period} className="rounded-full h-11 px-8 bg-slate-900 hover:bg-slate-800 text-white font-semibold shadow-none">Save</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* KRA Dialog */}
        <Dialog open={kraDialog} onOpenChange={setKraDialog}>
          <DialogContent className="w-[95vw] sm:max-w-lg p-0 gap-0 overflow-hidden rounded-[2rem] border-0 bg-white max-h-[92vh] flex flex-col">
            <div className="flex items-start gap-4 px-6 sm:px-8 pt-7 pb-5 shrink-0">
              <div className="w-12 h-12 rounded-2xl bg-[#eaf6e6] text-[#256c1d] flex items-center justify-center shrink-0">
                <Award className="w-5 h-5" />
              </div>
              <DialogHeader className="space-y-1 text-left">
                <DialogTitle className="text-2xl font-semibold tracking-tight text-foreground text-left">{kraIdx !== null ? 'Edit KRA' : 'Add KRA'}</DialogTitle>
                <p className="text-sm text-muted-foreground">Define a key result area and rate how it is going.</p>
              </DialogHeader>
            </div>

            {editKra && (
              <div className="flex-1 overflow-y-auto px-6 sm:px-8 pb-4 space-y-4">
                <div className="space-y-1.5">
                  <Label className="text-sm font-semibold">Key result area <span className="text-rose-500">*</span></Label>
                  <Input className="h-11 rounded-xl bg-[#f4f6f3] border-transparent focus:bg-white focus:border-[#54b947] focus:ring-4 focus:ring-[#54b947]/20 text-sm px-4" value={editKra.area} onChange={e => setEditKra({ ...editKra, area: e.target.value })} placeholder="e.g. Customer Satisfaction, Revenue Growth" />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-sm font-semibold">Description</Label>
                  <Input className="h-11 rounded-xl bg-[#f4f6f3] border-transparent focus:bg-white focus:border-[#54b947] focus:ring-4 focus:ring-[#54b947]/20 text-sm px-4" value={editKra.description || ''} onChange={e => setEditKra({ ...editKra, description: e.target.value })} placeholder="What this area covers" />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label className="text-sm font-semibold">Weightage (%)</Label>
                    <Input className="h-11 rounded-xl bg-[#f4f6f3] border-transparent focus:bg-white focus:border-[#54b947] focus:ring-4 focus:ring-[#54b947]/20 text-sm px-4" type="number" min={1} max={100} value={editKra.weightage} onChange={e => setEditKra({ ...editKra, weightage: Number(e.target.value) })} />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-sm font-semibold block">Rating (1–5)</Label>
                    <div className="h-11 flex items-center px-4 rounded-xl bg-[#f4f6f3]">
                      <StarRating value={editKra.rating} onChange={v => setEditKra({ ...editKra, rating: v })} />
                    </div>
                  </div>
                </div>
                <div className="space-y-1.5 pb-2">
                  <Label className="text-sm font-semibold">Remarks</Label>
                  <Textarea rows={3} className="rounded-xl bg-[#f4f6f3] border-transparent focus:bg-white focus:border-[#54b947] focus:ring-4 focus:ring-[#54b947]/20 text-sm px-4 py-3 resize-none" value={editKra.remarks || ''} onChange={e => setEditKra({ ...editKra, remarks: e.target.value })} />
                </div>
              </div>
            )}

            <DialogFooter className="px-6 sm:px-8 py-5 border-t border-slate-100 gap-2 sm:gap-2 shrink-0 flex-col-reverse sm:flex-row">
              <Button variant="ghost" onClick={() => setKraDialog(false)} className="rounded-full h-11 px-6 text-slate-600 hover:text-slate-900 font-semibold">Cancel</Button>
              <Button onClick={saveKraDialog} disabled={!editKra?.area} className="rounded-full h-11 px-8 bg-slate-900 hover:bg-slate-800 text-white font-semibold shadow-none">Save</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

      </SheetContent>
    </Sheet>
  );
}
