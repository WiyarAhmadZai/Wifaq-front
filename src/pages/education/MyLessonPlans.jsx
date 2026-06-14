import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { get, post } from "../../api/axios";
import Swal from "sweetalert2";
import { fmtDate } from "../../utils/formErrors";
import { TEAL, TEAL_LT, GOLD, PAPER, STATUS, Hero, Spinner, StatusPill, DimensionDots, DAY_LABEL } from "./lessonPlanUi";

const FILTERS = [
  { key: "", label: "All" },
  { key: "draft", label: "Drafts" },
  { key: "submitted", label: "Pending" },
  { key: "returned_for_revision", label: "Returned" },
  { key: "approved", label: "Approved" },
  { key: "delivered", label: "Delivered" },
  { key: "reflected", label: "Reflected" },
];

export default function MyLessonPlans() {
  const navigate = useNavigate();
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("");
  const [busy, setBusy] = useState(null);

  const load = useCallback(() => {
    setLoading(true);
    get("/lesson-plans" + (filter ? `?status=${filter}` : ""))
      .then((r) => setRows(r.data?.data || []))
      .catch(() => setRows([]))
      .finally(() => setLoading(false));
  }, [filter]);
  useEffect(() => { load(); }, [load]);

  const act = async (id, action, body) => {
    setBusy(id);
    try {
      await post(`/lesson-plans/${id}/${action}`, body || {});
      Swal.fire({ icon: "success", title: "Done", timer: 1100, showConfirmButton: false, toast: true, position: "top-end" });
      load();
    } catch (err) {
      Swal.fire("Error", err.response?.data?.message || "Action failed.", "error");
    } finally { setBusy(null); }
  };

  const reflect = async (p) => {
    const { value: f } = await Swal.fire({
      title: "Post-teaching reflection",
      html:
        `<textarea id="w" class="swal2-textarea" placeholder="What worked well?"></textarea>` +
        `<textarea id="c" class="swal2-textarea" placeholder="What needs to change?"></textarea>` +
        `<input id="r" type="number" min="1" max="5" class="swal2-input" placeholder="Rating 1-5 (optional)">`,
      focusConfirm: false, showCancelButton: true, confirmButtonText: "Record",
      preConfirm: () => ({
        what_worked: document.getElementById("w").value,
        what_to_change: document.getElementById("c").value,
        rating: document.getElementById("r").value || null,
      }),
    });
    if (f) act(p.id, "reflect", f);
  };

  return (
    <div style={{ background: PAPER, minHeight: "100vh" }} className="pb-10">
      <Hero title="My Lesson Plans" subtitle="History, review status, dimensions filled & reflection"
        right={
          <button onClick={() => navigate("/education/lesson-plans/create")} className="px-4 py-2 rounded-xl text-xs font-bold" style={{ background: GOLD, color: "#052528" }}>
            ＋ New plan
          </button>
        } />

      <div className="max-w-4xl mx-auto px-4 py-5">
        <div className="flex flex-wrap gap-1.5 mb-4">
          {FILTERS.map((f) => (
            <button key={f.key} onClick={() => setFilter(f.key)}
              className="px-3 py-1.5 rounded-lg text-[11px] font-bold border transition-all"
              style={filter === f.key ? { background: TEAL, color: "#fff", borderColor: TEAL } : { background: "#fff", color: "#6b7280", borderColor: "#e5e7eb" }}>
              {f.label}
            </button>
          ))}
        </div>

        {loading ? <Spinner /> : rows.length === 0 ? (
          <div className="rounded-2xl border bg-white p-10 text-center" style={{ borderColor: "#dbe8e8" }}>
            <p className="text-sm text-gray-400">No plans here yet.</p>
          </div>
        ) : (
          <div className="space-y-2.5">
            {rows.map((p) => (
              <div key={p.id} className="rounded-2xl border bg-white p-4" style={{ borderColor: "#dbe8e8" }}>
                <div className="flex items-start gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="text-sm font-black text-gray-800 truncate">{p.title}</p>
                      <StatusPill status={p.status} />
                    </div>
                    <p className="text-[11px] text-gray-400 mt-0.5">
                      {p.subject} · {p.class} · {fmtDate(p.lesson_date)} {p.period_number ? `· ${DAY_LABEL[p.day_of_week] || ""} P${p.period_number}` : ""}
                    </p>
                    <div className="mt-2 flex items-center gap-2">
                      <DimensionDots filled={p.dimensions_filled} />
                      <span className="text-[10px] text-gray-400">{p.dimensions_filled}/4 dimensions</span>
                    </div>
                  </div>
                </div>

                <div className="mt-3 pt-3 border-t flex flex-wrap gap-2" style={{ borderColor: "#eef4f4" }}>
                  <Action onClick={() => navigate(`/education/lesson-plans/edit/${p.id}`)}>
                    {["draft", "returned_for_revision"].includes(p.status) ? "Edit" : "View"}
                  </Action>
                  {["draft", "returned_for_revision"].includes(p.status) && (
                    <Action primary disabled={busy === p.id} onClick={() => act(p.id, "submit")}>Submit for review</Action>
                  )}
                  {p.status === "approved" && (
                    <Action primary disabled={busy === p.id} onClick={() => act(p.id, "deliver")}>Mark delivered</Action>
                  )}
                  {["delivered", "reflected"].includes(p.status) && (
                    <Action primary={p.status === "delivered"} disabled={busy === p.id} onClick={() => reflect(p)}>
                      {p.status === "reflected" ? "Edit reflection" : "Add reflection"}
                    </Action>
                  )}
                  {p.status === "reflected" && p.dimensions_filled === 4 && (
                    <Action disabled={busy === p.id} onClick={() => act(p.id, "promote")}>★ Promote to library</Action>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

const Action = ({ children, onClick, primary, disabled }) => (
  <button onClick={onClick} disabled={disabled}
    className="px-3 py-1.5 rounded-lg text-[11px] font-bold border disabled:opacity-50"
    style={primary ? { background: TEAL, color: "#fff", borderColor: TEAL } : { background: "#fff", color: TEAL, borderColor: "#dbe8e8" }}>
    {children}
  </button>
);
