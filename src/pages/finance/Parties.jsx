import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { getParties, createParty } from "../../api/financial";
import Swal from "sweetalert2";

const typeColors = {
  student: { color: "bg-blue-50 text-blue-700 border-blue-200", icon: "bg-blue-100 text-blue-600" },
  employee: { color: "bg-purple-50 text-purple-700 border-purple-200", icon: "bg-purple-100 text-purple-600" },
  supplier: { color: "bg-orange-50 text-orange-700 border-orange-200", icon: "bg-orange-100 text-orange-600" },
  parent: { color: "bg-emerald-50 text-emerald-700 border-emerald-200", icon: "bg-emerald-100 text-emerald-600" },
  teacher: { color: "bg-indigo-50 text-indigo-700 border-indigo-200", icon: "bg-indigo-100 text-indigo-600" },
  staff: { color: "bg-pink-50 text-pink-700 border-pink-200", icon: "bg-pink-100 text-pink-600" },
  other: { color: "bg-gray-50 text-gray-700 border-gray-200", icon: "bg-gray-100 text-gray-600" },
};

export default function Parties() {
  const navigate = useNavigate();
  const [items, setItems] = useState([]);
  const [filter, setFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchParties();
  }, []);

  const fetchParties = async () => {
    setLoading(true);
    try {
      const params = {};
      if (filter !== "all") params.party_type = filter;
      if (search) params.search = search;
      const response = await getParties(params);
      setItems(response.data?.data?.data || response.data?.data || []);
    } catch (error) {
      console.error('Failed to fetch parties:', error);
      setItems([]);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (e) => {
    setSearch(e.target.value);
    fetchParties();
  };

  const filtered = filter === "all" ? items : items.filter((i) => i.party_type === filter);

  const stats = {
    total: items.length,
    employees: items.filter((i) => i.party_type === "employee").length,
    students: items.filter((i) => i.party_type === "student").length,
    suppliers: items.filter((i) => i.party_type === "supplier").length,
  };

  return (
    <div className="px-4 py-4">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
        <div>
          <h2 className="text-base font-bold text-gray-800">Parties</h2>
          <p className="text-xs text-gray-500">Trackable persons: employees, students, suppliers, parents</p>
        </div>
        <button onClick={() => navigate("/finance/parties/create")}
          className="px-3 py-1.5 bg-teal-600 text-white rounded-lg hover:bg-teal-700 text-xs font-medium flex items-center gap-1.5">
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Add Party
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-4">
        <div className="bg-gradient-to-r from-teal-600 to-teal-700 rounded-xl p-3 text-white">
          <p className="text-[10px] uppercase tracking-wider text-teal-200">Total Parties</p>
          <p className="text-xl font-bold">{stats.total}</p>
        </div>
        <div className="bg-white rounded-xl p-3 border border-gray-200">
          <p className="text-[10px] uppercase tracking-wider text-gray-500">Employees</p>
          <p className="text-xl font-bold text-purple-600">{stats.employees}</p>
        </div>
        <div className="bg-white rounded-xl p-3 border border-gray-200">
          <p className="text-[10px] uppercase tracking-wider text-gray-500">Students</p>
          <p className="text-xl font-bold text-blue-600">{stats.students}</p>
        </div>
        <div className="bg-white rounded-xl p-3 border border-gray-200">
          <p className="text-[10px] uppercase tracking-wider text-gray-500">Suppliers</p>
          <p className="text-xl font-bold text-orange-600">{stats.suppliers}</p>
        </div>
      </div>

      {/* Filter & Search */}
      <div className="flex flex-col sm:flex-row gap-3 mb-4">
        <div className="flex gap-2">
          {["all", "employee", "student", "supplier", "parent"].map((t) => (
            <button key={t} onClick={() => setFilter(t)}
              className={`px-3 py-1.5 rounded-lg text-[10px] font-semibold transition-colors ${filter === t ? "bg-teal-600 text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200"}`}>
              {t.charAt(0).toUpperCase() + t.slice(1)}
            </button>
          ))}
        </div>
        <input type="text" value={search} onChange={handleSearch} placeholder="Search by name or code..."
          className="flex-1 px-3 py-1.5 text-xs border border-gray-200 rounded-lg focus:outline-none focus:border-teal-500" />
      </div>

      {/* Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {filtered.map((party) => {
          const tc = typeColors[party.party_type] || typeColors.other;
          const balancePositive = party.current_balance > 0;
          return (
            <div key={party.id} className="bg-white rounded-xl border border-gray-200 p-4 hover:shadow-sm transition-shadow cursor-pointer"
              onClick={() => navigate(`/finance/parties/${party.id}/ledger`)}>
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-2.5">
                  <div className={`w-10 h-10 rounded-xl ${tc.icon} flex items-center justify-center`}>
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                    </svg>
                  </div>
                  <div>
                    <p className="text-xs font-bold text-gray-800">{party.full_name}</p>
                    <p className="text-[10px] text-gray-400 font-mono">{party.party_code}</p>
                  </div>
                </div>
                <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold border ${tc.color}`}>
                  {party.party_type}
                </span>
              </div>

              <div className="bg-gray-50 rounded-lg p-3 mb-3">
                <p className="text-[10px] text-gray-500 mb-1">Current Balance</p>
                <p className={`text-lg font-bold ${balancePositive ? "text-emerald-600" : party.current_balance < 0 ? "text-red-600" : "text-gray-600"}`}>
                  {party.current_balance > 0 ? "+" : ""}{party.current_balance.toLocaleString()} AFN
                </p>
              </div>

              <p className="text-[10px] text-gray-400">Open card for full ledger history.</p>
            </div>
          );
        })}
      </div>

      {filtered.length === 0 && (
        <div className="text-center py-12 text-xs text-gray-400">
          No parties found. Add a party to start tracking.
        </div>
      )}
    </div>
  );
}
