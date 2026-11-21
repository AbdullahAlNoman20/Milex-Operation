// src/Pages/modules/operations/services/closureService.js
import { fetchShipmentById, patchShipment, advanceShipment } from './shipmentService';
import { fetchLatestDocuments, forwardDocuments, fetchDocumentsByShipment } from './documentService';
import { fetchEvidenceByShipment } from './evidenceService';
import { fetchApprovalsByShipment } from './approvalService';
import { fetchTrackingEvents } from './trackingService';
import { fetchStatusLogsByShipment, addLogEntry } from './statusLogService';
import { nowIso, sameId, sanitizeStr, toActor } from './serviceUtils';
import { OPERATIONS_ROLES as R } from '../constants/operationsRoles';
import { getStatusIndex } from '../constants/shipmentStatus';

export const CLOSURE_OUTCOMES = Object.freeze(['DELIVERED', 'SELF_CLEARED', 'RETURNED', 'CANCELLED']);

const reached = (s, code) => {
  const i = getStatusIndex(s.mode, code, s.handlingPath);
  return i !== -1 && getStatusIndex(s.mode, s.statusCode, s.handlingPath) >= i;
};

export const buildClosureChecklist = async (s) => {
  const docs = await fetchLatestDocuments(s.shipmentId);
  const exp = s.mode === 'EXPORT';
  const A = s.mode === 'IMPORT' && s.handlingPath === 'A';
  const openExc = !!s.exceptionCode || (s.exceptionHistory || []).some((x) => !x.resolvedAt);
  const items = [];
  const add = (key, label, required, ok, detail = '') => items.push({ key, label, required: !!required, ok: !!ok, detail });
  // Simple closure: only three things must be true.
  add('proof', A ? 'Client confirmed self-clearance' : 'Delivery recorded (POD)', true, A ? (reached(s, 'SELF_CLEARED') || !!s.selfCleared?.at) : (!!s.pod?.deliveredAt || reached(s, 'DELIVERED')));
  add('docs', exp ? 'Invoice, Packing List and AWB are on file' : 'AWB is on file', true, exp ? docs.INVOICE && docs.PACKING_LIST && docs.AWB : !!docs.AWB);
  add('exceptions', 'No open exception', true, !openExc, s.exceptionCode || '');
  return { items, blockers: items.filter((i) => i.required && !i.ok) };
};

export const buildClosureSummary = async (s, outcome) => {
  const [logs, docs, approvals, evidence, events] = await Promise.all([
    fetchStatusLogsByShipment(s.shipmentId), fetchDocumentsByShipment(s.shipmentId), fetchApprovalsByShipment(s.shipmentId), fetchEvidenceByShipment(s.shipmentId), fetchTrackingEvents(s.shipmentId),
  ]);
  const timeline = logs.filter((l) => l.newValue).map((l) => ({ code: l.newValue, label: l.status, at: l.updatedAt, source: l.source })).reverse();
  return {
    ref: `CLS-${s.shipmentId}`, shipmentId: s.shipmentId, mode: s.mode, client: s.clientName, route: s.route, awb: s.awbNumber, mawb: s.mawb?.mawbNumber || '', trackingNumber: s.tracking?.trackingNumber || '',
    outcome, timeline, documents: docs.filter((d) => d.status !== 'SUPERSEDED').map((d) => ({ type: d.type, version: d.version, status: d.status })),
    approvals: approvals.map((a) => ({ no: a.approvalNo, gate: a.gate, status: a.status, by: a.decision?.by || '', at: a.decision?.at || '' })),
    exceptions: s.exceptionHistory || [], evidenceCount: evidence.length, trackingEventCount: events.length,
    proof: s.selfCleared ? { type: 'SELF_CLEARED', at: s.selfCleared.at } : s.pod ? { type: 'POD', at: s.pod.deliveredAt, validated: !!s.pod.validated } : null,
    clientSafe: { outcome, milestones: timeline.map((t) => ({ code: t.code, at: t.at })) },
  };
};

