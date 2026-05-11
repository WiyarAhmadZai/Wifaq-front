import { useState } from "react";
import { put } from "../../api/axios";
import Swal from "sweetalert2";

export const TRANSFER_STEPS = [
  { key: "transfer_agreement", label: "Agreement / Muwafaqa Namadhe" },
  { key: "transfer_first_parcha", label: "First Parcha" },
  { key: "transfer_sawabiq", label: "Records / Sawabiq (2nd Parcha + Karte Sawani)" },
  { key: "transfer_assurance_request", label: "Assurance Request" },
  { key: "transfer_itminaniya", label: "Itminaniya" },
];

export default function TransferStepsModal({ student, onClose, onSaved }) {
  const [state, setState] = useState(() => ({
    transfer_agreement: Boolean(student.transfer_agreement),
    transfer_first_parcha: Boolean(student.transfer_first_parcha),
    transfer_sawabiq: Boolean(student.transfer_sawabiq),
    transfer_assurance_request: Boolean(student.transfer_assurance_request),
    transfer_itminaniya: Boolean(student.transfer_itminaniya),
    transfer_additional_notes: student.transfer_additional_notes || "",
  }));
  const [saving, setSaving] = useState(false);

  const handleCheck = (index) => {
    const keys = TRANSFER_STEPS.map((s) => s.key);
    const currentVal = state[keys[index]];
    setState((prev) => {
      const updated = { ...prev };
      if (!currentVal) {
        updated[keys[index]] = true;
      } else {
        for (let i = index; i < keys.length; i++) updated[keys[i]] = false;
      }
      return updated;
    });
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await put(`/student-management/students/${student.id}/transfer-steps`, state);
      Swal.fire({ icon: "success", title: "Transfer steps updated", timer: 1500, showConfirmButton: false });
      onSaved && onSaved();
      onClose();
    } catch (error) {
      Swal.fire("Error", error.response?.data?.message || "Failed to update", "error");
    } finally {
      setSaving(false);
    }
  };

  const completedCount = TRANSFER_STEPS.filter((s) => state[s.key]).length;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg overflow-hidden">
        <div className="px-5 py-4 bg-gradient-to-r from-teal-50 to-cyan-50 border-b border-teal-100 flex items-center justify-between">
          <div>
            <h3 className="text-sm font-bold text-gray-800">
              Transfer System — {student.first_name} {student.last_name}
            </h3>
            <p className="text-[10px] text-gray-500 mt-0.5">Complete each step in order to finalize the transfer</p>
          </div>
          <button onClick={onClose} className="p-1 hover:bg-teal-100 rounded-lg">
            <svg className="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="p-5 space-y-4 max-h-[70vh] overflow-y-auto">
          <div>
            <p className="text-[10px] font-bold text-teal-700 uppercase tracking-wider mb-3">
              Transfer Documents — Complete in Order
            </p>
            <div className="space-y-2">
              {TRANSFER_STEPS.map((item, index) => {
                const isChecked = state[item.key];
                const prevChecked = index === 0 || state[TRANSFER_STEPS[index - 1].key];
                const isDisabled = !prevChecked;
                return (
                  <button
                    key={item.key}
                    type="button"
                    disabled={isDisabled}
                    onClick={() => handleCheck(index)}
                    className={`w-full flex items-center gap-3 p-3 rounded-xl border-2 transition-all text-left ${
                      isChecked
                        ? "border-teal-300 bg-teal-50"
                        : isDisabled
                        ? "border-gray-100 bg-gray-50 opacity-50 cursor-not-allowed"
                        : "border-gray-200 bg-white hover:border-teal-200"
                    }`}
                  >
                    <div
                      className={`w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 border-2 ${
                        isChecked ? "bg-teal-600 border-teal-600" : "bg-white border-gray-300"
                      }`}
                    >
                      {isChecked && (
                        <svg className="w-3.5 h-3.5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                        </svg>
                      )}
                    </div>
                    <span
                      className={`text-xs font-semibold flex-1 ${
                        isChecked ? "text-teal-800" : isDisabled ? "text-gray-300" : "text-gray-700"
                      }`}
                    >
                      {item.label}
                    </span>
                    {isChecked ? (
                      <span className="text-[10px] font-bold text-teal-600 bg-teal-100 px-2 py-0.5 rounded-full">Done</span>
                    ) : isDisabled ? (
                      <svg className="w-4 h-4 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                      </svg>
                    ) : (
                      <span className="text-[10px] text-gray-400">Pending</span>
                    )}
                  </button>
                );
              })}
            </div>

            <div className="mt-4 bg-teal-50 rounded-xl p-3 border border-teal-100">
              <div className="flex items-center justify-between mb-2">
                <p className="text-[10px] font-semibold text-teal-700">Progress</p>
                <p className="text-[10px] font-bold text-teal-800">
                  {completedCount} / {TRANSFER_STEPS.length}
                </p>
              </div>
              <div className="h-1.5 bg-teal-100 rounded-full overflow-hidden">
                <div
                  className="h-full bg-teal-500 rounded-full transition-all duration-300"
                  style={{ width: `${(completedCount / TRANSFER_STEPS.length) * 100}%` }}
                />
              </div>
            </div>
          </div>

          <div>
            <label className="block text-[11px] font-semibold text-gray-600 mb-1.5">Additional Notes</label>
            <textarea
              value={state.transfer_additional_notes}
              onChange={(e) => setState((p) => ({ ...p, transfer_additional_notes: e.target.value }))}
              placeholder="Any additional notes about the transfer process..."
              rows={3}
              className="w-full px-3 py-2 border border-gray-200 rounded-xl text-xs focus:ring-2 focus:ring-teal-400 focus:outline-none resize-none"
            />
          </div>
        </div>

        <div className="px-5 py-4 bg-gray-50 flex justify-end gap-2 border-t border-gray-100">
          <button
            onClick={onClose}
            className="px-4 py-2 text-xs font-medium text-gray-600 bg-white border border-gray-200 rounded-xl hover:bg-gray-50"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="px-4 py-2 text-xs font-semibold text-white bg-teal-600 rounded-xl hover:bg-teal-700 disabled:opacity-50 flex items-center gap-2"
          >
            {saving ? "Saving..." : "Save Progress"}
          </button>
        </div>
      </div>
    </div>
  );
}
