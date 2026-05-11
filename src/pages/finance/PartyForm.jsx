import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { createParty } from "../../api/financial";
import { get } from "../../api/axios";
import Swal from "sweetalert2";

/**
 * Add a Party. A Party is just a money-tracking link to either a Staff or
 * Vendor record — identity (name / phone / email) lives on that source row
 * and is shown via accessors, not duplicated here.
 *
 *   Staff parties  → for advance / expense / repayment flows
 *   Vendor parties → for supplier payables
 *
 * The form picks the source record and (optionally) sets an opening balance
 * and a note. That's it.
 */

const PARTY_TYPES = [
  {
    value: "staff",
    label: "Staff",
    description: "An employee or teacher receiving advances",
    source: "/hr/staff/list",
    sourceLabel: "Staff member",
  },
  {
    value: "vendor",
    label: "Vendor",
    description: "A supplier the school pays / buys from",
    source: "/hr/vendors/list",
    sourceLabel: "Vendor",
  },
];

// Only operations-side staff can hold money on the school's books — teachers
// and other academic staff are paid through payroll, not the parties ledger.
const ALLOWED_STAFF_DEPARTMENTS = [
  "Human Resources",
  "Finance",
  "Administration",
  "Operation",
];

const fmtMoney = (n) => Number(n || 0).toLocaleString();

