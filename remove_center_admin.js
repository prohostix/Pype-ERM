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
  content = content.replace(/,\s*['"]center_admin['"]/g, '');
  content = content.replace(/['"]center_admin['"]\s*,/g, '');
  content = content.replace(/['"]center_admin['"]/g, '');

  content = content.replace(/\|\s*['"]center_admin['"]/g, '');

  // useAuth.tsx specific removal
  content = content.replace(/center_admin:\s*\[.*?\],/g, '');

  // HRUsersPanel / HROrgChartPanel specific
  content = content.replace(/center_admin:\s*'.*?',/g, '');

  if (content !== original) {
    fs.writeFileSync(file, content);
    console.log(`Updated ${file}`);
  }
}
