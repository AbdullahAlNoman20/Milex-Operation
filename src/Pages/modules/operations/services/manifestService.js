// src/Pages/modules/operations/services/manifestService.js
// Versioned manifests + central Manifest Register. NEVER imports shipmentService.
import { loadCollection, saveCollection, nextId } from './operationsDataService';
import { addLogEntry } from './statusLogService';
import { sameId, nowIso, sanitizeStr } from './serviceUtils';
import { MANIFEST_TEMPLATES } from '../constants/manifestTemplates';

import { OPERATIONS_ROLES as R } from '../constants/operationsRoles';
import { emptyManifestRow } from '../constants/manifestTemplates';


const KEY = 'manifests';
const SEED = '/data/operationsManifests.json';

export const MANIFEST_STATUS = Object.freeze({ DRAFT: 'DRAFT', PENDING_HEAD: 'PENDING_HEAD', APPROVED: 'APPROVED', FINAL: 'FINAL', SUPERSEDED: 'SUPERSEDED' });

const computeTotals = (rows) => ({
  pieces: rows.reduce((s, r) => s + (Number(r.pieces) || 0), 0),
  weightKg: Number(rows.reduce((s, r) => s + (Number(r.weightKg) || 0), 0).toFixed(2)),
  value: Number(rows.reduce((s, r) => s + (Number(r.customsValue) || 0), 0).toFixed(2)),
});

const validateRows = (rows) => {
  if (!Array.isArray(rows) || rows.length === 0) throw new Error('Add at least one consignment row');
  rows.forEach((r, i) => {
    if (!sanitizeStr(r.hawbNo || r.consignmentNo, 60)) throw new Error(`Row ${i + 1}: HAWB / consignment number is required`);
    if (!(Number(r.pieces) > 0)) throw new Error(`Row ${i + 1}: pieces must be greater than 0`);
    if (!(Number(r.weightKg) > 0)) throw new Error(`Row ${i + 1}: weight must be greater than 0`);
  });
};

const all = async () => loadCollection(KEY, SEED);

// One shipment can be in ONE manifest only. Returns the manifest numbers that already hold these shipments.
const assertNoDuplicates = async (rows, ownManifestNo = null) => {
  const live = (await all()).filter((m) => m.status !== MANIFEST_STATUS.SUPERSEDED && m.manifestNo !== ownManifestNo);
  for (const r of rows) {
    if (!r.shipmentId) continue;
    const hit = live.find((m) => (m.rows || []).some((x) => sameId(x.shipmentId, r.shipmentId)));
    if (hit) throw new Error(`${r.shipmentId} is already in manifest ${hit.manifestNo}. Remove it there first.`);
  }
};
export const fetchManifestOfShipment = async (shipmentId) => {
  const m = (await all()).find((x) => x.status !== MANIFEST_STATUS.SUPERSEDED && (x.rows || []).some((r) => sameId(r.shipmentId, shipmentId)));
  return m ? m.manifestNo : null;
};

// Register view: latest version of every manifest
export const fetchManifests = async () => (await all()).filter((m) => m.status !== MANIFEST_STATUS.SUPERSEDED).sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
export const fetchManifestHistory = async (manifestNo) => (await all()).filter((m) => m.manifestNo === manifestNo).sort((a, b) => b.version - a.version);
export const fetchManifestById = async (id) => (await all()).find((m) => String(m.id) === String(id)) || null;

export const fetchManifestsForShipment = async (shipmentId) =>
  (await fetchManifests()).filter((m) => (m.rows || []).some((r) => sameId(r.shipmentId, shipmentId)));

// Client sees only its own rows, inside its own account.
export const fetchManifestsForClient = async (email) => {
  const mine = (await fetchManifests()).map((m) => {
    const rows = (m.rows || []).filter((r) => sameId(r.clientEmail, email));
    return rows.length ? { ...m, rows, totals: computeTotals(rows) } : null;
  });
  return mine.filter(Boolean);
};

