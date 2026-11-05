import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { get } from "../api/axios";
import { RichTextView } from "./RichTextField";

/**
 * 📘 Guide — the instructions (رهنمود) for one module, written by a super-admin
 * on the Guides page. Drop <GuideButton module="student-profile" /> on a
 * module's page; it renders nothing when that module has no guide yet
 * (except for guide managers, who get a shortcut to add one).
 */

/** The attached PDF, read with the user's own session and shown in the browser's viewer. */
function GuidePdf({ guideId }) {
  const [url, setUrl] = useState(null);
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    let alive = true;
    let made = null;
    get(`/guides/${guideId}/file`, { responseType: "blob", cache: false })
      .then((r) => {
        made = URL.createObjectURL(new Blob([r.data], { type: "application/pdf" }));
        if (alive) setUrl(made); else URL.revokeObjectURL(made);
      })
      .catch(() => alive && setFailed(true));
    return () => { alive = false; if (made) URL.revokeObjectURL(made); };
  }, [guideId]);
  if (failed) return <p className="text-sm text-red-600 py-6 text-center">Could not open the PDF.</p>;
  if (!url) return <div className="flex justify-center py-10"><div className="animate-spin rounded-full h-8 w-8 border-4 border-teal-100 border-t-teal-600" /></div>;
  return (
    <div>
      <iframe src={url} title="Guide PDF" className="w-full h-[70vh] rounded-xl border border-gray-200 bg-white" />
      <a href={url} target="_blank" rel="noopener noreferrer" className="inline-block mt-2 text-xs font-semibold text-teal-700 hover:underline">Open the PDF in a new tab ↗</a>
    </div>
  );
}

/** One guide, read like a normal page: its text, its PDF and its checklist. */
export function GuideView({ guide }) {
  return (
    <article className="space-y-4">
      {guide.body && (
        <div className="prose prose-sm max-w-none text-gray-800 leading-relaxed">
          <RichTextView html={guide.body} />
        </div>
      )}
      {guide.has_file && <GuidePdf guideId={guide.id} />}
      {guide.checklist?.length > 0 && (
        <div className="rounded-2xl border border-teal-100 bg-teal-50/40 p-4">
          <h4 className="text-sm font-bold text-teal-800 mb-2">✅ <span>Checklist</span></h4>
          <ol className="space-y-2 list-decimal ps-5">
            {guide.checklist.map((i) => (
              <li key={i.key} className="text-sm text-gray-800">
                <span className="font-semibold" dir="auto" data-no-i18n>{i.text}</span>
                {i.detail && <div className="text-xs text-gray-600 whitespace-pre-line mt-0.5" dir="auto" data-no-i18n>{i.detail}</div>}
              </li>
            ))}
          </ol>
        </div>
      )}
      {!guide.body && !guide.has_file && !guide.checklist?.length && (
        <p className="text-sm text-gray-400">This guide is empty.</p>
      )}
    </article>
  );
}

export default function GuideButton({ module, className = "" }) {
  const [state, setState] = useState({ guides: [], canManage: false, loaded: false });
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);

  useEffect(() => {
    let alive = true;
    get("/guides", { cache: false, params: { module, active: 1 } })
      .then((r) => alive && setState({ guides: r.data?.data || [], canManage: Boolean(r.data?.can_manage), loaded: true }))
      .catch(() => alive && setState((s) => ({ ...s, loaded: true })));
    return () => { alive = false; };
  }, [module]);

  if (!state.loaded) return null;
  if (!state.guides.length) {
    return state.canManage ? (
      <Link to="/guides" className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-dashed border-teal-300 text-xs font-semibold text-teal-700 hover:bg-teal-50 ${className}`}>
        📘 <span>Add a guide</span>
      </Link>
    ) : null;
  }

  const g = state.guides[Math.min(active, state.guides.length - 1)];
  return (
    <>
      <button type="button" onClick={() => setOpen(true)}
        className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-teal-600 text-white text-xs font-bold shadow-sm hover:bg-teal-700 ${className}`}>
        📘 <span>Guide</span>
      </button>
      {open && (
        <div className="fixed inset-0 z-[900] bg-black/50 flex items-center justify-center p-3 sm:p-6" onClick={() => setOpen(false)}>
          <div className="w-full max-w-4xl max-h-[92vh] bg-white rounded-2xl shadow-2xl flex flex-col overflow-hidden" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center gap-3 px-5 py-3 bg-gradient-to-r from-teal-700 to-teal-600 text-white">
              <span className="text-xl">📘</span>
              <div className="min-w-0 flex-1">
                <div className="text-[11px] opacity-80"><span>Guide</span> · <span data-no-i18n>{g.module}</span></div>
                <div className="text-base font-bold truncate" dir="auto" data-no-i18n>{g.title}</div>
              </div>
              {state.canManage && <Link to="/guides" className="text-[11px] font-semibold underline opacity-90 hover:opacity-100">Edit guides</Link>}
              <button type="button" onClick={() => setOpen(false)} className="w-8 h-8 rounded-full hover:bg-white/15 grid place-items-center">✕</button>
            </div>
            {state.guides.length > 1 && (
              <div className="flex gap-1 px-4 pt-3 overflow-x-auto">
                {state.guides.map((x, i) => (
                  <button key={x.id} type="button" onClick={() => setActive(i)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap ${i === active ? "bg-teal-600 text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200"}`}>
                    <span data-no-i18n>{x.title}</span>
                  </button>
                ))}
              </div>
            )}
            <div className="flex-1 overflow-y-auto p-5"><GuideView key={g.id} guide={g} /></div>
          </div>
        </div>
      )}
    </>
  );
}
