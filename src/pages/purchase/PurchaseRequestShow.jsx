import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { get, put, del } from "../../api/axios";
import Swal from "sweetalert2";

const pipelineStages = [
  { key: "draft", label: "Draft", color: "gray" },
  { key: "submitted", label: "Submitted", color: "blue" },
  { key: "approved", label: "Approved", color: "emerald" },
  { key: "procurement", label: "Procurement", color: "purple" },
  { key: "delivered", label: "Delivered", color: "cyan" },
  { key: "completed", label: "Completed", color: "teal" },
];

const colorMap = {
  gray: { bg: "bg-gray-50", border: "border-gray-200", text: "text-gray-700", iconBg: "bg-gray-100", btn: "bg-gray-600 hover:bg-gray-700" },
  blue: { bg: "bg-blue-50", border: "border-blue-200", text: "text-blue-700", iconBg: "bg-blue-100", btn: "bg-blue-600 hover:bg-blue-700" },
  emerald: { bg: "bg-emerald-50", border: "border-emerald-200", text: "text-emerald-700", iconBg: "bg-emerald-100", btn: "bg-emerald-600 hover:bg-emerald-700" },
  purple: { bg: "bg-purple-50", border: "border-purple-200", text: "text-purple-700", iconBg: "bg-purple-100", btn: "bg-purple-600 hover:bg-purple-700" },
  cyan: { bg: "bg-cyan-50", border: "border-cyan-200", text: "text-cyan-700", iconBg: "bg-cyan-100", btn: "bg-cyan-600 hover:bg-cyan-700" },
  teal: { bg: "bg-teal-50", border: "border-teal-200", text: "text-teal-700", iconBg: "bg-teal-100", btn: "bg-teal-600 hover:bg-teal-700" },
};

const stageGuide = {
  draft: {
    title: "Draft - Prepare Your Request",
    description: "Review the items list and request details. When everything looks correct, submit the request for approval.",
    nextAction: "Submit for Approval",
    nextStatus: "submitted",
    icon: "M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z",
  },
  submitted: {
    title: "Awaiting Approval",
    description: "This request has been submitted and is waiting for management review. You can approve or reject it below.",
    nextAction: "Approve Request",
    nextStatus: "approved",
    icon: "M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z",
  },
  approved: {
    title: "Approved - Begin Procurement",
    description: "The request has been approved. Now gather quotations from suppliers and select the best offer, then move to procurement.",
    nextAction: "Start Procurement",
    nextStatus: "procurement",
    icon: "M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2",
  },
  procurement: {
    title: "Procurement in Progress",
    description: "The purchase order has been placed. Track the order and update when items are received.",
    nextAction: "Mark as Delivered",
    nextStatus: "delivered",
    icon: "M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4",
  },
  delivered: {
    title: "Items Delivered - Verify & Complete",
    description: "Items have been delivered. Verify the quantities and quality, then add the invoice details and complete the process.",
    nextAction: "Complete & Close",
    nextStatus: "completed",
    icon: "M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4",
  },
  completed: {
    title: "Purchase Completed",
    description: "This purchase request has been fully processed. All items delivered and invoiced.",
    icon: "M5 13l4 4L19 7",
  },
};

