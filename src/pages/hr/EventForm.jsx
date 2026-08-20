import { useState, useEffect, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { get, post, put, peekCache } from "../../api/axios";
import Swal from "sweetalert2";

import { fmtDate } from "../../utils/formErrors";
import { DateField } from "../../components/hr/HrUI";
import Select2 from "../../components/hr/Select2";
import useSmartBack from "../../hooks/useSmartBack";
import { useAuth } from "../../admin/context/AuthContext";
import { draftKey, readDraft, writeDraft, clearDraft } from "../../utils/formDraft";
import { RestoreDraftBanner, DraftStatus } from "../../components/hr/DraftBar";

// Fires the server autosave this long after the last keystroke, once the
// event already exists as a draft. Short enough that little is ever at risk,
// long enough that typing a description is not a stream of PUTs.
const AUTOSAVE_IDLE_MS = 15000;
const ROLE_OPTIONS = ["Coordinator", "Welcoming", "Hospitality", "Registration", "Speaker", "Security", "Logistics", "Photography", "IT Support", "Other"];

export default function EventForm() {
  const { id } = useParams();
  const navigate = useNavigate();
  const goBack = useSmartBack("/hr/events");
  const { user } = useAuth();
  const isEdit = Boolean(id);
  const roleRef = useRef(null);

  const [form, setForm] = useState({ title: "", description: "", start_date: "", end_date: "", main_responsible_id: "", location: "", status: "upcoming" });
  const [roles, setRoles] = useState([]);
  const [requirements, setRequirements] = useState([{ description: "", assigned_to_id: "" }]);
  const [users, setUsers] = useState([]);
  const [usersLoading, setUsersLoading] = useState(true);
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(false);

  /* ── Nothing typed here gets thrown away ────────────────────────────────
   *
   * The event is saved as a `draft` the moment the planner asks for it (or
   * automatically, once a draft exists and they stop typing). A draft is a
   * real row: it survives leaving the page, a refresh and a different device,
   * it shows in the events list marked as a draft, and it notifies nobody
   * until it is published. Between those saves the browser holds a local copy
   * as well, so even a first, never-saved attempt is recoverable.
   */
  const [savingDraft, setSavingDraft] = useState(false);
  const [savedAt, setSavedAt] = useState(null);
  const [localDraft, setLocalDraft] = useState(null);   // pending restore offer
  const savedSnapshot = useRef(null);                   // what the server has
  const isDraft = form.status === "draft";
  const localKey = draftKey("event", user?.id, id);

  const snapshotOf = () => JSON.stringify({ form, roles, requirements });

  const buildPayload = (status) => ({
    ...form,
    status,
    roles: roles.map(({ userName, ...r }) => r),
    requirements: requirements.filter((r) => r.description.trim()),
  });

  // Role form
  const [roleForm, setRoleForm] = useState({ user_id: "", role_name: "", notes: "" });
  const [showRoleForm, setShowRoleForm] = useState(false);

  useEffect(() => { fetchUsers(); if (isEdit) loadEvent(); }, [id]);

  // Offer to restore anything the browser kept from a previous visit. Never
  // applied automatically — see RestoreDraftBanner.
  useEffect(() => {
    if (loading) return;
    const found = readDraft(localKey);
    if (found) setLocalDraft(found);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [localKey]);

  // Local mirror: cheap, synchronous, and covers the window before the first
  // server save (and every keystroke between server saves).
  useEffect(() => {
    if (loading) return;
    const t = setTimeout(() => {
      if (form.title || form.description || roles.length || requirements.some((r) => r.description)) {
        writeDraft(localKey, { form, roles, requirements });
      }
    }, 700);
    return () => clearTimeout(t);
  }, [form, roles, requirements, loading, localKey]);

  // Server autosave: only once the draft exists (we have an id), and only when
  // something actually changed since the last save. Re-arming on every edit
  // makes this fire once the planner pauses, not on a fixed drumbeat.
  useEffect(() => {
    if (!id || !isDraft || loading || saving || savingDraft) return;
    const t = setTimeout(() => {
      if (savedSnapshot.current !== snapshotOf()) saveDraft({ silent: true });
    }, AUTOSAVE_IDLE_MS);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form, roles, requirements, id, isDraft, loading, saving, savingDraft]);

  const restoreLocalDraft = () => {
    const d = localDraft?.data;
    if (!d) return;
    if (d.form) setForm(d.form);
    if (Array.isArray(d.roles)) setRoles(d.roles);
    if (Array.isArray(d.requirements) && d.requirements.length) setRequirements(d.requirements);
    setLocalDraft(null);
  };

  const discardLocalDraft = () => { clearDraft(localKey); setLocalDraft(null); };

  /**
   * Save without publishing. Only a title is required — everything else can
   * still be missing, which is the point: the planner keeps their progress and
   * comes back to it. The first save turns the URL into an edit URL so every
   * later save (and every autosave) updates the same row instead of piling up
   * new drafts.
   */
  const saveDraft = async ({ silent = false } = {}) => {
    if (!form.title.trim()) {
      setErrors((p) => ({ ...p, title: "Give the event a title so you can find the draft again" }));
      if (!silent) Swal.fire("Title needed", "Give the event a title so you can find the draft again.", "warning");
      return false;
    }
    setSavingDraft(true);
    const snapshot = snapshotOf();
    try {
      if (id) {
        await put(`/events/${id}`, buildPayload("draft"));
      } else {
        const res = await post("/events", buildPayload("draft"));
        const newId = res.data?.data?.id;
        clearDraft(localKey);                      // the "new" key
        if (newId) navigate(`/hr/events/edit/${newId}`, { replace: true });
      }
      setForm((p) => ({ ...p, status: "draft" }));
      savedSnapshot.current = snapshot;
      setSavedAt(new Date());
      clearDraft(localKey);                        // the server has it now
      setLocalDraft(null);
      if (!silent) {
        Swal.fire({
          icon: "success", title: "Draft saved",
          text: "Come back to it from the events list whenever you are ready.",
          timer: 1800, showConfirmButton: false,
        });
      }
      return true;
    } catch (err) {
      if (err.response?.status === 422 && err.response?.data?.errors) {
        const se = {};
        Object.entries(err.response.data.errors).forEach(([k, v]) => { se[k] = v[0]; });
        setErrors(se);
      }
      // A failed autosave must not interrupt: the local copy still holds the
      // work, and the next pause tries again.
      if (!silent) Swal.fire("Error", err.response?.data?.message || "Failed to save draft", "error");
      return false;
    } finally {
      setSavingDraft(false);
    }
  };

  const fetchUsers = async () => {
    setUsersLoading(true);
    try {
      // Paginated response — peel both possible shapes. No branch filter, the
      // backend already scopes by the caller's branch when appropriate.
      const res = await get(`/hr/staff/list?per_page=1000&status=active`);
      const raw = res.data?.data?.data ?? res.data?.data ?? res.data ?? [];
      const data = Array.isArray(raw) ? raw : [];
      // Backend FKs (main_responsible_id, event_roles.user_id,
      // event_requirements.assigned_to_id) all point at users.id, so we use
      // staff.user_id — not staff.id. Staff with no linked user account are
      // skipped (they have no inbox to receive event role assignments).
      const withUser = data
        .filter((s) => s.user_id)
        .map((s) => ({
          id: s.user_id,
          name: s.application?.full_name || s.full_name || `Staff #${s.employee_id || s.id}`,
          employee_id: s.employee_id || "",
          department: s.department || s.department_relation?.name || "",
          department_id: s.department_id || null,
        }));
      if (data.length > 0 && withUser.length === 0) {
        console.warn(
          `EventForm: ${data.length} active staff were returned but none have a linked user account. Run migrate:fresh --seed to relink them.`
        );
      }
      setUsers(withUser);
    } catch (e) {
      console.error("EventForm fetchUsers failed:", e);
      setUsers([]);
    } finally {
      setUsersLoading(false);
    }
  };

  const loadEvent = async () => {
    setLoading(true);
    const __cached = peekCache(`/events/${id}`);
    if (__cached) {
      const d = __cached?.data || __cached;
      setForm({ title: d.title || "", description: d.description || "", start_date: d.start_date ? d.start_date.split("T")[0] : "", end_date: d.end_date ? d.end_date.split("T")[0] : "", main_responsible_id: d.main_responsible_id || "", location: d.location || "", status: d.status || "upcoming" });
      if (d.roles?.length) setRoles(d.roles.map((r) => ({ user_id: r.user_id, role_name: r.role_name, notes: r.notes || "", userName: r.user?.name || "" })));
      if (d.requirements?.length) setRequirements(d.requirements.map((r) => ({ description: r.description, assigned_to_id: r.assigned_to_id || "", is_completed: r.is_completed || false })));
      setLoading(false);
    }
    try {
      const res = await get(`/events/${id}`);
      const d = res.data?.data || res.data;
      setForm({ title: d.title || "", description: d.description || "", start_date: d.start_date ? d.start_date.split("T")[0] : "", end_date: d.end_date ? d.end_date.split("T")[0] : "", main_responsible_id: d.main_responsible_id || "", location: d.location || "", status: d.status || "upcoming" });
      if (d.roles?.length) setRoles(d.roles.map((r) => ({ user_id: r.user_id, role_name: r.role_name, notes: r.notes || "", userName: r.user?.name || "" })));
      if (d.requirements?.length) setRequirements(d.requirements.map((r) => ({ description: r.description, assigned_to_id: r.assigned_to_id || "", is_completed: r.is_completed || false })));
    } catch { Swal.fire("Error", "Failed to load event", "error"); navigate("/hr/events"); }
    finally { setLoading(false); }
  };

  // Whatever was just loaded IS what the server holds — recorded so a freshly
  // opened draft does not immediately autosave itself back unchanged.
  useEffect(() => {
    if (loading) return;
    savedSnapshot.current = snapshotOf();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading]);

  const handle = (e) => { setForm((p) => ({ ...p, [e.target.name]: e.target.value })); if (errors[e.target.name]) setErrors((p) => ({ ...p, [e.target.name]: null })); };

  // Roles
  const addRole = () => {
    if (!roleForm.user_id || !roleForm.role_name) { Swal.fire("Required", "Select a person and role", "warning"); return; }
    const user = users.find((u) => String(u.id) === String(roleForm.user_id));
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
    // Publishing is where the real rules apply — this is the point at which
    // the event reaches everybody's calendar and inbox.
    const errs = {};
    if (!form.title) errs.title = "Title is required";
    if (!form.start_date) errs.start_date = "Start date is required";
    if (Object.keys(errs).length) { setErrors(errs); return; }

    setSaving(true);
    // A draft becomes a real, announced event; anything else keeps its status.
    const payload = buildPayload(isDraft ? "upcoming" : form.status);
    try {
      if (isEdit) { await put(`/events/${id}`, payload); Swal.fire({ icon: "success", title: isDraft ? "Event Published!" : "Event Updated!", timer: 1500, showConfirmButton: false }); }
      else { await post("/events", payload); Swal.fire({ icon: "success", title: "Event Created!", timer: 1500, showConfirmButton: false }); }
      clearDraft(localKey);
      goBack();
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
          <button onClick={goBack} className="p-2 bg-white/20 hover:bg-white/30 rounded-xl text-white transition-colors">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" /></svg>
          </button>
          <div>
            <h1 className="text-sm font-bold text-white flex items-center gap-2">
              {isDraft ? "Continue Draft Event" : isEdit ? "Edit Event" : "Create Event"}
              {isDraft && <span className="px-2 py-0.5 rounded-full bg-amber-400 text-amber-900 text-[9px] font-black uppercase tracking-wide">Draft</span>}
            </h1>
            <p className="text-xs text-teal-100 mt-0.5">
              {isDraft
                ? "Saved and private. Publish when the plan is settled."
                : "Set up event details, team roles, and requirements"}
            </p>
          </div>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="px-4 py-5 space-y-4">
        {localDraft && (
          <RestoreDraftBanner savedAt={localDraft.savedAt} onRestore={restoreLocalDraft} onDiscard={discardLocalDraft} />
        )}

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
              <DateField name="start_date" value={form.start_date} onChange={handle} className={ic("start_date")} />
              {errors.start_date && <p className="text-red-500 text-[10px] mt-1">{errors.start_date}</p>}
            </div>
            <div>
              <label className="block text-[11px] font-semibold text-gray-600 mb-1.5">End Date</label>
              <DateField name="end_date" value={form.end_date} onChange={handle} min={form.start_date} className={ic("end_date")} />
            </div>
            <div>
              <label className="block text-[11px] font-semibold text-gray-600 mb-1.5">Location</label>
              <input type="text" name="location" value={form.location} onChange={handle} placeholder="Main Hall, Auditorium..." className={ic("location")} />
            </div>
            <div>
              <label className="block text-[11px] font-semibold text-gray-600 mb-1.5">Main Responsible</label>
              <Select2
                value={form.main_responsible_id}
                onChange={(v) => setForm((p) => ({ ...p, main_responsible_id: v }))}
                options={users.map((u) => ({
                  value: u.id,
                  label: `${u.name}${u.employee_id ? ` · ${u.employee_id}` : ""}${u.department ? ` · ${u.department}` : ""}`,
                }))}
                placeholder={usersLoading ? "Loading staff…" : users.length ? "Select person in charge…" : "No staff available (run migrate:fresh --seed to link users)"}
              />
            </div>
            {isEdit && (
              <div>
                <label className="block text-[11px] font-semibold text-gray-600 mb-1.5">Status</label>
                <div className={`px-3 py-2.5 border border-gray-200 rounded-xl text-xs bg-gray-50 flex items-center justify-between`}>
                  <div className="flex items-center gap-2">
                    <span className={`w-2 h-2 rounded-full ${
                      form.status === "upcoming" ? "bg-blue-500" : form.status === "ongoing" ? "bg-amber-500" : form.status === "completed" ? "bg-emerald-500" : "bg-red-500"
                    }`} />
                    <span className="capitalize font-medium text-gray-700">{form.status}</span>
                  </div>
                  {form.status !== "cancelled" && form.status !== "completed" && (
                    <button type="button" onClick={() => setForm((p) => ({ ...p, status: "cancelled" }))}
                      className="text-[10px] text-red-500 hover:text-red-700 font-semibold">Cancel Event</button>
                  )}
                </div>
                <p className="text-[9px] text-gray-400 mt-1">Status updates automatically based on dates</p>
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
                    <Select2
                      size="sm"
                      value={roleForm.user_id}
                      onChange={(v) => setRoleForm((p) => ({ ...p, user_id: v }))}
                      options={users.map((u) => ({
                        value: u.id,
                        label: `${u.name}${u.employee_id ? ` · ${u.employee_id}` : ""}${u.department ? ` · ${u.department}` : ""}`,
                      }))}
                      placeholder={usersLoading ? "Loading…" : users.length ? "Search staff…" : "No staff"}
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-semibold text-teal-700 mb-1">Role *</label>
                    <Select2
                      size="sm"
                      value={roleForm.role_name}
                      onChange={(v) => setRoleForm((p) => ({ ...p, role_name: v }))}
                      options={ROLE_OPTIONS.map((r) => ({ value: r, label: r }))}
                      placeholder="Select role…"
                    />
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
                    <Select2
                      size="sm"
                      value={req.assigned_to_id}
                      onChange={(v) => handleReqChange(i, "assigned_to_id", v)}
                      options={users.map((u) => ({
                        value: u.id,
                        label: `${u.name}${u.department ? ` · ${u.department}` : ""}`,
                      }))}
                      placeholder={usersLoading ? "Loading…" : users.length ? "Assign to…" : "No staff"}
                    />
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
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pt-2">
          <div className="flex items-center gap-3">
            <button type="button" onClick={goBack}
              className="flex items-center gap-2 px-5 py-2.5 text-sm font-medium text-gray-600 bg-white border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" /></svg>
              Back
            </button>
            {/* Only meaningful while the event is still being planned; a
                published event is saved by the Update button, not by drafts. */}
            {(!isEdit || isDraft) && (
              <DraftStatus isDraft={isDraft} savedAt={savedAt} saving={savingDraft} noun="event" />
            )}
          </div>

          <div className="flex items-center gap-2">
            {/* Save without publishing — the escape hatch from "finish it all
                now or lose it". Available while the event is new or a draft. */}
            {(!isEdit || isDraft) && (
              <button type="button" onClick={() => saveDraft()} disabled={savingDraft || saving}
                className="flex items-center gap-2 px-5 py-2.5 text-sm font-semibold text-amber-800 bg-amber-100 border border-amber-200 rounded-xl hover:bg-amber-200 transition-colors disabled:opacity-50">
                {savingDraft ? (<><div className="w-4 h-4 border-2 border-amber-300 border-t-amber-700 rounded-full animate-spin"></div>Saving...</>) : (<><svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4" /></svg>Save draft</>)}
              </button>
            )}
            <button type="submit" disabled={saving || savingDraft}
              className="flex items-center gap-2 px-6 py-2.5 text-sm font-semibold text-white bg-teal-600 rounded-xl hover:bg-teal-700 transition-colors disabled:opacity-50">
              {saving ? (<><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>Saving...</>) : (<><svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>{isDraft ? "Publish Event" : isEdit ? "Update Event" : "Create Event"}</>)}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}
