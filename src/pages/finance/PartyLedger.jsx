import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { getParty, getPartyLedger, getPartyBalance } from "../../api/financial";
import Swal from "sweetalert2";

const entryTypeConfig = {
  advance_given: { label: "Advance Given", color: "bg-blue-50 text-blue-700 border-blue-200", icon: "↑" },
  expense_recorded: { label: "Expense", color: "bg-red-50 text-red-700 border-red-200", icon: "↓" },
  repayment: { label: "Repayment", color: "bg-emerald-50 text-emerald-700 border-emerald-200", icon: "↗" },
  refund: { label: "Refund", color: "bg-amber-50 text-amber-700 border-amber-200", icon: "↩" },
  invoice: { label: "Invoice", color: "bg-purple-50 text-purple-700 border-purple-200", icon: "📝" },
  payment: { label: "Payment", color: "bg-teal-50 text-teal-700 border-teal-200", icon: "💵" },
  adjustment: { label: "Adjustment", color: "bg-gray-50 text-gray-700 border-gray-200", icon: "⚙" },
};

export default function PartyLedger() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [party, setParty] = useState(null);
  const [ledger, setLedger] = useState([]);
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, [id]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [partyRes, ledgerRes, balanceRes] = await Promise.all([
        getParty(id),
        getPartyLedger(id),
        getPartyBalance(id),
      ]);
      setParty(partyRes.data?.data);
      setLedger(ledgerRes.data?.data?.ledger || []);
      setSummary(ledgerRes.data?.data?.summary);
    } catch (error) {
      console.error('Failed to fetch party data:', error);
      Swal.fire("Error", "Failed to load party data", "error");
    } finally {
      setLoading(false);
    }
  };

  const calculateBalance = (index) => {
    if (!summary) return 0;
    let balance = summary.opening_balance || 0;
    for (let i = 0; i <= index; i++) {
      const entry = ledger[i];
      if (entry.direction === 'debit') {
        balance += parseFloat(entry.amount);
      } else {
        balance -= parseFloat(entry.amount);
      }
    }
    return balance;
  };

  if (loading) {
    return (
      <div className="px-4 py-4">
        <div className="animate-pulse">
          <div className="h-4 bg-gray-200 rounded w-1/4 mb-4"></div>
          <div className="h-20 bg-gray-200 rounded mb-4"></div>
          <div className="space-y-2">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-12 bg-gray-200 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (!party) {
    return (
      <div className="px-4 py-4">
        <div className="text-center py-12 text-gray-500">
          <p>Party not found</p>
          <button onClick={() => navigate("/finance/parties")}
            className="mt-4 px-4 py-2 bg-teal-600 text-white rounded-lg text-xs">
            Back to Parties
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="px-4 py-4">
      {/* Header */}
      <div className="mb-4">
        <div className="flex items-center gap-2 mb-2">
          <button onClick={() => navigate("/finance/parties")}
            className="p-1 text-gray-400 hover:text-gray-600">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <h2 className="text-base font-bold text-gray-800">Party Ledger</h2>
        </div>
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-teal-100 text-teal-600 flex items-center justify-center">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
            </svg>
          </div>
          <div>
            <p className="text-sm font-bold text-gray-800">{party.full_name}</p>
            <p className="text-[10px] text-gray-500 font-mono">{party.party_code} • {party.party_type}</p>
          </div>
        </div>
      </div>

      {/* Balance Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-4">
        <div className="bg-gradient-to-r from-teal-600 to-teal-700 rounded-xl p-3 text-white sm:col-span-2">
          <p className="text-[10px] uppercase tracking-wider text-teal-200">Closing balance</p>
          <p className="text-xl font-bold">{(summary?.closing_balance ?? party.current_balance ?? 0).toLocaleString()} AFN</p>
          <p className="text-[9px] text-teal-100 mt-1">Opening {(summary?.opening_balance ?? 0).toLocaleString()} + debits − credits</p>
        </div>
        <div className="bg-white rounded-xl p-3 border border-gray-200">
          <p className="text-[10px] uppercase tracking-wider text-gray-500">Total debits</p>
          <p className="text-lg font-bold text-blue-600">{(summary?.total_debit ?? 0).toLocaleString()} AFN</p>
        </div>
        <div className="bg-white rounded-xl p-3 border border-gray-200">
          <p className="text-[10px] uppercase tracking-wider text-gray-500">Total credits</p>
          <p className="text-lg font-bold text-emerald-600">{(summary?.total_credit ?? 0).toLocaleString()} AFN</p>
        </div>
      </div>

      {/* Ledger Table */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="px-4 py-2 bg-gray-50 border-b border-gray-100 flex items-center justify-between">
          <h3 className="text-xs font-semibold text-gray-700">Transaction History</h3>
          <button onClick={() => navigate(`/finance/journal-entries/create?party_id=${id}`)}
            className="px-2 py-1 text-[10px] font-medium text-teal-600 bg-teal-50 rounded hover:bg-teal-100">
            + New Entry
          </button>
        </div>
        <table className="w-full">
          <thead className="bg-teal-50">
            <tr>
              <th className="px-3 py-2 text-left text-[10px] font-semibold text-teal-800 uppercase">Date</th>
              <th className="px-3 py-2 text-left text-[10px] font-semibold text-teal-800 uppercase">Type</th>
              <th className="px-3 py-2 text-left text-[10px] font-semibold text-teal-800 uppercase">Description</th>
              <th className="px-3 py-2 text-right text-[10px] font-semibold text-teal-800 uppercase">Debit</th>
              <th className="px-3 py-2 text-right text-[10px] font-semibold text-teal-800 uppercase">Credit</th>
              <th className="px-3 py-2 text-right text-[10px] font-semibold text-teal-800 uppercase">Balance</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {/* Opening Balance */}
            <tr className="bg-gray-50">
              <td className="px-3 py-2 text-[10px] text-gray-500">-</td>
              <td className="px-3 py-2">
                <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold border bg-gray-100 text-gray-600">Opening</span>
              </td>
              <td className="px-3 py-2 text-[10px] text-gray-600">Opening Balance</td>
              <td className="px-3 py-2 text-right text-[10px]">-</td>
              <td className="px-3 py-2 text-right text-[10px]">-</td>
              <td className="px-3 py-2 text-right text-[10px] font-mono font-medium">{(summary?.opening_balance || 0).toLocaleString()}</td>
            </tr>
            {ledger.map((entry, index) => {
              const config = entryTypeConfig[entry.entry_type] || entryTypeConfig.adjustment;
              const runningBalance = calculateBalance(index);
              return (
                <tr key={entry.id} className="hover:bg-gray-50">
                  <td className="px-3 py-2 text-[10px] text-gray-600">{entry.transaction_date}</td>
                  <td className="px-3 py-2">
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold border ${config.color}`}>
                      {config.label}
                    </span>
                  </td>
                  <td className="px-3 py-2 text-[10px] text-gray-600 max-w-[200px] truncate">{entry.description || "-"}</td>
                  <td className="px-3 py-2 text-right text-[10px] font-mono text-red-600">
                    {entry.direction === 'debit' ? entry.amount.toLocaleString() : '-'}
                  </td>
                  <td className="px-3 py-2 text-right text-[10px] font-mono text-emerald-600">
                    {entry.direction === 'credit' ? entry.amount.toLocaleString() : '-'}
                  </td>
                  <td className="px-3 py-2 text-right text-[10px] font-mono font-medium">{runningBalance.toLocaleString()}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {ledger.length === 0 && (
          <div className="text-center py-8 text-xs text-gray-400">
            No transactions yet. Use journal entries to record activity.
          </div>
        )}
      </div>

      {/* Example Workflow Help */}
      <div className="mt-4 p-3 bg-blue-50 rounded-lg border border-blue-100">
        <p className="text-[10px] font-semibold text-blue-800 mb-1">Common Workflows:</p>
        <ul className="text-[10px] text-blue-700 space-y-0.5">
          <li>• <strong>Give Advance:</strong> Debit Employee Advances, Credit Cash/Bank (party linked)</li>
          <li>• <strong>Record Expense:</strong> Debit Expense Account, Credit Employee Advances (party linked)</li>
          <li>• <strong>Return Money:</strong> Debit Cash/Bank, Credit Employee Advances (party linked)</li>
        </ul>
      </div>
    </div>
  );
}
