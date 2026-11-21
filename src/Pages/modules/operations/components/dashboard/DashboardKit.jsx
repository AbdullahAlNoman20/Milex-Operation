// src/Pages/modules/operations/components/dashboard/DashboardKit.jsx
// Shared dashboard building blocks: header with instruction, summary tiles, notifications for every role.
import { Link } from 'react-router-dom';
import { Bell, ChevronRight, Info } from 'lucide-react';
import InfoTooltip from '../InfoTooltip';
import { useOperationsAuth } from '../../hooks/useOperationsAuth';
import { usePendingTasks } from '../../hooks/usePendingTasks';
import { useClientNotifications } from '../../hooks/useClientNotifications';
import { useLanguage } from '../../hooks/useLanguage';
import { OPERATIONS_ROLES as R, ROLE_HOME } from '../../constants/operationsRoles';

// Plain, big welcome — no background, no instruction cards (instructions live only where an action is needed).
export const DashboardHeader = ({ title, subtitle, help }) => (
  <div className="flex items-start justify-between gap-3 anim-fade-up">
    <div className="min-w-0">
      <h1 className="text-2xl sm:text-3xl font-black text-slate-800 leading-tight">{title}</h1>
      {subtitle && <p className="text-sm text-slate-500 mt-1">{subtitle}</p>}
    </div>
    {help && <span className="shrink-0"><InfoTooltip text={help} /></span>}
  </div>
);

export const SummaryGrid = ({ children }) => (
  <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-3">{children}</div>
);

export const SummaryCard = ({ label, value, to, alert = false, hint }) => (
  <Link to={to} title={hint} className={`group bg-white rounded-xl border p-4 card-hover hover:border-emerald-400 block ${alert && Number(value) > 0 ? 'border-amber-300 bg-amber-50/40' : 'border-slate-200'}`}>
    <div className="flex items-start justify-between">
      <p className={`text-3xl font-black ${alert && Number(value) > 0 ? 'text-amber-600' : 'text-slate-800'}`}>{value}</p>
      <ChevronRight size={16} className="text-slate-300 group-hover:text-emerald-500 transition mt-1" />
    </div>
    <p className="text-xs font-bold text-slate-600 mt-1">{label}</p>
    {hint && <p className="text-[10px] text-slate-400 mt-0.5 leading-snug">{hint}</p>}
  </Link>
);

// Notifications on the dashboard — every role sees what needs them, each row opens the right place.
export const NotificationsPanel = () => {
  const { currentUser } = useOperationsAuth();
  const { t, tStatus } = useLanguage();
  const isClient = currentUser?.role === R.CLIENT;
  const pending = usePendingTasks();
  const clientN = useClientNotifications();
  const base = ROLE_HOME[currentUser?.role] || '/operations';
  const page = `${base}/notifications`;
  const row = (key, text, sub, to) => ({ key, text, sub, to: to || `${page}?item=${encodeURIComponent(key)}` });

  const items = isClient
    ? [
        ...clientN.items.filter((m) => m.unread).slice(0, 6).map((m) => row(`m-${m.shipmentId}-${m.id}`, m.text, m.shipmentId)),
        ...pending.shipmentTasks.slice(0, 6).map((s) => row(`s-${s.id}`, `${s.shipmentId} — ${tStatus(s.statusCode, s.statusLabel)}`, t('notif.needsAction', 'Needs your action'), `${base}/shipments/${encodeURIComponent(s.shipmentId)}`)),
      ]
    : [
        ...pending.approvalTasks.slice(0, 5).map((a) => row(`a-${a.id}`, `${a.shipmentId}: ${a.gateLabel}`, `Approval requested by ${a.requestedBy?.name || ''}`)),
        ...pending.courierTasks.slice(0, 4).map((x) => row(`c-${x.id}`, `${x.taskNo} — ${x.shipmentId}`, x.type)),
        ...pending.reviewTasks.slice(0, 4).map((x) => row(`r-${x.id}`, `${x.taskNo} awaiting review`, x.shipmentId)),
        ...pending.evidenceTasks.slice(0, 3).map((e) => row(`v-${e.id}`, 'Evidence awaiting verification', e.shipmentId)),
        ...(pending.requestTasks || []).slice(0, 5).map((r) => row(`q-${r.id}`, `${r.requestNo}: ${r.clientName}${r.country ? ` · ${r.country}` : ''}`, currentUser?.role === R.KAM ? (r.reminders?.length ? 'Reminder from the Operations Head' : 'Client request') : `With KAM · ${r.reminders?.length || 0} reminder(s)`, `${base}/${currentUser?.role === R.KAM ? 'requests' : 'requests'}`)),
        ...pending.shipmentTasks.slice(0, 6).map((s) => row(`s-${s.id}`, `${s.shipmentId} — ${tStatus(s.statusCode, s.statusLabel)}`, t('notif.needsAction', 'Needs your action'), `${base}/shipments/${encodeURIComponent(s.shipmentId)}`)),
      ].slice(0, 10);
  const count = isClient ? clientN.unreadCount + pending.shipmentTasks.length : pending.totalCount;

  return (
    <section className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
      <header className="flex items-center justify-between gap-2 px-5 py-3 border-b border-slate-100">
        <h2 className="flex items-center gap-2 text-sm font-black text-slate-800 uppercase tracking-wide"><Bell size={15} className="text-emerald-600" />{t('common.notifications', 'Notifications')}{count > 0 && <span className="min-w-[18px] h-[18px] px-1 rounded-full bg-red-600 text-white text-[10px] font-bold flex items-center justify-center">{count}</span>}</h2>
        <Link to={page} className="text-xs font-bold text-emerald-600 hover:underline">{t('common.viewAll', 'View all')}</Link>
      </header>
      <p className="px-5 pt-3 text-[11px] text-slate-400 flex items-start gap-1.5"><Info size={12} className="mt-0.5 shrink-0" />{t('dash.clickRow', 'Click a row to open it and do the next step.')}</p>
      {items.length === 0 ? (
        <p className="p-6 text-sm text-slate-400 text-center">{t('common.noNotifications', 'Nothing needs your attention right now.')}</p>
      ) : (
        <ul className="divide-y divide-slate-50 p-2">
          {items.map((it) => (
            <li key={it.key}>
              <Link to={it.to} className="flex items-center justify-between gap-3 rounded-lg px-3 py-2.5 hover:bg-emerald-50/60 transition">
                <span className="min-w-0"><span className="block text-sm font-semibold text-slate-800 truncate">{it.text}</span>{it.sub && <span className="block text-[11px] text-slate-400 truncate">{it.sub}</span>}</span>
                <ChevronRight size={15} className="text-slate-300 shrink-0" />
              </Link>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
};
