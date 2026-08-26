import CrudPage from "../../components/CrudPage";
import FamilyContactButton from "../studentMangement/FamilyContactButton";
import {
  METHODS, DIRECTIONS, CATEGORIES, OUTCOMES, FOLLOW_UP_STATUS, CONTACT_PERSON,
  Pill, optionsOf, labelOf, fmtDateTime, fmtDate, familyLabel, studentLabel, MUTED,
} from "./parentCommsUi";

/**
 * Communication Logs — every recorded contact with a family.
 *
 * The table shows the ten things you scan a log for; the Excel / Print export
 * carries the full record, including the long free-text fields nobody can read
 * in a table cell but everybody needs on a printed sheet. That split is what
 * `exportColumns` is for.
 *
 * Every cell that could wrap is pinned with `whitespace-nowrap` and a width.
 * A family name breaking across four lines turns a 15-row page into a scroll,
 * and the eye loses the row it was following.
 */

/** Family ID above, the parent's name below. One line each, never wrapping. */
const FamilyCell = (_, row) => (
  <div className="min-w-0 max-w-[190px]">
    <bdi dir="auto" className="block font-semibold text-[#0A3A3E] truncate">
      {row.family?.father_name || row.family?.mother_name || "—"}
    </bdi>
    <span className="block text-[10px] truncate" style={{ color: MUTED }}>
      {row.family?.family_id || ""}
    </span>
  </div>
);

const StudentCell = (_, row) =>
  row.student ? (
    <div className="min-w-0 max-w-[170px]">
      <bdi dir="auto" className="block truncate">
        {[row.student.first_name, row.student.last_name].filter(Boolean).join(" ")}
      </bdi>
      <span className="block text-[10px] truncate" style={{ color: MUTED }}>
        {row.student.student_id || ""}
      </span>
    </div>
  ) : (
    <span className="text-[11px] whitespace-nowrap" style={{ color: MUTED }}>Family-level</span>
  );

/** Full record for Excel / Print — one column per field, plain text throughout. */
const EXPORT_COLUMNS = [
  { key: "contacted_at", label: "Date & time", exportValue: (r) => fmtDateTime(r.contacted_at) },
  { key: "family_id", label: "Family ID", exportValue: (r) => r.family?.family_id || "" },
  { key: "family_name", label: "Family", exportValue: (r) => r.family?.father_name || r.family?.mother_name || "" },
  { key: "student", label: "Student", exportValue: (r) => (r.student ? studentLabel(r.student) : "Family-level") },
  { key: "class", label: "Class", exportValue: (r) => r.schoolClass?.class_name || "" },
  { key: "contact_person", label: "Who answered", exportValue: (r) => labelOf(CONTACT_PERSON, r.contact_person) },
  { key: "phone_used", label: "Phone used", exportValue: (r) => r.phone_used || "" },
  { key: "method", label: "Method", exportValue: (r) => labelOf(METHODS, r.method) },
  { key: "direction", label: "Initiated by", exportValue: (r) => labelOf(DIRECTIONS, r.direction) },
  { key: "category", label: "Purpose", exportValue: (r) => labelOf(CATEGORIES, r.category) },
  { key: "outcome", label: "Outcome", exportValue: (r) => labelOf(OUTCOMES, r.outcome) },
  { key: "subject", label: "Subject", exportValue: (r) => r.subject || "" },
  { key: "message_conveyed", label: "Conveyed to parents", exportValue: (r) => r.message_conveyed || "" },
  { key: "parent_response", label: "Received from parents", exportValue: (r) => r.parent_response || "" },
  { key: "parent_concerns", label: "Parent concerns", exportValue: (r) => r.parent_concerns || "" },
  { key: "follow_up_actions", label: "Follow-up actions", exportValue: (r) => r.follow_up_actions || "" },
  {
    key: "follow_up_status", label: "Follow-up",
    exportValue: (r) => (r.follow_up_status
      ? `${labelOf(FOLLOW_UP_STATUS, r.follow_up_status)}${r.follow_up_date ? ` (due ${fmtDate(r.follow_up_date)})` : ""}`
      : "Not needed"),
  },
  { key: "assignee", label: "Responsible staff", exportValue: (r) => r.assignee?.name || "" },
  { key: "department", label: "Department", exportValue: (r) => r.department?.name || "" },
  { key: "recorded_by", label: "Recorded by", exportValue: (r) => r.recordedBy?.name || "" },
  { key: "escalated", label: "Escalated", exportValue: (r) => (r.escalated ? "Yes" : "No") },
  { key: "attachments_count", label: "Attachments", exportValue: (r) => r.attachments_count || 0 },
  { key: "notes", label: "Notes", exportValue: (r) => r.notes || "" },
];

