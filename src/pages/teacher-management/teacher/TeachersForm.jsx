import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { get, post, put } from "../../../api/axios";
import Swal from "sweetalert2";

export default function TeachersForm() {
  const navigate = useNavigate();
  const { id } = useParams();
  const isEdit = Boolean(id);

  const [formData, setFormData] = useState({
    first_name: "",
    last_name: "",
    email: "",
    phone: "",
    cnic: "",
    date_of_birth: "",
    gender: "",
    employment_type: "full-time",
    qualification: "",
    address: "",
    status: "active",
  });

  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (isEdit) {
      fetchTeacher();
    }
  }, [id]);

  const fetchTeacher = async () => {
    setLoading(true);
    try {
      const response = await get(`/teacher-management/teachers/show/${id}`);
      const data = response.data?.data || response.data;
      setFormData({
        first_name: data.first_name || "",
        last_name: data.last_name || "",
        email: data.email || "",
        phone: data.phone || "",
        cnic: data.cnic || "",
        date_of_birth: data.date_of_birth ? data.date_of_birth.split("T")[0] : "",
        gender: data.gender || "",
        employment_type: data.employment_type || "full-time",
        qualification: data.qualification || "",
        address: data.address || "",
        status: data.status || "active",
      });
    } catch (error) {
      Swal.fire("Error", "Failed to load teacher data", "error");
      navigate("/teacher-management/teachers");
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (errors[name]) {
      setErrors((prev) => ({ ...prev, [name]: null }));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setErrors({});

    try {
      let teacherId = id;
      if (isEdit) {
        await put(`/teacher-management/teachers/update/${id}`, formData);
        Swal.fire("Success", "Teacher updated successfully", "success");
      } else {
        const response = await post("/teacher-management/teachers/store", formData);
        Swal.fire("Success", "Teacher created successfully", "success");
        teacherId = response.data?.data?.id || response.data?.id;
      }
      navigate(`/teacher-management/teachers/show/${teacherId}`);
    } catch (error) {
      if (error.response?.status === 422 && error.response?.data?.errors) {
        setErrors(error.response.data.errors);
      } else {
        Swal.fire("Error", error.response?.data?.message || "Failed to save teacher", "error");
      }
    } finally {
      setSaving(false);
    }
  };

  const getFieldError = (fieldName) => errors[fieldName]?.[0];

  const getFieldClass = (fieldName) => {
    const baseClass = "w-full px-3 py-2 border rounded-lg focus:ring-2 text-xs";
    return `${baseClass} ${getFieldError(fieldName) ? "border-red-500 focus:ring-red-500" : "border-gray-300 focus:ring-teal-500"}`;
  };

  if (loading) return <div className="p-8 text-center">Loading...</div>;

  return (
    <div className="px-4 py-4 mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <button
          onClick={() => navigate("/teacher-management/teachers")}
          className="p-2 text-gray-500 hover:text-teal-600"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
        </button>
        <h2 className="text-lg font-bold text-gray-800">
          {isEdit ? "Edit Teacher" : "Add Teacher"}
        </h2>
      </div>

      <form
        onSubmit={handleSubmit}
        className="bg-white rounded-xl shadow-sm border border-gray-200 p-5 grid grid-cols-1 md:grid-cols-2 gap-4"
      >
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">First Name *</label>
          <input type="text" name="first_name" value={formData.first_name} onChange={handleChange} required className={getFieldClass("first_name")} />
          {getFieldError("first_name") && <p className="text-red-500 text-[10px] mt-1">{getFieldError("first_name")}</p>}
        </div>

        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">Last Name *</label>
          <input type="text" name="last_name" value={formData.last_name} onChange={handleChange} required className={getFieldClass("last_name")} />
          {getFieldError("last_name") && <p className="text-red-500 text-[10px] mt-1">{getFieldError("last_name")}</p>}
        </div>

        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">Email</label>
          <input type="email" name="email" value={formData.email} onChange={handleChange} className={getFieldClass("email")} />
          {getFieldError("email") && <p className="text-red-500 text-[10px] mt-1">{getFieldError("email")}</p>}
        </div>

        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">Phone</label>
          <input type="text" name="phone" value={formData.phone} onChange={handleChange} placeholder="0300-1234567" className={getFieldClass("phone")} />
          {getFieldError("phone") && <p className="text-red-500 text-[10px] mt-1">{getFieldError("phone")}</p>}
        </div>

        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">CNIC</label>
          <input type="text" name="cnic" value={formData.cnic} onChange={handleChange} placeholder="XXXXX-XXXXXXX-X" className={getFieldClass("cnic")} />
          {getFieldError("cnic") && <p className="text-red-500 text-[10px] mt-1">{getFieldError("cnic")}</p>}
        </div>

        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">Date of Birth</label>
          <input type="date" name="date_of_birth" value={formData.date_of_birth} onChange={handleChange} className={getFieldClass("date_of_birth")} />
          {getFieldError("date_of_birth") && <p className="text-red-500 text-[10px] mt-1">{getFieldError("date_of_birth")}</p>}
        </div>

        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">Gender</label>
          <select name="gender" value={formData.gender} onChange={handleChange} className={getFieldClass("gender")}>
            <option value="">Select Gender</option>
            <option value="male">Male</option>
            <option value="female">Female</option>
            <option value="other">Other</option>
          </select>
          {getFieldError("gender") && <p className="text-red-500 text-[10px] mt-1">{getFieldError("gender")}</p>}
        </div>

        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">Employment Type</label>
          <select name="employment_type" value={formData.employment_type} onChange={handleChange} className={getFieldClass("employment_type")}>
            <option value="full-time">Full Time</option>
            <option value="part-time">Part Time</option>
            <option value="contract">Contract</option>
            <option value="visiting">Visiting Faculty</option>
          </select>
          {getFieldError("employment_type") && <p className="text-red-500 text-[10px] mt-1">{getFieldError("employment_type")}</p>}
        </div>

        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">Qualification</label>
          <select name="qualification" value={formData.qualification} onChange={handleChange} className={getFieldClass("qualification")}>
            <option value="">Select Qualification</option>
            <option value="bachelor">Bachelor</option>
            <option value="master">Master</option>
            <option value="doctor">Doctor</option>
          </select>
          {getFieldError("qualification") && <p className="text-red-500 text-[10px] mt-1">{getFieldError("qualification")}</p>}
        </div>

        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">Status</label>
          <select name="status" value={formData.status} onChange={handleChange} className={getFieldClass("status")}>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
            <option value="on-leave">On Leave</option>
          </select>
          {getFieldError("status") && <p className="text-red-500 text-[10px] mt-1">{getFieldError("status")}</p>}
        </div>

        <div className="md:col-span-2">
          <label className="block text-xs font-medium text-gray-700 mb-1">Address</label>
          <textarea name="address" value={formData.address} onChange={handleChange} className={getFieldClass("address")} rows="2" />
          {getFieldError("address") && <p className="text-red-500 text-[10px] mt-1">{getFieldError("address")}</p>}
        </div>

        <div className="md:col-span-2 flex justify-end gap-3 mt-4">
          <button type="button" onClick={() => navigate("/teacher-management/teachers")} className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg text-xs font-medium">
            Cancel
          </button>
          <button type="submit" disabled={saving} className="px-4 py-2 bg-teal-600 text-white rounded-lg text-xs font-medium disabled:opacity-50">
            {saving ? "Saving..." : isEdit ? "Update" : "Create"}
          </button>
        </div>
      </form>
    </div>
  );
}
