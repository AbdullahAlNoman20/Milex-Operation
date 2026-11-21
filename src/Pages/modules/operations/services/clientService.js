// src/Pages/modules/operations/services/clientService.js
import { loadCollection, saveCollection, nextId } from './operationsDataService';
import { sameId } from './serviceUtils';

const COLLECTION_KEY = 'clients';
const SEED_URL = '/data/operationsClients.json';

export const fetchClients = async () => loadCollection(COLLECTION_KEY, SEED_URL);
export const fetchClientById = async (id) => (await fetchClients()).find((c) => String(c.id) === String(id)) || null;
export const fetchClientByEmail = async (email) => (await fetchClients()).find((c) => sameId(c.email, email)) || null;

export const createClient = async (draft) => {
  if (!draft || typeof draft !== 'object') throw new Error('Invalid client data');
  const records = await fetchClients();
  const record = { id: nextId(records), createdAt: new Date().toISOString(), ...draft };
  saveCollection(COLLECTION_KEY, [...records, record]);
  return record;
};

export const updateClient = async (id, updates = {}) => {
  const records = await fetchClients();
  let updated = null;
  const next = records.map((c) => (String(c.id) === String(id) ? (updated = { ...c, ...updates, updatedAt: new Date().toISOString() }) : c));
  if (!updated) throw new Error('Client not found');
  saveCollection(COLLECTION_KEY, next);
  return updated;
};