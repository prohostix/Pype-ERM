const fs = require('fs');
const path = './src/controllers/facultyPortalController.ts';
let code = fs.readFileSync(path, 'utf8');

// Update getModulesForClass
const getModulesOld = `include: { 
          materials: true, 
          faculty: { select: { id: true, name: true } },
          batchAssignments: { include: { faculty: { select: { id: true, name: true } }, academicBatch: { select: { id: true, name: true } } } }
        },`;

const getModulesNew = `include: { 
          materials: true, 
          faculty: { select: { id: true, name: true } },
          batchAssignments: { include: { faculty: { select: { id: true, name: true } }, academicBatch: { select: { id: true, name: true } } } },
          academicSessions: { where: { status: 'IN_PROGRESS' }, select: { academicBatchId: true } }
        },`;

code = code.replace(getModulesOld, getModulesNew);

fs.writeFileSync(path, code);
console.log('Updated getModulesForClass');
