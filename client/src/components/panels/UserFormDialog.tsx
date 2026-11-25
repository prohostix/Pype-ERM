import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import api from '@/lib/api';
import { toast } from 'sonner';
import { useAuth } from '@/hooks/useAuth';

export interface StaffUser {
  phone?: string;
  id?: string;
  name: string;
  email: string;
  role: string;
  designation?: string;
  departmentId?: string;
  additionalDepartmentIds?: string[];
  subDepartmentId?: string;
  reportingTo?: string;
  department?: { name: string; id?: string };
  additionalDepartments?: { id: string; name: string }[];
  subDepartment?: { name: string };
  reportingToUser?: { name: string };
  status?: string;
  branchId?: string;
  branch?: { id: string; name: string };
  biometricId?: string;
  allowSystemPunchIn?: boolean;
  requireSelfiePunchIn?: boolean;
  allowAnywherePunchIn?: boolean;
  requiresAttendance?: boolean;
}

export interface Department {
  id?: string;
  name: string;
  type: string;
  managerId?: string;
  parentDepartmentId?: string;
}

export interface SubDepartment {
  id?: string;
  name: string;
  parentDeptId: string;
}

export interface DesignationOption {
  id: string;
  title: string;
  departmentId?: { id: string; name: string };
  maxHeadcount: number;
  filledBy: any[];
}

/** Everyone counted as staff: top-level admins and students are left out. */
export const isStaffUser = (u: { role: string }, isOrgAdmin: boolean) => {
  if (['ceo', 'org_admin', 'superadmin', 'student'].includes(u.role)) return false;
  return isOrgAdmin || u.role !== 'center_admin';
};

const idOf = (value: any): string =>
  (value && typeof value === 'object' ? value.id : value)?.toString() || '';

const initialForm = (user: StaffUser | null, departmentId: string) => ({
  name: user?.name || '',
  email: user?.email || '',
  phone: user?.phone || '',
  password: '',
  role: user?.role || 'employee',
  designation: user?.designation || '',
  departmentId: user ? idOf(user.departmentId) : departmentId,
  additionalDepartmentIds: ((user?.additionalDepartmentIds || user?.additionalDepartments || []) as any[]).map(idOf).filter(Boolean),
  subDepartmentId: idOf(user?.subDepartmentId),
  reportingTo: idOf(user?.reportingTo),
  branchId: idOf(user?.branchId) || 'none',
  biometricId: user?.biometricId || '',
  allowSystemPunchIn: user?.allowSystemPunchIn ?? true,
  requireSelfiePunchIn: user?.requireSelfiePunchIn ?? false,
  allowAnywherePunchIn: user?.allowAnywherePunchIn ?? false,
  requiresAttendance: user?.requiresAttendance ?? true,
});

interface UserFormDialogProps {
  open: boolean;
  onClose: () => void;
  onSaved: (name: string) => void;
  /** The account being edited; leave empty to create one. */
  editingUser?: StaffUser | null;
  /** Department pre-selected for a new account (hiring against a vacancy). */
  defaultDepartmentId?: string;
  title?: string;
  description?: string;
}

