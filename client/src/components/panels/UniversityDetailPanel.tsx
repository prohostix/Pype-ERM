import { useState, useEffect } from 'react';
import { ArrowLeft, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import api from '@/lib/api';
import { ProgramDetailPanel } from './ProgramDetailPanel';
import { UniversitySessionsDialog } from './UniversitySessionsDialog';

interface UniversityDetailPanelProps {
  university: any;
  onBack: () => void;
}

export function UniversityDetailPanel({ university, onBack }: UniversityDetailPanelProps) {
  const [programs, setPrograms] = useState<any[]>([]);
  const [sessions, setSessions] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedProgramId, setSelectedProgramId] = useState<string | null>(null);
  const [manageSessionsOpen, setManageSessionsOpen] = useState(false);

  useEffect(() => {
    fetchData();
  }, [university.id]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [programsRes, sessionsRes] = await Promise.all([
        api.get('/operations/programs'),
        api.get('/operations/sessions'),
      ]);
      
      const allPrograms = programsRes.data.data || [];
      const allSessions = sessionsRes.data.data || [];

      // Filter programs that belong to this university
      const uniPrograms = allPrograms.filter((p: any) => {
        const uId = typeof p.universityId === 'object' ? p.universityId?.id : p.universityId;
        return uId === university.id;
      });

      // Filter sessions that belong to this university
      const uniSessions = allSessions.filter((s: any) => {
        return s.universityId === university.id || (s.programId && programsRes.data.data?.find((p: any) => p.id === s.programId)?.universityId === university.id);
      });

      setPrograms(uniPrograms);
      setSessions(uniSessions);
    } catch (err) {
      console.error('Failed to fetch university details:', err);
    } finally {
      setLoading(false);
    }
  };

  if (selectedProgramId) {
    return (
      <ProgramDetailPanel 
        programId={selectedProgramId} 
        onBack={() => setSelectedProgramId(null)} 
      />
    );
  }

  return (
    <div className="space-y-6">
      <Button variant="outline" onClick={onBack} className="h-10 px-5 rounded-full bg-white border-slate-200 hover:bg-[#eaf6e6] font-semibold gap-2">
        <ArrowLeft className="w-4 h-4" /> Back to Universities
      </Button>

      <div className="rounded-3xl bg-white border border-slate-100 p-5 sm:p-6 flex items-center gap-5">
        {university.logo && (
          <div className="w-16 h-16 rounded-2xl bg-white border border-slate-100 overflow-hidden shrink-0">
            <img src={api.getFileUrl(university.logo)} alt={university.name} className="w-full h-full object-contain p-1" />
          </div>
        )}
        <div className="min-w-0">
          <h2 className="text-2xl sm:text-3xl font-semibold tracking-tight truncate">{university.name}</h2>
          <div className="flex flex-wrap items-center gap-2 mt-2">
            {university.code && <span className="rounded-full bg-[#f4f6f3] px-3 py-1 text-xs font-semibold font-mono text-slate-700">{university.code}</span>}
            {university.contact && <span className="text-sm text-muted-foreground">{university.contact}</span>}
            {university.address && <span className="text-sm text-muted-foreground">{university.address}</span>}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 items-start">
        {/* Programs List */}
        <div className="rounded-3xl bg-white border border-slate-100 overflow-hidden">
          <div className="px-6 py-5 flex items-center justify-between border-b border-slate-100">
            <h3 className="text-lg font-semibold tracking-tight">Programs</h3>
            <span className="rounded-full bg-[#eaf6e6] text-[#256c1d] text-xs font-semibold px-3 py-1">{programs.length}</span>
          </div>
          <div className="p-4 sm:p-5">
            {loading ? (
              <div className="space-y-3">{[1, 2].map(i => <div key={i} className="h-16 bg-slate-100 rounded-2xl animate-pulse" />)}</div>
            ) : programs.length === 0 ? (
              <div className="text-center py-10 text-sm text-muted-foreground">No programs found for this university.</div>
            ) : (
              <div className="space-y-3">
                {programs.map((p: any) => (
                  <div key={p.id} onClick={() => setSelectedProgramId(p.id)} className="p-4 rounded-2xl bg-[#f4f6f3] hover:bg-[#eef5ec] transition-colors cursor-pointer">
                    <div className="flex items-center justify-between gap-3">
                      <div className="min-w-0">
                        <p className="font-semibold text-slate-900 truncate">{p.name}</p>
                        <p className="text-xs font-mono text-muted-foreground mt-0.5">{p.code}</p>
                      </div>
                      <Badge className="rounded-full border-0 bg-white text-slate-700 text-[11px] font-semibold px-3 hover:bg-white shrink-0">{p.courseType}</Badge>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Sessions List */}
        <div className="rounded-3xl bg-white border border-slate-100 overflow-hidden">
          <div className="px-6 py-5 flex items-center justify-between gap-3 border-b border-slate-100">
            <div className="flex items-center gap-3">
              <h3 className="text-lg font-semibold tracking-tight">Admission Sessions</h3>
              <span className="rounded-full bg-[#eaf6e6] text-[#256c1d] text-xs font-semibold px-3 py-1">{sessions.length}</span>
            </div>
            <Button
              variant="outline"
              className="h-10 rounded-full px-5 gap-1 bg-white border-[#cfe9c9] text-[#256c1d] hover:bg-[#eaf6e6] font-semibold"
              onClick={() => setManageSessionsOpen(true)}
            >
              <Plus className="w-3.5 h-3.5" /> Manage &amp; Create
            </Button>
          </div>
          <div className="p-4 sm:p-5">
            {loading ? (
              <div className="space-y-3">{[1, 2].map(i => <div key={i} className="h-16 bg-slate-100 rounded-2xl animate-pulse" />)}</div>
            ) : sessions.length === 0 ? (
              <div className="text-center py-10 text-muted-foreground space-y-4">
                <p className="text-sm">No sessions found for this university.</p>
                <Button
                  className="h-11 px-6 rounded-full gap-1 bg-[#8ae47e] hover:bg-[#7bd96f] text-[#0b1d14] font-semibold"
                  onClick={() => setManageSessionsOpen(true)}
                >
                  <Plus className="w-4 h-4" /> Create Session
                </Button>
              </div>
            ) : (
              <div className="space-y-3">
                {sessions.map((s: any) => (
                  <div key={s.id} className="p-4 rounded-2xl bg-[#f4f6f3]">
                    <div className="flex items-center justify-between gap-3">
                      <div className="min-w-0">
                        <p className="font-semibold text-slate-900 truncate">{s.name}</p>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {s.startDate && new Date(s.startDate).toLocaleDateString()} - {s.endDate && new Date(s.endDate).toLocaleDateString()}
                        </p>
                      </div>
                      <Badge className="rounded-full border-0 bg-[#dff3da] text-[#256c1d] text-[11px] font-semibold px-3 capitalize hover:bg-[#dff3da] shrink-0">{s.status}</Badge>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      <UniversitySessionsDialog
        university={university}
        open={manageSessionsOpen}
        onOpenChange={(open) => {
          setManageSessionsOpen(open);
          if (!open) fetchData();
        }}
        isOrgAdmin={true}
      />
    </div>
  );
}
