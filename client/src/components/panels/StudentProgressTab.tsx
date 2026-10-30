import { useState, useEffect } from 'react';
import { CheckCircle2, Circle, FileText, Eye, UploadCloud, Save, GraduationCap, Building2, Calendar, ShieldCheck, RefreshCw } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { 
  AlertDialog, 
  AlertDialogAction, 
  AlertDialogCancel, 
  AlertDialogContent, 
  AlertDialogDescription, 
  AlertDialogFooter, 
  AlertDialogHeader, 
  AlertDialogTitle, 
  AlertDialogTrigger 
} from '@/components/ui/alert-dialog';
import { Input } from '@/components/ui/input';
import { useAuth } from '@/hooks/useAuth';
import api from '@/lib/api';
import { toast } from 'sonner';

interface StudentProgressTabProps {
  student: any;
  enrollments?: any[];
  onUpdate?: () => void;
}

const ADMISSION_STEPS_CONFIG = [
  { id: 'portal', label: 'Student Portal Activated', tag: 'Operation Steps' },
  { id: 'verification', label: 'Student Verification', tag: 'Operation Steps' },
  { id: 'docs', label: 'Documents Verification', tag: 'Operation Steps' },
  { id: 'uni_sub', label: 'University Submission', tag: 'Operation Steps' },
  { id: 'enroll_no', label: 'Enrollment Number Updated', tag: 'University Steps' },
  { id: 'batch', label: 'Batch Allocation', tag: 'University Steps' },
  { id: 'uni_portal', label: 'University Portals', tag: 'University Steps' },
];

