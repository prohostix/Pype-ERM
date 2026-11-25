import { useState, useEffect } from 'react';
import { Button } from '../ui/button';
import { AlertCircle, Plus, RefreshCw, Trash2, Edit2, Fingerprint } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '../ui/dialog';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { toast } from 'sonner';
import api from '@/lib/api';
import { confirmDialog } from '@/lib/confirm';

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
      const res = await api.get('/biometric-devices');
      setDevices(res.data.data || res.data || []);
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
      const headers = {};
      if (editingDevice) {
        await api.put(`/biometric-devices/${editingDevice.id}`, formData);
      } else {
        await api.post('/biometric-devices', formData);
      }
      setIsDialogOpen(false);
      fetchDevices();
    } catch (err: any) {
      console.error(err);
      toast.error(err.response?.data?.error || 'Failed to save device.');
    }
  };

  const handleDelete = async (id: string) => {
    if (!(await confirmDialog({ title: 'Delete device?', message: 'Are you sure you want to delete this device?', confirmText: 'Delete', tone: 'danger' }))) return;
    try {
      await api.delete(`/biometric-devices/${id}`);
      fetchDevices();
    } catch (err: any) {
      console.error(err);
      toast.error('Failed to delete device.');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-start flex-wrap gap-3">
        <h2 className="text-2xl sm:text-3xl font-semibold tracking-tight">Biometric Devices</h2>
        <div className="flex gap-2">
          <Button variant="outline" onClick={fetchDevices} disabled={loading} className="h-11 px-5 rounded-full bg-white border-slate-200 hover:bg-[#eaf6e6]">
            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button onClick={() => handleOpenDialog()} className="h-11 px-5 rounded-full bg-[#8ae47e] hover:bg-[#7bd96f] text-[#0b1d14] font-semibold">
                <Plus className="h-4 w-4 mr-2" />
                Add Device
              </Button>
            </DialogTrigger>
            <DialogContent className="wizard-form rounded-[2rem] border-0 bg-white p-6 sm:p-8" style={{ fontFamily: "Urbanist, ui-sans-serif, system-ui, sans-serif" }}>
              <DialogHeader>
                <DialogTitle className="text-xl font-semibold tracking-tight">{editingDevice ? 'Edit Device' : 'Add New Device'}</DialogTitle>
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
                <Button onClick={handleSave} className="w-full h-11 rounded-full bg-[#8ae47e] hover:bg-[#7bd96f] text-[#0b1d14] font-semibold">
                  Save Device
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {error && (
        <div className="p-4 bg-red-50 text-red-600 rounded-2xl flex items-center">
          <AlertCircle className="w-5 h-5 mr-2" />
          {error}
        </div>
      )}

      <div className="rounded-3xl bg-white border border-slate-100 overflow-hidden">
        <div className="px-6 py-5 flex items-center justify-between border-b border-slate-100">
          <h3 className="text-lg font-semibold tracking-tight">Registered Devices</h3>
          {!loading && <span className="rounded-full bg-[#eaf6e6] text-[#256c1d] text-xs font-semibold px-3 py-1">{devices.length} total</span>}
        </div>
        <div className="p-4 sm:p-5">
          {loading ? (
            <div className="space-y-3">{[1, 2, 3].map(i => <div key={i} className="h-16 bg-slate-100 rounded-2xl animate-pulse" />)}</div>
          ) : devices.length === 0 ? (
            <div className="text-center py-14 text-muted-foreground">
              <div className="w-14 h-14 rounded-2xl bg-[#eaf6e6] text-[#256c1d] flex items-center justify-center mx-auto mb-3"><Fingerprint className="w-6 h-6" /></div>
              <p className="text-sm">No biometric devices registered.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {devices.map((device) => (
                <div key={device.id} className="flex flex-col md:flex-row md:items-center justify-between gap-3 p-4 rounded-2xl bg-[#f4f6f3] hover:bg-[#eef5ec] transition-colors">
                  <div className="flex items-center gap-4 min-w-0">
                    <div className="w-11 h-11 rounded-2xl bg-white text-[#256c1d] flex items-center justify-center shrink-0">
                      <Fingerprint className="w-5 h-5" />
                    </div>
                    <div className="min-w-0">
                      <div className="font-semibold text-slate-900 truncate">{device.name}</div>
                      <div className="text-xs text-muted-foreground mt-0.5 flex flex-wrap gap-x-3">
                        <span>SN: <span className="font-mono text-slate-700">{device.serialNumber}</span></span>
                        <span>IP: {device.ipAddress || 'N/A'}</span>
                        <span>Last active: {device.lastActive ? new Date(device.lastActive).toLocaleString() : 'Never'}</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`rounded-full px-3 py-1 text-[11px] font-semibold capitalize ${device.status === 'active' ? 'bg-[#dff3da] text-[#256c1d]' : 'bg-slate-200/70 text-slate-600'}`}>
                      {device.status}
                    </span>
                    <Button variant="ghost" size="sm" className="rounded-full hover:bg-white" onClick={() => handleOpenDialog(device)}>
                      <Edit2 className="w-4 h-4" />
                    </Button>
                    <Button variant="ghost" size="sm" className="rounded-full text-red-500 hover:text-red-600 hover:bg-red-50" onClick={() => handleDelete(device.id)}>
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
