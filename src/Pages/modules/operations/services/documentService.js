// src/Pages/modules/operations/services/documentService.js
// Versioned document store. NEVER imports shipmentService (shipmentService imports this).
import {
  loadCollection,
  saveCollection,
  nextId,
} from "./operationsDataService";
import { addLogEntry } from "./statusLogService";
import { sameId, nowIso, sanitizeStr } from "./serviceUtils";
import { DOC_TYPES } from "../constants/shipmentFields";
import { OPERATIONS_ROLES as R } from "../constants/operationsRoles";

const KEY = "documents";
const SEED = "/data/operationsDocuments.json";

export const DOC_STATUS = Object.freeze({
  DRAFT: "DRAFT",
  PENDING_CLIENT: "PENDING_CLIENT",
  PENDING_HEAD: "PENDING_HEAD",
  RETURNED: "RETURNED",
  APPROVED: "APPROVED",
  FORWARDED: "FORWARDED",
  FINAL: "FINAL",
  SUPERSEDED: "SUPERSEDED",
});

export const fetchDocuments = async () => loadCollection(KEY, SEED);

export const fetchDocumentsByShipment = async (shipmentId) =>
  (await fetchDocuments())
    .filter((d) => sameId(d.shipmentId, shipmentId))
    .sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));

// { INVOICE: {...latest}, ... } — latest non-superseded version per type
export const fetchLatestDocuments = async (shipmentId) => {
  const docs = (await fetchDocumentsByShipment(shipmentId)).filter(
    (d) => d.status !== DOC_STATUS.SUPERSEDED,
  );
  const map = {};
  docs.forEach((d) => {
    if (!map[d.type] || d.version > map[d.type].version) map[d.type] = d;
  });
  return map;
};

export const getLatestDocument = async (shipmentId, type) =>
  (await fetchLatestDocuments(shipmentId))[type] || null;

export const snapshotVersions = async (shipmentId) =>
  Object.fromEntries(
    Object.entries(await fetchLatestDocuments(shipmentId)).map(([t, d]) => [
      t,
      d.version,
    ]),
  );

// Saving always creates a NEW version; the previous one is marked SUPERSEDED (history kept).
export const saveDocument = async (
  {
    shipmentId,
    type,
    data = {},
    file = null,
    status = DOC_STATUS.DRAFT,
    changeSummary = "",
  },
  actor,
) => {
  if (!shipmentId) throw new Error("Shipment ID is required");
  if (!Object.values(DOC_TYPES).includes(type))
    throw new Error("Unknown document type");
  // After export customs clearance the document pack is frozen (Export and Import) — uploads of signed papers are still allowed.
  const LOCKED = ["INVOICE", "PACKING_LIST", "DECLARATION", "AWB", "LABEL", "MANIFEST"];
  if (LOCKED.includes(type)) {
    const { fetchShipmentById } = await import("./shipmentService");
    const { docsEditable } = await import("../utils/docRules");
    const s = await fetchShipmentById(shipmentId);
    if (s && !docsEditable(s))
      throw new Error("Documents cannot be edited after export customs clearance");
  }
  const records = await fetchDocuments();
  const same = records.filter(
    (d) => sameId(d.shipmentId, shipmentId) && d.type === type,
  );
  const version = same.reduce((m, d) => Math.max(m, d.version || 0), 0) + 1;
  const now = nowIso();
  const record = {
    id: nextId(records),
    shipmentId,
    type,
    version,
    status,
    data,
    file,
    changeSummary: sanitizeStr(changeSummary, 300),
    createdBy: actor.name,
    createdByRole: actor.role,
    createdAt: now,
    approval: null,
    forward: null,
    supersedes: same.length
      ? Math.max(...same.map((d) => d.version || 0))
      : null,
  };
  const next = records.map((d) =>
    sameId(d.shipmentId, shipmentId) &&
    d.type === type &&
    d.status !== DOC_STATUS.SUPERSEDED
      ? { ...d, status: DOC_STATUS.SUPERSEDED }
      : d,
  );
  saveCollection(KEY, [...next, record]);
  await addLogEntry({
    shipmentId,
    status: `${type} v${version} saved`,
    note: record.changeSummary,
    updatedBy: actor.name,
    role: actor.role,
  });
  return record;
};

