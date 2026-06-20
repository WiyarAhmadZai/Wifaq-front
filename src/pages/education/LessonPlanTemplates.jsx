import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { get } from "../../api/axios";
import Swal from "sweetalert2";
import { TEAL, PAPER, DIMENSIONS, DIMAP, Hero, Spinner } from "./lessonPlanUi";

export default function LessonPlanTemplates() {
  const navigate = useNavigate();
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [dim, setDim] = useState("");

  useEffect(() => {
    setLoading(true);
    const params = new URLSearchParams();
    if (search) params.set("search", search);
    if (dim) params.set("dimension", dim);
    const t = setTimeout(() => {
      get("/lesson-plans/templates?" + params.toString())
        .then((r) => setRows(r.data?.data || []))
        .catch(() => setRows([]))
        .finally(() => setLoading(false));
    }, 250);
    return () => clearTimeout(t);
  }, [search, dim]);

  const copy = async (t) => {
    try {
      const r = await get(`/lesson-plans/templates/${t.id}/copy`);
      navigate("/education/lesson-plans/create", { state: { prefill: r.data?.data || {} } });
    } catch {
      Swal.fire("Error", "Could not open the template.", "error");
    }
  };

  return (
    <div style={{ background: PAPER, minHeight: "100vh" }} className="pb-10">
      <Hero title="Lesson Plan Templates" subtitle="Plans that worked well — promoted by teachers, ready to reuse" />

      <div className="max-w-5xl mx-auto px-4 py-5 space-y-4">
        <div className="flex flex-wrap gap-2 items-center">
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search the library…"
            className="flex-1 min-w-[200px] px-3 py-2 rounded-xl border text-sm bg-white" style={{ borderColor: "#dbe8e8" }} />
          <div className="flex gap-1.5">
            <Pill on={dim === ""} onClick={() => setDim("")}>All</Pill>
            {DIMENSIONS.map((d) => <Pill key={d.key} on={dim === d.key} onClick={() => setDim(d.key)} color={d.color}>{d.label}</Pill>)}
          </div>
        </div>

        {loading ? <Spinner /> : rows.length === 0 ? (
          <div className="rounded-2xl border bg-white p-10 text-center" style={{ borderColor: "#dbe8e8" }}>
            <p className="text-sm text-gray-400">No templates yet. Teachers promote their best reflected plans here.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {rows.map((t) => (
              <div key={t.id} className="rounded-2xl border bg-white p-4 flex flex-col" style={{ borderColor: "#dbe8e8" }}>
                <div className="flex items-center gap-2 mb-1">
                  {t.rating != null && <span className="px-2 py-0.5 rounded-full text-[10px] font-bold" style={{ background: "#e6f3ec", color: "#2E7D5B" }}>★ {t.rating}</span>}
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold" style={{ background: "#E8F6F6", color: TEAL }}>{t.uses_count} uses</span>
                </div>
                <p className="text-sm font-black text-gray-800">{t.title}</p>
                <p className="text-[11px] text-gray-400 mt-0.5">{[t.subject, t.grade, t.author].filter(Boolean).join(" · ")}</p>
                {t.summary && <p className="text-[11px] text-gray-600 mt-2 line-clamp-3">{t.summary}</p>}
                <div className="flex gap-1 mt-3">
                  {(t.dimension_emphasis || []).map((k) => <span key={k} className="w-2.5 h-2.5 rounded-full" title={DIMAP[k]?.label} style={{ background: DIMAP[k]?.color || "#ccc" }} />)}
                </div>
                <button onClick={() => copy(t)} className="mt-3 w-full px-3 py-2 rounded-lg text-[11px] font-bold text-white" style={{ background: TEAL }}>Open &amp; copy →</button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

const Pill = ({ on, onClick, children, color = TEAL }) => (
  <button onClick={onClick} className="px-3 py-1.5 rounded-lg text-[11px] font-bold border transition-all"
    style={on ? { background: color, color: "#fff", borderColor: color } : { background: "#fff", color: "#6b7280", borderColor: "#e5e7eb" }}>{children}</button>
);