export default function ParentCommunications() {
  return (
    <CrudPage
      permissionBase="parent-communications"
      title="Communication Logs"
      apiEndpoint="/parent-communications/index"
      createRoute="/parent-communications/create"
      editRoute="/parent-communications/edit"
      showRoute="/parent-communications/show"
      deleteEndpoint="/parent-communications/delete"
      searchable
      searchFields={["subject", "family", "student", "phone"]}
      // Follow-up state is the only status this list changes, and the backend
      // gates that endpoint on .follow-up rather than .update.
      statusEndpoint="/parent-communications/status"
      statusField="follow_up_status"
      statusOptions={[
        { value: "pending", label: "Pending", color: "amber" },
        { value: "completed", label: "Completed", color: "emerald" },
        { value: "cancelled", label: "Cancelled", color: "gray" },
      ]}
      filters={[
        { key: "method", label: "Method", allLabel: "All methods", options: optionsOf(METHODS) },
        { key: "category", label: "Purpose", allLabel: "All purposes", options: optionsOf(CATEGORIES) },
        { key: "direction", label: "Initiated by", allLabel: "Either side", options: optionsOf(DIRECTIONS) },
        { key: "outcome", label: "Outcome", allLabel: "All outcomes", options: optionsOf(OUTCOMES) },
        { key: "follow_up_status", label: "Follow-up", allLabel: "Any state", options: optionsOf(FOLLOW_UP_STATUS) },
      ]}
      exportColumns={EXPORT_COLUMNS}
      listColumns={[
        {
          key: "contacted_at",
          label: "Date",
          render: (val) => (
            <span className="whitespace-nowrap text-[11px]">{fmtDateTime(val)}</span>
          ),
        },
        { key: "family", label: "Family", render: FamilyCell },
        { key: "student", label: "Student", render: StudentCell },
        {
          key: "subject",
          label: "Subject",
          render: (val) => (
            <bdi dir="auto" className="block max-w-[230px] truncate" title={val}>{val}</bdi>
          ),
        },
        {
          key: "method",
          label: "Method",
          render: (val) => <Pill map={METHODS} value={val} />,
        },
        {
          key: "category",
          label: "Purpose",
          render: (val) => <Pill map={CATEGORIES} value={val} />,
        },
        {
          key: "outcome",
          label: "Outcome",
          render: (val) => <Pill map={OUTCOMES} value={val} />,
        },
        {
          key: "follow_up_status",
          label: "Follow-up",
          render: (val, row) => {
            if (!val) {
              return <span style={{ color: MUTED }} className="text-[11px] whitespace-nowrap">Not needed</span>;
            }
            return (
              <div className="flex flex-col gap-0.5 whitespace-nowrap">
                <Pill map={FOLLOW_UP_STATUS} value={val} />
                {row.follow_up_date && (
                  <span className="text-[10px]" style={{ color: MUTED }}>
                    {fmtDate(row.follow_up_date)}
                  </span>
                )}
              </div>
            );
          },
        },
        {
          key: "recordedBy.name",
          label: "Recorded by",
          render: (val, row) => (
            <div className="whitespace-nowrap">
              <span className="text-[11px]">{val || "—"}</span>
              {/* The two flags that change how a row should be read, kept out
                  of columns of their own so the table stays inside the screen. */}
              {(row.escalated || row.attachments_count > 0) && (
                <div className="flex gap-1 mt-0.5">
                  {row.escalated && (
                    <span className="px-1.5 py-0.5 rounded text-[9px] font-bold border"
                      style={{ background: "#FAEAEF", color: "#B0546E", borderColor: "#EFCBD6" }}
                      title="Flagged for leadership">
                      Escalated
                    </span>
                  )}
                  {row.attachments_count > 0 && (
                    <span className="px-1.5 py-0.5 rounded text-[9px] font-bold border"
                      style={{ background: "#F4F8F8", color: MUTED, borderColor: "#D0E0E0" }}
                      title={`${row.attachments_count} attachment(s)`}>
                      {row.attachments_count} file
                    </span>
                  )}
                </div>
              )}
            </div>
          ),
        },
        {
          key: "phone_used",
          label: "Call",
          noExport: true,
          render: (_, row) => <FamilyContactButton family={row.family} />,
        },
      ]}
    />
  );
}
