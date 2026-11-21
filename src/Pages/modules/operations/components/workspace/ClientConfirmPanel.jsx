// src/Pages/modules/operations/components/workspace/ClientConfirmPanel.jsx
import { useState } from 'react';
import SectionCard from '../SectionCard';
import Chip, { toneForStatus } from '../Chip';
import { useOperationsAuth } from '../../hooks/useOperationsAuth';
import { useToast } from '../../../../../Components/hooks/useToast';
import { clientConfirm, recordClientWaiver } from '../../services/shipmentService';
import { prepareFile } from '../../services/fileService';
import { OPERATIONS_ROLES as R } from '../../constants/operationsRoles';

const ClientConfirmPanel = ({ shipment: s, onChanged }) => {
  const { currentUser } = useOperationsAuth();
  const { showToast } = useToast();
  const [comment, setComment] = useState('');
  const [reason, setReason] = useState('');
  const [file, setFile] = useState(null);
  const [busy, setBusy] = useState(false);
  const cc = s.clientConfirmation || {};
  const role = currentUser.role;
  const open = ['PENDING', 'CORRECTION_REQUESTED'].includes(cc.status) && s.statusCode !== 'CLOSED';
  const canConfirm = role === R.CLIENT && cc.status === 'PENDING';
  const canWaive = role === R.DOMESTIC_ADMIN && open;

  const run = async (fn, okMsg) => {
    setBusy(true);
    try { await fn(); showToast(okMsg); setComment(''); setReason(''); setFile(null); onChanged?.(); } catch (e) { showToast(e?.message || 'Action failed', 'error'); } finally { setBusy(false); }
  };
  const pickFile = async (e) => {
    const f = e.target.files?.[0];
    e.target.value = '';
    if (!f) return;
    try { setFile(await prepareFile(f)); } catch (err) { showToast(err.message, 'warning'); }
  };

  if (!cc.status) return null;

  return (
    <SectionCard title="Client Commercial Confirmation" actions={<Chip tone={toneForStatus(cc.status)}>{(cc.status || 'PENDING').replace('_', ' ')}</Chip>}>
      <p className="text-xs text-slate-500 mb-2">
        {cc.status === 'CONFIRMED' && `Confirmed by ${cc.by} on ${new Date(cc.at).toLocaleString()}.`}
        {cc.status === 'WAIVED' && `Authorised waiver stored by ${cc.by}: ${cc.comment}`}
        {cc.status === 'PENDING' && (s.onBehalf ? 'This data was drafted by Operations on your instruction — please review and confirm.' : 'Waiting for confirmation.')}
        {cc.status === 'CORRECTION_REQUESTED' && `Correction requested: ${cc.comment}. Operations will update the data and ask again.`}
      </p>
      {canConfirm && (
        <div className="space-y-2">
          <textarea rows={2} value={comment} maxLength={500} onChange={(e) => setComment(e.target.value)} placeholder="Comment (required only if you request a correction)" className="w-full border border-slate-300 rounded-lg p-2 text-sm bg-slate-50 focus:border-emerald-500 outline-none" />
          <div className="flex gap-2">
            <button type="button" disabled={busy} onClick={() => run(() => clientConfirm(s.shipmentId, 'CONFIRMED', comment, currentUser), 'Confirmed')} className="text-xs font-bold bg-emerald-600 text-white px-4 py-2 rounded-lg hover:bg-emerald-700 transition disabled:opacity-50">Confirm Data</button>
            <button type="button" disabled={busy} onClick={() => run(() => clientConfirm(s.shipmentId, 'CORRECTION_REQUESTED', comment, currentUser), 'Correction requested')} className="text-xs font-bold bg-amber-50 text-amber-700 border border-amber-200 px-4 py-2 rounded-lg hover:bg-amber-100 transition disabled:opacity-50">Request Correction</button>
          </div>
        </div>
      )}
      {canWaive && (
        <details className="mt-3 border border-slate-200 rounded-lg p-3">
          <summary className="text-xs font-bold text-slate-600 cursor-pointer">Store an authorised Client e-mail instruction / waiver</summary>
          <div className="space-y-2 mt-3">
            <input value={reason} maxLength={300} onChange={(e) => setReason(e.target.value)} placeholder="Reason / reference of the Client's authorisation" className="w-full border border-slate-300 rounded-lg p-2 text-sm bg-slate-50 focus:border-emerald-500 outline-none" />
            <label className="block text-xs font-bold text-emerald-600 cursor-pointer">{file ? `Attached: ${file.name}` : 'Attach e-mail / approval file (PDF, JPG, PNG)'}
              <input type="file" accept=".pdf,.jpg,.jpeg,.png" className="hidden" onChange={pickFile} />
            </label>
            <button type="button" disabled={busy} onClick={() => run(() => recordClientWaiver(s.shipmentId, { reason, file }, currentUser), 'Waiver stored')} className="text-xs font-bold bg-slate-800 text-white px-4 py-2 rounded-lg hover:bg-slate-900 transition disabled:opacity-50">Store Waiver</button>
          </div>
        </details>
      )}
      {(cc.history || []).length > 0 && (
        <div className="mt-3 space-y-1">
          {cc.history.slice(-4).reverse().map((h, i) => <p key={i} className="text-[10px] text-slate-400">{new Date(h.at).toLocaleString()} · {h.status.replace('_', ' ')} · {h.by}{h.comment ? ` — ${h.comment}` : ''}</p>)}
        </div>
      )}
    </SectionCard>
  );
};

export default ClientConfirmPanel;