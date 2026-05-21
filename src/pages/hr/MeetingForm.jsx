import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { get, post, put } from "../../api/axios";
import Swal from "sweetalert2";

import { fmtDate, fmtDateTime } from "../../utils/formErrors";

import { DateField } from "../../components/hr/HrUI";
import Select2 from "../../components/hr/Select2";
const emptyAgenda = { title: "", description: "", assigned_to_id: "", duration_min: "" };

export default function MeetingForm() {
  const { id } = useParams();
  const navigate = useNavigate();
  const isEdit = Boolean(id);

  const [form, setForm] = useState({
    title: "",
    description: "",
    start_time: "",
    end_time: "",
    location: "",
    status: "scheduled",
    meeting_type: "routine",
  });

  const [participants, setParticipants] = useState([]);
  const [agendaItems, setAgendaItems] = useState([{ ...emptyAgenda }]);
  const [users, setUsers] = useState([]);
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchUsers();
    if (isEdit) loadMeeting();
  }, [id]);

  const fetchUsers = async () => {
    try {
      // Paginated list returns { data: [...], current_page, total, ... }.
      // Asking for a big page so the dropdown has the whole roster.
      const res = await get(`/hr/staff/list?per_page=1000&status=active`);
      const raw = res.data?.data?.data ?? res.data?.data ?? res.data ?? [];
      const data = Array.isArray(raw) ? raw : [];
      setUsers(data.map((s) => ({
        id: s.id,
        name: s.application?.full_name || s.full_name || `Staff #${s.employee_id || s.id}`,
        employee_id: s.employee_id || "",
        department: s.department || s.department_obj?.name || "",
      })));
    } catch (e) {
      console.error("MeetingForm fetchUsers failed:", e);
      setUsers([]);
    }
  };

  const loadMeeting = async () => {
    setLoading(true);
    try {
      const res = await get(`/meetings/${id}`);
      const d = res.data?.data || res.data;
      setForm({
        title: d.title || "",
        description: d.description || "",
        start_time: d.start_time ? d.start_time.replace(" ", "T").substring(0, 16) : "",
        end_time: d.end_time ? d.end_time.replace(" ", "T").substring(0, 16) : "",
        location: d.location || "",
        status: d.status || "scheduled",
        meeting_type: d.meeting_type || "routine",
      });
      if (d.participants?.length) {
        setParticipants(d.participants.map((p) => ({
          id: p.id,
          name: p.name || `User #${p.id}`,
        })));
      }
      if (d.agenda_items?.length) {
        setAgendaItems(d.agenda_items.map((a) => ({
          title: a.title || "",
          description: a.description || "",
          assigned_to_id: a.assigned_to_id || "",
          duration_min: a.duration_min || "",
        })));
      }
    } catch {
      Swal.fire("Error", "Failed to load meeting", "error");
      navigate("/hr/meetings");
    } finally {
      setLoading(false);
    }
  };

  const handle = (e) => {
    setForm((p) => ({ ...p, [e.target.name]: e.target.value }));
    if (errors[e.target.name]) setErrors((p) => ({ ...p, [e.target.name]: null }));
  };

  // Agenda
  const handleAgendaChange = (i, field, value) => {
    setAgendaItems((p) => p.map((item, idx) => idx === i ? { ...item, [field]: value } : item));
  };
  const addAgendaItem = () => setAgendaItems((p) => [...p, { ...emptyAgenda }]);
  const removeAgendaItem = (i) => { if (agendaItems.length > 1) setAgendaItems((p) => p.filter((_, idx) => idx !== i)); };
  const moveAgenda = (i, dir) => {
    const j = i + dir;
    if (j < 0 || j >= agendaItems.length) return;
    setAgendaItems((p) => {
      const arr = [...p];
      [arr[i], arr[j]] = [arr[j], arr[i]];
      return arr;
    });
  };

  const totalDuration = agendaItems.reduce((s, a) => s + (Number(a.duration_min) || 0), 0);

  const handleSubmit = async (e) => {
    e.preventDefault();
    const errs = {};
    if (!form.title) errs.title = "Title is required";
    if (!form.start_time) errs.start_time = "Start time is required";
    if (!form.end_time) errs.end_time = "End time is required";
    if (Object.keys(errs).length) { setErrors(errs); return; }

    setSaving(true);
    const payload = {
      ...form,
      participants: participants.map((p) => p.id),
      agenda_items: agendaItems.filter((a) => a.title.trim()),
    };

    try {
      if (isEdit) {
        await put(`/meetings/${id}`, payload);
        Swal.fire({ icon: "success", title: "Meeting Updated!", timer: 1500, showConfirmButton: false });
      } else {
        await post("/meetings", payload);
        Swal.fire({ icon: "success", title: "Meeting Created!", timer: 1500, showConfirmButton: false });
      }
      navigate("/hr/meetings");
    } catch (err) {
      if (err.response?.status === 422 && err.response?.data?.errors) {
        const se = {};
        Object.entries(err.response.data.errors).forEach(([k, v]) => { se[k] = v[0]; });
        setErrors(se);
      } else {
        Swal.fire("Error", err.response?.data?.message || "Failed to save", "error");
      }
    } finally {
      setSaving(false);
    }
  };

  const ic = (f) => `w-full px-3 py-2.5 border rounded-xl text-xs transition-all focus:ring-2 focus:outline-none ${errors[f] ? "border-red-400 bg-red-50 focus:ring-red-300" : "border-gray-200 bg-white hover:border-gray-300 focus:ring-teal-400"}`;

  if (loading) return <div className="min-h-[60vh] flex items-center justify-center"><div className="animate-spin rounded-full h-10 w-10 border-4 border-teal-100 border-t-teal-600"></div></div>;

  return (
    <div className="min-h-screen bg-gray-50/60">
      {/* Header */}
      <div className="bg-teal-600 px-5 py-4">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate("/hr/meetings")} className="p-2 bg-white/20 hover:bg-white/30 rounded-xl text-white transition-colors">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" /></svg>
          </button>
          <div>
            <h1 className="text-sm font-bold text-white">{isEdit ? "Edit Meeting" : "Schedule Meeting"}</h1>
            <p className="text-xs text-teal-100 mt-0.5">Set up meeting details, participants, and agenda</p>
          </div>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="px-4 py-5 space-y-4">
        {/* 1. Meeting Details */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm">
          <div className="px-5 py-3 bg-teal-50 border-b border-teal-100 flex items-center gap-2.5">
            <div className="w-8 h-8 bg-teal-600 rounded-lg flex items-center justify-center">
              <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
            </div>
            <div>
              <p className="text-sm font-bold text-gray-800">Meeting Details</p>
              <p className="text-[10px] text-teal-600">Title, time, and location</p>
            </div>
          </div>
          <div className="p-5 grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="sm:col-span-2">
              <label className="block text-[11px] font-semibold text-gray-600 mb-1.5">Meeting Title *</label>
              <input type="text" name="title" value={form.title} onChange={handle} placeholder="e.g. Weekly Staff Meeting" className={ic("title")} />
              {errors.title && <p className="text-red-500 text-[10px] mt-1">{errors.title}</p>}
            </div>
            <div>
              <label className="block text-[11px] font-semibold text-gray-600 mb-1.5">Start Date & Time *</label>
              <DateField name="start_time" value={form.start_time} onChange={handle} className={ic("start_time")} withTime />
              {errors.start_time && <p className="text-red-500 text-[10px] mt-1">{errors.start_time}</p>}
            </div>
            <div>
              <label className="block text-[11px] font-semibold text-gray-600 mb-1.5">End Date & Time *</label>
              <DateField name="end_time" value={form.end_time} onChange={handle} min={form.start_time} className={ic("end_time")} withTime />
              {errors.end_time && <p className="text-red-500 text-[10px] mt-1">{errors.end_time}</p>}
            </div>
            <div>
              <label className="block text-[11px] font-semibold text-gray-600 mb-1.5">Location</label>
              <input type="text" name="location" value={form.location} onChange={handle} placeholder="Room name or virtual link" className={ic("location")} />
            </div>
            <div>
              <label className="block text-[11px] font-semibold text-gray-600 mb-1.5">Meeting Type *</label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setForm((p) => ({ ...p, meeting_type: "routine" }))}
                  className={`px-3 py-2 rounded-xl text-xs font-semibold transition-all flex items-center justify-center gap-1.5 border ${form.meeting_type === "routine" ? "bg-teal-600 text-white border-teal-600 shadow-sm" : "bg-white text-gray-600 border-gray-200 hover:border-teal-300"}`}
                >
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                  Routine
                </button>
                <button
                  type="button"
                  onClick={() => setForm((p) => ({ ...p, meeting_type: "emergency" }))}
                  className={`px-3 py-2 rounded-xl text-xs font-semibold transition-all flex items-center justify-center gap-1.5 border ${form.meeting_type === "emergency" ? "bg-red-600 text-white border-red-600 shadow-sm" : "bg-white text-gray-600 border-gray-200 hover:border-red-300"}`}
                >
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
                  Emergency
                </button>
              </div>
            </div>
            {isEdit && (
              <div>
                <label className="block text-[11px] font-semibold text-gray-600 mb-1.5">Status</label>
                <select name="status" value={form.status} onChange={handle} className={ic("status")}>
                  <option value="scheduled">Scheduled</option>
                  <option value="in_progress">In Progress</option>
                  <option value="completed">Completed</option>
                  <option value="cancelled">Cancelled</option>
                </select>
              </div>
            )}
            <div className="sm:col-span-2">
              <label className="block text-[11px] font-semibold text-gray-600 mb-1.5">Description</label>
              <textarea name="description" value={form.description} onChange={handle} rows={2} placeholder="Brief description of the meeting..." className={`${ic("description")} resize-none`} />
            </div>
          </div>
        </div>

        {/* 2. Participants */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm">
          <div className="px-5 py-3 bg-teal-50 border-b border-teal-100 flex items-center gap-2.5">
            <div className="w-8 h-8 bg-teal-600 rounded-lg flex items-center justify-center">
              <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
            </div>
            <div>
              <p className="text-sm font-bold text-gray-800">Participants</p>
              <p className="text-[10px] text-teal-600">{participants.length} member{participants.length !== 1 ? "s" : ""} added</p>
            </div>
          </div>
          <div className="p-5">
            <Select2
              isMulti
              value={participants.map((p) => p.id)}
              onChange={(ids) => {
                const arr = Array.isArray(ids) ? ids : [];
                setParticipants(arr.map((id) => {
                  const u = users.find((x) => String(x.id) === String(id));
                  return { id, name: u?.name || `Staff #${id}` };
                }));
              }}
              options={users.map((u) => ({
                value: u.id,
                label: `${u.name}${u.employee_id ? ` · ${u.employee_id}` : ""}${u.department ? ` · ${u.department}` : ""}`,
              }))}
              placeholder={users.length ? "Search staff to add as participants…" : "Loading staff…"}
            />
            {participants.length === 0 && (
              <p className="text-xs text-gray-400 italic mt-2">No participants added yet</p>
            )}
          </div>
        </div>

        {/* 3. Agenda Items */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm">
          <div className="px-5 py-3 bg-teal-50 border-b border-teal-100 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 bg-teal-600 rounded-lg flex items-center justify-center">
                <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" /></svg>
              </div>
              <div>
                <p className="text-sm font-bold text-gray-800">Agenda</p>
                <p className="text-[10px] text-teal-600">{agendaItems.filter((a) => a.title).length} item{agendaItems.filter((a) => a.title).length !== 1 ? "s" : ""} · {totalDuration > 0 ? `${totalDuration} min total` : "no duration set"}</p>
              </div>
            </div>
            <button type="button" onClick={addAgendaItem}
              className="px-2.5 py-1 bg-teal-600 text-white rounded-lg hover:bg-teal-700 text-[10px] font-medium flex items-center gap-1">
              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
              Add Item
            </button>
          </div>
          <div className="p-5 space-y-3">
            {agendaItems.map((item, i) => (
              <div key={i} className="bg-gray-50 rounded-xl p-4 border border-gray-100 relative group">
                {/* Order number */}
                <div className="absolute -left-1 -top-1 w-5 h-5 bg-teal-600 text-white rounded-full flex items-center justify-center text-[9px] font-bold">{i + 1}</div>

                <div className="grid grid-cols-1 sm:grid-cols-12 gap-3">
                  {/* Title */}
                  <div className="sm:col-span-5">
                    <label className="block text-[10px] font-semibold text-gray-500 mb-1">Topic *</label>
                    <input type="text" value={item.title} onChange={(e) => handleAgendaChange(i, "title", e.target.value)}
                      placeholder="Agenda topic" className="w-full px-2.5 py-2 border border-gray-200 rounded-lg text-xs focus:ring-1 focus:ring-teal-400 focus:outline-none" />
                  </div>
                  {/* Assigned to */}
                  <div className="sm:col-span-3">
                    <label className="block text-[10px] font-semibold text-gray-500 mb-1">Presenter</label>
                    <Select2
                      size="sm"
                      value={item.assigned_to_id}
                      onChange={(v) => handleAgendaChange(i, "assigned_to_id", v)}
                      options={users.map((u) => ({ value: u.id, label: u.name }))}
                      placeholder={users.length ? "Search staff…" : "Loading…"}
                    />
                  </div>
                  {/* Duration */}
                  <div className="sm:col-span-2">
                    <label className="block text-[10px] font-semibold text-gray-500 mb-1">Minutes</label>
                    <input type="number" min={1} value={item.duration_min} onChange={(e) => handleAgendaChange(i, "duration_min", e.target.value)}
                      placeholder="15" className="w-full px-2.5 py-2 border border-gray-200 rounded-lg text-xs focus:ring-1 focus:ring-teal-400 focus:outline-none" />
                  </div>
                  {/* Actions */}
                  <div className="sm:col-span-2 flex items-end gap-1">
                    <button type="button" onClick={() => moveAgenda(i, -1)} disabled={i === 0}
                      className="p-1.5 text-gray-400 hover:text-teal-600 hover:bg-teal-50 rounded-lg disabled:opacity-30 disabled:hover:bg-transparent disabled:hover:text-gray-400">
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" /></svg>
                    </button>
                    <button type="button" onClick={() => moveAgenda(i, 1)} disabled={i === agendaItems.length - 1}
                      className="p-1.5 text-gray-400 hover:text-teal-600 hover:bg-teal-50 rounded-lg disabled:opacity-30 disabled:hover:bg-transparent disabled:hover:text-gray-400">
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
                    </button>
                    {agendaItems.length > 1 && (
                      <button type="button" onClick={() => removeAgendaItem(i)} className="p-1.5 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg">
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                      </button>
                    )}
                  </div>
                </div>
                {/* Description row */}
                <div className="mt-2">
                  <input type="text" value={item.description} onChange={(e) => handleAgendaChange(i, "description", e.target.value)}
                    placeholder="Optional notes for this item..." className="w-full px-2.5 py-1.5 border border-gray-200 rounded-lg text-[10px] text-gray-500 focus:ring-1 focus:ring-teal-400 focus:outline-none" />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Summary */}
        {form.title && form.start_time && (
          <div className="bg-gradient-to-br from-teal-600 to-teal-700 rounded-2xl p-5 text-white">
            <h3 className="text-xs font-bold mb-3 flex items-center gap-2">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" /></svg>
              Meeting Summary
            </h3>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
              <div><span className="text-teal-200 block text-[9px]">Title</span><span className="font-medium">{form.title}</span></div>
              <div><span className="text-teal-200 block text-[9px]">When</span><span className="font-medium">{form.start_time ? fmtDateTime(form.start_time) : "-"}</span></div>
              <div><span className="text-teal-200 block text-[9px]">Participants</span><span className="font-medium">{participants.length} member{participants.length !== 1 ? "s" : ""}</span></div>
              <div><span className="text-teal-200 block text-[9px]">Agenda Items</span><span className="font-medium">{agendaItems.filter((a) => a.title).length} topic{agendaItems.filter((a) => a.title).length !== 1 ? "s" : ""}{totalDuration > 0 ? ` · ${totalDuration}min` : ""}</span></div>
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="flex items-center justify-between pt-2">
          <button type="button" onClick={() => navigate("/hr/meetings")}
            className="flex items-center gap-2 px-5 py-2.5 text-sm font-medium text-gray-600 bg-white border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" /></svg>
            Cancel
          </button>
          <button type="submit" disabled={saving}
            className="flex items-center gap-2 px-6 py-2.5 text-sm font-semibold text-white bg-teal-600 rounded-xl hover:bg-teal-700 transition-colors disabled:opacity-50">
            {saving ? (
              <><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>Saving...</>
            ) : (
              <><svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>{isEdit ? "Update Meeting" : "Schedule Meeting"}</>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}
