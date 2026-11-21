import { useState, useEffect, useCallback, useMemo } from 'react';
import SectionCard from '../SectionCard';
import Chip, { toneForStatus } from '../Chip';
import DocumentLinksPanel from '../DocumentLinksPanel';
import InvoiceEditor from '../documents/InvoiceEditor';
import PackingListEditor from '../documents/PackingListEditor';
import DeclarationEditor from '../documents/DeclarationEditor';
import LabelEditor from '../documents/LabelEditor';
import AwbEditor from '../documents/AwbEditor';
import DocumentFinalizePanel from '../documents/DocumentFinalizePanel';
import ForwardPackPanel from '../documents/ForwardPackPanel';
import HubChecklistPanel from './HubChecklistPanel';
import SignedUploadList from './SignedUploadList';
import EvidenceForm from './EvidenceForm';
import { inp } from '../Field';
import { useOperationsAuth } from '../../hooks/useOperationsAuth';
import { useDataVersion } from '../../hooks/useDataVersion';
import { useToast } from '../../../../../Components/hooks/useToast';
import { fetchDocumentsByShipment, saveDocument } from '../../services/documentService';
import { fetchEvidenceByShipment, verifyEvidence } from '../../services/evidenceService';
import { canSeeDocumentPack } from '../../services/accessService';
import { prepareFile } from '../../services/fileService';
import { getDocStatus } from '../../utils/docCompleteness';
import { docsEditable } from '../../utils/docRules';
import { openDataUrl } from '../../utils/openFile';
import { DOC_TYPE_LABELS, REQUIRED_DOC_TYPES_BY_MODE, EVIDENCE_TYPES, DOC_ORDER_BY_MODE } from '../../constants/shipmentFields';
import { Link } from 'react-router-dom';
import { fetchManifests } from '../../services/manifestService';
import { OPERATIONS_ROLES as R, ROLE_HOME } from '../../constants/operationsRoles';

const TABS = ['INVOICE', 'PACKING_LIST', 'DECLARATION', 'LABEL', 'AWB'];
const KINDS = ['Original', 'Final', 'Signed', 'Signed & Stamped'];

const EvidenceSection = ({ s, onChanged }) => {
  const { currentUser } = useOperationsAuth();
  const { showToast } = useToast();
  const version = useDataVersion();
  const [list, setList] = useState([]);
  const [c, setC] = useState('');
  const canVerify = [R.DOMESTIC_ADMIN, R.OPERATIONS_HEAD].includes(currentUser.role);
  useEffect(() => { let a = true; fetchEvidenceByShipment(s.shipmentId).then((l) => a && setList(l)); return () => { a = false; }; }, [s.shipmentId, version]);
  const act = async (id, d) => { try { await verifyEvidence(id, d, c, currentUser); setC(''); showToast(`Evidence ${d.toLowerCase()}`); onChanged?.(); } catch (e) { showToast(e?.message || 'Failed', 'error'); } };
  return (
    <>
      <SectionCard title="Customs / Airline Evidence" subtitle="Release, manifest and handover steps need verified evidence.">
        {list.length === 0 ? <p className="text-sm text-slate-400">No evidence recorded yet.</p> : list.map((e) => (
          <div key={e.id} className="border border-slate-100 rounded-lg p-2.5 mb-2 last:mb-0">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div><p className="text-xs font-bold text-slate-700">{EVIDENCE_TYPES[e.eventType]}{e.reference ? ` · ${e.reference}` : ''}</p><p className="text-[10px] text-slate-400">{e.uploadedBy} · {new Date(e.eventAt).toLocaleString()}{e.holdReason ? ` · ${e.holdReason}` : ''}</p></div>
              <div className="flex gap-1.5"><Chip tone={toneForStatus(e.result)}>{e.result.replace('_', ' ')}</Chip><Chip tone={toneForStatus(e.verification?.status)}>{e.verification?.status}</Chip></div>
            </div>
            {e.file && <button type="button" onClick={() => openDataUrl(e.file)} className="text-[11px] font-bold text-emerald-600 hover:underline mt-1">View file: {e.file.name}</button>}
            {canVerify && e.verification?.status === 'PENDING' && (
              <div className="flex flex-wrap gap-2 mt-2">
                <input value={c} maxLength={300} onChange={(x) => setC(x.target.value)} placeholder="Comment (required to reject)" className={`${inp} flex-1 min-w-[160px]`} />
                <button type="button" onClick={() => act(e.id, 'VERIFIED')} className="text-xs font-bold bg-emerald-600 text-white px-3 py-2 rounded-lg">Verify</button>
                <button type="button" disabled={!c.trim()} onClick={() => act(e.id, 'REJECTED')} className="text-xs font-bold bg-red-50 text-red-600 border border-red-200 px-3 py-2 rounded-lg disabled:opacity-40">Reject</button>
              </div>
            )}
          </div>))}
      </SectionCard>
      <EvidenceForm shipment={s} onSaved={onChanged} />
    </>
  );
};

