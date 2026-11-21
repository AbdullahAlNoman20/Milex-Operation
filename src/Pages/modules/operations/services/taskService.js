// src/Pages/modules/operations/services/taskService.js
import { loadCollection, saveCollection, nextId } from './operationsDataService';
import { fetchShipmentById, patchShipment, advanceShipment, setException } from './shipmentService';
import { getLatestDocument } from './documentService';
import { fetchUserByEmail, fetchUsersByRole } from './userDirectoryService';
import { addLogEntry } from './statusLogService';
import { nowIso, sameId, sanitizeStr, toActor } from './serviceUtils';
import { OPERATIONS_ROLES as R } from '../constants/operationsRoles';

const KEY = 'tasks';
const SEED = '/data/operationsTasks.json';

export const TASK_STATUS = Object.freeze({ ASSIGNED: 'ASSIGNED', ACCEPTED: 'ACCEPTED', IN_PROGRESS: 'IN_PROGRESS', COMPLETED: 'COMPLETED', FAILED: 'FAILED', CANCELLED: 'CANCELLED' });
export const ACTIVE_TASK_STATUSES = Object.freeze(['ASSIGNED', 'ACCEPTED', 'IN_PROGRESS']);
export const FAILURE_TYPES = Object.freeze({ ADDRESS_ISSUE: 'Address issue', REFUSED: 'Refused', NO_ONE_AVAILABLE: 'No one available', OTHER: 'Other' });
export const DISCREPANCY_TYPES = Object.freeze(['Short pieces', 'Damaged', 'Wrong goods', 'Weight mismatch', 'Missing documents', 'Other']);

export const fetchTasks = async () => loadCollection(KEY, SEED);
export const fetchTaskById = async (id) => (await fetchTasks()).find((t) => String(t.id) === String(id)) || null;
export const fetchTasksByShipment = async (shipmentId) => (await fetchTasks()).filter((t) => sameId(t.shipmentId, shipmentId)).sort((a, b) => (a.assignedAt < b.assignedAt ? 1 : -1));
export const fetchTasksForUser = async (email) => (await fetchTasks()).filter((t) => sameId(t.assignedTo?.email, email)).sort((a, b) => (a.assignedAt < b.assignedAt ? 1 : -1));

const validateWindow = (from, to) => {
  if (!from || !to) throw new Error('Pickup / delivery time window is required');
  if (new Date(to) <= new Date(from)) throw new Error('Window end must be after the start');
};

const findCourier = async (email) => {
  const c = (await fetchUsersByRole(R.COURIER)).find((u) => sameId(u.email, email));
  if (!c) throw new Error('Select a valid Courier Man');
  return c;
};

const makeTask = async ({ s, type, courier, from, to, note, actor, expected, address, extra = {} }) => {
  const records = await fetchTasks();
  const task = {
    id: nextId(records), taskNo: `TSK-${String(records.length + 1).padStart(5, '0')}`, shipmentId: s.shipmentId, type,
    assignedTo: { id: courier.id, name: courier.name, email: courier.email }, assignedBy: { name: actor.name, role: actor.role }, assignedAt: nowIso(),
    window: { from, to }, address: address || {}, expected, note: sanitizeStr(note, 300), status: TASK_STATUS.ASSIGNED,
    notification: { channel: 'IN_APP', sentAt: nowIso() }, completion: null, failure: null, review: null, history: [], ...extra,
  };
  saveCollection(KEY, [task, ...records]);
  await addLogEntry({ shipmentId: s.shipmentId, status: `Task ${task.taskNo} assigned (${type})`, note: courier.name, updatedBy: actor.name, role: actor.role });
  return task;
};

const guardNoActive = async (shipmentId, type) => {
  if ((await fetchTasksByShipment(shipmentId)).some((t) => t.type === type && ACTIVE_TASK_STATUSES.includes(t.status))) throw new Error('An active task of this type already exists for this shipment');
};

