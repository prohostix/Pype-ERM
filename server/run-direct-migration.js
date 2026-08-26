import { migrateFromDsms } from './dist/controllers/dsmsMigrationController.js';
import prisma from './dist/lib/prisma.js';

async function run() {
  let admin = await prisma.user.findFirst({
    where: { role: 'org_admin' }
  });
  
  if (!admin) {
    admin = await prisma.user.findFirst();
  }

  const req = {
    user: admin,
    body: {
      dsmsUrl: 'https://www.dsms-tims.in',
      username: 'shameemtims25',
      password: '859010'
    }
  };

  const res = {
    status: function(code) {
      this.statusCode = code;
      return this;
    },
    json: function(data) {
      console.log(`Status: ${this.statusCode}`);
      console.log(JSON.stringify(data, null, 2));
    }
  };

  console.log("Starting migration direct call...");
  await migrateFromDsms(req, res);
}

run().catch(console.error);
