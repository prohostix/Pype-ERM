import { useEffect, useState } from 'react';
import { ChevronDown, ChevronRight, FileText, Download, PlayCircle, Layers, User, Video, FolderOpen } from 'lucide-react';
import { toast } from 'sonner';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import api from '@/lib/api';
import { VideoPreviewDialog } from './VideoPreviewDialog';

const fmt = (d?: string) => (d ? new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : '');

export function ClassContentViewer({ academicClass, onClose }: { academicClass: any | null; onClose: () => void }) {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [open, setOpen] = useState<Record<string, boolean>>({});
  const [playing, setPlaying] = useState<{ title: string; videoUrl: string } | null>(null);

  useEffect(() => {
    if (!academicClass) return;
    setData(null); setSearch(''); setOpen({}); setPlaying(null);
    setLoading(true);
    api.get(`/academic-classes/${academicClass.id}/content`)
      .then((r) => setData(r.data.data))
      .catch((err) => toast.error(err.response?.data?.message || 'Failed to load class content'))
      .finally(() => setLoading(false));
  }, [academicClass?.id]);

  const toggle = (id: string) => setOpen((o) => ({ ...o, [id]: !o[id] }));
  const q = search.trim().toLowerCase();
  const matches = (l: any) => !q || [l.title, l.description, l.faculty?.name, ...(l.materials || []).map((m: any) => m.title || m.fileName)].some((t) => (t || '').toLowerCase().includes(q));

  const lessonRow = (l: any) => (
    <div key={l.id} className="rounded-lg border bg-background p-3 space-y-2">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-sm font-semibold truncate">{l.title}</p>
          {l.description && <p className="text-xs text-muted-foreground line-clamp-2">{l.description}</p>}
          <p className="text-[11px] text-muted-foreground mt-1 flex items-center gap-1.5">
            <User className="w-3 h-3" /> {l.faculty?.name ? `Faculty: ${l.faculty.name}` : 'No faculty assigned'} · updated {fmt(l.updatedAt)}
          </p>
        </div>
        {l.videoUrl ? (
          <Button size="sm" variant="outline" className="shrink-0" onClick={() => setPlaying({ title: l.title, videoUrl: l.videoUrl })}>
            <PlayCircle className="w-4 h-4 mr-1.5" /> Watch
          </Button>
        ) : (
          <Badge variant="secondary" className="shrink-0 text-[10px]">No video</Badge>
        )}
      </div>
      {l.materials?.length > 0 && (
        <ul className="space-y-1">
          {l.materials.map((m: any) => (
            <li key={m.id} className="flex items-center gap-2 text-xs rounded-md bg-muted/40 px-2.5 py-1.5">
              <FileText className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
              <span className="truncate flex-1">{m.title || m.fileName}</span>
              <span className="text-muted-foreground shrink-0">{m.faculty?.name} · {fmt(m.createdAt)}</span>
              <a href={api.getFileUrl(m.fileUrl)} target="_blank" rel="noreferrer" download={m.fileName} className="text-primary shrink-0" title="Download">
                <Download className="w-3.5 h-3.5" />
              </a>
            </li>
          ))}
        </ul>
      )}
    </div>
  );

  const totalLessons = (data?.modules || []).reduce((n: number, m: any) => n + m.lessons.length + m.subModules.reduce((k: number, s: any) => k + s.lessons.length, 0), 0);
  const totalVideos = (data?.modules || []).reduce((n: number, m: any) => n + [...m.lessons, ...m.subModules.flatMap((s: any) => s.lessons)].filter((l: any) => l.videoUrl).length, 0);

  return (
    <>
      <Dialog open={!!academicClass} onOpenChange={(o) => { if (!o) onClose(); }}>
        <DialogContent className="sm:max-w-3xl max-h-[88vh] flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><FolderOpen className="w-5 h-5 text-primary" /> Faculty content: {academicClass?.name}</DialogTitle>
          </DialogHeader>

          {loading ? (
            <p className="py-12 text-center text-sm text-muted-foreground">Loading content...</p>
          ) : !data ? null : (
            <>
              <p className="text-xs text-muted-foreground flex items-center gap-1.5">
                <User className="w-3.5 h-3.5" />
                {data.incharges?.length > 0
                  ? <>Uploaded through the class configuration by the {data.incharges.length > 1 ? 'principals' : 'principal'} in charge: <span className="font-medium text-foreground">{data.incharges.map((p: any) => p.name).join(', ')}</span></>
                  : 'No principal in charge is assigned to this class.'}
              </p>
              <div className="flex flex-wrap items-center gap-2 text-xs">
                <Badge variant="secondary">{data.modules.length} modules</Badge>
                <Badge variant="secondary">{totalLessons} lessons</Badge>
                <Badge variant="secondary">{totalVideos} videos</Badge>
                <Badge variant="secondary">{data.trialVideos.length} trial videos</Badge>
              </div>
              <Input placeholder="Search lessons, faculty or files..." value={search} onChange={(e) => setSearch(e.target.value)} />

              <div className="flex-1 overflow-y-auto space-y-3 pr-1">
                {data.trialVideos.length > 0 && !q && (
                  <div className="rounded-xl border">
                    <button className="w-full flex items-center gap-2 px-4 py-3 text-sm font-semibold" onClick={() => toggle('trial')}>
                      {open.trial ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                      <Video className="w-4 h-4 text-muted-foreground" /> Trial videos
                    </button>
                    {open.trial && (
                      <div className="px-4 pb-3 space-y-2">
                        {data.trialVideos.map((v: any) => (
                          <div key={v.id} className="flex items-center justify-between gap-3 rounded-lg border bg-background p-3">
                            <div className="min-w-0">
                              <p className="text-sm font-semibold truncate">{v.title}</p>
                              <p className="text-[11px] text-muted-foreground">Added {fmt(v.createdAt)}</p>
                            </div>
                            <Button size="sm" variant="outline" onClick={() => setPlaying({ title: v.title, videoUrl: v.videoUrl })}>
                              <PlayCircle className="w-4 h-4 mr-1.5" /> Watch
                            </Button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {data.modules.length === 0 && (
                  <p className="py-10 text-center text-sm text-muted-foreground">Faculty haven't uploaded any modules to this class yet.</p>
                )}

                {data.modules.map((mod: any) => {
                  const direct = mod.lessons.filter(matches);
                  const subs = mod.subModules.map((s: any) => ({ ...s, lessons: s.lessons.filter(matches) })).filter((s: any) => s.lessons.length > 0 || !q);
                  if (q && direct.length === 0 && subs.every((s: any) => s.lessons.length === 0)) return null;
                  const isOpen = q ? true : !!open[mod.id];
                  return (
                    <div key={mod.id} className="rounded-xl border">
                      <button className="w-full flex items-center gap-2 px-4 py-3 text-left" onClick={() => toggle(mod.id)}>
                        {isOpen ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                        <Layers className="w-4 h-4 text-primary" />
                        <span className="text-sm font-semibold flex-1 truncate">{mod.title}</span>
                        <span className="text-[11px] text-muted-foreground">
                          {mod.lessons.length + mod.subModules.reduce((n: number, s: any) => n + s.lessons.length, 0)} lessons
                        </span>
                      </button>
                      {isOpen && (
                        <div className="px-4 pb-4 space-y-3">
                          {direct.map(lessonRow)}
                          {subs.map((s: any) => (
                            <div key={s.id} className="space-y-2">
                              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground pt-1">{s.title}</p>
                              {s.lessons.length === 0 ? <p className="text-xs text-muted-foreground">No lessons.</p> : s.lessons.map(lessonRow)}
                            </div>
                          ))}
                          {direct.length === 0 && subs.length === 0 && <p className="text-xs text-muted-foreground">No lessons in this module.</p>}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

      <VideoPreviewDialog video={playing} onClose={() => setPlaying(null)} />
    </>
  );
}
