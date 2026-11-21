// src/Pages/modules/operations/constants/shipmentStatus.js
import {
  OPERATIONS_ROLES as R,
  OPERATIONS_ROLE_LABELS,
  SYSTEM_ACTOR,
} from "./operationsRoles";

export const SHIPMENT_MODE = Object.freeze({
  EXPORT: "EXPORT",
  IMPORT: "IMPORT",
});
export const SHIPMENT_TYPE = Object.freeze({
  DOCUMENT: "DOCUMENT",
  NON_DOCUMENT: "NON_DOCUMENT",
});

export const GATES = Object.freeze({
  GATE_1: {
    code: "GATE_1",
    label: "Gate 1 — Booking / Import Request Approval",
  },
  GATE_2: { code: "GATE_2", label: "Gate 2 — Document Pack Approval" },
  GATE_RELEASE: {
    code: "GATE_RELEASE",
    label: "Release / Forward Approval (Import)",
  },
});

const step = (code, label, owner, description, extra = {}) => ({
  code,
  label,
  owner,
  description,
  ...extra,
});
const SYS = SYSTEM_ACTOR;

// owner = role that PERFORMS the activity producing this status.
// delegates = other roles allowed to record it. gate = Head approval required BEFORE entering.
// checks = prerequisite keys evaluated in shipmentService. optional = may be skipped.
export const EXPORT_STATUS_SEQUENCE = Object.freeze([
  step(
    "DRAFT",
    "Draft",
    R.CLIENT,
    "Client (or Supervisor on e-mail instruction) fills the Shipment Form, Commercial Invoice and AWB draft.",
  ),
  step(
    "BOOKED",
    "Booked",
    R.CLIENT,
    "Submitted; Shipment ID created; Supervisor completeness check; request sent to Operations Head.",
    { delegates: [R.DOMESTIC_ADMIN], checks: ["minFields"] },
  ),
  step(
    "PICKUP_ASSIGNED",
    "Pickup Assigned",
    R.DOMESTIC_ADMIN,
    "Supervisor assigns one Courier Man with pickup address, contact, window and Commercial Invoice copy. No Operations Head approval is needed at this stage.",
  ),
  step(
    "PICKED_UP",
    "Picked Up",
    R.COURIER,
    "Courier collected parcel + invoice; actual pieces, condition, time and photo recorded.",
  ),
  step(
    "RECEIVED_AT_ORIGIN_HUB",
    "Received at Origin Hub",
    R.DOMESTIC_ADMIN,
    "Hub receipt: weight/dimension check, Invoice Check, Product Check (Pass/Fail), Rate Check.",
  ),
  step(
    "EXPORT_DOCUMENTATION",
    "Export Documentation",
    R.DOMESTIC_ADMIN,
    "Label PDF, Declaration, Manifest (front/back), AWB ×5 and other documents prepared.",
    { checks: ["hubPass"] },
  ),
  step(
    "EXPORT_CUSTOMS_CLEARANCE",
    "Export Customs Clearance",
    R.CNF,
    "Export B/E, customs assessment, signed/stamped documents and customs evidence.",
    { gate: "GATE_2", checks: ["docPack"] },
  ),
  step(
    "MANIFESTED",
    "Manifested",
    R.CNF,
    "Airline booking confirmed, MAWB prepared, manifest / EGM submitted.",
    { checks: ["exportCustomsEvidence", "manifest"] },
  ),
  step(
    "HANDED_OVER_TO_AIRLINE",
    "Handed Over to Airline",
    R.CNF,
    "Cargo handed over after security screening; MAWB, flight number and tracking reference stored.",
    { checks: ["mawb"] },
  ),
  step(
    "DEPARTED_ORIGIN",
    "Departed Origin",
    R.DOMESTIC_ADMIN,
    "Flight departure confirmed; Principal API tracking takes over.",
    { delegates: [R.CNF], apiAllowed: true },
  ),
  step(
    "ARRIVED_AT_TRANSIT_HUB",
    "Arrived at Transit Hub",
    SYS,
    "Transit hub arrival event from the principal API.",
    { optional: true },
  ),
  step(
    "IN_TRANSIT",
    "In Transit",
    SYS,
    "Movement / connection events from the principal API.",
  ),
  step(
    "ARRIVED_AT_DESTINATION",
    "Arrived at Destination",
    SYS,
    "Destination arrival — API only, never assumed.",
  ),
  step(
    "DESTINATION_CUSTOMS_CLEARANCE",
    "Destination Customs Clearance",
    SYS,
    "Destination clearance in progress (API / partner event).",
    { optional: true },
  ),
  step(
    "CUSTOMS_RELEASED",
    "Customs Released",
    SYS,
    "Release from API / partner event or verified evidence.",
  ),
  step(
    "HANDED_OVER_TO_LAST_MILE",
    "Handed Over to Last Mile",
    SYS,
    "Only if the principal provides the event.",
    { optional: true },
  ),
  step(
    "OUT_FOR_DELIVERY",
    "Out for Delivery",
    SYS,
    "Only if the principal provides the event.",
    { optional: true },
  ),
  step(
    "DELIVERED",
    "Delivered",
    SYS,
    "Trusted carrier event or verified proof.",
  ),
  step(
    "POD_UPDATED",
    "POD Updated",
    SYS,
    "POD link / file / reference supplied by the source.",
    { optional: true },
  ),
  step(
    "CLOSED",
    "Closed",
    R.DOMESTIC_ADMIN,
    "Closure checklist verified; Closure Summary generated.",
    { checks: ["closure"] },
  ),
]);

