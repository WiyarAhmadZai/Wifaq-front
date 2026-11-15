import {
  WEEKDAYS, SERIES_MONTHS, FREQUENCIES, NATURES,
  blankSeries, blankTaskTemplate, countOccurrences,
} from "./seriesUtils";

/**
 * Series editor (WEN-DEV-PLANNING-002.A §10.1).
 *
 * Turns one event/meeting card into a repeating bundle: a recurrence rule, the
 * tasks that fire around each occurrence (by day offset), how the budget is
 * counted, and which months of the annual plan it belongs to.
 *
 * The whole point is that a weekly routine is ONE card, not 52 rows: the
 * cascade expands it on approval.
 */

export default function SeriesEditor({ value, onChange, staff = [], planStart, planEnd, planType }) {
  const s = { ...blankSeries(), ...(value || {}) };
  const patch = (p) => onChange({ ...s, ...p });
  const patchRule = (p) => patch({ recurrence: { ...s.recurrence, ...p } });

  // Cheap enough to recompute each render, and memoizing a prop-derived object
  // here defeats the React compiler.
  const occurrences = s.is_series ? countOccurrences(s.recurrence, planStart, planEnd) : 0;

  const taskCount = occurrences * (s.task_templates?.length || 0);
  const budgetTotal =
    Number(s.budget_amount || 0) * (s.budget_aggregation === "single_total" ? occurrences : occurrences);

  const toggleDay = (code) => {
    const days = s.recurrence.byweekday || [];
    patchRule({ byweekday: days.includes(code) ? days.filter((d) => d !== code) : [...days, code] });
  };

  const toggleMonth = (m) => {
    const months = s.scheduled_months || [];
    patch({ scheduled_months: months.includes(m) ? months.filter((x) => x !== m) : [...months, m].sort((a, b) => a - b) });
  };

  const patchTemplate = (i, p) =>
    patch({ task_templates: s.task_templates.map((t, idx) => (idx === i ? { ...t, ...p } : t)) });

  const routine = s.nature === "routine";
  const setNature = (nature) => patch({ nature, is_series: nature === "routine" });

  return (
    <div className="mt-3 rounded-xl border border-gray-150 bg-gray-50/60 p-3">
      {/* Nature — the choice everything else hangs off */}
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-[10px] font-bold uppercase tracking-wide text-gray-400">Type</span>
        <div className="inline-flex rounded-lg border border-gray-200 bg-white p-0.5">
          {NATURES.map((n) => (
            <button
              key={n.value} type="button" onClick={() => setNature(n.value)}
              className={`px-3 py-1.5 rounded-md text-[11px] font-semibold transition-colors ${
                s.nature === n.value ? "bg-teal-600 text-white" : "text-gray-600 hover:text-gray-800"
              }`}
            >
              {n.value === "routine" ? "↻ " : "⚡ "}{n.label}
            </button>
          ))}
        </div>
        <span className="text-[11px] text-gray-500">
          {NATURES.find((n) => n.value === s.nature)?.hint}
        </span>
      </div>

      {!routine ? null : (
        <div className="mt-3 space-y-3">
          {/* ── Recurrence rule ─────────────────────────────────────────── */}
          <div className="bg-white rounded-lg border border-gray-150 p-3">
            <p className="text-[10px] font-bold uppercase tracking-wide text-gray-400 mb-2">How often</p>
            <div className="flex flex-wrap items-center gap-2">
              <select
                className="px-2 py-1.5 border border-gray-200 rounded-lg text-xs"
                value={s.recurrence.frequency}
                onChange={(e) => patchRule({ frequency: e.target.value })}
              >
                {FREQUENCIES.map((f) => <option key={f.value} value={f.value}>{f.label}</option>)}
              </select>

              {s.recurrence.frequency === "yearly" ? (
                <label className="flex items-center gap-1.5 text-[11px] text-gray-600">
                  on
                  <select
                    className="px-2 py-1.5 border border-gray-200 rounded-lg text-xs"
                    value={s.recurrence.bymonth || ""}
                    onChange={(e) => patchRule({ bymonth: e.target.value ? Number(e.target.value) : null })}
                  >
                    <option value="">month…</option>
                    {SERIES_MONTHS.map((name, i) => <option key={name} value={i + 1}>{name}</option>)}
                  </select>
                  <input
                    type="number" min="1" max="31"
                    className="w-16 px-2 py-1.5 border border-gray-200 rounded-lg text-xs"
                    value={s.recurrence.bymonthday || ""}
                    onChange={(e) => patchRule({ bymonthday: e.target.value ? Number(e.target.value) : null })}
                    placeholder="day"
                  />
                </label>
              ) : s.recurrence.frequency === "monthly" ? (
                <label className="flex items-center gap-1.5 text-[11px] text-gray-600">
                  on day
                  <input
                    type="number" min="1" max="31"
                    className="w-16 px-2 py-1.5 border border-gray-200 rounded-lg text-xs"
                    value={s.recurrence.bymonthday || ""}
                    onChange={(e) => patchRule({ bymonthday: e.target.value ? Number(e.target.value) : null })}
                    placeholder="15"
                  />
                </label>
              ) : (
                <div className="flex flex-wrap gap-1">
                  {WEEKDAYS.map((d) => {
                    const on = (s.recurrence.byweekday || []).includes(d.code);
                    return (
                      <button
                        key={d.code} type="button" onClick={() => toggleDay(d.code)}
                        className={`px-2 py-1 rounded-md text-[11px] font-semibold border transition-colors ${
                          on ? "bg-teal-600 text-white border-teal-600" : "bg-white text-gray-600 border-gray-200 hover:border-teal-300"
                        }`}
                      >
                        {d.label}
                      </button>
                    );
                  })}
                </div>
              )}

              <label className="flex items-center gap-1.5 text-[11px] text-gray-600">
                until
                <input
                  type="date"
                  className="px-2 py-1.5 border border-gray-200 rounded-lg text-xs"
                  value={s.recurrence.until || ""}
                  onChange={(e) => patchRule({ until: e.target.value })}
                />
              </label>
            </div>

            {/* How far ahead each copy is created */}
            <div className="flex flex-wrap items-center gap-2 mt-2 pt-2 border-t border-gray-100">
              <span className="text-[11px] text-gray-600">Create each one</span>
              <input
                type="number" min="0" max="30"
                className="w-16 px-2 py-1.5 border border-gray-200 rounded-lg text-xs"
                value={s.materialize_lead_days ?? 1}
                onChange={(e) => patch({ materialize_lead_days: Number(e.target.value) })}
              />
              <span className="text-[11px] text-gray-600">
                day(s) beforehand, and notify whoever runs it.
              </span>
            </div>

            <p className="text-[11px] mt-2">
              {occurrences > 0 ? (
                <span className="text-teal-700 font-semibold">
                  ≈ {occurrences} occurrence{occurrences === 1 ? "" : "s"} inside this plan
                  {taskCount > 0 && <> · {taskCount} task{taskCount === 1 ? "" : "s"}</>}
                </span>
              ) : (
                <span className="text-amber-600 font-semibold">
                  No occurrences fall inside the plan dates — check the repeat rule and the plan period.
                </span>
              )}
            </p>

            <p className="text-[11px] text-gray-500 mt-1.5 leading-relaxed">
              You only fill this in once. {s.materialize_lead_days === 0
                ? "On the day itself"
                : `${s.materialize_lead_days ?? 1} day(s) before each date`}, the system creates that
              occurrence, puts it at the top of the list marked <b>new</b>, and notifies you — so you can
              change the time, the person or the details for that one occasion before it happens.
            </p>
          </div>

          {/* ── Task templates ──────────────────────────────────────────── */}
          <div className="bg-white rounded-lg border border-gray-150 p-3">
            <p className="text-[10px] font-bold uppercase tracking-wide text-gray-400 mb-1">
              Tasks that fire with each occurrence
            </p>
            <p className="text-[11px] text-gray-500 mb-2">
              Offset is in days from the occurrence: <b>−1</b> = the day before (a Wednesday task for a
              Thursday session), <b>0</b> = the same day, <b>+1</b> = the day after.
            </p>

            {(s.task_templates || []).length === 0 && (
              <p className="text-[11px] text-gray-400 mb-2">No tasks yet.</p>
            )}

            <div className="space-y-2">
              {(s.task_templates || []).map((t, i) => (
                <div key={i} className="flex flex-wrap gap-2 items-center">
                  <input
                    className="flex-1 min-w-[160px] px-2.5 py-1.5 border border-gray-200 rounded-lg text-xs"
                    value={t.title}
                    onChange={(e) => patchTemplate(i, { title: e.target.value })}
                    placeholder="e.g. Invite guest"
                  />
                  <label className="flex items-center gap-1 text-[11px] text-gray-500">
                    offset
                    <input
                      type="number" min="-30" max="30"
                      className="w-16 px-2 py-1.5 border border-gray-200 rounded-lg text-xs"
                      value={t.offset_days}
                      onChange={(e) => patchTemplate(i, { offset_days: Number(e.target.value) })}
                    />
                    d
                  </label>
                  <select
                    className="min-w-[130px] px-2 py-1.5 border border-gray-200 rounded-lg text-xs"
                    value={t.assigned_staff_id || ""}
                    onChange={(e) => patchTemplate(i, { assigned_staff_id: e.target.value })}
                  >
                    <option value="">Series driver</option>
                    {staff.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
                  </select>
                  <button
                    type="button"
                    onClick={() => patch({ task_templates: s.task_templates.filter((_, j) => j !== i) })}
                    className="text-red-400 text-xs px-1"
                  >
                    ✕
                  </button>
                </div>
              ))}
            </div>

            <button
              type="button"
              onClick={() => patch({ task_templates: [...(s.task_templates || []), blankTaskTemplate()] })}
              className="mt-2 text-[11px] font-semibold text-teal-600 hover:text-teal-800"
            >
              + Add task
            </button>
          </div>

          {/* ── Budget ──────────────────────────────────────────────────── */}
          <div className="bg-white rounded-lg border border-gray-150 p-3">
            <p className="text-[10px] font-bold uppercase tracking-wide text-gray-400 mb-2">Budget</p>
            <div className="flex flex-wrap items-center gap-2">
              <input
                type="number" min="0"
                className="w-32 px-2.5 py-1.5 border border-gray-200 rounded-lg text-xs"
                value={s.budget_amount}
                onChange={(e) => patch({ budget_amount: e.target.value })}
                placeholder="500"
              />
              <select
                className="px-2 py-1.5 border border-gray-200 rounded-lg text-xs"
                value={s.budget_aggregation}
                onChange={(e) => patch({ budget_aggregation: e.target.value })}
              >
                <option value="per_occurrence">AFN per occurrence</option>
                <option value="single_total">AFN once, for the whole run</option>
              </select>
              {Number(s.budget_amount) > 0 && occurrences > 0 && (
                <span className="text-[11px] text-gray-500">
                  = {Number(budgetTotal).toLocaleString()} AFN total
                </span>
              )}
            </div>
          </div>

          {/* ── Months (annual plans only) ──────────────────────────────── */}
          {planType === "annual" && (
            <div className="bg-white rounded-lg border border-gray-150 p-3">
              <p className="text-[10px] font-bold uppercase tracking-wide text-gray-400 mb-1">
                Which months does this run in?
              </p>
              <p className="text-[11px] text-gray-500 mb-2">
                The system drafts each month&apos;s plan from these a few days before the month starts.
                Leave empty and it will not roll out automatically.
              </p>
              <div className="flex flex-wrap gap-1">
                {SERIES_MONTHS.map((name, idx) => {
                  const m = idx + 1;
                  const on = (s.scheduled_months || []).includes(m);
                  return (
                    <button
                      key={m} type="button" onClick={() => toggleMonth(m)}
                      className={`px-2 py-1 rounded-md text-[11px] font-semibold border transition-colors ${
                        on ? "bg-teal-600 text-white border-teal-600" : "bg-white text-gray-600 border-gray-200 hover:border-teal-300"
                      }`}
                    >
                      {name}
                    </button>
                  );
                })}
              </div>
              <button
                type="button"
                onClick={() => patch({ scheduled_months: s.scheduled_months?.length === 12 ? [] : [1,2,3,4,5,6,7,8,9,10,11,12] })}
                className="mt-2 text-[11px] font-semibold text-teal-600 hover:text-teal-800"
              >
                {s.scheduled_months?.length === 12 ? "Clear all" : "All year"}
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
