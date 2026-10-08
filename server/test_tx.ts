import { PrismaClient } from './src/generated/client/index.js';
import { v4 as uuidv4 } from 'uuid';

const prisma = new PrismaClient();

async function main() {
  const centerId = uuidv4();
  
  // 1. Create center
  await prisma.studyCenter.create({
    data: {
      id: centerId,
      name: 'Test Center',
      code: 'TEST',
      email: 'test@test.com',
      contact: '1234567890',
      status: 'active'
    }
  });

  // 2. Create user
  const user = await prisma.user.create({
    data: {
      userId: uuidv4(),
      studyCenterId: centerId,
      email: 'test_admin@test.com',
      password: 'hash',
      name: 'Test Admin',
      role: 'center_admin',
      status: 'active'
    }
  });
  
  console.log('Created user:', user.id, 'with studyCenterId:', user.studyCenterId);

  // 3. Delete center using our transaction logic
  await prisma.$transaction(async (tx) => {
    const deletedUsers = await tx.user.deleteMany({ where: { studyCenterId: centerId, role: 'center_admin' } });
    console.log('Deleted users count:', deletedUsers.count);
    
    await tx.studyCenter.delete({ where: { id: centerId } });
  });

  // 4. Verify user is gone
  const checkUser = await prisma.user.findUnique({ where: { id: user.id } });
  console.log('User after delete:', checkUser);
}

main().catch(console.error).finally(() => prisma.$disconnect());
