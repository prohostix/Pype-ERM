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
import { InvoicesPanel } from '@/components/panels/InvoicesPanel';
import { BillReceiptPanel } from '@/components/panels/BillReceiptPanel';
import { canDo, type UserAccess } from '@/lib/access';

interface AccessPage { key: string; label: string; menuIds: string[]; render: () => ReactElement }

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
  { key: 'invoices', label: 'Invoices', menuIds: ['invoices'], render: () => <InvoicesPanel /> },
  { key: 'bill_receipts', label: 'Bill & Receipts', menuIds: ['bill_receipts'], render: () => <BillReceiptPanel /> },
];

const GRANT_PREFIX = 'access:';
// Portal accounts have their own screens, which per-user access does not cover
const PORTAL_ROLES = ['student', 'faculty', 'center_admin', 'study_abroad_admin'];

type AccessHolder = { role: string; access?: UserAccess } | null | undefined;
interface MenuItem { id: string; label: string; isSection?: boolean }

/** The role's menu, without blocked pages and with the pages added for this user. */
export const applyAccessToMenu = <T extends MenuItem>(user: AccessHolder, items: T[]): (T | MenuItem)[] => {
  if (!user?.access || PORTAL_ROLES.includes(user.role)) return items;
  const kept = items.filter((item) => {
    const page = PAGES.find((p) => p.menuIds.includes(item.id));
    return !page || canDo(user, page.key, 'view');
  });
  // A section whose entries were all removed goes too
  const tidy: (T | MenuItem)[] = kept.filter((item, i) => !item.isSection || (kept[i + 1] !== undefined && !kept[i + 1].isSection));
  const granted = PAGES.filter((page) => {
    const view = user.access?.[page.key]?.view;
    return view?.allowed && !view.byDefault && !tidy.some((item) => page.menuIds.includes(item.id));
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
  const page = PAGES.find((p) => (added ? tab === GRANT_PREFIX + p.key : p.menuIds.includes(tab)));
  if (!page) return null;
  if (!canDo(user, page.key, 'view')) {
    return (
      <div className="rounded-3xl bg-white border border-slate-100 text-center py-16 px-6">
        <p className="font-semibold">You don't have access to {page.label}</p>
        <p className="text-sm text-muted-foreground mt-1">Ask your Org Admin if you need it.</p>
      </div>
    );
  }
  return added ? page.render() : null;
};
