import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import Swal from "sweetalert2";
import { get } from "../../api/axios";
import ListExportActions from "../../components/ListExportActions";
import { TierPill, ScoreChip, TIERS, tierLabel, TEAL, MUTED, BORDER, GOLD_LT, GOLD_SOFT, GOLD_DEEP } from "./parentRatingUi";
import { fmtDate } from "./parentCommsUi";

/**
 * Golden Record — the families who partner with the school best.
 *
 * The recognition half of the rating system, and the half worth having first.
 * Only standings with at least the minimum number of independent raters appear:
 * a leaderboard built on one person's opinion is a popularity list, not a
 * record of anything.
 */

const COLUMNS = [
  { key: "rank", label: "Rank", exportValue: (r) => r._rank },
  { key: "family_id", label: "Family ID", exportValue: (r) => r.family?.family_id || "" },
  { key: "family", label: "Family", exportValue: (r) => r.family?.father_name || r.family?.mother_name || "" },
  { key: "score_avg", label: "Score", exportValue: (r) => r.score_avg },
  { key: "tier", label: "Standing", exportValue: (r) => tierLabel(r.tier) },
  { key: "rater_count", label: "Raters", exportValue: (r) => r.rater_count },
  { key: "last_rated_at", label: "Last rated", exportValue: (r) => fmtDate(r.last_rated_at) },
];

export default function ParentGoldenRecord() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await get("/parent-ratings/leaderboard?limit=100", { cache: false });
      setRows((res.data?.data || []).map((r, i) => ({ ...r, _rank: i + 1 })));
    } catch (e) {
      Swal.fire("Error", e.response?.data?.message || "Could not load the Golden Record.", "error");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  return (
    <div className="px-4 py-5 space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-lg font-bold text-gray-800">Golden Record</h1>
          <p className="text-xs mt-0.5" style={{ color: MUTED }}>
            سابقه طلایی — the families who partner with the school best. Shown only once at least two
            people have assessed them independently.
          </p>
        </div>
        <ListExportActions getRows={() => rows} columns={COLUMNS} title="Parent Golden Record" />
      </div>

      {loading && <p className="py-10 text-center text-sm" style={{ color: MUTED }}>Loading…</p>}

      {!loading && rows.length === 0 && (
        <div className="bg-white border rounded-2xl p-10 text-center" style={{ borderColor: BORDER }}>
          <p className="text-sm" style={{ color: MUTED }}>
            Nothing here yet. A family reaches the Golden Record once two or more staff have rated it
            and the average reaches 70.
          </p>
        </div>
      )}

      {!loading && rows.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
          {rows.map((r) => {
            const top = r._rank <= 3;
            return (
              <div key={r.id} className="p-4 rounded-2xl border flex items-start gap-3"
                style={top
                  ? { background: GOLD_LT, borderColor: GOLD_SOFT }
                  : { background: "#fff", borderColor: BORDER }}>
                <div className="flex-shrink-0 w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold"
                  style={top
                    ? { background: GOLD_DEEP, color: "#fff" }
                    : { background: "#F4F8F8", color: TEAL }}>
                  {r._rank}
                </div>
                <div className="min-w-0 flex-1">
                  <bdi dir="auto" className="block font-bold text-[#0A3A3E] truncate">
                    {r.family?.father_name || r.family?.mother_name || "—"}
                  </bdi>
                  <span className="block text-[10px] mb-1.5" style={{ color: MUTED }}>
                    {r.family?.family_id}
                  </span>
                  <div className="flex flex-wrap items-center gap-2">
                    <ScoreChip value={r.score_avg} raterCount={r.rater_count} />
                    <TierPill value={r.tier} small />
                  </div>
                  <Link to={`/parent-communications/history/${r.family_id}`}
                    className="inline-block mt-2 text-[11px] font-semibold underline"
                    style={{ color: TIERS.fair.fg }}>
                    Communication history
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
