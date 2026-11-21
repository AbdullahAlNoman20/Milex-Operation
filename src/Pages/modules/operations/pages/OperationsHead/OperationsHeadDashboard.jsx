// src/Pages/modules/operations/pages/OperationsHead/OperationsHeadDashboard.jsx
import { useState, useEffect, useCallback, useMemo } from "react";
import { Link } from "react-router-dom";
import SectionCard from "../../components/SectionCard";
import Loader from "../../../../../Components/Shared/Loader";
import { useOperationsAuth } from "../../hooks/useOperationsAuth";
import { usePendingTasks } from "../../hooks/usePendingTasks";
import { useDataVersion } from "../../hooks/useDataVersion";
import { fetchShipments } from "../../services/shipmentService";
import { fetchStatusLogs } from "../../services/statusLogService";
import { getSequence } from "../../constants/shipmentStatus";
import { DashboardHeader, NotificationsPanel } from "../../components/dashboard/DashboardKit";
import DashboardCharts from "../../components/charts/DashboardCharts";

const Tile = ({ label, value, to, alert = false }) => (
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

const OperationsHeadDashboard = () => {
  const { currentUser } = useOperationsAuth();
  const tasks = usePendingTasks();
  const version = useDataVersion();
  const [shipments, setShipments] = useState([]);
  const [logs, setLogs] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      const [s, l] = await Promise.all([fetchShipments(), fetchStatusLogs()]);
      setShipments(s);
      setLogs(l.slice(0, 8));
    } finally {
      setIsLoading(false);
    }
  }, []);
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => {
    load();
  }, [load, version]);

  const stats = useMemo(() => {
    const done = (s) =>
      s.statusCode === getSequence(s.mode, s.handlingPath).slice(-1)[0].code;
    const open = shipments.filter((s) => !done(s));
    return {
      open: open.length,
      exceptions: open.filter((s) => s.exceptionCode).length,
      inTransit: open.filter(
        (s) =>
          s.tracking?.trackingNumber &&
          ["IN_TRANSIT", "ARRIVED_AT_TRANSIT_HUB", "DEPARTED_ORIGIN"].includes(
            s.statusCode,
          ),
      ).length,
      exportOpen: open.filter((s) => s.mode === "EXPORT").length,
      importOpen: open.filter((s) => s.mode === "IMPORT").length,
      toAudit: shipments.filter((s) => s.closure && !s.closure.headAudit)
        .length,
      clients: new Set(shipments.map((s) => s.clientEmail)).size,
    };
  }, [shipments]);

  if (isLoading) return <Loader label="Loading dashboard..." />;

  return (
    <div className="w-full space-y-6">
      <DashboardHeader
        title={`Welcome, ${currentUser?.name}`}
        subtitle="Company-wide operations summary."
        help="Summary only. Click any card to open that list. Approvals, clients, performance and the status log are in the left menu."
        steps={["Open Approvals Waiting and decide each request.", "Review tracking events and evidence if any are waiting.", "Use the cards below to watch open shipments and exceptions."]}
      />
      <NotificationsPanel />
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
        <Tile
          label="Approvals Waiting"
          value={tasks.approvalTasks.length}
          to="/operations/head/approvals"
          alert
        />
        <Tile
          label="Evidence to Verify"
          value={tasks.evidenceTasks.length}
          to="/operations/domestic/notifications"
          alert
        />
        <Tile
          label="Closed — Awaiting Audit"
          value={stats.toAudit}
          to="/operations/head/shipments"
          alert
        />
        <Tile
          label="Open Shipments"
          value={stats.open}
          to="/operations/head/shipments"
        />
        <Tile
          label="Open Exports / Imports"
          value={`${stats.exportOpen} / ${stats.importOpen}`}
          to="/operations/head/shipments"
        />
        <Tile
          label="With API Tracking"
          value={stats.inTransit}
          to="/operations/head/tracking"
        />
        <Tile
          label="Open Exceptions"
          value={stats.exceptions}
          to="/operations/head/shipments"
          alert
        />
      </div>
      <DashboardCharts shipments={shipments} />
    </div>
  );
};

export default OperationsHeadDashboard;
