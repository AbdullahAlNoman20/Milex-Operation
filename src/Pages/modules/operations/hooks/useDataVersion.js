// src/Pages/modules/operations/hooks/useDataVersion.js
import { useEffect, useState } from 'react';

// Increments whenever any operations collection is written (this tab or another tab).
// Add it to a page's load() dependencies for live updates.
export const useDataVersion = () => {
  const [version, setVersion] = useState(0);
  useEffect(() => {
    const bump = () => setVersion((v) => v + 1);
    const onStorage = (e) => { if (e.key && e.key.startsWith('milex_ops_v3_data_')) bump(); };
    window.addEventListener('milex-ops-data', bump);
    window.addEventListener('storage', onStorage);
    return () => { window.removeEventListener('milex-ops-data', bump); window.removeEventListener('storage', onStorage); };
  }, []);
  return version;
};