// src/Pages/modules/operations/components/Field.jsx
export const inp = 'w-full border border-slate-300 rounded-lg p-2 text-sm bg-slate-50 focus:border-emerald-500 outline-none disabled:opacity-60';
export const lbl = 'block text-[10px] font-bold text-slate-500 mb-1';

const Field = ({ label, required = false, children, className = '' }) => (
  <div className={className}>
    <label className={lbl}>{label}{required && <span className="text-red-500 ml-0.5">*</span>}</label>
    {children}
  </div>
);

export default Field;