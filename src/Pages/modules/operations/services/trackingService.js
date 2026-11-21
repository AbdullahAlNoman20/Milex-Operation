// src/Pages/modules/operations/services/trackingService.js
import {
  loadCollection,
  saveCollection,
  nextId,
} from "./operationsDataService";
import {
  fetchShipments,
  fetchShipmentById,
  patchShipment,
  advanceShipment,
  setException,
} from "./shipmentService";
import { fetchPrincipalTracking, demoAdvance, isApiOutage } from "./principalApiMock";
import { addLogEntry } from "./statusLogService";
import { nowIso, sameId, sanitizeStr, toActor } from "./serviceUtils";
import {
  getSequence,
  getNextSteps,
  getStatusIndex,
} from "../constants/shipmentStatus";
import { OPERATIONS_ROLES as R } from "../constants/operationsRoles";

const KEY = "trackingEvents";
const SEED = "/data/operationsTrackingEvents.json";
export const USE_FAKE_API = import.meta.env.VITE_USE_FAKE_API !== "false";

// Principal event code ✈ MILEX behaviour. Unknown codes go to the review queue.
const COMMON = {
  FLIGHT_DEPARTED: {
    type: "STATUS",
    EXPORT: "DEPARTED_ORIGIN",
    IMPORT: "DEPARTED_ORIGIN",
  },
  TRANSIT_HUB_ARRIVED: {
    type: "STATUS",
    EXPORT: "ARRIVED_AT_TRANSIT_HUB",
    IMPORT: "IN_TRANSIT",
  },
  IN_TRANSIT: { type: "STATUS", EXPORT: "IN_TRANSIT", IMPORT: "IN_TRANSIT" },
  ARRIVED_DESTINATION: {
    type: "STATUS",
    EXPORT: "ARRIVED_AT_DESTINATION",
    IMPORT: "ARRIVED_IN_BANGLADESH",
  },
  CUSTOMS_PROCESSING: {
    type: "STATUS",
    EXPORT: "DESTINATION_CUSTOMS_CLEARANCE",
  },
  CUSTOMS_CLEARED: { type: "STATUS", EXPORT: "CUSTOMS_RELEASED" },
  LAST_MILE_HANDOVER: { type: "STATUS", EXPORT: "HANDED_OVER_TO_LAST_MILE" },
  OUT_FOR_DELIVERY: { type: "STATUS", EXPORT: "OUT_FOR_DELIVERY" },
  DELIVERED: { type: "STATUS", EXPORT: "DELIVERED" },
  POD_AVAILABLE: { type: "POD" },
  FLIGHT_DELAYED: { type: "EXC_SET", exception: "FLIGHT_DELAY" },
  DELAY_CLEARED: { type: "EXC_CLEAR", exception: "FLIGHT_DELAY" },
  CUSTOMS_HOLD: { type: "EXC_SET", exception: "CUSTOMS_HOLD" },
  CUSTOMS_HOLD_CLEARED: { type: "EXC_CLEAR", exception: "CUSTOMS_HOLD" },
};
const CHINA_FLY = {
  DEP_ORIGIN: COMMON.FLIGHT_DEPARTED,
  TRANSIT_ARR: COMMON.TRANSIT_HUB_ARRIVED,
  CF_IN_TRANSIT: COMMON.IN_TRANSIT,
  BD_ARRIVED: COMMON.ARRIVED_DESTINATION,
};
export const PRINCIPAL_CODE_MAPS = Object.freeze({
  default: COMMON,
  "China Fly Logistics": CHINA_FLY,
});
const mapFor = (principal) =>
  PRINCIPAL_CODE_MAPS[principal] || PRINCIPAL_CODE_MAPS.default;
const SYSTEM = { system: true };

export const fetchTrackingEvents = async (shipmentId) =>
  (await loadCollection(KEY, SEED))
    .filter((e) => !shipmentId || sameId(e.shipmentId, shipmentId))
    .sort((a, b) => (a.occurredAt < b.occurredAt ? 1 : -1));
