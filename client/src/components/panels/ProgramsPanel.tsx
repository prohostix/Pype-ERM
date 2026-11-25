import { useState, useEffect, useMemo } from 'react';
import {
  Plus, Edit, Trash2, BookOpen, Clock, Layers, ChevronDown, ChevronUp,
  Tag, Eye, Building2, Search, GraduationCap, X
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import api from '@/lib/api';
import { useAuth } from '@/hooks/useAuth';
import { ProgramDetailPanel } from './ProgramDetailPanel';
import { ProgramFormDialog } from '../forms/ProgramFormDialog';
import { confirmDialog } from '@/lib/confirm';
import { mayOn } from '@/lib/access';

type CourseType = 'SkillCourse' | 'OnlineDegree' | 'BVocDegree' | 'CreditTransfer' | 'Yearly' | 'OneSitting';

const COURSE_TYPES: { value: CourseType; label: string; color: string; bg: string }[] = [
  { value: 'SkillCourse',     label: 'Skill Course',     color: '#7c3aed', bg: '#f5f3ff' },
  { value: 'OnlineDegree',    label: 'Online Degree',    color: '#2563eb', bg: '#eff6ff' },
  { value: 'BVocDegree',      label: 'B.Voc Degree',     color: '#0891b2', bg: '#ecfeff' },
  { value: 'CreditTransfer',  label: 'Credit Transfer',  color: '#16a34a', bg: '#f0fdf4' },
  { value: 'Yearly',          label: 'Yearly',           color: '#d97706', bg: '#fffbeb' },
  { value: 'OneSitting',      label: 'One Sitting',      color: '#e11d48', bg: '#fff1f2' },
];

interface University {
  id: string;
  name: string;
  code?: string;
  status?: string;
}

interface Semester { number: number; name: string; durationMonths: number; }
interface Program {
  id: string; name: string; code: string; courseType: CourseType;
  duration: number; hasSemesters: boolean; semesters: Semester[];
  specialisations: string[];
  status: string; universityId: any; subDepartmentId?: any;
  university?: { id: string; name: string; code?: string };
}

function formatDuration(months: number) {
  if (months < 12) return `${months} months`;
  if (months % 12 === 0) return `${months / 12} year${months / 12 > 1 ? 's' : ''}`;
  return `${Math.floor(months / 12)}y ${months % 12}m`;
}

export function ProgramsPanel() {
  const { user } = useAuth();
  const isOrgAdmin = ['org_admin', 'superadmin'].includes(user?.role || '');
  const mayCreate = mayOn(user, 'programs', 'create', isOrgAdmin);
  const mayEdit = mayOn(user, 'programs', 'edit', isOrgAdmin);
  const mayDelete = mayOn(user, 'programs', 'delete', isOrgAdmin);
  
  const [universities, setUniversities] = useState<University[]>([]);
  const [loadingUnis, setLoadingUnis] = useState(false);
  const [selectedUniversityId, setSelectedUniversityId] = useState<string>('');
  
  const [programs, setPrograms] = useState<Program[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCourseType, setSelectedCourseType] = useState<string>('all');
  
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingProgram, setEditingProgram] = useState<Program | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [selectedProgramId, setSelectedProgramId] = useState<string | null>(null);

  useEffect(() => {
    fetchUniversities();
  }, []);

  useEffect(() => {
    if (selectedUniversityId) {
      fetchPrograms(selectedUniversityId);
    } else {
      setPrograms([]);
    }
  }, [selectedUniversityId]);

  const fetchUniversities = async () => {
    setLoadingUnis(true);
    try {
      const res = await api.get('/operations/universities?all=true');
      setUniversities(res.data.data || []);
    } catch (err) {
      console.error('Failed to fetch universities:', err);
    } finally {
      setLoadingUnis(false);
    }
  };

  const fetchPrograms = async (uniId?: string) => {
    const targetUni = uniId || selectedUniversityId;
    if (!targetUni) return;
    setLoading(true);
    try {
      const res = await api.get(`/operations/programs?universityId=${targetUni}`);
      setPrograms(res.data.data || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (p: Program) => {
    setEditingProgram(p);
    setDialogOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (!(await confirmDialog({ title: 'Delete program?', message: 'Delete this program?', confirmText: 'Delete', tone: 'danger' }))) return;
    try {
      await api.delete(`/operations/programs/${id}`);
      fetchPrograms();
    } catch (err) {
      console.error(err);
    }
  };

  const getCourseTypeMeta = (ct: string) => COURSE_TYPES.find(c => c.value === ct) || COURSE_TYPES[1];

  const selectedUniversity = universities.find(u => u.id === selectedUniversityId);

  const filteredPrograms = useMemo(() => {
    return programs.filter(p => {
      const q = searchQuery.toLowerCase().trim();
      const matchesSearch = !q ||
        p.name?.toLowerCase().includes(q) ||
        p.code?.toLowerCase().includes(q) ||
        (Array.isArray(p.specialisations) && p.specialisations.some(s => s.toLowerCase().includes(q)));

      const matchesType = selectedCourseType === 'all' || p.courseType === selectedCourseType;
      return matchesSearch && matchesType;
    });
  }, [programs, searchQuery, selectedCourseType]);

  // If a program is selected, show its detail panel
  if (selectedProgramId) {
    return <ProgramDetailPanel programId={selectedProgramId} onBack={() => setSelectedProgramId(null)} />;
  }

  const pill = 'h-11 rounded-full text-sm bg-white border-slate-200 shadow-sm px-4';
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 lg:gap-6">
        <div>
          <h2 className="text-2xl sm:text-3xl font-semibold tracking-tight">Program Management</h2>
          <p className="text-muted-foreground text-sm mt-1.5">Filter academic programs by university and manage courses</p>
        </div>
        <Button
          onClick={() => { setEditingProgram(null); setDialogOpen(true); }}
          disabled={!mayCreate || !selectedUniversityId}
          className={`h-11 px-5 rounded-full text-sm font-semibold gap-2 bg-[#8ae47e] hover:bg-[#7bd96f] text-[#0b1d14] shadow-sm shrink-0 self-start lg:self-auto ${!mayCreate ? 'hidden' : ''}`}
          title={!selectedUniversityId ? 'Select a university first to add programs' : undefined}
        >
          <Plus className="w-4 h-4" />Add Program
        </Button>
      </div>

      {/* University selection + filters */}
      <div className="rounded-3xl bg-[#f4f6f3] dark:bg-muted/30 p-5 sm:p-6 space-y-4">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div className="flex-1 max-w-xl">
            <label className="text-sm font-semibold mb-2 flex items-center gap-2">
              <span className="w-8 h-8 rounded-full bg-white text-[#256c1d] flex items-center justify-center"><Building2 className="w-4 h-4" /></span>
              University
            </label>
            <Select
              value={selectedUniversityId}
              onValueChange={(val) => {
                setSelectedUniversityId(val);
                setSearchQuery('');
                setSelectedCourseType('all');
              }}
            >
              <SelectTrigger className={`w-full ${pill} font-medium`}>
                <SelectValue placeholder={loadingUnis ? "Loading universities..." : "Choose a university to view programs..."} />
              </SelectTrigger>
              <SelectContent className="max-h-72 rounded-2xl">
                {universities.map(u => (
                  <SelectItem key={u.id} value={u.id}>
                    <span className="font-medium">{u.name}</span>
                    {u.code && <span className="ml-2 text-xs text-muted-foreground">({u.code})</span>}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {selectedUniversity && (
            <Button
              variant="outline"
              onClick={() => setSelectedUniversityId('')}
              className="h-11 px-5 rounded-full bg-white border-slate-200 text-sm font-medium gap-1.5 shadow-sm hover:bg-slate-50 self-start md:self-auto"
            >
              <X className="w-3.5 h-3.5" />
              Change university
            </Button>
          )}
        </div>

        {selectedUniversityId && (
          <div className="flex flex-col gap-3 pt-4 border-t border-white/80">
            <div className="relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search programs by name, code, specialisation..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-11 pr-10 h-11 rounded-full bg-white border-transparent text-sm focus:border-[#54b947] focus:ring-4 focus:ring-[#54b947]/20"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  aria-label="Clear search"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>
            <div className="flex flex-wrap items-center gap-2">
              {[{ value: 'all', label: 'All types' }, ...COURSE_TYPES.map(ct => ({ value: ct.value as string, label: ct.label }))].map(ct => (
                <button
                  key={ct.value}
                  onClick={() => setSelectedCourseType(ct.value)}
                  className={`px-4 py-2 rounded-full text-xs font-semibold transition-colors ${selectedCourseType === ct.value ? 'bg-[#0b1d14] text-white' : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'}`}
                >
                  {ct.label}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Main Content Area */}
      {!selectedUniversityId ? (
        <div className="rounded-3xl border border-dashed border-slate-300 bg-white dark:bg-card p-8 sm:p-14 text-center">
          <div className="w-14 h-14 rounded-full bg-[#eaf6e6] text-[#256c1d] flex items-center justify-center mx-auto mb-4">
            <GraduationCap className="w-6 h-6" />
          </div>
          <h3 className="text-xl font-semibold mb-1.5">Select a university</h3>
          <p className="text-sm text-muted-foreground mb-7 max-w-md mx-auto">
            Choose a university above, or pick one below, to view, manage and filter its programs.
          </p>

          {loadingUnis ? (
            <div className="text-sm text-muted-foreground">Loading universities...</div>
          ) : universities.length === 0 ? (
            <div className="text-sm text-muted-foreground">No universities available.</div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 text-left max-w-4xl mx-auto">
              {universities.slice(0, 6).map((u) => (
                <button
                  key={u.id}
                  onClick={() => setSelectedUniversityId(u.id)}
                  className="p-4 rounded-2xl bg-[#f4f6f3] hover:bg-[#eaf6e6] transition-colors text-left group flex items-center justify-between"
                >
                  <div className="min-w-0 pr-2">
                    <p className="font-semibold text-sm truncate text-foreground group-hover:text-[#256c1d] transition-colors">{u.name}</p>
                    {u.code && <p className="text-xs text-muted-foreground font-mono mt-0.5">{u.code}</p>}
                  </div>
                  <ChevronDown className="w-4 h-4 text-muted-foreground -rotate-90 shrink-0 group-hover:translate-x-0.5 transition-transform" />
                </button>
              ))}
            </div>
          )}
        </div>
      ) : (
        <div className="space-y-4">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h3 className="text-xl font-semibold">Programs for {selectedUniversity?.name}</h3>
              <p className="text-xs text-muted-foreground mt-0.5">
                Showing {filteredPrograms.length} of {programs.length} program{programs.length === 1 ? '' : 's'}
              </p>
            </div>
            {selectedUniversity?.code && (
              <span className="font-mono text-xs bg-[#f1f3ef] text-slate-600 px-3 py-1.5 rounded-full">{selectedUniversity.code}</span>
            )}
          </div>

          {loading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 2xl:grid-cols-3 gap-5">{[1, 2, 3].map(i => <div key={i} className="h-52 bg-[#f4f6f3] rounded-3xl animate-pulse" />)}</div>
          ) : filteredPrograms.length === 0 ? (
            <div className="rounded-3xl border border-dashed border-slate-300 bg-white dark:bg-card py-14 text-center text-muted-foreground">
              <span className="w-14 h-14 rounded-full bg-[#f4f6f3] flex items-center justify-center mx-auto mb-3"><BookOpen className="w-6 h-6" /></span>
              <p className="font-medium text-foreground">
                {programs.length === 0 ? 'No programs found for this university' : 'No programs match your search'}
              </p>
              <p className="text-xs mt-1">
                {programs.length === 0
                  ? 'Get started by creating a new academic program for this university.'
                  : 'Try adjusting your search terms or course type filter.'}
              </p>
              {mayCreate && programs.length === 0 && (
                <Button
                  className="mt-5 h-11 px-6 rounded-full bg-[#8ae47e] hover:bg-[#7bd96f] text-[#0b1d14] font-semibold"
                  onClick={() => { setEditingProgram(null); setDialogOpen(true); }}
                >
                  <Plus className="w-4 h-4 mr-1.5" />Add First Program
                </Button>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 2xl:grid-cols-3 gap-5 sm:gap-6 items-start">
              {filteredPrograms.map((p) => {
                const meta = getCourseTypeMeta(p.courseType);
                const isExpanded = expandedId === p.id;
                return (
                  <Card key={p.id} className="rounded-3xl gap-0 overflow-hidden hover:-translate-y-0.5 transition-all duration-300">
                    <CardContent className="p-6 flex flex-col gap-4">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-start gap-3.5 min-w-0">
                          <div className="w-12 h-12 rounded-2xl bg-[#eaf6e6] text-[#256c1d] flex items-center justify-center shrink-0">
                            <BookOpen className="w-5 h-5" />
                          </div>
                          <div className="min-w-0">
                            <h4 className="font-semibold text-base truncate" title={p.name}>{p.name}</h4>
                            <div className="flex items-center gap-1.5 flex-wrap mt-1.5">
                              <span className="text-[11px] font-mono text-slate-600 bg-[#f1f3ef] px-2.5 py-0.5 rounded-full">{p.code}</span>
                              <span className="text-[11px] font-semibold px-2.5 py-0.5 rounded-full" style={{ background: meta.bg, color: meta.color }}>{meta.label}</span>
                            </div>
                          </div>
                        </div>
                        <span className={`inline-flex items-center gap-1.5 text-[11px] font-semibold px-2.5 py-1 rounded-full capitalize shrink-0 ${p.status === 'active' ? 'bg-[#e3f7dd] text-[#1f6a17]' : 'bg-slate-100 text-slate-600'}`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${p.status === 'active' ? 'bg-[#54b947]' : 'bg-slate-400'}`} />{p.status}
                        </span>
                      </div>

                      <div className="grid grid-cols-2 gap-2.5">
                        <div className="rounded-2xl bg-[#f4f6f3] dark:bg-muted/30 px-4 py-3">
                          <p className="text-[11px] text-muted-foreground font-medium flex items-center gap-1"><Clock className="h-3 w-3" />Duration</p>
                          <p className="text-sm font-semibold mt-0.5">{formatDuration(p.duration)}</p>
                        </div>
                        <div className="rounded-2xl bg-[#f4f6f3] dark:bg-muted/30 px-4 py-3">
                          <p className="text-[11px] text-muted-foreground font-medium flex items-center gap-1"><Layers className="h-3 w-3" />Semesters</p>
                          <p className="text-sm font-semibold mt-0.5">{p.hasSemesters && p.semesters?.length > 0 ? p.semesters.length : 'None'}</p>
                        </div>
                      </div>

                      {p.subDepartmentId && (
                        <span className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-600 w-fit">
                          <Tag className="h-3.5 w-3.5 text-[#256c1d]" />
                          {typeof p.subDepartmentId === 'object' ? (p.subDepartmentId as any)?.name : p.subDepartmentId}
                        </span>
                      )}

                      {Array.isArray(p.specialisations) && p.specialisations.length > 0 && (
                        <div className="flex flex-wrap gap-1.5">
                          {p.specialisations.map((sp: string) => (
                            <span key={sp} className="inline-block px-2.5 py-1 rounded-full text-[11px] font-medium bg-[#eaf6e6] text-[#1f6a17]">{sp}</span>
                          ))}
                        </div>
                      )}

                      <div className="flex items-center justify-between gap-2 pt-1">
                        <Button variant="outline" onClick={() => setSelectedProgramId(p.id)} className="h-10 px-5 rounded-full bg-white border-slate-200 text-sm font-semibold gap-1.5 hover:bg-[#eaf6e6] hover:text-[#256c1d]" title="View details & materials">
                          <Eye className="w-4 h-4" />Details
                        </Button>
                        <div className="flex items-center gap-1.5">
                          {p.hasSemesters && p.semesters?.length > 0 && (
                            <button
                              onClick={() => setExpandedId(isExpanded ? null : p.id)}
                              className="h-10 w-10 rounded-full bg-white border border-slate-200 flex items-center justify-center text-slate-600 hover:bg-[#f4f6f3]"
                              title="Toggle semesters"
                            >
                              {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                            </button>
                          )}
                          {(mayEdit || mayDelete) && (
                            <>
                              {mayEdit && <button onClick={() => handleEdit(p)} title="Edit program" className="h-10 w-10 rounded-full bg-white border border-slate-200 flex items-center justify-center text-slate-600 hover:bg-[#eaf6e6] hover:text-[#256c1d]"><Edit className="w-4 h-4" /></button>}
                              {mayDelete && <button onClick={() => handleDelete(p.id)} title="Delete program" className="h-10 w-10 rounded-full bg-white border border-slate-200 flex items-center justify-center text-rose-500 hover:bg-rose-50"><Trash2 className="w-4 h-4" /></button>}
                            </>
                          )}
                        </div>
                      </div>

                      {isExpanded && p.semesters?.length > 0 && (
                        <div className="grid grid-cols-2 gap-2 pt-1">
                          {p.semesters.map(s => (
                            <div key={s.number} className="bg-[#f4f6f3] dark:bg-muted/30 rounded-2xl px-3 py-2.5 text-center">
                              <p className="text-xs font-semibold text-foreground">{s.name}</p>
                              <p className="text-[11px] text-muted-foreground mt-0.5">{s.durationMonths} months</p>
                            </div>
                          ))}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </div>
      )}

      <ProgramFormDialog
        open={dialogOpen}
        onOpenChange={(open) => { setDialogOpen(open); if (!open) setEditingProgram(null); }}
        onSuccess={() => fetchPrograms()}
        editingProgram={editingProgram}
        defaultUniversityId={selectedUniversityId}
      />
    </div>
  );
}
