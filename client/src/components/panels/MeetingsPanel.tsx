import { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from '@/components/ui/dialog';
import { Plus, Video, Calendar, Clock, FileText, X, MapPin, Users, Link2, CheckCircle, Circle, Send } from 'lucide-react';
import { cn } from '@/lib/utils';
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
  type?: string;
  meetingUrl?: string | null;
  rescheduleHistory?: any[];
  followUps?: any[];
  minutes: string | null;
  createdAt: string;
}

export function MeetingsPanel() {
  const { user } = useAuth();
  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const [loading, setLoading] = useState(true);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isMinutesOpen, setIsMinutesOpen] = useState(false);
  const [isRescheduleOpen, setIsRescheduleOpen] = useState(false);
  const [selectedMeeting, setSelectedMeeting] = useState<Meeting | null>(null);

  const [rescheduleForm, setRescheduleForm] = useState({ date: '', time: '', reason: '' });
  const [followUpInputs, setFollowUpInputs] = useState<Record<string, string>>({});

  // Users list for dropdown
  const [allUsers, setAllUsers] = useState<any[]>([]);

  const [formData, setFormData] = useState({
    title: '',
    agenda: '',
    date: '',
    time: '',
    duration: '',
    type: 'offline',
    meetingUrl: '',
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
      setMeetings(res.data.data || res.data || []);
    } catch (error) {
      toast.error('Failed to fetch meetings');
    } finally {
      setLoading(false);
    }
  };

  const fetchUsers = async () => {
    try {
      const res = await api.get('/users');
      setAllUsers((res.data.data || res.data || []).filter((u: any) => u.status !== 'resigned'));
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
      setFormData({ title: '', agenda: '', date: '', time: '', duration: '', type: 'offline', meetingUrl: '', attendees: [] });
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

  const handleRescheduleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedMeeting) return;
    try {
      await api.put(`/meetings/${selectedMeeting.id}`, { 
        date: rescheduleForm.date, 
        time: rescheduleForm.time, 
        rescheduleReason: rescheduleForm.reason 
      });
      toast.success('Meeting rescheduled successfully');
      setIsRescheduleOpen(false);
      fetchMeetings();
    } catch (error) {
      toast.error('Failed to reschedule meeting');
    }
  };

  const handleAddFollowUp = async (meeting: Meeting, task: string) => {
    if (!task.trim()) return;
    try {
      const newFollowUp = { task: task.trim(), status: 'pending', createdAt: new Date().toISOString() };
      const updatedFollowUps = [...(meeting.followUps || []), newFollowUp];
      await api.put(`/meetings/${meeting.id}`, { followUps: updatedFollowUps });
      toast.success('Follow-up added');
      setFollowUpInputs(prev => ({...prev, [meeting.id]: ''}));
      fetchMeetings();
    } catch (e) {
      toast.error('Failed to add follow-up');
    }
  };

  const handleToggleFollowUp = async (meeting: Meeting, index: number) => {
    try {
      const updatedFollowUps = [...(meeting.followUps || [])];
      updatedFollowUps[index].status = updatedFollowUps[index].status === 'pending' ? 'completed' : 'pending';
      await api.put(`/meetings/${meeting.id}`, { followUps: updatedFollowUps });
      fetchMeetings();
    } catch (e) {
      toast.error('Failed to update follow-up');
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
            <Button className="shadow-lg hover:shadow-xl transition-all rounded-full px-6">
              <Plus className="w-4 h-4 mr-2" /> Call Meeting
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto p-0 border-none shadow-2xl rounded-2xl">
            <div className="bg-gradient-to-r from-primary/10 via-primary/5 to-transparent p-6 border-b border-border/50">
              <DialogHeader>
                <DialogTitle className="text-2xl font-bold flex items-center gap-2">
                  <Calendar className="w-6 h-6 text-primary" />
                  Schedule a New Meeting
                </DialogTitle>
                <DialogDescription className="text-muted-foreground mt-1 text-sm">
                  Plan your next team sync, presentation, or discussion.
                </DialogDescription>
              </DialogHeader>
            </div>
            
            <form onSubmit={handleSubmit} className="p-6 space-y-8">
              
              <div className="space-y-6">
                <div>
                  <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                    <FileText className="w-5 h-5 text-muted-foreground" /> Meeting Details
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2 md:col-span-2">
                      <Label className="text-sm font-medium">Meeting Title (Optional)</Label>
                      <Input 
                        value={formData.title}
                        onChange={e => setFormData({...formData, title: e.target.value})}
                        placeholder="E.g. Weekly Product Sync"
                        className="bg-muted/50 border-border/50 focus:bg-background transition-colors h-11"
                      />
                    </div>

                    <div className="space-y-2 md:col-span-2">
                      <Label className="text-sm font-medium">Agenda & Topics *</Label>
                      <Textarea 
                        value={formData.agenda}
                        onChange={e => setFormData({...formData, agenda: e.target.value})}
                        required
                        placeholder="What will be discussed during this meeting?"
                        className="bg-muted/50 border-border/50 focus:bg-background transition-colors min-h-[100px] resize-none"
                      />
                    </div>
                  </div>
                </div>

                <div className="border-t border-border/50 pt-6">
                  <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                    <Clock className="w-5 h-5 text-muted-foreground" /> Time & Format
                  </h3>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                    <div className="space-y-2">
                      <Label className="text-sm font-medium">Date *</Label>
                      <Input 
                        type="date"
                        value={formData.date}
                        onChange={e => setFormData({...formData, date: e.target.value})}
                        required
                        className="bg-muted/50 border-border/50 focus:bg-background h-11"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-sm font-medium">Time *</Label>
                      <Input 
                        type="time"
                        value={formData.time}
                        onChange={e => setFormData({...formData, time: e.target.value})}
                        required
                        className="bg-muted/50 border-border/50 focus:bg-background h-11"
                      />
                    </div>
                  </div>

                  <div className="space-y-4">
                    <Label className="text-sm font-medium">Meeting Type</Label>
                    <div className="grid grid-cols-2 gap-4">
                      <div 
                        className={cn(
                          "cursor-pointer rounded-xl border-2 p-4 flex flex-col items-center justify-center gap-2 transition-all",
                          formData.type === 'offline' ? "border-primary bg-primary/5 shadow-sm" : "border-border hover:border-primary/50 bg-card hover:bg-muted/50"
                        )}
                        onClick={() => setFormData({...formData, type: 'offline'})}
                      >
                        <MapPin className={cn("w-6 h-6", formData.type === 'offline' ? "text-primary" : "text-muted-foreground")} />
                        <span className={cn("font-semibold", formData.type === 'offline' ? "text-primary" : "text-foreground")}>In-Person</span>
                        <span className="text-xs text-muted-foreground text-center">Meet at the office or a physical location</span>
                      </div>
                      
                      <div 
                        className={cn(
                          "cursor-pointer rounded-xl border-2 p-4 flex flex-col items-center justify-center gap-2 transition-all",
                          formData.type === 'online' ? "border-primary bg-primary/5 shadow-sm" : "border-border hover:border-primary/50 bg-card hover:bg-muted/50"
                        )}
                        onClick={() => setFormData({...formData, type: 'online'})}
                      >
                        <Video className={cn("w-6 h-6", formData.type === 'online' ? "text-primary" : "text-muted-foreground")} />
                        <span className={cn("font-semibold", formData.type === 'online' ? "text-primary" : "text-foreground")}>Online / Virtual</span>
                        <span className="text-xs text-muted-foreground text-center">Video call via Zoom, Meet, Teams, etc.</span>
                      </div>
                    </div>
                  </div>

                  {formData.type === 'online' && (
                    <div className="mt-6 space-y-2 animate-in fade-in slide-in-from-top-2 duration-300">
                      <Label className="text-sm font-medium">Meeting URL *</Label>
                      <div className="relative">
                        <Link2 className="absolute left-3 top-3.5 w-4 h-4 text-muted-foreground" />
                        <Input 
                          value={formData.meetingUrl}
                          onChange={e => setFormData({...formData, meetingUrl: e.target.value})}
                          placeholder="https://zoom.us/j/..."
                          required
                          className="pl-10 bg-muted/50 border-border/50 focus:bg-background h-11"
                        />
                      </div>
                    </div>
                  )}
                </div>

                <div className="border-t border-border/50 pt-6">
                  <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                    <Users className="w-5 h-5 text-muted-foreground" /> Participants
                  </h3>
                  
                  <div className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label className="text-xs text-muted-foreground uppercase tracking-wider">Internal Team</Label>
                        <select 
                          className="flex h-11 w-full items-center justify-between rounded-lg border border-border/50 bg-muted/50 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 focus:bg-background transition-colors"
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
                          <option value="">Search and select...</option>
                          {allUsers.map(u => (
                            <option key={u.id} value={u.id}>{u.name} ({u.role})</option>
                          ))}
                        </select>
                      </div>
                      
                      <div className="space-y-2">
                        <Label className="text-xs text-muted-foreground uppercase tracking-wider">External Guest</Label>
                        <div className="flex gap-2">
                          <Input 
                            value={attendeeInput}
                            onChange={e => setAttendeeInput(e.target.value)}
                            placeholder="Type name & hit Add..."
                            className="bg-muted/50 border-border/50 h-11 focus:bg-background"
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') {
                                e.preventDefault();
                                handleAddExternalAttendee();
                              }
                            }}
                          />
                          <Button type="button" onClick={handleAddExternalAttendee} variant="secondary" className="h-11">Add</Button>
                        </div>
                      </div>
                    </div>

                    {formData.attendees.length > 0 && (
                      <div className="bg-muted/30 p-4 rounded-xl border border-border/40">
                        <Label className="text-xs text-muted-foreground uppercase tracking-wider mb-3 block">Invited Participants ({formData.attendees.length})</Label>
                        <div className="flex flex-wrap gap-2">
                          {formData.attendees.map((a, i) => (
                            <div key={i} className="flex items-center gap-2 bg-background border border-border/50 px-3 py-1.5 rounded-full text-sm shadow-sm animate-in fade-in zoom-in-95 duration-200">
                              <span className="w-5 h-5 rounded-full bg-primary/10 text-primary flex items-center justify-center text-[10px] font-bold">
                                {a.name.charAt(0).toUpperCase()}
                              </span>
                              <span className="font-medium text-foreground">{a.name}</span>
                              <button type="button" onClick={() => removeAttendee(i)} className="text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-full p-0.5 transition-colors ml-1">
                                <X className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-6 border-t border-border/50">
                <Button type="button" variant="ghost" onClick={() => setIsCreateOpen(false)} className="rounded-full px-6">Cancel</Button>
                <Button type="submit" className="rounded-full px-8 shadow-md">Schedule Meeting</Button>
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
                      <span className="flex items-center gap-1 capitalize px-2 py-0.5 rounded-md bg-secondary/50 text-xs border border-border">
                        {meeting.type || 'offline'}
                      </span>
                    </div>
                  </div>
                  <div className={`px-2 py-1 rounded-full text-xs font-medium ${meeting.status === 'completed' ? 'bg-green-100 text-green-700' : 'bg-blue-100 text-blue-700'}`}>
                    {meeting.status.toUpperCase()}
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-4 text-sm">
                  {meeting.type === 'online' && meeting.meetingUrl && (
                    <div className="flex items-center gap-2 p-3 bg-primary/5 border border-primary/20 rounded-lg">
                      <Video className="w-4 h-4 text-primary" />
                      <a href={meeting.meetingUrl} target="_blank" rel="noreferrer" className="text-primary hover:underline font-medium">
                        Join Meeting
                      </a>
                    </div>
                  )}
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

                  <div className="border-t border-border/50 pt-4 mt-4">
                    <h4 className="font-medium text-foreground mb-3 text-sm">Follow-up Tasks</h4>
                    <div className="space-y-2 mb-3">
                      {(meeting.followUps || []).length === 0 ? (
                        <p className="text-xs text-muted-foreground italic">No follow-ups added yet.</p>
                      ) : (
                        meeting.followUps!.map((fu: any, idx: number) => (
                          <div key={idx} className="flex items-center gap-2 text-sm bg-muted/20 p-2 rounded-md border border-border/40">
                            <button 
                              onClick={() => handleToggleFollowUp(meeting, idx)}
                              className="text-muted-foreground hover:text-primary transition-colors flex-shrink-0"
                            >
                              {fu.status === 'completed' ? <CheckCircle className="w-4 h-4 text-green-500" /> : <Circle className="w-4 h-4" />}
                            </button>
                            <span className={cn("flex-1", fu.status === 'completed' && "line-through text-muted-foreground")}>
                              {fu.task}
                            </span>
                          </div>
                        ))
                      )}
                    </div>
                    <div className="flex gap-2">
                      <Input 
                        placeholder="Add a follow-up task..."
                        value={followUpInputs[meeting.id] || ''}
                        onChange={e => setFollowUpInputs({...followUpInputs, [meeting.id]: e.target.value})}
                        className="h-8 text-sm"
                        onKeyDown={e => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            handleAddFollowUp(meeting, followUpInputs[meeting.id] || '');
                          }
                        }}
                      />
                      <Button size="sm" variant="secondary" className="h-8 px-3" onClick={() => handleAddFollowUp(meeting, followUpInputs[meeting.id] || '')}>
                        <Send className="w-3 h-3" />
                      </Button>
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
                    <div className="flex gap-2">
                      {(user?.id === meeting.hostId || user?.role === 'ceo' || user?.role === 'org_admin') && (
                        <>
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
                          <Button 
                            variant="secondary" 
                            size="sm" 
                            onClick={() => {
                              setSelectedMeeting(meeting);
                              setRescheduleForm({ date: meeting.date.split('T')[0], time: meeting.time, reason: '' });
                              setIsRescheduleOpen(true);
                            }}
                          >
                            <Clock className="w-4 h-4 mr-2" /> Reschedule
                          </Button>
                        </>
                      )}
                    </div>
                  )}

                  {meeting.rescheduleHistory && meeting.rescheduleHistory.length > 0 && (
                    <div className="mt-4 border-t border-border/50 pt-4">
                      <h4 className="font-medium text-foreground mb-2 text-xs uppercase tracking-wider text-muted-foreground">Reschedule History</h4>
                      <div className="space-y-3">
                        {meeting.rescheduleHistory.map((history: any, idx: number) => (
                          <div key={idx} className="bg-muted/30 p-3 rounded-lg border border-border/40 text-xs">
                            <div className="flex justify-between items-center mb-1">
                              <span className="font-medium">Previous: {format(new Date(history.oldDate), 'MMM d, yyyy')} at {history.oldTime}</span>
                              <span className="text-muted-foreground">{format(new Date(history.timestamp), 'MMM d, yyyy h:mm a')}</span>
                            </div>
                            <p className="text-muted-foreground"><span className="font-medium text-foreground">Reason:</span> {history.reason}</p>
                          </div>
                        ))}
                      </div>
                    </div>
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
      <Dialog open={isRescheduleOpen} onOpenChange={setIsRescheduleOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reschedule Meeting</DialogTitle>
            <DialogDescription>Select a new date and time for this meeting.</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleRescheduleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>New Date *</Label>
                <Input 
                  type="date"
                  value={rescheduleForm.date}
                  onChange={e => setRescheduleForm({...rescheduleForm, date: e.target.value})}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label>New Time *</Label>
                <Input 
                  type="time"
                  value={rescheduleForm.time}
                  onChange={e => setRescheduleForm({...rescheduleForm, time: e.target.value})}
                  required
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Reason for Rescheduling</Label>
              <Textarea 
                value={rescheduleForm.reason}
                onChange={e => setRescheduleForm({...rescheduleForm, reason: e.target.value})}
                rows={3}
                placeholder="Optional reason for rescheduling..."
              />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="outline" onClick={() => setIsRescheduleOpen(false)}>Cancel</Button>
              <Button type="submit">Confirm Reschedule</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
