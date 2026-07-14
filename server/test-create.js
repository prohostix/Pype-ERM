import prisma from './src/lib/prisma.js';
async function run() {
  try {
    const res = await prisma.user.create({
      data: {
        userId: 'PYPEERM999999',
        email: 'test999@test.com',
        name: 'Test',
        password: 'password',
        role: 'employee',
        status: 'active'
      }
    });
    console.log("Success", res.id);
  } catch(e) {
    console.error("Error", e);
  }
}
run();
