import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { get, post, put, del } from "../../api/axios";
import Swal from "sweetalert2";
import { PageHeader, Spinner, EmptyState } from "../../components/hr/HrUI";
import RichTextField, { RichTextView } from "../../components/RichTextField";
import Select2 from "../../components/hr/Select2";
import { useAuth } from "../../admin/context/AuthContext";
import { fmtDate } from "../../utils/formErrors";

/**
 * Talking Points — the super-admin's notebook.
 *
 * One window for every talking point, reminder and set of
 * meeting notes: rich text, dated automatically, optionally
 * shared with the people involved — employees and registered
 * guests alike — markable completed, convertible into a
 * normal task or an appointment, and readable in a full view.
 * Anyone mentioned as a participant sees the entries shared
 * with them here, read-only. Guests can be registered from
 * right here, with a single button.
 */

const fmtDay = (iso) => {
  if (!iso) return "";
  try {
    return new Date(iso + (iso.length === 10 ? "T00:00:00" : "")).toLocaleDateString("en-GB", {
      weekday: "short", day: "numeric", month: "short", year: "numeric",
    });
  } catch {
    return iso;
  }
};

export default function TalkingPoints() {
  const { isSuperAdmin } = useAuth();
  const [tab, setTab] = useState("open");
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(null);   // { mode: "new" } | { mode: "edit", tp } | { mode: "view", tp }
  const [convertTarget, setConvertTarget] = useState(null);

  const load = useCallback(() => {
    setLoading(true);
    get("/hr/talking-points", { cache: false, params: { status: tab } })
      .then((r) => setRows(r.data?.data || []))
      .catch((e) => Swal.fire("Error", e.response?.data?.message || "Could not load talking points.", "error"))
      .finally(() => setLoading(false));
  }, [tab]);
  useEffect(() => { load(); }, [load]);

  return (
    <div className="px-4 py-5 space-y-4">
      <PageHeader title="Talking Points" subtitle={isSuperAdmin
        ? "Notes, reminders and talking points — one place for all of them"
        : "Talking points shared with you"}
        icon="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z"
        actions={isSuperAdmin ? (
          <button onClick={() => setModal({ mode: "new" })}
            className="px-3 py-1.5 rounded-lg bg-teal-600 text-white text-xs font-semibold hover:bg-teal-700">
            + New Talking Point
          </button>
        ) : null} />

      <div className="inline-flex rounded-xl border border-gray-200 bg-white p-0.5">
        {[["open", "Open"], ["completed", "Completed"]].map(([k, l]) => (
          <button key={k} onClick={() => setTab(k)}
            className={`px-3 py-1.5 text-sm rounded-lg ${tab === k ? "bg-teal-600 text-white" : "text-gray-600"}`}>{l}</button>
        ))}
      </div>

      {loading && !rows.length ? (
        <div className="flex justify-center py-24"><Spinner /></div>
      ) : rows.length === 0 ? (
        <EmptyState title={tab === "open" ? "No open talking points" : "Nothing completed yet"}
          description={isSuperAdmin
            ? "Start one with “New Talking Point” — notes, reminders or the points from a meeting."
            : "Nothing has been shared with you here yet."} />
      ) : (
        <div className="space-y-2">
          {rows.map((tp) => (
            <div key={tp.id} className="bg-white rounded-xl border border-gray-200 p-4 hover:border-teal-300 transition">
              <div className="flex items-start gap-3">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-semibold text-gray-900" data-no-i18n>{tp.title}</span>
                    {tp.task && (
                      <a href={`/hr/staff-task/show/${tp.task.id}`}
                        className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-sky-50 text-sky-700 border border-sky-200">
                        Task #${tp.task.id}
                      </a>
                    )}
                    {tp.meeting && (
                      <a href={`/hr/meetings/show/${tp.meeting.id}`}
                        className={`px-1.5 py-0.5 rounded text-[10px] font-semibold border ${tp.meeting.meeting_type === "appointment"
                          ? "bg-orange-50 text-orange-700 border-orange-200"
                          : "bg-violet-50 text-violet-700 border-violet-200"}`} data-no-i18n>
                        {tp.meeting.meeting_type === "appointment" ? "🗓" : "📅"} {tp.meeting.title}
                      </a>
                    )}
                  </div>
                  <div className="text-[11px] text-gray-400 mt-0.5">
                    <span>{fmtDay(tp.written_on)}</span>
                    {tp.author?.name && <span data-no-i18n> · {isSuperAdmin ? "by" : "shared by"} {tp.author.name}</span>}
                    {tp.completed_at && <span> · completed {fmtDay(tp.completed_at.slice(0, 10))}</span>}
                  </div>
                  {tp.body && (
                    <div className="mt-2 text-sm text-gray-700 leading-relaxed line-clamp-3">
                      <RichTextView html={tp.body} />
                    </div>
                  )}
                  {(tp.participants?.length > 0 || tp.guests?.length > 0) && (
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      {tp.participants?.map((p) => (
                        <span key={p.id} className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-teal-50 text-teal-700 border border-teal-200" data-no-i18n>{p.name}</span>
                      ))}
                      {tp.guests?.map((g) => (
                        <span key={g.id} className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-orange-50 text-orange-700 border border-orange-200" data-no-i18n>
                          👤 {g.name}{g.who ? ` (${g.who})` : ""}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
                <div className="flex flex-col gap-1.5 flex-shrink-0">
                  <button onClick={() => setModal({ mode: "view", tp })}
                    className="px-2.5 py-1 rounded-lg border border-gray-200 text-[11px] font-semibold text-gray-600 hover:bg-gray-50">View</button>
                  <button onClick={() => setModal({ mode: "view", tp })}
                    className="px-2.5 py-1 rounded-lg border border-teal-200 text-[11px] font-semibold text-teal-700 hover:bg-teal-50">
                    💬 Reply{tp.replies?.length ? ` (${tp.replies.length})` : ""}
                  </button>
                  {isSuperAdmin && (
                    <button onClick={() => setModal({ mode: "edit", tp })}
                      className="px-2.5 py-1 rounded-lg border border-gray-200 text-[11px] font-semibold text-gray-600 hover:bg-gray-50">Edit</button>
                  )}
                  {isSuperAdmin && (
                    <button onClick={() => {
                      Swal.fire({
                        title: tp.status === "completed" ? "Reopen?" : "Mark completed?",
                        icon: "question", showCancelButton: true,
                        confirmButtonText: tp.status === "completed" ? "Reopen" : "Complete",
                      }).then((x) => {
                        if (!x.isConfirmed) return;
                        post(`/hr/talking-points/${tp.id}/complete`, { complete: tp.status !== "completed" })
                          .then(load)
                          .catch((e) => Swal.fire("Error", e.response?.data?.message || "Could not update.", "error"));
                      });
                    }}
                      className="px-2.5 py-1 rounded-lg border border-gray-200 text-[11px] font-semibold text-gray-600 hover:bg-gray-50">
                      {tp.status === "completed" ? "Reopen" : "Complete"}
                    </button>
                  )}
                  {isSuperAdmin && !tp.task_id && (
                    <button onClick={() => setConvertTarget(tp)}
                      className="px-2.5 py-1 rounded-lg border border-teal-200 text-[11px] font-semibold text-teal-700 hover:bg-teal-50">Convert to task or appointment</button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {modal && modal.mode === "view" ? (
        <ViewModal tp={modal.tp} onClose={() => setModal(null)} onChanged={load} />
      ) : modal ? (
        <TpModal key={modal.tp?.id || "new"} modal={modal}
          onClose={() => setModal(null)} onSaved={() => { setModal(null); load(); }} />
      ) : null}
      {convertTarget && (
        <ConvertModal tp={convertTarget}
          onClose={() => setConvertTarget(null)}
          onConverted={(result) => {
            setConvertTarget(null);
            load();
            if (result.kind === "appointment") {
              Swal.fire({
                icon: "success", title: "Booked as an appointment",
                html: `“${result.meeting.title.replace(/</g, "&lt;")}” is scheduled — the staff member has been asked to confirm.`,
                showCancelButton: true, confirmButtonText: "OK", cancelButtonText: "Open appointment",
              }).then((x) => {
                if (x.dismiss === Swal.DismissReason.cancel) window.location.hash = `#/hr/meetings/show/${result.meeting.id}`;
              });
            } else {
              Swal.fire({
                icon: "success", title: "Converted to a task",
                html: `“${result.task.task.replace(/</g, "&lt;")}” is now assigned.`,
                showCancelButton: true, confirmButtonText: "OK", cancelButtonText: "Open task",
              }).then((x) => {
                if (x.dismiss === Swal.DismissReason.cancel) window.location.hash = `#/hr/staff-task/show/${result.task.id}`;
              });
            }
          }} />
      )}
    </div>
  );
}

/** Create / edit. The people picker has two tabs — Employees
 *  (anyone with an account) and Guests (registered here, with
 *  one button). */
function TpModal({ modal, onClose, onSaved }) {
  const editing = modal.mode === "edit" ? modal.tp : null;
  const [title, setTitle] = useState(editing?.title || "");
  const [body, setBody] = useState(editing?.body || "");
  const [writtenOn, setWrittenOn] = useState(editing?.written_on || new Date().toISOString().slice(0, 10));
  const [notify, setNotify] = useState(editing?.notify ?? true);
  // Guests have no bell, so without this they are never told at all.
  const [emailToo, setEmailToo] = useState(true);
  const [meetingId, setMeetingId] = useState(editing?.meeting?.id || "");
  const [participants, setParticipants] = useState(editing?.participants?.map((p) => p.id) || []);
  const [guests, setGuests] = useState(editing?.guests?.map((g) => g.id) || []);
  const [peopleTab, setPeopleTab] = useState("employees");
  const [employees, setEmployees] = useState(null);
  const [employeeQuery, setEmployeeQuery] = useState("");
  const [guestList, setGuestList] = useState(null);
  const [guestQuery, setGuestQuery] = useState("");
  const [guestForm, setGuestForm] = useState({ name: "", phone: "", email: "", who: "" });
  const [meetingQuery, setMeetingQuery] = useState("");
  const [meetingOptions, setMeetingOptions] = useState([]);
  const [busy, setBusy] = useState(false);
  const meetingTimer = useRef(null);

  // The people to pick from.
  useEffect(() => {
    get("/appointments/staff", { cache: false })
      .then((r) => setEmployees((r.data?.data || []).filter((s) => s.user_id)))
      .catch(() => setEmployees([]));
    get("/hr/talking-points/guests", { cache: false })
      .then((r) => setGuestList(r.data?.data || []))
      .catch(() => setGuestList([]));
  }, []);

  // Meeting search — super-admins see every meeting.
  const searchMeetings = useCallback((q) => {
    get("/meetings", { cache: false, params: { search: q } })
      .then((r) => setMeetingOptions((r.data?.data || []).slice(0, 30).map((m) => ({ value: m.id, label: m.title }))))
      .catch(() => setMeetingOptions([]));
  }, []);
  useEffect(() => {
    if (editing?.meeting) {
      setMeetingOptions([{ value: editing.meeting.id, label: editing.meeting.title }]);
    }
  }, [editing]);
  const onMeetingQuery = (q) => {
    setMeetingQuery(q);
    clearTimeout(meetingTimer.current);
    meetingTimer.current = setTimeout(() => searchMeetings(q), 300);
  };

  const toggle = (list, setList, id) =>
    setList(list.includes(id) ? list.filter((x) => x !== id) : [...list, id]);

  const save = async () => {
    if (!title.trim()) {
      Swal.fire("Missing", "Give the talking point a title.", "warning");
      return;
    }
    setBusy(true);
    try {
      const payload = {
        title: title.trim(), body, written_on: writtenOn, notify,
        notify_by_email: notify && emailToo,
        meeting_id: meetingId || null, participants, guests,
      };
      const r = editing
        ? await put(`/hr/talking-points/${editing.id}`, payload)
        : await post("/hr/talking-points", payload);
      // Sharing is announced on the bell when the box was ticked.
      Swal.fire({
        toast: true, position: "top-end", icon: "success",
        title: editing ? "Saved" : (notify && (participants.length || guests.length) ? "Saved and shared" : "Saved"),
        timer: 1200, showConfirmButton: false,
      });
      onSaved();
    } catch (e) {
      Swal.fire("Error", e.response?.data?.message || "Could not save.", "error");
    } finally { setBusy(false); }
  };

  const shownEmployees = useMemo(() => {
    const q = employeeQuery.trim().toLowerCase();
    return (employees || []).filter((s) =>
      !q || [s.name, s.position, s.department].filter(Boolean).join(" ").toLowerCase().includes(q));
  }, [employees, employeeQuery]);
  const shownGuests = useMemo(() => {
    const q = guestQuery.trim().toLowerCase();
    return (guestList || []).filter((g) =>
      !q || [g.name, g.who, g.email, g.phone].filter(Boolean).join(" ").toLowerCase().includes(q));
  }, [guestList, guestQuery]);

  const registerGuest = async () => {
    if (!guestForm.name.trim()) {
      Swal.fire("Missing", "The guest's name is needed.", "warning");
      return;
    }
    try {
      const r = await post("/hr/talking-points/guests", guestForm);
      setGuestList((l) => [r.data.data, ...(l || [])]);
      setGuests((g) => [...g, r.data.data.id]);
      setGuestForm({ name: "", phone: "", email: "", who: "" });
    } catch (e) {
      Swal.fire("Error", e.response?.data?.message || "Could not register the guest.", "error");
    }
  };

  const field = "w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-teal-500 outline-none";

  return (
    <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl max-h-[92vh] flex flex-col" onClick={(e) => e.stopPropagation()}>
        <div className="px-5 py-4 border-b border-gray-100 flex items-start gap-3">
          <div className="min-w-0 flex-1">
            <h2 className="text-base font-bold text-gray-900">{editing ? "Edit talking point" : "New talking point"}</h2>
            <div className="text-[11px] text-gray-400 mt-0.5">Dated automatically when written.</div>
          </div>
          <button onClick={onClose} aria-label="Close" className="text-gray-400 hover:text-gray-600 text-lg leading-none">✕</button>
        </div>

        <div className="p-5 space-y-4 overflow-y-auto">
          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">Title *</label>
            <input value={title} onChange={(e) => setTitle(e.target.value)} className={field} maxLength={255}
              placeholder="e.g. Points for the weekly principal meeting" />
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">Notes</label>
            <RichTextField value={body} onChange={setBody} rows={6}
              placeholder="Write the notes here — rich text, lists, colours…" />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">Date written</label>
              <input type="date" value={writtenOn} onChange={(e) => setWrittenOn(e.target.value)} className={field} />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">Linked meeting (optional)</label>
              <Select2 value={meetingId} onChange={(v) => setMeetingId(v || "")}
                options={meetingOptions} placeholder="Search meetings…"
                isClearable />
              <input value={meetingQuery} onChange={(e) => onMeetingQuery(e.target.value)}
                className={`${field} mt-1.5`} placeholder="Type to search meetings…" />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">People involved</label>
            <div className="inline-flex rounded-lg border border-gray-200 p-0.5 mb-2">
              {[["employees", "Employees"], ["guests", "Guests"]].map(([k, l]) => (
                <button key={k} type="button" onClick={() => setPeopleTab(k)}
                  className={`px-3 py-1 text-xs rounded-md ${peopleTab === k ? "bg-teal-600 text-white" : "text-gray-600"}`}>{l}</button>
              ))}
            </div>

            {peopleTab === "employees" ? (
              <div>
                <input value={employeeQuery} onChange={(e) => setEmployeeQuery(e.target.value)}
                  className={`${field} mb-2`} placeholder="Search employees…" />
                <div className="max-h-44 overflow-y-auto rounded-lg border border-gray-200 divide-y divide-gray-100">
                  {(shownEmployees.length === 0) && <div className="px-3 py-2 text-xs text-gray-400">No employees match.</div>}
                  {shownEmployees.map((s) => (
                    <label key={s.id} className="flex items-center gap-2 px-3 py-1.5 hover:bg-teal-50/50 cursor-pointer">
                      <input type="checkbox"
                        checked={participants.includes(s.user_id)}
                        onChange={() => toggle(participants, setParticipants, s.user_id)}
                        className="accent-teal-600" />
                      <span className="text-sm text-gray-800" data-no-i18n>{s.name}</span>
                      <span className="text-[10px] text-gray-400" data-no-i18n>{[s.position, s.department].filter(Boolean).join(" · ")}</span>
                    </label>
                  ))}
                </div>
              </div>
            ) : (
              <div>
                <div className="rounded-lg border border-dashed border-teal-300 bg-teal-50/40 p-3 mb-2">
                  <div className="text-[10px] font-semibold uppercase tracking-wider text-teal-700 mb-1.5">Register a guest — one button</div>
                  <div className="grid grid-cols-2 gap-2">
                    <input value={guestForm.name} onChange={(e) => setGuestForm({ ...guestForm, name: e.target.value })}
                      className={field} placeholder="Full name *" maxLength={150} />
                    <input value={guestForm.who} onChange={(e) => setGuestForm({ ...guestForm, who: e.target.value })}
                      className={field} placeholder="Who is he? (optional)" maxLength={150} />
                    <input value={guestForm.phone} onChange={(e) => setGuestForm({ ...guestForm, phone: e.target.value })}
                      className={field} placeholder="Phone (optional)" maxLength={30} dir="ltr" />
                    <input value={guestForm.email} onChange={(e) => setGuestForm({ ...guestForm, email: e.target.value })}
                      className={field} placeholder="Email (optional)" maxLength={150} type="email" dir="ltr" />
                  </div>
                  <button type="button" onClick={registerGuest}
                    className="mt-2 px-3 py-1.5 rounded-lg bg-teal-600 text-white text-xs font-semibold hover:bg-teal-700">
                    + Add guest
                  </button>
                </div>
                <input value={guestQuery} onChange={(e) => setGuestQuery(e.target.value)}
                  className={`${field} mb-2`} placeholder="Search registered guests…" />
                <div className="max-h-36 overflow-y-auto rounded-lg border border-gray-200 divide-y divide-gray-100">
                  {(shownGuests.length === 0) && <div className="px-3 py-2 text-xs text-gray-400">No guests registered yet — add one above.</div>}
                  {shownGuests.map((g) => (
                    <label key={g.id} className="flex items-center gap-2 px-3 py-1.5 hover:bg-orange-50/50 cursor-pointer">
                      <input type="checkbox"
                        checked={guests.includes(g.id)}
                        onChange={() => toggle(guests, setGuests, g.id)}
                        className="accent-teal-600" />
                      <span className="text-sm text-gray-800" data-no-i18n>{g.name}</span>
                      <span className="text-[10px] text-gray-400" data-no-i18n>{[g.who, g.phone, g.email].filter(Boolean).join(" · ")}</span>
                    </label>
                  ))}
                </div>
              </div>
            )}
          </div>

          <label className="flex items-center gap-2 cursor-pointer">
            <input type="checkbox" checked={notify} onChange={(e) => setNotify(e.target.checked)} className="accent-teal-600" />
            <span className="text-sm text-gray-700">Share with the people involved <span className="text-gray-400">(notify them in their bell)</span></span>
          </label>
          {notify && (
            <label className="flex items-center gap-2 cursor-pointer ms-6">
              <input type="checkbox" checked={emailToo} onChange={(e) => setEmailToo(e.target.checked)} className="accent-teal-600" />
              <span className="text-sm text-gray-700">Also email the participants <span className="text-gray-400">(guests are reached by email only)</span></span>
            </label>
          )}
        </div>

        <div className="px-5 py-3 border-t border-gray-100 flex justify-end gap-2">
          <button onClick={onClose} className="px-4 py-2 rounded-lg border border-gray-200 text-sm text-gray-600 hover:bg-gray-50">Cancel</button>
          <button onClick={save} disabled={busy}
            className="px-4 py-2 rounded-lg bg-teal-600 text-white text-sm font-semibold hover:bg-teal-700 disabled:opacity-60">
            {busy ? "Saving…" : editing ? "Save changes" : "Save talking point"}
          </button>
        </div>
      </div>
    </div>
  );
}

/** Turn a talking point into a normal task or an appointment.
 *  Two tabs on one card: the task side picks the person it goes
 *  to; the appointment side picks the person to meet, the day,
 *  the time and how long — the backend re-checks the slot. */
function ConvertModal({ tp, onClose, onConverted }) {
  const [mode, setMode] = useState("task");          // task | appointment
  const canBook = !tp.meeting_id;                     // already linked → nothing to book
  const [staff, setStaff] = useState(null);
  const [staffId, setStaffId] = useState("");
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [start, setStart] = useState("09:00");
  const [duration, setDuration] = useState(30);
  const [location, setLocation] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    get("/appointments/staff", { cache: false })
      .then((r) => setStaff(r.data?.data || []))
      .catch(() => setStaff([]));
  }, []);

  const options = useMemo(() => (staff || []).map((s) => ({
    value: s.id,
    label: [s.name, s.position].filter(Boolean).join(" — "),
    isDisabled: !!s.is_inactive,
  })), [staff]);

  const convertTask = async () => {
    if (!staffId) {
      Swal.fire("Missing", "Pick who the task goes to.", "warning");
      return;
    }
    setBusy(true);
    try {
      const r = await post(`/hr/talking-points/${tp.id}/convert`, { staff_id: Number(staffId) });
      onConverted({ kind: "task", task: r.data.data.task });
    } catch (e) {
      const res = e.response?.data;
      if (e.response?.status === 422 && res?.data?.task) {
        onConverted({ kind: "task", task: res.data.task });
      } else {
        Swal.fire("Error", res?.message || "Could not convert.", "error");
      }
    } finally { setBusy(false); }
  };

  const convertAppointment = async () => {
    if (!staffId) {
      Swal.fire("Missing", "Pick who the appointment is with.", "warning");
      return;
    }
    setBusy(true);
    try {
      const r = await post(`/hr/talking-points/${tp.id}/convert-appointment`, {
        staff_id: Number(staffId), date, start, duration,
        location: location.trim() || null,
      });
      onConverted({ kind: "appointment", meeting: r.data.data.meeting });
    } catch (e) {
      Swal.fire("Error", e.response?.data?.message || "Could not book the appointment.", "error");
    } finally { setBusy(false); }
  };

  const field = "w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-teal-500 outline-none";

  return (
    <div className="fixed inset-0 z-[60] bg-black/40 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md" onClick={(e) => e.stopPropagation()}>
        <div className="px-5 py-4 border-b border-gray-100 flex items-start gap-3">
          <div className="min-w-0 flex-1">
            <h2 className="text-base font-bold text-gray-900">Convert talking point</h2>
            <div className="text-xs text-gray-500 mt-0.5" data-no-i18n>“{tp.title}”</div>
          </div>
          <button onClick={onClose} aria-label="Close" className="text-gray-400 hover:text-gray-600 text-lg leading-none">✕</button>
        </div>
        <div className="p-5 space-y-3">
          <div className="inline-flex rounded-lg border border-gray-200 p-0.5">
            {[["task", "Task"], ...(canBook ? [["appointment", "Appointment"]] : [])].map(([k, l]) => (
              <button key={k} type="button" onClick={() => { setMode(k); setStaffId(""); }}
                className={`px-3 py-1 text-xs rounded-md ${mode === k ? "bg-teal-600 text-white" : "text-gray-600"}`}>{l}</button>
            ))}
          </div>

          {mode === "task" ? (
            <>
              <p className="text-xs text-gray-500">The title becomes the task and the notes become its details. Pick who it goes to.</p>
              <Select2 value={staffId} onChange={(v) => setStaffId(v || "")} options={options}
                placeholder="Assign to…" />
            </>
          ) : (
            <>
              <p className="text-xs text-gray-500">The title and notes become the appointment’s purpose. The staff member is asked to confirm.</p>
              <Select2 value={staffId} onChange={(v) => setStaffId(v || "")} options={options}
                placeholder="Appointment with…" />
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-[11px] font-semibold text-gray-600 mb-1">Date</label>
                  <input type="date" value={date} min={new Date().toISOString().slice(0, 10)}
                    onChange={(e) => setDate(e.target.value)} className={field} />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-gray-600 mb-1">Start</label>
                  <input type="time" value={start} onChange={(e) => setStart(e.target.value)} className={field} />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-gray-600 mb-1">Duration</label>
                  <select value={duration} onChange={(e) => setDuration(Number(e.target.value))} className={field}>
                    {[30, 60, 90].map((d) => <option key={d} value={d}>{d} minutes</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-gray-600 mb-1">Location (optional)</label>
                  <input value={location} onChange={(e) => setLocation(e.target.value)} className={field}
                    placeholder="e.g. Meeting room" maxLength={100} />
                </div>
              </div>
            </>
          )}
        </div>
        <div className="px-5 py-3 border-t border-gray-100 flex justify-end gap-2">
          <button onClick={onClose} className="px-4 py-2 rounded-lg border border-gray-200 text-sm text-gray-600 hover:bg-gray-50">Cancel</button>
          <button onClick={mode === "task" ? convertTask : convertAppointment} disabled={busy}
            className="px-4 py-2 rounded-lg bg-teal-600 text-white text-sm font-semibold hover:bg-teal-700 disabled:opacity-60">
            {busy ? "Working…" : mode === "task" ? "Convert to task" : "Book appointment"}
          </button>
        </div>
      </div>
    </div>
  );
}

/** Full view of one talking point — the whole note, everyone
 *  involved, what it became, and the reply-back thread where the
 *  people it was shared with can answer. Anyone who can see the
 *  entry may reply; a reply can be removed by its author. */
function ViewModal({ tp, onClose, onChanged }) {
  const { user, isSuperAdmin } = useAuth();
  const [replies, setReplies] = useState(tp.replies || []);
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);

  const send = async () => {
    const body = text.trim();
    if (!body || busy) return;
    setBusy(true);
    try {
      const r = await post(`/hr/talking-points/${tp.id}/reply`, { body });
      setReplies((list) => [...list, r.data?.data]);
      setText("");
      onChanged?.();
    } catch (e) {
      Swal.fire("Error", e.response?.data?.message || "Could not send reply.", "error");
    } finally { setBusy(false); }
  };

  const remove = async (id) => {
    try {
      await del(`/hr/talking-points/${tp.id}/reply/${id}`);
      setReplies((list) => list.filter((x) => x.id !== id));
      onChanged?.();
    } catch (e) {
      Swal.fire("Error", e.response?.data?.message || "Could not delete reply.", "error");
    }
  };

  const canDelete = (r) => isSuperAdmin || (user && r.user_id === user.id);

  return (
    <div className="fixed inset-0 z-[60] bg-black/40 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl max-h-[92vh] flex flex-col" onClick={(e) => e.stopPropagation()}>
        <div className="px-5 py-4 border-b border-gray-100 flex items-start gap-3">
          <div className="min-w-0 flex-1">
            <h2 className="text-base font-bold text-gray-900" data-no-i18n>{tp.title}</h2>
            <div className="text-[11px] text-gray-400 mt-0.5">
              <span>{fmtDay(tp.written_on)}</span>
              {tp.author?.name && <span data-no-i18n> · by {tp.author.name}</span>}
              {tp.status === "completed" && tp.completed_at
                && <span> · completed {fmtDay(tp.completed_at.slice(0, 10))}</span>}
            </div>
          </div>
          <button onClick={onClose} aria-label="Close" className="text-gray-400 hover:text-gray-600 text-lg leading-none">✕</button>
        </div>

        <div className="p-5 space-y-4 overflow-y-auto">
          {tp.body ? (
            <div className="text-sm text-gray-700 leading-relaxed">
              <RichTextView html={tp.body} />
            </div>
          ) : (
            <div className="text-sm text-gray-400 italic">No notes on this talking point.</div>
          )}

          {(tp.participants?.length > 0 || tp.guests?.length > 0) && (
            <div>
              <div className="text-[10px] font-semibold uppercase tracking-wider text-gray-500 mb-1.5">People involved</div>
              <div className="flex flex-wrap gap-1.5">
                {tp.participants?.map((p) => (
                  <span key={p.id} className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-teal-50 text-teal-700 border border-teal-200" data-no-i18n>{p.name}</span>
                ))}
                {tp.guests?.map((g) => (
                  <span key={g.id} className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-orange-50 text-orange-700 border border-orange-200" data-no-i18n>
                  👤 {g.name}{g.who ? ` (${g.who})` : ""}
                  </span>
                ))}
              </div>
            </div>
          )}

          {(tp.meeting || tp.task) && (
            <div className="rounded-lg border border-gray-200 divide-y divide-gray-100">
              {tp.meeting && (
                <a href={`/hr/meetings/show/${tp.meeting.id}`} className="flex items-center gap-2 px-3 py-2 hover:bg-gray-50">
                  <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-violet-50 text-violet-700 border border-violet-200">
                    {tp.meeting.meeting_type === "appointment" ? "Appointment" : "Meeting"}
                  </span>
                  <span className="text-sm text-gray-800" data-no-i18n>{tp.meeting.title}</span>
                </a>
              )}
              {tp.task && (
                <a href={`/hr/staff-task/show/${tp.task.id}`} className="flex items-center gap-2 px-3 py-2 hover:bg-gray-50">
                  <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-sky-50 text-sky-700 border border-sky-200">Task</span>
                  <span className="text-sm text-gray-800" data-no-i18n>{tp.task.task}</span>
                </a>
              )}
            </div>
          )}

          {/* Reply-back thread — the people it was shared with answer here. */}
          <div>
            <div className="text-[10px] font-semibold uppercase tracking-wider text-gray-500 mb-1.5">
              Replies {replies.length > 0 && <span className="text-gray-400">({replies.length})</span>}
            </div>

            {replies.length === 0 ? (
              <div className="text-sm text-gray-400 italic">No replies yet — be the first to answer.</div>
            ) : (
              <div className="space-y-2">
                {replies.map((r) => (
                  <div key={r.id} className="rounded-lg border border-gray-200 bg-gray-50/60 p-3">
                    <div className="flex items-start gap-2">
                      <div className="min-w-0 flex-1">
                        <div className="text-[11px] text-gray-500">
                          <span className="font-semibold text-gray-700" data-no-i18n>{r.author?.name || "Someone"}</span>
                          <span> · {fmtDay((r.created_at || "").slice(0, 10))}</span>
                        </div>
                        <div className="mt-1 text-sm text-gray-800 whitespace-pre-wrap leading-relaxed" data-no-i18n>{r.body}</div>
                      </div>
                      {canDelete(r) && (
                        <button onClick={() => remove(r.id)}
                          className="text-[11px] text-gray-400 hover:text-red-600 flex-shrink-0">Delete</button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}

            <div className="mt-3">
              <textarea value={text} onChange={(e) => setText(e.target.value)} rows={2}
                maxLength={5000}
                onKeyDown={(e) => { if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) send(); }}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-teal-500 outline-none resize-y"
                placeholder="Write a reply…" />
              <div className="flex items-center justify-end gap-2 mt-1.5">
                <span className="text-[10px] text-gray-400 mr-auto">Ctrl+Enter to send</span>
                <button onClick={send} disabled={busy || !text.trim()}
                  className="px-3 py-1.5 rounded-lg bg-teal-600 text-white text-xs font-semibold hover:bg-teal-700 disabled:opacity-50">
                  {busy ? "Sending…" : "Send reply"}
                </button>
              </div>
            </div>
          </div>
        </div>

        <div className="px-5 py-3 border-t border-gray-100 flex justify-end">
          <button onClick={onClose} className="px-4 py-2 rounded-lg border border-gray-200 text-sm text-gray-600 hover:bg-gray-50">Close</button>
        </div>
      </div>
    </div>
  );
}
