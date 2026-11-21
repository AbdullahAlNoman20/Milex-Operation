// src/Pages/modules/operations/pages/OperationsHead/ChangeRequests.jsx
// Shared page. KAM: take, answer and close client requests. Operations Head: see the status of every request
// and remind the KAM per client / per topic.
import { useState, useEffect, useCallback, useMemo } from 'react';
import { BellRing, Clock, CheckCircle2, Inbox } from 'lucide-react';
import Chip from '../../components/Chip';
import RequestThread from '../../components/requests/RequestThread';
import { inp } from '../../components/Field';
import Loader from '../../../../../Components/Shared/Loader';
import { useOperationsAuth } from '../../hooks/useOperationsAuth';
import { useDataVersion } from '../../hooks/useDataVersion';
import { useToast } from '../../../../../Components/hooks/useToast';
import { OPERATIONS_ROLES as R } from '../../constants/operationsRoles';
import {
  fetchChangeRequests, resolveChangeRequest, startChangeRequest, remindKam, markReminderSeen,
  REQUEST_TYPES, REQUEST_STATUS_LABEL, OPEN_REQUEST_STATUSES,
} from '../../services/changeRequestService';

const TONE = { PENDING: 'amber', IN_PROGRESS: 'blue', RESOLVED: 'green', REJECTED: 'red' };
const FILTERS = [['open', 'Open'], ['all', 'All'], ['done', 'Closed']];

const Row = ({ r, role, onDone }) => {
  const { currentUser } = useOperationsAuth();
  const { showToast } = useToast();
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);
  const isKam = role === R.KAM;
  const open = OPEN_REQUEST_STATUSES.includes(r.status);
  const run = async (fn, ok) => { setBusy(true); try { await fn(); showToast(ok); setText(''); onDone(); } catch (e) { showToast(e?.message || 'Failed', 'error'); } finally { setBusy(false); } };
  const reminders = r.reminders || [];
  const unseen = isKam && open && reminders.length > 0 && r.kamSeenReminder === false;
  return (
    <article className={`rounded-xl border bg-white p-4 space-y-3 transition hover:border-emerald-300 ${unseen ? 'border-red-300 bg-red-50/40' : open ? 'border-amber-200' : 'border-slate-200'}`}>
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="text-sm font-black text-slate-800">{r.requestNo} · {REQUEST_TYPES[r.type]}{r.source === 'AUTO' && <span className="ml-2 text-[10px] font-bold bg-sky-100 text-sky-700 px-1.5 py-0.5 rounded">AUTO</span>}</p>
          <p className="text-xs text-slate-500">{r.clientName} · {r.mode}{r.country ? ` · ${r.country}` : ''}{r.expectedWeightKg ? ` · ~${r.expectedWeightKg} kg` : ''}{r.shipmentId ? ` · ${r.shipmentId}` : ''}</p>
          <p className="text-[11px] text-slate-400">{new Date(r.createdAt).toLocaleString()}{r.assignedKam ? ` · KAM: ${r.assignedKam.name}` : ''}</p>
        </div>
        <Chip tone={TONE[r.status] || 'slate'}>{REQUEST_STATUS_LABEL[r.status] || r.status.replace(/_/g, ' ')}</Chip>
      </div>
      <p className="text-sm text-slate-700 leading-relaxed">{r.message}</p>

      {reminders.length > 0 && (
        <div className={`rounded-lg border p-2.5 text-xs ${unseen ? 'border-red-300 bg-red-50 text-red-700' : 'border-amber-200 bg-amber-50 text-amber-800'}`}>
          <p className="font-black flex items-center gap-1.5"><BellRing size={13} className={unseen ? 'animate-pulse' : ''} />{reminders.length} reminder{reminders.length > 1 ? 's' : ''} from the Operations Head</p>
          <p className="mt-1">“{reminders[reminders.length - 1].text}” — {new Date(reminders[reminders.length - 1].at).toLocaleString()}</p>
          {unseen && <button type="button" onClick={() => run(() => markReminderSeen(r.id), 'Reminder seen')} className="mt-2 text-[11px] font-bold underline">Mark as seen</button>}
        </div>
      )}
      <details className="group"><summary className="cursor-pointer text-xs font-bold text-emerald-700 list-none flex items-center gap-1.5 hover:underline">💬 Open messages{(r.messages || []).length ? ` (${r.messages.length})` : ''}{r.response ? ' · final reply sent' : ''}</summary><RequestThread r={r} onChanged={onDone} /></details>

      {isKam && open && (
        <div className="space-y-2 pt-1">
          <input value={text} maxLength={500} onChange={(e) => setText(e.target.value)} placeholder="Reply to the Client (required to close)" className={inp} />
          <div className="flex flex-wrap gap-2">
            {r.status === 'PENDING' && <button type="button" disabled={busy} onClick={() => run(() => startChangeRequest(r.id, currentUser), 'Request taken')} className="text-xs font-bold bg-sky-600 text-white px-4 py-2 rounded-lg hover:bg-sky-700 transition disabled:opacity-50">Take this request</button>}
            <button type="button" disabled={busy || !text.trim()} onClick={() => run(() => resolveChangeRequest(r.id, { status: 'RESOLVED', response: text }, currentUser), 'Reply sent')} className="text-xs font-bold bg-emerald-600 text-white px-4 py-2 rounded-lg hover:bg-emerald-700 transition disabled:opacity-50">Resolve</button>
            <button type="button" disabled={busy || !text.trim()} onClick={() => run(() => resolveChangeRequest(r.id, { status: 'REJECTED', response: text }, currentUser), 'Reply sent')} className="text-xs font-bold bg-white text-red-600 border border-red-200 px-4 py-2 rounded-lg hover:bg-red-50 transition disabled:opacity-50">Reject</button>
          </div>
        </div>
      )}
      {!isKam && open && (
        <div className="flex flex-wrap gap-2 pt-1">
          <input value={text} maxLength={300} onChange={(e) => setText(e.target.value)} placeholder="Reminder for the KAM (optional)" className={`${inp} flex-1 min-w-[200px]`} />
          <button type="button" disabled={busy} onClick={() => run(() => remindKam(r.id, text, currentUser), 'KAM reminded')} className="text-xs font-bold bg-amber-500 text-white px-4 py-2 rounded-lg hover:bg-amber-600 transition disabled:opacity-50 flex items-center gap-1.5"><BellRing size={13} />Remind KAM</button>
        </div>
      )}
    </article>
  );
};

