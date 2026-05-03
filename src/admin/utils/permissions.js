/**
 * Pure permission helpers — work on a normalized auth user object:
 *   { roles: string[], permissions: string[], is_super_admin: boolean }
 *
 * Use these via the AuthContext hook (useAuth()), e.g.:
 *   const { hasPermission, hasRole, can } = useAuth();
 *   hasPermission('students.view')      -> boolean
 *   hasRole('admin')                    -> boolean
 *   can(['students.view', 'students.update'])  -> any of (OR)
 */

export const isSuperAdmin = (user) =>
  Boolean(user?.is_super_admin) || (user?.roles || []).includes("super-admin");

export const hasRole = (user, role) => {
  if (!user) return false;
  if (isSuperAdmin(user)) return true;
  if (Array.isArray(role)) return role.some((r) => (user.roles || []).includes(r));
  return (user.roles || []).includes(role);
};

export const hasPermission = (user, permission) => {
  if (!user) return false;
  if (isSuperAdmin(user)) return true;
  if (Array.isArray(permission)) return permission.some((p) => (user.permissions || []).includes(p));
  return (user.permissions || []).includes(permission);
};

export const hasAllPermissions = (user, permissions) => {
  if (!user) return false;
  if (isSuperAdmin(user)) return true;
  return (permissions || []).every((p) => (user.permissions || []).includes(p));
};

/**
 * Convenience: pass a string OR array of permissions, OR an object describing both.
 *   can(user, 'students.view')
 *   can(user, ['students.view','students.update'])           // OR
 *   can(user, { permission: 'students.view' })
 *   can(user, { role: 'admin' })
 *   can(user, { allPermissions: ['students.view','students.update'] })
 */
export const can = (user, check) => {
  if (!check) return true;
  if (typeof check === "string" || Array.isArray(check)) return hasPermission(user, check);
  if (check.role) return hasRole(user, check.role);
  if (check.allPermissions) return hasAllPermissions(user, check.allPermissions);
  if (check.permission) return hasPermission(user, check.permission);
  return false;
};