// Dummy data
const dummyRequests = {
  1: { id: 1, pr_number: "PR-2026-001", title: "Office Stationery for Q1", requested_by: "Ahmad Rahimi", department: "Admin", status: "approved", priority: "medium", total_amount: 15000, notes: "Needed for new semester", created_at: "2026-01-15",
    items: [
      { item_name: "A4 Paper (500 sheets)", quantity: 20, unit: "ream", unit_price: 250 },
      { item_name: "Ballpoint Pens (Blue)", quantity: 100, unit: "pcs", unit_price: 15 },
      { item_name: "Whiteboard Markers", quantity: 50, unit: "pcs", unit_price: 40 },
      { item_name: "Staplers", quantity: 10, unit: "pcs", unit_price: 200 },
      { item_name: "File Folders", quantity: 30, unit: "pcs", unit_price: 50 },
    ],
  },
  2: { id: 2, pr_number: "PR-2026-002", title: "Computer Lab Equipment", requested_by: "Khalid Amiri", department: "IT", status: "procurement", priority: "high", total_amount: 250000, notes: "Upgrade old lab computers", created_at: "2026-01-28",
    items: [
      { item_name: "Desktop Computer (i5, 8GB RAM)", quantity: 5, unit: "set", unit_price: 35000 },
      { item_name: "Monitor 24 inch", quantity: 5, unit: "pcs", unit_price: 8000 },
      { item_name: "Keyboard & Mouse Combo", quantity: 5, unit: "set", unit_price: 1500 },
      { item_name: "Network Switch 24-port", quantity: 1, unit: "pcs", unit_price: 12500 },
    ],
    quotations: [
      { id: 1, supplier: "TechWorld Kabul", amount: 248000, submitted_date: "2026-02-05", selected: true },
      { id: 2, supplier: "CompuStore AF", amount: 265000, submitted_date: "2026-02-06", selected: false },
    ],
    approval: { approved_by: "Mohammad Karimi", approved_date: "2026-02-03", notes: "Approved - high priority" },
  },
  3: { id: 3, pr_number: "PR-2026-003", title: "Cleaning Supplies - Monthly", requested_by: "Zahra Ahmadi", department: "Facilities", status: "completed", priority: "low", total_amount: 8500, notes: "", created_at: "2026-02-01",
    items: [
      { item_name: "Floor Cleaner (5L)", quantity: 4, unit: "pcs", unit_price: 500 },
      { item_name: "Trash Bags (50pcs)", quantity: 10, unit: "pack", unit_price: 150 },
      { item_name: "Hand Soap", quantity: 20, unit: "pcs", unit_price: 100 },
      { item_name: "Toilet Paper (12-roll)", quantity: 5, unit: "pack", unit_price: 300 },
    ],
    approval: { approved_by: "Fatima Noori", approved_date: "2026-02-02", notes: "Routine purchase" },
    quotations: [{ id: 1, supplier: "CleanMart", amount: 8500, submitted_date: "2026-02-03", selected: true }],
    invoice: { invoice_number: "INV-CM-0245", amount: 8500, paid_date: "2026-02-10", supplier: "CleanMart" },
  },
  4: { id: 4, pr_number: "PR-2026-004", title: "Library Books - Science Section", requested_by: "Maryam Sultani", department: "Library", status: "submitted", priority: "medium", total_amount: 45000, notes: "Reference books for grade 10-12", created_at: "2026-02-10",
    items: [
      { item_name: "Physics Textbook (Grade 10)", quantity: 20, unit: "pcs", unit_price: 800 },
      { item_name: "Chemistry Lab Manual", quantity: 15, unit: "pcs", unit_price: 600 },
      { item_name: "Biology Reference Book", quantity: 10, unit: "pcs", unit_price: 1100 },
    ],
  },
  5: { id: 5, pr_number: "PR-2026-005", title: "Classroom Furniture Replacement", requested_by: "Mohammad Karimi", department: "Admin", status: "draft", priority: "high", total_amount: 180000, notes: "Replace broken desks in Block B", created_at: "2026-02-20",
    items: [
      { item_name: "Student Desk (Double)", quantity: 30, unit: "pcs", unit_price: 4000 },
      { item_name: "Student Chair", quantity: 60, unit: "pcs", unit_price: 1000 },
    ],
  },
  7: { id: 7, pr_number: "PR-2026-007", title: "Printer Cartridges & Paper", requested_by: "Sara Hashimi", department: "Admin", status: "delivered", priority: "low", total_amount: 12000, notes: "", created_at: "2026-03-01",
    items: [
      { item_name: "HP Cartridge 85A", quantity: 4, unit: "pcs", unit_price: 2000 },
      { item_name: "A4 Paper (500 sheets)", quantity: 10, unit: "ream", unit_price: 250 },
      { item_name: "Color Ink Cartridge", quantity: 2, unit: "pcs", unit_price: 750 },
    ],
    approval: { approved_by: "Fatima Noori", approved_date: "2026-03-02", notes: "" },
    quotations: [{ id: 1, supplier: "PrintStar", amount: 11800, submitted_date: "2026-03-03", selected: true }],
  },
};

