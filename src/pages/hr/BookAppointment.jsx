import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import Swal from "sweetalert2";
import { get, post, clearApiCache } from "../../api/axios";
import Select2 from "../../components/hr/Select2";

/**
 * Book an appointment with a staff member.
 *
 * Pick a person → their month appears: closed days, how many free slots each
 * day has, and on the chosen day a timeline of what holds their time (class,
 * meeting, event, task, leave…) between the free slots. Clicking a free slot
 * opens a small form; the booking becomes a meeting the staff member accepts
 * or declines. The backend re-checks the slot, so a stale screen cannot
 * double-book anyone.
 *
 * Used twice: signed in (/hr/book-appointment) and as the public, no-login
 * page (/book-appointment, `isPublic`), which also asks who the visitor is and
 * is told only the KIND of each busy block, never what it is.
 */

// The Afghan week — the grid starts on Saturday.
const WEEK = ["saturday", "sunday", "monday", "tuesday", "wednesday", "thursday", "friday"];
const DAY_LABEL = {
  saturday: "Saturday", sunday: "Sunday", monday: "Monday", tuesday: "Tuesday",
  wednesday: "Wednesday", thursday: "Thursday", friday: "Friday",
};
const DAY_SHORT = {
  saturday: "Sat", sunday: "Sun", monday: "Mon", tuesday: "Tue",
  wednesday: "Wed", thursday: "Thu", friday: "Fri",
};
const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

const KIND = {
  lesson:      { label: "In class",    cls: "bg-indigo-100 text-indigo-800 border-indigo-200" },
  unavailable: { label: "Unavailable", cls: "bg-gray-200 text-gray-700 border-gray-300" },
  meeting:     { label: "Meeting",     cls: "bg-amber-100 text-amber-800 border-amber-200" },
  appointment: { label: "Appointment", cls: "bg-orange-100 text-orange-800 border-orange-200" },
  event:       { label: "Event",       cls: "bg-purple-100 text-purple-800 border-purple-200" },
  task:        { label: "Task",        cls: "bg-sky-100 text-sky-800 border-sky-200" },
  leave:       { label: "On leave",    cls: "bg-rose-100 text-rose-800 border-rose-200" },
  holiday:     { label: "Holiday",     cls: "bg-emerald-100 text-emerald-800 border-emerald-200" },
};
const CLOSED = { weekend: "Weekend", holiday: "Holiday", leave: "On leave" };

const pad = (n) => String(n).padStart(2, "0");
const ymNow = () => { const d = new Date(); return `${d.getFullYear()}-${pad(d.getMonth() + 1)}`; };
const todayStr = () => { const d = new Date(); return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`; };
const shiftMonth = (ym, by) => {
  const [y, m] = ym.split("-").map(Number);
  const d = new Date(y, m - 1 + by, 1);
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}`;
};
const toMin = (hm) => { const [h, m] = hm.split(":").map(Number); return h * 60 + m; };
const toHm = (min) => `${pad(Math.floor(min / 60))}:${pad(min % 60)}`;

