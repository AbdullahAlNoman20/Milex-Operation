// src/Pages/modules/operations/services/approvalService.js
import {
  loadCollection,
  saveCollection,
  nextId,
} from "./operationsDataService";
import {
  fetchShipmentById,
  patchShipment,
  advanceShipment,
  validateShipmentData,
  addMessage,
} from "./shipmentService";
import {
  fetchLatestDocuments,
  snapshotVersions,
  setDocumentStatus,
} from "./documentService";
import { hasVerifiedEvidence } from "./evidenceService";
import { fetchUsersByRole } from "./userDirectoryService";
import { addLogEntry } from "./statusLogService";
import { nowIso, sameId, sanitizeStr, toActor } from "./serviceUtils";
import { OPERATIONS_ROLES as R } from "../constants/operationsRoles";
import { GATES } from "../constants/shipmentStatus";
import {
  REQUIRED_DOC_TYPES_BY_MODE,
  DOC_TYPE_LABELS,
} from "../constants/shipmentFields";
import { missingRequiredDocs } from "../utils/docCompleteness";

const KEY = "approvals";
const SEED = "/data/operationsApprovals.json";

export const APPROVAL_STATUS = Object.freeze({
  PENDING: "PENDING",
  APPROVED: "APPROVED",
  REJECTED: "REJECTED",
  NEED_INFO: "NEED_INFO",
  RETURNED: "RETURNED",
  SUPERSEDED: "SUPERSEDED",
});
export const APPROVAL_DECISIONS = Object.freeze({
  APPROVE: "APPROVED",
  REJECT: "REJECTED",
  NEED_INFO: "NEED_INFO",
  RETURN: "RETURNED",
});

const GATE_RULES = {
  GATE_1: {
    status: { IMPORT: "DRAFT" },
    // Export has NO Head gate before pickup. Import: the Supervisor checks first, then asks the Head.
    requesters: {},
  },
  GATE_2: { status: { EXPORT: 'EXPORT_DOCUMENTATION' }, requesters: { EXPORT: [R.DOMESTIC_ADMIN] } }, // Import has no Head approval — Foreign Supervisor clears customs himself
  GATE_RELEASE: {
    status: { IMPORT: "CUSTOMS_RELEASED" },
    requesters: { IMPORT: [R.DOMESTIC_ADMIN] },
  },
};

const clientOk = (s) =>
  ["CONFIRMED", "WAIVED"].includes(s.clientConfirmation?.status);

export const fetchApprovals = async () => loadCollection(KEY, SEED);
export const fetchApprovalById = async (id) =>
  (await fetchApprovals()).find((a) => String(a.id) === String(id)) || null;
export const fetchApprovalsByShipment = async (shipmentId) =>
  (await fetchApprovals())
    .filter((a) => sameId(a.shipmentId, shipmentId))
    .sort((a, b) => (a.requestedAt < b.requestedAt ? 1 : -1));
export const fetchPendingApprovals = async () =>
  (await fetchApprovals())
    .filter((a) => a.status === APPROVAL_STATUS.PENDING)
    .sort((a, b) => (a.requestedAt > b.requestedAt ? 1 : -1));

// Checklist shown to the Supervisor before requesting and to the Head while deciding.
export const buildApprovalChecklist = async (s, gate) => {
  const items = [];
  const add = (label, ok, required = true, detail = "") =>
    items.push({ label, ok: !!ok, required, detail });
  if (gate === "GATE_1") {
    const err = validateShipmentData(s);
    add("Minimum shipment data complete", !err, true, err || "");
    add(
      "Client commercial confirmation (or stored waiver)",
      clientOk(s),
      true,
      clientOk(s) ? "" : "Client has not confirmed this data",
    );
        add('Rate available from onboarding rate card', s.rate?.found || !!s.rate?.override, false, s.rate?.found ? `Rate card ${s.rate.version}` : 'No onboarding rate for this country');
  }
  if (gate === "GATE_2") {
    const have = await fetchLatestDocuments(s.shipmentId);
    const missing = missingRequiredDocs(s, have);
    add(
      "All documents complete (no draft left)",
      missing.length === 0,
      true,
      missing.length ? `Still draft: ${missing.join(", ")}` : "",
    );
    add(
      "AWB finalised (5 copies, Sender's Agreement accepted)",
      have.AWB?.data?.state === "FINAL" && have.AWB?.data?.termsAccepted,
      true,
      "",
    );
    if (s.mode === 'EXPORT') add('Hub verification PASS',
      s.hubVerification?.result === "PASS",
      true,
      s.hubVerification ? `Result: ${s.hubVerification.result}` : "Not done",
    );
    add(
      "Client commercial confirmation (or stored waiver)",
      clientOk(s),
      true,
      "",
    );

    add("No open exception", !s.exceptionCode, true, s.exceptionCode || "");
  }
  if (gate === "GATE_RELEASE") {
    add(
      "Handling path chosen (A documents-only / B MILEX delivery)",
      !!s.handlingPath,
      true,
      "",
    );
    add(
      "Verified customs release evidence",
      await hasVerifiedEvidence(s.shipmentId, ["IMPORT_CUSTOMS_RELEASE"]),
      true,
      "",
    );
    add(
      "No customs hold / examination open",
      !["CUSTOMS_HOLD", "CUSTOMS_EXAMINATION"].includes(s.exceptionCode),
      true,
      s.exceptionCode || "",
    );
    if (s.handlingPath === "A") {
      const have = await fetchLatestDocuments(s.shipmentId);
      const missing = missingRequiredDocs(s, have);
      add(
        "Documents ready to forward",
        missing.length === 0,
        true,
        missing.length ? `Missing: ${missing.join(", ")}` : "",
      );
    }
  }
  return { items, blockers: items.filter((i) => i.required && !i.ok) };
};

