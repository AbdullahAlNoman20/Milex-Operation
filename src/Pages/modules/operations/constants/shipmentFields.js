// src/Pages/modules/operations/constants/shipmentFields.js
export const PARTY_ADDRESS_FIELDS = Object.freeze([
  { key: 'companyName', label: 'Company Name', type: 'text', required: true, placeholder: 'Advance Denim Co Ltd', help: 'Full legal / registered name of the company.' },
  { key: 'contactPerson', label: 'Contact Person', type: 'text', required: true, placeholder: 'Bonnie Zhang', help: 'Person to contact about this shipment.' },
  { key: 'contactPhone', label: 'Contact Phone', type: 'tel', required: true, placeholder: '+8801711223344', help: 'Include the country code, e.g. +880 for Bangladesh.' },
  { key: 'contactEmail', label: 'Contact Email', type: 'email', required: true, placeholder: 'contact@company.com', help: 'Used for shipment notifications and documents.' },
  { key: 'address', label: 'Address', type: 'textarea', required: true, placeholder: 'House 7, Road 17, Block-E, Banani', help: 'Full street address.' },
  { key: 'city', label: 'City', type: 'text', required: true, placeholder: 'Dhaka', help: 'City or town.' },
  { key: 'postCode', label: 'Post / Zip Code', type: 'text', required: false, placeholder: '1213', help: 'Postal code, if applicable.' },
  { key: 'country', label: 'Country', type: 'country', required: true, placeholder: 'Bangladesh', help: 'Choose the country from the list.' },
]);

export const TAX_ID_FIELDS = Object.freeze([
  { key: 'eori', label: 'EORI / Customs ID', type: 'text', required: false, placeholder: 'GB123456789000', help: 'Only if applicable — never guessed.' },
  { key: 'vat', label: 'VAT No.', type: 'text', required: false, placeholder: '', help: 'VAT registration number, if applicable.' },
  { key: 'bin', label: 'BIN No.', type: 'text', required: false, placeholder: '000794605-0101', help: 'Bangladesh Business Identification Number.' },
  { key: 'erc', label: 'ERC No.', type: 'text', required: false, placeholder: '', help: 'Export Registration Certificate, if applicable.' },
  { key: 'etin', label: 'e-TIN', type: 'text', required: false, placeholder: '', help: 'Electronic Tax ID.' },
]);

export const ROUTE_FIELDS = Object.freeze([
  { key: 'originCountry', label: 'Origin Country', type: 'country', required: true, placeholder: 'Bangladesh', help: 'Country the shipment starts from.' },
  { key: 'originCity', label: 'Origin City', type: 'text', required: true, placeholder: 'Dhaka', help: '' },
  { key: 'originAirport', label: 'Origin Airport (IATA)', type: 'text', required: false, placeholder: 'DAC', help: '3-letter IATA code.' },
  { key: 'destCountry', label: 'Destination Country', type: 'country', required: true, placeholder: 'United Kingdom', help: '' },
  { key: 'destCity', label: 'Destination City', type: 'text', required: true, placeholder: 'London', help: '' },
  { key: 'destAirport', label: 'Destination Airport (IATA)', type: 'text', required: false, placeholder: 'LHR', help: '3-letter IATA code.' },
  { key: 'carrier', label: 'Carrier / Service Provider', type: 'text', required: false, placeholder: 'US-Bangla Airlines', help: 'Carrier confirmed by Operations; leave blank if unknown.' },
  { key: 'principal', label: 'Principal (tracking partner)', type: 'select', required: false, options: ['Linex (Dubai)', 'Linex (Colombo)', 'Linex (Singapore)', 'LHR / ISE Logistics (London)', 'China Fly Logistics'], help: 'Principal that supplies tracking events after departure.' },
]);

export const PARCEL_DETAIL_FIELDS = Object.freeze([
  { key: 'shipmentContents', label: 'Shipment Contents', type: 'textarea', required: true, placeholder: 'Cotton Fabric Rolls', help: 'Description of the goods.' },
  { key: 'pieces', label: 'No. of Pieces', type: 'number', required: true, placeholder: '4', help: 'Total pieces.' },
  { key: 'weightKg', label: 'Weight (KG)', type: 'number', required: true, placeholder: '29.5', help: 'Gross weight in kg.' },
  { key: 'cartons', label: 'No. of Cartons', type: 'number', required: true, placeholder: '1', help: 'Cartons / boxes.' },
  { key: 'remarks', label: 'Remarks', type: 'textarea', required: false, placeholder: 'Please approve for SS27', help: 'Special instruction for this shipment.' },
]);

export const PARCEL_EXTRA_FIELDS = Object.freeze([
  { key: 'hsCode', label: 'HS Code', type: 'text', required: false, placeholder: '6109.90', help: 'Only if known / applicable.' },
  { key: 'countryOfOrigin', label: 'Country of Origin', type: 'country', required: false, placeholder: 'Bangladesh', help: '' },
  { key: 'lengthCm', label: 'Length (cm)', type: 'number', required: false, placeholder: '75', help: '' },
  { key: 'widthCm', label: 'Width (cm)', type: 'number', required: false, placeholder: '50', help: '' },
  { key: 'heightCm', label: 'Height (cm)', type: 'number', required: false, placeholder: '44', help: '' },
  { key: 'incoterms', label: 'Incoterms', type: 'text', required: false, placeholder: 'DAP', help: '' },
  { key: 'exportPurpose', label: 'Export Purpose', type: 'text', required: false, placeholder: 'Sample / Commercial', help: '' },
]);

