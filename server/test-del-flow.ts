import prisma from './src/lib/prisma.js';
import { respondToEditDeleteRequest } from './src/controllers/editDeleteController.js';

async function run() {
  const alloc = await prisma.programAllocation.findFirst();
  if (!alloc) return console.log('no alloc');
  
  const req = await prisma.editDeleteRequest.create({
    data: {
      organizationId: alloc.organizationId,
      userId: alloc.allocatedBy,
      entityId: alloc.id,
      entityType: 'program_allocation',
      operation: 'delete',
      reason: 'test',
      status: 'pending_ceo'
    }
  });
  
  const mockReq = {
    params: { id: req.id },
    body: { status: 'approved', responseRemarks: 'ok' },
    user: { id: alloc.allocatedBy, role: 'ceo' }
  } as any;
  
  const mockRes = {
    json: (data: any) => console.log('Response:', data),
    status: (code: number) => { console.log('Status:', code); return mockRes; }
  } as any;
  
  await respondToEditDeleteRequest(mockReq, mockRes, () => {});
  
  const check = await prisma.programAllocation.findUnique({ where: { id: alloc.id } });
  console.log('Alloc still in DB?', !!check);
}
run();
