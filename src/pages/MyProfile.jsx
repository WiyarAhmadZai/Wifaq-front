import { useState, useEffect } from 'react';
import { useNavigate, useParams } from "react-router-dom";
import { get, put, post } from '../api/axios';
import { useAuth } from '../admin/context/AuthContext';
import Swal from 'sweetalert2';
import Select2 from '../components/hr/Select2';

const CONTRACT_LABELS = {
  full_time: "Full Time", part_time: "Part Time", contract: "Contract",
  temporary: "Temporary", internship: "Internship",
  FT: "Full Time", PT: "Part Time", TEMP: "Temporary", CONTRACT: "Contract", INTERNSHIP: "Internship",
};

const BLOOD_TYPES = ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"];

export default function MyProfile() {
  const navigate = useNavigate();
  const { userId } = useParams();
  const { user: authUser, hasRole } = useAuth();

  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [showPersonal, setShowPersonal] = useState(false);
  const [showContact, setShowContact] = useState(false);
  const [showEmployment, setShowEmployment] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const isAdmin = hasRole('super-admin') || hasRole('admin');

  useEffect(() => { fetchProfile(); }, [userId]);

  const fetchProfile = async () => {
    setLoading(true);
    try {
      const endpoint = userId ? `/profile/${userId}` : '/profile';
      const res = await get(endpoint);
      setProfile(res.data.data);
    } catch (e) {
      Swal.fire('Error', 'Failed to load profile data', 'error');
      if (!userId) navigate('/');
    } finally {
      setLoading(false);
    }
  };

  const updateSection = async (payload) => {
    setSaving(true);
    try {
      const fd = new FormData();
      if (userId) fd.append('user_id', userId);
      fd.append('type', profile.type || 'user');
      Object.entries(payload).forEach(([k, v]) => {
        if (v !== undefined && v !== null) fd.append(k, v);
      });
      const res = await put('/profile', fd, { headers: { 'Content-Type': 'multipart/form-data' } });
      setProfile(res.data.data);
      Swal.fire({ icon: 'success', title: 'Saved', timer: 1500, showConfirmButton: false });
      return true;
    } catch (e) {
      Swal.fire('Error', e.response?.data?.message || 'Failed to update', 'error');
      return false;
    } finally {
      setSaving(false);
    }
  };

  const uploadPhoto = async (file) => {
    if (!file) return;
    const fd = new FormData();
    if (userId) fd.append('user_id', userId);
    fd.append('type', profile.type || 'user');
    fd.append('profile_photo', file);
    setSaving(true);
    try {
      const res = await put('/profile', fd, { headers: { 'Content-Type': 'multipart/form-data' } });
      setProfile(res.data.data);
    } catch (e) {
      Swal.fire('Error', 'Photo upload failed', 'error');
    } finally {
      setSaving(false);
    }
  };

  const changePassword = async (payload) => {
    setSaving(true);
    try {
      const body = { ...payload };
      if (userId) body.user_id = userId;
      await post('/profile/change-password', body);
      Swal.fire({ icon: 'success', title: 'Password updated', timer: 1500, showConfirmButton: false });
      setShowPassword(false);
      return true;
    } catch (e) {
      Swal.fire('Error', e.response?.data?.message || 'Failed to change password', 'error');
      return false;
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50/60 flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-teal-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="min-h-screen bg-gray-50/60 flex items-center justify-center">
        <div className="text-sm text-gray-500">Profile not found</div>
      </div>
    );
  }

  const u = profile.user || {};
  const s = profile.staff || {};
  const a = s.application || {};
  const photoUrl = u.profile_photo || s.profile_photo;

  return (
    <div className="min-h-screen bg-gray-50/60">
      {/* Header */}
      <div className="bg-teal-600 px-5 py-6">
        <div className="max-w-full mx-auto">
          <div className="flex items-center justify-between mb-5">
            <div className="flex items-center gap-3">
              <button onClick={() => navigate(-1)} className="p-2 bg-white/20 hover:bg-white/30 rounded-xl text-white transition-colors">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" /></svg>
              </button>
              <h1 className="text-sm font-bold text-white">My Profile</h1>
            </div>
            <button
              onClick={() => setShowPassword(true)}
              className="px-3 py-1.5 bg-white text-teal-600 text-xs font-semibold rounded-lg hover:bg-gray-100 transition-colors flex items-center gap-1.5"
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" /></svg>
              Change Password
            </button>
          </div>

          <div className="flex items-center gap-4">
            <div className="relative">
              <div className="w-16 h-16 rounded-2xl flex items-center justify-center text-white text-2xl font-black overflow-hidden bg-white/20">
                {photoUrl ? <img src={photoUrl} alt={u.name} className="w-full h-full object-cover" /> : (u.name?.charAt(0) || 'U')}
              </div>
              <button onClick={() => document.getElementById('profile-photo-upload').click()}
                disabled={saving}
                className="absolute bottom-0 right-0 w-6 h-6 bg-teal-600 rounded-full flex items-center justify-center text-white hover:bg-teal-700 transition-colors shadow-lg disabled:opacity-50"
                title="Update profile photo">
                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
              </button>
              <input id="profile-photo-upload" type="file" accept="image/*"
                onChange={(e) => uploadPhoto(e.target.files[0])} className="hidden" />
            </div>
            <div className="flex-1">
              <h2 className="text-lg font-black text-white">{u.name || 'N/A'}</h2>
              <p className="text-xs text-teal-100 mt-0.5">
                {s.role_title_en || (profile.type === 'user' ? 'User' : profile.type)}
                {s.department && ` · ${s.department}`}
              </p>
              <div className="flex items-center gap-2 mt-2 flex-wrap">
                {s.employee_id && <span className="px-2.5 py-0.5 bg-white/20 text-white text-[11px] font-semibold rounded-full">{s.employee_id}</span>}
                <span className="px-2.5 py-0.5 bg-white/20 text-white text-[11px] font-semibold rounded-full">{u.email}</span>
                {s.status && <span className="px-2.5 py-0.5 bg-white/30 text-white text-[11px] font-semibold rounded-full capitalize">{s.status}</span>}
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-full mx-auto px-4 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <div className="lg:col-span-2 space-y-4">
            {/* Personal */}
            <Section
              title="Personal Information"
              icon="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
              onEdit={() => setShowPersonal(true)}
              editable
            >
              <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
                <Field label="Full Name" value={u.name} />
                <Field label="Username" value={u.username} />
                <Field label="Father's Name" value={s.father_name} />
                <Field label="Date of Birth" value={a.date_of_birth?.split?.('T')[0]} />
                <Field label="Blood Type" value={s.blood_type} />
                <Field label="Place of Origin" value={a.place_of_origin} />
              </div>
            </Section>

            {/* Contact */}
            <Section
              title="Contact Information"
              icon="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z"
              onEdit={() => setShowContact(true)}
              editable
            >
              <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
                <Field label="Email" value={u.email} />
                <Field label="Phone" value={u.phone} />
                <Field label="WhatsApp" value={u.whatsapp} />
                <Field label="Current Address" value={a.current_address} className="col-span-2 lg:col-span-3" />
              </div>
            </Section>

            {/* Education (read-only — comes from application) */}
            {profile.type === 'staff' && (
              <Section
                title="Education & Experience"
                icon="M12 14l9-5-9-5-9 5 9 5z M12 14l6.16-3.422a12.083 12.083 0 01.665 6.479A11.952 11.952 0 0012 20.055a11.952 11.952 0 00-6.824-2.998 12.078 12.078 0 01.665-6.479L12 14z"
                locked
              >
                <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
                  <Field label="Education Level" value={a.education_level} />
                  <Field label="Field of Study" value={a.field_of_study} />
                  <Field label="Institution" value={a.institution_name} />
                  <Field label="Years of Experience" value={a.total_experience_years} />
                </div>
              </Section>
            )}

            {/* Self-profile (skills, dreams, growth areas) — staff-owned narrative */}
            {profile.type === 'staff' && profile.is_self && <SelfProfileSection />}

            {/* Leave balance (read-only summary) */}
            {profile.type === 'staff' && profile.is_self && <LeaveBalanceSection />}

            {/* My leave requests with live status */}
            {profile.type === 'staff' && profile.is_self && <MyLeaveRequestsSection />}
          </div>

          <div className="space-y-4">
            {/* Employment — admin-only */}
            {profile.type === 'staff' && (
              <Section
                title="Employment Details"
                icon="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
                onEdit={isAdmin ? () => setShowEmployment(true) : undefined}
                editable={isAdmin}
                locked={!isAdmin}
                lockMessage="Admin-only — managed by HR"
              >
                <div className="grid grid-cols-1 gap-3">
                  <Field label="Employee ID" value={s.employee_id} />
                  <Field label="Department" value={s.department} />
                  <Field label="Branch" value={s.branch?.name} />
                  <Field label="Role / Position" value={s.role_title_en} />
                  <Field label="Contract Type" value={CONTRACT_LABELS[s.contract_type] || s.contract_type} />
                  <Field label="Status" value={s.status} />
                </div>
              </Section>
            )}
          </div>
        </div>
      </div>

      {showPersonal && (
        <PersonalModal
          profile={profile}
          onClose={() => setShowPersonal(false)}
          onSave={async (form) => {
            const ok = await updateSection({
              name: form.name,
              'staff_data.father_name': form.father_name,
              'staff_data.blood_type': form.blood_type,
            });
            if (ok) setShowPersonal(false);
          }}
          saving={saving}
        />
      )}

      {showContact && (
        <ContactModal
          profile={profile}
          onClose={() => setShowContact(false)}
          onSave={async (form) => {
            const ok = await updateSection({
              email: form.email,
              phone: form.phone,
              whatsapp: form.whatsapp,
            });
            if (ok) setShowContact(false);
          }}
          saving={saving}
        />
      )}

      {showEmployment && isAdmin && (
        <EmploymentModal
          profile={profile}
          onClose={() => setShowEmployment(false)}
          onSave={async (form) => {
            const ok = await updateSection({
              'staff_data.department': form.department,
              'staff_data.role_title_en': form.role_title_en,
              'staff_data.contract_type': form.contract_type,
              'staff_data.status': form.status,
              'staff_data.branch_id': form.branch_id,
            });
            if (ok) setShowEmployment(false);
          }}
          saving={saving}
        />
      )}

      {showPassword && (
        <PasswordModal
          isAdmin={isAdmin && profile.user.id !== authUser?.id}
          onClose={() => setShowPassword(false)}
          onSave={changePassword}
          saving={saving}
        />
      )}
    </div>
  );
}

