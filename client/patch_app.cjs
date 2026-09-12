const fs = require('fs');
const path = './src/App.tsx';

let code = fs.readFileSync(path, 'utf8');

if (!code.includes("{ id: 'live', label: 'Live Classes' }")) {
  code = code.replace(
    "{ id: 'assignments', label: 'My Schedule' }",
    "{ id: 'live', label: 'Live Classes' },\n        { id: 'assignments', label: 'My Schedule' }"
  );
  fs.writeFileSync(path, code);
  console.log("Patched App.tsx");
}
