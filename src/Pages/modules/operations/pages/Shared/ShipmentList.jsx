// src/Pages/modules/operations/pages/Shared/ShipmentList.jsx
import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import SectionCard from '../../components/SectionCard';
import Chip from '../../components/Chip';
import WaitingForBadge from '../../components/WaitingForBadge';
import NewShipmentButton from '../../components/workspace/NewShipmentButton';
import Loader from '../../../../../Components/Shared/Loader';
import { useOperationsAuth } from '../../hooks/useOperationsAuth';
import { useLanguage } from '../../hooks/useLanguage';
import { useDataVersion } from '../../hooks/useDataVersion';
import { fetchShipments } from '../../services/shipmentService';
import { filterVisibleShipments } from '../../services/accessService';
import { getWaitingForInfo } from '../../constants/shipmentStatus';
import { OPERATIONS_ROLES as R, ROLE_HOME } from '../../constants/operationsRoles';

const PAGE = 25;
const Cut = ({ text, w = 'max-w-[150px]' }) => <span title={text || ''} className={`block truncate ${w}`}>{text || '—'}</span>;

const ShipmentList = () => {
  const { currentUser } = useOperationsAuth();
  const { tStatus, tException } = useLanguage();
  const version = useDataVersion();
  const navigate = useNavigate();
  const [rows, setRows] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [mode, setMode] = useState('ALL');
  const [term, setTerm] = useState('');
  const [onlyMine, setOnlyMine] = useState(false);
  const [limit, setLimit] = useState(PAGE);
  const orderRef = useRef(null); // keeps the row order steady while statuses change
  const role = currentUser.role;
  const base = ROLE_HOME[role];
  const go = (s) => navigate(`${base}/shipments/${encodeURIComponent(s.shipmentId)}`);

  const load = useCallback(async () => {
    try {
      const list = filterVisibleShipments(currentUser, await fetchShipments());
      if (!orderRef.current) {
        // first open: the shipment worked on last is on top
        list.sort((a, b) => (a.updatedAt < b.updatedAt ? 1 : -1));
        orderRef.current = list.map((s) => s.id);
      } else {
        // later refreshes: nothing jumps. Brand-new shipments go on top, everything else keeps its place.
        const known = new Set(orderRef.current);
        const fresh = list.filter((s) => !known.has(s.id)).sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1)).map((s) => s.id);
        orderRef.current = [...fresh, ...orderRef.current];
      }
      const pos = new Map(orderRef.current.map((id, i) => [id, i]));
      setRows(list.sort((a, b) => pos.get(a.id) - pos.get(b.id)));
    } finally { setIsLoading(false); }
  }, [currentUser]);
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { load(); }, [load, version]);

  const filtered = useMemo(() => {
    const q = term.trim().toLowerCase();
    return rows.filter((s) => (mode === 'ALL' || s.mode === mode)
      && (!onlyMine || getWaitingForInfo(s).ownerRole === role)
      && (!q || [s.shipmentId, s.awbNumber, s.mawb?.mawbNumber, s.tracking?.trackingNumber, s.clientName, s.parcel?.shipmentContents, s.refNo].some((v) => String(v || '').toLowerCase().includes(q))));
  }, [rows, mode, term, onlyMine, role]);

  if (isLoading && rows.length === 0) return <Loader label="Loading shipments..." />;
  const shown = filtered.slice(0, limit);
  const isClient = role === R.CLIENT;

  return (
    <div className="w-full space-y-5">
      <SectionCard title={`Shipments (${filtered.length})`} actions={
        <div className="flex flex-wrap items-center gap-2">
          <input value={term} onChange={(e) => { setTerm(e.target.value); setLimit(PAGE); }} placeholder="Search ID / MAWB / client" maxLength={60} className="border border-slate-300 rounded-lg px-3 py-2 text-xs bg-slate-50 focus:border-emerald-500 outline-none w-full sm:w-56" />
          <select value={mode} onChange={(e) => { setMode(e.target.value); setLimit(PAGE); }} className="border border-slate-300 rounded-lg px-3 py-2 text-xs bg-slate-50 outline-none"><option value="ALL">All Modes</option><option value="EXPORT">Export</option><option value="IMPORT">Import</option></select>
          <label className="flex items-center gap-1.5 text-xs font-bold text-slate-500"><input type="checkbox" checked={onlyMine} onChange={(e) => setOnlyMine(e.target.checked)} className="accent-emerald-600" /> Needs my action</label>
          {role === R.DOMESTIC_ADMIN && <NewShipmentButton />}
        </div>}>
        {filtered.length === 0 ? <p className="text-sm text-slate-400">No shipments match.</p> : (
          <>
            {/* ফোন: কার্ড */}
            <div className="md:hidden space-y-3">
              {shown.map((s) => (
                <button key={s.id} type="button" onClick={() => go(s)} className={`w-full text-left bg-white border border-slate-200 border-l-4 ${s.mode === 'IMPORT' ? 'border-l-sky-500' : 'border-l-emerald-500'} rounded-2xl p-4 active:bg-emerald-50 card-hover`}>
                  <div className="flex items-start justify-between gap-2"><p className="text-sm font-black text-emerald-700">{s.shipmentId}</p><Chip tone="blue">{tStatus(s.statusCode, s.statusLabel)}</Chip></div>
                  <p className="text-xs text-slate-600 mt-1 truncate">{!isClient && s.clientName ? `${s.clientName} · ` : ''}{s.mode} · {s.route?.originCountry} → {s.route?.destCountry}</p>
                  <p className="text-[11px] text-slate-400 truncate">{s.parcel?.shipmentContents} · {s.parcel?.weightKg} kg</p>
                  <div className="mt-2"><WaitingForBadge shipment={s} /></div>
                </button>))}
            </div>
            {/* ল্যাপটপ/ট্যাবলেট: টেবিল */}
            <div className="hidden md:block overflow-x-auto rounded-xl border border-emerald-100">
              <table className="w-full text-sm">
                <thead><tr className="bg-emerald-50 text-left text-[10px] font-black text-emerald-800 uppercase tracking-wide">
                  <th className="py-3 px-4">Shipment</th><th className="py-3 px-3">Mode</th>{!isClient && <th className="py-3 px-3">Client</th>}<th className="py-3 px-3">Route</th><th className="py-3 px-3">Contents</th><th className="py-3 px-3">Kg</th><th className="py-3 px-3">Status</th><th className="py-3 px-3">Waiting On</th>
                </tr></thead>
                <tbody>{shown.map((s, i) => (
                  <tr key={s.id} onClick={() => go(s)} className={`cursor-pointer border-t border-slate-100 border-l-4 ${s.mode === 'IMPORT' ? 'border-l-sky-500 hover:bg-sky-50/70' : 'border-l-emerald-500 hover:bg-emerald-50/70'} transition-colors duration-200 ${i % 2 ? 'bg-slate-50/50' : 'bg-white'}`}>
                    <td className="py-3 px-4"><span className="font-bold text-emerald-700 whitespace-nowrap">{s.shipmentId}</span><p className="text-[10px] text-slate-400">{new Date(s.updatedAt).toLocaleDateString()}</p></td>
                    <td className="py-3 px-3 text-slate-600 text-xs">{s.mode}</td>
                    {!isClient && <td className="py-3 px-3 text-slate-600"><Cut text={s.clientName} w="max-w-[130px]" /></td>}
                    <td className="py-3 px-3 text-slate-600 text-xs"><Cut text={`${s.route?.originCountry || ''} → ${s.route?.destCountry || ''}`} w="max-w-[140px]" /></td>
                    <td className="py-3 px-3 text-slate-600 text-xs"><Cut text={s.parcel?.shipmentContents} w="max-w-[130px]" /></td>
                    <td className="py-3 px-3 text-slate-600 text-xs">{s.parcel?.weightKg}</td>
                    <td className="py-3 px-3"><div className="flex flex-col gap-1 items-start"><Chip tone="blue">{tStatus(s.statusCode, s.statusLabel)}</Chip>{s.exceptionCode && <Chip tone="red">{tException(s.exceptionCode)}</Chip>}</div></td>
                    <td className="py-3 px-3"><WaitingForBadge shipment={s} /></td>
                  </tr>))}</tbody>
              </table>
            </div>
            {filtered.length > limit && <div className="text-center mt-4"><button type="button" onClick={() => setLimit((l) => l + PAGE)} className="text-xs font-bold text-emerald-600 hover:underline">Show more ({filtered.length - limit} remaining)</button></div>}
          </>
        )}
      </SectionCard>
    </div>
  );
};

export default ShipmentList;