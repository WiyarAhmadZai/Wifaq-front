import { useCallback, useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import Swal from "sweetalert2";
import { get } from "../../api/axios";
import ListExportActions from "../../components/ListExportActions";
import FamilyContactButton from "../studentMangement/FamilyContactButton";
import {
  METHODS, DIRECTIONS, CATEGORIES, OUTCOMES, FOLLOW_UP_STATUS, CONTACT_PERSON,
  Pill, labelOf, fmtDate, fmtDateTime, familyLabel, studentLabel,
  TEAL, MUTED, BORDER,
} from "./parentCommsUi";

/**
 * One family's communication file — the "پرونده ارتباطی" the handbook (§14.2)
 * says every family must have: every contact, newest first, kept permanently.
 *
 * A timeline rather than a table, because this is read before picking up the
 * phone: what did we already tell them, what did they already say, and what did
 * we promise. Excel + Print export the same records as a flat sheet, which is
 * what a parent meeting or a handover actually needs on paper.
 */

/** Shared by both exports — the full record, one row per contact. */
const COLUMNS = [
  { key: "contacted_at", label: "Date & time", exportValue: (r) => fmtDateTime(r.contacted_at) },
  { key: "method", label: "Method", exportValue: (r) => labelOf(METHODS, r.method) },
  { key: "direction", label: "Initiated by", exportValue: (r) => labelOf(DIRECTIONS, r.direction) },
  { key: "category", label: "Purpose", exportValue: (r) => labelOf(CATEGORIES, r.category) },
  { key: "outcome", label: "Outcome", exportValue: (r) => labelOf(OUTCOMES, r.outcome) },
  { key: "contact_person", label: "Who answered", exportValue: (r) => labelOf(CONTACT_PERSON, r.contact_person) },
  { key: "student", label: "Student", exportValue: (r) => (r.student ? studentLabel(r.student) : "") },
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
  { key: "recordedBy", label: "Recorded by", exportValue: (r) => r.recordedBy?.name || "" },
  { key: "department", label: "Department", exportValue: (r) => r.department?.name || "" },
  {
    key: "attachments", label: "Attachments",
    exportValue: (r) => (r.attachments || []).map((a) => a.original_name).join(", "),
  },
  { key: "notes", label: "Notes", exportValue: (r) => r.notes || "" },
];

const Block = ({ label, value }) => {
  if (!value) return null;
  return (
    <div className="mt-2">
      <div className="text-[10px] font-bold uppercase tracking-wide" style={{ color: MUTED }}>{label}</div>
      <bdi dir="auto" className="block text-sm whitespace-pre-wrap leading-relaxed">{value}</bdi>
    </div>
  );
};

export default function ParentCommunicationHistory() {
  const { familyId } = useParams();
  const navigate = useNavigate();

  const [rows, setRows] = useState([]);
  const [family, setFamily] = useState(null);
  const [summary, setSummary] = useState({ total: 0, last_contact_at: null, open_follow_ups: 0 });
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      const res = await get(`/parent-communications/history/${familyId}`);
      setRows(res.data?.data || []);
      setFamily(res.data?.family || null);
      setSummary(res.data?.summary || {});
    } catch (e) {
      Swal.fire("Error", e.response?.data?.message || "Could not load this family's history.", "error");
    } finally {
      setLoading(false);
    }
  }, [familyId]);

  useEffect(() => { load(); }, [load]);

  if (loading) {
    return <div className="px-4 py-10 text-center text-sm" style={{ color: MUTED }}>Loading…</div>;
  }

  return (
    <div className="px-4 py-5 space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <button type="button" onClick={() => navigate(-1)}
            className="p-2 rounded-xl border border-gray-200 hover:bg-gray-50" title="Back">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
          </button>
          <div className="min-w-0">
            <bdi dir="auto" className="block text-lg font-bold text-gray-800 truncate">
              {familyLabel(family)}
            </bdi>
            <p className="text-xs mt-0.5" style={{ color: MUTED }}>
              {summary.total} contact(s) · last {fmtDate(summary.last_contact_at)} · {summary.open_follow_ups} open follow-up(s)
            </p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {family && <FamilyContactButton family={family} />}
          <ListExportActions
            getRows={() => rows}
            columns={COLUMNS}
            title={`Communication History - ${familyLabel(family)}`}
          />
          <Link to={`/parent-communications/create?family_id=${familyId}`}
            className="px-4 py-2.5 text-sm font-semibold rounded-xl bg-teal-600 text-white hover:bg-teal-700">
            Record a contact
          </Link>
        </div>
      </div>

      {rows.length === 0 ? (
        <div className="bg-white border rounded-2xl p-10 text-center text-sm" style={{ borderColor: BORDER, color: MUTED }}>
          Nothing recorded for this family yet.
        </div>
      ) : (
        <div className="space-y-4">
          {rows.map((r) => (
            <div key={r.id} className="bg-white border rounded-2xl p-5" style={{ borderColor: BORDER }}>
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2 mb-1">
                    <span className="text-[11px] font-bold" style={{ color: TEAL }}>
                      {fmtDateTime(r.contacted_at)}
                    </span>
                    <Pill map={METHODS} value={r.method} />
                    <Pill map={CATEGORIES} value={r.category} />
                    <Pill map={OUTCOMES} value={r.outcome} />
                    {r.escalated && (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold border"
                        style={{ background: "#FAEAEF", color: "#B0546E", borderColor: "#EFCBD6" }}>
                        Escalated
                      </span>
                    )}
                  </div>
                  <Link to={`/parent-communications/show/${r.id}`}>
                    <bdi dir="auto" className="block text-sm font-bold hover:underline" style={{ color: "#0A3A3E" }}>
                      {r.subject}
                    </bdi>
                  </Link>
                  <div className="text-[11px] mt-0.5" style={{ color: MUTED }}>
                    {labelOf(DIRECTIONS, r.direction)} · answered by {labelOf(CONTACT_PERSON, r.contact_person)}
                    {r.student && <> · {studentLabel(r.student)}</>}
                    {r.department?.name && <> · {r.department.name}</>}
                    {r.recordedBy?.name && <> · recorded by {r.recordedBy.name}</>}
                  </div>
                </div>
                {r.follow_up_status && (
                  <div className="flex flex-col items-end gap-0.5 flex-shrink-0">
                    <Pill map={FOLLOW_UP_STATUS} value={r.follow_up_status} />
                    {r.follow_up_date && (
                      <span className="text-[10px]" style={{ color: MUTED }}>due {fmtDate(r.follow_up_date)}</span>
                    )}
                    {r.assignee?.name && (
                      <span className="text-[10px]" style={{ color: MUTED }}>{r.assignee.name}</span>
                    )}
                  </div>
                )}
              </div>

              <Block label="Conveyed to parents" value={r.message_conveyed} />
              <Block label="Received from parents" value={r.parent_response} />
              <Block label="Parent concerns" value={r.parent_concerns} />
              <Block label="Follow-up actions" value={r.follow_up_actions} />
              <Block label="Notes" value={r.notes} />

              {(r.attachments || []).length > 0 && (
                <div className="mt-3 flex flex-wrap gap-2">
                  {r.attachments.map((a) => (
                    <a key={a.id} href={a.url} target="_blank" rel="noopener noreferrer"
                      className="px-2.5 py-1 text-[11px] font-semibold rounded-lg border underline"
                      style={{ borderColor: BORDER, color: TEAL }}>
                      {a.original_name}
                    </a>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
