import { useNavigate, useParams } from "react-router-dom";

const DEMO = {
  1: { id: 1, date: "2026-03-10", branch: "Wifaq School", category: "Office Supplies", urgency: "high", item: "Printer Cartridges (HP 26A)", quantity: 10, reason: "Stock depleted, needed for admin printing", estimated_cost: 25000, notes: "Prefer original HP", status: "pending" },
  2: { id: 2, date: "2026-03-08", branch: "Wifaq Learning Studio", category: "IT Equipment", urgency: "medium", item: "Wireless Mouse & Keyboard Sets", quantity: 15, reason: "Lab upgrade for computer class", estimated_cost: 18000, notes: "", status: "approved" },
  3: { id: 3, date: "2026-03-05", branch: "WISAL Academy", category: "Furniture", urgency: "low", item: "Student Desks (Wooden)", quantity: 20, reason: "New classroom setup for Grade 7", estimated_cost: 60000, notes: "Standard size, with storage shelf", status: "approved" },
  4: { id: 4, date: "2026-03-03", branch: "Wifaq School", category: "Cleaning", urgency: "medium", item: "Cleaning Supplies Bundle", quantity: 5, reason: "Monthly restocking", estimated_cost: 8000, notes: "Detergent, mop heads, trash bags", status: "pending" },
  5: { id: 5, date: "2026-03-01", branch: "Wifaq Learning Studio", category: "Books", urgency: "high", item: "Science Textbooks Grade 9", quantity: 30, reason: "New semester starting, insufficient copies", estimated_cost: 45000, notes: "Dari language edition", status: "rejected" },
};

const urgencyColors = { high: "bg-red-100 text-red-700", medium: "bg-yellow-100 text-yellow-700", low: "bg-teal-100 text-teal-700" };
const statusColors = { pending: "bg-yellow-100 text-yellow-700", approved: "bg-teal-100 text-teal-700", rejected: "bg-red-100 text-red-700" };

export default function PurchaseRequestShow() {
  const navigate = useNavigate();
  const { id } = useParams();
  const data = DEMO[id] || DEMO[1];

  const fields = [
    { label: "Date", value: data.date },
    { label: "Branch", value: data.branch },
    { label: "Category", value: data.category },
    { label: "Item", value: data.item },
    { label: "Quantity", value: data.quantity },
    { label: "Estimated Cost", value: data.estimated_cost ? `${data.estimated_cost.toLocaleString()} AFN` : "—" },
    { label: "Reason", value: data.reason },
    { label: "Notes", value: data.notes || "—" },
  ];

  return (
    <div className="min-h-screen bg-gray-50/60">
      {/* Header */}
      <div className="bg-teal-600 px-5 py-5">
        <div className="max-w-full mx-auto">
          <div className="flex items-center gap-3 mb-3">
            <button onClick={() => navigate("/hr/purchase-request")}
              className="p-2 bg-white/20 hover:bg-white/30 rounded-xl text-white transition-colors">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" /></svg>
            </button>
            <div className="flex-1">
              <h1 className="text-sm font-bold text-white">{data.item}</h1>
              <p className="text-xs text-teal-100 mt-0.5">Purchase Request #{data.id}</p>
            </div>
            <div className="flex items-center gap-2">
              <span className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase ${urgencyColors[data.urgency]}`}>{data.urgency}</span>
              <span className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase ${statusColors[data.status]}`}>{data.status}</span>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-full mx-auto px-4 py-6 space-y-4">
        {/* Stats */}
        <div className="grid grid-cols-3 gap-3">
          {[
            { label: "Quantity", value: data.quantity },
            { label: "Est. Cost", value: `${data.estimated_cost?.toLocaleString()} AFN` },
            { label: "Unit Price", value: data.estimated_cost && data.quantity ? `${Math.round(data.estimated_cost / data.quantity).toLocaleString()} AFN` : "—" },
          ].map(s => (
            <div key={s.label} className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm text-center">
              <p className="text-[10px] font-semibold text-teal-600 uppercase tracking-wider">{s.label}</p>
              <p className="text-xl font-black text-gray-800 mt-1">{s.value}</p>
            </div>
          ))}
        </div>

        {/* Details */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="px-5 py-4 bg-teal-50 border-b border-teal-100 flex items-center gap-3">
            <div className="w-9 h-9 bg-teal-600 rounded-xl flex items-center justify-center flex-shrink-0">
              <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
            </div>
            <div>
              <p className="text-sm font-bold text-gray-800">Request Details</p>
              <p className="text-xs text-teal-600">Complete information</p>
            </div>
          </div>
          <div className="divide-y divide-gray-50">
            {fields.map(f => (
              <div key={f.label} className="px-5 py-3.5 flex items-start justify-between">
                <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider flex-shrink-0">{f.label}</span>
                <span className="text-sm text-gray-800 font-medium text-right ml-4">{f.value}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-3">
          <button onClick={() => navigate("/hr/purchase-request")}
            className="flex items-center gap-2 px-5 py-2.5 text-sm font-medium text-gray-600 bg-white border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" /></svg>
            Back to List
          </button>
          <button onClick={() => navigate(`/hr/purchase-request/edit/${data.id}`)}
            className="flex items-center gap-2 px-5 py-2.5 text-sm font-semibold text-white bg-teal-600 rounded-xl hover:bg-teal-700 transition-colors">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
            Edit Request
          </button>
        </div>
      </div>
    </div>
  );
}
