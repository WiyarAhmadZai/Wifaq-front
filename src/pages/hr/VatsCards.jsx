import { useState, useEffect, useRef } from "react";
import { useLocation } from "react-router-dom";
import { get, post, put, del } from "../../api/axios";
import Swal from "sweetalert2";
import { FiAward, FiTrendingUp, FiAlertTriangle, FiEdit2, FiTrash2, FiUsers } from "react-icons/fi";
import { PageHeader, EmptyState, Spinner, Pill, InfoNote, DateField } from "../../components/hr/HrUI";
import { broadcastVatsChange } from "../../components/hr/useVats";
import { CardBadge } from "./VatsDashboard";
import { useResourcePermissions } from "../../admin/utils/useResourcePermissions";
import { useAuth } from "../../admin/context/AuthContext";

const HR_ROLES = ["super-admin", "admin", "hr-manager"];

const CARDS = [
  { color: "gold",      label: "Gold",      meaning: "Extraordinary all-around excellence — the rarest card.",     positive: true },
  { color: "turquoise", label: "Turquoise", meaning: "Character & ethical excellence — moral leadership.",          positive: true },
  { color: "green",     label: "Green",     meaning: "Sustained high professional performance.",                    positive: true },
  { color: "yellow",    label: "Yellow",    meaning: "First documented concern — formal pattern recognised.",       positive: false },
  { color: "red",       label: "Red",       meaning: "Serious accountability measure — major breach or persistent.", positive: false },
];

/**
 * Cards Wallet + card-sending workspace.
 *
 * Two viewing modes:
 *   - HR (any super-admin / admin / hr-manager): full workspace —
 *     "Ready for a card" panel, Send buttons, Edit + Delete on every card.
 *   - Regular staff: "My Cards" — read-only list of cards they've received,
 *     count breakdown, no edit/delete/send anywhere.
 */
