import { useState } from "react";
import Swal from "sweetalert2";
import CrudPage from "../../components/CrudPage";
import { put } from "../../api/axios";
import { useAuth } from "../../admin/context/AuthContext";
import AudiencePicker, {
  emptyAudience, audienceIsComplete, useAudienceOptions,
} from "../../components/broadcasts/AudiencePicker";

const TEAL = "#0D5C63";
const GOLD_LT = "#FFF8E7";
const GOLD_SOFT = "#E8D48B";
const GOLD_DEEP = "#8A6F10";

/**
 * Broadcast history.
 *
 * Publishing a new message supersedes the previous one, so the list's real job
 * is to make clear WHICH single row is on screen for everyone right now — the
 * "Live now" badge. Everything below it is history.
 */
export default function Broadcasts() {
  const { hasPermission } = useAuth();
  const canRetarget = hasPermission("broadcasts.update") || hasPermission("broadcasts.manage");

  // The row whose audience is being changed, with the list's refresh callback.
  const [retarget, setRetarget] = useState(null); // { item, refresh }
  const [draft, setDraft] = useState(emptyAudience());
  const [saving, setSaving] = useState(false);
  const { options, loading: optionsLoading } = useAudienceOptions();

  const openRetarget = (item, refresh) => {
    setDraft({
      audience: item.audience || "all",
      department_ids: item.department_ids || [],
      user_ids: item.user_ids || [],
    });
    setRetarget({ item, refresh });
  };

  const saveRetarget = async () => {
    if (!audienceIsComplete(draft)) {
      return Swal.fire("Who is it for?", "Pick at least one department or person, or send it to everyone.", "info");
    }
    setSaving(true);
    try {
      await put(`/broadcasts/audience/${retarget.item.id}`, {
        audience: draft.audience,
        department_ids: draft.audience === "departments" ? draft.department_ids : [],
        user_ids: draft.audience === "users" ? draft.user_ids : [],
      });
      retarget.refresh?.();
      setRetarget(null);
      Swal.fire({ icon: "success", title: "Audience updated", timer: 1200, showConfirmButton: false });
    } catch (err) {
      Swal.fire("Error", err.response?.data?.message
        || Object.values(err.response?.data?.errors || {})[0]?.[0]
        || "Failed to update the audience.", "error");
    } finally { setSaving(false); }
  };

  return (
    <>
    <CrudPage
      permissionBase="broadcasts"
      title="Broadcast Messages"
      apiEndpoint="/broadcasts/index"
      createRoute="/broadcasts/create"
      editRoute="/broadcasts/edit"
      deleteEndpoint="/broadcasts/delete"
      searchable
      searchFields={["title", "body", "author"]}
      statusEndpoint="/broadcasts/status"
      statusField="is_active"
      /* Turning a broadcast on or off without opening the editor. CrudPage only
       * renders its status action when it is told what the choices ARE, so the
       * button was missing purely because this list never said. Gated by
       * broadcasts.update / broadcasts.manage like Edit is — same permission,
       * because switching a message live is the same act of publishing it. */
      statusOptions={[
        { value: 1, label: "Active — show to everyone" },
        { value: 0, label: "Off — hide from everyone" },
      ]}
      listColumns={[
        {
          key: "title",
          label: "Message",
          render: (val, row) => (
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <bdi dir="auto" className="font-semibold text-[#0A3A3E]">{val || "(no title)"}</bdi>
                {row.is_current && (
                  <span className="px-2 py-0.5 rounded-full text-[9px] font-black border whitespace-nowrap"
                    style={{ background: GOLD_LT, color: GOLD_DEEP, borderColor: GOLD_SOFT }}>
                    ● LIVE NOW
                  </span>
                )}
              </div>
              <bdi dir="auto" className="block text-[11px] text-[#8AA4A7] truncate max-w-md">{row.body}</bdi>
            </div>
          ),
        },
        { key: "author", label: "Published by", render: (v) => <bdi dir="auto">{v || "—"}</bdi> },
        {
          key: "audience_label",
          label: "Audience",
          render: (v, row) => (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-semibold border max-w-[220px]"
              title={v || "Everyone"}
              style={row.audience === "all" || !row.audience
                ? { background: "#E8F6F6", color: TEAL, borderColor: "#CFE6E6" }
                : { background: GOLD_LT, color: GOLD_DEEP, borderColor: GOLD_SOFT }}>
              <span aria-hidden="true">{row.audience === "users" ? "👤" : row.audience === "departments" ? "🏷" : "📢"}</span>
              <bdi dir="auto" className="truncate">{v || "Everyone"}</bdi>
            </span>
          ),
        },
        { key: "published_at", label: "Published", render: (v) => (v || "").slice(0, 16) },
        {
          key: "reads_count",
          label: "Seen by",
          render: (v) => (
            <span className="px-2 py-0.5 rounded-md text-[10px] font-bold"
              style={{ background: "#E8F6F6", color: TEAL }}>
              {v || 0}
            </span>
          ),
        },
        {
          key: "is_active",
          label: "Status",
          // isStatus hands the badge the same opener the action button uses, so
          // clicking the thing you want to change works as well as hunting for
          // the icon at the end of the row.
          isStatus: true,
          render: (v, row, onClick) => (
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); onClick?.(row); }}
              disabled={!onClick}
              title={onClick ? "Change status" : undefined}
              className={`px-2 py-0.5 rounded-full text-[10px] font-semibold border transition-opacity ${
                onClick ? "cursor-pointer hover:opacity-80" : "cursor-default"
              } ${
                v ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                  : "bg-gray-50 text-gray-600 border-gray-200"
              }`}>
              {v ? "Active" : "Off"}
            </button>
          ),
        },
      ]}
      rowActions={canRetarget ? (item, refresh) => (
        <button type="button" onClick={() => openRetarget(item, refresh)}
          className="p-1.5 rounded-lg transition-colors hover:bg-amber-50" style={{ color: GOLD_DEEP }}
          title="Change audience">
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
              d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
          </svg>
        </button>
      ) : null}
    />

    {/* Change who a message is for, without opening the editor. */}
    {retarget && (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-100 flex items-start justify-between gap-3"
            style={{ background: GOLD_LT }}>
            <div className="min-w-0">
              <h3 className="text-sm font-bold" style={{ color: "#0A3A3E" }}>Change audience</h3>
              <bdi dir="auto" className="block text-[11px] text-gray-500 truncate">
                {retarget.item.title || retarget.item.body}
              </bdi>
            </div>
            <button type="button" onClick={() => setRetarget(null)}
              className="text-gray-400 hover:text-gray-600 text-lg leading-none">✕</button>
          </div>
          <div className="p-5">
            <AudiencePicker value={draft} onChange={setDraft} options={options} loading={optionsLoading} />
          </div>
          <div className="px-5 py-3 bg-gray-50 border-t border-gray-100 flex justify-end gap-2">
            <button type="button" onClick={() => setRetarget(null)}
              className="px-4 py-2 text-xs font-semibold text-gray-600 bg-white border border-gray-200 rounded-xl hover:bg-gray-50">
              Cancel
            </button>
            <button type="button" onClick={saveRetarget} disabled={saving}
              className="px-5 py-2 text-xs font-semibold text-white rounded-xl disabled:opacity-50 flex items-center gap-2"
              style={{ background: TEAL }}>
              {saving && <div className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin" />}
              {saving ? "Saving…" : "Save audience"}
            </button>
          </div>
        </div>
      </div>
    )}
    </>
  );
}
