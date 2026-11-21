// src/Pages/modules/operations/components/workspace/EvidenceForm.jsx
import { useState } from 'react';
import SectionCard from '../SectionCard';
import { useOperationsAuth } from '../../hooks/useOperationsAuth';
import { useToast } from '../../../../../Components/hooks/useToast';
import { addEvidence } from '../../services/evidenceService';
import { prepareFile } from '../../services/fileService';
import { EVIDENCE_TYPES, EVIDENCE_RESULTS } from '../../constants/shipmentFields';
import { OPERATIONS_ROLES as R } from '../../constants/operationsRoles';

export const evidenceTypesFor = (role, mode) => {
  if (role === R.CNF) return mode === 'EXPORT' ? ['EXPORT_BE', 'EXPORT_CUSTOMS_CLEARANCE', 'MANIFEST_EGM', 'SECURITY_ACCEPTANCE', 'HANDOVER'] : ['IMPORT_CUSTOMS_PROCESSING', 'IMPORT_CUSTOMS_RELEASE'];
  if (role === R.FOREIGN_ADMIN) return ['ORIGIN_EXPORT_CLEARANCE', 'SECURITY_ACCEPTANCE', 'HANDOVER'];
  if ([R.DOMESTIC_ADMIN, R.OPERATIONS_HEAD].includes(role)) return Object.keys(EVIDENCE_TYPES);
  return [];
};

const inp = 'w-full border border-slate-300 rounded-lg p-2 text-sm bg-slate-50 focus:border-emerald-500 outline-none disabled:opacity-60';
const blank = { eventType: '', authority: '', reference: '', eventAt: '', timezone: 'Asia/Dhaka', location: '', result: 'SUBMITTED', holdReason: '', dutyAmount: '', dutyCurrency: 'BDT', dutyPayer: '', dutyStatus: '', file: null };

const EvidenceForm = ({ shipment: s, onSaved }) => {
  const { currentUser } = useOperationsAuth();
  const { showToast } = useToast();
  const types = evidenceTypesFor(currentUser.role, s.mode);
  const [f, setF] = useState({ ...blank, eventType: types[0] || '' });
  const [busy, setBusy] = useState(false);
  const set = (k) => (e) => setF((p) => ({ ...p, [k]: e.target.value }));
  if (types.length === 0 || s.statusCode === 'CLOSED') return null;

  const pickFile = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    try { setF((p) => ({ ...p, file: null })); setF((p) => ({ ...p, file: null })); const meta = await prepareFile(file); setF((p) => ({ ...p, file: meta })); } catch (err) { showToast(err.message, 'warning'); }
  };

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    try {
      await addEvidence({
        shipmentId: s.shipmentId, eventType: f.eventType, authority: f.authority, reference: f.reference, eventAt: f.eventAt, timezone: f.timezone, location: f.location,
        result: f.result, holdReason: f.holdReason, file: f.file,
        duty: f.dutyAmount ? { amount: f.dutyAmount, currency: f.dutyCurrency, payer: f.dutyPayer, status: f.dutyStatus } : null,
      }, currentUser);
      showToast('Evidence recorded — awaiting verification');
      setF({ ...blank, eventType: types[0] });
      onSaved?.();
    } catch (err) { showToast(err?.message || 'Failed to record evidence', 'error'); } finally { setBusy(false); }
  };

  return (
    <SectionCard title="Record Customs / Airline Evidence" subtitle="A hold or examination is never treated as released. Only accepted + verified evidence unlocks later steps.">
      <form onSubmit={submit} className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div><label className="block text-[10px] font-bold text-slate-500 mb-1">Event type *</label>
          <select disabled={busy} value={f.eventType} onChange={set('eventType')} className={inp}>{types.map((k) => <option key={k} value={k}>{EVIDENCE_TYPES[k]}</option>)}</select></div>
        <div><label className="block text-[10px] font-bold text-slate-500 mb-1">Result *</label>
          <select disabled={busy} value={f.result} onChange={set('result')} className={inp}>{EVIDENCE_RESULTS.map((r) => <option key={r} value={r}>{r.replace('_', ' ')}</option>)}</select></div>
        <div><label className="block text-[10px] font-bold text-slate-500 mb-1">Authority / airline / handler</label><input disabled={busy} value={f.authority} maxLength={150} onChange={set('authority')} className={inp} /></div>
        <div><label className="block text-[10px] font-bold text-slate-500 mb-1">Reference no. (B/E, EGM, receipt…)</label><input disabled={busy} value={f.reference} maxLength={100} onChange={set('reference')} className={inp} /></div>
        <div><label className="block text-[10px] font-bold text-slate-500 mb-1">Event date-time *</label><input type="datetime-local" disabled={busy} value={f.eventAt} onChange={set('eventAt')} className={inp} /></div>
        <div><label className="block text-[10px] font-bold text-slate-500 mb-1">Location</label><input disabled={busy} value={f.location} maxLength={150} onChange={set('location')} className={inp} /></div>
        {f.result === 'ON_HOLD' && <div className="sm:col-span-2"><label className="block text-[10px] font-bold text-red-500 mb-1">Hold / examination reason *</label><input disabled={busy} value={f.holdReason} maxLength={300} onChange={set('holdReason')} className={inp} /></div>}
        {f.eventType.startsWith('IMPORT_') && (
          <>
            <div><label className="block text-[10px] font-bold text-slate-500 mb-1">Duty / tax amount (only if stated)</label><input type="number" min="0" step="0.01" disabled={busy} value={f.dutyAmount} onChange={set('dutyAmount')} className={inp} /></div>
            <div><label className="block text-[10px] font-bold text-slate-500 mb-1">Payer / status</label><input disabled={busy} value={f.dutyPayer} maxLength={100} onChange={set('dutyPayer')} className={inp} /></div>
          </>
        )}
        <div className="sm:col-span-2 flex flex-wrap items-center justify-between gap-3">
          <label className="text-xs font-bold text-emerald-600 cursor-pointer">{f.file ? `Attached: ${f.file.name}` : 'Upload signed / stamped file (PDF, JPG, PNG — max 2MB)'}<input type="file" accept=".pdf,.jpg,.jpeg,.png" className="hidden" onChange={pickFile} /></label>
          <button type="submit" disabled={busy} className="text-xs font-bold bg-emerald-600 text-white px-5 py-2.5 rounded-lg hover:bg-emerald-700 transition disabled:opacity-50">{busy ? 'Saving...' : 'Record Evidence'}</button>
        </div>
      </form>
    </SectionCard>
  );
};

export default EvidenceForm;