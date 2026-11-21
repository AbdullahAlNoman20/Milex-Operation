// src/Pages/modules/operations/components/workspace/ShipmentSummaryPanel.jsx
import SectionCard from "../SectionCard";
import { effectiveAmount } from "../../services/rateService";
import { getExceptionLabel } from "../../constants/shipmentStatus";

// Empty rows are hidden unless `always` — nothing unnecessary is shown.
const Row = ({ k, v, always = false }) =>
  v || v === 0 || always ? (
    <div className="flex flex-col py-1.5 border-b border-slate-50 last:border-b-0">
      <span className="text-[10px] font-bold text-slate-400 uppercase">{k}</span>
      <span className="text-xs font-semibold text-slate-800 break-words">{v || v === 0 ? v : "—"}</span>
    </div>
  ) : null;

const Party = ({ title, p = {} }) => (
  <div>
    <p className="text-[10px] font-black text-slate-500 uppercase mb-1">
      {title}
    </p>
    <Row k="Company" v={p.companyName} />
    <Row
      k="Contact"
      v={[p.contactPerson, p.contactPhone].filter(Boolean).join(" · ")}
    />
    <Row
      k="Address"
      v={[p.address, p.city, p.postCode, p.country].filter(Boolean).join(", ")}
    />
    <Row k="Email" v={p.contactEmail} />
  </div>
);

const ShipmentSummaryPanel = ({ shipment: s, isClient }) => {
  const rateAmount = effectiveAmount(s.rate);
  return (
    <SectionCard
      title="Shipment Details"
      subtitle={`${s.route?.originCity || "—"}, ${s.route?.originCountry || "—"} ✈ ${s.route?.destCity || "—"}, ${s.route?.destCountry || "—"}`}
    >
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Party
          title={s.mode === "EXPORT" ? "Pickup / Shipper" : "Supplier / Pickup"}
          p={s.pickup}
        />
        <Party title="Receiver / Consignee" p={s.receiver} />
      </div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-x-6 mt-4 pt-4 border-t border-slate-100">
        <Row always k="Contents" v={s.parcel?.shipmentContents} />
        <Row
          always
          k="Declared pieces / cartons"
          v={`${s.parcel?.pieces ?? "—"} / ${s.parcel?.cartons ?? "—"}`}
        />
        <Row
          always
          k="Declared weight"
          v={s.parcel?.weightKg ? `${s.parcel.weightKg} kg` : ""}
        />
        <Row
          k="Chargeable weight"
          v={s.parcel?.chargeableKg ? `${s.parcel.chargeableKg} kg` : ""}
        />
        <Row
          k="Declared value"
          v={
            s.parcel?.declaredValue
              ? `${s.parcel.currency || ""} ${s.parcel.declaredValue}`
              : ""
          }
        />
        <Row
          k="Type / Packaging"
          v={`${s.shipmentType} · ${s.packaging || "—"}`}
        />
        <Row k="Services" v={(s.services || []).join(", ")} />
        <Row k="Cost carried by" v={s.costCarriedBy} />
        <Row k="Client ref / PO" v={s.refNo} />
        <Row k="Principal" v={s.route?.principal} />
        <Row
          k="Estimated charge"
          v={
            rateAmount !== null
              ? `${s.rate?.currency || "USD"} ${rateAmount}${s.rate?.override && !isClient ? " (manual override)" : ""}`
              : "To be quoted"
          }
        />
        {s.mode === "EXPORT" && <Row k="Carrier" v={s.route?.carrier} />}
        <Row
          k="MAWB / Flight"
          v={[s.mawb?.mawbNumber, s.mawb?.flightNo].filter(Boolean).join(" / ")}
        />
        <Row k="Principal tracking no." v={s.tracking?.trackingNumber} />
        {s.mode === "IMPORT" && <Row k="Foreign Supervisor" v={s.assignedForeign?.name} />}
        {s.mode === "EXPORT" && <Row k="Courier Man" v={s.assignedCourier?.name} />}
        {s.mode === "EXPORT" && <Row k="C&F" v={s.assignedCnf?.name} />}
        {s.mode === "IMPORT" && <Row k="Delivery option" v={s.handlingPath === "A" ? "Transfer to Client" : s.handlingPath === "B" ? "Self Delivery" : ""} />}
        {s.exceptionCode && (
          <Row k="Open exception" v={getExceptionLabel(s.exceptionCode)} />
        )}
        {s.parcel?.remarks && <Row k="Remarks" v={s.parcel.remarks} />}
      </div>
      {!isClient &&
        (s.hubVerification ||
          s.pickupActuals ||
          Object.keys(s.originActuals || {}).length > 0) && (
          <div className="mt-4 pt-4 border-t border-slate-100">
            <p className="text-[10px] font-black text-slate-500 uppercase mb-2">
              Actuals (internal)
            </p>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-x-6">
              {s.pickupActuals && (
                <Row
                  k="Courier pickup"
                  v={`${s.pickupActuals.actualPieces} pcs · ${s.pickupActuals.condition}`}
                />
              )}
              {s.hubVerification && (
                <Row
                  k="Hub verification"
                  v={`${s.hubVerification.result} · ${s.hubVerification.actualPieces} pcs${s.hubVerification.actualWeightKg ? ` · ${s.hubVerification.actualWeightKg} kg` : ""}`}
                />
              )}
              {Object.entries(s.originActuals || {}).map(([k, v]) => (
                <Row
                  key={k}
                  k={k.replace(/_/g, " ")}
                  v={
                    v.actualPieces
                      ? `${v.actualPieces} pcs${v.actualWeightKg ? ` · ${v.actualWeightKg} kg` : ""}${v.condition ? ` · ${v.condition}` : ""}`
                      : v.arrangedFor || v.receiptNo || "Recorded"
                  }
                />
              ))}
            </div>
          </div>
        )}
      {s.openDiscrepancy && !isClient && (
        <p className="mt-4 text-xs bg-red-50 border border-red-200 text-red-700 rounded-lg p-3 font-semibold">
          Open discrepancy blocks progress — {s.openDiscrepancy.type}:{" "}
          {s.openDiscrepancy.reason}. Next action:{" "}
          {s.openDiscrepancy.nextAction}. Supervisor review required.
        </p>
      )}
    </SectionCard>
  );
};

export default ShipmentSummaryPanel;
