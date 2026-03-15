import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { get } from '../../api/axios';

const DEMO_VENDORS = {
  1: { id: 1, vendor_name: 'ABC Supplies Ltd.', supplier_type: 'Goods Supplier', contact_person: 'Ahmad Khan', phone_number: '+93 700 111 222', email: 'ahmad@abc.com', address: 'Street 1, District 3, Kabul, Afghanistan', notes: 'Reliable supplier for office and school supplies. Delivers on time.', status: 'Active', created_at: '2026-01-15' },
  2: { id: 2, vendor_name: 'Tech Solutions Co.', supplier_type: 'Service Provider', contact_person: 'Fatima Noori', phone_number: '+93 700 333 444', email: 'fatima@tech.com', address: 'District 10, Kabul', notes: 'IT support and hardware vendor.', status: 'Active', created_at: '2026-02-01' },
  3: { id: 3, vendor_name: 'BuildRight Contractors', supplier_type: 'Contractor', contact_person: 'Noor Ahmad', phone_number: '+93 700 555 666', email: 'noor@buildright.com', address: 'Herat Main Road', notes: 'Construction and maintenance contractor.', status: 'Inactive', created_at: '2025-11-20' },
  4: { id: 4, vendor_name: 'EduBooks International', supplier_type: 'Distributor', contact_person: 'Maryam Sultani', phone_number: '+93 700 777 888', email: 'maryam@edubooks.com', address: 'Mazar-e-Sharif', notes: 'Textbook and educational materials distributor.', status: 'Active', created_at: '2026-01-10' },
  5: { id: 5, vendor_name: 'Clean Pro Services', supplier_type: 'Service Provider', contact_person: 'Khalid Rasooli', phone_number: '+93 700 999 000', email: 'khalid@cleanpro.com', address: 'Jalalabad City', notes: 'Cleaning and janitorial services.', status: 'Active', created_at: '2026-03-01' },
};

export default function AddVendorShow() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [vendor, setVendor] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchVendor();
  }, [id]);

  const fetchVendor = async () => {
    try {
      const response = await get(`/hr/vendors/${id}`);
      setVendor(response.data?.data || response.data);
    } catch {
      // Use demo data
      setVendor(DEMO_VENDORS[id] || DEMO_VENDORS[1]);
    } finally {
      setLoading(false);
    }
  };

  if (loading) return (
    <div className="flex items-center justify-center py-24">
      <div className="w-8 h-8 border-2 border-teal-600 border-t-transparent rounded-full animate-spin" />
    </div>
  );

  if (!vendor) return (
    <div className="flex items-center justify-center py-24">
      <p className="text-sm text-gray-400">Vendor not found</p>
    </div>
  );

  const name = vendor.vendor_name || vendor.name || 'Vendor';
  const isActive = (vendor.status || '').toLowerCase() === 'active';

  return (
    <div className="min-h-screen bg-gray-50/60">
      {/* Header */}
      <div className="bg-teal-600 px-5 py-5">
        <div className="max-w-3xl mx-auto">
          <div className="flex items-center gap-3 mb-4">
            <button onClick={() => navigate('/hr/add-vendor')}
              className="p-2 bg-white/20 hover:bg-white/30 rounded-xl text-white transition-colors">
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

          {/* Vendor name banner */}
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 bg-white/20 rounded-2xl flex items-center justify-center text-white text-xl font-black flex-shrink-0">
              {name.charAt(0)}
            </div>
            <div>
              <h2 className="text-lg font-black text-white">{name}</h2>
              <div className="flex items-center gap-2 mt-1">
                <span className="px-2.5 py-0.5 bg-white/20 text-white text-[11px] font-semibold rounded-full">
                  {vendor.supplier_type || '—'}
                </span>
                <span className={`px-2.5 py-0.5 text-[11px] font-semibold rounded-full ${isActive ? 'bg-white/30 text-white' : 'bg-red-400/30 text-white'}`}>
                  {vendor.status || 'N/A'}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-4 py-6 space-y-4">
        {/* Stat Cards */}
        <div className="grid grid-cols-3 gap-3">
          {[
            { label: 'Supplier Type', value: vendor.supplier_type || '—', icon: 'M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5' },
            { label: 'Status', value: vendor.status || '—', icon: 'M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z' },
            { label: 'Contact', value: vendor.contact_person || '—', icon: 'M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z' },
          ].map(s => (
            <div key={s.label} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 bg-teal-50 rounded-xl flex items-center justify-center flex-shrink-0">
                  <svg className="w-4 h-4 text-teal-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={s.icon} /></svg>
                </div>
                <div>
                  <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider">{s.label}</p>
                  <p className="text-sm font-bold text-gray-800 truncate">{s.value}</p>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Contact Information */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="px-5 py-4 bg-teal-50 border-b border-teal-100 flex items-center gap-3">
            <div className="w-9 h-9 bg-teal-600 rounded-xl flex items-center justify-center flex-shrink-0">
              <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" /></svg>
            </div>
            <div>
              <p className="text-sm font-bold text-gray-800">Contact Information</p>
              <p className="text-xs text-teal-600">Phone, email & address</p>
            </div>
          </div>
          <div className="p-5">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {[
                { label: 'Contact Person', value: vendor.contact_person },
                { label: 'Phone Number', value: vendor.phone_number },
                { label: 'Email', value: vendor.email },
                { label: 'Supplier Type', value: vendor.supplier_type },
              ].map(f => (
                <div key={f.label} className="p-3 bg-gray-50 rounded-xl">
                  <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-1">{f.label}</p>
                  <p className="text-sm font-semibold text-gray-800">{f.value || '—'}</p>
                </div>
              ))}
            </div>
            <div className="mt-4 p-3 bg-gray-50 rounded-xl">
              <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-1">Address</p>
              <p className="text-sm font-semibold text-gray-800">{vendor.address || '—'}</p>
            </div>
          </div>
        </div>

        {/* Notes */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="px-5 py-4 bg-teal-50 border-b border-teal-100 flex items-center gap-3">
            <div className="w-9 h-9 bg-teal-600 rounded-xl flex items-center justify-center flex-shrink-0">
              <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
            </div>
            <div>
              <p className="text-sm font-bold text-gray-800">Notes</p>
              <p className="text-xs text-teal-600">Additional information</p>
            </div>
          </div>
          <div className="p-5">
            <p className="text-sm text-gray-700 leading-relaxed">{vendor.notes || 'No notes available.'}</p>
          </div>
        </div>
      </div>
    </div>
  );
}
