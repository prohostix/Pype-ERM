import prisma from '../src/lib/prisma.js';

async function fixInvoices() {
  const invoices = await prisma.invoice.findMany({
    where: { studentId: null, notes: 'Initial Admission Payment' },
    include: { payments: true }
  });

  console.log(`Found ${invoices.length} invoices with null studentId`);

  for (const inv of invoices) {
    if (inv.payments.length > 0) {
      const payment = inv.payments[0];
      // Try to find matching EnrollmentPayment
      const envPayment = await prisma.enrollmentPayment.findFirst({
        where: {
          amount: payment.amount,
          debitedAt: payment.receivedAt // strict match
        },
        include: { enrollment: true }
      });

      if (envPayment && envPayment.enrollment && envPayment.enrollment.studentId) {
        await prisma.invoice.update({
          where: { id: inv.id },
          data: { studentId: envPayment.enrollment.studentId }
        });
        console.log(`Linked invoice ${inv.invoiceNo} to student ${envPayment.enrollment.studentId}`);
      } else {
        // try finding by matching created dates within 10 seconds
        const allEnvPayments = await prisma.enrollmentPayment.findMany({
          where: { amount: payment.amount },
          include: { enrollment: true }
        });

        let matched = false;
        for (const ep of allEnvPayments) {
          if (Math.abs(ep.debitedAt.getTime() - payment.receivedAt.getTime()) < 10000) {
            if (ep.enrollment && ep.enrollment.studentId) {
              await prisma.invoice.update({
                where: { id: inv.id },
                data: { studentId: ep.enrollment.studentId }
              });
              console.log(`Linked invoice ${inv.invoiceNo} to student ${ep.enrollment.studentId} (fuzzy match)`);
              matched = true;
              break;
            }
          }
        }
        if (!matched) {
          console.log(`Could not link invoice ${inv.invoiceNo}`);
        }
      }
    }
  }
}

fixInvoices().then(() => {
  console.log('Done');
  process.exit(0);
}).catch(console.error);
