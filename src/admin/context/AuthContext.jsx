import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { accessApi } from "../services/accessApi";
import { hasPermission, hasRole, can, isSuperAdmin } from "../utils/permissions";
import { useIdleLogout } from "../../hooks/useIdleLogout";
import { clearApiCache } from "../../api/axios";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const loadMe = useCallback(async () => {
    const token = localStorage.getItem("token");
    if (!token) {
      setUser(null);
      setLoading(false);
      return;
    }
    try {
      const res = await accessApi.me();
      setUser(res.data?.data || null);
      setError(null);
    } catch (e) {
      // 401 is handled by axios interceptor (kicks to /login). Other errors stay null.
      setUser(null);
      setError(e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadMe();

    // Permissions can change mid-session (an admin grants/revokes a role).
    // Re-fetch /access/me on every tab focus and once every 2 minutes so the
    // logged-in user picks up new permissions without having to log out and
    // back in. Also re-fetch on demand via the `wen:auth-refresh` event so
    // the admin permissions modal can trigger an immediate refresh when the
    // current user just edited their own access.
    const onVisible = () => { if (!document.hidden) loadMe(); };
    const onFocus = () => loadMe();
    const onCustom = () => loadMe();
    document.addEventListener("visibilitychange", onVisible);
    window.addEventListener("focus", onFocus);
    window.addEventListener("wen:auth-refresh", onCustom);
    // Background safety-net poll. Kept infrequent (2 min) because the focus/
    // visibilitychange listeners above already refresh the moment the user
    // returns to the tab, and `wen:auth-refresh` fires an instant refresh when
    // the user edits their own access. A short interval here hammered the
    // single-threaded dev server (every hit reloads permissions from the DB)
    // and caused request timeouts.
    const interval = setInterval(loadMe, 120 * 1000);

    return () => {
      document.removeEventListener("visibilitychange", onVisible);
      window.removeEventListener("focus", onFocus);
      window.removeEventListener("wen:auth-refresh", onCustom);
      clearInterval(interval);
    };
  }, [loadMe]);

  const logout = useCallback(() => {
    localStorage.removeItem("token");
    // Purge cached API data so the next user on this browser starts clean.
    clearApiCache();
    // Reset the once-per-session "you have unread popups" flag so the next
    // login shows the floating notification cards again.
    sessionStorage.removeItem("wen:notif-popups-seen");
    setUser(null);
    window.location.href = "/login";
  }, []);

  // Inactivity auto-logout. Configurable from /settings; 0 disables it.
  // Only runs once we have an authenticated user — the hook itself becomes
  // a no-op on the login page.
  useIdleLogout({ enabled: Boolean(user), onLogout: logout });

  const value = useMemo(
    () => ({
      user,
      loading,
      error,
      isAuthenticated: Boolean(user),
      isSuperAdmin: isSuperAdmin(user),
      roles: user?.roles || [],
      permissions: user?.permissions || [],
      hasRole: (role) => hasRole(user, role),
      hasPermission: (permission) => hasPermission(user, permission),
      can: (check) => can(user, check),
      reload: loadMe,
      logout,
      setUser,
    }),
    [user, loading, error, loadMe, logout]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within an <AuthProvider>");
  return ctx;
}
