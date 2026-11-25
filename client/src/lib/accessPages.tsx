/* eslint-disable react-refresh/only-export-components */
// Pages whose access an Org Admin can set per user: which menu entries they are, and what to open
// for someone who was given a page their role's dashboard does not have.
import type { ReactElement } from 'react';
import { StudentsPanel } from '@/components/panels/StudentsPanel';
import { StudentFiltersPanel } from '@/components/panels/StudentFiltersPanel';
import { DeptEnrollmentReviewPanel } from '@/components/panels/DeptEnrollmentReviewPanel';
import { AdmissionSessionsPanel } from '@/components/panels/AdmissionSessionsPanel';
import { SalesInvitePanel } from '@/components/panels/SalesInvitePanel';
import { ProvisionalEnrollmentPanel } from '@/components/panels/ProvisionalEnrollmentPanel';
import { SalesStudentPipelinePanel } from '@/components/panels/SalesStudentPipelinePanel';
import { SalesAdminReviewPanel } from '@/components/panels/SalesAdminReviewPanel';
import { StudentPortalManagementPanel } from '@/components/panels/StudentPortalManagementPanel';
import { PaymentsPanel } from '@/components/panels/PaymentsPanel';
import { ExpensesPanel } from '@/components/panels/ExpensesPanel';
import { FeeStructuresPanel } from '@/components/panels/FeeStructuresPanel';
import { DiscountsPanel } from '@/components/panels/DiscountsPanel';
import { FinanceCenterVerificationPanel } from '@/components/panels/FinanceCenterVerificationPanel';
import { ProvisionalFinancePanel } from '@/components/panels/ProvisionalFinancePanel';
import { FinanceEnrollmentsPanel } from '@/components/panels/FinanceEnrollmentsPanel';
import { WalletTopUpsPanel } from '@/components/panels/WalletTopUpsPanel';
import { StudentPaymentsLogPanel } from '@/components/panels/StudentPaymentsLogPanel';
import { PaymentGatewayPanel } from '@/components/panels/PaymentGatewayPanel';
import { UniversityPaymentsPanel } from '@/components/panels/UniversityPaymentsPanel';
import { UniversityCommissionsPanel } from '@/components/panels/UniversityCommissionsPanel';
import { FinanceSalesTargetsPanel } from '@/components/panels/FinanceSalesTargetsPanel';
import { CollectionsPanel } from '@/components/panels/CollectionsPanel';
import { InvoicesPanel } from '@/components/panels/InvoicesPanel';
import { BillReceiptPanel } from '@/components/panels/BillReceiptPanel';
import { PayrollPanel } from '@/components/panels/PayrollPanel';
import { PayrollBatchesPanel } from '@/components/panels/PayrollBatchesPanel';
import { FinancePayrollHistoryPanel } from '@/components/panels/FinancePayrollHistoryPanel';
import { SalaryConfigPanel } from '@/components/panels/SalaryConfigPanel';
import { FinanceSalaryApprovalPanel } from '@/components/panels/FinanceSalaryApprovalPanel';
import { StudentReportPanel } from '@/components/panels/StudentReportPanel';
import { AdmissionReportPanel } from '@/components/panels/AdmissionReportPanel';
import { EnrollmentReportPanel } from '@/components/panels/EnrollmentReportPanel';
import { UniversityReportPanel } from '@/components/panels/UniversityReportPanel';
import { ReRegistrationReportPanel } from '@/components/panels/ReRegistrationReportPanel';
import { IncomeExpenditurePanel } from '@/components/panels/IncomeExpenditurePanel';
import { ProfitLossPanel } from '@/components/panels/ProfitLossPanel';
import { CollectionReportPanel } from '@/components/panels/CollectionReportPanel';
import { SalesTeamReportPanel } from '@/components/panels/SalesTeamReportPanel';
import { SalesAdmissionReportPanel } from '@/components/panels/SalesAdmissionReportPanel';
import { SalesConversionReportPanel } from '@/components/panels/SalesConversionReportPanel';
import { PerformancePanel } from '@/components/panels/PerformancePanel';
import { CEOKPIReportPanel } from '@/components/panels/CEOKPIReportPanel';
import { EmployeeActivityReportPanel } from '@/components/panels/EmployeeActivityReportPanel';
import { isBlocked, type UserAccess } from '@/lib/access';
import { BLOCK_ONLY_PAGES } from '@/lib/blockOnlyPages';
import { EmployeesPanel } from '@/components/panels/EmployeesPanel';
import { BranchHierarchyPanel } from '@/components/panels/BranchHierarchyPanel';
import { AttendancePanel } from '@/components/panels/AttendancePanel';
import { HRSettingsPanel } from '@/components/attendance/HRSettingsPanel';
import { BiometricDevicesPanel } from '@/components/panels/BiometricDevicesPanel';
import { LeavesPanel } from '@/components/panels/LeavesPanel';
import { LeaveAllocationPanel } from '@/components/panels/LeaveAllocationPanel';
import { HolidaysPanel } from '@/components/panels/HolidaysPanel';
import { VacanciesPanel } from '@/components/panels/VacanciesPanel';
import { ComplaintsPanel } from '@/components/panels/ComplaintsPanel';
import { AssetManagementPanel } from '@/components/panels/AssetManagementPanel';
import { HRUsersPanel } from '@/components/panels/HRUsersPanel';
import { DepartmentsPanel } from '@/components/panels/DepartmentsPanel';
import { BranchesPanel } from '@/components/panels/BranchesPanel';
import { OrgHierarchyPanel } from '@/components/panels/OrgHierarchyPanel';
import { ManagerAssignmentPanel } from '@/components/panels/ManagerAssignmentPanel';
import { UniversitiesPanel } from '@/components/panels/UniversitiesPanel';
import { ProgramsPanel } from '@/components/panels/ProgramsPanel';
import { OpsProgramAllocationPanel } from '@/components/panels/OpsProgramAllocationPanel';
import { StudyCentersPanel } from '@/components/panels/StudyCentersPanel';
import { SalesCentersPanel } from '@/components/panels/SalesCentersPanel';
import { AcademicCentersPanel } from '@/components/panels/AcademicCentersPanel';
import { FacultiesPanel } from '@/components/panels/FacultiesPanel';
import { StudyAbroadPartnersPanel } from '@/components/panels/StudyAbroadPartnersPanel';

