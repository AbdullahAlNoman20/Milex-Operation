// src/Pages/modules/operations/components/documents/ForwardPackPanel.jsx
// Export: forward the approved document pack to the assigned C&F / other departments.
import { useState } from 'react';
import SectionCard from '../SectionCard';
import Field, { inp } from '../Field';
import { useOperationsAuth } from '../../hooks/useOperationsAuth';
import { useToast } from '../../../../../Components/hooks/useToast';
import { forwardDocuments } from '../../services/documentService';

const ForwardPackPanel = ({ shipment: s, docs, onSaved }) => {
  const { currentUser } = useOperationsAuth();
  const { showToast } = useToast();
  const [f, setF] = useState({ recipient: s.assignedCnf?.name || '', department: 'C&F', method: 'SYSTEM', reference: '' });
  const [busy, setBusy] = useState(false);
  if (s.mode !== 'EXPORT') return null;
  const approved = s.gates?.GATE_2?.status === 'APPROVED';
  const forwarded = Object.values(docs).filter((d) => d.status === 'FORWARDED');
  const set = (k) => (e) => setF((p) => ({ ...p, [k]: e.target.value }));

  const send = async () => {
    setBusy(true);
    try { await forwardDocuments(s, f, currentUser); showToast('Document pack forwarded'); onSaved?.(); } catch (e) { showToast(e?.message || 'Failed to forward', 'error'); } finally { setBusy(false); }
  };

  return (
    <SectionCard title="Forward Document Pack" subtitle="Available only after Operations Head approval of the document pack (Gate 2).">
      {!approved ? <p className="text-xs text-slate-400">Gate 2 is not approved yet — request approval from the shipment workspace.</p> : (
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 items-end">
          <Field label="Recipient" required><input disabled={busy} value={f.recipient} maxLength={200} onChange={set('recipient')} className={inp} /></Field>
          <Field label="Department"><input disabled={busy} value={f.department} maxLength={100} onChange={set('department')} className={inp} /></Field>
          <Field label="Method"><select disabled={busy} value={f.method} onChange={set('method')} className={inp}><option>SYSTEM</option><option>EMAIL</option><option>COURIER</option></select></Field>
          <Field label="Reference"><input disabled={busy} value={f.reference} maxLength={100} onChange={set('reference')} className={inp} /></Field>
          <button type="button" disabled={busy || !f.recipient.trim()} onClick={send} className="text-xs font-bold bg-emerald-600 text-white px-4 py-2.5 rounded-lg hover:bg-emerald-700 transition disabled:opacity-50 sm:col-span-4 sm:w-fit">{busy ? 'Forwarding...' : 'Forward Latest Pack'}</button>
        </div>
      )}
      {forwarded.length > 0 && <p className="text-[11px] text-slate-500 mt-3">Last forwarded to {forwarded[0].forward?.recipient} ({forwarded[0].forward?.department}) by {forwarded[0].forward?.by} on {new Date(forwarded[0].forward?.at).toLocaleString()}.</p>}
    </SectionCard>
  );
};

export default ForwardPackPanel;