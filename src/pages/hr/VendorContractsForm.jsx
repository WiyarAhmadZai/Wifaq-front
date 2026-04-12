import { useState, useEffect, useRef } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { get, post, put } from "../../api/axios";
import Swal from "sweetalert2";

const inp = "w-full px-3.5 py-2.5 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-teal-500 focus:border-teal-500 bg-white outline-none transition-colors placeholder-gray-400";

const CONTRACT_TYPES = [
  { value: "supply", label: "Supply" },
  { value: "service", label: "Service" },
  { value: "purchase", label: "Purchase" },
  { value: "rental", label: "Rental" },
  { value: "maintenance", label: "Maintenance" },
  { value: "consultancy", label: "Consultancy" },
  { value: "other", label: "Other" },
];

const Stars = ({ value }) => {
  if (!value) return <span className="text-gray-300 text-xs">—</span>;
  return (
    <span className="text-amber-500 text-xs tracking-wider">
      {"★".repeat(value)}<span className="text-gray-200">{"★".repeat(5 - value)}</span>
    </span>
  );
};

export default function VendorContractsForm() {
  const navigate = useNavigate();
  const { id } = useParams();
  const isEdit = Boolean(id);
  const dropdownRef = useRef(null);

  const [form, setForm] = useState({
    vendor_id: "",
    contract_type: "supply",
    description: "",
    start_date: new Date().toISOString().split("T")[0],
    end_date: "",
    amount: "",
    currency: "AFN",
    payment_terms: "",
    notes: "",
  });

  const [vendors, setVendors] = useState([]);
  const [filteredVendors, setFilteredVendors] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [showDropdown, setShowDropdown] = useState(false);
  const [selectedVendor, setSelectedVendor] = useState(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchVendors();
    if (isEdit) fetchContract();
  }, [id]);

  useEffect(() => {
    const close = (e) => { if (dropdownRef.current && !dropdownRef.current.contains(e.target)) setShowDropdown(false); };
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, []);

  useEffect(() => {
    if (searchTerm) {
      const q = searchTerm.toLowerCase();
      setFilteredVendors(vendors.filter((v) =>
        v.name?.toLowerCase().includes(q) ||
        v.category?.toLowerCase().includes(q) ||
        v.work_type?.toLowerCase().includes(q) ||
        v.contact?.toLowerCase().includes(q)
      ));
    } else {
      setFilteredVendors(vendors);
    }
  }, [searchTerm, vendors]);

  const fetchVendors = async () => {
    try {
      const res = await get("/hr/vendor-contracts/vendors-list");
      const data = res.data?.data || [];
      setVendors(Array.isArray(data) ? data : []);
      setFilteredVendors(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error("Failed to load vendors", err);
    }
  };

  const fetchContract = async () => {
    setLoading(true);
    try {
      const res = await get(`/hr/vendor-contracts/show/${id}`);
      const d = res.data;
      setForm({
        vendor_id: d.vendor_id || "",
        contract_type: d.contract_type || "supply",
        description: d.description || "",
        start_date: d.start_date?.split("T")[0] || "",
        end_date: d.end_date?.split("T")[0] || "",
        amount: d.amount || "",
        currency: d.currency || "AFN",
        payment_terms: d.payment_terms || "",
        notes: d.notes || "",
      });
      if (d.vendor) setSelectedVendor(d.vendor);
    } catch {
      Swal.fire("Error", "Failed to load vendor contract", "error");
      navigate("/hr/vendor-contracts");
    } finally {
      setLoading(false);
    }
  };

  const handleVendorSelect = (vendor) => {
    setSelectedVendor(vendor);
    setForm((prev) => ({ ...prev, vendor_id: vendor.id }));
    // Pre-fill payment terms from vendor record if the contract field is empty
    if (!form.payment_terms && vendor.payment_terms) {
      setForm((prev) => ({ ...prev, payment_terms: vendor.payment_terms }));
    }
    setSearchTerm("");
    setShowDropdown(false);
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.vendor_id) {
      Swal.fire("Error", "Please select a vendor", "error");
      return;
    }
    if (!form.start_date || !form.end_date) {
      Swal.fire("Error", "Start date and end date are required", "error");
      return;
    }
    setSaving(true);
    try {
      const payload = { ...form };
      if (payload.amount === "" || payload.amount === null) delete payload.amount;

      if (isEdit) {
        await put(`/hr/vendor-contracts/update/${id}`, payload);
        Swal.fire({ icon: "success", title: "Vendor contract updated", timer: 1500, showConfirmButton: false });
      } else {
        await post("/hr/vendor-contracts/store", payload);
        Swal.fire({ icon: "success", title: "Vendor contract created", timer: 1500, showConfirmButton: false });
      }
      navigate("/hr/vendor-contracts");
    } catch (err) {
      const msg = err.response?.data?.errors
        ? Object.values(err.response.data.errors).flat().join(", ")
        : err.response?.data?.message || "Failed to save vendor contract";
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
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <button onClick={() => navigate("/hr/vendor-contracts")}
          className="p-2 text-gray-500 hover:text-teal-600 hover:bg-teal-50 rounded-lg transition-colors">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
        </button>
        <div>
          <h2 className="text-lg font-bold text-gray-800">{isEdit ? "Edit Vendor Contract" : "New Vendor Contract"}</h2>
          <p className="text-xs text-gray-500">{isEdit ? "Update vendor contract details" : "Create a contract with a registered vendor"}</p>
        </div>
      </div>

      {/* Selected Vendor Info Card */}
      {selectedVendor && (
        <div className="mb-5 p-5 bg-gradient-to-r from-teal-50 to-cyan-50 rounded-xl border border-teal-200">
          <div className="flex items-start gap-4">
            <div className="w-14 h-14 bg-teal-600 rounded-xl flex items-center justify-center text-white text-xl font-bold flex-shrink-0">
              {selectedVendor.name?.charAt(0)?.toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between gap-2 mb-2">
                <p className="text-base font-bold text-gray-800">{selectedVendor.name}</p>
                {selectedVendor.category && (
                  <span className="px-2.5 py-1 bg-teal-600 text-white text-[10px] font-semibold rounded-full uppercase">
                    {selectedVendor.category}
                  </span>
                )}
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-1 text-xs">
                {selectedVendor.work_type && (
                  <div className="flex gap-2"><span className="text-gray-500 font-medium">Work type:</span><span className="text-gray-800">{selectedVendor.work_type}</span></div>
                )}
                {selectedVendor.contact && (
                  <div className="flex gap-2"><span className="text-gray-500 font-medium">Contact:</span><span className="text-gray-800">{selectedVendor.contact}</span></div>
                )}
                {selectedVendor.address && (
                  <div className="flex gap-2 sm:col-span-2"><span className="text-gray-500 font-medium">Address:</span><span className="text-gray-800">{selectedVendor.address}</span></div>
                )}
                {selectedVendor.payment_terms && (
                  <div className="flex gap-2 sm:col-span-2"><span className="text-gray-500 font-medium">Default payment terms:</span><span className="text-gray-800">{selectedVendor.payment_terms}</span></div>
                )}
                <div className="flex gap-2"><span className="text-gray-500 font-medium">Quality:</span><Stars value={selectedVendor.quality_rating} /></div>
                <div className="flex gap-2"><span className="text-gray-500 font-medium">Price:</span><Stars value={selectedVendor.price_rating} /></div>
                <div className="flex gap-2"><span className="text-gray-500 font-medium">Deadline:</span><Stars value={selectedVendor.deadline_rating} /></div>
                <div className="flex gap-2"><span className="text-gray-500 font-medium">Response:</span><Stars value={selectedVendor.response_rating} /></div>
              </div>
            </div>
          </div>
        </div>
      )}

      <form onSubmit={handleSubmit} className="bg-white rounded-xl shadow-sm border border-gray-200 p-5 space-y-5" autoComplete="off">
        {/* Vendor select */}
        <div className="relative" ref={dropdownRef}>
          <label className="block text-xs font-medium text-gray-700 mb-1">Vendor *</label>
          <div className="relative">
            <input
              type="text"
              placeholder="Search vendor by name, category, work type..."
              value={searchTerm || (selectedVendor ? `${selectedVendor.name}${selectedVendor.category ? ` (${selectedVendor.category})` : ""}` : "")}
              onChange={(e) => { setSearchTerm(e.target.value); setShowDropdown(true); }}
              onFocus={() => { setShowDropdown(true); if (selectedVendor) setSearchTerm(""); }}
              className={inp}
            />
            <svg className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>
          {showDropdown && (
            <div className="absolute z-[9999] w-full mt-1 bg-white border border-gray-200 rounded-xl shadow-lg max-h-64 overflow-auto">
              {filteredVendors.length === 0 ? (
                <div className="px-4 py-3 text-sm text-gray-400">No vendors found. <span className="text-teal-600">Register a vendor first.</span></div>
              ) : (
                filteredVendors.map((vendor) => (
                  <div key={vendor.id} onClick={() => handleVendorSelect(vendor)}
                    className={`px-4 py-2.5 cursor-pointer hover:bg-teal-50 border-b border-gray-50 last:border-0 ${form.vendor_id === vendor.id ? "bg-teal-50" : ""}`}>
                    <div className="flex items-center gap-2.5">
                      <div className="w-9 h-9 rounded-lg bg-teal-100 flex items-center justify-center text-teal-600 text-xs font-bold flex-shrink-0">
                        {vendor.name?.charAt(0)?.toUpperCase()}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-800 truncate">{vendor.name}</p>
                        <p className="text-[10px] text-gray-500 truncate">
                          {vendor.category || "—"}{vendor.work_type ? ` · ${vendor.work_type}` : ""}{vendor.contact ? ` · ${vendor.contact}` : ""}
                        </p>
                      </div>
                      {form.vendor_id === vendor.id && (
                        <svg className="w-4 h-4 text-teal-600 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                        </svg>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          )}
        </div>

        {/* Contract section */}
        <div className="pt-4 border-t border-gray-100">
          <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3">Contract Details</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Contract Type *</label>
              <select name="contract_type" value={form.contract_type} onChange={handleChange} className={inp}>
                {CONTRACT_TYPES.map((t) => (
                  <option key={t.value} value={t.value}>{t.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Currency</label>
              <select name="currency" value={form.currency} onChange={handleChange} className={inp}>
                <option value="AFN">AFN</option>
                <option value="USD">USD</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Start Date *</label>
              <input type="date" name="start_date" value={form.start_date} onChange={handleChange} required className={inp} />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">End Date *</label>
              <input type="date" name="end_date" value={form.end_date} onChange={handleChange} required className={inp} />
            </div>
            <div className="md:col-span-2">
              <label className="block text-xs font-medium text-gray-700 mb-1">
                Amount <span className="text-gray-400 font-normal">(optional)</span>
              </label>
              <input type="number" step="0.01" min="0" name="amount" value={form.amount} onChange={handleChange}
                placeholder="0.00" className={inp} />
            </div>
          </div>
          <div className="mt-4">
            <label className="block text-xs font-medium text-gray-700 mb-1">
              Description <span className="text-gray-400 font-normal">(optional)</span>
            </label>
            <textarea name="description" value={form.description} onChange={handleChange} rows={3}
              placeholder="What is this contract for? (e.g. office furniture, monthly cleaning service, IT maintenance...)"
              className={inp} />
          </div>
          <div className="mt-4">
            <label className="block text-xs font-medium text-gray-700 mb-1">
              Payment Terms <span className="text-gray-400 font-normal">(optional)</span>
            </label>
            <textarea name="payment_terms" value={form.payment_terms} onChange={handleChange} rows={2}
              placeholder="e.g. 50% advance, 50% on delivery..." className={inp} />
          </div>
          <div className="mt-4">
            <label className="block text-xs font-medium text-gray-700 mb-1">
              Notes <span className="text-gray-400 font-normal">(optional)</span>
            </label>
            <textarea name="notes" value={form.notes} onChange={handleChange} rows={2}
              placeholder="Any additional notes..." className={inp} />
          </div>
        </div>

        {/* Buttons */}
        <div className="flex justify-end gap-3 pt-2 border-t border-gray-100">
          <button type="button" onClick={() => navigate("/hr/vendor-contracts")}
            className="px-5 py-2.5 bg-gray-200 text-gray-700 rounded-xl hover:bg-gray-300 transition-colors text-sm font-medium">
            Cancel
          </button>
          <button type="submit" disabled={saving}
            className="px-5 py-2.5 bg-teal-600 text-white rounded-xl hover:bg-teal-700 transition-colors text-sm font-medium disabled:opacity-50 flex items-center gap-2">
            {saving ? (
              <><div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> Saving...</>
            ) : (
              <><svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg> {isEdit ? "Update Contract" : "Create Contract"}</>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}
