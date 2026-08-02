import { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Plus, Video, Calendar, Clock, FileText, X } from 'lucide-react';
import { format } from 'date-fns';
import { api } from '@/lib/api';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';

interface Meeting {
  id: string;
  title: string | null;
  agenda: string;
  date: string;
  time: string;
  duration: number | null;
  hostId: string;
  host?: { name: string; email: string; id: string; role: string };
  attendees: any[];
  status: string;
  minutes: string | null;
  createdAt: string;
}

export function MeetingsPanel() {
  const { user } = useAuth();
  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const [loading, setLoading] = useState(true);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isMinutesOpen, setIsMinutesOpen] = useState(false);
  const [selectedMeeting, setSelectedMeeting] = useState<Meeting | null>(null);

  // Users list for dropdown
  const [allUsers, setAllUsers] = useState<any[]>([]);

  const [formData, setFormData] = useState({
    title: '',
    agenda: '',
    date: '',
    time: '',
    duration: '',
    attendees: [] as any[]
  });

  const [attendeeInput, setAttendeeInput] = useState('');
  const [minutesText, setMinutesText] = useState('');

  useEffect(() => {
    fetchMeetings();
    fetchUsers();
  }, []);

  const fetchMeetings = async () => {
    try {
      setLoading(true);
      const res = await api.get('/meetings');
      setMeetings(res.data);
    } catch (error) {
      toast.error('Failed to fetch meetings');
    } finally {
      setLoading(false);
    }
  };

  const fetchUsers = async () => {
    try {
      const res = await api.get('/users');
      setAllUsers(res.data);
    } catch (error) {
      console.error('Failed to fetch users', error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.post('/meetings', formData);
      toast.success('Meeting scheduled successfully');
      setIsCreateOpen(false);
      setFormData({ title: '', agenda: '', date: '', time: '', duration: '', attendees: [] });
      fetchMeetings();
    } catch (error) {
      toast.error('Failed to schedule meeting');
    }
  };

  const handleUpdateMinutes = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedMeeting) return;
    try {
      await api.put(`/meetings/${selectedMeeting.id}`, { minutes: minutesText, status: 'completed' });
      toast.success('Meeting minutes updated');
      setIsMinutesOpen(false);
      fetchMeetings();
    } catch (error) {
      toast.error('Failed to update minutes');
    }
  };

  const addAttendee = (attendee: any) => {
    setFormData(prev => ({
      ...prev,
      attendees: [...prev.attendees, attendee]
    }));
  };

  const removeAttendee = (index: number) => {
    setFormData(prev => ({
      ...prev,
      attendees: prev.attendees.filter((_, i) => i !== index)
    }));
  };

  const handleAddExternalAttendee = () => {
    if (attendeeInput.trim()) {
      addAttendee({ name: attendeeInput.trim() });
      setAttendeeInput('');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">Meetings</h2>
        <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
          <DialogTrigger asChild>
            <Button><Plus className="w-4 h-4 mr-2" /> Call Meeting</Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Schedule a Meeting</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label>Title (Optional)</Label>
                <Input 
                  value={formData.title}
                  onChange={e => setFormData({...formData, title: e.target.value})}
                  placeholder="E.g. Weekly Sync"
                />
              </div>

              <div className="space-y-2">
                <Label>Agenda *</Label>
                <Textarea 
                  value={formData.agenda}
                  onChange={e => setFormData({...formData, agenda: e.target.value})}
                  required
                  placeholder="What will be discussed?"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Date *</Label>
                  <Input 
                    type="date"
                    value={formData.date}
                    onChange={e => setFormData({...formData, date: e.target.value})}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label>Time *</Label>
                  <Input 
                    type="time"
                    value={formData.time}
                    onChange={e => setFormData({...formData, time: e.target.value})}
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label>Attendees</Label>
                <div className="flex gap-2">
                  <select 
                    className="flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                    onChange={(e) => {
                      if (e.target.value) {
                        const user = allUsers.find(u => u.id === e.target.value);
                        if (user) {
                          addAttendee({ id: user.id, name: user.name, email: user.email });
                        }
                        e.target.value = '';
                      }
                    }}
                  >
                    <option value="">Select internal user...</option>
                    {allUsers.map(u => (
                      <option key={u.id} value={u.id}>{u.name} ({u.role})</option>
                    ))}
                  </select>
                  <Input 
                    value={attendeeInput}
                    onChange={e => setAttendeeInput(e.target.value)}
                    placeholder="Or enter external name"
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleAddExternalAttendee();
                      }
                    }}
                  />
                  <Button type="button" onClick={handleAddExternalAttendee} variant="secondary">Add</Button>
                </div>
                <div className="flex flex-wrap gap-2 mt-2">
                  {formData.attendees.map((a, i) => (
                    <div key={i} className="flex items-center gap-1 bg-secondary text-secondary-foreground px-2 py-1 rounded-md text-sm">
                      {a.name}
                      <button type="button" onClick={() => removeAttendee(i)} className="text-muted-foreground hover:text-foreground">
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-4">
                <Button type="button" variant="outline" onClick={() => setIsCreateOpen(false)}>Cancel</Button>
                <Button type="submit">Schedule</Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid gap-4">
        {loading ? (
          <div className="text-center py-10 text-muted-foreground">Loading meetings...</div>
        ) : meetings.length === 0 ? (
          <div className="text-center py-10 text-muted-foreground bg-muted/20 rounded-lg border border-dashed">
            No meetings scheduled yet.
          </div>
        ) : (
          meetings.map((meeting) => (
            <Card key={meeting.id}>
              <CardHeader className="pb-2">
                <div className="flex justify-between items-start">
                  <div>
                    <CardTitle className="text-lg flex items-center gap-2">
                      <Video className="w-5 h-5 text-primary" />
                      {meeting.title || 'Untitled Meeting'}
                    </CardTitle>
                    <div className="text-sm text-muted-foreground mt-1 flex items-center gap-4">
                      <span className="flex items-center gap-1"><Calendar className="w-4 h-4" /> {format(new Date(meeting.date), 'MMM d, yyyy')}</span>
                      <span className="flex items-center gap-1"><Clock className="w-4 h-4" /> {meeting.time}</span>
                    </div>
                  </div>
                  <div className={`px-2 py-1 rounded-full text-xs font-medium ${meeting.status === 'completed' ? 'bg-green-100 text-green-700' : 'bg-blue-100 text-blue-700'}`}>
                    {meeting.status.toUpperCase()}
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-4 text-sm">
                  <div>
                    <h4 className="font-medium text-foreground mb-1">Agenda</h4>
                    <p className="text-muted-foreground whitespace-pre-wrap">{meeting.agenda}</p>
                  </div>
                  
                  <div>
                    <h4 className="font-medium text-foreground mb-1">Attendees</h4>
                    <div className="flex flex-wrap gap-2">
                      <span className="px-2 py-1 bg-primary/10 text-primary rounded-md text-xs font-medium border border-primary/20">
                        {meeting.host?.name || 'Unknown'} (Host)
                      </span>
                      {meeting.attendees?.map((a: any, i: number) => (
                        <span key={i} className="px-2 py-1 bg-secondary rounded-md text-xs border">
                          {a.name}
                        </span>
                      ))}
                    </div>
                  </div>

                  {meeting.minutes ? (
                    <div className="bg-muted p-4 rounded-md">
                      <h4 className="font-medium flex items-center gap-2 mb-2">
                        <FileText className="w-4 h-4" /> Meeting Minutes / Report
                      </h4>
                      <p className="text-muted-foreground whitespace-pre-wrap">{meeting.minutes}</p>
                    </div>
                  ) : (
                    (user?.id === meeting.hostId || user?.role === 'ceo' || user?.role === 'org_admin') && (
                      <Button 
                        variant="outline" 
                        size="sm" 
                        onClick={() => {
                          setSelectedMeeting(meeting);
                          setMinutesText('');
                          setIsMinutesOpen(true);
                        }}
                      >
                        <FileText className="w-4 h-4 mr-2" /> Add Minutes/Report
                      </Button>
                    )
                  )}
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      <Dialog open={isMinutesOpen} onOpenChange={setIsMinutesOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Meeting Minutes</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleUpdateMinutes} className="space-y-4">
            <div className="space-y-2">
              <Label>Minutes / Report</Label>
              <Textarea 
                value={minutesText}
                onChange={e => setMinutesText(e.target.value)}
                rows={5}
                required
                placeholder="Document what was discussed, decisions made, and action items..."
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => setIsMinutesOpen(false)}>Cancel</Button>
              <Button type="submit">Save Minutes</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
