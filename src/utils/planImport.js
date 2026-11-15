// Maps rows parsed from an uploaded CSV/Excel file into the Plan form's
// section shapes (goals, events, meetings, tasks, purchase requests).
//
// One flat sheet drives everything via a `type` column:
//   goal | event | meeting | task | purchase
//
// Rows of the same goal title merge their measures; rows of the same purchase
// purpose merge their line items — so one file can generate many goals,
// events, meetings, tasks and multi-item purchase requests at once.

export const IMPORT_COLUMNS = [
  "type", "title", "dimension", "measure", "kr_type", "unit", "baseline", "target",
  "description", "start_date", "end_date", "start_time", "end_time", "location",
  "assignee", "participants", "priority",
  "item_name", "quantity", "unit_price", "category", "link",
];

const norm = (s) => String(s ?? "").trim();
const key = (s) => norm(s).toLowerCase();
const normHeader = (h) => key(h).replace(/[\s-]+/g, "_");

// Excel may hand back Date objects or serials; CSV gives strings. Coerce to
// YYYY-MM-DD when it looks like a date, otherwise pass the trimmed string.
function toDateStr(v) {
  if (v == null || v === "") return "";
  if (v instanceof Date && !isNaN(v)) return v.toISOString().slice(0, 10);
  const s = norm(v);
  const m = s.match(/^(\d{4})[-/](\d{1,2})[-/](\d{1,2})/);
  if (m) return `${m[1]}-${String(m[2]).padStart(2, "0")}-${String(m[3]).padStart(2, "0")}`;
  const d = s.match(/^(\d{1,2})[-/](\d{1,2})[-/](\d{4})/); // MM/DD/YYYY
  if (d) return `${d[3]}-${String(d[1]).padStart(2, "0")}-${String(d[2]).padStart(2, "0")}`;
  return s.slice(0, 10);
}

function toTimeStr(v) {
  if (v == null || v === "") return "";
  if (v instanceof Date && !isNaN(v)) return v.toTimeString().slice(0, 5);
  const m = norm(v).match(/(\d{1,2}):(\d{2})/);
  return m ? `${String(m[1]).padStart(2, "0")}:${m[2]}` : "";
}

const num = (v) => (norm(v) === "" ? "" : Number(v));

function normDimension(v) {
  const k = key(v).replace(/[\s-]+/g, "_");
  const allowed = ["cognitive", "character", "practical", "social_structural"];
  return allowed.includes(k) ? k : "cognitive";
}
function normTaskType(v) {
  const k = key(v);
  if (["urgent", "high", "normal", "low"].includes(k)) return k;
  if (k === "medium") return "normal";
  return "normal";
}
function normPriority(v) {
  const k = key(v);
  if (["low", "medium", "high"].includes(k)) return k;
  if (k === "urgent") return "high";
  if (k === "normal") return "medium";
  return "medium";
}
function normMeetingType(v) {
  return key(v) === "emergency" ? "emergency" : "routine";
}
function normKrType(v) {
  const k = key(v);
  return ["percentage", "count", "currency", "binary"].includes(k) ? k : "percentage";
}

/**
 * @param {Array<Object>} rawRows  rows from xlsx sheet_to_json (header keys)
 * @param {Object} opts  { staff: [{id,name}], uid: () => string }
 * @returns {{objectives, events, meetings, tasks, purchases, summary, errors}}
 */
