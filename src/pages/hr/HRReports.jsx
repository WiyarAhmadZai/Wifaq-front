import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { get } from "../../api/axios";

const CircularProgress = ({ percentage, size = 56, color = "text-teal-600" }) => {
  const sw = 5, r = (size - sw) / 2, c = r * 2 * Math.PI, off = c - (percentage / 100) * c;
  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg className="transform -rotate-90" width={size} height={size}>
        <circle cx={size/2} cy={size/2} r={r} stroke="currentColor" strokeWidth={sw} fill="transparent" className="text-gray-100" />
        <circle cx={size/2} cy={size/2} r={r} stroke="currentColor" strokeWidth={sw} fill="transparent" strokeDasharray={c} strokeDashoffset={off} className={color} strokeLinecap="round" />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center"><span className="text-xs font-black text-gray-800">{percentage}%</span></div>
    </div>
  );
};

const BarChart = ({ data }) => {
  const max = Math.max(...data.map((d) => d.value), 1);
  return (
    <div className="flex items-end justify-between gap-2 h-32">
      {data.map((d) => (
        <div key={d.label} className="flex-1 flex flex-col items-center gap-1.5">
          <span className="text-[10px] font-bold text-gray-700">{d.value}</span>
          <div className={`w-full rounded-t-lg ${d.color} transition-all duration-700`} style={{ height: `${Math.max((d.value / max) * 100, 4)}%` }} />
          <span className="text-[9px] text-gray-500 font-medium text-center leading-tight">{d.label}</span>
        </div>
      ))}
    </div>
  );
};

const MiniStat = ({ label, value, color, textColor }) => (
  <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-3 text-center hover:shadow-md transition-shadow">
    <p className={`text-2xl font-black ${textColor}`}>{value}</p>
    <p className="text-[9px] font-semibold text-gray-500 uppercase tracking-wider mt-1">{label}</p>
    <div className={`h-1 ${color} rounded-full mt-2 mx-auto w-8`} />
  </div>
);

const Section = ({ title, subtitle, children, action, onAction }) => (
  <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
    <div className="px-5 py-3 border-b border-gray-100 flex items-center justify-between">
      <div><h3 className="text-sm font-bold text-gray-800">{title}</h3>{subtitle && <p className="text-[10px] text-gray-400">{subtitle}</p>}</div>
      {action && <button onClick={onAction} className="text-[10px] text-teal-600 hover:text-teal-700 font-semibold">{action}</button>}
    </div>
    <div className="p-5">{children}</div>
  </div>
);

