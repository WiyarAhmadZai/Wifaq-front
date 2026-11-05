import { useCallback, useEffect, useRef, useState } from "react";
import Swal from "sweetalert2";
import { get, post, del } from "../../api/axios";
import RichTextField from "../../components/RichTextField";
import { GuideView } from "../../components/GuideButton";

/**
 * Guides (رهنمود) — a super-admin writes each module's instructions here, no
 * code needed: a formatted page and/or a PDF, and an optional checklist. The
 * module's 📘 Guide button shows them; the student-profile guide's checklist
 * is what teachers tick on each student's profile.
 */
const blank = { id: null, module_key: "student-profile", title: "", body: "", checklist: [], is_active: true, position: 0, has_file: false, file_name: null };

function GuideForm({ initial, modules, onClose, onSaved }) {
  const [f, setF] = useState(initial);
  const [file, setFile] = useState(null);
  const [removeFile, setRemoveFile] = useState(false);
  const [busy, setBusy] = useState(false);
  const fileRef = useRef(null);
  const set = (patch) => setF((x) => ({ ...x, ...patch }));
  const setItem = (i, patch) => set({ checklist: f.checklist.map((x, j) => (j === i ? { ...x, ...patch } : x)) });
  const moveItem = (i, d) => {
    const j = i + d;
    if (j < 0 || j >= f.checklist.length) return;
    const next = [...f.checklist];
    [next[i], next[j]] = [next[j], next[i]];
    set({ checklist: next });
  };

  const save = async () => {
    if (!f.title.trim()) { Swal.fire("", "Write a title.", "info"); return; }
    const items = f.checklist.filter((x) => x.text?.trim());
    setBusy(true);
    try {
      const body = new FormData();
      body.append("module_key", f.module_key);
      body.append("title", f.title.trim());
      body.append("body", f.body || "");
      body.append("checklist", JSON.stringify(items));
      body.append("is_active", f.is_active ? "1" : "0");
      body.append("position", String(f.position || 0));
      if (file) body.append("file", file);
      if (removeFile) body.append("remove_file", "1");
      await post(f.id ? `/guides/${f.id}/update` : "/guides", body);
      Swal.fire({ icon: "success", title: "Guide saved.", timer: 1300, showConfirmButton: false });
      onSaved();
    } catch (e) {
      Swal.fire("Error", e.response?.data?.message || Object.values(e.response?.data?.errors || {})[0]?.[0] || "Could not save.", "error");
    } finally { setBusy(false); }
  };

  const input = "w-full px-3 py-2 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-teal-300";
  return (
    <div className="fixed inset-0 z-[900] bg-black/50 flex items-center justify-center p-3 sm:p-6" onClick={onClose}>
      <div className="w-full max-w-4xl max-h-[94vh] bg-white rounded-2xl shadow-2xl flex flex-col overflow-hidden" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between px-5 py-3 border-b border-gray-100">
          <h3 className="text-base font-bold text-gray-800">{f.id ? "Edit guide" : "New guide"}</h3>
          <button type="button" onClick={onClose} className="w-8 h-8 rounded-full hover:bg-gray-100 text-gray-500">✕</button>
        </div>
        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          <div className="grid sm:grid-cols-3 gap-3">
            <label className="block sm:col-span-1">
              <span className="text-xs font-semibold text-gray-600">Module</span>
              <select value={f.module_key} onChange={(e) => set({ module_key: e.target.value })} className={`${input} mt-1 bg-white`}>
                {Object.entries(modules).map(([k, label]) => <option key={k} value={k}>{label}</option>)}
              </select>
            </label>
            <label className="block sm:col-span-2">
              <span className="text-xs font-semibold text-gray-600">Title</span>
              <input value={f.title} onChange={(e) => set({ title: e.target.value })} dir="auto" className={`${input} mt-1`} />
            </label>
          </div>

          <div>
            <span className="text-xs font-semibold text-gray-600">Guide text (shown like a normal page)</span>
            <div className="mt-1"><RichTextField value={f.body} onChange={(v) => set({ body: v })} rows={10} /></div>
          </div>

          <div className="rounded-xl border border-gray-100 p-3">
            <span className="text-xs font-semibold text-gray-600">PDF (optional)</span>
            <div className="mt-1 flex flex-wrap items-center gap-2 text-sm">
              {f.has_file && !removeFile && !file && (
                <>
                  <span className="text-gray-700" data-no-i18n>📄 {f.file_name || "guide.pdf"}</span>
                  <button type="button" onClick={() => setRemoveFile(true)} className="text-xs text-rose-600 hover:underline">Remove</button>
                </>
              )}
              <input ref={fileRef} type="file" accept="application/pdf" onChange={(e) => { setFile(e.target.files?.[0] || null); setRemoveFile(false); }} className="text-xs" />
            </div>
          </div>

          <div className="rounded-xl border border-teal-100 bg-teal-50/30 p-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-teal-800">Checklist (optional)</span>
              <button type="button" onClick={() => set({ checklist: [...f.checklist, { key: "", text: "", detail: "" }] })}
                className="text-xs font-semibold text-teal-700 hover:underline">+ Add item</button>
            </div>
            {f.module_key === "student-profile" && (
              <p className="text-[11px] text-teal-700 mt-1">Teachers tick these items on each student's profile.</p>
            )}
            <div className="mt-2 space-y-2">
              {f.checklist.map((x, i) => (
                <div key={i} className="rounded-lg bg-white border border-gray-100 p-2 flex gap-2">
                  <span className="text-xs font-bold text-gray-400 pt-2 w-5 text-center" data-no-i18n>{i + 1}</span>
                  <div className="flex-1 space-y-1.5">
                    <input value={x.text} onChange={(e) => setItem(i, { text: e.target.value })} dir="auto" placeholder="Item" className={input} />
                    <textarea value={x.detail || ""} onChange={(e) => setItem(i, { detail: e.target.value })} dir="auto" rows={2}
                      placeholder="Details / how to do it (optional)" className={`${input} text-xs`} />
                  </div>
                  <div className="flex flex-col gap-1">
                    <button type="button" onClick={() => moveItem(i, -1)} title="Up" className="w-7 h-7 rounded-lg hover:bg-gray-100 text-gray-500">↑</button>
                    <button type="button" onClick={() => moveItem(i, 1)} title="Down" className="w-7 h-7 rounded-lg hover:bg-gray-100 text-gray-500">↓</button>
                    <button type="button" onClick={() => set({ checklist: f.checklist.filter((_, j) => j !== i) })} title="Remove" className="w-7 h-7 rounded-lg hover:bg-rose-50 text-rose-500">✕</button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-4">
            <label className="inline-flex items-center gap-2 text-sm text-gray-700">
              <input type="checkbox" checked={f.is_active} onChange={(e) => set({ is_active: e.target.checked })} className="w-4 h-4" />
              <span>Active (shown to users)</span>
            </label>
            <label className="inline-flex items-center gap-2 text-sm text-gray-700">
              <span>Order</span>
              <input type="number" min={0} value={f.position} onChange={(e) => set({ position: e.target.value })} className="w-20 px-2 py-1 rounded-lg border border-gray-200 text-sm" />
            </label>
          </div>
        </div>
        <div className="flex justify-end gap-2 px-5 py-3 border-t border-gray-100">
          <button type="button" onClick={onClose} className="px-4 py-2 rounded-xl text-sm text-gray-600 hover:bg-gray-50">Cancel</button>
          <button type="button" onClick={save} disabled={busy} className="px-5 py-2 rounded-xl bg-teal-600 text-white text-sm font-bold disabled:opacity-50">
            {busy ? "Saving…" : "Save guide"}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function Guides() {
  const [data, setData] = useState({ guides: [], modules: {}, canManage: false, loading: true });
  const [editing, setEditing] = useState(null);
  const [viewing, setViewing] = useState(null);

  const load = useCallback(() => {
    get("/guides", { cache: false })
      .then((r) => setData({ guides: r.data?.data || [], modules: r.data?.modules || {}, canManage: Boolean(r.data?.can_manage), loading: false }))
      .catch(() => setData((d) => ({ ...d, loading: false })));
  }, []);
  useEffect(() => { load(); }, [load]);

  const remove = async (g) => {
    const ok = await Swal.fire({ icon: "warning", title: "Delete this guide?", text: "It is hidden from everyone.", showCancelButton: true, confirmButtonText: "Delete", confirmButtonColor: "#e11d48" });
    if (!ok.isConfirmed) return;
    try { await del(`/guides/${g.id}`); load(); } catch (e) { Swal.fire("Error", e.response?.data?.message || "Could not delete.", "error"); }
  };

  return (
    <div className="p-4 sm:p-6 max-w-5xl mx-auto space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-gray-800">📘 <span>Guides</span> · رهنمود</h1>
          <p className="text-sm text-gray-500">Instructions for each module — shown by the module's Guide button.</p>
        </div>
        {data.canManage && (
          <button type="button" onClick={() => setEditing({ ...blank })} className="px-4 py-2 rounded-xl bg-teal-600 text-white text-sm font-bold hover:bg-teal-700">+ New guide</button>
        )}
      </div>

      {data.loading ? <div className="flex justify-center py-16"><div className="animate-spin rounded-full h-8 w-8 border-4 border-teal-100 border-t-teal-600" /></div>
        : data.guides.length === 0 ? <div className="bg-white rounded-2xl border border-gray-100 p-10 text-center text-sm text-gray-500">No guides yet.</div>
        : (
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm divide-y divide-gray-100">
            {data.guides.map((g) => (
              <div key={g.id} className="flex flex-wrap items-center gap-3 px-4 py-3">
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-bold text-gray-800" dir="auto" data-no-i18n>{g.title}</div>
                  <div className="text-[11px] text-gray-500 flex flex-wrap gap-2 mt-0.5">
                    <span className="px-2 py-0.5 rounded-full bg-teal-50 text-teal-700" data-no-i18n>{g.module}</span>
                    {g.has_file && <span>📄 PDF</span>}
                    {g.checklist?.length > 0 && <span>✅ <span data-no-i18n>{g.checklist.length}</span> <span>checklist items</span></span>}
                    {!g.is_active && <span className="px-2 py-0.5 rounded-full bg-gray-100 text-gray-500">Hidden</span>}
                  </div>
                </div>
                <button type="button" onClick={() => setViewing(g)} className="px-3 py-1.5 rounded-lg border border-gray-200 text-xs font-semibold text-gray-600 hover:bg-gray-50">View</button>
                {data.canManage && <button type="button" onClick={() => setEditing({ ...blank, ...g, body: g.body || "", checklist: g.checklist || [] })} className="px-3 py-1.5 rounded-lg border border-gray-200 text-xs font-semibold text-gray-600 hover:bg-gray-50">Edit</button>}
                {data.canManage && <button type="button" onClick={() => remove(g)} className="px-3 py-1.5 rounded-lg border border-rose-200 text-xs font-semibold text-rose-600 hover:bg-rose-50">Delete</button>}
              </div>
            ))}
          </div>
        )}

      {editing && <GuideForm key={editing.id || "new"} initial={editing} modules={data.modules} onClose={() => setEditing(null)} onSaved={() => { setEditing(null); load(); }} />}
      {viewing && (
        <div className="fixed inset-0 z-[900] bg-black/50 flex items-center justify-center p-3 sm:p-6" onClick={() => setViewing(null)}>
          <div className="w-full max-w-4xl max-h-[92vh] bg-white rounded-2xl shadow-2xl flex flex-col overflow-hidden" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between px-5 py-3 bg-teal-700 text-white">
              <div className="font-bold" dir="auto" data-no-i18n>📘 {viewing.title}</div>
              <button type="button" onClick={() => setViewing(null)} className="w-8 h-8 rounded-full hover:bg-white/15">✕</button>
            </div>
            <div className="flex-1 overflow-y-auto p-5"><GuideView guide={viewing} /></div>
          </div>
        </div>
      )}
    </div>
  );
}
