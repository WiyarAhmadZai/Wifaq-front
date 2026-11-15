import { useState, useEffect, useRef } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import Swal from "sweetalert2";
import { get, post } from "../../api/axios";
import Select2 from "../../components/hr/Select2";
import { listDepartments } from "../../api/departments";
import RichTextField from "../../components/RichTextField";

const TEAL = "#0D5C63";
const GOLD = "#C9A227";
const BORDER = "#D0E0E0";
const MUTED = "#5A7A7E";

const field = "w-full px-3 py-2 border rounded-xl text-sm bg-white focus:ring-2 focus:ring-[#9CCBCB] focus:outline-none";

const TYPES = [
  { key: "meeting", icon: "🗓", label: "Meeting", hint: "A time-boxed discussion with an agenda" },
  { key: "event",   icon: "🎉", label: "Event",   hint: "A day (or several) with people and preparation" },
];

/**
 * Only "before" is offered here.
 *
 * Photos from the day and minutes afterwards cannot exist yet when the thing
 * is being scheduled — offering empty During/After boxes on a create form asks
 * for something nobody has. Those are added from the detail page once there is
 * something to add.
 */
const PHASES = [
  { key: "before", label: "Files to prepare", hint: "Agenda, invitation, venue plan" },
];

const prettySize = (b) =>
  b >= 1048576 ? `${(b / 1048576).toFixed(1)} MB` : `${Math.max(1, Math.round(b / 1024))} KB`;

/**
 * One form for a meeting OR an event.
 *
 * They were two buttons and two forms, which forced the organiser to decide
 * what to call the thing before they could describe it — and the fields are
 * almost the same either way. Here the type is a toggle at the top and only the
 * handful of genuinely different fields swap.
 *
 * Files are staged locally and uploaded AFTER the parent is created, because an
 * attachment needs something to hang from. That order also means a failed
 * upload leaves a saved meeting rather than losing everything the user typed.
 */
