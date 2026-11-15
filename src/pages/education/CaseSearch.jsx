import { useEffect, useState } from "react";
import { get } from "../../api/axios";

/**
 * Case Library — how colleagues handled situations like the one in front of you.
 *
 * A teacher meeting a difficult student for the first time should be able to
 * find out that somebody met the same thing two years ago, and what they did
 * about it. Nothing new has to be written for that: every observation already
 * records what was seen, what the teacher did, and — through the monitoring
 * record — whether it worked. All that was missing was a way to read across
 * them, so this screen is a search over data the school already has, not a
 * second library to keep up to date.
 *
 * Each result answers three questions in the order they matter: what happened,
 * what was tried, and how it ended.
 */

const CATEGORIES = [
  { value: "", label: "Any type" },
  { value: "concern", label: "Concern" },
  { value: "urgent", label: "Urgent" },
  { value: "routine", label: "Routine" },
  { value: "positive", label: "Positive" },
];

const DIMENSIONS = [
  { value: "", label: "Any dimension" },
  { value: "intellectual", label: "Intellectual" },
  { value: "character", label: "Character" },
  { value: "social", label: "Social" },
  { value: "practical", label: "Practical" },
];

const OUTCOMES = [
  { value: "", label: "Any outcome" },
  { value: "cleared", label: "Resolved (cleared)" },
  { value: "in_followup", label: "Still in follow-up" },
  { value: "active", label: "Still open" },
];

const CATEGORY_STYLE = {
  concern: "bg-amber-100 text-amber-800",
  urgent: "bg-red-100 text-red-800",
  routine: "bg-gray-100 text-gray-700",
  positive: "bg-green-100 text-green-800",
};

const OUTCOME_STYLE = {
  cleared: "bg-green-50 text-green-700 border-green-200",
  in_followup: "bg-amber-50 text-amber-700 border-amber-200",
  active: "bg-blue-50 text-blue-700 border-blue-200",
};

const inp =
  "w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm bg-white outline-none focus:ring-2 focus:ring-teal-500";

const EMPTY = { q: "", category: "", dimension: "", outcome: "", grade_id: "", from: "", to: "" };

