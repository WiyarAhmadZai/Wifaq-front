import { useEffect, useState } from "react";
import { parentChildren, parentHomework, parentSubmitHomework, parentFeed } from "../../api/gradebook";
import { peekCache } from "../../api/axios";
import {
  Page, Header, Card, Segmented, Select, Pill, Btn, Banner, Textarea,
  EmptyState, Loading, LoadingRow, ICON, scoreColor, fmtScore, Avatar, mediaUrl,
} from "../education/gradebookUi";

const MUTED = "#5d7273";

const HW_STATUS = {
  assigned:      { label: "To do", tone: "amber", dot: "#B26500" },
  submitted:     { label: "Submitted", tone: "blue", dot: "#1976D2" },
  reviewed:      { label: "Reviewed", tone: "teal", dot: "#0D5C63" },
  graded:        { label: "Graded", tone: "emerald", dot: "#1A7A4C" },
  not_submitted: { label: "Missed", tone: "red", dot: "#B22929" },
};

/** Friendly wording for an edit deadline. */
function untilLabel(iso) {
  if (!iso) return null;
  const d = new Date(iso);
  const time = d.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
  const sameDay = new Date().toDateString() === d.toDateString();
  return sameDay ? `today ${time}` : `${d.toLocaleDateString([], { weekday: "short" })} ${time}`;
}