export const createManifest = async (draft, actor) => {
  if (![R.DOMESTIC_ADMIN, R.FOREIGN_ADMIN].includes(actor.role)) throw new Error('Only the Operations Supervisor or the Foreign Supervisor can create a manifest');
  const tpl = MANIFEST_TEMPLATES[draft.templateCode];
  if (!tpl) throw new Error('Select a manifest template');
  validateRows(draft.rows);
  await assertNoDuplicates(draft.rows);
  const records = await all();
  const numbers = new Set(records.map((m) => m.manifestNo));
  const record = {
    id: nextId(records), manifestNo: `MFN${String(numbers.size + 1).padStart(6, '0')}`, version: 1, status: MANIFEST_STATUS.FINAL,
    templateCode: tpl.code, route: { principal: sanitizeStr(draft.route?.principal, 100), department: sanitizeStr(draft.route?.department, 100), area: sanitizeStr(draft.route?.area, 100), origin: sanitizeStr(draft.route?.origin, 100), destination: sanitizeStr(draft.route?.destination, 100) },
    flight: { mawbNo: sanitizeStr(draft.flight?.mawbNo, 30), flightNo: sanitizeStr(draft.flight?.flightNo, 20), date: draft.flight?.date || '', loadingPort: sanitizeStr(draft.flight?.loadingPort, 60), dischargePort: sanitizeStr(draft.flight?.dischargePort, 60) },
    extraHeader: draft.extraHeader || {}, rows: draft.rows, totals: computeTotals(draft.rows),
    preparedBy: actor.name, submissionRef: '',
    authorisation: null, createdBy: actor.name, createdAt: nowIso(),
  };
  saveCollection(KEY, [...records, record]);
  for (const r of record.rows) {
    if (r.shipmentId) await addLogEntry({ shipmentId: r.shipmentId, status: `Added to manifest ${record.manifestNo} v1`, updatedBy: actor.name, role: actor.role });
  }
  return record;
};

// Any change creates a new version (old one SUPERSEDED, never overwritten).
export const reviseManifest = async (id, patch, actor) => {
  if (![R.DOMESTIC_ADMIN, R.FOREIGN_ADMIN].includes(actor.role)) throw new Error('Only the Operations Supervisor or the Foreign Supervisor can revise a manifest');
  const records = await all();
  const current = records.find((m) => String(m.id) === String(id));
  if (!current) throw new Error('Manifest not found');
  if (current.status === MANIFEST_STATUS.SUPERSEDED) throw new Error('Only the latest version can be revised');
  const rows = patch.rows || current.rows;
  validateRows(rows);
  await assertNoDuplicates(rows, current.manifestNo);
  const record = { ...current, ...patch, rows, totals: computeTotals(rows), id: nextId(records), version: current.version + 1, status: MANIFEST_STATUS.FINAL, preparedBy: actor.name, createdAt: nowIso() };
  saveCollection(KEY, [...records.map((m) => (m.id === current.id ? { ...m, status: MANIFEST_STATUS.SUPERSEDED } : m)), record]);
  return record;
};

export const setManifestStatus = async (id, status, actor) => {
  if (!Object.values(MANIFEST_STATUS).includes(status)) throw new Error('Invalid manifest status');
  const records = await all();
  const cur = records.find((m) => String(m.id) === String(id));
  if (!cur) throw new Error('Manifest not found');
  const rules = {
    DRAFT: { PENDING_HEAD: [R.DOMESTIC_ADMIN] },
    PENDING_HEAD: { APPROVED: [R.OPERATIONS_HEAD], DRAFT: [R.OPERATIONS_HEAD] },
    APPROVED: { FINAL: [R.DOMESTIC_ADMIN, R.CNF] },
  };
  const roles = rules[cur.status]?.[status];
  if (!roles) throw new Error(`A ${cur.status.replace('_', ' ')} manifest cannot move to ${status.replace('_', ' ')}`);
  if (!roles.includes(actor.role)) throw new Error('You are not permitted to make this change');
  if (status === 'FINAL' && !cur.authorisation) throw new Error('Record the authorisation (back side) before finalising');
  let updated = null;
  saveCollection(KEY, records.map((m) => (m.id === cur.id ? (updated = { ...m, status, statusBy: actor.name, statusAt: nowIso() }) : m)));
  return updated;
};

