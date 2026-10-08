const { Client } = require('pg');

async function main() {
  const client = new Client({
    connectionString: 'postgresql://pypeerm:troy1999@pypeerm.cj0mo4q44gde.ap-south-1.rds.amazonaws.com:5432/postgres?schema=public&sslmode=no-verify'
  });
  await client.connect();
  
  const studentEmail = 'bishrulhafi676@gmail.com';
  
  // Get the enrollment
  const enrollRes = await client.query(`SELECT * FROM "Enrollment" WHERE "studentEmail" = $1`, [studentEmail]);
  if (enrollRes.rows.length === 0) {
    console.log('No enrollment found for:', studentEmail);
    return;
  }
  
  const enrollment = enrollRes.rows[0];
  console.log('Enrollment details:', {
    id: enrollment.id,
    initialPaymentAmount: enrollment.initialPaymentAmount,
    status: enrollment.status,
    programId: enrollment.programId,
    paymentPlan: enrollment.paymentPlan
  });

  // Try to find payments linked to this enrollment or student
  try {
    const paymentRes = await client.query(`SELECT * FROM "Payment" WHERE "enrollmentId" = $1 OR "studentId" = $2`, [enrollment.id, enrollment.studentId]);
    console.log('Payments:', paymentRes.rows);
  } catch (err) {
    console.log('No Payment table or column issue:', err.message);
  }

  // Check the program fees to see if it generated a receipt for the full program amount by mistake
  try {
    const programRes = await client.query(`SELECT * FROM "Program" WHERE id = $1`, [enrollment.programId]);
    if (programRes.rows.length > 0) {
      console.log('Program details:', {
        name: programRes.rows[0].name,
        fees: programRes.rows[0].fees
      });
    }
  } catch (err) {
    console.log('Error fetching program:', err.message);
  }

  await client.end();
}

main().catch(console.error);
