import { useState } from "react";
import Swal from "sweetalert2";
import { post } from "../../api/axios";

/**
 * Reminders the organiser sets for everyone else — shared by the task,
 * meeting and event forms — and the "Send reminder now" button their detail
 * pages carry.
 *
 * The lead times mirror App\Models\SelfReminder::AUTO_LEADS (minutes).
 */
const REMIND_OPTIONS = [
  { minutes: 10080, label: "1 week before" },
  { minutes: 1440, label: "1 day before" },
  { minutes: 60, label: "1 hour before" },
];

/** Tick any of: a week / a day / an hour before. `value` is an array of minutes. */
export function AutoRemindPicker({ value = [], onChange, hint }) {
  const toggle = (m) => onChange(value.includes(m) ? value.filter((x) => x !== m) : [...value, m]);
  return (
    <div>
      <label className="block text-[11px] font-semibold text-gray-600 mb-1.5">Remind them automatically</label>
      <div className="flex flex-wrap gap-2">
        {REMIND_OPTIONS.map((o) => {
          const on = value.includes(o.minutes);
          return (
            <button key={o.minutes} type="button" onClick={() => toggle(o.minutes)} aria-pressed={on}
              className={`px-3 py-1.5 rounded-lg border text-xs font-medium transition ${on
                ? "bg-teal-600 border-teal-600 text-white"
                : "bg-white border-gray-200 text-gray-600 hover:border-teal-400"}`}>
              {on ? "✓ " : ""}{o.label}
            </button>
          );
        })}
      </div>
      <p className="text-[11px] text-gray-400 mt-1">
        {hint || "A notification pops up for them at that time — and an email too, if “Email” is ticked."}
      </p>
    </div>
  );
}

/**
 * "Send reminder now". `endpoint` is the item's remind route, e.g.
 * `/meetings/12/remind`. Asks first, and whether to email as well.
 */
export function SendReminderButton({ endpoint, className = "" }) {
  const [busy, setBusy] = useState(false);

  const send = async () => {
    const r = await Swal.fire({
      title: "Send a reminder now?",
      text: "They get a notification straight away.",
      input: "checkbox",
      inputValue: 1,
      inputPlaceholder: "Also send it by email",
      showCancelButton: true,
      confirmButtonText: "Send reminder",
      cancelButtonText: "Cancel",
      confirmButtonColor: "#0d9488",
    });
    if (!r.isConfirmed) return;
    setBusy(true);
    try {
      const res = await post(endpoint, { email: !!r.value });
      Swal.fire({ toast: true, position: "top-end", icon: "success", title: res.data?.message || "Reminder sent", timer: 2200, showConfirmButton: false });
    } catch (e) {
      Swal.fire("Error", e.response?.data?.message || "Could not send the reminder.", "error");
    } finally {
      setBusy(false);
    }
  };

  return (
    <button type="button" onClick={send} disabled={busy}
      className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-amber-300 bg-amber-50 text-amber-800 text-xs font-semibold hover:bg-amber-100 disabled:opacity-50 ${className}`}>
      <span aria-hidden="true">🔔</span>{busy ? "Sending…" : "Send reminder now"}
    </button>
  );
}
