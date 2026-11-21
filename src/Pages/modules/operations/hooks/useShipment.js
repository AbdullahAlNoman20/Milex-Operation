// src/Pages/modules/operations/hooks/useShipment.js
import { useState, useEffect, useCallback } from 'react';
import { useOperationsAuth } from './useOperationsAuth';
import { useDataVersion } from './useDataVersion';
import { fetchShipmentById } from '../services/shipmentService';
import { canViewShipment } from '../services/accessService';

// Loads one shipment, enforces visibility, and refreshes whenever any operations data changes.
export const useShipment = (shipmentId) => {
  const { currentUser } = useOperationsAuth();
  const version = useDataVersion();
  const [state, setState] = useState({ shipment: null, isLoading: true, error: null });

  const load = useCallback(async () => {
    try {
      const s = await fetchShipmentById(shipmentId);
      if (!s) return setState({ shipment: null, isLoading: false, error: 'Shipment not found.' });
      if (!canViewShipment(currentUser, s)) return setState({ shipment: null, isLoading: false, error: 'You do not have access to this shipment.' });
      return setState({ shipment: s, isLoading: false, error: null });
    } catch {
      return setState({ shipment: null, isLoading: false, error: 'Failed to load the shipment.' });
    }
  }, [shipmentId, currentUser]);

  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { load(); }, [load, version]);

  return { ...state, reload: load };
};