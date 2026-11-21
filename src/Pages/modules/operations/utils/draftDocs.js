// src/Pages/modules/operations/utils/draftDocs.js
// Builds document data from the booking form. Fields we cannot know yet stay empty (Supervisor fills them).
import { AWB_COPY_TYPES } from '../constants/shipmentFields';
import { AWB_TERMS_TEXT } from '../constants/termsAndConditions';

const addr = (p = {}) => [p.address, p.city, p.postCode, p.country].filter(Boolean).join(', ');
const today = () => new Date().toISOString().slice(0, 10);

export const buildInvoiceData = (s, items, comment = '') => {
  const subtotal = items.reduce((t, i) => t + (Number(i.unitCost) || 0) * (Number(i.pcs) || 0), 0);
  return {
    invoiceNo: `INV-${s.shipmentId}`, invoiceDate: s.bookingDate || today(), currency: s.parcel?.currency || 'USD',
    incoterms: s.parcel?.incoterms || '', exportPurpose: s.parcel?.exportPurpose || '', items,
    subtotal: Number(subtotal.toFixed(2)), total: Number(subtotal.toFixed(2)), grandTotal: Number(subtotal.toFixed(2)),
    additionalComment: comment, autoDraft: true,
  };
};

export const buildPackingData = (s) => {
  const n = Math.min(Math.max(Number(s.parcel?.cartons) || 1, 1), 100);
  const single = n === 1;
  return {
    packingNo: `PL-${s.shipmentId}`, marks: '', seal: '', remarks: '', autoDraft: true,
    rows: Array.from({ length: n }, (_, i) => ({
      // Pieces and weight are spread evenly over the cartons the first time; the Supervisor can edit each row.
      cartonNo: String(i + 1), description: s.parcel?.shipmentContents || '',
      qty: single ? s.parcel?.pieces || '' : (Number(s.parcel?.pieces) > 0 ? Math.floor(Number(s.parcel.pieces) / n) + (i === 0 ? Number(s.parcel.pieces) % n : 0) : ''),
      netKg: '', grossKg: single ? s.parcel?.weightKg || '' : (Number(s.parcel?.weightKg) > 0 ? Number((Number(s.parcel.weightKg) / n).toFixed(2)) : ''), lengthCm: s.parcel?.lengthCm || '', widthCm: s.parcel?.widthCm || '', heightCm: s.parcel?.heightCm || '',
    })),
  };
};

export const buildDeclarationData = (s) => ({
  declarationNo: `DEC-${s.shipmentId}`, declarationDate: today(), invoiceNo: `INV-${s.shipmentId}`,
  ercNo: s.taxIds?.erc || '', ercDate: '', previousErc: '', binNo: s.taxIds?.bin || '', binDate: '', vat: s.taxIds?.vat || '', etin: s.taxIds?.etin || '',
  hsCode: s.parcel?.hsCode || '', countryOfOrigin: s.parcel?.countryOfOrigin || '', grossWeight: s.parcel?.weightKg || '', netWeight: '',
  pcs: s.parcel?.pieces || '', declaredValue: s.parcel?.declaredValue || '', currency: s.parcel?.currency || 'USD',
  incoterms: s.parcel?.incoterms || '', exportPurpose: s.parcel?.exportPurpose || '', beNo: '', mawbNo: s.mawb?.mawbNumber || '',
  exporterName: s.pickup?.companyName || '', exporterAddress: addr(s.pickup), importerName: s.receiver?.companyName || '', importerAddress: addr(s.receiver),
  goodsDescription: s.parcel?.shipmentContents || '', sampleNote: '',
  declarationText: 'I/We hereby declare that the particulars stated in this declaration are true and correct.',
  signatoryName: '', signatoryTitle: '', autoDraft: true,
});

export const buildAwbData = (s, termsAccepted = false) => ({
  awbNumber: s.awbNumber || '', senderAcNo: '', internalReference: s.refNo || '', pickedUpBy: '', receivedBy: '', carrierAcceptanceRef: '',
  state: 'DRAFT', termsAccepted, termsVersion: 'v1', termsText: termsAccepted ? AWB_TERMS_TEXT : '', copies: AWB_COPY_TYPES, autoDraft: true,
});