/* ─────────────── Self-profile (skills, dreams, growth) ─────────────── */

function SelfProfileSection() {
  const [data, setData] = useState(null);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => { load(); }, []);

  const load = async () => {
    try { const r = await get("/self-profile"); setData(r.data?.data || {}); }
    catch { setData({}); }
  };

  const save = async (form) => {
    setSaving(true);
    try {
      const r = await put("/self-profile", form);
      setData(r.data?.data || form);
      setEditing(false);
      Swal.fire({ icon: "success", title: "Saved", timer: 1000, showConfirmButton: false });
    } catch (err) { Swal.fire("Error", err.response?.data?.message || "Failed", "error"); }
    finally { setSaving(false); }
  };

  if (!data) return null;

  return (
    <Section
      title="My Story (Self-Profile)"
      icon="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"
    >
      <div className="flex justify-between items-center mb-4">
        <span className="text-xs text-gray-500">Tell us who you are and where you want to grow. The appraiser sees this every year.</span>
        <button onClick={() => setEditing(true)}
          className="px-3 py-1 bg-teal-600 text-white text-xs font-semibold rounded-lg hover:bg-teal-700">
          Edit
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <NarrativeField label="🎓 Education" value={data.education} />
        <NarrativeField label="🌍 Languages" value={(data.languages || []).join(", ")} />
        <NarrativeField label="💼 Previous Experience" value={data.previous_experience} />
        <NarrativeField label="⚡ Skills" value={(data.skills || []).join(", ")} />
        <NarrativeField label="🏅 Certifications" value={(data.certifications || []).join(", ")} />
        <NarrativeField label="💪 My Strengths" value={data.strengths} />
        <NarrativeField label="🌱 What I Want to Grow" value={data.growth_areas} className="md:col-span-2" />
        <NarrativeField label="🚀 My Aspirations" value={data.aspirations} className="md:col-span-2" />
      </div>

      {editing && <SelfProfileEditor data={data} onClose={() => setEditing(false)} onSave={save} saving={saving} />}
    </Section>
  );
}

