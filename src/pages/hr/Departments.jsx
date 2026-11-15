import { useEffect, useState } from "react";
import Swal from "sweetalert2";
import CrudPage from "../../components/CrudPage";
import { get, put } from "../../api/axios";
import Select2 from "../../components/hr/Select2";

/**
 * The four verticals under Leadership, and who leads each.
 *
 * This is where WEN's structure becomes something the system can act on: a
 * lead named here can manage every colleague in every department beneath their
 * vertical, without being handed the run of the whole HR module to do it.
 */
function VerticalsPanel() {
  const [verticals, setVerticals] = useState([]);
  const [staff, setStaff] = useState([]);
  const [savingId, setSavingId] = useState(null);
  const [open, setOpen] = useState(true);

  const load = () =>
    get("/hr/departments/verticals")
      .then((r) => setVerticals(r.data?.data || []))
      .catch(() => setVerticals([]));

  useEffect(() => {
    load();
    // Every employee is eligible to lead — the whole list, not a filtered guess.
    get("/hr/staff/list?per_page=1000")
      .then((r) => {
        const rows = r.data?.data?.data || r.data?.data || [];
        setStaff(
          (Array.isArray(rows) ? rows : []).map((s) => ({
            id: s.id,
            name: s.application?.full_name || s.full_name || `Staff #${s.employee_id}`,
          })),
        );
      })
      .catch(() => setStaff([]));
  }, []);

  const setLead = async (vertical, staffId) => {
    setSavingId(vertical.id);
    try {
      await put(`/hr/departments/verticals/${vertical.id}`, { lead_staff_id: staffId || null });
      await load();
    } catch (e) {
      Swal.fire("Error", e.response?.data?.message || "Could not save the lead.", "error");
    } finally {
      setSavingId(null);
    }
  };

  if (!verticals.length) return null;

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm mb-4">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="w-full px-5 py-4 flex items-center justify-between text-left"
      >
        <div>
          <h2 className="text-sm font-bold text-gray-800">Organisational structure</h2>
          <p className="text-[11px] text-gray-400 mt-0.5">
            Four verticals under Leadership. A lead manages everyone in the departments beneath them.
          </p>
        </div>
        <span className="text-xs text-gray-400">{open ? "Hide" : "Show"}</span>
      </button>

      {open && (
        <div className="px-5 pb-5 grid grid-cols-1 lg:grid-cols-2 gap-3">
          {verticals.map((v) => (
            <div key={v.id} className="border border-gray-200 rounded-xl p-4">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-gray-800">{v.name}</p>
                  <p className="text-[11px] text-gray-400">{v.description}</p>
                </div>
                <span className="text-[10px] px-2 py-1 rounded-full bg-gray-100 text-gray-600 whitespace-nowrap">
                  {v.departments.length} dept · {v.staff_count} staff
                </span>
              </div>

              <div className="mt-3">
                <p className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider mb-1.5">Lead</p>
                <Select2
                  size="sm"
                  value={v.lead_staff_id ? String(v.lead_staff_id) : ""}
                  onChange={(id) => setLead(v, id)}
                  placeholder={savingId === v.id ? "Saving…" : "Search for the lead…"}
                  options={staff.map((s) => ({ value: String(s.id), label: s.name }))}
                />
                {/* A vertical with no lead still exists — the structure does not
                    disappear because the post is vacant — but nobody holds its
                    scope, so say so rather than showing an empty box. */}
                {!v.lead_staff_id && (
                  <p className="text-[10px] text-amber-600 mt-1">
                    No lead named — nobody currently has this vertical's scope.
                  </p>
                )}
              </div>

              {v.departments.length > 0 && (
                <div className="mt-3 flex flex-wrap gap-1.5">
                  {v.departments.map((d) => (
                    <span key={d.id} className="text-[10px] px-2 py-0.5 rounded-full bg-teal-50 text-teal-700 border border-teal-100">
                      {d.name}
                    </span>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default function Departments() {
  return (
    <>
      <div className="px-4 pt-4">
        <VerticalsPanel />
      </div>
      <CrudPage
      permissionBase="departments"
      title="Departments"
      apiEndpoint="/hr/departments/list"
      deleteEndpoint="/hr/departments/delete"
      listColumns={[
        { key: "name", label: "Department" },
        { key: "code", label: "Code" },
        {
          key: "vertical",
          label: "Vertical",
          render: (val) =>
            val?.name ? (
              <span className="px-2 py-1 text-xs font-medium rounded-full bg-teal-50 text-teal-700">{val.name}</span>
            ) : (
              <span className="text-xs text-amber-600">not placed</span>
            ),
        },
        { key: "description", label: "Description" },
        {
          key: "is_active",
          label: "Status",
          render: (val) => (
            <span
              className={`px-2 py-1 text-xs font-medium rounded-full ${
                val ? "bg-green-100 text-green-800" : "bg-gray-100 text-gray-700"
              }`}
            >
              {val ? "Active" : "Inactive"}
            </span>
          ),
        },
      ]}
      createRoute="/hr/departments/create"
      editRoute="/hr/departments/edit"
      showRoute="/hr/departments/show"
      />
    </>
  );
}
