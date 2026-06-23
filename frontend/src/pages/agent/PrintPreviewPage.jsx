import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Printer, FileDown, Loader2 } from 'lucide-react';
import { invoiceAPI } from '../../services/api';
import { Spinner } from '../../components/ui';
import { useFirm } from '../../context/FirmContext';

function amountInWords(amount) {
  const ones = ['','One','Two','Three','Four','Five','Six','Seven','Eight','Nine',
    'Ten','Eleven','Twelve','Thirteen','Fourteen','Fifteen','Sixteen','Seventeen','Eighteen','Nineteen'];
  const tens = ['','','Twenty','Thirty','Forty','Fifty','Sixty','Seventy','Eighty','Ninety'];
  function h(n) {
    if (!n) return '';
    if (n < 20) return ones[n] + ' ';
    if (n < 100) return tens[Math.floor(n/10)] + (n%10 ? ' '+ones[n%10] : '') + ' ';
    return ones[Math.floor(n/100)] + ' Hundred ' + h(n%100);
  }
  const r = Math.floor(amount);
  let s = '';
  if (r >= 10000000) s += h(Math.floor(r/10000000)) + 'Crore ';
  if (r >= 100000)   s += h(Math.floor((r%10000000)/100000)) + 'Lakh ';
  if (r >= 1000)     s += h(Math.floor((r%100000)/1000)) + 'Thousand ';
  s += h(r % 1000);
  return (s.trim() || 'Zero') + ' Rupees Only';
}

function fmtDate(d) {
  if (!d) return '';
  return new Date(d).toLocaleDateString('en-IN', { day:'2-digit', month:'2-digit', year:'numeric' });
}
function fmtN(n, dec = 3) { return (parseFloat(n)||0).toFixed(dec); }
function fmtInt(n) { return Math.round(parseFloat(n)||0).toLocaleString('en-IN'); }
function fmtCur(n) { return (parseFloat(n)||0).toLocaleString('en-IN',{minimumFractionDigits:3,maximumFractionDigits:3}); }
function v(x, fb='') { return x || fb; }

