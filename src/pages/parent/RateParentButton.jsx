import { useCallback, useEffect, useState } from "react";
import Swal from "sweetalert2";
import { get, post, put } from "../../api/axios";
import Modal from "../../components/Modal";
import { useAuth } from "../../admin/context/AuthContext";
import { handleValidationErrors } from "../../utils/formErrors";
import {
  DIMENSIONS, ScaleInput, TierPill, ScoreChip, StarIcon,
  TEAL, MUTED, BORDER,
} from "./parentRatingUi";

/**
 * The row action: rate this family.
 *
 * Drops into any list that has a `family` on the row — the communication log
 * and the Families list both use it. Opens a modal that shows what the system
 * ALREADY knows about the family's engagement beside the five sliders, so a
 * score is given against a record rather than a memory.
 *
 * Hidden entirely without `parent-ratings.rate`. The backend enforces the same
 * permission, plus the class-scoping rule for mentor teachers — a mentor may
 * rate only families with a child in the class they supervise, and the modal
 * says so rather than failing on submit.
 */

const EMPTY = DIMENSIONS.reduce((acc, d) => ({ ...acc, [d.key]: 3 }), {});

const Stat = ({ label, value }) => (
  <div className="px-2.5 py-2 rounded-xl border" style={{ borderColor: BORDER }}>
    <div className="text-sm font-bold text-gray-800">{value ?? "—"}</div>
    <div className="text-[10px] font-semibold" style={{ color: MUTED }}>{label}</div>
  </div>
);

