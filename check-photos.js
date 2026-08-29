const { PrismaClient } = require('./server/src/generated/client');
const prisma = new PrismaClient();
prisma.attendance.findMany({ where: { checkInPhoto: { not: null } } })
  .then(a => console.log(a.map(x => x.checkInPhoto)))
  .catch(console.error)
  .finally(() => prisma.$disconnect());
