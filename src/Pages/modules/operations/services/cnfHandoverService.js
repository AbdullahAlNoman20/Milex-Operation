import { fetchShipmentById, advanceShipment, recordMawb, setTrackingReference } from './shipmentService';
import { ensureManifestForShipment } from './manifestService';
import { toActor, sanitizeStr } from './serviceUtils';
import { getStatusIndex } from '../constants/shipmentStatus';
import { OPERATIONS_ROLES as R } from '../constants/operationsRoles';

const STEPS = ['EXPORT_CUSTOMS_CLEARANCE', 'MANIFESTED', 'HANDED_OVER_TO_AIRLINE', 'DEPARTED_ORIGIN'];
const idx = (code) => getStatusIndex('EXPORT', code);

// Customs → Manifested → Handed over → Departed, একবারে। শেষে tracking number দিয়ে API tracking শুরু হয়।
export const handoverToAirline = async (shipmentId, d, actorIn) => {
  const actor = toActor(actorIn);
  if (![R.CNF, R.DOMESTIC_ADMIN].includes(actor.role)) throw new Error('Only the C&F can hand over to the airline');
  if (!sanitizeStr(d.mawbNumber, 20) || !sanitizeStr(d.flightNo, 20)) throw new Error('MAWB number and flight number are required');
  if (!sanitizeStr(d.trackingNumber, 60)) throw new Error("The principal's tracking number is required");
  let s = await fetchShipmentById(shipmentId);
  if (!s || s.mode !== 'EXPORT') throw new Error('Shipment not found');
  if (idx(s.statusCode) < idx('EXPORT_DOCUMENTATION')) throw new Error('The documents are not ready yet');
  if (s.gates?.GATE_2?.status !== 'APPROVED') throw new Error('The document pack is not approved by the Operations Head yet');

  await recordMawb(shipmentId, { mawbNumber: d.mawbNumber, airline: d.airline, flightNo: d.flightNo, flightDate: d.flightDate }, actor);
  await setTrackingReference(shipmentId, { principal: d.principal, trackingNumber: d.trackingNumber }, actor);
  for (const code of STEPS) {
    s = await fetchShipmentById(shipmentId);
    if (idx(s.statusCode) >= idx(code)) continue;
    if (code === 'MANIFESTED') await ensureManifestForShipment(s, actor);
    await advanceShipment(shipmentId, code, { note: sanitizeStr(d.note, 300) }, actor);
  }
  return fetchShipmentById(shipmentId);
};