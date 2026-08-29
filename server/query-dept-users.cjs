const { Client } = require('pg');
const client = new Client({
  connectionString: process.env.DATABASE_URL
});
async function main() {
  await client.connect();
  const res = await client.query('SELECT d.name as dept_name, COUNT(u.id) as user_count FROM "Department" d LEFT JOIN "User" u ON d.id = u."departmentId" WHERE d.name LIKE \'%Kochi%\' GROUP BY d.name');
  console.log(res.rows);
  await client.end();
}
main().catch(console.error);