function NarrativeField({ label, value, className = "" }) {
  return (
    <div className={`p-3 bg-gray-50 rounded-xl ${className}`}>
      <p className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider mb-1">{label}</p>
      <p className="text-sm text-gray-800 leading-snug whitespace-pre-line">{value || <span className="text-gray-300 italic">Not yet shared</span>}</p>
    </div>
  );
}

function SelfProfileEditor({ data, onClose, onSave, saving }) {
  const [form, setForm] = useState({
    education: data.education || "",
    languages: (data.languages || []).join(", "),
    previous_experience: data.previous_experience || "",
    skills: (data.skills || []).join(", "),
    certifications: (data.certifications || []).join(", "),
    strengths: data.strengths || "",
    aspirations: data.aspirations || "",
    growth_areas: data.growth_areas || "",
  });
  const inp = "w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-teal-500 focus:border-teal-500 bg-white outline-none";

  const handle = (e) => {
    e.preventDefault();
    onSave({
      education: form.education,
      languages: form.languages.split(",").map(s => s.trim()).filter(Boolean),
      previous_experience: form.previous_experience,
      skills: form.skills.split(",").map(s => s.trim()).filter(Boolean),
      certifications: form.certifications.split(",").map(s => s.trim()).filter(Boolean),
      strengths: form.strengths,
      aspirations: form.aspirations,
      growth_areas: form.growth_areas,
    });
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
        <div className="px-5 py-4 border-b border-gray-100 bg-teal-600 text-white rounded-t-2xl">
          <h3 className="text-sm font-bold">Edit My Story</h3>
          <p className="text-[11px] text-teal-100 mt-0.5">This is your space — tell us who you are.</p>
        </div>
        <form onSubmit={handle} className="p-5 space-y-3">
          <Field2 label="🎓 Education">
            <textarea rows={2} className={inp} value={form.education} onChange={(e) => setForm({ ...form, education: e.target.value })} placeholder="Degree, college, year…" />
          </Field2>
          <Field2 label="🌍 Languages (comma-separated)">
            <input className={inp} value={form.languages} onChange={(e) => setForm({ ...form, languages: e.target.value })} placeholder="Dari, Pashto, English" />
          </Field2>
          <Field2 label="💼 Previous Experience">
            <textarea rows={3} className={inp} value={form.previous_experience} onChange={(e) => setForm({ ...form, previous_experience: e.target.value })} />
          </Field2>
          <Field2 label="⚡ Skills (comma-separated)">
            <input className={inp} value={form.skills} onChange={(e) => setForm({ ...form, skills: e.target.value })} placeholder="Lesson planning, Excel, public speaking" />
          </Field2>
          <Field2 label="🏅 Certifications (comma-separated)">
            <input className={inp} value={form.certifications} onChange={(e) => setForm({ ...form, certifications: e.target.value })} />
          </Field2>
          <Field2 label="💪 My strengths (what do I do best?)">
            <textarea rows={2} className={inp} value={form.strengths} onChange={(e) => setForm({ ...form, strengths: e.target.value })} />
          </Field2>
          <Field2 label="🌱 Where I want to grow (next 12 months)">
            <textarea rows={2} className={inp} value={form.growth_areas} onChange={(e) => setForm({ ...form, growth_areas: e.target.value })} />
          </Field2>
          <Field2 label="🚀 Long-term aspirations">
            <textarea rows={2} className={inp} value={form.aspirations} onChange={(e) => setForm({ ...form, aspirations: e.target.value })} />
          </Field2>

          <div className="flex gap-2 pt-2">
            <button type="button" onClick={onClose} className="flex-1 px-4 py-2.5 border border-gray-200 text-gray-700 text-sm font-semibold rounded-xl hover:bg-gray-50">Cancel</button>
            <button type="submit" disabled={saving} className="flex-1 px-4 py-2.5 bg-teal-600 text-white text-sm font-semibold rounded-xl hover:bg-teal-700 disabled:opacity-50">
              {saving ? "Saving…" : "Save"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function Field2({ label, children }) {
  return (
    <div>
      <label className="block text-[11px] font-semibold text-gray-500 uppercase tracking-wider mb-1.5">{label}</label>
      {children}
    </div>
  );
}

/* ─────────────── My leave requests (with status + rejection reason) ─────────────── */

function MyLeaveRequestsSection() {
  const navigate = useNavigate();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    get('/hr/leave-requests/mine')
      .then((r) => setItems(r.data?.data || []))
      .catch(() => setItems([]))
      .finally(() => setLoading(false));
  }, []);

  const statusTone = {
    pending:  { bg: 'bg-amber-50',   text: 'text-amber-700',   dot: 'bg-amber-500',   label: 'Pending'  },
    approved: { bg: 'bg-emerald-50', text: 'text-emerald-700', dot: 'bg-emerald-500', label: 'Approved' },
    rejected: { bg: 'bg-red-50',     text: 'text-red-700',     dot: 'bg-red-500',     label: 'Rejected' },
  };

  const daysBetween = (fromIso, toIso) => {
    if (!fromIso) return 0;
    const from = new Date(fromIso);
    const to = toIso ? new Date(toIso) : from;
    return Math.floor((to - from) / 86400000) + 1;
  };

  return (
    <Section
      title="My Leave Requests"
      icon="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
    >
      <div className="flex justify-between items-center mb-3">
        <span className="text-xs text-gray-500">Your submitted requests and where they stand</span>
        <button
          onClick={() => navigate('/hr/leave-request/create')}
          className="px-3 py-1 bg-teal-600 text-white text-xs font-semibold rounded-lg hover:bg-teal-700"
        >
          + New request
        </button>
      </div>

      {loading ? (
        <div className="text-center py-4 text-xs text-gray-400">Loading…</div>
      ) : items.length === 0 ? (
        <p className="text-xs text-gray-400 text-center py-4">No leave requests yet. Click "New request" to submit one.</p>
      ) : (
        <div className="space-y-2">
          {items.map((r) => {
            const tone = statusTone[r.status] || statusTone.pending;
            const days = daysBetween(r.from_date, r.to_date);
            return (
              <div key={r.id}
                className={`${tone.bg} rounded-xl p-3 cursor-pointer hover:shadow-sm transition-shadow`}
                onClick={() => navigate(`/hr/leave-request/show/${r.id}`)}>
                <div className="flex items-center justify-between gap-2 mb-1">
                  <p className="text-sm font-bold text-gray-800 capitalize flex items-center gap-2">
                    <span className={`w-2 h-2 rounded-full ${tone.dot}`} />
                    {r.leave_type?.replace(/_/g, ' ')} · {days} day{days === 1 ? '' : 's'}
                  </p>
                  <span className={`${tone.text} text-[10px] font-bold uppercase`}>{tone.label}</span>
                </div>
                <p className="text-[11px] text-gray-600">
                  {r.from_date?.split('T')[0]}{r.to_date ? ` → ${r.to_date.split('T')[0]}` : ''}
                </p>
                {r.status === 'rejected' && r.rejection_reason && (
                  <p className="text-[11px] text-red-700 mt-1.5 italic border-l-2 border-red-300 pl-2">
                    Reason: {r.rejection_reason}
                  </p>
                )}
              </div>
            );
          })}
        </div>
      )}
    </Section>
  );
}

/* ─────────────── Leave balance summary ─────────────── */

function LeaveBalanceSection() {
  const [data, setData] = useState({ data: [], year: new Date().getFullYear() });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    get("/leave-balances").then(r => setData(r.data || { data: [] })).catch(() => setData({ data: [] })).finally(() => setLoading(false));
  }, []);

  const tones = {
    annual: { bg: "bg-emerald-50", text: "text-emerald-700", icon: "🌴" },
    sick: { bg: "bg-red-50", text: "text-red-700", icon: "🤒" },
    casual: { bg: "bg-blue-50", text: "text-blue-700", icon: "🌤" },
    personal: { bg: "bg-purple-50", text: "text-purple-700", icon: "🙏" },
    maternity: { bg: "bg-pink-50", text: "text-pink-700", icon: "👶" },
  };

  return (
    <Section
      title={`Leave Balance · ${data.year || new Date().getFullYear()}`}
      icon="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
      locked
      lockMessage="Set by HR"
    >
      {loading ? (
        <div className="text-center py-4 text-xs text-gray-400">Loading…</div>
      ) : !data.data?.length ? (
        <p className="text-xs text-gray-400 text-center py-4">No leave allocations yet for this year. HR will set them.</p>
      ) : (
        <div className="space-y-2">
          {data.data.map(b => {
            const t = tones[b.leave_type] || { bg: "bg-gray-50", text: "text-gray-700", icon: "🗓" };
            const total = parseFloat(b.allocated || 0) + parseFloat(b.carried_over || 0);
            const used = parseFloat(b.used || 0);
            const remaining = parseFloat(b.remaining || (total - used));
            const pct = total > 0 ? Math.min(100, (used / total) * 100) : 0;
            return (
              <div key={b.id} className={`${t.bg} rounded-xl p-3`}>
                <div className="flex items-center justify-between gap-2 mb-1.5">
                  <p className={`text-sm font-bold ${t.text} capitalize flex items-center gap-1.5`}>
                    <span>{t.icon}</span> {b.leave_type}
                  </p>
                  <p className="text-xs">
                    <span className="font-black text-gray-800">{remaining.toFixed(1)}</span>
                    <span className="text-gray-500"> / {total.toFixed(1)} days left</span>
                  </p>
                </div>
                <div className="h-1.5 bg-white/60 rounded-full overflow-hidden">
                  <div className="bg-gray-400 h-full transition-all" style={{ width: `${pct}%` }} />
                </div>
                <p className="text-[10px] text-gray-500 mt-1">{used.toFixed(1)} day(s) used so far</p>
              </div>
            );
          })}
        </div>
      )}
    </Section>
  );
}

