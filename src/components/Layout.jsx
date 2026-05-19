import { useState, useEffect, useRef, useCallback } from "react";
import { Suspense } from "react";
import { Link, useLocation, Outlet, useNavigate } from "react-router-dom";
import { useAuth } from "../admin/context/AuthContext";
import PathPermissionGate from "../admin/guards/PathPermissionGate";

const PageFallback = () => (
  <div className="min-h-[60vh] flex items-center justify-center">
    <div className="flex flex-col items-center gap-3">
      <div className="animate-spin rounded-full h-10 w-10 border-4 border-teal-100 border-t-teal-600" />
      <span className="text-gray-400 text-xs">Loading...</span>
    </div>
  </div>
);
import { get, put } from "../api/axios";
import Swal from "sweetalert2";

const Icons = {
  Dashboard: () => (
    <svg
      className="w-5 h-5"
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z"
      />
    </svg>
  ),
  Departments: () => (
    <svg
      className="w-5 h-5"
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"
      />
    </svg>
  ),
  Payroll: () => (
    <svg
      className="w-5 h-5"
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
      />
    </svg>
  ),
  Leave: () => (
    <svg
      className="w-5 h-5"
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
      />
    </svg>
  ),
  Puzzle: () => (
    <svg
      className="w-5 h-5"
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M11 4a2 2 0 114 0v1a1 1 0 001 1h3a1 1 0 011 1v3a1 1 0 01-1 1h-1a2 2 0 100 4h1a1 1 0 011 1v3a1 1 0 01-1 1h-3a1 1 0 01-1-1v-1a2 2 0 10-4 0v1a1 1 0 01-1 1H7a1 1 0 01-1-1v-3a1 1 0 00-1-1H4a2 2 0 110-4h1a1 1 0 001-1V7a1 1 0 011-1h3a1 1 0 001-1V4z"
      />
    </svg>
  ),
  Settings: () => (
    <svg
      className="w-5 h-5"
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
      />
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
      />
    </svg>
  ),
  Support: () => (
    <svg
      className="w-5 h-5"
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
      />
    </svg>
  ),
  HR: () => (
    <svg
      className="w-5 h-5"
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
      />
    </svg>
  ),
  Teacher: () => (
    <svg
      className="w-5 h-5"
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
      />
    </svg>
  ),
  ClassManagement: () => (
    <svg
      className="w-5 h-5"
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"
      />
    </svg>
  ),
  ChevronDown: () => (
    <svg
      className="w-4 h-4"
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M19 9l-7 7-7-7"
      />
    </svg>
  ),
  ChevronRight: () => (
    <svg
      className="w-4 h-4"
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M9 5l7 7-7 7"
      />
    </svg>
  ),
  Logout: () => (
    <svg
      className="w-5 h-5"
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"
      />
    </svg>
  ),
  Search: () => (
    <svg
      className="w-5 h-5"
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
      />
    </svg>
  ),
  Bell: () => (
    <svg
      className="w-5 h-5"
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"
      />
    </svg>
  ),
  Menu: () => (
    <svg
      className="w-6 h-6"
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M4 6h16M4 12h16M4 18h16"
      />
    </svg>
  ),
  Close: () => (
    <svg
      className="w-6 h-6"
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M6 18L18 6M6 6l12 12"
      />
    </svg>
  ),
};

const MenuSection = ({ title }) => (
  <div className="px-4 py-1.5 text-[10px] font-semibold text-teal-400 uppercase tracking-wider">
    {title}
  </div>
);

