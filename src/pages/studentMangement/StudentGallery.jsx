import { useState, useEffect, useCallback, useRef } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { get } from "../../api/axios";
import StaffGallery from "../hr/StaffGallery";

/**
 * Student Gallery — the photo album, found by child.
 *
 * The gallery itself lives on a student's profile. This screen exists because
 * the way people actually work is the other way round: they have a photograph
 * of a child in hand and need to put it on that child's record. So the search
 * box is the page, and the album of whoever is picked opens underneath it.
 *
 * The picker is served by /student-gallery/search/students rather than the
 * student register endpoint, because holding a child's album is not the same
 * grant as holding the whole register — the search answers to
 * `student-gallery.view` and nothing more.
 *
 * The upload box, the rich-text description and the tiles are the gallery
 * component from the staff profile, given the student subject. One screen for
 * both, so the two cannot drift apart.
 */

const SEARCH_URL = "/student-gallery/search/students";
// The class filter comes from the gallery's own endpoint, not from
// /class-management/classes: that one asks for `classes.view`, which the roles
// keeping a child's album do not necessarily hold.
const CLASS_URL = "/student-gallery/search/classes";

const Initials = ({ name, photoUrl }) => {
  const parts = (name || "?").trim().split(/\s+/).slice(0, 2);
  if (photoUrl) {
    return (
      <img src={photoUrl} alt={name || ""} className="w-8 h-8 shrink-0 rounded-full object-cover border border-teal-100"
        onError={(e) => { e.currentTarget.style.display = "none"; }} />
    );
  }
  return (
    <span className="w-8 h-8 shrink-0 rounded-full bg-teal-50 text-teal-700 border border-teal-100
                     flex items-center justify-center text-[11px] font-bold">
      {parts.map((p) => p[0]).join("")}
    </span>
  );
};

/* The child's own frames, separate from everyone else's: the first four
   pictures of THIS album, so the list is picked by sight. A Drive link that
   points at a folder or a page has no thumbnail, and is simply left out. */
const Frames = ({ student }) => {
  const shots = (student.photos || []).filter((p) => p.url);
  if (!shots.length) {
    return <span className="text-[10px] text-gray-300 italic">No photos yet</span>;
  }
  return (
    <span className="flex items-center gap-1">
      {shots.map((p) => (
        <span key={p.id} className="relative w-9 h-9 rounded-lg overflow-hidden border border-gray-100 bg-gray-50">
          <img src={p.url} alt={p.caption || ""} className="w-full h-full object-cover"
            onError={(e) => { e.currentTarget.style.display = "none"; }} />
          {p.media_type === "video" && (
            <span className="absolute inset-0 flex items-center justify-center bg-black/35 text-white text-[9px]">▶</span>
          )}
        </span>
      ))}
      {student.gallery_count > shots.length && (
        <span className="text-[10px] font-bold text-teal-700">+{student.gallery_count - shots.length}</span>
      )}
    </span>
  );
};

