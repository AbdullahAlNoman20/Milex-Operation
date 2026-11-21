import { useState } from 'react';
import { Plane } from 'lucide-react';
import SectionCard from '../SectionCard';
import Field, { inp } from '../Field';
import { useOperationsAuth } from '../../hooks/useOperationsAuth';
import { useToast } from '../../../../../Components/hooks/useToast';
import { handoverToAirline } from '../../services/cnfHandoverService';
import { ROUTE_FIELDS } from '../../constants/shipmentFields';
import { getStatusIndex } from '../../constants/shipmentStatus';
import { OPERATIONS_ROLES as R } from '../../constants/operationsRoles';

const PRINCIPALS = ROUTE_FIELDS.find((f) => f.key === 'principal').options;

const HandoverPanel = ({ shipment: s, onChanged }) => {
  const { currentUser } = useOperationsAuth();
  const { showToast } = useToast();
  const [f, setF] = useState({ mawbNumber: s.mawb?.mawbNumber || '', airline: s.mawb?.airline || '', flightNo: s.mawb?.flightNo || '', flightDate: s.mawb?.flightDate || '', principal: s.tracking?.principal || s.route?.principal || '', trackingNumber: s.tracking?.trackingNumber || '', note: '' });
  const [busy, setBusy] = useState(false);
  if (currentUser.role !== R.CNF || s.mode !== 'EXPORT') return null;

  const idx = getStatusIndex('EXPORT', s.statusCode);
  const done = idx >= getStatusIndex('EXPORT', 'DEPARTED_ORIGIN');
  const ready = idx >= getStatusIndex('EXPORT', 'EXPORT_DOCUMENTATION') && s.gates?.GATE_2?.status === 'APPROVED';
  const set = (k) => (e) => setF((p) => ({ ...p, [k]: e.target.value }));

  const submit = async () => {
    setBusy(true);
    try { await handoverToAirline(s.shipmentId, f, currentUser); showToast('Handed over — tracking has started'); onChanged?.(); }
    catch (e) { showToast(e?.message || 'Failed', 'error'); } finally { setBusy(false); }
  };

  return (
    <SectionCard title="Airline Handover" subtitle="Fill these once. Customs, manifest, handover and departure are recorded together.">
      {done ? (
        <p className="flex items-center gap-2 text-sm font-bold text-emerald-700"><Plane size={16} /> Handed over. Tracking number {s.tracking?.trackingNumber} is being tracked automatically.</p>
      ) : !ready ? (
        <p className="text-xs bg-amber-50 border border-amber-200 text-amber-700 rounded-lg p-2.5 font-semibold">🔒 Waiting for the document pack to be approved by the Operations Head.</p>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          <Field label="MAWB number" required><input disabled={busy} value={f.mawbNumber} maxLength={20} placeholder="779-03420222" onChange={set('mawbNumber')} className={inp} /></Field>
          <Field label="Airline"><input disabled={busy} value={f.airline} maxLength={60} onChange={set('airline')} className={inp} /></Field>
          <Field label="Flight number" required><input disabled={busy} value={f.flightNo} maxLength={20} onChange={set('flightNo')} className={inp} /></Field>
          <Field label="Flight date"><input type="date" disabled={busy} value={f.flightDate} onChange={set('flightDate')} className={inp} /></Field>
          <Field label="Principal"><select disabled={busy} value={f.principal} onChange={set('principal')} className={inp}><option value="">Select…</option>{PRINCIPALS.map((p) => <option key={p}>{p}</option>)}</select></Field>
          <Field label="Principal tracking number" required><input disabled={busy} value={f.trackingNumber} maxLength={60} onChange={set('trackingNumber')} className={inp} /></Field>
          <Field label="Remark" className="sm:col-span-2 lg:col-span-3"><input disabled={busy} value={f.note} maxLength={300} onChange={set('note')} className={inp} /></Field>
          <div className="sm:col-span-2 lg:col-span-3"><button type="button" disabled={busy} onClick={submit} className="w-full sm:w-auto text-sm font-bold bg-emerald-600 text-white px-6 py-3 rounded-lg hover:bg-emerald-700 disabled:opacity-50">{busy ? 'Saving…' : 'Manifest & Hand Over to Airline'}</button></div>
        </div>
      )}
    </SectionCard>
  );
};

export default HandoverPanel;