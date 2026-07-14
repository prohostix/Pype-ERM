import prisma from './src/lib/prisma.js';
import { generateUserId } from './src/utils/authUtils.js';
async function run() {
  try {
    const newId = await generateUserId();
    console.log("Generated:", newId);
    
    // now try to fetch it
    const exists = await prisma.user.findUnique({ where: { userId: newId } });
    console.log("Exists?", !!exists);
  } catch (e) {
    console.error(e);
  }
}
run();
