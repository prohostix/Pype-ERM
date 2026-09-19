import prisma from './src/lib/prisma.js';

async function main() {
  const user = await prisma.user.findUnique({
    where: { email: 'bindhyat99@gmail.com' },
    include: { designations: true }
  });
  
  if (!user) {
    console.log("User not found");
    return;
  }
  
  console.log("User details:", JSON.stringify(user, null, 2));
  
  const designationIds = user.designations.map(d => d.id);
  
  const parentDesignations = await prisma.designation.findMany({
    where: { 
      id: { in: user.designations.map(d => d.parentDesignationId).filter(Boolean) } 
    },
    include: { users: { select: { id: true, name: true, email: true, role: true } } }
  });
  
  console.log("Parent Designations:", JSON.stringify(parentDesignations, null, 2));

  // Also checking assignedSalesUsers in case it is used
  const adminsWithDirectAssignment = await prisma.user.findMany({
    where: {
      assignedSalesUsers: {
        has: user.id
      }
    },
    select: { name: true, email: true, role: true }
  });
  
  console.log("Directly Assigned Admins:", JSON.stringify(adminsWithDirectAssignment, null, 2));

  // also reportingTo ?
  if (user.reportingToId) {
     const manager = await prisma.user.findUnique({where: {id: user.reportingToId}});
     console.log("Reporting To:", JSON.stringify(manager, null, 2));
  }
}

main().catch(console.error).finally(() => prisma.$disconnect());
