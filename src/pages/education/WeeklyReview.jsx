import { useState, useEffect, useCallback } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { get, post, del } from "../../api/axios";
import Swal from "sweetalert2";
import { DimPill, Spinner, StudentName, cleanClass, cleanName, TEAL, GOLD } from "./weeklyUi";
import PrintSheet from "../../components/PrintSheet";
import AwardCertificate from "./AwardCertificate";
import { CERT_LANGS } from "./certificateI18n";


const initials = (n) => cleanName(n).split(" ").map((w) => w[0]).slice(0, 2).join("").toUpperCase();

/**
 * Tarbiyati lead's end-of-week screen. Nominations grouped by student, most
 * nominated first — the stacked count is the signal, the reasons are the
 * evidence. Selecting is the single trigger that records the award, writes it
 * to the shared recognition history, and generates the announcement.
 */
export default function WeeklyReview() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const topicId = params.get("topic_id");

  const [loading, setLoading] = useState(true);
  const [printing, setPrinting] = useState(null); // the award being printed
  const [certLang, setCertLang] = useState("en");
  const [data, setData] = useState(null);

  const load = useCallback(async (id) => {
    setLoading(true);
    try {
      let tid = id;
      if (!tid) {
        // No topic given — fall back to whatever the module considers current.
        const base = await get("/weekly-recognition");
        tid = base.data?.topic?.id;
        if (!tid) { setData(null); setLoading(false); return; }
      }
      const res = await get(`/weekly-recognition/topics/${tid}/review`);
      setData(res.data);
    } catch (err) {
      if (err.response?.status === 403) setData({ forbidden: true });
      else Swal.fire("Error", "Failed to load the review", "error");
    } finally { setLoading(false); }
  }, []);

  useEffect(() => { load(topicId); }, [load, topicId]);

  const topic = data?.topic;

  const selectWinner = async (group) => {
    const { value, isConfirmed } = await Swal.fire({
      title: `Select ${cleanName(group.student)}?`,
      html: `<div style="text-align:left;font-size:13px">
               <b>${group.count}</b> teacher nomination${group.count === 1 ? "" : "s"} for
               <b>${topic?.title || "this week"}</b>.<br/><br/>
               This records the award, writes it into the student's recognition history,
               and generates the announcement for the morning assembly.
             </div>`,
      input: "textarea",
      inputPlaceholder: "Citation to read out (leave blank to use the teachers' own words)…",
      showCancelButton: true,
      confirmButtonColor: GOLD,
      confirmButtonText: "🏆 Select as Best Performer",
    });
    if (!isConfirmed) return;

    try {
      await post(`/weekly-recognition/topics/${topic.id}/select`, {
        student_id: group.student_id,
        citation: (value || "").trim() || undefined,
      });
      window.dispatchEvent(new CustomEvent("wen:notifications-refresh"));
      load(topic.id);
    } catch (err) {
      Swal.fire("Error", err.response?.data?.message || "Failed to select the winner", "error");
    }
  };

  const undoAward = async (award) => {
    const r = await Swal.fire({
      title: "Undo this award?",
      text: "The recognition-history entry is removed with it.",
      icon: "warning", showCancelButton: true, confirmButtonColor: "#ef4444",
    });
    if (!r.isConfirmed) return;
    try { await del(`/weekly-recognition/awards/${award.id}`); load(topic.id); }
    catch (err) { Swal.fire("Error", err.response?.data?.message || "Failed", "error"); }
  };

  const closeNoAward = async () => {
    const r = await Swal.fire({
      title: "Close with no award?",
      text: "Not every week must force a winner.",
      icon: "question", showCancelButton: true, confirmButtonColor: TEAL,
    });
    if (!r.isConfirmed) return;
    try { await post(`/weekly-recognition/topics/${topic.id}/no-award`); load(topic.id); }
    catch (err) { Swal.fire("Error", err.response?.data?.message || "Failed", "error"); }
  };

  if (loading) return <Spinner />;

  if (data?.forbidden) {
    return (
      <div className="max-w-lg mx-auto px-4 py-16 text-center">
        <div className="text-3xl">⚖️</div>
        <p className="text-sm font-semibold text-[#0A3A3E] mt-2">Review &amp; Select is for the tarbiyati lead</p>
        <p className="text-xs text-[#5A7A7E] mt-1">You can still nominate students through the week.</p>
        <button onClick={() => navigate("/education/weekly-recognition/nominate")}
          className="mt-4 px-5 py-2 text-xs font-semibold text-white rounded-xl" style={{ background: TEAL }}>
          Go to Nominate
        </button>
      </div>
    );
  }

  if (!topic) {
    return (
      <div className="max-w-lg mx-auto px-4 py-16 text-center">
        <div className="text-3xl">🎯</div>
        <p className="text-sm font-semibold text-[#0A3A3E] mt-2">No weekly topic to review</p>
        <button onClick={() => navigate("/education/weekly-recognition")}
          className="mt-4 px-5 py-2 text-xs font-semibold text-white rounded-xl" style={{ background: TEAL }}>
          Set this week's topic
        </button>
      </div>
    );
  }

  const groups = data?.groups || [];
  const awards = data?.awards || [];

  return (
    <div className="min-h-screen bg-[#F4F8F8]">
      <div className="px-5 py-4" style={{ background: TEAL }}>
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h1 className="text-sm font-bold text-white">Review &amp; Select</h1>
            <p className="text-xs text-[#CFE6E6] mt-0.5">
              {topic.title} · {topic.week_start} → {topic.week_end} · {topic.nomination_count} nominations, {topic.student_count} students
            </p>
          </div>
          <button onClick={() => navigate("/education/weekly-recognition/history")}
            className="px-4 py-1.5 bg-white/15 hover:bg-white/25 text-white rounded-xl text-xs font-bold">
            📜 History
          </button>
        </div>
      </div>

      <div className="px-4 py-5 space-y-4 max-w-4xl mx-auto">
        {/* Announcement — generated the moment a winner is selected */}
        {awards.map((a) => (
          <div key={a.id} className="rounded-2xl border p-5 text-center"
            style={{ background: "#FFF8E7", borderColor: "#E8D48B" }}>
            <div className="text-3xl">🏆</div>
            <StudentName name={a.student} className="text-xl font-bold mt-1 block" style={{ color: "#6B5100" }} />
            <div className="text-xs" style={{ color: "#8A6F10" }}>
              {cleanClass(a.class) ? `${cleanClass(a.class)} · ` : ""}Best Performer of the Week
            </div>
            <div className="flex justify-center flex-wrap gap-1.5 mt-2">
              {(a.dimensions || []).map((d) => <DimPill key={d} d={d} />)}
            </div>
            {a.citation && (
              <p className="text-[13px] mt-3 max-w-xl mx-auto" style={{ color: "#6B5100" }}>{a.citation}</p>
            )}
            <div className="mt-4 text-[11px] text-left max-w-xl mx-auto space-y-1" style={{ color: "#6B5100" }}>
              <div>✓ Written to <b>{cleanName(a.student)}'s recognition history</b> — one timeline with the monthly cards</div>
              <div>✓ Sent to the family as an announcement</div>
              <div>✓ Available to the <b>Morning Assembly agenda</b> as a recognition block</div>
            </div>
            <div className="flex items-center justify-center gap-2 mt-4">
              <button onClick={() => setPrinting(a)}
                className="px-4 py-1.5 text-xs font-semibold rounded-xl border" style={{ borderColor: "#E8D48B", color: "#8A6F10" }}>
                🖨 Print for assembly
              </button>
              <button onClick={() => navigate("/assembly/calendar")}
                className="px-4 py-1.5 text-xs font-semibold text-white rounded-xl" style={{ background: TEAL }}>
                Honour at assembly →
              </button>
              {data?.can_manage && (
                <button onClick={() => undoAward(a)} className="px-3 py-1.5 text-xs font-semibold text-red-500">
                  Undo
                </button>
              )}
            </div>
          </div>
        ))}

        {topic.status === "no_award" && (
          <div className="bg-[#E8F0F0] border border-[#D0E0E0] rounded-2xl px-4 py-3 text-xs text-[#5A7A7E]">
            This week was closed with no award.
          </div>
        )}

        <div className="bg-[#FFF8E7] border-l-4 rounded-xl px-4 py-3 text-xs" style={{ borderColor: GOLD, color: "#6B5100" }}>
          Nominations grouped by student, most-nominated first. The stacked count is your signal — but the
          reasons matter more than the number. Select one (or a few), or close the week with no award.
        </div>

        {groups.length === 0 ? (
          <div className="bg-white rounded-2xl border border-[#D0E0E0] p-8 text-center">
            <p className="text-sm font-semibold text-[#0A3A3E]">No nominations yet for this topic</p>
            <p className="text-xs text-[#5A7A7E] mt-1">Teachers nominate through the week.</p>
          </div>
        ) : (
          groups.map((g, idx) => {
            const leading = idx === 0 && !g.awarded;
            return (
              <div key={g.student_id}
                className="rounded-2xl border p-4 shadow-sm"
                style={{
                  background: g.awarded ? "#FFF8E7" : leading ? "#FFFDF5" : "#fff",
                  borderColor: g.awarded || leading ? "#E8D48B" : "#D0E0E0",
                }}>
                <div className="flex items-center gap-3 flex-wrap">
                  <div className="w-10 h-10 rounded-full flex items-center justify-center text-white font-bold text-sm shrink-0"
                    style={{ background: g.awarded || leading ? GOLD : TEAL }}>
                    {initials(g.student)}
                  </div>
                  <div className="min-w-0">
                    <StudentName name={g.student} className="text-sm font-bold text-[#0A3A3E] block" />
                    <div className="text-[11px] text-[#5A7A7E]">
                      {[cleanClass(g.class), g.code].filter(Boolean).join(" · ") || "No class yet"}
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {(g.dimensions || []).map((d) => <DimPill key={d} d={d} />)}
                  </div>
                  <div className="ml-auto text-center shrink-0">
                    <div className="text-xl font-bold leading-none" style={{ color: GOLD }}>{g.count}</div>
                    <div className="text-[9px] uppercase tracking-wide text-[#8AA4A7]">nominations</div>
                  </div>
                </div>

                <div className="mt-3 pl-3 border-l-2 border-[#D0E0E0] space-y-1.5">
                  {g.evidence.map((e) => (
                    <div key={e.id} className="text-xs text-[#0A3A3E]">
                      {e.reason} <span className="text-[#8AA4A7]">— {e.by || "Unknown"}</span>
                    </div>
                  ))}
                </div>

                <div className="mt-3">
                  {g.awarded ? (
                    <span className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-bold"
                      style={{ background: GOLD, color: "#fff" }}>
                      🏆 Selected
                    </span>
                  ) : (
                    <button onClick={() => selectWinner(g)}
                      className="px-4 py-1.5 rounded-xl text-xs font-bold text-white"
                      style={{ background: leading ? `linear-gradient(135deg,${GOLD},#B08A1E)` : TEAL }}>
                      ★ Select as Best Performer
                    </button>
                  )}
                </div>
              </div>
            );
          })
        )}

        {topic.status === "open" && (
          <button onClick={closeNoAward}
            className="px-4 py-2 text-xs font-semibold text-[#5A7A7E] border border-[#D0E0E0] rounded-xl hover:bg-[#F4F8F8] bg-white">
            No award this week
          </button>
        )}
      </div>

      {/* The printable announcement — a certificate to read out at assembly and
          pin on the board, not a screenshot of the app. */}
      <PrintSheet open={Boolean(printing)} onClose={() => setPrinting(null)}
        size="A4" orientation="landscape" bleed title="Certificate of Recognition"
        actions={
          <>
            {/* Language picker — the certificate is issued to families, so it
                has to be available in the language they read. */}
            <div className="flex rounded-xl overflow-hidden border border-white/25">
              {CERT_LANGS.map((l) => (
                <button key={l.code} onClick={() => setCertLang(l.code)}
                  title={l.label}
                  className="px-3 py-2 text-xs font-bold transition"
                  style={{
                    background: certLang === l.code ? "#C9A227" : "rgba(255,255,255,.12)",
                    color: "#fff",
                  }}>
                  {l.native}
                </button>
              ))}
            </div>
            <button onClick={() => downloadCertificate(printing, certLang)}
              className="px-4 py-2 rounded-xl text-xs font-bold text-white"
              style={{ background: "rgba(255,255,255,.15)" }}>
              ⤓ Download
            </button>
          </>
        }>
        {printing && <AwardCertificate award={printing} topic={topic} lang={certLang} />}
      </PrintSheet>
    </div>
  );
}