/* ─────────────────────── shared ─────────────────────── */

function Section({ title, icon, children, onEdit, editable, locked, lockMessage }) {
  return (
    <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
      <div className="bg-gradient-to-r from-teal-50 to-emerald-50 px-4 py-3 border-b border-gray-100 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <svg className="w-4 h-4 text-teal-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={icon} />
          </svg>
          <h3 className="text-sm font-bold text-teal-800">{title}</h3>
        </div>
        {editable && onEdit && (
          <button
            onClick={onEdit}
            className="p-1.5 text-teal-700 hover:bg-teal-100 rounded-lg transition-colors"
            title="Edit"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
            </svg>
          </button>
        )}
        {locked && (
          <span className="flex items-center gap-1 text-[10px] text-gray-500 italic">
            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" /></svg>
            {lockMessage || 'Read-only'}
          </span>
        )}
      </div>
      <div className="p-4">{children}</div>
    </div>
  );
}

function Field({ label, value, className = '' }) {
  return (
    <div className={`p-3 bg-gray-50 rounded-xl ${className}`}>
      <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-1">{label}</p>
      <p className="text-sm font-semibold text-gray-800 capitalize break-words">{value || '—'}</p>
    </div>
  );
}

function ModalShell({ title, onClose, children }) {
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md" onClick={e => e.stopPropagation()}>
        <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
          <h3 className="text-sm font-bold text-gray-800">{title}</h3>
          <button onClick={onClose} className="p-1.5 hover:bg-gray-100 rounded-lg text-gray-400 hover:text-gray-600">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
        </div>
        <div className="p-5">{children}</div>
      </div>
    </div>
  );
}

