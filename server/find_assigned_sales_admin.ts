import prisma from './src/lib/prisma.js';

async function main() {
  const targetSalesUserId = '9905a0f3-77ba-4196-b006-766ad4fdbc4d';
  const orgId = '12d196f2-a642-4fce-94ad-22f458d5733e';

  try {
    const salesAdmins = await prisma.user.findMany({
      where: {
        organizationId: orgId,
        role: 'sales_admin',
      }
    });

    let foundAdmin = null;

    for (const admin of salesAdmins) {
      const assigned = Array.isArray(admin.assignedSalesUsers) ? admin.assignedSalesUsers : [];
      if (assigned.includes(targetSalesUserId)) {
        foundAdmin = admin;
        break;
      }
    }

    if (foundAdmin) {
      console.log('Assigned Sales Admin Details:');
      console.log(`Name: ${foundAdmin.name}`);
      console.log(`Email: ${foundAdmin.email}`);
      console.log(`Phone: ${foundAdmin.phone}`);
      console.log(`Role: ${foundAdmin.role}`);
    } else {
      console.log('No specific Sales Admin is assigned this user.');
      // If unassigned, any sales_admin in the branch/org might see it.
      console.log('Here are the available Sales Admins in the organization:');
      salesAdmins.forEach(admin => {
        console.log(`- Name: ${admin.name}, Email: ${admin.email}, Phone: ${admin.phone}`);
      });
    }
  } catch (e) {
    console.error(e);
  }
}

main();
