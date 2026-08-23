import CrudPage from "../../components/CrudPage";
import { TEAL, GOLD_DEEP, GOLD_LT, GOLD_SOFT } from "../education/weeklyUi";

/**
 * The 100 Essential Books — the recommendations list.
 *
 * Built on the shared CrudPage like every other list in the system, so search,
 * paging, permissions, export and the status control all behave the way they
 * do everywhere else. Only the columns are specific to this module.
 */

/** Curation state. `selected` is the one that means "it made the hundred". */
const STATUS_STYLE = {
  submitted:   { bg: "#F4F8F8", fg: TEAL,      border: "#D0E0E0", label: "Submitted" },
  shortlisted: { bg: GOLD_LT,   fg: GOLD_DEEP, border: GOLD_SOFT, label: "Shortlisted" },
  selected:    { bg: "#E6F3EC", fg: "#2E7D5B", border: "#B7DCC8", label: "Selected" },
  rejected:    { bg: "#FAEAEF", fg: "#B0546E", border: "#EFCBD6", label: "Not selected" },
};

const Pill = ({ value }) => {
  const s = STATUS_STYLE[value] || STATUS_STYLE.submitted;
  return (
    <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold border whitespace-nowrap"
      style={{ background: s.bg, color: s.fg, borderColor: s.border }}>
      {s.label}
    </span>
  );
};

export default function EssentialBooks() {
  return (
    <CrudPage
      permissionBase="essential-books"
      title="The 100 Essential Books"
      apiEndpoint="/library/essential-books/index"
      createRoute="/library/essential-books/create"
      editRoute="/library/essential-books/edit"
      showRoute="/library/essential-books/show"
      deleteEndpoint="/library/essential-books/delete"
      searchable
      searchFields={["title", "title_translation", "author", "recommender_name"]}
      statusEndpoint="/library/essential-books/status"
      statusField="status"
      statusOptions={[
        { value: "submitted",   label: "Submitted",    color: "gray" },
        { value: "shortlisted", label: "Shortlisted",  color: "amber" },
        { value: "selected",    label: "Selected",     color: "emerald" },
        { value: "rejected",    label: "Not selected", color: "rose" },
      ]}
      filters={[
        {
          key: "status", label: "Status", allLabel: "All statuses",
          options: Object.entries(STATUS_STYLE).map(([value, s]) => ({ value, label: s.label })),
        },
        {
          key: "reading_level", label: "Level", allLabel: "All levels",
          options: [
            { value: "L1", label: "L1 · Ages 6–9" },
            { value: "L2", label: "L2 · Ages 9–12" },
            { value: "L3", label: "L3 · Ages 12–15" },
            { value: "L4", label: "L4 · Ages 15–18" },
            { value: "L5", label: "L5 · University & Adult" },
          ],
        },
      ]}
      listColumns={[
        {
          key: "title",
          label: "Book",
          render: (val, row) => (
            <div className="min-w-0">
              <bdi dir="auto" className="block font-semibold text-[#0A3A3E]">{val}</bdi>
              {row.title_translation && (
                <bdi dir="auto" className="block text-[11px] text-[#8AA4A7]">{row.title_translation}</bdi>
              )}
            </div>
          ),
        },
        { key: "author", label: "Author", render: (val) => <bdi dir="auto">{val}</bdi> },
        {
          key: "reading_level",
          label: "Level",
          render: (val) => val
            ? <span className="px-2 py-0.5 rounded-md text-[10px] font-bold"
                style={{ background: "#E8F6F6", color: TEAL }}>{val}</span>
            : <span className="text-[#8AA4A7]">—</span>,
        },
        {
          key: "themes",
          label: "Themes",
          render: (val) => {
            const list = Array.isArray(val) ? val : [];
            if (!list.length) return <span className="text-[#8AA4A7]">—</span>;
            return (
              <div className="flex flex-wrap gap-1">
                {list.slice(0, 2).map((t) => (
                  <span key={t} className="px-2 py-0.5 rounded-full text-[10px] border"
                    style={{ background: GOLD_LT, color: GOLD_DEEP, borderColor: GOLD_SOFT }}>{t}</span>
                ))}
                {list.length > 2 && <span className="text-[10px] text-[#8AA4A7]">+{list.length - 2}</span>}
              </div>
            );
          },
        },
        {
          key: "pdf_url",
          label: "File",
          // The link opens in a new tab rather than navigating the app away
          // from a list the user is part-way through filtering.
          render: (val, row) => val
            ? (
              <a href={val} target="_blank" rel="noopener noreferrer"
                onClick={(e) => e.stopPropagation()}
                className="text-[11px] font-semibold underline" style={{ color: TEAL }}
                title={row.pdf_name || "Open PDF"}>
                📄 PDF
              </a>
            )
            : <span className="text-[#8AA4A7] text-[11px]">—</span>,
        },
        { key: "recommender_name", label: "Recommended by", render: (val) => <bdi dir="auto">{val}</bdi> },
        { key: "status", label: "Status", render: (val) => <Pill value={val} /> },
      ]}
    />
  );
}
