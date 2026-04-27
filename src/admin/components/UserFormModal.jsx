import { useEffect, useState } from "react";
import Swal from "sweetalert2";
import { accessApi } from "../services/accessApi";
import { get } from "../../api/axios";
import { useAuth } from "../context/AuthContext";

/**
 * Create OR edit a user. In create mode, optionally assign initial roles too.
 *
 * Props:
 *   mode: "create" | "edit"
 *   user: existing user object (for edit mode)
 *   roles: list of roles (only used in create mode for initial assignment)
 *   onClose()
 *   onSaved(savedUser)
 */
export default function UserFormModal({ mode = "create", user = null, roles = [], onClose, onSaved }) {
  const isEdit = mode === "edit";
  const { user: me } = useAuth();
  // Only "global" users (super-admin OR branch_id=null) can re-assign branches.
  const canPickBranch = me?.is_super_admin || me?.branch_id == null;

  const [form, setForm] = useState({
    name: "",
    username: "",
    email: "",
    password: "",
    branch_id: "",   // "" = global / all branches
    roles: new Set(),
  });
  const [branches, setBranches] = useState([]);
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);

  // Fetch branches once when the modal opens (only if user can pick).
  useEffect(() => {
    if (!canPickBranch) return;
    (async () => {
      try {
        const res = await get("/branches/list");
        setBranches(res.data?.data || []);
      } catch {
        setBranches([]);
      }
    })();
  }, [canPickBranch]);

  useEffect(() => {
    if (isEdit && user) {
      setForm({
        name: user.name || "",
        username: user.username || "",
        email: user.email || "",
        password: "",
        branch_id: user.branch_id ?? "",
        roles: new Set(user.roles || []),
      });
    }
  }, [isEdit, user]);

  const set = (k, v) => setForm((p) => ({ ...p, [k]: v }));
  const errOf = (k) => errors[k]?.[0];

  const submit = async () => {
    setSaving(true);
    setErrors({});
    try {
      // "" → null means "all branches / global". Only send branch_id when allowed.
      const branchId = form.branch_id === "" ? null : Number(form.branch_id);

      let res;
      if (isEdit) {
        const payload = {
          name: form.name,
          username: form.username,
          email: form.email,
        };
        if (form.password) payload.password = form.password;
        if (canPickBranch) payload.branch_id = branchId;
        res = await accessApi.updateUser(user.id, payload);
      } else {
        res = await accessApi.createUser({
          name: form.name,
          username: form.username,
          email: form.email,
          ...(canPickBranch ? { branch_id: branchId } : {}),
          password: form.password,
          roles: Array.from(form.roles),
        });
      }
      Swal.fire({
        icon: "success",
        title: isEdit ? "User updated" : "User created",
        timer: 1300,
        showConfirmButton: false,
      });
      onSaved?.(res.data?.data || null);
      onClose?.();
    } catch (e) {
      if (e.response?.status === 422 && e.response?.data?.errors) {
        setErrors(e.response.data.errors);
      } else {
        Swal.fire("Error", e.response?.data?.message || "Failed", "error");
      }
    } finally {
      setSaving(false);
    }
  };

  const inp = (k) =>
    `w-full px-3 py-2.5 border rounded-xl text-sm focus:ring-2 focus:outline-none ${
      errOf(k) ? "border-red-400 focus:ring-red-300 bg-red-50" : "border-gray-200 focus:ring-teal-400"
    }`;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg overflow-hidden">
        <div className="px-5 py-4 bg-teal-50 border-b border-teal-100 flex items-center justify-between">
          <div>
            <h3 className="text-sm font-bold text-gray-800">{isEdit ? "Edit User" : "New User"}</h3>
            <p className="text-[10px] text-gray-500 mt-0.5">
              {isEdit ? "Leave password blank to keep the current one." : "Create a login. Roles can be set later from the user detail page."}
            </p>
          </div>
          <button onClick={onClose} className="p-1 hover:bg-teal-100 rounded-lg">
            <svg className="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="p-5 space-y-3 max-h-[70vh] overflow-y-auto">
          <div>
            <label className="block text-[11px] font-semibold text-gray-500 uppercase mb-1.5">Full Name *</label>
            <input value={form.name} onChange={(e) => set("name", e.target.value)} className={inp("name")} />
            {errOf("name") && <p className="text-red-500 text-[10px] mt-1">{errOf("name")}</p>}
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] font-semibold text-gray-500 uppercase mb-1.5">Username *</label>
              <input value={form.username} onChange={(e) => set("username", e.target.value)} className={inp("username")} />
              {errOf("username") && <p className="text-red-500 text-[10px] mt-1">{errOf("username")}</p>}
            </div>
            <div>
              <label className="block text-[11px] font-semibold text-gray-500 uppercase mb-1.5">Email *</label>
              <input type="email" value={form.email} onChange={(e) => set("email", e.target.value)} className={inp("email")} />
              {errOf("email") && <p className="text-red-500 text-[10px] mt-1">{errOf("email")}</p>}
            </div>
          </div>
          <div>
            <label className="block text-[11px] font-semibold text-gray-500 uppercase mb-1.5">
              Password {isEdit ? "(optional)" : "*"}
            </label>
            <input
              type="password"
              value={form.password}
              onChange={(e) => set("password", e.target.value)}
              placeholder={isEdit ? "Leave blank to keep current" : "Min 8 characters"}
              className={inp("password")}
            />
            {errOf("password") && <p className="text-red-500 text-[10px] mt-1">{errOf("password")}</p>}
          </div>

          {canPickBranch && (
            <div>
              <label className="block text-[11px] font-semibold text-gray-500 uppercase mb-1.5">Branch</label>
              <select
                value={form.branch_id}
                onChange={(e) => set("branch_id", e.target.value)}
                className={inp("branch_id")}
              >
                <option value="">All Branches (Global) — sees data from every branch</option>
                {branches.map((b) => (
                  <option key={b.id} value={b.id}>{b.name}</option>
                ))}
              </select>
              <p className="text-[10px] text-gray-400 mt-1">
                Leave as "All Branches" to give this user cross-branch visibility (like a super-admin).
              </p>
              {errOf("branch_id") && <p className="text-red-500 text-[10px] mt-1">{errOf("branch_id")}</p>}
            </div>
          )}

          {!isEdit && roles.length > 0 && (
            <div>
              <label className="block text-[11px] font-semibold text-gray-500 uppercase mb-2">Initial Roles</label>
              <div className="flex flex-wrap gap-2">
                {roles.map((r) => {
                  const checked = form.roles.has(r.name);
                  const isSuper = r.name === "super-admin";
                  return (
                    <label key={r.id}
                           className={`px-3 py-1.5 rounded-xl border-2 cursor-pointer flex items-center gap-2 ${
                             checked
                               ? isSuper ? "border-purple-400 bg-purple-50" : "border-teal-400 bg-teal-50"
                               : "border-gray-200 bg-white hover:border-teal-200"
                           }`}>
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() => {
                          const next = new Set(form.roles);
                          if (checked) next.delete(r.name); else next.add(r.name);
                          set("roles", next);
                        }}
                        className="w-3.5 h-3.5 text-teal-600 rounded"
                      />
                      <span className={`text-xs font-semibold capitalize ${isSuper ? "text-purple-700" : "text-gray-700"}`}>
                        {r.name.replace(/-/g, " ")}
                      </span>
                    </label>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        <div className="px-5 py-4 bg-gray-50 flex justify-end gap-2 border-t border-gray-100">
          <button onClick={onClose} disabled={saving}
                  className="px-4 py-2 text-xs font-medium text-gray-600 bg-white border border-gray-200 rounded-xl hover:bg-gray-50">
            Cancel
          </button>
          <button onClick={submit} disabled={saving || !form.name || !form.username || !form.email || (!isEdit && !form.password)}
                  className="px-4 py-2 text-xs font-semibold text-white bg-teal-600 rounded-xl hover:bg-teal-700 disabled:opacity-50">
            {saving ? "Saving..." : isEdit ? "Save Changes" : "Create User"}
          </button>
        </div>
      </div>
    </div>
  );
}
