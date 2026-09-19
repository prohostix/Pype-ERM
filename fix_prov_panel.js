const fs = require('fs');
const path = 'client/src/components/panels/ProvisionalEnrollmentPanel.tsx';
let content = fs.readFileSync(path, 'utf8');

// Replace the handleComplete with a message
content = content.replace(
  /const handleComplete = async \([\s\S]*?fetchEnrollments\(\);\n    \} catch \(e: any\) \{\n      toast.error\(e.response\?.data\?.message \|\| 'Failed to complete enrollment'\);\n    \}\n  \};/g,
  ""
);

content = content.replace(
  /\{e\.status === 'provisional_finance_verified' && \([\s\S]*?<\/Button>\n                  \)\}/g,
  `{e.status === 'provisional_finance_verified' && (
                    <span className="text-[10px] text-muted-foreground uppercase">Go to Direct Enrollment to complete</span>
                  )}`
);

fs.writeFileSync(path, content);
console.log('Done');
