import { useState, useEffect, useMemo } from 'react';
import { Plus, Edit, Trash2, Mail, Phone, GraduationCap, Upload, Bell, CalendarDays, Calendar, ExternalLink, MessageSquare, Key, Download, User, Users, BookOpen, Building2, FileText, ChevronRight, Search, Eye, TrendingUp, History, CreditCard, CheckSquare, Square, DollarSign, RefreshCw, X, RotateCcw, Filter, ChevronDown, Check, UserCheck, XCircle, AlertCircle, AlertTriangle, CheckCircle2 } from 'lucide-react';
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
import { Popover, PopoverTrigger, PopoverContent } from '@/components/ui/popover';
import { Checkbox } from '@/components/ui/checkbox';
import { cn } from '@/lib/utils';
import api from '@/lib/api';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import { uploadFormFile } from '@/lib/uploadFile';
import { StudentProfilePanel } from './StudentProfilePanel';

interface MultiSelectFilterOption {
  value: string;
  label: string;
  count?: number;
  dotColor?: string;
  avatarText?: string;
}

interface MultiSelectFilterProps {
  label: string;
  icon?: React.ReactNode;
  placeholder: string;
  options: MultiSelectFilterOption[];
  selected: string[];
  onChange: (selected: string[]) => void;
  className?: string;
  triggerClassName?: string;
}

function MultiSelectFilter({
  label,
  icon,
  placeholder,
  options,
  selected,
  onChange,
  className,
  triggerClassName,
}: MultiSelectFilterProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');

  const filteredOptions = useMemo(() => {
    if (!search.trim()) return options;
    const q = search.toLowerCase();
    return options.filter((o) => o.label.toLowerCase().includes(q));
  }, [options, search]);

  const toggleOption = (val: string) => {
    if (selected.includes(val)) {
      onChange(selected.filter((v) => v !== val));
    } else {
      onChange([...selected, val]);
    }
  };

  const handleSelectAll = () => {
    const allValues = options.map((o) => o.value);
    onChange(allValues);
  };

  const handleClear = (e?: React.MouseEvent) => {
    e?.stopPropagation();
    onChange([]);
  };

  const triggerLabel = useMemo(() => {
    if (selected.length === 0) {
      return <span className="text-slate-500 dark:text-slate-400 truncate">{placeholder}</span>;
    }
    if (selected.length === 1) {
      const match = options.find((o) => o.value === selected[0]);
      return (
        <span className="font-medium text-slate-800 dark:text-slate-100 truncate flex items-center gap-1.5">
          {match?.dotColor && <span className={cn('w-2 h-2 rounded-full shrink-0', match.dotColor)} />}
          {match?.avatarText && (
            <span className="w-4 h-4 rounded-full bg-blue-100 dark:bg-blue-900/40 text-[9px] font-bold text-blue-700 dark:text-blue-300 flex items-center justify-center shrink-0">
              {match.avatarText}
            </span>
          )}
          <span className="truncate">{match?.label || selected[0]}</span>
        </span>
      );
    }
    return (
      <span className="font-medium text-slate-800 dark:text-slate-100 truncate flex items-center gap-1.5">
        <span className="truncate">{label}</span>
        <Badge variant="secondary" className="px-1.5 py-0 h-4 text-[10px] font-bold bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300 rounded-full">
          {selected.length}
        </Badge>
      </span>
    );
  }, [selected, options, placeholder, label]);

  return (
    <div className={cn("flex flex-col", className)}>
      <Label className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-2 truncate flex items-center justify-between">
        <span className="flex items-center gap-1 truncate">
          {icon}
          {label}
        </span>
        {selected.length > 0 && (
          <span className="text-[10px] font-bold text-blue-600 dark:text-blue-400 lowercase">
            {selected.length} selected
          </span>
        )}
      </Label>

      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <div
            role="combobox"
            aria-expanded={open}
            tabIndex={0}
            onClick={() => setOpen(!open)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                setOpen(!open);
              }
            }}
            className={cn(
              "h-9 mt-auto px-3 bg-slate-50/50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800 rounded-xl hover:bg-white dark:hover:bg-slate-900 transition-colors flex items-center justify-between gap-1.5 text-sm outline-none focus:ring-2 focus:ring-blue-500/20 cursor-pointer select-none",
              selected.length > 0 && "border-blue-300/80 dark:border-blue-800/80 bg-blue-50/20 dark:bg-blue-950/20",
              triggerClassName
            )}
          >
            <div className="flex items-center gap-1.5 min-w-0 flex-1">
              {triggerLabel}
            </div>

            <div className="flex items-center gap-1 shrink-0 ml-1">
              {selected.length > 0 && (
                <button
                  type="button"
                  onClick={handleClear}
                  className="p-0.5 rounded-full hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 transition-colors"
                  title={`Clear ${label} filter`}
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
              <ChevronDown className={cn("w-3.5 h-3.5 text-slate-400 transition-transform duration-200", open && "rotate-180")} />
            </div>
          </div>
        </PopoverTrigger>

        <PopoverContent className="w-72 p-3 rounded-2xl shadow-xl border-slate-200 dark:border-slate-800" align="start">
          {/* Header */}
          <div className="flex items-center justify-between pb-2 mb-2 border-b border-slate-100 dark:border-slate-800">
            <span className="text-xs font-bold text-slate-700 dark:text-slate-300">
              {label} ({selected.length}/{options.length})
            </span>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleSelectAll}
                className="text-[11px] font-semibold text-blue-600 dark:text-blue-400 hover:underline cursor-pointer"
              >
                Select All
              </button>
              <span className="text-slate-300 dark:text-slate-700 text-xs">•</span>
              <button
                type="button"
                onClick={() => handleClear()}
                disabled={selected.length === 0}
                className={cn(
                  "text-[11px] font-semibold cursor-pointer",
                  selected.length > 0
                    ? "text-red-600 dark:text-red-400 hover:underline"
                    : "text-slate-300 dark:text-slate-600 cursor-not-allowed"
                )}
              >
                Clear
              </button>
            </div>
          </div>

          {/* Search box if options > 4 */}
          {options.length > 4 && (
            <div className="relative mb-2">
              <Search className="absolute left-2.5 top-2 w-3.5 h-3.5 text-slate-400" />
              <Input
                placeholder={`Search ${label.toLowerCase()}...`}
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="h-7 text-xs pl-8 pr-7 rounded-lg bg-slate-50 dark:bg-slate-900/60 border-slate-200 dark:border-slate-800"
              />
              {search && (
                <button
                  type="button"
                  onClick={() => setSearch('')}
                  className="absolute right-2 top-1.5 p-0.5 text-slate-400 hover:text-slate-600 rounded"
                >
                  <X className="w-3 h-3" />
                </button>
              )}
            </div>
          )}

          {/* Options List */}
          <div className="max-h-56 overflow-y-auto space-y-1 pr-1 overscroll-contain">
            {filteredOptions.length === 0 ? (
              <div className="py-4 text-center text-xs text-slate-400">
                No matching {label.toLowerCase()}
              </div>
            ) : (
              filteredOptions.map((opt) => {
                const isChecked = selected.includes(opt.value);
                return (
                  <div
                    key={opt.value}
                    onClick={() => toggleOption(opt.value)}
                    className={cn(
                      "flex items-center justify-between px-2 py-1.5 rounded-lg text-xs cursor-pointer select-none transition-colors",
                      isChecked
                        ? "bg-blue-50/70 text-blue-900 dark:bg-blue-950/40 dark:text-blue-200 font-medium"
                        : "hover:bg-slate-100 dark:hover:bg-slate-800/60 text-slate-700 dark:text-slate-300"
                    )}
                  >
                    <div className="flex items-center gap-2 min-w-0 flex-1 pr-2">
                      <Checkbox
                        checked={isChecked}
                        onCheckedChange={() => toggleOption(opt.value)}
                        className="shrink-0"
                      />
                      {opt.dotColor && (
                        <span className={cn("w-2 h-2 rounded-full shrink-0", opt.dotColor)} />
                      )}
                      {opt.avatarText && (
                        <span className="w-4 h-4 rounded-full bg-blue-100 dark:bg-blue-900/40 text-[9px] font-bold text-blue-700 dark:text-blue-300 flex items-center justify-center shrink-0">
                          {opt.avatarText}
                        </span>
                      )}
                      <span className="truncate">{opt.label}</span>
                    </div>

                    {opt.count !== undefined && (
                      <span className={cn(
                        "text-[10px] font-bold px-1.5 py-0.5 rounded-full shrink-0 ml-1.5",
                        isChecked
                          ? "bg-blue-200/60 text-blue-800 dark:bg-blue-900 dark:text-blue-200"
                          : "bg-slate-100 dark:bg-slate-800 text-slate-400 dark:text-slate-500"
                      )}>
                        {opt.count}
                      </span>
                    )}
                  </div>
                );
              })
            )}
          </div>

          {/* Footer Bar */}
          <div className="mt-2 pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
            <span className="text-[11px] text-slate-400">
              {selected.length} of {options.length} chosen
            </span>
            <Button
              type="button"
              size="sm"
              variant="default"
              onClick={() => setOpen(false)}
              className="h-6 text-xs px-2.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white shadow-none"
            >
              Apply
            </Button>
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
}

interface SavedStudentFilters {
  searchQuery?: string;
  activeFilter?: string;
  filterStatuses?: string[];
  filterUniversityIds?: string[];
  filterBranchIds?: string[];
  filterSalesUsers?: string[];
  filterSessionIds?: string[];
  filterDatePreset?: string;
  filterStartDate?: string;
  filterEndDate?: string;
  sortBy?: string;
}

const getSavedFilters = (key: string): SavedStudentFilters => {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return {};
    return JSON.parse(raw);
  } catch {
    return {};
  }
};

