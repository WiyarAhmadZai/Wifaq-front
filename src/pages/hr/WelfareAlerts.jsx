import { useState, useEffect } from "react";
import { useLocation } from "react-router-dom";
import { get, put } from "../../api/axios";
import Swal from "sweetalert2";
import { PageHeader, EmptyState, Spinner, Pill, StatGrid, DateField } from "../../components/hr/HrUI";
import Select2 from "../../components/hr/Select2";
import { useAuth } from "../../admin/context/AuthContext";

import { fmtDate } from "../../utils/formErrors";

const STATUS_TONE = { open: "amber", in_progress: "blue", resolved: "emerald" };
const WELFARE_ROLES = ["super-admin", "admin", "hr-manager", "welfare-officer"];

export default function WelfareAlerts() {
  const location = useLocation();
  const { hasRole } = useAuth() || {};
  const canManage = WELFARE_ROLES.some((r) => hasRole?.(r));
  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [filter, setFilter] = useState({ status: "" });
  const [editing, setEditing] = useState(null);

  useEffect(() => { fetchAll(); }, [filter, location.key]);

  const fetchAll = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams(Object.entries(filter).filter(([, v]) => v));
      const r = await get(`/welfare/alerts?${params}`);
      setAlerts(r.data?.data?.data || r.data?.data || []);
    } catch { setAlerts([]); }
    finally { setLoading(false); }
  };

  const open = alerts.filter(a => a.status === "open").length;
  const inProgress = alerts.filter(a => a.status === "in_progress").length;
  const resolved = alerts.filter(a => a.status === "resolved").length;

  return (
    <div className="min-h-screen bg-gray-50/60 px-4 py-5">
      <div className="max-w-full mx-auto">
        <PageHeader
          icon="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"
          title="Welfare Alerts"
          subtitle={canManage
            ? "Care signals — never performance signals. Triggered automatically when a check-in shows a low score or a staff member asks for support."
            : "Your welfare alerts and their status. The Welfare Officer is following these up privately — this is care, never a performance signal."}
        />

        <StatGrid stats={[
          { label: "Open", value: open, tone: open > 0 ? "red" : "teal", icon: "M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z", hint: "Need attention" },
          { label: "In progress", value: inProgress, tone: "blue", icon: "M13 10V3L4 14h7v7l9-11h-7z", hint: "Being worked on" },
          { label: "Resolved", value: resolved, tone: "emerald", icon: "M5 13l4 4L19 7", hint: "Care delivered" },
          { label: "Total this period", value: alerts.length, tone: "teal", icon: "M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3" },
        ]} />

        {/* Filters */}
        <div className="bg-white rounded-2xl border border-gray-100 p-3 mb-4 flex gap-2 flex-wrap">
          {["", "open", "in_progress", "resolved"].map(s => (
            <button key={s || "all"} onClick={() => setFilter({ status: s })}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors ${
                filter.status === s ? "bg-teal-600 text-white" : "bg-gray-50 text-gray-600 hover:bg-gray-100"
              }`}>
              {s ? s.replace("_", " ") : "All"}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="text-center py-12"><Spinner /></div>
        ) : alerts.length === 0 ? (
          <EmptyState
            icon="M5 13l4 4L19 7"
            title="No alerts"
            description="No staff currently need follow-up. The system will raise an alert automatically when a monthly check-in shows concerning scores or a staff member ticks 'I need support'."
          />
        ) : (
          <div className="space-y-3">
            {alerts.map(a => <AlertCard key={a.id} alert={a} canManage={canManage} onEdit={() => canManage && setEditing(a)} />)}
          </div>
        )}

        {editing && canManage && <AlertEditor alert={editing} onClose={() => setEditing(null)} onSaved={() => { setEditing(null); fetchAll(); }} />}
      </div>
    </div>
  );
}

function AlertCard({ alert, onEdit, canManage }) {
  const reasons = (alert.reason || "").split(",").filter(Boolean);

  return (
    <div className="bg-white rounded-2xl border border-gray-100 p-4 hover:shadow-md transition-shadow">
      <div className="flex items-start gap-3">
        <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${
          alert.status === "resolved" ? "bg-emerald-100 text-emerald-600" :
          alert.status === "in_progress" ? "bg-blue-100 text-blue-600" : "bg-amber-100 text-amber-600"
        }`}>
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 016.364 0L12 7.636l1.318-1.318a4.5 4.5 0 116.364 6.364L12 20.364l-7.682-7.682a4.5 4.5 0 010-6.364z" />
          </svg>
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <p className="text-sm font-bold text-gray-800 truncate">
              {alert.staff?.application?.full_name || `Staff #${alert.staff_id}`}
            </p>
            <Pill tone={STATUS_TONE[alert.status] || "gray"}>{alert.status?.replace("_", " ")}</Pill>
          </div>
          <div className="flex flex-wrap gap-1 mt-1.5">
            {reasons.map(r => (
              <span key={r} className="text-[10px] px-2 py-0.5 bg-amber-50 text-amber-700 rounded font-semibold">
                {r.replace(/_/g, " ")}
              </span>
            ))}
          </div>
          {alert.action_taken && (
            <div className="mt-2 p-2 bg-gray-50 rounded-lg text-[11px] text-gray-700 italic">
              "{alert.action_taken}"
            </div>
          )}
          <div className="flex items-center justify-between mt-3 pt-2 border-t border-gray-50">
            <div className="text-[10px] text-gray-400">
              Raised {fmtDate(alert.created_at)}
              {alert.assignee && ` · assigned to ${alert.assignee.name}`}
            </div>
            {canManage
              ? <button onClick={onEdit} className="text-[11px] font-semibold text-teal-700 hover:underline">Update →</button>
              : <span className="text-[10px] text-gray-400 italic">Welfare team following up</span>}
          </div>
        </div>
      </div>
    </div>
  );
}

function AlertEditor({ alert, onClose, onSaved }) {
  const [form, setForm] = useState({
    status: alert.status,
    action_taken: alert.action_taken || "",
    resolved_on: alert.resolved_on || "",
  });
  const [saving, setSaving] = useState(false);
  const inp = "w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-teal-500 focus:border-teal-500 bg-white outline-none";

  const submit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const payload = { ...form };
      if (form.status === "resolved" && !payload.resolved_on) payload.resolved_on = new Date().toISOString().split("T")[0];
      await put(`/welfare/alerts/${alert.id}`, payload);
      Swal.fire({ icon: "success", title: "Updated", timer: 1000, showConfirmButton: false });
      onSaved();
    } catch (err) { Swal.fire("Error", err.response?.data?.message || "Failed", "error"); }
    finally { setSaving(false); }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md" onClick={e => e.stopPropagation()}>
        <div className="px-5 py-4 border-b border-gray-100 bg-teal-50 rounded-t-2xl">
          <h3 className="text-sm font-bold text-teal-800">Update Welfare Alert</h3>
          <p className="text-[11px] text-teal-600 mt-0.5">For: {alert.staff?.application?.full_name}</p>
        </div>
        <form onSubmit={submit} className="p-5 space-y-3">
          <div>
            <label className="block text-[11px] font-semibold text-gray-500 uppercase mb-1.5">Status</label>
            <Select2
              value={form.status}
              onChange={(v) => setForm({ ...form, status: v || "open" })}
              options={[
                { value: "open", label: "Open" },
                { value: "in_progress", label: "In progress" },
                { value: "resolved", label: "Resolved" },
              ]}
              isClearable={false}
            />
          </div>
          <div>
            <label className="block text-[11px] font-semibold text-gray-500 uppercase mb-1.5">What care was given?</label>
            <textarea rows={4} className={inp} value={form.action_taken}
              onChange={(e) => setForm({ ...form, action_taken: e.target.value })}
              placeholder="e.g. Had a private chat, arranged salary advance, referred to counseling…" />
          </div>
          {form.status === "resolved" && (
            <div>
              <label className="block text-[11px] font-semibold text-gray-500 uppercase mb-1.5">Resolved on</label>
              <DateField className={inp} value={form.resolved_on}
                onChange={(e) => setForm({ ...form, resolved_on: e.target.value })} />
            </div>
          )}
          <div className="flex gap-2 pt-2">
            <button type="button" onClick={onClose} className="flex-1 px-4 py-2.5 border border-gray-200 text-gray-700 text-sm font-semibold rounded-xl hover:bg-gray-50">Cancel</button>
            <button type="submit" disabled={saving} className="flex-1 px-4 py-2.5 bg-teal-600 text-white text-sm font-semibold rounded-xl hover:bg-teal-700 disabled:opacity-50">
              {saving ? "Saving…" : "Save"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
