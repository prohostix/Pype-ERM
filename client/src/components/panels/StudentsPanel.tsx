import { useState, useEffect } from 'react';
import { Plus, Edit, Trash2, Mail, Phone, GraduationCap, Upload, Bell, CalendarDays, ExternalLink, MessageSquare, Key, Download, User, BookOpen, Building2, FileText, ChevronRight, Search, Eye, TrendingUp, History, CreditCard, CheckSquare, Square, DollarSign, RefreshCw, X } from 'lucide-react';
import { StudentProgressTab } from '@/components/panels/StudentProgressTab';
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
import { StudentProfilePanel } from './StudentProfilePanel';

export function StudentsPanel({ triggerOpen, onOpenChange, isSalesMode }: { triggerOpen?: boolean; onOpenChange?: (open: boolean) => void; isSalesMode?: boolean } = {}) {
  const { user } = useAuth();
  const canWrite = ['org_admin', 'superadmin', 'center_admin'].includes(user?.role || '');
  const canDelete = ['org_admin', 'superadmin'].includes(user?.role || '');
  const [students, setStudents] = useState<any[]>([]);
  const [programs, setPrograms] = useState<any[]>([]);
  const [universities, setUniversities] = useState<any[]>([]);
  const [centers, setCenters] = useState<any[]>([]);
  const [sessions, setSessions] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [viewingProfileStudent, setViewingProfileStudent] = useState<any>(null);
  
  useEffect(() => {
    if (triggerOpen !== undefined) {
      setDialogOpen(triggerOpen);
      if (triggerOpen) {
        setFormStep(0);
      }
    }
  }, [triggerOpen]);

  const handleDialogOpenChange = (open: boolean) => {
    setDialogOpen(open);
    if (onOpenChange) {
      onOpenChange(open);
    }
    if (!open) {
      resetForm();
    }
  };

  const [editingId, setEditingId] = useState<string | null>(null);
  const [formStep, setFormStep] = useState(0); // 0=Admission, 1=Personal, 2=Family, 3=Documents
  
  // Bulk Import State
  const [bulkDialogOpen, setBulkDialogOpen] = useState(false);
  const [bulkData, setBulkData] = useState('');
  const [bulkFormat, setBulkFormat] = useState<'csv' | 'json'>('csv');
  const [bulkIsPrevious, setBulkIsPrevious] = useState(false);
  const [bulkErrors, setBulkErrors] = useState<string[]>([]);
  const [bulkUniversityId, setBulkUniversityId] = useState<string>('');
  const [bulkProgramId, setBulkProgramId] = useState<string>('none');
  const [bulkSessionId, setBulkSessionId] = useState<string>('none');

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
  const [searchQuery, setSearchQuery] = useState('');
  const [filterUniversityId, setFilterUniversityId] = useState('all');
  const [filterSessionId, setFilterSessionId] = useState('all');
  const [filterBranchId, setFilterBranchId] = useState('all');
  const [sortBy, setSortBy] = useState('name');

  // Pagination State
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 50;

  useEffect(() => {
    setCurrentPage(1);
  }, [activeFilter, searchQuery, filterUniversityId, filterSessionId, filterBranchId, sortBy]);

  // Credentials Dialog State
  const [credDialogOpen, setCredDialogOpen] = useState(false);
  const [credTarget, setCredTarget] = useState<any>(null);
  const [credPassword, setCredPassword] = useState('');
  const [savingCred, setSavingCred] = useState(false);

  // Enrollment History Dialog State
  const [enrollHistoryOpen, setEnrollHistoryOpen] = useState(false);
  const [enrollHistoryStudent, setEnrollHistoryStudent] = useState<any>(null);
  const [enrollHistoryData, setEnrollHistoryData] = useState<any[]>([]);
  const [enrollHistoryLoading, setEnrollHistoryLoading] = useState(false);

  // Bulk Selection State
  const [selectedStudentIds, setSelectedStudentIds] = useState<Set<string>>(new Set());
  const [bulkProgramDialogOpen, setBulkProgramDialogOpen] = useState(false);
  const [bulkPaymentDialogOpen, setBulkPaymentDialogOpen] = useState(false);
  const [bulkActionUniversityId, setBulkActionUniversityId] = useState('');
  const [bulkActionProgramId, setBulkActionProgramId] = useState('');
  const [bulkPaymentAmount, setBulkPaymentAmount] = useState('');
  const [bulkPaymentNote, setBulkPaymentNote] = useState('');
  const [bulkActionLoading, setBulkActionLoading] = useState(false);

  const isOrgAdmin = ['org_admin', 'superadmin'].includes(user?.role || '');

  const toggleStudentSelection = (id: string) => {
    setSelectedStudentIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (selectedStudentIds.size === paginatedStudents.length) {
      setSelectedStudentIds(new Set());
    } else {
      setSelectedStudentIds(new Set(paginatedStudents.map((s: any) => s.id)));
    }
  };

  const handleBulkUpdateProgram = async () => {
    if (!bulkActionUniversityId && !bulkActionProgramId) {
      toast.error('Select at least a university or program');
      return;
    }
    setBulkActionLoading(true);
    try {
      const res = await api.post('/students/bulk-update-program', {
        studentIds: Array.from(selectedStudentIds),
        universityId: bulkActionUniversityId || undefined,
        programId: bulkActionProgramId || undefined,
      });
      toast.success(res.data.message);
      setBulkProgramDialogOpen(false);
      setSelectedStudentIds(new Set());
      setBulkActionUniversityId('');
      setBulkActionProgramId('');
      fetchStudents();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to update');
    } finally {
      setBulkActionLoading(false);
    }
  };

  const handleBulkRecordPayment = async () => {
    if (!bulkPaymentAmount || isNaN(Number(bulkPaymentAmount)) || Number(bulkPaymentAmount) <= 0) {
      toast.error('Enter a valid amount');
      return;
    }
    setBulkActionLoading(true);
    try {
      const res = await api.post('/students/bulk-record-payment', {
        studentIds: Array.from(selectedStudentIds),
        amount: Number(bulkPaymentAmount),
        note: bulkPaymentNote || undefined,
      });
      toast.success(res.data.message);
      setBulkPaymentDialogOpen(false);
      setSelectedStudentIds(new Set());
      setBulkPaymentAmount('');
      setBulkPaymentNote('');
      fetchStudents();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to record payment');
    } finally {
      setBulkActionLoading(false);
    }
  };

  const STATUS_COLORS: Record<string, string> = {
    payment_pending:     'bg-orange-100 text-orange-700',
    document_review:     'bg-blue-100 text-blue-700',
    dept_review:         'bg-purple-100 text-purple-700',
    finance_review:      'bg-yellow-100 text-yellow-700',
    university_review:   'bg-indigo-100 text-indigo-700',
    enrolled:            'bg-green-100 text-green-700',
    rejected:            'bg-red-100 text-red-700',
    department_rejected: 'bg-red-100 text-red-700',
  };

  const statusLabel = (s: string) => s.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());

  const handleOpenEnrollHistory = async (student: any) => {
    setEnrollHistoryStudent(student);
    setEnrollHistoryOpen(true);
    setEnrollHistoryLoading(true);
    try {
      const res = await api.get(`/students/${student.id}/enrollments`);
      setEnrollHistoryData(res.data.data || []);
    } catch {
      toast.error('Failed to load enrollment history');
    } finally {
      setEnrollHistoryLoading(false);
    }
  };

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

  const [formData, setFormData] = useState<any>({
    // Admission
    isPrevious: false,
    branchId: '',
    universityId: '',
    programId: '',
    sessionId: '',
    enrollmentNo: '',
    admissionNo: '',
    admissionDate: '',
    status: 'pending',
    // Personal
    name: '',
    email: '',
    phone: '',
    dob: '',
    address: '',
    pinCode: '',
    altPhone: '',
    religion: '',
    caste: '',
    photo: '',
    // Family
    fatherName: '',
    fatherPhone: '',
    motherName: '',
    motherPhone: '',
    // Documents stored as array of {type, url}
    documents: [] as any[],
    receiptUrl: '',
    centerId: '',
    paymentPlan: 'full' // 'full' or 'per_year_sem'
  });



  const [branches, setBranches] = useState<any[]>([]);
  const [selectedBranchId, setSelectedBranchId] = useState<string>('');
  const [customOtherName, setCustomOtherName] = useState<string>('');
  const [salesUsers, setSalesUsers] = useState<any[]>([]);
  const [selectedSalesUserId, setSelectedSalesUserId] = useState<string>('none');

  const [progressDialogOpen, setProgressDialogOpen] = useState(false);
  const [progressDialogStudent, setProgressDialogStudent] = useState<any>(null);

  const fetchSalesUsers = async () => {
    try {
      const response = await api.get('/users');
      const allUsers = response.data.data || [];
      const salesOnly = allUsers.filter((u: any) =>
        ['sales_admin', 'sales_agent', 'bde'].includes(u.role)
      );
      setSalesUsers(salesOnly);
    } catch (err) {
      console.error('Failed to fetch sales users:', err);
    }
  };

  const fetchBranches = async () => {
    try {
      const res = await api.get('/org/branches');
      if (res.data.success) {
        setBranches(res.data.data || []);
      }
    } catch (err) {
      console.error('Failed to fetch branches:', err);
    }
  };

  useEffect(() => {
    fetchStudents();
    fetchBranches();
    fetchPrograms();
    fetchCenters();
    fetchUniversities();
    fetchSessions();
    fetchSalesUsers();
  }, [user]);

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

  const fetchUniversities = async () => {
    try {
      const response = await api.get('/operations/universities');
      setUniversities(response.data.data || []);
    } catch (error) {
      console.error('Failed to fetch universities:', error);
    }
  };

  const fetchSessions = async () => {
    try {
      const response = await api.get('/operations/sessions');
      setSessions(response.data.data || []);
    } catch (error) {
      console.error('Failed to fetch sessions:', error);
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

  // Programs filtered by selected university
  const filteredPrograms = formData.universityId
    ? programs.filter((p: any) => p.universityId === formData.universityId)
    : programs;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.programId || formData.programId.trim() === '') {
      toast.error('Please select a Program');
      return;
    }
    if (!formData.photo || formData.photo.trim() === '') {
      toast.error('Please upload a Student Photo');
      setFormStep(1); // Redirect to personal step
      return;
    }
    const requiredDocs = ['Aadhaar Card', 'SSLC Certificate', 'Plus Two Certificate'];
    const missingDocs = requiredDocs.filter(docType => {
      const doc = (formData.documents || []).find((d: any) => d.type === docType);
      return !doc || !doc.url;
    });
    if (missingDocs.length > 0) {
      toast.error(`Please upload all required documents. Missing: ${missingDocs.join(', ')}`);
      setFormStep(3); // Redirect to documents step
      return;
    }
    // Receipt is optional but we should ensure they reach step 5
    if (formStep < 4) {
      setFormStep(4);
      return;
    }
    try {
      if (editingId) {
        await api.put(`/students/${editingId}`, formData);
        toast.success('Student updated successfully');
      } else {
        const payload = { ...formData, isPipelineApplication: true };
        await api.post('/students', payload);
        toast.success('Student added successfully and sent to pipeline for review');
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
    const branchId = typeof student.branchId === 'object' ? student.branchId?.id : student.branchId;
    const sessionId = typeof student.sessionId === 'object' ? student.sessionId?.id : student.sessionId;

    // universityId can be directly on student OR inherited from the populated program object
    const universityId =
      student.universityId ||
      (typeof student.program === 'object' ? student.program?.universityId : null) ||
      (typeof student.programId === 'object' ? student.programId?.universityId : null) ||
      '';

    setEditingId(studentId);
    setFormStep(0);
    setFormData({
      isPrevious: student.isPrevious || false,
      branchId: branchId?.toString() || '',
      universityId: universityId?.toString() || '',
      programId: programId?.toString() || '',
      sessionId: sessionId?.toString() || '',
      enrollmentNo: student.enrollmentNo || '',
      admissionNo: student.admissionNo || '',
      admissionDate: student.admissionDate ? new Date(student.admissionDate).toISOString().split('T')[0] : '',
      status: student.status || 'active',
      name: student.name || '',
      email: student.email || '',
      phone: student.phone || '',
      dob: student.dob ? new Date(student.dob).toISOString().split('T')[0] : '',
      address: student.address || '',
      pinCode: student.pinCode || '',
      altPhone: student.altPhone || '',
      religion: student.religion || '',
      caste: student.caste || '',
      photo: student.photo || '',
      fatherName: student.fatherName || '',
      fatherPhone: student.fatherPhone || '',
      motherName: student.motherName || '',
      motherPhone: student.motherPhone || '',
      documents: student.documents || [],
      receiptUrl: student.receiptUrl || '',
      centerId: centerId?.toString() || '',
      paymentPlan: (student.admissionProgress as any)?.paymentPlan || 'full'
    });
    const otherDoc = (student.documents || []).find((d: any) => d.type === 'Other');
    setCustomOtherName(otherDoc?.label || '');
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
    setFormStep(0);
    setCustomOtherName('');
    setFormData({
      isPrevious: false,
      branchId: '',
      universityId: '',
      programId: '',
      enrollmentNo: '',
      admissionNo: '',
      admissionDate: '',
      status: 'pending',
      name: '',
      email: '',
      phone: '',
      dob: '',
      address: '',
      pinCode: '',
      altPhone: '',
      religion: '',
      caste: '',
      photo: '',
      fatherName: '',
      fatherPhone: '',
      motherName: '',
      motherPhone: '',
      documents: [],
      receiptUrl: '',
      centerId: ''
    });
  };

  const renderFeeDisplay = () => {
    const selectedProgramObj = filteredPrograms.find((p: any) => p.id === formData.programId);
    const relevantFeeStructure = selectedProgramObj?.feeStructures?.[0];

    if (!relevantFeeStructure) return null;

    let periodName = '';
    let amount = 0;
    
    if (formData.paymentPlan === 'full') {
      periodName = 'One Time (Full Payment)';
      if (Array.isArray(relevantFeeStructure.yearlyFees) && relevantFeeStructure.yearlyFees.length > 0) {
        amount = relevantFeeStructure.yearlyFees.reduce((acc: number, yf: any) => {
          return acc + Number(yf.tuitionFee || 0) + Number(yf.registrationFee || 0) + Number(yf.examFee || 0);
        }, 0);
      } else {
        amount = Number(relevantFeeStructure.tuitionFee || 0) + Number(relevantFeeStructure.registrationFee || 0) + Number(relevantFeeStructure.examFee || 0);
      }
    } else {
      if (relevantFeeStructure.billingCycle === 'per_year') {
        periodName = 'First Year';
        if (Array.isArray(relevantFeeStructure.yearlyFees) && relevantFeeStructure.yearlyFees.length > 0) {
          amount = Number(relevantFeeStructure.yearlyFees[0].tuitionFee || 0) + 
                   Number(relevantFeeStructure.yearlyFees[0].registrationFee || 0) + 
                   Number(relevantFeeStructure.yearlyFees[0].examFee || 0);
        } else {
          amount = Number(relevantFeeStructure.tuitionFee || 0) + Number(relevantFeeStructure.registrationFee || 0) + Number(relevantFeeStructure.examFee || 0);
        }
      } else if (relevantFeeStructure.billingCycle === 'per_semester') {
        periodName = 'First Semester';
        if (Array.isArray(relevantFeeStructure.yearlyFees) && relevantFeeStructure.yearlyFees.length > 0) {
          amount = Number(relevantFeeStructure.yearlyFees[0].tuitionFee || 0) + 
                   Number(relevantFeeStructure.yearlyFees[0].registrationFee || 0) + 
                   Number(relevantFeeStructure.yearlyFees[0].examFee || 0);
        } else {
          amount = Number(relevantFeeStructure.tuitionFee || 0) + Number(relevantFeeStructure.registrationFee || 0) + Number(relevantFeeStructure.examFee || 0);
        }
      } else {
        periodName = 'One Time';
        amount = Number(relevantFeeStructure.tuitionFee || 0) + Number(relevantFeeStructure.registrationFee || 0) + Number(relevantFeeStructure.examFee || 0);
      }
    }

    return (
      <div className="mt-4 p-3 rounded-lg border border-primary/20 bg-primary/5 flex items-center justify-between">
        <div>
          <h4 className="font-medium text-primary text-sm">Initial Fee Payable ({periodName})</h4>
          <p className="text-xs text-muted-foreground">Based on {relevantFeeStructure.billingCycle.replace('_', ' ')} billing</p>
        </div>
        <div className="text-lg font-bold text-primary">
          {relevantFeeStructure.currency || 'INR'} {amount.toLocaleString()}
        </div>
      </div>
    );
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
        dob: '1999-05-15',
        session: '2024-25',
        admissionDate: '2024-08-01',
        studyCenter: ''
      }
    ];
    const worksheet = XLSX.utils.json_to_sheet(templateData, {
      header: ['name', 'email', 'phone', 'address', 'enrollmentNo', 'programs', 'dob', 'session', 'admissionDate', 'studyCenter']
    });
    // Set column widths
    worksheet['!cols'] = [22, 28, 14, 26, 16, 30, 14, 12, 16, 26].map(w => ({ wch: w }));
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Students');
    XLSX.writeFile(workbook, 'students_import_template.xlsx');
    toast.success('Template downloaded!');
  };

  // Bulk Import Parser & Submitter
  const handleBulkImport = async () => {
    if (branches.length > 0 && !selectedBranchId) {
      toast.error('Please select a branch to upload these students to.');
      return;
    }
    let parsedStudents: any[] = [];
    try {
      if (bulkFormat === 'json') {
        parsedStudents = JSON.parse(bulkData);
      } else {
        // RFC-4180 compliant CSV parser that handles quoted fields containing commas
        const parseCSVLine = (line: string): string[] => {
          const result: string[] = [];
          let current = '';
          let inQuotes = false;
          for (let i = 0; i < line.length; i++) {
            const char = line[i];
            if (char === '"') {
              if (inQuotes && line[i + 1] === '"') {
                current += '"'; i++; // escaped quote
              } else {
                inQuotes = !inQuotes;
              }
            } else if (char === ',' && !inQuotes) {
              result.push(current.trim());
              current = '';
            } else {
              current += char;
            }
          }
          result.push(current.trim());
          return result;
        };
        const lines = bulkData.split('\n').map(l => l.trim()).filter(Boolean);
        const headers = parseCSVLine(lines[0]).map(h => h.toLowerCase());
        parsedStudents = lines.slice(1).map(line => {
          const cols = parseCSVLine(line);
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

    if (!bulkUniversityId) {
      toast.error('Please select a University from the dropdown before importing.');
      return;
    }

    const matchedUniv = universities.find(u => u.id === bulkUniversityId) || null;

    // Build payload — all data comes from the Excel/CSV file
    const studentPayload = parsedStudents.map(s => {
      // Match program by code first, then by name combined with university name if provided, then by name alone.
      const rowProgramName = (s.programme || s.programs || s.program || '').toString().trim().toLowerCase();
      const rowUnivName = (s.university || '').toString().trim().toLowerCase();

      let matchedProgram: any = null;
      if (rowProgramName) {
        let univPrograms = programs;
        if (matchedUniv) {
          univPrograms = programs.filter(p => p.universityId === matchedUniv.id);
        } else if (rowUnivName) {
          univPrograms = programs.filter(p => 
            p.university?.name?.toLowerCase()?.includes(rowUnivName) || 
            p.university?.code?.toLowerCase()?.includes(rowUnivName)
          );
        }
        
        const cleanStr = (str: string) => str.toLowerCase().replace(/[^a-z0-9]/g, '');
        const cleanRowProg = cleanStr(rowProgramName);

        // 1. Try finding by exact code match in scoped programs
        matchedProgram = univPrograms.find(p => p.code?.toLowerCase() === rowProgramName);
        
        // 2. If not found, try matching by name
        if (!matchedProgram) {
          matchedProgram = univPrograms.find(p => p.name.toLowerCase() === rowProgramName);
        }

        // 3. Fuzzy match (ignore punctuation/spaces) in scoped programs
        if (!matchedProgram) {
          matchedProgram = univPrograms.find(p => cleanStr(p.name) === cleanRowProg || (p.code && cleanStr(p.code) === cleanRowProg));
        }

        // 4. Prefix match in scoped programs (e.g., 'mba' matches 'mba (mizoram)')
        if (!matchedProgram && rowProgramName.length > 1) {
          matchedProgram = univPrograms.find(p => {
             const pName = p.name.toLowerCase();
             return pName.startsWith(rowProgramName + ' ') || pName.startsWith(rowProgramName + '(') || pName.startsWith(rowProgramName + '-');
          });
        }

        // 5. Fallback to global search if univ was not matched
        if (!matchedProgram && rowUnivName && !matchedUniv) {
          matchedProgram = programs.find(p => 
            p.name.toLowerCase() === rowProgramName && 
            (p.university?.name?.toLowerCase()?.includes(rowUnivName) ?? false)
          );
        }
        
        // 6. Absolute fallbacks (scoped to the selected university)
        if (!matchedProgram) {
          matchedProgram = univPrograms.find(p => p.name.toLowerCase() === rowProgramName || p.code?.toLowerCase() === rowProgramName);
        }
        if (!matchedProgram) {
          matchedProgram = univPrograms.find(p => cleanStr(p.name) === cleanRowProg || (p.code && cleanStr(p.code) === cleanRowProg));
        }
        if (!matchedProgram && rowProgramName.length > 1) {
          matchedProgram = univPrograms.find(p => {
             const pName = p.name.toLowerCase();
             return pName.startsWith(rowProgramName + ' ') || pName.startsWith(rowProgramName + '(') || pName.startsWith(rowProgramName + '-');
          });
        }
      }
      const resolvedProgramId = matchedProgram?.id || '';

      // Center is optional — match by name from the row
      const rowCenterName = (s.studycenter || s.study_center || s.center || '').toString().trim().toLowerCase();
      const matchedCenter = rowCenterName
        ? centers.find(c => c.name.toLowerCase() === rowCenterName)
        : null;
      const resolvedCenterId = matchedCenter?.id || undefined;

      const dob = s.dob || s.dateofbirth || s.date_of_birth || '';
      
      // Match Session strictly to the university if possible
      const sessionStr = (s.session || s.admissionsession || s.admission_session || '').toString().trim().toLowerCase();
      let matchedSession = null;
      if (sessionStr) {
        let univSessions = sessions;
        if (matchedUniv) {
          univSessions = sessions.filter(sess => !sess.universityId || sess.universityId === matchedUniv.id);
        }
        matchedSession = univSessions.find(sess => sess.name.toLowerCase() === sessionStr);
        if (!matchedSession) {
          matchedSession = sessions.find(sess => sess.name.toLowerCase() === sessionStr);
        }
      }
      const resolvedSessionId = matchedSession?.id || undefined;
      const admissionDate = s.admissiondate || s.admission_date || s.dateofadmission || s.date_of_admission || '';

      return {
        name: s.name || s.fullname || '',
        email: s.email || '',
        phone: (s.phone || '').toString(),
        address: s.address || '',
        enrollmentNo: (s.enrollmentno || s.enrollmentNo || s.enrollment_no || s['enrollment no'] || s['enrollment no.'] || s['enrollmentno.'] || s.enrollment || s.entrollment || s.entrollmentno || s.entrollment_no || s.enrollmentnumber || s['enrollment number'] || s.enrollno || s['enroll no'] || s.enrollnumber || s['enroll number'] || s.regno || s.reg_no || s['reg no'] || s.registration || s.registration_no || s['registration no'] || '').toString().trim(),
        programId: (bulkProgramId && bulkProgramId !== 'none') ? bulkProgramId : resolvedProgramId,
        ...(resolvedCenterId ? { centerId: resolvedCenterId } : {}),
        ...(dob ? { dob: dob.toString() } : {}),
        ...((bulkSessionId && bulkSessionId !== 'none') ? { sessionId: bulkSessionId } : (resolvedSessionId ? { sessionId: resolvedSessionId } : (sessionStr ? { session: sessionStr } : {}))),
        ...(admissionDate ? { admissionDate: admissionDate.toString() } : {}),
        status: s.status || 'active',
        isPrevious: bulkIsPrevious
      };
    });

    // Warn if any rows couldn't match a program
    const unresolved = studentPayload.filter(s => !s.programId);
    if (unresolved.length > 0) {
      const names = unresolved.map(s => s.name || '(no name)').join(', ');
      toast.error(`${unresolved.length} row(s) have an unrecognized program: ${names}. Check the 'programs' column.`);
      return;
    }

    setBulkErrors([]);
    try {
      const res = await api.post('/students/bulk-import', {
        students: studentPayload,
        isPrevious: bulkIsPrevious,
        branchId: selectedBranchId || undefined,
        salesUserId: selectedSalesUserId === 'none' ? undefined : selectedSalesUserId
      });
      const { imported, skipped, errors } = res.data.data;
      if (skipped > 0 && errors?.length > 0) {
        setBulkErrors(errors);
        toast.warning(`Imported ${imported} student(s). ${skipped} row(s) had issues — see details below.`);
      } else {
        toast.success(`Successfully imported ${imported} student(s)!`);
        setBulkDialogOpen(false);
        setBulkData('');
      }
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

  const handleOpenProgress = (student: any) => {
    setProgressDialogStudent(student);
    setProgressDialogOpen(true);
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
    
    // Status filter
    if (activeFilter === 'current' && s.isPrevious) return false;
    if (activeFilter === 'previous' && !s.isPrevious) return false;

    // Search query filter
    if (searchQuery.trim() !== '') {
      const q = searchQuery.toLowerCase();
      const nameMatch = s.name?.toLowerCase().includes(q);
      const emailMatch = s.email?.toLowerCase().includes(q);
      const enrollMatch = s.enrollmentNo?.toLowerCase().includes(q);
      const centerName = typeof s.centerId === 'object' ? s.centerId?.name?.toLowerCase() : '';
      const centerMatch = centerName?.includes(q);
      if (!nameMatch && !emailMatch && !enrollMatch && !centerMatch) return false;
    }

    // University Filter
    if (filterUniversityId !== 'all') {
      const uId = s.universityId ||
        (typeof s.program === 'object' ? s.program?.universityId : null) ||
        (typeof s.programId === 'object' ? s.programId?.universityId : null);
      if (uId !== filterUniversityId) return false;
    }

    // Branch Filter
    if (filterBranchId !== 'all') {
      const bId = typeof s.branchId === 'object' ? s.branchId?.id : s.branchId;
      if (bId !== filterBranchId) return false;
    }

    // Session Filter
    if (filterSessionId !== 'all') {
      const sId = typeof s.sessionId === 'object' ? s.sessionId?.id : s.sessionId;
      // also fallback to match session name if s.session string is present and sessionId is not object
      if (sId !== filterSessionId) {
        // If sId is not present, check if s.session string matches the selected session name
        const selectedSession = sessions.find((sess: any) => sess.id === filterSessionId);
        if (selectedSession && s.session) {
          if (String(s.session).toLowerCase() !== String(selectedSession.name).toLowerCase()) {
            return false;
          }
        } else {
          return false;
        }
      }
    }

    return true;
  }).sort((a, b) => {
    if (sortBy === 'branch') {
      const branchA = (typeof a.branchId === 'object' ? a.branchId?.name : a.branch?.name) || '';
      const branchB = (typeof b.branchId === 'object' ? b.branchId?.name : b.branch?.name) || '';
      return branchA.localeCompare(branchB);
    } else if (sortBy === 'enrollmentNo') {
      const enA = a.enrollmentNo || '';
      const enB = b.enrollmentNo || '';
      return enA.localeCompare(enB);
    } else {
      // Default to sorting by name
      const nameA = a.name || '';
      const nameB = b.name || '';
      return nameA.localeCompare(nameB);
    }
  });

  const totalPages = Math.max(1, Math.ceil(filteredStudents.length / itemsPerPage));
  const paginatedStudents = filteredStudents.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  if (triggerOpen !== undefined) {
    return (
      <Dialog open={dialogOpen} onOpenChange={handleDialogOpenChange}>
        <DialogContent className="max-w-3xl max-h-[92vh] flex flex-col">
          <DialogHeader className="pb-2 border-b">
            <DialogTitle className="text-lg">{editingId ? 'Edit Student Record' : 'Add New Student Record'}</DialogTitle>
            {/* Step indicator */}
            <div className="flex items-center gap-1 pt-2">
              {['Admission Info', 'Personal Details', 'Family Info', 'Documents', 'Payment Receipt'].map((step, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => setFormStep(i)}
                  className={`flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
                    formStep === i
                      ? 'bg-primary text-primary-foreground shadow'
                      : 'bg-slate-100 dark:bg-slate-800 text-muted-foreground hover:bg-slate-200 dark:hover:bg-slate-700'
                  }`}
                >
                  {i === 0 && <BookOpen className="w-3 h-3" />}
                  {i === 1 && <User className="w-3 h-3" />}
                  {i === 2 && <Building2 className="w-3 h-3" />}
                  {i === 3 && <FileText className="w-3 h-3" />}
                  {i === 4 && <CreditCard className="w-3 h-3" />}
                  {step}
                </button>
              ))}
            </div>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="flex flex-col flex-1 min-h-0 overflow-hidden">
            <div className="flex-1 overflow-y-auto pr-2 max-h-[60vh] space-y-4 py-3">

              {/* ── STEP 0: ADMISSION INFO ── */}
              {formStep === 0 && (
                <div className="space-y-4">
                  {/* Previous student toggle - only show for non-sales admins */}
                  {!isSalesMode && !['sales_admin', 'sales_agent', 'bde'].includes(user?.role || '') && (
                    <div className="flex items-center gap-3 p-3 rounded-xl border border-amber-200 bg-amber-50 dark:bg-amber-950/20 dark:border-amber-900">
                      <input
                        type="checkbox"
                        id="isPreviousMain"
                        checked={formData.isPrevious}
                        onChange={(e) => setFormData({...formData, isPrevious: e.target.checked})}
                        className="w-4 h-4 rounded border-slate-300 accent-amber-600"
                      />
                      <div>
                        <Label htmlFor="isPreviousMain" className="cursor-pointer font-semibold text-amber-800 dark:text-amber-400">Mark as Previous Student</Label>
                        <p className="text-xs text-amber-700 dark:text-amber-500 mt-0.5">Enable this for students admitted before the system was set up</p>
                      </div>
                    </div>
                  )}

                  {/* Branch & University */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {!isSalesMode && !['sales_admin', 'sales_agent', 'bde'].includes(user?.role || '') ? (
                      <>
                        <div>
                          <Label className="font-medium">Branch <span className="text-xs text-muted-foreground font-normal">(optional)</span></Label>
                          <Select value={formData.branchId} onValueChange={(v) => setFormData({...formData, branchId: v === '__none__' ? '' : v})}>
                            <SelectTrigger><SelectValue placeholder="Select branch..." /></SelectTrigger>
                            <SelectContent>
                              <SelectItem value="__none__">— No Branch —</SelectItem>
                              {branches.filter((b: any) => b && b.id).map((b: any) => (
                                <SelectItem key={b.id} value={b.id}>{b.name} ({b.code})</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div>
                          <Label className="font-medium">University *</Label>
                          <Select value={formData.universityId} onValueChange={(v) => setFormData({...formData, universityId: v, programId: ''})}>
                            <SelectTrigger><SelectValue placeholder="Select university..." /></SelectTrigger>
                            <SelectContent>
                              {universities.filter((u: any) => u && u.id).map((u: any) => (
                                <SelectItem key={u.id} value={u.id}>{u.name}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      </>
                    ) : (
                      <div className="col-span-2">
                        <Label className="font-medium">University *</Label>
                        <Select value={formData.universityId} onValueChange={(v) => setFormData({...formData, universityId: v, programId: ''})}>
                          <SelectTrigger><SelectValue placeholder="Select university..." /></SelectTrigger>
                          <SelectContent>
                            {universities.filter((u: any) => u && u.id).map((u: any) => (
                              <SelectItem key={u.id} value={u.id}>{u.name}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    )}
                  </div>

                  {/* Program & Session */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <Label className="font-medium">Program *</Label>
                      <Select value={formData.programId} onValueChange={(v) => setFormData({...formData, programId: v})} disabled={!formData.universityId}>
                        <SelectTrigger>
                          <SelectValue placeholder={formData.universityId ? 'Select program...' : 'Select a university first'} />
                        </SelectTrigger>
                        <SelectContent>
                          {filteredPrograms.filter((p: any) => p && p.id).map((p: any) => (
                            <SelectItem key={p.id} value={p.id}>{p.name} {p.code ? `(${p.code})` : ''}</SelectItem>
                          ))}
                          {filteredPrograms.length === 0 && (
                            <div className="px-3 py-2 text-sm text-muted-foreground">No programs found for this university</div>
                          )}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label className="font-medium">Session <span className="text-xs text-muted-foreground font-normal">(optional)</span></Label>
                      <Select value={formData.sessionId} onValueChange={(v) => setFormData({...formData, sessionId: v === '__none__' ? '' : v})} disabled={!formData.programId}>
                        <SelectTrigger><SelectValue placeholder={formData.programId ? "Select session..." : "Select program first"} /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="__none__">— No Session —</SelectItem>
                          {sessions.filter((s: any) => s && s.id && s.programId === formData.programId).map((s: any) => (
                            <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  {/* Payment Plan & Fee */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4">
                    <div>
                      <Label className="font-medium">Payment Plan *</Label>
                      <Select value={formData.paymentPlan} onValueChange={(v) => setFormData({...formData, paymentPlan: v})}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="full">Full (One Time)</SelectItem>
                          <SelectItem value="per_year_sem">Per Year / Semester</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  {renderFeeDisplay()}

                  {/* Enrollment & Admission Numbers */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <Label className="font-medium">Enrollment Number <span className="text-xs text-muted-foreground font-normal">(optional)</span></Label>
                      <Input
                        placeholder="e.g. PYPEER001"
                        value={formData.enrollmentNo}
                        onChange={(e) => setFormData({...formData, enrollmentNo: e.target.value})}
                      />
                    </div>
                    {editingId && (
                      <div>
                        <Label className="font-medium">Admission Number</Label>
                        <Input
                          placeholder="Auto-generated on save"
                          value={formData.admissionNo || ''}
                          readOnly
                          className="bg-slate-50 cursor-not-allowed text-muted-foreground"
                        />
                      </div>
                    )}
                  </div>

                  {/* Admission Date & Status */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <Label className="font-medium">Admission Date</Label>
                      <Input
                        type="date"
                        value={formData.admissionDate}
                        onChange={(e) => setFormData({...formData, admissionDate: e.target.value})}
                      />
                    </div>
                    {editingId && (
                      <div>
                        <Label className="font-medium">Status</Label>
                        <Select value={formData.status} onValueChange={(v) => setFormData({...formData, status: v})}>
                          <SelectTrigger><SelectValue placeholder="Select status..." /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="active">Active</SelectItem>
                            <SelectItem value="pending">Pending</SelectItem>
                            <SelectItem value="completed">Completed</SelectItem>
                            <SelectItem value="dropped">Dropped</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* ── STEP 1: PERSONAL DETAILS ── */}
              {formStep === 1 && (
                <div className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <Label className="font-medium">Full Name *</Label>
                      <Input
                        placeholder="Student's name"
                        value={formData.name}
                        onChange={(e) => setFormData({...formData, name: e.target.value})}
                        required
                      />
                    </div>
                    <div>
                      <Label className="font-medium">Email Address *</Label>
                      <Input
                        type="email"
                        placeholder="student@example.com"
                        value={formData.email}
                        onChange={(e) => setFormData({...formData, email: e.target.value})}
                        required
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <Label className="font-medium">Phone Number *</Label>
                      <Input
                        placeholder="Primary phone"
                        value={formData.phone}
                        onChange={(e) => setFormData({...formData, phone: e.target.value})}
                        required
                      />
                    </div>
                    <div>
                      <Label className="font-medium">Date of Birth *</Label>
                      <Input
                        type="date"
                        value={formData.dob}
                        onChange={(e) => setFormData({...formData, dob: e.target.value})}
                        required
                      />
                    </div>
                  </div>

                  <div>
                    <Label className="font-medium">Home Address *</Label>
                    <Textarea
                      placeholder="Permanent address"
                      value={formData.address}
                      onChange={(e) => setFormData({...formData, address: e.target.value})}
                      required
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <Label className="font-medium">Pincode *</Label>
                      <Input
                        placeholder="6-digit pincode"
                        value={formData.pinCode}
                        onChange={(e) => setFormData({...formData, pinCode: e.target.value})}
                        required
                      />
                    </div>
                    <div>
                      <Label className="font-medium">Alternative Phone</Label>
                      <Input
                        placeholder="Secondary phone"
                        value={formData.altPhone}
                        onChange={(e) => setFormData({...formData, altPhone: e.target.value})}
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <Label className="font-medium">Religion</Label>
                      <Input
                        placeholder="e.g. Christian, Hindu, Muslim"
                        value={formData.religion}
                        onChange={(e) => setFormData({...formData, religion: e.target.value})}
                      />
                    </div>
                    <div>
                      <Label className="font-medium">Caste / Category</Label>
                      <Input
                        placeholder="e.g. General, OBC, SC, ST"
                        value={formData.caste}
                        onChange={(e) => setFormData({...formData, caste: e.target.value})}
                      />
                    </div>
                  </div>

                  {/* Photo upload */}
                  <div className="p-3 rounded-xl border bg-slate-50 dark:bg-slate-900/10 flex items-center justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <Label className="font-semibold text-slate-800 dark:text-slate-200">Student Photo *</Label>
                      {formData.photo ? (
                        <p className="text-xs text-emerald-600 dark:text-emerald-400 font-medium mt-1 truncate">
                          ✓ Photo Uploaded: {formData.photo.split('/').pop()}
                        </p>
                      ) : (
                        <p className="text-xs text-rose-500 font-medium mt-1">⚠️ Required (direct upload)</p>
                      )}
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      {formData.photo && (
                        <a
                          href={formData.photo.startsWith('http') ? formData.photo : `${api.getBaseUrl()}${formData.photo}`}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center px-2.5 py-1.5 rounded-lg border bg-white dark:bg-slate-800 text-xs font-medium hover:bg-slate-50 cursor-pointer shadow-sm"
                        >
                          View
                        </a>
                      )}
                      <input
                        type="file"
                        id="student-photo-main"
                        className="hidden"
                        onChange={async (e) => {
                          const file = e.target.files?.[0];
                          if (!file) return;
                          const toastId = toast.loading('Uploading photo...');
                          try {
                            const uploadData = new FormData();
                            uploadData.append('file', file);
                            const res = await api.post('/auth/upload', uploadData, {
                              headers: { 'Content-Type': 'multipart/form-data' }
                            });
                            setFormData({ ...formData, photo: res.data.url });
                            toast.success('Photo uploaded successfully', { id: toastId });
                          } catch (err) {
                            console.error(err);
                            toast.error('Failed to upload photo', { id: toastId });
                          }
                        }}
                      />
                      <Label
                        htmlFor="student-photo-main"
                        className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-primary text-primary-foreground text-xs font-semibold hover:bg-primary/90 cursor-pointer shadow-sm"
                      >
                        <Upload className="w-3 h-3" />
                        {formData.photo ? 'Change Photo' : 'Upload Photo'}
                      </Label>
                    </div>
                  </div>
                </div>
              )}

              {/* ── STEP 2: FAMILY INFO ── */}
              {formStep === 2 && (
                <div className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <Label className="font-medium">Father's Name</Label>
                      <Input
                        placeholder="Father's full name"
                        value={formData.fatherName}
                        onChange={(e) => setFormData({...formData, fatherName: e.target.value})}
                      />
                    </div>
                    <div>
                      <Label className="font-medium">Father's Phone</Label>
                      <Input
                        placeholder="Father's phone"
                        value={formData.fatherPhone}
                        onChange={(e) => setFormData({...formData, fatherPhone: e.target.value})}
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <Label className="font-medium">Mother's Name</Label>
                      <Input
                        placeholder="Mother's full name"
                        value={formData.motherName}
                        onChange={(e) => setFormData({...formData, motherName: e.target.value})}
                      />
                    </div>
                    <div>
                      <Label className="font-medium">Mother's Phone</Label>
                      <Input
                        placeholder="Mother's phone"
                        value={formData.motherPhone}
                        onChange={(e) => setFormData({...formData, motherPhone: e.target.value})}
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* ── STEP 3: DOCUMENTS ── */}
              {formStep === 3 && (
                <div className="space-y-4">
                  <p className="text-sm text-amber-600 dark:text-amber-400 font-semibold">Please upload the required files directly. All files must be uploaded to save the student record.</p>
                  {['Aadhaar Card', 'SSLC Certificate', 'Plus Two Certificate', 'Transfer Certificate', 'Birth Certificate', 'Degree Certificate', 'Other'].map((docType) => {
                    const isOptional = ['Transfer Certificate', 'Birth Certificate', 'Degree Certificate', 'Other'].includes(docType);
                    const existing = (formData.documents || []).find((d: any) => d.type === docType);
                    const elementId = `doc-upload-${docType.replace(/\s+/g, '-')}`;
                    return (
                      <div key={docType} className="space-y-2">
                        <div className="flex items-center justify-between p-3 rounded-xl border bg-slate-50 dark:bg-slate-900/10 gap-4">
                          <div className="flex-1 min-w-0">
                            <div className="text-sm font-semibold text-slate-800 dark:text-slate-200">
                              {docType === 'Other' && customOtherName.trim() !== '' ? `Other (${customOtherName})` : docType} {isOptional ? <span className="text-xs text-muted-foreground font-normal">(optional)</span> : '*'}
                            </div>
                            {existing?.url ? (
                              <div className="text-xs text-emerald-600 dark:text-emerald-400 font-medium mt-1 truncate">
                                ✓ Uploaded: {existing.url.split('/').pop()}
                              </div>
                            ) : isOptional ? (
                              <div className="text-xs text-muted-foreground font-medium mt-1">
                                Optional
                              </div>
                            ) : (
                              <div className="text-xs text-rose-500 font-medium mt-1">
                                ⚠️ Required
                              </div>
                            )}
                          </div>
                          <div className="flex items-center gap-2 shrink-0">
                            {existing?.url && (
                              <a
                                href={existing.url.startsWith('http') ? existing.url : `${api.getBaseUrl().replace('/api/v1', '')}${existing.url}`}
                                target="_blank"
                                rel="noreferrer"
                                className="inline-flex items-center px-2.5 py-1.5 rounded-lg border bg-white dark:bg-slate-800 text-xs font-medium hover:bg-slate-50 cursor-pointer shadow-sm"
                              >
                                View
                              </a>
                            )}
                            <input
                              type="file"
                              id={elementId}
                              className="hidden"
                              onChange={async (e) => {
                                const file = e.target.files?.[0];
                                if (!file) return;
                                const toastId = toast.loading(`Uploading ${docType}...`);
                                try {
                                  const uploadData = new FormData();
                                  uploadData.append('file', file);
                                  const res = await api.post('/auth/upload', uploadData, {
                                    headers: { 'Content-Type': 'multipart/form-data' }
                                  });
                                  const newDocs = (formData.documents || []).filter((d: any) => d.type !== docType);
                                  newDocs.push({ type: docType, url: res.data.url, label: docType === 'Other' ? customOtherName : undefined });
                                  setFormData({ ...formData, documents: newDocs });
                                  toast.success(`${docType} uploaded successfully`, { id: toastId });
                                } catch (err) {
                                  console.error(err);
                                  toast.error(`Failed to upload ${docType}`, { id: toastId });
                                }
                              }}
                            />
                            <Label
                              htmlFor={elementId}
                              className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-primary text-primary-foreground text-xs font-semibold hover:bg-primary/90 cursor-pointer shadow-sm"
                            >
                              <Upload className="w-3 h-3" />
                              {existing?.url ? 'Change File' : 'Upload File'}
                            </Label>
                          </div>
                        </div>
                        {docType === 'Other' && (
                          <div className="pl-2 pr-2">
                            <Label htmlFor="customOtherDocName" className="text-xs text-muted-foreground font-semibold">Custom label for Other document (optional)</Label>
                            <Input
                              id="customOtherDocName"
                              placeholder="e.g. Experience Certificate, TC alternative..."
                              className="h-8 text-xs mt-1"
                              value={customOtherName}
                              onChange={(e) => {
                                const nextVal = e.target.value;
                                setCustomOtherName(nextVal);
                                // Update label in existing document array if already uploaded
                                const hasOther = (formData.documents || []).find((d: any) => d.type === 'Other');
                                if (hasOther) {
                                  const newDocs = (formData.documents || []).map((d: any) => 
                                    d.type === 'Other' ? { ...d, label: nextVal } : d
                                  );
                                  setFormData({ ...formData, documents: newDocs });
                                }
                              }}
                            />
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}

              {/* ── STEP 4: PAYMENT RECEIPT ── */}
              {formStep === 4 && (
                <div className="space-y-4">
                  <p className="text-sm text-slate-600 dark:text-slate-400">
                    Upload the fee payment receipt. Once uploaded, it will be sent to the Finance team for verification.
                  </p>
                  
                  <div className="p-4 rounded-xl border bg-slate-50 dark:bg-slate-900/10 space-y-3">
                    <h4 className="font-semibold text-sm">Upload Receipt (Optional at submission)</h4>
                    
                    <div className="flex items-center gap-4">
                      {formData.receiptUrl && (
                        <div className="w-16 h-16 rounded overflow-hidden border">
                          <img src={formData.receiptUrl.startsWith('http') ? formData.receiptUrl : `${api.getBaseUrl().replace('/api/v1', '')}${formData.receiptUrl}`} alt="Receipt Preview" className="w-full h-full object-cover" />
                        </div>
                      )}
                      <div className="flex-1">
                        <Label htmlFor="receipt-upload" className="inline-flex items-center justify-center px-4 py-2 border rounded-md text-sm font-medium cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">
                          <Upload className="w-4 h-4 mr-2" />
                          {formData.receiptUrl ? 'Change Receipt' : 'Upload File'}
                        </Label>
                        <input
                          type="file"
                          id="receipt-upload"
                          className="hidden"
                          accept="image/*,.pdf"
                          onChange={async (e) => {
                            const file = e.target.files?.[0];
                            if (file) {
                              const uploadData = new FormData();
                              uploadData.append('file', file);
                              uploadData.append('type', 'receipt');
                              try {
                                const res = await api.post('/documents/upload', uploadData, {
                                  headers: { 'Content-Type': 'multipart/form-data' }
                                });
                                setFormData({ ...formData, receiptUrl: res.data.fileUrl });
                                toast.success('Receipt uploaded successfully');
                              } catch (err: any) {
                                toast.error('Failed to upload receipt');
                              }
                            }
                          }}
                        />
                      </div>
                    </div>
                  </div>
                </div>
              )}

            </div>

            {/* Footer buttons */}
            <div className="flex items-center justify-between pt-3 border-t mt-3">
              <Button type="button" variant="outline" onClick={() => setFormStep(Math.max(0, formStep - 1))} disabled={formStep === 0}>
                ← Back
              </Button>
              <div className="text-xs text-muted-foreground">Step {formStep + 1} of 5</div>
              {formStep < 4 ? (
                <Button type="button" onClick={() => setFormStep(formStep + 1)}>
                  Next <ChevronRight className="w-4 h-4 ml-1" />
                </Button>
              ) : (
                <Button type="submit" className="bg-primary">
                  {editingId ? 'Update Student' : 'Save Student'}
                </Button>
              )}
            </div>
          </form>
        </DialogContent>
      </Dialog>
    );
  }

  if (viewingProfileStudent) {
    return (
      <StudentProfilePanel 
        student={viewingProfileStudent} 
        onBack={() => setViewingProfileStudent(null)} 
      />
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-slate-100">Student Management</h2>
          <p className="text-muted-foreground text-sm hidden sm:block">Manage student records, bulk imports, communications, and installment schedules</p>
        </div>
        
        <div className="flex items-center gap-2 flex-shrink-0">
          {canWrite && (
            <>
              {/* Bulk Import Button */}
              <Button variant="outline" size="sm" onClick={() => setBulkDialogOpen(true)}>
                <Upload className="w-4 h-4 sm:mr-2" /> <span className="hidden sm:inline">Bulk Import</span>
              </Button>

              <Dialog open={dialogOpen} onOpenChange={handleDialogOpenChange}>
                <DialogTrigger asChild>
                  <Button size="sm"><Plus className="w-4 h-4 sm:mr-2" /><span className="hidden sm:inline">Add Student</span></Button>
                </DialogTrigger>
                <DialogContent className="max-w-3xl w-full sm:max-w-3xl h-[100dvh] sm:h-auto sm:max-h-[92vh] flex flex-col rounded-none sm:rounded-xl">
                  <DialogHeader className="pb-2 border-b">
                    <DialogTitle className="text-lg">{editingId ? 'Edit Student Record' : 'Add New Student Record'}</DialogTitle>
                    {/* Step indicator */}
                    <div className="flex items-center gap-1 pt-2">
                      {['Admission Info', 'Personal Details', 'Family Info', 'Documents', 'Payment Receipt'].map((step, i) => (
                        <button
                          key={i}
                          type="button"
                          onClick={() => setFormStep(i)}
                          className={`flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
                            formStep === i
                              ? 'bg-primary text-primary-foreground shadow'
                              : 'bg-slate-100 dark:bg-slate-800 text-muted-foreground hover:bg-slate-200 dark:hover:bg-slate-700'
                          }`}
                        >
                          {i === 0 && <BookOpen className="w-3 h-3" />}
                          {i === 1 && <User className="w-3 h-3" />}
                          {i === 2 && <Building2 className="w-3 h-3" />}
                          {i === 3 && <FileText className="w-3 h-3" />}
                          {i === 4 && <CreditCard className="w-3 h-3" />}
                          {step}
                        </button>
                      ))}
                    </div>
                  </DialogHeader>

                  <form onSubmit={handleSubmit} className="flex flex-col flex-1 min-h-0 overflow-hidden">
                    <div className="flex-1 overflow-y-auto pr-2 max-h-[60vh] space-y-4 py-3">

                      {/* ── STEP 0: ADMISSION INFO ── */}
                      {formStep === 0 && (
                        <div className="space-y-4">
                          {/* Previous student toggle - only show for non-sales admins */}
                          {!isSalesMode && !['sales_admin', 'sales_agent', 'bde'].includes(user?.role || '') && (
                            <div className="flex items-center gap-3 p-3 rounded-xl border border-amber-200 bg-amber-50 dark:bg-amber-950/20 dark:border-amber-900">
                              <input
                                type="checkbox"
                                id="isPreviousMain"
                                checked={formData.isPrevious}
                                onChange={(e) => setFormData({...formData, isPrevious: e.target.checked})}
                                className="w-4 h-4 rounded border-slate-300 accent-amber-600"
                              />
                              <div>
                                <Label htmlFor="isPreviousMain" className="cursor-pointer font-semibold text-amber-800 dark:text-amber-400">Mark as Previous Student</Label>
                                <p className="text-xs text-amber-700 dark:text-amber-500 mt-0.5">Enable this for students admitted before the system was set up</p>
                              </div>
                            </div>
                          )}

                          {/* Branch & University */}
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            {!isSalesMode && !['sales_admin', 'sales_agent', 'bde'].includes(user?.role || '') ? (
                              <>
                                <div>
                                  <Label className="font-medium">Branch <span className="text-xs text-muted-foreground font-normal">(optional)</span></Label>
                                  <Select value={formData.branchId} onValueChange={(v) => setFormData({...formData, branchId: v === '__none__' ? '' : v})}>
                                    <SelectTrigger><SelectValue placeholder="Select branch..." /></SelectTrigger>
                                    <SelectContent>
                                      <SelectItem value="__none__">— No Branch —</SelectItem>
                                      {branches.filter((b: any) => b && b.id).map((b: any) => (
                                        <SelectItem key={b.id} value={b.id}>{b.name} ({b.code})</SelectItem>
                                      ))}
                                    </SelectContent>
                                  </Select>
                                </div>
                                <div>
                                  <Label className="font-medium">University *</Label>
                                  <Select value={formData.universityId} onValueChange={(v) => setFormData({...formData, universityId: v, programId: ''})}>
                                    <SelectTrigger><SelectValue placeholder="Select university..." /></SelectTrigger>
                                    <SelectContent>
                                      {universities.filter((u: any) => u && u.id).map((u: any) => (
                                        <SelectItem key={u.id} value={u.id}>{u.name}</SelectItem>
                                      ))}
                                    </SelectContent>
                                  </Select>
                                </div>
                              </>
                            ) : (
                              <div className="col-span-2">
                                <Label className="font-medium">University *</Label>
                                <Select value={formData.universityId} onValueChange={(v) => setFormData({...formData, universityId: v, programId: ''})}>
                                  <SelectTrigger><SelectValue placeholder="Select university..." /></SelectTrigger>
                                  <SelectContent>
                                    {universities.filter((u: any) => u && u.id).map((u: any) => (
                                      <SelectItem key={u.id} value={u.id}>{u.name}</SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                              </div>
                            )}
                          </div>

                          {/* Program & Session */}
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div>
                              <Label className="font-medium">Program *</Label>
                              <Select value={formData.programId} onValueChange={(v) => setFormData({...formData, programId: v})} disabled={!formData.universityId}>
                                <SelectTrigger>
                                  <SelectValue placeholder={formData.universityId ? 'Select program...' : 'Select a university first'} />
                                </SelectTrigger>
                                <SelectContent>
                                  {filteredPrograms.filter((p: any) => p && p.id).map((p: any) => (
                                    <SelectItem key={p.id} value={p.id}>{p.name} {p.code ? `(${p.code})` : ''}</SelectItem>
                                  ))}
                                  {filteredPrograms.length === 0 && (
                                    <div className="px-3 py-2 text-sm text-muted-foreground">No programs found for this university</div>
                                  )}
                                </SelectContent>
                              </Select>
                            </div>
                            <div>
                              <Label className="font-medium">Session <span className="text-xs text-muted-foreground font-normal">(optional)</span></Label>
                              <Select value={formData.sessionId} onValueChange={(v) => setFormData({...formData, sessionId: v === '__none__' ? '' : v})} disabled={!formData.programId}>
                                <SelectTrigger><SelectValue placeholder={formData.programId ? "Select session..." : "Select program first"} /></SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="__none__">— No Session —</SelectItem>
                                  {sessions.filter((s: any) => s && s.id && s.programId === formData.programId).map((s: any) => (
                                    <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>
                          </div>

                          {/* Payment Plan & Fee */}
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4">
                            <div>
                              <Label className="font-medium">Payment Plan *</Label>
                              <Select value={formData.paymentPlan} onValueChange={(v) => setFormData({...formData, paymentPlan: v})}>
                                <SelectTrigger><SelectValue /></SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="full">Full (One Time)</SelectItem>
                                  <SelectItem value="per_year_sem">Per Year / Semester</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>
                          </div>

                          {renderFeeDisplay()}

                          {/* Enrollment & Admission Numbers */}
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div>
                              <Label className="font-medium">Enrollment Number <span className="text-xs text-muted-foreground font-normal">(optional)</span></Label>
                              <Input
                                placeholder="e.g. PYPEER001"
                                value={formData.enrollmentNo || ''}
                                onChange={(e) => setFormData({...formData, enrollmentNo: e.target.value})}
                              />
                            </div>
                            {editingId && (
                              <div>
                                <Label className="font-medium">Admission Number</Label>
                                <Input
                                  placeholder="Auto-generated on save"
                                  value={formData.admissionNo || ''}
                                  readOnly
                                  className="bg-slate-50 cursor-not-allowed text-muted-foreground"
                                />
                              </div>
                            )}
                          </div>

                          {/* Admission Date & Status */}
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div>
                              <Label className="font-medium">{formData.isPrevious ? 'Previous Admission Date *' : 'Admission Date'}</Label>
                              <Input
                                type="date"
                                value={formData.admissionDate}
                                onChange={(e) => setFormData({...formData, admissionDate: e.target.value})}
                                required={formData.isPrevious}
                              />
                            </div>
                            {editingId && (
                              <div>
                                <Label className="font-medium">Status</Label>
                                <Select value={formData.status} onValueChange={(v) => setFormData({...formData, status: v})}>
                                  <SelectTrigger><SelectValue /></SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="pending">Pending</SelectItem>
                                    <SelectItem value="document_review">Document Review</SelectItem>
                                    <SelectItem value="active">Active</SelectItem>
                                    <SelectItem value="inactive">Inactive</SelectItem>
                                    <SelectItem value="completed">Completed</SelectItem>
                                  </SelectContent>
                                </Select>
                              </div>
                            )}
                          </div>
                        </div>
                      )}

                      {/* ── STEP 1: PERSONAL DETAILS ── */}
                      {formStep === 1 && (
                        <div className="space-y-4">
                          <div>
                            <Label className="font-medium">Full Name *</Label>
                            <Input value={formData.name} onChange={(e) => setFormData({...formData, name: e.target.value})} required placeholder="Student's full name" />
                          </div>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div>
                              <Label className="font-medium">Email *</Label>
                              <Input type="email" value={formData.email} onChange={(e) => setFormData({...formData, email: e.target.value})} required placeholder="student@example.com" />
                            </div>
                            <div>
                              <Label className="font-medium">Contact Number *</Label>
                              <Input value={formData.phone} onChange={(e) => setFormData({...formData, phone: e.target.value})} required placeholder="10-digit mobile" />
                            </div>
                          </div>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div>
                              <Label className="font-medium">Date of Birth</Label>
                              <Input type="date" value={formData.dob} onChange={(e) => setFormData({...formData, dob: e.target.value})} />
                            </div>
                            <div>
                              <Label className="font-medium">Alternate Phone</Label>
                              <Input value={formData.altPhone} onChange={(e) => setFormData({...formData, altPhone: e.target.value})} placeholder="Optional" />
                            </div>
                          </div>
                          <div>
                            <Label className="font-medium">Address *</Label>
                            <Textarea value={formData.address} onChange={(e) => setFormData({...formData, address: e.target.value})} required placeholder="Full residential address" rows={2} />
                          </div>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div>
                              <Label className="font-medium">PIN Code</Label>
                              <Input value={formData.pinCode} onChange={(e) => setFormData({...formData, pinCode: e.target.value})} placeholder="6-digit PIN" maxLength={6} />
                            </div>
                          </div>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div>
                              <Label className="font-medium">Religion</Label>
                              <Input value={formData.religion} onChange={(e) => setFormData({...formData, religion: e.target.value})} placeholder="e.g. Hindu, Muslim, Christian" />
                            </div>
                            <div>
                              <Label className="font-medium">Caste / Category</Label>
                              <Input value={formData.caste} onChange={(e) => setFormData({...formData, caste: e.target.value})} placeholder="e.g. OBC, SC, ST, General" />
                            </div>
                          </div>
                          {/* Photo */}
                          <div>
                            <Label className="font-medium font-semibold text-slate-800 dark:text-slate-200">Student Photo *</Label>
                            <div className="flex items-center gap-4 mt-2 p-3 rounded-xl border bg-slate-50 dark:bg-slate-900/20">
                              {formData.photo ? (
                                <div className="relative group cursor-pointer inline-block">
                                  <img src={formData.photo.startsWith('http') ? formData.photo : `${api.getBaseUrl()}${formData.photo}`} alt="Student" className="w-20 h-20 rounded-full object-cover border-2 border-primary/30" />
                                  <button
                                    type="button"
                                    onClick={() => setFormData({...formData, photo: ''})}
                                    className="absolute -top-1 -right-1 bg-rose-500 text-white rounded-full p-1 hover:bg-rose-600 transition-colors shadow-sm"
                                    title="Remove Photo"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                </div>
                              ) : (
                                <div className="w-20 h-20 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center border-2 border-dashed border-slate-350">
                                  <User className="w-9 h-9 text-slate-400" />
                                </div>
                              )}
                              <div className="flex-1 space-y-2">
                                <input
                                  type="file"
                                  accept="image/*"
                                  required={!formData.photo}
                                  id="studentPhotoUpload"
                                  className="hidden"
                                  onChange={async (e) => {
                                    const file = e.target.files?.[0];
                                    if (!file) return;
                                    const toastId = toast.loading('Uploading photo...');
                                    try {
                                      const data = new FormData();
                                      data.append('file', file);
                                      const res = await api.post('/auth/upload', data, {
                                        headers: { 'Content-Type': 'multipart/form-data' }
                                      });
                                      setFormData({ ...formData, photo: res.data.url });
                                      toast.success('Photo uploaded successfully', { id: toastId });
                                    } catch (err) {
                                      console.error(err);
                                      toast.error('Failed to upload photo', { id: toastId });
                                    }
                                  }}
                                />
                                <Label
                                  htmlFor="studentPhotoUpload"
                                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border bg-white dark:bg-slate-850 hover:bg-slate-50 cursor-pointer text-xs font-semibold shadow-sm transition-all"
                                >
                                  <Upload className="w-3.5 h-3.5" />
                                  Select Photo
                                </Label>
                                <p className="text-[11px] text-muted-foreground">JPG, PNG allowed (Max 10MB)</p>
                              </div>
                            </div>
                          </div>
                        </div>
                      )}

                      {/* ── STEP 2: FAMILY INFO ── */}
                      {formStep === 2 && (
                        <div className="space-y-5">
                          <div className="p-4 rounded-xl border bg-blue-50/50 dark:bg-blue-950/10 space-y-4">
                            <h4 className="font-semibold text-slate-800 dark:text-slate-200 flex items-center gap-2">
                              <User className="w-4 h-4 text-blue-500" /> Father's Information
                            </h4>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                              <div>
                                <Label className="font-medium">Father's Name</Label>
                                <Input value={formData.fatherName} onChange={(e) => setFormData({...formData, fatherName: e.target.value})} placeholder="Father's full name" />
                              </div>
                              <div>
                                <Label className="font-medium">Father's Mobile</Label>
                                <Input value={formData.fatherPhone} onChange={(e) => setFormData({...formData, fatherPhone: e.target.value})} placeholder="10-digit mobile" />
                              </div>
                            </div>
                          </div>
                          <div className="p-4 rounded-xl border bg-pink-50/50 dark:bg-pink-950/10 space-y-4">
                            <h4 className="font-semibold text-slate-800 dark:text-slate-200 flex items-center gap-2">
                              <User className="w-4 h-4 text-pink-500" /> Mother's Information
                            </h4>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                              <div>
                                <Label className="font-medium">Mother's Name</Label>
                                <Input value={formData.motherName} onChange={(e) => setFormData({...formData, motherName: e.target.value})} placeholder="Mother's full name" />
                              </div>
                              <div>
                                <Label className="font-medium">Mother's Mobile</Label>
                                <Input value={formData.motherPhone} onChange={(e) => setFormData({...formData, motherPhone: e.target.value})} placeholder="10-digit mobile" />
                              </div>
                            </div>
                          </div>
                        </div>
                      )}

                      {/* ── STEP 3: DOCUMENTS ── */}
                      {formStep === 3 && (
                        <div className="space-y-4">
                          <p className="text-sm text-amber-600 dark:text-amber-400 font-semibold">Please upload the required files directly. All files must be uploaded to save the student record.</p>
                          {['Aadhaar Card', 'SSLC Certificate', 'Plus Two Certificate', 'Transfer Certificate', 'Birth Certificate', 'Degree Certificate', 'Other'].map((docType) => {
                            const isOptional = ['Transfer Certificate', 'Birth Certificate', 'Degree Certificate', 'Other'].includes(docType);
                            const existing = (formData.documents || []).find((d: any) => d.type === docType);
                            const elementId = `doc-upload-${docType.replace(/\s+/g, '-')}`;
                            return (
                              <div key={docType} className="space-y-2">
                                <div className="flex items-center justify-between p-3 rounded-xl border bg-slate-50 dark:bg-slate-900/10 gap-4">
                                  <div className="flex-1 min-w-0">
                                    <div className="text-sm font-semibold text-slate-800 dark:text-slate-200">
                                      {docType === 'Other' && customOtherName.trim() !== '' ? `Other (${customOtherName})` : docType} {isOptional ? <span className="text-xs text-muted-foreground font-normal">(optional)</span> : '*'}
                                    </div>
                                    {existing?.url ? (
                                      <div className="text-xs text-emerald-600 dark:text-emerald-400 font-medium mt-1 truncate">
                                        ✓ Uploaded: {existing.url.split('/').pop()}
                                      </div>
                                    ) : isOptional ? (
                                      <div className="text-xs text-muted-foreground font-medium mt-1">
                                        Optional
                                      </div>
                                    ) : (
                                      <div className="text-xs text-rose-500 font-medium mt-1">
                                        ⚠️ Required
                                      </div>
                                    )}
                                  </div>
                                  <div className="flex items-center gap-2 shrink-0">
                                    {existing?.url && (
                                      <a
                                        href={existing.url.startsWith('http') ? existing.url : `${api.getBaseUrl().replace('/api/v1', '')}${existing.url}`}
                                        target="_blank"
                                        rel="noreferrer"
                                        className="inline-flex items-center px-2.5 py-1.5 rounded-lg border bg-white dark:bg-slate-800 text-xs font-medium hover:bg-slate-50 cursor-pointer shadow-sm"
                                      >
                                        View
                                      </a>
                                    )}
                                    <input
                                      type="file"
                                      id={elementId}
                                      className="hidden"
                                      onChange={async (e) => {
                                        const file = e.target.files?.[0];
                                        if (!file) return;
                                        const toastId = toast.loading(`Uploading ${docType}...`);
                                        try {
                                          const uploadData = new FormData();
                                          uploadData.append('file', file);
                                          const res = await api.post('/auth/upload', uploadData, {
                                            headers: { 'Content-Type': 'multipart/form-data' }
                                          });
                                          const newDocs = (formData.documents || []).filter((d: any) => d.type !== docType);
                                          newDocs.push({ type: docType, url: res.data.url, label: docType === 'Other' ? customOtherName : undefined });
                                          setFormData({ ...formData, documents: newDocs });
                                          toast.success(`${docType} uploaded successfully`, { id: toastId });
                                        } catch (err) {
                                          console.error(err);
                                          toast.error(`Failed to upload ${docType}`, { id: toastId });
                                        }
                                      }}
                                    />
                                    <Label
                                      htmlFor={elementId}
                                      className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-primary text-primary-foreground text-xs font-semibold hover:bg-primary/90 cursor-pointer shadow-sm"
                                    >
                                      <Upload className="w-3 h-3" />
                                      {existing?.url ? 'Change File' : 'Upload File'}
                                    </Label>
                                  </div>
                                </div>
                                {docType === 'Other' && (
                                  <div className="pl-2 pr-2">
                                    <Label htmlFor="customOtherDocName" className="text-xs text-muted-foreground font-semibold">Custom label for Other document (optional)</Label>
                                    <Input
                                      id="customOtherDocName"
                                      placeholder="e.g. Experience Certificate, TC alternative..."
                                      className="h-8 text-xs mt-1"
                                      value={customOtherName}
                                      onChange={(e) => {
                                        const nextVal = e.target.value;
                                        setCustomOtherName(nextVal);
                                        // Update label in existing document array if already uploaded
                                        const hasOther = (formData.documents || []).find((d: any) => d.type === 'Other');
                                        if (hasOther) {
                                          const newDocs = (formData.documents || []).map((d: any) => 
                                            d.type === 'Other' ? { ...d, label: nextVal } : d
                                          );
                                          setFormData({ ...formData, documents: newDocs });
                                        }
                                      }}
                                    />
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      )}

                      {/* ── STEP 4: PAYMENT RECEIPT ── */}
                      {formStep === 4 && (
                        <div className="space-y-4">
                          <p className="text-sm text-slate-600 dark:text-slate-400">
                            Upload the fee payment receipt. Once uploaded, it will be sent to the Finance team for verification.
                          </p>
                          
                          <div className="p-4 rounded-xl border bg-slate-50 dark:bg-slate-900/10 space-y-3">
                            <h4 className="font-semibold text-sm">Upload Receipt (Optional at submission)</h4>
                            
                            <div className="flex items-center gap-4">
                              {formData.receiptUrl && (
                                <div className="w-16 h-16 rounded overflow-hidden border">
                                  <img src={formData.receiptUrl.startsWith('http') ? formData.receiptUrl : `${api.getBaseUrl().replace('/api/v1', '')}${formData.receiptUrl}`} alt="Receipt Preview" className="w-full h-full object-cover" />
                                </div>
                              )}
                              <div className="flex-1">
                                <Label htmlFor="receipt-upload" className="inline-flex items-center justify-center px-4 py-2 border rounded-md text-sm font-medium cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">
                                  <Upload className="w-4 h-4 mr-2" />
                                  {formData.receiptUrl ? 'Change Receipt' : 'Upload File'}
                                </Label>
                                <input
                                  type="file"
                                  id="receipt-upload"
                                  className="hidden"
                                  accept="image/*,.pdf"
                                  onChange={async (e) => {
                                    const file = e.target.files?.[0];
                                    if (file) {
                                      const uploadData = new FormData();
                                      uploadData.append('file', file);
                                      uploadData.append('type', 'receipt');
                                      try {
                                        const res = await api.post('/documents/upload', uploadData, {
                                          headers: { 'Content-Type': 'multipart/form-data' }
                                        });
                                        setFormData({ ...formData, receiptUrl: res.data.fileUrl });
                                        toast.success('Receipt uploaded successfully');
                                      } catch (err: any) {
                                        toast.error('Failed to upload receipt');
                                      }
                                    }
                                  }}
                                />
                              </div>
                            </div>
                          </div>
                        </div>
                      )}

                    </div>

                    {/* Footer buttons */}
                    <div className="flex items-center justify-between pt-3 border-t mt-3">
                      <Button type="button" variant="outline" onClick={() => setFormStep(Math.max(0, formStep - 1))} disabled={formStep === 0}>
                        ← Back
                      </Button>
                      <div className="text-xs text-muted-foreground">Step {formStep + 1} of 5</div>
                      {formStep < 4 ? (
                        <Button type="button" onClick={() => setFormStep(formStep + 1)}>
                          Next <ChevronRight className="w-4 h-4 ml-1" />
                        </Button>
                      ) : (
                        <Button type="submit" className="bg-primary">
                          {editingId ? 'Update Student' : 'Save Student'}
                        </Button>
                      )}
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
          <TabsTrigger value="previous">Completed Students ({students.filter(s => s && s.isPrevious).length})</TabsTrigger>
        </TabsList>
      </Tabs>

      <Card>
        <CardHeader>
          <CardTitle>Student Directory</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-4">
            <div>
              <Label className="text-xs text-muted-foreground block mb-1">Search Students (Name, Email, Enrollment, Center)</Label>
              <div className="relative">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input 
                  placeholder="Type name, email, enrollment number..." 
                  className="pl-8 text-sm"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
            </div>
            <div>
              <Label className="text-xs text-muted-foreground block mb-1">Filter by University</Label>
              <Select value={filterUniversityId} onValueChange={setFilterUniversityId}>
                <SelectTrigger>
                  <SelectValue placeholder="All Universities" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Universities</SelectItem>
                  {universities.filter((u: any) => u && u.id).map((u: any) => (
                    <SelectItem key={u.id} value={u.id}>{u.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs text-muted-foreground block mb-1">Filter by Branch</Label>
              <Select value={filterBranchId} onValueChange={setFilterBranchId}>
                <SelectTrigger>
                  <SelectValue placeholder="All Branches" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Branches</SelectItem>
                  {branches.filter((b: any) => b && b.id).map((b: any) => (
                    <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs text-muted-foreground block mb-1">Filter by Admission Session</Label>
              <Select value={filterSessionId} onValueChange={setFilterSessionId}>
                <SelectTrigger>
                  <SelectValue placeholder="All Sessions" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Sessions</SelectItem>
                  {sessions.filter((s: any) => s && s.id).map((s: any) => (
                    <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs text-muted-foreground block mb-1">Sort By</Label>
              <Select value={sortBy} onValueChange={setSortBy}>
                <SelectTrigger>
                  <SelectValue placeholder="Sort By" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="name">Name</SelectItem>
                  <SelectItem value="branch">Branch</SelectItem>
                  <SelectItem value="enrollmentNo">Enrollment No.</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {loading ? (
            <div className="text-center py-8">Loading students database...</div>
          ) : filteredStudents.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">No students found matching this criteria</div>
          ) : (
            <div className="space-y-3">
              {/* Select all row */}
              {isOrgAdmin && paginatedStudents.length > 0 && (
                <div className="flex items-center gap-2 px-1 pb-1 border-b">
                  <button
                    onClick={toggleSelectAll}
                    className="flex items-center gap-2 text-sm text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 transition-colors"
                  >
                    {selectedStudentIds.size === paginatedStudents.length
                      ? <CheckSquare className="w-4 h-4 text-blue-600" />
                      : <Square className="w-4 h-4" />}
                    <span>{selectedStudentIds.size === paginatedStudents.length ? 'Deselect all' : 'Select all on page'}</span>
                  </button>
                  {selectedStudentIds.size > 0 && (
                    <span className="ml-auto text-xs text-blue-600 font-medium">{selectedStudentIds.size} selected</span>
                  )}
                </div>
              )}
              {paginatedStudents.map((student, index) => {
                const centerName = typeof student.centerId === 'object' ? student.centerId?.name : student.center?.name || '';
                const programName = typeof student.programId === 'object' ? student.programId?.name : student.program?.name || '';
                const universityName = typeof student.universityId === 'object' ? student.universityId?.name : student.university?.name || '';
                const branchName = typeof student.branchId === 'object' ? student.branchId?.name : student.branch?.name || '';
                return (
                  <div key={student.id} className={`flex flex-col sm:flex-row sm:items-center sm:justify-between p-3 sm:p-4 border rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors gap-3 ${selectedStudentIds.has(student.id) ? 'ring-2 ring-blue-500 bg-blue-50/30 dark:bg-blue-900/10' : ''}`}>
                    <div className="flex items-center gap-4">
                      {/* Row number / Checkbox (org_admin only) */}
                      {isOrgAdmin ? (
                        <button
                          onClick={() => toggleStudentSelection(student.id)}
                          className="w-6 h-6 flex items-center justify-center text-slate-400 hover:text-blue-600 transition-colors shrink-0"
                        >
                          {selectedStudentIds.has(student.id)
                            ? <CheckSquare className="w-5 h-5 text-blue-600" />
                            : <Square className="w-5 h-5" />}
                        </button>
                      ) : (
                        <div className="w-6 text-center text-sm font-semibold text-slate-400 dark:text-slate-500 shrink-0">
                          {(currentPage - 1) * itemsPerPage + index + 1}
                        </div>
                      )}
                      <div className="w-12 h-12 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center overflow-hidden border border-slate-200">
                        {student.photo ? (
                          <img 
                            src={student.photo.startsWith('http') ? student.photo : `${api.getBaseUrl()}${student.photo}`} 
                            alt={student.name} 
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <GraduationCap className="w-6 h-6 text-blue-600 dark:text-blue-400" />
                        )}
                      </div>
                      <div>
                        <div className="font-semibold text-slate-850 dark:text-slate-100 flex items-center gap-2">
                          {student.name}
                          {student.isPrevious && <Badge variant="secondary" className="text-xs">Previous</Badge>}
                        </div>
                        <div className="text-sm text-muted-foreground font-medium mt-0.5">
                          {student.enrollmentNo}{universityName ? ` • ${universityName}` : ''}{branchName ? ` • ${branchName}` : ''}{programName ? ` • ${programName}` : ''}{centerName ? ` • ${centerName}` : ''}
                        </div>
                        <div className="flex items-center gap-4 mt-2 text-xs text-slate-500">
                          <span className="flex items-center gap-1"><Mail className="w-3.5 h-3.5" /> {student.email}</span>
                          {student.phone && <span className="flex items-center gap-1"><Phone className="w-3.5 h-3.5" /> {student.phone}</span>}
                        </div>
                      </div>
                    </div>
                    
                      <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap justify-end">
                        <Badge className="bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-200 hover:bg-slate-100">{student.status}</Badge>

                        {/* View Profile */}
                        <Button variant="default" size="icon" className="w-8 h-8" onClick={() => setViewingProfileStudent(student)} title="View Profile">
                          <Eye className="w-4 h-4" />
                        </Button>
                        
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

                      {/* Update Progress */}
                      <Button variant="outline" size="icon" className="w-8 h-8" onClick={() => handleOpenProgress(student)} title="Update Progress">
                        <TrendingUp className="w-4 h-4 text-emerald-600" />
                      </Button>

                      {/* View/Change Credentials */}
                      <Button variant="outline" size="icon" className="w-8 h-8" onClick={() => handleOpenCredentials(student)} title="View/Edit Credentials">
                        <Key className="w-4 h-4 text-cyan-500" />
                      </Button>

                      {/* Enrollment History */}
                      <Button variant="outline" size="icon" className="w-8 h-8" onClick={() => handleOpenEnrollHistory(student)} title="Enrollment History">
                        <History className="w-4 h-4 text-violet-500" />
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
              
              {/* Bulk Floating Action Bar */}
              {isOrgAdmin && selectedStudentIds.size > 0 && (
                <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-3 bg-slate-900 text-white rounded-2xl shadow-2xl px-5 py-3 border border-slate-700">
                  <span className="text-sm font-semibold">{selectedStudentIds.size} selected</span>
                  <div className="w-px h-5 bg-slate-600" />
                  <Button
                    size="sm"
                    variant="secondary"
                    className="bg-blue-600 hover:bg-blue-700 text-white border-0 gap-1.5"
                    onClick={() => { setBulkActionUniversityId(''); setBulkActionProgramId(''); setBulkProgramDialogOpen(true); }}
                  >
                    <GraduationCap className="w-4 h-4" />
                    Change University / Program
                  </Button>
                  <Button
                    size="sm"
                    variant="secondary"
                    className="bg-emerald-600 hover:bg-emerald-700 text-white border-0 gap-1.5"
                    onClick={() => { setBulkPaymentAmount(''); setBulkPaymentNote(''); setBulkPaymentDialogOpen(true); }}
                  >
                    <DollarSign className="w-4 h-4" />
                    Record Fee Received
                  </Button>
                  <button
                    onClick={() => setSelectedStudentIds(new Set())}
                    className="ml-1 text-slate-400 hover:text-white transition-colors"
                    title="Clear selection"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              )}

              {/* Pagination Controls */}
              {totalPages > 1 && (
                <div className="flex items-center justify-between pt-4 pb-2 border-t mt-4">
                  <div className="text-sm text-muted-foreground">
                    Showing {(currentPage - 1) * itemsPerPage + 1} to {Math.min(currentPage * itemsPerPage, filteredStudents.length)} of {filteredStudents.length} students
                  </div>
                  <div className="flex items-center gap-2">
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                      disabled={currentPage === 1}
                    >
                      Previous
                    </Button>
                    <div className="text-sm font-medium px-2">
                      Page {currentPage} of {totalPages}
                    </div>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                      disabled={currentPage === totalPages}
                    >
                      Next
                    </Button>
                  </div>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Bulk Import Dialog */}
      <Dialog open={bulkDialogOpen} onOpenChange={setBulkDialogOpen}>
        <DialogContent className="max-w-2xl w-full h-[100dvh] sm:h-auto sm:max-h-[90vh] rounded-none sm:rounded-xl">
          <DialogHeader>
            <DialogTitle>Bulk Import Student Records</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="bulkIsPrevious"
                checked={bulkIsPrevious}
                onChange={(e) => setBulkIsPrevious(e.target.checked)}
                className="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
              />
              <Label htmlFor="bulkIsPrevious" className="cursor-pointer">Mark all as Completed Students</Label>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="bulkUniversitySelect" className="text-sm font-semibold">Select Target University *</Label>
              <Select value={bulkUniversityId} onValueChange={setBulkUniversityId}>
                <SelectTrigger id="bulkUniversitySelect" className="w-full">
                  <SelectValue placeholder="Choose university for these students..." />
                </SelectTrigger>
                <SelectContent>
                  {universities.filter(u => u && u.id).map((u) => (
                    <SelectItem key={u.id} value={u.id}>
                      {u.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {bulkUniversityId && (
              <div className="space-y-1.5">
                <Label htmlFor="bulkProgramSelect" className="text-sm font-semibold">Select Target Program (Optional)</Label>
                <Select value={bulkProgramId} onValueChange={setBulkProgramId}>
                  <SelectTrigger id="bulkProgramSelect" className="w-full">
                    <SelectValue placeholder="Override program for all students (optional)..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Auto-detect from CSV</SelectItem>
                    {programs.filter((p: any) => p && p.id && p.universityId === bulkUniversityId).map((p: any) => (
                      <SelectItem key={p.id} value={p.id}>{p.name} {p.code ? `(${p.code})` : ''}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {bulkUniversityId && (
              <div className="space-y-1.5">
                <Label htmlFor="bulkSessionSelect" className="text-sm font-semibold">Select Target Session (Optional)</Label>
                <Select value={bulkSessionId} onValueChange={setBulkSessionId}>
                  <SelectTrigger id="bulkSessionSelect" className="w-full">
                    <SelectValue placeholder="Override session for all students (optional)..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Auto-detect from CSV</SelectItem>
                    {sessions.filter((s: any) => s && s.id && (!s.universityId || s.universityId === bulkUniversityId)).map((s: any) => (
                      <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {branches.length > 0 && (
              <div className="space-y-1.5">
                <Label htmlFor="bulkBranchSelect" className="text-sm font-semibold">Select Target Branch</Label>
                <Select value={selectedBranchId} onValueChange={setSelectedBranchId}>
                  <SelectTrigger id="bulkBranchSelect" className="w-full">
                    <SelectValue placeholder="Choose branch to associate students with..." />
                  </SelectTrigger>
                  <SelectContent>
                    {branches.filter(b => b && b.id).map((b) => (
                      <SelectItem key={b.id} value={b.id}>
                        {b.name} ({b.code})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {['superadmin', 'org_admin', 'ceo', 'ops_admin'].includes(user?.role || '') && salesUsers.length > 0 && (
              <div className="space-y-1.5">
                <Label htmlFor="bulkSalesUserSelect" className="text-sm font-semibold">Assign Sales User (Optional)</Label>
                <Select value={selectedSalesUserId} onValueChange={setSelectedSalesUserId}>
                  <SelectTrigger id="bulkSalesUserSelect" className="w-full">
                    <SelectValue placeholder="Select sales user (optional)..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">None (Assign to Organisation)</SelectItem>
                    {salesUsers.filter((su: any) => su && su.id).map((su: any) => (
                      <SelectItem key={su.id} value={su.id}>{su.name} ({su.role})</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground mt-0.5">
                  If left unassigned, students will belong generally to the organization.
                </p>
              </div>
            )}

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

            {/* Per-row import error details */}
            {bulkErrors.length > 0 && (
              <div className="rounded-lg border border-destructive/40 bg-destructive/5 p-3 space-y-1.5">
                <p className="text-sm font-semibold text-destructive flex items-center gap-1.5">
                  ⚠️ Import Issues ({bulkErrors.length})
                </p>
                <ul className="text-xs space-y-1 max-h-36 overflow-y-auto pr-1">
                  {bulkErrors.map((err, i) => (
                    <li key={i} className="text-muted-foreground border-l-2 border-destructive/30 pl-2 py-0.5">
                      {err}
                    </li>
                  ))}
                </ul>
                <p className="text-xs text-muted-foreground pt-1">Students without issues were imported successfully. Fix the rows above and re-upload.</p>
              </div>
            )}

            <div className="flex gap-2 pt-2">
              <Button onClick={handleBulkImport} className="flex-1">Start Import Process</Button>
              <Button variant="outline" onClick={() => { setBulkDialogOpen(false); setBulkErrors([]); }}>Close</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>


      {/* Notifications Dialog */}
      <Dialog open={notifDialogOpen} onOpenChange={setNotifDialogOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
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
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
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
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Payment Installment Schedule — {scheduleStudent?.name}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="border rounded-xl p-4 bg-slate-50 dark:bg-slate-900/20">
              <h4 className="font-semibold text-slate-800 dark:text-slate-200 mb-3 text-sm">Add New Installment/Milestone</h4>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
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

      
      {/* Progress Dialog */}
      <Dialog open={progressDialogOpen} onOpenChange={setProgressDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Update Progress - {progressDialogStudent?.name}</DialogTitle>
          </DialogHeader>
          {progressDialogStudent && (
            <StudentProgressTab 
              student={progressDialogStudent} 
              onUpdate={() => {
                fetchStudents();
              }} 
            />
          )}
        </DialogContent>
      </Dialog>

      {/* Enrollment History Dialog */}
      <Dialog open={enrollHistoryOpen} onOpenChange={setEnrollHistoryOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <History className="w-5 h-5 text-violet-500" />
              Enrollment History — {enrollHistoryStudent?.name}
            </DialogTitle>
          </DialogHeader>

          {enrollHistoryLoading ? (
            <div className="space-y-3 py-4">{[1,2].map(i => <div key={i} className="h-24 bg-muted rounded-xl animate-pulse" />)}</div>
          ) : enrollHistoryData.length === 0 ? (
            <p className="text-sm text-muted-foreground py-8 text-center">No enrollment records found for this student.</p>
          ) : (
            <div className="space-y-4 pb-2">
              {enrollHistoryData.map((enr: any, idx: number) => {
                const history: any[] = Array.isArray(enr.statusHistory) ? [...enr.statusHistory].reverse() : [];
                const colorClass = STATUS_COLORS[enr.status] || 'bg-muted text-muted-foreground';
                return (
                  <div key={enr.id} className="border rounded-xl p-4 space-y-3">
                    {/* Header */}
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${colorClass}`}>
                            {statusLabel(enr.status)}
                          </span>
                          {enr.enrollmentNumber && (
                            <span className="text-xs font-mono bg-muted px-2 py-0.5 rounded">{enr.enrollmentNumber}</span>
                          )}
                          <span className="text-xs text-muted-foreground">#{idx + 1}</span>
                        </div>
                        <p className="text-sm font-medium mt-1">
                          {enr.program?.name}{enr.program?.code ? ` (${enr.program.code})` : ''}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {enr.program?.university?.name}
                          {enr.session?.name ? ` · ${enr.session.name}` : ''}
                          {enr.studyCenter?.name ? ` · ${enr.studyCenter.name}` : ''}
                        </p>
                      </div>
                      <span className="text-xs text-muted-foreground shrink-0">
                        {new Date(enr.createdAt).toLocaleDateString('en-IN', { day:'2-digit', month:'short', year:'numeric' })}
                      </span>
                    </div>

                    {/* Remarks */}
                    {(enr.departmentRemarks || enr.financeRemarks || enr.universityRemarks) && (
                      <div className="space-y-1.5">
                        {enr.departmentRemarks && (
                          <div className="text-xs bg-red-50 border border-red-100 rounded p-2">
                            <span className="font-semibold text-red-700">Dept: </span>
                            <span className="text-red-600">{enr.departmentRemarks}</span>
                          </div>
                        )}
                        {enr.financeRemarks && (
                          <div className="text-xs bg-yellow-50 border border-yellow-100 rounded p-2">
                            <span className="font-semibold text-yellow-700">Finance: </span>
                            <span className="text-yellow-600">{enr.financeRemarks}</span>
                          </div>
                        )}
                        {enr.universityRemarks && (
                          <div className="text-xs bg-blue-50 border border-blue-100 rounded p-2">
                            <span className="font-semibold text-blue-700">University: </span>
                            <span className="text-blue-600">{enr.universityRemarks}</span>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Status Timeline */}
                    {history.length > 0 && (
                      <div>
                        <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground mb-2">Status Timeline</p>
                        <div className="relative pl-4 border-l-2 border-muted space-y-2">
                          {history.map((h: any, i: number) => {
                            const rawDate = h.changedAt && !isNaN(new Date(h.changedAt).getTime())
                              ? h.changedAt
                              : enr.createdAt;
                            const displayDate = new Date(rawDate).toLocaleString('en-IN', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });
                            return (
                              <div key={i} className="relative">
                                <div className="absolute -left-[1.35rem] top-1 w-3 h-3 rounded-full bg-primary/20 border-2 border-primary" />
                                <div className="flex items-center justify-between gap-2">
                                  <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold ${STATUS_COLORS[h.status] || 'bg-muted text-muted-foreground'}`}>
                                    {statusLabel(h.status)}
                                  </span>
                                  <span className="text-[11px] text-muted-foreground whitespace-nowrap">
                                    {displayDate}
                                  </span>
                                </div>
                                {h.remarks && <p className="text-xs text-muted-foreground mt-0.5 ml-0.5">{h.remarks}</p>}
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Bulk Change University / Program Dialog */}
      <Dialog open={bulkProgramDialogOpen} onOpenChange={setBulkProgramDialogOpen}>
        <DialogContent className="max-w-md w-full rounded-xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <GraduationCap className="w-5 h-5 text-blue-600" />
              Change University / Program
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <p className="text-sm text-muted-foreground">
              Applying to <span className="font-semibold text-slate-800 dark:text-slate-200">{selectedStudentIds.size}</span> selected student(s).
              Leave a field blank to keep it unchanged.
            </p>

            <div className="space-y-1.5">
              <Label>University</Label>
              <Select value={bulkActionUniversityId} onValueChange={(v) => { setBulkActionUniversityId(v); setBulkActionProgramId(''); }}>
                <SelectTrigger>
                  <SelectValue placeholder="— Keep unchanged —" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">— Keep unchanged —</SelectItem>
                  {universities.filter((u: any) => u?.id).map((u: any) => (
                    <SelectItem key={u.id} value={u.id}>{u.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label>Program</Label>
              <Select value={bulkActionProgramId} onValueChange={setBulkActionProgramId}>
                <SelectTrigger>
                  <SelectValue placeholder="— Keep unchanged —" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">— Keep unchanged —</SelectItem>
                  {programs
                    .filter((p: any) => {
                      if (!bulkActionUniversityId) return true;
                      return p?.universityId === bulkActionUniversityId || p?.university?.id === bulkActionUniversityId;
                    })
                    .filter((p: any) => p?.id)
                    .map((p: any) => (
                      <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex gap-2 pt-2">
              <Button variant="outline" className="flex-1" onClick={() => setBulkProgramDialogOpen(false)} disabled={bulkActionLoading}>
                Cancel
              </Button>
              <Button
                className="flex-1 bg-blue-600 hover:bg-blue-700 text-white"
                onClick={handleBulkUpdateProgram}
                disabled={bulkActionLoading || (!bulkActionUniversityId && !bulkActionProgramId)}
              >
                {bulkActionLoading ? <RefreshCw className="w-4 h-4 animate-spin mr-2" /> : null}
                Apply to {selectedStudentIds.size} Student(s)
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Bulk Record Fee Received Dialog */}
      <Dialog open={bulkPaymentDialogOpen} onOpenChange={setBulkPaymentDialogOpen}>
        <DialogContent className="max-w-md w-full rounded-xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <DollarSign className="w-5 h-5 text-emerald-600" />
              Record Fee Received
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <p className="text-sm text-muted-foreground">
              Recording a manual fee payment for <span className="font-semibold text-slate-800 dark:text-slate-200">{selectedStudentIds.size}</span> selected student(s).
              This will be logged against each student's latest enrollment.
            </p>

            <div className="space-y-1.5">
              <Label htmlFor="bulkFeeAmount">Amount Received (₹) <span className="text-red-500">*</span></Label>
              <Input
                id="bulkFeeAmount"
                type="number"
                min="1"
                placeholder="e.g. 25000"
                value={bulkPaymentAmount}
                onChange={(e) => setBulkPaymentAmount(e.target.value)}
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="bulkFeeNote">Note / Remarks (optional)</Label>
              <Textarea
                id="bulkFeeNote"
                placeholder="e.g. Cash payment received at center"
                value={bulkPaymentNote}
                onChange={(e) => setBulkPaymentNote(e.target.value)}
                rows={3}
              />
            </div>

            <div className="flex gap-2 pt-2">
              <Button variant="outline" className="flex-1" onClick={() => setBulkPaymentDialogOpen(false)} disabled={bulkActionLoading}>
                Cancel
              </Button>
              <Button
                className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white"
                onClick={handleBulkRecordPayment}
                disabled={bulkActionLoading || !bulkPaymentAmount}
              >
                {bulkActionLoading ? <RefreshCw className="w-4 h-4 animate-spin mr-2" /> : null}
                Record for {selectedStudentIds.size} Student(s)
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

    </div>
  );
}
