import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import Swal from "sweetalert2";
import { accessApi } from "../services/accessApi";
import { useAuth } from "../context/AuthContext";
import Can from "../guards/Can";
import UserFormModal from "../components/UserFormModal";

export default function AdminUsers() {
  const navigate = useNavigate();
  const { user: me, hasPermission } = useAuth();
  const [items, setItems] = useState([]);
  const [meta, setMeta] = useState({ current_page: 1, last_page: 1, per_page: 25, total: 0 });
  const [roles, setRoles] = useState([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [filterRole, setFilterRole] = useState("");
  const [showCreate, setShowCreate] = useState(false);
  const [editTarget, setEditTarget] = useState(null);

  const fetchItems = async (page = 1) => {
    setLoading(true);
    try {
      const res = await accessApi.listUsers({ page, search, role: filterRole });
      setItems(res.data?.data || []);
      if (res.data?.meta) setMeta(res.data.meta);
    } catch {
      setItems([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    accessApi.listRoles({ per_page: 100 }).then((r) => setRoles(r.data?.data || [])).catch(() => {});
  }, []);

  useEffect(() => {
    const t = setTimeout(() => fetchItems(1), 300);
    return () => clearTimeout(t);
  }, [search, filterRole]);

  return (
    <div className="px-4 py-5 space-y-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-lg font-bold text-gray-800">Users & Access</h1>
          <p className="text-xs text-gray-400 mt-0.5">Create users and assign roles or individual permissions.</p>
        </div>
        <Can permission="users.create">
          <button onClick={() => setShowCreate(true)}
                  className="inline-flex items-center gap-2 px-4 py-2.5 bg-teal-600 text-white text-sm font-semibold rounded-xl hover:bg-teal-700">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" />
            </svg>
            New User
          </button>
        </Can>
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 flex gap-2 flex-wrap">
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search name, email, username..."
          className="flex-1 min-w-[220px] px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-teal-400"
        />
        <select value={filterRole} onChange={(e) => setFilterRole(e.target.value)}
                className="px-3 py-2.5 border border-gray-200 rounded-xl text-sm bg-white">
          <option value="">All roles</option>
          {roles.map((r) => <option key={r.id} value={r.name}>{r.name}</option>)}
        </select>
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        {loading ? (
          <div className="text-center py-12">
            <div className="inline-block animate-spin rounded-full h-6 w-6 border-2 border-teal-600 border-t-transparent" />
          </div>
        ) : items.length === 0 ? (
          <div className="text-center py-12 text-sm text-gray-400">No users found</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[700px]">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-100">
                  <th className="px-4 py-3 text-left text-[10px] font-bold uppercase tracking-wider text-gray-500">Name</th>
                  <th className="px-4 py-3 text-left text-[10px] font-bold uppercase tracking-wider text-gray-500">Email</th>
                  <th className="px-4 py-3 text-left text-[10px] font-bold uppercase tracking-wider text-gray-500">Roles</th>
                  <th className="px-4 py-3 text-right text-[10px] font-bold uppercase tracking-wider text-gray-500">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {items.map((u) => (
                  <tr key={u.id} className="hover:bg-gray-50/80 cursor-pointer"
                      onClick={() => navigate(`/admin/users/${u.id}`)}>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-full bg-teal-100 text-teal-700 flex items-center justify-center text-[10px] font-bold">
                          {(u.name || "?").charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <p className="text-xs font-semibold text-gray-800">{u.name}</p>
                          <p className="text-[10px] text-gray-400">@{u.username}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-700">{u.email}</td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap gap-1">
                        {(u.roles || []).map((r) => (
                          <span key={r.id || r.name}
                                className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${(r.name || r) === "super-admin" ? "bg-purple-100 text-purple-700" : "bg-teal-50 text-teal-700"}`}>
                            {r.name || r}
                          </span>
                        ))}
                        {(!u.roles || u.roles.length === 0) && <span className="text-[10px] text-gray-400">—</span>}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-right" onClick={(e) => e.stopPropagation()}>
                      <div className="inline-flex items-center gap-1">
                        <Can permission="users.assign-roles">
                          <button onClick={() => navigate(`/admin/users/${u.id}`)}
                                  className="px-2.5 py-1 text-[10px] font-semibold text-teal-700 bg-teal-50 hover:bg-teal-100 rounded-lg">
                            Manage Access
                          </button>
                        </Can>
                        <Can permission="users.update">
                          <button onClick={() => setEditTarget(u)}
                                  className="px-2.5 py-1 text-[10px] font-semibold text-gray-700 bg-gray-50 hover:bg-gray-100 rounded-lg">
                            Edit
                          </button>
                        </Can>
                        {u.id !== me?.id && (
                          <Can permission="users.delete">
                            <button onClick={async () => {
                              const r = await Swal.fire({
                                title: `Delete user "${u.name}"?`,
                                text: "This cannot be undone.",
                                icon: "warning",
                                showCancelButton: true,
                                confirmButtonColor: "#dc2626",
                                confirmButtonText: "Delete",
                              });
                              if (!r.isConfirmed) return;
                              try {
                                await accessApi.deleteUser(u.id);
                                Swal.fire({ icon: "success", title: "Deleted", timer: 1200, showConfirmButton: false });
                                fetchItems(meta.current_page);
                              } catch (e) {
                                Swal.fire("Error", e.response?.data?.message || "Failed", "error");
                              }
                            }}
                              className="px-2.5 py-1 text-[10px] font-semibold text-red-600 bg-red-50 hover:bg-red-100 rounded-lg">
                              Delete
                            </button>
                          </Can>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {meta.last_page > 1 && (
          <div className="px-4 py-3 bg-gray-50 border-t border-gray-100 flex items-center justify-between">
            <p className="text-xs text-gray-400">
              Showing {(meta.current_page - 1) * meta.per_page + 1}-{Math.min(meta.current_page * meta.per_page, meta.total)} of {meta.total}
            </p>
            <div className="flex gap-1">
              <button onClick={() => fetchItems(meta.current_page - 1)} disabled={meta.current_page <= 1}
                      className="px-3 py-1.5 text-xs border border-gray-200 rounded-lg hover:bg-gray-50 disabled:opacity-40">Previous</button>
              <button onClick={() => fetchItems(meta.current_page + 1)} disabled={meta.current_page >= meta.last_page}
                      className="px-3 py-1.5 text-xs border border-gray-200 rounded-lg hover:bg-gray-50 disabled:opacity-40">Next</button>
            </div>
          </div>
        )}
      </div>

      {showCreate && (
        <UserFormModal
          mode="create"
          roles={roles}
          onClose={() => setShowCreate(false)}
          onSaved={(savedUser) => {
            fetchItems(1);
            if (savedUser?.id && hasPermission("users.assign-roles")) {
              navigate(`/admin/users/${savedUser.id}`);
            }
          }}
        />
      )}

      {editTarget && (
        <UserFormModal
          mode="edit"
          user={editTarget}
          onClose={() => setEditTarget(null)}
          onSaved={() => fetchItems(meta.current_page)}
        />
      )}
    </div>
  );
}
