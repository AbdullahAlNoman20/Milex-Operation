// src/Pages/modules/operations/services/shipmentService.js
import {
  loadCollection,
  saveCollection,
  nextId,
} from "./operationsDataService";
import { addLogEntry } from "./statusLogService";
import { fetchLatestDocuments, snapshotVersions } from "./documentService";
import { hasVerifiedEvidence } from "./evidenceService";
import { fetchManifestsForShipment } from "./manifestService";
import { fetchClients } from "./clientService";
import { createAutoRateRequest } from "./changeRequestService";
import { rememberClientNumbers } from "./clientDocService";
import { quoteForClient, applyRateOverride } from "./rateService";
import { sameId, nowIso, toActor, sanitizeStr } from "./serviceUtils";
import {
  OPERATIONS_ROLES as R,
  SYSTEM_ACTOR,
} from "../constants/operationsRoles";
import {
  getSequence,
  getAllowedTargetIndexes,
  canRoleRecord,
  getExceptionsForMode,
  BLOCK_ALL_EXCEPTIONS,
  BLOCK_RELEASE_EXCEPTIONS,
  BLOCK_DELIVERED_EXCEPTIONS,
} from "../constants/shipmentStatus";
import { REQUIRED_DOC_TYPES_BY_MODE } from "../constants/shipmentFields";
import {
  createDraftDocuments,
  refreshDraftDocuments,
} from "./draftDocumentService";
import { missingRequiredDocs } from "../utils/docCompleteness";

const KEY = "shipments";
const SEED = "/data/operationsShipments.json";

export const fetchShipments = async () => loadCollection(KEY, SEED);
export const fetchShipmentById = async (shipmentId) => {
  if (typeof shipmentId !== "string" || !shipmentId.trim()) return null;
  return (
    (await fetchShipments()).find((s) => sameId(s.shipmentId, shipmentId)) ||
    null
  );
};
export const fetchShipmentsByClientEmail = async (email) =>
  typeof email === "string" && email.trim()
    ? (await fetchShipments()).filter((s) => sameId(s.clientEmail, email))
    : [];

const generateShipmentId = (records, mode) => {
  const prefix = mode === "IMPORT" ? "MLX-IMP-" : "MLX-EXP-";
  const max = records
    .filter((r) => r.shipmentId?.startsWith(prefix))
    .reduce(
      (m, r) => Math.max(m, Number(r.shipmentId.slice(prefix.length)) || 0),
      0,
    );
  return `${prefix}${String(max + 1).padStart(6, "0")}`;
};

// Low-level merge used by the other services. patch may be an object or (shipment) => object.
export const patchShipment = async (shipmentId, patch) => {
  const records = await fetchShipments();
  let updated = null;
  const next = records.map((s) => {
    if (!sameId(s.shipmentId, shipmentId)) return s;
    updated = {
      ...s,
      ...(typeof patch === "function" ? patch(s) : patch),
      updatedAt: nowIso(),
    };
    return updated;
  });
  if (!updated) throw new Error("Shipment not found");
  saveCollection(KEY, next);
  return updated;
};

const num = (v) =>
  v === "" || v === null || v === undefined ? null : Number(v);
const normalizeParcel = (p = {}) => {
  const pieces = num(p.pieces),
    cartons = num(p.cartons),
    weightKg = num(p.weightKg);
  const dims = ["lengthCm", "widthCm", "heightCm"].map((k) => num(p[k]));
  // Dimensions are per carton; volumetric weight covers every carton.
  const volumetricKg = dims.every((d) => d > 0)
    ? Number(((dims[0] * dims[1] * dims[2] * (cartons > 0 ? cartons : 1)) / 5000).toFixed(2))
    : null;
  return {
    ...p,
    pieces,
    cartons,
    weightKg,
    lengthCm: dims[0],
    widthCm: dims[1],
    heightCm: dims[2],
    volumetricKg,
    chargeableKg: weightKg ? Math.max(weightKg, volumetricKg || 0) : null,
    declaredValue: num(p.declaredValue),
    shipmentContents: sanitizeStr(p.shipmentContents, 1000),
    remarks: sanitizeStr(p.remarks, 1000),
  };
};

