import { useNavigate } from "react-router-dom";
import {
  PREPARATION, CALL_STEPS, NEVER_DO, LANGUAGE_SWAPS,
  WINTER_POINTS, OBJECTIONS, QUICK_REFERENCE, ESCALATION,
} from "./callGuide";
import { TEAL, MUTED, BORDER, GOLD_LT, GOLD_SOFT, GOLD_DEEP } from "./parentCommsUi";

/**
 * Call Guide — the school's phone protocol, on screen instead of in a Word file
 * on someone's desktop.
 *
 * Transcribed from رهنمود تماس تلیفونی, the handbook §2.6 / §3.4 / §8, and the
 * winter phone script. Read-only by design: this is the agreed wording, and the
 * point of it is that every officer says the same thing. Editing it is a
 * decision for the tarbiyati deputy, not a page in the app.
 *
 * Printable, because the officer wants it beside the phone.
 */

const Card = ({ title, subtitle, children, tone }) => (
  <div className="bg-white border rounded-2xl p-5"
    style={{ borderColor: tone === "warn" ? "#EFCBD6" : BORDER }}>
    <h2 className="text-sm font-bold" style={{ color: tone === "warn" ? "#B0546E" : TEAL }}>{title}</h2>
    {subtitle && <p className="text-[11px] mt-0.5 mb-3" style={{ color: MUTED }}>{subtitle}</p>}
    <div className={subtitle ? "" : "mt-3"}>{children}</div>
  </div>
);