/** The one form that creates and edits staff accounts. */
export function UserFormDialog({ open, onClose, onSaved, editingUser = null, defaultDepartmentId = '', title, description }: UserFormDialogProps) {
  const { user: currentUser } = useAuth();
  const isOrgAdmin = ['org_admin', 'superadmin', 'ceo'].includes(currentUser?.role || '');
  const [formData, setFormData] = useState(() => initialForm(editingUser, defaultDepartmentId));
  const [users, setUsers] = useState<StaffUser[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [subDepartments, setSubDepartments] = useState<SubDepartment[]>([]);
  const [designations, setDesignations] = useState<DesignationOption[]>([]);
  const [branches, setBranches] = useState<any[]>([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    setFormData(initialForm(editingUser, defaultDepartmentId));
    const load = (url: string, set: (rows: any[]) => void) =>
      api.get(url)
        .then((res) => set(res.data.data || []))
        .catch((error) => console.error(`Failed to load ${url}:`, error));
    load('/users', (rows) => setUsers(rows.filter((u) => isStaffUser(u, isOrgAdmin))));
    load('/departments', setDepartments);
    load('/org/branches', setBranches);
    load('/org/designations', setDesignations);
  }, [open, editingUser, defaultDepartmentId, isOrgAdmin]);

  useEffect(() => {
    setSubDepartments([]);
    if (!open || !formData.departmentId || formData.departmentId === 'none') return;
    api.get(`/sub-departments?parentDeptId=${formData.departmentId}`)
      .then((res) => setSubDepartments(res.data.data || []))
      .catch((error) => console.error('Failed to fetch sub-departments:', error));
  }, [open, formData.departmentId]);

  const chosen = (value: string) => (value && value !== 'none' ? value : undefined);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const payload = {
      name: formData.name,
      email: formData.email,
      role: formData.role,
      departmentId: chosen(formData.departmentId),
      additionalDepartmentIds: formData.additionalDepartmentIds.filter((id) => id !== formData.departmentId),
      subDepartmentId: chosen(formData.subDepartmentId),
      reportingTo: chosen(formData.reportingTo),
      biometricId: formData.biometricId || undefined,
      allowSystemPunchIn: formData.allowSystemPunchIn,
      requireSelfiePunchIn: formData.requireSelfiePunchIn,
      allowAnywherePunchIn: formData.allowAnywherePunchIn,
      requiresAttendance: formData.requiresAttendance,
    };
    setSaving(true);
    try {
      if (editingUser) {
        await api.put(`/users/${editingUser.id}`, {
          ...payload,
          phone: formData.phone.trim(),
          designation: formData.designation || undefined,
          branchId: chosen(formData.branchId) || null,
        });
      } else {
        await api.post('/users', {
          ...payload,
          phone: formData.phone.trim() || undefined,
          password: formData.password,
          designation: formData.designation,
          branchId: chosen(formData.branchId),
        });
      }
      onSaved(formData.name);
      onClose();
    } catch (error: any) {
      console.error('Failed to save user:', error);
      toast.error(error.response?.data?.message || 'Failed to save user. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(next) => { if (!next) onClose(); }}>
      <DialogContent className="wizard-form rounded-[2rem] border-0 bg-white p-6 sm:p-8 max-h-[90vh] overflow-y-auto" style={{ fontFamily: "Urbanist, ui-sans-serif, system-ui, sans-serif" }}>
        <DialogHeader>
          <DialogTitle className="text-xl font-semibold tracking-tight">
            {title || (editingUser ? 'Edit Employee User' : 'Create Employee User')}
          </DialogTitle>
          {description && <p className="text-sm text-muted-foreground">{description}</p>}
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="name">Full Name</Label>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              required
            />
          </div>
          <div>
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              required
            />
          </div>
          <div>
            <Label htmlFor="phone">Phone</Label>
            <Input
              id="phone"
              type="tel"
              value={formData.phone}
              onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              placeholder="Optional"
            />
          </div>
          {!editingUser && (
            <div>
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password" autoComplete="new-password"
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                required
                minLength={6}
                placeholder="Minimum 6 characters"
              />
            </div>
          )}
          <div>
            <Label htmlFor="designation">Designation</Label>
            {designations.length > 0 ? (
              <Select
                value={formData.designation}
                onValueChange={(value) => {
                  // Auto-fill department if designation has one
                  const desig = designations.find(d => d.title === value);
                  setFormData({
                    ...formData,
                    designation: value,
                    departmentId: desig?.departmentId?.id || formData.departmentId,
                  });
                }}
              >
                <SelectTrigger className="truncate">
                  <SelectValue placeholder="Select from org chart..." className="truncate" />
                </SelectTrigger>
                <SelectContent>
                  {designations.map(d => {
                    const filled = d.filledBy?.length || 0;
                    const isCurrent = editingUser?.designation === d.title;
                    const vacant = d.maxHeadcount - filled;
                    const label = `${d.title}${d.departmentId ? ` — ${d.departmentId.name}` : ''}${vacant <= 0 && !isCurrent ? ' (Full)' : isCurrent ? ' (Current)' : ` (${vacant} open)`}`;
                    return (
                      <SelectItem key={d.id} value={d.title} disabled={vacant <= 0 && !isCurrent}>
                        <span className="block max-w-[340px] truncate">{label}</span>
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>
            ) : (
              <Input
                id="designation"
                value={formData.designation}
                onChange={(e) => setFormData({ ...formData, designation: e.target.value })}
                placeholder="e.g., Senior Manager, Team Lead"
              />
            )}
            {designations.length === 0 && (
              <p className="text-xs text-muted-foreground mt-1">
                Tip: Org Admin can define positions in the Hierarchy chart for structured assignment.
              </p>
            )}
          </div>
          <div>
            <Label htmlFor="role">Role</Label>
            <Select
              value={formData.role}
              onValueChange={(value) => setFormData({ ...formData, role: value })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="employee">Employee / Staff</SelectItem>
                <SelectItem value="hr_admin">HR Admin</SelectItem>
                <SelectItem value="hr_sub_admin">HR Sub Admin</SelectItem>
                <SelectItem value="finance_admin">Finance Admin</SelectItem>
                <SelectItem value="finance_sub_admin">Finance Sub Admin</SelectItem>
                <SelectItem value="ops_admin">Operations Admin</SelectItem>
                <SelectItem value="ops_sub_admin">Ops Sub Admin</SelectItem>
                <SelectItem value="sales_admin">Sales Admin</SelectItem>
                <SelectItem value="sales_sub_admin">Sales Sub Admin</SelectItem>
                <SelectItem value="collections_admin">Collections Admin</SelectItem>
                {isOrgAdmin && <SelectItem value="center_admin">Center Admin</SelectItem>}
                <SelectItem value="general_manager">General Manager</SelectItem>
                <SelectItem value="branch_manager">Branch Manager</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label htmlFor="biometricId">Biometric Device PIN</Label>
            <Input
              id="biometricId"
              placeholder="Optional (e.g. 101)"
              value={formData.biometricId}
              onChange={(e) => setFormData({ ...formData, biometricId: e.target.value })}
            />
          </div>
          <div>
            <Label htmlFor="department">Primary Department</Label>
            <Select
              value={formData.departmentId}
              onValueChange={(value) => {
                setFormData({ ...formData, departmentId: value, subDepartmentId: '' });
              }}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select department (optional)" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">No Department</SelectItem>
                {departments.map((dept) => (
                  <SelectItem key={dept.id || dept.id} value={(dept.id || dept.id)!}>
                    {dept.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label htmlFor="branch">Branch <span className="text-xs text-muted-foreground font-normal">(Main Office if empty)</span></Label>
            <Select
              value={formData.branchId}
              onValueChange={(value) => {
                setFormData({ ...formData, branchId: value });
              }}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select branch (optional)" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Main Office / No Branch</SelectItem>
                {branches.map((branch: any) => (
                  <SelectItem key={branch.id} value={branch.id}>
                    {branch.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          {/* Additional departments — for branch managers etc. */}
          <div>
            <Label>Additional Departments <span className="text-xs text-muted-foreground font-normal">(for branch managers with multi-dept access)</span></Label>
            <div className="mt-2 border rounded-lg p-3 space-y-2 max-h-36 overflow-y-auto bg-muted/30">
              {departments
                .filter(d => (d.id || d.id) !== formData.departmentId && (d.id || d.id) !== 'none')
                .map(dept => {
                  const deptId = (dept.id || dept.id)!;
                  const checked = formData.additionalDepartmentIds.includes(deptId);
                  return (
                    <label key={deptId} className="flex items-center gap-2 cursor-pointer text-sm">
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() => {
                          const next = checked
                            ? formData.additionalDepartmentIds.filter(id => id !== deptId)
                            : [...formData.additionalDepartmentIds, deptId];
                          setFormData({ ...formData, additionalDepartmentIds: next });
                        }}
                        className="rounded"
                      />
                      {dept.name}
                      <span className="text-xs text-muted-foreground">({dept.type})</span>
                    </label>
                  );
                })}
              {departments.length === 0 && <p className="text-xs text-muted-foreground">No departments available</p>}
            </div>
          </div>
          {formData.departmentId && subDepartments.length > 0 && (
            <div>
              <Label htmlFor="subDepartment">Sub-Department</Label>
              <Select
                value={formData.subDepartmentId}
                onValueChange={(value) => setFormData({ ...formData, subDepartmentId: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select sub-department (optional)" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">No Sub-Department</SelectItem>
                  {subDepartments.map((subDept) => (
                    <SelectItem key={subDept.id || subDept.id} value={(subDept.id || subDept.id)!}>
                      {subDept.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
          <div>
            <Label htmlFor="reportingTo">Reports To</Label>
            <Select
              value={formData.reportingTo}
              onValueChange={(value) => setFormData({ ...formData, reportingTo: value })}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select reporting manager (optional)" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">No Manager</SelectItem>
                {users.filter(u => u.status !== 'resigned' && (u.id || u.id) !== (editingUser?.id || editingUser?.id)).map((user) => (
                  <SelectItem key={user.id || user.id} value={(user.id || user.id)!}>
                    {user.name} {user.designation ? `(${user.designation})` : ''}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-center justify-between mt-4">
            <div className="space-y-0.5">
              <Label>Allow System Punch-In (Web/App)</Label>
              <p className="text-sm text-muted-foreground">If disabled, employee must use physical biometric device.</p>
            </div>
            <Switch
              checked={formData.allowSystemPunchIn}
              onCheckedChange={(checked) => setFormData({ ...formData, allowSystemPunchIn: checked })}
            />
          </div>
          <div className="flex items-center justify-between mt-4">
            <div className="space-y-0.5">
              <Label>Require Selfie for Punch-In</Label>
              <p className="text-sm text-muted-foreground">If enabled, employee must take a photo via webcam to punch in.</p>
            </div>
            <Switch
              checked={formData.requireSelfiePunchIn}
              onCheckedChange={(checked) => setFormData({ ...formData, requireSelfiePunchIn: checked })}
            />
          </div>
          <div className="flex items-center justify-between mt-4">
            <div className="space-y-0.5">
              <Label>Allow Anywhere Punch-In</Label>
              <p className="text-sm text-muted-foreground">If enabled, employee bypasses the geofencing (location) restriction.</p>
            </div>
            <Switch
              checked={formData.allowAnywherePunchIn}
              onCheckedChange={(checked) => setFormData({ ...formData, allowAnywherePunchIn: checked })}
            />
          </div>
          <div className="flex items-center justify-between p-4 bg-muted/30 rounded-xl border border-border/50">
            <div>
              <h4 className="text-sm font-semibold text-foreground">Requires Attendance</h4>
              <p className="text-xs text-muted-foreground mt-0.5">User must punch in/out to mark attendance</p>
            </div>
            <Switch
              checked={formData.requiresAttendance}
              onCheckedChange={(checked) => setFormData({ ...formData, requiresAttendance: checked })}
              className="data-[state=checked]:bg-primary"
            />
          </div>
          <div className="flex justify-end gap-2 mt-4">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={saving}>
              {editingUser ? 'Update' : 'Create'} User
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
