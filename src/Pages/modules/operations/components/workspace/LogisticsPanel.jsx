// src/Pages/modules/operations/components/workspace/LogisticsPanel.jsx
// C&F assignment, MAWB record, principal tracking reference.
import { useEffect, useState } from 'react';
import SectionCard from '../SectionCard';
import { useOperationsAuth } from '../../hooks/useOperationsAuth';
import { useToast } from '../../../../../Components/hooks/useToast';
import { assignCnf } from '../../services/taskService';
import { recordMawb, setTrackingReference } from '../../services/shipmentService';
import { fetchUsersByRole } from '../../services/userDirectoryService';
import { ROUTE_FIELDS } from '../../constants/shipmentFields';
import { OPERATIONS_ROLES as R } from '../../constants/operationsRoles';

const inp = 'w-full border border-slate-300 rounded-lg p-2 text-sm bg-slate-50 focus:border-emerald-500 outline-none disabled:opacity-60';
const PRINCIPALS = ROUTE_FIELDS.find((f) => f.key === 'principal').options;
const MAWB_STATES = ['EXPORT_CUSTOMS_CLEARANCE', 'MANIFESTED', 'HANDED_OVER_TO_AIRLINE', 'DEPARTED_ORIGIN'];
const TRACK_STATES = ['HANDED_OVER_TO_AIRLINE', 'DEPARTED_ORIGIN'];

