import { useState, useEffect, useCallback, useRef } from "react";
import { get, post, put, del, peekCache } from "../../api/axios";
import ObservationDetailModal from "../../components/education/ObservationDetailModal";
import Swal from "sweetalert2";
import { enqueue, flush, pendingCount, watchConnection } from "../../utils/offlineQueue";
import { draftKey, readDraft, writeDraft, clearDraft } from "../../utils/formDraft";
import { useAuth } from "../../admin/context/AuthContext";

/* ── Brand tokens ── */
const TEAL = "#0D5C63", TEAL_LT = "#14919B", GOLD = "#C9A227", PAPER = "#F4F8F8";

const DIMENSIONS = [
  { key: "intellectual", label: "Intellectual", hint: "learning · thinking", color: "#14919B" },
  { key: "character", label: "Character", hint: "ethics · self-control", color: "#C9A227" },
  { key: "social", label: "Social", hint: "relating · cooperation", color: "#C2607A" },
  { key: "practical", label: "Practical", hint: "skill · completion", color: "#2E7D5B" },
];
const DIMAP = Object.fromEntries(DIMENSIONS.map((d) => [d.key, d]));
const CATEGORIES = [
  { key: "positive", label: "Positive", emoji: "⭐", hint: "recognition candidate", bg: "#e6f3ec", fg: "#2E7D5B" },
  { key: "routine", label: "Routine", emoji: "📝", hint: "neither good nor bad", bg: "#eef3f3", fg: "#5d7273" },
  { key: "concern", label: "Concerning", emoji: "⚠️", hint: "follow up", bg: "#fbf0db", fg: "#9a6a12" },
  { key: "urgent", label: "Urgent", emoji: "🚨", hint: "same-day action", bg: "#f7e3e1", fg: "#C0473F" },
];
const CATMAP = Object.fromEntries(CATEGORIES.map((c) => [c.key, c]));

const emptyDim = { category: "positive", description: "", is_usual: "", change_vs_before: "", alternative_interpretation: "", urgency_reason: "", monitoring_flag: false };
const blankForms = () => Object.fromEntries(DIMENSIONS.map((d) => [d.key, { ...emptyDim }]));
const needsChange = (c) => ["positive", "concern", "urgent"].includes(c);
const isNegative = (c) => ["concern", "urgent"].includes(c);
const initials = (n) => (n || "?").split(" ").map((w) => w[0]).slice(0, 2).join("").toUpperCase();

/**
 * How many observations this student already has.
 *
 * Zero is deliberately still shown, in muted grey rather than hidden — an
 * absent badge would be read as "no data loaded", while a visible 0 is the
 * answer the teacher is looking for: this child has not been observed yet.
 *
 * Module scope, not inside the page component: a component declared during
 * render is a new type on every render, so React unmounts and remounts it each
 * time instead of updating it.
 */
function ObsCount({ total, week }) {
  const n = Number(total) || 0;
  return (
    <span
      className="px-1.5 py-0.5 rounded-full text-[9px] font-black leading-none flex-shrink-0 whitespace-nowrap"
      style={n > 0 ? { background: "#E8F6F6", color: TEAL } : { background: "#F1F4F4", color: "#9aa8a8" }}
      title={`${n} observation${n === 1 ? "" : "s"} recorded${week ? ` · ${week} in the last 7 days` : ""}`}
    >
      {n} obs
    </span>
  );
}

