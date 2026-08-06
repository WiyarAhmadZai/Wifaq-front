import { useCallback, useEffect, useMemo, useState } from "react";
import Swal from "sweetalert2";
import {
  getAttendanceClasses,
  getAttendanceSheet,
  saveAttendanceSheet,
  getAttendanceRoster,
  emailParents,
  whatsappParents,
} from "../../api/studentAttendance";
import { useAuth } from "../../admin/context/AuthContext";
import AttendanceStatement from "../../components/students/AttendanceStatement";
import BroadcastComposer from "../../components/students/BroadcastComposer";

/**
 * Student register — mark a class present / absent / half day for one date.
 *
 * Students have no leave-request workflow, so the vocabulary is only three
 * words. A half day is defined by its comment: the note says why the student
 * went home, and the reports count that record as half a day.
 *
 * Marking absent or half day notifies the parent automatically. Email and
 * WhatsApp are separate, deliberate actions on the Away tab.
 */

const STATUS = {
  present:  { label: "Present",  short: "P", cls: "bg-emerald-600 text-white",  ring: "ring-emerald-200", soft: "bg-emerald-50 text-emerald-700 border-emerald-200" },
  absent:   { label: "Absent",   short: "A", cls: "bg-red-600 text-white",      ring: "ring-red-200",     soft: "bg-red-50 text-red-700 border-red-200" },
  // Present, and recorded as having left early. Counted as attendance — the
  // student was in school — but tracked separately with its reason.
  half_day: { label: "Half day left", short: "H", cls: "bg-amber-500 text-white", ring: "ring-amber-200", soft: "bg-amber-50 text-amber-800 border-amber-200" },
};

// Local calendar date. toISOString() would shift to UTC and, in Kabul
// (+04:30), hand back yesterday for most of the morning.
const isoOf = (d) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

const todayIso = () => isoOf(new Date());

const prettyDate = (iso) =>
  new Date(`${iso}T00:00:00`).toLocaleDateString(undefined, {
    weekday: "long", day: "numeric", month: "long", year: "numeric",
  });

