import { useState, useEffect } from 'react';
import { FileText, Search, Printer, Building2, User, Receipt, CheckCircle, AlertTriangle, TrendingUp, Download } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import api from '@/lib/api';
import { canDo } from '@/lib/access';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import html2pdf from 'html2pdf.js';

import { CS, numLocale } from '@/lib/currency';
import { ListPagination } from '@/components/ui/list-pagination';
function numberToWords(amount: number): string {
  if (amount === 0) return 'Zero Rs. Only';
  
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

function ReceiptDocument({ receipt, orgName }: { receipt: any; orgName: string }) {
  const actualOrgName = receipt.organization?.name || orgName;
  const logoUrl = api.getFileUrl(receipt.organization?.logo);
  const totalPaid = (receipt.payments || []).reduce((sum: number, p: any) => sum + p.amount, 0);
  
  const paymentMethod = receipt.payments?.[0]?.method || 'CASH';
  const payAt = receipt.center || 'HEAD OFFICE';

  const totalFeeAmount = receipt.totalFee ?? (receipt.overallProgramFee || receipt.universityFee || 0);
  const totalRemittedAmount = (Array.isArray(receipt.paymentHistory) && receipt.paymentHistory.length > 0)
    ? receipt.paymentHistory.reduce((sum: number, p: any) => sum + (Number(p.amount) || 0), 0)
    : (receipt.overallPaid ?? totalPaid);
  const balanceFeeAmount = Math.max(0, totalFeeAmount - totalRemittedAmount);

  const hasPartnerStudents = Array.isArray(receipt.items) && receipt.items.some((it: any) => it.studentName || it.studentId);
  const isPartnerInvoice = Boolean(
    receipt.centerDetails ||
    hasPartnerStudents ||
    (!receipt.studentId && (!receipt.studentName || receipt.studentName === 'N/A') && receipt.center && receipt.center !== 'Direct' && receipt.center !== 'HEAD OFFICE')
  );

  const paymentHistoryList = (Array.isArray(receipt.paymentHistory) && receipt.paymentHistory.length > 0)
    ? receipt.paymentHistory
    : (Array.isArray(receipt.payments) && receipt.payments.length > 0)
      ? receipt.payments.map((p: any) => ({
          id: p.id,
          date: p.receivedAt || p.createdAt || receipt.date,
          amount: p.amount,
          method: p.method || paymentMethod,
          referenceNo: p.referenceNo || receipt.receiptNo,
          invoiceNo: receipt.receiptNo?.replace('RCP-', '')
        }))
      : [];

  // Find the transaction date for THIS bill
  const currentInvoiceNo = (receipt.receiptNo || '').replace('RCP-', '').trim();
  const matchingPayments = (receipt.payments && receipt.payments.length > 0)
    ? [...receipt.payments].sort((a: any, b: any) => new Date(b.receivedAt || b.createdAt).getTime() - new Date(a.receivedAt || a.createdAt).getTime())
    : [];

  const matchingHistory = paymentHistoryList.filter((p: any) => {
    if (!currentInvoiceNo) return false;
    const pInv = (p.invoiceNo || '').replace('RCP-', '').trim();
    const pRef = (p.referenceNo || '').replace('RCP-', '').trim();
    return pInv === currentInvoiceNo || pRef === currentInvoiceNo;
  });

  const thisBillTransactionDate = matchingPayments[0]?.receivedAt 
    || matchingPayments[0]?.createdAt 
    || matchingHistory[matchingHistory.length - 1]?.date 
    || receipt.latestTransactionDate 
    || receipt.billDate 
    || receipt.date;

  const formattedBillDate = thisBillTransactionDate 
    ? new Date(thisBillTransactionDate).toLocaleDateString('en-GB').replace(/\//g, '-') 
    : 'N/A';

  const receiptContent = (
    <div style={{ fontFamily: '"Inter", "Helvetica Neue", sans-serif', width: '100%', margin: '0 auto', background: '#fff', color: '#1e293b', padding: '24px' }}>
      
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', borderBottom: '2px solid #e2e8f0', paddingBottom: '16px', marginBottom: '20px' }}>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: '10px' }}>
          {logoUrl ? (
            <img src={logoUrl} alt="Logo" style={{ height: '64px', maxWidth: '200px', objectFit: 'contain' }} />
          ) : (
            <div style={{ width: 64, height: 64, background: 'linear-gradient(135deg, #1e40af 0%, #3b82f6 100%)', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: 26, fontWeight: 'bold' }}>
              {actualOrgName.charAt(0).toUpperCase()}
            </div>
          )}
          <div>
            <div style={{ fontSize: '22px', fontWeight: 800, color: '#0f172a', letterSpacing: '-0.5px' }}>{actualOrgName}</div>
            <div style={{ fontSize: '13px', color: '#64748b', fontWeight: 500, marginTop: '2px' }}>
              {isPartnerInvoice ? 'Academic Partner Bill Receipt' : 'Cash Receipt'}
            </div>
          </div>
        </div>
        <div style={{ textAlign: 'left', fontSize: '13px', color: '#475569', lineHeight: '1.6', maxWidth: '340px' }}>
          {receipt.organization?.address ? (
            <div style={{ whiteSpace: 'pre-wrap', textAlign: 'left' }}>{receipt.organization.address}</div>
          ) : (
            <>
              <div style={{ fontWeight: 600, color: '#0f172a' }}>2nd Floor Al Madeena Tower, Calicut</div>
              <div>Road Edappal, Malappuram</div>
              <div>Kerala - 679576</div>
              <div>Mob: 9526387777</div>
              <div>Email: info@timseducation.com</div>
            </>
          )}
        </div>
      </div>

      <div style={{ textAlign: 'center', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '2px', fontSize: '18px', color: '#2563eb', marginBottom: '18px', textShadow: '0 1px 2px rgba(37,99,235,0.1)' }}>
        {isPartnerInvoice ? 'Academic Partner Bill Receipt' : 'Payment Receipt'}
      </div>

      {/* Details section */}
      {isPartnerInvoice ? (
        /* Academic Partner Info Cards */
        <div style={{ display: 'flex', gap: '16px', marginBottom: '18px' }}>
          {/* Invoice Details */}
          <div style={{ flex: 1, border: '1px solid #bfdbfe', borderRadius: '8px', overflow: 'hidden' }}>
            <div style={{ background: '#eff6ff', padding: '6px 12px', fontSize: '11px', fontWeight: 700, color: '#1e40af', textTransform: 'uppercase', borderBottom: '1px solid #bfdbfe', letterSpacing: '0.5px' }}>Receipt / Bill Details</div>
            <div style={{ display: 'flex', flexDirection: 'column', padding: '10px 12px', fontSize: '13px', gap: '8px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ color: '#64748b', width: '90px' }}>Receipt No:</span>
                <span style={{ fontWeight: 700, color: '#0f172a' }}>{receipt.receiptNo?.replace('RCP-', '')}</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ color: '#64748b', width: '90px' }}>Bill Date:</span>
                <span style={{ fontWeight: 700, color: '#0f172a' }}>{formattedBillDate}</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ color: '#64748b', width: '90px' }}>Due Date:</span>
                <span style={{ fontWeight: 700, color: '#0f172a' }}>{receipt.dueDate ? new Date(receipt.dueDate).toLocaleDateString('en-GB').replace(/\//g, '-') : 'On Receipt'}</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ color: '#64748b', width: '90px' }}>Status:</span>
                <span style={{ fontWeight: 700, color: receipt.status === 'paid' ? '#16a34a' : '#2563eb', textTransform: 'uppercase' }}>{receipt.status || 'DRAFT'}</span>
              </div>
            </div>
          </div>

          {/* Academic Partner Details */}
          <div style={{ flex: 1.4, border: '1px solid #fed7aa', borderRadius: '8px', overflow: 'hidden' }}>
            <div style={{ background: '#fff7ed', padding: '6px 12px', fontSize: '11px', fontWeight: 700, color: '#c2410c', textTransform: 'uppercase', borderBottom: '1px solid #fed7aa', letterSpacing: '0.5px' }}>Billed To: Academic Partner</div>
            <div style={{ display: 'flex', flexDirection: 'column', padding: '10px 12px', fontSize: '13px', gap: '8px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ color: '#64748b', width: '90px' }}>Partner:</span>
                <span style={{ fontWeight: 700, color: '#0f172a' }}>{receipt.centerDetails?.name || receipt.center || 'Academic Partner'}</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ color: '#64748b', width: '90px' }}>Center Code:</span>
                <span style={{ fontWeight: 700, color: '#0f172a' }}>{receipt.centerDetails?.code || '—'}</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ color: '#64748b', width: '90px' }}>Contact:</span>
                <span style={{ fontWeight: 600, color: '#334155' }}>
                  {[receipt.centerDetails?.contact, receipt.centerDetails?.email].filter(Boolean).join(' • ') || '—'}
                </span>
              </div>
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: '8px' }}>
                <span style={{ color: '#64748b', width: '90px' }}>Address:</span>
                <span style={{ fontWeight: 500, color: '#334155', flex: 1 }}>
                  {[receipt.centerDetails?.address, receipt.centerDetails?.city, receipt.centerDetails?.state].filter(Boolean).join(', ') || '—'}
                </span>
              </div>
            </div>
          </div>
        </div>
      ) : (
        /* Student Details section grouped for readability (Column-wise stacked) */
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '18px' }}>
          {/* Receipt Details */}
          <div style={{ border: '1px solid #bfdbfe', borderRadius: '8px', overflow: 'hidden' }}>
            <div style={{ background: '#eff6ff', padding: '6px 12px', fontSize: '11px', fontWeight: 700, color: '#1e40af', textTransform: 'uppercase', borderBottom: '1px solid #bfdbfe', letterSpacing: '0.5px' }}>Receipt Details</div>
            <div style={{ display: 'flex', padding: '8px 12px', fontSize: '13px', gap: '24px' }}>
              <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ color: '#64748b', width: '80px' }}>Receipt No:</span>
                <span style={{ fontWeight: 700, color: '#0f172a' }}>{receipt.receiptNo?.replace('RCP-', '')}</span>
              </div>
              <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ color: '#64748b', width: '65px' }}>Bill Date:</span>
                <span style={{ fontWeight: 700, color: '#0f172a' }}>{formattedBillDate}</span>
              </div>
              <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ color: '#64748b', width: '90px' }}>Admission No:</span>
                <span style={{ fontWeight: 700, color: '#0f172a' }}>{receipt.admissionNo || receipt.enrollmentNo || 'N/A'}</span>
              </div>
            </div>
          </div>

          {/* Student Details */}
          <div style={{ border: '1px solid #e9d5ff', borderRadius: '8px', overflow: 'hidden' }}>
            <div style={{ background: '#faf5ff', padding: '6px 12px', fontSize: '11px', fontWeight: 700, color: '#6b21a8', textTransform: 'uppercase', borderBottom: '1px solid #e9d5ff', letterSpacing: '0.5px' }}>Student Details</div>
            <div style={{ display: 'flex', padding: '8px 12px', fontSize: '13px', gap: '24px' }}>
              <div style={{ flex: 2, display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ color: '#64748b', width: '80px' }}>Name:</span>
                <span style={{ fontWeight: 700, color: '#0f172a' }}>{receipt.studentName !== 'N/A' ? receipt.studentName : 'N/A'}</span>
              </div>
              <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ color: '#64748b', width: '90px' }}>Date of Birth:</span>
                <span style={{ fontWeight: 700, color: '#0f172a' }}>{receipt.studentDob ? new Date(receipt.studentDob).toLocaleDateString('en-GB').replace(/\//g, '-') : 'N/A'}</span>
              </div>
            </div>
          </div>

          {/* Academic Details */}
          <div style={{ border: '1px solid #bbf7d0', borderRadius: '8px', overflow: 'hidden' }}>
            <div style={{ background: '#f0fdf4', padding: '6px 12px', fontSize: '11px', fontWeight: 700, color: '#166534', textTransform: 'uppercase', borderBottom: '1px solid #bbf7d0', letterSpacing: '0.5px' }}>Academic Details</div>
            <div style={{ display: 'flex', padding: '8px 12px', fontSize: '13px', gap: '24px' }}>
              <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ color: '#64748b', width: '80px' }}>University:</span>
                <span style={{ fontWeight: 700, color: '#0f172a', textTransform: 'uppercase' }}>{receipt.university || 'N/A'}</span>
              </div>
              <div style={{ flex: 1.5, display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ color: '#64748b', width: '60px' }}>Course:</span>
                <span style={{ fontWeight: 700, color: '#0f172a', textTransform: 'uppercase' }}>{receipt.program || 'N/A'}</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Table of Particulars */}
      <div style={{ borderRadius: '8px', border: '1px solid #2563eb', overflow: 'hidden', marginBottom: '16px' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ background: '#2563eb' }}>
              <th style={{ padding: '8px 14px', textAlign: 'left', fontSize: '11px', color: '#ffffff', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px', width: '36px' }}>#</th>
              <th style={{ padding: '8px 14px', textAlign: 'left', fontSize: '11px', color: '#ffffff', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                {hasPartnerStudents ? 'Enrolled Student Particulars' : 'Particulars'}
              </th>
              {hasPartnerStudents && <th style={{ padding: '8px 14px', textAlign: 'left', fontSize: '11px', color: '#ffffff', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Course / Program</th>}
              {hasPartnerStudents && <th style={{ padding: '8px 14px', textAlign: 'center', fontSize: '11px', color: '#ffffff', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px', width: '120px' }}>Enrolled Date</th>}
              <th style={{ padding: '8px 14px', textAlign: 'right', fontSize: '11px', color: '#ffffff', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px', width: '160px' }}>Amount ({CS()})</th>
            </tr>
          </thead>
          <tbody>
            {(Array.isArray(receipt.items) ? receipt.items : []).map((item: any, i: number) => (
              <tr key={i} style={{ borderBottom: '1px solid #f1f5f9', background: i % 2 === 0 ? '#ffffff' : '#f8fafc' }}>
                <td style={{ padding: '10px 14px', fontSize: '12px', color: '#64748b' }}>{i + 1}</td>
                <td style={{ padding: '10px 14px', fontSize: '13px', color: '#0f172a', fontWeight: 600 }}>
                  <div>{item.studentName || item.description || item.name}</div>
                  {item.enrollmentNo && <div style={{ fontSize: '11px', color: '#2563eb', fontWeight: 500, marginTop: '2px' }}>#{item.enrollmentNo}</div>}
                </td>
                {hasPartnerStudents && <td style={{ padding: '10px 14px', fontSize: '13px', color: '#334155' }}>{item.programName || '—'}</td>}
                {hasPartnerStudents && <td style={{ padding: '10px 14px', fontSize: '12px', color: '#64748b', textAlign: 'center' }}>{item.date || '—'}</td>}
                <td style={{ padding: '10px 14px', textAlign: 'right', fontSize: '13px', color: '#0f172a', fontWeight: 700 }}>{(item.amount || 0).toLocaleString(numLocale(), { minimumFractionDigits: 2 })}</td>
              </tr>
            ))}
            {Boolean(receipt.tax && Number(receipt.tax) > 0) && (
              <tr style={{ background: '#f8fafc', borderTop: '1px solid #e2e8f0' }}>
                <td colSpan={hasPartnerStudents ? 4 : 2} style={{ padding: '8px 14px', fontSize: '13px', color: '#475569', fontWeight: 600, textAlign: 'right' }}>Tax / GST:</td>
                <td style={{ padding: '8px 14px', textAlign: 'right', fontSize: '13px', color: '#475569', fontWeight: 700 }}>{CS()}{Number(receipt.tax).toLocaleString(numLocale(), { minimumFractionDigits: 2 })}</td>
              </tr>
            )}
            <tr style={{ background: '#eff6ff', borderTop: '2px solid #2563eb' }}>
              <td colSpan={hasPartnerStudents ? 4 : 2} style={{ padding: '10px 14px', fontSize: '13px', color: '#1e40af', fontWeight: 800, textAlign: 'right', textTransform: 'uppercase' }}>
                Total Amount {hasPartnerStudents ? `(${receipt.items?.length || 0} Students)` : ''}
              </td>
              <td style={{ padding: '10px 14px', textAlign: 'right', fontSize: '15px', color: '#1e40af', fontWeight: 900 }}>{CS()}{(receipt.total || 0).toLocaleString(numLocale(), { minimumFractionDigits: 2 })}</td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* Payment History / Transactions Table */}
      {paymentHistoryList.length > 0 && (
        <div style={{ borderRadius: '8px', border: '1px solid #cbd5e1', overflow: 'hidden', marginBottom: '16px' }}>
          <div style={{ background: '#f8fafc', padding: '6px 12px', borderBottom: '1px solid #cbd5e1', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '11px', fontWeight: 700, color: '#334155', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Payment History / Transactions</span>
            <span style={{ fontSize: '11px', fontWeight: 600, color: '#64748b' }}>{paymentHistoryList.length} {paymentHistoryList.length === 1 ? 'Record' : 'Records'}</span>
          </div>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: '#f1f5f9', borderBottom: '1px solid #e2e8f0' }}>
                <th style={{ padding: '6px 10px', textAlign: 'left', fontSize: '11px', color: '#475569', fontWeight: 700, textTransform: 'uppercase', width: '32px' }}>#</th>
                <th style={{ padding: '6px 10px', textAlign: 'left', fontSize: '11px', color: '#475569', fontWeight: 700, textTransform: 'uppercase', width: '95px' }}>Date</th>
                <th style={{ padding: '6px 10px', textAlign: 'left', fontSize: '11px', color: '#475569', fontWeight: 700, textTransform: 'uppercase' }}>Receipt / Ref No</th>
                <th style={{ padding: '6px 10px', textAlign: 'left', fontSize: '11px', color: '#475569', fontWeight: 700, textTransform: 'uppercase', width: '105px' }}>Mode</th>
                <th style={{ padding: '6px 10px', textAlign: 'right', fontSize: '11px', color: '#475569', fontWeight: 700, textTransform: 'uppercase', width: '120px' }}>Amount ({CS()})</th>
              </tr>
            </thead>
            <tbody>
              {paymentHistoryList.map((p: any, idx: number) => {
                const pDate = p.date ? new Date(p.date).toLocaleDateString('en-GB').replace(/\//g, '-') : 'N/A';
                return (
                  <tr key={p.id || idx} style={{ borderBottom: idx === paymentHistoryList.length - 1 ? 'none' : '1px solid #f1f5f9' }}>
                    <td style={{ padding: '6px 10px', fontSize: '12px', color: '#64748b', fontWeight: 600 }}>{idx + 1}</td>
                    <td style={{ padding: '6px 10px', fontSize: '12px', color: '#0f172a', fontWeight: 600 }}>{pDate}</td>
                    <td style={{ padding: '6px 10px', fontSize: '12px', color: '#334155', fontFamily: 'monospace', fontWeight: 600 }}>{p.referenceNo || p.invoiceNo || 'N/A'}</td>
                    <td style={{ padding: '6px 10px', fontSize: '12px', color: '#0f172a', textTransform: 'uppercase', fontWeight: 600 }}>{p.method || 'CASH'}</td>
                    <td style={{ padding: '6px 10px', textAlign: 'right', fontSize: '12px', color: '#16a34a', fontWeight: 700 }}>{CS()}{(Number(p.amount) || 0).toLocaleString(numLocale(), { minimumFractionDigits: 2 })}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Payment & Summary */}
      {isPartnerInvoice ? (
        <div style={{ display: 'flex', gap: '20px', alignItems: 'flex-start', marginBottom: '16px' }}>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: '13px', color: '#475569', lineHeight: '1.8' }}>
              <div style={{ display: 'flex', gap: '8px' }}><span style={{ fontWeight: 600, color: '#0f172a' }}>Amount in Words:</span> <span>{numberToWords(receipt.total || 0)}</span></div>
              <div style={{ display: 'flex', gap: '8px' }}><span style={{ fontWeight: 600, color: '#0f172a' }}>Academic Partner:</span> <span>{receipt.centerDetails?.name || receipt.center || 'Academic Partner'}</span></div>
              <div style={{ display: 'flex', gap: '8px' }}><span style={{ fontWeight: 600, color: '#0f172a' }}>Payment Mode:</span> <span>{paymentMethod.toUpperCase()}</span></div>
              <div style={{ display: 'flex', gap: '8px' }}><span style={{ fontWeight: 600, color: '#0f172a' }}>Paid At:</span> <span>{payAt.toUpperCase()}</span></div>
              <div style={{ display: 'flex', gap: '8px' }}>
                <span style={{ fontWeight: 600, color: '#0f172a' }}>Billing Status:</span> 
                <span style={{ fontWeight: 700, textTransform: 'uppercase', color: receipt.status === 'paid' ? '#16a34a' : '#2563eb' }}>{receipt.status || 'DRAFT'}</span>
              </div>
            </div>
          </div>

          <div style={{ width: '320px', background: '#f8fafc', padding: '16px', borderRadius: '8px', border: '1px solid #cbd5e1' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px', paddingBottom: '10px', borderBottom: '1px dashed #cbd5e1' }}>
              <span style={{ fontSize: '13px', color: '#475569', fontWeight: 600 }}>Subtotal</span>
              <span style={{ fontSize: '14px', color: '#0f172a', fontWeight: 700 }}>{CS()}{((receipt.amount ?? receipt.total) || 0).toLocaleString(numLocale(), { minimumFractionDigits: 2 })}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px', paddingBottom: '10px', borderBottom: '1px dashed #cbd5e1' }}>
              <span style={{ fontSize: '13px', color: '#475569', fontWeight: 600 }}>Tax / GST</span>
              <span style={{ fontSize: '14px', color: '#0f172a', fontWeight: 700 }}>{CS()}{(Number(receipt.tax) || 0).toLocaleString(numLocale(), { minimumFractionDigits: 2 })}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px', paddingBottom: '10px', borderBottom: '1px dashed #cbd5e1' }}>
              <span style={{ fontSize: '13px', color: '#16a34a', fontWeight: 600 }}>Total Remitted / Paid</span>
              <span style={{ fontSize: '14px', color: '#16a34a', fontWeight: 700 }}>{CS()}{totalPaid.toLocaleString(numLocale(), { minimumFractionDigits: 2 })}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '13px', color: '#0f172a', fontWeight: 800, textTransform: 'uppercase' }}>Balance Due</span>
              <span style={{ fontSize: '17px', color: (receipt.total - totalPaid) <= 0 ? '#16a34a' : '#ef4444', fontWeight: 900 }}>
                {CS()}{Math.max(0, (receipt.total || 0) - totalPaid).toLocaleString(numLocale(), { minimumFractionDigits: 2 })}
              </span>
            </div>
          </div>
        </div>
      ) : (
        <div style={{ display: 'flex', gap: '20px', alignItems: 'flex-start', marginBottom: '16px' }}>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: '13px', color: '#475569', lineHeight: '1.8' }}>
              <div style={{ display: 'flex', gap: '8px' }}><span style={{ fontWeight: 600, color: '#0f172a' }}>Amount in Words:</span> <span>{numberToWords(receipt.total || 0)}</span></div>
              <div style={{ display: 'flex', gap: '8px' }}><span style={{ fontWeight: 600, color: '#0f172a' }}>Payment Mode:</span> <span>{paymentMethod.toUpperCase()}</span></div>
              <div style={{ display: 'flex', gap: '8px' }}><span style={{ fontWeight: 600, color: '#0f172a' }}>Paid At:</span> <span>{payAt.toUpperCase()}</span></div>
            </div>
          </div>

          <div style={{ width: '320px', background: '#fdf8f6', padding: '16px', borderRadius: '8px', border: '1px solid #fed7aa' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px', paddingBottom: '10px', borderBottom: '1px dashed #fdba74' }}>
              <span style={{ fontSize: '13px', color: '#c2410c', fontWeight: 600 }}>Total Fee</span>
              <span style={{ fontSize: '14px', color: '#9a3412', fontWeight: 700 }}>{receipt.feeStructureMissing ? 'Fee not set up' : `${CS()}${totalFeeAmount.toLocaleString(numLocale(), { minimumFractionDigits: 2 })}`}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '12px', paddingBottom: '10px', borderBottom: '1px dashed #fdba74' }}>
              <span style={{ fontSize: '13px', color: '#16a34a', fontWeight: 600 }}>Total Remitted Fee</span>
              <span style={{ fontSize: '14px', color: '#16a34a', fontWeight: 700 }}>{CS()}{totalRemittedAmount.toLocaleString(numLocale(), { minimumFractionDigits: 2 })}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '13px', color: '#0f172a', fontWeight: 800, textTransform: 'uppercase' }}>Balance Fee</span>
              <span style={{ fontSize: '17px', color: balanceFeeAmount <= 0 ? '#16a34a' : '#ef4444', fontWeight: 900 }}>{receipt.feeStructureMissing ? '—' : `${CS()}${balanceFeeAmount.toLocaleString(numLocale(), { minimumFractionDigits: 2 })}`}</span>
            </div>
          </div>
        </div>
      )}

      {/* Footer */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', paddingTop: '12px', borderTop: '2px dashed #e2e8f0', fontSize: '12px', color: '#475569' }}>
        <div>
          <div style={{ fontWeight: 600, color: '#0f172a', marginBottom: '2px' }}>NB: Fee is not refundable.</div>
          <div style={{ fontSize: '11px' }}>This is a computer-generated receipt and does not require a physical signature.</div>
        </div>
        <div style={{ textAlign: 'right' }}>
          <div style={{ fontWeight: 700, color: '#0f172a', marginBottom: '2px' }}>Received / Authorized by:</div>
          <div style={{ fontStyle: 'italic' }}>Finance Officer / Accountant</div>
        </div>
      </div>
    </div>
  );

  return (
    <div id="receipt-print-area" style={{ background: '#fff' }}>
      {receiptContent}
    </div>
  );
}

export function BillReceiptPanel() {
  const { user } = useAuth();
  // Receipts are reached through either page
  const canDownload = canDo(user, 'bill_receipts', 'download') || canDo(user, 'invoices', 'download');
  const [invoices, setInvoices] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [receipt, setReceipt] = useState<any>(null);
  const [receiptOpen, setReceiptOpen] = useState(false);
  const [loadingReceipt, setLoadingReceipt] = useState(false);
  const [orgName, setOrgName] = useState('Organisation');
  const [page, setPage] = useState(1);
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [pageSize, setPageSize] = useState(10);

  useEffect(() => {
    fetchInvoices();
    // Try to get org name
    api.get('/auth/me').then(r => setOrgName(r.data?.data?.organization?.name || 'Organisation')).catch(() => { });
  }, []);

  const fetchInvoices = async () => {
    setLoading(true);
    try {
      const res = await api.get('/finance/invoices');
      setInvoices(res.data.data || []);
    } catch { toast.error('Failed to load invoices'); }
    finally { setLoading(false); }
  };

  const openReceipt = async (invoice: any) => {
    setLoadingReceipt(true);
    setReceiptOpen(true);
    try {
      const res = await api.get(`/finance/receipt/invoice/${invoice.id}`);
      setReceipt(res.data.data);
    } catch { toast.error('Failed to load receipt'); setReceiptOpen(false); }
    finally { setLoadingReceipt(false); }
  };

  const handlePrint = () => {
    const content = document.getElementById('receipt-print-area');
    if (!content) return;
    
    const opt = {
      margin:       5, // Small 5mm margin all around
      filename:     `Receipt_${receipt?.receiptNo || 'Download'}.pdf`,
      image:        { type: 'jpeg', quality: 0.98 },
      html2canvas:  { scale: 2, useCORS: true },
      jsPDF:        { unit: 'mm', format: 'a4', orientation: 'portrait' }
    };
    
    html2pdf().set(opt).from(content).save();
  };

  // Payment date = latest recorded payment, falling back to the invoice's paidAt
  const getPaymentDate = (inv: any): Date | null => {
    const times = (Array.isArray(inv.payments) ? inv.payments : [])
      .map((p: any) => new Date(p.receivedAt || p.createdAt).getTime())
      .filter((t: number) => !isNaN(t));
    if (times.length) return new Date(Math.max(...times));
    return inv.paidAt ? new Date(inv.paidAt) : null;
  };
  const toLocalKey = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

  const filtered = invoices.filter(inv => {
    if (dateFrom || dateTo) {
      const pd = getPaymentDate(inv);
      if (!pd) return false;
      const key = toLocalKey(pd);
      if (dateFrom && key < dateFrom) return false;
      if (dateTo && key > dateTo) return false;
    }
    const admNo =
      inv.student?.admissionNo ||
      inv.student?.enrollmentNo ||
      inv.admissionNo ||
      inv.enrollmentNo ||
      (Array.isArray(inv.items) && (inv.items[0]?.admissionNo || inv.items[0]?.enrollmentNo)) ||
      '';
    const matchStatus = statusFilter === 'all' || inv.status === statusFilter;
    const matchSearch = !search || 
      inv.invoiceNo?.toLowerCase().includes(search.toLowerCase()) ||
      inv.student?.name?.toLowerCase().includes(search.toLowerCase()) ||
      admNo.toLowerCase().includes(search.toLowerCase()) ||
      inv.center?.name?.toLowerCase().includes(search.toLowerCase()) ||
      inv.center?.code?.toLowerCase().includes(search.toLowerCase());
    return matchStatus && matchSearch;
  });

  const currentPage = Math.min(page, Math.max(1, Math.ceil(filtered.length / pageSize)));
  const paged = filtered.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  const statusColors: Record<string, string> = {
    paid: 'bg-[#dff3da] text-[#256c1d]',
    pending: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
    draft: 'bg-slate-100 text-slate-600',
    partial: 'bg-sky-100 text-sky-700',
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl sm:text-3xl font-semibold tracking-tight">Bills &amp; Receipts</h2>
        <p className="text-muted-foreground text-sm mt-1.5">Search invoices and download payment receipts.</p>
      </div>

      <div className="rounded-3xl bg-white border border-slate-100 p-4 flex flex-col lg:flex-row gap-3 lg:items-center">
        <div className="relative flex-1">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <Input placeholder="Search invoice, admission no, student..." className="pl-11 h-12 rounded-full bg-[#f4f6f3] border-transparent text-sm focus:bg-white focus:border-[#54b947] focus:ring-4 focus:ring-[#54b947]/20" value={search} onChange={e => { setSearch(e.target.value); setPage(1); }} />
        </div>
        <div className={`flex items-center gap-2 rounded-full border px-4 h-12 text-sm ${dateFrom || dateTo ? 'bg-[#eaf6e6] border-[#8ae47e]' : 'bg-white border-slate-200'}`}>
          <span className="text-xs font-semibold uppercase tracking-wide text-slate-500 whitespace-nowrap">Paid on</span>
          <input type="date" value={dateFrom} max={dateTo || undefined} onChange={e => { setDateFrom(e.target.value); setPage(1); }} aria-label="Payment date from" className="bg-transparent outline-none text-slate-700 w-[8.5rem]" />
          <span className="text-slate-400">→</span>
          <input type="date" value={dateTo} min={dateFrom || undefined} onChange={e => { setDateTo(e.target.value); setPage(1); }} aria-label="Payment date to" className="bg-transparent outline-none text-slate-700 w-[8.5rem]" />
          {(dateFrom || dateTo) && (
            <button type="button" onClick={() => { setDateFrom(''); setDateTo(''); setPage(1); }} className="ml-1 text-xs font-semibold text-[#256c1d] hover:underline whitespace-nowrap">Clear</button>
          )}
        </div>
        <Select value={statusFilter} onValueChange={(v) => { setStatusFilter(v); setPage(1); }}>
          <SelectTrigger className={`h-12 sm:w-44 rounded-full px-5 text-sm font-semibold border ${statusFilter !== 'all' ? 'bg-[#8ae47e] border-[#8ae47e] text-[#0b1d14]' : 'bg-white border-slate-200 text-slate-600'}`}><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="paid">Paid</SelectItem>
            <SelectItem value="pending">Pending</SelectItem>
            <SelectItem value="partial">Partial</SelectItem>
            <SelectItem value="draft">Draft</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="rounded-3xl bg-white border border-slate-100 overflow-hidden">
        <div className="px-6 py-5 flex items-center justify-between border-b border-slate-100">
          <h3 className="text-lg font-semibold tracking-tight flex items-center gap-2.5">
            <span className="w-9 h-9 rounded-xl bg-[#eaf6e6] text-[#256c1d] flex items-center justify-center"><Receipt className="w-4 h-4" /></span>
            Invoices
          </h3>
          {!loading && <span className="rounded-full bg-[#eaf6e6] text-[#256c1d] text-xs font-semibold px-3 py-1">{filtered.length} found</span>}
        </div>
        <div className="p-4 sm:p-5">
          {loading ? (
            <div className="space-y-3">{[1, 2, 3].map(i => <div key={i} className="h-16 bg-slate-100 rounded-2xl animate-pulse" />)}</div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-14 text-muted-foreground">
              <div className="w-14 h-14 rounded-2xl bg-[#eaf6e6] text-[#256c1d] flex items-center justify-center mx-auto mb-3"><Receipt className="w-6 h-6" /></div>
              <p className="text-sm">No invoices found</p>
            </div>
          ) : (
            <div className="space-y-3">
              {paged.map(inv => {
                const admissionNo =
                  inv.student?.admissionNo ||
                  inv.student?.enrollmentNo ||
                  inv.admissionNo ||
                  inv.enrollmentNo ||
                  (Array.isArray(inv.items) && (inv.items[0]?.admissionNo || inv.items[0]?.enrollmentNo)) ||
                  '';

                return (
                  <div key={inv.id} className="flex flex-col md:flex-row md:items-center justify-between gap-3 p-4 rounded-2xl bg-[#f4f6f3] hover:bg-[#eef5ec] transition-colors">
                    <div className="flex items-center gap-3">
                      <div className={`w-11 h-11 rounded-2xl bg-white text-[#256c1d] flex items-center justify-center shrink-0`}>
                        {inv.center ? <Building2 className="w-4 h-4" /> : <FileText className="w-4 h-4" />}
                      </div>
                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-semibold text-sm text-slate-900">{inv.invoiceNo}</span>
                          {admissionNo && (
                            <Badge variant="secondary" className="text-[11px] font-mono font-medium px-2 py-0 h-5 bg-white text-[#256c1d] border border-[#cfe9c9] rounded-full">
                              Adm: {admissionNo}
                            </Badge>
                          )}
                          {inv.center && (
                            <Badge variant="outline" className="text-[10px] bg-white text-slate-600 border-slate-200 rounded-full py-0 px-2 font-medium">
                              Academic Partner
                            </Badge>
                          )}
                        </div>
                        <div className="text-xs text-muted-foreground flex items-center gap-1.5 mt-0.5 flex-wrap">
                          {inv.center ? (
                            <>
                              <span className="font-medium text-slate-700 dark:text-slate-300">{inv.center.name}</span>
                              {inv.center.code && <span className="text-[10px] text-slate-500 font-mono">({inv.center.code})</span>}
                              {inv.student?.name && (
                                <>
                                  <span>•</span>
                                  <User className="w-3 h-3" />
                                  <span>{inv.student.name}</span>
                                  {admissionNo && <span className="text-[11px] font-mono text-slate-500 font-normal">({admissionNo})</span>}
                                </>
                              )}
                            </>
                          ) : (
                            <>
                              <User className="w-3 h-3" />
                              <span>{inv.student?.name || 'N/A'}</span>
                              {admissionNo && <span className="text-[11px] font-mono text-slate-500 font-normal">({admissionNo})</span>}
                            </>
                          )}
                          {getPaymentDate(inv) && (
                            <>
                              <span>•</span>
                              <span className="text-[#256c1d] font-medium">Paid: {getPaymentDate(inv)!.toLocaleDateString('en-IN')}</span>
                            </>
                          )}
                          {inv.dueDate && (
                            <>
                              <span>•</span>
                              <span>Due: {new Date(inv.dueDate).toLocaleDateString('en-IN')}</span>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="text-right">
                        <div className="font-semibold text-base text-slate-900">{CS()}{(inv.total || inv.amount || 0).toLocaleString(numLocale())}</div>
                        <span className={`inline-block mt-1 rounded-full px-3 py-0.5 text-[11px] font-semibold capitalize ${statusColors[inv.status] || 'bg-slate-100 text-slate-600'}`}>{inv.status}</span>
                      </div>
                      {canDownload && (
                        <Button size="sm" variant="outline" className="gap-1.5 h-9 rounded-full px-4 text-xs font-semibold text-[#256c1d] border-[#cfe9c9] bg-white hover:bg-[#eaf6e6]" onClick={() => openReceipt(inv)}>
                          <Printer className="w-3.5 h-3.5" /> Receipt
                        </Button>
                      )}
                    </div>
                  </div>
                );
              })}
              <ListPagination total={filtered.length} page={currentPage} pageSize={pageSize} onPageChange={setPage} onPageSizeChange={(n) => { setPageSize(n); setPage(1); }} />
            </div>
          )}
        </div>
      </div>

      {/* Receipt Dialog */}
      <Dialog open={receiptOpen} onOpenChange={setReceiptOpen}>
        <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto rounded-[2rem] border-0 bg-white" style={{ fontFamily: "Urbanist, ui-sans-serif, system-ui, sans-serif" }}>
          <DialogHeader>
            <div className="flex items-center justify-between pr-8">
              <DialogTitle className="text-xl font-semibold tracking-tight">
                {receipt?.centerDetails || (receipt?.center && receipt?.center !== 'Direct' && receipt?.center !== 'HEAD OFFICE')
                  ? `Academic Partner Bill Receipt`
                  : 'Payment Receipt'
                }
              </DialogTitle>
              <Button size="sm" onClick={handlePrint} className="gap-1.5 h-10 px-5 rounded-full bg-[#8ae47e] hover:bg-[#7bd96f] text-[#0b1d14] font-semibold">
                <Download className="w-3.5 h-3.5" /> Download PDF
              </Button>
            </div>
          </DialogHeader>
          {loadingReceipt ? (
            <div className="py-16 text-center text-muted-foreground">Generating receipt...</div>
          ) : receipt ? (
            <ReceiptDocument receipt={receipt} orgName={orgName} />
          ) : null}
        </DialogContent>
      </Dialog>
    </div>
  );
}
