// src/Pages/modules/operations/utils/manifestExcel.js
// Checks which data each manifest layout needs (airline origin layout / Dhaka customs layout).
// Manifests are printed or saved as PDF (landscape A4) — there is no Excel download.

export const MANIFEST_CONSIGNEE = 'ANROOT LOGEX LIMITED'; // Bangladesh consignee of the master AWB (shown on the Dhaka customs manifest)

// Exact header row of the airline template (A1:BK1).
export const ORIGIN_HEADERS = ['*运单3位前缀', '*8位运单号', '*分运单号', '*分运单始发站', '*分运单目的站', '*分运单件数', '*分运单重量', '分运单SLAC件数', '*品名', 'Special Handling Code 1', 'Special Handling Code 2', 'Description of Goods', '*发货人名称', '*发货人具体地址', '*发货人城市', '发货人省份 州', '*发货人国家', '*发货人邮编', '发货人联系方式标识符', '发货人联系信息', '*收货人名称', '*收货人具体地址', '*收货人城市', '收货人省份 州', '*收货人国家', '*收货人邮编', '收货人联系方式标识符', '收货人联系信息', '*付款货币', 'Declared Value For Carriage', 'Declared Value For Customs', 'Amount Of Insurance', 'HS CODE 1', 'HS CODE 2', 'HS CODE 3', 'HS CODE 4', 'HS CODE 5', 'HS CODE 6', 'HS CODE 7', 'HS CODE 8', 'HS CODE 9', '发货人代码', '收货人代码', '信息标识符1', '国家代码1', '海关信息标识符1', '补充海关信息1', '信息标识符2', '国家代码2', '海关信息标识符2', '补充海关信息2', '信息标识符3', '国家代码3', '海关信息标识符3', '补充海关信息3', '信息标识符4', '国家代码4', '海关信息标识符4', '补充海关信息4', '信息标识符5', '国家代码5', '海关信息标识符5', '补充海关信息5'];
const ORIGIN_WIDTHS = [12, 13.5, 17.5, 12.9, 12.9, 10.9, 10.9, 17.6, 26.2, 12.6, 11.4, 26.5, 31.5, 47, 20.9, 15.1, 12, 12, 12.4, 12.4, 40.5, 41.6, 19.6, 15.1, 12, 12, 21.2, 15, 9.9, 30.4, 29.4, 21.5, 13.8, 14.5, 14.2, 14.4, 12, 12.5, 13.8, 12.5, 12, 13.5, 20.4, 13, 11.2, 17.9, 13];
export const DHAKA_HEADERS = ['No', 'HAWB No', 'Commodity', 'Name of Shipper', 'Shipper address', 'Origin', 'Name of Consignee', 'Consignee address', 'DEST', 'No of Pieces', 'WEIGHT (KG)', 'C/VALUE(USD)', 'BIN VAT'];
const DHAKA_WIDTHS = [5.1, 27.4, 21.1, 35.2, 39.5, 8.8, 34.2, 37.2, 24.5, 8.4, 12.9, 12.6, 25.5];

const clean = (v) => String(v ?? '').replace(/\u00a0/g, ' ').replace(/\s+/g, ' ').trim().toUpperCase();
const num = (v) => (v === '' || v == null || Number.isNaN(Number(v)) ? '' : Number(v));
const mawbParts = (mawb) => { const d = String(mawb || '').replace(/\D/g, ''); return { prefix: d.slice(0, 3), serial: d.slice(3, 11) }; };
const mawbPretty = (mawb) => { const { prefix, serial } = mawbParts(mawb); return prefix && serial ? `${prefix}-${serial}` : String(mawb || ''); };

// Fields the OTHER file needs but this manifest row may not have yet — returned so the user can be forced to fill them.
export const missingForOrigin = (m) => {
  const out = [];
  if (!/^\d{11}$/.test(String(m.flight?.mawbNo || '').replace(/\D/g, ''))) out.push('Master AWB number (11 digits)');
  if (!m.flight?.loadingPort) out.push('Loading port (e.g. CTU)');
  (m.rows || []).forEach((r, i) => {
    const n = i + 1;
    if (!r.shipperCity) out.push(`Row ${n}: shipper city`);
    if (!r.consigneeCity) out.push(`Row ${n}: consignee city`);
    if (!r.consigneePostCode) out.push(`Row ${n}: consignee post code`);
    if (!r.bin) out.push(`Row ${n}: consignee BIN / VAT`);
  });
  return out;
};
export const missingForDhaka = (m) => {
  const out = [];
  if (!m.flight?.mawbNo) out.push('Master AWB number');
  if (!m.flight?.flightNo) out.push('Flight number');
  if (!m.flight?.loadingPort) out.push('Port (e.g. CTU)');
  (m.rows || []).forEach((r, i) => { if (!r.bin) out.push(`Row ${i + 1}: consignee BIN / VAT`); });
  return out;
};
