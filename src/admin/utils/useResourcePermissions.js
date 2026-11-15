import { useAuth } from "../context/AuthContext";

/**
 * Convenience hook for show / detail pages to gate Edit / Delete / Status buttons.
 *
 *   const { canUpdate, canDelete } = useResourcePermissions("academic-terms");
 *   {canUpdate && <button>Edit</button>}
 *   {canDelete && <button>Delete</button>}
 *
 * Each action checks `{base}.{action}` OR `{base}.manage` (catch-all).
 *
 * `can(action)` is the generic form: pass any action suffix a button owns
 * (e.g. can("transfer"), can("status")) and it applies the same
 * `{base}.{action}` OR `{base}.manage` rule. This is the reusable pattern for
 * pages whose action buttons each carry their own permission.
 */
export function useResourcePermissions(base) {
  const { hasPermission } = useAuth();
  const has = (action) =>
    !!base && (hasPermission(`${base}.${action}`) || hasPermission(`${base}.manage`));
  return {
    can: has,
    canView: has("view"),
    canCreate: has("create"),
    canUpdate: has("update"),
    canDelete: has("delete"),
    canApprove: has("approve"),
    canManage: has("manage"),
  };
}
