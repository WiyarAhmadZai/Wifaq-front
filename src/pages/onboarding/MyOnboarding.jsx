import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { getMyOnboarding } from "../../api/onboarding";

/**
 * The new hire's own onboarding page.
 *
 * Same two things the welcome email carried — the orientation material and the
 * quiz — shown inside the system, so neither is ever one lost email away.
 */
export default function MyOnboarding() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const res = await getMyOnboarding();
        if (alive) setData(res.data?.data || null);
      } catch (e) {
        if (alive) setError(e?.response?.data?.message || "Could not load your onboarding.");
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, []);

  const copyPassword = async () => {
    try {
      await navigator.clipboard.writeText(data?.orientation?.password || "");
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      /* Clipboard blocked — the password is on screen anyway. */
    }
  };

  if (loading) {
    return (
      <div className="h-64 flex items-center justify-center">
        <div className="animate-spin rounded-full h-9 w-9 border-4 border-teal-100 border-t-teal-600" />
      </div>
    );
  }

  if (error) {
    return <p className="p-6 text-sm text-red-600">{error}</p>;
  }

  const quiz = data?.quiz || {};
  const orientation = data?.orientation || {};
  const done = quiz.passed;

  return (
    <div className="max-w-3xl mx-auto p-4 sm:p-6 space-y-5">
      <header>
        <h1 className="text-lg font-bold text-gray-900">Your onboarding</h1>
        <p className="text-sm text-gray-500 mt-0.5">
          Two steps before your first day, {data?.name}. Do them in order.
        </p>
      </header>

      {/* Progress strip */}
      <div className="flex items-center gap-2 text-[11px] font-semibold">
        <span className="px-2.5 py-1 rounded-full bg-teal-50 text-teal-700 border border-teal-200">
          1 · Orientation
        </span>
        <span className="flex-1 h-px bg-gray-200" />
        <span
          className={`px-2.5 py-1 rounded-full border ${
            done
              ? "bg-emerald-50 text-emerald-700 border-emerald-200"
              : "bg-amber-50 text-amber-700 border-amber-200"
          }`}
        >
          2 · Quiz {done ? "· passed" : "· pending"}
        </span>
      </div>

      {/* 1 — orientation */}
      <section className="rounded-xl border border-gray-200 bg-white p-5">
        <h2 className="text-sm font-bold text-gray-900">1. Orientation material</h2>
        <p className="mt-1 text-sm text-gray-600">
          Read this first. It covers who we are, how we work, and what we expect of one another.
        </p>

        <div className="mt-3 flex flex-wrap items-center gap-2">
          <a
            href={orientation.url}
            target="_blank"
            rel="noreferrer"
            className="px-4 py-2 text-xs font-semibold rounded-lg border border-teal-600 text-teal-700 hover:bg-teal-50 transition-colors"
          >
            Open orientation
          </a>
          <span className="text-xs text-gray-500">Password</span>
          <button
            type="button"
            onClick={copyPassword}
            title="Copy password"
            className="px-3 py-1.5 rounded-md border border-dashed border-amber-400 bg-amber-50 font-mono text-sm font-bold text-amber-800 hover:bg-amber-100 transition-colors"
          >
            {orientation.password}
          </button>
          {copied && <span className="text-[11px] font-semibold text-emerald-600">Copied</span>}
        </div>
      </section>

      {/* 2 — quiz */}
      <section
        className={`rounded-xl border p-5 ${
          done ? "border-emerald-300 bg-emerald-50/40" : "border-teal-300 bg-teal-50/40"
        }`}
      >
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 className="text-sm font-bold text-gray-900">2. Onboarding quiz</h2>
            <p className="mt-1 text-sm text-gray-600">
              {quiz.total_questions || 10} questions drawn from the orientation material, in your
              own language. Your score is saved to your staff record — nothing to send back.
            </p>
          </div>
          {done && (
            <span className="shrink-0 px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-700 text-[11px] font-bold">
              Passed
            </span>
          )}
        </div>

        <dl className="mt-3 grid grid-cols-2 sm:grid-cols-4 gap-2 text-center">
          <Stat label="Pass mark" value={`${quiz.pass_mark}%`} />
          <Stat label="Best score" value={quiz.best_percent == null ? "—" : `${quiz.best_percent}%`} />
          <Stat
            label="Attempts"
            value={
              quiz.max_attempts > 0 ? `${quiz.attempts} / ${quiz.max_attempts}` : `${quiz.attempts}`
            }
          />
          <Stat label="Due by" value={quiz.deadline || "—"} />
        </dl>

        <div className="mt-4">
          {quiz.can_attempt ? (
            <Link
              to="/onboarding/quiz"
              className="inline-block px-4 py-2 text-xs font-semibold rounded-lg bg-teal-600 text-white hover:bg-teal-700 transition-colors"
            >
              {quiz.attempts > 0 ? "Retake the quiz" : "Start the quiz"}
            </Link>
          ) : (
            <p className="text-xs font-semibold text-gray-600">
              {done
                ? "You have passed. Nothing further is needed."
                : "You have used all of your attempts — please contact HR."}
            </p>
          )}
        </div>

        {/* Attempt history, most recent first, with the section breakdown that
            tells you which part to re-read before a retake. */}
        {quiz.history?.length > 0 && (
          <div className="mt-4 border-t border-gray-200 pt-3">
            <h3 className="text-[11px] font-bold uppercase tracking-wide text-gray-500 mb-2">
              Your attempts
            </h3>
            <ul className="space-y-2">
              {[...quiz.history].reverse().map((a) => (
                <li key={a.id} className="rounded-lg bg-white border border-gray-200 p-2.5">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-gray-700">Attempt {a.attempt_no}</span>
                    <span
                      className={`font-bold ${a.passed ? "text-emerald-600" : "text-red-600"}`}
                    >
                      {a.percent}% ({a.score}/{a.total})
                    </span>
                  </div>
                  {a.section_scores?.length > 0 && (
                    <div className="mt-1.5 flex flex-wrap gap-1.5">
                      {a.section_scores.map((s) => (
                        <span
                          key={s.key}
                          className={`px-2 py-0.5 rounded text-[10px] font-semibold ${
                            s.percent === 100
                              ? "bg-emerald-50 text-emerald-700"
                              : "bg-amber-50 text-amber-700"
                          }`}
                        >
                          {s.title} {s.score}/{s.total}
                        </span>
                      ))}
                    </div>
                  )}
                </li>
              ))}
            </ul>
          </div>
        )}
      </section>
    </div>
  );
}

function Stat({ label, value }) {
  return (
    <div className="rounded-lg bg-white border border-gray-200 py-2">
      <dt className="text-[10px] uppercase tracking-wide text-gray-500">{label}</dt>
      <dd className="text-sm font-bold text-gray-900">{value}</dd>
    </div>
  );
}
