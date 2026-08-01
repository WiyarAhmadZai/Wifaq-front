import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { getParties, deleteParty } from "../../api/financial";
import { peekCache } from "../../api/axios";
import { useResourcePermissions } from "../../admin/utils/useResourcePermissions";
import Swal from "sweetalert2";

const typeColors = {
  staff:  { color: "bg-teal-50 text-teal-700 border-teal-200",      icon: "bg-teal-100 text-teal-600" },
  vendor: { color: "bg-orange-50 text-orange-700 border-orange-200", icon: "bg-orange-100 text-orange-600" },
};

export default function Parties() {
  const navigate = useNavigate();
  // Any authenticated staff can open this page to see their OWN party (the
  // backend row-scopes the list), so the write actions have to be gated here
  // rather than assumed from page access.
  const { canCreate, canUpdate, canDelete } = useResourcePermissions("parties");
  const [items, setItems] = useState([]);
  const [filter, setFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(false);
  // Server-side paging. The list used to render only whatever the first
  // response happened to contain, so anyone past the first page simply was not
  // on the screen — a party could save fine and still never appear.
  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(24);
  const [meta, setMeta] = useState({ total: 0, last_page: 1, from: 0, to: 0 });
  // Totals come from the server, over every matching row rather than the page
  // in front of you — otherwise they would change as you page through.
  const [stats, setStats] = useState({ total: 0, staff: 0, vendor: 0, owed_to: 0, owed_by: 0 });

  // Debounced so typing doesn't fire a request per keystroke. Filter and page
  // are dependencies too: the search box used to call fetchParties() directly
  // from onChange, which read the PREVIOUS search value off a stale closure and
  // left results one keystroke behind.
  const [debounced, setDebounced] = useState("");
  // Bumped after a delete so the page, totals and count are re-read rather
  // than patched locally — with paging, dropping a row locally leaves the
  // "showing 1–24 of 60" line lying.
  const [refreshKey, setRefreshKey] = useState(0);
  useEffect(() => {
    const t = setTimeout(() => setDebounced(search.trim()), 300);
    return () => clearTimeout(t);
  }, [search]);

  // Any change to what is being asked for goes back to page 1 — staying on
  // page 5 of a fresh search shows an empty list.
  useEffect(() => { setPage(1); }, [debounced, filter, perPage]);

  useEffect(() => {
    let cancelled = false;

    const run = async () => {
      setLoading(true);
      const params = { page, per_page: perPage };
      if (filter !== "all") params.party_type = filter;
      if (debounced) params.search = debounced;

      const apply = (payload) => {
        if (cancelled || !payload) return;
        const p = payload.data ?? {};
        setItems(p.data ?? []);
        setMeta({
          total: p.total ?? 0,
          last_page: p.last_page ?? 1,
          from: p.from ?? 0,
          to: p.to ?? 0,
        });
        if (payload.stats) setStats(payload.stats);
      };

      try {
        apply(peekCache('/financial/parties', params));
        const response = await getParties(params);
        apply(response.data);
      } catch (error) {
        if (!cancelled) {
          console.error('Failed to fetch parties:', error);
          setItems([]);
          setMeta({ total: 0, last_page: 1, from: 0, to: 0 });
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    run();
    // Guards against an out-of-order response overwriting a newer one.
    return () => { cancelled = true; };
  }, [page, perPage, filter, debounced, refreshKey]);

  const handleDelete = async (party) => {
    const r = await Swal.fire({
      title: "Delete party?",
      html: `<span class="text-sm">${party.full_name || party.party_code} (${party.unique_id || party.party_code})</span>`,
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#ef4444",
      confirmButtonText: "Delete",
    });
    if (!r.isConfirmed) return;
    try {
      await deleteParty(party.id);
      setRefreshKey((k) => k + 1);
      Swal.fire({
        toast: true, position: "top-end", icon: "success",
        title: "Party deleted", timer: 1500, showConfirmButton: false,
      });
    } catch (error) {
      // 422 = the party still has ledger entries / payments / invoices.
      Swal.fire("Cannot delete", error.response?.data?.message || "Failed to delete party.", "error");
    }
  };

  // The server already applied party_type, search and paging — re-filtering
  // here would hide rows it deliberately returned.
  const filtered = items;

  return (
    <div className="px-4 py-4">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
        <div>
          <h2 className="text-base font-bold text-gray-800">Parties</h2>
          <p className="text-xs text-gray-500">Staff (advances) and Vendors (payables)</p>
        </div>
        {canCreate && (
          <button onClick={() => navigate("/finance/parties/create")}
            className="px-3 py-1.5 bg-teal-600 text-white rounded-lg hover:bg-teal-700 text-xs font-medium flex items-center gap-1.5">
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Add Party
          </button>
        )}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-4">
        <div className="bg-gradient-to-r from-teal-600 to-teal-700 rounded-xl p-3 text-white">
          <p className="text-[10px] uppercase tracking-wider text-teal-200">Total parties</p>
          <p className="text-xl font-bold">{stats.total}</p>
          <p className="text-[10px] text-teal-100 mt-0.5">{stats.staff} staff · {stats.vendor} vendor</p>
        </div>
        <div className="bg-white rounded-xl p-3 border border-gray-200">
          <p className="text-[10px] uppercase tracking-wider text-gray-500">Owed to school</p>
          <p className="text-xl font-bold text-red-600">{Number(stats.owed_to).toLocaleString()} <span className="text-[10px] font-normal text-gray-500">AFN</span></p>
        </div>
        <div className="bg-white rounded-xl p-3 border border-gray-200">
          <p className="text-[10px] uppercase tracking-wider text-gray-500">Owed by school</p>
          <p className="text-xl font-bold text-amber-600">{Number(stats.owed_by).toLocaleString()} <span className="text-[10px] font-normal text-gray-500">AFN</span></p>
        </div>
        <div className="bg-white rounded-xl p-3 border border-gray-200">
          <p className="text-[10px] uppercase tracking-wider text-gray-500">Net</p>
          <p className="text-xl font-bold text-gray-800">{(Number(stats.owed_to) - Number(stats.owed_by)).toLocaleString()} <span className="text-[10px] font-normal text-gray-500">AFN</span></p>
        </div>
      </div>

      {/* Filter & Search */}
      <div className="flex flex-col sm:flex-row gap-3 mb-4">
        <div className="flex gap-2">
          {["all", "staff", "vendor"].map((t) => (
            <button key={t} onClick={() => setFilter(t)}
              className={`px-3 py-1.5 rounded-lg text-[10px] font-semibold transition-colors capitalize ${filter === t ? "bg-teal-600 text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200"}`}>
              {t}
            </button>
          ))}
        </div>
        {/* Searches the whole table server-side, not just the page on screen. */}
        <input type="text" value={search} onChange={(e) => setSearch(e.target.value)}
          placeholder="Search all parties — name, employee ID, department, party code, vendor…"
          className="flex-1 px-3 py-1.5 text-xs border border-gray-200 rounded-lg focus:outline-none focus:border-teal-500" />
        {search && (
          <button onClick={() => setSearch("")}
            className="px-2.5 py-1.5 text-[10px] font-semibold text-gray-500 bg-gray-100 rounded-lg hover:bg-gray-200">
            Clear
          </button>
        )}
      </div>

      {/* Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {filtered.map((party) => {
          const tc = typeColors[party.party_type] || { color: "bg-gray-50 text-gray-700 border-gray-200", icon: "bg-gray-100 text-gray-600" };
          const isStaff = party.party_type === "staff";
          return (
            <div key={party.id} className="bg-white rounded-xl border border-gray-200 p-4 hover:shadow-sm transition-shadow cursor-pointer"
              onClick={() => navigate(`/finance/parties/${party.id}/ledger`)}>
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-2.5">
                  <div className={`w-10 h-10 rounded-xl ${tc.icon} flex items-center justify-center`}>
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      {isStaff ? (
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                      ) : (
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                      )}
                    </svg>
                  </div>
                  <div>
                    <p className="text-xs font-bold text-gray-800">{party.full_name || `(${party.party_code})`}</p>
                    <p className="text-[10px] text-gray-500 font-mono">{party.unique_id || party.party_code}</p>
                  </div>
                </div>
                <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold border capitalize ${tc.color}`}>
                  {party.party_type}
                </span>
              </div>

              <div className="bg-gray-50 rounded-lg p-3 mb-3">
                <p className="text-[10px] text-gray-500 mb-1">Current Balance</p>
                {(() => {
                  const bal = Number(party.balance || 0);
                  const tone = bal > 0 ? "text-red-700" : bal < 0 ? "text-amber-700" : "text-emerald-700";
                  const label = bal > 0 ? "owes school" : bal < 0 ? "school owes party" : "settled";
                  return (
                    <>
                      <p className={`text-lg font-bold ${tone}`}>
                        {bal >= 0 ? "" : "−"}{Math.abs(bal).toLocaleString()} <span className="text-xs">AFN</span>
                      </p>
                      <p className={`text-[9px] uppercase tracking-wider mt-0.5 font-semibold ${tone}`}>{label}</p>
                    </>
                  );
                })()}
              </div>

              {/* Action row — buttons stop propagation so they don't trigger
                  the card's navigate-to-ledger click handler. */}
              <div className="flex gap-2 pt-2 border-t border-gray-100">
                <button
                  onClick={(e) => { e.stopPropagation(); navigate(`/finance/parties/${party.id}/ledger`); }}
                  className="flex-1 py-1 text-[10px] font-medium text-gray-600 bg-gray-50 rounded-lg hover:bg-gray-100">
                  Ledger
                </button>
                {canUpdate && (
                  <button
                    onClick={(e) => { e.stopPropagation(); navigate(`/finance/parties/edit/${party.id}`); }}
                    className="flex-1 py-1 text-[10px] font-medium text-teal-600 bg-teal-50 rounded-lg hover:bg-teal-100">
                    Edit
                  </button>
                )}
                {canDelete && (
                  <button
                    onClick={(e) => { e.stopPropagation(); handleDelete(party); }}
                    className="flex-1 py-1 text-[10px] font-medium text-red-600 bg-red-50 rounded-lg hover:bg-red-100">
                    Delete
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {loading && <p className="text-center text-xs text-gray-400 py-4">Loading…</p>}

      {!loading && filtered.length === 0 && (
        <div className="text-center py-12 text-xs text-gray-400">
          {debounced
            ? <>No party matches “{debounced}”. The search covers every party, not just this page.</>
            : "No parties found. Add a party to start tracking."}
        </div>
      )}

      {/* Pagination. Always shows the range and total so it is obvious when
          there are more parties than the ones on screen. */}
      {!loading && meta.total > 0 && (
        <div className="mt-4 flex flex-col sm:flex-row items-center justify-between gap-3 border-t border-gray-100 pt-3">
          <p className="text-[11px] text-gray-500">
            Showing <span className="font-semibold text-gray-700">{meta.from}–{meta.to}</span> of{" "}
            <span className="font-semibold text-gray-700">{meta.total}</span>
            {debounced ? " matching" : ""} part{meta.total === 1 ? "y" : "ies"}
          </p>

          <div className="flex items-center gap-3">
            <label className="flex items-center gap-1.5 text-[11px] text-gray-500">
              Per page
              <select value={perPage} onChange={(e) => setPerPage(Number(e.target.value))}
                className="px-2 py-1 text-[11px] border border-gray-200 rounded-lg focus:outline-none focus:border-teal-500">
                {[12, 24, 48, 96].map((n) => <option key={n} value={n}>{n}</option>)}
              </select>
            </label>

            <div className="flex items-center gap-1">
              <button onClick={() => setPage(1)} disabled={page <= 1}
                className="px-2 py-1 text-[11px] border border-gray-200 rounded-lg disabled:opacity-40 hover:bg-gray-50">«</button>
              <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page <= 1}
                className="px-2.5 py-1 text-[11px] border border-gray-200 rounded-lg disabled:opacity-40 hover:bg-gray-50">Prev</button>
              <span className="px-2 text-[11px] text-gray-600">
                Page <span className="font-semibold">{page}</span> of {meta.last_page}
              </span>
              <button onClick={() => setPage((p) => Math.min(meta.last_page, p + 1))} disabled={page >= meta.last_page}
                className="px-2.5 py-1 text-[11px] border border-gray-200 rounded-lg disabled:opacity-40 hover:bg-gray-50">Next</button>
              <button onClick={() => setPage(meta.last_page)} disabled={page >= meta.last_page}
                className="px-2 py-1 text-[11px] border border-gray-200 rounded-lg disabled:opacity-40 hover:bg-gray-50">»</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
