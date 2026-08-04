const fs = require('fs');
const path = './client/src/components/panels/StudentProgressTab.tsx';
let content = fs.readFileSync(path, 'utf8');

// 1. Add Save icon to lucide-react import
content = content.replace(
  "import { CheckCircle2, Circle, FileText, Eye, UploadCloud } from 'lucide-react';",
  "import { CheckCircle2, Circle, FileText, Eye, UploadCloud, Save } from 'lucide-react';"
);

// 2. Initialize academicTerms properly
content = content.replace(
  /const \[academicTerms, setAcademicTerms\] = useState\([\s\S]*?\}\)\)\n  \);/m,
  `const parsedAcademicProgress = typeof student?.academicProgress === 'string'
    ? JSON.parse(student.academicProgress)
    : (student?.academicProgress || []);

  const [academicTerms, setAcademicTerms] = useState(
    Array.from({ length: semestersToRender }).map((_, i) => {
      const existingTerm = parsedAcademicProgress.find((t: any) => t.term === i + 1);
      return existingTerm || {
        term: i + 1,
        feeCollection: 'Auto',
        reRegistration: 'Pending',
        examRegistration: 'Pending',
        resultStatus: 'Pending', 
        remarks: '',
        isSaved: false
      };
    })
  );`
);

// 3. Add saveAcademicTerm function
content = content.replace(
  /  const updateAcademicTerm = \(termIndex: number, field: string, value: string\) => \{[\s\S]*?\}\);\n  \};/m,
  `  const updateAcademicTerm = (termIndex: number, field: string, value: string) => {
    setAcademicTerms(terms => terms.map((t, i) => 
      i === termIndex ? { ...t, [field]: value } : t
    ));
  };

  const saveAcademicTerm = async (termIndex: number) => {
    try {
      const updatedTerms = academicTerms.map((t, i) => 
        i === termIndex ? { ...t, isSaved: true } : t
      );
      setAcademicTerms(updatedTerms);
      
      const res = await api.updateStudent(student.id, {
        academicProgress: updatedTerms
      });
      
      if (res.success) {
        toast.success(\`Semester \${updatedTerms[termIndex].term} progress saved successfully.\`);
        if (onUpdate) onUpdate();
      }
    } catch (err: any) {
      console.error(err);
      toast.error('Failed to save academic progress');
      // Revert if failed
      setAcademicTerms(academicTerms);
    }
  };`
);

// 4. Update the render logic for the academicTerms map
content = content.replace(
  /          \{academicTerms\.map\(\(term, index\) => \([\s\S]*?<\/Card>\n          \)\)\}/m,
  `          {academicTerms.map((term, index) => {
            const isTermDisabled = term.isSaved && (user?.role !== 'org_admin' && user?.role !== 'superadmin');

            return (
            <Card key={index} className="shadow-sm border-border overflow-hidden">
              <div className="bg-muted/50 px-4 py-2 border-b border-border flex items-center justify-between">
                <span className="font-bold text-sm">Semester {term.term}</span>
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
                      className="w-full h-8 text-sm bg-background border border-input rounded-md px-2 disabled:opacity-50"
                      value={term.reRegistration}
                      onChange={(e) => updateAcademicTerm(index, 'reRegistration', e.target.value)}
                      disabled={isTermDisabled}
                    >
                      <option value="Pending">Pending</option>
                      <option value="Completed">Completed</option>
                    </select>
                  </div>
                  <div>
                    <span className="text-xs text-muted-foreground uppercase tracking-wider font-semibold block mb-1">Exam Registration</span>
                    <select 
                      className="w-full h-8 text-sm bg-background border border-input rounded-md px-2 disabled:opacity-50"
                      value={term.examRegistration}
                      onChange={(e) => updateAcademicTerm(index, 'examRegistration', e.target.value)}
                      disabled={isTermDisabled}
                    >
                      <option value="Pending">Pending</option>
                      <option value="Completed">Completed</option>
                    </select>
                  </div>
                  <div>
                    <span className="text-xs text-muted-foreground uppercase tracking-wider font-semibold block mb-1">Result Status</span>
                    <select 
                      className="w-full h-8 text-sm bg-background border border-input rounded-md px-2 disabled:opacity-50"
                      value={term.resultStatus}
                      onChange={(e) => updateAcademicTerm(index, 'resultStatus', e.target.value)}
                      disabled={isTermDisabled}
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
                    className="w-full min-h-[60px] text-sm bg-background border border-input rounded-md p-2 placeholder:text-muted-foreground/50 disabled:opacity-50"
                    placeholder="e.g. Failed in Mathematics Supplementary Exam on 15-Aug-2026"
                    value={term.remarks}
                    onChange={(e) => updateAcademicTerm(index, 'remarks', e.target.value)}
                    disabled={isTermDisabled}
                  />
                </div>
                
                <div className="mt-4 flex justify-end">
                  <Button 
                    size="sm" 
                    variant={term.isSaved ? "secondary" : "default"}
                    onClick={() => saveAcademicTerm(index)}
                    disabled={isTermDisabled}
                    className="gap-2"
                  >
                    <Save className="w-4 h-4" />
                    {term.isSaved ? 'Saved' : 'Save'}
                  </Button>
                </div>
              </CardContent>
            </Card>
          )})} `
);

fs.writeFileSync(path, content);
