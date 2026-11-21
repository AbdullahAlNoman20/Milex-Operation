// src/Pages/modules/operations/pages/DomesticAdmin/DomesticAdminDashboard.jsx
import { DashboardHeader, NotificationsPanel } from "../../components/dashboard/DashboardKit";
import { useState, useEffect, useCallback, useMemo } from "react";
import { Link } from "react-router-dom";
import SectionCard from "../../components/SectionCard";
import WaitingForBadge from "../../components/WaitingForBadge";
import Loader from "../../../../../Components/Shared/Loader";
import { useOperationsAuth } from "../../hooks/useOperationsAuth";
import { usePendingTasks } from "../../hooks/usePendingTasks";
import { useDataVersion } from "../../hooks/useDataVersion";
import { fetchShipments } from "../../services/shipmentService";
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

const DomesticAdminDashboard = () => {
  const { currentUser } = useOperationsAuth();
  const tasks = usePendingTasks();
  const version = useDataVersion();
  const [shipments, setShipments] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      setShipments(await fetchShipments());
    } finally {
      setIsLoading(false);
    }
  }, []);
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => {
    load();
  }, [load, version]);

  const stats = useMemo(() => {
    const open = shipments.filter((s) => s.statusCode !== "CLOSED");
    const g1 = (s) => s.gates?.GATE_1?.status;
    return {
      gate1: open.filter(
        (s) =>
          s.mode === "IMPORT" &&
          s.statusCode === "DRAFT" &&
          s.supervisorCheck?.status === "PENDING" &&
          g1(s) !== "PENDING",
      ).length,
      pickup: open.filter(
        (s) => s.mode === "EXPORT" && s.statusCode === "BOOKED",
      ).length,
      hub: open.filter(
        (s) => s.mode === "EXPORT" && s.statusCode === "PICKED_UP",
      ).length,
      docs: open.filter(
        (s) =>
          (s.mode === "EXPORT" &&
            ["RECEIVED_AT_ORIGIN_HUB", "EXPORT_DOCUMENTATION"].includes(
              s.statusCode,
            )) ||
          (s.mode === "IMPORT" &&
            [
              "RECEIVED_AT_ORIGIN_WAREHOUSE",
              "EXPORT_DOCUMENTATION",
            ].includes(s.statusCode)),
      ).length,
      confirmPending: open.filter(
        (s) => s.clientConfirmation?.status === "PENDING" && s.onBehalf,
      ).length,
      corrections: open.filter(
        (s) => s.clientConfirmation?.status === "CORRECTION_REQUESTED",
      ).length,
      released: open.filter(
        (s) => s.mode === "IMPORT" && s.statusCode === "CUSTOMS_RELEASED",
      ).length,
      pod: open.filter(
        (s) =>
          s.mode === "IMPORT" &&
          s.statusCode === "DELIVERED" &&
          s.pod?.deliveredAt &&
          !s.pod.validated,
      ).length,
      exceptions: open.filter((s) => s.exceptionCode).length,
      discrepancy: open.filter((s) => s.openDiscrepancy).length,
      openCount: open.length,
    };
  }, [shipments]);

  if (isLoading) return <Loader label="Loading dashboard..." />;
  const waiting = shipments
    .filter((s) => s.statusCode !== "CLOSED")
    .filter((s) => tasks.shipmentTasks.some((t) => t.id === s.id))
    .slice(0, 8);

  return (
    <div className="w-full space-y-6">
      <DashboardHeader
        title={`Welcome, ${currentUser?.name}`}
        subtitle="Operations Supervisor (Bangladesh) — overall summary of work waiting for you."
        help="Summary only. Click a card to open the shipments that need that step. Manifests, Tracking and the full task list are in the left menu."
        steps={["Check import requests first and send them to the Head.", "Assign a Courier Man for export pickups.", "Prepare documents, then create the manifest."]}
      />
      <NotificationsPanel />
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
        <Tile
          label="Import Requests to Check"
          value={stats.gate1}
          to="/operations/domestic/shipments"
          alert
        />
        <Tile
          label="Assign Pickup"
          value={stats.pickup}
          to="/operations/domestic/shipments"
          alert
        />
        <Tile
          label="Hub Verification"
          value={stats.hub}
          to="/operations/domestic/shipments"
          alert
        />
        <Tile
          label="Prepare Documents"
          value={stats.docs}
          to="/operations/domestic/shipments"
        />
        <Tile
          label="Client Confirmation Pending"
          value={stats.confirmPending}
          to="/operations/domestic/shipments"
        />
        <Tile
          label="Client Corrections"
          value={stats.corrections}
          to="/operations/domestic/shipments"
          alert
        />
        <Tile
          label="Imports Released — Choose Path"
          value={stats.released}
          to="/operations/domestic/shipments"
          alert
        />
        <Tile
          label="POD to Validate"
          value={stats.pod}
          to="/operations/domestic/shipments"
          alert
        />
        <Tile
          label="Task Reviews"
          value={tasks.reviewTasks.length}
          to="/operations/domestic/shipments"
          alert
        />
        <Tile
          label="Open Discrepancies"
          value={stats.discrepancy}
          to="/operations/domestic/shipments"
          alert
        />
        <Tile
          label="Open Exceptions"
          value={stats.exceptions}
          to="/operations/domestic/shipments"
          alert
        />
        <Tile
          label="Evidence to Verify"
          value={tasks.evidenceTasks.length}
          to="/operations/domestic/notifications"
          alert
        />
        <Tile
          label="Open Shipments"
          value={stats.openCount}
          to="/operations/domestic/shipments"
        />
        <Tile label="Closure" value="✈" to="/operations/domestic/shipments" />
      </div>
      <DashboardCharts shipments={shipments} />
      <SectionCard
        title="Waiting on You"
        actions={
          <Link
            to="/operations/domestic/tasks"
            className="text-xs font-bold text-emerald-600 hover:underline"
          >
            All tasks
          </Link>
        }
      >
        {waiting.length === 0 ? (
          <p className="text-sm text-slate-400">
            Nothing is waiting on you right now.
          </p>
        ) : (
          <div className="space-y-2">
            {waiting.map((s) => (
              <div
                key={s.id}
                className="flex flex-wrap items-center justify-between gap-2 border border-slate-100 rounded-lg p-3"
              >
                <div>
                  <Link
                    to={`/operations/domestic/shipments/${encodeURIComponent(s.shipmentId)}`}
                    className="text-sm font-bold text-emerald-600 hover:underline"
                  >
                    {s.shipmentId}
                  </Link>
                  <p className="text-xs text-slate-400">
                    {s.clientName} · {s.mode}
                  </p>
                </div>
                <WaitingForBadge shipment={s} />
              </div>
            ))}
          </div>
        )}
      </SectionCard>
    </div>
  );
};

export default DomesticAdminDashboard;
