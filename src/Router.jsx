import { createBrowserRouter, Navigate } from "react-router-dom";
import OperationsRoot from "./Pages/modules/operations/OperationsRoot";
import OperationsLogin from "./Pages/modules/operations/pages/OperationsLogin";
import OperationsProtectedRoute from "./Pages/modules/operations/components/OperationsProtectedRoute";
import OperationsLayout from "./Pages/modules/operations/layout/OperationsLayout";
import OperationsRoutes from "./Pages/modules/operations/OperationsRoutes";
import OperationsDocumentRoutes from "./Pages/modules/operations/OperationsDocumentRoutes";

// Operations-only system: the old Sales module (/app) has been removed.
const Router = createBrowserRouter([
  { path: "/", element: <Navigate to="/operations/login" replace /> },
  { path: "/login", element: <Navigate to="/operations/login" replace /> },
  { path: "/app/*", element: <Navigate to="/operations/login" replace /> },
  {
    path: "/operations",
    element: <OperationsRoot />,
    children: [
      { path: "login", element: <OperationsLogin /> },
      {
        path: "documents",
        element: <OperationsProtectedRoute />,
        children: OperationsDocumentRoutes,
      },
      {
        path: "",
        element: (
          <OperationsProtectedRoute>
            <OperationsLayout />
          </OperationsProtectedRoute>
        ),
        children: OperationsRoutes,
      },
    ],
  },
]);

export default Router;
