// src/Pages/modules/operations/services/changeRequestService.js
// Client requests (new rate, new country, corrections) go straight to the KAM (Key Account Manager).
// The Operations Head is notified, sees the status, and can remind the KAM per client / per topic.
import { loadCollection, saveCollection, nextId } from './operationsDataService';
import { nowIso, sameId, sanitizeStr, toActor } from './serviceUtils';
import { fetchUsersByRole } from './userDirectoryService';
import { fetchClients } from './clientService';
import { OPERATIONS_ROLES as R } from '../constants/operationsRoles';

const KEY = 'changeRequests';
const SEED = '/data/operationsChangeRequests.json';
export const REQUEST_TYPES = Object.freeze({
  NEW_RATE: 'Request a new rate',
  NEW_COUNTRY: 'Request a rate for a new country',
  INFO_CORRECTION: 'Correct my account information',
  DOCUMENT_ISSUE: 'Problem in a document',
});
export const REQUEST_STATUS_LABEL = Object.freeze({ PENDING: 'With KAM', IN_PROGRESS: 'KAM working', RESOLVED: 'Resolved', REJECTED: 'Rejected' });
export const OPEN_REQUEST_STATUSES = ['PENDING', 'IN_PROGRESS'];

export const fetchChangeRequests = async () =>
  (await loadCollection(KEY, SEED)).sort((a, b) => ((a.updatedAt || a.createdAt) < (b.updatedAt || b.createdAt) ? 1 : -1));
export const fetchMyChangeRequests = async (email) => (await fetchChangeRequests()).filter((r) => sameId(r.clientEmail, email));
export const fetchKamRequests = async (kamEmail) => (await fetchChangeRequests()).filter((r) => !r.assignedKam || sameId(r.assignedKam.email, kamEmail));

// The KAM named in the client's profile; otherwise the only / first KAM.
const kamFor = async (clientEmail) => {
  const kams = await fetchUsersByRole(R.KAM);
  const client = (await fetchClients()).find((c) => sameId(c.email, clientEmail));
  const named = client?.recommendation?.kam?.trim().toLowerCase();
  return kams.find((k) => k.name.trim().toLowerCase() === named) || kams[0] || null;
};

const insert = async (rec) => {
  const records = await loadCollection(KEY, SEED);
  const kam = await kamFor(rec.clientEmail);
  const full = {
    id: nextId(records),
    requestNo: `REQ-${String(records.length + 1).padStart(5, '0')}`,
    status: 'PENDING', createdAt: nowIso(), updatedAt: nowIso(), response: null, reminders: [], headNotified: true,
    assignedKam: kam ? { email: kam.email, name: kam.name } : null,
    ...rec,
  };
  saveCollection(KEY, [full, ...records]);
  return full;
};

export const createChangeRequest = async (d, actorIn) => {
  const actor = toActor(actorIn);
  if (actor.role !== R.CLIENT) throw new Error('Only a Client can send this request');
  if (!REQUEST_TYPES[d.type]) throw new Error('Choose a request type');
  const message = sanitizeStr(d.message, 1000);
  if (!message) throw new Error('Please describe your request');
  const country = sanitizeStr(d.country, 60);
  if (['NEW_RATE', 'NEW_COUNTRY'].includes(d.type) && !country) throw new Error('Country is required for a rate request');
  const weight = d.expectedWeightKg === '' || d.expectedWeightKg == null ? null : Number(d.expectedWeightKg);
  if (weight !== null && !(weight > 0)) throw new Error('Expected weight must be greater than 0');
  return insert({
    type: d.type, clientEmail: actor.email, clientName: actor.name, mode: d.mode === 'IMPORT' ? 'IMPORT' : 'EXPORT',
    country, expectedWeightKg: weight, shipmentId: sanitizeStr(d.shipmentId, 40), message, source: 'CLIENT',
  });
};

