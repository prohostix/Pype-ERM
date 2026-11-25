import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { Check, ChevronsUpDown, Search, Plus, Edit2, Trash2, MonitorSmartphone, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import api from '@/lib/api';
import { confirmDialog } from '@/lib/confirm';
import { useAuth } from '@/hooks/useAuth';
import { mayOn } from '@/lib/access';

interface User {
  id: string;
  name: string;
  email: string;
  employeeProfile?: {
    employeeId: string;
  };
}

interface Asset {
  id: string;
  type: 'COMPUTER' | 'PHONE' | 'OTHER';
  brand: string | null;
  model: string | null;
  serialNumber: string | null;
  imeiNumber: string | null;
  networkProvider: string | null;
  phoneNumber: string | null;
  userId: string;
  user?: User;
  status: 'ASSIGNED' | 'RETURNED' | 'LOST' | 'DAMAGED';
  notes: string | null;
  assignedDate: string;
  returnedDate: string | null;
}

export function AssetManagementPanel() {
  const { user } = useAuth();
  const mayCreate = mayOn(user, 'assets', 'create', true);
  const mayDelete = mayOn(user, 'assets', 'delete', true);
  const mayEdit = mayOn(user, 'assets', 'edit', true);
  const [assets, setAssets] = useState<Asset[]>([]);
  const [employees, setEmployees] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<string | null>(null);
  const [openCombobox, setOpenCombobox] = useState(false);

  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingAsset, setEditingAsset] = useState<Asset | null>(null);
  
  // Array to support multiple asset allocation
  const [formsData, setFormsData] = useState<Partial<Asset>[]>([
    { type: 'COMPUTER', status: 'ASSIGNED', assignedDate: new Date().toISOString().split('T')[0] }
  ]);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [assetsRes, usersRes] = await Promise.all([
        api.get('/assets'),
        api.get('/users') // every staff account (the server leaves out students), not only the "employee" role
      ]);
      if (assetsRes.data.success) {
        setAssets(assetsRes.data.data);
      }
      if (usersRes.data.success) {
        setEmployees(usersRes.data.data?.filter((u: any) => u.status !== 'resigned') || []);
      }
    } catch (error) {
      toast.error('Failed to load asset data');
    } finally {
      setLoading(false);
    }
  };

  const selectedEmployee = employees.find(e => e.id === selectedEmployeeId);
  const employeeAssets = assets.filter(a => a.userId === selectedEmployeeId);

  const handleOpenDialog = (asset?: Asset) => {
    if (asset) {
      setEditingAsset(asset);
      setFormsData([{
        ...asset,
        assignedDate: asset.assignedDate ? asset.assignedDate.split('T')[0] : '',
        returnedDate: asset.returnedDate ? asset.returnedDate.split('T')[0] : null,
      }]);
    } else {
      setEditingAsset(null);
      setFormsData([{
        type: 'COMPUTER',
        status: 'ASSIGNED',
        assignedDate: new Date().toISOString().split('T')[0],
        userId: selectedEmployeeId || undefined,
      }]);
    }
    setIsDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setIsDialogOpen(false);
    setEditingAsset(null);
    setFormsData([]);
  };

  const updateFormData = (index: number, updates: Partial<Asset>) => {
    const newFormsData = [...formsData];
    newFormsData[index] = { ...newFormsData[index], ...updates };
    setFormsData(newFormsData);
  };

  const addAnotherAsset = () => {
    setFormsData([
      ...formsData, 
      { 
        type: 'COMPUTER', 
        status: 'ASSIGNED', 
        assignedDate: new Date().toISOString().split('T')[0],
        userId: formsData[0]?.userId // Keep the same employee
      }
    ]);
  };

  const removeAssetForm = (index: number) => {
    const newFormsData = [...formsData];
    newFormsData.splice(index, 1);
    setFormsData(newFormsData);
  };

  const handleSubmit = async () => {
    // Validate all forms
    for (const data of formsData) {
      if (!data.userId || !data.type) {
        toast.error('Please fill required fields (Type and Employee) for all assets');
        return;
      }
    }

    try {
      if (editingAsset) {
        await api.put(`/assets/${editingAsset.id}`, formsData[0]);
        toast.success('Asset updated successfully');
      } else {
        // Submit all new assets
        await Promise.all(formsData.map(data => api.post('/assets', data)));
        toast.success(formsData.length > 1 ? 'Assets created successfully' : 'Asset created successfully');
      }
      handleCloseDialog();
      fetchData();
    } catch (error) {
      toast.error(editingAsset ? 'Failed to update asset' : 'Failed to create assets');
    }
  };

  const handleDelete = async (id: string) => {
    if ((await confirmDialog({ title: 'Delete asset?', message: 'Are you sure you want to delete this asset?', confirmText: 'Delete', tone: 'danger' }))) {
      try {
        await api.delete(`/assets/${id}`);
        toast.success('Asset deleted successfully');
        fetchData();
      } catch (error) {
        toast.error('Failed to delete asset');
      }
    }
  };

  return (
    <div className="space-y-6 wizard-form">
      <div>
        <h2 className="text-2xl sm:text-3xl font-semibold tracking-tight">Employee Assets</h2>
        <p className="text-muted-foreground text-sm mt-1.5">Search and select an employee to view or manage their assigned assets.</p>
      </div>

      <div className="rounded-3xl bg-white border border-slate-100 p-5 sm:p-6 space-y-4">
        <div className="flex flex-col md:flex-row md:items-end gap-4">
          <div className="flex-1 max-w-xl flex flex-col space-y-2">
            <Label className="text-xs font-semibold text-slate-600">Select Employee</Label>
            <Popover open={openCombobox} onOpenChange={setOpenCombobox}>
              <PopoverTrigger asChild>
                <button
                  type="button"
                  role="combobox"
                  aria-expanded={openCombobox}
                  disabled={loading}
                  className={cn(
                    'w-full h-14 rounded-2xl px-4 flex items-center gap-3 text-left transition-colors border disabled:opacity-60',
                    selectedEmployeeId ? 'bg-[#eaf6e6] border-[#8ae47e]' : 'bg-[#f4f6f3] border-transparent hover:bg-[#eef5ec]'
                  )}
                >
                  {selectedEmployeeId ? (
                    <>
                      <span className="w-9 h-9 rounded-xl bg-white text-[#256c1d] font-semibold flex items-center justify-center shrink-0">
                        {(selectedEmployee?.name || '?')[0].toUpperCase()}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block text-sm font-semibold text-slate-900 truncate">{selectedEmployee?.name}</span>
                        <span className="block text-xs text-slate-500 truncate">
                          {selectedEmployee?.employeeProfile?.employeeId || selectedEmployee?.email}
                          {(selectedEmployee as any)?.role ? ` · ${String((selectedEmployee as any).role).replace(/_/g, ' ')}` : ''}
                        </span>
                      </span>
                    </>
                  ) : (
                    <>
                      <span className="w-9 h-9 rounded-xl bg-white text-slate-400 flex items-center justify-center shrink-0"><Search className="w-4 h-4" /></span>
                      <span className="flex-1 text-sm text-slate-500">Search employee by name, ID or role…</span>
                    </>
                  )}
                  <ChevronsUpDown className="h-4 w-4 shrink-0 text-slate-400" />
                </button>
              </PopoverTrigger>
              <PopoverContent className="w-[min(92vw,420px)] p-2 rounded-3xl border-slate-100 shadow-xl" align="start">
                <Command className="bg-transparent">
                  <CommandInput placeholder="Search employees..." className="h-11" />
                  <CommandList className="max-h-72 mt-1">
                    <CommandEmpty>No employee found.</CommandEmpty>
                    <CommandGroup>
                      {employees.map((emp) => {
                        const isSel = selectedEmployeeId === emp.id;
                        return (
                          <CommandItem
                            key={emp.id}
                            value={`${emp.name} ${emp.employeeProfile?.employeeId || ''} ${emp.email} ${(emp as any).role || ''}`}
                            onSelect={() => {
                              setSelectedEmployeeId(emp.id);
                              setOpenCombobox(false);
                            }}
                            className={cn('rounded-2xl px-3 py-2.5 gap-3 cursor-pointer', isSel && 'bg-[#eaf6e6]')}
                          >
                            <span className="w-9 h-9 rounded-xl bg-[#f4f6f3] text-[#256c1d] font-semibold flex items-center justify-center shrink-0">
                              {(emp.name || '?')[0].toUpperCase()}
                            </span>
                            <span className="min-w-0 flex-1">
                              <span className="block text-sm font-semibold text-slate-900 truncate">{emp.name}</span>
                              <span className="block text-xs text-slate-500 truncate">{emp.employeeProfile?.employeeId || emp.email}</span>
                            </span>
                            <span className="rounded-full bg-[#f4f6f3] px-2.5 py-0.5 text-[10px] font-semibold text-slate-600 capitalize shrink-0">
                              {String((emp as any).role || '').replace(/_/g, ' ')}
                            </span>
                            {isSel && <Check className="h-4 w-4 text-[#256c1d] shrink-0" />}
                          </CommandItem>
                        );
                      })}
                    </CommandGroup>
                  </CommandList>
                </Command>
              </PopoverContent>
            </Popover>
          </div>

          {selectedEmployeeId && (
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setSelectedEmployeeId(null)} className="h-11 px-5 rounded-full bg-white border-slate-200 hover:bg-[#eaf6e6]">
                Clear
              </Button>
              {mayCreate && (
                <Button onClick={() => handleOpenDialog()} className="h-11 px-6 rounded-full bg-[#8ae47e] hover:bg-[#7bd96f] text-[#0b1d14] font-semibold">
                  <Plus className="w-4 h-4 mr-2" />
                  Allot Asset(s)
                </Button>
              )}
            </div>
          )}
        </div>
      </div>

      {selectedEmployeeId ? (
        <div className="rounded-3xl bg-white border border-slate-100 overflow-hidden">
          <div className="px-6 py-5 flex items-center justify-between border-b border-slate-100">
            <h3 className="text-lg font-semibold tracking-tight">Assigned Assets</h3>
            <span className="rounded-full bg-[#eaf6e6] text-[#256c1d] text-xs font-semibold px-3 py-1">{employeeAssets.length} total</span>
          </div>
          <div className="p-4 sm:p-5">
            {employeeAssets.length === 0 ? (
              <div className="text-center py-14 text-muted-foreground">
                <div className="w-14 h-14 rounded-2xl bg-[#eaf6e6] text-[#256c1d] flex items-center justify-center mx-auto mb-3"><MonitorSmartphone className="w-6 h-6" /></div>
                <p className="text-sm">No assets allotted to this employee</p>
              </div>
            ) : (
              <div className="space-y-3">
                {employeeAssets.map(asset => (
                  <div key={asset.id} className="flex flex-col md:flex-row md:items-center justify-between gap-3 p-4 rounded-2xl bg-[#f4f6f3] hover:bg-[#eef5ec] transition-colors">
                    <div className="flex items-center gap-4 min-w-0">
                      <div className="w-11 h-11 rounded-2xl bg-white text-[#256c1d] flex items-center justify-center shrink-0">
                        <MonitorSmartphone className="w-5 h-5" />
                      </div>
                      <div className="min-w-0">
                        <div className="font-semibold text-slate-900 truncate">{asset.brand} {asset.model}</div>
                        <div className="flex flex-wrap items-center gap-2 mt-1">
                          <span className="rounded-full bg-white px-2.5 py-0.5 text-[11px] font-semibold text-slate-600 capitalize">{asset.type.toLowerCase()}</span>
                          <span className="text-xs text-muted-foreground">Assigned {new Date(asset.assignedDate).toLocaleDateString()}</span>
                        </div>
                        <div className="text-xs text-muted-foreground mt-1 flex flex-wrap gap-x-3">
                          {asset.serialNumber && <span>SN: <span className="font-mono text-slate-700">{asset.serialNumber}</span></span>}
                          {asset.imeiNumber && <span>IMEI: <span className="font-mono text-slate-700">{asset.imeiNumber}</span></span>}
                          {asset.phoneNumber && <span>Phone: {asset.phoneNumber}</span>}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={cn(
                        'rounded-full px-3 py-1 text-[11px] font-semibold capitalize',
                        asset.status === 'ASSIGNED' ? 'bg-[#dff3da] text-[#256c1d]' :
                        asset.status === 'RETURNED' ? 'bg-slate-200/70 text-slate-600' :
                        'bg-red-100 text-red-700'
                      )}>
                        {asset.status.toLowerCase()}
                      </span>
                      {mayEdit && (
                        <Button variant="ghost" size="sm" className="rounded-full hover:bg-white" onClick={() => handleOpenDialog(asset)}>
                          <Edit2 className="w-4 h-4" />
                        </Button>
                      )}
                      {mayDelete && (
                        <Button variant="ghost" size="sm" onClick={() => handleDelete(asset.id)} className="rounded-full text-red-500 hover:text-red-600 hover:bg-red-50">
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      ) : (
        <div className="text-center py-16 text-muted-foreground bg-white border border-slate-100 rounded-3xl">
          <div className="w-14 h-14 rounded-2xl bg-[#eaf6e6] text-[#256c1d] flex items-center justify-center mx-auto mb-3"><MonitorSmartphone className="w-6 h-6" /></div>
          <p className="text-sm">Please select an employee to view or allot assets.</p>
        </div>
      )}

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="wizard-form max-w-2xl max-h-[90vh] overflow-y-auto rounded-[2rem] border-0 bg-white p-6 sm:p-8" style={{ fontFamily: "Urbanist, ui-sans-serif, system-ui, sans-serif" }}>
          <DialogHeader>
            <DialogTitle className="text-xl font-semibold tracking-tight">{editingAsset ? 'Edit Asset' : 'Allot New Asset(s)'}</DialogTitle>
          </DialogHeader>
          
          <div className="space-y-6 py-4">
            {formsData.map((formData, index) => (
              <div key={index} className={cn("relative p-5 rounded-2xl", formsData.length > 1 ? "bg-[#f4f6f3]" : "bg-[#f4f6f3]")}>
                {formsData.length > 1 && (
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    className="absolute top-2 right-2 h-8 w-8 p-0 text-muted-foreground hover:text-red-500" 
                    onClick={() => removeAssetForm(index)}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                )}
                
                {formsData.length > 1 && (
                  <h4 className="text-sm font-medium mb-4 text-muted-foreground">Asset #{index + 1}</h4>
                )}

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Asset Type</Label>
                    <Select 
                      value={formData.type} 
                      onValueChange={(val: any) => updateFormData(index, { type: val })}
                    >
                      <SelectTrigger className="bg-white">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="COMPUTER">Computer</SelectItem>
                        <SelectItem value="PHONE">Phone</SelectItem>
                        <SelectItem value="OTHER">Other</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div className="space-y-2">
                    <Label>Assign to Employee</Label>
                    <Select 
                      value={formData.userId} 
                      onValueChange={(val) => {
                        // Update userId for all forms if changed in one
                        const newFormsData = formsData.map(d => ({ ...d, userId: val }));
                        setFormsData(newFormsData);
                      }}
                      disabled={true} // Usually disabled because we selected employee in the main view
                    >
                      <SelectTrigger className="bg-white">
                        <SelectValue placeholder="Select Employee" />
                      </SelectTrigger>
                      <SelectContent>
                        {employees.map(emp => (
                          <SelectItem key={emp.id} value={emp.id}>
                            {emp.name} {emp.employeeProfile?.employeeId ? `(${emp.employeeProfile.employeeId})` : ''}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label>Brand</Label>
                    <Input 
                      value={formData.brand || ''} 
                      onChange={e => updateFormData(index, { brand: e.target.value })} 
                      placeholder="e.g. Apple, Dell"
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label>Model</Label>
                    <Input 
                      value={formData.model || ''} 
                      onChange={e => updateFormData(index, { model: e.target.value })} 
                      placeholder="e.g. MacBook Pro, iPhone 13"
                    />
                  </div>

                  {formData.type === 'COMPUTER' && (
                    <div className="space-y-2">
                      <Label>Serial Number</Label>
                      <Input 
                        value={formData.serialNumber || ''} 
                        onChange={e => updateFormData(index, { serialNumber: e.target.value })} 
                      />
                    </div>
                  )}

                  {formData.type === 'PHONE' && (
                    <>
                      <div className="space-y-2">
                        <Label>IMEI Number</Label>
                        <Input 
                          value={formData.imeiNumber || ''} 
                          onChange={e => updateFormData(index, { imeiNumber: e.target.value })} 
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Network Provider</Label>
                        <Input 
                          value={formData.networkProvider || ''} 
                          onChange={e => updateFormData(index, { networkProvider: e.target.value })} 
                          placeholder="e.g. AT&T, Verizon"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Phone Number</Label>
                        <Input 
                          value={formData.phoneNumber || ''} 
                          onChange={e => updateFormData(index, { phoneNumber: e.target.value })} 
                        />
                      </div>
                    </>
                  )}

                  <div className="space-y-2">
                    <Label>Status</Label>
                    <Select 
                      value={formData.status} 
                      onValueChange={(val: any) => updateFormData(index, { status: val })}
                    >
                      <SelectTrigger className="bg-white">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="ASSIGNED">Assigned</SelectItem>
                        <SelectItem value="RETURNED">Returned</SelectItem>
                        <SelectItem value="LOST">Lost</SelectItem>
                        <SelectItem value="DAMAGED">Damaged</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label>Assigned Date</Label>
                    <Input 
                      type="date"
                      value={formData.assignedDate || ''} 
                      onChange={e => updateFormData(index, { assignedDate: e.target.value })} 
                    />
                  </div>

                  {formData.status === 'RETURNED' && (
                    <div className="space-y-2">
                      <Label>Returned Date</Label>
                      <Input 
                        type="date"
                        value={formData.returnedDate || ''} 
                        onChange={e => updateFormData(index, { returnedDate: e.target.value })} 
                      />
                    </div>
                  )}

                  <div className="space-y-2 col-span-2">
                    <Label>Notes</Label>
                    <Input 
                      value={formData.notes || ''} 
                      onChange={e => updateFormData(index, { notes: e.target.value })} 
                      placeholder="Additional details..."
                    />
                  </div>
                </div>
              </div>
            ))}

            {!editingAsset && (
              <div className="pt-2">
                <Button variant="outline" className="w-full h-11 rounded-full border-dashed border-[#cfe9c9] text-[#256c1d] hover:bg-[#eaf6e6]" onClick={addAnotherAsset}>
                  <Plus className="h-4 w-4 mr-2" />
                  Add Another Asset
                </Button>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" className="h-11 px-6 rounded-full" onClick={handleCloseDialog}>Cancel</Button>
            <Button className="h-11 px-6 rounded-full bg-[#8ae47e] hover:bg-[#7bd96f] text-[#0b1d14] font-semibold" onClick={handleSubmit}>{editingAsset ? 'Update' : 'Save All'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

