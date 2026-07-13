import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { get, API_BASE_URL, peekCache } from "../../api/axios";
import Swal from "sweetalert2";
import { fmtDate, fmtDateTime } from "../../utils/formErrors";
import { useResourcePermissions } from "../../admin/utils/useResourcePermissions";
import StudentDevelopmentPanel from "./StudentDevelopmentPanel";

/* ------------------------------------------------------------------ */
/* helpers                                                            */
/* ------------------------------------------------------------------ */

const money = (v) =>
  v === null || v === undefined || v === "" ? "—" : `${Number(v).toLocaleString()} AFN`;

const val = (v) => (v === null || v === undefined || v === "" ? "—" : v);

// Strip a trailing /api (present in prod) before hitting the public storage
// disk — matches the convention used across the app (Staff, StudentEnrollment).
const STORAGE_BASE = API_BASE_URL.replace(/\/api\/?$/, "");
const fileUrl = (path) => (path ? `${STORAGE_BASE}/storage/${path}` : null);

const STATUS_BADGE = {
  active: "bg-emerald-100 text-emerald-700",
  pending: "bg-amber-100 text-amber-700",
  graduated: "bg-blue-100 text-blue-700",
  withdrawn: "bg-gray-200 text-gray-600",
  transferred: "bg-violet-100 text-violet-700",
};

const INVOICE_STATUS = {
  paid: "bg-emerald-100 text-emerald-700",
  partial: "bg-amber-100 text-amber-700",
  pending: "bg-gray-100 text-gray-600",
  overdue: "bg-red-100 text-red-700",
  void: "bg-gray-100 text-gray-400 line-through",
};

const DOC_LABELS = {
  doc_student_tazkira: "Student Tazkira",
  doc_father_tazkira: "Father Tazkira",
  doc_birth_certificate: "Birth Certificate",
  doc_previous_school_documents: "Previous School Docs",
  doc_student_photo: "Student Photo",
};

const Field = ({ label, value, full = false }) => (
  <div className={full ? "sm:col-span-2 lg:col-span-3" : ""}>
    <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide">{label}</p>
    <p className="text-sm text-gray-800 mt-0.5 break-words">{value}</p>
  </div>
);

// Static Tailwind class maps — interpolated class names (`bg-${x}-100`) are
// invisible to Tailwind's JIT and never compile, so colors are spelled out.
const ACCENT_ICON = {
  teal: "bg-teal-100 text-teal-600",
  blue: "bg-blue-100 text-blue-600",
  amber: "bg-amber-100 text-amber-600",
  indigo: "bg-indigo-100 text-indigo-600",
  rose: "bg-rose-100 text-rose-600",
  violet: "bg-violet-100 text-violet-600",
};

const TILE = {
  teal: { box: "border-teal-100 bg-teal-50/60", label: "text-teal-700" },
  blue: { box: "border-blue-100 bg-blue-50/60", label: "text-blue-700" },
  emerald: { box: "border-emerald-100 bg-emerald-50/60", label: "text-emerald-700" },
  red: { box: "border-red-100 bg-red-50/60", label: "text-red-700" },
  indigo: { box: "border-indigo-100 bg-indigo-50/60", label: "text-indigo-700" },
  amber: { box: "border-amber-100 bg-amber-50/60", label: "text-amber-700" },
};

const Card = ({ title, icon, children, accent = "teal" }) => (
  <div className="bg-white rounded-2xl border border-gray-100 shadow-sm">
    <div className="flex items-center gap-2.5 px-5 py-3.5 border-b border-gray-100">
      <div className={`w-7 h-7 rounded-lg flex items-center justify-center ${ACCENT_ICON[accent] || ACCENT_ICON.teal}`}>
        {icon}
      </div>
      <h3 className="text-sm font-bold text-gray-800">{title}</h3>
    </div>
    <div className="p-5">{children}</div>
  </div>
);

const Grid = ({ children }) => (
  <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-3 gap-x-5 gap-y-4">{children}</div>
);

