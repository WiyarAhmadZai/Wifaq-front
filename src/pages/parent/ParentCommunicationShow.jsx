import { useCallback, useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import Swal from "sweetalert2";
import { get, post, put, del } from "../../api/axios";
import Modal from "../../components/Modal";
import Select2 from "../../components/hr/Select2";
import { useAuth } from "../../admin/context/AuthContext";
import { useResourcePermissions } from "../../admin/utils/useResourcePermissions";
import {
  METHODS, DIRECTIONS, CATEGORIES, OUTCOMES, FOLLOW_UP_STATUS, CONTACT_PERSON,
  Pill, labelOf, fmtDate, fmtDateTime, familyLabel, studentLabel,
  isOverdue, TEAL, MUTED, BORDER,
} from "./parentCommsUi";

/**
 * One communication in full, plus its follow-up chain and attachments.
 *
 * Layout follows the project's show-page pattern: details in the wide left
 * column, summary and actions in the narrow right one.
 *
 * Every follow-up control on this page is gated on
 * `parent-communications.follow-up` — and the backend gates the same endpoints
 * on the same permission, so hiding the button is a convenience, not the lock.
 */

const Card = ({ title, children, right }) => (
  <div className="bg-white border rounded-2xl p-5" style={{ borderColor: BORDER }}>
    <div className="flex items-center justify-between mb-3">
      <h2 className="text-sm font-bold" style={{ color: TEAL }}>{title}</h2>
      {right}
    </div>
    {children}
  </div>
);

const Row = ({ label, children }) => (
  <div className="py-2 border-b last:border-0" style={{ borderColor: "#EEF4F4" }}>
    <div className="text-[11px] font-semibold mb-0.5" style={{ color: MUTED }}>{label}</div>
    <div className="text-sm" style={{ color: "#0A3A3E" }}>{children ?? "—"}</div>
  </div>
);

const Prose = ({ value }) =>
  value
    ? <bdi dir="auto" className="block whitespace-pre-wrap text-sm leading-relaxed">{value}</bdi>
    : <span style={{ color: MUTED }}>—</span>;

export default function ParentCommunicationShow() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { hasPermission } = useAuth();
  const { canUpdate, canDelete } = useResourcePermissions("parent-communications");
  const canFollowUp =
    hasPermission("parent-communications.follow-up") || hasPermission("parent-communications.manage");

  const [record, setRecord] = useState(null);
  const [staff, setStaff] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [draft, setDraft] = useState({ action: "", due_date: "", assigned_to: "", notes: "" });

  const load = useCallback(async () => {
    try {
      const res = await get(`/parent-communications/show/${id}`);
      setRecord(res.data?.data || null);
    } catch {
      Swal.fire("Error", "Could not load this record.", "error");
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    if (!canFollowUp) return;
    get("/parent-communications/form-data", { cache: false })
      .then((res) => setStaff(res.data?.data?.staff || []))
      .catch(() => { /* the picker just stays empty */ });
  }, [canFollowUp]);

  const addFollowup = async () => {
    if (!draft.action.trim()) {
      Swal.fire("Required", "Describe what needs to be done.", "warning");
      return;
    }
    setSaving(true);
    try {
      await post(`/parent-communications/follow-ups/${id}`, draft);
      setModalOpen(false);
      setDraft({ action: "", due_date: "", assigned_to: "", notes: "" });
      await load();
      Swal.fire({ icon: "success", title: "Follow-up added", timer: 1400, showConfirmButton: false });
    } catch (e) {
      Swal.fire("Error", e.response?.data?.message || "Could not add the follow-up.", "error");
    } finally {
      setSaving(false);
    }
  };

  const setFollowupStatus = async (followup, status) => {
    try {
      await put(`/parent-communications/follow-ups/item/${followup.id}`, { status });
      await load();
    } catch (e) {
      Swal.fire("Error", e.response?.data?.message || "Could not update the follow-up.", "error");
    }
  };

  const removeAttachment = async (attachment) => {
    const ok = await Swal.fire({
      title: "Remove this file?",
      text: attachment.original_name,
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#e11d48",
      confirmButtonText: "Remove",
    });
    if (!ok.isConfirmed) return;
    try {
      await del(`/parent-communications/attachments/${attachment.id}`);
      await load();
    } catch (e) {
      Swal.fire("Error", e.response?.data?.message || "Could not remove the file.", "error");
    }
  };

  const removeRecord = async () => {
    const ok = await Swal.fire({
      title: "Delete this communication?",
      text: "It stays recoverable from Trash, but it leaves the family's file.",
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#e11d48",
      confirmButtonText: "Delete",
    });
    if (!ok.isConfirmed) return;
    try {
      await del(`/parent-communications/delete/${id}`);
      navigate("/parent-communications");
    } catch (e) {
      Swal.fire("Error", e.response?.data?.message || "Could not delete the record.", "error");
    }
  };

  if (loading) {
    return <div className="px-4 py-10 text-center text-sm" style={{ color: MUTED }}>Loading…</div>;
  }
  if (!record) {
    return <div className="px-4 py-10 text-center text-sm" style={{ color: MUTED }}>Record not found.</div>;
  }

  return (
    <div className="px-4 py-5 space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <button type="button" onClick={() => navigate(-1)}
            className="p-2 rounded-xl border border-gray-200 hover:bg-gray-50" title="Back">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
          </button>
          <div className="min-w-0">
            <bdi dir="auto" className="block text-lg font-bold text-gray-800 truncate">{record.subject}</bdi>
            <p className="text-xs mt-0.5" style={{ color: MUTED }}>
              {fmtDateTime(record.contacted_at)} · {labelOf(METHODS, record.method)}
            </p>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          {record.family?.id && (
            <Link to={`/parent-communications/history/${record.family.id}`}
              className="px-4 py-2.5 text-sm font-semibold rounded-xl border border-gray-200 text-gray-700 hover:bg-gray-50">
              Family history
            </Link>
          )}
          {canUpdate && (
            <Link to={`/parent-communications/edit/${record.id}`}
              className="px-4 py-2.5 text-sm font-semibold rounded-xl bg-teal-600 text-white hover:bg-teal-700">
              Edit
            </Link>
          )}
          {canDelete && (
            <button onClick={removeRecord}
              className="px-4 py-2.5 text-sm font-semibold rounded-xl border border-rose-200 text-rose-700 hover:bg-rose-50">
              Delete
            </button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Left — the conversation */}
        <div className="lg:col-span-2 space-y-5">
          <Card title="The conversation">
            <div className="space-y-4">
              <div>
                <div className="text-[11px] font-semibold mb-1" style={{ color: MUTED }}>
                  What was conveyed to the parents
                </div>
                <Prose value={record.message_conveyed} />
              </div>
              <div className="pt-3 border-t" style={{ borderColor: "#EEF4F4" }}>
                <div className="text-[11px] font-semibold mb-1" style={{ color: MUTED }}>
                  What was received from the parents
                </div>
                <Prose value={record.parent_response} />
              </div>
              <div className="pt-3 border-t" style={{ borderColor: "#EEF4F4" }}>
                <div className="text-[11px] font-semibold mb-1" style={{ color: MUTED }}>
                  Parent concerns or questions
                </div>
                <Prose value={record.parent_concerns} />
              </div>
              <div className="pt-3 border-t" style={{ borderColor: "#EEF4F4" }}>
                <div className="text-[11px] font-semibold mb-1" style={{ color: MUTED }}>
                  Follow-up actions needed
                </div>
                <Prose value={record.follow_up_actions} />
              </div>
              <div className="pt-3 border-t" style={{ borderColor: "#EEF4F4" }}>
                <div className="text-[11px] font-semibold mb-1" style={{ color: MUTED }}>Additional notes</div>
                <Prose value={record.notes} />
              </div>
            </div>
          </Card>

          <Card
            title="Follow-ups"
            right={canFollowUp && (
              <button onClick={() => setModalOpen(true)}
                className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-teal-600 text-white hover:bg-teal-700">
                Add follow-up
              </button>
            )}
          >
            {(record.followups || []).length === 0 ? (
              <p className="text-sm" style={{ color: MUTED }}>No follow-up was recorded for this contact.</p>
            ) : (
              <div className="space-y-3">
                {record.followups.map((f) => (
                  <div key={f.id} className="p-3 rounded-xl border" style={{ borderColor: BORDER }}>
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <bdi dir="auto" className="block text-sm font-semibold">{f.action}</bdi>
                        <div className="text-[11px] mt-1 flex flex-wrap gap-x-3 gap-y-0.5" style={{ color: MUTED }}>
                          <span>Due {fmtDate(f.due_date)}</span>
                          <span>Owner: {f.assignee?.name || "unassigned"}</span>
                          {f.completed_at && <span>Closed {fmtDate(f.completed_at)} by {f.completedBy?.name || "—"}</span>}
                          {isOverdue(f) && <span className="font-bold text-rose-600">Overdue</span>}
                        </div>
                        {f.notes && <Prose value={f.notes} />}
                      </div>
                      <div className="flex flex-col items-end gap-1.5 flex-shrink-0">
                        <Pill map={FOLLOW_UP_STATUS} value={f.status} />
                        {canFollowUp && f.status === "pending" && (
                          <div className="flex gap-1">
                            <button onClick={() => setFollowupStatus(f, "completed")}
                              className="px-2 py-1 text-[10px] font-semibold rounded-md border border-emerald-200 text-emerald-700 hover:bg-emerald-50">
                              Complete
                            </button>
                            <button onClick={() => setFollowupStatus(f, "cancelled")}
                              className="px-2 py-1 text-[10px] font-semibold rounded-md border border-gray-200 text-gray-600 hover:bg-gray-50">
                              Cancel
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>

          <Card title="Attachments">
            {(record.attachments || []).length === 0 ? (
              <p className="text-sm" style={{ color: MUTED }}>No files attached.</p>
            ) : (
              <ul className="space-y-2">
                {record.attachments.map((a) => (
                  <li key={a.id} className="flex items-center justify-between gap-3 p-2.5 rounded-xl border"
                    style={{ borderColor: BORDER }}>
                    <a href={a.url} target="_blank" rel="noopener noreferrer"
                      className="text-sm font-semibold underline truncate" style={{ color: TEAL }}>
                      {a.original_name}
                    </a>
                    {canUpdate && (
                      <button onClick={() => removeAttachment(a)}
                        className="text-[11px] font-semibold text-rose-600 hover:underline flex-shrink-0">
                        Remove
                      </button>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </div>

        {/* Right — who, when, how */}
        <div className="space-y-5">
          <Card title="Summary">
            <Row label="Family">
              {record.family?.id ? (
                <Link to={`/student-management/parents/show/${record.family.id}`}
                  className="underline" style={{ color: TEAL }}>
                  {familyLabel(record.family)}
                </Link>
              ) : familyLabel(record.family)}
            </Row>
            <Row label="Student">{record.student ? studentLabel(record.student) : "Family-level contact"}</Row>
            <Row label="Class">{record.schoolClass?.class_name}</Row>
            <Row label="Who answered">{labelOf(CONTACT_PERSON, record.contact_person)}</Row>
            <Row label="Phone used">{record.phone_used}</Row>
            <Row label="Date & time">{fmtDateTime(record.contacted_at)}</Row>
            <Row label="Method"><Pill map={METHODS} value={record.method} /></Row>
            <Row label="Initiated by">{labelOf(DIRECTIONS, record.direction)}</Row>
            <Row label="Purpose"><Pill map={CATEGORIES} value={record.category} /></Row>
            <Row label="Outcome"><Pill map={OUTCOMES} value={record.outcome} /></Row>
            <Row label="Department">{record.department?.name}</Row>
            <Row label="Recorded by">{record.recordedBy?.name}</Row>
            <Row label="Responsible staff">{record.assignee?.name}</Row>
            <Row label="Follow-up">
              {record.follow_up_status
                ? <span className="inline-flex items-center gap-2">
                    <Pill map={FOLLOW_UP_STATUS} value={record.follow_up_status} />
                    {record.follow_up_date && <span className="text-[11px]" style={{ color: MUTED }}>
                      due {fmtDate(record.follow_up_date)}
                    </span>}
                  </span>
                : "Not needed"}
            </Row>
            <Row label="Escalated">{record.escalated ? "Yes — flagged for leadership" : "No"}</Row>
          </Card>
        </div>
      </div>

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title="Add a follow-up"
        subtitle="Anything promised to a parent, with a date and an owner."
        footer={
          <div className="flex justify-end gap-2">
            <button onClick={() => setModalOpen(false)}
              className="px-4 py-2.5 text-sm font-semibold rounded-xl border border-gray-200 text-gray-700 hover:bg-gray-50">
              Cancel
            </button>
            <button onClick={addFollowup} disabled={saving}
              className="px-4 py-2.5 text-sm font-semibold rounded-xl bg-teal-600 text-white hover:bg-teal-700 disabled:opacity-50">
              {saving ? "Saving…" : "Add follow-up"}
            </button>
          </div>
        }>
        <div className="space-y-3">
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1.5">What needs to be done *</label>
            <textarea rows={2} dir="auto" value={draft.action}
              onChange={(e) => setDraft({ ...draft, action: e.target.value })}
              className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500/30" />
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1.5">Due date</label>
            <input type="date" value={draft.due_date}
              onChange={(e) => setDraft({ ...draft, due_date: e.target.value })}
              className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500/30" />
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1.5">Responsible staff</label>
            <Select2 value={draft.assigned_to}
              onChange={(v) => setDraft({ ...draft, assigned_to: v || "" })}
              options={staff.map((s) => ({ value: s.id, label: s.name }))}
              placeholder="Who will do it…" />
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1.5">Notes</label>
            <textarea rows={2} dir="auto" value={draft.notes}
              onChange={(e) => setDraft({ ...draft, notes: e.target.value })}
              className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500/30" />
          </div>
        </div>
      </Modal>
    </div>
  );
}