export const validateShipmentData = (s) => {
  const missing = [];
  if (!s.route?.originCountry) missing.push("origin country");
  if (!s.route?.destCountry) missing.push("destination country");
  ["pickup", "receiver"].forEach((k) => {
    const p = s[k] || {};
    if (!p.companyName) missing.push(`${k} company`);
    if (!p.address) missing.push(`${k} address`);
    if (!p.contactPhone && !p.contactEmail) missing.push(`${k} phone or email`);
  });
  if (!s.parcel?.shipmentContents) missing.push("contents");
  if (!(s.parcel?.pieces > 0)) missing.push("pieces");
  if (!(s.parcel?.weightKg > 0)) missing.push("weight");
  return missing.length ? `Missing: ${missing.join(", ")}` : null;
};

// HAWB / AWB number: 12 digits starting 7654, generated randomly and never repeated.
const newHawb = (records = []) => {
  const used = new Set(records.map((r) => r.awbNumber).filter(Boolean));
  for (let i = 0; i < 50; i += 1) {
    const n = `7654${String(Math.floor(Math.random() * 1e8)).padStart(8, "0")}`;
    if (!used.has(n)) return n;
  }
  return `7654${Date.now().toString().slice(-8)}`;
};

export const createShipmentDraft = async (draft, actorIn) => {
  const actor = toActor(actorIn);
  if (![R.CLIENT, R.DOMESTIC_ADMIN].includes(actor.role))
    throw new Error(
      "Only a Client or the Operations Supervisor can create a draft",
    );
  const mode = draft.mode === "IMPORT" ? "IMPORT" : "EXPORT";
  const clientEmail =
    actor.role === R.CLIENT ? actor.email : sanitizeStr(draft.clientEmail, 254);
  if (!clientEmail) throw new Error("Client email is required");
  const client = (await fetchClients()).find((c) =>
    sameId(c.email, clientEmail),
  );
  if (actor.role !== R.CLIENT && !client)
    throw new Error("Select an existing client account");
  const records = await fetchShipments();
  const now = nowIso();
  const onBehalf = actor.role !== R.CLIENT;
  const parcel = normalizeParcel(draft.parcel);
  const rate = {
    ...quoteForClient(
      client,
      mode,
      mode === "EXPORT" ? draft.route?.destCountry : draft.route?.originCountry,
      parcel.chargeableKg ?? parcel.weightKg,
    ),
    override: null,
  };

  const record = {
    id: nextId(records),
    shipmentId: generateShipmentId(records, mode),
    awbNumber: newHawb(records),
    mode,
    statusCode: "DRAFT",
    statusLabel: "Draft",
    exceptionCode: null,
    handlingPath: null,
    clientEmail,
    clientName: client?.accountName || actor.name,
    createdBy: { name: actor.name, email: actor.email, role: actor.role },
    onBehalf,
    // Supervisor-drafted data is NOT client-approved until the Client confirms (or an authorised waiver is stored).
    clientConfirmation: onBehalf
      ? { status: "PENDING", history: [] }
      : { status: "CONFIRMED", at: now, by: actor.name, history: [] },
    refNo: sanitizeStr(draft.refNo, 60),
    costCarriedBy: sanitizeStr(draft.costCarriedBy, 100),
    bookingDate: draft.bookingDate || now.slice(0, 10),
    requestedPickupDate: draft.requestedPickupDate || "",
    shipmentType:
      draft.shipmentType === "DOCUMENT" ? "DOCUMENT" : "NON_DOCUMENT",
    route: draft.route || {},
    pickup: draft.pickup || {},
    receiver: draft.receiver || {},
    taxIds: draft.taxIds || {},
    parcel,
    packaging: draft.packaging || "",
    services: Array.isArray(draft.services) ? draft.services : [],
    payment: draft.payment || {
      transportBy: "Sender",
      transportAcNo: "",
      dutiesBy: "Recipient",
      dutiesAcNo: "",
    },
    rate,
    gates: {},
    assignedCourier: null,
    assignedForeign: null,
    hubVerification: null,
    originActuals: {},
    mawb: null,
    tracking: null,
    pod: null,
    closure: null,
    documentFiles: {},
    documents: [],
    weightCorrections: [],
    exceptionHistory: [],
    messages: [],
    submittedAt: null,
    createdAt: now,
    updatedAt: now,
  };
  saveCollection(KEY, [...records, record]);
  await rememberClientNumbers(record.clientEmail, record.taxIds);
  // No approved rate for this country → an automatic request goes to the KAM (Operations Head is notified).
  if (actor.role === R.CLIENT && client && !rate.found) {
    const country = mode === "EXPORT" ? draft.route?.destCountry : draft.route?.originCountry;
    if (country) {
      const hasCountry = (client.rateCard || []).some((r) => r.mode === mode && sameId(r.country, country));
      await createAutoRateRequest({ client, mode, country, weightKg: parcel.chargeableKg ?? parcel.weightKg, shipmentId: record.shipmentId, hasCountry });
    }
  }
  await addLogEntry({
    shipmentId: record.shipmentId,
    status: "Draft created",
    note: onBehalf ? "Drafted by Supervisor on Client instruction" : "",
    updatedBy: actor.name,
    role: actor.role,
  });
  await createDraftDocuments(
    record,
    {
      items: draft.invoiceItems || [],
      comment: draft.invoiceComment || "",
      termsAccepted: !!draft.termsAccepted,
    },
    actor,
  );
  return record;
};

