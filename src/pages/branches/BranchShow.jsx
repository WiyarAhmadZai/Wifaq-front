import { useNavigate, useParams } from 'react-router-dom';

const Icons = {
  ArrowLeft: () => (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
    </svg>
  ),
  Edit: () => (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
    </svg>
  ),
};

const dummyItem = {
  id: 1,
  name: 'Main Branch',
  code: 'BR-001',
  city: 'Kabul',
  address: 'District 10, Kabul, Afghanistan',
  phone: '+93 700 000 001',
  email: 'main@wifaqschool.com',
  manager: 'Mr. Ahmad',
  establishedYear: '2010',
  capacity: '500',
  notes: '',
  status: 'active',
};

export default function BranchShow() {
  const navigate = useNavigate();
  const { id } = useParams();
  const item = dummyItem;

  const getStatusBadge = (status) => {
    const styles = {
      active: 'bg-emerald-100 text-emerald-700',
      inactive: 'bg-gray-100 text-gray-700',
    };
    return styles[status] || 'bg-gray-100 text-gray-700';
  };

  return (
    <div className="px-4 py-4">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate('/branches')} className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors">
            <Icons.ArrowLeft />
          </button>
          <div>
            <h2 className="text-xl font-bold text-gray-800">Branch Details</h2>
            <p className="text-sm text-gray-500">View branch information</p>
          </div>
        </div>
        <button
          onClick={() => navigate(`/branches/edit/${id}`)}
          className="px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 transition-colors flex items-center gap-2 font-medium"
        >
          <Icons.Edit />
          Edit
        </button>
      </div>

      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <span className="text-sm text-gray-500">Branch Name</span>
            <p className="font-medium text-gray-800 mt-0.5">{item.name}</p>
          </div>
          <div>
            <span className="text-sm text-gray-500">Branch Code</span>
            <p className="font-medium text-gray-800 mt-0.5">{item.code}</p>
          </div>
          <div>
            <span className="text-sm text-gray-500">City</span>
            <p className="font-medium text-gray-800 mt-0.5">{item.city}</p>
          </div>
          <div>
            <span className="text-sm text-gray-500">Phone</span>
            <p className="font-medium text-gray-800 mt-0.5">{item.phone || '—'}</p>
          </div>
          <div>
            <span className="text-sm text-gray-500">Email</span>
            <p className="font-medium text-gray-800 mt-0.5">{item.email || '—'}</p>
          </div>
          <div>
            <span className="text-sm text-gray-500">Branch Manager</span>
            <p className="font-medium text-gray-800 mt-0.5">{item.manager || '—'}</p>
          </div>
          <div>
            <span className="text-sm text-gray-500">Established Year</span>
            <p className="font-medium text-gray-800 mt-0.5">{item.establishedYear || '—'}</p>
          </div>
          <div>
            <span className="text-sm text-gray-500">Student Capacity</span>
            <p className="font-medium text-gray-800 mt-0.5">{item.capacity || '—'}</p>
          </div>
          <div className="md:col-span-2">
            <span className="text-sm text-gray-500">Address</span>
            <p className="font-medium text-gray-800 mt-0.5">{item.address || '—'}</p>
          </div>
          <div>
            <span className="text-sm text-gray-500">Status</span>
            <div className="mt-0.5">
              <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${getStatusBadge(item.status)}`}>
                {item.status}
              </span>
            </div>
          </div>
          {item.notes && (
            <div className="md:col-span-2">
              <span className="text-sm text-gray-500">Notes</span>
              <p className="font-medium text-gray-800 mt-0.5">{item.notes}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
