const { Client } = require('pg');
const client = new Client({
  connectionString: 'postgresql://pypeerm:troy1999@pypeerm.cj0mo4q44gde.ap-south-1.rds.amazonaws.com:5432/postgres?sslmode=no-verify'
});

async function run() {
  try {
    await client.connect();
    const res = await client.query("SELECT COUNT(*) FROM \"User\" WHERE role::text = 'staff';");
    console.log("Users with staff role:", res.rows[0].count);
    const res2 = await client.query("SELECT COUNT(*) FROM \"User\" WHERE role::text = 'student';");
    console.log("Users with student role:", res2.rows[0].count);
  } catch (error) {
    console.error("Error connecting or querying:", error.message);
  } finally {
    await client.end();
  }
}
run();