const LogisticsPanel = ({ shipment: s, onChanged }) => {
  const { currentUser } = useOperationsAuth();
  const { showToast } = useToast();
  const role = currentUser.role;
  const [cnfs, setCnfs] = useState([]);
  const [cnfEmail, setCnfEmail] = useState(s.assignedCnf?.email || '');
  const [mawb, setMawb] = useState({ mawbNumber: s.mawb?.mawbNumber || '', airline: s.mawb?.airline || '', flightNo: s.mawb?.flightNo || '', flightDate: s.mawb?.flightDate || '', chargeableWeight: s.mawb?.chargeableWeight || '', accountingInfo: s.mawb?.accountingInfo || 'FREIGHT PREPAID', handlingInfo: s.mawb?.handlingInfo || '', agentIata: s.mawb?.agentIata || '', currencyRate: s.mawb?.currencyRate || '' });
  const [track, setTrack] = useState({ principal: s.tracking?.principal || s.route?.principal || '', trackingNumber: s.tracking?.trackingNumber || '' });
  const [busy, setBusy] = useState(false);

  useEffect(() => { if (role === R.DOMESTIC_ADMIN) fetchUsersByRole(R.CNF).then(setCnfs).catch(() => {}); }, [role]);

  const run = async (fn, msg) => {
    setBusy(true);
    try { await fn(); showToast(msg); onChanged?.(); } catch (e) { showToast(e?.message || 'Action failed', 'error'); } finally { setBusy(false); }
  };

  const showCnf = false;
  const showMawb = [R.DOMESTIC_ADMIN, R.CNF].includes(role) && s.mode === 'EXPORT' && MAWB_STATES.includes(s.statusCode);
  const showTrack = [R.DOMESTIC_ADMIN, R.CNF].includes(role) && s.mode === 'EXPORT' && TRACK_STATES.includes(s.statusCode);
  if (!showCnf && !showMawb && !showTrack) return null;
  const m = (k) => (e) => setMawb((p) => ({ ...p, [k]: e.target.value }));

  return (
    <SectionCard title="Logistics Partners & References">
      <div className="space-y-5">
        {showCnf && (
          <div className="flex flex-wrap items-end gap-2">
            <div className="flex-1 min-w-[220px]"><label className="block text-[10px] font-bold text-slate-500 mb-1">C&F / Authorised Partner {s.assignedCnf ? `(current: ${s.assignedCnf.name})` : ''}</label>
              <select value={cnfEmail} disabled={busy} onChange={(e) => setCnfEmail(e.target.value)} className={inp}><option value="">Select...</option>{cnfs.map((c) => <option key={c.email} value={c.email}>{c.name}</option>)}</select></div>
            <button type="button" disabled={busy || !cnfEmail} onClick={() => run(() => assignCnf(s.shipmentId, cnfEmail, currentUser), 'C&F assigned')} className="text-xs font-bold bg-slate-800 text-white px-4 py-2.5 rounded-lg hover:bg-slate-900 transition disabled:opacity-50">Assign</button>
          </div>
        )}
        {showMawb && (
          <div>
            <p className="text-xs font-black text-slate-600 uppercase mb-2">MAWB Record (airline-specific layout is confirmed by the airline / C&F)</p>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div><label className="block text-[10px] font-bold text-slate-500 mb-1">MAWB No. *</label><input disabled={busy} value={mawb.mawbNumber} maxLength={20} placeholder="779-03420222" onChange={m('mawbNumber')} className={inp} /></div>
              <div><label className="block text-[10px] font-bold text-slate-500 mb-1">Airline</label><input disabled={busy} value={mawb.airline} maxLength={60} onChange={m('airline')} className={inp} /></div>
              <div><label className="block text-[10px] font-bold text-slate-500 mb-1">Flight No. *</label><input disabled={busy} value={mawb.flightNo} maxLength={20} onChange={m('flightNo')} className={inp} /></div>
              <div><label className="block text-[10px] font-bold text-slate-500 mb-1">Flight date</label><input type="date" disabled={busy} value={mawb.flightDate} onChange={m('flightDate')} className={inp} /></div>
              <div><label className="block text-[10px] font-bold text-slate-500 mb-1">Chargeable weight (kg)</label><input type="number" min="0" step="0.01" disabled={busy} value={mawb.chargeableWeight} onChange={m('chargeableWeight')} className={inp} /></div>
              <div><label className="block text-[10px] font-bold text-slate-500 mb-1">Agent IATA code</label><input disabled={busy} value={mawb.agentIata} maxLength={20} onChange={m('agentIata')} className={inp} /></div>
              <div><label className="block text-[10px] font-bold text-slate-500 mb-1">Accounting information</label><input disabled={busy} value={mawb.accountingInfo} maxLength={100} onChange={m('accountingInfo')} className={inp} /></div>
              <div><label className="block text-[10px] font-bold text-slate-500 mb-1">Handling information</label><input disabled={busy} value={mawb.handlingInfo} maxLength={150} onChange={m('handlingInfo')} className={inp} /></div>
              <div><label className="block text-[10px] font-bold text-slate-500 mb-1">Currency rate (e.g. 1 USD = BDT)</label><input disabled={busy} value={mawb.currencyRate} maxLength={30} onChange={m('currencyRate')} className={inp} /></div>
            </div>
            <button type="button" disabled={busy} onClick={() => run(() => recordMawb(s.shipmentId, mawb, currentUser), 'MAWB saved')} className="mt-3 text-xs font-bold bg-emerald-600 text-white px-4 py-2 rounded-lg hover:bg-emerald-700 transition disabled:opacity-50">Save MAWB</button>
          </div>
        )}
        {showTrack && (
          <div>
            <p className="text-xs font-black text-slate-600 uppercase mb-2">Principal Tracking Reference (starts API tracking)</p>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 items-end">
              <div><label className="block text-[10px] font-bold text-slate-500 mb-1">Principal</label><select disabled={busy} value={track.principal} onChange={(e) => setTrack((p) => ({ ...p, principal: e.target.value }))} className={inp}><option value="">Select...</option>{PRINCIPALS.map((p) => <option key={p} value={p}>{p}</option>)}</select></div>
              <div><label className="block text-[10px] font-bold text-slate-500 mb-1">Tracking number *</label><input disabled={busy} value={track.trackingNumber} maxLength={60} onChange={(e) => setTrack((p) => ({ ...p, trackingNumber: e.target.value }))} className={inp} /></div>
              <button type="button" disabled={busy || !track.trackingNumber} onClick={() => run(() => setTrackingReference(s.shipmentId, track, currentUser), 'Tracking reference saved')} className="text-xs font-bold bg-slate-800 text-white px-4 py-2.5 rounded-lg hover:bg-slate-900 transition disabled:opacity-50">Save Reference</button>
            </div>
          </div>
        )}
      </div>
    </SectionCard>
  );
};

export default LogisticsPanel;