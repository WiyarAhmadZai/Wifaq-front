import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { createJournalEntry, getChartOfAccounts } from "../../api/financial";
import Swal from "sweetalert2";

const emptyLine = { chart_account_id: "", debit: "", credit: "", description: "", party_id: "", account_id: "" };

function sumNum(arr, key) {
  return arr.reduce((s, x) => s + (Number(x[key]) || 0), 0);
}

export default function JournalEntryForm() {
  const navigate = useNavigate();
  const [saving, setSaving] = useState(false);
  const [accounts, setAccounts] = useState([]);
  const [form, setForm] = useState({
    description: "",
    transaction_date: new Date().toISOString().slice(0, 10),
  });
  const [lines, setLines] = useState([{ ...emptyLine }, { ...emptyLine }]);

  useEffect(() => {
    getChartOfAccounts({}).then((r) => {
      const list = r.data?.data?.data || r.data?.data || [];
      setAccounts(list.filter((a) => a.is_active));
    }).catch(() => setAccounts([]));
  }, []);

  const totalDebit = useMemo(() => sumNum(lines, "debit"), [lines]);
  const totalCredit = useMemo(() => sumNum(lines, "credit"), [lines]);
  const balanced = Math.abs(totalDebit - totalCredit) < 0.01 && totalDebit > 0;

  const handleLineChange = (idx, key, value) => {
    setLines((p) => p.map((l, i) => (i === idx ? { ...l, [key]: value } : l)));
  };

  const addLine = () => setLines((p) => [...p, { ...emptyLine }]);
  const removeLine = (idx) => {
    if (lines.length <= 2) return;
    setLines((p) => p.filter((_, i) => i !== idx));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!balanced) {
      Swal.fire("Not balanced", "Total debit must equal total credit.", "warning");
      return;
    }

    const payload = {
      description: form.description,
      transaction_date: form.transaction_date,
      lines: lines.map((l) => ({
        chart_account_id: Number(l.chart_account_id),
        party_id: l.party_id ? Number(l.party_id) : null,
        description: l.description || null,
        debit: l.debit === "" ? 0 : Number(l.debit),
        credit: l.credit === "" ? 0 : Number(l.credit),
        account_id: l.account_id ? Number(l.account_id) : null,
      })),
    };

    setSaving(true);
    try {
      const res = await createJournalEntry(payload);
      Swal.fire("Created!", "Journal entry created as draft.", "success");
      const id = res.data?.data?.id;
      if (id) navigate(`/finance/journal-entries/show/${id}`);
      else navigate("/finance/journal-entries");
    } catch (err) {
      Swal.fire("Error", err.response?.data?.message || "Failed to create", "error");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="px-4 py-4">
      <div className="flex items-center gap-2 mb-4">
        <button onClick={() => navigate("/finance/journal-entries")} className="text-gray-400 hover:text-gray-600">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <h2 className="text-base font-bold text-gray-800">New Journal Entry</h2>
      </div>

      <form onSubmit={handleSubmit} className="bg-white rounded-xl border border-gray-200 p-5 space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="sm:col-span-2">
            <label className="block text-[10px] font-semibold text-gray-500 uppercase mb-1">Description</label>
            <input value={form.description} onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))} required
              className="w-full px-3 py-2 text-xs border border-gray-200 rounded-lg focus:outline-none focus:border-teal-500" />
          </div>
          <div>
            <label className="block text-[10px] font-semibold text-gray-500 uppercase mb-1">Transaction Date</label>
            <input type="date" value={form.transaction_date} onChange={(e) => setForm((p) => ({ ...p, transaction_date: e.target.value }))} required
              className="w-full px-3 py-2 text-xs border border-gray-200 rounded-lg focus:outline-none focus:border-teal-500" />
          </div>
        </div>

        <div className="flex items-center justify-between">
          <div className="text-xs text-gray-600">
            Total Debit: <span className="font-semibold">{totalDebit.toLocaleString()}</span>
            <span className="mx-2 text-gray-300">|</span>
            Total Credit: <span className="font-semibold">{totalCredit.toLocaleString()}</span>
          </div>
          <div className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${balanced ? "bg-emerald-50 text-emerald-700 border-emerald-200" : "bg-amber-50 text-amber-700 border-amber-200"}`}>
            {balanced ? "Balanced" : "Not balanced"}
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[900px]">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-3 py-2 text-left text-[10px] font-semibold text-gray-600 uppercase">Account</th>
                <th className="px-3 py-2 text-right text-[10px] font-semibold text-gray-600 uppercase w-32">Debit</th>
                <th className="px-3 py-2 text-right text-[10px] font-semibold text-gray-600 uppercase w-32">Credit</th>
                <th className="px-3 py-2 text-left text-[10px] font-semibold text-gray-600 uppercase">Line Description</th>
                <th className="px-3 py-2 text-left text-[10px] font-semibold text-gray-600 uppercase w-28">Party ID</th>
                <th className="px-3 py-2 text-left text-[10px] font-semibold text-gray-600 uppercase w-28">Account ID</th>
                <th className="px-3 py-2 w-10"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {lines.map((l, idx) => (
                <tr key={idx}>
                  <td className="px-3 py-2">
                    <select value={l.chart_account_id} onChange={(e) => handleLineChange(idx, "chart_account_id", e.target.value)} required
                      className="w-full px-2 py-1 border border-gray-200 rounded text-xs focus:ring-1 focus:ring-teal-500">
                      <option value="">Select account</option>
                      {accounts.map((a) => (
                        <option key={a.id} value={a.id}>{a.code} - {a.name}</option>
                      ))}
                    </select>
                  </td>
                  <td className="px-3 py-2">
                    <input type="number" value={l.debit} onChange={(e) => handleLineChange(idx, "debit", e.target.value)}
                      className="w-full px-2 py-1 border border-gray-200 rounded text-xs text-right focus:ring-1 focus:ring-teal-500" />
                  </td>
                  <td className="px-3 py-2">
                    <input type="number" value={l.credit} onChange={(e) => handleLineChange(idx, "credit", e.target.value)}
                      className="w-full px-2 py-1 border border-gray-200 rounded text-xs text-right focus:ring-1 focus:ring-teal-500" />
                  </td>
                  <td className="px-3 py-2">
                    <input value={l.description} onChange={(e) => handleLineChange(idx, "description", e.target.value)}
                      className="w-full px-2 py-1 border border-gray-200 rounded text-xs focus:ring-1 focus:ring-teal-500" />
                  </td>
                  <td className="px-3 py-2">
                    <input value={l.party_id} onChange={(e) => handleLineChange(idx, "party_id", e.target.value)}
                      className="w-full px-2 py-1 border border-gray-200 rounded text-xs focus:ring-1 focus:ring-teal-500" />
                  </td>
                  <td className="px-3 py-2">
                    <input value={l.account_id} onChange={(e) => handleLineChange(idx, "account_id", e.target.value)}
                      className="w-full px-2 py-1 border border-gray-200 rounded text-xs focus:ring-1 focus:ring-teal-500" />
                  </td>
                  <td className="px-3 py-2 text-right">
                    {lines.length > 2 && (
                      <button type="button" onClick={() => removeLine(idx)} className="p-1 text-red-500 hover:bg-red-50 rounded">
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="flex items-center justify-between">
          <button type="button" onClick={addLine}
            className="px-3 py-1.5 bg-white border border-gray-200 text-gray-700 rounded-lg hover:border-teal-300 hover:text-teal-700 text-xs font-medium">
            Add line
          </button>

          <div className="flex items-center gap-2">
            <button type="button" onClick={() => navigate("/finance/journal-entries")}
              className="px-4 py-2 bg-white border border-gray-200 text-gray-600 rounded-lg hover:bg-gray-50 text-xs font-medium">
              Cancel
            </button>
            <button type="submit" disabled={saving}
              className="px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 text-xs font-medium disabled:opacity-50">
              {saving ? "Saving..." : "Create"}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}
