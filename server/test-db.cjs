const { Client } = require('pg');
const client = new Client({
  connectionString: "postgresql://postgres:pypeerm123%40@db.pcdohsutepsgapcchmdj.supabase.co:5432/postgres?schema=public"
});
async function main() {
  await client.connect();
  const res = await client.query('SELECT name, photo FROM "Student" LIMIT 5');
  console.log("Students:", res.rows);
  const res2 = await client.query('SELECT name, logo FROM "University" LIMIT 5');
  console.log("Universities:", res2.rows);
  await client.end();
}
main().catch(console.error);
