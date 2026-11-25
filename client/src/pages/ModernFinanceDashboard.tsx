/* eslint-disable react-hooks/set-state-in-effect */
/* eslint-disable react-refresh/only-export-components */
import { useState, useEffect } from 'react';
import { RefreshCw } from 'lucide-react';
import { InvoicesPanel } from '@/components/panels/InvoicesPanel';
import { PaymentsPanel } from '@/components/panels/PaymentsPanel';
import { ExpensesPanel } from '@/components/panels/ExpensesPanel';
import { TargetsPanel } from '@/components/panels/TargetsPanel';
import { FeeStructuresPanel } from '@/components/panels/FeeStructuresPanel';
import { UniversityCommissionsPanel } from '@/components/panels/UniversityCommissionsPanel';
import { UniversityPaymentsPanel } from '@/components/panels/UniversityPaymentsPanel';
import { PayrollPanel } from '@/components/panels/PayrollPanel';
import { PayrollBatchesPanel } from '@/components/panels/PayrollBatchesPanel';
import TeamPermissionsPanel from '@/components/panels/TeamPermissionsPanel';
import { StudentsPanel } from '@/components/panels/StudentsPanel';
import { CollectionsPanel } from '@/components/panels/CollectionsPanel';
import { DiscountsPanel } from '@/components/panels/DiscountsPanel';
import { AdmissionSessionsPanel } from '@/components/panels/AdmissionSessionsPanel';
import { LeavesPanel } from '@/components/panels/LeavesPanel';
import { FinanceCenterVerificationPanel } from '@/components/panels/FinanceCenterVerificationPanel';
import { WalletTopUpsPanel } from '@/components/panels/WalletTopUpsPanel';
import { FinanceEnrollmentsPanel } from '@/components/panels/FinanceEnrollmentsPanel';
import { ProvisionalFinancePanel } from '@/components/panels/ProvisionalFinancePanel';
import { IncomeExpenditurePanel } from '@/components/panels/IncomeExpenditurePanel';
import { ProfitLossPanel } from '@/components/panels/ProfitLossPanel';
import { FinanceSalaryApprovalPanel } from '@/components/panels/FinanceSalaryApprovalPanel';
import { FinanceSalesTargetsPanel } from '@/components/panels/FinanceSalesTargetsPanel';
import { FinancePayrollHistoryPanel } from '@/components/panels/FinancePayrollHistoryPanel';
import { ComingSoonPanel } from '@/components/panels/ComingSoonPanel';
import { BillReceiptPanel } from '@/components/panels/BillReceiptPanel';
import { PaymentGatewayPanel } from '@/components/panels/PaymentGatewayPanel';
import { AttendancePanel } from '@/components/panels/AttendancePanel';
import { MyProfilePanel } from '@/components/panels/MyProfilePanel';
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

