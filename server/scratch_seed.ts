import prisma from './src/lib/prisma.js';

async function main() {
  const org = await prisma.organization.findFirst({
    where: { name: { contains: 'professional', mode: 'insensitive' } }
  });
  console.log('ORG:', org?.id, org?.name);

  if (org) {
    const program = await prisma.program.findFirst({
      where: { organizationId: org.id, name: { contains: 'BBA', mode: 'insensitive' } }
    });
    console.log('PROGRAM:', program?.id, program?.name);

    if (program) {
      console.log('Creating 5 dummy students...');
      
      const students = [];
      for (let i = 1; i <= 5; i++) {
        const email = `dummy.bba${Date.now()}_${i}@example.com`;
        
        await prisma.user.create({
          data: {
            email,
            password: 'password123',
            role: 'student',
            name: `Dummy BBA Student ${i}`,
            organizationId: org.id
          }
        });

        const student = await prisma.student.create({
          data: {
            name: `Dummy BBA Student ${i}`,
            email,
            phone: `555000${i}`,
            enrollmentNo: `BBA-TEST-${Math.floor(Math.random() * 100000)}`,
            address: 'Dummy Address',
            programId: program.id,
            organizationId: org.id
          }
        });
        students.push(student);
      }
      console.log(`Successfully created ${students.length} students!`);
      console.log(students.map(s => ({ name: s.name, enrollmentNo: s.enrollmentNo })));
    }
  }
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
