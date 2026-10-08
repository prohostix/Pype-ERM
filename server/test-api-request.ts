import express from 'express';
import { getPrograms } from './src/controllers/operationsController.js';
import prisma from './src/lib/prisma.js';

async function run() {
  const req = {
    user: {
      id: 'be9807a2-61bf-45bc-8786-60ae33c8dc39',
      role: 'center_admin',
      studyCenterId: '6590c558-f182-4908-a5e4-708295854bbd',
      organizationId: '8aff7eb8-1d74-443f-87d3-19290baaccb2'
    }
  } as any;
  
  const res = {
    json: (data: any) => console.log('Response:', JSON.stringify(data, null, 2)),
    status: (code: number) => { console.log('Status:', code); return res; }
  } as any;
  
  await getPrograms(req, res, () => {});
}
run();
