import { useState, useEffect } from 'react';
import { Plus, Edit, Trash2, Building2, GitBranch, Globe, Lock, BookOpen, Calendar, Eye, EyeOff } from 'lucide-react';
import { DOCUMENT_GROUPS, DEFAULT_REQUIRED_DOCUMENTS, sameDocType } from '@/lib/enrollmentDocs';
// Card import removed — using custom sections instead
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/hooks/useAuth';
import api from '@/lib/api';
import { ProgramFormDialog } from '../forms/ProgramFormDialog';
import { UniversitySessionsDialog } from './UniversitySessionsDialog';
import { UniversityDetailPanel } from './UniversityDetailPanel';
import { toast } from 'sonner';
import { uploadFormFile } from '@/lib/uploadFile';
import { confirmDialog } from '@/lib/confirm';
import { mayOn } from '@/lib/access';

interface Branch { id: string; name: string; code: string; }
interface University {
  id: string; name: string; code: string; address?: string;
  contact?: string; status: string; logo?: string; country?: string | null;
  allowedBranchIds: Branch[];
  enrollmentFormConfig?: any;
  isAcademicPartnerOnly?: boolean;
}

export function UniversitiesPanel() {
  const { user } = useAuth();
  const isOrgAdmin = ['org_admin', 'superadmin'].includes(user?.role || '');
  const mayCreate = mayOn(user, 'universities', 'create', isOrgAdmin);
  const mayEdit = mayOn(user, 'universities', 'edit', isOrgAdmin);
  const mayDelete = mayOn(user, 'universities', 'delete', isOrgAdmin);
  const mayAddProgram = mayOn(user, 'programs', 'create', isOrgAdmin);
  // The enrollment form and branch settings are part of creating and editing
  const mayManage = mayCreate || mayEdit;

  const [universities, setUniversities] = useState<University[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [loading, setLoading] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    name: '', code: '', address: '', contact: '', country: '', status: 'active', logo: '',
    enrollmentFormConfig: {
      requiredFields: ['email', 'dob', 'address', 'pinCode', 'fatherName', 'photo'] as string[],
      requiredDocuments: ['Aadhaar Card', 'SSLC Certificate', 'Plus Two Certificate'] as string[],
      visibleDocuments: [...DEFAULT_REQUIRED_DOCUMENTS] as string[]
    }
  });
  const [selectedBranchIds, setSelectedBranchIds] = useState<string[]>([]);

  // Optional country: pick one of the organization's countries or add a new one.
  const [countries, setCountries] = useState<{ name: string; universities: number }[]>([]);
  const [addingCountry, setAddingCountry] = useState(false);
  const [newCountry, setNewCountry] = useState('');
  const [savingCountry, setSavingCountry] = useState(false);

  const fetchCountries = async () => {
    try {
      const res = await api.get('/operations/countries');
      setCountries(res.data.data || []);
    } catch (err) {
      console.error('Failed to fetch countries:', err);
    }
  };

  const addCountry = async () => {
    const name = newCountry.trim();
    if (!name) return;
    setSavingCountry(true);
    try {
      const res = await api.post('/operations/countries', { name });
      const saved: string = res.data.data.name;
      setCountries(prev => prev.some(c => c.name.toLowerCase() === saved.toLowerCase())
        ? prev : [...prev, { name: saved, universities: 0 }].sort((a, b) => a.name.localeCompare(b.name)));
      setFormData(prev => ({ ...prev, country: saved }));
      setAddingCountry(false);
      setNewCountry('');
      toast.success(res.data.data.existed ? `${saved} already exists — selected` : `${saved} added`);
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to add country');
    } finally {
      setSavingCountry(false);
    }
  };
  const [dialogTab, setDialogTab] = useState<'details' | 'form' | 'access'>('details');
  const [accessMode, setAccessMode] = useState<'all' | 'exclusive' | 'multi' | 'academic_partners'>('all');

  const [addProgramUniId, setAddProgramUniId] = useState<string | null>(null);
  const [manageSessionsUni, setManageSessionsUni] = useState<University | null>(null);
  const [selectedUniversity, setSelectedUniversity] = useState<University | null>(null);

  useEffect(() => {
    fetchUniversities();
    fetchCountries();
    if (mayManage) fetchBranches();
  }, []);

  const fetchUniversities = async () => {
    setLoading(true);
    try {
      const res = await api.get('/operations/universities?all=true');
      setUniversities(res.data.data || []);
    } catch (err) {
      console.error('Failed to fetch universities:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchBranches = async () => {
    try {
      const res = await api.get('/org/branches');
      setBranches(res.data.data || []);
    } catch (err) {
      console.error('Failed to fetch branches:', err);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const payload = {
        ...formData,
        // A country typed but not yet "Add"ed is still saved (the server adds it to the list).
        country: addingCountry && newCountry.trim() ? newCountry.trim() : formData.country,
        allowedBranchIds: selectedBranchIds,
        isAcademicPartnerOnly: accessMode === 'academic_partners',
      };
      if (editingId) {
        await api.put(`/operations/universities/${editingId}`, payload);
      } else {
        await api.post('/operations/universities', payload);
      }
      setDialogOpen(false);
      resetForm();
      fetchUniversities();
      fetchCountries();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to save university');
    }
  };

  const handleEdit = (u: University) => {
    setEditingId(u.id);
    setDialogTab('details');
    const defaultConf = { requiredFields: ['email', 'dob', 'address', 'pinCode', 'fatherName', 'photo'], requiredDocuments: ['Aadhaar Card', 'SSLC Certificate', 'Plus Two Certificate'] };
    const conf = u.enrollmentFormConfig ? (typeof u.enrollmentFormConfig === 'string' ? JSON.parse(u.enrollmentFormConfig) : u.enrollmentFormConfig) : defaultConf;

    setFormData({
      name: u.name,
      code: u.code,
      address: u.address || '',
      contact: u.contact || '',
      country: u.country || '',
      status: u.status,
      logo: u.logo || '',
      enrollmentFormConfig: {
        requiredFields: conf.requiredFields || defaultConf.requiredFields,
        requiredDocuments: conf.requiredDocuments || defaultConf.requiredDocuments,
        visibleDocuments: conf.visibleDocuments || conf.requiredDocuments || defaultConf.requiredDocuments
      }
    });
    const ids = (u.allowedBranchIds || []).map(b => b.id);
    setSelectedBranchIds(ids);
    if (u.isAcademicPartnerOnly) setAccessMode('academic_partners');
    else if (ids.length === 0) setAccessMode('all');
    else if (ids.length === 1) setAccessMode('exclusive');
    else setAccessMode('multi');
    setDialogOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (!(await confirmDialog({ title: 'Delete university?', message: 'Delete this university?', confirmText: 'Delete', tone: 'danger' }))) return;
    try {
      await api.delete(`/operations/universities/${id}`);
      fetchUniversities();
    } catch (err) {
      console.error('Failed to delete university:', err);
    }
  };

  const resetForm = () => {
    setEditingId(null);
    setDialogTab('details');
    setAddingCountry(false);
    setNewCountry('');
    setFormData({
      name: '', code: '', address: '', contact: '', country: '', status: 'active', logo: '',
      enrollmentFormConfig: {
        requiredFields: ['email', 'dob', 'address', 'pinCode', 'fatherName', 'photo'],
        requiredDocuments: ['Aadhaar Card', 'SSLC Certificate', 'Plus Two Certificate'],
        visibleDocuments: [...DEFAULT_REQUIRED_DOCUMENTS]
      }
    });
    setSelectedBranchIds([]);
    setAccessMode('all');
  };

  if (selectedUniversity) {
    return <UniversityDetailPanel university={selectedUniversity} onBack={() => setSelectedUniversity(null)} />;
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 lg:gap-6">
        <div>
          <h2 className="text-2xl sm:text-3xl font-semibold tracking-tight">University Management</h2>
          <p className="text-muted-foreground text-sm mt-1.5">Manage affiliated universities and institutions</p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={(open) => { setDialogOpen(open); if (!open) resetForm(); }}>
          {mayCreate && (
            <DialogTrigger asChild>
              <Button className="h-11 px-5 rounded-full text-sm font-semibold gap-2 bg-[#8ae47e] hover:bg-[#7bd96f] text-[#0b1d14] shadow-sm"><Plus className="w-4 h-4" />Add University</Button>
            </DialogTrigger>
          )}
          <DialogContent className="w-[96vw] sm:max-w-3xl max-h-[92vh] p-0 gap-0 flex flex-col overflow-hidden rounded-[2rem] border-0 bg-white" style={{ fontFamily: "Urbanist, ui-sans-serif, system-ui, sans-serif" }}>
            <DialogHeader className="px-6 sm:px-8 pt-7 pb-4 space-y-3 text-left">
              <DialogTitle className="flex items-center gap-4 text-2xl font-semibold tracking-tight text-left">
                <span className="w-12 h-12 rounded-2xl bg-[#eaf6e6] text-[#256c1d] flex items-center justify-center"><Building2 className="h-5 w-5" /></span>
                {editingId ? 'Edit University' : 'Add New University'}
              </DialogTitle>
              <div className="flex gap-1.5" role="tablist">
                {([
                  ['details', 'Details', true],
                  ['form', 'Enrollment Form', mayManage],
                  ['access', 'Branch Access', mayManage && branches.length > 0],
                ] as const).filter(t => t[2]).map(([key, label]) => (
                  <button
                    key={key}
                    type="button"
                    role="tab"
                    aria-selected={dialogTab === key}
                    onClick={() => setDialogTab(key)}
                    className={`px-5 py-2 text-sm font-semibold rounded-full transition-colors ${dialogTab === key ? 'bg-[#0b1d14] text-white' : 'bg-[#f4f6f3] text-slate-600 hover:bg-[#eaf6e6]'}`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="flex flex-col min-h-0 flex-1">
              <div className="flex-1 overflow-y-auto px-6 sm:px-8 py-5 border-t border-slate-100">
              <div className={dialogTab === 'details' ? 'space-y-4' : 'hidden'}>
              <div className="rounded-3xl bg-[#f4f6f3] dark:bg-slate-900 p-5">
                <Label className="font-semibold">University logo</Label>
                <div className="mt-2 flex items-center gap-4">
                  <div className="w-16 h-16 rounded-2xl bg-white flex items-center justify-center overflow-hidden">
                    {formData.logo ? (
                      <img src={api.getFileUrl(formData.logo)} alt="Logo" className="w-full h-full object-contain" />
                    ) : (
                      <Building2 className="h-6 w-6 text-slate-300" />
                    )}
                  </div>
                  <div>
                    <Button type="button" variant="outline" size="sm" onClick={() => document.getElementById('uni-logo-input')?.click()}>
                      Upload Logo
                    </Button>
                    <input
                      id="uni-logo-input"
                      type="file"
                      className="hidden"
                      accept="image/*"
                      onChange={async (e) => {
                        const file = e.target.files?.[0];
                        if (!file) return;
                        const toastId = toast.loading('Compressing & uploading logo...');
                        try {
                          const url = await uploadFormFile(file);
                          setFormData(prev => ({ ...prev, logo: url }));
                          toast.success('Logo uploaded successfully!', { id: toastId });
                        } catch (err: any) {
                          toast.error(err.message || 'Failed to upload logo', { id: toastId });
                        }
                      }}
                    />
                  </div>
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <Label>University Name</Label>
                  <Input value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} required />
                </div>
                <div>
                  <Label>University Code</Label>
                  <Input value={formData.code} onChange={(e) => setFormData({ ...formData, code: e.target.value })} required />
                </div>
              </div>
              <div>
                <Label>Address</Label>
                <Input value={formData.address} onChange={(e) => setFormData({ ...formData, address: e.target.value })} />
              </div>
              <div>
                <Label>Country <span className="text-muted-foreground font-normal">(optional)</span></Label>
                {addingCountry ? (
                  <div className="flex gap-2">
                    <Input
                      autoFocus
                      value={newCountry}
                      onChange={(e) => setNewCountry(e.target.value)}
                      onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addCountry(); } }}
                      placeholder="New country name"
                      maxLength={100}
                    />
                    <Button type="button" onClick={addCountry} disabled={!newCountry.trim() || savingCountry}>Add</Button>
                    <Button type="button" variant="outline" onClick={() => { setAddingCountry(false); setNewCountry(''); }}>Cancel</Button>
                  </div>
                ) : (
                  <Select
                    value={formData.country || '__none__'}
                    onValueChange={(v) => {
                      if (v === '__new__') { setAddingCountry(true); setNewCountry(''); }
                      else setFormData({ ...formData, country: v === '__none__' ? '' : v });
                    }}
                  >
                    <SelectTrigger><SelectValue placeholder="Select a country" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__none__">No country</SelectItem>
                      {countries.map(c => <SelectItem key={c.name} value={c.name}>{c.name}</SelectItem>)}
                      <SelectItem value="__new__">+ Add new country…</SelectItem>
                    </SelectContent>
                  </Select>
                )}
                <p className="text-[11px] text-muted-foreground mt-1">Countries are kept per organization — pick one you've already added or add a new one.</p>
              </div>
              <div>
                <Label>Contact</Label>
                <Input value={formData.contact} onChange={(e) => setFormData({ ...formData, contact: e.target.value })} placeholder="Phone or email" />
              </div>
              <div>
                <Label>Status</Label>
                <Select value={formData.status} onValueChange={(v) => setFormData({ ...formData, status: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="inactive">Inactive</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              </div>

              {/* Enrollment Form Config */}
              {mayManage && (
                <div className={dialogTab === 'form' ? 'space-y-5' : 'hidden'}>
                  <div>
                    <h3 className="font-semibold text-slate-800 dark:text-slate-200">Mandatory Form Fields</h3>
                    <p className="text-xs text-muted-foreground mb-3">Select which fields are strictly required when enrolling students for this university.</p>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                      {[
                        { id: 'email', label: 'Email Address' },
                        { id: 'dob', label: 'Date of Birth' },
                        { id: 'address', label: 'Home Address' },
                        { id: 'pinCode', label: 'Pincode' },
                        { id: 'altPhone', label: 'Alt. Phone' },
                        { id: 'religion', label: 'Religion' },
                        { id: 'caste', label: 'Caste' },
                        { id: 'fatherName', label: "Father's Name" },
                        { id: 'fatherPhone', label: "Father's Phone" },
                        { id: 'motherName', label: "Mother's Name" },
                        { id: 'motherPhone', label: "Mother's Phone" },
                        { id: 'photo', label: 'Student Photo' }
                      ].map(f => (
                        <div key={f.id} className="flex items-center gap-2">
                          <input
                            type="checkbox"
                            id={`field-${f.id}`}
                            checked={formData.enrollmentFormConfig.requiredFields.includes(f.id)}
                            onChange={(e) => {
                              const checked = e.target.checked;
                              setFormData(prev => ({
                                ...prev,
                                enrollmentFormConfig: {
                                  ...prev.enrollmentFormConfig,
                                  requiredFields: checked
                                    ? [...prev.enrollmentFormConfig.requiredFields, f.id]
                                    : prev.enrollmentFormConfig.requiredFields.filter(id => id !== f.id)
                                }
                              }));
                            }}
                            className="rounded border-gray-300"
                          />
                          <label htmlFor={`field-${f.id}`} className="text-sm cursor-pointer">{f.label}</label>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="pt-2 border-t">
                    <h3 className="font-semibold text-slate-800 dark:text-slate-200">Documents</h3>
                    <p className="text-xs text-muted-foreground mb-3">
                      Use the eye to choose which documents appear on the enrollment form. Every visible document is mandatory; hidden documents are not asked for.
                    </p>
                    <div className="space-y-3">
                      {DOCUMENT_GROUPS.map(group => (
                        <div key={group.title}>
                          <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground mb-1">{group.title}</p>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                            {group.docs.map(doc => {
                              const visible = formData.enrollmentFormConfig.visibleDocuments.some(d => sameDocType(d, doc));
                              const toggle = () => setFormData(prev => {
                                const cur = prev.enrollmentFormConfig.visibleDocuments;
                                const next = visible ? cur.filter(d => !sameDocType(d, doc)) : [...cur, doc];
                                // Visible == mandatory, so both lists always stay identical.
                                return { ...prev, enrollmentFormConfig: { ...prev.enrollmentFormConfig, visibleDocuments: next, requiredDocuments: next } };
                              });
                              return (
                                <button
                                  key={doc}
                                  type="button"
                                  onClick={toggle}
                                  title={visible ? 'Shown and mandatory - click to hide' : 'Hidden - click to show (mandatory)'}
                                  aria-label={visible ? `Hide ${doc}` : `Show ${doc}`}
                                  aria-pressed={visible}
                                  className={`flex items-center gap-2 rounded-lg border px-3 py-1.5 text-left text-sm ${visible ? 'bg-white dark:bg-slate-950' : 'opacity-60'}`}
                                >
                                  <span className="flex-1">{doc}</span>
                                  {visible ? <Eye className="h-4 w-4 text-emerald-600" /> : <EyeOff className="h-4 w-4 text-slate-400" />}
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* ── Branch Access ── */}
              {mayManage && branches.length > 0 && (
                <div className={`rounded-xl border-2 border-dashed border-teal-200 bg-teal-50/40 p-4 space-y-3 ${dialogTab === 'access' ? '' : 'hidden'}`}>
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-lg bg-teal-600 flex items-center justify-center">
                      <GitBranch className="h-4 w-4 text-white" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-teal-900">Branch Access Control</p>
                      <p className="text-xs text-teal-700">Who can see and use this university?</p>
                    </div>
                  </div>

                  {/* Mode cards */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                    <button type="button"
                      onClick={() => { setAccessMode('all'); setSelectedBranchIds([]); }}
                      className={`rounded-lg border-2 p-3 text-left transition-all ${accessMode === 'all'
                          ? 'border-green-500 bg-green-50'
                          : 'border-slate-200 bg-white hover:border-green-300'}`}>
                      <Globe className={`h-5 w-5 mb-1 ${accessMode === 'all' ? 'text-green-600' : 'text-slate-400'}`} />
                      <p className={`text-xs font-semibold ${accessMode === 'all' ? 'text-green-700' : 'text-slate-600'}`}>
                        All Branches
                      </p>
                      <p className="text-[10px] text-muted-foreground mt-0.5">Visible to everyone</p>
                    </button>

                    <button type="button"
                      onClick={() => { setAccessMode('exclusive'); setSelectedBranchIds(selectedBranchIds.slice(0, 1)); }}
                      className={`rounded-lg border-2 p-3 text-left transition-all ${accessMode === 'exclusive'
                          ? 'border-amber-500 bg-amber-50'
                          : 'border-slate-200 bg-white hover:border-amber-300'}`}>
                      <Lock className={`h-5 w-5 mb-1 ${accessMode === 'exclusive' ? 'text-amber-600' : 'text-slate-400'}`} />
                      <p className={`text-xs font-semibold ${accessMode === 'exclusive' ? 'text-amber-700' : 'text-slate-600'}`}>
                        Exclusive
                      </p>
                      <p className="text-[10px] text-muted-foreground mt-0.5">One branch only</p>
                    </button>

                    <button type="button"
                      onClick={() => setAccessMode('multi')}
                      className={`rounded-lg border-2 p-3 text-left transition-all ${accessMode === 'multi'
                          ? 'border-teal-500 bg-teal-50'
                          : 'border-slate-200 bg-white hover:border-teal-300'}`}>
                      <GitBranch className={`h-5 w-5 mb-1 ${accessMode === 'multi' ? 'text-teal-600' : 'text-slate-400'}`} />
                      <p className={`text-xs font-semibold ${accessMode === 'multi' ? 'text-teal-700' : 'text-slate-600'}`}>
                        Select Branches
                      </p>
                      <p className="text-[10px] text-muted-foreground mt-0.5">Pick 2 or more</p>
                    </button>

                    <button type="button"
                      onClick={() => { setAccessMode('academic_partners'); setSelectedBranchIds([]); }}
                      className={`rounded-lg border-2 p-3 text-left transition-all ${accessMode === 'academic_partners'
                          ? 'border-lime-500 bg-lime-50'
                          : 'border-slate-200 bg-white hover:border-lime-300'}`}>
                      <Building2 className={`h-5 w-5 mb-1 ${accessMode === 'academic_partners' ? 'text-lime-600' : 'text-slate-400'}`} />
                      <p className={`text-xs font-semibold ${accessMode === 'academic_partners' ? 'text-lime-700' : 'text-slate-600'}`}>
                        Academic Partners
                      </p>
                      <p className="text-[10px] text-muted-foreground mt-0.5">Partner allocation only</p>
                    </button>
                  </div>

                  {/* All branches — confirmation note */}
                  {accessMode === 'all' && (
                    <div className="flex items-start gap-2 bg-green-50 border border-green-200 rounded-lg px-3 py-2">
                      <Globe className="h-4 w-4 text-green-600 mt-0.5 shrink-0" />
                      <p className="text-xs text-green-800">
                        This university will be visible and usable by <strong>all branches</strong> in your organisation.
                      </p>
                    </div>
                  )}

                  {/* Academic Partners — confirmation note */}
                  {accessMode === 'academic_partners' && (
                    <div className="flex items-start gap-2 bg-lime-50 border border-lime-200 rounded-lg px-3 py-2">
                      <Building2 className="h-4 w-4 text-lime-600 mt-0.5 shrink-0" />
                      <p className="text-xs text-lime-800">
                        This university is reserved for <strong>Academic Partners</strong>. It won't appear in regular operations lists.
                      </p>
                    </div>
                  )}

                  {/* Exclusive — single branch picker */}
                  {accessMode === 'exclusive' && (
                    <div className="space-y-2">
                      <Select
                        value={selectedBranchIds[0] || '__none__'}
                        onValueChange={v => setSelectedBranchIds(v === '__none__' ? [] : [v])}>
                        <SelectTrigger className="bg-white">
                          <SelectValue placeholder="Choose the exclusive branch..." />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="__none__">— Choose a branch —</SelectItem>
                          {branches.map(b => (
                            <SelectItem key={b.id} value={b.id}>
                              {b.name} [{b.code}]
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      {selectedBranchIds[0] ? (
                        <div className="flex items-start gap-2 bg-amber-50 border border-amber-300 rounded-lg px-3 py-2">
                          <Lock className="h-4 w-4 text-amber-600 mt-0.5 shrink-0" />
                          <p className="text-xs text-amber-800">
                            <strong>Exclusive to {branches.find(b => b.id === selectedBranchIds[0])?.name}.</strong>{' '}
                            All other branches will not see this university in their lists.
                          </p>
                        </div>
                      ) : (
                        <p className="text-xs text-amber-600">Select a branch above to make this university exclusive to it.</p>
                      )}
                    </div>
                  )}

                  {/* Multi — checklist */}
                  {accessMode === 'multi' && (
                    <div className="space-y-2">
                      <div className="bg-white border rounded-lg divide-y">
                        {branches.map(b => {
                          const checked = selectedBranchIds.includes(b.id);
                          return (
                            <label key={b.id}
                              className="flex items-center gap-3 px-3 py-2.5 cursor-pointer hover:bg-slate-50 transition-colors">
                              <div className={`w-4 h-4 rounded border-2 flex items-center justify-center shrink-0 transition-colors ${checked ? 'bg-teal-600 border-teal-600' : 'border-slate-300'}`}
                                onClick={() => setSelectedBranchIds(prev =>
                                  prev.includes(b.id) ? prev.filter(x => x !== b.id) : [...prev, b.id]
                                )}>
                                {checked && <span className="text-white text-[10px] font-bold">✓</span>}
                              </div>
                              <span className="text-sm font-medium">{b.name}</span>
                              <span className="text-xs font-mono text-muted-foreground ml-auto">[{b.code}]</span>
                            </label>
                          );
                        })}
                      </div>
                      {selectedBranchIds.length > 0 ? (
                        <div className="flex items-start gap-2 bg-teal-50 border border-teal-200 rounded-lg px-3 py-2">
                          <GitBranch className="h-4 w-4 text-teal-600 mt-0.5 shrink-0" />
                          <p className="text-xs text-teal-800">
                            Accessible by <strong>{selectedBranchIds.length} branch{selectedBranchIds.length > 1 ? 'es' : ''}</strong>.
                            Branches not selected won't see this university.
                          </p>
                        </div>
                      ) : (
                        <p className="text-xs text-muted-foreground">Check at least one branch.</p>
                      )}
                    </div>
                  )}
                </div>
              )}

              </div>

              <div className="flex gap-2 justify-end px-6 py-3 border-t bg-background">
                <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
                <Button type="submit" className="min-w-28">{editingId ? 'Save Changes' : 'Create University'}</Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* ── Grouped university list ── */}
      {loading ? (
        <div className="space-y-4">{[1, 2, 3].map(i => <div key={i} className="h-24 bg-[#f4f6f3] rounded-3xl animate-pulse" />)}</div>
      ) : universities.length === 0 ? (
        <div className="rounded-3xl border border-dashed border-slate-300 bg-white py-16 text-center text-muted-foreground"><span className="w-14 h-14 rounded-full bg-[#f4f6f3] flex items-center justify-center mx-auto mb-3"><Building2 className="w-6 h-6" /></span>No universities found</div>
      ) : (() => {
        // Build groups
        // 1. "All Branches" — universities with no branch restriction
        const globalUnis = universities.filter(u => (u.allowedBranchIds || []).length === 0);

        // 2. Per-branch groups — collect all branches that appear in any university
        const branchMap = new Map<string, { branch: Branch; unis: University[] }>();
        universities.forEach(u => {
          (u.allowedBranchIds || []).forEach(b => {
            if (!branchMap.has(b.id)) branchMap.set(b.id, { branch: b, unis: [] });
            // Only add once per university per branch
            if (!branchMap.get(b.id)!.unis.find(x => x.id === u.id)) {
              branchMap.get(b.id)!.unis.push(u);
            }
          });
        });

        const UniRow = ({ u }: { u: University }) => (
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 px-5 py-4 hover:bg-[#f4f6f3] transition-colors">
            <div className="flex items-center gap-3 cursor-pointer flex-1" onClick={() => setSelectedUniversity(u)}>
              <div className="w-11 h-11 rounded-2xl bg-[#eaf6e6] flex items-center justify-center shrink-0 overflow-hidden">
                {u.logo ? (
                  <img src={api.getFileUrl(u.logo)} alt={u.name} className="w-full h-full object-contain bg-white" />
                ) : (
                  <Building2 className="w-4 h-4 text-[#256c1d]" />
                )}
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <p className="font-semibold text-base hover:text-[#256c1d] transition-colors">{u.name}</p>
                  {u.isAcademicPartnerOnly ? (
                    <Badge variant="outline" className="text-[11px] h-6 px-2.5 rounded-full bg-[#f1f3ef] text-slate-600 border-transparent">
                      Academic Partner
                    </Badge>
                  ) : (u.allowedBranchIds || []).length === 0 ? (
                    <Badge variant="outline" className="text-[11px] h-6 px-2.5 rounded-full bg-[#e3f7dd] text-[#1f6a17] border-transparent">All Branches</Badge>
                  ) : (u.allowedBranchIds || []).length === 1 ? (
                    <Badge variant="outline" className="text-[11px] h-6 px-2.5 rounded-full bg-amber-50 text-amber-700 border-transparent" title={`Exclusive to ${(u.allowedBranchIds as any)[0]?.name}`}>Branch Specific</Badge>
                  ) : (
                    <Badge variant="outline" className="text-[11px] h-6 px-2.5 rounded-full bg-[#eaf6e6] text-[#256c1d] border-transparent">Multi-Branch ({(u.allowedBranchIds || []).length})</Badge>
                  )}
                </div>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {u.code}{u.country ? ` • ${u.country}` : ''}{u.contact ? ` • ${u.contact}` : ''}{u.address ? ` • ${u.address}` : ''}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <span className={`inline-flex items-center gap-1.5 text-[11px] font-semibold px-2.5 py-1 rounded-full capitalize ${u.status === 'active' ? 'bg-[#e3f7dd] text-[#1f6a17]' : 'bg-slate-100 text-slate-600'}`}><span className={`w-1.5 h-1.5 rounded-full ${u.status === 'active' ? 'bg-[#54b947]' : 'bg-slate-400'}`} />{u.status}</span>
              {(mayEdit || mayDelete || mayAddProgram) && (
                <>
                  <div className="h-5 border-l mx-1 border-slate-200"></div>
                  {mayAddProgram && (
                    <Button variant="outline" size="sm" className="h-9 px-4 rounded-full bg-white border-slate-200 text-slate-700 hover:bg-[#eaf6e6] hover:text-[#256c1d]" onClick={() => setAddProgramUniId(u.id)} title="Add Program">
                      <BookOpen className="w-3.5 h-3.5 mr-1" /> Program
                    </Button>
                  )}
                  {isOrgAdmin && (
                    <Button variant="outline" size="sm" className="h-9 px-4 rounded-full bg-white border-slate-200 text-slate-700 hover:bg-[#eaf6e6] hover:text-[#256c1d]" onClick={() => setManageSessionsUni(u)} title="Sessions">
                      <Calendar className="w-3.5 h-3.5 mr-1" /> Session
                    </Button>
                  )}
                  <div className="h-5 border-l mx-1 border-slate-200"></div>
                  {mayEdit && <Button variant="outline" size="icon" className="h-9 w-9 rounded-full bg-white border-slate-200 text-slate-600 hover:bg-[#eaf6e6] hover:text-[#256c1d]" onClick={() => handleEdit(u)} title="Edit"><Edit className="w-3.5 h-3.5" /></Button>}
                  {mayDelete && <Button variant="outline" size="icon" className="h-9 w-9 rounded-full bg-white border-slate-200 text-rose-500 hover:bg-rose-50 hover:text-rose-600" onClick={() => handleDelete(u.id)} title="Delete"><Trash2 className="w-3.5 h-3.5" /></Button>}
                </>
              )}
            </div>
          </div>
        );

        return (
          <div className="space-y-5">
            {/* All-branches section */}
            {globalUnis.length > 0 && (
              <div className="rounded-3xl bg-white dark:bg-card overflow-hidden shadow-[0_1px_2px_rgba(16,24,40,0.04),0_10px_28px_-14px_rgba(16,24,40,0.10)]">
                <div className="flex items-center gap-3 px-5 py-4 bg-[#f4f6f3]">
                  <span className="w-9 h-9 rounded-full bg-white flex items-center justify-center"><Globe className="h-4 w-4 text-[#256c1d]" /></span>
                  <span className="text-base font-semibold text-foreground">All Branches</span>
                  <span className="ml-auto text-xs text-muted-foreground">{globalUnis.length} universit{globalUnis.length > 1 ? 'ies' : 'y'}</span>
                </div>
                <div className="divide-y divide-slate-100 dark:divide-white/10">
                  {globalUnis.map(u => <UniRow key={u.id} u={u} />)}
                </div>
              </div>
            )}

            {/* Per-branch sections */}
            {Array.from(branchMap.values()).map(({ branch, unis }) => (
              <div key={branch.id} className="rounded-3xl bg-white dark:bg-card overflow-hidden shadow-[0_1px_2px_rgba(16,24,40,0.04),0_10px_28px_-14px_rgba(16,24,40,0.10)]">
                <div className="flex items-center gap-3 px-5 py-4 bg-[#eaf6e6]">
                  <span className="w-9 h-9 rounded-full bg-white flex items-center justify-center"><GitBranch className="h-4 w-4 text-[#256c1d]" /></span>
                  <span className="text-base font-semibold text-foreground">{branch.name}</span>
                  <span className="text-xs font-mono text-slate-600 bg-white px-2.5 py-0.5 rounded-full">{branch.code}</span>
                  {unis.length === 1 && unis[0].allowedBranchIds.length === 1 && (
                    <span className="flex items-center gap-1 text-[11px] font-semibold text-amber-700 bg-amber-50 px-2.5 py-1 rounded-full ml-1">
                      <Lock className="h-2.5 w-2.5" /> Exclusive
                    </span>
                  )}
                  <span className="ml-auto text-xs text-muted-foreground">{unis.length} universit{unis.length > 1 ? 'ies' : 'y'}</span>
                </div>
                <div className="divide-y divide-slate-100 dark:divide-white/10">
                  {unis.map(u => <UniRow key={u.id} u={u} />)}
                </div>
              </div>
            ))}
          </div>
        );
      })()}

      {(isOrgAdmin || mayAddProgram) && (
        <>
          <ProgramFormDialog
            open={!!addProgramUniId}
            onOpenChange={(open) => { if (!open) setAddProgramUniId(null); }}
            onSuccess={() => { }}
            defaultUniversityId={addProgramUniId || undefined}
          />
          <UniversitySessionsDialog
            university={manageSessionsUni}
            open={!!manageSessionsUni}
            onOpenChange={(open) => { if (!open) setManageSessionsUni(null); }}
            isOrgAdmin={isOrgAdmin}
          />
        </>
      )}
    </div>
  );
}
