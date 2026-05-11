import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { accessApi } from "../services/accessApi";
import { hasPermission, hasRole, can, isSuperAdmin } from "../utils/permissions";

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
  }, [loadMe]);

  const logout = useCallback(() => {
    localStorage.removeItem("token");
    setUser(null);
    window.location.href = "/login";
  }, []);

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