const EDITABLE_KEYS = [
  "refNo",
  "costCarriedBy",
  "bookingDate",
  "requestedPickupDate",
  "shipmentType",
  "route",
  "pickup",
  "receiver",
  "taxIds",
  "parcel",
  "packaging",
  "services",
  "payment",
];

// Editable only before Head approval. A Supervisor edit resets Client confirmation.
export const updateShipmentData = async (shipmentId, patch, actorIn) => {
  const actor = toActor(actorIn);
  const s = await fetchShipmentById(shipmentId);
  if (!s) throw new Error("Shipment not found");
  if (![R.CLIENT, R.DOMESTIC_ADMIN].includes(actor.role))
    throw new Error("You are not permitted to edit this shipment");
  if (actor.role === R.CLIENT && !sameId(s.clientEmail, actor.email))
    throw new Error("You can only edit your own shipments");
  if (!["DRAFT", "BOOKED"].includes(s.statusCode))
    throw new Error("This shipment can no longer be edited");
  const g1 = s.gates?.GATE_1?.status;
  if (g1 === "APPROVED")
    throw new Error(
      "This shipment is locked after Head approval — create a new document version instead",
    );
  if (g1 === "PENDING")
    throw new Error(
      "An approval request is pending — wait for the Operations Head decision",
    );

  const clean = Object.fromEntries(
    Object.entries(patch || {}).filter(([k]) => EDITABLE_KEYS.includes(k)),
  );
  const parcel = clean.parcel
    ? normalizeParcel({ ...s.parcel, ...clean.parcel })
    : s.parcel;
  const route = clean.route || s.route;
  const client = (await fetchClients()).find((c) =>
    sameId(c.email, s.clientEmail),
  );
  const rate = s.rate?.override
    ? s.rate
    : {
        ...quoteForClient(
          client,
          s.mode,
          s.mode === "EXPORT" ? route?.destCountry : route?.originCountry,
          parcel?.chargeableKg ?? parcel?.weightKg,
        ),
        override: null,
      };
  // A Client's own edit counts as confirmation; a Supervisor edit resets it to PENDING.
  const confirmation =
    actor.role === R.CLIENT
      ? {
          ...s.clientConfirmation,
          status: "CONFIRMED",
          at: nowIso(),
          by: actor.name,
        }
      : { ...s.clientConfirmation, status: "PENDING" };
  const updated = await patchShipment(shipmentId, {
    ...clean,
    parcel,
    rate,
    clientConfirmation: confirmation,
  });
  await addLogEntry({
    shipmentId,
    status: "Shipment data edited",
    updatedBy: actor.name,
    role: actor.role,
  });
  await refreshDraftDocuments(updated, actor);
  return updated;
};

