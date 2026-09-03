import React from 'react';
import { useAuth } from '@/hooks/useAuth';
import type { UserRole, DepartmentType } from '@/types/erp';
import { cn } from '@/lib/utils';
import api from '@/lib/api';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import {
  Building2,
  Users,
  LayoutDashboard,
  GraduationCap,
  DollarSign,
  Briefcase,
  TrendingUp,
  School,
  Settings,
  UserCog,
  AlertTriangle,
  FileText,
  Calendar,
  MessageSquare,
  CheckSquare,
  LogOut,
  ChevronLeft,
  ChevronRight,
  Building,
  Key,
  Target,
  Receipt,
  Wallet,
  UserPlus,
  Bell,
  Home,
  Phone,
  BarChart2,
  User,
  BookOpen,
  MonitorSmartphone,
  Video,
  Activity
} from 'lucide-react';

interface SidebarProps {
  isCollapsed: boolean;
  onToggle: () => void;
  activeModule: string;
  onModuleChange: (module: string) => void;
}

interface NavItem {
  id: string;
  label: string;
  icon?: React.ElementType;
  roles?: UserRole[];
  badge?: number;
  children?: NavItem[];
  department?: DepartmentType;
  isSection?: boolean;
}

const navItems: NavItem[] = [
  {
    id: 'dashboard',
    label: 'Dashboard',
    icon: LayoutDashboard,
    roles: ['superadmin', 'org_admin', 'ceo', 'general_manager', 'ops_admin', 'finance_admin', 'finance_sub_admin', 'hr_admin', 'hr_sub_admin', 'sales_admin', 'sales_sub_admin', 'employee'],
  },
  {
    id: 'organizations',
    label: 'Organizations',
    icon: Building2,
    roles: ['superadmin'],
    children: [
      { id: 'org-list', label: 'All Organizations', icon: Building, roles: ['superadmin'] },
      { id: 'licenses', label: 'Licenses', icon: Key, roles: ['superadmin'] },
    ],
  },
  {
    id: 'departments',
    label: 'Departments',
    icon: Building,
    roles: ['org_admin', 'ceo', 'general_manager'],
  },
  {
    id: 'ceo-dashboard',
    label: 'CEO / GM Dashboard',
    icon: UserCog,
    roles: ['ceo', 'general_manager'],
    children: [
      { id: 'escalations', label: 'Escalations', icon: AlertTriangle, roles: ['ceo', 'general_manager'], badge: 1 },
      { id: 'reports', label: 'Reports', icon: FileText, roles: ['ceo', 'general_manager'] },
      { id: 'performance', label: 'Performance', icon: Target, roles: ['ceo', 'general_manager'] },
      { id: 'meetings', label: 'Meeting Report', icon: Video, roles: ['ceo'] },
      { id: 'activity-logs', label: 'Activity Logs', icon: Activity, roles: ['ceo', 'org_admin'] },
    ],
  },
  {
    id: 'operations',
    label: 'Operations',
    icon: GraduationCap,
    roles: ['ops_admin', 'ceo', 'general_manager'],
    children: [
      { id: 'dashboard', label: 'Dashboard', icon: Home, roles: ['ops_admin', 'ceo', 'general_manager'] },
      { 
        id: 'students-ops', 
        label: 'Students', 
        icon: Users, 
        roles: ['ops_admin', 'ceo', 'general_manager'],
        children: [
          { id: 'students', label: 'Student List' },
          { id: 'students-portal', label: 'Student Portal Management' }
        ]
      },
      { 
        id: 'admissions-ops', 
        label: 'Admissions', 
        icon: FileText, 
        roles: ['ops_admin', 'ceo', 'general_manager'],
        children: [
          { id: 'admissions-review', label: 'Admission Review' }
        ]
      },
      { 
        id: 'universities-ops', 
        label: 'Universities', 
        icon: School, 
        roles: ['ops_admin', 'ceo', 'general_manager'],
        children: [
          { id: 'universities', label: 'University List' },
          { id: 'uni-submission', label: 'University Submission' },
          { id: 'enrollment-update', label: 'Enrollment Number Update' },
          { id: 'reregistration', label: 'Re-registration' },
          { id: 'exam-reg', label: 'Exam Registration' }
        ]
      },
      { 
        id: 'programs-ops', 
        label: 'Programs', 
        icon: BookOpen, 
        roles: ['ops_admin', 'ceo', 'general_manager'],
        children: [
          { id: 'programs', label: 'Programs' },
          { id: 'program-alloc', label: 'Program Allocation' }
        ]
      },
      { id: 'centers', label: 'Study Centers', icon: Building, roles: ['ops_admin', 'ceo', 'general_manager'] },
      { 
        id: 'documents-ops', 
        label: 'Document Management', 
        icon: FileText, 
        roles: ['ops_admin', 'ceo', 'general_manager'],
        children: [
          { id: 'doc-received', label: 'Document Received' },
          { id: 'doc-dispatch', label: 'Document Dispatch' },
          { id: 'courier-track', label: 'Courier Tracking' },
          { id: 'delivery-conf', label: 'Delivery Confirmation' }
        ]
      },
      { 
        id: 'communication-ops', 
        label: 'Communication', 
        icon: Phone, 
        roles: ['ops_admin', 'ceo', 'general_manager'],
        children: [
          { id: 'announcements', label: 'Announcements' },
          { id: 'bulk-sms', label: 'Bulk SMS' },
          { id: 'bulk-wa', label: 'Bulk WhatsApp' },
          { id: 'email-notif', label: 'Email Notifications' }
        ]
      },
      { 
        id: 'tasks-ops', 
        label: 'Tasks', 
        icon: CheckSquare, 
        roles: ['ops_admin', 'ceo', 'general_manager'],
        children: [
          { id: 'my-tasks', label: 'My Tasks' }
        ]
      },
      { 
        id: 'reports-ops', 
        label: 'Reports', 
        icon: BarChart2, 
        roles: ['ops_admin', 'ceo', 'general_manager'],
        children: [
          { id: 'report-student', label: 'Student Report' },
          { id: 'report-admission', label: 'Admission Report' },
          { id: 'report-enrollment', label: 'Enrollment Report' },
          { id: 'report-university', label: 'University Report' },
          { id: 'report-rereg', label: 'Re-registration Report' }
        ]
      },
      { 
        id: 'my-portal', 
        label: 'My Portal', 
        icon: User, 
        roles: ['ops_admin', 'ceo', 'general_manager'],
        children: [
          { id: 'attendance', label: 'Attendance' },
          { id: 'leave-req', label: 'Leave Request' },
          { id: 'holidays', label: 'Holidays' },
          { id: 'notice-board', label: 'Notice Board' }
        ]
      }
    ],
  },
  {
    id: 'finance',
    label: 'Finance',
    icon: DollarSign,
    roles: ['finance_admin', 'finance_sub_admin', 'ceo', 'general_manager'],
    children: [
      { id: 'invoices', label: 'Invoices', icon: Receipt, roles: ['finance_admin', 'finance_sub_admin', 'ceo', 'general_manager'] },
      { id: 'payments', label: 'Payments', icon: Wallet, roles: ['finance_admin', 'finance_sub_admin', 'ceo', 'general_manager'] },
      { id: 'expenses', label: 'Expenses', icon: Receipt, roles: ['finance_admin', 'finance_sub_admin', 'ceo', 'general_manager'] },
      { id: 'collections', label: 'Collections', icon: FileText, roles: ['finance_admin', 'finance_sub_admin', 'ceo', 'general_manager'] },
      { id: 'targets', label: 'Targets', icon: Target, roles: ['finance_admin', 'finance_sub_admin', 'ceo', 'general_manager'] },
      { id: 'fees', label: 'Fee Structures', icon: Settings, roles: ['finance_admin', 'finance_sub_admin', 'ceo', 'general_manager'] },
      { id: 'salary_approval', label: 'Salary Approvals', icon: CheckSquare, roles: ['finance_admin', 'finance_sub_admin', 'ceo', 'general_manager'] },
      { id: 'payroll-batches', label: 'Payroll Batches', icon: CheckSquare, roles: ['finance_admin', 'finance_sub_admin', 'ceo', 'general_manager'] },
      { id: 'approvals', label: 'Approvals', icon: CheckSquare, roles: ['finance_admin', 'finance_sub_admin', 'ceo', 'general_manager'] },
    ],
  },
  {
    id: 'hr',
    label: 'Human Resources',
    icon: Briefcase,
    roles: ['hr_admin', 'hr_sub_admin', 'ceo', 'general_manager'],
    children: [
      { id: 'users', label: 'Users', icon: Users, roles: ['hr_admin', 'hr_sub_admin', 'ceo', 'general_manager'] },
      { id: 'employees', label: 'Employees', icon: Users, roles: ['hr_admin', 'hr_sub_admin', 'ceo', 'general_manager'] },
      { id: 'vacancies', label: 'Vacancies', icon: UserPlus, roles: ['hr_admin', 'hr_sub_admin', 'ceo', 'general_manager'] },
      { id: 'attendance', label: 'Attendance', icon: Calendar, roles: ['hr_admin', 'hr_sub_admin', 'ceo', 'general_manager'] },
      { id: 'leaves', label: 'Leave Requests', icon: Calendar, roles: ['hr_admin', 'hr_sub_admin', 'ceo', 'general_manager'] },
      { id: 'complaints', label: 'Complaints', icon: MessageSquare, roles: ['hr_admin', 'hr_sub_admin', 'ceo', 'general_manager'] },
      { id: 'payroll', label: 'Payroll', icon: DollarSign, roles: ['hr_admin', 'hr_sub_admin', 'ceo', 'general_manager'] },
      { id: 'salary-config', label: 'Salary Config', icon: Settings, roles: ['hr_admin', 'hr_sub_admin', 'ceo', 'general_manager'] },
      { id: 'payroll-batches', label: 'Payroll Batches', icon: CheckSquare, roles: ['hr_admin', 'hr_sub_admin', 'ceo', 'general_manager'] },
      { id: 'assets', label: 'Assets', icon: MonitorSmartphone, roles: ['hr_admin', 'hr_sub_admin', 'ceo', 'general_manager'] },
    ],
  },
  {
    id: 'sales',
    label: 'Sales & CRM',
    icon: TrendingUp,
    roles: ['sales_admin', 'sales_sub_admin', 'ceo', 'general_manager', 'employee'],
    department: 'sales',
    children: [
      { id: 'leads', label: 'Leads', icon: Users, roles: ['sales_admin', 'sales_sub_admin', 'ceo', 'general_manager', 'employee'] },
      { id: 'deals', label: 'Deals', icon: CheckSquare, roles: ['sales_admin', 'sales_sub_admin', 'ceo', 'general_manager', 'employee'] },
      { id: 'referrals', label: 'Referrals', icon: UserPlus, roles: ['sales_admin', 'sales_sub_admin', 'ceo', 'general_manager', 'employee'] },
      { id: 'quotations', label: 'Quotations', icon: FileText, roles: ['sales_admin', 'sales_sub_admin', 'ceo', 'general_manager', 'employee'] },
    ],
  },
  {
    id: 'center',
    label: 'Center Portal',
    icon: School,
    roles: ['center_admin'],
    children: [
      { id: 'center-students', label: 'My Students', icon: Users, roles: ['center_admin'] },
      { id: 'center-invoices', label: 'Invoices', icon: Receipt, roles: ['center_admin'] },
      { id: 'center-marks', label: 'Enter Marks', icon: FileText, roles: ['center_admin'] },
    ],
  },
  {
    id: 'employee',
    label: 'My Workspace',
    icon: Briefcase,
    roles: ['employee'],
    children: [
      { id: 'my-tasks', label: 'My Tasks', icon: CheckSquare, roles: ['employee'] },
      { id: 'my-attendance', label: 'Attendance', icon: Calendar, roles: ['employee'] },
      { id: 'my-leaves', label: 'Apply Leave', icon: Calendar, roles: ['employee'] },
      { id: 'my-complaints', label: 'Complaints', icon: MessageSquare, roles: ['employee'] },
    ],
  },
  {
    id: 'staff',
    label: 'Staff Portal',
    icon: Users,
    roles: ['employee', 'ops_admin', 'finance_admin', 'finance_sub_admin', 'hr_admin', 'hr_sub_admin', 'sales_admin', 'sales_sub_admin'],
    children: [
      { id: 'holidays', label: 'Holidays', icon: Calendar, roles: ['employee', 'ops_admin', 'finance_admin', 'finance_sub_admin', 'hr_admin', 'hr_sub_admin', 'sales_admin', 'sales_sub_admin'] },
      { id: 'announcements', label: 'Announcements', icon: Bell, roles: ['employee', 'ops_admin', 'finance_admin', 'finance_sub_admin', 'hr_admin', 'hr_sub_admin', 'sales_admin', 'sales_sub_admin'] },
    ],
  },
  {
    id: 'meetings',
    label: 'Meetings',
    icon: Video,
    // No roles array means visible to all users
  },
  {
    id: 'settings',
    label: 'Settings',
    icon: Settings,
    roles: ['superadmin', 'org_admin'],
  },
];

