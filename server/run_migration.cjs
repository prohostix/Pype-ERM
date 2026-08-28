const { Client } = require('pg');
const client = new Client({
  connectionString: 'postgresql://pypeerm:troy1999@pypeerm.cj0mo4q44gde.ap-south-1.rds.amazonaws.com:5432/postgres?sslmode=no-verify'
});

async function run() {
  try {
    await client.connect();
    console.log("Connected to database. Running ALTER TYPE...");
    await client.query("ALTER TYPE \"UserRole\" RENAME VALUE 'staff' TO 'student';");
    console.log("Enum successfully renamed!");
  } catch (error) {
    console.error("Migration error:", error);
  } finally {
    await client.end();
  }
}
run();
