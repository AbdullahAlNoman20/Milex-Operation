// src/Pages/modules/operations/components/print/Barcode.jsx
import { useEffect, useRef } from 'react';
import JsBarcode from 'jsbarcode';

const Barcode = ({ value, height = 45, width = 1.8, className = '' }) => {
  const ref = useRef(null);
  useEffect(() => {
    if (!ref.current || !value) return;
    try {
      JsBarcode(ref.current, String(value), { format: 'CODE128', width, height, displayValue: true, fontSize: 11, margin: 0 });
    } catch { /* characters not supported by CODE128 — leave blank */ }
  }, [value, height, width]);
  return <svg ref={ref} className={className} role="img" aria-label={`Barcode ${value || ''}`} />;
};

export default Barcode;