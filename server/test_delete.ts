import { PrismaClient } from './src/generated/client/index.js';
const prisma = new PrismaClient();

async function run() {
  try {
    const req = await prisma.editDeleteRequest.findFirst({ 
      where: { entityType: 'academic-batch' },
      orderBy: { createdAt: 'desc' }
    });
    console.log('Latest request:', req);
    if(req) {
      console.log('Attempting to delete batch:', req.entityId);
      await prisma.academicBatch.delete({ where: { id: req.entityId } });
      console.log('Success');
    }
  } catch (e) {
    console.error(e);
  }
}
run();