export const assignPickupTask = async (shipmentId, { courierEmail, from, to, note = '' }, actorIn) => {
  const actor = toActor(actorIn);
  if (actor.role !== R.DOMESTIC_ADMIN) throw new Error('Only the Operations Supervisor can assign pickups');
  const s = await fetchShipmentById(shipmentId);
  if (!s || s.mode !== 'EXPORT' || s.statusCode !== 'BOOKED') throw new Error('Pickup can be assigned only for a booked export shipment');
  validateWindow(from, to);
  if (!s.pickup?.address || !(s.pickup?.contactPhone || s.pickup?.contactEmail)) throw new Error('Pickup address and contact are required');
  const invoice = await getLatestDocument(shipmentId, 'INVOICE');
  if (!invoice) throw new Error('Create the Commercial Invoice first — a copy goes to the Courier with the task');
  await guardNoActive(shipmentId, 'PICKUP');
  const courier = await findCourier(courierEmail);
  await advanceShipment(shipmentId, 'PICKUP_ASSIGNED', { note: `Courier ${courier.name}` }, actor);
  const task = await makeTask({
    s, type: 'PICKUP', courier, from, to, note, actor, address: { ...s.pickup },
    expected: { pieces: s.parcel.pieces, weightKg: s.parcel.weightKg, contents: s.parcel.shipmentContents, invoiceDocId: invoice.id, invoiceVersion: invoice.version },
  });
  await patchShipment(shipmentId, { assignedCourier: { email: courier.email, name: courier.name, taskId: task.id } });
  return task;
};

export const assignCnf = async (shipmentId, cnfEmail, actorIn) => {
  const actor = toActor(actorIn);
  if (actor.role !== R.DOMESTIC_ADMIN && actor.role !== R.FOREIGN_ADMIN) throw new Error('Only a Supervisor can assign C&F');
  const s = await fetchShipmentById(shipmentId);
  if (!s) throw new Error('Shipment not found');
  const approved = s.mode === 'EXPORT' ? !['DRAFT', 'BOOKED'].includes(s.statusCode) : s.statusCode !== 'DRAFT';
  if (!approved) throw new Error('Assign C&F after the booking is approved');
  if (s.assignedCnf?.email) throw new Error(`The C&F is already assigned (${s.assignedCnf.name}) and cannot be changed`);
  const cnf = await fetchUserByEmail(cnfEmail);
  if (!cnf || cnf.role !== R.CNF) throw new Error('Select a valid C&F / Authorised Partner');
  const updated = await patchShipment(shipmentId, { assignedCnf: { email: cnf.email, name: cnf.name } });
  await addLogEntry({ shipmentId, status: 'C&F assigned', note: cnf.name, updatedBy: actor.name, role: actor.role });
  return updated;
};

const patchTask = async (id, fn) => {
  const records = await fetchTasks();
  let updated = null;
  const next = records.map((t) => (String(t.id) === String(id) ? (updated = { ...t, ...fn(t), updatedAt: nowIso() }) : t));
  if (!updated) throw new Error('Task not found');
  saveCollection(KEY, next);
  return updated;
};

const ownTask = async (taskId, actor) => {
  const t = await fetchTaskById(taskId);
  if (!t) throw new Error('Task not found');
  if (actor.role !== R.COURIER || !sameId(t.assignedTo?.email, actor.email)) throw new Error('This task is not assigned to you');
  return t;
};

export const acceptTask = async (taskId, actorIn) => {
  const actor = toActor(actorIn);
  const t = await ownTask(taskId, actor);
  if (t.status !== TASK_STATUS.ASSIGNED) throw new Error('Only a newly assigned task can be accepted');
  return patchTask(taskId, () => ({ status: TASK_STATUS.ACCEPTED, acceptedAt: nowIso() }));
};

export const startTask = async (taskId, actorIn) => {
  const actor = toActor(actorIn);
  const t = await ownTask(taskId, actor);
  if (![TASK_STATUS.ASSIGNED, TASK_STATUS.ACCEPTED].includes(t.status)) throw new Error('This task cannot be started');
  if (t.type === 'DELIVERY') await advanceShipment(t.shipmentId, 'OUT_FOR_DELIVERY', { note: `Task ${t.taskNo}` }, actor);
  return patchTask(taskId, () => ({ status: TASK_STATUS.IN_PROGRESS, startedAt: nowIso() }));
};

