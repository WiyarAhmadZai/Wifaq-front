import { useCallback, useEffect, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";
import Swal from "sweetalert2";
import {
  FiAlertTriangle, FiPlus, FiX, FiPaperclip, FiCheckCircle, FiClock,
  FiSearch, FiTrash2, FiImage,
} from "react-icons/fi";
import { bugsApi } from "../../api/bugs";
import { API_BASE_URL } from "../../api/axios";

const TEAL = "#0D5C63";
const ORIGIN = (API_BASE_URL || "http://localhost:8000").replace(/\/api\/?$/, "");
const fileUrl = (p) => (p ? (p.startsWith("http") ? p : `${ORIGIN}/storage/${p}`) : null);

const CATEGORIES = [
  { v: "bug", l: "Bug" },
  { v: "error", l: "System error" },
  { v: "suggestion", l: "Suggestion" },
];
const SEVERITIES = [
  { v: "low", l: "Low" },
  { v: "medium", l: "Medium" },
  { v: "high", l: "High" },
  { v: "critical", l: "Critical" },
];
const SEV_TONE = {
  low: "bg-gray-100 text-gray-600",
  medium: "bg-blue-100 text-blue-700",
  high: "bg-amber-100 text-amber-700",
  critical: "bg-red-100 text-red-700",
};
const STATUS_TONE = {
  open: "bg-amber-100 text-amber-700",
  in_progress: "bg-blue-100 text-blue-700",
  resolved: "bg-emerald-100 text-emerald-700",
};
const statusLabel = (s) => (s === "in_progress" ? "In progress" : s?.[0]?.toUpperCase() + s?.slice(1));
const fmt = (iso) => (iso ? new Date(iso).toLocaleString([], { dateStyle: "medium", timeStyle: "short" }) : "—");

export default function Bugs() {
  const [searchParams] = useSearchParams();
  const highlightId = searchParams.get("highlight");

  const [rows, setRows] = useState([]);
  const [meta, setMeta] = useState(null);
  const [canManage, setCanManage] = useState(false);
  const [openCount, setOpenCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [scope, setScope] = useState("all"); // manager only: all | mine
  const [status, setStatus] = useState("");
  const [search, setSearch] = useState("");
  const [showReport, setShowReport] = useState(false);
  const [detailBug, setDetailBug] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await bugsApi.list({ page, scope, status: status || undefined, search: search || undefined, per_page: 20 });
      setRows(res.data?.data || []);
      setMeta(res.data?.meta || null);
      setCanManage(Boolean(res.data?.can_manage));
      setOpenCount(res.data?.open_count || 0);
    } catch (e) {
      Swal.fire("Error", e.response?.data?.message || "Failed to load reports", "error");
    } finally {
      setLoading(false);
    }
  }, [page, scope, status, search]);

  useEffect(() => {
    const t = setTimeout(load, search ? 300 : 0);
    return () => clearTimeout(t);
  }, [load, search]);

  useEffect(() => { setPage(1); }, [scope, status, search]);

  // Deep-link from a notification → open that report.
  useEffect(() => {
    if (!highlightId || rows.length === 0) return;
    const found = rows.find((r) => String(r.id) === String(highlightId));
    if (found) setDetailBug(found);
  }, [highlightId, rows]);

  return (
    <div className="min-h-screen bg-gray-50/60">
      {/* Header */}
      <div className="px-5 py-4" style={{ background: TEAL }}>
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-white/15 flex items-center justify-center">
              <FiAlertTriangle className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-sm font-bold text-white">Bugs &amp; Errors</h1>
              <p className="text-xs text-teal-100 mt-0.5">
                Report a problem to the development team{canManage ? " · you can resolve reports" : " and track its status"}.
              </p>
            </div>
          </div>
          <button
            onClick={() => setShowReport(true)}
            className="inline-flex items-center gap-1.5 px-3 py-2 bg-white text-teal-800 rounded-xl text-xs font-semibold hover:bg-teal-50"
          >
            <FiPlus className="w-4 h-4" /> Report a Bug
          </button>
        </div>
      </div>

      <div className="px-4 py-5 max-w-4xl mx-auto space-y-4">
        {/* Filters */}
        <div className="flex flex-wrap items-center gap-2">
          {canManage && (
            <div className="flex rounded-xl overflow-hidden border border-gray-200 bg-white text-xs">
              {["all", "mine"].map((s) => (
                <button key={s} onClick={() => setScope(s)}
                  className={`px-3 py-1.5 font-semibold ${scope === s ? "text-white" : "text-gray-600 hover:bg-gray-50"}`}
                  style={scope === s ? { background: TEAL } : {}}>
                  {s === "all" ? "All reports" : "My reports"}
                </button>
              ))}
            </div>
          )}
          {["", "open", "in_progress", "resolved"].map((s) => (
            <button key={s || "any"} onClick={() => setStatus(s)}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold ${status === s ? "text-white" : "text-gray-600 bg-white border border-gray-200 hover:bg-gray-50"}`}
              style={status === s ? { background: TEAL } : {}}>
              {s === "" ? "Any status" : statusLabel(s)}
            </button>
          ))}
          <div className="relative flex-1 min-w-[160px]">
            <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
            <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search reports"
              className="w-full pl-9 pr-3 py-1.5 rounded-xl text-xs border border-gray-200 focus:outline-none focus:ring-2 focus:ring-teal-400" />
          </div>
          {/* Counts what the filters actually match — meta.total already
            * accounts for scope, status and search — so the chip follows the
            * selected tab instead of always reporting unresolved reports.
            * With no status tab chosen it falls back to the unresolved total,
            * which is the number worth surfacing when nothing is filtered. */}
          {status ? (
            <span className={`px-2 py-1 rounded-full text-[11px] font-semibold ${STATUS_TONE[status]}`}>
              {meta?.total ?? 0} {statusLabel(status).toLowerCase()}
            </span>
          ) : openCount > 0 && (
            <span className="px-2 py-1 rounded-full bg-amber-100 text-amber-700 text-[11px] font-semibold">
              {openCount} open
            </span>
          )}
        </div>

        {/* List */}
        {loading ? (
          <div className="flex justify-center py-16">
            <div className="w-7 h-7 border-2 rounded-full animate-spin" style={{ borderColor: "#cfe4e4", borderTopColor: TEAL }} />
          </div>
        ) : rows.length === 0 ? (
          <div className="bg-white rounded-2xl border border-gray-100 p-10 text-center">
            <FiAlertTriangle className="w-8 h-8 text-gray-300 mx-auto mb-2" />
            <p className="text-sm text-gray-500">No reports yet.</p>
            <button onClick={() => setShowReport(true)} className="mt-3 text-xs font-semibold text-teal-600 hover:underline">
              Report your first bug
            </button>
          </div>
        ) : (
          <div className="space-y-2.5">
            {rows.map((b) => (
              <button key={b.id} onClick={() => setDetailBug(b)}
                className={`w-full text-left bg-white rounded-2xl border shadow-sm p-4 hover:border-teal-200 transition-colors ${String(b.id) === String(highlightId) ? "border-teal-400 ring-1 ring-teal-200" : "border-gray-100"}`}>
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-semibold text-gray-800 truncate">{b.title}</span>
                      <span className={`px-1.5 py-0.5 rounded-full text-[9px] font-bold uppercase ${SEV_TONE[b.severity]}`}>{b.severity}</span>
                      <span className="px-1.5 py-0.5 rounded-full text-[9px] font-semibold bg-gray-100 text-gray-500">{b.category}</span>
                    </div>
                    <p className="text-xs text-gray-500 mt-1 line-clamp-2">{b.description}</p>
                    <p className="text-[10px] text-gray-400 mt-1.5">
                      {canManage && b.reporter ? `${b.reporter.name} · ` : ""}{fmt(b.created_at)}
                      {b.screenshots?.length ? ` · 📎 ${b.screenshots.length}` : ""}
                    </p>
                  </div>
                  <span className={`flex-shrink-0 inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold ${STATUS_TONE[b.status]}`}>
                    {b.status === "resolved" ? <FiCheckCircle className="w-3 h-3" /> : <FiClock className="w-3 h-3" />}
                    {statusLabel(b.status)}
                  </span>
                </div>
              </button>
            ))}
          </div>
        )}

        {/* Pagination */}
        {meta && meta.last_page > 1 && (
          <div className="flex items-center justify-center gap-1.5 pt-1">
            <PageBtn disabled={meta.current_page === 1} onClick={() => setPage(meta.current_page - 1)}>‹ Prev</PageBtn>
            <span className="text-[11px] text-gray-500 px-2">Page {meta.current_page} of {meta.last_page}</span>
            <PageBtn disabled={meta.current_page === meta.last_page} onClick={() => setPage(meta.current_page + 1)}>Next ›</PageBtn>
          </div>
        )}
      </div>

      {showReport && <ReportModal onClose={() => setShowReport(false)} onSaved={() => { setShowReport(false); load(); }} />}
      {detailBug && (
        <DetailModal
          bug={detailBug}
          canManage={canManage}
          onClose={() => setDetailBug(null)}
          onChanged={(updated) => { setDetailBug(updated); load(); }}
        />
      )}
    </div>
  );
}

function PageBtn({ children, onClick, disabled }) {
  return (
    <button onClick={onClick} disabled={disabled}
      className="px-2.5 py-1 rounded-lg text-[11px] font-semibold border bg-white border-gray-200 text-gray-600 hover:border-teal-300 disabled:opacity-40 disabled:cursor-not-allowed">
      {children}
    </button>
  );
}

// ── Report a new bug ────────────────────────────────────────────────────────
function ReportModal({ onClose, onSaved }) {
  const [form, setForm] = useState({ title: "", description: "", category: "bug", severity: "medium" });
  const [files, setFiles] = useState([]);
  const [saving, setSaving] = useState(false);
  const fileRef = useRef(null);

  const addFiles = (list) => {
    const imgs = Array.from(list || []).filter((f) => f.type.startsWith("image/"));
    if (imgs.length) setFiles((prev) => [...prev, ...imgs].slice(0, 5));
  };

  const submit = async () => {
    if (!form.title.trim() || !form.description.trim()) {
      Swal.fire("Missing info", "Please provide a title and description.", "warning");
      return;
    }
    setSaving(true);
    try {
      const fd = new FormData();
      fd.append("title", form.title);
      fd.append("description", form.description);
      fd.append("category", form.category);
      fd.append("severity", form.severity);
      fd.append("page_url", window.location.href);
      files.forEach((f) => fd.append("screenshots[]", f));
      await bugsApi.create(fd);
      Swal.fire({ toast: true, position: "top-end", icon: "success", title: "Report sent to the dev team", timer: 2000, showConfirmButton: false });
      onSaved();
    } catch (e) {
      Swal.fire("Error", e.response?.data?.message || "Could not send the report", "error");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Shell title="Report a Bug or Error" onClose={onClose}>
      <div className="space-y-3">
        <Field label="Title">
          <input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })}
            placeholder="Short summary of the problem" className={inp} />
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Type">
            <select value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} className={inp}>
              {CATEGORIES.map((c) => <option key={c.v} value={c.v}>{c.l}</option>)}
            </select>
          </Field>
          <Field label="Severity">
            <select value={form.severity} onChange={(e) => setForm({ ...form, severity: e.target.value })} className={inp}>
              {SEVERITIES.map((s) => <option key={s.v} value={s.v}>{s.l}</option>)}
            </select>
          </Field>
        </div>
        <Field label="Description">
          <textarea rows={4} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })}
            placeholder="What happened? What did you expect? Steps to reproduce…" className={inp} />
        </Field>

        {/* Screenshots */}
        <div
          onDragOver={(e) => e.preventDefault()}
          onDrop={(e) => { e.preventDefault(); addFiles(e.dataTransfer.files); }}
          className="border-2 border-dashed border-gray-200 rounded-xl p-3 text-center"
        >
          <input ref={fileRef} type="file" accept="image/*" multiple className="hidden"
            onChange={(e) => { addFiles(e.target.files); e.target.value = ""; }} />
          <button onClick={() => fileRef.current?.click()} className="inline-flex items-center gap-1.5 text-xs text-teal-600 font-semibold">
            <FiPaperclip className="w-4 h-4" /> Attach screenshots
          </button>
          <p className="text-[10px] text-gray-400 mt-0.5">or drag &amp; drop · up to 5 images</p>
          {files.length > 0 && (
            <div className="flex gap-2 mt-2 flex-wrap justify-center">
              {files.map((f, i) => (
                <div key={i} className="relative">
                  <img src={URL.createObjectURL(f)} alt="" className="w-16 h-16 rounded-lg object-cover border border-gray-200" />
                  <button onClick={() => setFiles((p) => p.filter((_, idx) => idx !== i))}
                    className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-gray-700 text-white flex items-center justify-center">
                    <FiX className="w-3 h-3" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="flex justify-end gap-2 pt-4">
        <button onClick={onClose} className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800">Cancel</button>
        <button onClick={submit} disabled={saving}
          className="px-5 py-2 text-sm font-semibold text-white rounded-lg disabled:opacity-50" style={{ background: TEAL }}>
          {saving ? "Sending…" : "Send report"}
        </button>
      </div>
    </Shell>
  );
}

// ── Detail + resolve ────────────────────────────────────────────────────────
function DetailModal({ bug, canManage, onClose, onChanged }) {
  const [note, setNote] = useState(bug.resolution_note || "");
  const [busy, setBusy] = useState(false);
  const [lightbox, setLightbox] = useState(null);

  const setStatus = async (status) => {
    setBusy(true);
    try {
      const res = await bugsApi.updateStatus(bug.id, { status, resolution_note: note });
      onChanged(res.data?.data || { ...bug, status });
      Swal.fire({ toast: true, position: "top-end", icon: "success", title: status === "resolved" ? "Marked as resolved — reporter notified" : "Status updated", timer: 2000, showConfirmButton: false });
    } catch (e) {
      Swal.fire("Error", e.response?.data?.message || "Could not update", "error");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Shell title={bug.title} onClose={onClose} wide>
      <div className="space-y-3">
        <div className="flex items-center gap-2 flex-wrap">
          <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${STATUS_TONE[bug.status]}`}>{statusLabel(bug.status)}</span>
          <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${SEV_TONE[bug.severity]}`}>{bug.severity}</span>
          <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-gray-100 text-gray-500">{bug.category}</span>
          <span className="text-[11px] text-gray-400 ml-auto">{fmt(bug.created_at)}</span>
        </div>

        {canManage && bug.reporter && (
          <p className="text-xs text-gray-500">Reported by <b className="text-gray-700">{bug.reporter.name}</b></p>
        )}

        <p className="text-sm text-gray-700 whitespace-pre-wrap">{bug.description}</p>

        {bug.page_url && (
          <p className="text-[11px] text-gray-400 break-all">Page: {bug.page_url}</p>
        )}

        {bug.screenshots?.length > 0 && (
          <div className="flex gap-2 flex-wrap">
            {bug.screenshots.map((p, i) => (
              <button key={i} onClick={() => setLightbox(fileUrl(p))}>
                <img src={fileUrl(p)} alt="" className="w-24 h-24 rounded-lg object-cover border border-gray-200 hover:brightness-95" />
              </button>
            ))}
          </div>
        )}

        {/* Resolution */}
        {bug.status === "resolved" ? (
          <div className="rounded-xl bg-emerald-50 border border-emerald-200 p-3">
            <div className="flex items-center gap-1.5 text-emerald-700 text-xs font-bold"><FiCheckCircle className="w-4 h-4" /> Resolved{bug.resolver ? ` by ${bug.resolver.name}` : ""}</div>
            {bug.resolution_note && <p className="text-xs text-emerald-800 mt-1">{bug.resolution_note}</p>}
          </div>
        ) : (
          canManage && (
            <div className="rounded-xl border border-gray-200 p-3">
              <label className="block text-[11px] font-semibold text-gray-500 mb-1">Resolution note (sent to the reporter)</label>
              <textarea rows={2} value={note} onChange={(e) => setNote(e.target.value)} className={inp}
                placeholder="Describe the fix / result…" />
            </div>
          )
        )}
      </div>

      {/* Actions */}
      <div className="flex items-center justify-end gap-2 pt-4">
        {canManage && bug.status !== "resolved" && (
          <>
            {bug.status === "open" && (
              <button onClick={() => setStatus("in_progress")} disabled={busy}
                className="px-3 py-2 text-xs font-semibold text-blue-700 bg-blue-50 border border-blue-200 rounded-lg hover:bg-blue-100 disabled:opacity-50">
                Mark in progress
              </button>
            )}
            <button onClick={() => setStatus("resolved")} disabled={busy}
              className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-emerald-600 rounded-lg hover:bg-emerald-700 disabled:opacity-50">
              <FiCheckCircle className="w-4 h-4" /> Mark Solved
            </button>
          </>
        )}
        {canManage && bug.status === "resolved" && (
          <button onClick={() => setStatus("open")} disabled={busy}
            className="px-3 py-2 text-xs font-semibold text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200 disabled:opacity-50">
            Reopen
          </button>
        )}
        <button onClick={onClose} className="px-4 py-2 text-xs font-medium text-gray-600 hover:text-gray-800">Close</button>
      </div>

      {lightbox && (
        <div className="fixed inset-0 z-[90] bg-black/80 flex items-center justify-center p-4" onClick={() => setLightbox(null)}>
          <img src={lightbox} alt="" className="max-h-[85vh] max-w-[92vw] object-contain rounded-lg" />
        </div>
      )}
    </Shell>
  );
}

// ── shared bits ─────────────────────────────────────────────────────────────
const inp = "w-full px-3 py-2 text-sm border border-gray-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-teal-400";
const Field = ({ label, children }) => (
  <label className="block">
    <span className="block text-[11px] font-semibold text-gray-600 mb-1">{label}</span>
    {children}
  </label>
);
function Shell({ title, onClose, wide, children }) {
  // Deliberately NOT closing on backdrop click — the modal only closes via the
  // ✕ button (or a submit/action), so an accidental outside click never loses
  // what the user was typing.
  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/40 p-4">
      <div className={`w-full ${wide ? "max-w-lg" : "max-w-md"} max-h-[90vh] bg-white rounded-2xl shadow-2xl flex flex-col overflow-hidden`}>
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-gray-100">
          <h3 className="text-sm font-bold text-gray-800 truncate flex items-center gap-2"><FiImage className="w-4 h-4 text-teal-600" /> {title}</h3>
          <button onClick={onClose} className="p-1.5 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100"><FiX className="w-5 h-5" /></button>
        </div>
        <div className="flex-1 overflow-y-auto p-5">{children}</div>
      </div>
    </div>
  );
}
