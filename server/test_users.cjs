const { Client } = require('pg');
const client = new Client({
  connectionString: 'postgresql://pypeerm:troy1999@pypeerm.cj0mo4q44gde.ap-south-1.rds.amazonaws.com:5432/postgres?sslmode=no-verify'
});

async function run() {
  try {
    await client.connect();
    const res = await client.query("SELECT id, name, role, designation FROM \"User\" WHERE name IN ('APARNA P S', 'ABINAS V H', 'MUBASHIRA K');");
    console.log("Users:", res.rows);
  } catch (error) {
    console.error("Error connecting or querying:", error.message);
  } finally {
    await client.end();
  }
}
run();
