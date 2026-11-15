import { useCallback, useEffect, useMemo, useState } from "react";
import { Navigate } from "react-router-dom";
import Swal from "sweetalert2";
import { get } from "../../api/axios";
import ListExportActions from "../../components/ListExportActions";
import { useAuth } from "../../admin/context/AuthContext";
import {
  METHODS, CATEGORIES, OUTCOMES, labelOf, fmtDate, TEAL, MUTED, BORDER,
} from "./parentCommsUi";

/**
 * Reports — the monthly picture §14.3 asks the comms officer to hand in.
 *
 * The one number that is not just a count: the purpose mix. The handbook wants
 * roughly 40% care / 30% informational / 20% coordination / 10% accountability,
 * and says that a log dominated by accountability calls means the proactive
 * system has failed. So the mix is shown against its target, not on its own.
 *
 * Excel + Print use the shared ListExportActions, fed a flattened one-row-per-
 * metric table — a chart does not print usefully, a figure does.
 */

const REPORT_COLUMNS = [
  { key: "section", label: "Section" },
  { key: "metric", label: "Metric" },
  { key: "value", label: "Value" },
  { key: "detail", label: "Detail" },
];

const Card = ({ title, children }) => (
  <div className="bg-white border rounded-2xl p-5" style={{ borderColor: BORDER }}>
    <h2 className="text-sm font-bold mb-3" style={{ color: TEAL }}>{title}</h2>
    {children}
  </div>
);

const Bar = ({ value, max, color = TEAL }) => (
  <div className="h-2 rounded-full bg-gray-100 overflow-hidden">
    <div className="h-full rounded-full"
      style={{ width: `${max > 0 ? Math.round((value / max) * 100) : 0}%`, background: color }} />
  </div>
);

