import { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { getMyOnboarding, saveOrientation } from "../../api/onboarding";
import { RichTextView } from "../../components/RichTextField";
import { useI18n } from "../../i18n/I18nContext";

/**
 * The new hire's own onboarding page.
 *
 * Same two things the welcome email carried — the orientation material and the
 * quiz — shown inside the system, so neither is ever one lost email away. The
 * orientation guide is read here chapter by chapter; the chapters are Staff
 * Handbook articles in the "Orientation" category, so HR keeps them current.
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

  // The reader reports each save back here, so the progress strip stays true.
  const setProgress = (progress) =>
    setData((d) => (d ? { ...d, orientation: { ...d.orientation, progress } } : d));

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
  const guideDone = !!orientation.progress?.completed_at;
  const done = quiz.passed;
  const hasGuide = (orientation.articles || []).length > 0;

  return (
    <div className="max-w-5xl mx-auto p-4 sm:p-6 space-y-5">
      <header>
        <h1 className="text-lg font-bold text-gray-900">Your onboarding</h1>
        <p className="text-sm text-gray-500 mt-0.5">Two steps before your first day. Do them in order.</p>
      </header>

      {/* Progress strip */}
      <div className="flex items-center gap-2 text-[11px] font-semibold">
        <span
          className={`px-2.5 py-1 rounded-full border ${
            guideDone
              ? "bg-emerald-50 text-emerald-700 border-emerald-200"
              : "bg-teal-50 text-teal-700 border-teal-200"
          }`}
        >
          {guideDone ? "1 · Orientation · done" : "1 · Orientation"}
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

      {/* 1 — orientation guide, read inside the system */}
      {hasGuide && (
        <OrientationGuide
          articles={orientation.articles}
          items={orientation.self_check_items || []}
          progress={orientation.progress || {}}
          onProgress={setProgress}
        />
      )}

      {/* The same material on the school website, for whoever was sent the
          link by email. Secondary now that the guide lives here. */}
      {!hasGuide && orientation.url && (
        <section className="rounded-xl border border-gray-200 bg-white p-4">
          <h2 className="text-sm font-bold text-gray-900">
            {hasGuide ? "Also on the school website" : "1. Orientation material"}
          </h2>
          <p className="mt-1 text-xs text-gray-500">
            The orientation page that was emailed to you. Signing the documents there is still being moved into the system.
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
            {orientation.password && <span className="text-xs text-gray-500">Password</span>}
            {orientation.password && <button
              type="button"
              onClick={copyPassword}
              title="Copy password"
              className="px-3 py-1.5 rounded-md border border-dashed border-amber-400 bg-amber-50 font-mono text-sm font-bold text-amber-800 hover:bg-amber-100 transition-colors"
            >
              {orientation.password}
            </button>}
            {copied && <span className="text-[11px] font-semibold text-emerald-600">Copied</span>}
          </div>
        </section>
      )}

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

/**
 * "How we work at Wifaq", one chapter at a time.
 *
 * Every chapter is marked read as the reader moves past it; after the last
 * chapter comes the self-check (section 11 of the guide) and then the
 * confirmation that the whole guide was read and understood. Each step is
 * saved as it happens, so closing the tab loses nothing.
 */
