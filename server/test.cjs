const jwt = require('jsonwebtoken');
const fs = require('fs');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function run() {
  try {
    const student = await prisma.student.findFirst({
        where: { admissionProgress: { not: undefined } }
    });
    if (!student) return console.log('No student');
    
    const user = await prisma.user.findFirst({ where: { role: 'ops_admin' } });
    if (!user) return console.log('No user');

    const token = jwt.sign({ id: user.id }, 'your-super-secret-jwt-key-change-this-in-production', { expiresIn: '1d' });
    
    console.log('Testing with student:', student.id);
    
    // Create a dummy file
    fs.writeFileSync('dummy.txt', 'hello');

    const FormData = (await import('formdata-node')).FormData;
    const { fileFromSync } = await import('fetch-blob/from.js');

    const form = new FormData();
    form.append('status', 'completed');
    form.append('proof', fileFromSync('dummy.txt'));

    const res = await fetch(`http://localhost:6478/api/v1/students/${student.id}/progress/docs`, {
      method: 'PUT',
      headers: {
        Authorization: `Bearer ${token}`
      },
      body: form
    });

    const data = await res.json();
    console.log('Response:', data);
  } catch(e) {
    console.error('Error:', e);
  } finally {
    prisma.$disconnect();
  }
}
run();
