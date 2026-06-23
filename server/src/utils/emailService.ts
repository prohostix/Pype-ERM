import nodemailer from 'nodemailer';

export const sendEmail = async (to: string, subject: string, text: string, html: string) => {
  const host = process.env.SMTP_HOST;
  const port = Number(process.env.SMTP_PORT) || 587;
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;
  const from = process.env.SMTP_FROM || 'noreply@pypeerm.com';

  console.log('----------------------------------------');
  console.log(`✉️ Sending Email to: ${to}`);
  console.log(`Subject: ${subject}`);
  console.log(`Content:\n${text}`);
  console.log('----------------------------------------');

  if (!host || !user || !pass) {
    console.log('⚠️ SMTP host, user, or pass not configured in environment variables. Email logged to console.');
    return;
  }

  try {
    const transporter = nodemailer.createTransport({
      host,
      port,
      secure: port === 465,
      auth: { user, pass }
    });

    await transporter.sendMail({ from, to, subject, text, html });
    console.log(`✅ Email sent successfully to ${to}`);
  } catch (err) {
    console.error(`❌ Failed to send email to ${to}:`, err);
  }
};
