// src/Pages/modules/operations/utils/documentAccess.js
// Who may open which printable document. BACKEND TODO: enforce the same rules on the document endpoints.
import { canViewShipment, canSeeDocumentPack } from '../services/accessService';
import { OPERATIONS_ROLES as R } from '../constants/operationsRoles';


export const canViewDocType = (user, s, type, doc) => {
  if (!user || !s || !canViewShipment(user, s)) return false;
  const role = user.role;
  if ([R.OPERATIONS_HEAD, R.DOMESTIC_ADMIN].includes(role)) return true;
  if (role === R.COURIER) return type === 'INVOICE' && s.mode === 'EXPORT'; // the invoice copy that travels with the pickup
  if (role === R.CLIENT) {
    if (type === 'POD') return !!s.pod?.deliveredAt;
    if (type === 'CLOSURE') return !!s.closure;
    return type === 'INVOICE' || !!doc;
  }
  if ([R.CNF, R.FOREIGN_ADMIN].includes(role)) {
    if (type === 'POD' || type === 'CLOSURE') return false;
    return canSeeDocumentPack(user, s);
  }
  return false;
};