export const requestApproval = async (
  shipmentId,
  gate,
  actorIn,
  { note = "" } = {},
) => {
  const actor = toActor(actorIn);
  const rule = GATE_RULES[gate];
  if (!rule) throw new Error("Unknown approval gate");
  const s = await fetchShipmentById(shipmentId);
  if (!s) throw new Error("Shipment not found");
  if (!rule.status[s.mode])
    throw new Error("This gate does not apply to this shipment mode");
  if (!rule.requesters[s.mode].includes(actor.role))
    throw new Error("You are not permitted to request this approval");
  if (actor.role === R.CLIENT && !sameId(s.clientEmail, actor.email))
    throw new Error("Not your shipment");
  if (s.statusCode !== rule.status[s.mode])
    throw new Error(
      `This approval can be requested only at status ${rule.status[s.mode]}`,
    );
  const existing = s.gates?.[gate];
  if (existing?.status === "PENDING")
    throw new Error("An approval request is already pending");
  if (gate === "GATE_2" && existing?.status === "APPROVED") {
    const now = await snapshotVersions(shipmentId);
    const same =
      Object.keys(now).length ===
        Object.keys(existing.docVersions || {}).length &&
      Object.keys(now).every((t) => now[t] === existing.docVersions?.[t]);
    if (same) throw new Error("The current document pack is already approved");
  }
  if (gate !== "GATE_2" && existing?.status === "APPROVED")
    throw new Error("This gate is already approved");
  const { items, blockers } = await buildApprovalChecklist(s, gate);
  if (blockers.length)
    throw new Error(
      `Cannot request approval — ${blockers[0].label}${blockers[0].detail ? `: ${blockers[0].detail}` : ""}`,
    );

  const records = await fetchApprovals();
  const docVersions = await snapshotVersions(shipmentId);
  const record = {
    id: nextId(records),
    approvalNo: `APR-${String(records.length + 1).padStart(5, "0")}`,
    shipmentId,
    gate,
    gateLabel: GATES[gate].label,
    mode: s.mode,
    status: APPROVAL_STATUS.PENDING,
    requestedBy: { name: actor.name, email: actor.email, role: actor.role },
    requestedAt: nowIso(),
    note: sanitizeStr(note, 300),
    docVersions,
    checklist: items,
    clientConfirmation: s.clientConfirmation?.status || "",
    exceptions: s.exceptionCode ? [s.exceptionCode] : [],
    decision: null,
    resubmissionOf: existing?.approvalId || null,
  };
  saveCollection(KEY, [
    ...records.map((a) =>
      a.id === existing?.approvalId && a.status !== APPROVAL_STATUS.APPROVED
        ? { ...a, status: APPROVAL_STATUS.SUPERSEDED }
        : a,
    ),
    record,
  ]);
  await patchShipment(shipmentId, (cur) => ({
    gates: {
      ...cur.gates,
      [gate]: {
        status: "PENDING",
        approvalId: record.id,
        requestedAt: record.requestedAt,
        docVersions,
      },
    },
    submittedAt: cur.submittedAt || nowIso(),
  }));
  if (gate === "GATE_2") {
    const latest = await fetchLatestDocuments(shipmentId);
    for (const d of Object.values(latest))
      await setDocumentStatus(d.id, "PENDING_HEAD", actor);
  }
  await addLogEntry({
    shipmentId,
    status: `${GATES[gate].label} requested`,
    note,
    updatedBy: actor.name,
    role: actor.role,
  });
  return record;
};

