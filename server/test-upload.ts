import fs from 'fs';
import FormData from 'form-data';
import fetch from 'node-fetch';
import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';
dotenv.config();

async function run() {
  fs.writeFileSync('test.jpg', 'fake image content');

  try {
    const userStr = 'be9807a2-61bf-45bc-8786-60ae33c8dc39';
    const secret = process.env.JWT_SECRET;
    console.log('Secret:', secret?.substring(0, 5) + '...');
    const token = jwt.sign({ id: userStr, role: 'center_admin', organizationId: '8aff7eb8-1d74-443f-87d3-19290baaccb2' }, secret);
    
    const formData = new FormData();
    formData.append('file', fs.createReadStream('test.jpg'));
    
    const uploadRes = await fetch('http://localhost:5000/api/v1/auth/upload', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`
      },
      body: formData
    });
    
    const result = await uploadRes.text();
    console.log('Upload result status:', uploadRes.status);
    console.log('Upload result body:', result);

  } catch (err) {
    console.error('Error during upload test:', err);
  }
}

run();
