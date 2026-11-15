/**
 * Shared helpers for the series editor (WEN-DEV-PLANNING-002.A §10.1).
 *
 * Kept out of SeriesEditor.jsx so that file only exports a component — mixing
 * the two breaks React Fast Refresh.
 */

// Afghan school week starts Saturday.
export const WEEKDAYS = [
  { code: "sat", label: "Sat" },
  { code: "sun", label: "Sun" },
  { code: "mon", label: "Mon" },
  { code: "tue", label: "Tue" },
  { code: "wed", label: "Wed" },
  { code: "thu", label: "Thu" },
  { code: "fri", label: "Fri" },
];

export const SERIES_MONTHS = [
  "Hamal", "Sawr", "Jawza", "Saratan", "Asad", "Sonbola",
  "Mizan", "Aqrab", "Qaws", "Jadi", "Dalwa", "Hut",
];

export const blankTaskTemplate = () => ({
  title: "",
  offset_days: 0,
  assigned_staff_id: "",
});

export const FREQUENCIES = [
  { value: "daily", label: "Daily" },
  { value: "weekly", label: "Weekly" },
  { value: "monthly", label: "Monthly" },
  { value: "yearly", label: "Yearly" },
];

/**
 * Nature of a plan item.
 *  routine   — repeats on a rule; the system creates each occurrence a day
 *              before it is due and notifies whoever has to run it.
 *  emergency — a one-off. Happens once, on its own date.
 */
export const NATURES = [
  { value: "emergency", label: "One-off / Emergency", hint: "Happens once, on the date you set." },
  { value: "routine", label: "Routine", hint: "Repeats on a schedule — each occurrence is created for you a day ahead." },
];

export const blankSeries = () => ({
  nature: "emergency",
  is_series: false,
  recurrence: { frequency: "weekly", byweekday: ["thu"], until: "" },
  materialize_lead_days: 1,
  task_templates: [],
  budget_amount: "",
  budget_aggregation: "per_occurrence",
  scheduled_months: [],
});

/**
 * Count occurrences the way the backend's RecurrenceExpander does, so the
 * "≈ 17 occurrences" preview matches what approval will actually generate.
 * Display only — the server recomputes it authoritatively on cascade.
 */
export function countOccurrences(recurrence, startDate, endDate) {
  if (!recurrence?.frequency || !startDate) return 0;

  const start = new Date(startDate);
  const hardEnd = recurrence.until && recurrence.until < endDate ? recurrence.until : endDate;
  if (!hardEnd) return 0;
  const end = new Date(hardEnd);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || end < start) return 0;

  // JS getDay(): 0=Sun … 6=Sat — the same numbering the backend maps onto.
  const dowMap = { sun: 0, mon: 1, tue: 2, wed: 3, thu: 4, fri: 5, sat: 6 };
  const allowed = (recurrence.byweekday || []).map((d) => dowMap[d]).filter((d) => d !== undefined);

  let n = 0;
  const cursor = new Date(start);
  // Same runaway guard as the server.
  while (cursor <= end && n < 400) {
    if (recurrence.frequency === "yearly") {
      if (
        cursor.getDate() === Number(recurrence.bymonthday || start.getDate()) &&
        cursor.getMonth() + 1 === Number(recurrence.bymonth || start.getMonth() + 1)
      ) n++;
    } else if (recurrence.frequency === "monthly") {
      if (cursor.getDate() === Number(recurrence.bymonthday || start.getDate())) n++;
    } else if (allowed.length === 0 || allowed.includes(cursor.getDay())) {
      n++;
    }
    cursor.setDate(cursor.getDate() + 1);
  }

  return recurrence.count ? Math.min(n, Number(recurrence.count)) : n;
}

/**
 * Fold a card's series settings into the plan_item payload. A non-repeating
 * card sends is_series:false and nothing else, so it stays a plain single item.
 */
export const seriesPayload = (series) => {
  const routine = series?.nature === "routine";
  if (!routine) return { nature: "emergency", is_series: false };

  return {
    nature: "routine",
    is_series: true,
    materialize_lead_days: Number(series.materialize_lead_days ?? 1),
    recurrence: {
      frequency: series.recurrence?.frequency || "weekly",
      byweekday: series.recurrence?.byweekday?.length ? series.recurrence.byweekday : undefined,
      bymonthday: series.recurrence?.bymonthday || undefined,
      bymonth: series.recurrence?.bymonth || undefined,
      until: series.recurrence?.until || undefined,
    },
    budget_amount: series.budget_amount === "" ? null : Number(series.budget_amount),
    budget_aggregation: series.budget_aggregation || "per_occurrence",
    scheduled_months: series.scheduled_months?.length ? series.scheduled_months : null,
    task_templates: (series.task_templates || [])
      .filter((t) => t.title?.trim())
      .map((t) => ({
        title: t.title,
        offset_days: Number(t.offset_days) || 0,
        assigned_staff_id: t.assigned_staff_id || null,
      })),
  };
};

/** Rebuild the editor state from a saved plan_item. */
export const seriesFromItem = (item) => ({
  ...blankSeries(),
  nature: item.nature || (item.is_series ? "routine" : "emergency"),
  is_series: !!item.is_series,
  materialize_lead_days: item.materialize_lead_days ?? 1,
  recurrence: item.recurrence
    ? { frequency: "weekly", byweekday: [], until: "", ...item.recurrence }
    : blankSeries().recurrence,
  budget_amount: item.budget_amount ?? "",
  budget_aggregation: item.budget_aggregation || "per_occurrence",
  scheduled_months: item.scheduled_months || [],
  task_templates: (item.task_templates || []).map((t) => ({
    title: t.title || "",
    offset_days: t.offset_days ?? 0,
    assigned_staff_id: t.assigned_staff_id || "",
  })),
});
