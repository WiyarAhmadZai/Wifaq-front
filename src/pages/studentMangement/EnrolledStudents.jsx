import { useState } from "react";
import CrudPage from "../../components/CrudPage";
import TransferStepsModal, { TRANSFER_STEPS } from "./TransferStepsModal";

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
  const [transferStudent, setTransferStudent] = useState(null);
  const [refreshKey, setRefreshKey] = useState(0);

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
        key={refreshKey}
        title="Enrolled Students — Officially Registered"
        apiEndpoint="/student-management/students/list"
        deleteEndpoint="/student-management/students/delete"
        baseParams={PHASE_2_PARAMS}
        listColumns={[
          { key: "student_id", label: "Student ID" },
          { key: "full_name", label: "Name", render: (_, item) => `${item.first_name} ${item.last_name}` },
          { key: "school_class", label: "Class", render: (_, item) => item.school_class?.class_name || "—" },
          { key: "family", label: "Family", render: (_, item) => item.family?.father_name || "—" },
          { key: "date_of_birth", label: "DOB", render: (v) => v ? new Date(v).toLocaleDateString() : "—" },
          { key: "final_fee", label: "Monthly Fee", render: (v) => v ? `${Number(v).toLocaleString()} AFN` : "—" },
          { key: "phase_2_completed_at", label: "Enrolled At", render: (v) => v ? new Date(v).toLocaleDateString() : "—" },
          { key: "status", label: "Status", render: statusBadge },
          transferColumn,
        ]}
        editRoute="/student-management/students/edit"
        showRoute="/student-management/students/show"
        searchable={true}
        searchFields={["first_name", "last_name", "student_id"]}
      />

      {transferStudent && (
        <TransferStepsModal
          student={transferStudent}
          onClose={() => setTransferStudent(null)}
          onSaved={() => setRefreshKey((k) => k + 1)}
        />
      )}
    </>
  );
}
