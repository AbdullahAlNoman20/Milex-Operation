// src/Pages/modules/operations/pages/Shared/TrackShipment.jsx   (সম্পূর্ণ বদলান)
import { useState, useCallback, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Search, ArrowLeft } from 'lucide-react';
import SectionCard from '../../components/SectionCard';
import Chip from '../../components/Chip';
import WaitingForBadge from '../../components/WaitingForBadge';
import ShipmentTrackingView from '../../components/tracking/ShipmentTrackingView';
import Loader from '../../../../../Components/Shared/Loader';
import { useOperationsAuth } from '../../hooks/useOperationsAuth';
import { useLanguage } from '../../hooks/useLanguage';
import { useDataVersion } from '../../hooks/useDataVersion';
import { fetchShipments, fetchShipmentById } from '../../services/shipmentService';
import { filterVisibleShipments } from '../../services/accessService';

const Cut = ({ text, w = 'max-w-[150px]' }) => <span title={text || ''} className={`block truncate ${w}`}>{text || '—'}</span>;

const TrackShipment = () => {
  const { currentUser } = useOperationsAuth();
  const { tStatus } = useLanguage();
  const version = useDataVersion();
  const [params, setParams] = useSearchParams();
  const q = params.get('q') || '';
  const [query, setQuery] = useState(q);
  const [shipment, setShipment] = useState(null);
  const [overview, setOverview] = useState([]);
  const [searching, setSearching] = useState(false);
  const [searchError, setSearchError] = useState(null);

  const find = useCallback(async (text) => {
    const term = text.trim().toLowerCase();
    if (!term) return;
    setSearching(true); setSearchError(null);
    try {
      const mine = filterVisibleShipments(currentUser, await fetchShipments());
      const found = mine.find((s) => [s.shipmentId, s.awbNumber, s.mawb?.mawbNumber, s.tracking?.trackingNumber].some((v) => String(v || '').toLowerCase() === term));
      setShipment(found || null);
      if (!found) setSearchError('No shipment found for this number.');
    } catch { setSearchError('Failed to search. Please try again.'); } finally { setSearching(false); }
  }, [currentUser]);

  // URL-ই সত্য: ?q= থাকলে details, না থাকলে তালিকা
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (q) { setQuery(q); find(q); } else { setShipment(null); setSearchError(null); }
  }, [q, find]);

  useEffect(() => {
    let alive = true;
    fetchShipments().then((list) => {
      if (!alive) return;
      const mine = filterVisibleShipments(currentUser, list);
      setOverview([...mine].sort((a, b) => (String(a.updatedAt) < String(b.updatedAt) ? 1 : -1)));
      setShipment((cur) => (cur ? mine.find((x) => x.shipmentId === cur.shipmentId) || cur : cur));
    }).catch(() => {});
    return () => { alive = false; };
  }, [currentUser, version]);

  const open = (id) => setParams({ q: id });
  const back = () => { setQuery(''); setParams({}); };
  const onSearch = (e) => { e.preventDefault(); if (query.trim()) setParams({ q: query.trim() }); else back(); };
  const refresh = async (updated) => { setShipment(updated || (await fetchShipmentById(shipment.shipmentId))); };

  return (
    <div className="w-full space-y-5">
      <div><h1 className="text-xl font-black text-slate-800">Track Shipment</h1><p className="text-sm text-slate-500">Tap a row, or search by Shipment ID, MAWB or tracking number.</p></div>

      {shipment ? (
        <>
          <button type="button" onClick={back} className="flex items-center gap-2 text-sm font-bold text-slate-600 hover:text-emerald-700"><ArrowLeft size={16} /> Back to all shipments</button>
          <ShipmentTrackingView shipment={shipment} onChanged={refresh} />
        </>
      ) : (
        <>
          <SectionCard title="Search">
            <form onSubmit={onSearch} className="flex gap-3">
              <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="e.g. MLX-EXP-000001" maxLength={40} className="flex-1 min-w-0 border border-slate-300 rounded-lg p-2.5 text-sm bg-slate-50 focus:border-emerald-500 outline-none" />
              <button type="submit" disabled={searching} className="px-4 rounded-lg bg-emerald-600 text-white hover:bg-emerald-700 transition disabled:opacity-50 flex items-center gap-2"><Search size={16} /><span className="hidden sm:inline">{searching ? 'Searching...' : 'Track'}</span></button>
            </form>
            {searchError && <p className="text-xs text-red-600 font-semibold mt-2">{searchError}</p>}
          </SectionCard>

          {searching ? <Loader label="Searching..." /> : (
            <SectionCard title={`Shipments (${overview.length})`}>
              {overview.length === 0 ? <p className="text-sm text-slate-400">No shipments yet.</p> : (
                <>
                  <div className="md:hidden space-y-3">
                    {overview.map((s) => (
                      <button key={s.id} type="button" onClick={() => open(s.shipmentId)} className="w-full text-left bg-white border border-slate-200 rounded-2xl p-4 active:bg-emerald-50">
                        <div className="flex items-start justify-between gap-2"><p className="text-sm font-black text-emerald-700">{s.shipmentId}</p><Chip tone="blue">{tStatus(s.statusCode, s.statusLabel)}</Chip></div>
                        <p className="text-xs text-slate-600 mt-1 truncate">{s.mode} · {s.route?.originCountry} → {s.route?.destCountry}</p>
                        <p className="text-[11px] text-slate-400 truncate">{s.tracking?.trackingNumber || 'No tracking no.'}</p>
                      </button>))}
                  </div>
                  <div className="hidden md:block overflow-x-auto rounded-xl border border-emerald-100">
                    <table className="w-full text-sm">
                      <thead><tr className="bg-emerald-50 text-left text-[10px] font-black text-emerald-800 uppercase tracking-wide"><th className="py-3 px-4">Shipment</th><th className="py-3 px-3">Mode</th><th className="py-3 px-3">Route</th><th className="py-3 px-3">Tracking No.</th><th className="py-3 px-3">Status</th><th className="py-3 px-3">Waiting On</th></tr></thead>
                      <tbody>{overview.map((s, i) => (
                        <tr key={s.id} onClick={() => open(s.shipmentId)} className={`cursor-pointer border-t border-slate-100 hover:bg-emerald-50/60 transition ${i % 2 ? 'bg-slate-50/50' : 'bg-white'}`}>
                          <td className="py-3 px-4 font-bold text-emerald-700 whitespace-nowrap">{s.shipmentId}</td>
                          <td className="py-3 px-3 text-slate-600 text-xs">{s.mode}</td>
                          <td className="py-3 px-3 text-slate-600 text-xs"><Cut text={`${s.route?.originCountry || ''} → ${s.route?.destCountry || ''}`} w="max-w-[150px]" /></td>
                          <td className="py-3 px-3 text-slate-600 text-xs"><Cut text={s.tracking?.trackingNumber} w="max-w-[130px]" /></td>
                          <td className="py-3 px-3"><Chip tone="blue">{tStatus(s.statusCode, s.statusLabel)}</Chip></td>
                          <td className="py-3 px-3"><WaitingForBadge shipment={s} /></td>
                        </tr>))}</tbody>
                    </table>
                  </div>
                </>
              )}
            </SectionCard>
          )}
        </>
      )}
    </div>
  );
};

export default TrackShipment;