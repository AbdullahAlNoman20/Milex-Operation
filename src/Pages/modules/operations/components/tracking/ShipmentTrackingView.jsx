// src/Pages/modules/operations/components/tracking/ShipmentTrackingView.jsx   (নতুন ফাইল)
import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { AlertTriangle } from "lucide-react";
import SectionCard from "../SectionCard";
import RoadmapTracker from "../RoadmapTracker";
import WaitingForBadge from "../WaitingForBadge";
import StatusNote from "../StatusNote";
import { useOperationsAuth } from "../../hooks/useOperationsAuth";
import { useLanguage } from "../../hooks/useLanguage";
import { useDataVersion } from "../../hooks/useDataVersion";
import { useToast } from "../../../../../Components/hooks/useToast";
import { correctShipmentWeight } from "../../services/shipmentService";
import { fetchTrackingEvents, isTrackable, addManualTrackingUpdate } from "../../services/trackingService";
import { fetchStatusLogsByShipment } from "../../services/statusLogService";
import { prepareFile } from "../../services/fileService";
import { getSequence, getStatusIndex, getNextSteps, getExceptionLabel } from "../../constants/shipmentStatus";
import { OPERATIONS_ROLES as R, ROLE_HOME } from "../../constants/operationsRoles";
import { progressPct } from "../../utils/progress";
import { isRequired, isPositiveNumber } from "../../../../../Components/utils/validators";

const inp = "w-full border border-slate-300 rounded-lg p-2 text-sm bg-slate-50 focus:border-emerald-500 outline-none disabled:opacity-60";
const blankManual = { targetStatus: "", occurredAt: "", reason: "", location: "", evidence: null };

