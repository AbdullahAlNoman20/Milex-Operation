// src/Pages/modules/operations/pages/Shared/ShipmentWorkspace.jsx
import { useState, useEffect, useMemo } from "react";
import { useParams, Link } from "react-router-dom";
import Chip from "../../components/Chip";
import WaitingForBadge from "../../components/WaitingForBadge";
import StatusNote from "../../components/StatusNote";
import ShipmentTrackingView from "../../components/tracking/ShipmentTrackingView";
import RoadmapTracker from "../../components/RoadmapTracker";
import ShipmentSummaryPanel from "../../components/workspace/ShipmentSummaryPanel";
import ClientConfirmPanel from "../../components/workspace/ClientConfirmPanel";
import ShipmentEditPanel from "../../components/workspace/ShipmentEditPanel";
import GatePanel from "../../components/workspace/GatePanel";
import AssignPanel from "../../components/workspace/AssignPanel";
import ImportPathPanel from "../../components/workspace/ImportPathPanel";
import LogisticsPanel from "../../components/workspace/LogisticsPanel";
import StepActionsPanel from "../../components/workspace/StepActionsPanel";
import ClosurePanel from "../../components/workspace/ClosurePanel";
import HandoverPanel from "../../components/workspace/HandoverPanel";
import WorkflowGuide from "../../components/workspace/WorkflowGuide";
import NextActionBanner from "../../components/workspace/NextActionBanner";
import OriginStagePanel from "../../components/workspace/OriginStagePanel";
import DocumentsTab from "../../components/workspace/DocumentsTab";
import MessagesPanel from "../../components/workspace/MessagesPanel";
import Loader from "../../../../../Components/Shared/Loader";
import { useOperationsAuth } from "../../hooks/useOperationsAuth";
import { useLanguage } from "../../hooks/useLanguage";
import { useDataVersion } from "../../hooks/useDataVersion";
import { useShipment } from "../../hooks/useShipment";
import { fetchStatusLogsByShipment } from "../../services/statusLogService";
import { fetchTrackingEvents } from "../../services/trackingService";
import { getSequence, getStatusIndex } from "../../constants/shipmentStatus";
import {
  OPERATIONS_ROLES as R,
  ROLE_HOME,
} from "../../constants/operationsRoles";
import { progressPct } from "../../utils/progress";

