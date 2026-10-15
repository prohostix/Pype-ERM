import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Upload, FileText, Send, CheckCircle2, Loader2, X, RefreshCw } from 'lucide-react';
import api from '@/lib/api';
import { toast } from 'sonner';
import { shrinkImage, TARGET_MAX_BYTES } from '@/lib/uploadFile';

export function ProvisionalEnrollmentPanel() {
  const [programs, setPrograms] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [compressing, setCompressing] = useState(false);
  
  const [form, setForm] = useState({ 
    studentName: '', 
    studentEmail: '', 
    studentPhone: '', 
    universityId: 'all',
    programId: '',
    initialPaymentAmount: ''
  });
  const [receiptFile, setReceiptFile] = useState<File | null>(null);
  const [receiptPreviewUrl, setReceiptPreviewUrl] = useState<string | null>(null);

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    if (!receiptFile) {
      setReceiptPreviewUrl(null);
      return;
    }
    const ext = (receiptFile.name.split('.').pop() || '').toLowerCase();
    const isImage = receiptFile.type.startsWith('image/') || ['jpg', 'jpeg', 'png', 'webp', 'gif'].includes(ext);
    if (isImage) {
      const url = URL.createObjectURL(receiptFile);
      setReceiptPreviewUrl(url);
      return () => URL.revokeObjectURL(url);
    } else {
      setReceiptPreviewUrl(null);
    }
  }, [receiptFile]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const progsRes = await api.get('/enrollment/programs');
      setPrograms(progsRes.data.data || []);
    } catch (e) {
      toast.error('Failed to load programs');
    } finally {
      setLoading(false);
    }
  };

  const handleReceiptChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const ext = (file.name.split('.').pop() || '').toLowerCase();
    const isImage = file.type.startsWith('image/') || ['jpg', 'jpeg', 'png', 'webp', 'gif'].includes(ext);
    const isPdf = file.type === 'application/pdf' || ext === 'pdf';

    if (!isImage && !isPdf) {
      toast.error('Unsupported file format. Please upload a JPG, PNG, or PDF receipt.');
      e.target.value = '';
      return;
    }

    const originalMB = (file.size / (1024 * 1024)).toFixed(2);

    // Case 1: Image file (supports adaptive browser compression)
    if (isImage) {
      if (file.size > TARGET_MAX_BYTES) {
        const toastId = toast.loading(`Compressing receipt image (${originalMB} MB)...`);
        setCompressing(true);
        try {
          const compressed = await shrinkImage(file, TARGET_MAX_BYTES);
          const compressedMB = (compressed.size / (1024 * 1024)).toFixed(2);

          if (compressed.size > TARGET_MAX_BYTES) {
            toast.error(`Image is too large (${compressedMB} MB). Maximum allowed size is 2 MB.`, { id: toastId });
            setReceiptFile(null);
            e.target.value = '';
            return;
          }

          setReceiptFile(compressed);
          toast.success(`Image compressed from ${originalMB} MB to ${compressedMB} MB`, { id: toastId });
        } catch (err) {
          console.error('Image compression error:', err);
          toast.error('Failed to compress receipt image. Please select a file under 2 MB.', { id: toastId });
          setReceiptFile(null);
          e.target.value = '';
        } finally {
          setCompressing(false);
        }
      } else {
        setReceiptFile(file);
        toast.success(`Receipt selected (${originalMB} MB)`);
      }
      return;
    }

    // Case 2: PDF file
    if (isPdf) {
      if (file.size > TARGET_MAX_BYTES) {
        toast.error(`File size exceeds 2 MB limit (${originalMB} MB). Please compress your PDF before uploading or select a file under 2 MB.`);
        setReceiptFile(null);
        e.target.value = '';
        return;
      }

      setReceiptFile(file);
      toast.success(`PDF receipt selected (${originalMB} MB)`);
    }
  };

  const handleRemoveReceipt = () => {
    setReceiptFile(null);
    const input = document.getElementById('receipt-upload') as HTMLInputElement | null;
    if (input) input.value = '';
    toast.info('Receipt removed');
  };

  const handleSubmit = async () => {
    if (!form.studentName || !form.studentPhone || !form.studentEmail || !form.programId || !form.initialPaymentAmount) {
      toast.error('Please fill in all details including the initial payment amount');
      return;
    }
    if (!receiptFile) {
      toast.error('Please upload a payment receipt');
      return;
    }

    let fileToUpload = receiptFile;
    if (fileToUpload.size > TARGET_MAX_BYTES) {
      const ext = (fileToUpload.name.split('.').pop() || '').toLowerCase();
      const isImg = fileToUpload.type.startsWith('image/') || ['jpg', 'jpeg', 'png', 'webp', 'gif'].includes(ext);
      if (isImg) {
        const tid = toast.loading('Compressing receipt before submission...');
        try {
          fileToUpload = await shrinkImage(fileToUpload, TARGET_MAX_BYTES);
          toast.dismiss(tid);
        } catch (err) {
          toast.error('Failed to compress receipt image', { id: tid });
          return;
        }
      } else {
        toast.error(`Receipt exceeds 2 MB limit (${(fileToUpload.size / (1024 * 1024)).toFixed(2)} MB). Please select a file under 2 MB.`);
        return;
      }
    }

    setSubmitting(true);
    const submitToast = toast.loading('Submitting provisional enrollment & uploading receipt...');
    try {
      // 1. Create Provisional Enrollment
      const res = await api.post('/enrollment/enroll', {
        ...form,
        initialPaymentAmount: Number(form.initialPaymentAmount),
        initialPaymentDate: new Date().toISOString(),
        isProvisional: true,
        status: 'provisional_finance_pending',
        studentAddress: 'To be filled', // placeholder
      });
      
      const enrollmentId = res.data.data.id;

      // 2. Upload Receipt
      const formData = new FormData();
      formData.append('receipt', fileToUpload);
      await api.post(`/enrollment/${enrollmentId}/receipt`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });

      toast.success('Provisional Enrollment submitted to Finance', { id: submitToast });
      setForm({ studentName: '', studentEmail: '', studentPhone: '', universityId: 'all', programId: '', initialPaymentAmount: '' });
      setReceiptFile(null);
      const input = document.getElementById('receipt-upload') as HTMLInputElement | null;
      if (input) input.value = '';
    } catch (e: any) {
      toast.error(e.response?.data?.message || 'Submission failed', { id: submitToast });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <h2 className="text-2xl font-bold">Provisional Enrollment</h2>
        <p className="text-muted-foreground text-sm mt-1">Quickly enroll a student with minimal details and send directly to Finance for receipt verification.</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Student Details</CardTitle>
          <CardDescription>Enter basic information to initiate provisional enrollment.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-1">
            <Label>University</Label>
            <Select 
              value={form.universityId} 
              onValueChange={v => setForm(f => ({ ...f, universityId: v, programId: '' }))}
            >
              <SelectTrigger><SelectValue placeholder="All Universities" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Universities</SelectItem>
                {Array.from(new Map(
                  programs
                    .filter(p => p.university && p.university.id)
                    .map(p => [p.university.id, p.university])
                ).values()).map((u: any) => (
                  <SelectItem key={u.id} value={u.id}>{u.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1">
            <Label>Program</Label>
            <Select value={form.programId} onValueChange={v => setForm(f => ({ ...f, programId: v }))}>
              <SelectTrigger><SelectValue placeholder="Select a program" /></SelectTrigger>
              <SelectContent>
                {(form.universityId === 'all' ? programs : programs.filter(p => p.university?.id === form.universityId)).map(p => (
                  <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          
          <div className="space-y-1">
            <Label>Student Full Name</Label>
            <Input value={form.studentName} onChange={e => setForm(f => ({ ...f, studentName: e.target.value }))} placeholder="John Doe" />
          </div>

          <div className="space-y-1">
            <Label>Email</Label>
            <Input type="email" value={form.studentEmail} onChange={e => setForm(f => ({ ...f, studentEmail: e.target.value }))} placeholder="john@example.com" />
          </div>

          <div className="space-y-1">
            <Label>Phone Number</Label>
            <Input value={form.studentPhone} onChange={e => setForm(f => ({ ...f, studentPhone: e.target.value }))} placeholder="+91 9876543210" />
          </div>

          <div className="space-y-1">
            <Label>Initial Payment Amount</Label>
            <Input type="number" value={form.initialPaymentAmount} onChange={e => setForm(f => ({ ...f, initialPaymentAmount: e.target.value }))} placeholder="0.00" min="0" step="0.01" />
          </div>

          <div className="space-y-2 pt-2">
            <div className="flex items-center justify-between">
              <Label className="text-sm font-semibold">Payment Receipt</Label>
              <span className="text-[11px] text-muted-foreground font-normal">
                Max limit: 2 MB • Auto-compresses images
              </span>
            </div>

            <div 
              className={`border-2 border-dashed rounded-xl p-5 text-center transition-all ${
                compressing 
                  ? 'border-blue-400 bg-blue-50/50 dark:bg-blue-950/20' 
                  : receiptFile 
                    ? 'border-emerald-300 dark:border-emerald-800 bg-emerald-50/30 dark:bg-emerald-950/20' 
                    : 'border-border hover:border-primary/50 hover:bg-muted/40 cursor-pointer'
              }`}
              onClick={() => {
                if (!compressing && !submitting) {
                  document.getElementById('receipt-upload')?.click();
                }
              }}
            >
              <input 
                id="receipt-upload" 
                type="file" 
                className="hidden" 
                accept="image/*,.pdf"
                disabled={compressing || submitting}
                onChange={handleReceiptChange}
              />
              
              {compressing ? (
                <div className="flex flex-col items-center justify-center py-3 space-y-2">
                  <div className="p-3 bg-blue-100 text-blue-600 dark:bg-blue-900/50 dark:text-blue-400 rounded-full animate-pulse">
                    <Loader2 className="w-6 h-6 animate-spin" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-blue-700 dark:text-blue-300">Compressing receipt image...</p>
                    <p className="text-xs text-muted-foreground mt-0.5">Optimizing quality to stay comfortably under 2 MB</p>
                  </div>
                </div>
              ) : receiptFile ? (
                <div className="flex flex-col items-center space-y-3 py-1">
                  {receiptPreviewUrl ? (
                    <div className="relative group">
                      <img 
                        src={receiptPreviewUrl} 
                        alt="Receipt Preview" 
                        className="h-28 w-auto max-w-full object-contain rounded-lg border bg-background shadow-sm" 
                      />
                    </div>
                  ) : (
                    <div className="p-3 bg-primary/10 text-primary rounded-xl">
                      <FileText className="w-10 h-10" />
                    </div>
                  )}

                  <div className="flex flex-wrap items-center justify-center gap-2">
                    <span className="font-semibold text-xs sm:text-sm text-foreground truncate max-w-[220px]" title={receiptFile.name}>
                      {receiptFile.name}
                    </span>
                    <span className="inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 font-medium border border-emerald-200 dark:border-emerald-800">
                      <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                      {(receiptFile.size / (1024 * 1024)).toFixed(2)} MB
                    </span>
                  </div>

                  <div className="flex items-center gap-2 pt-1" onClick={(e) => e.stopPropagation()}>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="h-7 text-xs px-2.5"
                      onClick={() => document.getElementById('receipt-upload')?.click()}
                    >
                      <RefreshCw className="w-3 h-3 mr-1.5 text-muted-foreground" />
                      Change File
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="h-7 text-xs px-2.5 text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950/40"
                      onClick={handleRemoveReceipt}
                    >
                      <X className="w-3.5 h-3.5 mr-1" />
                      Remove
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-2 space-y-2">
                  <div className="p-3 bg-primary/10 text-primary rounded-full">
                    <Upload className="w-6 h-6" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-foreground">Click to upload payment receipt</p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      JPG, PNG, or PDF up to 2 MB (large images auto-compressed)
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>

          <Button 
            className="w-full mt-4" 
            onClick={handleSubmit} 
            disabled={submitting || compressing}
          >
            {compressing ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Compressing Receipt...
              </>
            ) : submitting ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Submitting to Finance...
              </>
            ) : (
              <>
                Submit to Finance
                <Send className="w-4 h-4 ml-2" />
              </>
            )}
          </Button>
        </CardContent>
      </Card>
      
    </div>
  );
}

