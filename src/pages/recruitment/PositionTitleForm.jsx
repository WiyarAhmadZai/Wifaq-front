import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import Swal from "sweetalert2";
import {
  createPositionTitle,
  getPositionTitle,
  updatePositionTitle,
} from "../../api/positionTitles";

const Icons = {
  ArrowLeft: () => (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
    </svg>
  ),
  Save: () => (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
    </svg>
  ),
};

const EMPTY = {
  name: "",
  code: "",
  label_native: "",
  description: "",
  is_active: true,
};

export default function PositionTitleForm() {
  const navigate = useNavigate();
  const { id } = useParams();
  const isEdit = !!id;

  const [formData, setFormData] = useState(EMPTY);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [errors, setErrors] = useState({});

  useEffect(() => {
    if (!isEdit) return;
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const res = await getPositionTitle(id);
        const row = res.data?.data || res.data;
        if (cancelled) return;
        setFormData({
          name: row?.name || "",
          code: row?.code || "",
          label_native: row?.label_native || "",
          description: row?.description || "",
          is_active: row?.is_active !== false,
        });
      } catch {
        Swal.fire("Error", "Failed to load position title.", "error");
        navigate("/recruitment/position-titles");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [id, isEdit, navigate]);

  const onChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }));
    if (errors[name]) {
      setErrors((prev) => {
        const next = { ...prev };
        delete next[name];
        return next;
      });
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      setErrors({ name: "Title is required." });
      return;
    }

    setSubmitting(true);
    setErrors({});
    try {
      const payload = {
        ...formData,
        code: formData.code?.trim() || null,
        label_native: formData.label_native?.trim() || null,
        description: formData.description?.trim() || null,
      };
      if (isEdit) {
        await updatePositionTitle(id, payload);
      } else {
        await createPositionTitle(payload);
      }
      Swal.fire(
        "Success",
        `Position title ${isEdit ? "updated" : "created"} successfully`,
        "success",
      );
      navigate("/recruitment/position-titles");
    } catch (err) {
      const status = err.response?.status;
      const data = err.response?.data;
      if (status === 422 && data?.errors) {
        const flat = {};
        Object.entries(data.errors).forEach(([k, v]) => {
          flat[k] = Array.isArray(v) ? v[0] : v;
        });
        setErrors(flat);
      } else {
        Swal.fire("Error", data?.message || "Failed to save position title.", "error");
      }
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="px-4 py-4">
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-teal-600"></div>
          <span className="ml-2 text-gray-600">Loading…</span>
        </div>
      </div>
    );
  }

  return (
    <div className="px-4 py-4">
      <div className="flex items-center gap-3 mb-6">
        <button
          type="button"
          onClick={() => navigate("/recruitment/position-titles")}
          className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
        >
          <Icons.ArrowLeft />
        </button>
        <div>
          <h2 className="text-xl font-bold text-gray-800">
            {isEdit ? "Edit Position Title" : "Add Position Title"}
          </h2>
          <p className="text-sm text-gray-500">
            {isEdit ? "Update an existing position title" : "Create a new title that can be reused across job requisitions"}
          </p>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Title (English) <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                name="name"
                value={formData.name}
                onChange={onChange}
                className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500 ${
                  errors.name ? "border-red-400" : "border-gray-300"
                }`}
                placeholder="e.g., Curriculum Expert"
                required
              />
              {errors.name && <p className="text-xs text-red-600 mt-1">{errors.name}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Code <span className="text-gray-400">(auto-generated if blank)</span>
              </label>
              <input
                type="text"
                name="code"
                value={formData.code}
                onChange={onChange}
                className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500 ${
                  errors.code ? "border-red-400" : "border-gray-300"
                }`}
                placeholder="e.g., curriculum_expert"
              />
              {errors.code && <p className="text-xs text-red-600 mt-1">{errors.code}</p>}
            </div>

            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Bilingual / native-script label
              </label>
              <input
                type="text"
                name="label_native"
                value={formData.label_native}
                onChange={onChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
                placeholder="e.g., متخصص نصاب - Curriculum Expert"
              />
              <p className="text-[11px] text-gray-500 mt-1">
                Shown in dropdowns and on emails when present; falls back to the English title.
              </p>
            </div>

            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Description
              </label>
              <textarea
                name="description"
                value={formData.description}
                onChange={onChange}
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
                placeholder="Short description of the role"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Status</label>
              <div className="flex items-center mt-3">
                <input
                  id="is_active"
                  type="checkbox"
                  name="is_active"
                  checked={formData.is_active}
                  onChange={onChange}
                  className="h-4 w-4 text-teal-600 focus:ring-teal-500 border-gray-300 rounded"
                />
                <label htmlFor="is_active" className="ml-2 block text-sm text-gray-900">
                  Active
                </label>
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-6 border-t">
            <button
              type="button"
              onClick={() => navigate("/recruitment/position-titles")}
              className="px-4 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition-colors font-medium"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 transition-colors font-medium disabled:opacity-50 flex items-center gap-2"
            >
              <Icons.Save />
              {submitting
                ? isEdit
                  ? "Updating…"
                  : "Creating…"
                : isEdit
                  ? "Update"
                  : "Create"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
