import { useState, useEffect, useMemo } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { Login } from '@/pages/Login';
import { LandingPage } from '@/pages/LandingPage';
import { Dashboard } from '@/pages/Dashboard';
import { PrismaLayout, type TableItem } from '@/components/layout/PrismaLayout';
import { DataGrid } from '@/components/ui/data-grid';
import PublicRegisterPage from '@/pages/PublicRegisterPage';
import StudentApplicationPage from '@/pages/StudentApplicationPage';
import { getOpsNavItems } from '@/pages/ModernOpsDashboard';
import { getHRNavItems } from '@/pages/ModernHRDashboard';
import { getFinanceNavItems } from '@/pages/ModernFinanceDashboard';
import { getSalesNavItems } from '@/pages/ModernSalesDashboard';
import { getBranchManagerNavItems } from '@/pages/ModernBranchManagerDashboard';
import { getCollectionsNavItems } from '@/pages/ModernCollectionsDashboard';
import api from '@/lib/api';
import { toast } from 'sonner';

type ViewMode = 'dashboard' | 'table';

const EMPLOYEE_NAV_ITEMS: TableItem[] = [
  { id: 'dashboard', label: 'Dashboard' },
  { id: 'tasks', label: 'My Tasks' },
  { id: 'leaves', label: 'My Leaves' },
  { id: 'attendance', label: 'Attendance' },
  { id: 'holidays', label: 'Holiday List' },
  { id: 'announcements', label: 'Announcements' },
  { id: 'notice-board', label: 'Notice Board' },
  { id: 'team', label: 'My Team' },
  { id: 'ld-portal', label: 'L&D Portal' },
];

const STUDENT_NAV_ITEMS: TableItem[] = [
  { id: 'overview', label: 'Overview' },
  { id: 'classes', label: 'Live Classes' },
  { id: 'materials', label: 'Classes & E-Books' },
  { id: 'fees', label: 'Fee details' },
  { id: 'notifications', label: 'Notifications' },
  { id: 'invoices', label: 'Invoices' },
  { id: 'refer_admission', label: 'Refer Admission' },
  { id: 'terms', label: 'Terms & Conditions' },
  { id: 'help', label: 'Help & Support' },
];

// Maps sidebar table IDs to the dashboard tab they should open
const TABLE_TO_TAB: Record<string, string> = {
  // Superadmin
  organizations: 'organizations',
  licenses: 'licenses',
  inquiries: 'enquiries',
  // Org Admin
  hierarchy: 'hierarchy',
  branches: 'branches',
  settings: 'settings',
  dsms_migration: 'dsms_migration',
  academic_centers: 'academic_centers',
  // Shared
  users: 'users',
  departments: 'departments',
  tasks: 'tasks',
  meetings: 'meetings',
  // HR
  employees: 'employees',
  vacancies: 'vacancies',
  leave_requests: 'leaves',
  attendance: 'attendance',
  holidays: 'holidays',
  complaints: 'complaints',
  // Finance
  invoices: 'invoices',
  payments: 'payments',
  expenses: 'expenses',
  targets: 'targets',
  fee_structures: 'fees',
  payroll: 'payroll',
  payroll_batches: 'payroll-batches',
  auth_fees: 'auth_fees',
  pending_payment: 'pending_payment',
  program_fees: 'program_fees',
  wallet_topups: 'wallet_topups',
  enrollments_finance: 'enrollments_finance',
  // Operations / shared
  students: 'students',
  universities: 'universities',
  programs: 'programs',
  study_centers: 'centers',
  admission_sessions: 'admission_sessions',
  sessions: 'sessions',
  internal_marks: 'marks',
  announcements: 'announcements',
  pending_verification: 'pending_verification',
  program_allocations: 'program_allocations',
  enrollment_review: 'enrollment_review',
  // Sales
  leads: 'leads',
  lead_management: 'lead_management',
  enrolled_students: 'enrolled_students',
  payment_status: 'payment_status',
  course_details_dash: 'course_details_dash',
  course_details_res: 'course_details_res',
  invite_links: 'invite_links',
  admission_status_overview: 'admission_status_overview',
  admission_pipeline: 'admission_pipeline',
  student_status: 'student_status',
  team_members: 'team_members',
  attendance_overview: 'attendance_overview',
  assign_tasks: 'assign_tasks',
  individual_target: 'individual_target',
  team_reports: 'team_reports',
  admission_reports: 'admission_reports',
  conversion_report: 'conversion_report',
  daily_activity_report: 'daily_activity_report',
  counselor_admission_reports: 'counselor_admission_reports',
  performance_reports: 'performance_reports',
  university_details_res: 'university_details_res',
  brochures: 'brochures',
  approval_requests: 'approval_requests',
  support_requests: 'support_requests',
  sub_departments: 'subdepartments',
  // CEO
  performance: 'performance',
  // Center Admin
  center_wallet: 'wallet',
  enroll_student: 'enroll',
  center_enrollments: 'enrollments',
  center_programs: 'programs',
  // Employee
  notice_board: 'notice-board',
  ld_portal: 'ld-portal',
  payslips: 'payslips',
  my_team: 'team',
  // Common
  escalations: 'escalations',
  audit_logs: 'overview',
  collections: 'collections',
  biometric_devices: 'biometric-devices',
  // Student Portal
  overview: 'overview',
  classes: 'classes',
  materials: 'materials',
  fees: 'fees',
  notifications: 'notifications',
  refer_admission: 'refer_admission',
  terms: 'terms',
  help: 'help',
};

