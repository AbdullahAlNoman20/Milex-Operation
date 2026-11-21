import { useState } from 'react';
import SectionCard from '../SectionCard';
import Chip from '../Chip';
import Field, { inp } from '../Field';
import { useOperationsAuth } from '../../hooks/useOperationsAuth';
import { useToast } from '../../../../../Components/hooks/useToast';
import { receiveAtHub } from '../../services/shipmentService';
import { effectiveAmount } from '../../services/rateService';
import { prepareFile } from '../../services/fileService';
import { PARCEL_CONDITION_OPTIONS } from '../../constants/shipmentFields';
import { OPERATIONS_ROLES as R } from '../../constants/operationsRoles';

const CHECKS = [
  ['pieces', 'Pieces counted and match the declared quantity'],
  ['weight', 'Parcel re-weighed and weight recorded'],
  ['packaging', 'Packaging / seal intact, no damage'],
  ['goods', 'Goods match the description'],
  ['invoice', 'Commercial Invoice checked against the goods'],
  ['product', 'Product / HS code checked'],
  ['rate', 'Rate checked against the onboarding rate card'],
];
const nowLocal = () => { const d = new Date(); const p = (x) => String(x).padStart(2, '0'); return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}`; };

const HubChecklistPanel = ({ shipment: s, onSaved }) => {
  const { currentUser } = useOperationsAuth();
  const { showToast } = useToast();
  const [f, setF] = useState({ receivedAt: nowLocal(), hub: 'Dhaka Hub', actualPieces: '', actualWeightKg: '', condition: 'GOOD', comments: '', correctiveAction: '' });
  const [checks, setChecks] = useState({});
  const [override, setOverride] = useState({ on: false, amount: '', reason: '' });
  const [evidence, setEvidence] = useState(null);
  const [busy, setBusy] = useState(false);
  if (s.mode !== 'EXPORT') return null;

  const hv = s.hubVerification;
  const canDo = currentUser.role === R.DOMESTIC_ADMIN && (s.statusCode === 'PICKED_UP' || (s.statusCode === 'RECEIVED_AT_ORIGIN_HUB' && hv?.result === 'FAIL'));
  if (!canDo && !hv) return null;

  const set = (k) => (e) => setF((p) => ({ ...p, [k]: e.target.value }));
  const allTicked = CHECKS.every(([k]) => checks[k]);
  const piecesDiff = f.actualPieces !== '' && Number(f.actualPieces) !== Number(s.parcel?.pieces);
  const willFail = piecesDiff || f.condition !== 'GOOD' || !allTicked;
  const rate = effectiveAmount(s.rate);

  const pickFile = async (e) => {
    const x = e.target.files?.[0]; e.target.value = '';
    if (!x) return;
    try { setEvidence(await prepareFile(x)); } catch (err) { showToast(err.message, 'warning'); }
  };

  const submit = async () => {
    setBusy(true);
    try {
      const pf = (v) => (v ? 'PASS' : 'FAIL');
      const payload = { ...f, evidence, goodsMatch: pf(checks.goods && checks.packaging), invoiceCheck: pf(checks.invoice), productCheck: pf(checks.product && checks.pieces && checks.weight && checks.rate) };
      if (override.on) { payload.rateOverrideAmount = override.amount; payload.rateOverrideReason = override.reason; }
      const res = await receiveAtHub(s.shipmentId, payload, currentUser);
      showToast(res?.hubVerification?.result === 'PASS' ? 'Hub verification passed' : 'Recorded as FAIL — exception raised');
      onSaved?.();
    } catch (e) { showToast(e?.message || 'Failed', 'error'); } finally { setBusy(false); }
  };

  return (
    <SectionCard title="Hub Verification" subtitle="Tick each item once verified, then record the hub receipt."
      actions={hv && <Chip tone={hv.result === 'PASS' ? 'green' : 'red'}>{hv.result}</Chip>}>
      {hv && <p className="text-xs text-slate-500 mb-3">Last result: {hv.result} · {hv.actualPieces} pcs{hv.actualWeightKg ? ` · ${hv.actualWeightKg} kg` : ''} · {hv.checker?.name} · {new Date(hv.at).toLocaleString()}{hv.comments ? ` — ${hv.comments}` : ''}</p>}
      {canDo && (
        <div className="space-y-4">
          {s.openDiscrepancy && <p className="text-xs bg-red-50 border border-red-200 text-red-700 rounded-lg p-2.5 font-semibold">Courier reported a discrepancy ({s.openDiscrepancy.type}: {s.openDiscrepancy.reason}). Accept or return the courier task in the Overview tab first.</p>}
          <p className="text-xs text-slate-500">Declared: <b>{s.parcel?.pieces} pcs · {s.parcel?.weightKg} kg</b>{s.pickupActuals ? ` · Courier counted ${s.pickupActuals.actualPieces} pcs (${s.pickupActuals.condition})` : ''}</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            <Field label="Received date-time" required><input type="datetime-local" disabled={busy} value={f.receivedAt} onChange={set('receivedAt')} className={inp} /></Field>
            <Field label="Hub"><input disabled={busy} value={f.hub} maxLength={100} onChange={set('hub')} className={inp} /></Field>
            <Field label="Actual pieces" required><input type="number" min="1" disabled={busy} value={f.actualPieces} onChange={set('actualPieces')} className={`${inp} ${piecesDiff ? 'border-red-400 bg-red-50' : ''}`} /></Field>
            <Field label="Actual weight (kg)"><input type="number" min="0" step="0.01" disabled={busy} value={f.actualWeightKg} onChange={set('actualWeightKg')} className={inp} /></Field>
            <Field label="Parcel condition" required><select disabled={busy} value={f.condition} onChange={set('condition')} className={inp}>{PARCEL_CONDITION_OPTIONS.map((c) => <option key={c}>{c}</option>)}</select></Field>
          </div>
          <div className="border border-slate-200 rounded-lg p-3">
            <p className="text-[10px] font-black text-slate-500 uppercase mb-2">Verification checklist</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {CHECKS.map(([k, label]) => (
                <label key={k} className="flex items-start gap-2 text-xs font-semibold text-slate-700 cursor-pointer">
                  <input type="checkbox" disabled={busy} checked={!!checks[k]} onChange={(e) => setChecks((p) => ({ ...p, [k]: e.target.checked }))} className="mt-0.5 accent-emerald-600 shrink-0" />{label}
                </label>))}
            </div>
          </div>
          {piecesDiff && <p className="text-xs text-red-600 font-semibold">Pieces differ from declared ({s.parcel?.pieces}) — a Short Received exception will be raised.</p>}
          <div className="bg-slate-50 border border-slate-200 rounded-lg p-3 space-y-2">
            <p className="text-xs font-bold text-slate-700">Rate: {rate !== null ? `${s.rate?.currency} ${rate} (${s.rate?.override ? 'manual override' : `onboarding rate card ${s.rate?.version}`})` : 'No rate on file'}</p>
            <label className="flex items-center gap-2 text-xs font-semibold text-slate-600"><input type="checkbox" checked={override.on} disabled={busy} onChange={(e) => setOverride((p) => ({ ...p, on: e.target.checked }))} className="accent-emerald-600" /> Override manually</label>
            {override.on && <div className="grid grid-cols-1 sm:grid-cols-2 gap-2"><input type="number" min="0" step="0.01" placeholder="New amount" value={override.amount} onChange={(e) => setOverride((p) => ({ ...p, amount: e.target.value }))} className={inp} /><input placeholder="Reason (required)" maxLength={300} value={override.reason} onChange={(e) => setOverride((p) => ({ ...p, reason: e.target.value }))} className={inp} /></div>}
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Field label="Comments"><input disabled={busy} value={f.comments} maxLength={500} onChange={set('comments')} className={inp} /></Field>
            <Field label={`Corrective action${willFail ? ' *' : ''}`}><input disabled={busy} value={f.correctiveAction} maxLength={300} onChange={set('correctiveAction')} className={`${inp} ${willFail ? 'border-red-300' : ''}`} /></Field>
          </div>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <label className="text-xs font-bold text-emerald-600 cursor-pointer hover:underline">{evidence ? `Attached: ${evidence.name}` : 'Attach photo / evidence (optional)'}<input type="file" accept=".pdf,.jpg,.jpeg,.png" className="hidden" onChange={pickFile} /></label>
            <button type="button" disabled={busy || !!s.openDiscrepancy} onClick={submit} className="text-xs font-bold bg-emerald-600 text-white px-5 py-2.5 rounded-lg hover:bg-emerald-700 disabled:opacity-50">{busy ? 'Saving...' : 'Record Hub Receipt & Verification'}</button>
          </div>
        </div>
      )}
    </SectionCard>
  );
};

export default HubChecklistPanel;