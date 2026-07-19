import { useState, useEffect } from 'react';
import { useNavigate, useParams } from "react-router-dom";
import { get, put, post, del, peekCache } from '../api/axios';
import { useAuth } from '../admin/context/AuthContext';
import Swal from 'sweetalert2';
import Select2 from '../components/hr/Select2';
import { fmtDate } from '../utils/formErrors';
import { listDepartments } from '../api/departments';

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
  const [showReminders, setShowReminders] = useState(false);

  const isAdmin = hasRole('super-admin') || hasRole('admin');

  useEffect(() => { fetchProfile(); }, [userId]);

  const fetchProfile = async () => {
    setLoading(true);
    const __endpoint = userId ? `/profile/${userId}` : '/profile';
    const __cached = peekCache(__endpoint);
    if (__cached?.data) { setProfile(__cached.data); setLoading(false); }
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

  // Three viewing modes:
  //   isSelf       → owner viewing their own profile (full edit)
  //   isAdminView  → admin / super-admin / hr-manager viewing any profile (full read, edit admin fields)
  //   isPublicView → any other authenticated user (read-only, public sections only)
  const isSelf       = !!profile.is_self;
  const isAdminView  = !!profile.is_admin_viewer;
  const isPublicView = !isSelf && !isAdminView;
  const canSeePrivate = isSelf || isAdminView;

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
              <h1 className="text-sm font-bold text-white">
                {isSelf ? "My Profile" : isAdminView ? "User Profile" : `${u.name?.split(' ')[0] || 'User'}'s Profile`}
              </h1>
            </div>
            <div className="flex items-center gap-2">
              {isSelf && (
                <button
                  onClick={() => setShowReminders(true)}
                  className="px-3 py-1.5 bg-amber-400 text-amber-900 text-xs font-semibold rounded-lg hover:bg-amber-300 transition-colors flex items-center gap-1.5"
                  title="Set personal reminders for your meetings, events, and tasks"
                >
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" /></svg>
                  Reminders
                </button>
              )}
              {(isSelf || isAdminView) && (
                <button
                  onClick={() => setShowPassword(true)}
                  className="px-3 py-1.5 bg-white text-teal-600 text-xs font-semibold rounded-lg hover:bg-gray-100 transition-colors flex items-center gap-1.5"
                >
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" /></svg>
                  Change Password
                </button>
              )}
            </div>
          </div>

          <div className="flex items-center gap-4">
            <div className="relative">
              <div className="w-16 h-16 rounded-2xl flex items-center justify-center text-white text-2xl font-black overflow-hidden bg-white/20">
                {photoUrl ? <img src={photoUrl} alt={u.name} className="w-full h-full object-cover" /> : (u.name?.charAt(0) || 'U')}
              </div>
              {isSelf && (
                <>
                  <button onClick={() => document.getElementById('profile-photo-upload').click()}
                    disabled={saving}
                    className="absolute bottom-0 right-0 w-6 h-6 bg-teal-600 rounded-full flex items-center justify-center text-white hover:bg-teal-700 transition-colors shadow-lg disabled:opacity-50"
                    title="Update profile photo">
                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                  </button>
                  <input id="profile-photo-upload" type="file" accept="image/*"
                    onChange={(e) => uploadPhoto(e.target.files[0])} className="hidden" />
                </>
              )}
            </div>
            <div className="flex-1">
              <h2 className="text-lg font-black text-white">{u.name || 'N/A'}</h2>
              <p className="text-xs text-teal-100 mt-0.5">
                {s.role_title_en || (profile.type === 'user' ? 'User' : profile.type)}
                {s.department && ` · ${s.department}`}
              </p>
              <div className="flex items-center gap-2 mt-2 flex-wrap">
                {s.employee_id && <span className="px-2.5 py-0.5 bg-white/20 text-white text-[11px] font-semibold rounded-full">{s.employee_id}</span>}
                {canSeePrivate && (
                  <span className="px-2.5 py-0.5 bg-white/20 text-white text-[11px] font-semibold rounded-full">{u.email}</span>
                )}
                {s.status && <span className="px-2.5 py-0.5 bg-white/30 text-white text-[11px] font-semibold rounded-full capitalize">{s.status}</span>}
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-full mx-auto px-4 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <div className="lg:col-span-2 space-y-4">
            {/* Public-viewer banner */}
            {isPublicView && (
              <div className="bg-teal-50 border border-teal-200 rounded-2xl p-3 flex items-center gap-2.5">
                <svg className="w-4 h-4 text-teal-700 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" /></svg>
                <p className="text-[11px] text-teal-800">
                  You're viewing the public part of {u.name?.split(' ')[0] || 'this user'}'s profile. Personal details remain private.
                </p>
              </div>
            )}

            {/* Personal — private */}
            {canSeePrivate && (
              <Section
                title="Personal Information"
                icon="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
                onEdit={() => setShowPersonal(true)}
                editable={isSelf || isAdminView}
              >
                <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
                  <Field label="Full Name" value={u.name} />
                  <Field label="Username" value={u.username} />
                  <Field label="Father's Name" value={s.father_name} />
                  <Field label="Date of Birth" value={fmtDate(a.date_of_birth)} />
                  <Field label="Blood Type" value={s.blood_type} />
                  <Field label="Place of Origin" value={a.place_of_origin} />
                </div>
              </Section>
            )}

            {/* Contact — private */}
            {canSeePrivate && (
              <Section
                title="Contact Information"
                icon="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z"
                onEdit={() => setShowContact(true)}
                editable={isSelf || isAdminView}
              >
                <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
                  <Field label="Email" value={u.email} />
                  <Field label="Phone" value={u.phone} />
                  <Field label="WhatsApp" value={u.whatsapp} />
                  <Field label="Current Address" value={a.current_address} className="col-span-2 lg:col-span-3" />
                </div>
              </Section>
            )}

            {/* Education — semi-public; visible to everyone (it's institutional context) */}
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

            {/* Self-profile — the staff's own public narrative; editable only by the owner */}
            {profile.type === 'staff' && <SelfProfileSection canEdit={isSelf} initialData={profile.self_profile} />}

            {/* Annual leave usage from the contract (single progress bar) */}
            {profile.type === 'staff' && (isSelf || isAdminView) && s.leave_balance && (
              <AnnualLeaveUsageCard balance={s.leave_balance} />
            )}

            {/* Leave balance — private (own only) */}
            {profile.type === 'staff' && isSelf && <LeaveBalanceSection />}

            {/* My leave requests — private (own only) */}
            {profile.type === 'staff' && isSelf && <MyLeaveRequestsSection />}

            {/* Cards received — public recognition, visible to everyone who can open the profile */}
            {profile.type === 'staff' && <MyCardsSection cards={profile.cards || []} />}
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
              'staff_data.department_id': form.department_id || null,
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

      {showReminders && (
        <RemindersModal onClose={() => setShowReminders(false)} />
      )}
    </div>
  );
}

