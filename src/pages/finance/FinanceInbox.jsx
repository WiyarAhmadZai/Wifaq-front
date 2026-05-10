import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { get, put } from "../../api/axios";

function timeAgo(date) {
  if (!date) return "";
  const diff = (Date.now() - new Date(date).getTime()) / 1000;
  if (diff < 60) return "Just now";
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  if (diff < 604800) return `${Math.floor(diff / 86400)}d ago`;
  return new Date(date).toLocaleDateString();
}

export default function FinanceInbox() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);

  const fetchNotifications = useCallback(async () => {
    setLoading(true);
    try {
      const res = await get("/notifications");
      setItems(res.data?.data || []);
      setUnreadCount(res.data?.unread_count || 0);
    } catch {
      setItems([]);
      setUnreadCount(0);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchNotifications();
  }, [fetchNotifications]);

  const dailySummaries = useMemo(() => {
    return (items || []).filter((n) => n?.data?.type === "daily_fee_summary");
  }, [items]);

  const latestSummary = dailySummaries[0];
  const summary = latestSummary?.data?.summary || null;

  const markAsRead = async (id) => {
    try {
      await put(`/notifications/${id}/read`);
    } catch {
      // ignore
    }
    setItems((p) => p.map((n) => (n.id === id ? { ...n, read_at: n.read_at || new Date().toISOString() } : n)));
    setUnreadCount((p) => Math.max(0, p - 1));
  };

  const markAllRead = async () => {
    try {
      await put("/notifications/read-all");
    } catch {
      // ignore
    }
    setItems((p) => p.map((n) => ({ ...n, read_at: n.read_at || new Date().toISOString() })));
    setUnreadCount(0);
  };

  const openFeeInvoices = (status) => {
    if (!status) {
      navigate("/finance/fee-invoices");
      return;
    }
    navigate(`/finance/fee-invoices?status=${encodeURIComponent(status)}`);
  };

  return (
    <div className="px-4 py-4">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-base font-bold text-gray-800">Finance Inbox</h2>
          <p className="text-xs text-gray-500">Your daily finance alerts and actions</p>
        </div>
        <div className="flex items-center gap-2">
          {unreadCount > 0 && (
            <button onClick={markAllRead} className="px-3 py-1.5 bg-white border border-gray-200 rounded-lg text-xs font-semibold text-gray-700 hover:border-teal-300">
              Mark all read
            </button>
          )}
          <button onClick={fetchNotifications} className="px-3 py-1.5 bg-teal-600 text-white rounded-lg text-xs font-semibold hover:bg-teal-700">
            Refresh
          </button>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-64"><div className="animate-spin rounded-full h-10 w-10 border-b-2 border-teal-600"></div></div>
      ) : (
        <>
          <div className="bg-white rounded-xl border border-gray-200 p-4 mb-4">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h3 className="text-xs font-semibold text-gray-800 uppercase tracking-wider">Daily summary</h3>
                <p className="text-[11px] text-gray-500 mt-1">
                  {latestSummary ? `Generated ${timeAgo(latestSummary.created_at)} (Date: ${latestSummary.data?.date})` : "No daily summary yet"}
                </p>
              </div>
              {latestSummary && !latestSummary.read_at && (
                <button onClick={() => markAsRead(latestSummary.id)} className="px-3 py-1.5 bg-teal-50 text-teal-700 rounded-lg text-xs font-semibold hover:bg-teal-100">
                  Mark read
                </button>
              )}
            </div>

            {!summary ? (
              <div className="text-xs text-gray-400 mt-4">No data to show.</div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-4">
                <button onClick={() => openFeeInvoices("overdue")} className="text-left bg-red-50 border border-red-200 rounded-xl p-3 hover:border-red-300">
                  <p className="text-[10px] text-red-700 font-semibold">Overdue invoices</p>
                  <p className="text-lg font-bold text-red-800 mt-1">{Number(summary.overdue_count || 0).toLocaleString()}</p>
                </button>
                <button onClick={() => openFeeInvoices("pending")} className="text-left bg-amber-50 border border-amber-200 rounded-xl p-3 hover:border-amber-300">
                  <p className="text-[10px] text-amber-700 font-semibold">Due soon ({summary.due_soon_window_days} days)</p>
                  <p className="text-lg font-bold text-amber-800 mt-1">{Number(summary.due_soon_count || 0).toLocaleString()}</p>
                </button>
                <button onClick={() => openFeeInvoices("all")} className="text-left bg-teal-50 border border-teal-200 rounded-xl p-3 hover:border-teal-300">
                  <p className="text-[10px] text-teal-700 font-semibold">Unpaid this month</p>
                  <p className="text-lg font-bold text-teal-800 mt-1">{Number(summary.unpaid_this_month_count || 0).toLocaleString()}</p>
                </button>
              </div>
            )}
          </div>

          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            <div className="px-4 py-3 bg-gray-50 border-b border-gray-100 flex items-center justify-between">
              <h3 className="text-xs font-semibold text-gray-800 uppercase tracking-wider">All notifications</h3>
              <span className="text-[10px] text-gray-500">Showing latest 50</span>
            </div>

            {items.length === 0 ? (
              <div className="py-10 text-center text-xs text-gray-400">No notifications yet</div>
            ) : (
              <div className="divide-y divide-gray-100">
                {items.map((n) => {
                  const unread = !n.read_at;
                  const isDaily = n?.data?.type === "daily_fee_summary";
                  const title = n?.data?.title || (isDaily ? "Daily fee collection summary" : "Notification");
                  const message = n?.data?.message || (isDaily ? "Fee summary generated" : "");

                  return (
                    <div key={n.id} className={`px-4 py-3 flex items-start justify-between gap-3 ${unread ? "bg-teal-50/30" : ""}`}>
                      <div className="min-w-0">
                        <p className={`text-xs ${unread ? "font-semibold text-gray-800" : "text-gray-700"}`}>{title}</p>
                        {message && <p className="text-[11px] text-gray-500 mt-0.5 truncate">{message}</p>}
                        <p className="text-[10px] text-gray-400 mt-1">{timeAgo(n.created_at)}</p>
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        {isDaily && (
                          <button onClick={() => openFeeInvoices("overdue")} className="px-2.5 py-1 bg-white border border-gray-200 rounded-lg text-[10px] font-semibold text-gray-700 hover:border-teal-300">
                            View
                          </button>
                        )}
                        {unread && (
                          <button onClick={() => markAsRead(n.id)} className="px-2.5 py-1 bg-teal-600 text-white rounded-lg text-[10px] font-semibold hover:bg-teal-700">
                            Read
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
