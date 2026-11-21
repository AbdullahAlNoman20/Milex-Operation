// src/Pages/modules/operations/services/operationsDataService.js
// JSON seed + localStorage overlay. BACKEND TODO: replace loadCollection / saveCollection with real API calls.
const STORAGE_PREFIX = 'milex_ops_v3_data_';
// Reference data that must be re-seeded when its JSON changes. Bump the number after editing the JSON.
const SEED_VERSIONS = Object.freeze({ clients: 2, shipments: 2, tasks: 2, approvals: 1, documents: 1, statusLogs: 1, trackingEvents: 1, changeRequests: 1 });

const isBrowser = typeof window !== 'undefined' && typeof window.localStorage !== 'undefined';
const dataKey = (key) => `${STORAGE_PREFIX}${key}`;
const verKey = (key) => `${STORAGE_PREFIX}__seedver_${key}`;

const readOverlay = (key) => {
  if (!isBrowser) return null;
  try {
    const raw = window.localStorage.getItem(dataKey(key));
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : null;
  } catch { return null; }
};

const writeOverlay = (key, records, silent = false) => {
  if (!isBrowser) return;
  try {
    window.localStorage.setItem(dataKey(key), JSON.stringify(records));
    if (!silent) window.dispatchEvent(new CustomEvent('milex-ops-data', { detail: { key } }));
  } catch { /* quota / unavailable — in-memory state still works */ }
};

const seedCache = new Map();

const loadSeed = async (key, seedUrl) => {
  if (seedCache.has(key)) return seedCache.get(key);
  const res = await fetch(seedUrl, { credentials: 'same-origin' });
  if (!res.ok) throw new Error(`Failed to load seed data: ${seedUrl}`);
  const data = await res.json();
  const records = Array.isArray(data) ? data : [];
  seedCache.set(key, records);
  return records;
};

export const loadCollection = async (key, seedUrl) => {
  const wanted = SEED_VERSIONS[key];
  if (isBrowser && wanted && window.localStorage.getItem(verKey(key)) !== String(wanted)) {
    window.localStorage.removeItem(dataKey(key));
    seedCache.delete(key);
    window.localStorage.setItem(verKey(key), String(wanted));
  }
  const overlay = readOverlay(key);
  if (overlay) return overlay;
  const seed = await loadSeed(key, seedUrl);
  writeOverlay(key, seed, true);
  return seed;
};

export const saveCollection = (key, records) => {
  if (!Array.isArray(records)) throw new Error('records must be an array');
  writeOverlay(key, records);
  return records;
};

export const nextId = (records) => records.reduce((max, r) => (typeof r?.id === 'number' && r.id > max ? r.id : max), 0) + 1;

export const resetCollection = (key) => {
  if (!isBrowser) return;
  try { window.localStorage.removeItem(dataKey(key)); } catch { /* noop */ }
  seedCache.delete(key);
};