export default function ParentCommunicationReports() {
  const { hasPermission } = useAuth();
  // pathPermissions.js can only demand `.view` on this path, so the stricter
  // gate lives here — matching the `permission:` middleware on the endpoint.
  const canReport =
    hasPermission("parent-communications.report") || hasPermission("parent-communications.manage");

  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [range, setRange] = useState({ from: "", to: "" });

  const load = useCallback(async () => {
    if (!canReport) return;
    setLoading(true);
    try {
      const p = new URLSearchParams();
      if (range.from) p.append("from", range.from);
      if (range.to) p.append("to", range.to);
      const res = await get(`/parent-communications/report?${p.toString()}`);
      setData(res.data?.data || null);
    } catch (e) {
      Swal.fire("Error", e.response?.data?.message || "Could not load the report.", "error");
    } finally {
      setLoading(false);
    }
  }, [range, canReport]);

  useEffect(() => { load(); }, [load]);

  /** The report flattened to rows — what Excel and Print both receive. */
  const exportRows = useMemo(() => {
    if (!data) return [];
    const out = [];
    const period = range.from || range.to
      ? `${range.from || "start"} to ${range.to || "today"}`
      : "All time";

    Object.entries(data.totals || {}).forEach(([k, v]) =>
      out.push({
        section: "Totals",
        metric: k.replace(/_/g, " ").replace(/^./, (c) => c.toUpperCase()),
        value: v,
        detail: period,
      }));

    Object.entries(data.by_category || {}).forEach(([k, v]) =>
      out.push({
        section: "Purpose mix",
        metric: labelOf(CATEGORIES, k),
        value: v.count,
        detail: `${v.percent}% of contacts (target ${v.target}%)`,
      }));

    Object.entries(data.by_method || {}).forEach(([k, v]) =>
      out.push({ section: "By method", metric: labelOf(METHODS, k), value: v, detail: "" }));

    Object.entries(data.by_outcome || {}).forEach(([k, v]) =>
      out.push({ section: "By outcome", metric: labelOf(OUTCOMES, k), value: v, detail: "" }));

    Object.entries(data.by_month || {}).forEach(([k, v]) =>
      out.push({ section: "By month", metric: k, value: v, detail: "" }));

    Object.entries(data.by_staff || {}).forEach(([k, v]) =>
      out.push({ section: "By staff member", metric: k, value: v, detail: "" }));

    // Coverage: the families NOT heard from. The handbook asks for one care
    // contact with every family each month, so the silence is a figure the
    // report owes just as much as the activity.
    const cov = data.coverage || {};
    out.push({ section: "Coverage", metric: "Families on the roll", value: cov.families_total ?? 0, detail: "" });
    out.push({ section: "Coverage", metric: "Contacted in this period", value: cov.contacted_in_period ?? 0, detail: "" });
    out.push({ section: "Coverage", metric: "Never contacted", value: cov.never_contacted ?? 0, detail: "" });
    out.push({ section: "Coverage", metric: "Silent over 30 days", value: cov.silent_over_30_days ?? 0, detail: `${cov.percent_covered ?? 0}% covered` });
    (cov.list || []).forEach((f) =>
      out.push({
        section: "Families to call",
        metric: `${f.family_id || ""} ${f.name || ""}`.trim(),
        value: f.phone || "no number",
        detail: f.last_contact_at ? `last contact ${fmtDate(f.last_contact_at)} (${f.days_since} days)` : "never contacted",
      }));

    // Numbers that do not work — a work list for fixing family records.
    (data.contact_data_issues || []).forEach((f) =>
      out.push({
        section: "Contact data to fix",
        metric: `${f.family_id || ""} ${f.name || ""}`.trim(),
        value: f.phone || "no number",
        detail: `${f.dead_number ? "dead number" : "no answer"} - ${f.failed_attempts} failed attempt(s), last ${fmtDate(f.last_attempt_at)}`,
      }));

    return out;
  }, [data, range]);

  const maxMethod = Math.max(1, ...Object.values(data?.by_method || { a: 0 }));
  const maxMonth = Math.max(1, ...Object.values(data?.by_month || { a: 0 }));
  const maxStaff = Math.max(1, ...Object.values(data?.by_staff || { a: 0 }));

  if (!canReport) return <Navigate to="/403" replace />;

  return (
    <div className="px-4 py-5 space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-lg font-bold text-gray-800">Communication Reports</h1>
          <p className="text-xs mt-0.5" style={{ color: MUTED }}>
            How many contacts, through which channel, for what purpose — and how the mix compares with the target.
          </p>
        </div>
        <ListExportActions
          getRows={() => exportRows}
          columns={REPORT_COLUMNS}
          title="Parent Communication Report"
        />
      </div>

      {/* Period */}
      <div className="bg-white border rounded-2xl p-4 flex flex-col sm:flex-row gap-3 items-end" style={{ borderColor: BORDER }}>
        <div>
          <label className="block text-[11px] font-semibold text-gray-600 mb-1">From</label>
          <input type="date" value={range.from} onChange={(e) => setRange((r) => ({ ...r, from: e.target.value }))}
            className="px-3 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500/30" />
        </div>
        <div>
          <label className="block text-[11px] font-semibold text-gray-600 mb-1">To</label>
          <input type="date" value={range.to} onChange={(e) => setRange((r) => ({ ...r, to: e.target.value }))}
            className="px-3 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500/30" />
        </div>
        {(range.from || range.to) && (
          <button onClick={() => setRange({ from: "", to: "" })}
            className="px-4 py-2.5 text-sm font-semibold rounded-xl border border-gray-200 text-gray-700 hover:bg-gray-50">
            Clear
          </button>
        )}
      </div>

      {loading && <div className="py-10 text-center text-sm" style={{ color: MUTED }}>Loading…</div>}

      {!loading && data && (
        <>
          {/* Totals */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            {[
              ["communications", "Total contacts", true],
              ["families_reached", "Families contacted"],
              ["reached", "Actually reached"],
              ["unreachable", "Could not reach"],
              ["follow_ups_open", "Open follow-ups"],
              ["escalated", "Escalated"],
              ["school_initiated", "School initiated"],
              ["parent_initiated", "Parent initiated"],
            ].map(([key, label, filled]) => (
              <div key={key}
                className={`px-5 py-4 rounded-2xl border ${filled ? "bg-teal-600 border-teal-600" : "bg-white border-teal-100"}`}>
                <div className={`text-xl font-bold ${filled ? "text-white" : "text-gray-800"}`}>
                  {data.totals?.[key] ?? 0}
                </div>
                <div className={`text-[11px] font-semibold ${filled ? "text-white/80" : "text-gray-500"}`}>{label}</div>
              </div>
            ))}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            {/* Purpose mix vs target */}
            <Card title="Purpose mix vs the handbook target">
              <div className="space-y-3">
                {Object.entries(data.by_category || {}).map(([key, v]) => {
                  const off = v.percent - (v.target ?? 0);
                  return (
                    <div key={key}>
                      <div className="flex items-center justify-between text-[11px] mb-1">
                        <span className="font-semibold">{labelOf(CATEGORIES, key)}</span>
                        <span style={{ color: MUTED }}>
                          {v.count} · {v.percent}% <span className="opacity-70">(target {v.target}%)</span>{" "}
                          <span className={off >= 0 ? "text-emerald-600" : "text-rose-600"}>
                            {off >= 0 ? `+${off}` : off}
                          </span>
                        </span>
                      </div>
                      <Bar value={v.percent} max={100} color={CATEGORIES[key]?.fg || TEAL} />
                    </div>
                  );
                })}
              </div>
              <p className="text-[11px] mt-4 leading-relaxed" style={{ color: MUTED }}>
                A log dominated by accountability calls means the proactive system has stopped working — the
                handbook treats that as the signal to fix, not the number to hit.
              </p>
            </Card>

            {/* Method */}
            <Card title="By method">
              <div className="space-y-3">
                {Object.entries(data.by_method || {}).map(([key, v]) => (
                  <div key={key}>
                    <div className="flex items-center justify-between text-[11px] mb-1">
                      <span className="font-semibold">{labelOf(METHODS, key)}</span>
                      <span style={{ color: MUTED }}>{v}</span>
                    </div>
                    <Bar value={v} max={maxMethod} />
                  </div>
                ))}
              </div>
            </Card>

            {/* Outcome */}
            <Card title="By outcome">
              <table className="w-full text-sm">
                <tbody>
                  {Object.entries(data.by_outcome || {}).map(([key, v]) => (
                    <tr key={key} className="border-b last:border-0" style={{ borderColor: "#EEF4F4" }}>
                      <td className="py-2">{labelOf(OUTCOMES, key)}</td>
                      <td className="py-2 text-right font-bold">{v}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <p className="text-[11px] mt-3 leading-relaxed" style={{ color: MUTED }}>
                Wrong or dead numbers are a data-quality problem, not a conversation — each one is a family
                record that needs its phone number corrected.
              </p>
            </Card>

            {/* Month */}
            <Card title="By month">
              <div className="space-y-3">
                {Object.entries(data.by_month || {}).map(([key, v]) => (
                  <div key={key}>
                    <div className="flex items-center justify-between text-[11px] mb-1">
                      <span className="font-semibold">{key}</span>
                      <span style={{ color: MUTED }}>{v}</span>
                    </div>
                    <Bar value={v} max={maxMonth} />
                  </div>
                ))}
                {Object.keys(data.by_month || {}).length === 0 && (
                  <p className="text-sm" style={{ color: MUTED }}>No contacts in this period.</p>
                )}
              </div>
            </Card>

            {/* Coverage — who has NOT been heard from */}
            <Card title="Coverage — families to call">
              <div className="grid grid-cols-2 gap-3 mb-4">
                {[
                  ["families_total", "On the roll"],
                  ["contacted_in_period", "Contacted"],
                  ["never_contacted", "Never contacted"],
                  ["silent_over_30_days", "Silent 30+ days"],
                ].map(([k, label]) => (
                  <div key={k} className="px-3 py-2 rounded-xl border" style={{ borderColor: BORDER }}>
                    <div className="text-lg font-bold text-gray-800">{data.coverage?.[k] ?? 0}</div>
                    <div className="text-[10px] font-semibold" style={{ color: MUTED }}>{label}</div>
                  </div>
                ))}
              </div>
              <div className="flex items-center justify-between text-[11px] mb-1">
                <span className="font-semibold">Contacted within 30 days</span>
                <span style={{ color: MUTED }}>{data.coverage?.percent_covered ?? 0}%</span>
              </div>
              <Bar value={data.coverage?.percent_covered ?? 0} max={100} color="#2E7D5B" />

              <div className="mt-4 max-h-64 overflow-y-auto">
                {(data.coverage?.list || []).length === 0 ? (
                  <p className="text-sm" style={{ color: MUTED }}>Every family has been contacted in the last 30 days.</p>
                ) : (
                  <table className="w-full text-[12px]">
                    <tbody>
                      {data.coverage.list.map((f) => (
                        <tr key={f.id} className="border-b last:border-0" style={{ borderColor: "#EEF4F4" }}>
                          <td className="py-1.5 pr-2">
                            <bdi dir="auto" className="block font-semibold">{f.name || f.family_id}</bdi>
                            <span style={{ color: MUTED }}>{f.phone || "no number on record"}</span>
                          </td>
                          <td className="py-1.5 text-right whitespace-nowrap" style={{ color: MUTED }}>
                            {f.last_contact_at ? `${f.days_since}d ago` : "never"}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
              <p className="text-[11px] mt-3 leading-relaxed" style={{ color: MUTED }}>
                The handbook asks for at least one care contact with every family each month — so this list,
                longest silence first, is the call order.
              </p>
            </Card>

            {/* Contact data quality */}
            <Card title="Contact data to fix">
              {(data.contact_data_issues || []).length === 0 ? (
                <p className="text-sm" style={{ color: MUTED }}>Every number on record is working.</p>
              ) : (
                <div className="max-h-72 overflow-y-auto">
                  <table className="w-full text-[12px]">
                    <tbody>
                      {data.contact_data_issues.map((f) => (
                        <tr key={f.id} className="border-b last:border-0" style={{ borderColor: "#EEF4F4" }}>
                          <td className="py-1.5 pr-2">
                            <bdi dir="auto" className="block font-semibold">{f.name || f.family_id}</bdi>
                            <span style={{ color: MUTED }}>{f.phone || "no number on record"}</span>
                          </td>
                          <td className="py-1.5 text-right whitespace-nowrap">
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold border"
                              style={f.dead_number
                                ? { background: "#FAEAEF", color: "#B0546E", borderColor: "#EFCBD6" }
                                : { background: "#FFF8E7", color: "#8A6F10", borderColor: "#E8D48B" }}>
                              {f.dead_number ? "dead number" : `${f.failed_attempts} no-answer`}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
              <p className="text-[11px] mt-3 leading-relaxed" style={{ color: MUTED }}>
                A number that fails repeatedly is a wrong number, not a scheduling problem — fix the family
                record before anyone dials again.
              </p>
            </Card>

            {/* Staff */}
            <Card title="By staff member">
              <div className="space-y-3">
                {Object.entries(data.by_staff || {}).map(([key, v]) => (
                  <div key={key}>
                    <div className="flex items-center justify-between text-[11px] mb-1">
                      <span className="font-semibold">{key}</span>
                      <span style={{ color: MUTED }}>{v}</span>
                    </div>
                    <Bar value={v} max={maxStaff} />
                  </div>
                ))}
                {Object.keys(data.by_staff || {}).length === 0 && (
                  <p className="text-sm" style={{ color: MUTED }}>No contacts in this period.</p>
                )}
              </div>
            </Card>
          </div>
        </>
      )}
    </div>
  );
}
