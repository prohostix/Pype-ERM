import prisma from '../src/lib/prisma';
import jwt from 'jsonwebtoken';
import axios from 'axios';
import dotenv from 'dotenv';
dotenv.config();

async function main() {
  const ceo = await prisma.user.findFirst({
    where: { role: 'ceo' }
  });

  if (!ceo) {
    console.log("No ceo found");
    return;
  }

  const token = jwt.sign({ id: ceo.id, role: ceo.role, organizationId: ceo.organizationId }, process.env.JWT_SECRET || 'secret', { expiresIn: '1h' });

  try {
    const res = await axios.get('http://localhost:6478/api/v1/ceo/sales-counts', {
      headers: {
        Authorization: `Bearer ${token}`
      }
    });
    console.log(JSON.stringify(res.data, null, 2));
  } catch (err: any) {
    console.error("API Error:", err.response?.data || err.message);
  }
}

main().catch(console.error).finally(async () => { await (prisma as any).$disconnect?.() });
