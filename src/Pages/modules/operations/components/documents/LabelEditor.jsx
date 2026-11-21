// src/Pages/modules/operations/components/documents/LabelEditor.jsx
// The label is produced by an external labelling system (e.g. Hubez) / partner. MILEXAIR stores file, source and linkage.
import { useState } from 'react';
import SectionCard from '../SectionCard';
import Field, { inp } from '../Field';
import EditorFooter from './EditorFooter';
import { useOperationsAuth } from '../../hooks/useOperationsAuth';
import { useToast } from '../../../../../Components/hooks/useToast';
import { saveDocument } from '../../services/documentService';
import { prepareFile } from '../../services/fileService';
import { openDataUrl } from '../../utils/openFile';

const SOURCES = ['Hubez (external labelling system)', 'Partner / principal', 'Other'];
const STATES = ['UPLOADED', 'CHECKED', 'PRINTABLE', 'REJECTED'];

const LabelEditor = ({ shipment: s, doc, editable, onSaved }) => {
  const { currentUser } = useOperationsAuth();
  const { showToast } = useToast();
  const d = doc?.data || {};
  const [f, setF] = useState({ source: d.source || SOURCES[0], barcode: d.barcode || s.awbNumber || s.tracking?.trackingNumber || s.shipmentId, labelStatus: d.labelStatus || 'UPLOADED', discrepancyNote: d.discrepancyNote || '' });
  const [file, setFile] = useState(null);
  const [summary, setSummary] = useState('');
  const [busy, setBusy] = useState(false);
  const set = (k) => (e) => setF((p) => ({ ...p, [k]: e.target.value }));

  const pick = async (e) => {
    const x = e.target.files?.[0];
    e.target.value = '';
    if (!x) return;
    try { setFile(await prepareFile(x)); } catch (err) { showToast(err.message, 'warning'); }
  };

  const save = async () => {
    const finalFile = file || doc?.file;
    if (!finalFile) return showToast('Upload the label file (PDF / image) first', 'warning');
    if (!f.barcode.trim()) return showToast('Barcode / reference is required', 'warning');
    if (['REJECTED'].includes(f.labelStatus) && !f.discrepancyNote.trim()) return showToast('Add a discrepancy note for a rejected label', 'warning');
    setBusy(true);
    try {
      await saveDocument({ shipmentId: s.shipmentId, type: 'LABEL', data: f, file: finalFile, changeSummary: summary || (file ? 'New label uploaded' : 'Label status updated') }, currentUser);
      showToast('Label saved'); setFile(null); setSummary(''); onSaved?.();
    } catch (e) { showToast(e?.message || 'Failed to save', 'error'); } finally { setBusy(false); }
  };

  const dis = !editable || busy;
  const shown = file || doc?.file;
  return (
    <SectionCard title="Shipping Label" subtitle="Upload the label generated in the external labelling system. A mismatch must be fixed before the pack is finalised.">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <Field label="Source system" required><select disabled={dis} value={f.source} onChange={set('source')} className={inp}>{SOURCES.map((x) => <option key={x}>{x}</option>)}</select></Field>
        <Field label="Barcode / AWB / tracking ref." required><input disabled={dis} value={f.barcode} maxLength={60} onChange={set('barcode')} className={inp} /></Field>
        <Field label="Label status"><select disabled={dis} value={f.labelStatus} onChange={set('labelStatus')} className={inp}>{STATES.map((x) => <option key={x}>{x}</option>)}</select></Field>
        <Field label="Discrepancy note" className="sm:col-span-3"><input disabled={dis} value={f.discrepancyNote} maxLength={300} onChange={set('discrepancyNote')} className={inp} /></Field>
      </div>
      <div className="flex flex-wrap items-center gap-4 mt-3">
        {editable && <label className="text-xs font-bold text-emerald-600 cursor-pointer hover:underline">{file ? `New file: ${file.name}` : 'Upload label (PDF / JPG / PNG, max 2MB)'}<input type="file" accept=".pdf,.jpg,.jpeg,.png" className="hidden" disabled={busy} onChange={pick} /></label>}
        {shown && !file && <button type="button" onClick={() => openDataUrl(shown, () => showToast('Allow pop-ups to view the file', 'warning'))} className="text-xs font-bold text-slate-600 hover:underline">View current: {shown.name}</button>}
      </div>
      <EditorFooter doc={doc} editable={editable} busy={busy} summary={summary} setSummary={setSummary} onSave={save} saveLabel="Save Label" />
    </SectionCard>
  );
};

export default LabelEditor;