interface AccessPage { key: string; label: string; menuIds: string[]; render?: () => ReactElement; exceptRoles?: string[]; onlyRoles?: string[] }

const PAGES: AccessPage[] = [
  { key: 'students', label: 'Students', menuIds: ['students', 'enrolled_students', 'student_status', 'team_enrolled_students'], render: () => <StudentsPanel /> },
  { key: 'student_filters', label: 'Student Filters', menuIds: ['student_filters'], render: () => <StudentFiltersPanel /> },
  { key: 'admission_review', label: 'Admission Review', menuIds: ['admission_review', 'enrollment_review'], render: () => <DeptEnrollmentReviewPanel /> },
  { key: 'admission_sessions', label: 'Admission Sessions', menuIds: ['sessions', 'admissions'], render: () => <AdmissionSessionsPanel /> },
  { key: 'invite_links', label: 'Generate Student Link', menuIds: ['invite_links'], render: () => <SalesInvitePanel /> },
  { key: 'provisional_enrollment', label: 'Provisional Enrollment', menuIds: ['provisional_enrollment'], render: () => <ProvisionalEnrollmentPanel /> },
  { key: 'admission_pipeline', label: 'Admission Pipeline', menuIds: ['admission_pipeline', 'admission_status_overview', 'student_applications', 'pending_admissions'], render: () => <SalesStudentPipelinePanel /> },
  { key: 'admission_approval', label: 'Admission Approval', menuIds: ['admission_approval', 'sales_enrollment_review'], render: () => <SalesAdminReviewPanel /> },
  { key: 'student_portal_management', label: 'Student Portal Management', menuIds: ['student_portal_management'], render: () => <StudentPortalManagementPanel /> },
  { key: 'payments', label: 'Payments', menuIds: ['payments', 'payment_status', 'pending_payment', 'payment'], render: () => <PaymentsPanel /> },
  { key: 'expenses', label: 'Expenses', menuIds: ['expenses'], render: () => <ExpensesPanel /> },
  { key: 'fee_structures', label: 'Fee Structures', menuIds: ['fee_structures', 'fees', 'fee_structure', 'fee_structure_res'], render: () => <FeeStructuresPanel /> },
  { key: 'discounts', label: 'Discounts', menuIds: ['discounts'], render: () => <DiscountsPanel /> },
  { key: 'pending_payments', label: 'Pending Payments', menuIds: ['pending_payments'], render: () => <FinanceCenterVerificationPanel /> },
  { key: 'provisional_verifications', label: 'Provisional Verifications', menuIds: ['provisional_verifications'], render: () => <ProvisionalFinancePanel /> },
  { key: 'finance_enrollments', label: 'Finance Enrollments', menuIds: ['enrollments', 'finance_enrollments', 'enrollments_finance'], render: () => <FinanceEnrollmentsPanel /> },
  { key: 'wallet_topups', label: 'Wallet Top-up', menuIds: ['wallet_topup', 'wallet_topups'], render: () => <WalletTopUpsPanel /> },
  { key: 'student_payment_log', label: 'Student Payment Log', menuIds: ['student_payment_log'], render: () => <StudentPaymentsLogPanel /> },
  { key: 'payment_gateway', label: 'Payment Gateway', menuIds: ['payment_gateway'], render: () => <PaymentGatewayPanel /> },
  { key: 'university_fee', label: 'University Fee', menuIds: ['university_fee'], render: () => <UniversityPaymentsPanel /> },
  { key: 'university_commissions', label: 'University Commissions', menuIds: ['university_commissions'], render: () => <UniversityCommissionsPanel /> },
  { key: 'sales_targets', label: 'Finance Sales Target', menuIds: ['sales_target'], render: () => <FinanceSalesTargetsPanel /> },
  { key: 'collections', label: 'Collections', menuIds: ['collections', 'student_collections'], render: () => <CollectionsPanel /> },
  { key: 'invoices', label: 'Invoices', menuIds: ['invoices'], render: () => <InvoicesPanel /> },
  { key: 'bill_receipts', label: 'Bill & Receipts', menuIds: ['bill_receipts'], render: () => <BillReceiptPanel /> },
  { key: 'payroll', label: 'Payroll', menuIds: ['payroll'], render: () => <PayrollPanel /> },
  { key: 'payroll_batches', label: 'Payroll Batches', menuIds: ['payroll_batches', 'payroll-batches'], render: () => <PayrollBatchesPanel /> },
  { key: 'payroll_history', label: 'Payroll History', menuIds: ['payroll_history'], render: () => <FinancePayrollHistoryPanel /> },
  { key: 'salary_config', label: 'Salary Config', menuIds: ['salary-config'], render: () => <SalaryConfigPanel /> },
  { key: 'salary_approval', label: 'Salary Approval', menuIds: ['salary_approval'], render: () => <FinanceSalaryApprovalPanel /> },
  { key: 'student_report', label: 'Student Report', menuIds: ['student_report'], render: () => <StudentReportPanel /> },
  { key: 'admission_report', label: 'Admission Report', menuIds: ['admission_report'], render: () => <AdmissionReportPanel /> },
  { key: 'enrollment_report', label: 'Enrollment Report', menuIds: ['enrollment_report'], render: () => <EnrollmentReportPanel /> },
  { key: 'university_report', label: 'University Report', menuIds: ['university_report'], render: () => <UniversityReportPanel /> },
  { key: 'rereg_report', label: 'Re-registration Report', menuIds: ['re_registration_report'], render: () => <ReRegistrationReportPanel /> },
  { key: 'income_expense', label: 'Income & Expense', menuIds: ['income_expense'], render: () => <IncomeExpenditurePanel /> },
  { key: 'profit_loss', label: 'Profit & Loss', menuIds: ['profit_loss'], render: () => <ProfitLossPanel /> },
  { key: 'collection_report', label: 'Collection Report', menuIds: ['collection_report'], render: () => <CollectionReportPanel /> },
  { key: 'sales_team_report', label: 'Sales Team Reports', menuIds: ['team_reports'], render: () => <SalesTeamReportPanel /> },
  { key: 'sales_admission_report', label: 'Sales Admission Reports', menuIds: ['admission_reports', 'counselor_admission_reports'], render: () => <SalesAdmissionReportPanel /> },
  { key: 'conversion_report', label: 'Conversion Report', menuIds: ['conversion_report'], render: () => <SalesConversionReportPanel /> },
  { key: 'performance', label: 'Performance', menuIds: ['performance'], render: () => <PerformancePanel /> },
  { key: 'kpi_report', label: 'KPI / KRA Report', menuIds: ['kpi-kra'], render: () => <CEOKPIReportPanel /> },
  { key: 'activity_report', label: 'Activity Report', menuIds: ['activity_report'], render: () => <EmployeeActivityReportPanel /> },
  { key: 'employees', label: 'Employees', menuIds: ['employees'], render: () => <EmployeesPanel /> },
  { key: 'branch_hierarchy', label: 'Branch Hierarchy', menuIds: ['hierarchy'], render: () => <BranchHierarchyPanel /> },
  { key: 'team_attendance', label: 'Team Attendance', menuIds: ['attendance'], exceptRoles: ['employee'], render: () => <AttendancePanel /> },
  { key: 'attendance_settings', label: 'Attendance Settings', menuIds: ['att-settings'], render: () => <HRSettingsPanel /> },
  { key: 'biometric_devices', label: 'Biometric Devices', menuIds: ['biometric_devices'], render: () => <BiometricDevicesPanel /> },
  { key: 'leave_requests', label: 'Leave Approvals', menuIds: ['leaves', 'leave_requests'], exceptRoles: ['employee'], render: () => <LeavesPanel /> },
  { key: 'leave_allocation', label: 'Leave Allocation', menuIds: ['leave-alloc'], render: () => <LeaveAllocationPanel /> },
  { key: 'holidays', label: 'Holidays', menuIds: ['holidays'], render: () => <HolidaysPanel /> },
  { key: 'vacancies', label: 'Vacancies', menuIds: ['vacancies'], render: () => <VacanciesPanel /> },
  { key: 'complaints', label: 'Complaints', menuIds: ['complaints', 'support_requests'], render: () => <ComplaintsPanel /> },
  { key: 'assets', label: 'Assets', menuIds: ['assets'], render: () => <AssetManagementPanel /> },
  { key: 'users', label: 'Users', menuIds: ['users'], render: () => <HRUsersPanel /> },
  { key: 'departments', label: 'Departments', menuIds: ['departments'], render: () => <DepartmentsPanel /> },
  { key: 'branches', label: 'Branches', menuIds: ['branches'], render: () => <BranchesPanel /> },
  { key: 'org_chart', label: 'Org Chart', menuIds: ['org-chart'], render: () => <OrgHierarchyPanel /> },
  { key: 'managers', label: 'Managers', menuIds: ['managers'], render: () => <ManagerAssignmentPanel /> },
  { key: 'universities', label: 'Universities', menuIds: ['universities', 'university_details', 'university_details_res'], render: () => <UniversitiesPanel /> },
  { key: 'programs', label: 'Programs', menuIds: ['programs', 'course_details', 'course_details_res'], render: () => <ProgramsPanel /> },
  { key: 'program_allocation', label: 'Program Allocation', menuIds: ['program_allocations'], render: () => <OpsProgramAllocationPanel /> },
  { key: 'academic_partners', label: 'Academic Partners', menuIds: ['centers', 'study_centers'], render: () => <StudyCentersPanel /> },
  { key: 'partners_sales', label: 'Academic Partners (Sales view)', menuIds: ['branch_centers_sales'], render: () => <SalesCentersPanel /> },
  { key: 'academic_centers', label: 'Academic Centers', menuIds: ['academic_centers'], render: () => <AcademicCentersPanel /> },
  { key: 'faculties', label: 'Faculties', menuIds: ['faculties'], render: () => <FacultiesPanel /> },
  { key: 'study_abroad', label: 'Study Abroad Partners', menuIds: ['study_abroad_partners'], render: () => <StudyAbroadPartnersPanel /> },
];

