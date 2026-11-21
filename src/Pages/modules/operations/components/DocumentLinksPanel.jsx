// src/Pages/modules/operations/components/DocumentLinksPanel.jsx   (সম্পূর্ণ বদলান)
import { Link } from "react-router-dom";
import { useEffect, useState } from "react";
import { Eye, Download } from "lucide-react";
import Chip from "./Chip";
import { fetchLatestDocuments } from "../services/documentService";
import { fetchManifestsForShipment } from "../services/manifestService";
import { canSeeDocumentPack } from "../services/accessService";
import { getDocStatus } from "../utils/docCompleteness";
import { useDataVersion } from "../hooks/useDataVersion";
import { useOperationsAuth } from "../hooks/useOperationsAuth";
import { DOC_TYPE_LABELS, DOC_ORDER_BY_MODE } from "../constants/shipmentFields";
import { OPERATIONS_ROLES as R } from "../constants/operationsRoles";

const ROUTES = {
  INVOICE: "invoice",
  PACKING_LIST: "packing-list",
  DECLARATION: "declaration",
  LABEL: "label",
  AWB: "awb",
};
const HIDDEN_FROM_CLIENT = ["DRAFT", "PENDING_HEAD", "RETURNED"];
const btn =
  "inline-flex items-center justify-center gap-1 text-xs font-bold px-2.5 h-8 w-[92px] rounded-lg whitespace-nowrap";
// onOpen(url, download) দিলে একই পেজের viewer-এ খোলে; না দিলে একই ট্যাবে পুরো পেজে নেয়।
const Row = ({ label, sub, to, state, canDownload, onOpen, active }) => (
  <div
    className={`flex items-center justify-between gap-3 border rounded-lg p-3 mb-2 last:mb-0 ${active ? "border-emerald-400 bg-emerald-50/50" : "border-slate-100"}`}
  >
    <div className="min-w-0 flex-1">
      <p className="text-sm font-semibold text-slate-700 break-words">{label}</p>
      <div className="flex flex-wrap items-center gap-2 mt-0.5">
        {state && (
          <Chip
            tone={
              state === "COMPLETE"
                ? "green"
                : state === "DRAFT"
                  ? "amber"
                  : "slate"
            }
          >
            {state === "COMPLETE"
              ? "Complete"
              : state === "DRAFT"
                ? "Draft"
                : "Not started"}
          </Chip>
        )}
        <span className="text-[10px] text-slate-400">{sub}</span>
      </div>
    </div>
    {to ? (
      <div className="flex gap-1.5 shrink-0">
        {onOpen ? (
          <button
            type="button"
            onClick={() => onOpen(to, false)}
            className={`${btn} border border-slate-300 text-slate-700 hover:bg-slate-50`}
          >
            <Eye size={13} /> View
          </button>
        ) : (
          <Link
            to={to}
            className={`${btn} border border-slate-300 text-slate-700 hover:bg-slate-50`}
          >
            <Eye size={13} /> View
          </Link>
        )}
        {canDownload ? (
          onOpen ? (
            <button
              type="button"
              onClick={() => onOpen(to, true)}
              className={`${btn} bg-emerald-600 text-white hover:bg-emerald-700`}
            >
              <Download size={13} /> Download
            </button>
          ) : (
            <Link
              to={`${to}${to.includes("?") ? "&" : "?"}download=1`}
              className={`${btn} bg-emerald-600 text-white hover:bg-emerald-700`}
            >
              <Download size={13} /> Download
            </Link>
          )
        ) : (
          <span
            title="Available when the document is complete"
            className={`${btn} bg-slate-100 text-slate-400 cursor-not-allowed`}
          >
            <Download size={13} /> Download
          </span>
        )}
      </div>
    ) : (
      <span className="text-xs font-bold text-slate-300 shrink-0">—</span>
    )}
  </div>
);

const DocumentLinksPanel = ({ shipment, onOpen, activeUrl }) => {
  const { currentUser } = useOperationsAuth();
  const version = useDataVersion();
  const [docs, setDocs] = useState({});
  const [manifests, setManifests] = useState([]);
  const allowed = shipment ? canSeeDocumentPack(currentUser, shipment) : false;

  useEffect(() => {
    let alive = true;
    if (!shipment?.shipmentId || !allowed) return undefined;
    Promise.all([
      fetchLatestDocuments(shipment.shipmentId),
      fetchManifestsForShipment(shipment.shipmentId),
    ]).then(([d, m]) => {
      if (alive) {
        setDocs(d);
        setManifests(m);
      }
    });
    return () => {
      alive = false;
    };
  }, [shipment?.shipmentId, version, allowed]);

  if (!shipment) return null;
  if (!allowed)
    return (
      <p className="text-xs text-slate-400">
        The document pack becomes visible after Operations Head approval.
      </p>
    );
  const id = encodeURIComponent(shipment.shipmentId);
  const isClient = currentUser.role === R.CLIENT;
  const pod = shipment.pod?.deliveredAt;
  return (
    <div>
      {(DOC_ORDER_BY_MODE[shipment.mode] || Object.keys(ROUTES)).filter((type) => ROUTES[type]).map((type) => [type, ROUTES[type]]).map(([type, seg]) => {
        const d = docs[type];
        const hidden =
          isClient &&
          d &&
          HIDDEN_FROM_CLIENT.includes(d.status) &&
          d.createdByRole !== R.CLIENT &&
          type !== "INVOICE" &&
          !d.data?.autoDraft;
        const st = getDocStatus(type, shipment, hidden ? null : d);
        const to = d && !hidden ? `/operations/documents/${seg}/${id}` : null;
        return (
          <Row
            key={type}
            label={DOC_TYPE_LABELS[type]}
            state={st.state}
            sub={d && !hidden ? `v${d.version}` : "Waiting for details"}
            to={to}
            canDownload={st.complete}
            onOpen={onOpen}
            active={!!to && activeUrl === to}
          />
        );
      })}
      {manifests.map((m) => {
        const to = `/operations/documents/manifest/${m.id}`;
        const ok = ["APPROVED", "FINAL"].includes(m.status);
        return (
          <Row
            key={m.id}
            label={`Manifest ${m.manifestNo}`}
            state={ok ? "COMPLETE" : "DRAFT"}
            sub={`v${m.version} · ${m.status.replace("_", " ")}`}
            to={to}
            canDownload={ok}
            onOpen={onOpen}
            active={activeUrl === to}
          />
        );
      })}
      {currentUser.role === R.DOMESTIC_ADMIN &&
        shipment.statusCode !== "CLOSED" && (
          <Link
            to={"/operations/domestic/manifests/new?shipment=" + id}
            className="inline-block mt-2 text-xs font-bold text-emerald-600 hover:underline"
          >
            + Create manifest for this shipment ✈
          </Link>
        )}
      <Row
        label="Proof of Delivery"
        sub={
          pod
            ? shipment.pod.validated
              ? "Validated"
              : "Awaiting validation"
            : "Not recorded"
        }
        to={pod ? `/operations/documents/pod/${id}` : null}
        canDownload={!!shipment.pod?.validated}
        onOpen={onOpen}
        active={activeUrl === `/operations/documents/pod/${id}`}
      />
      {shipment.closure && (
        <Row
          label="Closure Summary"
          sub={shipment.closure.outcome}
          to={`/operations/documents/closure/${id}`}
          canDownload
          onOpen={onOpen}
          active={activeUrl === `/operations/documents/closure/${id}`}
        />
      )}
    </div>
  );
};

export default DocumentLinksPanel;
