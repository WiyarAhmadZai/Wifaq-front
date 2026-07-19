import { useState, useEffect, useCallback } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { get, post, put, del, peekCache } from "../../api/axios";
import Swal from "sweetalert2";
import { useAuth } from "../../admin/context/AuthContext";

const TEAL = "#0D5C63";

// Card colour styling + presentation. Best: green→golden→diamond.
// Concern: yellow→red→black.
const CARD = {
  green:   { label: "Green",   emoji: "🟢", bg: "#e6f3ec", fg: "#2E7D5B", ring: "#7dc79f" },
  golden:  { label: "Golden",  emoji: "🥇", bg: "#fbf3d9", fg: "#9a6a12", ring: "#e0bf5a" },
  diamond: { label: "Diamond", emoji: "💎", bg: "#e2f4fb", fg: "#1f7ba0", ring: "#7cc7e3" },
  yellow:  { label: "Yellow",  emoji: "🟡", bg: "#fdf6d8", fg: "#8a7410", ring: "#e3d15a" },
  red:     { label: "Red",     emoji: "🔴", bg: "#fbe4e4", fg: "#b23b3b", ring: "#e39a9a" },
  black:   { label: "Black",   emoji: "⚫", bg: "#e5e7eb", fg: "#1f2937", ring: "#9ca3af" },
};

const CAT = {
  positive: { label: "Positive", fg: "#2E7D5B", bg: "#e6f3ec" },
  routine:  { label: "Routine",  fg: "#4b5563", bg: "#eef0f2" },
  concern:  { label: "Concern",  fg: "#b23b3b", bg: "#fbe4e4" },
  urgent:   { label: "Urgent",   fg: "#a11", bg: "#fbdada" },
};

const Spinner = () => (
  <div className="flex justify-center py-16">
    <div className="w-7 h-7 border-2 rounded-full animate-spin" style={{ borderColor: "#cfe4e4", borderTopColor: TEAL }} />
  </div>
);

const initials = (n) => (n || "?").split(" ").map((w) => w[0]).slice(0, 2).join("").toUpperCase();

function CardChip({ c }) {
  const s = CARD[c.color] || CARD.green;
  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-[10px] font-bold"
      style={{ background: s.bg, color: s.fg, border: `1px solid ${s.ring}` }} title={c.reason}>
      {s.emoji} {s.label}{c.is_auto ? " ·auto" : ""}
    </span>
  );
}

