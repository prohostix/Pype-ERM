import prisma from './src/lib/prisma.js';
import jwt from 'jsonwebtoken';

async function run() {
  const user = await prisma.user.findFirst({ where: { email: 'bossacademics@gmail.com' } });
  if (!user) return console.log('User not found');
  
  console.log('User id:', user.id, 'studyCenterId:', user.studyCenterId);
  
  // What if we construct the token like authController does?
  const token = jwt.sign({ id: user.id, role: user.role, organizationId: user.organizationId }, process.env.JWT_SECRET || 'secret');
  console.log('Token generated');
  
  // Now verify it like auth.ts does
  const decoded: any = jwt.verify(token, process.env.JWT_SECRET || 'secret');
  console.log('Decoded id:', decoded.id);
  
  const foundUser = await prisma.user.findUnique({
    where: { id: decoded.id },
    select: {
      id: true, role: true, studyCenterId: true,
    }
  });
  
  console.log('Found user:', foundUser);
}
run();
