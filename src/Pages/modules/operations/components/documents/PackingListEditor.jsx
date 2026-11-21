// src/Pages/modules/operations/components/documents/PackingListEditor.jsx
import { useState } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import SectionCard from '../SectionCard';
import Field, { inp } from '../Field';
import EditorFooter from './EditorFooter';
import { useOperationsAuth } from '../../hooks/useOperationsAuth';
import { useToast } from '../../../../../Components/hooks/useToast';
import { saveDocument } from '../../services/documentService';
import { emptyPackingRow } from '../../constants/shipmentFields';

const n = (v) => (v === '' || v === null || v === undefined ? 0 : Number(v));

const PackingListEditor = ({ shipment: s, doc, editable, onSaved }) => {
  const { currentUser } = useOperationsAuth();
  const { showToast } = useToast();
  const d = doc?.data || {};
  const [rows, setRows] = useState(() => (d.rows?.length ? d.rows.map((r) => ({ ...r })) : [emptyPackingRow()]));
  const [meta, setMeta] = useState({ packingNo: d.packingNo || `PL-${s.shipmentId}`, marks: d.marks || '', seal: d.seal || '', remarks: d.remarks || '' });
  const [summary, setSummary] = useState('');
  const [busy, setBusy] = useState(false);
  const upd = (i, k, v) => setRows((p) => p.map((r, idx) => (idx === i ? { ...r, [k]: v } : r)));
  const totals = { qty: rows.reduce((t, r) => t + n(r.qty), 0), net: rows.reduce((t, r) => t + n(r.netKg), 0), gross: rows.reduce((t, r) => t + n(r.grossKg), 0), cartons: rows.length };

  const save = async () => {
    const filled = rows.filter((r) => r.cartonNo || r.description || r.qty);
    if (filled.length === 0) return showToast('Add at least one carton row', 'warning');
    const seen = new Set();
    for (const r of filled) {
      if (!r.cartonNo.trim()) return showToast('Each row needs a carton number / mark', 'warning');
      if (seen.has(r.cartonNo.trim().toLowerCase())) return showToast(`Duplicate carton number: ${r.cartonNo}`, 'warning');
      seen.add(r.cartonNo.trim().toLowerCase());
      if (!r.description.trim()) return showToast('Each row needs a description', 'warning');
      if (!(n(r.qty) > 0)) return showToast('Each row needs a quantity greater than 0', 'warning');
      if (r.netKg !== '' && r.grossKg !== '' && n(r.netKg) > n(r.grossKg)) return showToast(`Carton ${r.cartonNo}: net weight exceeds gross weight`, 'warning');
    }
    setBusy(true);
    try {
      await saveDocument({ shipmentId: s.shipmentId, type: 'PACKING_LIST', data: { ...meta, rows: filled, totalQty: filled.reduce((t, r) => t + n(r.qty), 0), totalNet: Number(totals.net.toFixed(2)), totalGross: Number(totals.gross.toFixed(2)), totalCartons: filled.length }, changeSummary: summary || 'Packing list updated' }, currentUser);
      showToast('Packing list saved'); setSummary(''); onSaved?.();
    } catch (e) { showToast(e?.message || 'Failed to save', 'error'); } finally { setBusy(false); }
  };

  const dis = !editable || busy;
  const warnQty = Number(s.parcel?.pieces) > 0 && totals.qty !== Number(s.parcel.pieces);
  const warnW = s.parcel?.weightKg && totals.gross > 0 && Math.abs(totals.gross - Number(s.parcel.weightKg)) > 0.5;
  return (
    <SectionCard title="Packing List" actions={editable && <button type="button" onClick={() => setRows((p) => [...p, emptyPackingRow()])} disabled={busy} className="flex items-center gap-1 text-xs font-bold text-emerald-600 hover:underline"><Plus size={14} /> Add carton</button>}>
      <div className="overflow-x-auto rounded-xl border border-slate-200">
        <table className="w-full min-w-[680px] text-left border-collapse">
          <thead>
            <tr className="bg-slate-800 text-white text-[10px] font-black uppercase tracking-wide">
              <th className="px-3 py-2.5 w-12 text-center">SL</th>
              <th className="px-3 py-2.5 w-40">Carton No. / Mark</th>
              <th className="px-3 py-2.5">Description of Goods</th>
              <th className="px-3 py-2.5 w-24 text-right">Qty (pcs)</th>
              <th className="px-3 py-2.5 w-28 text-right">Net Wt (kg)</th>
              <th className="px-3 py-2.5 w-28 text-right">Gross Wt (kg)</th>
              {editable && <th className="px-3 py-2.5 w-12 text-center"><span className="sr-only">Remove</span></th>}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 bg-white">
            {rows.map((r, idx) => (
              <tr key={idx} className="hover:bg-slate-50/70">
                <td className="px-3 py-2 text-center text-xs font-bold text-slate-400">{idx + 1}</td>
                <td className="px-2 py-1.5"><input disabled={dis} aria-label={`Carton no. row ${idx + 1}`} placeholder="e.g. CTN-01" value={r.cartonNo} maxLength={30} onChange={(e) => upd(idx, 'cartonNo', e.target.value)} className={inp} /></td>
                <td className="px-2 py-1.5"><input disabled={dis} aria-label={`Goods row ${idx + 1}`} placeholder="Goods description" value={r.description} maxLength={200} onChange={(e) => upd(idx, 'description', e.target.value)} className={inp} /></td>
                <td className="px-2 py-1.5"><input type="number" min="0" disabled={dis} aria-label={`Qty row ${idx + 1}`} placeholder="0" value={r.qty} onChange={(e) => upd(idx, 'qty', e.target.value)} className={`${inp} text-right`} /></td>
                <td className="px-2 py-1.5"><input type="number" min="0" step="0.01" disabled={dis} aria-label={`Net kg row ${idx + 1}`} placeholder="0.00" value={r.netKg} onChange={(e) => upd(idx, 'netKg', e.target.value)} className={`${inp} text-right`} /></td>
                <td className="px-2 py-1.5"><input type="number" min="0" step="0.01" disabled={dis} aria-label={`Gross kg row ${idx + 1}`} placeholder="0.00" value={r.grossKg} onChange={(e) => upd(idx, 'grossKg', e.target.value)} className={`${inp} text-right`} /></td>
                {editable && (
                  <td className="px-2 py-1.5 text-center">
                    <button type="button" aria-label="Remove carton" disabled={busy || rows.length === 1} onClick={() => setRows((p) => p.filter((_, i) => i !== idx))} className="text-red-500 hover:bg-red-50 rounded-md p-1.5 disabled:opacity-30"><Trash2 size={15} /></button>
                  </td>
                )}
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr className="bg-slate-100 text-xs font-black text-slate-700 border-t-2 border-slate-300">
              <td colSpan={3} className="px-3 py-2.5 text-right uppercase tracking-wide">Total · {totals.cartons} carton(s)</td>
              <td className="px-3 py-2.5 text-right">{totals.qty}</td>
              <td className="px-3 py-2.5 text-right">{totals.net.toFixed(2)}</td>
              <td className="px-3 py-2.5 text-right">{totals.gross.toFixed(2)}</td>
              {editable && <td />}
            </tr>
          </tfoot>
        </table>
      </div>
      {warnQty && <p className="text-[11px] text-amber-600 font-semibold">Packing quantity ({totals.qty}) differs from declared pieces ({s.parcel.pieces}).</p>}
      {warnW && <p className="text-[11px] text-amber-600 font-semibold">Gross weight ({totals.gross.toFixed(2)} kg) differs from declared weight ({s.parcel.weightKg} kg).</p>}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-3">
        <Field label="Packing list no."><input disabled={dis} value={meta.packingNo} maxLength={40} onChange={(e) => setMeta((p) => ({ ...p, packingNo: e.target.value }))} className={inp} /></Field>
        <Field label="Marks"><input disabled={dis} value={meta.marks} maxLength={100} onChange={(e) => setMeta((p) => ({ ...p, marks: e.target.value }))} className={inp} /></Field>
        <Field label="Seal"><input disabled={dis} value={meta.seal} maxLength={60} onChange={(e) => setMeta((p) => ({ ...p, seal: e.target.value }))} className={inp} /></Field>
        <Field label="Remarks" className="sm:col-span-3"><input disabled={dis} value={meta.remarks} maxLength={300} onChange={(e) => setMeta((p) => ({ ...p, remarks: e.target.value }))} className={inp} /></Field>
      </div>
      <EditorFooter doc={doc} editable={editable} busy={busy} summary={summary} setSummary={setSummary} onSave={save} />
    </SectionCard>
  );
};

export default PackingListEditor;