// Created automatically when a Client books a shipment for a country / weight that has no approved rate.
export const createAutoRateRequest = async ({ client, mode, country, weightKg, shipmentId, hasCountry }) => {
  const type = hasCountry ? 'NEW_RATE' : 'NEW_COUNTRY';
  const open = (await fetchChangeRequests()).find(
    (r) => sameId(r.clientEmail, client.email) && r.type === type && r.country === country && r.mode === mode && OPEN_REQUEST_STATUSES.includes(r.status),
  );
  if (open) return open;
  return insert({
    type, clientEmail: client.email, clientName: client.accountName || client.email, mode, country,
    expectedWeightKg: weightKg || null, shipmentId: shipmentId || '', source: 'AUTO',
    message: hasCountry
      ? `Automatic request: shipment ${shipmentId || ''} (${weightKg || '?'} kg) needs a new rate for ${country}.`
      : `Automatic request: shipment ${shipmentId || ''} to/from ${country} — this country has no approved rate yet.`,
  });
};

const patchRequest = async (id, fn) => {
  const records = await fetchChangeRequests();
  const r = records.find((x) => x.id === id);
  if (!r) throw new Error('Request not found');
  saveCollection(KEY, records.map((x) => (x.id === id ? { ...x, ...fn(x), updatedAt: nowIso() } : x)));
  return r;
};

export const startChangeRequest = async (id, actorIn) => {
  const actor = toActor(actorIn);
  if (actor.role !== R.KAM) throw new Error('Only the KAM can take a request');
  await patchRequest(id, () => ({ status: 'IN_PROGRESS', startedAt: nowIso() }));
};

export const resolveChangeRequest = async (id, { status, response }, actorIn) => {
  const actor = toActor(actorIn);
  if (actor.role !== R.KAM) throw new Error('Only the KAM can answer a client request');
  if (!['RESOLVED', 'REJECTED'].includes(status)) throw new Error('Invalid decision');
  if (!sanitizeStr(response, 500)) throw new Error('Write a reply for the Client');
  await patchRequest(id, () => ({ status, response: { by: actor.name, text: sanitizeStr(response, 500), at: nowIso() } }));
};

// Operations Head → KAM reminder. Per request (one client, one topic).
export const remindKam = async (id, message, actorIn) => {
  const actor = toActor(actorIn);
  if (actor.role !== R.OPERATIONS_HEAD) throw new Error('Only the Operations Head can remind the KAM');
  await patchRequest(id, (r) => {
    if (!OPEN_REQUEST_STATUSES.includes(r.status)) throw new Error('This request is already closed');
    return { reminders: [...(r.reminders || []), { by: actor.name, at: nowIso(), text: sanitizeStr(message, 300) || 'Please follow up on this request.' }], lastReminderAt: nowIso(), kamSeenReminder: false };
  });
};
export const markReminderSeen = async (id) => patchRequest(id, () => ({ kamSeenReminder: true }));

// Messages under one request: the Client and the assigned KAM (and the Operations Head) can write.
export const addRequestMessage = async (id, text, actorIn) => {
  const actor = toActor(actorIn);
  const t = sanitizeStr(text, 500);
  if (!t) throw new Error('Write a message first');
  const r = (await fetchChangeRequests()).find((x) => x.id === id);
  if (!r) throw new Error('Request not found');
  if (actor.role === R.CLIENT && !sameId(r.clientEmail, actor.email)) throw new Error('This is not your request');
  if (![R.CLIENT, R.KAM, R.OPERATIONS_HEAD].includes(actor.role)) throw new Error('You cannot write on this request');
  if (actor.role === R.KAM && r.assignedKam && !sameId(r.assignedKam.email, actor.email)) throw new Error('This request belongs to another KAM');
  await patchRequest(id, (x) => ({ messages: [...(x.messages || []), { id: (x.messages?.length || 0) + 1, from: { name: actor.name, role: actor.role }, text: t, at: nowIso() }] }));
};