import { CS } from '@/lib/currency';
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
      case 'payroll_batches': return <PayrollBatchesPanel />;
      case 'salary_approval': return <FinanceSalaryApprovalPanel />;
      case 'payroll_history': return <FinancePayrollHistoryPanel />;
      case 'incentive_approval': return <ComingSoonPanel title="Incentive Approval" description="Review and approve sales incentives before they are paid out." note="Incentive approvals aren't available yet. You'll be able to review and release incentives from this page once it launches." />;

      case 'students': return <StudentsPanel />;
      case 'admissions': return <AdmissionSessionsPanel />;
      case 'enrollments': return <FinanceEnrollmentsPanel />;
      case 'provisional_verifications': return <ProvisionalFinancePanel />;
      
      case 'sales_target': return <FinanceSalesTargetsPanel />;
      case 'my_target': return <TargetsPanel endpoint="/finance/targets" title="My Finance Targets" />;
      
      case 'income_expense': return <IncomeExpenditurePanel />;
      case 'profit_loss': return <ProfitLossPanel />;
      case 'collection_report': return <CollectionReportPanel />;
      case 'fee_pending_report': return <ComingSoonPanel title="Fee Pending Report" description="See which students have fees outstanding, and how much." note="The fee pending report isn't available yet. For now, the Student Payments Log shows each student's total fee, amount received and balance due." />;
      case 'incentive_report': return <ComingSoonPanel title="Incentive Report" description="Track incentives earned and paid out to the sales team." note="The incentive report isn't available yet. You'll be able to review earned and paid incentives from this page once it launches." />;
      case 'leaves': return <LeavesPanel />;
      case 'my_leave_request': return <LeavesPanel isMyPortal />;
      case 'my_profile': return <MyProfilePanel />;
      case 'my_attendance': return <AttendancePanel isMyPortal={true} />;
      case 'notice_board': return <NoticeBoardPanel />;
      case 'pay_slips': return <ComingSoonPanel title="Pay Slips" description="Your monthly salary statements." note="Pay slips aren't available yet. They will appear here once payroll is processed." />;
      
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
    { id: 'payroll_batches', label: 'Payroll Batches' },
    { id: 'salary_approval', label: 'Salary Approval' },
    { id: 'leaves', label: 'Leave Approvals' },
    { id: 'payroll_history', label: 'Payroll History' },
    { id: 'incentive_approval', label: 'Incentive Approval' },
    
    { id: '__students_section', label: '🎓 Students', isSection: true },
    { id: 'students', label: 'Students' },
    { id: 'admissions', label: 'Admissions' },
    { id: 'enrollments', label: 'Enrollments' },
    { id: 'provisional_verifications', label: 'Provisional Verifications' },
    
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
    { id: 'my_profile', label: 'My Profile' },
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
    return <div className="space-y-4">{[1,2,3].map(i => <div key={i} className="h-32 bg-slate-100 rounded-3xl animate-pulse" />)}</div>;
  }

  const { metrics, lists, charts, alerts } = data;

  return (
    <div className="space-y-6">
      {/* Header + filters */}
      <div className="flex flex-wrap gap-4 items-start justify-between">
        <div>
          <h2 className="text-2xl sm:text-3xl font-semibold tracking-tight">Finance Overview</h2>
          <p className="text-sm text-muted-foreground mt-1.5">Monitor collections, expenses, and targets.</p>
        </div>
        <div className="flex flex-wrap gap-2 items-center">
          <select
            value={branchFilter}
            onChange={e => setBranchFilter(e.target.value)}
            className="h-11 px-5 rounded-full border border-slate-200 bg-white text-sm font-semibold text-slate-700 outline-none focus:border-[#54b947]"
          >
            <option value="all">All Branches</option>
            {branches.map(b => (
              <option key={b.id} value={b.id}>{b.name}</option>
            ))}
          </select>
          <select
            value={dateRange}
            onChange={e => setDateRange(e.target.value)}
            className="h-11 px-5 rounded-full border border-slate-200 bg-white text-sm font-semibold text-slate-700 outline-none focus:border-[#54b947]"
          >
            <option value="today">Today</option>
            <option value="this_week">This Week</option>
            <option value="this_month">This Month</option>
            <option value="all">All Time</option>
          </select>
          <Button onClick={fetchDashboardData} variant="outline" size="icon" className="h-11 w-11 rounded-full bg-white border-slate-200 hover:bg-[#eaf6e6]">
            <RefreshCw className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Summary strip */}
      <div className="rounded-3xl bg-white border border-slate-100 overflow-hidden">
        <div className="grid grid-cols-2 lg:grid-cols-4 divide-x divide-y divide-slate-100 [&>*:nth-child(-n+2)]:border-t-0">
          <FinanceMetric title="Total Receivables" value={`${CS()}${(metrics.totalReceivables / 1000).toFixed(1)}K`} onClick={() => onNavigate('invoices')} />
          <FinanceMetric title="Total Collected" value={`${CS()}${(metrics.totalCollected / 1000).toFixed(1)}K`} onClick={() => onNavigate('payments')} />
          <FinanceMetric title="Cash & Bank Bal" value={`${CS()}${(metrics.cashAndBankBalance / 1000).toFixed(1)}K`} />
          <FinanceMetric title="Operational Exp" value={`${CS()}${(metrics.operationalExpenses / 1000).toFixed(1)}K`} onClick={() => onNavigate('expenses')} />
          <FinanceMetric title="Univ Fee Pending" value={`${CS()}${(metrics.universityFeePending / 1000).toFixed(1)}K`} onClick={() => onNavigate('university_fee')} />
          <FinanceMetric title="Incentive Pending" value={`${CS()}${(metrics.incentivePending / 1000).toFixed(1)}K`} onClick={() => onNavigate('incentive_approval')} />
          <FinanceMetric title="Payroll Pending" value={`${CS()}${(metrics.payrollPending / 1000).toFixed(1)}K`} onClick={() => onNavigate('payroll')} />
          <FinanceMetric title="My Target" value={`${CS()}${(metrics.myTargetValue / 1000).toFixed(1)}K`} onClick={() => onNavigate('my_target')} />
        </div>
      </div>

      {/* Alerts */}
      <div className="rounded-3xl bg-white border border-slate-100 overflow-hidden">
        <div className="grid grid-cols-1 sm:grid-cols-3 divide-y sm:divide-y-0 sm:divide-x divide-slate-100">
          <AlertCard title="Overdue Student Fees" count={alerts.overdueStudentFees} type="error" />
          <AlertCard title="University Fee Due" count={alerts.universityFeeDue} type="warning" />
          <AlertCard title="Incentive Pending" count={alerts.incentivePending} type="primary" />
        </div>
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 items-stretch">
        <Card className="lg:col-span-2 rounded-3xl bg-white border border-slate-100 shadow-none py-7 gap-5">
          <CardHeader className="px-7">
            <CardTitle className="text-lg font-semibold tracking-tight">Collection Overview</CardTitle>
          </CardHeader>
          <CardContent className="h-[300px] px-7">
             <ResponsiveContainer width="100%" height="100%">
               <BarChart data={charts.collectionOverview}>
                 <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e8ece6" />
                 <XAxis dataKey="name" axisLine={false} tickLine={false} />
                 <YAxis axisLine={false} tickLine={false} />
                 <Tooltip />
                 <Bar dataKey="value" fill="#54b947" radius={[10,10,0,0]} barSize={40} />
               </BarChart>
             </ResponsiveContainer>
          </CardContent>
        </Card>
        
        <Card className="rounded-3xl bg-white border border-slate-100 shadow-none py-7 gap-5">
          <CardHeader className="px-7">
            <CardTitle className="text-lg font-semibold tracking-tight">Branch-wise Collection</CardTitle>
          </CardHeader>
          <CardContent className="h-[300px] px-7">
             <ResponsiveContainer width="100%" height="100%">
               <BarChart data={charts.branchWiseCollection} layout="vertical" margin={{left: 20}}>
                 <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#e8ece6" />
                 <XAxis type="number" hide />
                 <YAxis dataKey="name" type="category" axisLine={false} tickLine={false} width={100} />
                 <Tooltip />
                 <Bar dataKey="value" fill="#8ae47e" radius={[0,10,10,0]} barSize={20} />
               </BarChart>
             </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Tables Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card className="rounded-3xl bg-white border border-slate-100 shadow-none py-7 gap-5">
          <CardHeader className="px-7">
            <CardTitle className="text-lg font-semibold tracking-tight">Recent Collections</CardTitle>
          </CardHeader>
          <CardContent className="px-7">
            {lists.recentCollections.length > 0 ? (
              <div className="space-y-3">
                {lists.recentCollections.map((c: any) => (
                  <div key={c.id} className="flex justify-between items-center p-4 bg-[#f4f6f3] rounded-2xl">
                    <div>
                      <p className="font-medium text-sm">{c.student?.name || c.invoice?.student?.name || 'Unknown'}</p>
                      <p className="text-xs text-muted-foreground">{new Date(c.createdAt).toLocaleDateString()}</p>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold text-[#256c1d]">{CS()}{c.amount}</p>
                      <Badge variant="outline" className="text-[10px] uppercase rounded-full bg-white border-slate-200">{c.paymentMode || c.method || 'PAID'}</Badge>
                    </div>
                  </div>
                ))}
              </div>
            ) : <p className="text-sm text-muted-foreground text-center py-8 rounded-2xl bg-[#f4f6f3]">No recent collections</p>}
          </CardContent>
        </Card>

        <Card className="rounded-3xl bg-white border border-slate-100 shadow-none py-7 gap-5">
          <CardHeader className="px-7">
            <CardTitle className="text-lg font-semibold tracking-tight">Recent Expenses</CardTitle>
          </CardHeader>
          <CardContent className="px-7">
            {lists.recentExpenses.length > 0 ? (
              <div className="space-y-3">
                {lists.recentExpenses.map((e: any) => (
                  <div key={e.id} className="flex justify-between items-center p-4 bg-[#f4f6f3] rounded-2xl">
                    <div>
                      <p className="font-medium text-sm">{e.category}</p>
                      <p className="text-xs text-muted-foreground">{e.employee?.user?.name || e.user?.name || 'Unknown'}</p>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold text-red-600">{CS()}{e.amount}</p>
                      <Badge variant="outline" className="text-[10px] uppercase rounded-full bg-white border-slate-200">{e.status}</Badge>
                    </div>
                  </div>
                ))}
              </div>
            ) : <p className="text-sm text-muted-foreground text-center py-8 rounded-2xl bg-[#f4f6f3]">No recent expenses</p>}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function AlertCard({ title, count, type }: { title: string, count: number, type: string }) {
  const numMap: any = {
    error: 'text-red-600',
    warning: 'text-amber-600',
    info: 'text-sky-600',
    primary: 'text-slate-900',
  };
  return (
    <div className="p-5 sm:p-6 flex items-center justify-between gap-3">
      <p className="text-sm font-medium text-slate-500">{title}</p>
      <p className={cn('text-3xl font-semibold tracking-tight', numMap[type] || numMap.primary)}>{count}</p>
    </div>
  );
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function FinanceMetric({ title, value, sub, onClick }: any) {
  return (
    <button
      type="button"
      className={cn('text-left p-5 sm:p-6 flex flex-col transition-colors', onClick ? 'hover:bg-[#f7faf6] cursor-pointer' : 'cursor-default')}
      onClick={onClick}
    >
      <p className="text-sm font-medium text-slate-500">{title}</p>
      <p className="text-3xl font-semibold tracking-tight text-slate-900 mt-2">{value}</p>
      {sub && <p className="text-xs text-muted-foreground mt-2">{sub}</p>}
    </button>
  );
}