const CHECKS = {
  minFields: async (s) => validateShipmentData(s),
  hubPass: async (s) =>
    s.hubVerification?.result === "PASS"
      ? null
      : "Hub verification must PASS before documentation can start",
  docPack: async (s) => {
    const missing = missingRequiredDocs(
      s,
      await fetchLatestDocuments(s.shipmentId),
    );
    return missing.length
      ? `Document pack incomplete — still draft / missing: ${missing.join(", ")}`
      : null;
  },
  exportCustomsEvidence: async (s) =>
    (await hasVerifiedEvidence(s.shipmentId, [
      "EXPORT_BE",
      "EXPORT_CUSTOMS_CLEARANCE",
      "ORIGIN_EXPORT_CLEARANCE",
    ]))
      ? null
      : "Verified export customs evidence is required",
  manifest: async (s) =>
    (await fetchManifestsForShipment(s.shipmentId)).some((m) =>
      ["APPROVED", "FINAL"].includes(m.status),
    )
      ? null
      : "An approved manifest including this shipment is required",
  mawb: async (s) =>
    s.mawb?.mawbNumber && s.mawb?.flightNo
      ? null
      : "MAWB number and flight number must be recorded first",
  trackingNo: async (s) =>
    s.tracking?.trackingNumber
      ? null
      : "The principal tracking number must be recorded first",
  foreignAssigned: async (s) =>
    s.assignedForeign?.email
      ? null
      : "No Foreign Operations Supervisor is assigned",
  // A shipment must sit in exactly one manifest before it can be customs-cleared.
  manifest: async (s) => {
    const { fetchManifestOfShipment } = await import("./manifestService");
    return (await fetchManifestOfShipment(s.shipmentId))
      ? null
      : "Add this shipment to a manifest first (Manifests → New Manifest)";
  },
  pod: async (s) =>
    s.pod?.deliveredAt && s.pod?.receivedBy
      ? null
      : "Proof of delivery is required",
  closure: async (s) =>
    s.closure?.ready ? null : "The closure checklist is not complete",
};

// Single gatekeeper for every status change: order, role, gate, exceptions, prerequisites.
export const advanceShipment = async (
  shipmentId,
  targetCode,
  opts = {},
  actorIn,
) => {
  const actor = toActor(actorIn, opts.system);
  const s = await fetchShipmentById(shipmentId);
  if (!s) throw new Error("Shipment not found");
  const seq = getSequence(s.mode, s.handlingPath);
  const cur = seq.findIndex((x) => x.code === s.statusCode);
  const tIdx = seq.findIndex((x) => x.code === targetCode);
  if (tIdx === -1) throw new Error("Unknown status for this shipment");
  const step = seq[tIdx];
  if (!getAllowedTargetIndexes(seq, cur, !!opts.allowSkip).includes(tIdx)) {
    throw new Error(
      `"${step.label}" is not the next permitted step for this shipment`,
    );
  }
  if (BLOCK_ALL_EXCEPTIONS.includes(s.exceptionCode))
    throw new Error("This shipment is cancelled");
  if (
    BLOCK_RELEASE_EXCEPTIONS.includes(s.exceptionCode) &&
    step.code === "CUSTOMS_RELEASED"
  )
    throw new Error(
      "A customs hold / examination is open — resolve it before release",
    );
  if (
    BLOCK_DELIVERED_EXCEPTIONS.includes(s.exceptionCode) &&
    step.code === "DELIVERED"
  )
    throw new Error("A delivery exception is open — resolve it first");

  const roleOk =
    canRoleRecord(step, actor.role) ||
    (actor.system && (step.owner === SYSTEM_ACTOR || step.apiAllowed)) ||
    (opts.manualFallback &&
      step.owner === SYSTEM_ACTOR &&
      actor.role === R.DOMESTIC_ADMIN);
  if (!roleOk) throw new Error("This step belongs to another role");
  if (actor.role === R.CNF && !sameId(s.assignedCnf?.email, actor.email))
    throw new Error("This shipment is not assigned to you");
  if (
    actor.role === R.FOREIGN_ADMIN &&
    !sameId(s.assignedForeign?.email, actor.email)
  )
    throw new Error("This shipment is not assigned to you");
  if (
    actor.role === R.COURIER &&
    !sameId(s.assignedCourier?.email, actor.email)
  )
    throw new Error("This shipment is not assigned to you");
  if (s.openDiscrepancy && !actor.system)
    throw new Error(
      "An unresolved pickup / receipt discrepancy blocks progress — Supervisor review required",
    );

  if (step.gate) {
    const g = s.gates?.[step.gate];
    if (g?.status !== "APPROVED")
      throw new Error("Operations Head approval is required before this step");
    if (step.gate === "GATE_2") {
      const now = await snapshotVersions(s.shipmentId);
      const old = g.docVersions || {};
      if (Object.keys(now).some((t) => now[t] !== old[t]))
        throw new Error(
          "A document changed after approval — request Head approval again",
        );
    }
  }
  for (const c of step.checks || []) {
    const err = await CHECKS[c](s);
    if (err) throw new Error(err);
  }

  const updated = await patchShipment(shipmentId, {
    statusCode: step.code,
    statusLabel: step.label,
  });
  await addLogEntry({
    shipmentId,
    status: step.label,
    exceptionCode: updated.exceptionCode,
    note: opts.note || "",
    updatedBy: actor.name,
    role: actor.role,
    source: actor.system ? "API" : opts.manualFallback ? "MANUAL" : "MILEX",
    oldValue: s.statusCode,
    newValue: step.code,
  });
  return updated;
};

