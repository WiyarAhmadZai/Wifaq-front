import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { termExamFormData, promotionBoard, confirmPromotion, assignPromotion } from "../../api/gradebook";
import { useAuth } from "../../admin/context/AuthContext";
import { Hero, Spinner } from "./lessonPlanUi";
import { PAPER, TEAL } from "./gradebookUi";

const DECISION = {
  promote:    { label: "Promote", bg: "#e6f3ec", fg: "#2E7D5B" },
  graduate:   { label: "Graduate", bg: "#eee9f6", fg: "#6b54a8" },
  reexam:     { label: "Re-exam", bg: "#fbf0db", fg: "#9a6a12" },
  repeat:     { label: "Repeat", bg: "#f7e3e1", fg: "#C0473F" },
  incomplete: { label: "Incomplete", bg: "#eef3f3", fg: "#5d7273" },
};

export default function PromotionBoard() {
  const navigate = useNavigate();
  const { hasPermission } = useAuth();
  const canPromote = hasPermission("gradebook.promote");

  const [classes, setClasses] = useState([]);
  const [terms, setTerms] = useState([]);
  const [classId, setClassId] = useState(null);
  const [termId, setTermId] = useState(null);
  const [board, setBoard] = useState(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");
  const [err, setErr] = useState("");

  // assign controls
  const [targetClassId, setTargetClassId] = useState("");
  const [targetTermId, setTargetTermId] = useState("");

  useEffect(() => {
    termExamFormData().then((r) => {
      const uniq = {};
      (r.data?.pairs || []).forEach((p) => { uniq[p.school_class_id] = p.class_name; });
      const cl = Object.entries(uniq).map(([id, name]) => ({ id: Number(id), name }));
      setClasses(cl);
      setTerms(r.data?.terms || []);
      if (cl.length) setClassId(cl[0].id);
      const cur = (r.data?.terms || []).find((t) => t.is_current) || r.data?.terms?.[0];
      if (cur) { setTermId(cur.id); setTargetTermId(cur.id); }
    }).finally(() => setLoading(false));
  }, []);

  // Reload when the class/term selection changes (clear any stale status then).
  useEffect(() => { if (classId && termId) { setMsg(""); setErr(""); load(); } }, [classId, termId]); // eslint-disable-line

  // Auto-dismiss a success banner so it reads as a per-action confirmation.
  useEffect(() => {
    if (!msg) return;
    const t = setTimeout(() => setMsg(""), 4000);
    return () => clearTimeout(t);
  }, [msg]);

  // load() clears only the error — it must NOT wipe a success message set by the
  // action that just triggered the reload.
  function load() {
    setBusy(true); setErr("");
    return promotionBoard({ class_id: classId, term_id: termId })
      .then((r) => setBoard(r.data))
      .catch((e) => setErr(e.response?.data?.message || "Could not load the board."))
      .finally(() => setBusy(false));
  }

  const promotedIds = useMemo(
    () => (board?.students || []).filter((s) => s.decision === "promote").map((s) => s.student_id),
    [board]
  );

  async function confirm(force = false) {
    setErr(""); setMsg("");
    setBusy(true);
    try {
      const r = await confirmPromotion({ class_id: classId, term_id: termId, force });
      setMsg(r.data?.message || "Confirmed.");
      load();
    } catch (e) {
      const m = e.response?.data?.message || "Confirm failed.";
      // Offer force when blocked on incomplete.
      if (e.response?.status === 422 && /missing term-exam/.test(m) && window.confirm(`${m}\n\nConfirm anyway (skip incomplete students)?`)) {
        return confirm(true);
      }
      setErr(m); setBusy(false);
    }
  }

  async function assign() {
    setErr(""); setMsg("");
    if (!targetClassId) return setErr("Pick a target class for the promoted students.");
    if (!promotedIds.length) return setErr("No promoted students to assign.");
    setBusy(true);
    try {
      const r = await assignPromotion({ student_ids: promotedIds, from_term_id: termId, target_class_id: Number(targetClassId), target_term_id: Number(targetTermId) });
      setMsg(r.data?.message || "Assigned.");
      load();
    } catch (e) {
      setErr(e.response?.data?.message || "Assign failed.");
      setBusy(false);
    }
  }

  if (loading) return <div style={{ background: PAPER, minHeight: "100vh" }}><Spinner /></div>;

  const s = board?.summary;
  return (
    <div style={{ background: PAPER, minHeight: "100vh" }} className="pb-10">
      <Hero title="Promotion board" subtitle={board?.class ? `${board.class.name} · ${board.class.grade}` : "Year-end decisions"} />
      {msg && <div className="sticky top-0 z-10 text-center text-xs font-bold text-white py-2" style={{ background: "#2E7D5B" }}>{msg}</div>}
      {err && <div className="sticky top-0 z-10 text-center text-xs font-bold text-white py-2" style={{ background: "#C0473F" }}>{err}</div>}

      <div className="max-w-3xl mx-auto px-4 py-4 space-y-3">
        {classes.length === 0 ? (
          <div className="rounded-2xl border bg-white p-6 text-center text-xs text-gray-500" style={{ borderColor: "#dbe8e8" }}>
            No classes available to you.
          </div>
        ) : (
          <>
            <div className="grid grid-cols-2 gap-2">
              <select value={classId || ""} onChange={(e) => setClassId(Number(e.target.value))}
                className="text-sm border rounded-lg px-2 py-2 bg-white" style={{ borderColor: "#dbe8e8" }}>
                {classes.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
              <select value={termId || ""} onChange={(e) => setTermId(Number(e.target.value))}
                className="text-sm border rounded-lg px-2 py-2 bg-white" style={{ borderColor: "#dbe8e8" }}>
                {terms.map((t) => <option key={t.id} value={t.id}>{t.name}{t.is_current ? " (current)" : ""}</option>)}
              </select>
            </div>

            {busy && <Spinner />}

            {!busy && board && (
              <>
                {s && (
                  <div className="grid grid-cols-5 gap-2 text-center">
                    <Cnt label="Promote" v={s.promote} tone="#2E7D5B" />
                    <Cnt label="Graduate" v={s.graduate} tone="#6b54a8" />
                    <Cnt label="Re-exam" v={s.reexam} tone="#9a6a12" />
                    <Cnt label="Repeat" v={s.repeat} tone="#C0473F" />
                    <Cnt label="Incompl." v={s.incomplete} tone="#5d7273" />
                  </div>
                )}

                <div className="rounded-xl border bg-white divide-y" style={{ borderColor: "#dbe8e8" }}>
                  {(board.students || []).map((st) => {
                    const d = DECISION[st.decision] || DECISION.incomplete;
                    const failedNames = (st.subjects || []).filter((x) => ["fail", "reexam_fail"].includes(x.status)).map((x) => x.subject_name);
                    return (
                      <button key={st.student_id} onClick={() => navigate(`/education/gradebook/student/${st.student_id}/academic-history`)}
                        className="w-full flex items-center gap-3 px-3 py-2 text-left hover:bg-teal-50/40">
                        <span className="flex-1">
                          <span className="text-xs font-semibold text-gray-700">{st.name}</span>
                          {failedNames.length > 0 && <span className="block text-[10px] text-red-500">failed: {failedNames.join(", ")}</span>}
                        </span>
                        {st.confirmed && <span className="text-[9px] font-bold text-gray-400">confirmed</span>}
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full" style={{ background: d.bg, color: d.fg }}>{d.label}</span>
                      </button>
                    );
                  })}
                  {(board.students || []).length === 0 && <div className="px-3 py-4 text-[11px] text-gray-400 text-center">No active students.</div>}
                </div>

                {canPromote && (
                  <div className="rounded-xl border p-3 space-y-3" style={{ borderColor: "#dbe8e8", background: "#fff" }}>
                    <button onClick={() => confirm(false)} disabled={busy}
                      className="w-full px-4 py-2.5 rounded-lg text-sm font-bold text-white disabled:opacity-40" style={{ background: TEAL }}>
                      Confirm decisions
                    </button>

                    <div className="pt-2 border-t" style={{ borderColor: "#eef3f3" }}>
                      <p className="text-[10px] font-bold uppercase text-gray-400 mb-2">Assign promoted → next-grade class</p>
                      <div className="grid grid-cols-2 gap-2">
                        <select value={targetClassId} onChange={(e) => setTargetClassId(e.target.value)}
                          className="text-xs border rounded-lg px-2 py-2 bg-white" style={{ borderColor: "#dbe8e8" }}>
                          <option value="">Target class…</option>
                          {classes.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                        </select>
                        <select value={targetTermId} onChange={(e) => setTargetTermId(e.target.value)}
                          className="text-xs border rounded-lg px-2 py-2 bg-white" style={{ borderColor: "#dbe8e8" }}>
                          {terms.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
                        </select>
                      </div>
                      <button onClick={assign} disabled={busy || !promotedIds.length}
                        className="w-full mt-2 px-4 py-2 rounded-lg text-xs font-bold border disabled:opacity-40" style={{ borderColor: TEAL, color: TEAL }}>
                        Move {promotedIds.length} promoted student(s) →
                      </button>
                      <p className="text-[10px] text-gray-400 mt-1">Only students whose confirmed target grade matches the chosen class's grade are moved.</p>
                    </div>
                  </div>
                )}
              </>
            )}
          </>
        )}
      </div>
    </div>
  );
}

function Cnt({ label, v, tone }) {
  return (
    <div className="rounded-xl border bg-white py-2" style={{ borderColor: "#dbe8e8" }}>
      <div className="text-lg font-black" style={{ color: tone }}>{v ?? 0}</div>
      <div className="text-[9px] text-gray-400 font-bold uppercase">{label}</div>
    </div>
  );
}
