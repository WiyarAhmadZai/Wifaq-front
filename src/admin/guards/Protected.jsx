import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

/**
 * Route guard:
 *  - If still loading the user, render a small inline spinner placeholder.
 *  - If not authenticated, redirect to /login (preserving where the user wanted to go).
 *  - If authenticated but lacks the required permission/role, redirect to /403.
 *
 * Usage:
 *   <Route element={<Protected permission="roles.view"><AdminRoles /></Protected>} />
 *   <Route element={<Protected role="admin">...</Protected>} />
 *   <Route element={<Protected />}>...</Route>   // just requires login
 */
export default function Protected({ permission, role, allPermissions, children }) {
  const { isAuthenticated, loading, can } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="min-h-[40vh] flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-4 border-teal-100 border-t-teal-600" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  const allowed = can({ permission, role, allPermissions });
  if (!allowed) {
    return <Navigate to="/403" replace state={{ from: location }} />;
  }

  return children;
}
