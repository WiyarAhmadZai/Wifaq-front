/*
 * Renderers for the question types beyond choice / yes-no / text / file:
 *   section — a heading that groups the questions below it (not answered)
 *   multi   — pick one or more options (stored as the picked texts, "، "-joined)
 *   number  — a numeric answer
 * Shared by the public link and the signed-in parent page.
 */

export function SectionHead({ text }) {
  return (
    <div className="pt-3 pb-1 border-b-2 border-teal-600/30">
      <h3 className="text-base font-black text-teal-800" dir="auto">{text}</h3>
    </div>
  );
}

const SEP = "، ";

export function ExtraAnswer({ qq, answer, setAnswer, inputCls, accent = "#0d9488" }) {
  if (qq.type === "number") {
    return (
      <input type="number" value={answer?.answer_text || ""} dir="ltr"
        onChange={(e) => setAnswer(qq.id, { answer_text: e.target.value })}
        className={`${inputCls} max-w-[10rem]`} />
    );
  }
  if (qq.type !== "multi") return null;

  const picked = answer?.answer_text ? answer.answer_text.split(SEP) : [];
  const toggle = (t) => {
    const next = picked.includes(t) ? picked.filter((x) => x !== t) : [...picked, t];
    setAnswer(qq.id, next.length ? { answer_text: next.join(SEP) } : null);
  };
  return (
    <div className="flex flex-wrap gap-2">
      {(qq.options || []).map((o) => {
        const active = picked.includes(o.text);
        return (
          <button key={o.id} type="button" onClick={() => toggle(o.text)}
            className={`px-3 py-1.5 rounded-lg text-sm border transition-colors ${active ? "text-white border-transparent" : "bg-white text-gray-700 border-gray-200 hover:border-teal-300"}`}
            style={active ? { background: accent } : undefined}>
            {active ? "✓ " : ""}{o.text}
          </button>
        );
      })}
    </div>
  );
}
