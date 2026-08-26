import { migrateFromDsms } from './src/controllers/dsmsMigrationController.ts';
import prisma from './src/lib/prisma.ts';

async function run() {
  const admin = await prisma.user.findFirst({
    where: { role: 'org_admin' }
  });
  
  if (!admin) {
    console.log("No admin found. finding any user...");
    const anyUser = await prisma.user.findFirst();
    if (!anyUser) throw new Error("No users in db");
    admin = anyUser;
  }

  const req = {
    user: admin,
    body: {
      dsmsUrl: 'https://www.dsms-tims.in',
      username: 'shameemtims25',
      password: '859010'
    }
  } as any;

  const res = {
    status: function(code: number) {
      this.statusCode = code;
      return this;
    },
    json: function(data: any) {
      console.log(`Status: ${this.statusCode}`);
      console.log(JSON.stringify(data, null, 2));
    }
  } as any;

  console.log("Starting migration direct call...");
  await migrateFromDsms(req, res);
}

run().catch(console.error);
