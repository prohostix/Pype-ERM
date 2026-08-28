const { Client } = require('pg');
const client = new Client({
  connectionString: 'postgresql://pypeerm:troy1999@pypeerm.cj0mo4q44gde.ap-south-1.rds.amazonaws.com:5432/postgres?sslmode=no-verify'
});
client.connect().then(() => {
  return client.query("SELECT id, \"fullName\", email FROM \"Student\" WHERE \"fullName\" IN ('APARNA P S', 'ABINAS V H', 'MUBASHIRA K');");
}).then(res => {
  console.log(res.rows);
  client.end();
}).catch(console.error);
