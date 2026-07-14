import { useState } from 'react';
import { CheckCircle2, Circle, FileText } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

interface StudentProgressTabProps {
  student: any;
}

export function StudentProgressTab({ student }: StudentProgressTabProps) {
  // Mock data for progression (in a real app, this would come from the API)
  const isPgCourse = student?.program?.name?.toLowerCase().includes('pg') || student?.programId?.name?.toLowerCase().includes('pg');
  const yearsToRender = isPgCourse ? 2 : 3;
  
  const [admissionSteps, setAdmissionSteps] = useState([
    { id: 'verification', label: 'Student Verification', completed: true },
    { id: 'docs', label: 'Documents Verification', completed: true },
    { id: 'uni_sub', label: 'University Submission', completed: false },
    { id: 'enroll_no', label: 'Enrollment Number Updated', completed: false },
    { id: 'portal', label: 'Student Portal Activated', completed: false },
    { id: 'batch', label: 'Batch Allocation', completed: false },
  ]);

  const [academicYears, setAcademicYears] = useState(
    Array.from({ length: yearsToRender }).map((_, i) => ({
      year: i + 1,
      feeCollection: 'Auto',
      reRegistration: 'Pending',
      examRegistration: 'Pending',
      resultStatus: 'Pending', // Pending, Passed, Failed, Supplementary, Withheld
      remarks: ''
    }))
  );

  const toggleAdmissionStep = (id: string) => {
    setAdmissionSteps(steps => steps.map(step => 
      step.id === id ? { ...step, completed: !step.completed } : step
    ));
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
                  <Button 
                    variant={step.completed ? "outline" : "default"} 
                    size="sm" 
                    className="h-7 text-xs"
                    onClick={() => toggleAdmissionStep(step.id)}
                  >
                    {step.completed ? 'Completed' : 'Pending'}
                  </Button>
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
    </div>
  );
}
