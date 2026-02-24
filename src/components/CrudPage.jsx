import { useState, useEffect } from 'react';
import { get, post, put, del } from '../api/axios';

export default function CrudPage({ 
  title, 
  apiEndpoint, 
  fields, 
  listColumns,
  idField = 'id'
}) {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [formData, setFormData] = useState({});

  useEffect(() => {
    fetchItems();
  }, []);

  const fetchItems = async () => {
    setLoading(true);
    try {
      const response = await get(apiEndpoint);
      setItems(response.data);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = () => {
    setEditingItem(null);
    const initialData = {};
    fields.forEach(field => {
      initialData[field.name] = field.defaultValue || '';
    });
    setFormData(initialData);
    setShowForm(true);
  };

  const handleEdit = (item) => {
    setEditingItem(item);
    setFormData({ ...item });
    setShowForm(true);
  };

  const handleDelete = async (id) => {
    if (!confirm('Are you sure you want to delete this item?')) return;
    try {
      await del(`${apiEndpoint}/${id}`);
      fetchItems();
    } catch (error) {
      console.error(error);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editingItem) {
        await put(`${apiEndpoint}/${editingItem[idField]}`, formData);
      } else {
        await post(apiEndpoint, formData);
      }
      setShowForm(false);
      fetchItems();
    } catch (error) {
      console.error(error);
      alert('Error saving data');
    }
  };

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const renderField = (field) => {
    const value = formData[field.name] || '';
    
    switch (field.type) {
      case 'select':
        return (
          <select
            name={field.name}
            value={value}
            onChange={handleChange}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500"
            required={field.required}
          >
            <option value="">Select {field.label}</option>
            {field.options.map(opt => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
        );
      case 'textarea':
        return (
          <textarea
            name={field.name}
            value={value}
            onChange={handleChange}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500"
            rows={3}
            required={field.required}
          />
        );
      case 'checkbox':
        return (
          <input
            type="checkbox"
            name={field.name}
            checked={value}
            onChange={handleChange}
            className="w-4 h-4 text-teal-600 rounded focus:ring-teal-500"
          />
        );
      default:
        return (
          <input
            type={field.type || 'text'}
            name={field.name}
            value={value}
            onChange={handleChange}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500"
            required={field.required}
          />
        );
    }
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold text-gray-800">{title}</h2>
        <button
          onClick={handleCreate}
          className="px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 transition-colors"
        >
          + Add New
        </button>
      </div>

      {showForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <h3 className="text-xl font-semibold mb-4">
              {editingItem ? 'Edit' : 'Create'} {title}
            </h3>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                {fields.map(field => (
                  <div key={field.name} className={field.type === 'textarea' ? 'col-span-2' : ''}>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      {field.label}
                    </label>
                    {renderField(field)}
                  </div>
                ))}
              </div>
              <div className="flex justify-end gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowForm(false)}
                  className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700"
                >
                  {editingItem ? 'Update' : 'Create'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {loading ? (
        <div className="text-center py-8">Loading...</div>
      ) : (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                {listColumns.map(col => (
                  <th key={col.key} className="px-4 py-3 text-left text-sm font-medium text-gray-700">
                    {col.label}
                  </th>
                ))}
                <th className="px-4 py-3 text-right text-sm font-medium text-gray-700">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {items.map(item => (
                <tr key={item[idField]} className="hover:bg-gray-50">
                  {listColumns.map(col => (
                    <td key={col.key} className="px-4 py-3 text-sm text-gray-800">
                      {col.render ? col.render(item[col.key], item) : item[col.key]}
                    </td>
                  ))}
                  <td className="px-4 py-3 text-right">
                    <button
                      onClick={() => handleEdit(item)}
                      className="text-teal-600 hover:text-teal-800 mr-3"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => handleDelete(item[idField])}
                      className="text-red-600 hover:text-red-800"
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {items.length === 0 && (
            <div className="text-center py-8 text-gray-500">No records found</div>
          )}
        </div>
      )}
    </div>
  );
}
