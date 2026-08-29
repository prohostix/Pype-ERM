const { Client } = require('pg');
const client = new Client({
  connectionString: process.env.DATABASE_URL
});
async function main() {
  await client.connect();
  const res = await client.query('SELECT u.name as user_name, d.name as dept_name, b.name as branch_name FROM "User" u LEFT JOIN "Department" d ON u."departmentId" = d.id LEFT JOIN "Branch" b ON u."branchId" = b.id WHERE d.name LIKE \'%Kochi%\'');
  console.log(res.rows);
  await client.end();
}
main().catch(console.error);
