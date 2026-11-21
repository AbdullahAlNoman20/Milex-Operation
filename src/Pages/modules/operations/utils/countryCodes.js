// src/Pages/modules/operations/utils/countryCodes.js
// Country name → ISO-3166 alpha-2 (CN, BD, HK …). Built from the browser's own region names + a few common aliases.
const ALIASES = { 'UK': 'GB', 'U.K.': 'GB', 'USA': 'US', 'U.S.A.': 'US', 'UAE': 'AE', 'RUSSIA': 'RU', 'SOUTH KOREA': 'KR', 'NORTH KOREA': 'KP', 'VIETNAM': 'VN', 'TURKEY': 'TR', 'IVORY COAST': 'CI', "CÔTE D'IVOIRE": 'CI', 'HONG KONG': 'HK', 'MACAU': 'MO', 'TAIWAN': 'TW', 'CZECH REPUBLIC': 'CZ', 'PALESTINE': 'PS', 'LAOS': 'LA', 'BRUNEI': 'BN', 'SYRIA': 'SY', 'IRAN': 'IR', 'MOLDOVA': 'MD', 'TANZANIA': 'TZ', 'BOLIVIA': 'BO', 'VENEZUELA': 'VE', 'CONGO (REPUBLIC)': 'CG', 'CONGO (DEMOCRATIC REPUBLIC)': 'CD', 'EAST TIMOR': 'TL', 'TIMOR-LESTE': 'TL', 'CABO VERDE': 'CV', 'ESWATINI': 'SZ', 'VATICAN CITY': 'VA', 'KOSOVO': 'XK' };
let REVERSE = null;
const build = () => {
  const map = {};
  try {
    const dn = new Intl.DisplayNames(['en'], { type: 'region' });
    const L = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    for (const a of L) for (const b of L) {
      const code = a + b;
      const name = dn.of(code);
      if (name && name !== code) map[name.toUpperCase()] = code;
    }
  } catch { /* old browser — aliases only */ }
  return { ...map, ...ALIASES };
};
export const countryCode = (name) => {
  const v = String(name || '').trim().toUpperCase();
  if (!v) return '';
  if (/^[A-Z]{2}$/.test(v)) return v;
  if (!REVERSE) REVERSE = build();
  return REVERSE[v] || '';
};
