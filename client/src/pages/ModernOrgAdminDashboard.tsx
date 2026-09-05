/* eslint-disable react-refresh/only-export-components */
/* eslint-disable react-hooks/set-state-in-effect */
import { useState, useEffect } from 'react';
import { Tabs, TabsContent } from '@/components/ui/tabs';
import { UsersPanel } from '@/components/panels/UsersPanel';
import { DepartmentsPanel } from '@/components/panels/DepartmentsPanel';
import { TasksPanel } from '@/components/panels/TasksPanel';
import { StudentsPanel } from '@/components/panels/StudentsPanel';
import { UniversitiesPanel } from '@/components/panels/UniversitiesPanel';
import { ProgramsPanel } from '@/components/panels/ProgramsPanel';
import { StudyCentersPanel } from '@/components/panels/StudyCentersPanel';
import { InvoicesPanel } from '@/components/panels/InvoicesPanel';
import { PaymentsPanel } from '@/components/panels/PaymentsPanel';
import { ExpensesPanel } from '@/components/panels/ExpensesPanel';
import { EmployeesPanel } from '@/components/panels/EmployeesPanel';
import { LeavesPanel } from '@/components/panels/LeavesPanel';
import { LeadsPanel } from '@/components/panels/LeadsPanel';
import { OrgHierarchyPanel } from '@/components/panels/OrgHierarchyPanel';
import { BranchesPanel } from '@/components/panels/BranchesPanel';
import { CollectionsPanel } from '@/components/panels/CollectionsPanel';
import { AdmissionSessionsPanel } from '@/components/panels/AdmissionSessionsPanel';
import { DeptEnrollmentReviewPanel } from '@/components/panels/DeptEnrollmentReviewPanel';
import { OrganizationSettingsPanel } from '@/components/panels/OrganizationSettingsPanel';
import { ActivityLogPanel } from '@/components/panels/ActivityLogPanel';
import { BiometricDevicesPanel } from '@/components/panels/BiometricDevicesPanel';
import DsmsMigrationPanel from '@/components/panels/DsmsMigrationPanel';
import { AcademicCentersAdminPanel } from '@/modules/academic-center/AcademicCentersAdminPanel';

import { MeetingsPanel } from '@/components/panels/MeetingsPanel';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import api from '@/lib/api';

export function ModernOrgAdminDashboard({ initialTab, onNavigate }: { initialTab?: string, onNavigate?: (tab: string) => void }) {
  const [metrics, setMetrics] = useState<any>({});
  const [activeTab, setActiveTab] = useState(initialTab || 'overview');
  const handleNavigate = (tab: string) => {
    setActiveTab(tab);
    if (onNavigate) onNavigate(tab);
  };

  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => {
    setActiveTab(initialTab || 'overview');
  }, [initialTab]);

  useEffect(() => {
    api.get('/dashboard/metrics')
      .then(r => setMetrics(r.data.data || {}))
      .catch(() => {});
  }, []);

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Organization Admin</h1>
        <p className="text-muted-foreground mt-1">Manage your organization's operations, finance, HR, and sales.</p>
      </div>

      <Tabs value={activeTab} onValueChange={handleNavigate} className="space-y-6">
        {/* Sidebar navigation acts as the main router, so we don't render TabsList here */}

        <TabsContent value="overview">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <div className="lg:col-span-2">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-2 gap-4">
                <MetricCard title="Total Users" value={metrics.totalEmployees || 0} />
                <MetricCard title="Students" value={metrics.totalStudents || 0} />
                <MetricCard title="Study Centers" value={metrics.totalCenters || 0} />
                <MetricCard title="Leads" value={metrics.totalLeads || 0} />
              </div>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="users"><UsersPanel /></TabsContent>
        <TabsContent value="hierarchy"><OrgHierarchyPanel /></TabsContent>
        <TabsContent value="branches"><BranchesPanel /></TabsContent>
        <TabsContent value="departments"><DepartmentsPanel /></TabsContent>

        <TabsContent value="tasks"><TasksPanel /></TabsContent>
        <TabsContent value="students"><StudentsPanel /></TabsContent>
        <TabsContent value="universities"><UniversitiesPanel /></TabsContent>
        <TabsContent value="programs"><ProgramsPanel /></TabsContent>
        <TabsContent value="academic_centers"><AcademicCentersAdminPanel /></TabsContent>
        <TabsContent value="centers"><StudyCentersPanel /></TabsContent>
        <TabsContent value="invoices"><InvoicesPanel /></TabsContent>
        <TabsContent value="payments"><PaymentsPanel /></TabsContent>
        <TabsContent value="expenses"><ExpensesPanel /></TabsContent>
        <TabsContent value="collections"><CollectionsPanel /></TabsContent>
        <TabsContent value="employees"><EmployeesPanel /></TabsContent>
        <TabsContent value="leaves"><LeavesPanel /></TabsContent>
        <TabsContent value="leads"><LeadsPanel /></TabsContent>
        <TabsContent value="sessions"><AdmissionSessionsPanel /></TabsContent>
        <TabsContent value="enrollment_review"><DeptEnrollmentReviewPanel /></TabsContent>
        <TabsContent value="settings"><OrganizationSettingsPanel /></TabsContent>
        <TabsContent value="biometric-devices"><BiometricDevicesPanel /></TabsContent>
        <TabsContent value="meetings">
          <MeetingsPanel />
        </TabsContent>
        <TabsContent value="activity-logs">
          <ActivityLogPanel />
        </TabsContent>
        <TabsContent value="dsms_migration">
          <DsmsMigrationPanel />
        </TabsContent>
      </Tabs>
    </div>
  );
}

function MetricCard({ title, value }: { title: string; value: number }) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-3xl font-bold">{value.toLocaleString()}</p>
      </CardContent>
    </Card>
  );
}
