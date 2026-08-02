const fs = require('fs');
const path = require('path');

const pagesDir = path.join(__dirname, 'client', 'src', 'pages');

const files = fs.readdirSync(pagesDir).filter(f => f.endsWith('Dashboard.tsx') || f.endsWith('Portal.tsx'));

let modifiedCount = 0;

for (const file of files) {
  const filePath = path.join(pagesDir, file);
  let content = fs.readFileSync(filePath, 'utf8');

  // Skip if doesn't have TabsContent
  if (!content.includes('<TabsContent')) continue;
  
  let modified = false;

  // Add import if missing
  if (!content.includes('MeetingsPanel')) {
    const importRegex = /import .*Panel.* from .*/g;
    let lastMatch = null;
    let match;
    while ((match = importRegex.exec(content)) !== null) {
      lastMatch = match;
    }

    if (lastMatch) {
      const insertPos = lastMatch.index + lastMatch[0].length;
      content = content.slice(0, insertPos) + "\nimport { MeetingsPanel } from '@/components/panels/MeetingsPanel';" + content.slice(insertPos);
      modified = true;
    }
  }

  // Add TabsContent if missing
  if (!content.includes('value="meetings"')) {
    const tabsEndIndex = content.lastIndexOf('</Tabs>');
    if (tabsEndIndex !== -1) {
      const insertion = `        <TabsContent value="meetings">\n          <MeetingsPanel />\n        </TabsContent>\n`;
      content = content.slice(0, tabsEndIndex) + insertion + content.slice(tabsEndIndex);
      modified = true;
    }
  }

  if (modified) {
    fs.writeFileSync(filePath, content, 'utf8');
    modifiedCount++;
    console.log(`Modified ${file}`);
  }
}

console.log(`Updated ${modifiedCount} dashboards.`);
