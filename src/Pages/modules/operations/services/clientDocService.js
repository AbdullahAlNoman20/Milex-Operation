// src/Pages/modules/operations/services/clientDocService.js
// The Client's permanent documents (Trade License, TIN, BIN, ...) with number + expiry date.
// Numbers are reused automatically in every Import / Export form and document; a number typed in a form is saved here.
import { loadCollection, saveCollection } from './operationsDataService';
import { sameId, nowIso } from './serviceUtils';

const KEY = 'clientDocuments';
export const CLIENT_DOC_TYPES = Object.freeze([
  { key: 'TRADE_LICENSE', label: 'Trade License', numberKey: 'tradeLicense', numberLabel: 'Trade License No.', placeholder: 'TRAD/DNCC/012345/2026', expiry: true },
  { key: 'TIN', label: 'TIN Certificate', numberKey: 'etin', numberLabel: 'TIN / e-TIN No.', placeholder: '769855199078', expiry: false },
  { key: 'BIN', label: 'BIN / VAT Certificate', numberKey: 'bin', numberLabel: 'BIN No.', placeholder: '000794605-0101', expiry: true },
  { key: 'ERC', label: 'ERC / IRC', numberKey: 'erc', numberLabel: 'ERC / IRC No.', placeholder: '260326210805825', expiry: true },
  { key: 'NID', label: 'NID / Passport', numberKey: 'nid', numberLabel: 'NID / Passport No.', placeholder: '1990123456789', expiry: true },
  { key: 'LC', label: 'LC (Letter of Credit)', numberKey: 'lc', numberLabel: 'LC No.', placeholder: 'LC-2026-00123', expiry: true },
]);

const all = async () => loadCollection(KEY, '/data/operationsClientDocuments.json').catch(() => []);
const blank = (email) => ({ email, docs: {}, updatedAt: nowIso() });

export const fetchClientDocs = async (email) => {
  const list = await all();
  return (list || []).find((r) => sameId(r.email, email)) || blank(email);
};

const upsert = async (email, fn) => {
  const list = (await all()) || [];
  const cur = list.find((r) => sameId(r.email, email)) || blank(email);
  const next = { ...fn(cur), email: cur.email, updatedAt: nowIso() };
  saveCollection(KEY, [next, ...list.filter((r) => !sameId(r.email, email))]);
  return next;
};

export const saveClientDoc = (email, typeKey, patch) =>
  upsert(email, (cur) => ({ ...cur, docs: { ...cur.docs, [typeKey]: { ...(cur.docs[typeKey] || {}), ...patch } } }));

// numbers as the shipment forms use them: { bin, etin, erc, nid, tradeLicense, lc }
export const docNumbers = (rec) => {
  const out = {};
  CLIENT_DOC_TYPES.forEach((t) => { const n = rec?.docs?.[t.key]?.number; if (n) out[t.numberKey] = n; });
  return out;
};

// A number typed in a shipment form is saved here too (only fills what is empty or changed).
export const rememberClientNumbers = async (email, numbers = {}) => {
  if (!email) return;
  const rec = await fetchClientDocs(email);
  const patchByType = {};
  CLIENT_DOC_TYPES.forEach((t) => {
    const v = String(numbers[t.numberKey] || '').trim();
    if (v && v !== (rec.docs[t.key]?.number || '')) patchByType[t.key] = v;
  });
  if (Object.keys(patchByType).length === 0) return;
  await upsert(email, (cur) => {
    const docs = { ...cur.docs };
    Object.entries(patchByType).forEach(([k, v]) => { docs[k] = { ...(docs[k] || {}), number: v }; });
    return { ...cur, docs };
  });
};

export const expiryState = (iso) => {
  if (!iso) return null;
  const days = Math.ceil((new Date(iso).getTime() - Date.now()) / 86400000);
  if (Number.isNaN(days)) return null;
  return days < 0 ? { tone: 'red', text: `Expired ${-days} day(s) ago` } : days <= 30 ? { tone: 'amber', text: `Expires in ${days} day(s)` } : { tone: 'green', text: `Valid · ${days} days left` };
};
