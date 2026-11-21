// src/Pages/modules/operations/pages/ForeignAdmin/ForeignAdminDashboard.jsx
import { DashboardHeader, NotificationsPanel } from "../../components/dashboard/DashboardKit";
import { useState, useEffect, useCallback, useMemo } from "react";
import { Link } from "react-router-dom";
import SectionCard from "../../components/SectionCard";
import WaitingForBadge from "../../components/WaitingForBadge";
import Loader from "../../../../../Components/Shared/Loader";
import { useOperationsAuth } from "../../hooks/useOperationsAuth";
import { useLanguage } from "../../hooks/useLanguage";
import { useDataVersion } from "../../hooks/useDataVersion";
import { fetchShipments } from "../../services/shipmentService";
import { filterVisibleShipments } from "../../services/accessService";
import { getAllowedNextSteps } from "../../constants/shipmentStatus";

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

const ForeignAdminDashboard = () => {
  const { currentUser } = useOperationsAuth();
  const { t, tStatus } = useLanguage();
  const version = useDataVersion();
  const [shipments, setShipments] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      setShipments(
        filterVisibleShipments(currentUser, await fetchShipments()).filter(
          (s) => s.mode === "IMPORT",
        ),
      );
    } finally {
      setIsLoading(false);
    }
  }, [currentUser]);
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => {
    load();
  }, [load, version]);

  const { open, action, departed, exceptions } = useMemo(() => {
    const o = shipments.filter((s) => s.statusCode !== "CLOSED");
    return {
      open: o,
      action: o.filter(
        (s) => getAllowedNextSteps(currentUser.role, s).length > 0,
      ),
      departed: o.filter((s) =>
        ["DEPARTED_ORIGIN", "IN_TRANSIT", "ARRIVED_IN_BANGLADESH"].includes(
          s.statusCode,
        ),
      ),
      exceptions: o.filter((s) => s.exceptionCode),
    };
  }, [shipments, currentUser.role]);

  if (isLoading) return <Loader label={t("common.loading")} />;

  return (
    <div className="w-full space-y-6">
      <DashboardHeader
        title={`${t("common.welcome")}, ${currentUser?.name}`}
        subtitle={t("foreign.dash.subtitle")}
        help={t("foreign.dash.help", "Summary only. Click a card to open the shipments. Enter the information in English.")}
        steps={[t("foreign.dash.step1", "Open a new import request."), t("foreign.dash.step2", "Complete each origin stage and the documents."), t("foreign.dash.step3", "Hand to the airline and enter the tracking number.")]}
      />
      <NotificationsPanel />
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <Tile
          label={t("foreign.dash.actionNeeded")}
          value={action.length}
          to="/operations/foreign/tasks"
          alert
        />
        <Tile
          label={t("foreign.dash.assigned")}
          value={open.length}
          to="/operations/foreign/shipments"
        />
        <Tile
          label={t("foreign.dash.inTransit")}
          value={departed.length}
          to="/operations/foreign/shipments"
        />
        <Tile
          label={t("foreign.dash.exceptions")}
          value={exceptions.length}
          to="/operations/foreign/shipments"
          alert
        />
      </div>
            {shipments.filter((s) => s.statusCode === "BOOKING_CONFIRMED").length > 0 && (
        <SectionCard title={t("foreign.dash.newRequests", "New Import Requests")}>
          <div className="space-y-2">
            {shipments.filter((s) => s.statusCode === "BOOKING_CONFIRMED").map((s) => (
              <Link key={s.id} to={`/operations/foreign/shipments/${encodeURIComponent(s.shipmentId)}`} className="block border-2 border-emerald-300 bg-emerald-50 rounded-2xl p-4">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div><p className="text-sm font-black text-emerald-800">{s.shipmentId}</p><p className="text-xs text-slate-600">{s.pickup?.companyName} · {s.parcel?.shipmentContents}</p></div>
                  <span className="text-[10px] font-black bg-emerald-600 text-white px-2 py-1 rounded-full">{t("foreign.dash.start", "Start")}</span>
                </div>
                <p className="text-[11px] text-slate-500 mt-1">{s.parcel?.pieces} pcs · {s.parcel?.weightKg} kg</p>
                {s.gates?.GATE_1?.comment && <p className="text-[11px] mt-2 text-slate-700">Head remark: “{s.gates.GATE_1.comment}”</p>}
              </Link>
            ))}
          </div>
        </SectionCard>
      )}
      <SectionCard
        title={t("foreign.dash.waitingOnYou")}
        actions={
          <Link
            to="/operations/foreign/tasks"
            className="text-xs font-bold text-emerald-600 hover:underline"
          >
            {t("common.viewAll")}
          </Link>
        }
      >
        {action.length === 0 ? (
          <p className="text-sm text-slate-400">{t("foreign.dash.nothing")}</p>
        ) : (
          <div className="space-y-2">
            {action.slice(0, 8).map((s) => {
              const next = getAllowedNextSteps(currentUser.role, s)[0];
              return (
                <div
                  key={s.id}
                  className="flex flex-wrap items-center justify-between gap-2 border border-slate-100 rounded-lg p-3"
                >
                  <div className="min-w-0">
                    <Link
                      to={`/operations/foreign/shipments/${encodeURIComponent(s.shipmentId)}`}
                      className="text-sm font-bold text-emerald-600 hover:underline"
                    >
                      {s.shipmentId}
                    </Link>
                    <p className="text-xs text-slate-400 truncate">
                      {s.pickup?.companyName} · {s.parcel?.pieces} pcs ·{" "}
                      {s.parcel?.weightKg} kg
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs font-bold text-slate-700">
                      {tStatus(s.statusCode, s.statusLabel)}
                    </p>
                    {next && (
                      <p className="text-[11px] text-emerald-700 font-semibold">
                        ✈ {t(`foreign.stage.${next.code}`, next.label)}
                      </p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </SectionCard>
      {departed.length > 0 && (
        <SectionCard title={t("foreign.dash.inTransit")}>
          <div className="space-y-2">
            {departed.slice(0, 6).map((s) => (
              <div
                key={s.id}
                className="flex flex-wrap items-center justify-between gap-2 border border-slate-100 rounded-lg p-3"
              >
                <Link
                  to={`/operations/foreign/shipments/${encodeURIComponent(s.shipmentId)}`}
                  className="text-sm font-bold text-emerald-600 hover:underline"
                >
                  {s.shipmentId}
                </Link>
                <span className="text-xs text-slate-500">
                  {tStatus(s.statusCode, s.statusLabel)}
                </span>
                <WaitingForBadge shipment={s} />
              </div>
            ))}
          </div>
        </SectionCard>
      )}
    </div>
  );
};

export default ForeignAdminDashboard;