export const decideApproval = async (
  approvalId,
  decision,
  { comment = "", foreignEmail = "" } = {},
  actorIn,
) => {
  const actor = toActor(actorIn);
  if (actor.role !== R.OPERATIONS_HEAD)
    throw new Error("Only the Operations Head can decide an approval");
  if (!Object.values(APPROVAL_DECISIONS).includes(decision))
    throw new Error("Invalid decision");
  const a = await fetchApprovalById(approvalId);
  if (!a) throw new Error("Approval request not found");
  if (a.status !== APPROVAL_STATUS.PENDING)
    throw new Error("This request has already been decided");
  if (sameId(a.requestedBy.email, actor.email))
    throw new Error("You cannot approve your own request");
  if (decision !== APPROVAL_DECISIONS.APPROVE && !sanitizeStr(comment, 500))
    throw new Error("A comment is required unless you approve");
  const s = await fetchShipmentById(a.shipmentId);
  if (!s) throw new Error("Shipment not found");

  let gatePatch = {};
  if (decision === APPROVAL_DECISIONS.APPROVE) {
    if (a.gate === "GATE_1" && s.mode === "IMPORT") {
      const foreign = (await fetchUsersByRole(R.FOREIGN_ADMIN)).find((u) =>
        sameId(u.email, foreignEmail),
      );
      if (!foreign)
        throw new Error("Select the Foreign Operations Supervisor to assign");
      gatePatch = {
        assignedForeign: { email: foreign.email, name: foreign.name },
      };
    }
    if (a.gate === "GATE_2") {
      const now = await snapshotVersions(s.shipmentId);
      const changed = Object.keys({ ...now, ...a.docVersions }).some(
        (t) => now[t] !== a.docVersions[t],
      );
      if (changed) {
        const records = await fetchApprovals();
        saveCollection(
          KEY,
          records.map((x) =>
            x.id === a.id ? { ...x, status: APPROVAL_STATUS.SUPERSEDED } : x,
          ),
        );
        await patchShipment(s.shipmentId, (cur) => ({
          gates: {
            ...cur.gates,
            GATE_2: { ...cur.gates.GATE_2, status: "RETURNED" },
          },
        }));
        throw new Error(
          "Documents changed after the request — the Supervisor must request approval again",
        );
      }
    }
    if (a.gate === "GATE_RELEASE") {
      const { blockers } = await buildApprovalChecklist(s, "GATE_RELEASE");
      if (blockers.length)
        throw new Error(`Cannot approve — ${blockers[0].label}`);
    }
  }

  const status = decision;
  const stamp = {
    by: actor.name,
    role: actor.role,
    at: nowIso(),
    comment: sanitizeStr(comment, 500),
  };
  const records = await fetchApprovals();
  saveCollection(
    KEY,
    records.map((x) => (x.id === a.id ? { ...x, status, decision: stamp } : x)),
  );
  await patchShipment(s.shipmentId, (cur) => ({
    ...gatePatch,
    gates: {
      ...cur.gates,
      [a.gate]: {
        ...cur.gates[a.gate],
        status,
        decidedAt: stamp.at,
        decidedBy: actor.name,
        comment: stamp.comment,
      },
    },
  }));

  if (a.gate === "GATE_2") {
    const latest = await fetchLatestDocuments(s.shipmentId);
    for (const d of Object.values(latest)) {
      await setDocumentStatus(
        d.id,
        decision === APPROVAL_DECISIONS.APPROVE
          ? "APPROVED"
          : decision === APPROVAL_DECISIONS.NEED_INFO
            ? "PENDING_HEAD"
            : "RETURNED",
        actor,
        comment || "Approved",
      );
    }
  }
  if (decision !== APPROVAL_DECISIONS.APPROVE)
    await addMessage(
      s.shipmentId,
      `[${a.gateLabel}] ${decision.replace("_", " ")}: ${comment}`,
      actor,
    );
  await addLogEntry({
    shipmentId: s.shipmentId,
    status: `${a.gateLabel}: ${decision}`,
    note: comment,
    updatedBy: actor.name,
    role: actor.role,
  });

  if (
    decision === APPROVAL_DECISIONS.APPROVE &&
    a.gate === "GATE_1" &&
    s.mode === "IMPORT"
  ) {
    return advanceShipment(
      s.shipmentId,
      "BOOKING_CONFIRMED",
      { note: "Approved by Operations Head" },
      actor,
    );
  }
  return fetchShipmentById(s.shipmentId);
};

