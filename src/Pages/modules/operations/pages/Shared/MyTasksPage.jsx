// src/Pages/modules/operations/pages/Shared/MyTasksPage.jsx   (সম্পূর্ণ বদলান)
import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import SectionCard from '../../components/SectionCard';
import Chip from '../../components/Chip';
import WaitingForBadge from '../../components/WaitingForBadge';
import { inp } from '../../components/Field';
import Loader from '../../../../../Components/Shared/Loader';
import { useOperationsAuth } from '../../hooks/useOperationsAuth';
import { usePendingTasks } from '../../hooks/usePendingTasks';
import { useClientNotifications } from '../../hooks/useClientNotifications';
import { useLanguage } from '../../hooks/useLanguage';
import { useToast } from '../../../../../Components/hooks/useToast';
import { markMessagesRead } from '../../services/shipmentService';
import { verifyEvidence } from '../../services/evidenceService';
import { OPERATIONS_ROLES as R, ROLE_HOME } from '../../constants/operationsRoles';


// Row ids match the NotificationBell keys: a- c- r- v- q- s- m-
const Row = ({ id, active, title, sub, to, cta = 'Open', right, children }) => (
  <div id={`n-${id}`} className={`border rounded-lg p-3 ${active ? 'border-emerald-500 ring-2 ring-emerald-200 bg-emerald-50/40' : 'border-slate-100'}`}>
    <div className="flex flex-wrap items-center justify-between gap-2">
      <div className="min-w-0"><p className="text-sm font-bold text-slate-700 break-words">{title}</p>{sub && <p className="text-xs text-slate-400 break-words">{sub}</p>}</div>
      <div className="flex items-center gap-3 shrink-0">{right}{to && <Link to={to} className="text-xs font-bold bg-emerald-600 text-white px-3 py-1.5 rounded-lg hover:bg-emerald-700 transition">{cta}</Link>}</div>
    </div>
    {children}
  </div>
);

const EvidenceRow = ({ e, active, base }) => {
  const { currentUser } = useOperationsAuth();
  const { showToast } = useToast();
  const [c, setC] = useState('');
  const [busy, setBusy] = useState(false);
  const act = async (d) => { setBusy(true); try { await verifyEvidence(e.id, d, c, currentUser); showToast(`Evidence ${d.toLowerCase()}`); } catch (x) { showToast(x?.message || 'Failed', 'error'); } finally { setBusy(false); } };
  return (
    <Row id={`v-${e.id}`} active={active} title={`${e.shipmentId} — ${e.eventType.replace(/_/g, ' ')}`} sub={`${e.uploadedBy} · ${e.result}${e.reference ? ` · ${e.reference}` : ''}`} to={`${base}/shipments/${encodeURIComponent(e.shipmentId)}`} cta="Shipment">
      <div className="flex flex-wrap gap-2 mt-2">
        <input value={c} maxLength={300} onChange={(x) => setC(x.target.value)} placeholder="Comment (required to reject)" className={`${inp} flex-1 min-w-[180px]`} />
        <button type="button" disabled={busy} onClick={() => act('VERIFIED')} className="text-xs font-bold bg-emerald-600 text-white px-3 py-2 rounded-lg disabled:opacity-50">Verify</button>
        <button type="button" disabled={busy || !c.trim()} onClick={() => act('REJECTED')} className="text-xs font-bold bg-red-50 text-red-600 border border-red-200 px-3 py-2 rounded-lg disabled:opacity-40">Reject</button>
      </div>
    </Row>
  );
};

