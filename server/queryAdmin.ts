import prisma from './src/lib/prisma.js';

async function main() {
  const users = await prisma.user.findMany({
    where: { 
      designations: {
        some: {
          id: "09157e41-b7b0-42ec-8aad-e07b0ea2e398"
        }
      }
    },
    select: { name: true, email: true, role: true }
  });
  console.log("Parent designation users:", JSON.stringify(users, null, 2));
  
  const manager = await prisma.user.findUnique({
    where: { id: "fa95e537-d12a-47ec-a838-a7ac4383f039" },
    select: { name: true, email: true, role: true }
  });
  console.log("Reporting To user:", JSON.stringify(manager, null, 2));
}

main().catch(console.error).finally(() => prisma.$disconnect());
