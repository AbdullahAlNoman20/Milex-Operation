// src/Pages/modules/operations/components/workspace/GatePanel.jsx
import { useEffect, useState } from 'react';
import SectionCard from '../SectionCard';
import Chip, { toneForStatus } from '../Chip';
import { useOperationsAuth } from '../../hooks/useOperationsAuth';
import { useToast } from '../../../../../Components/hooks/useToast';
import { requestApproval, submitDraft, buildApprovalChecklist, forwardImportToForeign, returnImportToClient } from '../../services/approvalService';
import { GATES } from '../../constants/shipmentStatus';
import { fetchUsersByRole } from '../../services/userDirectoryService';
import { OPERATIONS_ROLES as R } from '../../constants/operationsRoles';

const GATE_AT = { EXPORT: { EXPORT_DOCUMENTATION: 'GATE_2' }, IMPORT: { CUSTOMS_RELEASED: 'GATE_RELEASE' } };

const GatePanel = ({ shipment: s, onChanged }) => {
  const { currentUser } = useOperationsAuth();
  const { showToast } = useToast();
  const role = currentUser.role;
  const [checklist, setChecklist] = useState(null);
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);
  const [returnNote, setReturnNote] = useState('');
  const [foreignPick, setForeignPick] = useState('');
  const [foreigns, setForeigns] = useState([]);
  useEffect(() => { fetchUsersByRole(R.FOREIGN_ADMIN).then(setForeigns).catch(() => setForeigns([])); }, []);
  const gate = GATE_AT[s.mode]?.[s.statusCode] || null;
  const state = gate ? s.gates?.[gate] : null;
  const ccOk = ['CONFIRMED', 'WAIVED'].includes(s.clientConfirmation?.status);

  useEffect(() => {
    let alive = true;
    if (gate && (role === R.DOMESTIC_ADMIN || role === R.FOREIGN_ADMIN)) buildApprovalChecklist(s, gate).then((c) => alive && setChecklist(c)).catch(() => {});
    else setChecklist(null);
    return () => { alive = false; };
  }, [gate, role, s]);

  const checkPending = s.mode === 'IMPORT' && s.statusCode === 'DRAFT' && s.supervisorCheck?.status === 'PENDING' && s.gates?.GATE_1?.status !== 'PENDING';
  const canCheck = checkPending && role === R.DOMESTIC_ADMIN;
  const alreadyWithStaff = s.mode === 'IMPORT' && (checkPending || s.gates?.GATE_1?.status === 'PENDING');
  const canSubmit = s.statusCode === 'DRAFT' && [R.CLIENT, R.DOMESTIC_ADMIN].includes(role) && !alreadyWithStaff;
  const canRequest = gate && (role === R.DOMESTIC_ADMIN || (role === R.FOREIGN_ADMIN && s.mode === 'IMPORT' && gate === 'GATE_2')) && state?.status !== 'PENDING' && !(state?.status === 'APPROVED' && gate !== 'GATE_2');

  const run = async (fn, msg) => {
    setBusy(true);
    try { await fn(); showToast(msg); setNote(''); onChanged?.(); } catch (e) { showToast(e?.message || 'Action failed', 'error'); } finally { setBusy(false); }
  };

  const entries = Object.entries(s.gates || {});
  if (!canSubmit && !canRequest && !canCheck && !checkPending && entries.length === 0) return null;

  return (
    <SectionCard title="Approvals & Submission">
      {canSubmit && (
        <div className="mb-4 space-y-2">
          <p className="text-xs text-slate-500">{s.mode === 'EXPORT' ? 'Submitting books the shipment. The Operations Supervisor then assigns a Courier Man directly — Operations Head approval is not needed for pickup.' : role === R.CLIENT ? 'Submitting sends the import request to the Operations Supervisor. The Supervisor checks everything and sends it to the Foreign Supervisor.' : 'Submitting sends this import request to the Foreign Supervisor.'}</p>
          {s.mode === 'IMPORT' && !ccOk && <p className="text-xs bg-amber-50 border border-amber-200 text-amber-700 rounded-lg p-2 font-semibold">The Client must confirm the commercial data first.</p>}
          <button type="button" disabled={busy || (s.mode === 'IMPORT' && !ccOk)} onClick={() => run(() => submitDraft(s.shipmentId, currentUser), 'Submitted')} className="text-xs font-bold bg-emerald-600 text-white px-4 py-2 rounded-lg hover:bg-emerald-700 transition disabled:opacity-50">{busy ? 'Submitting...' : s.mode === 'EXPORT' ? 'Submit Booking' : role === R.CLIENT ? 'Submit to Operations Supervisor' : 'Send to Foreign Supervisor'}</button>
        </div>
      )}

      {checkPending && !canCheck && (
        <p className="mb-4 text-xs bg-sky-50 border border-sky-200 text-sky-800 rounded-lg p-2.5 font-semibold">Your import request is with the Operations Supervisor for checking. After the check it goes straight to the Foreign Supervisor.</p>
      )}
      {canCheck && (
        <div className="mb-4 space-y-2 border border-sky-200 bg-sky-50/60 rounded-xl p-3">
          <p className="text-xs font-black text-sky-800 uppercase tracking-wide">Supervisor check — Import request</p>
          <p className="text-xs text-slate-600">Check the route, parties, weight and documents. If everything is correct, send it straight to the Foreign Supervisor — the Operations Head is only informed. If something is wrong, return it to the Client with a clear note.</p>
          <input value={note} maxLength={300} onChange={(e) => setNote(e.target.value)} placeholder="Note for the Foreign Supervisor (optional)" className="w-full border border-slate-300 rounded-lg p-2 text-sm bg-white focus:border-emerald-500 outline-none" />
          {foreigns.length > 1 && (<select value={foreignPick} onChange={(e) => setForeignPick(e.target.value)} className="w-full border border-slate-300 rounded-lg p-2 text-sm bg-white"><option value="">Select Foreign Supervisor…</option>{foreigns.map((u) => <option key={u.email} value={u.email}>{u.name}</option>)}</select>)}
          <button type="button" disabled={busy || !ccOk || (foreigns.length > 1 && !foreignPick)} onClick={() => run(() => forwardImportToForeign(s.shipmentId, { note, foreignEmail: foreignPick }, currentUser), 'Sent to the Foreign Supervisor')} className="text-xs font-bold bg-emerald-600 text-white px-4 py-2 rounded-lg hover:bg-emerald-700 transition disabled:opacity-50">Checked — Send to Foreign Supervisor</button>
          {!ccOk && <p className="text-[11px] text-amber-700 font-semibold">The Client must confirm the commercial data (or a waiver must be stored) first.</p>}
          <div className="pt-2 border-t border-sky-200 space-y-2">
            <input value={returnNote} maxLength={500} onChange={(e) => setReturnNote(e.target.value)} placeholder="What should the Client correct?" className="w-full border border-slate-300 rounded-lg p-2 text-sm bg-white focus:border-red-400 outline-none" />
            <button type="button" disabled={busy || !returnNote.trim()} onClick={() => run(() => returnImportToClient(s.shipmentId, { comment: returnNote }, currentUser), 'Returned to Client').then(() => setReturnNote(''))} className="text-xs font-bold bg-white border border-red-300 text-red-600 px-4 py-2 rounded-lg hover:bg-red-50 transition disabled:opacity-50">Return to Client</button>
          </div>
        </div>
      )}

      {canRequest && (
        <div className="mb-4 space-y-2">
          <p className="text-xs font-bold text-slate-700">{GATES[gate].label}</p>
          {checklist && (
            <ul className="space-y-1">
              {checklist.items.map((i) => (
                <li key={i.label} className={`text-xs flex gap-2 ${i.ok ? 'text-emerald-700' : i.required ? 'text-red-600' : 'text-slate-400'}`}>
                  <span>{i.ok ? '✓' : i.required ? '✗' : '○'}</span><span>{i.label}{i.detail ? ` — ${i.detail}` : ''}</span>
                </li>
              ))}
            </ul>
          )}
          <input value={note} maxLength={300} onChange={(e) => setNote(e.target.value)} placeholder="Note for the Foreign Supervisor (optional)" className="w-full border border-slate-300 rounded-lg p-2 text-sm bg-slate-50 focus:border-emerald-500 outline-none" />
          <button type="button" disabled={busy || (checklist && checklist.blockers.length > 0)} onClick={() => run(() => requestApproval(s.shipmentId, gate, currentUser, { note }), 'Approval requested')} className="text-xs font-bold bg-slate-800 text-white px-4 py-2 rounded-lg hover:bg-slate-900 transition disabled:opacity-50">{state?.status === 'APPROVED' ? 'Request Approval Again (documents changed)' : 'Request Head Approval'}</button>
        </div>
      )}

      {entries.length > 0 && (
        <div className="space-y-2">
          {entries.map(([code, g]) => (
            <div key={code} className="flex flex-wrap items-center justify-between gap-2 border border-slate-100 rounded-lg p-2.5">
              <div>
                <p className="text-xs font-bold text-slate-700">{GATES[code]?.label || code}</p>
                <p className="text-[10px] text-slate-400">{g.decidedAt ? `${g.decidedBy} · ${new Date(g.decidedAt).toLocaleString()}` : `Requested ${new Date(g.requestedAt).toLocaleString()}`}{g.comment ? ` — ${g.comment}` : ''}</p>
              </div>
              <Chip tone={toneForStatus(g.status)}>{g.status.replace('_', ' ')}</Chip>
            </div>
          ))}
        </div>
      )}
    </SectionCard>
  );
};

export default GatePanel;