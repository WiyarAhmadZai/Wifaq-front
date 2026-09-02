import { useCallback, useEffect, useMemo, useState } from "react";
import { get } from "../../api/axios";
import ObservationDetailModal from "../../components/education/ObservationDetailModal";

/**
 * A parent's own page: every observation the school has recorded about their
 * own children, and the development cards those observations earned.
 *
 * The children are resolved from the signed-in account on the server, so this
 * page can only ever show one family's children — there is no student id in the
 * URL to change. Read-only throughout: a parent never edits or deletes.
 */

const TEAL = "#0D5C63";

const DIM = {
  intellectual: { label: "Intellectual", color: "#14919B" },
  character: { label: "Character", color: "#C9A227" },
  social: { label: "Social", color: "#C2607A" },
  practical: { label: "Practical", color: "#2E7D5B" },
};
const CAT = {
  positive: { label: "Positive", emoji: "⭐", bg: "#e6f3ec", fg: "#2E7D5B" },
  routine: { label: "Routine", emoji: "📝", bg: "#eef3f3", fg: "#5d7273" },
  concern: { label: "Concerning", emoji: "⚠️", bg: "#fbf0db", fg: "#9a6a12" },
  urgent: { label: "Urgent", emoji: "🚨", bg: "#f7e3e1", fg: "#C0473F" },
};
const CARD = {
  green: { label: "Green", emoji: "🟢", bg: "#e6f3ec", fg: "#2E7D5B", ring: "#7dc79f" },
  golden: { label: "Golden", emoji: "🥇", bg: "#fbf3d9", fg: "#9a6a12", ring: "#e0bf5a" },
  diamond: { label: "Diamond", emoji: "💎", bg: "#e2f4fb", fg: "#1f7ba0", ring: "#7cc7e3" },
  yellow: { label: "Yellow", emoji: "🟡", bg: "#fdf6d8", fg: "#8a7410", ring: "#e3d15a" },
  red: { label: "Red", emoji: "🔴", bg: "#fbe4e4", fg: "#b23b3b", ring: "#e39a9a" },
  black: { label: "Black", emoji: "⚫", bg: "#e5e7eb", fg: "#1f2937", ring: "#9ca3af" },
};

const Spinner = () => (
  <div className="flex justify-center py-16">
    <div className="w-7 h-7 border-2 rounded-full animate-spin" style={{ borderColor: "#cfe4e4", borderTopColor: TEAL }} />
  </div>
);

