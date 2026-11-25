import { useState, useEffect } from 'react';
import { Plus, Edit, Trash2, Users, CheckCircle, Link2, Copy, Building2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import api from '@/lib/api';
import { toast } from 'sonner';
import { useAuth } from '@/hooks/useAuth';

export function LeadsPanel() {
  const { user } = useAuth();
  const isSalesAdmin = (user?.role === 'sales_admin' || user?.role === 'sales_sub_admin');

  const [leads, setLeads] = useState<any[]>([]);
  const [referralLinks, setReferralLinks] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [convertDialogOpen, setConvertDialogOpen] = useState(false);
  const [selectedLead, setSelectedLead] = useState<any>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    centerName: '',
    contactName: '',
    email: '',
    phone: '',
    address: '',
    source: 'website',
    status: 'new',
    notes: ''
  });

  const [centerFormData, setCenterFormData] = useState({
    name: '',
    code: '',
    address: '',
    contact: '',
    email: '',
  });

  useEffect(() => {
    fetchLeads();
    if (isSalesAdmin) fetchReferralLinks();
  }, [isSalesAdmin]);

  const fetchLeads = async () => {
    setLoading(true);
    try {
      const response = await api.get('/sales/leads');
      setLeads(response.data.data || []);
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to fetch leads');
    } finally {
      setLoading(false);
    }
  };

  const fetchReferralLinks = async () => {
    try {
      const response = await api.get('/referrals/my-links');
      setReferralLinks(response.data.data || []);
    } catch (_) {}
  };

  const generateReferralLink = async () => {
    try {
      await api.post('/referrals/generate');
      fetchReferralLinks();
      toast.success('Referral link generated successfully');
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to generate referral link');
    }
  };

  const copyReferralLink = (url: string) => {
    navigator.clipboard.writeText(url).then(() => toast.success('Referral link copied to clipboard'));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingId) {
        await api.put(`/sales/leads/${editingId}`, formData);
      } else {
        await api.post('/sales/leads', formData);
      }
      setDialogOpen(false);
      resetForm();
      fetchLeads();
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to save lead');
    }
  };

  const handleEdit = (lead: any) => {
    const leadId = lead.id || lead.id;
    setEditingId(leadId);
    setFormData({
      centerName: lead.centerName || '',
      contactName: lead.contactName || '',
      email: lead.email || '',
      phone: lead.phone || '',
      address: lead.address || '',
      source: lead.source || 'website',
      status: lead.status || 'new',
      notes: lead.notes || ''
    });
    setDialogOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure?')) return;
    try {
      await api.delete(`/sales/leads/${id}`);
      fetchLeads();
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to delete lead');
    }
  };

  const handleConvert = async (id: string) => {
    if (!confirm('Convert this lead to a student?')) return;
    try {
      await api.put(`/sales/leads/${id}/convert`);
      fetchLeads();
      toast.success('Lead converted successfully');
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to convert lead');
    }
  };

  const openConvertToCenterDialog = (lead: any) => {
    setSelectedLead(lead);
    setCenterFormData({
      name: lead.centerName || '',
      code: '',
      address: lead.address || '',
      contact: lead.phone || '',
      email: lead.email || '',
    });
    setConvertDialogOpen(true);
  };

  const handleConvertToCenter = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.post('/operations/centers', centerFormData);
      const leadId = selectedLead.id || selectedLead.id;
      await api.put(`/sales/leads/${leadId}`, { status: 'converted' });
      setConvertDialogOpen(false);
      fetchLeads();
      toast.success('Lead converted to Academic Partner successfully');
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to convert to center');
    }
  };

  const resetForm = () => {
    setEditingId(null);
    setFormData({
      centerName: '',
      contactName: '',
      email: '',
      phone: '',
      address: '',
      source: 'website',
      status: 'new',
      notes: ''
    });
  };

  const getStatusColor = (status: string) => {
    const colors: any = {
      new: 'bg-sky-100 text-sky-700',
      contacted: 'bg-yellow-100 text-yellow-800',
      qualified: 'bg-purple-100 text-purple-800',
      proposal: 'bg-orange-100 text-orange-800',
      negotiation: 'bg-indigo-100 text-indigo-800',
      converted: 'bg-[#dff3da] text-[#256c1d]',
      lost: 'bg-red-100 text-red-800'
    };
    return colors[status] || '';
  };

  return (
    <div className="space-y-6">
      {/* Referral Links Section — sales_admin only */}
      {isSalesAdmin && (
      <div className="rounded-3xl bg-[#eaf6e6] border border-[#cfe9c9] p-5 sm:p-6">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-3">
            <span className="w-11 h-11 rounded-2xl bg-white text-[#256c1d] flex items-center justify-center"><Link2 className="w-5 h-5" /></span>
            <div>
              <h3 className="text-lg font-semibold tracking-tight">My Referral Links</h3>
              <p className="text-sm text-slate-600">Share your referral link to earn commissions</p>
            </div>
          </div>
          {referralLinks.length === 0 && (
            <Button onClick={generateReferralLink} className="h-11 px-5 rounded-full bg-[#8ae47e] hover:bg-[#7bd96f] text-[#0b1d14] font-semibold">
              <Plus className="w-4 h-4 mr-2" />
              Generate Link
            </Button>
          )}
        </div>
        <div className="mt-5">
          {referralLinks.length > 0 ? (
            <div className="space-y-3">
              {referralLinks.map((link: any) => (
                <div key={link.id} className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 bg-white rounded-2xl">
                  <div className="flex-1 min-w-0">
                    <p className="font-mono text-sm break-all">{link.fullUrl}</p>
                    <div className="flex flex-wrap gap-2 mt-2 text-xs">
                      <span className="rounded-full bg-[#f4f6f3] px-2.5 py-1 text-slate-600">Centers: {link.metrics?.centersReferred || 0}</span>
                      <span className="rounded-full bg-[#f4f6f3] px-2.5 py-1 text-slate-600">Students: {link.metrics?.studentsReferred || 0}</span>
                      <span className="rounded-full bg-[#f4f6f3] px-2.5 py-1 text-slate-600">Revenue: ${link.metrics?.revenueGenerated || 0}</span>
                    </div>
                  </div>
                  <Button variant="outline" onClick={() => copyReferralLink(link.fullUrl)} className="h-10 px-5 rounded-full border-[#cfe9c9] text-[#256c1d] hover:bg-[#eaf6e6]">
                    <Copy className="w-4 h-4 mr-2" />
                    Copy
                  </Button>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-center text-slate-600 text-sm py-3">
              No referral links yet. Generate one to start earning!
            </p>
          )}
        </div>
      </div>
      )}

      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-2xl sm:text-3xl font-semibold tracking-tight">Lead Management</h2>
          <p className="text-muted-foreground text-sm mt-1.5">Track and convert sales leads</p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={(open) => { setDialogOpen(open); if (!open) resetForm(); }}>
          <DialogTrigger asChild>
            <Button className="h-11 px-5 rounded-full bg-[#8ae47e] hover:bg-[#7bd96f] text-[#0b1d14] font-semibold"><Plus className="w-4 h-4 mr-2" />Add Lead</Button>
          </DialogTrigger>
          <DialogContent className="wizard-form max-w-2xl max-h-[90vh] overflow-y-auto rounded-[2rem] border-0 bg-white p-6 sm:p-8" style={{ fontFamily: "Urbanist, ui-sans-serif, system-ui, sans-serif" }}>
            <DialogHeader>
              <DialogTitle className="text-xl font-semibold tracking-tight">{editingId ? 'Edit Lead' : 'Add New Lead'}</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <Label>Center Name</Label>
                  <Input value={formData.centerName} onChange={(e) => setFormData({...formData, centerName: e.target.value})} required />
                </div>
                <div>
                  <Label>Contact Name</Label>
                  <Input value={formData.contactName} onChange={(e) => setFormData({...formData, contactName: e.target.value})} required />
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <Label>Email</Label>
                  <Input type="email" value={formData.email} onChange={(e) => setFormData({...formData, email: e.target.value})} required />
                </div>
                <div>
                  <Label>Phone</Label>
                  <Input value={formData.phone} onChange={(e) => setFormData({...formData, phone: e.target.value})} required />
                </div>
              </div>
              <div>
                <Label>Address</Label>
                <Input value={formData.address} onChange={(e) => setFormData({...formData, address: e.target.value})} required />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <Label>Source</Label>
                  <Select value={formData.source} onValueChange={(value) => setFormData({...formData, source: value})}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="website">Website</SelectItem>
                      <SelectItem value="referral">Referral</SelectItem>
                      <SelectItem value="social">Social Media</SelectItem>
                      <SelectItem value="direct">Direct</SelectItem>
                      <SelectItem value="other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Status</Label>
                  <Select value={formData.status} onValueChange={(value) => setFormData({...formData, status: value})}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="new">New</SelectItem>
                      <SelectItem value="contacted">Contacted</SelectItem>
                      <SelectItem value="qualified">Qualified</SelectItem>
                      <SelectItem value="proposal">Proposal</SelectItem>
                      <SelectItem value="negotiation">Negotiation</SelectItem>
                      <SelectItem value="converted">Converted</SelectItem>
                      <SelectItem value="lost">Lost</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div>
                <Label>Notes</Label>
                <Textarea value={formData.notes} onChange={(e) => setFormData({...formData, notes: e.target.value})} rows={3} />
              </div>
              <div className="flex gap-2">
                <Button type="submit" className="flex-1 h-11 rounded-full bg-[#8ae47e] hover:bg-[#7bd96f] text-[#0b1d14] font-semibold">Save</Button>
                <Button type="button" variant="outline" className="h-11 px-6 rounded-full" onClick={() => setDialogOpen(false)}>Cancel</Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="rounded-3xl bg-white border border-slate-100 overflow-hidden">
        <div className="px-6 py-5 flex items-center justify-between border-b border-slate-100">
          <h3 className="text-lg font-semibold tracking-tight">Leads</h3>
          {!loading && <span className="rounded-full bg-[#eaf6e6] text-[#256c1d] text-xs font-semibold px-3 py-1">{leads.length} total</span>}
        </div>
        <div className="p-4 sm:p-5">
          {loading ? (
            <div className="space-y-3">{[1, 2, 3].map(i => <div key={i} className="h-16 bg-slate-100 rounded-2xl animate-pulse" />)}</div>
          ) : leads.length === 0 ? (
            <div className="text-center py-14 text-muted-foreground">
              <div className="w-14 h-14 rounded-2xl bg-[#eaf6e6] text-[#256c1d] flex items-center justify-center mx-auto mb-3"><Users className="w-6 h-6" /></div>
              <p className="text-sm">No leads found</p>
            </div>
          ) : (
            <div className="space-y-3">
              {leads.filter(lead => lead && (lead.id || lead.id)).map((lead) => {
                const leadId = lead.id || lead.id;
                return (
                  <div key={leadId} className="flex flex-col md:flex-row md:items-center justify-between gap-3 p-4 rounded-2xl bg-[#f4f6f3] hover:bg-[#eef5ec] transition-colors">
                    <div className="flex items-center gap-4">
                      <div className="w-11 h-11 rounded-2xl bg-white text-[#256c1d] flex items-center justify-center shrink-0">
                        <Users className="w-5 h-5" />
                      </div>
                      <div className="flex-1">
                        <div className="font-semibold text-slate-900">{lead.centerName}</div>
                        <div className="text-sm text-muted-foreground">
                          {lead.contactName} • {lead.email} • {lead.phone} • {lead.source}
                        </div>
                        {lead.notes && (
                          <div className="text-xs text-muted-foreground mt-1 line-clamp-1">{lead.notes}</div>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={`rounded-full px-3 py-1 text-[11px] font-semibold capitalize ${getStatusColor(lead.status)}`}>{lead.status}</span>
                      {lead.status !== 'converted' && lead.status !== 'lost' && (
                        <>
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            className="rounded-full hover:bg-white"
                            onClick={() => openConvertToCenterDialog(lead)} 
                            title="Convert to Academic Partner"
                          >
                            <Building2 className="w-4 h-4 text-[#256c1d]" />
                          </Button>
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            className="rounded-full hover:bg-white"
                            onClick={() => handleConvert(leadId)} 
                            title="Convert to Student"
                          >
                            <CheckCircle className="w-4 h-4 text-[#256c1d]" />
                          </Button>
                        </>
                      )}
                      <Button variant="ghost" size="sm" className="rounded-full hover:bg-white" onClick={() => handleEdit(lead)}>
                        <Edit className="w-4 h-4" />
                      </Button>
                      <Button variant="ghost" size="sm" className="rounded-full text-red-500 hover:text-red-600 hover:bg-red-50" onClick={() => handleDelete(leadId)}>
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Convert to Academic Partner Dialog */}
      <Dialog open={convertDialogOpen} onOpenChange={setConvertDialogOpen}>
        <DialogContent className="wizard-form rounded-[2rem] border-0 bg-white p-6 sm:p-8" style={{ fontFamily: "Urbanist, ui-sans-serif, system-ui, sans-serif" }}>
          <DialogHeader>
            <DialogTitle className="text-xl font-semibold tracking-tight">Convert Lead to Academic Partner</DialogTitle>
            <p className="text-sm text-muted-foreground mt-2">
              Create a new academic partner from this lead
            </p>
          </DialogHeader>
          <form onSubmit={handleConvertToCenter} className="space-y-4">
            <div>
              <Label htmlFor="center-name">Center Name</Label>
              <Input
                id="center-name"
                value={centerFormData.name}
                onChange={(e) => setCenterFormData({ ...centerFormData, name: e.target.value })}
                required
              />
            </div>
            <div>
              <Label htmlFor="center-code">Center Code</Label>
              <Input
                id="center-code"
                value={centerFormData.code}
                onChange={(e) => setCenterFormData({ ...centerFormData, code: e.target.value })}
                required
                placeholder="e.g., CTR001"
              />
            </div>
            <div>
              <Label htmlFor="center-address">Address</Label>
              <Textarea
                id="center-address"
                value={centerFormData.address}
                onChange={(e) => setCenterFormData({ ...centerFormData, address: e.target.value })}
                required
                rows={2}
              />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="center-contact">Contact</Label>
                <Input
                  id="center-contact"
                  value={centerFormData.contact}
                  onChange={(e) => setCenterFormData({ ...centerFormData, contact: e.target.value })}
                  required
                />
              </div>
              <div>
                <Label htmlFor="center-email">Email</Label>
                <Input
                  id="center-email"
                  type="email"
                  value={centerFormData.email}
                  onChange={(e) => setCenterFormData({ ...centerFormData, email: e.target.value })}
                  required
                />
              </div>
            </div>
            <div className="flex gap-2">
              <Button type="submit" className="flex-1 h-11 rounded-full bg-[#8ae47e] hover:bg-[#7bd96f] text-[#0b1d14] font-semibold">
                <Building2 className="w-4 h-4 mr-2" />
                Create Academic Partner
              </Button>
              <Button
                type="button"
                variant="outline"
                className="h-11 px-6 rounded-full"
                onClick={() => setConvertDialogOpen(false)}
              >
                Cancel
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
