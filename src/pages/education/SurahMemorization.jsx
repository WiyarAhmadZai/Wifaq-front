import { useEffect, useMemo, useRef, useState } from "react";
import {
  createMemorizationItem,
  deleteMemorizationItem,
  saveSurahMemorizationClass,
  surahMemorizationClass,
  surahMemorizationSetup,
  updateMemorizationItem,
} from "../../api/surahMemorization";
import { useI18n } from "../../i18n/I18nContext";
import {
  Avatar, Banner, Btn, Card, Field, Header, ICON, Input, Loading,
  LoadingRow, Page, Select, TableCard, tdCls, thCls,
} from "./gradebookUi";

const assignmentFor = (student, itemId) =>
  student.assignments.find((assignment) => Number(assignment.item_id) === Number(itemId));

function errorMessage(error, t, fallback) {
  const response = error.response?.data || {};
  const details = Object.values(response.errors || {}).flat();
  return t(details[0] || response.message || fallback);
}

export default function SurahMemorization() {
  const { t } = useI18n();
  const [meta, setMeta] = useState(null);
  const [classId, setClassId] = useState("");
  const [termId, setTermId] = useState("");
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [classLoading, setClassLoading] = useState(false);
  const [busy, setBusy] = useState(false);
  const [expandedStudent, setExpandedStudent] = useState(null);
  const [catalogOpen, setCatalogOpen] = useState(false);
  const [itemName, setItemName] = useState("");
  const [editingItem, setEditingItem] = useState(null);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const drafts = useRef(new Map());
  const selectionKey = `${classId}:${termId}`;

  useEffect(() => {
    let active = true;
    surahMemorizationSetup()
      .then(({ data }) => {
        if (!active) return;
        const setup = data?.data || {};
        setMeta(setup);
        setClassId(setup.classes?.[0]?.id ?? "");
        setTermId(setup.terms?.find((term) => term.is_current)?.id ?? setup.terms?.[0]?.id ?? "");
      })
      .catch((e) => {
        if (active) setError(errorMessage(e, t, "Could not load memorization data."));
      })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [t]);

  useEffect(() => {
    if (!classId || !termId) {
      setRows([]);
      return undefined;
    }

    let active = true;
    setClassLoading(true);
    setError("");
    surahMemorizationClass(classId, { academic_term_id: termId })
      .then(({ data }) => {
        if (!active) return;
        const savedDraft = drafts.current.get(selectionKey);
        setRows(savedDraft || data?.data?.students || []);
      })
      .catch((e) => {
        if (active) {
          setRows([]);
          setError(errorMessage(e, t, "Could not load this class."));
        }
      })
      .finally(() => { if (active) setClassLoading(false); });
    return () => { active = false; };
  }, [classId, termId, selectionKey, t]);

  const assignedCount = useMemo(
    () => rows.reduce((total, row) => total + row.assignments.length, 0),
    [rows]
  );
  const completedCount = useMemo(
    () => rows.reduce((total, row) => total + row.assignments.filter((a) => a.memorized).length, 0),
    [rows]
  );

  function updateStudent(studentId, patch) {
    setRows((current) => {
      const next = current.map((row) => row.id === studentId ? { ...row, ...patch } : row);
      drafts.current.set(selectionKey, next);
      return next;
    });
  }

  function toggleAssignment(student, item) {
    const current = assignmentFor(student, item.id);
    const assignments = current
      ? student.assignments.filter((assignment) => Number(assignment.item_id) !== Number(item.id))
      : [...student.assignments, { item_id: item.id, name: item.name, deleted: false, memorized: false }];
    updateStudent(student.id, { assignments });
  }

  function toggleMemorized(student, itemId) {
    updateStudent(student.id, {
      assignments: student.assignments.map((assignment) =>
        Number(assignment.item_id) === Number(itemId)
          ? { ...assignment, memorized: !assignment.memorized }
          : assignment
      ),
    });
  }

  async function save() {
    setError("");
    setNotice("");
    const invalidScore = rows.find((row) => row.score !== null && row.score !== "" && (
      !Number.isFinite(Number(row.score)) || Number(row.score) < 0 || Number(row.score) > 10
    ));
    if (invalidScore) {
      setError(`${invalidScore.name}: ${t("Score must be between 0 and 10.")}`);
      return;
    }
    setBusy(true);
    try {
      const payload = {
        academic_term_id: Number(termId),
        students: rows.map((row) => ({
          student_id: row.id,
          score: row.score === "" || row.score === null ? null : Number(row.score),
          notes: row.notes || "",
          assignments: row.assignments.filter((assignment) => !assignment.deleted).map(({ item_id, memorized }) => ({
            item_id: Number(item_id),
            memorized: Boolean(memorized),
          })),
        })),
      };
      await saveSurahMemorizationClass(classId, payload);
      drafts.current.delete(selectionKey);
      setNotice(t("Changes saved."));
    } catch (e) {
      setError(errorMessage(e, t, "Could not save changes."));
    } finally {
      setBusy(false);
    }
  }

  async function saveItem(event) {
    event.preventDefault();
    const name = itemName.trim();
    if (!name) return;
    setError("");
    setBusy(true);
    try {
      const response = editingItem
        ? await updateMemorizationItem(editingItem.id, { name })
        : await createMemorizationItem({ name });
      const saved = response.data?.data;
      setMeta((current) => ({
        ...current,
        items: editingItem
          ? current.items.map((item) => item.id === editingItem.id ? { ...item, name: saved.name } : item)
          : [...current.items, saved],
      }));
      setItemName("");
      setEditingItem(null);
      setNotice(t(editingItem ? "Item updated." : "Item added."));
    } catch (e) {
      setError(errorMessage(e, t, "Could not save the item."));
    } finally {
      setBusy(false);
    }
  }

  async function removeItem(item) {
    if (!window.confirm(t("Delete this memorization item? Previous student records will be kept."))) return;
    setError("");
    setBusy(true);
    try {
      await deleteMemorizationItem(item.id);
      setMeta((current) => ({ ...current, items: current.items.filter((entry) => entry.id !== item.id) }));
      setRows((current) => {
        const next = current.map((student) => ({
          ...student,
          assignments: student.assignments.map((assignment) =>
            Number(assignment.item_id) === Number(item.id) ? { ...assignment, deleted: true } : assignment
          ),
        }));
        drafts.current.set(selectionKey, next);
        return next;
      });
      setNotice(t("Item deleted."));
    } catch (e) {
      setError(errorMessage(e, t, "Could not delete the item."));
    } finally {
      setBusy(false);
    }
  }

  if (loading) return <Loading />;

  return (
    <Page>
      <Header
        icon={ICON.book}
        title={t("Surah & Duas Memorization List")}
        subtitle={t("Assign memorization items, follow each student's progress, and record an activity score out of 10.")}
        actions={meta?.can_manage ? (
          <Btn tone="white" onClick={() => setCatalogOpen((open) => !open)}>
            {catalogOpen ? t("Close item list") : t("Manage items")}
          </Btn>
        ) : null}
      />

      {error && <Banner kind="error" onClose={() => setError("")}>{error}</Banner>}
      {notice && <Banner onClose={() => setNotice("")}>{notice}</Banner>}

      {catalogOpen && meta?.can_manage && (
        <Card className="mb-4">
          <div className="flex flex-wrap items-end justify-between gap-3 mb-4">
            <div>
              <h2 className="font-bold text-gray-800">{t("Manage memorization items")}</h2>
              <p className="text-xs text-gray-500 mt-1">{t("The list is shared by all classes. Deleted items stay in past student records.")}</p>
            </div>
            <form onSubmit={saveItem} className="flex flex-wrap items-end gap-2">
              <Field label={t(editingItem ? "Edit item name" : "New item name")}>
                <Input value={itemName} onChange={(event) => setItemName(event.target.value)} maxLength={200} required />
              </Field>
              <Btn type="submit" disabled={busy || !itemName.trim()}>{t(editingItem ? "Save item" : "Add item")}</Btn>
              {editingItem && <Btn tone="ghost" onClick={() => { setEditingItem(null); setItemName(""); }}>{t("Cancel")}</Btn>}
            </form>
          </div>
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {meta.items.map((item) => (
              <div key={item.id} className="flex items-center justify-between gap-3 rounded-xl border border-gray-100 px-3 py-2">
                <span className="text-sm text-gray-700" dir="auto">{item.name}</span>
                <span className="flex shrink-0 gap-1">
                  <button type="button" className="text-xs font-semibold text-teal-700" onClick={() => { setEditingItem(item); setItemName(item.name); }}>
                    {t("Edit")}
                  </button>
                  <button type="button" className="text-xs font-semibold text-red-600" disabled={busy} onClick={() => removeItem(item)}>
                    {t("Delete")}
                  </button>
                </span>
              </div>
            ))}
          </div>
        </Card>
      )}

      <Card className="mb-4">
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label={t("Class")}>
            <Select value={classId} onChange={(event) => setClassId(event.target.value)}>
              {meta?.classes?.length
                ? meta.classes.map((schoolClass) => (
                  <option key={schoolClass.id} value={schoolClass.id}>
                    {[schoolClass.grade?.name, schoolClass.class_name, schoolClass.section].filter(Boolean).join(" · ")}
                  </option>
                ))
                : <option value="">{t("No classes available")}</option>}
            </Select>
          </Field>
          <Field label={t("Academic term")}>
            <Select value={termId} onChange={(event) => setTermId(event.target.value)}>
              {meta?.terms?.length
                ? meta.terms.map((term) => <option key={term.id} value={term.id}>{term.name}</option>)
                : <option value="">{t("No academic terms available")}</option>}
            </Select>
          </Field>
        </div>
      </Card>

      {!meta?.classes?.length || !meta?.terms?.length ? (
        <Card><p className="py-8 text-center text-sm text-gray-500">{t("A class and academic term are required to record memorization.")}</p></Card>
      ) : classLoading ? <LoadingRow /> : (
        <>
          <div className="mb-3 grid grid-cols-2 gap-3 sm:max-w-md">
            <Card className="py-3 text-center">
              <div className="text-2xl font-black text-teal-700">{rows.length}</div>
              <div className="text-[11px] font-semibold text-gray-500">{t("Students in class")}</div>
            </Card>
            <Card className="py-3 text-center">
              <div className="text-2xl font-black text-emerald-700">{completedCount}<span className="text-sm text-gray-400">/{assignedCount}</span></div>
              <div className="text-[11px] font-semibold text-gray-500">{t("Items memorized")}</div>
            </Card>
          </div>

          {!rows.length ? (
            <Card><p className="py-8 text-center text-sm text-gray-500">{t("No active students are in this class.")}</p></Card>
          ) : (
            <TableCard>
              <thead>
                <tr>
                  <th className={thCls}>{t("Student")}</th>
                  <th className={thCls}>{t("Progress")}</th>
                  <th className={thCls}>{t("Score / 10")}</th>
                  <th className={thCls}>{t("Participation / effort notes")}</th>
                  <th className={thCls}>{t("Assignments")}</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((student) => {
                  const completed = student.assignments.filter((assignment) => assignment.memorized).length;
                  const isExpanded = expandedStudent === student.id;
                  return (
                    <FragmentRows
                      key={student.id}
                      student={student}
                      completed={completed}
                      items={meta?.items || []}
                      expanded={isExpanded}
                      t={t}
                      updateStudent={updateStudent}
                      toggleAssignment={toggleAssignment}
                      toggleMemorized={toggleMemorized}
                      onExpand={() => setExpandedStudent(isExpanded ? null : student.id)}
                    />
                  );
                })}
              </tbody>
            </TableCard>
          )}
          {rows.length > 0 && (
            <div className="sticky bottom-2 z-10 mt-4 flex justify-end">
              <Btn size="lg" disabled={busy || classLoading} onClick={save}>
                {busy ? t("Saving...") : t("Save class progress")}
              </Btn>
            </div>
          )}
        </>
      )}
    </Page>
  );
}