/** Parent portal — a parent sees their children's homework (submit a photo,
 *  editable for 1 day) and a feed of new grades. Scoped server-side to the family. */
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
  const [editing, setEditing] = useState(null); // submission_id being submitted/edited
  const [photo, setPhoto] = useState(null);
  const [note, setNote] = useState("");

  useEffect(() => {
    const __cached = peekCache('/parent/gradebook/children');
    if (__cached) { const c = __cached?.data || []; setChildren(c); if (c.length === 1) setChildId(String(c[0].id)); setLoading(false); }
    parentChildren()
      .then((r) => { const c = r.data?.data || []; setChildren(c); if (c.length === 1) setChildId(String(c[0].id)); })
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { load(); }, [childId]); // eslint-disable-line
  useEffect(() => { if (!msg) return; const t = setTimeout(() => setMsg(""), 4000); return () => clearTimeout(t); }, [msg]);

  function load() {
    setBusy(true); setErr("");
    const params = childId ? { child_id: childId } : {};
    const __hw = peekCache('/parent/gradebook/homework', params);
    if (__hw) setHomework(__hw?.data || []);
    const __fd = peekCache('/parent/gradebook/feed', params);
    if (__fd) setFeed(__fd?.data || []);
    Promise.all([
      parentHomework(params).then((r) => setHomework(r.data?.data || [])).catch(() => setHomework([])),
      parentFeed(params).then((r) => setFeed(r.data?.data || [])).catch(() => setFeed([])),
    ]).finally(() => setBusy(false));
  }

  const openEditor = (h) => { setEditing(h.submission_id); setPhoto(null); setNote(h.note || ""); setErr(""); };
  const closeEditor = () => { setEditing(null); setPhoto(null); setNote(""); };

  async function submitWork(h) {
    if (!photo) return setErr("Please choose a photo of the completed work.");
    setErr(""); setBusy(true);
    try {
      const fd = new FormData();
      fd.append("photo", photo);
      if (note) fd.append("note", note);
      const r = await parentSubmitHomework(h.submission_id, fd);
      setMsg(r.data?.message || "Homework submitted.");
      closeEditor(); load();
    } catch (e) {
      setErr(e.response?.data?.message || "Could not submit. Use a clear photo (jpg/png, max 5 MB).");
      setBusy(false);
    }
  }

  if (loading) return <Loading />;

  const child = children.find((c) => String(c.id) === String(childId));
  const toDo = homework.filter((h) => h.status === "assigned" || h.status === "not_submitted").length;
  const submitted = homework.filter((h) => h.status === "submitted").length;

  return (
    <Page size="sm">
      <Header icon={ICON.book} title="My Children" subtitle="Homework & grades" />
      {msg && <Banner onClose={() => setMsg("")}>{msg}</Banner>}
      {err && <Banner kind="error" onClose={() => setErr("")}>{err}</Banner>}

      {children.length === 0 ? (
        <EmptyState icon={ICON.book} title="No children linked to your account"
          description="Please contact the school office if your child isn't showing here." />
      ) : (
        <>
          {/* Child header card */}
          <Card className="flex items-center gap-3 mb-3">
            <Avatar name={child?.name || children[0]?.name} size={44} />
            <div className="flex-1 min-w-0">
              {children.length > 1 ? (
                <Select value={childId} onChange={(e) => setChildId(e.target.value)}>
                  <option value="">All my children</option>
                  {children.map((c) => <option key={c.id} value={c.id}>{c.name} · {c.class}</option>)}
                </Select>
              ) : (
                <>
                  <p className="text-sm font-black text-gray-800 truncate">{children[0]?.name}</p>
                  <p className="text-[11px] text-gray-400">{children[0]?.class}</p>
                </>
              )}
            </div>
            <div className="text-right shrink-0">
              <div className="flex gap-1.5">
                {toDo > 0 && <Pill tone="amber">{toDo} to do</Pill>}
                {submitted > 0 && <Pill tone="blue">{submitted} submitted</Pill>}
              </div>
            </div>
          </Card>

          <div className="mb-4">
            <Segmented value={tab} onChange={setTab} options={[
              { value: "homework", label: `Homework${homework.length ? ` (${homework.length})` : ""}` },
              { value: "grades", label: `Grades${feed.length ? ` (${feed.length})` : ""}` },
            ]} />
          </div>

          {busy && <LoadingRow />}

          {/* ── HOMEWORK TAB ── */}
          {!busy && tab === "homework" && (
            homework.length === 0
              ? <EmptyState icon={ICON.clipboard} title="All caught up 🎉" description="No homework to do right now. New homework from the teacher will appear here." />
              : <div className="space-y-3">
                  {homework.map((h) => {
                    const st = HW_STATUS[h.status] || HW_STATUS.assigned;
                    const isEditing = editing === h.submission_id;
                    return (
                      <div key={h.submission_id} className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                        {/* header strip */}
                        <div className="flex items-center gap-2 px-4 py-2.5 border-b border-gray-50" style={{ background: "linear-gradient(90deg,#f6faf9,#fff)" }}>
                          <span className="w-2 h-2 rounded-full" style={{ background: st.dot }} />
                          <span className="text-[11px] font-bold text-teal-800">{h.subject}</span>
                          {children.length > 1 && <span className="text-[11px] text-gray-400">· {h.student}</span>}
                          <span className="ml-auto"><Pill tone={st.tone}>{st.label}</Pill></span>
                        </div>

                        <div className="p-4">
                          <p className="text-sm text-gray-700 leading-relaxed">{h.homework_text}</p>
                          <div className="flex items-center gap-3 mt-1.5 text-[11px]" style={{ color: MUTED }}>
                            {h.due_date && <span>📅 Due {h.due_date}</span>}
                            {h.status === "submitted" && h.edit_until && <span>· ✏️ editable until <b>{untilLabel(h.edit_until)}</b></span>}
                          </div>

                          {h.photo_url && (
                            <a href={mediaUrl(h.photo_url)} target="_blank" rel="noreferrer" className="block mt-3">
                              <img src={mediaUrl(h.photo_url)} alt="submitted work" className="rounded-xl max-h-48 w-full object-cover border border-gray-100" />
                            </a>
                          )}
                          {h.note && !isEditing && <p className="mt-2 text-xs text-gray-500 italic">“{h.note}”</p>}

                          {/* inline submit / edit form */}
                          {isEditing ? (
                            <div className="mt-3 space-y-2 rounded-xl bg-gray-50 p-3">
                              <label className="block">
                                <span className="text-[11px] font-bold uppercase" style={{ color: MUTED }}>Photo of completed work</span>
                                <input type="file" accept="image/*" onChange={(e) => setPhoto(e.target.files?.[0] || null)}
                                  className="mt-1 block w-full text-xs file:mr-3 file:px-3 file:py-1.5 file:rounded-lg file:border-0 file:bg-teal-700 file:text-white file:font-semibold" />
                                {photo && <span className="text-[10px] text-emerald-600">✓ {photo.name}</span>}
                              </label>
                              <Textarea rows={2} value={note} onChange={(e) => setNote(e.target.value)} placeholder="Optional note to the teacher…" />
                              <div className="flex gap-2">
                                <Btn tone="primary" onClick={() => submitWork(h)} disabled={busy}>
                                  {h.status === "submitted" ? "Save changes" : "Submit to teacher"}
                                </Btn>
                                <Btn tone="ghost" onClick={closeEditor}>Cancel</Btn>
                              </div>
                            </div>
                          ) : h.editable ? (
                            <div className="mt-3">
                              <Btn tone={h.status === "submitted" ? "outline" : "primary"} onClick={() => openEditor(h)}>
                                {h.status === "submitted" ? "✏️ Edit submission" : "📷 Submit a photo"}
                              </Btn>
                            </div>
                          ) : null}
                        </div>
                      </div>
                    );
                  })}
                  <p className="text-[11px] text-center text-gray-400 pt-1">Submitted homework can be edited for one day, then it locks and moves out of this list.</p>
                </div>
          )}

          {/* ── GRADES TAB ── */}
          {!busy && tab === "grades" && (
            feed.length === 0
              ? <EmptyState icon={ICON.check} title="No grades yet" description="New grades from the teacher will appear here." />
              : <div className="space-y-3">
                  {feed.map((g) => {
                    const norm = (g.score / g.score_max) * 10;
                    return (
                      <Card key={g.grade_id} className="flex items-center gap-4">
                        {/* score badge */}
                        <div className="shrink-0 w-14 h-14 rounded-2xl flex flex-col items-center justify-center text-white"
                          style={{ background: scoreColor(norm) }}>
                          <span className="text-lg font-black leading-none">{fmtScore(g.score)}</span>
                          <span className="text-[9px] opacity-80">/ {fmtScore(g.score_max)}</span>
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="text-[11px] font-bold text-teal-700 capitalize">{g.subject} · {String(g.type || "").replace("_", " ")}{children.length > 1 ? ` · ${g.student}` : ""}</p>
                          <p className="text-sm font-bold text-gray-800 truncate">{g.title}</p>
                          {g.tag && <span className="inline-block mt-1"><Pill tone="gray">{g.tag}</Pill></span>}
                          {g.note && <p className="mt-1.5 text-xs text-gray-600 bg-teal-50/60 rounded-lg px-2.5 py-1.5">“{g.note}”</p>}
                        </div>
                      </Card>
                    );
                  })}
                </div>
          )}
        </>
      )}
    </Page>
  );
}
