import { ArrowRight, Hourglass } from 'lucide-react';
import { getWaitingForInfo, getAllowedNextSteps } from '../../constants/shipmentStatus';
import { useOperationsAuth } from '../../hooks/useOperationsAuth';
import { useLanguage } from '../../hooks/useLanguage';

const NextActionBanner = ({ shipment: s }) => {
  const { currentUser } = useOperationsAuth();
  const { tRole, tStatus } = useLanguage();
  const w = getWaitingForInfo(s);
  if (w.isComplete) return null;
  const mine = w.ownerRole === currentUser.role;
  const steps = getAllowedNextSteps(currentUser.role, s);
  const g1 = s.gates?.GATE_1;
  const remark = Object.values(s.gates || {}).map((g) => g.comment).filter(Boolean).slice(-1)[0];
  return (
    <div className={`rounded-xl border p-3 text-xs ${mine ? 'bg-amber-50 border-amber-300' : 'bg-slate-50 border-slate-200'}`}>
      <p className={`flex items-center gap-2 font-black ${mine ? 'text-amber-800' : 'text-slate-600'}`}><Hourglass size={14} />{mine ? 'Your turn' : `Waiting for: ${w.ownerRole ? tRole(w.ownerRole) : w.text}`}</p>
      {mine && steps.length > 0 && <p className="mt-1 text-slate-700 flex items-center gap-1"><ArrowRight size={12} /> Next: {steps.map((x) => tStatus(x.code, x.label)).join(' / ')}</p>}
      {s.statusCode === 'DRAFT' && s.mode === 'IMPORT' && g1?.status === 'APPROVED' && !s.assignedForeign && <p className="mt-1 text-red-600 font-bold">Approved, but no Foreign Supervisor is assigned yet.</p>}
      {remark && <p className="mt-1 text-slate-600">Last remark: “{remark}”</p>}
    </div>
  );
};

export default NextActionBanner;