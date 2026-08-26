import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { useNavigate, useParams } from "react-router-dom";
import Swal from "sweetalert2";
import {
  getFormData, getBook, createBook, updateBook, deleteBookPdf,
} from "../../api/essentialBooks";
import {
  TEAL, GOLD, GOLD_LT, GOLD_SOFT, GOLD_DEEP, BORDER, MUTED, describeError,
} from "../education/weeklyUi";
import useSmartBack from "../../hooks/useSmartBack";
import { useAuth } from "../../admin/context/AuthContext";
import { draftKey, readDraft, writeDraft, clearDraft } from "../../utils/formDraft";
import { RestoreDraftBanner } from "../../components/hr/DraftBar";

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

/**
 * The five sections, declared once.
 *
 * The order and wording follow the original paper submission sheet, and the
 * field lists are what the navigator counts to show how far along each section
 * is — so the map cannot drift from the form the way a hand-written progress
 * bar would.
 */
const SECTIONS = [
  {
    id: "book", title: "The Book", desc: "Which book would you put on this list?",
    fields: ["title", "title_translation", "author", "author_living", "original_language", "era", "genres"],
    required: ["title", "author"],
  },
  {
    id: "why", title: "Why This Book", desc: "The heart of the submission — what makes this book essential?",
    fields: ["description", "recommendation", "themes"],
    required: ["recommendation"],
  },
  {
    id: "level", title: "Level & Audience", desc: "Who should read this book, and at what stage?",
    fields: ["reading_level", "editions"], required: [],
  },
  {
    id: "file", title: "The Book File & Sources", desc: "Upload a PDF copy, or point us to where the book can be found",
    fields: ["links", "access_notes"], required: [],
  },
  {
    id: "you", title: "About You", desc: "So we can credit you and follow up if needed",
    fields: ["recommender_name", "recommender_role", "recommender_contact", "recommender_location", "involvement"],
    required: ["recommender_name"],
  },
];

/** Every field the form refuses to save without, counted once from the map. */
const TOTAL_REQUIRED = SECTIONS.reduce((n, s) => n + s.required.length, 0);

/** What each required field is called when we have to ask for it by name. */
const REQUIRED_LABEL = {
  title: "Book title",
  author: "Author",
  recommendation: "Why you recommend it",
  recommender_name: "Your name",
};

/** …and what we say when it is empty. */
const REQUIRED_MESSAGE = {
  title: "The book's title is needed.",
  author: "Who wrote it?",
  recommendation: "This is the heart of the submission.",
  recommender_name: "So we can credit you.",
};

/** Anything the user has actually put something into. */
const isFilled = (v) => (Array.isArray(v) ? v.some((x) => String(x || "").trim()) : String(v ?? "").trim() !== "");

const field = "w-full px-3 py-2 border rounded-xl text-sm bg-white transition-shadow focus:ring-2 focus:ring-[#9CCBCB] focus:outline-none";
const fieldStyle = { borderColor: BORDER };
/** A field the user has been sent back to fix reads as wrong before it is read. */
const errStyle = { borderColor: "#E0A0A0", background: "#FFFBFB" };

const prettySize = (bytes) => {
  if (!bytes) return "";
  const mb = bytes / 1048576;
  return mb >= 1 ? `${mb.toFixed(1)} MB` : `${Math.max(1, Math.round(bytes / 1024))} KB`;
};

/** Good enough to catch a pasted "wwww.foo" or a bare word; the server decides. */
const looksLikeUrl = (v) => /^(https?:\/\/|www\.)\S+\.\S+/i.test(v.trim());

/**
 * Submit / edit one recommendation for The 100 Essential Books.
 *
 * A custom form rather than the shared CrudFormPage: that component covers
 * text / select / date / checkbox, and this needs multi-select tag groups, a
 * level picker, a repeating link list and a file upload. The section order and
 * wording follow the original submission sheet so anyone who filled the paper
 * version recognises it.
 *
 * It is also LONG — five sections, twenty-odd fields, two of them essays. Three
 * things follow from that, and they are most of what is not "just fields":
 * a navigator that shows where you are and how much of each section is done,
 * a save bar that stays reachable instead of living a screen and a half below,
 * and an autosaved draft so a mistaken Back does not cost somebody their
 * afternoon.
 */
