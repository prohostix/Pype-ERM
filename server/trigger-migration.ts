import axios from 'axios';

async function run() {
  const loginUrl = 'http://localhost:6478/api/v1/auth/login';
  const loginRes = await axios.post(loginUrl, {
    email: 'ceo@pype.com',
    password: 'password123'
  });
  
  const token = loginRes.data.token;
  if (!token) throw new Error("No token returned");
  
  console.log("Logged in!");
  
  const migrateUrl = 'http://localhost:6478/api/v1/organizations/migrate-dsms';
  const migrateRes = await axios.post(migrateUrl, {
    dsmsUrl: 'https://www.dsms-tims.in',
    username: 'shameemtims25',
    password: '859010'
  }, {
    headers: { Authorization: `Bearer ${token}` }
  });
  
  console.log("Migration result:", JSON.stringify(migrateRes.data, null, 2));
}

run().catch(e => {
  if (e.response) {
    console.error("Error Response:", e.response.data);
  } else {
    console.error(e);
  }
});
