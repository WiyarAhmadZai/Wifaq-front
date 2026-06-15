import { useState, useEffect } from "react";
import { get } from "../../api/axios";
import { fmtDate } from "../../utils/formErrors";
import { TEAL, PAPER, Hero, Spinner } from "./lessonPlanUi";

/**
 * Curriculum Sync — syllabus pace alignment. Without a topic-level Curriculum
 * module, pace = lesson plans delivered vs expected periods
 * (weekly_hours × weeks elapsed in the subject's window).
 */
const STATUS = {
  ahead:           { label: "Ahead",            bg: "#e0f1f2", fg: "#0D5C63" },
  on_track:        { label: "On track",         bg: "#e6f3ec", fg: "#2E7D5B" },
  slightly_behind: { label: "Slightly behind",  bg: "#fbf0db", fg: "#9a6a12" },
  behind:          { label: "Behind",           bg: "#f7e3e1", fg: "#C0473F" },
  not_started:     { label: "Not started",      bg: "#eef3f3", fg: "#5d7273" },
};

export default function LessonPlanCurriculum() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [forbidden, setForbidden] = useState(false);

  useEffect(() => {
    get("/lesson-plans/analytics/curriculum")
      .then((r) => setData(r.data))
      .catch((e) => { if (e.response?.status === 403) setForbidden(true); })
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div style={{ background: PAPER, minHeight: "100vh" }}><Spinner /></div>;
  if (forbidden) return (
    <div style={{ background: PAPER, minHeight: "100vh" }}>
      <Hero title="Curriculum Sync" />
      <p className="max-w-3xl mx-auto px-4 py-10 text-center text-sm text-gray-500">Leadership access only.</p>
    </div>
  );

  const rows = data?.rows || [];
  const sum = data?.summary || {};

  return (
    <div style={{ background: PAPER, minHeight: "100vh" }} className="pb-10">
      <Hero title="Curriculum Sync" subtitle={`Syllabus pace vs lesson plans delivered${data?.term ? ` · ${data.term}` : ""}`} />

      <div className="max-w-5xl mx-auto px-4 py-5 space-y-4">
        <div className="grid grid-cols-3 gap-3">
          <Kpi label="Behind pace" value={sum.behind ?? 0} accent="#C0473F" />
          <Kpi label="On track" value={sum.on_track ?? 0} accent="#2E7D5B" />
          <Kpi label="Ahead" value={sum.ahead ?? 0} accent="#0D5C63" />
        </div>

        <div className="rounded-2xl border bg-white overflow-hidden" style={{ borderColor: "#dbe8e8" }}>
          <table className="w-full text-sm">
            <thead>
              <tr style={{ background: "#fafcfc" }}>
                <Th>Subject</Th><Th>Grade</Th><Th>Window</Th>
                <Th center>Expected</Th><Th center>Taught</Th><Th center>Pace</Th><Th>Status</Th>
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 ? (
                <tr><td colSpan={7} className="px-4 py-8 text-center text-xs text-gray-400">No active subjects with a syllabus window.</td></tr>
              ) : rows.map((r) => {
                const st = STATUS[r.status] || STATUS.not_started;
                return (
                  <tr key={r.subject_id} className="border-t" style={{ borderColor: "#eef4f4" }}>
                    <td className="px-4 py-2.5">
                      <p className="font-semibold text-gray-800">{r.subject}</p>
                      {r.book && <p className="text-[10px] text-gray-400">{r.book}</p>}
                    </td>
                    <td className="px-2 py-2.5 text-gray-500">{r.grade || "—"}</td>
                    <td className="px-2 py-2.5 text-[11px] text-gray-500">{fmtDate(r.start)} → {fmtDate(r.end)}</td>
                    <td className="px-2 py-2.5 text-center text-gray-600">{r.expected}</td>
                    <td className="px-2 py-2.5 text-center font-bold text-gray-800">{r.taught}</td>
                    <td className="px-2 py-2.5 text-center font-black" style={{ color: st.fg }}>{r.pace == null ? "—" : `${r.pace}%`}</td>
                    <td className="px-2 py-2.5">
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold" style={{ background: st.bg, color: st.fg }}>{st.label}</span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        <div className="rounded-xl px-3 py-2 text-[11px]" style={{ background: "#E8F6F6", color: TEAL }}>
          <b>How pace is measured:</b> expected periods = weekly hours × weeks elapsed in the subject's window; taught = lesson plans delivered.
          Behind subjects get a catch-up conversation with the Deputy of Instruction. Topic-level alignment (which exact lesson vs the syllabus calendar) arrives with the Curriculum module.
        </div>
      </div>
    </div>
  );
}

const Th = ({ children, center }) => (
  <th className={`px-${center ? "2" : "4"} py-2.5 text-[10px] font-bold uppercase tracking-wide text-gray-400 ${center ? "text-center" : "text-left"}`}>{children}</th>
);
const Kpi = ({ label, value, accent }) => (
  <div className="rounded-2xl border bg-white p-4 relative overflow-hidden" style={{ borderColor: "#dbe8e8" }}>
    <span className="absolute inset-y-0 left-0 w-1" style={{ background: accent }} />
    <p className="text-[10px] font-bold uppercase tracking-wide text-gray-400">{label}</p>
    <p className="text-2xl font-black text-gray-800 mt-1 leading-none">{value}</p>
  </div>
);