export function Sidebar({ isCollapsed, onToggle, activeModule, onModuleChange }: SidebarProps) {
  const { user, logout } = useAuth();

  if (!user) return null;

  const filteredNavItems = navItems.filter(item => 
    !item.roles || item.roles.includes(user.role)
  );

  const handleNavClick = (itemId: string) => {
    onModuleChange(itemId);
  };

  return (
    <div
      className={cn(
        'flex flex-col h-screen bg-slate-900 text-white transition-all duration-300 border-r border-slate-800',
        isCollapsed ? 'w-16' : 'w-64'
      )}
    >
      {/* Logo */}
      <div className="flex items-center justify-between h-16 px-4 border-b border-slate-800">
        {!isCollapsed && (
          <div className="flex items-center gap-2 overflow-hidden">
            <img 
              src="/pype-logo.png" 
              alt="PYPE ERM" 
              className="w-8 h-8 object-contain flex-shrink-0" 
            />
            <span 
              className="font-bold text-lg truncate" 
              title="PYPE ERM"
            >
              PYPE ERM
            </span>
          </div>
        )}
        {isCollapsed && (
          <img 
            src="/pype-logo.png" 
            alt="PYPE ERM" 
            className="w-8 h-8 object-contain mx-auto" 
            title="PYPE ERM"
          />
        )}
        <Button
          variant="ghost"
          size="icon"
          onClick={onToggle}
          className="text-slate-400 hover:text-white hover:bg-slate-800"
        >
          {isCollapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
        </Button>
      </div>

      {/* Navigation */}
      <ScrollArea className="flex-1 py-4">
        <nav className="px-2 space-y-1">
          {filteredNavItems.map((item) => (
            <NavItemComponent
              key={item.id}
              item={item}
              isCollapsed={isCollapsed}
              isActive={activeModule === item.id || (item.children?.some(c => c.id === activeModule) ?? false)}
              activeChild={activeModule}
              onClick={handleNavClick}
            />
          ))}
        </nav>
      </ScrollArea>

      {/* User Info & Logout */}
      <div className="border-t border-slate-800 p-4">
        {!isCollapsed && (
          <div className="mb-4 px-2">
            <p className="text-sm font-medium text-white">{user.name}</p>
            <p className="text-xs text-slate-400 capitalize">
              {(user?.role === 'student' ? 'student' : (user?.role || '')).replace('_', ' ')}
            </p>
          </div>
        )}
        <Button
          variant="ghost"
          className={cn(
            'w-full text-slate-400 hover:text-white hover:bg-slate-800',
            isCollapsed && 'px-2'
          )}
          onClick={logout}
        >
          <LogOut className="w-4 h-4" />
          {!isCollapsed && <span className="ml-2">Logout</span>}
        </Button>
      </div>
    </div>
  );
}

interface NavItemComponentProps {
  item: NavItem;
  isCollapsed: boolean;
  isActive: boolean;
  activeChild: string;
  onClick: (id: string) => void;
  level?: number;
}

function NavItemComponent({ item, isCollapsed, isActive, activeChild, onClick, level = 0 }: NavItemComponentProps) {
  const [isExpanded, setIsExpanded] = React.useState(isActive);
  const Icon = item.icon;

  const hasChildren = item.children && item.children.length > 0;

  const handleClick = () => {
    if (hasChildren) {
      setIsExpanded(!isExpanded);
    } else {
      onClick(item.id);
    }
  };

  const handleChildClick = (childId: string) => {
    onClick(childId);
  };

  return (
    <div>
      {item.isSection ? (
        !isCollapsed && (
          <div className="px-3 py-2 mt-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">
            {item.label}
          </div>
        )
      ) : (
        <button
          onClick={handleClick}
          className={cn(
            'w-full flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors',
            isActive
              ? 'bg-blue-600 text-white'
              : 'text-slate-300 hover:bg-slate-800 hover:text-white',
            isCollapsed && 'justify-center px-2'
          )}
          style={{ paddingLeft: isCollapsed ? undefined : `${12 + level * 12}px` }}
        >
          {Icon && <Icon className="w-4 h-4 flex-shrink-0" />}
          {!isCollapsed && (
            <>
              <span className="flex-1 text-left">{item.label}</span>
              {item.badge && (
                <Badge variant="destructive" className="text-xs">
                  {item.badge}
                </Badge>
              )}
              {hasChildren && (
                <ChevronRight
                  className={cn(
                    'w-4 h-4 transition-transform',
                    isExpanded && 'rotate-90'
                  )}
                />
              )}
            </>
          )}
        </button>
      )}

      {/* Child Items */}
      {!isCollapsed && hasChildren && isExpanded && (
        <div className="mt-1 ml-4 space-y-1 border-l border-slate-700">
          {item.children!.map((child) => {
            const ChildIcon = child.icon;
            return (
              <button
                key={child.id}
                onClick={() => handleChildClick(child.id)}
                className={cn(
                  'w-full flex items-center gap-3 px-3 py-2 rounded-md text-sm transition-colors',
                  activeChild === child.id
                    ? 'bg-blue-600/50 text-white'
                    : 'text-slate-400 hover:bg-slate-800 hover:text-white'
                )}
              >
                {ChildIcon && <ChildIcon className="w-4 h-4 flex-shrink-0" />}
                <span className="flex-1 text-left">{child.label}</span>
                {child.badge && (
                  <Badge variant="destructive" className="text-xs">
                    {child.badge}
                  </Badge>
                )}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
