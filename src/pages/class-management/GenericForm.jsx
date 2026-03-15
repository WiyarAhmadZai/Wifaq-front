import { useState } from 'react';
export default function GenericForm({ title, subtitle, fields, onSubmit, backUrl }) {
  const navigate = useNavigate();
  const { id } = useParams();
  const isEdit = !!id;
  const [formData, setFormData] = useState({});
  const [submitting, setSubmitting] = useState(false);

  const handleInputChange = (e) => { const { name, value } = e.target; setFormData(prev => ({ ...prev, [name]: value })); };
  const handleSubmit = async (e) => { e.preventDefault(); setSubmitting(true); setTimeout(() => { Swal.fire('Success', `Record ${isEdit ? 'updated' : 'created'} successfully`, 'success'); navigate(backUrl); setSubmitting(false); }, 500); };

  return (
    <div className="px-4 py-4">
      <div className="flex items-center gap-3 mb-6">
        <button onClick={() => navigate(backUrl)} className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"><svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" /></svg></button>
        <div><h2 className="text-xl font-bold text-gray-800">{isEdit ? `Edit ${title}` : `Add New ${title}`}</h2><p className="text-sm text-gray-500">{isEdit ? `Update ${subtitle.toLowerCase()} details` : `Create a new ${subtitle.toLowerCase()}`}</p></div>
      </div>
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {fields.map((field, idx) => (
              <div key={idx}>
                <label className="block text-sm font-medium text-gray-700 mb-2">{field.label}{field.required && <span className="text-red-500">*</span>}</label>
                {field.type === 'textarea' ? (<textarea name={field.name} onChange={handleInputChange} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500" rows="3"></textarea>) : field.type === 'select' ? (<select name={field.name} onChange={handleInputChange} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500"><option value="">Select {field.label}</option>{field.options?.map((opt, i) => (<option key={i} value={opt.value}>{opt.label}</option>))}</select>) : (<input type={field.type || 'text'} name={field.name} onChange={handleInputChange} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500" placeholder={field.placeholder} required={field.required} />)}
              </div>
            ))}
          </div>
          <div className="flex justify-end gap-3 pt-6 border-t">
            <button type="button" onClick={() => navigate(backUrl)} className="px-4 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition-colors font-medium">Cancel</button>
            <button type="submit" disabled={submitting} className="px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 transition-colors font-medium disabled:opacity-50 flex items-center gap-2"><svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>{submitting ? (isEdit ? 'Updating...' : 'Creating...') : (isEdit ? `Update ${title}` : `Create ${title}`)}</button>
          </div>
        </form>
      </div>
    </div>
  );
}