const MyTasksPage = () => {
  const { currentUser } = useOperationsAuth();
  const { tStatus } = useLanguage();
  const { showToast } = useToast();
  const t = usePendingTasks();
  const n = useClientNotifications();
  const [params] = useSearchParams();
  const item = params.get('item') || '';
  const role = currentUser.role;
  const isClient = role === R.CLIENT;
  const base = ROLE_HOME[role];
  const loading = t.isLoading || n.isLoading;

  useEffect(() => {
    if (!item || loading) return undefined;
    const id = setTimeout(() => document.getElementById(`n-${item}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' }), 150);
    return () => clearTimeout(id);
  }, [item, loading]);

  if (loading) return <Loader label="Loading..." />;
  const ship = (id) => {
    if (role === R.COURIER) {
      const ct = t.courierTasks.find((x) => String(x.shipmentId) === String(id));
      return ct ? `${base}/tasks/${encodeURIComponent(ct.id)}` : base;
    }
    return `${base}/shipments/${encodeURIComponent(id)}`;
  };
  const markRead = async (id) => { try { await markMessagesRead(id, R.CLIENT); await n.reload(); } catch (e) { showToast(e?.message || 'Failed', 'error'); } };

  const newest = (arr, k) => [...arr].sort((a, b) => String(b[k] || '').localeCompare(String(a[k] || '')));
  const sections = [
    { title: role === R.KAM ? 'Client Requests Waiting for You' : 'Client Requests (with KAM)', rows: newest(t.requestTasks || [], 'updatedAt').map((r) => <Row key={r.id} id={`q-${r.id}`} active={item === `q-${r.id}`} title={`${r.requestNo} — ${r.clientName}${r.country ? ` · ${r.country}` : ''}`} sub={`${r.type.replace(/_/g, ' ').toLowerCase()} · ${new Date(r.createdAt).toLocaleString()}${r.reminders?.length ? ` · ${r.reminders.length} reminder(s)` : ''}`} right={r.reminders?.length ? <Chip tone="red">Reminded</Chip> : null} to={`${base}/requests`} cta={role === R.KAM ? 'Answer' : 'View'} />) },
    { title: 'Approvals Waiting for You', rows: newest(t.approvalTasks, 'requestedAt').map((a) => <Row key={a.id} id={`a-${a.id}`} active={item === `a-${a.id}`} title={`${a.shipmentId} — ${a.gateLabel}`} sub={`Requested by ${a.requestedBy.name} · ${new Date(a.requestedAt).toLocaleString()}`} to={`${base}/approvals`} cta="Decide" />) },
    { title: 'Courier Tasks', rows: newest(t.courierTasks, 'createdAt').map((x) => <Row key={x.id} id={`c-${x.id}`} active={item === `c-${x.id}`} title={`${x.taskNo} — ${x.type.replace('_', ' ')}`} sub={`${x.shipmentId} · ${new Date(x.window.from).toLocaleString()}`} to={`/operations/courier/tasks/${x.id}`} />) },
    { title: 'Task Completions to Review', rows: newest(t.reviewTasks, 'updatedAt').map((x) => <Row key={x.id} id={`r-${x.id}`} active={item === `r-${x.id}`} title={`${x.taskNo} — ${x.shipmentId}`} sub={x.completion?.discrepancy ? `Discrepancy: ${x.completion.discrepancy.reason}` : 'Completed — review it in the shipment'} to={ship(x.shipmentId)} cta="Review" />) },
    { title: 'Evidence to Verify', rows: t.evidenceTasks.map((e) => <EvidenceRow key={e.id} e={e} base={base} active={item === `v-${e.id}`} />) },
    { title: isClient ? 'Needs Your Action' : 'Shipments Waiting on You', rows: newest(t.shipmentTasks, 'updatedAt').map((s) => <Row key={s.id} id={`s-${s.id}`} active={item === `s-${s.id}`} title={`${s.shipmentId} — ${tStatus(s.statusCode, s.statusLabel)}`} sub={`${s.mode}${s.clientName ? ` · ${s.clientName}` : ''}`} right={<WaitingForBadge shipment={s} />} to={ship(s.shipmentId)} cta="Open" />) },
  ].filter((x) => x.rows.length > 0);

  const unread = n.items.filter((i) => i.unread).length;
  return (
    <div className="w-full space-y-6">
      <div><h1 className="text-xl font-black text-slate-800">Tasks & Notifications</h1><p className="text-sm text-slate-500">{t.totalCount} waiting on you{isClient ? ` · ${unread} unread message(s)` : ''}.</p></div>
      {sections.length === 0 && (!isClient || n.items.length === 0) && <SectionCard title="All Clear"><p className="text-sm text-slate-400">Nothing needs your attention right now.</p></SectionCard>}
      {sections.map((sec) => <SectionCard key={sec.title} title={`${sec.title} (${sec.rows.length})`}><div className="space-y-2">{sec.rows}</div></SectionCard>)}
      {isClient && n.items.length > 0 && (
        <SectionCard title={`Messages (${unread} unread)`}>
          <div className="space-y-2">{[...n.items].sort((a, b) => String(b.at).localeCompare(String(a.at))).map((m) => {
            const key = `m-${m.shipmentId}-${m.id}`;
            return <Row key={key} id={key} active={item === key} title={m.text} sub={`${m.shipmentId} · ${m.from?.name || ''} · ${new Date(m.at).toLocaleString()}`} to={ship(m.shipmentId)} cta="Open" right={m.unread ? <><Chip tone="amber">New</Chip><button type="button" onClick={() => markRead(m.shipmentId)} className="text-[10px] font-bold text-slate-400 hover:text-slate-600">Mark read</button></> : null} />;
          })}</div>
        </SectionCard>
      )}
    </div>
  );
};

export default MyTasksPage;