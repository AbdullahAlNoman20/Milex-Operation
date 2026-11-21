// src/Pages/modules/operations/services/userDirectoryService.js
import { operationsFetchUsers } from './operationsAuthService';

export const fetchUsersByRole = async (role) => (await operationsFetchUsers()).filter((u) => u.role === role);
export const fetchUserByEmail = async (email) =>
  (await operationsFetchUsers()).find((u) => u.email?.toLowerCase() === String(email || '').trim().toLowerCase()) || null;