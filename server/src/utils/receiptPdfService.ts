import PDFDocument from 'pdfkit';
import prisma from '../lib/prisma.js';

export interface BillReceiptData {
  receiptNo: string;
  date: string | Date;
  billDate?: string | Date;
  latestTransactionDate?: string | Date;
  latestBillDate?: string | Date;
  admissionNo?: string;
  enrollmentNo?: string;
  studentName: string;
  studentDob?: string | Date | null;
  studentEmail?: string;
  studentPhone?: string;
  program?: string;
  university?: string;
  center?: string;
  centerDetails?: {
    id?: string | null;
    name?: string | null;
    code?: string | null;
    address?: string | null;
    contact?: string | null;
    email?: string | null;
    city?: string | null;
    state?: string | null;
  } | null;
  amount: number | string;
  tax?: number;
  total: number;
  paymentMethod?: string;
  payAt?: string;
  referenceNo?: string;
  totalFee?: number;
  overallProgramFee?: number;
  overallPaid?: number;
  totalRemitted?: number;
  balanceFee?: number;
  balanceDue?: number;
  feeStructureMissing?: boolean;
  status?: string;
  items?: Array<{ description?: string; studentName?: string; name?: string; amount: number; enrollmentNo?: string }>;
  payments?: Array<any>;
  paymentHistory?: Array<{ id?: string; date?: string | Date; referenceNo?: string; invoiceNo?: string; method?: string; amount: number }>;
  organization: {
    name: string;
    logo?: string | null;
    address?: string | null;
    phone?: string | null;
    email?: string | null;
  };
}

function numberToWords(amount: number): string {
  if (!amount || amount === 0) return 'Zero Rs. Only';
  const single = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine'];
  const double = ['Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'];
  const tens = ['', 'Ten', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];
  const format = (n: number): string => {
    if (n < 10) return single[n];
    if (n < 20) return double[n - 10];
    const t = Math.floor(n / 10);
    const s = n % 10;
    return tens[t] + (s > 0 ? ' ' + single[s] : '');
  };

  let words = '';
  let n = Math.floor(amount);

  if (n >= 10000000) {
    words += format(Math.floor(n / 10000000)) + ' Crore ';
    n %= 10000000;
  }
  if (n >= 100000) {
    words += format(Math.floor(n / 100000)) + ' Lakh ';
    n %= 100000;
  }
  if (n >= 1000) {
    words += format(Math.floor(n / 1000)) + ' Thousand ';
    n %= 1000;
  }
  if (n >= 100) {
    words += format(Math.floor(n / 100)) + ' Hundred ';
    n %= 100;
  }
  if (n > 0) {
    words += format(n) + ' ';
  }

  return words.trim() + ' Rs. Only';
}

/**
 * Generates a vector PDF receipt that EXACTLY matches the BillReceiptPanel design
 */
