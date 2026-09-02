import { useState, useEffect, useCallback, useMemo } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { get, post, put, del } from "../../api/axios";
import Swal from "sweetalert2";
import { TEAL, GOLD } from "../education/weeklyUi";


const TYPE_LABEL = {
  opening: "Opening", quran: "Quran recitation", poem: "Poem", naat: "Naat", qa: "Question & answer",
  article: "Article / talk", anthem: "Anthem", sport: "Sport / movement", social: "Social item",
  recognition: "Recognition", closing: "Closing", other: "Other",
};

/**
 * Types a group normally performs rather than one child — an anthem or a naat
 * is sung together. Only a default: the team panel can be opened on any item,
 * and a group item can still be left as a solo one.
 */
const GROUP_TYPES = new Set(["anthem", "naat", "poem", "social", "sport", "qa"]);

const Spinner = () => (
  <div className="flex justify-center py-16">
    <div className="w-7 h-7 border-2 rounded-full animate-spin" style={{ borderColor: "#CFE6E6", borderTopColor: TEAL }} />
  </div>
);

const EMPTY_ITEM = {
  type: "other", title: "", duration_minutes: 2, assigned_student_id: "", assigned_role: "", notes: "",
  // [{ student_id, is_leader }] — empty means a single presenter.
  members: [],
};

/**
 * Agenda Builder + day-before prep.
 *
 * Two jobs on one screen because they are the same teacher's work a day apart:
 * building the ordered activity blocks near the 20-minute target, and — from
 * the "arrange by" date — walking each role and marking it ready. The assembly
 * flips to 'ready' on its own once every role is checked.
 */
