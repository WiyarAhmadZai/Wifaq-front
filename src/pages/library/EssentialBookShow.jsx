import { useState, useEffect, useCallback } from "react";
import { useNavigate, useParams } from "react-router-dom";
import Swal from "sweetalert2";
import { getBook, setBookStatus } from "../../api/essentialBooks";
import { useAuth } from "../../admin/context/AuthContext";
import { TEAL, GOLD_LT, GOLD_SOFT, GOLD_DEEP, BORDER, MUTED, describeError } from "../education/weeklyUi";

const Spinner = () => (
  <div className="flex justify-center py-16">
    <div className="w-7 h-7 border-2 rounded-full animate-spin" style={{ borderColor: "#CFE6E6", borderTopColor: TEAL }} />
  </div>
);

const STATUS = {
  submitted:   { label: "Submitted",    bg: "#F4F8F8", fg: TEAL,      border: BORDER },
  shortlisted: { label: "Shortlisted",  bg: GOLD_LT,   fg: GOLD_DEEP, border: GOLD_SOFT },
  selected:    { label: "Selected",     bg: "#E6F3EC", fg: "#2E7D5B", border: "#B7DCC8" },
  rejected:    { label: "Not selected", bg: "#FAEAEF", fg: "#B0546E", border: "#EFCBD6" },
};

const LIVING = { yes: "Living", no: "Deceased", unsure: "Not sure" };

const prettySize = (b) => (!b ? "" : b / 1048576 >= 1 ? `${(b / 1048576).toFixed(1)} MB` : `${Math.round(b / 1024)} KB`);

/**
 * One recommendation, read-only, with the curation decision on top.
 *
 * The reason someone recommended the book is given the most room — that is
 * what the panel is actually judging, not the metadata around it.
 */
