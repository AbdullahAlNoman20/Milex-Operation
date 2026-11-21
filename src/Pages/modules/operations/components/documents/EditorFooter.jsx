// src/Pages/modules/operations/components/documents/EditorFooter.jsx
import { inp } from '../Field';

const EditorFooter = ({ doc, editable, busy, summary, setSummary, onSave, saveLabel = 'Save as New Version', extra = null }) => {
  if (!editable) return <p className="mt-4 text-xs bg-slate-50 border border-slate-200 text-slate-500 rounded-lg p-3 font-semibold">Documents are locked at this stage — the pack has already been used for customs / airline handover or the shipment is closed.</p>;
  const needsReapproval = doc && ['APPROVED', 'FORWARDED', 'PENDING_HEAD'].includes(doc.status);
  return (
    <div className="mt-4 space-y-3">
      {needsReapproval && <p className="text-xs bg-amber-50 border border-amber-200 text-amber-700 rounded-lg p-2.5 font-semibold">This version is {doc.status.replace('_', ' ').toLowerCase()}. Saving creates v{doc.version + 1}; the previous version stays on record and Operations Head approval must be requested again.</p>}
      <input value={summary} maxLength={300} onChange={(e) => setSummary(e.target.value)} placeholder="What changed? (change summary)" className={inp} />
      <div className="flex flex-wrap items-center gap-3">
        <button type="button" disabled={busy} onClick={onSave} className="text-xs font-bold bg-emerald-600 text-white px-5 py-2.5 rounded-lg hover:bg-emerald-700 transition disabled:opacity-50">{busy ? 'Saving...' : saveLabel}</button>
        {extra}
        {doc && <span className="text-[10px] text-slate-400">Current: v{doc.version} · {doc.status.replace('_', ' ')} · {doc.createdBy}</span>}
      </div>
    </div>
  );
};

export default EditorFooter;