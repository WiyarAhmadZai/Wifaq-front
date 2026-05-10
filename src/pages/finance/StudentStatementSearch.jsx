import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { get } from "../../api/axios";

/**
 * Student-search landing for the Statement screen, since /students/:id/statement
 * needs a student to be picked first. Lists active phase_2 students; on click
 * navigate to that student's statement page.
 */

export default function StudentStatementSearch() {
  const navigate = useNavigate();
  const [students, setStudents] = useState([]);
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    get("/student-management/students/list", {
      params: { registration_status: "phase_2", per_page: 1000 },
    })
      .then((r) => setStudents(Array.isArray(r.data?.data) ? r.data.data : []))
      .catch(() => setStudents([]))
      .finally(() => setLoading(false));
  }, []);

  const filtered = useMemo(() => {
    if (!query.trim()) return students.slice(0, 100);
    const q = query.trim().toLowerCase();
    return students
      .filter((s) => {
        const name = `${s.first_name || ""} ${s.last_name || ""}`.toLowerCase();
        return name.includes(q) || (s.student_id || "").toLowerCase().includes(q);
      })
      .slice(0, 100);
  }, [students, query]);

  return (
    <div className="px-4 py-4 max-w-4xl mx-auto">
      <div className="mb-4">
        <h1 className="text-lg font-bold text-gray-900">Student Statements</h1>
        <p className="text-xs text-gray-500">
          Pick a student to view their balance, outstanding invoices, payment history, and pending charges.
        </p>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4">
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search by name or student ID…"
          autoFocus
          className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-1 focus:ring-teal-500 mb-3"
        />

        {loading ? (
          <div className="text-center py-8 text-xs text-gray-500">Loading students…</div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-8 text-xs text-gray-400 italic">
            {query ? "No matches" : "No active students"}
          </div>
        ) : (
          <div className="max-h-[60vh] overflow-auto border border-gray-100 rounded-lg divide-y divide-gray-50">
            {filtered.map((s) => {
              const className = s.school_class?.name || s.school_class?.title || "—";
              const family = s.family || {};
              return (
                <button
                  key={s.id}
                  onClick={() => navigate(`/finance/students/${s.id}/statement`)}
                  className="w-full text-left px-3 py-2.5 hover:bg-teal-50 flex items-center justify-between gap-3"
                >
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-gray-800 truncate">
                      {s.first_name} {s.last_name}
                    </p>
                    <p className="text-[11px] text-gray-500 truncate">
                      Class {className}
                      {family.father_name ? ` · ${family.father_name}` : ""}
                      {family.father_phone ? ` · ${family.father_phone}` : ""}
                    </p>
                  </div>
                  <span className="text-[10px] text-gray-400 font-mono flex-shrink-0">
                    {s.student_id || `#${s.id}`}
                  </span>
                </button>
              );
            })}
          </div>
        )}

        {filtered.length === 100 && students.length > 100 && (
          <p className="text-[10px] text-gray-400 text-center mt-2">
            Showing first 100 results — refine your search to see more.
          </p>
        )}
      </div>
    </div>
  );
}