const SidebarItem = ({ icon: Icon, label, to, active, onClick }) => (
  <Link
    to={to}
    onClick={onClick}
    className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg transition-colors text-sm ${
      active
        ? "bg-teal-700 text-white"
        : "text-teal-100 hover:bg-teal-800 hover:text-white"
    }`}
  >
    <Icon />
    <span className="font-medium">{label}</span>
  </Link>
);

const SubMenuItem = ({ label, to, active, onClick }) => (
  <Link
    to={to}
    onClick={onClick}
    className={`flex items-center px-3 py-1.5 pl-10 rounded-lg transition-colors text-xs ${
      active
        ? "bg-teal-700 text-white"
        : "text-teal-200 hover:bg-teal-800 hover:text-white"
    }`}
  >
    <span>{label}</span>
  </Link>
);

const ParentMenu = ({ icon: Icon, label, isOpen, onClick, children }) => (
  <div>
    <button
      onClick={onClick}
      className={`w-full flex items-center justify-between px-3 py-2 rounded-lg transition-colors text-sm ${
        isOpen
          ? "bg-teal-700 text-white"
          : "text-teal-100 hover:bg-teal-800 hover:text-white"
      }`}
    >
      <div className="flex items-center gap-2">
        <Icon />
        <span className="font-medium">{label}</span>
      </div>
      <div className={`transition-transform ${isOpen ? "rotate-180" : ""}`}>
        <Icons.ChevronDown />
      </div>
    </button>
    {isOpen && <div className="mt-1 space-y-0.5">{children}</div>}
  </div>
);

// ── Notification Bell ─────────────────────────────────────────────────────────
function NotificationBell() {
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const ref = useRef(null);

  const fetchNotifications = useCallback(async () => {
    try {
      const res = await get("/notifications");
      const data = res.data;
      setNotifications(data?.data || []);
      setUnreadCount(data?.unread_count || 0);
    } catch {
      // silently fail
    }
  }, []);

  useEffect(() => {
    fetchNotifications();
    // Poll every 15 seconds so new notifications appear quickly.
    const interval = setInterval(fetchNotifications, 15000);

    // Listen for in-app events (e.g. after approve/reject in this same tab)
    // and refresh immediately — no waiting for the next poll cycle.
    const onRefresh = () => fetchNotifications();
    window.addEventListener("wen:notifications-refresh", onRefresh);

    // Re-fetch when the tab regains focus (covers cross-tab approvals too).
    const onVisible = () => { if (!document.hidden) fetchNotifications(); };
    document.addEventListener("visibilitychange", onVisible);

    return () => {
      clearInterval(interval);
      window.removeEventListener("wen:notifications-refresh", onRefresh);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [fetchNotifications]);

  useEffect(() => {
    const close = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, []);

  // Mark read in the API + REMOVE from the local list so the bell shows only
  // fresh notifications. The full history is still visible at /finance/inbox.
  const markAsRead = async (id) => {
    try { await put(`/notifications/${id}/read`); } catch {}
    setNotifications((p) => p.filter((n) => n.id !== id));
    setUnreadCount((p) => Math.max(0, p - 1));
  };

  const markAllRead = async () => {
    try { await put("/notifications/read-all"); } catch {}
    setNotifications([]);
    setUnreadCount(0);
  };

  const handleClick = (n) => {
    const d = n.data || {};

    let dest;

    // Leave requests: always land on the list with the row highlighted,
    // even when the backend payload still carries an old /show/ link.
    if (d.leave_request_id) {
      dest = `/hr/leave-request?highlight=${d.leave_request_id}`;
    } else if (d.link) {
      dest = d.link;
    } else if (d.meeting_id) {
      dest = `/hr/meetings/show/${d.meeting_id}`;
    } else if (d.staff_task_id) {
      dest = `/hr/staff-task/show/${d.staff_task_id}`;
    } else if (d.vendor_contract_id) {
      dest = `/hr/vendor-contracts/show/${d.vendor_contract_id}`;
    } else if (d.agreement_id) {
      dest = `/hr/agreements/show/${d.agreement_id}`;
    }

    if (dest) {
      const sep = dest.includes("?") ? "&" : "?";
      navigate(`${dest}${sep}from=notif`);
    }
    // Resolve the target page: explicit `link` field first (works for any
    // notification type that wants to define its own deep link — e.g. the
    // new fee_invoice_overdue), then fall back to type-specific routing.
    let target = null;
    if (d.link) target = d.link;
    else if (d.invoice_id) target = `/finance/fee-invoices/show/${d.invoice_id}`;
    else if (d.meeting_id) target = `/hr/meetings/show/${d.meeting_id}`;
    else if (d.staff_task_id) target = `/hr/staff-task/show/${d.staff_task_id}`;
    else if (d.vendor_contract_id) target = `/hr/vendor-contracts/show/${d.vendor_contract_id}`;
    else if (d.agreement_id) target = `/hr/agreements/show/${d.agreement_id}`;
    if (!n.read_at) markAsRead(n.id);
    if (target) navigate(target);
    setOpen(false);
  };

  const timeAgo = (date) => {
    if (!date) return "";
    const diff = (Date.now() - new Date(date).getTime()) / 1000;
    if (diff < 60) return "Just now";
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
    if (diff < 604800) return `${Math.floor(diff / 86400)}d ago`;
    return new Date(date).toLocaleDateString();
  };

  const getIcon = (data) => {
    if (data?.type === "meeting_invite") {
      if (data.action === "cancelled") return { bg: "bg-red-100", color: "text-red-600", path: "M6 18L18 6M6 6l12 12" };
      return { bg: "bg-teal-100", color: "text-teal-600", path: "M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" };
    }
    if (data?.type === "staff_task") {
      if (data.action === "completed") return { bg: "bg-emerald-100", color: "text-emerald-600", path: "M5 13l4 4L19 7" };
      if (data.action === "started") return { bg: "bg-blue-100", color: "text-blue-600", path: "M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" };
      if (data.action === "reminder") return { bg: "bg-amber-100", color: "text-amber-600", path: "M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" };
      return { bg: "bg-teal-100", color: "text-teal-600", path: "M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" };
    }
    if (data?.type === "vendor_contract") {
      return { bg: "bg-orange-100", color: "text-orange-600", path: "M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" };
    }
    if (data?.type === "agreement") {
      return { bg: "bg-purple-100", color: "text-purple-600", path: "M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" };
    }
    if (data?.type === "fee_invoice_overdue") {
      return { bg: "bg-red-100", color: "text-red-600", path: "M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" };
    }
    if (data?.type === "daily_fee_summary") {
      return { bg: "bg-amber-100", color: "text-amber-600", path: "M9 17v-2a4 4 0 014-4h4m0 0l-3-3m3 3l-3 3M5 5h14a2 2 0 012 2v10a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2z" };
    }
    return { bg: "bg-blue-100", color: "text-blue-600", path: "M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" };
  };

  // Build the headline text for a notification card in the bell. Different
  // notification types carry different fields — render a useful one-liner
  // instead of falling back to "New notification".
  const renderMessage = (data) => {
    if (!data) return "New notification";
    if (data.type === "fee_invoice_overdue") {
      const who = data.student_name || `Student #${data.student_id || "?"}`;
      const days = data.days_overdue || 0;
      const amt = Number(data.amount_due || 0).toLocaleString();
      return `${who} — ${days} day${days === 1 ? "" : "s"} overdue · ${amt} AFN`;
    }
    if (data.type === "daily_fee_summary") {
      const s = data.summary || {};
      return `Daily summary: ${s.overdue_count || 0} overdue, ${s.due_soon_count || 0} due soon`;
    }
    return data.message || data.title || "New notification";
  };

  return (
    <div className="relative" ref={ref}>
      <button onClick={() => { setOpen(!open); if (!open) fetchNotifications(); }}
        className="relative p-2 text-gray-600 hover:text-gray-800 transition-colors">
        <Icons.Bell />
        {unreadCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] bg-red-500 text-white text-[9px] font-bold rounded-full flex items-center justify-center px-1 border-2 border-white">
            {unreadCount > 99 ? "99+" : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 mt-2 w-80 bg-white rounded-xl shadow-xl border border-gray-200 z-50 overflow-hidden">
          {/* Header */}
          <div className="px-4 py-3 bg-gray-50 border-b border-gray-100 flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-gray-800">Notifications</h3>
              {unreadCount > 0 && <p className="text-[10px] text-gray-500">{unreadCount} unread</p>}
            </div>
            {unreadCount > 0 && (
              <button onClick={markAllRead} className="text-[10px] text-teal-600 hover:text-teal-700 font-semibold">
                Mark all read
              </button>
            )}
          </div>

          {/* List — only unread items are shown in the bell so it always
              reflects what needs attention. Read history lives at /finance/inbox. */}
          <div className="max-h-80 overflow-y-auto">
            {(() => {
              const unreadOnly = notifications.filter((n) => !n.read_at);
              if (unreadOnly.length === 0) {
                return (
                  <div className="px-4 py-8 text-center">
                    <svg className="w-10 h-10 mx-auto text-gray-200 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M5 13l4 4L19 7" />
                    </svg>
                    <p className="text-xs text-gray-400">You're all caught up</p>
                  </div>
                );
              }
              return unreadOnly.map((n) => {
                const icon = getIcon(n.data);
                const isUnread = !n.read_at;
                return (
                  <div key={n.id} onClick={() => handleClick(n)}
                    className={`px-4 py-3 border-b border-gray-50 last:border-0 cursor-pointer hover:bg-gray-50 transition-colors flex items-start gap-3 ${isUnread ? "bg-teal-50/40" : ""}`}>
                    <div className={`w-8 h-8 rounded-lg ${icon.bg} flex items-center justify-center flex-shrink-0 mt-0.5`}>
                      <svg className={`w-4 h-4 ${icon.color}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={icon.path} />
                      </svg>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className={`text-[11px] leading-relaxed ${isUnread ? "text-gray-800 font-semibold" : "text-gray-600"}`}>
                        {renderMessage(n.data)}
                      </p>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-[9px] text-gray-400">{timeAgo(n.created_at)}</span>
                        {n.data?.location && (
                          <span className="text-[9px] text-gray-400 flex items-center gap-0.5">
                            <svg className="w-2.5 h-2.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" /></svg>
                            {n.data.location}
                          </span>
                        )}
                      </div>
                    </div>
                    {isUnread && <div className="w-2 h-2 bg-teal-500 rounded-full flex-shrink-0 mt-2"></div>}
                  </div>
                );
              });
            })()}
          </div>
        </div>
      )}
    </div>
  );
}

// ── Profile Button (navigates to /profile page) ─────────────────────────────
function ProfileButton() {
  const navigate = useNavigate();
  const auth = useAuth();
  const [profileData, setProfileData] = useState(null);
  
  useEffect(() => {
    // Fetch current user profile data
    const fetchProfileData = async () => {
      try {
        const response = await get('/profile');
        setProfileData(response.data.data);
      } catch (error) {
        console.error('Profile fetch error:', error);
      }
    };
    
    fetchProfileData();
  }, []);

  const getInitial = (name) => {
    if (!name) return 'U';
    return name.charAt(0);
  };

  return (
    <button onClick={() => navigate('/profile')}
      className="w-8 h-8 rounded-full bg-teal-600 flex items-center justify-center text-white text-xs font-bold hover:bg-teal-700 transition-colors"
      title="My Profile"
    >
      {profileData?.user?.profile_photo || profileData?.staff?.profile_photo || profileData?.teacher?.profile_photo || profileData?.student?.profile_photo ? (
        <img 
          src={profileData?.user?.profile_photo || profileData?.staff?.profile_photo || profileData?.teacher?.profile_photo || profileData?.student?.profile_photo} 
          alt="Profile" 
          className="w-full h-full object-cover rounded-full"
        />
      ) : (
        getInitial(profileData?.user?.name || auth.user?.name)
      )}
    </button>
  );
}

export default function Layout() {
  const location = useLocation();
  const navigate = useNavigate();
  const { hasPermission, isSuperAdmin } = useAuth();
  const [openMenu, setOpenMenu] = useState([]);
  const [openSubMenu, setOpenSubMenu] = useState([]);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [userToggled, setUserToggled] = useState(false);
  const user = JSON.parse(localStorage.getItem("user") || "{}");

  /**
   * Filter a menu list by the current user's permissions.
   * LOCKDOWN: items without `permission` metadata are hidden for non-super-admins.
   * Items with children: a parent shows if it has `permission` granted OR any child is visible.
   */
  const itemAllowed = (item) => {
    if (item.children && item.children.length) {
      const visibleChildren = visible(item.children);
      if (visibleChildren.length === 0) return false;
      return true;
    }
    if (item.permission) return hasPermission(item.permission);
    return isSuperAdmin; // untagged → super-admin only
  };
  const visible = (items) => items.filter(itemAllowed);
  // True if the current user can see at least one child of a top-level group.
  const canSeeGroup = (items) => visible(items).length > 0;

  useState(() => {
    if (!userToggled && location.pathname.startsWith("/hr")) {
      setOpenMenu(["hr"]);
    }
  }, [location.pathname]);

  const toggleMenu = (menu) => {
    setUserToggled(true);
    if (openMenu.includes(menu)) {
      // If clicking on already open menu, close it
      setOpenMenu(openMenu.filter((item) => item !== menu));
    } else {
      // If opening a new menu, close all others and open only this one
      setOpenMenu([menu]);
    }
  };

  const isActive = (path) => location.pathname === path;

  const hrSubMenus = [
    { label: "Staff", path: "/hr/staff", permission: "staff.view" },
    { label: "Staff Logs", path: "/hr/staff-logs", permission: "staff-logs.view" },
    { label: "Salary Snapshot", path: "/hr/salary-snapshot", permission: "salary-snapshot.view" },
    { label: "Contracts", key: "contracts", children: [
      { label: "Staff Contract", path: "/hr/contracts", permission: "contracts.view" },
      { label: "Vendor Contract", path: "/hr/vendor-contracts", permission: "vendor-contracts.view" },
      { label: "Agreements", path: "/hr/agreements", permission: "agreements.view" },
    ]},
    { label: "Attendance", path: "/hr/attendance", permission: "attendance.view" },
    { label: "Leave Request", path: "/hr/leave-request", permission: "leave-request.view" },
    { label: "Holidays", path: "/hr/holidays", permission: "holidays.view" },
    { label: "Performance (VATS)", key: "vats", children: [
      { label: "Overview",           path: "/hr/vats",              permission: "vats-dashboard.view" },
      { label: "Daily Observations", path: "/hr/vats/observations", permission: "vats-observations.view" },
      { label: "Recognition Slips",  path: "/hr/vats/slips",        permission: "vats-slips.view" },
      { label: "Cards Wallet",       path: "/hr/vats/cards",        permission: "vats-cards.view" },
      { label: "Interventions",      path: "/hr/vats/interventions", permission: "vats-interventions.view" },
    ]},
    { label: "Welfare (Ihsan)", key: "welfare", children: [
      { label: "My Check-in",        path: "/hr/welfare/checkin",   permission: "welfare-checkin.view" },
      { label: "Welfare Dashboard",  path: "/hr/welfare",           permission: "welfare-dashboard.view" },
      { label: "Open Alerts",        path: "/hr/welfare/alerts",    permission: "welfare-alerts.view" },
      { label: "Benefits Log",       path: "/hr/welfare/benefits",  permission: "welfare-benefits.view" },
    ]},
    { label: "Add Vendor", path: "/hr/add-vendor", permission: "vendors.view" },
    { label: "Planner", key: "planner", children: [
      { label: "Meetings", path: "/hr/meetings", permission: "meetings.view" },
      { label: "Events", path: "/hr/events", permission: "events.view" },
      { label: "Staff Task", path: "/hr/staff-task", permission: "staff-task.view" },
    ]},
    { label: "Visitor Log", path: "/hr/visitor-log", permission: "visitor-log.view" },
    { label: "HR Reports", path: "/hr/reports", permission: "hr-reports.view" },
  ];

  const studentsMenus = [
    { label: "Parents", path: "/student-management/parents", permission: "parents.view" },
    { label: "Phase 1 - Students Information", path: "/student-management/students", permission: "students.view" },
    { label: "Phase 2 - Students Registration", path: "/student-management/student-enrollments", permission: "student-enrollments.view" },
    { label: "Students List", path: "/student-management/enrolled-students", permission: "enrolled-students.view" },
    { label: "Foundation Requests", path: "/student-management/foundation-requests", permission: "foundation-requests.view" },
  ];

  const academic = [
    { label: "Academic Terms", path: "/student-management/academic-terms", permission: "academic-terms.view" },
    { label: "Grades", path: "/student-management/grades", permission: "grades.view" },
  ];
  const transportationMenus = [
    { label: "Routes", path: "/transportation/routes", permission: "routes.view" },
    { label: "Vehicles", path: "/transportation/vehicles", permission: "vehicles.view" },
  ];

  const recruitmentMenus = [
    { label: "Job Applications", path: "/recruitment/job-requisitions", permission: "job-requisitions.view" },
    { label: "Job Postings", path: "/recruitment/job-postings", permission: "job-postings.view" },
    { label: "Applications", path: "/recruitment/applications", permission: "applications.view" },
    { label: "Candidate Pool", path: "/recruitment/candidate-pool", permission: "candidate-pool.view" },
  ];

  const purchaseMenus = [
    { label: "Purchase Requests", path: "/purchase/purchase-requests", permission: "purchase-requests.view" },
    // { label: "Suppliers", path: "/purchase/suppliers", permission: "suppliers.view" },
    { label: "Stock / Inventory", path: "/purchase/stock", permission: "stock.view" },
    { label: "Routine Items", path: "/purchase/routine-items", permission: "routine-items.view" },
    { label: "Repair Requests", path: "/purchase/repair-requests", permission: "repair-requests.view" },
    // { label: "Pr ojects", path: "/purchase/projects", permission: "projects.view" },
  ];

  const adminMenus = [
    { label: "Roles", path: "/admin/roles", permission: "roles.view" },
    { label: "Permissions", path: "/admin/permissions", permission: "permissions.view" },
    { label: "Users & Access", path: "/admin/users", permission: "users.view" },
  ];

  const branchesMenus = [
    { label: "Branches", path: "/branches", permission: "branches.view" },
  ];
  const teacherMenus = [
    { label: "Teachers", path: "/teacher-management/teachers", permission: "teachers.view" },
  ];
  const classMgmtMenus = [
    { label: "Classes", path: "/class-management/classes", permission: "classes.view" },
    { label: "Subjects", path: "/class-management/subjects", permission: "subjects.view" },
    { label: "Grade Subjects", path: "/class-management/grade-subjects", permission: "grade-subjects.view" },
    { label: "Schedule", path: "/class-management/schedule", permission: "schedule.view" },
  ];

  // Finance menu — same nested-children shape as hrSubMenus so itemAllowed/visible work.
  const financeMenus = [
    { label: "Overview", path: "/finance/dashboard", permission: "finance.view" },
    { label: "Inbox", path: "/finance/inbox", permission: "notifications.view" },
    { label: "Daily", key: "finance-daily", children: [
      { label: "Cashier", path: "/finance/cashier", permission: "fee-payments.create" },
      { label: "Billing Run", path: "/finance/billing-runs", permission: "fee-invoices.view" },
      { label: "Payroll", path: "/finance/payroll", permission: "payroll.view" },
      { label: "Fee Invoices", path: "/finance/fee-invoices", permission: "fee-invoices.view" },
      { label: "Fee Payments", path: "/finance/fee-payments", permission: "fee-payments.view" },
    ]},
    { label: "Reports", key: "finance-reports", children: [
      { label: "Class Collection", path: "/finance/reports/class-collection", permission: "fee-invoices.view" },
    ]},
    { label: "Bookkeeping", key: "finance-bookkeeping", children: [
      { label: "Journal Entries", path: "/finance/journal-entries", permission: "journal-entries.view" },
      // { label: "Vendor Invoices", path: "/finance/invoices", permission: "invoices.view" },
      // { label: "Vendor Payments", path: "/finance/payments", permission: "payments.view" },
      { label: "Budgets", path: "/finance/budgets", permission: "budgets.view" },
    ]},
    { label: "Setup", key: "finance-setup", children: [
      { label: "Chart of Accounts", path: "/finance/chart-of-accounts", permission: "chart-of-accounts.view" },
      { label: "Accounts", path: "/finance/accounts", permission: "accounts.view" },
      { label: "Parties", path: "/finance/parties", permission: "parties.view" },
    ]},
  ];

  const closeSidebar = () => setSidebarOpen(false);

  const handleLogout = () => {
    Swal.fire({
      title: "Logout?",
      text: "Are you sure you want to logout?",
      icon: "question",
      showCancelButton: true,
      confirmButtonColor: "#0d9488",
      cancelButtonColor: "#6b7280",
      confirmButtonText: "Yes, logout",
    }).then((result) => {
      if (result.isConfirmed) {
        localStorage.removeItem("token");
        localStorage.removeItem("user");
        navigate("/login");
      }
    });
  };

  return (
    <div className="flex bg-gray-50 min-h-screen">
      {/* Mobile Sidebar Overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 z-40 lg:hidden"
          onClick={closeSidebar}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed lg:sticky lg:top-0 left-0 z-50 w-64 bg-teal-800 flex flex-col h-screen lg:h-screen overflow-y-auto transition-transform duration-300 ${
          sidebarOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
        }`}
      >
        {/* Logo */}
        <div className="p-3 flex items-center justify-between lg:justify-start gap-2">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 bg-teal-600 rounded-lg flex items-center justify-center">
              <svg
                className="w-4 h-4 text-white"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 14l9-5-9-5-9 5 9 5z"
                />
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 14l6.16-3.422a12.083 12.083 0 01.665 6.479A11.952 11.952 0 0012 20.055a11.952 11.952 0 00-6.824-2.998 12.078 12.078 0 01.665-6.479L12 14z"
                />
              </svg>
            </div>
            <div>
              <h1 className="text-white font-bold text-sm">Wifaq School</h1>
              <p className="text-teal-300 text-[10px] uppercase tracking-wider">
                Admin Portal
              </p>
            </div>
          </div>
          <button
            className="lg:hidden text-teal-200 hover:text-white"
            onClick={closeSidebar}
          >
            <Icons.Close />
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-3 space-y-1">
          <MenuSection title="Main Menu" />
          <SidebarItem
            icon={Icons.Dashboard}
            label="Dashboard"
            to="/"
            active={isActive("/")}
            onClick={closeSidebar}
          />
          {(canSeeGroup(branchesMenus) || canSeeGroup(hrSubMenus)) && <MenuSection title="HR Management" />}
          {canSeeGroup(branchesMenus) && (
            <ParentMenu
              icon={Icons.Departments}
              label="Branches"
              isOpen={openMenu.includes("branches")}
              onClick={() => toggleMenu("branches")}
            >
              {visible(branchesMenus).map((item) => (
                <SubMenuItem
                  key={item.path}
                  label={item.label}
                  to={item.path}
                  active={isActive(item.path)}
                  onClick={closeSidebar}
                />
              ))}
            </ParentMenu>
          )}

          {canSeeGroup(hrSubMenus) && (
          <ParentMenu
            icon={Icons.HR}
            label="HR Management"
            isOpen={openMenu.includes("hr")}
            onClick={() => toggleMenu("hr")}
          >
            {visible(hrSubMenus).map((item) =>
              item.children ? (
                <div key={item.key}>
                  <button
                    onClick={() => setOpenSubMenu((p) => p.includes(item.key) ? p.filter((k) => k !== item.key) : [...p, item.key])}
                    className={`w-full flex items-center justify-between px-3 py-1.5 pl-10 rounded-lg transition-colors text-xs ${
                      openSubMenu.includes(item.key)
                        ? "bg-teal-700 text-white"
                        : "text-teal-200 hover:bg-teal-800 hover:text-white"
                    }`}
                  >
                    <span>{item.label}</span>
                    <svg className={`w-3 h-3 transition-transform ${openSubMenu.includes(item.key) ? "rotate-180" : ""}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </button>
                  {openSubMenu.includes(item.key) && (
                    <div className="mt-0.5 space-y-0.5">
                      {visible(item.children).map((child) => (
                        <Link key={child.path} to={child.path} onClick={closeSidebar}
                          className={`flex items-center px-3 py-1.5 pl-14 rounded-lg transition-colors text-xs ${
                            isActive(child.path) ? "bg-teal-700 text-white" : "text-teal-300 hover:bg-teal-800 hover:text-white"
                          }`}>
                          <span>{child.label}</span>
                        </Link>
                      ))}
                    </div>
                  )}
                </div>
              ) : (
                <SubMenuItem
                  key={item.path}
                  label={item.label}
                  to={item.path}
                  active={isActive(item.path)}
                  onClick={closeSidebar}
                />
              )
            )}
          </ParentMenu>
          )}

          {canSeeGroup(recruitmentMenus) && (
          <ParentMenu
            icon={Icons.Departments}
            label="Job Applications"
            isOpen={openMenu.includes("recruitment")}
            onClick={() => toggleMenu("recruitment")}
          >
            {visible(recruitmentMenus).map((item) => (
              <SubMenuItem
                key={item.path}
                label={item.label}
                to={item.path}
                active={isActive(item.path)}
                onClick={closeSidebar}
              />
            ))}
          </ParentMenu>
          )}

          {(canSeeGroup(teacherMenus) || canSeeGroup(classMgmtMenus) || canSeeGroup(academic) || canSeeGroup(studentsMenus)) && (
            <MenuSection title="Academic" />
          )}
          {canSeeGroup(teacherMenus) && (
            <ParentMenu
              icon={Icons.Teacher}
              label="Teacher"
              isOpen={openMenu.includes("teacher-management")}
              onClick={() => toggleMenu("teacher-management")}
            >
              {visible(teacherMenus).map((item) => (
                <SubMenuItem key={item.path} label={item.label} to={item.path}
                             active={isActive(item.path)} onClick={closeSidebar} />
              ))}
            </ParentMenu>
          )}

          {canSeeGroup(classMgmtMenus) && (
            <ParentMenu
              icon={Icons.ClassManagement}
              label="Class Management"
              isOpen={openMenu.includes("class-management")}
              onClick={() => toggleMenu("class-management")}
            >
              {visible(classMgmtMenus).map((item) => (
                <SubMenuItem key={item.path} label={item.label} to={item.path}
                             active={isActive(item.path)} onClick={closeSidebar} />
              ))}
            </ParentMenu>
          )}

          {canSeeGroup(academic) && (
            <ParentMenu
              icon={Icons.HR}
              label="Academic"
              isOpen={openMenu.includes("academic")}
              onClick={() => toggleMenu("academic")}
            >
              {visible(academic).map((item) => (
                <SubMenuItem key={item.path} label={item.label} to={item.path}
                             active={isActive(item.path)} onClick={closeSidebar} />
              ))}
            </ParentMenu>
          )}

          {canSeeGroup(studentsMenus) && (
            <ParentMenu
              icon={Icons.HR}
              label="Students"
              isOpen={openMenu.includes("students")}
              onClick={() => toggleMenu("students")}
            >
              {visible(studentsMenus).map((item) => (
                <SubMenuItem key={item.path} label={item.label} to={item.path}
                             active={isActive(item.path)} onClick={closeSidebar} />
              ))}
            </ParentMenu>
          )}

          {canSeeGroup(transportationMenus) && (
            <>
              <MenuSection title="Transportation" />
              <ParentMenu
                icon={Icons.Departments}
                label="Transportations"
                isOpen={openMenu.includes("transportation")}
                onClick={() => toggleMenu("transportation")}
              >
                {visible(transportationMenus).map((item) => (
                  <SubMenuItem key={item.path} label={item.label} to={item.path}
                               active={isActive(item.path)} onClick={closeSidebar} />
                ))}
              </ParentMenu>
            </>
          )}

          {canSeeGroup(purchaseMenus) && (
            <>
              <MenuSection title="Procurement" />
              <ParentMenu
                icon={Icons.Payroll}
                label="Purchase"
                isOpen={openMenu.includes("purchase")}
                onClick={() => toggleMenu("purchase")}
              >
                {visible(purchaseMenus).map((item) => (
                  <SubMenuItem key={item.path} label={item.label} to={item.path}
                               active={isActive(item.path)} onClick={closeSidebar} />
                ))}
              </ParentMenu>
            </>
          )}

          {canSeeGroup(financeMenus) && (
            <>
              <MenuSection title="Finance" />
              <ParentMenu
                icon={Icons.Payroll}
                label="Finance"
                isOpen={openMenu.includes("finance")}
                onClick={() => toggleMenu("finance")}
              >
                {visible(financeMenus).map((item) =>
                  item.children ? (
                    <div key={item.key}>
                      <button
                        onClick={() => setOpenSubMenu((p) => p.includes(item.key) ? p.filter((k) => k !== item.key) : [...p, item.key])}
                        className={`w-full flex items-center justify-between px-3 py-1.5 pl-10 rounded-lg transition-colors text-xs ${
                          openSubMenu.includes(item.key)
                            ? "bg-teal-700 text-white"
                            : "text-teal-200 hover:bg-teal-800 hover:text-white"
                        }`}
                      >
                        <span>{item.label}</span>
                        <svg className={`w-3 h-3 transition-transform ${openSubMenu.includes(item.key) ? "rotate-180" : ""}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                        </svg>
                      </button>
                      {openSubMenu.includes(item.key) && (
                        <div className="mt-0.5 space-y-0.5">
                          {visible(item.children).map((child) => (
                            <Link key={child.path} to={child.path} onClick={closeSidebar}
                              className={`flex items-center px-3 py-1.5 pl-14 rounded-lg transition-colors text-xs ${
                                isActive(child.path) ? "bg-teal-700 text-white" : "text-teal-300 hover:bg-teal-800 hover:text-white"
                              }`}>
                              <span>{child.label}</span>
                            </Link>
                          ))}
                        </div>
                      )}
                    </div>
                  ) : (
                    <SubMenuItem
                      key={item.path}
                      label={item.label}
                      to={item.path}
                      active={isActive(item.path)}
                      onClick={closeSidebar}
                    />
                  )
                )}
              </ParentMenu>
            </>
          )}

          {/* <MenuSection title="Operations" />
          <SidebarItem
            icon={Icons.Payroll}
            label="Payroll"
            to="/payroll"
            active={isActive("/payroll")}
            onClick={closeSidebar}
          />
          <SidebarItem
            icon={Icons.Leave}
            label="Leave Requests"
            to="/leave-requests"
            active={isActive("/leave-requests")}
            onClick={closeSidebar}
          />
          <SidebarItem
            icon={Icons.Puzzle}
            label="Number Puzzle"
            to="/number-puzzle"
            active={isActive("/number-puzzle")}
            onClick={closeSidebar}
          /> */}

          {visible(adminMenus).length > 0 && (
            <>
              <MenuSection title="Administration" />
              <ParentMenu
                icon={Icons.Settings}
                label="Access Control"
                isOpen={openMenu.includes("admin")}
                onClick={() => toggleMenu("admin")}
              >
                {visible(adminMenus).map((item) => (
                  <SubMenuItem
                    key={item.path}
                    label={item.label}
                    to={item.path}
                    active={isActive(item.path)}
                    onClick={closeSidebar}
                  />
                ))}
              </ParentMenu>
            </>
          )}

          {/* <MenuSection title="System" />
          <SidebarItem
            icon={Icons.Settings}
            label="Settings"
            to="/settings"
            active={isActive("/settings")}
            onClick={closeSidebar}
          />
          <SidebarItem
            icon={Icons.Support}
            label="Support"
            to="/support"
            active={isActive("/support")}
            onClick={closeSidebar}
          /> */}
        </nav>

        {/* User Profile */}
        <div className="p-3 border-t border-teal-700">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-full bg-teal-600 flex items-center justify-center text-white font-medium text-xs">
              {user.name?.charAt(0) || "U"}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-white font-medium text-xs truncate">
                {user.name || "User"}
              </p>
              <p className="text-teal-300 text-[10px]">{user.email || ""}</p>
            </div>
            <button
              onClick={handleLogout}
              className="text-teal-300 hover:text-white flex-shrink-0"
              title="Logout"
            >
              <Icons.Logout />
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col min-w-0 min-h-screen">
        {/* Header */}
        <header className="bg-white border-b border-gray-200 px-3 py-2 sticky top-0 z-30">
          <div className="flex items-center justify-between gap-3">
            <button
              className="lg:hidden p-1.5 text-gray-600 hover:text-gray-800"
              onClick={() => setSidebarOpen(true)}
            >
              <Icons.Menu />
            </button>
            <div className="flex-1 max-w-lg hidden sm:block">
              <div className="relative">
                <div className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400">
                  <Icons.Search />
                </div>
                <input
                  type="text"
                  placeholder="Search..."
                  className="w-full pl-9 pr-3 py-1.5 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 text-xs"
                />
              </div>
            </div>
            <div className="flex items-center gap-2">
              <div className="hidden sm:flex items-center gap-1">
                <button className="px-2 py-0.5 text-xs font-medium text-gray-600 hover:text-gray-800">
                  EN
                </button>
                <button className="px-2 py-0.5 text-xs font-medium text-gray-400 hover:text-gray-600">
                  AR
                </button>
              </div>
              <NotificationBell />
              <ProfileButton />
            </div>
          </div>
        </header>

        {/* Page Content */}
        <div className="flex-1 overflow-auto">
          <Suspense key={location.pathname} fallback={<PageFallback />}>
            <PathPermissionGate>
              <Outlet />
            </PathPermissionGate>
          </Suspense>
        </div>
      </main>
    </div>
  );
}