export default function StudentCards() {
  const navigate = useNavigate();
  const { hasPermission } = useAuth();
  const [searchParams] = useSearchParams();
  const focusStudent = searchParams.get("student_id");

  const [loading, setLoading] = useState(true);
  const [data, setData] = useState(null);
  const [search, setSearch] = useState("");
  const [tab, setTab] = useState("eligible"); // eligible | all | observations
  const [savingSettings, setSavingSettings] = useState(false);
  const [perCard, setPerCard] = useState(4);
  const [autoIssue, setAutoIssue] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    const __cached = peekCache("/student-cards");
    if (__cached) {
      const d = __cached;
      setData(d);
      setPerCard(d?.settings?.observations_per_card ?? 4);
      setAutoIssue(Boolean(d?.settings?.auto_issue));
      if (!d?.can_give) setTab("all");
      setLoading(false);
    }
    try {
      const res = await get("/student-cards");
      const d = res.data;
      setData(d);
      setPerCard(d?.settings?.observations_per_card ?? 4);
      setAutoIssue(Boolean(d?.settings?.auto_issue));
      if (!d?.can_give) setTab("all");
    } catch {
      Swal.fire("Error", "Failed to load student cards", "error");
    } finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const canGive = Boolean(data?.can_give);
  const canManage = Boolean(data?.can_manage);

  const students = (data?.students || []).filter((s) => {
    const q = search.trim().toLowerCase();
    if (!q) return true;
    return [s.name, s.class, s.student_id, s.father_name].some((v) => (v || "").toLowerCase().includes(q));
  });
  const eligible = students.filter((s) => s.eligible);
  const shown = tab === "eligible" ? eligible : students;

  const giveCard = async (student, track) => {
    const next = track === "best" ? student.next_best : student.next_bad;
    const style = CARD[next.color] || CARD.green;
    const { value, isConfirmed } = await Swal.fire({
      title: `Give ${style.label} card?`,
      html: `<div style="text-align:left;font-size:13px">
               <b>${student.name}</b> — ${track === "best" ? "positive" : "concern"} track<br/>
               Earned from <b>${track === "best" ? student.positive : student.negative}</b> ${track === "best" ? "positive" : "concern"} observations.
             </div>`,
      input: "textarea",
      inputPlaceholder: "Optional message to the family…",
      showCancelButton: true,
      confirmButtonColor: style.fg,
      confirmButtonText: `${style.emoji} Give ${style.label}`,
    });
    if (!isConfirmed) return;
    try {
      await post("/student-cards", { student_id: student.id, track, citation: (value || "").trim() || undefined });
      window.dispatchEvent(new CustomEvent("wen:notifications-refresh"));
      load();
    } catch (err) {
      Swal.fire("Error", err.response?.data?.message || "Failed to issue card", "error");
    }
  };

  const removeCard = async (card) => {
    const r = await Swal.fire({ title: "Remove this card?", icon: "warning", showCancelButton: true, confirmButtonColor: "#ef4444" });
    if (!r.isConfirmed) return;
    try { await del(`/student-cards/${card.id}`); load(); }
    catch (err) { Swal.fire("Error", err.response?.data?.message || "Failed", "error"); }
  };

  const saveSettings = async () => {
    setSavingSettings(true);
    try {
      await put("/student-cards/settings", { observations_per_card: Number(perCard), auto_issue: Boolean(autoIssue) });
      Swal.fire({ icon: "success", title: "Settings saved", timer: 1100, showConfirmButton: false });
      load();
    } catch (err) {
      Swal.fire("Error", err.response?.data?.message || "Failed to save settings", "error");
    } finally { setSavingSettings(false); }
  };

  if (loading) return <Spinner />;

  return (
    <div className="min-h-screen bg-gray-50/60">
      {/* Header */}
      <div className="px-5 py-4" style={{ background: TEAL }}>
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h1 className="text-sm font-bold text-white">Student Cards</h1>
            <p className="text-xs text-teal-100 mt-0.5">
              {canGive
                ? "Award best/concern cards to students who reached the observation threshold."
                : "Your children's development cards and recent observations."}
            </p>
          </div>
          {hasPermission("student-card-rankings.view") && (
            <button onClick={() => navigate("/education/card-rankings")}
              className="px-4 py-1.5 bg-white/15 hover:bg-white/25 text-white rounded-xl text-xs font-bold">
              🏆 Rankings
            </button>
          )}
        </div>
      </div>

      <div className="px-4 py-5 space-y-4 max-w-5xl mx-auto">
        {/* Settings (managers only) */}
        {canManage && (
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
            <h3 className="text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-3">Auto-card settings</h3>
            <div className="flex items-end gap-4 flex-wrap">
              <div>
                <label className="block text-[10px] text-gray-500 mb-1">Observations per card</label>
                <input type="number" min={1} max={50} value={perCard} onChange={(e) => setPerCard(e.target.value)}
                  className="w-28 px-3 py-2 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-teal-300 focus:outline-none" />
                <p className="text-[10px] text-gray-400 mt-1">Same-condition observations to earn each next card ({perCard}/{perCard * 2}/{perCard * 3}).</p>
              </div>
              <label className="flex items-center gap-2 cursor-pointer pb-2">
                <input type="checkbox" checked={autoIssue} onChange={(e) => setAutoIssue(e.target.checked)} className="w-4 h-4 accent-teal-600" />
                <span className="text-xs font-semibold text-gray-700">Auto-issue when the limit is reached</span>
              </label>
              <button onClick={saveSettings} disabled={savingSettings}
                className="ml-auto px-5 py-2 text-xs font-semibold text-white rounded-xl disabled:opacity-50"
                style={{ background: TEAL }}>
                {savingSettings ? "Saving…" : "Save settings"}
              </button>
            </div>
          </div>
        )}

        {/* Tabs + search */}
        <div className="flex items-center gap-2 flex-wrap">
          {canGive && (
            <>
              <TabBtn active={tab === "eligible"} onClick={() => setTab("eligible")}>Eligible ({eligible.length})</TabBtn>
              <TabBtn active={tab === "all"} onClick={() => setTab("all")}>All students ({students.length})</TabBtn>
            </>
          )}
          <TabBtn active={tab === "observations"} onClick={() => setTab("observations")}>Recent observations</TabBtn>
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search…"
            className="ml-auto px-3 py-2 border border-gray-200 rounded-xl text-xs bg-white focus:ring-2 focus:ring-teal-300 focus:outline-none" />
        </div>

        {/* Observations feed */}
        {tab === "observations" ? (
          <div className="space-y-2">
            {(data?.recent || []).length === 0 && <Empty>No observations yet.</Empty>}
            {(data?.recent || []).map((o) => {
              const c = CAT[o.category] || CAT.routine;
              return (
                <div key={o.id} className="bg-white rounded-xl border border-gray-100 p-3 flex gap-3">
                  <span className="px-2 py-0.5 rounded-lg text-[10px] font-bold h-fit" style={{ background: c.bg, color: c.fg }}>{c.label}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold text-gray-800">{o.student} <span className="text-gray-400 font-normal">· {o.dimension}</span></p>
                    <p className="text-xs text-gray-600 mt-0.5">{o.description}</p>
                    <p className="text-[10px] text-gray-400 mt-1">{o.observer || "—"} · {o.observed_on}</p>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="space-y-2">
            {shown.length === 0 && <Empty>{tab === "eligible" ? "No students have reached a card threshold yet." : "No students to show."}</Empty>}
            {shown.map((s) => (
              <div key={s.id}
                className={`bg-white rounded-2xl border shadow-sm p-4 ${String(s.id) === focusStudent ? "border-teal-400 ring-2 ring-teal-100" : "border-gray-100"}`}>
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center text-white text-sm font-bold flex-shrink-0" style={{ background: TEAL }}>
                    {initials(s.name)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2 flex-wrap">
                      <div>
                        <p className="text-sm font-bold text-gray-800">{s.name}</p>
                        <p className="text-[10px] text-gray-400">{s.class || "—"} · {s.student_id}</p>
                      </div>
                      <div className="flex items-center gap-3 text-[11px] text-gray-500">
                        <span>🟢 {s.positive} positive</span>
                        <span>🔴 {s.negative} concern</span>
                      </div>
                    </div>

                    {/* Existing cards */}
                    {s.cards.length > 0 && (
                      <div className="flex flex-wrap gap-1.5 mt-2">
                        {s.cards.map((c) => (
                          <span key={c.id} className="inline-flex items-center gap-1">
                            <CardChip c={c} />
                            {canManage && (
                              <button onClick={() => removeCard(c)} className="text-[10px] text-gray-300 hover:text-red-500" title="Remove card">✕</button>
                            )}
                          </span>
                        ))}
                      </div>
                    )}

                    {/* Give-card actions */}
                    {canGive && (s.best_pending > 0 || s.bad_pending > 0) && (
                      <div className="flex flex-wrap gap-2 mt-3">
                        {s.best_pending > 0 && (
                          <button onClick={() => giveCard(s, "best")}
                            className="px-3 py-1.5 rounded-xl text-[11px] font-bold"
                            style={{ background: (CARD[s.next_best.color] || CARD.green).bg, color: (CARD[s.next_best.color] || CARD.green).fg, border: `1px solid ${(CARD[s.next_best.color] || CARD.green).ring}` }}>
                            {(CARD[s.next_best.color] || CARD.green).emoji} Give {(CARD[s.next_best.color] || CARD.green).label} {s.best_pending > 1 ? `(+${s.best_pending})` : ""}
                          </button>
                        )}
                        {s.bad_pending > 0 && (
                          <button onClick={() => giveCard(s, "bad")}
                            className="px-3 py-1.5 rounded-xl text-[11px] font-bold"
                            style={{ background: (CARD[s.next_bad.color] || CARD.yellow).bg, color: (CARD[s.next_bad.color] || CARD.yellow).fg, border: `1px solid ${(CARD[s.next_bad.color] || CARD.yellow).ring}` }}>
                            {(CARD[s.next_bad.color] || CARD.yellow).emoji} Give {(CARD[s.next_bad.color] || CARD.yellow).label} {s.bad_pending > 1 ? `(+${s.bad_pending})` : ""}
                          </button>
                        )}
                      </div>
                    )}
                    {canGive && !s.eligible && (
                      <p className="text-[10px] text-gray-400 mt-2">
                        Next best card at {s.best_at} positive · next concern card at {s.bad_at} concern observations.
                      </p>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function TabBtn({ active, onClick, children }) {
  return (
    <button onClick={onClick}
      className={`px-3 py-1.5 rounded-xl text-xs font-semibold ${active ? "text-white" : "text-gray-600 bg-white border border-gray-200 hover:bg-gray-50"}`}
      style={active ? { background: TEAL } : {}}>
      {children}
    </button>
  );
}

function Empty({ children }) {
  return <div className="text-center py-12 text-xs text-gray-400 bg-white rounded-2xl border border-gray-100">{children}</div>;
}