export default function RateParentButton({ family, onSaved }) {
  const { hasPermission } = useAuth();
  const canRate = hasPermission("parent-ratings.rate") || hasPermission("parent-ratings.manage");

  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [scores, setScores] = useState(EMPTY);
  const [note, setNote] = useState("");
  const [errors, setErrors] = useState({});
  const [detail, setDetail] = useState(null);

  const familyId = family?.id;

  const load = useCallback(async () => {
    if (!familyId) return;
    setLoading(true);
    setErrors({});
    try {
      // Never cached: a standing that changed a minute ago must not be shown
      // as it was an hour ago while someone is deciding on it.
      const res = await get(`/parent-ratings/family/${familyId}`, { cache: false });
      const d = res.data?.data || null;
      setDetail(d);
      // Editing your own rating starts from what you gave last time.
      if (d?.my_rating) {
        setScores(DIMENSIONS.reduce((acc, dim) => ({ ...acc, [dim.key]: d.my_rating[dim.key] }), {}));
        setNote(d.my_rating.note || "");
      } else {
        setScores(EMPTY);
        setNote("");
      }
    } catch (e) {
      Swal.fire("Error", e.response?.data?.message || "Could not load this family's ratings.", "error");
      setOpen(false);
    } finally {
      setLoading(false);
    }
  }, [familyId]);

  useEffect(() => { if (open) load(); }, [open, load]);

  const submit = async () => {
    if (saving) return;
    setSaving(true);
    setErrors({});
    try {
      const payload = { family_id: familyId, note, ...scores };
      if (detail?.my_rating) {
        await put(`/parent-ratings/edit/${detail.my_rating.id}`, { note, ...scores });
      } else {
        await post("/parent-ratings/store", payload);
      }
      setOpen(false);
      Swal.fire({ icon: "success", title: "Rating saved", timer: 1400, showConfirmButton: false });
      onSaved?.();
    } catch (error) {
      handleValidationErrors(error.response, setErrors);
      if (!error.response?.data?.errors) {
        Swal.fire("Could not save", error.response?.data?.message || "Please try again.", "error");
      }
    } finally {
      setSaving(false);
    }
  };

  if (!canRate || !familyId) return null;

  const ev = detail?.evidence || {};
  const standing = detail?.standing;
  const blocked = detail && detail.can_rate === false;
  const err = (k) => (Array.isArray(errors[k]) ? errors[k][0] : errors[k]);

  return (
    <>
      <button
        type="button"
        onClick={(e) => { e.stopPropagation(); setOpen(true); }}
        title="Rate this family's engagement"
        className="p-1.5 rounded-lg hover:bg-amber-50 transition-colors"
        style={{ color: "#8A6F10" }}
      >
        <StarIcon filled={Boolean(family?.standing_tier)} />
      </button>

      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title="Rate parent engagement"
        subtitle={[family?.family_id, family?.father_name || family?.mother_name].filter(Boolean).join(" — ")}
        maxWidth="sm:max-w-2xl"
        footer={
          <div className="flex justify-end gap-2">
            <button onClick={() => setOpen(false)}
              className="px-4 py-2.5 text-sm font-semibold rounded-xl border border-gray-200 text-gray-700 hover:bg-gray-50">
              Cancel
            </button>
            <button onClick={submit} disabled={saving || loading || blocked}
              className="px-4 py-2.5 text-sm font-semibold rounded-xl bg-teal-600 text-white hover:bg-teal-700 disabled:opacity-50">
              {saving ? "Saving…" : detail?.my_rating ? "Update my rating" : "Submit rating"}
            </button>
          </div>
        }
      >
        {loading && <p className="text-sm py-6 text-center" style={{ color: MUTED }}>Loading…</p>}

        {!loading && blocked && (
          <p className="text-sm p-3 rounded-xl" style={{ background: "#FAEAEF", color: "#B0546E" }}>
            You may only rate families with a child in the class you supervise.
          </p>
        )}

        {!loading && !blocked && (
          <div className="space-y-4">
            {/* What the system already knows. The point of showing it is that a
                score should answer to a record, not to a mood. */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-[11px] font-bold uppercase tracking-wide" style={{ color: MUTED }}>
                  What the record shows
                </span>
                {standing && (
                  <span className="flex items-center gap-2">
                    <TierPill value={standing.tier} small />
                    <ScoreChip value={standing.score_avg} raterCount={standing.rater_count} />
                  </span>
                )}
              </div>
              <div className="grid grid-cols-3 sm:grid-cols-5 gap-2">
                <Stat label="Contacts" value={ev.contacts} />
                <Stat label="Reached" value={ev.reached_percent != null ? `${ev.reached_percent}%` : "—"} />
                <Stat label="They called us" value={ev.parent_initiated} />
                <Stat label="Follow-ups open" value={ev.follow_ups_open} />
                <Stat label="Closed" value={ev.follow_ups_closed} />
              </div>
            </div>

            {/* The five dimensions */}
            <div className="space-y-3 pt-3 border-t" style={{ borderColor: "#EEF4F4" }}>
              {DIMENSIONS.map((d) => (
                <div key={d.key}>
                  <div className="flex flex-wrap items-baseline gap-2">
                    <span className="text-sm font-semibold" style={{ color: "#0A3A3E" }}>{d.label}</span>
                    <bdi dir="auto" className="text-[11px]" style={{ color: MUTED }}>{d.fa}</bdi>
                  </div>
                  <p className="text-[11px] mb-1.5" style={{ color: MUTED }}>{d.hint}</p>
                  <ScaleInput value={scores[d.key]} onChange={(v) => setScores((s) => ({ ...s, [d.key]: v }))} />
                  {err(d.key) && <p className="text-[11px] text-rose-600 mt-1">{err(d.key)}</p>}
                </div>
              ))}
            </div>

            {/* The reason. Required — this is what makes a rating challengeable. */}
            <div className="pt-3 border-t" style={{ borderColor: "#EEF4F4" }}>
              <label className="block text-xs font-semibold text-gray-600 mb-1.5">
                Why this score? <span className="text-rose-500">*</span>
              </label>
              <textarea rows={3} dir="auto" value={note} onChange={(e) => setNote(e.target.value)}
                placeholder="Give the evidence — what happened, when. A rating nobody can challenge should not affect a family."
                className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500/30" />
              {err("note") && <p className="text-[11px] text-rose-600 mt-1">{err("note")}</p>}
              {err("family_id") && <p className="text-[11px] text-rose-600 mt-1">{err("family_id")}</p>}
            </div>

            {/* Other raters — visible so a rater sees they are one of several. */}
            {(detail?.ratings || []).length > 0 && (
              <div className="pt-3 border-t" style={{ borderColor: "#EEF4F4" }}>
                <div className="text-[11px] font-bold uppercase tracking-wide mb-2" style={{ color: MUTED }}>
                  Other assessments ({detail.ratings.length})
                </div>
                <div className="space-y-2 max-h-40 overflow-y-auto">
                  {detail.ratings.map((r) => (
                    <div key={r.id} className="flex items-start justify-between gap-2 text-[12px]">
                      <div className="min-w-0">
                        <span className="font-semibold">{r.rater?.name || "—"}</span>
                        <span style={{ color: MUTED }}> · {r.rater_role || "staff"}</span>
                        <bdi dir="auto" className="block" style={{ color: MUTED }}>{r.note}</bdi>
                      </div>
                      <span className="font-bold flex-shrink-0" style={{ color: TEAL }}>{r.score}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </Modal>
    </>
  );
}
