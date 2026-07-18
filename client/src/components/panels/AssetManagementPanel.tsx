import { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
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
import { Badge } from '@/components/ui/badge';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { Check, ChevronsUpDown, Plus, Edit2, Trash2, MonitorSmartphone, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import api from '@/lib/api';

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
        api.get('/users?role=employee')
      ]);
      if (assetsRes.data.success) {
        setAssets(assetsRes.data.data);
      }
      if (usersRes.data.success) {
        setEmployees(usersRes.data.data);
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
    if (window.confirm('Are you sure you want to delete this asset?')) {
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
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-2xl flex items-center gap-2">
            <MonitorSmartphone className="w-6 h-6 text-primary" />
            Employee Assets
          </CardTitle>
          <CardDescription>
            Search and select an employee to view or manage their assigned assets.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col space-y-4 md:flex-row md:space-y-0 md:space-x-4 mb-6">
            <div className="flex-1 max-w-sm flex flex-col space-y-2">
              <Label>Select Employee</Label>
              <Popover open={openCombobox} onOpenChange={setOpenCombobox}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    role="combobox"
                    aria-expanded={openCombobox}
                    className="w-full justify-between font-normal"
                    disabled={loading}
                  >
                    {selectedEmployeeId
                      ? `${selectedEmployee?.name} ${selectedEmployee?.employeeProfile?.employeeId ? `(${selectedEmployee.employeeProfile.employeeId})` : ''}`
                      : "Search employee..."}
                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-[300px] p-0" align="start">
                  <Command>
                    <CommandInput placeholder="Search employees..." />
                    <CommandList>
                      <CommandEmpty>No employee found.</CommandEmpty>
                      <CommandGroup>
                        {employees.map((emp) => (
                          <CommandItem
                            key={emp.id}
                            value={`${emp.name} ${emp.employeeProfile?.employeeId || ''} ${emp.email}`}
                            onSelect={() => {
                              setSelectedEmployeeId(emp.id);
                              setOpenCombobox(false);
                            }}
                          >
                            <Check
                              className={cn(
                                "mr-2 h-4 w-4",
                                selectedEmployeeId === emp.id ? "opacity-100" : "opacity-0"
                              )}
                            />
                            {emp.name} {emp.employeeProfile?.employeeId ? `(${emp.employeeProfile.employeeId})` : ''}
                          </CommandItem>
                        ))}
                      </CommandGroup>
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>
            </div>
            
            {selectedEmployeeId && (
              <div className="flex items-end">
                <Button onClick={() => handleOpenDialog()}>
                  <Plus className="w-4 h-4 mr-2" />
                  Allot Asset(s)
                </Button>
              </div>
            )}
          </div>

          {selectedEmployeeId ? (
            <div className="rounded-md border mt-6">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Asset Details</TableHead>
                    <TableHead>Identifiers</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Assigned Date</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {employeeAssets.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                        No assets allotted to this employee
                      </TableCell>
                    </TableRow>
                  ) : (
                    employeeAssets.map(asset => (
                      <TableRow key={asset.id}>
                        <TableCell>
                          <div className="flex flex-col">
                            <span className="font-medium">{asset.brand} {asset.model}</span>
                            <span className="text-xs text-muted-foreground">{asset.type}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-col text-sm">
                            {asset.serialNumber && <span>SN: {asset.serialNumber}</span>}
                            {asset.imeiNumber && <span>IMEI: {asset.imeiNumber}</span>}
                            {asset.phoneNumber && <span>Phone: {asset.phoneNumber}</span>}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant={
                            asset.status === 'ASSIGNED' ? 'default' :
                            asset.status === 'RETURNED' ? 'secondary' :
                            'destructive'
                          }>
                            {asset.status}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {new Date(asset.assignedDate).toLocaleDateString()}
                        </TableCell>
                        <TableCell className="text-right">
                          <Button variant="ghost" size="sm" onClick={() => handleOpenDialog(asset)}>
                            <Edit2 className="w-4 h-4" />
                          </Button>
                          <Button variant="ghost" size="sm" onClick={() => handleDelete(asset.id)} className="text-red-500 hover:text-red-600">
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          ) : (
            <div className="text-center py-12 text-muted-foreground bg-slate-50 dark:bg-slate-900 rounded-md mt-6">
              Please select an employee to view or allot assets.
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingAsset ? 'Edit Asset' : 'Allot New Asset(s)'}</DialogTitle>
          </DialogHeader>
          
          <div className="space-y-6 py-4">
            {formsData.map((formData, index) => (
              <div key={index} className={cn("relative p-4 rounded-lg border", formsData.length > 1 ? "bg-slate-50 dark:bg-slate-900/50" : "")}>
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
                      <SelectTrigger>
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
                      <SelectTrigger>
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
                      <SelectTrigger>
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
                <Button variant="outline" className="w-full border-dashed" onClick={addAnotherAsset}>
                  <Plus className="h-4 w-4 mr-2" />
                  Add Another Asset
                </Button>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={handleCloseDialog}>Cancel</Button>
            <Button onClick={handleSubmit}>{editingAsset ? 'Update' : 'Save All'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

