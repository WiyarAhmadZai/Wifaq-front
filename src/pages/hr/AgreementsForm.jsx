import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { get, post, put } from "../../api/axios";
import Swal from "sweetalert2";

const inp = "w-full px-3.5 py-2.5 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-teal-500 focus:border-teal-500 bg-white outline-none transition-colors placeholder-gray-400";

const PARTNER_TYPES = [
  { value: "institution", label: "Institution" },
  { value: "school", label: "School" },
  { value: "course_center", label: "Course Center" },
  { value: "university", label: "University" },
  { value: "ngo", label: "NGO" },
  { value: "government", label: "Government" },
  { value: "other", label: "Other" },
];

const COLLABORATION_AREAS = [
  { value: "education", label: "Education" },
  { value: "training", label: "Training" },
  { value: "research", label: "Research" },
  { value: "sports", label: "Sports" },
  { value: "exchange", label: "Exchange Program" },
  { value: "other", label: "Other" },
];

export default function AgreementsForm() {
  const navigate = useNavigate();
  const { id } = useParams();
  const isEdit = Boolean(id);

  const [form, setForm] = useState({
    partner_name: "",
    partner_type: "institution",
    representative_name: "",
    representative_position: "",
    contact_phone: "",
    contact_email: "",
    partner_address: "",
    collaboration_area: "education",
    purpose: "",
    scope: "",
    terms: "",
    benefits: "",
    obligations: "",
    start_date: new Date().toISOString().split("T")[0],
    end_date: "",
    notes: "",
  });

  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (isEdit) fetchAgreement();
  }, [id]);

  const fetchAgreement = async () => {
    setLoading(true);
    try {
      const res = await get(`/hr/agreements/show/${id}`);
      const d = res.data;
      setForm({
        partner_name: d.partner_name || "",
        partner_type: d.partner_type || "institution",
        representative_name: d.representative_name || "",
        representative_position: d.representative_position || "",
        contact_phone: d.contact_phone || "",
        contact_email: d.contact_email || "",
        partner_address: d.partner_address || "",
        collaboration_area: d.collaboration_area || "education",
        purpose: d.purpose || "",
        scope: d.scope || "",
        terms: d.terms || "",
        benefits: d.benefits || "",
        obligations: d.obligations || "",
        start_date: d.start_date?.split("T")[0] || "",
        end_date: d.end_date?.split("T")[0] || "",
        notes: d.notes || "",
      });
    } catch {
      Swal.fire("Error", "Failed to load agreement", "error");
      navigate("/hr/agreements");
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.partner_name || !form.purpose || !form.start_date || !form.end_date) {
      Swal.fire("Error", "Please fill all required fields", "error");
      return;
    }
    setSaving(true);
    try {
      if (isEdit) {
        await put(`/hr/agreements/update/${id}`, form);
        Swal.fire({ icon: "success", title: "Agreement updated", timer: 1500, showConfirmButton: false });
      } else {
        await post("/hr/agreements/store", form);
        Swal.fire({ icon: "success", title: "Agreement created", timer: 1500, showConfirmButton: false });
      }
      navigate("/hr/agreements");
    } catch (err) {
      const msg = err.response?.data?.errors
        ? Object.values(err.response.data.errors).flat().join(", ")
        : err.response?.data?.message || "Failed to save agreement";
      Swal.fire("Error", msg, "error");
    } finally {
      setSaving(false);
    }
  };

  if (loading) return (
    <div className="flex items-center justify-center py-24">
      <div className="w-8 h-8 border-2 border-teal-600 border-t-transparent rounded-full animate-spin" />
    </div>
  );

  return (
    <div className="px-4 py-4 mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <button onClick={() => navigate("/hr/agreements")}
          className="p-2 text-gray-500 hover:text-teal-600 hover:bg-teal-50 rounded-lg transition-colors">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
        </button>
        <div>
          <h2 className="text-lg font-bold text-gray-800">{isEdit ? "Edit Agreement" : "New Agreement"}</h2>
          <p className="text-xs text-gray-500">{isEdit ? "Update agreement details" : "Create a collaboration agreement (تفاهم نامه) with a partner institution"}</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="bg-white rounded-xl shadow-sm border border-gray-200 p-5 space-y-5" autoComplete="off">
        {/* Partner section */}
        <div>
          <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3">Partner Information</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Partner Name *</label>
              <input type="text" name="partner_name" value={form.partner_name} onChange={handleChange} required
                placeholder="e.g. Kabul University" className={inp} />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Partner Type *</label>
              <select name="partner_type" value={form.partner_type} onChange={handleChange} className={inp}>
                {PARTNER_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Representative Name</label>
              <input type="text" name="representative_name" value={form.representative_name} onChange={handleChange}
                placeholder="Name of the contact person" className={inp} />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Representative Position</label>
              <input type="text" name="representative_position" value={form.representative_position} onChange={handleChange}
                placeholder="e.g. Director, Principal" className={inp} />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Contact Phone</label>
              <input type="text" name="contact_phone" value={form.contact_phone} onChange={handleChange}
                placeholder="+93 ..." className={inp} />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Contact Email</label>
              <input type="email" name="contact_email" value={form.contact_email} onChange={handleChange}
                placeholder="partner@example.com" className={inp} />
            </div>
            <div className="md:col-span-2">
              <label className="block text-xs font-medium text-gray-700 mb-1">Address</label>
              <input type="text" name="partner_address" value={form.partner_address} onChange={handleChange}
                placeholder="City, district, full address..." className={inp} />
            </div>
          </div>
        </div>

        {/* Collaboration section */}
        <div className="pt-4 border-t border-gray-100">
          <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3">Collaboration Details</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Collaboration Area *</label>
              <select name="collaboration_area" value={form.collaboration_area} onChange={handleChange} className={inp}>
                {COLLABORATION_AREAS.map((a) => <option key={a.value} value={a.value}>{a.label}</option>)}
              </select>
            </div>
            <div></div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Start Date *</label>
              <input type="date" name="start_date" value={form.start_date} onChange={handleChange} required className={inp} />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">End Date *</label>
              <input type="date" name="end_date" value={form.end_date} onChange={handleChange} required className={inp} />
            </div>
          </div>
          <div className="mt-4">
            <label className="block text-xs font-medium text-gray-700 mb-1">Purpose *</label>
            <textarea name="purpose" value={form.purpose} onChange={handleChange} required rows={3}
              placeholder="Why this agreement exists — main goal of the collaboration" className={inp} />
          </div>
          <div className="mt-4">
            <label className="block text-xs font-medium text-gray-700 mb-1">
              Scope <span className="text-gray-400 font-normal">(optional)</span>
            </label>
            <textarea name="scope" value={form.scope} onChange={handleChange} rows={2}
              placeholder="What this collaboration covers..." className={inp} />
          </div>
          <div className="mt-4">
            <label className="block text-xs font-medium text-gray-700 mb-1">
              Terms & Conditions <span className="text-gray-400 font-normal">(optional)</span>
            </label>
            <textarea name="terms" value={form.terms} onChange={handleChange} rows={3}
              placeholder="Specific terms agreed by both parties..." className={inp} />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">
                Benefits to WEN <span className="text-gray-400 font-normal">(optional)</span>
              </label>
              <textarea name="benefits" value={form.benefits} onChange={handleChange} rows={3}
                placeholder="What WEN gains from this agreement..." className={inp} />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">
                WEN Obligations <span className="text-gray-400 font-normal">(optional)</span>
              </label>
              <textarea name="obligations" value={form.obligations} onChange={handleChange} rows={3}
                placeholder="What WEN provides under this agreement..." className={inp} />
            </div>
          </div>
          <div className="mt-4">
            <label className="block text-xs font-medium text-gray-700 mb-1">
              Notes <span className="text-gray-400 font-normal">(optional)</span>
            </label>
            <textarea name="notes" value={form.notes} onChange={handleChange} rows={2}
              placeholder="Any additional notes..." className={inp} />
          </div>
        </div>

        <div className="flex justify-end gap-3 pt-2 border-t border-gray-100">
          <button type="button" onClick={() => navigate("/hr/agreements")}
            className="px-5 py-2.5 bg-gray-200 text-gray-700 rounded-xl hover:bg-gray-300 transition-colors text-sm font-medium">
            Cancel
          </button>
          <button type="submit" disabled={saving}
            className="px-5 py-2.5 bg-teal-600 text-white rounded-xl hover:bg-teal-700 transition-colors text-sm font-medium disabled:opacity-50 flex items-center gap-2">
            {saving ? (
              <><div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> Saving...</>
            ) : (
              <><svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg> {isEdit ? "Update Agreement" : "Create Agreement"}</>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}
