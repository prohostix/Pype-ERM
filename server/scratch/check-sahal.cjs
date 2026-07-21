const { Client } = require('pg');
require('dotenv').config();

const client = new Client({
  connectionString: process.env.DATABASE_URL
});

async function main() {
  await client.connect();
  const res = await client.query("SELECT * FROM \"Student\" WHERE name = 'Sahal K K'");
  const student = res.rows[0];
  console.log("Sahal:", student);

  if (student) {
    const schedules = await client.query("SELECT * FROM \"PaymentSchedule\" WHERE \"studentId\" = $1", [student.id]);
    console.log("Schedules:", JSON.stringify(schedules.rows, null, 2));
  }
  
  await client.end();
}
main().catch(console.error);
