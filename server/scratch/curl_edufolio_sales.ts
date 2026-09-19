import prisma from '../src/lib/prisma';
import jwt from 'jsonwebtoken';
import axios from 'axios';
import dotenv from 'dotenv';
dotenv.config();

async function main() {
  const orgs = await prisma.organization.findMany({
    where: {
      name: { contains: 'edu', mode: 'insensitive' }
    }
  });

  const edufolio = orgs.find(o => o.name.toLowerCase().includes('edufolio')) || orgs[0];

  if (!edufolio) {
    console.log("No organization found containing 'edufolio'");
    return;
  }
  
  console.log("Found Organization:", edufolio.name);

  let user = await prisma.user.findFirst({
    where: { role: 'ceo', organizationId: edufolio.id }
  });

  if (!user) {
    user = await prisma.user.findFirst({
      where: { organizationId: edufolio.id, role: 'superadmin' }
    });
    if (!user) {
      user = await prisma.user.findFirst({
        where: { organizationId: edufolio.id }
      });
    }
  }

  if (!user) {
    console.log("No user found in organization to generate token.");
    return;
  }

  console.log("Using user:", user.email, "with role:", user.role);
  
  const token = jwt.sign({ id: user.id, role: user.role, organizationId: edufolio.id }, process.env.JWT_SECRET || 'secret', { expiresIn: '1h' });

  try {
    const res = await axios.get('http://localhost:6478/api/v1/dashboard/sales-overview', {
      headers: {
        Authorization: `Bearer ${token}`
      }
    });
    console.log("API Response:");
    console.log(JSON.stringify(res.data, null, 2));
  } catch (err: any) {
    console.error("API Error:", err.response?.data || err.message);
  }
}

main().catch(console.error).finally(async () => { await (prisma as any).$disconnect?.() });
