import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { permissionForPath } from "../utils/pathPermissions";

/**
 * Single guard inside the authenticated layout. Reads the current pathname,
 * looks up the required permission, and either renders children or sends to /403.
 *
 * - public path     → render
 * - protected path  → render iff hasPermission(...)
 * - untagged path   → render iff super-admin (defense in depth)
 *
 * Loading state defers to AuthContext (which already shows a spinner via <Protected>),
 * but here we still account for it: if the user isn't loaded yet, render a tiny spinner.
 */
export default function PathPermissionGate({ children }) {
  const location = useLocation();
  const { user, loading, hasPermission, isSuperAdmin } = useAuth();

  // While loading OR while a token exists in localStorage but the user payload
  // hasn't arrived yet, render a spinner instead of redirecting. This prevents
  // a ping-pong loop with /login (which redirects back to / when token is set).
  const hasToken = Boolean(localStorage.getItem("token"));
  if (loading || (hasToken && !user)) {
    // Identical markup/size/position to App PageLoader & Layout PageFallback
    // so the auth → chunk → data phases overlay in the SAME spot — the user
    // sees one steady spinner instead of it jumping down 2–3 times.
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="animate-spin rounded-full h-10 w-10 border-4 border-teal-100 border-t-teal-600" />
          <span className="text-gray-400 text-xs">Loading...</span>
        </div>
      </div>
    );
  }
  if (!user) return <Navigate to="/login" replace state={{ from: location }} />;

  const rule = permissionForPath(location.pathname);

  if (rule.type === "public") return children;
  if (rule.type === "protected") {
    // OR semantics: user needs ANY of the candidate permissions.
    const allowed = (rule.permissions || [rule.permission])
      .some((p) => hasPermission(p));
    return allowed
      ? children
      : <Navigate to="/403" replace state={{ from: location }} />;
  }
  // untagged
  return isSuperAdmin
    ? children
    : <Navigate to="/403" replace state={{ from: location }} />;
}
