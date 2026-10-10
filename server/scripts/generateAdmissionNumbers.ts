import prisma from '../src/lib/prisma.js';

async function main() {
  console.log('Fetching students without admission numbers...');
  const students = await prisma.student.findMany({
    where: {
      OR: [
        { admissionNo: null },
        { admissionNo: '' }
      ]
    },
    include: {
      organization: true
    }
  });

  console.log(`Found ${students.length} students without admission numbers.`);

  for (const student of students) {
    let admissionPrefix = 'ADM';
    if (student.organization?.metadata && (student.organization.metadata as any).admissionPrefix) {
      admissionPrefix = (student.organization.metadata as any).admissionPrefix;
    } else if (student.organization?.name) {
      admissionPrefix = student.organization.name.substring(0, 3).toUpperCase();
    }
    
    let isUnique = false;
    let newAdmissionNo = '';
    while (!isUnique) {
      const randomStr = Math.floor(100000 + Math.random() * 900000).toString();
      newAdmissionNo = `${admissionPrefix}-${randomStr}`;
      const existing = await prisma.student.findFirst({ where: { admissionNo: newAdmissionNo } });
      if (!existing) isUnique = true;
    }

    await prisma.student.update({
      where: { id: student.id },
      data: { admissionNo: newAdmissionNo }
    });

    console.log(`Updated student ${student.name} with admission number ${newAdmissionNo}`);
  }

  console.log('Done!');
}

main()
  .catch(e => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
