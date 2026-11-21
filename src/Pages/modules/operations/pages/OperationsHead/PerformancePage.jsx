import { useState, useEffect, useMemo } from 'react';
import SectionCard from '../../components/SectionCard';
import { Donut, Bars } from '../../components/charts/Charts';
import { inp } from '../../components/Field';
import Loader from '../../../../../Components/Shared/Loader';
import { fetchTasks } from '../../services/taskService';
import { fetchStatusLogs } from '../../services/statusLogService';
import { fetchShipments } from '../../services/shipmentService';
import { fetchUsersByRole } from '../../services/userDirectoryService';
import { fetchClients } from '../../services/clientService';
import { sameId } from '../../services/serviceUtils';
import { OPERATIONS_ROLES as R } from '../../constants/operationsRoles';

const TABS = [[R.COURIER, 'Courier Men'], [R.DOMESTIC_ADMIN, 'BD Supervisors'], [R.FOREIGN_ADMIN, 'Foreign Supervisors'], [R.CLIENT, 'Clients']];
const hrs = (a, b) => (new Date(b) - new Date(a)) / 36e5;
const avg = (a) => (a.length ? a.reduce((s, x) => s + x, 0) / a.length : 0);
const fmtH = (h) => (!h ? '—' : h < 24 ? `${h.toFixed(1)} h` : `${(h / 24).toFixed(1)} d`);

const keys = (period) => {
  const out = []; const now = new Date();
  if (period === 'daily') for (let i = 13; i >= 0; i -= 1) { const d = new Date(now); d.setDate(d.getDate() - i); out.push([d.toISOString().slice(0, 10), d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })]); }
  else for (let i = 5; i >= 0; i -= 1) { const d = new Date(now.getFullYear(), now.getMonth() - i, 1); out.push([`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`, d.toLocaleDateString('en-GB', { month: 'short', year: '2-digit' })]); }
  return out;
};

const summarize = (role, person, { tasks, logs, shipments }) => {
  const modeOf = Object.fromEntries(shipments.map((s) => [s.shipmentId, s.mode]));
  if (role === R.COURIER) {
    const items = tasks.filter((t) => !person || sameId(t.assignedTo?.email, person.email)).map((t) => ({ ...t, date: t.assignedAt }));
    const done = items.filter((t) => t.status === 'COMPLETED');
    const failed = items.filter((t) => t.status === 'FAILED');
    const onTime = done.filter((t) => t.completion?.actualAt && new Date(t.completion.actualAt) <= new Date(t.window.to));
    const avgH = avg(done.filter((t) => t.completion?.at).map((t) => hrs(t.assignedAt, t.completion.at)));
    return { items, stats: [['Assigned', items.length], ['Completed', done.length], ['Failed', failed.length], ['On-time', done.length ? `${Math.round((onTime.length / done.length) * 100)}%` : '—'], ['Avg time to complete', fmtH(avgH)]],
      pie: [{ label: 'Completed', value: done.length, color: '#059669' }, { label: 'Failed', value: failed.length, color: '#dc2626' }, { label: 'Active', value: items.length - done.length - failed.length, color: '#f59e0b' }] };
  }
  if (role === R.CLIENT) {
    const items = shipments.filter((s) => !person || sameId(s.clientEmail, person.email)).map((s) => ({ ...s, date: s.createdAt }));
    const closed = items.filter((s) => s.statusCode === 'CLOSED').length;
    const exp = items.filter((s) => s.mode === 'EXPORT').length;
    return { items, stats: [['Shipments', items.length], ['Export', exp], ['Import', items.length - exp], ['Closed', closed], ['Active', items.length - closed]],
      pie: [{ label: 'Export', value: exp, color: '#059669' }, { label: 'Import', value: items.length - exp, color: '#2563eb' }] };
  }
  const items = logs.filter((l) => l.role === role && (!person || l.updatedBy === person.name)).map((l) => ({ ...l, date: l.updatedAt }));
  const handled = new Set(items.map((l) => l.shipmentId));
  const spans = {};
  items.forEach((l) => { const k = `${l.updatedBy}|${l.shipmentId}`; const t = new Date(l.updatedAt).getTime(); spans[k] = spans[k] ? [Math.min(spans[k][0], t), Math.max(spans[k][1], t)] : [t, t]; });
  const avgSpan = avg(Object.values(spans).map(([a, b]) => (b - a) / 36e5));
  const exp = [...handled].filter((id) => modeOf[id] === 'EXPORT').length;
  return { items, stats: [['Actions', items.length], ['Shipments handled', handled.size], ['Avg handling time', fmtH(avgSpan)]],
    pie: [{ label: 'Export', value: exp, color: '#059669' }, { label: 'Import', value: handled.size - exp, color: '#2563eb' }] };
};

