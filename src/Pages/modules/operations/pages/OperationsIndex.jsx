// src/Pages/modules/operations/pages/OperationsIndex.jsx
import { Navigate } from 'react-router-dom';
import { useOperationsAuth } from '../hooks/useOperationsAuth';
import { ROLE_HOME } from '../constants/operationsRoles';
import Loader from '../../../../Components/Shared/Loader';

const OperationsIndex = () => {
  const { currentUser, isInitializing } = useOperationsAuth();
  if (isInitializing) return <Loader fullScreen label="Loading dashboard..." />;
  return <Navigate to={ROLE_HOME[currentUser?.role] || '/operations/unauthorized'} replace />;
};

export default OperationsIndex;