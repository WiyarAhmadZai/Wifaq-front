import { useEffect, useState } from "react";
import Swal from "sweetalert2";
import { get, put } from "../../api/axios";

/**
 * Move an already-enrolled student into a higher grade — the next one, or
 * further (a student who passed a quota exam skips a grade). The year being
 * left is recorded as "promoted" in the student's enrollment history.
 */
export default function PromoteStudentModal({ studentId, onClose, onSaved }) {
  const [data, setData] = useState(null);
  const [error, setError] = useState("");
  const [classId, setClassId] = useState("");
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    get(`/student-management/students/${studentId}/promotion-options`, { cache: false })
      .then((r) => setData(r.data?.data || null))
      .catch((e) => setError(e.response?.data?.message || "Unable to load classes."));
  }, [studentId]);

  const classes = data?.classes || [];
  const selected = classes.find((c) => String(c.id) === String(classId));

  const save = async (event) => {
    event.preventDefault();
    if (!classId) return;
    setSaving(true);
    try {
      const r = await put(`/student-management/students/${studentId}/promote`, { school_class_id: Number(classId), note: note || null });
      Swal.fire({ icon: "success", title: "Promoted", text: r.data?.message, timer: 1800, showConfirmButton: false });
      onSaved?.();
      onClose();
    } catch (e) {
      Swal.fire("Not promoted", e.response?.data?.message || "Please try again.", "error");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={onClose}>
      <form onSubmit={save} onClick={(e) => e.stopPropagation()} className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-xl">
        <h2 className="text-lg font-bold text-gray-800">Promote student</h2>
        {error ? <p className="mt-4 text-sm text-rose-600">{error}</p> : !data ? <p className="mt-4 text-sm text-gray-500">Loading…</p> : (
          <>
            <p className="mt-1 text-sm text-gray-600">
              <span className="font-semibold">{data.student.name}</span> — currently in {data.student.class_name || "no class"}{data.student.grade_name ? ` (${data.student.grade_name})` : ""}
            </p>
            {classes.length === 0 ? (
              <p className="mt-4 rounded-lg bg-amber-50 p-3 text-sm text-amber-800">No active class in a higher grade exists yet. Create the next grade’s class first.</p>
            ) : (
              <>
                <label className="mt-4 block text-xs font-semibold text-gray-600">New class
                  <select required value={classId} onChange={(e) => setClassId(e.target.value)} className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-teal-600">
                    <option value="">Select class</option>
                    {classes.map((c) => (
                      <option key={c.id} value={c.id} disabled={c.available_seats <= 0}>
                        {c.class_name}{c.grade_name ? ` · ${c.grade_name}` : ""}{c.grades_up > 1 ? ` (+${c.grades_up} grades)` : ""}
                        {c.term_name && !c.is_current_term ? ` · ${c.term_name}` : ""} — {c.available_seats > 0 ? `${c.available_seats} seats` : "full"}
                      </option>
                    ))}
                  </select>
                </label>
                {selected?.grades_up > 1 && (
                  <p className="mt-2 rounded-lg bg-sky-50 p-2 text-xs text-sky-800">This skips {selected.grades_up - 1} grade(s) — e.g. after passing a quota exam.</p>
                )}
                <label className="mt-3 block text-xs font-semibold text-gray-600">Note (optional)
                  <input value={note} onChange={(e) => setNote(e.target.value)} maxLength={500} placeholder="e.g. Passed quota exam" className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-teal-600" />
                </label>
                <p className="mt-3 text-xs text-gray-500">The monthly fee is recalculated for the new grade.</p>
              </>
            )}
          </>
        )}
        <div className="mt-6 flex justify-end gap-2">
          <button type="button" onClick={onClose} className="rounded-lg border border-gray-200 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50">Cancel</button>
          <button type="submit" disabled={!classId || saving} className="rounded-lg bg-teal-700 px-4 py-2 text-sm font-semibold text-white hover:bg-teal-800 disabled:opacity-50">
            {saving ? "Promoting…" : "Promote"}
          </button>
        </div>
      </form>
    </div>
  );
}