export function StudentsPanel({ triggerOpen, onOpenChange, isSalesMode, completingEnrollment, hideList }: { triggerOpen?: boolean; onOpenChange?: (open: boolean) => void; isSalesMode?: boolean; completingEnrollment?: any; hideList?: boolean } = {}) {
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
  const [bulkExisted, setBulkExisted] = useState<string[]>([]);
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

  const storageKey = isSalesMode ? 'students_panel_filters_sales' : 'students_panel_filters';

  const [activeFilter, setActiveFilter] = useState<string>(() => {
    const saved = getSavedFilters(storageKey);
    return saved.activeFilter || 'all';
  });
  const [filterStatuses, setFilterStatuses] = useState<string[]>(() => {
    const saved = getSavedFilters(storageKey);
    return Array.isArray(saved.filterStatuses) ? saved.filterStatuses : [];
  });
  const [searchQuery, setSearchQuery] = useState(() => {
    const saved = getSavedFilters(storageKey);
    return saved.searchQuery || '';
  });
  const [filterUniversityIds, setFilterUniversityIds] = useState<string[]>(() => {
    const saved = getSavedFilters(storageKey);
    return Array.isArray(saved.filterUniversityIds) ? saved.filterUniversityIds : [];
  });
  const [filterSessionIds, setFilterSessionIds] = useState<string[]>(() => {
    const saved = getSavedFilters(storageKey);
    return Array.isArray(saved.filterSessionIds) ? saved.filterSessionIds : [];
  });
  const [filterBranchIds, setFilterBranchIds] = useState<string[]>(() => {
    const saved = getSavedFilters(storageKey);
    return Array.isArray(saved.filterBranchIds) ? saved.filterBranchIds : [];
  });
  const [filterSalesUsers, setFilterSalesUsers] = useState<string[]>(() => {
    const saved = getSavedFilters(storageKey);
    return Array.isArray(saved.filterSalesUsers) ? saved.filterSalesUsers : [];
  });
  const [sortBy, setSortBy] = useState(() => {
    const saved = getSavedFilters(storageKey);
    return saved.sortBy || 'name';
  });

  // Admission Date Range Filter State
  const [filterDatePreset, setFilterDatePreset] = useState<string>(() => {
    const saved = getSavedFilters(storageKey);
    return saved.filterDatePreset || 'all';
  });
  const [filterStartDate, setFilterStartDate] = useState<string>(() => {
    const saved = getSavedFilters(storageKey);
    return saved.filterStartDate || '';
  });
  const [filterEndDate, setFilterEndDate] = useState<string>(() => {
    const saved = getSavedFilters(storageKey);
    return saved.filterEndDate || '';
  });

  // Save filters to localStorage whenever any filter changes
  useEffect(() => {
    const toSave: SavedStudentFilters = {
      searchQuery,
      activeFilter,
      filterStatuses,
      filterUniversityIds,
      filterBranchIds,
      filterSalesUsers,
      filterSessionIds,
      filterDatePreset,
      filterStartDate,
      filterEndDate,
      sortBy,
    };
    try {
      localStorage.setItem(storageKey, JSON.stringify(toSave));
    } catch (err) {
      console.warn('Failed to save student filters to localStorage', err);
    }
  }, [
    storageKey,
    searchQuery,
    activeFilter,
    filterStatuses,
    filterUniversityIds,
    filterBranchIds,
    filterSalesUsers,
    filterSessionIds,
    filterDatePreset,
    filterStartDate,
    filterEndDate,
    sortBy,
  ]);

  // Pagination State
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 50;

  useEffect(() => {
    setCurrentPage(1);
  }, [activeFilter, filterStatuses, searchQuery, filterUniversityIds, filterSessionIds, filterBranchIds, filterSalesUsers, sortBy, filterStartDate, filterEndDate]);

  // Credentials Dialog State
  const [credDialogOpen, setCredDialogOpen] = useState(false);
  const [credTarget, setCredTarget] = useState<any>(null);
  const [credPassword, setCredPassword] = useState('');
  const [savingCred, setSavingCred] = useState(false);
  const [savingStudent, setSavingStudent] = useState(false);
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
    active: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400 border border-emerald-200/60 dark:border-emerald-800/60',
    document_review: 'bg-blue-100 text-blue-700 dark:bg-blue-950/40 dark:text-blue-400 border border-blue-200/60 dark:border-blue-800/60',
    provisional: 'bg-amber-100 text-amber-800 dark:bg-amber-950/40 dark:text-amber-400 border border-amber-200/60 dark:border-amber-800/60',
    pending: 'bg-orange-100/80 text-orange-700 dark:bg-orange-950/40 dark:text-orange-400 border border-orange-200/60 dark:border-orange-800/60',
    completed: 'bg-purple-100 text-purple-700 dark:bg-purple-950/40 dark:text-purple-400 border border-purple-200/60 dark:border-purple-800/60',
    payment_pending: 'bg-orange-100 text-orange-700 dark:bg-orange-950/40 dark:text-orange-400 border border-orange-200/60 dark:border-orange-800/60',
    receipt_submitted: 'bg-cyan-100 text-cyan-700 dark:bg-cyan-950/40 dark:text-cyan-400 border border-cyan-200/60 dark:border-cyan-800/60',
    dept_review: 'bg-violet-100 text-violet-700 dark:bg-violet-950/40 dark:text-violet-400 border border-violet-200/60 dark:border-violet-800/60',
    finance_review: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-950/40 dark:text-yellow-400 border border-yellow-200/60 dark:border-yellow-800/60',
    sales_admin_review: 'bg-indigo-100 text-indigo-700 dark:bg-indigo-950/40 dark:text-indigo-400 border border-indigo-200/60 dark:border-indigo-800/60',
    university_review: 'bg-sky-100 text-sky-700 dark:bg-sky-950/40 dark:text-sky-400 border border-sky-200/60 dark:border-sky-800/60',
    enrolled: 'bg-teal-100 text-teal-700 dark:bg-teal-950/40 dark:text-teal-400 border border-teal-200/60 dark:border-teal-800/60',
    dropped: 'bg-rose-100 text-rose-700 dark:bg-rose-950/40 dark:text-rose-400 border border-rose-200/60 dark:border-rose-800/60',
    inactive: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-400 border border-slate-200 dark:border-slate-700',
    rejected: 'bg-red-100 text-red-700 dark:bg-red-950/40 dark:text-red-400 border border-red-200/60 dark:border-red-800/60',
    department_rejected: 'bg-red-100 text-red-700 dark:bg-red-950/40 dark:text-red-400 border border-red-200/60 dark:border-red-800/60',
  };

  const statusLabel = (s: string) => {
    if (!s) return 'Unknown';
    if (s === 'receipt_submitted') return 'Receipt Submitted & Ops Pending';
    if (s === 'document_review') return 'Ops Verification Pending';
    if (s === 'dept_review') return 'Dept Review';
    if (s === 'sales_admin_review') return 'Sales Admin Review';
    if (s === 'finance_review') return 'Finance Review';
    if (s === 'university_review') return 'University Review';
    if (s === 'payment_pending') return 'Payment Pending';
    if (s === 'department_rejected') return 'Dept Rejected';
    return s.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
  };

  const getStudentEffectiveDate = (s: any) => {
    if (s?.admissionDate) return { date: s.admissionDate, isAdm: true };
    const initPayDate = (s?.admissionProgress as any)?.initialPaymentDate;
    if (initPayDate) return { date: initPayDate, isAdm: true };
    if (Array.isArray(s?.enrollments) && s.enrollments.length > 0) {
      const sorted = [...s.enrollments].sort((a: any, b: any) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());
      const latest = sorted[0];
      if (latest?.initialPaymentDate) return { date: latest.initialPaymentDate, isAdm: true };
      if (latest?.enrolledAt) return { date: latest.enrolledAt, isAdm: true };
      if (latest?.createdAt) return { date: latest.createdAt, isAdm: false };
    }
    return { date: s?.createdAt, isAdm: false };
  };

  const ALL_STUDENT_STATES = [
    { value: 'all', label: 'All Student States' },
    { value: 'active', label: 'Active' },
    { value: 'document_review', label: 'Ops Review (Document Review)' },
    { value: 'provisional', label: 'Provisional' },
    { value: 'pending', label: 'Pending' },
    { value: 'completed', label: 'Completed / Graduated' },
    { value: 'current', label: 'Current (Non-graduated)' },
    { value: 'previous', label: 'Completed (Previous Students)' },
    { value: 'payment_pending', label: 'Fee / Payment Pending' },
    { value: 'receipt_submitted', label: 'Receipt Submitted' },
    { value: 'dept_review', label: 'Department Review' },
    { value: 'finance_review', label: 'Finance Review' },
    { value: 'sales_admin_review', label: 'Sales Admin Review' },
    { value: 'university_review', label: 'University Review' },
    { value: 'enrolled', label: 'Enrolled' },
    { value: 'dropped', label: 'Dropped' },
    { value: 'inactive', label: 'Inactive' },
    { value: 'rejected', label: 'Rejected' },
    { value: 'department_rejected', label: 'Department Rejected' },
  ];

  const statusCounts = useMemo(() => {
    const counts: Record<string, number> = {
      all: students.length,
      current: 0,
      previous: 0,
      completed: 0,
    };
    students.forEach(s => {
      if (!s) return;
      if (!s.isPrevious) counts.current = (counts.current || 0) + 1;
      if (s.isPrevious) counts.previous = (counts.previous || 0) + 1;
      const st = (s.status || 'pending').toLowerCase();
      counts[st] = (counts[st] || 0) + 1;
    });
    // Ensure completed count reflects all completed/graduated students (status === 'completed' or isPrevious)
    counts.completed = students.filter(s => s && ((s.status || '').toLowerCase() === 'completed' || s.isPrevious)).length;
    return counts;
  }, [students]);

  const availableStatuses = useMemo(() => {
    const knownKeys = new Set(ALL_STUDENT_STATES.map(s => s.value));
    const list = [...ALL_STUDENT_STATES];

    students.forEach(s => {
      if (s && s.status) {
        const lower = s.status.toLowerCase();
        if (!knownKeys.has(lower)) {
          knownKeys.add(lower);
          list.push({
            value: lower,
            label: statusLabel(lower),
          });
        }
      }
    });

    return list.map(item => {
      let count = 0;
      if (item.value === 'all') {
        count = students.length;
      } else if (item.value === 'current') {
        count = students.filter(s => s && !s.isPrevious).length;
      } else if (item.value === 'previous' || item.value === 'completed') {
        count = students.filter(s => s && ((s.status || '').toLowerCase() === 'completed' || s.isPrevious)).length;
      } else {
        count = students.filter(s => s && (s.status || '').toLowerCase() === item.value).length;
      }
      return { ...item, count };
    });
  }, [students]);

  const DATE_PRESETS = [
    { value: 'all', label: 'All Time' },
    { value: 'today', label: 'Today' },
    { value: 'yesterday', label: 'Yesterday' },
    { value: 'this_week', label: 'This Week' },
    { value: 'this_month', label: 'This Month' },
    { value: 'last_month', label: 'Last Month' },
    { value: 'last_90_days', label: 'Last 90 Days' },
    { value: 'this_year', label: 'This Year' },
    { value: 'custom', label: 'Custom Range' },
  ];

  const handleDatePresetSelect = (preset: string) => {
    setFilterDatePreset(preset);
    const now = new Date();
    const pad = (n: number) => String(n).padStart(2, '0');
    const formatYMD = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

    if (preset === 'all') {
      setFilterStartDate('');
      setFilterEndDate('');
    } else if (preset === 'today') {
      const todayStr = formatYMD(now);
      setFilterStartDate(todayStr);
      setFilterEndDate(todayStr);
    } else if (preset === 'yesterday') {
      const yest = new Date(now);
      yest.setDate(yest.getDate() - 1);
      const yestStr = formatYMD(yest);
      setFilterStartDate(yestStr);
      setFilterEndDate(yestStr);
    } else if (preset === 'this_week') {
      const startOfWeek = new Date(now);
      const day = startOfWeek.getDay();
      const diff = startOfWeek.getDate() - day + (day === 0 ? -6 : 1);
      startOfWeek.setDate(diff);
      setFilterStartDate(formatYMD(startOfWeek));
      setFilterEndDate(formatYMD(now));
    } else if (preset === 'this_month') {
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      setFilterStartDate(formatYMD(startOfMonth));
      setFilterEndDate(formatYMD(now));
    } else if (preset === 'last_month') {
      const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      const endOfLastMonth = new Date(now.getFullYear(), now.getMonth(), 0);
      setFilterStartDate(formatYMD(startOfLastMonth));
      setFilterEndDate(formatYMD(endOfLastMonth));
    } else if (preset === 'last_90_days') {
      const d90 = new Date(now);
      d90.setDate(d90.getDate() - 90);
      setFilterStartDate(formatYMD(d90));
      setFilterEndDate(formatYMD(now));
    } else if (preset === 'this_year') {
      const startOfYear = new Date(now.getFullYear(), 0, 1);
      setFilterStartDate(formatYMD(startOfYear));
      setFilterEndDate(formatYMD(now));
    }
  };

  const handleTabChange = (val: string) => {
    setActiveFilter(val);
    if (val === 'all') {
      setFilterStatuses([]);
    } else {
      setFilterStatuses([val]);
    }
  };

  const handleStatusesChange = (newStatuses: string[]) => {
    setFilterStatuses(newStatuses);
    if (newStatuses.length === 0) {
      setActiveFilter('all');
    } else if (newStatuses.length === 1) {
      setActiveFilter(newStatuses[0]);
    } else {
      setActiveFilter('custom');
    }
  };

  const isFiltered =
    searchQuery.trim() !== '' ||
    filterStatuses.length > 0 ||
    filterUniversityIds.length > 0 ||
    filterBranchIds.length > 0 ||
    filterSalesUsers.length > 0 ||
    filterSessionIds.length > 0 ||
    filterStartDate !== '' ||
    filterEndDate !== '';

  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (searchQuery.trim() !== '') count++;
    if (filterStatuses.length > 0) count += filterStatuses.length;
    if (filterUniversityIds.length > 0) count += filterUniversityIds.length;
    if (filterBranchIds.length > 0) count += filterBranchIds.length;
    if (filterSalesUsers.length > 0) count += filterSalesUsers.length;
    if (filterSessionIds.length > 0) count += filterSessionIds.length;
    if (filterStartDate !== '' || filterEndDate !== '') count++;
    return count;
  }, [searchQuery, filterStatuses, filterUniversityIds, filterBranchIds, filterSalesUsers, filterSessionIds, filterStartDate, filterEndDate]);

  const handleResetFilters = () => {
    setSearchQuery('');
    setFilterStatuses([]);
    setActiveFilter('all');
    setFilterUniversityIds([]);
    setFilterBranchIds([]);
    setFilterSalesUsers([]);
    setFilterSessionIds([]);
    setFilterDatePreset('all');
    setFilterStartDate('');
    setFilterEndDate('');
    setSortBy('name');
    try {
      localStorage.removeItem(storageKey);
    } catch {
      // ignore
    }
    toast.success('All filters cleared');
  };

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
    specialisation: '',
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
    paymentPlan: 'full', // 'full' or 'per_year_sem'
    initialPaymentAmount: '',
    initialPaymentDate: '',
  });

  const [upgradeCheck, setUpgradeCheck] = useState<{
    loading: boolean;
    isCompleted?: boolean;
    isInProgress?: boolean;
    canUpgrade?: boolean;
    message?: string;
    studentData?: any;
    previousProgram?: any;
    activeEnrollment?: any;
  } | null>(null);

  const [phoneCheck, setPhoneCheck] = useState<{
    loading: boolean;
    checked: boolean;
    isAvailable?: boolean;
    isCompleted?: boolean;
    isInProgress?: boolean;
    canUpgrade?: boolean;
    message?: string;
    studentData?: any;
    previousProgram?: any;
    activeEnrollment?: any;
  }>({ loading: false, checked: false });

  const [emailCheck, setEmailCheck] = useState<{
    loading: boolean;
    checked: boolean;
    isAvailable?: boolean;
    isCompleted?: boolean;
    isInProgress?: boolean;
    canUpgrade?: boolean;
    message?: string;
    studentData?: any;
    previousProgram?: any;
    activeEnrollment?: any;
  }>({ loading: false, checked: false });

  const [conflictBasis, setConflictBasis] = useState<'none' | 'prompt'>('none');

  const applyStudentDataToForm = (studentData: any, isUpgradeEligible: boolean) => {
    setFormData((prev: any) => ({
      ...prev,
      name: prev.name?.trim() ? prev.name : (studentData.name || ''),
      email: studentData.email || prev.email || '',
      phone: studentData.phone || prev.phone || '',
      ...(isUpgradeEligible ? {
        address: prev.address?.trim() ? prev.address : (studentData.address || ''),
        dob: prev.dob || (studentData.dob ? new Date(studentData.dob).toISOString().split('T')[0] : ''),
        altPhone: prev.altPhone || studentData.altPhone || '',
        pinCode: prev.pinCode || studentData.pinCode || '',
        gender: prev.gender || studentData.gender || '',
        religion: prev.religion || studentData.religion || '',
        caste: prev.caste || studentData.caste || '',
        maritalStatus: prev.maritalStatus || studentData.maritalStatus || '',
        employmentStatus: prev.employmentStatus || studentData.employmentStatus || '',
        fatherName: prev.fatherName || studentData.fatherName || '',
        fatherPhone: prev.fatherPhone || studentData.fatherPhone || '',
        motherName: prev.motherName || studentData.motherName || '',
        motherPhone: prev.motherPhone || studentData.motherPhone || '',
        guardianName: prev.guardianName || studentData.guardianName || '',
        familyPhone: prev.familyPhone || studentData.familyPhone || '',
        photo: prev.photo || studentData.photo || '',
        documents: (studentData.documents && studentData.documents.length) ? studentData.documents : (prev.documents || []),
        isPrevious: true,
        isUpgrade: true,
        existingStudentId: studentData.id
      } : {})
    }));
  };

  const handleChooseBasis = (basis: 'email' | 'phone') => {
    if (basis === 'email') {
      if (emailCheck.studentData) {
        setConflictBasis('none');
        setUpgradeCheck(emailCheck);
        setPhoneCheck(emailCheck);
        applyStudentDataToForm(emailCheck.studentData, Boolean(emailCheck.canUpgrade || emailCheck.isCompleted));
        toast.success(`Switched to ${emailCheck.studentData.name}'s existing record (from Email).`);
      }
    } else {
      // Continue with phone (new student): keep phone, clear email
      setConflictBasis('none');
      setFormData((prev: any) => ({ ...prev, email: '' }));
      setEmailCheck({ loading: false, checked: false });
      if (phoneCheck.isAvailable) {
        setUpgradeCheck(null);
      }
      toast.info(`Please enter a different email address for phone ${formData.phone}.`);
    }
  };

  // 1. Phone availability and matching check
  useEffect(() => {
    if (completingEnrollment || editingId) return;
    const cleanPhone = formData.phone?.trim();

    if (!cleanPhone || cleanPhone.length < 7) {
      setPhoneCheck({ loading: false, checked: false });
      return;
    }

    const timer = setTimeout(async () => {
      try {
        setPhoneCheck(prev => ({ ...prev, loading: true }));
        const res = await api.get('/students/check-unique', {
          params: { phone: cleanPhone, programId: formData.programId || undefined }
        });

        if (res.data) {
          const { isUnique, isCompleted, isInProgress, canUpgrade, studentData, previousProgram, activeEnrollment, message } = res.data;
          if (!isUnique) {
            if (studentData) {
              const matchInfo = {
                loading: false,
                checked: true,
                isAvailable: false,
                isCompleted,
                isInProgress,
                canUpgrade,
                message,
                studentData,
                previousProgram,
                activeEnrollment
              };
              setPhoneCheck(matchInfo);
              setUpgradeCheck(matchInfo);

              // Auto-prefill data from the phone match!
              applyStudentDataToForm(studentData, Boolean(canUpgrade || isCompleted));
            } else {
              setPhoneCheck({
                loading: false,
                checked: true,
                isAvailable: false,
                isCompleted: false,
                isInProgress: false,
                canUpgrade: false,
                message: message || 'This phone number is already registered in the system.',
                studentData: null,
                previousProgram: null,
                activeEnrollment: null
              });
              setUpgradeCheck(null);
            }
          } else {
            setPhoneCheck({
              loading: false,
              checked: true,
              isAvailable: true
            });
            if (!emailCheck.studentData) {
              setUpgradeCheck(null);
            }
          }
        }
      } catch (err) {
        setPhoneCheck({ loading: false, checked: false });
      }
    }, 600);

    return () => clearTimeout(timer);
  }, [formData.phone, completingEnrollment, editingId, formData.programId]);

  // 2. Email availability and matching check (with conflict detection)
  useEffect(() => {
    if (completingEnrollment || editingId) return;
    const cleanEmail = formData.email?.trim();

    if (!cleanEmail || !cleanEmail.includes('@') || cleanEmail.length < 5) {
      setEmailCheck({ loading: false, checked: false });
      setConflictBasis('none');
      return;
    }

    const timer = setTimeout(async () => {
      try {
        setEmailCheck(prev => ({ ...prev, loading: true }));
        const res = await api.get('/students/check-unique', {
          params: { email: cleanEmail, programId: formData.programId || undefined }
        });

        if (res.data) {
          const { isUnique, isCompleted, isInProgress, canUpgrade, studentData, previousProgram, activeEnrollment, message } = res.data;
          if (!isUnique) {
            if (studentData) {
              const matchInfo = {
                loading: false,
                checked: true,
                isAvailable: false,
                isCompleted,
                isInProgress,
                canUpgrade,
                message,
                studentData,
                previousProgram,
                activeEnrollment
              };
              setEmailCheck(matchInfo);

              // Check if this is the SAME student already matched by phone:
              const isSameAsPhoneMatch = phoneCheck.studentData && phoneCheck.studentData.id === studentData.id;
              if (isSameAsPhoneMatch) {
                setConflictBasis('none');
                setUpgradeCheck(matchInfo);
              } else if (phoneCheck.isAvailable || (phoneCheck.studentData && phoneCheck.studentData.id !== studentData.id)) {
                // CONFLICT! Phone is new or different student, but email belongs to an existing student!
                setConflictBasis('prompt');
              } else {
                setUpgradeCheck(matchInfo);
                applyStudentDataToForm(studentData, Boolean(canUpgrade || isCompleted));
              }
            } else {
              setEmailCheck({
                loading: false,
                checked: true,
                isAvailable: false,
                isCompleted: false,
                isInProgress: false,
                canUpgrade: false,
                message: message || 'This email address is already registered in the system.',
                studentData: null,
                previousProgram: null,
                activeEnrollment: null
              });
              setConflictBasis('none');
            }
          } else {
            setEmailCheck({
              loading: false,
              checked: true,
              isAvailable: true
            });
            setConflictBasis('none');
            if (phoneCheck.isAvailable) {
              setUpgradeCheck(null);
            }
          }
        }
      } catch (err) {
        setEmailCheck({ loading: false, checked: false });
      }
    }, 600);

    return () => clearTimeout(timer);
  }, [formData.email, phoneCheck.studentData?.id, phoneCheck.isAvailable, completingEnrollment, editingId, formData.programId]);



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
        ['sales_admin', 'sales_sub_admin'].includes(u.role)
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

  useEffect(() => {
    if (completingEnrollment) {
      const student = completingEnrollment.student || {};
      const docs = (student.documents?.length ? student.documents : completingEnrollment.documents) || [];
      const hasRejectedDocs = docs.some((d: any) => d && d.status === 'rejected');
      const hasRejectedPhoto = (student.admissionProgress as any)?.photoStatus === 'rejected';
      if (hasRejectedDocs) {
        setFormStep(3);
      } else if (hasRejectedPhoto) {
        setFormStep(1);
      }
      setFormData(prev => ({
        ...prev,
        name: completingEnrollment.studentName || student.name || '',
        email: completingEnrollment.studentEmail || student.email || '',
        phone: completingEnrollment.studentPhone || student.phone || '',
        universityId: completingEnrollment.program?.universityId || completingEnrollment.universityId || student.universityId || '',
        programId: completingEnrollment.programId || student.programId || '',
        specialisation: completingEnrollment.specialisation || student.specialisation || '',
        sessionId: completingEnrollment.sessionId || student.sessionId || '',
        centerId: completingEnrollment.studyCenterId || student.centerId || '',
        admissionDate: completingEnrollment.admissionDate ? new Date(completingEnrollment.admissionDate).toISOString().split('T')[0] : (student.admissionDate ? new Date(student.admissionDate).toISOString().split('T')[0] : ''),
        initialPaymentAmount: completingEnrollment.initialPaymentAmount?.toString() || (student.admissionProgress as any)?.initialPaymentAmount || '',
        initialPaymentDate: completingEnrollment.initialPaymentDate ? new Date(completingEnrollment.initialPaymentDate).toISOString().split('T')[0] : ((student.admissionProgress as any)?.initialPaymentDate ? new Date((student.admissionProgress as any).initialPaymentDate).toISOString().split('T')[0] : ''),
        paymentPlan: completingEnrollment.paymentPlan || (student.admissionProgress as any)?.paymentPlan || 'full',
        documents: (student.documents?.length ? student.documents : completingEnrollment.documents) || [],
        photo: student.photo || completingEnrollment.photo || '',
        address: completingEnrollment.studentAddress !== 'To be filled' && completingEnrollment.studentAddress ? completingEnrollment.studentAddress : (student.address || ''),
        dob: student.dob ? new Date(student.dob).toISOString().split('T')[0] : '',
        altPhone: student.altPhone || '',
        pinCode: student.pinCode || '',
        religion: student.religion || '',
        caste: student.caste || '',
        fatherName: student.fatherName || '',
        fatherPhone: student.fatherPhone || '',
        motherName: student.motherName || '',
        motherPhone: student.motherPhone || '',
        receiptUrl: completingEnrollment.receiptUrl || completingEnrollment.provisionalReceiptUrl || (student.enrollments || []).find((e: any) => e.receiptUrl || e.provisionalReceiptUrl)?.receiptUrl || (student.admissionProgress as any)?.receiptUrl || student.receiptUrl || '',
      }));
      // Optionally pre-select the sales user if not in sales mode
      if (completingEnrollment.salesUserId) {
        setSelectedSalesUserId(completingEnrollment.salesUserId);
      }
    }
  }, [completingEnrollment]);

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

  const getEnrollmentConfig = () => {
    const defaultConf = { requiredFields: ['email', 'dob', 'address', 'pinCode', 'fatherName', 'photo'], requiredDocuments: ['Aadhaar Card', 'SSLC Certificate', 'Plus Two Certificate'] };
    const prog = filteredPrograms.find((p: any) => p.id === formData.programId) || completingEnrollment?.program;
    const uConfig = prog?.university?.enrollmentFormConfig || completingEnrollment?.university?.enrollmentFormConfig;
    if (!uConfig) return defaultConf;
    const conf = typeof uConfig === 'string'
      ? JSON.parse(uConfig)
      : uConfig;
    return {
      requiredFields: conf.requiredFields || defaultConf.requiredFields,
      requiredDocuments: conf.requiredDocuments || defaultConf.requiredDocuments
    };
  };

  const isFieldReq = (f: string) => {
    if (['name', 'phone'].includes(f)) return true;
    return getEnrollmentConfig().requiredFields.includes(f);
  };

  const isDocReq = (d: string) => {
    return getEnrollmentConfig().requiredDocuments.some((req: string) =>
      req.toLowerCase() === d.toLowerCase() ||
      (req.toLowerCase() === 'transfer certificate' && d.toLowerCase() === 'tc / migration / affidavit') ||
      (req.toLowerCase() === 'tc / migration / affidavit' && d.toLowerCase() === 'transfer certificate')
    );
  };

  const [verifyingStudentCheck, setVerifyingStudentCheck] = useState(false);

  const isNewStudentWizard = !editingId && !completingEnrollment;
  const stepsList = isNewStudentWizard
    ? [
      { label: 'Verify Student', type: 'verify', icon: UserCheck },
      { label: 'Admission Info', type: 'admission', icon: BookOpen },
      { label: 'Personal Details', type: 'personal', icon: User },
      { label: 'Family Info', type: 'family', icon: Building2 },
      { label: 'Documents', type: 'documents', icon: FileText },
      { label: 'Payment Receipt', type: 'receipt', icon: CreditCard },
    ]
    : [
      { label: 'Admission Info', type: 'admission', icon: BookOpen },
      { label: 'Personal Details', type: 'personal', icon: User },
      { label: 'Family Info', type: 'family', icon: Building2 },
      { label: 'Documents', type: 'documents', icon: FileText },
      { label: 'Payment Receipt', type: 'receipt', icon: CreditCard },
    ];

  const currentStepInfo = stepsList[formStep] || stepsList[0];
  const currentStepType = currentStepInfo?.type || 'admission';
  const maxStepIndex = stepsList.length - 1;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const redirectToStep = (type: 'verify' | 'admission' | 'personal' | 'family' | 'documents' | 'receipt') => {
      const idx = stepsList.findIndex(s => s.type === type);
      if (idx !== -1) setFormStep(idx);
    };

    // If on verification step:
    if (currentStepType === 'verify') {
      const cleanPhone = formData.phone?.trim();
      const cleanEmail = formData.email?.trim();

      if (!cleanPhone) {
        toast.error("Please enter the student's phone number to verify.");
        return;
      }
      if (cleanPhone.replace(/\D/g, '').length < 7) {
        toast.error('Please enter a valid phone number (at least 7 digits)');
        return;
      }
      if (!cleanEmail) {
        toast.error("Please enter the student's email address to verify.");
        return;
      }
      if (!cleanEmail.includes('@') || !cleanEmail.includes('.')) {
        toast.error('Please enter a valid email address');
        return;
      }

      // Check if there is an unresolved basis conflict between email and phone:
      if (conflictBasis === 'prompt') {
        toast.error('Please choose whether to continue with Email or Phone before proceeding.');
        return;
      }

      // If checks are currently loading:
      if (phoneCheck.loading || emailCheck.loading) {
        toast.info('Verifying student details, please wait a moment...');
        return;
      }

      // 0. If taken by another org or staff account: BLOCK!
      if (phoneCheck.checked && !phoneCheck.isAvailable && !phoneCheck.studentData) {
        toast.error(phoneCheck.message || 'This phone number is already registered in the system.');
        return;
      }
      if (emailCheck.checked && !emailCheck.isAvailable && !emailCheck.studentData) {
        toast.error(emailCheck.message || 'This email address is already registered in the system.');
        return;
      }

      // 1. If student already exists and is IN PROGRESS: BLOCK!
      if (upgradeCheck?.isInProgress || phoneCheck.isInProgress || emailCheck.isInProgress) {
        toast.error(upgradeCheck?.message || phoneCheck?.message || emailCheck?.message || 'This student already exists in progress, cannot enroll');
        return;
      }

      // 2. If student is COMPLETED / ELIGIBLE FOR UPGRADE: PREFILL past data and proceed!
      const effectiveMatch = (phoneCheck.studentData && !phoneCheck.isAvailable)
        ? phoneCheck
        : ((emailCheck.studentData && !emailCheck.isAvailable) ? emailCheck : upgradeCheck);

      if (effectiveMatch?.canUpgrade || effectiveMatch?.isCompleted) {
        if (effectiveMatch.studentData) {
          applyStudentDataToForm(effectiveMatch.studentData, true);
        }
        toast.success(`Completed student verified: ${effectiveMatch.studentData?.name || 'Student'}. Previous details prefilled!`);
        redirectToStep('admission');
        return;
      }

      // 3. Fallback immediate check if neither was checked yet
      if (!phoneCheck.checked || !emailCheck.checked) {
        setVerifyingStudentCheck(true);
        try {
          // Check phone
          const pRes = await api.get('/students/check-unique', { params: { phone: cleanPhone } });
          if (pRes.data && !pRes.data.isUnique) {
            if (pRes.data.studentData) {
              const pMatch = pRes.data;
              setPhoneCheck({ loading: false, checked: true, ...pMatch });
              setUpgradeCheck(pMatch);
              applyStudentDataToForm(pMatch.studentData, Boolean(pMatch.canUpgrade || pMatch.isCompleted));

              if (pMatch.isInProgress) {
                toast.error(pMatch.message || 'This student already exists in progress, cannot enroll');
                return;
              }
              if (pMatch.canUpgrade || pMatch.isCompleted) {
                toast.success(`Completed student verified: ${pMatch.studentData?.name || 'Student'}. Previous details prefilled!`);
                redirectToStep('admission');
                return;
              }
            } else {
              setPhoneCheck({ loading: false, checked: true, isAvailable: false, message: pRes.data.message });
              toast.error(pRes.data.message || 'This phone number is already registered in the system.');
              return;
            }
          }

          // Check email
          const eRes = await api.get('/students/check-unique', { params: { email: cleanEmail } });
          if (eRes.data && !eRes.data.isUnique) {
            if (eRes.data.studentData) {
              const eMatch = eRes.data;
              setEmailCheck({ loading: false, checked: true, ...eMatch });

              // Conflict check
              if (pRes.data?.isUnique || (pRes.data?.studentData && pRes.data.studentData.id !== eMatch.studentData.id)) {
                setConflictBasis('prompt');
                toast.error('Email ID is registered to an existing student. Please select which basis to continue.');
                return;
              }

              if (eMatch.isInProgress) {
                toast.error(eMatch.message || 'This student already exists in progress, cannot enroll');
                return;
              }
              if (eMatch.canUpgrade || eMatch.isCompleted) {
                setUpgradeCheck(eMatch);
                applyStudentDataToForm(eMatch.studentData, true);
                toast.success(`Completed student verified: ${eMatch.studentData?.name || 'Student'}. Previous details prefilled!`);
                redirectToStep('admission');
                return;
              }
            } else {
              setEmailCheck({ loading: false, checked: true, isAvailable: false, message: eRes.data.message });
              toast.error(eRes.data.message || 'This email address is already registered in the system.');
              return;
            }
          }
        } catch (err: any) {
          console.error('Failed to verify student details:', err);
          toast.error(err.response?.data?.message || 'Failed to verify student details');
          return;
        } finally {
          setVerifyingStudentCheck(false);
        }
      }

      // 4. If student is NEW (both phone and email available)
      if (!formData.name?.trim()) {
        toast.error("Please enter the student's full name to continue.");
        return;
      }

      toast.info('New student verified. Please select admission details.');
      redirectToStep('admission');
      return;
    }

    // If we're not on the final step, just advance to the next step.
    if (formStep < maxStepIndex) {
      setFormStep(formStep + 1);
      return;
    }

    if (!formData.programId || formData.programId.trim() === '') {
      toast.error('Please select a Program');
      redirectToStep('admission');
      return;
    }
    if (isFieldReq('photo') && (!formData.photo || formData.photo.trim() === '')) {
      toast.error('Please upload a Student Photo');
      redirectToStep('personal');
      return;
    }
    const requiredDocs = getEnrollmentConfig().requiredDocuments;
    const missingDocs = requiredDocs.filter((docType: string) => {
      const doc = (formData.documents || []).find((d: any) =>
        d.type.toLowerCase() === docType.toLowerCase() ||
        (docType.toLowerCase() === 'transfer certificate' && d.type.toLowerCase() === 'tc / migration / affidavit') ||
        (docType.toLowerCase() === 'tc / migration / affidavit' && d.type.toLowerCase() === 'transfer certificate')
      );
      return !doc || !doc.url;
    });
    if (missingDocs.length > 0) {
      toast.error(`Please upload all required documents. Missing: ${missingDocs.join(', ')}`);
      redirectToStep('documents');
      return;
    }
    const unreplacedRejectedDocs = (formData.documents || []).filter((d: any) => d && d.status === 'rejected');
    if (unreplacedRejectedDocs.length > 0) {
      toast.error(`Please re-upload rejected documents: ${unreplacedRejectedDocs.map((d: any) => d.type).join(', ')}`);
      redirectToStep('documents');
      return;
    }
    // Receipt is mandatory for new students (unless marked as previous student) or when completing an enrollment
    const isReceiptMandatory = Boolean(completingEnrollment) || (!editingId && !formData.isPrevious);
    if (isReceiptMandatory && (!formData.receiptUrl || formData.receiptUrl.trim() === '')) {
      toast.error('Please upload the Fee Payment Receipt');
      redirectToStep('receipt');
      return;
    }
    if (!formData.isPrevious && !editingId && getActiveFeeStructure()) {
      if (!formData.initialPaymentAmount || Number(formData.initialPaymentAmount) <= 0) {
        toast.error('Please enter the Initial Fee Amount');
        redirectToStep('admission');
        return;
      }

      if (!formData.initialPaymentDate || formData.initialPaymentDate.trim() === '') {
        toast.error('Please enter the Payment Date for the initial fee');
        redirectToStep('admission');
        return;
      }
    }
    setSavingStudent(true);
    try {
      if (completingEnrollment) {
        const completeRes = await api.put(`/enrollment/${completingEnrollment.id}/provisional-complete`, formData);
        const isProv = !!completingEnrollment.isProvisional;
        const isUpgrade = Boolean(completingEnrollment.isUpgrade || completeRes.data?.data?.isUpgrade);
        if (isUpgrade) {
          toast.success('Upgrade documents re-uploaded and sent to Operations for verification');
        } else {
          const sentTo = completeRes.data?.data?.status === 'sales_admin_review' ? 'Sales Admin for approval' : 'Operations for review';
          if (isProv) {
            toast.success(`Provisional enrollment completed successfully and submitted to ${sentTo}`);
          } else {
            toast.success(`Documents re-uploaded successfully and submitted to ${sentTo}`);
          }
        }
      } else if (editingId) {
        await api.put(`/students/${editingId}`, formData);
        toast.success('Student updated successfully');
      } else {
        const isUpgrade = Boolean(upgradeCheck?.canUpgrade || upgradeCheck?.isCompleted || formData.isUpgrade);
        const payload = {
          ...formData,
          isPipelineApplication: true,
          isUpgrade,
          existingStudentId: upgradeCheck?.studentData?.id || formData.existingStudentId
        };
        await api.post('/students', payload);
        toast.success(isUpgrade ? 'Upgrade application submitted directly to Operations for verification' : 'Student added successfully and sent to pipeline for review');
      }
      handleDialogOpenChange(false);
      resetForm();
      fetchStudents();
    } catch (error: any) {
      console.error('Failed to save student:', error);
      toast.error(error.response?.data?.message || 'Failed to save student');
    } finally {
      setSavingStudent(false);
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

    const enrollmentWithReceipt = (student.enrollments || []).find((e: any) => e.receiptUrl || e.provisionalReceiptUrl);
    const latestEnrollment = (student.enrollments && student.enrollments.length > 0)
      ? student.enrollments[student.enrollments.length - 1]
      : null;
    const resolvedEnrollment = enrollmentWithReceipt || latestEnrollment;

    const resolvedReceiptUrl =
      resolvedEnrollment?.receiptUrl ||
      resolvedEnrollment?.provisionalReceiptUrl ||
      (student.admissionProgress as any)?.receiptUrl ||
      (student.documents || []).find((d: any) => d.type?.toLowerCase() === 'receipt')?.url ||
      student.receiptUrl ||
      '';

    const resolvedPaymentPlan =
      (student.admissionProgress as any)?.paymentPlan ||
      resolvedEnrollment?.paymentPlan ||
      'full';

    const resolvedInitialPaymentAmount =
      (student.admissionProgress as any)?.initialPaymentAmount ??
      resolvedEnrollment?.initialPaymentAmount ??
      '';

    const rawInitialDate =
      (student.admissionProgress as any)?.initialPaymentDate ||
      resolvedEnrollment?.initialPaymentDate;

    const resolvedInitialPaymentDate = rawInitialDate
      ? new Date(rawInitialDate).toISOString().split('T')[0]
      : '';

    setEditingId(studentId);
    setFormStep(0);
    setFormData({
      isPrevious: student.isPrevious || false,
      branchId: branchId?.toString() || '',
      universityId: universityId?.toString() || '',
      programId: programId?.toString() || '',
      specialisation: student.specialisation || '',
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
      receiptUrl: resolvedReceiptUrl,
      centerId: centerId?.toString() || '',
      paymentPlan: resolvedPaymentPlan,
      initialPaymentAmount: resolvedInitialPaymentAmount,
      initialPaymentDate: resolvedInitialPaymentDate,
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
    } catch (error: any) {
      if (error?.message === 'DELETE_REQUESTED_NOT_COMPLETED' || error?.isDeleteRequest) return;
      console.error('Failed to delete student:', error);
      toast.error('Failed to delete student');
    }
  };

  const resetForm = () => {
    setEditingId(null);
    setFormStep(0);
    setUpgradeCheck(null);
    setPhoneCheck({ loading: false, checked: false });
    setEmailCheck({ loading: false, checked: false });
    setConflictBasis('none');
    setVerifyingStudentCheck(false);
    setCustomOtherName('');
    setFormData({
      isPrevious: false,
      branchId: '',
      universityId: '',
      programId: '',
      specialisation: '',
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

  const getActiveFeeStructure = () => {
    const selectedProgramObj = filteredPrograms.find((p: any) => p.id === formData.programId);
    let relevantFeeStructure = null;

    if (selectedProgramObj?.feeStructures?.length > 0) {
      // First try to match both session and specialisation
      relevantFeeStructure = selectedProgramObj.feeStructures.find((f: any) =>
        f.sessionId === formData.sessionId &&
        (f.specialisation || null) === (formData.specialisation || null)
      );

      // Fallback: match only specialisation (null session)
      if (!relevantFeeStructure) {
        relevantFeeStructure = selectedProgramObj.feeStructures.find((f: any) =>
          !f.sessionId &&
          (f.specialisation || null) === (formData.specialisation || null)
        );
      }

      // Fallback: match only session (null specialisation)
      if (!relevantFeeStructure) {
        relevantFeeStructure = selectedProgramObj.feeStructures.find((f: any) =>
          f.sessionId === formData.sessionId &&
          !f.specialisation
        );
      }

      // Fallback: match null session and null specialisation
      if (!relevantFeeStructure) {
        relevantFeeStructure = selectedProgramObj.feeStructures.find((f: any) =>
          !f.sessionId && !f.specialisation
        );
      }

      if (!relevantFeeStructure) {
        relevantFeeStructure = selectedProgramObj.feeStructures[0];
      }
    }
    return relevantFeeStructure;
  };

  const renderFeeDisplay = () => {
    const relevantFeeStructure = getActiveFeeStructure();

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

  // Export Students Data in Excel
  const [isExporting, setIsExporting] = useState(false);

  const handleExportExcel = async () => {
    const dataToExport = selectedStudentIds.size > 0
      ? filteredStudents.filter(s => selectedStudentIds.has(s.id))
      : filteredStudents;

    if (dataToExport.length === 0) {
      toast.warning('No student data available to export.');
      return;
    }

    setIsExporting(true);
    const toastId = toast.loading(`Exporting ${dataToExport.length} student(s) to Excel...`);

    try {
      const XLSX = await import('xlsx');

      const formatDate = (dateStr?: string | null) => {
        if (!dateStr) return '';
        try {
          const d = new Date(dateStr);
          if (isNaN(d.getTime())) return '';
          return d.toISOString().split('T')[0];
        } catch {
          return '';
        }
      };

      const calculateStudentPaidFees = (s: any): number => {
        let totalPaid = 0;
        const countedScheduleIds = new Set<string>();

        // 1. Payment Schedules with status 'paid'
        if (Array.isArray(s.paymentSchedules)) {
          s.paymentSchedules.forEach((ps: any) => {
            if ((ps.status || '').toLowerCase() === 'paid') {
              totalPaid += Number(ps.amount) || 0;
              if (ps.id) countedScheduleIds.add(ps.id);
            }
          });
        }

        // 2. Invoices with recorded payments
        if (Array.isArray(s.invoices)) {
          s.invoices.forEach((inv: any) => {
            if (inv.scheduleId && countedScheduleIds.has(inv.scheduleId)) {
              return;
            }
            if (Array.isArray(inv.payments) && inv.payments.length > 0) {
              inv.payments.forEach((p: any) => {
                totalPaid += Number(p.amount) || 0;
              });
            } else if ((inv.status || '').toLowerCase() === 'paid') {
              totalPaid += Number(inv.total || inv.amount || 0);
            }
          });
        }

        // 3. Enrollment initial payments & admissionProgress payments (if not already invoiced or scheduled)
        const hasInitialInvoiceOrSchedule =
          (Array.isArray(s.invoices) && s.invoices.some((inv: any) =>
            (inv.invoiceNo?.startsWith('INV-AUTO') ||
             inv.invoiceNo?.startsWith('INV-PROV') ||
             (inv.notes || '').toLowerCase().includes('initial') ||
             (inv.notes || '').toLowerCase().includes('admission') ||
             (inv.notes || '').toLowerCase().includes('provisional')) &&
            ((inv.payments && inv.payments.length > 0) || (inv.status || '').toLowerCase() === 'paid')
          )) ||
          (Array.isArray(s.paymentSchedules) && s.paymentSchedules.some((ps: any) =>
            ((ps.title || '').toLowerCase().includes('admission') || (ps.title || '').toLowerCase().includes('initial')) &&
            (ps.status || '').toLowerCase() === 'paid'
          ));

        if (!hasInitialInvoiceOrSchedule) {
          let enrollmentInitial = 0;
          if (Array.isArray(s.enrollments) && s.enrollments.length > 0) {
            for (const enr of s.enrollments) {
              if (enr.payment && typeof enr.payment.amount === 'number') {
                enrollmentInitial = Math.max(enrollmentInitial, Number(enr.payment.amount) || 0);
              } else if (enr.initialPaymentAmount && Number(enr.initialPaymentAmount) > 0) {
                enrollmentInitial = Math.max(enrollmentInitial, Number(enr.initialPaymentAmount) || 0);
              }
            }
          }
          // Also check student.admissionProgress.initialPaymentAmount
          const admInitAmount = Number((s.admissionProgress as any)?.initialPaymentAmount) || 0;
          const finalInitial = Math.max(enrollmentInitial, admInitAmount);
          totalPaid += finalInitial;
        }

        return Math.round(totalPaid * 100) / 100;
      };

      const rows = dataToExport.map((s, idx) => {
        const centerName = typeof s.centerId === 'object' ? s.centerId?.name : (s.center?.name || centers.find((c: any) => c.id === s.centerId)?.name || '');
        const programName = typeof s.programId === 'object' ? s.programId?.name : (s.program?.name || programs.find((p: any) => p.id === s.programId)?.name || '');
        const universityName = typeof s.universityId === 'object' ? s.universityId?.name : (s.university?.name || universities.find((u: any) => u.id === s.universityId)?.name || '');
        const branchName = typeof s.branchId === 'object' ? s.branchId?.name : (s.branch?.name || branches.find((b: any) => b.id === s.branchId)?.name || '');
        const sessionName = typeof s.sessionId === 'object' ? s.sessionId?.name : (s.session?.name || sessions.find((ses: any) => ses.id === s.sessionId)?.name || '');
        const salesUserName = typeof s.enrolledBy === 'object' ? s.enrolledBy?.name : (s.enrolledByUser?.name || salesUsers.find((su: any) => su.id === s.enrolledBy)?.name || '');

        return {
          'Sl No': idx + 1,
          'Admission No': s.admissionNo || '',
          'Enrollment No': s.enrollmentNo || '',
          'Student Name': s.name || '',
          'Email': s.email || '',
          'Phone': s.phone || '',
          'Alt Phone': s.altPhone || '',
          'Status': s.status ? (s.status.charAt(0).toUpperCase() + s.status.slice(1)) : '',
          'University': universityName,
          'Program': programName,
          'Specialisation': s.specialisation || '',
          'Academic Session': sessionName,
          'Branch': branchName,
          'Study Center': centerName,
          'Counselor / Enrolled By': salesUserName,
          'Paid Fees': calculateStudentPaidFees(s),
          'Admission Date': formatDate(s.admissionDate),
          'Date of Birth': formatDate(s.dob),
          'Gender': s.gender || '',
          'Father Name': s.fatherName || '',
          'Mother Name': s.motherName || '',
          'Address': s.address && s.address !== 'To be filled' ? s.address : '',
          'Pin Code': s.pinCode || '',
          'Created At': formatDate(s.createdAt)
        };
      });

      const worksheet = XLSX.utils.json_to_sheet(rows);

      // Set generous column widths
      worksheet['!cols'] = [
        { wch: 8 },  // Sl No
        { wch: 16 }, // Admission No
        { wch: 18 }, // Enrollment No
        { wch: 25 }, // Student Name
        { wch: 28 }, // Email
        { wch: 15 }, // Phone
        { wch: 15 }, // Alt Phone
        { wch: 14 }, // Status
        { wch: 26 }, // University
        { wch: 26 }, // Program
        { wch: 20 }, // Specialisation
        { wch: 18 }, // Academic Session
        { wch: 18 }, // Branch
        { wch: 22 }, // Study Center
        { wch: 22 }, // Counselor / Enrolled By
        { wch: 15 }, // Paid Fees
        { wch: 14 }, // Admission Date
        { wch: 14 }, // Date of Birth
        { wch: 10 }, // Gender
        { wch: 20 }, // Father Name
        { wch: 20 }, // Mother Name
        { wch: 30 }, // Address
        { wch: 12 }, // Pin Code
        { wch: 14 }  // Created At
      ];

      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, 'Students');

      const today = new Date().toISOString().split('T')[0];
      const fileName = selectedStudentIds.size > 0
        ? `students_selected_${dataToExport.length}_${today}.xlsx`
        : `students_export_${today}.xlsx`;

      XLSX.writeFile(workbook, fileName);
      toast.success(`Exported ${dataToExport.length} student(s) to Excel!`, { id: toastId });
    } catch (err: any) {
      console.error('Failed to export students to Excel:', err);
      toast.error('Failed to export student data. Please try again.', { id: toastId });
    } finally {
      setIsExporting(false);
    }
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
          univSessions = sessions.filter(sess =>
            sess.universityId === matchedUniv.id ||
            (sess.programId && programs.find((p: any) => p.id === sess.programId)?.universityId === matchedUniv.id)
          );
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
    setBulkExisted([]);
    try {
      const res = await api.post('/students/bulk-import', {
        students: studentPayload,
        isPrevious: bulkIsPrevious,
        branchId: selectedBranchId || undefined,
        salesUserId: selectedSalesUserId === 'none' ? undefined : selectedSalesUserId
      });
      const { imported, skipped, errors, existed } = res.data.data;
      if (existed?.length > 0) setBulkExisted(existed);
      if (errors?.length > 0) setBulkErrors(errors);
      if (skipped > 0 && (errors?.length > 0 || existed?.length > 0)) {
        toast.warning(`Imported ${imported} student(s). ${skipped} row(s) skipped — see details below.`);
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

  const STATE_DOT_COLORS: Record<string, string> = {
    active: 'bg-emerald-500',
    document_review: 'bg-blue-500',
    provisional: 'bg-amber-500',
    pending: 'bg-orange-500',
    completed: 'bg-purple-500',
    current: 'bg-emerald-600',
    previous: 'bg-purple-600',
    payment_pending: 'bg-orange-500',
    receipt_submitted: 'bg-cyan-500',
    dept_review: 'bg-violet-500',
    finance_review: 'bg-yellow-500',
    sales_admin_review: 'bg-indigo-500',
    university_review: 'bg-sky-500',
    enrolled: 'bg-teal-500',
    dropped: 'bg-rose-500',
    inactive: 'bg-slate-400',
    rejected: 'bg-red-500',
    department_rejected: 'bg-red-600',
  };

  const stateOptions = useMemo(() => {
    return availableStatuses
      .filter((st) => st.value !== 'all')
      .map((st) => ({
        value: st.value,
        label: st.label,
        count: st.count,
        dotColor: STATE_DOT_COLORS[st.value] || 'bg-slate-400',
      }));
  }, [availableStatuses]);

  const universityOptions = useMemo(() => {
    return universities
      .filter((u: any) => u && u.id)
      .map((u: any) => {
        const count = students.filter((s) => {
          if (!s) return false;
          const uId =
            s.universityId ||
            (typeof s.program === 'object' ? s.program?.universityId : null) ||
            (typeof s.programId === 'object' ? s.programId?.universityId : null);
          return uId === u.id;
        }).length;
        return {
          value: u.id,
          label: u.name || 'Unnamed University',
          count,
        };
      });
  }, [universities, students]);

  const branchOptions = useMemo(() => {
    return branches
      .filter((b: any) => b && b.id)
      .map((b: any) => {
        const count = students.filter((s) => {
          if (!s) return false;
          const bId = typeof s.branchId === 'object' ? s.branchId?.id : s.branchId;
          return bId === b.id;
        }).length;
        return {
          value: b.id,
          label: b.name || 'Unnamed Branch',
          count,
        };
      });
  }, [branches, students]);

  const salesUserOptions = useMemo(() => {
    return salesUsers
      .filter((su: any) => su && su.id)
      .map((su: any) => {
        const count = students.filter((s) => {
          if (!s) return false;
          const sUser =
            typeof s.enrolledBy === 'object' ? s.enrolledBy?.id : (s.enrolledBy || s.enrolledByUser?.id);
          return sUser === su.id;
        }).length;
        return {
          value: su.id,
          label: su.name || 'Unnamed Counselor',
          avatarText: (su.name || 'U').charAt(0).toUpperCase(),
          count,
        };
      });
  }, [salesUsers, students]);

  const sessionOptions = useMemo(() => {
    return sessions
      .filter((sess: any) => sess && sess.id)
      .map((sess: any) => {
        const count = students.filter((s) => {
          if (!s) return false;
          const sId = typeof s.sessionId === 'object' ? s.sessionId?.id : s.sessionId;
          if (sId === sess.id) return true;
          if (s.session && String(s.session).toLowerCase() === String(sess.name).toLowerCase()) return true;
          return false;
        }).length;
        return {
          value: sess.id,
          label: sess.name || 'Unnamed Session',
          count,
        };
      });
  }, [sessions, students]);

  const filteredStudents = students.filter(s => {
    if (!s) return false;

    // Status / State filter (multi-select)
    if (filterStatuses.length > 0) {
      const matchesStatus = filterStatuses.some((st) => {
        if (st === 'current') return !s.isPrevious;
        if (st === 'previous') return !!s.isPrevious;
        if (st === 'completed') return (s.status || '').toLowerCase() === 'completed' || !!s.isPrevious;
        return (s.status || '').toLowerCase() === st.toLowerCase();
      });
      if (!matchesStatus) return false;
    } else {
      // Fallback to activeFilter if filterStatuses is empty but activeFilter is set to specific tab
      if (activeFilter === 'current' && s.isPrevious) return false;
      if (activeFilter === 'previous' && !s.isPrevious) return false;
      if (activeFilter === 'completed' && (s.status || '').toLowerCase() !== 'completed' && !s.isPrevious) return false;
      if (activeFilter !== 'all' && activeFilter !== 'current' && activeFilter !== 'previous' && activeFilter !== 'completed' && activeFilter !== 'custom') {
        if ((s.status || '').toLowerCase() !== activeFilter.toLowerCase()) return false;
      }
    }

    // Admission Date Range Filter
    if (filterStartDate || filterEndDate) {
      const rawDate = getStudentEffectiveDate(s).date;
      if (!rawDate) return false;
      try {
        const d = new Date(rawDate);
        if (isNaN(d.getTime())) return false;
        const pad = (n: number) => String(n).padStart(2, '0');
        const sDateStr = `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

        if (filterStartDate && sDateStr < filterStartDate) return false;
        if (filterEndDate && sDateStr > filterEndDate) return false;
      } catch {
        return false;
      }
    }

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

    // University Filter (multi-select)
    if (filterUniversityIds.length > 0) {
      const uId = s.universityId ||
        (typeof s.program === 'object' ? s.program?.universityId : null) ||
        (typeof s.programId === 'object' ? s.programId?.universityId : null);
      if (!uId || !filterUniversityIds.includes(uId)) return false;
    }

    // Branch Filter (multi-select)
    if (filterBranchIds.length > 0) {
      const bId = typeof s.branchId === 'object' ? s.branchId?.id : s.branchId;
      if (!bId || !filterBranchIds.includes(bId)) return false;
    }

    // Sales User Filter (multi-select)
    if (filterSalesUsers.length > 0) {
      const suId = typeof s.enrolledBy === 'object' ? s.enrolledBy?.id : (s.enrolledBy || s.enrolledByUser?.id);
      if (!suId || !filterSalesUsers.includes(suId)) return false;
    }

    // Session Filter (multi-select)
    if (filterSessionIds.length > 0) {
      const sId = typeof s.sessionId === 'object' ? s.sessionId?.id : s.sessionId;
      const matchesSession = filterSessionIds.some((selId) => {
        if (sId === selId) return true;
        // also fallback to match session name if s.session string is present
        const selectedSession = sessions.find((sess: any) => sess.id === selId);
        if (selectedSession && s.session) {
          return String(s.session).toLowerCase() === String(selectedSession.name).toLowerCase();
        }
        return false;
      });
      if (!matchesSession) return false;
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
    } else if (sortBy === 'admissionDate_desc') {
      const dateA = new Date(getStudentEffectiveDate(a).date || 0).getTime();
      const dateB = new Date(getStudentEffectiveDate(b).date || 0).getTime();
      return dateB - dateA;
    } else if (sortBy === 'admissionDate_asc') {
      const dateA = new Date(getStudentEffectiveDate(a).date || 0).getTime();
      const dateB = new Date(getStudentEffectiveDate(b).date || 0).getTime();
      return dateA - dateB;
    } else {
      // Default to sorting by name
      const nameA = a.name || '';
      const nameB = b.name || '';
      return nameA.localeCompare(nameB);
    }
  });

  const totalPages = Math.max(1, Math.ceil(filteredStudents.length / itemsPerPage));
  const paginatedStudents = filteredStudents.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  const renderStudentFormModalContent = () => (
    <DialogContent className="max-w-3xl w-full sm:max-w-3xl h-[100dvh] sm:h-auto sm:max-h-[92vh] flex flex-col rounded-none sm:rounded-xl">
      <DialogHeader className="pb-2 border-b">
        <DialogTitle className="text-lg">{editingId || completingEnrollment ? 'Update Student Enrollment' : 'Add New Student Record'}</DialogTitle>
        {/* Step indicator */}
        <div className="flex items-center gap-1 pt-2 overflow-x-auto pb-1">
          {stepsList.map((step, i) => (
            <button
              key={i}
              type="button"
              onClick={() => {
                if (isNewStudentWizard && formStep === 0 && i > 0) {
                  const hasPhone = Boolean(formData.phone?.trim() && formData.phone.trim().replace(/\D/g, '').length >= 7);
                  const hasEmail = Boolean(formData.email?.trim() && formData.email.includes('@'));
                  if (!hasPhone || !hasEmail) {
                    toast.error('Please enter valid student phone number and email address before continuing');
                    return;
                  }
                  if (conflictBasis === 'prompt') {
                    toast.error('Please resolve the email/phone conflict before continuing');
                    return;
                  }
                  if (upgradeCheck?.isInProgress || phoneCheck.isInProgress || emailCheck.isInProgress) {
                    toast.error('This student already exists in progress, cannot enroll');
                    return;
                  }
                }
                setFormStep(i);
              }}
              className={`flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-medium transition-all shrink-0 ${formStep === i
                ? 'bg-primary text-primary-foreground shadow'
                : 'bg-slate-100 dark:bg-slate-800 text-muted-foreground hover:bg-slate-200 dark:hover:bg-slate-700'
                }`}
            >
              <step.icon className="w-3 h-3" />
              {step.label}
            </button>
          ))}
        </div>
      </DialogHeader>

      <form onSubmit={handleSubmit} className="flex flex-col flex-1 min-h-0 overflow-hidden">
        <div className="flex-1 overflow-y-auto pr-2 max-h-[60vh] space-y-4 py-3">

          {/* ── STEP 0: STUDENT VERIFICATION (FOR NEW ENROLLMENTS) ── */}
          {currentStepType === 'verify' && (
            <div className="space-y-5 animate-in fade-in duration-200">
              <div className="p-4 rounded-xl border border-blue-200 bg-blue-50/70 dark:bg-blue-950/30 dark:border-blue-900">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-blue-100 dark:bg-blue-900 text-blue-600 dark:text-blue-300 rounded-lg">
                    <UserCheck className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-blue-900 dark:text-blue-200 text-sm">Step 1: Student Verification</h3>
                    <p className="text-xs text-blue-700 dark:text-blue-400 mt-0.5">
                      Enter the phone number to check availability. If existing, student data is prefilled. If unique, continue with email.
                    </p>
                  </div>
                </div>
              </div>

              {/* Sequential Inputs: Phone Number, Email ID, Full Name */}
              <div className="space-y-4">
                {/* 1. Phone Input */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <Label className="font-medium flex items-center gap-1.5 text-sm">
                      <Phone className="w-4 h-4 text-primary" /> Phone Number <span className="text-rose-500">*</span>
                    </Label>
                    {phoneCheck.loading && (
                      <span className="text-xs text-muted-foreground flex items-center gap-1">
                        <RefreshCw className="w-3 h-3 animate-spin text-primary" /> Checking availability...
                      </span>
                    )}
                    {!phoneCheck.loading && phoneCheck.checked && phoneCheck.isAvailable && (
                      <Badge variant="outline" className="text-emerald-700 bg-emerald-50 dark:bg-emerald-950/40 border-emerald-300 text-[11px] font-semibold flex items-center gap-1">
                        <CheckCircle2 className="w-3 h-3 text-emerald-600" /> Phone Available
                      </Badge>
                    )}
                    {!phoneCheck.loading && phoneCheck.checked && !phoneCheck.isAvailable && phoneCheck.studentData && (
                      <Badge variant="outline" className="text-blue-700 bg-blue-50 dark:bg-blue-950/40 border-blue-300 text-[11px] font-semibold flex items-center gap-1">
                        <UserCheck className="w-3 h-3 text-blue-600" /> Existing: {phoneCheck.studentData.name}
                      </Badge>
                    )}
                    {!phoneCheck.loading && phoneCheck.checked && !phoneCheck.isAvailable && !phoneCheck.studentData && (
                      <Badge variant="outline" className="text-rose-700 bg-rose-50 dark:bg-rose-950/40 border-rose-300 text-[11px] font-semibold flex items-center gap-1">
                        <AlertTriangle className="w-3 h-3 text-rose-600" /> Phone Already Taken
                      </Badge>
                    )}
                  </div>
                  <Input
                    className="h-11 font-medium text-sm"
                    placeholder="e.g. 9876543210"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  />
                  <p className="text-[11px] text-muted-foreground">
                    Primary mobile number to verify availability or auto-fill existing student record
                  </p>
                </div>

                {/* 2. Email Input */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <Label className="font-medium flex items-center gap-1.5 text-sm">
                      <Mail className="w-4 h-4 text-primary" /> Email Address <span className="text-rose-500">*</span>
                      {phoneCheck.studentData?.email && formData.email === phoneCheck.studentData.email && (
                        <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-semibold">(auto-prefilled)</span>
                      )}
                    </Label>
                    {emailCheck.loading && (
                      <span className="text-xs text-muted-foreground flex items-center gap-1">
                        <RefreshCw className="w-3 h-3 animate-spin text-primary" /> Checking availability...
                      </span>
                    )}
                    {!emailCheck.loading && emailCheck.checked && emailCheck.isAvailable && (
                      <Badge variant="outline" className="text-emerald-700 bg-emerald-50 dark:bg-emerald-950/40 border-emerald-300 text-[11px] font-semibold flex items-center gap-1">
                        <CheckCircle2 className="w-3 h-3 text-emerald-600" /> Email Available
                      </Badge>
                    )}
                    {!emailCheck.loading && emailCheck.checked && !emailCheck.isAvailable && emailCheck.studentData && conflictBasis === 'prompt' && (
                      <Badge variant="outline" className="text-amber-800 bg-amber-50 dark:bg-amber-950/40 border-amber-300 text-[11px] font-semibold flex items-center gap-1">
                        <AlertTriangle className="w-3 h-3 text-amber-600" /> Email Already Taken
                      </Badge>
                    )}
                    {!emailCheck.loading && emailCheck.checked && !emailCheck.isAvailable && !emailCheck.studentData && (
                      <Badge variant="outline" className="text-rose-700 bg-rose-50 dark:bg-rose-950/40 border-rose-300 text-[11px] font-semibold flex items-center gap-1">
                        <AlertTriangle className="w-3 h-3 text-rose-600" /> Email Already Taken
                      </Badge>
                    )}
                  </div>
                  <Input
                    type="email"
                    className="h-11 font-medium text-sm"
                    placeholder="e.g. student@example.com"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  />
                  <p className="text-[11px] text-muted-foreground">
                    Registered email address for student communications and portal credentials
                  </p>
                </div>

                {/* Conflict Resolution Banner (When email is already taken by a different student) */}
                {conflictBasis === 'prompt' && emailCheck.studentData && (
                  <div className="p-4 rounded-xl border-2 border-amber-300 bg-amber-50/90 dark:bg-amber-950/40 dark:border-amber-700 space-y-3 animate-in fade-in slide-in-from-top-2 duration-300 shadow-sm">
                    <div className="flex items-start gap-3">
                      <div className="p-2 bg-amber-100 dark:bg-amber-900 rounded-lg text-amber-700 dark:text-amber-300 shrink-0 mt-0.5">
                        <AlertTriangle className="w-5 h-5" />
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <h4 className="font-bold text-amber-950 dark:text-amber-200 text-sm">
                            Email ID Already Registered
                          </h4>
                          <Badge className="bg-amber-600 text-white text-[10px] uppercase font-bold">Conflict</Badge>
                        </div>
                        <p className="text-xs text-amber-900 dark:text-amber-300 mt-1 leading-relaxed">
                          The email ID <strong>{formData.email}</strong> is already taken by <strong>{emailCheck.studentData.name}</strong> (Registered Phone: <strong>{emailCheck.studentData.phone || 'N/A'}</strong>). On which basis do you want to continue?
                        </p>
                      </div>
                    </div>

                    <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 pt-1 pl-11">
                      <Button
                        type="button"
                        size="sm"
                        onClick={() => handleChooseBasis('email')}
                        className="bg-amber-600 hover:bg-amber-700 text-white font-semibold text-xs shadow-sm flex items-center gap-1.5"
                      >
                        <Mail className="w-3.5 h-3.5" /> Continue with Email ({emailCheck.studentData.name})
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        onClick={() => handleChooseBasis('phone')}
                        className="border-amber-400 text-amber-900 hover:bg-amber-100 dark:text-amber-200 dark:hover:bg-amber-900/40 font-semibold text-xs flex items-center gap-1.5"
                      >
                        <Phone className="w-3.5 h-3.5" /> Continue with Phone ({formData.phone})
                      </Button>
                    </div>
                  </div>
                )}

                {/* 3. Full Name Input */}
                <div className="space-y-1.5">
                  <Label className="font-medium flex items-center gap-1.5 text-sm">
                    <User className="w-4 h-4 text-muted-foreground" /> Student Full Name <span className="text-rose-500">*</span>
                    {formData.name && (phoneCheck.studentData?.name === formData.name || emailCheck.studentData?.name === formData.name) && (
                      <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-semibold">(auto-prefilled)</span>
                    )}
                  </Label>
                  <Input
                    className="h-11 text-sm font-medium"
                    placeholder="Student full legal name"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  />
                  <p className="text-[11px] text-muted-foreground">Full legal name of the student as per ID documents</p>
                </div>
              </div>

              {/* Status Alerts */}
              {upgradeCheck && !upgradeCheck.loading && (
                <div className="animate-in fade-in slide-in-from-top-2 duration-300">
                  {upgradeCheck.isInProgress ? (
                    <div className="p-4 bg-rose-50 dark:bg-rose-950/40 border-2 border-rose-300 dark:border-rose-700 rounded-xl flex items-start gap-3.5 shadow-sm">
                      <div className="p-2 bg-rose-100 dark:bg-rose-900 rounded-lg text-rose-700 dark:text-rose-300 shrink-0 mt-0.5">
                        <XCircle className="w-5 h-5" />
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h4 className="font-bold text-rose-900 dark:text-rose-200 text-sm">
                            This student already exists in progress, cannot enroll
                          </h4>
                          <Badge className="bg-rose-600 text-white text-[10px] uppercase font-bold tracking-wider">In Progress</Badge>
                        </div>
                        <p className="text-xs text-rose-800 dark:text-rose-300 mt-1 leading-relaxed">
                          <strong>{upgradeCheck.studentData?.name || formData.name || 'Student'}</strong> already has an active enrollment in <strong>{upgradeCheck.activeEnrollment?.programName || upgradeCheck.previousProgram?.name || 'their current program'}</strong> ({upgradeCheck.activeEnrollment?.status?.replace(/_/g, ' ') || 'Active'}). Under policy, a student cannot enroll in another program while currently in progress.
                        </p>
                      </div>
                    </div>
                  ) : (upgradeCheck.canUpgrade || upgradeCheck.isCompleted) ? (
                    <div className="p-4 bg-emerald-50 dark:bg-emerald-950/40 border-2 border-emerald-300 dark:border-emerald-700 rounded-xl flex items-start gap-3.5 shadow-sm">
                      <div className="p-2 bg-emerald-100 dark:bg-emerald-900 rounded-lg text-emerald-700 dark:text-emerald-300 shrink-0 mt-0.5">
                        <GraduationCap className="w-5 h-5" />
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h4 className="font-bold text-emerald-900 dark:text-emerald-200 text-sm">
                            Existing Completed Student Identified (Eligible for Upgrade)
                          </h4>
                          <Badge className="bg-emerald-600 text-white text-[10px] uppercase font-bold tracking-wider">Completed</Badge>
                        </div>
                        <p className="text-xs text-emerald-800 dark:text-emerald-300 mt-1 leading-relaxed">
                          <strong>{upgradeCheck.studentData?.name}</strong> has completed <strong>{upgradeCheck.previousProgram?.name || 'their previous program'}</strong> ({upgradeCheck.previousProgram?.universityName || 'University'}). Previous biographical, family, and document data will be prefilled upon continuing.
                        </p>
                      </div>
                    </div>
                  ) : null}
                </div>
              )}

              {/* Both Available Notification */}
              {!upgradeCheck?.studentData && phoneCheck.checked && phoneCheck.isAvailable && emailCheck.checked && emailCheck.isAvailable && conflictBasis === 'none' && (
                <div className="p-3 bg-emerald-50/80 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800 rounded-xl flex items-center gap-2.5 text-xs text-emerald-800 dark:text-emerald-300">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>Both phone number and email address are available. You can proceed with new enrollment.</span>
                </div>
              )}
            </div>
          )}

          {/* ── STEP 1: ADMISSION INFO ── */}
          {currentStepType === 'admission' && (
            <div className="space-y-4">
              {/* Previous student toggle - only show for non-sales admins */}
              {!isSalesMode && !['sales_admin', 'sales_sub_admin'].includes(user?.role || '') && (
                <div className="flex items-center gap-3 p-3 rounded-xl border border-amber-200 bg-amber-50 dark:bg-amber-950/20 dark:border-amber-900">
                  <input
                    type="checkbox"
                    id="isPreviousMain"
                    checked={formData.isPrevious}
                    onChange={(e) => setFormData({ ...formData, isPrevious: e.target.checked })}
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
                {!isSalesMode && !['sales_admin', 'sales_sub_admin'].includes(user?.role || '') ? (
                  <>
                    <div>
                      <Label className="font-medium">Branch <span className="text-xs text-muted-foreground font-normal">(optional)</span></Label>
                      <Select value={formData.branchId} onValueChange={(v) => setFormData({ ...formData, branchId: v === '__none__' ? '' : v })}>
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
                      <Select value={formData.universityId} onValueChange={(v) => setFormData({ ...formData, universityId: v, programId: '' })}>
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
                    <Select value={formData.universityId} onValueChange={(v) => setFormData({ ...formData, universityId: v, programId: '' })}>
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
                  <Select value={formData.programId} onValueChange={(v) => setFormData({ ...formData, programId: v, specialisation: '' })} disabled={!formData.universityId}>
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
                  <Select value={formData.sessionId} onValueChange={(v) => setFormData({ ...formData, sessionId: v === '__none__' ? '' : v })} disabled={!formData.programId}>
                    <SelectTrigger><SelectValue placeholder={formData.programId ? "Select session..." : "Select program first"} /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__none__">— No Session —</SelectItem>
                      {sessions.filter((s: any) => s && s.id && (!s.universityId || s.universityId === programs.find((p: any) => p.id === formData.programId)?.universityId || s.programId === formData.programId)).map((s: any) => (
                        <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Specialisation (if applicable) */}
              {filteredPrograms.find((p: any) => p.id === formData.programId)?.specialisations?.length > 0 && (
                <div className="mt-4">
                  <Label className="font-medium">Specialisation *</Label>
                  <Select value={formData.specialisation} onValueChange={(v) => setFormData({ ...formData, specialisation: v })}>
                    <SelectTrigger><SelectValue placeholder="Select specialisation..." /></SelectTrigger>
                    <SelectContent>
                      {filteredPrograms.find((p: any) => p.id === formData.programId)?.specialisations.map((spec: string) => (
                        <SelectItem key={spec} value={spec}>{spec}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              {/* Payment Plan & Fee */}
              {getActiveFeeStructure() && (
                <>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4">
                    <div>
                      <Label className="font-medium">Payment Plan *</Label>
                      <Select value={formData.paymentPlan} onValueChange={(v) => setFormData({ ...formData, paymentPlan: v })}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="full">Full (One Time)</SelectItem>
                          <SelectItem value="per_year_sem">Per Year / Semester</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label className="font-medium">Initial Fee Amount *</Label>
                      <Input
                        type="number"
                        placeholder="e.g. 5000"
                        value={formData.initialPaymentAmount || ''}
                        onChange={e => setFormData({ ...formData, initialPaymentAmount: e.target.value })}
                        required
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4">
                    <div>
                      <Label className="font-medium">Payment Date *</Label>
                      <Input
                        type="date"
                        value={formData.initialPaymentDate || ''}
                        onChange={e => setFormData({ ...formData, initialPaymentDate: e.target.value })}
                        required
                      />
                    </div>
                  </div>
                </>
              )}

              {renderFeeDisplay()}

              {/* Enrollment & Admission Numbers */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <Label className="font-medium">Enrollment Number <span className="text-xs text-muted-foreground font-normal">(optional)</span></Label>
                  <Input
                    placeholder="e.g. PYPEER001"
                    value={formData.enrollmentNo}
                    onChange={(e) => setFormData({ ...formData, enrollmentNo: e.target.value })}
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
                    onChange={(e) => setFormData({ ...formData, admissionDate: e.target.value })}
                  />
                </div>
                {editingId && (
                  <div>
                    <Label className="font-medium">Status</Label>
                    <Select value={formData.status} onValueChange={(v) => setFormData({ ...formData, status: v })}>
                      <SelectTrigger><SelectValue placeholder="Select status..." /></SelectTrigger>
                      <SelectContent className="max-h-[300px]">
                        <SelectItem value="active">Active</SelectItem>
                        <SelectItem value="document_review">Ops Verification (Doc Review)</SelectItem>
                        <SelectItem value="provisional">Provisional</SelectItem>
                        <SelectItem value="pending">Pending</SelectItem>
                        <SelectItem value="completed">Completed</SelectItem>
                        <SelectItem value="payment_pending">Fee Pending</SelectItem>
                        <SelectItem value="receipt_submitted">Receipt Submitted</SelectItem>
                        <SelectItem value="dept_review">Department Review</SelectItem>
                        <SelectItem value="finance_review">Finance Review</SelectItem>
                        <SelectItem value="sales_admin_review">Sales Admin Review</SelectItem>
                        <SelectItem value="enrolled">Enrolled</SelectItem>
                        <SelectItem value="dropped">Dropped</SelectItem>
                        <SelectItem value="inactive">Inactive</SelectItem>
                        <SelectItem value="rejected">Rejected</SelectItem>
                        <SelectItem value="department_rejected">Dept Rejected</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ── STEP 2: PERSONAL DETAILS ── */}
          {currentStepType === 'personal' && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <Label className="font-medium">Full Name *</Label>
                  <Input
                    placeholder="Student's name"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    required
                  />
                </div>
                <div>
                  <Label className="font-medium">Email Address {isFieldReq('email') && '*'}</Label>
                  <Input
                    type="email"
                    placeholder="student@example.com"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    required={isFieldReq('email')}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <Label className="font-medium">Phone Number *</Label>
                  <Input
                    placeholder="Primary phone"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    required
                  />
                </div>
                <div>
                  <Label className="font-medium">Date of Birth {isFieldReq('dob') && '*'}</Label>
                  <Input
                    type="date"
                    value={formData.dob}
                    onChange={(e) => setFormData({ ...formData, dob: e.target.value })}
                    required={isFieldReq('dob')}
                  />
                </div>
              </div>

              <div>
                <Label className="font-medium">Home Address {isFieldReq('address') && '*'}</Label>
                <Textarea
                  placeholder="Permanent address"
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  required={isFieldReq('address')}
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <Label className="font-medium">Pincode {isFieldReq('pinCode') && '*'}</Label>
                  <Input
                    placeholder="6-digit pincode"
                    value={formData.pinCode}
                    onChange={(e) => setFormData({ ...formData, pinCode: e.target.value })}
                    required={isFieldReq('pinCode')}
                  />
                </div>
                <div>
                  <Label className="font-medium">Alternative Phone {isFieldReq('altPhone') && '*'}</Label>
                  <Input
                    placeholder="Secondary phone"
                    value={formData.altPhone}
                    onChange={(e) => setFormData({ ...formData, altPhone: e.target.value })}
                    required={isFieldReq('altPhone')}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <Label className="font-medium">Religion {isFieldReq('religion') && '*'}</Label>
                  <Input
                    placeholder="e.g. Christian, Hindu, Muslim"
                    value={formData.religion}
                    onChange={(e) => setFormData({ ...formData, religion: e.target.value })}
                    required={isFieldReq('religion')}
                  />
                </div>
                <div>
                  <Label className="font-medium">Caste / Category {isFieldReq('caste') && '*'}</Label>
                  <Input
                    placeholder="e.g. General, OBC, SC, ST"
                    value={formData.caste}
                    onChange={(e) => setFormData({ ...formData, caste: e.target.value })}
                    required={isFieldReq('caste')}
                  />
                </div>
              </div>

              {/* Photo upload */}
              <div className="p-3 rounded-xl border bg-slate-50 dark:bg-slate-900/10 flex items-center justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <Label className="font-semibold text-slate-800 dark:text-slate-200 flex items-center gap-2">
                    <span>Student Photo {isFieldReq('photo') && '*'}</span>
                    {completingEnrollment?.student?.admissionProgress?.photoStatus === 'rejected' && formData.photo === (completingEnrollment?.student?.photo || completingEnrollment?.photo) && (
                      <span className="text-[10px] bg-red-100 text-red-600 px-1.5 py-0.5 rounded-md font-bold uppercase tracking-wider">
                        {!isFieldReq('photo') ? 'Rejected (Optional)' : 'Re-upload'}
                      </span>
                    )}
                  </Label>
                  {completingEnrollment?.student?.admissionProgress?.photoStatus === 'rejected' && formData.photo === (completingEnrollment?.student?.photo || completingEnrollment?.photo) ? (
                    <p className="text-xs text-red-600 font-medium mt-1">
                      ✕ Photo was rejected by Operations: {!isFieldReq('photo') ? 'Please re-upload or remove this photo' : 'Please re-upload a clearer image'}
                    </p>
                  ) : formData.photo ? (
                    <p className="text-xs text-emerald-600 dark:text-emerald-400 font-medium mt-1 truncate">
                      ✓ Photo Uploaded: {formData.photo.split('/').pop()}
                    </p>
                  ) : (
                    <p className={`text-xs ${isFieldReq('photo') ? 'text-rose-500' : 'text-muted-foreground'} font-medium mt-1`}>
                      {isFieldReq('photo') ? '⚠️ Required (direct upload)' : 'Optional'}
                    </p>
                  )}
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  {formData.photo && (
                    <a
                      href={api.getFileUrl(formData.photo)}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center px-2.5 py-1.5 rounded-lg border bg-white dark:bg-slate-800 text-xs font-medium hover:bg-slate-50 cursor-pointer shadow-sm"
                    >
                      View
                    </a>
                  )}
                  {formData.photo && !isFieldReq('photo') && (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setFormData((prev: any) => ({ ...prev, photo: '' }));
                        toast.success('Photo removed');
                      }}
                      className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-red-200 bg-red-50 text-red-600 hover:bg-red-100 hover:text-red-700 text-xs font-medium cursor-pointer shadow-sm transition-colors"
                    >
                      <Trash2 className="w-3 h-3" />
                      Remove
                    </Button>
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
                        const url = await uploadFormFile(file);
                        setFormData((prev: any) => ({ ...prev, photo: url }));
                        toast.success('Photo uploaded successfully', { id: toastId });
                      } catch (err: any) {
                        console.error(err);
                        toast.error(err.message || 'Failed to upload photo', { id: toastId });
                      } finally {
                        e.target.value = ''; // lets the same file be chosen again after a failure
                      }
                    }}
                  />
                  <Label
                    htmlFor="student-photo-main"
                    className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-primary text-primary-foreground text-xs font-semibold hover:bg-primary/90 cursor-pointer shadow-sm"
                  >
                    <Upload className="w-3 h-3" />
                    {formData.photo ? (completingEnrollment?.student?.admissionProgress?.photoStatus === 'rejected' ? 'Re-upload' : 'Change Photo') : 'Upload Photo'}
                  </Label>
                </div>
              </div>
            </div>
          )}

          {/* ── STEP 3: FAMILY INFO ── */}
          {currentStepType === 'family' && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <Label className="font-medium">Father's Name {isFieldReq('fatherName') && '*'}</Label>
                  <Input
                    placeholder="Father's full name"
                    value={formData.fatherName}
                    onChange={(e) => setFormData({ ...formData, fatherName: e.target.value })}
                    required={isFieldReq('fatherName')}
                  />
                </div>
                <div>
                  <Label className="font-medium">Father's Phone {isFieldReq('fatherPhone') && '*'}</Label>
                  <Input
                    placeholder="Father's phone"
                    value={formData.fatherPhone}
                    onChange={(e) => setFormData({ ...formData, fatherPhone: e.target.value })}
                    required={isFieldReq('fatherPhone')}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <Label className="font-medium">Mother's Name {isFieldReq('motherName') && '*'}</Label>
                  <Input
                    placeholder="Mother's full name"
                    value={formData.motherName}
                    onChange={(e) => setFormData({ ...formData, motherName: e.target.value })}
                    required={isFieldReq('motherName')}
                  />
                </div>
                <div>
                  <Label className="font-medium">Mother's Phone {isFieldReq('motherPhone') && '*'}</Label>
                  <Input
                    placeholder="Mother's phone"
                    value={formData.motherPhone}
                    onChange={(e) => setFormData({ ...formData, motherPhone: e.target.value })}
                    required={isFieldReq('motherPhone')}
                  />
                </div>
              </div>
            </div>
          )}

          {/* ── STEP 4: DOCUMENTS ── */}
          {currentStepType === 'documents' && (
            <div className="space-y-4">
              <p className="text-sm text-amber-600 dark:text-amber-400 font-semibold">Please upload the required files directly. All files must be uploaded to save the student record.</p>
              {['Aadhaar Card', 'SSLC Certificate', 'Plus Two Certificate', 'Transfer Certificate', 'TC / Migration / Affidavit', 'Birth Certificate', 'Degree Certificate', 'Other'].map((docType) => {
                const isOptional = !isDocReq(docType);
                const existing = (formData.documents || []).find((d: any) => d.type.toLowerCase() === docType.toLowerCase());
                const elementId = `doc-upload-${docType.replace(/\s+/g, '-')}`;
                return (
                  <div key={docType} className="space-y-2">
                    <div className="flex items-center justify-between p-3 rounded-xl border bg-slate-50 dark:bg-slate-900/10 gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-semibold text-slate-800 dark:text-slate-200 flex items-center gap-2">
                          <span>{docType === 'Other' && customOtherName.trim() !== '' ? `Other (${customOtherName})` : docType} {isOptional ? <span className="text-xs text-muted-foreground font-normal">(optional)</span> : '*'}</span>
                          {existing?.status === 'rejected' && (
                            <span className="text-[10px] bg-red-100 text-red-600 px-1.5 py-0.5 rounded-md font-bold uppercase tracking-wider">
                              {isOptional ? 'Rejected (Optional)' : 'Re-upload'}
                            </span>
                          )}
                        </div>
                        {existing?.status === 'rejected' ? (
                          <div className="text-xs text-red-600 font-medium mt-1">
                            ✕ Rejected by Operations: {isOptional ? 'Please re-upload or click Remove' : 'Please re-upload this required document'}
                          </div>
                        ) : existing?.url ? (
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
                            href={api.getFileUrl(existing.url)}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex items-center px-2.5 py-1.5 rounded-lg border bg-white dark:bg-slate-800 text-xs font-medium hover:bg-slate-50 cursor-pointer shadow-sm"
                          >
                            View
                          </a>
                        )}
                        {existing?.url && isOptional && (
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              setFormData((prev: any) => ({
                                ...prev,
                                documents: (prev.documents || []).filter((d: any) => d.type?.toLowerCase() !== docType.toLowerCase())
                              }));
                              if (docType === 'Other') {
                                setCustomOtherName('');
                              }
                              toast.success(`${docType} removed`);
                            }}
                            className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-red-200 bg-red-50 text-red-600 hover:bg-red-100 hover:text-red-700 text-xs font-medium cursor-pointer shadow-sm transition-colors"
                          >
                            <Trash2 className="w-3 h-3" />
                            Remove
                          </Button>
                        )}
                        <input
                          type="file"
                          id={elementId}
                          className="hidden"
                          accept="image/*,.pdf,.doc,.docx"
                          onChange={async (e) => {
                            const file = e.target.files?.[0];
                            if (!file) return;
                            const toastId = toast.loading(`Uploading ${docType}...`);
                            try {
                              const url = await uploadFormFile(file);
                              setFormData((prev: any) => {
                                const newDocs = (prev.documents || []).filter((d: any) => d.type?.toLowerCase() !== docType.toLowerCase());
                                newDocs.push({
                                  type: docType,
                                  url,
                                  label: docType === 'Other' ? customOtherName : undefined,
                                  status: 'pending'
                                });
                                return { ...prev, documents: newDocs };
                              });
                              toast.success(`${docType} uploaded successfully`, { id: toastId });
                            } catch (err: any) {
                              console.error(err);
                              toast.error(err.message || `Failed to upload ${docType}`, { id: toastId });
                            } finally {
                              e.target.value = '';
                            }
                          }}
                        />
                        <Label
                          htmlFor={elementId}
                          className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-primary text-primary-foreground text-xs font-semibold hover:bg-primary/90 cursor-pointer shadow-sm"
                        >
                          <Upload className="w-3 h-3" />
                          {existing?.url ? (existing.status === 'rejected' ? 'Re-upload' : 'Change File') : 'Upload File'}
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

          {/* ── STEP 5: PAYMENT RECEIPT ── */}
          {currentStepType === 'receipt' && (
            <div className="space-y-4">
              <p className="text-sm text-slate-600 dark:text-slate-400">
                Upload the fee payment receipt. Once uploaded, it will be sent to the Finance team for verification.
              </p>

              <div className="border rounded-xl p-4 sm:p-5 bg-slate-50 dark:bg-slate-900/50 space-y-4">
                <Label className="font-semibold text-sm">
                  Upload Receipt {(!editingId && !formData.isPrevious) ? '*' : '(Optional for existing/previous)'}
                </Label>

                <div className="flex flex-col sm:flex-row sm:items-center gap-4">
                  {formData.receiptUrl && (
                    <div className="flex items-center gap-3 p-2 bg-white dark:bg-slate-800 rounded-lg border">
                      <div className="w-14 h-14 rounded overflow-hidden border bg-slate-100 dark:bg-slate-900 flex items-center justify-center shrink-0">
                        {formData.receiptUrl.toLowerCase().endsWith('.pdf') ? (
                          <FileText className="w-7 h-7 text-rose-500" />
                        ) : (
                          <img src={api.getFileUrl(formData.receiptUrl)} alt="Receipt Preview" className="w-full h-full object-cover" />
                        )}
                      </div>
                      <div className="min-w-0 flex flex-col pr-2">
                        <span className="text-xs font-semibold text-slate-800 dark:text-slate-200 truncate">Payment Receipt</span>
                        <a
                          href={api.getFileUrl(formData.receiptUrl)}
                          target="_blank"
                          rel="noreferrer"
                          className="text-xs text-primary hover:underline inline-flex items-center gap-1 mt-0.5"
                        >
                          <Eye className="w-3.5 h-3.5" /> View Receipt
                        </a>
                      </div>
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
                          const toastId = toast.loading('Uploading receipt...');
                          try {
                            const url = await uploadFormFile(file, { endpoint: '/documents/upload', fields: { type: 'receipt' } });
                            setFormData((prev: any) => ({ ...prev, receiptUrl: url }));
                            toast.success('Receipt uploaded successfully', { id: toastId });
                          } catch (err: any) {
                            toast.error(err.message || 'Failed to upload receipt', { id: toastId });
                          } finally {
                            e.target.value = '';
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
          <div className="text-xs text-muted-foreground">Step {formStep + 1} of {stepsList.length}</div>
          {formStep < maxStepIndex ? (
            <Button type="submit" disabled={verifyingStudentCheck || (currentStepType === 'verify' && conflictBasis === 'prompt')}>
              {verifyingStudentCheck ? (
                <>
                  <RefreshCw className="w-4 h-4 mr-2 animate-spin" /> Verifying...
                </>
              ) : upgradeCheck?.isInProgress && currentStepType === 'verify' ? (
                <>
                  <XCircle className="w-4 h-4 mr-1 text-rose-200" /> Next (In Progress)
                </>
              ) : (
                <>
                  Next <ChevronRight className="w-4 h-4 ml-1" />
                </>
              )}
            </Button>
          ) : (
            <Button type="submit" className="bg-primary" disabled={savingStudent}>
              {savingStudent ? 'Saving...' : (editingId ? 'Update Student' : 'Save Student')}
            </Button>
          )}
        </div>
      </form>
    </DialogContent>
  );

  if (triggerOpen !== undefined) {
    return (
      <Dialog open={dialogOpen} onOpenChange={handleDialogOpenChange}>
        {renderStudentFormModalContent()}
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
          {/* Export Excel Button */}
          <Button
            variant="outline"
            size="sm"
            onClick={handleExportExcel}
            disabled={isExporting || filteredStudents.length === 0}
            className="border-slate-300 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800"
            title="Download student records in Excel format"
          >
            <Download className={cn("w-4 h-4 sm:mr-2", isExporting && "animate-bounce")} />
            <span className="hidden sm:inline">
              {selectedStudentIds.size > 0
                ? `Export Selected (${selectedStudentIds.size})`
                : `Export Excel (${filteredStudents.length})`}
            </span>
            <span className="sm:hidden">
              {selectedStudentIds.size > 0 ? `(${selectedStudentIds.size})` : 'Export'}
            </span>
          </Button>

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
                {renderStudentFormModalContent()}
              </Dialog>
            </>
          )}
        </div>
      </div>

      {/* Tabs / Filtering Option */}
      <Tabs value={activeFilter} onValueChange={(val) => handleTabChange(val as any)} className="w-full mb-6">
        <TabsList className="bg-slate-100/80 dark:bg-slate-800/80 p-1.5 rounded-2xl h-auto flex flex-wrap gap-1.5 shadow-inner border border-slate-200/50 dark:border-slate-700/50">
          <TabsTrigger value="all" className="rounded-xl px-3.5 py-2 data-[state=active]:bg-white dark:data-[state=active]:bg-slate-900 data-[state=active]:shadow-sm data-[state=active]:text-blue-600 dark:data-[state=active]:text-blue-400 transition-all">
            <div className="flex items-center justify-center gap-1.5">
              <Users className="w-3.5 h-3.5" />
              <span className="font-semibold text-xs">All Students</span>
              <Badge variant="secondary" className="ml-1 bg-slate-200/70 dark:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-lg px-1.5 text-[10px]">
                {students.length}
              </Badge>
            </div>
          </TabsTrigger>
          <TabsTrigger value="active" className="rounded-xl px-3.5 py-2 data-[state=active]:bg-white dark:data-[state=active]:bg-slate-900 data-[state=active]:shadow-sm data-[state=active]:text-emerald-600 dark:data-[state=active]:text-emerald-400 transition-all">
            <div className="flex items-center justify-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-500" />
              <span className="font-semibold text-xs">Active</span>
              <Badge variant="secondary" className="ml-1 bg-emerald-100/70 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 rounded-lg px-1.5 text-[10px]">
                {statusCounts.active || 0}
              </Badge>
            </div>
          </TabsTrigger>
          <TabsTrigger value="document_review" className="rounded-xl px-3.5 py-2 data-[state=active]:bg-white dark:data-[state=active]:bg-slate-900 data-[state=active]:shadow-sm data-[state=active]:text-blue-600 dark:data-[state=active]:text-blue-400 transition-all">
            <div className="flex items-center justify-center gap-1.5">
              <FileText className="w-3.5 h-3.5" />
              <span className="font-semibold text-xs">Doc Review</span>
              <Badge variant="secondary" className="ml-1 bg-blue-100/70 dark:bg-blue-950/40 text-blue-700 dark:text-blue-400 rounded-lg px-1.5 text-[10px]">
                {statusCounts.document_review || 0}
              </Badge>
            </div>
          </TabsTrigger>
          <TabsTrigger value="provisional" className="rounded-xl px-3.5 py-2 data-[state=active]:bg-white dark:data-[state=active]:bg-slate-900 data-[state=active]:shadow-sm data-[state=active]:text-amber-600 dark:data-[state=active]:text-amber-400 transition-all">
            <div className="flex items-center justify-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-amber-500" />
              <span className="font-semibold text-xs">Provisional</span>
              <Badge variant="secondary" className="ml-1 bg-amber-100/70 dark:bg-amber-950/40 text-amber-700 dark:text-amber-400 rounded-lg px-1.5 text-[10px]">
                {statusCounts.provisional || 0}
              </Badge>
            </div>
          </TabsTrigger>
          <TabsTrigger value="pending" className="rounded-xl px-3.5 py-2 data-[state=active]:bg-white dark:data-[state=active]:bg-slate-900 data-[state=active]:shadow-sm data-[state=active]:text-orange-600 dark:data-[state=active]:text-orange-400 transition-all">
            <div className="flex items-center justify-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-orange-500" />
              <span className="font-semibold text-xs">Pending</span>
              <Badge variant="secondary" className="ml-1 bg-orange-100/70 dark:bg-orange-950/40 text-orange-700 dark:text-orange-400 rounded-lg px-1.5 text-[10px]">
                {statusCounts.pending || 0}
              </Badge>
            </div>
          </TabsTrigger>
          <TabsTrigger value="completed" className="rounded-xl px-3.5 py-2 data-[state=active]:bg-white dark:data-[state=active]:bg-slate-900 data-[state=active]:shadow-sm data-[state=active]:text-purple-600 dark:data-[state=active]:text-purple-400 transition-all">
            <div className="flex items-center justify-center gap-1.5">
              <History className="w-3.5 h-3.5" />
              <span className="font-semibold text-xs">Completed</span>
              <Badge variant="secondary" className="ml-1 bg-purple-100/70 dark:bg-purple-950/40 text-purple-700 dark:text-purple-400 rounded-lg px-1.5 text-[10px]">
                {statusCounts.completed || 0}
              </Badge>
            </div>
          </TabsTrigger>
          <TabsTrigger value="current" className="rounded-xl px-3.5 py-2 data-[state=active]:bg-white dark:data-[state=active]:bg-slate-900 data-[state=active]:shadow-sm data-[state=active]:text-emerald-700 dark:data-[state=active]:text-emerald-300 transition-all">
            <div className="flex items-center justify-center gap-1.5">
              <GraduationCap className="w-3.5 h-3.5" />
              <span className="font-semibold text-xs">Current</span>
              <Badge variant="secondary" className="ml-1 bg-slate-200/70 dark:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-lg px-1.5 text-[10px]">
                {statusCounts.current || 0}
              </Badge>
            </div>
          </TabsTrigger>
        </TabsList>
      </Tabs>

      <Card className="border-none shadow-2xl bg-white/50 dark:bg-slate-900/50 backdrop-blur-xl overflow-hidden rounded-3xl ring-1 ring-slate-200/50 dark:ring-slate-800/50">
        <CardHeader className="bg-gradient-to-r from-blue-500/10 via-indigo-500/5 to-purple-500/10 border-b border-slate-200/50 dark:border-slate-800/50 px-6 py-5">
          <CardTitle className="flex items-center gap-2.5 text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-slate-900 to-slate-600 dark:from-white dark:to-slate-300">
            <div className="p-2 bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200/50 dark:border-slate-700/50">
              <Users className="w-5 h-5 text-blue-600 dark:text-blue-400" />
            </div>
            Student Directory
          </CardTitle>
        </CardHeader>
        <CardContent className="p-6">
          {/* Filters Section */}
          <div className="bg-white dark:bg-slate-900/40 p-5 rounded-2xl border border-slate-100 dark:border-slate-800/60 shadow-sm mb-6">
            {/* Filter Header with Title, Count & Clear All Button */}
            <div className="flex items-center justify-between pb-3.5 mb-3.5 border-b border-slate-100 dark:border-slate-800/70">
              <div className="flex items-center gap-2">
                <div className="p-1.5 bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 rounded-lg">
                  <Filter className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-800 dark:text-slate-200">
                    Filter & Search
                  </h4>
                  <p className="text-[11px] text-slate-400 font-normal">
                    Multi-select state, university, branch, counselor, session & date
                  </p>
                </div>
                {isFiltered && (
                  <Badge variant="secondary" className="ml-1 bg-blue-100/70 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300 text-[10px] px-2 py-0.5 rounded-full font-bold">
                    {activeFilterCount} active
                  </Badge>
                )}
              </div>

              {isFiltered && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleResetFilters}
                  className="h-8 px-3 text-xs font-semibold text-red-600 hover:text-red-700 dark:text-red-400 bg-red-50/50 hover:bg-red-100/70 dark:bg-red-950/30 border border-red-200/80 dark:border-red-900/60 rounded-xl flex items-center gap-1.5 transition-colors shadow-xs"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Clear All Filters</span>
                </Button>
              )}
            </div>

            {/* Row 1: Search and Multi-Select Filters */}
            <div className={`grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 ${salesUsers.length > 0 ? 'xl:grid-cols-6' : 'xl:grid-cols-5'} gap-4 xl:gap-5`}>
              {/* Search */}
              <div className="flex flex-col">
                <Label className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-2 truncate">
                  Search Students
                </Label>
                <div className="relative group/search mt-auto">
                  <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400 group-focus-within/search:text-blue-500 transition-colors" />
                  <Input
                    placeholder="Name, email, roll no..."
                    className="pl-9 pr-7 h-9 text-sm bg-slate-50/50 dark:bg-slate-900/50 border-slate-200 dark:border-slate-800 focus:bg-white dark:focus:bg-slate-900 transition-all rounded-xl"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                  {searchQuery && (
                    <button
                      type="button"
                      onClick={() => setSearchQuery('')}
                      className="absolute right-2.5 top-2.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>

              {/* Multi-Select: Student State */}
              <MultiSelectFilter
                label="Student State"
                icon={<Filter className="w-3 h-3 text-slate-400" />}
                placeholder="All Student States"
                options={stateOptions}
                selected={filterStatuses}
                onChange={handleStatusesChange}
              />

              {/* Multi-Select: University */}
              <MultiSelectFilter
                label="University"
                icon={<Building2 className="w-3 h-3 text-slate-400" />}
                placeholder="All Universities"
                options={universityOptions}
                selected={filterUniversityIds}
                onChange={setFilterUniversityIds}
              />

              {/* Multi-Select: Branch */}
              <MultiSelectFilter
                label="Branch"
                icon={<Building2 className="w-3 h-3 text-slate-400" />}
                placeholder="All Branches"
                options={branchOptions}
                selected={filterBranchIds}
                onChange={setFilterBranchIds}
              />

              {/* Multi-Select: Sales User (if available) */}
              {salesUsers.length > 0 && (
                <MultiSelectFilter
                  label="Sales User"
                  icon={<Users className="w-3 h-3 text-blue-500" />}
                  placeholder="All Sales Users"
                  options={salesUserOptions}
                  selected={filterSalesUsers}
                  onChange={setFilterSalesUsers}
                  triggerClassName="bg-blue-50/30 dark:bg-blue-900/10 border-blue-100 dark:border-blue-900/30 hover:bg-blue-50/50"
                />
              )}

              {/* Multi-Select: Admission Session */}
              <MultiSelectFilter
                label="Admission Session"
                icon={<Calendar className="w-3 h-3 text-slate-400" />}
                placeholder="All Sessions"
                options={sessionOptions}
                selected={filterSessionIds}
                onChange={setFilterSessionIds}
              />
            </div>

            {/* Row 2: Admission Date Range & Sort Toolbar */}
            <div className="mt-4 pt-4 border-t border-slate-100 dark:border-slate-800/80 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
              {/* Date Range Section */}
              <div className="flex flex-wrap items-center gap-2.5 sm:gap-3 flex-1">
                <div className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 shrink-0">
                  <CalendarDays className="w-3.5 h-3.5 text-blue-500" />
                  <span>Admission Date:</span>
                </div>

                {/* Date Preset Selector */}
                <div className="w-[130px] shrink-0">
                  <Select value={filterDatePreset} onValueChange={handleDatePresetSelect}>
                    <SelectTrigger className="h-8 text-xs bg-slate-50/50 dark:bg-slate-900/50 border-slate-200 dark:border-slate-800 rounded-lg hover:bg-white transition-colors">
                      <SelectValue placeholder="Preset" />
                    </SelectTrigger>
                    <SelectContent>
                      {DATE_PRESETS.map((p) => (
                        <SelectItem key={p.value} value={p.value} className="text-xs">
                          {p.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* From Date */}
                <div className="flex items-center gap-1.5">
                  <span className="text-xs text-slate-400">From</span>
                  <Input
                    type="date"
                    className="h-8 text-xs w-[135px] bg-slate-50/50 dark:bg-slate-900/50 border-slate-200 dark:border-slate-800 rounded-lg focus:bg-white transition-colors px-2"
                    value={filterStartDate}
                    onChange={(e) => {
                      setFilterStartDate(e.target.value);
                      setFilterDatePreset('custom');
                    }}
                  />
                </div>

                {/* To Date */}
                <div className="flex items-center gap-1.5">
                  <span className="text-xs text-slate-400">To</span>
                  <Input
                    type="date"
                    className="h-8 text-xs w-[135px] bg-slate-50/50 dark:bg-slate-900/50 border-slate-200 dark:border-slate-800 rounded-lg focus:bg-white transition-colors px-2"
                    value={filterEndDate}
                    onChange={(e) => {
                      setFilterEndDate(e.target.value);
                      setFilterDatePreset('custom');
                    }}
                  />
                </div>

                {/* Clear Date Filter Button */}
                {(filterStartDate || filterEndDate || filterDatePreset !== 'all') && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-8 px-2 text-xs text-slate-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/20 rounded-lg"
                    onClick={() => {
                      setFilterStartDate('');
                      setFilterEndDate('');
                      setFilterDatePreset('all');
                    }}
                    title="Clear date range"
                  >
                    <X className="w-3.5 h-3.5 mr-1 text-slate-400" />
                    Clear Date
                  </Button>
                )}
              </div>

              {/* Right: Sort By & Reset Filters */}
              <div className="flex items-center gap-2.5 shrink-0 self-end lg:self-center">
                <div className="flex items-center gap-1.5">
                  <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 shrink-0">Sort:</span>
                  <Select value={sortBy} onValueChange={setSortBy}>
                    <SelectTrigger className="h-8 text-xs w-[170px] bg-slate-50/50 dark:bg-slate-900/50 border-slate-200 dark:border-slate-800 rounded-lg hover:bg-white transition-colors">
                      <SelectValue placeholder="Sort By" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="name" className="text-xs">Name (A-Z)</SelectItem>
                      <SelectItem value="branch" className="text-xs">Branch</SelectItem>
                      <SelectItem value="enrollmentNo" className="text-xs">Enrollment No.</SelectItem>
                      <SelectItem value="admissionDate_desc" className="text-xs">Admission (Newest First)</SelectItem>
                      <SelectItem value="admissionDate_asc" className="text-xs">Admission (Oldest First)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Reset Filters button */}
                {isFiltered && (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="h-8 px-2.5 text-xs text-red-600 dark:text-red-400 border-red-200 dark:border-red-900/50 bg-red-50/30 hover:bg-red-50 dark:hover:bg-red-950/30 rounded-lg flex items-center gap-1.5"
                    onClick={handleResetFilters}
                    title="Clear all filters"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    Clear All
                  </Button>
                )}
              </div>
            </div>

            {/* Active Filters Summary Pill Bar */}
            {isFiltered && (
              <div className="mt-3 pt-3 border-t border-slate-100 dark:border-slate-800/60 flex flex-wrap items-center justify-between gap-2">
                <div className="flex flex-wrap items-center gap-1.5 text-xs">
                  <span className="text-slate-400 font-medium">Active Filters ({activeFilterCount}):</span>

                  <button
                    type="button"
                    onClick={handleResetFilters}
                    className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-xs font-semibold bg-red-50 text-red-600 dark:bg-red-950/40 dark:text-red-400 border border-red-200 dark:border-red-900 hover:bg-red-100 dark:hover:bg-red-900/50 transition-colors cursor-pointer"
                    title="Clear all filters"
                  >
                    <RotateCcw className="w-3 h-3" />
                    Clear All
                  </button>

                  {filterStatuses.map(st => (
                    <Badge key={st} variant="secondary" className="gap-1 pl-2 pr-1 py-0.5 rounded-lg text-xs bg-blue-50 text-blue-700 dark:bg-blue-950/30 dark:text-blue-300 border border-blue-200/50">
                      <span className={cn("w-1.5 h-1.5 rounded-full shrink-0", STATE_DOT_COLORS[st] || 'bg-blue-500')} />
                      State: {statusLabel(st)}
                      <button type="button" onClick={() => handleStatusesChange(filterStatuses.filter(s => s !== st))} className="hover:bg-blue-200/50 rounded p-0.5">
                        <X className="w-3 h-3" />
                      </button>
                    </Badge>
                  ))}

                  {(filterStartDate || filterEndDate) && (
                    <Badge variant="secondary" className="gap-1 pl-2 pr-1 py-0.5 rounded-lg text-xs bg-indigo-50 text-indigo-700 dark:bg-indigo-950/30 dark:text-indigo-300 border border-indigo-200/50">
                      Admission: {filterStartDate || 'Any'} → {filterEndDate || 'Any'}
                      <button type="button" onClick={() => { setFilterStartDate(''); setFilterEndDate(''); setFilterDatePreset('all'); }} className="hover:bg-indigo-200/50 rounded p-0.5">
                        <X className="w-3 h-3" />
                      </button>
                    </Badge>
                  )}

                  {searchQuery && (
                    <Badge variant="secondary" className="gap-1 pl-2 pr-1 py-0.5 rounded-lg text-xs bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300">
                      Search: "{searchQuery}"
                      <button type="button" onClick={() => setSearchQuery('')} className="hover:bg-slate-200 rounded p-0.5">
                        <X className="w-3 h-3" />
                      </button>
                    </Badge>
                  )}

                  {filterUniversityIds.map(uId => (
                    <Badge key={uId} variant="secondary" className="gap-1 pl-2 pr-1 py-0.5 rounded-lg text-xs bg-purple-50 text-purple-700 dark:bg-purple-950/30 dark:text-purple-300 border border-purple-200/50">
                      Uni: {universities.find((u: any) => u.id === uId)?.name || uId}
                      <button type="button" onClick={() => setFilterUniversityIds(filterUniversityIds.filter(id => id !== uId))} className="hover:bg-purple-200/50 rounded p-0.5">
                        <X className="w-3 h-3" />
                      </button>
                    </Badge>
                  ))}

                  {filterBranchIds.map(bId => (
                    <Badge key={bId} variant="secondary" className="gap-1 pl-2 pr-1 py-0.5 rounded-lg text-xs bg-emerald-50 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-300 border border-emerald-200/50">
                      Branch: {branches.find((b: any) => b.id === bId)?.name || bId}
                      <button type="button" onClick={() => setFilterBranchIds(filterBranchIds.filter(id => id !== bId))} className="hover:bg-emerald-200/50 rounded p-0.5">
                        <X className="w-3 h-3" />
                      </button>
                    </Badge>
                  ))}

                  {filterSalesUsers.map(suId => (
                    <Badge key={suId} variant="secondary" className="gap-1 pl-2 pr-1 py-0.5 rounded-lg text-xs bg-cyan-50 text-cyan-700 dark:bg-cyan-950/30 dark:text-cyan-300 border border-cyan-200/50">
                      Sales: {salesUsers.find((u: any) => u.id === suId)?.name || suId}
                      <button type="button" onClick={() => setFilterSalesUsers(filterSalesUsers.filter(id => id !== suId))} className="hover:bg-cyan-200/50 rounded p-0.5">
                        <X className="w-3 h-3" />
                      </button>
                    </Badge>
                  ))}

                  {filterSessionIds.map(sId => (
                    <Badge key={sId} variant="secondary" className="gap-1 pl-2 pr-1 py-0.5 rounded-lg text-xs bg-amber-50 text-amber-700 dark:bg-amber-950/30 dark:text-amber-300 border border-amber-200/50">
                      Session: {sessions.find((s: any) => s.id === sId)?.name || sId}
                      <button type="button" onClick={() => setFilterSessionIds(filterSessionIds.filter(id => id !== sId))} className="hover:bg-amber-200/50 rounded p-0.5">
                        <X className="w-3 h-3" />
                      </button>
                    </Badge>
                  ))}
                </div>

                <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">
                  Showing <span className="font-bold text-slate-800 dark:text-slate-200">{filteredStudents.length}</span> of {students.length} students
                </span>
              </div>
            )}
          </div>

          {loading ? (
            <div className="flex flex-col items-center justify-center py-12 px-4 bg-white/40 dark:bg-slate-900/20 rounded-3xl border border-slate-100 dark:border-slate-800/40">
              <RefreshCw className="w-8 h-8 text-blue-500 animate-spin mb-4" />
              <p className="text-slate-600 dark:text-slate-400 font-medium">Loading student directory...</p>
            </div>
          ) : filteredStudents.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 px-4 bg-slate-50/50 dark:bg-slate-900/20 rounded-3xl border border-dashed border-slate-200 dark:border-slate-800">
              <div className="w-16 h-16 bg-slate-100 dark:bg-slate-800 rounded-full flex items-center justify-center mb-4">
                <Search className="w-8 h-8 text-slate-400" />
              </div>
              <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100 mb-1">No students found</h3>
              <p className="text-slate-500 dark:text-slate-400 text-sm max-w-sm text-center">Try adjusting your filters or search terms to find what you're looking for.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {/* Select all row */}
              {isOrgAdmin && paginatedStudents.length > 0 && (
                <div className="flex items-center gap-2 px-3 pb-2">
                  <button
                    onClick={toggleSelectAll}
                    className="flex items-center gap-2 text-sm font-medium text-slate-500 hover:text-blue-600 dark:hover:text-blue-400 transition-colors bg-white dark:bg-slate-800 px-3 py-1.5 rounded-full border border-slate-200 dark:border-slate-700 shadow-sm"
                  >
                    {selectedStudentIds.size === paginatedStudents.length
                      ? <CheckSquare className="w-4 h-4 text-blue-600" />
                      : <Square className="w-4 h-4" />}
                    <span>{selectedStudentIds.size === paginatedStudents.length ? 'Deselect all' : 'Select all on page'}</span>
                  </button>
                  {selectedStudentIds.size > 0 && (
                    <Badge variant="secondary" className="bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300 ml-auto border-0">
                      {selectedStudentIds.size} selected
                    </Badge>
                  )}
                </div>
              )}
              {paginatedStudents.map((student, index) => {
                const centerName = typeof student.centerId === 'object' ? student.centerId?.name : student.center?.name || '';
                const programName = typeof student.programId === 'object' ? student.programId?.name : student.program?.name || '';
                const universityName = typeof student.universityId === 'object' ? student.universityId?.name : student.university?.name || '';
                const branchName = typeof student.branchId === 'object' ? student.branchId?.name : student.branch?.name || '';
                const salesUserName = typeof student.enrolledBy === 'object' ? student.enrolledBy?.name : (student.enrolledByUser?.name || salesUsers.find((su: any) => su.id === student.enrolledBy)?.name);

                const isSelected = selectedStudentIds.has(student.id);

                return (
                  <div key={student.id} className={`group flex flex-col xl:flex-row xl:items-center xl:justify-between p-4 bg-white dark:bg-slate-900 rounded-2xl border transition-all duration-300 hover:shadow-lg hover:-translate-y-0.5 ${isSelected ? 'border-blue-400 shadow-blue-500/10 ring-4 ring-blue-50 dark:ring-blue-900/20 z-10 relative' : 'border-slate-200/80 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700'}`}>
                    <div className="flex items-start gap-4">
                      {/* Row number / Checkbox */}
                      {isOrgAdmin ? (
                        <button
                          onClick={() => toggleStudentSelection(student.id)}
                          className="mt-2 w-6 h-6 flex items-center justify-center text-slate-300 hover:text-blue-500 transition-colors shrink-0"
                        >
                          {isSelected
                            ? <CheckSquare className="w-5 h-5 text-blue-600" />
                            : <Square className="w-5 h-5" />}
                        </button>
                      ) : (
                        <div className="mt-2 w-6 text-center text-xs font-bold text-slate-300 dark:text-slate-600 shrink-0">
                          {(currentPage - 1) * itemsPerPage + index + 1}
                        </div>
                      )}

                      <div className="relative shrink-0">
                        <div className={`w-14 h-14 rounded-2xl flex items-center justify-center overflow-hidden border-2 ${isSelected ? 'border-blue-400 shadow-sm' : 'border-slate-100 dark:border-slate-800'} bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-800 dark:to-slate-900`}>
                          {student.photo ? (
                            <img
                              src={api.getFileUrl(student.photo)}
                              alt={student.name}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <GraduationCap className={`w-6 h-6 ${isSelected ? 'text-blue-500' : 'text-slate-400'}`} />
                          )}
                        </div>
                        {student.isPrevious && (
                          <div className="absolute -bottom-2 -right-2 bg-amber-100 border-2 border-white dark:border-slate-900 rounded-full p-1" title="Previous Student">
                            <History className="w-3 h-3 text-amber-600" />
                          </div>
                        )}
                      </div>

                      <div className="flex-1 min-w-0 pr-4">
                        <div className="flex items-center gap-2 mb-1">
                          <h4 className="text-[15px] font-bold text-slate-900 dark:text-slate-100 truncate">
                            {student.name}
                          </h4>
                          <Badge className={`px-2 py-0.5 text-[10px] uppercase tracking-wider border-0 font-bold ${STATUS_COLORS[student.status] || 'bg-slate-100 text-slate-600 dark:bg-slate-800'}`}>
                            {statusLabel(student.status)}
                          </Badge>
                        </div>

                        <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-[13px] text-slate-500 dark:text-slate-400 mb-2">
                          <span className="font-semibold text-slate-700 dark:text-slate-300">
                            #{student.enrollmentNo || 'PENDING'}
                          </span>
                          <span className="w-1 h-1 rounded-full bg-slate-300 dark:bg-slate-700" />
                          <span className="truncate max-w-[200px]" title={universityName}>{universityName}</span>
                          {branchName && (
                            <>
                              <span className="w-1 h-1 rounded-full bg-slate-300 dark:bg-slate-700" />
                              <span className="truncate max-w-[150px]">{branchName}</span>
                            </>
                          )}
                        </div>

                        <div className="flex flex-wrap items-center gap-3 text-[12px] font-medium">
                          <a href={`mailto:${student.email}`} className="flex items-center gap-1.5 text-slate-500 hover:text-blue-600 dark:hover:text-blue-400 transition-colors bg-slate-50 dark:bg-slate-800/50 px-2 py-1 rounded-lg">
                            <Mail className="w-3.5 h-3.5 text-slate-400" /> <span className="truncate max-w-[150px]">{student.email}</span>
                          </a>
                          {student.phone && (
                            <a href={`tel:${student.phone}`} className="flex items-center gap-1.5 text-slate-500 hover:text-emerald-600 transition-colors bg-slate-50 dark:bg-slate-800/50 px-2 py-1 rounded-lg">
                              <Phone className="w-3.5 h-3.5 text-slate-400" /> {student.phone}
                            </a>
                          )}
                          {(() => {
                            const { date: effectiveDate, isAdm } = getStudentEffectiveDate(student);
                            if (!effectiveDate) return null;
                            const hasDifferentRegDate = isAdm && student.createdAt && new Date(effectiveDate).toDateString() !== new Date(student.createdAt).toDateString();
                            return (
                              <div
                                className="flex items-center gap-1.5 bg-slate-50 dark:bg-slate-800/50 text-slate-600 dark:text-slate-300 px-2 py-1 rounded-lg border border-slate-200/50 dark:border-slate-700/50"
                                title={isAdm 
                                  ? `Admission Date: ${new Date(effectiveDate).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}${hasDifferentRegDate ? ` (Registered: ${new Date(student.createdAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })})` : ''}`
                                  : 'Registration Date'}
                              >
                                <CalendarDays className="w-3.5 h-3.5 text-blue-500/70" />
                                <span>
                                  {isAdm
                                    ? `Adm: ${new Date(effectiveDate).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}`
                                    : `Reg: ${new Date(effectiveDate).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}`}
                                </span>
                              </div>
                            );
                          })()}
                          {salesUserName && (
                            <div className="flex items-center gap-1.5 bg-blue-50/50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 px-2 py-1 rounded-lg border border-blue-100/50 dark:border-blue-900/30">
                              <Users className="w-3.5 h-3.5 text-blue-500/70" />
                              <span>{salesUserName}</span>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="mt-4 xl:mt-0 pt-4 xl:pt-0 border-t xl:border-t-0 border-slate-100 dark:border-slate-800 flex items-center justify-end gap-1.5 xl:pl-4 xl:ml-auto shrink-0">
                      <Button variant="ghost" size="icon" className="w-8 h-8 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300" onClick={() => setViewingProfileStudent(student)} title="View Profile">
                        <Eye className="w-4 h-4" />
                      </Button>
                      <Button variant="ghost" size="icon" className="w-8 h-8 rounded-full hover:bg-amber-50 dark:hover:bg-amber-900/20 text-amber-600" onClick={() => handleOpenNotif(student)} title="Send Notification">
                        <Bell className="w-4 h-4" />
                      </Button>
                      <Button variant="ghost" size="icon" className="w-8 h-8 rounded-full hover:bg-emerald-50 dark:hover:bg-emerald-900/20 text-emerald-600" onClick={() => handleOpenWhatsApp(student)} title="WhatsApp Message">
                        <MessageSquare className="w-4 h-4" />
                      </Button>
                      <div className="w-px h-4 bg-slate-200 dark:bg-slate-700 mx-1" />
                      <Button variant="ghost" size="icon" className="w-8 h-8 rounded-full hover:bg-indigo-50 dark:hover:bg-indigo-900/20 text-indigo-600" onClick={() => handleOpenSchedule(student)} title="Payment Schedule">
                        <CalendarDays className="w-4 h-4" />
                      </Button>
                      <Button variant="ghost" size="icon" className="w-8 h-8 rounded-full hover:bg-cyan-50 dark:hover:bg-cyan-900/20 text-cyan-600" onClick={() => handleOpenCredentials(student)} title="Credentials">
                        <Key className="w-4 h-4" />
                      </Button>
                      <Button variant="ghost" size="icon" className="w-8 h-8 rounded-full hover:bg-violet-50 dark:hover:bg-violet-900/20 text-violet-600" onClick={() => handleOpenEnrollHistory(student)} title="History">
                        <History className="w-4 h-4" />
                      </Button>

                      {(canWrite || canDelete) && <div className="w-px h-4 bg-slate-200 dark:bg-slate-700 mx-1" />}

                      {canWrite && (
                        <Button variant="ghost" size="icon" className="w-8 h-8 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-900 dark:hover:text-white" onClick={() => handleEdit(student)}>
                          <Edit className="w-4 h-4" />
                        </Button>
                      )}
                      {canDelete && (
                        <Button variant="ghost" size="icon" className="w-8 h-8 rounded-full hover:bg-rose-50 dark:hover:bg-rose-950/30 text-rose-400 hover:text-rose-600" onClick={() => handleDelete(student.id)}>
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      )}
                    </div>
                  </div>
                );
              })}

              {/* Bulk Floating Action Bar */}
              {isOrgAdmin && selectedStudentIds.size > 0 && (
                <div className="fixed bottom-8 left-1/2 -translate-x-1/2 z-50 flex items-center gap-3 bg-slate-900/95 backdrop-blur-md text-white rounded-full shadow-2xl px-6 py-3 border border-slate-700/50 ring-4 ring-slate-900/10 animate-in slide-in-from-bottom-10 fade-in duration-300">
                  <div className="flex items-center justify-center bg-blue-500 text-white font-bold w-6 h-6 rounded-full text-xs">
                    {selectedStudentIds.size}
                  </div>
                  <span className="text-sm font-medium mr-2">Selected</span>
                  <div className="w-px h-6 bg-slate-700" />
                  <Button
                    size="sm"
                    className="bg-white/10 hover:bg-white/20 text-white border-0 gap-2 h-8 rounded-full transition-colors"
                    onClick={() => { setBulkActionUniversityId(''); setBulkActionProgramId(''); setBulkProgramDialogOpen(true); }}
                  >
                    <GraduationCap className="w-4 h-4" />
                    <span className="hidden sm:inline">Change Course</span>
                  </Button>
                  <Button
                    size="sm"
                    className="bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 hover:text-emerald-200 border-0 gap-2 h-8 rounded-full transition-colors"
                    onClick={() => { setBulkPaymentAmount(''); setBulkPaymentNote(''); setBulkPaymentDialogOpen(true); }}
                  >
                    <DollarSign className="w-4 h-4" />
                    <span className="hidden sm:inline">Add Fee</span>
                  </Button>
                  <Button
                    size="sm"
                    className="bg-blue-500/20 hover:bg-blue-500/30 text-blue-300 hover:text-blue-200 border-0 gap-2 h-8 rounded-full transition-colors"
                    onClick={handleExportExcel}
                    disabled={isExporting}
                    title="Export selected students to Excel"
                  >
                    <Download className={cn("w-4 h-4", isExporting && "animate-bounce")} />
                    <span className="hidden sm:inline">Export Excel</span>
                  </Button>
                  <div className="w-px h-6 bg-slate-700 ml-1" />
                  <button
                    onClick={() => setSelectedStudentIds(new Set())}
                    className="w-8 h-8 flex items-center justify-center rounded-full text-slate-400 hover:text-white hover:bg-white/10 transition-colors ml-1"
                    title="Clear selection"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              )}

              {/* Pagination Controls */}
              {totalPages > 1 && (
                <div className="flex flex-col sm:flex-row items-center justify-between pt-6 border-t border-slate-100 dark:border-slate-800 mt-6 gap-4">
                  <div className="text-sm font-medium text-slate-500">
                    Showing <span className="text-slate-900 dark:text-white">{(currentPage - 1) * itemsPerPage + 1}</span> to <span className="text-slate-900 dark:text-white">{Math.min(currentPage * itemsPerPage, filteredStudents.length)}</span> of <span className="text-slate-900 dark:text-white">{filteredStudents.length}</span> students
                  </div>
                  <div className="flex items-center bg-slate-50 dark:bg-slate-900/50 rounded-xl p-1 border border-slate-200/60 dark:border-slate-800/60">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                      disabled={currentPage === 1}
                      className="rounded-lg h-8 px-3 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
                    >
                      Previous
                    </Button>
                    <div className="text-sm font-semibold px-4 text-slate-700 dark:text-slate-300">
                      Page {currentPage} of {totalPages}
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                      disabled={currentPage === totalPages}
                      className="rounded-lg h-8 px-3 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
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
                Supported: Excel (.xlsx, .xls) and CSV. Column order: <strong>name</strong>, <strong>email</strong>, <strong>phone</strong>, <strong>address</strong>, <strong>enrollmentNo</strong>, <strong>programs</strong>, <strong>university</strong>, <strong>dob</strong>, <strong>session</strong>. Academic partner is optional.
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

            {/* Already existed students */}
            {bulkExisted.length > 0 && (
              <div className="rounded-lg border border-yellow-500/40 bg-yellow-500/5 p-3 space-y-1.5">
                <p className="text-sm font-semibold text-yellow-600 dark:text-yellow-400 flex items-center gap-1.5">
                  ℹ️ Already Existed — Skipped ({bulkExisted.length})
                </p>
                <ul className="text-xs space-y-1 max-h-36 overflow-y-auto pr-1">
                  {bulkExisted.map((msg, i) => (
                    <li key={i} className="text-muted-foreground border-l-2 border-yellow-500/30 pl-2 py-0.5">
                      {msg}
                    </li>
                  ))}
                </ul>
                <p className="text-xs text-muted-foreground pt-1">These students were not modified. Their existing records are safe.</p>
              </div>
            )}

            {/* Per-row import error details */}
            {bulkErrors.length > 0 && (
              <div className="rounded-lg border border-destructive/40 bg-destructive/5 p-3 space-y-1.5">
                <p className="text-sm font-semibold text-destructive flex items-center gap-1.5">
                  ❌ Import Errors ({bulkErrors.length})
                </p>
                <ul className="text-xs space-y-1 max-h-36 overflow-y-auto pr-1">
                  {bulkErrors.map((err, i) => (
                    <li key={i} className="text-muted-foreground border-l-2 border-destructive/30 pl-2 py-0.5">
                      {err}
                    </li>
                  ))}
                </ul>
                <p className="text-xs text-muted-foreground pt-1">Fix the rows above and re-upload to add them.</p>
              </div>
            )}

            <div className="flex gap-2 pt-2">
              <Button onClick={handleBulkImport} className="flex-1">Start Import Process</Button>
              <Button variant="outline" onClick={() => { setBulkDialogOpen(false); setBulkErrors([]); setBulkExisted([]); }}>Close</Button>
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
                  <Input value={newSchedule.title} onChange={(e) => setNewSchedule({ ...newSchedule, title: e.target.value })} />
                </div>
                <div>
                  <Label>Amount (₹)</Label>
                  <Input type="number" value={newSchedule.amount} onChange={(e) => setNewSchedule({ ...newSchedule, amount: e.target.value })} />
                </div>
                <div>
                  <Label>Due Date</Label>
                  <Input type="date" value={newSchedule.dueDate} onChange={(e) => setNewSchedule({ ...newSchedule, dueDate: e.target.value })} />
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
            <div className="space-y-3 py-4">{[1, 2].map(i => <div key={i} className="h-24 bg-muted rounded-xl animate-pulse" />)}</div>
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
                        {new Date(enr.createdAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
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
                                  {h.actorName && (
                                    <span className="text-[11px] text-muted-foreground">
                                      by {h.actorName} {h.actorRole ? `(${h.actorRole.replace(/_/g, ' ')})` : ''}
                                    </span>
                                  )}
                                  <span className="text-[11px] text-muted-foreground whitespace-nowrap ml-auto">
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
              <Select value={bulkActionUniversityId || '__none__'} onValueChange={(v) => { setBulkActionUniversityId(v === '__none__' ? '' : v); setBulkActionProgramId(''); }}>
                <SelectTrigger>
                  <SelectValue placeholder="— Keep unchanged —" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">— Keep unchanged —</SelectItem>
                  {universities.filter((u: any) => u?.id).map((u: any) => (
                    <SelectItem key={u.id} value={u.id}>{u.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label>Program</Label>
              <Select value={bulkActionProgramId || '__none__'} onValueChange={(v) => setBulkActionProgramId(v === '__none__' ? '' : v)}>
                <SelectTrigger>
                  <SelectValue placeholder="— Keep unchanged —" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">— Keep unchanged —</SelectItem>
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
