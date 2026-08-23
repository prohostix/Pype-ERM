import { useState, useEffect } from 'react';
import axios from 'axios';
import { Button } from '../ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../ui/table';
import { AlertCircle, Plus, RefreshCw, Trash2, Edit2 } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '../ui/dialog';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { toast } from 'sonner';

interface Device {
  id: string;
  name: string;
  serialNumber: string;
  ipAddress: string;
  status: string;
  lastActive: string | null;
  branchId: string | null;
}

export function BiometricDevicesPanel() {
  const [devices, setDevices] = useState<Device[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Form State
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingDevice, setEditingDevice] = useState<Device | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    serialNumber: '',
    ipAddress: '',
  });

  const fetchDevices = async () => {
    try {
      setLoading(true);
      const res = await axios.get('/api/biometric-devices', {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      setDevices(res.data);
      setError(null);
    } catch (err: any) {
      console.error(err);
      setError('Failed to load biometric devices.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDevices();
  }, []);

  const handleOpenDialog = (device?: Device) => {
    if (device) {
      setEditingDevice(device);
      setFormData({
        name: device.name,
        serialNumber: device.serialNumber,
        ipAddress: device.ipAddress || '',
      });
    } else {
      setEditingDevice(null);
      setFormData({ name: '', serialNumber: '', ipAddress: '' });
    }
    setIsDialogOpen(true);
  };

  const handleSave = async () => {
    try {
      const headers = { Authorization: `Bearer ${localStorage.getItem('token')}` };
      if (editingDevice) {
        await axios.put(`/api/biometric-devices/${editingDevice.id}`, formData, { headers });
      } else {
        await axios.post('/api/biometric-devices', formData, { headers });
      }
      setIsDialogOpen(false);
      fetchDevices();
    } catch (err: any) {
      console.error(err);
      toast.error(err.response?.data?.error || 'Failed to save device.');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this device?')) return;
    try {
      await axios.delete(`/api/biometric-devices/${id}`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      fetchDevices();
    } catch (err: any) {
      console.error(err);
      toast.error('Failed to delete device.');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-3xl font-bold tracking-tight">Biometric Devices</h2>
        <div className="flex space-x-2">
          <Button variant="outline" onClick={fetchDevices} disabled={loading}>
            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button onClick={() => handleOpenDialog()}>
                <Plus className="h-4 w-4 mr-2" />
                Add Device
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>{editingDevice ? 'Edit Device' : 'Add New Device'}</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label>Device Name</Label>
                  <Input 
                    value={formData.name} 
                    onChange={e => setFormData({ ...formData, name: e.target.value })} 
                    placeholder="e.g. Main Entrance"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Serial Number (SN)</Label>
                  <Input 
                    value={formData.serialNumber} 
                    onChange={e => setFormData({ ...formData, serialNumber: e.target.value })} 
                    placeholder="Matches SN on ZKTeco device"
                    disabled={!!editingDevice}
                  />
                </div>
                <div className="space-y-2">
                  <Label>IP Address (Optional)</Label>
                  <Input 
                    value={formData.ipAddress} 
                    onChange={e => setFormData({ ...formData, ipAddress: e.target.value })} 
                    placeholder="192.168.1.100"
                  />
                </div>
                <Button onClick={handleSave} className="w-full">
                  Save Device
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {error && (
        <div className="p-4 bg-red-50 text-red-600 rounded-md flex items-center">
          <AlertCircle className="w-5 h-5 mr-2" />
          {error}
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Registered Devices</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Serial Number</TableHead>
                <TableHead>IP Address</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Last Active</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8">Loading devices...</TableCell>
                </TableRow>
              ) : devices.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                    No biometric devices registered.
                  </TableCell>
                </TableRow>
              ) : (
                devices.map((device) => (
                  <TableRow key={device.id}>
                    <TableCell className="font-medium">{device.name}</TableCell>
                    <TableCell>{device.serialNumber}</TableCell>
                    <TableCell>{device.ipAddress || 'N/A'}</TableCell>
                    <TableCell>
                      <span className={`px-2 py-1 text-xs rounded-full ${device.status === 'active' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}`}>
                        {device.status}
                      </span>
                    </TableCell>
                    <TableCell>
                      {device.lastActive ? new Date(device.lastActive).toLocaleString() : 'Never'}
                    </TableCell>
                    <TableCell className="text-right space-x-2">
                      <Button variant="ghost" size="sm" onClick={() => handleOpenDialog(device)}>
                        <Edit2 className="w-4 h-4 text-blue-600" />
                      </Button>
                      <Button variant="ghost" size="sm" onClick={() => handleDelete(device.id)}>
                        <Trash2 className="w-4 h-4 text-red-600" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
