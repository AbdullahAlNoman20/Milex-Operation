// src/Pages/modules/operations/components/documents/DeclarationEditor.jsx
import { useState } from 'react';
import SectionCard from '../SectionCard';
import Field, { inp } from '../Field';
import EditorFooter from './EditorFooter';
import { useOperationsAuth } from '../../hooks/useOperationsAuth';
import { useToast } from '../../../../../Components/hooks/useToast';
import { saveDocument } from '../../services/documentService';

const TEXT = [
  ['declarationNo', 'Declaration No.', true], ['declarationDate', 'Declaration Date', true, 'date'], ['invoiceNo', 'Related Invoice No.', true],
  ['ercNo', 'ERC No.'], ['ercDate', 'ERC Date', false, 'date'], ['previousErc', 'Previous ERC No.'],
  ['binNo', 'BIN No.'], ['binDate', 'BIN Date', false, 'date'], ['vat', 'VAT No.'], ['etin', 'e-TIN'],
  ['hsCode', 'HS Code'], ['countryOfOrigin', 'Country of Origin'], ['grossWeight', 'Gross Weight (kg)', false, 'number'], ['netWeight', 'Net Weight (kg)', false, 'number'],
  ['pcs', 'Pieces / Packages', false, 'number'], ['declaredValue', 'Declared Value', false, 'number'], ['currency', 'Currency'], ['incoterms', 'Incoterms'],
  ['exportPurpose', 'Export Purpose'], ['beNo', 'B/E No. / Customs Entry Ref'], ['mawbNo', 'MAWB / HAWB / AWB'],
];
const partyText = (p = {}) => [p.address, p.city, p.postCode, p.country].filter(Boolean).join(', ');