const ALL_PAGES: AccessPage[] = [...PAGES, ...BLOCK_ONLY_PAGES];
/** Some menu IDs mean a personal screen for certain roles, which blocking the team page must leave alone. */
const concerns = (page: AccessPage, role: string) => !page.exceptRoles?.includes(role) && (!page.onlyRoles || page.onlyRoles.includes(role));
/** The pages a menu ID stands for, for this role. It is blocked only when all of them are. */
const pagesAt = (role: string, id: string) => ALL_PAGES.filter((p) => p.menuIds.includes(id) && concerns(p, role));

const GRANT_PREFIX = 'access:';
// Portal accounts have their own screens, which per-user access does not cover
const PORTAL_ROLES = ['student', 'faculty', 'center_admin', 'study_abroad_admin'];

type AccessHolder = { role: string; access?: UserAccess } | null | undefined;
interface MenuItem { id: string; label: string; isSection?: boolean }

/** The role's menu, without blocked pages and with the pages added for this user. */
export const applyAccessToMenu = <T extends MenuItem>(user: AccessHolder, items: T[]): (T | MenuItem)[] => {
  if (!user?.access || PORTAL_ROLES.includes(user.role)) return items;
  const kept = items.filter((item) => {
    const pages = pagesAt(user.role, item.id);
    return pages.length === 0 || !pages.every((page) => isBlocked(user, page.key));
  });
  // A section whose entries were all removed goes too
  const tidy: (T | MenuItem)[] = kept.filter((item, i) => !item.isSection || (kept[i + 1] !== undefined && !kept[i + 1].isSection));
  const granted = PAGES.filter((page) => {
    const view = user.access?.[page.key]?.view;
    return view?.allowed && !view.byDefault && !(concerns(page, user.role) && tidy.some((item) => page.menuIds.includes(item.id)));
  });
  if (granted.length === 0) return tidy;
  return [
    ...tidy,
    { id: '__additional_access', label: 'Additional Access', isSection: true },
    ...granted.map((page) => ({ id: GRANT_PREFIX + page.key, label: page.label })),
  ];
};

/**
 * What to show instead of the role dashboard for this tab: an added page, or a refusal for a
 * blocked one. Null leaves the tab to the dashboard.
 */
export const accessScreen = (user: AccessHolder, tab?: string): ReactElement | null => {
  if (!user || !tab || PORTAL_ROLES.includes(user.role)) return null;
  const added = tab.startsWith(GRANT_PREFIX);
  const pages = added ? PAGES.filter((p) => tab === GRANT_PREFIX + p.key) : pagesAt(user.role, tab);
  if (pages.length === 0) return null;
  const page = pages[0];
  // A role menu entry is refused only when blocked; an added page needs to be allowed
  if (added ? !user.access?.[page.key]?.view?.allowed : pages.every((p) => isBlocked(user, p.key))) {
    return (
      <div className="rounded-3xl bg-white border border-slate-100 text-center py-16 px-6">
        <p className="font-semibold">You don't have access to {page.label}</p>
        <p className="text-sm text-muted-foreground mt-1">Ask your Org Admin if you need it.</p>
      </div>
    );
  }
  return added && page.render ? page.render() : null;
};
