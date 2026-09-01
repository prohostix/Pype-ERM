import { useState, useEffect } from 'react';
import { Plus, Edit, Trash2, CheckCircle, Users, Upload, Paperclip } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger,
} from '@/components/ui/dialog';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useAuth } from '@/hooks/useAuth';
import api from '@/lib/api';

interface Task {
  id?: string;
  title: string;
  description: string;
  assignedTo: any;
  assignedBy: any;
  departmentId?: any;
  priority: string;
  status: string;
  deadline: string;
  completedAt?: string;
  remarks?: string;
  evidence?: string[];
}

interface SubUser {
  id: string;
  name: string;
  email: string;
  designation?: string;
  role?: string;
  departmentId?: string;
}

export function TasksPanel() {
  const { user } = useAuth();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [subordinates, setSubordinates] = useState<SubUser[]>([]);
  const [loading, setLoading] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [completeDialogOpen, setCompleteDialogOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [completingTask, setCompletingTask] = useState<Task | null>(null);
  const [activeTab, setActiveTab] = useState('all');

  const [formData, setFormData] = useState({
    title: '',
    description: '',
    assignedTo: '',
    priority: 'medium',
    deadline: '',
  });

  const [completeData, setCompleteData] = useState({ remarks: '', files: null as FileList | null });

  useEffect(() => {
    fetchTasks();
    fetchSubordinates();
  }, []);

  const fetchTasks = async () => {
    setLoading(true);
    try {
      const res = await api.get('/tasks');
      setTasks(res.data.data || []);
    } catch (e) {
      console.error('Failed to fetch tasks:', e);
    } finally {
      setLoading(false);
    }
  };

  const fetchSubordinates = async () => {
    try {
      const res = await api.get('/tasks/assignable-users');
      setSubordinates(res.data.data || []);
    } catch (e) {
      console.error('Failed to fetch assignable users:', e);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.assignedTo) return;

    // Auto-derive departmentId from the selected subordinate
    const selectedUser = subordinates.find(s => s.id === formData.assignedTo);
    const payload: any = { ...formData };
    if (selectedUser?.departmentId) {
      payload.departmentId = selectedUser.departmentId;
    }

    try {
      if (editingTask) {
        await api.put(`/tasks/${editingTask.id || editingTask.id}`, payload);
      } else {
        await api.post('/tasks', payload);
      }
      setDialogOpen(false);
      resetForm();
      fetchTasks();
    } catch (e: any) {
      alert(e.response?.data?.message || 'Failed to save task.');
    }
  };

  const handleComplete = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!completingTask) return;
    try {
      const fd = new FormData();
      fd.append('remarks', completeData.remarks);
      if (completeData.files) {
        Array.from(completeData.files).forEach(f => fd.append('evidence', f));
      }
      await api.put(`/tasks/${completingTask.id || completingTask.id}/complete`, fd, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      setCompleteDialogOpen(false);
      setCompleteData({ remarks: '', files: null });
      setCompletingTask(null);
      fetchTasks();
    } catch (e: any) {
      alert(e.response?.data?.message || 'Failed to complete task.');
    }
  };

  const handleDelete = async (taskId: string) => {
    if (!confirm('Delete this task?')) return;
    try {
      await api.delete(`/tasks/${taskId}`);
      fetchTasks();
    } catch (e) {
      console.error('Failed to delete task:', e);
    }
  };

  const openEditDialog = (task: Task) => {
    setEditingTask(task);
    setFormData({
      title: task.title,
      description: task.description,
      assignedTo: task.assignedTo?.id || task.assignedTo?.id || task.assignedTo || '',
      priority: task.priority,
      deadline: task.deadline ? new Date(task.deadline).toISOString().split('T')[0] : '',
    });
    setDialogOpen(true);
  };

  const resetForm = () => {
    setFormData({ title: '', description: '', assignedTo: '', priority: 'medium', deadline: '' });
    setEditingTask(null);
  };

  const badgeStyle = "border-none rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider shadow-sm";
  const priorityColor = (p: string) => ({
    critical: `bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-400 ${badgeStyle}`,
    high: `bg-orange-100 text-orange-800 dark:bg-orange-900/40 dark:text-orange-400 ${badgeStyle}`,
    medium: `bg-yellow-100 text-yellow-800 dark:bg-yellow-900/40 dark:text-yellow-400 ${badgeStyle}`,
    low: `bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-400 ${badgeStyle}`,
  }[p] || `bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-400 ${badgeStyle}`);

  const statusColor = (s: string) => ({
    completed: `bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-400 ${badgeStyle}`,
    in_progress: `bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-400 ${badgeStyle}`,
    overdue: `bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-400 ${badgeStyle}`,
    pending: `bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-400 ${badgeStyle}`,
  }[s] || `bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-400 ${badgeStyle}`);

  const currentUserId = user?.id || (user as any)?.id;

  const filteredTasks = (() => {
    switch (activeTab) {
      case 'assigned': return tasks.filter(t => t.createdBy === currentUserId);
      case 'my': return tasks.filter(t => t.assignedTo === currentUserId);
      case 'pending': return tasks.filter(t => t.status === 'pending' || t.status === 'in_progress');
      case 'completed': return tasks.filter(t => t.status === 'completed');
      default: return tasks;
    }
  })();

  if (loading) return (
    <Card className="border border-slate-200/60 dark:border-slate-800/60 shadow-xl rounded-2xl bg-card/60 backdrop-blur-xl">
      <CardContent className="p-16 text-center">
        <div className="w-12 h-12 border-4 border-primary/20 border-t-primary rounded-full animate-spin mx-auto mb-4" />
        <p className="text-muted-foreground font-medium">Loading tasks...</p>
      </CardContent>
    </Card>
  );

  return (
    <Card className="border border-slate-200/60 dark:border-slate-800/60 shadow-xl rounded-2xl bg-card/60 backdrop-blur-xl overflow-hidden">
      <CardHeader className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-5 sm:p-6 border-b border-border/40 bg-muted/20 gap-4">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-primary/10 rounded-2xl">
            <CheckCircle className="w-6 h-6 text-primary" />
          </div>
          <div>
            <CardTitle className="text-xl font-bold">Task Management</CardTitle>
            <p className="text-sm text-muted-foreground mt-0.5">Assign, track, and complete team tasks</p>
          </div>
        </div>
        
        <Dialog open={dialogOpen} onOpenChange={open => { setDialogOpen(open); if (!open) resetForm(); }}>
          <DialogTrigger asChild>
            <Button className="rounded-xl shadow-md h-10 px-4 transition-transform hover:scale-105 active:scale-95 w-full sm:w-auto">
              <Plus className="w-4 h-4 mr-2" /> Assign Task
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg border-0 shadow-2xl rounded-3xl overflow-hidden p-0">
            <div className="bg-primary/5 p-6 border-b border-primary/10 flex items-center gap-3">
              <div className="p-2.5 bg-primary/10 rounded-2xl text-primary">
                <CheckCircle className="w-5 h-5" />
              </div>
              <div>
                <DialogTitle className="text-xl font-bold">{editingTask ? 'Edit Task' : 'Assign New Task'}</DialogTitle>
                <p className="text-sm text-muted-foreground mt-0.5">Create a trackable objective for your team.</p>
              </div>
            </div>
            
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div className="space-y-2">
                <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Task Title</Label>
                <Input className="rounded-xl h-11 shadow-sm" value={formData.title} onChange={e => setFormData({ ...formData, title: e.target.value })} required placeholder="e.g., Prepare monthly report" />
              </div>
              
              <div className="space-y-2">
                <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Description</Label>
                <Textarea className="rounded-xl shadow-sm resize-none" value={formData.description} onChange={e => setFormData({ ...formData, description: e.target.value })} required placeholder="Detailed task description..." rows={3} />
              </div>
              
              <div className="space-y-2">
                <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Assign To</Label>
                <Select value={formData.assignedTo} onValueChange={v => setFormData({ ...formData, assignedTo: v })}>
                  <SelectTrigger className="rounded-xl h-11 shadow-sm">
                    <SelectValue placeholder="Select team member" />
                  </SelectTrigger>
                  <SelectContent className="rounded-xl">
                    {subordinates.length === 0 ? (
                      <SelectItem value="__none__" disabled>No direct reports found</SelectItem>
                    ) : (
                      subordinates.map(s => (
                        <SelectItem key={s.id} value={s.id}>
                          {s.name}{s.designation ? ` — ${s.designation}` : ''}
                        </SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>
              </div>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Priority</Label>
                  <Select value={formData.priority} onValueChange={v => setFormData({ ...formData, priority: v })}>
                    <SelectTrigger className="rounded-xl h-11 shadow-sm"><SelectValue /></SelectTrigger>
                    <SelectContent className="rounded-xl">
                      <SelectItem value="low">Low</SelectItem>
                      <SelectItem value="medium">Medium</SelectItem>
                      <SelectItem value="high">High</SelectItem>
                      <SelectItem value="critical">Critical</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Deadline</Label>
                  <Input type="date" className="rounded-xl h-11 shadow-sm" value={formData.deadline} onChange={e => setFormData({ ...formData, deadline: e.target.value })} required />
                </div>
              </div>
              
              <div className="pt-4 flex justify-end gap-2">
                <Button type="button" variant="ghost" className="rounded-xl" onClick={() => { setDialogOpen(false); resetForm(); }}>Cancel</Button>
                <Button type="submit" className="rounded-xl px-6 shadow-md" disabled={!formData.assignedTo || formData.assignedTo === '__none__'}>
                  {editingTask ? 'Update' : 'Assign'} Task
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </CardHeader>

      <CardContent className="p-5 sm:p-6">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="bg-muted/40 p-1.5 rounded-xl border border-border/40 shadow-inner w-full flex overflow-x-auto h-auto no-scrollbar justify-start">
            <TabsTrigger value="all" className="rounded-lg data-[state=active]:bg-background data-[state=active]:shadow-sm px-4 py-2.5 text-xs font-bold transition-all shrink-0">All Tasks</TabsTrigger>
            <TabsTrigger value="assigned" className="rounded-lg data-[state=active]:bg-background data-[state=active]:shadow-sm px-4 py-2.5 text-xs font-bold transition-all shrink-0">Assigned by Me</TabsTrigger>
            <TabsTrigger value="my" className="rounded-lg data-[state=active]:bg-background data-[state=active]:shadow-sm px-4 py-2.5 text-xs font-bold transition-all shrink-0">My Tasks</TabsTrigger>
            <TabsTrigger value="pending" className="rounded-lg data-[state=active]:bg-background data-[state=active]:shadow-sm px-4 py-2.5 text-xs font-bold transition-all shrink-0">Pending</TabsTrigger>
            <TabsTrigger value="completed" className="rounded-lg data-[state=active]:bg-background data-[state=active]:shadow-sm px-4 py-2.5 text-xs font-bold transition-all shrink-0">Completed</TabsTrigger>
          </TabsList>

          <TabsContent value={activeTab} className="mt-0 outline-none">
            {filteredTasks.length === 0 ? (
              <div className="text-center py-16 px-4 rounded-2xl border-2 border-dashed border-border/60 bg-muted/10">
                <div className="bg-muted/50 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                  <CheckCircle className="w-8 h-8 text-muted-foreground opacity-50" />
                </div>
                <h3 className="text-lg font-bold text-foreground">No tasks found</h3>
                <p className="text-sm text-muted-foreground mt-1">There are no tasks matching this filter.</p>
              </div>
            ) : (
              <div className="space-y-4">
                {filteredTasks.map(task => {
                  const taskId = task.id || task.id || '';
                  const isAssignedByMe = task.createdBy === currentUserId;
                  const isAssignedToMe = task.assignedTo === currentUserId;
                  
                  return (
                    <div key={taskId} className="group flex flex-col p-5 border border-slate-200/60 dark:border-slate-800/60 rounded-2xl bg-card/40 hover:bg-card/80 backdrop-blur-xl shadow-sm hover:shadow-md transition-all duration-300 gap-4 overflow-hidden relative">
                      {task.status === 'completed' && (
                        <div className="absolute left-0 top-0 bottom-0 w-1 bg-emerald-500 rounded-l-2xl" />
                      )}
                      {task.status === 'overdue' && (
                        <div className="absolute left-0 top-0 bottom-0 w-1 bg-red-500 rounded-l-2xl" />
                      )}
                      {task.status === 'in_progress' && (
                        <div className="absolute left-0 top-0 bottom-0 w-1 bg-blue-500 rounded-l-2xl" />
                      )}
                      
                      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 min-w-0">
                        <div className="flex-1 min-w-0">
                          <div className="flex flex-wrap items-center gap-3 mb-2">
                            <h3 className={`font-bold text-base truncate ${task.status === 'completed' ? 'text-muted-foreground line-through opacity-70' : 'text-foreground'}`}>{task.title}</h3>
                            <div className="flex items-center gap-2">
                              <Badge className={priorityColor(task.priority)}>{task.priority}</Badge>
                              <Badge className={statusColor(task.status)}>{task.status.replace('_', ' ')}</Badge>
                            </div>
                          </div>
                          
                          <p className={`text-sm leading-relaxed mb-4 ${task.status === 'completed' ? 'text-muted-foreground opacity-70' : 'text-foreground/90'}`}>
                            {task.description}
                          </p>
                          
                          <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-[11px] font-medium text-muted-foreground bg-muted/20 p-2.5 rounded-xl border border-border/40 inline-flex">
                            <span className="flex items-center">
                              <span className="uppercase tracking-widest font-bold opacity-70 mr-1.5">To:</span>
                              <span className="text-foreground">{task.assignee?.name || 'Unknown'}</span>
                            </span>
                            <span className="w-1 h-1 rounded-full bg-border" />
                            <span className="flex items-center">
                              <span className="uppercase tracking-widest font-bold opacity-70 mr-1.5">By:</span>
                              <span className="text-foreground">{task.assigner?.name || 'Unknown'}</span>
                            </span>
                            <span className="w-1 h-1 rounded-full bg-border" />
                            <span className={`flex items-center ${task.status === 'overdue' ? 'text-red-600 dark:text-red-400 font-bold' : ''}`}>
                              <span className="uppercase tracking-widest font-bold opacity-70 mr-1.5 text-muted-foreground">Due:</span>
                              {new Date(task.deadline).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                            </span>
                          </div>
                          
                          {task.remarks && (
                            <div className="mt-3 p-3 bg-blue-50/50 dark:bg-blue-900/10 border border-blue-100 dark:border-blue-900 rounded-xl text-sm italic text-muted-foreground shadow-sm">
                              "{task.remarks}"
                            </div>
                          )}
                          
                          {task.evidence && task.evidence.length > 0 && (
                            <div className="flex flex-wrap gap-2 mt-3 pt-3 border-t border-border/40">
                              <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground flex items-center mr-1">Attachments:</span>
                              {task.evidence.map((url, i) => (
                                <a
                                  key={i}
                                  href={url.startsWith('/') ? `${url}` : url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="flex items-center gap-1.5 text-[11px] font-medium bg-background border border-border/50 shadow-sm px-2.5 py-1 rounded-md text-primary hover:bg-primary/5 transition-colors"
                                >
                                  <Paperclip className="w-3 h-3" /> Evidence {i + 1}
                                </a>
                              ))}
                            </div>
                          )}
                        </div>
                        
                        <div className="flex sm:flex-col items-center justify-end gap-2 shrink-0 w-full sm:w-auto mt-2 sm:mt-0">
                          {isAssignedToMe && task.status !== 'completed' && (
                            <Button variant="default" size="sm" className="h-9 w-full sm:w-auto rounded-xl shadow-sm gap-1.5 px-4 bg-emerald-600 hover:bg-emerald-700 text-white" onClick={() => { setCompletingTask(task); setCompleteDialogOpen(true); }}>
                              <CheckCircle className="w-4 h-4" /> Complete
                            </Button>
                          )}
                          {isAssignedByMe && (
                            <div className="flex gap-2 w-full sm:w-auto sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
                              <Button variant="outline" size="sm" className="h-9 flex-1 sm:flex-none rounded-xl shadow-sm border-slate-200 hover:bg-slate-50 p-0 sm:px-3 gap-1.5" onClick={() => openEditDialog(task)}>
                                <Edit className="w-3.5 h-3.5 text-muted-foreground" /> <span className="sm:hidden">Edit</span>
                              </Button>
                              <Button variant="outline" size="sm" className="h-9 flex-1 sm:flex-none rounded-xl shadow-sm border-red-200 hover:bg-red-50 text-red-600 p-0 sm:px-3 gap-1.5" onClick={() => handleDelete(taskId)}>
                                <Trash2 className="w-3.5 h-3.5" /> <span className="sm:hidden">Delete</span>
                              </Button>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </CardContent>

      {/* Complete Task Dialog */}
      <Dialog open={completeDialogOpen} onOpenChange={setCompleteDialogOpen}>
        <DialogContent className="max-w-md border-0 shadow-2xl rounded-3xl overflow-hidden p-0">
          <div className="bg-emerald-500/10 p-6 border-b border-emerald-500/20 flex items-center gap-3">
            <div className="p-2.5 bg-emerald-500/20 rounded-2xl text-emerald-600 dark:text-emerald-400">
              <CheckCircle className="w-5 h-5" />
            </div>
            <div>
              <DialogTitle className="text-xl font-bold">Complete Task</DialogTitle>
              <p className="text-sm text-emerald-600/70 dark:text-emerald-400/70 mt-0.5">Submit your work for review.</p>
            </div>
          </div>
          
          <form onSubmit={handleComplete} className="p-6 space-y-4">
            {completingTask && (
              <div className="mb-4 p-4 bg-muted/40 rounded-2xl border border-border/50">
                <p className="font-bold text-foreground text-sm">{completingTask.title}</p>
                <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{completingTask.description}</p>
              </div>
            )}
            
            <div className="space-y-2">
              <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Completion Remarks</Label>
              <Textarea
                className="rounded-xl shadow-sm resize-none"
                value={completeData.remarks}
                onChange={e => setCompleteData({ ...completeData, remarks: e.target.value })}
                placeholder="Add any notes about your completion..." rows={3}
              />
            </div>
            
            <div className="space-y-2">
              <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Evidence / Attachments (optional)</Label>
              <label className="flex flex-col items-center gap-3 p-6 border-2 border-dashed border-border/60 rounded-2xl bg-muted/10 cursor-pointer hover:bg-muted/30 hover:border-primary/50 transition-colors">
                <div className="p-3 bg-background rounded-full shadow-sm border border-border/50">
                  <Upload className="w-5 h-5 text-muted-foreground" />
                </div>
                <div className="text-center">
                  <span className="text-sm font-semibold text-foreground block">
                    {completeData.files && completeData.files.length > 0
                      ? `${completeData.files.length} file(s) selected`
                      : 'Click to upload files'}
                  </span>
                  <span className="text-[10px] uppercase font-bold tracking-wider text-muted-foreground mt-1 block">PNG, JPG, PDF, DOC — max 5 files</span>
                </div>
                <input
                  type="file"
                  multiple
                  accept=".png,.jpg,.jpeg,.pdf,.doc,.docx"
                  className="hidden"
                  onChange={e => setCompleteData({ ...completeData, files: e.target.files })}
                />
              </label>
              {completeData.files && completeData.files.length > 0 && (
                <ul className="mt-3 space-y-2 bg-muted/30 p-3 rounded-xl border border-border/40">
                  {Array.from(completeData.files).map((f, i) => (
                    <li key={i} className="text-xs font-medium text-muted-foreground flex items-center gap-2 bg-background p-2 rounded-lg border border-border/50 shadow-sm">
                      <Paperclip className="w-3.5 h-3.5 text-primary" />
                      <span className="truncate flex-1">{f.name}</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
            
            <div className="pt-4 flex justify-end gap-2">
              <Button type="button" variant="ghost" className="rounded-xl" onClick={() => { setCompleteDialogOpen(false); setCompleteData({ remarks: '', files: null }); }}>Cancel</Button>
              <Button type="submit" className="rounded-xl px-6 shadow-md bg-emerald-600 hover:bg-emerald-700 text-white gap-2">
                <CheckCircle className="w-4 h-4" /> Mark Complete
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