export const setException = async (shipmentId, code, note, actorIn) => {
  const actor = toActor(actorIn);
  if (actor.role === R.CLIENT)
    throw new Error("Clients cannot flag exceptions");
  const s = await fetchShipmentById(shipmentId);
  if (!s) throw new Error("Shipment not found");
  if (code && !getExceptionsForMode(s.mode).some((e) => e.code === code))
    throw new Error("Invalid exception for this shipment mode");
  if (!code && !sanitizeStr(note, 300))
    throw new Error("A resolution note is required to clear an exception");
  const history = [...(s.exceptionHistory || [])];
  if (code)
    history.push({
      code,
      note: sanitizeStr(note, 300),
      raisedBy: actor.name,
      at: nowIso(),
      resolvedAt: null,
      resolution: "",
    });
  else if (history.length)
    history[history.length - 1] = {
      ...history[history.length - 1],
      resolvedAt: nowIso(),
      resolution: sanitizeStr(note, 300),
      resolvedBy: actor.name,
    };
  const updated = await patchShipment(shipmentId, {
    exceptionCode: code || null,
    exceptionHistory: history,
  });
  await addLogEntry({
    shipmentId,
    status: code ? "Exception flagged" : "Exception cleared",
    exceptionCode: code || null,
    note,
    updatedBy: actor.name,
    role: actor.role,
  });
  return updated;
};

// ---- Client confirmation ----
export const clientConfirm = async (shipmentId, decision, comment, actorIn) => {
  const actor = toActor(actorIn);
  const s = await fetchShipmentById(shipmentId);
  if (!s) throw new Error("Shipment not found");
  if (actor.role !== R.CLIENT || !sameId(s.clientEmail, actor.email))
    throw new Error("Only the owning Client can confirm");
  if (!["CONFIRMED", "CORRECTION_REQUESTED"].includes(decision))
    throw new Error("Invalid decision");
  if (decision === "CORRECTION_REQUESTED" && !sanitizeStr(comment, 500))
    throw new Error("Describe the correction needed");
  const entry = {
    status: decision,
    at: nowIso(),
    by: actor.name,
    comment: sanitizeStr(comment, 500),
  };
  const updated = await patchShipment(shipmentId, {
    clientConfirmation: {
      ...entry,
      history: [...(s.clientConfirmation?.history || []), entry],
    },
  });
  await addLogEntry({
    shipmentId,
    status: `Client ${decision === "CONFIRMED" ? "confirmed" : "requested correction"}`,
    note: comment,
    updatedBy: actor.name,
    role: actor.role,
  });
  return updated;
};

// Authorised e-mail instruction / waiver — must carry a reason and the stored file.
export const recordClientWaiver = async (
  shipmentId,
  { reason, file },
  actorIn,
) => {
  const actor = toActor(actorIn);
  if (actor.role !== R.DOMESTIC_ADMIN)
    throw new Error("Only the Operations Supervisor can store a Client waiver");
  if (!sanitizeStr(reason, 300) || !file)
    throw new Error("A reason and the e-mail / waiver file are both required");
  const s = await fetchShipmentById(shipmentId);
  if (!s) throw new Error("Shipment not found");
  const entry = {
    status: "WAIVED",
    at: nowIso(),
    by: actor.name,
    comment: sanitizeStr(reason, 300),
    file,
  };
  const updated = await patchShipment(shipmentId, {
    clientConfirmation: {
      ...entry,
      history: [...(s.clientConfirmation?.history || []), entry],
    },
  });
  await addLogEntry({
    shipmentId,
    status: "Client waiver stored",
    note: reason,
    updatedBy: actor.name,
    role: actor.role,
  });
  return updated;
};

