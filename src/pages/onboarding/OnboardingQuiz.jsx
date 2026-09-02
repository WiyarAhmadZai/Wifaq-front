import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import Swal from "sweetalert2";
import { getQuizPaper, submitQuiz } from "../../api/onboarding";

const LANGS = [
  { code: "ps", label: "پښتو" },
  { code: "fa", label: "دری" },
  { code: "en", label: "English" },
  { code: "ar", label: "العربية" },
];

/**
 * The onboarding quiz, taken inside the system.
 *
 * Structure the candidate sees: the paper is grouped into sections that mirror
 * the orientation material, a `multi` question states how many options to pick,
 * and nothing can be submitted until every question is answered. After
 * submission every question comes back marked, with the reason — the quiz is a
 * teaching device first and a gate second.
 */
export default function OnboardingQuiz() {
  const navigate = useNavigate();

  const [lang, setLang] = useState("fa");
  const [paper, setPaper] = useState(null);
  const [answers, setAnswers] = useState({});
  const [loading, setLoading] = useState(true);
  const [blocked, setBlocked] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState(null);

  // Fixed at mount so a language switch does not reset the clock.
  const startedAt = useRef(new Date().toISOString());

  // ── Load the paper ────────────────────────────────────────────────────────
  useEffect(() => {
    let alive = true;

    (async () => {
      setLoading(true);
      try {
        const res = await getQuizPaper(lang);
        if (alive) {
          setPaper(res.data?.data || null);
          setBlocked(null);
        }
      } catch (e) {
        if (alive) {
          setBlocked(e?.response?.data?.message || "The quiz is not available right now.");
          setPaper(null);
        }
      } finally {
        if (alive) setLoading(false);
      }
    })();

    return () => {
      alive = false;
    };
  }, [lang]);

  const questions = useMemo(
    () => (paper?.sections || []).flatMap((s) => s.questions),
    [paper]
  );
  const answered = questions.filter((q) => (answers[q.id] || []).length > 0).length;
  const complete = questions.length > 0 && answered === questions.length;

  // Language switch keeps the answers: the option order is identical across
  // languages, so index N means the same thing in every one.
  const pick = useCallback((q, index) => {
    setAnswers((prev) => {
      const current = prev[q.id] || [];
      if (q.type === "multi") {
        const next = current.includes(index)
          ? current.filter((i) => i !== index)
          : [...current, index];
        return { ...prev, [q.id]: next };
      }
      return { ...prev, [q.id]: [index] };
    });
  }, []);

  const handleSubmit = async () => {
    if (!complete) return;

    const confirm = await Swal.fire({
      title: "Submit your answers?",
      text: `You have answered all ${questions.length} questions. This counts as attempt ${paper.attempt_no}.`,
      icon: "question",
      showCancelButton: true,
      confirmButtonColor: "#0d9488",
      cancelButtonColor: "#6b7280",
      confirmButtonText: "Submit",
    });
    if (!confirm.isConfirmed) return;

    setSubmitting(true);
    try {
      const res = await submitQuiz({ lang, answers, started_at: startedAt.current });
      if (res.data?.success) {
        setResult(res.data.data);
        window.scrollTo({ top: 0, behavior: "smooth" });
      }
    } catch (e) {
      Swal.fire("Not submitted", e?.response?.data?.message || "Please try again.", "error");
    } finally {
      setSubmitting(false);
    }
  };

  const dir = paper?.dir || "rtl";

  // ── States ────────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="h-64 flex items-center justify-center">
        <div className="animate-spin rounded-full h-9 w-9 border-4 border-teal-100 border-t-teal-600" />
      </div>
    );
  }

  if (result) return <Results result={result} lang={lang} onBack={() => navigate("/onboarding")} />;

  if (blocked) {
    return (
      <div className="max-w-2xl mx-auto p-6">
        <div className="rounded-xl border border-amber-300 bg-amber-50 p-5">
          <p className="text-sm font-semibold text-amber-800">{blocked}</p>
          <Link
            to="/onboarding"
            className="mt-3 inline-block px-4 py-2 text-xs font-semibold rounded-lg bg-teal-600 text-white hover:bg-teal-700"
          >
            Back to my onboarding
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto p-4 sm:p-6 pb-28">
      {/* Header */}
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-lg font-bold text-gray-900">Onboarding quiz</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            {questions.length} questions · pass mark {paper.pass_mark}% · attempt{" "}
            {paper.attempt_no}
            {paper.attempts_left != null ? ` of ${paper.attempt_no + paper.attempts_left - 1}` : ""}
          </p>
        </div>

        <div className="flex items-center gap-1 bg-gray-100 rounded-lg p-0.5">
          {LANGS.map((l) => (
            <button
              key={l.code}
              onClick={() => setLang(l.code)}
              className={`px-2.5 py-1 rounded-md text-xs font-semibold transition-colors ${
                lang === l.code ? "bg-white text-teal-800 shadow-sm" : "text-gray-600 hover:text-gray-900"
              }`}
            >
              {l.label}
            </button>
          ))}
        </div>
      </header>

      {/* Sections */}
      <div className="mt-5 space-y-5" dir={dir}>
        {paper.sections.map((section, si) => (
          <section key={section.key} className="rounded-xl border border-gray-200 bg-white">
            <h2 className="px-4 py-2.5 border-b border-gray-200 bg-gray-50 rounded-t-xl text-sm font-bold text-gray-800">
              <span className="text-teal-600">{si + 1}.</span> {section.title}
            </h2>

            <ol className="divide-y divide-gray-100">
              {section.questions.map((q) => {
                const picked = answers[q.id] || [];
                const multi = q.type === "multi";
                return (
                  <li key={q.id} className="p-4">
                    <p className="text-sm font-semibold text-gray-900">
                      {q.prompt}
                      {multi && (
                        <span className="ms-2 text-[11px] font-bold text-teal-700">
                          (choose {q.choose})
                        </span>
                      )}
                    </p>

                    <div className="mt-2.5 space-y-1.5">
                      {q.options.map((opt, oi) => {
                        const on = picked.includes(oi);
                        return (
                          <label
                            key={oi}
                            className={`flex items-start gap-2.5 px-3 py-2 rounded-lg border cursor-pointer transition-colors ${
                              on
                                ? "border-teal-500 bg-teal-50"
                                : "border-gray-200 hover:border-teal-300"
                            }`}
                          >
                            <input
                              type={multi ? "checkbox" : "radio"}
                              name={q.id}
                              checked={on}
                              onChange={() => pick(q, oi)}
                              className={`mt-0.5 text-teal-600 focus:ring-teal-500 ${
                                multi ? "rounded" : ""
                              }`}
                            />
                            <span className="text-sm text-gray-700">{opt}</span>
                          </label>
                        );
                      })}
                    </div>
                  </li>
                );
              })}
            </ol>
          </section>
        ))}
      </div>

      {/* Sticky submit bar — the progress count is what stops someone
          submitting a half-finished paper by accident. */}
      <div className="fixed bottom-0 inset-x-0 bg-white/95 backdrop-blur border-t border-gray-200 px-4 py-3">
        <div className="max-w-3xl mx-auto flex items-center justify-between gap-3">
          <div className="min-w-0 flex-1">
            <div className="h-1.5 bg-gray-200 rounded-full overflow-hidden">
              <div
                className="h-full bg-teal-500 transition-all"
                style={{ width: `${questions.length ? (answered / questions.length) * 100 : 0}%` }}
              />
            </div>
            <p className="mt-1 text-[11px] text-gray-600">
              {answered} of {questions.length} answered
            </p>
          </div>
          <button
            onClick={handleSubmit}
            disabled={!complete || submitting}
            className="shrink-0 px-5 py-2.5 text-xs font-semibold rounded-lg bg-teal-600 text-white hover:bg-teal-700 disabled:opacity-40 transition-colors"
          >
            {submitting ? "Submitting…" : "Submit"}
          </button>
        </div>
      </div>
    </div>
  );
}