export default function CaseSearch() {
  const [filters, setFilters] = useState(EMPTY);
  const [rows, setRows] = useState([]);
  const [meta, setMeta] = useState(null);
  const [grades, setGrades] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [searched, setSearched] = useState(false);
  const [expanded, setExpanded] = useState({});

  useEffect(() => {
    get("/grades/list?per_page=200")
      .then((r) => setGrades(r.data?.data?.data || r.data?.data || []))
      .catch(() => setGrades([]));
  }, []);

  const set = (k, v) => setFilters((f) => ({ ...f, [k]: v }));

  const run = async (e) => {
    e?.preventDefault();
    setLoading(true);
    setError("");
    try {
      const params = new URLSearchParams();
      Object.entries(filters).forEach(([k, v]) => {
        if (v) params.append(k, v);
      });
      const res = await get(`/student-observations/case-search?${params.toString()}`);
      setRows(res.data?.data || []);
      setMeta(res.data?.meta || null);
      setSearched(true);
    } catch (err) {
      setError(err.response?.data?.message || "Could not search the case history.");
      setRows([]);
      setMeta(null);
    } finally {
      setLoading(false);
    }
  };

  const reset = () => {
    setFilters(EMPTY);
    setRows([]);
    setMeta(null);
    setSearched(false);
  };

  return (
    <div className="px-4 py-5 space-y-4">
      <div>
        <h1 className="text-lg font-bold text-gray-800">Case Library</h1>
        <p className="text-xs text-gray-400 mt-0.5">
          Search what colleagues have seen before, what they tried, and how it ended.
        </p>
      </div>

      <form onSubmit={run} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 space-y-3">
        <input
          value={filters.q}
          onChange={(e) => set("q", e.target.value)}
          placeholder="Describe the situation — e.g. refuses group work, sudden drop in homework, crying in class"
          className={inp}
        />

        <div className="grid grid-cols-2 lg:grid-cols-6 gap-2">
          <select value={filters.category} onChange={(e) => set("category", e.target.value)} className={inp}>
            {CATEGORIES.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
          </select>
          <select value={filters.dimension} onChange={(e) => set("dimension", e.target.value)} className={inp}>
            {DIMENSIONS.map((d) => <option key={d.value} value={d.value}>{d.label}</option>)}
          </select>
          <select value={filters.outcome} onChange={(e) => set("outcome", e.target.value)} className={inp}>
            {OUTCOMES.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
          <select value={filters.grade_id} onChange={(e) => set("grade_id", e.target.value)} className={inp}>
            <option value="">Any grade</option>
            {grades.map((g) => <option key={g.id} value={g.id}>{g.name}</option>)}
          </select>
          <input type="date" value={filters.from} onChange={(e) => set("from", e.target.value)} className={inp} title="From" />
          <input type="date" value={filters.to} onChange={(e) => set("to", e.target.value)} className={inp} title="To" />
        </div>

        <div className="flex items-center gap-2">
          <button type="submit" disabled={loading}
            className="px-5 py-2.5 bg-teal-600 text-white text-sm font-semibold rounded-xl hover:bg-teal-700 disabled:opacity-50">
            {loading ? "Searching…" : "Search past cases"}
          </button>
          <button type="button" onClick={reset}
            className="px-4 py-2.5 border border-gray-200 text-gray-600 text-sm rounded-xl hover:bg-gray-50">
            Clear
          </button>
          {/* Searching for one grade across every year is usually what makes
              two cases comparable — say so rather than leaving it to be found. */}
          <p className="text-[11px] text-gray-400 hidden sm:block">
            Searches every year, not just this one.
          </p>
        </div>
      </form>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-xs text-red-700">{error}</div>
      )}

      {meta && (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
          <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-xs">
            <span className="font-semibold text-gray-800">
              {meta.total} <span>matching cases</span>
              {meta.returned < meta.total && (
                <span className="font-normal text-gray-400"> · <span>showing</span> {meta.returned}</span>
              )}
            </span>
            <span className="text-gray-500">{meta.with_recommendation} <span>recorded what they did</span></span>
            {Object.entries(meta.by_outcome || {})
              .filter(([k]) => k && k !== "null")
              .map(([k, n]) => (
                <span key={k} className="text-gray-500">
                  {n} {OUTCOMES.find((o) => o.value === k)?.label.toLowerCase() || k}
                </span>
              ))}
          </div>

          {/* Whose children the reader may name is decided elsewhere, by the
              same rule as everywhere else — this only explains the blanks. */}
          {meta.names_hidden && (
            <p className="text-[11px] text-gray-400 mt-2">
              Student names are hidden for classes you do not teach. The situation and the response are shown in full.
            </p>
          )}
        </div>
      )}

      {searched && rows.length === 0 && !loading && !error && (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-8 text-center">
          <p className="text-sm text-gray-600">Nothing recorded like this yet.</p>
          <p className="text-xs text-gray-400 mt-1">
            Try fewer words, or a wider type — the library only holds what colleagues have logged.
          </p>
        </div>
      )}

      <div className="space-y-3">
        {rows.map((r) => {
          const open = expanded[r.id];
          return (
            <div key={r.id} className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
              <div className="px-5 py-3 border-b border-gray-50 flex flex-wrap items-center gap-2">
                <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${CATEGORY_STYLE[r.category] || "bg-gray-100 text-gray-700"}`}>
                  {r.category}
                </span>
                <span className="text-[11px] text-gray-500 capitalize">{r.dimension}</span>
                {r.grade && <span className="text-[11px] text-gray-400">· {r.grade}</span>}
                <span className="text-[11px] text-gray-400">· {r.observed_on}</span>
                <span className="flex-1" />
                {r.outcome && (
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold border ${OUTCOME_STYLE[r.outcome] || "bg-gray-50 text-gray-600 border-gray-200"}`}>
                    {OUTCOMES.find((o) => o.value === r.outcome)?.label || r.outcome}
                  </span>
                )}
              </div>

              <div className="px-5 py-4 space-y-3">
                <div>
                  <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-1">What happened</p>
                  <p className="text-sm text-gray-700">{r.description}</p>
                </div>

                {/* The reason anyone opens this screen. Shown even when a name
                    is withheld — the response is what transfers between cases. */}
                {r.recommendation ? (
                  <div className="bg-teal-50 border border-teal-100 rounded-xl px-4 py-3">
                    <p className="text-[10px] font-semibold text-teal-700 uppercase tracking-wider mb-1">What the teacher did</p>
                    <p className="text-sm text-gray-800">{r.recommendation}</p>
                  </div>
                ) : (
                  <p className="text-[11px] text-amber-600">No response was recorded for this one.</p>
                )}

                {open && (
                  <div className="space-y-2 pt-1">
                    {r.alternative_interpretation && (
                      <div>
                        <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-1">Other explanations considered</p>
                        <p className="text-sm text-gray-600">{r.alternative_interpretation}</p>
                      </div>
                    )}
                    {r.urgency_reason && (
                      <div>
                        <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-1">Why it was urgent</p>
                        <p className="text-sm text-gray-600">{r.urgency_reason}</p>
                      </div>
                    )}
                    {r.outcome_reason && (
                      <div>
                        <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-1">Follow-up record</p>
                        <p className="text-sm text-gray-600">
                          {r.outcome_reason}
                          {r.followed_since && <span className="text-gray-400"> · since {r.followed_since}</span>}
                        </p>
                      </div>
                    )}
                    <div className="flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-gray-400 pt-1">
                      {r.subject && <span>Subject: {r.subject}</span>}
                      {r.is_usual && <span>Usual for them: {r.is_usual}</span>}
                      {r.change_vs_before && <span>Compared with before: {r.change_vs_before}</span>}
                    </div>
                  </div>
                )}

                <div className="flex items-center justify-between pt-1">
                  <p className="text-[11px] text-gray-400">
                    {r.student ? (
                      <>
                        {r.student}
                        {r.class && <span> · {r.class}</span>}
                      </>
                    ) : (
                      <span className="italic">Name hidden — not your class</span>
                    )}
                    {r.observer && <span> · logged by {r.observer}</span>}
                  </p>
                  <button
                    type="button"
                    onClick={() => setExpanded((x) => ({ ...x, [r.id]: !x[r.id] }))}
                    className="text-[11px] font-semibold text-teal-700 hover:text-teal-800"
                  >
                    {open ? "Less" : "More detail"}
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
