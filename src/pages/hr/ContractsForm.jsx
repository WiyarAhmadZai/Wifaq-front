import { useState, useEffect, useRef } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { get, post, put } from "../../api/axios";
import Swal from "sweetalert2";

export default function ContractsForm() {
  const navigate = useNavigate();
  const { id } = useParams();
  const isEdit = Boolean(id);
  const dropdownRef = useRef(null);

  const [formData, setFormData] = useState({
    staff_id: "",
    contract_type: "",
    start_date: "",
    end_date: "",
    has_probation: false,
    probation_end_date: "",
    salary: "",
    salary_currency: "AFN",
    allowances: {},
    expected_time: "",
    benefits: {},
    status: "draft",
  });

  const [staffList, setStaffList] = useState([]);
  const [filteredStaff, setFilteredStaff] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [showDropdown, setShowDropdown] = useState(false);
  const [selectedStaff, setSelectedStaff] = useState(null);
  const [contractTypes, setContractTypes] = useState([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchStaffList();
    fetchContractTypes();
    if (isEdit) fetchContract();
  }, [id]);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setShowDropdown(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    if (searchTerm) {
      const filtered = staffList.filter(
        (s) =>
          s.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          s.employee_id?.toLowerCase().includes(searchTerm.toLowerCase()),
      );
      setFilteredStaff(filtered);
    } else {
      setFilteredStaff(staffList);
    }
  }, [searchTerm, staffList]);

  const fetchStaffList = async () => {
    try {
      const response = await get("/hr/contracts/staff-list");
      const data = response.data?.data || [];
      setStaffList(Array.isArray(data) ? data : []);
      setFilteredStaff(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error("Failed to load staff list", error);
    }
  };

  const fetchContractTypes = async () => {
    try {
      const response = await get("/hr/contracts/types/list");
      setContractTypes(response.data || []);
    } catch (error) {
      console.error("Failed to load contract types", error);
    }
  };

  const formatDateForInput = (dateString) => {
    if (!dateString) return "";
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return "";
    return date.toISOString().split("T")[0];
  };

  const fetchContract = async () => {
    setLoading(true);
    try {
      const response = await get(`/hr/contracts/show/${id}`);
      const data = response.data;
      setFormData({
        staff_id: data.staff_id || "",
        contract_type: data.contract_type || "",
        start_date: formatDateForInput(data.start_date),
        end_date: formatDateForInput(data.end_date),
        has_probation: data.has_probation || false,
        probation_end_date: formatDateForInput(data.probation_end_date),
        salary: data.salary || "",
        salary_currency: data.salary_currency || "AFN",
        allowances: data.allowances || {},
        expected_time: data.expected_time || "",
        benefits: data.benefits || {},
        status: data.status || "draft",
      });
      if (data.staff) {
        const staffName = data.staff.application?.full_name || `Staff #${data.staff.employee_id}`;
        setSelectedStaff({
          id: data.staff.id,
          full_name: staffName,
          employee_id: data.staff.employee_id,
        });
      }
    } catch (error) {
      Swal.fire("Error", "Failed to load contract data", "error");
      navigate("/hr/contracts");
    } finally {
      setLoading(false);
    }
  };

  const handleStaffSelect = (staff) => {
    setSelectedStaff(staff);
    setSearchTerm("");
    setShowDropdown(false);

    setFormData((prev) => ({
      ...prev,
      staff_id: staff.id,
      contract_type: staff.contract_type || prev.contract_type,
      start_date: staff.start_date || prev.start_date,
      salary: staff.offered_salary || prev.salary,
      salary_currency: staff.salary_currency || prev.salary_currency || "AFN",
    }));
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const submitData = { ...formData };
      if (!submitData.end_date) delete submitData.end_date;
      if (!submitData.expected_time) delete submitData.expected_time;

      if (isEdit) {
        await put(`/hr/contracts/update/${id}`, submitData);
        Swal.fire("Success", "Contract updated successfully", "success");
      } else {
        await post("/hr/contracts/store", submitData);
        Swal.fire("Success", "Contract created successfully", "success");
      }
      navigate("/hr/contracts");
    } catch (error) {
      const message = error.response?.data?.errors
        ? Object.values(error.response.data.errors).flat().join(", ")
        : error.response?.data?.message || "Failed to save contract";
      Swal.fire("Error", message, "error");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-teal-600"></div>
      </div>
    );
  }

  return (
    <div className="px-4 py-4 mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <button
          onClick={() => navigate("/hr/contracts")}
          className="p-2 text-gray-500 hover:text-teal-600 hover:bg-teal-50 rounded-lg transition-colors"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
        </button>
        <div>
          <h2 className="text-lg font-bold text-gray-800">
            {isEdit ? "Edit Contract" : "Add Contract"}
          </h2>
          <p className="text-xs text-gray-500">
            {isEdit ? "Update contract information" : "Create new contract"}
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="bg-white rounded-xl shadow-sm border border-gray-200 p-5" autoComplete="off">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Staff Select */}
          <div className="relative" ref={dropdownRef}>
            <label className="block text-xs font-medium text-gray-700 mb-1">Staff *</label>
            <div className="relative">
              <input
                type="text"
                placeholder="Search staff by name or ID..."
                value={searchTerm || (selectedStaff ? `${selectedStaff.full_name} (${selectedStaff.employee_id})` : "")}
                onChange={(e) => { setSearchTerm(e.target.value); setShowDropdown(true); }}
                onFocus={() => { setShowDropdown(true); if (selectedStaff) setSearchTerm(""); }}
                required
                className="w-full px-3 py-2 pr-10 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500 text-xs"
              />
              <div className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </div>
            </div>
            {showDropdown && (
              <div className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-60 overflow-auto">
                {filteredStaff.length === 0 ? (
                  <div className="px-3 py-2 text-xs text-gray-500">No staff found</div>
                ) : (
                  filteredStaff.map((staff) => (
                    <div
                      key={staff.id}
                      onClick={() => handleStaffSelect(staff)}
                      className={`px-3 py-2 cursor-pointer hover:bg-teal-50 border-b border-gray-100 last:border-0 ${formData.staff_id === staff.id ? "bg-teal-50" : ""}`}
                    >
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-full bg-teal-100 flex items-center justify-center text-teal-600 text-xs font-bold">
                          {staff.full_name?.charAt(0)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-medium text-gray-800 truncate">{staff.full_name}</p>
                          <p className="text-[10px] text-gray-500">{staff.employee_id} • {staff.department || "No Dept"}</p>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}
            <input type="hidden" name="staff_id" value={formData.staff_id} />
          </div>

          {/* Contract Type */}
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Contract Type *</label>
            <select
              name="contract_type"
              value={formData.contract_type}
              onChange={handleChange}
              required
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500 text-xs"
            >
              <option value="">Select Type</option>
              {contractTypes.map((ct) => (
                <option key={ct.value} value={ct.value}>{ct.label}</option>
              ))}
            </select>
            {selectedStaff?.contract_type && (
              <p className="text-[10px] text-teal-600 mt-1">
                Pre-filled from offer: {contractTypes.find(ct => ct.value === selectedStaff.contract_type)?.label || selectedStaff.contract_type}
              </p>
            )}
          </div>

          {/* Start Date */}
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Start Date *</label>
            <input
              type="date"
              name="start_date"
              value={formData.start_date}
              onChange={handleChange}
              required
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500 text-xs"
            />
            {selectedStaff?.start_date && (
              <p className="text-[10px] text-teal-600 mt-1">
                Pre-filled from offer start date
              </p>
            )}
          </div>

          {/* End Date */}
          {formData.contract_type !== "permanent" && (
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">
                End Date <span className="text-gray-400 font-normal">(optional)</span>
              </label>
              <input
                type="date"
                name="end_date"
                value={formData.end_date}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500 text-xs"
              />
            </div>
          )}

          {/* Probation Toggle */}
          <div className="md:col-span-2 pt-3 border-t border-gray-100">
            <label className="flex items-center gap-3 cursor-pointer group">
              <div className={`relative w-10 h-5 rounded-full transition-colors ${formData.has_probation ? 'bg-teal-600' : 'bg-gray-300'}`}
                onClick={() => {
                  const newVal = !formData.has_probation;
                  setFormData(prev => ({
                    ...prev,
                    has_probation: newVal,
                    probation_end_date: newVal && prev.start_date
                      ? (() => { const d = new Date(prev.start_date); d.setMonth(d.getMonth() + 1); return d.toISOString().split("T")[0]; })()
                      : "",
                  }));
                }}>
                <div className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${formData.has_probation ? 'translate-x-5' : 'translate-x-0.5'}`} />
              </div>
              <span className="text-xs font-medium text-gray-700 group-hover:text-teal-600 transition-colors">Has Probation Period</span>
            </label>

            {formData.has_probation && (
              <div className="mt-3">
                <label className="block text-xs font-medium text-gray-700 mb-1">Probation End Date</label>
                <input type="date" name="probation_end_date" value={formData.probation_end_date} onChange={handleChange}
                  className="w-full sm:w-64 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500 text-xs" />
                <p className="text-[10px] text-gray-400 mt-1">Default: 1 month from start date. You can adjust.</p>
              </div>
            )}
          </div>

          {/* Salary + Currency */}
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Salary *</label>
            <div className="flex gap-2">
              <select
                name="salary_currency"
                value={formData.salary_currency}
                onChange={handleChange}
                className="w-24 px-2 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500 text-xs"
              >
                <option value="AFN">AFN</option>
                <option value="USD">USD</option>
              </select>
              <input
                type="number"
                name="salary"
                value={formData.salary}
                onChange={handleChange}
                required
                placeholder="e.g. 25000"
                className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500 text-xs"
              />
            </div>
            {selectedStaff?.offered_salary && (
              <p className="text-[10px] text-amber-600 mt-1 flex items-center gap-1">
                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                This is the offered price ({selectedStaff.salary_currency} {Number(selectedStaff.offered_salary).toLocaleString()}). You can change it.
              </p>
            )}
          </div>

          {/* Expected Time */}
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">
              Expected Time <span className="text-gray-400 font-normal">(optional)</span>
            </label>
            <input
              type="time"
              name="expected_time"
              value={formData.expected_time}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500 text-xs"
            />
          </div>
        </div>

        {/* Buttons */}
        <div className="flex justify-end gap-3 mt-6">
          <button
            type="button"
            onClick={() => navigate("/hr/contracts")}
            className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors text-xs font-medium"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={saving}
            className="px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 transition-colors text-xs font-medium disabled:opacity-50"
          >
            {saving ? "Saving..." : isEdit ? "Update" : "Create"}
          </button>
        </div>
      </form>
    </div>
  );
}
