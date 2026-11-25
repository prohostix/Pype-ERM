import { useState, useEffect } from 'react';
import { Plus, Edit, Trash2, CheckCircle, Users, Upload, Paperclip } from 'lucide-react';
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
import { ListPagination } from '@/components/ui/list-pagination';
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
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

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

  const badgeStyle = "border-none rounded-full px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider";
  const priorityColor = (p: string) => ({
    critical: `bg-red-100 text-red-700 ${badgeStyle}`,
    high: `bg-orange-100 text-orange-700 ${badgeStyle}`,
    medium: `bg-amber-100 text-amber-700 ${badgeStyle}`,
    low: `bg-[#dff3da] text-[#256c1d] ${badgeStyle}`,
  }[p] || `bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-400 ${badgeStyle}`);

  const statusColor = (s: string) => ({
    completed: `bg-[#dff3da] text-[#256c1d] ${badgeStyle}`,
    in_progress: `bg-sky-100 text-sky-700 ${badgeStyle}`,
    overdue: `bg-red-100 text-red-700 ${badgeStyle}`,
    pending: `bg-slate-200/70 text-slate-600 ${badgeStyle}`,
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
  const currentPage = Math.min(page, Math.max(1, Math.ceil(filteredTasks.length / pageSize)));
  const pagedTasks = filteredTasks.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  if (loading) return (
    <div className="rounded-3xl bg-white border border-slate-100 p-16 text-center">
      <div className="w-10 h-10 border-4 border-[#54b947]/20 border-t-[#54b947] rounded-full animate-spin mx-auto mb-4" />
      <p className="text-muted-foreground font-medium">Loading tasks...</p>
    </div>
  );

  return (
    <div className="space-y-6 wizard-form">
      <div className="flex flex-col sm:flex-row items-start justify-between gap-4">
        <div>
          <h2 className="text-2xl sm:text-3xl font-semibold tracking-tight">Task Management</h2>
          <p className="text-sm text-muted-foreground mt-1.5">Assign, track, and complete team tasks</p>
        </div>
        
        <Dialog open={dialogOpen} onOpenChange={open => { setDialogOpen(open); if (!open) resetForm(); }}>
          <DialogTrigger asChild>
            <Button className="rounded-full h-11 px-6 bg-[#8ae47e] hover:bg-[#7bd96f] text-[#0b1d14] font-semibold w-full sm:w-auto">
              <Plus className="w-4 h-4 mr-2" /> Assign Task
            </Button>
          </DialogTrigger>
          <DialogContent className="wizard-form max-w-lg border-0 rounded-[2rem] overflow-hidden p-0 bg-white" style={{ fontFamily: "Urbanist, ui-sans-serif, system-ui, sans-serif" }}>
            <div className="bg-[#f4f6f3] p-6 border-b border-slate-100 flex items-center gap-3">
              <div>
                <DialogTitle className="text-xl font-semibold tracking-tight">{editingTask ? 'Edit Task' : 'Assign New Task'}</DialogTitle>
                <p className="text-sm text-muted-foreground mt-0.5">Create a trackable objective for your team.</p>
              </div>
            </div>
            
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div className="space-y-2">
                <Label className="text-xs font-semibold text-slate-600">Task Title</Label>
                <Input className="rounded-xl h-11" value={formData.title} onChange={e => setFormData({ ...formData, title: e.target.value })} required placeholder="e.g., Prepare monthly report" />
              </div>
              
              <div className="space-y-2">
                <Label className="text-xs font-semibold text-slate-600">Description</Label>
                <Textarea className="rounded-xl resize-none" value={formData.description} onChange={e => setFormData({ ...formData, description: e.target.value })} required placeholder="Detailed task description..." rows={3} />
              </div>
              
              <div className="space-y-2">
                <Label className="text-xs font-semibold text-slate-600">Assign To</Label>
                <Select value={formData.assignedTo} onValueChange={v => setFormData({ ...formData, assignedTo: v })}>
                  <SelectTrigger className="rounded-xl h-11">
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
                  <Label className="text-xs font-semibold text-slate-600">Priority</Label>
                  <Select value={formData.priority} onValueChange={v => setFormData({ ...formData, priority: v })}>
                    <SelectTrigger className="rounded-xl h-11"><SelectValue /></SelectTrigger>
                    <SelectContent className="rounded-xl">
                      <SelectItem value="low">Low</SelectItem>
                      <SelectItem value="medium">Medium</SelectItem>
                      <SelectItem value="high">High</SelectItem>
                      <SelectItem value="critical">Critical</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label className="text-xs font-semibold text-slate-600">Deadline</Label>
                  <Input type="date" className="rounded-xl h-11" value={formData.deadline} onChange={e => setFormData({ ...formData, deadline: e.target.value })} required />
                </div>
              </div>
              
              <div className="pt-4 flex justify-end gap-2">
                <Button type="button" variant="ghost" className="rounded-full h-11 px-6" onClick={() => { setDialogOpen(false); resetForm(); }}>Cancel</Button>
                <Button type="submit" className="rounded-full h-11 px-7 bg-[#8ae47e] hover:bg-[#7bd96f] text-[#0b1d14] font-semibold" disabled={!formData.assignedTo || formData.assignedTo === '__none__'}>
                  {editingTask ? 'Update' : 'Assign'} Task
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div>
        <Tabs value={activeTab} onValueChange={(v) => { setActiveTab(v); setPage(1); }} className="space-y-6">
          <TabsList className="bg-white p-2 rounded-3xl border border-slate-100 w-fit max-w-full flex overflow-x-auto h-auto no-scrollbar justify-start gap-1.5">
            <TabsTrigger value="all" className="rounded-full px-5 py-2 text-sm font-semibold text-slate-600 data-[state=active]:bg-[#8ae47e] data-[state=active]:text-[#0b1d14] data-[state=active]:shadow-none transition-all shrink-0">All Tasks</TabsTrigger>
            <TabsTrigger value="assigned" className="rounded-full px-5 py-2 text-sm font-semibold text-slate-600 data-[state=active]:bg-[#8ae47e] data-[state=active]:text-[#0b1d14] data-[state=active]:shadow-none transition-all shrink-0">Assigned by Me</TabsTrigger>
            <TabsTrigger value="my" className="rounded-full px-5 py-2 text-sm font-semibold text-slate-600 data-[state=active]:bg-[#8ae47e] data-[state=active]:text-[#0b1d14] data-[state=active]:shadow-none transition-all shrink-0">My Tasks</TabsTrigger>
            <TabsTrigger value="pending" className="rounded-full px-5 py-2 text-sm font-semibold text-slate-600 data-[state=active]:bg-[#8ae47e] data-[state=active]:text-[#0b1d14] data-[state=active]:shadow-none transition-all shrink-0">Pending</TabsTrigger>
            <TabsTrigger value="completed" className="rounded-full px-5 py-2 text-sm font-semibold text-slate-600 data-[state=active]:bg-[#8ae47e] data-[state=active]:text-[#0b1d14] data-[state=active]:shadow-none transition-all shrink-0">Completed</TabsTrigger>
          </TabsList>

          <TabsContent value={activeTab} className="mt-0 outline-none">
            {filteredTasks.length === 0 ? (
              <div className="text-center py-16 px-4 rounded-3xl bg-white border border-slate-100">
                <div className="bg-[#eaf6e6] text-[#256c1d] w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-3">
                  <CheckCircle className="w-6 h-6" />
                </div>
                <h3 className="text-lg font-semibold text-slate-900">No tasks found</h3>
                <p className="text-sm text-muted-foreground mt-1">There are no tasks matching this filter.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {pagedTasks.map(task => {
                  const taskId = task.id || task.id || '';
                  const isAssignedByMe = task.createdBy === currentUserId;
                  const isAssignedToMe = task.assignedTo === currentUserId;
                  
                  return (
                    <div key={taskId} className="group relative flex flex-col p-5 sm:p-6 rounded-3xl bg-white border border-slate-100 hover:border-[#8ae47e] transition-colors gap-4 overflow-hidden">
                      {task.status === 'completed' && (
                        <div className="absolute left-0 top-0 bottom-0 w-1 bg-[#54b947]" />
                      )}
                      {task.status === 'overdue' && (
                        <div className="absolute left-0 top-0 bottom-0 w-1 bg-red-500" />
                      )}
                      {task.status === 'in_progress' && (
                        <div className="absolute left-0 top-0 bottom-0 w-1 bg-sky-500" />
                      )}
                      
                      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 min-w-0">
                        <div className="flex-1 min-w-0">
                          <div className="flex flex-wrap items-center gap-3 mb-2">
                            <h3 className={`font-semibold text-lg truncate ${task.status === 'completed' ? 'text-muted-foreground line-through opacity-70' : 'text-slate-900'}`}>{task.title}</h3>
                            <div className="flex items-center gap-2">
                              <Badge className={priorityColor(task.priority)}>{task.priority}</Badge>
                              <Badge className={statusColor(task.status)}>{task.status.replace('_', ' ')}</Badge>
                            </div>
                          </div>
                          
                          <p className={`text-sm leading-relaxed mb-4 ${task.status === 'completed' ? 'text-muted-foreground opacity-70' : 'text-foreground/90'}`}>
                            {task.description}
                          </p>
                          
                          <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-xs font-medium text-slate-500 bg-[#f4f6f3] px-4 py-2.5 rounded-2xl inline-flex">
                            <span className="flex items-center">
                              <span className="font-semibold opacity-70 mr-1.5">To:</span>
                              <span className="text-foreground">{task.assignee?.name || 'Unknown'}</span>
                            </span>
                            <span className="w-1 h-1 rounded-full bg-border" />
                            <span className="flex items-center">
                              <span className="font-semibold opacity-70 mr-1.5">By:</span>
                              <span className="text-foreground">{task.assigner?.name || 'Unknown'}</span>
                            </span>
                            <span className="w-1 h-1 rounded-full bg-border" />
                            <span className={`flex items-center ${task.status === 'overdue' ? 'text-red-600 font-semibold' : ''}`}>
                              <span className="font-semibold opacity-70 mr-1.5 text-muted-foreground">Due:</span>
                              {new Date(task.deadline).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                            </span>
                          </div>
                          
                          {task.remarks && (
                            <div className="mt-3 p-3.5 bg-[#f4f6f3] rounded-2xl text-sm italic text-slate-600">
                              "{task.remarks}"
                            </div>
                          )}
                          
                          {task.evidence && task.evidence.length > 0 && (
                            <div className="flex flex-wrap gap-2 mt-3 pt-3 border-t border-slate-100">
                              <span className="text-xs font-semibold text-slate-500 flex items-center mr-1">Attachments:</span>
                              {task.evidence.map((url, i) => (
                                <a
                                  key={i}
                                  href={url.startsWith('/') ? `${url}` : url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="flex items-center gap-1.5 text-xs font-semibold bg-[#eaf6e6] px-3 py-1 rounded-full text-[#256c1d] hover:bg-[#dff3da] transition-colors"
                                >
                                  <Paperclip className="w-3 h-3" /> Evidence {i + 1}
                                </a>
                              ))}
                            </div>
                          )}
                        </div>
                        
                        <div className="flex sm:flex-col items-center justify-end gap-2 shrink-0 w-full sm:w-auto mt-2 sm:mt-0">
                          {isAssignedToMe && task.status !== 'completed' && (
                            <Button variant="default" size="sm" className="h-10 w-full sm:w-auto rounded-full gap-1.5 px-5 bg-[#8ae47e] hover:bg-[#7bd96f] text-[#0b1d14] font-semibold" onClick={() => { setCompletingTask(task); setCompleteDialogOpen(true); }}>
                              <CheckCircle className="w-4 h-4" /> Complete
                            </Button>
                          )}
                          {isAssignedByMe && (
                            <div className="flex gap-2 w-full sm:w-auto">
                              <Button variant="outline" size="sm" className="h-10 flex-1 sm:flex-none rounded-full border-slate-200 bg-white hover:bg-[#eaf6e6] p-0 sm:px-4 gap-1.5" onClick={() => openEditDialog(task)}>
                                <Edit className="w-3.5 h-3.5 text-muted-foreground" /> <span className="sm:hidden">Edit</span>
                              </Button>
                              <Button variant="outline" size="sm" className="h-10 flex-1 sm:flex-none rounded-full border-red-200 bg-white hover:bg-red-50 text-red-600 p-0 sm:px-4 gap-1.5" onClick={() => handleDelete(taskId)}>
                                <Trash2 className="w-3.5 h-3.5" /> <span className="sm:hidden">Delete</span>
                              </Button>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
                <ListPagination total={filteredTasks.length} page={currentPage} pageSize={pageSize} onPageChange={setPage} onPageSizeChange={(n) => { setPageSize(n); setPage(1); }} />
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>

      {/* Complete Task Dialog */}
      <Dialog open={completeDialogOpen} onOpenChange={setCompleteDialogOpen}>
        <DialogContent className="wizard-form max-w-md border-0 rounded-[2rem] overflow-hidden p-0 bg-white" style={{ fontFamily: "Urbanist, ui-sans-serif, system-ui, sans-serif" }}>
          <div className="bg-[#f4f6f3] p-6 border-b border-slate-100 flex items-center gap-3">
            <div>
              <DialogTitle className="text-xl font-semibold tracking-tight">Complete Task</DialogTitle>
              <p className="text-sm text-muted-foreground mt-0.5">Submit your work for review.</p>
            </div>
          </div>
          
          <form onSubmit={handleComplete} className="p-6 space-y-4">
            {completingTask && (
              <div className="mb-4 p-4 bg-[#f4f6f3] rounded-2xl">
                <p className="font-bold text-foreground text-sm">{completingTask.title}</p>
                <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{completingTask.description}</p>
              </div>
            )}
            
            <div className="space-y-2">
              <Label className="text-xs font-semibold text-slate-600">Completion Remarks</Label>
              <Textarea
                className="rounded-xl resize-none"
                value={completeData.remarks}
                onChange={e => setCompleteData({ ...completeData, remarks: e.target.value })}
                placeholder="Add any notes about your completion..." rows={3}
              />
            </div>
            
            <div className="space-y-2">
              <Label className="text-xs font-semibold text-slate-600">Evidence / Attachments (optional)</Label>
              <label className="flex flex-col items-center gap-3 p-6 border-2 border-dashed border-[#cfe9c9] rounded-2xl bg-[#f4f6f3] cursor-pointer hover:bg-[#eaf6e6] hover:border-[#8ae47e] transition-colors">
                <div className="p-3 bg-white rounded-full">
                  <Upload className="w-5 h-5 text-muted-foreground" />
                </div>
                <div className="text-center">
                  <span className="text-sm font-semibold text-foreground block">
                    {completeData.files && completeData.files.length > 0
                      ? `${completeData.files.length} file(s) selected`
                      : 'Click to upload files'}
                  </span>
                  <span className="text-xs text-muted-foreground mt-1 block">PNG, JPG, PDF, DOC — max 5 files</span>
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
                <ul className="mt-3 space-y-2 bg-[#f4f6f3] p-3 rounded-2xl">
                  {Array.from(completeData.files).map((f, i) => (
                    <li key={i} className="text-xs font-medium text-slate-600 flex items-center gap-2 bg-white p-2.5 rounded-xl">
                      <Paperclip className="w-3.5 h-3.5 text-[#256c1d]" />
                      <span className="truncate flex-1">{f.name}</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
            
            <div className="pt-4 flex justify-end gap-2">
              <Button type="button" variant="ghost" className="rounded-full h-11 px-6" onClick={() => { setCompleteDialogOpen(false); setCompleteData({ remarks: '', files: null }); }}>Cancel</Button>
              <Button type="submit" className="rounded-full h-11 px-7 bg-[#8ae47e] hover:bg-[#7bd96f] text-[#0b1d14] font-semibold gap-2">
                <CheckCircle className="w-4 h-4" /> Mark Complete
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
