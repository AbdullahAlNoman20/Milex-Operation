// src/Pages/modules/operations/utils/progress.js
import { getSequence, getStatusIndex } from '../constants/shipmentStatus';

export const progressPct = (s) => {
  const seq = getSequence(s.mode, s.handlingPath);
  const i = Math.max(getStatusIndex(s.mode, s.statusCode, s.handlingPath), 0);
  return seq.length > 1 ? Math.round((i / (seq.length - 1)) * 100) : 0;
};