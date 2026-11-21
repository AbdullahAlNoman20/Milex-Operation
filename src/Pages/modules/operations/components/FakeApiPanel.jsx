// src/Pages/modules/operations/components/FakeApiPanel.jsx
// DEMO ONLY — controls for the fake principal API. Hidden when VITE_USE_FAKE_API=false.
import { useEffect, useState, useCallback } from 'react';
import { useToast } from '../../../../Components/hooks/useToast';
import { USE_FAKE_API, syncShipmentTracking } from '../services/trackingService';
import { getDemoState, demoAdvance, demoReset, setApiOutage } from '../services/principalApiMock';

const FakeApiPanel = ({ shipment }) => {
  const { showToast } = useToast();
  const tn = shipment?.tracking?.trackingNumber;
  const mode = shipment?.mode || 'EXPORT';
  const [state, setState] = useState(() => getDemoState(tn, mode));
  const [busy, setBusy] = useState(false);

  const refresh = useCallback(() => setState(getDemoState(tn, mode)), [tn, mode]);
  useEffect(() => { refresh(); const id = setInterval(refresh, 3000); return () => clearInterval(id); }, [refresh]);

  if (!USE_FAKE_API || !shipment) return null;

  const run = async (fn, msg) => {
    setBusy(true);
    try { await fn(); if (msg) showToast(msg); } catch (e) { showToast(e?.message || 'Failed', 'error'); } finally { setBusy(false); refresh(); }
  };
  const syncNow = () => run(async () => {
    const r = await syncShipmentTracking(shipment.shipmentId);
    if (r.skipped) throw new Error('Shipment is not in API tracking yet (needs tracking number + handover/departure)');
    if (r.ok === false) throw new Error(r.error);
    showToast(`Sync done — applied ${r.applied}, duplicates ignored ${r.duplicates}, review ${r.review}${r.blocked ? `, blocked: ${r.blocked}` : ''}`);
  });

  const btn = 'text-[11px] font-bold px-2.5 py-1.5 rounded-lg border transition disabled:opacity-40';
  return (
    <div className="border-2 border-dashed border-purple-300 bg-purple-50 rounded-xl p-3 text-xs space-y-2">
      <p className="font-black text-purple-800 uppercase tracking-wide">Fake Principal API — Demo Only</p>
      <p className="text-purple-700">{tn ? `Tracking ${tn}: ${state.revealed}/${state.total} events revealed (1 new event every ${Math.round(state.intervalMs / 1000)}s).` : 'No tracking number yet — set it first.'}</p>
      <div className="flex flex-wrap gap-2">
        <button type="button" disabled={busy || !tn} onClick={syncNow} className={`${btn} bg-purple-600 text-white border-purple-600`}>Sync now</button>
        <button type="button" disabled={busy || !tn} onClick={() => run(async () => { demoAdvance(tn); await syncShipmentTracking(shipment.shipmentId); }, 'Next fake event released')} className={`${btn} bg-white text-purple-700 border-purple-300`}>Simulate next event</button>
        <button type="button" disabled={busy || !tn} onClick={() => run(async () => demoReset(tn), 'Fake API reset for this tracking number')} className={`${btn} bg-white text-purple-700 border-purple-300`}>Reset script</button>
        <button type="button" disabled={busy} onClick={() => run(async () => setApiOutage(!state.outage), state.outage ? 'API outage OFF' : 'API outage ON — use manual fallback')} className={`${btn} ${state.outage ? 'bg-red-600 text-white border-red-600' : 'bg-white text-red-600 border-red-300'}`}>
          {state.outage ? 'Outage ON (click to stop)' : 'Simulate outage'}
        </button>
      </div>
      <p className="text-[10px] text-purple-600">The script includes a duplicate event, an unknown code (SCAN_X91 ✈ review queue), a flight delay and a customs hold, to test every rule.</p>
    </div>
  );
};

export default FakeApiPanel;