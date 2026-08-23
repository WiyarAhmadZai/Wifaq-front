import { useState, useEffect, useCallback } from "react";
import { useNavigate, useParams } from "react-router-dom";
import Swal from "sweetalert2";
import {
  getFormData, getBook, createBook, updateBook, deleteBookPdf,
} from "../../api/essentialBooks";
import {
  TEAL, GOLD_LT, GOLD_SOFT, GOLD_DEEP, BORDER, MUTED, describeError,
} from "../education/weeklyUi";

const Spinner = () => (
  <div className="flex justify-center py-16">
    <div className="w-7 h-7 border-2 rounded-full animate-spin" style={{ borderColor: "#CFE6E6", borderTopColor: TEAL }} />
  </div>
);

const EMPTY = {
  title: "", title_translation: "", author: "", author_living: "",
  original_language: "", era: "", genres: [],
  description: "", recommendation: "", themes: [],
  reading_level: "", editions: "",
  links: ["", ""], access_notes: "",
  recommender_name: "", recommender_role: "", recommender_contact: "", recommender_location: "",
  involvement: [],
};

const field = "w-full px-3 py-2 border rounded-xl text-sm bg-white focus:ring-2 focus:ring-[#9CCBCB] focus:outline-none";
const fieldStyle = { borderColor: BORDER };

const prettySize = (bytes) => {
  if (!bytes) return "";
  const mb = bytes / 1048576;
  return mb >= 1 ? `${mb.toFixed(1)} MB` : `${Math.max(1, Math.round(bytes / 1024))} KB`;
};

/**
 * Submit / edit one recommendation for The 100 Essential Books.
 *
 * A custom form rather than the shared CrudFormPage: that component covers
 * text / select / date / checkbox, and this needs multi-select tag groups, a
 * level picker, a repeating link list and a file upload. The section order and
 * wording follow the original submission sheet so anyone who filled the paper
 * version recognises it.
 */
