const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const users = await prisma.user.findMany({
    where: {
      email: {
        contains: 'bishrulhafi676',
        mode: 'insensitive'
      }
    }
  });
  console.log(`Found ${users.length} users with email containing 'bishrulhafi676':`);
  console.log(users.map(u => ({ id: u.id, email: u.email, name: u.name, role: u.role })));
  
  // also check Student table if there is one
  try {
    const students = await prisma.student.findMany({
      where: {
        email: {
          contains: 'bishrulhafi676',
          mode: 'insensitive'
        }
      }
    });
    console.log(`Found ${students.length} students with email containing 'bishrulhafi676':`);
    console.log(students.map(s => ({ id: s.id, email: s.email, name: s.name })));
  } catch (e) {
    // maybe no student table
  }
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
