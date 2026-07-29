import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Swal from "sweetalert2";
import { FiX, FiUser, FiBookOpen, FiTruck, FiUsers, FiDollarSign, FiAlertTriangle } from "react-icons/fi";
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

// Sent as yyyy-mm-dd; the API returns them as ISO timestamps.
const DATE_FIELDS = new Set(["date_of_birth", "enrollment_date"]);

const GENDER = [{ v: "male", l: "Male" }, { v: "female", l: "Female" }];
const ENROLLMENT_TYPE = [{ v: "new", l: "New" }, { v: "transfer", l: "Transfer" }];
const STATUS = ["pending", "active", "graduated", "withdrawn", "transferred"].map((v) => ({ v, l: v[0].toUpperCase() + v.slice(1) }));
const SPECIAL_STATUS = [
  { v: "none", l: "None" }, { v: "orphan", l: "Orphan" },
  { v: "employee_child", l: "Employee child" }, { v: "fourth_child", l: "Fourth child" },
];
const INCOME_CAT = ["A", "B", "C", "D"].map((v) => ({ v, l: v }));
const TRANSFER_STATUS = [
  { v: "pending", l: "Pending" }, { v: "in_progress", l: "In progress" }, { v: "completed", l: "Completed" },
];

export default function StudentEditModal({ studentId, onClose, onSaved }) {
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(null);
  const [reloadKey, setReloadKey] = useState(0);
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

  // `onClose` / `onSaved` are inline arrows in the parent, so their identity
  // changes on every parent render (the auth context alone re-renders every
  // couple of minutes). Kept in refs so they can be called without ever
  // appearing in a dependency array — having them there re-ran the loader
  // mid-edit, which is what made the modal blank itself and disappear.
  const onCloseRef = useRef(onClose);
  const onSavedRef = useRef(onSaved);
  // The records as they came from the server — the diff baseline for saving.
  const initialStudent = useRef({});
  const initialFamily = useRef({});
  useEffect(() => { onCloseRef.current = onClose; onSavedRef.current = onSaved; });
  const close = useCallback(() => onCloseRef.current?.(), []);

  // Load the full student record (+ family) and reference lists. Classes and
  // employee parents come from the students form-data endpoint (gated by the
  // student permission the caller already holds) — NOT the class-management
  // endpoint, which needs a separate classes.view permission.
  //
  // `cache: false` on the student read: after a save we must never paint the
  // pre-save copy from the local API cache, so this one always hits the server.
  useEffect(() => {
    let alive = true;
    setLoading(true);
    setLoadError(null);
    (async () => {
      try {
        const [sRes, fRes, rRes, gRes] = await Promise.all([
          get(`/student-management/students/show/${studentId}`, { cache: false }),
          get("/student-management/students/form-data").catch(() => ({ data: {} })),
          get("/transportation/routes/active/list").catch(() => ({ data: [] })),
          get("/student-management/students/filter-options").catch(() => ({ data: {} })),
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
        // Baseline for the "what changed?" diff done at save time.
        initialStudent.current = data;
        initialFamily.current = data.family || {};
        setGrades(
          (gRes.data?.grades || []).map((g) => ({
            value: g.id,
            label: g.name,
            base_fee: Number(g.base_fee) || 0,
          })),
        );

        // Build the class options from every class that exists (filter-options
        // is not limited to the current term or to classes with free seats) and
        // ALWAYS seed the student's own class, so the saved value renders even
        // if that class is full or belongs to a past term.
        const listClasses = [
          ...(fRes.data?.classes || []),
          ...(gRes.data?.classes || []),
        ].reduce((acc, c) => {
          if (!acc.some((x) => x.value === c.id)) acc.push({ value: c.id, label: c.class_name });
          return acc;
        }, []);
        const current = data.school_class;
        if (current?.id && !listClasses.some((c) => c.value === current.id)) {
          listClasses.unshift({ value: current.id, label: current.class_name });
        }
        setClasses(listClasses);
        setEmployeeParents((fRes.data?.employee_parents || []).map((s) => ({ value: s.id, label: s.name })));
        setRoutes((rRes.data?.data || rRes.data || []).map((r) => ({ value: r.id, label: r.name || r.route_name || `Route #${r.id}` })));
      } catch (e) {
        if (!alive) return;
        // Keep the modal open and offer a retry — silently closing on a hiccup
        // looked to the user like the page had reloaded itself.
        setLoadError(e.response?.data?.message || e.message || "Failed to load student data");
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => { alive = false; };
  }, [studentId, reloadKey]);

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

  /* ── Fee ↔ discount two-way binding ─────────────────────────────────────
   * The admin can drive the monthly fee from either end: type a discount
   * percentage, or type the exact amount the family actually pays and let the
   * percentage be derived from it. The base fee comes from the grade, so the
   * amount field is only meaningful once a grade is set.
   */
  // The base fee is the GRADE's fee — never the amount already stored on the
  // student (that one is what the family pays, i.e. the discounted figure).
  // Order: the grade the user just picked → the grade behind their class →
  // whatever the server's preview resolved. No grade ⇒ no base fee.
  const selectedGrade =
    grades.find((g) => String(g.value) === String(student.grade_id)) ||
    grades.find((g) => String(g.value) === String(student.school_class?.grade_id)) ||
    null;
  const feeBase =
    Number(selectedGrade?.base_fee ?? feePreview?.base_fee ?? 0) || 0;
  const gradeLabel =
    selectedGrade?.label ||
    student.grade?.name ||
    student.school_class?.grade?.name ||
    "";
  // Orphan / employee-child / 4th-child are policy discounts computed by the
  // server; a manual percentage or amount is ignored while one is in force.
  const policyOverride =
    ["orphan", "employee_child"].includes(student.special_status) ||
    Number(student.child_order_in_family) >= 4;

  // Three views of the same number — amount paid, discount in AFN, discount %.
  // Editing any one updates the other two; only the percentage is persisted.
  const [payDraft, setPayDraft] = useState("");
  const [discDraft, setDiscDraft] = useState("");
  const payFocused = useRef(false);
  const discFocused = useRef(false);

  // Keep both amount fields showing the server's figures whenever the user
  // isn't actively typing in them. Before the preview arrives they fall back to
  // what the student already pays, so the fields open with the agreed fee.
  useEffect(() => {
    const finalFee = feePreview?.final_fee ?? student.final_fee;
    const discAmount = feePreview?.discount_amount ?? student.discount_amount;
    if (!payFocused.current) setPayDraft(finalFee == null ? "" : String(round2(finalFee)));
    if (!discFocused.current) setDiscDraft(discAmount == null ? "" : String(round2(discAmount)));
  }, [
    feePreview?.final_fee, feePreview?.discount_amount,
    student.final_fee, student.discount_amount,
  ]);

  /** Push a discount (in AFN) into the percentage + whichever field isn't focused. */
  const applyDiscountAmount = (discount) => {
    const clamped = Math.min(Math.max(discount, 0), feeBase);
    setS("discount_percent", round2((clamped / feeBase) * 100));
    if (!discFocused.current) setDiscDraft(String(round2(clamped)));
    if (!payFocused.current) setPayDraft(String(round2(feeBase - clamped)));
  };

  const handlePayChange = (raw) => {
    setPayDraft(raw);
    if (!feeBase || policyOverride || raw === "") return;
    const paid = Number(raw);
    if (Number.isNaN(paid)) return;
    applyDiscountAmount(feeBase - Math.min(Math.max(paid, 0), feeBase));
  };

  const handleDiscountAmountChange = (raw) => {
    setDiscDraft(raw);
    if (!feeBase || policyOverride || raw === "") return;
    const discount = Number(raw);
    if (Number.isNaN(discount)) return;
    applyDiscountAmount(discount);
  };

  const handlePercentChange = (raw) => {
    if (!feeBase || policyOverride) return;
    const pct = raw === "" ? 0 : Math.min(Math.max(Number(raw) || 0, 0), 100);
    setS("discount_percent", round2(pct));
    // Whole afghani, matching the server, so the three fields never disagree.
    const discount = Math.round((feeBase * pct) / 100);
    if (!discFocused.current) setDiscDraft(String(discount));
    if (!payFocused.current) setPayDraft(String(round2(feeBase - discount)));
  };

  /** On blur, snap a field back to the server's authoritative figure. */
  const resyncFeeFields = () => {
    const finalFee = feePreview?.final_fee ?? student.final_fee;
    const discAmount = feePreview?.discount_amount ?? student.discount_amount;
    if (!payFocused.current) setPayDraft(finalFee == null ? "" : String(round2(finalFee)));
    if (!discFocused.current) setDiscDraft(discAmount == null ? "" : String(round2(discAmount)));
  };

  const title = useMemo(
    () => `${student.first_name || ""} ${student.last_name || ""}`.trim() || "Student",
    [student.first_name, student.last_name],
  );

  /**
   * Only the fields the user actually changed go to the server. This is an
   * edit form, not a create one: re-posting every field made the save fail on
   * pre-existing bad data the user never touched (a family whose stored email
   * is "Check. active?" would 422 on an unrelated address change).
   */
  const buildPayload = (source, fields, initial) => {
    const norm = (k, v) => {
      if (BOOL_FIELDS.has(k)) return Boolean(v);
      if (v === "" || v === undefined) return null;
      // Dates arrive as ISO timestamps but are edited as yyyy-mm-dd.
      if (DATE_FIELDS.has(k) && v) return String(v).slice(0, 10);
      return v;
    };
    const out = {};
    for (const k of fields) {
      const value = norm(k, source?.[k]);
      const before = norm(k, initial?.[k]);
      if (String(value) === String(before)) continue;
      out[k] = value;
    }
    return out;
  };

  const save = async () => {
    setSaving(true);
    try {
      const studentChanges = buildPayload(student, STUDENT_FIELDS, initialStudent.current);
      const familyChanges = familyId && family
        ? buildPayload(family, FAMILY_FIELDS, initialFamily.current)
        : {};

      const res = await put(`/student-management/students/update/${studentId}`, studentChanges);
      if (Object.keys(familyChanges).length > 0) {
        await put(`/student-management/families/update/${familyId}`, familyChanges);
      }
      // Adopt the saved record straight from the response (server-recalculated
      // fees included) so the values on screen are the ones now in the
      // database — and so are the ones shown the next time this opens.
      const saved = res.data?.data;
      if (saved) {
        setStudent((prev) => ({ ...prev, ...saved }));
        initialStudent.current = { ...initialStudent.current, ...saved };
        if (saved.family) {
          setFamily(saved.family);
          initialFamily.current = saved.family;
        } else if (family) {
          initialFamily.current = { ...initialFamily.current, ...family };
        }
      }
      Swal.fire({ toast: true, position: "top-end", icon: "success", title: "Student updated", timer: 1800, showConfirmButton: false });
      onSavedRef.current?.();
      close();
    } catch (e) {
      const errors = e.response?.data?.errors;
      const first = errors ? Object.values(errors)[0]?.[0] : null;
      Swal.fire("Error", first || e.response?.data?.message || "Failed to save changes", "error");
    } finally {
      setSaving(false);
    }
  };

  return (
    // No backdrop-click-to-close. This is a long, multi-section edit form —
    // a stray click on the dimmed area used to discard everything typed so
    // far. Closing is deliberate only: the X in the header or Cancel below.
    <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/50 backdrop-blur-[2px] p-3 sm:p-6">
      <div className="w-full max-w-5xl h-[90vh] bg-white rounded-2xl shadow-2xl flex flex-col overflow-hidden">
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
          ) : loadError ? (
            <div className="flex flex-col items-center justify-center py-20 gap-3 text-center">
              <div className="w-12 h-12 rounded-2xl bg-red-50 flex items-center justify-center">
                <FiAlertTriangle className="w-6 h-6 text-red-500" />
              </div>
              <p className="text-sm font-semibold text-gray-700">Couldn’t load this student</p>
              <p className="text-xs text-gray-500 max-w-md">{loadError}</p>
              <button
                onClick={() => setReloadKey((k) => k + 1)}
                className="mt-1 px-4 py-2 text-xs font-semibold text-white bg-teal-600 hover:bg-teal-700 rounded-lg"
              >
                Try again
              </button>
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
                      {/* Grade is edited once, under Student → Placement. Shown
                          here read-only because it sets the base fee. */}
                      <ReadOnly
                        label="Grade (base fee)"
                        value={
                          gradeLabel
                            ? `${gradeLabel} — ${money(feeBase)}`
                            : "Not set — choose one in the Student tab"
                        }
                      />
                      <Select label="Special status" value={student.special_status} options={SPECIAL_STATUS} onChange={(v) => setS("special_status", v)} />
                      <Select
                        label="Employee parent (staff)"
                        value={student.employee_parent_staff_id}
                        options={employeeParents.map((s) => ({ v: s.value, l: s.label }))}
                        onChange={(v) => setS("employee_parent_staff_id", v ? Number(v) : null)}
                        hint="Only for 'Employee child'"
                      />
                      <NumberField
                        label="Child order in family"
                        value={student.child_order_in_family}
                        onChange={(v) => setS("child_order_in_family", v)}
                      />
                    </Grid>
                  </Card>

                  <Card
                    title="Agreed monthly fee"
                    subtitle="Type what the family actually pays — the discount is worked out from it (or set the % directly)"
                  >
                    {!feeBase ? (
                      <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
                        Set a <b>Grade</b> in the <b>Student</b> tab first. Without a grade the base fee is 0, so there is nothing to discount.
                      </p>
                    ) : (
                      <>
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                          <label className="block">
                            <span className={labelCls}>Fee to pay (AFN)</span>
                            <input
                              type="number"
                              step="0.01"
                              min="0"
                              max={feeBase}
                              value={payDraft}
                              disabled={policyOverride}
                              onFocus={() => { payFocused.current = true; }}
                              onBlur={() => { payFocused.current = false; resyncFeeFields(); }}
                              onChange={(e) => handlePayChange(e.target.value)}
                              className={`${inputCls} font-semibold`}
                            />
                            <span className="block text-[10px] text-gray-400 mt-0.5">
                              What the family pays, 0 to {money(feeBase)}.
                            </span>
                          </label>

                          <label className="block">
                            <span className={labelCls}>Discount amount (AFN)</span>
                            <input
                              type="number"
                              step="0.01"
                              min="0"
                              max={feeBase}
                              value={discDraft}
                              disabled={policyOverride}
                              onFocus={() => { discFocused.current = true; }}
                              onBlur={() => { discFocused.current = false; resyncFeeFields(); }}
                              onChange={(e) => handleDiscountAmountChange(e.target.value)}
                              className={`${inputCls} font-semibold`}
                            />
                            <span className="block text-[10px] text-gray-400 mt-0.5">
                              Discount in money, taken off {money(feeBase)}.
                            </span>
                          </label>

                          <label className="block">
                            <span className={labelCls}>Discount %</span>
                            <input
                              type="number"
                              step="0.01"
                              min="0"
                              max="100"
                              value={student.discount_percent ?? ""}
                              disabled={policyOverride}
                              onChange={(e) => handlePercentChange(e.target.value)}
                              className={inputCls}
                            />
                            <span className="block text-[10px] text-gray-400 mt-0.5">
                              0% to 100%. Decimals are fine.
                            </span>
                          </label>
                        </div>

                        <p className="text-[11px] text-gray-500 mt-2">
                          Edit any one of the three — the other two follow. {money(feeBase)} base
                          − {money(Number(discDraft) || 0)} discount = {money(Number(payDraft) || 0)} payable.
                        </p>

                        {policyOverride && (
                          <p className="text-[11px] text-blue-800 bg-blue-50 border border-blue-200 rounded-lg px-3 py-2 mt-3">
                            A policy discount is in force
                            {Number(student.child_order_in_family) >= 4
                              ? " (4th child — free)"
                              : student.special_status === "orphan"
                                ? " (orphan — 75%)"
                                : " (employee child)"}
                            , so the fee is set by the rule, not by hand. Clear the special status to enter an amount yourself.
                          </p>
                        )}
                      </>
                    )}
                  </Card>

                  <Card title="Monthly fee" subtitle="Calculated on the server — saved when you press Save changes">
                    <FeeSummary
                      preview={feePreview}
                      busy={feeBusy}
                      base={feeBase}
                      gradeLabel={gradeLabel}
                      current={{
                        base_fee: student.base_fee,
                        discount_percent: student.discount_percent,
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
                      <Text label="Mother name" value={family.mother_name} onChange={(v) => setF("mother_name", v)} />
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
const round2 = (n) => Math.round((Number(n) || 0) * 100) / 100;
const money = (n) =>
  `${round2(n).toLocaleString(undefined, { maximumFractionDigits: 2 })} AFN`;
/** 12.5 → "12.5%", 12 → "12%" — no trailing zeros on whole percentages. */
const percent = (n) => `${round2(n).toLocaleString(undefined, { maximumFractionDigits: 2 })}%`;

/**
 * `base` is the GRADE's monthly fee and is authoritative: everything else is
 * derived from it. The discount is simply base − what the family pays, and the
 * percentage is that difference over the base.
 */
function FeeSummary({ preview, busy, base = 0, gradeLabel, current, hasBasis }) {
  const baseFee = Number(base) || Number(preview?.base_fee) || 0;
  const pct = round2(preview?.discount_percent ?? current?.discount_percent ?? 0);
  // Same whole-afghani rounding the server applies, so the figures shown
  // before the preview lands match the ones that get saved.
  const discountAmount = preview
    ? round2(preview.discount_amount)
    : Math.round((baseFee * pct) / 100);
  const finalFee = preview ? round2(preview.final_fee) : round2(baseFee - discountAmount);

  return (
    <div>
      {!hasBasis && (
        <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 mb-3">
          No grade (or class) is set for this student, so there is no base fee to work from.
          {Number(current?.final_fee) > 0 && (
            <> Previously saved on the record: <b>{money(current.final_fee)}</b>.</>
          )}
        </p>
      )}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <FeeStat
          label={gradeLabel ? `Base fee (${gradeLabel})` : "Base fee (grade)"}
          value={money(baseFee)}
        />
        <FeeStat
          label={`Discount (${percent(pct)})`}
          value={`− ${money(discountAmount)}`}
          tone="text-emerald-600"
        />
        <FeeStat label="Final monthly fee" value={money(finalFee)} strong />
      </div>
      <p className="text-[11px] mt-3 flex items-center gap-1.5">
        {busy ? (
          <span className="text-gray-400">Recalculating…</span>
        ) : preview && Number(preview.final_fee) !== Number(current?.final_fee || 0) ? (
          <span className="text-teal-700 font-medium">
            {money(baseFee)} − {money(discountAmount)} ({percent(pct)} discount) = {money(finalFee)} payable.
            Was {money(current?.final_fee)}. Press “Save changes” to apply.
          </span>
        ) : (
          <span className="text-gray-400">
            {money(baseFee)} base − {money(discountAmount)} discount ({percent(pct)}) = {money(finalFee)} payable.
          </span>
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
