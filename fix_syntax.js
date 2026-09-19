const fs = require('fs');
const path = 'client/src/components/panels/EnrollStudentPanel.tsx';
let content = fs.readFileSync(path, 'utf8');

content = content.replace(
  `<div className="mb-4">`,
  `<>\n              <div className="mb-4">`
);

content = content.replace(
  `              </div>\n            )}`,
  `              </div>\n              </>\n            )}`
);

fs.writeFileSync(path, content);
console.log('Done');
