import { useState, useEffect, useRef, useCallback } from "react";
import { get, post, put, del } from "../../api/axios";
import { toastSuccess, toastError } from "../../utils/toast";
import { useAuth } from "../../admin/context/AuthContext";
import { TEAL, TEAL_LT, PAPER, Hero } from "./lessonPlanUi";
import StudentAvatar from "../../components/students/StudentAvatar";

/* Science projects (پروژهٔ ساینسی) — who took part and who was commended.
 * The result sheet's "school activities" box counts these by project date. */
const STATUSES = [["participated", "Participated"], ["commended", "Commended"]];
const today = () => new Date().toISOString().slice(0, 10);
const blank = () => ({ id: null, student: null, title: "", description: "", project_date: today(), status: "participated" });
const errorOf = (e) => e.response?.data?.message || Object.values(e.response?.data?.errors || {})[0]?.[0] || "Failed to save";

export default function ScienceProjects() {
  const { hasPermission } = useAuth();
  const [rows, setRows] = useState([]);
  const [meta, setMeta] = useState({ current_page: 1, last_page: 1 });
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState(null);

  const load = useCallback(() => {
    setLoading(true);
    get("/science-projects", { params: { page, search: search.trim() || undefined, status: status || undefined } })
      .then((r) => { setRows(r.data?.data || []); setMeta({ current_page: r.data?.current_page || 1, last_page: r.data?.last_page || 1 }); })
      .catch(() => setRows([]))
      .finally(() => setLoading(false));
  }, [page, search, status]);

  useEffect(() => { const t = setTimeout(load, 250); return () => clearTimeout(t); }, [load]);

  const remove = async (row) => {
    if (!window.confirm(`Delete "${row.title}"?`)) return;
    try { await del(`/science-projects/${row.id}`); toastSuccess("Deleted"); load(); } catch (e) { toastError(errorOf(e)); }
  };

  return (
    <div style={{ background: PAPER, minHeight: "100vh" }} className="pb-10">
      <Hero title="Science Projects" subtitle="پروژهٔ ساینسی — students who took part or were commended" />
      <div className="max-w-5xl mx-auto px-4 py-5 space-y-4">
        <div className="flex flex-wrap items-center gap-2">
          <input value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} placeholder="Search title or student…" className={`${inp} flex-1 min-w-[200px]`} />
          <select value={status} onChange={(e) => { setStatus(e.target.value); setPage(1); }} className={`${inp} w-auto`}>
            <option value="">All statuses</option>
            {STATUSES.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
          </select>
          {hasPermission("science-projects.create") && (
            <button onClick={() => setForm(blank())} className="px-4 py-2.5 rounded-xl text-sm font-bold text-white" style={{ background: `linear-gradient(120deg, ${TEAL_LT}, ${TEAL})` }}>+ New project</button>
          )}
        </div>

        <div className="bg-white rounded-2xl border shadow-sm overflow-x-auto" style={{ borderColor: "#dbe8e8" }}>
          <table className="w-full text-sm">
            <thead><tr className="text-[10px] uppercase tracking-wider text-gray-400 text-left">
              <th className="p-3">Student</th><th className="p-3">Project</th><th className="p-3">Date</th><th className="p-3">Status</th><th className="p-3" />
            </tr></thead>
            <tbody>
              {loading ? <tr><td colSpan={5} className="p-6 text-center text-gray-400">Loading…</td></tr>
                : rows.length === 0 ? <tr><td colSpan={5} className="p-6 text-center text-gray-400">No science projects yet.</td></tr>
                : rows.map((row) => (
                  <tr key={row.id} className="border-t" style={{ borderColor: "#f0f4f4" }}>
                    <td className="p-3"><div className="flex items-center gap-2">
                      <StudentAvatar student={row.student || {}} size="sm" rounded="rounded-lg" />
                      <div><p className="font-bold text-gray-800">{row.student?.first_name} {row.student?.last_name}</p>
                        <p className="text-[10px] text-gray-400">{row.student?.student_id} · {row.student?.school_class?.class_name || "—"}</p></div>
                    </div></td>
                    <td className="p-3"><p className="font-semibold text-gray-700" dir="auto">{row.title}</p>{row.description && <p className="text-[11px] text-gray-400 line-clamp-1" dir="auto">{row.description}</p>}</td>
                    <td className="p-3 text-gray-500 whitespace-nowrap">{row.project_date}</td>
                    <td className="p-3"><span className="px-2 py-1 rounded-lg text-[11px] font-bold" style={row.status === "commended" ? { background: "#fbf3dc", color: "#a07a14" } : { background: "#E8F6F6", color: TEAL }}>
                      {row.status === "commended" ? "Commended" : "Participated"}</span></td>
                    <td className="p-3 text-right whitespace-nowrap">
                      {hasPermission("science-projects.update") && <button onClick={() => setForm({ ...row, student: row.student })} className="text-[11px] font-bold px-2 py-1 rounded-lg hover:bg-teal-50" style={{ color: TEAL }}>Edit</button>}
                      {hasPermission("science-projects.delete") && <button onClick={() => remove(row)} className="text-[11px] font-bold px-2 py-1 rounded-lg text-red-500 hover:bg-red-50">Delete</button>}
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>

        {meta.last_page > 1 && (
          <div className="flex items-center justify-center gap-2 text-sm">
            <button disabled={page <= 1} onClick={() => setPage((p) => p - 1)} className="px-3 py-1.5 rounded-lg border bg-white disabled:opacity-40">Previous</button>
            <span className="text-gray-500">{meta.current_page} / {meta.last_page}</span>
            <button disabled={page >= meta.last_page} onClick={() => setPage((p) => p + 1)} className="px-3 py-1.5 rounded-lg border bg-white disabled:opacity-40">Next</button>
          </div>
        )}
      </div>

      {form && <ProjectForm initial={form} onClose={() => setForm(null)} onSaved={() => { setForm(null); load(); }} />}
    </div>
  );
}

function ProjectForm({ initial, onClose, onSaved }) {
  const [form, setForm] = useState(initial);
  const [saving, setSaving] = useState(false);
  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const submit = async () => {
    if (!form.student) { toastError("Pick a student first."); return; }
    setSaving(true);
    const body = { student_id: form.student.id, title: form.title, description: form.description || null, project_date: form.project_date, status: form.status };
    try {
      if (form.id) await put(`/science-projects/${form.id}`, body); else await post("/science-projects", body);
      toastSuccess("Saved");
      onSaved();
    } catch (e) { toastError(errorOf(e)); } finally { setSaving(false); }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg p-5 space-y-3" onClick={(e) => e.stopPropagation()}>
        <h3 className="font-bold text-gray-800">{form.id ? "Edit science project" : "New science project"}</h3>
        <StudentPicker student={form.student} onPick={(s) => set("student", s)} />
        <Field label="Project title *"><input value={form.title} onChange={(e) => set("title", e.target.value)} className={inp} dir="auto" /></Field>
        <Field label="Description"><textarea value={form.description || ""} onChange={(e) => set("description", e.target.value)} rows={3} className={`${inp} resize-none`} dir="auto" /></Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Date *"><input type="date" value={form.project_date || ""} onChange={(e) => set("project_date", e.target.value)} className={inp} /></Field>
          <Field label="Status *"><select value={form.status} onChange={(e) => set("status", e.target.value)} className={inp}>
            {STATUSES.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
          </select></Field>
        </div>
        <div className="flex justify-end gap-2 pt-1">
          <button onClick={onClose} className="px-4 py-2 rounded-xl text-sm font-bold text-gray-500 hover:bg-gray-100">Cancel</button>
          <button onClick={submit} disabled={saving} className="px-5 py-2 rounded-xl text-sm font-bold text-white disabled:opacity-50" style={{ background: TEAL }}>{saving ? "Saving…" : "Save"}</button>
        </div>
      </div>
    </div>
  );
}

function StudentPicker({ student, onPick }) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState([]);
  const [open, setOpen] = useState(false);
  const boxRef = useRef(null);

  useEffect(() => {
    const q = query.trim();
    if (!q) return undefined;
    const t = setTimeout(() => {
      get(`/student-management/student-profiles/search?q=${encodeURIComponent(q)}`).then((r) => setResults(r.data?.data || [])).catch(() => setResults([]));
    }, 300);
    return () => clearTimeout(t);
  }, [query]);

  useEffect(() => {
    const close = (e) => { if (boxRef.current && !boxRef.current.contains(e.target)) setOpen(false); };
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, []);

  if (student) return (
    <Field label="Student *"><div className="flex items-center justify-between gap-2 px-3 py-2 rounded-xl" style={{ background: "#E8F6F6" }}>
      <span className="text-sm font-bold text-gray-800">{student.first_name} {student.last_name} <span className="text-[11px] text-gray-500 font-normal">{student.student_id}</span></span>
      <button onClick={() => onPick(null)} className="text-[11px] font-bold" style={{ color: TEAL }}>Change</button>
    </div></Field>
  );

  return (
    <Field label="Student *"><div className="relative" ref={boxRef}>
      <input value={query} onChange={(e) => { setQuery(e.target.value); setOpen(true); }} onFocus={() => setOpen(true)} placeholder="Search by name or student ID…" className={inp} />
      {open && query.trim() && results.length > 0 && (
        <div className="absolute z-20 w-full mt-1 bg-white border rounded-xl shadow-lg max-h-56 overflow-y-auto">
          {results.map((s) => (
            <button key={s.id} onClick={() => { onPick(s); setQuery(""); setOpen(false); }} className="w-full text-left px-3 py-2 hover:bg-teal-50 border-b last:border-0 text-xs">
              <b className="text-gray-800">{s.first_name} {s.last_name}</b> <span className="text-gray-400">{s.student_id} · {s.school_class?.class_name || "—"}</span>
            </button>
          ))}
        </div>
      )}
    </div></Field>
  );
}

function Field({ label, children }) {
  return <div><label className="block text-[10px] font-bold uppercase tracking-wider text-gray-400 mb-1.5">{label}</label>{children}</div>;
}

const inp = "px-3 py-2.5 border rounded-xl text-sm bg-white focus:outline-none focus:ring-2 focus:ring-teal-300 w-full";
