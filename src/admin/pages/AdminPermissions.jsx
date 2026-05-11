import { useEffect, useMemo, useState } from "react";
import Swal from "sweetalert2";
import { accessApi } from "../services/accessApi";
import { useAuth } from "../context/AuthContext";
import Can from "../guards/Can";

export default function AdminPermissions() {
  const { hasPermission } = useAuth();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [showCreate, setShowCreate] = useState(false);
  const [newName, setNewName] = useState("");
  const [saving, setSaving] = useState(false);

  const fetchItems = async () => {
    setLoading(true);
    try {
      const res = await accessApi.listPermissions({ search });
      setItems(res.data?.data || []);
    } catch {
      setItems([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const t = setTimeout(fetchItems, 300);
    return () => clearTimeout(t);
  }, [search]);

  const grouped = useMemo(() => {
    const g = {};
    items.forEach((p) => {
      const [m] = p.name.split(".", 2);
      if (!g[m]) g[m] = [];
      g[m].push(p);
    });
    return Object.entries(g)
      .map(([module, list]) => ({ module, list: list.sort((a, b) => a.name.localeCompare(b.name)) }))
      .sort((a, b) => a.module.localeCompare(b.module));
  }, [items]);

  const handleCreate = async () => {
    const name = newName.trim();
    if (!name) return;
    setSaving(true);
    try {
      await accessApi.createPermission({ name });
      Swal.fire({ icon: "success", title: "Permission created", timer: 1200, showConfirmButton: false });
      setShowCreate(false);
      setNewName("");
      fetchItems();
    } catch (e) {
      Swal.fire("Error", e.response?.data?.errors?.name?.[0] || e.response?.data?.message || "Failed", "error");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (perm) => {
    const r = await Swal.fire({
      title: `Delete "${perm.name}"?`,
      text: "This will fail if any role or user has it. Detach it first.",
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#dc2626",
      confirmButtonText: "Delete",
    });
    if (!r.isConfirmed) return;
    try {
      await accessApi.deletePermission(perm.id);
      Swal.fire({ icon: "success", title: "Deleted", timer: 1000, showConfirmButton: false });
      fetchItems();
    } catch (e) {
      Swal.fire("Error", e.response?.data?.message || "Failed", "error");
    }
  };

  return (
    <div className="px-4 py-5 space-y-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-lg font-bold text-gray-800">Permissions</h1>
          <p className="text-xs text-gray-400 mt-0.5">
            The permission catalog. Naming convention: <code>module.action</code> (e.g. <code>students.view</code>).
          </p>
        </div>
        <Can permission="permissions.create">
          <button onClick={() => setShowCreate(true)}
                  className="inline-flex items-center gap-2 px-4 py-2.5 bg-teal-600 text-white text-sm font-semibold rounded-xl hover:bg-teal-700">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" /></svg>
            New Permission
          </button>
        </Can>
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search permissions (e.g. 'students.', '.view')..."
          className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-teal-400"
        />
      </div>

      {loading ? (
        <div className="text-center py-12">
          <div className="inline-block animate-spin rounded-full h-6 w-6 border-2 border-teal-600 border-t-transparent" />
        </div>
      ) : grouped.length === 0 ? (
        <div className="bg-white rounded-2xl border border-gray-100 p-12 text-center text-sm text-gray-400">No permissions</div>
      ) : (
        <div className="space-y-3">
          {grouped.map(({ module, list }) => (
            <div key={module} className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
              <div className="px-4 py-3 bg-gray-50 border-b border-gray-100 flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-gray-700">{module}</span>
                <span className="text-[10px] text-gray-400">{list.length} permissions</span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-px bg-gray-50">
                {list.map((p) => (
                  <div key={p.id} className="bg-white px-4 py-2.5 flex items-center justify-between gap-2">
                    <span className="text-xs font-mono text-gray-700 break-all">{p.name}</span>
                    {hasPermission("permissions.delete") && (
                      <button onClick={() => handleDelete(p)}
                              className="opacity-50 hover:opacity-100 p-1 text-red-500 hover:bg-red-50 rounded transition-opacity">
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6M4 7h16" />
                        </svg>
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {showCreate && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden">
            <div className="px-5 py-4 bg-teal-50 border-b border-teal-100">
              <h3 className="text-sm font-bold text-gray-800">Create Permission</h3>
              <p className="text-[10px] text-gray-500 mt-0.5">Use the format <code>module.action</code></p>
            </div>
            <div className="p-5">
              <input
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="e.g. students.export"
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
                {saving ? "Creating..." : "Create"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