export const completeTask = async (taskId, data, actorIn) => {
  const actor = toActor(actorIn);
  const t = await ownTask(taskId, actor);
  if (!ACTIVE_TASK_STATUSES.includes(t.status)) throw new Error('This task is already closed');
  const s = await fetchShipmentById(t.shipmentId);
  if (!s) throw new Error('Shipment not found');

  if (data.outcome === 'FAILED') {
    if (!FAILURE_TYPES[data.failureType]) throw new Error('Select the failure type');
    if (!sanitizeStr(data.reason, 300) || !sanitizeStr(data.nextAction, 300)) throw new Error('Failure reason and next action are required');
    const exc = t.type === 'DELIVERY' ? (data.failureType === 'ADDRESS_ISSUE' ? 'ADDRESS_ISSUE' : data.failureType === 'REFUSED' ? 'SHIPMENT_REFUSED' : 'DELIVERY_ATTEMPTED') : 'ADDRESS_ISSUE';
    if (!s.exceptionCode) await setException(s.shipmentId, exc, data.reason, actor);
    await addLogEntry({ shipmentId: s.shipmentId, status: `Task ${t.taskNo} failed`, note: data.reason, updatedBy: actor.name, role: actor.role });
    return patchTask(taskId, () => ({ status: TASK_STATUS.FAILED, failure: { type: data.failureType, reason: sanitizeStr(data.reason, 300), nextAction: sanitizeStr(data.nextAction, 300), at: nowIso() } }));
  }

  if (!data.actualAt) throw new Error('Actual date-time is required');
  const actualPieces = Number(data.actualPieces);
  if (!(actualPieces > 0)) throw new Error('Actual pieces must be greater than 0');
  if (!['GOOD', 'DAMAGED', 'OPENED', 'OTHER'].includes(data.condition)) throw new Error('Select the parcel condition');
  if (!Array.isArray(data.evidence) || data.evidence.length === 0) throw new Error('Upload at least one photo / receipt as evidence');
  if (t.type === 'DELIVERY' && (!sanitizeStr(data.receivedBy, 100) || !sanitizeStr(data.signatureText, 100))) throw new Error('Recipient name and signature are required');
  const expectedPieces = Number(t.expected?.pieces);
  const piecesMismatch = actualPieces !== expectedPieces;
  const damaged = data.condition !== 'GOOD';
  const docsMissing = t.type === 'PICKUP' && data.invoicePLReceived && data.invoicePLReceived !== 'YES';
  const hasDiscrepancy = piecesMismatch || damaged || docsMissing;
  if (hasDiscrepancy && (!sanitizeStr(data.discrepancyReason, 300) || !sanitizeStr(data.nextAction, 300))) throw new Error('A discrepancy was detected — reason and next action are required');

  // 1) advance the shipment first
  if (t.type === 'PICKUP' && s.statusCode === 'PICKUP_ASSIGNED') await advanceShipment(s.shipmentId, 'PICKED_UP', { note: `Task ${t.taskNo}` }, actor);

  // 2) shipment data
  const completion = {
    actualAt: data.actualAt, location: sanitizeStr(data.location, 150), actualPieces, condition: data.condition, seal: sanitizeStr(data.seal, 60), marks: sanitizeStr(data.marks, 100),
    invoicePLReceived: data.invoicePLReceived || '', missingDocs: sanitizeStr(data.missingDocs, 200), receiptNo: sanitizeStr(data.receiptNo, 60),
    receivedBy: sanitizeStr(data.receivedBy, 100), signatureText: sanitizeStr(data.signatureText, 100), evidence: data.evidence, remarks: sanitizeStr(data.remarks, 500),
    discrepancy: hasDiscrepancy ? { type: sanitizeStr(data.discrepancyType, 60), reason: sanitizeStr(data.discrepancyReason, 300), nextAction: sanitizeStr(data.nextAction, 300) } : null, at: nowIso(),
  };
  const shipPatch = {};
  if (t.type === 'PICKUP') shipPatch.pickupActuals = completion;
  if (t.type === 'DELIVERY') shipPatch.pod = { deliveredAt: data.actualAt, receivedBy: completion.receivedBy, signatureText: completion.signatureText, pieces: actualPieces, condition: data.condition, evidence: data.evidence, remarks: completion.remarks, source: 'COURIER', validated: false, taskId: t.id };
  if (hasDiscrepancy && t.type !== 'DELIVERY') shipPatch.openDiscrepancy = { taskId: t.id, type: completion.discrepancy.type, reason: completion.discrepancy.reason, nextAction: completion.discrepancy.nextAction, at: nowIso() };
  await patchShipment(s.shipmentId, shipPatch);
  if (hasDiscrepancy && !s.exceptionCode) await setException(s.shipmentId, piecesMismatch ? 'SHIPMENT_SHORT_RECEIVED' : 'DAMAGED', completion.discrepancy.reason, actor);
  await addLogEntry({ shipmentId: s.shipmentId, status: `Task ${t.taskNo} completed`, note: hasDiscrepancy ? 'With discrepancy' : '', updatedBy: actor.name, role: actor.role });
  return patchTask(taskId, () => ({ status: TASK_STATUS.COMPLETED, completion, review: null }));
};