export async function generateReceiptPdfBuffer(data: BillReceiptData | any): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({
        size: 'A4',
        margin: 28,
        info: {
          Title: `Receipt-${data.receiptNo || 'Bill'}`,
          Author: data.organization?.name || 'Pype-ERM',
          Subject: 'Payment Receipt'
        }
      });

      const buffers: Buffer[] = [];
      doc.on('data', (chunk: Buffer) => buffers.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(buffers)));
      doc.on('error', (err: any) => reject(err));

      const actualOrgName = data.organization?.name || 'TIMS EDUCATION';
      const cleanReceiptNo = (data.receiptNo || '').replace(/^RCP-/, '');
      
      const billDateRaw = data.latestTransactionDate || data.latestBillDate || data.billDate || data.date || new Date();
      const formattedBillDate = new Date(billDateRaw).toLocaleDateString('en-GB').replace(/\//g, '-');
      const studentDobFormatted = data.studentDob ? new Date(data.studentDob).toLocaleDateString('en-GB').replace(/\//g, '-') : 'N/A';

      const numTotal = typeof data.total === 'number' ? data.total : (parseFloat(String(data.amount || 0).replace(/[^0-9.]/g, '')) || 0);
      const totalPaid = (Array.isArray(data.payments) ? data.payments : []).reduce((sum: number, p: any) => sum + (Number(p.amount) || 0), 0);

      const totalFeeAmount = data.totalFee ?? (data.overallProgramFee || numTotal);
      const totalRemittedAmount = (Array.isArray(data.paymentHistory) && data.paymentHistory.length > 0)
        ? data.paymentHistory.reduce((sum: number, p: any) => sum + (Number(p.amount) || 0), 0)
        : (data.overallPaid ?? (totalPaid || numTotal));
      const balanceFeeAmount = data.feeStructureMissing ? 0 : Math.max(0, totalFeeAmount - totalRemittedAmount);

      const firstPayment = (Array.isArray(data.payments) && data.payments.length > 0) ? data.payments[0] : null;
      const paymentMethod = (data.paymentMethod || firstPayment?.method || data.paymentMode || 'ONLINE').toUpperCase();
      const payAt = (data.payAt || data.center || 'HEAD OFFICE').toUpperCase();

      const hasPartnerStudents = Array.isArray(data.items) && data.items.some((it: any) => it.studentName || it.studentId);
      const isPartnerInvoice = Boolean(
        data.centerDetails ||
        hasPartnerStudents ||
        (!data.studentId && (!data.studentName || data.studentName === 'N/A') && data.center && data.center !== 'Direct' && data.center !== 'HEAD OFFICE')
      );

      const leftX = 30;
      const rightX = 565;
      const fullWidth = rightX - leftX; // 535pt

      // ── 1. Header (Exact BillReceiptPanel Design) ─────────────
      let currentY = 30;

      // Organization Letter Badge (or Logo fallback)
      const badgeSize = 36;
      doc.roundedRect(leftX, currentY, badgeSize, badgeSize, 8)
        .fill('#1e40af');
      doc.fillColor('#ffffff')
        .font('Helvetica-Bold')
        .fontSize(18)
        .text(actualOrgName.charAt(0).toUpperCase(), leftX, currentY + 9, { width: badgeSize, align: 'center' });

      // Org Name and Subtitle
      const textLeft = leftX + badgeSize + 10;
      doc.fillColor('#0f172a')
        .font('Helvetica-Bold')
        .fontSize(16)
        .text(actualOrgName, textLeft, currentY + 2);

      doc.fillColor('#64748b')
        .font('Helvetica')
        .fontSize(9)
        .text(isPartnerInvoice ? 'Academic Partner Bill Receipt' : 'Cash Receipt', textLeft, currentY + 22);

      // Right: Address block
      const addressLines = data.organization?.address
        ? data.organization.address.split('\n')
        : [
            '2nd Floor Al Madeena Tower, Calicut',
            'Road Edappal, Malappuram',
            'Kerala - 679576',
            'Mob: 9526387777',
            'Email: info@timseducation.com'
          ];

      let addrY = currentY;
      doc.fillColor('#475569').font('Helvetica').fontSize(8);
      addressLines.forEach((line: string) => {
        doc.text(line.trim(), 290, addrY, { width: 275, align: 'right' });
        addrY += 11;
      });

      currentY = Math.max(currentY + badgeSize + 10, addrY + 6);

      // Divider line
      doc.moveTo(leftX, currentY).lineTo(rightX, currentY).lineWidth(1.5).strokeColor('#e2e8f0').stroke();
      currentY += 12;

      // ── 2. Centered Blue Title ─────────────────────────────────
      doc.fillColor('#2563eb')
        .font('Helvetica-Bold')
        .fontSize(13)
        .text(isPartnerInvoice ? 'ACADEMIC PARTNER BILL RECEIPT' : 'PAYMENT RECEIPT', leftX, currentY, { width: fullWidth, align: 'center', characterSpacing: 1.5 });

      currentY += 20;

      // ── 3. Detail Cards Section ────────────────────────────────
      if (isPartnerInvoice) {
        // Partner Info Cards (Side by side)
        const halfWidth = (fullWidth - 12) / 2;
        const pCardHeight = 68;

        // Card 1: Receipt / Bill Details
        doc.roundedRect(leftX, currentY, halfWidth, pCardHeight, 4).fillAndStroke('#ffffff', '#bfdbfe');
        doc.roundedRect(leftX, currentY, halfWidth, 16, 4).fillAndStroke('#eff6ff', '#bfdbfe');
        doc.rect(leftX, currentY + 11, halfWidth, 5).fill('#eff6ff');
        doc.fillColor('#1e40af').font('Helvetica-Bold').fontSize(7.5).text('RECEIPT / BILL DETAILS', leftX + 8, currentY + 4);

        let py = currentY + 20;
        doc.fillColor('#64748b').font('Helvetica').fontSize(8).text('Receipt No:', leftX + 8, py);
        doc.fillColor('#0f172a').font('Helvetica-Bold').text(cleanReceiptNo, leftX + 70, py);
        py += 11;
        doc.fillColor('#64748b').font('Helvetica').text('Bill Date:', leftX + 8, py);
        doc.fillColor('#0f172a').font('Helvetica-Bold').text(formattedBillDate, leftX + 70, py);
        py += 11;
        doc.fillColor('#64748b').font('Helvetica').text('Status:', leftX + 8, py);
        doc.fillColor(data.status === 'paid' ? '#16a34a' : '#2563eb').font('Helvetica-Bold').text((data.status || 'PAID').toUpperCase(), leftX + 70, py);

        // Card 2: Billed To: Academic Partner
        const p2X = leftX + halfWidth + 12;
        doc.roundedRect(p2X, currentY, halfWidth, pCardHeight, 4).fillAndStroke('#ffffff', '#fed7aa');
        doc.roundedRect(p2X, currentY, halfWidth, 16, 4).fillAndStroke('#fff7ed', '#fed7aa');
        doc.rect(p2X, currentY + 11, halfWidth, 5).fill('#fff7ed');
        doc.fillColor('#c2410c').font('Helvetica-Bold').fontSize(7.5).text('BILLED TO: ACADEMIC PARTNER', p2X + 8, currentY + 4);

        let p2y = currentY + 20;
        doc.fillColor('#64748b').font('Helvetica').fontSize(8).text('Partner:', p2X + 8, p2y);
        doc.fillColor('#0f172a').font('Helvetica-Bold').text(data.centerDetails?.name || data.center || 'Academic Partner', p2X + 65, p2y, { width: halfWidth - 75 });
        p2y += 11;
        doc.fillColor('#64748b').font('Helvetica').text('Center Code:', p2X + 8, p2y);
        doc.fillColor('#0f172a').font('Helvetica-Bold').text(data.centerDetails?.code || '—', p2X + 65, p2y);
        p2y += 11;
        doc.fillColor('#64748b').font('Helvetica').text('Contact:', p2X + 8, p2y);
        doc.fillColor('#334155').font('Helvetica').text([data.centerDetails?.contact, data.centerDetails?.email].filter(Boolean).join(' • ') || '—', p2X + 65, p2y, { width: halfWidth - 75 });

        currentY += pCardHeight + 10;
      } else {
        // Stacked 3 Colored Cards (Exact BillReceiptPanel Design)
        const boxHeight = 40;
        const headerBarHeight = 15;

        // ── Card 1: Receipt Details (Blue Theme) ──
        doc.roundedRect(leftX, currentY, fullWidth, boxHeight, 4).fillAndStroke('#ffffff', '#bfdbfe');
        doc.roundedRect(leftX, currentY, fullWidth, headerBarHeight, 4).fillAndStroke('#eff6ff', '#bfdbfe');
        doc.rect(leftX, currentY + 10, fullWidth, 5).fill('#eff6ff');

        doc.fillColor('#1e40af')
          .font('Helvetica-Bold')
          .fontSize(7.5)
          .text('RECEIPT DETAILS', leftX + 10, currentY + 4);

        const bodyY1 = currentY + headerBarHeight + 6;
        doc.fillColor('#64748b').font('Helvetica').fontSize(8.5).text('Receipt No:', leftX + 10, bodyY1);
        doc.fillColor('#0f172a').font('Helvetica-Bold').text(cleanReceiptNo || 'N/A', leftX + 68, bodyY1);

        doc.fillColor('#64748b').font('Helvetica').text('Bill Date:', leftX + 190, bodyY1);
        doc.fillColor('#0f172a').font('Helvetica-Bold').text(formattedBillDate, leftX + 238, bodyY1);

        doc.fillColor('#64748b').font('Helvetica').text('Admission No:', leftX + 360, bodyY1);
        doc.fillColor('#0f172a').font('Helvetica-Bold').text(data.admissionNo || data.enrollmentNo || 'N/A', leftX + 430, bodyY1);

        currentY += boxHeight + 8;

        // ── Card 2: Student Details (Purple Theme) ──
        doc.roundedRect(leftX, currentY, fullWidth, boxHeight, 4).fillAndStroke('#ffffff', '#e9d5ff');
        doc.roundedRect(leftX, currentY, fullWidth, headerBarHeight, 4).fillAndStroke('#faf5ff', '#e9d5ff');
        doc.rect(leftX, currentY + 10, fullWidth, 5).fill('#faf5ff');

        doc.fillColor('#6b21a8')
          .font('Helvetica-Bold')
          .fontSize(7.5)
          .text('STUDENT DETAILS', leftX + 10, currentY + 4);

        const bodyY2 = currentY + headerBarHeight + 6;
        doc.fillColor('#64748b').font('Helvetica').fontSize(8.5).text('Name:', leftX + 10, bodyY2);
        doc.fillColor('#0f172a').font('Helvetica-Bold').text(data.studentName || 'N/A', leftX + 48, bodyY2, { width: 290 });

        doc.fillColor('#64748b').font('Helvetica').fontSize(8.5).text('Date of Birth:', leftX + 360, bodyY2);
        doc.fillColor('#0f172a').font('Helvetica-Bold').text(studentDobFormatted, leftX + 425, bodyY2);

        currentY += boxHeight + 8;

        // ── Card 3: Academic Details (Green Theme) ──
        doc.roundedRect(leftX, currentY, fullWidth, boxHeight, 4).fillAndStroke('#ffffff', '#bbf7d0');
        doc.roundedRect(leftX, currentY, fullWidth, headerBarHeight, 4).fillAndStroke('#f0fdf4', '#bbf7d0');
        doc.rect(leftX, currentY + 10, fullWidth, 5).fill('#f0fdf4');

        doc.fillColor('#166534')
          .font('Helvetica-Bold')
          .fontSize(7.5)
          .text('ACADEMIC DETAILS', leftX + 10, currentY + 4);

        const bodyY3 = currentY + headerBarHeight + 6;
        doc.fillColor('#64748b').font('Helvetica').fontSize(8.5).text('University:', leftX + 10, bodyY3);
        doc.fillColor('#0f172a').font('Helvetica-Bold').text((data.university || 'N/A').toUpperCase(), leftX + 65, bodyY3, { width: 190 });

        doc.fillColor('#64748b').font('Helvetica').text('Course:', leftX + 265, bodyY3);
        doc.fillColor('#0f172a').font('Helvetica-Bold').text((data.program || 'N/A').toUpperCase(), leftX + 310, bodyY3, { width: 250 });

        currentY += boxHeight + 12;
      }

      // ── 4. Table of Particulars (Solid Blue Header) ───────────
      const tableHeaderHeight = 22;
      doc.roundedRect(leftX, currentY, fullWidth, tableHeaderHeight, 4).fillAndStroke('#2563eb', '#2563eb');

      doc.fillColor('#ffffff').font('Helvetica-Bold').fontSize(8);
      doc.text('#', leftX + 12, currentY + 7, { width: 25 });
      doc.text(hasPartnerStudents ? 'ENROLLED STUDENT PARTICULARS' : 'PARTICULARS', leftX + 45, currentY + 7, { width: 340 });
      doc.text('AMOUNT (₹)', rightX - 120, currentY + 7, { width: 110, align: 'right' });

      currentY += tableHeaderHeight;

      // Rows
      const rawItems = Array.isArray(data.items) && data.items.length > 0
        ? data.items
        : [{ description: `Fee Payment against ${data.program || 'Course'} (${cleanReceiptNo})`, amount: numTotal }];

      rawItems.forEach((item: any, i: number) => {
        const rowBg = i % 2 === 0 ? '#ffffff' : '#f8fafc';
        const itemDesc = item.description || item.studentName || item.name || 'Program Fee';
        const itemAmt = Number(item.amount || 0);

        doc.rect(leftX, currentY, fullWidth, 24).fillAndStroke(rowBg, '#f1f5f9');
        doc.fillColor('#64748b').font('Helvetica').fontSize(8.5).text(String(i + 1), leftX + 12, currentY + 7);
        doc.fillColor('#0f172a').font('Helvetica-Bold').text(itemDesc, leftX + 45, currentY + 7, { width: 350 });
        doc.fillColor('#0f172a').font('Helvetica-Bold').text(itemAmt.toLocaleString('en-IN', { minimumFractionDigits: 2 }), rightX - 120, currentY + 7, { width: 110, align: 'right' });

        currentY += 24;
      });

      // Total Row
      doc.rect(leftX, currentY, fullWidth, 26).fillAndStroke('#eff6ff', '#2563eb');
      doc.fillColor('#1e40af').font('Helvetica-Bold').fontSize(9);
      doc.text(hasPartnerStudents ? `TOTAL AMOUNT (${data.items?.length || 0} STUDENTS)` : 'TOTAL AMOUNT', leftX + 45, currentY + 8);
      doc.fontSize(10.5).text(`₹${numTotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`, rightX - 130, currentY + 7, { width: 120, align: 'right' });

      currentY += 34;

      // ── 5. Payment History / Transactions Table ───────────────
      const paymentHistoryList = (Array.isArray(data.paymentHistory) && data.paymentHistory.length > 0)
        ? data.paymentHistory
        : (Array.isArray(data.payments) && data.payments.length > 0)
          ? data.payments.map((p: any) => ({
              id: p.id,
              date: p.receivedAt || p.createdAt || data.date,
              amount: p.amount,
              method: p.method || paymentMethod,
              referenceNo: p.referenceNo || cleanReceiptNo,
              invoiceNo: cleanReceiptNo
            }))
          : [];

      if (paymentHistoryList.length > 0) {
        doc.roundedRect(leftX, currentY, fullWidth, 18, 3).fillAndStroke('#f8fafc', '#cbd5e1');
        doc.fillColor('#334155').font('Helvetica-Bold').fontSize(7.5).text('PAYMENT HISTORY / TRANSACTIONS', leftX + 10, currentY + 5);
        doc.fillColor('#64748b').font('Helvetica').fontSize(7.5).text(`${paymentHistoryList.length} ${paymentHistoryList.length === 1 ? 'Record' : 'Records'}`, rightX - 80, currentY + 5, { width: 70, align: 'right' });

        currentY += 18;

        // Subheader
        doc.rect(leftX, currentY, fullWidth, 16).fillAndStroke('#f1f5f9', '#e2e8f0');
        doc.fillColor('#475569').font('Helvetica-Bold').fontSize(7);
        doc.text('#', leftX + 8, currentY + 4, { width: 20 });
        doc.text('DATE', leftX + 35, currentY + 4, { width: 75 });
        doc.text('RECEIPT / REF NO', leftX + 120, currentY + 4, { width: 160 });
        doc.text('MODE', leftX + 300, currentY + 4, { width: 80 });
        doc.text('AMOUNT (₹)', rightX - 110, currentY + 4, { width: 100, align: 'right' });

        currentY += 16;

        paymentHistoryList.forEach((p: any, idx: number) => {
          const pDate = p.date ? new Date(p.date).toLocaleDateString('en-GB').replace(/\//g, '-') : 'N/A';
          const pRef = p.referenceNo || p.invoiceNo || 'N/A';
          const pMethod = (p.method || paymentMethod || 'CASH').toUpperCase();
          const pAmt = Number(p.amount || 0);

          doc.rect(leftX, currentY, fullWidth, 18).fillAndStroke('#ffffff', '#f1f5f9');
          doc.fillColor('#64748b').font('Helvetica').fontSize(8).text(String(idx + 1), leftX + 8, currentY + 5);
          doc.fillColor('#0f172a').font('Helvetica').text(pDate, leftX + 35, currentY + 5);
          doc.fillColor('#334155').text(pRef, leftX + 120, currentY + 5);
          doc.fillColor('#0f172a').text(pMethod, leftX + 300, currentY + 5);
          doc.fillColor('#16a34a').font('Helvetica-Bold').text(`₹${pAmt.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`, rightX - 110, currentY + 5, { width: 100, align: 'right' });

          currentY += 18;
        });

        currentY += 14;
      }

      // ── 6. Payment & Summary Section ──────────────────────────
      const summaryBoxWidth = 240;
      const summaryBoxX = rightX - summaryBoxWidth;
      const leftSummaryWidth = summaryBoxX - leftX - 15;

      const summaryStartY = currentY;

      // Left: Amount in Words, Payment Mode, Paid At
      doc.fillColor('#0f172a').font('Helvetica-Bold').fontSize(8.5).text('Amount in Words:', leftX, summaryStartY);
      doc.fillColor('#475569').font('Helvetica').text(numberToWords(numTotal), leftX + 85, summaryStartY, { width: leftSummaryWidth - 85 });

      if (isPartnerInvoice) {
        doc.fillColor('#0f172a').font('Helvetica-Bold').text('Academic Partner:', leftX, summaryStartY + 26);
        doc.fillColor('#475569').font('Helvetica').text(data.centerDetails?.name || data.center || 'Academic Partner', leftX + 85, summaryStartY + 26);

        doc.fillColor('#0f172a').font('Helvetica-Bold').text('Payment Mode:', leftX, summaryStartY + 42);
        doc.fillColor('#475569').font('Helvetica').text(paymentMethod, leftX + 85, summaryStartY + 42);

        doc.fillColor('#0f172a').font('Helvetica-Bold').text('Paid At:', leftX, summaryStartY + 58);
        doc.fillColor('#475569').font('Helvetica').text(payAt, leftX + 85, summaryStartY + 58);

        // Right: Subtotal / Tax / Remitted / Balance Due Box
        const orangeBoxHeight = 84;
        doc.roundedRect(summaryBoxX, summaryStartY, summaryBoxWidth, orangeBoxHeight, 6).fillAndStroke('#f8fafc', '#cbd5e1');

        let by = summaryStartY + 8;
        doc.fillColor('#475569').font('Helvetica-Bold').fontSize(8).text('Subtotal', summaryBoxX + 12, by);
        doc.fillColor('#0f172a').text(`₹${numTotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`, summaryBoxX + 110, by, { width: 118, align: 'right' });
        by += 18;

        doc.fillColor('#16a34a').font('Helvetica-Bold').fontSize(8).text('Total Remitted / Paid', summaryBoxX + 12, by);
        doc.text(`₹${totalRemittedAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`, summaryBoxX + 110, by, { width: 118, align: 'right' });
        by += 18;

        doc.moveTo(summaryBoxX + 12, by).lineTo(summaryBoxX + summaryBoxWidth - 12, by).lineWidth(0.8).dash(3, { space: 2 }).strokeColor('#cbd5e1').stroke();
        doc.undash();
        by += 8;

        doc.fillColor('#0f172a').font('Helvetica-Bold').fontSize(9).text('BALANCE DUE', summaryBoxX + 12, by);
        const pBal = Math.max(0, numTotal - totalRemittedAmount);
        doc.fillColor(pBal <= 0 ? '#16a34a' : '#ef4444').font('Helvetica-Bold').fontSize(11).text(`₹${pBal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`, summaryBoxX + 110, by, { width: 118, align: 'right' });

        currentY = Math.max(summaryStartY + orangeBoxHeight + 20, 720);
      } else {
        doc.fillColor('#0f172a').font('Helvetica-Bold').text('Payment Mode:', leftX, summaryStartY + 26);
        doc.fillColor('#475569').font('Helvetica').text(paymentMethod, leftX + 85, summaryStartY + 26);

        doc.fillColor('#0f172a').font('Helvetica-Bold').text('Paid At:', leftX, summaryStartY + 42);
        doc.fillColor('#475569').font('Helvetica').text(payAt, leftX + 85, summaryStartY + 42);

        // Right: Orange Summary Box (#fdf8f6 with #fed7aa border)
        const orangeBoxHeight = 72;
        doc.roundedRect(summaryBoxX, summaryStartY, summaryBoxWidth, orangeBoxHeight, 6).fillAndStroke('#fdf8f6', '#fed7aa');

        // Row 1: Total Fee
        doc.fillColor('#c2410c').font('Helvetica-Bold').fontSize(8.5).text('Total Fee', summaryBoxX + 12, summaryStartY + 10);
        const totalFeeDisplay = data.feeStructureMissing ? 'Fee not set up' : `₹${totalFeeAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`;
        doc.fillColor('#9a3412').font('Helvetica-Bold').fontSize(9).text(totalFeeDisplay, summaryBoxX + 100, summaryStartY + 10, { width: 128, align: 'right' });

        // Dashed divider 1
        doc.moveTo(summaryBoxX + 12, summaryStartY + 25).lineTo(summaryBoxX + summaryBoxWidth - 12, summaryStartY + 25).lineWidth(0.8).dash(3, { space: 2 }).strokeColor('#fdba74').stroke();
        doc.undash();

        // Row 2: Total Remitted Fee
        doc.fillColor('#16a34a').font('Helvetica-Bold').fontSize(8.5).text('Total Remitted Fee', summaryBoxX + 12, summaryStartY + 31);
        doc.text(`₹${totalRemittedAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`, summaryBoxX + 100, summaryStartY + 31, { width: 128, align: 'right' });

        // Dashed divider 2
        doc.moveTo(summaryBoxX + 12, summaryStartY + 46).lineTo(summaryBoxX + summaryBoxWidth - 12, summaryStartY + 46).lineWidth(0.8).dash(3, { space: 2 }).strokeColor('#fdba74').stroke();
        doc.undash();

        // Row 3: Balance Fee
        doc.fillColor('#0f172a').font('Helvetica-Bold').fontSize(8.5).text('BALANCE FEE', summaryBoxX + 12, summaryStartY + 53);
        const balanceColor = balanceFeeAmount <= 0 ? '#16a34a' : '#ef4444';
        const balanceDisplay = data.feeStructureMissing ? '—' : `₹${balanceFeeAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`;
        doc.fillColor(balanceColor).font('Helvetica-Bold').fontSize(11).text(balanceDisplay, summaryBoxX + 100, summaryStartY + 51, { width: 128, align: 'right' });

        currentY = Math.max(summaryStartY + orangeBoxHeight + 20, 720);
      }

      // ── 7. Footer (Exact BillReceiptPanel Notice & Signature) ─
      doc.moveTo(leftX, currentY).lineTo(rightX, currentY).lineWidth(1).dash(3, { space: 2 }).strokeColor('#cbd5e1').stroke();
      doc.undash();

      currentY += 10;

      // Left: Disclaimer
      doc.fillColor('#0f172a').font('Helvetica-Bold').fontSize(8.5).text('NB: Fee is not refundable.', leftX, currentY);
      doc.fillColor('#64748b').font('Helvetica').fontSize(7.5).text('This is a computer-generated receipt and does not require a physical signature.', leftX, currentY + 12);

      // Right: Signature Title
      doc.fillColor('#0f172a').font('Helvetica-Bold').fontSize(8.5).text('Received / Authorized by:', 360, currentY, { width: 205, align: 'right' });
      doc.fillColor('#475569').font('Helvetica-Oblique').fontSize(8).text('Finance Officer / Accountant', 360, currentY + 12, { width: 205, align: 'right' });

      doc.end();
    } catch (err) {
      reject(err);
    }
  });
}

