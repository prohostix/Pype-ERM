import { useState } from 'react';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { useAuth } from '@/hooks/useAuth';
import { StudyAbroadPartnersPanel } from './StudyAbroadPartnersPanel';
import { StudyAbroadApplicationsPanel } from './studyabroad/StudyAbroadApplicationsPanel';
import { StudyAbroadCommissionPanel } from './studyabroad/StudyAbroadCommissionPanel';

/**
 * "Study Abroad Partners" menu entry.
 *  - Partners: onboard partners, logins, destination countries and commission terms.
 *  - Applications: the study abroad pipeline (application → interview → offer → payment → visa → enrolled → commission).
 *  - Commission: what is payable / released per partner.
 * The pipeline is separate from the core Enrollment flow; it only creates a Student when the visa is approved.
 * Only the organization admin sees the pipeline and commission tabs.
 */
export function StudyAbroadPartnersPage() {
  const { user } = useAuth();
  const isOrg = ['org_admin', 'superadmin'].includes(user?.role || '');
  const [tab, setTab] = useState('partners');
  if (!isOrg) return <StudyAbroadPartnersPanel />;
  return (
    <Tabs value={tab} onValueChange={setTab} className="space-y-6">
      <TabsList className="h-auto rounded-3xl bg-white border border-slate-100 p-2 gap-2 w-fit max-w-full overflow-x-auto">
        <TabsTrigger value="partners" className="rounded-full px-5 py-2.5 text-sm font-semibold text-slate-600 data-[state=active]:bg-[#8ae47e] data-[state=active]:text-[#0b1d14] data-[state=active]:shadow-none">Partners</TabsTrigger>
        <TabsTrigger value="applications" className="rounded-full px-5 py-2.5 text-sm font-semibold text-slate-600 data-[state=active]:bg-[#8ae47e] data-[state=active]:text-[#0b1d14] data-[state=active]:shadow-none">Applications</TabsTrigger>
        <TabsTrigger value="commission" className="rounded-full px-5 py-2.5 text-sm font-semibold text-slate-600 data-[state=active]:bg-[#8ae47e] data-[state=active]:text-[#0b1d14] data-[state=active]:shadow-none">Commission</TabsTrigger>
      </TabsList>
      <TabsContent value="partners"><StudyAbroadPartnersPanel /></TabsContent>
      <TabsContent value="applications"><StudyAbroadApplicationsPanel /></TabsContent>
      <TabsContent value="commission"><StudyAbroadCommissionPanel onOpenApplications={() => setTab('applications')} /></TabsContent>
    </Tabs>
  );
}