const IMPORT_BASE = [
  step(
    "DRAFT",
    "Draft",
    R.CLIENT,
    "Client (or Supervisor on e-mail instruction) fills the Import Request; supplier invoice / packing list attached if available.",
  ),
  step(
    "BOOKING_CONFIRMED",
    "Sent to Foreign Supervisor",
    R.DOMESTIC_ADMIN,
    "Operations Supervisor checked the request and sent it to the Foreign Supervisor. The Operations Head is informed.",
  ),
  step(
    "PICKUP_ARRANGED",
    "Pickup Arranged",
    R.FOREIGN_ADMIN,
    "Foreign Supervisor arranges supplier pickup.",
    { checks: ["foreignAssigned"] },
  ),
  step(
    "PICKED_UP",
    "Picked Up from Shipper",
    R.FOREIGN_ADMIN,
    "Actual pieces, condition and time recorded at pickup.",
  ),
  step(
    "RECEIVED_AT_ORIGIN_WAREHOUSE",
    "Received at Origin Warehouse",
    R.FOREIGN_ADMIN,
    "Actual weight/dimensions, condition and warehouse receipt recorded.",
  ),
  step(
    "EXPORT_DOCUMENTATION",
    "Export Documents Under Process",
    R.FOREIGN_ADMIN,
    "Foreign Supervisor prepares the document pack (Invoice, Packing List, Declaration, Label, AWB) for Client and Head approval.",
    { delegates: [R.DOMESTIC_ADMIN] },
  ),
  step(
    "HANDED_OVER_TO_AIRLINE",
    "Handed Over to Airline",
    R.FOREIGN_ADMIN,
    "All documents are ready. Foreign Supervisor hands the cargo to the airline and enters the tracking number. After this the API updates the status.",
    { checks: ["docPack", "manifest"] },
  ),
  step(
    "DEPARTED_ORIGIN",
    "Departed from Origin",
    SYS,
    "Flight departure from the tracking API.",
  ),
  step(
    "IN_TRANSIT",
    "In Transit",
    SYS,
    "On the way (from the tracking API).",
    { optional: true },
  ),
  step(
    "ARRIVED_IN_BANGLADESH",
    "Arrived in Bangladesh",
    SYS,
    "Arrival at Dhaka airport (from the tracking API).",
  ),
  step(
    "CUSTOMS_CLEARANCE_IN_PROGRESS",
    "Customs Clearance in Progress",
    R.DOMESTIC_ADMIN,
    "Operations Supervisor clears the cargo through Bangladesh customs.",
  ),
  step(
    "CUSTOMS_ASSESSMENT",
    "Customs Assessment / Examination",
    R.DOMESTIC_ADMIN,
    "Assessment / examination, if applicable.",
    { optional: true },
  ),
  step(
    "CUSTOMS_RELEASED",
    "Customs Released",
    R.DOMESTIC_ADMIN,
    "Customs released. Next: Self Delivery or Transfer to Client.",
  ),
];

