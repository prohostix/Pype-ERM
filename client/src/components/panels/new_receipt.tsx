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
  const balanceDue = receipt.balanceDue !== undefined ? receipt.balanceDue : Math.max(0, (receipt.total || 0) - totalPaid);
  
  const paymentMethod = receipt.payments?.[0]?.method || 'CASH';
  const payAt = receipt.center || 'HEAD OFFICE';

  const receiptContent = (
    <div style={{ fontFamily: '"Times New Roman", Times, serif', width: '100%', margin: '0 auto', background: '#fff', color: '#000', padding: '20px 40px' }}>
      
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '20px' }}>
        <div style={{ flex: 1 }}>
          {logoUrl ? (
            <img src={logoUrl} alt="Logo" style={{ height: '70px', objectFit: 'contain' }} />
          ) : (
            <div style={{ fontSize: '28px', fontWeight: 'bold', color: '#b91c1c' }}>{actualOrgName}</div>
          )}
        </div>
        <div style={{ flex: 1, fontSize: '12px', textAlign: 'left', fontStyle: 'italic', paddingLeft: '20px' }}>
          <div style={{ fontWeight: 'bold' }}>{actualOrgName.toUpperCase()}</div>
          {receipt.organization?.address ? (
            <div style={{ whiteSpace: 'pre-wrap' }}>{receipt.organization.address}</div>
          ) : (
            <>
              <div>2ND FLOOR AL MADEENA TOWER ,CALICUT</div>
              <div>ROAD EDAPPAL</div>
              <div>EDAPPAL Malappuram ,kerala- 679576</div>
              <div>MOB: 9526387777</div>
              <div>MAIL ID: info@timseducation.com</div>
            </>
          )}
        </div>
      </div>

      <div style={{ textAlign: 'center', fontWeight: 'bold', textDecoration: 'underline', fontSize: '18px', marginBottom: '20px' }}>CASH RECEIPT</div>

      {/* Details section */}
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '14px', marginBottom: '15px' }}>
        <div style={{ width: '48%' }}>
          <div style={{ display: 'flex', marginBottom: '8px' }}>
            <span style={{ width: '120px' }}>AdNo</span>
            <span style={{ fontWeight: 'bold' }}>{receipt.admissionNo || receipt.student?.admissionNo || receipt.enrollmentNo || 'N/A'} . {receipt.studentName !== 'N/A' ? receipt.studentName : ''}</span>
          </div>
          <div style={{ display: 'flex', marginBottom: '8px' }}>
            <span style={{ width: '120px' }}>DATE OF BIRTH</span>
            <span style={{ fontWeight: 'bold' }}>{receipt.studentDob ? new Date(receipt.studentDob).toLocaleDateString('en-GB').replace(/\//g, '-') : ''}</span>
          </div>
          <div style={{ display: 'flex' }}>
            <span style={{ width: '120px' }}>COURSE</span>
            <span style={{ fontWeight: 'bold' }}>{receipt.program || ''}</span>
          </div>
        </div>
        <div style={{ width: '48%' }}>
          <div style={{ display: 'flex', marginBottom: '8px' }}>
            <span style={{ width: '120px' }}>RECEIPT No</span>
            <span style={{ fontWeight: 'bold' }}>{receipt.receiptNo?.replace('RCP-', '')}</span>
          </div>
          <div style={{ display: 'flex', marginBottom: '8px' }}>
            <span style={{ width: '120px' }}>DATE</span>
            <span style={{ fontWeight: 'bold' }}>{new Date(receipt.date).toLocaleDateString('en-GB').replace(/\//g, '-')}</span>
          </div>
          <div style={{ display: 'flex' }}>
            <span style={{ width: '120px' }}>UNIVERSITY</span>
            <span style={{ fontWeight: 'bold' }}>{receipt.university || ''}</span>
          </div>
        </div>
      </div>

      {/* Table */}
      <table style={{ width: '100%', borderCollapse: 'collapse', border: '1px solid #000', marginBottom: '5px' }}>
        <thead>
          <tr>
            <th style={{ border: '1px solid #000', padding: '6px', textAlign: 'center', fontWeight: 'bold' }}>PARTICULARS</th>
            <th style={{ border: '1px solid #000', padding: '6px', textAlign: 'center', fontWeight: 'bold', width: '150px' }}>AMOUNT</th>
          </tr>
        </thead>
        <tbody>
          {(Array.isArray(receipt.items) ? receipt.items : []).map((item: any, i: number) => (
            <tr key={i}>
              <td style={{ border: '1px solid #000', padding: '6px 10px', fontWeight: 'bold' }}>{item.description || item.name}</td>
              <td style={{ border: '1px solid #000', padding: '6px 10px', textAlign: 'right', fontWeight: 'bold' }}>{(item.amount || 0).toFixed(2)}</td>
            </tr>
          ))}
          {/* Empty rows to match design */}
          {[1, 2].map((_, i) => (
            <tr key={`empty-${i}`}>
              <td style={{ border: '1px solid #000', padding: '12px' }}></td>
              <td style={{ border: '1px solid #000', padding: '12px' }}></td>
            </tr>
          ))}
          <tr>
            <td style={{ border: '1px solid #000', padding: '6px 10px', textAlign: 'center', fontWeight: 'bold' }}>TOTAL AMOUNT</td>
            <td style={{ border: '1px solid #000', padding: '6px 10px', textAlign: 'right', fontWeight: 'bold' }}>{(receipt.total || 0).toFixed(2)}</td>
          </tr>
        </tbody>
      </table>

      {/* Summary row */}
      <div style={{ border: '1px solid #000', padding: '4px 8px', fontSize: '13px', fontWeight: 'bold', display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
        <span>Total Fee : {receipt.feeStructureMissing ? 'Fee not set up' : (receipt.totalFee || receipt.overallProgramFee || receipt.universityFee || 0).toFixed(2)}</span>
        <span>Total Remitted Fee : {(receipt.overallPaid || totalPaid).toFixed(2)}</span>
        <span>Balance Fee : {receipt.feeStructureMissing ? '—' : Math.max(0, (receipt.totalFee || receipt.overallProgramFee || receipt.universityFee || 0) - (receipt.overallPaid || totalPaid)).toFixed(2)}</span>
      </div>

      {/* Words and Payment info */}
      <div style={{ fontSize: '14px', lineHeight: '1.5', marginBottom: '20px' }}>
        <div>{numberToWords(receipt.total || 0)}</div>
        <div>By {paymentMethod.toUpperCase()}</div>
        <div>Pay At {payAt.toUpperCase()}</div>
      </div>

      {/* Footer */}
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', fontWeight: 'bold', marginTop: '30px' }}>
        <div>NB: Fee not refundable</div>
        <div>Received by Accountant/Cashier &nbsp;&nbsp;&nbsp; </div>
      </div>
    </div>
  );

  return (
    <div id="receipt-print-area">
      {receiptContent}
      <div style={{ borderBottom: '1px dashed #000', margin: '30px 40px', position: 'relative' }}>
         <div style={{ position: 'absolute', top: '-10px', left: '-20px' }}>---</div>
      </div>
      {receiptContent}
    </div>
  );
}
