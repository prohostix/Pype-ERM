const fs = require('fs');
const glob = require('glob');

const files = glob.sync('/Users/apple/Documents/ProHostix/Pype-ERM/server/src/controllers/**/*.ts');

for (const file of files) {
  let content = fs.readFileSync(file, 'utf8');
  let original = content;

  // Replace pattern for baseWhere.OR
  const pattern1 = /baseWhere\.OR\s*=\s*\[\s*\{\s*salesUserId:\s*null\s*\},?\s*(?:\/\/[^\n]*)?\n\s*\];\s*if\s*\(assignedIds\.length\s*>\s*0\)\s*\{\s*baseWhere\.OR\.push\(\{\s*salesUserId:\s*\{\s*in:\s*assignedIds\s*\}\s*\}\);\s*\}/g;
  content = content.replace(pattern1, 'if (assignedIds.length > 0) {\n      baseWhere.salesUserId = { in: assignedIds };\n    }');

  // Replace pattern for whereClause.OR
  const pattern2 = /whereClause\.OR\s*=\s*\[\s*\{\s*salesUserId:\s*null\s*\},?\s*\{\s*salesUserId:\s*\{\s*in:\s*assignedIds\s*\}\s*\}\s*\];/g;
  content = content.replace(pattern2, 'if (assignedIds.length > 0) {\n      whereClause.salesUserId = { in: assignedIds };\n    }');

  // In opsReportController.ts it uses whereClause.OR with salesUserId: null and then pushes
  const pattern3 = /whereClause\.OR\s*=\s*\[\s*\{\s*salesUserId:\s*null\s*\},?\s*\];\s*if\s*\(assignedIds\.length\s*>\s*0\)\s*\{\s*whereClause\.OR\.push\(\{\s*salesUserId:\s*\{\s*in:\s*assignedIds\s*\}\s*\}\);\s*\}/g;
  content = content.replace(pattern3, 'if (assignedIds.length > 0) {\n      whereClause.salesUserId = { in: assignedIds };\n    }');

  // In studentController it sometimes uses whereClause.OR = [ { createdById: null }, { createdById: { in: assignedIds } } ] ? Wait, let's check what studentController actually uses.

  if (content !== original) {
    fs.writeFileSync(file, content);
    console.log(`Updated ${file}`);
  }
}