/**
 * Builds the complete BillReceiptData object matching financeExtController.generateReceipt
 */
export async function getReceiptData(id: string): Promise<BillReceiptData | null> {
  // 1. Try finding by Invoice ID or InvoiceNo
  let invoice = await prisma.invoice.findFirst({
    where: { OR: [{ id }, { invoiceNo: id }] },
    include: {
      student: { include: { program: { include: { university: true } }, center: true } },
      center: true,
      payments: true,
      organization: true
    }
  });

  // 2. If not found, try finding by PaymentEntry ID
  if (!invoice) {
    const payment = await prisma.paymentEntry.findUnique({
      where: { id },
      include: {
        invoice: {
          include: {
            student: { include: { program: { include: { university: true } }, center: true } },
            center: true,
            payments: true,
            organization: true
          }
        }
      }
    });
    if (payment?.invoice) {
      invoice = payment.invoice;
    }
  }

  // 3. If not found, try finding by Enrollment ID
  if (!invoice) {
    const enrollment = await prisma.enrollment.findUnique({
      where: { id },
      include: {
        student: { include: { program: { include: { university: true } }, center: true } },
        organization: true
      }
    });
    if (enrollment?.studentId) {
      invoice = await prisma.invoice.findFirst({
        where: { studentId: enrollment.studentId },
        orderBy: { createdAt: 'desc' },
        include: {
          student: { include: { program: { include: { university: true } }, center: true } },
          center: true,
          payments: true,
          organization: true
        }
      });
    }
  }

  if (!invoice) return null;

  let overallProgramFee = invoice.total;
  let overallPaid = invoice.payments.reduce((sum, p) => sum + p.amount, 0);

  let actualStudentId = invoice.studentId;
  let fallbackEnrollment: any = null;
  let matchedEnrollment: any = null;

  // Check enrollmentPayment to find exact enrollment linked to payment
  if (invoice.payments.length > 0) {
    const payment = invoice.payments[0];
    const envPayment = await prisma.enrollmentPayment.findFirst({
      where: {
        amount: payment.amount,
        ...(actualStudentId ? { enrollment: { studentId: actualStudentId } } : {})
      },
      include: { enrollment: { include: { program: { include: { university: true } } } } },
      orderBy: { createdAt: 'desc' }
    });
    if (envPayment && envPayment.enrollment) {
      matchedEnrollment = envPayment.enrollment;
      if (!actualStudentId && matchedEnrollment.studentId) {
        actualStudentId = matchedEnrollment.studentId;
      }
    }
  }

  const isProvisionalOrAdmission = invoice.invoiceNo?.startsWith('INV-PROV-') || 
                                   invoice.invoiceNo?.startsWith('INV-AUTO-') ||
                                   invoice.notes?.includes('Provisional') ||
                                   invoice.notes?.includes('Admission');

  if (!matchedEnrollment && isProvisionalOrAdmission && actualStudentId) {
    matchedEnrollment = await prisma.enrollment.findFirst({
      where: {
        studentId: actualStudentId,
        ...(invoice.invoiceNo?.startsWith('INV-PROV-') || invoice.notes?.includes('Provisional') ? { isProvisional: true } : {})
      },
      include: { program: { include: { university: true } } },
      orderBy: { createdAt: 'desc' }
    });
  }

  if (!actualStudentId && invoice.payments.length > 0) {
    const payment = invoice.payments[0];
    const envPayment = await prisma.enrollmentPayment.findFirst({
      where: { amount: payment.amount },
      include: { enrollment: { include: { program: { include: { university: true } } } } }
    });
    if (envPayment && envPayment.enrollment) {
      fallbackEnrollment = envPayment.enrollment;
      if (fallbackEnrollment.studentId) {
        actualStudentId = fallbackEnrollment.studentId;
      }
    }
  }

  let actualStudent: any = invoice.student;
  if (actualStudentId && !actualStudent) {
    actualStudent = await prisma.student.findUnique({
      where: { id: actualStudentId },
      include: { program: { include: { university: true } } }
    });
  }

  // Student Payment History across invoices
  const studentPaymentHistory: any[] = [];
  if (actualStudentId) {
    const schedules = await prisma.paymentSchedule.findMany({ where: { studentId: actualStudentId } });
    if (schedules.length > 0) {
      overallProgramFee = schedules.reduce((acc, curr) => acc + curr.amount, 0);
    }

    const studentInvoices = await prisma.invoice.findMany({
      where: { studentId: actualStudentId },
      include: { payments: true },
      orderBy: { createdAt: 'asc' }
    });
    overallPaid = studentInvoices.reduce((acc: number, inv: any) => acc + (inv.payments || []).reduce((s: number, p: any) => s + p.amount, 0), 0);

    if (!invoice.studentId) {
      overallPaid += invoice.payments.reduce((sum: number, p: any) => sum + p.amount, 0);
    }

    studentInvoices.forEach((inv: any) => {
      (inv.payments || []).forEach((p: any) => {
        studentPaymentHistory.push({
          id: p.id,
          date: p.receivedAt || p.createdAt,
          amount: p.amount,
          method: p.method || 'CASH',
          referenceNo: p.referenceNo || `RCP-${inv.invoiceNo}`,
          invoiceNo: inv.invoiceNo,
          notes: p.notes || ''
        });
      });
    });

    // Check enrollment initial payments
    const studentEnrollments = await prisma.enrollment.findMany({ where: { studentId: actualStudentId } });
    for (const enr of studentEnrollments) {
      if (enr.initialPaymentAmount && enr.initialPaymentAmount > 0) {
        const alreadyExists = studentPaymentHistory.some(p => Math.abs(p.amount - (enr.initialPaymentAmount || 0)) < 0.01);
        if (!alreadyExists) {
          studentPaymentHistory.unshift({
            id: `enr-${enr.id}`,
            date: enr.initialPaymentDate || enr.createdAt,
            amount: enr.initialPaymentAmount,
            method: 'ONLINE / DIRECT',
            referenceNo: 'PROVISIONAL / ADMISSION',
            invoiceNo: 'INIT-FEE',
            notes: 'Initial Admission Payment'
          });
        }
      }
    }
  }

  if (studentPaymentHistory.length === 0 && invoice.payments.length > 0) {
    invoice.payments.forEach(p => {
      studentPaymentHistory.push({
        id: p.id,
        date: p.receivedAt || p.createdAt,
        amount: p.amount,
        method: p.method || 'CASH',
        referenceNo: p.referenceNo || `RCP-${invoice.invoiceNo}`,
        invoiceNo: invoice.invoiceNo,
        notes: p.notes || ''
      });
    });
  }

  studentPaymentHistory.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  if (studentPaymentHistory.length > 0) {
    overallPaid = studentPaymentHistory.reduce((sum, p) => sum + (Number(p.amount) || 0), 0);
  }

  const activeProgram = matchedEnrollment?.program || actualStudent?.program || fallbackEnrollment?.program;
  const activeSpecialisation = matchedEnrollment?.specialisation || actualStudent?.specialisation || fallbackEnrollment?.specialisation;
  const activeSessionId = matchedEnrollment?.sessionId || actualStudent?.sessionId || fallbackEnrollment?.sessionId || null;

  const targetProgramId = activeProgram?.id || invoice.student?.programId || fallbackEnrollment?.programId;
  let totalFee = 0;
  let feeStructureMissing = false;

  if (targetProgramId) {
    let feeStruct = null;
    if (activeSessionId) {
      if (activeSpecialisation) {
        feeStruct = await prisma.feeStructure.findFirst({
          where: { programId: targetProgramId, sessionId: activeSessionId, specialisation: activeSpecialisation, organizationId: invoice.organizationId }
        });
      }
      if (!feeStruct) {
        feeStruct = await prisma.feeStructure.findFirst({
          where: { programId: targetProgramId, sessionId: activeSessionId, organizationId: invoice.organizationId }
        });
      }
    }

    if (!feeStruct && activeSpecialisation) {
      feeStruct = await prisma.feeStructure.findFirst({
        where: { programId: targetProgramId, sessionId: null, specialisation: activeSpecialisation, organizationId: invoice.organizationId }
      });
    }
    if (!feeStruct) {
      feeStruct = await prisma.feeStructure.findFirst({
        where: { programId: targetProgramId, sessionId: null, organizationId: invoice.organizationId }
      });
    }

    if (feeStruct) {
      let additionalTotal = 0;
      let additionalFeesList: any[] = [];
      if (Array.isArray(feeStruct.additionalFees)) {
        additionalFeesList = feeStruct.additionalFees as any[];
      } else if (typeof feeStruct.additionalFees === 'string') {
        try {
          const parsed = JSON.parse(feeStruct.additionalFees);
          if (Array.isArray(parsed)) additionalFeesList = parsed;
        } catch {}
      }
      additionalTotal = additionalFeesList.reduce((sum, f) => sum + (Number(f?.amount) || 0), 0);

      const regFee = Number(feeStruct.registrationFee) || 0;
      const tuitFee = Number(feeStruct.tuitionFee) || 0;
      const exFee = Number(feeStruct.examFee) || 0;

      let baseTotal = 0;
      if (Array.isArray(feeStruct.yearlyFees) && (feeStruct.yearlyFees as any[]).length > 0) {
        baseTotal = (feeStruct.yearlyFees as any[]).reduce((sum, yf) => {
          return sum + (Number(yf.registrationFee) || 0) + (Number(yf.tuitionFee) || 0) + (Number(yf.examFee) || 0);
        }, 0);
      }
      if (!baseTotal) {
        baseTotal = regFee + tuitFee + exFee;
      }

      totalFee = baseTotal + additionalTotal;
    }
  }

  feeStructureMissing = !totalFee && !(overallProgramFee && overallProgramFee !== invoice.total);
  if (!totalFee && overallProgramFee) {
    totalFee = overallProgramFee;
  } else if (totalFee) {
    overallProgramFee = totalFee;
  }

  const studentName = actualStudent?.name || matchedEnrollment?.studentName || fallbackEnrollment?.studentName || 'N/A';
  const studentDob = actualStudent?.dob || matchedEnrollment?.dob || null;
  const studentEmail = actualStudent?.email || matchedEnrollment?.studentEmail || fallbackEnrollment?.studentEmail || '';
  const enrollmentNo = actualStudent?.enrollmentNo || matchedEnrollment?.enrollmentNumber || fallbackEnrollment?.enrollmentNumber || '';
  const admissionNo = actualStudent?.admissionNo || matchedEnrollment?.enrollmentNumber || 'N/A';
  
  const programName = activeProgram?.name ? `${activeProgram.name}${activeSpecialisation ? ` - ${activeSpecialisation}` : ''}` : '';
  const universityName = activeProgram?.university?.name || '';

  // Determine latest transaction date
  let billTransactionDate: Date | null = null;
  if (invoice.payments && invoice.payments.length > 0) {
    const sorted = [...invoice.payments].sort((a, b) => new Date(b.receivedAt || b.createdAt).getTime() - new Date(a.receivedAt || a.createdAt).getTime());
    const pDate = sorted[0]?.receivedAt || sorted[0]?.createdAt;
    if (pDate) billTransactionDate = new Date(pDate);
  }
  if (!billTransactionDate && isProvisionalOrAdmission) {
    const enrDate = matchedEnrollment?.initialPaymentDate || fallbackEnrollment?.initialPaymentDate;
    if (enrDate) billTransactionDate = new Date(enrDate);
  }
  const latestTransactionDate = billTransactionDate || invoice.paidAt || invoice.createdAt || invoice.updatedAt;

  return {
    receiptNo: invoice.invoiceNo ? `RCP-${invoice.invoiceNo}` : `REC-${invoice.id.slice(-6).toUpperCase()}`,
    date: latestTransactionDate,
    billDate: latestTransactionDate,
    latestBillDate: latestTransactionDate,
    latestTransactionDate,
    admissionNo,
    enrollmentNo,
    studentName,
    studentDob,
    studentEmail,
    studentPhone: actualStudent?.phone || matchedEnrollment?.studentPhone || undefined,
    program: programName,
    university: universityName,
    center: invoice.center?.name || 'HEAD OFFICE',
    centerDetails: invoice.center ? {
      id: invoice.center.id,
      name: invoice.center.name,
      code: invoice.center.code,
      address: invoice.center.address,
      contact: invoice.center.contact,
      email: invoice.center.email,
      city: invoice.center.city,
      state: invoice.center.state
    } : null,
    amount: invoice.amount,
    tax: invoice.tax,
    total: invoice.total,
    paymentMethod: invoice.payments?.[0]?.method || 'ONLINE',
    payAt: invoice.center?.name || 'HEAD OFFICE',
    referenceNo: invoice.payments?.[0]?.referenceNo || undefined,
    totalFee,
    overallProgramFee,
    overallPaid,
    totalRemitted: overallPaid,
    balanceFee: Math.max(0, overallProgramFee - overallPaid),
    balanceDue: Math.max(0, invoice.total - invoice.payments.reduce((s, p) => s + p.amount, 0)),
    feeStructureMissing,
    status: invoice.status,
    items: invoice.items as any,
    payments: invoice.payments,
    paymentHistory: studentPaymentHistory,
    organization: {
      name: invoice.organization?.name || 'Educational Institution',
      logo: invoice.organization?.logo || null,
      address: invoice.organization?.address || null,
      phone: invoice.organization?.phone || null,
      email: invoice.organization?.email || null
    }
  };
}

export const getReceiptDataForPayment = getReceiptData;