// Back side of the manifest: authorisation text / signatory / signature file (actual only, never synthetic).
export const saveAuthorisation = async (id, auth, actor) => {
  if (![R.DOMESTIC_ADMIN, R.CNF].includes(actor.role)) throw new Error('Only the Supervisor or C&F can record the authorisation');
  if (!sanitizeStr(auth.signatory, 100)) throw new Error('Signatory name is required');
  const records = await all();
  let updated = null;
  const next = records.map((m) => (String(m.id) === String(id) ? (updated = { ...m, authorisation: { text: sanitizeStr(auth.text, 1000), signatory: sanitizeStr(auth.signatory, 100), title: sanitizeStr(auth.title, 100), signedAt: auth.signedAt || '', cnfRef: sanitizeStr(auth.cnfRef, 100), file: auth.file || null, recordedBy: actor.name } }) : m));
  if (!updated) throw new Error('Manifest not found');
  saveCollection(KEY, next);
  return updated;
};
// Manifest না থাকলে শিপমেন্ট থেকে নিজে তৈরি করে (Final)। C&F-এর handover এটা ব্যবহার করে।
export const ensureManifestForShipment = async (s, actor) => {
  const found = (await fetchManifests()).find((m) => (m.rows || []).some((r) => sameId(r.shipmentId, s.shipmentId)) && m.status !== MANIFEST_STATUS.SUPERSEDED);
  if (found) return found;
  const records = await all();
  const numbers = new Set(records.map((m) => m.manifestNo));
  const row = {
    ...emptyManifestRow(), shipmentId: s.shipmentId, clientEmail: s.clientEmail, hawbNo: s.awbNumber || s.shipmentId, consignmentNo: s.awbNumber || s.shipmentId,
    shipperName: s.pickup?.companyName || '', shipperAddress: [s.pickup?.address, s.pickup?.city, s.pickup?.country].filter(Boolean).join(', '),
    consigneeName: s.receiver?.companyName || '', consigneeAddress: [s.receiver?.address, s.receiver?.city, s.receiver?.country].filter(Boolean).join(', '),
    phone: s.receiver?.contactPhone || '', commodity: s.parcel?.shipmentContents || '', hsCode: s.parcel?.hsCode || '', pieces: s.parcel?.pieces || '', weightKg: s.parcel?.weightKg || '',
    destCountry: s.receiver?.country || '', originStation: s.route?.originAirport || '', destStation: s.route?.destAirport || '', customsValue: s.parcel?.declaredValue || '',
    currency: s.parcel?.currency || 'USD', bin: s.taxIds?.bin || '', serviceProvider: s.route?.principal || '',
  };
  validateRows([row]);
  const record = {
    id: nextId(records), manifestNo: `MFN${String(numbers.size + 1).padStart(6, '0')}`, version: 1, status: MANIFEST_STATUS.FINAL, templateCode: 'EXPORT_STANDARD',
    route: { principal: s.route?.principal || '', department: '', area: '', origin: s.route?.originCity || '', destination: s.route?.destCity || '' },
    flight: { mawbNo: s.mawb?.mawbNumber || '', flightNo: s.mawb?.flightNo || '', date: s.mawb?.flightDate || '', loadingPort: s.route?.originAirport || '', dischargePort: s.route?.destAirport || '' },
    extraHeader: {}, rows: [row], totals: computeTotals([row]), preparedBy: actor.name, checkedBy: '', submissionRef: '', authorisation: null, createdBy: actor.name, createdAt: nowIso(),
  };
  saveCollection(KEY, [...records, record]);
  await addLogEntry({ shipmentId: s.shipmentId, status: `Manifest ${record.manifestNo} created automatically`, updatedBy: actor.name, role: actor.role });
  return record;
};