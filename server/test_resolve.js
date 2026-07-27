import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

export async function resolveTargetName(url) {
  try {
    const parts = url.split('?')[0].split('/').filter(Boolean);
    if (parts[0] === 'api' && parts[1] === 'v1') {
      parts.splice(0, 2);
    }
    if (parts.length < 2) return null;
    const endpoint = parts[0];
    const id = parts[parts.length - 1];
    
    if (endpoint === 'org') {
      if (parts[1] === 'designations') {
        const d = await prisma.designation.findUnique({ where: { id }, select: { title: true } });
        return d ? `Designation: ${d.title}` : null;
      }
    }
    if (endpoint === 'finance') {
      if (parts[1] === 'payments') {
        const p = await prisma.paymentEntry.findUnique({ where: { id }, select: { amount: true } });
        return p ? `Payment: ${p.amount}` : null;
      }
    }
  } catch (e) {
    console.error(e);
  }
  return null;
}

async function main() {
  const reqs = await prisma.editDeleteRequest.findMany({ orderBy: { createdAt: 'desc' }, take: 10 });
  for (const r of reqs) {
    const name = await resolveTargetName(r.entityId);
    console.log(r.entityId, '=>', name);
  }
}
main().catch(console.error).finally(() => prisma.$disconnect());
