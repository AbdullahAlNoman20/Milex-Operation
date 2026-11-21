// src/Pages/modules/operations/utils/clientDefaults.js
// Everything we can pre-fill from the Client's Sales-approved profile. Rates are NOT changed here — text stays verbatim.
export const clientDefaults = (c, docNumbers = {}) => {
  if (!c) return null;
  const p = c.profile || {};
  const r = c.recommendation || {};
  const key = (c.contacts || []).find((x) => x.type === 'Key Contact Person') || {};
  const countries = [...new Set([...(c.rateCard || []).map((x) => x.country), ...(c.projected || []).map((x) => x.country)])].filter(Boolean);
  return {
    ownParty: {
      companyName: c.accountName || '', contactPerson: key.name || c.contactPerson || '', contactPhone: c.mobile || key.mobile || '',
      contactEmail: c.email || key.email || '', address: c.address || '', city: c.area || 'Dhaka', postCode: '', country: 'Bangladesh',
    },
    taxIds: { bin: p.binNumber || '', etin: p.tinNumber || '', ...docNumbers },
    carrier: p.preferredCarrier || '',
    countries,
    approvedRateText: r.approvedRateText || '',
    rateRefNo: r.rateRefNo || '',
  };
};