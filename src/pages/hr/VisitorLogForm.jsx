import { useState, useEffect, useRef } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { get, post, put } from "../../api/axios";
import Swal from "sweetalert2";

const inp = "w-full px-3.5 py-2.5 border border-gray-200 rounded-xl text-xs focus:ring-2 focus:ring-teal-500 focus:border-teal-500 bg-white outline-none transition-colors placeholder-gray-400";
const errInp = "w-full px-3.5 py-2.5 border border-red-400 rounded-xl text-xs focus:ring-2 focus:ring-red-300 bg-red-50 outline-none transition-colors placeholder-gray-400";

export default function VisitorLogForm() {
  const navigate = useNavigate();
  const { id } = useParams();
  const isEdit = Boolean(id);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});

  const [staffList, setStaffList] = useState([]);
  const [staffSearch, setStaffSearch] = useState("");
  const [showStaffDrop, setShowStaffDrop] = useState(false);
  const staffRef = useRef(null);

  const [form, setForm] = useState({
    date: new Date().toISOString().split("T")[0],
    visitor_name: "",
    visitor_phone: "",
    purpose: "",
    time_in: new Date().toTimeString().slice(0, 5),
    time_out: "",
    met_with: "",
    notes: "",
  });

  useEffect(() => {
    fetchStaff();
    if (isEdit) loadItem();
  }, [id]);

  useEffect(() => {
    const close = (e) => { if (staffRef.current && !staffRef.current.contains(e.target)) setShowStaffDrop(false); };
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, []);

  const fetchStaff = async () => {
    try {
      const user = JSON.parse(localStorage.getItem("user") || "{}");
      const branchParam = user.branch_id ? `&branch_id=${user.branch_id}` : "";
      const res = await get(`/hr/staff/list?per_page=1000&status=active${branchParam}`);
      const data = res.data?.data || res.data || [];
      setStaffList(Array.isArray(data) ? data : []);
    } catch {
      setStaffList([]);
    }
  };

  const loadItem = async () => {
    setLoading(true);
    try {
      const res = await get(`/hr/visitor-logs/${id}`);
      const d = res.data?.data || res.data;
      setForm({
        date: d.date ? d.date.split("T")[0] : "",
        visitor_name: d.visitor_name || "",
        visitor_phone: d.visitor_phone || "",
        purpose: d.purpose || "",
        time_in: d.time_in ? d.time_in.substring(0, 5) : "",
        time_out: d.time_out ? d.time_out.substring(0, 5) : "",
        met_with: d.met_with || "",
        notes: d.notes || "",
      });
      if (d.met_with) setStaffSearch(d.met_with);
    } catch {
      navigate("/hr/visitor-log");
    } finally {
      setLoading(false);
    }
  };

  const handle = (e) => {
    setForm((p) => ({ ...p, [e.target.name]: e.target.value }));
    if (errors[e.target.name]) setErrors((p) => ({ ...p, [e.target.name]: null }));
  };

  const staffName = (s) => s.application?.full_name || s.full_name || `Staff #${s.employee_id}`;

  const filteredStaff = staffList.filter((s) => {
    const q = staffSearch.toLowerCase();
    return !q || staffName(s).toLowerCase().includes(q) || (s.employee_id || "").toLowerCase().includes(q) || (s.department || "").toLowerCase().includes(q);
  });

  const selectStaff = (s) => {
    const name = staffName(s);
    setForm((p) => ({ ...p, met_with: name }));
    setStaffSearch(name);
    setShowStaffDrop(false);
    if (errors.met_with) setErrors((p) => ({ ...p, met_with: null }));
  };

  const submit = async (e) => {
    e.preventDefault();
    const errs = {};
    if (!form.date) errs.date = "Date is required";
    if (!form.visitor_name) errs.visitor_name = "Visitor name is required";
    if (!form.purpose) errs.purpose = "Purpose is required";
    if (!form.time_in) errs.time_in = "Time in is required";
    if (!form.met_with) errs.met_with = "Met with is required";
    if (Object.keys(errs).length) { setErrors(errs); return; }

    setSaving(true);
    try {
      if (isEdit) {
        await put(`/hr/visitor-logs/${id}`, form);
        Swal.fire({ icon: "success", title: "Updated!", timer: 1500, showConfirmButton: false });
      } else {
        await post("/hr/visitor-logs", form);
        Swal.fire({ icon: "success", title: "Visitor Logged!", timer: 1500, showConfirmButton: false });
      }
      navigate("/hr/visitor-log");
    } catch (err) {
      if (err.response?.status === 422 && err.response?.data?.errors) {
        const se = {};
        Object.entries(err.response.data.errors).forEach(([k, v]) => { se[k] = v[0]; });
        setErrors(se);
      } else {
        Swal.fire("Error", err.response?.data?.message || "Failed to save", "error");
      }
    } finally {
      setSaving(false);
    }
  };

  const ic = (f) => errors[f] ? errInp : inp;

  if (loading) return <div className="flex items-center justify-center py-24"><div className="w-8 h-8 border-2 border-teal-600 border-t-transparent rounded-full animate-spin" /></div>;

  return (
    <div className="min-h-screen bg-gray-50/60">
      <div className="bg-teal-600 px-5 py-4">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate("/hr/visitor-log")} className="p-2 bg-white/20 hover:bg-white/30 rounded-xl text-white transition-colors">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" /></svg>
          </button>
          <div>
            <h1 className="text-sm font-bold text-white">{isEdit ? "Edit Visitor Log" : "New Visitor Entry"}</h1>
            <p className="text-xs text-teal-100 mt-0.5">Record visitor entry details</p>
          </div>
        </div>
      </div>

      <form onSubmit={submit} className="px-4 py-5 space-y-4">
        {/* Visitor Info */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm">
          <div className="px-5 py-3 bg-teal-50 border-b border-teal-100 flex items-center gap-2.5">
            <div className="w-8 h-8 bg-teal-600 rounded-lg flex items-center justify-center">
              <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>
            </div>
            <div>
              <p className="text-sm font-bold text-gray-800">Visitor Information</p>
              <p className="text-[10px] text-teal-600">Who is visiting</p>
            </div>
          </div>
          <div className="p-5 grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-[11px] font-semibold text-gray-600 mb-1.5">Date *</label>
              <input type="date" name="date" value={form.date} onChange={handle} className={ic("date")} />
              {errors.date && <p className="text-red-500 text-[10px] mt-1">{errors.date}</p>}
            </div>
            <div>
              <label className="block text-[11px] font-semibold text-gray-600 mb-1.5">Visitor Name *</label>
              <input type="text" name="visitor_name" value={form.visitor_name} onChange={handle} placeholder="Full name" className={ic("visitor_name")} />
              {errors.visitor_name && <p className="text-red-500 text-[10px] mt-1">{errors.visitor_name}</p>}
            </div>
            <div>
              <label className="block text-[11px] font-semibold text-gray-600 mb-1.5">Phone Number</label>
              <input type="text" name="visitor_phone" value={form.visitor_phone} onChange={handle} placeholder="07XX-XXX-XXXX" className={inp} />
            </div>
            <div className="sm:col-span-2">
              <label className="block text-[11px] font-semibold text-gray-600 mb-1.5">Purpose of Visit *</label>
              <input type="text" name="purpose" value={form.purpose} onChange={handle} placeholder="Meeting, Delivery, Interview, Parent Meeting..." className={ic("purpose")} />
              {errors.purpose && <p className="text-red-500 text-[10px] mt-1">{errors.purpose}</p>}
            </div>
          </div>
        </div>

        {/* Time & Meeting */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm">
          <div className="px-5 py-3 bg-teal-50 border-b border-teal-100 flex items-center gap-2.5">
            <div className="w-8 h-8 bg-teal-600 rounded-lg flex items-center justify-center">
              <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
            </div>
            <div>
              <p className="text-sm font-bold text-gray-800">Time & Meeting</p>
              <p className="text-[10px] text-teal-600">Entry time and person meeting</p>
            </div>
          </div>
          <div className="p-5 grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-[11px] font-semibold text-gray-600 mb-1.5">Time In *</label>
              <input type="time" name="time_in" value={form.time_in} onChange={handle} className={ic("time_in")} />
              {errors.time_in && <p className="text-red-500 text-[10px] mt-1">{errors.time_in}</p>}
            </div>
            <div>
              <label className="block text-[11px] font-semibold text-gray-600 mb-1.5">Time Out <span className="text-gray-400 font-normal">(optional)</span></label>
              <input type="time" name="time_out" value={form.time_out} onChange={handle} className={inp} />
              <p className="text-[9px] text-gray-400 mt-0.5">Leave blank — use Sign Out from list</p>
            </div>
            <div className="relative" ref={staffRef}>
              <label className="block text-[11px] font-semibold text-gray-600 mb-1.5">Met With *</label>
              <div className="relative">
                <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
                <input type="text" value={staffSearch} onChange={(e) => { setStaffSearch(e.target.value); setShowStaffDrop(true); setForm((p) => ({ ...p, met_with: e.target.value })); }}
                  onFocus={() => setShowStaffDrop(true)} placeholder="Search staff..." className={`pl-10 ${ic("met_with")}`} />
              </div>
              {errors.met_with && <p className="text-red-500 text-[10px] mt-1">{errors.met_with}</p>}
              {showStaffDrop && (
                <div className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-xl shadow-lg max-h-52 overflow-auto">
                  {filteredStaff.length === 0 ? (
                    <p className="px-4 py-3 text-xs text-gray-400">No staff found</p>
                  ) : (
                    filteredStaff.slice(0, 20).map((s) => (
                      <div key={s.id} onClick={() => selectStaff(s)}
                        className="px-4 py-2.5 cursor-pointer hover:bg-teal-50 border-b border-gray-50 last:border-0">
                        <p className="text-xs font-medium text-gray-800">{staffName(s)}</p>
                        <p className="text-[10px] text-gray-400">{s.employee_id} · {s.department || "No dept"}</p>
                      </div>
                    ))
                  )}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Notes */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm">
          <div className="px-5 py-3 bg-teal-50 border-b border-teal-100 flex items-center gap-2.5">
            <div className="w-8 h-8 bg-teal-600 rounded-lg flex items-center justify-center">
              <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
            </div>
            <div>
              <p className="text-sm font-bold text-gray-800">Additional Notes</p>
              <p className="text-[10px] text-teal-600">Optional remarks</p>
            </div>
          </div>
          <div className="p-5">
            <textarea name="notes" value={form.notes} onChange={handle} rows={3} className={`${inp} resize-none`} placeholder="Any additional notes..." />
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center justify-between pt-2">
          <button type="button" onClick={() => navigate("/hr/visitor-log")}
            className="flex items-center gap-2 px-5 py-2.5 text-sm font-medium text-gray-600 bg-white border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" /></svg>
            Cancel
          </button>
          <button type="submit" disabled={saving}
            className="flex items-center gap-2 px-6 py-2.5 text-sm font-semibold text-white bg-teal-600 rounded-xl hover:bg-teal-700 transition-colors disabled:opacity-50">
            {saving ? (
              <><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>Saving...</>
            ) : (
              <><svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>{isEdit ? "Update Log" : "Log Visitor"}</>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}