export default function HRReports() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [d, setD] = useState(null);

  useEffect(() => {
    get("/hr/reports/dashboard")
      .then((res) => setD(res.data?.data || {}))
      .catch(() => setD({}))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return (
    <div className="min-h-[60vh] flex items-center justify-center">
      <div className="flex flex-col items-center gap-3">
        <div className="animate-spin rounded-full h-10 w-10 border-4 border-teal-100 border-t-teal-600"></div>
        <p className="text-xs text-gray-400">Loading HR reports...</p>
      </div>
    </div>
  );

  if (!d) return null;

  const s = d.staff || {};
  const c = d.contracts || {};
  const l = d.leaves || {};
  const a = d.attendance || {};
  const t = d.tasks || {};
  const v = d.visitors || {};
  const m = d.meetings || {};
  const e = d.events || {};

  const totalStaff = Number(s.total) || 0;
  const activeRate = totalStaff > 0 ? Math.round((Number(s.active) / totalStaff) * 100) : 0;
  const attRate = totalStaff > 0 ? Math.round((Number(a.present) / totalStaff) * 100) : 0;
  const totalTasks = Number(t.total) || 0;
  const taskRate = totalTasks > 0 ? Math.round((Number(t.completed) / totalTasks) * 100) : 0;

  const deptColors = ["bg-teal-500", "bg-blue-500", "bg-amber-500", "bg-purple-500", "bg-emerald-500", "bg-red-400", "bg-cyan-500", "bg-orange-500"];

  return (
    <div className="min-h-screen bg-gray-50/60">
      <div className="bg-teal-600 px-5 py-5">
        <h1 className="text-lg font-black text-white">HR Reports & Analytics</h1>
        <p className="text-xs text-teal-100 mt-1">Comprehensive overview of all HR operations</p>
        <div className="flex items-center gap-2 mt-3">
          <span className="px-2.5 py-0.5 bg-white/20 text-white text-[10px] font-semibold rounded-full">{totalStaff} Staff</span>
          <span className="px-2.5 py-0.5 bg-white/20 text-white text-[10px] font-semibold rounded-full">{Number(c.total) || 0} Contracts</span>
          <span className="px-2.5 py-0.5 bg-white/20 text-white text-[10px] font-semibold rounded-full">{Number(l.total) || 0} Leave Requests</span>
          <span className="px-2.5 py-0.5 bg-white/20 text-white text-[10px] font-semibold rounded-full">{totalTasks} Tasks</span>
        </div>
      </div>

      <div className="px-4 py-5 space-y-5">
        {/* Key Metrics */}
        <div className="grid grid-cols-4 lg:grid-cols-8 gap-3">
          <MiniStat label="Total Staff" value={totalStaff} color="bg-teal-500" textColor="text-teal-700" />
          <MiniStat label="Active" value={Number(s.active) || 0} color="bg-emerald-500" textColor="text-emerald-700" />
          <MiniStat label="On Leave" value={Number(s.on_leave) || 0} color="bg-amber-500" textColor="text-amber-700" />
          <MiniStat label="Contracts" value={Number(c.active) || 0} color="bg-blue-500" textColor="text-blue-700" />
          <MiniStat label="Pending Leave" value={Number(l.pending) || 0} color="bg-orange-500" textColor="text-orange-700" />
          <MiniStat label="Tasks" value={Number(t.pending) || 0} color="bg-purple-500" textColor="text-purple-700" />
          <MiniStat label="Visitors In" value={Number(v.inside) || 0} color="bg-cyan-500" textColor="text-cyan-700" />
          <MiniStat label="Meetings" value={Number(m.scheduled) || 0} color="bg-pink-500" textColor="text-pink-700" />
        </div>

        {/* Staff, Departments, Contracts */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <Section title="Staff Status" subtitle="Current workforce" action="View Staff" onAction={() => navigate("/hr/staff")}>
            <div className="flex items-center gap-5">
              <CircularProgress percentage={activeRate} />
              <div className="flex-1 space-y-2">
                {[{ label: "Active", value: Number(s.active) || 0, color: "bg-emerald-500" }, { label: "Probation", value: Number(s.probation) || 0, color: "bg-blue-500" }, { label: "On Leave", value: Number(s.on_leave) || 0, color: "bg-amber-500" }, { label: "Inactive", value: Number(s.inactive) || 0, color: "bg-gray-400" }].map((x) => (
                  <div key={x.label} className="flex items-center justify-between">
                    <div className="flex items-center gap-2"><div className={`w-2 h-2 rounded-full ${x.color}`} /><span className="text-[10px] text-gray-600">{x.label}</span></div>
                    <span className="text-xs font-bold text-gray-800">{x.value}</span>
                  </div>
                ))}
              </div>
            </div>
          </Section>

          <Section title="By Department" subtitle={`${(d.departments || []).length} departments`}>
            <div className="space-y-2">
              {(d.departments || []).map((dept, i) => (
                <div key={dept.department}>
                  <div className="flex items-center justify-between text-[10px] mb-1">
                    <span className="text-gray-600 truncate">{dept.department}</span>
                    <span className="font-bold text-gray-800">{dept.count}</span>
                  </div>
                  <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                    <div className={`h-full ${deptColors[i % deptColors.length]} rounded-full`} style={{ width: `${(dept.count / totalStaff) * 100}%` }} />
                  </div>
                </div>
              ))}
              {(d.departments || []).length === 0 && <p className="text-xs text-gray-400 italic">No department data</p>}
            </div>
          </Section>

          <Section title="Contracts" subtitle={Number(c.expiring_soon) > 0 ? `${c.expiring_soon} expiring soon` : "All up to date"} action="View" onAction={() => navigate("/hr/contracts")}>
            <BarChart data={[
              { label: "Active", value: Number(c.active) || 0, color: "bg-emerald-500" },
              { label: "Draft", value: Number(c.draft) || 0, color: "bg-amber-500" },
              { label: "Expiring", value: Number(c.expiring_soon) || 0, color: "bg-orange-500" },
              { label: "Expired", value: Number(c.expired) || 0, color: "bg-red-400" },
            ]} />
          </Section>
        </div>

        {/* Leave, Attendance, Tasks */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <Section title="Leave Requests" subtitle={`${Number(l.total) || 0} total`} action="View" onAction={() => navigate("/hr/leave-request")}>
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                {[{ label: "Pending", value: Number(l.pending) || 0, color: "bg-amber-100 text-amber-700" }, { label: "Approved", value: Number(l.approved) || 0, color: "bg-emerald-100 text-emerald-700" }, { label: "Rejected", value: Number(l.rejected) || 0, color: "bg-red-100 text-red-700" }].map((x) => (
                  <div key={x.label} className={`flex-1 ${x.color} rounded-xl p-2.5 text-center`}>
                    <p className="text-lg font-black">{x.value}</p>
                    <p className="text-[9px] font-semibold uppercase">{x.label}</p>
                  </div>
                ))}
              </div>
              {(d.leave_by_type || []).length > 0 && (
                <div className="pt-2 border-t border-gray-100">
                  <p className="text-[9px] font-bold text-gray-400 uppercase tracking-wider mb-2">By Type</p>
                  <div className="flex flex-wrap gap-1.5">
                    {(d.leave_by_type || []).map((lt) => (
                      <span key={lt.leave_type} className="px-2 py-0.5 bg-gray-50 border border-gray-100 rounded-full text-[9px] font-medium text-gray-600 capitalize">{lt.leave_type} ({lt.count})</span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </Section>

          <Section title="Today's Attendance" subtitle={`${Number(a.total) || 0} records`} action="View" onAction={() => navigate("/hr/attendance")}>
            <div className="flex items-center gap-5">
              <CircularProgress percentage={attRate} color={attRate >= 80 ? "text-emerald-500" : attRate >= 50 ? "text-amber-500" : "text-red-500"} />
              <div className="flex-1 space-y-2">
                {[{ label: "Present", value: Number(a.present) || 0, color: "bg-emerald-500" }, { label: "Late", value: Number(a.late) || 0, color: "bg-amber-500" }, { label: "Absent", value: Number(a.absent) || 0, color: "bg-red-500" }, { label: "Not Recorded", value: Math.max(0, totalStaff - (Number(a.total) || 0)), color: "bg-gray-300" }].map((x) => (
                  <div key={x.label} className="flex items-center justify-between">
                    <div className="flex items-center gap-2"><div className={`w-2 h-2 rounded-full ${x.color}`} /><span className="text-[10px] text-gray-600">{x.label}</span></div>
                    <span className="text-xs font-bold text-gray-800">{x.value}</span>
                  </div>
                ))}
              </div>
            </div>
          </Section>

          <Section title="Staff Tasks" subtitle={Number(t.overdue) > 0 ? `${t.overdue} overdue` : "On track"} action="View" onAction={() => navigate("/hr/staff-task")}>
            <div className="space-y-3">
              <div className="flex items-center gap-3 mb-2">
                <CircularProgress percentage={taskRate} />
                <div><p className="text-xs font-bold text-gray-800">{taskRate}% Complete</p><p className="text-[10px] text-gray-400">{Number(t.completed) || 0} of {totalTasks} done</p></div>
              </div>
              {[{ label: "Completed", value: Number(t.completed) || 0, color: "bg-emerald-500" }, { label: "In Progress", value: Number(t.pending) || 0, color: "bg-blue-500" }, { label: "Overdue", value: Number(t.overdue) || 0, color: "bg-red-500" }].map((x) => (
                <div key={x.label}>
                  <div className="flex items-center justify-between text-[10px] mb-0.5"><span className="text-gray-600">{x.label}</span><span className="font-bold text-gray-800">{x.value}</span></div>
                  <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden"><div className={`h-full ${x.color} rounded-full`} style={{ width: `${totalTasks > 0 ? (x.value / totalTasks) * 100 : 0}%` }} /></div>
                </div>
              ))}
            </div>
          </Section>
        </div>

        {/* Visitors, Meetings, Events */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <Section title="Visitor Log" subtitle={`${Number(v.today) || 0} today`} action="View" onAction={() => navigate("/hr/visitor-log")}>
            <div className="grid grid-cols-3 gap-2 mb-3">
              <div className="bg-teal-50 rounded-xl p-3 text-center"><p className="text-lg font-black text-teal-700">{Number(v.total) || 0}</p><p className="text-[9px] font-semibold text-teal-600 uppercase">Total</p></div>
              <div className="bg-emerald-50 rounded-xl p-3 text-center"><p className="text-lg font-black text-emerald-700">{Number(v.inside) || 0}</p><p className="text-[9px] font-semibold text-emerald-600 uppercase">Inside</p></div>
              <div className="bg-gray-50 rounded-xl p-3 text-center"><p className="text-lg font-black text-gray-600">{Number(v.today) || 0}</p><p className="text-[9px] font-semibold text-gray-500 uppercase">Today</p></div>
            </div>
            {(d.recent_visitors || []).length > 0 && (
              <div className="space-y-2 pt-2 border-t border-gray-100">
                {d.recent_visitors.map((rv) => (
                  <div key={rv.id} className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className={`w-2 h-2 rounded-full ${rv.status === "in" || (!rv.time_out && rv.time_in) ? "bg-emerald-500 animate-pulse" : "bg-gray-400"}`} />
                      <span className="text-[10px] text-gray-700 font-medium">{rv.visitor_name}</span>
                    </div>
                    <span className="text-[9px] text-gray-400">{rv.purpose}</span>
                  </div>
                ))}
              </div>
            )}
          </Section>

          <Section title="Meetings" subtitle={`${Number(m.scheduled) || 0} upcoming`} action="View" onAction={() => navigate("/hr/meetings")}>
            <BarChart data={[
              { label: "Scheduled", value: Number(m.scheduled) || 0, color: "bg-blue-500" },
              { label: "Active", value: Number(m.in_progress) || 0, color: "bg-amber-500" },
              { label: "Done", value: Number(m.completed) || 0, color: "bg-emerald-500" },
              { label: "Cancelled", value: Number(m.cancelled) || 0, color: "bg-red-400" },
            ]} />
            {d.next_meeting && (
              <div className="mt-3 pt-3 border-t border-gray-100">
                <p className="text-[9px] font-bold text-gray-400 uppercase mb-2">Next Meeting</p>
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 bg-teal-50 rounded-lg flex items-center justify-center flex-shrink-0">
                    <span className="text-[10px] font-black text-teal-700">{new Date(d.next_meeting.start_time).getDate()}</span>
                  </div>
                  <div>
                    <p className="text-[10px] font-semibold text-gray-800 truncate">{d.next_meeting.title}</p>
                    <p className="text-[9px] text-gray-400">{new Date(d.next_meeting.start_time).toLocaleString("en-US", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}</p>
                  </div>
                </div>
              </div>
            )}
          </Section>

          <Section title="Events" subtitle={`${Number(e.upcoming) || 0} upcoming`} action="View" onAction={() => navigate("/hr/events")}>
            <div className="grid grid-cols-2 gap-2 mb-3">
              {[{ label: "Upcoming", value: Number(e.upcoming) || 0, color: "bg-blue-50 text-blue-700" }, { label: "Ongoing", value: Number(e.ongoing) || 0, color: "bg-amber-50 text-amber-700" }, { label: "Completed", value: Number(e.completed) || 0, color: "bg-emerald-50 text-emerald-700" }, { label: "Cancelled", value: Number(e.cancelled) || 0, color: "bg-red-50 text-red-700" }].map((x) => (
                <div key={x.label} className={`${x.color} rounded-xl p-2.5 text-center`}><p className="text-lg font-black">{x.value}</p><p className="text-[9px] font-semibold uppercase">{x.label}</p></div>
              ))}
            </div>
            {(d.upcoming_events || []).length > 0 && (
              <div className="space-y-2 pt-2 border-t border-gray-100">
                {d.upcoming_events.map((ev) => (
                  <div key={ev.id} className="flex items-center gap-2">
                    <div className={`w-1.5 h-8 rounded-full ${ev.status === "ongoing" ? "bg-amber-500" : "bg-blue-500"}`} />
                    <div><p className="text-[10px] font-semibold text-gray-800 truncate">{ev.title}</p><p className="text-[9px] text-gray-400">{new Date(ev.start_date).toLocaleDateString("en-US", { month: "short", day: "numeric" })}{ev.location ? ` · ${ev.location}` : ""}</p></div>
                  </div>
                ))}
              </div>
            )}
          </Section>
        </div>

        {/* Alerts */}
        {(Number(c.expiring_soon) > 0 || Number(l.pending) > 0 || Number(t.overdue) > 0 || Number(v.inside) > 0) && (
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
            <h3 className="text-sm font-bold text-gray-800 mb-3 flex items-center gap-2">
              <svg className="w-4 h-4 text-amber-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.34 16.5c-.77.833.192 2.5 1.732 2.5z" /></svg>
              Alerts & Action Items
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2">
              {Number(c.expiring_soon) > 0 && <AlertCard onClick={() => navigate("/hr/contracts")} color="orange" title={`${c.expiring_soon} contracts expiring`} sub="Within 30 days" icon="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />}
              {Number(l.pending) > 0 && <AlertCard onClick={() => navigate("/hr/leave-request")} color="amber" title={`${l.pending} leave requests`} sub="Awaiting approval" icon="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />}
              {Number(t.overdue) > 0 && <AlertCard onClick={() => navigate("/hr/staff-task")} color="red" title={`${t.overdue} overdue tasks`} sub="Need attention" icon="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />}
              {Number(v.inside) > 0 && <AlertCard onClick={() => navigate("/hr/visitor-log")} color="emerald" title={`${v.inside} visitors inside`} sub="Currently on premises" icon="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />}
            </div>
          </div>
        )}

        {/* Recent Staff */}
        <Section title="Recent Staff Members" subtitle="Latest additions" action="View All" onAction={() => navigate("/hr/staff")}>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {(d.recent_staff || []).map((rs) => (
              <div key={rs.id} className="flex items-center gap-3 p-2.5 bg-gray-50 rounded-xl">
                <div className="w-9 h-9 rounded-lg bg-teal-100 text-teal-700 flex items-center justify-center text-[10px] font-bold flex-shrink-0">
                  {rs.name.split(" ").map((w) => w[0]).slice(0, 2).join("").toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[10px] font-semibold text-gray-800 truncate">{rs.name}</p>
                  <p className="text-[9px] text-gray-400 truncate">{rs.department || "No dept"} · {rs.employee_id}</p>
                </div>
                <span className={`w-2 h-2 rounded-full flex-shrink-0 ${rs.status === "active" ? "bg-emerald-500" : rs.status === "on_leave" ? "bg-amber-500" : "bg-gray-400"}`} />
              </div>
            ))}
          </div>
          {(d.recent_staff || []).length === 0 && <p className="text-xs text-gray-400 italic text-center py-4">No staff found</p>}
        </Section>
      </div>
    </div>
  );
}

function AlertCard({ onClick, color, title, sub, icon }) {
  const colors = { orange: "bg-orange-50 border-orange-200", amber: "bg-amber-50 border-amber-200", red: "bg-red-50 border-red-200", emerald: "bg-emerald-50 border-emerald-200" };
  const iconColors = { orange: "bg-orange-100 text-orange-600", amber: "bg-amber-100 text-amber-600", red: "bg-red-100 text-red-600", emerald: "bg-emerald-100 text-emerald-600" };
  const textColors = { orange: "text-orange-800", amber: "text-amber-800", red: "text-red-800", emerald: "text-emerald-800" };
  const subColors = { orange: "text-orange-600", amber: "text-amber-600", red: "text-red-600", emerald: "text-emerald-600" };
  return (
    <button onClick={onClick} className={`flex items-center gap-3 p-3 ${colors[color]} border rounded-xl hover:shadow-sm transition-all text-left`}>
      <div className={`w-8 h-8 ${iconColors[color]} rounded-lg flex items-center justify-center flex-shrink-0`}>
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={icon} /></svg>
      </div>
      <div><p className={`text-xs font-bold ${textColors[color]}`}>{title}</p><p className={`text-[9px] ${subColors[color]}`}>{sub}</p></div>
    </button>
  );
}
