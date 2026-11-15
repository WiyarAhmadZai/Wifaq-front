import { Link } from "react-router-dom";
import CrudPage from "../../components/CrudPage";
import RateParentButton from "./RateParentButton";
import { TIERS, TierPill, ScoreChip, tierOptions, tierLabel, MUTED } from "./parentRatingUi";
import { fmtDate } from "./parentCommsUi";

/**
 * Parent Ratings — every family's standing, searchable and filterable.
 *
 * Built on CrudPage so search, filters, paging, permission-gating and the
 * Excel + Print export all behave the way they do on every other list.
 *
 * There is deliberately no create/edit route: a standing is not something you
 * author, it is the roll-up of individual ratings. You change it by rating —
 * the star button on each row, which is the same component the communication
 * log uses.
 */

const familyName = (row) => row.family?.father_name || row.family?.mother_name || "—";

export default function ParentRatings() {
  return (
    <CrudPage
      permissionBase="parent-ratings"
      title="Parent Ratings"
      apiEndpoint="/parent-ratings/index"
      searchable
      searchFields={["family", "phone"]}
      filters={[
        { key: "tier", label: "Standing", allLabel: "All standings", options: tierOptions() },
        {
          key: "provisional", label: "Confidence", allLabel: "Any",
          options: [{ value: "1", label: "Provisional (under 2 raters)" }],
        },
        {
          key: "due_review", label: "Review", allLabel: "Any",
          options: [{ value: "1", label: "Review date reached" }],
        },
      ]}
      listColumns={[
        {
          key: "family",
          label: "Family",
          render: (_, row) => (
            <div className="min-w-0 max-w-[220px]">
              <bdi dir="auto" className="block font-semibold text-[#0A3A3E] truncate">{familyName(row)}</bdi>
              <span className="block text-[10px] truncate" style={{ color: MUTED }}>
                {row.family?.family_id || ""}
              </span>
            </div>
          ),
          exportValue: (row) => `${row.family?.family_id || ""} ${familyName(row)}`.trim(),
        },
        {
          key: "score_avg",
          label: "Score",
          render: (val, row) => <ScoreChip value={val} raterCount={row.rater_count} />,
          exportValue: (row) => row.score_avg,
        },
        {
          key: "tier",
          label: "Standing",
          render: (val) => <TierPill value={val} />,
          exportValue: (row) => tierLabel(row.tier),
        },
        {
          key: "rater_count",
          label: "Raters",
          render: (val) => (
            <span className="text-[11px] whitespace-nowrap"
              style={{ color: val < 2 ? "#B0546E" : MUTED }}>
              {val}{val < 2 ? " · provisional" : ""}
            </span>
          ),
          exportValue: (row) => row.rater_count,
        },
        {
          key: "last_rated_at",
          label: "Last rated",
          render: (val) => <span className="text-[11px] whitespace-nowrap">{fmtDate(val)}</span>,
          exportValue: (row) => fmtDate(row.last_rated_at),
        },
        {
          key: "review_due_on",
          label: "Review due",
          render: (val) => {
            if (!val) return <span style={{ color: MUTED }}>—</span>;
            const overdue = new Date(val) <= new Date(new Date().toDateString());
            return (
              <span className={`text-[11px] whitespace-nowrap ${overdue ? "font-bold text-rose-600" : ""}`}>
                {fmtDate(val)}
              </span>
            );
          },
          exportValue: (row) => (row.review_due_on ? fmtDate(row.review_due_on) : ""),
        },
        {
          key: "tier_reason",
          label: "Decision",
          render: (val, row) =>
            val ? (
              <bdi dir="auto" className="block max-w-[200px] truncate" title={val}>
                {val}
                {row.decidedBy?.name && (
                  <span className="block text-[10px]" style={{ color: MUTED }}>{row.decidedBy.name}</span>
                )}
              </bdi>
            ) : (
              <span style={{ color: MUTED }} className="text-[11px]">Auto from score</span>
            ),
          exportValue: (row) => row.tier_reason || "Auto from score",
        },
        {
          key: "family_informed",
          label: "Family informed",
          noExport: false,
          render: (val, row) =>
            row.manual_tier
              ? <span className="text-[11px]">{val ? "Yes" : "No"}</span>
              : <span style={{ color: MUTED }}>—</span>,
          exportValue: (row) => (row.manual_tier ? (row.family_informed ? "Yes" : "No") : ""),
        },
        {
          key: "actions",
          label: "Rate / open",
          noExport: true,
          render: (_, row) => (
            <div className="flex items-center gap-1 justify-end">
              <RateParentButton
                family={{ ...row.family, standing_tier: row.tier }}
                onSaved={() => window.location.reload()}
              />
              <Link
                to={`/parent-communications/history/${row.family_id}`}
                onClick={(e) => e.stopPropagation()}
                className="px-2 py-1 text-[10px] font-semibold rounded-lg border whitespace-nowrap"
                style={{ borderColor: TIERS.fair.border, color: TIERS.fair.fg }}
              >
                History
              </Link>
            </div>
          ),
        },
      ]}
    />
  );
}