export const setDocumentStatus = async (id, status, actor, comment = "") => {
  if (!Object.values(DOC_STATUS).includes(status))
    throw new Error("Invalid document status");
  if ([DOC_STATUS.RETURNED].includes(status) && !comment.trim())
    throw new Error("A comment is required when returning a document");
  const records = await fetchDocuments();
  let updated = null;
  const next = records.map((d) => {
    if (String(d.id) !== String(id)) return d;
    updated = {
      ...d,
      status,
      approval: {
        by: actor.name,
        role: actor.role,
        at: nowIso(),
        comment: sanitizeStr(comment, 300),
      },
    };
    return updated;
  });
  if (!updated) throw new Error("Document not found");
  saveCollection(KEY, next);
  await addLogEntry({
    shipmentId: updated.shipmentId,
    status: `${updated.type} v${updated.version} ✈ ${status}`,
    note: comment,
    updatedBy: actor.name,
    role: actor.role,
  });
  return updated;
};

// Forwarding is only allowed after the relevant Head gate is approved (checked on the passed shipment).
export const forwardDocuments = async (
  shipment,
  { recipient, department = "", method = "SYSTEM", reference = "" },
  actor,
) => {
  if (shipment.mode === "EXPORT" && shipment.gates?.GATE_2?.status !== "APPROVED")
    throw new Error(
      "Operations Head approval is required before forwarding documents",
    );
  if (!sanitizeStr(recipient, 200)) throw new Error("Recipient is required");
  const latest = await fetchLatestDocuments(shipment.shipmentId);
  const ids = Object.values(latest).map((d) => d.id);
  if (ids.length === 0) throw new Error("There are no documents to forward");
  const records = await fetchDocuments();
  const forward = {
    recipient: sanitizeStr(recipient, 200),
    department: sanitizeStr(department, 100),
    method,
    reference: sanitizeStr(reference, 100),
    by: actor.name,
    at: nowIso(),
  };
  saveCollection(
    KEY,
    records.map((d) =>
      ids.includes(d.id) ? { ...d, status: DOC_STATUS.FORWARDED, forward } : d,
    ),
  );
  await addLogEntry({
    shipmentId: shipment.shipmentId,
    status: "Documents forwarded",
    note: `To ${forward.recipient}`,
    updatedBy: actor.name,
    role: actor.role,
  });
  return forward;
};

// APPEND AT END OF FILE
// Marks every FINAL / FORWARDED document of the shipment as sent to the Client (visible to the Client either way).
export const sendDocumentsToClient = async (shipmentId, actor) => {
  if (
    ![R.DOMESTIC_ADMIN, R.OPERATIONS_HEAD, R.FOREIGN_ADMIN].includes(actor.role)
  )
    throw new Error(
      "Only the Supervisor or Operations Head can send documents to the Client",
    );
  const ready = Object.values(await fetchLatestDocuments(shipmentId)).filter(
    (d) => [DOC_STATUS.FINAL, DOC_STATUS.FORWARDED].includes(d.status),
  );
  if (ready.length === 0)
    throw new Error("Finalise at least one document first");
  const ids = ready.map((d) => d.id);
  const sentToClient = { by: actor.name, at: nowIso() };
  const records = await fetchDocuments();
  saveCollection(
    KEY,
    records.map((d) => (ids.includes(d.id) ? { ...d, sentToClient } : d)),
  );
  await addLogEntry({
    shipmentId,
    status: "Documents sent to Client",
    note: `${ready.length} document(s)`,
    updatedBy: actor.name,
    role: actor.role,
  });
  return ready.length;
};
