// src/Pages/modules/operations/pages/Client/ClientDashboard.jsx
import { useEffect, useState, useCallback } from "react";
import { Link } from "react-router-dom";
import SectionCard from "../../components/SectionCard";
import WaitingForBadge from "../../components/WaitingForBadge";
import Loader from "../../../../../Components/Shared/Loader";
import { useOperationsAuth } from "../../hooks/useOperationsAuth";
import { useClientNotifications } from "../../hooks/useClientNotifications";
import { useDataVersion } from "../../hooks/useDataVersion";
import { fetchClients } from "../../services/clientService";
import { fetchShipmentsByClientEmail } from "../../services/shipmentService";
import { getSequence, getStatusIndex } from "../../constants/shipmentStatus";
import { humanizeStatus } from "../../../../../Components/utils/format";
import DashboardCharts from "../../components/charts/DashboardCharts";
import { DashboardHeader, NotificationsPanel } from "../../components/dashboard/DashboardKit";

const InfoRow = ({ label, value }) => (
  <div className="flex flex-col gap-0.5 py-2 border-b border-slate-100 last:border-b-0">
    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">
      {label}
    </span>
    <span className="text-sm font-semibold text-slate-800 break-words">
      {value || "—"}
    </span>
  </div>
);

const SummaryTile = ({ label, value, to, alert = false }) => (
  <Link
    to={to}
    className={`bg-white rounded-xl border shadow-sm p-4 hover:border-emerald-300 transition block ${alert && value > 0 ? "border-amber-300" : "border-slate-200"}`}
  >
    <p
      className={`text-3xl font-black ${alert && value > 0 ? "text-amber-600" : "text-slate-800"}`}
    >
      {value}
    </p>
    <p className="text-xs font-bold text-slate-500 mt-1">{label}</p>
  </Link>
);

const ClientDashboard = () => {
  const { currentUser } = useOperationsAuth();
  const { unreadCount } = useClientNotifications();
  const version = useDataVersion();
  const [client, setClient] = useState(null);
  const [shipments, setShipments] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState(null);

  const load = useCallback(async () => {
    try {
      setLoadError(null);
      const [clients, mine] = await Promise.all([
        fetchClients(),
        fetchShipmentsByClientEmail(currentUser?.email),
      ]);
      // never fall back to another client's profile
      setClient(
        clients.find(
          (c) => c.email?.toLowerCase() === currentUser?.email?.toLowerCase(),
        ) || null,
      );
      setShipments(mine);
    } catch {
      setLoadError("Failed to load your dashboard.");
    } finally {
      setIsLoading(false);
    }
  }, [currentUser]);

  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => {
    load();
  }, [load, version]);

  if (isLoading) return <Loader label="Loading your dashboard..." />;
  if (loadError)
    return (
      <p className="text-sm text-red-600 font-semibold p-6">{loadError}</p>
    );

  const lastCode = (s) => {
    const seq = getSequence(s.mode, s.handlingPath);
    return seq[seq.length - 1].code;
  };
  const active = shipments.filter((s) => s.statusCode !== lastCode(s));
  const drafts = shipments.filter((s) => s.statusCode === "DRAFT");
  const confirmations = shipments.filter(
    (s) => s.clientConfirmation?.status === "PENDING",
  );
  const selfClear = shipments.filter(
    (s) => s.statusCode === "DOCUMENTS_FORWARDED",
  );
  const needsMe = [
    ...confirmations,
    ...selfClear.filter((s) => !confirmations.includes(s)),
  ];
  const recent = [...shipments]
    .sort((a, b) => (a.updatedAt < b.updatedAt ? 1 : -1))
    .slice(0, 6);

  return (
    <div className="w-full space-y-6">
      <DashboardHeader
        title={`Welcome back, ${currentUser?.name?.split(" ")[0]}`}
      />

      <NotificationsPanel />

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
        <SummaryTile
          label="Needs My Action"
          value={needsMe.length}
          to="/operations/client/shipments"
          alert
        />
        <SummaryTile
          label="Unread Messages"
          value={unreadCount}
          to="/operations/client/notifications"
          alert
        />
        <SummaryTile
          label="Active Shipments"
          value={active.length}
          to="/operations/client/shipments"
        />
        <SummaryTile
          label="Drafts"
          value={drafts.length}
          to="/operations/client/shipments"
        />
        <SummaryTile
          label="All Shipments"
          value={shipments.length}
          to="/operations/client/shipments"
        />
      </div>

      {needsMe.length > 0 && (
        <SectionCard title="Waiting for You">
          <div className="space-y-2">
            {needsMe.map((s) => (
              <div
                key={s.id}
                className="border border-amber-300 bg-amber-50 rounded-lg p-3 flex flex-wrap items-center justify-between gap-2"
              >
                <div>
                  <p className="text-sm font-bold text-slate-800">
                    {s.shipmentId}{" "}
                    <span className="text-xs font-semibold text-slate-500">
                      · {s.mode}
                    </span>
                  </p>
                  <p className="text-xs text-amber-700">
                    {s.statusCode === "DOCUMENTS_FORWARDED"
                      ? "Documents forwarded — please confirm Receive / Self-Cleared"
                      : "Please review and confirm the commercial data entered by Operations"}
                  </p>
                </div>
                <Link
                  to={`/operations/client/shipments/${encodeURIComponent(s.shipmentId)}`}
                  className="text-xs font-bold bg-emerald-600 text-white px-3 py-1.5 rounded-lg hover:bg-emerald-700 transition"
                >
                  Review
                </Link>
              </div>
            ))}
          </div>
        </SectionCard>
      )}

      <DashboardCharts shipments={shipments} />
    </div>
  );
};

export default ClientDashboard;
