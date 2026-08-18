import { useState, useEffect } from 'react';
import { ArrowLeft, BookOpen, Calendar } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import api from '@/lib/api';
import { ProgramDetailPanel } from './ProgramDetailPanel';

interface UniversityDetailPanelProps {
  university: any;
  onBack: () => void;
}

export function UniversityDetailPanel({ university, onBack }: UniversityDetailPanelProps) {
  const [programs, setPrograms] = useState<any[]>([]);
  const [sessions, setSessions] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedProgramId, setSelectedProgramId] = useState<string | null>(null);

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
        return s.universityId === university.id;
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
      <div className="flex items-center gap-4">
        <Button variant="ghost" onClick={onBack} size="sm">
          <ArrowLeft className="w-4 h-4 mr-2" /> Back to Universities
        </Button>
      </div>

      <div className="flex items-center gap-4">
        {university.logo ? (
          <div className="w-16 h-16 rounded-lg bg-white border overflow-hidden shrink-0">
            <img src={api.getFileUrl(university.logo)} alt={university.name} className="w-full h-full object-contain" />
          </div>
        ) : null}
        <div>
          <h2 className="text-2xl font-bold">{university.name}</h2>
          <p className="text-muted-foreground">{university.code} {university.contact ? `• ${university.contact}` : ''} {university.address ? `• ${university.address}` : ''}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Programs List */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BookOpen className="w-5 h-5 text-indigo-600" />
              Programs ({programs.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="text-center py-4 text-muted-foreground">Loading...</div>
            ) : programs.length === 0 ? (
              <div className="text-center py-4 text-muted-foreground">No programs found for this university.</div>
            ) : (
              <div className="space-y-3">
                {programs.map((p: any) => (
                  <div key={p.id} onClick={() => setSelectedProgramId(p.id)} className="p-3 border rounded-lg hover:bg-slate-50 transition-colors cursor-pointer group">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-semibold text-sm">{p.name}</p>
                        <p className="text-xs font-mono text-muted-foreground">{p.code}</p>
                      </div>
                      <Badge variant="secondary" className="text-[10px]">{p.courseType}</Badge>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Sessions List */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="w-5 h-5 text-emerald-600" />
              Admission Sessions ({sessions.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="text-center py-4 text-muted-foreground">Loading...</div>
            ) : sessions.length === 0 ? (
              <div className="text-center py-4 text-muted-foreground">No sessions found for this university.</div>
            ) : (
              <div className="space-y-3">
                {sessions.map((s: any) => (
                  <div key={s.id} className="p-3 border rounded-lg hover:bg-slate-50 transition-colors">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-semibold text-sm">{s.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {s.startDate && new Date(s.startDate).toLocaleDateString()} - {s.endDate && new Date(s.endDate).toLocaleDateString()}
                        </p>
                      </div>
                      <Badge className="text-[10px]">{s.status}</Badge>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
