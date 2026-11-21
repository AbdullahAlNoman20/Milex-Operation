// src/Pages/modules/operations/components/NotificationBell.jsx
import { useState, useRef, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Bell } from 'lucide-react';
import { useOperationsAuth } from '../hooks/useOperationsAuth';
import { usePendingTasks } from '../hooks/usePendingTasks';
import { useClientNotifications } from '../hooks/useClientNotifications';
import { useLanguage } from '../hooks/useLanguage';
import { OPERATIONS_ROLES as R, ROLE_HOME } from '../constants/operationsRoles';

const NotificationBell = () => {
  const { currentUser } = useOperationsAuth();
  const { t, tStatus } = useLanguage();
  const isClient = currentUser?.role === R.CLIENT;
  const pending = usePendingTasks();
  const clientN = useClientNotifications();
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    const onClick = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, []);

  const sub = t('notif.needsAction', 'Needs your action');
  const items = isClient
    ? [
        ...clientN.items.filter((m) => m.unread).slice(0, 4).map((m) => ({ key: `m-${m.shipmentId}-${m.id}`, text: m.text, sub: m.shipmentId })),
        ...pending.shipmentTasks.slice(0, 4).map((s) => ({ key: `s-${s.id}`, text: `${s.shipmentId} — ${tStatus(s.statusCode, s.statusLabel)}`, sub })),
      ]
    : [
        ...pending.approvalTasks.slice(0, 3).map((a) => ({ key: `a-${a.id}`, text: `${a.shipmentId}: ${a.gateLabel}`, sub: a.requestedBy.name })),
        ...pending.courierTasks.slice(0, 3).map((x) => ({ key: `c-${x.id}`, text: `${x.taskNo} — ${x.shipmentId}`, sub: x.type })),
        ...(pending.requestTasks || []).slice(0, 3).map((r) => ({ key: `q-${r.id}`, text: `${r.requestNo}: ${r.clientName}`, sub: r.reminders?.length ? 'Reminder from the Operations Head' : 'Client request' })),
        ...pending.reviewTasks.slice(0, 2).map((x) => ({ key: `r-${x.id}`, text: `${x.taskNo} awaiting review`, sub: x.shipmentId })),
        ...pending.evidenceTasks.slice(0, 2).map((e) => ({ key: `v-${e.id}`, text: 'Evidence awaiting verification', sub: e.shipmentId })),
        ...pending.shipmentTasks.slice(0, 4).map((s) => ({ key: `s-${s.id}`, text: `${s.shipmentId} — ${tStatus(s.statusCode, s.statusLabel)}`, sub })),
      ].slice(0, 8);

  const count = isClient ? clientN.unreadCount + pending.shipmentTasks.length : pending.totalCount;
  const base = ROLE_HOME[currentUser?.role];
  const page = `${base}/notifications`;

  return (
    <div className="relative" ref={ref}>
      <button type="button" onClick={() => setOpen((o) => !o)} aria-label={t('common.notifications')} className="relative w-9 h-9 rounded-full bg-slate-50 text-slate-500 flex items-center justify-center hover:bg-slate-100 transition">
        <Bell size={16} />
        {count > 0 && <span className="absolute -top-1 -right-1 min-w-[16px] h-[16px] px-1 rounded-full bg-red-600 text-white text-[9px] font-bold flex items-center justify-center">{count}</span>}
      </button>
      {open && (
        <div className="fixed inset-x-3 top-16 sm:absolute sm:inset-x-auto sm:top-auto sm:right-0 sm:mt-2 sm:w-96 bg-white border border-slate-200 rounded-2xl shadow-xl z-50 overflow-hidden">
          <div className="px-4 py-3 border-b border-slate-100"><p className="text-sm font-black text-slate-800">{t('common.notifications')}</p></div>
          <div className="max-h-[60vh] sm:max-h-80 overflow-y-auto">
            {items.length === 0 ? <p className="text-xs text-slate-400 p-4 text-center">{t('common.noNotifications')}</p> : items.map((item) => (
              <Link key={item.key} to={`${page}?item=${encodeURIComponent(item.key)}`} onClick={() => setOpen(false)} className="block px-4 py-3 border-b border-slate-50 last:border-b-0 hover:bg-slate-50">
                <p className="text-xs font-bold text-slate-800">{item.text}</p>
                {item.sub && <p className="text-[10px] text-slate-400 mt-0.5">{item.sub}</p>}
              </Link>
            ))}
          </div>
          {base && <Link to={page} onClick={() => setOpen(false)} className="block text-center text-xs font-bold text-emerald-600 py-2.5 border-t border-slate-100 hover:bg-slate-50 transition">{t('common.viewAll')}</Link>}
        </div>
      )}
    </div>
  );
};

export default NotificationBell;