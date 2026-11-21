// src/Pages/modules/operations/utils/printFormat.js
export const fmtDate = (v) => {
  if (!v) return '—';
  const d = new Date(v);
  return Number.isNaN(d.getTime()) ? '—' : d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
};
export const fmtDateTime = (v) => {
  if (!v) return '—';
  const d = new Date(v);
  return Number.isNaN(d.getTime()) ? '—' : d.toLocaleString('en-GB', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
};
export const money = (n, cur = '') => `${cur ? `${cur} ` : ''}${(Number(n) || 0).toFixed(2)}`;
export const cityLine = (p = {}) => [p.city, p.postCode, p.country].filter(Boolean).join(', ');
export const isImageFile = (f) => typeof f?.dataUrl === 'string' && f.dataUrl.startsWith('data:image/');