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

  if (orgs.length === 0) {
    console.log("No organization found containing 'medu'");
    const allOrgs = await prisma.organization.findMany();
    console.log("Available organizations:", allOrgs.map(o => o.name).join(", "));
    return;
  }
  
  const medugare = orgs[0];
  console.log("Found Organization:", medugare.name);

  let ceo = await prisma.user.findFirst({
    where: { role: 'ceo', organizationId: medugare.id }
  });

  if (!ceo) {
    console.log("No ceo found specifically in", medugare.name, "- trying superadmin or first user in org");
    ceo = await prisma.user.findFirst({
      where: { organizationId: medugare.id, role: 'superadmin' }
    });
    if (!ceo) {
      ceo = await prisma.user.findFirst({
        where: { organizationId: medugare.id }
      });
    }
  }

  if (!ceo) {
    console.log("No user found in organization to generate token.");
    return;
  }

  console.log("Using user:", ceo.email, "with role:", ceo.role);
  // Temporarily grant CEO role for the token to pass authorization if they aren't actually CEO
  // The backend might just check the JWT payload for role
  const token = jwt.sign({ id: ceo.id, role: 'ceo', organizationId: medugare.id }, process.env.JWT_SECRET || 'secret', { expiresIn: '1h' });

  try {
    const res = await axios.get('http://localhost:6478/api/v1/ceo/sales-counts', {
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