const inp = "w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-teal-500 focus:border-teal-500 outline-none";
const lbl = "block text-xs font-semibold text-gray-600 mb-1";
const btnPrimary = "flex-1 px-4 py-2 bg-teal-600 text-white text-sm font-semibold rounded-lg hover:bg-teal-700 disabled:opacity-50";
const btnSecondary = "flex-1 px-4 py-2 border border-gray-200 text-gray-700 text-sm font-semibold rounded-lg hover:bg-gray-50";

/* ─────────────────────── modals ─────────────────────── */

function PersonalModal({ profile, onClose, onSave, saving }) {
  const [form, setForm] = useState({
    name: profile.user?.name || '',
    father_name: profile.staff?.father_name || '',
    blood_type: profile.staff?.blood_type || '',
  });
  return (
    <ModalShell title="Edit Personal Information" onClose={onClose}>
      <form onSubmit={(e) => { e.preventDefault(); onSave(form); }} className="space-y-3">
        <div>
          <label className={lbl}>Full Name</label>
          <input className={inp} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
        </div>
        <div>
          <label className={lbl}>Father's Name</label>
          <input className={inp} value={form.father_name} onChange={(e) => setForm({ ...form, father_name: e.target.value })} />
        </div>
        <div>
          <label className={lbl}>Blood Type</label>
          <Select2
            value={form.blood_type}
            onChange={(v) => setForm({ ...form, blood_type: v })}
            options={BLOOD_TYPES}
            placeholder="Select blood type…"
          />
        </div>
        <div className="flex gap-2 pt-2">
          <button type="button" className={btnSecondary} onClick={onClose}>Cancel</button>
          <button type="submit" className={btnPrimary} disabled={saving}>{saving ? 'Saving…' : 'Save'}</button>
        </div>
      </form>
    </ModalShell>
  );
}

