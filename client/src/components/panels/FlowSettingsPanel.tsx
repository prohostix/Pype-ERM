import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { GripVertical, ArrowUp, ArrowDown, Save, User, FileCheck, CheckCircle2 } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

interface FlowStep {
  id: string;
  title: string;
  description: string;
  role: string;
  icon: any;
  color: string;
  bg: string;
}

const INITIAL_STEPS: FlowStep[] = [
  { 
    id: 'step-1', 
    title: 'Sales Team', 
    description: 'Enter the student data', 
    role: 'Sales', 
    icon: User, 
    color: 'text-blue-500', 
    bg: 'bg-blue-500/10' 
  },
  { 
    id: 'step-2', 
    title: 'Document Verification', 
    description: 'Operation team - verify the docs', 
    role: 'Operations', 
    icon: FileCheck, 
    color: 'text-orange-500', 
    bg: 'bg-orange-500/10' 
  },
  { 
    id: 'step-3', 
    title: 'Payment & Enrollment', 
    description: 'Finance - verify the payment and enroll student', 
    role: 'Finance', 
    icon: CheckCircle2, 
    color: 'text-green-500', 
    bg: 'bg-green-500/10' 
  },
];

export function FlowSettingsPanel() {
  const [steps, setSteps] = useState<FlowStep[]>(INITIAL_STEPS);
  const [hasChanges, setHasChanges] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  
  // HTML5 Drag and Drop state
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);

  const moveStep = (index: number, direction: 'up' | 'down') => {
    // Prevent moving the first step or moving anything to the first step's position
    if (index === 0) return;
    if (direction === 'up' && index === 1) return;

    const newSteps = [...steps];
    if (direction === 'up' && index > 1) {
      [newSteps[index - 1], newSteps[index]] = [newSteps[index], newSteps[index - 1]];
      setSteps(newSteps);
      setHasChanges(true);
    } else if (direction === 'down' && index < newSteps.length - 1) {
      [newSteps[index + 1], newSteps[index]] = [newSteps[index], newSteps[index + 1]];
      setSteps(newSteps);
      setHasChanges(true);
    }
  };

  const handleDragStart = (e: React.DragEvent, index: number) => {
    if (index === 0) {
      e.preventDefault();
      return;
    }
    setDraggedIndex(index);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', index.toString());
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    if (draggedIndex === null || draggedIndex === index || index === 0) return;
  };

  const handleDrop = (e: React.DragEvent, targetIndex: number) => {
    e.preventDefault();
    if (draggedIndex === null || draggedIndex === targetIndex || targetIndex === 0) {
      setDraggedIndex(null);
      return;
    }

    const newSteps = [...steps];
    const draggedItem = newSteps[draggedIndex];
    
    // Remove the dragged item
    newSteps.splice(draggedIndex, 1);
    // Insert it at the target position
    newSteps.splice(targetIndex, 0, draggedItem);
    
    setSteps(newSteps);
    setHasChanges(true);
    setDraggedIndex(null);
  };

  const handleSave = () => {
    setIsSaving(true);
    // Simulate API call since backend isn't required yet
    setTimeout(() => {
      setIsSaving(false);
      setHasChanges(false);
      toast.success('Student enrollment flow saved successfully');
    }, 800);
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl sm:text-3xl font-semibold tracking-tight">Flow Settings</h2>
        <p className="text-muted-foreground text-sm mt-1.5">
          Configure automated flows and approval pipelines across the organization.
        </p>
      </div>

      <Card className="rounded-3xl bg-white border border-slate-100 shadow-none py-7 gap-5">
        <CardHeader className="px-7">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-lg font-semibold tracking-tight">Student Enrollment Flow</CardTitle>
              <CardDescription className="mt-1">
                Customize the step-by-step process for new student enrollments. Drag and drop or use arrows to rearrange the order.
              </CardDescription>
            </div>
            {hasChanges && (
              <span className="text-xs font-semibold text-amber-700 bg-amber-100 px-3 py-1 rounded-full">
                Unsaved changes
              </span>
            )}
          </div>
        </CardHeader>
        <CardContent className="px-7">
          <div className="space-y-3 relative">
            {steps.map((step, index) => {
              const Icon = step.icon;
              const isFirst = index === 0;
              const isLast = index === steps.length - 1;
              const isDragged = draggedIndex === index;
              
              return (
                <div 
                  key={step.id}
                  draggable={!isFirst}
                  onDragStart={(e) => handleDragStart(e, index)}
                  onDragOver={(e) => handleDragOver(e, index)}
                  onDrop={(e) => handleDrop(e, index)}
                  onDragEnd={() => setDraggedIndex(null)}
                  className={cn(
                    "flex items-center gap-4 p-4 rounded-2xl bg-[#f4f6f3] transition-all duration-200 relative",
                    isDragged ? "opacity-40 ring-2 ring-dashed ring-[#8ae47e]" : "hover:bg-[#eef5ec]",
                    isFirst ? "opacity-80" : "cursor-grab active:cursor-grabbing"
                  )}
                >
                  {/* Connecting Line (except for last item) */}
                  {!isLast && (
                    <div className="absolute left-[39px] top-[48px] bottom-[-24px] w-[2px] bg-[#cfe9c9] z-0" />
                  )}

                  <div className={cn(
                    "z-10 w-5 h-5 flex items-center justify-center",
                    isFirst ? "text-transparent" : "text-muted-foreground/50 hover:text-foreground cursor-grab active:cursor-grabbing"
                  )}>
                    {!isFirst && <GripVertical className="w-5 h-5" />}
                  </div>
                  
                  <div className="w-11 h-11 rounded-2xl bg-white text-[#256c1d] flex items-center justify-center z-10">
                    <Icon className="w-5 h-5" />
                  </div>

                  <div className="flex-1 z-10">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-[11px] font-semibold px-2.5 py-0.5 rounded-full bg-white text-[#256c1d]">
                        Step {index + 1}
                      </span>
                      <h4 className="font-semibold text-base">{step.title}</h4>
                    </div>
                    <p className="text-sm text-muted-foreground">{step.description}</p>
                  </div>

                  <div className="text-xs font-semibold px-3 py-1.5 bg-white text-slate-600 rounded-full hidden sm:block z-10">
                    {step.role}
                  </div>

                  <div className="flex flex-col gap-1 z-10">
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      className="h-8 w-8 rounded-full text-muted-foreground hover:text-[#256c1d] hover:bg-white"
                      disabled={isFirst || index === 1}
                      onClick={(e) => { e.stopPropagation(); moveStep(index, 'up'); }}
                    >
                      <ArrowUp className="w-4 h-4" />
                    </Button>
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      className="h-8 w-8 rounded-full text-muted-foreground hover:text-[#256c1d] hover:bg-white"
                      disabled={isFirst || isLast}
                      onClick={(e) => { e.stopPropagation(); moveStep(index, 'down'); }}
                    >
                      <ArrowDown className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
        <CardFooter className="px-7 flex justify-end">
          <Button 
            onClick={handleSave} 
            disabled={!hasChanges || isSaving}
            className="gap-2 h-11 px-6 rounded-full bg-[#8ae47e] hover:bg-[#7bd96f] text-[#0b1d14] font-semibold"
          >
            <Save className="w-4 h-4" />
            {isSaving ? 'Saving...' : 'Save Flow Order'}
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}
