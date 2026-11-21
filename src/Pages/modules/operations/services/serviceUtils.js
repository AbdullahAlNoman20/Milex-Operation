// src/Pages/modules/operations/services/serviceUtils.js
import { SYSTEM_ACTOR } from '../constants/operationsRoles';

export const nowIso = () => new Date().toISOString();

export const sameId = (a, b) =>
  a !== undefined && a !== null && b !== undefined && b !== null &&
  String(a).trim().toLowerCase() === String(b).trim().toLowerCase();

export const sanitizeStr = (v, max = 500) => (typeof v === 'string' ? v.trim().slice(0, max) : '');

// Every service takes the full currentUser (never just a name) so role checks and audit work.
export const toActor = (user, system = false) =>
  system || user?.system
    ? { id: 0, name: 'Principal API', email: 'system@milex.local', role: SYSTEM_ACTOR, system: true }
    : { id: user?.id ?? null, name: user?.name || 'Unknown', email: user?.email || '', role: user?.role || '' };

export const requireRole = (actor, roles, message) => {
  if (!roles.includes(actor.role)) throw new Error(message || 'You are not permitted to perform this action');
};