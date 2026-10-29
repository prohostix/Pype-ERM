import { useState, useEffect, useMemo } from 'react';
import {
  Plus, Edit, Trash2, BookOpen, Clock, Layers, ChevronDown, ChevronUp,
  Tag, Eye, Building2, Search, GraduationCap, X
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import api from '@/lib/api';
import { useAuth } from '@/hooks/useAuth';
import { ProgramDetailPanel } from './ProgramDetailPanel';
import { ProgramFormDialog } from '../forms/ProgramFormDialog';

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
    if (!confirm('Delete this program?')) return;
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

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Program Management</h2>
          <p className="text-muted-foreground text-sm">Filter academic programs by university and manage courses</p>
        </div>
        <Button
          onClick={() => { setEditingProgram(null); setDialogOpen(true); }}
          disabled={!isOrgAdmin || !selectedUniversityId}
          className={!isOrgAdmin ? 'hidden' : ''}
          title={!selectedUniversityId ? 'Select a university first to add programs' : undefined}
        >
          <Plus className="w-4 h-4 mr-2" />Add Program
        </Button>
      </div>

      {/* University Selection Card */}
      <Card className="border shadow-sm">
        <CardContent className="p-4 sm:p-5">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex-1 max-w-xl">
              <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1.5 flex items-center gap-1.5">
                <Building2 className="w-4 h-4 text-primary" />
                Select University
              </label>
              <Select
                value={selectedUniversityId}
                onValueChange={(val) => {
                  setSelectedUniversityId(val);
                  setSearchQuery('');
                  setSelectedCourseType('all');
                }}
              >
                <SelectTrigger className="w-full bg-background h-10 font-medium">
                  <SelectValue placeholder={loadingUnis ? "Loading universities..." : "Choose a university to view programs..."} />
                </SelectTrigger>
                <SelectContent className="max-h-72">
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
              <div className="flex items-center gap-3 pt-1 md:pt-0">
                <div className="text-right hidden sm:block">
                  <p className="text-xs text-muted-foreground">Selected University</p>
                  <p className="text-sm font-semibold text-foreground truncate max-w-[220px]">{selectedUniversity.name}</p>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setSelectedUniversityId('')}
                  className="text-xs h-9"
                >
                  <X className="w-3.5 h-3.5 mr-1" />
                  Change
                </Button>
              </div>
            )}
          </div>

          {/* Search & Filter Toolbar (Visible when a university is selected) */}
          {selectedUniversityId && (
            <div className="mt-4 pt-4 border-t flex flex-col sm:flex-row gap-3">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Search programs by name, code, specialisation..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9 h-9"
                />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery('')}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
              <div className="w-full sm:w-56">
                <Select value={selectedCourseType} onValueChange={setSelectedCourseType}>
                  <SelectTrigger className="h-9">
                    <SelectValue placeholder="All Course Types" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Course Types</SelectItem>
                    {COURSE_TYPES.map(ct => (
                      <SelectItem key={ct.value} value={ct.value}>{ct.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Main Content Area */}
      {!selectedUniversityId ? (
        /* Prompt State: When no university is selected yet */
        <Card className="border border-dashed">
          <CardContent className="py-12 sm:py-16 text-center max-w-xl mx-auto">
            <div className="w-16 h-16 rounded-2xl bg-primary/10 text-primary flex items-center justify-center mx-auto mb-4">
              <GraduationCap className="w-8 h-8" />
            </div>
            <h3 className="text-xl font-bold mb-2">Select a University</h3>
            <p className="text-sm text-muted-foreground mb-6">
              Please choose a university from the dropdown above or click on one below to view, manage, and filter its programs.
            </p>

            {loadingUnis ? (
              <div className="text-sm text-muted-foreground">Loading universities...</div>
            ) : universities.length === 0 ? (
              <div className="text-sm text-muted-foreground">No universities available.</div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-left">
                {universities.slice(0, 6).map((u) => (
                  <button
                    key={u.id}
                    onClick={() => setSelectedUniversityId(u.id)}
                    className="p-3.5 rounded-xl border border-border/60 hover:border-primary/50 hover:bg-muted/40 transition-all text-left group flex items-center justify-between"
                  >
                    <div className="min-w-0 pr-2">
                      <p className="font-semibold text-sm truncate text-foreground group-hover:text-primary transition-colors">
                        {u.name}
                      </p>
                      {u.code && <p className="text-xs text-muted-foreground font-mono mt-0.5">{u.code}</p>}
                    </div>
                    <ChevronDown className="w-4 h-4 text-muted-foreground -rotate-90 shrink-0 group-hover:translate-x-0.5 transition-transform" />
                  </button>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      ) : (
        /* Programs List for Selected University */
        <Card>
          <CardHeader className="pb-3 flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-lg">
                Programs for {selectedUniversity?.name}
              </CardTitle>
              <CardDescription className="text-xs">
                Showing {filteredPrograms.length} of {programs.length} program{programs.length === 1 ? '' : 's'}
              </CardDescription>
            </div>
            {selectedUniversity?.code && (
              <Badge variant="outline" className="font-mono text-xs">{selectedUniversity.code}</Badge>
            )}
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="text-center py-12 text-muted-foreground">
                <div className="inline-block animate-spin rounded-full h-6 w-6 border-2 border-primary border-t-transparent mb-2" />
                <p className="text-sm">Loading programs...</p>
              </div>
            ) : filteredPrograms.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <BookOpen className="w-8 h-8 opacity-30 mx-auto mb-2" />
                <p className="font-medium text-foreground">
                  {programs.length === 0 ? 'No programs found for this university' : 'No programs match your search'}
                </p>
                <p className="text-xs mt-1">
                  {programs.length === 0
                    ? 'Get started by creating a new academic program for this university.'
                    : 'Try adjusting your search terms or course type filter.'}
                </p>
                {isOrgAdmin && programs.length === 0 && (
                  <Button
                    size="sm"
                    className="mt-4"
                    onClick={() => { setEditingProgram(null); setDialogOpen(true); }}
                  >
                    <Plus className="w-4 h-4 mr-1.5" />Add First Program
                  </Button>
                )}
              </div>
            ) : (
              <div className="space-y-2.5">
                {filteredPrograms.map((p) => {
                  const meta = getCourseTypeMeta(p.courseType);
                  const isExpanded = expandedId === p.id;
                  return (
                    <div key={p.id} className="border rounded-xl overflow-hidden bg-card hover:border-primary/40 transition-all">
                      <div className="flex items-center justify-between px-4 py-3.5 hover:bg-muted/30 transition-colors">
                        <div className="flex items-center gap-3 min-w-0">
                          <div
                            className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0"
                            style={{ background: meta.bg }}
                          >
                            <BookOpen className="w-4 h-4" style={{ color: meta.color }} />
                          </div>
                          <div className="min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="font-semibold text-sm truncate">{p.name}</span>
                              <span className="text-xs font-mono text-muted-foreground bg-muted px-1.5 py-0.5 rounded">{p.code}</span>
                              <span
                                className="text-[10px] font-semibold px-2 py-0.5 rounded-full"
                                style={{ background: meta.bg, color: meta.color }}
                              >
                                {meta.label}
                              </span>
                            </div>
                            <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground flex-wrap">
                              <span className="flex items-center gap-1">
                                <Clock className="h-3 w-3" />{formatDuration(p.duration)}
                              </span>
                              {p.hasSemesters && p.semesters?.length > 0 && (
                                <span className="flex items-center gap-1">
                                  <Layers className="h-3 w-3" />{p.semesters.length} semesters
                                </span>
                              )}
                              {p.subDepartmentId && (
                                <span className="flex items-center gap-1 text-violet-600">
                                  <Tag className="h-3 w-3" />
                                  {typeof p.subDepartmentId === 'object' ? (p.subDepartmentId as any)?.name : p.subDepartmentId}
                                </span>
                              )}
                            </div>
                            {Array.isArray(p.specialisations) && p.specialisations.length > 0 && (
                              <div className="flex flex-wrap gap-1 mt-1.5">
                                {p.specialisations.map((s: string) => (
                                  <span key={s} className="inline-block px-2 py-0.5 rounded-full text-[10px] font-medium bg-violet-100 text-violet-700 dark:bg-violet-950 dark:text-violet-300">
                                    {s}
                                  </span>
                                ))}
                              </div>
                            )}
                          </div>
                        </div>

                        <div className="flex items-center gap-2 shrink-0 ml-3">
                          <Badge variant={p.status === 'active' ? 'default' : 'secondary'} className="text-xs capitalize">{p.status}</Badge>
                          {p.hasSemesters && p.semesters?.length > 0 && (
                            <button
                              onClick={() => setExpandedId(isExpanded ? null : p.id)}
                              className="text-muted-foreground hover:text-foreground p-1"
                              title="Toggle Semesters"
                            >
                              {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                            </button>
                          )}
                          {isOrgAdmin && (
                            <>
                              <Button variant="ghost" size="sm" onClick={() => handleEdit(p)} title="Edit program">
                                <Edit className="w-3.5 h-3.5" />
                              </Button>
                              <Button variant="ghost" size="sm" onClick={() => handleDelete(p.id)} title="Delete program">
                                <Trash2 className="w-3.5 h-3.5 text-destructive" />
                              </Button>
                            </>
                          )}
                          <Button variant="ghost" size="sm" onClick={() => setSelectedProgramId(p.id)} title="View details & materials">
                            <Eye className="w-3.5 h-3.5" />
                          </Button>
                        </div>
                      </div>

                      {/* Semester breakdown */}
                      {isExpanded && p.semesters?.length > 0 && (
                        <div className="border-t bg-muted/20 px-4 py-3">
                          <div className="grid grid-cols-1 sm:grid-cols-3 md:grid-cols-4 gap-2">
                            {p.semesters.map(s => (
                              <div key={s.number} className="bg-background border rounded-lg px-3 py-2 text-center shadow-xs">
                                <p className="text-xs font-semibold text-foreground">{s.name}</p>
                                <p className="text-[10px] text-muted-foreground mt-0.5">{s.durationMonths} months</p>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
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

