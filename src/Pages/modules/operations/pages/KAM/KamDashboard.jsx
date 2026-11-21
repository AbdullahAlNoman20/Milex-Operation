// src/Pages/modules/operations/pages/KAM/KamDashboard.jsx
import { useEffect, useState } from 'react';
import Loader from '../../../../../Components/Shared/Loader';
import { useOperationsAuth } from '../../hooks/useOperationsAuth';
import { useDataVersion } from '../../hooks/useDataVersion';
import { fetchChangeRequests, OPEN_REQUEST_STATUSES } from '../../services/changeRequestService';
import { DashboardHeader, NotificationsPanel, SummaryGrid, SummaryCard } from '../../components/dashboard/DashboardKit';

const KamDashboard = () => {
  const { currentUser } = useOperationsAuth();
  const version = useDataVersion();
  const [list, setList] = useState(null);
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { fetchChangeRequests().then((all) => setList(all.filter((r) => !r.assignedKam || r.assignedKam.email?.toLowerCase() === currentUser.email.toLowerCase()))); }, [currentUser.email, version]);
  if (!list) return <Loader label="Loading..." />;
  const open = list.filter((r) => OPEN_REQUEST_STATUSES.includes(r.status));
  return (
    <div className="w-full space-y-4">
      <DashboardHeader title={`Welcome back, ${currentUser?.name?.split(' ')[0]}`} subtitle="Client requests, new countries and new rates." />
      <NotificationsPanel />
      <SummaryGrid>
        <SummaryCard label="Waiting for me" value={open.filter((r) => r.status === 'PENDING').length} to="/operations/kam/requests" alert />
        <SummaryCard label="In progress" value={open.filter((r) => r.status === 'IN_PROGRESS').length} to="/operations/kam/requests" />
        <SummaryCard label="New country / rate" value={open.filter((r) => ['NEW_RATE', 'NEW_COUNTRY'].includes(r.type)).length} to="/operations/kam/requests" alert />
        <SummaryCard label="Reminders from Head" value={open.filter((r) => r.reminders?.length && r.kamSeenReminder === false).length} to="/operations/kam/requests" alert />
      </SummaryGrid>
    </div>
  );
};

export default KamDashboard;
