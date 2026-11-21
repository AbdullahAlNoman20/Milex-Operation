import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import SectionCard from '../SectionCard';
import Chip from '../Chip';
import { inp } from '../Field';
import { useOperationsAuth } from '../../hooks/useOperationsAuth';
import { useToast } from '../../../../../Components/hooks/useToast';
import { buildClosureChecklist, closeShipment, closeTerminal, recordHeadAudit } from '../../services/closureService';
import { OPERATIONS_ROLES as R } from '../../constants/operationsRoles';

const isCandidate = (s) => s.statusCode !== 'CLOSED' && (s.mode === 'EXPORT' ? ['DELIVERED', 'POD_UPDATED'].includes(s.statusCode) : s.handlingPath === 'A' ? s.statusCode === 'SELF_CLEARED' : s.statusCode === 'POD_UPDATED');

const ClosurePanel = ({ shipment: s, onChanged }) => {
  const { currentUser } = useOperationsAuth();
  const { showToast } = useToast();
  const role = currentUser.role;
  const [check, setCheck] = useState(null);
  const outcome = s.handlingPath === 'A' ? 'SELF_CLEARED' : 'DELIVERED';
  const [note, setNote] = useState('');
  const [reason, setReason] = useState('');
  const [busy, setBusy] = useState(false);
  const candidate = role === R.DOMESTIC_ADMIN && isCandidate(s);
  const audit = s.closure?.headAudit;

  useEffect(() => { let a = true; if (candidate) buildClosureChecklist(s).then((c) => a && setCheck(c)).catch(() => {}); return () => { a = false; }; }, [candidate, s]);

  const run = async (fn, msg) => { setBusy(true); try { await fn(); showToast(msg); setNote(''); setReason(''); onChanged?.(); } catch (e) { showToast(e?.message || 'Failed', 'error'); } finally { setBusy(false); } };
  const showTerminal = role === R.OPERATIONS_HEAD && s.statusCode !== 'CLOSED';
  if (!candidate && !s.closure && !showTerminal) return null;

  return (
    <SectionCard title="Close this shipment" subtitle={candidate ? 'Everything below must be green. Then press Close.' : undefined}>
      {candidate && (
        <div className="space-y-3">
          {check && <ul className="grid gap-2 sm:grid-cols-3">{check.items.map((i) => <li key={i.key} className={`anim-pop text-xs font-bold flex items-center gap-2 rounded-lg border p-2.5 ${i.ok ? 'text-emerald-700 border-emerald-300 bg-emerald-50' : 'text-red-700 border-red-300 bg-red-50'}`}><span className="text-base">{i.ok ? '✔' : '✖'}</span><span>{i.label}</span></li>)}</ul>}
          <div className="flex flex-wrap gap-2 items-center">
                        <input value={note} maxLength={300} disabled={busy} onChange={(e) => setNote(e.target.value)} placeholder="Closure note (optional)" className={`${inp} flex-1 min-w-[160px]`} />
            <button type="button" disabled={busy || !check || check.blockers.length > 0} onClick={() => run(() => closeShipment(s.shipmentId, { outcome, note }, currentUser), 'Shipment closed')} className="text-sm font-bold bg-emerald-600 text-white px-6 py-2.5 rounded-lg hover:bg-emerald-700 disabled:opacity-40">Close shipment</button>
          </div>
        </div>
      )}
      {s.closure && (
        <div className="space-y-2">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-xs text-slate-600">{s.closure.outcome} · closed by {s.closure.closedBy} · {new Date(s.closure.closedAt).toLocaleString()}</p>
            <div className="flex items-center gap-2"><Link to={`/operations/documents/closure/${encodeURIComponent(s.shipmentId)}`} className="text-xs font-bold text-emerald-600 hover:underline">Closure Summary</Link>{audit ? <Chip tone={audit.result === 'OK' ? 'green' : 'red'}>Audit {audit.result}</Chip> : <Chip tone="amber">Awaiting audit</Chip>}</div>
          </div>
          {role === R.OPERATIONS_HEAD && !audit && (
            <div className="flex flex-wrap gap-2">
              <input value={note} maxLength={300} onChange={(e) => setNote(e.target.value)} placeholder="Audit comment (required to flag)" className={`${inp} flex-1 min-w-[180px]`} />
              <button type="button" disabled={busy} onClick={() => run(() => recordHeadAudit(s.shipmentId, { result: 'OK', comment: note }, currentUser), 'Audit recorded')} className="text-xs font-bold bg-emerald-600 text-white px-4 py-2 rounded-lg">Audit OK</button>
              <button type="button" disabled={busy || !note.trim()} onClick={() => run(() => recordHeadAudit(s.shipmentId, { result: 'FLAGGED', comment: note }, currentUser), 'Flagged')} className="text-xs font-bold bg-red-50 text-red-600 border border-red-200 px-4 py-2 rounded-lg disabled:opacity-40">Flag</button>
            </div>
          )}
        </div>
      )}
      {showTerminal && (
        <details className="mt-3"><summary className="text-xs font-bold text-red-600 cursor-pointer">Close as Cancelled / Returned</summary>
          <div className="flex flex-wrap gap-2 mt-2">
            <input value={reason} maxLength={300} onChange={(e) => setReason(e.target.value)} placeholder="Reason *" className={`${inp} flex-1 min-w-[180px]`} />
            {['CANCELLED', 'RETURNED'].map((o) => <button key={o} type="button" disabled={busy || !reason.trim()} onClick={() => run(() => closeTerminal(s.shipmentId, { outcome: o, reason }, currentUser), `Shipment ${o.toLowerCase()}`)} className="text-xs font-bold bg-red-600 text-white px-4 py-2 rounded-lg disabled:opacity-40">{o}</button>)}
          </div>
        </details>
      )}
    </SectionCard>
  );
};

export default ClosurePanel;