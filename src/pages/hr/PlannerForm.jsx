import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { get, post, put } from '../../api/axios';
import Swal from 'sweetalert2';

export default function PlannerForm() {
  const { id } = useParams();
  const navigate = useNavigate();
  const isEdit = Boolean(id);

  const [formData, setFormData] = useState({
    type: 'task',
    name: '',
    date: '',
    day: '',
    time: '',
    description: '',
    event_type: '',
    target_audience: '',
    location: '',
    branch: '',
    attendance: '',
    notify_emails: '',
    notes: '',
    assigned_to: '',
    meeting_type: '',
    with_whom: '',
    attendees: '',
    priority: '',
  });

  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [users, setUsers] = useState([]);

  useEffect(() => {
    fetchUsers();
    if (isEdit) {
      fetchItem();
    }
  }, [id]);

  const fetchUsers = async () => {
    try {
      // Assuming we'll get users from an API endpoint
      // We might need to adjust this based on your actual user API
      const response = await get('/hr/staff/list'); // Using staff list as users
      setUsers(response.data);
    } catch (error) {
      console.error('Error fetching users:', error);
      // Fallback to sample users if API fails
      setUsers([
        { id: 1, full_name: 'Anwari' },
        { id: 2, full_name: 'Burhan' },
        { id: 3, full_name: 'Shaheen' },
        { id: 4, full_name: 'Sabawoon' },
        { id: 5, full_name: 'Khalida' },
      ]);
    }
  };

  const fetchItem = async () => {
    setLoading(true);
    try {
      const response = await get(`/hr/planners/${id}`);
      const data = response.data;
      setFormData({
        type: data.type || 'task',
        name: data.name || '',
        date: data.date || '',
        day: data.day || '',
        time: data.time || '',
        description: data.description || '',
        event_type: data.event_type || '',
        target_audience: data.target_audience || '',
        location: data.location || '',
        branch: data.branch || '',
        attendance: data.attendance || '',
        notify_emails: data.notify_emails || '',
        notes: data.notes || '',
        assigned_to: data.assigned_to || '',
        meeting_type: data.meeting_type || '',
        with_whom: data.with_whom || '',
        attendees: data.attendees || '',
        priority: data.priority || '',
      });
    } catch (error) {
      Swal.fire('Error', 'Failed to load data', 'error');
      navigate('/hr/planner');
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: null }));
    }
  };

  const handleDateChange = (e) => {
    const dateValue = e.target.value;
    setFormData(prev => ({
      ...prev,
      date: dateValue,
      day: new Date(dateValue).toLocaleDateString('en-US', { weekday: 'long' })
    }));
    if (errors.date) {
      setErrors(prev => ({ ...prev, date: null }));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrors({});
    setSaving(true);

    try {
      if (isEdit) {
        await put(`/hr/planners/${id}`, formData);
        Swal.fire('Success', 'Planner updated successfully', 'success');
      } else {
        await post('/hr/planners', formData);
        Swal.fire('Success', 'Planner created successfully', 'success');
      }
      navigate('/hr/planner');
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

  const renderTaskFields = () => (
    <>
      <div className="lg:col-span-3">
        <label className="block text-xs font-medium text-gray-700 mb-1">
          Task Details / جزئیات وظیفه
        </label>
        <textarea
          name="description"
          value={formData.description}
          onChange={handleChange}
          required
          rows={3}
          className={getFieldClass('description')}
        />
        {errors.description && <p className="mt-1 text-sm text-red-600">{errors.description[0]}</p>}
      </div>
      
      <div>
        <label className="block text-xs font-medium text-gray-700 mb-1">
          Assigned To مسئول
        </label>
        <select
          name="assigned_to"
          value={formData.assigned_to}
          onChange={handleChange}
          className={getFieldClass('assigned_to')}
        >
          <option value="">Select...</option>
          {users.map(user => (
            <option key={user.id} value={user.id}>{user.full_name}</option>
          ))}
        </select>
        {errors.assigned_to && <p className="mt-1 text-sm text-red-600">{errors.assigned_to[0]}</p>}
      </div>
      
      <div>
        <label className="block text-xs font-medium text-gray-700 mb-1">
          Branch شاخه
        </label>
        <select
          name="branch"
          value={formData.branch}
          onChange={handleChange}
          className={getFieldClass('branch')}
        >
          <option value="">--</option>
          <option value="Main Office">Main Office</option>
          <option value="Branch 1">Branch 1</option>
          <option value="Branch 2">Branch 2</option>
        </select>
        {errors.branch && <p className="mt-1 text-sm text-red-600">{errors.branch[0]}</p>}
      </div>
      
      <div>
        <label className="block text-xs font-medium text-gray-700 mb-1">
          Priority اولویت
        </label>
        <select
          name="priority"
          value={formData.priority}
          onChange={handleChange}
          className={getFieldClass('priority')}
        >
          <option value="">--</option>
          <option value="low">Low</option>
          <option value="medium">Medium</option>
          <option value="high">High</option>
          <option value="urgent">Urgent</option>
        </select>
        {errors.priority && <p className="mt-1 text-sm text-red-600">{errors.priority[0]}</p>}
      </div>
    </>
  );

  const renderMeetingFields = () => (
    <>
      <div className="lg:col-span-3">
        <label className="block text-xs font-medium text-gray-700 mb-1">
          Meeting Details / جزئیات جلسه
        </label>
      </div>
      
      <div>
        <label className="block text-xs font-medium text-gray-700 mb-1">
          Meeting Type نوع جلسه
        </label>
        <select
          name="meeting_type"
          value={formData.meeting_type}
          onChange={handleChange}
          className={getFieldClass('meeting_type')}
        >
          <option value="">--</option>
          <option value="board">Board Meeting</option>
          <option value="team">Team Meeting</option>
          <option value="client">Client Meeting</option>
          <option value="review">Review Meeting</option>
        </select>
        {errors.meeting_type && <p className="mt-1 text-sm text-red-600">{errors.meeting_type[0]}</p>}
      </div>
      
      <div className="lg:col-span-2">
        <label className="block text-xs font-medium text-gray-700 mb-1">
          With Whom (Internal) اشتراککنندگان
        </label>
        <input
          type="text"
          name="with_whom"
          value={formData.with_whom}
          onChange={handleChange}
          placeholder="Names of attendees"
          className={getFieldClass('with_whom')}
        />
        {errors.with_whom && <p className="mt-1 text-sm text-red-600">{errors.with_whom[0]}</p>}
      </div>
      
      <div className="lg:col-span-3">
        <label className="block text-xs font-medium text-gray-700 mb-1">
          Location مکان
        </label>
        <input
          type="text"
          name="location"
          value={formData.location}
          onChange={handleChange}
          className={getFieldClass('location')}
        />
        {errors.location && <p className="mt-1 text-sm text-red-600">{errors.location[0]}</p>}
      </div>
      
      <div>
        <label className="block text-xs font-medium text-gray-700 mb-1">
          Branch شاخه
        </label>
        <select
          name="branch"
          value={formData.branch}
          onChange={handleChange}
          className={getFieldClass('branch')}
        >
          <option value="">--</option>
          <option value="Main Office">Main Office</option>
          <option value="Branch 1">Branch 1</option>
          <option value="Branch 2">Branch 2</option>
        </select>
        {errors.branch && <p className="mt-1 text-sm text-red-600">{errors.branch[0]}</p>}
      </div>
      
      <div>
        <label className="block text-xs font-medium text-gray-700 mb-1">
          Attendance حضور
        </label>
        <select
          name="attendance"
          value={formData.attendance}
          onChange={handleChange}
          className={getFieldClass('attendance')}
        >
          <option value="">--</option>
          <option value="mandatory">Mandatory</option>
          <option value="optional">Optional</option>
        </select>
        {errors.attendance && <p className="mt-1 text-sm text-red-600">{errors.attendance[0]}</p>}
      </div>
    </>
  );

  const renderEventFields = () => (
    <>
      <div className="lg:col-span-3">
        <label className="block text-xs font-medium text-gray-700 mb-1">
          Event Details / جزئیات رویداد
        </label>
      </div>
      
      <div className="lg:col-span-3">
        <label className="block text-xs font-medium text-gray-700 mb-1">
          Event Type نوع رویداد
        </label>
        <input
          type="text"
          name="event_type"
          value={formData.event_type}
          onChange={handleChange}
          placeholder="e.g. Parent Day, Workshop, Assembly, Training..."
          className={getFieldClass('event_type')}
        />
        {errors.event_type && <p className="mt-1 text-sm text-red-600">{errors.event_type[0]}</p>}
      </div>
      
      <div className="lg:col-span-3">
        <label className="block text-xs font-medium text-gray-700 mb-1">
          Target Audience مخاطبین
        </label>
        <input
          type="text"
          name="target_audience"
          value={formData.target_audience}
          onChange={handleChange}
          placeholder="e.g. Grade 5 parents, All staff, Students + Parents..."
          className={getFieldClass('target_audience')}
        />
        {errors.target_audience && <p className="mt-1 text-sm text-red-600">{errors.target_audience[0]}</p>}
      </div>
      
      <div className="lg:col-span-3">
        <label className="block text-xs font-medium text-gray-700 mb-1">
          Location مکان
        </label>
        <input
          type="text"
          name="location"
          value={formData.location}
          onChange={handleChange}
          className={getFieldClass('location')}
        />
        {errors.location && <p className="mt-1 text-sm text-red-600">{errors.location[0]}</p>}
      </div>
      
      <div>
        <label className="block text-xs font-medium text-gray-700 mb-1">
          Branch شاخه
        </label>
        <select
          name="branch"
          value={formData.branch}
          onChange={handleChange}
          className={getFieldClass('branch')}
        >
          <option value="">--</option>
          <option value="Main Office">Main Office</option>
          <option value="Branch 1">Branch 1</option>
          <option value="Branch 2">Branch 2</option>
        </select>
        {errors.branch && <p className="mt-1 text-sm text-red-600">{errors.branch[0]}</p>}
      </div>
      
      <div>
        <label className="block text-xs font-medium text-gray-700 mb-1">
          Attendance حضور
        </label>
        <select
          name="attendance"
          value={formData.attendance}
          onChange={handleChange}
          className={getFieldClass('attendance')}
        >
          <option value="">--</option>
          <option value="mandatory">Mandatory</option>
          <option value="optional">Optional</option>
        </select>
        {errors.attendance && <p className="mt-1 text-sm text-red-600">{errors.attendance[0]}</p>}
      </div>
    </>
  );

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
            {isEdit ? 'Edit Planner / پلانر' : 'Create Planner / پلانر'}
          </h2>
        </div>

        <form onSubmit={handleSubmit} className="p-4">
          <div className="bg-gray-50 rounded-lg p-4 mb-4">
            <h3 className="text-xs font-semibold text-teal-600 uppercase tracking-wide mb-3">
              Basic Information
            </h3>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  Type / نوع
                </label>
                <select
                  name="type"
                  value={formData.type}
                  onChange={handleChange}
                  required
                  className={getFieldClass('type')}
                >
                  <option value="task">Task / وظیفه</option>
                  <option value="meeting">Meeting / جلسه</option>
                  <option value="event">Event / رویداد</option>
                </select>
                {errors.type && <p className="mt-1 text-sm text-red-600">{errors.type[0]}</p>}
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  Your Name نام شما
                </label>
                <input
                  type="text"
                  name="name"
                  value={formData.name}
                  onChange={handleChange}
                  required
                  className={getFieldClass('name')}
                />
                {errors.name && <p className="mt-1 text-sm text-red-600">{errors.name[0]}</p>}
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  Date
                </label>
                <input
                  type="date"
                  name="date"
                  value={formData.date}
                  onChange={handleDateChange}
                  required
                  className={getFieldClass('date')}
                />
                {errors.date && <p className="mt-1 text-sm text-red-600">{errors.date[0]}</p>}
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  Day
                </label>
                <input
                  type="text"
                  name="day"
                  value={formData.day}
                  onChange={handleChange}
                  readOnly
                  className={`${getFieldClass('day')} bg-gray-100`}
                />
                {errors.day && <p className="mt-1 text-sm text-red-600">{errors.day[0]}</p>}
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  Time
                </label>
                <input
                  type="time"
                  name="time"
                  value={formData.time}
                  onChange={handleChange}
                  required
                  className={getFieldClass('time')}
                />
                {errors.time && <p className="mt-1 text-sm text-red-600">{errors.time[0]}</p>}
              </div>
            </div>
          </div>

          {/* Conditional rendering based on type */}
          {formData.type === 'task' && (
            <div className="bg-blue-50 rounded-lg p-4 mb-4">
              <h3 className="text-xs font-semibold text-blue-600 uppercase tracking-wide mb-3">
                Task Details / جزئیات وظیفه
              </h3>
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
                {renderTaskFields()}
              </div>
            </div>
          )}

          {formData.type === 'meeting' && (
            <div className="bg-purple-50 rounded-lg p-4 mb-4">
              <h3 className="text-xs font-semibold text-purple-600 uppercase tracking-wide mb-3">
                Meeting Details / جزئیات جلسه
              </h3>
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
                {renderMeetingFields()}
              </div>
            </div>
          )}

          {formData.type === 'event' && (
            <div className="bg-green-50 rounded-lg p-4 mb-4">
              <h3 className="text-xs font-semibold text-green-600 uppercase tracking-wide mb-3">
                Event Details / جزئیات رویداد
              </h3>
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
                {renderEventFields()}
              </div>
            </div>
          )}

          <div className="bg-yellow-50 rounded-lg p-4 mb-4">
            <h3 className="text-xs font-semibold text-yellow-600 uppercase tracking-wide mb-3">
              📧 Notify by Email
            </h3>
            <div className="grid grid-cols-1 lg:grid-cols-5 gap-2 mb-2">
              {users.slice(0, 5).map(user => (
                <div key={user.id} className="flex items-center">
                  <input
                    type="checkbox"
                    id={`notify-${user.id}`}
                    name={`notify_${user.id}`}
                    className="rounded text-yellow-600 focus:ring-yellow-500"
                  />
                  <label htmlFor={`notify-${user.id}`} className="ml-2 text-xs text-gray-700">
                    {user.full_name}
                  </label>
                </div>
              ))}
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">
                Additional Emails (comma-separated)
              </label>
              <input
                type="text"
                name="notify_emails"
                value={formData.notify_emails}
                onChange={handleChange}
                placeholder="email1@example.com, email2@example.com"
                className={getFieldClass('notify_emails')}
              />
              {errors.notify_emails && <p className="mt-1 text-sm text-red-600">{errors.notify_emails[0]}</p>}
            </div>
          </div>

          <div className="bg-gray-50 rounded-lg p-4">
            <h3 className="text-xs font-semibold text-gray-600 uppercase tracking-wide mb-3">
              Notes یادداشت
            </h3>
            <div className="grid grid-cols-1 gap-3">
              <div>
                <textarea
                  name="notes"
                  value={formData.notes}
                  onChange={handleChange}
                  rows={3}
                  className={getFieldClass('notes')}
                />
                {errors.notes && <p className="mt-1 text-sm text-red-600">{errors.notes[0]}</p>}
              </div>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-2 mt-4">
            <button
              type="submit"
              disabled={saving}
              className="w-full sm:w-auto px-4 py-1.5 bg-teal-600 text-white rounded-lg hover:bg-teal-700 disabled:opacity-50 font-medium text-xs"
            >
              {saving ? 'Saving...' : (isEdit ? 'Update' : 'Create')}
            </button>
            <button
              type="button"
              onClick={() => navigate('/hr/planner')}
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
