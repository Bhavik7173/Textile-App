import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Printer, ArrowLeft, RotateCcw, Truck, Save, CheckCircle } from 'lucide-react';
import { challanAPI } from '../../services/api';
import { useFirm } from '../../context/FirmContext';

const today  = new Date().toISOString().split('T')[0];
const EMPTY_ROW = { col1: '', col2: '', col3: '', col4: '' };
const makeRows  = () => Array.from({ length: 14 }, () => ({ ...EMPTY_ROW }));

const INIT_FORM = {
  customerName: '', address: '', broker: '',
  challanNo: '', date: today, quality: '', remarks: '',
};

const INIT_HEADERS = {
  col1: 'Design / Particulars', col2: 'HSN', col3: 'Pcs', col4: 'Meters',
};

// ── precise decimal sum (avoids floating point drift) ────────────────────────
const sumCol = (rows, col) => {
  const total = rows.reduce((s, r) => {
    const v = parseFloat(r[col]);
    return isNaN(v) ? s : s + v;
  }, 0);
  // Round to max 4 decimal places, strip trailing zeros
  return parseFloat(total.toFixed(4));
};

export default function CreateChallanPage() {
  const navigate              = useNavigate();
  const { activeFirm: company } = useFirm();
  const [form, setForm]       = useState(INIT_FORM);
  const [table1, setTable1]   = useState(makeRows());
  const [table2, setTable2]   = useState(makeRows());
  const [headers]             = useState(INIT_HEADERS);
  const [saving, setSaving]   = useState(false);
  const [saved,  setSaved]    = useState(false);
  const [error,  setError]    = useState('');

  const setF    = (k) => (e) => setForm(p => ({ ...p, [k]: e.target.value }));
  const setCell = (tbl, row, col, val) => {
    const setter = tbl === 1 ? setTable1 : setTable2;
    setter(prev => { const n = prev.map(r => ({ ...r })); n[row][col] = val; return n; });
  };

  // ── column-wise totals (both tables combined) ─────────────────────────────
  const totCol1 = sumCol([...table1, ...table2], 'col1');
  const totCol2 = sumCol([...table1, ...table2], 'col2');
  const totCol3 = sumCol([...table1, ...table2], 'col3');
  const totCol4 = sumCol([...table1, ...table2], 'col4');

  // per-table subtotals
  const t1c1 = sumCol(table1, 'col1');
  const t1c2 = sumCol(table1, 'col2');
  const t1c3 = sumCol(table1, 'col3');
  const t1c4 = sumCol(table1, 'col4');
  const t2c1 = sumCol(table2, 'col1');
  const t2c2 = sumCol(table2, 'col2');
  const t2c3 = sumCol(table2, 'col3');
  const t2c4 = sumCol(table2, 'col4');

  const resetAll = () => {
    setForm(INIT_FORM); setTable1(makeRows()); setTable2(makeRows());
    setSaved(false); setError('');
  };

  // ── Save to DB ─────────────────────────────────────────────────────────────
  const handleSave = async () => {
    try {
      setSaving(true); setError('');
      await challanAPI.create({
        ...form,
        firmId: activeFirm?._id || null,
        headers,
        table1, table2,
        totalCol1: totCol1, totalCol2: totCol2,
        totalCol3: totCol3, totalCol4: totCol4,
      });
      setSaved(true);
      setTimeout(() => { setSaved(false); navigate('/challans'); }, 1500);
    } catch (e) {
      setError('Failed to save: ' + (e.response?.data?.error || e.message));
    } finally {
      setSaving(false);
    }
  };

  // ── Print ──────────────────────────────────────────────────────────────────
  const handlePrint = () => {
    const logoHTML = company?.logo
      ? `<img src="${company.logo}" style="max-width:110px;max-height:60px;object-fit:contain;"/>`
      : `<div style="font-size:20px;font-weight:900;color:#fff;border:2px solid #fff;padding:4px 10px;">
           ${(company?.name || '').substring(0, 3).toUpperCase()}
         </div>
         <div style="font-size:8px;font-weight:700;letter-spacing:2px;color:#fff;margin-top:4px;">ENTERPRISE</div>`;

    const fmtNum = (v) => {
      const n = parseFloat(v);
      if (isNaN(n) || v === '') return '';
      return Number.isInteger(n) ? n.toString() : n.toFixed(2);
    };

    const buildGrid = (rows) => rows.map(r =>
      `<tr>
        <td>${r.col1 || ''}</td>
        <td>${r.col2 || ''}</td>
        <td>${fmtNum(r.col3)}</td>
        <td>${fmtNum(r.col4)}</td>
      </tr>`
    ).join('');

    const totalRow = (c1, c2, c3, c4) =>
      `<tr style="background:#f0f0f0;font-weight:bold;">
        <td>${fmtNum(c1)}</td>
        <td>${fmtNum(c2)}</td>
        <td>${fmtNum(c3)}</td>
        <td>${fmtNum(c4)}</td>
      </tr>`;

    const html = `<!DOCTYPE html>
<html><head><meta charset="UTF-8"><title>Delivery Challan</title>
<style>
*{margin:0;padding:0;box-sizing:border-box;font-family:Arial,sans-serif;}
body{background:#fff;font-size:9px;}
.challan{width:210mm;min-height:297mm;background:#fff;border:1.5px solid #333;}
.header{display:grid;grid-template-columns:1fr 130px;border-bottom:1.5px solid #333;}
.co{padding:8px 12px;border-right:1.5px solid #333;}
.co h1{font-size:16px;font-weight:900;color:#0d6eaa;margin-bottom:2px;}
.co .btype{font-size:8.5px;color:#0d6eaa;font-weight:700;margin-bottom:2px;}
.co .addr{font-size:8px;color:#333;line-height:1.5;}
.co .gst{font-size:8px;font-weight:700;color:#0d6eaa;margin-top:2px;}
.co .phone{font-size:8px;color:#333;}
.logo-box{display:flex;flex-direction:column;align-items:center;justify-content:center;padding:10px;background:#0d6eaa;}
.title-bar{text-align:center;font-size:12px;font-weight:700;padding:5px;border-bottom:1.5px solid #333;letter-spacing:3px;}
.fl{padding:4px 10px;border-bottom:1px solid #999;font-size:9px;display:flex;align-items:flex-end;gap:4px;}
.fl label{font-weight:700;white-space:nowrap;min-width:38px;}
.fl .val{flex:1;border-bottom:1px solid #aaa;min-height:13px;padding-bottom:1px;}
.three{display:grid;grid-template-columns:1fr 130px 110px;border-bottom:1.5px solid #333;}
.f{padding:4px 10px;border-right:1px solid #999;font-size:9px;}
.f:last-child{border-right:none;}
.f label{font-weight:700;display:block;margin-bottom:2px;}
.f .val{border-bottom:1px solid #aaa;min-height:13px;padding-bottom:1px;}
.qual{padding:4px 10px;border-bottom:1.5px solid #333;font-size:9px;display:flex;align-items:flex-end;gap:4px;}
.qual label{font-weight:700;white-space:nowrap;}
.qual .val{flex:1;border-bottom:1px solid #aaa;min-height:13px;}
.gsec{border-bottom:1.5px solid #333;}
.gsec table{width:100%;border-collapse:collapse;table-layout:fixed;}
.gsec table th{background:#222;color:#fff;font-size:8.5px;font-weight:700;padding:4px 3px;border:1px solid #444;text-align:center;}
.gsec table td{border:1px solid #bbb;height:18px;padding:1px 4px;width:25%;font-size:8.5px;vertical-align:middle;}
.gap{height:8px;border-bottom:1px dashed #ccc;background:#fafafa;}
.tots{display:grid;grid-template-columns:55% 45%;border-bottom:1.5px solid #333;}
.tl{padding:6px 10px;border-right:1.5px solid #333;}
.tr2{padding:6px 10px;}
.tr-row{display:flex;align-items:flex-end;margin-bottom:5px;font-size:9px;gap:4px;}
.tr-row label{font-weight:700;min-width:100px;}
.tr-row .val{flex:1;border-bottom:1px solid #aaa;min-height:13px;padding-bottom:1px;}
.rem{display:grid;grid-template-columns:55% 45%;border-bottom:1.5px solid #333;}
.rb{padding:5px 10px;border-right:1.5px solid #333;font-size:9px;}
.rb label{font-weight:700;display:block;margin-bottom:3px;}
.rl div{border-bottom:1px solid #ddd;height:13px;margin-bottom:3px;}
.gb{display:flex;align-items:center;justify-content:center;font-size:11px;font-weight:700;color:#c00;text-align:center;padding:8px;}
.fsig{display:grid;grid-template-columns:1fr 1fr 1fr;border-bottom:1px solid #999;}
.fc{padding:4px 10px;border-right:1px solid #ddd;font-size:8.5px;}
.fc:last-child{border-right:none;}
.fc label{font-weight:700;display:block;margin-bottom:2px;}
.sl{border-bottom:1px solid #999;height:18px;margin-top:4px;}
.fn{padding:4px 10px;font-size:7.5px;color:#555;line-height:1.6;font-style:italic;}
@media print{body{padding:0;}.challan{border:none;}@page{size:A4;margin:6mm;}}
</style></head>
<body><div class="challan">
  <div class="header">
    <div class="co">
      <div style="font-size:7.5px;color:#666;margin-bottom:3px;">॥ શ્રી ॥</div>
      <h1>${(company?.name || '').toUpperCase()}</h1>
      ${company?.businessType ? `<div class="btype">${company.businessType}</div>` : ''}
      <div class="addr">${company?.address || ''}</div>
      <div class="gst">GSTIN : ${company?.gstNo || ''}</div>
      ${company?.mobile ? `<div class="phone">☎ ${company.mobile}</div>` : ''}
      ${company?.email  ? `<div class="phone">✉ ${company.email}</div>`  : ''}
    </div>
    <div class="logo-box">${logoHTML}</div>
  </div>
  <div class="title-bar">DELIVERY CHALLAN</div>
  <div class="fl"><label>M/s. :</label><div class="val">${form.customerName}</div></div>
  <div class="fl"><label>Add. :</label><div class="val">${form.address}</div></div>
  <div class="three">
    <div class="f"><label>Broker :</label><div class="val">${form.broker}</div></div>
    <div class="f"><label>Challan No. :</label><div class="val">${form.challanNo}</div></div>
    <div class="f"><label>Date :</label><div class="val">${form.date ? new Date(form.date).toLocaleDateString('en-IN') : ''}</div></div>
  </div>
  <div class="qual"><label>Quality :</label><div class="val">${form.quality}</div></div>
  <div class="gsec">
    <table>
      <thead><tr><th>${headers.col1}</th><th>${headers.col2}</th><th>${headers.col3}</th><th>${headers.col4}</th></tr></thead>
      <tbody>
        ${buildGrid(table1)}
        ${totalRow(t1c1, t1c2, t1c3, t1c4)}
      </tbody>
    </table>
  </div>
  <div class="gap"></div>
  <div class="gsec">
    <table>
      <thead><tr><th>${headers.col1}</th><th>${headers.col2}</th><th>${headers.col3}</th><th>${headers.col4}</th></tr></thead>
      <tbody>
        ${buildGrid(table2)}
        ${totalRow(t2c1, t2c2, t2c3, t2c4)}
      </tbody>
    </table>
  </div>
  <div class="tots">
    <div class="tl">
      <div class="tr-row"><label>Total Pieces :</label><div class="val">${fmtNum(totCol3)}</div></div>
      <div class="tr-row"><label>Total Meters :</label><div class="val">${fmtNum(totCol4)}</div></div>
    </div>
    <div class="tr2">
      <div class="tr-row"><label>Sub Total :</label><div class="val"></div></div>
      <div class="tr-row"><label>Balance :</label><div class="val"></div></div>
    </div>
  </div>
  <div class="rem">
    <div class="rb"><label>Remarks :</label><div class="rl"><div>${form.remarks}</div><div></div></div></div>
    <div class="gb">No Dyeing Guarantee</div>
  </div>
  <div class="fsig">
    <div class="fc"><label>Prepared by :</label><div class="sl"></div></div>
    <div class="fc"><label>Checked by :</label><div class="sl"></div></div>
    <div class="fc"><label>Rece. Sign :</label><div class="sl"></div></div>
  </div>
  <div class="fn">${company?.termsAndConditions || 'All complaints to be made within 24 hours. Quantity to be verified within 24 hours after that it will not be admitted.'}</div>
</div></body></html>`;

    const win = window.open('', '_blank');
    win.document.write(html);
    win.document.close();
    setTimeout(() => win.print(), 500);
  };

  // ── Editable Table UI ──────────────────────────────────────────────────────
  const fmtDisplay = (v) => {
    if (v === '' || v === null || v === undefined) return '';
    const n = parseFloat(v);
    return isNaN(n) ? '' : (Number.isInteger(n) ? n.toString() : parseFloat(n.toFixed(4)).toString());
  };

  const EditableTable = ({ rows, tableNum, subtotalC1, subtotalC2, subtotalC3, subtotalC4 }) => (
    <div className="overflow-x-auto rounded-xl border border-gray-200 dark:border-gray-700">
      <table className="w-full border-collapse text-sm">
        <thead>
          <tr className="bg-gray-800 text-white">
            {[headers.col1, headers.col2, headers.col3, headers.col4].map((h, i) => (
              <th key={i} className="border border-gray-600 px-2 py-2 text-xs font-bold text-center">
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, ri) => (
            <tr key={ri} className={ri % 2 === 0 ? 'bg-white dark:bg-gray-800' : 'bg-gray-50 dark:bg-gray-900/40'}>
              {['col1','col2','col3','col4'].map(col => (
                <td key={col} className="border border-gray-200 dark:border-gray-700 p-0">
                  <input
                    type="number"
                    step="any"
                    value={row[col]}
                    onChange={e => setCell(tableNum, ri, col, e.target.value)}
                    className="w-full h-8 px-2 text-sm bg-transparent text-gray-800 dark:text-gray-200
                               focus:outline-none focus:bg-indigo-50 dark:focus:bg-indigo-900/20
                               focus:ring-inset focus:ring-1 focus:ring-indigo-400 text-center transition-colors"
                    placeholder=""
                  />
                </td>
              ))}
            </tr>
          ))}
          {/* Sub-total row — all 4 columns */}
          <tr className="bg-gray-100 dark:bg-gray-700 font-semibold">
            {[subtotalC1, subtotalC2, subtotalC3, subtotalC4].map((val, i) => (
              <td key={i} className="border border-gray-300 dark:border-gray-600 px-2 py-1.5 text-center text-xs font-bold text-indigo-700 dark:text-indigo-400">
                {val || '—'}
              </td>
            ))}
          </tr>
        </tbody>
      </table>
    </div>
  );

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div className="p-6 max-w-5xl mx-auto">

      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate('/challans')}
            className="p-2 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-500 transition-colors">
            <ArrowLeft size={18} />
          </button>
          <div className="w-10 h-10 rounded-xl bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
            <Truck size={20} className="text-green-600 dark:text-green-400" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">New Delivery Challan</h1>
            <p className="text-sm text-gray-400">Fill details, save to DB and print</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={resetAll} className="btn-secondary">
            <RotateCcw size={15} /> Reset
          </button>
          <button onClick={handleSave} disabled={saving}
            className={`btn-secondary ${saved ? 'border-green-400 text-green-600' : ''}`}>
            {saving ? (
              <><span className="w-4 h-4 border-2 border-gray-400 border-t-transparent rounded-full animate-spin"/> Saving...</>
            ) : saved ? (
              <><CheckCircle size={15} className="text-green-500"/> Saved!</>
            ) : (
              <><Save size={15}/> Save</>
            )}
          </button>
          <button onClick={handlePrint} className="btn-primary">
            <Printer size={15} /> Print
          </button>
        </div>
      </div>

      {error && (
        <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 text-red-700 rounded-xl text-sm flex justify-between">
          {error}
          <button onClick={() => setError('')} className="font-bold ml-2">×</button>
        </div>
      )}

      {/* Customer */}
      <div className="card p-5 mb-4">
        <h2 className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-4">Customer Details</h2>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="label">Customer Name (M/s.)</label>
            <input className="input" placeholder="Enter customer name"
              value={form.customerName} onChange={setF('customerName')} />
          </div>
          <div>
            <label className="label">Address</label>
            <input className="input" placeholder="Enter address"
              value={form.address} onChange={setF('address')} />
          </div>
        </div>
      </div>

      {/* Challan Details */}
      <div className="card p-5 mb-4">
        <h2 className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-4">Challan Details</h2>
        <div className="grid grid-cols-3 gap-4 mb-4">
          <div>
            <label className="label">Broker</label>
            <input className="input" placeholder="Broker name"
              value={form.broker} onChange={setF('broker')} />
          </div>
          <div>
            <label className="label">Challan No.</label>
            <input className="input" placeholder="e.g. CH-001"
              value={form.challanNo} onChange={setF('challanNo')} />
          </div>
          <div>
            <label className="label">Date</label>
            <input className="input" type="date"
              value={form.date} onChange={setF('date')} />
          </div>
        </div>
        <div>
          <label className="label">Quality</label>
          <input className="input" placeholder="e.g. Turkey Georgette..."
            value={form.quality} onChange={setF('quality')} />
        </div>
      </div>

      {/* Table 1 */}
      <div className="card p-5 mb-2">
        <h2 className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-3">Items — Table 1</h2>
        <EditableTable rows={table1} tableNum={1}
          subtotalC1={t1c1 || null} subtotalC2={t1c2 || null}
          subtotalC3={t1c3 || null} subtotalC4={t1c4 || null} />
      </div>

      {/* Table 2 */}
      <div className="card p-5 mb-4">
        <h2 className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-3">Items — Table 2</h2>
        <EditableTable rows={table2} tableNum={2}
          subtotalC1={t2c1 || null} subtotalC2={t2c2 || null}
          subtotalC3={t2c3 || null} subtotalC4={t2c4 || null} />
      </div>

      {/* Grand Totals */}
      <div className="card p-5 mb-4">
        <h2 className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-4">Grand Total (Table 1 + Table 2)</h2>
        <div className="grid grid-cols-4 gap-3">
          {[
            { label: headers.col1, val: totCol1, t1: t1c1, t2: t2c1, bg: 'bg-purple-50 dark:bg-purple-900/20', txt: 'text-purple-600 dark:text-purple-400', sub: 'text-purple-400' },
            { label: headers.col2, val: totCol2, t1: t1c2, t2: t2c2, bg: 'bg-blue-50 dark:bg-blue-900/20',     txt: 'text-blue-600 dark:text-blue-400',     sub: 'text-blue-400'   },
            { label: headers.col3, val: totCol3, t1: t1c3, t2: t2c3, bg: 'bg-indigo-50 dark:bg-indigo-900/20', txt: 'text-indigo-600 dark:text-indigo-400', sub: 'text-indigo-400' },
            { label: headers.col4, val: totCol4, t1: t1c4, t2: t2c4, bg: 'bg-green-50 dark:bg-green-900/20',   txt: 'text-green-600 dark:text-green-400',   sub: 'text-green-400'  },
          ].map(({ label, val, t1, t2, bg, txt, sub }) => (
            <div key={label} className={`${bg} rounded-xl p-4 text-center`}>
              <p className={`text-xs font-semibold uppercase tracking-wide mb-1 ${sub}`}>{label}</p>
              <p className={`text-2xl font-bold ${txt}`}>{val || 0}</p>
              <p className={`text-xs mt-1 ${sub}`}>{t1 || 0} + {t2 || 0}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Remarks */}
      <div className="card p-5 mb-6">
        <h2 className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-3">Remarks</h2>
        <textarea className="input resize-none h-20" placeholder="Any remarks..."
          value={form.remarks} onChange={setF('remarks')} />
      </div>

      {/* Bottom actions */}
      <div className="flex justify-end gap-3">
        <button onClick={resetAll} className="btn-secondary"><RotateCcw size={15}/> Reset</button>
        <button onClick={handleSave} disabled={saving}
          className={`btn-secondary ${saved ? 'border-green-400 text-green-600' : ''}`}>
          {saving ? 'Saving...' : saved ? '✓ Saved!' : <><Save size={15}/> Save</>}
        </button>
        <button onClick={handlePrint} className="btn-primary"><Printer size={15}/> Print Challan</button>
      </div>

    </div>
  );
}