// ---- Messages Head/Supervisor ↔ Client ----
export const addMessage = async (shipmentId, text, actorIn) => {
  const actor = toActor(actorIn);
  if (!sanitizeStr(text, 500)) throw new Error("Message cannot be empty");
  const s = await fetchShipmentById(shipmentId);
  if (!s) throw new Error("Shipment not found");
  if (actor.role === R.CLIENT && !sameId(s.clientEmail, actor.email))
    throw new Error("Not your shipment");
  const msg = {
    id: (s.messages?.length || 0) + 1,
    from: { name: actor.name, role: actor.role },
    text: sanitizeStr(text, 500),
    at: nowIso(),
    readBy: [actor.role],
  };
  return patchShipment(shipmentId, { messages: [...(s.messages || []), msg] });
};

export const markMessagesRead = async (shipmentId, role) =>
  patchShipment(shipmentId, (s) => ({
    messages: (s.messages || []).map((m) =>
      m.readBy.includes(role) ? m : { ...m, readBy: [...m.readBy, role] },
    ),
  }));

// ---- Hub verification (export) ----
export const receiveAtHub = async (shipmentId, data, actorIn) => {
  const actor = toActor(actorIn);
  if (actor.role !== R.DOMESTIC_ADMIN)
    throw new Error("Only the Operations Supervisor can verify at the hub");
  const s = await fetchShipmentById(shipmentId);
  if (!s || s.mode !== "EXPORT")
    throw new Error("Hub verification applies to export shipments");
  if (!data.receivedAt) throw new Error("Received date-time is required");
  const actualPieces = Number(data.actualPieces);
  if (!(actualPieces > 0))
    throw new Error("Actual pieces must be greater than 0");
  for (const k of ["goodsMatch", "invoiceCheck", "productCheck"])
    if (!["PASS", "FAIL"].includes(data[k]))
      throw new Error(
        "Complete the Invoice, Product and goods-match checks (Pass / Fail)",
      );
  const piecesOk = actualPieces === Number(s.parcel.pieces);
  const damaged = data.condition && data.condition !== "GOOD";
  const result =
    piecesOk &&
    !damaged &&
    data.goodsMatch === "PASS" &&
    data.invoiceCheck === "PASS" &&
    data.productCheck === "PASS"
      ? "PASS"
      : "FAIL";
  if (result === "FAIL" && !sanitizeStr(data.correctiveAction, 300))
    throw new Error("Corrective action is required when a check fails");
  const rateCheck =
    data.rateOverrideAmount !== undefined && data.rateOverrideAmount !== ""
      ? applyRateOverride(
          s.rate,
          { amount: data.rateOverrideAmount, reason: data.rateOverrideReason },
          actor,
        )
      : s.rate;
  const verification = {
    receivedAt: data.receivedAt,
    hub: sanitizeStr(data.hub, 100) || "Dhaka Hub",
    checker: { name: actor.name, role: actor.role },
    declaredPieces: s.parcel.pieces,
    actualPieces,
    condition: data.condition || "GOOD",
    goodsMatch: data.goodsMatch,
    invoiceCheck: data.invoiceCheck,
    productCheck: data.productCheck,
    actualWeightKg: data.actualWeightKg ? Number(data.actualWeightKg) : null,
    comments: sanitizeStr(data.comments, 500),
    correctiveAction: sanitizeStr(data.correctiveAction, 300),
    evidence: data.evidence || null,
    result,
    at: nowIso(),
  };
  const exception = !piecesOk
    ? "SHIPMENT_SHORT_RECEIVED"
    : damaged
      ? "DAMAGED"
      : null;
  await patchShipment(shipmentId, {
    hubVerification: verification,
    rate: rateCheck,
    exceptionCode:
      exception ??
      (["SHIPMENT_SHORT_RECEIVED", "DAMAGED"].includes(s.exceptionCode)
        ? null
        : s.exceptionCode),
  });
  await addLogEntry({
    shipmentId,
    status: `Hub verification: ${result}`,
    exceptionCode: exception,
    note: verification.comments,
    updatedBy: actor.name,
    role: actor.role,
  });
  return s.statusCode === "PICKED_UP"
    ? advanceShipment(
        shipmentId,
        "RECEIVED_AT_ORIGIN_HUB",
        { note: `Hub verification ${result}` },
        actor,
      )
    : fetchShipmentById(shipmentId);
};

