// src/Pages/modules/operations/utils/chargeWeight.js
// Chargeable weight = the HIGHER of gross weight and volumetric weight.
// Rate rule: fraction 0.50 or more → round UP (ceiling); below 0.50 → round DOWN (floor).
export const VOLUMETRIC_DIVISOR = 5000; // cm³ per kg

export const roundRateWeight = (kg) => {
  const n = Number(kg);
  if (!Number.isFinite(n) || n <= 0) return 0;
  const whole = Math.floor(n);
  const frac = n - whole;
  const rounded = frac >= 0.5 - 1e-9 ? whole + 1 : whole;
  return Math.max(1, rounded);
};

export const volumetricOf = (l, w, h, pieces = 1) => {
  const [L, W, H] = [l, w, h].map(Number);
  if (!(L > 0 && W > 0 && H > 0)) return 0;
  return Number(((L * W * H * (Number(pieces) > 0 ? Number(pieces) : 1)) / VOLUMETRIC_DIVISOR).toFixed(2));
};

// rows: [{ lengthCm, widthCm, heightCm, grossKg, qty }]  (one row per carton / piece group)
export const packingTotals = (rows = []) => {
  const gross = rows.reduce((t, r) => t + (Number(r.grossKg) || 0), 0);
  const volumetric = rows.reduce((t, r) => t + volumetricOf(r.lengthCm, r.widthCm, r.heightCm, 1), 0);
  const g = Number(gross.toFixed(2));
  const v = Number(volumetric.toFixed(2));
  const chargeable = Math.max(g, v);
  return { gross: g, volumetric: v, chargeable: Number(chargeable.toFixed(2)), rateWeight: roundRateWeight(chargeable), basis: v > g ? 'VOLUMETRIC' : 'GROSS' };
};
