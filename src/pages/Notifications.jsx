import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { get, put } from "../api/axios";
import Swal from "sweetalert2";

/**
 * Standalone notifications inbox — reached from the dashboard's "See more"
 * link on the Recent Notifications widget, and from anywhere else we want
 * to surface the full feed. Pulls up to 50 latest from /api/notifications
 * (the same endpoint the bell uses), with filter chips, mark-as-read,
 * and click-through deep-links using each notification's data.link.
 */
export default function Notifications() {
  const navigate = useNavigate();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("all"); // all | unread | read
  const [search, setSearch] = useState("");
  const [marking, setMarking] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const res = await get("/notifications");
      setItems(res.data?.data || []);
    } catch {
      setItems([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const markOne = async (id) => {
    try { await put(`/notifications/${id}/read`); } catch {}
    // Optimistic — flip read_at locally so the chip count is instant.
    setItems((prev) => prev.map((n) =>
      n.id === id ? { ...n, read_at: n.read_at || new Date().toISOString() } : n
    ));
    window.dispatchEvent(new CustomEvent("wen:notifications-refresh"));
  };

  const markAll = async () => {
    setMarking(true);
    try {
      await put("/notifications/read-all");
      setItems((prev) => prev.map((n) => ({
        ...n,
        read_at: n.read_at || new Date().toISOString(),
      })));
      window.dispatchEvent(new CustomEvent("wen:notifications-refresh"));
      Swal.fire({ icon: "success", title: "All marked as read", timer: 1200, showConfirmButton: false });
    } catch {
      Swal.fire("Error", "Failed to mark all as read", "error");
    } finally {
      setMarking(false);
    }
  };

  const handleClick = (n) => {
    const d = n.data || {};
    // Same routing priority the bell uses — explicit link wins, then a
    // few well-known type-specific deep-links.
    let target = null;
    if (d.link) target = d.link;
    else if (d.leave_request_id)   target = `/hr/leave-request?highlight=${d.leave_request_id}`;
    else if (d.meeting_id)         target = `/hr/meetings/show/${d.meeting_id}`;
    else if (d.event_id)           target = `/hr/events/show/${d.event_id}`;
    else if (d.invoice_id)         target = `/finance/fee-invoices/show/${d.invoice_id}`;
    else if (d.staff_task_id)      target = `/hr/staff-task?highlight=${d.staff_task_id}`;
    else if (d.vendor_contract_id) target = `/hr/vendor-contracts/show/${d.vendor_contract_id}`;
    else if (d.staff_contract_id)  target = `/hr/contracts/show/${d.staff_contract_id}`;
    else if (d.agreement_id)       target = `/hr/agreements/show/${d.agreement_id}`;

    if (!n.read_at) markOne(n.id);
    if (target) {
      const sep = target.includes("?") ? "&" : "?";
      navigate(`${target}${sep}from=notif`);
    }
  };

  // Filter chips + search both narrow the visible set.
  const filtered = useMemo(() => {
    let list = items;
    if (filter === "unread") list = list.filter((n) => !n.read_at);
    if (filter === "read")   list = list.filter((n) => !!n.read_at);
    const q = search.trim().toLowerCase();
    if (q) {
      list = list.filter((n) => {
        const d = n.data || {};
        return [d.message, d.title, d.staff_name, d.type]
          .filter(Boolean)
          .some((v) => String(v).toLowerCase().includes(q));
      });
    }
    return list;
  }, [items, filter, search]);

  const unreadCount = items.filter((n) => !n.read_at).length;

  const iconFor = (data) => {
    const t = data?.type || "";
    if (t.includes("leave"))     return { bg: "bg-amber-100",  text: "text-amber-700",  path: "M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" };
    if (t.includes("meeting"))   return { bg: "bg-teal-100",   text: "text-teal-700",   path: "M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857" };
    if (t.includes("task"))      return { bg: "bg-indigo-100", text: "text-indigo-700", path: "M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" };
    if (t.includes("daily"))     return { bg: "bg-purple-100", text: "text-purple-700", path: "M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" };
    if (t.includes("invoice"))   return { bg: "bg-red-100",    text: "text-red-700",    path: "M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" };
    if (t.includes("event"))     return { bg: "bg-pink-100",   text: "text-pink-700",   path: "M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" };
    return { bg: "bg-blue-100", text: "text-blue-700", path: "M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" };
  };

  return (
    <div className="min-h-screen bg-gray-50/60">
      {/* Header */}
      <div className="bg-teal-600 px-5 py-5">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate(-1)} className="p-2 bg-white/20 hover:bg-white/30 rounded-xl text-white transition-colors">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
          </button>
          <div className="flex-1">
            <h1 className="text-sm font-bold text-white">All Notifications</h1>
            <p className="text-xs text-teal-100 mt-0.5">
              {items.length} total · {unreadCount} unread
            </p>
          </div>
          {unreadCount > 0 && (
            <button onClick={markAll} disabled={marking}
              className="px-3 py-1.5 bg-white text-teal-600 text-xs font-semibold rounded-lg hover:bg-gray-100 disabled:opacity-50 transition-colors">
              {marking ? "Marking…" : `Mark all read (${unreadCount})`}
            </button>
          )}
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-4 py-5 space-y-4">
        {/* Filter + search */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-3 flex flex-col sm:flex-row gap-2 items-stretch sm:items-center">
          <div className="flex gap-1.5 flex-shrink-0">
            {[
              { key: "all",    label: `All (${items.length})` },
              { key: "unread", label: `Unread (${unreadCount})` },
              { key: "read",   label: `Read (${items.length - unreadCount})` },
            ].map((f) => (
              <button key={f.key} onClick={() => setFilter(f.key)}
                className={`px-3 py-1.5 rounded-lg text-[11px] font-semibold transition-colors ${
                  filter === f.key
                    ? "bg-teal-600 text-white"
                    : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                }`}>
                {f.label}
              </button>
            ))}
          </div>
          <div className="flex-1 relative">
            <svg className="w-3.5 h-3.5 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search…"
              className="w-full pl-9 pr-3 py-1.5 border border-gray-200 rounded-lg text-xs bg-white focus:ring-2 focus:ring-teal-300 focus:outline-none"
            />
          </div>
        </div>

        {/* List */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          {loading ? (
            <div className="py-16 flex items-center justify-center">
              <div className="animate-spin rounded-full h-8 w-8 border-4 border-teal-100 border-t-teal-600" />
            </div>
          ) : filtered.length === 0 ? (
            <div className="py-16 text-center">
              <svg className="w-10 h-10 mx-auto text-gray-200 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
              </svg>
              <p className="text-xs text-gray-400">
                {items.length === 0 ? "No notifications yet" : "No notifications match your filter"}
              </p>
            </div>
          ) : (
            <ul className="divide-y divide-gray-100">
              {filtered.map((n) => {
                const d = n.data || {};
                const unread = !n.read_at;
                const icon = iconFor(d);
                return (
                  <li key={n.id}>
                    <button onClick={() => handleClick(n)}
                      className={`w-full flex items-start gap-3 p-4 text-left hover:bg-gray-50/80 transition-colors ${unread ? "bg-blue-50/30" : ""}`}>
                      <div className={`w-10 h-10 rounded-xl ${icon.bg} flex items-center justify-center flex-shrink-0`}>
                        <svg className={`w-5 h-5 ${icon.text}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={icon.path} />
                        </svg>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className={`text-xs leading-snug ${unread ? "font-semibold text-gray-900" : "text-gray-700"}`}>
                          {d.message || d.title || "Notification"}
                        </p>
                        <p className="text-[10px] text-gray-400 mt-1">
                          {n.created_at ? new Date(n.created_at).toLocaleString() : ""}
                          {d.type ? ` · ${String(d.type).replace(/_/g, " ")}` : ""}
                        </p>
                      </div>
                      {unread && (
                        <span className="mt-1 w-2 h-2 rounded-full bg-blue-500 flex-shrink-0" />
                      )}
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