const ShipmentWorkspace = () => {
  const { shipmentId } = useParams();
  const { currentUser } = useOperationsAuth();
  const { tStatus, tException } = useLanguage();
  const version = useDataVersion();
  const { shipment: s, isLoading, error, reload } = useShipment(shipmentId);
  const role = currentUser.role;
  const isClient = role === R.CLIENT;
  const [tab, setTab] = useState("overview");
  const [extras, setExtras] = useState({ logs: [], events: [] });

  useEffect(() => {
    let alive = true;
    if (!s) return undefined;
    Promise.all([
      fetchStatusLogsByShipment(s.shipmentId),
      fetchTrackingEvents(s.shipmentId),
    ])
      .then(([logs, events]) => {
        if (alive) setExtras({ logs, events });
      })
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, [s, version]);

  const { times, sources } = useMemo(() => {
    const t = {};
    const src = {};
    [...extras.logs].reverse().forEach((l) => {
      if (l.newValue) {
        t[l.newValue] = l.updatedAt;
        src[l.newValue] = l.source;
      }
    });
    return { times: t, sources: src };
  }, [extras.logs]);

  if (isLoading) return <Loader label="Loading shipment..." />;
  if (error)
    return (
      <div className="max-w-xl mx-auto p-6 text-center">
        <p className="text-sm font-semibold text-red-600 mb-3">{error}</p>
        <Link
          to={ROLE_HOME[role]}
          className="text-sm font-bold text-emerald-600 hover:underline"
        >
          Back to dashboard
        </Link>
      </div>
    );

  const seq = getSequence(s.mode, s.handlingPath);
  const idx = getStatusIndex(s.mode, s.statusCode, s.handlingPath);
  const pct = progressPct(s);
  const base = ROLE_HOME[role];
  const unread = (s.messages || []).some(
    (m) => !(m.readBy || []).includes(role),
  );
  const tabs = [
    ["overview", "Overview"],
    ["documents", "Documents"],
    ["tracking", "Tracking"],
    ["messages", `Messages${unread ? " •" : ""}`],
  ];
  const roadmap = (
    <RoadmapTracker shipment={s} sequence={seq} currentIndex={idx} times={times} sources={sources} compact />
  );

  return (
    <div className="w-full space-y-5">
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4 sm:p-5">
        <Link
          to={`${base}/shipments`}
          className="text-xs font-bold text-slate-400 hover:text-emerald-600"
        >
          ← All shipments
        </Link>
        <div className="flex flex-wrap items-start justify-between gap-3 mt-1">
          <div className="min-w-0">
            <h1 className="text-lg sm:text-xl font-black text-slate-800 truncate">
              {s.shipmentId}
            </h1>
            <p className="text-sm text-slate-500 break-words">
              {isClient ? "" : `${s.clientName} · `}
              {s.mode} · {s.route?.originCountry} ✈ {s.route?.destCountry} ·{" "}
              {s.parcel?.shipmentContents}
            </p>
          </div>
          <div className="flex flex-col items-end gap-1.5">
            <Chip tone="blue">{tStatus(s.statusCode, s.statusLabel)}</Chip>
            <WaitingForBadge shipment={s} />
            {s.exceptionCode && (
              <Chip tone="red">{tException(s.exceptionCode)}</Chip>
            )}
          </div>
        </div>
        <div className="mt-4">
          <div className="flex justify-between text-[10px] font-bold text-slate-400 mb-1">
            <span>Progress</span>
            <span>{pct}%</span>
          </div>
          <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
            <div
              className={`h-full transition-all duration-500 ${s.mode === "IMPORT" ? "bg-sky-500" : "bg-emerald-500"}`}
              style={{ width: `${pct}%` }}
            />
          </div>
          <StatusNote
            shipment={s}
            step={seq[idx]}
            lastEvent={extras.events[0]}
          />
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[320px_minmax(0,1fr)] gap-5 items-start">
        <aside>
          <details
            open
            className="lg:hidden bg-white rounded-xl border border-slate-200 shadow-sm [&>summary]:pointer-events-none [&>summary]:list-none"
          >
            <summary className="px-4 py-3 text-sm font-black text-slate-700 cursor-pointer">
              Roadmap · {pct}% complete
            </summary>
            <div className="p-3 pt-0">{roadmap}</div>
          </details>
          <div className="hidden lg:block bg-white rounded-xl border border-slate-200 shadow-sm p-4">
            <p className="text-xs font-black text-slate-700 uppercase tracking-wide mb-3">
              Roadmap
            </p>
            {roadmap}
          </div>
        </aside>

        <section className="min-w-0 space-y-5">
          <div className="flex gap-1 border-b border-slate-200 overflow-x-auto bg-white rounded-t-xl px-2">
            {tabs.map(([k, label]) => (
              <button
                key={k}
                type="button"
                onClick={() => setTab(k)}
                className={`px-4 py-3 text-xs font-bold whitespace-nowrap border-b-2 transition ${tab === k ? "border-emerald-600 text-emerald-700" : "border-transparent text-slate-400 hover:text-slate-600"}`}
              >
                {label}
              </button>
            ))}
          </div>

          {tab === "overview" && (
            <div className="space-y-5">
              <NextActionBanner shipment={s} />
              {role === R.FOREIGN_ADMIN ? (
                <>
                  <ShipmentSummaryPanel shipment={s} isClient={false} />
                  <OriginStagePanel shipment={s} onChanged={reload} />
                  <GatePanel shipment={s} onChanged={reload} />
                  <AssignPanel shipment={s} onChanged={reload} />
                  {!(role === R.CNF && s.mode === "EXPORT") && (
                    <StepActionsPanel shipment={s} onChanged={reload} />
                  )}
                </>
              ) : (
                <>
                  {role === R.DOMESTIC_ADMIN && s.mode === "EXPORT" && (
                    <WorkflowGuide shipment={s} />
                  )}
                  <ShipmentSummaryPanel shipment={s} isClient={isClient} />
                  <ClientConfirmPanel shipment={s} onChanged={reload} />
                  <ShipmentEditPanel shipment={s} onChanged={reload} />
                  <GatePanel shipment={s} onChanged={reload} />
                  <AssignPanel shipment={s} onChanged={reload} />
                  <ImportPathPanel shipment={s} onChanged={reload} />
                  <HandoverPanel shipment={s} onChanged={reload} />
                  {!(role === R.CNF && s.mode === "EXPORT") && (
                    <LogisticsPanel shipment={s} onChanged={reload} />
                  )}
                  {!(role === R.CNF && s.mode === "EXPORT") && (
                    <StepActionsPanel shipment={s} onChanged={reload} />
                  )}
                  <ClosurePanel shipment={s} onChanged={reload} />
                </>
              )}
            </div>
          )}
          {tab === "documents" && <DocumentsTab s={s} onChanged={reload} />}
          {tab === "tracking" && (
            <ShipmentTrackingView
              shipment={s}
              onChanged={reload}
              showOpenLink={false}
            />
          )}
          {tab === "messages" && (
            <MessagesPanel shipment={s} onChanged={reload} />
          )}
        </section>
      </div>
    </div>
  );
};

export default ShipmentWorkspace;
