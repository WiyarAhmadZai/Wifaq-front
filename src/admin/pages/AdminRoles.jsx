import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import Swal from "sweetalert2";
import { accessApi } from "../services/accessApi";
import { useAuth } from "../context/AuthContext";
import Can from "../guards/Can";

export default function AdminRoles() {
  const navigate = useNavigate();
  const { hasPermission } = useAuth();
  const [items, setItems] = useState([]);
  const [meta, setMeta] = useState({ current_page: 1, last_page: 1, per_page: 25, total: 0 });
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [showCreate, setShowCreate] = useState(false);
  const [newName, setNewName] = useState("");
  const [saving, setSaving] = useState(false);

  const fetchItems = async (page = 1) => {
    setLoading(true);
    try {
      const res = await accessApi.listRoles({ page, search });
      setItems(res.data?.data || []);
      if (res.data?.meta) setMeta(res.data.meta);
    } catch {
      setItems([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const t = setTimeout(() => fetchItems(1), 300);
    return () => clearTimeout(t);
  }, [search]);

  const handleCreate = async () => {
    if (!newName.trim()) return;
    setSaving(true);
    try {
      const res = await accessApi.createRole({ name: newName.trim(), permissions: [] });
      const id = res.data?.data?.id;
      Swal.fire({ icon: "success", title: "Role created", timer: 1500, showConfirmButton: false });
      setShowCreate(false);
      setNewName("");
      if (id) navigate(`/admin/roles/${id}`);
      else fetchItems(meta.current_page);
    } catch (e) {
      const msg = e.response?.data?.errors?.name?.[0] || e.response?.data?.message || "Failed to create";
      Swal.fire("Error", msg, "error");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (e, role) => {
    e.stopPropagation();
    const r = await Swal.fire({
      title: `Delete role "${role.name}"?`,
      text: "This cannot be undone. Roles assigned to users cannot be deleted.",
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#dc2626",
      confirmButtonText: "Delete",
    });
    if (!r.isConfirmed) return;
    try {
      await accessApi.deleteRole(role.id);
      Swal.fire({ icon: "success", title: "Deleted", timer: 1200, showConfirmButton: false });
      fetchItems(meta.current_page);
    } catch (err) {
      Swal.fire("Error", err.response?.data?.message || "Failed to delete", "error");
    }
  };

  return (
    <div className="px-4 py-5 space-y-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-lg font-bold text-gray-800">Roles</h1>
          <p className="text-xs text-gray-400 mt-0.5">Define access bundles. Assign permissions to roles, then assign roles to users.</p>
        </div>
        <Can permission="roles.create">
          <button
            onClick={() => setShowCreate(true)}
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-teal-600 text-white text-sm font-semibold rounded-xl hover:bg-teal-700"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" /></svg>
            New Role
          </button>
        </Can>
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search roles..."
          className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-teal-400"
        />
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        {loading ? (
          <div className="text-center py-12">
            <div className="inline-block animate-spin rounded-full h-6 w-6 border-2 border-teal-600 border-t-transparent" />
          </div>
        ) : items.length === 0 ? (
          <div className="text-center py-12 text-sm text-gray-400">No roles found</div>
        ) : (
          <table className="w-full">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-100">
                <th className="px-4 py-3 text-left text-[10px] font-bold uppercase tracking-wider text-gray-500">Name</th>
                <th className="px-4 py-3 text-center text-[10px] font-bold uppercase tracking-wider text-gray-500">Permissions</th>
                <th className="px-4 py-3 text-right text-[10px] font-bold uppercase tracking-wider text-gray-500">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {items.map((r) => {
                const isSuper = r.name === "super-admin";
                return (
                  <tr key={r.id} className="hover:bg-gray-50/80 cursor-pointer"
                      onClick={() => hasPermission("roles.view") && navigate(`/admin/roles/${r.id}`)}>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-semibold text-gray-800 capitalize">{r.name.replace(/-/g, " ")}</span>
                        {isSuper && (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-purple-100 text-purple-700">protected</span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className="inline-flex items-center px-2.5 py-1 rounded-full text-[10px] font-semibold bg-teal-50 text-teal-700">
                        {r.permissions_count ?? 0} permissions
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right" onClick={(e) => e.stopPropagation()}>
                      <div className="inline-flex items-center gap-1">
                        <Can permission="roles.view">
                          <Link to={`/admin/roles/${r.id}`}
                                className="px-2.5 py-1 text-[10px] font-semibold text-teal-700 bg-teal-50 hover:bg-teal-100 rounded-lg">
                            Manage
                          </Link>
                        </Can>
                        {!isSuper && (
                          <Can permission="roles.delete">
                            <button onClick={(e) => handleDelete(e, r)}
                                    className="px-2.5 py-1 text-[10px] font-semibold text-red-600 bg-red-50 hover:bg-red-100 rounded-lg">
                              Delete
                            </button>
                          </Can>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {showCreate && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden">
            <div className="px-5 py-4 bg-teal-50 border-b border-teal-100">
              <h3 className="text-sm font-bold text-gray-800">Create Role</h3>
              <p className="text-[10px] text-gray-500 mt-0.5">Pick a short kebab-case name (e.g. "department-head")</p>
            </div>
            <div className="p-5 space-y-3">
              <input
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="role-name"
                className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-teal-400"
                autoFocus
              />
            </div>
            <div className="px-5 py-4 bg-gray-50 flex justify-end gap-2 border-t border-gray-100">
              <button onClick={() => { setShowCreate(false); setNewName(""); }}
                      className="px-4 py-2 text-xs font-medium text-gray-600 bg-white border border-gray-200 rounded-xl hover:bg-gray-50">
                Cancel
              </button>
              <button onClick={handleCreate} disabled={!newName.trim() || saving}
                      className="px-4 py-2 text-xs font-semibold text-white bg-teal-600 rounded-xl hover:bg-teal-700 disabled:opacity-50">
                {saving ? "Creating..." : "Create & Configure"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