const IMPORT_PATH_A = [
  step(
    "DOCUMENTS_FORWARDED",
    "Documents Handed to Client",
    R.DOMESTIC_ADMIN,
    "Transfer to Client: AWB, invoice, packing list and release papers are given to the Client, who collects the cargo himself.",
  ),
  step(
    "SELF_CLEARED",
    "Client Acknowledged — Self-Cleared",
    R.CLIENT,
    "Client confirms the cargo was received / self-cleared.",
  ),
  step("CLOSED", "Closed", R.DOMESTIC_ADMIN, "Closure checklist verified.", {
    checks: ["closure"],
  }),
];
const IMPORT_PATH_B = [
  step(
    "RECEIVED_AT_BD_HUB",
    "Received at Our Warehouse",
    R.DOMESTIC_ADMIN,
    "Self Delivery: cargo collected from the airport and received in our warehouse.",
  ),
  step(
    "OUT_FOR_DELIVERY",
    "Out for Delivery",
    R.DOMESTIC_ADMIN,
    "Dispatched for final delivery to the Client address.",
  ),
  step(
    "DELIVERED",
    "Delivered",
    R.DOMESTIC_ADMIN,
    "Recipient, pieces and condition recorded.",
  ),
  step(
    "POD_UPDATED",
    "POD Updated",
    R.DOMESTIC_ADMIN,
    "Proof of delivery recorded.",
    { checks: ["pod"] },
  ),
  step("CLOSED", "Closed", R.DOMESTIC_ADMIN, "Closure checklist verified.", {
    checks: ["closure"],
  }),
];

export const IMPORT_STATUS_SEQUENCE_A = Object.freeze([
  ...IMPORT_BASE,
  ...IMPORT_PATH_A,
]);
export const IMPORT_STATUS_SEQUENCE_B = Object.freeze([
  ...IMPORT_BASE,
  ...IMPORT_PATH_B,
]);

// path: 'A' (documents only) | 'B' (MILEX delivery) | null (not chosen yet ✈ show B)
export const getSequence = (mode, path = null) => {
  if (mode === SHIPMENT_MODE.IMPORT)
    return path === "A" ? IMPORT_STATUS_SEQUENCE_A : IMPORT_STATUS_SEQUENCE_B;
  return EXPORT_STATUS_SEQUENCE;
};
export const getSequenceForMode = getSequence;
export const getStatusIndex = (mode, code, path = null) =>
  getSequence(mode, path).findIndex((s) => s.code === code);
export const getStepConfig = (mode, code, path = null) =>
  getSequence(mode, path).find((s) => s.code === code) || null;

// Optional steps may be skipped; with allowSkip (API) consecutive SYSTEM steps may be skipped too.
export const getAllowedTargetIndexes = (seq, curIdx, allowSkip = false) => {
  const out = [];
  let j = curIdx + 1;
  while (j < seq.length) {
    out.push(j);
    const s = seq[j];
    if (!(s.optional || (allowSkip && s.owner === SYS))) break;
    j += 1;
  }
  return out;
};

export const getNextSteps = (mode, code, path = null) => {
  const seq = getSequence(mode, path);
  return getAllowedTargetIndexes(
    seq,
    seq.findIndex((s) => s.code === code),
  ).map((i) => seq[i]);
};

export const getNextStepOwnerRole = (mode, code, path = null) =>
  getNextSteps(mode, code, path)[0]?.owner || null;

export const canRoleRecord = (step, role) =>
  step.owner === role || (step.delegates || []).includes(role);

// Steps this role may record right now (ignores gates/checks — those are enforced in shipmentService).
export const getAllowedNextSteps = (role, shipment) => {
  if (!shipment) return [];
  return getNextSteps(
    shipment.mode,
    shipment.statusCode,
    shipment.handlingPath,
  ).filter((s) => canRoleRecord(s, role));
};

export const getOwnedStageLabels = (role, mode, path = null) =>
  getSequence(mode, path)
    .filter((s) => canRoleRecord(s, role))
    .map((s) => s.label);

