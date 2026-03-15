import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { get, post, put } from '../api/axios';
import Swal from 'sweetalert2';

export default function CrudFormPage({ title, apiEndpoint, fields, listRoute }) {
  const { id } = useParams();
  const navigate = useNavigate();
  const isEdit = Boolean(id);
  const [formData, setFormData] = useState({});
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [selectOptions, setSelectOptions] = useState({});
  const [staffDetails, setStaffDetails] = useState(null);
  const [searchableFields, setSearchableFields] = useState({});

  useEffect(() => {
    if (isEdit) {
      fetchItem();
    } else {
      const defaults = {};
      fields.forEach(field => {
        if (field.defaultValue !== undefined) {
          defaults[field.name] = field.defaultValue;
        } else if (field.type === 'checkbox') {
          defaults[field.name] = false;
        } else if (field.type === 'number') {
          defaults[field.name] = '';
        } else {
          defaults[field.name] = '';
        }
      });
      setFormData(defaults);
    }
  }, [id]);

  useEffect(() => {
    // Fetch options for select fields
    const fetchSelectOptions = async () => {
      const selectFields = fields.filter(field => (field.type === 'select' || field.type === 'search-select') && field.endpoint);
      for (const field of selectFields) {
        try {
          const response = await get(field.endpoint);
          setSelectOptions(prev => ({
            ...prev,
            [field.name]: response.data?.data || response.data || []
          }));
        } catch (error) {
          console.error(`Failed to fetch options for ${field.name}:`, error);
        }
      }
    };

    fetchSelectOptions();
  }, [fields]);

  // Handle staff selection to show staff details
  useEffect(() => {
    if (formData.staff_id && selectOptions.staff_id) {
      const selectedStaff = selectOptions.staff_id.find(staff => staff.id === parseInt(formData.staff_id));
      setStaffDetails(selectedStaff || null);
    } else {
      setStaffDetails(null);
    }
  }, [formData.staff_id, selectOptions]);

  const fetchItem = async () => {
    setLoading(true);
    try {
      const response = await get(`${apiEndpoint}/${id}`);
      setFormData(response.data);
    } catch (error) {
      Swal.fire('Error', 'Failed to load data', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: null }));
    }
  };

  // Calculate total days when from_date or to_date changes
  useEffect(() => {
    if (formData.from_date && formData.to_date) {
      const fromDate = new Date(formData.from_date);
      const toDate = new Date(formData.to_date);
      const timeDiff = toDate.getTime() - fromDate.getTime();
      const daysDiff = Math.ceil(timeDiff / (1000 * 3600 * 24)) + 1; // +1 to include both start and end dates
      
      if (daysDiff >= 0) {
        setFormData(prev => ({
          ...prev,
          total_days: daysDiff.toString()
        }));
      } else {
        setFormData(prev => ({
          ...prev,
          total_days: '0'
        }));
      }
    }
  }, [formData.from_date, formData.to_date]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrors({});
    setSaving(true);
    
    // Validate total days is not negative
    if (parseInt(formData.total_days) < 0) {
      Swal.fire('Validation Error', 'Total days cannot be negative', 'warning');
      setSaving(false);
      return;
    }
    
    try {
      if (isEdit) {
        await put(`${apiEndpoint}/${id}`, formData);
        Swal.fire('Success', 'Updated successfully', 'success');
      } else {
        await post(apiEndpoint, formData);
        Swal.fire('Success', 'Created successfully', 'success');
      }
      navigate(listRoute);
    } catch (error) {
      if (error.response?.status === 422 && error.response?.data?.errors) {
        setErrors(error.response.data.errors);
        const firstError = Object.values(error.response.data.errors)[0][0];
        Swal.fire('Validation Error', firstError, 'warning');
      } else {
        Swal.fire('Error', error.response?.data?.message || 'Failed to save', 'error');
      }
    } finally {
      setSaving(false);
    }
  };

  const getFieldClass = (fieldName) => {
    const baseClass = "w-full px-2.5 py-1.5 border rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500 text-xs transition-colors";
    const errorClass = errors[fieldName] ? "border-red-500 bg-red-50" : "border-gray-300";
    return `${baseClass} ${errorClass}`;
  };

  const shouldRenderField = (field) => {
    if (!field.conditional) return true;
    
    const conditionMet = formData[field.conditional.field] === field.conditional.value;
    return conditionMet;
  };

  // Searchable select field component
  const SearchableSelectField = ({ field }) => {
    const dropdownRef = useRef(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [filteredOptions, setFilteredOptions] = useState([]);
    const [showDropdown, setShowDropdown] = useState(false);
    const [selectedDisplay, setSelectedDisplay] = useState('');

    useEffect(() => {
      // Load initial options
      if (selectOptions[field.name]) {
        setFilteredOptions(selectOptions[field.name]);
        
        // Set display name if editing
        if (formData[field.name]) {
          const selectedOption = selectOptions[field.name].find(opt => 
            opt[field.valueField]?.toString() === formData[field.name]?.toString()
          );
          if (selectedOption) {
            setSelectedDisplay(selectedOption[field.displayField]);
          }
        }
      }
    }, [selectOptions[field.name], formData[field.name]]);

    useEffect(() => {
      // Filter options based on search term
      if (searchTerm) {
        const filtered = selectOptions[field.name]?.filter(option =>
          option[field.displayField]?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          option[field.valueField]?.toString().toLowerCase().includes(searchTerm.toLowerCase())
        ) || [];
        setFilteredOptions(filtered);
      } else {
        setFilteredOptions(selectOptions[field.name] || []);
      }
    }, [searchTerm, selectOptions[field.name]]);

    useEffect(() => {
      const handleClickOutside = (event) => {
        if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
          setShowDropdown(false);
        }
      };
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const handleSelect = (option) => {
      setFormData(prev => ({
        ...prev,
        [field.name]: option[field.valueField]
      }));
      setSelectedDisplay(option[field.displayField]);
      setSearchTerm('');
      setShowDropdown(false);
      if (errors[field.name]) {
        setErrors(prev => ({ ...prev, [field.name]: null }));
      }
    };

    const handleInputChange = (e) => {
      const value = e.target.value;
      setSearchTerm(value);
      setShowDropdown(true);
    };

    const value = formData[field.name] || '';
    const hasError = errors[field.name];

    return (
      <div className="relative" ref={dropdownRef}>
        <div className="relative">
          <input
            type="text"
            placeholder={field.placeholder || `Search ${field.label.toLowerCase()}...`}
            value={searchTerm || selectedDisplay}
            onChange={handleInputChange}
            onFocus={() => setShowDropdown(true)}
            required={field.required}
            className={getFieldClass(field.name)}
          />
          <div className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>
        </div>
        {showDropdown && (
          <div className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-60 overflow-auto">
            {filteredOptions.length === 0 ? (
              <div className="px-3 py-2 text-xs text-gray-500">No {field.label.toLowerCase()} found</div>
            ) : (
              filteredOptions.map(option => (
                <div
                  key={option[field.valueField]}
                  onClick={() => handleSelect(option)}
                  className={`px-3 py-2 cursor-pointer hover:bg-teal-50 border-b border-gray-100 last:border-0 ${value === option[field.valueField]?.toString() ? 'bg-teal-50' : ''}`}
                >
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-full bg-teal-100 flex items-center justify-center text-teal-600 text-xs font-bold">
                      {option[field.displayField]?.charAt(0)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium text-gray-800 truncate">{option[field.displayField]}</p>
                      <p className="text-[10px] text-gray-500">{option.employee_id || option[field.valueField]} • {option.department || 'No Dept'}</p>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        )}
        <input type="hidden" name={field.name} value={value} />
        {hasError && <p className="mt-1 text-sm text-red-600">{hasError[0]}</p>}
      </div>
    );
  };

  const renderField = (field) => {
    if (!shouldRenderField(field)) return null;

    const value = formData[field.name] ?? '';
    const hasError = errors[field.name];

    if (field.type === 'search-select') {
      return <SearchableSelectField field={field} />;
    }

    if (field.type === 'select') {
      if (field.endpoint) {
        // Dynamic select from API
        const options = selectOptions[field.name] || [];
        return (
          <div>
            <select
              name={field.name}
              value={value}
              onChange={handleChange}
              required={field.required}
              className={getFieldClass(field.name)}
            >
              <option value="">Select {field.label}</option>
              {options.map(option => (
                <option key={option[field.valueField]} value={option[field.valueField]}>
                  {option[field.displayField]}
                </option>
              ))}
            </select>
            {hasError && <p className="mt-1 text-sm text-red-600">{hasError[0]}</p>}
          </div>
        );
      } else {
        // Static options
        return (
          <div>
            <select
              name={field.name}
              value={value}
              onChange={handleChange}
              required={field.required}
              className={getFieldClass(field.name)}
            >
              <option value="">Select {field.label}</option>
              {field.options?.map(opt => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
            {hasError && <p className="mt-1 text-sm text-red-600">{hasError[0]}</p>}
          </div>
        );
      }
    }

    if (field.type === 'textarea') {
      return (
        <div>
          <textarea
            name={field.name}
            value={value}
            onChange={handleChange}
            required={field.required}
            rows={4}
            className={getFieldClass(field.name)}
          />
          {hasError && <p className="mt-1 text-sm text-red-600">{hasError[0]}</p>}
        </div>
      );
    }

    if (field.type === 'checkbox') {
      return (
        <div>
          <input
            type="checkbox"
            name={field.name}
            checked={Boolean(value)}
            onChange={handleChange}
            className="w-5 h-5 text-teal-600 rounded focus:ring-teal-500"
          />
          {hasError && <p className="mt-1 text-sm text-red-600">{hasError[0]}</p>}
        </div>
      );
    }

    if (field.type === 'date') {
      return (
        <div>
          <input
            type="date"
            name={field.name}
            value={value}
            onChange={handleChange}
            required={field.required}
            className={getFieldClass(field.name)}
          />
          {hasError && <p className="mt-1 text-sm text-red-600">{hasError[0]}</p>}
        </div>
      );
    }

    return (
      <div>
        <input
          type={field.type || 'text'}
          name={field.name}
          value={value}
          onChange={handleChange}
          required={field.required}
          className={getFieldClass(field.name)}
        />
        {hasError && <p className="mt-1 text-sm text-red-600">{hasError[0]}</p>}
      </div>
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-48">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-teal-600"></div>
      </div>
    );
  }

  return (
    <div className="w-full px-4 py-4">
      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        <div className="px-4 py-3 border-b border-gray-200">
          <h2 className="text-sm font-semibold text-gray-800">
            {isEdit ? `Edit ${title}` : `Create ${title}`}
          </h2>
        </div>

        <form onSubmit={handleSubmit} className="p-4">
          {/* Staff Details Section - Only show for leave requests */}
          {staffDetails && (
            <div className="bg-blue-50 rounded-lg p-4 mb-4 border border-blue-200">
              <h3 className="text-xs font-semibold text-blue-600 uppercase tracking-wide mb-3">
                Staff Details
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
                <div><strong>Employee ID:</strong> {staffDetails.employee_id}</div>
                <div><strong>Name:</strong> {staffDetails.full_name}</div>
                <div><strong>Position:</strong> {staffDetails.position}</div>
                <div><strong>Department:</strong> {staffDetails.department}</div>
              </div>
            </div>
          )}

          <div className="bg-gray-50 rounded-lg p-4 mb-4">
            <h3 className="text-xs font-semibold text-teal-600 uppercase tracking-wide mb-3">
              Primary Details
            </h3>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
              {fields.map(field => (
                <div key={field.name} className={field.type === 'textarea' ? 'lg:col-span-2' : ''}>
                  <label className="block text-xs font-medium text-gray-700 mb-1">
                    {field.label}
                    {field.required && <span className="text-red-500 ml-1">*</span>}
                  </label>
                  {renderField(field)}
                </div>
              ))}
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-2">
            <button
              type="submit"
              disabled={saving}
              className="w-full sm:w-auto px-4 py-1.5 bg-teal-600 text-white rounded-lg hover:bg-teal-700 disabled:opacity-50 font-medium text-xs"
            >
              {saving ? 'Saving...' : (isEdit ? 'Update' : 'Create')}
            </button>
            <button
              type="button"
              onClick={() => navigate(listRoute)}
              className="w-full sm:w-auto px-4 py-1.5 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 font-medium text-xs"
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}