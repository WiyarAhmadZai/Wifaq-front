import { useEffect, useState } from "react";
import { parentChildren, parentHomework, parentSubmitHomework, parentFeed } from "../../api/gradebook";
import {
  Page, Header, Card, Segmented, Select, Pill, Btn, Banner, Textarea,
  EmptyState, Loading, LoadingRow, ICON, scoreColor, fmtScore,
} from "../education/gradebookUi";

const HW_STATUS = {
  assigned:      { label: "To do", tone: "amber" },
  submitted:     { label: "Submitted", tone: "blue" },
  reviewed:      { label: "Reviewed", tone: "teal" },
  graded:        { label: "Graded", tone: "emerald" },
  not_submitted: { label: "Missed", tone: "red" },
};

/** Parent portal — a parent sees their children's homework (and can submit a
 *  photo) and a feed of new grades. Scoped server-side to the parent's family. */
export default function ParentGradebook() {
  const [children, setChildren] = useState([]);
  const [childId, setChildId] = useState("");
  const [tab, setTab] = useState("homework");
  const [homework, setHomework] = useState([]);
  const [feed, setFeed] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");
  const [err, setErr] = useState("");
  const [submitFor, setSubmitFor] = useState(null); // submission being submitted
  const [photo, setPhoto] = useState(null);
  const [note, setNote] = useState("");

  useEffect(() => {
    parentChildren()
      .then((r) => { const c = r.data?.data || []; setChildren(c); if (c.length === 1) setChildId(String(c[0].id)); })
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { load(); }, [childId]); // eslint-disable-line
  useEffect(() => { if (!msg) return; const t = setTimeout(() => setMsg(""), 4000); return () => clearTimeout(t); }, [msg]);

  function load() {
    setBusy(true); setErr("");
    const params = childId ? { child_id: childId } : {};
    Promise.all([
      parentHomework(params).then((r) => setHomework(r.data?.data || [])).catch(() => setHomework([])),
      parentFeed(params).then((r) => setFeed(r.data?.data || [])).catch(() => setFeed([])),
    ]).finally(() => setBusy(false));
  }

  async function submitWork() {
    if (!photo) return setErr("Please choose a photo of the completed work.");
    setErr(""); setBusy(true);
    try {
      const fd = new FormData();
      fd.append("photo", photo);
      if (note) fd.append("note", note);
      const r = await parentSubmitHomework(submitFor.submission_id, fd);
      setMsg(r.data?.message || "Homework submitted.");
      setSubmitFor(null); setPhoto(null); setNote("");
      load();
    } catch (e) {
      setErr(e.response?.data?.message || "Could not submit. Check the photo (jpg/png, max 5MB).");
      setBusy(false);
    }
  }

  if (loading) return <Loading />;

  const childName = children.find((c) => String(c.id) === String(childId))?.name;

  return (
    <Page>
      <Header icon={ICON.book} title="My children" subtitle={childName ? `${childName}` : "Homework & grades"} />
      {msg && <Banner onClose={() => setMsg("")}>{msg}</Banner>}
      {err && <Banner kind="error" onClose={() => setErr("")}>{err}</Banner>}

      {children.length === 0 ? (
        <EmptyState icon={ICON.book} title="No children linked to your account"
          description="Contact the school office if your child isn't showing here." />
      ) : (
        <>
          {children.length > 1 && (
            <div className="mb-3 max-w-xs">
              <Select value={childId} onChange={(e) => setChildId(e.target.value)}>
                <option value="">All my children</option>
                {children.map((c) => <option key={c.id} value={c.id}>{c.name} · {c.class}</option>)}
              </Select>
            </div>
          )}

          <div className="max-w-sm mb-4">
            <Segmented value={tab} onChange={setTab} options={[{ value: "homework", label: `Homework (${homework.length})` }, { value: "grades", label: `Grades (${feed.length})` }]} />
          </div>

          {busy && <LoadingRow />}

          {!busy && tab === "homework" && (
            homework.length === 0
              ? <EmptyState icon={ICON.clipboard} title="No homework right now" description="New homework from the teacher will appear here." />
              : <div className="space-y-3">
                  {homework.map((h) => {
                    const st = HW_STATUS[h.status] || HW_STATUS.assigned;
                    const canSubmit = h.status === "assigned" || h.status === "not_submitted";
                    return (
                      <Card key={h.submission_id}>
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <p className="text-[11px] font-bold text-teal-700">{h.subject}{children.length > 1 ? ` · ${h.student}` : ""}{h.due_date ? ` · due ${h.due_date}` : ""}</p>
                            <p className="text-sm text-gray-700 mt-0.5">{h.homework_text}</p>
                          </div>
                          <Pill tone={st.tone}>{st.label}</Pill>
                        </div>
                        {h.photo_url && <img src={h.photo_url} alt="submitted work" className="mt-2 rounded-lg max-h-40 object-contain border border-gray-100" />}
                        {h.score != null && <p className="mt-2 text-sm"><b>Score:</b> <span className="font-black" style={{ color: scoreColor((h.score / h.score_max) * 10) }}>{fmtScore(h.score)}/{fmtScore(h.score_max)}</span></p>}
                        {canSubmit && (
                          submitFor?.submission_id === h.submission_id ? (
                            <div className="mt-3 space-y-2 border-t border-gray-100 pt-3">
                              <label className="block">
                                <span className="text-[11px] font-bold text-gray-500 uppercase">Photo of completed work</span>
                                <input type="file" accept="image/*" onChange={(e) => setPhoto(e.target.files?.[0] || null)}
                                  className="mt-1 block w-full text-xs file:mr-3 file:px-3 file:py-1.5 file:rounded-lg file:border-0 file:bg-teal-700 file:text-white" />
                              </label>
                              <Textarea rows={2} value={note} onChange={(e) => setNote(e.target.value)} placeholder="Optional note to the teacher…" />
                              <div className="flex gap-2">
                                <Btn tone="primary" onClick={submitWork} disabled={busy}>Submit to teacher</Btn>
                                <Btn tone="ghost" onClick={() => { setSubmitFor(null); setPhoto(null); setNote(""); }}>Cancel</Btn>
                              </div>
                            </div>
                          ) : (
                            <div className="mt-3"><Btn tone="outline" onClick={() => { setSubmitFor(h); setPhoto(null); setNote(""); }}>📷 Submit a photo</Btn></div>
                          )
                        )}
                      </Card>
                    );
                  })}
                </div>
          )}

          {!busy && tab === "grades" && (
            feed.length === 0
              ? <EmptyState icon={ICON.check} title="No grades yet" description="New grades from the teacher will appear here." />
              : <div className="space-y-3">
                  {feed.map((g) => (
                    <Card key={g.grade_id}>
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="text-[11px] font-bold text-teal-700 capitalize">{g.subject} · {String(g.type || "").replace("_", " ")}{children.length > 1 ? ` · ${g.student}` : ""}</p>
                          <p className="text-sm font-bold text-gray-800 truncate">{g.title}</p>
                          {g.tag && <p className="text-[11px] text-gray-500 mt-0.5">{g.tag}</p>}
                          {g.note && <p className="mt-1 text-xs text-gray-600 bg-teal-50/60 rounded-lg px-2.5 py-1.5">“{g.note}”</p>}
                        </div>
                        <span className="text-2xl font-black tabular-nums" style={{ color: scoreColor((g.score / g.score_max) * 10) }}>{fmtScore(g.score)}</span>
                      </div>
                    </Card>
                  ))}
                </div>
          )}
        </>
      )}
    </Page>
  );
}
