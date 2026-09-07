import { useEffect, useMemo, useState } from "react";
import Swal from "sweetalert2";
import { get, post, put, del } from "../../api/axios";

/**
 * Staff Handbook — the questions new colleagues actually ask.
 *
 * Deliberately not the Case Library. That screen searches observations already
 * logged about children and nobody maintains it; this one is a short list of
 * hand-written answers to questions with one correct answer — how to request
 * leave, who approves a purchase, where a contract goes.
 *
 * Written in whatever language the answer is best given in. Nothing here is
 * translated automatically, because a mistranslated instruction is worse than
 * an untranslated one.
 */

const inp =
  "w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm bg-white outline-none focus:ring-2 focus:ring-teal-500";

const EMPTY = { question: "", answer: "", category: "", is_published: true, sort_order: 0 };

export default function StaffFaq() {
  const [rows, setRows] = useState([]);
  const [meta, setMeta] = useState({ categories: [], can_edit: false, can_delete: false });
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("");
  const [loading, setLoading] = useState(true);
  const [openId, setOpenId] = useState(null);
  const [editing, setEditing] = useState(null); // null | EMPTY | a row
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState({});
  const [counted, setCounted] = useState({});

  const load = async () => {
    setLoading(true);
    try {
      const res = await get("/staff-faqs");
      setRows(res.data?.data || []);
      setMeta(res.data?.meta || { categories: [], can_edit: false, can_delete: false });
    } catch {
      setRows([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  /* Filtering happens here rather than on the server: the whole handbook is a
     few dozen answers, and searching as you type beats a round trip per key. */
  const visible = useMemo(() => {
    const term = search.trim().toLowerCase();
    return rows.filter((r) => {
      if (category && r.category !== category) return false;
      if (!term) return true;
      return (
        r.question.toLowerCase().includes(term) ||
        r.answer.toLowerCase().includes(term) ||
        (r.category || "").toLowerCase().includes(term)
      );
    });
  }, [rows, search, category]);

  const openAnswer = (row) => {
    const next = openId === row.id ? null : row.id;
    setOpenId(next);
    // Count each answer once per visit. The tally is only a hint about what
    // onboarding fails to explain — inflating it by re-opening would waste it.
    if (next && !counted[row.id]) {
      setCounted((c) => ({ ...c, [row.id]: true }));
      post(`/staff-faqs/${row.id}/opened`).catch(() => {});
    }
  };

  const save = async (e) => {
    e.preventDefault();
    setSaving(true);
    setErrors({});
    try {
      const payload = { ...editing, sort_order: Number(editing.sort_order) || 0 };
      if (editing.id) await put(`/staff-faqs/${editing.id}`, payload);
      else await post("/staff-faqs", payload);
      setEditing(null);
      await load();
    } catch (err) {
      const errs = err.response?.data?.errors;
      if (errs) {
        setErrors(Object.fromEntries(Object.entries(errs).map(([k, v]) => [k, Array.isArray(v) ? v[0] : v])));
      } else {
        Swal.fire("Error", err.response?.data?.message || "Could not save the answer.", "error");
      }
    } finally {
      setSaving(false);
    }
  };

  const remove = async (row) => {
    const ok = await Swal.fire({
      title: "Remove this answer?",
      text: row.question,
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#0d9488",
      cancelButtonColor: "#ef4444",
      confirmButtonText: "Remove",
    });
    if (!ok.isConfirmed) return;
    try {
      await del(`/staff-faqs/${row.id}`);
      await load();
    } catch (err) {
      Swal.fire("Error", err.response?.data?.message || "Could not remove it.", "error");
    }
  };

  return (
    <div className="px-4 py-5 space-y-4">
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-lg font-bold text-gray-800">Staff Handbook</h1>
          <p className="text-xs text-gray-400 mt-0.5">
            Answers to the questions colleagues ask most — how things are done at WEN.
          </p>
        </div>
        {meta.can_edit && (
          <button
            onClick={() => { setEditing({ ...EMPTY }); setErrors({}); }}
            className="px-4 py-2.5 bg-teal-600 text-white text-sm font-semibold rounded-xl hover:bg-teal-700"
          >
            Add an answer
          </button>
        )}
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 flex gap-2 flex-wrap">
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search — e.g. leave, salary, contract, purchase"
          className="flex-1 min-w-[220px] px-3 py-2.5 border border-gray-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-teal-500"
        />
        <select value={category} onChange={(e) => setCategory(e.target.value)} className="px-3 py-2.5 border border-gray-200 rounded-xl text-sm bg-white outline-none focus:ring-2 focus:ring-teal-500">
          <option value="">All topics</option>
          {meta.categories.map((c) => <option key={c} value={c}>{c}</option>)}
        </select>
      </div>

      {loading && <p className="text-xs text-gray-400 px-1">Loading…</p>}

      {!loading && rows.length === 0 && (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-8 text-center">
          <p className="text-sm text-gray-600">The handbook is empty.</p>
          <p className="text-xs text-gray-400 mt-1">
            {meta.can_edit
              ? "Start with the questions you answer most often in person."
              : "Nothing has been written down yet — ask HR."}
          </p>
        </div>
      )}

      {!loading && rows.length > 0 && visible.length === 0 && (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-8 text-center">
          <p className="text-sm text-gray-600">No answer matches that.</p>
          <p className="text-xs text-gray-400 mt-1">
            If the question is not here, it is worth asking — and worth adding afterwards.
          </p>
        </div>
      )}

      <div className="space-y-2">
        {visible.map((r) => (
          <div key={r.id} className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
            <button
              type="button"
              onClick={() => openAnswer(r)}
              className="w-full px-5 py-4 flex items-start justify-between gap-3 text-left hover:bg-gray-50/60"
            >
              <div className="min-w-0">
                <p className="text-sm font-semibold text-gray-800">{r.question}</p>
                <div className="flex flex-wrap items-center gap-2 mt-1">
                  {r.category && (
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-teal-50 text-teal-700">{r.category}</span>
                  )}
                  {/* A draft is only visible to whoever can finish it, so say
                      clearly that colleagues are not reading this yet. */}
                  {!r.is_published && (
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-100 text-amber-800">draft — not visible to staff</span>
                  )}
                  {r.view_count > 0 && (
                    <span className="text-[10px] text-gray-400">opened {r.view_count}×</span>
                  )}
                </div>
              </div>
              <span className="text-xs text-gray-400 shrink-0 mt-0.5">{openId === r.id ? "−" : "+"}</span>
            </button>

            {openId === r.id && (
              <div className="px-5 pb-5">
                <p className="text-sm text-gray-700 whitespace-pre-wrap">{r.answer}</p>
                <div className="flex items-center justify-between gap-2 mt-3 pt-3 border-t border-gray-50">
                  <p className="text-[10px] text-gray-400">
                    {r.author ? `Written by ${r.author}` : "Author not recorded"}
                    {r.updated_at && ` · updated ${r.updated_at}`}
                  </p>
                  {meta.can_edit && (
                    <div className="flex gap-2">
                      <button onClick={() => { setEditing({ ...r }); setErrors({}); }}
                        className="text-[11px] font-semibold text-teal-700 hover:text-teal-800">Edit</button>
                      {meta.can_delete && (
                        <button onClick={() => remove(r)}
                          className="text-[11px] font-semibold text-red-600 hover:text-red-700">Remove</button>
                      )}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        ))}
      </div>

      {editing && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg max-h-[92vh] overflow-y-auto">
            <div className="px-5 py-4 border-b border-gray-100">
              <h3 className="text-sm font-bold text-gray-800">{editing.id ? "Edit answer" : "New answer"}</h3>
              <p className="text-[11px] text-gray-400 mt-0.5">Write it in whichever language colleagues will read it in.</p>
            </div>

            <form onSubmit={save} className="p-5 space-y-3">
              <div>
                <label className="block text-[11px] font-semibold text-gray-500 uppercase tracking-wider mb-1.5">Question *</label>
                <input value={editing.question} onChange={(e) => setEditing((f) => ({ ...f, question: e.target.value }))}
                  placeholder="How do I request leave?" className={inp} required />
                {errors.question && <p className="text-[11px] text-red-600 mt-1">{errors.question}</p>}
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-gray-500 uppercase tracking-wider mb-1.5">Answer *</label>
                <textarea rows={6} value={editing.answer} onChange={(e) => setEditing((f) => ({ ...f, answer: e.target.value }))}
                  placeholder="Say exactly what to do, and who to ask if it does not work." className={inp} required />
                {errors.answer && <p className="text-[11px] text-red-600 mt-1">{errors.answer}</p>}
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-semibold text-gray-500 uppercase tracking-wider mb-1.5">Topic</label>
                  {/* Free text with the existing topics offered: the useful
                      groupings are the ones colleagues invent. */}
                  <input list="faq-topics" value={editing.category || ""}
                    onChange={(e) => setEditing((f) => ({ ...f, category: e.target.value }))}
                    placeholder="e.g. Leave, Payroll, IT" className={inp} />
                  <datalist id="faq-topics">
                    {meta.categories.map((c) => <option key={c} value={c} />)}
                  </datalist>
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-gray-500 uppercase tracking-wider mb-1.5">Order</label>
                  <input type="number" min={0} value={editing.sort_order ?? 0}
                    onChange={(e) => setEditing((f) => ({ ...f, sort_order: e.target.value }))} className={inp} />
                </div>
              </div>

              <label className="flex items-center gap-2 pt-1">
                <input type="checkbox" checked={editing.is_published !== false}
                  onChange={(e) => setEditing((f) => ({ ...f, is_published: e.target.checked }))}
                  className="h-4 w-4 text-teal-600 rounded border-gray-300" />
                <span className="text-xs text-gray-700">Visible to all staff</span>
              </label>
              <p className="text-[10px] text-gray-400 -mt-1">Leave this off while the answer is still a draft.</p>
            </form>

            <div className="px-5 py-4 bg-gray-50 flex justify-end gap-2 rounded-b-2xl">
              <button onClick={() => setEditing(null)}
                className="px-4 py-2 bg-white border border-gray-200 text-gray-600 rounded-xl hover:bg-gray-50 text-xs font-medium">Cancel</button>
              <button onClick={save} disabled={saving}
                className="px-4 py-2 bg-teal-600 text-white rounded-xl hover:bg-teal-700 text-xs font-semibold disabled:opacity-50">
                {saving ? "Saving…" : "Save"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
