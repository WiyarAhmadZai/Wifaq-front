import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import Swal from 'sweetalert2';

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

export default function ClassesShow() {
  const navigate = useNavigate();
  const { id } = useParams();
  
  const item = { id: 1, name: 'Class 1 - A', section: 'A', grade: '1', teacher: 'Mr. Ahmad', students: 35, status: 'active' };

  return (
    <div className="px-4 py-4">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate('/class-management/classes')} className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors">
            <Icons.ArrowLeft />
          </button>
          <div>
            <h2 className="text-xl font-bold text-gray-800">Class Details</h2>
            <p className="text-sm text-gray-500">View class information</p>
          </div>
        </div>
        <button onClick={() => navigate(`/class-management/classes/edit/${id}`)} className="px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 transition-colors flex items-center gap-2 font-medium">
          <Icons.Edit />
          Edit
        </button>
      </div>

      <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden p-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div><span className="text-sm text-gray-500">Class Name:</span><p className="font-medium">{item.name}</p></div>
          <div><span className="text-sm text-gray-500">Section:</span><p className="font-medium">{item.section}</p></div>
          <div><span className="text-sm text-gray-500">Grade:</span><p className="font-medium">{item.grade}</p></div>
          <div><span className="text-sm text-gray-500">Teacher:</span><p className="font-medium">{item.teacher}</p></div>
          <div><span className="text-sm text-gray-500">Students:</span><p className="font-medium">{item.students}</p></div>
          <div><span className="text-sm text-gray-500">Status:</span><p className="font-medium capitalize">{item.status}</p></div>
        </div>
      </div>
    </div>
  );
}