export default function PrintPreviewPage() {
  const { id }    = useParams();
  const navigate  = useNavigate();
  const { activeFirm } = useFirm();
  const [inv, setInv]           = useState(null);
  const [co, setCo]             = useState(null);
  const [loading, setLoading]   = useState(true);
  const [pdfLoading, setPdfLoading] = useState(false);

  useEffect(() => {
    invoiceAPI.getById(id)
      .then(i => { setInv(i.data.invoice); setLoading(false); })
      .catch(() => navigate('/invoices'));
  }, [id]);

  // Use active firm; fall back to invoice-stored firm data
  useEffect(() => {
    if (activeFirm) setCo(activeFirm);
  }, [activeFirm]);

  const handlePrint = () => window.print();

  const handlePDF = async () => {
    setPdfLoading(true);
    try {
      const token = localStorage.getItem('token');
      const res   = await fetch(`/api/invoices/${id}/pdf`, { headers: { Authorization: `Bearer ${token}` } });
      if (!res.ok) throw new Error('failed');
      const blob = await res.blob();
      const url  = URL.createObjectURL(blob);
      const a    = document.createElement('a');
      a.href = url; a.download = `Invoice_${inv.invoiceNo}.pdf`; a.click();
      URL.revokeObjectURL(url);
    } catch { alert('PDF generation failed.'); }
    finally { setPdfLoading(false); }
  };

  if (loading) return <div className="flex justify-center items-center h-screen"><Spinner size="lg"/></div>;

  const isInterState = inv.igstAmt > 0;
  const rows = (inv.items && inv.items.length > 0) ? inv.items : [{
    itemName: inv.itemName, hsnSac: inv.hsnSac, uom: inv.uom || 'MTR',
    pieces: inv.pieces, quantity: inv.quantity, rate: inv.rate,
    discount: inv.discount || 0, billDiscount: inv.billDiscount || 0,
    taxableValue: inv.grossAmount,
    sgstRate: inv.sgstRate, cgstRate: inv.cgstRate, igstRate: inv.igstRate,
    sgstAmt: inv.sgstAmt, cgstAmt: inv.cgstAmt, igstAmt: inv.igstAmt,
    totalAmount: inv.totalAmount,
  }];

  let totalTaxable = 0, totalSgst = 0, totalCgst = 0, totalIgst = 0;
  rows.forEach(r => {
    totalTaxable += parseFloat(r.taxableValue || r.grossAmount) || 0;
    totalSgst    += parseFloat(r.sgstAmt) || 0;
    totalCgst    += parseFloat(r.cgstAmt) || 0;
    totalIgst    += parseFloat(r.igstAmt) || 0;
  });
  const taxTotal      = totalSgst + totalCgst + totalIgst;
  const totalDiscount = parseFloat(inv.totalDiscount) || 0;
  const grandTotal    = Math.round(inv.totalAmount - totalDiscount);

  const TD = ({ children, style = {}, ...props }) => (
    <td style={{ border: '1px solid #000', padding: '3px 5px', fontSize: '9px', ...style }} {...props}>
      {children}
    </td>
  );
  const TH = ({ children, style = {}, ...props }) => (
    <th style={{ border: '1px solid #555', padding: '4px 3px', fontSize: '8.5px', color: '#fff', textAlign: 'center', ...style }} {...props}>
      {children}
    </th>
  );

  return (
    <div style={{ background: '#e5e7eb', minHeight: '100vh' }}>
      {/* Toolbar */}
      <div className="print:hidden bg-white border-b shadow-sm px-6 py-3 flex items-center justify-between sticky top-0 z-10">
        <button onClick={() => navigate(`/invoices/${id}`)}
          className="flex items-center gap-2 text-gray-600 hover:text-gray-900 text-sm font-medium">
          <ArrowLeft size={16}/> Back
        </button>
        <p className="font-bold text-gray-900">Invoice Preview — {inv.invoiceNo}</p>
        <div className="flex gap-2">
          <button onClick={handlePDF} disabled={pdfLoading} className="btn-secondary text-sm">
            {pdfLoading ? <Loader2 size={15} className="animate-spin"/> : <FileDown size={15}/>}
            {pdfLoading ? 'Generating...' : 'Download PDF'}
          </button>
          <button onClick={handlePrint} className="btn-primary text-sm">
            <Printer size={15}/> Print
          </button>
        </div>
      </div>

      {/* Invoice A4 */}
      <div style={{ display: 'flex', justifyContent: 'center', padding: '24px 16px' }}>
        <div style={{
          background: '#fff', width: '780px', padding: '14px',
          fontFamily: 'Arial, Helvetica, sans-serif', fontSize: '9.5px', color: '#000',
          boxShadow: '0 4px 24px rgba(0,0,0,0.15)',
        }}>

          {/* ── HEADER ── */}
          <table style={{ borderCollapse: 'collapse', width: '100%', border: '2px solid #000', marginBottom: 0 }}>
            <tbody>
              <tr>
                {/* Logo */}
                <td style={{ width: 130, borderRight: '1px solid #000', padding: 8, textAlign: 'center', verticalAlign: 'middle' }}>
                  <div style={{ width:100,height:60,border:'1px dashed #ccc',margin:'auto',display:'flex',alignItems:'center',justifyContent:'center',fontSize:8,color:'#aaa' }}>LOGO</div>
                </td>
                {/* Company info */}
                <td style={{ padding: '8px 12px', borderRight: '1px solid #000', verticalAlign: 'top' }}>
                  <div style={{ fontSize:18,fontWeight:'bold',textAlign:'center',letterSpacing:1,marginBottom:6 }}>
                    {v(co?.name,'MY TEXTILE COMPANY').toUpperCase()}
                  </div>
                  <div style={{ fontSize:8.5,textAlign:'center',marginBottom:4 }}>{v(co?.address)}</div>
                  <div style={{ fontSize:8.5,marginTop:6 }}><strong>Contact:</strong> {v(co?.mobile)}</div>
                  <div style={{ fontSize:8.5 }}><strong>Email :</strong> {v(co?.email)}</div>
                </td>
                {/* GST + PAN */}
                <td style={{ width:180,padding:8,verticalAlign:'top' }}>
                  <div style={{ fontSize:8.5,marginBottom:5 }}><strong>GST No.: </strong>{v(co?.gstNo)}</div>
                  <div style={{ fontSize:8.5 }}><strong>PAN No.: </strong>{v(co?.panNo)}</div>
                </td>
              </tr>
            </tbody>
          </table>

          {/* ── TAX INVOICE TITLE ── */}
          <table style={{ borderCollapse:'collapse',width:'100%',border:'2px solid #000',borderTop:'none' }}>
            <tbody><tr>
              <td style={{ textAlign:'center',fontSize:14,fontWeight:'bold',padding:'5px',letterSpacing:2 }}>TAX INVOICE</td>
            </tr></tbody>
          </table>

          {/* ── CUSTOMER + INVOICE META ── */}
          <table style={{ borderCollapse:'collapse',width:'100%',border:'2px solid #000',borderTop:'none' }}>
            <tbody>
              <tr>
                <td style={{ width:'55%',borderRight:'1px solid #000',padding:'5px 8px' }}>
                  <strong>Name :</strong> {v(inv.billedToLine1)}
                </td>
                <td style={{ padding:'5px 8px' }}>
                  <strong>Invoice No :</strong> {v(inv.invoiceNo)}
                </td>
              </tr>
              <tr>
                <td style={{ borderRight:'1px solid #000',borderTop:'1px solid #000',padding:'5px 8px',verticalAlign:'top' }}>
                  <strong>Address :</strong> {[inv.billedToLine2,inv.billedToLine3].filter(Boolean).join(', ')}
                </td>
                <td style={{ borderTop:'1px solid #000',padding:'5px 8px' }}>
                  <strong>Invoice Date :</strong> {fmtDate(inv.invoiceDate)}
                </td>
              </tr>
              <tr>
                <td style={{ borderRight:'1px solid #000',borderTop:'1px solid #000',padding:'5px 8px' }}>
                  <strong>GSTIN :</strong> {v(inv.billedGSTNo)}
                </td>
                <td style={{ borderTop:'1px solid #000',padding:'5px 8px' }}>
                  <strong>Challan No :</strong> {v(inv.challanNo)}
                </td>
              </tr>
              <tr>
                <td style={{ borderRight:'1px solid #000',borderTop:'1px solid #000',padding:'5px 8px' }}>
                  <strong>State :</strong> {v(inv.billedStateName,'GUJARAT').toUpperCase()}
                  &nbsp;&nbsp;&nbsp;
                  <strong>Code :</strong> {v(inv.billedStateCode,'24')}
                </td>
                <td style={{ borderTop:'1px solid #000',padding:'5px 8px',display:'flex',justifyContent:'space-between' }}>
                  <span><strong>Payment Term :</strong> {v(inv.paymentTerm)}</span>
                  <span><strong>Due Date :</strong> {fmtDate(inv.dueDate)}</span>
                </td>
              </tr>
            </tbody>
          </table>

          {/* ── ITEMS TABLE ── */}
          <table style={{ borderCollapse:'collapse',width:'100%',border:'2px solid #000',borderTop:'none' }}>
            <thead>
              <tr style={{ background:'#333' }}>
                <TH style={{ width:28 }} rowSpan={2}>Sr.<br/>No</TH>
                <TH style={{ textAlign:'left',padding:'4px 6px' }} rowSpan={2}>Product Description</TH>
                <TH style={{ width:40 }} rowSpan={2}>HSN<br/>Code</TH>
                <TH style={{ width:34 }} rowSpan={2}>UOM</TH>
                <TH style={{ width:54 }} rowSpan={2}>Qty</TH>
                <TH style={{ width:46 }} rowSpan={2}>Rate</TH>
                <TH style={{ width:30 }} rowSpan={2}>Dis.</TH>
                <TH style={{ width:38 }} rowSpan={2}>Bill<br/>Dis.</TH>
                <TH style={{ width:68 }} rowSpan={2}>Taxable<br/>Value</TH>
                {isInterState ? (
                  <TH colSpan={2}>IGST</TH>
                ) : (<>
                  <TH colSpan={2}>CGST</TH>
                  <TH colSpan={2}>SGST</TH>
                </>)}
                <TH style={{ width:66 }} rowSpan={2}>Total</TH>
              </tr>
              <tr style={{ background:'#333' }}>
                {isInterState ? (<>
                  <TH style={{ width:24 }}>%</TH><TH style={{ width:54 }}>Amt</TH>
                </>) : (<>
                  <TH style={{ width:24 }}>%</TH><TH style={{ width:54 }}>Amt</TH>
                  <TH style={{ width:24 }}>%</TH><TH style={{ width:54 }}>Amt</TH>
                </>)}
              </tr>
            </thead>
            <tbody>
              {rows.map((item, i) => {
                const qty      = parseFloat(item.quantity)     || 0;
                const rate     = parseFloat(item.rate)         || 0;
                const discPct  = parseFloat(item.discount)     || 0;
                const billDisc = parseFloat(item.billDiscount) || 0;
                const taxable  = parseFloat(item.taxableValue || item.grossAmount) || parseFloat((qty*rate).toFixed(3));
                const sgstAmt  = parseFloat(item.sgstAmt) || 0;
                const cgstAmt  = parseFloat(item.cgstAmt) || 0;
                const igstAmt  = parseFloat(item.igstAmt) || 0;
                const rowTotal = parseFloat(item.totalAmount || (taxable+sgstAmt+cgstAmt+igstAmt).toFixed(2));
                const sgstRate = item.sgstRate || inv.sgstRate || 0;
                const cgstRate = item.cgstRate || inv.cgstRate || 0;
                const igstRate = item.igstRate || inv.igstRate || 0;
                return (
                  <tr key={i}>
                    <TD style={{ textAlign:'center' }}>{i+1}</TD>
                    <TD>
                      <strong>{v(item.itemName)}</strong>
                      {item.pieces ? <><br/><small>TAKA {item.pieces}</small></> : null}
                    </TD>
                    <TD style={{ textAlign:'center' }}>{v(item.hsnSac)}</TD>
                    <TD style={{ textAlign:'center' }}>{v(item.uom,'MTR')}</TD>
                    <TD style={{ textAlign:'right' }}>{fmtN(qty,2)}</TD>
                    <TD style={{ textAlign:'right' }}>{fmtN(rate,2)}</TD>
                    <TD style={{ textAlign:'right' }}>{fmtN(discPct,0)}</TD>
                    <TD style={{ textAlign:'right' }}>{fmtN(billDisc,0)}</TD>
                    <TD style={{ textAlign:'right' }}>{fmtCur(taxable)}</TD>
                    {isInterState ? (<>
                      <TD style={{ textAlign:'center' }}>{fmtN(igstRate,0)}</TD>
                      <TD style={{ textAlign:'right' }}>{fmtCur(igstAmt)}</TD>
                    </>) : (<>
                      <TD style={{ textAlign:'center' }}>{fmtN(cgstRate,0)}</TD>
                      <TD style={{ textAlign:'right' }}>{fmtCur(cgstAmt)}</TD>
                      <TD style={{ textAlign:'center' }}>{fmtN(sgstRate,0)}</TD>
                      <TD style={{ textAlign:'right' }}>{fmtCur(sgstAmt)}</TD>
                    </>)}
                    <TD style={{ textAlign:'right', fontWeight:'bold' }}>{fmtCur(rowTotal)}</TD>
                  </tr>
                );
              })}
              {/* Padding rows */}
              {Array(Math.max(0,10-rows.length)).fill(0).map((_,i) => (
                <tr key={`pad${i}`} style={{ height:22 }}>
                  {Array(isInterState?12:14).fill(0).map((_,j) => (
                    <TD key={j}>&nbsp;</TD>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>

          {/* ── FOOTER ── */}
          <table style={{ borderCollapse:'collapse',width:'100%',border:'2px solid #000',borderTop:'none' }}>
            <tbody><tr>
              {/* Left: words + bank + T&C */}
              <td style={{ width:'50%',borderRight:'1px solid #000',verticalAlign:'top',padding:0 }}>
                <div style={{ borderBottom:'1px solid #000',padding:'5px 8px' }}>
                  <div style={{ fontWeight:'bold',fontSize:9,marginBottom:2 }}>Total Invoice Amount in Words (Rupess)</div>
                  <div style={{ fontSize:9 }}>{amountInWords(grandTotal)}</div>
                </div>
                <div style={{ borderBottom:'1px solid #000',padding:'5px 8px' }}>
                  <div style={{ fontWeight:'bold',fontSize:9,marginBottom:4 }}>Bank Details</div>
                  <div style={{ fontSize:8.5 }}><strong>Bank Name :</strong> {v(co?.bankName)}</div>
                  <div style={{ fontSize:8.5 }}><strong>Bank A/C :</strong> {v(co?.accountNo)}</div>
                  <div style={{ fontSize:8.5 }}><strong>Bank IFSC :</strong> {v(co?.ifscCode)}</div>
                </div>
                <div style={{ padding:'5px 8px',minHeight:80 }}>
                  <div style={{ fontWeight:'bold',fontSize:9,marginBottom:3 }}>Terms &amp; Condition</div>
                  <div style={{ fontSize:8,lineHeight:1.5,color:'#333' }}>{v(co?.termsAndConditions)}</div>
                </div>
              </td>
              {/* Right: totals + signature */}
              <td style={{ width:'50%',verticalAlign:'top',padding:0 }}>
                <table style={{ width:'100%',borderCollapse:'collapse' }}>
                  <tbody>
                    {[
                      ['Total Discount On Bill', fmtInt(totalDiscount)],
                      ['Total Amt. Before Tax',  fmtCur(totalTaxable)],
                      ...(!isInterState ? [
                        ['Add: CGST', fmtCur(totalCgst)],
                        ['Add: SGST', fmtCur(totalSgst)],
                      ] : [
                        ['Add: IGST', fmtCur(totalIgst)],
                      ]),
                      ['Total Tax Amount', fmtCur(taxTotal)],
                    ].map(([label, val]) => (
                      <tr key={label} style={{ borderBottom:'1px solid #000' }}>
                        <td style={{ padding:'4px 8px',fontSize:9,fontWeight:'bold' }}>{label}</td>
                        <td style={{ padding:'4px 8px',fontSize:9,textAlign:'right',borderLeft:'1px solid #000' }}>{val}</td>
                      </tr>
                    ))}
                    <tr style={{ borderBottom:'1px solid #000' }}>
                      <td style={{ padding:'5px 8px',fontSize:10,fontWeight:'bold' }}>Total Amount. (Rs)</td>
                      <td style={{ padding:'5px 8px',fontSize:10,fontWeight:'bold',textAlign:'right',borderLeft:'1px solid #000' }}>{fmtInt(grandTotal)}</td>
                    </tr>
                    <tr style={{ borderBottom:'1px solid #000' }}>
                      <td colSpan={2} style={{ padding:'3px 8px',fontSize:8,color:'#444',fontStyle:'italic' }}>
                        Certified that the particulars given above are true &amp; correct
                      </td>
                    </tr>
                    <tr>
                      <td colSpan={2} style={{ padding:'30px 8px 8px',textAlign:'right',fontSize:9 }}>
                        <div style={{ fontWeight:'bold' }}>Authorised signatory</div>
                        <div style={{ fontWeight:'bold',marginTop:2 }}>{v(co?.name,'').toUpperCase()}</div>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </td>
            </tr></tbody>
          </table>

        </div>
      </div>

      <style>{`
        @media print {
          .print\\:hidden { display:none!important; }
          body { margin:0; background:white; }
          div[style*="background: rgb(229"] { padding:0!important; background:white!important; }
        }
      `}</style>
    </div>
  );
}