export default function StudentGallery() {
  const [params, setParams] = useSearchParams();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [denied, setDenied] = useState(false);
  const [picked, setPicked] = useState(null);   // { id, full_name, class_name }
  const [classes, setClasses] = useState([]);
  const [classId, setClassId] = useState(params.get("class") ? Number(params.get("class")) : "");
  const timer = useRef(null);
  const abort = useRef(0);

  // A student id in the URL keeps the screen shareable and survives a reload.
  const selectedId = params.get("student") ? Number(params.get("student")) : null;

  useEffect(() => {
    get(CLASS_URL)
      .then((r) => setClasses(r.data?.data || []))
      .catch(() => { /* the filter stays empty; the search still works */ });
  }, []);

  const search = useCallback((term) => {
    const token = ++abort.current;
    setSearching(true);
    const p = { query: term || "" };
    if (classId) p.school_class_id = classId;
    get(SEARCH_URL, { params: p })
      .then((r) => {
        if (token !== abort.current) return;      // a stale answer arrived late
        setResults(r.data?.data || []);
        setDenied(false);
      })
      .catch((err) => {
        if (token !== abort.current) return;
        if (err.response?.status === 403) setDenied(true);
        setResults([]);
      })
      .finally(() => { if (token === abort.current) setSearching(false); });
  }, [classId]);

  useEffect(() => {
    clearTimeout(timer.current);
    timer.current = setTimeout(() => search(query), 300);
    return () => clearTimeout(timer.current);
  }, [query, classId, search]);

  const choose = (student) => {
    setPicked(student);
    const next = { student: String(student.id) };
    if (classId) next.class = String(classId);
    setParams(next, { replace: true });
  };

  const pickClass = (value) => {
    setClassId(value ? Number(value) : "");
    const next = value ? { class: String(value) } : {};
    if (picked) next.student = String(picked.id);
    setParams(next, { replace: true });
  };

  useEffect(() => {
    if (!selectedId || picked?.id === selectedId) return;
    // The id came from the URL, so ask for that one child by id — a name
    // search would only find them if they happened to be in the first page.
    get(SEARCH_URL, { params: { only: selectedId } })
      .then((r) => {
        const found = (r.data?.data || [])[0];
        if (found) setPicked(found);
      })
      .catch(() => { /* the gallery below reports its own errors */ });
  }, [selectedId, picked]);

  return (
    <div className="px-4 py-4 max-w-6xl mx-auto">
      <div className="mb-4">
        <h2 className="text-base font-bold text-gray-800">Student Gallery</h2>
        <p className="text-xs text-gray-500">Photographs and short clips of a child's time at school. Find the student, then add their photos with a caption and a description.</p>
      </div>

      {denied && (
        <div className="mb-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-xs text-amber-800">You do not have permission to open a student gallery. Ask for the “Student gallery” permission.</div>
      )}

      <div className="grid lg:grid-cols-[20rem_1fr] gap-4 items-start">
        {/* ── the picker ─────────────────────────────────────────────── */}
        <div className="rounded-2xl border bg-white p-3" style={{ borderColor: "#D0E0E0" }}>
          <input value={query} onChange={(e) => setQuery(e.target.value)}
            placeholder="Search a student by name or ID…"
            dir="auto" autoFocus
            className="w-full px-3 py-2 border rounded-xl text-xs bg-white focus:ring-2 focus:ring-[#9CCBCB] focus:outline-none"
            style={{ borderColor: "#D0E0E0" }} />

          {/* A class lists that class. Chosen for its own sake — the person
              filing a day's photographs works through one class at a time. */}
          <select value={classId || ""} onChange={(e) => pickClass(e.target.value)}
            className="w-full mt-2 px-3 py-2 border rounded-xl text-xs bg-white text-gray-700
                       focus:ring-2 focus:ring-[#9CCBCB] focus:outline-none"
            style={{ borderColor: "#D0E0E0" }}>
            <option value="">All classes</option>
            {classes.map((c) => (
              <option key={c.id} value={c.id}>{c.class_name}</option>
            ))}
          </select>

          <p className="text-[10px] text-gray-400 mt-1.5">
            {searching ? "Searching…" : `${results.length} student${results.length === 1 ? "" : "s"}`}
          </p>

          <div className="mt-2 max-h-[62vh] overflow-y-auto space-y-1.5">
            {results.length === 0 && !searching && (
              <p className="text-xs text-gray-400 py-4 text-center">No student matches that name.</p>
            )}
            {results.map((s) => (
              <button key={s.id} type="button" onClick={() => choose(s)}
                className={`w-full rounded-xl border px-2 py-2 text-start hover:bg-teal-50 transition-colors ${
                  picked?.id === s.id ? "bg-teal-50 border-teal-200" : "border-gray-100"
                }`}>
                <span className="flex items-center gap-2">
                  <Initials name={s.full_name} photoUrl={s.photo_url} />
                  <span className="min-w-0 flex-1">
                    <bdi dir="auto" className="block text-xs font-semibold text-gray-800 truncate">{s.full_name}</bdi>
                    <span className="block text-[10px] text-gray-500 truncate">
                      {[s.class_name, s.student_id].filter(Boolean).join(" · ")}
                    </span>
                  </span>
                </span>
                <span className="block mt-1.5 pl-10">
                  <Frames student={s} />
                </span>
              </button>
            ))}
          </div>
        </div>

        {/* ── the album ──────────────────────────────────────────────── */}
        <div className="rounded-2xl border bg-white p-4" style={{ borderColor: "#D0E0E0" }}>
          {!picked ? (
            <div className="flex flex-col items-center justify-center text-center py-16">
              <span className="text-3xl">🖼️</span>
              <p className="text-sm font-semibold text-gray-700 mt-3">Choose a student</p>
              <p className="text-xs text-gray-500 mt-1 max-w-xs">Search or choose a class on the left, then click a name to open that child's gallery.</p>
            </div>
          ) : (
            <>
              <div className="flex items-start justify-between gap-3 pb-3 mb-3 border-b" style={{ borderColor: "#EEF4F4" }}>
                <div className="flex items-center gap-2 min-w-0">
                  <Initials name={picked.full_name} photoUrl={picked.photo_url} />
                  <div className="min-w-0">
                    <bdi dir="auto" className="block text-sm font-bold text-gray-800 truncate">{picked.full_name}</bdi>
                    <span className="block text-[11px] text-gray-500 truncate">
                      {[picked.class_name, picked.student_id].filter(Boolean).join(" · ")}
                    </span>
                  </div>
                </div>
                <Link to={`/student-management/students/profile/${picked.id}?tab=gallery`}
                  className="shrink-0 px-3 py-1.5 rounded-xl text-[11px] font-semibold text-teal-700 bg-teal-50 hover:bg-teal-100 border border-teal-100">
                  Open profile →
                </Link>
              </div>

              {/* key: one component instance per child, so switching students
                  cannot leave the previous album on screen mid-fetch. */}
              <StaffGallery key={picked.id} subject="student" subjectId={picked.id}
                subjectName={picked.full_name} />
            </>
          )}
        </div>
      </div>
    </div>
  );
}