export const fetchReviewQueue = async () =>
  (await loadCollection(KEY, SEED))
    .filter((e) => e.review?.status === "PENDING")
    .sort((a, b) => (a.receivedAt < b.receivedAt ? 1 : -1));

export const isTrackable = (s) => {
  if (!s?.tracking?.trackingNumber || s.statusCode === "CLOSED") return false;
  const gate =
    "HANDED_OVER_TO_AIRLINE";
  return (
    getStatusIndex(s.mode, s.statusCode, s.handlingPath) >=
      getStatusIndex(s.mode, gate, s.handlingPath) &&
    getStatusIndex(s.mode, s.statusCode, s.handlingPath) >= 0
  );
};

const store = async (s, ev, extra) => {
  const records = await loadCollection(KEY, SEED);
  const rec = {
    id: nextId(records),
    shipmentId: s.shipmentId,
    trackingNumber: s.tracking.trackingNumber,
    principal: s.tracking.principal || "",
    eventId: ev.eventId,
    code: ev.code,
    description: sanitizeStr(ev.description, 300),
    occurredAt: ev.occurredAt,
    timezone: ev.timezone || "UTC",
    location: sanitizeStr(ev.location, 150),
    receivedAt: nowIso(),
    rawRef: `fakeapi:${s.tracking.trackingNumber}:${ev.eventId}`,
    podUrl: ev.podUrl || "",
    source: "API",
    processing: "APPLIED",
    mappedStatus: "",
    review: null,
    dupKey: `${s.tracking.principal || ""}|${s.tracking.trackingNumber}|${ev.eventId}`,
    ...extra,
  };
  saveCollection(KEY, [rec, ...records]);
  return rec;
};

// Returns { outcome:'APPLIED'|'NO_CHANGE'|'REVIEW'|'BLOCKED', mappedStatus?, error? }
const applyEvent = async (s, ev) => {
  const rule = mapFor(s.tracking.principal)[ev.code];
  if (!rule) return { outcome: "NO_CHANGE" }; // unknown event codes are ignored — no manual review queue
  if (rule.type === "STATUS") {
    const target = rule[s.mode];
    const seq = getSequence(s.mode, s.handlingPath);
    const tIdx = seq.findIndex((x) => x.code === target);
    if (!target || tIdx === -1) return { outcome: "NO_CHANGE" };
    if (tIdx <= getStatusIndex(s.mode, s.statusCode, s.handlingPath))
      return { outcome: "NO_CHANGE", mappedStatus: target };
    try {
      await advanceShipment(
        s.shipmentId,
        target,
        { system: true, allowSkip: true, note: ev.description },
        SYSTEM,
      );
    } catch (e) {
      return { outcome: "BLOCKED", error: e.message };
    }
    if (target === "DELIVERED")
      await patchShipment(s.shipmentId, (c) => ({
        pod: {
          ...(c.pod || {}),
          deliveredAt: ev.occurredAt,
          source: "API",
          validated: false,
        },
      }));
    return { outcome: "APPLIED", mappedStatus: target };
  }
  if (rule.type === "EXC_SET") {
    if (s.exceptionCode && s.exceptionCode !== rule.exception)
      return { outcome: "NO_CHANGE" };
    if (s.exceptionCode === rule.exception) return { outcome: "NO_CHANGE" };
    await setException(
      s.shipmentId,
      rule.exception,
      ev.description,
      toActor(null, true),
    );
    return { outcome: "APPLIED", mappedStatus: `EXCEPTION:${rule.exception}` };
  }
  if (rule.type === "EXC_CLEAR") {
    if (s.exceptionCode !== rule.exception) return { outcome: "NO_CHANGE" };
    await setException(s.shipmentId, null, ev.description, toActor(null, true));
    return { outcome: "APPLIED", mappedStatus: `CLEARED:${rule.exception}` };
  }
  if (rule.type === "POD") {
    if (!ev.podUrl) return { outcome: "NO_CHANGE" };
    if (
      getStatusIndex(s.mode, s.statusCode, s.handlingPath) <
      getStatusIndex(s.mode, "DELIVERED", s.handlingPath)
    )
      return { outcome: "BLOCKED", error: "POD received before delivery" };
    await patchShipment(s.shipmentId, (c) => ({
      pod: {
        ...(c.pod || {}),
        url: ev.podUrl,
        reference: ev.eventId,
        source: "API",
        deliveredAt: c.pod?.deliveredAt || ev.occurredAt,
        receivedBy: c.pod?.receivedBy || "Per carrier record",
        validated: false,
      },
    }));
    try {
      await advanceShipment(
        s.shipmentId,
        "POD_UPDATED",
        { system: true, allowSkip: true, note: "POD supplied by carrier" },
        SYSTEM,
      );
    } catch {
      /* already past this step */
    }
    return { outcome: "APPLIED", mappedStatus: "POD_UPDATED" };
  }
  return { outcome: "NO_CHANGE" };
};

