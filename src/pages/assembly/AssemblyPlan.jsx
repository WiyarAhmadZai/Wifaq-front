import { useState, useEffect, useCallback, useMemo } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { get, post, put } from "../../api/axios";
import Swal from "sweetalert2";
import { TEAL } from "../education/weeklyUi";


const Spinner = () => (
  <div className="flex justify-center py-16">
    <div className="w-7 h-7 border-2 rounded-full animate-spin" style={{ borderColor: "#CFE6E6", borderTopColor: TEAL }} />
  </div>
);

const dayBefore = (iso) => {
  if (!iso) return "";
  const d = new Date(iso);
  d.setDate(d.getDate() - 1);
  return d.toISOString().slice(0, 10);
};

/**
 * The weekday the chosen date falls on.
 *
 * Parsed from the parts rather than `new Date(iso)` — that form is read as UTC
 * midnight, so anywhere east of Greenwich it lands on the previous day and the
 * form would name the wrong weekday.
 */
const weekdayOf = (iso) => {
  if (!iso) return "";
  const [y, m, d] = iso.split("-").map(Number);
  if (!y || !m || !d) return "";
  return new Date(y, m - 1, d).toLocaleDateString(undefined, { weekday: "long" });
};

/**
 * Plan Assembly — deliberately quick, because assemblies are arranged a few
 * days ahead, not weeks. Set date, theme, lead teacher and the performing unit
 * (a whole class OR a hand-picked cross-class team — the field takes either),
 * then move on to the agenda.
 */