export default function AssemblyAgenda() {
  const navigate = useNavigate();
  const { id } = useParams();

  const [loading, setLoading] = useState(true);
  const [a, setA] = useState(null);
  const [ref, setRef] = useState(null);
  const [busy, setBusy] = useState(false);

  const [adding, setAdding] = useState(false);
  const [draft, setDraft] = useState(EMPTY_ITEM);
  const [editingId, setEditingId] = useState(null);
  // Searching the whole school for group members, and whether the panel is open.
  const [memberSearch, setMemberSearch] = useState("");
  const [showGroup, setShowGroup] = useState(false);

  const load = useCallback(async () => {
    try {
      const [res, fd] = await Promise.all([get(`/assemblies/${id}`), get("/assemblies/form-data")]);
      setA(res.data.data);
      setRef(fd.data);
    } catch (err) {
      Swal.fire("Error", err.response?.data?.message || "Failed to load the assembly", "error");
    } finally { setLoading(false); }
  }, [id]);

  useEffect(() => { load(); }, [load]);

  const apply = (res) => { if (res?.data?.data) setA(res.data.data); };

  /**
   * Who this role can go to.
   *
   * The order the school works in is class → student → responsibility, so by
   * the time a role is being handed out the class is already settled: either
   * the performing class chosen on the plan screen, or the hand-picked team.
   * The list never widens past that, and the API is scoped the same way, so a
   * teacher only ever sees the students of the class they supervise.
   */
  const roleCandidates = useMemo(() => {
    if (!a) return [];
    if (a.unit_type === "team" && a.team_members?.length) {
      return a.team_members.map((m) => ({ id: m.student_id, name: m.name, class: m.class }));
    }
    const pool = ref?.students || [];
    if (a.unit_type === "class" && a.school_class_id) {
      return pool.filter((s) => String(s.class_id) === String(a.school_class_id));
    }
    return pool;
  }, [a, ref]);

  /**
   * Who a GROUP may be built from.
   *
   * Wider than roleCandidates on purpose. A class assembly still hands its
   * ordinary roles to its own students, but a special program — a ترانه or a
   * نعت — is put together from whoever can perform it, whatever class they sit
   * in. The API applies the same per-teacher scope to every member, so this
   * offers reach without granting it.
   */
  const groupCandidates = useMemo(() => {
    const pool = ref?.students || [];
    const q = memberSearch.trim().toLowerCase();
    const base = q
      ? pool.filter((s) => [s.name, s.class, s.code].some((v) => (v || "").toLowerCase().includes(q)))
      : pool;
    return base.slice(0, 40);
  }, [ref, memberSearch]);

  /* ── The group performing this item ───────────────────────────────────
   * Members may come from any class; a leader is optional and there is at most
   * one, which is enforced by construction rather than by validating a set of
   * parallel booleans afterwards. */
  const inGroup = (sid) => (draft.members || []).some((m) => m.student_id === sid);

  const toggleGroupMember = (sid) =>
    setDraft((d) => {
      const members = inGroup(sid)
        ? d.members.filter((m) => m.student_id !== sid)
        : [...(d.members || []), { student_id: sid, is_leader: false }];
      return { ...d, members };
    });

  const setGroupLeader = (sid) =>
    setDraft((d) => ({
      ...d,
      members: (d.members || []).map((m) => ({
        ...m,
        // Tapping the current leader clears the role rather than re-setting it.
        is_leader: m.student_id === sid ? !m.is_leader : false,
      })),
    }));

  const nameOf = (sid) => {
    const s = (ref?.students || []).find((x) => x.id === sid);
    return s ? `${s.name}${s.class ? ` · ${s.class}` : ""}` : `#${sid}`;
  };

  const saveItem = async () => {
    if (!draft.title.trim()) return Swal.fire("Title needed", "Name this activity.", "info");
    setBusy(true);
    try {
      const body = {
        type: draft.type,
        title: draft.title.trim(),
        duration_minutes: Number(draft.duration_minutes) || 1,
        assigned_student_id: draft.assigned_student_id ? Number(draft.assigned_student_id) : null,
        assigned_role: draft.assigned_role?.trim() || null,
        notes: draft.notes?.trim() || null,
        members: (draft.members || []).map((m) => ({
          student_id: Number(m.student_id),
          is_leader: Boolean(m.is_leader),
        })),
      };
      const res = editingId
        ? await put(`/assemblies/${id}/items/${editingId}`, body)
        : await post(`/assemblies/${id}/items`, body);
      apply(res);
      setDraft(EMPTY_ITEM); setAdding(false); setEditingId(null);
    } catch (err) {
      Swal.fire("Error", err.response?.data?.message || "Failed to save the activity", "error");
    } finally { setBusy(false); }
  };

  const editItem = (item) => {
    setDraft({
      type: item.type, title: item.title, duration_minutes: item.duration_minutes,
      assigned_student_id: item.assigned_student_id || "", assigned_role: item.assigned_role || "",
      members: (item.members || []).map((m) => ({ student_id: m.student_id, is_leader: Boolean(m.is_leader) })),
      notes: item.notes || "",
    });
    setEditingId(item.id);
    setAdding(true);
  };

  const removeItem = async (item) => {
    const r = await Swal.fire({ title: "Remove this activity?", text: item.title, icon: "warning", showCancelButton: true, confirmButtonColor: "#ef4444" });
    if (!r.isConfirmed) return;
    try { apply(await del(`/assemblies/${id}/items/${item.id}`)); }
    catch (err) { Swal.fire("Error", err.response?.data?.message || "Failed", "error"); }
  };

  const toggleReady = async (item) => {
    try { apply(await post(`/assemblies/${id}/items/${item.id}/ready`, { ready: !item.ready })); }
    catch (err) { Swal.fire("Error", err.response?.data?.message || "Failed", "error"); }
  };

  const move = async (index, dir) => {
    const items = [...(a?.items || [])];
    const j = index + dir;
    if (j < 0 || j >= items.length) return;
    [items[index], items[j]] = [items[j], items[index]];
    try { apply(await post(`/assemblies/${id}/items/reorder`, { order: items.map((i) => i.id) })); }
    catch (err) { Swal.fire("Error", err.response?.data?.message || "Failed", "error"); }
  };

  const readyAll = async () => {
    const r = await Swal.fire({
      title: "Mark every role ready?",
      text: "Confirm you have checked each student and role for tomorrow morning.",
      icon: "question", showCancelButton: true, confirmButtonColor: "#2E7D5B",
      confirmButtonText: "✓ All arranged",
    });
    if (!r.isConfirmed) return;
    try { apply(await post(`/assemblies/${id}/ready-all`)); }
    catch (err) { Swal.fire("Error", err.response?.data?.message || "Failed", "error"); }
  };

  const honourWinner = async () => {
    try {
      apply(await post(`/assemblies/${id}/honour-winner`));
      Swal.fire({ icon: "success", title: "Weekly winner added to the agenda", timer: 1400, showConfirmButton: false });
    } catch (err) {
      Swal.fire("No winner yet", err.response?.data?.message || "There is no weekly winner to honour.", "info");
    }
  };

  if (loading) return <Spinner />;
  if (!a) return <div className="px-4 py-16 text-center text-sm text-[#5A7A7E]">Assembly not found.</div>;

  const canArrange = Boolean(a.can_arrange);
  const overTarget = a.total_minutes > a.target_minutes;
  const field = "w-full px-3 py-2 border border-[#D0E0E0] rounded-xl text-sm focus:ring-2 focus:ring-[#9CCBCB] focus:outline-none";

  return (
    <div className="min-h-screen bg-[#F4F8F8]">
      <div className="px-5 py-4" style={{ background: TEAL }}>
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div className="min-w-0">
            <div className="text-[11px] text-[#CFE6E6]">
              {a.date}{a.day_name ? ` (${a.day_name})` : ""} · {a.unit_type === "class" ? "🏫" : "👥"} {a.unit}
              {a.lead_teacher ? ` · Lead: ${a.lead_teacher}` : ""}
            </div>
            <h1 className="text-sm font-bold text-white truncate">{a.theme}</h1>
          </div>
          <div className="flex gap-2 flex-wrap">
            <button onClick={() => navigate(`/assembly/${id}/run-sheet`)}
              className="px-4 py-1.5 bg-white/15 hover:bg-white/25 text-white rounded-xl text-xs font-bold">
              🎤 Run sheet
            </button>
            {canArrange && (
              <button onClick={() => navigate(`/assembly/plan/${id}`)}
                className="px-4 py-1.5 bg-white/15 hover:bg-white/25 text-white rounded-xl text-xs font-bold">
                ✎ Edit plan
              </button>
            )}
          </div>
        </div>
      </div>

      <div className="px-4 py-5 space-y-4 max-w-4xl mx-auto">
        {/* Day-before prep banner — the whole point of the readiness column. */}
        <div className="rounded-2xl px-4 py-3 border flex items-center justify-between gap-3 flex-wrap"
          style={
            a.status === "ready"
              ? { background: "#E6F3EC", borderColor: "#A8D3BC", color: "#2E7D5B" }
              : a.prep_open
                ? { background: "#FBF3DB", borderColor: "#E8D48B", color: "#9A7B12" }
                : { background: "#fff", borderColor: "#D0E0E0", color: "#5A7A7E" }
          }>
          <div className="text-xs">
            {a.status === "ready" ? (
              <><b>Ready for the morning.</b> All {a.items_total} roles are confirmed.</>
            ) : a.status === "done" ? (
              <><b>Done and archived.</b> This program is saved as a reusable template.</>
            ) : a.prep_open ? (
              <><b>Prep window is open</b> (arrange by {a.prepare_by}). {a.pending_roles} role{a.pending_roles === 1 ? "" : "s"} still to confirm.</>
            ) : (
              <>Prep opens on <b>{a.prepare_by}</b> — the day before. {a.items_ready}/{a.items_total} roles confirmed so far.</>
            )}
          </div>
          {canArrange && a.status !== "done" && a.items_total > 0 && a.pending_roles > 0 && (
            <button onClick={readyAll}
              className="px-4 py-1.5 rounded-xl text-xs font-bold text-white shrink-0" style={{ background: "#2E7D5B" }}>
              ✓ Everything is arranged
            </button>
          )}
        </div>

        <div className="bg-[#E8F6F6] rounded-xl px-4 py-2.5 text-[11px] flex gap-2" style={{ color: TEAL }}>
          <span>📎</span>
          <span>
            Role names come from the <b>Assembly Program Kit</b> role template · student assignments can surface
            on the <b>Task Board</b> · the <b>weekly best performer</b> slots in as a recognition block.
          </span>
        </div>

        {/* Agenda */}
        <div className="space-y-2">
          {(a.items || []).length === 0 && (
            <div className="bg-white rounded-2xl border border-[#D0E0E0] p-8 text-center">
              <p className="text-sm font-semibold text-[#0A3A3E]">The agenda is empty</p>
              <p className="text-xs text-[#5A7A7E] mt-1">Add activity blocks — opening, Quran, poem, Q&A, closing…</p>
            </div>
          )}

          {(a.items || []).map((item, idx) => (
            <div key={item.id}
              className="flex items-center gap-3 bg-white border rounded-2xl px-3.5 py-3"
              style={{
                borderColor: item.type === "recognition" ? "#E8D48B" : "#D0E0E0",
                background: item.type === "recognition" ? "#FFF8E7" : "#fff",
              }}>
              <div className="w-7 h-7 rounded-full flex items-center justify-center text-white text-xs font-bold shrink-0"
                style={{ background: item.type === "recognition" ? GOLD : TEAL }}>
                {idx + 1}
              </div>

              <div className="min-w-0 flex-1">
                <div className="text-[13px] font-semibold text-[#0A3A3E]">{item.title}</div>
                <div className="text-[11px] text-[#5A7A7E] mt-0.5">
                  {TYPE_LABEL[item.type] || item.type}
                  {item.assigned_role ? ` · ${item.assigned_role}` : ""}
                  {item.student ? ` · ${item.student}` : ""}
                </div>
                {/* A group item names who performs it right on the row —
                    otherwise the only way to see the team is to open the
                    editor, and the run sheet is read at a glance. */}
                {item.members?.length > 0 && (
                  <div className="text-[11px] mt-0.5" style={{ color: TEAL }}>
                    {item.members.map((m) => (m.is_leader ? `★ ${m.name}` : m.name)).join(" · ")}
                    <span className="text-[#8AA4A7]">
                      {" — "}{item.members.length} performer{item.members.length === 1 ? "" : "s"}
                    </span>
                  </div>
                )}
                {item.notes && <div className="text-[11px] text-[#8AA4A7] mt-0.5">{item.notes}</div>}
              </div>

              <span className="text-[11px] font-bold px-2.5 py-1 rounded-full shrink-0"
                style={{ background: "#E8F6F6", color: TEAL }}>
                {item.duration_minutes} min
              </span>

              {canArrange && a.status !== "done" && (
                <div className="flex items-center gap-1 shrink-0">
                  <button onClick={() => move(idx, -1)} disabled={idx === 0}
                    className="text-[#B6C9CB] hover:text-[#5A7A7E] disabled:opacity-30 text-xs px-1">▲</button>
                  <button onClick={() => move(idx, 1)} disabled={idx === (a.items.length - 1)}
                    className="text-[#B6C9CB] hover:text-[#5A7A7E] disabled:opacity-30 text-xs px-1">▼</button>
                  <button onClick={() => editItem(item)} className="text-[#8AA4A7] hover:text-[#0A3A3E] text-xs px-1">✎</button>
                  <button onClick={() => removeItem(item)} className="text-red-300 hover:text-red-600 text-xs px-1">✕</button>
                </div>
              )}

              {/* The ready check — the day-before prep signal. */}
              <button
                onClick={() => canArrange && a.status !== "done" && toggleReady(item)}
                disabled={!canArrange || a.status === "done"}
                title={item.ready ? `Ready${item.ready_at ? ` · ${item.ready_at}` : ""}` : "Not ready yet"}
                className="w-6 h-6 rounded-full border-2 flex items-center justify-center text-[11px] shrink-0 disabled:cursor-default"
                style={{
                  background: item.ready ? "#2E7D5B" : "#fff",
                  borderColor: item.ready ? "#2E7D5B" : "#D0E0E0",
                  color: item.ready ? "#fff" : "transparent",
                }}>
                ✓
              </button>
            </div>
          ))}
        </div>

        {/* Running total against the 20-minute target */}
        <div className="rounded-2xl px-4 py-3 flex items-center justify-between text-white" style={{ background: "#052528" }}>
          <div className="text-xs">Total programme time</div>
          <div className="text-sm">
            <span className="text-2xl font-bold" style={{ color: overTarget ? "#F0A9A6" : "#A8D3BC" }}>
              {a.total_minutes}
            </span>
            <span className="opacity-70 text-xs"> / {a.target_minutes} min target · {a.items_ready} of {a.items_total} roles ready</span>
          </div>
        </div>

        {/* Add / edit an activity */}
        {canArrange && a.status !== "done" && (
          adding ? (
            <div className="bg-white rounded-2xl border border-[#D0E0E0] shadow-sm p-4">
              <h3 className="text-[10px] font-bold text-[#5A7A7E] uppercase tracking-wider mb-3">
                {editingId ? "Edit activity" : "Add activity"}
              </h3>

              <div className="grid md:grid-cols-4 gap-3">
                <div>
                  <label className="block text-[10px] text-[#5A7A7E] mb-1">Type</label>
                  <select value={draft.type} onChange={(e) => setDraft({ ...draft, type: e.target.value })} className={field}>
                    {(ref?.item_types || Object.keys(TYPE_LABEL)).map((t) => (
                      <option key={t} value={t}>{TYPE_LABEL[t] || t}</option>
                    ))}
                  </select>
                </div>
                <div className="md:col-span-2">
                  <label className="block text-[10px] text-[#5A7A7E] mb-1">Title</label>
                  <input value={draft.title} onChange={(e) => setDraft({ ...draft, title: e.target.value })}
                    placeholder="e.g. Quran recitation & translation" className={field} />
                </div>
                <div>
                  <label className="block text-[10px] text-[#5A7A7E] mb-1">Minutes</label>
                  <input type="number" min={1} max={120} value={draft.duration_minutes}
                    onChange={(e) => setDraft({ ...draft, duration_minutes: e.target.value })} className={field} />
                </div>
              </div>

              <div className="grid md:grid-cols-2 gap-3 mt-3">
                <div>
                  <label className="block text-[10px] text-[#5A7A7E] mb-1">Role <span className="text-[#8AA4A7]">(from the Kit's template)</span></label>
                  <input list="assembly-roles" value={draft.assigned_role}
                    onChange={(e) => setDraft({ ...draft, assigned_role: e.target.value })}
                    placeholder="e.g. Quran Reciter" className={field} />
                  <datalist id="assembly-roles">
                    {(a.role_template || ref?.role_template || []).map((r) => <option key={r} value={r} />)}
                  </datalist>
                </div>
                <div>
                  <label className="block text-[10px] text-[#5A7A7E] mb-1">
                    Assigned student
                    <span className="text-[#8AA4A7]"> — {a.unit || "this unit"}</span>
                  </label>
                  <select value={draft.assigned_student_id}
                    onChange={(e) => setDraft({ ...draft, assigned_student_id: e.target.value })} className={field}>
                    <option value="">
                      {roleCandidates.length === 0 ? "No students available for this unit" : "Not assigned yet…"}
                    </option>
                    {roleCandidates.map((s) => (
                      <option key={s.id} value={s.id}>{s.name}{s.class ? ` — ${s.class}` : ""}</option>
                    ))}
                  </select>
                  <p className="text-[10px] text-[#8AA4A7] mt-1">
                    {roleCandidates.length === 0
                      ? "Set the performing class on the plan screen first."
                      : `${roleCandidates.length} student${roleCandidates.length === 1 ? "" : "s"} · they are notified as soon as you save this role.`}
                  </p>
                </div>
              </div>

              {/* ── A group instead of one child ──
                * An anthem or a naat is performed together, and the performers
                * are picked from wherever they are rather than from the single
                * class running the assembly. Opened by default for the types
                * that are normally group items. */}
              {(() => {
                const open = showGroup || GROUP_TYPES.has(draft.type) || (draft.members || []).length > 0;
                if (!open) {
                  return (
                    <button type="button" onClick={() => setShowGroup(true)}
                      className="mt-3 text-[11px] font-semibold underline" style={{ color: TEAL }}>
                      + Performed by a group instead of one student
                    </button>
                  );
                }
                const members = draft.members || [];
                return (
                  <div className="mt-3 rounded-xl border border-[#D0E0E0] p-3">
                    <div className="flex items-center justify-between gap-2 flex-wrap mb-2">
                      <label className="block text-[10px] font-bold text-[#5A7A7E] uppercase tracking-wider">
                        Performing group <span className="normal-case font-normal text-[#8AA4A7]">— any class</span>
                      </label>
                      <span className="text-[10px]" style={{ color: members.length ? TEAL : "#8AA4A7" }}>
                        {members.length
                          ? `${members.length} member${members.length === 1 ? "" : "s"}${members.some((m) => m.is_leader) ? " · leader chosen" : " · tap ☆ for the leader"}`
                          : "Nobody added yet"}
                      </span>
                    </div>

                    {members.length > 0 && (
                      <div className="rounded-lg border border-[#D0E0E0] divide-y divide-[#D0E0E0] mb-2">
                        {members.map((m) => (
                          <div key={m.student_id} className="flex items-center gap-2 px-2.5 py-1.5">
                            <button type="button" onClick={() => setGroupLeader(m.student_id)}
                              title={m.is_leader ? "Group leader — tap to clear" : "Make group leader"}
                              className="text-sm leading-none shrink-0"
                              style={{ color: m.is_leader ? GOLD : "#C3D0D0" }}>
                              {m.is_leader ? "★" : "☆"}
                            </button>
                            <span className="text-[11px] text-[#0A3A3E] min-w-0 flex-1 truncate">{nameOf(m.student_id)}</span>
                            {m.is_leader && (
                              <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full shrink-0"
                                style={{ background: "#FFF8E7", color: "#8A6F10" }}>Leader</span>
                            )}
                            <button type="button" onClick={() => toggleGroupMember(m.student_id)}
                              title="Remove" className="text-[#8AA4A7] hover:text-red-500 text-xs shrink-0">✕</button>
                          </div>
                        ))}
                      </div>
                    )}

                    <input value={memberSearch} onChange={(e) => setMemberSearch(e.target.value)}
                      placeholder="Search any student by name or class…" className={field} />
                    <div className="flex flex-wrap gap-1.5 mt-2 max-h-40 overflow-y-auto">
                      {groupCandidates.map((s) => {
                        const on = inGroup(s.id);
                        return (
                          <span key={s.id} onClick={() => toggleGroupMember(s.id)}
                            className="px-2.5 py-1 rounded-full text-[11px] cursor-pointer border"
                            style={{
                              background: on ? TEAL : "#fff",
                              color: on ? "#fff" : "#0A3A3E",
                              borderColor: on ? TEAL : "#D0E0E0",
                            }}>
                            {s.name}{s.class ? ` (${s.class})` : ""} {on ? "✓" : "+"}
                          </span>
                        );
                      })}
                      {groupCandidates.length === 0 && (
                        <span className="text-[10px] text-[#8AA4A7]">No student matches that search.</span>
                      )}
                    </div>
                    <p className="text-[10px] text-[#8AA4A7] mt-2">
                      Leave this empty for an item one student presents on their own.
                    </p>
                  </div>
                );
              })()}

              <div className="mt-3">
                <label className="block text-[10px] text-[#5A7A7E] mb-1">Notes (optional)</label>
                <input value={draft.notes} onChange={(e) => setDraft({ ...draft, notes: e.target.value })}
                  placeholder="e.g. Surah on trust / amanah" className={field} />
              </div>

              <div className="flex gap-2 mt-4">
                <button onClick={saveItem} disabled={busy}
                  className="px-5 py-2 text-xs font-semibold text-white rounded-xl disabled:opacity-50" style={{ background: TEAL }}>
                  {busy ? "Saving…" : editingId ? "Save changes" : "Add to agenda"}
                </button>
                <button onClick={() => { setAdding(false); setEditingId(null); setDraft(EMPTY_ITEM); }}
                  className="px-4 py-2 text-xs font-semibold text-[#5A7A7E]">Cancel</button>
              </div>
            </div>
          ) : (
            <div className="flex gap-2 flex-wrap">
              <button onClick={() => { setDraft(EMPTY_ITEM); setAdding(true); }}
                className="px-4 py-2 text-xs font-semibold text-white rounded-xl" style={{ background: TEAL }}>
                ＋ Add activity
              </button>
              <button onClick={honourWinner}
                className="px-4 py-2 text-xs font-semibold rounded-xl border bg-white"
                style={{ borderColor: "#E8D48B", color: "#8A6F10" }}>
                🏆 Honour the weekly winner
                {ref?.weekly_award?.student ? ` (${ref.weekly_award.student})` : ""}
              </button>
              <button onClick={() => navigate("/assembly/templates")}
                className="px-4 py-2 text-xs font-semibold text-[#5A7A7E] border border-[#D0E0E0] rounded-xl bg-white hover:bg-[#F4F8F8]">
                ⧉ Start from an archived program
              </button>
            </div>
          )
        )}

        {!canArrange && (
          <div className="bg-[#FFF8E7] border border-[#E8D48B] rounded-2xl px-4 py-3 text-xs text-[#8A6F10]">
            Only the supervising teacher assigned to this assembly (or leadership) can build the agenda and mark roles ready.
          </div>
        )}
      </div>
    </div>
  );
}
