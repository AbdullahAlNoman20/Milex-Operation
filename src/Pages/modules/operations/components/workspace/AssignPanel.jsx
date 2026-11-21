import { useState, useEffect, useCallback } from 'react';
import SectionCard from '../SectionCard';
import Chip, { toneForStatus } from '../Chip';
import Field, { inp } from '../Field';
import { useOperationsAuth } from '../../hooks/useOperationsAuth';
import { useDataVersion } from '../../hooks/useDataVersion';
import { useToast } from '../../../../../Components/hooks/useToast';
import { fetchTasksByShipment, assignPickupTask, assignCnf, reviewTask, cancelTask, rescheduleTask, ACTIVE_TASK_STATUSES, TASK_STATUS, FAILURE_TYPES } from '../../services/taskService';
import { fetchLatestDocuments } from '../../services/documentService';
import { fetchUsersByRole } from '../../services/userDirectoryService';
import { getDocStatus } from '../../utils/docCompleteness';
import { openDataUrl } from '../../utils/openFile';
import { REQUIRED_DOC_TYPES_BY_MODE } from '../../constants/shipmentFields';
import { OPERATIONS_ROLES as R } from '../../constants/operationsRoles';

const FINAL_OK = ['FINAL', 'APPROVED', 'FORWARDED'];
const pad = (x) => String(x).padStart(2, '0');
const plusHours = (h) => { const d = new Date(Date.now() + h * 3600000); return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`; };

const TaskRow = ({ t, couriers, onDone }) => {
  const { currentUser } = useOperationsAuth();
  const { showToast } = useToast();
  const [c, setC] = useState('');
  const [win, setWin] = useState({ from: plusHours(2), to: plusHours(6), courierEmail: '' });
  const [busy, setBusy] = useState(false);
  const run = async (fn, msg) => { setBusy(true); try { await fn(); showToast(msg); setC(''); onDone(); } catch (e) { showToast(e?.message || 'Failed', 'error'); } finally { setBusy(false); } };
  const comp = t.completion;
  const needsReview = t.status === TASK_STATUS.COMPLETED && !t.review;
  const movable = ACTIVE_TASK_STATUSES.includes(t.status) || t.status === TASK_STATUS.FAILED;
  return (
    <div className={`border rounded-lg p-3 space-y-2 ${comp?.discrepancy || t.failure ? 'border-red-300 bg-red-50/40' : 'border-slate-100'}`}>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div><p className="text-sm font-bold text-slate-700">{t.taskNo} · {t.type.replace('_', ' ')} — {t.assignedTo.name}</p><p className="text-[10px] text-slate-400">{new Date(t.window.from).toLocaleString()} → {new Date(t.window.to).toLocaleString()}</p></div>
        <Chip tone={toneForStatus(t.status)}>{t.status}</Chip>
      </div>
      {t.failure && <p className="text-xs text-red-700"><b>{FAILURE_TYPES[t.failure.type]}</b>: {t.failure.reason} — next: {t.failure.nextAction}</p>}
      {needsReview && comp && (
        <>
          <p className="text-xs text-slate-600">Expected {t.expected?.pieces} pcs · Actual <b className={Number(comp.actualPieces) !== Number(t.expected?.pieces) ? 'text-red-600' : ''}>{comp.actualPieces}</b> · {comp.condition}{comp.receiptNo ? ` · receipt ${comp.receiptNo}` : ''}{comp.receivedBy ? ` · received by ${comp.receivedBy}` : ''}</p>
          {comp.discrepancy && <p className="text-xs text-red-700 font-semibold">Discrepancy — {comp.discrepancy.type}: {comp.discrepancy.reason}. Next: {comp.discrepancy.nextAction}</p>}
          <div className="flex flex-wrap gap-3">{(comp.evidence || []).map((f, i) => <button key={i} type="button" onClick={() => openDataUrl(f)} className="text-[11px] font-bold text-emerald-600 hover:underline">Evidence {i + 1}</button>)}</div>
          <div className="flex flex-wrap gap-2">
            <input value={c} maxLength={300} onChange={(e) => setC(e.target.value)} placeholder="Comment (required to return / escalate)" className={`${inp} flex-1 min-w-[180px]`} />
            <button type="button" disabled={busy} onClick={() => run(() => reviewTask(t.id, 'ACCEPT', c, currentUser), 'Accepted')} className="text-xs font-bold bg-emerald-600 text-white px-3 py-2 rounded-lg disabled:opacity-50">Accept</button>
            <button type="button" disabled={busy || !c.trim()} onClick={() => run(() => reviewTask(t.id, 'RETURN', c, currentUser), 'Returned to courier')} className="text-xs font-bold bg-white border border-slate-300 text-slate-700 px-3 py-2 rounded-lg disabled:opacity-40">Return</button>
            <button type="button" disabled={busy || !c.trim()} onClick={() => run(() => reviewTask(t.id, 'EXCEPTION', c, currentUser), 'Kept as exception')} className="text-xs font-bold bg-red-50 border border-red-200 text-red-600 px-3 py-2 rounded-lg disabled:opacity-40">Exception</button>
          </div>
        </>
      )}
      {movable && (
        <details><summary className="text-xs font-bold text-slate-600 cursor-pointer">{t.status === TASK_STATUS.FAILED ? 'Reschedule / reassign' : 'Reschedule or cancel'}</summary>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-2 items-end mt-3">
            <Field label="From"><input type="datetime-local" disabled={busy} value={win.from} onChange={(e) => setWin((p) => ({ ...p, from: e.target.value }))} className={inp} /></Field>
            <Field label="To"><input type="datetime-local" disabled={busy} value={win.to} onChange={(e) => setWin((p) => ({ ...p, to: e.target.value }))} className={inp} /></Field>
            <Field label="Courier"><select disabled={busy} value={win.courierEmail} onChange={(e) => setWin((p) => ({ ...p, courierEmail: e.target.value }))} className={inp}><option value="">Keep current</option>{couriers.map((x) => <option key={x.email} value={x.email}>{x.name}</option>)}</select></Field>
            <Field label="Reason *"><input disabled={busy} value={c} maxLength={300} onChange={(e) => setC(e.target.value)} className={inp} /></Field>
            <div className="flex gap-2">
              <button type="button" disabled={busy || !c.trim()} onClick={() => run(() => rescheduleTask(t.id, { ...win, reason: c }, currentUser), 'Rescheduled')} className="text-xs font-bold bg-slate-800 text-white px-3 py-2.5 rounded-lg disabled:opacity-40">Reschedule</button>
              {t.status !== TASK_STATUS.FAILED && <button type="button" disabled={busy || !c.trim()} onClick={() => run(() => cancelTask(t.id, c, currentUser), 'Cancelled')} className="text-xs font-bold bg-red-50 text-red-600 border border-red-200 px-3 py-2.5 rounded-lg disabled:opacity-40">Cancel</button>}
            </div>
          </div>
        </details>
      )}
    </div>
  );
};

const AssignPanel = ({ shipment: s, onChanged }) => {
  const { currentUser } = useOperationsAuth();
  const { showToast } = useToast();
  const version = useDataVersion();
  const [tasks, setTasks] = useState([]);
  const [couriers, setCouriers] = useState([]);
  const [cnfs, setCnfs] = useState([]);
  const [latest, setLatest] = useState({});
  const [f, setF] = useState({ courierEmail: '', from: plusHours(2), to: plusHours(6), note: '' });
  const [cnfEmail, setCnfEmail] = useState(s.assignedCnf?.email || '');
  const [busy, setBusy] = useState(false);
    const isDom = currentUser.role === R.DOMESTIC_ADMIN;
  const isSup = isDom; // Foreign Supervisor has nothing to assign — tracking continues from the tracking number

  const load = useCallback(async () => {
    const [t, c, n, l] = await Promise.all([fetchTasksByShipment(s.shipmentId), fetchUsersByRole(R.COURIER), fetchUsersByRole(R.CNF), fetchLatestDocuments(s.shipmentId)]);
    setTasks(t); setCouriers(c); setCnfs(n); setLatest(l);
  }, [s.shipmentId]);
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { if (isSup) load(); }, [isSup, load, version]);
  if (!isSup || s.mode !== 'EXPORT' || s.statusCode === 'CLOSED') return null; // Import has no assigning — the Foreign Supervisor and the API run it

  const done = () => { load(); onChanged?.(); };
  const active = (type) => tasks.some((t) => t.type === type && ACTIVE_TASK_STATUSES.includes(t.status));
  const g = (k) => s.gates?.[k]?.status;
  const isExport = s.mode === 'EXPORT';

  let slot = null;
  if (isExport && s.statusCode === 'BOOKED') slot = { type: 'PICKUP', label: 'pickup', fn: assignPickupTask, ok: true, why: '' };
    if (!isDom) slot = null;
  const slotBusy = slot && active(slot.type);

  const required = REQUIRED_DOC_TYPES_BY_MODE[s.mode] || [];
  const docsFinal = required.every((t) => latest[t] && getDocStatus(t, s, latest[t]).complete && FINAL_OK.includes(latest[t].status));
  const cnfOk = (!isExport || g('GATE_2') === 'APPROVED') && docsFinal;
  const cnfWhy = isExport && g('GATE_2') !== 'APPROVED' ? 'Needs Client and Operations Head approval of the document pack first.' : 'Every document must be Final before a C&F is assigned.';

  const run = async (fn, msg) => { setBusy(true); try { await fn(); showToast(msg); done(); } catch (e) { showToast(e?.message || 'Failed', 'error'); } finally { setBusy(false); } };
  const set = (k) => (e) => setF((p) => ({ ...p, [k]: e.target.value }));
  const shownTasks = tasks.filter((t) => t.status !== TASK_STATUS.CANCELLED);

  return (
    <SectionCard title="Assign" subtitle="Courier Man for collection / delivery, and the C&F for customs.">
      <div className="space-y-5">
        {slot && !slotBusy && (
          <div>
            <p className="text-xs font-black text-slate-600 uppercase mb-2">1 · Courier Man — {slot.label}</p>
            {!slot.ok ? <p className="text-xs bg-amber-50 border border-amber-200 text-amber-700 rounded-lg p-2.5 font-semibold">🔒 {slot.why}</p> : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-2 items-end">
                <Field label="Courier Man" required><select disabled={busy} value={f.courierEmail} onChange={set('courierEmail')} className={inp}><option value="">Select...</option>{couriers.map((c) => <option key={c.email} value={c.email}>{c.name}</option>)}</select></Field>
                <Field label="Window from" required><input type="datetime-local" disabled={busy} value={f.from} onChange={set('from')} className={inp} /></Field>
                <Field label="Window to" required><input type="datetime-local" disabled={busy} value={f.to} onChange={set('to')} className={inp} /></Field>
                <Field label="Note"><input disabled={busy} value={f.note} maxLength={300} onChange={set('note')} className={inp} /></Field>
                <button type="button" disabled={busy || !f.courierEmail} onClick={() => run(() => slot.fn(s.shipmentId, f, currentUser), 'Courier assigned')} className="text-xs font-bold bg-emerald-600 text-white px-4 py-2.5 rounded-lg hover:bg-emerald-700 disabled:opacity-50">Assign</button>
              </div>
            )}
          </div>
        )}
        <div>
          <p className="text-xs font-black text-slate-600 uppercase mb-2">2 · C&F / Authorised Partner {s.assignedCnf ? `(current: ${s.assignedCnf.name})` : ''}</p>
          {s.assignedCnf ? (
            <div className="space-y-2">
              <div className="flex flex-wrap items-end gap-2 opacity-50 blur-[1px] pointer-events-none select-none" aria-hidden="true">
                <div className="flex-1 min-w-[200px]"><select value={s.assignedCnf.email} disabled className={inp}><option>{s.assignedCnf.name}</option></select></div>
                <button type="button" disabled className="text-xs font-bold bg-slate-400 text-white px-4 py-2.5 rounded-lg">Assign</button>
              </div>
              <p className="anim-pop flex items-center gap-2 text-sm font-bold text-emerald-800 bg-emerald-50 border border-emerald-300 rounded-lg p-3">✔ Assigned to {s.assignedCnf.name} <span className="text-[11px] font-semibold text-emerald-600">— locked, it cannot be changed</span></p>
            </div>
          ) : !cnfOk ? <p className="text-xs bg-amber-50 border border-amber-200 text-amber-700 rounded-lg p-2.5 font-semibold">🔒 {cnfWhy}</p> : (
            <div className="flex flex-wrap items-end gap-2">
              <div className="flex-1 min-w-[200px]"><select value={cnfEmail} disabled={busy} onChange={(e) => setCnfEmail(e.target.value)} className={inp}><option value="">Select the C&F...</option>{cnfs.map((c) => <option key={c.email} value={c.email}>{c.name}</option>)}</select></div>
              <button type="button" disabled={busy || !cnfEmail} onClick={() => { if (window.confirm('Assign this C&F? Once assigned it cannot be changed.')) run(() => assignCnf(s.shipmentId, cnfEmail, currentUser), 'C&F assigned'); }} className="text-xs font-bold bg-emerald-600 text-white px-4 py-2.5 rounded-lg hover:bg-emerald-700 disabled:opacity-50">Assign</button>
            </div>
          )}
        </div>
        {shownTasks.length > 0 && (<div><p className="text-xs font-black text-slate-600 uppercase mb-2">Tasks</p><div className="space-y-2">{shownTasks.map((t) => <TaskRow key={t.id} t={t} couriers={couriers} onDone={done} />)}</div></div>)}
      </div>
    </SectionCard>
  );
};

export default AssignPanel;