export default function AssemblyPlan() {
  const navigate = useNavigate();
  const { id } = useParams();
  const editing = Boolean(id);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [ref, setRef] = useState(null);       // classes / teachers / students
  const [teamSearch, setTeamSearch] = useState("");

  const [form, setForm] = useState({
    date: "", prepare_by: "", theme: "", performing_unit_type: "class",
    school_class_id: "", team_name: "", lead_teacher_id: "", target_minutes: 20, notes: "",
  });
  const [team, setTeam] = useState([]); // student ids
  // { [student_id]: role } — the class roster's assignments. Kept as a plain
  // map so a row edit never has to walk an array to find its own entry.
  const [roles, setRoles] = useState({});
  const [rosterSearch, setRosterSearch] = useState("");

  const load = useCallback(async () => {
    try {
      const fd = await get("/assemblies/form-data");
      setRef(fd.data);

      if (editing) {
        const res = await get(`/assemblies/${id}`);
        const a = res.data.data;
        setForm({
          date: a.date || "",
          prepare_by: a.prepare_by || "",
          theme: a.theme || "",
          performing_unit_type: a.unit_type || "class",
          school_class_id: a.school_class_id || "",
          team_name: a.team_name || "",
          lead_teacher_id: a.lead_teacher_id || "",
          target_minutes: a.target_minutes || 20,
          notes: a.notes || "",
        });
        setTeam((a.team_members || []).map((m) => m.student_id));
        // Whoever already has a block on the agenda shows up on the roster with
        // their role filled in, so the two screens never disagree.
        setRoles(Object.fromEntries(
          (a.items || [])
            .filter((i) => i.assigned_student_id)
            .map((i) => [i.assigned_student_id, i.assigned_role || i.title || ""]),
        ));
      } else {
        // Default to tomorrow — the realistic planning horizon.
        const t = new Date(); t.setDate(t.getDate() + 1);
        const iso = t.toISOString().slice(0, 10);
        // A teacher who supervises exactly one class has no choice to make, so
        // it is already chosen. Leadership still picks from the full list.
        const only = (fd.data?.classes || []).length === 1 ? fd.data.classes[0].id : "";
        setForm((f) => ({ ...f, date: iso, prepare_by: dayBefore(iso), school_class_id: only }));
      }
    } catch (err) {
      Swal.fire("Error", err.response?.data?.message || "Failed to load the planner", "error");
    } finally { setLoading(false); }
  }, [editing, id]);

  useEffect(() => { load(); }, [load]);

  const setDate = (iso) => setForm((f) => ({ ...f, date: iso, prepare_by: dayBefore(iso) }));

  const students = useMemo(() => ref?.students || [], [ref]);
  const classes = useMemo(() => ref?.classes || [], [ref]);
  const scope = ref?.scope;
  // Who is actually reachable once a class is chosen — the number the teacher
  // wants confirmed before they move on to handing out roles.
  const classStudents = useMemo(
    () => students.filter((s) => String(s.class_id) === String(form.school_class_id)),
    [students, form.school_class_id],
  );
  const teamCandidates = useMemo(() => {
    const q = teamSearch.trim().toLowerCase();
    if (!q) return students.slice(0, 40);
    return students.filter((s) => [s.name, s.class, s.code].some((v) => (v || "").toLowerCase().includes(q))).slice(0, 40);
  }, [students, teamSearch]);

  const toggleMember = (sid) =>
    setTeam((prev) => (prev.includes(sid) ? prev.filter((x) => x !== sid) : [...prev, sid]));

  /**
   * The people this assembly can hand roles to: the chosen class, or the
   * hand-picked team. Same rule the agenda screen uses, so a student never
   * appears on one and not the other.
   */
  const rosterPool = useMemo(() => {
    if (form.performing_unit_type === "team") {
      return students.filter((s) => team.includes(s.id));
    }
    return classStudents;
  }, [form.performing_unit_type, students, team, classStudents]);

  const roster = useMemo(() => {
    const q = rosterSearch.trim().toLowerCase();
    if (!q) return rosterPool;
    return rosterPool.filter((s) => [s.name, s.code].some((v) => (v || "").toLowerCase().includes(q)));
  }, [rosterPool, rosterSearch]);

  const roleFor = (sid) => roles[sid] || "";
  const setRoleFor = (sid, role) => setRoles((prev) => ({ ...prev, [sid]: role }));
  const assignedCount = rosterPool.filter((s) => (roles[s.id] || "").trim()).length;

  const save = async (thenAgenda) => {
    if (!form.date) return Swal.fire("Date needed", "Which morning is this assembly?", "info");
    if (!form.theme.trim()) return Swal.fire("Theme needed", "Give the assembly a theme.", "info");
    if (form.performing_unit_type === "class" && !form.school_class_id)
      return Swal.fire("Pick the class", "Choose which class is performing.", "info");
    if (form.performing_unit_type === "team" && !form.team_name.trim())
      return Swal.fire("Name the team", "Give the cross-class team a name.", "info");

    setSaving(true);
    try {
      const body = {
        date: form.date,
        prepare_by: form.prepare_by || dayBefore(form.date),
        theme: form.theme.trim(),
        performing_unit_type: form.performing_unit_type,
        school_class_id: form.performing_unit_type === "class" ? Number(form.school_class_id) : null,
        team_name: form.performing_unit_type === "team" ? form.team_name.trim() : null,
        lead_teacher_id: form.lead_teacher_id ? Number(form.lead_teacher_id) : null,
        target_minutes: Number(form.target_minutes) || 20,
        notes: form.notes?.trim() || null,
        team_members: form.performing_unit_type === "team" ? team : [],
        // Only rows that actually name a role. Clearing one here does not
        // delete the block — removal lives on the agenda screen, where the
        // notes and minutes that would be lost are visible.
        role_assignments: rosterPool
          .filter((s) => (roles[s.id] || "").trim())
          .map((s) => ({ student_id: s.id, role: roles[s.id].trim() })),
      };

      const res = editing
        ? await put(`/assemblies/${id}`, body)
        : await post("/assemblies", body);

      const savedId = res.data?.data?.id || id;
      if (thenAgenda) navigate(`/assembly/${savedId}/agenda`);
      else {
        Swal.fire({ icon: "success", title: "Assembly saved", timer: 1200, showConfirmButton: false });
        navigate("/assembly/calendar");
      }
    } catch (err) {
      Swal.fire("Error", err.response?.data?.message || "Failed to save the assembly", "error");
    } finally { setSaving(false); }
  };

  if (loading) return <Spinner />;

  const field = "w-full px-3 py-2 border border-[#D0E0E0] rounded-xl text-sm focus:ring-2 focus:ring-[#9CCBCB] focus:outline-none";

  return (
    <div className="min-h-screen bg-[#F4F8F8]">
      <div className="px-5 py-4" style={{ background: TEAL }}>
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h1 className="text-sm font-bold text-white">{editing ? "Edit Assembly" : "Plan Assembly"}</h1>
            <p className="text-xs text-[#CFE6E6] mt-0.5">Set the basics, pick who performs, then build the agenda.</p>
          </div>
          <button onClick={() => save(true)} disabled={saving}
            className="px-4 py-1.5 bg-white/15 hover:bg-white/25 text-white rounded-xl text-xs font-bold disabled:opacity-50">
            {saving ? "Saving…" : "Next: build agenda →"}
          </button>
        </div>
      </div>

      <div className="px-4 py-5 space-y-4 max-w-3xl mx-auto">
        <div className="bg-[#FFF8E7] border-l-4 rounded-xl px-4 py-3 text-xs" style={{ borderColor: "#C9A227", color: "#6B5100" }}>
          Assemblies are planned just a few days ahead — no approval chain. The supervising teacher you assign
          here is the one who arranges it and marks the roles ready the day before.
        </div>

        <div className="bg-white rounded-2xl border border-[#D0E0E0] shadow-sm p-4">
          <h3 className="text-[10px] font-bold text-[#5A7A7E] uppercase tracking-wider mb-3">Assembly basics</h3>

          <div className="grid md:grid-cols-4 gap-3">
            <div className="md:col-span-2">
              <label className="block text-[10px] text-[#5A7A7E] mb-1">Assembly date</label>
              <div className="flex items-center gap-2">
                <input type="date" value={form.date} onChange={(e) => setDate(e.target.value)} className={field} />
                {/* The weekday follows the date on its own — one field to fill,
                    and nobody has to check a calendar to see which day it is. */}
                {form.date && (
                  <span className="px-3 py-2 rounded-xl text-xs font-bold whitespace-nowrap"
                    style={{ background: "#E8F6F6", color: TEAL }}>
                    {weekdayOf(form.date)}
                  </span>
                )}
              </div>
              <p className="text-[10px] text-[#8AA4A7] mt-1">
                Arrange by {form.prepare_by || dayBefore(form.date) || "the day before"} — set automatically.
              </p>
            </div>
            <div className="md:col-span-2">
              <label className="block text-[10px] text-[#5A7A7E] mb-1">Theme</label>
              <input value={form.theme} onChange={(e) => setForm({ ...form, theme: e.target.value })}
                placeholder="e.g. Honesty & Trustworthiness" className={field} />
            </div>
          </div>

          <div className="grid md:grid-cols-2 gap-3 mt-3">
            <div>
              <label className="block text-[10px] text-[#5A7A7E] mb-1">Supervising (lead) teacher</label>
              <select value={form.lead_teacher_id} onChange={(e) => setForm({ ...form, lead_teacher_id: e.target.value })}
                className={field}>
                <option value="">Select a teacher…</option>
                {(ref?.teachers || []).map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
              </select>
              <p className="text-[10px] text-[#8AA4A7] mt-1">They can always arrange this assembly, whatever their other permissions.</p>
            </div>
            <div>
              <label className="block text-[10px] text-[#5A7A7E] mb-1">Target length (minutes)</label>
              <input type="number" min={5} max={120} value={form.target_minutes}
                onChange={(e) => setForm({ ...form, target_minutes: e.target.value })} className={field} />
              <p className="text-[10px] text-[#8AA4A7] mt-1">The supervising teacher sets how long the program runs.</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-[#D0E0E0] shadow-sm p-4">
          <h3 className="text-[10px] font-bold text-[#5A7A7E] uppercase tracking-wider mb-3">Performing unit — who's presenting?</h3>

          <div className="inline-flex rounded-xl overflow-hidden border border-[#D0E0E0] mb-3">
            {[["class", "🏫 A whole class"], ["team", "👥 A cross-class team"]].map(([k, label]) => (
              <button key={k} onClick={() => setForm({ ...form, performing_unit_type: k })}
                className="px-4 py-2 text-xs font-semibold"
                style={{
                  background: form.performing_unit_type === k ? TEAL : "#fff",
                  color: form.performing_unit_type === k ? "#fff" : "#0A3A3E",
                }}>
                {label}
              </button>
            ))}
          </div>

          {form.performing_unit_type === "class" ? (
            <div>
              <label className="block text-[10px] text-[#5A7A7E] mb-1">Class</label>
              <select value={form.school_class_id} onChange={(e) => setForm({ ...form, school_class_id: e.target.value })}
                className={field}>
                <option value="">
                  {classes.length === 0 ? "No class available to you" : "Select a class…"}
                </option>
                {classes.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
              {/* Class first, then the students of that class — that is the
                  whole order of the flow, so say which list you are looking at. */}
              <p className="text-[10px] text-[#8AA4A7] mt-1">
                {scope?.scoped
                  ? `${scope.label}. Roles are then assigned to students of this class on the agenda screen.`
                  : "Pick the class first — the agenda screen then offers only that class's students."}
              </p>
              {form.school_class_id && (
                <p className="text-[10px] mt-1" style={{ color: TEAL }}>
                  {classStudents.length} student{classStudents.length === 1 ? "" : "s"} in this class are available for roles.
                </p>
              )}
            </div>
          ) : (
            <div className="space-y-3">
              <div>
                <label className="block text-[10px] text-[#5A7A7E] mb-1">Team name</label>
                <input value={form.team_name} onChange={(e) => setForm({ ...form, team_name: e.target.value })}
                  placeholder="e.g. Grades 5 & 6 Honesty Team" className={field} />
              </div>
              <div>
                <label className="block text-[10px] text-[#5A7A7E] mb-1">Add students from any class</label>
                <input value={teamSearch} onChange={(e) => setTeamSearch(e.target.value)}
                  placeholder="Search students…" className={field} />
                <div className="flex flex-wrap gap-1.5 mt-2 max-h-48 overflow-y-auto">
                  {teamCandidates.map((s) => {
                    const on = team.includes(s.id);
                    return (
                      <span key={s.id} onClick={() => toggleMember(s.id)}
                        className="px-3 py-1.5 rounded-full text-[11px] cursor-pointer border"
                        style={{
                          background: on ? TEAL : "#fff",
                          color: on ? "#fff" : "#0A3A3E",
                          borderColor: on ? TEAL : "#D0E0E0",
                        }}>
                        {s.name}{s.class ? ` (${s.class})` : ""} {on ? "✓" : "+"}
                      </span>
                    );
                  })}
                </div>
                {team.length > 0 && (
                  <p className="text-[10px] text-[#5A7A7E] mt-2">{team.length} student{team.length === 1 ? "" : "s"} on the team</p>
                )}
              </div>
            </div>
          )}
        </div>

        {/* The roster. Once the class is settled, handing out parts is the next
            thing that happens, so it belongs on this screen rather than behind
            a second navigation. */}
        {rosterPool.length > 0 && (
          <div className="bg-white rounded-2xl border border-[#D0E0E0] shadow-sm p-4">
            <div className="flex items-center justify-between gap-3 flex-wrap mb-3">
              <h3 className="text-[10px] font-bold text-[#5A7A7E] uppercase tracking-wider">
                Who does what — {form.performing_unit_type === "team" ? (form.team_name || "the team") : "class roster"}
              </h3>
              <span className="text-[11px] font-bold" style={{ color: assignedCount ? TEAL : "#8AA4A7" }}>
                {assignedCount} of {rosterPool.length} given a role
              </span>
            </div>

            {rosterPool.length > 8 && (
              <input value={rosterSearch} onChange={(e) => setRosterSearch(e.target.value)}
                placeholder="Find a student…" className={`${field} mb-2`} />
            )}

            <div className="divide-y divide-[#D0E0E0] max-h-96 overflow-y-auto -mx-1 px-1">
              {roster.map((s) => {
                const on = Boolean(roleFor(s.id).trim());
                return (
                  <div key={s.id} className="py-2 flex items-center gap-3 flex-wrap sm:flex-nowrap">
                    <span className="w-7 h-7 rounded-full flex items-center justify-center text-[11px] font-bold shrink-0 text-white"
                      style={{ background: on ? TEAL : "#B9CDCE" }}>
                      {on ? "✓" : (s.name || "?").trim().charAt(0).toUpperCase()}
                    </span>
                    <span className="min-w-0 flex-1">
                      <bdi dir="auto" className="block text-sm font-semibold text-[#0A3A3E] truncate">{s.name}</bdi>
                      <span className="block text-[10px] text-[#8AA4A7]">{[s.class, s.code].filter(Boolean).join(" · ")}</span>
                    </span>
                    <input list="assembly-plan-roles" value={roleFor(s.id)}
                      onChange={(e) => setRoleFor(s.id, e.target.value)}
                      placeholder="Role — e.g. Quran Reciter"
                      className="w-full sm:w-56 px-3 py-1.5 border border-[#D0E0E0] rounded-xl text-xs focus:ring-2 focus:ring-[#9CCBCB] focus:outline-none" />
                  </div>
                );
              })}
              {roster.length === 0 && (
                <p className="text-[11px] text-[#8AA4A7] py-4 text-center">No student matches “{rosterSearch}”.</p>
              )}
            </div>

            <datalist id="assembly-plan-roles">
              {(ref?.role_template || []).map((r) => <option key={r} value={r} />)}
            </datalist>

            <p className="text-[10px] text-[#8AA4A7] mt-3">
              Naming a role adds that student to the agenda and notifies them on save. Clearing one here does not
              remove their block — do that on the agenda screen, where its notes and minutes are visible.
            </p>
          </div>
        )}

        <div className="bg-[#E8F6F6] rounded-xl px-4 py-3 text-xs flex gap-2" style={{ color: TEAL }}>
          <span>📎</span>
          <span>
            Role templates and past materials come from the <b>Assembly Program Kit</b> (Drive module) on the
            agenda screen — you're not starting from a blank page.
          </span>
        </div>

        <div className="flex gap-2">
          <button onClick={() => save(true)} disabled={saving}
            className="px-5 py-2 text-xs font-semibold text-white rounded-xl disabled:opacity-50" style={{ background: TEAL }}>
            {saving ? "Saving…" : "Save & build agenda"}
          </button>
          <button onClick={() => save(false)} disabled={saving}
            className="px-4 py-2 text-xs font-semibold text-[#5A7A7E] border border-[#D0E0E0] rounded-xl hover:bg-[#F4F8F8] bg-white">
            Save & close
          </button>
          <button onClick={() => navigate("/assembly/calendar")}
            className="px-4 py-2 text-xs font-semibold text-[#5A7A7E]">
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
