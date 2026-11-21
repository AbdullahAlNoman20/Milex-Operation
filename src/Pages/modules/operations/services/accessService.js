// src/Pages/modules/operations/services/accessService.js
// Central visibility rules. BACKEND TODO: enforce the same rules server-side on every endpoint.
import { OPERATIONS_ROLES as R } from '../constants/operationsRoles';
import { getStatusIndex } from '../constants/shipmentStatus';
import { sameId } from './serviceUtils';

export const canViewShipment = (user, s) => {
  if (!user || !s) return false;
  switch (user.role) {
    case R.OPERATIONS_HEAD:
    case R.DOMESTIC_ADMIN: return true;
    case R.CLIENT: return sameId(s.clientEmail, user.email);
    case R.FOREIGN_ADMIN: return sameId(s.assignedForeign?.email, user.email);
    case R.CNF: return sameId(s.assignedCnf?.email, user.email);
    case R.COURIER: return sameId(s.assignedCourier?.email, user.email);
    default: return false;
  }
};

export const filterVisibleShipments = (user, list = []) => list.filter((s) => canViewShipment(user, s));

// C&F and Foreign Supervisor see the document pack only once it is approved / ready.
export const canSeeDocumentPack = (user, s) => {
  if (!canViewShipment(user, s)) return false;
  if (![R.CNF, R.FOREIGN_ADMIN].includes(user.role)) return true;
  if (s.mode === 'EXPORT') return s.gates?.GATE_2?.status === 'APPROVED';
  return getStatusIndex('IMPORT', s.statusCode, s.handlingPath) >= getStatusIndex('IMPORT', 'EXPORT_DOCUMENTATION', s.handlingPath);
};