import { useState, useEffect, useCallback } from "react";
import { get, post, put, del } from "../../api/axios";
import Swal from "sweetalert2";
import Select2 from "../../components/hr/Select2";
import { useResourcePermissions } from "../../admin/utils/useResourcePermissions";

/** Shared progress bar — colour shifts from amber → teal → emerald as it fills. */
function ProgressBar({ percent, height = "h-2.5" }) {
  const p = Math.max(0, Math.min(100, percent || 0));
  const color = p >= 100 ? "bg-emerald-500" : p >= 50 ? "bg-teal-500" : p > 0 ? "bg-amber-500" : "bg-gray-300";
  return (
    <div className={`w-full ${height} bg-gray-100 rounded-full overflow-hidden`}>
      <div className={`h-full ${color} rounded-full transition-all duration-500`} style={{ width: `${p}%` }} />
    </div>
  );
}

export default function DailyWorks() {
  const { canCreate, canUpdate, canDelete } = useResourcePermissions("daily-works");
  const isAdmin = canCreate || canUpdate || canDelete;

  const [tab, setTab] = useState("my"); // my | assign | monitor

  return (
    <div className="min-h-screen bg-gray-50/60">
      <div className="bg-teal-600 px-5 py-4">
        <h1 className="text-sm font-bold text-white">Daily Works</h1>
        <p className="text-xs text-teal-100 mt-0.5">Your daily checklist{isAdmin ? " · assign & monitor your team" : ""}</p>
        {isAdmin && (
          <div className="flex gap-1 mt-3">
            {[
              { key: "my", label: "My Works" },
              { key: "assign", label: "Assign" },
              { key: "monitor", label: "Monitor" },
            ].map((t) => (
              <button key={t.key} onClick={() => setTab(t.key)}
                className={`px-3 py-1.5 rounded-lg text-[11px] font-semibold transition-colors ${tab === t.key ? "bg-white text-teal-700" : "bg-white/15 text-white hover:bg-white/25"}`}>
                {t.label}
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="px-4 py-5">
        {tab === "my" && <MyWorks />}
        {tab === "assign" && isAdmin && <AssignWorks canCreate={canCreate} canUpdate={canUpdate} canDelete={canDelete} />}
        {tab === "monitor" && isAdmin && <MonitorWorks />}
      </div>
    </div>
  );
}

/* ─────────────────────── My checklist ─────────────────────── */
function MyWorks() {
  const today = new Date().toLocaleDateString("en-CA"); // YYYY-MM-DD in local tz
  // null = "today" — let the backend (Asia/Kabul) decide, so toggling works
  // even if the browser's clock is in a different timezone.
  const [date, setDate] = useState(null);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await get(`/hr/daily-works/my${date ? `?date=${date}` : ""}`);
      setData(res.data);
    } catch {
      setData(null);
    } finally {
      setLoading(false);
    }
  }, [date]);

  useEffect(() => { load(); }, [load]);

  const toggle = async (task) => {
    if (!data?.is_today) return; // history is read-only
    setBusyId(task.id);
    const next = !task.completed;
    try {
      const res = await post(`/hr/daily-works/${task.id}/toggle`, { completed: next });
      setData((prev) => ({
        ...prev,
        summary: res.data.summary,
        tasks: prev.tasks.map((t) => (t.id === task.id ? { ...t, completed: next, completed_at: next ? new Date().toISOString() : null } : t)),
      }));
    } catch (err) {
      Swal.fire("Error", err.response?.data?.message || "Could not update", "error");
    } finally {
      setBusyId(null);
    }
  };

  if (loading) return <div className="flex justify-center py-16"><div className="w-8 h-8 border-2 border-teal-600 border-t-transparent rounded-full animate-spin" /></div>;

  if (data && !data.is_staff) {
    return <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-10 text-center text-sm text-gray-400">
      You don't have a staff profile linked, so there are no daily works to show.
    </div>;
  }

  const s = data?.summary || { total: 0, completed: 0, percent: 0 };

  return (
    <div className="max-w-2xl mx-auto space-y-4">
      {/* Progress card */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
        <div className="flex items-center justify-between mb-2">
          <div>
            <p className="text-sm font-bold text-gray-800">{data?.is_today ? "Today's progress" : "Progress"}</p>
            <p className="text-[11px] text-gray-500">{s.completed} of {s.total} done</p>
          </div>
          <div className="flex items-center gap-3">
            <input type="date" value={date || data?.date || today} max={today} onChange={(e) => setDate(e.target.value || null)}
              className="px-2 py-1.5 border border-gray-200 rounded-lg text-xs bg-white focus:ring-2 focus:ring-teal-400 outline-none" />
            <span className="text-2xl font-black text-teal-700 w-14 text-right">{s.percent}%</span>
          </div>
        </div>
        <ProgressBar percent={s.percent} height="h-3" />
        {!data?.is_today && <p className="text-[10px] text-gray-400 mt-2">Viewing a past day — read only.</p>}
      </div>

      {/* Checklist */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        {(data?.tasks || []).length === 0 ? (
          <div className="p-10 text-center text-sm text-gray-400">No daily works assigned to you.</div>
        ) : (
          <div className="divide-y divide-gray-100">
            {data.tasks.map((t) => (
              <button key={t.id} onClick={() => toggle(t)} disabled={!data.is_today || busyId === t.id}
                className={`w-full flex items-start gap-3 px-4 py-3 text-left transition-colors ${data.is_today ? "hover:bg-gray-50/60 cursor-pointer" : "cursor-default"} ${busyId === t.id ? "opacity-60" : ""}`}>
                <span className={`mt-0.5 w-5 h-5 rounded-md border-2 flex items-center justify-center flex-shrink-0 transition-colors ${t.completed ? "bg-emerald-500 border-emerald-500" : "border-gray-300"}`}>
                  {t.completed && (
                    <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>
                  )}
                </span>
                <div className="min-w-0 flex-1">
                  <p className={`text-xs font-semibold ${t.completed ? "text-gray-400 line-through" : "text-gray-800"}`}>{t.title}</p>
                  {t.description && <p className="text-[11px] text-gray-500 mt-0.5">{t.description}</p>}
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

/* ─────────────────────── Admin: assign & manage ─────────────────────── */
function AssignWorks({ canCreate, canUpdate, canDelete }) {
  const [items, setItems] = useState([]);
  const [staffList, setStaffList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(null); // { mode: 'create'|'edit', form }
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await get("/hr/daily-works");
      setItems(res.data?.data || []);
    } catch { setItems([]); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);
  useEffect(() => {
    get("/hr/daily-works/staff-list")
      .then((r) => setStaffList(r.data?.data || []))
      .catch(() => setStaffList([]));
  }, []);

  const openCreate = () => setModal({ mode: "create", form: { staff_ids: [], items: [{ title: "", description: "" }] } });
  const openEdit = (it) => setModal({ mode: "edit", id: it.id, form: { staff_id: it.staff_id, title: it.title, description: it.description || "", is_active: it.is_active } });

  const save = async () => {
    const f = modal.form;
    if (modal.mode === "create") {
      if (!f.staff_ids || f.staff_ids.length === 0) { Swal.fire("Missing", "Pick at least one staff member", "warning"); return; }
      const tasks = (f.items || []).filter((i) => i.title.trim()).map((i) => ({ title: i.title.trim(), description: i.description?.trim() || null }));
      if (tasks.length === 0) { Swal.fire("Missing", "Add at least one task with a title", "warning"); return; }
      setSaving(true);
      try {
        const res = await post("/hr/daily-works", { staff_ids: f.staff_ids, tasks });
        Swal.fire({ icon: "success", title: res.data?.message || "Assigned", timer: 1600, showConfirmButton: false, toast: true, position: "top-end" });
        setModal(null);
        load();
      } catch (err) {
        Swal.fire("Error", err.response?.data?.message || "Failed to save", "error");
      } finally {
        setSaving(false);
      }
      return;
    }
    // Edit mode (single task)
    if (!f.title.trim()) { Swal.fire("Missing", "Enter a task title", "warning"); return; }
    setSaving(true);
    try {
      await put(`/hr/daily-works/${modal.id}`, { title: f.title, description: f.description, is_active: f.is_active, staff_id: f.staff_id });
      Swal.fire({ icon: "success", title: "Updated", timer: 1200, showConfirmButton: false, toast: true, position: "top-end" });
      setModal(null);
      load();
    } catch (err) {
      Swal.fire("Error", err.response?.data?.message || "Failed to save", "error");
    } finally {
      setSaving(false);
    }
  };

  const toggleActive = async (it) => {
    try {
      await put(`/hr/daily-works/${it.id}`, { is_active: !it.is_active });
      setItems((p) => p.map((x) => (x.id === it.id ? { ...x, is_active: !x.is_active } : x)));
    } catch (err) { Swal.fire("Error", err.response?.data?.message || "Failed", "error"); }
  };

  const remove = async (it) => {
    const r = await Swal.fire({ title: "Remove this daily work?", text: it.title, icon: "warning", showCancelButton: true, confirmButtonColor: "#ef4444", confirmButtonText: "Remove" });
    if (!r.isConfirmed) return;
    try {
      await del(`/hr/daily-works/${it.id}`);
      setItems((p) => p.filter((x) => x.id !== it.id));
      Swal.fire({ icon: "success", title: "Removed", timer: 1200, showConfirmButton: false, toast: true, position: "top-end" });
    } catch (err) { Swal.fire("Error", err.response?.data?.message || "Failed", "error"); }
  };

  // Group by staff for a tidy list.
  const grouped = items.reduce((acc, it) => {
    (acc[it.staff_id] = acc[it.staff_id] || { staff_name: it.staff_name, department: it.department, rows: [] }).rows.push(it);
    return acc;
  }, {});

  return (
    <div className="max-w-4xl mx-auto space-y-4">
      {canCreate && (
        <div className="flex justify-end">
          <button onClick={openCreate} className="flex items-center gap-2 px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white text-xs font-semibold rounded-xl">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
            Assign Daily Work
          </button>
        </div>
      )}

      {loading ? (
        <div className="flex justify-center py-16"><div className="w-8 h-8 border-2 border-teal-600 border-t-transparent rounded-full animate-spin" /></div>
      ) : Object.keys(grouped).length === 0 ? (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-10 text-center text-sm text-gray-400">No daily works assigned yet.</div>
      ) : (
        Object.entries(grouped).map(([sid, g]) => (
          <div key={sid} className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
            <div className="px-4 py-2.5 bg-gray-50 border-b border-gray-100 flex items-center justify-between">
              <p className="text-xs font-bold text-gray-700">{g.staff_name}{g.department ? ` · ${g.department}` : ""}</p>
              <span className="text-[10px] text-gray-400">{g.rows.length} task{g.rows.length === 1 ? "" : "s"}</span>
            </div>
            <div className="divide-y divide-gray-100">
              {g.rows.map((it) => (
                <div key={it.id} className="px-4 py-3 flex items-start gap-3">
                  <div className="flex-1 min-w-0">
                    <p className={`text-xs font-semibold ${it.is_active ? "text-gray-800" : "text-gray-400 line-through"}`}>{it.title}</p>
                    {it.description && <p className="text-[11px] text-gray-500 mt-0.5">{it.description}</p>}
                    {!it.is_active && <span className="text-[9px] font-bold text-gray-400 uppercase">Paused</span>}
                  </div>
                  <div className="flex items-center gap-1 flex-shrink-0">
                    {canUpdate && (
                      <button onClick={() => toggleActive(it)} title={it.is_active ? "Pause" : "Activate"}
                        className={`px-2 py-1 rounded-lg text-[10px] font-bold ${it.is_active ? "text-amber-600 hover:bg-amber-50" : "text-emerald-600 hover:bg-emerald-50"}`}>
                        {it.is_active ? "Pause" : "Activate"}
                      </button>
                    )}
                    {canUpdate && (
                      <button onClick={() => openEdit(it)} className="p-1.5 text-gray-500 hover:text-teal-600 hover:bg-teal-50 rounded-lg" title="Edit">
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                      </button>
                    )}
                    {canDelete && (
                      <button onClick={() => remove(it)} className="p-1.5 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-lg" title="Remove">
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))
      )}

      {/* Create / Edit modal */}
      {modal && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={() => setModal(null)}>
          <div className="bg-white rounded-2xl shadow-xl max-w-md w-full max-h-[90vh] flex flex-col overflow-hidden" onClick={(e) => e.stopPropagation()}>
            <div className="px-5 py-4 bg-teal-600">
              <h3 className="text-sm font-bold text-white">{modal.mode === "create" ? "Assign Daily Work" : "Edit Daily Work"}</h3>
            </div>
            <div className="p-5 space-y-3 overflow-y-auto">
              {modal.mode === "create" ? (
                <div>
                  <label className="block text-[11px] font-semibold text-gray-600 mb-1.5">Staff *</label>
                  <Select2 isMulti value={modal.form.staff_ids}
                    onChange={(v) => setModal((m) => ({ ...m, form: { ...m.form, staff_ids: v || [] } }))}
                    options={staffList.map((s) => ({ value: s.id, label: s.full_name + (s.department ? ` · ${s.department}` : "") }))}
                    placeholder="Select one or more staff…" />
                </div>
              ) : (
                <div>
                  <label className="block text-[11px] font-semibold text-gray-600 mb-1.5">Staff</label>
                  <Select2 value={modal.form.staff_id}
                    onChange={(v) => setModal((m) => ({ ...m, form: { ...m.form, staff_id: v } }))}
                    options={staffList.map((s) => ({ value: s.id, label: s.full_name + (s.department ? ` · ${s.department}` : "") }))}
                    placeholder="Select staff…" />
                </div>
              )}
              {modal.mode === "create" ? (
                <div className="space-y-2">
                  <label className="block text-[11px] font-semibold text-gray-600">Tasks * <span className="font-normal text-gray-400">(add as many as you like)</span></label>
                  {modal.form.items.map((it, idx) => (
                    <div key={idx} className="rounded-xl border border-gray-200 p-2.5 space-y-2 bg-gray-50/40">
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-bold text-gray-400 w-5">#{idx + 1}</span>
                        <input value={it.title}
                          onChange={(e) => setModal((m) => { const items = [...m.form.items]; items[idx] = { ...items[idx], title: e.target.value }; return { ...m, form: { ...m.form, items } }; })}
                          placeholder="Task title…" className="flex-1 px-3 py-2 border border-gray-200 rounded-lg text-xs focus:ring-2 focus:ring-teal-400 bg-white" />
                        {modal.form.items.length > 1 && (
                          <button onClick={() => setModal((m) => ({ ...m, form: { ...m.form, items: m.form.items.filter((_, i) => i !== idx) } }))}
                            className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg" title="Remove task">
                            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                          </button>
                        )}
                      </div>
                      <textarea value={it.description}
                        onChange={(e) => setModal((m) => { const items = [...m.form.items]; items[idx] = { ...items[idx], description: e.target.value }; return { ...m, form: { ...m.form, items } }; })}
                        rows={2} placeholder="Optional details…" className="w-full px-3 py-2 border border-gray-200 rounded-lg text-xs focus:ring-2 focus:ring-teal-400 bg-white resize-none" />
                    </div>
                  ))}
                  <button onClick={() => setModal((m) => ({ ...m, form: { ...m.form, items: [...m.form.items, { title: "", description: "" }] } }))}
                    className="w-full py-2 border border-dashed border-teal-300 text-teal-700 text-xs font-semibold rounded-xl hover:bg-teal-50">
                    + Add another task
                  </button>
                </div>
              ) : (
                <>
                  <div>
                    <label className="block text-[11px] font-semibold text-gray-600 mb-1.5">Task title *</label>
                    <input value={modal.form.title} onChange={(e) => setModal((m) => ({ ...m, form: { ...m.form, title: e.target.value } }))}
                      placeholder="e.g. Submit attendance report" className="w-full px-3 py-2 border border-gray-200 rounded-xl text-xs focus:ring-2 focus:ring-teal-400 bg-white" />
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-gray-600 mb-1.5">Description</label>
                    <textarea value={modal.form.description} onChange={(e) => setModal((m) => ({ ...m, form: { ...m.form, description: e.target.value } }))}
                      rows={3} placeholder="Optional details…" className="w-full px-3 py-2 border border-gray-200 rounded-xl text-xs focus:ring-2 focus:ring-teal-400 bg-white resize-none" />
                  </div>
                  <label className="flex items-center gap-2 text-xs text-gray-700">
                    <input type="checkbox" checked={!!modal.form.is_active} onChange={(e) => setModal((m) => ({ ...m, form: { ...m.form, is_active: e.target.checked } }))} />
                    Active (appears on the staff's daily checklist)
                  </label>
                </>
              )}
            </div>
            <div className="px-5 py-3 bg-gray-50 border-t border-gray-100 flex justify-end gap-2">
              <button onClick={() => setModal(null)} className="px-4 py-2 text-xs font-semibold text-gray-600 bg-white border border-gray-200 rounded-xl hover:bg-gray-50">Cancel</button>
              <button onClick={save} disabled={saving} className="px-5 py-2 text-xs font-semibold text-white bg-teal-600 hover:bg-teal-700 rounded-xl disabled:opacity-50">
                {saving ? "Saving…" : modal.mode === "create" ? "Assign" : "Save"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* ─────────────────────── Admin: monitor ─────────────────────── */
function MonitorWorks() {
  const today = new Date().toLocaleDateString("en-CA");
  const [date, setDate] = useState(today);
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const r = await get(`/hr/daily-works/overview?date=${date}`);
      setRows(r.data?.rows || []);
    } catch { setRows([]); }
    finally { setLoading(false); }
  }, [date]);

  useEffect(() => { load(); }, [load]);

  const teamPercent = rows.length ? Math.round(rows.reduce((s, r) => s + r.percent, 0) / rows.length) : 0;

  return (
    <div className="max-w-4xl mx-auto space-y-4">
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
        <div className="flex items-center justify-between mb-2">
          <div>
            <p className="text-sm font-bold text-gray-800">Team progress</p>
            <p className="text-[11px] text-gray-500">{rows.length} staff with daily works</p>
          </div>
          <div className="flex items-center gap-3">
            <input type="date" value={date} max={today} onChange={(e) => setDate(e.target.value || today)}
              className="px-2 py-1.5 border border-gray-200 rounded-lg text-xs bg-white focus:ring-2 focus:ring-teal-400 outline-none" />
            <span className="text-2xl font-black text-teal-700 w-14 text-right">{teamPercent}%</span>
          </div>
        </div>
        <ProgressBar percent={teamPercent} height="h-3" />
      </div>

      {loading ? (
        <div className="flex justify-center py-16"><div className="w-8 h-8 border-2 border-teal-600 border-t-transparent rounded-full animate-spin" /></div>
      ) : rows.length === 0 ? (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-10 text-center text-sm text-gray-400">No daily works assigned for this day.</div>
      ) : (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm divide-y divide-gray-100">
          {rows.map((r) => (
            <div key={r.staff_id} className="px-4 py-3 flex items-center gap-4">
              <div className="w-7 h-7 rounded-full bg-teal-100 text-teal-700 flex items-center justify-center text-[10px] font-bold flex-shrink-0">
                {(r.staff_name || "?").split(" ").map((w) => w[0]).slice(0, 2).join("").toUpperCase()}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between mb-1">
                  <p className="text-xs font-semibold text-gray-800 truncate">{r.staff_name}{r.department ? <span className="text-gray-400 font-normal"> · {r.department}</span> : null}</p>
                  <span className="text-[11px] font-bold text-gray-600 ml-2 flex-shrink-0">{r.completed}/{r.total} · {r.percent}%</span>
                </div>
                <ProgressBar percent={r.percent} />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
