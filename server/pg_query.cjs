const { Client } = require('pg');

async function main() {
  const client = new Client({
    connectionString: "postgresql://pypeerm:troy1999@pypeerm.cj0mo4q44gde.ap-south-1.rds.amazonaws.com:5432/postgres?schema=public&sslmode=no-verify"
  });

  await client.connect();

  try {
    const res = await client.query(`SELECT * FROM "User" WHERE email = 'timstirur@gmail.com'`);
    if (res.rows.length === 0) {
      console.log('User not found');
    } else {
      const user = res.rows[0];
      console.log('User ID:', user.id);
      console.log('Name:', user.name);
      console.log('Email:', user.email);
      console.log('Role:', user.role);
      console.log('Manager ID:', user.managerId);
      console.log('Designation ID:', user.designationId);
      console.log('Department ID:', user.departmentId);

      // fetch manager
      if (user.managerId) {
        const manager = await client.query(`SELECT id, name, email FROM "User" WHERE id = $1`, [user.managerId]);
        if (manager.rows.length > 0) {
            console.log('\nManager:', manager.rows[0]);
        }
      }

      // fetch subordinates
      const subs = await client.query(`SELECT id, name, email, role FROM "User" WHERE "managerId" = $1`, [user.id]);
      console.log(`\nSubordinates (${subs.rows.length}):`);
      subs.rows.forEach(s => console.log(`- ${s.name} (${s.email}) - ${s.role}`));

    }
  } catch (err) {
    console.error('Error:', err.message);
  } finally {
    await client.end();
  }
}

main();