/* ─────────────── Self-profile (skills, dreams, growth) ─────────────── */

function SelfProfileSection({ canEdit = true, initialData = null }) {
  const [data, setData] = useState(initialData);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);

  // Owners fetch from /self-profile (own); viewers receive the data via prop.
  useEffect(() => {
    if (initialData) { setData(initialData); return; }
    if (!canEdit) { setData({}); return; }
    load();
  }, [initialData, canEdit]);

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
  // Hide the whole section in public-view mode when the staff hasn't written anything.
  const hasContent = data && (data.education || (data.languages || []).length || data.previous_experience
    || (data.skills || []).length || (data.certifications || []).length
    || data.strengths || data.growth_areas || data.aspirations);
  if (!canEdit && !hasContent) return null;

  return (
    <Section
      title={canEdit ? "My Story (Self-Profile)" : "Their Story"}
      icon="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"
    >
      <div className="flex justify-between items-center mb-4">
        <span className="text-xs text-gray-500">
          {canEdit
            ? "Tell us who you are and where you want to grow. The appraiser sees this every year."
            : "What they've chosen to share about themselves."}
        </span>
        {canEdit && (
          <button onClick={() => setEditing(true)}
            className="px-3 py-1 bg-teal-600 text-white text-xs font-semibold rounded-lg hover:bg-teal-700">
            Edit
          </button>
        )}
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

/* ─────────────── My cards (VATS — Gold / Turquoise / Green / Yellow / Red) ─────────────── */

/**
 * Tier identity is shown through the emoji and the tier name. Backgrounds use
 * the system's branded teal palette only (positive) plus a single muted amber
 * accent for concern cards. No rainbow, no gradients.
 */
const CARD_THEMES = {
  gold:      { emoji: "🥇", label: "Gold",      tone: "Excellence",     positive: true },
  turquoise: { emoji: "💎", label: "Turquoise", tone: "Character",      positive: true },
  green:     { emoji: "🟢", label: "Green",     tone: "Performance",    positive: true },
  yellow:    { emoji: "🟡", label: "Yellow",    tone: "Formal concern", positive: false },
  red:       { emoji: "🔴", label: "Red",       tone: "Serious",        positive: false },
};

function MyCardsSection({ cards: cardsProp = null }) {
  const navigate = useNavigate();
  // Cards arrive as a prop from the profile payload. Fall back to a fetch
  // only if the caller didn't pass them (defensive — should never happen).
  const [cards, setCards] = useState(cardsProp || []);
  const [loading, setLoading] = useState(cardsProp === null);

  useEffect(() => {
    if (cardsProp !== null) { setCards(cardsProp); setLoading(false); return; }
    get('/vats/cards')
      .then((r) => setCards(r.data?.data || []))
      .catch(() => setCards([]))
      .finally(() => setLoading(false));
  }, [cardsProp]);

  const counts = cards.reduce((acc, c) => { acc[c.color] = (acc[c.color] || 0) + 1; return acc; }, {});
  const positiveTotal = ['gold', 'turquoise', 'green'].reduce((s, k) => s + (counts[k] || 0), 0);
  const concernTotal  = ['yellow', 'red'].reduce((s, k) => s + (counts[k] || 0), 0);
  const total = positiveTotal + concernTotal;

  return (
    <Section
      title="Cards Received"
      icon="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z"
    >
      <div className="flex items-center justify-between mb-3">
        <span className="text-xs text-gray-500">A summary of every card you've received.</span>
        {total > 0 && (
          <button onClick={() => navigate('/hr/vats/cards')}
            className="text-[11px] font-semibold text-teal-700 hover:underline flex items-center gap-1">
            View all
            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5l7 7-7 7" />
            </svg>
          </button>
        )}
      </div>

      {loading ? (
        <div className="text-center py-4 text-xs text-gray-400">Loading…</div>
      ) : total === 0 ? (
        <div className="text-center py-6 px-4 bg-gray-50 rounded-xl">
          <span className="text-3xl">🎴</span>
          <p className="text-xs text-gray-500 mt-2 max-w-sm mx-auto">
            You haven't received any cards yet. Cards are awarded when your work shows a clear, sustained pattern — keep doing your best.
          </p>
        </div>
      ) : (
        <>
          {/* Per-tier count strip (the only on-profile detail) */}
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 mb-3">
            {Object.entries(CARD_THEMES).map(([color, theme]) => {
              const n = counts[color] || 0;
              const has = n > 0;
              return (
                <div key={color}
                  className={`rounded-xl p-3 text-center border ${
                    has
                      ? theme.positive ? "bg-teal-50 border-teal-200" : "bg-amber-50 border-amber-200"
                      : "bg-gray-50 border-gray-100"
                  }`}>
                  <p className={`text-2xl ${has ? "" : "opacity-40 grayscale"}`}>{theme.emoji}</p>
                  <p className={`text-lg font-black mt-0.5 ${
                    has ? (theme.positive ? "text-teal-800" : "text-amber-800") : "text-gray-400"
                  }`}>{n}</p>
                  <p className="text-[9px] uppercase tracking-wider font-bold text-gray-500 mt-0.5">{theme.label}</p>
                </div>
              );
            })}
          </div>

          {/* Compact totals + CTA */}
          <div className="bg-gradient-to-r from-teal-50 to-emerald-50 border border-teal-100 rounded-xl px-4 py-3 flex items-center justify-between gap-3">
            <p className="text-xs text-teal-800">
              <span className="font-bold">{total}</span> total ·
              <span className="font-bold text-teal-700"> {positiveTotal} recognition</span> ·
              <span className="font-bold text-amber-700"> {concernTotal} concern</span>
            </p>
            <button onClick={() => navigate('/hr/vats/cards')}
              className="text-xs font-semibold text-white bg-teal-600 hover:bg-teal-700 px-3 py-1.5 rounded-lg shadow-sm whitespace-nowrap">
              See all cards →
            </button>
          </div>
        </>
      )}
    </Section>
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

/* ─────────────── Annual leave usage progress bar (from contract) ─────────────── */
function AnnualLeaveUsageCard({ balance }) {
  const allowance     = Number(balance?.allowance_days || 0);
  const used          = Number(balance?.used_days || 0);
  const remaining     = Number(balance?.remaining_days || 0);
  const overBy        = Number(balance?.over_by_days || 0);
  const isOver        = !!balance?.is_over;
  const isConfigured  = balance?.is_configured ?? allowance > 0;
  const percent       = Number(balance?.percent_used || 0);
  const cards         = Number(balance?.yellow_cards_issued || 0);
  const approvedCount = Number(balance?.approved_count || 0);
  const year          = balance?.year || new Date().getFullYear();

  // Color hierarchy: blue for unconfigured, green < 60 %, amber < 90 %, red ≥ 90 % or over.
  const tone = !isConfigured
    ? { bar: "bg-blue-400",  chip: "bg-blue-50 text-blue-700 ring-blue-200" }
    : isOver || percent >= 90
      ? { bar: "bg-red-500",    chip: "bg-red-50 text-red-700 ring-red-200" }
      : percent >= 60
        ? { bar: "bg-amber-500", chip: "bg-amber-50 text-amber-700 ring-amber-200" }
        : { bar: "bg-emerald-500", chip: "bg-emerald-50 text-emerald-700 ring-emerald-200" };

  return (
    <Section
      title={`Annual Leave Usage · ${year}`}
      icon="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
      locked
      lockMessage="From contract"
    >
      <div className="space-y-3">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-2xl font-black text-gray-800 leading-none">
              {used}<span className="text-gray-400 font-bold text-lg"> / {isConfigured ? allowance : "—"}</span>
              <span className="text-[11px] font-semibold text-gray-500 ml-1.5">days</span>
            </p>
            <p className="text-[10px] text-gray-500 mt-1">
              {isConfigured ? (
                <>
                  Calculation: <strong>{allowance}</strong> total − <strong>{used}</strong> used = <strong>{remaining}</strong> remaining
                  {isOver && <span className="text-red-600 font-bold"> · over by {overBy} day{overBy === 1 ? "" : "s"}</span>}
                </>
              ) : (
                <>{approvedCount} approved request{approvedCount === 1 ? "" : "s"} this year</>
              )}
            </p>
          </div>
          {isConfigured && (
            <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-1 rounded-full ring-1 ${tone.chip}`}>
              {percent}% used
            </span>
          )}
          {!isConfigured && (
            <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-1 rounded-full ring-1 ${tone.chip}`}>
              Not configured
            </span>
          )}
        </div>

        <div className="h-2.5 bg-gray-100 rounded-full overflow-hidden">
          <div
            className={`h-full ${tone.bar} transition-all duration-500`}
            style={{ width: `${Math.min(100, percent)}%` }}
          />
        </div>

        {/* Three-up breakdown so the user instantly sees used, remaining,
            and total numbers without having to do the math. */}
        <div className="grid grid-cols-3 gap-2">
          <div className="rounded-lg bg-teal-50 ring-1 ring-teal-100 px-2 py-1.5 text-center">
            <p className="text-[9px] font-bold uppercase tracking-wider text-teal-700">Used</p>
            <p className="text-lg font-black text-teal-800 leading-tight">{used}</p>
            <p className="text-[9px] text-teal-700">day{used === 1 ? "" : "s"}</p>
          </div>
          <div className={`rounded-lg ${isOver ? "bg-red-50 ring-red-100" : "bg-emerald-50 ring-emerald-100"} ring-1 px-2 py-1.5 text-center`}>
            <p className={`text-[9px] font-bold uppercase tracking-wider ${isOver ? "text-red-700" : "text-emerald-700"}`}>Remaining</p>
            <p className={`text-lg font-black leading-tight ${isOver ? "text-red-800" : "text-emerald-800"}`}>{isConfigured ? remaining : "—"}</p>
            <p className={`text-[9px] ${isOver ? "text-red-700" : "text-emerald-700"}`}>day{remaining === 1 ? "" : "s"}</p>
          </div>
          <div className="rounded-lg bg-gray-50 ring-1 ring-gray-100 px-2 py-1.5 text-center">
            <p className="text-[9px] font-bold uppercase tracking-wider text-gray-600">Total</p>
            <p className="text-lg font-black text-gray-800 leading-tight">{isConfigured ? allowance : "—"}</p>
            <p className="text-[9px] text-gray-600">day{allowance === 1 ? "" : "s"}</p>
          </div>
        </div>

        {/* Yellow card cadence — informational, derived from approved count. */}
        {cards > 0 && (
          <div className="flex items-center gap-2 bg-amber-50 border border-amber-200 rounded-lg px-2.5 py-1.5">
            <span className="text-base">🟡</span>
            <p className="text-[11px] text-amber-800">
              <strong>{cards}</strong> yellow card{cards === 1 ? "" : "s"} this year — policy threshold reached for every 8 approvals.
            </p>
          </div>
        )}

        {isOver && isConfigured && (
          <div className="flex items-start gap-2 bg-red-50 border border-red-200 rounded-lg px-2.5 py-2">
            <svg className="w-4 h-4 text-red-500 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-.833-2.694-.833-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            <p className="text-[11px] text-red-800">
              Annual allowance exceeded — HR has been notified. A VATS yellow card was auto-issued.
            </p>
          </div>
        )}

        {!isConfigured && (
          <div className="flex items-start gap-2 bg-blue-50 border border-blue-200 rounded-lg px-2.5 py-2">
            <svg className="w-4 h-4 text-blue-500 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <p className="text-[11px] text-blue-800">
              No annual leave allowance set yet. HR will assign one when your active contract is created.
              Until then, usage is tracked but no over-allowance card is issued.
            </p>
          </div>
        )}
      </div>
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
  const [departments, setDepartments] = useState([]);
  const [form, setForm] = useState({
    department: profile.staff?.department || '',
    department_id: profile.staff?.department_id || '',
    role_title_en: profile.staff?.role_title_en || '',
    contract_type: profile.staff?.contract_type || '',
    status: profile.staff?.status || '',
    branch_id: profile.staff?.branch_id || '',
  });

  useEffect(() => {
    get('/branches/list').then(r => setBranches(r.data?.data || r.data || [])).catch(() => setBranches([]));
    listDepartments({ active_only: 1 })
      .then(r => setDepartments(r.data?.data || r.data || []))
      .catch(() => setDepartments([]));
  }, []);

  return (
    <ModalShell title="Edit Employment (Admin)" onClose={onClose}>
      <form onSubmit={(e) => { e.preventDefault(); onSave(form); }} className="space-y-3">
        <div>
          <label className={lbl}>Department</label>
          <Select2
            value={form.department_id}
            onChange={(v) => setForm({ ...form, department_id: v })}
            options={departments.map(d => ({ value: d.id, label: d.name }))}
            placeholder="Search department…"
          />
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

/* ────────────────────────────────────────────────────────────────────
 *  Reminders Modal — set personal reminders for meetings, events,
 *  and assigned staff tasks. Backdrop click does NOT close.
 * ──────────────────────────────────────────────────────────────────── */

const LEAD_PRESETS = [
  { value: 15,   label: "15 min" },
  { value: 30,   label: "30 min" },
  { value: 60,   label: "1 hr" },
  { value: 120,  label: "2 hr" },
  { value: 180,  label: "3 hr" },
  { value: 360,  label: "6 hr" },
  { value: 720,  label: "12 hr" },
  { value: 1440, label: "1 day" },
];

function RemindersModal({ onClose }) {
  const [mine, setMine] = useState([]);
  const [available, setAvailable] = useState({ meetings: [], events: [], staff_tasks: [] });
  const [loading, setLoading] = useState(true);
  const [picked, setPicked] = useState(null);
  const [lead, setLead] = useState(60);
  const [customLead, setCustomLead] = useState("");
  const [label, setLabel] = useState("");
  const [saving, setSaving] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const [m, a] = await Promise.all([
        get('/me/reminders'),
        get('/me/reminders/available'),
      ]);
      setMine(m.data?.data || []);
      setAvailable(a.data?.data || { meetings: [], events: [], staff_tasks: [] });
    } catch {/* leave empty */} finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  const effectiveLead = (() => {
    const n = Number(customLead);
    if (customLead !== "" && !Number.isNaN(n) && n > 0) return Math.min(10080, Math.max(5, n));
    return lead;
  })();

  const reminderAt = picked?.deadline
    ? new Date(new Date(picked.deadline).getTime() - effectiveLead * 60_000)
    : null;
  const reminderInPast = reminderAt ? reminderAt.getTime() <= Date.now() : false;
  const itemAlreadyPast = picked?.deadline ? new Date(picked.deadline).getTime() <= Date.now() : false;

  const submit = async () => {
    if (!picked) return;
    if (itemAlreadyPast) {
      Swal.fire("Past", "This item is already past — a reminder cannot be set.", "warning");
      return;
    }
    if (reminderInPast) {
      Swal.fire("Too long", "The lead time you picked would fire in the past. Pick a shorter lead.", "warning");
      return;
    }
    setSaving(true);
    try {
      await post('/me/reminders', {
        subject_type: picked.type,
        subject_id: picked.id,
        lead_minutes: effectiveLead,
        label: label.trim() || undefined,
      });
      setPicked(null); setLabel(""); setCustomLead(""); setLead(60);
      load();
    } catch (err) {
      Swal.fire("Error", err.response?.data?.message || "Failed to set reminder", "error");
    } finally { setSaving(false); }
  };

  const removeOne = async (id) => {
    try { await del(`/me/reminders/${id}`); } catch {}
    load();
  };

  const totalAvailable =
    (available.meetings?.length || 0) +
    (available.events?.length || 0) +
    (available.staff_tasks?.length || 0);

  const fmtLead = (mins) => {
    if (mins >= 1440) return `${Math.round(mins / 1440)} day${mins >= 2880 ? 's' : ''}`;
    if (mins >= 60)   return `${Math.round(mins / 60 * 10) / 10} hr`;
    return `${mins} min`;
  };
  const fmtDT = (iso) => iso ? new Date(iso).toLocaleString() : '—';
  const typeBadge = (t) => {
    const map = {
      meeting:    { bg: 'bg-teal-100',   text: 'text-teal-700',   label: 'Meeting' },
      event:      { bg: 'bg-purple-100', text: 'text-purple-700', label: 'Event' },
      staff_task: { bg: 'bg-indigo-100', text: 'text-indigo-700', label: 'Task' },
    };
    const c = map[t] || { bg: 'bg-gray-100', text: 'text-gray-600', label: t };
    return <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold ${c.bg} ${c.text}`}>{c.label}</span>;
  };

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl max-w-3xl w-full max-h-[92vh] flex flex-col overflow-hidden">
        <div className="px-5 py-4 bg-gradient-to-r from-amber-500 to-amber-600 flex items-center justify-between">
          <div>
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" /></svg>
              My Reminders
            </h3>
            <p className="text-[11px] text-white/80 mt-0.5">
              Remind yourself before a meeting, event, or task you're assigned to.
            </p>
          </div>
          <button onClick={onClose} className="p-1.5 text-white/80 hover:text-white hover:bg-white/20 rounded-lg">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
        </div>

        <div className="px-5 py-4 border-b border-gray-100 max-h-[28vh] overflow-y-auto">
          <p className="text-[10px] font-bold uppercase tracking-wider text-gray-500 mb-2">
            Your reminders ({mine.length})
          </p>
          {loading ? (
            <p className="text-xs text-gray-400">Loading…</p>
          ) : mine.length === 0 ? (
            <p className="text-xs text-gray-400 italic">No reminders set yet.</p>
          ) : (
            <ul className="space-y-2">
              {mine.map((r) => (
                <li key={r.id} className="flex items-center gap-3 p-3 bg-amber-50/40 border border-amber-100 rounded-xl">
                  {typeBadge(r.subject_type)}
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold text-gray-800 truncate">{r.title}</p>
                    <p className="text-[10px] text-gray-500">
                      Fires at <b>{fmtDT(r.remind_at)}</b> · {fmtLead(r.lead_minutes)} before
                      {r.notified_at ? ' · already sent' : ''}
                    </p>
                  </div>
                  <button onClick={() => removeOne(r.id)} className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg" title="Remove">
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-wider text-gray-500 mb-2">
              Pick what to be reminded about
            </p>
            {loading ? (
              <p className="text-xs text-gray-400 italic">Loading your items…</p>
            ) : totalAvailable === 0 ? (
              <p className="text-xs text-gray-400 italic">
                You don't have any upcoming meetings, events, or assigned tasks with a future deadline.
              </p>
            ) : (
              <Select2
                value={picked ? `${picked.type}:${picked.id}` : null}
                onChange={(v) => {
                  if (!v) { setPicked(null); return; }
                  // Decode the composite key we use for option values.
                  const [type, idStr] = String(v).split(':');
                  const id = Number(idStr);
                  const lookup = {
                    meeting:    available.meetings,
                    event:      available.events,
                    staff_task: available.staff_tasks,
                  }[type] || [];
                  const item = lookup.find((x) => Number(x.id) === id);
                  if (item) setPicked({ ...item, type });
                }}
                placeholder="Search meetings, events, or tasks assigned to you…"
                options={[
                  ...(available.meetings || []).map((it) => ({
                    value: `meeting:${it.id}`,
                    label: `[Meeting] ${it.title} — ${fmtDT(it.deadline)}${it.subtitle ? ' · ' + it.subtitle : ''}`,
                  })),
                  ...(available.events || []).map((it) => ({
                    value: `event:${it.id}`,
                    label: `[Event] ${it.title} — ${fmtDT(it.deadline)}${it.subtitle ? ' · ' + it.subtitle : ''}`,
                  })),
                  ...(available.staff_tasks || []).map((it) => ({
                    value: `staff_task:${it.id}`,
                    label: `[Task] ${it.title} — Deadline ${fmtDT(it.deadline)}${it.subtitle ? ' · ' + it.subtitle : ''}`,
                  })),
                ]}
              />
            )}
          </div>

          {picked && (
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 space-y-3">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-wider text-amber-700 mb-1">Selected</p>
                <p className="text-xs font-semibold text-amber-900">{picked.title}</p>
                <p className="text-[10px] text-amber-700">Deadline / Start: {fmtDT(picked.deadline)}</p>
              </div>
              <div>
                <p className="text-[10px] font-bold uppercase tracking-wider text-amber-700 mb-1">How long before?</p>
                <div className="flex flex-wrap gap-1.5 mb-2">
                  {LEAD_PRESETS.map((p) => (
                    <button key={p.value} type="button"
                      onClick={() => { setLead(p.value); setCustomLead(""); }}
                      className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold border transition-colors ${(!customLead && lead === p.value) ? 'bg-amber-500 border-amber-500 text-white' : 'bg-white border-amber-200 text-amber-700 hover:bg-amber-100'}`}>
                      {p.label}
                    </button>
                  ))}
                </div>
                <div className="flex items-center gap-2">
                  <input type="number" min={5} max={10080} value={customLead}
                    onChange={(e) => setCustomLead(e.target.value)}
                    placeholder="Custom"
                    className="w-28 px-2.5 py-1.5 border border-amber-200 rounded-lg text-xs focus:ring-2 focus:ring-amber-300 focus:outline-none" />
                  <span className="text-[10px] text-amber-700">minutes before</span>
                </div>
              </div>
              <div>
                <p className="text-[10px] font-bold uppercase tracking-wider text-amber-700 mb-1">Optional note</p>
                <input type="text" value={label} onChange={(e) => setLabel(e.target.value)}
                  placeholder="e.g. Prepare the slides first"
                  className="w-full px-2.5 py-1.5 border border-amber-200 rounded-lg text-xs focus:ring-2 focus:ring-amber-300 focus:outline-none" />
              </div>
              <div className="text-[11px] text-amber-900">
                {itemAlreadyPast ? (
                  <span className="text-red-600 font-semibold">This item is already past — can't set a reminder.</span>
                ) : reminderInPast ? (
                  <span className="text-red-600 font-semibold">Lead time is too long — would fire in the past.</span>
                ) : (
                  <>Will fire at <b>{fmtDT(reminderAt?.toISOString())}</b> ({fmtLead(effectiveLead)} before).</>
                )}
              </div>
            </div>
          )}
        </div>

        <div className="px-5 py-3 bg-gray-50 border-t border-gray-100 flex justify-end gap-2">
          <button onClick={onClose} disabled={saving}
            className="px-4 py-2 text-xs font-semibold text-gray-600 bg-white border border-gray-200 rounded-xl hover:bg-gray-100 disabled:opacity-50">
            Close
          </button>
          <button onClick={submit}
            disabled={!picked || saving || itemAlreadyPast || reminderInPast}
            className="px-5 py-2 text-xs font-semibold text-white bg-amber-500 hover:bg-amber-600 rounded-xl disabled:opacity-50 flex items-center gap-2">
            {saving ? (
              <><div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>Saving…</>
            ) : (
              <>
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" /></svg>
                Set reminder
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
