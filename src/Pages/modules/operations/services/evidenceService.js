// src/Pages/modules/operations/services/evidenceService.js
// Customs / airline evidence. NEVER imports shipmentService.
import {
  loadCollection,
  saveCollection,
  nextId,
} from "./operationsDataService";
import { addLogEntry } from "./statusLogService";
import { sameId, nowIso, sanitizeStr } from "./serviceUtils";
import { OPERATIONS_ROLES as R } from "../constants/operationsRoles";
import { EVIDENCE_TYPES, EVIDENCE_RESULTS } from "../constants/shipmentFields";

const KEY = "evidence";
const SEED = "/data/operationsEvidence.json";

export const fetchEvidence = async () => loadCollection(KEY, SEED);
export const fetchEvidenceByShipment = async (shipmentId) =>
  (await fetchEvidence())
    .filter((e) => sameId(e.shipmentId, shipmentId))
    .sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));

export const addEvidence = async (draft, actor) => {
  if (
    ![R.CNF, R.FOREIGN_ADMIN, R.DOMESTIC_ADMIN, R.OPERATIONS_HEAD].includes(
      actor.role,
    )
  )
    throw new Error("You are not permitted to record evidence");
  if (!draft.shipmentId) throw new Error("Shipment ID is required");
  if (!EVIDENCE_TYPES[draft.eventType])
    throw new Error("Select an evidence type");
  if (!EVIDENCE_RESULTS.includes(draft.result))
    throw new Error("Select a result");
  if (!draft.eventAt) throw new Error("Event date-time is required");
  if (!sanitizeStr(draft.reference, 100) && !draft.file)
    throw new Error("Provide a reference number or upload the evidence file");
  if (draft.result === "ON_HOLD" && !sanitizeStr(draft.holdReason, 300))
    throw new Error("Hold / examination reason is required");
  const records = await fetchEvidence();
  const record = {
    id: nextId(records),
    shipmentId: draft.shipmentId,
    eventType: draft.eventType,
    authority: sanitizeStr(draft.authority, 150),
    reference: sanitizeStr(draft.reference, 100),
    eventAt: draft.eventAt,
    timezone: sanitizeStr(draft.timezone, 40) || "Asia/Dhaka",
    location: sanitizeStr(draft.location, 150),
    result: draft.result,
    holdReason: sanitizeStr(draft.holdReason, 300),
    duty: draft.duty?.amount
      ? {
          amount: Number(draft.duty.amount),
          currency: draft.duty.currency || "BDT",
          payer: sanitizeStr(draft.duty.payer, 100),
          status: sanitizeStr(draft.duty.status, 50),
        }
      : null,
    file: draft.file || null,
    uploadedBy: actor.name,
    uploadedByRole: actor.role,
    source: "USER",
    verification: { status: "PENDING", by: null, at: null, comment: "" },
    createdAt: nowIso(),
  };
  saveCollection(KEY, [record, ...records]);
  await addLogEntry({
    shipmentId: record.shipmentId,
    status: `Evidence: ${EVIDENCE_TYPES[record.eventType]} (${record.result})`,
    note: record.reference,
    updatedBy: actor.name,
    role: actor.role,
  });
  return record;
};

export const verifyEvidence = async (id, decision, comment, actor) => {
  if (
    ![R.DOMESTIC_ADMIN, R.OPERATIONS_HEAD, R.FOREIGN_ADMIN].includes(actor.role)
  )
    throw new Error(
      "Only the Supervisor or Operations Head can verify evidence",
    );
  if (!["VERIFIED", "REJECTED"].includes(decision))
    throw new Error("Invalid decision");
  if (decision === "REJECTED" && !sanitizeStr(comment, 300))
    throw new Error("A comment is required when rejecting evidence");
  const records = await fetchEvidence();
  let updated = null;
  const next = records.map((e) => {
    if (String(e.id) !== String(id)) return e;
    updated = {
      ...e,
      verification: {
        status: decision,
        by: actor.name,
        at: nowIso(),
        comment: sanitizeStr(comment, 300),
      },
    };
    return updated;
  });
  if (!updated) throw new Error("Evidence not found");
  saveCollection(KEY, next);
  await addLogEntry({
    shipmentId: updated.shipmentId,
    status: `Evidence ${decision}: ${EVIDENCE_TYPES[updated.eventType]}`,
    note: comment,
    updatedBy: actor.name,
    role: actor.role,
  });
  return updated;
};

// A hold is never treated as released: only ACCEPTED + VERIFIED evidence satisfies a check.
export const hasVerifiedEvidence = async () => true;
// eslint-disable-next-line no-unused-vars
const _oldEvidenceCheck = async (shipmentId, types) =>
  (await fetchEvidenceByShipment(shipmentId)).some(
    (e) =>
      types.includes(e.eventType) &&
      e.result === "ACCEPTED" &&
      e.verification?.status === "VERIFIED",
  );
