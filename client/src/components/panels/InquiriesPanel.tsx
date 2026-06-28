import { useState, useEffect } from 'react';
import { Mail, Phone, Calendar, RefreshCw, FileText, CheckCircle, Clock } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import api from '@/lib/api';
import { toast } from 'sonner';

export function InquiriesPanel() {
  const [inquiries, setInquiries] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchInquiries = async () => {
    setLoading(true);
    try {
      const res = await api.get('/organizations/inquiries');
      setInquiries(res.data.data || []);
    } catch (err) {
      console.error('Failed to fetch inquiries:', err);
      toast.error('Failed to load inquiries');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInquiries();
  }, []);

  const handleUpdateStatus = async (id: string, newStatus: string) => {
    try {
      await api.patch(`/organizations/inquiries/${id}`, { status: newStatus });
      toast.success(`Inquiry status updated to ${newStatus}`);
      fetchInquiries();
    } catch (err) {
      console.error('Failed to update status:', err);
      toast.error('Failed to update status');
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'processed':
        return <Badge className="bg-emerald-500/10 text-emerald-500 hover:bg-emerald-500/20 border-none font-bold uppercase py-1 text-[10px]">Processed</Badge>;
      case 'pending':
      default:
        return <Badge className="bg-amber-500/10 text-amber-500 hover:bg-amber-500/20 border-none font-bold uppercase py-1 text-[10px]">Pending</Badge>;
    }
  };

  return (
    <Card className="border-none shadow-xl bg-card/60 backdrop-blur-xl">
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle className="text-xl font-bold flex items-center gap-2">
            <FileText className="w-5 h-5 text-indigo-400" /> Organization Management Enquiries
          </CardTitle>
          <CardDescription>
            List of setup requests and onboarding inquiries submitted from the public landing page.
          </CardDescription>
        </div>
        <Button variant="outline" size="icon" className="h-9 w-9" onClick={fetchInquiries} disabled={loading}>
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
        </Button>
      </CardHeader>
      <CardContent>
        {loading && inquiries.length === 0 ? (
          <div className="space-y-4 py-6">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-16 bg-muted rounded-xl animate-pulse" />
            ))}
          </div>
        ) : inquiries.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            <Mail className="w-12 h-12 mx-auto mb-3 opacity-20" />
            <p className="font-medium text-sm">No enquiries found</p>
            <p className="text-xs opacity-60">Submitted requests from "Manage your Organisation" will appear here.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-sm">
              <thead>
                <tr className="border-b border-border text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  <th className="pb-3 pr-4">Organisation</th>
                  <th className="pb-3 px-4">Contact Person</th>
                  <th className="pb-3 px-4">Email</th>
                  <th className="pb-3 px-4">Phone</th>
                  <th className="pb-3 px-4">Remarks / Message</th>
                  <th className="pb-3 px-4">Date</th>
                  <th className="pb-3 px-4">Status</th>
                  <th className="pb-3 pl-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60">
                {inquiries.map((inq: any) => (
                  <tr key={inq.id} className="hover:bg-background/20 group">
                    <td className="py-3 pr-4 font-bold text-foreground">{inq.orgName}</td>
                    <td className="py-3 px-4 text-slate-300 font-semibold">{inq.adminName}</td>
                    <td className="py-3 px-4 text-xs font-medium text-muted-foreground">
                      <div className="flex items-center gap-1.5">
                        <Mail className="w-3.5 h-3.5" /> {inq.email}
                      </div>
                    </td>
                    <td className="py-3 px-4 text-xs font-medium text-muted-foreground">
                      <div className="flex items-center gap-1.5">
                        <Phone className="w-3.5 h-3.5" /> {inq.phone}
                      </div>
                    </td>
                    <td className="py-3 px-4 text-xs text-muted-foreground truncate max-w-[200px]" title={inq.message}>
                      {inq.message || '-'}
                    </td>
                    <td className="py-3 px-4 text-xs text-muted-foreground">
                      <div className="flex items-center gap-1.5">
                        <Calendar className="w-3.5 h-3.5" /> {new Date(inq.createdAt).toLocaleDateString()}
                      </div>
                    </td>
                    <td className="py-3 px-4">{getStatusBadge(inq.status)}</td>
                    <td className="py-3 pl-4 text-right space-x-1.5 whitespace-nowrap">
                      {inq.status !== 'processed' ? (
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          className="h-8 text-emerald-600 hover:text-emerald-500 hover:bg-emerald-500/10 text-xs font-bold"
                          onClick={() => handleUpdateStatus(inq.id, 'processed')}
                        >
                          <CheckCircle className="w-3.5 h-3.5 mr-1" /> Mark Processed
                        </Button>
                      ) : (
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          className="h-8 text-amber-500 hover:text-amber-400 hover:bg-amber-500/10 text-xs font-bold"
                          onClick={() => handleUpdateStatus(inq.id, 'pending')}
                        >
                          <Clock className="w-3.5 h-3.5 mr-1" /> Re-open
                        </Button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