const DocumentsTab = ({ s, onChanged }) => {
  const { currentUser } = useOperationsAuth();
  const { showToast } = useToast();
  const version = useDataVersion();
  const role = currentUser.role;
  const [docs, setDocs] = useState([]);
  const [tab, setTab] = useState((DOC_ORDER_BY_MODE[s.mode] || TABS)[0]);
  const [kind, setKind] = useState('Final');
  const [busy, setBusy] = useState(false);
  const [mf, setMf] = useState(null); // the ONE manifest this shipment is in
  useEffect(() => { fetchManifests().then((all) => setMf(all.find((m) => m.status !== 'SUPERSEDED' && (m.rows || []).some((r) => r.shipmentId === s.shipmentId)) || false)).catch(() => setMf(false)); }, [s.shipmentId, version]);

  const load = useCallback(async () => { setDocs(await fetchDocumentsByShipment(s.shipmentId)); }, [s.shipmentId]);
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { load(); }, [load, version]);
  const refresh = async () => { await load(); onChanged?.(); };

  const latest = useMemo(() => {
    const m = {};
    docs.filter((d) => d.status !== 'SUPERSEDED').forEach((d) => { if (!m[d.type] || d.version > m[d.type].version) m[d.type] = d; });
    return m;
  }, [docs]);

  const isSup = role === R.DOMESTIC_ADMIN || (role === R.FOREIGN_ADMIN && s.mode === 'IMPORT');
  const isClient = role === R.CLIENT;
  const editable = isSup && docsEditable(s);
  const required = REQUIRED_DOC_TYPES_BY_MODE[s.mode] || [];
  const canUpload = [R.CNF, R.DOMESTIC_ADMIN, R.FOREIGN_ADMIN].includes(role) && s.statusCode !== 'CLOSED';
  const packOk = canSeeDocumentPack(currentUser, s);
  const visible = isClient ? docs.filter((d) => d.status !== 'SUPERSEDED') : packOk ? docs : docs.filter((d) => d.createdByRole === role);
  const common = { shipment: s, editable, onSaved: refresh };

  const upload = async (e) => {
    const f = e.target.files?.[0]; e.target.value = '';
    if (!f) return;
    setBusy(true);
    try {
      const file = await prepareFile(f);
      await saveDocument({ shipmentId: s.shipmentId, type: 'SIGNED_DOCS', data: { title: f.name, kind }, file, changeSummary: `${kind} document uploaded` }, currentUser);
      showToast('Document uploaded'); refresh();
    } catch (err) { showToast(err?.message || 'Upload failed', 'error'); } finally { setBusy(false); }
  };

  return (
    <div className="space-y-5">
      {isSup && <HubChecklistPanel shipment={s} onSaved={refresh} />}

      {isSup && (
        <SectionCard title="Prepare Documents" subtitle="Edit until the Client and Operations Head give final approval. Every save is a new version.">
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 mb-4">
            {(DOC_ORDER_BY_MODE[s.mode] || TABS).map((t) => { const d = latest[t]; const st = t === 'MANIFEST' ? { complete: !!mf } : getDocStatus(t, s, d); return (
              <button key={t} type="button" onClick={() => setTab(t)} className={`text-left border rounded-lg p-2.5 transition ${tab === t ? 'border-emerald-500 bg-emerald-50' : 'border-slate-200 hover:bg-slate-50'}`}>
                <p className="text-[11px] font-bold text-slate-700">{DOC_TYPE_LABELS[t]}{required.includes(t) ? ' *' : ''}</p>
                <div className="mt-1"><Chip tone={st.complete ? 'green' : d ? 'amber' : 'slate'}>{t === 'MANIFEST' ? (mf ? mf.manifestNo : 'Not in a manifest') : d ? `v${d.version} · ${st.complete ? 'Complete' : 'Draft'}` : 'Not started'}</Chip></div>
              </button>); })}
          </div>
          {!editable && <p className="text-[11px] text-slate-400 mb-3">Editing is locked at this stage.</p>}
          {tab === 'MANIFEST' && (
            <div className="rounded-xl border-2 border-dashed border-slate-300 p-4 space-y-3 anim-pop">
              {mf ? (
                <>
                  <p className="text-sm font-black text-emerald-700">✔ This shipment is in manifest {mf.manifestNo} (v{mf.version})</p>
                  <div className="flex flex-wrap gap-2">
                    <Link to={`/operations/documents/manifest/${mf.id}`} className="text-xs font-bold border border-emerald-300 text-emerald-700 px-4 py-2 rounded-lg hover:bg-emerald-50">Open / Print manifest</Link>
                    <Link to={`${ROLE_HOME[role]}/manifests/new?revise=${mf.id}`} className="text-xs font-bold border border-slate-300 text-slate-700 px-4 py-2 rounded-lg hover:bg-slate-50">Add / remove shipments (revise)</Link>
                  </div>
                </>
              ) : (
                <>
                  <p className="text-sm font-black text-amber-700">⚠ Not in any manifest yet</p>
                  <p className="text-xs text-slate-500">Every shipment must be in exactly one manifest before customs clearance. The shipment and flight details are filled in for you.</p>
                  <Link to={`${ROLE_HOME[role]}/manifests/new?shipment=${encodeURIComponent(s.shipmentId)}`} className="inline-block text-sm font-bold bg-emerald-600 text-white px-5 py-2.5 rounded-lg hover:bg-emerald-700">Create manifest with this shipment</Link>
                </>
              )}
            </div>
          )}
          {tab === 'INVOICE' && <InvoiceEditor key={latest.INVOICE?.id || 'n-inv'} {...common} doc={latest.INVOICE || null} />}
          {tab === 'PACKING_LIST' && <PackingListEditor key={latest.PACKING_LIST?.id || 'n-pl'} {...common} doc={latest.PACKING_LIST || null} />}
          {tab === 'DECLARATION' && <DeclarationEditor key={latest.DECLARATION?.id || 'n-dec'} {...common} doc={latest.DECLARATION || null} invoice={latest.INVOICE || null} />}
          {tab === 'LABEL' && <LabelEditor key={latest.LABEL?.id || 'n-lbl'} {...common} doc={latest.LABEL || null} />}
          {tab === 'AWB' && <AwbEditor key={latest.AWB?.id || 'n-awb'} {...common} doc={latest.AWB || null} />}
        </SectionCard>
      )}

      {isSup && <DocumentFinalizePanel shipment={s} docs={latest} onSaved={refresh} />}
      {isSup && <ForwardPackPanel shipment={s} docs={latest} onSaved={refresh} />}

      <SectionCard title="Documents — View / Download"><DocumentLinksPanel shipment={s} /></SectionCard>

      
      {canUpload && s.gates?.GATE_2?.status === 'APPROVED' && <SignedUploadList shipment={s} docs={docs} onSaved={refresh} />}

      <SectionCard title="Version History" actions={canUpload && (
        <div className="flex flex-wrap items-center gap-2">
          <select value={kind} onChange={(e) => setKind(e.target.value)} className="border border-slate-300 rounded-lg px-2 py-1 text-xs bg-slate-50">{KINDS.map((k) => <option key={k}>{k}</option>)}</select>
          <label className="text-xs font-bold text-emerald-600 cursor-pointer hover:underline">{busy ? 'Uploading...' : '+ Upload signed / final document'}<input type="file" accept=".pdf,.jpg,.jpeg,.png" className="hidden" disabled={busy} onChange={upload} /></label>
        </div>)}>
        {visible.length === 0 ? <p className="text-sm text-slate-400">No documents yet.</p> : (
          <div className="overflow-x-auto"><table className="w-full text-xs">
            <thead><tr className="text-left text-[10px] font-bold text-slate-400 uppercase border-b border-slate-100"><th className="py-2 pr-3">Document</th><th className="py-2 pr-3">Ver.</th><th className="py-2 pr-3">Status</th><th className="py-2 pr-3">Change</th><th className="py-2 pr-3">By</th><th className="py-2 pr-3">When</th><th className="py-2">File</th></tr></thead>
            <tbody>{visible.map((d) => (
              <tr key={d.id} className="border-b border-slate-50 last:border-b-0">
                <td className="py-2 pr-3 font-bold text-slate-700">{DOC_TYPE_LABELS[d.type] || d.type}{d.data?.kind ? ` (${d.data.kind})` : ''}</td><td className="py-2 pr-3">v{d.version}</td>
                <td className="py-2 pr-3"><Chip tone={d.status === 'SUPERSEDED' ? 'slate' : toneForStatus(d.status)}>{d.status.replace('_', ' ')}</Chip></td>
                <td className="py-2 pr-3 text-slate-500">{d.changeSummary || '—'}</td><td className="py-2 pr-3 text-slate-500">{d.createdBy}</td><td className="py-2 pr-3 text-slate-400 whitespace-nowrap">{new Date(d.createdAt).toLocaleString()}</td>
                <td className="py-2">{d.file ? <button type="button" onClick={() => openDataUrl(d.file, () => showToast('Could not open the file', 'warning'))} className="font-bold text-emerald-600 hover:underline">View</button> : '—'}</td>
              </tr>))}</tbody>
          </table></div>
        )}
      </SectionCard>
    </div>
  );
};

export default DocumentsTab;