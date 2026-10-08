const { Client } = require('pg');

async function main() {
  const client = new Client({
    connectionString: 'postgresql://pypeerm:troy1999@pypeerm.cj0mo4q44gde.ap-south-1.rds.amazonaws.com:5432/postgres?schema=public&sslmode=no-verify'
  });
  await client.connect();
  
  const studentEmail = 'bishrulhafi676@gmail.com';
  
  try {
    const studentRes = await client.query(`SELECT id FROM "Student" WHERE email ILIKE $1`, ['%bishrulhafi676%']);
    const userRes = await client.query(`SELECT id FROM "User" WHERE email ILIKE $1`, ['%bishrulhafi676%']);
    
    let studentId = studentRes.rows.length > 0 ? studentRes.rows[0].id : null;
    let userId = userRes.rows.length > 0 ? userRes.rows[0].id : null;
    
    if (studentId) {
      // Find invoices
      const invoiceRes = await client.query(`SELECT id FROM "Invoice" WHERE "studentId" = $1`, [studentId]);
      const invoiceIds = invoiceRes.rows.map(r => r.id);
      
      for (let invId of invoiceIds) {
        // Delete PaymentEntries connected to this invoice
        await client.query(`DELETE FROM "PaymentEntry" WHERE "invoiceId" = $1`, [invId]);
      }
      
      // Now delete Invoices
      await client.query(`DELETE FROM "Invoice" WHERE "studentId" = $1`, [studentId]);
      
      // Enrollments
      const enrollRes = await client.query(`SELECT id FROM "Enrollment" WHERE "studentId" = $1 OR "studentEmail" ILIKE $2`, [studentId, '%bishrulhafi676%']);
      const enrollmentIds = enrollRes.rows.map(r => r.id);
      
      for (let eid of enrollmentIds) {
        await client.query(`DELETE FROM "EnrollmentPayment" WHERE "enrollmentId" = $1`, [eid]);
        await client.query(`DELETE FROM "Enrollment" WHERE id = $1`, [eid]);
      }
      
      await client.query(`DELETE FROM "Enrollment" WHERE "studentEmail" ILIKE $1`, ['%bishrulhafi676%']);
      await client.query(`DELETE FROM "Student" WHERE id = $1`, [studentId]);
    }
    
    if (userId) {
      // Student User
      await client.query(`DELETE FROM "User" WHERE id = $1`, [userId]);
    }
    
    // Fallback cleanup
    await client.query(`DELETE FROM "Student" WHERE email ILIKE $1`, ['%bishrulhafi676%']);
    await client.query(`DELETE FROM "User" WHERE email ILIKE $1`, ['%bishrulhafi676%']);
    
    console.log('Successfully deleted student data.');
  } catch (err) {
    console.log('Error deleting data:', err.message);
  }

  await client.end();
}

main().catch(console.error);
