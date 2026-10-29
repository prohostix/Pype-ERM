/**
 * Branded HTML Email Template Generator for Pype-ERM Organizations
 * Renders high-compatibility, responsive, and beautifully designed emails
 * dynamically customized with the organization's name, logo, primary color,
 * address, contact numbers, and login URL.
 */

export interface OrganizationBrandInfo {
  name: string;
  logo?: string | null;
  email?: string | null;
  phone?: string | null;
  address?: string | null;
  brandColor?: string | null;
  portalUrl?: string | null;
  fromName?: string | null;
}

export interface EmailDetailItem {
  label: string;
  value: string;
  highlight?: boolean;
}

export interface EmailActionButton {
  label: string;
  url: string;
}

export interface BrandedEmailOptions {
  org: OrganizationBrandInfo;
  title: string;
  subtitle?: string;
  recipientName?: string;
  badgeText?: string;
  badgeType?: 'success' | 'info' | 'warning' | 'primary';
  contentHtml?: string;
  details?: EmailDetailItem[];
  actionButton?: EmailActionButton;
  secondaryNote?: string;
}

/**
 * Resolves a safe public image URL for the organization logo
 */
function resolveLogoUrl(logoPath?: string | null): string | null {
  if (!logoPath) return null;
  if (logoPath.startsWith('http://') || logoPath.startsWith('https://') || logoPath.startsWith('data:image/')) {
    return logoPath;
  }
  const backendBase = (process.env.BACKEND_PUBLIC_URL || process.env.API_URL || 'http://localhost:6478').replace(/\/$/, '');
  const cleanPath = logoPath.startsWith('/') ? logoPath : `/${logoPath}`;
  return `${backendBase}${cleanPath}`;
}

/**
 * Generates full responsive HTML for a branded institutional email
 */