/**
 * Save the certificate as a standalone .html file.
 *
 * Everything in the certificate is inline styles and inline SVG, so the node's
 * own markup is already self-contained — no stylesheet to inline, no asset to
 * fetch. The saved file opens in any browser and prints identically, and
 * "Print → Save as PDF" from there produces the PDF. (A true one-click PDF
 * would mean pulling in jsPDF/html2canvas, which this project does not carry.)
 */
function downloadCertificate(award, lang) {
  const node = document.getElementById("wen-print-content");
  if (!node) return;

  // Strip the on-screen fit-to-viewport scaling so the file is full size.
  const clone = node.cloneNode(true);
  clone.style.transform = "none";
  clone.style.transformOrigin = "";

  const who = cleanName(award?.student).replace(/[^\p{L}\p{N}]+/gu, "-").replace(/^-|-$/g, "") || "student";
  const file = `certificate-${who}-${lang}.html`;

  const html = `<!doctype html><html><head><meta charset="utf-8">
<title>Certificate — ${cleanName(award?.student)}</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Noto+Naskh+Arabic:wght@400;500;600;700&family=Vazirmatn:wght@400;500;600;700&display=swap" rel="stylesheet">
<style>
  *{box-sizing:border-box}
  html,body{margin:0;padding:0;background:#fff}
  @page{size:A4 landscape;margin:6mm}
  @media print{*{-webkit-print-color-adjust:exact;print-color-adjust:exact}}
</style></head><body>${clone.outerHTML}</body></html>`;

  const url = URL.createObjectURL(new Blob([html], { type: "text/html;charset=utf-8" }));
  const a = document.createElement("a");
  a.href = url;
  a.download = file;
  document.body.appendChild(a);
  a.click();
  a.remove();
  // Revoke on the next tick so the download has started.
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}
