import prisma from './src/lib/prisma.js';
import { executeApprovedDeletion } from './src/controllers/editDeleteController.js';

async function run() {
  const alloc = await prisma.programAllocation.findFirst();
  if (!alloc) return console.log('no alloc');
  
  console.log('Testing delete on:', alloc.id);
  const res = await executeApprovedDeletion(alloc.id, alloc.organizationId, 'program_allocation');
  console.log('Result:', res);
  
  const check = await prisma.programAllocation.findUnique({ where: { id: alloc.id } });
  console.log('Still in DB?', !!check);
}
// wait, I need to copy the function because it's not exported!
