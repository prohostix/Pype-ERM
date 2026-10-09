import prisma from './src/lib/prisma.js';

async function main() {
  const orgs = await prisma.organization.findMany();
  console.log("Orgs:", orgs.map(o => o.email));
}

main().then(() => process.exit(0)).catch(e => { console.error(e); process.exit(1); });
