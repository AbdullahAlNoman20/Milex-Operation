// src/Pages/modules/operations/components/workspace/ImportPathPanel.jsx
// IMPORT — after customs release (API) the Operations Supervisor finishes the job himself:
//   • Transfer to Client  → hand the documents to the Client, who clears / collects the cargo and confirms
//   • Self Delivery       → receive in our warehouse → out for delivery → delivered (POD) → close
import { useState } from "react";
import { Truck, FileCheck2, ArrowRight } from "lucide-react";
import SectionCard from "../SectionCard";
import { useOperationsAuth } from "../../hooks/useOperationsAuth";
import { useToast } from "../../../../../Components/hooks/useToast";
import { setHandlingPath, advanceShipment, patchShipment } from "../../services/shipmentService";
import { forwardPackToClient, confirmSelfCleared } from "../../services/closureService";
import { OPERATIONS_ROLES as R } from "../../constants/operationsRoles";

const inp = "w-full border border-slate-300 rounded-lg px-3 py-2 text-sm bg-slate-50 focus:border-sky-500 outline-none disabled:opacity-60";
const NEXT_B = { CUSTOMS_RELEASED: ["RECEIVED_AT_BD_HUB", "Received at our warehouse"], RECEIVED_AT_BD_HUB: ["OUT_FOR_DELIVERY", "Out for delivery"], OUT_FOR_DELIVERY: ["DELIVERED", "Delivered to the Client"] };

const ImportPathPanel = ({ shipment: s, onChanged }) => {
  const { currentUser } = useOperationsAuth();
  const { showToast } = useToast();
  const role = currentUser.role;
  const [note, setNote] = useState("");
  const [receivedBy, setReceivedBy] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  if (s.mode !== "IMPORT") return null;

  const run = async (fn, msg) => {
    setBusy(true); setErr("");
    try { await fn(); showToast(msg); setNote(""); onChanged?.(); }
    catch (e) { setErr(e?.message || "Action failed"); showToast(e?.message || "Action failed", "error"); }
    finally { setBusy(false); }
  };

  const sup = role === R.DOMESTIC_ADMIN;
  const released = s.statusCode === "CUSTOMS_RELEASED";
  const path = s.handlingPath;
  const nextB = path === "B" ? NEXT_B[s.statusCode] : null;

  const canSelfClear = role === R.CLIENT && s.statusCode === "DOCUMENTS_FORWARDED";
  if (!(sup && (released || path)) && !canSelfClear) return null;

  return (
    <SectionCard title="After Customs Release" subtitle={sup ? "The API has finished. Choose how this shipment reaches the Client." : undefined}>
      {sup && released && !path && (
        <div className="grid gap-3 sm:grid-cols-2">
          <button type="button" disabled={busy} onClick={() => run(async () => { await setHandlingPath(s.shipmentId, "B", currentUser); }, "Self Delivery chosen")} className="card-hover text-left rounded-xl border-2 border-sky-300 bg-sky-50 p-4 hover:border-sky-500">
            <Truck className="text-sky-600 mb-2" size={22} /><p className="text-sm font-black text-slate-800">Self Delivery</p>
            <p className="text-xs text-slate-500 mt-1">We collect the cargo and deliver it to the Client ourselves.</p>
          </button>
          <button type="button" disabled={busy} onClick={() => run(async () => { await setHandlingPath(s.shipmentId, "A", currentUser); await forwardPackToClient(s.shipmentId, { recipient: s.clientEmail }, currentUser); }, "Documents handed to the Client")} className="card-hover text-left rounded-xl border-2 border-emerald-300 bg-emerald-50 p-4 hover:border-emerald-500">
            <FileCheck2 className="text-emerald-600 mb-2" size={22} /><p className="text-sm font-black text-slate-800">Transfer to Client</p>
            <p className="text-xs text-slate-500 mt-1">Hand all documents to the Client. The Client collects the cargo and confirms.</p>
          </button>
        </div>
      )}

      {sup && path === "B" && nextB && (
        <div className="space-y-3 anim-pop">
          <p className="text-xs font-bold text-sky-700">Self Delivery — next step: {nextB[1]}</p>
          {nextB[0] === "DELIVERED" && <input value={receivedBy} maxLength={80} onChange={(e) => { setReceivedBy(e.target.value); setErr(""); }} placeholder="Received by (name of the person who received)" className={`${inp} ${err && !receivedBy ? "field-error" : ""}`} />}
          <input value={note} maxLength={300} onChange={(e) => setNote(e.target.value)} placeholder="Note (optional)" className={inp} />
          <button type="button" disabled={busy} onClick={() => run(async () => {
            if (nextB[0] === "DELIVERED") {
              if (!receivedBy.trim()) throw new Error("Write who received the parcel");
              await patchShipment(s.shipmentId, { pod: { ...(s.pod || {}), deliveredAt: new Date().toISOString(), receivedBy: receivedBy.trim(), source: "MANUAL", validated: true } });
            }
            await advanceShipment(s.shipmentId, nextB[0], { note }, currentUser);
          }, `${nextB[1]} recorded`)} className="inline-flex items-center gap-2 text-sm font-bold bg-sky-600 text-white px-5 py-2.5 rounded-lg hover:bg-sky-700 disabled:opacity-50">{nextB[1]} <ArrowRight size={15} /></button>
          {err && <p role="alert" className="anim-pop text-[11px] font-bold text-red-600">⚠ {err}</p>}
        </div>
      )}
      {sup && path === "B" && s.statusCode === "DELIVERED" && (
        <button type="button" disabled={busy} onClick={() => run(() => advanceShipment(s.shipmentId, "POD_UPDATED", { note: "Proof of delivery recorded" }, currentUser), "POD updated")} className="inline-flex items-center gap-2 text-sm font-bold bg-sky-600 text-white px-5 py-2.5 rounded-lg hover:bg-sky-700 disabled:opacity-50">Record POD <ArrowRight size={15} /></button>
      )}
      {sup && path === "A" && s.statusCode === "DOCUMENTS_FORWARDED" && <p className="text-xs bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-lg p-3 font-semibold">Documents were handed to the Client. Waiting for the Client to confirm.</p>}

      {canSelfClear && (
        <div className="space-y-2">
          <p className="text-xs text-slate-600">Your documents have been handed to you. Once you have cleared and collected the cargo, confirm below.</p>
          <input value={note} maxLength={300} onChange={(e) => setNote(e.target.value)} placeholder="Note (optional)" className={inp} />
          <button type="button" disabled={busy} onClick={() => run(() => confirmSelfCleared(s.shipmentId, note, currentUser), "Confirmed — thank you")} className="text-sm font-bold bg-emerald-600 text-white px-5 py-2.5 rounded-lg hover:bg-emerald-700 disabled:opacity-50">Confirm Receive / Self-Cleared</button>
        </div>
      )}
    </SectionCard>
  );
};

export default ImportPathPanel;
