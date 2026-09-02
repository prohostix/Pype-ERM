/* eslint-disable react-hooks/set-state-in-effect */
/* eslint-disable react-refresh/only-export-components */
import { useState, useEffect } from 'react';
import { 
  DollarSign, 
  CreditCard, 
  TrendingUp, 
  ArrowUpRight, 
  ArrowDownRight,
  AlertCircle,
  AlertTriangle,
  CheckCircle,
  RefreshCw,
  Wallet,
  FileText,
  Users,
} from 'lucide-react';
import { InvoicesPanel } from '@/components/panels/InvoicesPanel';
import { PaymentsPanel } from '@/components/panels/PaymentsPanel';
import { ExpensesPanel } from '@/components/panels/ExpensesPanel';
import { TargetsPanel } from '@/components/panels/TargetsPanel';
import { FeeStructuresPanel } from '@/components/panels/FeeStructuresPanel';
import { UniversityCommissionsPanel } from '@/components/panels/UniversityCommissionsPanel';
import { UniversityPaymentsPanel } from '@/components/panels/UniversityPaymentsPanel';
import { PayrollPanel } from '@/components/panels/PayrollPanel';
import TeamPermissionsPanel from '@/components/panels/TeamPermissionsPanel';
import { StudentsPanel } from '@/components/panels/StudentsPanel';
import { CollectionsPanel } from '@/components/panels/CollectionsPanel';
import { DiscountsPanel } from '@/components/panels/DiscountsPanel';
import { AdmissionSessionsPanel } from '@/components/panels/AdmissionSessionsPanel';
import { LeavesPanel } from '@/components/panels/LeavesPanel';
import { FinanceCenterVerificationPanel } from '@/components/panels/FinanceCenterVerificationPanel';
import { WalletTopUpsPanel } from '@/components/panels/WalletTopUpsPanel';
import { FinanceEnrollmentsPanel } from '@/components/panels/FinanceEnrollmentsPanel';
import { IncomeExpenditurePanel } from '@/components/panels/IncomeExpenditurePanel';
import { ProfitLossPanel } from '@/components/panels/ProfitLossPanel';
import { FinanceSalaryApprovalPanel } from '@/components/panels/FinanceSalaryApprovalPanel';
import { FinanceSalesTargetsPanel } from '@/components/panels/FinanceSalesTargetsPanel';
import { BillReceiptPanel } from '@/components/panels/BillReceiptPanel';
import { PaymentGatewayPanel } from '@/components/panels/PaymentGatewayPanel';
import { AttendancePanel } from '@/components/panels/AttendancePanel';
import { NoticeBoardPanel } from '@/components/panels/NoticeBoardPanel';
import { StudentPaymentsLogPanel } from '@/components/panels/StudentPaymentsLogPanel';
import { CollectionReportPanel } from '@/components/panels/CollectionReportPanel';
import { MeetingsPanel } from '@/components/panels/MeetingsPanel';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  BarChart,
  Bar,
} from 'recharts';
import { Card, CardContent, CardHeader, CardTitle, } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import api from '@/lib/api';
import { toast } from 'sonner';

export function ModernFinanceDashboard({ initialTab, onNavigate }: { initialTab?: string, onNavigate?: (tab: string) => void }) {
  const [activeTab, setActiveTab] = useState(initialTab || 'overview');
  const handleNavigate = (tab: string) => {
    setActiveTab(tab);
    if (onNavigate) onNavigate(tab);
  };
  useEffect(() => { setActiveTab(initialTab || 'overview'); }, [initialTab]);

  const renderContent = () => {
    switch (activeTab) {
      case 'meetings': return <MeetingsPanel />;
      case 'team_permissions': return <TeamPermissionsPanel />;
      case 'overview': return <OverviewContent onNavigate={handleNavigate} />;
      case 'invoices': return <InvoicesPanel />;
      case 'student_payment_log': return <StudentPaymentsLogPanel />;
      case 'payments': return <PaymentsPanel />;
      case 'pending_payments': return <FinanceCenterVerificationPanel />;
      case 'bill_receipts': return <BillReceiptPanel />;
      case 'payment_gateway': return <PaymentGatewayPanel />;
      case 'wallet_topup': return <WalletTopUpsPanel />;
      case 'student_collections': return <CollectionsPanel />;
      case 'fee_structures': return <FeeStructuresPanel />;
      case 'discounts': return <DiscountsPanel />;
      
      case 'expenses': return <ExpensesPanel />;
      case 'university_fee': return <UniversityPaymentsPanel />;
      case 'university_commissions': return <UniversityCommissionsPanel />;
      case 'payroll': return <PayrollPanel />;
      case 'salary_approval': return <FinanceSalaryApprovalPanel />;
      case 'incentive_approval': return <div className="p-8 text-center text-muted-foreground border rounded-lg m-4">Incentive Approval Module Coming Soon</div>;

      case 'students': return <StudentsPanel />;
      case 'admissions': return <AdmissionSessionsPanel />;
      case 'enrollments': return <FinanceEnrollmentsPanel />;
      
      case 'sales_target': return <FinanceSalesTargetsPanel />;
      case 'my_target': return <TargetsPanel endpoint="/finance/targets" title="My Finance Targets" />;
      
      case 'income_expense': return <IncomeExpenditurePanel />;
      case 'profit_loss': return <ProfitLossPanel />;
      case 'collection_report': return <CollectionReportPanel />;
      case 'fee_pending_report': return <div className="p-8 text-center text-muted-foreground border rounded-lg m-4">Fee Pending Report Coming Soon</div>;
      case 'incentive_report': return <div className="p-8 text-center text-muted-foreground border rounded-lg m-4">Incentive Report Coming Soon</div>;
      
      case 'my_leave_request': return <LeavesPanel />;
      case 'my_attendance': return <AttendancePanel isMyPortal={true} />;
      case 'notice_board': return <NoticeBoardPanel />;
      case 'pay_slips': return <div className="p-8 text-center text-muted-foreground border rounded-lg m-4">Pay Slips Coming Soon</div>;
      
      default: return <div className="p-8 text-center text-muted-foreground">Module under construction</div>;
    }
  };

  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-700">
      {renderContent()}
    </div>
  );
}

