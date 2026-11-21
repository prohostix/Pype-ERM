import { useEffect, useMemo, useState } from 'react';
import { Video, Plus, CalendarClock, Link2, Pencil, Ban, Loader2, Users, ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import api from '@/lib/api';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

interface ClassMeeting {
  id: string; title: string; description: string | null; startsAt: string; durationMinutes: number;
  meetingUrl: string; classIds: string[]; status: string; cancelReason: string | null;
}

// <input type="datetime-local"> works in the browser's local time
const toLocalInput = (d: Date) => {
  const p = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}`;
};
const fmtWhen = (iso: string) => new Date(iso).toLocaleString('en-IN', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric', hour: 'numeric', minute: '2-digit', hour12: true });

const emptyForm = () => ({ title: '', description: '', startsAt: '', durationMinutes: '60', meetingUrl: '', classIds: [] as string[] });

/** Principal: schedule a meeting with a link for the students of selected classes. */
export function ClassMeetingsPanel() {
  const [meetings, setMeetings] = useState<ClassMeeting[]>([]);
  const [classes, setClasses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<ClassMeeting | null>(null);
  const [form, setForm] = useState(emptyForm());
  const [saving, setSaving] = useState(false);
  const [cancelTarget, setCancelTarget] = useState<ClassMeeting | null>(null);
  const [cancelReason, setCancelReason] = useState('');

  const load = async () => {
    setLoading(true);
    try {
      const [m, c] = await Promise.all([api.get('/faculty-portal/meetings'), api.get('/faculty-portal/classes')]);
      setMeetings(m.data?.data || []);
      setClasses(c.data?.data || []);
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to load meetings');
    } finally { setLoading(false); }
  };
  useEffect(() => { load(); }, []);

  const className = (id: string) => classes.find((c) => c.id === id)?.name || 'Class';
  const now = Date.now();
  const { upcoming, past } = useMemo(() => {
    const isUpcoming = (m: ClassMeeting) => m.status !== 'cancelled' && new Date(m.startsAt).getTime() + m.durationMinutes * 60_000 >= now;
    return {
      upcoming: meetings.filter(isUpcoming).sort((a, b) => +new Date(a.startsAt) - +new Date(b.startsAt)),
      past: meetings.filter((m) => !isUpcoming(m)).sort((a, b) => +new Date(b.startsAt) - +new Date(a.startsAt))
    };
  }, [meetings, now]);

  const openCreate = () => { setEditing(null); setForm(emptyForm()); setDialogOpen(true); };
  const openEdit = (m: ClassMeeting) => {
    setEditing(m);
    setForm({ title: m.title, description: m.description || '', startsAt: toLocalInput(new Date(m.startsAt)), durationMinutes: String(m.durationMinutes), meetingUrl: m.meetingUrl, classIds: m.classIds });
    setDialogOpen(true);
  };
  const toggleClass = (id: string) =>
    setForm((f) => ({ ...f, classIds: f.classIds.includes(id) ? f.classIds.filter((c) => c !== id) : [...f.classIds, id] }));

  const save = async () => {
    if (!form.title.trim()) return toast.error('Enter the meeting topic');
    if (!form.startsAt) return toast.error('Pick the date and time');
    if (!form.meetingUrl.trim()) return toast.error('Paste the meeting link');
    if (!form.classIds.length) return toast.error('Select at least one class');
    setSaving(true);
    try {
      const body = {
        title: form.title, description: form.description, startsAt: new Date(form.startsAt).toISOString(),
        durationMinutes: Number(form.durationMinutes) || 60, meetingUrl: form.meetingUrl, classIds: form.classIds
      };
      if (editing) await api.put(`/faculty-portal/meetings/${editing.id}`, body);
      else await api.post('/faculty-portal/meetings', body);
      toast.success(editing ? 'Meeting updated. Students have been notified.' : 'Meeting scheduled. Students have been notified.');
      setDialogOpen(false);
      load();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to save meeting');
    } finally { setSaving(false); }
  };

  const confirmCancel = async () => {
    if (!cancelTarget) return;
    setSaving(true);
    try {
      await api.put(`/faculty-portal/meetings/${cancelTarget.id}`, { status: 'cancelled', cancelReason });
      toast.success('Meeting cancelled. Students have been notified.');
      setCancelTarget(null); setCancelReason('');
      load();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to cancel meeting');
    } finally { setSaving(false); }
  };

  const MeetingCard = ({ m, isPast }: { m: ClassMeeting; isPast?: boolean }) => (
    <div className={cn('rounded-xl border bg-card p-4 flex flex-col sm:flex-row sm:items-center gap-3', (isPast || m.status === 'cancelled') && 'opacity-70')}>
      <div className="flex-1 min-w-0 space-y-1">
        <div className="flex items-center gap-2 flex-wrap">
          <h3 className="font-semibold truncate">{m.title}</h3>
          {m.status === 'cancelled' && <Badge variant="destructive">Cancelled</Badge>}
        </div>
        <p className="text-sm text-muted-foreground flex items-center gap-1.5"><CalendarClock className="w-3.5 h-3.5" /> {fmtWhen(m.startsAt)} · {m.durationMinutes} min</p>
        <p className="text-xs text-muted-foreground flex items-center gap-1.5 flex-wrap"><Users className="w-3.5 h-3.5" /> {m.classIds.map(className).join(', ')}</p>
        {m.status === 'cancelled' && m.cancelReason && <p className="text-xs text-destructive">Reason: {m.cancelReason}</p>}
      </div>
      <div className="flex items-center gap-2 shrink-0">
        {m.status !== 'cancelled' && (
          <>
            <Button size="sm" variant="outline" asChild><a href={m.meetingUrl} target="_blank" rel="noopener noreferrer"><ExternalLink className="w-3.5 h-3.5 mr-1.5" />Open link</a></Button>
            {!isPast && <Button size="sm" variant="outline" onClick={() => openEdit(m)}><Pencil className="w-3.5 h-3.5 mr-1.5" />Edit</Button>}
            {!isPast && <Button size="sm" variant="outline" className="text-destructive" onClick={() => { setCancelTarget(m); setCancelReason(''); }}><Ban className="w-3.5 h-3.5 mr-1.5" />Cancel</Button>}
          </>
        )}
      </div>
    </div>
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2"><Video className="w-6 h-6 text-primary" /> Student Meetings</h1>
          <p className="text-sm text-muted-foreground mt-1">Schedule a meeting with a link for the students of your classes. They see it in their portal.</p>
        </div>
        <Button onClick={openCreate} disabled={!classes.length}><Plus className="w-4 h-4 mr-2" />New Meeting</Button>
      </div>

      {loading ? (
        <div className="flex justify-center py-16"><Loader2 className="w-6 h-6 animate-spin text-muted-foreground" /></div>
      ) : (
        <>
          {!classes.length && <p className="text-sm text-muted-foreground">You are not in charge of any class yet, so there is nobody to invite.</p>}
          <section className="space-y-3">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">Upcoming</h2>
            {upcoming.length ? upcoming.map((m) => <MeetingCard key={m.id} m={m} />) : <p className="text-sm text-muted-foreground">No upcoming meetings.</p>}
          </section>
          {past.length > 0 && (
            <section className="space-y-3">
              <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">Past and cancelled</h2>
              {past.map((m) => <MeetingCard key={m.id} m={m} isPast />)}
            </section>
          )}
        </>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editing ? 'Edit meeting' : 'New meeting'}</DialogTitle>
            <DialogDescription>Students in the selected classes will see this and get a notification.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label>Topic</Label>
              <Input value={form.title} maxLength={200} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="e.g. Exam preparation briefing" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Date and time</Label>
                <Input type="datetime-local" value={form.startsAt} onChange={(e) => setForm({ ...form, startsAt: e.target.value })} />
              </div>
              <div className="space-y-1.5">
                <Label>Duration (minutes)</Label>
                <Input type="number" min={5} max={600} value={form.durationMinutes} onChange={(e) => setForm({ ...form, durationMinutes: e.target.value })} />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label className="flex items-center gap-1.5"><Link2 className="w-3.5 h-3.5" /> Meeting link</Label>
              <Input value={form.meetingUrl} onChange={(e) => setForm({ ...form, meetingUrl: e.target.value })} placeholder="Paste the Google Meet / Zoom / Teams link" />
            </div>
            <div className="space-y-1.5">
              <Label>Classes (select one or more)</Label>
              <div className="rounded-lg border divide-y max-h-48 overflow-y-auto">
                {classes.map((c) => (
                  <label key={c.id} className="flex items-center gap-3 px-3 py-2 text-sm cursor-pointer hover:bg-muted/50">
                    <input type="checkbox" className="h-4 w-4" checked={form.classIds.includes(c.id)} onChange={() => toggleClass(c.id)} />
                    <span className="flex-1 truncate">{c.name}</span>
                  </label>
                ))}
              </div>
              <p className="text-xs text-muted-foreground">{form.classIds.length} selected. Everyone enrolled in these classes can see the meeting.</p>
            </div>
            <div className="space-y-1.5">
              <Label>Notes for students (optional)</Label>
              <Textarea rows={3} maxLength={2000} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} className="resize-none" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)} disabled={saving}>Close</Button>
            <Button onClick={save} disabled={saving}>{saving ? 'Saving...' : editing ? 'Save changes' : 'Schedule meeting'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!cancelTarget} onOpenChange={(o) => { if (!o) setCancelTarget(null); }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Cancel "{cancelTarget?.title}"?</DialogTitle>
            <DialogDescription>Students will be told it is cancelled and the link will be hidden from them.</DialogDescription>
          </DialogHeader>
          <div className="space-y-1.5 py-2">
            <Label>Reason (shown to students, optional)</Label>
            <Textarea rows={2} maxLength={300} value={cancelReason} onChange={(e) => setCancelReason(e.target.value)} className="resize-none" />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCancelTarget(null)} disabled={saving}>Keep meeting</Button>
            <Button variant="destructive" onClick={confirmCancel} disabled={saving}>{saving ? 'Cancelling...' : 'Cancel meeting'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
