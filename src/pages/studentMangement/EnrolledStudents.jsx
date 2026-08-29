import { useState, useEffect, useCallback } from "react";
import CrudPage from "../../components/CrudPage";
import TransferStepsModal, { TRANSFER_STEPS } from "./TransferStepsModal";
import StudentEditModal from "./StudentEditModal";
import FamilyContactButton from "./FamilyContactButton";
import Swal from "sweetalert2";
import { FiEdit2 } from "react-icons/fi";
import { generateUniformInvoice } from "../../api/financial";
import { get, peekCache } from "../../api/axios";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../admin/context/AuthContext";

import { fmtDate } from "../../utils/formErrors";

const GENDER_OPTIONS = [
  { value: "male", label: "Male" },
  { value: "female", label: "Female" },
];
const STUDENT_STATUS_OPTIONS = [
  { value: "pending", label: "Pending" },
  { value: "active", label: "Active" },
  { value: "graduated", label: "Graduated" },
  { value: "withdrawn", label: "Withdrawn" },
  { value: "transferred", label: "Transferred" },
];

const statusBadge = (val) => {
  const map = {
    active: "bg-emerald-100 text-emerald-700",
    graduated: "bg-blue-100 text-blue-700",
    withdrawn: "bg-gray-100 text-gray-500",
    transferred: "bg-amber-100 text-amber-700",
  };
  return (
    <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${map[val] || "bg-gray-100 text-gray-700"}`}>
      {val?.replace(/_/g, " ")}
    </span>
  );
};

const TRANSFER_STEP_SHORT = {
  transfer_agreement: "Agreement done",
  transfer_first_parcha: "First Parcha done",
  transfer_sawabiq: "Records done",
  transfer_assurance_request: "Assurance done",
  transfer_itminaniya: "Itminaniya done",
};

const lastCompletedTransferLabel = (item) => {
  let label = null;
  for (const step of TRANSFER_STEPS) {
    if (item[step.key]) label = TRANSFER_STEP_SHORT[step.key];
    else break;
  }
  return label;
};

// Either module unlocks this roster: its own `enrolled-students.*` grant, or
// the wider `students.*` one held by the registration manager.
const PERMISSION_BASES = ["enrolled-students", "students"];

const PHASE_2_PARAMS = { registration_status: "phase_2" };

const FILTER_OPTIONS_URL = "/student-management/students/filter-options";

/** Rows → [{ value, label }], tolerating both bare arrays and { data: [...] }. */
const toOptions = (rows, label) => {
  const list = Array.isArray(rows) ? rows : Array.isArray(rows?.data) ? rows.data : [];
  return list
    .map((row) => ({ value: row.id, label: label(row) || `#${row.id}` }))
    .filter((o) => o.value != null);
};

export default function EnrolledStudents() {
  const navigate = useNavigate();
  const { hasPermission } = useAuth();
  // The edit modal saves through the shared student/family write endpoints.
  // Those resolve to `students` / `parents` on the backend, which now accepts
  // `enrolled-students.*` as an alias for them (PathPermissionMiddleware::
  // PREFIX_ALIAS_BASES) — so either module unlocks the button, and both are
  // actually enforced by the API.
  const canWith = (action) =>
    PERMISSION_BASES.some((base) => hasPermission(`${base}.${action}`) || hasPermission(`${base}.manage`));
  const canUpdate = canWith("update");
  // The uniform invoice posts to the finance module (fee-invoices), which is a
  // separate grant — showing the button without it just produced a 403 toast.
  const canInvoice = hasPermission("fee-invoices.create") || hasPermission("fee-invoices.manage");
  const [transferStudent, setTransferStudent] = useState(null);
  const [editStudentId, setEditStudentId] = useState(null);
  const [refreshKey, setRefreshKey] = useState(0);
  // Stable identities: the edit modal keys its data load off these props, so a
  // fresh arrow on every render would restart the load mid-edit.
  const closeEditModal = useCallback(() => setEditStudentId(null), []);
  const bumpRefreshKey = useCallback(() => setRefreshKey((k) => k + 1), []);
  const closeTransferModal = useCallback(() => setTransferStudent(null), []);
  const [grades, setGrades] = useState([]);
  const [classes, setClasses] = useState([]);
  const [terms, setTerms] = useState([]);
  // Filter dropdown sources. One call to the students module: /grades,
  // /class-management/classes and /academic-terms each require their own
  // module permission (registration-manager has no `classes.view`), so those
  // 403'd and left every dropdown showing nothing but "All".
  useEffect(() => {
    const applyOptions = (payload) => {
      if (!payload) return;
      setGrades(toOptions(payload.grades, (g) => g.name));
      setClasses(
        toOptions(payload.classes, (c) =>
          [c.class_name, c.grade_name && c.grade_name !== c.class_name ? `· ${c.grade_name}` : null]
            .filter(Boolean)
            .join(" "),
        ),
      );
      setTerms(toOptions(payload.academic_terms, (t) => t.name));
    };

    applyOptions(peekCache(FILTER_OPTIONS_URL));
    get(FILTER_OPTIONS_URL)
      .then((r) => applyOptions(r.data))
      .catch((e) => console.error("Failed to load student filter options", e));
  }, []);
  const enrolledFilters = [
    { key: "grade_id", label: "Grade", options: grades, emptyLabel: "No grades found" },
    { key: "class_id", label: "Class", options: classes, emptyLabel: "No classes created yet" },
    { key: "academic_term_id", label: "Term", options: terms, emptyLabel: "No terms found" },
    { key: "gender", label: "Gender", options: GENDER_OPTIONS },
    { key: "status", label: "Status", options: STUDENT_STATUS_OPTIONS },
  ];

  const handleUniformInvoice = async (student) => {
    try {
      const r = await generateUniformInvoice(student.id);
      const inv = r.data?.data;
      Swal.fire("Success", r.data?.message || "Uniform invoice generated.", "success");
      if (inv?.id) {
        navigate(`/finance/fee-invoices/show/${inv.id}`);
      }
    } catch (error) {
      Swal.fire("Error", error.response?.data?.message || "Failed to generate uniform invoice", "error");
    }
  };

  /* The father's contact number, in the slot the transfer status used to hold.
   * `dir="ltr"` because a phone number is read left-to-right even when the row
   * around it is Dari or Pashto. */
  const fatherPhoneColumn = {
    key: "father_phone",
    label: "Father Number",
    render: (_, item) => (item.family?.father_phone
      ? <span dir="ltr" className="text-xs text-gray-700 whitespace-nowrap">{item.family.father_phone}</span>
      : <span className="text-xs text-gray-300">—</span>),
  };

  /* The transfer control, moved out of its own column and into the row's
   * actions. It is the only way to open the transfer steps on this screen, so
   * dropping the column without rehoming the button would have quietly removed
   * the ability to run a transfer. StudentEnrollments already keeps it here. */
  const transferAction = (item) => {
    if (item.enrollment_type !== "transfer") return null;
    const done = item.transfer_case_status === "completed";
    // The old column showed how far the transfer had got ("Records done").
    // An icon has no room for that, so it moves into the tooltip rather than
    // being dropped along with the column.
    const progress = done ? "completed" : (lastCompletedTransferLabel(item) || item.transfer_case_status || "pending");
    return (
      <button
        type="button"
        onClick={(e) => { e.stopPropagation(); setTransferStudent(item); }}
        title={`Transfer: ${progress}`}
        className={`p-1.5 rounded-lg transition-colors ${done ? "text-emerald-600 hover:bg-emerald-50" : "text-amber-600 hover:bg-amber-50"}`}
      >
        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
        </svg>
      </button>
    );
  };

  return (
    <>
      <CrudPage
        permissionBase={PERMISSION_BASES}
        key={refreshKey}
        title="Enrolled Students — Officially Registered"
        apiEndpoint="/student-management/students/list"
        deleteEndpoint="/student-management/students/delete"
        baseParams={PHASE_2_PARAMS}
        filters={enrolledFilters}
        listColumns={[
          { key: "student_id", label: "Student ID" },
          { key: "full_name", label: "Name", render: (_, item) => `${item.first_name} ${item.last_name}` },
          // Third, right after the student's own name: the column always held
          // the father's name, but "Family" read as though it were a household
          // or a family record, so nobody could tell what the value was.
          { key: "family", label: "Father Name", render: (_, item) => item.family?.father_name || "—" },
          { key: "school_class", label: "Class", render: (_, item) => item.school_class?.class_name || "—" },
          { key: "date_of_birth", label: "DOB", render: (v) => v ? fmtDate(v) : "—" },
          { key: "final_fee", label: "Monthly Fee", render: (v) => v ? `${Number(v).toLocaleString()} AFN` : "—" },
          {
            key: "uniform_invoice",
            label: "Uniform",
            render: (_, item) => {
              const ok = Boolean(item.need_uniform) && Number(item.uniform_price || 0) > 0;
              if (!ok) return <span className="text-xs text-gray-300">—</span>;
              if (!canInvoice) return <span className="text-xs text-gray-300">Needed</span>;
              return (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleUniformInvoice(item);
                  }}
                  className="inline-flex items-center gap-1 px-2.5 py-1 text-[10px] font-semibold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 rounded-lg"
                >
                  Invoice
                </button>
              );
            },
          },
          { key: "phase_2_completed_at", label: "Enrolled At", render: (v) => v ? fmtDate(v) : "—" },
          { key: "status", label: "Status", render: statusBadge },
          fatherPhoneColumn,
        ]}
        showRoute="/student-management/students/show"
        searchable={true}
        searchFields={["first_name", "last_name", "student_id"]}
        rowActions={(item) => (
          <>
            {/* Contact the family — WhatsApp or Call */}
            <FamilyContactButton family={item.family} />
            {transferAction(item)}
            {/* Edit EVERYTHING (phase 1 + phase 2 + family) in a modal */}
            {canUpdate && (
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); setEditStudentId(item.id); }}
                title="Edit all student data"
                className="p-1.5 text-teal-600 hover:bg-teal-50 rounded-lg transition-colors"
              >
                <FiEdit2 className="w-3.5 h-3.5" />
              </button>
            )}
          </>
        )}
      />

      {transferStudent && (
        <TransferStepsModal
          student={transferStudent}
          onClose={closeTransferModal}
          onSaved={bumpRefreshKey}
          readOnly={!canUpdate}
        />
      )}

      {editStudentId && (
        <StudentEditModal
          studentId={editStudentId}
          onClose={closeEditModal}
          onSaved={bumpRefreshKey}
        />
      )}
    </>
  );
}
