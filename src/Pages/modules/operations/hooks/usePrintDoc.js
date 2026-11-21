// src/Pages/modules/operations/hooks/usePrintDoc.js
import { useState, useEffect } from 'react';
import { useOperationsAuth } from './useOperationsAuth';
import { fetchShipmentById } from '../services/shipmentService';
import { fetchLatestDocuments } from '../services/documentService';
import { canViewShipment } from '../services/accessService';
import { canViewDocType } from '../utils/documentAccess';

// Loads a shipment plus the latest version of the requested document types — only those the user may see.
export const usePrintDoc = (shipmentId, types = []) => {
  const { currentUser } = useOperationsAuth();
  const key = types.join(',');
  const [state, setState] = useState({ isLoading: true, error: null, shipment: null, docs: {} });

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const s = await fetchShipmentById(shipmentId);
        if (!alive) return;
        if (!s || !canViewShipment(currentUser, s)) {
          setState({ isLoading: false, error: 'This document was not found, or you do not have access to it.', shipment: null, docs: {} });
          return;
        }
        const latest = await fetchLatestDocuments(s.shipmentId);
        const docs = {};
        key.split(',').filter(Boolean).forEach((t) => { if (latest[t] && canViewDocType(currentUser, s, t, latest[t])) docs[t] = latest[t]; });
        if (alive) setState({ isLoading: false, error: null, shipment: s, docs });
      } catch {
        if (alive) setState({ isLoading: false, error: 'Failed to load the document.', shipment: null, docs: {} });
      }
    })();
    return () => { alive = false; };
  }, [shipmentId, key, currentUser]);

  return { ...state, user: currentUser };
};