// ===== 2) src/Pages/modules/operations/hooks/useClientNotifications.js  (REPLACE ENTIRE FILE) =====
import { useState, useEffect, useCallback } from 'react';
import { useOperationsAuth } from './useOperationsAuth';
import { useDataVersion } from './useDataVersion';
import { fetchShipmentsByClientEmail } from '../services/shipmentService';
import { OPERATIONS_ROLES as R } from '../constants/operationsRoles';

// Unread messages from Operations (Head / Supervisor) on the client's own shipments.
export const useClientNotifications = () => {
  const { currentUser } = useOperationsAuth();
  const version = useDataVersion();
  const [items, setItems] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  const load = useCallback(async () => {
    if (currentUser?.role !== R.CLIENT || !currentUser?.email) { setItems([]); setIsLoading(false); return; }
    try {
      const shipments = await fetchShipmentsByClientEmail(currentUser.email);
      const list = shipments.flatMap((s) => (Array.isArray(s.messages) ? s.messages : [])
        .filter((m) => m?.from?.role && m.from.role !== R.CLIENT)
        .map((m) => ({ shipmentId: s.shipmentId, mode: s.mode, ...m, unread: !(Array.isArray(m.readBy) && m.readBy.includes(R.CLIENT)) })));
      setItems(list.sort((a, b) => (String(a.at) < String(b.at) ? 1 : -1)));
    } catch {
      setItems([]);
    } finally {
      setIsLoading(false);
    }
  }, [currentUser]);

  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { load(); }, [load, version]);

  return { items, unreadCount: items.filter((i) => i.unread).length, isLoading, reload: load };
};