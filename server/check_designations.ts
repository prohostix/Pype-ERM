import prisma from './src/lib/prisma.js';

async function main() {
  try {
    const adminEmail = 'tims.teammanageredpl@gmail.com';
    const subAdminEmail = 'bct017.tims@gmail.com';

    const admin = await prisma.user.findFirst({
      where: { email: adminEmail },
      include: {
        designations: { include: { childDesignations: true } }
      }
    });

    const subAdmin = await prisma.user.findFirst({
      where: { email: subAdminEmail },
      include: {
        designations: { include: { parentDesignation: true } }
      }
    });

    console.log('--- ADMIN (Lijitha) ---');
    console.log(JSON.stringify(admin?.designations, null, 2));

    console.log('--- SUB-ADMIN (Ummul Hasnath AK) ---');
    console.log(JSON.stringify(subAdmin?.designations, null, 2));

  } catch (e) {
    console.error(e);
  }
}

main();
