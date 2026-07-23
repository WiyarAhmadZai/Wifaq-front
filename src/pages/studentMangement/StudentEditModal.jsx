import { useEffect, useMemo, useState } from "react";
import Swal from "sweetalert2";
import { FiX, FiUser, FiBookOpen, FiTruck, FiUsers, FiDollarSign } from "react-icons/fi";
import { get, put, post } from "../../api/axios";

/**
 * All-in-one student editor. Opens as a modal (the user stays on the enrolled
 * list) and lets an admin update EVERYTHING about a student in one place:
 *  - Student core data (Phase 1)
 *  - Education history, health, transport & uniform (Phase 2 steps)
 *  - Family information
 *
 * Persists to two endpoints in one save:
 *  - PUT /student-management/students/update/{id}   (all student fields)
 *  - PUT /student-management/families/update/{id}    (family fields)
 */

const TABS = [
  { id: "student", label: "Student", icon: FiUser },
  { id: "fees", label: "Fees", icon: FiDollarSign },
  { id: "education", label: "Education & Health", icon: FiBookOpen },
  { id: "transport", label: "Transport & Uniform", icon: FiTruck },
  { id: "family", label: "Family", icon: FiUsers },
];

// Only these student keys are accepted by the update endpoint — whitelisting
// keeps computed/immutable fields (student_id, fees, family_id…) out of the payload.
const STUDENT_FIELDS = [
  "first_name", "last_name", "date_of_birth", "gender", "school_class_id", "grade_id",
  "enrollment_date", "enrollment_type", "status", "special_status",
  "discount_percent", "child_order_in_family",
  "previous_school_name", "school_type", "last_class_completed", "last_years_result",
  "result_percentage", "reason_for_change", "how_did_you_hear", "introducer_name",
  "introducer_contact", "motivation_to_join",
  "has_special_health_condition", "has_special_needs", "health_details",
  "transportation_required", "transport_route_id", "transport_vehicle_id",
  "transport_pickup_point", "transport_pickup_time", "transport_dropoff_point",
  "transport_monthly_fee",
  "uniform_required", "need_uniform", "uniform_price", "uniform_chest", "uniform_waist",
  "uniform_height", "uniform_shoulder", "uniform_sleeve", "tailor_note",
  "employee_parent_staff_id", "parental_consent",
  "transfer_case_status", "transfer_additional_notes",
];

const FAMILY_FIELDS = [
  "father_name", "father_name_en", "grandfather_name", "grandfather_name_en",
  "mother_name", "father_phone", "mother_phone", "email", "father_occupation",
  "father_education_level", "mother_education_level", "mother_tongue",
  "monthly_income_usd", "number_of_family_members", "number_of_dependents",
  "income_category", "permanent_province", "permanent_district", "permanent_village",
  "temporary_province", "temporary_district", "temporary_village", "address",
];

const BOOL_FIELDS = new Set([
  "has_special_health_condition", "has_special_needs",
  "transportation_required", "need_uniform", "uniform_required", "parental_consent",
]);

const GENDER = [{ v: "male", l: "Male" }, { v: "female", l: "Female" }];
const ENROLLMENT_TYPE = [{ v: "new", l: "New" }, { v: "transfer", l: "Transfer" }];
const STATUS = ["pending", "active", "graduated", "withdrawn", "transferred"].map((v) => ({ v, l: v[0].toUpperCase() + v.slice(1) }));
const SPECIAL_STATUS = [
  { v: "none", l: "None" }, { v: "orphan", l: "Orphan" },
  { v: "employee_child", l: "Employee child" }, { v: "fourth_child", l: "Fourth child" },
];
const DISCOUNTS = [0, 15, 20, 25, 30, 35, 40, 45, 50].map((v) => ({ v, l: `${v}%` }));
const INCOME_CAT = ["A", "B", "C", "D"].map((v) => ({ v, l: v }));
const TRANSFER_STATUS = [
  { v: "pending", l: "Pending" }, { v: "in_progress", l: "In progress" }, { v: "completed", l: "Completed" },
];

