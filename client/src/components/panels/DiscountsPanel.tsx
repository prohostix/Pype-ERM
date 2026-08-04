import { useState, useEffect } from 'react';
import { Card, CardContent } from '../ui/card';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '../ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { toast } from 'sonner';
import { Tag, Plus, Loader2 } from 'lucide-react';
import { api } from '../../lib/api';

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
  const itemsPerPage = 50;
  
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
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Discounts</h2>
          <p className="text-muted-foreground">Manage program fee discounts for students</p>
        </div>
        <Button onClick={() => setIsDialogOpen(true)} className="gap-2">
          <Plus className="w-4 h-4" />
          Apply Discount
        </Button>
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Student</TableHead>
                <TableHead>Enrollment No</TableHead>
                <TableHead>Program</TableHead>
                <TableHead>Amount</TableHead>
                <TableHead>Reason</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {(() => {
                const totalPages = Math.max(1, Math.ceil(discounts.length / itemsPerPage));
                const paginatedDiscounts = discounts.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);
                return (
                  <>
              {discounts.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                    <Tag className="w-12 h-12 mx-auto mb-3 opacity-20" />
                    No active discounts found
                  </TableCell>
                </TableRow>
              ) : (
                paginatedDiscounts.map((discount) => (
                  <TableRow key={discount.id}>
                    <TableCell className="font-medium">{discount.name}</TableCell>
                    <TableCell>{discount.enrollmentNo}</TableCell>
                    <TableCell>{discount.program?.name}</TableCell>
                    <TableCell className="font-semibold text-green-600">
                      ₹{discount.discountAmount?.toLocaleString()}
                    </TableCell>
                    <TableCell>{discount.discountReason || '-'}</TableCell>
                  </TableRow>
                ))
              )}
                </>
              );
              })()}
            </TableBody>
          </Table>
          
          {/* Pagination Controls */}
          {(() => {
            const totalPages = Math.max(1, Math.ceil(discounts.length / itemsPerPage));
            if (totalPages <= 1) return null;
            return (
              <div className="flex items-center justify-between p-4 border-t bg-slate-50 dark:bg-slate-900/20">
                <div className="text-sm text-muted-foreground">
                  Showing {(currentPage - 1) * itemsPerPage + 1} to {Math.min(currentPage * itemsPerPage, discounts.length)} of {discounts.length} discounts
                </div>
                <div className="flex items-center gap-2">
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                    disabled={currentPage === 1}
                  >
                    Previous
                  </Button>
                  <div className="text-sm font-medium px-2">
                    Page {currentPage} of {totalPages}
                  </div>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                    disabled={currentPage === totalPages}
                  >
                    Next
                  </Button>
                </div>
              </div>
            );
          })()}
        </CardContent>
      </Card>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Apply Discount</DialogTitle>
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
              <Label>Discount Amount (₹)</Label>
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
            <Button variant="outline" onClick={() => setIsDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleApplyDiscount} disabled={submitting || !selectedStudent || !amount}>
              {submitting ? 'Applying...' : 'Apply Discount'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
