import { useAuth } from "../context/AuthContext";

/**
 * Convenience hook for show / detail pages to gate Edit / Delete / Status buttons.
 *
 *   const { canUpdate, canDelete } = useResourcePermissions("academic-terms");
 *   {canUpdate && <button>Edit</button>}
 *   {canDelete && <button>Delete</button>}
 *
 * Each action checks `{base}.{action}` OR `{base}.manage` (catch-all).
 */
export function useResourcePermissions(base) {
  const { hasPermission } = useAuth();
  const has = (action) =>
    !!base && (hasPermission(`${base}.${action}`) || hasPermission(`${base}.manage`));
  return {
    canView: has("view"),
    canCreate: has("create"),
    canUpdate: has("update"),
    canDelete: has("delete"),
    canApprove: has("approve"),
    canManage: has("manage"),
  };
}