export default function MeetingEventForm() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const [kind, setKind] = useState(searchParams.get("type") === "event" ? "event" : "meeting");
  const [saving, setSaving] = useState(false);
  const [progress, setProgress] = useState("");
  const [form, setForm] = useState({
    title: "", description: "", location: "",
    date: "", start_time: "09:00", end_time: "10:00",
    end_date: "", meeting_type: "routine",
    // Repeat rule. Empty = a one-off. Same vocabulary both modules use.
    recurrence: "", recurrence_until: "",
    // Which committee this meeting belongs to, if any. Meetings only — an
    // event is not a committee's minutes. Pre-filled when the committee page
    // sent us here, so nobody has to remember to tag it.
    committee_id: searchParams.get("committee") || "",
  });
  // { before: File[], during: File[], after: File[] }
  const [committees, setCommittees] = useState([]);
  const [staged, setStaged] = useState({ before: [] });
  const inputs = { before: useRef(null) };
  // Guest list: a name, and optionally what that person is taking on.
  const [guests, setGuests] = useState([]);
  const [guestName, setGuestName] = useState("");
  const guestRef = useRef(null);

  // People who ARE in the system — staff with a login — picked one by one or
  // a whole department at a time. Guests above are the people who are not.
  // Stored as user ids (participants FK users, not staff), so staff with no
  // linked account cannot be picked and are left out of the list.
  const [users, setUsers] = useState([]);
  const [usersLoading, setUsersLoading] = useState(true);
  const [departments, setDepartments] = useState([]);
  const [filterDeptIds, setFilterDeptIds] = useState([]);
  const [participants, setParticipants] = useState([]);   // [{ id: user_id, name }]
  const [emailToo, setEmailToo] = useState(true);

  useEffect(() => {
    // Active committees only: a meeting is never filed under one that
    // has been wound up.
    get("/committees?active_only=1")
      .then((r) => setCommittees(r.data?.data || []))
      .catch(() => setCommittees([]));

    // Same roster the meeting page uses, so the two never disagree about
    // who can be invited. Failures leave the pickers empty rather than
    // breaking the form — the person can still be added on the detail page.
    get("/hr/staff/list?per_page=1000&status=active")
      .then((res) => {
        const raw = res.data?.data?.data ?? res.data?.data ?? res.data ?? [];
        const data = Array.isArray(raw) ? raw : [];
        setUsers(data.filter((s) => s.user_id).map((s) => ({
          id: s.user_id,
          name: s.application?.full_name || s.full_name || `Staff #${s.employee_id || s.id}`,
          employee_id: s.employee_id || "",
          department: s.department || s.department_relation?.name || "",
          department_id: s.department_id || null,
        })));
      })
      .catch(() => setUsers([]))
      .finally(() => setUsersLoading(false));
    listDepartments({ active_only: 1 })
      .then((r) => { const d = r.data?.data?.data ?? r.data?.data ?? r.data ?? []; setDepartments(Array.isArray(d) ? d : []); })
      .catch(() => setDepartments([]));
  }, []);

  // Everyone in the picked departments, skipping anyone already listed.
  const addParticipantsFromDepartments = () => {
    const want = users.filter((u) => filterDeptIds.includes(u.department_id));
    if (!want.length) return;
    setParticipants((prev) => {
      const have = new Set(prev.map((p) => p.id));
      return [...prev, ...want.filter((u) => !have.has(u.id)).map((u) => ({ id: u.id, name: u.name }))];
    });
  };

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const addFiles = (phase, list) => {
    const picked = Array.from(list || []);
    if (!picked.length) return;
    const tooBig = picked.filter((f) => f.size > 25 * 1048576);
    if (tooBig.length) {
      return Swal.fire("File too large",
        `${tooBig.map((f) => f.name).join(", ")} — the limit is 25 MB per file.`, "info");
    }
    setStaged((s) => ({ ...s, [phase]: [...s[phase], ...picked].slice(0, 10) }));
    if (inputs[phase].current) inputs[phase].current.value = "";
  };

  const dropFile = (phase, i) =>
    setStaged((s) => ({ ...s, [phase]: s[phase].filter((_, j) => j !== i) }));

  const totalStaged = PHASES.reduce((n, p) => n + staged[p.key].length, 0);

  const addGuest = () => {
    const name = guestName.trim();
    if (!name) return;
    setGuests((g) => [...g, { name, task: "" }]);
    setGuestName("");
    // Keep focus so a whole list is typed without reaching for the mouse.
    setTimeout(() => guestRef.current?.focus(), 40);
  };
  const setGuestTask = (i, task) =>
    setGuests((g) => g.map((x, j) => (j === i ? { ...x, task } : x)));
  const dropGuest = (i) => setGuests((g) => g.filter((_, j) => j !== i));

  const save = async () => {
    if (!form.title.trim()) return Swal.fire("Title needed", "What is this called?", "info");
    if (!form.date) return Swal.fire("Date needed", "Which day is it on?", "info");
    if (form.recurrence && !form.recurrence_until) {
      return Swal.fire("Repeat until when?", "A repeating schedule needs a last date, or it would never stop.", "info");
    }

    setSaving(true);
    try {
      // ── 1. the parent record ──────────────────────────────────────────
      setProgress("Saving…");
      let id;
      if (kind === "meeting") {
        const res = await post("/meetings", {
          title: form.title.trim(),
          description: form.description.trim() || null,
          start_time: `${form.date} ${form.start_time}:00`,
          end_time: `${form.date} ${form.end_time}:00`,
          location: form.location.trim() || null,
          meeting_type: form.meeting_type,
          committee_id: form.committee_id || null,
          status: "scheduled",
          participants: participants.map((p) => p.id),
          notify_by_email: emailToo,
          recurrence: form.recurrence || null,
          recurrence_until: form.recurrence ? form.recurrence_until || null : null,
        });
        id = res.data?.data?.id ?? res.data?.id;
      } else {
        const res = await post("/events", {
          title: form.title.trim(),
          description: form.description.trim() || null,
          start_date: form.date,
          end_date: form.end_date || null,
          recurrence: form.recurrence || null,
          recurrence_until: form.recurrence ? form.recurrence_until || null : null,
          location: form.location.trim() || null,
          status: "upcoming",
          // An event has roles rather than a flat participant list; everyone
          // picked here joins as a participant and can be given a specific
          // role on the event page afterwards.
          roles: participants.map((p) => ({ user_id: p.id, role_name: "Participant" })),
          notify_by_email: emailToo,
        });
        id = res.data?.data?.id ?? res.data?.id;
      }

      if (!id) throw new Error("The server did not return an id for the new record.");

      const parentType = kind === "meeting" ? "meetings" : "events";

      // ── 2. the guest list, as a checklist on the new record ───────────
      if (guests.length) {
        setProgress("Adding guests…");
        try {
          await post(`/${parentType}/${id}/checklists`, {
            title: "Guests",
            track_response: true,
            items: guests.map((g) => ({ label: g.name, task: g.task.trim() || null })),
          });
        } catch {
          await Swal.fire("Guests not added",
            `The ${kind} was saved but the guest list could not be created. You can add it from the ${kind} page.`,
            "warning");
        }
      }

      // ── 3. the files ─────────────────────────────────────────────────
      for (const ph of PHASES) {
        const list = staged[ph.key];
        if (!list.length) continue;
        setProgress(`Uploading ${ph.label.toLowerCase()} files…`);
        const fd = new FormData();
        list.forEach((f) => fd.append("files[]", f));
        fd.append("phase", ph.key);
        try {
          await post(`/${parentType}/${id}/attachments`, fd, {
            headers: { "Content-Type": "multipart/form-data" }, timeout: 120000,
          });
        } catch {
          // The record is already saved — say which files did not make it and
          // send the user on, rather than pretending nothing was created.
          await Swal.fire("Some files did not upload",
            `“${ph.label}” files could not be attached. You can add them from the ${kind} page.`, "warning");
        }
      }

      Swal.fire({
        icon: "success",
        title: kind === "meeting" ? "Meeting scheduled" : "Event created",
        timer: 1300, showConfirmButton: false,
      });
      navigate(`/hr/${parentType}/show/${id}`);
    } catch (err) {
      const conflicts = err.response?.data?.conflicts;
      if (Array.isArray(conflicts) && conflicts.length) {
        // The server refused because someone is already booked. Name them and
        // what they are on — "conflict" alone leaves the organiser guessing.
        const slot = err.response.data.slot;
        const rows = conflicts.map((c) =>
          `<li><b>${c.user}</b> — ${c.kind} “${c.title}” (${c.starts})</li>`).join("");
        return Swal.fire({
          icon: "warning",
          title: "Time conflict — not saved",
          html: `${slot ? `<p style="margin-bottom:8px">Clashes on <b>${slot.starts}</b>:</p>` : ""}`
              + `<ul style="text-align:left;font-size:13px;line-height:1.7">${rows}</ul>`
              + `<p style="margin-top:10px;font-size:12px;color:#5A7A7E">Pick another time, or remove that person.</p>`,
          confirmButtonColor: TEAL,
        });
      }
      Swal.fire("Error",
        err.response?.data?.message
        || Object.values(err.response?.data?.errors || {})[0]?.[0]
        || err.message || "Could not save.", "error");
    } finally { setSaving(false); setProgress(""); }
  };

  const isMeeting = kind === "meeting";

  return (
    <div className="min-h-screen bg-[#F4F8F8]">
      <div className="px-5 py-4" style={{ background: `linear-gradient(135deg, ${TEAL}, #063033)` }}>
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <p className="text-[10px] uppercase tracking-[0.2em]" style={{ color: GOLD }}>Planner</p>
            <h1 className="text-base font-black text-white mt-0.5">New {isMeeting ? "Meeting" : "Event"}</h1>
          </div>
          <button onClick={save} disabled={saving}
            className="px-4 py-1.5 bg-white/15 hover:bg-white/25 text-white rounded-xl text-xs font-bold disabled:opacity-50">
            {saving ? (progress || "Saving…") : "Save"}
          </button>
        </div>
      </div>

      <div className="px-4 py-5 space-y-4 max-w-3xl mx-auto">
        {/* ── Which kind ── */}
        <div className="bg-white rounded-2xl border shadow-sm p-4" style={{ borderColor: BORDER }}>
          <label className="block text-[11px] font-semibold mb-2" style={{ color: "#0A3A3E" }}>
            What are you scheduling?
          </label>
          <div className="grid sm:grid-cols-2 gap-2">
            {TYPES.map((t) => {
              const on = kind === t.key;
              return (
                <button key={t.key} type="button" onClick={() => setKind(t.key)}
                  className="text-left px-3 py-2.5 rounded-xl border transition-colors"
                  style={on
                    ? { background: "#E8F6F6", borderColor: TEAL }
                    : { background: "#fff", borderColor: BORDER }}>
                  <span className="text-sm font-bold" style={{ color: on ? TEAL : "#0A3A3E" }}>
                    {t.icon} {t.label}
                  </span>
                  <span className="block text-[10px] mt-0.5" style={{ color: MUTED }}>{t.hint}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* ── The basics ── */}
        <div className="bg-white rounded-2xl border shadow-sm p-4 space-y-3" style={{ borderColor: BORDER }}>
          <div>
            <label className="block text-[11px] font-semibold mb-1" style={{ color: "#0A3A3E" }}>
              Title <span style={{ color: GOLD }}>*</span>
            </label>
            <input value={form.title} onChange={(e) => set("title", e.target.value)}
              placeholder={isMeeting ? "e.g. Weekly academic review" : "e.g. Graduation ceremony"}
              className={field} style={{ borderColor: BORDER }} dir="auto" />
          </div>

          <div>
            <label className="block text-[11px] font-semibold mb-1" style={{ color: "#0A3A3E" }}>Description</label>
            <RichTextField value={form.description} onChange={(html) => set("description", html)} rows={3}
              placeholder="What is it for? Anything people should know beforehand." />
          </div>

          <div className="grid sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] font-semibold mb-1" style={{ color: "#0A3A3E" }}>
                {isMeeting ? "Date" : "Start date"} <span style={{ color: GOLD }}>*</span>
              </label>
              <input type="date" value={form.date} onChange={(e) => set("date", e.target.value)}
                className={field} style={{ borderColor: BORDER }} />
            </div>
            <div>
              <label className="block text-[11px] font-semibold mb-1" style={{ color: "#0A3A3E" }}>Location</label>
              <input value={form.location} onChange={(e) => set("location", e.target.value)}
                placeholder="Room, hall, or address" className={field} style={{ borderColor: BORDER }} dir="auto" />
            </div>
          </div>

          {/* The only genuinely different fields between the two. */}
          {isMeeting ? (
            <div className="grid sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-[11px] font-semibold mb-1" style={{ color: "#0A3A3E" }}>Starts</label>
                <input type="time" value={form.start_time} onChange={(e) => set("start_time", e.target.value)}
                  className={field} style={{ borderColor: BORDER }} />
              </div>
              <div>
                <label className="block text-[11px] font-semibold mb-1" style={{ color: "#0A3A3E" }}>Ends</label>
                <input type="time" value={form.end_time} onChange={(e) => set("end_time", e.target.value)}
                  className={field} style={{ borderColor: BORDER }} />
              </div>
              <div>
                <label className="block text-[11px] font-semibold mb-1" style={{ color: "#0A3A3E" }}>Kind</label>
                <select value={form.meeting_type} onChange={(e) => set("meeting_type", e.target.value)}
                  className={field} style={{ borderColor: BORDER }}>
                  <option value="routine">Routine</option>
                  <option value="emergency">Emergency</option>
                </select>
              </div>
              {/* Tagging the meeting here is the whole of "committee minutes":
                  the agenda, attendance and decisions stay on the meeting, and
                  the committee page simply reads back the ones tagged with it.
                  There is no second record to keep in step. */}
              <div className="sm:col-span-3">
                <label className="block text-[11px] font-semibold mb-1" style={{ color: "#0A3A3E" }}>Committee</label>
                <select value={form.committee_id} onChange={(e) => set("committee_id", e.target.value)}
                  className={field} style={{ borderColor: BORDER }}>
                  <option value="">Not a committee meeting</option>
                  {committees.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
                <p className="text-[10px] text-gray-400 mt-1">
                  Choose one and this meeting appears on that committee's page as its minutes.
                </p>
              </div>
            </div>
          ) : (
            <div>
              <label className="block text-[11px] font-semibold mb-1" style={{ color: "#0A3A3E" }}>
                End date <span className="font-normal text-gray-400">(optional — leave blank for one day)</span>
              </label>
              <input type="date" value={form.end_date} min={form.date}
                onChange={(e) => set("end_date", e.target.value)}
                className={field} style={{ borderColor: BORDER }} />
            </div>
          )}

          {/* Repeat — a weekly team meeting or a monthly parents' day is
              scheduled once here and fans out into its occurrences. Every
              occurrence is checked for clashes before any is saved. */}
          <div className="grid sm:grid-cols-2 gap-3 pt-1">
            <div>
              <label className="block text-[11px] font-semibold mb-1" style={{ color: "#0A3A3E" }}>
                Repeat <span className="font-normal text-gray-400">(optional)</span>
              </label>
              <select value={form.recurrence} onChange={(e) => set("recurrence", e.target.value)}
                className={field} style={{ borderColor: BORDER }}>
                <option value="">Does not repeat</option>
                <option value="daily">Every day</option>
                <option value="weekly">Every week</option>
                <option value="monthly">Every month</option>
                <option value="yearly">Every year</option>
              </select>
            </div>
            {form.recurrence && (
              <div>
                <label className="block text-[11px] font-semibold mb-1" style={{ color: "#0A3A3E" }}>
                  Repeat until <span style={{ color: GOLD }}>*</span>
                </label>
                <input type="date" value={form.recurrence_until} min={form.date}
                  onChange={(e) => set("recurrence_until", e.target.value)}
                  className={field} style={{ borderColor: BORDER }} />
                <p className="text-[10px] mt-1" style={{ color: "#8AA4A7" }}>
                  One entry per {form.recurrence === "daily" ? "day" : form.recurrence === "weekly" ? "week" : form.recurrence === "monthly" ? "month" : "year"} up to this date, each with the same people.
                </p>
              </div>
            )}
          </div>

          <p className="text-[10px]" style={{ color: "#8AA4A7" }}>
            Agenda, roles and checklists are added on the {isMeeting ? "meeting" : "event"} page
            once it is saved.
          </p>
        </div>

        {/* ── People from the system: a department at a time, or one by one ── */}
        <div className="bg-white rounded-2xl border shadow-sm p-4" style={{ borderColor: BORDER }}>
          <h3 className="text-sm font-bold" style={{ color: "#0A3A3E" }}>
            Participants {participants.length > 0 && <span style={{ color: MUTED }}>· {participants.length}</span>}
          </h3>
          <p className="text-[11px] mb-3" style={{ color: MUTED }}>
            Staff registered in the system. Add a whole department, or search and pick people one by one — they are
            notified when the {isMeeting ? "meeting" : "event"} is saved.
          </p>

          <div className="rounded-xl p-3 mb-3" style={{ background: "#F3FAFA", border: `1px solid ${BORDER}` }}>
            <p className="text-[10px] font-bold uppercase tracking-wider mb-2" style={{ color: TEAL }}>Add a department</p>
            <div className="flex flex-col sm:flex-row sm:items-center gap-2">
              <div className="flex-1 min-w-0">
                <Select2 isMulti size="sm" value={filterDeptIds}
                  onChange={(v) => setFilterDeptIds(Array.isArray(v) ? v : [])}
                  options={departments.map((d) => ({ value: d.id, label: d.name }))}
                  placeholder={departments.length ? "Pick one or more departments…" : "No departments yet — add some in HR → Departments"} />
              </div>
              <button type="button" onClick={addParticipantsFromDepartments} disabled={!filterDeptIds.length}
                className="px-3 py-2 text-white rounded-lg text-xs font-semibold disabled:opacity-40 disabled:cursor-not-allowed whitespace-nowrap"
                style={{ background: TEAL }}>
                Add all
              </button>
              {participants.length > 0 && (
                <button type="button" onClick={() => setParticipants([])}
                  className="px-3 py-2 bg-white border rounded-lg text-xs font-medium hover:text-red-600" style={{ borderColor: BORDER, color: MUTED }}>
                  Clear all
                </button>
              )}
            </div>
            {filterDeptIds.length > 0 && (
              <p className="text-[10px] mt-1.5" style={{ color: TEAL }}>
                {users.filter((u) => filterDeptIds.includes(u.department_id)).length} staff match the selected department{filterDeptIds.length === 1 ? "" : "s"}
              </p>
            )}
          </div>

          <p className="text-[10px] font-bold uppercase tracking-wider mb-1.5" style={{ color: MUTED }}>Specific people</p>
          <Select2 isMulti value={participants.map((p) => p.id)}
            onChange={(ids) => {
              const arr = Array.isArray(ids) ? ids : [];
              setParticipants(arr.map((id) => {
                const u = users.find((x) => String(x.id) === String(id));
                return { id, name: u?.name || `Staff #${id}` };
              }));
            }}
            options={users.map((u) => ({
              value: u.id,
              label: `${u.name}${u.employee_id ? ` · ${u.employee_id}` : ""}${u.department ? ` · ${u.department}` : ""}`,
            }))}
            placeholder={usersLoading ? "Loading staff…" : users.length ? "Search and pick individual staff…" : "No staff with a login account found"} />

          <label className="mt-3 inline-flex items-center gap-2 text-[11px] cursor-pointer select-none" style={{ color: MUTED }}>
            <input type="checkbox" checked={emailToo} onChange={(e) => setEmailToo(e.target.checked)}
              className="w-3.5 h-3.5 accent-teal-600" />
            <span>Also email the participants</span>
          </label>
        </div>

        {/* ── Guests, and what each of them is taking on ── */}
        <div className="bg-white rounded-2xl border shadow-sm p-4" style={{ borderColor: BORDER }}>
          <h3 className="text-sm font-bold" style={{ color: "#0A3A3E" }}>
            Guests {guests.length > 0 && <span style={{ color: MUTED }}>· {guests.length}</span>}
          </h3>
          <p className="text-[11px] mb-3" style={{ color: MUTED }}>
            Optional. Add who is invited and, if you already know, what each one is responsible for.
            Attendance and how it went are recorded on the {isMeeting ? "meeting" : "event"} page afterwards.
          </p>

          {guests.length > 0 && (
            <div className="rounded-xl overflow-hidden mb-2" style={{ border: `1px solid ${BORDER}` }}>
              {guests.map((g, i) => (
                <div key={i} className="flex items-center gap-2 px-3 py-2"
                  style={{ borderTop: i ? `1px solid ${BORDER}` : "none", background: i % 2 ? "#FAFCFC" : "#fff" }}>
                  <span className="w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-black text-white flex-shrink-0"
                    style={{ background: TEAL }}>{i + 1}</span>
                  <bdi dir="auto" className="text-sm font-semibold truncate" style={{ color: "#0A3A3E", minWidth: "6rem" }}>
                    {g.name}
                  </bdi>
                  <input value={g.task} onChange={(e) => setGuestTask(i, e.target.value)}
                    placeholder="Task for them (optional) — e.g. bring the projector"
                    className="flex-1 min-w-[8rem] text-xs bg-transparent focus:outline-none border-b"
                    style={{ borderColor: "#E6EEEE", color: MUTED }} dir="auto" />
                  <button onClick={() => dropGuest(i)}
                    className="text-gray-300 hover:text-red-500 text-xs px-1 flex-shrink-0">✕</button>
                </div>
              ))}
            </div>
          )}

          <div className="flex gap-2">
            <input ref={guestRef} value={guestName} onChange={(e) => setGuestName(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addGuest(); } }}
              placeholder="Add a guest and press Enter…"
              className={field} style={{ borderColor: BORDER }} dir="auto" />
            <button type="button" onClick={addGuest} disabled={!guestName.trim()}
              className="px-4 py-2 rounded-xl text-xs font-bold text-white disabled:opacity-40 flex-shrink-0"
              style={{ background: TEAL }}>Add</button>
          </div>
        </div>

        {/* ── Files ── */}
        <div className="bg-white rounded-2xl border shadow-sm p-4" style={{ borderColor: BORDER }}>
          <h3 className="text-sm font-bold" style={{ color: "#0A3A3E" }}>
            Attachments {totalStaged > 0 && <span style={{ color: MUTED }}>· {totalStaged}</span>}
          </h3>
          <p className="text-[11px] mb-3" style={{ color: MUTED }}>
            Optional. Photos from the day and minutes afterwards are added from
            the {isMeeting ? "meeting" : "event"} page once there is something to add.
          </p>

          <div className="space-y-3">
            {PHASES.map((ph) => (
              <div key={ph.key}>
                <div className="flex items-baseline justify-between gap-2 mb-1">
                  <span className="text-[11px] font-bold uppercase tracking-wider" style={{ color: "#0A3A3E" }}>
                    {ph.label}
                    {staged[ph.key].length > 0 && <span style={{ color: MUTED }}> · {staged[ph.key].length}</span>}
                  </span>
                  <span className="text-[10px]" style={{ color: "#8AA4A7" }}>{ph.hint}</span>
                </div>

                {staged[ph.key].length > 0 && (
                  <div className="rounded-xl overflow-hidden mb-1.5" style={{ border: `1px solid ${BORDER}` }}>
                    {staged[ph.key].map((f, i) => (
                      <div key={`${f.name}-${i}`} className="flex items-center gap-2 px-3 py-1.5"
                        style={{ borderTop: i ? `1px solid ${BORDER}` : "none", background: i % 2 ? "#FAFCFC" : "#fff" }}>
                        <span className="text-sm">{f.type.startsWith("image/") ? "🖼" : "📎"}</span>
                        <bdi dir="auto" className="min-w-0 flex-1 text-xs truncate" style={{ color: "#0A3A3E" }}>{f.name}</bdi>
                        <span className="text-[10px]" style={{ color: "#8AA4A7" }}>{prettySize(f.size)}</span>
                        <button onClick={() => dropFile(ph.key, i)}
                          className="text-gray-300 hover:text-red-500 text-xs px-1">✕</button>
                      </div>
                    ))}
                  </div>
                )}

                <input ref={inputs[ph.key]} type="file" multiple hidden
                  accept=".jpg,.jpeg,.png,.gif,.webp,.heic,.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.csv,.zip"
                  onChange={(e) => addFiles(ph.key, e.target.files)} />
                <div
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={(e) => { e.preventDefault(); addFiles(ph.key, e.dataTransfer.files); }}
                  onClick={() => inputs[ph.key].current?.click()}
                  className="rounded-xl border-2 border-dashed px-3 py-2.5 text-center cursor-pointer hover:bg-[#F4F8F8] transition-colors"
                  style={{ borderColor: BORDER }}>
                  <span className="text-[11px] font-semibold" style={{ color: MUTED }}>
                    + Add {ph.label.toLowerCase()} files
                  </span>
                  <span className="block text-[9px]" style={{ color: "#B6C4C4" }}>
                    optional · drop here or click · 25 MB each
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="flex gap-2 pb-4">
          <button onClick={save} disabled={saving}
            className="px-5 py-2 text-xs font-semibold text-white rounded-xl disabled:opacity-50"
            style={{ background: TEAL }}>
            {saving ? (progress || "Saving…") : `Save ${isMeeting ? "meeting" : "event"}`}
          </button>
          <button onClick={() => navigate("/hr/meetings-events")}
            className="px-4 py-2 text-xs font-semibold rounded-xl bg-white border"
            style={{ color: MUTED, borderColor: BORDER }}>
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
