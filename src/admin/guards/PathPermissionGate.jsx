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
  const { user, loading, error, reload, hasPermission, isSuperAdmin } = useAuth();

  // While loading OR while a token exists in localStorage but the user payload
  // hasn't arrived yet, render a spinner instead of redirecting. This prevents
  // a ping-pong loop with /login (which redirects back to / when token is set).
  const hasToken = Boolean(localStorage.getItem("token"));

  /* A held token whose /access/me call FAILED is not a loading state.
   *
   * It used to fall into the spinner below and stay there forever, so a
   * database or network hiccup looked exactly like "the system is broken and
   * says nothing". A 401 is different — the axios interceptor is already
   * sending those to /login — so only non-401 failures land here, and they get
   * a cause and a retry instead of an endless spinner. */
  if (!loading && hasToken && !user && error && error?.response?.status !== 401) {
    const status = error?.response?.status;
    const reason = !error?.response
      ? "The server is not responding. Check that the Laravel API is running."
      : status >= 500
        ? "The server hit an error while signing you in. It is often the database being unreachable."
        : `The server refused the request (HTTP ${status}).`;

    return (
      <div className="min-h-[60vh] flex items-center justify-center p-6">
        <div className="max-w-sm text-center">
          <div className="text-3xl mb-3">⚠️</div>
          <p className="text-sm font-bold text-gray-800">Cannot load your account</p>
          <p className="text-xs text-gray-500 mt-1.5 leading-relaxed">{reason}</p>
          <div className="flex gap-2 justify-center mt-4">
            <button onClick={() => reload()}
              className="px-4 py-2 rounded-xl text-xs font-bold text-white"
              style={{ background: "#0D5C63" }}>
              Try again
            </button>
            <button onClick={() => window.location.reload()}
              className="px-4 py-2 rounded-xl text-xs font-bold border bg-white text-gray-600"
              style={{ borderColor: "#D0E0E0" }}>
              Reload page
            </button>
          </div>
        </div>
      </div>
    );
  }

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
