const fs = require('fs');
const path = require('path');

const dirs = [
  'client/src',
  'server/src'
];

function findFiles(dir, fileList = []) {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const stat = fs.statSync(path.join(dir, file));
    if (stat.isDirectory()) {
      findFiles(path.join(dir, file), fileList);
    } else if (file.endsWith('.ts') || file.endsWith('.tsx') || file.endsWith('.js')) {
      fileList.push(path.join(dir, file));
    }
  }
  return fileList;
}

let files = [];
for (const dir of dirs) {
  files = files.concat(findFiles(dir));
}

for (const file of files) {
  let content = fs.readFileSync(file, 'utf8');
  const original = content;

  // Replace strings
  content = content.replace(/,\s*['"]sales_agent['"]/g, '');
  content = content.replace(/['"]sales_agent['"]\s*,/g, '');
  content = content.replace(/['"]sales_agent['"]/g, '');

  content = content.replace(/,\s*['"]bde['"]/g, '');
  content = content.replace(/['"]bde['"]\s*,/g, '');
  content = content.replace(/['"]bde['"]/g, '');

  // specific to mockData.ts or types
  content = content.replace(/\|\s*['"]sales_agent['"]/g, '');
  content = content.replace(/\|\s*['"]bde['"]/g, '');

  // useAuth.tsx specific removal
  content = content.replace(/bde:\s*\[.*?\],/g, '');

  // HRUsersPanel specific
  content = content.replace(/bde:\s*'.*?',/g, '');

  if (content !== original) {
    fs.writeFileSync(file, content);
    console.log(`Updated ${file}`);
  }
}