// Supervisor review: ACCEPT clears the discrepancy block, RETURN sends it back to the courier, EXCEPTION escalates.
export const reviewTask = async (taskId, decision, comment, actorIn) => {
  const actor = toActor(actorIn);
  if (actor.role !== R.DOMESTIC_ADMIN) throw new Error('Only the Operations Supervisor can review tasks');
  if (!['ACCEPT', 'RETURN', 'EXCEPTION'].includes(decision)) throw new Error('Invalid decision');
  if (decision !== 'ACCEPT' && !sanitizeStr(comment, 300)) throw new Error('A comment is required');
  const t = await fetchTaskById(taskId);
  if (!t || t.status !== TASK_STATUS.COMPLETED) throw new Error('Only completed tasks can be reviewed');
  const review = { decision, by: actor.name, at: nowIso(), comment: sanitizeStr(comment, 300) };
  if (decision === 'ACCEPT') {
    const s = await fetchShipmentById(t.shipmentId);
    if (s?.openDiscrepancy && String(s.openDiscrepancy.taskId) === String(t.id)) await patchShipment(t.shipmentId, { openDiscrepancy: null });
  }
  await addLogEntry({ shipmentId: t.shipmentId, status: `Task ${t.taskNo} review: ${decision}`, note: comment, updatedBy: actor.name, role: actor.role });
  return patchTask(taskId, (cur) => ({
    review, ...(decision === 'RETURN' ? { status: TASK_STATUS.ASSIGNED, history: [...cur.history, { completion: cur.completion, review }], completion: null } : {}),
  }));
};

export const cancelTask = async (taskId, reason, actorIn) => {
  const actor = toActor(actorIn);
  if (actor.role !== R.DOMESTIC_ADMIN) throw new Error('Only the Operations Supervisor can cancel tasks');
  if (!sanitizeStr(reason, 300)) throw new Error('A cancellation reason is required');
  const t = await fetchTaskById(taskId);
  if (!t || !ACTIVE_TASK_STATUSES.includes(t.status)) throw new Error('Only an active task can be cancelled');
  await addLogEntry({ shipmentId: t.shipmentId, status: `Task ${t.taskNo} cancelled`, note: reason, updatedBy: actor.name, role: actor.role });
  return patchTask(taskId, () => ({ status: TASK_STATUS.CANCELLED, cancelReason: sanitizeStr(reason, 300) }));
};

export const rescheduleTask = async (taskId, { from, to, reason, courierEmail = '' }, actorIn) => {
  const actor = toActor(actorIn);
  if (actor.role !== R.DOMESTIC_ADMIN) throw new Error('Only the Operations Supervisor can reschedule tasks');
  validateWindow(from, to);
  if (!sanitizeStr(reason, 300)) throw new Error('A reschedule reason is required');
  const t = await fetchTaskById(taskId);
  if (!t || ![...ACTIVE_TASK_STATUSES, TASK_STATUS.FAILED].includes(t.status)) throw new Error('Only an active or failed task can be rescheduled');
  const courier = courierEmail ? await findCourier(courierEmail) : null;
  if (courier) await patchShipment(t.shipmentId, { assignedCourier: { email: courier.email, name: courier.name, taskId: t.id } });
  await addLogEntry({ shipmentId: t.shipmentId, status: `Task ${t.taskNo} rescheduled`, note: `${reason}${courier ? ` (now ${courier.name})` : ''}`, updatedBy: actor.name, role: actor.role });
  return patchTask(taskId, (cur) => ({
    window: { from, to }, status: TASK_STATUS.ASSIGNED, failure: null, rescheduleReason: sanitizeStr(reason, 300),
    ...(courier ? { assignedTo: { id: courier.id, name: courier.name, email: courier.email } } : {}),
    history: [...cur.history, { rescheduledFrom: cur.window, reason: sanitizeStr(reason, 300), failure: cur.failure, at: nowIso() }],
  }));
};