export default function PartyForm() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [partyType, setPartyType] = useState("staff");
  const [linkId, setLinkId] = useState("");          // staff_id or vendor_id depending on partyType
  const [openingBalance, setOpeningBalance] = useState("0");
  const [notes, setNotes] = useState("");
  const [search, setSearch] = useState("");

  // Source lists keyed by partyType (staff vs vendor).
  const [staffList, setStaffList] = useState([]);
  const [vendorList, setVendorList] = useState([]);

  useEffect(() => {
    // per_page=1000 because the list endpoint paginates at 15 by default and
    // we need every eligible staff row available for client-side filtering.
    get("/hr/staff/list", { params: { per_page: 1000 } })
      .then((r) => {
        const rows = r.data?.data?.data || r.data?.data || [];
        setStaffList(rows.filter((s) => ALLOWED_STAFF_DEPARTMENTS.includes(s.department)));
      })
      .catch(() => setStaffList([]));
    // The vendors list endpoint may not exist on every install — try the most
    // common shapes and quietly fall back to an empty list.
    Promise.any([
      get("/hr/vendors/list"),
      get("/hr/add-vendor"),
      get("/vendors"),
    ])
      .then((r) => setVendorList(r.data?.data?.data || r.data?.data || []))
      .catch(() => setVendorList([]));
  }, []);

  const typeMeta = useMemo(
    () => PARTY_TYPES.find((t) => t.value === partyType) || PARTY_TYPES[0],
    [partyType]
  );

  // Build the searchable option list for the active type.
  const options = useMemo(() => {
    const src = partyType === "staff" ? staffList : vendorList;
    const q = search.trim().toLowerCase();
    const list = (src || []).map((row) => {
      if (partyType === "staff") {
        const name = `${row.first_name || ""} ${row.last_name || ""}`.trim() || row.full_name || `Staff #${row.id}`;
        return {
          id: row.id,
          name,
          uniqueId: row.employee_id || `STA-${String(row.id).padStart(5, "0")}`,
          subtitle: row.role_title_en || row.department || row.contract_type || null,
        };
      }
      const name = row.name || row.full_name || `Vendor #${row.id}`;
      return {
        id: row.id,
        name,
        uniqueId: `VND-${String(row.id).padStart(5, "0")}`,
        subtitle: row.category || row.work_type || row.contact || null,
      };
    });
    if (!q) return list.slice(0, 100);
    return list
      .filter((o) =>
        o.name.toLowerCase().includes(q) ||
        (o.uniqueId || "").toLowerCase().includes(q) ||
        (o.subtitle || "").toLowerCase().includes(q)
      )
      .slice(0, 100);
  }, [partyType, staffList, vendorList, search]);

  const handleTypeChange = (value) => {
    setPartyType(value);
    setLinkId("");
    setSearch("");
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!linkId) {
      Swal.fire("Pick a record", `Select a ${typeMeta.sourceLabel.toLowerCase()} to link this party to.`, "warning");
      return;
    }
    setLoading(true);
    try {
      await createParty({
        party_type: partyType,
        staff_id:  partyType === "staff"  ? linkId : null,
        vendor_id: partyType === "vendor" ? linkId : null,
        opening_balance: Number(openingBalance) || 0,
        notes: notes || null,
      });
      Swal.fire("Created", "Party is ready for advances / payments.", "success");
      navigate("/finance/parties");
    } catch (err) {
      const status = err.response?.status;
      const msg = err.response?.data?.message || "Could not create party.";
      if (status === 409) {
        Swal.fire("Already exists", msg, "info");
      } else {
        Swal.fire("Failed", msg, "error");
      }
    } finally {
      setLoading(false);
    }
  };

  const openingNumber = Number(openingBalance) || 0;
  const selectedOption = options.find((o) => String(o.id) === String(linkId));

  return (
    <div className="px-4 py-4 mx-auto">
      <div className="flex items-center gap-2 mb-4">
        <button
          onClick={() => navigate("/finance/parties")}
          className="p-2 text-gray-500 hover:text-teal-600 hover:bg-teal-50 rounded-lg"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <div>
          <h2 className="text-base font-bold text-gray-800">Add Party</h2>
          <p className="text-[11px] text-gray-500">
            A money-tracking link to a Staff or Vendor record. Identity is pulled from the source — no duplicate data here.
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="bg-white rounded-xl border border-gray-200 shadow-sm p-5 space-y-4">
        {/* Type pills */}
        <div>
          <label className="block text-[10px] font-semibold text-gray-500 uppercase mb-1.5">Party Type *</label>
          <div className="grid grid-cols-2 gap-2">
            {PARTY_TYPES.map((t) => (
              <button
                key={t.value}
                type="button"
                onClick={() => handleTypeChange(t.value)}
                className={`text-left border rounded-lg p-3 transition-colors ${
                  partyType === t.value
                    ? "bg-teal-600 border-teal-600 text-white"
                    : "bg-white border-gray-200 text-gray-700 hover:border-teal-300"
                }`}
              >
                <p className={`text-sm font-bold ${partyType === t.value ? "text-white" : "text-gray-800"}`}>
                  {t.label}
                </p>
                <p className={`text-[10px] mt-0.5 ${partyType === t.value ? "text-teal-100" : "text-gray-500"}`}>
                  {t.description}
                </p>
              </button>
            ))}
          </div>
        </div>

        {/* Source record picker (search + scrollable list) */}
        <div>
          <label className="block text-[10px] font-semibold text-gray-500 uppercase mb-1.5">
            {typeMeta.sourceLabel} *
            <span className="text-gray-400 normal-case font-normal ml-1">— search by name or unique id</span>
          </label>

          <div className="relative mb-2">
            <svg className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="m21 21-6-6m2-5a7 7 0 1 1-14 0 7 7 0 0 1 14 0z" />
            </svg>
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={`Search ${typeMeta.sourceLabel.toLowerCase()}…`}
              className="w-full pl-8 pr-2 py-2 text-xs border border-gray-200 rounded-lg focus:outline-none focus:border-teal-500"
            />
          </div>

          <div className="max-h-60 overflow-auto border border-gray-100 rounded-lg divide-y divide-gray-50 bg-white">
            {options.length === 0 ? (
              <div className="text-center py-6 text-xs text-gray-400 italic">
                {search ? "No matches." : `No ${typeMeta.sourceLabel.toLowerCase()} records loaded yet.`}
              </div>
            ) : (
              options.map((o) => {
                const selected = String(linkId) === String(o.id);
                return (
                  <button
                    key={o.id}
                    type="button"
                    onClick={() => setLinkId(o.id)}
                    className={`w-full text-left px-3 py-2 flex items-center justify-between gap-3 transition-colors ${
                      selected ? "bg-teal-50" : "hover:bg-gray-50"
                    }`}
                  >
                    <div className="min-w-0">
                      <p className={`text-xs font-semibold truncate ${selected ? "text-teal-800" : "text-gray-800"}`}>
                        {o.name}
                      </p>
                      {o.subtitle && (
                        <p className="text-[10px] text-gray-500 truncate">{o.subtitle}</p>
                      )}
                    </div>
                    <span className={`text-[10px] font-mono flex-shrink-0 px-1.5 py-0.5 rounded ${
                      selected ? "bg-teal-100 text-teal-800" : "bg-gray-100 text-gray-600"
                    }`}>
                      {o.uniqueId}
                    </span>
                  </button>
                );
              })
            )}
          </div>

          {selectedOption && (
            <p className="text-[10px] text-teal-700 mt-1.5">
              ✓ Linking to <strong>{selectedOption.name}</strong> ({selectedOption.uniqueId}).
            </p>
          )}
        </div>

        {/* Opening balance with signage explanation */}
        <div>
          <label className="block text-[10px] font-semibold text-gray-500 uppercase mb-1">Opening Balance (AFN)</label>
          <input
            type="number"
            value={openingBalance}
            onChange={(e) => setOpeningBalance(e.target.value)}
            step="0.01"
            className="w-full px-3 py-2 text-xs border border-gray-200 rounded-lg focus:outline-none focus:border-teal-500"
          />
          <p className="text-[10px] text-gray-500 mt-1">
            {openingNumber > 0 ? (
              <span className="text-red-700"><strong>{fmtMoney(openingNumber)} AFN</strong> — already owes the school</span>
            ) : openingNumber < 0 ? (
              <span className="text-amber-700"><strong>{fmtMoney(Math.abs(openingNumber))} AFN</strong> — school already owes them</span>
            ) : (
              <span className="text-emerald-700"><strong>Settled</strong> — zero starting balance</span>
            )}
            {" · Leave at 0 for new parties."}
          </p>
        </div>

        {/* Notes */}
        <div>
          <label className="block text-[10px] font-semibold text-gray-500 uppercase mb-1">Notes</label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={2}
            className="w-full px-3 py-2 text-xs border border-gray-200 rounded-lg focus:outline-none focus:border-teal-500"
            placeholder="Optional context"
          />
        </div>

        <div className="flex items-center gap-2 pt-2 border-t border-gray-100">
          <button
            type="submit"
            disabled={loading || !linkId}
            className="px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 text-xs font-semibold disabled:opacity-50"
          >
            {loading ? "Creating…" : "Create party"}
          </button>
          <button
            type="button"
            onClick={() => navigate("/finance/parties")}
            className="px-4 py-2 bg-white border border-gray-200 text-gray-600 rounded-lg hover:bg-gray-50 text-xs font-medium"
          >
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
}
