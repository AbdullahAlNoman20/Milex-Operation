// src/Pages/modules/operations/pages/Client/ClientRequests.jsx
import { useState, useEffect, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import SectionCard from '../../components/SectionCard';
import Chip from '../../components/Chip';
import Field, { inp } from '../../components/Field';
import Loader from '../../../../../Components/Shared/Loader';
import { useOperationsAuth } from '../../hooks/useOperationsAuth';
import { useDataVersion } from '../../hooks/useDataVersion';
import { useToast } from '../../../../../Components/hooks/useToast';
import { createChangeRequest, fetchMyChangeRequests, REQUEST_TYPES, REQUEST_STATUS_LABEL } from '../../services/changeRequestService';
import RequestThread from '../../components/requests/RequestThread';
import { WORLD_COUNTRIES } from '../../constants/countries';

const TONE = { PENDING: 'amber', IN_PROGRESS: 'blue', RESOLVED: 'green', REJECTED: 'red' };

const ClientRequests = () => {
  const { currentUser } = useOperationsAuth();
  const { showToast } = useToast();
  const version = useDataVersion();
  const [params] = useSearchParams();
  const [list, setList] = useState(null);
  const [busy, setBusy] = useState(false);
  const [f, setF] = useState({ type: REQUEST_TYPES[params.get('type')] ? params.get('type') : 'NEW_RATE', mode: 'EXPORT', country: params.get('country') || '', expectedWeightKg: '', shipmentId: '', message: '' });
  const set = (k) => (e) => setF((p) => ({ ...p, [k]: e.target.value }));
  const rateType = ['NEW_RATE', 'NEW_COUNTRY'].includes(f.type);

  const load = useCallback(async () => { setList(await fetchMyChangeRequests(currentUser.email)); }, [currentUser.email]);
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { load(); }, [load, version]);

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    try { await createChangeRequest(f, currentUser); showToast('Request sent to your KAM'); setF((p) => ({ ...p, message: '', country: '', expectedWeightKg: '', shipmentId: '' })); load(); }
    catch (err) { showToast(err?.message || 'Failed to send', 'error'); } finally { setBusy(false); }
  };

  if (!list) return <Loader label="Loading..." />;
  return (
    <div className="w-full space-y-6">
      <div><h1 className="text-xl font-black text-slate-800">Requests</h1><p className="text-sm text-slate-500">Your request goes to your Key Account Manager (KAM). Open any request to read the reply and write messages.</p></div>
      <SectionCard title="New Request">
        <form onSubmit={submit} className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Field label="What do you need?" required className="sm:col-span-2"><select disabled={busy} value={f.type} onChange={set('type')} className={inp}>{Object.entries(REQUEST_TYPES).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select></Field>
          {rateType && <>
            <Field label="Mode"><select disabled={busy} value={f.mode} onChange={set('mode')} className={inp}><option value="EXPORT">Export</option><option value="IMPORT">Import</option></select></Field>
            <Field label="Country" required><select disabled={busy} value={f.country} onChange={set('country')} className={inp}><option value="">Select country…</option>{WORLD_COUNTRIES.map((c) => <option key={c} value={c}>{c}</option>)}</select></Field>
            <Field label="Expected weight per shipment (kg)"><input type="number" min="0" step="0.1" disabled={busy} value={f.expectedWeightKg} onChange={set('expectedWeightKg')} className={inp} /></Field>
          </>}
          {!rateType && <Field label="Shipment ID (if related)"><input disabled={busy} value={f.shipmentId} maxLength={40} placeholder="MLX-EXP-000001" onChange={set('shipmentId')} className={inp} /></Field>}
          <Field label="Details" required className="sm:col-span-2"><textarea rows={4} disabled={busy} value={f.message} maxLength={1000} onChange={set('message')} className={inp} /></Field>
          <div className="sm:col-span-2"><button type="submit" disabled={busy} className="bg-emerald-600 text-white text-sm font-bold px-5 py-2.5 rounded-lg hover:bg-emerald-700 transition disabled:opacity-50">{busy ? 'Sending...' : 'Send to my KAM'}</button></div>
        </form>
      </SectionCard>
      <SectionCard title={`My Requests (${list.length})`}>
        {list.length === 0 ? <p className="text-sm text-slate-400">You have not sent any request yet.</p> : (
          <div className="space-y-2">{list.map((r) => (
            <details key={r.id} className="group border border-slate-200 rounded-xl p-3 hover:border-emerald-300 transition-colors">
              <summary className="cursor-pointer list-none">
                <div className="flex flex-wrap items-center justify-between gap-2"><p className="text-sm font-bold text-slate-700">{r.requestNo} · {REQUEST_TYPES[r.type]}{r.country ? ` · ${r.country}` : ''}{r.source === 'AUTO' && <span className="ml-2 text-[10px] font-bold bg-sky-100 text-sky-700 px-1.5 py-0.5 rounded">AUTO</span>}</p><Chip tone={TONE[r.status] || 'slate'}>{REQUEST_STATUS_LABEL[r.status] || r.status}</Chip></div>
                <p className="text-xs text-slate-500 mt-1">{r.message}</p>
                <p className="text-[11px] font-bold text-emerald-700 mt-2 group-open:hidden">Open ▸ {r.assignedKam ? `KAM: ${r.assignedKam.name}` : ''}{(r.messages || []).length ? ` · ${r.messages.length} message(s)` : ''}</p>
              </summary>
              <RequestThread r={r} onChanged={load} />
            </details>))}</div>
        )}
      </SectionCard>
    </div>
  );
};

export default ClientRequests;