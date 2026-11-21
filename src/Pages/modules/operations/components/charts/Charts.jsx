// src/Pages/modules/operations/components/charts/Charts.jsx
// Dependency-free SVG charts.
const PALETTE = ['#059669', '#2563eb', '#f59e0b', '#7c3aed', '#dc2626', '#0891b2', '#64748b'];

export const Donut = ({ data, size = 150, center }) => {
  const total = data.reduce((t, d) => t + d.value, 0);
  const r = 52, c = 2 * Math.PI * r;
  let offset = 0;
  return (
    <div className="flex flex-wrap items-center gap-4">
      <svg width={size} height={size} viewBox="0 0 140 140" role="img" aria-label="Chart">
        <circle cx="70" cy="70" r={r} fill="none" stroke="#e2e8f0" strokeWidth="18" />
        {total > 0 && data.map((d, i) => {
          const len = (d.value / total) * c;
          const el = <circle key={d.label} cx="70" cy="70" r={r} fill="none" stroke={d.color || PALETTE[i % PALETTE.length]} strokeWidth="18" strokeDasharray={`${len} ${c - len}`} strokeDashoffset={-offset} transform="rotate(-90 70 70)" />;
          offset += len;
          return el;
        })}
        <text x="70" y="68" textAnchor="middle" className="fill-slate-800" style={{ font: '900 24px sans-serif' }}>{center ?? total}</text>
        <text x="70" y="86" textAnchor="middle" className="fill-slate-400" style={{ font: '700 9px sans-serif' }}>TOTAL</text>
      </svg>
      <ul className="space-y-1 text-xs min-w-[120px]">
        {data.map((d, i) => <li key={d.label} className="flex items-center gap-2"><span className="w-2.5 h-2.5 rounded-sm shrink-0" style={{ background: d.color || PALETTE[i % PALETTE.length] }} /><span className="text-slate-600 flex-1">{d.label}</span><b className="text-slate-800">{d.value}</b></li>)}
      </ul>
    </div>
  );
};

export const Bars = ({ data, height = 120 }) => {
  const max = Math.max(1, ...data.map((d) => d.value));
  return (
    <div className="flex items-end gap-2" style={{ height }} role="img" aria-label="Bar chart">
      {data.map((d, i) => (
        <div key={d.label} className="flex-1 flex flex-col items-center justify-end h-full min-w-0">
          <span className="text-[10px] font-bold text-slate-600 mb-1">{d.value}</span>
          <div className="w-full rounded-t-md" style={{ height: `${Math.max((d.value / max) * 100, d.value ? 6 : 2)}%`, background: d.color || PALETTE[i % PALETTE.length] }} />
          <span className="text-[9px] text-slate-400 mt-1 truncate max-w-full">{d.label}</span>
        </div>))}
    </div>
  );
};