const PerformancePage = () => {
  const [data, setData] = useState(null);
  const [role, setRole] = useState(R.COURIER);
  const [email, setEmail] = useState('');
  const [period, setPeriod] = useState('daily');

  useEffect(() => {
    let a = true;
    Promise.all([fetchTasks(), fetchStatusLogs(), fetchShipments(), fetchUsersByRole(R.COURIER), fetchUsersByRole(R.DOMESTIC_ADMIN), fetchUsersByRole(R.FOREIGN_ADMIN), fetchClients()])
      .then(([tasks, logs, shipments, c, d, f, cl]) => a && setData({ tasks, logs, shipments, people: { [R.COURIER]: c, [R.DOMESTIC_ADMIN]: d, [R.FOREIGN_ADMIN]: f, [R.CLIENT]: cl.map((x) => ({ email: x.email, name: x.accountName })) } }));
    return () => { a = false; };
  }, []);

  const people = useMemo(() => data?.people[role] || [], [data, role]);
  const person = people.find((p) => p.email === email) || null;
  const sum = useMemo(() => (data ? summarize(role, person, data) : null), [data, role, person]);
  const series = useMemo(() => (sum ? keys(period).map(([k, label]) => ({ label, value: sum.items.filter((x) => String(x.date || '').slice(0, period === 'daily' ? 10 : 7) === k).length })) : []), [sum, period]);
  const rows = useMemo(() => (data ? people.map((p) => ({ p, s: summarize(role, p, data) })) : []), [data, people, role]);

  if (!data) return <Loader label="Loading performance..." />;
  return (
    <div className="w-full space-y-5">
      <div><h1 className="text-xl font-black text-slate-800">Performance</h1><p className="text-sm text-slate-500">Work, handling time and activity of every role.</p></div>
      <div className="flex gap-1 border-b border-slate-200 overflow-x-auto">
        {TABS.map(([k, l]) => <button key={k} type="button" onClick={() => { setRole(k); setEmail(''); }} className={`px-4 py-2.5 text-xs font-bold whitespace-nowrap border-b-2 ${role === k ? 'border-emerald-600 text-emerald-700' : 'border-transparent text-slate-400'}`}>{l}</button>)}
      </div>
      <div className="flex flex-wrap gap-2">
        <select value={email} onChange={(e) => setEmail(e.target.value)} className={`${inp} sm:w-64`}><option value="">All</option>{people.map((p) => <option key={p.email} value={p.email}>{p.name}</option>)}</select>
        <div className="flex rounded-lg border border-slate-200 overflow-hidden">{[['daily', 'Daily (14 days)'], ['monthly', 'Monthly (6 months)']].map(([k, l]) => <button key={k} type="button" onClick={() => setPeriod(k)} className={`px-3 py-2 text-xs font-bold ${period === k ? 'bg-emerald-600 text-white' : 'bg-white text-slate-500'}`}>{l}</button>)}</div>
      </div>
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">{sum.stats.map(([l, v]) => <div key={l} className="bg-white rounded-xl border border-slate-200 p-4"><p className="text-2xl font-black text-slate-800">{v}</p><p className="text-[11px] font-bold text-slate-500 mt-1">{l}</p></div>)}</div>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2"><SectionCard title={period === 'daily' ? 'Work per Day' : 'Work per Month'}><Bars data={series} /></SectionCard></div>
        <SectionCard title="Split"><Donut data={sum.pie} /></SectionCard>
      </div>
      <SectionCard title="Ranking">
        <div className="overflow-x-auto rounded-xl border border-emerald-100"><table className="w-full text-sm">
          <thead><tr className="bg-emerald-50 text-left text-[10px] font-black text-emerald-800 uppercase"><th className="py-3 px-4">Name</th>{sum.stats.map(([l]) => <th key={l} className="py-3 px-3 whitespace-nowrap">{l}</th>)}</tr></thead>
          <tbody>{rows.map(({ p, s }, i) => <tr key={p.email} onClick={() => setEmail(p.email)} className={`cursor-pointer border-t border-slate-100 hover:bg-emerald-50/60 ${i % 2 ? 'bg-slate-50/50' : ''}`}><td className="py-3 px-4 font-bold text-slate-700 max-w-[180px] truncate">{p.name}</td>{s.stats.map(([l, v]) => <td key={l} className="py-3 px-3 text-slate-600 text-xs">{v}</td>)}</tr>)}</tbody>
        </table></div>
      </SectionCard>
    </div>
  );
};

export default PerformancePage;