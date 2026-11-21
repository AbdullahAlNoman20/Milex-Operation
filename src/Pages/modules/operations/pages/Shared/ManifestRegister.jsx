// src/Pages/modules/operations/pages/Shared/ManifestRegister.jsx
// Central register of all manifests. Client sees only its own consignments (approved / final manifests).
import { useState, useEffect, useCallback, useMemo } from 'react';
import { Link } from 'react-router-dom';
import SectionCard from '../../components/SectionCard';
import Chip from '../../components/Chip';
import Field, { inp } from '../../components/Field';
import Loader from '../../../../../Components/Shared/Loader';
import { useOperationsAuth } from '../../hooks/useOperationsAuth';
import { useDataVersion } from '../../hooks/useDataVersion';
import { useToast } from '../../../../../Components/hooks/useToast';
import { fetchManifests, fetchManifestsForClient, fetchManifestHistory, setManifestStatus, saveAuthorisation } from '../../services/manifestService';
import { fetchShipments } from '../../services/shipmentService';
import { filterVisibleShipments } from '../../services/accessService';
import { prepareFile } from '../../services/fileService';
import { MANIFEST_TEMPLATES } from '../../constants/manifestTemplates';
import { OPERATIONS_ROLES as R, ROLE_HOME } from '../../constants/operationsRoles';

const TONE = { DRAFT: 'slate', PENDING_HEAD: 'amber', APPROVED: 'green', FINAL: 'blue', SUPERSEDED: 'slate' };

const AuthForm = ({ m, onSaved }) => {
  const { currentUser } = useOperationsAuth();
  const { showToast } = useToast();
  const a = m.authorisation || {};
  const [f, setF] = useState({ text: a.text || '', signatory: a.signatory || '', title: a.title || '', signedAt: a.signedAt || '', cnfRef: a.cnfRef || '' });
  const [file, setFile] = useState(a.file || null);
  const [busy, setBusy] = useState(false);
  const set = (k) => (e) => setF((p) => ({ ...p, [k]: e.target.value }));
  const pick = async (e) => { const x = e.target.files?.[0]; e.target.value = ''; if (!x) return; try { setFile(await prepareFile(x)); } catch (err) { showToast(err.message, 'warning'); } };
  const save = async () => { setBusy(true); try { await saveAuthorisation(m.id, { ...f, file }, currentUser); showToast('Authorisation saved'); onSaved?.(); } catch (e) { showToast(e?.message || 'Failed', 'error'); } finally { setBusy(false); } };
  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 mt-2">
      <Field label="Signatory *"><input disabled={busy} value={f.signatory} maxLength={100} onChange={set('signatory')} className={inp} /></Field>
      <Field label="Title"><input disabled={busy} value={f.title} maxLength={100} onChange={set('title')} className={inp} /></Field>
      <Field label="Signed on"><input type="date" disabled={busy} value={f.signedAt} onChange={set('signedAt')} className={inp} /></Field>
      <Field label="C&F reference"><input disabled={busy} value={f.cnfRef} maxLength={100} onChange={set('cnfRef')} className={inp} /></Field>
      <Field label="Authorisation text" className="sm:col-span-2"><input disabled={busy} value={f.text} maxLength={500} onChange={set('text')} className={inp} /></Field>
      <label className="text-xs font-bold text-emerald-600 cursor-pointer">{file ? `Scan: ${file.name}` : 'Upload signed / stamped back side (PDF, JPG, PNG)'}<input type="file" accept=".pdf,.jpg,.jpeg,.png" className="hidden" onChange={pick} /></label>
      <button type="button" disabled={busy} onClick={save} className="text-xs font-bold bg-slate-800 text-white px-4 py-2.5 rounded-lg disabled:opacity-50 sm:w-fit">Save Authorisation</button>
    </div>
  );
};