export function getFinanceNavItems() {
  return [
    { id: '__dashboard_section', label: '📊 Dashboard', isSection: true },
    { id: 'overview', label: 'Overview' },
    { id: 'team_permissions', label: 'Team Permissions' },
    
    { id: '__collections_section', label: '💳 Collections', isSection: true },
    { id: 'student_collections', label: 'Student Collections' },
    { id: 'student_payment_log', label: 'Student Payment Log' },
    { id: 'payments', label: 'Payments' },
    { id: 'pending_payments', label: 'Pending Payments' },
    { id: 'bill_receipts', label: 'Bill Receipts' },
    { id: 'payment_gateway', label: 'Payment Gateway' },
    { id: 'wallet_topup', label: 'Wallet Top-up' },
    
    { id: '__billing_section', label: '📄 Billing', isSection: true },
    { id: 'invoices', label: 'Invoices' },
    { id: 'fee_structures', label: 'Fee Structures' },
    { id: 'discounts', label: 'Discounts' },
    
    { id: '__finance_ops_section', label: '💰 Finance', isSection: true },
    { id: 'expenses', label: 'Expenses' },
    { id: 'university_fee', label: 'University Fee' },
    { id: 'university_commissions', label: 'University Commissions' },
    { id: 'payroll', label: 'Payroll' },
    { id: 'salary_approval', label: 'Salary Approval' },
    { id: 'incentive_approval', label: 'Incentive Approval' },
    
    { id: '__students_section', label: '🎓 Students', isSection: true },
    { id: 'students', label: 'Students' },
    { id: 'admissions', label: 'Admissions' },
    { id: 'enrollments', label: 'Enrollments' },
    
    { id: '__targets_section', label: '🎯 Targets', isSection: true },
    { id: 'sales_target', label: 'Sales Target' },
    { id: 'my_target', label: 'My Target' },
    
    { id: '__reports_section', label: '📈 Reports', isSection: true },
    { id: 'income_expense', label: 'Income & Expense' },
    { id: 'profit_loss', label: 'Profit & Loss' },
    { id: 'collection_report', label: 'Collection Report' },
    { id: 'fee_pending_report', label: 'Fee Pending Report' },
    { id: 'incentive_report', label: 'Incentive Report' },
    
    { id: '__my_account_section', label: '👤 My Account', isSection: true },
    { id: 'my_attendance', label: 'My Attendance' },
    { id: 'my_leave_request', label: 'My Leave Request' },
    { id: 'pay_slips', label: 'Pay Slips' },
    { id: 'notice_board', label: 'Notice Board' },
    { id: 'meetings', label: 'Meetings' },
  ];
}

// ─── Overview Content ─────────────────────────────────────────────────────────

