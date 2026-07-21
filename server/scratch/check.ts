import { PrismaClient } from '../src/generated/client/index.js';
import * as dotenv from 'dotenv';
dotenv.config();

const prisma = new PrismaClient();

async function main() {
  const students = await prisma.student.findMany({
    where: { 
      name: { in: ['LUBAIBA P V', 'MOHAMED JUNAID V', 'MOHAMED ASLAM V K'] }
    },
    select: {
      name: true,
      program: {
        select: { 
          name: true,
          feeStructures: true
        }
      },
      paymentSchedules: true,
    }
  });
  console.log(JSON.stringify(students, null, 2));
}

main().catch(console.error).finally(() => prisma.$disconnect());
