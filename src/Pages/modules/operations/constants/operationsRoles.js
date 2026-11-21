// src/Pages/modules/operations/constants/operationsRoles.js
export const OPERATIONS_ROLES = Object.freeze({
  CLIENT: 'CLIENT',
  OPERATIONS_HEAD: 'OPERATIONS_HEAD',
  DOMESTIC_ADMIN: 'DOMESTIC_ADMIN', // = Operations Supervisor (Bangladesh)
  FOREIGN_ADMIN: 'FOREIGN_ADMIN', // = Foreign Operations Supervisor
  COURIER: 'COURIER',
  CNF: 'CNF',
  KAM: 'KAM', // Key Account Manager — owns client requests, new countries and new rates
});

// Not a login role — used as the owner of steps driven by the Principal tracking API.
export const SYSTEM_ACTOR = 'SYSTEM';

export const OPERATIONS_ROLE_LABELS = Object.freeze({
  [OPERATIONS_ROLES.CLIENT]: 'Client',
  [OPERATIONS_ROLES.OPERATIONS_HEAD]: 'Operations Head',
  [OPERATIONS_ROLES.DOMESTIC_ADMIN]: 'Operations Supervisor (Bangladesh)',
  [OPERATIONS_ROLES.FOREIGN_ADMIN]: 'Foreign Operations Supervisor',
  [OPERATIONS_ROLES.COURIER]: 'Courier Man',
  [OPERATIONS_ROLES.CNF]: 'C&F / Authorised Partner',
  [OPERATIONS_ROLES.KAM]: 'Key Account Manager (KAM)',
  [SYSTEM_ACTOR]: 'Principal Tracking API',
});

export const ROLE_HOME = Object.freeze({
  [OPERATIONS_ROLES.CLIENT]: '/operations/client',
  [OPERATIONS_ROLES.OPERATIONS_HEAD]: '/operations/head',
  [OPERATIONS_ROLES.DOMESTIC_ADMIN]: '/operations/domestic',
  [OPERATIONS_ROLES.FOREIGN_ADMIN]: '/operations/foreign',
  [OPERATIONS_ROLES.COURIER]: '/operations/courier',
  [OPERATIONS_ROLES.CNF]: '/operations/cnf',
  [OPERATIONS_ROLES.KAM]: '/operations/kam',
});

export const ALL_OPERATIONS_ROLES = Object.values(OPERATIONS_ROLES);