export default function StudentAttendance() {
  const { hasPermission, isSuperAdmin } = useAuth();
  const canMark   = hasPermission("student-attendance.create") || hasPermission("student-attendance.manage") || isSuperAdmin;
  const canNotify = hasPermission("student-attendance.notify") || hasPermission("student-attendance.manage") || isSuperAdmin;
  // Opening one student's monthly sheet is its own grant — that document names
  // a child and carries why they went home, so it is delegated separately.
  const canStatement = hasPermission("student-attendance.statement") || hasPermission("student-attendance.manage") || isSuperAdmin;
  const [statementFor, setStatementFor] = useState(null);

  const [classes, setClasses] = useState([]);
  const [classId, setClassId] = useState("");
  // Attendance is only ever taken for TODAY. The date is shown but never
  // typed: a register is a record of the day it was taken, and letting it be
  // back- or forward-dated is how a month of attendance gets quietly
  // rewritten. The server enforces the same rule.
  //
  // Re-read once a minute rather than fixed at mount, so a register left open
  // in a staff room overnight rolls to the new day instead of dropping the
  // morning's marks onto yesterday. setState only fires on an actual change,
  // so this does not re-render every minute.
  const [date, setDate] = useState(todayIso);

  useEffect(() => {
    const t = setInterval(() => {
      const today = todayIso();
      setDate((current) => (current === today ? current : today));
    }, 60_000);
    return () => clearInterval(t);
  }, []);

  const [tab, setTab] = useState("sheet");          // sheet | away

  const [sheet, setSheet] = useState(null);
  const [marks, setMarks] = useState({});            // studentId → {status, comment}
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  const [roster, setRoster] = useState(null);
  const [selected, setSelected] = useState({});      // attendanceId → bool
  const [sending, setSending] = useState(false);

  // ── Classes the caller may mark ───────────────────────────────────────
  useEffect(() => {
    getAttendanceClasses()
      .then((r) => {
        const list = r.data?.data || [];
        setClasses(list);
        // One class (the common case for a teacher) — pick it, don't make
        // them choose from a list of one.
        if (list.length === 1) setClassId(String(list[0].id));
      })
      .catch(() => setClasses([]));
  }, []);

  // ── Sheet ─────────────────────────────────────────────────────────────
  const loadSheet = useCallback(async () => {
    if (!classId || !date) return;
    setLoading(true);
    try {
      const r = await getAttendanceSheet({ class_id: classId, date });
      const data = r.data?.data || null;
      setSheet(data);
      // Seed the editor from what is already saved. Unmarked students default
      // to PRESENT: on a normal day most children are in, so the teacher only
      // touches the exceptions — and nobody is left silently unaccounted for.
      const seeded = {};
      (data?.rows || []).forEach((row) => {
        seeded[row.student_id] = {
          status: row.status || "present",
          comment: row.comment || "",
          saved: row.status || null,
        };
      });
      setMarks(seeded);
    } catch (e) {
      setSheet(null);
      Swal.fire("Failed", e.response?.data?.message || "Could not load the class sheet.", "error");
    } finally {
      setLoading(false);
    }
  }, [classId, date]);

  useEffect(() => { loadSheet(); }, [loadSheet]);

  const loadRoster = useCallback(async () => {
    if (!date) return;
    try {
      const r = await getAttendanceRoster({ date, ...(classId ? { class_id: classId } : {}) });
      setRoster(r.data?.data || null);
      setSelected({});
    } catch {
      setRoster(null);
    }
  }, [date, classId]);

  useEffect(() => { if (tab === "away") loadRoster(); }, [tab, loadRoster]);

  const setStatus = (studentId, status) =>
    setMarks((p) => ({ ...p, [studentId]: { ...p[studentId], status } }));

  const setComment = (studentId, comment) =>
    setMarks((p) => ({ ...p, [studentId]: { ...p[studentId], comment } }));

  const markAll = (status) =>
    setMarks((p) => {
      const next = { ...p };
      visibleRows.forEach((r) => { next[r.student_id] = { ...next[r.student_id], status }; });
      return next;
    });

  const visibleRows = useMemo(() => {
    const rows = sheet?.rows || [];
    const q = search.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter((r) =>
      String(r.name).toLowerCase().includes(q) || String(r.admission_no || "").toLowerCase().includes(q));
  }, [sheet, search]);

  // Live counts from the editor, not the saved sheet — the teacher needs to
  // see what they are about to commit.
  const live = useMemo(() => {
    const rows = sheet?.rows || [];
    const c = (s) => rows.filter((r) => (marks[r.student_id]?.status || "present") === s).length;
    const present = c("present"), absent = c("absent"), half = c("half_day");
    const total = rows.length;
    return {
      total, present, absent, half,
      // A half day is attendance — the student came in. It is counted with
      // present here and reported on its own below.
      attended: present + half,
      rate: total ? Math.round(((present + half) / total) * 1000) / 10 : 0,
      // Half day without a note cannot be saved — surfaced before the round-trip.
      missingComments: rows.filter(
        (r) => marks[r.student_id]?.status === "half_day" && !String(marks[r.student_id]?.comment || "").trim()
      ).length,
    };
  }, [sheet, marks]);

  const save = async () => {
    if (live.missingComments > 0) {
      Swal.fire("Comment needed",
        `${live.missingComments} student(s) are marked half day without a reason. Write why they left early — that note is what makes it a half day on the report.`,
        "warning");
      return;
    }
    const willNotify = live.absent + live.half;
    const taken = !!sheet?.already_taken;
    const c = await Swal.fire({
      // Once a day is recorded there is no second "take" — there is one row
      // per student per day and this overwrites it.
      title: taken ? "Update attendance?" : "Save attendance?",
      html: `<p style="font-size:13px">
             ${taken ? "This day is already recorded. Saving <b>updates</b> it — no second record is created.<br><br>" : ""}
             ${live.present} present · ${live.absent} absent · ${live.half} left early.<br>
             ${willNotify > 0
               ? `<b>${willNotify} parent(s) will be notified</b> that their child was away.`
               : "No parent notifications — everyone was present."}</p>`,
      icon: "question", showCancelButton: true,
      confirmButtonText: taken ? "Update" : "Save", confirmButtonColor: "#0d9488",
    });
    if (!c.isConfirmed) return;

    setSaving(true);
    try {
      const rows = (sheet?.rows || []).map((r) => ({
        student_id: r.student_id,
        status: marks[r.student_id]?.status || "present",
        comment: marks[r.student_id]?.comment?.trim() || null,
      }));
      const res = await saveAttendanceSheet({ class_id: Number(classId), date, rows });
      Swal.fire("Saved", res.data?.message || "Attendance saved.", "success");
      await loadSheet();
    } catch (e) {
      Swal.fire("Failed", e.response?.data?.message || "Could not save attendance.", "error");
    } finally {
      setSaving(false);
    }
  };

  // ── Broadcast ─────────────────────────────────────────────────────────
  const awayRows = useMemo(
    () => (roster?.rows || []).filter((r) => r.status !== "present"),
    [roster]
  );
  const selectedIds = useMemo(
    () => awayRows.filter((r) => selected[r.attendance_id]).map((r) => r.attendance_id),
    [awayRows, selected]
  );

  // Which compose box is open: 'email' | 'whatsapp' | null. Both channels go
  // through the composer so a message is never sent without the sender seeing
  // exactly what each parent will read.
  const [composer, setComposer] = useState(null);

  const sendEmail = async (note) => {
    if (!selectedIds.length) return;
    setSending(true);
    try {
      const r = await emailParents({ attendance_ids: selectedIds, note });
      setComposer(null);
      Swal.fire("Email", r.data?.message || "Sent.", "success");
      await loadRoster();
    } catch (e) {
      Swal.fire("Failed", e.response?.data?.message || "Could not send emails.", "error");
    } finally { setSending(false); }
  };

  const sendWhatsapp = async (note) => {
    if (!selectedIds.length) return;
    setSending(true);
    try {
      const r = await whatsappParents({ attendance_ids: selectedIds, note });
      const links = r.data?.data?.links || [];
      if (!links.length) {
        Swal.fire("No numbers", "None of the selected students have a parent phone number on file.", "info");
        return;
      }
      // WhatsApp has no server-side send without the Business API, so each
      // link opens a chat with the message already typed. Opening them in one
      // go is what makes this a one-click broadcast.
      const c = await Swal.fire({
        title: `Open ${links.length} WhatsApp chat(s)?`,
        html: `<p style="font-size:13px">Each opens in a new tab with the message ready — press send in WhatsApp.<br>
               <span style="color:#6b7280;font-size:12px">Allow pop-ups for this site or only the first will open.</span></p>`,
        icon: "info", showCancelButton: true, confirmButtonText: "Open all", confirmButtonColor: "#16a34a",
        showDenyButton: true, denyButtonText: "Copy links instead",
      });
      if (c.isConfirmed) {
        setComposer(null);
        links.forEach((l, i) => setTimeout(() => window.open(l.url, "_blank", "noopener"), i * 350));
      } else if (c.isDenied) {
        setComposer(null);
        // The full message, not just the link — so it can be pasted anywhere.
        await navigator.clipboard.writeText(
          links.map((l) => `${l.student} (${l.phone})\n${l.message}\n${l.url}`).join("\n\n")
        );
        Swal.fire("Copied", `${links.length} message(s) copied to the clipboard.`, "success");
      }
    } catch (e) {
      Swal.fire("Failed", e.response?.data?.message || "Could not build WhatsApp links.", "error");
    } finally { setSending(false); }
  };

  const selectedClass = classes.find((c) => String(c.id) === String(classId));

  return (
    <div className="px-4 py-4 max-w-6xl mx-auto">
      <div className="mb-4">
        <h2 className="text-base font-bold text-gray-800">Student Attendance</h2>
        <p className="text-xs text-gray-500">
          Mark a class for a day. A student who left early counts as <strong>present</strong> and is
          recorded as <strong>half day left</strong> with the reason. Absent and half-day marks
          notify the parent automatically.
        </p>
      </div>

      {/* Controls */}
      <div className="bg-white border border-gray-200 rounded-xl p-4 mb-4">
        <div className="flex flex-wrap items-end gap-3">
          <div className="min-w-[220px]">
            <label className="block text-[10px] font-semibold text-gray-500 uppercase mb-1">Class</label>
            <select value={classId} onChange={(e) => setClassId(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:border-teal-500">
              <option value="">Select a class…</option>
              {classes.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.class_name}{c.grade?.name ? ` · ${c.grade.name}` : ""} ({c.students_count} students)
                </option>
              ))}
            </select>
          </div>
          {/* Shown, never typed — today only, locked. */}
          <div>
            <label className="block text-[10px] font-semibold text-gray-500 uppercase mb-1">Date</label>
            <input type="date" value={date} readOnly disabled
              title="Attendance can only be taken for today"
              className="px-3 py-2 text-sm border border-gray-200 rounded-lg bg-gray-100 text-gray-600 cursor-not-allowed" />
            <p className="text-[10px] text-gray-400 mt-1">{prettyDate(date)} · today only</p>
          </div>
          <div className="flex gap-1 ml-auto">
            {["sheet", "away"].map((t) => (
              <button key={t} onClick={() => setTab(t)}
                className={`px-3 py-2 rounded-lg text-xs font-semibold capitalize ${
                  tab === t ? "bg-teal-600 text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200"}`}>
                {t === "sheet" ? "Register" : "Away & parents"}
              </button>
            ))}
          </div>
        </div>

        {classes.length === 0 && (
          <p className="mt-3 text-[11px] text-amber-800 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
            No classes are assigned to you. A teacher can only mark a class they supervise —
            ask the office to set you as the class supervisor.
          </p>
        )}
      </div>

      {tab === "sheet" ? (
        <>
          {!classId ? (
            <div className="text-center py-14 text-xs text-gray-400">Pick a class to open its register.</div>
          ) : loading ? (
            <div className="text-center py-14 text-xs text-gray-400">Loading…</div>
          ) : sheet?.closure ? (
            /* School closed — no register exists for this day. The reason comes
               from the same holiday calendar staff attendance uses, so adding a
               holiday once covers both. */
            <div className="bg-white border border-gray-200 rounded-xl p-8 text-center">
              <p className="text-2xl mb-2">🕌</p>
              <p className="text-sm font-bold text-gray-800">School closed — {sheet.closure.name}</p>
              <p className="text-xs text-gray-500 mt-1">{prettyDate(date)}</p>
              <p className="text-[11px] text-gray-500 mt-3 max-w-md mx-auto">
                Attendance is not taken on a {sheet.closure.type === "weekend" ? "weekly rest day" : "holiday"}.
                All {sheet.rows?.length || 0} student(s) in this class are recorded as off for this
                reason, and it does not count against anyone's attendance.
              </p>
              <p className="text-[10px] text-gray-400 mt-3">
                Holidays and rest days are managed in HR → Holidays, and apply to staff and students alike.
              </p>
            </div>
          ) : (
            <>
              {/* Already recorded: say so up front, so nobody expects a fresh
                  register and wonders why the marks are pre-filled. */}
              {sheet?.already_taken && (
                <div className="mb-3 flex items-start gap-2 rounded-xl border border-blue-200 bg-blue-50 px-4 py-2.5">
                  <span className="text-blue-600 text-sm leading-none mt-0.5">✓</span>
                  <p className="text-[11px] text-blue-900">
                    Attendance for this day is already recorded
                    {sheet.taken_by ? <> by <strong>{sheet.taken_by}</strong></> : null}. You can
                    correct it below — saving <strong>updates</strong> the same record, it is never
                    stored twice.
                  </p>
                </div>
              )}

              {/* Live tally */}
              <div className="grid grid-cols-2 lg:grid-cols-5 gap-2 mb-3">
                <Stat label="Students" value={live.total} tone="text-gray-800" />
                <Stat label="Present"  value={live.attended} tone="text-emerald-700"
                      hint={live.half > 0 ? `incl. ${live.half} half day` : null} />
                <Stat label="Absent"   value={live.absent}  tone="text-red-700" />
                <Stat label="Left early" value={live.half}  tone="text-amber-700" hint="counted present" />
                <Stat label="Attendance" value={`${live.rate}%`} tone="text-teal-700" />
              </div>

              <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
                <div className="flex flex-wrap items-center gap-2 px-3 py-2 border-b border-gray-100 bg-gray-50">
                  <input value={search} onChange={(e) => setSearch(e.target.value)}
                    placeholder="Find a student…"
                    className="flex-1 min-w-[160px] px-2.5 py-1.5 text-xs border border-gray-200 rounded-lg focus:outline-none focus:border-teal-500" />
                  {canMark && (
                    <div className="flex items-center gap-1">
                      <span className="text-[10px] text-gray-500 mr-1">Mark all:</span>
                      {Object.entries(STATUS).map(([k, s]) => (
                        <button key={k} onClick={() => markAll(k)}
                          className={`px-2 py-1 rounded text-[10px] font-semibold border ${s.soft}`}>
                          {s.label}
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full min-w-[720px] text-[11px]">
                    <thead className="bg-gray-50 text-gray-500 uppercase text-[9px]">
                      <tr>
                        <th className="text-left px-3 py-2">Student</th>
                        <th className="text-center px-3 py-2">Attendance</th>
                        <th className="text-left px-3 py-2">Comment <span className="normal-case font-normal">(required for half day)</span></th>
                        <th className="text-center px-3 py-2">Parent</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {visibleRows.length === 0 ? (
                        <tr><td colSpan={4} className="text-center py-10 text-xs text-gray-400 italic">
                          No students in this class.
                        </td></tr>
                      ) : visibleRows.map((r) => {
                        const m = marks[r.student_id] || {};
                        const isHalf = m.status === "half_day";
                        const needsComment = isHalf && !String(m.comment || "").trim();
                        return (
                          <tr key={r.student_id} className="hover:bg-gray-50">
                            <td className="px-3 py-2">
                              <div className="font-medium text-gray-800">{r.name}</div>
                              <div className="text-[10px] text-gray-400 font-mono">{r.admission_no}</div>
                              {canStatement && (
                                <button onClick={() => setStatementFor(r.student_id)}
                                  className="mt-0.5 text-[9px] font-semibold text-teal-600 hover:text-teal-800 underline">
                                  Monthly sheet
                                </button>
                              )}
                            </td>
                            <td className="px-3 py-2">
                              <div className="flex items-center justify-center gap-1">
                                {Object.entries(STATUS).map(([k, s]) => (
                                  <button key={k} disabled={!canMark}
                                    onClick={() => setStatus(r.student_id, k)}
                                    title={s.label}
                                    className={`w-9 h-7 rounded-md text-[10px] font-bold transition disabled:opacity-40 disabled:cursor-not-allowed ${
                                      m.status === k ? `${s.cls} ring-2 ${s.ring}` : "bg-gray-100 text-gray-500 hover:bg-gray-200"}`}>
                                    {s.short}
                                  </button>
                                ))}
                              </div>
                            </td>
                            <td className="px-3 py-2">
                              <input
                                value={m.comment || ""}
                                onChange={(e) => setComment(r.student_id, e.target.value)}
                                disabled={!canMark}
                                placeholder={isHalf ? "Why did they leave early?" : "Optional note"}
                                maxLength={500}
                                className={`w-full px-2 py-1 text-[11px] border rounded focus:outline-none disabled:bg-gray-50 ${
                                  needsComment ? "border-red-300 bg-red-50 focus:border-red-500" : "border-gray-200 focus:border-teal-500"}`} />
                              {needsComment && (
                                <p className="text-[9px] text-red-600 mt-0.5">A half day needs a reason.</p>
                              )}
                            </td>
                            <td className="px-3 py-2 text-center">
                              {/* Which routes exist for this family, so the office
                                  knows before it tries to reach them. */}
                              <div className="flex items-center justify-center gap-1">
                                <Dot on={r.has_parent_account} label="App account" />
                                <Dot on={r.has_parent_email} label="Email" />
                                <Dot on={r.has_parent_phone} label="Phone" />
                              </div>
                              {r.notified_at && (
                                <span className="block text-[9px] text-emerald-600 mt-0.5">notified</span>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>

              {canMark && (sheet?.rows || []).length > 0 && (
                <div className="flex items-center justify-between gap-3 mt-3">
                  <p className="text-[11px] text-gray-500">
                    {live.absent + live.half > 0
                      ? <>Saving will notify <b>{live.absent + live.half}</b> parent(s).</>
                      : "Everyone present — no parent notifications."}
                  </p>
                  <button onClick={save} disabled={saving || live.missingComments > 0}
                    className="px-5 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 text-sm font-semibold disabled:opacity-50 disabled:cursor-not-allowed">
                    {saving ? "Saving…" : sheet?.already_taken ? "Update attendance" : "Save attendance"}
                  </button>
                </div>
              )}
            </>
          )}
        </>
      ) : (
        <AwayTab
          roster={roster} awayRows={awayRows} selected={selected} setSelected={setSelected}
          selectedIds={selectedIds} canNotify={canNotify} sending={sending}
          onEmail={() => setComposer("email")} onWhatsapp={() => setComposer("whatsapp")}
          date={date} className={selectedClass?.class_name}
          canStatement={canStatement} onStatement={setStatementFor}
        />
      )}

      {composer && (
        <BroadcastComposer
          channel={composer}
          attendanceIds={selectedIds}
          sending={sending}
          onClose={() => !sending && setComposer(null)}
          onSend={composer === "email" ? sendEmail : sendWhatsapp}
        />
      )}

      {statementFor && (
        <AttendanceStatement studentId={statementFor} onClose={() => setStatementFor(null)} />
      )}
    </div>
  );
}

/**
 * Who was away, and the one-click ways to tell their parents.
 * The in-app notification has already gone; these are the optional channels.
 */
function AwayTab({ roster, awayRows, selected, setSelected, selectedIds, canNotify, sending, onEmail, onWhatsapp, date, className, canStatement, onStatement }) {
  const allSelected = awayRows.length > 0 && selectedIds.length === awayRows.length;
  const toggleAll = () =>
    setSelected(allSelected ? {} : Object.fromEntries(awayRows.map((r) => [r.attendance_id, true])));

  if (!roster) {
    return <div className="text-center py-14 text-xs text-gray-400">Loading…</div>;
  }

  return (
    <>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 mb-3">
        <Stat label="Marked"   value={roster.summary.total} tone="text-gray-800" />
        <Stat label="Present"  value={roster.summary.attended ?? roster.summary.present} tone="text-emerald-700"
              hint={roster.summary.half_day > 0 ? `incl. ${roster.summary.half_day} half day` : null} />
        <Stat label="Absent"   value={roster.summary.absent} tone="text-red-700" />
        <Stat label="Left early" value={roster.summary.half_day} tone="text-amber-700" hint="counted present" />
      </div>

      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
        <div className="flex flex-wrap items-center justify-between gap-2 px-3 py-2 border-b border-gray-100 bg-gray-50">
          <p className="text-[11px] font-semibold text-gray-700">
            Away on {date}{className ? ` · ${className}` : ""} — {awayRows.length} student(s)
          </p>
          {canNotify && awayRows.length > 0 && (
            <div className="flex items-center gap-1.5">
              <button onClick={toggleAll}
                className="px-2.5 py-1 text-[10px] font-semibold text-gray-600 border border-gray-200 rounded hover:bg-gray-100">
                {allSelected ? "Clear" : "Select all"}
              </button>
              {/* Both open the composer — nothing is sent from this row. */}
              <button onClick={onEmail} disabled={!selectedIds.length || sending}
                title="Write a message and see what each parent receives"
                className="px-2.5 py-1 text-[10px] font-semibold text-white bg-blue-600 rounded hover:bg-blue-700 disabled:opacity-40">
                Email ({selectedIds.length})…
              </button>
              <button onClick={onWhatsapp} disabled={!selectedIds.length || sending}
                title="Write a message and see what each parent receives"
                className="px-2.5 py-1 text-[10px] font-semibold text-white bg-green-600 rounded hover:bg-green-700 disabled:opacity-40">
                WhatsApp ({selectedIds.length})…
              </button>
            </div>
          )}
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[720px] text-[11px]">
            <thead className="bg-gray-50 text-gray-500 uppercase text-[9px]">
              <tr>
                {canNotify && <th className="px-3 py-2 w-8"></th>}
                <th className="text-left px-3 py-2">Student</th>
                <th className="text-left px-3 py-2">Class</th>
                <th className="text-center px-3 py-2">Status</th>
                <th className="text-left px-3 py-2">Comment</th>
                <th className="text-left px-3 py-2">Parent contact</th>
                <th className="text-center px-3 py-2">Told</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {awayRows.length === 0 ? (
                <tr><td colSpan={7} className="text-center py-10 text-xs text-emerald-600 font-medium">
                  Nobody was away — full attendance.
                </td></tr>
              ) : awayRows.map((r) => {
                const s = STATUS[r.status] || STATUS.absent;
                return (
                  <tr key={r.attendance_id} className="hover:bg-gray-50">
                    {canNotify && (
                      <td className="px-3 py-2 text-center">
                        <input type="checkbox" checked={!!selected[r.attendance_id]}
                          onChange={(e) => setSelected((p) => ({ ...p, [r.attendance_id]: e.target.checked }))}
                          className="rounded text-teal-600 focus:ring-teal-500" />
                      </td>
                    )}
                    <td className="px-3 py-2">
                      <div className="font-medium text-gray-800">{r.name}</div>
                      <div className="text-[10px] text-gray-400 font-mono">{r.admission_no}</div>
                      {canStatement && (
                        <button onClick={() => onStatement(r.student_id)}
                          className="mt-0.5 text-[9px] font-semibold text-teal-600 hover:text-teal-800 underline">
                          Monthly sheet
                        </button>
                      )}
                    </td>
                    <td className="px-3 py-2 text-gray-500">{r.class || "—"}</td>
                    <td className="px-3 py-2 text-center">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold border ${s.soft}`}>{s.label}</span>
                    </td>
                    <td className="px-3 py-2 text-gray-600">{r.comment || "—"}</td>
                    <td className="px-3 py-2 text-[10px] text-gray-500">
                      <div>{r.parent_email || <span className="text-gray-300">no email</span>}</div>
                      <div className="font-mono">{r.parent_phone || <span className="text-gray-300">no phone</span>}</div>
                    </td>
                    <td className="px-3 py-2 text-center text-[10px]">
                      {r.notified_at
                        ? <span className="text-emerald-600 font-semibold">app ✓</span>
                        : <span className="text-gray-300">—</span>}
                      {r.emailed_at && <span className="block text-blue-600">email ✓</span>}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {canNotify && awayRows.length > 0 && (
        <p className="mt-2 text-[10px] text-gray-400">
          Parents with an app account were already notified when the register was saved.
          Email and WhatsApp are extra — WhatsApp opens a prefilled chat per parent, since the
          school has no WhatsApp Business API subscription.
        </p>
      )}
    </>
  );
}

function Stat({ label, value, tone, hint }) {
  return (
    <div className="bg-white border border-gray-200 rounded-xl px-3 py-2.5">
      <p className="text-[9px] uppercase tracking-wider text-gray-500">{label}</p>
      <p className={`text-lg font-bold ${tone}`}>{value}</p>
      {hint && <p className="text-[9px] text-gray-400 mt-0.5">{hint}</p>}
    </div>
  );
}

function Dot({ on, label }) {
  return (
    <span title={`${label}: ${on ? "yes" : "not on file"}`}
      className={`w-2 h-2 rounded-full ${on ? "bg-emerald-500" : "bg-gray-200"}`} />
  );
}