const Stat = ({ icon: Icon, label, value, tone }) => (
  <div className={`rounded-xl border bg-white p-3 flex items-center gap-3 ${tone}`}><Icon size={20} /><div><p className="text-xl font-black leading-none">{value}</p><p className="text-[11px] font-bold text-slate-500 mt-1">{label}</p></div></div>
);

const ChangeRequests = () => {
  const { currentUser } = useOperationsAuth();
  const version = useDataVersion();
  const [list, setList] = useState(null);
  const [filter, setFilter] = useState('open');
  const role = currentUser?.role;
  const load = useCallback(async () => {
    const all = await fetchChangeRequests();
    setList(role === R.KAM ? all.filter((r) => !r.assignedKam || r.assignedKam.email?.toLowerCase() === currentUser.email.toLowerCase()) : all);
  }, [role, currentUser?.email]);
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { load(); }, [load, version]);

  const view = useMemo(() => {
    if (!list) return [];
    const f = filter === 'open' ? list.filter((r) => OPEN_REQUEST_STATUSES.includes(r.status)) : filter === 'done' ? list.filter((r) => !OPEN_REQUEST_STATUSES.includes(r.status)) : list;
    // reminded & oldest-waiting first inside the open list, newest first otherwise
    return filter === 'open' ? [...f].sort((a, b) => (b.lastReminderAt || '') .localeCompare(a.lastReminderAt || '') || (b.createdAt < a.createdAt ? -1 : 1)) : f;
  }, [list, filter]);
  if (!list) return <Loader label="Loading..." />;
  const openN = list.filter((r) => OPEN_REQUEST_STATUSES.includes(r.status)).length;
  return (
    <div className="w-full space-y-4">
      <div className="grid grid-cols-3 gap-3">
        <Stat icon={Inbox} label="Open" value={openN} tone="border-amber-200 text-amber-600" />
        <Stat icon={BellRing} label="Reminded" value={list.filter((r) => OPEN_REQUEST_STATUSES.includes(r.status) && r.reminders?.length).length} tone="border-red-200 text-red-600" />
        <Stat icon={CheckCircle2} label="Closed" value={list.length - openN} tone="border-emerald-200 text-emerald-600" />
      </div>
      <div className="flex gap-2 overflow-x-auto">
        {FILTERS.map(([k, label]) => <button key={k} type="button" onClick={() => setFilter(k)} className={`shrink-0 text-xs font-bold px-4 py-2 rounded-full border transition ${filter === k ? 'bg-emerald-600 text-white border-emerald-600' : 'bg-white text-slate-600 border-slate-200 hover:border-emerald-300'}`}>{label}</button>)}
      </div>
      {view.length === 0 ? <p className="text-sm text-slate-400 text-center py-10 flex items-center justify-center gap-2"><Clock size={16} />Nothing here.</p> : <div className="grid gap-3 lg:grid-cols-2">{view.map((r) => <Row key={r.id} r={r} role={role} onDone={load} />)}</div>}
    </div>
  );
};

export default ChangeRequests;
