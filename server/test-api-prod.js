import jwt from 'jsonwebtoken';

const token = jwt.sign({ id: 'e283d462-a620-4a5d-bbe0-e6fc63c84e9f' }, 'your-super-secret-jwt-key-change-this-in-production', { expiresIn: '1h' });

async function test() {
  try {
    const res = await fetch('https://pypeerm.com/api/v1/users', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`
      },
      body: JSON.stringify({
        name: 'Test Employee 123',
        email: 'testemployee12345@example.com',
        phone: '1234567890',
        role: 'staff',
        designation: 'Tester',
        password: 'password123'
      })
    });
    const text = await res.text();
    console.log('STATUS:', res.status, 'BODY:', text);
  } catch (err) {
    console.error('ERROR:', err);
  }
}
test();
