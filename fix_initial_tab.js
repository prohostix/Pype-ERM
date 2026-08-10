const fs = require('fs');

const { execSync } = require('child_process');
const files = execSync('find client/src/pages -name "*.tsx"').toString().split('\n').filter(Boolean);

files.forEach(file => {
  let content = fs.readFileSync(file, 'utf8');
  content = content.replace(/useEffect\(\(\) => \{\n\s*if \(initialTab\) setActiveTab\(initialTab\);\n\s*\}, \[initialTab\]\);/g, "useEffect(() => {\n    setActiveTab(initialTab || (typeof isSubDeptManager !== 'undefined' && isSubDeptManager ? 'my_subdept' : 'overview'));\n  }, [initialTab]);");
  fs.writeFileSync(file, content);
});
console.log('Done');
