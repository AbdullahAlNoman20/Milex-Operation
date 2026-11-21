// src/Pages/modules/operations/hooks/usePendingTasks.js
import { useState, useEffect, useCallback } from 'react';
import { useOperationsAuth } from './useOperationsAuth';
import { useDataVersion } from './useDataVersion';
import { fetchShipments } from '../services/shipmentService';
import { fetchPendingApprovals } from '../services/approvalService';
import { fetchTasks, fetchTasksForUser, ACTIVE_TASK_STATUSES } from '../services/taskService';
import { fetchChangeRequests, OPEN_REQUEST_STATUSES } from '../services/changeRequestService';
import { filterVisibleShipments } from '../services/accessService';
import { getWaitingForInfo } from '../constants/shipmentStatus';
import { OPERATIONS_ROLES as R } from '../constants/operationsRoles';

const EMPTY = { shipmentTasks: [], approvalTasks: [], courierTasks: [], reviewTasks: [], evidenceTasks: [], requestTasks: [] };

// "What needs MY action right now" — shared by the bell, sidebar badge, dashboards and My Tasks.
export const usePendingTasks = () => {
  const { currentUser } = useOperationsAuth();
  const version = useDataVersion();
  const [data, setData] = useState(EMPTY);
  const [isLoading, setIsLoading] = useState(true);

  const load = useCallback(async () => {
    const role = currentUser?.role;
    if (!role) { setIsLoading(false); return; }
    try {
      const mine = filterVisibleShipments(currentUser, await fetchShipments());
      const next = { ...EMPTY };
      next.shipmentTasks = mine.filter((s) => { const w = getWaitingForInfo(s); return !w.isComplete && w.ownerRole === role; });
      if (role === R.OPERATIONS_HEAD) next.approvalTasks = await fetchPendingApprovals();
      if (role === R.COURIER) next.courierTasks = (await fetchTasksForUser(currentUser.email)).filter((t) => ACTIVE_TASK_STATUSES.includes(t.status));
      if (role === R.DOMESTIC_ADMIN) next.reviewTasks = (await fetchTasks()).filter((t) => t.status === 'COMPLETED' && !t.review);
      if (role === R.KAM) next.requestTasks = (await fetchChangeRequests()).filter((r) => OPEN_REQUEST_STATUSES.includes(r.status) && (!r.assignedKam || r.assignedKam.email?.toLowerCase() === currentUser.email.toLowerCase()));
      if (role === R.OPERATIONS_HEAD) next.requestTasks = (await fetchChangeRequests()).filter((r) => OPEN_REQUEST_STATUSES.includes(r.status));
      setData(next);
    } finally { setIsLoading(false); }
  }, [currentUser]);

  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { load(); }, [load, version]);

  const totalCount = Object.values(data).reduce((n, list) => n + list.length, 0);
  return { ...data, totalCount, isLoading, reload: load };
};