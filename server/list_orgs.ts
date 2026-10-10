import prisma from './src/lib/prisma.js';

async function main() {
  try {
    const orgs = await prisma.organization.findMany({
      select: { id: true, name: true }
    });
    console.log(orgs);
  } catch (e) {
    console.error(e);
  }
}

main();
