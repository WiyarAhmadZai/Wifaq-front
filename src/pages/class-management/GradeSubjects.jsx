import { useState, useEffect, useRef, Fragment } from 'react';
import { get, post, del } from '../../api/axios';
import Swal from 'sweetalert2';

function SearchSelect({ options, value, onChange, placeholder = 'Select...', getLabel = o => o, getValue = o => o }) {
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    const close = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, []);

  const filtered = options.filter(o => getLabel(o).toLowerCase().includes(query.toLowerCase()));
  const selected = options.find(o => getValue(o) == value);

  return (
    <div ref={ref} className="relative">
      <div className={`flex items-center border rounded-xl bg-white transition-all ${open ? 'border-teal-500 ring-2 ring-teal-500' : 'border-gray-200'}`}>
        <svg className="w-4 h-4 text-gray-400 ml-3 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
        </svg>
        <input value={open ? query : (selected ? getLabel(selected) : '')}
          onChange={e => { setQuery(e.target.value); setOpen(true); }}
          onFocus={() => { setOpen(true); setQuery(''); }}
          onKeyDown={e => e.key === 'Enter' && e.preventDefault()}
          placeholder={selected ? getLabel(selected) : placeholder}
          className="flex-1 px-3 py-2.5 text-sm bg-transparent outline-none placeholder-gray-400" />
        {selected && !open && (
          <button type="button" onClick={() => { onChange(''); setQuery(''); }}
            className="mr-2 w-4 h-4 text-gray-400 hover:text-gray-600 flex-shrink-0">
            <svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
        )}
      </div>
      {open && (
        <div className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-xl shadow-lg overflow-hidden">
          <div className="max-h-52 overflow-y-auto">
            {filtered.length === 0 ? (
              <p className="px-4 py-3 text-sm text-gray-400">No results</p>
            ) : filtered.map(o => (
              <button key={getValue(o)} type="button"
                onClick={() => { onChange(getValue(o)); setOpen(false); setQuery(''); }}
                className={`w-full text-left px-4 py-2.5 text-sm transition-colors ${getValue(o) == value ? 'bg-teal-600 text-white' : 'hover:bg-teal-50 text-gray-700'}`}>
                {getLabel(o)}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export default function GradeSubjects() {
  const [grades, setGrades] = useState([]);
  const [academicTerms, setAcademicTerms] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [teachers, setTeachers] = useState([]);
  const [selectedGrade, setSelectedGrade] = useState('');
  const [selectedTerm, setSelectedTerm] = useState('');
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [isAdding, setIsAdding] = useState(false);

  // Per-class teacher assignment panel (non-primary grades)
  const [expandedSubjectId, setExpandedSubjectId] = useState(null);
  const [classRows, setClassRows] = useState([]);
  const [loadingClasses, setLoadingClasses] = useState(false);
  const [savingClasses, setSavingClasses] = useState(false);

  // Fast "grid" data-entry mode (subjects × classes matrix)
  const [viewMode, setViewMode] = useState('list'); // 'list' | 'grid'
  const [gridClasses, setGridClasses] = useState([]);
  const [gridSubjects, setGridSubjects] = useState([]);
  const [gridAssign, setGridAssign] = useState({}); // "subjectId-classId" -> teacher_id
  const [assignedNames, setAssignedNames] = useState({}); // teacherId -> name (for already-assigned teachers)
  const [loadingGrid, setLoadingGrid] = useState(false);
  const [savingGrid, setSavingGrid] = useState(false);
  const [gridDirty, setGridDirty] = useState(false);

  // Add form
  const [addSubjectId, setAddSubjectId] = useState('');

  // Copy from term modal
  const [showCopyModal, setShowCopyModal] = useState(false);
  const [copySourceTerm, setCopySourceTerm] = useState('');
  const [copyIncludeTeachers, setCopyIncludeTeachers] = useState(true);
  const [isCopying, setIsCopying] = useState(false);
  const [isBulkAdding, setIsBulkAdding] = useState(false);

  const fetchFormData = async () => {
    try {
      const res = await get('/class-management/grade-subjects/form-data');
      setGrades(res.data?.grades || []);
      setAcademicTerms(res.data?.academic_terms || []);
      setSubjects(res.data?.subjects || []);
      setTeachers(res.data?.teachers || []);
      if (!selectedTerm && res.data?.academic_terms?.length) setSelectedTerm(res.data.academic_terms[0].id);
    } catch {}
  };

  useEffect(() => { fetchFormData(); }, []);

  useEffect(() => {
    if (selectedGrade && selectedTerm) fetchItems();
    else setItems([]);
  }, [selectedGrade, selectedTerm]);

  const fetchItems = async () => {
    setLoading(true);
    try {
      const res = await get(`/class-management/grade-subjects?grade_id=${selectedGrade}&academic_term_id=${selectedTerm}`);
      setItems(res.data?.data || []);
    } catch { setItems([]); }
    finally { setLoading(false); }
  };

  const selectedGradeData = grades.find(g => g.id == selectedGrade);
  const isPrimary = !!selectedGradeData?.is_primary;

  // ---- Fast grid mode ----
  const fetchGrid = async () => {
    setLoadingGrid(true);
    try {
      const res = await get(`/class-management/grade-subjects/grid?grade_id=${selectedGrade}&academic_term_id=${selectedTerm}`);
      setGridClasses(res.data?.classes || []);
      setGridSubjects(res.data?.subjects || []);
      setGridAssign(res.data?.assignments || {});
      setAssignedNames(res.data?.assigned_teachers || {});
      setGridDirty(false);
    } catch {
      setGridClasses([]); setGridSubjects([]); setGridAssign({}); setAssignedNames({});
    } finally {
      setLoadingGrid(false);
    }
  };

  // Load (or reload) the grid whenever it's shown, the grade/term changes, or
  // the subject list changes (add / remove / bulk / copy).
  useEffect(() => {
    if (viewMode === 'grid' && selectedGrade && selectedTerm && !isPrimary) fetchGrid();
  }, [viewMode, selectedGrade, selectedTerm, items]);

  const setGridCell = (subjectId, classId, teacherId) => {
    setGridAssign(prev => ({ ...prev, [`${subjectId}-${classId}`]: teacherId || null }));
    setGridDirty(true);
  };

  const applyRowToAll = (subjectId, teacherId) => {
    setGridAssign(prev => {
      const next = { ...prev };
      gridClasses.forEach(c => { next[`${subjectId}-${c.id}`] = teacherId || null; });
      return next;
    });
    setGridDirty(true);
  };

  const saveGrid = async () => {
    setSavingGrid(true);
    try {
      const assignments = [];
      gridSubjects.forEach(s => gridClasses.forEach(c => {
        assignments.push({
          subject_id: s.subject_id,
          school_class_id: c.id,
          teacher_id: gridAssign[`${s.subject_id}-${c.id}`] || null,
        });
      }));
      await post('/class-management/grade-subjects/grid', {
        grade_id: selectedGrade,
        academic_term_id: selectedTerm,
        assignments,
      });
      setGridDirty(false);
      await fetchItems();
      await fetchFormData();
      await fetchGrid();
      Swal.fire({ icon: 'success', title: 'All assignments saved', timer: 1300, showConfirmButton: false });
    } catch (error) {
      const errs = error.response?.data?.errors;
      const msg = errs ? Object.values(errs).flat()[0] : (error.response?.data?.message || 'Failed to save');
      Swal.fire('Error', msg, 'error');
    } finally {
      setSavingGrid(false);
    }
  };

  const handleAdd = async () => {
    if (!addSubjectId) return;
    setIsAdding(true);
    try {
      await post('/class-management/grade-subjects', {
        grade_id: selectedGrade,
        academic_term_id: selectedTerm,
        subject_id: addSubjectId,
        teacher_id: null, // teachers are assigned per class below
      });
      setAddSubjectId('');
      await fetchItems();
      await fetchFormData();
      Swal.fire({ icon: 'success', title: 'Subject added', timer: 1200, showConfirmButton: false });
    } catch (error) {
      const errs = error.response?.data?.errors;
      const msg = errs ? Object.values(errs).flat()[0] : (error.response?.data?.message || 'Failed to add');
      Swal.fire('Error', msg, 'error');
    } finally {
      setIsAdding(false);
    }
  };

  // Open/close the per-class teacher panel for a subject and load its classes.
  const toggleExpand = async (item) => {
    if (expandedSubjectId === item.subject_id) {
      setExpandedSubjectId(null);
      setClassRows([]);
      return;
    }
    setExpandedSubjectId(item.subject_id);
    setClassRows([]);
    setLoadingClasses(true);
    try {
      const res = await get(`/class-management/grade-subjects/class-assignments?grade_id=${selectedGrade}&subject_id=${item.subject_id}&academic_term_id=${selectedTerm}`);
      setClassRows(res.data?.data || []);
    } catch {
      setClassRows([]);
    } finally {
      setLoadingClasses(false);
    }
  };

  const setClassTeacher = (classId, teacherId) => {
    setClassRows(prev => prev.map(r => r.school_class_id === classId ? { ...r, teacher_id: teacherId || null } : r));
  };

  const applyTeacherToAll = (teacherId) => {
    setClassRows(prev => prev.map(r => ({ ...r, teacher_id: teacherId || null })));
  };

  const saveClassTeachers = async (item) => {
    setSavingClasses(true);
    try {
      await post('/class-management/grade-subjects/class-assignments', {
        grade_id: selectedGrade,
        subject_id: item.subject_id,
        academic_term_id: selectedTerm,
        assignments: classRows.map(r => ({ school_class_id: r.school_class_id, teacher_id: r.teacher_id || null })),
      });
      await fetchItems();
      await fetchFormData();
      setExpandedSubjectId(null);
      setClassRows([]);
      Swal.fire({ icon: 'success', title: 'Class teachers saved', timer: 1200, showConfirmButton: false });
    } catch (error) {
      const errs = error.response?.data?.errors;
      const msg = errs ? Object.values(errs).flat()[0] : (error.response?.data?.message || 'Failed to save');
      Swal.fire('Error', msg, 'error');
    } finally {
      setSavingClasses(false);
    }
  };

  const handleBulkAddAll = async () => {
    const confirm = await Swal.fire({
      title: 'Add all active subjects?',
      text: `This will add all available subjects to ${gradeName}.`,
      icon: 'question',
      showCancelButton: true,
      confirmButtonColor: '#0d9488',
      confirmButtonText: 'Yes, add all',
    });
    if (!confirm.isConfirmed) return;

    setIsBulkAdding(true);
    try {
      const res = await post('/class-management/grade-subjects/bulk-add-all', {
        grade_id: selectedGrade,
        academic_term_id: selectedTerm,
      });
      await fetchItems();
      await fetchFormData();
      Swal.fire({
        icon: 'success',
        title: res.data?.message || 'Subjects added',
        timer: 1500,
        showConfirmButton: false,
      });
    } catch (error) {
      Swal.fire('Error', error.response?.data?.message || 'Failed to add', 'error');
    } finally {
      setIsBulkAdding(false);
    }
  };

  const handleCopyFromTerm = async () => {
    if (!copySourceTerm) return;
    setIsCopying(true);
    try {
      const res = await post('/class-management/grade-subjects/copy-from-term', {
        grade_id: selectedGrade,
        source_term_id: copySourceTerm,
        target_term_id: selectedTerm,
        include_teachers: copyIncludeTeachers,
      });
      await fetchItems();
      await fetchFormData();
      setShowCopyModal(false);
      setCopySourceTerm('');
      Swal.fire({
        icon: 'success',
        title: res.data?.message || 'Copied successfully',
        timer: 1800,
        showConfirmButton: false,
      });
    } catch (error) {
      Swal.fire('Error', error.response?.data?.message || 'Failed to copy', 'error');
    } finally {
      setIsCopying(false);
    }
  };

  const handleDelete = async (id) => {
    const res = await Swal.fire({ title: 'Remove subject?', text: 'This will remove it from all classes in this grade.', icon: 'warning', showCancelButton: true, confirmButtonColor: '#ef4444', confirmButtonText: 'Remove' });
    if (res.isConfirmed) {
      try { await del(`/class-management/grade-subjects/${id}`); } catch {}
      setItems(prev => prev.filter(i => i.id !== id));
      await fetchFormData();
      Swal.fire({ icon: 'success', title: 'Removed', timer: 1200, showConfirmButton: false });
    }
  };

  const gradeName = grades.find(g => g.id == selectedGrade)?.name || '';
  const availableSubjects = subjects.filter(s =>
    !items.some(i => i.subject_id === s.id) &&
    (!s.grade_id || s.grade_id == selectedGrade)
  );

  return (
    <div className="px-4 py-5 space-y-5">
      {/* Header */}
      <div>
        <h1 className="text-lg font-bold text-gray-800">Grade Subjects</h1>
        <p className="text-xs text-gray-400 mt-0.5">Define each grade's subjects, then assign a teacher per class — different classes can have different teachers</p>
      </div>

      {/* Grade & Term Selection */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-[11px] font-semibold text-gray-500 uppercase tracking-wider mb-1.5">Grade *</label>
            <SearchSelect options={grades} value={selectedGrade} onChange={v => setSelectedGrade(v || '')}
              placeholder="Select grade..." getLabel={g => g.name} getValue={g => g.id} />
          </div>
          <div>
            <label className="block text-[11px] font-semibold text-gray-500 uppercase tracking-wider mb-1.5">Academic Term *</label>
            <SearchSelect options={academicTerms} value={selectedTerm} onChange={v => setSelectedTerm(v || '')}
              placeholder="Select term..." getLabel={t => t.name} getValue={t => t.id} />
          </div>
        </div>
      </div>

      {selectedGrade && selectedTerm && (
        <>
          {/* Quick Actions */}
          <div className="bg-gradient-to-br from-teal-50 to-cyan-50 border border-teal-200 rounded-2xl p-4">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <svg className="w-4 h-4 text-teal-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
                <h3 className="text-sm font-bold text-teal-900">Quick Actions</h3>
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              <button onClick={handleBulkAddAll} disabled={isBulkAdding}
                className="flex items-center gap-2 px-3 py-2 bg-white border border-teal-200 text-teal-700 text-xs font-semibold rounded-xl hover:bg-teal-50 transition-colors disabled:opacity-50">
                {isBulkAdding ? (
                  <div className="w-3.5 h-3.5 border-2 border-teal-300 border-t-teal-600 rounded-full animate-spin" />
                ) : (
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 13h6m-3-3v6m5 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                )}
                Add All Active Subjects
              </button>
              <button onClick={() => setShowCopyModal(true)}
                className="flex items-center gap-2 px-3 py-2 bg-white border border-teal-200 text-teal-700 text-xs font-semibold rounded-xl hover:bg-teal-50 transition-colors">
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" /></svg>
                Copy from Another Term
              </button>
            </div>
          </div>

          {/* Primary Grade Banner */}
          {isPrimary && (
            <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 flex items-start gap-3">
              <svg className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <div>
                <p className="text-sm font-bold text-amber-900">Primary Grade — Teacher per Class</p>
                <p className="text-[11px] text-amber-700 mt-0.5 leading-relaxed">
                  In primary grades, the <strong>class supervisor</strong> teaches all subjects. Just list the subjects here — each class (e.g. Grade 1A, Grade 1B) will use its own supervisor as the teacher. So Ahmad can teach all subjects in Grade 1A while Ali teaches all subjects in Grade 1B.
                </p>
              </div>
            </div>
          )}

          {/* Add Subject */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
            <h3 className="text-sm font-bold text-gray-800 mb-1">Add Subject to {gradeName}</h3>
            <p className="text-[11px] text-gray-400 mb-4">Add the subject first, then {isPrimary ? "each class uses its own supervisor" : "assign a teacher per class from the list below"}. Weekly hours come from the subject definition.</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 items-end">
              <div>
                <label className="block text-[10px] font-semibold text-gray-400 uppercase mb-1">Subject *</label>
                <SearchSelect options={availableSubjects} value={addSubjectId} onChange={v => setAddSubjectId(v || '')}
                  placeholder="Select subject..."
                  getLabel={s => `${s.subject_code} — ${s.subject_name}${s.weekly_hours ? ` (${s.weekly_hours}h/week)` : ''}`}
                  getValue={s => s.id} />
              </div>
              <button onClick={handleAdd} disabled={!addSubjectId || isAdding}
                className="px-4 py-2.5 bg-teal-600 text-white rounded-xl text-sm font-semibold hover:bg-teal-700 transition-colors disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2 min-w-[100px]">
                {isAdding ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Adding...
                  </>
                ) : (
                  <>
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
                    Add
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Subject List */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
            <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between gap-3 flex-wrap">
              <h3 className="text-sm font-bold text-gray-800">Subjects for {gradeName}</h3>
              <div className="flex items-center gap-3">
                {!isPrimary && (
                  <div className="inline-flex rounded-xl border border-gray-200 p-0.5 bg-gray-50">
                    <button onClick={() => setViewMode('list')}
                      className={`px-3 py-1.5 text-[11px] font-semibold rounded-lg transition-colors ${viewMode === 'list' ? 'bg-white text-teal-700 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>
                      List
                    </button>
                    <button onClick={() => setViewMode('grid')}
                      className={`px-3 py-1.5 text-[11px] font-semibold rounded-lg transition-colors flex items-center gap-1 ${viewMode === 'grid' ? 'bg-white text-teal-700 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>
                      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 10h16M4 14h16M4 18h16" /></svg>
                      Fast grid
                    </button>
                  </div>
                )}
                <span className="text-xs text-gray-400">{items.length} subjects</span>
              </div>
            </div>

            {viewMode === 'grid' && !isPrimary ? (
              loadingGrid ? (
                <div className="text-center py-12">
                  <div className="inline-block animate-spin rounded-full h-6 w-6 border-2 border-teal-600 border-t-transparent" />
                </div>
              ) : gridSubjects.length === 0 ? (
                <div className="text-center py-12 px-4">
                  <p className="text-sm text-gray-400">No subjects assigned to this grade yet</p>
                  <p className="text-xs text-gray-300 mt-1">Add subjects above, then assign teachers here</p>
                </div>
              ) : gridClasses.length === 0 ? (
                <div className="text-center py-12 px-4">
                  <p className="text-sm text-gray-400">No active classes in this grade/term yet</p>
                  <p className="text-xs text-gray-300 mt-1">Create classes for this grade & term first</p>
                </div>
              ) : (
                <>
                  <div className="px-5 py-2.5 bg-teal-50/60 border-b border-teal-100 flex items-center justify-between gap-3 flex-wrap">
                    <p className="text-[11px] text-teal-800">
                      Pick a teacher in each cell, or use <strong>“set all classes”</strong> under a subject to fill its whole row. Then save once.
                    </p>
                    <div className="flex items-center gap-2">
                      {gridDirty && <span className="text-[11px] font-semibold text-amber-600">Unsaved changes</span>}
                      <button onClick={saveGrid} disabled={savingGrid || !gridDirty}
                        className="px-4 py-1.5 bg-teal-600 text-white text-[11px] font-semibold rounded-lg hover:bg-teal-700 disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-2">
                        {savingGrid && <div className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin" />}
                        {savingGrid ? 'Saving...' : 'Save all'}
                      </button>
                    </div>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full border-collapse">
                      <thead>
                        <tr className="bg-gray-50 border-b border-gray-100">
                          <th className="sticky left-0 z-10 bg-gray-50 px-4 py-3 text-left text-[10px] font-bold text-gray-500 uppercase tracking-wider min-w-[190px]">Subject \ Class</th>
                          {gridClasses.map(c => (
                            <th key={c.id} className="px-3 py-3 text-center text-[10px] font-bold text-gray-500 uppercase tracking-wider min-w-[150px]">
                              {c.class_name}
                              {c.shift && <span className={`ml-1 px-1 py-0.5 rounded text-[8px] font-semibold ${c.shift === 'morning' ? 'bg-amber-50 text-amber-600' : 'bg-indigo-50 text-indigo-600'}`}>{c.shift === 'morning' ? 'AM' : 'PM'}</span>}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-50">
                        {gridSubjects.map(s => (
                          <tr key={s.subject_id} className="hover:bg-gray-50/40">
                            <td className="sticky left-0 z-10 bg-white px-4 py-2 align-top">
                              <p className="text-sm font-semibold text-gray-800 leading-tight">{s.subject_name}</p>
                              <p className="text-[10px] text-gray-400">{s.subject_code}{s.weekly_hours ? ` · ${s.weekly_hours}h` : ''}</p>
                              <select defaultValue="" onChange={e => { const v = e.target.value; if (v === '') return; applyRowToAll(s.subject_id, v === '__none__' ? '' : v); e.target.value = ''; }}
                                className="mt-1.5 w-full px-1.5 py-1 border border-gray-200 rounded-lg text-[10px] bg-white outline-none text-gray-500 focus:ring-2 focus:ring-teal-500">
                                <option value="">↳ set all classes…</option>
                                <option value="__none__">(clear all)</option>
                                {teachers.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                              </select>
                            </td>
                            {gridClasses.map(c => {
                              const key = `${s.subject_id}-${c.id}`;
                              const val = gridAssign[key] || '';
                              return (
                                <td key={c.id} className="px-2 py-2">
                                  <select value={val} onChange={e => setGridCell(s.subject_id, c.id, e.target.value)}
                                    className={`w-full px-2 py-1.5 border rounded-lg text-xs bg-white outline-none focus:ring-2 focus:ring-teal-500 ${val ? 'border-teal-200 text-gray-800' : 'border-gray-200 text-gray-400'}`}>
                                    <option value="">— none —</option>
                                    {val && !teachers.some(t => t.id == val) && assignedNames[val] && (
                                      <option value={val}>{assignedNames[val]} (current)</option>
                                    )}
                                    {teachers.map(t => <option key={t.id} value={t.id}>{t.name} ({t.available_hours}h)</option>)}
                                  </select>
                                </td>
                              );
                            })}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  <div className="px-5 py-3 bg-gray-50 border-t border-gray-100 flex justify-end">
                    <button onClick={saveGrid} disabled={savingGrid || !gridDirty}
                      className="px-5 py-2 bg-teal-600 text-white text-xs font-semibold rounded-lg hover:bg-teal-700 disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-2">
                      {savingGrid && <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />}
                      {savingGrid ? 'Saving...' : 'Save all assignments'}
                    </button>
                  </div>
                </>
              )
            ) : loading ? (
              <div className="text-center py-12">
                <div className="inline-block animate-spin rounded-full h-6 w-6 border-2 border-teal-600 border-t-transparent" />
              </div>
            ) : items.length === 0 ? (
              <div className="text-center py-12 px-4">
                <p className="text-sm text-gray-400">No subjects assigned to this grade yet</p>
                <p className="text-xs text-gray-300 mt-1">Use the form above to add subjects</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="bg-gray-50 border-b border-gray-100">
                      <th className="px-4 py-3 text-left text-[10px] font-bold text-gray-500 uppercase tracking-wider">Subject</th>
                      <th className="px-4 py-3 text-left text-[10px] font-bold text-gray-500 uppercase tracking-wider">Category</th>
                      <th className="px-4 py-3 text-left text-[10px] font-bold text-gray-500 uppercase tracking-wider">Teachers (per class)</th>
                      <th className="px-4 py-3 text-center text-[10px] font-bold text-gray-500 uppercase tracking-wider">Hours/Week</th>
                      <th className="px-4 py-3 text-right text-[10px] font-bold text-gray-500 uppercase tracking-wider">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {items.map(item => {
                      const expanded = expandedSubjectId === item.subject_id;
                      const total = item.classes_total ?? 0;
                      const assigned = item.classes_assigned ?? 0;
                      return (
                      <Fragment key={item.id}>
                      <tr className="hover:bg-gray-50/80 transition-colors">
                        <td className="px-4 py-3">
                          <p className="text-sm font-semibold text-gray-800">{item.subject_name}</p>
                          <p className="text-[10px] text-gray-400">{item.subject_code}</p>
                        </td>
                        <td className="px-4 py-3">
                          <span className="text-xs text-gray-600">{item.category}</span>
                        </td>
                        <td className="px-4 py-3">
                          {isPrimary ? (
                            <span className="text-xs text-amber-700 italic">Class supervisor (all subjects)</span>
                          ) : total === 0 ? (
                            <span className="text-xs text-gray-400">No classes in this grade/term yet</span>
                          ) : (
                            <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] font-semibold ${assigned === 0 ? 'bg-gray-100 text-gray-500' : assigned < total ? 'bg-amber-50 text-amber-700' : 'bg-emerald-50 text-emerald-700'}`}>
                              {assigned}/{total} classes assigned
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-center">
                          <span className="text-sm text-gray-700">{item.weekly_hours ? `${item.weekly_hours}h` : '—'}</span>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center justify-end gap-1">
                            {!isPrimary && total > 0 && (
                              <button onClick={() => toggleExpand(item)}
                                className={`px-2.5 py-1.5 text-[10px] font-semibold rounded-lg transition-colors ${expanded ? 'bg-gray-100 text-gray-600 hover:bg-gray-200' : 'bg-teal-600 text-white hover:bg-teal-700'}`}>
                                {expanded ? 'Close' : 'Assign teachers'}
                              </button>
                            )}
                            <button onClick={() => handleDelete(item.id)}
                              className="p-1.5 text-red-500 hover:bg-red-50 rounded-lg transition-colors" title="Remove subject from grade">
                              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                            </button>
                          </div>
                        </td>
                      </tr>
                      {expanded && (
                        <tr className="bg-teal-50/40">
                          <td colSpan={5} className="px-4 py-4">
                            {loadingClasses ? (
                              <div className="py-6 text-center"><div className="inline-block animate-spin rounded-full h-5 w-5 border-2 border-teal-600 border-t-transparent" /></div>
                            ) : classRows.length === 0 ? (
                              <p className="text-xs text-gray-400 text-center py-3">No active classes found for this grade & term.</p>
                            ) : (
                              <div className="space-y-3">
                                <div className="flex flex-wrap items-center justify-between gap-2">
                                  <p className="text-xs font-bold text-gray-700">Assign a teacher for {item.subject_name} in each class</p>
                                  <div className="flex items-center gap-2">
                                    <span className="text-[10px] text-gray-400">Set all to:</span>
                                    <select onChange={e => { applyTeacherToAll(e.target.value); e.target.value=''; }} defaultValue=""
                                      className="px-2 py-1 border border-gray-200 rounded-lg text-[11px] bg-white outline-none focus:ring-2 focus:ring-teal-500">
                                      <option value="">— pick —</option>
                                      <option value="">(none)</option>
                                      {teachers.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                                    </select>
                                  </div>
                                </div>
                                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                                  {classRows.map(row => (
                                    <div key={row.school_class_id} className="flex items-center gap-2 bg-white border border-gray-200 rounded-xl px-3 py-2">
                                      <span className="text-xs font-semibold text-gray-700 w-24 truncate" title={row.class_name}>{row.class_name}</span>
                                      <select value={row.teacher_id || ''} onChange={e => setClassTeacher(row.school_class_id, e.target.value)}
                                        className="flex-1 px-2 py-1.5 border border-gray-200 rounded-lg text-xs bg-white outline-none focus:ring-2 focus:ring-teal-500">
                                        <option value="">No teacher</option>
                                        {/* keep currently-assigned teacher selectable even if now full */}
                                        {row.teacher_id && !teachers.some(t => t.id == row.teacher_id) && (
                                          <option value={row.teacher_id}>{row.teacher_name} (current)</option>
                                        )}
                                        {teachers.map(t => <option key={t.id} value={t.id}>{t.name} ({t.available_hours}h)</option>)}
                                      </select>
                                    </div>
                                  ))}
                                </div>
                                <div className="flex justify-end gap-2 pt-1">
                                  <button onClick={() => { setExpandedSubjectId(null); setClassRows([]); }}
                                    className="px-3 py-1.5 bg-white border border-gray-200 text-gray-600 text-[11px] font-semibold rounded-lg hover:bg-gray-50">Cancel</button>
                                  <button onClick={() => saveClassTeachers(item)} disabled={savingClasses}
                                    className="px-4 py-1.5 bg-teal-600 text-white text-[11px] font-semibold rounded-lg hover:bg-teal-700 disabled:opacity-50 flex items-center gap-2">
                                    {savingClasses && <div className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin" />}
                                    {savingClasses ? 'Saving...' : 'Save class teachers'}
                                  </button>
                                </div>
                              </div>
                            )}
                          </td>
                        </tr>
                      )}
                      </Fragment>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      )}

      {/* Copy from Term Modal */}
      {showCopyModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden">
            <div className="px-5 py-4 bg-teal-50 border-b border-teal-100 flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-gray-800">Copy Subjects from Another Term</h3>
                <p className="text-[10px] text-gray-500 mt-0.5">Copy all subjects of {gradeName} from a previous term</p>
              </div>
              <button onClick={() => setShowCopyModal(false)} className="p-1 hover:bg-teal-100 rounded-lg">
                <svg className="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>
            <div className="p-5 space-y-4">
              <div>
                <label className="block text-[11px] font-semibold text-gray-500 uppercase tracking-wider mb-1.5">Source Term</label>
                <select value={copySourceTerm} onChange={e => setCopySourceTerm(e.target.value)}
                  className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-teal-500 bg-white outline-none">
                  <option value="">Choose a term to copy from...</option>
                  {academicTerms.filter(t => t.id != selectedTerm).map(t => (
                    <option key={t.id} value={t.id}>{t.name}</option>
                  ))}
                </select>
              </div>
              {!isPrimary && (
                <label className="flex items-center gap-2 p-3 bg-gray-50 rounded-xl cursor-pointer">
                  <input type="checkbox" checked={copyIncludeTeachers} onChange={e => setCopyIncludeTeachers(e.target.checked)}
                    className="w-4 h-4 text-teal-600 border-gray-300 rounded focus:ring-teal-500" />
                  <span className="text-xs text-gray-700">Also copy teacher assignments</span>
                </label>
              )}
              <div className="p-3 bg-teal-50 rounded-xl text-[11px] text-teal-800 leading-relaxed">
                <strong>Note:</strong> Existing subjects in {gradeName} for the current term will be kept. Only new subjects from the source term will be added.
              </div>
            </div>
            <div className="px-5 py-4 bg-gray-50 flex justify-end gap-2 border-t border-gray-100">
              <button onClick={() => setShowCopyModal(false)}
                className="px-4 py-2 text-xs font-medium text-gray-600 bg-white border border-gray-200 rounded-xl hover:bg-gray-50">Cancel</button>
              <button onClick={handleCopyFromTerm} disabled={!copySourceTerm || isCopying}
                className="px-4 py-2 text-xs font-semibold text-white bg-teal-600 rounded-xl hover:bg-teal-700 disabled:opacity-50 flex items-center gap-2">
                {isCopying ? (
                  <><div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />Copying...</>
                ) : 'Copy Subjects'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
