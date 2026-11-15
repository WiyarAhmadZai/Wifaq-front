import { useState, useEffect, useCallback } from "react";
import { get } from "../../api/axios";
import Swal from "sweetalert2";
import { TEAL, GOLD_LT, GOLD_SOFT, GOLD_DEEP, describeError } from "../education/weeklyUi";

const TYPE_LABEL = {
  opening: "Opening", quran: "Quran recitation", poem: "Poem", qa: "Question & answer",
  article: "Article / talk", anthem: "Anthem", sport: "Sport / movement", social: "Social item",
  recognition: "Recognition", closing: "Closing", other: "Other",
};

const Spinner = () => (
  <div className="flex justify-center py-16">
    <div className="w-7 h-7 border-2 rounded-full animate-spin" style={{ borderColor: "#CFE6E6", borderTopColor: TEAL }} />
  </div>
);

/** Whole days from today to an ISO date — negative once it is in the past. */
const daysAway = (iso) => {
  if (!iso) return null;
  const [y, m, d] = iso.split("-").map(Number);
  if (!y || !m || !d) return null;
  const then = new Date(y, m - 1, d);
  const now = new Date();
  return Math.round((then - new Date(now.getFullYear(), now.getMonth(), now.getDate())) / 86400000);
};

const countdown = (iso) => {
  const n = daysAway(iso);
  if (n === null) return "";
  if (n === 0) return "Today";
  if (n === 1) return "Tomorrow";
  return `In ${n} days`;
};

/**
 * My Assembly Role — read-only, for the student who has to perform.
 *
 * It answers one question: what am I preparing, and by when. There is nothing
 * to edit here on purpose — the program belongs to the supervising teacher, and
 * a student only ever needs to know their own part of it.
 */
export default function MyAssemblyRoles() {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState(null);
  const [denied, setDenied] = useState("");

  const load = useCallback(async () => {
    try {
      const res = await get("/assemblies/my-responsibilities");
      setData(res.data);
    } catch (err) {
      // A staff account has no student behind it — that is an explanation, not
      // an error worth a popup.
      if (err?.response?.status === 403) setDenied(err.response.data?.message || "This page is for students and their families.");
      else Swal.fire("Error", describeError(err, "Failed to load your assembly roles."), "error");
    } finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  if (loading) return <Spinner />;

  const upcoming = data?.upcoming || [];
  const past = data?.past || [];

  return (
    <div className="min-h-screen bg-[#F4F8F8]">
      <div className="px-5 py-4" style={{ background: TEAL }}>
        <h1 className="text-sm font-bold text-white">My Assembly Role</h1>
        <p className="text-xs text-[#CFE6E6] mt-0.5">
          What you are presenting at the morning assembly, and the day to be ready by.
        </p>
      </div>

      <div className="px-4 py-5 space-y-4 max-w-3xl mx-auto">
        {denied ? (
          <div className="bg-white rounded-2xl border border-[#D0E0E0] shadow-sm p-10 text-center">
            <p className="text-sm font-bold text-[#0A3A3E]">Not your page</p>
            <p className="text-xs text-[#5A7A7E] mt-1">{denied}</p>
          </div>
        ) : upcoming.length === 0 ? (
          <div className="bg-white rounded-2xl border border-[#D0E0E0] shadow-sm p-10 text-center">
            <div className="text-3xl mb-2">🎤</div>
            <p className="text-sm font-bold text-[#0A3A3E]">Nothing to prepare right now</p>
            <p className="text-xs text-[#5A7A7E] mt-1">
              When a teacher gives you a part in an assembly it appears here, and you get a notification.
            </p>
          </div>
        ) : (
          upcoming.map((r) => (
            <div key={r.id} className="rounded-2xl border shadow-sm overflow-hidden"
              style={{ background: GOLD_LT, borderColor: GOLD_SOFT }}>
              <div className="px-4 py-3 flex items-center justify-between gap-3 flex-wrap"
                style={{ borderBottom: `1px solid ${GOLD_SOFT}` }}>
                <div>
                  {/* Weekday first — it is the part a student plans around. */}
                  <div className="text-sm font-bold" style={{ color: GOLD_DEEP }}>
                    {r.day_name}, {r.date}
                  </div>
                  <div className="text-[11px]" style={{ color: GOLD_DEEP, opacity: 0.85 }}>
                    {r.theme}{r.unit ? ` · ${r.unit}` : ""}
                  </div>
                </div>
                <span className="px-3 py-1 rounded-full text-[11px] font-bold bg-white/70" style={{ color: GOLD_DEEP }}>
                  {countdown(r.date)}
                </span>
              </div>

              <div className="bg-white px-4 py-4 space-y-3">
                <div>
                  <div className="text-[10px] font-bold text-[#5A7A7E] uppercase tracking-wider">Your responsibility</div>
                  <div className="text-lg font-bold text-[#0A3A3E] mt-0.5">{r.role || r.title}</div>
                  <div className="text-xs text-[#5A7A7E]">
                    {TYPE_LABEL[r.type] || r.type} · {r.title} · about {r.duration_minutes} min
                  </div>
                </div>

                {r.notes && (
                  <div className="bg-[#E8F6F6] rounded-xl px-3 py-2 text-xs" style={{ color: TEAL }}>
                    📌 {r.notes}
                  </div>
                )}

                <div className="flex flex-wrap gap-x-5 gap-y-1 text-[11px] text-[#5A7A7E] pt-1">
                  <span>Be ready by <b className="text-[#0A3A3E]">{r.prepare_by}</b></span>
                  {r.lead_teacher && <span>Teacher in charge: <b className="text-[#0A3A3E]">{r.lead_teacher}</b></span>}
                  {r.student && <span>For: <b className="text-[#0A3A3E]">{r.student}</b></span>}
                  <span style={{ color: r.ready ? "#2E7D5B" : "#8A6F10" }}>
                    {r.ready ? "✓ Checked by your teacher" : "⏳ Not checked yet"}
                  </span>
                </div>
              </div>
            </div>
          ))
        )}

        {past.length > 0 && (
          <div className="bg-white rounded-2xl border border-[#D0E0E0] shadow-sm overflow-hidden">
            <div className="px-4 py-3 border-b border-[#D0E0E0]">
              <h3 className="text-[10px] font-bold text-[#5A7A7E] uppercase tracking-wider">Already performed</h3>
            </div>
            <ul className="divide-y divide-[#D0E0E0]">
              {past.map((r) => (
                <li key={r.id} className="px-4 py-2.5 flex items-center justify-between gap-3">
                  <span className="text-sm text-[#0A3A3E]">{r.role || r.title}</span>
                  <span className="text-xs text-[#5A7A7E] whitespace-nowrap">{r.day_name}, {r.date}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
}