export const EXCEPTION_STATUSES = Object.freeze([
  {
    code: "AWAITING_SUPPLIER_CARGO",
    label: "Awaiting Supplier Cargo",
    modes: ["IMPORT"],
  },
  {
    code: "DOCUMENTATION_PENDING",
    label: "Documentation Pending",
    modes: ["EXPORT", "IMPORT"],
  },
  {
    code: "SHIPMENT_SHORT_RECEIVED",
    label: "Shipment Short Received",
    modes: ["EXPORT", "IMPORT"],
  },
  { code: "DAMAGED", label: "Damaged", modes: ["EXPORT", "IMPORT"] },
  { code: "CUSTOMS_HOLD", label: "Customs Hold", modes: ["EXPORT", "IMPORT"] },
  {
    code: "CUSTOMS_EXAMINATION",
    label: "Customs Examination",
    modes: ["EXPORT", "IMPORT"],
  },
  {
    code: "DUTY_TAX_PENDING",
    label: "Duty / Tax Pending",
    modes: ["EXPORT", "IMPORT"],
  },
  { code: "FLIGHT_DELAY", label: "Flight Delay", modes: ["EXPORT", "IMPORT"] },
  {
    code: "TRANSSHIPMENT",
    label: "Transshipment",
    modes: ["EXPORT", "IMPORT"],
  },
  {
    code: "MANIFEST_PENDING",
    label: "Manifest Pending",
    modes: ["EXPORT", "IMPORT"],
  },
  { code: "IGM_PENDING", label: "IGM Pending", modes: ["IMPORT"] },
  {
    code: "DELIVERY_HOLD",
    label: "Delivery Hold",
    modes: ["EXPORT", "IMPORT"],
  },
  {
    code: "ADDRESS_ISSUE",
    label: "Address Issue",
    modes: ["EXPORT", "IMPORT"],
  },
  {
    code: "DELIVERY_ATTEMPTED",
    label: "Delivery Attempted",
    modes: ["EXPORT", "IMPORT"],
  },
  {
    code: "SHIPMENT_REFUSED",
    label: "Shipment Refused",
    modes: ["EXPORT", "IMPORT"],
  },
  {
    code: "SHIPMENT_CANCELLED",
    label: "Shipment Cancelled",
    modes: ["EXPORT", "IMPORT"],
  },
]);

export const BLOCK_ALL_EXCEPTIONS = Object.freeze(["SHIPMENT_CANCELLED"]);
export const BLOCK_RELEASE_EXCEPTIONS = Object.freeze([
  "CUSTOMS_HOLD",
  "CUSTOMS_EXAMINATION",
]);
export const BLOCK_DELIVERED_EXCEPTIONS = Object.freeze([
  "DELIVERY_HOLD",
  "DELIVERY_ATTEMPTED",
  "SHIPMENT_REFUSED",
]);

export const getExceptionsForMode = (mode) =>
  EXCEPTION_STATUSES.filter((e) => e.modes.includes(mode));
export const getExceptionLabel = (code) =>
  EXCEPTION_STATUSES.find((e) => e.code === code)?.label || code || "";
export const getStepDescription = (mode, code, path = null) =>
  getStepConfig(mode, code, path)?.description || "";

const EXPORT_GROUPS = [
  {
    title: "Booking & Approval",
    codes: ["DRAFT", "BOOKED", "PICKUP_ASSIGNED"],
  },
  { title: "Pickup & Hub", codes: ["PICKED_UP", "RECEIVED_AT_ORIGIN_HUB"] },
  {
    title: "Documentation & Customs",
    codes: ["EXPORT_DOCUMENTATION", "EXPORT_CUSTOMS_CLEARANCE"],
  },
  {
    title: "Airline & Transit",
    codes: [
      "MANIFESTED",
      "HANDED_OVER_TO_AIRLINE",
      "DEPARTED_ORIGIN",
      "ARRIVED_AT_TRANSIT_HUB",
      "IN_TRANSIT",
    ],
  },
  {
    title: "Destination Processing",
    codes: [
      "ARRIVED_AT_DESTINATION",
      "DESTINATION_CUSTOMS_CLEARANCE",
      "CUSTOMS_RELEASED",
    ],
  },
  {
    title: "Last Mile & Closure",
    codes: [
      "HANDED_OVER_TO_LAST_MILE",
      "OUT_FOR_DELIVERY",
      "DELIVERED",
      "POD_UPDATED",
      "CLOSED",
    ],
  },
];
const IMPORT_GROUPS = [
  { title: "Request & Check", codes: ["DRAFT", "BOOKING_CONFIRMED"] },
  {
    title: "Origin Pickup",
    codes: ["PICKUP_ARRANGED", "PICKED_UP", "RECEIVED_AT_ORIGIN_WAREHOUSE"],
  },
  {
    title: "Documents & Airline",
    codes: ["EXPORT_DOCUMENTATION", "HANDED_OVER_TO_AIRLINE"],
  },
  {
    title: "Transit (API)",
    codes: ["DEPARTED_ORIGIN", "IN_TRANSIT", "ARRIVED_IN_BANGLADESH"],
  },
  {
    title: "Bangladesh Customs",
    codes: [
      "CUSTOMS_CLEARANCE_IN_PROGRESS",
      "CUSTOMS_ASSESSMENT",
      "CUSTOMS_RELEASED",
    ],
  },
];
export const getStageGroups = (mode, path = null) => {
  if (mode !== SHIPMENT_MODE.IMPORT) return EXPORT_GROUPS;
  const last =
    path === "A"
      ? {
          title: "Transfer to Client",
          codes: ["DOCUMENTS_FORWARDED", "SELF_CLEARED", "CLOSED"],
        }
      : {
          title: "Self Delivery & Closure",
          codes: [
            "RECEIVED_AT_BD_HUB",
            "OUT_FOR_DELIVERY",
            "DELIVERED",
            "POD_UPDATED",
            "CLOSED",
          ],
        };
  return [...IMPORT_GROUPS, last];
};

