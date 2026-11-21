import { Navigate } from 'react-router-dom';
import OperationsRoleRoute from './components/OperationsRoleRoute';
import OperationsUnauthorized from './components/OperationsUnauthorized';
import { OPERATIONS_ROLES as R } from './constants/operationsRoles';

import OperationsIndex from './pages/OperationsIndex';
import MyProfile from './pages/Client/MyProfile';
import ClientRequests from './pages/Client/ClientRequests';
import ChangeRequests from './pages/OperationsHead/ChangeRequests';

import ShipmentList from './pages/Shared/ShipmentList';
import ShipmentWorkspace from './pages/Shared/ShipmentWorkspace';
import TrackShipment from './pages/Shared/TrackShipment';
import NotificationsPage from './pages/Shared/NotificationsPage';
import MyTasksPage from './pages/Shared/MyTasksPage';
import ManifestRegister from './pages/Shared/ManifestRegister';
import ProfilePage from './pages/Shared/ProfilePage';

import ClientDashboard from './pages/Client/ClientDashboard';
import ShipmentRequest from './pages/Client/ShipmentRequest';
import DocumentsUpload from './pages/Client/DocumentsUpload';

import OperationsHeadDashboard from './pages/OperationsHead/OperationsHeadDashboard';
import ApprovalQueue from './pages/OperationsHead/ApprovalQueue';
import CustomerProfileManagement from './pages/OperationsHead/CustomerProfileManagement';
import StatusUpdateLog from './pages/OperationsHead/StatusUpdateLog';
import PerformancePage from './pages/OperationsHead/PerformancePage';

import DomesticAdminDashboard from './pages/DomesticAdmin/DomesticAdminDashboard';
import ManifestBuilder from './pages/DomesticAdmin/ManifestBuilder';

import ForeignAdminDashboard from './pages/ForeignAdmin/ForeignAdminDashboard';
import CourierDashboard from './pages/Courier/CourierDashboard';
import CourierTaskPage from './pages/Courier/CourierTaskPage';
import CnfDashboard from './pages/CNF/CnfDashboard';
import KamDashboard from './pages/KAM/KamDashboard';

const guard = (roles, el) => <OperationsRoleRoute allowedRoles={roles}>{el}</OperationsRoleRoute>;
const C = [R.CLIENT], H = [R.OPERATIONS_HEAD], D = [R.DOMESTIC_ADMIN], F = [R.FOREIGN_ADMIN], K = [R.COURIER], N = [R.CNF], KM = [R.KAM];

const OperationsRoutes = [
  { index: true, element: <OperationsIndex /> },

  { path: 'client', element: guard(C, <ClientDashboard />) },
  { path: 'client/new-export', element: guard(C, <ShipmentRequest mode="EXPORT" />) },
  { path: 'client/new-import', element: guard(C, <ShipmentRequest mode="IMPORT" />) },
  { path: 'client/shipments', element: guard(C, <ShipmentList />) },
  { path: 'client/shipments/:shipmentId', element: guard(C, <ShipmentWorkspace />) },
  { path: 'client/tracking', element: guard(C, <TrackShipment />) },
  { path: 'client/documents', element: guard(C, <DocumentsUpload />) },
  { path: 'client/manifests', element: guard(C, <ManifestRegister />) },
  { path: 'client/notifications', element: guard(C, <NotificationsPage />) },
  { path: 'client/profile', element: guard(C, <MyProfile />) },
  { path: 'client/requests', element: guard(C, <ClientRequests />) },

  { path: 'head', element: guard(H, <OperationsHeadDashboard />) },
  { path: 'head/approvals', element: guard(H, <ApprovalQueue />) },
  { path: 'head/shipments', element: guard(H, <ShipmentList />) },
  { path: 'head/shipments/:shipmentId', element: guard(H, <ShipmentWorkspace />) },
  { path: 'head/tracking', element: guard(H, <TrackShipment />) },
  { path: 'head/manifests', element: guard(H, <ManifestRegister />) },
  { path: 'head/customers', element: guard(H, <CustomerProfileManagement />) },
  { path: 'head/requests', element: guard(H, <ChangeRequests />) },
    { path: 'head/status-log', element: guard(H, <StatusUpdateLog />) },
  { path: 'head/performance', element: guard(H, <PerformancePage />) },
  { path: 'head/tasks', element: guard(H, <MyTasksPage />) },
  { path: 'head/notifications', element: guard(H, <NotificationsPage />) },
  { path: 'head/profile', element: guard(H, <ProfilePage />) },

  { path: 'domestic', element: guard(D, <DomesticAdminDashboard />) },
  { path: 'domestic/new-export', element: guard(D, <ShipmentRequest mode="EXPORT" />) },
  { path: 'domestic/new-import', element: guard(D, <ShipmentRequest mode="IMPORT" />) },
  { path: 'domestic/shipments', element: guard(D, <ShipmentList />) },
  { path: 'domestic/shipments/:shipmentId', element: guard(D, <ShipmentWorkspace />) },
  { path: 'domestic/manifests', element: guard(D, <ManifestRegister />) },
  { path: 'domestic/manifests/new', element: guard(D, <ManifestBuilder />) },
  { path: 'foreign/manifests', element: guard(F, <ManifestRegister />) },
  { path: 'foreign/manifests/new', element: guard(F, <ManifestBuilder />) },
  { path: 'domestic/tracking', element: guard(D, <TrackShipment />) },
  { path: 'domestic/tasks', element: guard(D, <MyTasksPage />) },
  { path: 'domestic/notifications', element: guard(D, <NotificationsPage />) },
  { path: 'domestic/profile', element: guard(D, <ProfilePage />) },

  { path: 'foreign', element: guard(F, <ForeignAdminDashboard />) },
  { path: 'foreign/shipments', element: guard(F, <ShipmentList />) },
  { path: 'foreign/tracking', element: guard(F, <TrackShipment />) },
  { path: 'foreign/shipments/:shipmentId', element: guard(F, <ShipmentWorkspace />) },
  { path: 'foreign/tasks', element: guard(F, <MyTasksPage />) },
  { path: 'foreign/notifications', element: guard(F, <NotificationsPage />) },
  { path: 'foreign/profile', element: guard(F, <ProfilePage />) },

  { path: 'courier', element: guard(K, <CourierDashboard />) },
  { path: 'courier/tasks/:taskId', element: guard(K, <CourierTaskPage />) },
  { path: 'courier/shipments/:shipmentId', element: guard(K, <Navigate to="/operations/courier" replace />) },
  { path: 'courier/notifications', element: guard(K, <NotificationsPage />) },
  { path: 'courier/profile', element: guard(K, <ProfilePage />) },

  { path: 'cnf', element: guard(N, <CnfDashboard />) },
  { path: 'cnf/shipments', element: guard(N, <ShipmentList />) },
  { path: 'cnf/shipments/:shipmentId', element: guard(N, <ShipmentWorkspace />) },
  { path: 'cnf/manifests', element: guard(N, <ManifestRegister />) },
  { path: 'cnf/tracking', element: guard(N, <TrackShipment />) },
  { path: 'cnf/notifications', element: guard(N, <NotificationsPage />) },
  { path: 'cnf/profile', element: guard(N, <ProfilePage />) },

  { path: 'kam', element: guard(KM, <KamDashboard />) },
  { path: 'kam/requests', element: guard(KM, <ChangeRequests />) },
  { path: 'kam/notifications', element: guard(KM, <NotificationsPage />) },
  { path: 'kam/profile', element: guard(KM, <ProfilePage />) },

  { path: 'unauthorized', element: <OperationsUnauthorized /> },
];

export default OperationsRoutes;