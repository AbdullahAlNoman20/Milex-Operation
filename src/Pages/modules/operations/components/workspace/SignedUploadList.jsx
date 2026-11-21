import { useMemo, useState } from 'react';
import { Camera, Paperclip, CheckCircle2 } from 'lucide-react';
import SectionCard from '../SectionCard';
import { useOperationsAuth } from '../../hooks/useOperationsAuth';
import { useToast } from '../../../../../Components/hooks/useToast';
import { saveDocument } from '../../services/documentService';
import { prepareFile } from '../../services/fileService';
import { openDataUrl } from '../../utils/openFile';

const LIST = [['INVOICE', 'Commercial Invoice'], ['PACKING_LIST', 'Packing List'], ['DECLARATION', 'Declaration'], ['AWB', 'Air Waybill (all copies)'], ['MAWB', 'Master Air Waybill (MAWB)'], ['MANIFEST', 'Manifest']];

const SignedUploadList = ({ shipment: s, docs, onSaved }) => {
  const { currentUser } = useOperationsAuth();
  const { showToast } = useToast();
  const latest = useMemo(() => {
    const m = {};
    docs.filter((d) => d.type === 'SIGNED_DOCS' && d.data?.forType).forEach((d) => { if (!m[d.data.forType] || d.createdAt > m[d.data.forType].createdAt) m[d.data.forType] = d; });
    return m;
  }, [docs]);

  const [otherTitle, setOtherTitle] = useState('');
  const others = useMemo(() => docs.filter((d) => d.type === 'SIGNED_DOCS' && d.data?.forType === 'OTHER').sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1)), [docs]);
  const pickOther = async (e) => {
    const f = e.target.files?.[0]; e.target.value = '';
    if (!f) return;
    if (!otherTitle.trim()) { showToast('Write a title for this document first', 'warning'); return; }
    try {
      const file = await prepareFile(f);
      await saveDocument({ shipmentId: s.shipmentId, type: 'SIGNED_DOCS', data: { title: otherTitle.trim(), kind: 'Other document', forType: 'OTHER' }, file, changeSummary: `Other document uploaded: ${otherTitle.trim()}` }, currentUser);
      showToast('Document uploaded'); setOtherTitle(''); onSaved?.();
    } catch (err) { showToast(err?.message || 'Upload failed', 'error'); }
  };

  const pick = (forType, label) => async (e) => {
    const f = e.target.files?.[0]; e.target.value = '';
    if (!f) return;
    try {
      const file = await prepareFile(f);
      await saveDocument({ shipmentId: s.shipmentId, type: 'SIGNED_DOCS', data: { title: f.name, kind: 'Signed & Stamped', forType }, file, changeSummary: `Signed original uploaded: ${label}` }, currentUser);
      showToast(`${label} uploaded`); onSaved?.();
    } catch (err) { showToast(err?.message || 'Upload failed', 'error'); }
  };

  return (
    <SectionCard title="Signed Original Documents" subtitle="Upload the signed / stamped original of each document (photo or file).">
      <div className="space-y-2">
        {LIST.map(([type, label]) => {
          const d = latest[type];
          return (
            <div key={type} className="flex items-center justify-between gap-2 border border-slate-100 rounded-xl p-3">
              <div className="min-w-0">
                <p className="text-sm font-bold text-slate-700">{label}</p>
                {d ? <button type="button" onClick={() => openDataUrl(d.file)} className="flex items-center gap-1 text-[11px] font-bold text-emerald-700 hover:underline truncate"><CheckCircle2 size={13} /> {d.file?.name || 'Uploaded'} · {new Date(d.createdAt).toLocaleDateString()}</button> : <p className="text-[11px] text-slate-400">Not uploaded yet</p>}
              </div>
              <div className="flex gap-2 shrink-0">
                <label title="Take photo" className="w-10 h-10 rounded-full bg-emerald-50 text-emerald-700 flex items-center justify-center cursor-pointer hover:bg-emerald-100"><Camera size={18} /><input type="file" accept="image/*" capture="environment" className="hidden" onChange={pick(type, label)} /></label>
                <label title="Upload file" className="w-10 h-10 rounded-full bg-slate-100 text-slate-600 flex items-center justify-center cursor-pointer hover:bg-slate-200"><Paperclip size={18} /><input type="file" accept=".pdf,.jpg,.jpeg,.png" className="hidden" onChange={pick(type, label)} /></label>
              </div>
            </div>);
        })}
        <div className="border border-dashed border-slate-300 rounded-xl p-3 space-y-2">
          <p className="text-sm font-bold text-slate-700">Other document</p>
          <p className="text-[11px] text-slate-400">Any other paper for this shipment. Give it a title, then choose the file.</p>
          <div className="flex flex-wrap items-center gap-2">
            <input value={otherTitle} maxLength={80} onChange={(e) => setOtherTitle(e.target.value)} placeholder="Title, e.g. Customs receipt" className="flex-1 min-w-[180px] border border-slate-300 rounded-lg px-3 py-2 text-sm bg-slate-50 outline-none focus:border-emerald-500" />
            <label title="Take photo" className="w-10 h-10 rounded-full bg-emerald-50 text-emerald-700 flex items-center justify-center cursor-pointer hover:bg-emerald-100"><Camera size={18} /><input type="file" accept="image/*" capture="environment" className="hidden" onChange={pickOther} /></label>
            <label title="Upload file" className="w-10 h-10 rounded-full bg-slate-100 text-slate-600 flex items-center justify-center cursor-pointer hover:bg-slate-200"><Paperclip size={18} /><input type="file" accept=".pdf,.jpg,.jpeg,.png" className="hidden" onChange={pickOther} /></label>
          </div>
          {others.map((d) => <button key={d.id || d.createdAt} type="button" onClick={() => openDataUrl(d.file)} className="flex items-center gap-1 text-[11px] font-bold text-emerald-700 hover:underline"><CheckCircle2 size={13} /> {d.data.title} · {new Date(d.createdAt).toLocaleDateString()}</button>)}
        </div>
      </div>
    </SectionCard>
  );
};

export default SignedUploadList;