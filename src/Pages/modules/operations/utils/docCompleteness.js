// src/Pages/modules/operations/utils/docCompleteness.js
// Pure rules: a document is COMPLETE only when no required field is missing. Used for the Draft / Complete tag and for download.
import { REQUIRED_DOC_TYPES_BY_MODE, DOC_TYPE_LABELS } from '../constants/shipmentFields';

const has = (v) => v !== undefined && v !== null && String(v).trim() !== '';
const pos = (v) => Number(v) > 0;

const RULES = {
  INVOICE: (s, d) => {
    const m = [];
    if (!has(d.invoiceNo)) m.push('Invoice number');
    if (!has(d.invoiceDate)) m.push('Invoice date');
    const items = d.items || [];
    if (!items.length || items.some((i) => !has(i.description) || !pos(i.pcs) || !has(i.unitCost))) m.push('Invoice items');
    return m;
  },
  PACKING_LIST: (s, d) => {
    const rows = d.rows || [];
    const m = [];
    if (!rows.length) m.push('Carton rows');
    if (rows.some((r) => !has(r.cartonNo) || !has(r.description))) m.push('Carton number / goods');
    if (rows.some((r) => !pos(r.qty))) m.push('Quantity per carton');
    if (rows.some((r) => !pos(r.netKg))) m.push('Net weight');
    if (rows.some((r) => !pos(r.grossKg))) m.push('Gross weight');
    return m;
  },
  DECLARATION: (s, d) => {
    const need = [['declarationNo', 'Declaration no.'], ['declarationDate', 'Date'], ['invoiceNo', 'Invoice no.'], ['exporterName', 'Exporter'], ['exporterAddress', 'Exporter address'],
      ['importerName', 'Importer'], ['importerAddress', 'Importer address'], ['goodsDescription', 'Goods description']];
    const m = need.filter(([k]) => !has(d[k])).map(([, l]) => l);
    if (!pos(d.grossWeight)) m.push('Gross weight');
    if (!pos(d.netWeight)) m.push('Net weight');
    if (!pos(d.pcs)) m.push('Pieces');
    if (!pos(d.declaredValue)) m.push('Declared value');
    return m;
  },
  LABEL: (s, d, doc) => (doc?.file || d.generated ? [] : ['Label file from the labelling system']),
  AWB: (s, d) => {
    const m = [];
    if (d.state !== 'FINAL') m.push('Supervisor finalisation');
    if (!d.termsAccepted) m.push("Sender's agreement");
    return m;
  },
};

// { complete, state: 'MISSING' | 'DRAFT' | 'COMPLETE', missing: [] }
export const getDocStatus = (type, shipment, doc) => {
  if (!doc) return { complete: false, state: 'MISSING', missing: ['Not created yet'] };
  const missing = RULES[type] ? RULES[type](shipment, doc.data || {}, doc) : [];
  return { complete: missing.length === 0, state: missing.length ? 'DRAFT' : 'COMPLETE', missing };
};

export const missingRequiredDocs = (shipment, latest = {}) =>
  (REQUIRED_DOC_TYPES_BY_MODE[shipment.mode] || []).filter((t) => !getDocStatus(t, shipment, latest[t]).complete).map((t) => DOC_TYPE_LABELS[t]);

export const mergeStatus = (...list) => ({
  complete: list.every((x) => x.complete),
  state: list.every((x) => x.complete) ? 'COMPLETE' : 'DRAFT',
  missing: list.flatMap((x) => x.missing || []),
});