export function renderBrandedEmailHtml(options: BrandedEmailOptions): string {
  const {
    org,
    title,
    subtitle,
    recipientName,
    badgeText,
    badgeType = 'primary',
    contentHtml = '',
    details = [],
    actionButton,
    secondaryNote
  } = options;

  const orgName = org.name || 'Educational Institution';
  const brandColor = org.brandColor || '#1e40af'; // Default indigo-800
  const portalUrl = org.portalUrl || process.env.FRONTEND_URL || 'http://localhost:5173';
  const logoUrl = resolveLogoUrl(org.logo);
  const year = new Date().getFullYear();

  // Badge styles
  const badgeColors = {
    primary: { bg: '#eff6ff', border: '#bfdbfe', text: brandColor },
    success: { bg: '#ecfdf5', border: '#a7f3d0', text: '#047857' },
    warning: { bg: '#fffbeb', border: '#fde68a', text: '#b45309' },
    info: { bg: '#f0f9ff', border: '#bae6fd', text: '#0369a1' },
  }[badgeType];

  // Details block
  let detailsHtml = '';
  if (details && details.length > 0) {
    const rows = details.map((item, idx) => `
      <tr style="border-bottom: ${idx < details.length - 1 ? '1px solid #f1f5f9' : 'none'};">
        <td style="padding: 10px 14px; font-size: 13px; color: #64748b; font-weight: 500; width: 40%; vertical-align: top;">
          ${item.label}
        </td>
        <td style="padding: 10px 14px; font-size: 13px; color: ${item.highlight ? brandColor : '#0f172a'}; font-weight: ${item.highlight ? '700' : '600'}; width: 60%; vertical-align: top;">
          ${item.value}
        </td>
      </tr>
    `).join('');

    detailsHtml = `
      <div style="margin: 24px 0; border: 1px solid #e2e8f0; border-radius: 10px; background-color: #f8fafc; overflow: hidden;">
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="border-collapse: collapse;">
          <tbody>
            ${rows}
          </tbody>
        </table>
      </div>
    `;
  }

  // Action button
  let buttonHtml = '';
  if (actionButton) {
    buttonHtml = `
      <div style="margin: 32px 0 20px 0; text-align: center;">
        <a href="${actionButton.url}" target="_blank" style="display: inline-block; background-color: ${brandColor}; color: #ffffff; text-decoration: none; font-size: 14px; font-weight: 600; padding: 13px 32px; border-radius: 8px; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -2px rgba(0, 0, 0, 0.1);">
          ${actionButton.label} &rarr;
        </a>
      </div>
    `;
  }

  // Secondary note
  const noteHtml = secondaryNote ? `
    <div style="margin: 20px 0; padding: 12px 16px; background-color: #f8fafc; border-left: 4px solid ${brandColor}; border-radius: 4px; font-size: 12px; color: #64748b; line-height: 1.5;">
      ${secondaryNote}
    </div>
  ` : '';

  // Clean address lines
  const formattedAddress = (org.address || '')
    .split('\n')
    .map(line => line.trim())
    .filter(Boolean)
    .join(' &bull; ');

  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title}</title>
  <style>
    body { margin: 0; padding: 0; background-color: #f1f5f9; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; -webkit-font-smoothing: antialiased; }
    table { border-collapse: collapse; }
    img { border: 0; outline: none; text-decoration: none; }
    @media only screen and (max-width: 620px) {
      .container { width: 100% !important; padding: 12px !important; }
      .content-card { padding: 20px !important; }
      .header-pad { padding: 20px !important; }
    }
  </style>
</head>
<body style="margin: 0; padding: 30px 10px; background-color: #f1f5f9; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #334155;">

  <center>
    <table role="presentation" class="container" width="600" cellspacing="0" cellpadding="0" style="max-width: 600px; width: 100%; margin: 0 auto;">
      
      <!-- HEADER / BRANDING -->
      <tr>
        <td class="header-pad" style="padding: 24px 32px; background-color: #ffffff; border-top-left-radius: 14px; border-top-right-radius: 14px; border-top: 5px solid ${brandColor}; border-left: 1px solid #e2e8f0; border-right: 1px solid #e2e8f0;">
          <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
            <tr>
              <td align="left" style="vertical-align: middle;">
                ${logoUrl ? `
                  <img src="${logoUrl}" alt="${orgName}" style="max-height: 52px; max-width: 200px; height: auto; display: block; object-fit: contain;">
                ` : `
                  <div style="display: inline-block; background-color: ${brandColor}; color: #ffffff; font-size: 20px; font-weight: 700; width: 44px; height: 44px; line-height: 44px; text-align: center; border-radius: 10px; letter-spacing: -0.5px;">
                    ${(orgName.trim().charAt(0) || 'P').toUpperCase()}
                  </div>
                  <div style="display: inline-block; vertical-align: middle; margin-left: 12px; font-size: 18px; font-weight: 700; color: #0f172a; letter-spacing: -0.3px;">
                    ${orgName}
                  </div>
                `}
              </td>
              ${org.portalUrl ? `
                <td align="right" style="vertical-align: middle;">
                  <a href="${portalUrl}" target="_blank" style="font-size: 12px; color: ${brandColor}; text-decoration: none; font-weight: 600;">
                    Visit Portal &rarr;
                  </a>
                </td>
              ` : ''}
            </tr>
          </table>
        </td>
      </tr>

      <!-- BODY CARD -->
      <tr>
        <td class="content-card" style="padding: 36px 32px; background-color: #ffffff; border-left: 1px solid #e2e8f0; border-right: 1px solid #e2e8f0; border-bottom: 1px solid #e2e8f0; border-bottom-left-radius: 14px; border-bottom-right-radius: 14px; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05);">
          
          ${badgeText ? `
            <div style="margin-bottom: 16px;">
              <span style="display: inline-block; background-color: ${badgeColors.bg}; border: 1px solid ${badgeColors.border}; color: ${badgeColors.text}; padding: 4px 10px; border-radius: 6px; font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px;">
                ${badgeText}
              </span>
            </div>
          ` : ''}

          <h1 style="margin: 0 0 8px 0; font-size: 22px; font-weight: 700; color: #0f172a; line-height: 1.3;">
            ${title}
          </h1>

          ${subtitle ? `
            <p style="margin: 0 0 24px 0; font-size: 14px; color: #64748b; line-height: 1.5;">
              ${subtitle}
            </p>
          ` : `<div style="height: 16px;"></div>`}

          ${recipientName ? `
            <p style="margin: 0 0 16px 0; font-size: 15px; color: #334155; line-height: 1.6;">
              Dear <strong>${recipientName}</strong>,
            </p>
          ` : ''}

          ${contentHtml ? `
            <div style="font-size: 14px; color: #475569; line-height: 1.6;">
              ${contentHtml}
            </div>
          ` : ''}

          ${detailsHtml}

          ${buttonHtml}

          ${noteHtml}

          <div style="margin-top: 32px; padding-top: 20px; border-top: 1px solid #f1f5f9; font-size: 13px; color: #475569;">
            Warm regards,<br>
            <strong style="color: #0f172a;">${org.fromName || orgName}</strong>
          </div>

        </td>
      </tr>

      <!-- FOOTER -->
      <tr>
        <td style="padding: 24px 16px; text-align: center; font-size: 12px; color: #94a3b8; line-height: 1.6;">
          
          <div style="font-weight: 600; color: #64748b; margin-bottom: 4px;">
            ${orgName}
          </div>

          ${formattedAddress ? `
            <div style="margin-bottom: 6px; font-size: 11px;">
              ${formattedAddress}
            </div>
          ` : ''}

          <div style="margin-bottom: 12px; font-size: 11px;">
            ${org.email ? `Email: <a href="mailto:${org.email}" style="color: #64748b; text-decoration: underline;">${org.email}</a>` : ''}
            ${org.phone ? ` &bull; Tel: <a href="tel:${org.phone}" style="color: #64748b; text-decoration: none;">${org.phone}</a>` : ''}
          </div>

          <div style="font-size: 10px; color: #cbd5e1; margin-top: 10px;">
            This is an automated communication from ${orgName}. Please do not reply directly to this email unless directed.<br>
            &copy; ${year} ${orgName}. All rights reserved.
          </div>

        </td>
      </tr>

    </table>
  </center>

</body>
</html>
  `.trim();
}

/**
 * Builds Student/Staff Account Credentials Email
 */
export function buildCredentialsEmail(options: {
  org: OrganizationBrandInfo;
  recipientName: string;
  email: string;
  password: string;
  userId?: string;
  loginUrl?: string;
  roleTitle?: string;
}): { subject: string; text: string; html: string } {
  const { org, recipientName, email, password, userId, loginUrl, roleTitle = 'Student' } = options;
  const orgName = org.name || 'Our Institution';
  const portalUrl = loginUrl || org.portalUrl || process.env.FRONTEND_URL || 'http://localhost:5173';

  const details: EmailDetailItem[] = [
    { label: 'Portal URL', value: portalUrl },
    { label: 'Username / Email', value: email, highlight: true },
    { label: 'Temporary Password', value: password, highlight: true }
  ];

  if (userId) {
    details.unshift({ label: 'Student / User ID', value: userId });
  }

  const subject = `Welcome to ${orgName} - Your ${roleTitle} Portal Credentials`;

  const text = `Dear ${recipientName},\n\nWelcome to ${orgName}! Your ${roleTitle.toLowerCase()} account has been successfully configured.\n\nLogin Details:\nPortal: ${portalUrl}\nEmail: ${email}\nPassword: ${password}${userId ? `\nUser ID: ${userId}` : ''}\n\nPlease sign in and change your password upon your first login.\n\nWarm regards,\n${orgName}`;

  const html = renderBrandedEmailHtml({
    org,
    title: `Welcome to ${orgName}`,
    subtitle: `Your ${roleTitle.toLowerCase()} account has been created and is ready to use.`,
    recipientName,
    badgeText: `${roleTitle} Account Ready`,
    badgeType: 'success',
    contentHtml: `<p>We are delighted to welcome you. Your official portal credentials have been provisioned below. You can use these credentials to access your academic dashboard, track courses, view schedules, and manage fee installments.</p>`,
    details,
    actionButton: {
      label: 'Sign In to Your Account',
      url: portalUrl
    },
    secondaryNote: '<strong>Security Tip:</strong> For your protection, please do not share these credentials with anyone. We recommend changing your password after signing in for the first time.'
  });

  return { subject, text, html };
}

/**
 * Builds Student Admission Confirmation Email
 */
export function buildAdmissionEmail(options: {
  org: OrganizationBrandInfo;
  recipientName: string;
  programName: string;
  admissionNo: string;
  sessionName?: string;
  loginUrl?: string;
}): { subject: string; text: string; html: string } {
  const { org, recipientName, programName, admissionNo, sessionName, loginUrl } = options;
  const orgName = org.name || 'Our Institution';
  const portalUrl = loginUrl || org.portalUrl || process.env.FRONTEND_URL || 'http://localhost:5173';

  const details: EmailDetailItem[] = [
    { label: 'Admission Number', value: admissionNo, highlight: true },
    { label: 'Enrolled Program', value: programName },
  ];

  if (sessionName) {
    details.push({ label: 'Academic Session', value: sessionName });
  }

  const subject = `Admission Confirmed - ${programName} | ${orgName}`;

  const text = `Dear ${recipientName},\n\nCongratulations! Your admission for ${programName} has been officially approved and confirmed.\n\nAdmission Number: ${admissionNo}\nProgram: ${programName}\n\nWarm regards,\n${orgName}`;

  const html = renderBrandedEmailHtml({
    org,
    title: 'Congratulations on Your Admission!',
    subtitle: `Your enrollment for ${programName} is officially confirmed.`,
    recipientName,
    badgeText: 'Admission Confirmed',
    badgeType: 'success',
    contentHtml: `<p>Congratulations! We are thrilled to inform you that your application and admission documents have been verified and approved.</p>`,
    details,
    actionButton: {
      label: 'Open Student Portal',
      url: portalUrl
    },
    secondaryNote: 'Keep this email for your records. Your Admission Number will be required for all future official correspondence, examinations, and fee payments.'
  });

  return { subject, text, html };
}

/**
 * Builds Fee Payment Receipt Email
 */
export function buildFeeReceiptEmail(options: {
  org: OrganizationBrandInfo;
  recipientName: string;
  amount: string | number;
  receiptNo: string;
  paymentDate?: string;
  paymentMode?: string;
  balanceAmount?: string | number;
}): { subject: string; text: string; html: string } {
  const { org, recipientName, amount, receiptNo, paymentDate = new Date().toLocaleDateString(), paymentMode = 'Online', balanceAmount } = options;
  const orgName = org.name || 'Our Institution';

  const formattedAmount = typeof amount === 'number' ? `₹${amount.toLocaleString('en-IN')}` : (amount.toString().startsWith('₹') ? amount.toString() : `₹${amount}`);

  const details: EmailDetailItem[] = [
    { label: 'Receipt Number', value: receiptNo },
    { label: 'Amount Paid', value: formattedAmount, highlight: true },
    { label: 'Payment Date', value: paymentDate },
    { label: 'Payment Method', value: paymentMode },
  ];

  if (balanceAmount !== undefined && balanceAmount !== null) {
    const formattedBal = typeof balanceAmount === 'number' ? `₹${balanceAmount.toLocaleString('en-IN')}` : `₹${balanceAmount}`;
    details.push({ label: 'Remaining Balance', value: formattedBal });
  }

  const subject = `Fee Payment Receipt #${receiptNo} - ${orgName}`;

  const text = `Dear ${recipientName},\n\nThank you! We have received your payment of ${formattedAmount} against Receipt #${receiptNo}.\n\nDate: ${paymentDate}\nMode: ${paymentMode}\n\nWarm regards,\n${orgName}`;

  const html = renderBrandedEmailHtml({
    org,
    title: 'Payment Received Successfully',
    subtitle: `Receipt #${receiptNo} has been generated for your recent transaction.`,
    recipientName,
    badgeText: 'Payment Receipt',
    badgeType: 'success',
    contentHtml: `<p>Thank you for your timely payment. Your transaction has been recorded in the financial ledger, and the summary of this installment is detailed below.</p>`,
    details,
    secondaryNote: 'This is an official computer-generated receipt. You can also view and download full PDF statements anytime from your student portal.'
  });

  return { subject, text, html };
}