export default function ParentCallGuide() {
  const navigate = useNavigate();

  return (
    <div className="px-4 py-5 space-y-5">
      <style>{`@media print { .no-print { display: none !important; } }`}</style>

      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="flex items-center gap-3">
          <button type="button" onClick={() => navigate(-1)}
            className="no-print p-2 rounded-xl border border-gray-200 hover:bg-gray-50" title="Back">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
          </button>
          <div>
            <h1 className="text-lg font-bold text-gray-800">Call Guide</h1>
            <p className="text-xs mt-0.5" style={{ color: MUTED }}>
              رهنمود تماس تلیفونی با والدین — the agreed protocol, so every call sounds like the same school.
            </p>
          </div>
        </div>
        <div className="no-print flex gap-2">
          <button onClick={() => window.print()}
            className="px-4 py-2.5 text-sm font-semibold rounded-xl border border-gray-200 text-gray-700 hover:bg-gray-50">
            Print
          </button>
          <button onClick={() => navigate("/parent-communications/create")}
            className="px-4 py-2.5 text-sm font-semibold rounded-xl bg-teal-600 text-white hover:bg-teal-700">
            Record a call
          </button>
        </div>
      </div>

      {/* Quick reference — the card beside the phone */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        {QUICK_REFERENCE.map((q) => (
          <div key={q.label} className="px-4 py-3 rounded-2xl border bg-white" style={{ borderColor: BORDER }}>
            <div className="text-[10px] font-bold uppercase tracking-wide" style={{ color: MUTED }}>{q.label}</div>
            <bdi dir="auto" className="block text-sm font-bold mt-0.5" style={{ color: TEAL }}>{q.value}</bdi>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <Card title="پیش از تماس" subtitle="Before you dial — §8.1">
          <ul className="space-y-2">
            {PREPARATION.map((p, i) => (
              <li key={i} className="flex gap-2 text-sm">
                <span className="font-bold flex-shrink-0" style={{ color: TEAL }}>{i + 1}.</span>
                <bdi dir="auto">{p}</bdi>
              </li>
            ))}
          </ul>
        </Card>

        <Card title="قاعده ارجاع" subtitle="Who decides what — §3.4. If you are unsure whether a decision is yours, ask.">
          <table className="w-full text-sm">
            <tbody>
              {ESCALATION.map((e, i) => (
                <tr key={i} className="border-b last:border-0" style={{ borderColor: "#EEF4F4" }}>
                  <td className="py-2 pr-3"><bdi dir="auto">{e.level}</bdi></td>
                  <td className="py-2 text-right font-semibold whitespace-nowrap" style={{ color: TEAL }}>
                    <bdi dir="auto">{e.owner}</bdi>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      </div>

      <Card title="ساختار مکالمه" subtitle="The seven steps, in order — §8.2">
        <div className="space-y-3">
          {CALL_STEPS.map((s) => (
            <div key={s.step} className="flex gap-3">
              <div className="flex-shrink-0 w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold text-white"
                style={{ background: TEAL }}>
                {s.step}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-baseline gap-2">
                  <bdi dir="auto" className="text-sm font-bold" style={{ color: "#0A3A3E" }}>{s.title}</bdi>
                  <span className="text-[11px]" style={{ color: MUTED }}>{s.en}</span>
                </div>
                <bdi dir="auto" className="block text-sm mt-1 p-2.5 rounded-xl leading-relaxed"
                  style={{ background: "#F4F8F8", color: "#0A3A3E" }}>
                  {s.script}
                </bdi>
              </div>
            </div>
          ))}
        </div>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <Card tone="warn" title="آنچه هرگز در تماس انجام نمی‌دهید" subtitle="Never, on any call — §8.3">
          <ul className="space-y-2">
            {NEVER_DO.map((n, i) => (
              <li key={i} className="flex gap-2 text-sm">
                <span className="flex-shrink-0 font-bold" style={{ color: "#B0546E" }}>✕</span>
                <bdi dir="auto">{n}</bdi>
              </li>
            ))}
          </ul>
        </Card>

        <Card title="زبان اصلاحی، نه انتقادی" subtitle="Corrective language, never critical — §2.6">
          <div className="space-y-3">
            {LANGUAGE_SWAPS.map((s, i) => (
              <div key={i}>
                <bdi dir="auto" className="block text-[12px] line-through" style={{ color: "#B0546E" }}>{s.dont}</bdi>
                <bdi dir="auto" className="block text-sm font-semibold mt-0.5" style={{ color: "#2E7D5B" }}>{s.do}</bdi>
              </div>
            ))}
          </div>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <Card title="نکات برنامه زمستانی" subtitle="Winter programme — talk naturally, do not read the list out">
          <table className="w-full text-sm">
            <tbody>
              {WINTER_POINTS.map((w, i) => (
                <tr key={i} className="border-b last:border-0" style={{ borderColor: "#EEF4F4" }}>
                  <td className="py-2 pr-3 font-semibold whitespace-nowrap align-top" style={{ color: TEAL }}>{w.point}</td>
                  <td className="py-2"><bdi dir="auto">{w.script}</bdi></td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>

        <Card title="جواب نگرانی‌ها" subtitle="The four objections that actually come up">
          <div className="space-y-3">
            {OBJECTIONS.map((o, i) => (
              <div key={i} className="p-3 rounded-xl border"
                style={{ background: GOLD_LT, borderColor: GOLD_SOFT }}>
                <div className="flex flex-wrap items-baseline gap-2">
                  <bdi dir="auto" className="text-sm font-bold" style={{ color: GOLD_DEEP }}>{o.objection}</bdi>
                  <span className="text-[10px]" style={{ color: MUTED }}>{o.en}</span>
                </div>
                <bdi dir="auto" className="block text-sm mt-1">{o.answer}</bdi>
              </div>
            ))}
          </div>
        </Card>
      </div>

      <div className="p-4 rounded-2xl border text-sm" style={{ borderColor: BORDER, background: "#F4F8F8" }}>
        <bdi dir="auto" style={{ color: "#0A3A3E" }}>
          اول بپرس، بعد معلومات بده — فشار نیاور، دوستانه صحبت کن — جواب‌ها را یادداشت کن برای سیستم.
        </bdi>
        <p className="text-[11px] mt-1" style={{ color: MUTED }}>
          Ask first, then inform. Don't push. Write the answers down — that is what the log is for.
        </p>
      </div>
    </div>
  );
}
