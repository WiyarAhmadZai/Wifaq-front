import { useState, useEffect, useCallback, useRef } from "react";
import Swal from "sweetalert2";
import { get, post, put, del } from "../../api/axios";

const TEAL = "#0D5C63";
const GOLD = "#C9A227";
const BORDER = "#D0E0E0";
const MUTED = "#5A7A7E";
const GREEN = "#2E7D5B";
const RED = "#B0546E";

const inputCls =
  "w-full px-2.5 py-1.5 border rounded-lg text-sm bg-white focus:ring-2 focus:ring-[#9CCBCB] focus:outline-none";

/**
 * Customisable checklists for a Meeting or an Event.
 *
 * Modelled on the Reminders pattern: a named list, rows you type straight into,
 * and a control on the left of each row. What a row carries here is a person (or
 * a thing), an optional number, free remarks, and — for invitation-style lists —
 * an attending / not-attending answer instead of a plain tick.
 *
 * Every write returns the whole list back from the server, so the panel never
 * has to reconcile a local copy against what was actually saved.
 *
 * @param {"meetings"|"events"} parentType  which module owns this
 * @param {number|string}       parentId    the meeting or event id
 */
export default function ChecklistPanel({ parentType, parentId }) {
  const [lists, setLists] = useState([]);
  const [canManage, setCanManage] = useState(false);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [adding, setAdding] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newTracks, setNewTracks] = useState(true);

  const load = useCallback(async () => {
    try {
      const res = await get(`/${parentType}/${parentId}/checklists`, { cache: false });
      setLists(res.data?.data || []);
      setCanManage(Boolean(res.data?.can_manage));
    } catch {
      /* A checklist is an add-on; never take the page down with it. */
    } finally { setLoading(false); }
  }, [parentType, parentId]);

  useEffect(() => { load(); }, [load]);

  // Every mutation answers with the full set — one place to apply it.
  const apply = (res) => { if (res?.data?.data) setLists(res.data.data); };

  const run = async (fn, failMsg) => {
    setBusy(true);
    try { apply(await fn()); }
    catch (err) {
      Swal.fire("Error", err.response?.data?.message
        || Object.values(err.response?.data?.errors || {})[0]?.[0] || failMsg, "error");
    } finally { setBusy(false); }
  };

  const addList = async () => {
    const title = newTitle.trim();
    if (!title) return Swal.fire("Name it", "Give the checklist a title, e.g. “Guests”.", "info");
    await run(() => post(`/${parentType}/${parentId}/checklists`, { title, track_response: newTracks }),
      "Failed to add the checklist.");
    setNewTitle(""); setAdding(false); setNewTracks(true);
  };

  const removeList = async (list) => {
    const r = await Swal.fire({
      title: "Delete this checklist?", text: `“${list.title}” and its ${list.items.length} row(s).`,
      icon: "warning", showCancelButton: true, confirmButtonColor: "#B83230", confirmButtonText: "Delete",
    });
    if (r.isConfirmed) await run(() => del(`/checklists/${list.id}`), "Failed to delete.");
  };

  const renameList = (list, title) =>
    run(() => put(`/checklists/${list.id}`, { title }), "Failed to rename.");

  const saveOutcome = (list, outcome) =>
    run(() => put(`/checklists/${list.id}`, { outcome }), "Failed to save the outcome.");

  const toggleTracking = (list) =>
    run(() => put(`/checklists/${list.id}`, { track_response: !list.track_response }), "Failed to update.");

  const addItem = (list, label) =>
    run(() => post(`/checklists/${list.id}/items`, { label }), "Failed to add the row.");

  const patchItem = (item, changes) =>
    run(() => put(`/checklist-items/${item.id}`, changes), "Failed to save the row.");

  const removeItem = (item) =>
    run(() => del(`/checklist-items/${item.id}`), "Failed to remove the row.");

  if (loading) return null;
  if (!canManage && lists.length === 0) return null;   // nothing to show, nothing to add

  return (
    <div className="bg-white rounded-2xl border shadow-sm" style={{ borderColor: BORDER }}>
      <div className="px-4 py-3 flex items-center justify-between gap-3 flex-wrap"
        style={{ borderBottom: `1px solid ${BORDER}` }}>
        <div>
          <h3 className="text-sm font-bold" style={{ color: "#0A3A3E" }}>Checklists</h3>
          <p className="text-[11px]" style={{ color: MUTED }}>
            Guests, equipment, who brings what — name the list yourself.
          </p>
        </div>
        {canManage && !adding && (
          <button onClick={() => setAdding(true)}
            className="px-3 py-1.5 rounded-xl text-xs font-bold text-white"
            style={{ background: TEAL }}>
            + New checklist
          </button>
        )}
      </div>

      {adding && (
        <div className="px-4 py-3" style={{ background: "#F4F8F8", borderBottom: `1px solid ${BORDER}` }}>
          <input autoFocus value={newTitle} onChange={(e) => setNewTitle(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") addList(); if (e.key === "Escape") setAdding(false); }}
            placeholder="Checklist title — e.g. Guests, Equipment, Catering"
            className={inputCls} style={{ borderColor: BORDER }} dir="auto" />
          <label className="flex items-center gap-2 mt-2 cursor-pointer">
            <input type="checkbox" checked={newTracks} onChange={(e) => setNewTracks(e.target.checked)}
              className="w-4 h-4 rounded" style={{ accentColor: TEAL }} />
            <span className="text-[11px]" style={{ color: MUTED }}>
              Ask attending / not attending (turn off for a plain to-do list)
            </span>
          </label>
          <div className="flex gap-2 mt-2">
            <button onClick={addList} disabled={busy}
              className="px-4 py-1.5 rounded-xl text-xs font-bold text-white disabled:opacity-50"
              style={{ background: TEAL }}>Add</button>
            <button onClick={() => { setAdding(false); setNewTitle(""); }}
              className="px-3 py-1.5 rounded-xl text-xs font-semibold" style={{ color: MUTED }}>Cancel</button>
          </div>
        </div>
      )}

      {lists.length === 0 ? (
        <p className="px-4 py-8 text-center text-xs" style={{ color: "#8AA4A7" }}>
          No checklist yet. Add one for the guest list, the equipment, or anything you need ticked off.
        </p>
      ) : (
        <div className="divide-y" style={{ borderColor: BORDER }}>
          {lists.map((list) => (
            <ChecklistCard
              key={list.id} list={list} canManage={canManage} busy={busy}
              onRename={renameList} onDelete={removeList} onToggleTracking={toggleTracking}
              onAddItem={addItem} onPatchItem={patchItem} onRemoveItem={removeItem}
              onSaveOutcome={saveOutcome}
            />
          ))}
        </div>
      )}
    </div>
  );
}

/* ── one named list ───────────────────────────────────────────────────────── */

function ChecklistCard({ list, canManage, busy, onRename, onDelete, onToggleTracking, onAddItem, onPatchItem, onRemoveItem, onSaveOutcome }) {
  const [renaming, setRenaming] = useState(false);
  const [title, setTitle] = useState(list.title);
  const [draft, setDraft] = useState("");
  const [outcome, setOutcome] = useState(list.outcome || "");
  const addRef = useRef(null);

  /* Re-seed the editable copies when the server hands back a different list.
   *
   * Adjusting state during render rather than in an effect: an effect would
   * paint the stale value first and then immediately re-render, which is the
   * cascading-render pattern React warns about. Guarding on the previous
   * server object means this runs once per change, not every render. */
  const [seen, setSeen] = useState(list);
  if (seen !== list) {
    setSeen(list);
    setTitle(list.title);
    setOutcome(list.outcome || "");
  }

  const t = list.tally || {};
  const submitAdd = () => {
    const label = draft.trim();
    if (!label) return;
    onAddItem(list, label);
    setDraft("");
    // Keep focus so a whole guest list is typed without touching the mouse.
    setTimeout(() => addRef.current?.focus(), 60);
  };

  return (
    <div className="px-4 py-3">
      <div className="flex items-center justify-between gap-2 flex-wrap mb-2">
        {renaming ? (
          <input autoFocus value={title} onChange={(e) => setTitle(e.target.value)}
            onBlur={() => { setRenaming(false); if (title.trim() && title !== list.title) onRename(list, title.trim()); }}
            onKeyDown={(e) => {
              if (e.key === "Enter") e.currentTarget.blur();
              if (e.key === "Escape") { setTitle(list.title); setRenaming(false); }
            }}
            className={inputCls} style={{ borderColor: TEAL, maxWidth: 280 }} dir="auto" />
        ) : (
          <button type="button" disabled={!canManage} onClick={() => setRenaming(true)}
            className="text-left disabled:cursor-default" title={canManage ? "Rename" : undefined}>
            <bdi dir="auto" className="text-sm font-bold" style={{ color: "#0A3A3E" }}>{list.title}</bdi>
          </button>
        )}

        <div className="flex items-center gap-1.5 flex-wrap">
          <Chip label={`${t.total || 0} rows`} bg="#F4F8F8" fg={MUTED} />
          {list.track_response && (
            <>
              <Chip label={`✓ ${t.attending || 0}`} bg="#E6F3EC" fg={GREEN} />
              <Chip label={`✕ ${t.not_attending || 0}`} bg="#FAEAEF" fg={RED} />
              {t.pending > 0 && <Chip label={`${t.pending} waiting`} bg="#FFF8E7" fg="#8A6F10" />}
              {/* Seats, plates, chairs — each yes counts for its number. */}
              {t.head_count > (t.attending || 0) && (
                <Chip label={`${t.head_count} total`} bg="#E8F6F6" fg={TEAL} />
              )}
            </>
          )}
          {!list.track_response && <Chip label={`${t.done || 0} done`} bg="#E6F3EC" fg={GREEN} />}
          {/* Only meaningful once somebody has actually been given something. */}
          {t.tasks > 0 && (
            <Chip label={`${t.tasks_done}/${t.tasks} tasks done`}
              bg={t.tasks_done === t.tasks ? "#E6F3EC" : "#FFF8E7"}
              fg={t.tasks_done === t.tasks ? GREEN : "#8A6F10"} />
          )}

          {canManage && (
            <>
              <button onClick={() => onToggleTracking(list)} disabled={busy}
                className="text-[10px] px-2 py-1 rounded-lg border disabled:opacity-50"
                style={{ borderColor: BORDER, color: MUTED }}
                title="Switch between attending/not-attending and a plain tick list">
                {list.track_response ? "→ tick list" : "→ RSVP list"}
              </button>
              <button onClick={() => onDelete(list)} disabled={busy}
                className="text-[11px] px-2 py-1 rounded-lg text-gray-400 hover:text-red-500">✕</button>
            </>
          )}
        </div>
      </div>

      {list.description && (
        <p className="text-[11px] mb-2" style={{ color: MUTED }}>{list.description}</p>
      )}

      <div className="rounded-xl overflow-hidden" style={{ border: `1px solid ${BORDER}` }}>
        {list.items.length === 0 && !canManage && (
          <p className="px-3 py-4 text-center text-[11px]" style={{ color: "#8AA4A7" }}>Nothing on this list yet.</p>
        )}

        {list.items.map((item, i) => (
          <ChecklistRow key={item.id} item={item} list={list} canManage={canManage} busy={busy}
            zebra={i % 2 === 1} onPatch={onPatchItem} onRemove={onRemoveItem} />
        ))}

        {canManage && (
          <div className="flex items-center gap-2 px-3 py-2" style={{ background: "#FBFDFD" }}>
            <span className="w-5 text-center text-gray-300">+</span>
            <input ref={addRef} value={draft} onChange={(e) => setDraft(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") submitAdd(); }}
              placeholder={list.track_response ? "Add a person…  (Enter)" : "Add an item…  (Enter)"}
              className="flex-1 text-sm bg-transparent focus:outline-none py-1" dir="auto" />
            {draft.trim() && (
              <button onClick={submitAdd} disabled={busy}
                className="px-3 py-1 rounded-lg text-[11px] font-bold text-white disabled:opacity-50"
                style={{ background: TEAL }}>Add</button>
            )}
          </div>
        )}
      </div>

      {/* What came of it. Written after the fact, which is why it sits below
          the rows rather than in the list's description. */}
      {(canManage || list.outcome) && (
        <div className="mt-2">
          <label className="block text-[10px] font-bold uppercase tracking-wider mb-1" style={{ color: MUTED }}>
            What we achieved
          </label>
          {canManage ? (
            <textarea value={outcome} onChange={(e) => setOutcome(e.target.value)}
              onBlur={() => { if (outcome !== (list.outcome || "")) onSaveOutcome(list, outcome.trim()); }}
              rows={2} placeholder="Outcome of this list — what got done, what is still open…"
              className="w-full px-2.5 py-1.5 border rounded-lg text-xs bg-white focus:ring-2 focus:ring-[#9CCBCB] focus:outline-none"
              style={{ borderColor: BORDER }} dir="auto" />
          ) : (
            <p className="text-xs whitespace-pre-wrap" style={{ color: "#334A4C" }} dir="auto">{list.outcome}</p>
          )}
        </div>
      )}
    </div>
  );
}

/* ── one row ──────────────────────────────────────────────────────────────── */

function ChecklistRow({ item, list, canManage, busy, zebra, onPatch, onRemove }) {
  const [label, setLabel] = useState(item.label);
  const [qty, setQty] = useState(item.quantity ?? "");
  const [notes, setNotes] = useState(item.notes ?? "");
  const [task, setTask] = useState(item.task ?? "");
  const [evaluation, setEvaluation] = useState(item.evaluation ?? "");

  /* The row is the server's copy; local state is only the in-progress typing.
   * Re-seeded during render when a new server object arrives — see the note on
   * ChecklistCard for why this is not an effect. */
  const [seen, setSeen] = useState(item);
  if (seen !== item) {
    setSeen(item);
    setLabel(item.label);
    setQty(item.quantity ?? "");
    setNotes(item.notes ?? "");
    setTask(item.task ?? "");
    setEvaluation(item.evaluation ?? "");
  }

  const commit = (field, value, current) => {
    if (String(value ?? "") === String(current ?? "")) return;   // nothing changed
    onPatch(item, { [field]: value === "" ? null : value });
  };

  const setResponse = (next) =>
    // Tapping the answer already showing clears it back to "waiting", so a
    // mis-tap is undone with the same button rather than needing a third one.
    onPatch(item, { response: item.response === next ? "pending" : next });

  const answered = item.response === "yes" || item.response === "no";

  return (
    <div className="flex items-start gap-2 px-3 py-2"
      style={{ background: zebra ? "#FAFCFC" : "#fff", borderTop: `1px solid ${BORDER}` }}>

      {/* Left control — a Reminders-style circle, or the RSVP pair. */}
      {list.track_response ? (
        <div className="flex items-center gap-1 pt-0.5 flex-shrink-0">
          <RsvpButton active={item.response === "yes"} disabled={!canManage || busy}
            onClick={() => setResponse("yes")} tone={GREEN} glyph="✓" title="Attending" />
          <RsvpButton active={item.response === "no"} disabled={!canManage || busy}
            onClick={() => setResponse("no")} tone={RED} glyph="✕" title="Not attending" />
        </div>
      ) : (
        <button type="button" disabled={!canManage || busy}
          onClick={() => onPatch(item, { done: !item.done })}
          className="w-5 h-5 mt-0.5 rounded-full flex items-center justify-center flex-shrink-0 transition-colors disabled:opacity-60"
          style={{
            border: `2px solid ${item.done ? GREEN : "#C3D0D0"}`,
            background: item.done ? GREEN : "transparent",
            color: "#fff", fontSize: 11,
          }}
          title={item.done ? "Done" : "Mark done"}>
          {item.done ? "✓" : ""}
        </button>
      )}

      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2 flex-wrap">
          <input value={label} disabled={!canManage}
            onChange={(e) => setLabel(e.target.value)}
            onBlur={() => commit("label", label.trim() || item.label, item.label)}
            onKeyDown={(e) => { if (e.key === "Enter") e.currentTarget.blur(); }}
            className="flex-1 min-w-[8rem] text-sm bg-transparent focus:outline-none disabled:cursor-default"
            style={{
              color: "#0A3A3E",
              // A "no" is struck through — the list stays readable at a glance
              // without hiding anyone who declined.
              textDecoration: item.response === "no" ? "line-through" : "none",
              opacity: item.response === "no" ? 0.6 : 1,
            }}
            dir="auto" />

          <input type="number" min={0} value={qty} disabled={!canManage}
            onChange={(e) => setQty(e.target.value)}
            onBlur={() => commit("quantity", qty === "" ? null : Number(qty), item.quantity)}
            placeholder="—"
            className="w-14 text-xs text-center rounded-lg border py-1 disabled:cursor-default"
            style={{ borderColor: BORDER, color: MUTED }}
            title="Number — seats, plates, guests brought along" />

          {canManage && (
            <button onClick={() => onRemove(item)} disabled={busy}
              className="text-gray-300 hover:text-red-500 text-xs px-1 flex-shrink-0">✕</button>
          )}
        </div>

        <input value={notes} disabled={!canManage}
          onChange={(e) => setNotes(e.target.value)}
          onBlur={() => commit("notes", notes.trim(), item.notes)}
          onKeyDown={(e) => { if (e.key === "Enter") e.currentTarget.blur(); }}
          placeholder={canManage ? "Notes / remarks…" : ""}
          className="w-full text-[11px] bg-transparent focus:outline-none mt-0.5 disabled:cursor-default"
          style={{ color: MUTED }} dir="auto" />

        {/* What this person is responsible for, and — once it has happened —
            how it went. The existing tick doubles as "task completed", so
            there is one control, not two competing ones. */}
        <div className="flex items-center gap-2 mt-1">
          {canManage && task.trim() && (
            <button type="button" onClick={() => onPatch(item, { done: !item.done })} disabled={busy}
              className="w-4 h-4 rounded flex items-center justify-center flex-shrink-0 text-[9px] transition-colors"
              style={{
                border: `1.5px solid ${item.done ? GREEN : "#C3D0D0"}`,
                background: item.done ? GREEN : "transparent", color: "#fff",
              }}
              title={item.done ? "Task done" : "Mark the task done"}>
              {item.done ? "✓" : ""}
            </button>
          )}
          <input value={task} disabled={!canManage}
            onChange={(e) => setTask(e.target.value)}
            onBlur={() => commit("task", task.trim(), item.task)}
            onKeyDown={(e) => { if (e.key === "Enter") e.currentTarget.blur(); }}
            placeholder={canManage ? "Task for them…" : ""}
            className="flex-1 text-[11px] bg-transparent focus:outline-none disabled:cursor-default"
            style={{
              color: item.done ? GREEN : TEAL,
              textDecoration: item.done ? "line-through" : "none",
            }}
            dir="auto" />
        </div>

        {(task.trim() || evaluation) && (
          <input value={evaluation} disabled={!canManage}
            onChange={(e) => setEvaluation(e.target.value)}
            onBlur={() => commit("evaluation", evaluation.trim(), item.evaluation)}
            onKeyDown={(e) => { if (e.key === "Enter") e.currentTarget.blur(); }}
            placeholder={canManage ? "How did it go? (evaluation)" : ""}
            className="w-full text-[11px] bg-transparent focus:outline-none disabled:cursor-default"
            style={{ color: "#8A6F10" }} dir="auto" />
        )}

        {list.track_response && !answered && (
          <span className="text-[10px]" style={{ color: "#B9A44A" }}>waiting for an answer</span>
        )}
      </div>
    </div>
  );
}

function RsvpButton({ active, disabled, onClick, tone, glyph, title }) {
  return (
    <button type="button" onClick={onClick} disabled={disabled} title={title}
      className="w-6 h-6 rounded-full flex items-center justify-center text-[11px] font-black transition-colors disabled:opacity-60"
      style={{
        border: `2px solid ${active ? tone : "#D6E0E0"}`,
        background: active ? tone : "transparent",
        color: active ? "#fff" : "#B6C4C4",
      }}>
      {glyph}
    </button>
  );
}

function Chip({ label, bg, fg }) {
  return (
    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold whitespace-nowrap"
      style={{ background: bg, color: fg }}>{label}</span>
  );
}