export default function StudentEditModal({ studentId, onClose, onSaved }) {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [tab, setTab] = useState("student");
  const [student, setStudent] = useState({});
  const [family, setFamily] = useState(null);
  const [familyId, setFamilyId] = useState(null);
  const [classes, setClasses] = useState([]);
  const [grades, setGrades] = useState([]);
  const [employeeParents, setEmployeeParents] = useState([]);
  const [routes, setRoutes] = useState([]);
  const [vehicles, setVehicles] = useState([]);
  // Live fee preview returned by the server whenever a fee-driving field changes.
  const [feePreview, setFeePreview] = useState(null);
  const [feeBusy, setFeeBusy] = useState(false);

  // Load the full student record (+ family) and reference lists. Classes and
  // employee parents come from the students form-data endpoint (gated by the
  // student permission the caller already holds) — NOT the class-management
  // endpoint, which needs a separate classes.view permission.
  useEffect(() => {
    let alive = true;
    setLoading(true);
    (async () => {
      try {
        const [sRes, fRes, rRes, gRes] = await Promise.all([
          get(`/student-management/students/show/${studentId}`),
          get("/student-management/students/form-data").catch(() => ({ data: {} })),
          get("/transportation/routes/active/list").catch(() => ({ data: [] })),
          get("/grades/list").catch(() => ({ data: [] })),
        ]);
        if (!alive) return;
        const data = sRes.data?.data || sRes.data || {};
        // Fall back to the grade behind the assigned class when the student has
        // no direct grade yet, so the dropdown shows the real placement.
        if (!data.grade_id && data.school_class?.grade_id) {
          data.grade_id = data.school_class.grade_id;
        }
        setStudent(data);
        setFamily(data.family || null);
        setFamilyId(data.family?.id || data.family_id || null);
        setGrades((gRes.data?.data || gRes.data || []).map((g) => ({ value: g.id, label: g.name })));

        // Build the class options and ALWAYS include the student's current class
        // (the form-data list hides full / other-term classes, so the student's
        // own class may be absent — seed it so the value always renders).
        const listClasses = (fRes.data?.classes || []).map((c) => ({ value: c.id, label: c.class_name }));
        const current = data.school_class;
        if (current?.id && !listClasses.some((c) => c.value === current.id)) {
          listClasses.unshift({ value: current.id, label: current.class_name });
        }
        setClasses(listClasses);
        setEmployeeParents((fRes.data?.employee_parents || []).map((s) => ({ value: s.id, label: s.name })));
        setRoutes((rRes.data?.data || rRes.data || []).map((r) => ({ value: r.id, label: r.name || r.route_name || `Route #${r.id}` })));
      } catch (e) {
        Swal.fire("Error", e.response?.data?.message || "Failed to load student data", "error");
        onClose();
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => { alive = false; };
  }, [studentId, onClose]);

  // Vehicles depend on the chosen route.
  useEffect(() => {
    const rid = student.transport_route_id;
    if (!rid) { setVehicles([]); return; }
    get(`/transportation/vehicles/by-route/${rid}`)
      .then((res) => setVehicles((res.data?.data || res.data || []).map((v) => ({ value: v.id, label: v.name || v.plate_number || v.vehicle_number || `Vehicle #${v.id}` }))))
      .catch(() => setVehicles([]));
  }, [student.transport_route_id]);

  const setS = (key, value) => setStudent((prev) => ({ ...prev, [key]: value }));

  // Live fee preview. The server is the single source of truth for fee maths
  // (grade base fee → special status → discount), so we ask it whenever a
  // fee-driving field changes instead of duplicating the rules in the client.
  useEffect(() => {
    if (loading) return;
    const hasBasis = student.grade_id || student.school_class_id;
    if (!hasBasis) { setFeePreview(null); return; }

    const t = setTimeout(async () => {
      setFeeBusy(true);
      try {
        const res = await post("/student-management/students/preview-fee", {
          grade_id: student.grade_id || null,
          school_class_id: student.school_class_id || null,
          special_status: student.special_status || "none",
          employee_parent_staff_id: student.employee_parent_staff_id || null,
          discount_percent: Number(student.discount_percent) || 0,
          child_order_in_family: student.child_order_in_family || null,
          family_id: familyId || null,
        });
        setFeePreview(res.data?.data || null);
      } catch {
        setFeePreview(null);
      } finally {
        setFeeBusy(false);
      }
    }, 300);
    return () => clearTimeout(t);
  }, [
    loading, familyId,
    student.grade_id, student.school_class_id, student.special_status,
    student.employee_parent_staff_id, student.discount_percent, student.child_order_in_family,
  ]);
  const setF = (key, value) => setFamily((prev) => ({ ...(prev || {}), [key]: value }));

  const title = useMemo(
    () => `${student.first_name || ""} ${student.last_name || ""}`.trim() || "Student",
    [student.first_name, student.last_name],
  );

  const buildPayload = (source, fields) => {
    const out = {};
    for (const k of fields) {
      let v = source?.[k];
      if (BOOL_FIELDS.has(k)) { out[k] = Boolean(v); continue; }
      if (v === "" || v === undefined) v = null;
      out[k] = v;
    }
    return out;
  };

  const save = async () => {
    setSaving(true);
    try {
      await put(`/student-management/students/update/${studentId}`, buildPayload(student, STUDENT_FIELDS));
      if (familyId && family) {
        await put(`/student-management/families/update/${familyId}`, buildPayload(family, FAMILY_FIELDS));
      }
      Swal.fire({ toast: true, position: "top-end", icon: "success", title: "Student updated", timer: 1800, showConfirmButton: false });
      onSaved?.();
      onClose();
    } catch (e) {
      const errors = e.response?.data?.errors;
      const first = errors ? Object.values(errors)[0]?.[0] : null;
      Swal.fire("Error", first || e.response?.data?.message || "Failed to save changes", "error");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/50 backdrop-blur-[2px] p-3 sm:p-6" onClick={onClose}>
      <div
        className="w-full max-w-5xl h-[90vh] bg-white rounded-2xl shadow-2xl flex flex-col overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header — teal band, matches the rest of the app */}
        <div className="flex items-start justify-between gap-4 px-6 py-4 bg-[#0D5C63] flex-shrink-0">
          <div className="min-w-0">
            <h2 className="text-base font-bold text-white truncate">{title}</h2>
            <p className="text-[11px] text-teal-100 mt-0.5">
              {student.student_id ? `${student.student_id} · ` : ""}Update every detail — student, fees, enrollment steps and family.
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-white/80 hover:text-white rounded-lg hover:bg-white/15 flex-shrink-0 transition-colors"
          >
            <FiX className="w-5 h-5" />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 px-4 border-b border-gray-200 bg-gray-50 overflow-x-auto flex-shrink-0">
          {TABS.map((t) => {
            const Icon = t.icon;
            const active = tab === t.id;
            return (
              <button
                key={t.id}
                onClick={() => setTab(t.id)}
                className={`flex items-center gap-1.5 px-4 py-3 text-xs font-semibold whitespace-nowrap border-b-2 transition-colors ${
                  active
                    ? "text-teal-700 border-teal-600 bg-white"
                    : "text-gray-500 border-transparent hover:text-gray-700 hover:bg-gray-100"
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                {t.label}
              </button>
            );
          })}
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-6 py-5 bg-gray-50/50">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-24 gap-3">
              <div className="animate-spin rounded-full h-8 w-8 border-4 border-teal-100 border-t-teal-600" />
              <span className="text-xs text-gray-400">Loading student…</span>
            </div>
          ) : (
            <>
              {tab === "student" && (
                <>
                  <Card title="Identity">
                    <Grid>
                      <ReadOnly label="Student ID" value={student.student_id} />
                      <ReadOnly label="Academic term" value={student.academic_term?.name} />
                      <Text label="First name" value={student.first_name} onChange={(v) => setS("first_name", v)} />
                      <Text label="Last name" value={student.last_name} onChange={(v) => setS("last_name", v)} />
                      <DateField label="Date of birth" value={student.date_of_birth} onChange={(v) => setS("date_of_birth", v)} />
                      <Select label="Gender" value={student.gender} options={GENDER} onChange={(v) => setS("gender", v)} />
                    </Grid>
                  </Card>

                  <Card title="Placement">
                    <Grid>
                      <Select
                        label="Grade"
                        value={student.grade_id}
                        options={grades.map((g) => ({ v: g.value, l: g.label }))}
                        onChange={(v) => setS("grade_id", v ? Number(v) : null)}
                        hint="Drives the monthly base fee"
                      />
                      <Select
                        label="Class"
                        value={student.school_class_id}
                        options={classes.map((c) => ({ v: c.value, l: c.label }))}
                        onChange={(v) => setS("school_class_id", v ? Number(v) : null)}
                        hint={classes.length === 0 ? "No classes created yet" : undefined}
                        disabled={classes.length === 0}
                      />
                      <Select label="Enrollment type" value={student.enrollment_type} options={ENROLLMENT_TYPE} onChange={(v) => setS("enrollment_type", v)} />
                      <Select label="Status" value={student.status} options={STATUS} onChange={(v) => setS("status", v)} />
                      <DateField label="Enrollment date" value={student.enrollment_date} onChange={(v) => setS("enrollment_date", v)} />
                      <NumberField label="Child order in family" value={student.child_order_in_family} onChange={(v) => setS("child_order_in_family", v)} />
                    </Grid>
                    <div className="mt-3 pt-3 border-t border-gray-100">
                      <Check label="Parental consent given" checked={student.parental_consent} onChange={(v) => setS("parental_consent", v)} />
                    </div>
                  </Card>
                </>
              )}

              {tab === "fees" && (
                <>
                  <Card title="Fee basis">
                    <Grid>
                      <Select
                        label="Grade"
                        value={student.grade_id}
                        options={grades.map((g) => ({ v: g.value, l: g.label }))}
                        onChange={(v) => setS("grade_id", v ? Number(v) : null)}
                        hint="Base fee comes from the grade"
                      />
                      <Select label="Discount %" value={student.discount_percent} options={DISCOUNTS} onChange={(v) => setS("discount_percent", v === "" ? null : Number(v))} />
                      <Select label="Special status" value={student.special_status} options={SPECIAL_STATUS} onChange={(v) => setS("special_status", v)} />
                      <Select
                        label="Employee parent (staff)"
                        value={student.employee_parent_staff_id}
                        options={employeeParents.map((s) => ({ v: s.value, l: s.label }))}
                        onChange={(v) => setS("employee_parent_staff_id", v ? Number(v) : null)}
                        hint="Only for 'Employee child'"
                      />
                    </Grid>
                  </Card>

                  <Card title="Monthly fee" subtitle="Calculated on the server — saved when you press Save changes">
                    <FeeSummary
                      preview={feePreview}
                      busy={feeBusy}
                      current={{
                        base_fee: student.base_fee,
                        discount_amount: student.discount_amount,
                        final_fee: student.final_fee,
                      }}
                      hasBasis={Boolean(student.grade_id || student.school_class_id)}
                    />
                  </Card>
                </>
              )}

              {tab === "education" && (
                <Card title="Education history & health">
                  <Grid>
                    <Text label="Previous school" value={student.previous_school_name} onChange={(v) => setS("previous_school_name", v)} />
                    <Text label="School type" value={student.school_type} onChange={(v) => setS("school_type", v)} />
                    <Text label="Last class completed" value={student.last_class_completed} onChange={(v) => setS("last_class_completed", v)} />
                    <Text label="Last year's result" value={student.last_years_result} onChange={(v) => setS("last_years_result", v)} />
                    <Text label="Result %" value={student.result_percentage} onChange={(v) => setS("result_percentage", v)} />
                    <Text label="How did you hear?" value={student.how_did_you_hear} onChange={(v) => setS("how_did_you_hear", v)} />
                    <Text label="Introducer name" value={student.introducer_name} onChange={(v) => setS("introducer_name", v)} />
                    <Text label="Introducer contact" value={student.introducer_contact} onChange={(v) => setS("introducer_contact", v)} />
                    <Select label="Transfer case status" value={student.transfer_case_status} options={TRANSFER_STATUS} onChange={(v) => setS("transfer_case_status", v)} />
                  </Grid>
                  <TextArea label="Reason for change" value={student.reason_for_change} onChange={(v) => setS("reason_for_change", v)} />
                  <TextArea label="Motivation to join" value={student.motivation_to_join} onChange={(v) => setS("motivation_to_join", v)} />
                  <TextArea label="Transfer notes" value={student.transfer_additional_notes} onChange={(v) => setS("transfer_additional_notes", v)} />

                  <SectionTitle>Health</SectionTitle>
                  <div className="flex flex-wrap gap-5 mb-3">
                    <Check label="Has special health condition" checked={student.has_special_health_condition} onChange={(v) => setS("has_special_health_condition", v)} />
                    <Check label="Has special needs" checked={student.has_special_needs} onChange={(v) => setS("has_special_needs", v)} />
                  </div>
                  <TextArea label="Health details" value={student.health_details} onChange={(v) => setS("health_details", v)} />
                </Card>
              )}

              {tab === "transport" && (
                <Card title="Transport & uniform">
                  <Check label="Transportation required" checked={student.transportation_required} onChange={(v) => setS("transportation_required", v)} />
                  <Grid>
                    <Select label="Route" value={student.transport_route_id} options={routes.map((r) => ({ v: r.value, l: r.label }))} onChange={(v) => { setS("transport_route_id", v ? Number(v) : null); setS("transport_vehicle_id", null); }} />
                    <Select label="Vehicle" value={student.transport_vehicle_id} options={vehicles.map((v) => ({ v: v.value, l: v.label }))} onChange={(v) => setS("transport_vehicle_id", v ? Number(v) : null)} />
                    <Text label="Pickup point" value={student.transport_pickup_point} onChange={(v) => setS("transport_pickup_point", v)} />
                    <Text label="Pickup time" value={student.transport_pickup_time} onChange={(v) => setS("transport_pickup_time", v)} placeholder="e.g. 07:30" />
                    <Text label="Dropoff point" value={student.transport_dropoff_point} onChange={(v) => setS("transport_dropoff_point", v)} />
                    <NumberField label="Transport monthly fee" value={student.transport_monthly_fee} onChange={(v) => setS("transport_monthly_fee", v)} />
                  </Grid>

                  <SectionTitle>Uniform</SectionTitle>
                  <div className="flex flex-wrap gap-5 mb-1">
                    <Check label="Uniform required (registration)" checked={student.uniform_required} onChange={(v) => setS("uniform_required", v)} />
                    <Check label="Needs uniform (sizing)" checked={student.need_uniform} onChange={(v) => setS("need_uniform", v)} />
                  </div>
                  <Grid>
                    <NumberField label="Uniform price" value={student.uniform_price} onChange={(v) => setS("uniform_price", v)} />
                    <Text label="Chest" value={student.uniform_chest} onChange={(v) => setS("uniform_chest", v)} />
                    <Text label="Waist" value={student.uniform_waist} onChange={(v) => setS("uniform_waist", v)} />
                    <Text label="Height" value={student.uniform_height} onChange={(v) => setS("uniform_height", v)} />
                    <Text label="Shoulder" value={student.uniform_shoulder} onChange={(v) => setS("uniform_shoulder", v)} />
                    <Text label="Sleeve" value={student.uniform_sleeve} onChange={(v) => setS("uniform_sleeve", v)} />
                  </Grid>
                  <TextArea label="Tailor note" value={student.tailor_note} onChange={(v) => setS("tailor_note", v)} />
                </Card>
              )}

              {tab === "family" && (
                !family ? (
                  <Card title="Family">
                    <p className="text-sm text-gray-400 py-8 text-center">No family record linked to this student.</p>
                  </Card>
                ) : (
                  <Card title="Parents">
                    <Grid>
                      <Text label="Father name" value={family.father_name} onChange={(v) => setF("father_name", v)} required />
                      <Text label="Father name (EN)" value={family.father_name_en} onChange={(v) => setF("father_name_en", v)} />
                      <Text label="Grandfather name" value={family.grandfather_name} onChange={(v) => setF("grandfather_name", v)} />
                      <Text label="Mother name" value={family.mother_name} onChange={(v) => setF("mother_name", v)} required />
                      <Text label="Father phone" value={family.father_phone} onChange={(v) => setF("father_phone", v)} />
                      <Text label="Mother phone" value={family.mother_phone} onChange={(v) => setF("mother_phone", v)} />
                      <Text label="Email" value={family.email} onChange={(v) => setF("email", v)} />
                      <Text label="Father occupation" value={family.father_occupation} onChange={(v) => setF("father_occupation", v)} />
                      <Text label="Father education" value={family.father_education_level} onChange={(v) => setF("father_education_level", v)} />
                      <Text label="Mother education" value={family.mother_education_level} onChange={(v) => setF("mother_education_level", v)} />
                      <Text label="Mother tongue" value={family.mother_tongue} onChange={(v) => setF("mother_tongue", v)} />
                    </Grid>

                    <SectionTitle>Economic</SectionTitle>
                    <Grid>
                      <NumberField label="Monthly income (USD)" value={family.monthly_income_usd} onChange={(v) => setF("monthly_income_usd", v)} />
                      <NumberField label="Family members" value={family.number_of_family_members} onChange={(v) => setF("number_of_family_members", v)} />
                      <NumberField label="Dependents" value={family.number_of_dependents} onChange={(v) => setF("number_of_dependents", v)} />
                      <Select label="Income category" value={family.income_category} options={INCOME_CAT} onChange={(v) => setF("income_category", v)} />
                    </Grid>

                    <SectionTitle>Address</SectionTitle>
                    <Grid>
                      <Text label="Permanent province" value={family.permanent_province} onChange={(v) => setF("permanent_province", v)} />
                      <Text label="Permanent district" value={family.permanent_district} onChange={(v) => setF("permanent_district", v)} />
                      <Text label="Permanent village" value={family.permanent_village} onChange={(v) => setF("permanent_village", v)} />
                      <Text label="Temporary province" value={family.temporary_province} onChange={(v) => setF("temporary_province", v)} />
                      <Text label="Temporary district" value={family.temporary_district} onChange={(v) => setF("temporary_district", v)} />
                      <Text label="Temporary village" value={family.temporary_village} onChange={(v) => setF("temporary_village", v)} />
                    </Grid>
                    <TextArea label="Address" value={family.address} onChange={(v) => setF("address", v)} />
                  </Card>
                )
              )}
            </>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between gap-3 px-6 py-3.5 border-t border-gray-200 bg-white flex-shrink-0">
          <p className="text-[11px] text-gray-400 hidden sm:block">
            Changes across all tabs are saved together.
          </p>
          <div className="flex items-center gap-2 ml-auto">
            <button
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-gray-600 hover:text-gray-800 rounded-lg hover:bg-gray-100 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={save}
              disabled={saving || loading}
              className="px-6 py-2 text-sm font-semibold text-white bg-teal-600 hover:bg-teal-700 rounded-lg disabled:opacity-50 shadow-sm transition-colors"
            >
              {saving ? "Saving…" : "Save changes"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ── Field primitives ─────────────────────────────────────────────────────── */
/** White panel that groups a set of fields inside the grey modal body. */
const Card = ({ title, subtitle, children }) => (
  <section className="bg-white rounded-xl border border-gray-200 shadow-sm mb-4 overflow-hidden">
    {title && (
      <header className="px-4 py-2.5 border-b border-gray-100 bg-gray-50/70">
        <h3 className="text-xs font-bold text-gray-700 uppercase tracking-wide">{title}</h3>
        {subtitle && <p className="text-[10px] text-gray-400 mt-0.5 normal-case">{subtitle}</p>}
      </header>
    )}
    <div className="p-4">{children}</div>
  </section>
);

/** Live monthly-fee breakdown, server-calculated. */
const money = (n) => `${Number(n || 0).toLocaleString()} AFN`;
function FeeSummary({ preview, busy, current, hasBasis }) {
  if (!hasBasis) {
    return (
      <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
        Pick a <b>Grade</b> above to calculate the monthly fee. Without a grade (or class) the base fee stays 0.
      </p>
    );
  }

  const shown = preview || current;
  const changed = preview && Number(preview.final_fee) !== Number(current?.final_fee || 0);

  return (
    <div>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <FeeStat label="Base fee" value={money(shown?.base_fee)} />
        <FeeStat label="Discount" value={`− ${money(shown?.discount_amount)}`} tone="text-emerald-600" />
        <FeeStat label="Final monthly fee" value={money(shown?.final_fee)} strong />
      </div>
      <p className="text-[11px] mt-3 flex items-center gap-1.5">
        {busy ? (
          <span className="text-gray-400">Recalculating…</span>
        ) : changed ? (
          <span className="text-teal-700 font-medium">
            New fee — was {money(current?.final_fee)}. Press “Save changes” to apply.
          </span>
        ) : (
          <span className="text-gray-400">Current saved fee.</span>
        )}
      </p>
    </div>
  );
}

const FeeStat = ({ label, value, tone = "text-gray-800", strong }) => (
  <div className={`rounded-lg border px-3 py-2.5 ${strong ? "border-teal-200 bg-teal-50" : "border-gray-200 bg-gray-50/60"}`}>
    <div className="text-[10px] font-semibold text-gray-500 uppercase tracking-wide">{label}</div>
    <div className={`mt-0.5 font-bold ${strong ? "text-teal-700 text-lg" : `${tone} text-sm`}`}>{value}</div>
  </div>
);

const Grid = ({ children }) => <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">{children}</div>;
const SectionTitle = ({ children }) => <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wide mt-5 mb-2 pt-3 border-t border-gray-100 first:mt-0 first:pt-0 first:border-0">{children}</h3>;
const labelCls = "block text-[11px] font-semibold text-gray-600 mb-1";
const inputCls = "w-full px-3 py-2 text-sm border border-gray-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-teal-400 focus:border-teal-400 transition-shadow disabled:bg-gray-100 disabled:text-gray-400";

function Text({ label, value, onChange, required, placeholder }) {
  return (
    <label className="block">
      <span className={labelCls}>{label}{required && <span className="text-rose-500"> *</span>}</span>
      <input type="text" value={value ?? ""} placeholder={placeholder} onChange={(e) => onChange(e.target.value)} className={inputCls} />
    </label>
  );
}
function NumberField({ label, value, onChange }) {
  return (
    <label className="block">
      <span className={labelCls}>{label}</span>
      <input type="number" value={value ?? ""} onChange={(e) => onChange(e.target.value === "" ? null : e.target.value)} className={inputCls} />
    </label>
  );
}
function DateField({ label, value, onChange }) {
  return (
    <label className="block">
      <span className={labelCls}>{label}</span>
      <input type="date" value={value ? String(value).slice(0, 10) : ""} onChange={(e) => onChange(e.target.value || null)} className={inputCls} />
    </label>
  );
}
function Select({ label, value, options, onChange, hint, disabled }) {
  return (
    <label className="block">
      <span className={labelCls}>{label}</span>
      <select
        value={value ?? ""}
        disabled={disabled}
        onChange={(e) => onChange(e.target.value)}
        className={inputCls}
      >
        <option value="">— none —</option>
        {options.map((o) => <option key={o.v} value={o.v}>{o.l}</option>)}
      </select>
      {hint && <span className="block text-[10px] text-gray-400 mt-0.5">{hint}</span>}
    </label>
  );
}
function TextArea({ label, value, onChange }) {
  return (
    <label className="block mb-2">
      <span className={labelCls}>{label}</span>
      <textarea rows={2} value={value ?? ""} onChange={(e) => onChange(e.target.value)} className={inputCls} />
    </label>
  );
}
function Check({ label, checked, onChange }) {
  return (
    <label className="inline-flex items-center gap-2 cursor-pointer mb-2">
      <input type="checkbox" checked={Boolean(checked)} onChange={(e) => onChange(e.target.checked)} className="w-4 h-4 accent-teal-600" />
      <span className="text-sm text-gray-700">{label}</span>
    </label>
  );
}
function ReadOnly({ label, value }) {
  return (
    <label className="block">
      <span className={labelCls}>{label}</span>
      <input type="text" value={value ?? ""} readOnly className={`${inputCls} bg-gray-50 text-gray-500`} />
    </label>
  );
}