export default function EssentialBookForm() {
  const navigate = useNavigate();
  const { id } = useParams();
  const editing = Boolean(id);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [ref, setRef] = useState(null);
  const [form, setForm] = useState(EMPTY);
  const [pdf, setPdf] = useState(null);          // a freshly picked File
  const [savedPdf, setSavedPdf] = useState(null); // what is already stored
  const [errors, setErrors] = useState({});

  const load = useCallback(async () => {
    try {
      const [fd, book] = await Promise.all([
        getFormData(),
        editing ? getBook(id) : Promise.resolve(null),
      ]);
      setRef(fd.data);

      if (book) {
        const b = book.data.data;
        setForm({
          ...EMPTY,
          ...Object.fromEntries(Object.keys(EMPTY).map((k) => [k, b[k] ?? EMPTY[k]])),
          genres: b.genres || [], themes: b.themes || [], involvement: b.involvement || [],
          // Always leave one blank row so "add another" is not the only way in.
          links: (b.links || []).length ? [...b.links, ""] : ["", ""],
        });
        setSavedPdf(b.pdf_url ? { url: b.pdf_url, name: b.pdf_name, size: b.pdf_size } : null);
      }
    } catch (err) {
      Swal.fire("Error", describeError(err, "Failed to load the form."), "error");
    } finally { setLoading(false); }
  }, [editing, id]);

  useEffect(() => { load(); }, [load]);

  const set = (k, v) => {
    setForm((f) => ({ ...f, [k]: v }));
    if (errors[k]) setErrors((e) => ({ ...e, [k]: undefined }));
  };

  const toggle = (k, value) =>
    setForm((f) => ({
      ...f,
      [k]: f[k].includes(value) ? f[k].filter((x) => x !== value) : [...f[k], value],
    }));

  const setLink = (i, v) => setForm((f) => ({ ...f, links: f.links.map((l, j) => (j === i ? v : l)) }));
  const addLink = () => setForm((f) => ({ ...f, links: [...f.links, ""] }));
  const removeLink = (i) =>
    setForm((f) => ({ ...f, links: f.links.length > 1 ? f.links.filter((_, j) => j !== i) : [""] }));

  /**
   * PDF only, checked here for a fast answer and again on the server, which is
   * where it actually counts — `accept` on the input is a hint to the file
   * picker, not a rule anyone has to obey.
   */
  const pickPdf = (file) => {
    if (!file) { setPdf(null); return; }
    const isPdf = file.type === "application/pdf" || /\.pdf$/i.test(file.name);
    if (!isPdf) {
      Swal.fire("PDF only", "Only PDF files can be uploaded for a book.", "info");
      return;
    }
    const maxMb = ref?.max_pdf_mb || 20;
    if (file.size > maxMb * 1048576) {
      Swal.fire("File too large", `The PDF must be ${maxMb} MB or smaller. This one is ${prettySize(file.size)}.`, "info");
      return;
    }
    setPdf(file);
  };

  const dropSavedPdf = async () => {
    const r = await Swal.fire({
      title: "Remove the uploaded PDF?",
      text: savedPdf?.name || "",
      icon: "warning", showCancelButton: true, confirmButtonColor: "#B83230",
      confirmButtonText: "Remove file",
    });
    if (!r.isConfirmed) return;
    try {
      await deleteBookPdf(id);
      setSavedPdf(null);
      Swal.fire({ icon: "success", title: "File removed", timer: 1200, showConfirmButton: false });
    } catch (err) {
      Swal.fire("Error", describeError(err, "Failed to remove the file."), "error");
    }
  };

  const save = async () => {
    const missing = {};
    if (!form.title.trim()) missing.title = "The book's title is needed.";
    if (!form.author.trim()) missing.author = "Who wrote it?";
    if (!form.recommendation.trim()) missing.recommendation = "This is the heart of the submission.";
    if (!form.recommender_name.trim()) missing.recommender_name = "So we can credit you.";
    if (Object.keys(missing).length) {
      setErrors(missing);
      Swal.fire("A few fields are needed", "Title, author, why you recommend it, and your name.", "info");
      return;
    }

    setSaving(true);
    try {
      const body = {
        ...form,
        links: form.links.map((l) => l.trim()).filter(Boolean),
        ...(pdf ? { pdf } : {}),
      };
      const res = editing ? await updateBook(id, body) : await createBook(body);
      Swal.fire({
        icon: "success",
        title: editing ? "Recommendation updated" : "Thank you — recommendation saved",
        timer: 1400, showConfirmButton: false,
      });
      navigate(`/library/essential-books/show/${res.data?.data?.id || id}`);
    } catch (err) {
      const bag = err?.response?.data?.errors;
      if (bag) setErrors(Object.fromEntries(Object.entries(bag).map(([k, v]) => [k, v[0]])));
      Swal.fire("Error", describeError(err, "Failed to save the recommendation."), "error");
    } finally { setSaving(false); }
  };

  if (loading) return <Spinner />;

  return (
    <div className="min-h-screen bg-[#F4F8F8]">
      <div className="px-5 py-4" style={{ background: TEAL }}>
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h1 className="text-sm font-bold text-white">
              {editing ? "Edit Recommendation" : "Recommend a Book"}
            </h1>
            <p className="text-xs text-[#CFE6E6] mt-0.5">
              The 100 Essential Books · Human Excellence Program
            </p>
          </div>
          <button onClick={save} disabled={saving}
            className="px-4 py-1.5 bg-white/15 hover:bg-white/25 text-white rounded-xl text-xs font-bold disabled:opacity-50">
            {saving ? "Saving…" : editing ? "Save changes" : "Submit recommendation"}
          </button>
        </div>
      </div>

      <div className="px-4 py-5 space-y-4 max-w-3xl mx-auto">
        <div className="rounded-xl px-4 py-3 text-xs border-l-4"
          style={{ background: GOLD_LT, borderColor: "#C9A227", color: "#6B5100" }}>
          Not 100 favourites — a collection chosen through consultation. Only the title, author,
          why you recommend it, and your name are required. One form per book; you can submit as many as you like.
        </div>

        {/* ── 1. THE BOOK ─────────────────────────────────────────────── */}
        <Card title="The Book" desc="Which book would you put on this list?">
          <Field label="Book title" required error={errors.title}>
            <input value={form.title} onChange={(e) => set("title", e.target.value)}
              placeholder="Title in the original language" className={field} style={fieldStyle} dir="auto" />
          </Field>

          <Field label="Title in translation" hint="If a translated title exists, add it here">
            <input value={form.title_translation} onChange={(e) => set("title_translation", e.target.value)}
              placeholder="Dari / Pashto / English title" className={field} style={fieldStyle} dir="auto" />
          </Field>

          <div className="grid md:grid-cols-2 gap-3">
            <Field label="Author" required error={errors.author}>
              <input value={form.author} onChange={(e) => set("author", e.target.value)}
                placeholder="Full name of the author" className={field} style={fieldStyle} dir="auto" />
            </Field>
            <Field label="Is the author living?">
              <select value={form.author_living} onChange={(e) => set("author_living", e.target.value)}
                className={field} style={fieldStyle}>
                <option value="">— Select —</option>
                <option value="yes">Yes</option>
                <option value="no">No</option>
                <option value="unsure">Not sure</option>
              </select>
            </Field>
          </div>

          <div className="grid md:grid-cols-2 gap-3">
            <Field label="Original language">
              <select value={form.original_language} onChange={(e) => set("original_language", e.target.value)}
                className={field} style={fieldStyle}>
                <option value="">— Select —</option>
                {(ref?.languages || []).map((l) => <option key={l} value={l}>{l}</option>)}
              </select>
            </Field>
            <Field label="Era / century">
              <select value={form.era} onChange={(e) => set("era", e.target.value)}
                className={field} style={fieldStyle}>
                <option value="">— Select —</option>
                {(ref?.eras || []).map((e) => <option key={e} value={e}>{e}</option>)}
              </select>
            </Field>
          </div>

          <Field label="Genre / form" hint="Select all that apply">
            <TagGroup options={ref?.genres || []} selected={form.genres} onToggle={(v) => toggle("genres", v)} tone="teal" />
          </Field>
        </Card>

        {/* ── 2. WHY THIS BOOK ────────────────────────────────────────── */}
        <Card title="Why This Book" desc="The heart of the submission — what makes this book essential?">
          <Field label="Brief description" hint="For someone who has never heard of it — what would they need to know?">
            <textarea value={form.description} onChange={(e) => set("description", e.target.value)}
              placeholder="What is the book about? What world does it open?" rows={3}
              className={field} style={fieldStyle} dir="auto" />
          </Field>

          <Field label="Why you recommend it" required error={errors.recommendation}
            hint="Speak from your own reading experience. This is the most important field.">
            <textarea value={form.recommendation} onChange={(e) => set("recommendation", e.target.value)}
              placeholder="What does this book do that no other book does? What changed in you — or could change in a reader — because of it?"
              rows={5} className={field} style={fieldStyle} dir="auto" />
          </Field>

          <Field label="Theme(s)" hint="Based on the ten thematic areas of the initiative">
            <TagGroup options={ref?.themes || []} selected={form.themes} onToggle={(v) => toggle("themes", v)} tone="gold" />
          </Field>
        </Card>

        {/* ── 3. LEVEL & AUDIENCE ─────────────────────────────────────── */}
        <Card title="Level & Audience" desc="Who should read this book, and at what stage?">
          <Field label="Best reading level" hint="Many books span levels — pick where it fits best.">
            <div className="grid grid-cols-3 md:grid-cols-5 gap-2">
              {(ref?.levels || []).map((l) => {
                const on = form.reading_level === l.value;
                return (
                  <button key={l.value} type="button"
                    onClick={() => set("reading_level", on ? "" : l.value)}
                    className="text-center px-2 py-2.5 rounded-xl border transition-colors"
                    style={{
                      background: on ? TEAL : "#fff",
                      color: on ? "#fff" : "#0A3A3E",
                      borderColor: on ? TEAL : BORDER,
                    }}>
                    <span className="block text-sm font-bold">{l.label}</span>
                    <span className="block text-[10px] mt-0.5" style={{ color: on ? "rgba(255,255,255,.75)" : "#8AA4A7" }}>
                      {l.desc}
                    </span>
                  </button>
                );
              })}
            </div>
          </Field>

          <Field label="Available editions">
            <textarea value={form.editions} onChange={(e) => set("editions", e.target.value)}
              placeholder="Are good Dari or Pashto editions available? Which publisher? Does a translation need to be produced?"
              rows={2} className={field} style={fieldStyle} dir="auto" />
          </Field>
        </Card>

        {/* ── 4. THE FILE & SOURCES ───────────────────────────────────── */}
        <Card title="The Book File & Sources" desc="Upload a PDF copy, or point us to where the book can be found">
          <Field label="Book PDF" hint={`PDF only · up to ${ref?.max_pdf_mb || 20} MB`}>
            {savedPdf && !pdf ? (
              <div className="flex items-center gap-3 px-3 py-2.5 rounded-xl border"
                style={{ background: GOLD_LT, borderColor: GOLD_SOFT }}>
                <span className="text-lg">📄</span>
                <a href={savedPdf.url} target="_blank" rel="noopener noreferrer"
                  className="min-w-0 flex-1 text-sm font-semibold underline truncate" style={{ color: GOLD_DEEP }}>
                  {savedPdf.name || "Open the uploaded PDF"}
                </a>
                <span className="text-[11px] shrink-0" style={{ color: GOLD_DEEP }}>{prettySize(savedPdf.size)}</span>
                <button type="button" onClick={dropSavedPdf}
                  className="text-[#8AA4A7] hover:text-red-500 text-sm shrink-0" title="Remove this file">✕</button>
              </div>
            ) : (
              <div className="space-y-2">
                <input type="file" accept="application/pdf,.pdf"
                  onChange={(e) => pickPdf(e.target.files?.[0])}
                  className="w-full text-xs file:mr-3 file:px-4 file:py-2 file:rounded-xl file:border-0
                             file:text-xs file:font-semibold file:text-white file:cursor-pointer cursor-pointer
                             px-3 py-2 border rounded-xl bg-white"
                  style={{ borderColor: BORDER }} />
                {pdf && (
                  <div className="flex items-center gap-2 text-[11px]" style={{ color: TEAL }}>
                    <span>📄 {pdf.name} · {prettySize(pdf.size)}</span>
                    <button type="button" onClick={() => setPdf(null)}
                      className="text-[#8AA4A7] hover:text-red-500">✕</button>
                    <span className="text-[#8AA4A7]">— uploads when you save</span>
                  </div>
                )}
                {savedPdf && pdf && (
                  <p className="text-[10px]" style={{ color: GOLD_DEEP }}>
                    This replaces the file already attached ({savedPdf.name}).
                  </p>
                )}
              </div>
            )}
          </Field>

          <Field label="Links to the book"
            hint="Internet Archive, publisher website, Google Books, an online text — any link helps.">
            <div className="space-y-2">
              {form.links.map((l, i) => (
                <div key={i} className="flex items-center gap-2">
                  <input value={l} onChange={(e) => setLink(i, e.target.value)}
                    placeholder="https://…" className={field} style={fieldStyle} dir="ltr" />
                  <button type="button" onClick={() => removeLink(i)}
                    className="w-9 h-9 rounded-full border shrink-0 text-[#8AA4A7] hover:text-red-500 hover:border-red-300"
                    style={{ borderColor: BORDER }} title="Remove">✕</button>
                </div>
              ))}
              <button type="button" onClick={addLink}
                className="px-3 py-1.5 rounded-lg text-xs font-semibold border border-dashed"
                style={{ color: TEAL, borderColor: BORDER }}>
                + Add another link
              </button>
            </div>
          </Field>

          <Field label="Notes on access">
            <textarea value={form.access_notes} onChange={(e) => set("access_notes", e.target.value)}
              placeholder="e.g. “Out of print but I have a copy”, “Needs a new Dari translation”…"
              rows={2} className={field} style={fieldStyle} dir="auto" />
          </Field>
        </Card>

        {/* ── 5. ABOUT YOU ────────────────────────────────────────────── */}
        <Card title="About You" desc="So we can credit you and follow up if needed">
          <div className="grid md:grid-cols-2 gap-3">
            <Field label="Your name" required error={errors.recommender_name}>
              <input value={form.recommender_name} onChange={(e) => set("recommender_name", e.target.value)}
                placeholder="Full name" className={field} style={fieldStyle} dir="auto" />
            </Field>
            <Field label="Your field / role">
              <input value={form.recommender_role} onChange={(e) => set("recommender_role", e.target.value)}
                placeholder="Teacher, Writer, Scholar, Student, Reader…" className={field} style={fieldStyle} dir="auto" />
            </Field>
          </div>

          <div className="grid md:grid-cols-2 gap-3">
            <Field label="Email or phone" hint="For follow-up only — not published">
              <input value={form.recommender_contact} onChange={(e) => set("recommender_contact", e.target.value)}
                placeholder="Email or phone number" className={field} style={fieldStyle} dir="auto" />
            </Field>
            <Field label="City / country">
              <input value={form.recommender_location} onChange={(e) => set("recommender_location", e.target.value)}
                placeholder="Kabul, Istanbul, London…" className={field} style={fieldStyle} dir="auto" />
            </Field>
          </div>

          <Field label="Would you like to be involved further?" hint="Select any that apply">
            <TagGroup options={ref?.involvement || []} selected={form.involvement}
              onToggle={(v) => toggle("involvement", v)} tone="teal" />
          </Field>
        </Card>

        <div className="flex gap-2 pb-4">
          <button onClick={save} disabled={saving}
            className="px-5 py-2 text-xs font-semibold text-white rounded-xl disabled:opacity-50"
            style={{ background: TEAL }}>
            {saving ? "Saving…" : editing ? "Save changes" : "Submit recommendation"}
          </button>
          <button onClick={() => navigate("/library/essential-books")}
            className="px-4 py-2 text-xs font-semibold rounded-xl bg-white border"
            style={{ color: MUTED, borderColor: BORDER }}>
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}

/* ── small building blocks, kept local to this screen ──────────────────── */

function Card({ title, desc, children }) {
  return (
    <div className="bg-white rounded-2xl border shadow-sm p-4 space-y-4" style={{ borderColor: BORDER }}>
      <div>
        <h3 className="text-sm font-bold pb-1.5 inline-block"
          style={{ color: "#052528", borderBottom: "2px solid #C9A227" }}>{title}</h3>
        {desc && <p className="text-xs mt-1.5" style={{ color: MUTED }}>{desc}</p>}
      </div>
      {children}
    </div>
  );
}

function Field({ label, required, hint, error, children }) {
  return (
    <div>
      <label className="block text-[11px] font-semibold mb-1" style={{ color: "#0A3A3E" }}>
        {label}{required && <span style={{ color: "#C9A227" }}> *</span>}
      </label>
      {children}
      {error
        ? <p className="text-[10px] mt-1" style={{ color: "#B83230" }}>{error}</p>
        : hint && <p className="text-[10px] mt-1" style={{ color: "#8AA4A7" }}>{hint}</p>}
    </div>
  );
}

/** Multi-select chips. Two tones so themes read differently from genres. */
function TagGroup({ options, selected, onToggle, tone = "teal" }) {
  const on = tone === "gold"
    ? { background: GOLD_LT, color: GOLD_DEEP, borderColor: GOLD_SOFT }
    : { background: "#E8F6F6", color: TEAL, borderColor: TEAL };
  return (
    <div className="flex flex-wrap gap-2">
      {options.map((o) => {
        const active = selected.includes(o);
        return (
          <button key={o} type="button" onClick={() => onToggle(o)}
            className="px-3 py-1.5 rounded-full text-xs border transition-colors"
            style={active ? { ...on, fontWeight: 600 } : { background: "#fff", color: "#0A3A3E", borderColor: BORDER }}>
            {o}
          </button>
        );
      })}
    </div>
  );
}