const ManifestRegister = () => {
  const { currentUser } = useOperationsAuth();
  const { showToast } = useToast();
  const version = useDataVersion();
  const role = currentUser.role;
  const [items, setItems] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [f, setF] = useState({ term: '', status: 'ALL', day: '' });
  const [openId, setOpenId] = useState(null);
  const [history, setHistory] = useState([]);
  const [busyId, setBusyId] = useState(null);

  const load = useCallback(async () => {
    try {
      let list;
      if (role === R.CLIENT) list = (await fetchManifestsForClient(currentUser.email)).filter((m) => ['APPROVED', 'FINAL'].includes(m.status));
      else {
        list = await fetchManifests();
        if (role === R.CNF) {
          const mine = new Set(filterVisibleShipments(currentUser, await fetchShipments()).map((s) => s.shipmentId));
          list = list.filter((m) => m.rows.some((r) => mine.has(r.shipmentId)) && ['APPROVED', 'FINAL'].includes(m.status));
        }
      }
      setItems(list);
    } finally { setIsLoading(false); }
  }, [role, currentUser]);
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { load(); }, [load, version]);

  const rows = useMemo(() => {
    const q = f.term.trim().toLowerCase();
    return items.filter((m) => (f.status === 'ALL' || m.status === f.status) && (!f.day || m.createdAt.slice(0, 10) === f.day)
      && (!q || [m.manifestNo, m.flight?.mawbNo, m.flight?.flightNo, m.route?.principal, ...m.rows.map((r) => r.shipmentId)].some((v) => String(v || '').toLowerCase().includes(q))));
  }, [items, f]);

  const toggle = async (m) => {
    const open = openId !== m.id;
    setOpenId(open ? m.id : null);
    if (open && role !== R.CLIENT) setHistory(await fetchManifestHistory(m.manifestNo));
  };
  const change = async (m, status) => {
    setBusyId(m.id);
    try { await setManifestStatus(m.id, status, currentUser); showToast(`Manifest ${status.replace('_', ' ').toLowerCase()}`); await load(); } catch (e) { showToast(e?.message || 'Action failed', 'error'); } finally { setBusyId(null); }
  };

  if (isLoading) return <Loader label="Loading manifests..." />;
  return (
    <div className="w-full space-y-6">
      <div><h1 className="text-xl font-black text-slate-800">Manifest Register</h1><p className="text-sm text-slate-500">{role === R.CLIENT ? 'Manifests that include your consignments — download them separately.' : 'Every manifest in one place, filterable by day, status and principal. Each change is a new version.'}</p></div>
      <SectionCard title={`Manifests (${rows.length})`} actions={
        <div className="flex flex-wrap gap-2">
          <input value={f.term} maxLength={40} onChange={(e) => setF((p) => ({ ...p, term: e.target.value }))} placeholder="Search no. / MAWB / flight / shipment" className="border border-slate-300 rounded-lg px-3 py-1.5 text-xs bg-slate-50 outline-none" />
          <input type="date" value={f.day} onChange={(e) => setF((p) => ({ ...p, day: e.target.value }))} className="border border-slate-300 rounded-lg px-3 py-1.5 text-xs bg-slate-50 outline-none" />
          {role !== R.CLIENT && <select value={f.status} onChange={(e) => setF((p) => ({ ...p, status: e.target.value }))} className="border border-slate-300 rounded-lg px-3 py-1.5 text-xs bg-slate-50 outline-none"><option value="ALL">All status</option>{['DRAFT', 'PENDING_HEAD', 'APPROVED', 'FINAL'].map((x) => <option key={x} value={x}>{x.replace('_', ' ')}</option>)}</select>}
          {[R.DOMESTIC_ADMIN, R.FOREIGN_ADMIN].includes(role) && <Link to={`${ROLE_HOME[role]}/manifests/new`} className="text-xs font-bold bg-emerald-600 text-white px-3 py-2 rounded-lg hover:bg-emerald-700 transition">+ New Manifest</Link>}
        </div>}>
        {rows.length === 0 ? <p className="text-sm text-slate-400">No manifests match.</p> : (
          <div className="space-y-2">{rows.map((m) => (
            <div key={m.id} className="border border-slate-100 rounded-lg overflow-hidden">
              <button type="button" onClick={() => toggle(m)} className="w-full flex flex-wrap items-center justify-between gap-2 p-3 text-left hover:bg-slate-50 transition">
                <div><p className="text-sm font-bold text-slate-700">{m.manifestNo} <span className="text-xs font-semibold text-slate-400">v{m.version}</span></p><p className="text-xs text-slate-400">{MANIFEST_TEMPLATES[m.templateCode]?.label} · {m.rows.length} consignment(s) · {m.totals.pieces} pcs · {m.totals.weightKg} kg · {new Date(m.createdAt).toLocaleDateString()}</p></div>
                <Chip tone={TONE[m.status]}>{m.status.replace('_', ' ')}</Chip>
              </button>
              {openId === m.id && (
                <div className="bg-slate-50 border-t border-slate-100 p-4 space-y-3">
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs"><p><b>Principal:</b> {m.route?.principal || '—'}</p><p><b>MAWB:</b> {m.flight?.mawbNo || '—'}</p><p><b>Flight:</b> {m.flight?.flightNo || '—'} {m.flight?.date}</p><p><b>Prepared by:</b> {m.preparedBy}</p></div>
                  <div className="flex flex-wrap gap-2">
                    <Link to={`/operations/documents/manifest/${m.id}`} className="text-xs font-bold bg-slate-800 text-white px-3 py-2 rounded-lg">View / Download</Link>
                    {[R.DOMESTIC_ADMIN, R.FOREIGN_ADMIN].includes(role) && m.status === 'DRAFT' && <Link to={`${ROLE_HOME[role]}/manifests/new?revise=${m.id}`} className="text-xs font-bold border border-slate-300 text-slate-700 px-3 py-2 rounded-lg">Revise (new version)</Link>}
                    {[R.DOMESTIC_ADMIN, R.FOREIGN_ADMIN].includes(role) && ['APPROVED', 'FINAL'].includes(m.status) && <Link to={`${ROLE_HOME[role]}/manifests/new?revise=${m.id}`} className="text-xs font-bold border border-amber-300 text-amber-700 px-3 py-2 rounded-lg">Revise (new version)</Link>}
                    {role === R.DOMESTIC_ADMIN && m.status === 'DRAFT' && <button type="button" disabled={busyId === m.id} onClick={() => change(m, 'PENDING_HEAD')} className="text-xs font-bold bg-emerald-600 text-white px-3 py-2 rounded-lg disabled:opacity-50">Request Head Approval</button>}
                    {role === R.OPERATIONS_HEAD && m.status === 'PENDING_HEAD' && <><button type="button" disabled={busyId === m.id} onClick={() => change(m, 'APPROVED')} className="text-xs font-bold bg-emerald-600 text-white px-3 py-2 rounded-lg disabled:opacity-50">Approve Manifest</button><button type="button" disabled={busyId === m.id} onClick={() => change(m, 'DRAFT')} className="text-xs font-bold bg-white border border-slate-300 text-slate-700 px-3 py-2 rounded-lg disabled:opacity-50">Return to Draft</button></>}
                    {[R.DOMESTIC_ADMIN, R.CNF].includes(role) && m.status === 'APPROVED' && <button type="button" disabled={busyId === m.id} onClick={() => change(m, 'FINAL')} className="text-xs font-bold bg-slate-800 text-white px-3 py-2 rounded-lg disabled:opacity-50">Mark Final</button>}
                  </div>
                  {[R.DOMESTIC_ADMIN, R.CNF].includes(role) && ['APPROVED', 'FINAL'].includes(m.status) && (<details><summary className="text-xs font-bold text-slate-600 cursor-pointer">Authorisation (back side) {m.authorisation ? `— ${m.authorisation.signatory}` : '— not recorded'}</summary><AuthForm m={m} onSaved={load} /></details>)}
                  {role !== R.CLIENT && history.length > 1 && <p className="text-[11px] text-slate-500"><b>Versions:</b> {history.map((h) => `v${h.version} (${h.status.replace('_', ' ')})`).join(' · ')}</p>}
                </div>
              )}
            </div>))}</div>
        )}
      </SectionCard>
    </div>
  );
};

export default ManifestRegister;