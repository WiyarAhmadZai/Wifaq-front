import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { termExamFormData, promotionBoard, confirmPromotion, assignPromotion } from "../../api/gradebook";
import { peekCache } from "../../api/axios";
import { useAuth } from "../../admin/context/AuthContext";
import {
  Page, Header, Card, TableCard, thCls, tdCls, Avatar, Pill, Select, Btn, Banner,
  StatGrid, EmptyState, Spinner, Loading, LoadingRow, ICON,
} from "./gradebookUi";

const DECISION = {
  promote:    { label: "Promote", tone: "emerald" },
  graduate:   { label: "Graduate", tone: "purple" },
  reexam:     { label: "Re-exam", tone: "amber" },
  repeat:     { label: "Repeat", tone: "red" },
  incomplete: { label: "Incomplete", tone: "gray" },
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
  const [targetClassId, setTargetClassId] = useState("");
  const [targetTermId, setTargetTermId] = useState("");

  useEffect(() => {
    const __cached = peekCache("/gradebook/term-exams/form-data");
    if (__cached) {
      const uniq = {};
      (__cached?.pairs || []).forEach((p) => { uniq[p.school_class_id] = p.class_name; });
      const cl = Object.entries(uniq).map(([id, name]) => ({ id: Number(id), name }));
      setClasses(cl);
      setTerms(__cached?.terms || []);
      if (cl.length) setClassId(cl[0].id);
      const cur = (__cached?.terms || []).find((t) => t.is_current) || __cached?.terms?.[0];
      if (cur) { setTermId(cur.id); setTargetTermId(cur.id); }
      setLoading(false);
    }
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

  useEffect(() => { if (classId && termId) { setMsg(""); setErr(""); load(); } }, [classId, termId]); // eslint-disable-line
  useEffect(() => { if (!msg) return; const t = setTimeout(() => setMsg(""), 5000); return () => clearTimeout(t); }, [msg]);

  function load() {
    setBusy(true); setErr("");
    const __cached = peekCache("/gradebook/promotion/board", { class_id: classId, term_id: termId });
    if (__cached) { setBoard(__cached); setBusy(false); }
    return promotionBoard({ class_id: classId, term_id: termId })
      .then((r) => setBoard(r.data))
      .catch((e) => setErr(e.response?.data?.message || "Could not load the board."))
      .finally(() => setBusy(false));
  }

  const promotedIds = useMemo(() => (board?.students || []).filter((s) => s.decision === "promote").map((s) => s.student_id), [board]);

  async function confirm(force = false) {
    setErr(""); setMsg(""); setBusy(true);
    try {
      const r = await confirmPromotion({ class_id: classId, term_id: termId, force });
      await load(); setMsg(r.data?.message || "Confirmed.");
    } catch (e) {
      const m = e.response?.data?.message || "Confirm failed.";
      if (e.response?.status === 422 && /missing term-exam/.test(m) && window.confirm(`${m}\n\nConfirm anyway (skip incomplete students)?`)) return confirm(true);
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
      await load(); setMsg(r.data?.message || "Assigned.");
    } catch (e) { setErr(e.response?.data?.message || "Assign failed."); setBusy(false); }
  }

  if (loading) return <Loading />;
  const s = board?.summary;

  return (
    <Page>
      <Header icon={ICON.cap} title="Promotion Board"
        subtitle={board?.class ? `${board.class.name} · ${board.class.grade}` : "Year-end decisions"} onBack={() => navigate(-1)} />

      {msg && <Banner onClose={() => setMsg("")}>{msg}</Banner>}
      {err && <Banner kind="error" onClose={() => setErr("")}>{err}</Banner>}

      {classes.length === 0 ? (
        <EmptyState icon={ICON.cap} title="No classes available to you"
          description="You need a class assigned in Class Management → Grade Subjects to review promotions." />
      ) : (
        <>
          <Card className="mb-4">
            <div className="grid sm:grid-cols-2 gap-3 max-w-lg">
              <Select value={classId || ""} onChange={(e) => setClassId(Number(e.target.value))}>
                {classes.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </Select>
              <Select value={termId || ""} onChange={(e) => setTermId(Number(e.target.value))}>
                {terms.map((t) => <option key={t.id} value={t.id}>{t.name}{t.is_current ? " (current)" : ""}</option>)}
              </Select>
            </div>
          </Card>

          {busy && <LoadingRow />}

          {!busy && board && (
            <>
              {s && (
                <StatGrid stats={[
                  { label: "Promote", value: s.promote, tone: "emerald", hint: "moving up a grade" },
                  { label: "Graduate", value: s.graduate, tone: "purple", hint: "finished the last grade" },
                  { label: "Re-exam", value: s.reexam, tone: "amber", hint: "1–3 subjects failed" },
                  { label: "Repeat", value: s.repeat, tone: "red", hint: "more than 3 failed" },
                ]} />
              )}

              <TableCard>
                <thead>
                  <tr>
                    <th className={thCls}>Student</th>
                    <th className={thCls}>Failed subjects</th>
                    <th className={`${thCls} text-right`}>Decision</th>
                  </tr>
                </thead>
                <tbody>
                  {(board.students || []).map((st) => {
                    const d = DECISION[st.decision] || DECISION.incomplete;
                    const failed = (st.subjects || []).filter((x) => ["fail", "reexam_fail"].includes(x.status)).map((x) => x.subject_name);
                    return (
                      <tr key={st.student_id} className="hover:bg-gray-50 cursor-pointer" onClick={() => navigate(`/education/gradebook/student/${st.student_id}/academic-history`)}>
                        <td className={tdCls}>
                          <div className="flex items-center gap-3">
                            <Avatar name={st.name} />
                            <div>
                              <div className="font-semibold text-gray-800">{st.name}</div>
                              <div className="text-[11px] text-gray-400">{st.subjects?.length || 0} subjects{st.confirmed ? " · ✓ confirmed" : ""}</div>
                            </div>
                          </div>
                        </td>
                        <td className={tdCls}>{failed.length ? <span className="text-red-600 text-xs">{failed.join(", ")}</span> : <span className="text-gray-300">—</span>}</td>
                        <td className={`${tdCls} text-right`}><Pill tone={d.tone}>{d.label}</Pill></td>
                      </tr>
                    );
                  })}
                  {(board.students || []).length === 0 && <tr><td colSpan={3} className="px-4 py-8 text-center text-sm text-gray-400">No active students.</td></tr>}
                </tbody>
              </TableCard>

              {canPromote && (board.students || []).length > 0 && (
                <Card className="mt-4">
                  <div className="flex items-center gap-2 mb-3">
                    <svg className="w-4 h-4 text-teal-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" /></svg>
                    <div>
                      <p className="text-sm font-bold text-gray-800">Leadership actions</p>
                      <p className="text-[11px] text-gray-400">Confirm records the decisions; assign moves promoted students to their next grade.</p>
                    </div>
                  </div>
                  <Btn tone="primary" size="lg" full onClick={() => confirm(false)} disabled={busy}>Confirm decisions</Btn>

                  <div className="mt-4 pt-4 border-t border-gray-100">
                    <p className="text-[11px] font-bold text-gray-500 uppercase tracking-wide mb-2">Assign promoted → next-grade class</p>
                    <div className="grid sm:grid-cols-3 gap-2 items-end">
                      <Select value={targetClassId} onChange={(e) => setTargetClassId(e.target.value)}>
                        <option value="">Target class…</option>
                        {classes.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                      </Select>
                      <Select value={targetTermId} onChange={(e) => setTargetTermId(e.target.value)}>
                        {terms.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
                      </Select>
                      <Btn tone="outline" onClick={assign} disabled={busy || !promotedIds.length}>Move {promotedIds.length} promoted →</Btn>
                    </div>
                    <p className="text-[11px] text-gray-400 mt-1.5">Only students whose confirmed target grade matches the chosen class are moved.</p>
                  </div>
                </Card>
              )}
            </>
          )}
        </>
      )}
    </Page>
  );
}
