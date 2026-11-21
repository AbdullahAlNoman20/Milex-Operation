// src/Pages/modules/operations/components/print/PrintStates.jsx
import Loader from '../../../../../Components/Shared/Loader';

export const PrintLoading = ({ label = 'Loading document...' }) => (
  <div className="min-h-screen flex items-center justify-center"><Loader label={label} /></div>
);

export const PrintMessage = ({ children, tone = 'red' }) => (
  <p className={`text-sm font-semibold ${tone === 'red' ? 'text-red-600' : 'text-slate-500'}`}>{children}</p>
);

export const DocFooter = ({ doc, extra }) => (
  <p className="mt-6 pt-2 border-t border-slate-200 text-[9px] text-slate-400 flex flex-wrap justify-between gap-2">
    <span>{doc ? `Version ${doc.version} · ${doc.status.replace('_', ' ')} · prepared by ${doc.createdBy}` : extra}</span>
    <span>Generated {new Date().toLocaleString('en-GB')}</span>
  </p>
);

export const Watermark = ({ text }) => (text ? (
  <div aria-hidden="true" className="pointer-events-none absolute inset-0 flex items-center justify-center overflow-hidden">
    <span className="text-7xl sm:text-8xl font-black text-slate-200 -rotate-[25deg] select-none tracking-widest">{text}</span>
  </div>
) : null);

export const Check = ({ label, checked }) => (
  <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-slate-700 mr-4">
    <span className={`w-3.5 h-3.5 border border-slate-700 inline-flex items-center justify-center shrink-0 ${checked ? 'bg-slate-800 print:[-webkit-print-color-adjust:exact] print:[print-color-adjust:exact]' : ''}`}>
      {checked && <span className="text-white text-[9px] leading-none">✓</span>}
    </span>
    {label}
  </span>
);

export const BarHead = ({ children }) => (
  <p className="bg-slate-800 text-white text-[10px] font-bold px-2 py-1 uppercase tracking-wide print:[-webkit-print-color-adjust:exact] print:[print-color-adjust:exact]">{children}</p>
);