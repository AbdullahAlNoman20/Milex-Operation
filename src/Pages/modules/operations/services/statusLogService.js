// src/Pages/modules/operations/services/statusLogService.js
import { loadCollection, saveCollection, nextId } from './operationsDataService';
import { sameId, sanitizeStr } from './serviceUtils';

const COLLECTION_KEY = 'statusLogs';
const SEED_URL = '/data/operationsStatusLogs.json';

export const fetchStatusLogs = async () => loadCollection(COLLECTION_KEY, SEED_URL);

export const fetchStatusLogsByShipment = async (shipmentId) => {
  if (!shipmentId) return [];
  return (await fetchStatusLogs()).filter((l) => sameId(l.shipmentId, shipmentId));
};

// Immutable audit entry. source: MILEX | API | MANUAL
export const addLogEntry = async ({ shipmentId, status, exceptionCode = null, note = '', updatedBy = 'System', role = '', source = 'MILEX', oldValue = null, newValue = null }) => {
  if (!shipmentId) throw new Error('Shipment ID is required for a log entry');
  const logs = await fetchStatusLogs();
  const entry = {
    id: nextId(logs), shipmentId, status: sanitizeStr(status, 200), exceptionCode: exceptionCode || null,
    note: sanitizeStr(note, 500), updatedBy, role, source, oldValue, newValue, updatedAt: new Date().toISOString(),
  };
  saveCollection(COLLECTION_KEY, [entry, ...logs]);
  return entry;
};