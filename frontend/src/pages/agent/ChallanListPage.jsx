import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, Plus, Truck, Trash2, Printer, X } from 'lucide-react';
import { challanAPI } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { useFirm } from '../../context/FirmContext';

const fmtDate = (d) => d ? new Date(d).toLocaleDateString('en-IN') : '—';

function SearchInput({ value, onChange, onClear }) {
  return (
    <div className="relative flex-1 max-w-sm">
      <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
      <input
        className="input pl-9 pr-8"
        placeholder="Search challan no, customer, quality..."
        value={value}
        onChange={onChange}
      />
      {value && (
        <button onClick={onClear} className="absolute right-3 top-1/2 -translate-y-1/2">
          <X size={14} className="text-gray-400 hover:text-gray-600" />
        </button>
      )}
    </div>
  );
}

export default function ChallanListPage() {
  const navigate              = useNavigate();
  const { isAdmin }           = useAuth();
  const { activeFirm: company, firms } = useFirm();
  const [challans, setChallans] = useState([]);
  const [loading, setLoading]   = useState(true);
  const [search, setSearch]     = useState('');
  const [firmFilter, setFirmFilter] = useState('All');
  const [printing, setPrinting] = useState(null);
  const [deleting, setDeleting] = useState(null);
  const [toast, setToast]       = useState('');

  const showToast = useCallback((msg) => {
    setToast(msg);
    setTimeout(() => setToast(''), 3000);
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = {};
      if (search)              params.search = search;
      if (firmFilter !== 'All') params.firmId = firmFilter;
      const { data } = await challanAPI.list(params);
      setChallans(data.challans || []);
    } catch { showToast('Failed to load challans'); }
    finally { setLoading(false); }
  }, [search, firmFilter, showToast]);

  useEffect(() => { load(); }, [load]);

  // ── Print a saved challan ──────────────────────────────────────────────────
  const handlePrint = (challan) => {
    setPrinting(challan._id);

    const logoHTML = company?.logo
      ? `<img src="${company.logo}" style="max-width:110px;max-height:60px;object-fit:contain;"/>`
      : `<div style="font-size:20px;font-weight:900;color:#fff;border:2px solid #fff;padding:4px 10px;">
           ${(company?.name || '').substring(0, 3).toUpperCase()}
         </div>
         <div style="font-size:8px;font-weight:700;letter-spacing:2px;color:#fff;margin-top:4px;">ENTERPRISE</div>`;

    const fmtNum = (v) => {
      const n = parseFloat(v);
      if (isNaN(n) || v === '' || v === null) return '';
      return Number.isInteger(n) ? n.toString() : parseFloat(n.toFixed(4)).toString();
    };

    const h = challan.headers || { col1: 'Design / Particulars', col2: 'HSN', col3: 'Pcs', col4: 'Meters' };

    const sumCol = (rows, col) => {
      const total = (rows || []).reduce((s, r) => {
        const v = parseFloat(r[col]);
        return isNaN(v) ? s : s + v;
      }, 0);
      return parseFloat(total.toFixed(4));
    };

    const buildGrid = (rows) => (rows || []).map(r =>
      `<tr>
        <td>${r.col1 || ''}</td><td>${r.col2 || ''}</td>
        <td>${fmtNum(r.col3)}</td><td>${fmtNum(r.col4)}</td>
      </tr>`
    ).join('');

    const t1 = challan.table1 || [];
    const t2 = challan.table2 || [];
    const totalRow = (rows) => {
      const c1 = sumCol(rows, 'col1'), c2 = sumCol(rows, 'col2');
      const c3 = sumCol(rows, 'col3'), c4 = sumCol(rows, 'col4');
      return `<tr style="background:#f0f0f0;font-weight:bold;">
        <td>${fmtNum(c1)}</td><td>${fmtNum(c2)}</td>
        <td>${fmtNum(c3)}</td><td>${fmtNum(c4)}</td>
      </tr>`;
    };

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
  <div class="fl"><label>M/s. :</label><div class="val">${challan.customerName || ''}</div></div>
  <div class="fl"><label>Add. :</label><div class="val">${challan.address || ''}</div></div>
  <div class="three">
    <div class="f"><label>Broker :</label><div class="val">${challan.broker || ''}</div></div>
    <div class="f"><label>Challan No. :</label><div class="val">${challan.challanNo || ''}</div></div>
    <div class="f"><label>Date :</label><div class="val">${fmtDate(challan.date)}</div></div>
  </div>
  <div class="qual"><label>Quality :</label><div class="val">${challan.quality || ''}</div></div>
  <div class="gsec">
    <table>
      <thead><tr><th>${h.col1}</th><th>${h.col2}</th><th>${h.col3}</th><th>${h.col4}</th></tr></thead>
      <tbody>${buildGrid(t1)}${totalRow(t1)}</tbody>
    </table>
  </div>
  <div class="gap"></div>
  <div class="gsec">
    <table>
      <thead><tr><th>${h.col1}</th><th>${h.col2}</th><th>${h.col3}</th><th>${h.col4}</th></tr></thead>
      <tbody>${buildGrid(t2)}${totalRow(t2)}</tbody>
    </table>
  </div>
  <div class="tots">
    <div class="tl">
      <div class="tr-row"><label>Total ${h.col3} :</label><div class="val">${fmtNum(challan.totalCol3)}</div></div>
      <div class="tr-row"><label>Total ${h.col4} :</label><div class="val">${fmtNum(challan.totalCol4)}</div></div>
    </div>
    <div class="tr2">
      <div class="tr-row"><label>Sub Total :</label><div class="val"></div></div>
      <div class="tr-row"><label>Balance :</label><div class="val"></div></div>
    </div>
  </div>
  <div class="rem">
    <div class="rb"><label>Remarks :</label><div class="rl"><div>${challan.remarks || ''}</div><div></div></div></div>
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
    setTimeout(() => { win.print(); setPrinting(null); }, 500);
  };

  // ── Delete ─────────────────────────────────────────────────────────────────
  const handleDelete = async (id) => {
    if (!window.confirm('Delete this challan?')) return;
    setDeleting(id);
    try {
      await challanAPI.delete(id);
      setChallans(prev => prev.filter(c => c._id !== id));
      showToast('Challan deleted');
    } catch { showToast('Failed to delete'); }
    finally { setDeleting(null); }
  };

  return (
    <div className="p-6 max-w-6xl mx-auto">

      {/* Toast */}
      {toast && (
        <div className="fixed top-4 right-4 z-50 bg-gray-900 text-white px-4 py-2.5 rounded-xl
                        shadow-xl text-sm font-medium animate-pulse">
          {toast}
        </div>
      )}

      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
            <Truck size={20} className="text-green-600 dark:text-green-400" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Delivery Challans</h1>
            <p className="text-sm text-gray-400">{challans.length} challan{challans.length !== 1 ? 's' : ''} found</p>
          </div>
        </div>
        <button onClick={() => navigate('/challans/new')} className="btn-primary">
          <Plus size={16} /> New Challan
        </button>
      </div>

      {/* Search + Firm filter */}
      <div className="flex flex-col gap-3 mb-5">
        <div className="flex gap-3">
          <SearchInput
            value={search}
            onChange={e => setSearch(e.target.value)}
            onClear={() => setSearch('')}
          />
        </div>
        {/* Firm filter pills */}
        {firms.length > 1 && (
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Firm:</span>
            <button
              onClick={() => setFirmFilter('All')}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all ${
                firmFilter === 'All' ? 'bg-gray-800 text-white border-gray-800' : 'bg-white text-gray-500 border-gray-200 hover:border-gray-400'
              }`}
            >All Firms</button>
            {firms.map(firm => (
              <button key={firm._id}
                onClick={() => setFirmFilter(firmFilter === firm._id ? 'All' : firm._id)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all ${
                  firmFilter === firm._id ? 'text-white border-transparent' : 'bg-white text-gray-600 border-gray-200 hover:border-gray-400'
                }`}
                style={firmFilter === firm._id ? { background: firm.color || '#0d6eaa' } : {}}
              >
                <div className="w-4 h-4 rounded flex items-center justify-center text-white text-[9px] font-bold"
                  style={{ background: firmFilter === firm._id ? 'rgba(255,255,255,0.3)' : (firm.color || '#0d6eaa') }}>
                  {firm.name.charAt(0).toUpperCase()}
                </div>
                {firm.name}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Table */}
      <div className="card overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-24">
            <div className="w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : challans.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 text-gray-400">
            <Truck size={44} className="mb-3 opacity-20" />
            <p className="font-semibold text-gray-500 dark:text-gray-400 text-lg">No challans yet</p>
            <p className="text-sm mt-1 mb-5">Create your first delivery challan</p>
            <button onClick={() => navigate('/challans/new')} className="btn-primary">
              <Plus size={15} /> New Challan
            </button>
          </div>
        ) : (
          <table className="data-table">
            <thead>
              <tr>
                <th>Challan No.</th>
                <th>Firm</th>
                <th>Customer</th>
                <th>Quality</th>
                <th>Broker</th>
                <th>Date</th>
                <th className="text-center">Total Pcs</th>
                <th className="text-center">Total Mtrs</th>
                <th className="text-center">Actions</th>
              </tr>
            </thead>
            <tbody>
              {challans.map(c => {
                const firm = firms.find(f => f._id === c.firmId);
                return (
                <tr key={c._id}>
                  <td>
                    <span className="font-semibold text-indigo-600 dark:text-indigo-400">
                      {c.challanNo || <span className="text-gray-300">—</span>}
                    </span>
                  </td>
                  <td>
                    {firm ? (
                      <div className="flex items-center gap-1.5">
                        <div className="w-5 h-5 rounded flex items-center justify-center text-white text-[10px] font-bold shrink-0"
                          style={{ background: firm.color || '#0d6eaa' }}>
                          {firm.name.charAt(0).toUpperCase()}
                        </div>
                        <span className="text-xs font-medium text-gray-600 truncate max-w-[80px]">{firm.name}</span>
                      </div>
                    ) : <span className="text-gray-300 text-xs">—</span>}
                  </td>
                  <td>
                    <span className="font-medium text-gray-800 dark:text-gray-200">{c.customerName || '—'}</span>
                  </td>
                  <td className="text-gray-500 dark:text-gray-400 max-w-[140px]">
                    <span className="truncate block">{c.quality || '—'}</span>
                  </td>
                  <td className="text-gray-500 dark:text-gray-400">{c.broker || '—'}</td>
                  <td className="text-gray-500 dark:text-gray-400">{fmtDate(c.date)}</td>
                  <td className="text-center font-semibold text-indigo-700 dark:text-indigo-400">{c.totalCol3 || '—'}</td>
                  <td className="text-center font-semibold text-green-700 dark:text-green-400">{c.totalCol4 || '—'}</td>
                  <td>
                    <div className="flex items-center justify-center gap-2">
                      <button onClick={() => handlePrint(c)} disabled={printing === c._id} title="Print Challan"
                        className="p-1.5 rounded-lg bg-green-50 hover:bg-green-100 text-green-600 disabled:opacity-50 transition-colors">
                        {printing === c._id
                          ? <div className="w-4 h-4 border-2 border-green-500 border-t-transparent rounded-full animate-spin"/>
                          : <Printer size={15}/>}
                      </button>
                      <button onClick={() => handleDelete(c._id)} disabled={deleting === c._id} title="Delete"
                        className="p-1.5 rounded-lg bg-red-50 hover:bg-red-100 text-red-500 disabled:opacity-50 transition-colors">
                        {deleting === c._id
                          ? <div className="w-4 h-4 border-2 border-red-400 border-t-transparent rounded-full animate-spin"/>
                          : <Trash2 size={15}/>}
                      </button>
                    </div>
                  </td>
                </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

    </div>
  );
}