function FragmentRows({
  student, completed, items, expanded, t, updateStudent, toggleAssignment,
  toggleMemorized, onExpand,
}) {
  const assigned = student.assignments.length;

  return (
    <>
      <tr>
        <td className={tdCls}>
          <div className="flex items-center gap-2.5">
            <Avatar name={student.name} size={34} />
            <span>
              <span className="block font-semibold text-gray-800">{student.name}</span>
              {student.student_id && <span className="text-[11px] text-gray-400">{student.student_id}</span>}
            </span>
          </div>
        </td>
        <td className={tdCls}>
          <div className="min-w-24">
            <div className="flex justify-between text-xs font-semibold">
              <span>{completed}/{assigned}</span>
              <span className="text-gray-400">{assigned ? Math.round((completed / assigned) * 100) : 0}%</span>
            </div>
            <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-gray-100">
              <div className="h-full rounded-full bg-emerald-500" style={{ width: `${assigned ? (completed / assigned) * 100 : 0}%` }} />
            </div>
          </div>
        </td>
        <td className={tdCls}>
          <input
            aria-label={`${t("Score / 10")} ${student.name}`}
            type="number"
            min="0"
            max="10"
            step="0.5"
            value={student.score ?? ""}
            onChange={(event) => updateStudent(student.id, { score: event.target.value })}
            className="w-20 rounded-lg border border-gray-200 px-2 py-1.5 text-sm focus:border-teal-400 focus:outline-none focus:ring-2 focus:ring-teal-500/20"
          />
        </td>
        <td className={tdCls}>
          <input
            aria-label={`${t("Participation / effort notes")} ${student.name}`}
            value={student.notes || ""}
            maxLength={2000}
            onChange={(event) => updateStudent(student.id, { notes: event.target.value })}
            placeholder={t("Optional")}
            className="w-full min-w-40 rounded-lg border border-gray-200 px-2.5 py-1.5 text-sm focus:border-teal-400 focus:outline-none focus:ring-2 focus:ring-teal-500/20"
          />
        </td>
        <td className={tdCls}>
          <Btn tone="outline" size="sm" onClick={onExpand}>
            {expanded ? t("Close") : t("Assign / track")}
          </Btn>
        </td>
      </tr>
      {expanded && (
        <tr>
          <td colSpan={5} className="border-b border-gray-100 bg-gray-50/70 px-4 py-4">
            <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
              <div className="font-bold text-gray-700">{t("Assigned memorization items")}</div>
              <div className="text-xs text-gray-500">{t("Select an item, then mark it memorized when completed.")}</div>
            </div>
            <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
              {items.map((item) => {
                const assignment = assignmentFor(student, item.id);
                return (
                  <label key={item.id} className={`flex items-center gap-2 rounded-xl border px-3 py-2 text-sm ${assignment ? "border-teal-200 bg-teal-50/60" : "border-gray-100 bg-white"}`}>
                    <input type="checkbox" checked={Boolean(assignment)} onChange={() => toggleAssignment(student, item)} />
                    <span className="min-w-0 flex-1 truncate" dir="auto">{item.name}</span>
                    {assignment && (
                      <span className="flex shrink-0 items-center gap-1.5 text-[11px]">
                        <input
                          aria-label={`${t("Memorized")} ${item.name}`}
                          type="checkbox"
                          checked={Boolean(assignment.memorized)}
                          onChange={() => toggleMemorized(student, item.id)}
                        />
                        {t("Memorized")}
                      </span>
                    )}
                  </label>
                );
              })}
              {student.assignments.filter((assignment) => assignment.deleted).map((assignment) => (
                <div key={assignment.item_id} className="flex items-center gap-2 rounded-xl border border-gray-200 bg-gray-100 px-3 py-2 text-sm text-gray-500">
                  <span className="min-w-0 flex-1 truncate" dir="auto">{assignment.name}</span>
                  <span>{assignment.memorized ? t("Memorized") : t("Previously assigned")}</span>
                </div>
              ))}
            </div>
          </td>
        </tr>
      )}
    </>
  );
}
