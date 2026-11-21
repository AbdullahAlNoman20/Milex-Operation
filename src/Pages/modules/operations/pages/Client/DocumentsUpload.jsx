// src/Pages/modules/operations/pages/Client/DocumentsUpload.jsx
// Client document center — permanent documents with number + expiry. Numbers are used automatically in every form and document.
import { useState, useEffect, useCallback } from 'react';
import { FileCheck2, UploadCloud, Eye, X, Save } from 'lucide-react';
import Loader from '../../../../../Components/Shared/Loader';
import Chip from '../../components/Chip';
import { useOperationsAuth } from '../../hooks/useOperationsAuth';
import { useToast } from '../../../../../Components/hooks/useToast';
import { prepareFile } from '../../services/fileService';
import { fetchClientDocs, saveClientDoc, CLIENT_DOC_TYPES, expiryState } from '../../services/clientDocService';
import { openDataUrl } from '../../utils/openFile';

const input = 'w-full border border-slate-300 rounded-lg px-3 py-2 text-sm bg-slate-50 focus:border-emerald-500 focus:bg-white outline-none';

const DocCard = ({ type, rec, email, onSaved }) => {
  const { showToast } = useToast();
  const [number, setNumber] = useState(rec?.number || '');
  const [expiry, setExpiry] = useState(rec?.expiry || '');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const st = type.expiry ? expiryState(expiry) : null;
  const dirty = number !== (rec?.number || '') || expiry !== (rec?.expiry || '');

  const save = async () => {
    if (type.expiry && number && !expiry) { setErr('Enter the expiry date'); return; }
    setBusy(true);
    try { await saveClientDoc(email, type.key, { number: number.trim(), expiry }); showToast(`${type.label} saved`); onSaved(); }
    catch (e) { showToast(e?.message || 'Could not save', 'error'); } finally { setBusy(false); }
  };
  const pick = async (e) => {
    const f = e.target.files?.[0]; e.target.value = '';
    if (!f) return;
    setBusy(true);
    try { const file = await prepareFile(f); await saveClientDoc(email, type.key, { file }); showToast(`${type.label} uploaded`); onSaved(); }
    catch (er) { showToast(er?.message || 'Upload failed', 'error'); } finally { setBusy(false); }
  };

  return (
    <article className={`rounded-xl border bg-white p-4 space-y-3 card-hover ${st?.tone === 'red' ? 'border-red-300' : st?.tone === 'amber' ? 'border-amber-300' : rec?.file ? 'border-emerald-200' : 'border-slate-200'}`}>
      <div className="flex items-start justify-between gap-2">
        <h3 className="flex items-center gap-2 text-sm font-black text-slate-800">{rec?.file ? <FileCheck2 size={16} className="text-emerald-600" /> : <UploadCloud size={16} className="text-amber-500" />}{type.label}</h3>
        {st && <Chip tone={st.tone}>{st.text}</Chip>}
      </div>
      <div className="grid gap-2.5 sm:grid-cols-2">
        <label className="block text-[11px] font-bold text-slate-600">{type.numberLabel}
          <input value={number} maxLength={40} placeholder={type.placeholder} onChange={(e) => { setNumber(e.target.value); setErr(''); }} className={`${input} mt-1`} />
        </label>
        {type.expiry && (
          <label className="block text-[11px] font-bold text-slate-600">Expiry date
            <input type="date" value={expiry} onChange={(e) => { setExpiry(e.target.value); setErr(''); }} className={`${input} mt-1 ${err ? 'field-error' : ''}`} />
            {err && <span className="anim-pop block mt-1 text-[11px] font-bold text-red-600">⚠ {err}</span>}
          </label>
        )}
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <button type="button" disabled={busy || !dirty} onClick={save} className="flex items-center gap-1.5 text-xs font-bold bg-emerald-600 text-white px-4 py-2 rounded-lg hover:bg-emerald-700 disabled:opacity-40"><Save size={13} />Save</button>
        {rec?.file ? (
          <>
            <button type="button" onClick={() => openDataUrl(rec.file)} className="flex items-center gap-1 text-xs font-bold text-emerald-700 border border-emerald-300 px-3 py-2 rounded-lg hover:bg-emerald-50"><Eye size={13} />View file</button>
            <button type="button" disabled={busy} onClick={async () => { setBusy(true); await saveClientDoc(email, type.key, { file: null }); setBusy(false); onSaved(); }} className="flex items-center gap-1 text-xs font-bold text-red-600 border border-red-200 px-3 py-2 rounded-lg hover:bg-red-50"><X size={13} />Remove file</button>
          </>
        ) : (
          <label className="flex items-center gap-1.5 text-xs font-bold text-slate-700 border border-slate-300 px-3 py-2 rounded-lg hover:bg-slate-50 cursor-pointer"><UploadCloud size={14} />Upload file<input type="file" accept=".pdf,.jpg,.jpeg,.png" className="hidden" disabled={busy} onChange={pick} /></label>
        )}
      </div>
    </article>
  );
};

const DocumentsUpload = () => {
  const { currentUser } = useOperationsAuth();
  const [rec, setRec] = useState(null);
  const load = useCallback(() => fetchClientDocs(currentUser.email).then(setRec), [currentUser.email]);
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { load(); }, [load]);
  if (!rec) return <Loader label="Loading your documents..." />;
  return (
    <div className="w-full space-y-4">
      <div><h1 className="text-xl font-black text-slate-800">Document Center</h1><p className="text-sm text-slate-500">PDF, JPG or PNG up to 2MB. Numbers saved here fill your Import / Export forms automatically.</p></div>
      <div className="grid gap-3 lg:grid-cols-2">{CLIENT_DOC_TYPES.map((t) => <DocCard key={t.key + (rec.updatedAt || '')} type={t} rec={rec.docs[t.key]} email={currentUser.email} onSaved={load} />)}</div>
    </div>
  );
};

export default DocumentsUpload;
