import { useState } from "react";
import { post } from "../../api/axios";
import { toastSuccess, toastError } from "../../utils/toast";
import Modal from "../../components/Modal";

/* The family questionnaire — the same fields as the profile's
   "Home" tab, so an answer recorded here and one recorded there
   land as the same kind of record on the child's timeline. */
const CLIM = [["", "—"], ["often", "Often"], ["sometimes", "Sometimes"], ["rarely", "Rarely"], ["never", "Never"]];
const F = (name, label, opts = {}) => ({ name, label, ...opts });
const FIELDS = [
  F("major_decisions_by", "Major decisions by", { sel: [["", "—"], ["father", "Father"], ["mother", "Mother"], ["both", "Both"], ["other", "Other"]] }),
  F("major_decisions_other", "…if other"),
  F("parents_discuss", "Parents discuss", { sel: [["", "—"], ["regularly", "Regularly"], ["sometimes", "Sometimes"], ["rarely", "Rarely"], ["never", "Never"]] }),
  F("household_voice_raising", "Household — voice raising", { sel: CLIM }),
  F("household_verbal_anger", "Household — verbal anger", { sel: CLIM }),
  F("household_physical_conflict", "Household — physical conflict", { sel: CLIM }),
  F("child_voice_raising", "Child — voice raising", { sel: CLIM }),
  F("child_anger", "Child — anger", { sel: CLIM }),
  F("child_physical_conflict", "Child — physical conflict", { sel: CLIM }),
  F("chronic_illness_present", "Chronic illness", { bool: true }),
  F("chronic_illness_details", "…details", { area: true }),
  F("disability_present", "Disability", { bool: true }),
  F("disability_details", "…details", { area: true }),
  F("mental_health_concern", "Mental-health concern", { bool: true }),
  F("mental_health_details", "…details", { area: true }),
  F("migration_plans", "Migration plans", { bool: true }),
  F("migration_destination", "…destination"),
  F("migration_timeline", "…timeline"),
  F("influential_people", "Influential people"),
  F("influence_effect_on_child", "Influence on the child", { area: true }),
  F("parents_dreams", "Parents' dreams for the child", { area: true }),
  F("additional_info", "Anything else the school should know", { area: true }),
];

const blank = () => Object.fromEntries(
  FIELDS.map((f) => [f.name, f.bool ? false : f.sel ? f.sel[0][0] : ""]));

export default function FamilyQuestionnaireModal({ open, studentId, studentName, onClose }) {
  const [form, setForm] = useState(blank());
  const [saving, setSaving] = useState(false);
  const set = (k, v) => setForm((p) => ({ ...p, [k]: v }));

  const submit = async () => {
    setSaving(true);
    try {
      await post(`/student-management/students/${studentId}/profile/family-situation`, form);
      toastSuccess("Recorded");
      setForm(blank());
      onClose();
    } catch (e) {
      toastError(e?.response?.data?.message || "Failed to record");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal open={open} onClose={onClose}
      title={`Family questionnaire · ${studentName || ""}`}
      subtitle="Confidential — never shared with family"
      maxWidth="sm:max-w-2xl"
      footer={
        <>
          <button onClick={onClose}
            className="px-4 py-2 rounded-xl text-xs font-bold border border-gray-200 text-gray-500">Cancel</button>
          <button onClick={submit} disabled={saving}
            className="px-5 py-2 rounded-xl text-xs font-bold text-white bg-teal-600 disabled:opacity-50">Save record</button>
        </>
      }>
      <div className="space-y-3">
        {FIELDS.map((f) => (
          <div key={f.name}>
            <label className="block text-[11px] font-bold text-gray-500 mb-1">{f.label}</label>
            {f.sel ? (
              <select value={form[f.name]} onChange={(e) => set(f.name, e.target.value)}
                className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm">
                {f.sel.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
              </select>
            ) : f.bool ? (
              <label className="inline-flex items-center gap-2 text-sm">
                <input type="checkbox" checked={!!form[f.name]}
                  onChange={(e) => set(f.name, e.target.checked)} className="w-4 h-4" />
                Yes
              </label>
            ) : f.area ? (
              <textarea value={form[f.name]} onChange={(e) => set(f.name, e.target.value)} rows={3}
                className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm" dir="auto" />
            ) : (
              <input value={form[f.name]} onChange={(e) => set(f.name, e.target.value)}
                className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm" dir="auto" />
            )}
          </div>
        ))}
      </div>
    </Modal>
  );
}