export default function EssentialBookShow() {
  const navigate = useNavigate();
  const { id } = useParams();
  const { hasPermission } = useAuth();
  const [book, setBook] = useState(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);

  const canCurate = hasPermission("essential-books.manage");
  const canEdit = hasPermission("essential-books.update") || hasPermission("essential-books.manage");

  const load = useCallback(async () => {
    try {
      const res = await getBook(id);
      setBook(res.data.data);
    } catch (err) {
      Swal.fire("Error", describeError(err, "Failed to load the recommendation."), "error");
    } finally { setLoading(false); }
  }, [id]);

  useEffect(() => { load(); }, [load]);

  const decide = async (status) => {
    const s = STATUS[status];
    const r = await Swal.fire({
      title: `Mark as ${s.label}?`,
      input: "textarea",
      inputLabel: "Note for the panel (optional)",
      inputPlaceholder: "Why this decision…",
      showCancelButton: true,
      confirmButtonColor: TEAL,
      confirmButtonText: s.label,
    });
    if (!r.isConfirmed) return;
    setBusy(true);
    try {
      await setBookStatus(id, status, r.value || null);
      await load();
      Swal.fire({ icon: "success", title: `Marked ${s.label}`, timer: 1200, showConfirmButton: false });
    } catch (err) {
      Swal.fire("Error", describeError(err, "Failed to update the status."), "error");
    } finally { setBusy(false); }
  };

  if (loading) return <Spinner />;
  if (!book) return <div className="px-4 py-16 text-center text-sm" style={{ color: MUTED }}>Recommendation not found.</div>;

  const s = STATUS[book.status] || STATUS.submitted;

  return (
    <div className="min-h-screen bg-[#F4F8F8]">
      <div className="px-5 py-4" style={{ background: TEAL }}>
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div className="min-w-0">
            <bdi dir="auto" className="block text-sm font-bold text-white">{book.title}</bdi>
            <p className="text-xs text-[#CFE6E6] mt-0.5">
              <bdi dir="auto">{book.author}</bdi>
              {book.original_language ? ` · ${book.original_language}` : ""}
              {book.era ? ` · ${book.era}` : ""}
            </p>
          </div>
          <div className="flex items-center gap-2">
            {canEdit && (
              <button onClick={() => navigate(`/library/essential-books/edit/${id}`)}
                className="px-4 py-1.5 bg-white/15 hover:bg-white/25 text-white rounded-xl text-xs font-bold">
                ✏️ Edit
              </button>
            )}
            <button onClick={() => navigate("/library/essential-books")}
              className="px-4 py-1.5 bg-white/15 hover:bg-white/25 text-white rounded-xl text-xs font-bold">
              ← All books
            </button>
          </div>
        </div>
      </div>

      <div className="px-4 py-5 space-y-4 max-w-3xl mx-auto">
        {/* Decision bar — the one action this screen exists to support. */}
        <div className="bg-white rounded-2xl border shadow-sm p-4" style={{ borderColor: BORDER }}>
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-bold uppercase tracking-wider" style={{ color: MUTED }}>Status</span>
              <span className="px-3 py-1 rounded-full text-xs font-semibold border"
                style={{ background: s.bg, color: s.fg, borderColor: s.border }}>{s.label}</span>
            </div>
            {canCurate && (
              <div className="flex flex-wrap gap-2">
                {Object.entries(STATUS)
                  .filter(([k]) => k !== book.status)
                  .map(([k, v]) => (
                    <button key={k} onClick={() => decide(k)} disabled={busy}
                      className="px-3 py-1.5 rounded-xl text-[11px] font-semibold border disabled:opacity-50"
                      style={{ background: v.bg, color: v.fg, borderColor: v.border }}>
                      {v.label}
                    </button>
                  ))}
              </div>
            )}
          </div>
          {book.review_note && (
            <p className="text-xs mt-3 px-3 py-2 rounded-xl" style={{ background: "#F4F8F8", color: MUTED }}>
              📝 {book.review_note}
            </p>
          )}
        </div>

        {/* The PDF — the thing people actually came for. */}
        {book.pdf_url && (
          <a href={book.pdf_url} target="_blank" rel="noopener noreferrer"
            className="flex items-center gap-3 rounded-2xl border shadow-sm px-4 py-3.5 hover:shadow"
            style={{ background: GOLD_LT, borderColor: GOLD_SOFT }}>
            <span className="text-2xl">📄</span>
            <span className="min-w-0 flex-1">
              <span className="block text-sm font-bold truncate" style={{ color: GOLD_DEEP }}>
                {book.pdf_name || "Open the book PDF"}
              </span>
              <span className="block text-[11px]" style={{ color: GOLD_DEEP, opacity: 0.8 }}>
                {prettySize(book.pdf_size)} · opens in a new tab
              </span>
            </span>
            <span className="text-xs font-bold shrink-0" style={{ color: GOLD_DEEP }}>Open →</span>
          </a>
        )}

        <Section title="Why this book">
          <p className="text-sm whitespace-pre-wrap" style={{ color: "#0A3A3E" }} dir="auto">
            {book.recommendation}
          </p>
          {book.description && (
            <>
              <div className="h-px my-3" style={{ background: BORDER }} />
              <p className="text-xs whitespace-pre-wrap" style={{ color: MUTED }} dir="auto">{book.description}</p>
            </>
          )}
          <Tags items={book.themes} tone="gold" />
        </Section>

        <Section title="The book">
          <Rows rows={[
            ["Title in translation", book.title_translation],
            ["Author", book.author],
            ["Author is", LIVING[book.author_living]],
            ["Original language", book.original_language],
            ["Era", book.era],
            ["Reading level", book.reading_level ? `${book.reading_level}` : null],
          ]} />
          <Tags items={book.genres} tone="teal" />
        </Section>

        {(book.editions || book.access_notes || (book.links || []).length > 0) && (
          <Section title="Editions & sources">
            <Rows rows={[["Available editions", book.editions], ["Notes on access", book.access_notes]]} />
            {(book.links || []).length > 0 && (
              <ul className="space-y-1 mt-2">
                {book.links.map((l) => (
                  <li key={l}>
                    <a href={l} target="_blank" rel="noopener noreferrer"
                      className="text-xs underline break-all" style={{ color: TEAL }}>🔗 {l}</a>
                  </li>
                ))}
              </ul>
            )}
          </Section>
        )}

        <Section title="Recommended by">
          <Rows rows={[
            ["Name", book.recommender_name],
            ["Field / role", book.recommender_role],
            ["Contact", book.recommender_contact],
            ["City / country", book.recommender_location],
            ["Submitted", book.created_at?.slice(0, 10)],
          ]} />
          <Tags items={book.involvement} tone="teal" />
        </Section>
      </div>
    </div>
  );
}

function Section({ title, children }) {
  return (
    <div className="bg-white rounded-2xl border shadow-sm p-4" style={{ borderColor: BORDER }}>
      <h3 className="text-[10px] font-bold uppercase tracking-wider mb-2.5" style={{ color: MUTED }}>{title}</h3>
      {children}
    </div>
  );
}

/** Only rows with a value — an empty grid of dashes tells nobody anything. */
function Rows({ rows }) {
  const filled = rows.filter(([, v]) => v);
  if (!filled.length) return null;
  return (
    <dl className="grid sm:grid-cols-2 gap-x-6 gap-y-2">
      {filled.map(([k, v]) => (
        <div key={k}>
          <dt className="text-[10px]" style={{ color: "#8AA4A7" }}>{k}</dt>
          <dd className="text-sm" style={{ color: "#0A3A3E" }}><bdi dir="auto">{v}</bdi></dd>
        </div>
      ))}
    </dl>
  );
}

function Tags({ items, tone }) {
  const list = Array.isArray(items) ? items : [];
  if (!list.length) return null;
  const style = tone === "gold"
    ? { background: GOLD_LT, color: GOLD_DEEP, borderColor: GOLD_SOFT }
    : { background: "#E8F6F6", color: TEAL, borderColor: "#CFE6E6" };
  return (
    <div className="flex flex-wrap gap-1.5 mt-3">
      {list.map((t) => (
        <span key={t} className="px-2.5 py-1 rounded-full text-[11px] font-medium border" style={style}>{t}</span>
      ))}
    </div>
  );
}
