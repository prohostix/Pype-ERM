/* eslint-disable react-refresh/only-export-components */
// Pages whose access an Org Admin can set per user: which menu entries they are, and what to open
// for someone who was given a page their role's dashboard does not have.
import type { ReactElement } from 'react';
import { InvoicesPanel } from '@/components/panels/InvoicesPanel';
import { BillReceiptPanel } from '@/components/panels/BillReceiptPanel';
import { canDo, type UserAccess } from '@/lib/access';

interface AccessPage { key: string; label: string; menuIds: string[]; render: () => ReactElement }

const PAGES: AccessPage[] = [
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