const ShipmentTrackingView = ({ shipment, onChanged, showOpenLink = true }) => {
  const { currentUser } = useOperationsAuth();
  const { tStatus, tException } = useLanguage();
  const { showToast } = useToast();
  const version = useDataVersion();
  const role = currentUser.role;
  const [events, setEvents] = useState([]);
  const [times, setTimes] = useState({});
  const [sources, setSources] = useState({});
  const [showWeight, setShowWeight] = useState(false);
  const [weight, setWeight] = useState({ value: "", reason: "" });
  const [manual, setManual] = useState(blankManual);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let alive = true;
    Promise.all([fetchTrackingEvents(shipment.shipmentId), fetchStatusLogsByShipment(shipment.shipmentId)])
      .then(([ev, logs]) => {
        if (!alive) return;
        setEvents(ev);
        const m = {}; const src = {};
        [...logs].reverse().forEach((l) => { if (l.newValue) { m[l.newValue] = l.updatedAt; src[l.newValue] = l.source; } });
        setTimes(m); setSources(src);
      }).catch(() => {});
    return () => { alive = false; };
  }, [shipment.shipmentId, shipment.updatedAt, version]);

  const saveWeight = async () => {
    if (!isPositiveNumber(weight.value) || Number(weight.value) <= 0) return showToast("Enter a valid weight", "warning");
    setBusy(true);
    try {
      const u = await correctShipmentWeight(shipment.shipmentId, weight.value, weight.reason, currentUser);
      setShowWeight(false); setWeight({ value: "", reason: "" }); showToast("Weight corrected"); onChanged?.(u);
    } catch (e) { showToast(e?.message || "Failed", "error"); } finally { setBusy(false); }
  };
  const pickEvidence = async (e) => {
    const f = e.target.files?.[0]; e.target.value = "";
    if (!f) return;
    try { setManual((p) => ({ ...p, evidence: null })); const meta = await prepareFile(f); setManual((p) => ({ ...p, evidence: meta })); } catch (err) { showToast(err.message, "warning"); }
  };
  const saveManual = async () => {
    if (!isRequired(manual.targetStatus)) return showToast("Select the status", "warning");
    setBusy(true);
    try { await addManualTrackingUpdate(shipment.shipmentId, manual, currentUser); showToast("Manual update recorded — flagged for review"); setManual(blankManual); onChanged?.(); }
    catch (e) { showToast(e?.message || "Failed", "error"); } finally { setBusy(false); }
  };

  const seq = getSequence(shipment.mode, shipment.handlingPath);
  const idx = getStatusIndex(shipment.mode, shipment.statusCode, shipment.handlingPath);
  const pct = progressPct(shipment);
  const canWeight = [R.DOMESTIC_ADMIN, R.FOREIGN_ADMIN, R.OPERATIONS_HEAD].includes(role);
  const manualOptions = role === R.DOMESTIC_ADMIN && isTrackable(shipment) ? getNextSteps(shipment.mode, shipment.statusCode, shipment.handlingPath) : [];

  return (
    <div className="space-y-5">
      {shipment.exceptionCode && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-start gap-3">
          <AlertTriangle size={18} className="text-red-500 shrink-0 mt-0.5" />
          <div><p className="text-sm font-bold text-red-700">Exception flagged</p><p className="text-xs text-red-500">{tException(shipment.exceptionCode, getExceptionLabel(shipment.exceptionCode))}</p></div>
        </div>
      )}

      <div className={`rounded-2xl text-white p-5 anim-fade-up ${shipment.mode === "IMPORT" ? "bg-sky-600" : "bg-emerald-600"}`}>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-widest opacity-80">{shipment.mode} · {shipment.tracking?.trackingNumber || shipment.shipmentId}</p>
            <p className="text-lg sm:text-2xl font-black mt-1">{shipment.route?.originCity || shipment.route?.originCountry} <span className="opacity-70">✈</span> {shipment.route?.destCity || shipment.route?.destCountry}</p>
          </div>
          <div className="text-right"><p className="text-[10px] font-bold uppercase opacity-80">Current status</p><p className="text-sm sm:text-base font-black">{tStatus(shipment.statusCode, shipment.statusLabel)}</p></div>
        </div>
        <div className="mt-4">
          <div className="flex justify-between text-[10px] font-bold opacity-90 mb-1"><span>Journey progress</span><span>{pct}%</span></div>
          <div className="h-2.5 bg-white/25 rounded-full overflow-hidden"><div className="h-full bg-white rounded-full transition-all duration-500" style={{ width: `${pct}%` }} /></div>
        </div>
        <StatusNote dark shipment={shipment} step={seq[idx]} lastEvent={events[0]} />
      </div>

      <SectionCard
        title={shipment.shipmentId}
        subtitle={`${shipment.mode} · ${shipment.route?.principal || "No principal yet"}${shipment.tracking?.trackingNumber ? ` · ${shipment.tracking.trackingNumber}` : ""}`}
        actions={showOpenLink && <Link to={`${ROLE_HOME[role]}/shipments/${encodeURIComponent(shipment.shipmentId)}`} className="text-xs font-bold text-emerald-600 hover:underline">Open workspace ✈</Link>}
      >
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-2 mb-4 text-xs text-slate-500">
          <p><span className="font-bold text-slate-700">From:</span> {shipment.pickup?.companyName}, {shipment.pickup?.country}</p>
          <p><span className="font-bold text-slate-700">To:</span> {shipment.receiver?.companyName}, {shipment.receiver?.country}</p>
          <p className="flex items-center gap-2">
            <span><span className="font-bold text-slate-700">Weight:</span> {shipment.parcel?.weightKg} kg{(shipment.weightCorrections || []).length > 0 && <span className="text-amber-600 font-semibold ml-1">(corrected)</span>}</span>
            {canWeight && shipment.statusCode !== "CLOSED" && <button type="button" onClick={() => { setShowWeight((v) => !v); setWeight({ value: String(shipment.parcel?.weightKg || ""), reason: "" }); }} className="text-[10px] font-bold text-emerald-600 hover:underline">Correct</button>}
          </p>
          <p><span className="font-bold text-slate-700">Status:</span> {tStatus(shipment.statusCode, shipment.statusLabel)}</p>
        </div>
        <div className="mb-4"><WaitingForBadge shipment={shipment} /></div>
        {showWeight && (
          <div className="mb-4 bg-amber-50 border border-amber-200 rounded-lg p-3 flex flex-wrap gap-2">
            <input type="number" min="0" step="0.1" value={weight.value} onChange={(e) => setWeight((p) => ({ ...p, value: e.target.value }))} placeholder="kg" className="border border-slate-300 rounded-lg p-2 text-xs bg-white w-28 outline-none" />
            <input value={weight.reason} maxLength={200} onChange={(e) => setWeight((p) => ({ ...p, reason: e.target.value }))} placeholder="Reason (e.g. re-weighed at hub)" className="border border-slate-300 rounded-lg p-2 text-xs bg-white flex-1 min-w-[160px] outline-none" />
            <button type="button" disabled={busy} onClick={saveWeight} className="text-xs font-bold bg-emerald-600 text-white px-3 py-2 rounded-lg disabled:opacity-50">Save</button>
          </div>
        )}
        <RoadmapTracker shipment={shipment} sequence={seq} currentIndex={idx} times={times} sources={sources} />
      </SectionCard>

      {manualOptions.length > 0 && (
        <SectionCard title="Manual Tracking Update (API fallback)" subtitle="Use only when the principal API is unavailable. Reason and evidence are mandatory; Operations Head reviews it.">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <select value={manual.targetStatus} onChange={(e) => setManual((p) => ({ ...p, targetStatus: e.target.value }))} className={inp}><option value="">Next status...</option>{manualOptions.map((o) => <option key={o.code} value={o.code}>{tStatus(o.code, o.label)}</option>)}</select>
            <input type="datetime-local" value={manual.occurredAt} onChange={(e) => setManual((p) => ({ ...p, occurredAt: e.target.value }))} className={inp} />
            <input value={manual.reason} maxLength={300} onChange={(e) => setManual((p) => ({ ...p, reason: e.target.value }))} placeholder="Reason *" className={inp} />
            <input value={manual.location} maxLength={150} onChange={(e) => setManual((p) => ({ ...p, location: e.target.value }))} placeholder="Location" className={inp} />
            <label className="text-xs font-bold text-emerald-600 cursor-pointer">{manual.evidence ? `Attached: ${manual.evidence.name}` : "Attach evidence *"}<input type="file" accept=".pdf,.jpg,.jpeg,.png" className="hidden" onChange={pickEvidence} /></label>
            <button type="button" disabled={busy} onClick={saveManual} className="text-xs font-bold bg-slate-800 text-white px-4 py-2.5 rounded-lg hover:bg-slate-900 transition disabled:opacity-50">Record Manual Update</button>
          </div>
        </SectionCard>
      )}
    </div>
  );
};

export default ShipmentTrackingView;