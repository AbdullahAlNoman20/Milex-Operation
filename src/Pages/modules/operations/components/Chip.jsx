// src/Pages/modules/operations/components/Chip.jsx
const TONES = {
  green: 'bg-emerald-50 text-emerald-700', amber: 'bg-amber-50 text-amber-700', red: 'bg-red-50 text-red-600',
  blue: 'bg-blue-50 text-blue-700', slate: 'bg-slate-100 text-slate-600', purple: 'bg-purple-50 text-purple-700',
};

const Chip = ({ tone = 'slate', children, className = '' }) => (
  <span className={`text-[10px] font-bold px-2 py-1 rounded-full whitespace-nowrap ${TONES[tone] || TONES.slate} ${className}`}>{children}</span>
);

export const toneForStatus = (status) => ({
  APPROVED: 'green', CONFIRMED: 'green', VERIFIED: 'green', ACCEPTED: 'green', COMPLETED: 'green', WAIVED: 'blue',
  PENDING: 'amber', NEED_INFO: 'amber', RETURNED: 'amber', CORRECTION_REQUESTED: 'amber',
  REJECTED: 'red', FAILED: 'red', ON_HOLD: 'red',
}[status] || 'slate');

export default Chip;