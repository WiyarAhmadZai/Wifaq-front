import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { getJournalEntry, postJournalEntry } from "../../api/financial";
import { peekCache } from "../../api/axios";
import Swal from "sweetalert2";

import { fmtDate } from "../../utils/formErrors";
import { useAuth } from "../../admin/context/AuthContext";
import BudgetWarningModal from "../../components/finance/BudgetWarningModal";
export default function JournalEntryShow() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { hasPermission } = useAuth();
  // Posting a JE enforces budget rules and flips it to "posted" — it's the
  // privileged action on this page. Bind to journal-entries.manage.
  const canPost = hasPermission("journal-entries.manage");
  const canOverrideBudget = hasPermission("budgets.override");
  const [loading, setLoading] = useState(false);
  const [je, setJe] = useState(null);
  // When the backend returns 409 + budget_breach we stash it here so the
  // modal can render. Confirming the modal re-runs the same post with a reason.
  const [breach, setBreach] = useState(null);
  const [overriding, setOverriding] = useState(false);

  const fetchOne = async () => {
    setLoading(true);
    try {
      const __cached = peekCache(`/financial/journal-entries/${id}`);
      if (__cached) { setJe(__cached?.data ?? __cached); setLoading(false); }
      const res = await getJournalEntry(id);
      setJe(res.data?.data || res.data);
    } catch {
      setJe(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOne();
  }, [id]);

  // Post the JE, optionally with a budget override reason. Used both by the
  // initial "Post" click (no reason) and by the modal's Confirm (with reason).
  const submitPost = async (overrideReason) => {
    try {
      await postJournalEntry(id, overrideReason ? { budget_override_reason: overrideReason } : {});
      setBreach(null);
      Swal.fire({
        toast: true, position: "top-end", icon: "success",
        title: overrideReason ? "Posted with override" : "Posted",
        timer: 1600, showConfirmButton: false,
      });
      await fetchOne();
    } catch (err) {
      // Soft-warn-and-override: 409 with budget_breach → pop the modal.
      if (err.response?.status === 409 && err.response.data?.budget_breach) {
        setBreach(err.response.data.budget_breach);
        return;
      }
      Swal.fire("Error", err.response?.data?.message || "Failed to post", "error");
    } finally {
      setOverriding(false);
    }
  };

  const handlePost = async () => {
    const r = await Swal.fire({
      title: "Post journal entry?",
      text: "This locks the entry and recognises the spend against budgets.",
      icon: "warning",
      showCancelButton: true,
      confirmButtonText: "Post",
    });
    if (!r.isConfirmed) return;
    await submitPost(null);
  };

  const handleOverride = async (reason) => {
    setOverriding(true);
    await submitPost(reason);
  };

  if (loading && !je) {
    return <div className="px-4 py-8 text-xs text-gray-400">Loading...</div>;
  }

  if (!je) {
    return (
      <div className="px-4 py-8">
        <p className="text-xs text-gray-500 mb-3">Journal entry not found.</p>
        <button onClick={() => navigate("/finance/journal-entries")} className="px-4 py-2 bg-teal-600 text-white rounded-lg text-xs">Back</button>
      </div>
    );
  }

  return (
    <div className="px-4 py-4">
      <div className="flex items-start justify-between gap-3 mb-4">
        <div className="flex items-start gap-2">
          <button onClick={() => navigate("/finance/journal-entries")} className="text-gray-400 hover:text-gray-600 mt-0.5">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <div>
            <h2 className="text-base font-bold text-gray-800">{je.entry_number || `JE#${je.id}`}</h2>
            <p className="text-xs text-gray-500">{fmtDate(je.transaction_date)} · {je.status}</p>
            <p className="text-xs text-gray-700 mt-1">{je.description}</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {je.status === "draft" && canPost && (
            <button onClick={handlePost} className="px-3 py-1.5 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 text-xs font-medium">
              Post
            </button>
          )}
        </div>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[900px]">
            <thead className="bg-teal-50">
              <tr>
                <th className="px-4 py-2 text-left text-[10px] font-semibold text-teal-800 uppercase">#</th>
                <th className="px-4 py-2 text-left text-[10px] font-semibold text-teal-800 uppercase">Account</th>
                <th className="px-4 py-2 text-right text-[10px] font-semibold text-teal-800 uppercase">Debit</th>
                <th className="px-4 py-2 text-right text-[10px] font-semibold text-teal-800 uppercase">Credit</th>
                <th className="px-4 py-2 text-left text-[10px] font-semibold text-teal-800 uppercase">Party</th>
                <th className="px-4 py-2 text-left text-[10px] font-semibold text-teal-800 uppercase">Cash / Bank</th>
                <th className="px-4 py-2 text-left text-[10px] font-semibold text-teal-800 uppercase">Description</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {(je.lines || []).map((l) => (
                <tr key={l.id}>
                  <td className="px-4 py-2.5 text-xs text-gray-500">{l.line_number}</td>
                  <td className="px-4 py-2.5 text-xs text-gray-700">{l.chart_account?.code} - {l.chart_account?.name}</td>
                  <td className="px-4 py-2.5 text-xs text-gray-600 text-right">{Number(l.debit || 0).toLocaleString()}</td>
                  <td className="px-4 py-2.5 text-xs text-gray-600 text-right">{Number(l.credit || 0).toLocaleString()}</td>
                  <td className="px-4 py-2.5 text-xs text-gray-500">
                    {l.party ? (
                      <span>
                        <span className="font-medium text-gray-800">{l.party.full_name || `Party #${l.party_id}`}</span>
                        {l.party.party_code && (
                          <span className="block text-[10px] text-gray-400 font-mono">{l.party.party_code}</span>
                        )}
                      </span>
                    ) : l.party_id ? `#${l.party_id}` : "—"}
                  </td>
                  <td className="px-4 py-2.5 text-xs text-gray-500">
                    {l.account?.account_name || (l.account_id ? `#${l.account_id}` : "—")}
                  </td>
                  <td className="px-4 py-2.5 text-xs text-gray-500">{l.description || "—"}</td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="border-t border-gray-200 bg-gray-50">
                <td colSpan={2} className="px-4 py-2 text-right text-xs font-semibold text-gray-700">Totals</td>
                <td className="px-4 py-2 text-right text-xs font-bold text-gray-800">{Number(je.total_debit || 0).toLocaleString()}</td>
                <td className="px-4 py-2 text-right text-xs font-bold text-gray-800">{Number(je.total_credit || 0).toLocaleString()}</td>
                <td colSpan={3}></td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>

      <BudgetWarningModal
        breach={breach}
        title="Posting would exceed a budget"
        canOverride={canOverrideBudget}
        busy={overriding}
        onClose={() => setBreach(null)}
        onConfirm={handleOverride}
      />
    </div>
  );
}