export default function BookAppointment({ isPublic = false }) {
  const navigate = useNavigate();
  const base = isPublic ? "/public/appointments" : "/appointments";

  const [staff, setStaff] = useState([]);
  const [staffLoading, setStaffLoading] = useState(true);
  const [staffId, setStaffId] = useState("");
  const [month, setMonth] = useState(ymNow());
  const [reloadTick, setReloadTick] = useState(0);
  const [calState, setCalState] = useState({ key: null, data: null });
  const [picked, setPicked] = useState(null);
  const [slot, setSlot] = useState(null); // { date, start }

  useEffect(() => {
    get(`${base}/staff`)
      .then((r) => setStaff(r.data?.data || []))
      .catch(() => setStaff([]))
      .finally(() => setStaffLoading(false));
  }, [base]);

  // One key per (person, month, reload). While the answer for the current key
  // is on its way the previous month stays on screen, dimmed.
  const calKey = staffId ? `${staffId}|${month}|${reloadTick}` : null;
  useEffect(() => {
    if (!calKey) return undefined;
    let live = true;
    get(`${base}/availability`, { params: { staff_id: staffId, month, _: reloadTick } })
      .then((r) => live && setCalState({ key: calKey, data: r.data?.data || null }))
      .catch(() => live && setCalState({ key: calKey, data: null }));
    return () => { live = false; };
  }, [calKey]); // eslint-disable-line react-hooks/exhaustive-deps
  const cal = staffId ? calState.data : null;
  const calLoading = !!calKey && calState.key !== calKey;

  // The day the person clicked, or else the first day of the month that still
  // has a free slot.
  const selDate = useMemo(() => {
    if (!cal) return null;
    if (picked && cal.days.some((d) => d.date === picked)) return picked;
    return cal.days.find((d) => d.free.length > 0)?.date || cal.days.find((d) => d.date >= todayStr())?.date || cal.days[0]?.date;
  }, [cal, picked]);

  const person = staff.find((s) => String(s.id) === String(staffId));
  // One searchable list: typing matches the name, position or department,
  // because they are all part of the label. Former staff stay listed, greyed.
  const staffOptions = useMemo(() => staff.map((s) => ({
    value: s.id,
    label: [s.name, s.position, s.department].filter(Boolean).join(" — ") + (s.is_inactive ? ` (${s.unavailable_reason})` : ""),
    isDisabled: !!s.is_inactive,
  })), [staff]);

  const day = cal?.days.find((d) => d.date === selDate);
  const [y, m] = month.split("-").map(Number);
  const leading = cal ? WEEK.indexOf(cal.days[0]?.day) : 0;

  // Timeline rows for the chosen day, one per slot between opening and closing.
  const rows = useMemo(() => {
    if (!cal || !day) return [];
    const out = [];
    const step = cal.slot_minutes;
    const freeStarts = new Set(day.free.map((f) => f.start));
    for (let t = toMin(cal.work_start); t < toMin(cal.work_end); t += step) {
      const s = toHm(t), e = toHm(t + step);
      const blocks = day.busy.filter((b) => b.start < e && b.end > s);
      out.push({ start: s, end: e, free: freeStarts.has(s), blocks });
    }
    return out;
  }, [cal, day]);

  const inner = (
    <div className="max-w-6xl mx-auto px-4 py-5 space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-2">
        <div>
          <h1 className="text-lg font-bold text-gray-900">Book an Appointment</h1>
          <p className="text-xs text-gray-500 mt-0.5">Pick a staff member, see when they are free, and request a time.</p>
        </div>
        {/* The no-login page, for visitors — shareable from here. */}
        {!isPublic && (
          <button type="button"
            onClick={() => {
              const url = `${window.location.origin}/book-appointment`;
              navigator.clipboard?.writeText(url)
                .then(() => Swal.fire({ icon: "success", title: "Public booking link copied", text: url, timer: 2500, showConfirmButton: false }))
                .catch(() => Swal.fire({ title: "Public booking link", text: url }));
            }}
            className="self-start sm:self-auto px-3 py-1.5 rounded-lg border border-teal-200 bg-teal-50 text-teal-700 text-xs font-semibold hover:bg-teal-100">
            Copy public booking link
          </button>
        )}
      </div>

      {/* Staff picker */}
      <div className="bg-white rounded-xl border border-gray-200 p-4 space-y-2">
        <label className="block text-xs font-semibold text-gray-700">Who do you want to meet?</label>
        <Select2
          size="lg"
          value={staffId}
          onChange={(v) => { setStaffId(v ? String(v) : ""); setPicked(null); }}
          options={staffOptions}
          disabled={staffLoading}
          placeholder={staffLoading ? "Loading…" : "Search by name, position or department…"}
        />
        {person && !isPublic && person.has_login === false && (
          <p className="text-[11px] text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
            This person has no system account, so they cannot confirm in the system. Administrators will be notified to confirm with them.
          </p>
        )}
      </div>

      {!staffId && (
        <div className="bg-white rounded-xl border border-dashed border-gray-300 p-10 text-center text-sm text-gray-400">
          Select a staff member to see their free time.
        </div>
      )}

      {staffId && (
        <div className="grid lg:grid-cols-5 gap-4">
          {/* Month */}
          <div className="lg:col-span-3 bg-white rounded-xl border border-gray-200 p-4">
            <div className="flex items-center justify-between mb-3">
              <button onClick={() => setMonth(shiftMonth(month, -1))} disabled={month <= ymNow()}
                className="px-2.5 py-1 rounded-lg border border-gray-200 text-sm disabled:opacity-30 hover:bg-gray-50">‹</button>
              <div className="text-sm font-bold text-gray-800">
                <span>{MONTHS[m - 1]}</span> <span>{y}</span>
              </div>
              <button onClick={() => setMonth(shiftMonth(month, 1))}
                className="px-2.5 py-1 rounded-lg border border-gray-200 text-sm hover:bg-gray-50">›</button>
            </div>

            <div className="grid grid-cols-7 gap-1 text-center text-[10px] font-bold text-gray-400 uppercase mb-1">
              {WEEK.map((d) => <div key={d}>{DAY_SHORT[d]}</div>)}
            </div>
            {calLoading && !cal ? (
              <div className="py-16 text-center"><div className="inline-block animate-spin rounded-full h-6 w-6 border-2 border-teal-600 border-t-transparent" /></div>
            ) : cal && (
              <div className={`grid grid-cols-7 gap-1 ${calLoading ? "opacity-50" : ""}`}>
                {Array.from({ length: leading }).map((_, i) => <div key={`b${i}`} />)}
                {cal.days.map((d) => {
                  const past = d.date < todayStr();
                  const sel = d.date === selDate;
                  const n = d.free.length;
                  const tone = d.closed === "leave" ? "bg-rose-50 text-rose-700"
                    : d.closed || past ? "bg-gray-50 text-gray-400"
                    : n === 0 ? "bg-red-50 text-red-700"
                    : n <= 4 ? "bg-amber-50 text-amber-800" : "bg-teal-50 text-teal-800";
                  return (
                    <button key={d.date} onClick={() => setPicked(d.date)}
                      className={`min-h-[64px] rounded-lg p-1.5 text-left border transition ${tone} ${sel ? "border-teal-600 ring-2 ring-teal-500" : "border-transparent hover:border-gray-300"}`}>
                      <div className="text-xs font-bold">{Number(d.date.slice(8))}</div>
                      <div className="text-[10px] leading-tight mt-1">
                        {d.closed ? <span>{CLOSED[d.closed] || d.closed}</span>
                          : past ? <span>Past</span>
                          : n === 0 ? <span>Fully booked</span>
                          : <><span className="font-bold">{n}</span> <span>free</span></>}
                      </div>
                      {!d.closed && d.busy.length > 0 && (
                        <div className="flex flex-wrap gap-0.5 mt-1">
                          {d.busy.slice(0, 6).map((b, i) => (
                            <span key={i} className={`w-1.5 h-1.5 rounded-full border ${KIND[b.kind]?.cls || "bg-gray-300"}`} />
                          ))}
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>
            )}

            <div className="flex flex-wrap gap-1.5 mt-3 pt-3 border-t border-gray-100">
              {Object.entries(KIND).map(([k, v]) => (
                <span key={k} className={`px-2 py-0.5 rounded-full border text-[10px] font-semibold ${v.cls}`}>{v.label}</span>
              ))}
            </div>
          </div>

          {/* Day */}
          <div className="lg:col-span-2 bg-white rounded-xl border border-gray-200 p-4">
            {!day ? (
              <div className="text-sm text-gray-400 text-center py-10">Pick a day on the calendar.</div>
            ) : (
              <>
                <div className="mb-3">
                  <div className="text-sm font-bold text-gray-800">
                    <span>{DAY_LABEL[day.day]}</span> <span>{day.date}</span>
                  </div>
                  <div className="text-[11px] text-gray-500 mt-0.5">Click a free time to book it.</div>
                </div>
                {day.closed ? (
                  <ClosedDay reason={day.closed} holiday={day.busy.find((b) => b.kind === "holiday")?.label} />
                ) : (
                  <div className="space-y-1 max-h-[520px] overflow-y-auto pr-1">
                    {rows.map((r) => (
                      <div key={r.start} className="flex items-stretch gap-2">
                        <div className="w-11 text-[11px] font-mono text-gray-500 pt-1.5 flex-shrink-0">{r.start}</div>
                        {r.free ? (
                          <button onClick={() => setSlot({ date: day.date, start: r.start })}
                            className="flex-1 text-left px-3 py-1.5 rounded-lg border border-dashed border-teal-300 bg-teal-50/50 text-teal-700 text-xs font-semibold hover:bg-teal-100">
                            Free — Book
                          </button>
                        ) : r.blocks.length > 0 ? (
                          <div className="flex-1 space-y-0.5">
                            {r.blocks.map((b, i) => (
                              <div key={i} className={`px-3 py-1.5 rounded-lg border text-xs ${KIND[b.kind]?.cls || "bg-gray-100 border-gray-200 text-gray-700"}`}>
                                <span className="font-semibold">{KIND[b.kind]?.label || b.kind}</span>
                                {b.label && <span className="opacity-80"> · {b.label}</span>}
                                <span className="opacity-60 font-mono text-[10px]"> {b.start}–{b.end}</span>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <div className="flex-1 px-3 py-1.5 rounded-lg bg-gray-50 text-gray-400 text-xs">Past</div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      )}

      {slot && cal && (
        <BookingModal
          base={base} isPublic={isPublic} person={person} cal={cal} slot={slot}
          onClose={() => setSlot(null)}
          onBooked={(body) => {
            setSlot(null);
            clearApiCache();
            setReloadTick((t) => t + 1);
            const res = body?.data;
            // Sentences stay whole text nodes (the DOM translator matches them
            // exactly); the name sits in its own element.
            const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
            Swal.fire({
              icon: "success",
              title: "Appointment requested",
              html: (body?.confirmed_by
                  ? `<div><span>Waiting for confirmation from:</span> <b>${esc(body.confirmed_by)}</b></div>`
                  : `<div>Administrators will confirm it with the staff member.</div>`)
                + `<div style="margin-top:8px">They have been notified in the system and in chat.</div>`
                + `<div style="margin-top:8px">The email with the day, time and place is sent only after the appointment is confirmed.</div>`,
              showCancelButton: !isPublic && !!res?.id,
              confirmButtonText: "OK",
              cancelButtonText: "Open appointment",
              confirmButtonColor: "#0d9488",
            }).then((x) => {
              if (x.dismiss === Swal.DismissReason.cancel && res?.id) navigate(`/hr/meetings/show/${res.id}`);
            });
          }}
        />
      )}
    </div>
  );

  if (!isPublic) return inner;
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-teal-700 text-white">
        <div className="max-w-6xl mx-auto px-4 py-3 text-sm font-bold">Wifaq Education Network</div>
      </div>
      {inner}
    </div>
  );
}

/** Why a whole day cannot be booked — leave above all, said plainly. */
function ClosedDay({ reason, holiday }) {
  const conf = {
    leave:   { icon: "🌴", title: "On leave", text: "This person is on leave on this day. Please choose another day.", cls: "bg-rose-50 border-rose-200 text-rose-800" },
    holiday: { icon: "🎉", title: "Holiday", text: "The school is closed for a holiday on this day.", cls: "bg-emerald-50 border-emerald-200 text-emerald-800" },
    weekend: { icon: "📅", title: "Weekend", text: "The school is closed on this day.", cls: "bg-gray-50 border-gray-200 text-gray-600" },
  }[reason] || { icon: "📅", title: "Closed", text: "The school is closed on this day.", cls: "bg-gray-50 border-gray-200 text-gray-600" };
  return (
    <div className={`rounded-xl border p-5 text-center ${conf.cls}`}>
      <div className="text-3xl mb-1">{conf.icon}</div>
      <div className="text-base font-bold">{conf.title}</div>
      {reason === "holiday" && holiday && <div className="text-sm font-semibold mt-0.5">{holiday}</div>}
      <p className="text-xs mt-1 opacity-90">{conf.text}</p>
    </div>
  );
}

function BookingModal({ base, isPublic, person, cal, slot, onClose, onBooked }) {
  const day = cal.days.find((d) => d.date === slot.date);
  const freeStarts = new Set((day?.free || []).map((f) => f.start));
  // A duration is offered only when every slot it covers is free.
  const durations = cal.durations.filter((dur) => {
    for (let t = toMin(slot.start); t < toMin(slot.start) + dur; t += cal.slot_minutes) {
      if (!freeStarts.has(toHm(t))) return false;
    }
    return true;
  });

  const [form, setForm] = useState({
    duration: durations[0] || cal.slot_minutes, purpose: "", location: "",
    for_other: false, requester_name: "", requester_phone: "", requester_email: "",
  });
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState({});
  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));
  // A visitor on the public page is always the guest; signed in, only when
  // booking for someone else.
  const guest = isPublic || form.for_other;

  const submit = async (e) => {
    e.preventDefault();
    if (guest && !isPublic && !form.requester_phone.trim() && !form.requester_email.trim()) {
      setErrors({ requester_email: ["A phone number or an email is needed."] });
      return;
    }
    setSaving(true);
    setErrors({});
    try {
      const payload = { staff_id: person?.id, date: slot.date, start: slot.start, duration: Number(form.duration), purpose: form.purpose, location: form.location || null };
      if (!isPublic) payload.for_other = form.for_other;
      if (guest) Object.assign(payload, { requester_name: form.requester_name, requester_phone: form.requester_phone || null, requester_email: form.requester_email || null });
      const r = await post(base, payload);
      onBooked(r.data);
    } catch (err) {
      const res = err.response?.data;
      if (res?.errors) setErrors(res.errors);
      else Swal.fire({ icon: "error", title: "Could not book", text: res?.message || "Please try again." });
    } finally {
      setSaving(false);
    }
  };

  const field = "w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-teal-500 outline-none";
  const err = (k) => errors[k] && <p className="text-[11px] text-red-600 mt-0.5">{errors[k][0]}</p>;

  return (
    <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4" onClick={onClose}>
      <form onSubmit={submit} onClick={(e) => e.stopPropagation()}
        className="bg-white rounded-2xl shadow-xl w-full max-w-md max-h-[90vh] overflow-y-auto">
        <div className="px-5 py-4 border-b border-gray-100">
          <h2 className="text-base font-bold text-gray-900">Request an appointment</h2>
          <div className="text-xs text-gray-500 mt-1 space-y-0.5">
            <div><span>With</span>: <span className="font-semibold text-gray-700">{person?.name}</span></div>
            <div><span>Confirmed by</span>: <span className="font-semibold text-gray-700">{person?.name}</span></div>
            <div><span>Date</span>: <span className="font-semibold text-gray-700">{DAY_LABEL[day?.day]} {slot.date}</span></div>
            <div><span>Time</span>: <span className="font-semibold text-gray-700 font-mono">{slot.start}–{toHm(toMin(slot.start) + Number(form.duration))}</span></div>
          </div>
        </div>
        <div className="px-5 py-4 space-y-3">
          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">Duration</label>
            <select value={form.duration} onChange={(e) => set("duration", e.target.value)} className={`${field} bg-white`}>
              {durations.map((d) => <option key={d} value={d}>{d} min</option>)}
            </select>
          </div>
          {!isPublic && (
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">Who is the appointment for?</label>
              <div className="grid grid-cols-2 gap-2">
                {[{ v: false, label: "Myself" }, { v: true, label: "Someone else" }].map((o) => (
                  <button key={String(o.v)} type="button" onClick={() => set("for_other", o.v)}
                    className={`px-3 py-2 rounded-lg border text-sm font-semibold ${form.for_other === o.v ? "border-teal-600 bg-teal-50 text-teal-800" : "border-gray-200 text-gray-600 hover:bg-gray-50"}`}>
                    {o.label}
                  </button>
                ))}
              </div>
              {form.for_other && (
                <p className="text-[11px] text-gray-500 mt-1">For a guest — even someone with no account. The day, time and place are emailed to them.</p>
              )}
            </div>
          )}
          {guest && (
            <>
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">{isPublic ? "Your name *" : "Guest's full name *"}</label>
                <input value={form.requester_name} onChange={(e) => set("requester_name", e.target.value)} className={field} required maxLength={150} />
                {err("requester_name")}
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">{isPublic ? "Phone number *" : "Guest's phone number"}</label>
                <input value={form.requester_phone} onChange={(e) => set("requester_phone", e.target.value)} className={field} required={isPublic} maxLength={30} dir="ltr" />
                {err("requester_phone")}
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">{isPublic ? "Email (optional)" : "Guest's email"}</label>
                <input type="email" value={form.requester_email} onChange={(e) => set("requester_email", e.target.value)} className={field} maxLength={150} dir="ltr" />
                {err("requester_email")}
                <p className="text-[11px] text-gray-500 mt-0.5">
                  {isPublic ? "Give your email to receive the appointment details." : "A phone number or an email is needed."}
                </p>
              </div>
            </>
          )}
          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">Purpose of the meeting *</label>
            <textarea value={form.purpose} onChange={(e) => set("purpose", e.target.value)} rows={3} className={field} required maxLength={1000} />
            {err("purpose")}
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">Place (optional)</label>
            <input value={form.location} onChange={(e) => set("location", e.target.value)} className={field} maxLength={100} placeholder="e.g. Principal's office" />
            {err("location")}
          </div>
          <p className="text-[11px] text-teal-800 bg-teal-50 border border-teal-100 rounded-lg px-3 py-2">
            The person you are meeting confirms the appointment. The email with the day, time and place is sent only after they confirm.
          </p>
          {(errors.date || errors.start || errors.duration || errors.staff_id) && (
            <p className="text-[11px] text-red-600">{(errors.date || errors.start || errors.duration || errors.staff_id)[0]}</p>
          )}
        </div>
        <div className="px-5 py-3 border-t border-gray-100 flex justify-end gap-2">
          <button type="button" onClick={onClose} className="px-4 py-2 rounded-lg border border-gray-200 text-sm text-gray-600 hover:bg-gray-50">Cancel</button>
          <button type="submit" disabled={saving} className="px-4 py-2 rounded-lg bg-teal-600 text-white text-sm font-semibold hover:bg-teal-700 disabled:opacity-60">
            {saving ? "Sending…" : "Send request"}
          </button>
        </div>
      </form>
    </div>
  );
}