export const SHIPMENT_HEADER_FIELDS = Object.freeze([
  { key: 'refNo', label: 'Client Ref / PO', type: 'text', required: true, placeholder: '260763', help: 'Your reference number for this booking.' },
  { key: 'costCarriedBy', label: 'Cost Carried By', type: 'select', options: ['Shipper', 'Receiver'], required: true, placeholder: 'Shipper', help: 'Who pays the shipment charges: the Shipper (sender) or the Receiver.' },
  { key: 'bookingDate', label: 'Booking Date', type: 'date', required: true, help: '' },
  { key: 'requestedPickupDate', label: 'Requested Pickup Date', type: 'date', required: false, help: '' },
]);

export const DOCUMENT_CHECKLIST = Object.freeze(['Trade License', 'LC (Letter of Credit)', 'TIN Certificate', 'BIN Certificate', 'NID / Passport', 'Other']);

export const AWB_SHIPMENT_TYPE_OPTIONS = Object.freeze(['DOCUMENT', 'NON_DOCUMENT']);
export const PAYMENT_PARTY_OPTIONS = Object.freeze(['Sender', 'Recipient', 'Third Party']);
export const PACKAGING_OPTIONS = Object.freeze(['Envelope', 'Pouch', 'Carton']);
export const SERVICE_OPTIONS = Object.freeze(['Express', 'Premium', 'Special', 'e-Parcel']);
export const CURRENCY_OPTIONS = Object.freeze(['USD', 'BDT', 'GBP', 'EUR']);
export const AWB_COPY_TYPES = Object.freeze(['Shipper', 'Revenue', 'Invoice', 'Hub', 'Recipient']);
export const PARCEL_CONDITION_OPTIONS = Object.freeze(['GOOD', 'DAMAGED', 'OPENED', 'OTHER']);
export const CHECK_RESULT_OPTIONS = Object.freeze(['PASS', 'FAIL']);

export const DOC_TYPES = Object.freeze({
  INVOICE: 'INVOICE',
  PACKING_LIST: 'PACKING_LIST',
  DECLARATION: 'DECLARATION',
  LABEL: 'LABEL',
  AWB: 'AWB',
  HAWB_MAWB: 'HAWB_MAWB',
  SIGNED_DOCS: 'SIGNED_DOCS',
  SUPPLIER_DOCS: 'SUPPLIER_DOCS',
});
export const DOC_TYPE_LABELS = Object.freeze({
  INVOICE: 'Commercial Invoice', PACKING_LIST: 'Packing List', DECLARATION: 'Declaration', LABEL: 'Shipping Label',
  AWB: 'Air Waybill (AWB)', MANIFEST: 'Manifest', HAWB_MAWB: 'HAWB / MAWB', SIGNED_DOCS: 'Signed / Stamped Documents', SUPPLIER_DOCS: 'Supplier Documents',
});
// Completeness required before Gate 2 (export) / customs processing (import)
export const REQUIRED_DOC_TYPES_BY_MODE = Object.freeze({
  EXPORT: ['INVOICE', 'PACKING_LIST', 'DECLARATION', 'LABEL', 'AWB'],
  // Import: AWB → Invoice → Packing List → Label (+ Manifest). The Declaration is for EXPORT only.
  IMPORT: ['AWB', 'INVOICE', 'PACKING_LIST', 'LABEL'],
});

export const EVIDENCE_TYPES = Object.freeze({
  EXPORT_BE: 'Export B/E Submission',
  EXPORT_CUSTOMS_CLEARANCE: 'Export Customs Clearance',
  ORIGIN_EXPORT_CLEARANCE: 'Origin Export Clearance (Import)',
  MANIFEST_EGM: 'Manifest / EGM Submission',
  SECURITY_ACCEPTANCE: 'Security Screening / Airline Acceptance',
  HANDOVER: 'Airline Handover',
  IMPORT_CUSTOMS_PROCESSING: 'Import Customs Processing',
  IMPORT_CUSTOMS_RELEASE: 'Import Customs Release',
});
export const EVIDENCE_RESULTS = Object.freeze(['SUBMITTED', 'ACCEPTED', 'REJECTED', 'ON_HOLD']);

export const TASK_TYPES = Object.freeze({
  PICKUP: 'Pickup (Export)',
  ORIGIN_PICKUP: 'Origin Pickup (Import)',
  AIRPORT_COLLECTION: 'Airport Collection (Import)',
  DELIVERY: 'Delivery',
});

export const DOC_ORDER_BY_MODE = Object.freeze({
  EXPORT: ['INVOICE', 'PACKING_LIST', 'DECLARATION', 'LABEL', 'AWB', 'MANIFEST'],
  IMPORT: ['AWB', 'INVOICE', 'PACKING_LIST', 'LABEL', 'MANIFEST'],
});

export const emptyInvoiceItem = () => ({ description: '', hsCode: '', pcs: '', unitCost: '' });
export const emptyPackingRow = () => ({ cartonNo: '', description: '', qty: '', netKg: '', grossKg: '', lengthCm: '', widthCm: '', heightCm: '' });