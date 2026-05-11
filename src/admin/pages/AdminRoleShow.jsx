import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import Swal from "sweetalert2";
import { accessApi } from "../services/accessApi";
import { useAuth } from "../context/AuthContext";
import PermissionPicker from "../components/PermissionPicker";

export default function AdminRoleShow() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { hasPermission } = useAuth();

  const [role, setRole] = useState(null);
  const [allPermissions, setAllPermissions] = useState([]);
  const [selected, setSelected] = useState(new Set());
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const isProtected = role?.name === "super-admin";
  const canEdit = hasPermission("roles.update") && !isProtected;
  const canAssign = hasPermission("roles.assign-permissions") && !isProtected;

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const [roleRes, permsRes] = await Promise.all([
          accessApi.showRole(id),
          accessApi.listPermissions(),
        ]);
        const r = roleRes.data?.data;
        setRole(r);
        setName(r?.name || "");
        setSelected(new Set((r?.permissions || []).map((p) => p.name)));
        setAllPermissions(permsRes.data?.data || []);
      } catch {
        Swal.fire("Error", "Failed to load role", "error");
        navigate("/admin/roles");
      } finally {
        setLoading(false);
      }
    })();
  }, [id]);

  const saveName = async () => {
    if (!canEdit || name.trim() === role.name) return;
    setSaving(true);
    try {
      await accessApi.updateRole(id, { name: name.trim() });
      Swal.fire({ icon: "success", title: "Name updated", timer: 1200, showConfirmButton: false });
      const r = (await accessApi.showRole(id)).data?.data;
      setRole(r);
    } catch (e) {
      Swal.fire("Error", e.response?.data?.errors?.name?.[0] || e.response?.data?.message || "Failed", "error");
    } finally {
      setSaving(false);
    }
  };

  const savePermissions = async () => {
    if (!canAssign) return;
    setSaving(true);
    try {
      await accessApi.syncRolePermissions(id, Array.from(selected));
      Swal.fire({ icon: "success", title: "Permissions saved", timer: 1200, showConfirmButton: false });
    } catch (e) {
      Swal.fire("Error", e.response?.data?.message || "Failed", "error");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-[40vh] flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-4 border-teal-100 border-t-teal-600" />
      </div>
    );
  }

  if (!role) return null;

  return (
    <div className="px-4 py-5 mx-auto space-y-4">
      <div className="flex items-center gap-3">
        <button onClick={() => navigate("/admin/roles")}
                className="p-2 text-gray-400 hover:bg-gray-100 rounded-xl">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
        </button>
        <div className="flex-1">
          <h1 className="text-lg font-bold text-gray-800 capitalize">{role.name.replace(/-/g, " ")}</h1>
          <p className="text-xs text-gray-400 mt-0.5">
            {(role.permissions || []).length} permissions assigned
            {isProtected && <span className="ml-2 px-2 py-0.5 rounded-full text-[10px] font-bold bg-purple-100 text-purple-700">protected</span>}
          </p>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 space-y-3">
        <h3 className="text-sm font-bold text-gray-800">Role Name</h3>
        <div className="flex gap-2">
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            disabled={!canEdit}
            className="flex-1 px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-teal-400 disabled:bg-gray-50 disabled:text-gray-500"
          />
          {canEdit && (
            <button onClick={saveName} disabled={saving || name.trim() === role.name}
                    className="px-4 py-2.5 text-sm font-semibold text-white bg-teal-600 rounded-xl hover:bg-teal-700 disabled:opacity-50">
              Save Name
            </button>
          )}
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-bold text-gray-800">Permissions</h3>
          {canAssign && (
            <button onClick={savePermissions} disabled={saving}
                    className="px-4 py-2 text-sm font-semibold text-white bg-emerald-600 rounded-xl hover:bg-emerald-700 disabled:opacity-50">
              {saving ? "Saving..." : "Save Permissions"}
            </button>
          )}
        </div>
        <PermissionPicker
          permissions={allPermissions}
          value={selected}
          onChange={setSelected}
          readOnly={!canAssign}
        />
      </div>
    </div>
  );
}