// Single source for the "Waiting for ..." badge. Accepts a full shipment record.
export const getWaitingForInfo = (s) => {
  if (!s)
    return { text: "—", isNegative: false, isComplete: false, ownerRole: null };
  if (s.exceptionCode)
    return {
      text: `Stuck: ${getExceptionLabel(s.exceptionCode)}`,
      isNegative: true,
      isComplete: false,
      ownerRole: null,
    };
  const seq = getSequence(s.mode, s.handlingPath);
  if (s.statusCode === seq[seq.length - 1].code)
    return {
      text: "Completed",
      isNegative: false,
      isComplete: true,
      ownerRole: null,
    };
  if (
    s.clientConfirmation?.status === "PENDING" ||
    s.clientConfirmation?.status === "CORRECTION_REQUESTED"
  ) {
    return {
      text: "Waiting for Client Confirmation",
      isNegative: false,
      isComplete: false,
      ownerRole: R.CLIENT,
    };
  }
  const next = getNextSteps(s.mode, s.statusCode, s.handlingPath)[0];
  if (!next)
    return {
      text: "In Progress",
      isNegative: false,
      isComplete: false,
      ownerRole: null,
    };
  if (
    s.statusCode === "DRAFT" &&
    s.mode === SHIPMENT_MODE.IMPORT &&
    s.supervisorCheck?.status === "PENDING" &&
    s.gates?.GATE_1?.status !== "PENDING"
  ) {
    return {
      text: "Waiting for Operations Supervisor Check",
      isNegative: false,
      isComplete: false,
      ownerRole: R.DOMESTIC_ADMIN,
    };
  }
  if (
    s.statusCode === "DRAFT" &&
    s.mode === SHIPMENT_MODE.IMPORT &&
    s.gates?.GATE_1?.status === "PENDING"
  ) {
    return {
      text: "Waiting for Operations Head Approval",
      isNegative: false,
      isComplete: false,
      ownerRole: R.OPERATIONS_HEAD,
    };
  }
  if (next.gate && s.gates?.[next.gate]?.status !== "APPROVED") {
    const g = s.gates?.[next.gate]?.status;
    if (g === "PENDING")
      return {
        text: "Waiting for Operations Head Approval",
        isNegative: false,
        isComplete: false,
        ownerRole: R.OPERATIONS_HEAD,
      };
    if (g === "NEED_INFO" || g === "RETURNED" || g === "REJECTED")
      return {
        text: `Head ${g.replace("_", " ").toLowerCase()} — action needed`,
        isNegative: true,
        isComplete: false,
        ownerRole: R.DOMESTIC_ADMIN,
      };
    if (next.gate !== "GATE_1")
      return {
        text: "Waiting for Supervisor to request Head approval",
        isNegative: false,
        isComplete: false,
        ownerRole: s.mode === SHIPMENT_MODE.IMPORT ? R.FOREIGN_ADMIN : R.DOMESTIC_ADMIN,
      };
  }
  if (next.owner === SYS)
    return {
      text: "Waiting for Principal Tracking API",
      isNegative: false,
      isComplete: false,
      ownerRole: SYS,
    };
  return {
    text: `Waiting for ${OPERATIONS_ROLE_LABELS[next.owner]} Action`,
    isNegative: false,
    isComplete: false,
    ownerRole: next.owner,
  };
};
