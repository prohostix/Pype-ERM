import fs from 'fs';
import FormData from 'form-data';
import fetch from 'node-fetch';

fs.writeFileSync('test.jpg', 'fake image content');

async function testUpload() {
  try {
    const formData = new FormData();
    formData.append('file', fs.createReadStream('test.jpg'));

    // To test the endpoint we need a token.
    // Let's just mock the auth or login first.
    // Instead, let's write a direct test of the multer-s3 setup.
  } catch (err) {
    console.error(err);
  }
}

testUpload();