function OverviewContent({ onNavigate }: any) {
  const [data, setData] = useState<any>(null);
  const [branches, setBranches] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [branchFilter, setBranchFilter] = useState('all');
  const [dateRange, setDateRange] = useState('this_month'); // today, this_week, this_month, custom

  useEffect(() => {
    fetchBranches();
  }, []);

  useEffect(() => {
    fetchDashboardData();
  }, [branchFilter, dateRange]);

  const fetchBranches = async () => {
    try {
      const res = await api.get('/org/branches');
      setBranches(res.data.data || []);
    } catch (e) { console.error('Failed to fetch branches', e); }
  };

  const fetchDashboardData = async () => {
    setLoading(true);
    try {
      const res = await api.get(`/dashboard/finance-overview?branchId=${branchFilter}&dateRange=${dateRange}`);
      setData(res.data.data);
    } catch (e) {
      console.error('Failed to fetch finance overview', e);
      toast.error('Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  };

  if (loading || !data) {
    return <div className="space-y-4">{[1,2,3].map(i => <div key={i} className="h-32 bg-muted rounded-xl animate-pulse" />)}</div>;
  }

  const { metrics, lists, charts, alerts } = data;

  return (
    <div className="space-y-6">
      {/* Filters */}
      <div className="flex flex-wrap gap-4 items-center justify-between bg-card p-4 rounded-xl border">
        <div>
          
          <h2 className="text-xl font-bold">Finance Overview</h2>
          <p className="text-sm text-muted-foreground">Monitor collections, expenses, and targets.</p>
        </div>
        <div className="flex gap-4 items-center">
          <select 
            value={branchFilter} 
            onChange={e => setBranchFilter(e.target.value)}
            className="h-10 px-3 rounded-md border bg-background text-sm"
          >
            <option value="all">All Branches</option>
            {branches.map(b => (
              <option key={b.id} value={b.id}>{b.name}</option>
            ))}
          </select>
          
          <select 
            value={dateRange} 
            onChange={e => setDateRange(e.target.value)}
            className="h-10 px-3 rounded-md border bg-background text-sm"
          >
            <option value="today">Today</option>
            <option value="this_week">This Week</option>
            <option value="this_month">This Month</option>
            <option value="all">All Time</option>
          </select>
          <Button onClick={fetchDashboardData} variant="outline" size="icon">
            <RefreshCw className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 xl:grid-cols-5 gap-4">
        <FinanceMetric title="Total Receivables" value={`₹${(metrics.totalReceivables / 1000).toFixed(1)}K`} icon={<DollarSign className="w-5 h-5"/>} color="primary" onClick={() => onNavigate('invoices')} />
        <FinanceMetric title="Total Collected" value={`₹${(metrics.totalCollected / 1000).toFixed(1)}K`} icon={<CreditCard className="w-5 h-5"/>} color="success" onClick={() => onNavigate('payments')} />
        <FinanceMetric title="Cash & Bank Bal" value={`₹${(metrics.cashAndBankBalance / 1000).toFixed(1)}K`} icon={<Wallet className="w-5 h-5"/>} color="info" />
        <FinanceMetric title="Operational Exp" value={`₹${(metrics.operationalExpenses / 1000).toFixed(1)}K`} icon={<TrendingUp className="w-5 h-5"/>} color="warning" onClick={() => onNavigate('expenses')} />
        
        <FinanceMetric title="Univ Fee Pending" value={`₹${(metrics.universityFeePending / 1000).toFixed(1)}K`} icon={<AlertCircle className="w-5 h-5"/>} color="warning" onClick={() => onNavigate('university_fee')} />
        <FinanceMetric title="Incentive Pending" value={`₹${(metrics.incentivePending / 1000).toFixed(1)}K`} icon={<Users className="w-5 h-5"/>} color="primary" onClick={() => onNavigate('incentive_approval')} />
        <FinanceMetric title="Payroll Pending" value={`₹${(metrics.payrollPending / 1000).toFixed(1)}K`} icon={<FileText className="w-5 h-5"/>} color="error" onClick={() => onNavigate('payroll')} />
        <FinanceMetric title="My Target" value={`₹${(metrics.myTargetValue / 1000).toFixed(1)}K`} icon={<CheckCircle className="w-5 h-5"/>} color="success" onClick={() => onNavigate('my_target')} />
      </div>

      {/* Alerts Widget */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
        <AlertCard title="Overdue Student Fees" count={alerts.overdueStudentFees} icon={<AlertCircle />} type="error" />
        <AlertCard title="University Fee Due" count={alerts.universityFeeDue} icon={<AlertTriangle />} type="warning" />
        <AlertCard title="Incentive Pending" count={alerts.incentivePending} icon={<Users />} type="primary" />
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Card className="lg:col-span-2 shadow-xl border-none">
          <CardHeader>
            <CardTitle>Collection Overview</CardTitle>
          </CardHeader>
          <CardContent className="h-[300px]">
             <ResponsiveContainer width="100%" height="100%">
               <BarChart data={charts.collectionOverview}>
                 <CartesianGrid strokeDasharray="3 3" vertical={false} />
                 <XAxis dataKey="name" axisLine={false} tickLine={false} />
                 <YAxis axisLine={false} tickLine={false} />
                 <Tooltip />
                 <Bar dataKey="value" fill="hsl(var(--primary))" radius={[4,4,0,0]} barSize={40} />
               </BarChart>
             </ResponsiveContainer>
          </CardContent>
        </Card>
        
        <Card className="shadow-xl border-none">
          <CardHeader>
            <CardTitle>Branch-wise Collection</CardTitle>
          </CardHeader>
          <CardContent className="h-[300px]">
             <ResponsiveContainer width="100%" height="100%">
               <BarChart data={charts.branchWiseCollection} layout="vertical" margin={{left: 20}}>
                 <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                 <XAxis type="number" hide />
                 <YAxis dataKey="name" type="category" axisLine={false} tickLine={false} width={100} />
                 <Tooltip />
                 <Bar dataKey="value" fill="hsl(var(--success))" radius={[0,4,4,0]} barSize={20} />
               </BarChart>
             </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Tables Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card>
          <CardHeader>
            <CardTitle>Recent Collections</CardTitle>
          </CardHeader>
          <CardContent>
            {lists.recentCollections.length > 0 ? (
              <div className="space-y-3">
                {lists.recentCollections.map((c: any) => (
                  <div key={c.id} className="flex justify-between items-center p-3 bg-muted/50 rounded-lg">
                    <div>
                      <p className="font-medium text-sm">{c.student?.name || 'Unknown'}</p>
                      <p className="text-xs text-muted-foreground">{new Date(c.createdAt).toLocaleDateString()}</p>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-success">₹{c.amount}</p>
                      <Badge variant="outline" className="text-[10px] uppercase">{c.paymentMode}</Badge>
                    </div>
                  </div>
                ))}
              </div>
            ) : <p className="text-sm text-muted-foreground text-center py-4">No recent collections</p>}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Recent Expenses</CardTitle>
          </CardHeader>
          <CardContent>
            {lists.recentExpenses.length > 0 ? (
              <div className="space-y-3">
                {lists.recentExpenses.map((e: any) => (
                  <div key={e.id} className="flex justify-between items-center p-3 bg-muted/50 rounded-lg">
                    <div>
                      <p className="font-medium text-sm">{e.category}</p>
                      <p className="text-xs text-muted-foreground">{e.employee?.user?.name || 'Unknown'}</p>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-error">₹{e.amount}</p>
                      <Badge variant="outline" className="text-[10px] uppercase">{e.status}</Badge>
                    </div>
                  </div>
                ))}
              </div>
            ) : <p className="text-sm text-muted-foreground text-center py-4">No recent expenses</p>}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function AlertCard({ title, count, icon, type }: { title: string, count: number, icon: any, type: string }) {
  const typeMap: any = {
    error: 'bg-error/10 text-error border-error/20',
    warning: 'bg-warning/10 text-warning border-warning/20',
    info: 'bg-info/10 text-info border-info/20',
    primary: 'bg-primary/10 text-primary border-primary/20',
  };
  return (
    <div className={cn("p-4 rounded-xl border flex flex-col gap-2 cursor-pointer hover:shadow-md transition-shadow", typeMap[type])}>
      <div className="flex items-center justify-between">
        <div className="p-2 rounded-lg bg-background/50">
          {icon}
        </div>
        <span className="text-2xl font-black">{count}</span>
      </div>
      <p className="text-sm font-semibold">{title}</p>
    </div>
  );
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function FinanceMetric({ title, value, sub, trend, trendType, icon, color, onClick }: any) {
  const colorMap: any = {
    primary: 'text-primary bg-primary/10',
    success: 'text-success bg-success/10',
    warning: 'text-warning bg-warning/10',
    info: 'text-info bg-info/10',
  };
  return (
    <Card
      className={cn('group transition-all duration-300 hover:border-primary/50', onClick && 'cursor-pointer')}
      onClick={onClick}
    >
      <CardContent className="p-6">
        <div className="flex items-center justify-between mb-4">
          <div className={cn('p-2.5 rounded-xl transition-transform group-hover:scale-110', colorMap[color])}>
            {icon}
          </div>
          <div className={cn(
            'flex items-center text-xs font-bold px-2 py-1 rounded-full',
            trendType === 'up' ? 'bg-success/10 text-success' : trendType === 'down' ? 'bg-error/10 text-error' : 'bg-warning/10 text-warning'
          )}>
            {trendType === 'up' ? <ArrowUpRight className="w-3 h-3 mr-1" /> : <ArrowDownRight className="w-3 h-3 mr-1" />}
            {trend}
          </div>
        </div>
        <div className="space-y-1">
          <p className="text-sm font-medium text-muted-foreground uppercase tracking-wider">{title}</p>
          <p className="text-3xl font-bold tracking-tight text-foreground">{value}</p>
          <p className="text-xs text-muted-foreground pt-1">{sub}</p>
        </div>
      </CardContent>
    </Card>
  );
}
