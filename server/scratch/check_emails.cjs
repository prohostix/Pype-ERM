const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkEmails() {
  const users = await prisma.user.findMany();
  console.log(`Total users: ${users.length}`);
  
  let issues = 0;
  for (const u of users) {
    if (u.email !== u.email.trim() || u.email !== u.email.toLowerCase()) {
      console.log(`Issue with ID ${u.id}: '${u.email}'`);
      issues++;
    }
  }
  console.log(`Users with spaces/uppercase: ${issues}`);
}

checkEmails().catch(console.error).finally(() => prisma.$disconnect());
