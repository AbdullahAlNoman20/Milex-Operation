import { Check } from 'lucide-react';
import SectionCard from '../SectionCard';

const WorkflowGuide = ({ shipment: s }) => {
  const g = (k) => s.gates?.[k]?.status;
  const steps = [
    ['Create all documents', s.statusCode !== 'DRAFT'],
    ['Courier Man assigned (no Head approval needed)', !!s.assignedCourier],
    ['Parcel collected + Hub checklist', s.hubVerification?.result === 'PASS'],
    ['Documents final + Head approval before C&F handover', g('GATE_2') === 'APPROVED'],
    ['C&F assigned and pack forwarded', !!s.assignedCnf],
  ];
  const current = steps.findIndex(([, ok]) => !ok);
  return (
    <SectionCard title="Your Steps">
      <ol className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
        {steps.map(([label, ok], i) => (
          <li key={label} className={`flex items-center gap-2 rounded-lg border p-2.5 text-xs font-bold ${ok ? 'border-emerald-200 bg-emerald-50 text-emerald-700' : i === current ? 'border-amber-300 bg-amber-50 text-amber-800' : 'border-slate-100 text-slate-400'}`}>
            <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] shrink-0 ${ok ? 'bg-emerald-500 text-white' : 'bg-slate-200 text-slate-600'}`}>{ok ? <Check size={11} /> : i + 1}</span>{label}
          </li>))}
      </ol>
    </SectionCard>
  );
};

export default WorkflowGuide;