export default function MyChildrenObservations() {
  const [loading, setLoading] = useState(true);
  const [denied, setDenied] = useState(false);
  const [children, setChildren] = useState([]);
  const [rows, setRows] = useState([]);
  const [cards, setCards] = useState([]);
  const [emptyReason, setEmptyReason] = useState(null);
  // A student reading their own record lands on the same page; the heading
  // should not tell them these are "my children".
  const [isSelf, setIsSelf] = useState(false);

  const [childId, setChildId] = useState("");    // "" = every child
  const [category, setCategory] = useState("");
  const [detail, setDetail] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = {};
      if (childId) params.student_id = childId;
      if (category) params.category = category;
      const r = await get("/student-observations/my-children", { params, cache: false });
      const d = r.data || {};
      setChildren(d.children || []);
      setRows(d.data || []);
      setCards(d.cards || []);
      setEmptyReason(d.empty_reason || null);
      setIsSelf(Boolean(d.is_self));
      setDenied(false);
    } catch (e) {
      if (e?.response?.status === 403) setDenied(true);
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, [childId, category]);

  useEffect(() => {
    load();
  }, [load]);

  /** Open the full record. The list already carries it, so no extra request. */
  const openDetail = (o) => setDetail(o);

  const cardsForFilter = useMemo(
    () => (childId ? cards.filter((c) => String(c.student_id) === String(childId)) : cards),
    [cards, childId],
  );

  const counts = useMemo(() => {
    const c = { positive: 0, routine: 0, concern: 0, urgent: 0 };
    rows.forEach((r) => { if (c[r.category] !== undefined) c[r.category]++; });
    return c;
  }, [rows]);

  if (denied) {
    return (
      <div className="max-w-3xl mx-auto p-6">
        <div className="rounded-2xl p-5" style={{ background: "#fbf7ec", border: "1px solid #ecd9a8" }}>
          <p className="text-sm font-bold" style={{ color: "#9a6a12" }}>This page is for families</p>
          <p className="text-xs mt-1" style={{ color: "#7a5410" }}>
            Your account does not have access to a family view. If you are a parent and expected to see your
            children here, ask the school office to link your account to your family record.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto p-4 sm:p-6 space-y-4">
      <header>
        <h1 className="text-lg font-bold text-gray-900">{isSelf ? "My record" : "My children"}</h1>
        <p className="text-sm text-gray-500 mt-0.5">
          {isSelf
            ? "Everything the school has recorded about you — observations and the cards you earned."
            : "Everything the school has recorded about your children — observations and the cards they earned."}
        </p>
      </header>

      {/* Cards the children have earned. This is what the notification is about,
          so it sits above the timeline rather than below it. */}
      {cardsForFilter.length > 0 && (
        <section className="rounded-2xl bg-white border border-gray-100 p-4">
          <p className="text-[10px] font-bold uppercase tracking-wider text-gray-400 mb-2">Cards earned</p>
          <div className="flex flex-wrap gap-2">
            {cardsForFilter.map((c) => {
              const st = CARD[c.color] || CARD.green;
              const child = children.find((k) => k.id === c.student_id);
              return (
                <span key={c.id} title={c.reason}
                  className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-[11px] font-bold"
                  style={{ background: st.bg, color: st.fg, border: `1px solid ${st.ring}` }}>
                  {st.emoji} {st.label}
                  {children.length > 1 && child && <span className="font-normal opacity-70">· {child.full_name}</span>}
                  <span className="font-normal opacity-70">· {c.issued_on}</span>
                </span>
              );
            })}
          </div>
        </section>
      )}

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-2">
        {children.length > 1 && (
          <select value={childId} onChange={(e) => setChildId(e.target.value)}
            className="px-3 py-2 rounded-xl text-xs font-bold bg-white border focus:outline-none"
            style={{ borderColor: "#dbe8e8", color: TEAL }}>
            <option value="">All my children</option>
            {children.map((c) => (
              <option key={c.id} value={c.id}>{c.full_name}{c.class_name ? ` — ${c.class_name}` : ""}</option>
            ))}
          </select>
        )}
        <select value={category} onChange={(e) => setCategory(e.target.value)}
          className="px-3 py-2 rounded-xl text-xs font-bold bg-white border focus:outline-none"
          style={{ borderColor: "#dbe8e8", color: TEAL }}>
          <option value="">All kinds</option>
          {Object.entries(CAT).map(([k, v]) => <option key={k} value={k}>{v.emoji} {v.label}</option>)}
        </select>

        {!loading && rows.length > 0 && (
          <span className="text-[11px] text-gray-500 ms-auto">
            {rows.length} observation{rows.length === 1 ? "" : "s"} · {counts.positive} positive · {counts.concern + counts.urgent} needing attention
          </span>
        )}
      </div>

      {loading ? (
        <Spinner />
      ) : rows.length === 0 ? (
        <div className="rounded-2xl bg-white border border-dashed border-gray-200 py-16 text-center">
          <p className="text-sm font-semibold text-gray-700">
            {emptyReason === "no_children_linked"
              ? (isSelf ? "Nothing linked to your account yet" : "No children linked to your account yet")
              : "Nothing recorded yet"}
          </p>
          <p className="text-xs text-gray-500 mt-1">
            {emptyReason === "no_children_linked"
              ? "Ask the school office to link your record to this account."
              : isSelf
                ? "When a teacher records an observation about you, it appears here."
                : "When a teacher records an observation about your child, it appears here."}
          </p>
        </div>
      ) : (
        <div className="relative pl-5" style={{ borderLeft: "2px solid #e7f1f1", marginLeft: "4px" }}>
          {rows.map((o) => {
            const dim = DIM[o.dimension] || {};
            const cat = CAT[o.category] || CAT.routine;
            return (
              <div key={o.id} className="relative pb-5 last:pb-0 group">
                <span className="absolute -left-[27px] top-1 w-3 h-3 rounded-full border-2 border-white" style={{ background: dim.color || TEAL }} />
                <div className="flex items-center justify-between gap-2 mb-1 flex-wrap">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    {children.length > 1 && (
                      <span className="px-2 py-0.5 rounded-full text-[9px] font-bold bg-gray-100 text-gray-600">{o.student}</span>
                    )}
                    <span className="px-2 py-0.5 rounded-full text-[9px] font-bold" style={{ background: "#E8F6F6", color: TEAL }}>
                      {dim.label || o.dimension}
                    </span>
                    <span className="px-2 py-0.5 rounded-full text-[9px] font-bold" style={{ background: cat.bg, color: cat.fg }}>
                      {cat.emoji} {cat.label}
                    </span>
                    {o.photo_count > 0 && (
                      <span className="px-2 py-0.5 rounded-full text-[9px] font-bold" style={{ background: "#E8F6F6", color: TEAL }}>
                        📷 {o.photo_count}
                      </span>
                    )}
                  </div>
                  <span className="text-[10px] text-gray-400">{o.observed_on}</span>
                </div>

                <button type="button" onClick={() => openDetail(o)} title="Open the full record"
                  className="text-left w-full rounded-lg -mx-1 px-1 py-0.5 hover:bg-gray-50 transition-colors">
                  <p className="text-xs text-gray-800 leading-relaxed">{o.description}</p>
                  <span className="text-[10px] font-bold opacity-0 group-hover:opacity-100 transition-opacity" style={{ color: TEAL }}>
                    View full record →
                  </span>
                </button>

                <p className="mt-1 text-[10px] text-gray-500">Recorded by <b>{o.observer || "—"}</b></p>
              </div>
            );
          })}
        </div>
      )}

      {detail && <ObservationDetailModal observation={detail} onClose={() => setDetail(null)} />}
    </div>
  );
}