let syncing = false;

export const syncShipmentTracking = async (shipmentId) => {
  let s = await fetchShipmentById(shipmentId);
  if (!s) throw new Error("Shipment not found");
  if (!isTrackable(s))
    return { skipped: true, applied: 0, duplicates: 0, review: 0, noChange: 0 };
  let res;
  try {
    res = await fetchPrincipalTracking({
      principal: s.tracking.principal,
      trackingNumber: s.tracking.trackingNumber,
      mode: s.mode,
    });
  } catch (e) {
    await patchShipment(shipmentId, (c) => ({
      tracking: { ...c.tracking, lastSyncAt: nowIso(), lastError: e.message },
    }));
    return { ok: false, error: e.message };
  }
  const known = new Set(
    (await fetchTrackingEvents(shipmentId)).map((e) => e.dupKey),
  );
  const summary = {
    ok: true,
    applied: 0,
    duplicates: 0,
    review: 0,
    noChange: 0,
    blocked: null,
  };
  const events = [...res.events].sort((a, b) =>
    a.occurredAt < b.occurredAt ? -1 : 1,
  );
  for (const ev of events) {
    const dupKey = `${s.tracking.principal || ""}|${s.tracking.trackingNumber}|${ev.eventId}`;
    if (known.has(dupKey)) {
      summary.duplicates += 1;
      continue;
    }
    s = await fetchShipmentById(shipmentId);
    const r = await applyEvent(s, ev);
    if (r.outcome === "BLOCKED") {
      summary.blocked = r.error;
      break;
    }
    known.add(dupKey);
    if (r.outcome === "REVIEW") {
      await store(s, ev, {
        processing: "REVIEW",
        review: { status: "PENDING", by: null, at: null, comment: "" },
      });
      await addLogEntry({
        shipmentId,
        status: "Unknown tracking event ✈ review queue",
        note: `${ev.code}: ${ev.description}`,
        updatedBy: "Principal API",
        role: "SYSTEM",
        source: "API",
      });
      summary.review += 1;
    } else {
      await store(s, ev, {
        processing: r.outcome === "APPLIED" ? "APPLIED" : "NO_CHANGE",
        mappedStatus: r.mappedStatus || "",
      });
      if (r.outcome === "APPLIED") summary.applied += 1;
      else summary.noChange += 1;
    }
  }
  await patchShipment(shipmentId, (c) => ({
    tracking: {
      ...c.tracking,
      lastSyncAt: nowIso(),
      lastError: summary.blocked || null,
    },
  }));
  return summary;
};

export const syncAllTrackable = async () => {
  if (syncing) return [];
  syncing = true;
  try {
    const list = (await fetchShipments()).filter(isTrackable);
    const out = [];
    for (const s of list) {
      // Fake API: the principal "pushes" the next event by itself, so nothing waits for a button.
      if (USE_FAKE_API && !isApiOutage() && s.tracking?.trackingNumber && s.statusCode !== "CLOSED") demoAdvance(s.tracking.trackingNumber);
      out.push({
        shipmentId: s.shipmentId,
        ...(await syncShipmentTracking(s.shipmentId)),
      });
    }
    return out;
  } finally {
    syncing = false;
  }
};