// ---- Foreign Supervisor origin stages (import) ----
const ORIGIN_RULES = {
  PICKUP_ARRANGED: (d) => (d.arrangedFor ? null : "Pickup date is required"),
  PICKED_UP: (d) =>
    d.pickedAt && Number(d.actualPieces) > 0 && d.condition
      ? null
      : "Pickup time, actual pieces and condition are required",
  RECEIVED_AT_ORIGIN_WAREHOUSE: (d) =>
    d.receiptNo &&
    d.receivedAt &&
    Number(d.actualPieces) > 0 &&
    Number(d.actualWeightKg) > 0
      ? null
      : "Receipt no., time, actual pieces and weight are required",
  HANDED_OVER_TO_AIRLINE: (d) =>
    sanitizeStr(d.trackingNumber, 60)
      ? null
      : "Enter the tracking number before handing over to the airline",
};
export const submitOriginStage = async (shipmentId, stage, data, actorIn) => {
  const actor = toActor(actorIn);
  if (actor.role !== R.FOREIGN_ADMIN)
    throw new Error(
      "Only the Foreign Operations Supervisor can submit origin stages",
    );
  const s = await fetchShipmentById(shipmentId);
  if (!s || s.mode !== "IMPORT")
    throw new Error("Origin stages apply to import shipments");
  if (!sameId(s.assignedForeign?.email, actor.email))
    throw new Error("This shipment is not assigned to you");
  const err = ORIGIN_RULES[stage]?.(data);
  if (err) throw new Error(err);
  const patch = {
    originActuals: {
      ...(s.originActuals || {}),
      [stage]: { ...data, by: actor.name, at: nowIso() },
    },
  };
  let exception = s.exceptionCode;
  if (["PICKED_UP", "RECEIVED_AT_ORIGIN_WAREHOUSE"].includes(stage)) {
    if (Number(data.actualPieces) !== Number(s.parcel.pieces))
      exception = "SHIPMENT_SHORT_RECEIVED";
    else if (data.condition && data.condition !== "GOOD") exception = "DAMAGED";
    patch.exceptionCode = exception;
  }
  if (stage === "HANDED_OVER_TO_AIRLINE") {
    // All documents ready → handed to the airline with the tracking number → from here the API updates the status.
    patch.tracking = {
      ...(s.tracking || {}),
      principal: s.route?.principal || s.tracking?.principal || "China Fly Logistics",
      trackingNumber: sanitizeStr(data.trackingNumber, 60),
    };
    patch.mawb = {
      ...(s.mawb || {}),
      mawbNumber: sanitizeStr(data.mawbNumber, 30),
      flightNo: sanitizeStr(data.flightNo, 20),
      flightDate: data.flightDate || "",
    };
  }
  await patchShipment(shipmentId, patch);
  return advanceShipment(shipmentId, stage, { note: data.note || "" }, actor);
};

// ---- MAWB / tracking reference (C&F or Supervisor) ----
export const recordMawb = async (shipmentId, data, actorIn) => {
  const actor = toActor(actorIn);
  if (![R.CNF, R.DOMESTIC_ADMIN].includes(actor.role))
    throw new Error("Only C&F or the Supervisor can record the MAWB");
  if (!/^\d{3}-?\d{8}$/.test(sanitizeStr(data.mawbNumber, 20)))
    throw new Error("MAWB must be 11 digits (e.g. 779-03420222)");
  if (!sanitizeStr(data.flightNo, 20))
    throw new Error("Flight number is required");
  const s = await fetchShipmentById(shipmentId);
  if (!s) throw new Error("Shipment not found");
  const mawb = {
    ...(s.mawb || {}),
    ...data,
    mawbNumber: data.mawbNumber.trim(),
    recordedBy: actor.name,
    recordedAt: nowIso(),
  };
  const updated = await patchShipment(shipmentId, {
    mawb,
    awbNumber: s.awbNumber || mawb.mawbNumber,
  });
  await addLogEntry({
    shipmentId,
    status: "MAWB recorded",
    note: `${mawb.mawbNumber} / ${mawb.flightNo}`,
    updatedBy: actor.name,
    role: actor.role,
  });
  return updated;
};

