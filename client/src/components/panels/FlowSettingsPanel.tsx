import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Workflow, GripVertical, ArrowUp, ArrowDown, Save, User, FileCheck, CheckCircle2 } from 'lucide-react';
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
      <div className="flex items-center gap-3">
        <div className="p-3 bg-primary/10 rounded-2xl">
          <Workflow className="w-6 h-6 text-primary" />
        </div>
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Flow Settings</h2>
          <p className="text-muted-foreground mt-1">
            Configure automated flows and approval pipelines across the organization.
          </p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Student Enrollment Flow</CardTitle>
              <CardDescription>
                Customize the step-by-step process for new student enrollments. Drag and drop or use arrows to rearrange the order.
              </CardDescription>
            </div>
            {hasChanges && (
              <span className="text-sm font-medium text-amber-500 bg-amber-500/10 px-3 py-1 rounded-full animate-pulse">
                Unsaved changes
              </span>
            )}
          </div>
        </CardHeader>
        <CardContent>
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
                    "flex items-center gap-4 p-4 rounded-xl border bg-card transition-all duration-200 relative",
                    isDragged ? "opacity-40 border-dashed border-primary" : "hover:border-primary/50 hover:shadow-md",
                    isFirst ? "opacity-80 bg-slate-50 dark:bg-slate-900/50" : "cursor-grab active:cursor-grabbing"
                  )}
                >
                  {/* Connecting Line (except for last item) */}
                  {!isLast && (
                    <div className="absolute left-[39px] top-[48px] bottom-[-24px] w-[2px] bg-border z-0" />
                  )}

                  <div className={cn(
                    "z-10 w-5 h-5 flex items-center justify-center",
                    isFirst ? "text-transparent" : "text-muted-foreground/50 hover:text-foreground cursor-grab active:cursor-grabbing"
                  )}>
                    {!isFirst && <GripVertical className="w-5 h-5" />}
                  </div>
                  
                  <div className={cn("p-3 rounded-xl z-10", step.bg, step.color)}>
                    <Icon className="w-6 h-6" />
                  </div>

                  <div className="flex-1 z-10">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-xs font-bold px-2 py-0.5 rounded-md bg-muted text-muted-foreground">
                        Step {index + 1}
                      </span>
                      <h4 className="font-semibold text-base">{step.title}</h4>
                    </div>
                    <p className="text-sm text-muted-foreground">{step.description}</p>
                  </div>

                  <div className="text-sm font-medium px-3 py-1 bg-secondary/50 rounded-lg hidden sm:block z-10">
                    {step.role}
                  </div>

                  <div className="flex flex-col gap-1 z-10">
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      className="h-8 w-8 text-muted-foreground hover:text-primary"
                      disabled={isFirst || index === 1}
                      onClick={(e) => { e.stopPropagation(); moveStep(index, 'up'); }}
                    >
                      <ArrowUp className="w-4 h-4" />
                    </Button>
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      className="h-8 w-8 text-muted-foreground hover:text-primary"
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
        <CardFooter className="bg-muted/30 border-t p-4 px-6 flex justify-end">
          <Button 
            onClick={handleSave} 
            disabled={!hasChanges || isSaving}
            className="gap-2"
          >
            <Save className="w-4 h-4" />
            {isSaving ? 'Saving...' : 'Save Flow Order'}
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}
