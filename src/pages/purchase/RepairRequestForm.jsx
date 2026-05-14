import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { createRepairRequest, getRepairRequest, updateRepairRequest } from "../../api/repairRequests";
import Swal from "sweetalert2";

const today = () => new Date().toISOString().slice(0, 10);

export default function RepairRequestForm() {
  const { id } = useParams();
  const isEdit = Boolean(id);
  const navigate = useNavigate();

  const [loading, setLoading] = useState(isEdit);
  const [submitting, setSubmitting] = useState(false);

  const [itemName, setItemName]                 = useState("");
  const [quantity, setQuantity]                 = useState(1);
  const [issueDescription, setIssueDescription] = useState("");
  const [reportedDate, setReportedDate]         = useState(today());
  const [estimatedCost, setEstimatedCost]       = useState("");
  const [createPR, setCreatePR]                 = useState(false);

  useEffect(() => {
    if (!isEdit) return;
    getRepairRequest(id)
      .then((r) => {
        const row = r.data?.data;
        if (!row) return;
        setItemName(row.item_name || "");
        setQuantity(row.quantity || 1);
        setIssueDescription(row.issue_description || "");
        setReportedDate(row.reported_date || today());
        setEstimatedCost(row.estimated_cost ?? "");
        setCreatePR(Boolean(row.create_purchase_request));
      })
      .catch(() => Swal.fire("Error", "Could not load this repair request.", "error"))
      .finally(() => setLoading(false));
  }, [id, isEdit]);

  const submit = async (e) => {
    e.preventDefault();
    if (!itemName.trim() || !issueDescription.trim()) {
      Swal.fire("Missing info", "Both the item name and the issue description are required.", "warning");
      return;
    }
    setSubmitting(true);
    const payload = {
      item_name: itemName,
      quantity: Number(quantity) || 1,
      issue_description: issueDescription,
      reported_date: reportedDate,
      estimated_cost: estimatedCost === "" ? null : Number(estimatedCost),
      create_purchase_request: createPR,
    };
    try {
      if (isEdit) {
        await updateRepairRequest(id, payload);
      } else {
        await createRepairRequest(payload);
      }
      Swal.fire({
        toast: true, position: "top-end", icon: "success",
        title: isEdit ? "Updated" : "Reported", timer: 1500, showConfirmButton: false,
      });
      navigate("/purchase/repair-requests");
    } catch (err) {
      Swal.fire("Failed", err.response?.data?.message || "Could not save.", "error");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return <p className="px-4 py-8 text-center text-xs text-gray-400">Loading…</p>;

  return (
    <div className="px-4 py-4 max-w-3xl mx-auto">
      <div className="flex items-center gap-2 mb-4">
        <button onClick={() => navigate("/purchase/repair-requests")}
          className="p-2 text-gray-500 hover:text-teal-600 hover:bg-teal-50 rounded-lg">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <div>
          <h2 className="text-base font-bold text-gray-800">
            {isEdit ? "Edit Repair Request" : "Report broken item"}
          </h2>
          <p className="text-[11px] text-gray-500">
            Describe what's broken. If it turns out to be beyond repair, the system can auto-generate a replacement Purchase Request.
          </p>
        </div>
      </div>

      <form onSubmit={submit} className="space-y-4">
        <div className="bg-white rounded-xl border border-gray-200 p-5 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div className="md:col-span-2">
              <label className="block text-[10px] font-semibold text-gray-500 uppercase mb-1">Item name *</label>
              <input value={itemName} onChange={(e) => setItemName(e.target.value)} required maxLength={200}
                placeholder="HP Laser printer, classroom projector, …"
                className="w-full px-3 py-2 text-xs border border-gray-200 rounded-lg focus:outline-none focus:border-teal-500" />
            </div>
            <div>
              <label className="block text-[10px] font-semibold text-gray-500 uppercase mb-1">Quantity *</label>
              <input type="number" min="0.01" step="0.01" value={quantity}
                onChange={(e) => setQuantity(e.target.value)} required
                className="w-full px-3 py-2 text-xs border border-gray-200 rounded-lg focus:outline-none focus:border-teal-500" />
            </div>
          </div>

          <div>
            <label className="block text-[10px] font-semibold text-gray-500 uppercase mb-1">What's wrong with it? *</label>
            <textarea value={issueDescription} onChange={(e) => setIssueDescription(e.target.value)} rows={3} required
              placeholder="Describe the issue so the repair team knows what they're walking into."
              className="w-full px-3 py-2 text-xs border border-gray-200 rounded-lg focus:outline-none focus:border-teal-500" />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label className="block text-[10px] font-semibold text-gray-500 uppercase mb-1">Reported date *</label>
              <input type="date" value={reportedDate} onChange={(e) => setReportedDate(e.target.value)} required
                className="w-full px-3 py-2 text-xs border border-gray-200 rounded-lg focus:outline-none focus:border-teal-500" />
            </div>
            <div>
              <label className="block text-[10px] font-semibold text-gray-500 uppercase mb-1">Estimated repair cost (AFN)</label>
              <input type="number" min="0" step="0.01" value={estimatedCost}
                onChange={(e) => setEstimatedCost(e.target.value)}
                placeholder="Optional — what the repair would cost"
                className="w-full px-3 py-2 text-xs border border-gray-200 rounded-lg focus:outline-none focus:border-teal-500" />
            </div>
          </div>

          <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
            <label className="flex items-start gap-2 cursor-pointer">
              <input type="checkbox" checked={createPR} onChange={(e) => setCreatePR(e.target.checked)}
                className="mt-0.5 rounded text-teal-600 focus:ring-teal-500" />
              <div>
                <p className="text-xs font-semibold text-amber-900">If the repair fails, auto-create a replacement Purchase Request</p>
                <p className="text-[10px] text-amber-700 mt-0.5">
                  When the technician marks this as <strong>Cannot repair</strong>, the daily auto-generator will spawn a draft PR for a new unit — saving you from re-typing it.
                </p>
              </div>
            </label>
          </div>
        </div>

        <div className="flex gap-2">
          <button type="submit" disabled={submitting}
            className="px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 text-xs font-semibold disabled:opacity-50">
            {submitting ? "Saving…" : isEdit ? "Save changes" : "Submit repair request"}
          </button>
          <button type="button" onClick={() => navigate("/purchase/repair-requests")}
            className="px-4 py-2 bg-white border border-gray-200 text-gray-600 rounded-lg hover:bg-gray-50 text-xs font-medium">
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
}
