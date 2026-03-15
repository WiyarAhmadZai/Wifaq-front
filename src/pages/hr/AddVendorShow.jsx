import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { get } from '../../api/axios';

const RATING_LABELS = { 1: 'Poor', 2: 'Fair', 3: 'Good', 4: 'Very Good', 5: 'Excellent' };

const DEMO = {
  1: { id: 1, name: 'ABC Supplies Ltd.', category: 'supplier', work_type: 'Office Supplies', contact: '+93 700 111 222', address: 'Street 1, District 3, Kabul', quality_rating: 4, price_rating: 3, deadline_rating: 5, response_rating: 4, payment_terms: 'Net 30', recommended_by: 'Finance Dept', date_engaged: '2025-06-15', notes: 'Reliable supplier for office and school supplies.', created_at: '2025-06-15' },
  2: { id: 2, name: 'Tech Solutions Co.', category: 'consultant', work_type: 'IT Services', contact: '+93 700 333 444', address: 'District 10, Kabul', quality_rating: 5, price_rating: 4, deadline_rating: 4, response_rating: 5, payment_terms: '50% upfront', recommended_by: 'IT Department', date_engaged: '2025-09-01', notes: 'Excellent IT support and hardware vendor.', created_at: '2025-09-01' },
  3: { id: 3, name: 'BuildRight Contractors', category: 'contractor', work_type: 'Construction', contact: '+93 700 555 666', address: 'Herat Main Road', quality_rating: 3, price_rating: 3, deadline_rating: 2, response_rating: 3, payment_terms: 'Milestone-based', recommended_by: 'Admin', date_engaged: '2025-03-20', notes: 'Construction and maintenance.', created_at: '2025-03-20' },
  4: { id: 4, name: 'EduBooks International', category: 'supplier', work_type: 'Textbooks', contact: '+93 700 777 888', address: 'Mazar-e-Sharif', quality_rating: 5, price_rating: 5, deadline_rating: 4, response_rating: 4, payment_terms: 'Net 60', recommended_by: 'Academic Dept', date_engaged: '2026-01-10', notes: 'Textbook and educational materials distributor.', created_at: '2026-01-10' },
};

export default function AddVendorShow() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [vendor, setVendor] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => { fetchVendor(); }, [id]);

  const fetchVendor = async () => {
    try {
      const res = await get(`/hr/vendors/${id}`);
      setVendor(res.data?.data || res.data);
    } catch { setVendor(DEMO[id] || DEMO[1]); }
    finally { setLoading(false); }
  };

  if (loading) return <div className="flex items-center justify-center py-24"><div className="w-8 h-8 border-2 border-teal-600 border-t-transparent rounded-full animate-spin" /></div>;
  if (!vendor) return <div className="flex items-center justify-center py-24"><p className="text-sm text-gray-400">Vendor not found</p></div>;

  const d = vendor;
  const ratings = [
    { label: 'Quality', value: d.quality_rating },
    { label: 'Price', value: d.price_rating },
    { label: 'Deadline', value: d.deadline_rating },
    { label: 'Response', value: d.response_rating },
  ];
  const avgRating = ratings.filter(r => r.value).length ? (ratings.reduce((s, r) => s + (Number(r.value) || 0), 0) / ratings.filter(r => r.value).length).toFixed(1) : '—';

  return (
    <div className="min-h-screen bg-gray-50/60">
      <div className="bg-teal-600 px-5 py-5">
        <div className="max-w-3xl mx-auto">
          <div className="flex items-center gap-3 mb-4">
            <button onClick={() => navigate('/hr/add-vendor')} className="p-2 bg-white/20 hover:bg-white/30 rounded-xl text-white transition-colors">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" /></svg>
            </button>
            <div className="flex-1">
              <h1 className="text-sm font-bold text-white">Vendor Details</h1>
              <p className="text-xs text-teal-100 mt-0.5">Viewing vendor record</p>
            </div>
            <button onClick={() => navigate(`/hr/add-vendor/edit/${id}`)}
              className="flex items-center gap-2 px-4 py-2 bg-white/20 hover:bg-white/30 text-white text-xs font-semibold rounded-xl transition-colors">
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
              Edit
            </button>
          </div>
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 bg-white/20 rounded-2xl flex items-center justify-center text-white text-xl font-black flex-shrink-0">{d.name.charAt(0)}</div>
            <div>
              <h2 className="text-lg font-black text-white">{d.name}</h2>
              <div className="flex items-center gap-2 mt-1">
                <span className="px-2.5 py-0.5 bg-white/20 text-white text-[11px] font-semibold rounded-full capitalize">{d.category}</span>
                <span className="px-2.5 py-0.5 bg-white/20 text-white text-[11px] font-semibold rounded-full">{d.work_type}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-4 py-6 space-y-4">
        {/* Stat Cards */}
        <div className="grid grid-cols-4 gap-3">
          {ratings.map(r => (
            <div key={r.label} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 text-center">
              <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider">{r.label}</p>
              <p className="text-2xl font-black text-teal-700 mt-1">{r.value || '—'}<span className="text-xs font-medium text-gray-400">/5</span></p>
              {r.value && <p className="text-[10px] text-teal-600 font-medium">{RATING_LABELS[r.value]}</p>}
            </div>
          ))}
        </div>

        {/* Basic Info */}
        <Section title="Basic Information" icon="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5">
          <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
            <Field label="Name" value={d.name} />
            <Field label="Category" value={d.category} />
            <Field label="Work Type" value={d.work_type} />
            <Field label="Recommended By" value={d.recommended_by} />
            <Field label="Date Engaged" value={d.date_engaged} />
            <Field label="Avg Rating" value={avgRating} />
          </div>
        </Section>

        {/* Contact */}
        <Section title="Contact & Address" icon="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label="Contact" value={d.contact} />
            <Field label="Address" value={d.address} />
          </div>
        </Section>

        {/* Ratings Detail */}
        <Section title="Performance Ratings" icon="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {ratings.map(r => (
              <div key={r.label} className="p-3 bg-gray-50 rounded-xl text-center">
                <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-1">{r.label}</p>
                <div className="flex justify-center gap-1 mb-1">
                  {[1, 2, 3, 4, 5].map(star => (
                    <svg key={star} className={`w-4 h-4 ${star <= (r.value || 0) ? 'text-teal-500' : 'text-gray-200'}`} fill="currentColor" viewBox="0 0 20 20">
                      <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                    </svg>
                  ))}
                </div>
                <p className="text-xs font-semibold text-gray-700">{r.value ? RATING_LABELS[r.value] : '—'}</p>
              </div>
            ))}
          </div>
        </Section>

        {/* Payment Terms & Notes */}
        <Section title="Payment & Notes" icon="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z">
          <div className="space-y-4">
            <Field label="Payment Terms" value={d.payment_terms} />
            <Field label="Notes" value={d.notes || 'No notes available.'} />
          </div>
        </Section>
      </div>
    </div>
  );
}

function Section({ title, icon, children }) {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
      <div className="px-5 py-4 bg-teal-50 border-b border-teal-100 flex items-center gap-3">
        <div className="w-9 h-9 bg-teal-600 rounded-xl flex items-center justify-center flex-shrink-0">
          <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={icon} /></svg>
        </div>
        <h3 className="text-sm font-bold text-gray-800">{title}</h3>
      </div>
      <div className="p-5">{children}</div>
    </div>
  );
}

function Field({ label, value }) {
  return (
    <div className="p-3 bg-gray-50 rounded-xl">
      <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-1">{label}</p>
      <p className="text-sm font-semibold text-gray-800 capitalize">{value || '—'}</p>
    </div>
  );
}
