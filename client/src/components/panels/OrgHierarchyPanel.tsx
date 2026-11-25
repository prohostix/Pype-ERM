import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, RefreshCw, UserPlus, Trash2, Edit2, Users, ChevronDown, ChevronUp, Layers, Building2, MapPin } from 'lucide-react';
import api from '@/lib/api';

// ─── Types ────────────────────────────────────────────────────────────────────
interface Dept { id: string; name: string; type: string; }
interface SubDept { id: string; name: string; parentDeptId: string | { id: string; name: string }; }
interface Branch {
  id: string; name: string; code: string; address: string; city?: string;
  branchManagerId?: { id: string; name: string; role: string; userId?: string; designation?: string };
  salesDeptId?: { id: string; name: string; type: string };
  operationsDeptId?: { id: string; name: string; type: string };
  additionalDeptIds?: { id: string; name: string; type: string }[];
}
interface OrgUser { id: string; name: string; email: string; role: string; designation?: string; userId?: string; }
interface DesignationNode {
  id: string;
  title: string;
  level: number;
  maxHeadcount: number;
  departmentId?: Dept;
  subDepartmentId?: SubDept;
  branchId?: string | null;
  branch?: { id: string; name: string; code: string } | null;
  parentDesignationId?: { id: string; title: string };
  filledBy: OrgUser[];
  status: string;
  allowedDeptIds?: string[];
  allowedBranchIds?: string[];
}

const ROLE_COLORS: Record<string, string> = {
  org_admin: '#7c3aed', ceo: '#2563eb', ops_admin: '#ea580c',
  finance_admin: '#16a34a', finance_sub_admin: '#22c55e', hr_admin: '#db2777', hr_sub_admin: '#f472b6', sales_admin: '#ca8a04', sales_sub_admin: '#eab308',
  center_admin: '#0d9488', ops_sub_admin: '#f97316', employee: '#6b7280', student: '#94a3b8',
};

