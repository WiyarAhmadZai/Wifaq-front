import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { getJournalEntries, postJournalEntry } from "../../api/financial";
import Swal from "sweetalert2";

import { fmtDate } from "../../utils/formErrors";
const statusStyles = {
  draft: "bg-gray-50 text-gray-700 border-gray-200",
  posted: "bg-emerald-50 text-emerald-700 border-emerald-200",
};

export default function JournalEntries() {
  const navigate = useNavigate();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState("all");

  const fetchItems = async () => {
    setLoading(true);
    try {
      const params = {};
      if (status !== "all") params.status = status;
      const res = await getJournalEntries(params);
      setItems(res.data?.data?.data || res.data?.data || []);
    } catch (e) {
      setItems([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchItems();
  }, [status]);

  const handlePost = async (id) => {
    const r = await Swal.fire({
      title: "Post journal entry?",
      text: "This will enforce budget rules and lock the entry as posted.",
      icon: "warning",
      showCancelButton: true,
      confirmButtonText: "Post",
    });

    if (!r.isConfirmed) return;

    try {
      await postJournalEntry(id);
      Swal.fire("Posted!", "Journal entry posted successfully.", "success");
      await fetchItems();
    } catch (err) {
      Swal.fire("Error", err.response?.data?.message || "Failed to post", "error");
    }
  };

  return (
    <div className="px-4 py-4">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
        <div>
          <h2 className="text-base font-bold text-gray-800">Journal Entries</h2>
          <p className="text-xs text-gray-500">Double-entry transactions (draft & posted)</p>
        </div>
        <div className="flex items-center gap-2">
          <select value={status} onChange={(e) => setStatus(e.target.value)}
            className="px-2.5 py-1 border border-gray-200 rounded-lg text-[10px] text-gray-700 focus:ring-1 focus:ring-teal-500">
            <option value="all">All</option>
            <option value="draft">Draft</option>
            <option value="posted">Posted</option>
          </select>
          <button
            onClick={() => navigate("/finance/journal-entries/create")}
            className="px-3 py-1.5 bg-teal-600 text-white rounded-lg hover:bg-teal-700 text-xs font-medium flex items-center gap-1.5"
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            New Entry
          </button>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[900px]">
            <thead className="bg-teal-50">
              <tr>
                <th className="px-4 py-2 text-left text-[10px] font-semibold text-teal-800 uppercase">Entry #</th>
                <th className="px-4 py-2 text-left text-[10px] font-semibold text-teal-800 uppercase">Date</th>
                <th className="px-4 py-2 text-left text-[10px] font-semibold text-teal-800 uppercase">Description</th>
                <th className="px-4 py-2 text-right text-[10px] font-semibold text-teal-800 uppercase">Debit</th>
                <th className="px-4 py-2 text-right text-[10px] font-semibold text-teal-800 uppercase">Credit</th>
                <th className="px-4 py-2 text-left text-[10px] font-semibold text-teal-800 uppercase">Status</th>
                <th className="px-4 py-2 text-right text-[10px] font-semibold text-teal-800 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {items.map((je) => {
                const st = statusStyles[je.status] || statusStyles.draft;
                return (
                  <tr key={je.id} className="hover:bg-gray-50 cursor-pointer" onClick={() => navigate(`/finance/journal-entries/show/${je.id}`)}>
                    <td className="px-4 py-2.5 text-xs font-medium text-teal-700">{je.entry_number || `JE#${je.id}`}</td>
                    <td className="px-4 py-2.5 text-xs text-gray-500">{fmtDate(je.transaction_date)}</td>
                    <td className="px-4 py-2.5 text-xs text-gray-700">{je.description}</td>
                    <td className="px-4 py-2.5 text-xs text-gray-600 text-right">{Number(je.total_debit || 0).toLocaleString()}</td>
                    <td className="px-4 py-2.5 text-xs text-gray-600 text-right">{Number(je.total_credit || 0).toLocaleString()}</td>
                    <td className="px-4 py-2.5 text-xs">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold border ${st}`}>{je.status}</span>
                    </td>
                    <td className="px-4 py-2.5 text-right" onClick={(e) => e.stopPropagation()}>
                      <div className="flex items-center justify-end gap-1">
                        <button onClick={() => navigate(`/finance/journal-entries/show/${je.id}`)} className="p-1 text-teal-600 hover:bg-teal-50 rounded">
                          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0zM2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
                        </button>
                        {je.status === "draft" && (
                          <button onClick={() => handlePost(je.id)} className="p-1 text-emerald-600 hover:bg-emerald-50 rounded">
                            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {!loading && items.length === 0 && (
            <div className="text-center py-10 text-xs text-gray-400">No journal entries found</div>
          )}
        </div>
      </div>
    </div>
  );
}
