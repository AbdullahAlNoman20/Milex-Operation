import { SYSTEM_ACTOR } from '../constants/operationsRoles';

const SUP = 'Operations Supervisor';
const HEAD = 'Operations Head';

// code -> [এখন কোথায়, এরপর কিসের অপেক্ষা]
const EXPORT = {
  DRAFT: ['Draft prepared', `Waiting for ${SUP}`],
  BOOKED: ['Booking submitted', `Waiting for ${SUP} to request approval`],
  PICKUP_ASSIGNED: ['Courier assigned for pickup', 'Waiting for Courier Man collection'],
  PICKED_UP: ['Parcel collected by Courier Man', `Waiting for hub receipt by ${SUP}`],
  RECEIVED_AT_ORIGIN_HUB: ['Parcel received at the hub', `Waiting for ${SUP} to prepare documents`],
  EXPORT_DOCUMENTATION: ['Documents are being prepared', `Waiting for ${SUP} / ${HEAD} document approval`],
  EXPORT_CUSTOMS_CLEARANCE: ['Export customs clearance in progress', 'Waiting for C&F customs evidence'],
  MANIFESTED: ['Manifest prepared', 'Waiting for C&F handover to the airline'],
  HANDED_OVER_TO_AIRLINE: ['Handed over to the airline', 'Waiting for flight departure'],
  DEPARTED_ORIGIN: ['Flight departed', 'On transit — waiting for carrier updates'],
};

const IMPORT = {
  DRAFT: ['Request prepared', 'Waiting for Client confirmation / submission'],
  BOOKING_CONFIRMED: ['Checked by the Operations Supervisor', 'Waiting for the Foreign Supervisor to arrange pickup'],
  PICKUP_ARRANGED: ['Pickup arranged at the supplier', 'Waiting for the Foreign Supervisor to collect'],
  PICKED_UP: ['Collected from the supplier', 'Waiting for receipt at the origin warehouse'],
  RECEIVED_AT_ORIGIN_WAREHOUSE: ['Received at the origin warehouse', `Waiting for ${SUP} to prepare documents`],
  EXPORT_DOCUMENTATION: ['Documents are being prepared', 'Waiting for origin export clearance'],
  HANDED_OVER_TO_AIRLINE: ['Handed over to the airline', 'Waiting for flight departure (API)'],
  DEPARTED_ORIGIN: ['Flight departed', 'On transit — waiting for carrier updates'],
  IN_TRANSIT: ['On transit', 'Waiting for arrival in Bangladesh'],
  ARRIVED_IN_BANGLADESH: ['Arrived in Bangladesh', `Waiting for ${SUP} to clear customs`],
  CUSTOMS_CLEARANCE_IN_PROGRESS: ['Customs clearance in progress', 'Waiting for customs release'],
  CUSTOMS_ASSESSMENT: ['Customs assessment / examination', 'Waiting for customs release'],
  CUSTOMS_RELEASED: ['Released by customs', `Waiting for ${SUP} to choose the delivery path`],
  DOCUMENTS_FORWARDED: ['Documents forwarded to the Client', 'Waiting for the Client to confirm self-clearance'],
  SELF_CLEARED: ['Client self-cleared', `Waiting for ${SUP} to close`],
  RECEIVED_AT_BD_HUB: ['Received at our warehouse', `Waiting for ${SUP} to send out for delivery`],
  OUT_FOR_DELIVERY: ['Out for delivery', 'Waiting for delivery confirmation'],
  DELIVERED: ['Delivered', `Waiting for ${SUP} to validate POD`],
  POD_UPDATED: ['Proof of delivery validated', `Waiting for ${SUP} to close`],
};

const COMMON = { POD_UPDATED: ['Proof of delivery recorded', `Waiting for ${SUP} to close`], DELIVERED: ['Delivered', 'Waiting for proof of delivery'] };

// events: tracking events (সর্বশেষটা দেখানো হবে); step: sequence-এর বর্তমান ধাপ
export const getStatusNote = (s, step = null, lastEvent = null) => {
  if (s.statusCode === 'CLOSED') return { where: 'Shipment closed', next: 'Completed', fromApi: false };
  const table = s.mode === 'IMPORT' ? IMPORT : EXPORT;
  let [where, next] = table[s.statusCode] || COMMON[s.statusCode] || [s.statusLabel || s.statusCode, 'On transit — waiting for carrier updates'];

  const g = (k) => s.gates?.[k]?.status;
  if (s.mode === 'EXPORT' && s.statusCode === 'BOOKED') next = `Waiting for ${SUP} to assign a Courier Man`;
  if (s.mode === 'IMPORT' && s.statusCode === 'DRAFT' && s.supervisorCheck?.status === 'PENDING' && g('GATE_1') !== 'PENDING') { where = 'Request submitted'; next = `Waiting for ${SUP} to check and send to the Foreign Supervisor`; }
  if (s.mode === 'EXPORT' && s.statusCode === 'EXPORT_DOCUMENTATION' && g('GATE_2') === 'PENDING') next = `Waiting for ${HEAD} final approval`;
  if (s.mode === 'EXPORT' && s.statusCode === 'EXPORT_DOCUMENTATION' && g('GATE_2') === 'APPROVED') next = 'Waiting for C&F customs clearance';
  if (s.clientConfirmation?.status === 'PENDING' && s.statusCode === 'DRAFT') next = 'Waiting for Client confirmation';
  if (s.openDiscrepancy) next = `Discrepancy found — waiting for ${SUP} review`;
  if (s.exceptionCode) next = `On hold: ${s.exceptionCode.replace(/_/g, ' ').toLowerCase()} — waiting for resolution`;

  const fromApi = step?.owner === SYSTEM_ACTOR || !!step?.apiAllowed;
  if (fromApi && lastEvent?.description) where = lastEvent.description;
  return { where, next, fromApi };
};