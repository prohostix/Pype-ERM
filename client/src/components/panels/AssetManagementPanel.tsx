import { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
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
import { Search, Plus, Edit2, Trash2, MonitorSmartphone } from 'lucide-react';
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
  const [searchTerm, setSearchTerm] = useState('');
  
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingAsset, setEditingAsset] = useState<Asset | null>(null);
  const [formData, setFormData] = useState<Partial<Asset>>({
    type: 'COMPUTER',
    status: 'ASSIGNED',
    assignedDate: new Date().toISOString().split('T')[0]
  });

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

  const handleOpenDialog = (asset?: Asset) => {
    if (asset) {
      setEditingAsset(asset);
      setFormData({
        ...asset,
        assignedDate: asset.assignedDate ? asset.assignedDate.split('T')[0] : '',
        returnedDate: asset.returnedDate ? asset.returnedDate.split('T')[0] : null,
      });
    } else {
      setEditingAsset(null);
      setFormData({
        type: 'COMPUTER',
        status: 'ASSIGNED',
        assignedDate: new Date().toISOString().split('T')[0],
      });
    }
    setIsDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setIsDialogOpen(false);
    setEditingAsset(null);
    setFormData({});
  };

  const handleSubmit = async () => {
    if (!formData.userId || !formData.type) {
      toast.error('Please fill required fields (Type and Employee)');
      return;
    }

    try {
      if (editingAsset) {
        await api.put(`/assets/${editingAsset.id}`, formData);
        toast.success('Asset updated successfully');
      } else {
        await api.post('/assets', formData);
        toast.success('Asset created successfully');
      }
      handleCloseDialog();
      fetchData();
    } catch (error) {
      toast.error(editingAsset ? 'Failed to update asset' : 'Failed to create asset');
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

  const filteredAssets = assets.filter(a => {
    const searchString = `${a.brand} ${a.model} ${a.user?.name} ${a.serialNumber} ${a.imeiNumber}`.toLowerCase();
    return searchString.includes(searchTerm.toLowerCase());
  });

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="text-2xl flex items-center gap-2">
              <MonitorSmartphone className="w-6 h-6 text-primary" />
              Asset Management
            </CardTitle>
          </div>
          <Button onClick={() => handleOpenDialog()}>
            <Plus className="w-4 h-4 mr-2" />
            Add Asset
          </Button>
        </CardHeader>
        <CardContent>
          <div className="flex items-center mb-6 max-w-sm">
            <div className="relative w-full">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search assets..."
                className="pl-8"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </div>

          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Asset Details</TableHead>
                  <TableHead>Identifiers</TableHead>
                  <TableHead>Assigned To</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-8">Loading assets...</TableCell>
                  </TableRow>
                ) : filteredAssets.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                      No assets found
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredAssets.map(asset => (
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
                        {asset.user ? (
                          <div className="flex flex-col">
                            <span className="font-medium">{asset.user.name}</span>
                            <span className="text-xs text-muted-foreground">{asset.user.employeeProfile?.employeeId || asset.user.email}</span>
                          </div>
                        ) : (
                          <span className="text-muted-foreground">Unassigned</span>
                        )}
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
        </CardContent>
      </Card>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{editingAsset ? 'Edit Asset' : 'Add New Asset'}</DialogTitle>
          </DialogHeader>
          
          <div className="grid grid-cols-2 gap-4 py-4">
            <div className="space-y-2">
              <Label>Asset Type</Label>
              <Select 
                value={formData.type} 
                onValueChange={(val: any) => setFormData({...formData, type: val})}
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
                onValueChange={(val) => setFormData({...formData, userId: val})}
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
                onChange={e => setFormData({...formData, brand: e.target.value})} 
                placeholder="e.g. Apple, Dell"
              />
            </div>
            
            <div className="space-y-2">
              <Label>Model</Label>
              <Input 
                value={formData.model || ''} 
                onChange={e => setFormData({...formData, model: e.target.value})} 
                placeholder="e.g. MacBook Pro, iPhone 13"
              />
            </div>

            {formData.type === 'COMPUTER' && (
              <div className="space-y-2">
                <Label>Serial Number</Label>
                <Input 
                  value={formData.serialNumber || ''} 
                  onChange={e => setFormData({...formData, serialNumber: e.target.value})} 
                />
              </div>
            )}

            {formData.type === 'PHONE' && (
              <>
                <div className="space-y-2">
                  <Label>IMEI Number</Label>
                  <Input 
                    value={formData.imeiNumber || ''} 
                    onChange={e => setFormData({...formData, imeiNumber: e.target.value})} 
                  />
                </div>
                <div className="space-y-2">
                  <Label>Network Provider</Label>
                  <Input 
                    value={formData.networkProvider || ''} 
                    onChange={e => setFormData({...formData, networkProvider: e.target.value})} 
                    placeholder="e.g. AT&T, Verizon"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Phone Number</Label>
                  <Input 
                    value={formData.phoneNumber || ''} 
                    onChange={e => setFormData({...formData, phoneNumber: e.target.value})} 
                  />
                </div>
              </>
            )}

            <div className="space-y-2">
              <Label>Status</Label>
              <Select 
                value={formData.status} 
                onValueChange={(val: any) => setFormData({...formData, status: val})}
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
                onChange={e => setFormData({...formData, assignedDate: e.target.value})} 
              />
            </div>

            {formData.status === 'RETURNED' && (
              <div className="space-y-2">
                <Label>Returned Date</Label>
                <Input 
                  type="date"
                  value={formData.returnedDate || ''} 
                  onChange={e => setFormData({...formData, returnedDate: e.target.value})} 
                />
              </div>
            )}

            <div className="space-y-2 col-span-2">
              <Label>Notes</Label>
              <Input 
                value={formData.notes || ''} 
                onChange={e => setFormData({...formData, notes: e.target.value})} 
                placeholder="Additional details..."
              />
            </div>

          </div>

          <DialogFooter>
            <Button variant="outline" onClick={handleCloseDialog}>Cancel</Button>
            <Button onClick={handleSubmit}>{editingAsset ? 'Update' : 'Save'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
