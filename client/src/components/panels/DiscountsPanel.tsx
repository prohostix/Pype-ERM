import { useState, useEffect } from 'react';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '../ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { toast } from 'sonner';
import { Tag, Plus, Loader2 } from 'lucide-react';
import { api } from '../../lib/api';

import { CS } from '@/lib/currency';
import { ListPagination } from '@/components/ui/list-pagination';
interface StudentDiscount {
  id: string;
  name: string;
  enrollmentNo: string;
  discountAmount: number;
  discountReason: string;
  program: {
    name: string;
  };
}

interface StudentOption {
  id: string;
  name: string;
  enrollmentNo: string;
}

export function DiscountsPanel() {
  const [discounts, setDiscounts] = useState<StudentDiscount[]>([]);
  const [students, setStudents] = useState<StudentOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  
  // Pagination State
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  
  const [selectedStudent, setSelectedStudent] = useState<string>('');
  const [amount, setAmount] = useState<string>('');
  const [reason, setReason] = useState<string>('');
  
  
  const fetchDiscounts = async () => {
    try {
      const res = await api.get('/finance/discounts');
      setDiscounts(res.data.data);
    } catch (error) {
      console.error('Failed to fetch discounts:', error);
      toast.error('Failed to load discounts');
    }
  };

  const fetchStudents = async () => {
    try {
      const res = await api.get('/students');
      setStudents(res.data.data);
    } catch (error) {
      console.error('Failed to fetch students:', error);
    }
  };

  useEffect(() => {
    Promise.all([fetchDiscounts(), fetchStudents()]).finally(() => {
      setLoading(false);
    });
  }, []);

  const handleApplyDiscount = async () => {
    if (!selectedStudent || !amount) {
      toast.error('Please select a student and enter an amount');
      return;
    }

    setSubmitting(true);
    try {
      await api.post('/finance/discounts', {
        studentId: selectedStudent,
        discountAmount: Number(amount),
        discountReason: reason
      });
      
      toast.success('Discount applied successfully');
      
      setIsDialogOpen(false);
      setSelectedStudent('');
      setAmount('');
      setReason('');
      
      // Refresh list
      fetchDiscounts();
    } catch (error: any) {
      console.error('Failed to apply discount:', error);
      toast.error(error.response?.data?.message || 'Failed to apply discount');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-[#54b947]" />
      </div>
    );
  }

  const validDiscounts = discounts.filter(d => d?.id);
  const pagedDiscounts = validDiscounts.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  return (
    <div className="space-y-6 wizard-form">
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-2xl sm:text-3xl font-semibold tracking-tight">Discounts</h2>
          <p className="text-muted-foreground text-sm mt-1.5">Manage program fee discounts for students</p>
        </div>
        <Button onClick={() => setIsDialogOpen(true)} className="h-11 px-5 rounded-full bg-[#8ae47e] hover:bg-[#7bd96f] text-[#0b1d14] font-semibold gap-2">
          <Plus className="w-4 h-4" />
          Apply Discount
        </Button>
      </div>

      <div className="rounded-3xl bg-white border border-slate-100 overflow-hidden">
        <div className="px-6 py-5 flex items-center justify-between border-b border-slate-100">
          <h3 className="text-lg font-semibold tracking-tight">Active Discounts</h3>
          <span className="rounded-full bg-[#eaf6e6] text-[#256c1d] text-xs font-semibold px-3 py-1">{validDiscounts.length} total</span>
        </div>
        <div className="p-4 sm:p-5">
          {validDiscounts.length === 0 ? (
            <div className="text-center py-14 text-muted-foreground">
              <div className="w-14 h-14 rounded-2xl bg-[#eaf6e6] text-[#256c1d] flex items-center justify-center mx-auto mb-3"><Tag className="w-6 h-6" /></div>
              <p className="text-sm">No active discounts found</p>
            </div>
          ) : (
            <div className="space-y-3">
              {pagedDiscounts.map((discount) => (
                <div key={discount.id} className="flex flex-col md:flex-row md:items-center justify-between gap-3 p-4 rounded-2xl bg-[#f4f6f3] hover:bg-[#eef5ec] transition-colors">
                  <div className="flex items-center gap-4 min-w-0">
                    <div className="w-11 h-11 rounded-2xl bg-white text-[#256c1d] flex items-center justify-center shrink-0">
                      <Tag className="w-5 h-5" />
                    </div>
                    <div className="min-w-0">
                      <div className="font-semibold text-slate-900 truncate">{discount.name}</div>
                      <div className="text-xs text-muted-foreground mt-0.5 flex flex-wrap gap-x-3">
                        <span className="font-mono">{discount.enrollmentNo}</span>
                        {discount.program?.name && <span>{discount.program.name}</span>}
                      </div>
                      {discount.discountReason && <div className="text-xs text-slate-500 mt-1">“{discount.discountReason}”</div>}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-[11px] font-medium text-slate-500">Discount</div>
                    <div className="text-lg font-semibold text-[#256c1d]">{CS()}{discount.discountAmount?.toLocaleString()}</div>
                  </div>
                </div>
              ))}
              <ListPagination
                total={validDiscounts.length}
                page={currentPage}
                pageSize={itemsPerPage}
                onPageChange={setCurrentPage}
                onPageSizeChange={(n) => { setItemsPerPage(n); setCurrentPage(1); }}
              />
            </div>
          )}
        </div>
      </div>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="wizard-form rounded-[2rem] border-0 bg-white p-6 sm:p-8" style={{ fontFamily: "Urbanist, ui-sans-serif, system-ui, sans-serif" }}>
          <DialogHeader>
            <DialogTitle className="text-xl font-semibold tracking-tight">Apply Discount</DialogTitle>
            <DialogDescription>
              This discount will be deducted from the student's total program fee.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Select Student</Label>
              <Select value={selectedStudent} onValueChange={setSelectedStudent}>
                <SelectTrigger>
                  <SelectValue placeholder="Choose a student" />
                </SelectTrigger>
                <SelectContent className="max-h-[300px]">
                  {students.map((student) => (
                    <SelectItem key={student.id} value={student.id}>
                      {student.name} ({student.enrollmentNo})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Discount Amount ({CS()})</Label>
              <Input 
                type="number" 
                min="0"
                placeholder="e.g. 5000" 
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Reason (Optional)</Label>
              <Input 
                placeholder="e.g. Merit Scholarship" 
                value={reason}
                onChange={(e) => setReason(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" className="h-11 px-6 rounded-full" onClick={() => setIsDialogOpen(false)}>Cancel</Button>
            <Button className="h-11 px-6 rounded-full bg-[#8ae47e] hover:bg-[#7bd96f] text-[#0b1d14] font-semibold" onClick={handleApplyDiscount} disabled={submitting || !selectedStudent || !amount}>
              {submitting ? 'Applying...' : 'Apply Discount'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