function OrientationGuide({ articles, items, progress, onProgress }) {
  const { t } = useI18n();
  const topRef = useRef(null);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState("");

  const readIds = useMemo(() => new Set(progress.read_ids || []), [progress.read_ids]);
  const answers = progress.self_check || {};
  const completed = !!progress.completed_at;
  const answeredCount = items.filter((i) => answers[i.key]).length;
  const allRead = articles.every((a) => readIds.has(a.id));
  const allAnswered = answeredCount === items.length;

  // Steps: every chapter, then the self-check, then the confirmation.
  const checkStep = articles.length;
  const finishStep = articles.length + 1;

  // Open where the reader left off.
  const [step, setStep] = useState(() => {
    if (completed) return finishStep;
    const firstUnread = articles.findIndex((a) => !readIds.has(a.id));
    if (firstUnread >= 0) return firstUnread;
    return allAnswered ? finishStep : checkStep;
  });

  const go = (next) => {
    setErr("");
    setStep(next);
    topRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const save = async (payload) => {
    setSaving(true);
    setErr("");
    try {
      const res = await saveOrientation(payload);
      onProgress(res.data?.data || progress);
      return true;
    } catch (e) {
      setErr(e?.response?.data?.message || "Could not save. Check the connection and try again.");
      return false;
    } finally {
      setSaving(false);
    }
  };

  const markReadAndNext = async (article) => {
    if (!readIds.has(article.id)) {
      const ok = await save({ read_article_id: article.id });
      if (!ok) return;
    }
    go(step + 1);
  };

  const answer = (key, value) => {
    // Clicking the chosen answer again clears it.
    save({ self_check: { [key]: answers[key] === value ? null : value } });
  };

  const pct = articles.length ? Math.round((readIds.size / articles.length) * 100) : 0;
  const notYet = items.filter((i) => answers[i.key] === "not_yet").length;

  return (
    <section ref={topRef} className="scroll-mt-4 rounded-2xl border border-gray-200 bg-white overflow-hidden">
      {/* Title band */}
      <div className="bg-gradient-to-br from-teal-700 to-teal-600 px-5 py-5 text-white">
        <p className="text-[11px] font-semibold uppercase tracking-wider text-teal-100">1. Orientation guide</p>
        <h2 className="mt-1 text-lg font-bold">How we work at Wifaq</h2>
        <p className="mt-1 text-sm text-teal-50/90">
          What working at Wifaq is really like, and what we expect of everyone who works here. Read every chapter, check yourself, then confirm.
        </p>
        <div className="mt-4">
          <div className="flex items-center justify-between text-[11px] font-semibold text-teal-50">
            <span>{t("{} of {} chapters read", readIds.size, articles.length)}</span>
            <span>{pct}%</span>
          </div>
          <div className="mt-1.5 h-2 rounded-full bg-teal-900/30 overflow-hidden">
            <div className="h-full rounded-full bg-amber-300 transition-all duration-500" style={{ width: `${pct}%` }} />
          </div>
        </div>
      </div>

      <div className="grid lg:grid-cols-[260px_1fr]">
        {/* Chapter list */}
        <nav className="border-b lg:border-b-0 lg:border-r border-gray-200 bg-gray-50/70 p-3 max-h-56 lg:max-h-none overflow-y-auto">
          <p className="px-2 pb-2 text-[10px] font-bold uppercase tracking-wider text-gray-500">Chapters</p>
          <ol className="space-y-0.5">
            {articles.map((a, i) => (
              <li key={a.id}>
                <StepButton
                  active={step === i}
                  done={readIds.has(a.id)}
                  onClick={() => go(i)}
                  label={<span data-no-i18n dir="auto" className="block orientation-text">{a.title}</span>}
                />
              </li>
            ))}
            <li className="pt-1.5 mt-1.5 border-t border-gray-200">
              <StepButton
                active={step === checkStep}
                done={allAnswered}
                onClick={() => go(checkStep)}
                label="Are you ready? Check yourself"
              />
            </li>
            <li>
              <StepButton
                active={step === finishStep}
                done={completed}
                onClick={() => go(finishStep)}
                label="Confirm"
              />
            </li>
          </ol>
        </nav>

        {/* Reader */}
        <div className="p-5 sm:p-7 min-w-0">
          {step < articles.length && (
            <ChapterView
              article={articles[step]}
              index={step}
              total={articles.length}
              isRead={readIds.has(articles[step].id)}
              saving={saving}
              onPrev={step > 0 ? () => go(step - 1) : null}
              onNext={() => markReadAndNext(articles[step])}
              isLast={step === articles.length - 1}
            />
          )}

          {step === checkStep && (
            <div>
              <p className="text-[11px] font-bold uppercase tracking-wider text-teal-700">Self-check</p>
              <h3 className="mt-1 text-base font-bold text-gray-900">Are you ready? Check yourself</h3>
              <p className="mt-1 text-sm text-gray-600">
                Answer honestly. A "Not yet" is not a failure — it is what your first conversation with your manager is about.
              </p>

              <ul className="mt-4 space-y-2">
                {items.map((it) => {
                  const v = answers[it.key];
                  return (
                    <li
                      key={it.key}
                      className={`rounded-xl border p-3 flex flex-col sm:flex-row sm:items-center gap-3 transition-colors ${
                        v === "yes"
                          ? "border-emerald-200 bg-emerald-50/50"
                          : v === "not_yet"
                          ? "border-amber-200 bg-amber-50/50"
                          : "border-gray-200 bg-white"
                      }`}
                    >
                      <p data-no-i18n dir="rtl" className="flex-1 text-[15px] leading-8 text-gray-800 orientation-text">
                        {it.text}
                      </p>
                      <div className="flex gap-1.5 shrink-0">
                        <ChoiceButton active={v === "yes"} tone="yes" disabled={saving} onClick={() => answer(it.key, "yes")}>
                          Yes
                        </ChoiceButton>
                        <ChoiceButton active={v === "not_yet"} tone="not_yet" disabled={saving} onClick={() => answer(it.key, "not_yet")}>
                          Not yet
                        </ChoiceButton>
                      </div>
                    </li>
                  );
                })}
              </ul>

              {allAnswered && (
                <p className="mt-4 rounded-lg bg-teal-50 border border-teal-200 px-4 py-3 text-sm text-teal-800">
                  {notYet === 0
                    ? "Mostly yes? Come on in."
                    : "A few \"not yet\"? Tell us. That is what the first months are for."}
                </p>
              )}

              <NavRow>
                <button type="button" onClick={() => go(checkStep - 1)} className={secondaryBtn}>
                  Previous
                </button>
                <button type="button" onClick={() => go(finishStep)} disabled={!allAnswered} className={primaryBtn}>
                  Continue
                </button>
              </NavRow>
              {!allAnswered && (
                <p className="mt-2 text-xs text-gray-500">{t("{} of {} answered", answeredCount, items.length)}</p>
              )}
            </div>
          )}

          {step === finishStep && (
            <FinishView
              completed={completed}
              completedAt={progress.completed_at}
              allRead={allRead}
              allAnswered={allAnswered}
              readCount={readIds.size}
              total={articles.length}
              answeredCount={answeredCount}
              itemCount={items.length}
              saving={saving}
              onBack={() => go(checkStep)}
              onConfirm={() => save({ complete: true })}
              onFirstUnread={() => {
                const i = articles.findIndex((a) => !readIds.has(a.id));
                go(i >= 0 ? i : checkStep);
              }}
            />
          )}

          {err && <p className="mt-3 text-sm text-red-600">{err}</p>}
        </div>
      </div>
    </section>
  );
}

function ChapterView({ article, index, total, isRead, saving, onPrev, onNext, isLast }) {
  const { t } = useI18n();
  return (
    <article>
      <div className="flex items-center justify-between gap-2">
        <span className="text-[11px] font-bold uppercase tracking-wider text-teal-700">
          {t("Chapter {} of {}", index + 1, total)}
        </span>
        {isRead && (
          <span className="px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 text-[10px] font-bold border border-emerald-200">
            Read
          </span>
        )}
      </div>
      <h3 data-no-i18n dir="rtl" className="mt-2 text-xl font-bold text-gray-900 orientation-text leading-relaxed">
        {article.title}
      </h3>
      <div data-no-i18n className="mt-4">
        <RichTextView
          html={article.body}
          dir="rtl"
          className="orientation-text text-[15px] leading-8 text-gray-800 [&_blockquote]:bg-amber-50/60 [&_blockquote]:rounded-e-lg [&_blockquote]:py-2 [&_blockquote]:pe-3 [&_blockquote]:my-3 [&_h3]:mt-4 [&_h3]:text-teal-800 [&_p]:mb-3 [&_li]:my-1.5"
        />
      </div>
      <NavRow>
        {onPrev ? (
          <button type="button" onClick={onPrev} className={secondaryBtn}>
            Previous
          </button>
        ) : (
          <span />
        )}
        <button type="button" onClick={onNext} disabled={saving} className={primaryBtn}>
          {isRead ? "Next" : isLast ? "I have read this — go to the self-check" : "I have read this — next chapter"}
        </button>
      </NavRow>
    </article>
  );
}

function FinishView({
  completed, completedAt, allRead, allAnswered, readCount, total, answeredCount, itemCount,
  saving, onBack, onConfirm, onFirstUnread,
}) {
  const { t } = useI18n();

  if (completed) {
    return (
      <div className="text-center py-6">
        <div className="mx-auto w-14 h-14 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center">
          <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <h3 className="mt-3 text-base font-bold text-gray-900">You have read the orientation guide</h3>
        <p className="mt-1 text-sm text-gray-600">
          {t("Confirmed on {}.", new Date(completedAt).toLocaleDateString())}
        </p>
        {!allRead && (
          <p className="mt-3 inline-block rounded-lg bg-amber-50 border border-amber-200 px-3 py-2 text-xs font-semibold text-amber-800">
            A chapter was added after you finished. Please read it too.
          </p>
        )}
        <p className="mt-3 text-sm text-gray-600">Next: the onboarding quiz below.</p>
      </div>
    );
  }

  return (
    <div>
      <p className="text-[11px] font-bold uppercase tracking-wider text-teal-700">Confirm</p>
      <h3 className="mt-1 text-base font-bold text-gray-900">I have read and understood the guide</h3>
      <p className="mt-1 text-sm text-gray-600">
        By confirming, you tell HR that you have read every chapter of this guide and understood how we work at Wifaq.
      </p>

      <ul className="mt-4 space-y-2 text-sm">
        <Requirement ok={allRead}>{t("{} of {} chapters read", readCount, total)}</Requirement>
        <Requirement ok={allAnswered}>{t("{} of {} self-check lines answered", answeredCount, itemCount)}</Requirement>
      </ul>

      <NavRow>
        <button type="button" onClick={onBack} className={secondaryBtn}>
          Previous
        </button>
        {allRead && allAnswered ? (
          <button type="button" onClick={onConfirm} disabled={saving} className={primaryBtn}>
            I have read and understood
          </button>
        ) : (
          <button type="button" onClick={onFirstUnread} className={primaryBtn}>
            Continue reading
          </button>
        )}
      </NavRow>
    </div>
  );
}

function Requirement({ ok, children }) {
  return (
    <li className="flex items-center gap-2">
      <span
        className={`w-5 h-5 rounded-full flex items-center justify-center text-[11px] font-bold ${
          ok ? "bg-emerald-100 text-emerald-700" : "bg-gray-100 text-gray-400"
        }`}
      >
        {ok ? "✓" : "•"}
      </span>
      <span className={ok ? "text-gray-800" : "text-gray-500"}>{children}</span>
    </li>
  );
}

function StepButton({ active, done, onClick, label }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`w-full flex items-start gap-2 rounded-lg px-2 py-1.5 text-left text-[13px] leading-snug transition-colors ${
        active ? "bg-white shadow-sm ring-1 ring-teal-200 text-teal-800 font-semibold" : "text-gray-700 hover:bg-white"
      }`}
    >
      <span
        className={`mt-0.5 shrink-0 w-4 h-4 rounded-full flex items-center justify-center text-[9px] font-bold ${
          done ? "bg-emerald-500 text-white" : active ? "border-2 border-teal-500" : "border border-gray-300"
        }`}
      >
        {done ? "✓" : ""}
      </span>
      <span className="min-w-0 flex-1">{label}</span>
    </button>
  );
}

function ChoiceButton({ active, tone, disabled, onClick, children }) {
  const on = tone === "yes" ? "bg-emerald-600 text-white border-emerald-600" : "bg-amber-500 text-white border-amber-500";
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-pressed={active}
      className={`px-3 py-1.5 rounded-lg border text-xs font-semibold transition-colors disabled:opacity-60 ${
        active ? on : "bg-white text-gray-600 border-gray-300 hover:bg-gray-50"
      }`}
    >
      {children}
    </button>
  );
}

function NavRow({ children }) {
  return <div className="mt-6 pt-4 border-t border-gray-100 flex items-center justify-between gap-3">{children}</div>;
}

const primaryBtn =
  "px-4 py-2 text-xs font-semibold rounded-lg bg-teal-600 text-white hover:bg-teal-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed";
const secondaryBtn =
  "px-4 py-2 text-xs font-semibold rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50 transition-colors";

function Stat({ label, value }) {
  return (
    <div className="rounded-lg bg-white border border-gray-200 py-2">
      <dt className="text-[10px] uppercase tracking-wide text-gray-500">{label}</dt>
      <dd className="text-sm font-bold text-gray-900">{value}</dd>
    </div>
  );
}
