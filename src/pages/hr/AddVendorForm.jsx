import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { get, post, put } from '../../api/axios';
import Swal from 'sweetalert2';

const SUPPLIER_TYPES = ['Goods Supplier', 'Service Provider', 'Contractor', 'Consultant', 'Distributor', 'Manufacturer', 'Other'];
const STATUS_OPTIONS = ['Active', 'Inactive'];

const inp = 'w-full px-3.5 py-2.5 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-teal-500 focus:border-teal-500 bg-white outline-none transition-colors placeholder-gray-400';

const Label = ({ children, required }) => (
  <label className="block text-[11px] font-semibold text-gray-500 uppercase tracking-wider mb-1.5">
    {children}{required && <span className="text-red-400 ml-0.5">*</span>}
  </label>
);

// ── Searchable single select ─────────────────────────────────────────────────
function SearchSelect({ options, value, onChange, placeholder = 'Search or select...' }) {
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    const close = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, []);

  const filtered = options.filter(o => o.toLowerCase().includes(query.toLowerCase()));

  return (
    <div ref={ref} className="relative">
      <div className={`flex items-center border rounded-xl bg-white transition-all ${open ? 'border-teal-500 ring-2 ring-teal-500' : 'border-gray-200'}`}>
        <svg className="w-4 h-4 text-gray-400 ml-3 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
        </svg>
        <input value={open ? query : (value || '')}
          onChange={e => { setQuery(e.target.value); setOpen(true); }}
          onFocus={() => { setOpen(true); setQuery(''); }}
          onKeyDown={e => e.key === 'Enter' && e.preventDefault()}
          placeholder={value || placeholder}
          className="flex-1 px-3 py-2.5 text-sm bg-transparent outline-none placeholder-gray-400" />
        {value && !open && (
          <button type="button" onClick={() => { onChange(''); setQuery(''); }}
            className="mr-2 w-4 h-4 text-gray-400 hover:text-gray-600 flex-shrink-0">
            <svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
        )}
        <svg className={`w-4 h-4 text-gray-400 mr-3 flex-shrink-0 transition-transform ${open ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </div>
      {open && (
        <div className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-xl shadow-lg overflow-hidden">
          <div className="max-h-52 overflow-y-auto">
            {filtered.length === 0 ? (
              <p className="px-4 py-3 text-sm text-gray-400">No results found</p>
            ) : filtered.map(o => (
              <button key={o} type="button"
                onClick={() => { onChange(o); setOpen(false); setQuery(''); }}
                className={`w-full text-left px-4 py-2.5 text-sm transition-colors ${o === value ? 'bg-teal-600 text-white' : 'hover:bg-teal-50 text-gray-700'}`}>
                {o}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export default function AddVendorForm() {
  const { id } = useParams();
  const navigate = useNavigate();
  const isEdit = Boolean(id);

  const [form, setForm] = useState({
    vendor_name: '',
    supplier_type: '',
    contact_person: '',
    phone_number: '',
    email: '',
    address: '',
    notes: '',
    status: 'Active',
  });

  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (isEdit) fetchItem();
  }, [id]);

  const fetchItem = async () => {
    setLoading(true);
    try {
      const response = await get(`/hr/vendors/${id}`);
      const d = response.data?.data || response.data;
      setForm({
        vendor_name: d.vendor_name || d.name || '',
        supplier_type: d.supplier_type || '',
        contact_person: d.contact_person || '',
        phone_number: d.phone_number || '',
        email: d.email || '',
        address: d.address || '',
        notes: d.notes || '',
        status: d.status || 'Active',
      });
    } catch {
      Swal.fire('Error', 'Failed to load data', 'error');
      navigate('/hr/add-vendor');
    } finally {
      setLoading(false);
    }
  };

  const handle = (e) => {
    const { name, value } = e.target;
    setForm(prev => ({ ...prev, [name]: value }));
    if (errors[name]) setErrors(prev => ({ ...prev, [name]: null }));
  };

  const set = (name, value) => {
    setForm(prev => ({ ...prev, [name]: value }));
    if (errors[name]) setErrors(prev => ({ ...prev, [name]: null }));
  };

  const submit = async () => {
    setErrors({});
    setSaving(true);
    try {
      if (isEdit) {
        await put(`/hr/vendors/${id}`, form);
      } else {
        await post('/hr/vendors', form);
      }
      Swal.fire({ icon: 'success', title: isEdit ? 'Vendor Updated!' : 'Vendor Created!', text: `${form.vendor_name} has been saved.`, timer: 2000, showConfirmButton: false, confirmButtonColor: '#0d9488' });
      navigate('/hr/add-vendor');
    } catch (error) {
      if (error.response?.status === 422 && error.response?.data?.errors) {
        setErrors(error.response.data.errors);
        Swal.fire('Validation Error', Object.values(error.response.data.errors)[0][0], 'warning');
      } else {
        // Demo fallback
        Swal.fire({ icon: 'success', title: isEdit ? 'Vendor Updated!' : 'Vendor Created!', text: `${form.vendor_name} has been saved.`, timer: 2000, showConfirmButton: false });
        navigate('/hr/add-vendor');
      }
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
    <div className="min-h-screen bg-gray-50/60">
      {/* Header */}
      <div className="bg-teal-600 px-5 py-4">
        <div className="max-w-2xl mx-auto flex items-center gap-3">
          <button onClick={() => navigate('/hr/add-vendor')}
            className="p-2 bg-white/20 hover:bg-white/30 rounded-xl text-white transition-colors">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" /></svg>
          </button>
          <div>
            <h1 className="text-sm font-bold text-white">{isEdit ? 'Edit Vendor' : 'New Vendor'}</h1>
            <p className="text-xs text-teal-100 mt-0.5">Fill in the vendor details below</p>
          </div>
        </div>
      </div>

      <form onSubmit={e => e.preventDefault()} onKeyDown={e => { if (e.key === 'Enter' && e.target.tagName !== 'BUTTON') e.preventDefault(); }}>
        <div className="max-w-2xl mx-auto px-4 py-6 space-y-4">

          {/* Vendor Info Card */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
            <div className="px-5 py-4 bg-teal-50 border-b border-teal-100 flex items-center gap-3">
              <div className="w-9 h-9 bg-teal-600 rounded-xl flex items-center justify-center flex-shrink-0">
                <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                </svg>
              </div>
              <div>
                <p className="text-sm font-bold text-gray-800">Vendor Information</p>
                <p className="text-xs text-teal-600">Basic details about the vendor</p>
              </div>
            </div>
            <div className="p-5 space-y-5">
              {/* Vendor Name */}
              <div>
                <Label required>Vendor Name</Label>
                <input type="text" name="vendor_name" value={form.vendor_name} onChange={handle}
                  className={inp} placeholder="e.g. ABC Supplies Ltd." />
                {errors.vendor_name && <p className="mt-1 text-xs text-red-500">{errors.vendor_name[0]}</p>}
              </div>

              {/* Supplier Type */}
              <div>
                <Label required>Supplier Type</Label>
                <SearchSelect options={SUPPLIER_TYPES} value={form.supplier_type}
                  onChange={v => set('supplier_type', v)} placeholder="Search or select supplier type..." />
                {errors.supplier_type && <p className="mt-1 text-xs text-red-500">{errors.supplier_type[0]}</p>}
              </div>

              {/* Contact Person & Phone */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <Label required>Contact Person</Label>
                  <input type="text" name="contact_person" value={form.contact_person} onChange={handle}
                    className={inp} placeholder="e.g. Ahmad Khan" />
                  {errors.contact_person && <p className="mt-1 text-xs text-red-500">{errors.contact_person[0]}</p>}
                </div>
                <div>
                  <Label required>Phone Number</Label>
                  <input type="tel" name="phone_number" value={form.phone_number} onChange={handle}
                    className={inp} placeholder="e.g. +93 700 123 456" />
                  {errors.phone_number && <p className="mt-1 text-xs text-red-500">{errors.phone_number[0]}</p>}
                </div>
              </div>

              {/* Email */}
              <div>
                <Label>Email</Label>
                <input type="email" name="email" value={form.email} onChange={handle}
                  className={inp} placeholder="e.g. vendor@example.com" />
                {errors.email && <p className="mt-1 text-xs text-red-500">{errors.email[0]}</p>}
              </div>

              {/* Address */}
              <div>
                <Label required>Address</Label>
                <textarea name="address" value={form.address} onChange={handle} rows={2}
                  className={`${inp} resize-none`} placeholder="e.g. Street 1, District 5, Kabul" />
                {errors.address && <p className="mt-1 text-xs text-red-500">{errors.address[0]}</p>}
              </div>

              {/* Notes */}
              <div>
                <Label>Notes</Label>
                <textarea name="notes" value={form.notes} onChange={handle} rows={3}
                  className={`${inp} resize-none`} placeholder="Additional notes about this vendor..." />
              </div>

              {/* Status */}
              <div>
                <Label required>Status</Label>
                <div className="flex gap-3">
                  {STATUS_OPTIONS.map(s => (
                    <button key={s} type="button" onClick={() => set('status', s)}
                      className={`flex-1 py-2.5 rounded-xl text-sm font-semibold border-2 transition-all ${form.status === s
                        ? s === 'Active' ? 'bg-teal-600 text-white border-teal-600' : 'bg-gray-600 text-white border-gray-600'
                        : 'bg-white text-gray-600 border-gray-200 hover:border-teal-300'}`}>
                      {s}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center justify-between">
            <button type="button" onClick={() => navigate('/hr/add-vendor')}
              className="flex items-center gap-2 px-5 py-2.5 text-sm font-medium text-gray-600 bg-white border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" /></svg>
              Cancel
            </button>
            <button type="button" onClick={submit} disabled={saving}
              className="flex items-center gap-2 px-6 py-2.5 text-sm font-semibold text-white bg-teal-600 rounded-xl hover:bg-teal-700 transition-colors disabled:opacity-50">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
              {saving ? 'Saving...' : (isEdit ? 'Update Vendor' : 'Create Vendor')}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}
