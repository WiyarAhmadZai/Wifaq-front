import CrudPage from "../../components/CrudPage";

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
  return (
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
    />
  );
}
