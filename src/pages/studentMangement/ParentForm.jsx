import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { get, post, put } from "../../api/axios";
import Swal from "sweetalert2";

const INCOME_CATEGORIES = [
  {
    value: "A",
    label: "Category A",
    range: "> $1,000",
    color: "bg-emerald-50 text-emerald-700 border-emerald-300",
    dot: "bg-emerald-500",
  },
  {
    value: "B",
    label: "Category B",
    range: "$500 – $1,000",
    color: "bg-blue-50 text-blue-700 border-blue-300",
    dot: "bg-blue-500",
  },
  {
    value: "C",
    label: "Category C",
    range: "$200 – $499",
    color: "bg-amber-50 text-amber-700 border-amber-300",
    dot: "bg-amber-500",
  },
  {
    value: "D",
    label: "Category D",
    range: "< $200",
    color: "bg-red-50 text-red-700 border-red-300",
    dot: "bg-red-500",
  },
];

const EDUCATION_LEVELS = [
  { value: "", label: "Select Education Level" },
  { value: "No Formal Education", label: "No Formal Education" },
  { value: "Primary School", label: "Primary School" },
  { value: "Secondary School", label: "Secondary School" },
  { value: "High School", label: "High School" },
  { value: "Diploma", label: "Diploma" },
  { value: "Bachelor's Degree", label: "Bachelor's Degree" },
  { value: "Master's Degree", label: "Master's Degree" },
  { value: "Doctorate/PhD", label: "Doctorate/PhD" },
  { value: "Other", label: "Other" },
];

// Auto-determine income category based on monthly income
const getIncomeCategory = (income) => {
  const num = parseFloat(income);
  if (!num || num <= 0) return "";
  if (num < 200) return "D";
  if (num < 500) return "C";
  if (num <= 1000) return "B";
  return "A";
};