export default function EssentialBookForm() {
  const navigate = useNavigate();
  const { id } = useParams();
  const editing = Boolean(id);
  const goBack = useSmartBack("/library/essential-books");
  const { user } = useAuth();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [ref, setRef] = useState(null);
  const [form, setForm] = useState(EMPTY);
  const [pdf, setPdf] = useState(null);          // a freshly picked File
  const [savedPdf, setSavedPdf] = useState(null); // what is already stored
  const [errors, setErrors] = useState({});
  // One section at a time. The whole form used to be on screen at once, which
  // made a twenty-field submission read as a wall and hid how far along you
  // were; the navigator was doing the work a stepper does natively.
  const [step, setStep] = useState(0);
  const [localDraft, setLocalDraft] = useState(null);
  // What the record looked like when it loaded. The local copy exists to hold
  // what the SERVER does not have; mirroring an untouched record would put up a
  // "restore unsaved work?" banner next visit offering what is already there.
  const loadedSnapshot = useRef(null);

  const localKey = draftKey("essential-book", user?.id, id);

  const load = useCallback(async () => {
    setLoading(true);
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

  /* ── Nothing typed here gets thrown away ──────────────────────────────────
   * Twenty fields and two essays is a lot to lose to a mistaken Back or a
   * closed tab. The browser keeps a copy as you type and offers it back on
   * your next visit — never applied silently, because overwriting the fields
   * somebody is looking at is worse than losing a draft they had forgotten. */
  useEffect(() => {
    if (loading) return;
    const found = readDraft(localKey);
    if (found) setLocalDraft(found);
  }, [loading, localKey]);

  // Whatever the form holds the moment it finishes loading IS what the server
  // holds — recorded before the mirror below can mistake it for unsaved work.
  useEffect(() => {
    if (loading) return;
    loadedSnapshot.current = JSON.stringify(form);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading]);

  useEffect(() => {
    if (loading) return;
    const t = setTimeout(() => {
      if (loadedSnapshot.current === JSON.stringify(form)) return;   // nothing new
      // Only worth keeping once there is something to keep.
      if (SECTIONS.some((s) => s.fields.some((k) => isFilled(form[k])))) writeDraft(localKey, { ...form, __step: step });
    }, 700);
    return () => clearTimeout(t);
  }, [form, step, loading, localKey]);

  const restoreDraft = () => {
    if (localDraft?.data) {
      // Put them back on the step they left, not at the beginning of a form
      // they had already worked through.
      const { __step, ...fields } = localDraft.data;
      setForm({ ...EMPTY, ...fields });
      if (Number.isInteger(__step)) setStep(Math.min(Math.max(0, __step), SECTIONS.length - 1));
    }
    setLocalDraft(null);
  };
  const discardDraft = () => { clearDraft(localKey); setLocalDraft(null); };

  const set = (k, v) => {
    setForm((f) => ({ ...f, [k]: v }));
    if (errors[k]) setErrors((e) => ({ ...e, [k]: undefined }));
  };

  const toggle = (k, value) =>
    setForm((f) => ({
      ...f,
      [k]: f[k].includes(value) ? f[k].filter((x) => x !== value) : [...f[k], value],
    }));

  /* A filled last row grows a fresh one, so adding links is just typing — the
   * "+ Add another link" button stays for anyone who looks for it. */
  const setLink = (i, v) =>
    setForm((f) => {
      const links = f.links.map((l, j) => (j === i ? v : l));
      if (i === links.length - 1 && v.trim() && links.length < 8) links.push("");
      return { ...f, links };
    });
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

  /* ── How far along ──────────────────────────────────────────────────────
   * Counted from the SECTIONS map, so a field added to the form is a field the
   * navigator counts. The file section also counts the PDF, which is not a
   * `form` key but is very much something the user filled in. */
  const progress = useMemo(() => {
    const per = {};
    SECTIONS.forEach((s) => {
      const extra = s.id === "file" ? [pdf || savedPdf] : [];
      const all = [...s.fields.map((k) => form[k]), ...extra];
      per[s.id] = {
        filled: all.filter(isFilled).length,
        total: all.length,
        needs: s.required.filter((k) => !isFilled(form[k])),
      };
    });
    return per;
  }, [form, pdf, savedPdf]);

  const stillNeeded = SECTIONS.flatMap((s) => progress[s.id].needs);

  const isLast = step === SECTIONS.length - 1;

  /** Send the user to a field that needs them, wherever it lives. */
  const focusField = (key) => {
    setTimeout(() => {
      const el = document.getElementById(`f-${key}`);
      el?.scrollIntoView({ behavior: "smooth", block: "center" });
      setTimeout(() => el?.focus({ preventScroll: true }), 300);
    }, 60);   // after the step has rendered
  };

  const gotoStep = (i) => {
    setStep(Math.min(Math.max(0, i), SECTIONS.length - 1));
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  /**
   * Next checks only THIS step's required fields.
   *
   * Nothing is locked: the stepper lets you jump anywhere, because a person
   * filling in a recommendation may well want to write the "why" before they
   * look up the publisher. Next is where we ask, since that is the moment they
   * are telling us they consider the step done.
   */
  const goNext = () => {
    const needs = SECTIONS[step].required.filter((k) => !isFilled(form[k]));
    if (needs.length) {
      setErrors((e) => ({
        ...e,
        ...Object.fromEntries(needs.map((k) => [k, REQUIRED_MESSAGE[k] || "This one is needed."])),
      }));
      focusField(needs[0]);
      return;
    }
    gotoStep(step + 1);
  };

  const save = async () => {
    const missing = Object.fromEntries(
      SECTIONS.flatMap((sec) => sec.required)
        .filter((k) => !isFilled(form[k]))
        .map((k) => [k, REQUIRED_MESSAGE[k] || "This one is needed."]),
    );
    if (Object.keys(missing).length) {
      setErrors(missing);
      // Take the user TO the problem — which now also means opening the step
      // it lives on, since it may be three steps behind them.
      const first = Object.keys(missing)[0];
      const owner = SECTIONS.findIndex((sec) => sec.required.includes(first));
      if (owner >= 0 && owner !== step) gotoStep(owner);
      focusField(first);
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
      clearDraft(localKey);
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

  const saveLabel = saving ? "Saving…" : editing ? "Save changes" : "Submit recommendation";

  return (
    <div className="min-h-screen bg-[#F4F8F8]">
      {/* ── Page header ── */}
      <div className="px-5 py-4" style={{ background: TEAL }}>
        <div className="flex items-center gap-3 max-w-5xl mx-auto">
          <button onClick={goBack} title="Back"
            className="w-8 h-8 rounded-xl bg-white/15 hover:bg-white/25 text-white flex items-center justify-center shrink-0 transition-colors">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
          </button>
          <div className="min-w-0">
            <h1 className="text-sm font-bold text-white truncate">
              {editing ? "Edit Recommendation" : "Recommend a Book"}
            </h1>
            <p className="text-xs text-[#CFE6E6] mt-0.5 truncate">
              The 100 Essential Books · Step {step + 1} of {SECTIONS.length} — {SECTIONS[step].title}
            </p>
          </div>
        </div>
      </div>

      <div className="px-4 py-5 max-w-5xl mx-auto lg:grid lg:grid-cols-[218px_minmax(0,1fr)] lg:gap-6 lg:items-start">
        {/* ── Navigator: where you are, and what each section still wants ──
          * Sticky on a wide screen because the page is long enough that the
          * only alternative is scrolling to find out. */}
        <nav className="hidden lg:block lg:sticky lg:top-4">
          <div className="bg-white rounded-2xl border shadow-sm p-3" style={{ borderColor: BORDER }}>
            <ProgressSummary stillNeeded={stillNeeded} />
            <ol className="mt-3 space-y-0.5">
              {SECTIONS.map((sec, i) => (
                <SectionLink key={sec.id} n={i + 1} section={sec} stats={progress[sec.id]}
                  active={step === i} onClick={() => gotoStep(i)} />
              ))}
            </ol>
          </div>
        </nav>

        <div className="space-y-4 min-w-0">
          {localDraft && (
            <RestoreDraftBanner savedAt={localDraft.savedAt} onRestore={restoreDraft} onDiscard={discardDraft} />
          )}

          <div className="rounded-xl px-4 py-3 text-xs border-l-4"
            style={{ background: GOLD_LT, borderColor: GOLD, color: GOLD_DEEP }}>
            Not 100 favourites — a collection chosen through consultation. Only the title, author,
            why you recommend it, and your name are required. One form per book; you can submit as many as you like.
          </div>

          {/* The stepper where there is no room for a rail: one segment per
            * step, still tappable, teal for where you are and green for what
            * is already complete. */}
          <div className="lg:hidden bg-white rounded-2xl border shadow-sm p-3" style={{ borderColor: BORDER }}>
            <div className="flex items-center gap-1.5">
              {SECTIONS.map((sec, i) => {
                const done = progress[sec.id].needs.length === 0 && progress[sec.id].filled > 0;
                const on = step === i;
                return (
                  <button key={sec.id} type="button" onClick={() => gotoStep(i)}
                    title={`${i + 1}. ${sec.title}`} aria-label={`Step ${i + 1}: ${sec.title}`}
                    className="flex-1 h-1.5 rounded-full transition-colors"
                    style={{ background: on ? TEAL : done ? "#8FC7B0" : "#E8F0F0" }} />
                );
              })}
            </div>
            <div className="flex items-baseline justify-between mt-2 gap-2">
              <span className="text-[11px] font-bold truncate" style={{ color: "#0A3A3E" }}>
                {step + 1}. {SECTIONS[step].title}
              </span>
              <span className="text-[10px] shrink-0" style={{ color: "#8AA4A7" }}>
                Step {step + 1} of {SECTIONS.length}
              </span>
            </div>
          </div>

          {/* ── 1. THE BOOK ─────────────────────────────────────────────── */}
          {step === 0 && (
            <Card id="book" n={1} title="The Book" desc="Which book would you put on this list?"
              stats={progress.book}>
              <Field id="title" label="Book title" required error={errors.title}>
                <input id="f-title" value={form.title} onChange={(e) => set("title", e.target.value)}
                  placeholder="Title in the original language" className={field}
                  style={errors.title ? errStyle : fieldStyle} dir="auto" />
              </Field>

              <Field label="Title in translation" hint="If a translated title exists, add it here">
                <input value={form.title_translation} onChange={(e) => set("title_translation", e.target.value)}
                  placeholder="Dari / Pashto / English title" className={field} style={fieldStyle} dir="auto" />
              </Field>

              <div className="grid md:grid-cols-2 gap-3">
                <Field label="Author" required error={errors.author}>
                  <input id="f-author" value={form.author} onChange={(e) => set("author", e.target.value)}
                    placeholder="Full name of the author" className={field}
                    style={errors.author ? errStyle : fieldStyle} dir="auto" />
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

              <Field label="Genre / form" hint="Select all that apply" count={form.genres.length}
                onClear={form.genres.length ? () => set("genres", []) : null}>
                <TagGroup options={ref?.genres || []} selected={form.genres} onToggle={(v) => toggle("genres", v)} tone="teal" />
              </Field>
            </Card>
          )}

          {/* ── 2. WHY THIS BOOK ────────────────────────────────────────── */}
          {step === 1 && (
            <Card id="why" n={2} title="Why This Book" desc="The heart of the submission — what makes this book essential?"
              stats={progress.why}>
              <Field label="Brief description" hint="For someone who has never heard of it — what would they need to know?"
                counter={counterFor(form.description)}>
                <textarea value={form.description} onChange={(e) => set("description", e.target.value)}
                  placeholder="What is the book about? What world does it open?" rows={3}
                  className={field} style={fieldStyle} dir="auto" />
              </Field>

              <Field id="recommendation" label="Why you recommend it" required error={errors.recommendation}
                hint="Speak from your own reading experience. This is the most important field."
                counter={counterFor(form.recommendation, 400)}>
                <textarea id="f-recommendation" value={form.recommendation} onChange={(e) => set("recommendation", e.target.value)}
                  placeholder="What does this book do that no other book does? What changed in you — or could change in a reader — because of it?"
                  rows={6} className={field} style={errors.recommendation ? errStyle : fieldStyle} dir="auto" />
              </Field>

              <Field label="Theme(s)" hint="Based on the ten thematic areas of the initiative"
                count={form.themes.length} onClear={form.themes.length ? () => set("themes", []) : null}>
                <TagGroup options={ref?.themes || []} selected={form.themes} onToggle={(v) => toggle("themes", v)} tone="gold" />
              </Field>
            </Card>
          )}

          {/* ── 3. LEVEL & AUDIENCE ─────────────────────────────────────── */}
          {step === 2 && (
            <Card id="level" n={3} title="Level & Audience" desc="Who should read this book, and at what stage?"
              stats={progress.level}>
              <Field label="Best reading level" hint="Many books span levels — pick where it fits best.">
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2">
                  {(ref?.levels || []).map((l) => {
                    const on = form.reading_level === l.value;
                    return (
                      <button key={l.value} type="button" aria-pressed={on}
                        onClick={() => set("reading_level", on ? "" : l.value)}
                        className="text-center px-2 py-2.5 rounded-xl border transition-colors hover:border-[#9CCBCB]"
                        style={{
                          background: on ? TEAL : "#fff",
                          color: on ? "#fff" : "#0A3A3E",
                          borderColor: on ? TEAL : BORDER,
                        }}>
                        <span className="block text-sm font-bold">{l.label}</span>
                        <span className="block text-[10px] mt-0.5 leading-tight" style={{ color: on ? "rgba(255,255,255,.75)" : "#8AA4A7" }}>
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
          )}

          {/* ── 4. THE FILE & SOURCES ───────────────────────────────────── */}
          {step === 3 && (
            <Card id="file" n={4} title="The Book File & Sources"
              desc="Upload a PDF copy, or point us to where the book can be found"
              stats={progress.file}>
              <Field label="Book PDF" hint={`PDF only · up to ${ref?.max_pdf_mb || 20} MB`}>
                <PdfPicker
                  saved={savedPdf} picked={pdf} maxMb={ref?.max_pdf_mb || 20}
                  onPick={pickPdf} onClearPicked={() => setPdf(null)} onRemoveSaved={dropSavedPdf}
                />
              </Field>

              <Field label="Links to the book"
                hint="Internet Archive, publisher website, Google Books, an online text — any link helps.">
                <div className="space-y-2">
                  {form.links.map((l, i) => {
                    const bad = l.trim() !== "" && !looksLikeUrl(l);
                    const only = form.links.length === 1;
                    return (
                      <div key={i}>
                        <div className="flex items-center gap-2">
                          <span className="w-6 text-center text-[11px] shrink-0" style={{ color: "#8AA4A7" }}>
                            {i + 1}
                          </span>
                          <input value={l} onChange={(e) => setLink(i, e.target.value)}
                            placeholder="https://…" className={field}
                            style={bad ? errStyle : fieldStyle} dir="ltr" />
                          {/* A lone empty row has nothing to remove — the button
                            * would only be there to be pressed by mistake. */}
                          {(!only || l.trim() !== "") && (
                            <button type="button" onClick={() => removeLink(i)}
                              className="w-9 h-9 rounded-full border shrink-0 text-[#8AA4A7] hover:text-red-500 hover:border-red-300 transition-colors"
                              style={{ borderColor: BORDER }} title="Remove this link">✕</button>
                          )}
                        </div>
                        {bad && (
                          <p className="text-[10px] mt-1 ml-8" style={{ color: GOLD_DEEP }}>
                            That does not look like a web address — a link usually starts with https://
                          </p>
                        )}
                      </div>
                    );
                  })}
                  <button type="button" onClick={addLink}
                    className="px-3 py-1.5 rounded-lg text-xs font-semibold border border-dashed hover:bg-[#F4F8F8] transition-colors"
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
          )}

          {/* ── 5. ABOUT YOU ────────────────────────────────────────────── */}
          {step === 4 && (
            <Card id="you" n={5} title="About You" desc="So we can credit you and follow up if needed"
              stats={progress.you}>
              <div className="grid md:grid-cols-2 gap-3">
                <Field label="Your name" required error={errors.recommender_name}>
                  <input id="f-recommender_name" value={form.recommender_name} onChange={(e) => set("recommender_name", e.target.value)}
                    placeholder="Full name" className={field}
                    style={errors.recommender_name ? errStyle : fieldStyle} dir="auto" />
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

              <Field label="Would you like to be involved further?" hint="Select any that apply"
                count={form.involvement.length} onClear={form.involvement.length ? () => set("involvement", []) : null}>
                <TagGroup options={ref?.involvement || []} selected={form.involvement}
                  onToggle={(v) => toggle("involvement", v)} tone="teal" />
              </Field>
            </Card>
          )}
        </div>
      </div>

      {/* ── Save bar ──
        * Docked, because the alternative on a page this long is scrolling to
        * the bottom to find out that a field near the top is missing. */}
      <div className="sticky bottom-0 border-t backdrop-blur"
        style={{ borderColor: BORDER, background: "rgba(255,255,255,.92)" }}>
        <div className="max-w-5xl mx-auto px-4 py-3 flex items-center gap-3">
          <div className="min-w-0 flex-1">
            {stillNeeded.length > 0 ? (
              <p className="text-[11px] truncate" style={{ color: GOLD_DEEP }}>
                <span className="font-bold">Still needed:</span>{" "}
                {stillNeeded.map((k) => REQUIRED_LABEL[k] || k).join(" · ")}
              </p>
            ) : (
              <p className="text-[11px] font-semibold" style={{ color: "#2E7D5B" }}>
                ✓ Everything required is filled in{isLast ? "" : " — you can submit from the last step"}
              </p>
            )}
          </div>
          {/* Step 1 has nothing behind it but the list you came from, so Back
            * leaves the form there instead of being a dead button. */}
          <button onClick={() => (step === 0 ? goBack() : gotoStep(step - 1))}
            className="px-4 py-2 text-xs font-semibold rounded-xl bg-white border shrink-0 hover:bg-[#F4F8F8] transition-colors"
            style={{ color: MUTED, borderColor: BORDER }}>
            {step === 0 ? "Cancel" : "← Back"}
          </button>
          {isLast ? (
            <button onClick={save} disabled={saving}
              className="px-5 py-2 text-xs font-semibold text-white rounded-xl shrink-0 disabled:opacity-50 hover:brightness-110 transition-all"
              style={{ background: TEAL }}>
              {saveLabel}
            </button>
          ) : (
            <button onClick={goNext}
              className="px-5 py-2 text-xs font-semibold text-white rounded-xl shrink-0 hover:brightness-110 transition-all"
              style={{ background: TEAL }}>
              Next →
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

/* ── small building blocks, kept local to this screen ──────────────────── */

/** "2 of 4 required fields left" — the one number worth reading at a glance. */
function ProgressSummary({ stillNeeded }) {
  const done = TOTAL_REQUIRED - stillNeeded.length;
  const pct = Math.round((done / TOTAL_REQUIRED) * 100);
  return (
    <div>
      <div className="flex items-baseline justify-between">
        <span className="text-[11px] font-bold" style={{ color: "#0A3A3E" }}>Required</span>
        <span className="text-[11px]" style={{ color: stillNeeded.length ? GOLD_DEEP : "#2E7D5B" }}>
          {done}/{TOTAL_REQUIRED}
        </span>
      </div>
      <div className="h-1.5 rounded-full mt-1.5 overflow-hidden" style={{ background: "#E8F0F0" }}>
        <div className="h-full rounded-full transition-all duration-500"
          style={{ width: `${pct}%`, background: stillNeeded.length ? GOLD : "#2E7D5B" }} />
      </div>
    </div>
  );
}

function SectionLink({ n, section, stats, active, onClick }) {
  const complete = stats.needs.length === 0 && stats.filled > 0;
  // Nothing is locked — jumping straight to "Why This Book" is a reasonable
  // way to start, so every step stays reachable from the first render.
  return (
    <li>
      <button type="button" onClick={onClick}
        className="w-full text-left px-2.5 py-2 rounded-xl transition-colors flex items-start gap-2.5"
        style={active ? { background: "#E8F6F6" } : undefined}>
        <span className="w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0 mt-px"
          style={complete
            ? { background: "#E6F3EC", color: "#2E7D5B" }
            : { background: active ? TEAL : "#F4F8F8", color: active ? "#fff" : "#8AA4A7" }}>
          {complete ? "✓" : n}
        </span>
        <span className="min-w-0 flex-1">
          <span className="block text-[11px] font-semibold leading-tight"
            style={{ color: active ? TEAL : "#0A3A3E" }}>
            {section.title}
          </span>
          <span className="block text-[10px] mt-0.5" style={{ color: "#8AA4A7" }}>
            {stats.filled} of {stats.total} filled
          </span>
        </span>
      </button>
    </li>
  );
}

function Card({ id, n, title, desc, stats, children }) {
  return (
    <section id={id} className="bg-white rounded-2xl border shadow-sm p-4 space-y-4"
      style={{ borderColor: BORDER }}>
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="text-sm font-bold pb-1.5 inline-block"
            style={{ color: "#052528", borderBottom: `2px solid ${GOLD}` }}>
            <span style={{ color: "#8AA4A7" }}>{n}.</span> {title}
          </h3>
          {desc && <p className="text-xs mt-1.5" style={{ color: MUTED }}>{desc}</p>}
        </div>
        {stats && (
          <span className="text-[10px] shrink-0 px-2 py-0.5 rounded-full whitespace-nowrap"
            style={stats.needs.length
              ? { background: GOLD_LT, color: GOLD_DEEP }
              : { background: "#F4F8F8", color: "#8AA4A7" }}>
            {stats.needs.length ? `${stats.needs.length} required left` : `${stats.filled}/${stats.total}`}
          </span>
        )}
      </div>
      {children}
    </section>
  );
}

/** A live character count, and a nudge on the fields where length is the point. */
const counterFor = (value, target = 0) => {
  const n = (value || "").trim().length;
  if (!n) return target ? `A paragraph or two — around ${target} characters` : null;
  if (target && n < target) return `${n} characters · a little more would help`;
  return `${n} characters`;
};

function Field({ id, label, required, hint, error, children, counter, count, onClear }) {
  return (
    <div id={id ? `field-${id}` : undefined}>
      <div className="flex items-baseline justify-between gap-2 mb-1">
        <label className="block text-[11px] font-semibold" style={{ color: "#0A3A3E" }}>
          {label}{required && <span style={{ color: GOLD }}> *</span>}
        </label>
        {count > 0 && (
          <span className="text-[10px] flex items-center gap-1.5 shrink-0">
            <span style={{ color: TEAL }}>{count} selected</span>
            {onClear && (
              <button type="button" onClick={onClear}
                className="underline hover:no-underline" style={{ color: "#8AA4A7" }}>clear</button>
            )}
          </span>
        )}
      </div>
      {children}
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          {error
            ? <p className="text-[10px] mt-1" style={{ color: "#B83230" }}>{error}</p>
            : hint && <p className="text-[10px] mt-1" style={{ color: "#8AA4A7" }}>{hint}</p>}
        </div>
        {counter && (
          <span className="text-[10px] mt-1 shrink-0 whitespace-nowrap" style={{ color: "#8AA4A7" }}>{counter}</span>
        )}
      </div>
    </div>
  );
}

/**
 * The PDF field.
 *
 * Was a bare <input type="file"> styled with `file:text-white` and no
 * background — white label on the browser's own grey button, so the one word
 * telling you how to attach a file was invisible. This is a real drop target
 * instead: drag a PDF onto it, or click anywhere in it to browse.
 */
function PdfPicker({ saved, picked, maxMb, onPick, onClearPicked, onRemoveSaved }) {
  const input = useRef(null);
  const [over, setOver] = useState(false);

  const onDrop = (e) => {
    e.preventDefault();
    setOver(false);
    onPick(e.dataTransfer?.files?.[0]);
  };

  if (saved && !picked) {
    return (
      <div className="flex items-center gap-3 px-3 py-2.5 rounded-xl border"
        style={{ background: GOLD_LT, borderColor: GOLD_SOFT }}>
        <span className="text-lg">📄</span>
        <a href={saved.url} target="_blank" rel="noopener noreferrer"
          className="min-w-0 flex-1 text-sm font-semibold underline truncate" style={{ color: GOLD_DEEP }}>
          {saved.name || "Open the uploaded PDF"}
        </a>
        <span className="text-[11px] shrink-0" style={{ color: GOLD_DEEP }}>{prettySize(saved.size)}</span>
        <button type="button" onClick={() => input.current?.click()}
          className="text-[11px] font-semibold underline shrink-0" style={{ color: GOLD_DEEP }}>
          Replace
        </button>
        <button type="button" onClick={onRemoveSaved}
          className="text-[#8AA4A7] hover:text-red-500 text-sm shrink-0" title="Remove this file">✕</button>
        <input ref={input} type="file" accept="application/pdf,.pdf" className="hidden"
          onChange={(e) => onPick(e.target.files?.[0])} />
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <div
        onClick={() => input.current?.click()}
        onDragOver={(e) => { e.preventDefault(); setOver(true); }}
        onDragLeave={() => setOver(false)}
        onDrop={onDrop}
        role="button" tabIndex={0}
        onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); input.current?.click(); } }}
        className="rounded-xl border-2 border-dashed px-4 py-6 text-center cursor-pointer transition-colors focus:outline-none focus:ring-2 focus:ring-[#9CCBCB]"
        style={over
          ? { borderColor: TEAL, background: "#E8F6F6" }
          : { borderColor: BORDER, background: "#fff" }}>
        <div className="text-2xl mb-1">📄</div>
        <p className="text-xs font-semibold" style={{ color: TEAL }}>
          {over ? "Drop the PDF here" : "Drop a PDF here, or click to choose one"}
        </p>
        <p className="text-[10px] mt-1" style={{ color: "#8AA4A7" }}>PDF only · up to {maxMb} MB</p>
        <input ref={input} type="file" accept="application/pdf,.pdf" className="hidden"
          onChange={(e) => onPick(e.target.files?.[0])} />
      </div>

      {picked && (
        <div className="flex items-center gap-2 px-3 py-2 rounded-xl border text-[11px]"
          style={{ background: "#E8F6F6", borderColor: "#9CCBCB", color: TEAL }}>
          <span className="min-w-0 flex-1 truncate">📄 {picked.name} · {prettySize(picked.size)}</span>
          <span className="shrink-0 text-[#5A7A7E]">uploads when you save</span>
          <button type="button" onClick={onClearPicked}
            className="text-[#8AA4A7] hover:text-red-500 shrink-0" title="Remove">✕</button>
        </div>
      )}

      {saved && picked && (
        <p className="text-[10px]" style={{ color: GOLD_DEEP }}>
          This replaces the file already attached ({saved.name}).
        </p>
      )}
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
          <button key={o} type="button" aria-pressed={active} onClick={() => onToggle(o)}
            className="px-3 py-1.5 rounded-full text-xs border transition-colors hover:border-[#9CCBCB]"
            style={active ? { ...on, fontWeight: 600 } : { background: "#fff", color: "#0A3A3E", borderColor: BORDER }}>
            {active && <span className="mr-1">✓</span>}
            {o}
          </button>
        );
      })}
    </div>
  );
}
