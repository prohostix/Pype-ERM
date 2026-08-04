const fs = require('fs');
const path = './client/src/components/panels/StudentProgressTab.tsx';
let content = fs.readFileSync(path, 'utf8');

// Replace academicYears state with semesters
content = content.replace(
  /const yearsToRender = isPgCourse \? 2 : 3;\n\n  const \[academicYears, setAcademicYears\] = useState\([\s\S]*?\)\);\n/m,
  `const yearsToRender = student?.program?.duration || (isPgCourse ? 2 : 3);
  const semestersToRender = yearsToRender * 2; // Default to 2 semesters per year

  const [academicTerms, setAcademicTerms] = useState(
    Array.from({ length: semestersToRender }).map((_, i) => ({
      term: i + 1,
      feeCollection: 'Auto',
      reRegistration: 'Pending',
      examRegistration: 'Pending',
      resultStatus: 'Pending', 
      remarks: ''
    }))
  );\n`
);

// Update handler function
content = content.replace(
  /const updateAcademicYear = \(yearIndex: number, field: string, value: string\) => {[\s\S]*?}\);\n  };/m,
  `const updateAcademicTerm = (termIndex: number, field: string, value: string) => {
    setAcademicTerms(terms => terms.map((t, i) => 
      i === termIndex ? { ...t, [field]: value } : t
    ));
  };`
);

// Update render loop
content = content.replace(
  /\{academicYears\.map\(\(year, index\) => \([\s\S]*?Year \{year\.year\}<\/span>[\s\S]*?value=\{year\.reRegistration\}[\s\S]*?onChange=\{\(e\) => updateAcademicYear\(index, 'reRegistration', e\.target\.value\)\}[\s\S]*?value=\{year\.examRegistration\}[\s\S]*?onChange=\{\(e\) => updateAcademicYear\(index, 'examRegistration', e\.target\.value\)\}[\s\S]*?value=\{year\.resultStatus\}[\s\S]*?onChange=\{\(e\) => updateAcademicYear\(index, 'resultStatus', e\.target\.value\)\}[\s\S]*?value=\{year\.remarks\}[\s\S]*?onChange=\{\(e\) => updateAcademicYear\(index, 'remarks', e\.target\.value\)\}[\s\S]*?<\/Card>\n          \)\)}/m,
  `{academicTerms.map((term, index) => (
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
                      className="w-full h-8 text-sm bg-background border border-input rounded-md px-2"
                      value={term.reRegistration}
                      onChange={(e) => updateAcademicTerm(index, 'reRegistration', e.target.value)}
                    >
                      <option value="Pending">Pending</option>
                      <option value="Completed">Completed</option>
                    </select>
                  </div>
                  <div>
                    <span className="text-xs text-muted-foreground uppercase tracking-wider font-semibold block mb-1">Exam Registration</span>
                    <select 
                      className="w-full h-8 text-sm bg-background border border-input rounded-md px-2"
                      value={term.examRegistration}
                      onChange={(e) => updateAcademicTerm(index, 'examRegistration', e.target.value)}
                    >
                      <option value="Pending">Pending</option>
                      <option value="Completed">Completed</option>
                    </select>
                  </div>
                  <div>
                    <span className="text-xs text-muted-foreground uppercase tracking-wider font-semibold block mb-1">Result Status</span>
                    <select 
                      className="w-full h-8 text-sm bg-background border border-input rounded-md px-2"
                      value={term.resultStatus}
                      onChange={(e) => updateAcademicTerm(index, 'resultStatus', e.target.value)}
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
                    value={term.remarks}
                    onChange={(e) => updateAcademicTerm(index, 'remarks', e.target.value)}
                  />
                </div>
              </CardContent>
            </Card>
          ))}`
);

fs.writeFileSync(path, content, 'utf8');
console.log('Patch complete.');
