require('dotenv').config();
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient({
  datasourceUrl: "postgresql://pypeerm:troy1999@pypeerm.cj0mo4q44gde.ap-south-1.rds.amazonaws.com:5432/postgres?schema=public&sslmode=no-verify"
});

async function main() {
  const fees = await prisma.feeStructure.findMany();
  console.log(fees.map(f => ({
    id: f.id,
    programId: f.programId,
    specialisation: f.specialisation,
    feeLevel: f.feeLevel
  })));
}

main().catch(console.error).finally(() => prisma.$disconnect());
