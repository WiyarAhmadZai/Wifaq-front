import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { createRepairRequest, getRepairRequest, updateRepairRequest } from "../../api/repairRequests";
import Swal from "sweetalert2";

import { DateField } from "../../components/hr/HrUI";
const today = () => new Date().toISOString().slice(0, 10);

export default function RepairRequestForm() {
  const { id } = useParams();
  const isEdit = Boolean(id);
  const navigate = useNavigate();

  const [loading, setLoading] = useState(isEdit);
  const [submitting, setSubmitting] = useState(false);

  const [itemName, setItemName] = useState("");
  const [quantity, setQuantity] = useState(1);
  const [issue, setIssue] = useState("");
  const [reportedDate, setReportedDate] = useState(today());
  const [estimatedCost, setEstimatedCost] = useState("");
  const [wantsReplacement, setWantsReplacement] = useState(true);

  useEffect(() => {
    if (!isEdit) return;
    getRepairRequest(id)
      .then((r) => {
        const x = r.data?.data;
        if (!x) return;
        setItemName(x.item_name || "");
        setQuantity(x.quantity || 1);
        setIssue(x.issue_description || "");
        setReportedDate(x.reported_date || today());
        setEstimatedCost(x.estimated_cost || "");
        setWantsReplacement(x.create_purchase_request ?? true);
      })
      .catch(() => Swal.fire("Error", "Could not load this repair request.", "error"))
      .finally(() => setLoading(false));
  }, [id, isEdit]);

  const submit = async (e) => {
    e.preventDefault();
    if (!itemName.trim()) return Swal.fire("Item required", "What's broken?", "warning");
    if (!issue.trim()) return Swal.fire("Describe the issue", "Explain what's wrong with it.", "warning");
    setSubmitting(true);
    const payload = {
      item_name: itemName,
      quantity: Number(quantity) || 1,
      issue_description: issue,
      reported_date: reportedDate,
      estimated_cost: estimatedCost === "" ? null : Number(estimatedCost),
      create_purchase_request: wantsReplacement,
    };
    try {
      if (isEdit) await updateRepairRequest(id, payload);
      else await createRepairRequest(payload);
      Swal.fire({ toast: true, position: "top-end", icon: "success", title: isEdit ? "Updated" : "Reported", timer: 1500, showConfirmButton: false });
      navigate("/purchase/repair-requests");
    } catch (err) {
      Swal.fire("Failed", err.response?.data?.message || "Could not save.", "error");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return <p className="px-4 py-8 text-center text-xs text-gray-400">Loading…</p>;

  return (
    <div className="px-4 py-4 max-w-2xl mx-auto">
      <div className="flex items-center gap-2 mb-4">
        <button onClick={() => navigate("/purchase/repair-requests")}
          className="p-2 text-gray-500 hover:text-teal-600 hover:bg-teal-50 rounded-lg">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <div>
          <h2 className="text-base font-bold text-gray-800">{isEdit ? "Edit repair request" : "Report a broken item"}</h2>
          <p className="text-[11px] text-gray-500">It'll be assessed and approved before any repair work or spend.</p>
        </div>
      </div>

      <form onSubmit={submit} className="bg-white rounded-xl border border-gray-200 p-5 space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div className="md:col-span-2">
            <label className="block text-[11px] font-semibold text-gray-600 mb-1.5">What's broken? *</label>
            <input value={itemName} onChange={(e) => setItemName(e.target.value)} required maxLength={200}
              placeholder="e.g. HP LaserJet printer, Classroom 3 AC unit"
              className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500/30 focus:border-teal-500" />
          </div>
          <div>
            <label className="block text-[11px] font-semibold text-gray-600 mb-1.5">Quantity *</label>
            <input type="number" min="0.01" step="0.01" value={quantity} onChange={(e) => setQuantity(e.target.value)} required
              className="w-full px-3 py-2.5 text-sm text-right font-mono border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500/30 focus:border-teal-500" />
          </div>
        </div>

        <div>
          <label className="block text-[11px] font-semibold text-gray-600 mb-1.5">What's wrong with it? *</label>
          <textarea value={issue} onChange={(e) => setIssue(e.target.value)} rows={3} required maxLength={2000}
            placeholder="Describe the fault — what happens, when it started…"
            className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500/30 focus:border-teal-500" />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-[11px] font-semibold text-gray-600 mb-1.5">Reported date *</label>
            <DateField value={reportedDate} onChange={(e) => setReportedDate(e.target.value)} required
              className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500/30 focus:border-teal-500" />
          </div>
          <div>
            <label className="block text-[11px] font-semibold text-gray-600 mb-1.5">Estimated repair cost (AFN)</label>
            <input type="number" min="0" step="0.01" value={estimatedCost} onChange={(e) => setEstimatedCost(e.target.value)}
              placeholder="Optional — drives the approval tier"
              className="w-full px-3 py-2.5 text-sm text-right font-mono border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500/30 focus:border-teal-500" />
          </div>
        </div>

        <label className="flex items-start gap-2.5 p-3 rounded-lg bg-gray-50 border border-gray-100 cursor-pointer">
          <input type="checkbox" checked={wantsReplacement} onChange={(e) => setWantsReplacement(e.target.checked)}
            className="mt-0.5 rounded text-teal-600 focus:ring-teal-500" />
          <span className="text-xs text-gray-700">
            <strong>Buy a replacement if it can't be repaired.</strong>
            <span className="block text-[11px] text-gray-500">If the repair concludes the item is beyond fixing, a replacement purchase request is raised automatically.</span>
          </span>
        </label>

        <div className="flex gap-2 pt-2 border-t border-gray-100">
          <button type="submit" disabled={submitting}
            className="px-4 py-2.5 bg-teal-600 text-white rounded-lg hover:bg-teal-700 text-sm font-semibold disabled:opacity-50">
            {submitting ? "Saving…" : isEdit ? "Save changes" : "Submit report"}
          </button>
          <button type="button" onClick={() => navigate("/purchase/repair-requests")}
            className="px-4 py-2.5 bg-white border border-gray-200 text-gray-600 rounded-lg hover:bg-gray-50 text-sm font-medium">
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
}
