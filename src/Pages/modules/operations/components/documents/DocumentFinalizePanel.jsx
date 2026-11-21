// ===== 7) NEW FILE: src/Pages/modules/operations/components/documents/DocumentFinalizePanel.jsx =====
import { useState } from 'react';
import SectionCard from '../SectionCard';
import Chip, { toneForStatus } from '../Chip';
import { useOperationsAuth } from '../../hooks/useOperationsAuth';
import { useToast } from '../../../../../Components/hooks/useToast';
import { setDocumentStatus, sendDocumentsToClient } from '../../services/documentService';
import { addMessage } from '../../services/shipmentService';
import { DOC_TYPE_LABELS } from '../../constants/shipmentFields';
import { OPERATIONS_ROLES as R } from '../../constants/operationsRoles';
import { getDocStatus } from '../../utils/docCompleteness';

const DONE = ['FINAL', 'FORWARDED'];

const DocumentFinalizePanel = ({ shipment: s, docs, onSaved }) => {
  const { currentUser } = useOperationsAuth();
  const { showToast } = useToast();
  const [busy, setBusy] = useState(false);
  const list = Object.values(docs || {});
  if (![R.DOMESTIC_ADMIN, R.OPERATIONS_HEAD, R.FOREIGN_ADMIN].includes(currentUser.role) || list.length === 0) return null;

  const pending = list.filter((d) => !DONE.includes(d.status));
  const ready = list.filter((d) => DONE.includes(d.status));

  const run = async (fn, msg) => {
    setBusy(true);
    try { await fn(); showToast(msg); onSaved?.(); } catch (e) { showToast(e?.message || 'Action failed', 'error'); } finally { setBusy(false); }
  };

  const finalizeAll = () => run(async () => { for (const d of pending) await setDocumentStatus(d.id, 'FINAL', currentUser, 'Finalised'); }, 'Documents finalised');
  const send = () => run(async () => {
    const n = await sendDocumentsToClient(s.shipmentId, currentUser);
    try { await addMessage(s.shipmentId, `${n} document(s) are final and ready for you — open the Documents tab.`, currentUser); } catch { /* message is optional */ }
  }, 'Documents sent to Client');

  return (
    <SectionCard title="Finalise & Send to Client" subtitle="Finalise each document, then send the final set to the Client.">
      <div className="space-y-2 mb-3">
        {list.map((d) => (
          <div key={d.id} className="flex flex-wrap items-center justify-between gap-2 border border-slate-100 rounded-lg p-2.5">
            <p className="text-xs font-bold text-slate-700">{DOC_TYPE_LABELS[d.type] || d.type} <span className="font-normal text-slate-400">v{d.version}</span></p>
            <div className="flex items-center gap-2">
              {d.sentToClient && <Chip tone="blue">Sent to Client</Chip>}
              <Chip tone={DONE.includes(d.status) ? 'green' : toneForStatus(d.status)}>{d.status.replace('_', ' ')}</Chip>
              {!DONE.includes(d.status) && <button type="button" disabled={busy} onClick={() => run(() => setDocumentStatus(d.id, 'FINAL', currentUser, 'Finalised'), 'Document finalised')} className="text-[11px] font-bold text-emerald-600 hover:underline disabled:opacity-50">Finalise</button>}
            </div>
          </div>
        ))}
      </div>
      <div className="flex flex-wrap gap-2">
        <button type="button" disabled={busy || pending.length === 0} onClick={finalizeAll} className="text-xs font-bold bg-slate-800 text-white px-4 py-2 rounded-lg hover:bg-slate-900 transition disabled:opacity-40">Finalise All ({pending.length})</button>
        <button type="button" disabled={busy || ready.length === 0} onClick={send} className="text-xs font-bold bg-emerald-600 text-white px-4 py-2 rounded-lg hover:bg-emerald-700 transition disabled:opacity-40">Send to Client ({ready.length})</button>
      </div>
    </SectionCard>
  );
};

export default DocumentFinalizePanel;