export function buildPlanFromRows(rawRows, { staff = [], uid = () => Math.random().toString(36).slice(2) } = {}) {
  const staffByName = new Map(staff.map((s) => [key(s.name), s.id]));
  const findStaff = (name) => staffByName.get(key(name)) ?? "";
  const findStaffMany = (csv) =>
    norm(csv).split(/[;,]/).map((n) => findStaff(n)).filter((x) => x !== "");

  // Normalise headers once.
  const rows = rawRows.map((r) => {
    const o = {};
    for (const k of Object.keys(r)) o[normHeader(k)] = r[k];
    return o;
  });

  const objByTitle = new Map();   // goal title → objective
  const events = [], meetings = [], tasks = [];
  const purByPurpose = new Map(); // purpose → purchase
  const errors = [];

  rows.forEach((r, i) => {
    const type = key(r.type);
    const title = norm(r.title);
    const line = i + 2; // +1 header, +1 to 1-index

    if (!type) return; // blank row
    if (!title && type !== "purchase") { errors.push(`Row ${line}: missing title`); return; }

    if (type === "goal") {
      let obj = objByTitle.get(key(title));
      if (!obj) {
        obj = { statement: title, primary_4d_dimension: normDimension(r.dimension), key_results: [] };
        objByTitle.set(key(title), obj);
      }
      if (norm(r.measure)) {
        obj.key_results.push({
          statement: norm(r.measure), kr_type: normKrType(r.kr_type),
          baseline: num(r.baseline), target: num(r.target), unit: norm(r.unit),
          current_value: "", confidence_score: "",
        });
      }
    } else if (type === "event") {
      events.push({
        uid: uid(), title, description: norm(r.description),
        start_date: toDateStr(r.start_date), end_date: toDateStr(r.end_date),
        location: norm(r.location), responsible_staff_id: findStaff(r.assignee),
      });
    } else if (type === "meeting") {
      meetings.push({
        uid: uid(), title, description: norm(r.description),
        meeting_date: toDateStr(r.start_date),
        start_time: toTimeStr(r.start_time) || "09:00",
        end_time: toTimeStr(r.end_time) || "10:00",
        location: norm(r.location), meeting_type: normMeetingType(r.priority || r.type),
        participant_staff_ids: findStaffMany(r.participants),
      });
    } else if (type === "task") {
      tasks.push({
        uid: uid(), title, task_type: normTaskType(r.priority),
        // "Ali, Sara" in the assignee column assigns the task to both.
        assigned_staff_ids: findStaffMany(r.assignee),
        start_date: toDateStr(r.start_date), deadline: toDateStr(r.end_date),
        notes: norm(r.description),
      });
    } else if (type === "purchase") {
      const purpose = title || norm(r.item_name) || "Purchase request";
      let pr = purByPurpose.get(key(purpose));
      if (!pr) {
        pr = {
          uid: uid(), request_date: toDateStr(r.start_date) || "",
          priority: normPriority(r.priority), purpose, notes: norm(r.description),
          link: norm(r.link), items: [],
        };
        purByPurpose.set(key(purpose), pr);
      }
      if (norm(r.item_name)) {
        pr.items.push({
          item_name: norm(r.item_name), description: "",
          quantity: num(r.quantity) || 1, unit: norm(r.unit) || "piece",
          estimated_unit_price: num(r.unit_price) || 0,
          chart_account_id: null, stock_id: null,
        });
      }
    } else {
      errors.push(`Row ${line}: unknown type "${r.type}"`);
    }
  });

  const objectives = [...objByTitle.values()].map((o) =>
    o.key_results.length ? o : { ...o, key_results: [{ statement: "", kr_type: "percentage", baseline: "", target: "", unit: "", current_value: "", confidence_score: "" }] }
  );
  const purchases = [...purByPurpose.values()].map((p) =>
    p.items.length ? p : { ...p, items: [{ item_name: "", description: "", quantity: 1, unit: "piece", estimated_unit_price: 0, chart_account_id: null, stock_id: null }] }
  );

  // Resolve purchase → event/meeting link by matching the `link` title.
  const linkByTitle = new Map();
  events.forEach((e) => e.title && linkByTitle.set(key(e.title), `event:${e.uid}`));
  meetings.forEach((m) => m.title && linkByTitle.set(key(m.title), `meeting:${m.uid}`));
  purchases.forEach((p) => { p.link = p.link ? (linkByTitle.get(key(p.link)) || "") : ""; });

  const summary = {
    goals: objectives.length, events: events.length, meetings: meetings.length,
    tasks: tasks.length, purchases: purchases.length,
  };
  return { objectives, events, meetings, tasks, purchases, summary, errors };
}

// A ready-to-fill CSV template the user can download, fill in, and re-upload.
export function importTemplateCsv() {
  const header = IMPORT_COLUMNS.join(",");
  const sample = [
    ["goal", "Improve reading fluency", "cognitive", "85% pass the fluency test", "percentage", "%", "40", "85", "", "", "", "", "", "", "", "", "", "", "", "", "", ""],
    ["goal", "Improve reading fluency", "cognitive", "Average words/min reaches 120", "count", "wpm", "80", "120", "", "", "", "", "", "", "", "", "", "", "", "", "", ""],
    ["event", "Science Fair", "", "", "", "", "", "", "Annual exhibition", "2026-07-10", "2026-07-10", "", "", "Main Hall", "", "", "", "", "", "", "", ""],
    ["meeting", "Term kickoff", "", "", "", "", "", "", "Plan the term", "2026-07-01", "", "09:00", "10:30", "Room 2", "", "Ahmad Karimi; Sara Noor", "routine", "", "", "", "", ""],
    ["task", "Prepare lesson plans", "", "", "", "", "", "", "Grade 9 math", "2026-07-02", "2026-07-09", "", "", "", "Ahmad Karimi", "", "high", "", "", "", "", ""],
    ["purchase", "Supplies for Science Fair", "", "", "", "", "", "", "Banners and stands", "2026-07-05", "", "", "", "", "", "", "high", "Banner", "2", "500", "", "Science Fair"],
    ["purchase", "Supplies for Science Fair", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "Display stand", "3", "1200", "", "Science Fair"],
  ].map((r) => r.map((c) => (/[",\n]/.test(c) ? `"${c.replace(/"/g, '""')}"` : c)).join(","));
  return [header, ...sample].join("\n");
}
