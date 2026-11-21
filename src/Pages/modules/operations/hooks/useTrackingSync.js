// src/Pages/modules/operations/hooks/useTrackingSync.js
import { useEffect } from 'react';
import { syncAllTrackable } from '../services/trackingService';

// Polls the (fake) principal API. BACKEND TODO: move this to a server-side job / webhook.
export const useTrackingSync = (intervalMs = 12000) => {
  useEffect(() => {
    const run = () => { if (!document.hidden) syncAllTrackable().catch(() => {}); };
    run();
    const id = setInterval(run, intervalMs);
    document.addEventListener('visibilitychange', run);
    return () => { clearInterval(id); document.removeEventListener('visibilitychange', run); };
  }, [intervalMs]);
};