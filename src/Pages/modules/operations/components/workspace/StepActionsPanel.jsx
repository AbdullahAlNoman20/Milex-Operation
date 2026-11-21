// src/Pages/modules/operations/components/workspace/StepActionsPanel.jsx
// Generic "record the next step" buttons + exception flags. Steps with their own forms are excluded here.
import { useState } from 'react';
import SectionCard from '../SectionCard';
import { useOperationsAuth } from '../../hooks/useOperationsAuth';
import { useLanguage } from '../../hooks/useLanguage';
import { useToast } from '../../../../../Components/hooks/useToast';
import { advanceShipment, setException } from '../../services/shipmentService';
import { getAllowedNextSteps, getExceptionsForMode, getExceptionLabel } from '../../constants/shipmentStatus';
import { OPERATIONS_ROLES as R } from '../../constants/operationsRoles';

const HANDLED_ELSEWHERE = new Set(['DRAFT', 'BOOKED', 'PICKUP_ASSIGNED', 'PICKED_UP', 'RECEIVED_AT_ORIGIN_HUB', 'BOOKING_CONFIRMED', 'PICKUP_ARRANGED', 'RECEIVED_AT_ORIGIN_WAREHOUSE',
  'DOCUMENTS_FORWARDED', 'SELF_CLEARED', 'RECEIVED_AT_BD_HUB', 'OUT_FOR_DELIVERY', 'DELIVERED', 'POD_UPDATED', 'CLOSED']);
const inp = 'w-full border border-slate-300 rounded-lg p-2 text-sm bg-slate-50 focus:border-emerald-500 outline-none disabled:opacity-60';

const StepActionsPanel = ({ shipment: s, onChanged }) => {
  const { currentUser } = useOperationsAuth();
  const { tStatus, tException } = useLanguage();
  const { showToast } = useToast();
  const role = currentUser.role;
  const [note, setNote] = useState('');
  const [excCode, setExcCode] = useState('');
  const [excNote, setExcNote] = useState('');
  const [busy, setBusy] = useState(false);

    const ORIGIN = ['PICKUP_ARRANGED', 'PICKED_UP', 'RECEIVED_AT_ORIGIN_WAREHOUSE', 'HANDED_OVER_TO_AIRLINE'];
  const steps = getAllowedNextSteps(role, s).filter((x) => !HANDLED_ELSEWHERE.has(x.code) && !(role === R.FOREIGN_ADMIN && ORIGIN.includes(x.code)));
  const canException = [R.DOMESTIC_ADMIN, R.OPERATIONS_HEAD, R.CNF, R.FOREIGN_ADMIN].includes(role) && s.statusCode !== 'CLOSED';
  if (steps.length === 0 && !canException) return null;

  const run = async (fn, msg) => {
    setBusy(true);
    try { await fn(); showToast(msg); setNote(''); setExcNote(''); setExcCode(''); onChanged?.(); } catch (e) { showToast(e?.message || 'Action failed', 'error'); } finally { setBusy(false); }
  };

  return (
    <SectionCard title="Record Progress">
      {steps.length > 0 && (
        <div className="space-y-2 mb-4">
          <input value={note} maxLength={300} onChange={(e) => setNote(e.target.value)} placeholder="Note / reference for this update (optional)" className={inp} />
          <div className="flex flex-wrap gap-2">
            {steps.map((st) => {
              const gateBlocked = st.gate && s.gates?.[st.gate]?.status !== 'APPROVED';
              return (
                <button key={st.code} type="button" disabled={busy || gateBlocked} title={gateBlocked ? 'Operations Head approval required first' : st.description}
                  onClick={() => run(() => advanceShipment(s.shipmentId, st.code, { note }, currentUser), `Updated: ${st.label}`)}
                  className="text-xs font-bold bg-emerald-600 text-white px-4 py-2 rounded-lg hover:bg-emerald-700 transition disabled:opacity-40">
                  {tStatus(st.code, st.label)}{st.optional ? ' (optional)' : ''}{gateBlocked ? ' 🔒' : ''}
                </button>
              );
            })}
          </div>
          <p className="text-[10px] text-slate-400">Each update is checked against the required approvals, documents and verified evidence.</p>
        </div>
      )}
      {canException && (
        <div className="border-t border-slate-100 pt-4">
          {s.exceptionCode ? (
            <div className="space-y-2">
              <p className="text-xs font-bold text-red-600">Open exception: {tException(s.exceptionCode, getExceptionLabel(s.exceptionCode))}</p>
              <input value={excNote} maxLength={300} onChange={(e) => setExcNote(e.target.value)} placeholder="Resolution note (required)" className={inp} />
              <button type="button" disabled={busy} onClick={() => run(() => setException(s.shipmentId, null, excNote, currentUser), 'Exception cleared')} className="text-xs font-bold bg-white border border-emerald-600 text-emerald-700 px-4 py-2 rounded-lg hover:bg-emerald-50 transition disabled:opacity-50">Resolve Exception</button>
            </div>
          ) : (
            <div className="space-y-2">
              <label className="block text-xs font-bold text-red-500">Flag exception / hold (optional)</label>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                <select value={excCode} disabled={busy} onChange={(e) => setExcCode(e.target.value)} className="border border-red-200 rounded-lg p-2 text-sm bg-red-50 focus:border-red-500 outline-none">
                  <option value="">Select...</option>{getExceptionsForMode(s.mode).map((x) => <option key={x.code} value={x.code}>{tException(x.code, x.label)}</option>)}
                </select>
                <input value={excNote} maxLength={300} onChange={(e) => setExcNote(e.target.value)} placeholder="Reason / details" className={inp} />
                <button type="button" disabled={busy || !excCode} onClick={() => run(() => setException(s.shipmentId, excCode, excNote, currentUser), 'Exception flagged')} className="text-xs font-bold bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 transition disabled:opacity-40">Flag</button>
              </div>
            </div>
          )}
        </div>
      )}
    </SectionCard>
  );
};

export default StepActionsPanel;