import { useEffect, useState } from 'react';
import { ChevronDown, ChevronRight, FileText, Download, PlayCircle, Layers, User, Video, FolderOpen, Search } from 'lucide-react';
import { toast } from 'sonner';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
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
    <div key={l.id} className="rounded-2xl bg-[#f4f6f3] dark:bg-muted/30 p-4 space-y-3">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-sm font-semibold truncate">{l.title}</p>
          {l.description && <p className="text-xs text-muted-foreground line-clamp-2 mt-0.5">{l.description}</p>}
          <p className="text-[11px] text-muted-foreground mt-1.5 flex items-center gap-1.5">
            <User className="w-3 h-3" /> {l.faculty?.name ? `Faculty: ${l.faculty.name}` : 'No faculty assigned'} · updated {fmt(l.updatedAt)}
          </p>
        </div>
        {l.videoUrl ? (
          <Button size="sm" className="h-9 px-4 rounded-full bg-[#8ae47e] hover:bg-[#7bd96f] text-[#0b1d14] font-semibold shadow-none shrink-0 gap-1.5" onClick={() => setPlaying({ title: l.title, videoUrl: l.videoUrl })}>
            <PlayCircle className="w-4 h-4" /> Watch
          </Button>
        ) : (
          <span className="shrink-0 text-[11px] font-medium px-2.5 py-1 rounded-full bg-white text-slate-500">No video</span>
        )}
      </div>
      {l.materials?.length > 0 && (
        <ul className="space-y-1.5">
          {l.materials.map((m: any) => (
            <li key={m.id} className="flex items-center gap-2.5 text-xs rounded-full bg-white px-3.5 py-2">
              <FileText className="w-3.5 h-3.5 text-[#256c1d] shrink-0" />
              <span className="truncate flex-1 font-medium">{m.title || m.fileName}</span>
              <span className="text-muted-foreground shrink-0 hidden sm:inline">{m.faculty?.name} · {fmt(m.createdAt)}</span>
              <a href={api.getFileUrl(m.fileUrl)} target="_blank" rel="noreferrer" download={m.fileName} className="w-7 h-7 rounded-full bg-[#eaf6e6] text-[#256c1d] flex items-center justify-center hover:bg-[#d6f0d0] shrink-0" title="Download">
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
        <DialogContent className="w-[96vw] sm:max-w-3xl p-0 gap-0 overflow-hidden rounded-[2rem] border-0 bg-white max-h-[90vh] flex flex-col" style={{ fontFamily: "Urbanist, ui-sans-serif, system-ui, sans-serif" }}>
          <div className="flex items-start gap-4 px-6 sm:px-8 pt-7 pb-4 shrink-0">
            <div className="w-12 h-12 rounded-2xl bg-[#eaf6e6] text-[#256c1d] flex items-center justify-center shrink-0"><FolderOpen className="w-5 h-5" /></div>
            <DialogHeader className="space-y-1 text-left min-w-0">
              <DialogTitle className="text-2xl font-semibold tracking-tight text-left">Faculty content</DialogTitle>
              <DialogDescription className="text-sm text-muted-foreground text-left">{academicClass?.name}</DialogDescription>
            </DialogHeader>
          </div>

          {loading ? (
            <p className="py-14 text-center text-sm text-muted-foreground">Loading content...</p>
          ) : !data ? null : (
            <>
              <div className="px-6 sm:px-8 space-y-4 pb-4 shrink-0">
                <p className="text-sm text-muted-foreground flex items-start gap-2 rounded-2xl bg-[#f4f6f3] px-4 py-3">
                  <User className="w-4 h-4 mt-0.5 shrink-0 text-[#256c1d]" />
                  <span>
                  {data.incharges?.length > 0
                  ? <>Uploaded through the class configuration by the {data.incharges.length > 1 ? 'principals' : 'principal'} in charge: <span className="font-medium text-foreground">{data.incharges.map((p: any) => p.name).join(', ')}</span></>
                  : 'No principal in charge is assigned to this class.'}
                  </span>
                </p>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                  {[
                    { label: 'Modules', value: data.modules.length },
                    { label: 'Lessons', value: totalLessons },
                    { label: 'Videos', value: totalVideos },
                    { label: 'Trial videos', value: data.trialVideos.length },
                  ].map(({ label, value }) => (
                    <div key={label} className="rounded-2xl bg-[#eaf6e6] px-4 py-3">
                      <p className="text-[11px] font-medium text-[#256c1d]">{label}</p>
                      <p className="text-2xl font-semibold tracking-tight text-[#1f6a17]">{value}</p>
                    </div>
                  ))}
                </div>
                <div className="relative">
                  <Search className="absolute left-4 top-3.5 w-4 h-4 text-muted-foreground" />
                  <Input placeholder="Search lessons, faculty or files..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-11 h-11 rounded-full bg-[#f4f6f3] border-transparent text-sm focus:bg-white focus:border-[#54b947] focus:ring-4 focus:ring-[#54b947]/20" />
                </div>
              </div>

              <div className="flex-1 overflow-y-auto px-6 sm:px-8 pb-7 pt-1 space-y-3 border-t border-slate-100">
                {data.trialVideos.length > 0 && !q && (
                  <div className="rounded-3xl border border-slate-200 overflow-hidden">
                    <button className="w-full flex items-center gap-3 px-5 py-4 text-sm font-semibold hover:bg-[#f4f6f3] transition-colors" onClick={() => toggle('trial')}>
                      {open.trial ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                      <span className="w-8 h-8 rounded-full bg-[#eaf6e6] text-[#256c1d] flex items-center justify-center"><Video className="w-4 h-4" /></span> Trial videos
                    </button>
                    {open.trial && (
                      <div className="px-5 pb-4 space-y-2">
                        {data.trialVideos.map((v: any) => (
                          <div key={v.id} className="flex items-center justify-between gap-3 rounded-2xl bg-[#f4f6f3] p-4">
                            <div className="min-w-0">
                              <p className="text-sm font-semibold truncate">{v.title}</p>
                              <p className="text-[11px] text-muted-foreground">Added {fmt(v.createdAt)}</p>
                            </div>
                            <Button size="sm" className="h-9 px-4 rounded-full bg-[#8ae47e] hover:bg-[#7bd96f] text-[#0b1d14] font-semibold shadow-none gap-1.5" onClick={() => setPlaying({ title: v.title, videoUrl: v.videoUrl })}>
                              <PlayCircle className="w-4 h-4" /> Watch
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
                    <div key={mod.id} className="rounded-3xl border border-slate-200 overflow-hidden">
                      <button className="w-full flex items-center gap-3 px-5 py-4 text-left hover:bg-[#f4f6f3] transition-colors" onClick={() => toggle(mod.id)}>
                        {isOpen ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                        <span className="w-8 h-8 rounded-full bg-[#eaf6e6] text-[#256c1d] flex items-center justify-center shrink-0"><Layers className="w-4 h-4" /></span>
                        <span className="text-sm font-semibold flex-1 truncate">{mod.title}</span>
                        <span className="text-[11px] font-medium px-2.5 py-1 rounded-full bg-[#f1f3ef] text-slate-600">
                          {mod.lessons.length + mod.subModules.reduce((n: number, s: any) => n + s.lessons.length, 0)} lessons
                        </span>
                      </button>
                      {isOpen && (
                        <div className="px-5 pb-5 space-y-3">
                          {direct.map(lessonRow)}
                          {subs.map((s: any) => (
                            <div key={s.id} className="space-y-2">
                              <p className="text-sm font-semibold text-foreground pt-2">{s.title}</p>
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
