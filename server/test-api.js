const axios = require('axios');
const FormData = require('form-data');
const fs = require('fs');

async function run() {
  try {
    // 1. Get auth token (simulated login)
    const loginRes = await axios.post('http://localhost:6478/api/auth/login', {
      email: 'jithu@example.com', // need an ops admin email? 
      password: 'password123'
    });
    console.log('Login:', loginRes.data);
  } catch(e) {
    console.error('Err:', e.message);
  }
}
run();