// ─── OrgNode ──────────────────────────────────────────────────────────────────
export function OrgNode({
  node, allNodes, allUsers, allDepts,
  onEdit, onDelete, onAssign, onUnassign, onAddChild, depth = 0, isReadOnly = false
}: {
  node: DesignationNode; allNodes: DesignationNode[]; allUsers: OrgUser[]; allDepts: Dept[];
  onEdit?: (n: DesignationNode) => void; onDelete?: (n: DesignationNode) => void;
  onAssign?: (n: DesignationNode) => void; onUnassign?: (n: DesignationNode, userId: string) => void;
  onAddChild?: (parent: DesignationNode) => void; depth?: number; isReadOnly?: boolean;
}) {
  const [expanded, setExpanded] = useState(true);
  const children = allNodes.filter(n => {
    const pid = typeof n.parentDesignationId === 'object' ? (n.parentDesignationId as any)?.id : n.parentDesignationId;
    return pid === node.id;
  });
  const filled = node.filledBy?.length || 0;
  const vacant = node.maxHeadcount - filled;
  const isFull = vacant <= 0;

  const boxColor = node.branchId
    ? '#256c1d'  // brand green for branch-scoped positions
    : node.departmentId
      ? ROLE_COLORS[node.departmentId.type] || '#6366f1'
      : '#6366f1';

  const subDeptName = node.subDepartmentId
    ? (typeof node.subDepartmentId === 'object' ? (node.subDepartmentId as any)?.name : '')
    : null;

  return (
    <div className="flex flex-col items-center">
      <div className="relative group" style={{ width: 230 }}>
        <div
          className="relative overflow-hidden rounded-2xl border bg-white shadow-[0_1px_2px_rgba(16,24,40,0.04),0_10px_28px_-14px_rgba(16,24,40,0.14)] text-left transition-all hover:-translate-y-0.5 hover:shadow-[0_16px_34px_-14px_rgba(16,24,40,0.22)]"
          style={{ borderColor: boxColor + '33' }}
        >
          {/* Header: icon, title and where it belongs */}
          <div className="flex items-start gap-3 px-4 pt-4 pb-3">
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
              style={{ background: boxColor + '1f', color: boxColor }}
            >
              {node.branch ? <Building2 className="h-5 w-5" /> : <Users className="h-5 w-5" />}
            </div>
            <div className="min-w-0 flex-1">
              <p className="font-semibold text-sm text-foreground leading-snug break-words">{node.title}</p>
              <div className="mt-1 flex flex-wrap gap-1">
                {node.branch ? (
                  <span className="text-[10px] font-medium px-2 py-0.5 rounded-full truncate max-w-full" style={{ background: boxColor + '1a', color: boxColor }}>
                    {node.branch.name} · {node.branch.code}
                  </span>
                ) : node.departmentId ? (
                  <span className="text-[10px] font-medium px-2 py-0.5 rounded-full truncate max-w-full" style={{ background: boxColor + '1a', color: boxColor }}>
                    {node.departmentId.name}
                  </span>
                ) : null}
                {subDeptName && (
                  <span className="text-[10px] font-medium px-2 py-0.5 rounded-full inline-flex items-center gap-1 bg-[#f1f3ef] text-slate-600">
                    <Layers className="h-2.5 w-2.5" />{subDeptName}
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Headcount */}
          <div className="px-4 pb-3">
            <div className="flex items-center justify-between text-[11px] mb-1.5">
              <span className="text-muted-foreground">Headcount</span>
              <span className={`font-semibold ${isFull ? 'text-[#1f6a17]' : 'text-amber-700'}`}>
                {filled}/{node.maxHeadcount} filled
              </span>
            </div>
            <div className="h-1.5 w-full rounded-full bg-[#f1f3ef] overflow-hidden">
              <div
                className="h-full rounded-full transition-all"
                style={{ width: `${Math.min(100, node.maxHeadcount ? (filled / node.maxHeadcount) * 100 : 0)}%`, background: isFull ? '#54b947' : '#f59e0b' }}
              />
            </div>
          </div>

          {/* People */}
          {(filled > 0 || vacant > 0) && (
            <div className="border-t border-slate-100 px-3 py-3 space-y-1.5 bg-[#fafbf9]">
              {node.filledBy.map(u => (
                <div key={u.id} className="flex items-center gap-2 rounded-full bg-white border border-slate-100 pl-1 pr-2.5 py-1">
                  <div className="w-6 h-6 rounded-full flex items-center justify-center text-white text-[10px] font-semibold shrink-0"
                    style={{ background: ROLE_COLORS[u.role] || '#6366f1' }}>
                    {u.name.charAt(0)}
                  </div>
                  <span className="text-xs text-foreground/80 truncate flex-1">{u.name}</span>
                  {!isReadOnly && (
                    <button onClick={() => onUnassign?.(node, u.id)}
                      className="text-slate-400 hover:text-rose-600 opacity-0 group-hover:opacity-100 transition-opacity">
                      <Trash2 className="h-3 w-3" />
                    </button>
                  )}
                </div>
              ))}

              {vacant > 0 && !isReadOnly && (
                <button onClick={() => onAssign?.(node)}
                  className="w-full flex items-center justify-center gap-1.5 text-xs border border-dashed border-slate-300 rounded-full py-1.5 text-slate-500 hover:text-[#256c1d] hover:border-[#54b947] hover:bg-[#eaf6e6] transition-colors">
                  <UserPlus className="h-3 w-3" />
                  {vacant} vacant {vacant === 1 ? 'slot' : 'slots'}
                </button>
              )}
              {vacant > 0 && isReadOnly && (
                <div className="w-full flex items-center justify-center gap-1.5 text-xs border border-dashed border-slate-300 rounded-full py-1.5 text-slate-500">
                  <UserPlus className="h-3 w-3" />
                  {vacant} vacant {vacant === 1 ? 'slot' : 'slots'}
                </div>
              )}
            </div>
          )}

          {!isReadOnly && (
            <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
              <button onClick={() => onEdit?.(node)}
                className="w-7 h-7 bg-white border border-slate-200 rounded-full shadow-sm flex items-center justify-center hover:bg-[#eaf6e6]" title="Edit">
                <Edit2 className="h-3 w-3 text-[#256c1d]" />
              </button>
              <button onClick={() => onAddChild?.(node)}
                className="w-7 h-7 bg-white border border-slate-200 rounded-full shadow-sm flex items-center justify-center hover:bg-[#eaf6e6]" title="Add position below">
                <Plus className="h-3 w-3 text-[#256c1d]" />
              </button>
              <button onClick={() => onDelete?.(node)}
                className="w-7 h-7 bg-white border border-slate-200 rounded-full shadow-sm flex items-center justify-center hover:bg-rose-50" title="Delete">
                <Trash2 className="h-3 w-3 text-rose-500" />
              </button>
            </div>
          )}
        </div>
      </div>

      {children.length > 0 && (
        <>
          <div className="w-px bg-slate-300" style={{ height: 24 }} />
          <button onClick={() => setExpanded(!expanded)} className="text-slate-400 hover:text-slate-600 mb-1">
            {expanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </button>
          {expanded && (
            <div className="flex flex-col items-center">
              {children.length > 1 ? (
                <>
                  {/* horizontal bar connecting siblings */}
                  <div className="relative flex items-start">
                    {/* top horizontal line */}
                    <div className="absolute top-0 left-1/2 -translate-x-1/2"
                      style={{
                        width: `calc(100% - 230px)`,
                        height: 1,
                        background: '#cbd5e1',
                        top: 0,
                      }}
                    />
                    {children.map(child => (
                      <div key={child.id} className="flex flex-col items-center" style={{ padding: '0 20px' }}>
                        <div className="w-px bg-slate-300" style={{ height: 20 }} />
                        <OrgNode node={child} allNodes={allNodes} allUsers={allUsers} allDepts={allDepts}
                          onEdit={onEdit} onDelete={onDelete} onAssign={onAssign}
                          onUnassign={onUnassign} onAddChild={onAddChild} depth={depth + 1} />
                      </div>
                    ))}
                  </div>
                </>
              ) : (
                <OrgNode node={children[0]} allNodes={allNodes} allUsers={allUsers} allDepts={allDepts}
                  onEdit={onEdit} onDelete={onDelete} onAssign={onAssign}
                  onUnassign={onUnassign} onAddChild={onAddChild} depth={depth + 1} />
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}

// ─── Branch section in the chart ─────────────────────────────────────────────
function DeptNode({ dept, color }: { dept: { id: string; name: string; type: string }; color: string }) {
  return (
    <div className="flex flex-col items-center">
      <div className="w-px bg-slate-300" style={{ height: 24 }} />
      <div className="rounded-2xl border bg-white shadow-sm px-4 py-3 text-center"
        style={{ borderColor: color + '55', minWidth: 160 }}>
        <span className="text-[10px] font-semibold uppercase tracking-wide px-2 py-0.5 rounded-full mb-1 inline-block"
          style={{ background: color + '22', color }}>
          {dept.type}
        </span>
        <p className="font-semibold text-sm text-foreground leading-tight">{dept.name}</p>
      </div>
    </div>
  );
}

function BranchSection({
  branch, allNodes, allUsers, allDepts,
  onEdit, onDelete, onAssign, onUnassign, onAddChild, onAddBranchPosition,
}: {
  branch: Branch; allNodes: DesignationNode[]; allUsers: OrgUser[]; allDepts: Dept[];
  onEdit: (n: DesignationNode) => void; onDelete: (n: DesignationNode) => void;
  onAssign: (n: DesignationNode) => void; onUnassign: (n: DesignationNode, userId: string) => void;
  onAddChild: (parent: DesignationNode) => void; onAddBranchPosition: (branch: Branch) => void;
}) {
  const [expanded, setExpanded] = useState(false);

  // Designation nodes scoped to this branch whose parent is outside the branch (or has no parent)
  const branchRoots = allNodes.filter(n => {
    let bId = typeof n.branchId === 'object' ? (n.branchId as any)?.id : n.branchId;
    if (!bId && n.allowedBranchIds && n.allowedBranchIds.length > 0) {
      bId = n.allowedBranchIds[0];
    }
    if (bId !== branch.id) return false;

    const pId = typeof n.parentDesignationId === 'object' ? (n.parentDesignationId as any)?.id : n.parentDesignationId;
    if (!pId) return true;

    const parentNode = allNodes.find(p => p.id === pId);
    let parentBId = parentNode ? (typeof parentNode.branchId === 'object' ? (parentNode.branchId as any)?.id : parentNode.branchId) : null;
    if (parentNode && !parentBId && parentNode.allowedBranchIds && parentNode.allowedBranchIds.length > 0) {
      parentBId = parentNode.allowedBranchIds[0];
    }
    
    return parentBId !== branch.id;
  });

  // Branch manager controls Sales and Operations only — Finance and HR are org-wide
  const BRANCH_CONTROLLED_TYPES = new Set(['sales', 'operations']);
  const controlledDepts: Array<{ id: string; name: string; type: string }> = [];
  if (branch.salesDeptId) controlledDepts.push({ ...branch.salesDeptId, type: 'sales' });
  if (branch.operationsDeptId) controlledDepts.push({ ...branch.operationsDeptId, type: 'operations' });
  if (branch.additionalDeptIds) {
    branch.additionalDeptIds
      .filter(d => d && BRANCH_CONTROLLED_TYPES.has(d.type))
      .forEach(d => {
        if (!controlledDepts.find(x => x.id === d.id)) controlledDepts.push(d);
      });
  }

  const DEPT_COLORS: Record<string, string> = {
    sales: '#ca8a04', operations: '#ea580c', finance: '#16a34a',
    hr: '#db2777', ceo: '#2563eb', custom: '#6366f1',
  };

  const mgr = branch.branchManagerId;

  return (
    <div className="rounded-3xl p-6 bg-[#eaf6e6]">
      {/* Branch header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-2xl bg-[#eaf6e6] flex items-center justify-center text-[#256c1d]">
            <Building2 className="h-5 w-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-semibold text-lg text-foreground">{branch.name}</span>
              <span className="text-xs font-mono bg-white text-slate-600 px-2.5 py-0.5 rounded-full">
                {branch.code}
              </span>
            </div>
            <div className="flex items-center gap-1 text-xs text-muted-foreground mt-0.5">
              <MapPin className="h-3 w-3" />{branch.address}{branch.city ? `, ${branch.city}` : ''}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button size="sm" variant="outline" className="text-xs h-9 px-4 rounded-full bg-white border-slate-200 hover:bg-[#eaf6e6]"
            onClick={() => onAddBranchPosition(branch)}>
            <Plus className="h-3 w-3 mr-1" /> Add Position
          </Button>
          <button onClick={() => setExpanded(!expanded)} className="h-9 w-9 rounded-full bg-white border border-slate-200 flex items-center justify-center text-slate-500 hover:text-foreground">
            {expanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </button>
        </div>
      </div>

      {expanded && (
        <div className="overflow-x-auto">
          <div className="flex flex-col items-center min-w-max pb-4">

            {/* ── Branch Manager node ── */}
            {mgr ? (
              <div className="relative group" style={{ minWidth: 200 }}>
                <div className="rounded-2xl border bg-white shadow-[0_10px_28px_-14px_rgba(16,24,40,0.14)] px-4 py-4 text-center"
                  style={{ borderColor: '#256c1d40', minWidth: 200 }}>
                  <span className="text-[10px] font-semibold uppercase tracking-wide px-2 py-0.5 rounded-full mb-1 inline-flex items-center gap-1"
                    style={{ background: '#54b94720', color: '#256c1d' }}>
                    <Building2 className="h-2.5 w-2.5" /> Branch Manager
                  </span>
                  <p className="font-semibold text-sm text-foreground">{mgr.name}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {mgr.designation || (mgr.role || '').replace(/_/g, ' ')}
                  </p>
                  <div className="mt-2 flex items-center justify-center gap-1">
                    <span className="text-xs bg-[#e3f7dd] text-[#1f6a17] px-2.5 py-0.5 rounded-full font-medium">
                      Controls {controlledDepts.length} dept{controlledDepts.length !== 1 ? 's' : ''}
                    </span>
                  </div>
                </div>
              </div>
            ) : (
              <div className="rounded-2xl border border-dashed border-slate-300 bg-white/60 px-4 py-3 text-center text-sm text-muted-foreground"
                style={{ minWidth: 200 }}>
                <Building2 className="h-5 w-5 mx-auto mb-1 text-slate-400" />
                No branch manager assigned
              </div>
            )}

            {/* Connector down to dept row */}
            {controlledDepts.length > 0 && (
              <>
                <div className="w-px bg-slate-300" style={{ height: 20 }} />
                {/* Horizontal bar spanning all dept nodes */}
                <div className="flex items-start justify-center">
                  {controlledDepts.map((dept) => (
                    <div key={dept.id} className="flex flex-col items-center" style={{ padding: '0 20px' }}>
                      {controlledDepts.length > 1 && (
                        <div className="w-px bg-slate-300" style={{ height: 20 }} />
                      )}
                      <DeptNode dept={dept} color={DEPT_COLORS[dept.type] || '#6366f1'} />
                    </div>
                  ))}
                </div>
              </>
            )}

            {/* Designation nodes for this branch (below the dept row) */}
            {branchRoots.length > 0 && (
              <>
                <div className="w-px bg-slate-300" style={{ height: 24 }} />
                <div className="flex gap-10 justify-center pt-2">
                  {branchRoots.map(root => (
                    <OrgNode key={root.id} node={root} allNodes={allNodes} allUsers={allUsers} allDepts={allDepts}
                      onEdit={onEdit} onDelete={onDelete} onAssign={onAssign}
                      onUnassign={onUnassign} onAddChild={onAddChild} />
                  ))}
                </div>
              </>
            )}

            {branchRoots.length === 0 && controlledDepts.length === 0 && (
              <div className="text-center py-8 text-sm text-muted-foreground border border-dashed border-slate-300 rounded-2xl mt-4 w-full bg-white/60">
                No positions defined for this branch yet.
                <br />
                <button onClick={() => onAddBranchPosition(branch)}
                  className="text-[#256c1d] hover:underline text-xs mt-1 inline-flex items-center gap-1">
                  <Plus className="h-3 w-3" /> Add first position
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Main Panel ───────────────────────────────────────────────────────────────
export function OrgHierarchyPanel() {
  const [nodes, setNodes] = useState<DesignationNode[]>([]);
  const [allUsers, setAllUsers] = useState<OrgUser[]>([]);
  const [allDepts, setAllDepts] = useState<Dept[]>([]);
  const [allSubDepts, setAllSubDepts] = useState<SubDept[]>([]);
  const [allBranches, setAllBranches] = useState<Branch[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // ── Create / Edit designation dialog ──
  const [designDialog, setDesignDialog] = useState(false);
  const [editingNode, setEditingNode] = useState<DesignationNode | null>(null);
  const [designForm, setDesignForm] = useState({
    title: '', departmentId: '', subDepartmentId: '', branchId: '',
    level: '1', maxHeadcount: '1', parentDesignationId: '',
    allowedDeptIds: [] as string[],
    allowedBranchIds: [] as string[],
  });

  // ── Create sub-department dialog ──
  const [subDeptDialog, setSubDeptDialog] = useState(false);
  const [subDeptForm, setSubDeptForm] = useState({ name: '', parentDeptId: '' });
  const [subDeptSaving, setSubDeptSaving] = useState(false);

  // ── Assign user dialog ──
  const [assignDialog, setAssignDialog] = useState(false);
  const [assignTarget, setAssignTarget] = useState<DesignationNode | null>(null);
  const [assignUserId, setAssignUserId] = useState('');

  const fetchAll = async () => {
    setLoading(true);
    try {
      const [nodesRes, usersRes, deptsRes, subDeptsRes, branchRes] = await Promise.all([
        api.get('/org/designations'),
        api.get('/users'),
        api.get('/departments'),
        api.get('/sub-departments'),
        api.get('/org/branches'),
      ]);
      setNodes(nodesRes.data.data || []);
      setAllUsers((usersRes.data.data || []).filter((u: any) => u.status !== 'resigned'));
      setAllDepts(deptsRes.data.data || []);
      setAllSubDepts(subDeptsRes.data.data || []);
      setAllBranches(branchRes.data.data || []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchAll(); }, []);

  const filteredSubDepts = designForm.departmentId
    ? allSubDepts.filter(sd => {
        if (!sd.parentDeptId) return false;
        const parentId = typeof sd.parentDeptId === 'object' ? sd.parentDeptId.id : sd.parentDeptId;
        return parentId === designForm.departmentId;
      })
    : allSubDepts;

  const openCreate = (parent?: DesignationNode) => {
    setEditingNode(null);
    setDesignForm({
      title: '',
      departmentId: parent?.departmentId?.id || '',
      subDepartmentId: '',
      branchId: parent?.branch?.id || parent?.branchId || '',
      level: parent ? String((parent.level || 1) + 1) : '1',
      maxHeadcount: '1',
      parentDesignationId: parent?.id || '',
      allowedDeptIds: parent?.departmentId?.id ? [parent.departmentId.id] : [],
      allowedBranchIds: parent?.branch?.id ? [parent.branch.id] : (parent?.branchId ? [parent.branchId] : []),
    });
    setDesignDialog(true);
  };

  // Open create dialog pre-scoped to a branch
  const openCreateForBranch = (branch: Branch) => {
    setEditingNode(null);
    setDesignForm({
      title: 'Branch Manager',
      departmentId: '',
      subDepartmentId: '',
      branchId: branch.id,
      level: '2',
      maxHeadcount: '1',
      parentDesignationId: '',
      allowedDeptIds: [],
      allowedBranchIds: [branch.id],
    });
    setDesignDialog(true);
  };

  const openEdit = (node: DesignationNode) => {
    setEditingNode(node);
    setDesignForm({
      title: node.title,
      departmentId: node.departmentId?.id || '',
      subDepartmentId: node.subDepartmentId?.id || '',
      branchId: node.branch?.id || node.branchId || '',
      level: String(node.level),
      maxHeadcount: String(node.maxHeadcount),
      parentDesignationId: (typeof node.parentDesignationId === 'object' ? (node.parentDesignationId as any)?.id : node.parentDesignationId) || '',
      allowedDeptIds: node.allowedDeptIds || [],
      allowedBranchIds: node.allowedBranchIds || [],
    });
    setDesignDialog(true);
  };

  const handleSaveDesignation = async () => {
    if (!designForm.title) return;
    setSaving(true);
    try {
      const payload = {
        title: designForm.title,
        departmentId: designForm.departmentId || null,
        subDepartmentId: designForm.subDepartmentId || null,
        branchId: designForm.branchId || null,
        level: Number(designForm.level),
        maxHeadcount: Number(designForm.maxHeadcount),
        parentDesignationId: designForm.parentDesignationId || null,
        allowedDeptIds: designForm.allowedDeptIds,
        allowedBranchIds: designForm.allowedBranchIds,
      };
      if (editingNode) {
        await api.patch(`/org/designations/${editingNode.id}`, payload);
      } else {
        await api.post('/org/designations', payload);
      }
      setDesignDialog(false);
      fetchAll();
    } catch (e) {
      console.error(e);
    } finally {
      setSaving(false);
    }
  };

  const handleCreateSubDept = async () => {
    if (!subDeptForm.name || !subDeptForm.parentDeptId) return;
    setSubDeptSaving(true);
    try {
      await api.post('/sub-departments', subDeptForm);
      setSubDeptDialog(false);
      setSubDeptForm({ name: '', parentDeptId: '' });
      const res = await api.get('/sub-departments');
      setAllSubDepts(res.data.data || []);
    } catch (e) {
      console.error(e);
    } finally {
      setSubDeptSaving(false);
    }
  };

  const handleDelete = async (node: DesignationNode) => {
    if (!confirm(`Delete "${node.title}"? This cannot be undone.`)) return;
    try {
      await api.delete(`/org/designations/${node.id}`);
      fetchAll();
    } catch (e) { console.error(e); }
  };

  const openAssign = (node: DesignationNode) => {
    setAssignTarget(node);
    setAssignUserId('');
    setAssignDialog(true);
  };

  const handleAssign = async () => {
    if (!assignTarget || !assignUserId) return;
    setSaving(true);
    try {
      await api.patch(`/org/designations/${assignTarget.id}/assign`, { userId: assignUserId });
      setAssignDialog(false);
      fetchAll();
    } catch (e) { console.error(e); }
    finally { setSaving(false); }
  };

  const handleUnassign = async (node: DesignationNode, userId: string) => {
    try {
      await api.patch(`/org/designations/${node.id}/unassign`, { userId });
      fetchAll();
    } catch (e) { console.error(e); }
  };

  // Global (non-branch) root nodes
  const globalRoots = nodes.filter(n => {
    const hasParent = typeof n.parentDesignationId === 'object' ? !!(n.parentDesignationId as any)?.id : !!n.parentDesignationId;
    let hasBranch = typeof n.branchId === 'object' ? !!(n.branchId as any)?.id : !!n.branchId;
    if (!hasBranch && n.allowedBranchIds && n.allowedBranchIds.length > 0) {
      hasBranch = true;
    }
    return !hasParent && !hasBranch;
  });
  const assignedUserIds = new Set(nodes.flatMap(n => (n.filledBy || []).map(u => u.id)));
  const unassignedUsers = allUsers.filter(u => !assignedUserIds.has(u.id));

  if (loading) {
    return <div className="flex items-center justify-center h-64 text-muted-foreground">Loading org chart...</div>;
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 lg:gap-6">
        <div>
          <h2 className="text-2xl sm:text-3xl font-semibold tracking-tight text-foreground">Organisation Chart</h2>
          <p className="text-sm text-muted-foreground mt-1.5 max-w-2xl">
            Build the designation hierarchy. Branches have their own position trees.
          </p>
        </div>
        <div className="grid grid-cols-2 sm:flex sm:flex-row gap-2.5 shrink-0">
          <Button variant="outline" onClick={() => setSubDeptDialog(true)} className="h-11 px-5 rounded-full bg-white border-slate-200 text-sm font-medium gap-2 shadow-sm hover:bg-slate-50">
            <Layers className="h-4 w-4" /> Sub-Dept
          </Button>
          <Button variant="outline" onClick={fetchAll} className="h-11 px-5 rounded-full bg-white border-slate-200 text-sm font-medium gap-2 shadow-sm hover:bg-slate-50">
            <RefreshCw className="h-4 w-4" /> Refresh
          </Button>
          <Button onClick={() => openCreate()} className="col-span-2 sm:col-span-1 h-11 px-5 rounded-full text-sm font-semibold gap-2 bg-[#8ae47e] hover:bg-[#7bd96f] text-[#0b1d14] shadow-sm">
            <Plus className="h-4 w-4" /> Add Position
          </Button>
        </div>
      </div>

      {/* Legend */}
      <div className="flex flex-wrap gap-2 text-xs text-slate-600">
        {[
          { dot: 'bg-[#54b947]', label: 'Branch position' },
          { dot: 'bg-amber-400', label: 'Vacant slots' },
          { dot: 'bg-[#256c1d]', label: 'Fully filled' },
        ].map(l => (
          <span key={l.label} className="inline-flex items-center gap-2 rounded-full bg-white border border-slate-200 px-3 py-1.5 shadow-sm">
            <span className={`w-2 h-2 rounded-full ${l.dot}`} /> {l.label}
          </span>
        ))}
        <span className="inline-flex items-center gap-2 rounded-full bg-white border border-slate-200 px-3 py-1.5 shadow-sm">
          <Edit2 className="h-3 w-3" /> Hover a box to edit, add a child or delete
        </span>
      </div>

      {/* Global org chart */}
      {globalRoots.length > 0 && (
        <div className="overflow-auto rounded-3xl bg-[#eaf6e6] p-5 sm:p-8" style={{ backgroundImage: 'radial-gradient(rgba(37,108,29,.18) 1px, transparent 1px)', backgroundSize: '22px 22px' }}>
          <p className="text-xs font-semibold text-slate-500 mb-6 text-center">
            Organisation · Head Office
          </p>
          <div className="inline-flex gap-12 justify-center min-w-full pb-4">
            {globalRoots.map(root => (
              <OrgNode key={root.id} node={root} allNodes={nodes} allUsers={allUsers} allDepts={allDepts}
                onEdit={openEdit} onDelete={handleDelete} onAssign={openAssign}
                onUnassign={handleUnassign} onAddChild={openCreate} />
            ))}
          </div>
        </div>
      )}

      {globalRoots.length === 0 && allBranches.length === 0 && (
        <div className="border border-dashed border-slate-300 rounded-3xl p-16 text-center bg-white">
          <Users className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
          <p className="text-muted-foreground mb-4">No positions defined yet.</p>
          <p className="text-sm text-muted-foreground mb-6">
            Start by adding the top-level position (e.g. "CEO"), then add positions below it.
            Create branches in the Branches tab to add branch-specific hierarchies.
          </p>
          <Button onClick={() => openCreate()}>
            <Plus className="h-4 w-4 mr-2" /> Add First Position
          </Button>
        </div>
      )}

      {/* Branch sections */}
      {allBranches.length > 0 && (
        <div className="space-y-4">
          <p className="text-lg font-semibold text-foreground">
            Branch Hierarchies <span className="text-sm font-medium text-muted-foreground">({allBranches.length})</span>
          </p>
          {allBranches.map(branch => (
            <BranchSection
              key={branch.id}
              branch={branch}
              allNodes={nodes}
              allUsers={allUsers}
              allDepts={allDepts}
              onEdit={openEdit}
              onDelete={handleDelete}
              onAssign={openAssign}
              onUnassign={handleUnassign}
              onAddChild={openCreate}
              onAddBranchPosition={openCreateForBranch}
            />
          ))}
        </div>
      )}

      {/* Unassigned users */}
      {unassignedUsers.length > 0 && (
        <div className="rounded-3xl bg-white shadow-[0_1px_2px_rgba(16,24,40,0.04),0_10px_28px_-14px_rgba(16,24,40,0.10)] p-6 sm:p-7">
          <div className="flex items-start justify-between gap-4 mb-5">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center shrink-0">
                <Users className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-base sm:text-lg font-semibold text-foreground">
                  {unassignedUsers.length} {unassignedUsers.length === 1 ? 'person' : 'people'} not yet placed in the chart
                </h3>
                <p className="text-sm text-muted-foreground mt-0.5">
                  Assign them to a position to add them to the hierarchy.
                </p>
              </div>
            </div>
            <span className="shrink-0 text-xs font-semibold px-3 py-1 rounded-full bg-amber-50 text-amber-700">
              {unassignedUsers.length} unassigned
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-2.5 max-h-72 overflow-y-auto pr-1">
            {unassignedUsers.map(u => (
              <div key={u.id} className="flex items-center gap-3 rounded-2xl bg-[#f4f6f3] px-3.5 py-3">
                <span className="w-9 h-9 rounded-full inline-flex items-center justify-center text-white text-sm font-semibold shrink-0"
                  style={{ background: ROLE_COLORS[u.role] || '#6366f1' }}>
                  {u.name.charAt(0).toUpperCase()}
                </span>
                <div className="min-w-0">
                  <p className="text-sm font-medium text-foreground truncate" title={u.name}>{u.name}</p>
                  <p className="text-xs text-muted-foreground truncate capitalize">{(u.designation || u.role || '').replace(/_/g, ' ')}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Create / Edit Designation Dialog ── */}
      <Dialog open={designDialog} onOpenChange={setDesignDialog}>
        <DialogContent className="w-[95vw] sm:max-w-2xl p-0 gap-0 overflow-hidden rounded-[2rem] border-0 bg-white max-h-[92vh] flex flex-col">
          {/* Header */}
          <div className="flex items-start gap-4 px-6 sm:px-8 pt-7 pb-5 shrink-0">
            <div className="w-12 h-12 rounded-2xl bg-[#eaf6e6] text-[#256c1d] flex items-center justify-center shrink-0">
              {editingNode ? <Edit2 className="h-5 w-5" /> : <Plus className="h-5 w-5" />}
            </div>
            <DialogHeader className="space-y-1 text-left">
              <DialogTitle className="text-2xl font-semibold tracking-tight text-foreground text-left">
                {editingNode ? 'Edit Position' : 'Add Position'}
              </DialogTitle>
              <p className="text-sm text-muted-foreground">
                {editingNode ? 'Update this position and where it sits in the hierarchy.' : 'Define a position and where it sits in the hierarchy.'}
              </p>
            </DialogHeader>
          </div>

          <div className="flex-1 overflow-y-auto px-6 sm:px-8 pb-2 space-y-7">
            {/* Basics */}
            <section className="space-y-4">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Basics</h3>
              <div className="space-y-1.5">
                <Label className="text-sm font-semibold">Position title <span className="text-rose-500">*</span></Label>
                <Input className="h-11 rounded-xl bg-[#f4f6f3] border-transparent focus:bg-white focus:border-[#54b947] focus:ring-4 focus:ring-[#54b947]/20 text-sm px-4" placeholder="e.g. CEO, Branch Manager, Sales Executive"
                  value={designForm.title}
                  onChange={e => setDesignForm(p => ({ ...p, title: e.target.value }))} />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label className="text-sm font-semibold">Level <span className="font-normal text-muted-foreground">(1 = top)</span></Label>
                  <Input className="h-11 rounded-xl bg-[#f4f6f3] border-transparent focus:bg-white focus:border-[#54b947] focus:ring-4 focus:ring-[#54b947]/20 text-sm px-4" type="number" min={1} value={designForm.level}
                    onChange={e => setDesignForm(p => ({ ...p, level: e.target.value }))} />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-sm font-semibold">Max headcount</Label>
                  <Input className="h-11 rounded-xl bg-[#f4f6f3] border-transparent focus:bg-white focus:border-[#54b947] focus:ring-4 focus:ring-[#54b947]/20 text-sm px-4" type="number" min={1} value={designForm.maxHeadcount}
                    onChange={e => setDesignForm(p => ({ ...p, maxHeadcount: e.target.value }))} />
                </div>
              </div>
            </section>

            {/* Placement */}
            <section className="space-y-4">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Placement</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label className="text-sm font-semibold">Branch <span className="font-normal text-muted-foreground">(empty = head office)</span></Label>
                  <Select value={designForm.branchId || '__none__'}
                    onValueChange={v => setDesignForm(p => ({ ...p, branchId: v === '__none__' ? '' : v }))}>
                    <SelectTrigger className="h-11 rounded-xl bg-[#f4f6f3] border-transparent focus:bg-white focus:border-[#54b947] focus:ring-4 focus:ring-[#54b947]/20 text-sm px-4"><SelectValue placeholder="Head office / global" /></SelectTrigger>
                    <SelectContent className="rounded-2xl">
                      <SelectItem value="__none__">Head office / global</SelectItem>
                      {allBranches.map(b => (
                        <SelectItem key={b.id} value={b.id}>
                          {b.name} [{b.code}] — {b.address}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-sm font-semibold">Reports to</Label>
                  <Select value={designForm.parentDesignationId || '__none__'}
                    onValueChange={v => setDesignForm(p => ({ ...p, parentDesignationId: v === '__none__' ? '' : v }))}>
                    <SelectTrigger className="h-11 rounded-xl bg-[#f4f6f3] border-transparent focus:bg-white focus:border-[#54b947] focus:ring-4 focus:ring-[#54b947]/20 text-sm px-4"><SelectValue placeholder="None (top-level)" /></SelectTrigger>
                    <SelectContent className="rounded-2xl">
                      <SelectItem value="__none__">None (top-level)</SelectItem>
                      {nodes
                        .filter(n => n.id !== editingNode?.id)
                        .map(n => (
                          <SelectItem key={n.id} value={n.id}>
                            {n.title}{n.branch ? ` [${n.branch.code}]` : ''}
                          </SelectItem>
                        ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-sm font-semibold">Department</Label>
                  <Select value={designForm.departmentId || '__none__'}
                    onValueChange={v => setDesignForm(p => ({
                      ...p, departmentId: v === '__none__' ? '' : v, subDepartmentId: '',
                    }))}>
                    <SelectTrigger className="h-11 rounded-xl bg-[#f4f6f3] border-transparent focus:bg-white focus:border-[#54b947] focus:ring-4 focus:ring-[#54b947]/20 text-sm px-4"><SelectValue placeholder="Select department..." /></SelectTrigger>
                    <SelectContent className="rounded-2xl">
                      <SelectItem value="__none__">None</SelectItem>
                      {allDepts.map(d => <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>

                {designForm.departmentId && (
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <Label className="text-sm font-semibold">Sub-department</Label>
                      <button type="button"
                        onClick={() => { setSubDeptForm({ name: '', parentDeptId: designForm.departmentId }); setSubDeptDialog(true); }}
                        className="text-xs font-semibold text-[#256c1d] hover:underline flex items-center gap-1">
                        <Plus className="h-3 w-3" /> New
                      </button>
                    </div>
                    <Select value={designForm.subDepartmentId || '__none__'}
                      onValueChange={v => setDesignForm(p => ({ ...p, subDepartmentId: v === '__none__' ? '' : v }))}>
                      <SelectTrigger className="h-11 rounded-xl bg-[#f4f6f3] border-transparent focus:bg-white focus:border-[#54b947] focus:ring-4 focus:ring-[#54b947]/20 text-sm px-4"><SelectValue placeholder="Select sub-department..." /></SelectTrigger>
                      <SelectContent className="rounded-2xl">
                        <SelectItem value="__none__">None</SelectItem>
                        {filteredSubDepts.map(sd => (
                          <SelectItem key={sd.id} value={sd.id}>{sd.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {filteredSubDepts.length === 0 && (
                      <p className="text-xs text-muted-foreground">No sub-departments for this department yet.</p>
                    )}
                  </div>
                )}
              </div>
            </section>

            {/* Access */}
            <section className="space-y-4 pb-2">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Access</h3>

              <div className="space-y-2">
                <Label className="text-sm font-semibold">Accessible branches <span className="font-normal text-muted-foreground">(select any)</span></Label>
                <div className="flex flex-wrap gap-2 max-h-28 overflow-y-auto">
                  {allBranches.length === 0 && <p className="text-xs text-muted-foreground">No branches yet.</p>}
                  {allBranches.map(b => {
                    const checked = designForm.allowedBranchIds.includes(b.id);
                    return (
                      <button
                        key={b.id}
                        type="button"
                        aria-pressed={checked}
                        onClick={() => {
                          const updated = checked
                            ? designForm.allowedBranchIds.filter(id => id !== b.id)
                            : [...designForm.allowedBranchIds, b.id];
                          setDesignForm(p => ({ ...p, allowedBranchIds: updated }));
                        }}
                        className={`px-3.5 py-1.5 rounded-full text-xs font-medium border transition-colors ${checked ? 'bg-[#8ae47e] border-[#8ae47e] text-[#0b1d14]' : 'bg-white border-slate-200 text-slate-600 hover:bg-[#f4f6f3]'}`}
                      >
                        {b.name} [{b.code}]
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="space-y-2">
                <Label className="text-sm font-semibold">Accessible departments <span className="font-normal text-muted-foreground">(select any)</span></Label>
                <div className="flex flex-wrap gap-2 max-h-28 overflow-y-auto">
                  {allDepts.length === 0 && <p className="text-xs text-muted-foreground">No departments yet.</p>}
                  {allDepts.map(d => {
                    const checked = designForm.allowedDeptIds.includes(d.id);
                    return (
                      <button
                        key={d.id}
                        type="button"
                        aria-pressed={checked}
                        onClick={() => {
                          const updated = checked
                            ? designForm.allowedDeptIds.filter(id => id !== d.id)
                            : [...designForm.allowedDeptIds, d.id];
                          setDesignForm(p => ({ ...p, allowedDeptIds: updated }));
                        }}
                        className={`px-3.5 py-1.5 rounded-full text-xs font-medium border transition-colors ${checked ? 'bg-[#8ae47e] border-[#8ae47e] text-[#0b1d14]' : 'bg-white border-slate-200 text-slate-600 hover:bg-[#f4f6f3]'}`}
                      >
                        {d.name}
                      </button>
                    );
                  })}
                </div>
              </div>
            </section>
          </div>

          <DialogFooter className="px-6 sm:px-8 py-5 border-t border-slate-100 gap-2 sm:gap-2 shrink-0 flex-col-reverse sm:flex-row">
            <Button variant="ghost" onClick={() => setDesignDialog(false)} className="h-11 rounded-full px-6 text-slate-600 hover:text-slate-900 font-semibold">Cancel</Button>
            <Button onClick={handleSaveDesignation} disabled={saving || !designForm.title} className="h-11 rounded-full px-8 bg-slate-900 hover:bg-slate-800 text-white font-semibold">
              {saving ? 'Saving...' : editingNode ? 'Save Changes' : 'Create Position'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Create Sub-Department Dialog ── */}
      <Dialog open={subDeptDialog} onOpenChange={setSubDeptDialog}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>Add Sub-Department</DialogTitle></DialogHeader>
          <div className="space-y-3 py-2">
            <div className="space-y-1">
              <Label>Name *</Label>
              <Input placeholder="e.g. Admissions, Accounts Payable"
                value={subDeptForm.name}
                onChange={e => setSubDeptForm(p => ({ ...p, name: e.target.value }))} />
            </div>
            <div className="space-y-1">
              <Label>Parent Department *</Label>
              <Select value={subDeptForm.parentDeptId || '__none__'}
                onValueChange={v => setSubDeptForm(p => ({ ...p, parentDeptId: v === '__none__' ? '' : v }))}>
                <SelectTrigger><SelectValue placeholder="Select department..." /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">Select...</SelectItem>
                  {allDepts.map(d => <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setSubDeptDialog(false)}>Cancel</Button>
            <Button onClick={handleCreateSubDept}
              disabled={subDeptSaving || !subDeptForm.name || !subDeptForm.parentDeptId}>
              {subDeptSaving ? 'Creating...' : 'Create Sub-Department'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Assign User Dialog ── */}
      <Dialog open={assignDialog} onOpenChange={setAssignDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Assign to "{assignTarget?.title}"
              {assignTarget?.branch && (
                <span className="text-sm font-normal text-[#256c1d] ml-2">
                  [{assignTarget.branch.code}]
                </span>
              )}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <p className="text-sm text-muted-foreground">
              {(assignTarget?.maxHeadcount || 1) - (assignTarget?.filledBy?.length || 0)} slot(s) available
            </p>
            <div className="space-y-1">
              <Label>Select Person</Label>
              <Select value={assignUserId} onValueChange={setAssignUserId}>
                <SelectTrigger><SelectValue placeholder="Choose a person..." /></SelectTrigger>
                <SelectContent>
                  {allUsers
                    .filter(u => !assignTarget?.filledBy?.find(f => f.id === u.id))
                    .map(u => (
                      <SelectItem key={u.id} value={u.id}>
                        {u.name} — {u.designation || (u.role || '').replace(/_/g, ' ')} {u.userId ? `(${u.userId})` : ''}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAssignDialog(false)}>Cancel</Button>
            <Button onClick={handleAssign} disabled={saving || !assignUserId}>
              {saving ? 'Assigning...' : 'Assign'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
