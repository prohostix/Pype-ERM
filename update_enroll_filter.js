const fs = require('fs');
const path = 'client/src/components/panels/EnrollStudentPanel.tsx';
let content = fs.readFileSync(path, 'utf8');

// 1. Add missing import for Select if it doesn't exist (it doesn't, we only have Select in Student Details section)
// Actually we already have Select imported in this file?
// Let's check imports
if (!content.includes("import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue }")) {
  content = content.replace(
    "import { Input } from '@/components/ui/input';",
    "import { Input } from '@/components/ui/input';\nimport { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';"
  );
}

// 2. Add state
content = content.replace(
  "const [selectedFeeModeId, setSelectedFeeModeId] = useState<string>('');",
  "const [selectedFeeModeId, setSelectedFeeModeId] = useState<string>('');\n  const [selectedUniversityId, setSelectedUniversityId] = useState<string>('all');"
);

// 3. Add Dropdown UI and modify filter
const searchStr = `<div className="space-y-3">\n                {programs.map(p => {`;
const replaceStr = `<div className="mb-4">\n                <Label className="text-xs text-muted-foreground mb-1 block">Filter by University</Label>\n                <Select \n                  value={selectedUniversityId} \n                  onValueChange={v => {\n                    setSelectedUniversityId(v);\n                    setSelectedProgram(null);\n                    setSelectedFeeModeId('');\n                  }}\n                >\n                  <SelectTrigger><SelectValue placeholder="All Universities" /></SelectTrigger>\n                  <SelectContent>\n                    <SelectItem value="all">All Universities</SelectItem>\n                    {Array.from(new Map(\n                      programs\n                        .filter(p => p.university && p.university.id)\n                        .map(p => [p.university!.id, p.university])\n                    ).values()).map((u: any) => (\n                      <SelectItem key={u.id} value={u.id}>{u.name}</SelectItem>\n                    ))}\n                  </SelectContent>\n                </Select>\n              </div>\n              <div className="space-y-3">\n                {programs.filter(p => selectedUniversityId === 'all' || p.university?.id === selectedUniversityId).map(p => {`;

content = content.replace(searchStr, replaceStr);

fs.writeFileSync(path, content);
console.log('Done');
