import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import Swal from "sweetalert2";
import { get, post, put } from "../../api/axios";
import { PageHeader, EmptyState, Spinner } from "../../components/hr/HrUI";

/**
 * My Check-in — the Operations Hub task workspace (spec §2.2, §2.3, §2.6).
 *
 * Left: the Inbox — everything assigned to me with no day chosen yet.
 * Right: this week, day by day. A task is planned by picking a day on it;
 * "Inbox" sends it back. Each task carries a live clock (one runs at a time)
 * and the last check-in. The check-in form answers "where are things right
 * now?" — Done closes the task, Blocked alerts whoever assigned it.
 */
const LIVE = {
  on_track:    { label: "On track",    dot: "bg-emerald-500", chip: "bg-emerald-50 text-emerald-700" },
  at_risk:     { label: "At risk",     dot: "bg-amber-500",   chip: "bg-amber-50 text-amber-700" },
  blocked:     { label: "Blocked",     dot: "bg-red-500",     chip: "bg-red-50 text-red-700" },
  done:        { label: "Done",        dot: "bg-teal-600",    chip: "bg-teal-50 text-teal-700" },
  not_started: { label: "No update",   dot: "bg-gray-300",    chip: "bg-gray-100 text-gray-500" },
};
const PRIORITY = { urgent: "border-s-red-500", high: "border-s-orange-400", normal: "border-s-emerald-400", low: "border-s-gray-300" };

const hm = (min) => { const m = Math.max(0, Math.round(min || 0)); return m < 60 ? `${m}m` : `${Math.floor(m / 60)}h ${m % 60 ? `${m % 60}m` : ""}`.trim(); };
const dayName = (iso) => new Date(iso + "T00:00:00").toLocaleDateString(undefined, { weekday: "short" });
const dayNum = (iso) => new Date(iso + "T00:00:00").getDate();
const today = () => new Date().toISOString().slice(0, 10);

