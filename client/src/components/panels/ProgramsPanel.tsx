import { useState, useEffect } from 'react';
import { Plus, Edit, Trash2, BookOpen, Clock, Layers, ChevronDown, ChevronUp, Tag, Eye } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import api from '@/lib/api';
import { useAuth } from '@/hooks/useAuth';
import { ProgramDetailPanel } from './ProgramDetailPanel';
import { ProgramFormDialog } from '../forms/ProgramFormDialog';

type CourseType = 'SkillCourse' | 'OnlineDegree' | 'BVocDegree' | 'CreditTransfer';

const COURSE_TYPES: { value: CourseType; label: string; color: string; bg: string }[] = [
  { value: 'SkillCourse',     label: 'Skill Course',     color: '#7c3aed', bg: '#f5f3ff' },
  { value: 'OnlineDegree',    label: 'Online Degree',    color: '#2563eb', bg: '#eff6ff' },
  { value: 'BVocDegree',     label: 'B.Voc Degree',    color: '#0891b2', bg: '#ecfeff' },
  { value: 'CreditTransfer',  label: 'Credit Transfer',  color: '#16a34a', bg: '#f0fdf4' },
];

interface Semester { number: number; name: string; durationMonths: number; }
interface Program {
  id: string; name: string; code: string; courseType: CourseType;
  duration: number; hasSemesters: boolean; semesters: Semester[];
  specialisations: string[];
  status: string; universityId: any; subDepartmentId?: any;
}

function formatDuration(months: number) {
  if (months < 12) return `${months} months`;
  if (months % 12 === 0) return `${months / 12} year${months / 12 > 1 ? 's' : ''}`;
  return `${Math.floor(months / 12)}y ${months % 12}m`;
}

export function ProgramsPanel() {
  const { user } = useAuth();
  const isOrgAdmin = ['org_admin', 'superadmin'].includes(user?.role || '');
  const [programs, setPrograms] = useState<Program[]>([]);
  const [loading, setLoading] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingProgram, setEditingProgram] = useState<Program | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [selectedProgramId, setSelectedProgramId] = useState<string | null>(null);

  useEffect(() => { fetchPrograms(); }, []);

  const fetchPrograms = async () => {
    setLoading(true);
    try {
      const res = await api.get('/operations/programs');
      setPrograms(res.data.data || []);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  };

  const handleEdit = (p: Program) => {
    setEditingProgram(p);
    setDialogOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this program?')) return;
    try { await api.delete(`/operations/programs/${id}`); fetchPrograms(); }
    catch (err) { console.error(err); }
  };

  const getCourseTypeMeta = (ct: string) => COURSE_TYPES.find(c => c.value === ct) || COURSE_TYPES[1];

  // If a program is selected, show its detail panel
  if (selectedProgramId) {
    return <ProgramDetailPanel programId={selectedProgramId} onBack={() => setSelectedProgramId(null)} />;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Program Management</h2>
          <p className="text-muted-foreground">Manage academic programs and courses</p>
        </div>
        <Button onClick={() => { setEditingProgram(null); setDialogOpen(true); }} disabled={!isOrgAdmin} className={!isOrgAdmin ? 'hidden' : ''}>
          <Plus className="w-4 h-4 mr-2" />Add Program
        </Button>
      </div>

      {/* List */}
      <Card>
        <CardHeader><CardTitle>Programs</CardTitle></CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8">Loading...</div>
          ) : programs.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">No programs found</div>
          ) : (
            <div className="space-y-2">
              {programs.map((p) => {
                const meta = getCourseTypeMeta(p.courseType);
                const uniName = typeof p.universityId === 'object' ? p.universityId?.name : '';
                const isExpanded = expandedId === p.id;
                return (
                  <div key={p.id} className="border rounded-xl overflow-hidden">
                    <div className="flex items-center justify-between px-4 py-3 hover:bg-muted/30 transition-colors">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-lg flex items-center justify-center"
                          style={{ background: meta.bg }}>
                          <BookOpen className="w-4 h-4" style={{ color: meta.color }} />
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-semibold text-sm">{p.name}</span>
                            <span className="text-xs font-mono text-muted-foreground">{p.code}</span>
                            <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full"
                              style={{ background: meta.bg, color: meta.color }}>
                              {p.courseType}
                            </span>
                          </div>
                          <div className="flex items-center gap-3 mt-0.5 text-xs text-muted-foreground">
                            <span className="flex items-center gap-1">
                              <Clock className="h-3 w-3" />{formatDuration(p.duration)}
                            </span>
                            {p.hasSemesters && p.semesters?.length > 0 && (
                              <span className="flex items-center gap-1">
                                <Layers className="h-3 w-3" />{p.semesters.length} semesters
                              </span>
                            )}
                            {uniName && <span>{uniName}</span>}
                            {p.subDepartmentId && (
                              <span className="flex items-center gap-1 text-violet-600">
                                <Tag className="h-3 w-3" />
                                {typeof p.subDepartmentId === 'object' ? (p.subDepartmentId as any)?.name : p.subDepartmentId}
                              </span>
                            )}
                          </div>
                          {Array.isArray(p.specialisations) && p.specialisations.length > 0 && (
                            <div className="flex flex-wrap gap-1 mt-1">
                              {p.specialisations.map((s: string) => (
                                <span key={s} className="inline-block px-2 py-0.5 rounded-full text-[10px] font-medium bg-violet-100 text-violet-700">{s}</span>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <Badge variant={p.status === 'active' ? 'default' : 'secondary'} className="text-xs">{p.status}</Badge>
                        {p.hasSemesters && p.semesters?.length > 0 && (
                          <button onClick={() => setExpandedId(isExpanded ? null : p.id)}
                            className="text-muted-foreground hover:text-foreground">
                            {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                          </button>
                        )}
                        {isOrgAdmin && (
                          <>
                            <Button variant="ghost" size="sm" onClick={() => handleEdit(p)}><Edit className="w-3.5 h-3.5" /></Button>
                            <Button variant="ghost" size="sm" onClick={() => handleDelete(p.id)}><Trash2 className="w-3.5 h-3.5" /></Button>
                          </>
                        )}
                        <Button variant="ghost" size="sm" onClick={() => setSelectedProgramId(p.id)} title="View details & materials">
                          <Eye className="w-3.5 h-3.5" />
                        </Button>
                      </div>
                    </div>

                    {/* Semester breakdown */}
                    {isExpanded && p.semesters?.length > 0 && (
                      <div className="border-t bg-slate-50 px-4 py-3">
                        <div className="grid grid-cols-1 sm:grid-cols-3 md:grid-cols-4 gap-2">
                          {p.semesters.map(s => (
                            <div key={s.number} className="bg-white border rounded-lg px-3 py-2 text-center">
                              <p className="text-xs font-semibold text-slate-700">{s.name}</p>
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

      <ProgramFormDialog
        open={dialogOpen}
        onOpenChange={(open) => { setDialogOpen(open); if (!open) setEditingProgram(null); }}
        onSuccess={fetchPrograms}
        editingProgram={editingProgram}
      />
    </div>
  );
}
