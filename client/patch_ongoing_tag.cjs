const fs = require('fs');
const path = './src/components/panels/FacultyClassContentPanel.tsx';
let code = fs.readFileSync(path, 'utf8');

const oldTag = `<p key={ba.id} className="text-xs text-muted-foreground flex items-center gap-1 bg-indigo-50 dark:bg-indigo-900/20 px-2 py-0.5 rounded w-fit border border-indigo-100 dark:border-indigo-800">
                                        <User className="w-3 h-3 text-indigo-500" /> {ba.academicBatch?.name}: <span className="font-medium text-foreground">{ba.faculty?.name}</span>
                                      </p>`;

const newTag = `<p key={ba.id} className="text-xs text-muted-foreground flex items-center gap-1 bg-indigo-50 dark:bg-indigo-900/20 px-2 py-0.5 rounded w-fit border border-indigo-100 dark:border-indigo-800">
                                        <User className="w-3 h-3 text-indigo-500" /> {ba.academicBatch?.name}: <span className="font-medium text-foreground">{ba.faculty?.name}</span>
                                        {lesson.academicSessions?.some((s: any) => s.academicBatchId === ba.academicBatchId) && (
                                          <span className="ml-2 inline-flex items-center gap-1 text-[10px] bg-red-100 text-red-600 px-1.5 py-0.5 rounded border border-red-200 uppercase font-bold tracking-wider">
                                            <div className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
                                            Ongoing
                                          </span>
                                        )}
                                      </p>`;

code = code.replace(oldTag, newTag);

// Automatically update state on start class
const oldStartSubmit = `      toast.success('Class session started successfully!');
      setStartClassDialogOpen(false);`;

const newStartSubmit = `      toast.success('Class session started successfully!');
      setStartClassDialogOpen(false);
      // Immediately reflect the Ongoing tag locally
      setModules(prev => prev.map(m => {
        if (m.id !== startClassLesson.classModuleId) return m;
        return {
          ...m,
          lessons: m.lessons.map((l: any) => {
            if (l.id !== startClassLesson.id) return l;
            return {
              ...l,
              academicSessions: [...(l.academicSessions || []), { academicBatchId: startClassBatchId }]
            };
          })
        };
      }));`;

code = code.replace(oldStartSubmit, newStartSubmit);

fs.writeFileSync(path, code);
console.log('Patched FacultyClassContentPanel');