export default function VatsCards() {
  const { canCreate, canUpdate, canDelete } = useResourcePermissions("vats-cards");
  const { hasRole } = useAuth();
  const isHr = HR_ROLES.some((r) => hasRole(r));
  const location = useLocation();
  const [cards, setCards] = useState([]);
  const [loading, setLoading] = useState(false);
  const [thresholds, setThresholds] = useState({ data: [], targets: { positive: 4, concern: 4 } });
  const [editing, setEditing] = useState(null); // VatsCard being edited, or null

  // Notification highlight: ?highlight=<cardId>&from=notif
  const searchParams = new URLSearchParams(location.search);
  const highlightId = searchParams.get("highlight");
  const fromNotif   = searchParams.get("from") === "notif";
  const [pulseActive, setPulseActive] = useState(false);
  const cardRefs = useRef({});

  useEffect(() => { fetchAll(); if (isHr) fetchThresholds(); }, [location.key, isHr]);

  // Scroll-into-view + pulse for the card linked from a notification.
  useEffect(() => {
    if (!fromNotif || !highlightId || cards.length === 0) return;
    const target = cardRefs.current[String(highlightId)];
    if (!target) return;
    requestAnimationFrame(() => {
      try { target.scrollIntoView({ behavior: "smooth", block: "center" }); } catch {}
      setPulseActive(true);
    });
    const tmr = setTimeout(() => setPulseActive(false), 2500);
    return () => clearTimeout(tmr);
  }, [fromNotif, highlightId, cards]);

  const fetchAll = async () => {
    setLoading(true);
    try { const r = await get("/vats/cards"); setCards(r.data?.data || []); }
    catch { setCards([]); }
    finally { setLoading(false); }
  };

  const fetchThresholds = async () => {
    try { const r = await get("/vats/slips/thresholds"); setThresholds(r.data || { data: [], targets: { positive: 4, concern: 4 } }); }
    catch { setThresholds({ data: [], targets: { positive: 4, concern: 4 } }); }
  };

  const remove = async (id) => {
    const r = await Swal.fire({ icon: "warning", title: "Remove this card?", showCancelButton: true, confirmButtonColor: "#b91c1c" });
    if (!r.isConfirmed) return;
    await del(`/vats/cards/${id}`);
    fetchAll(); fetchThresholds();
  };

  const sendCard = async (row, suggestion) => {
    const { color, label, axis } = suggestion;
    const target = axis === "positive" ? row.positive : row.concern;
    const evName = axis === "positive" ? "recognition" : "concern";
    const cycle  = axis === "positive" ? thresholds.targets.positive : thresholds.targets.concern;
    const r = await Swal.fire({
      icon: "info",
      title: `Send a ${label} to ${row.name}?`,
      html: `<div style="text-align:left;font-size:13px;color:#4b5563;">
        <b>${row.name}</b> has reached <b>${target}</b> ${evName} events (slips + observations) — that's their next ${label} cycle.
        <p style="margin-top:8px;color:#6b7280;font-size:11px;">
          They will receive a notification with your personal message.<br/>
          The next ${axis} card becomes available after another ${cycle} ${evName} events.
        </p>
      </div>`,
      input: "textarea",
      inputPlaceholder: "Personal message to the staff (optional — they will see this)",
      showCancelButton: true,
      confirmButtonColor: "#155c57",
      confirmButtonText: `Send ${label}`,
      cancelButtonText: "Cancel",
    });
    if (!r.isConfirmed) return;
    try {
      await post("/vats/cards", {
        staff_id: row.staff_id,
        color,
        reason: axis === "positive"
          ? `Reached ${row.positive} recognition events — next recognition tier`
          : `Reached ${row.concern} concern events — next accountability tier`,
        citation: r.value || null,
        issued_on: new Date().toISOString().split("T")[0],
      });
      Swal.fire({ icon: "success", title: `${label} sent`, timer: 1500, showConfirmButton: false });
      fetchAll(); fetchThresholds();
      broadcastVatsChange();
    } catch (err) {
      Swal.fire("Error", err.response?.data?.message || "Failed", "error");
    }
  };

  const saveEdit = async (form) => {
    if (!editing) return;
    try {
      const r = await put(`/vats/cards/${editing.id}`, form);
      const updated = r.data?.data || r.data;
      setCards((p) => p.map((c) => (c.id === editing.id ? { ...c, ...updated } : c)));
      Swal.fire({ icon: "success", title: "Card updated", timer: 1200, showConfirmButton: false });
      setEditing(null);
    } catch (err) {
      Swal.fire("Error", err.response?.data?.message || "Failed", "error");
    }
  };

  /* ────────────── derived ────────────── */
  const countOf = (c) => cards.filter((x) => x.color === c).length;
  const totalCards = cards.length;
  const positiveCount = ["gold", "turquoise", "green"].reduce((s, k) => s + countOf(k), 0);
  const concernCount  = ["yellow", "red"].reduce((s, k) => s + countOf(k), 0);
  const eligible = (thresholds.data || []).filter((r) => (r.suggest_cards || []).length > 0);

  // Group cards by staff for the HR "Card holders" list.
  const holdings = (() => {
    const byStaff = new Map();
    for (const c of cards) {
      const sid = c.staff_id;
      if (!byStaff.has(sid)) {
        byStaff.set(sid, {
          staff_id: sid,
          name: c.staff?.application?.full_name || `Staff #${sid}`,
          employee_id: c.staff?.employee_id || "",
          gold: 0, turquoise: 0, green: 0, yellow: 0, red: 0,
          total: 0, positive: 0, concern: 0,
        });
      }
      const row = byStaff.get(sid);
      row[c.color]   = (row[c.color] || 0) + 1;
      row.total     += 1;
      if (["gold", "turquoise", "green"].includes(c.color)) row.positive += 1;
      if (["yellow", "red"].includes(c.color))              row.concern  += 1;
    }
    return Array.from(byStaff.values()).sort((a, b) => {
      // Sort by recognition desc, then by total, then by name
      if (b.positive !== a.positive) return b.positive - a.positive;
      if (b.total !== a.total) return b.total - a.total;
      return a.name.localeCompare(b.name);
    });
  })();

  return (
    <div className="min-h-screen bg-gray-50/60 px-4 py-5">
      <div className="max-w-full mx-auto">
        <PageHeader
          icon="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z"
          title={isHr ? "Cards Wallet" : "My Cards"}
          subtitle={isHr
            ? "Five-tier recognition & accountability cards. Top three are awards. Last two are formal concerns."
            : "Cards you've received across the year. Each one is a piece of your story — keep them in mind during your annual review."}
        />

        <InfoNote title="The concept — the recognition pyramid">
          Cards sit on a ladder of recognition: <b>daily</b> slip → <b>weekly</b> public naming → <b>monthly</b>
          Star/Card → <b>quarterly</b> personnel record → <b>annual</b> award → <b>career</b> advancement.
          The five cards: <b>🥇 Gold</b> extraordinary all-around · <b>🌊 Turquoise</b> character/moral leadership ·
          <b>🟢 Green</b> sustained professional excellence · <b>🟡 Yellow</b> first formal concern (private, with dignity) ·
          <b>🔴 Red</b> serious accountability. Positive cards are presented publicly; concern cards always in private.
          Cards are <b>never automatic</b> — threshold alerts reach HR, who exercise judgement.
        </InfoNote>

        {/* For non-HR: personal hero strip with totals */}
        {!isHr && (
          <div className="grid grid-cols-3 gap-3 mb-5">
            <div className="bg-white rounded-2xl border border-teal-100 p-4 text-center">
              <p className="text-3xl font-black text-teal-700">{totalCards}</p>
              <p className="text-[10px] uppercase tracking-wider font-bold text-teal-700/70 mt-0.5">Total received</p>
            </div>
            <div className="bg-teal-50 rounded-2xl border border-teal-100 p-4 text-center">
              <p className="text-3xl font-black text-teal-800">{positiveCount}</p>
              <p className="text-[10px] uppercase tracking-wider font-bold text-teal-700/70 mt-0.5">Recognition</p>
            </div>
            <div className="bg-amber-50 rounded-2xl border border-amber-100 p-4 text-center">
              <p className="text-3xl font-black text-amber-800">{concernCount}</p>
              <p className="text-[10px] uppercase tracking-wider font-bold text-amber-700/70 mt-0.5">Concern</p>
            </div>
          </div>
        )}

        {/* Card legend / per-tier counts */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 mb-5">
          {CARDS.map((c) => {
            const count = countOf(c.color);
            const dim = !isHr && count === 0;
            return (
              <div key={c.color}
                className={`relative bg-white rounded-2xl border ${c.positive ? "border-teal-100" : "border-amber-100"} p-4 transition-shadow ${dim ? "opacity-60" : "hover:shadow-sm"}`}>
                <div className="flex items-center gap-2 mb-2">
                  <CardBadge color={c.color} small />
                  <div>
                    <p className="text-sm font-bold text-gray-800">{c.label}</p>
                    <p className="text-[10px] text-gray-400">
                      {count} {isHr ? "sent" : "received"}
                    </p>
                  </div>
                </div>
                <p className="text-[11px] text-gray-600 leading-snug">{c.meaning}</p>
                {!c.positive && (
                  <span className="absolute top-2 right-2 text-[8px] uppercase font-bold tracking-wider px-1.5 py-0.5 rounded bg-amber-50 text-amber-700">
                    Concern
                  </span>
                )}
              </div>
            );
          })}
        </div>

        {/* ───── Ready for a card (HR only) ───── */}
        {isHr && canCreate && eligible.length > 0 && (
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden mb-5">
            <div className="px-5 py-3 bg-gradient-to-r from-teal-50 to-emerald-50 border-b border-gray-100 flex items-center gap-2">
              <FiAward className="w-4 h-4 text-teal-700" />
              <div>
                <p className="text-sm font-bold text-teal-800">Ready for a card</p>
                <p className="text-[11px] text-teal-700/70">
                  Every {thresholds.targets.positive} recognition events (positive slips + observations) → next positive tier (Green → Turquoise → Gold) ·
                  Every {thresholds.targets.concern} concern events → next concern tier (Yellow → Red)
                </p>
              </div>
            </div>
            <div className="divide-y divide-gray-50">
              {eligible.map((row) => {
                const hasPositive = (row.suggest_cards || []).some((c) => c.axis === "positive");
                const breakdown = row.cards_breakdown || {};
                return (
                  <div key={row.staff_id} className="px-5 py-3 flex items-center gap-4 flex-wrap">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${
                      hasPositive ? "bg-teal-100 text-teal-700" : "bg-amber-100 text-amber-700"
                    }`}>
                      {hasPositive ? <FiTrendingUp className="w-5 h-5" /> : <FiAlertTriangle className="w-5 h-5" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-bold text-gray-800 truncate">{row.name}</p>
                      <p className="text-[11px] text-gray-500">
                        <span className="text-teal-700 font-semibold">{row.positive} positive</span>
                        {" · "}
                        <span className="text-amber-700 font-semibold">{row.concern} concern</span>
                        {" · "}
                        <span className="text-gray-600">cards: {breakdown.green || 0}🟢 {breakdown.turquoise || 0}💎 {breakdown.gold || 0}🥇 {breakdown.yellow || 0}🟡 {breakdown.red || 0}🔴</span>
                      </p>
                    </div>
                    <div className="flex gap-2 flex-shrink-0">
                      {(row.suggest_cards || []).map((c) => {
                        const isPositiveAxis = c.axis === "positive";
                        return (
                          <button key={c.axis}
                            onClick={() => sendCard(row, c)}
                            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-white shadow-sm ${
                              isPositiveAxis ? "bg-teal-600 hover:bg-teal-700" : "bg-amber-500 hover:bg-amber-600"
                            }`}
                            title={c.pending > 1 ? `${c.pending} ${c.label}s pending` : `Send 1 ${c.label}`}>
                            <FiAward className="w-3.5 h-3.5" />
                            Send {c.label}
                            {c.pending > 1 && (
                              <span className="ml-1 px-1.5 py-0.5 bg-white/30 rounded text-[10px] font-black">×{c.pending}</span>
                            )}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ───── Card holders (HR-only) — who has how many of which type ───── */}
        {isHr && holdings.length > 0 && (
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden mb-5">
            <div className="px-5 py-3 bg-gradient-to-r from-teal-50 to-emerald-50 border-b border-gray-100 flex items-center gap-2">
              <FiUsers className="w-4 h-4 text-teal-700" />
              <div>
                <p className="text-sm font-bold text-teal-800">Card holders</p>
                <p className="text-[11px] text-teal-700/70">
                  {holdings.length} staff · {totalCards} cards · {positiveCount} recognition · {concernCount} concern
                </p>
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[680px] text-sm">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-100">
                    <th className="px-4 py-2 text-left text-[10px] font-bold text-gray-500 uppercase tracking-wider">Staff</th>
                    <th className="px-2 py-2 text-center text-[10px] font-bold text-gray-500 uppercase tracking-wider">🥇</th>
                    <th className="px-2 py-2 text-center text-[10px] font-bold text-gray-500 uppercase tracking-wider">💎</th>
                    <th className="px-2 py-2 text-center text-[10px] font-bold text-gray-500 uppercase tracking-wider">🟢</th>
                    <th className="px-2 py-2 text-center text-[10px] font-bold text-gray-500 uppercase tracking-wider">🟡</th>
                    <th className="px-2 py-2 text-center text-[10px] font-bold text-gray-500 uppercase tracking-wider">🔴</th>
                    <th className="px-3 py-2 text-center text-[10px] font-bold text-teal-700 uppercase tracking-wider">Recognition</th>
                    <th className="px-3 py-2 text-center text-[10px] font-bold text-amber-700 uppercase tracking-wider">Concern</th>
                    <th className="px-3 py-2 text-center text-[10px] font-bold text-gray-700 uppercase tracking-wider">Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {holdings.map((h) => (
                    <tr key={h.staff_id} className="hover:bg-gray-50/60">
                      <td className="px-4 py-2.5">
                        <p className="text-xs font-semibold text-gray-800 truncate">{h.name}</p>
                        {h.employee_id && <p className="text-[10px] text-gray-400">{h.employee_id}</p>}
                      </td>
                      <CountCell n={h.gold}      tone="gold" />
                      <CountCell n={h.turquoise} tone="turquoise" />
                      <CountCell n={h.green}     tone="green" />
                      <CountCell n={h.yellow}    tone="yellow" />
                      <CountCell n={h.red}       tone="red" />
                      <td className="px-3 py-2.5 text-center">
                        <span className="inline-block min-w-[28px] px-2 py-0.5 rounded-full text-xs font-black bg-teal-50 text-teal-800">
                          {h.positive}
                        </span>
                      </td>
                      <td className="px-3 py-2.5 text-center">
                        <span className="inline-block min-w-[28px] px-2 py-0.5 rounded-full text-xs font-black bg-amber-50 text-amber-800">
                          {h.concern}
                        </span>
                      </td>
                      <td className="px-3 py-2.5 text-center">
                        <span className="text-sm font-black text-gray-800">{h.total}</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ───── Issued cards list ───── */}
        {loading ? (
          <div className="text-center py-12"><Spinner /></div>
        ) : cards.length === 0 ? (
          <EmptyState
            icon="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z"
            title={isHr ? "No cards sent yet" : "You haven't received any cards yet"}
            description={isHr
              ? "Once a staff member reaches a slip threshold, they'll appear in the 'Ready for a card' panel above."
              : "Keep doing your best — cards are awarded when a clear pattern of recognition (or concern) builds up."}
          />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
            {cards.map((c) => {
              const isTarget = String(c.id) === String(highlightId);
              return (
              <div key={c.id}
                ref={(el) => { if (el) cardRefs.current[String(c.id)] = el; }}
                className={`bg-white rounded-2xl border p-4 flex items-start gap-3 transition-shadow duration-500 ${
                  isTarget && pulseActive
                    ? "border-teal-400 ring-4 ring-teal-200 animate-pulse"
                    : "border-gray-100 hover:shadow-sm"
                }`}>
                <CardBadge color={c.color} />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-sm font-bold text-gray-800 truncate">{c.staff?.application?.full_name || `Staff #${c.staff_id}`}</p>
                    <Pill tone={["gold", "turquoise", "green"].includes(c.color) ? "teal" : "amber"}>
                      {c.color}
                    </Pill>
                  </div>
                  <p className="text-xs text-gray-700 mt-1 leading-snug">{c.reason}</p>
                  {c.citation && <p className="text-[11px] text-gray-500 mt-1.5 italic border-l-2 border-gray-200 pl-2">{c.citation}</p>}
                  <div className="flex items-center justify-between mt-3 pt-2 border-t border-gray-50 gap-2">
                    <p className="text-[10px] text-gray-400 truncate">Sent {c.issued_on?.split?.("T")[0]} by {c.issuer?.name}</p>
                    {(canUpdate || canDelete) && (
                      <div className="flex items-center gap-1 flex-shrink-0">
                        {canUpdate && (
                          <button onClick={() => setEditing(c)}
                            className="p-1.5 text-teal-600 hover:bg-teal-50 rounded-lg transition-colors"
                            title="Edit reason / citation">
                            <FiEdit2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                        {canDelete && (
                          <button onClick={() => remove(c.id)}
                            className="p-1.5 text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                            title="Remove card">
                            <FiTrash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>
              );
            })}
          </div>
        )}

        {editing && (
          <EditCardModal
            card={editing}
            onClose={() => setEditing(null)}
            onSave={saveEdit}
          />
        )}
      </div>
    </div>
  );
}

/* ───────────── Edit modal ───────────── */

function EditCardModal({ card, onClose, onSave }) {
  const [form, setForm] = useState({
    reason: card.reason || "",
    citation: card.citation || "",
    issued_on: card.issued_on ? card.issued_on.split("T")[0] : new Date().toISOString().split("T")[0],
  });
  const [saving, setSaving] = useState(false);
  const inp = "w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-teal-500 focus:border-teal-500 bg-white outline-none";
  const label = "block text-[11px] font-semibold text-gray-500 uppercase tracking-wider mb-1.5";

  const submit = async (e) => {
    e.preventDefault();
    setSaving(true);
    await onSave(form);
    setSaving(false);
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <div className="px-5 py-4 border-b border-gray-100 bg-teal-50 rounded-t-2xl flex items-center gap-2">
          <CardBadge color={card.color} small />
          <div>
            <h3 className="text-sm font-bold text-teal-800">Edit Card</h3>
            <p className="text-[11px] text-teal-700/70">
              {card.staff?.application?.full_name || `Staff #${card.staff_id}`} · {card.color}
            </p>
          </div>
        </div>
        <form onSubmit={submit} className="p-5 space-y-3">
          <div>
            <label className={label}>Reason (one line)</label>
            <input type="text" maxLength={255} required
              className={inp}
              value={form.reason}
              onChange={(e) => setForm({ ...form, reason: e.target.value })} />
          </div>
          <div>
            <label className={label}>Citation (personal message to staff)</label>
            <textarea rows={4}
              className={inp}
              value={form.citation}
              onChange={(e) => setForm({ ...form, citation: e.target.value })}
              placeholder="Optional — the staff already saw the original message. Edits here update the wallet entry." />
          </div>
          <div>
            <label className={label}>Date sent</label>
            <DateField required
              className={inp}
              value={form.issued_on}
              onChange={(e) => setForm({ ...form, issued_on: e.target.value })} />
          </div>
          <p className="text-[10px] text-gray-400 italic">
            The card colour is the tier identity and cannot be changed. To change tier, remove this card and send a new one.
          </p>
          <div className="flex gap-2 pt-2">
            <button type="button" onClick={onClose}
              className="flex-1 px-4 py-2.5 border border-gray-200 text-gray-700 text-sm font-semibold rounded-xl hover:bg-gray-50">
              Cancel
            </button>
            <button type="submit" disabled={saving}
              className="flex-1 px-4 py-2.5 bg-teal-600 text-white text-sm font-semibold rounded-xl hover:bg-teal-700 disabled:opacity-50">
              {saving ? "Saving…" : "Save changes"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

/** Count cell for the Card-holders table. Greys out when zero. */
function CountCell({ n, tone }) {
  // Branded teal for positive tiers, amber for concern tiers.
  const isPositive = ["gold", "turquoise", "green"].includes(tone);
  const filled = n > 0;
  const bg = !filled ? "text-gray-300" : isPositive ? "text-teal-800" : "text-amber-800";
  return (
    <td className="px-2 py-2.5 text-center">
      <span className={`text-sm font-bold ${bg}`}>{n}</span>
    </td>
  );
}