/** The marked paper: score, section breakdown, then every question explained. */
function Results({ result, lang, onBack }) {
  const passed = result.passed;
  const dir = lang === "en" ? "ltr" : "rtl";

  return (
    <div className="max-w-3xl mx-auto p-4 sm:p-6 space-y-5">
      <div
        className={`rounded-xl border p-5 text-center ${
          passed ? "border-emerald-300 bg-emerald-50" : "border-amber-300 bg-amber-50"
        }`}
      >
        <p className="text-3xl font-extrabold text-gray-900">{result.percent}%</p>
        <p className="mt-1 text-sm font-semibold text-gray-700">
          {result.score} of {result.total} correct · pass mark {result.pass_mark}%
        </p>
        <p
          className={`mt-2 text-sm font-bold ${passed ? "text-emerald-700" : "text-amber-700"}`}
        >
          {passed
            ? "Passed — welcome aboard."
            : result.status?.can_attempt
            ? "Not passed yet. Re-read the sections below and try again."
            : "Not passed, and no attempts remain. HR will be in touch."}
        </p>
      </div>

      {/* Where the gap is */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        {result.sections.map((s) => (
          <div
            key={s.key}
            className={`rounded-lg border p-3 text-center ${
              s.percent === 100 ? "border-emerald-200 bg-emerald-50" : "border-amber-200 bg-amber-50"
            }`}
          >
            <p className="text-[10px] uppercase tracking-wide text-gray-500">{s.title}</p>
            <p className="text-sm font-bold text-gray-900">
              {s.score}/{s.total}
            </p>
          </div>
        ))}
      </div>

      {/* Every question, marked and explained */}
      <div className="space-y-3" dir={dir}>
        {result.review.map((r, i) => (
          <div
            key={r.id}
            className={`rounded-xl border p-4 ${
              r.correct ? "border-gray-200 bg-white" : "border-red-200 bg-red-50/40"
            }`}
          >
            <div className="flex items-start gap-2">
              <span
                className={`shrink-0 mt-0.5 w-5 h-5 rounded-full text-[11px] font-bold flex items-center justify-center ${
                  r.correct ? "bg-emerald-100 text-emerald-700" : "bg-red-100 text-red-700"
                }`}
              >
                {r.correct ? "✓" : "✕"}
              </span>
              <p className="text-sm font-semibold text-gray-900">
                {i + 1}. {r.prompt}
              </p>
            </div>

            <ul className="mt-2 space-y-1">
              {r.options.map((opt, oi) => {
                const isExpected = r.expected.includes(oi);
                const isPicked = r.picked.includes(oi);
                return (
                  <li
                    key={oi}
                    className={`px-3 py-1.5 rounded-lg text-sm ${
                      isExpected
                        ? "bg-emerald-50 text-emerald-800 font-semibold"
                        : isPicked
                        ? "bg-red-50 text-red-700 line-through"
                        : "text-gray-600"
                    }`}
                  >
                    {opt}
                    {isExpected && <span className="ms-2 text-[11px]">correct</span>}
                    {isPicked && !isExpected && <span className="ms-2 text-[11px]">your answer</span>}
                  </li>
                );
              })}
            </ul>

            <p className="mt-2 text-[12px] text-gray-600 border-t border-gray-200 pt-2">{r.explain}</p>
          </div>
        ))}
      </div>

      <button
        onClick={onBack}
        className="w-full sm:w-auto px-5 py-2.5 text-xs font-semibold rounded-lg bg-teal-600 text-white hover:bg-teal-700"
      >
        Back to my onboarding
      </button>
    </div>
  );
}
