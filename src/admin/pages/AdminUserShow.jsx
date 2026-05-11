import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import Swal from "sweetalert2";
import { accessApi } from "../services/accessApi";
import { useAuth } from "../context/AuthContext";
import Can from "../guards/Can";
import PermissionPicker from "../components/PermissionPicker";
import UserFormModal from "../components/UserFormModal";

export default function AdminUserShow() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { hasPermission, user: me } = useAuth();
  const canAssign = hasPermission("users.assign-roles");

  const [user, setUser] = useState(null);
  const [roles, setRoles] = useState([]);
  const [allPermissions, setAllPermissions] = useState([]);
  const [selectedRoles, setSelectedRoles] = useState(new Set());
  const [directPermissions, setDirectPermissions] = useState(new Set());
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showEdit, setShowEdit] = useState(false);

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const [u, r, p] = await Promise.all([
          accessApi.showUser(id),
          accessApi.listRoles({ per_page: 100 }),
          accessApi.listPermissions(),
        ]);
        const data = u.data?.data;
        setUser(data);
        setSelectedRoles(new Set(data.roles || []));
        setDirectPermissions(new Set(data.direct_permissions || []));
        setRoles(r.data?.data || []);
        setAllPermissions(p.data?.data || []);
      } catch {
        Swal.fire("Error", "Failed to load user", "error");
        navigate("/admin/users");
      } finally {
        setLoading(false);
      }
    })();
  }, [id]);

  const isEditingSelf = user?.id === me?.id;

  const save = async () => {
    if (!canAssign) return;

    if (isEditingSelf && !Array.from(selectedRoles).includes("super-admin") && (user.roles || []).includes("super-admin")) {
      const r = await Swal.fire({
        title: "Remove super-admin from yourself?",
        text: "You will lose access-control privileges immediately.",
        icon: "warning",
        showCancelButton: true,
        confirmButtonColor: "#dc2626",
        confirmButtonText: "Yes, remove",
      });
      if (!r.isConfirmed) return;
    }

    setSaving(true);
    try {
      const res = await accessApi.syncUserRoles(id, {
        roles: Array.from(selectedRoles),
        direct_permissions: Array.from(directPermissions),
      });
      const data = res.data?.data;
      setUser(data);
      setSelectedRoles(new Set(data.roles || []));
      setDirectPermissions(new Set(data.direct_permissions || []));
      Swal.fire({ icon: "success", title: "Access updated", timer: 1200, showConfirmButton: false });
    } catch (e) {
      Swal.fire("Error", e.response?.data?.message || "Failed", "error");
    } finally {
      setSaving(false);
    }
  };

  const effectivePermissions = useMemo(() => {
    if (!user) return [];
    return user.all_permissions || [];
  }, [user]);

  if (loading) {
    return (
      <div className="min-h-[40vh] flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-4 border-teal-100 border-t-teal-600" />
      </div>
    );
  }

  if (!user) return null;

  return (
    <div className="px-4 py-5 mx-auto space-y-4">
      <div className="flex items-center gap-3">
        <button onClick={() => navigate("/admin/users")}
                className="p-2 text-gray-400 hover:bg-gray-100 rounded-xl">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
        </button>
        <div className="flex-1">
          <h1 className="text-lg font-bold text-gray-800">{user.name}</h1>
          <p className="text-xs text-gray-400 mt-0.5">{user.email} · @{user.username}</p>
        </div>
        <Can permission="users.update">
          <button onClick={() => setShowEdit(true)}
                  className="px-3 py-2.5 text-sm font-medium text-gray-700 bg-white border border-gray-200 rounded-xl hover:bg-gray-50">
            Edit User
          </button>
        </Can>
        {canAssign && (
          <button onClick={save} disabled={saving}
                  className="px-4 py-2.5 text-sm font-semibold text-white bg-emerald-600 rounded-xl hover:bg-emerald-700 disabled:opacity-50">
            {saving ? "Saving..." : "Save Access"}
          </button>
        )}
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 space-y-3">
        <h3 className="text-sm font-bold text-gray-800">Roles</h3>
        <p className="text-[11px] text-gray-500">Assign roles to grant their bundled permissions.</p>
        <div className="flex flex-wrap gap-2">
          {roles.map((r) => {
            const checked = selectedRoles.has(r.name);
            const isSuper = r.name === "super-admin";
            return (
              <label key={r.id}
                     className={`px-3 py-2 rounded-xl border-2 cursor-pointer transition-all flex items-center gap-2 ${
                       checked
                         ? isSuper ? "border-purple-400 bg-purple-50" : "border-teal-400 bg-teal-50"
                         : "border-gray-200 bg-white hover:border-teal-200"
                     } ${!canAssign ? "opacity-60 cursor-not-allowed" : ""}`}>
                <input
                  type="checkbox"
                  checked={checked}
                  onChange={() => {
                    if (!canAssign) return;
                    const next = new Set(selectedRoles);
                    if (checked) next.delete(r.name); else next.add(r.name);
                    setSelectedRoles(next);
                  }}
                  disabled={!canAssign}
                  className="w-4 h-4 text-teal-600 rounded focus:ring-teal-500"
                />
                <span className={`text-xs font-semibold capitalize ${isSuper ? "text-purple-700" : "text-gray-700"}`}>
                  {r.name.replace(/-/g, " ")}
                </span>
              </label>
            );
          })}
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 space-y-4">
        <div>
          <h3 className="text-sm font-bold text-gray-800">Direct Permissions</h3>
          <p className="text-[11px] text-gray-500">
            Grant permissions to this user beyond what their roles already provide.
            Effective permissions = role permissions ∪ direct permissions.
          </p>
        </div>
        <PermissionPicker
          permissions={allPermissions}
          value={directPermissions}
          onChange={setDirectPermissions}
          readOnly={!canAssign}
        />
      </div>

      <div className="bg-gradient-to-br from-teal-600 to-emerald-700 rounded-2xl p-5 text-white">
        <h3 className="text-xs font-bold uppercase tracking-wider text-teal-100 mb-3">
          Effective Permissions ({effectivePermissions.length})
        </h3>
        {effectivePermissions.length === 0 ? (
          <p className="text-xs text-teal-100">No permissions yet — assign a role or grant direct permissions above.</p>
        ) : (
          <div className="flex flex-wrap gap-1.5">
            {effectivePermissions.map((p) => (
              <span key={p} className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-white/15 text-white">
                {p}
              </span>
            ))}
          </div>
        )}
      </div>

      {showEdit && (
        <UserFormModal
          mode="edit"
          user={{ id: user.id, name: user.name, username: user.username, email: user.email }}
          onClose={() => setShowEdit(false)}
          onSaved={(saved) => {
            if (saved) setUser((prev) => ({ ...prev, name: saved.name, username: saved.username, email: saved.email }));
          }}
        />
      )}
    </div>
  );
}
