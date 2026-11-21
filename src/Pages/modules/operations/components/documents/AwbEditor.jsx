// src/Pages/modules/operations/components/documents/AwbEditor.jsx
// One approved data set ✈ five copies (Shipper, Revenue, Invoice, Hub, Recipient).
import { useState } from "react";
import { Link } from "react-router-dom";
import SectionCard from "../SectionCard";
import Field, { inp } from "../Field";
import EditorFooter from "./EditorFooter";
import { useOperationsAuth } from "../../hooks/useOperationsAuth";
import { useToast } from "../../../../../Components/hooks/useToast";
import { saveDocument } from "../../services/documentService";
import { AWB_COPY_TYPES } from "../../constants/shipmentFields";
import { AWB_TERMS_TEXT } from "../../constants/termsAndConditions";

const AwbEditor = ({ shipment: s, doc, editable, onSaved }) => {
  const { currentUser } = useOperationsAuth();
  const { showToast } = useToast();
  const d = doc?.data || {};
  const [f, setF] = useState({
    awbNumber: d.awbNumber || s.awbNumber || "",
    senderAcNo: d.senderAcNo || "",
    internalReference: d.internalReference || s.refNo || "",
    pickedUpBy: d.pickedUpBy || s.assignedCourier?.name || "",
    receivedBy: d.receivedBy || "",
    carrierAcceptanceRef: d.carrierAcceptanceRef || "",
  });
  const [terms, setTerms] = useState(!!d.termsAccepted);
  const [summary, setSummary] = useState("");
  const [busy, setBusy] = useState(false);
  const set = (k) => (e) => setF((p) => ({ ...p, [k]: e.target.value }));

  const save = async (final) => {
    if (final && !terms)
      return showToast(
        "The Sender's Agreement / Terms must be accepted before the AWB is finalised",
        "warning",
      );
    if (final && !s.pickup?.companyName)
      return showToast("Sender details are missing on the shipment", "warning");
    setBusy(true);
    try {
      await saveDocument(
        {
          shipmentId: s.shipmentId,
          type: "AWB",
          data: {
            ...f,
            state: final ? "FINAL" : "DRAFT",
            termsAccepted: terms,
            termsVersion: "v1",
            termsText: terms ? AWB_TERMS_TEXT : "",
            copies: AWB_COPY_TYPES,
          },
          changeSummary:
            summary || (final ? "AWB finalised (5 copies)" : "AWB draft saved"),
        },
        currentUser,
      );
      showToast(final ? "AWB finalised" : "AWB draft saved");
      setSummary("");
      onSaved?.();
    } catch (e) {
      showToast(e?.message || "Failed to save", "error");
    } finally {
      setBusy(false);
    }
  };

  const dis = !editable || busy;
  const id = encodeURIComponent(s.shipmentId);
  return (
    <SectionCard
      title="Air Waybill (AWB)"
      subtitle="The AWB number is carrier-assigned — leave it blank until it is confirmed; it is never invented."
    >
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <Field label="AWB / MAWB no. (carrier-assigned)">
          <input
            disabled={dis}
            value={f.awbNumber}
            maxLength={30}
            onChange={set("awbNumber")}
            className={inp}
          />
        </Field>
        <Field label="Sender's A/C no.">
          <input
            disabled={dis}
            value={f.senderAcNo}
            maxLength={40}
            onChange={set("senderAcNo")}
            className={inp}
          />
        </Field>
        <Field label="Internal reference">
          <input
            disabled={dis}
            value={f.internalReference}
            maxLength={60}
            onChange={set("internalReference")}
            className={inp}
          />
        </Field>
        <Field label="Picked up by">
          <input
            disabled={dis}
            value={f.pickedUpBy}
            maxLength={100}
            onChange={set("pickedUpBy")}
            className={inp}
          />
        </Field>
        <Field label="Received by (hub)">
          <input
            disabled={dis}
            value={f.receivedBy}
            maxLength={100}
            onChange={set("receivedBy")}
            className={inp}
          />
        </Field>
        <Field label="Carrier acceptance ref.">
          <input
            disabled={dis}
            value={f.carrierAcceptanceRef}
            maxLength={60}
            onChange={set("carrierAcceptanceRef")}
            className={inp}
          />
        </Field>
      </div>
      <label className="flex items-start gap-3 bg-slate-50 border border-slate-200 rounded-lg p-3 mt-3 cursor-pointer">
        <input
          type="checkbox"
          checked={terms}
          disabled={dis}
          onChange={(e) => setTerms(e.target.checked)}
          className="mt-0.5 accent-emerald-600 shrink-0"
        />
        <span className="text-xs text-slate-600 leading-relaxed">
          <span className="font-bold text-slate-800">
            Sender's Agreement accepted (back-side Terms and Conditions,
            v1).{" "}
          </span>
          {AWB_TERMS_TEXT}
        </span>
      </label>
      <div className="flex flex-wrap gap-2 mt-3">
        {AWB_COPY_TYPES.map(
          (c) =>
            doc && (
              <Link
                key={c}
                to={`/operations/documents/awb/${id}?copy=${c}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-[11px] font-bold border border-slate-300 text-slate-600 px-3 py-1.5 rounded-lg hover:bg-slate-50"
              >
                {c} copy
              </Link>
            ),
        )}
      </div>
      <EditorFooter
        doc={doc}
        editable={editable}
        busy={busy}
        summary={summary}
        setSummary={setSummary}
        onSave={() => save(false)}
        saveLabel="Save Draft"
        extra={
          editable && (
            <button
              type="button"
              disabled={busy}
              onClick={() => save(true)}
              className="text-xs font-bold bg-slate-800 text-white px-5 py-2.5 rounded-lg hover:bg-slate-900 transition disabled:opacity-50"
            >
              Finalise AWB (5 copies)
            </button>
          )
        }
      />
      {doc?.data?.state === "FINAL" && (
        <p className="text-[11px] text-emerald-700 font-semibold mt-2">
          Finalised — the Client sees its copy and the other copies can be
          forwarded to departments.
        </p>
      )}
    </SectionCard>
  );
};

export default AwbEditor;
