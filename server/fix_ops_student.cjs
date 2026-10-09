const fs = require('fs');
const glob = require('glob');

const files = glob.sync('/Users/apple/Documents/ProHostix/Pype-ERM/server/src/controllers/**/*.ts');

for (const file of files) {
  let content = fs.readFileSync(file, 'utf8');
  let original = content;

  // Pattern 1: OpsSubAdminFilter (like in getStudents)
  const pattern4 = /const opsSubAdminFilter:\s*any\s*=\s*\{\s*OR:\s*\[\{\s*enrolledBy:\s*null,\s*referredBy:\s*null\s*\}\]\s*\};\s*if\s*\(assignedIds\.length\s*>\s*0\)\s*\{\s*opsSubAdminFilter\.OR\.push\(\{\s*enrolledBy:\s*\{\s*in:\s*assignedIds\s*\}\s*\}\);\s*opsSubAdminFilter\.OR\.push\(\{\s*referredBy:\s*\{\s*in:\s*assignedIds\s*\}\s*\}\);\s*\}\s*if\s*\(!where\.AND\)\s*where\.AND\s*=\s*\[\];\s*where\.AND\.push\(opsSubAdminFilter\);/g;
  content = content.replace(pattern4, 'if (assignedIds.length > 0) {\n      const opsSubAdminFilter: any = { OR: [{ enrolledBy: { in: assignedIds } }, { referredBy: { in: assignedIds } }] };\n      if (!where.AND) where.AND = [];\n      where.AND.push(opsSubAdminFilter);\n    }');

  // Pattern 2: whereClause.OR (like in getStudent)
  const pattern5 = /whereClause\.OR\s*=\s*\[\s*\{\s*enrolledBy:\s*null,\s*referredBy:\s*null\s*\},?\s*\{\s*enrolledBy:\s*\{\s*in:\s*assignedIds\s*\}\s*\},?\s*\{\s*referredBy:\s*\{\s*in:\s*assignedIds\s*\}\s*\}\s*\];/g;
  content = content.replace(pattern5, 'if (assignedIds.length > 0) {\n      whereClause.OR = [{ enrolledBy: { in: assignedIds } }, { referredBy: { in: assignedIds } }];\n    }');
  
  // Pattern 6: whereClause.OR with createdBy
  const pattern6 = /whereClause\.OR\s*=\s*\[\s*\{\s*createdById:\s*null\s*\},?\s*\{\s*createdById:\s*\{\s*in:\s*assignedIds\s*\}\s*\}\s*\];/g;
  content = content.replace(pattern6, 'if (assignedIds.length > 0) {\n      whereClause.createdById = { in: assignedIds };\n    }');

  if (content !== original) {
    fs.writeFileSync(file, content);
    console.log(`Updated ${file}`);
  }
}
