// src/Pages/modules/operations/utils/docRules.js
import { getStatusIndex } from '../constants/shipmentStatus';

// Core documents can get new versions only until the pack is consumed (customs signature / airline handover).
export const docsEditable = (s) => {
  if (!s || s.statusCode === 'CLOSED') return false;
  // Export and Import: after export customs clearance nothing can be edited any more.
  if (s.mode === 'EXPORT' && s.assignedCnf?.email) return false; // handed over to the C&F
  const last = 'EXPORT_DOCUMENTATION';
  return getStatusIndex(s.mode, s.statusCode, s.handlingPath) <= getStatusIndex(s.mode, last, s.handlingPath);
};