export default function PurchaseRequestShow() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  // Form states for guided workflow
  const [approvalForm, setApprovalForm] = useState({ approved_by: "", notes: "" });
  const [quotationForm, setQuotationForm] = useState({ supplier: "", amount: "", submitted_date: "" });
  const [invoiceForm, setInvoiceForm] = useState({ invoice_number: "", amount: "", paid_date: "", supplier: "" });
  const [showQuotationForm, setShowQuotationForm] = useState(false);

  useEffect(() => {
    setLoading(true);
    get(`/purchase/purchase-requests/${id}`)
      .then((res) => setData(res.data))
      .catch(() => setData(dummyRequests[id] || dummyRequests[1]))
      .finally(() => setLoading(false));
  }, [id]);

  const updateStatus = (newStatus) => {
    put(`/purchase/purchase-requests/${id}`, { ...data, status: newStatus }).catch(() => {});
    setData((prev) => ({ ...prev, status: newStatus }));
    Swal.fire("Updated!", `Status changed to ${newStatus}`, "success");
  };

  const handleReject = () => {
    Swal.fire({
      title: "Reject this request?", text: "Please provide a reason.", icon: "warning",
      input: "textarea", inputPlaceholder: "Reason for rejection...",
      showCancelButton: true, confirmButtonColor: "#ef4444", confirmButtonText: "Reject",
    }).then((result) => {
      if (result.isConfirmed) {
        put(`/purchase/purchase-requests/${id}`, { ...data, status: "rejected", rejection_reason: result.value }).catch(() => {});
        setData((prev) => ({ ...prev, status: "rejected", rejection_reason: result.value }));
        Swal.fire("Rejected", "The request has been rejected.", "info");
      }
    });
  };

  const addQuotation = () => {
    if (!quotationForm.supplier || !quotationForm.amount) return;
    const newQ = { id: Date.now(), ...quotationForm, selected: false };
    setData((prev) => ({ ...prev, quotations: [...(prev.quotations || []), newQ] }));
    setQuotationForm({ supplier: "", amount: "", submitted_date: "" });
    setShowQuotationForm(false);
  };

  const selectQuotation = (qId) => {
    setData((prev) => ({
      ...prev,
      quotations: prev.quotations.map((q) => ({ ...q, selected: q.id === qId })),
    }));
  };

  const saveApproval = () => {
    if (!approvalForm.approved_by) return;
    setData((prev) => ({
      ...prev,
      status: "approved",
      approval: { ...approvalForm, approved_date: new Date().toISOString().split("T")[0] },
    }));
    Swal.fire("Approved!", "Request has been approved.", "success");
  };

  const saveInvoice = () => {
    if (!invoiceForm.invoice_number) return;
    setData((prev) => ({ ...prev, invoice: { ...invoiceForm } }));
    Swal.fire("Saved!", "Invoice details recorded.", "success");
  };

  const handleDelete = async () => {
    const result = await Swal.fire({
      title: "Delete this request?", text: "This cannot be undone.", icon: "warning",
      showCancelButton: true, confirmButtonColor: "#ef4444", confirmButtonText: "Delete",
    });
    if (result.isConfirmed) {
      try { await del(`/purchase/purchase-requests/${id}`); } catch {}
      Swal.fire("Deleted!", "", "success");
      navigate("/purchase/purchase-requests");
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-teal-600"></div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500">Purchase request not found</p>
        <button onClick={() => navigate("/purchase/purchase-requests")} className="mt-4 px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 text-xs">Back to List</button>
      </div>
    );
  }

  const currentStage = pipelineStages.find((s) => s.key === data.status);
  const currentGuide = stageGuide[data.status] || stageGuide.draft;
  const colors = colorMap[currentStage?.color || "gray"];
  const isRejected = data.status === "rejected";
  const currentStageIndex = pipelineStages.findIndex((s) => s.key === data.status);

  return (
    <div className="px-4 py-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate("/purchase/purchase-requests")}
            className="p-2 text-gray-500 hover:text-teal-600 hover:bg-teal-50 rounded-lg">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
          </button>
          <div>
            <h2 className="text-base font-bold text-gray-800">{data.pr_number}</h2>
            <p className="text-xs text-gray-500">{data.title}</p>
          </div>
        </div>
        <div className="flex gap-2">
          {data.status === "draft" && (
            <button onClick={() => navigate(`/purchase/purchase-requests/edit/${id}`)}
              className="px-3 py-1.5 bg-teal-600 text-white rounded-lg hover:bg-teal-700 text-xs font-medium flex items-center gap-1.5">
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
              </svg>
              Edit
            </button>
          )}
          <button onClick={handleDelete}
            className="px-3 py-1.5 bg-red-600 text-white rounded-lg hover:bg-red-700 text-xs font-medium flex items-center gap-1.5">
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
            Delete
          </button>
        </div>
      </div>

      {/* Pipeline Stepper */}
      <div className="bg-white rounded-xl border border-gray-200 p-4 mb-4">
        <div className="flex items-center justify-between">
          {pipelineStages.map((stage, i) => {
            const isPast = currentStageIndex > i;
            const isCurrent = stage.key === data.status;
            const c = colorMap[stage.color];
            return (
              <div key={stage.key} className="flex items-center flex-1">
                <div className="flex flex-col items-center flex-1">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold ${
                    isCurrent ? `${c.iconBg} ${c.text} ring-2 ring-current`
                    : isPast ? "bg-teal-600 text-white"
                    : "bg-gray-100 text-gray-400"
                  }`}>
                    {isPast ? (
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                    ) : i + 1}
                  </div>
                  <span className={`text-[9px] mt-1 font-semibold uppercase tracking-wider ${
                    isCurrent ? c.text : isPast ? "text-teal-600" : "text-gray-400"
                  }`}>{stage.label}</span>
                </div>
                {i < pipelineStages.length - 1 && (
                  <div className={`h-0.5 flex-1 mx-1 ${isPast ? "bg-teal-400" : "bg-gray-200"}`} />
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Rejected Banner */}
      {isRejected && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 mb-4">
          <div className="flex items-center gap-2 text-red-700 mb-1">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span className="text-sm font-bold">Request Rejected</span>
          </div>
          <p className="text-xs text-red-600">{data.rejection_reason || "No reason provided"}</p>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Main Content - Left 2/3 */}
        <div className="lg:col-span-2 space-y-4">
          {/* Stage Guide Card */}
          {!isRejected && (
            <div className={`${colors.bg} border ${colors.border} rounded-xl p-4`}>
              <div className="flex items-start gap-3">
                <div className={`w-10 h-10 ${colors.iconBg} rounded-lg flex items-center justify-center flex-shrink-0`}>
                  <svg className={`w-5 h-5 ${colors.text}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={currentGuide.icon} />
                  </svg>
                </div>
                <div className="flex-1">
                  <h3 className={`text-sm font-bold ${colors.text}`}>{currentGuide.title}</h3>
                  <p className="text-xs text-gray-600 mt-1">{currentGuide.description}</p>
                </div>
              </div>
            </div>
          )}

          {/* Items Table */}
          <div className="bg-white rounded-xl border border-gray-200 p-4">
            <h3 className="text-xs font-semibold text-gray-800 uppercase tracking-wider mb-3">Request Items</h3>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className="text-left text-[10px] font-semibold text-gray-500 uppercase pb-2">#</th>
                    <th className="text-left text-[10px] font-semibold text-gray-500 uppercase pb-2">Item</th>
                    <th className="text-left text-[10px] font-semibold text-gray-500 uppercase pb-2">Qty</th>
                    <th className="text-left text-[10px] font-semibold text-gray-500 uppercase pb-2">Unit</th>
                    <th className="text-right text-[10px] font-semibold text-gray-500 uppercase pb-2">Price</th>
                    <th className="text-right text-[10px] font-semibold text-gray-500 uppercase pb-2">Total</th>
                  </tr>
                </thead>
                <tbody>
                  {(data.items || []).map((item, i) => (
                    <tr key={i} className="border-b border-gray-50">
                      <td className="py-2 text-xs text-gray-400">{i + 1}</td>
                      <td className="py-2 text-xs font-medium text-gray-800">{item.item_name}</td>
                      <td className="py-2 text-xs text-gray-600">{item.quantity}</td>
                      <td className="py-2 text-xs text-gray-600">{item.unit}</td>
                      <td className="py-2 text-xs text-gray-600 text-right">{Number(item.unit_price).toLocaleString()}</td>
                      <td className="py-2 text-xs font-medium text-gray-800 text-right">{(item.quantity * item.unit_price).toLocaleString()} AFN</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="border-t-2 border-gray-300">
                    <td colSpan={5} className="py-2 text-right text-xs font-semibold text-gray-700">Grand Total:</td>
                    <td className="py-2 text-right text-sm font-bold text-teal-700">{Number(data.total_amount).toLocaleString()} AFN</td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>

          {/* Stage-specific content */}

          {/* DRAFT: Just show items + submit button */}
          {data.status === "draft" && (
            <div className="flex gap-2">
              <button onClick={() => updateStatus("submitted")} className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-xs font-medium flex items-center gap-2">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                </svg>
                Submit for Approval
              </button>
              <button onClick={handleReject} className="px-4 py-2 bg-red-100 text-red-700 rounded-lg hover:bg-red-200 text-xs font-medium">Cancel Request</button>
            </div>
          )}

          {/* SUBMITTED: Approval form */}
          {data.status === "submitted" && (
            <div className="bg-white rounded-xl border border-gray-200 p-4">
              <h3 className="text-xs font-semibold text-gray-800 uppercase tracking-wider mb-3">Approval Decision</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3">
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Approved By <span className="text-red-500">*</span></label>
                  <input type="text" value={approvalForm.approved_by}
                    onChange={(e) => setApprovalForm((p) => ({ ...p, approved_by: e.target.value }))}
                    className="w-full px-2.5 py-1.5 border border-gray-300 rounded-lg text-xs focus:ring-2 focus:ring-teal-500"
                    placeholder="Enter approver name" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Notes</label>
                  <input type="text" value={approvalForm.notes}
                    onChange={(e) => setApprovalForm((p) => ({ ...p, notes: e.target.value }))}
                    className="w-full px-2.5 py-1.5 border border-gray-300 rounded-lg text-xs focus:ring-2 focus:ring-teal-500"
                    placeholder="Approval notes..." />
                </div>
              </div>
              <div className="flex gap-2">
                <button onClick={saveApproval} className="px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 text-xs font-medium flex items-center gap-2">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  Approve
                </button>
                <button onClick={handleReject} className="px-4 py-2 bg-red-100 text-red-700 rounded-lg hover:bg-red-200 text-xs font-medium">Reject</button>
              </div>
            </div>
          )}

          {/* APPROVED: Quotations */}
          {data.status === "approved" && (
            <div className="bg-white rounded-xl border border-gray-200 p-4">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-xs font-semibold text-gray-800 uppercase tracking-wider">Supplier Quotations</h3>
                <button onClick={() => setShowQuotationForm(!showQuotationForm)}
                  className="px-2.5 py-1 bg-teal-600 text-white rounded-lg hover:bg-teal-700 text-[10px] font-medium flex items-center gap-1">
                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                  Add Quotation
                </button>
              </div>

              {/* Existing quotations */}
              {(data.quotations || []).length > 0 && (
                <div className="space-y-2 mb-3">
                  {data.quotations.map((q) => (
                    <div key={q.id} className={`p-3 rounded-lg border ${q.selected ? "bg-emerald-50 border-emerald-200" : "bg-gray-50 border-gray-200"}`}>
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-xs font-medium text-gray-800">{q.supplier}</p>
                          <p className="text-[10px] text-gray-500">Submitted: {q.submitted_date}</p>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-bold text-gray-800">{Number(q.amount).toLocaleString()} AFN</span>
                          {q.selected ? (
                            <span className="px-2 py-0.5 bg-emerald-100 text-emerald-700 rounded-full text-[10px] font-semibold">Selected</span>
                          ) : (
                            <button onClick={() => selectQuotation(q.id)} className="px-2 py-0.5 bg-teal-100 text-teal-700 rounded-full text-[10px] font-semibold hover:bg-teal-200">Select</button>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Add quotation form */}
              {showQuotationForm && (
                <div className="bg-gray-50 rounded-lg p-3 mb-3">
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 mb-2">
                    <input type="text" value={quotationForm.supplier}
                      onChange={(e) => setQuotationForm((p) => ({ ...p, supplier: e.target.value }))}
                      placeholder="Supplier name" className="px-2.5 py-1.5 border border-gray-300 rounded-lg text-xs focus:ring-1 focus:ring-teal-500" />
                    <input type="number" value={quotationForm.amount}
                      onChange={(e) => setQuotationForm((p) => ({ ...p, amount: e.target.value }))}
                      placeholder="Amount (AFN)" className="px-2.5 py-1.5 border border-gray-300 rounded-lg text-xs focus:ring-1 focus:ring-teal-500" />
                    <input type="date" value={quotationForm.submitted_date}
                      onChange={(e) => setQuotationForm((p) => ({ ...p, submitted_date: e.target.value }))}
                      className="px-2.5 py-1.5 border border-gray-300 rounded-lg text-xs focus:ring-1 focus:ring-teal-500" />
                  </div>
                  <button onClick={addQuotation} className="px-3 py-1.5 bg-teal-600 text-white rounded-lg text-xs font-medium hover:bg-teal-700">Save Quotation</button>
                </div>
              )}

              <button onClick={() => updateStatus("procurement")} className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 text-xs font-medium flex items-center gap-2">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                </svg>
                Start Procurement
              </button>
            </div>
          )}

          {/* PROCUREMENT: Track order */}
          {data.status === "procurement" && (
            <div className="space-y-4">
              {/* Show existing quotations */}
              {(data.quotations || []).length > 0 && (
                <div className="bg-white rounded-xl border border-gray-200 p-4">
                  <h3 className="text-xs font-semibold text-gray-800 uppercase tracking-wider mb-2">Selected Supplier</h3>
                  {data.quotations.filter((q) => q.selected).map((q) => (
                    <div key={q.id} className="p-3 bg-emerald-50 border border-emerald-200 rounded-lg">
                      <div className="flex justify-between">
                        <p className="text-xs font-medium text-gray-800">{q.supplier}</p>
                        <span className="text-sm font-bold text-emerald-700">{Number(q.amount).toLocaleString()} AFN</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
              <button onClick={() => updateStatus("delivered")} className="px-4 py-2 bg-cyan-600 text-white rounded-lg hover:bg-cyan-700 text-xs font-medium flex items-center gap-2">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" />
                </svg>
                Mark as Delivered
              </button>
            </div>
          )}

          {/* DELIVERED: Invoice form + complete */}
          {data.status === "delivered" && (
            <div className="bg-white rounded-xl border border-gray-200 p-4">
              <h3 className="text-xs font-semibold text-gray-800 uppercase tracking-wider mb-3">Invoice Details</h3>
              {data.invoice ? (
                <div className="bg-teal-50 border border-teal-200 rounded-lg p-3 mb-3">
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div><span className="text-gray-500">Invoice #:</span> <span className="font-medium">{data.invoice.invoice_number}</span></div>
                    <div><span className="text-gray-500">Amount:</span> <span className="font-medium">{Number(data.invoice.amount).toLocaleString()} AFN</span></div>
                    <div><span className="text-gray-500">Supplier:</span> <span className="font-medium">{data.invoice.supplier}</span></div>
                    <div><span className="text-gray-500">Paid Date:</span> <span className="font-medium">{data.invoice.paid_date}</span></div>
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3">
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">Invoice Number <span className="text-red-500">*</span></label>
                    <input type="text" value={invoiceForm.invoice_number}
                      onChange={(e) => setInvoiceForm((p) => ({ ...p, invoice_number: e.target.value }))}
                      className="w-full px-2.5 py-1.5 border border-gray-300 rounded-lg text-xs focus:ring-2 focus:ring-teal-500" />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">Amount (AFN)</label>
                    <input type="number" value={invoiceForm.amount}
                      onChange={(e) => setInvoiceForm((p) => ({ ...p, amount: e.target.value }))}
                      className="w-full px-2.5 py-1.5 border border-gray-300 rounded-lg text-xs focus:ring-2 focus:ring-teal-500" />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">Supplier</label>
                    <input type="text" value={invoiceForm.supplier}
                      onChange={(e) => setInvoiceForm((p) => ({ ...p, supplier: e.target.value }))}
                      className="w-full px-2.5 py-1.5 border border-gray-300 rounded-lg text-xs focus:ring-2 focus:ring-teal-500" />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">Paid Date</label>
                    <input type="date" value={invoiceForm.paid_date}
                      onChange={(e) => setInvoiceForm((p) => ({ ...p, paid_date: e.target.value }))}
                      className="w-full px-2.5 py-1.5 border border-gray-300 rounded-lg text-xs focus:ring-2 focus:ring-teal-500" />
                  </div>
                </div>
              )}
              {!data.invoice && (
                <button onClick={saveInvoice} className="px-3 py-1.5 bg-teal-600 text-white rounded-lg text-xs font-medium hover:bg-teal-700 mb-3">Save Invoice</button>
              )}
              <div>
                <button onClick={() => updateStatus("completed")} className="px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 text-xs font-medium flex items-center gap-2">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  Complete & Close
                </button>
              </div>
            </div>
          )}

          {/* COMPLETED: Summary */}
          {data.status === "completed" && (
            <div className="bg-teal-50 border border-teal-200 rounded-xl p-4">
              <div className="flex items-center gap-2 mb-3">
                <svg className="w-5 h-5 text-teal-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <h3 className="text-sm font-bold text-teal-700">Purchase Completed Successfully</h3>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                {data.approval && (
                  <div className="bg-white rounded-lg p-3 border border-teal-100">
                    <p className="text-[10px] uppercase tracking-wider text-gray-500 mb-1">Approval</p>
                    <p className="font-medium text-gray-800">By {data.approval.approved_by}</p>
                    <p className="text-gray-500">{data.approval.approved_date}</p>
                  </div>
                )}
                {data.invoice && (
                  <div className="bg-white rounded-lg p-3 border border-teal-100">
                    <p className="text-[10px] uppercase tracking-wider text-gray-500 mb-1">Invoice</p>
                    <p className="font-medium text-gray-800">{data.invoice.invoice_number}</p>
                    <p className="text-gray-500">{Number(data.invoice.amount).toLocaleString()} AFN</p>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Sidebar - Right 1/3 */}
        <div className="space-y-4">
          {/* Request Info */}
          <div className="bg-white rounded-xl border border-gray-200 p-4">
            <h3 className="text-xs font-semibold text-gray-800 uppercase tracking-wider mb-3">Request Info</h3>
            <div className="space-y-3">
              <div>
                <p className="text-[10px] text-gray-500 uppercase">Requested By</p>
                <p className="text-xs font-medium text-gray-800">{data.requested_by}</p>
              </div>
              <div>
                <p className="text-[10px] text-gray-500 uppercase">Department</p>
                <p className="text-xs font-medium text-gray-800">{data.department}</p>
              </div>
              <div>
                <p className="text-[10px] text-gray-500 uppercase">Priority</p>
                <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold border capitalize ${
                  { low: "bg-blue-50 text-blue-700 border-blue-200", medium: "bg-amber-50 text-amber-700 border-amber-200", high: "bg-orange-50 text-orange-700 border-orange-200", urgent: "bg-red-50 text-red-700 border-red-200" }[data.priority] || "bg-gray-50 text-gray-600 border-gray-200"
                }`}>{data.priority}</span>
              </div>
              <div>
                <p className="text-[10px] text-gray-500 uppercase">Total Amount</p>
                <p className="text-sm font-bold text-teal-700">{Number(data.total_amount).toLocaleString()} AFN</p>
              </div>
              {data.notes && (
                <div>
                  <p className="text-[10px] text-gray-500 uppercase">Notes</p>
                  <p className="text-xs text-gray-600">{data.notes}</p>
                </div>
              )}
            </div>
          </div>

          {/* Progress */}
          <div className="bg-white rounded-xl border border-gray-200 p-4">
            <h3 className="text-xs font-semibold text-gray-800 uppercase tracking-wider mb-3">Progress</h3>
            <div className="space-y-2">
              {pipelineStages.map((stage, i) => {
                const isPast = currentStageIndex > i;
                const isCurrent = stage.key === data.status;
                return (
                  <div key={stage.key} className="flex items-center gap-2">
                    <div className={`w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 ${
                      isPast ? "bg-teal-600 text-white" : isCurrent ? `${colorMap[stage.color].iconBg} ${colorMap[stage.color].text}` : "bg-gray-100 text-gray-400"
                    }`}>
                      {isPast ? (
                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                      ) : (
                        <span className="text-[8px] font-bold">{i + 1}</span>
                      )}
                    </div>
                    <span className={`text-xs ${isPast ? "text-teal-600 font-medium" : isCurrent ? `${colorMap[stage.color].text} font-semibold` : "text-gray-400"}`}>
                      {stage.label}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Approval Info */}
          {data.approval && (
            <div className="bg-white rounded-xl border border-gray-200 p-4">
              <h3 className="text-xs font-semibold text-gray-800 uppercase tracking-wider mb-3">Approval</h3>
              <div className="space-y-2 text-xs">
                <div><span className="text-gray-500">Approved By:</span> <span className="font-medium">{data.approval.approved_by}</span></div>
                <div><span className="text-gray-500">Date:</span> <span className="font-medium">{data.approval.approved_date}</span></div>
                {data.approval.notes && <div><span className="text-gray-500">Notes:</span> <span className="font-medium">{data.approval.notes}</span></div>}
              </div>
            </div>
          )}

          {/* Timeline */}
          <div className="bg-gradient-to-br from-teal-600 to-teal-700 rounded-xl p-4 text-white">
            <h3 className="text-xs font-semibold mb-3">Record Info</h3>
            <div className="space-y-2 text-xs">
              <div className="flex justify-between">
                <span className="text-teal-200">PR Number</span>
                <span className="font-medium">{data.pr_number}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-teal-200">Created</span>
                <span className="font-medium">{data.created_at ? new Date(data.created_at).toLocaleDateString() : "-"}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-teal-200">Items</span>
                <span className="font-medium">{data.items?.length || 0}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
