const fs = require('fs');
const content = fs.readFileSync('/Users/apple/.gemini/antigravity-ide/brain/94f5c0ae-ef9c-4158-b776-aa3ac0cd8898/prohostix_attendance.csv', 'utf8');
const lines = content.trim().split('\n');

const summary = {};

for(let i = 1; i < lines.length; i++) {
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
  
  if (tokens.length < 7) continue;

  const empName = tokens[0];
  const email = tokens[1];
  const date = tokens[2];
  const status = tokens[3];
  const checkIn = tokens[4];
  const checkOut = tokens[5];
  const lateMinutes = parseInt(tokens[6], 10) || 0;

  if (!summary[email]) {
    summary[email] = {
      name: empName,
      leaves: 0,
      halfDays: 0,
      lateMinutes: 0,
      halfDayPunches: []
    };
  }

  summary[email].lateMinutes += lateMinutes;

  if (status === 'leave') {
    summary[email].leaves += 1;
  } else if (status === 'half_day') {
    summary[email].halfDays += 1;
    if (checkIn !== '--') {
      summary[email].halfDayPunches.push(`${date}: ${checkIn}`);
    }
  }
}

let md = `# ProHostix Attendance Summary\n\n`;
md += `| Employee Name | Email | Leaves Count | Half Day Count | Total Late Minutes | Half Day Punch-Ins |\n`;
md += `| --- | --- | --- | --- | --- | --- |\n`;

for (const email in summary) {
  const emp = summary[email];
  const halfDayPunchesStr = emp.halfDayPunches.length > 0 ? emp.halfDayPunches.join(', ') : 'None';
  md += `| ${emp.name} | ${email} | ${emp.leaves} | ${emp.halfDays} | ${emp.lateMinutes} | ${halfDayPunchesStr} |\n`;
}

fs.writeFileSync('/Users/apple/.gemini/antigravity-ide/brain/94f5c0ae-ef9c-4158-b776-aa3ac0cd8898/prohostix_attendance_summary.md', md);
