import { useState, useEffect } from 'react';
import { Plus, Edit, Trash2, Mail, Phone, GraduationCap, Upload, Bell, CalendarDays, ExternalLink, MessageSquare, Key, Download } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import api from '@/lib/api';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';

export function StudentsPanel() {
  const { user } = useAuth();
  const canWrite = ['org_admin', 'superadmin', 'center_admin'].includes(user?.role || '');
  const canDelete = ['org_admin', 'superadmin'].includes(user?.role || '');
  const [students, setStudents] = useState<any[]>([]);
  const [programs, setPrograms] = useState<any[]>([]);
  const [centers, setCenters] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  
  // Bulk Import State
  const [bulkDialogOpen, setBulkDialogOpen] = useState(false);
  const [bulkData, setBulkData] = useState('');
  const [bulkFormat, setBulkFormat] = useState<'csv' | 'json'>('csv');
  const [bulkProgramId, setBulkProgramId] = useState('');
  const [bulkCenterId, setBulkCenterId] = useState('__none__');
  const [bulkIsPrevious, setBulkIsPrevious] = useState(false);

  // Notification Dialog State
  const [notifDialogOpen, setNotifDialogOpen] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState<any>(null);
  const [notifType, setNotifType] = useState('fee_reminder');
  const [notifTitle, setNotifTitle] = useState('Outstanding Fee Reminder');
  const [notifMessage, setNotifMessage] = useState('');

  // WhatsApp Dialog State
  const [waDialogOpen, setWaDialogOpen] = useState(false);
  const [waStudent, setWaStudent] = useState<any>(null);
  const [waType, setWaType] = useState('fee_reminder');
  const [waMessage, setWaMessage] = useState('');

  // Payment Schedule Dialog State
  const [scheduleDialogOpen, setScheduleDialogOpen] = useState(false);
  const [scheduleStudent, setScheduleStudent] = useState<any>(null);
  const [schedules, setSchedules] = useState<any[]>([]);
  const [newSchedule, setNewSchedule] = useState({
    title: 'Tuition Fee Installment',
    amount: '',
    dueDate: ''
  });

  const [activeFilter, setActiveFilter] = useState<'all' | 'current' | 'previous'>('all');

  // Credentials Dialog State
  const [credDialogOpen, setCredDialogOpen] = useState(false);
  const [credTarget, setCredTarget] = useState<any>(null);
  const [credPassword, setCredPassword] = useState('');
  const [savingCred, setSavingCred] = useState(false);

  const handleOpenCredentials = (student: any) => {
    setCredTarget(student);
    setCredPassword(student.credentials?.password || '');
    setCredDialogOpen(true);
  };

  const handleSaveCredentials = async () => {
    if (!credTarget) return;
    setSavingCred(true);
    try {
      const updatedCreds = {
        email: credTarget.email,
        password: credPassword
      };
      await api.put(`/students/${credTarget.id}`, {
        credentials: updatedCreds
      });
      toast.success('Credentials updated successfully');
      setCredDialogOpen(false);
      fetchStudents();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to update credentials');
    } finally {
      setSavingCred(false);
    }
  };

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    address: '',
    enrollmentNo: '',
    programId: '',
    centerId: '',
    status: 'pending',
    isPrevious: false
  });

  useEffect(() => {
    fetchStudents();
    fetchPrograms();
    fetchCenters();
  }, []);

  const fetchStudents = async () => {
    setLoading(true);
    try {
      const response = await api.get('/students');
      setStudents(response.data.data || []);
    } catch (error) {
      console.error('Failed to fetch students:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchPrograms = async () => {
    try {
      const response = await api.get('/operations/programs');
      setPrograms(response.data.data || []);
    } catch (error) {
      console.error('Failed to fetch programs:', error);
    }
  };

  const fetchCenters = async () => {
    try {
      const response = await api.get('/operations/centers');
      setCenters(response.data.data || []);
    } catch (error) {
      console.error('Failed to fetch centers:', error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.programId || formData.programId.trim() === '') {
      toast.error('Please select a Program');
      return;
    }
    try {
      if (editingId) {
        await api.put(`/students/${editingId}`, formData);
        toast.success('Student updated successfully');
      } else {
        await api.post('/students', formData);
        toast.success('Student added successfully');
      }
      setDialogOpen(false);
      resetForm();
      fetchStudents();
    } catch (error: any) {
      console.error('Failed to save student:', error);
      toast.error(error.response?.data?.message || 'Failed to save student');
    }
  };

  const handleEdit = (student: any) => {
    const studentId = student.id;
    const programId = typeof student.programId === 'object' ? student.programId?.id : student.programId;
    const centerId = typeof student.centerId === 'object' ? student.centerId?.id : student.centerId;
    setEditingId(studentId);
    setFormData({
      name: student.name || '',
      email: student.email || '',
      phone: student.phone || '',
      address: student.address || '',
      enrollmentNo: student.enrollmentNo || '',
      programId: programId?.toString() || '',
      centerId: centerId?.toString() || '',
      status: student.status || 'active',
      isPrevious: student.isPrevious || false
    });
    setDialogOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this student?')) return;
    try {
      await api.delete(`/students/${id}`);
      toast.success('Student deleted successfully');
      fetchStudents();
    } catch (error) {
      console.error('Failed to delete student:', error);
      toast.error('Failed to delete student');
    }
  };

  const resetForm = () => {
    setEditingId(null);
    setFormData({
      name: '',
      email: '',
      phone: '',
      address: '',
      enrollmentNo: '',
      programId: '',
      centerId: '',
      status: 'pending',
      isPrevious: false
    });
  };

  // Download Excel Template
  const handleDownloadTemplate = async () => {
    const XLSX = await import('xlsx');
    const templateData = [
      {
        name: 'John Doe',
        email: 'john@example.com',
        phone: '9876543210',
        address: 'Mumbai, Maharashtra',
        enrollmentNo: 'PYPEER001',
        programs: 'B.Tech Computer Science',
        university: 'Delhi University',
        dob: '1999-05-15',
        session: '2024-25'
      }
    ];
    const worksheet = XLSX.utils.json_to_sheet(templateData, {
      header: ['name', 'email', 'phone', 'address', 'enrollmentNo', 'programs', 'university', 'dob', 'session']
    });
    // Set column widths
    worksheet['!cols'] = [22, 28, 14, 26, 16, 30, 26, 14, 12].map(w => ({ wch: w }));
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Students');
    XLSX.writeFile(workbook, 'students_import_template.xlsx');
    toast.success('Template downloaded!');
  };

  // Bulk Import Parser & Submitter
  const handleBulkImport = async () => {
    if (!bulkProgramId) {
      toast.error('Please select a program for the bulk import');
      return;
    }

    let parsedStudents: any[] = [];
    try {
      if (bulkFormat === 'json') {
        parsedStudents = JSON.parse(bulkData);
      } else {
        // Simple CSV Parser
        const lines = bulkData.split('\n').map(l => l.trim()).filter(Boolean);
        const headers = lines[0].split(',').map(h => h.trim().toLowerCase());
        parsedStudents = lines.slice(1).map(line => {
          const cols = line.split(',').map(c => c.trim());
          const obj: any = {};
          headers.forEach((header, index) => {
            obj[header] = cols[index] || '';
          });
          return obj;
        });
      }
    } catch (err) {
      toast.error('Invalid bulk data formatting. Please check your CSV or JSON formatting.');
      return;
    }

    if (parsedStudents.length === 0) {
      toast.error('No student records found to import.');
      return;
    }

    // Build payload; row-level programId resolved by name if present, else use selected
    const studentPayload = parsedStudents.map(s => {
      // Try matching program by name from the row
      const rowProgramName = (s.programs || s.program || '').toString().trim().toLowerCase();
      const matchedProgram = rowProgramName
        ? programs.find(p => p.name.toLowerCase() === rowProgramName)
        : null;
      const resolvedProgramId = matchedProgram?.id || bulkProgramId;

      // Center is optional
      const rowCenterName = (s.studycenter || s.study_center || s.center || '').toString().trim().toLowerCase();
      const matchedCenter = rowCenterName
        ? centers.find(c => c.name.toLowerCase() === rowCenterName)
        : null;
      const selectedCenterId = bulkCenterId && bulkCenterId !== '__none__' ? bulkCenterId : undefined;
      const resolvedCenterId = matchedCenter?.id || selectedCenterId || undefined;

      const dob = s.dob || s.dateofbirth || s.date_of_birth || '';
      const session = s.session || s.admissionsession || s.admission_session || '';

      return {
        name: s.name || s.fullname || '',
        email: s.email || '',
        phone: (s.phone || '').toString(),
        address: s.address || '',
        enrollmentNo: s.enrollmentno || s.enrollmentNo || s.enrollment_no || '',
        programId: resolvedProgramId,
        ...(resolvedCenterId ? { centerId: resolvedCenterId } : {}),
        ...(dob ? { dob: dob.toString() } : {}),
        ...(session ? { session: session.toString() } : {}),
        status: s.status || 'active',
        isPrevious: bulkIsPrevious
      };
    });

    try {
      const res = await api.post('/students/bulk-import', {
        students: studentPayload,
        isPrevious: bulkIsPrevious
      });
      toast.success(`Successfully imported ${res.data.data.imported} students! (${res.data.data.skipped} skipped)`);
      setBulkDialogOpen(false);
      setBulkData('');
      fetchStudents();
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Bulk import failed');
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const fileExtension = file.name.split('.').pop()?.toLowerCase();

    if (fileExtension === 'csv') {
      const reader = new FileReader();
      reader.onload = (event) => {
        const text = event.target?.result as string;
        setBulkData(text);
        setBulkFormat('csv');
        toast.success('CSV file loaded successfully! Review the pasted content below.');
      };
      reader.readAsText(file);
    } else if (fileExtension === 'xlsx' || fileExtension === 'xls') {
      const reader = new FileReader();
      reader.onload = async (event) => {
        try {
          const XLSX = await import('xlsx');
          const data = new Uint8Array(event.target?.result as ArrayBuffer);
          const workbook = XLSX.read(data, { type: 'array' });
          const firstSheetName = workbook.SheetNames[0];
          const worksheet = workbook.Sheets[firstSheetName];
          // Convert sheet to JSON array
          const jsonData = XLSX.utils.sheet_to_json(worksheet);
          
          if (jsonData.length === 0) {
            toast.error('No data found in the Excel sheet.');
            return;
          }
          
          // Format keys to lowercase to match our parser
          const formattedData = jsonData.map((row: any) => {
            const newRow: any = {};
            Object.keys(row).forEach(key => {
              const cleanedKey = key.trim().toLowerCase();
              newRow[cleanedKey] = row[key];
            });
            return newRow;
          });

          setBulkData(JSON.stringify(formattedData, null, 2));
          setBulkFormat('json');
          toast.success('Excel sheet loaded and converted to JSON successfully! Review the content below.');
        } catch (err) {
          console.error(err);
          toast.error('Failed to parse Excel file. Make sure it is not corrupted.');
        }
      };
      reader.readAsArrayBuffer(file);
    } else {
      toast.error('Unsupported file format. Please upload a .csv, .xlsx, or .xls file.');
    }
  };

  // Notification Handler
  const handleOpenNotif = (student: any) => {
    setSelectedStudent(student);
    setNotifType('fee_reminder');
    setNotifTitle('Outstanding Fee Reminder');
    setNotifMessage(`Dear ${student.name},\n\nThis is a friendly reminder that you have an outstanding fee installment due. Please arrange to settle it at your earliest convenience to avoid interruptions.\n\nBest regards,\nAccounts Office`);
    setNotifDialogOpen(true);
  };

  useEffect(() => {
    if (!selectedStudent) return;
    if (notifType === 'fee_reminder') {
      setNotifTitle('Outstanding Fee Reminder');
      setNotifMessage(`Dear ${selectedStudent.name},\n\nThis is a friendly reminder that you have an outstanding fee installment due. Please arrange to settle it at your earliest convenience to avoid interruptions.\n\nBest regards,\nAccounts Office`);
    } else if (notifType === 'exam') {
      setNotifTitle('Upcoming Examination Schedule');
      setNotifMessage(`Dear ${selectedStudent.name},\n\nYour upcoming term examination schedule has been published. Please log in to your portal to download the exam admit card and check the date sheet.\n\nBest regards,\nOperations Desk`);
    } else if (notifType === 'result') {
      setNotifTitle('Academic Term Results Published');
      setNotifMessage(`Dear ${selectedStudent.name},\n\nWe are pleased to inform you that your academic term results are now available. You can review them online via your student portal dashboard.\n\nBest regards,\nController of Examinations`);
    }
  }, [notifType, selectedStudent]);

  const handleSendNotification = async () => {
    if (!notifMessage.trim()) {
      toast.error('Notification message body cannot be empty');
      return;
    }
    try {
      await api.post(`/students/${selectedStudent.id}/notify`, {
        title: notifTitle,
        message: notifMessage,
        type: notifType
      });
      toast.success('System notification sent to student successfully');
      setNotifDialogOpen(false);
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to dispatch notification');
    }
  };

  // WhatsApp Dialog Handler
  const handleOpenWhatsApp = (student: any) => {
    setWaStudent(student);
    setWaType('fee_reminder');
    setWaMessage(`Hello ${student.name}, this is a reminder from Accounts regarding your outstanding fee payment. Please clear it at your earliest convenience. Thank you!`);
    setWaDialogOpen(true);
  };

  useEffect(() => {
    if (!waStudent) return;
    if (waType === 'fee_reminder') {
      setWaMessage(`Hello ${waStudent.name}, this is a reminder from Accounts regarding your outstanding fee payment. Please clear it at your earliest convenience. Thank you!`);
    } else if (waType === 'exam') {
      setWaMessage(`Hello ${waStudent.name}, your exam schedule is now published. Please visit your portal for detail datesheets. Good luck!`);
    } else if (waType === 'result') {
      setWaMessage(`Hello ${waStudent.name}, your term results are now out! Please check your portal to view your scorecard.`);
    }
  }, [waType, waStudent]);

  const handleSendWhatsApp = () => {
    if (!waStudent?.phone) {
      toast.error('This student does not have a valid phone number');
      return;
    }
    const cleanPhone = waStudent.phone.replace(/[^0-9]/g, '');
    const url = `https://wa.me/${cleanPhone.startsWith('91') || cleanPhone.length > 10 ? cleanPhone : '91' + cleanPhone}?text=${encodeURIComponent(waMessage)}`;
    window.open(url, '_blank');
    setWaDialogOpen(false);
  };

  // Payment Schedule Handlers
  const handleOpenSchedule = async (student: any) => {
    setScheduleStudent(student);
    setScheduleDialogOpen(true);
    setNewSchedule({ title: 'Tuition Fee Installment', amount: '', dueDate: '' });
    fetchSchedules(student.id);
  };

  const fetchSchedules = async (studentId: string) => {
    try {
      const res = await api.get(`/payment-schedules?studentId=${studentId}`);
      setSchedules(res.data.data || []);
    } catch (err) {
      console.error(err);
      toast.error('Failed to load payment schedules');
    }
  };

  const handleCreateSchedule = async () => {
    if (!newSchedule.amount || !newSchedule.dueDate) {
      toast.error('Please input both amount and installment due date');
      return;
    }
    try {
      await api.post('/payment-schedules', {
        studentId: scheduleStudent.id,
        ...newSchedule
      });
      toast.success('New payment milestone added successfully');
      setNewSchedule({ title: 'Tuition Fee Installment', amount: '', dueDate: '' });
      fetchSchedules(scheduleStudent.id);
    } catch (err) {
      toast.error('Failed to create payment schedule');
    }
  };

  const handleMarkPaid = async (scheduleId: string) => {
    try {
      await api.put(`/payment-schedules/${scheduleId}`, { status: 'paid' });
      toast.success('Milestone marked as paid');
      fetchSchedules(scheduleStudent.id);
    } catch (err) {
      toast.error('Failed to update schedule status');
    }
  };

  const handleDeleteSchedule = async (scheduleId: string) => {
    if (!confirm('Are you sure you want to remove this schedule milestone?')) return;
    try {
      await api.delete(`/payment-schedules/${scheduleId}`);
      toast.success('Schedule milestone removed');
      fetchSchedules(scheduleStudent.id);
    } catch (err) {
      toast.error('Failed to remove schedule');
    }
  };

  const filteredStudents = students.filter(s => {
    if (!s) return false;
    if (activeFilter === 'current') return !s.isPrevious;
    if (activeFilter === 'previous') return s.isPrevious;
    return true;
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-900 dark:text-slate-100">Student Management</h2>
          <p className="text-muted-foreground text-sm">Manage student records, bulk imports, communications, and installment schedules</p>
        </div>
        
        <div className="flex items-center gap-2">
          {canWrite && (
            <>
              {/* Bulk Import Button */}
              <Button variant="outline" onClick={() => setBulkDialogOpen(true)}>
                <Upload className="w-4 h-4 mr-2" /> Bulk Import
              </Button>

              <Dialog open={dialogOpen} onOpenChange={(open) => { setDialogOpen(open); if (!open) resetForm(); }}>
                <DialogTrigger asChild>
                  <Button><Plus className="w-4 h-4 mr-2" />Add Student</Button>
                </DialogTrigger>
                <DialogContent className="max-w-2xl">
                  <DialogHeader>
                    <DialogTitle>{editingId ? 'Edit Student Details' : 'Add New Student Record'}</DialogTitle>
                  </DialogHeader>
                  <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                      <Label>Full Name</Label>
                      <Input value={formData.name} onChange={(e) => setFormData({...formData, name: e.target.value})} required />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label>Email</Label>
                        <Input type="email" value={formData.email} onChange={(e) => setFormData({...formData, email: e.target.value})} required />
                      </div>
                      <div>
                        <Label>Phone</Label>
                        <Input value={formData.phone} onChange={(e) => setFormData({...formData, phone: e.target.value})} required />
                      </div>
                    </div>
                    <div>
                      <Label>Address</Label>
                      <Input value={formData.address} onChange={(e) => setFormData({...formData, address: e.target.value})} required />
                    </div>
                    <div>
                      <Label>Enrollment Number</Label>
                      <Input value={formData.enrollmentNo} onChange={(e) => setFormData({...formData, enrollmentNo: e.target.value})} required />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label>Program</Label>
                        <Select value={formData.programId} onValueChange={(value) => setFormData({...formData, programId: value})}>
                          <SelectTrigger><SelectValue placeholder="Select program" /></SelectTrigger>
                          <SelectContent>
                            {programs.filter(p => p && p.id).map((prog) => (
                              <SelectItem key={prog.id} value={prog.id.toString()}>
                                {prog.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label>Study Center <span className="text-muted-foreground text-xs font-normal">(optional)</span></Label>
                        <Select value={formData.centerId} onValueChange={(value) => setFormData({...formData, centerId: value === '__none__' ? '' : value})}>
                          <SelectTrigger><SelectValue placeholder="No study center" /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="__none__">— No Study Center —</SelectItem>
                            {centers.filter(c => c && c.id).map((center) => (
                              <SelectItem key={center.id} value={center.id.toString()}>
                                {center.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4 items-center">
                      <div>
                        <Label>Status</Label>
                        <Select value={formData.status} onValueChange={(value) => setFormData({...formData, status: value})}>
                          <SelectTrigger><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="pending">Pending</SelectItem>
                            <SelectItem value="active">Active</SelectItem>
                            <SelectItem value="inactive">Inactive</SelectItem>
                            <SelectItem value="completed">Completed</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="flex items-center gap-2 mt-6">
                        <input
                          type="checkbox"
                          id="isPrevious"
                          checked={formData.isPrevious}
                          onChange={(e) => setFormData({...formData, isPrevious: e.target.checked})}
                          className="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                        />
                        <Label htmlFor="isPrevious" className="cursor-pointer">Mark as Previous Student</Label>
                      </div>
                    </div>
                    <div className="flex gap-2 pt-4">
                      <Button type="submit" className="flex-1">Save</Button>
                      <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
                    </div>
                  </form>
                </DialogContent>
              </Dialog>
            </>
          )}
        </div>
      </div>

      {/* Tabs / Filtering Option */}
      <Tabs defaultValue="all" onValueChange={(val) => setActiveFilter(val as any)}>
        <TabsList>
          <TabsTrigger value="all">All Students ({students.length})</TabsTrigger>
          <TabsTrigger value="current">Current Students ({students.filter(s => s && !s.isPrevious).length})</TabsTrigger>
          <TabsTrigger value="previous">Previous Students ({students.filter(s => s && s.isPrevious).length})</TabsTrigger>
        </TabsList>
      </Tabs>

      <Card>
        <CardHeader><CardTitle>Student Directory</CardTitle></CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8">Loading students database...</div>
          ) : filteredStudents.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">No students found matching this criteria</div>
          ) : (
            <div className="space-y-3">
              {filteredStudents.map((student) => {
                const centerName = typeof student.centerId === 'object' ? student.centerId?.name : '';
                const programName = typeof student.programId === 'object' ? student.programId?.name : '';
                return (
                  <div key={student.id} className="flex items-center justify-between p-4 border rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
                        <GraduationCap className="w-6 h-6 text-blue-600 dark:text-blue-400" />
                      </div>
                      <div>
                        <div className="font-semibold text-slate-850 dark:text-slate-100 flex items-center gap-2">
                          {student.name}
                          {student.isPrevious && <Badge variant="secondary" className="text-xs">Previous</Badge>}
                        </div>
                        <div className="text-sm text-muted-foreground font-medium mt-0.5">
                          {student.enrollmentNo}{programName ? ` • ${programName}` : ''}{centerName ? ` • ${centerName}` : ''}
                        </div>
                        <div className="flex items-center gap-4 mt-2 text-xs text-slate-500">
                          <span className="flex items-center gap-1"><Mail className="w-3.5 h-3.5" /> {student.email}</span>
                          {student.phone && <span className="flex items-center gap-1"><Phone className="w-3.5 h-3.5" /> {student.phone}</span>}
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-2">
                      <Badge className="bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-200 hover:bg-slate-100">{student.status}</Badge>
                      
                      {/* Send system notification */}
                      <Button variant="outline" size="icon" className="w-8 h-8" onClick={() => handleOpenNotif(student)} title="Send Notification">
                        <Bell className="w-4 h-4 text-amber-500" />
                      </Button>

                      {/* Send WhatsApp Click to chat */}
                      <Button variant="outline" size="icon" className="w-8 h-8" onClick={() => handleOpenWhatsApp(student)} title="WhatsApp Message">
                        <MessageSquare className="w-4 h-4 text-emerald-500" />
                      </Button>

                      {/* Manage Payment Schedule */}
                      <Button variant="outline" size="icon" className="w-8 h-8" onClick={() => handleOpenSchedule(student)} title="Payment Schedule">
                        <CalendarDays className="w-4 h-4 text-indigo-500" />
                      </Button>

                      {/* View/Change Credentials */}
                      <Button variant="outline" size="icon" className="w-8 h-8" onClick={() => handleOpenCredentials(student)} title="View/Edit Credentials">
                        <Key className="w-4 h-4 text-cyan-500" />
                      </Button>

                      {canWrite && (
                        <Button variant="ghost" size="icon" className="w-8 h-8" onClick={() => handleEdit(student)}><Edit className="w-4 h-4" /></Button>
                      )}
                      {canDelete && (
                        <Button variant="ghost" size="icon" className="w-8 h-8 text-rose-500 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/20" onClick={() => handleDelete(student.id)}><Trash2 className="w-4 h-4" /></Button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Bulk Import Dialog */}
      <Dialog open={bulkDialogOpen} onOpenChange={setBulkDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Bulk Import Student Records</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Default Program <span className="text-rose-500">*</span></Label>
                <Select value={bulkProgramId} onValueChange={setBulkProgramId}>
                  <SelectTrigger><SelectValue placeholder="Select Program" /></SelectTrigger>
                  <SelectContent>
                    {programs.map(p => (
                      <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-[10px] text-muted-foreground mt-0.5">Used when no 'programs' column in file</p>
              </div>
              <div>
                <Label>Default Study Center <span className="text-muted-foreground text-xs">(optional)</span></Label>
                <Select value={bulkCenterId} onValueChange={setBulkCenterId}>
                  <SelectTrigger><SelectValue placeholder="Select Center (optional)" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">None (No Study Center)</SelectItem>
                    {centers.map(c => (
                      <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="bulkIsPrevious"
                checked={bulkIsPrevious}
                onChange={(e) => setBulkIsPrevious(e.target.checked)}
                className="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
              />
              <Label htmlFor="bulkIsPrevious" className="cursor-pointer">Mark all as Previous Students</Label>
            </div>

            <div className="border border-dashed rounded-lg p-4 bg-slate-50 dark:bg-slate-900/50 space-y-3">
              <div className="flex items-center justify-between">
                <Label className="font-medium">Upload Excel / CSV File</Label>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleDownloadTemplate}
                  className="flex items-center gap-1.5 text-xs h-7"
                >
                  <Download className="w-3.5 h-3.5" />
                  Download Template
                </Button>
              </div>
              <input
                type="file"
                accept=".xlsx,.xls,.csv"
                onChange={handleFileUpload}
                className="block w-full text-sm text-slate-500
                  file:mr-4 file:py-2 file:px-4
                  file:rounded-md file:border-0
                  file:text-sm file:font-semibold
                  file:bg-primary file:text-primary-foreground
                  hover:file:bg-primary/95
                  cursor-pointer"
              />
              <p className="text-[11px] text-muted-foreground">
                Supported: Excel (.xlsx, .xls) and CSV. Column order: <strong>name</strong>, <strong>email</strong>, <strong>phone</strong>, <strong>address</strong>, <strong>enrollmentNo</strong>, <strong>programs</strong>, <strong>university</strong>, <strong>dob</strong>, <strong>session</strong>. Study center is optional.
              </p>
            </div>

            <div>
              <Label>Or Paste CSV Data</Label>
              <Textarea
                rows={6}
                value={bulkData}
                onChange={(e) => setBulkData(e.target.value)}
                placeholder={"name,email,phone,address,enrollmentNo,programs,university,dob,session\nJohn Doe,john@example.com,9876543210,Mumbai,PYPEER001,B.Tech CS,Delhi University,1999-05-15,2024-25"}
                className="font-mono text-sm"
              />
            </div>

            <div className="flex gap-2 pt-2">
              <Button onClick={handleBulkImport} className="flex-1">Start Import Process</Button>
              <Button variant="outline" onClick={() => setBulkDialogOpen(false)}>Close</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Notifications Dialog */}
      <Dialog open={notifDialogOpen} onOpenChange={setNotifDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Send Notification — {selectedStudent?.name}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <Label>Notification Category</Label>
              <Select value={notifType} onValueChange={setNotifType}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="fee_reminder">Fee Reminder</SelectItem>
                  <SelectItem value="exam">Examination Alert</SelectItem>
                  <SelectItem value="result">Result Publication</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Message Title</Label>
              <Input value={notifTitle} onChange={(e) => setNotifTitle(e.target.value)} required />
            </div>
            <div>
              <Label>Message Body</Label>
              <Textarea rows={6} value={notifMessage} onChange={(e) => setNotifMessage(e.target.value)} required />
            </div>
            <div className="flex gap-2">
              <Button onClick={handleSendNotification} className="flex-1">Send System Notification</Button>
              <Button variant="outline" onClick={() => setNotifDialogOpen(false)}>Cancel</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* WhatsApp Dialog */}
      <Dialog open={waDialogOpen} onOpenChange={setWaDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Compose WhatsApp Message — {waStudent?.name}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <Label>Message Template</Label>
              <Select value={waType} onValueChange={setWaType}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="fee_reminder">Fee Reminder Template</SelectItem>
                  <SelectItem value="exam">Examination Alert Template</SelectItem>
                  <SelectItem value="result">Result Publication Template</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Message Text</Label>
              <Textarea rows={4} value={waMessage} onChange={(e) => setWaMessage(e.target.value)} required />
            </div>
            <div className="flex gap-2">
              <Button onClick={handleSendWhatsApp} className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white flex items-center justify-center gap-2">
                Open WhatsApp Web <ExternalLink className="w-4 h-4" />
              </Button>
              <Button variant="outline" onClick={() => setWaDialogOpen(false)}>Cancel</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Payment Schedule Dialog */}
      <Dialog open={scheduleDialogOpen} onOpenChange={setScheduleDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Payment Installment Schedule — {scheduleStudent?.name}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="border rounded-xl p-4 bg-slate-50 dark:bg-slate-900/20">
              <h4 className="font-semibold text-slate-800 dark:text-slate-200 mb-3 text-sm">Add New Installment/Milestone</h4>
              <div className="grid grid-cols-3 gap-3 items-end">
                <div>
                  <Label>Installment Title</Label>
                  <Input value={newSchedule.title} onChange={(e) => setNewSchedule({...newSchedule, title: e.target.value})} />
                </div>
                <div>
                  <Label>Amount (₹)</Label>
                  <Input type="number" value={newSchedule.amount} onChange={(e) => setNewSchedule({...newSchedule, amount: e.target.value})} />
                </div>
                <div>
                  <Label>Due Date</Label>
                  <Input type="date" value={newSchedule.dueDate} onChange={(e) => setNewSchedule({...newSchedule, dueDate: e.target.value})} />
                </div>
              </div>
              <Button size="sm" onClick={handleCreateSchedule} className="mt-4 w-full">Create Milestone</Button>
            </div>

            <div>
              <h4 className="font-semibold text-slate-800 dark:text-slate-200 mb-3 text-sm">Milestones List</h4>
              {schedules.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">No payment schedule configured for this student</p>
              ) : (
                <div className="space-y-2 max-h-60 overflow-y-auto">
                  {schedules.map((sc) => (
                    <div key={sc.id} className="flex items-center justify-between p-3 border rounded-lg text-sm bg-white dark:bg-slate-800/40">
                      <div>
                        <span className="font-semibold text-slate-700 dark:text-slate-350">{sc.title}</span>
                        <div className="text-xs text-muted-foreground mt-0.5">
                          Due: {new Date(sc.dueDate).toLocaleDateString()} • Amount: ₹{sc.amount}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant={sc.status === 'paid' ? 'default' : 'secondary'} className={sc.status === 'paid' ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400' : ''}>
                          {sc.status}
                        </Badge>
                        {sc.status !== 'paid' && (
                          <Button size="sm" variant="outline" className="h-7 px-2 text-xs" onClick={() => handleMarkPaid(sc.id)}>Mark Paid</Button>
                        )}
                        <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-rose-500 hover:text-rose-600 hover:bg-rose-50" onClick={() => handleDeleteSchedule(sc.id)}>
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* View/Edit Credentials Dialog */}
      <Dialog open={credDialogOpen} onOpenChange={setCredDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Login Credentials — {credTarget?.name}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <Label>Username (Email)</Label>
              <Input value={credTarget?.email || ''} readOnly className="bg-muted text-muted-foreground" />
            </div>
            <div>
              <Label>Password</Label>
              <Input
                type="text"
                value={credPassword}
                onChange={(e) => setCredPassword(e.target.value)}
                placeholder="Enter new password"
              />
            </div>
            <div className="flex gap-2 justify-end">
              <Button onClick={handleSaveCredentials} disabled={savingCred || !credPassword}>
                {savingCred ? 'Saving...' : 'Update Password'}
              </Button>
              <Button variant="outline" onClick={() => setCredDialogOpen(false)}>Close</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