export const closeShipment = async (shipmentId, { outcome, note = '' }, actorIn) => {
  const actor = toActor(actorIn);
  if (actor.role !== R.DOMESTIC_ADMIN) throw new Error('Only the Operations Supervisor can close a shipment');
  const s = await fetchShipmentById(shipmentId);
  if (!s) throw new Error('Shipment not found');
  if (!['DELIVERED', 'SELF_CLEARED'].includes(outcome)) throw new Error('Select DELIVERED or SELF_CLEARED (use the Head for returned / cancelled)');
  if (outcome === 'SELF_CLEARED' && !(s.mode === 'IMPORT' && s.handlingPath === 'A')) throw new Error('SELF_CLEARED applies only to documents-only imports');
  if (outcome === 'DELIVERED' && !reached(s, 'DELIVERED')) throw new Error('The shipment has not been delivered');
  const { blockers } = await buildClosureChecklist(s);
  if (blockers.length) throw new Error(`Closure blocked — ${blockers.map((b) => b.label).join('; ')}`);
  const summary = await buildClosureSummary(s, outcome);
  await patchShipment(shipmentId, { closure: { ready: true, outcome, note: sanitizeStr(note, 300), summary, closedBy: actor.name, closedAt: nowIso(), headAudit: null } });
  try {
    return await advanceShipment(shipmentId, 'CLOSED', { note: `Closed: ${outcome}` }, actor);
  } catch (e) {
    await patchShipment(shipmentId, { closure: null });
    throw e;
  }
};

// Returned / cancelled shipments leave the normal sequence — Head approval only.
export const closeTerminal = async (shipmentId, { outcome, reason }, actorIn) => {
  const actor = toActor(actorIn);
  if (actor.role !== R.OPERATIONS_HEAD) throw new Error('Only the Operations Head can close a returned / cancelled shipment');
  if (!['RETURNED', 'CANCELLED'].includes(outcome)) throw new Error('Invalid outcome');
  if (!sanitizeStr(reason, 300)) throw new Error('A reason is required');
  const s = await fetchShipmentById(shipmentId);
  if (!s || s.statusCode === 'CLOSED') throw new Error('Shipment not found or already closed');
  const summary = await buildClosureSummary(s, outcome);
  const updated = await patchShipment(shipmentId, { statusCode: 'CLOSED', statusLabel: 'Closed', exceptionCode: outcome === 'CANCELLED' ? 'SHIPMENT_CANCELLED' : s.exceptionCode, closure: { ready: true, outcome, note: sanitizeStr(reason, 300), summary, closedBy: actor.name, closedAt: nowIso(), headAudit: { result: 'APPROVED', by: actor.name, at: nowIso(), comment: sanitizeStr(reason, 300) } } });
  await addLogEntry({ shipmentId, status: `Closed: ${outcome}`, note: reason, updatedBy: actor.name, role: actor.role, oldValue: s.statusCode, newValue: 'CLOSED' });
  return updated;
};

export const recordHeadAudit = async (shipmentId, { result, comment }, actorIn) => {
  const actor = toActor(actorIn);
  if (actor.role !== R.OPERATIONS_HEAD) throw new Error('Only the Operations Head can audit');
  if (!['OK', 'FLAGGED'].includes(result)) throw new Error('Invalid audit result');
  if (result === 'FLAGGED' && !sanitizeStr(comment, 300)) throw new Error('A comment is required when flagging');
  const s = await fetchShipmentById(shipmentId);
  if (!s?.closure) throw new Error('Shipment is not closed');
  const updated = await patchShipment(shipmentId, { closure: { ...s.closure, headAudit: { result, comment: sanitizeStr(comment, 300), by: actor.name, at: nowIso() } } });
  await addLogEntry({ shipmentId, status: `Head audit: ${result}`, note: comment, updatedBy: actor.name, role: actor.role });
  return updated;
};

// Import path A
export const forwardPackToClient = async (shipmentId, { recipient, reference = '' } = {}, actorIn) => {
  const actor = toActor(actorIn);
  if (actor.role !== R.DOMESTIC_ADMIN) throw new Error('Only the Operations Supervisor can forward documents');
  const s = await fetchShipmentById(shipmentId);
  if (!s || s.mode !== 'IMPORT' || s.handlingPath !== 'A' || s.statusCode !== 'CUSTOMS_RELEASED') throw new Error('Forwarding applies to released documents-only imports');
  await forwardDocuments(s, { recipient: recipient || s.clientEmail, department: 'Client', method: 'SYSTEM', reference }, actor);
  return advanceShipment(shipmentId, 'DOCUMENTS_FORWARDED', { note: 'Documents forwarded to Client' }, actor);
};

export const confirmSelfCleared = async (shipmentId, note, actorIn) => {
  const actor = toActor(actorIn);
  const s = await fetchShipmentById(shipmentId);
  if (!s || actor.role !== R.CLIENT || !sameId(s.clientEmail, actor.email)) throw new Error('Only the owning Client can confirm');
  if (s.statusCode !== 'DOCUMENTS_FORWARDED') throw new Error('Documents have not been forwarded yet');
  await patchShipment(shipmentId, { selfCleared: { at: nowIso(), by: actor.name, note: sanitizeStr(note, 300) } });
  return advanceShipment(shipmentId, 'SELF_CLEARED', { note: 'Client confirmed Receive / Self-Cleared' }, actor);
};