export const setTrackingReference = async (
  shipmentId,
  { principal, trackingNumber },
  actorIn,
) => {
  const actor = toActor(actorIn);
  if (![R.CNF, R.DOMESTIC_ADMIN, R.FOREIGN_ADMIN].includes(actor.role))
    throw new Error("You are not permitted to set the tracking reference");
  if (!sanitizeStr(trackingNumber, 60))
    throw new Error("Tracking number is required");
  const s = await fetchShipmentById(shipmentId);
  if (!s) throw new Error("Shipment not found");
  const updated = await patchShipment(shipmentId, {
    tracking: {
      ...(s.tracking || {}),
      principal: sanitizeStr(principal, 100) || s.route?.principal || "",
      trackingNumber: sanitizeStr(trackingNumber, 60),
    },
  });
  await addLogEntry({
    shipmentId,
    status: "Principal tracking number set",
    note: trackingNumber,
    updatedBy: actor.name,
    role: actor.role,
  });
  return updated;
};

// ---- Import handling path (A documents-only / B MILEX delivery) ----
export const setHandlingPath = async (shipmentId, path, actorIn) => {
  const actor = toActor(actorIn);
  if (actor.role !== R.DOMESTIC_ADMIN)
    throw new Error("Only the Supervisor can choose the import handling path");
  if (!["A", "B"].includes(path)) throw new Error("Invalid path");
  const s = await fetchShipmentById(shipmentId);
  if (!s || s.mode !== "IMPORT" || s.statusCode !== "CUSTOMS_RELEASED")
    throw new Error("The path can be chosen only after customs release");
  if (s.handlingPath) throw new Error("The delivery option is already chosen");
  const updated = await patchShipment(shipmentId, { handlingPath: path });
  await addLogEntry({
    shipmentId,
    status: path === "A" ? "Transfer to Client chosen" : "Self Delivery chosen",
    updatedBy: actor.name,
    role: actor.role,
  });
  return updated;
};

// ---- POD ----
export const validatePod = async (shipmentId, actorIn) => {
  const actor = toActor(actorIn);
  if (actor.role !== R.DOMESTIC_ADMIN)
    throw new Error("Only the Supervisor can validate POD");
  const s = await fetchShipmentById(shipmentId);
  if (!s?.pod?.deliveredAt)
    throw new Error("No proof of delivery has been recorded");
  await patchShipment(shipmentId, {
    pod: {
      ...s.pod,
      validated: true,
      validatedBy: actor.name,
      validatedAt: nowIso(),
    },
  });
  return advanceShipment(
    shipmentId,
    "POD_UPDATED",
    { note: "POD validated" },
    actor,
  );
};

// ---- Client trade documents + weight correction (kept from v2) ----
export const updateShipmentDocumentFile = async (
  shipmentId,
  docName,
  fileMeta,
) => {
  const s = await fetchShipmentById(shipmentId);
  if (!s) throw new Error("Shipment not found");
  const documentFiles = { ...(s.documentFiles || {}) };
  if (fileMeta) documentFiles[docName] = fileMeta;
  else delete documentFiles[docName];
  const documents = fileMeta
    ? Array.from(new Set([...(s.documents || []), docName]))
    : (s.documents || []).filter((d) => d !== docName);
  return patchShipment(shipmentId, { documentFiles, documents });
};

export const correctShipmentWeight = async (
  shipmentId,
  newWeightKg,
  reason,
  actorIn,
) => {
  const actor = toActor(actorIn);
  if (
    ![R.DOMESTIC_ADMIN, R.FOREIGN_ADMIN, R.OPERATIONS_HEAD].includes(actor.role)
  )
    throw new Error("You are not permitted to correct weight");
  const weight = Number(newWeightKg);
  if (!Number.isFinite(weight) || weight <= 0)
    throw new Error("New weight must be a valid positive number");
  const s = await fetchShipmentById(shipmentId);
  if (!s) throw new Error("Shipment not found");
  if (s.parcel?.weightKg === weight)
    throw new Error("New weight is the same as the current weight");
  const updated = await patchShipment(shipmentId, {
    parcel: normalizeParcel({ ...s.parcel, weightKg: weight }),
    weightCorrections: [
      ...(s.weightCorrections || []),
      {
        from: s.parcel?.weightKg,
        to: weight,
        reason: sanitizeStr(reason, 300),
        by: actor.name,
        at: nowIso(),
      },
    ],
  });
  await addLogEntry({
    shipmentId,
    status: "Weight corrected",
    note: `${s.parcel?.weightKg} ✈ ${weight} kg${reason ? ` — ${reason}` : ""}`,
    updatedBy: actor.name,
    role: actor.role,
    oldValue: s.parcel?.weightKg,
    newValue: weight,
  });
  return updated;
};