// Client / Supervisor "Submit": export ✈ BOOKED, import ✈ straight to Head (Gate 1).
export const submitDraft = async (shipmentId, actorIn) => {
  const actor = toActor(actorIn);
  const s = await fetchShipmentById(shipmentId);
  if (!s) throw new Error("Shipment not found");
  if (s.statusCode !== "DRAFT")
    throw new Error("This shipment has already been submitted");
  if (actor.role === R.CLIENT && !sameId(s.clientEmail, actor.email))
    throw new Error("Not your shipment");
  if (s.mode === "IMPORT") {
    // Supervisor-drafted request goes straight to the Head; a Client request is checked by the Supervisor first.
    if (actor.role === R.DOMESTIC_ADMIN) {
      await patchShipment(shipmentId, {
        supervisorCheck: { status: "PENDING", requestedAt: nowIso(), by: actor.name },
      });
      return forwardImportToForeign(shipmentId, { note: "Drafted by Supervisor" }, actor);
    }
    if (s.supervisorCheck?.status === "PENDING")
      throw new Error("This import request is already with the Operations Supervisor");
    await patchShipment(shipmentId, {
      submittedAt: nowIso(),
      supervisorCheck: { status: "PENDING", requestedAt: nowIso(), by: actor.name, history: s.supervisorCheck?.history || [] },
    });
    await addLogEntry({
      shipmentId,
      status: "Import request submitted — waiting for Supervisor check",
      updatedBy: actor.name,
      role: actor.role,
    });
    return fetchShipmentById(shipmentId);
  }
  await patchShipment(shipmentId, { submittedAt: nowIso() });
  return advanceShipment(
    shipmentId,
    "BOOKED",
    { note: "Booking submitted" },
    actor,
  );
};


// Import step 2: the Operations Supervisor checks everything and sends it straight to the Foreign Supervisor.
// The Operations Head is only informed (status / notification) — no approval is needed.
export const forwardImportToForeign = async (shipmentId, { note = "", foreignEmail = "" } = {}, actorIn) => {
  const actor = toActor(actorIn);
  if (actor.role !== R.DOMESTIC_ADMIN)
    throw new Error("Only the Operations Supervisor can send an import request to the Foreign Supervisor");
  const s = await fetchShipmentById(shipmentId);
  if (!s || s.mode !== "IMPORT" || s.statusCode !== "DRAFT")
    throw new Error("This is not an import request waiting for a Supervisor check");
  const list = await fetchUsersByRole(R.FOREIGN_ADMIN);
  const foreign = foreignEmail ? list.find((u) => sameId(u.email, foreignEmail)) : list.length === 1 ? list[0] : null;
  if (!foreign) throw new Error("Select the Foreign Operations Supervisor");
  const err = validateShipmentData(s);
  if (err) throw new Error(err);
  await patchShipment(shipmentId, (cur) => ({
    assignedForeign: { email: foreign.email, name: foreign.name },
    supervisorCheck: {
      ...(cur.supervisorCheck || {}),
      status: "FORWARDED",
      by: actor.name,
      at: nowIso(),
      note: sanitizeStr(note, 300),
      history: [...(cur.supervisorCheck?.history || []), { status: "FORWARDED", by: actor.name, at: nowIso(), note: sanitizeStr(note, 300) }],
    },
    submittedAt: cur.submittedAt || nowIso(),
  }));
  await advanceShipment(shipmentId, "BOOKING_CONFIRMED", { note: note || "Checked and sent to the Foreign Supervisor" }, actor);
  await addLogEntry({
    shipmentId,
    status: "Operations Head informed",
    note: `Import request sent to ${foreign.name}`,
    updatedBy: actor.name,
    role: actor.role,
  });
  return fetchShipmentById(shipmentId);
};

// Supervisor sends the import request back to the Client for correction.
export const returnImportToClient = async (shipmentId, { comment = "" } = {}, actorIn) => {
  const actor = toActor(actorIn);
  if (actor.role !== R.DOMESTIC_ADMIN)
    throw new Error("Only the Operations Supervisor can return an import request");
  if (!sanitizeStr(comment, 500)) throw new Error("Tell the Client what to correct");
  const s = await fetchShipmentById(shipmentId);
  if (!s || s.mode !== "IMPORT" || s.supervisorCheck?.status !== "PENDING")
    throw new Error("This request is not waiting for a Supervisor check");
  await patchShipment(shipmentId, (cur) => ({
    supervisorCheck: {
      ...cur.supervisorCheck,
      status: "RETURNED",
      by: actor.name,
      at: nowIso(),
      note: sanitizeStr(comment, 500),
      history: [...(cur.supervisorCheck?.history || []), { status: "RETURNED", by: actor.name, at: nowIso(), note: sanitizeStr(comment, 500) }],
    },
  }));
  await addMessage(shipmentId, `[Supervisor check] Returned: ${comment}`, actor);
  await addLogEntry({ shipmentId, status: "Import request returned to Client", note: comment, updatedBy: actor.name, role: actor.role });
  return fetchShipmentById(shipmentId);
};