const DeclarationEditor = ({ shipment: s, doc, invoice, editable, onSaved }) => {
  const { currentUser } = useOperationsAuth();
  const { showToast } = useToast();
  const d = doc?.data || {};
  const [f, setF] = useState(() => ({
    declarationNo: d.declarationNo || `DEC-${s.shipmentId}`, declarationDate: d.declarationDate || new Date().toISOString().slice(0, 10),
    invoiceNo: d.invoiceNo || invoice?.data?.invoiceNo || '', ercNo: d.ercNo || '', ercDate: d.ercDate || '', previousErc: d.previousErc || '',
    binNo: d.binNo ?? s.taxIds?.bin ?? '', binDate: d.binDate || '', vat: d.vat ?? s.taxIds?.vat ?? '', etin: d.etin ?? s.taxIds?.etin ?? '',
    hsCode: d.hsCode ?? s.parcel?.hsCode ?? '', countryOfOrigin: d.countryOfOrigin ?? s.parcel?.countryOfOrigin ?? '',
    grossWeight: d.grossWeight ?? s.parcel?.weightKg ?? '', netWeight: d.netWeight ?? '', pcs: d.pcs ?? s.parcel?.pieces ?? '',
    declaredValue: d.declaredValue ?? s.parcel?.declaredValue ?? '', currency: d.currency || s.parcel?.currency || 'USD',
    incoterms: d.incoterms ?? s.parcel?.incoterms ?? '', exportPurpose: d.exportPurpose ?? s.parcel?.exportPurpose ?? '',
    beNo: d.beNo || '', mawbNo: d.mawbNo ?? s.mawb?.mawbNumber ?? '',
    exporterName: d.exporterName ?? s.pickup?.companyName ?? '', exporterAddress: d.exporterAddress ?? partyText(s.pickup),
    importerName: d.importerName ?? s.receiver?.companyName ?? '', importerAddress: d.importerAddress ?? partyText(s.receiver),
    goodsDescription: d.goodsDescription ?? s.parcel?.shipmentContents ?? '', sampleNote: d.sampleNote || '',
    declarationText: d.declarationText || 'I/We hereby declare that the particulars stated in this declaration are true and correct.',
    signatoryName: d.signatoryName || '', signatoryTitle: d.signatoryTitle || '',
  }));
  const [summary, setSummary] = useState('');
  const [busy, setBusy] = useState(false);
  const set = (k) => (e) => setF((p) => ({ ...p, [k]: e.target.value }));

  const save = async () => {
    for (const [k, label, req] of TEXT) if (req && !String(f[k]).trim()) return showToast(`${label} is required`, 'warning');
    for (const k of ['exporterName', 'exporterAddress', 'importerName', 'importerAddress', 'goodsDescription']) if (!f[k].trim()) return showToast('Exporter, importer and goods description are required', 'warning');
    for (const k of ['grossWeight', 'netWeight', 'pcs', 'declaredValue']) if (f[k] !== '' && !(Number(f[k]) >= 0)) return showToast('Weights, pieces and value must be valid numbers', 'warning');
    if (f.grossWeight !== '' && f.netWeight !== '' && Number(f.netWeight) > Number(f.grossWeight)) return showToast('Net weight cannot exceed gross weight', 'warning');
    setBusy(true);
    try {
      await saveDocument({ shipmentId: s.shipmentId, type: 'DECLARATION', data: f, changeSummary: summary || 'Declaration updated' }, currentUser);
      showToast('Declaration saved'); setSummary(''); onSaved?.();
    } catch (e) { showToast(e?.message || 'Failed to save', 'error'); } finally { setBusy(false); }
  };

  const dis = !editable || busy;
  return (
    <SectionCard title="Declaration" subtitle="Wording follows the authority / carrier template. Regulatory identifiers are never guessed — leave blank if not applicable.">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {TEXT.map(([k, label, req, type]) => <Field key={k} label={label} required={req}><input type={type || 'text'} step={type === 'number' ? '0.01' : undefined} min={type === 'number' ? 0 : undefined} disabled={dis} value={f[k]} maxLength={80} onChange={set(k)} className={inp} /></Field>)}
        <Field label="Exporter / Shipper" required><input disabled={dis} value={f.exporterName} maxLength={150} onChange={set('exporterName')} className={inp} /></Field>
        <Field label="Exporter address" required className="sm:col-span-2"><input disabled={dis} value={f.exporterAddress} maxLength={300} onChange={set('exporterAddress')} className={inp} /></Field>
        <Field label="Importer / Consignee" required><input disabled={dis} value={f.importerName} maxLength={150} onChange={set('importerName')} className={inp} /></Field>
        <Field label="Importer address" required className="sm:col-span-2"><input disabled={dis} value={f.importerAddress} maxLength={300} onChange={set('importerAddress')} className={inp} /></Field>
        <Field label="Description of goods" required className="sm:col-span-3"><textarea rows={2} disabled={dis} value={f.goodsDescription} maxLength={500} onChange={set('goodsDescription')} className={inp} /></Field>
        <Field label="Sample / customs-purpose note (Client confirms)" className="sm:col-span-3"><input disabled={dis} value={f.sampleNote} maxLength={300} placeholder="e.g. Sample has no commercial value, value for customs purpose only" onChange={set('sampleNote')} className={inp} /></Field>
        <Field label="Declaration text" className="sm:col-span-3"><textarea rows={2} disabled={dis} value={f.declarationText} maxLength={500} onChange={set('declarationText')} className={inp} /></Field>
        <Field label="Signatory name"><input disabled={dis} value={f.signatoryName} maxLength={100} onChange={set('signatoryName')} className={inp} /></Field>
        <Field label="Signatory title"><input disabled={dis} value={f.signatoryTitle} maxLength={100} onChange={set('signatoryTitle')} className={inp} /></Field>
      </div>
      <p className="text-[10px] text-slate-400 mt-2">Signature / stamp / customs evidence come only from the authorised party (uploaded by C&F as the signed document).</p>
      <EditorFooter doc={doc} editable={editable} busy={busy} summary={summary} setSummary={setSummary} onSave={save} />
    </SectionCard>
  );
};

export default DeclarationEditor;