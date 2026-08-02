import { useState } from 'react';
import { CheckCircle2, Circle, FileText, Eye, UploadCloud } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { useAuth } from '@/hooks/useAuth';
import api from '@/lib/api';
import { toast } from 'sonner';

interface StudentProgressTabProps {
  student: any;
  onUpdate?: () => void;
}

const ADMISSION_STEPS_CONFIG = [
  { id: 'verification', label: 'Student Verification' },
  { id: 'docs', label: 'Documents Verification' },
  { id: 'uni_sub', label: 'University Submission' },
  { id: 'enroll_no', label: 'Enrollment Number Updated' },
  { id: 'portal', label: 'Student Portal Activated' },
  { id: 'batch', label: 'Batch Allocation' },
];

export function StudentProgressTab({ student, onUpdate }: StudentProgressTabProps) {
  const { user } = useAuth();
  
  // Safely parse admission progress
  const admissionProgressRaw = student?.admissionProgress;
  const admissionProgressObj = typeof admissionProgressRaw === 'string' 
    ? JSON.parse(admissionProgressRaw) 
    : (admissionProgressRaw || {});

  const [admissionSteps, setAdmissionSteps] = useState(
    ADMISSION_STEPS_CONFIG.map(config => {
      const dbData = admissionProgressObj[config.id] || {};
      return {
        id: config.id,
        label: config.label,
        completed: Boolean(dbData.completed),
        proofUrl: dbData.proofUrl || null
      };
    })
  );

  const [modalOpen, setModalOpen] = useState(false);
  const [selectedStep, setSelectedStep] = useState<any>(null);
  const [proofFile, setProofFile] = useState<File | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const isPgCourse = student?.program?.name?.toLowerCase().includes('pg') || student?.programId?.name?.toLowerCase().includes('pg');
  const yearsToRender = isPgCourse ? 2 : 3;

  const [academicYears, setAcademicYears] = useState(
    Array.from({ length: yearsToRender }).map((_, i) => ({
      year: i + 1,
      feeCollection: 'Auto',
      reRegistration: 'Pending',
      examRegistration: 'Pending',
      resultStatus: 'Pending', 
      remarks: ''
    }))
  );

  const openCompletionModal = (step: any) => {
    setSelectedStep(step);
    setProofFile(null);
    setModalOpen(true);
  };

  const handleToggleClick = (step: any) => {
    if (step.completed) {
      if (user?.role !== 'org_admin' && user?.role !== 'superadmin') {
        toast.error('Only Organization Admins can revert progress steps.');
        return;
      }
      if (window.confirm(`Are you sure you want to revert "${step.label}" to pending?`)) {
        submitProgressUpdate(step.id, 'pending', null);
      }
    } else {
      openCompletionModal(step);
    }
  };

  const submitProgressUpdate = async (stepId: string, status: 'completed' | 'pending', file: File | null) => {
    setIsSubmitting(true);
    try {
      const formData = new FormData();
      formData.append('status', status);
      if (file) {
        formData.append('proof', file);
      }

      const res = await api.updateStudentProgress(student.id, stepId, formData);
      if (res.success) {
        toast.success(`Step marked as ${status}`);
        
        // Update local state directly with DB returned data
        const updatedProgressObj = typeof res.data.admissionProgress === 'string'
          ? JSON.parse(res.data.admissionProgress)
          : (res.data.admissionProgress || {});

        setAdmissionSteps(steps => steps.map(s => {
          if (s.id === stepId) {
            const dbData = updatedProgressObj[stepId] || {};
            return {
              ...s,
              completed: Boolean(dbData.completed),
              proofUrl: dbData.proofUrl || null
            };
          }
          return s;
        }));
        
        if (onUpdate) onUpdate();
      }
    } catch (err: any) {
      console.error(err);
      toast.error(err.response?.data?.message || 'Failed to update progress');
    } finally {
      setIsSubmitting(false);
      setModalOpen(false);
    }
  };

  const handleConfirmCompletion = () => {
    if (!proofFile) {
      toast.error('Please upload a proof document to mark this step as completed.');
      return;
    }
    if (selectedStep) {
      submitProgressUpdate(selectedStep.id, 'completed', proofFile);
    }
  };

  const updateAcademicYear = (yearIndex: number, field: string, value: string) => {
    setAcademicYears(years => years.map((y, i) => 
      i === yearIndex ? { ...y, [field]: value } : y
    ));
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      
      {/* 1. Admission Progress */}
      <div>
        <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
          <span className="flex items-center justify-center w-6 h-6 rounded-full bg-primary/20 text-primary text-sm font-bold">1</span>
          Admission Progress
        </h3>
        <Card className="shadow-sm border-border">
          <CardContent className="p-0">
            <div className="divide-y divide-border">
              {admissionSteps.map((step) => (
                <div key={step.id} className="flex items-center justify-between p-4 hover:bg-muted/30 transition-colors">
                  <div className="flex items-center gap-3">
                    {step.completed ? (
                      <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                    ) : (
                      <Circle className="w-5 h-5 text-muted-foreground/30" />
                    )}
                    <span className="font-medium text-sm">{step.label}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    {step.completed && step.proofUrl && (
                      <a 
                        href={`${import.meta.env.VITE_API_URL || ''}${step.proofUrl}`} 
                        target="_blank" 
                        rel="noreferrer"
                      >
                        <Button variant="ghost" size="sm" className="h-7 text-xs flex items-center gap-1 text-blue-600 hover:text-blue-700 hover:bg-blue-50">
                          <Eye className="w-3 h-3" /> View Proof
                        </Button>
                      </a>
                    )}
                    <Button 
                      variant={step.completed ? "outline" : "default"} 
                      size="sm" 
                      className="h-7 text-xs"
                      onClick={() => handleToggleClick(step)}
                      disabled={isSubmitting}
                    >
                      {step.completed ? 'Completed' : 'Pending'}
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 2. Academic Progress */}
      <div>
        <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
          <span className="flex items-center justify-center w-6 h-6 rounded-full bg-primary/20 text-primary text-sm font-bold">2</span>
          Academic Progress
        </h3>
        <div className="space-y-4">
          {academicYears.map((year, index) => (
            <Card key={index} className="shadow-sm border-border overflow-hidden">
              <div className="bg-muted/50 px-4 py-2 border-b border-border flex items-center justify-between">
                <span className="font-bold text-sm">Year {year.year}</span>
              </div>
              <CardContent className="p-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  <div>
                    <span className="text-xs text-muted-foreground uppercase tracking-wider font-semibold block mb-1">Fee Collection</span>
                    <Badge variant="secondary" className="font-medium">Auto</Badge>
                  </div>
                  <div>
                    <span className="text-xs text-muted-foreground uppercase tracking-wider font-semibold block mb-1">Re-registration</span>
                    <select 
                      className="w-full h-8 text-sm bg-background border border-input rounded-md px-2"
                      value={year.reRegistration}
                      onChange={(e) => updateAcademicYear(index, 'reRegistration', e.target.value)}
                    >
                      <option value="Pending">Pending</option>
                      <option value="Completed">Completed</option>
                    </select>
                  </div>
                  <div>
                    <span className="text-xs text-muted-foreground uppercase tracking-wider font-semibold block mb-1">Exam Registration</span>
                    <select 
                      className="w-full h-8 text-sm bg-background border border-input rounded-md px-2"
                      value={year.examRegistration}
                      onChange={(e) => updateAcademicYear(index, 'examRegistration', e.target.value)}
                    >
                      <option value="Pending">Pending</option>
                      <option value="Completed">Completed</option>
                    </select>
                  </div>
                  <div>
                    <span className="text-xs text-muted-foreground uppercase tracking-wider font-semibold block mb-1">Result Status</span>
                    <select 
                      className="w-full h-8 text-sm bg-background border border-input rounded-md px-2"
                      value={year.resultStatus}
                      onChange={(e) => updateAcademicYear(index, 'resultStatus', e.target.value)}
                    >
                      <option value="Pending">⏳ Pending</option>
                      <option value="Passed">✅ Passed</option>
                      <option value="Failed">❌ Failed</option>
                      <option value="Supplementary">🔄 Supplementary</option>
                      <option value="Withheld">🚫 Withheld</option>
                    </select>
                  </div>
                </div>
                
                <div className="mt-4 pt-4 border-t border-border">
                  <span className="text-xs text-muted-foreground uppercase tracking-wider font-semibold block mb-1">Remarks (Optional)</span>
                  <textarea 
                    className="w-full min-h-[60px] text-sm bg-background border border-input rounded-md p-2 placeholder:text-muted-foreground/50"
                    placeholder="e.g. Failed in Mathematics Supplementary Exam on 15-Aug-2026"
                    value={year.remarks}
                    onChange={(e) => updateAcademicYear(index, 'remarks', e.target.value)}
                  />
                </div>
              </CardContent>
            </Card>
          ))}

          {/* Final Steps */}
          <Card className="shadow-sm border-border bg-emerald-50 dark:bg-emerald-950/20">
            <CardContent className="p-4">
              <div className="flex flex-col sm:flex-row items-center gap-4 justify-between">
                <div className="flex items-center gap-3">
                  <FileText className="w-5 h-5 text-emerald-600" />
                  <span className="font-semibold text-emerald-900 dark:text-emerald-100">Certificate Process & Course Completed</span>
                </div>
                <Button size="sm" className="bg-emerald-600 hover:bg-emerald-700 text-white">Mark as Completed</Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Upload Proof Modal */}
      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Complete Step</DialogTitle>
            <DialogDescription>
              Please upload proof to mark "{selectedStep?.label}" as completed.
            </DialogDescription>
          </DialogHeader>
          
          <div className="py-4 space-y-4">
            <div className="border-2 border-dashed border-border rounded-lg p-6 flex flex-col items-center justify-center text-center">
              <UploadCloud className="w-10 h-10 text-muted-foreground mb-2" />
              <p className="text-sm font-medium mb-1">Upload Proof Document</p>
              <p className="text-xs text-muted-foreground mb-4">Supported formats: PDF, JPG, PNG (Max 10MB)</p>
              <Input 
                type="file" 
                className="max-w-xs"
                onChange={(e) => setProofFile(e.target.files?.[0] || null)}
                accept=".pdf,.jpg,.jpeg,.png,.webp,.doc,.docx"
              />
            </div>
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setModalOpen(false)} disabled={isSubmitting}>
              Cancel
            </Button>
            <Button onClick={handleConfirmCompletion} disabled={!proofFile || isSubmitting}>
              {isSubmitting ? 'Saving...' : 'Confirm & Complete'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
