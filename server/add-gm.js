const fs = require('fs');
const path = require('path');

const files = [
  'editDeleteRoutes.ts', 'organizationRoutes.ts', 'enrollmentRoutes.ts',
  'operationsRoutes.ts', 'escalationRoutes.ts', 'hrRoutes.ts',
  'collectionsPanelRoutes.ts', 'orgAdminRoutes.ts', 'salesRoutes.ts',
  'referralRoutes.ts', 'assetRoutes.ts', 'meetingRoutes.ts', 'dashboardRoutes.ts',
  'departmentRoutes.ts', 'subDepartmentRoutes.ts', 'userRoutes.ts',
  'financeRoutes.ts'
];

files.forEach(file => {
  const filePath = path.join(__dirname, 'src/routes', file);
  if (!fs.existsSync(filePath)) return;
  
  let content = fs.readFileSync(filePath, 'utf8');
  
  // Replace authorize(..., 'ceo', ...) with authorize(..., 'ceo', 'general_manager', ...)
  // We look for 'ceo' inside authorize() calls
  content = content.replace(/authorize\(([^)]*)\)/g, (match, args) => {
    if (args.includes("'ceo'") && !args.includes("'general_manager'")) {
      return `authorize(${args.replace("'ceo'", "'ceo', 'general_manager'")})`;
    }
    return match;
  });

  // Also replace in ALL_ROLES arrays if present
  content = content.replace(/ALL_ROLES = \[([^\]]*)\]/g, (match, args) => {
    if (args.includes("'ceo'") && !args.includes("'general_manager'")) {
      return `ALL_ROLES = [${args.replace("'ceo'", "'ceo', 'general_manager'")}]`;
    }
    return match;
  });

  // Special case for collectionsPanelRoutes.ts
  if (file === 'collectionsPanelRoutes.ts') {
    content = content.replace(/const isAdmin = \[([^\]]*)\]/g, (match, args) => {
      if (args.includes("'ceo'") && !args.includes("'general_manager'")) {
        return `const isAdmin = [${args.replace("'ceo'", "'ceo', 'general_manager'")}]`;
      }
      return match;
    });
  }

  fs.writeFileSync(filePath, content);
  console.log(`Updated ${file}`);
});
