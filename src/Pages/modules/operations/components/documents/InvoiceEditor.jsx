// src/Pages/modules/operations/components/documents/InvoiceEditor.jsx
import { useState } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import SectionCard from '../SectionCard';
import Field, { inp } from '../Field';
import EditorFooter from './EditorFooter';
import { useOperationsAuth } from '../../hooks/useOperationsAuth';
import { useToast } from '../../../../../Components/hooks/useToast';
import { saveDocument } from '../../services/documentService';
import { emptyInvoiceItem, CURRENCY_OPTIONS } from '../../constants/shipmentFields';

const n = (v) => (v === '' || v === null || v === undefined ? 0 : Number(v));
const CHARGES = [['freight', 'Freight'], ['insurance', 'Insurance'], ['tax', 'Tax'], ['otherCharges', 'Other charges'], ['discount', 'Discount']];

const InvoiceEditor = ({ shipment: s, doc, editable, onSaved }) => {
  const { currentUser } = useOperationsAuth();
  const { showToast } = useToast();
  const d = doc?.data || {};
  const [f, setF] = useState(() => ({
    invoiceNo: d.invoiceNo || `INV-${s.shipmentId}`, invoiceDate: d.invoiceDate || s.bookingDate || '', currency: d.currency || s.parcel?.currency || 'USD',
    incoterms: d.incoterms ?? s.parcel?.incoterms ?? '', exportPurpose: d.exportPurpose ?? s.parcel?.exportPurpose ?? '',
    freight: d.freight ?? '', insurance: d.insurance ?? '', discount: d.discount ?? '', tax: d.tax ?? '', otherCharges: d.otherCharges ?? '',
    additionalComment: d.additionalComment || '', authorisedPerson: d.authorisedPerson || '', authorisedTitle: d.authorisedTitle || '',
  }));
  const [items, setItems] = useState(() => (d.items?.length ? d.items.map((i) => ({ ...i })) : [emptyInvoiceItem()]));
  const [summary, setSummary] = useState('');
  const [busy, setBusy] = useState(false);
  const set = (k) => (e) => setF((p) => ({ ...p, [k]: e.target.value }));
  const upd = (i, k, v) => setItems((p) => p.map((it, idx) => (idx === i ? { ...it, [k]: v } : it)));

  const subtotal = items.reduce((t, it) => t + n(it.unitCost) * n(it.pcs), 0);
  const grand = subtotal + n(f.freight) + n(f.insurance) + n(f.tax) + n(f.otherCharges) - n(f.discount);

  const save = async () => {
    const filled = items.filter((it) => it.description || it.pcs || it.unitCost);
    if (!f.invoiceNo.trim()) return showToast('Invoice number is required', 'warning');
    if (!f.invoiceDate) return showToast('Invoice date is required', 'warning');
    if (filled.length === 0) return showToast('Add at least one item', 'warning');
    for (const it of filled) {
      if (!it.description.trim()) return showToast('Each item needs a description', 'warning');
      if (!(n(it.pcs) > 0)) return showToast('Each item needs PCS greater than 0', 'warning');
      if (it.unitCost === '' || n(it.unitCost) < 0) return showToast('Each item needs a valid unit cost', 'warning');
    }
    for (const [k, label] of CHARGES) if (f[k] !== '' && n(f[k]) < 0) return showToast(`${label} cannot be negative`, 'warning');
    if (grand < 0) return showToast('Discount is larger than the invoice total', 'warning');
    setBusy(true);
    try {
      await saveDocument({ shipmentId: s.shipmentId, type: 'INVOICE', data: { ...f, items: filled, subtotal: Number(subtotal.toFixed(2)), total: Number(subtotal.toFixed(2)), grandTotal: Number(grand.toFixed(2)) }, changeSummary: summary || 'Invoice updated' }, currentUser);
      showToast('Invoice saved'); setSummary(''); onSaved?.();
    } catch (e) { showToast(e?.message || 'Failed to save invoice', 'error'); } finally { setBusy(false); }
  };

  const dis = !editable || busy;
  return (
    <SectionCard title="Commercial Invoice" subtitle={`Shipper: ${s.pickup?.companyName || '—'}  ✈  Consignee: ${s.receiver?.companyName || '—'} (from the shipment record)`}>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <Field label="Invoice No." required><input disabled={dis} value={f.invoiceNo} maxLength={40} onChange={set('invoiceNo')} className={inp} /></Field>
        <Field label="Invoice Date" required><input type="date" disabled={dis} value={f.invoiceDate} onChange={set('invoiceDate')} className={inp} /></Field>
        <Field label="Currency" required><select disabled={dis} value={f.currency} onChange={set('currency')} className={inp}>{CURRENCY_OPTIONS.map((c) => <option key={c}>{c}</option>)}</select></Field>
        <Field label="Incoterms"><input disabled={dis} value={f.incoterms} maxLength={20} onChange={set('incoterms')} className={inp} /></Field>
        <Field label="Export purpose / reason"><input disabled={dis} value={f.exportPurpose} maxLength={60} onChange={set('exportPurpose')} className={inp} /></Field>
      </div>
      <div className="flex items-center justify-between mt-5 mb-2">
        <p className="text-xs font-black text-slate-600 uppercase">Items</p>
        {editable && <button type="button" onClick={() => setItems((p) => [...p, emptyInvoiceItem()])} disabled={busy} className="flex items-center gap-1 text-xs font-bold text-emerald-600 hover:underline"><Plus size={14} /> Add item</button>}
      </div>
      <div className="space-y-2">
        {items.map((it, idx) => (
          <div key={idx} className="grid grid-cols-2 sm:grid-cols-12 gap-2 items-end border-b border-slate-100 pb-2">
            <div className="col-span-2 sm:col-span-5"><input disabled={dis} placeholder="Description" value={it.description} maxLength={200} onChange={(e) => upd(idx, 'description', e.target.value)} className={inp} /></div>
            <input disabled={dis} placeholder="HS code" value={it.hsCode} maxLength={20} onChange={(e) => upd(idx, 'hsCode', e.target.value)} className={inp} />
            <input type="number" min="0" disabled={dis} placeholder="PCS" value={it.pcs} onChange={(e) => upd(idx, 'pcs', e.target.value)} className={inp} />
            <input type="number" min="0" step="0.01" disabled={dis} placeholder="Unit cost" value={it.unitCost} onChange={(e) => upd(idx, 'unitCost', e.target.value)} className={inp} />
            <p className="p-2 text-sm font-bold text-slate-700">{(n(it.unitCost) * n(it.pcs)).toFixed(2)}</p>
            {editable && <div className="flex justify-end"><button type="button" aria-label="Remove item" disabled={busy || items.length === 1} onClick={() => setItems((p) => p.filter((_, i) => i !== idx))} className="text-red-500 disabled:opacity-30"><Trash2 size={16} /></button></div>}
          </div>
        ))}
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 mt-4">
        {CHARGES.map(([k, label]) => <Field key={k} label={label}><input type="number" min="0" step="0.01" disabled={dis} value={f[k]} onChange={set(k)} className={inp} /></Field>)}
      </div>
      <p className="text-right text-xs text-slate-500 mt-3">Subtotal {f.currency} {subtotal.toFixed(2)} · <span className="font-black text-sm text-slate-800">TOTAL {f.currency} {grand.toFixed(2)}</span></p>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-3">
        <Field label="Authorised person"><input disabled={dis} value={f.authorisedPerson} maxLength={100} onChange={set('authorisedPerson')} className={inp} /></Field>
        <Field label="Title"><input disabled={dis} value={f.authorisedTitle} maxLength={100} onChange={set('authorisedTitle')} className={inp} /></Field>
        <Field label="Additional comment" className="sm:col-span-2"><textarea rows={2} disabled={dis} value={f.additionalComment} maxLength={500} onChange={set('additionalComment')} className={inp} /></Field>
      </div>
      <p className="text-[10px] text-slate-400 mt-2">Signature and stamp are applied only by the authorised party on the signed copy — never generated here.</p>
      <EditorFooter doc={doc} editable={editable} busy={busy} summary={summary} setSummary={setSummary} onSave={save} />
    </SectionCard>
  );
};

export default InvoiceEditor;