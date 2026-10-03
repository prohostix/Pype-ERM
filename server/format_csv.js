const fs = require('fs');
const content = fs.readFileSync('/Users/apple/.gemini/antigravity-ide/brain/94f5c0ae-ef9c-4158-b776-aa3ac0cd8898/prohostix_attendance.csv', 'utf8');
const lines = content.trim().split('\n');
const header = lines[0].split(',');
let md = `# ProHostix Attendance Report\n\n`;
md += `| ${header.join(' | ')} |\n`;
md += `| ${header.map(() => '---').join(' | ')} |\n`;
for(let i=1; i<lines.length; i++) {
  // simple parse ignoring quotes for now, since it's predictable (no internal commas in the fields we fetched except maybe if names have commas, but we assume they don't)
  const line = lines[i];
  let inQuotes = false;
  let currentToken = '';
  let tokens = [];
  for(let j=0; j<line.length; j++) {
    const c = line[j];
    if (c === '"') {
      inQuotes = !inQuotes;
    } else if (c === ',' && !inQuotes) {
      tokens.push(currentToken);
      currentToken = '';
    } else {
      currentToken += c;
    }
  }
  tokens.push(currentToken);
  md += `| ${tokens.join(' | ')} |\n`;
}
fs.writeFileSync('/Users/apple/.gemini/antigravity-ide/brain/94f5c0ae-ef9c-4158-b776-aa3ac0cd8898/prohostix_attendance_view.md', md);