const StatTile = ({ label, value, sub, color = "teal" }) => {
  const c = TILE[color] || TILE.teal;
  return (
    <div className={`rounded-2xl border p-4 ${c.box}`}>
      <p className={`text-[10px] font-bold uppercase tracking-wide ${c.label}`}>{label}</p>
      <p className="text-xl font-black text-gray-800 mt-1 leading-none">{value}</p>
      {sub && <p className="text-[11px] text-gray-500 mt-1">{sub}</p>}
    </div>
  );
};

const I = {
  user: <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>,
  book: <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13" /></svg>,
  cash: <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" /></svg>,
  doc: <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" /></svg>,
  heart: <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" /></svg>,
  bus: <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h8m-8 4h8m-4 4h.01M5 21h14a1 1 0 001-1V6a3 3 0 00-3-3H7a3 3 0 00-3 3v14a1 1 0 001 1z" /></svg>,
  swap: <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" /></svg>,
  shirt: <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 3l4 3-2 4-2-1v12H8V9L6 10 4 6l4-3 4 2 4-2z" /></svg>,
  home: <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-4 0h4" /></svg>,
};

/* ------------------------------------------------------------------ */
/* page                                                               */
/* ------------------------------------------------------------------ */

const TABS = ["Overview", "Information", "Financials", "Documents", "Development"];

