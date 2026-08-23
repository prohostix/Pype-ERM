import { createWorker } from 'tesseract.js';
import fs from 'fs';

async function main() {
  const worker = await createWorker('eng');
  const files = [
    '/Users/retro/.gemini/antigravity-ide/brain/2bc797bc-239b-438f-83c9-2926acff49e0/.user_uploaded/media_1787510618364.png',
    '/Users/retro/.gemini/antigravity-ide/brain/2bc797bc-239b-438f-83c9-2926acff49e0/.user_uploaded/media_1787510369197.png',
    '/Users/retro/.gemini/antigravity-ide/brain/2bc797bc-239b-438f-83c9-2926acff49e0/.user_uploaded/media_1787509821271.png'
  ];
  for (const f of files) {
    if (fs.existsSync(f)) {
      console.log('--- ' + f + ' ---');
      const ret = await worker.recognize(f);
      console.log(ret.data.text.substring(0, 500));
    }
  }
  await worker.terminate();
}
main();
