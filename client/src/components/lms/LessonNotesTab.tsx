import { useEffect, useState, type MutableRefObject } from 'react';
import { Bookmark, Check, Edit, Loader2, StickyNote, Trash2, X } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import type { YouTubePlayerControl } from '@/components/CustomYouTubePlayer';
import api from '@/lib/api';

const formatTimestamp = (totalSeconds: number) => {
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  const paddedSeconds = String(seconds).padStart(2, '0');
  return hours > 0
    ? `${hours}:${String(minutes).padStart(2, '0')}:${paddedSeconds}`
    : `${minutes}:${paddedSeconds}`;
};

export function LessonNotesTab({
  lessonId,
  playerControl
}: {
  lessonId: string;
  playerControl: MutableRefObject<YouTubePlayerControl | null>;
}) {
  const [notes, setNotes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [content, setContent] = useState('');
  const [saving, setSaving] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editContent, setEditContent] = useState('');

  const fetchNotes = async () => {
    try {
      const res = await api.get(`/student-portal/lessons/${lessonId}/notes`);
      setNotes(res.data.data || []);
    } catch {
      toast.error('Failed to load notes');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    setLoading(true);
    fetchNotes();
  }, [lessonId]);

  const saveNote = async (videoSeconds: number | null) => {
    setSaving(true);
    try {
      await api.post(`/student-portal/lessons/${lessonId}/notes`, { content, videoSeconds });
      setContent('');
      fetchNotes();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to save note');
    } finally {
      setSaving(false);
    }
  };

  const handleBookmark = () => {
    const time = playerControl.current?.getCurrentTime();
    if (time === undefined) {
      toast.error('Open the video to add a bookmark');
      return;
    }
    saveNote(Math.floor(time));
  };

  const handleSaveEdit = async (noteId: string) => {
    try {
      await api.put(`/student-portal/notes/${noteId}`, { content: editContent });
      setEditingId(null);
      fetchNotes();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to update note');
    }
  };

  const handleDelete = async (noteId: string) => {
    if (!confirm('Delete this note?')) return;
    try {
      await api.deleteWithoutApproval(`/student-portal/notes/${noteId}`);
      fetchNotes();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to delete note');
    }
  };

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Textarea
          rows={2}
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder="Write a private note. Only you can see it."
          aria-label="Your note"
          className="text-xs resize-none"
        />
        <div className="flex justify-end gap-2">
          <Button size="sm" variant="outline" onClick={handleBookmark} disabled={saving} className="h-8 text-xs gap-1.5">
            <Bookmark className="w-3.5 h-3.5" /> Bookmark Current Time
          </Button>
          <Button size="sm" onClick={() => saveNote(null)} disabled={saving || !content.trim()} className="h-8 text-xs gap-1.5">
            {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <StickyNote className="w-3.5 h-3.5" />}
            Save Note
          </Button>
        </div>
      </div>

      {loading ? (
        <div className="py-6 text-center text-xs text-muted-foreground">Loading notes...</div>
      ) : notes.length === 0 ? (
        <div className="text-center py-8 border border-dashed rounded-xl bg-muted/10 space-y-1">
          <StickyNote className="w-7 h-7 text-muted-foreground/30 mx-auto" />
          <p className="text-xs text-muted-foreground">No notes or bookmarks for this lesson yet.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {notes.map((note) => (
            <div key={note.id} className="rounded-xl border border-border/50 bg-card/40 p-3 flex items-start gap-2.5">
              {note.videoSeconds !== null && (
                <button
                  type="button"
                  onClick={() => playerControl.current?.seekTo(note.videoSeconds)}
                  title="Jump to this moment"
                  className="inline-flex items-center gap-1 shrink-0 px-1.5 py-0.5 rounded-md text-[11px] font-mono font-semibold bg-primary/10 text-primary hover:bg-primary/20 cursor-pointer"
                >
                  <Bookmark className="w-3 h-3" /> {formatTimestamp(note.videoSeconds)}
                </button>
              )}
              <div className="flex-1 min-w-0">
                {editingId === note.id ? (
                  <Textarea
                    rows={2}
                    value={editContent}
                    onChange={(e) => setEditContent(e.target.value)}
                    aria-label="Edit note"
                    className="text-xs resize-none"
                  />
                ) : (
                  <p className="text-xs text-foreground/90 whitespace-pre-line break-words">
                    {note.content || <span className="text-muted-foreground">Bookmark</span>}
                  </p>
                )}
              </div>
              <div className="flex items-center gap-0.5 shrink-0">
                {editingId === note.id ? (
                  <>
                    <Button variant="ghost" size="icon" onClick={() => handleSaveEdit(note.id)} className="h-7 w-7" aria-label="Save note">
                      <Check className="w-3.5 h-3.5" />
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => setEditingId(null)} className="h-7 w-7" aria-label="Cancel editing">
                      <X className="w-3.5 h-3.5" />
                    </Button>
                  </>
                ) : (
                  <>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => { setEditingId(note.id); setEditContent(note.content); }}
                      className="h-7 w-7"
                      aria-label="Edit note"
                    >
                      <Edit className="w-3.5 h-3.5" />
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => handleDelete(note.id)} className="h-7 w-7 text-red-500 hover:text-red-600" aria-label="Delete note">
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  </>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
