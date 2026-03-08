import { useState } from "react";
import { useNavigate } from "react-router-dom";
import Swal from "sweetalert2";

export default function AcademicTerms() {
  const navigate = useNavigate();

  // Dummy data for academic terms
  const [terms] = useState([
    {
      id: 1,
      name: "2024-2025 Academic Year",
      start_date: "2024-09-01",
      end_date: "2025-06-30",
      is_current: true,
    },
    {
      id: 2,
      name: "2023-2024 Academic Year",
      start_date: "2023-09-01",
      end_date: "2024-06-30",
      is_current: false,
    },
    {
      id: 3,
      name: "2022-2023 Academic Year",
      start_date: "2022-09-01",
      end_date: "2023-06-30",
      is_current: false,
    },
    {
      id: 4,
      name: "2021-2022 Academic Year",
      start_date: "2021-09-01",
      end_date: "2022-06-30",
      is_current: false,
    },
    {
      id: 5,
      name: "2020-2021 Academic Year",
      start_date: "2020-09-01",
      end_date: "2021-06-30",
      is_current: false,
    },
    {
      id: 6,
      name: "2019-2020 Academic Year",
      start_date: "2019-09-01",
      end_date: "2020-06-30",
      is_current: false,
    },
  ]);

  const handleDelete = async (id) => {
    const result = await Swal.fire({
      title: "Are you sure?",
      text: "You won't be able to revert this!",
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#0d9488",
      cancelButtonColor: "#6b7280",
      confirmButtonText: "Yes, delete it!",
    });

    if (result.isConfirmed) {
      // In a real app, this would call the API
      Swal.fire("Deleted!", "Academic term has been deleted.", "success");
    }
  };

  const getCurrentBadge = (isCurrent) => {
    return isCurrent ? (
      <span className="px-2 py-1 text-xs font-medium rounded-full bg-green-100 text-green-800">
        Current
      </span>
    ) : (
      <span className="px-2 py-1 text-xs font-medium rounded-full bg-gray-100 text-gray-800">
        Previous
      </span>
    );
  };

  return (
    <div className="px-4 py-4 mx-auto">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-lg font-bold text-gray-800">Academic Terms</h2>
        <button
          onClick={() => navigate("/student-management/academic-terms/create")}
          className="px-4 py-2 bg-teal-600 text-white rounded-lg text-xs font-medium hover:bg-teal-700"
        >
          Add Term
        </button>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                  Term Name
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                  Start Date
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                  End Date
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {terms.map((term) => (
                <tr key={term.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 text-xs font-medium text-gray-900">
                    {term.name}
                  </td>
                  <td className="px-4 py-3 text-xs text-gray-700">
                    {term.start_date}
                  </td>
                  <td className="px-4 py-3 text-xs text-gray-700">
                    {term.end_date}
                  </td>
                  <td className="px-4 py-3 text-xs text-gray-700">
                    {getCurrentBadge(term.is_current)}
                  </td>
                  <td className="px-4 py-3 text-xs text-gray-700">
                    <div className="flex gap-2">
                      <button
                        onClick={() =>
                          navigate(
                            `/student-management/academic-terms/show/${term.id}`,
                          )
                        }
                        className="text-teal-600 hover:text-teal-800"
                        title="View"
                      >
                        <svg
                          className="w-4 h-4"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                          />
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
                          />
                        </svg>
                      </button>
                      <button
                        onClick={() =>
                          navigate(
                            `/student-management/academic-terms/edit/${term.id}`,
                          )
                        }
                        className="text-blue-600 hover:text-blue-800"
                        title="Edit"
                      >
                        <svg
                          className="w-4 h-4"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                          />
                        </svg>
                      </button>
                      <button
                        onClick={() => handleDelete(term.id)}
                        className="text-red-600 hover:text-red-800"
                        title="Delete"
                      >
                        <svg
                          className="w-4 h-4"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                          />
                        </svg>
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
