import prisma from '../src/lib/prisma';
import jwt from 'jsonwebtoken';
import axios from 'axios';
import dotenv from 'dotenv';
dotenv.config();

async function main() {
  const orgs = await prisma.organization.findMany({
    where: {
      name: { contains: 'medu', mode: 'insensitive' }
    }
  });

  const medugare = orgs[0];

  let ceo = await prisma.user.findFirst({
    where: { role: 'ceo', organizationId: medugare?.id }
  });

  if (!ceo) {
    ceo = await prisma.user.findFirst({
      where: { role: 'ceo' }
    });
  }

  if (!ceo) {
    ceo = await prisma.user.findFirst({
      where: { role: 'superadmin' }
    });
  }

  if (!ceo) return;

  const token = jwt.sign({ id: ceo.id, role: 'ceo', organizationId: ceo.organizationId }, process.env.JWT_SECRET || 'secret', { expiresIn: '1h' });

  try {
    const res = await axios.get('http://localhost:6478/api/v1/ceo/sales-details', {
      headers: {
        Authorization: `Bearer ${token}`
      }
    });
    console.log("Using CEO of org:", ceo.organizationId);
    console.log("API Response:");
    console.log(JSON.stringify(res.data, null, 2));
  } catch (err: any) {
    console.error("API Error:", err.response?.data || err.message);
  }
}

main().catch(console.error).finally(async () => { await (prisma as any).$disconnect?.() });