function SectionHeader({ icon, title, subtitle, gradient, iconBg, iconColor }) {
  return (
    <div className={`px-5 py-4 ${gradient} border-b`}>
      <div className="flex items-center gap-2.5">
        <div
          className={`w-8 h-8 ${iconBg} rounded-lg flex items-center justify-center`}
        >
          <svg
            className={`w-4 h-4 ${iconColor}`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d={icon}
            />
          </svg>
        </div>
        <div>
          <h3 className="text-sm font-bold text-gray-800">{title}</h3>
          <p className="text-[10px] text-gray-500">{subtitle}</p>
        </div>
      </div>
    </div>
  );
}

export default function ParentForm() {
  const navigate = useNavigate();
  const { id } = useParams();
  const isEdit = Boolean(id);

  const [formData, setFormData] = useState({
    father_name: "",
    father_name_en: "",
    grandfather_name: "",
    grandfather_name_en: "",
    father_education_level: "",
    father_occupation: "",
    father_phone: "",
    email: "",
    mother_name: "",
    mother_education_level: "",
    mother_phone: "",
    mother_tongue: "",
    monthly_income_usd: "",
    number_of_family_members: "",
    number_of_dependents: "",
    income_category: "",
    address: "",
  });

  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (isEdit) fetchParent();
  }, [id]);

  const fetchParent = async () => {
    setLoading(true);
    try {
      const response = await get(`/student-management/families/show/${id}`);
      const d = response.data?.data || response.data;
      setFormData({
        father_name: d.father_name || "",
        father_name_en: d.father_name_en || "",
        grandfather_name: d.grandfather_name || "",
        grandfather_name_en: d.grandfather_name_en || "",
        father_education_level: d.father_education_level || "",
        father_occupation: d.father_occupation || "",
        father_phone: d.father_phone || "",
        email: d.email || "",
        mother_name: d.mother_name || "",
        mother_education_level: d.mother_education_level || "",
        mother_phone: d.mother_phone || "",
        mother_tongue: d.mother_tongue || "",
        monthly_income_usd: d.monthly_income_usd || "",
        number_of_family_members: d.number_of_family_members || "",
        number_of_dependents: d.number_of_dependents || "",
        income_category: d.income_category || "",
        address: d.address || "",
      });
    } catch (error) {
      Swal.fire("Error", "Failed to load family data", "error");
      navigate("/student-management/parents");
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => {
      const updates = { [name]: value };
      // Auto-calculate income category when monthly income changes
      if (name === "monthly_income_usd") {
        updates.income_category = getIncomeCategory(value);
      }
      return { ...prev, ...updates };
    });
    if (errors[name]) setErrors((prev) => ({ ...prev, [name]: null }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setErrors({});
    try {
      let familyId = id;
      if (isEdit) {
        await put(`/student-management/families/update/${id}`, formData);
        Swal.fire("Success", "Family updated successfully", "success");
      } else {
        const response = await post(
          "/student-management/families/store",
          formData,
        );
        Swal.fire("Success", "Family created successfully", "success");
        familyId = response.data?.data?.id || response.data?.id;
      }
      navigate(`/student-management/parents/show/${familyId}`);
    } catch (error) {
      if (error.response?.status === 422 && error.response?.data?.errors) {
        setErrors(error.response.data.errors);
      } else {
        Swal.fire(
          "Error",
          error.response?.data?.message || "Failed to save family",
          "error",
        );
      }
    } finally {
      setSaving(false);
    }
  };

  const err = (f) => errors[f]?.[0];
  const inputClass = (f) => {
    const base =
      "w-full px-3 py-2.5 border rounded-xl focus:ring-2 focus:outline-none text-xs transition-all";
    return `${base} ${err(f) ? "border-red-400 focus:ring-red-300 bg-red-50" : "border-gray-200 focus:ring-teal-400 hover:border-gray-300 bg-white"}`;
  };

  if (loading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="animate-spin rounded-full h-10 w-10 border-4 border-teal-100 border-t-teal-600"></div>
          <span className="text-gray-500 text-sm">Loading family data...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="px-4 py-4 mx-auto">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <button
          onClick={() => navigate("/student-management/parents")}
          className="p-2 text-gray-400 hover:text-teal-600 hover:bg-teal-50 rounded-xl transition-all"
        >
          <svg
            className="w-5 h-5"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M10 19l-7-7m0 0l7-7m-7 7h18"
            />
          </svg>
        </button>
        <div>
          <h2 className="text-lg font-bold text-gray-800">
            {isEdit ? "Edit Family" : "Register New Family"}
          </h2>
          <p className="text-[11px] text-gray-400">
            Fill in the details below to {isEdit ? "update" : "register"} a
            family record
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* ── Father Information ── */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <SectionHeader
            icon="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
            title="Father's Information"
            subtitle="Identity, education and contact details"
            gradient="bg-gradient-to-r from-teal-50 to-cyan-50 border-teal-100"
            iconBg="bg-teal-100"
            iconColor="text-teal-600"
          />
          <div className="p-5 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-[11px] font-semibold text-gray-600 mb-1.5">
                Father's Name *
              </label>
              <input
                type="text"
                name="father_name"
                value={formData.father_name}
                onChange={handleChange}
                required
                placeholder="Full name"
                className={inputClass("father_name")}
              />
              {err("father_name") && (
                <p className="text-red-500 text-[10px] mt-1">
                  {err("father_name")}
                </p>
              )}
            </div>
            <div>
              <label className="block text-[11px] font-semibold text-gray-600 mb-1.5">
                Father's Name (English)
              </label>
              <input
                type="text"
                name="father_name_en"
                value={formData.father_name_en}
                onChange={handleChange}
                placeholder="English name"
                className={inputClass("father_name_en")}
              />
            </div>
            <div>
              <label className="block text-[11px] font-semibold text-gray-600 mb-1.5">
                Grandfather's Name
              </label>
              <input
                type="text"
                name="grandfather_name"
                value={formData.grandfather_name}
                onChange={handleChange}
                placeholder="Grandfather's name"
                className={inputClass("grandfather_name")}
              />
            </div>
            <div>
              <label className="block text-[11px] font-semibold text-gray-600 mb-1.5">
                Grandfather's Name (English)
              </label>
              <input
                type="text"
                name="grandfather_name_en"
                value={formData.grandfather_name_en}
                onChange={handleChange}
                placeholder="English name"
                className={inputClass("grandfather_name_en")}
              />
            </div>
            <div>
              <label className="block text-[11px] font-semibold text-gray-600 mb-1.5">
                Education Level
              </label>
              <select
                name="father_education_level"
                value={formData.father_education_level}
                onChange={handleChange}
                className={inputClass("father_education_level")}
              >
                {EDUCATION_LEVELS.map((level) => (
                  <option key={level.value} value={level.value}>
                    {level.label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-[11px] font-semibold text-gray-600 mb-1.5">
                Occupation
              </label>
              <input
                type="text"
                name="father_occupation"
                value={formData.father_occupation}
                onChange={handleChange}
                placeholder="e.g. Engineer"
                className={inputClass("father_occupation")}
              />
            </div>
            <div>
              <label className="block text-[11px] font-semibold text-gray-600 mb-1.5">
                Phone Number
              </label>
              <input
                type="text"
                name="father_phone"
                value={formData.father_phone}
                onChange={handleChange}
                placeholder="+93 7xx xxx xxxx"
                className={inputClass("father_phone")}
              />
            </div>
            <div>
              <label className="block text-[11px] font-semibold text-gray-600 mb-1.5">
                Email Address
              </label>
              <input
                type="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                placeholder="e.g. family@example.com"
                className={inputClass("email")}
              />
              {err("email") && (
                <p className="text-red-500 text-[10px] mt-1">{err("email")}</p>
              )}
            </div>
          </div>
        </div>

        {/* ── Mother Information ── */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <SectionHeader
            icon="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"
            title="Mother's Information"
            subtitle="Contact, education and language"
            gradient="bg-gradient-to-r from-teal-50 to-teal-50 border-teal-100"
            iconBg="bg-teal-100"
            iconColor="text-teal-600"
          />
          <div className="p-5 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-[11px] font-semibold text-gray-600 mb-1.5">
                Mother's Name *
              </label>
              <input
                type="text"
                name="mother_name"
                value={formData.mother_name}
                onChange={handleChange}
                required
                placeholder="Full name"
                className={inputClass("mother_name")}
              />
              {err("mother_name") && (
                <p className="text-red-500 text-[10px] mt-1">
                  {err("mother_name")}
                </p>
              )}
            </div>
            <div>
              <label className="block text-[11px] font-semibold text-gray-600 mb-1.5">
                Education Level
              </label>
              <select
                name="mother_education_level"
                value={formData.mother_education_level}
                onChange={handleChange}
                className={inputClass("mother_education_level")}
              >
                {EDUCATION_LEVELS.map((level) => (
                  <option key={level.value} value={level.value}>
                    {level.label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-[11px] font-semibold text-gray-600 mb-1.5">
                Phone Number
              </label>
              <input
                type="text"
                name="mother_phone"
                value={formData.mother_phone}
                onChange={handleChange}
                placeholder="+93 7xx xxx xxxx"
                className={inputClass("mother_phone")}
              />
            </div>
            <div>
              <label className="block text-[11px] font-semibold text-gray-600 mb-1.5">
                Mother Tongue
              </label>
              <input
                type="text"
                name="mother_tongue"
                value={formData.mother_tongue}
                onChange={handleChange}
                placeholder="e.g. Dari, Pashto"
                className={inputClass("mother_tongue")}
              />
            </div>
          </div>
        </div>

        {/* ── Income & Economic Status ── */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <SectionHeader
            icon="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
            title="Income & Economic Status"
            subtitle="Monthly income, family size and official income category"
            gradient="bg-gradient-to-r from-emerald-50 to-green-50 border-emerald-100"
            iconBg="bg-emerald-100"
            iconColor="text-emerald-600"
          />
          <div className="p-5 space-y-5">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-[11px] font-semibold text-gray-600 mb-1.5">
                  Monthly Income (USD)
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-xs font-bold">
                    $
                  </span>
                  <input
                    type="number"
                    name="monthly_income_usd"
                    value={formData.monthly_income_usd}
                    onChange={handleChange}
                    placeholder="0.00"
                    step="0.01"
                    min="0"
                    className={`${inputClass("monthly_income_usd")} pl-7`}
                  />
                </div>
                {err("monthly_income_usd") && (
                  <p className="text-red-500 text-[10px] mt-1">
                    {err("monthly_income_usd")}
                  </p>
                )}
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-gray-600 mb-1.5">
                  Number of Family Members
                </label>
                <input
                  type="number"
                  name="number_of_family_members"
                  value={formData.number_of_family_members}
                  onChange={handleChange}
                  placeholder="e.g. 5"
                  min="1"
                  className={inputClass("number_of_family_members")}
                />
                {err("number_of_family_members") && (
                  <p className="text-red-500 text-[10px] mt-1">
                    {err("number_of_family_members")}
                  </p>
                )}
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-gray-600 mb-1.5">
                  Number of Dependents
                </label>
                <input
                  type="number"
                  name="number_of_dependents"
                  value={formData.number_of_dependents}
                  onChange={handleChange}
                  placeholder="e.g. 3"
                  min="0"
                  className={inputClass("number_of_dependents")}
                />
                {err("number_of_dependents") && (
                  <p className="text-red-500 text-[10px] mt-1">
                    {err("number_of_dependents")}
                  </p>
                )}
              </div>
            </div>

            {/* Income Category Cards - Auto-calculated */}
            <div>
              <label className="block text-[11px] font-semibold text-gray-600 mb-2">
                Income Category{" "}
                <span className="text-teal-600 font-medium">
                  (Auto-calculated from Monthly Income)
                </span>
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {INCOME_CATEGORIES.map((cat) => (
                  <div
                    key={cat.value}
                    className={`relative flex flex-col items-start p-3 rounded-xl border-2 transition-all text-left ${
                      formData.income_category === cat.value
                        ? `${cat.color} border-current shadow-sm`
                        : "bg-gray-50 border-gray-200 opacity-60 grayscale"
                    }`}
                  >
                    <div className="flex items-center gap-2 mb-1">
                      <div
                        className={`w-2 h-2 rounded-full ${formData.income_category === cat.value ? cat.dot : "bg-gray-300"}`}
                      ></div>
                      <span className={`text-xs font-bold ${formData.income_category === cat.value ? "" : "text-gray-500"}`}>
                        {cat.label}
                      </span>
                    </div>
                    <span className={`text-[10px] ${formData.income_category === cat.value ? "opacity-75" : "text-gray-400"}`}>
                      {cat.range}
                    </span>
                    {formData.income_category === cat.value && (
                      <div className="absolute top-2 right-2">
                        <svg
                          className="w-3.5 h-3.5"
                          fill="currentColor"
                          viewBox="0 0 20 20"
                        >
                          <path
                            fillRule="evenodd"
                            d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                            clipRule="evenodd"
                          />
                        </svg>
                      </div>
                    )}
                  </div>
                ))}
              </div>
              {err("income_category") && (
                <p className="text-red-500 text-[10px] mt-1">
                  {err("income_category")}
                </p>
              )}
            </div>
          </div>
        </div>

        {/* ── Address ── */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <SectionHeader
            icon="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0zM15 11a3 3 0 11-6 0 3 3 0 016 0z"
            title="Address"
            subtitle="Family residential address"
            gradient="bg-gradient-to-r from-teal-50 to-teal-50 border-teal-100"
            iconBg="bg-teal-100"
            iconColor="text-teal-600"
          />
          <div className="p-5">
            <textarea
              name="address"
              value={formData.address}
              onChange={handleChange}
              rows={3}
              placeholder="Enter full residential address..."
              className={inputClass("address")}
            />
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center justify-between pt-2">
          <button
            type="button"
            onClick={() => navigate("/student-management/parents")}
            className="px-4 py-2.5 bg-gray-100 text-gray-600 rounded-xl text-xs font-semibold hover:bg-gray-200 transition-all"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={saving}
            className="px-6 py-2.5 bg-teal-600 text-white rounded-xl text-xs font-semibold hover:bg-teal-700 transition-all shadow-sm disabled:opacity-50 flex items-center gap-2"
          >
            {saving ? (
              <>
                <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                Saving...
              </>
            ) : (
              <>
                <svg
                  className="w-3.5 h-3.5"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M5 13l4 4L19 7"
                  />
                </svg>
                {isEdit ? "Update Family" : "Register Family"}
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}