export default function MyCheckIn() {
  const navigate = useNavigate();
  const [board, setBoard] = useState(null);
  const [loading, setLoading] = useState(true);
  const [checkIn, setCheckIn] = useState(null);   // task being checked in
  const [tick, setTick] = useState(0);            // re-render the running clock
  const [loadedAt, setLoadedAt] = useState(0);

  const load = useCallback(() => get("/hr/staff-tasks/my-board", { cache: false })
    .then((r) => { setBoard(r.data); setLoadedAt(Date.now()); })
    .catch(() => Swal.fire("Error", "Could not load your board.", "error"))
    .finally(() => setLoading(false)), []);

  useEffect(() => { load(); }, [load]);
  // Tick once a minute while a clock runs; `tick` holds "now" so render stays pure.
  useEffect(() => {
    if (!board?.running) return undefined;
    const t = setInterval(() => setTick(Date.now()), 30000);
    return () => clearInterval(t);
  }, [board?.running]);

  const days = useMemo(() => {
    if (!board) return [];
    const out = [];
    const d = new Date(board.week_start + "T00:00:00");
    for (let i = 0; i < 6; i++) { out.push(d.toISOString().slice(0, 10)); d.setDate(d.getDate() + 1); } // Sat–Thu
    return out;
  }, [board]);

  const patch = (row) => setBoard((b) => {
    if (!b) return b;
    const strip = (list) => list.filter((t) => t.id !== row.id);
    const planned = Object.fromEntries(Object.entries(b.planned).map(([k, v]) => [k, strip(v)]));
    if (row.planned_date) planned[row.planned_date] = [...(planned[row.planned_date] || []), row];
    return { ...b, inbox: row.planned_date ? strip(b.inbox) : [...strip(b.inbox), row], planned, running: row.timer_running ? row : (b.running?.id === row.id ? null : b.running) };
  });

  const plan = (task, date) => put(`/hr/staff-tasks/${task.id}/plan`, { planned_date: date }).then((r) => patch(r.data.data)).catch(() => Swal.fire("Error", "Could not move the task.", "error"));
  const timer = (task, action) => post(`/hr/staff-tasks/${task.id}/timer/${action}`).then((r) => { patch(r.data.data); if (action === "start") load(); }).catch(() => Swal.fire("Error", "Could not update the timer.", "error"));

  if (loading) return <div className="flex justify-center py-24"><Spinner /></div>;
  if (!board) return null;

  const running = board.running;
  // The server's elapsed_minutes already includes the open session as of the
  // load; keep counting from there so the banner ticks without a refetch.
  const elapsedNow = (t) => t.elapsed_minutes + (t.timer_running && loadedAt ? Math.max(0, Math.floor(((tick || loadedAt) - loadedAt) / 60000)) : 0);

  return (
    <div className="px-4 py-5 space-y-4">
      <PageHeader title="My Check-in" subtitle="Plan your week, run the clock, say where things stand" icon="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />

      {running && (
        <div className="rounded-2xl bg-teal-700 text-white p-4 flex flex-wrap items-center gap-3">
          <span className="w-2.5 h-2.5 rounded-full bg-emerald-300 animate-pulse" />
          <div className="flex-1 min-w-0">
            <div className="text-xs opacity-80">Clock running</div>
            <div className="font-semibold truncate">{running.task}</div>
          </div>
          <div className="text-lg font-bold tabular-nums">{hm(elapsedNow(running))}{running.estimated_minutes ? <span className="text-sm font-normal opacity-80"> / {hm(running.estimated_minutes)}</span> : null}</div>
          <button onClick={() => timer(running, "pause")} className="px-3 py-1.5 rounded-lg bg-white/15 hover:bg-white/25 text-sm">⏸ Pause</button>
          <button onClick={() => setCheckIn(running)} className="px-3 py-1.5 rounded-lg bg-white text-teal-800 text-sm font-semibold">Check in</button>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-[340px_1fr] gap-4 items-start">
        {/* Inbox */}
        <section className="rounded-2xl border border-amber-200 bg-white overflow-hidden">
          <header className="px-4 py-3 bg-amber-50 text-amber-900 font-semibold text-sm flex justify-between">
            <span>Inbox</span><span className="font-normal text-xs">{board.inbox.length} <span>items</span></span>
          </header>
          <div className="p-3 space-y-2 min-h-[200px]">
            {board.inbox.length === 0 && <p className="text-xs text-gray-400 text-center py-8">Nothing waiting — everything has a day.</p>}
            {board.inbox.map((t) => <TaskCard key={t.id} t={t} days={days} onPlan={plan} onTimer={timer} onCheckIn={setCheckIn} />)}
          </div>
        </section>

        {/* Week plan */}
        <section className="rounded-2xl border border-teal-200 bg-white overflow-hidden">
          <header className="px-4 py-3 bg-teal-50 text-teal-800 font-semibold text-sm flex justify-between">
            <span>My week plan</span><span className="font-normal text-xs">{board.week_start} → {board.week_end}</span>
          </header>
          {days.map((d) => {
            const list = board.planned[d] || [];
            const isToday = d === today();
            return (
              <div key={d} className={`flex border-t border-gray-100 min-h-[68px] ${isToday ? "bg-amber-50/40" : ""}`}>
                <div className="w-24 shrink-0 px-3 py-2 border-e border-gray-100 bg-gray-50/60">
                  <div className="text-sm font-semibold text-gray-800">{dayName(d)} {dayNum(d)}</div>
                  {isToday && <div className="text-[10px] text-amber-700 font-semibold">Today</div>}
                  {list.length > 0 && <div className="text-[10px] text-gray-400 mt-0.5">⏱ {hm(list.reduce((s, t) => s + (t.estimated_minutes || 0), 0))}</div>}
                </div>
                <div className="flex-1 p-2 flex flex-wrap gap-2 content-start">
                  {list.length === 0 && <span className="text-[11px] text-gray-300 self-center px-2">Nothing planned</span>}
                  {list.map((t) => <TaskCard key={t.id} t={t} days={days} compact onPlan={plan} onTimer={timer} onCheckIn={setCheckIn} />)}
                </div>
              </div>
            );
          })}
        </section>
      </div>

      {board.inbox.length === 0 && Object.values(board.planned).every((l) => l.length === 0) && (
        <EmptyState title="No open tasks" description="Tasks assigned to you appear here." action={<button onClick={() => navigate("/hr/staff-task")} className="text-teal-600 text-sm font-medium">Open Staff Tasks →</button>} />
      )}

      {checkIn && <CheckInModal task={checkIn} onClose={() => setCheckIn(null)} onSaved={(row) => { patch(row); setCheckIn(null); if (row.status === "completed") load(); }} />}
    </div>
  );
}

function TaskCard({ t, days, compact = false, onPlan, onTimer, onCheckIn }) {
  const live = LIVE[t.live_status] || LIVE.not_started;
  const over = t.estimated_minutes && t.elapsed_minutes > t.estimated_minutes;
  return (
    <div className={`rounded-xl border border-gray-200 border-s-4 ${PRIORITY[t.task_type] || ""} bg-white p-2.5 ${compact ? "min-w-[220px] max-w-full" : ""} ${t.stale && t.status !== "pending" ? "ring-1 ring-red-200" : ""}`}>
      <div className="flex items-start gap-2">
        <span className={`mt-1.5 w-2 h-2 rounded-full shrink-0 ${live.dot}`} title={live.label} />
        <div className="flex-1 min-w-0">
          <div className="text-sm font-medium text-gray-800 leading-snug">{t.task}</div>
          <div className="mt-1 flex flex-wrap items-center gap-1.5 text-[10px] text-gray-500">
            {t.deadline && <span className={t.overdue ? "text-red-600 font-semibold" : ""}>⏰ {t.deadline}</span>}
            {t.estimated_minutes ? <span className={`px-1.5 py-0.5 rounded ${over ? "bg-red-50 text-red-600" : "bg-blue-50 text-blue-700"}`}>⏱ {hm(t.elapsed_minutes)} / {hm(t.estimated_minutes)}</span> : t.elapsed_minutes > 0 ? <span className="px-1.5 py-0.5 rounded bg-blue-50 text-blue-700">⏱ {hm(t.elapsed_minutes)}</span> : null}
            {t.assigned_by && <span>{t.assigned_by}</span>}
          </div>
          {t.progress > 0 && <div className="mt-1.5 h-1 rounded-full bg-gray-100 overflow-hidden"><div className={`h-full ${t.live_status === "blocked" ? "bg-red-500" : t.live_status === "at_risk" ? "bg-amber-500" : "bg-teal-600"}`} style={{ width: `${t.progress}%` }} /></div>}
        </div>
      </div>
      <div className="mt-2 flex flex-wrap items-center gap-1">
        <select value={t.planned_date || ""} onChange={(e) => onPlan(t, e.target.value || null)} className="text-[11px] border border-gray-200 rounded-md px-1.5 py-1 bg-white" title="Plan for a day">
          <option value="">Inbox</option>
          {days.map((d) => <option key={d} value={d}>{dayName(d)} {dayNum(d)}</option>)}
        </select>
        {t.timer_running
          ? <button onClick={() => onTimer(t, "pause")} className="text-[11px] px-2 py-1 rounded-md bg-teal-600 text-white">⏸ Pause</button>
          : <button onClick={() => onTimer(t, "start")} className="text-[11px] px-2 py-1 rounded-md border border-teal-600 text-teal-700 hover:bg-teal-50">▶ Start</button>}
        <button onClick={() => onCheckIn(t)} className="text-[11px] px-2 py-1 rounded-md border border-gray-200 text-gray-700 hover:bg-gray-50 ms-auto">Check in</button>
      </div>
    </div>
  );
}

function CheckInModal({ task, onClose, onSaved }) {
  const [status, setStatus] = useState(task.live_status === "not_started" ? "on_track" : task.live_status);
  const [pct, setPct] = useState(task.progress || 0);
  const [text, setText] = useState("");
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);

  const save = async () => {
    if (!text.trim()) return Swal.fire("Missing", "Write a short update.", "warning");
    if (status === "blocked" && !reason.trim()) return Swal.fire("Missing", "Say what you are blocked on.", "warning");
    setBusy(true);
    try {
      const r = await post(`/hr/staff-tasks/${task.id}/check-in`, { status, progress_pct: status === "done" ? 100 : Number(pct), update_text: text, blocked_reason: status === "blocked" ? reason : null });
      onSaved(r.data.data);
      Swal.fire({ icon: "success", title: status === "done" ? "Task completed" : "Update sent", timer: 1400, showConfirmButton: false });
    } catch (e) {
      Swal.fire("Error", e.response?.data?.message || "Could not send the update.", "error");
    } finally { setBusy(false); }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl w-full max-w-md shadow-xl" onClick={(e) => e.stopPropagation()}>
        <div className="px-5 py-4 border-b border-gray-100">
          <div className="text-xs text-gray-400">Quick status update</div>
          <div className="font-semibold text-gray-800">{task.task}</div>
        </div>
        <div className="p-5 space-y-4">
          <div>
            <div className="text-[11px] font-semibold uppercase tracking-wider text-gray-500 mb-2">Where are things right now?</div>
            <div className="grid grid-cols-4 gap-2">
              {["on_track", "at_risk", "blocked", "done"].map((k) => (
                <button key={k} onClick={() => setStatus(k)} className={`rounded-xl border-2 px-2 py-2.5 text-center text-xs font-medium transition ${status === k ? `${LIVE[k].chip} border-current` : "border-gray-200 text-gray-600 hover:border-gray-300"}`}>
                  <span className={`block w-3 h-3 rounded-full mx-auto mb-1 ${LIVE[k].dot}`} />{LIVE[k].label}
                </button>
              ))}
            </div>
          </div>
          {status !== "done" && (
            <div>
              <div className="flex justify-between text-[11px] font-semibold uppercase tracking-wider text-gray-500 mb-1"><span>Progress</span><span className="text-teal-700">{pct}%</span></div>
              <input type="range" min="0" max="100" value={pct} onChange={(e) => setPct(e.target.value)} className="w-full accent-teal-600" />
            </div>
          )}
          <textarea rows={3} value={text} onChange={(e) => setText(e.target.value)} placeholder="What's the update? e.g. Finished the revenue section, working on expenses now." className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:ring-2 focus:ring-teal-200 outline-none" dir="auto" />
          {status === "blocked" && (
            <div>
              <input value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Blocked on… / waiting for…" className="w-full border border-red-200 bg-red-50/40 rounded-xl px-3 py-2 text-sm outline-none" dir="auto" />
              <p className="text-[11px] text-gray-400 mt-1">This alerts the person who assigned the task.</p>
            </div>
          )}
        </div>
        <div className="px-5 py-3 border-t border-gray-100 flex justify-end gap-2">
          <button onClick={onClose} className="px-4 py-2 text-sm text-gray-600">Cancel</button>
          <button onClick={save} disabled={busy} className="px-4 py-2 text-sm rounded-xl bg-teal-600 text-white font-semibold disabled:opacity-50">{busy ? "Sending…" : "Send update"}</button>
        </div>
      </div>
    </div>
  );
}

