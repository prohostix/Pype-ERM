const { Client } = require('pg');
const client = new Client({
  connectionString: process.env.DATABASE_URL
});
async function main() {
  await client.connect();
  const res = await client.query('SELECT b.name as branch_name, COUNT(u.id) as user_count FROM "Branch" b LEFT JOIN "User" u ON b.id = u."branchId" GROUP BY b.name');
  console.log(res.rows);
  await client.end();
}
main().catch(console.error);