export default function DailyObservation() {
  const [classes, setClasses] = useState([]);
  /* Leadership sees the school through one teacher at a time.
   *
   * The class list used to be flat: a teacher got the classes they teach, and
   * leadership got EVERY class with no indication of who teaches what — no way
   * to answer "show me her classes and her students". Picking a teacher now
   * narrows the classes to the ones they are actually scheduled to teach a
   * subject in, and names the subject. "All classes" is still there for anyone
   * who wants the whole school.
   */
  const [teachers, setTeachers] = useState([]);
  const [isLeadership, setIsLeadership] = useState(false);
  const [teacherId, setTeacherId] = useState("");   // "" = every class

  const [activeClass, setActiveClass] = useState(null);
  const [roster, setRoster] = useState([]);
  const [loadingClasses, setLoadingClasses] = useState(true);
  const [loadingRoster, setLoadingRoster] = useState(false);
  const [query, setQuery] = useState("");

  const [selected, setSelected] = useState(null);     // student row
  const [history, setHistory] = useState([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [fromDate, setFromDate] = useState("");       // history date filter — start
  const [toDate, setToDate] = useState("");           // history date filter — end

  const [adding, setAdding] = useState(false);
  /* An observation being corrected rather than written. The API has always
   * allowed it (own record, 24h window; leadership any time) — the button was
   * simply never on screen, so a typo meant living with it. */
  const [editing, setEditing] = useState(null);

  /* Connectivity. A dropped connection must cost nobody their typing:
   * every keystroke is mirrored locally, and a submit that cannot reach the
   * server is HELD rather than lost, then sent the moment the browser is back. */
  const [online, setOnline] = useState(navigator.onLine !== false);
  const [queued, setQueued] = useState(pendingCount());
  const [forms, setForms] = useState(blankForms());
  const [activeDim, setActiveDim] = useState("intellectual");
  const [saving, setSaving] = useState(false);

  /* Optional photo evidence for the evaluation being written. One set per
   * submit, not per dimension — a photo is of the moment, not of one of the
   * four columns it gets filed under. */
  const [photos, setPhotos] = useState([]);
  const photoInputRef = useRef(null);

  /* The observation opened in the detail modal, and what this user may do in
   * the section. `can` comes from the server so a button never appears for
   * something the endpoint will refuse. */
  const [detail, setDetail] = useState(null);
  const [detailBusy, setDetailBusy] = useState(false);
  const [can, setCan] = useState(null);
  const [emptyReason, setEmptyReason] = useState(null);

  useEffect(() => {
    const __cached = peekCache("/student-observations/my-classes");
    if (__cached) { const l = __cached?.data || []; setClasses(l); if (l.length) setActiveClass(l[0].id); setLoadingClasses(false); }
    get("/student-observations/my-classes")
      .then((r) => {
        const l = r.data?.data || [];
        setClasses(l);
        if (l.length) setActiveClass(l[0].id);
        // Why the list is empty, so the screen can explain itself instead of
        // looking broken to somebody who was just granted access.
        setCan(r.data?.can || null);
        setEmptyReason(l.length ? null : r.data?.empty_reason || null);
      })
      .catch(() => setClasses([]))
      .finally(() => setLoadingClasses(false));

    /* Whether this user is leadership is decided by ASKING, not by a flag on
     * another response.
     *
     * my-classes is a cached GET, so a body stored before the flag existed
     * comes back without it and the teacher picker would never appear — the
     * user would have to clear their cache to see a feature they have access
     * to. The endpoint already refuses non-leadership with a 403, so calling
     * it is the check: 200 means leadership, anything else means no picker.
     */
    get("/student-observations/teachers")
      .then((t) => { setTeachers(t.data?.data || []); setIsLeadership(true); })
      .catch(() => { setTeachers([]); setIsLeadership(false); });
  }, []);

  /* Which classes the dropdown offers: one teacher's, or all of them. */
  const activeTeacher = teacherId ? teachers.find((t) => String(t.id) === String(teacherId)) : null;
  const shownClasses = activeTeacher ? activeTeacher.classes : classes;
  const activeClassLink = activeTeacher?.classes.find((c) => c.id === activeClass);

  const pickTeacher = (id) => {
    setTeacherId(id);
    setSelected(null);
    const next = id ? (teachers.find((t) => String(t.id) === String(id))?.classes || []) : classes;
    // Land on a class the new selection actually contains, rather than leaving
    // the roster showing a class this teacher does not teach.
    setActiveClass(next.length ? next[0].id : null);
    if (!next.length) setRoster([]);
  };

  const { user } = useAuth();
  const draftId = selected ? draftKey("observation", user?.id, selected.id) : null;

  /* Send anything the outbox is holding. Called on mount, whenever the browser
   * says it is back online, and right after a successful save (a save proves
   * the connection is up again more reliably than navigator.onLine does). */
  const drainOutbox = useCallback(async () => {
    if (!pendingCount()) { setQueued(0); return; }
    const r = await flush((item) => post(item.url, item.body));
    setQueued(r.remaining);
    if (r.sent) {
      Swal.fire({
        icon: "success", toast: true, position: "top-end", timer: 2600, showConfirmButton: false,
        title: `${r.sent} saved observation${r.sent === 1 ? "" : "s"} synced`,
      });
      if (selected) loadHistoryRef.current?.(selected.id);
    }
    // Anything the server itself refused is reported once, then dropped —
    // retrying a 422 on every reconnect would be noise the user cannot act on.
    r.failed.forEach(({ item, error }) => {
      Swal.fire("Could not sync", `${item.label || "An observation"} was rejected: `
        + (error?.response?.data?.message || "the server refused it."), "error");
    });
  }, [selected]);

  // loadHistory is defined below; a ref keeps drainOutbox from depending on it.
  const loadHistoryRef = useRef(null);

  useEffect(() => {
    const stop = watchConnection((up) => {
      setOnline(up);
      if (up) drainOutbox();
    });
    return stop;
  }, [drainOutbox]);

  const loadRoster = useCallback(() => {
    if (!activeClass) return;
    setLoadingRoster(true);
    const __cached = peekCache(`/student-observations/roster?class_id=${activeClass}`);
    if (__cached) { setRoster(__cached?.data || []); setLoadingRoster(false); }
    get(`/student-observations/roster?class_id=${activeClass}`)
      .then((r) => setRoster(r.data?.data || []))
      .catch(() => setRoster([]))
      .finally(() => setLoadingRoster(false));
  }, [activeClass]);
  useEffect(() => { loadRoster(); }, [loadRoster]);

  const loadHistory = useCallback((sid, from = fromDate, to = toDate) => {
    setLoadingHistory(true);
    const p = new URLSearchParams({ student_id: sid });
    if (from) p.append("from", from);
    if (to) p.append("to", to);
    const __cached = peekCache(`/student-observations?${p.toString()}`);
    if (__cached) { setHistory(__cached?.data || []); setLoadingHistory(false); }
    get(`/student-observations?${p.toString()}`)
      .then((r) => setHistory(r.data?.data || []))
      .catch(() => setHistory([]))
      .finally(() => setLoadingHistory(false));
  }, [fromDate, toDate]);

  useEffect(() => { loadHistoryRef.current = loadHistory; }, [loadHistory]);

  /* Mirror the in-progress form locally, so a refresh, a crash or a closed tab
   * does not cost the user what they had written. Cleared once it is saved. */
  useEffect(() => {
    if (!draftId || !adding) return;
    const t = setTimeout(() => {
      if (DIMENSIONS.some((d) => forms[d.key].description.trim())) writeDraft(draftId, forms);
    }, 600);
    return () => clearTimeout(t);
  }, [forms, draftId, adding]);

  // Selecting a student clears any active date filter and reloads a clean history.
  const pick = (s) => {
    setSelected(s); setForms(blankForms()); setActiveDim("intellectual");
    setAdding(false); setEditing(null); setFromDate(""); setToDate(""); setPhotos([]);
    loadHistory(s.id, "", "");
    // Unfinished writing for THIS student, kept from a previous visit.
    const d = readDraft(draftKey("observation", user?.id, s.id));
    if (d?.data) {
      setForms({ ...blankForms(), ...d.data });
      setAdding(true);
      Swal.fire({
        icon: "info", toast: true, position: "top-end", timer: 3200, showConfirmButton: false,
        title: "Restored what you had written",
      });
    }
  };

  /** Load one existing observation back into the form to be corrected. */
  const startEdit = (o) => {
    setEditing(o);
    setAdding(true);
    setActiveDim(o.dimension);
    setForms({
      ...blankForms(),
      [o.dimension]: {
        category: o.category || "routine",
        description: o.description || "",
        is_usual: o.is_usual || "",
        change_vs_before: o.change_vs_before || "",
        alternative_interpretation: o.alternative_interpretation || "",
        urgency_reason: o.urgency_reason || "",
        recommendation: o.recommendation || "",
        monitoring_flag: Boolean(o.monitoring_flag),
      },
    });
  };

  const cancelForm = () => {
    setAdding(false); setEditing(null); setForms(blankForms()); setActiveDim("intellectual");
    setPhotos([]);
    if (photoInputRef.current) photoInputRef.current.value = "";
    if (draftId) clearDraft(draftId);
  };

  /* Photos queued for the next submit. Capped and validated here as well as on
   * the server, so an oversized file is refused before the upload starts. */
  const MAX_PHOTOS = 4;
  const MAX_PHOTO_MB = 8;
  const queuePhotos = (fileList) => {
    const picked = Array.from(fileList || []);
    const tooBig = picked.filter((f) => f.size > MAX_PHOTO_MB * 1024 * 1024);
    if (tooBig.length) {
      Swal.fire("Photo too large", `Each photo must be under ${MAX_PHOTO_MB} MB.`, "warning");
    }
    const ok = picked.filter((f) => f.size <= MAX_PHOTO_MB * 1024 * 1024);
    setPhotos((prev) => {
      const next = [...prev, ...ok].slice(0, MAX_PHOTOS);
      if (prev.length + ok.length > MAX_PHOTOS) {
        Swal.fire("Too many photos", `Up to ${MAX_PHOTOS} photos per evaluation.`, "info");
      }
      return next;
    });
    if (photoInputRef.current) photoInputRef.current.value = "";
  };
  const removePhoto = (i) => setPhotos((p) => p.filter((_, idx) => idx !== i));

  /** Open the full record. The list row carries a summary; this fetches the rest. */
  const openDetail = async (o) => {
    setDetail({ ...o, loading: true });
    try {
      const r = await get(`/student-observations/${o.id}`, { cache: false });
      setDetail(r.data?.data || o);
    } catch {
      // Fall back to what the row already has rather than an empty modal.
      setDetail({ ...o, loading: false });
    }
  };

  const removeObservation = async (o) => {
    const ok = await Swal.fire({
      title: "Delete this observation?",
      text: "It is removed from the student's timeline. This cannot be undone from here.",
      icon: "warning", showCancelButton: true, confirmButtonColor: "#dc2626",
      confirmButtonText: "Delete",
    });
    if (!ok.isConfirmed) return;
    setDetailBusy(true);
    try {
      await del(`/student-observations/${o.id}`);
      setDetail(null);
      if (selected) loadHistory(selected.id, fromDate, toDate);
      Swal.fire({ icon: "success", title: "Deleted", timer: 1200, showConfirmButton: false, toast: true, position: "top-end" });
    } catch (e) {
      Swal.fire("Error", e.response?.data?.message || "Could not delete.", "error");
    } finally { setDetailBusy(false); }
  };
  const clearDates = () => { setFromDate(""); setToDate(""); if (selected) loadHistory(selected.id, "", ""); };

  const cur = forms[activeDim];
  const setCur = (patch) => setForms((f) => ({ ...f, [activeDim]: { ...f[activeDim], ...patch } }));
  const filledDims = DIMENSIONS.filter((d) => forms[d.key].description.trim());

  const submit = async () => {
    const entries = DIMENSIONS.map((d) => ({ dimension: d.key, ...forms[d.key] })).filter((e) => e.description.trim());
    if (!entries.length) { Swal.fire("Nothing to save", "Write at least one observation.", "warning"); return; }
    for (const e of entries) {
      if (needsChange(e.category) && !e.change_vs_before) { setActiveDim(e.dimension); Swal.fire("Missing", `Pick the change for the ${e.dimension} note.`, "warning"); return; }
      if (isNegative(e.category) && !e.alternative_interpretation.trim()) { setActiveDim(e.dimension); Swal.fire("Bias check", `Add another interpretation for the ${e.dimension} concern.`, "warning"); return; }
      if (e.category === "urgent" && !e.urgency_reason.trim()) { setActiveDim(e.dimension); Swal.fire("Missing", `Give the urgency reason for the ${e.dimension} note.`, "warning"); return; }
    }
    const observations = entries.map((e) => ({
      dimension: e.dimension, category: e.category, description: e.description.trim(), is_usual: e.is_usual || null,
      change_vs_before: e.change_vs_before || null, alternative_interpretation: e.alternative_interpretation || null,
      urgency_reason: e.urgency_reason || null, monitoring_flag: e.monitoring_flag,
    }));
    setSaving(true);

    /* Correcting an existing observation is a different verb on a different
     * URL, and only ever touches the one dimension being edited. */
    if (editing) {
      const e = entries.find((x) => x.dimension === editing.dimension) || entries[0];
      try {
        await put(`/student-observations/${editing.id}`, {
          category: e.category, dimension: e.dimension, description: e.description.trim(),
          is_usual: e.is_usual || null, change_vs_before: e.change_vs_before || null,
          alternative_interpretation: e.alternative_interpretation || null,
          urgency_reason: e.urgency_reason || null, recommendation: e.recommendation || null,
        });
        Swal.fire({ icon: "success", title: "Observation updated", timer: 1300, showConfirmButton: false, toast: true, position: "top-end" });
        cancelForm();
        loadHistory(selected.id);
      } catch (err) {
        Swal.fire("Error", err.response?.data?.message || Object.values(err.response?.data?.errors || {})[0]?.[0] || "Failed", "error");
      } finally { setSaving(false); }
      return;
    }

    const payload = { student_id: selected.id, observations };

    // Offline before we even try: hold it rather than fail in their face.
    if (!online) {
      if (photos.length) {
        // The offline queue holds JSON, not files. Say so rather than dropping
        // the photos silently on the way through.
        Swal.fire("Photos need a connection", "The notes will be held and sent when you are back online, but photos cannot be queued. Re-attach them afterwards.", "info");
      }
      holdForLater(payload, observations.length);
      setSaving(false);
      return;
    }

    try {
      /* With photos the same endpoint takes multipart. Nested arrays have to be
       * flattened into observations[0][field] keys — multipart has no notion of
       * a nested object, and Laravel reassembles exactly this shape. */
      let body = payload;
      let config;
      if (photos.length) {
        const fd = new FormData();
        fd.append("student_id", String(selected.id));
        observations.forEach((o, i) => {
          Object.entries(o).forEach(([k, v]) => {
            if (v === null || v === undefined || v === "") return;
            fd.append(`observations[${i}][${k}]`, typeof v === "boolean" ? (v ? "1" : "0") : v);
          });
        });
        photos.forEach((f) => fd.append("photos[]", f));
        body = fd;
        config = { headers: { "Content-Type": "multipart/form-data" }, timeout: 0 };
      }
      const r = await post("/student-observations/batch", body, config);
      Swal.fire({ icon: "success", title: r.data?.message || "Recorded", timer: 1300, showConfirmButton: false, toast: true, position: "top-end" });
      if (draftId) clearDraft(draftId);
      setForms(blankForms()); setActiveDim("intellectual"); setAdding(false); setEditing(null);
      setPhotos([]);
      if (photoInputRef.current) photoInputRef.current.value = "";
      const bump = (x) => ({
        ...x,
        seen_today: true,
        days_since: 0,
        total_count: x.total_count + observations.length,
        // Saved today, so it is inside the 7-day window by definition.
        week_count: (x.week_count || 0) + observations.length,
      });
      setRoster((p) => p.map((x) => (x.id === selected.id ? bump(x) : x)));
      setSelected(bump);
      loadHistory(selected.id);
      drainOutbox();   // the connection is evidently up — send anything held
    } catch (err) {
      // No response at all means the request never reached the server. That is
      // the connection, not the data: hold it and send it when we are back.
      if (!err.response) { holdForLater(payload, observations.length); return; }
      Swal.fire("Error", err.response?.data?.message || Object.values(err.response?.data?.errors || {})[0]?.[0] || "Failed", "error");
    } finally { setSaving(false); }
  };

  /**
   * Park a write in the outbox and tell the user plainly what happened.
   *
   * The roster is bumped as though it had saved, because from the teacher's
   * point of view it HAS been recorded — it is on the device and it is going to
   * be sent. Pretending otherwise would make them write it again.
   */
  const holdForLater = (payload, count) => {
    const ok = enqueue({
      url: "/student-observations/batch",
      body: payload,
      label: `Observation for ${selected.full_name}`,
    });
    if (!ok) {
      Swal.fire("Could not save offline", "This browser is refusing to store data, so the observation cannot be held until you are back online. Keep this page open and try again once the connection returns.", "error");
      return;
    }
    setQueued(pendingCount());
    if (draftId) clearDraft(draftId);
    setForms(blankForms()); setActiveDim("intellectual"); setAdding(false); setEditing(null);
    setRoster((prev) => prev.map((x) => (x.id === selected.id
      ? { ...x, seen_today: true, days_since: 0, total_count: x.total_count + count, week_count: (x.week_count || 0) + count }
      : x)));
    Swal.fire({
      icon: "info", toast: true, position: "top-end", timer: 4200, showConfirmButton: false,
      title: "Saved on this device",
      text: "You are offline — it will be sent automatically when the connection is back.",
    });
  };

  const badge = (s) => {
    if (s.seen_today) return { c: "#2E7D5B", bg: "#e6f3ec", label: "today" };
    if (s.days_since === null) return { c: "#9a6a12", bg: "#fbf0db", label: "never" };
    if (s.days_since >= 14) return { c: "#9a6a12", bg: "#fbf0db", label: `${s.days_since}d` };
    return { c: "#5d7273", bg: "#eef3f3", label: `${s.days_since}d` };
  };
  const seenToday = roster.filter((s) => s.seen_today).length;
  const filtered = query ? roster.filter((s) => `${s.full_name} ${s.father_name || ""}`.toLowerCase().includes(query.toLowerCase())) : roster;

  return (
    <div className="min-h-screen" style={{ background: PAPER }}>
      {/* Slim hero */}
      <div className="px-5 py-4" style={{ background: `linear-gradient(135deg, ${TEAL}, #063033)` }}>
        <p className="text-[10px] uppercase tracking-[0.2em]" style={{ color: GOLD }}>Education & Formation</p>
        <h1 className="text-base font-black text-white mt-0.5">Daily Observation</h1>
      </div>

      {/* Said plainly and only when it matters. A teacher who has just typed a
        * paragraph needs to know it is safe, not to discover later that it
        * never left the device. */}
      {(!online || queued > 0) && (
        <div className="px-5 py-2 flex items-center gap-2 text-[11px] font-semibold"
          style={online ? { background: "#E8F6F6", color: TEAL } : { background: "#fbf0db", color: "#9a6a12" }}>
          <span className="w-2 h-2 rounded-full" style={{ background: online ? TEAL : "#c9922b" }} />
          {!online && <span>You are offline — observations are saved on this device and sent automatically when the connection returns.</span>}
          {online && queued > 0 && (
            <>
              <span>{queued} observation{queued === 1 ? "" : "s"} waiting to sync.</span>
              <button onClick={drainOutbox} className="underline hover:no-underline">Sync now</button>
            </>
          )}
        </div>
      )}

      <div className="max-w-6xl mx-auto lg:grid lg:grid-cols-[320px_1fr] lg:gap-0 lg:items-stretch">
        {/* ── LEFT: classes + roster list ── */}
        <aside className={`border-r ${selected ? "hidden lg:block" : ""}`} style={{ borderColor: "#dbe8e8", background: "#fff" }}>
          <div className="p-3 border-b" style={{ borderColor: "#eef4f4" }}>
            {isLeadership && (
              <select value={teacherId} onChange={(e) => pickTeacher(e.target.value)}
                className="w-full px-3 py-2 rounded-xl text-xs font-bold bg-white border focus:outline-none mb-2"
                style={{ borderColor: "#dbe8e8", color: TEAL }}>
                <option value="">All classes ({classes.length})</option>
                {teachers.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name} — {t.class_count} class{t.class_count === 1 ? "" : "es"} · {t.student_count} student{t.student_count === 1 ? "" : "s"}
                  </option>
                ))}
              </select>
            )}

            {loadingClasses ? null : shownClasses.length === 0 ? (
              /* An empty list is an answer, and which answer it is matters.
               * "I gave someone access and they see nothing" is almost always
               * a person with the permission who teaches no class — saying so
               * turns a screen that looks broken into one that explains
               * itself. */
              <div className="rounded-xl p-3 mb-2" style={{ background: "#fbf7ec", border: "1px solid #ecd9a8" }}>
                <p className="text-[11px] font-bold" style={{ color: "#9a6a12" }}>
                  {activeTeacher
                    ? `${activeTeacher.name} has no class yet`
                    : emptyReason === "no_permission"
                      ? "You do not have access to observations"
                      : "No classes to show"}
                </p>
                <p className="text-[10px] mt-1 leading-relaxed" style={{ color: "#7a5410" }}>
                  {activeTeacher
                    ? "Nobody has been given a subject to teach in one of their classes yet."
                    : emptyReason === "no_permission"
                      ? "Ask an administrator for the “student-observations.view” permission."
                      : emptyReason === "teacher_without_classes"
                        ? "You have access to this section, but you are not linked to any class yet — no homeroom, subject or timetable entry. Once a class is assigned to you, its students appear here."
                        : emptyReason === "not_a_teacher"
                          ? "You have access to this section, but observations are scoped to the classes you teach and your account is not linked to a teacher record. Ask an administrator for the “student-observations.manage” permission to see every class."
                          : "There is nothing to show here yet."}
                </p>
              </div>
            ) : (
              <select value={activeClass || ""} onChange={(e) => { setActiveClass(Number(e.target.value)); setSelected(null); }}
                className="w-full px-3 py-2 rounded-xl text-xs font-bold bg-white border focus:outline-none mb-2" style={{ borderColor: "#dbe8e8", color: TEAL }}>
                {shownClasses.map((c) => <option key={c.id} value={c.id}>{c.class_name} ({c.student_count})</option>)}
              </select>
            )}

            {/* What the teacher actually teaches in this class — the reason
              * these students are on screen, so it is worth saying. */}
            {activeClassLink && (
              <p className="text-[10px] mb-2 px-1" style={{ color: "#5d7273" }}>
                {activeClassLink.subjects.length
                  ? <>Teaches <span className="font-bold" style={{ color: TEAL }}>{activeClassLink.subjects.join(", ")}</span> here</>
                  : <>{activeClassLink.sources.includes("supervisor") ? "Class supervisor" : activeClassLink.sources.includes("assistant") ? "Class assistant" : "Assigned to this class"}</>}
              </p>
            )}
            <div className="relative">
              <svg className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
              <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search student…"
                className="w-full pl-9 pr-3 py-2 rounded-xl text-xs bg-white border focus:outline-none" style={{ borderColor: "#dbe8e8" }} />
            </div>
            {roster.length > 0 && (
              <div className="mt-2 flex items-center gap-2">
                <div className="flex-1 h-1.5 rounded-full overflow-hidden" style={{ background: "#E8F6F6" }}>
                  <div className="h-full rounded-full" style={{ width: `${Math.round((seenToday / roster.length) * 100)}%`, background: `linear-gradient(90deg, ${TEAL}, ${TEAL_LT})` }} />
                </div>
                <span className="text-[10px] font-bold text-gray-500">{seenToday}/{roster.length} today</span>
              </div>
            )}
          </div>

          <div className="overflow-y-auto" style={{ maxHeight: "calc(100vh - 200px)" }}>
            {loadingRoster ? <Spinner /> : filtered.length === 0 ? <p className="p-6 text-center text-xs text-gray-400">No students.</p> : filtered.map((s) => {
              const b = badge(s); const on = selected?.id === s.id;
              return (
                <button key={s.id} onClick={() => pick(s)} className="w-full flex items-center gap-3 px-3 py-2.5 text-left transition-colors border-l-2"
                  style={on ? { background: "#E8F6F6", borderColor: TEAL } : { background: "transparent", borderColor: "transparent" }}>
                  <div className="w-9 h-9 rounded-lg flex items-center justify-center text-[11px] font-black text-white flex-shrink-0" style={{ background: `linear-gradient(140deg, ${TEAL_LT}, ${TEAL})` }}>{initials(s.full_name)}</div>
                  <div className="min-w-0 flex-1">
                    {/* The tally rides ALONGSIDE the name, not on a line of its
                        own below it — how many observations a student already
                        has is the thing being scanned for, and as grey text on
                        a third line it read as a footnote and got missed.
                        `bdi` isolates the RTL name so the LTR count pill cannot
                        be pulled to the wrong side of it. */}
                    <div className="flex items-center gap-1.5 min-w-0">
                      <bdi dir="auto" className="text-xs font-bold text-gray-800 truncate">{s.full_name}</bdi>
                      <ObsCount total={s.total_count} week={s.week_count} />
                    </div>
                    {s.father_name && <p className="text-[10px] text-gray-500 truncate">{s.gender === "female" ? "D/O" : "S/O"} {s.father_name}</p>}
                  </div>
                  <span className="px-1.5 py-0.5 rounded-full text-[9px] font-bold flex-shrink-0" style={{ background: b.bg, color: b.c }}>{b.label}</span>
                </button>
              );
            })}
          </div>
        </aside>

        {/* ── RIGHT: detail panel ── */}
        <main className={`${selected ? "" : "hidden lg:block"} min-h-[calc(100vh-120px)]`}>
          {!selected ? (
            <div className="h-full flex flex-col items-center justify-center text-center p-10" style={{ minHeight: "60vh" }}>
              <div className="w-14 h-14 rounded-2xl flex items-center justify-center mb-3" style={{ background: "#E8F6F6", color: TEAL }}>
                <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M2.5 12C3.7 7.9 7.5 5 12 5s8.3 2.9 9.5 7c-1.2 4.1-5 7-9.5 7s-8.3-2.9-9.5-7z" /></svg>
              </div>
              <p className="text-sm font-bold text-gray-600">Select a student</p>
              <p className="text-xs text-gray-400 mt-1">Pick someone on the left to see their observations and add a new one.</p>
            </div>
          ) : (
            <div>
              {/* Student header */}
              <div className="px-5 py-4 flex items-center gap-3 border-b bg-white" style={{ borderColor: "#eef4f4" }}>
                <button onClick={() => setSelected(null)} className="lg:hidden p-2 rounded-lg" style={{ background: "#E8F6F6", color: TEAL }}>
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" /></svg>
                </button>
                <div className="w-12 h-12 rounded-xl flex items-center justify-center text-sm font-black text-white flex-shrink-0" style={{ background: `linear-gradient(140deg, ${TEAL_LT}, ${TEAL})` }}>{initials(selected.full_name)}</div>
                <div className="flex-1 min-w-0">
                  <h2 className="text-sm font-black text-gray-800 truncate">{selected.full_name}</h2>
                  {selected.father_name && <p className="text-[11px] text-gray-500 truncate">{selected.gender === "female" ? "D/O" : "S/O"} {selected.father_name}</p>}
                  <p className="text-[11px] text-gray-400 flex items-center gap-1.5 flex-wrap">
                    <ObsCount total={selected.total_count} week={selected.week_count} />
                    <span>observation{selected.total_count === 1 ? "" : "s"} recorded · {selected.seen_today ? "seen today" : selected.days_since === null ? "never observed" : `last ${selected.days_since}d ago`}</span>
                  </p>
                </div>
                {!adding && <button onClick={() => { setEditing(null); setAdding(true); }} className="px-4 py-2 rounded-xl text-xs font-bold text-white" style={{ background: `linear-gradient(120deg, ${TEAL_LT}, ${TEAL})` }}>＋ Observe</button>}
              </div>

              <div className="p-5 space-y-5">
                {/* Snapshot — inline stats + dimension distribution */}
                {!loadingHistory && history.length > 0 && (() => {
                  const total = history.length;
                  const week = history.filter((o) => o.observed_on >= new Date(Date.now() - 7 * 864e5).toLocaleDateString("en-CA")).length;
                  const pos = history.filter((o) => o.category === "positive").length;
                  const conc = history.filter((o) => ["concern", "urgent"].includes(o.category)).length;
                  const ratio = conc ? `${(pos / conc).toFixed(1)}:1` : (pos ? `${pos}:0` : "—");
                  const byDim = DIMENSIONS.map((d) => ({ ...d, n: history.filter((o) => o.dimension === d.key).length }));
                  const tot = byDim.reduce((s, d) => s + d.n, 0) || 1;
                  return (
                    <div className="rounded-2xl p-4" style={{ background: "linear-gradient(135deg,#E8F6F6,#ffffff)" }}>
                      <div className="flex items-center gap-5">
                        {[["Total", total], ["This week", week], ["Recognition", ratio]].map(([l, v], i) => (
                          <div key={l} className={i ? "pl-5 border-l" : ""} style={{ borderColor: "#cfe4e4" }}>
                            <p className="text-xl font-black" style={{ color: TEAL, letterSpacing: "-.5px" }}>{v}</p>
                            <p className="text-[10px] font-semibold text-gray-500">{l}</p>
                          </div>
                        ))}
                      </div>
                      <div className="mt-3.5 h-2 rounded-full overflow-hidden flex" style={{ background: "#dbe8e8" }}>
                        {byDim.map((d) => d.n > 0 ? <div key={d.key} style={{ width: `${(d.n / tot) * 100}%`, background: d.color }} /> : null)}
                      </div>
                      <div className="mt-2 flex flex-wrap gap-x-3.5 gap-y-1">
                        {byDim.map((d) => (
                          <span key={d.key} className="text-[10px] flex items-center gap-1 font-semibold" style={{ color: d.n ? "#374151" : "#9ca3af" }}>
                            <span className="w-2 h-2 rounded-full" style={{ background: d.n ? d.color : "#d1d5db" }} /> {d.label} <b>{d.n}</b>
                          </span>
                        ))}
                      </div>
                    </div>
                  );
                })()}

                {/* Inline add form */}
                {adding && (
                  <div className="rounded-2xl border bg-white overflow-hidden" style={{ borderColor: "#dbe8e8" }}>
                    <div className="px-4 py-2.5 flex items-center justify-between border-b" style={{ borderColor: "#eef4f4", background: "#fafcfc" }}>
                      <p className="text-xs font-black" style={{ color: TEAL }}>New observation</p>
                      <button onClick={cancelForm} className="text-[11px] font-bold text-gray-400 hover:text-gray-600">Cancel</button>
                    </div>
                    <div className="p-4 space-y-4">
                      {/* dimension tabs */}
                      <div className="flex flex-wrap gap-2">
                        {DIMENSIONS.map((d) => {
                          const fd = forms[d.key]; const has = fd.description.trim();
                          const incomplete = has && isNegative(fd.category) && !fd.alternative_interpretation.trim();
                          const on = activeDim === d.key;
                          return (
                            <button key={d.key} onClick={() => setActiveDim(d.key)} title={d.hint}
                              className="relative px-3 py-1.5 rounded-lg text-[11px] font-bold border transition-all"
                              style={on ? { background: d.color, color: "#fff", borderColor: d.color } : { background: "#fff", color: "#6b7280", borderColor: "#e5e7eb" }}>
                              {d.label}
                              {has && <span className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full border-2 border-white" style={{ background: incomplete ? "#C0473F" : on ? "#fff" : "#2E7D5B" }} />}
                            </button>
                          );
                        })}
                      </div>

                      <div className="grid grid-cols-2 gap-2">
                        {CATEGORIES.map((c) => {
                          const on = cur.category === c.key;
                          return (
                            <button key={c.key} onClick={() => setCur({ category: c.key })} className="text-left px-3 py-2 rounded-xl border text-xs"
                              style={on ? { background: c.bg, borderColor: c.fg, color: c.fg } : { background: "#fff", borderColor: "#e5e7eb", color: "#374151" }}>
                              <span className="font-bold">{c.emoji} {c.label}</span>
                              <span className="block text-[10px] opacity-70">{c.hint}</span>
                            </button>
                          );
                        })}
                      </div>

                      <textarea value={cur.description} onChange={(e) => setCur({ description: e.target.value })} rows={3}
                        placeholder={`What you saw — ${DIMAP[activeDim].label}. Specific, not general. Leave blank to skip.`}
                        className="w-full px-3 py-2.5 border rounded-xl text-xs bg-white resize-none focus:outline-none" style={{ borderColor: "#dbe8e8" }} />

                      <div>
                        <Lbl>Is this usual for this student?</Lbl>
                        <Segmented value={cur.is_usual} onPick={(k) => setCur({ is_usual: cur.is_usual === k ? "" : k })} options={[["yes", "Yes, usual"], ["no", "No, it's new"], ["unknown", "I don't know"]]} />
                      </div>
                      {needsChange(cur.category) && (
                        <div><Lbl>Change vs. before *</Lbl>
                          <Segmented value={cur.change_vs_before} onPick={(k) => setCur({ change_vs_before: k })} options={[["better", "↑ Better"], ["stable", "= Stable"], ["decline", "↓ Decline"]]} /></div>
                      )}
                      {isNegative(cur.category) && (
                        <div className="rounded-xl border p-3 space-y-2" style={cur.description.trim() && !cur.alternative_interpretation.trim() ? { borderColor: "#e7bdb8", background: "#fdf2f0" } : { borderColor: "#ecd9a8", background: "#fbf7ec" }}>
                          <p className="text-[11px] font-bold" style={{ color: "#9a6a12" }}>Bias check — see first, judge second <span style={{ color: "#C0473F" }}>* required</span></p>
                          <textarea value={cur.alternative_interpretation} onChange={(e) => setCur({ alternative_interpretation: e.target.value })} rows={2}
                            placeholder="Could there be another interpretation? e.g. tired, family situation, I misread." className="w-full px-3 py-2 border rounded-lg text-xs bg-white resize-none focus:outline-none" style={{ borderColor: "#ecd9a8" }} />
                          {cur.category === "urgent" && (
                            <textarea value={cur.urgency_reason} onChange={(e) => setCur({ urgency_reason: e.target.value })} rows={2} placeholder="Why is this urgent?" className="w-full px-3 py-2 border rounded-lg text-xs bg-white resize-none focus:outline-none" style={{ borderColor: "#e7bdb8" }} />
                          )}
                          <label className="flex items-center gap-2 text-[11px] text-gray-700 cursor-pointer"><input type="checkbox" checked={cur.monitoring_flag} onChange={(e) => setCur({ monitoring_flag: e.target.checked })} /> Recommend placing under monitoring</label>
                        </div>
                      )}

                      {/* Optional photo evidence — attached to the evaluation as
                        * a whole, not to one of the four dimensions, because a
                        * photo is of the moment rather than of a column. */}
                      {!editing && (
                        <div className="w-full">
                          <div className="flex items-center justify-between gap-2 mb-1.5">
                            <Lbl>Photos (optional)</Lbl>
                            <span className="text-[10px] text-gray-400">up to 4 · 8 MB each</span>
                          </div>
                          <input ref={photoInputRef} type="file" accept="image/*" multiple capture="environment"
                            onChange={(e) => queuePhotos(e.target.files)}
                            className="w-full text-[11px] file:mr-3 file:px-3 file:py-1.5 file:rounded-lg file:border-0 file:bg-teal-50 file:text-teal-700 file:text-[11px] file:font-bold" />
                          {photos.length > 0 && (
                            <div className="mt-2 flex flex-wrap gap-2">
                              {photos.map((f, i) => (
                                <span key={`${f.name}-${i}`} className="inline-flex items-center gap-1.5 px-2 py-1 rounded-lg bg-gray-50 border border-gray-200">
                                  <span className="text-[10px] text-gray-600 max-w-[9rem] truncate" title={f.name}>{f.name}</span>
                                  <button type="button" onClick={() => removePhoto(i)} className="text-red-400 hover:text-red-600 text-[10px] font-bold">✕</button>
                                </span>
                              ))}
                            </div>
                          )}
                        </div>
                      )}

                      <div className="flex items-center justify-between pt-1">
                        <span className="text-[11px] text-gray-500">{filledDims.length} dimension{filledDims.length === 1 ? "" : "s"} ready</span>
                        <button onClick={submit} disabled={saving || !filledDims.length || (can && !can.create)}
                          title={can && !can.create ? "You do not have permission to record observations" : undefined} className="px-5 py-2 text-xs font-bold text-white rounded-xl disabled:opacity-50" style={{ background: `linear-gradient(120deg, ${TEAL_LT}, ${TEAL})` }}>{saving ? "Saving…" : editing ? "Save changes" : !online ? "Save on device" : `Record ${filledDims.length || ""}`.trim()}</button>
                      </div>
                    </div>
                  </div>
                )}

                {/* History timeline */}
                <div>
                  <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-gray-400">Observation history</p>
                    {/* Date-range filter */}
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <input type="date" value={fromDate} max={toDate || undefined}
                        onChange={(e) => { setFromDate(e.target.value); loadHistory(selected.id, e.target.value, toDate); }}
                        className="px-2 py-1 rounded-lg text-[11px] bg-white border focus:outline-none" style={{ borderColor: "#dbe8e8", color: TEAL }} />
                      <span className="text-[10px] text-gray-400">→</span>
                      <input type="date" value={toDate} min={fromDate || undefined}
                        onChange={(e) => { setToDate(e.target.value); loadHistory(selected.id, fromDate, e.target.value); }}
                        className="px-2 py-1 rounded-lg text-[11px] bg-white border focus:outline-none" style={{ borderColor: "#dbe8e8", color: TEAL }} />
                      {(fromDate || toDate) && (
                        <button onClick={clearDates} className="px-2 py-1 rounded-lg text-[10px] font-bold" style={{ background: "#E8F6F6", color: TEAL }}>Clear</button>
                      )}
                    </div>
                  </div>
                  {loadingHistory ? <Spinner /> : history.length === 0 ? (
                    <p className="text-xs text-gray-400 py-6 text-center">{fromDate || toDate ? "No observations in this date range." : "No observations yet for this student."}</p>
                  ) : (
                    <div className="relative pl-5" style={{ borderLeft: "2px solid #e7f1f1", marginLeft: "4px" }}>
                      {history.map((o) => {
                        const dim = DIMAP[o.dimension] || {}; const cat = CATMAP[o.category] || {};
                        return (
                          <div key={o.id} className="relative pb-5 last:pb-0 group">
                            <span className="absolute -left-[27px] top-1 w-3 h-3 rounded-full border-2 border-white" style={{ background: dim.color }} />
                            <div className="flex items-center justify-between gap-2 mb-1">
                              <div className="flex items-center gap-1.5 flex-wrap">
                                <span className="px-2 py-0.5 rounded-full text-[9px] font-bold" style={{ background: "#E8F6F6", color: TEAL }}>{dim.label || o.dimension}</span>
                                <span className="px-2 py-0.5 rounded-full text-[9px] font-bold" style={{ background: cat.bg, color: cat.fg }}>{cat.emoji} {cat.label || o.category}</span>
                                {o.monitoring_flag ? <span className="px-2 py-0.5 rounded-full text-[9px] font-bold" style={{ background: "#f7e3e1", color: "#C0473F" }}>🔎 monitoring</span> : null}
                              </div>
                              <span className="flex items-center gap-2 flex-shrink-0">
                                {/* `editable` comes from the server and mirrors
                                  * exactly what the update endpoint allows, so
                                  * the button is never a route to a 403. */}
                                {o.photo_count > 0 && (
                                  <span className="inline-flex items-center gap-0.5 text-[10px] font-bold" style={{ color: TEAL }} title={`${o.photo_count} photo${o.photo_count === 1 ? "" : "s"}`}>
                                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                                    {o.photo_count}
                                  </span>
                                )}
                                {o.editable && (
                                  <button onClick={(e) => { e.stopPropagation(); startEdit(o); }}
                                    className="text-[10px] font-bold underline hover:no-underline"
                                    style={{ color: TEAL }}>Edit</button>
                                )}
                                <span className="text-[10px] text-gray-400">{o.observed_on}</span>
                              </span>
                            </div>
                            {/* The whole note opens the full record — every
                              * bias-control field, the photos, and who wrote it. */}
                            <button type="button" onClick={() => openDetail(o)}
                              title="Open the full record"
                              className="text-left w-full rounded-lg -mx-1 px-1 py-0.5 hover:bg-gray-50 transition-colors">
                              <p className="text-xs text-gray-800 leading-relaxed">{o.description}</p>
                              <span className="text-[10px] font-bold opacity-0 group-hover:opacity-100 transition-opacity" style={{ color: TEAL }}>
                                View full record →
                              </span>
                            </button>
                            <div className="mt-1 flex flex-wrap gap-x-3 gap-y-0.5 text-[10px] text-gray-500">
                              {o.is_usual && <span>Usual: <b className="text-gray-700">{o.is_usual}</b></span>}
                              {o.change_vs_before && <span>Change: <b className="text-gray-700">{o.change_vs_before}</b></span>}
                              <span className="inline-flex items-center gap-1" style={{ color: TEAL }}>
                                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>
                                Observed by <b>{o.observer || "—"}</b>
                              </span>
                            </div>
                            {o.alternative_interpretation && <div className="mt-1.5 rounded-lg p-2 text-[11px]" style={{ background: "#fbf7ec", color: "#7a5410" }}><b>Alt:</b> {o.alternative_interpretation}</div>}
                            {o.recommendation && <div className="mt-1.5 rounded-lg p-2 text-[11px]" style={{ background: "#E8F6F6", color: TEAL }}><b>Recommendation:</b> {o.recommendation}</div>}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </main>
      </div>

      {/* The full record. Edit and Delete appear only when the server said this
        * user may run them, so a button is never a route to a 403. */}
      {detail && (
        <ObservationDetailModal
          observation={detail}
          busy={detailBusy}
          onClose={() => setDetail(null)}
          onEdit={(o) => { setDetail(null); startEdit(o); }}
          onDelete={removeObservation}
        />
      )}
    </div>
  );
}

const Lbl = ({ children }) => <label className="block text-[10px] font-bold uppercase tracking-wider text-gray-400 mb-2">{children}</label>;
const Spinner = () => <div className="flex justify-center py-12"><div className="w-7 h-7 border-2 rounded-full animate-spin" style={{ borderColor: "#cfe4e4", borderTopColor: TEAL }} /></div>;
function Segmented({ value, onPick, options }) {
  return (
    <div className="flex gap-2">
      {options.map(([k, lbl]) => (
        <button key={k} onClick={() => onPick(k)} className="flex-1 px-2 py-2 rounded-lg text-[11px] font-bold border transition-all"
          style={value === k ? { background: TEAL, color: "#fff", borderColor: TEAL } : { background: "#fff", color: "#6b7280", borderColor: "#e5e7eb" }}>{lbl}</button>
      ))}
    </div>
  );
}
