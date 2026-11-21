// src/Pages/modules/operations/pages/CNF/CnfDashboard.jsx
import { DashboardHeader, NotificationsPanel } from "../../components/dashboard/DashboardKit";
import { useState, useEffect, useCallback, useMemo } from 'react';
import { Link } from 'react-router-dom';
import SectionCard from '../../components/SectionCard';
import Chip from '../../components/Chip';
import WaitingForBadge from '../../components/WaitingForBadge';
import Loader from '../../../../../Components/Shared/Loader';
import { useOperationsAuth } from '../../hooks/useOperationsAuth';
import { useDataVersion } from '../../hooks/useDataVersion';
import { fetchShipments } from '../../services/shipmentService';
import { filterVisibleShipments } from '../../services/accessService';
import { getAllowedNextSteps } from '../../constants/shipmentStatus';

const HINTS = {
  EXPORT_CUSTOMS_CLEARANCE: 'Upload the signed / stamped originals in the shipment\'s Documents tab.',
  MANIFESTED: 'Needs an approved manifest that includes this shipment.',
  HANDED_OVER_TO_AIRLINE: 'Record the MAWB and flight number (Overview).',
  DEPARTED_ORIGIN: 'Enter the principal tracking number (Overview), then confirm departure.',
  CUSTOMS_CLEARANCE_IN_PROGRESS: 'Needs the complete import document pack.',
  CUSTOMS_ASSESSMENT: 'Optional — only if assessment / examination applies.',
};

const Tile = ({ label, value, to, alert = false }) => (
  <Link to={to} className={`bg-white rounded-xl border shadow-sm p-4 block ${alert && value > 0 ? 'border-amber-300' : 'border-slate-200'}`}>
    <p className={`text-3xl font-black ${alert && value > 0 ? 'text-amber-600' : 'text-slate-800'}`}>{value}</p>
    <p className="text-xs font-bold text-slate-500 mt-1">{label}</p>
  </Link>
);

const CnfDashboard = () => {
  const { currentUser } = useOperationsAuth();
  const version = useDataVersion();
  const [shipments, setShipments] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  const load = useCallback(async () => { try { setShipments(filterVisibleShipments(currentUser, await fetchShipments())); } finally { setIsLoading(false); } }, [currentUser]);
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { load(); }, [load, version]);

  const view = useMemo(() => {
    const open = shipments.filter((s) => s.statusCode !== 'CLOSED');
    return { open, withSteps: open.map((s) => ({ s, steps: getAllowedNextSteps(currentUser.role, s) })).filter((x) => x.steps.length > 0) };
  }, [shipments, currentUser.role]);

  if (isLoading) return <Loader label="Loading dashboard..." />;
  return (
    <div className="w-full space-y-5">
      <DashboardHeader title={`Hi, ${currentUser?.name?.split(' ')[0]}`} subtitle="Customs, signed documents and airline handover." help="Summary only. Click a card or a shipment to do the next step. Shipments, Tracking and Tasks are in the left menu." steps={["Open a shipment that needs you.", "Sign / clear the documents.", "Hand over to the airline."]} />
      <NotificationsPanel />
      <div className="grid grid-cols-2 gap-3">
        <Tile label="Needs My Action" value={view.withSteps.length} to="/operations/cnf/shipments" alert />
        <Tile label="Assigned Shipments" value={view.open.length} to="/operations/cnf/shipments" />
      </div>
      <SectionCard title="What You Need to Do">
        {view.withSteps.length === 0 ? <p className="text-sm text-slate-400">Nothing is waiting on you right now.</p> : (
          <div className="space-y-3">{view.withSteps.slice(0, 10).map(({ s, steps }) => (
            <Link key={s.id} to={`/operations/cnf/shipments/${encodeURIComponent(s.shipmentId)}`} className="block border border-slate-200 rounded-2xl p-4 hover:bg-emerald-50/40">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div><p className="text-sm font-black text-emerald-700">{s.shipmentId}</p><p className="text-xs text-slate-400">{s.clientName} · {s.mode} · {s.parcel?.pieces} pcs</p></div>
                <WaitingForBadge shipment={s} />
              </div>
              {steps.map((st) => {
                const locked = st.gate && s.gates?.[st.gate]?.status !== 'APPROVED';
                return <div key={st.code} className="flex flex-wrap items-start gap-2 text-xs mt-2"><Chip tone={locked ? 'amber' : 'green'}>{st.label}{locked ? ' · waiting for approval' : ''}</Chip><span className="text-slate-500 flex-1 min-w-[180px]">{HINTS[st.code] || st.description}</span></div>;
              })}
            </Link>))}</div>
        )}
      </SectionCard>
    </div>
  );
};

export default CnfDashboard;