export default function StudentShow() {
  const navigate = useNavigate();
  const { id } = useParams();
  const { canUpdate } = useResourcePermissions("students");
  const [s, setS] = useState(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState("Overview");

  useEffect(() => {
    (async () => {
      setLoading(true);
      const __cached = peekCache(`/student-management/students/show/${id}`);
      if (__cached) { setS(__cached?.data ?? __cached); setLoading(false); }
      try {
        const res = await get(`/student-management/students/show/${id}`);
        setS(res.data?.data || res.data);
      } catch {
        Swal.fire("Error", "Failed to load student", "error");
        navigate("/student-management/students");
      } finally {
        setLoading(false);
      }
    })();
  }, [id]);

  if (loading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="w-10 h-10 border-4 border-teal-100 border-t-teal-600 rounded-full animate-spin" />
      </div>
    );
  }
  if (!s) return null;

  const invoices = (s.fee_invoices || []).filter((i) => !i.voided_at);
  const pendingCharges = (s.pending_charges || []).filter((c) => c.status === "pending");
  const totalInvoiced = invoices.reduce((a, i) => a + Number(i.final_amount || 0), 0);
  const totalPaid = invoices.reduce((a, i) => a + Number(i.amount_paid || 0), 0);
  const outstanding = totalInvoiced - totalPaid;
  const pendingTotal = pendingCharges.reduce((a, c) => a + Number(c.amount || 0), 0);

  const obsCount = (s.observations || []).length;
  const devTotal =
    obsCount + (s.monitorings || []).length + (s.monitoring_followups || []).length +
    (s.elicitation_sessions || []).length + (s.syntheses || []).length +
    (s.annual_review_decisions || []).length;

  const photo = fileUrl((s.documents || []).find((d) => d.document_type === "doc_student_photo")?.file_url);
  const initials = `${s.first_name?.[0] || ""}${s.last_name?.[0] || ""}`.toUpperCase();

  return (
    <div className="min-h-screen bg-gray-50/60 pb-10">
      {/* Header banner */}
      <div className="bg-gradient-to-r from-teal-600 to-emerald-700 px-5 pt-5 pb-16">
        <div className="flex items-center justify-between">
          <button onClick={() => navigate("/student-management/students")}
            className="p-2 bg-white/20 hover:bg-white/30 rounded-xl text-white">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
          </button>
          <div className="flex items-center gap-2">
            <button onClick={() => navigate(`/student-management/students/profile/${id}`)}
              className="px-4 py-2 bg-white/20 hover:bg-white/30 text-white rounded-xl text-sm font-semibold flex items-center gap-2">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" /></svg>
              شناسنامه
            </button>
            {canUpdate && (
              <button onClick={() => navigate(`/student-management/students/edit/${id}`)}
                className="px-4 py-2 bg-white text-teal-700 rounded-xl text-sm font-semibold hover:bg-teal-50 flex items-center gap-2">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                Edit
              </button>
            )}
          </div>
        </div>
      </div>

      <div className="px-4 -mt-12 max-w-6xl mx-auto">
        {/* Identity card */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 flex items-center gap-4 flex-wrap">
          <div className="w-20 h-20 rounded-2xl bg-teal-100 text-teal-700 flex items-center justify-center text-2xl font-black overflow-hidden shrink-0">
            {photo ? <img src={photo} alt="" className="w-full h-full object-cover" /> : (initials || "?")}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-xl font-bold text-gray-800">{s.full_name || `${s.first_name} ${s.last_name}`}</h1>
              <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold ${STATUS_BADGE[s.status] || "bg-gray-100 text-gray-600"}`}>
                {s.status}
              </span>
              {s.registration_status === "phase_2" && (
                <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-100 text-emerald-700">Enrolled</span>
              )}
            </div>
            <p className="text-sm text-gray-500 mt-1 font-mono">{s.student_id}</p>
            <div className="flex items-center gap-3 mt-1.5 text-xs text-gray-500 flex-wrap">
              <span>{s.school_class?.class_name || "No class"}</span>
              {s.school_class?.grade?.name && <span>· {s.school_class.grade.name}</span>}
              {s.academic_term?.name && <span>· {s.academic_term.name}</span>}
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="mt-4 bg-white rounded-2xl border border-gray-100 shadow-sm p-1.5 flex gap-1 overflow-x-auto">
          {TABS.map((t) => (
            <button key={t} onClick={() => setTab(t)}
              className={`px-4 py-2 rounded-xl text-sm font-semibold whitespace-nowrap transition-all
                ${tab === t ? "bg-teal-600 text-white shadow-sm" : "text-gray-500 hover:bg-gray-50"}`}>
              {t}
              {t === "Development" && devTotal > 0 && <span className="ml-1.5 text-[10px] opacity-80">({devTotal})</span>}
              {t === "Financials" && invoices.length > 0 && <span className="ml-1.5 text-[10px] opacity-80">({invoices.length})</span>}
            </button>
          ))}
        </div>

        <div className="mt-4 space-y-4">
          {/* ============ OVERVIEW ============ */}
          {tab === "Overview" && (
            <>
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                <StatTile label="Monthly Tuition" value={money(s.final_fee)}
                  sub={s.discount_percent > 0 ? `${s.discount_percent}% discount` : "No discount"} color="teal" />
                <StatTile label="Outstanding" value={money(outstanding)}
                  sub={`${invoices.length} invoice${invoices.length !== 1 ? "s" : ""}`} color={outstanding > 0 ? "red" : "emerald"} />
                <StatTile label="Total Paid" value={money(totalPaid)} sub="All time" color="emerald" />
                <StatTile label="Observations" value={obsCount} sub={`${devTotal} dev records`} color="indigo" />
              </div>

              <Card title="At a Glance" icon={I.user}>
                <Grid>
                  <Field label="Full Name" value={val(s.full_name)} />
                  <Field label="Student ID" value={val(s.student_id)} />
                  <Field label="Gender" value={val(s.gender)} />
                  <Field label="Date of Birth" value={fmtDate(s.date_of_birth)} />
                  <Field label="Enrollment Date" value={fmtDate(s.enrollment_date)} />
                  <Field label="Enrollment Type" value={val(s.enrollment_type)} />
                  <Field label="Class" value={val(s.school_class?.class_name)} />
                  <Field label="Grade" value={val(s.school_class?.grade?.name)} />
                  <Field label="Academic Year" value={val(s.academic_term?.name)} />
                  <Field label="Family" value={s.family ? `${s.family.family_id} — ${s.family.father_name}` : "—"} />
                  <Field label="Father Phone" value={val(s.family?.father_phone)} />
                  <Field label="Registration" value={s.registration_status === "phase_2" ? "Phase 2 (Enrolled)" : "Phase 1"} />
                </Grid>
              </Card>

              {pendingCharges.length > 0 && (
                <Card title="Queued Charges (not yet invoiced)" icon={I.cash} accent="amber">
                  <div className="space-y-2">
                    {pendingCharges.map((c) => (
                      <div key={c.id} className="flex items-center justify-between text-sm py-1.5 border-b border-gray-50 last:border-0">
                        <span className="text-gray-700">{c.fee_item?.name || c.description || "Charge"}</span>
                        <span className="font-semibold text-gray-800">{money(c.amount)}</span>
                      </div>
                    ))}
                    <div className="flex items-center justify-between pt-2 text-sm font-bold">
                      <span className="text-gray-500">Total queued</span>
                      <span className="text-amber-700">{money(pendingTotal)}</span>
                    </div>
                  </div>
                </Card>
              )}
            </>
          )}

          {/* ============ INFORMATION ============ */}
          {tab === "Information" && (
            <>
              <Card title="Personal" icon={I.user}>
                <Grid>
                  <Field label="First Name" value={val(s.first_name)} />
                  <Field label="Last Name" value={val(s.last_name)} />
                  <Field label="Gender" value={val(s.gender)} />
                  <Field label="Date of Birth" value={fmtDate(s.date_of_birth)} />
                  <Field label="Child Order in Family" value={val(s.child_order_in_family)} />
                  <Field label="Special Status" value={val(s.special_status)} />
                </Grid>
              </Card>

              <Card title="Academic Placement" icon={I.book}>
                <Grid>
                  <Field label="Class" value={val(s.school_class?.class_name)} />
                  <Field label="Grade" value={val(s.school_class?.grade?.name)} />
                  <Field label="Academic Year" value={val(s.academic_term?.name)} />
                  <Field label="Enrollment Date" value={fmtDate(s.enrollment_date)} />
                  <Field label="Enrollment Type" value={val(s.enrollment_type)} />
                  <Field label="Status" value={val(s.status)} />
                  <Field label="Registration" value={s.registration_status === "phase_2" ? "Phase 2 (Enrolled)" : "Phase 1"} />
                  <Field label="Phase 2 Completed" value={s.phase_2_completed_at ? fmtDateTime(s.phase_2_completed_at) : "—"} />
                </Grid>
              </Card>

              <Card title="Family" icon={I.user} accent="blue">
                <Grid>
                  <Field label="Family ID" value={val(s.family?.family_id)} />
                  <Field label="Father Name" value={val(s.family?.father_name)} />
                  <Field label="Father Phone" value={val(s.family?.father_phone)} />
                  <Field label="Mother Name" value={val(s.family?.mother_name)} />
                </Grid>
                {s.family && (
                  <button onClick={() => navigate(`/student-management/parents/show/${s.family.id}`)}
                    className="mt-4 text-xs font-semibold text-teal-700 hover:text-teal-900">
                    View full family →
                  </button>
                )}
              </Card>

              {(s.has_special_health_condition || s.has_special_needs || s.health_details) && (
                <Card title="Health & Special Needs" icon={I.heart} accent="rose">
                  <Grid>
                    <Field label="Special Health Condition" value={s.has_special_health_condition ? "Yes" : "No"} />
                    <Field label="Special Needs" value={s.has_special_needs ? "Yes" : "No"} />
                    <Field label="Details" value={val(s.health_details)} full />
                  </Grid>
                </Card>
              )}

              {s.transportation_required && (
                <Card title="Transportation" icon={I.bus} accent="amber">
                  <Grid>
                    <Field label="Pickup Point" value={val(s.transport_pickup_point)} />
                    <Field label="Pickup Time" value={val(s.transport_pickup_time)} />
                    <Field label="Drop-off Point" value={val(s.transport_dropoff_point)} />
                    <Field label="Monthly Fee" value={money(s.transport_monthly_fee)} />
                  </Grid>
                </Card>
              )}

              {(s.need_uniform || s.uniform_required) && (
                <Card title="Uniform" icon={I.shirt} accent="indigo">
                  <Grid>
                    <Field label="Price" value={money(s.uniform_price)} />
                    <Field label="Chest" value={val(s.uniform_chest)} />
                    <Field label="Waist" value={val(s.uniform_waist)} />
                    <Field label="Height" value={val(s.uniform_height)} />
                    <Field label="Shoulder" value={val(s.uniform_shoulder)} />
                    <Field label="Sleeve" value={val(s.uniform_sleeve)} />
                    <Field label="Tailor Note" value={val(s.tailor_note)} full />
                  </Grid>
                </Card>
              )}

              {s.enrollment_type === "transfer" && (
                <Card title="Transfer Case" icon={I.swap} accent="violet">
                  <Grid>
                    <Field label="Case Status" value={val(s.transfer_case_status)} />
                    <Field label="Agreement" value={s.transfer_agreement ? "✓" : "—"} />
                    <Field label="First Parcha" value={s.transfer_first_parcha ? "✓" : "—"} />
                    <Field label="Sawabiq" value={s.transfer_sawabiq ? "✓" : "—"} />
                    <Field label="Assurance Request" value={s.transfer_assurance_request ? "✓" : "—"} />
                    <Field label="Itminaniya" value={s.transfer_itminaniya ? "✓" : "—"} />
                    <Field label="Previous School" value={val(s.previous_school_name)} />
                    <Field label="Last Class Completed" value={val(s.last_class_completed)} />
                    <Field label="Last Result" value={val(s.last_years_result)} />
                    <Field label="Notes" value={val(s.transfer_additional_notes)} full />
                  </Grid>
                </Card>
              )}

              {(s.how_did_you_hear || s.introducer_name || s.motivation_to_join) && (
                <Card title="Background" icon={I.home}>
                  <Grid>
                    <Field label="How did you hear" value={val(s.how_did_you_hear)} />
                    <Field label="Introducer" value={val(s.introducer_name)} />
                    <Field label="Introducer Contact" value={val(s.introducer_contact)} />
                    <Field label="Motivation" value={val(s.motivation_to_join)} full />
                  </Grid>
                </Card>
              )}
            </>
          )}

          {/* ============ FINANCIALS ============ */}
          {tab === "Financials" && (
            <>
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                <StatTile label="Monthly Tuition" value={money(s.final_fee)} color="teal" />
                <StatTile label="Total Invoiced" value={money(totalInvoiced)} color="blue" />
                <StatTile label="Total Paid" value={money(totalPaid)} color="emerald" />
                <StatTile label="Outstanding" value={money(outstanding)} color={outstanding > 0 ? "red" : "emerald"} />
              </div>

              <Card title="Fee Configuration" icon={I.cash}>
                <Grid>
                  <Field label="Base Fee" value={money(s.base_fee)} />
                  <Field label="Discount %" value={s.discount_percent ? `${s.discount_percent}%` : "—"} />
                  <Field label="Discount Amount" value={money(s.discount_amount)} />
                  <Field label="Final Fee" value={money(s.final_fee)} />
                  <Field label="Special Status" value={val(s.special_status)} />
                  <Field label="Employee Parent" value={val(s.employee_parent?.application?.full_name)} />
                </Grid>
              </Card>

              <Card title="Invoices" icon={I.cash} accent="blue">
                {invoices.length === 0 ? (
                  <p className="text-sm text-gray-400 text-center py-4">No invoices yet.</p>
                ) : (
                  <div className="space-y-2">
                    {invoices.map((inv) => {
                      const due = Number(inv.final_amount || 0) - Number(inv.amount_paid || 0);
                      return (
                        <div key={inv.id} className="rounded-xl border border-gray-100 p-3.5">
                          <div className="flex items-center justify-between gap-2 flex-wrap">
                            <div className="flex items-center gap-2">
                              <span className="font-mono text-xs font-semibold text-gray-700">{inv.invoice_number}</span>
                              <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${INVOICE_STATUS[inv.status] || "bg-gray-100 text-gray-600"}`}>
                                {inv.status}
                              </span>
                            </div>
                            <span className="text-[11px] text-gray-400">Due {fmtDate(inv.due_date)}</span>
                          </div>
                          <div className="grid grid-cols-3 gap-2 mt-2.5 text-sm">
                            <div><p className="text-[10px] text-gray-400 uppercase">Total</p><p className="font-semibold text-gray-800">{money(inv.final_amount)}</p></div>
                            <div><p className="text-[10px] text-gray-400 uppercase">Paid</p><p className="font-semibold text-emerald-600">{money(inv.amount_paid)}</p></div>
                            <div><p className="text-[10px] text-gray-400 uppercase">Balance</p><p className={`font-semibold ${due > 0 ? "text-red-600" : "text-gray-800"}`}>{money(due)}</p></div>
                          </div>
                          {inv.lines?.length > 0 && (
                            <div className="mt-2.5 pt-2.5 border-t border-gray-50 space-y-1">
                              {inv.lines.map((ln) => (
                                <div key={ln.id} className="flex items-center justify-between text-[11px] text-gray-500">
                                  <span>{ln.description}</span>
                                  <span>{money(ln.amount)}</span>
                                </div>
                              ))}
                            </div>
                          )}
                          {inv.payments?.length > 0 && (
                            <div className="mt-2 pt-2 border-t border-gray-50 space-y-1">
                              {inv.payments.map((p) => (
                                <div key={p.id} className="flex items-center justify-between text-[11px] text-emerald-600">
                                  <span>Payment · {p.payment_method || "—"} · {fmtDate(p.payment_date)}</span>
                                  <span>{money(p.amount_paid)}</span>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </Card>

              {pendingCharges.length > 0 && (
                <Card title="Queued Charges" icon={I.cash} accent="amber">
                  <div className="space-y-2">
                    {pendingCharges.map((c) => (
                      <div key={c.id} className="flex items-center justify-between text-sm py-1.5 border-b border-gray-50 last:border-0">
                        <span className="text-gray-700">{c.fee_item?.name || c.description || "Charge"}</span>
                        <span className="font-semibold text-gray-800">{money(c.amount)}</span>
                      </div>
                    ))}
                    <div className="flex items-center justify-between pt-2 text-sm font-bold">
                      <span className="text-gray-500">Total queued</span>
                      <span className="text-amber-700">{money(pendingTotal)}</span>
                    </div>
                  </div>
                </Card>
              )}

              {(s.foundation_requests || []).length > 0 && (
                <Card title="Foundation Help Requests" icon={I.heart} accent="rose">
                  <div className="space-y-2.5">
                    {s.foundation_requests.map((fr) => (
                      <div key={fr.id} className="rounded-xl border border-gray-100 p-3.5">
                        <div className="flex items-center justify-between">
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            fr.status === "approved" ? "bg-emerald-100 text-emerald-700" :
                            fr.status === "rejected" ? "bg-red-100 text-red-700" : "bg-amber-100 text-amber-700"}`}>
                            {fr.status}
                          </span>
                          <span className="text-[11px] text-gray-400">{fr.reviewed_at ? fmtDate(fr.reviewed_at) : ""}</span>
                        </div>
                        <div className="grid grid-cols-3 gap-2 mt-2 text-sm">
                          <Field label="Requested" value={money(fr.help_requested)} />
                          <Field label="Approved" value={money(fr.help_approved)} />
                          <Field label="Family Can Pay" value={money(fr.family_can_pay)} />
                        </div>
                        {fr.admin_note && <p className="text-[11px] text-gray-500 mt-2">Note: {fr.admin_note}</p>}
                      </div>
                    ))}
                  </div>
                </Card>
              )}
            </>
          )}

          {/* ============ DOCUMENTS ============ */}
          {tab === "Documents" && (
            <Card title="Documents" icon={I.doc}>
              {(s.documents || []).length === 0 ? (
                <p className="text-sm text-gray-400 text-center py-4">No documents uploaded.</p>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {s.documents.map((d) => (
                    <a key={d.id} href={fileUrl(d.file_url)} target="_blank" rel="noreferrer"
                      className="flex items-center gap-3 p-3 rounded-xl border border-gray-100 hover:border-teal-200 hover:bg-teal-50/40 transition-all">
                      <div className="w-9 h-9 rounded-lg bg-teal-100 text-teal-600 flex items-center justify-center shrink-0">{I.doc}</div>
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-gray-800 truncate">{DOC_LABELS[d.document_type] || d.document_type}</p>
                        <p className="text-[11px] text-gray-400 truncate">{d.original_name || ""}</p>
                      </div>
                    </a>
                  ))}
                </div>
              )}
            </Card>
          )}

          {/* ============ DEVELOPMENT ============ */}
          {tab === "Development" && <StudentDevelopmentPanel student={s} />}
        </div>
      </div>
    </div>
  );
}
