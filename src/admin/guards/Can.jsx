import { useAuth } from "../context/AuthContext";

/**
 * Wrap any UI element that requires a permission/role to be visible.
 *
 *   <Can permission="students.create">
 *     <button>Add Student</button>
 *   </Can>
 *
 *   <Can permission={["students.update","students.delete"]}>...</Can>   // OR
 *   <Can role="admin">...</Can>
 *   <Can allPermissions={["a","b"]}>...</Can>                           // AND
 *
 * Optional: pass `fallback` to render something when not allowed (e.g. a disabled state).
 */
export default function Can({ permission, role, allPermissions, fallback = null, children }) {
  const { can } = useAuth();
  const allowed = can({ permission, role, allPermissions });
  if (!allowed) return fallback;
  return children;
}
