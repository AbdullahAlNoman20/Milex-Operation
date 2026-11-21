// src/Pages/modules/operations/components/customer/ProfileBits.jsx
// Shared building blocks for the Recommendation Form and Account Profile sheets.
export const Kv = ({ k, v, className = '' }) => (
  <div className={`py-1.5 border-b border-slate-100 ${className}`}>
    <p className="text-[10px] font-bold text-slate-400 uppercase">{k}</p>
    <p className="text-xs font-semibold text-slate-800 break-words">{v || v === 0 ? v : '—'}</p>
  </div>
);

export const KvGrid = ({ children, className = 'sm:grid-cols-2 lg:grid-cols-3' }) => <div className={`grid grid-cols-1 gap-x-6 ${className}`}>{children}</div>;

export const SheetSection = ({ title, children }) => (
  <section className="mb-4 break-inside-avoid">
    <h3 className="bg-slate-800 text-white text-[10px] font-bold uppercase tracking-wide px-2 py-1 print:[-webkit-print-color-adjust:exact] print:[print-color-adjust:exact]">{title}</h3>
    <div className="border border-t-0 border-slate-300 p-3">{children}</div>
  </section>
);

export const Tick = ({ label, checked }) => (
  <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-slate-700 mr-4">
    <span className={`w-3.5 h-3.5 border border-slate-700 inline-flex items-center justify-center shrink-0 ${checked ? 'bg-slate-800 print:[-webkit-print-color-adjust:exact] print:[print-color-adjust:exact]' : ''}`}>
      {checked && <span className="text-white text-[9px] leading-none">✓</span>}
    </span>
    {label}
  </span>
);

export const MiniTable = ({ columns, rows, empty = 'No data.' }) => (
  <div className="overflow-x-auto">
    <table className="w-full text-[11px] border border-slate-300">
      <thead><tr className="bg-slate-100 text-left">{columns.map((c) => <th key={c.key} className="p-1.5 border-b border-slate-300 whitespace-nowrap">{c.label}</th>)}</tr></thead>
      <tbody>
        {rows.length === 0
          ? <tr><td colSpan={columns.length} className="p-2 text-slate-400">{empty}</td></tr>
          : rows.map((r, i) => (
            <tr key={i} className="border-t border-slate-200 align-top">
              {columns.map((c) => <td key={c.key} className="p-1.5">{c.render ? c.render(r) : (r[c.key] || r[c.key] === 0 ? r[c.key] : '—')}</td>)}
            </tr>))}
      </tbody>
    </table>
  </div>
);

export const SheetHeader = ({ customerId, title, right }) => (
  <div className="flex flex-wrap items-start justify-between gap-3 border-b-2 border-slate-800 pb-2 mb-4">
    <div><p className="text-lg font-black tracking-wide text-slate-900">{customerId || '—'}</p><p className="text-sm font-black text-emerald-700 uppercase tracking-wide">{title}</p></div>
    <div className="text-right text-[11px] text-slate-600">{right}</div>
  </div>
);

export const longDateTime = (date, time) => {
  if (!date) return '—';
  const d = new Date(`${date}T00:00:00`);
  if (Number.isNaN(d.getTime())) return '—';
  const s = d.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
  return time ? `${s} at ${time}` : s;
};
export const dotDate = (date) => { const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(date || ''); return m ? `${m[3]}.${m[2]}.${m[1]}` : '—'; };
export const nowStamp = () => new Date().toLocaleString('en-GB', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
export const SERVICE_LABELS = Object.freeze({ OB: 'Outbound (OB)', IB: 'Inbound (IB)' });