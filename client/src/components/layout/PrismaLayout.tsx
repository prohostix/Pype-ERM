import { useState, useEffect } from 'react';
import {
  Database,
  ChevronRight,
  LogOut,
  Search,
  Sun,
  Moon,
  LayoutDashboard,
  Users,
  CheckCircle2,
  Building2,
  GraduationCap,
  FileText,
  TrendingUp,
  UserCircle,
  Settings,
  ShieldCheck,
  Calendar,
  MessageSquare,
  Wallet,
  Clock,
  Menu,
  GitBranch,
  Bell,
  Video,
  BookOpen,
  Target
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { NotificationBell } from '@/components/notifications/NotificationBell';
import { PunchWidget } from '@/components/attendance/PunchWidget';
import { useAuth } from '@/hooks/useAuth';
import api from '@/lib/api';
import { EnrollStudentPanel } from '../panels/EnrollStudentPanel';
import { InternalMarksPanel } from '../panels/InternalMarksPanel';
import { StudyCenterWalletPanel } from '../panels/StudyCenterWalletPanel';
import { StudyCenterEnrollmentsPanel } from '../panels/StudyCenterEnrollmentsPanel';

export interface TableItem {
  id: string;
  label: string;
  icon?: React.ReactNode;
  isSection?: boolean;
}

interface PrismaLayoutProps {
  children: React.ReactNode;
  tables: string[] | TableItem[];
  activeTable: string;
  onTableChange: (table: string) => void;
  onLogout?: () => void;
  userName?: string;
  userRole?: string;
  userId?: string;
  organizationId?: string;
  schema?: string;
}

export function PrismaLayout({
  children,
  tables,
  activeTable,
  onTableChange,
  onLogout,
  userName,
  userRole,
  userId,
  organizationId,
  schema = 'public'
}: PrismaLayoutProps) {
  const { user } = useAuth();
  const [searchQuery, setSearchQuery] = useState('');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState(() => {
    return document.documentElement.classList.contains('dark') ||
      localStorage.getItem('theme') === 'dark';
  });

  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('theme', 'light');
    }
  }, [isDarkMode]);

  const toggleTheme = () => setIsDarkMode(!isDarkMode);

  // Normalize tables to TableItem format with enhanced icons
  const normalizedTables: TableItem[] = tables.map(table => {
    if (typeof table === 'string') {
      return {
        id: table,
        label: table.split('_').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' '),
        icon: getLucideIcon(table)
      };
    }
    if (table.isSection) return table;
    // If icon is a string (emoji), replace with lucide icon
    return {
      ...table,
      icon: typeof table.icon === 'string' ? getLucideIcon(table.id) : (table.icon ?? getLucideIcon(table.id))
    };
  });

  const filteredTables = normalizedTables.filter(table =>
    table.isSection ||
    table.label.toLowerCase().includes(searchQuery.toLowerCase()) ||
    table.id.toLowerCase().includes(searchQuery.toLowerCase())
  );

  function getLucideIcon(tableId: string): React.ReactNode {
    const iconClass = "w-4 h-4";
    switch (tableId) {
      case 'dashboard':
      case 'overview': return <LayoutDashboard className={iconClass} />;
      case 'classes':
      case 'live_classes': return <Video className={iconClass} />;
      case 'materials': return <BookOpen className={iconClass} />;
      case 'users':
      case 'incentive_approval':
      case 'salary_approval':
      case 'managers': return <Users className={iconClass} />;
      case 'students':
      case 'enroll_student': return <GraduationCap className={iconClass} />;
      case 'invoices':
      case 'program_fees':
      case 'fees':
      case 'fee_structures':
      case 'enrollment_review':
      case 'bill_receipts':
      case 'committed_payments':
      case 'discounts':
      case 'leave-alloc': return <FileText className={iconClass} />;
      case 'leads':
      case 'targets':
      case 'kpi-kra':
      case 'sales_target':
      case 'my_target':
      case 'performance': return <TrendingUp className={iconClass} />;
      case 'employees': return <UserCircle className={iconClass} />;
      case 'departments':
      case 'universities':
      case 'study_centers':
      case 'study-centers':
      case 'branches': return <Building2 className={iconClass} />;
      case 'organizations': return <ShieldCheck className={iconClass} />;
      case 'tasks':
      case 'my_tasks':
      case 'delete_approvals': return <CheckCircle2 className={iconClass} />;
      case 'calendar':
      case 'sessions':
      case 'admission_sessions': return <Calendar className={iconClass} />;
      case 'meetings': return <Video className={iconClass} />;
      case 'holidays':
      case 'leaves':
      case 'leave_requests':
      case 'my_leaves':
      case 'vacancies': return <Calendar className={iconClass} />;
      case 'complaints':
      case 'notice_board':
      case 'notice-board': return <MessageSquare className={iconClass} />;
      case 'payroll':
      case 'my_payslips':
      case 'payslips':
      case 'wallet_topups':
      case 'center_wallet': return <Wallet className={iconClass} />;
      case 'attendance':
      case 'activity_report':
      case 'activity-logs':
      case 'my_attendance':
      case 'pending_payment':
      case 'pending_payments':
      case 'auth_fees': return <Clock className={iconClass} />;
      case 'hierarchy':
      case 'my_subdept':
      case 'sub_departments':
      case 'subdepartments': return <GitBranch className={iconClass} />;
      case 'announcements':
      case 'notifications': return <Bell className={iconClass} />;
      case 'programs':
      case 'ld_portal':
      case 'ld-portal':
      case 'center_enrollments':
      case 'admissions':
      case 'enrollments':
      case 'student_collections':
      case 'enrollments_finance': return <GraduationCap className={iconClass} />;
      case 'licenses': return <ShieldCheck className={iconClass} />;
      case 'centers':
      case 'pending_verification': return <ShieldCheck className={iconClass} />;
      case 'program_allocations':
      case 'payroll-batches':
      case 'payroll_batches': return <FileText className={iconClass} />;
      case 'marks': return <FileText className={iconClass} />;
      case 'polls':
      case 'my_team': return <Users className={iconClass} />;
      case 'settings':
      case 'salary-config':
      case 'att-settings': return <Settings className={iconClass} />;
      case 'org-chart': return <GitBranch className={iconClass} />;
      case 'invite_links': return <TrendingUp className={iconClass} />;
      case 'escalations': return <FileText className={iconClass} />;
      case 'expenses':
      case 'payment_gateway':
      case 'wallet_topup':
      case 'university_fee':
      case 'university_commissions':
      case 'payments': return <Wallet className={iconClass} />;
      case 'refer_admission': return <TrendingUp className={iconClass} />;
      case 'terms': return <ShieldCheck className={iconClass} />;
      case 'help': return <MessageSquare className={iconClass} />;
      case 'income_expense':
      case 'profit_loss':
      case 'collection_report':
      case 'fee_pending_report':
      case 'incentive_report': return <FileText className={iconClass} />;
      case 'my_leave_request': return <Calendar className={iconClass} />;
      case 'pay_slips': return <FileText className={iconClass} />;
      default: return <FileText className={iconClass} />;
    }
  }

  const activeTableItem = normalizedTables.find(t => !t.isSection && t.id === activeTable) || normalizedTables.find(t => !t.isSection);

  return (
    <div className="h-screen flex bg-background font-sans overflow-hidden relative">
      {/* Mobile Sidebar Overlay */}
      {isSidebarOpen && (
        <div
          className="fixed inset-0 bg-background/80 backdrop-blur-sm z-40 lg:hidden"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      {/* Premium Sidebar */}
      <aside className={cn(
        "fixed inset-y-0 left-0 w-[250px] flex flex-col z-50 transition-all duration-300 lg:relative lg:translate-x-0 rounded-r-[40px]",
        "bg-slate-950 text-slate-100",
        isSidebarOpen ? "translate-x-0 shadow-2xl" : "-translate-x-full"
      )}>

        <div className="h-[72px] flex items-center px-6 gap-4 relative z-10">
          <div className="flex items-center justify-center flex-shrink-0">
            <img src="/pype-logo.png" alt="Pype ERM Logo" className="h-8 w-auto" style={{ filter: 'brightness(0) invert(1)' }} />
          </div>
          <div className="flex flex-col overflow-hidden">
            <span className="font-bold text-sm tracking-tight text-slate-100 truncate" title="PYPE ERM">
              PYPE ERM
            </span>
            <span className="text-[10px] text-slate-400 uppercase font-bold tracking-widest truncate">
              Workspace
            </span>
          </div>
          {/* Mobile Close Button */}
          <Button
            variant="ghost"
            size="icon"
            className="lg:hidden ml-auto h-8 w-8 text-slate-400 hover:text-slate-100 hover:bg-white/10 rounded-lg"
            onClick={() => setIsSidebarOpen(false)}
          >
            <ChevronRight className="w-4 h-4 rotate-180" />
          </Button>
        </div>

        <div className="p-4 relative z-10">
          <div className="relative group">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400/50 group-focus-within:text-indigo-400 transition-colors" />
            <input
              placeholder="Search features..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full h-10 pl-10 pr-4 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl text-sm text-slate-200 outline-none focus:border-indigo-500/50 transition-all placeholder:text-slate-400/50"
            />
          </div>
        </div>

        <nav className="flex-1 overflow-y-auto pb-6 relative z-10 flex flex-col gap-1.5 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
          <div className="px-6 mb-2 mt-4">
            <span className="text-[10px] font-bold text-slate-400/70 uppercase tracking-[0.2em]">Main Navigation</span>
          </div>
          {filteredTables.map((table) => {
            if (table.isSection) {
              return (
                <div key={table.id} className="px-6 pt-5 pb-1">
                  <span className="text-[10px] font-bold text-slate-400/70 uppercase tracking-[0.2em]">{table.label}</span>
                </div>
              );
            }
            const isActive = activeTable === table.id;
            return (
              <button
                key={table.id}
                onClick={() => { onTableChange(table.id); setIsSidebarOpen(false); }}
                className={cn(
                  'min-h-[60px] py-3 w-[calc(100%_-_24px)] ml-6 pl-6 flex items-center gap-3.5 group relative text-sm text-left rounded-l-full outline-none focus:outline-none focus-visible:ring-0',
                  isActive
                    ? 'bg-background text-foreground font-semibold z-20'
                    : 'bg-transparent text-slate-400 hover:bg-white/10 hover:text-slate-100 hover:z-20'
                )}
              >
                {/* Top Curve */}
                <svg className={cn(
                  "absolute right-0 -top-8 w-8 h-8 pointer-events-none",
                  isActive ? "opacity-100" : "opacity-0 group-hover:opacity-100"
                )} style={{ fill: isActive ? 'hsl(var(--background))' : 'rgba(255,255,255,0.1)' }} viewBox="0 0 20 20">
                  <path d="M 0 20 A 20 20 0 0 0 20 0 L 20 20 Z" />
                </svg>
                
                <div className={cn(
                  "p-1.5 rounded-lg transition-all duration-300 shrink-0",
                  isActive
                    ? "bg-primary text-primary-foreground shadow-md shadow-primary/20"
                    : "bg-white/5 text-slate-400 group-hover:text-slate-100"
                )}>
                  {table.icon}
                </div>
                <span className="truncate">{table.label}</span>

                {/* Bottom Curve */}
                <svg className={cn(
                  "absolute right-0 -bottom-8 w-8 h-8 pointer-events-none",
                  isActive ? "opacity-100" : "opacity-0 group-hover:opacity-100"
                )} style={{ fill: isActive ? 'hsl(var(--background))' : 'rgba(255,255,255,0.1)' }} viewBox="0 0 20 20">
                  <path d="M 0 0 A 20 20 0 0 1 20 20 L 20 0 Z" />
                </svg>
              </button>
            );
          })}
        </nav>

        <div className="p-4 border-t border-white/10 relative z-10">
          <div className="flex items-center gap-3 px-2 py-2 mb-4">
            <div className="w-10 h-10 rounded-xl bg-indigo-500/20 border border-indigo-500/30 flex items-center justify-center text-indigo-400 font-bold shrink-0 shadow-sm">
              {userName?.charAt(0) || 'U'}
            </div>
            <div className="flex flex-col min-w-0">
              <span className="text-sm font-semibold truncate text-slate-200">{userName || 'User'}</span>
              <span className="text-[10px] text-slate-400 font-medium truncate uppercase tracking-wider">{(userRole === 'student' ? 'student' : userRole)?.replace(/_/g, ' ')}</span>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={toggleTheme}
              className="flex items-center justify-center gap-2 h-9 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-slate-400 hover:text-slate-200 transition-all text-xs font-medium"
            >
              {isDarkMode ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            </button>
            <button
              onClick={onLogout}
              className="flex items-center justify-center gap-2 h-9 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/20 text-rose-400 hover:text-rose-300 transition-all text-xs font-medium group"
            >
              <LogOut className="w-4 h-4 group-hover:-translate-x-0.5 transition-transform" />
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col overflow-hidden relative min-w-0 bg-muted/20">
        <header className="h-14 sm:h-[72px] flex items-center px-4 lg:px-8 gap-3 sm:gap-4 bg-background/60 backdrop-blur-xl border-b border-border/40 sticky top-0 z-20 shadow-[0_4px_30px_rgba(0,0,0,0.03)] transition-all">
          <div className="absolute top-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-primary/20 to-transparent"></div>
          
          <Button
            variant="ghost"
            size="icon"
            className="lg:hidden hover:bg-muted/80 rounded-xl transition-all"
            onClick={() => setIsSidebarOpen(true)}
          >
            <Menu className="w-5 h-5" />
          </Button>

          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="icon"
              className="text-muted-foreground hover:text-foreground hover:bg-muted/50 rounded-xl h-10 w-10 shrink-0 mr-1 transition-all group"
              onClick={() => window.history.back()}
              title="Go Back"
            >
              <ChevronRight className="w-5 h-5 rotate-180 group-hover:-translate-x-0.5 transition-transform" />
            </Button>
            <div className="hidden sm:flex items-center justify-center p-2.5 rounded-xl bg-gradient-to-br from-primary/10 to-primary/5 border border-primary/10 text-primary shadow-sm">
              {activeTableItem?.icon}
            </div>
            <div className="flex flex-col">
              <span className="text-lg font-bold text-foreground tracking-tight leading-none truncate">{activeTableItem?.label}</span>
              <span className="text-[10px] text-muted-foreground font-semibold uppercase tracking-widest mt-1 hidden sm:block">Current Module</span>
            </div>
          </div>

          <div className="absolute left-1/2 -translate-x-1/2 hidden md:flex items-center justify-center pointer-events-none">
            {user?.organization?.logo && (
              <img src={api.getFileUrl(user.organization.logo)} alt={user.organization.name || "Organization Logo"} className="max-h-12 w-auto max-w-[180px] object-contain drop-shadow-sm opacity-90" />
            )}
          </div>

          <div className="ml-auto flex items-center gap-3 sm:gap-4">
            <div className="hidden md:flex items-center gap-2 px-3 py-1.5 bg-background/50 rounded-lg border border-border/50 shadow-sm backdrop-blur-md">
              <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">{schema}</span>
            </div>

            <div className="h-8 w-px bg-border/50 mx-1 hidden sm:block" />
            {!['student', 'teacher'].includes(userRole || '') && (
              <PunchWidget compact={true} />
            )}

            <NotificationBell userId={userId} organizationId={organizationId} />

            {/* Settings dropdown */}
            <div className="relative">
              <button
                className="p-2 rounded-lg hover:bg-muted transition-colors"
                onClick={() => setIsSettingsOpen(o => !o)}
                title="Settings"
              >
                <Settings className="w-5 h-5 text-muted-foreground" />
              </button>
              {isSettingsOpen && (
                <>
                  <div className="fixed inset-0 z-30" onClick={() => setIsSettingsOpen(false)} />
                  <div className="absolute right-0 top-full mt-2 w-56 bg-popover border border-border rounded-xl shadow-xl z-40 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-150">
                    <div className="px-3 py-2 border-b border-border">
                      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Settings</p>
                    </div>
                    <div className="p-1">
                      <button
                        className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-foreground hover:bg-muted transition-colors text-left"
                        onClick={() => { onTableChange('att-settings'); setIsSettingsOpen(false); }}
                      >
                        <Clock className="w-4 h-4 text-muted-foreground" />
                        Attendance Settings
                      </button>
                      <button
                        className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-foreground hover:bg-muted transition-colors text-left"
                        onClick={() => { onTableChange('salary-config'); setIsSettingsOpen(false); }}
                      >
                        <Settings className="w-4 h-4 text-muted-foreground" />
                        Salary Config
                      </button>
                      <button
                        className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-foreground hover:bg-muted transition-colors text-left"
                        onClick={() => { onTableChange('leave-alloc'); setIsSettingsOpen(false); }}
                      >
                        <Calendar className="w-4 h-4 text-muted-foreground" />
                        Leave Allocation
                      </button>
                    </div>
                    <div className="p-1 border-t border-border">
                      <button
                        className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-foreground hover:bg-muted transition-colors text-left"
                        onClick={() => { toggleTheme(); setIsSettingsOpen(false); }}
                      >
                        {isDarkMode ? <Sun className="w-4 h-4 text-muted-foreground" /> : <Moon className="w-4 h-4 text-muted-foreground" />}
                        {isDarkMode ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
                      </button>
                      <button
                        className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition-colors text-left"
                        onClick={() => { onLogout?.(); setIsSettingsOpen(false); }}
                      >
                        <LogOut className="w-4 h-4" />
                        Sign Out
                      </button>
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
        </header>

        <section className="flex-1 overflow-auto p-3 sm:p-4 lg:p-8 bg-background">
          <div key={activeTable} className="max-w-[1600px] mx-auto animate-in fade-in zoom-in-[0.98] slide-in-from-bottom-4 duration-500 ease-out fill-mode-both">
            {children}
          </div>
        </section>
      </main>
    </div>
  );
}
