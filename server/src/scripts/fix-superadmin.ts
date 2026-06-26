import prisma from '../lib/prisma.js';
import bcrypt from 'bcryptjs';

async function main() {
  const email = 'superadmin@erp.com';
  const newPassword = 'Admin@1234';
  
  const salt = await bcrypt.genSalt(10);
  const hashedPassword = await bcrypt.hash(newPassword, salt);
  
  const updated = await prisma.user.update({
    where: { email },
    data: { password: hashedPassword }
  });
  
  console.log(`✅ Password reset for: ${updated.email} (${updated.role})`);
  console.log(`   New password: ${newPassword}`);
}

main().catch(console.error).finally(() => prisma.$disconnect());
