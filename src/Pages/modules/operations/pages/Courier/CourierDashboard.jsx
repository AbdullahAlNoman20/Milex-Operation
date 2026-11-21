import { DashboardHeader, NotificationsPanel } from "../../components/dashboard/DashboardKit";
import { useState, useEffect, useCallback, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { MapPin, Clock, ChevronRight } from 'lucide-react';
import Chip, { toneForStatus } from '../../components/Chip';
import Loader from '../../../../../Components/Shared/Loader';
import { useOperationsAuth } from '../../hooks/useOperationsAuth';
import { useDataVersion } from '../../hooks/useDataVersion';
import { fetchTasksForUser, ACTIVE_TASK_STATUSES, TASK_STATUS } from '../../services/taskService';
import { TASK_TYPES } from '../../constants/shipmentFields';

const typeLabel = (t) => TASK_TYPES[t] || t.replace(/_/g, ' ');
const addr = (a = {}) => [a.address, a.city].filter(Boolean).join(', ');
const when = (d) => new Date(d).toLocaleString([], { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });

const Stat = ({ label, value, tone = 'text-slate-800' }) => (
  <div className="flex-1 bg-white rounded-xl border border-slate-200 p-3 text-center">
    <p className={`text-2xl font-black ${tone}`}>{value}</p>
    <p className="text-[10px] font-bold text-slate-500 mt-0.5">{label}</p>
  </div>
);

const TaskCard = ({ t }) => {
  const overdue = ACTIVE_TASK_STATUSES.includes(t.status) && new Date(t.window.to) < new Date();
  const returned = t.status === TASK_STATUS.ASSIGNED && t.review?.decision === 'RETURN';
  return (
    <Link to={`/operations/courier/tasks/${t.id}`} className={`block bg-white border rounded-2xl p-4 active:scale-[0.99] transition ${overdue ? 'border-red-300' : 'border-slate-200'}`}>
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="text-sm font-black text-slate-800">{typeLabel(t.type)}</p>
          <p className="text-[11px] text-slate-400">{t.taskNo} · {t.shipmentId}</p>
        </div>
        <div className="flex flex-col items-end gap-1 shrink-0">
          <Chip tone={toneForStatus(t.status)}>{t.status.replace('_', ' ')}</Chip>
          {returned && <Chip tone="amber">Returned</Chip>}
          {overdue && <Chip tone="red">Overdue</Chip>}
        </div>
      </div>
      <p className="flex items-start gap-1.5 text-xs text-slate-600 mt-3"><MapPin size={14} className="text-emerald-600 shrink-0 mt-0.5" /><span className="break-words">{t.address?.companyName}{addr(t.address) ? ` — ${addr(t.address)}` : ''}</span></p>
      <p className="flex items-center gap-1.5 text-xs text-slate-500 mt-1.5"><Clock size={14} className="shrink-0" />{when(t.window.from)} → {when(t.window.to)}</p>
      <div className="flex items-center justify-between mt-3 pt-3 border-t border-slate-100">
        <p className="text-xs text-slate-500">{t.expected?.pieces} pcs{t.expected?.weightKg ? ` · ${t.expected.weightKg} kg` : ''}</p>
        <span className="flex items-center text-xs font-bold text-emerald-700">Open <ChevronRight size={14} /></span>
      </div>
    </Link>
  );
};

const CourierDashboard = () => {
  const { currentUser } = useOperationsAuth();
  const version = useDataVersion();
  const [tasks, setTasks] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  const load = useCallback(async () => { try { setTasks(await fetchTasksForUser(currentUser.email)); } finally { setIsLoading(false); } }, [currentUser.email]);
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { load(); }, [load, version]);

  const { active, done, stats } = useMemo(() => {
    const act = tasks.filter((t) => ACTIVE_TASK_STATUSES.includes(t.status)).sort((a, b) => (a.window.from > b.window.from ? 1 : -1));
    const today = new Date().toDateString();
    return {
      active: act,
      done: tasks.filter((t) => !ACTIVE_TASK_STATUSES.includes(t.status)).slice(0, 10),
      stats: { today: act.filter((t) => new Date(t.window.from).toDateString() === today || new Date(t.window.to).toDateString() === today).length, active: act.length, overdue: act.filter((t) => new Date(t.window.to) < new Date()).length },
    };
  }, [tasks]);

  if (isLoading) return <Loader label="Loading your tasks..." />;

  return (
    <div className="w-full space-y-5 max-w-3xl mx-auto">
      <DashboardHeader title={`Hi, ${currentUser?.name?.split(' ')[0]}`} subtitle="Your pickups, collections and deliveries." help="Open a task, go to the address, collect the parcel and upload the proof. Today's tasks are first." steps={["Open the task.", "Go to the pickup address.", "Upload proof and finish the task."]} />
      <div className="flex gap-2"><Stat label="Today" value={stats.today} tone="text-emerald-700" /><Stat label="Active" value={stats.active} /><Stat label="Overdue" value={stats.overdue} tone={stats.overdue ? 'text-red-600' : 'text-slate-800'} /></div>

      <div className="space-y-3">
        <p className="text-xs font-black text-slate-500 uppercase tracking-wide">My Tasks</p>
        {active.length === 0 ? <p className="bg-white border border-slate-200 rounded-2xl p-6 text-sm text-slate-400 text-center">No tasks are assigned to you right now.</p> : active.map((t) => <TaskCard key={t.id} t={t} />)}
      </div>

      {done.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs font-black text-slate-500 uppercase tracking-wide">Done</p>
          {done.map((t) => (
            <Link key={t.id} to={`/operations/courier/tasks/${t.id}`} className="flex items-center justify-between gap-2 bg-white border border-slate-100 rounded-xl p-3">
              <div className="min-w-0"><p className="text-sm font-bold text-slate-700 truncate">{typeLabel(t.type)}</p><p className="text-[10px] text-slate-400">{t.taskNo} · {t.shipmentId}</p></div>
              <div className="flex gap-1.5 shrink-0"><Chip tone={toneForStatus(t.status)}>{t.status}</Chip>{t.review && <Chip tone={t.review.decision === 'ACCEPT' ? 'green' : 'amber'}>{t.review.decision}</Chip>}</div>
            </Link>))}
        </div>
      )}
    </div>
  );
};

export default CourierDashboard;