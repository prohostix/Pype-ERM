const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function main() {
  const users = await prisma.user.findMany({ where: { name: { contains: 'Muhammed Aslam', mode: 'insensitive' } } });
  console.log("USERS:", users.map(u => ({ id: u.id, name: u.name, email: u.email, role: u.role })));
  
  const emails = users.map(u => u.email);
  if (emails.length > 0) {
    const students = await prisma.student.findMany({ where: { email: { in: emails } } });
    console.log("STUDENTS:", students.map(s => ({ id: s.id, name: s.studentName, email: s.email })));
  }
}
main().catch(console.error).finally(() => prisma.$disconnect());
