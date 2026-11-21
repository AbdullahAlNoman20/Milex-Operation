// src/Pages/modules/operations/services/principalApiMock.js
// ─────────────────────────────────────────────────────────────────────────────
// FAKE PRINCIPAL TRACKING API — DEMO ONLY.
// BACKEND TODO: replace fetchPrincipalTracking() with the real HTTP call to
// Linex / LHR-ISE Logistics / China Fly Logistics. The response SHAPE below
// ({ trackingNumber, principal, events:[{eventId, code, description, occurredAt,
// timezone, location, podUrl?}] }) is what trackingService expects.
// ─────────────────────────────────────────────────────────────────────────────
const PREFIX = 'milex_ops_v3_fakeapi_';
const OUTAGE_KEY = `${PREFIX}outage`;
const INTERVAL_KEY = `${PREFIX}interval`;
const DEFAULT_INTERVAL_MS = 30000; // one new event every 30 seconds

const EXPORT_SCRIPT = [
  { code: 'FLIGHT_DEPARTED', description: 'Flight departed Dhaka (DAC)', location: 'Dhaka, BD' },
  { code: 'TRANSIT_HUB_ARRIVED', description: 'Arrived at transit hub', location: 'Dubai, AE' },
  { code: 'FLIGHT_DELAYED', description: 'Onward flight delayed 6 hours', location: 'Dubai, AE' },
  { code: 'DELAY_CLEARED', description: 'Onward flight rescheduled and confirmed', location: 'Dubai, AE' },
  { code: 'IN_TRANSIT', description: 'Departed transit hub', location: 'Dubai, AE' },
  { code: 'ARRIVED_DESTINATION', description: 'Arrived at destination airport', location: 'Destination airport' },
  { dupOf: 5, code: 'ARRIVED_DESTINATION', description: 'Arrived at destination airport (duplicate scan)', location: 'Destination airport' },
  { code: 'CUSTOMS_PROCESSING', description: 'Import customs processing started', location: 'Destination customs' },
  { code: 'SCAN_X91', description: 'Facility scan (carrier internal code X91)', location: 'Destination hub' },
  { code: 'CUSTOMS_HOLD', description: 'Customs documentary check — shipment on hold', location: 'Destination customs' },
  { code: 'CUSTOMS_HOLD_CLEARED', description: 'Customs hold lifted', location: 'Destination customs' },
  { code: 'CUSTOMS_CLEARED', description: 'Customs clearance completed', location: 'Destination customs' },
  { code: 'LAST_MILE_HANDOVER', description: 'Handed over to last-mile courier', location: 'Destination hub' },
  { code: 'OUT_FOR_DELIVERY', description: 'Out for delivery', location: 'Destination city' },
  { code: 'DELIVERED', description: 'Delivered — signed by consignee', location: 'Consignee address' },
  { code: 'POD_AVAILABLE', description: 'Proof of delivery available', location: 'Consignee address', pod: true },
];

const IMPORT_SCRIPT = [
  { code: 'DEP_ORIGIN', description: 'Flight departed origin airport', location: 'Origin airport' },
  { code: 'TRANSIT_ARR', description: 'Arrived at transshipment hub', location: 'Transit hub' },
  { code: 'CF_IN_TRANSIT', description: 'Cargo in transit to Bangladesh', location: 'In flight' },
  { code: 'BD_ARRIVED', description: 'Arrived at Hazrat Shahjalal International Airport (DAC)', location: 'Dhaka, BD' },
];

export const getScript = (mode) => (mode === 'IMPORT' ? IMPORT_SCRIPT : EXPORT_SCRIPT);

const read = (k) => { try { return JSON.parse(window.localStorage.getItem(k) || 'null'); } catch { return null; } };
const write = (k, v) => { try { window.localStorage.setItem(k, JSON.stringify(v)); } catch { /* noop */ } };
const stateKey = (tn) => `${PREFIX}state_${tn}`;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const intervalMs = () => Number(read(INTERVAL_KEY)) || DEFAULT_INTERVAL_MS;

export const isApiOutage = () => !!read(OUTAGE_KEY);
export const setApiOutage = (on) => write(OUTAGE_KEY, !!on);
export const setDemoInterval = (ms) => write(INTERVAL_KEY, Math.max(2000, Number(ms) || DEFAULT_INTERVAL_MS));

const revealedCount = (state, total) => Math.min(total, Math.floor((Date.now() - state.startedAt) / intervalMs()) + 1 + (state.bump || 0));

export const getDemoState = (trackingNumber, mode = 'EXPORT') => {
  const total = getScript(mode).length;
  const state = trackingNumber ? read(stateKey(trackingNumber)) : null;
  return { total, revealed: state ? revealedCount(state, total) : 0, started: !!state, outage: isApiOutage(), intervalMs: intervalMs() };
};
export const demoAdvance = (trackingNumber) => {
  const s = read(stateKey(trackingNumber)) || { startedAt: Date.now(), bump: 0 };
  write(stateKey(trackingNumber), { ...s, bump: (s.bump || 0) + 1 });
};
export const demoReset = (trackingNumber) => { try { window.localStorage.removeItem(stateKey(trackingNumber)); } catch { /* noop */ } };

export const fetchPrincipalTracking = async ({ principal, trackingNumber, mode }) => {
  await sleep(250 + Math.random() * 450);
  if (isApiOutage()) throw new Error('Principal API unavailable (503 Service Unavailable)');
  if (typeof trackingNumber !== 'string' || trackingNumber.trim().length < 5) throw new Error('Principal API: unknown tracking number (404)');
  const tn = trackingNumber.trim();
  const state = read(stateKey(tn)) || { startedAt: Date.now(), bump: 0 };
  write(stateKey(tn), state);
  const script = getScript(mode);
  const n = revealedCount(state, script.length);
  const ids = script.map((e, i) => `EVT-${tn}-${i + 1}`);
  const events = script.slice(0, n).map((e, i) => ({
    eventId: e.dupOf !== undefined ? ids[e.dupOf] : ids[i], code: e.code, description: e.description,
    occurredAt: new Date(state.startedAt + i * intervalMs()).toISOString(), timezone: 'UTC', location: e.location,
    podUrl: e.pod ? `https://fake-principal.example/pod/${tn}.pdf` : undefined,
  }));
  return { trackingNumber: tn, principal, status: 'OK', fetchedAt: new Date().toISOString(), events };
};