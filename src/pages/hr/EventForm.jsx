import { useState, useEffect, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { get, post, put } from "../../api/axios";
import Swal from "sweetalert2";

const ROLE_OPTIONS = ["Coordinator", "Welcoming", "Hospitality", "Registration", "Speaker", "Security", "Logistics", "Photography", "IT Support", "Other"];

export default function EventForm() {
  const { id } = useParams();
  const navigate = useNavigate();
  const isEdit = Boolean(id);
  const roleRef = useRef(null);

  const [form, setForm] = useState({ title: "", description: "", start_date: "", end_date: "", main_responsible_id: "", location: "", status: "upcoming" });
  const [roles, setRoles] = useState([]);
  const [requirements, setRequirements] = useState([{ description: "", assigned_to_id: "" }]);
  const [users, setUsers] = useState([]);
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(false);

  // Role form
  const [roleForm, setRoleForm] = useState({ user_id: "", role_name: "", notes: "" });
  const [showRoleForm, setShowRoleForm] = useState(false);

  useEffect(() => { fetchUsers(); if (isEdit) loadEvent(); }, [id]);

  const fetchUsers = async () => {
    try {
      const user = JSON.parse(localStorage.getItem("user") || "{}");
      const bp = user.branch_id ? `&branch_id=${user.branch_id}` : "";
      const res = await get(`/hr/staff/list?per_page=1000&status=active${bp}`);
      const data = res.data?.data || res.data || [];
      setUsers(Array.isArray(data) ? data.map((s) => ({ id: s.id, name: s.application?.full_name || s.full_name || `Staff #${s.employee_id}`, employee_id: s.employee_id, department: s.department || "" })) : []);
    } catch { setUsers([]); }
  };

  const loadEvent = async () => {
    setLoading(true);
    try {
      const res = await get(`/events/${id}`);
      const d = res.data?.data || res.data;
      setForm({ title: d.title || "", description: d.description || "", start_date: d.start_date ? d.start_date.split("T")[0] : "", end_date: d.end_date ? d.end_date.split("T")[0] : "", main_responsible_id: d.main_responsible_id || "", location: d.location || "", status: d.status || "upcoming" });
      if (d.roles?.length) setRoles(d.roles.map((r) => ({ user_id: r.user_id, role_name: r.role_name, notes: r.notes || "", userName: r.user?.name || "" })));
      if (d.requirements?.length) setRequirements(d.requirements.map((r) => ({ description: r.description, assigned_to_id: r.assigned_to_id || "", is_completed: r.is_completed || false })));
    } catch { Swal.fire("Error", "Failed to load event", "error"); navigate("/hr/events"); }
    finally { setLoading(false); }
  };

  const handle = (e) => { setForm((p) => ({ ...p, [e.target.name]: e.target.value })); if (errors[e.target.name]) setErrors((p) => ({ ...p, [e.target.name]: null })); };

  // Roles
  const addRole = () => {
    if (!roleForm.user_id || !roleForm.role_name) { Swal.fire("Required", "Select a person and role", "warning"); return; }
    const user = users.find((u) => u.id === Number(roleForm.user_id));
    setRoles((p) => [...p, { ...roleForm, userName: user?.name || "" }]);
    setRoleForm({ user_id: "", role_name: "", notes: "" });
    setShowRoleForm(false);
  };
  const removeRole = (i) => setRoles((p) => p.filter((_, idx) => idx !== i));

  // Requirements
  const handleReqChange = (i, field, val) => setRequirements((p) => p.map((r, idx) => idx === i ? { ...r, [field]: val } : r));
  const addReq = () => setRequirements((p) => [...p, { description: "", assigned_to_id: "" }]);
  const removeReq = (i) => { if (requirements.length > 1) setRequirements((p) => p.filter((_, idx) => idx !== i)); };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const errs = {};
    if (!form.title) errs.title = "Title is required";
    if (!form.start_date) errs.start_date = "Start date is required";
    if (Object.keys(errs).length) { setErrors(errs); return; }

    setSaving(true);
    const payload = { ...form, roles: roles.map(({ userName, ...r }) => r), requirements: requirements.filter((r) => r.description.trim()) };
    try {
      if (isEdit) { await put(`/events/${id}`, payload); Swal.fire({ icon: "success", title: "Event Updated!", timer: 1500, showConfirmButton: false }); }
      else { await post("/events", payload); Swal.fire({ icon: "success", title: "Event Created!", timer: 1500, showConfirmButton: false }); }
      navigate("/hr/events");
    } catch (err) {
      if (err.response?.status === 422 && err.response?.data?.errors) { const se = {}; Object.entries(err.response.data.errors).forEach(([k, v]) => { se[k] = v[0]; }); setErrors(se); }
      else Swal.fire("Error", err.response?.data?.message || "Failed to save", "error");
    } finally { setSaving(false); }
  };

  const ic = (f) => `w-full px-3 py-2.5 border rounded-xl text-xs transition-all focus:ring-2 focus:outline-none ${errors[f] ? "border-red-400 bg-red-50 focus:ring-red-300" : "border-gray-200 bg-white hover:border-gray-300 focus:ring-teal-400"}`;

  if (loading) return <div className="min-h-[60vh] flex items-center justify-center"><div className="animate-spin rounded-full h-10 w-10 border-4 border-teal-100 border-t-teal-600"></div></div>;

  return (
    <div className="min-h-screen bg-gray-50/60">
      <div className="bg-teal-600 px-5 py-4">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate("/hr/events")} className="p-2 bg-white/20 hover:bg-white/30 rounded-xl text-white transition-colors">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" /></svg>
          </button>
          <div>
            <h1 className="text-sm font-bold text-white">{isEdit ? "Edit Event" : "Create Event"}</h1>
            <p className="text-xs text-teal-100 mt-0.5">Set up event details, team roles, and requirements</p>
          </div>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="px-4 py-5 space-y-4">
        {/* 1. Event Details */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm">
          <div className="px-5 py-3 bg-teal-50 border-b border-teal-100 flex items-center gap-2.5">
            <div className="w-8 h-8 bg-teal-600 rounded-lg flex items-center justify-center">
              <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
            </div>
            <div><p className="text-sm font-bold text-gray-800">Event Details</p><p className="text-[10px] text-teal-600">Title, dates, and location</p></div>
          </div>
          <div className="p-5 grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="sm:col-span-2">
              <label className="block text-[11px] font-semibold text-gray-600 mb-1.5">Event Title *</label>
              <input type="text" name="title" value={form.title} onChange={handle} placeholder="e.g. Academic Year Opening Ceremony" className={ic("title")} />
              {errors.title && <p className="text-red-500 text-[10px] mt-1">{errors.title}</p>}
            </div>
            <div>
              <label className="block text-[11px] font-semibold text-gray-600 mb-1.5">Start Date *</label>
              <input type="date" name="start_date" value={form.start_date} onChange={handle} className={ic("start_date")} />
              {errors.start_date && <p className="text-red-500 text-[10px] mt-1">{errors.start_date}</p>}
            </div>
            <div>
              <label className="block text-[11px] font-semibold text-gray-600 mb-1.5">End Date</label>
              <input type="date" name="end_date" value={form.end_date} onChange={handle} min={form.start_date} className={ic("end_date")} />
            </div>
            <div>
              <label className="block text-[11px] font-semibold text-gray-600 mb-1.5">Location</label>
              <input type="text" name="location" value={form.location} onChange={handle} placeholder="Main Hall, Auditorium..." className={ic("location")} />
            </div>
            <div>
              <label className="block text-[11px] font-semibold text-gray-600 mb-1.5">Main Responsible</label>
              <select name="main_responsible_id" value={form.main_responsible_id} onChange={handle} className={ic("main_responsible_id")}>
                <option value="">Select person in charge...</option>
                {users.map((u) => <option key={u.id} value={u.id}>{u.name}</option>)}
              </select>
            </div>
            {isEdit && (
              <div>
                <label className="block text-[11px] font-semibold text-gray-600 mb-1.5">Status</label>
                <select name="status" value={form.status} onChange={handle} className={ic("status")}>
                  <option value="upcoming">Upcoming</option>
                  <option value="ongoing">Ongoing</option>
                  <option value="completed">Completed</option>
                  <option value="cancelled">Cancelled</option>
                </select>
              </div>
            )}
            <div className={isEdit ? "" : "sm:col-span-2"}>
              <label className="block text-[11px] font-semibold text-gray-600 mb-1.5">Description</label>
              <textarea name="description" value={form.description} onChange={handle} rows={2} placeholder="Brief description of the event..." className={`${ic("description")} resize-none`} />
            </div>
          </div>
        </div>

        {/* 2. Team Roles */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm">
          <div className="px-5 py-3 bg-teal-50 border-b border-teal-100 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 bg-teal-600 rounded-lg flex items-center justify-center">
                <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
              </div>
              <div><p className="text-sm font-bold text-gray-800">Team Roles</p><p className="text-[10px] text-teal-600">{roles.length} role{roles.length !== 1 ? "s" : ""} assigned</p></div>
            </div>
            {!showRoleForm && (
              <button type="button" onClick={() => setShowRoleForm(true)}
                className="px-2.5 py-1 bg-teal-600 text-white rounded-lg hover:bg-teal-700 text-[10px] font-medium flex items-center gap-1">
                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
                Add Role
              </button>
            )}
          </div>
          <div className="p-5 space-y-3">
            {/* Add role form */}
            {showRoleForm && (
              <div className="bg-teal-50 border border-teal-200 rounded-xl p-4 space-y-3">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-[10px] font-semibold text-teal-700 mb-1">Person *</label>
                    <select value={roleForm.user_id} onChange={(e) => setRoleForm((p) => ({ ...p, user_id: e.target.value }))}
                      className="w-full px-2.5 py-2 border border-teal-200 rounded-lg text-xs focus:ring-1 focus:ring-teal-400 focus:outline-none bg-white">
                      <option value="">Select person...</option>
                      {users.map((u) => <option key={u.id} value={u.id}>{u.name}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-[10px] font-semibold text-teal-700 mb-1">Role *</label>
                    <select value={roleForm.role_name} onChange={(e) => setRoleForm((p) => ({ ...p, role_name: e.target.value }))}
                      className="w-full px-2.5 py-2 border border-teal-200 rounded-lg text-xs focus:ring-1 focus:ring-teal-400 focus:outline-none bg-white">
                      <option value="">Select role...</option>
                      {ROLE_OPTIONS.map((r) => <option key={r} value={r}>{r}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-[10px] font-semibold text-teal-700 mb-1">Instructions</label>
                    <input type="text" value={roleForm.notes} onChange={(e) => setRoleForm((p) => ({ ...p, notes: e.target.value }))}
                      placeholder="Optional notes..." className="w-full px-2.5 py-2 border border-teal-200 rounded-lg text-xs focus:ring-1 focus:ring-teal-400 focus:outline-none bg-white" />
                  </div>
                </div>
                <div className="flex gap-2">
                  <button type="button" onClick={addRole} className="px-3 py-1.5 bg-teal-600 text-white rounded-lg text-xs font-semibold hover:bg-teal-700">Add</button>
                  <button type="button" onClick={() => { setShowRoleForm(false); setRoleForm({ user_id: "", role_name: "", notes: "" }); }} className="px-3 py-1.5 bg-white border border-gray-200 text-gray-600 rounded-lg text-xs font-medium">Cancel</button>
                </div>
              </div>
            )}

            {/* Role chips */}
            {roles.length > 0 ? (
              <div className="space-y-2">
                {roles.map((role, i) => {
                  const user = users.find((u) => u.id === Number(role.user_id));
                  const name = role.userName || user?.name || "Unknown";
                  return (
                    <div key={i} className="flex items-center justify-between p-3 bg-gray-50 rounded-xl border border-gray-100 group">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-teal-100 text-teal-700 flex items-center justify-center text-[10px] font-bold">
                          {name.split(" ").map((w) => w[0]).slice(0, 2).join("").toUpperCase()}
                        </div>
                        <div>
                          <p className="text-xs font-semibold text-gray-800">{name}</p>
                          <div className="flex items-center gap-2 mt-0.5">
                            <span className="px-2 py-0.5 bg-teal-100 text-teal-700 text-[9px] font-semibold rounded-full">{role.role_name}</span>
                            {role.notes && <span className="text-[9px] text-gray-400">{role.notes}</span>}
                          </div>
                        </div>
                      </div>
                      <button type="button" onClick={() => removeRole(i)} className="p-1 text-gray-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                      </button>
                    </div>
                  );
                })}
              </div>
            ) : !showRoleForm && (
              <p className="text-xs text-gray-400 italic text-center py-3">No roles assigned yet</p>
            )}
          </div>
        </div>

        {/* 3. Requirements Checklist */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm">
          <div className="px-5 py-3 bg-teal-50 border-b border-teal-100 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 bg-teal-600 rounded-lg flex items-center justify-center">
                <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" /></svg>
              </div>
              <div><p className="text-sm font-bold text-gray-800">Requirements</p><p className="text-[10px] text-teal-600">Checklist of items needed</p></div>
            </div>
            <button type="button" onClick={addReq}
              className="px-2.5 py-1 bg-teal-600 text-white rounded-lg hover:bg-teal-700 text-[10px] font-medium flex items-center gap-1">
              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
              Add Item
            </button>
          </div>
          <div className="p-5 space-y-2">
            {requirements.map((req, i) => (
              <div key={i} className="flex items-start gap-3 group">
                <div className="mt-2.5 w-5 h-5 rounded border-2 border-gray-300 flex items-center justify-center flex-shrink-0 text-gray-300">
                  <span className="text-[9px] font-bold">{i + 1}</span>
                </div>
                <div className="flex-1 grid grid-cols-1 sm:grid-cols-3 gap-2">
                  <div className="sm:col-span-2">
                    <input type="text" value={req.description} onChange={(e) => handleReqChange(i, "description", e.target.value)}
                      placeholder="What is needed..." className="w-full px-2.5 py-2 border border-gray-200 rounded-lg text-xs focus:ring-1 focus:ring-amber-400 focus:outline-none" />
                  </div>
                  <div>
                    <select value={req.assigned_to_id} onChange={(e) => handleReqChange(i, "assigned_to_id", e.target.value)}
                      className="w-full px-2.5 py-2 border border-gray-200 rounded-lg text-xs focus:ring-1 focus:ring-amber-400 focus:outline-none">
                      <option value="">Assign to...</option>
                      {users.map((u) => <option key={u.id} value={u.id}>{u.name}</option>)}
                    </select>
                  </div>
                </div>
                {requirements.length > 1 && (
                  <button type="button" onClick={() => removeReq(i)} className="mt-2 p-1 text-gray-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity">
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center justify-between pt-2">
          <button type="button" onClick={() => navigate("/hr/events")}
            className="flex items-center gap-2 px-5 py-2.5 text-sm font-medium text-gray-600 bg-white border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" /></svg>
            Cancel
          </button>
          <button type="submit" disabled={saving}
            className="flex items-center gap-2 px-6 py-2.5 text-sm font-semibold text-white bg-teal-600 rounded-xl hover:bg-teal-700 transition-colors disabled:opacity-50">
            {saving ? (<><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>Saving...</>) : (<><svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>{isEdit ? "Update Event" : "Create Event"}</>)}
          </button>
        </div>
      </form>
    </div>
  );
}
