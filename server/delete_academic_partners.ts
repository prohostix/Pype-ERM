import prisma from './src/lib/prisma.js';

async function main() {
  const org = await prisma.organization.findUnique({
    where: { email: 'timstirur@gmail.com' }
  });
  if (!org) {
    console.log("Org not found");
    return;
  }
  
  const studyCenters = await prisma.studyCenter.findMany({
    where: { organizationId: org.id }
  });
  const scIds = studyCenters.map(s => s.id);
  
  if (scIds.length > 0) {
    // Delete related records that might block deletion
    await prisma.programAllocation.deleteMany({
      where: { centerId: { in: scIds } }
    });
    
    // 2. Delete the Study Centers
    const deletedCenters = await prisma.studyCenter.deleteMany({
      where: {
        organizationId: org.id,
        id: { in: scIds }
      }
    });
    console.log(`Deleted ${deletedCenters.count} Academic Partners (Study Centers).`);
  }
  
  // 3. Delete Center Admin Users
  const deletedUsers = await prisma.user.deleteMany({
    where: {
      organizationId: org.id,
      role: 'center_admin'
    }
  });
  console.log(`Deleted ${deletedUsers.count} Center Admin users.`);
}

main().then(() => process.exit(0)).catch(e => { console.error(e); process.exit(1); });
