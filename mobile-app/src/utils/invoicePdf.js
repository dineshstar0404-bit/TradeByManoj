import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';

const INR = n => '₹' + Number(n||0).toLocaleString('en-IN');
const MODE_LABEL = { cash:'नकद', upi:'UPI', bank:'बैंक', other:'अन्य' };
const esc = s => String(s ?? '').replace(/[&<>]/g, c => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;' }[c]));

function itemRows(items) {
  return (items||[]).map(it => `
    <tr>
      <td>${esc(it.name)}</td>
      <td class="num">${(it.weightKg||0).toFixed(3)} ${esc(it.unit||'KG')}</td>
      <td class="num">${INR(it.ratePerKg)}</td>
      <td class="num">${it.deductionPct ? `${it.deductionPct}%` : '—'}</td>
      <td class="num">${it.claimPct ? `${it.claimPct}%` : '—'}</td>
      <td class="num bold">${INR(it.amount)}</td>
    </tr>`).join('');
}

function paymentRows(payments) {
  if (!payments || payments.length === 0) return '<tr><td colspan="4" class="muted">कोई भुगतान दर्ज नहीं।</td></tr>';
  return [...payments]
    .sort((a,b) => new Date(a.date) - new Date(b.date))
    .map(p => `
      <tr>
        <td>${new Date(p.date).toLocaleDateString('en-IN')}</td>
        <td>${MODE_LABEL[p.mode]||p.mode}</td>
        <td class="num">${INR(p.amount)}</td>
        <td>${esc(p.note||'')}</td>
      </tr>`).join('');
}

function buildHtml(bill) {
  const balance = Math.max((bill.totalAmount||0) - (bill.paidAmount||0), 0);
  const billDateStr = new Date(bill.billDate).toLocaleDateString('en-IN', { year:'numeric', month:'long', day:'numeric' });

  return `
  <html>
  <head>
    <meta charset="utf-8" />
    <style>
      body { font-family: -apple-system, Roboto, Arial, sans-serif; color:#111827; padding: 24px; }
      h1 { font-size: 20px; margin: 0; color:#004AAD; }
      .sub { color:#6B7280; font-size: 12px; margin-top: 2px; }
      .headRow { display:flex; justify-content:space-between; align-items:flex-start; border-bottom: 2px solid #004AAD; padding-bottom: 12px; margin-bottom: 16px; }
      .billNo { font-size: 16px; font-weight:700; color:#004AAD; }
      table { width:100%; border-collapse: collapse; margin-bottom: 16px; }
      th, td { padding: 6px 8px; font-size: 12px; border-bottom: 1px solid #E5E7EB; text-align:left; }
      th { background:#F3F4F6; font-size: 11px; text-transform:uppercase; color:#6B7280; }
      .num { text-align:right; }
      .bold { font-weight:700; }
      .muted { color:#9CA3AF; }
      .totalsBox { width: 260px; margin-left:auto; }
      .totalsBox .row { display:flex; justify-content:space-between; padding: 4px 0; font-size: 13px; }
      .grand { font-size: 16px; font-weight:800; color:#004AAD; border-top: 2px solid #004AAD; padding-top:6px; margin-top:4px; }
      .balance { color:#DC2626; font-weight:700; }
      .footer { margin-top: 24px; font-size: 11px; color:#9CA3AF; text-align:center; }
    </style>
  </head>
  <body>
    <div class="headRow">
      <div>
        <h1>मनोज ट्रेडर्स</h1>
        <div class="sub">जलालपुर, अंबेडकर नगर, उ.प्र.</div>
      </div>
      <div style="text-align:right">
        <div class="billNo">${esc(bill.billNumber || '—')}</div>
        <div class="sub">दिनांक: ${billDateStr}</div>
        ${bill.customer?.name ? `<div class="sub">ग्राहक: ${esc(bill.customer.name)}</div>` : ''}
      </div>
    </div>

    <table>
      <thead><tr>
        <th>वस्तु</th><th class="num">वज़न</th><th class="num">दर</th>
        <th class="num">कटौती</th><th class="num">क्लेम</th><th class="num">राशि</th>
      </tr></thead>
      <tbody>${itemRows(bill.items)}</tbody>
    </table>

    <div class="totalsBox">
      <div class="row"><span>वस्तु राशि</span><span>${INR(bill.itemAmount)}</span></div>
      ${bill.laborCharge     ? `<div class="row"><span>लेबर चार्ज</span><span>− ${INR(bill.laborCharge)}</span></div>` : ''}
      ${bill.transportCharge ? `<div class="row"><span>ट्रांसपोर्ट</span><span>− ${INR(bill.transportCharge)}</span></div>` : ''}
      ${bill.claim            ? `<div class="row"><span>क्लेम/डिस्काउंट</span><span>− ${INR(bill.claim)}</span></div>` : ''}
      <div class="row grand"><span>Grand Total</span><span>${INR(bill.totalAmount)}</span></div>
      <div class="row"><span>प्राप्त भुगतान</span><span>${INR(bill.paidAmount)}</span></div>
      <div class="row balance"><span>बकाया राशि</span><span>${balance > 0 ? INR(balance) : '✅ पूरा भुगतान'}</span></div>
    </div>

    <h3>Payment History</h3>
    <table>
      <thead><tr><th>तारीख़</th><th>माध्यम</th><th class="num">राशि</th><th>नोट</th></tr></thead>
      <tbody>${paymentRows(bill.payments)}</tbody>
    </table>

    ${bill.notes ? `<div class="sub"><b>नोट्स:</b> ${esc(bill.notes)}</div>` : ''}
    <div class="footer">MANOJ TRADERS · यह एक कंप्यूटर जनरेटेड बिल है</div>
  </body>
  </html>`;
}

/** Generates a PDF for the given bill and opens the native share/print sheet. */
export async function buildAndShareInvoicePdf(bill) {
  const { uri } = await Print.printToFileAsync({ html: buildHtml(bill) });
  const available = await Sharing.isAvailableAsync();
  if (!available) throw new Error('इस डिवाइस पर शेयर करना उपलब्ध नहीं है।');
  await Sharing.shareAsync(uri, { mimeType: 'application/pdf', dialogTitle: `${bill.billNumber || 'Invoice'}.pdf` });
}
