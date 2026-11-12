import { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/hooks/useAuth';
import { StudyAbroadPartnersPanel } from './StudyAbroadPartnersPanel';
import { StudyAbroadReviewPanel } from './StudyAbroadReviewPanel';

/**
 * The single "Study Abroad Partners" menu entry. Like Academic Partners, each role opens
 * one page; what it can do inside depends on the role:
 *   Sales            — partners
 *   Operations       — partners, applications (document review)
 *   Finance          — partners (read-only), applications (record the service fee)
 *   Org admin        — everything
 */
export function StudyAbroadPartnersPage() {
  const { user } = useAuth();
  const role = user?.role || '';
  const isOrg = ['org_admin', 'superadmin'].includes(role);
  const isOps = ['ops_admin', 'ops_sub_admin'].includes(role);
  const isFinance = ['finance_admin', 'finance_sub_admin'].includes(role);

  const [stage, setStage] = useState<'ops' | 'finance'>(isFinance ? 'finance' : 'ops');
  const showApplications = isOrg || isOps || isFinance;

  // Sales (and anyone else with just the partner list) gets the list without tab chrome.
  if (!showApplications) return <StudyAbroadPartnersPanel />;

  return (
    <Tabs defaultValue="partners" className="space-y-6">
      <TabsList className="flex w-max space-x-1.5 bg-transparent p-1 h-auto border-b border-border/30">
        <TabsTrigger value="partners" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground rounded-full px-5 py-2 text-sm font-medium">Partners</TabsTrigger>
        {showApplications && <TabsTrigger value="applications" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground rounded-full px-5 py-2 text-sm font-medium">Applications</TabsTrigger>}
      </TabsList>

      <TabsContent value="partners"><StudyAbroadPartnersPanel /></TabsContent>

      {showApplications && (
        <TabsContent value="applications" className="space-y-4">
          {isOrg && (
            <div className="flex gap-2">
              <Button size="sm" variant={stage === 'ops' ? 'default' : 'outline'} onClick={() => setStage('ops')}>Document review</Button>
              <Button size="sm" variant={stage === 'finance' ? 'default' : 'outline'} onClick={() => setStage('finance')}>Fee &amp; enrollment</Button>
            </div>
          )}
          <StudyAbroadReviewPanel key={stage} stage={isOrg ? stage : isFinance ? 'finance' : 'ops'} />
        </TabsContent>
      )}

    </Tabs>
  );
}
