import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { CheckCircle, XCircle, FileText, Search } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import api from '@/lib/api';
import { toast } from 'sonner';
import { format } from 'date-fns';

export function ProvisionalFinancePanel() {
  const [enrollments, setEnrollments] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [verifying, setVerifying] = useState<string | null>(null);

  useEffect(() => {
    fetchEnrollments();
  }, []);

  const fetchEnrollments = async () => {
    setLoading(true);
    try {
      const res = await api.get('/finance/enrollments/provisional');
      setEnrollments(res.data.data || []);
    } catch (e) {
      toast.error('Failed to load provisional enrollments');
    } finally {
      setLoading(false);
    }
  };

  const handleVerify = async (id: string, amount: number) => {
    setVerifying(id);
    try {
      await api.post(`/finance/enrollments/${id}/provisional-verify`, { amount });
      toast.success('Provisional receipt verified and invoice generated.');
      fetchEnrollments();
    } catch (e: any) {
      toast.error(e.response?.data?.message || 'Verification failed');
    } finally {
      setVerifying(null);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Provisional Verifications</h2>
          <p className="text-muted-foreground text-sm mt-1">Verify payment receipts from provisional enrollments.</p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Pending Receipts</CardTitle>
          <CardDescription>Review and approve provisional payments</CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="space-y-2">{[1,2,3].map(i => <div key={i} className="h-16 bg-muted rounded-md animate-pulse" />)}</div>
          ) : enrollments.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">No pending provisional enrollments.</p>
          ) : (
            <div className="space-y-4">
              {enrollments.map((e) => (
                <div key={e.id} className="flex flex-col md:flex-row md:items-center justify-between p-4 bg-muted/30 rounded-xl border">
                  <div className="space-y-1">
                    <p className="font-bold text-sm">{e.studentName}</p>
                    <p className="text-xs text-muted-foreground">{e.studentEmail} • {e.studentPhone}</p>
                    <p className="text-xs font-medium bg-primary/10 text-primary w-fit px-2 py-0.5 rounded-full">{e.program?.name}</p>
                  </div>
                  
                  <div className="mt-4 md:mt-0 flex items-center gap-3">
                    <Dialog>
                      <DialogTrigger asChild>
                        <Button variant="outline" size="sm">
                          <FileText className="w-4 h-4 mr-2" />
                          View Receipt
                        </Button>
                      </DialogTrigger>
                      <DialogContent className="max-w-3xl h-[80vh] flex flex-col">
                        <DialogHeader>
                          <DialogTitle>Receipt for {e.studentName}</DialogTitle>
                        </DialogHeader>
                        <div className="flex-1 bg-muted rounded-md overflow-hidden relative flex items-center justify-center">
                          {e.receiptUrl ? (
                            e.receiptUrl.toLowerCase().endsWith('.pdf') ? (
                              <iframe src={e.receiptUrl} className="w-full h-full" />
                            ) : (
                              <img src={e.receiptUrl} alt="Receipt" className="max-w-full max-h-full object-contain" />
                            )
                          ) : (
                            <p className="text-muted-foreground">No receipt uploaded.</p>
                          )}
                        </div>
                      </DialogContent>
                    </Dialog>
                    
                    <Button 
                      size="sm" 
                      className="bg-green-600 hover:bg-green-700 text-white"
                      disabled={verifying === e.id}
                      onClick={() => {
                        const amount = window.prompt('Enter verified amount (₹):', '0');
                        if (amount !== null && !isNaN(Number(amount))) {
                          handleVerify(e.id, Number(amount));
                        }
                      }}
                    >
                      <CheckCircle className="w-4 h-4 mr-2" />
                      {verifying === e.id ? 'Verifying...' : 'Verify Receipt'}
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
