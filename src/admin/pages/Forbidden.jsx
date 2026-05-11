import { Link, useLocation, useNavigate } from "react-router-dom";

export default function Forbidden() {
  const navigate = useNavigate();
  const location = useLocation();
  const attempted = location.state?.from?.pathname;

  return (
    <div className="min-h-[80vh] flex items-center justify-center px-4">
      <div className="max-w-md w-full text-center bg-white rounded-2xl border border-gray-100 shadow-sm p-8">
        <div className="w-16 h-16 mx-auto rounded-2xl bg-red-50 flex items-center justify-center">
          <svg className="w-8 h-8 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
              d="M12 9v2m0 4h.01M5.07 19h13.86a2 2 0 001.74-2.992l-6.93-12a2 2 0 00-3.48 0l-6.93 12A2 2 0 005.07 19z" />
          </svg>
        </div>
        <h1 className="mt-5 text-xl font-bold text-gray-800">403 — Access Denied</h1>
        <p className="mt-2 text-sm text-gray-500">
          You don't have permission to access this page.
          {attempted && <span className="block mt-1 text-[11px] text-gray-400 break-all">Attempted: <code>{attempted}</code></span>}
        </p>
        <div className="mt-6 flex gap-2 justify-center">
          <button
            onClick={() => navigate(-1)}
            className="px-4 py-2 text-sm font-medium text-gray-600 bg-white border border-gray-200 rounded-xl hover:bg-gray-50"
          >
            Go Back
          </button>
          <Link
            to="/"
            className="px-4 py-2 text-sm font-semibold text-white bg-teal-600 rounded-xl hover:bg-teal-700"
          >
            Home
          </Link>
        </div>
      </div>
    </div>
  );
}
