import prisma from '../src/lib/prisma.js';

async function main() {
  const user = await prisma.user.findFirst({
    where: {
      email: 'vishnu@edufolio.org',
    },
    include: {
      organization: true,
    }
  });

  if (user) {
    console.log('User found:');
    console.log(`Email: ${user.email}`);
    console.log(`Type: ${user.userType}`); // Guessing userType or type
    console.log(`Organization ID: ${user.organizationId}`);
    if (user.organization) {
      console.log(`Organization Name: ${user.organization.name}`); // Guessing organization name
    } else {
      console.log('Organization: null');
    }
    console.log('Full user object:', user);
  } else {
    console.log('User not found.');
  }
}

main()
  .catch((e) => {
    console.error(e);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
