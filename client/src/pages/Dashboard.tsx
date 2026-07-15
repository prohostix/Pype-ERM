import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import api from '@/lib/api';
import { ModernCEODashboard } from './ModernCEODashboard';
import { ModernFinanceDashboard } from './ModernFinanceDashboard';
import { ModernOpsDashboard } from './ModernOpsDashboard';
import { ModernHRDashboard } from './ModernHRDashboard';
import { ModernSalesDashboard } from './ModernSalesDashboard';
import { ModernCollectionsDashboard } from './ModernCollectionsDashboard';
import { ModernSuperadminDashboard } from './ModernSuperadminDashboard';
import { ModernOrgAdminDashboard } from './ModernOrgAdminDashboard';
import { ModernStudyCenterDashboard } from './ModernStudyCenterDashboard';
import { ModernEmployeeDashboard } from './ModernEmployeeDashboard';
import { ModernStaffPortal } from './ModernStaffPortal';
import { ModernStudentPortal } from './ModernStudentPortal';
import { ModernBranchManagerDashboard } from './ModernBranchManagerDashboard';


interface DashboardProps {
  onNavigateToTable?: (table: string) => void;
  useDepartmentDashboard?: boolean;
  initialTab?: string;
}

export function Dashboard({ useDepartmentDashboard, initialTab }: DashboardProps) {
  const { user } = useAuth();
  const [departmentType, setDepartmentType] = useState<string | null>(null);
  const [hasSubDept, setHasSubDept] = useState(false);
  const [deptLoading, setDeptLoading] = useState(false);

  useEffect(() => {
    if (!useDepartmentDashboard || !user) return;
    const fetchDeptAndSubDept = async () => {
      setDeptLoading(true);
      try {
        // Fetch subdepartment status
        const subDeptId = (user as any).subDepartmentId;
        const subDept = typeof subDeptId === 'object' ? subDeptId : null;
        setHasSubDept(Boolean(subDeptId));

        // Fetch department type
        const dept = (user as any).department || user.departmentId;
        if (dept) {
          if (typeof dept === 'object' && (dept as any).type) {
            setDepartmentType((dept as any).type);
            setDeptLoading(false);
            return;
          }
          const deptId = typeof dept === 'object'
            ? (dept as any).id?.toString()
            : dept.toString();
          if (deptId) {
            const res = await api.get(`/departments/${deptId}`);
            if (res.data.data?.type) {
              setDepartmentType(res.data.data.type);
              setDeptLoading(false);
              return;
            }
          }
        }

        // Try from subdepartment parent
        const parentDeptId = subDept?.parentDeptId;
        if (parentDeptId) {
          if (typeof parentDeptId === 'object' && parentDeptId.type) {
            setDepartmentType(parentDeptId.type);
            setDeptLoading(false);
            return;
          }
          const pid = typeof parentDeptId === 'object' ? parentDeptId.id?.toString() : parentDeptId?.toString();
          if (pid) {
            const res = await api.get(`/departments/${pid}`);
            if (res.data.data?.type) {
              setDepartmentType(res.data.data.type);
              setDeptLoading(false);
              return;
            }
          }
        }

        // Last resort: fetch from /sub-departments/my
        try {
          const res = await api.get('/sub-departments/my');
          const parentType = res.data.data?.subDepartment?.parentDeptId?.type;
          if (parentType) {
            setDepartmentType(parentType);
          }
        } catch (_) {}
      } catch (err) {
        console.error('Failed to load dept for dashboard routing:', err);
      } finally {
        setDeptLoading(false);
      }
    };
    fetchDeptAndSubDept();
  }, [useDepartmentDashboard, user]);

  const isBranchManager = Boolean((user as any)?.branchId);

  // Branch managers always get the branch dashboard — skip all other routing
  if (isBranchManager) {
    return <ModernBranchManagerDashboard initialTab={initialTab} />;
  }

  // While fetching department type, don't render anything yet to avoid flash
  if (useDepartmentDashboard && deptLoading) {
    return (
      <div className="flex items-center justify-center h-64 text-muted-foreground">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  // Route employees to department-specific dashboards
  if (useDepartmentDashboard) {
    const isSubDeptManager = hasSubDept;

    // If we have a department type, route accordingly
    if (departmentType) {
      // Regular employees (not sub-dept managers) always get the employee dashboard
      // Exception: Sales employees get the Sales dashboard (which has an employee portal)
      if (!isSubDeptManager && departmentType !== 'sales' && departmentType !== 'collections') {
        return <ModernEmployeeDashboard initialTab={initialTab} />;
      }
      // Sub-dept managers get the department admin dashboard
      switch (departmentType) {
        case 'hr':
          return <ModernHRDashboard initialTab={initialTab} />;
        case 'finance':
          return <ModernFinanceDashboard initialTab={initialTab} />;
        case 'operations':
          return <ModernOpsDashboard initialTab={initialTab} />;
        case 'sales':
          return <ModernSalesDashboard initialTab={initialTab} isSubDeptManager={isSubDeptManager} />;
        case 'collections':
          return <ModernCollectionsDashboard initialTab={initialTab} />;
        default:
          return <ModernEmployeeDashboard initialTab={initialTab} />;
      }
    }

    // No department type found — sub-dept manager with unknown parent dept type
    // Show employee dashboard (it has a My Sub-Dept tab for sub-dept managers)
    return <ModernEmployeeDashboard initialTab={initialTab} />;
  }

  if (user?.role === 'superadmin') {
    return <ModernSuperadminDashboard initialTab={initialTab} />;
  }

  if (user?.role === 'ceo') {
    return <ModernCEODashboard initialTab={initialTab} />;
  }

  if (user?.role === 'org_admin') {
    return <ModernOrgAdminDashboard initialTab={initialTab} />;
  }

  if (user?.role === 'finance_admin') {
    return <ModernFinanceDashboard initialTab={initialTab} />;
  }

  if (['ops_admin', 'ops_sub_admin'].includes(user?.role || '')) {
    return <ModernOpsDashboard initialTab={initialTab} />;
  }

  if (user?.role === 'hr_admin') {
    return <ModernHRDashboard initialTab={initialTab} />;
  }

  if (user?.role === 'sales_admin') {
    return <ModernSalesDashboard initialTab={initialTab} />;
  }

  if (['collections_admin', 'collections'].includes(user?.role || '')) {
    return <ModernCollectionsDashboard initialTab={initialTab} />;
  }

  if (user?.role === 'center_admin') {
    return <ModernStudyCenterDashboard />;
  }

  if (user?.role === 'employee') {
    return <ModernEmployeeDashboard initialTab={initialTab} />;
  }

  if (user?.role === 'staff') {
    return <ModernEmployeeDashboard initialTab={initialTab} />;
  }

  // Fallback for other staff/admin roles
  return <ModernStaffPortal />;
}
