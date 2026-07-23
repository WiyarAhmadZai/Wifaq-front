import { useState, useEffect } from "react";
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

const PHASE_2_PARAMS = { registration_status: "phase_2" };

export default function EnrolledStudents() {
  const navigate = useNavigate();
  const { hasPermission } = useAuth();
  const canUpdate = hasPermission("enrolled-students.update") || hasPermission("enrolled-students.manage");
  const [transferStudent, setTransferStudent] = useState(null);
  const [editStudentId, setEditStudentId] = useState(null);
  const [refreshKey, setRefreshKey] = useState(0);
  const [grades, setGrades] = useState([]);
  const [classes, setClasses] = useState([]);
  const [terms, setTerms] = useState([]);
  useEffect(() => {
    const __g = peekCache("/grades/list");
    if (__g) setGrades((__g?.data || __g || []).map((g) => ({ value: g.id, label: g.name })));
    const __c = peekCache("/class-management/classes/list?per_page=1000");
    if (__c) setClasses((__c?.data || __c || []).map((c) => ({ value: c.id, label: c.class_name })));
    const __t = peekCache("/academic-terms/list");
    if (__t) setTerms((__t?.data || __t || []).map((t) => ({ value: t.id, label: t.name })));
    get("/grades/list").then((r) => setGrades((r.data?.data || r.data || []).map((g) => ({ value: g.id, label: g.name })))).catch(() => {});
    get("/class-management/classes/list?per_page=1000").then((r) => setClasses((r.data?.data || r.data || []).map((c) => ({ value: c.id, label: c.class_name })))).catch(() => {});
    get("/academic-terms/list").then((r) => setTerms((r.data?.data || r.data || []).map((t) => ({ value: t.id, label: t.name })))).catch(() => {});
  }, []);
  const enrolledFilters = [
    { key: "grade_id", label: "Grade", options: grades },
    { key: "class_id", label: "Class", options: classes },
    { key: "academic_term_id", label: "Term", options: terms },
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

  const transferColumn = {
    key: "transfer_case_status",
    label: "Transfer",
    render: (_, item) => {
      if (item.enrollment_type !== "transfer") {
        return <span className="text-xs text-gray-300">—</span>;
      }
      if (item.transfer_case_status === "completed") {
        return (
          <button
            onClick={(e) => { e.stopPropagation(); setTransferStudent(item); }}
            className="inline-flex items-center gap-1 px-2 py-0.5 text-[10px] font-bold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded-full"
            title="Transfer process completed"
          >
            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
            </svg>
            completed
          </button>
        );
      }
      return (
        <button
          onClick={(e) => { e.stopPropagation(); setTransferStudent(item); }}
          className="inline-flex items-center gap-1 px-2 py-0.5 text-[10px] font-semibold text-amber-700 bg-amber-50 hover:bg-amber-100 border border-amber-200 rounded-full whitespace-nowrap"
        >
          {lastCompletedTransferLabel(item) || "Start"}
        </button>
      );
    },
  };

  return (
    <>
      <CrudPage
        permissionBase="enrolled-students"
        key={refreshKey}
        title="Enrolled Students — Officially Registered"
        apiEndpoint="/student-management/students/list"
        deleteEndpoint="/student-management/students/delete"
        baseParams={PHASE_2_PARAMS}
        filters={enrolledFilters}
        listColumns={[
          { key: "student_id", label: "Student ID" },
          { key: "full_name", label: "Name", render: (_, item) => `${item.first_name} ${item.last_name}` },
          { key: "school_class", label: "Class", render: (_, item) => item.school_class?.class_name || "—" },
          { key: "family", label: "Family", render: (_, item) => item.family?.father_name || "—" },
          { key: "date_of_birth", label: "DOB", render: (v) => v ? fmtDate(v) : "—" },
          { key: "final_fee", label: "Monthly Fee", render: (v) => v ? `${Number(v).toLocaleString()} AFN` : "—" },
          {
            key: "uniform_invoice",
            label: "Uniform",
            render: (_, item) => {
              const ok = Boolean(item.need_uniform) && Number(item.uniform_price || 0) > 0;
              if (!ok) return <span className="text-xs text-gray-300">—</span>;
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
          transferColumn,
        ]}
        showRoute="/student-management/students/show"
        searchable={true}
        searchFields={["first_name", "last_name", "student_id"]}
        rowActions={(item) => (
          <>
            {/* Contact the family — WhatsApp or Call */}
            <FamilyContactButton family={item.family} />
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
          onClose={() => setTransferStudent(null)}
          onSaved={() => setRefreshKey((k) => k + 1)}
        />
      )}

      {editStudentId && (
        <StudentEditModal
          studentId={editStudentId}
          onClose={() => setEditStudentId(null)}
          onSaved={() => setRefreshKey((k) => k + 1)}
        />
      )}
    </>
  );
}
