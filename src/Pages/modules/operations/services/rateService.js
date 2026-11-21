// src/Pages/modules/operations/services/rateService.js
import { sameId } from './serviceUtils';
import { roundRateWeight } from '../utils/chargeWeight';

// Rate = baseCharge + perKg × weight (floor: minCharge). Source: Client's approved onboarding rate card.
export const quoteForClient = (client, mode, country, weightKg) => {
  const none = { found: false, source: 'ONBOARDING_RATE_CARD', baseCharge: 0, perKg: null, amount: null, currency: 'USD', version: null };
  // The weight passed in is the CHARGEABLE weight (higher of gross / volumetric). 0.5+ rounds up, below 0.5 rounds down.
  const rawKg = Number(weightKg);
  const kg = roundRateWeight(rawKg);
  if (!client || !Array.isArray(client.rateCard) || !country || !Number.isFinite(rawKg) || rawKg <= 0) return none;
  const row = client.rateCard.find((r) => r.mode === mode && sameId(r.country, country));
  if (!row) return none;
  const base = Number(row.baseCharge) || 0;
  const per = Number(row.perKg) || 0;
  const min = Number(row.minCharge) || 0;
  const amount = Math.max(min, base + per * kg);
  return { found: true, source: 'ONBOARDING_RATE_CARD', billedKg: kg, rawKg, baseCharge: base, perKg: per, minCharge: min, amount: Number(amount.toFixed(2)), currency: row.currency || 'USD', version: row.version || null };
};

export const formatRateFormula = (row) => {
  const cur = row.currency || 'USD';
  const parts = [];
  if (Number(row.baseCharge) > 0) parts.push(`${cur} ${row.baseCharge}`);
  if (Number(row.perKg) > 0) parts.push(`${row.perKg}/kg`);
  const text = parts.join(' + ') || '—';
  return Number(row.minCharge) > 0 ? `${text} (min ${row.minCharge})` : text;
};

export const applyRateOverride = (rate, { amount, reason }, actor) => {
  const value = Number(amount);
  if (!Number.isFinite(value) || value < 0) throw new Error('Override amount must be a valid number');
  if (typeof reason !== 'string' || !reason.trim()) throw new Error('A reason is required for a manual rate override');
  return { ...rate, override: { amount: value, reason: reason.trim().slice(0, 300), by: actor.name, at: new Date().toISOString() } };
};

export const effectiveAmount = (rate) => (rate?.override ? rate.override.amount : rate?.amount ?? null);