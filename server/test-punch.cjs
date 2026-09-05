const jwt = require('jsonwebtoken');
const dotenv = require('dotenv');
const fetch = require('node-fetch');

dotenv.config({ path: '/Users/apple/Documents/ProHostix/Pype-ERM/server/.env' });
const secret = process.env.JWT_SECRET;

const token = jwt.sign({ id: 'dummy-id' }, secret, { expiresIn: '1h' });
console.log("Token:", token);

fetch('http://localhost:6478/api/v1/attendance/punch-in', {
  method: 'POST',
  headers: {
    'Authorization': 'Bearer ' + token,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    latitude: 12.34,
    longitude: 56.78
  })
})
.then(res => res.json())
.then(data => console.log("Response:", data))
.catch(err => console.error("Error:", err));
