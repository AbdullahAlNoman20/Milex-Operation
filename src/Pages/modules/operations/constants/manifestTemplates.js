// src/Pages/modules/operations/constants/manifestTemplates.js
export const MANIFEST_ROW_FIELDS = Object.freeze({
  hawbNo: 'HAWB / AWB No.', consignmentNo: 'Consignment No. (Connote)', shipperName: 'Shipper', shipperAddress: 'Shipper Address',
  consigneeName: 'Consignee', consigneeAddress: 'Consignee Address', phone: 'Telephone', commodity: 'Contents / Commodity', hsCode: 'HS Code',
  pieces: 'Pcs', weightKg: 'Weight (kg)', destCountry: 'Dest.', originStation: 'Origin', destStation: 'Destination', shipperCity: 'Shipper City', shipperProvince: 'Shipper Province / State', shipperCountry: 'Shipper Country', shipperPostCode: 'Shipper Post Code', consigneeCity: 'Consignee City', consigneePostCode: 'Consignee Post Code', consigneeCountry: 'Consignee Country', originCountry: 'Origin (country)',
  customsValue: 'Customs Value', currency: 'Currency', bin: 'BIN / VAT', bagNo: 'Bag No.', serviceProvider: 'Service Provider',
  service: 'Service (Last-mile)', labelNo: 'Info / Label No.',
});

export const MANIFEST_TEMPLATES = Object.freeze({
  COURIER_DPD: {
    code: 'COURIER_DPD', label: 'Courier Manifest (Qatar Airways / DPD)',
    headerFields: ['Docket / Run No.', 'Travel / Flight No.'],
    columns: ['consignmentNo', 'shipperName', 'consigneeName', 'service', 'commodity', 'pieces', 'weightKg', 'destCountry', 'customsValue', 'labelNo'],
  },
  EXPORT_STANDARD: {
    code: 'EXPORT_STANDARD', label: 'Export Shipment Manifest',
    headerFields: ['File / Run No.'],
    columns: ['hawbNo', 'shipperName', 'consigneeName', 'consigneeAddress', 'phone', 'commodity', 'pieces', 'weightKg', 'destCountry', 'customsValue', 'serviceProvider', 'bagNo'],
  },
  AIRLINE_ORIGIN_XLSX: {
    code: 'AIRLINE_ORIGIN_XLSX', label: 'Origin Manifest for Airline',
    headerFields: [],
    labels: { hawbNo: '*分运单号 / HAWB', commodity: '*品名 / Commodity', shipperName: '*发货人名称 / Shipper', shipperAddress: '*发货人具体地址', shipperCity: '*发货人城市', shipperProvince: '发货人省份 州', consigneeName: '*收货人名称 / Consignee', consigneeAddress: '*收货人具体地址', consigneeCity: '*收货人城市', consigneePostCode: '*收货人邮编', pieces: '*分运单件数 / Pcs', weightKg: '*分运单重量 / Kg', customsValue: 'Declared Value For Customs', hsCode: 'HS CODE 1', bin: '收货人代码 / BIN' },
    columns: ['hawbNo', 'commodity', 'shipperName', 'shipperAddress', 'shipperCity', 'shipperProvince', 'consigneeName', 'consigneeAddress', 'consigneeCity', 'consigneePostCode', 'pieces', 'weightKg', 'customsValue', 'hsCode', 'bin'],
  },
  DAC_CUSTOMS: {
    code: 'DAC_CUSTOMS', label: 'DAC Customs Manifest',
    headerFields: [],
    labels: { hawbNo: 'HAWB No', commodity: 'Commodity', shipperName: 'Name of Shipper', shipperAddress: 'Shipper address', originCountry: 'Origin', consigneeName: 'Name of Consignee', consigneeAddress: 'Consignee address', destCountry: 'DEST', pieces: 'No of Pieces', weightKg: 'WEIGHT (KG)', customsValue: 'C/VALUE(USD)', bin: 'BIN VAT' },
    columns: ['hawbNo', 'commodity', 'shipperName', 'shipperAddress', 'originCountry', 'consigneeName', 'consigneeAddress', 'destCountry', 'pieces', 'weightKg', 'customsValue', 'bin'],
  },
});
export const MANIFEST_TEMPLATE_LIST = Object.values(MANIFEST_TEMPLATES);
export const emptyManifestRow = () => ({ shipmentId: '', clientEmail: '', hawbNo: '', consignmentNo: '', shipperName: '', shipperAddress: '', consigneeName: '', consigneeAddress: '', phone: '', commodity: '', hsCode: '', pieces: '', weightKg: '', destCountry: '', originStation: '', destStation: '', customsValue: '', currency: 'USD', bin: '', bagNo: '', serviceProvider: '', service: '', labelNo: '', shipperCity: '', shipperProvince: '', shipperCountry: '', shipperPostCode: '', consigneeCity: '', consigneePostCode: '', consigneeCountry: '', originCountry: '' });