function ContactModal({ profile, onClose, onSave, saving }) {
  const [form, setForm] = useState({
    email: profile.user?.email || '',
    phone: profile.user?.phone || '',
    whatsapp: profile.user?.whatsapp || '',
  });
  return (
    <ModalShell title="Edit Contact Information" onClose={onClose}>
      <form onSubmit={(e) => { e.preventDefault(); onSave(form); }} className="space-y-3">
        <div>
          <label className={lbl}>Email</label>
          <input type="email" className={inp} value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} required />
        </div>
        <div>
          <label className={lbl}>Phone</label>
          <input className={inp} value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
        </div>
        <div>
          <label className={lbl}>WhatsApp</label>
          <input className={inp} value={form.whatsapp} onChange={(e) => setForm({ ...form, whatsapp: e.target.value })} />
        </div>
        <div className="flex gap-2 pt-2">
          <button type="button" className={btnSecondary} onClick={onClose}>Cancel</button>
          <button type="submit" className={btnPrimary} disabled={saving}>{saving ? 'Saving…' : 'Save'}</button>
        </div>
      </form>
    </ModalShell>
  );
}

function EmploymentModal({ profile, onClose, onSave, saving }) {
  const [branches, setBranches] = useState([]);
  const [form, setForm] = useState({
    department: profile.staff?.department || '',
    role_title_en: profile.staff?.role_title_en || '',
    contract_type: profile.staff?.contract_type || '',
    status: profile.staff?.status || '',
    branch_id: profile.staff?.branch_id || '',
  });

  useEffect(() => {
    get('/branches/list').then(r => setBranches(r.data?.data || r.data || [])).catch(() => setBranches([]));
  }, []);

  return (
    <ModalShell title="Edit Employment (Admin)" onClose={onClose}>
      <form onSubmit={(e) => { e.preventDefault(); onSave(form); }} className="space-y-3">
        <div>
          <label className={lbl}>Department</label>
          <input className={inp} value={form.department} onChange={(e) => setForm({ ...form, department: e.target.value })} />
        </div>
        <div>
          <label className={lbl}>Branch</label>
          <Select2
            value={form.branch_id}
            onChange={(v) => setForm({ ...form, branch_id: v })}
            options={branches.map(b => ({ value: b.id, label: b.name }))}
            placeholder="Search branch…"
          />
        </div>
        <div>
          <label className={lbl}>Role / Position</label>
          <input className={inp} value={form.role_title_en} onChange={(e) => setForm({ ...form, role_title_en: e.target.value })} />
        </div>
        <div>
          <label className={lbl}>Contract Type</label>
          <Select2
            value={form.contract_type}
            onChange={(v) => setForm({ ...form, contract_type: v })}
            options={[
              { value: "full_time", label: "Full Time" },
              { value: "part_time", label: "Part Time" },
              { value: "contract", label: "Contract" },
              { value: "temporary", label: "Temporary" },
              { value: "internship", label: "Internship" },
            ]}
            placeholder="Select contract type…"
          />
        </div>
        <div>
          <label className={lbl}>Status</label>
          <Select2
            value={form.status}
            onChange={(v) => setForm({ ...form, status: v || "active" })}
            options={[
              { value: "active", label: "Active" },
              { value: "inactive", label: "Inactive" },
              { value: "on_leave", label: "On Leave" },
              { value: "suspended", label: "Suspended" },
              { value: "terminated", label: "Terminated" },
            ]}
            isClearable={false}
          />
        </div>
        <div className="flex gap-2 pt-2">
          <button type="button" className={btnSecondary} onClick={onClose}>Cancel</button>
          <button type="submit" className={btnPrimary} disabled={saving}>{saving ? 'Saving…' : 'Save'}</button>
        </div>
      </form>
    </ModalShell>
  );
}