// API-failure fallback: authorised Supervisor only; reason + evidence mandatory; goes to Head review.
export const addManualTrackingUpdate = async (
  shipmentId,
  { targetStatus, occurredAt, reason, evidence, location = "" },
  actorIn,
) => {
  const actor = toActor(actorIn);
  if (actor.role !== R.DOMESTIC_ADMIN)
    throw new Error(
      "Only the Operations Supervisor can add a manual tracking update",
    );
  if (!sanitizeStr(reason, 300))
    throw new Error("A reason is required for a manual update");
  if (!evidence)
    throw new Error("Evidence file is required for a manual update");
  if (!occurredAt) throw new Error("Event date-time is required");
  const s = await fetchShipmentById(shipmentId);
  if (!s || !isTrackable(s))
    throw new Error("Manual updates apply only to shipments in API tracking");
  const allowed = getNextSteps(s.mode, s.statusCode, s.handlingPath);
  if (!allowed.some((x) => x.code === targetStatus))
    throw new Error("That status is not the next permitted step");
  const updated = await advanceShipment(
    shipmentId,
    targetStatus,
    { manualFallback: true, note: `MANUAL: ${reason}` },
    actor,
  );
  await store(
    s,
    {
      eventId: `MANUAL-${Date.now()}`,
      code: `MANUAL_${targetStatus}`,
      description: reason,
      occurredAt,
      timezone: "Asia/Dhaka",
      location,
    },
    {
      source: "MANUAL",
      processing: "MANUAL",
      mappedStatus: targetStatus,
      manual: { by: actor.name, evidence },
      review: { status: "PENDING", by: null, at: null, comment: "" },
    },
  );
  return updated;
};

// Unknown / manual event review. MAP applies a status through the manual path.
export const resolveReviewEvent = async (
  eventId,
  { action, comment = "", targetStatus = "" },
  actorIn,
) => {
  const actor = toActor(actorIn);
  if (
    ![R.DOMESTIC_ADMIN, R.OPERATIONS_HEAD, R.FOREIGN_ADMIN].includes(actor.role)
  )
    throw new Error("Only the Supervisor or Operations Head can review events");
  if (!["ACKNOWLEDGE", "MAP", "IGNORE"].includes(action))
    throw new Error("Invalid action");
  if (action !== "ACKNOWLEDGE" && !sanitizeStr(comment, 300))
    throw new Error("A comment is required");
  const records = await loadCollection(KEY, SEED);
  const ev = records.find((e) => String(e.id) === String(eventId));
  if (!ev || ev.review?.status !== "PENDING")
    throw new Error("Event is not awaiting review");
  if (action === "MAP") {
    const s = await fetchShipmentById(ev.shipmentId);
    if (
      !getNextSteps(s.mode, s.statusCode, s.handlingPath).some(
        (x) => x.code === targetStatus,
      )
    )
      throw new Error("That status is not the next permitted step");
    await advanceShipment(
      s.shipmentId,
      targetStatus,
      { manualFallback: true, note: `Mapped from ${ev.code}: ${comment}` },
      actor.role === R.DOMESTIC_ADMIN
        ? actor
        : { ...actor, role: R.DOMESTIC_ADMIN },
    );
  }
  const review = {
    status:
      action === "IGNORE"
        ? "IGNORED"
        : action === "MAP"
          ? "MAPPED"
          : "ACKNOWLEDGED",
    by: actor.name,
    at: nowIso(),
    comment: sanitizeStr(comment, 300),
  };
  saveCollection(
    KEY,
    records.map((e) =>
      e.id === ev.id
        ? {
            ...e,
            review,
            mappedStatus: action === "MAP" ? targetStatus : e.mappedStatus,
          }
        : e,
    ),
  );
  await addLogEntry({
    shipmentId: ev.shipmentId,
    status: `Tracking event review: ${review.status}`,
    note: ev.code,
    updatedBy: actor.name,
    role: actor.role,
  });
};