function App() {
  const { user, logout } = useAuth();
  const urlParams = new URLSearchParams(window.location.search);
  const [viewMode, setViewMode] = useState<ViewMode>((urlParams.get('view') as ViewMode) || 'dashboard');
  const [activeTab, setActiveTab] = useState<string | undefined>(urlParams.get('tab') || undefined);

  const getDefaultTable = (role?: string) => {
    switch (role) {
      case 'superadmin': return 'organizations';
      case 'ceo': return 'dashboard';
      case 'ops_admin':
      case 'ops_sub_admin':
      case 'finance_sub_admin':
      case 'finance_admin':
      case 'hr_admin':
      case 'hr_sub_admin':
      case 'sales_admin':
      case 'sales_sub_admin':
      case 'sales': return 'overview';
      case 'student':
      case 'center_student': return 'overview';
      case 'academic_counselor': return 'dashboard';
      case 'center_teacher':
      case 'teacher': return 'dashboard';
      default: return 'tasks';
    }
  };
  
  const [activeTable, setActiveTable] = useState(() => {
    const params = new URLSearchParams(window.location.search);
    return params.get('table') || getDefaultTable(user?.role);
  });
  const [tableData, setTableData] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  // For employee sub-dept managers: track their department type to show correct nav
  const [deptType, setDeptType] = useState<string | null>(null);
  const [isCollectionsOverseer, setIsCollectionsOverseer] = useState(false);

  // When user loads/changes, reset activeTable to the correct default, or read from URL
  useEffect(() => {
    if (user?.role) {
      const params = new URLSearchParams(window.location.search);
      setActiveTable(params.get('table') || getDefaultTable(user.role));
      setActiveTab(params.get('tab') || undefined);
      setViewMode((params.get('view') as ViewMode) || 'dashboard');
      setDeptType(null);
    }
  }, [user?.role]);

  // Handle Browser Back/Forward
  useEffect(() => {
    const handlePopState = () => {
      if (!user?.role) return;
      const params = new URLSearchParams(window.location.search);
      setViewMode((params.get('view') as ViewMode) || 'dashboard');
      setActiveTable(params.get('table') || getDefaultTable(user.role));
      setActiveTab(params.get('tab') || undefined);
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, [user?.role]);

  // Sync state to URL
  useEffect(() => {
    if (!user?.role) return;
    const url = new URL(window.location.href);
    
    const currentView = url.searchParams.get('view') || 'dashboard';
    const currentTable = url.searchParams.get('table') || getDefaultTable(user.role);
    const currentTab = url.searchParams.get('tab') || undefined;

    if (currentView === viewMode && currentTable === activeTable && currentTab === activeTab) {
      return;
    }

    if (viewMode === 'dashboard') url.searchParams.delete('view');
    else url.searchParams.set('view', viewMode);
    
    if (activeTable === getDefaultTable(user.role)) url.searchParams.delete('table');
    else url.searchParams.set('table', activeTable);
    
    if (activeTab) url.searchParams.set('tab', activeTab);
    else url.searchParams.delete('tab');
    
    window.history.pushState({}, '', url);
  }, [viewMode, activeTable, activeTab, user?.role]);

  // Check if standard user is designated collections overseer
  useEffect(() => {
    if (user && !['superadmin', 'ceo', 'org_admin', 'finance_admin', 'finance_sub_admin', 'sales_admin', 'sales_sub_admin', 'academic_counselor', 'center_student', 'student', 'center_teacher', 'teacher'].includes(user.role)) {
      api.get('/collections/metrics')
        .then(res => {
          if (res.data.success && res.data.data?.currentUserOversight?.isOverseer) {
            setIsCollectionsOverseer(true);
          } else {
            setIsCollectionsOverseer(false);
          }
        })
        .catch((err) => {
          console.error('Failed to get collections metrics:', err);
          setIsCollectionsOverseer(false);
        });
    } else {
      setIsCollectionsOverseer(false);
    }
  }, [user]);

  // Fetch department type for employee sub-dept managers (mirrors Dashboard.tsx logic)
  useEffect(() => {
    if (user?.role !== 'employee') return;
    const subDeptId = (user as any)?.subDepartmentId;
    if (!user?.departmentId && !subDeptId) return;

    const fetchDeptType = async () => {
      try {
        // Try direct department object or departmentId first
        const dept = (user as any).department || user?.departmentId;
        if (dept) {
          if (typeof dept === 'object' && (dept as any)?.type) {
            setDeptType((dept as any).type);
            return;
          }
          const deptId = typeof dept === 'object'
            ? (dept as any).id?.toString()
            : dept.toString();
          if (deptId) {
            const res = await api.get(`/departments/${deptId}`);
            if (res.data.data?.type) { setDeptType(res.data.data.type); return; }
          }
        }
        // Fall back to sub-department's parentDeptId
        const subDept = typeof subDeptId === 'object' ? subDeptId : null;
        const parentDeptId = subDept?.parentDeptId;
        if (parentDeptId) {
          if (typeof parentDeptId === 'object' && parentDeptId.type) {
            setDeptType(parentDeptId.type);
            return;
          }
          const pid = typeof parentDeptId === 'object' ? parentDeptId.id?.toString() : parentDeptId?.toString();
          if (pid) {
            const res = await api.get(`/departments/${pid}`);
            if (res.data.data?.type) { setDeptType(res.data.data.type); return; }
          }
        }
        // Last resort: fetch from /sub-departments/my
        try {
          const res = await api.get('/sub-departments/my');
          const parentType = res.data.data?.subDepartment?.parentDeptId?.type;
          if (parentType) { setDeptType(parentType); return; }
        } catch (err) {
          console.error('Failed to fetch sub-departments:', err);
        }
      } catch (err) {
        console.error('Failed to fetch dept type for nav:', err);
      }
    };

    fetchDeptType();
  }, [user?.role, (user as any)?.subDepartmentId, user?.departmentId, (user as any)?.department]);

  // Route to StudentApplicationPage if path is /student-apply
  // Route to public pages if needed — NOTE: useMemo/useEffect must be declared before these returns
  const hasInviteToken = urlParams.has('token');

  const tables = useMemo(() => getAvailableTables(), [user?.role, (user as any)?.subDepartmentId, (user as any)?.isBranchManager, deptType, isCollectionsOverseer]);

  // Validate activeTable against allowed tables for the user
  useEffect(() => {
    if (!user || tables.length === 0) return;
    
    // 'dashboard' and 'overview' are universally handled fallback states
    if (activeTable === 'dashboard' || activeTable === 'overview') return;

    const isValid = tables.some(t => t.id === activeTable);
    if (!isValid) {
      console.warn(`Unauthorized or invalid table: ${activeTable}. Resetting to default.`);
      const defaultTable = getDefaultTable(user.role);
      
      setActiveTable(defaultTable);
      setActiveTab(undefined);
      setViewMode('dashboard');
      
      const url = new URL(window.location.href);
      if (defaultTable === getDefaultTable(user.role)) url.searchParams.delete('table');
      else url.searchParams.set('table', defaultTable);
      
      url.searchParams.delete('view');
      url.searchParams.delete('tab');
      
      window.history.replaceState({}, '', url);
    }
  }, [activeTable, tables, user]);
  // Fetch data for active table — only when in table view mode
  useEffect(() => {
    if (user && activeTable !== 'dashboard' && viewMode === 'table') {
      fetchTableData();
    }
  }, [activeTable, user, viewMode]);

  if (window.location.pathname === '/student-apply') {
    return <StudentApplicationPage />;
  }

  // Public register page — show when on /register path OR has ?token= param (no-router SPA)
  // Only intercept if user is not logged in, to avoid breaking logged-in users with token params
  if (window.location.pathname === '/register' || (hasInviteToken && !user)) {
    return <PublicRegisterPage />;
  }

  // Define available tables based on user role
  function getAvailableTables(): TableItem[] {
    if (!user) return [];
    
    const baseTables: TableItem[] = [
      { id: 'dashboard', label: 'Dashboard' },
      { id: 'users', label: 'Users' },
      { id: 'tasks', label: 'Tasks' },
      { id: 'departments', label: 'Departments' },
    ];

    if (user.role === 'superadmin') {
      return [
        { id: 'dashboard', label: 'Dashboard' },
        { id: 'organizations', label: 'Organizations' },
        { id: 'licenses', label: 'Licenses' },
        { id: 'users', label: 'Users' },
        { id: 'departments', label: 'Departments' },
        { id: 'inquiries', label: 'Enquiries' },
        { id: 'biometric_devices', label: 'Biometric Devices' },
        { id: 'audit_logs', label: 'Audit Logs' },
        { id: 'meetings', label: 'Meetings' },
      ];
    }

    if (user.role === 'ceo' || user.role === 'general_manager') {
      return [
        { id: 'dashboard', label: 'Executive Overview' },
        { id: 'performance', label: 'Performance' },
        { id: 'kpi-kra', label: 'KPI / KRA Report' },
        { id: 'users', label: 'Users' },
        { id: 'departments', label: 'Departments' },
        { id: 'tasks', label: 'Tasks' },
        { id: 'escalations', label: 'Escalations' },
        { id: 'students', label: 'Students' },
        { id: 'enrollment_review', label: 'Enrollment Review' },
        { id: 'invoices', label: 'Invoices' },
        { id: 'collections', label: 'Collections' },
        { id: 'leads', label: 'Leads' },
        { id: 'university_commissions', label: 'Commissions' },
        { id: 'activity_report', label: 'Activity Report' },
        ...(user.role === 'ceo'
          ? [
              { id: 'delete_approvals', label: 'Delete Approvals' },
              { id: 'meetings', label: 'Meetings' },
              { id: 'activity-logs', label: 'Activity Logs' },
            ]
          : []),
      ];
    }

    if (user.role === 'org_admin') {
      return [
        { id: 'dashboard', label: 'Overview' },
        { id: 'hierarchy', label: 'Hierarchy' },
        { id: 'branches', label: 'Branches' },
        { id: 'users', label: 'Users' },
        { id: 'departments', label: 'Departments' },
        { id: 'tasks', label: 'Tasks' },
        { id: 'students', label: 'Students' },
        { id: 'universities', label: 'Universities' },
        { id: 'programs', label: 'Programs' },
        { id: 'academic_centers', label: 'Academic Centers' },
        { id: 'study_centers', label: 'Study Centers' },
        { id: 'invoices', label: 'Invoices' },
        { id: 'payments', label: 'Payments' },
        { id: 'expenses', label: 'Expenses' },
        { id: 'employees', label: 'Employees' },
        { id: 'leave_requests', label: 'Leave Requests' },
        { id: 'leads', label: 'Leads' },
        { id: 'sessions', label: 'Sessions' },
        { id: 'enrollment_review', label: 'Enrollment Review' },
        { id: 'collections', label: 'Collections' },
        { id: 'biometric_devices', label: 'Biometric Devices' },
        { id: 'settings', label: 'Organisation Settings' },
        { id: 'meetings', label: 'Meetings' },
        { id: 'dsms_migration', label: 'DSMS Migration' },
      ];
    }

    // Branch manager — takes priority over role-specific nav
    if ((user as any)?.isBranchManager && user.role !== 'student') {
      return getBranchManagerNavItems();
    }

    if (user.role === 'ops_admin' || user.role === 'ops_sub_admin') {
      return getOpsNavItems();
    }

    if (['finance_admin', 'finance_sub_admin', 'finance'].includes(user.role)) {
      return getFinanceNavItems();
    }

    if (user.role === 'hr_admin' || user.role === 'hr_sub_admin') {
      return getHRNavItems();
    }

    if (user.role === 'sales_admin') {
      return getSalesNavItems(true);
    }

    if (user.role === 'sales_sub_admin') {
      return getSalesNavItems(false);
    }

    if (user.role === 'sales') {
      return getSalesNavItems(false);
    }

    if (['collections_admin', 'collections'].includes(user.role)) {
      return getCollectionsNavItems();
    }

    if (user.role === 'center_admin') {
      return [
        { id: 'dashboard', label: 'Dashboard' },
        { id: 'center_wallet', label: 'Wallet' },
        { id: 'enroll_student', label: 'Enroll Student' },
        { id: 'center_enrollments', label: 'My Enrollments' },
        { id: 'center_programs', label: 'Programs & Materials' },
        { id: 'tasks', label: 'Tasks' },
        { id: 'meetings', label: 'Meetings' },
      ];
    }

    if (user.role === 'academic_counselor') {
      return [
        { id: 'dashboard', label: 'Counselor Portal' },
      ];
    }

    if (user.role === 'center_teacher' || user.role === 'teacher') {
      return [
        { id: 'dashboard', label: 'Teacher Portal' },
      ];
    }

    if (user.role === 'student' || user.role === 'center_student') {
      return [...STUDENT_NAV_ITEMS];
    }

    const result: TableItem[] = (() => {
      if (user.role === 'employee') {
        const isSubDeptManager = Boolean((user as any)?.subDepartmentId);
        if (deptType) {
          if (isSubDeptManager) {
            switch (deptType) {
              case 'operations': return getOpsNavItems();
              case 'hr': return getHRNavItems();
              case 'finance': return getFinanceNavItems();
              case 'sales': return getSalesNavItems(true);
              case 'collections': return getCollectionsNavItems();
            }
          } else if (deptType === 'sales') {
            return getSalesNavItems(false);
          } else if (deptType === 'collections') {
            return getCollectionsNavItems();
          }
        }
        return EMPLOYEE_NAV_ITEMS;
      }
      return baseTables;
    })();

    const mutableResult: TableItem[] = [...result];

    if (isCollectionsOverseer && !mutableResult.some(t => t.id === 'collections')) {
      mutableResult.push({ id: 'collections', label: 'Collections' });
    }

    if (user.role !== 'student' && user.role !== 'center_student' && !mutableResult.some(t => t.id === 'meetings')) {
      mutableResult.push({ id: 'meetings', label: 'Meetings' });
    }

    let finalResult: TableItem[] = mutableResult;
    const adminRolesForTeams = ['finance_admin', 'finance_sub_admin', 'hr_admin', 'hr_sub_admin', 'ops_admin', 'superadmin', 'org_admin', 'ceo', 'general_manager'];
    if (!adminRolesForTeams.includes(user.role)) {
      finalResult = finalResult.filter(item => item.id !== 'team_permissions');
    }

    const userPermissions = user.permissions;
    if (userPermissions && Array.isArray(userPermissions) && userPermissions.includes('__custom__')) {
      const allowed: TableItem[] = finalResult.filter(item => {
        if (item.isSection || item.id === 'overview' || item.id === 'dashboard' || item.id === 'team_permissions' || item.id.startsWith('__')) return true;
        return userPermissions.includes(item.id);
      });

      // Remove sections that have no children
      const sectionsToRemove = new Set<string>();
      for (let i = 0; i < allowed.length; i++) {
        if (allowed[i].isSection) {
          let hasChildren = false;
          for (let j = i + 1; j < allowed.length; j++) {
            if (allowed[j].isSection) break;
            hasChildren = true;
            break;
          }
          if (!hasChildren) {
            sectionsToRemove.add(allowed[i].id);
          }
        }
      }

      return allowed.filter(item => !sectionsToRemove.has(item.id));
    }

    return finalResult;
  }



  const handleTableChange = (table: string) => {
    // Section headers are non-clickable
    if (table.startsWith('__')) return;

    if (table === 'dashboard') {
      setViewMode('dashboard');
      setActiveTable('dashboard');
      setActiveTab(undefined);
      return;
    }

    // For role-specific dashboards (ops, hr, finance, sales, collections), the nav item IDs
    // are already the correct tab IDs — pass them directly
    const roleDashboardRoles = ['ops_admin', 'ops_sub_admin', 'finance_admin', 'finance_sub_admin', 'finance', 'hr_admin', 'hr_sub_admin', 'sales_admin', 'sales_sub_admin', 'sales', 'collections_admin', 'collections', 'academic_counselor', 'center_teacher', 'teacher', 'ceo', 'general_manager'];
    const isEmployeeSubDeptManager = user?.role === 'employee' && Boolean((user as any)?.subDepartmentId) && Boolean(deptType);
    const isEmployeeRole = user?.role === 'employee';
    const isBranchManager = Boolean((user as any)?.isBranchManager) && user?.role !== 'student' && user?.role !== 'center_student';
    const isStudentRole = user?.role === 'student' || user?.role === 'center_student';
    if (user && (roleDashboardRoles.includes(user.role) || isEmployeeSubDeptManager || isEmployeeRole || isBranchManager || isStudentRole)) {
      setViewMode('dashboard');
      setActiveTable(table);
      setActiveTab(table);
      return;
    }

    // For other roles, use the TABLE_TO_TAB mapping
    const tab = TABLE_TO_TAB[table];
    if (tab) {
      setViewMode('dashboard');
      setActiveTable(table);
      setActiveTab(tab);
    } else {
      // Fallback to table view for unmapped items
      setViewMode('table');
      setActiveTable(table);
      setActiveTab(undefined);
    }
  };

  const fetchTableData = async () => {
    setLoading(true);
    try {
      let response;
      
      switch (activeTable) {
        case 'users':
          response = await api.get('/users');
          break;
        case 'tasks':
          response = await api.get('/tasks');
          break;
        case 'departments':
          response = await api.get('/departments');
          break;
        case 'organizations':
          response = await api.get('/organizations');
          break;
        case 'inquiries':
          response = await api.get('/organizations/inquiries');
          break;
        case 'licenses':
          response = await api.get('/licenses');
          break;
        case 'students':
          response = await api.get('/students');
          break;
        case 'universities':
          response = await api.get('/operations/universities');
          break;
        case 'programs':
          response = await api.get('/operations/programs');
          break;
        case 'study_centers':
          response = await api.get('/operations/centers');
          break;
        case 'admission_sessions':
          response = await api.get('/operations/sessions');
          break;
        case 'internal_marks':
          response = await api.get('/operations/marks');
          break;
        case 'invoices':
          response = await api.get('/finance/invoices');
          break;
        case 'payments':
          response = await api.get('/finance/payments');
          break;
        case 'expenses':
          response = await api.get('/finance/expenses');
          break;
        case 'targets':
          response = await api.get('/finance/targets');
          break;
        case 'fee_structures':
          response = await api.get('/finance/fees');
          break;
        case 'employees':
          response = await api.get('/users?role=employee');
          break;
        case 'vacancies':
          response = await api.get('/hr/vacancies');
          break;
        case 'leave_requests':
          response = await api.get('/hr/leaves');
          break;
        case 'attendance':
          response = await api.get('/hr/attendance');
          break;
        case 'holidays':
          response = await api.get('/hr/holidays');
          break;
        case 'complaints':
          response = await api.get('/hr/complaints');
          break;
        case 'leads':
          response = await api.get('/sales/leads');
          break;
        case 'escalations':
          response = await api.get('/escalations');
          break;
        case 'announcements':
          response = await api.get('/operations/announcements');
          break;
        case 'audit_logs':
          response = await api.get('/ceo/activity-logs');
          break;
        case 'payroll':
          response = await api.get('/payroll');
          break;
        case 'payroll_batches':
          response = await api.get('/payroll/batches');
          break;
        default:
          response = { data: { data: [] } };
      }
      
      
      // Transform data for better display
      let data = response.data.data || [];
      
      // For users table, combine firstName and lastName and format role
      if (activeTable === 'users') {
        data = data.map((user: any) => ({
          ...user,
          name: user.name || `${user.firstName || ''} ${user.lastName || ''}`.trim() || 'N/A',
          role: user.role ? user.role.replace(/_/g, ' ').replace(/\b\w/g, (l: string) => l.toUpperCase()) : 'N/A',
          department: typeof user.departmentId === 'object' && user.departmentId?.name 
            ? user.departmentId.name 
            : (user.departmentId || 'N/A'),
          status: user.status || 'active',
        }));
      }
      
      setTableData(data);
    } catch (error: any) {
      if (error.response?.status === 403) {
        toast.error('You do not have permission to access this data');
        setTableData([]);
      } else if (error.response?.status === 404) {
        toast.error('This feature is not yet available');
        setTableData([]);
      } else {
        toast.error(error.response?.data?.message || 'Failed to fetch data');
        setTableData([]);
      }
    } finally {
      setLoading(false);
    }
  };

  // Get columns for active table
  const getColumns = () => {
    const columnMap: Record<string, any[]> = {
      users: [
        { key: 'userId', label: 'id', type: 'text', required: true },
        { key: 'name', label: 'name', type: 'text' },
        { key: 'email', label: 'email', type: 'text', required: true },
        { key: 'role', label: 'role', type: 'text' },
        { key: 'department', label: 'department', type: 'text' },
        { key: 'status', label: 'status', type: 'text' },
        { key: 'createdAt', label: 'createdAt', type: 'date' },
        { key: 'id', label: 'id', type: 'id' },
      ],
      tasks: [
        { key: 'id', label: 'id', type: 'id', required: true },
        { key: 'title', label: 'title', type: 'text', required: true },
        { key: 'description', label: 'description', type: 'text' },
        { key: 'status', label: 'status', type: 'text' },
        { key: 'priority', label: 'priority', type: 'text' },
        { key: 'dueDate', label: 'dueDate', type: 'date' },
        { key: 'createdAt', label: 'createdAt', type: 'date' },
      ],
      departments: [
        { key: 'id', label: 'id', type: 'id', required: true },
        { key: 'name', label: 'name', type: 'text', required: true },
        { key: 'type', label: 'type', type: 'text' },
        { key: 'organizationId', label: 'organizationId', type: 'text' },
        { key: 'createdAt', label: 'createdAt', type: 'date' },
      ],
      organizations: [
        { key: 'id', label: 'id', type: 'id', required: true },
        { key: 'name', label: 'name', type: 'text', required: true },
        { key: 'email', label: 'email', type: 'text' },
        { key: 'phone', label: 'phone', type: 'text' },
        { key: 'licenseId', label: 'licenseId', type: 'text' },
        { key: 'createdAt', label: 'createdAt', type: 'date' },
      ],
      licenses: [
        { key: 'id', label: 'id', type: 'id', required: true },
        { key: 'name', label: 'name', type: 'text', required: true },
        { key: 'type', label: 'type', type: 'text' },
        { key: 'maxUsers', label: 'maxUsers', type: 'number' },
        { key: 'price', label: 'price', type: 'number' },
        { key: 'createdAt', label: 'createdAt', type: 'date' },
      ],
      inquiries: [
        { key: 'orgName', label: 'Organisation Name', type: 'text' },
        { key: 'adminName', label: 'Admin Name', type: 'text' },
        { key: 'email', label: 'Email', type: 'text' },
        { key: 'phone', label: 'Phone', type: 'text' },
        { key: 'status', label: 'Status', type: 'text' },
        { key: 'createdAt', label: 'Submitted At', type: 'date' },
      ],
      students: [
        { key: 'id', label: 'id', type: 'id', required: true },
        { key: 'firstName', label: 'firstName', type: 'text' },
        { key: 'lastName', label: 'lastName', type: 'text' },
        { key: 'email', label: 'email', type: 'text' },
        { key: 'enrollmentNo', label: 'enrollmentNo', type: 'text' },
        { key: 'status', label: 'status', type: 'text' },
        { key: 'createdAt', label: 'createdAt', type: 'date' },
      ],
      invoices: [
        { key: 'id', label: 'id', type: 'id', required: true },
        { key: 'invoiceNo', label: 'invoiceNo', type: 'text' },
        { key: 'amount', label: 'amount', type: 'number' },
        { key: 'status', label: 'status', type: 'text' },
        { key: 'dueDate', label: 'dueDate', type: 'date' },
        { key: 'createdAt', label: 'createdAt', type: 'date' },
      ],
      leads: [
        { key: 'id', label: 'id', type: 'id', required: true },
        { key: 'name', label: 'name', type: 'text' },
        { key: 'email', label: 'email', type: 'text' },
        { key: 'phone', label: 'phone', type: 'text' },
        { key: 'status', label: 'status', type: 'text' },
        { key: 'source', label: 'source', type: 'text' },
        { key: 'createdAt', label: 'createdAt', type: 'date' },
      ],
      universities: [
        { key: 'id', label: 'id', type: 'id', required: true },
        { key: 'name', label: 'name', type: 'text', required: true },
        { key: 'code', label: 'code', type: 'text' },
        { key: 'type', label: 'type', type: 'text' },
        { key: 'status', label: 'status', type: 'text' },
        { key: 'createdAt', label: 'createdAt', type: 'date' },
      ],
      programs: [
        { key: 'id', label: 'id', type: 'id', required: true },
        { key: 'name', label: 'name', type: 'text', required: true },
        { key: 'code', label: 'code', type: 'text' },
        { key: 'duration', label: 'duration', type: 'text' },
        { key: 'status', label: 'status', type: 'text' },
        { key: 'createdAt', label: 'createdAt', type: 'date' },
      ],
      study_centers: [
        { key: 'id', label: 'id', type: 'id', required: true },
        { key: 'name', label: 'name', type: 'text', required: true },
        { key: 'code', label: 'code', type: 'text' },
        { key: 'city', label: 'city', type: 'text' },
        { key: 'state', label: 'state', type: 'text' },
        { key: 'status', label: 'status', type: 'text' },
        { key: 'createdAt', label: 'createdAt', type: 'date' },
      ],
      admission_sessions: [
        { key: 'id', label: 'id', type: 'id', required: true },
        { key: 'sessionName', label: 'sessionName', type: 'text' },
        { key: 'startDate', label: 'startDate', type: 'date' },
        { key: 'endDate', label: 'endDate', type: 'date' },
        { key: 'status', label: 'status', type: 'text' },
        { key: 'createdAt', label: 'createdAt', type: 'date' },
      ],
      internal_marks: [
        { key: 'id', label: 'id', type: 'id', required: true },
        { key: 'studentId', label: 'studentId', type: 'text' },
        { key: 'subject', label: 'subject', type: 'text' },
        { key: 'marks', label: 'marks', type: 'number' },
        { key: 'maxMarks', label: 'maxMarks', type: 'number' },
        { key: 'createdAt', label: 'createdAt', type: 'date' },
      ],
      announcements: [
        { key: 'id', label: 'id', type: 'id', required: true },
        { key: 'title', label: 'title', type: 'text', required: true },
        { key: 'message', label: 'message', type: 'text' },
        { key: 'type', label: 'type', type: 'text' },
        { key: 'priority', label: 'priority', type: 'text' },
        { key: 'createdAt', label: 'createdAt', type: 'date' },
      ],
      payments: [
        { key: 'id', label: 'id', type: 'id', required: true },
        { key: 'paymentNo', label: 'paymentNo', type: 'text' },
        { key: 'amount', label: 'amount', type: 'number' },
        { key: 'method', label: 'method', type: 'text' },
        { key: 'status', label: 'status', type: 'text' },
        { key: 'createdAt', label: 'createdAt', type: 'date' },
      ],
      expenses: [
        { key: 'id', label: 'id', type: 'id', required: true },
        { key: 'description', label: 'description', type: 'text' },
        { key: 'amount', label: 'amount', type: 'number' },
        { key: 'category', label: 'category', type: 'text' },
        { key: 'status', label: 'status', type: 'text' },
        { key: 'createdAt', label: 'createdAt', type: 'date' },
      ],
      targets: [
        { key: 'id', label: 'id', type: 'id', required: true },
        { key: 'name', label: 'name', type: 'text' },
        { key: 'targetValue', label: 'targetValue', type: 'number' },
        { key: 'achievedValue', label: 'achievedValue', type: 'number' },
        { key: 'period', label: 'period', type: 'text' },
        { key: 'createdAt', label: 'createdAt', type: 'date' },
      ],
      fee_structures: [
        { key: 'id', label: 'id', type: 'id', required: true },
        { key: 'name', label: 'name', type: 'text' },
        { key: 'amount', label: 'amount', type: 'number' },
        { key: 'type', label: 'type', type: 'text' },
        { key: 'status', label: 'status', type: 'text' },
        { key: 'createdAt', label: 'createdAt', type: 'date' },
      ],
      employees: [
        { key: 'id', label: 'id', type: 'id', required: true },
        { key: 'userId', label: 'userId', type: 'text' },
        { key: 'name', label: 'name', type: 'text' },
        { key: 'email', label: 'email', type: 'text' },
        { key: 'designation', label: 'designation', type: 'text' },
        { key: 'status', label: 'status', type: 'text' },
        { key: 'createdAt', label: 'createdAt', type: 'date' },
      ],
      vacancies: [
        { key: 'id', label: 'id', type: 'id', required: true },
        { key: 'title', label: 'title', type: 'text', required: true },
        { key: 'department', label: 'department', type: 'text' },
        { key: 'positions', label: 'positions', type: 'number' },
        { key: 'status', label: 'status', type: 'text' },
        { key: 'createdAt', label: 'createdAt', type: 'date' },
      ],
      leave_requests: [
        { key: 'id', label: 'id', type: 'id', required: true },
        { key: 'userId', label: 'userId', type: 'text' },
        { key: 'leaveType', label: 'leaveType', type: 'text' },
        { key: 'startDate', label: 'startDate', type: 'date' },
        { key: 'endDate', label: 'endDate', type: 'date' },
        { key: 'status', label: 'status', type: 'text' },
        { key: 'createdAt', label: 'createdAt', type: 'date' },
      ],
      attendance: [
        { key: 'id', label: 'id', type: 'id', required: true },
        { key: 'userId', label: 'userId', type: 'text' },
        { key: 'date', label: 'date', type: 'date' },
        { key: 'checkIn', label: 'checkIn', type: 'text' },
        { key: 'checkOut', label: 'checkOut', type: 'text' },
        { key: 'status', label: 'status', type: 'text' },
        { key: 'createdAt', label: 'createdAt', type: 'date' },
      ],
      holidays: [
        { key: 'id', label: 'id', type: 'id', required: true },
        { key: 'name', label: 'name', type: 'text', required: true },
        { key: 'date', label: 'date', type: 'date' },
        { key: 'type', label: 'type', type: 'text' },
        { key: 'description', label: 'description', type: 'text' },
        { key: 'createdAt', label: 'createdAt', type: 'date' },
      ],
      complaints: [
        { key: 'id', label: 'id', type: 'id', required: true },
        { key: 'title', label: 'title', type: 'text', required: true },
        { key: 'description', label: 'description', type: 'text' },
        { key: 'status', label: 'status', type: 'text' },
        { key: 'priority', label: 'priority', type: 'text' },
        { key: 'createdAt', label: 'createdAt', type: 'date' },
      ],
      escalations: [
        { key: 'id', label: 'id', type: 'id', required: true },
        { key: 'title', label: 'title', type: 'text', required: true },
        { key: 'description', label: 'description', type: 'text' },
        { key: 'status', label: 'status', type: 'text' },
        { key: 'priority', label: 'priority', type: 'text' },
        { key: 'createdAt', label: 'createdAt', type: 'date' },
      ],
      payroll: [
        { key: 'id', label: 'id', type: 'id', required: true },
        { key: 'employeeId', label: 'employeeId', type: 'text' },
        { key: 'month', label: 'month', type: 'text' },
        { key: 'year', label: 'year', type: 'number' },
        { key: 'basicSalary', label: 'basicSalary', type: 'number' },
        { key: 'netSalary', label: 'netSalary', type: 'number' },
        { key: 'status', label: 'status', type: 'text' },
        { key: 'createdAt', label: 'createdAt', type: 'date' },
      ],
      payroll_batches: [
        { key: 'id', label: 'id', type: 'id', required: true },
        { key: 'batchNumber', label: 'batchNumber', type: 'text' },
        { key: 'month', label: 'month', type: 'text' },
        { key: 'year', label: 'year', type: 'number' },
        { key: 'totalAmount', label: 'totalAmount', type: 'number' },
        { key: 'status', label: 'status', type: 'text' },
        { key: 'createdAt', label: 'createdAt', type: 'date' },
      ],
    };

    return columnMap[activeTable] || [
      { key: 'id', label: 'id', type: 'id', required: true },
      { key: 'name', label: 'name', type: 'text' },
      { key: 'createdAt', label: 'createdAt', type: 'date' },
    ];
  };

  const handleEdit = (_id: string, _data: any) => {
    toast.info('Edit functionality coming soon');
  };

  const handleDelete = async (_id: string) => {
    if (!confirm('Are you sure you want to delete this record?')) return;
    
    try {
      // Implement delete based on table
      toast.success('Record deleted successfully');
      fetchTableData();
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to delete record');
    }
  };

  // Redirect to login or landing page if not authenticated
  if (!user) {
    if (window.location.pathname === '/login') {
      return <Login />;
    }
    return <LandingPage onGoToLogin={() => window.location.pathname = '/login'} />;
  }

  // For employees with department or sub-department assignments, route to department dashboard
  // Branch managers and students are excluded
  const shouldUseDepartmentDashboard = Boolean(
    user.role === 'employee' &&
    !(user as any).isBranchManager &&
    (user.departmentId || (user as any).subDepartmentId) &&
    viewMode === 'dashboard'
  );

  return (
    <PrismaLayout
      tables={tables}
      activeTable={activeTable}
      onTableChange={handleTableChange}
      onLogout={() => {
        const url = new URL(window.location.href);
        url.search = '';
        window.history.replaceState({}, '', url);
        logout();
      }}
      userName={user?.name}
      userRole={user?.role}
      userId={user?.id?.toString()}
      organizationId={
        (() => {
          const orgId = (user as any)?.organizationId;
          if (!orgId) return undefined;
          if (typeof orgId === 'object') return orgId.id?.toString() || String(orgId);
          return String(orgId);
        })()
      }
      schema="public"
    >
      {viewMode === 'dashboard' ? (
        <Dashboard 
          onNavigateToTable={handleTableChange} 
          useDepartmentDashboard={shouldUseDepartmentDashboard}
          initialTab={activeTab}
        />
      ) : (
        <div className="space-y-4 h-full flex flex-col">

          <div className="flex-1 overflow-hidden">
            <DataGrid
              columns={getColumns()}
              data={tableData}
              onEdit={handleEdit}
              onDelete={handleDelete}
              loading={loading}
            />
          </div>
        </div>
      )}
    </PrismaLayout>
  );
}

export default App;