function PasswordModal({ isAdmin, onClose, onSave, saving }) {
  const [form, setForm] = useState({ current_password: '', new_password: '', new_password_confirmation: '' });
  return (
    <ModalShell title="Change Password" onClose={onClose}>
      <form onSubmit={(e) => { e.preventDefault(); onSave(form); }} className="space-y-3">
        {!isAdmin && (
          <div>
            <label className={lbl}>Current Password</label>
            <input type="password" className={inp} value={form.current_password}
              onChange={(e) => setForm({ ...form, current_password: e.target.value })} required />
          </div>
        )}
        <div>
          <label className={lbl}>New Password</label>
          <input type="password" className={inp} value={form.new_password} minLength={6}
            onChange={(e) => setForm({ ...form, new_password: e.target.value })} required />
        </div>
        <div>
          <label className={lbl}>Confirm New Password</label>
          <input type="password" className={inp} value={form.new_password_confirmation} minLength={6}
            onChange={(e) => setForm({ ...form, new_password_confirmation: e.target.value })} required />
        </div>
        <div className="flex gap-2 pt-2">
          <button type="button" className={btnSecondary} onClick={onClose}>Cancel</button>
          <button type="submit" className={btnPrimary} disabled={saving}>{saving ? 'Saving…' : 'Update Password'}</button>
        </div>
      </form>
    </ModalShell>
  );
}