export function StudentProgressTab({ student, enrollments: initialEnrollments, onUpdate }: StudentProgressTabProps) {
  const { user } = useAuth();
  const isOrgAdmin = ['org_admin', 'superadmin'].includes(user?.role || '');

  // Multi-enrollment management
  const [loadedEnrollments, setLoadedEnrollments] = useState<any[]>(initialEnrollments || []);
  const [selectedEnrollmentId, setSelectedEnrollmentId] = useState<string>('');
  const [loadingEnrollments, setLoadingEnrollments] = useState(false);

  useEffect(() => {
    if (initialEnrollments && initialEnrollments.length > 0) {
      setLoadedEnrollments(initialEnrollments);
      if (!selectedEnrollmentId || !initialEnrollments.some(e => e.id === selectedEnrollmentId)) {
        setSelectedEnrollmentId(initialEnrollments[0].id);
      }
      return;
    }

    if (student?.id) {
      setLoadingEnrollments(true);
      api.get(`/students/${student.id}/enrollments`)
        .then(res => {
          const list = res.data?.data || [];
          setLoadedEnrollments(list);
          if (list.length > 0 && (!selectedEnrollmentId || !list.some((e: any) => e.id === selectedEnrollmentId))) {
            setSelectedEnrollmentId(list[0].id);
          }
        })
        .catch(() => {})
        .finally(() => setLoadingEnrollments(false));
    }
  }, [student?.id, initialEnrollments]);

  const selectedEnrollment = loadedEnrollments.find(e => e.id === selectedEnrollmentId) || loadedEnrollments[0] || null;
  const activeProgram = selectedEnrollment?.program || student?.program || student?.programId;
  const activeEnrollmentNo = selectedEnrollment?.enrollmentNumber || student?.enrollmentNo;

  // Compute admission progress for the active enrollment
  const getActiveAdmissionProgressObj = () => {
    let stuProgress: Record<string, any> = {};
    if (student?.admissionProgress) {
      stuProgress = typeof student.admissionProgress === 'string'
        ? JSON.parse(student.admissionProgress || '{}')
        : (student.admissionProgress || {});
    }
    
    let enrProgress: Record<string, any> = {};
    if (selectedEnrollment?.admissionProgress) {
      enrProgress = typeof selectedEnrollment.admissionProgress === 'string'
        ? JSON.parse(selectedEnrollment.admissionProgress || '{}')
        : (selectedEnrollment.admissionProgress || {});
    }

    // Merge student level and enrollment level, with enrollment taking precedence
    return {
      ...stuProgress,
      ...enrProgress,
    };
  };

  const computeAdmissionSteps = () => {
    const admissionProgressObj = getActiveAdmissionProgressObj();
    const isVerified = ['enrolled', 'document_review', 'finance_review', 'receipt_submitted', 'payment_pending', 'active', 'verified', 'submitted'].includes(selectedEnrollment?.status || '') 
      || ['active', 'payment_pending', 'verified', 'enrolled'].includes(student?.status || '');
    
    const docsPool = (selectedEnrollment?.documents && selectedEnrollment.documents.length > 0) ? selectedEnrollment.documents : student?.documents;
    const hasVerifiedDocs = Array.isArray(docsPool) && docsPool.length > 0 && docsPool.every((d: any) => d.status === 'verified' || d.status === 'approved');
    const isUniversitySubmitted = admissionProgressObj.universitySubmitted === true || admissionProgressObj.uni_sub?.completed === true;
    const hasEnrollmentNo = !!activeEnrollmentNo || admissionProgressObj.enroll_no?.completed === true;
    const isPortalActivated = !!student?.credentials || admissionProgressObj.portal?.completed === true;
    const isBatchAllocated = !!(selectedEnrollment?.sessionId || student?.sessionId || student?.academicBatchId) || admissionProgressObj.batch?.completed === true;

    const autoConditions: Record<string, boolean> = {
      verification: isVerified,
      docs: hasVerifiedDocs,
      uni_sub: isUniversitySubmitted,
      enroll_no: hasEnrollmentNo,
      portal: isPortalActivated,
      batch: isBatchAllocated,
      uni_portal: Boolean(admissionProgressObj.uni_portal?.completed)
    };

    return ADMISSION_STEPS_CONFIG.map(config => {
      const dbData = admissionProgressObj[config.id] || {};
      const isAuto = Boolean(autoConditions[config.id]);
      const isManual = dbData.completed === true;
      // If manually set to false (e.g. reverted by admin), respect false unless auto is active
      const isCompleted = isManual || (dbData.completed !== false && isAuto);
      return {
        id: config.id,
        label: config.label,
        tag: config.tag,
        completed: isCompleted,
        proofUrl: dbData.proofUrl || null
      };
    });
  };

  const [admissionSteps, setAdmissionSteps] = useState(computeAdmissionSteps());

  // Program duration and terms calculation
  const isPgCourse = activeProgram?.name?.toLowerCase().includes('pg');
  const hasSemesters = activeProgram?.hasSemesters;
  const divisor = hasSemesters ? 6 : 12;
  const defaultTerms = isPgCourse ? (hasSemesters ? 4 : 2) : (hasSemesters ? 6 : 3);
  const termsToRender = activeProgram?.duration ? Math.ceil(activeProgram.duration / divisor) : defaultTerms;
  const termLabel = hasSemesters ? 'Semester' : 'Year';

  const computeAcademicTerms = () => {
    let rawAcademicProgress = selectedEnrollment?.academicProgress;
    if ((!Array.isArray(rawAcademicProgress) || rawAcademicProgress.length === 0) && loadedEnrollments.length <= 1) {
      rawAcademicProgress = student?.academicProgress;
    }

    const parsedAcademicProgress = typeof rawAcademicProgress === 'string'
      ? JSON.parse(rawAcademicProgress || '[]')
      : (rawAcademicProgress || []);

    const count = Math.max(termsToRender, Array.isArray(parsedAcademicProgress) ? parsedAcademicProgress.length : 0);

    return Array.from({ length: count }).map((_, i) => {
      const existingTerm = Array.isArray(parsedAcademicProgress) ? parsedAcademicProgress.find((t: any) => t.term === i + 1) : null;
      return existingTerm || {
        term: i + 1,
        feeCollection: 'Auto',
        reRegistration: 'Pending',
        examRegistration: 'Pending',
        resultStatus: 'Pending', 
        remarks: '',
        isSaved: false
      };
    });
  };

  const [academicTerms, setAcademicTerms] = useState(computeAcademicTerms());

  // Re-sync states when selected enrollment or student changes
  useEffect(() => {
    setAdmissionSteps(computeAdmissionSteps());
    setAcademicTerms(computeAcademicTerms());
  }, [selectedEnrollmentId, student, loadedEnrollments]);

  const [modalOpen, setModalOpen] = useState(false);
  const [selectedStep, setSelectedStep] = useState<any>(null);
  const [proofFile, setProofFile] = useState<File | null>(null);
  const [enrollmentNoInput, setEnrollmentNoInput] = useState(activeEnrollmentNo || '');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const openCompletionModal = (step: any) => {
    setSelectedStep(step);
    setProofFile(null);
    if (step.id === 'enroll_no') {
      setEnrollmentNoInput(activeEnrollmentNo || '');
    }
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
      if (selectedEnrollment?.id) {
        formData.append('enrollmentId', selectedEnrollment.id);
      }
      if (file) {
        formData.append('proof', file);
      }

      const res = await api.updateStudentProgress(student.id, stepId, formData, selectedEnrollment?.id);
      if (res.success) {
        toast.success(`Step marked as ${status}`);
        
        // Update local state directly with DB returned data
        const updatedSource = res.enrollment?.admissionProgress || res.data?.admissionProgress;
        const updatedProgressObj = typeof updatedSource === 'string'
          ? JSON.parse(updatedSource)
          : (updatedSource || {});

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

        // Also update loaded enrollments list
        if (selectedEnrollment?.id && res.enrollment) {
          setLoadedEnrollments(list => list.map(enr => enr.id === selectedEnrollment.id ? { ...enr, ...res.enrollment } : enr));
        }
        
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

  const handleConfirmCompletion = async () => {
    if (selectedStep?.id === 'enroll_no') {
      if (!enrollmentNoInput) {
        toast.error('Please enter the enrollment number.');
        return;
      }
      setIsSubmitting(true);
      try {
        const res = await api.updateStudent(student.id, { enrollmentNo: enrollmentNoInput });
        if (res.success) {
          toast.success('Enrollment number updated successfully');
          await submitProgressUpdate(selectedStep.id, 'completed', null);
          if (onUpdate) onUpdate();
        }
      } catch (err: any) {
        console.error(err);
        toast.error('Failed to update enrollment number');
        setIsSubmitting(false);
      }
      return;
    }

    await submitProgressUpdate(selectedStep.id, 'completed', proofFile || null);
  };

  const updateAcademicTerm = (termIndex: number, field: string, value: any) => {
    const updated = [...academicTerms];
    updated[termIndex] = {
      ...updated[termIndex],
      [field]: value
    };
    setAcademicTerms(updated);
  };

  const saveAcademicTerm = async (termIndex: number) => {
    try {
      const updatedTerms = academicTerms.map((t, i) => 
        i === termIndex ? { ...t, isSaved: true } : t
      );
      setAcademicTerms(updatedTerms);
      
      const res = await api.updateStudentAcademicProgress(student.id, {
        enrollmentId: selectedEnrollment?.id,
        academicProgress: updatedTerms
      });
      
      if (res.success) {
        toast.success(`${termLabel} ${updatedTerms[termIndex].term} progress saved successfully.`);
        if (selectedEnrollment?.id && res.enrollment) {
          setLoadedEnrollments(list => list.map(enr => enr.id === selectedEnrollment.id ? { ...enr, ...res.enrollment } : enr));
        }
        if (onUpdate) onUpdate();
      }
    } catch (err: any) {
      console.error(err);
      toast.error('Failed to save academic progress');
      setAcademicTerms(academicTerms);
    }
  };

  const markAsCompleted = async () => {
    try {
      setIsSubmitting(true);
      if (selectedEnrollment?.id) {
        // Mark ONLY the selected enrollment as completed
        await api.put(`/students/${student.id}`, {
          enrollmentId: selectedEnrollment.id,
          status: 'completed'
        });
        setLoadedEnrollments(list => list.map(enr => enr.id === selectedEnrollment.id ? { ...enr, status: 'completed' } : enr));
      } else {
        await api.updateStudent(student.id, { 
          isPrevious: true,
          status: 'completed'
        });
      }
      toast.success('Program marked as completed');
      if (onUpdate) onUpdate();
    } catch (err: any) {
      console.error(err);
      toast.error('Failed to mark program as completed');
    } finally {
      setIsSubmitting(false);
    }
  };

  const markAsDropped = async () => {
    try {
      setIsSubmitting(true);
      if (selectedEnrollment?.id) {
        await api.markEnrollmentDropout(student.id, selectedEnrollment.id, {
          reason: 'Discontinued Program',
          remarks: 'Marked dropped from academic progress tab',
          updateStudentStatus: true
        });
        setLoadedEnrollments(list => list.map(enr => enr.id === selectedEnrollment.id ? { ...enr, status: 'dropped' } : enr));
      } else {
        await api.updateStudent(student.id, { 
          status: 'dropped'
        });
      }
      toast.success('Enrollment marked as dropped');
      if (onUpdate) onUpdate();
    } catch (err: any) {
      console.error(err);
      toast.error('Failed to mark enrollment as dropped');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleTermFileUpload = async (termIndex: number, field: string, e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    setIsSubmitting(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      const res = await api.uploadDocument(formData);
      if (res.success && res.url) {
        updateAcademicTerm(termIndex, field, res.url);
        toast.success('Document uploaded successfully. Remember to save the term!');
      }
    } catch (err: any) {
      console.error(err);
      toast.error('Failed to upload document');
    } finally {
      setIsSubmitting(false);
      e.target.value = '';
    }
  };

  const completedStepsCount = admissionSteps.filter(s => s.completed).length;

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      
      {/* Multi-Enrollment / Program Switcher */}
      {loadedEnrollments.length > 0 && (
        <div className="p-4 rounded-2xl border-2 border-primary/20 bg-gradient-to-r from-primary/5 via-card to-emerald-500/5 shadow-sm space-y-3">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div className="flex items-center gap-2">
              <GraduationCap className="w-5 h-5 text-primary" />
              <h4 className="text-sm font-bold text-foreground uppercase tracking-wider">
                Select Academic Program Progress ({loadedEnrollments.length})
              </h4>
            </div>
            <p className="text-xs text-muted-foreground">Each program upgrade tracks admission and academic steps separately.</p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {loadedEnrollments.map((enr, idx) => {
              const isSelected = (selectedEnrollment?.id === enr.id) || (!selectedEnrollment && idx === 0);
              const isUpgrade = Boolean(enr.isUpgrade || enr.status === 'ops_upgrade_verification');
              const enrProgressRaw = enr.admissionProgress;
              const enrProgressObj = typeof enrProgressRaw === 'string' ? JSON.parse(enrProgressRaw || '{}') : (enrProgressRaw || {});
              
              // Count completed admission steps merging student progress
              const mergedAdm = { ...(typeof student?.admissionProgress === 'object' ? student.admissionProgress : {}), ...enrProgressObj };
              const enrCompletedCount = ADMISSION_STEPS_CONFIG.filter(cfg => mergedAdm[cfg.id]?.completed).length;

              // Academic terms count for this specific enrollment
              const acTerms = Array.isArray(enr.academicProgress) && enr.academicProgress.length > 0
                ? enr.academicProgress
                : (loadedEnrollments.length <= 1 && Array.isArray(student?.academicProgress) ? student.academicProgress : []);
              const passedCount = acTerms.filter((t: any) => t.isSaved && (t.resultStatus === 'Passed' || t.resultStatus === 'Pass')).length;
              const isEnrCompleted = enr.status === 'completed' || (acTerms.length > 0 && passedCount === acTerms.length && acTerms.every((t: any) => t.isSaved));

              return (
                <div
                  key={enr.id}
                  onClick={() => setSelectedEnrollmentId(enr.id)}
                  className={`p-3.5 rounded-xl border-2 cursor-pointer transition-all relative ${
                    isSelected 
                      ? 'border-primary bg-primary/10 shadow-sm ring-1 ring-primary/30' 
                      : 'border-border/60 hover:border-primary/50 bg-card hover:bg-muted/30'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2 mb-1">
                    <h5 className="font-bold text-sm text-foreground line-clamp-1">
                      {enr.program?.name || 'Academic Program'}
                    </h5>
                    {isEnrCompleted ? (
                      <Badge className="bg-emerald-600 text-white text-[9px] font-bold shrink-0">🎓 Completed</Badge>
                    ) : isUpgrade ? (
                      <Badge className="bg-blue-600 text-white text-[9px] font-bold shrink-0">🎓 Upgrade</Badge>
                    ) : (
                      <Badge variant="outline" className="text-[9px] font-bold shrink-0 uppercase">{enr.status?.replace(/_/g, ' ')}</Badge>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground line-clamp-1 mb-2">
                    {enr.program?.university?.name || student?.university?.name || 'Partner University'}
                  </p>
                  
                  <div className="flex items-center justify-between text-[11px] text-muted-foreground pt-2 border-t border-border/40 gap-1 flex-wrap">
                    <span className="font-mono font-medium">{enr.enrollmentNumber || 'No Enroll No'}</span>
                    <div className="flex items-center gap-1.5">
                      {acTerms.length > 0 && (
                        <Badge variant="outline" className="text-[10px] font-semibold bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 border-emerald-200">
                          {passedCount}/{acTerms.length} Sems
                        </Badge>
                      )}
                      <Badge variant="secondary" className="text-[10px] font-semibold">
                        {enrCompletedCount}/7 Steps
                      </Badge>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Program Summary Header for Active Selected Enrollment */}
      {selectedEnrollment && (
        <div className="flex items-center justify-between p-3.5 rounded-xl border bg-muted/30 text-xs">
          <div className="flex items-center gap-2">
            <Building2 className="w-4 h-4 text-primary" />
            <span className="font-medium">Active Program: <strong>{activeProgram?.name}</strong></span>
            {selectedEnrollment.session?.name && (
              <span className="text-muted-foreground">• Session: {selectedEnrollment.session.name}</span>
            )}
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="font-mono text-[11px]">
              Enrollment No: {activeEnrollmentNo || 'Not Assigned'}
            </Badge>
            <Badge className="bg-primary/20 text-primary hover:bg-primary/30 border-primary/30">
              {completedStepsCount} of {admissionSteps.length} Steps Completed
            </Badge>
          </div>
        </div>
      )}
      
      {/* 1. Admission Progress */}
      <div>
        <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
          <span className="flex items-center justify-center w-6 h-6 rounded-full bg-primary/20 text-primary text-sm font-bold">1</span>
          Admission Progress ({activeProgram?.name || 'Program'})
        </h3>
        <Card className="shadow-sm border-border">
          <CardContent className="p-0">
            <div className="flex flex-col">
              {Object.entries(admissionSteps.reduce((acc: any, step) => {
                const group = step.tag || 'Other';
                if (!acc[group]) acc[group] = [];
                acc[group].push(step);
                return acc;
              }, {})).map(([group, steps]: [string, any], index) => (
                <div key={group} className="flex flex-col">
                  <div className={`bg-muted/50 px-4 py-2 border-border ${index === 0 ? 'border-b' : 'border-y'}`}>
                    <span className="font-bold text-sm text-muted-foreground">{group}</span>
                  </div>
                  <div className="divide-y divide-border">
                    {steps.map((step: any) => (
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
                              href={api.getFileUrl(step.proofUrl)} 
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
          Academic Progress — {termsToRender} {termLabel}s ({activeProgram?.name || 'Program'})
        </h3>
        {/* Course Completion Banner */}
        {((selectedEnrollment?.status === 'completed') || (loadedEnrollments.length <= 1 && (student?.status === 'completed' || student?.isPrevious)) || (academicTerms.length > 0 && academicTerms.every(t => t.isSaved && (t.resultStatus === 'Passed' || t.resultStatus === 'Pass')))) && (
          <div className="mb-4 p-4 rounded-xl border border-emerald-200 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-950/30 flex items-center justify-between gap-3 flex-wrap">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-emerald-100 dark:bg-emerald-900/60 flex items-center justify-center text-emerald-700 dark:text-emerald-300 shrink-0">
                <CheckCircle2 className="w-5 h-5" />
              </div>
              <div>
                <h4 className="font-bold text-sm text-emerald-900 dark:text-emerald-100 flex items-center gap-2">
                  Academic Program Completed
                  <Badge className="bg-emerald-600 text-white text-[10px]">All {academicTerms.length} Semesters Recorded</Badge>
                </h4>
                <p className="text-xs text-emerald-700 dark:text-emerald-300">
                  All semester requirements, registrations, marks, and certificates are saved and verified.
                </p>
              </div>
            </div>
            <Badge variant="outline" className="border-emerald-400 text-emerald-800 dark:text-emerald-200 bg-white dark:bg-slate-900 font-bold uppercase text-xs px-3 py-1">
              Status: {selectedEnrollment?.status?.toUpperCase() || (student?.isPrevious ? 'COMPLETED' : student?.status?.toUpperCase()) || 'COMPLETED'}
            </Badge>
          </div>
        )}

        <div className="space-y-4">
          {academicTerms.map((term, index) => {
            return (
              <Card key={index} className="shadow-sm border-border overflow-hidden">
                <div className="bg-muted/40 px-4 py-3 border-b border-border flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-base text-foreground">{termLabel} {term.term}</span>
                    {term.isSaved && (
                      <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200 text-xs">
                        Saved
                      </Badge>
                    )}
                  </div>
                  <Button 
                    size="sm" 
                    variant="outline" 
                    className="h-8 gap-1.5 text-xs"
                    onClick={() => saveAcademicTerm(index)}
                    disabled={isSubmitting}
                  >
                    <Save className="w-3.5 h-3.5" /> Save {termLabel}
                  </Button>
                </div>

                <CardContent className="p-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  {/* Fee Collection */}
                  {/* Fee Collection */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-muted-foreground uppercase">Fee Collection</label>
                    <select
                      className="w-full text-sm border rounded-md px-3 py-1.5 bg-background focus:outline-none focus:ring-1 focus:ring-primary"
                      value={term.feeCollection || 'Auto'}
                      onChange={(e) => updateAcademicTerm(index, 'feeCollection', e.target.value)}
                    >
                      <option value="Auto">Auto (ERP Integrated)</option>
                      <option value="Paid">Paid</option>
                      <option value="Partial">Partial</option>
                      <option value="Pending">Pending</option>
                    </select>
                  </div>

                  {/* Re-Registration */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-muted-foreground uppercase">Re-Registration</label>
                    <div className="flex gap-2">
                      <select
                        className="w-full text-sm border rounded-md px-3 py-1.5 bg-background focus:outline-none focus:ring-1 focus:ring-primary"
                        value={term.reRegistration || 'Pending'}
                        onChange={(e) => updateAcademicTerm(index, 'reRegistration', e.target.value)}
                      >
                        <option value="Pending">Pending</option>
                        <option value="Completed">Completed</option>
                      </select>
                      {(term.reRegistrationDoc || term.reRegistrationProof) ? (
                        <a href={api.getFileUrl(term.reRegistrationDoc || term.reRegistrationProof)} target="_blank" rel="noreferrer" title="View Document">
                          <Button variant="ghost" size="icon" className="h-8 w-8 text-blue-600">
                            <Eye className="w-4 h-4" />
                          </Button>
                        </a>
                      ) : (
                        <label className="cursor-pointer">
                          <Input 
                            type="file" 
                            className="hidden" 
                            onChange={(e) => handleTermFileUpload(index, 'reRegistrationDoc', e)}
                          />
                          <Button variant="outline" size="icon" className="h-8 w-8" asChild>
                            <span><UploadCloud className="w-4 h-4" /></span>
                          </Button>
                        </label>
                      )}
                    </div>
                  </div>

                  {/* Exam Registration */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-muted-foreground uppercase">Exam Registration</label>
                    <div className="flex gap-2">
                      <select
                        className="w-full text-sm border rounded-md px-3 py-1.5 bg-background focus:outline-none focus:ring-1 focus:ring-primary"
                        value={term.examRegistration || 'Pending'}
                        onChange={(e) => updateAcademicTerm(index, 'examRegistration', e.target.value)}
                      >
                        <option value="Pending">Pending</option>
                        <option value="Completed">Completed</option>
                      </select>
                      {(term.examRegistrationDoc || term.examRegistrationProof) ? (
                        <a href={api.getFileUrl(term.examRegistrationDoc || term.examRegistrationProof)} target="_blank" rel="noreferrer" title="View Document">
                          <Button variant="ghost" size="icon" className="h-8 w-8 text-blue-600">
                            <Eye className="w-4 h-4" />
                          </Button>
                        </a>
                      ) : (
                        <label className="cursor-pointer">
                          <Input 
                            type="file" 
                            className="hidden" 
                            onChange={(e) => handleTermFileUpload(index, 'examRegistrationDoc', e)}
                          />
                          <Button variant="outline" size="icon" className="h-8 w-8" asChild>
                            <span><UploadCloud className="w-4 h-4" /></span>
                          </Button>
                        </label>
                      )}
                    </div>
                  </div>

                  {/* Result Status */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-muted-foreground uppercase">Result Status</label>
                    <div className="flex gap-2">
                      <select
                        className="w-full text-sm border rounded-md px-3 py-1.5 bg-background focus:outline-none focus:ring-1 focus:ring-primary"
                        value={term.resultStatus === 'Pass' ? 'Passed' : (term.resultStatus || 'Pending')}
                        onChange={(e) => updateAcademicTerm(index, 'resultStatus', e.target.value)}
                      >
                        <option value="Pending">Pending</option>
                        <option value="Passed">Passed</option>
                        <option value="Failed">Failed</option>
                        <option value="Supplementary">Supplementary</option>
                        <option value="Backlog">Backlog</option>
                        <option value="Withheld">Withheld</option>
                      </select>
                      {(term.resultStatusDoc || term.resultProof) ? (
                        <a href={api.getFileUrl(term.resultStatusDoc || term.resultProof)} target="_blank" rel="noreferrer" title="View Document">
                          <Button variant="ghost" size="icon" className="h-8 w-8 text-blue-600">
                            <Eye className="w-4 h-4" />
                          </Button>
                        </a>
                      ) : (
                        <label className="cursor-pointer">
                          <Input 
                            type="file" 
                            className="hidden" 
                            onChange={(e) => handleTermFileUpload(index, 'resultStatusDoc', e)}
                          />
                          <Button variant="outline" size="icon" className="h-8 w-8" asChild>
                            <span><UploadCloud className="w-4 h-4" /></span>
                          </Button>
                        </label>
                      )}
                    </div>
                  </div>

                  {/* Remarks */}
                  <div className="space-y-1.5 md:col-span-2 lg:col-span-4">
                    <label className="text-xs font-semibold text-muted-foreground uppercase">Remarks</label>
                    <Input 
                      placeholder="Add any specific notes for this term..." 
                      className="text-sm h-8"
                      value={term.remarks || ''}
                      onChange={(e) => updateAcademicTerm(index, 'remarks', e.target.value)}
                    />
                  </div>
                </CardContent>
              </Card>
            );
          })}

          {/* Mark as Completed */}
          <Card className="shadow-sm border-border bg-emerald-50 dark:bg-emerald-950/20">
            <CardContent className="p-4">
              <div className="flex flex-col sm:flex-row items-center gap-4 justify-between">
                <div className="flex items-center gap-3">
                  <FileText className="w-5 h-5 text-emerald-600" />
                  <span className="font-semibold text-emerald-900 dark:text-emerald-100">Certificate Process & Course Completed</span>
                </div>
                <div className="flex items-center gap-2">
                  {isOrgAdmin && (
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button 
                          size="sm" 
                          variant="outline"
                          className="border-rose-300 text-rose-600 hover:bg-rose-50 hover:text-rose-700 dark:border-rose-900/50 dark:text-rose-400 dark:hover:bg-rose-950/40"
                          disabled={isSubmitting || (selectedEnrollment ? selectedEnrollment.status === 'dropped' : student.status === 'dropped')}
                        >
                          {(selectedEnrollment ? selectedEnrollment.status === 'dropped' : student.status === 'dropped') ? 'Dropped' : 'Mark as Dropped'}
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Mark Student as Dropped?</AlertDialogTitle>
                          <AlertDialogDescription>
                            This will mark the current enrollment as dropped/dropout and update student records. Are you sure you want to proceed?
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                          <AlertDialogAction className="bg-rose-600 hover:bg-rose-700 text-white" onClick={markAsDropped}>Confirm Dropout</AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  )}

                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button 
                        size="sm" 
                        className="bg-emerald-600 hover:bg-emerald-700 text-white"
                        disabled={isSubmitting || (selectedEnrollment ? selectedEnrollment.status === 'completed' : student.isPrevious) || !academicTerms.every(t => t.isSaved)}
                      >
                        {(selectedEnrollment ? selectedEnrollment.status === 'completed' : student.isPrevious) ? 'Completed' : 'Mark as Completed'}
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                        <AlertDialogDescription>
                          This will mark the student as completed and move them to the completed students list. Are you sure you want to proceed?
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={markAsCompleted}>Continue</AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
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
              {selectedStep?.id === 'enroll_no' 
                ? 'Please enter the enrollment number to complete this step.'
                : `Please upload proof to mark "${selectedStep?.label}" as completed.`}
            </DialogDescription>
          </DialogHeader>
          
          <div className="py-4 space-y-4">
            {selectedStep?.id === 'enroll_no' ? (
              <div className="space-y-2">
                <label className="text-sm font-medium">Enrollment Number</label>
                <Input 
                  placeholder="Enter enrollment number"
                  value={enrollmentNoInput}
                  onChange={(e) => setEnrollmentNoInput(e.target.value)}
                />
              </div>
            ) : (
              <div className="border-2 border-dashed border-border rounded-lg p-6 flex flex-col items-center justify-center text-center">
                <UploadCloud className="w-10 h-10 text-muted-foreground mb-2" />
                <p className="text-sm font-medium mb-1">Upload Proof Document (Optional)</p>
                <p className="text-xs text-muted-foreground mb-4">Supported formats: PDF, JPG, PNG (Max 10MB). You can also complete without a file.</p>
                <Input 
                  type="file" 
                  className="max-w-xs"
                  onChange={(e) => setProofFile(e.target.files?.[0] || null)}
                  accept=".pdf,.jpg,.jpeg,.png,.webp,.doc,.docx"
                />
              </div>
            )}
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setModalOpen(false)} disabled={isSubmitting}>
              Cancel
            </Button>
            <Button 
              onClick={handleConfirmCompletion} 
              disabled={isSubmitting || (selectedStep?.id === 'enroll_no' && !enrollmentNoInput)}
            >
              {isSubmitting ? 'Saving...' : 'Confirm & Complete'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
