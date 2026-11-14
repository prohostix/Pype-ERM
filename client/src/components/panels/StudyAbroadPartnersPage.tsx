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
    <Tabs value={tab} onValueChange={setTab} className="space-y-4">
      <TabsList>
        <TabsTrigger value="partners">Partners</TabsTrigger>
        <TabsTrigger value="applications">Applications</TabsTrigger>
        <TabsTrigger value="commission">Commission</TabsTrigger>
      </TabsList>
      <TabsContent value="partners"><StudyAbroadPartnersPanel /></TabsContent>
      <TabsContent value="applications"><StudyAbroadApplicationsPanel /></TabsContent>
      <TabsContent value="commission"><StudyAbroadCommissionPanel onOpenApplications={() => setTab('applications')} /></TabsContent>
    </Tabs>
  );
}
