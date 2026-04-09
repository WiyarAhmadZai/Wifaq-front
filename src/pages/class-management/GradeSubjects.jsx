import { useState, useEffect, useRef } from 'react';
import { get, post, put, del } from '../../api/axios';
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
  const [staff, setStaff] = useState([]);
  const [selectedGrade, setSelectedGrade] = useState('');
  const [selectedTerm, setSelectedTerm] = useState('');
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [isAdding, setIsAdding] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [editTeacher, setEditTeacher] = useState('');
  const [editHours, setEditHours] = useState('');

  // Add form
  const [addSubjectId, setAddSubjectId] = useState('');
  const [addTeacherId, setAddTeacherId] = useState('');
  const [addHours, setAddHours] = useState('');

  useEffect(() => {
    (async () => {
      try {
        const res = await get('/class-management/grade-subjects/form-data');
        setGrades(res.data?.grades || []);
        setAcademicTerms(res.data?.academic_terms || []);
        setSubjects(res.data?.subjects || []);
        setStaff(res.data?.staff || []);
        if (res.data?.academic_terms?.length) setSelectedTerm(res.data.academic_terms[0].id);
      } catch {}
    })();
  }, []);

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

  const handleAdd = async () => {
    if (!addSubjectId) return;
    setIsAdding(true);
    try {
      const res = await post('/class-management/grade-subjects', {
        grade_id: selectedGrade,
        academic_term_id: selectedTerm,
        subject_id: addSubjectId,
        teacher_id: isPrimary ? null : (addTeacherId || null),
        weekly_hours: addHours || null,
      });
      if (res.data?.data) setItems(prev => [...prev, res.data.data]);
      setAddSubjectId(''); setAddTeacherId(''); setAddHours('');
      Swal.fire({ icon: 'success', title: 'Subject added', timer: 1200, showConfirmButton: false });
    } catch (error) {
      Swal.fire('Error', error.response?.data?.message || 'Failed to add', 'error');
    } finally {
      setIsAdding(false);
    }
  };

  const handleUpdate = async (id) => {
    try {
      await put(`/class-management/grade-subjects/${id}`, {
        teacher_id: editTeacher || null,
        weekly_hours: editHours || null,
      });
      fetchItems();
      setEditingId(null);
      Swal.fire({ icon: 'success', title: 'Updated', timer: 1200, showConfirmButton: false });
    } catch { Swal.fire('Error', 'Failed to update', 'error'); }
  };

  const handleDelete = async (id) => {
    const res = await Swal.fire({ title: 'Remove subject?', text: 'This will remove it from all classes in this grade.', icon: 'warning', showCancelButton: true, confirmButtonColor: '#ef4444', confirmButtonText: 'Remove' });
    if (res.isConfirmed) {
      try { await del(`/class-management/grade-subjects/${id}`); } catch {}
      setItems(prev => prev.filter(i => i.id !== id));
      Swal.fire({ icon: 'success', title: 'Removed', timer: 1200, showConfirmButton: false });
    }
  };

  const startEdit = (item) => {
    setEditingId(item.id);
    setEditTeacher(item.teacher_id || '');
    setEditHours(item.weekly_hours || '');
  };

  const gradeName = grades.find(g => g.id == selectedGrade)?.name || '';
  const availableSubjects = subjects.filter(s => !items.some(i => i.subject_id === s.id));

  return (
    <div className="px-4 py-5 space-y-5">
      {/* Header */}
      <div>
        <h1 className="text-lg font-bold text-gray-800">Grade Subjects</h1>
        <p className="text-xs text-gray-400 mt-0.5">Assign subjects and teachers to grade levels — shared by all classes in the grade</p>
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
            <h3 className="text-sm font-bold text-gray-800 mb-4">Add Subject to {gradeName}</h3>
            <div className={`grid grid-cols-1 ${isPrimary ? 'sm:grid-cols-3' : 'sm:grid-cols-4'} gap-3 items-end`}>
              <div className={isPrimary ? '' : ''}>
                <label className="block text-[10px] font-semibold text-gray-400 uppercase mb-1">Subject *</label>
                <SearchSelect options={availableSubjects} value={addSubjectId} onChange={v => setAddSubjectId(v || '')}
                  placeholder="Select subject..." getLabel={s => `${s.subject_code} — ${s.subject_name}`} getValue={s => s.id} />
              </div>
              {!isPrimary && (
                <div>
                  <label className="block text-[10px] font-semibold text-gray-400 uppercase mb-1">Teacher</label>
                  <select value={addTeacherId} onChange={e => setAddTeacherId(e.target.value)}
                    className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-teal-500 bg-white outline-none">
                    <option value="">Select teacher...</option>
                    {staff.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                  </select>
                </div>
              )}
              <div>
                <label className="block text-[10px] font-semibold text-gray-400 uppercase mb-1">Weekly Hours</label>
                <input type="number" value={addHours} onChange={e => setAddHours(e.target.value)} min={1} max={20} placeholder="e.g. 4"
                  className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-teal-500 bg-white outline-none" />
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
            <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
              <h3 className="text-sm font-bold text-gray-800">Subjects for {gradeName}</h3>
              <span className="text-xs text-gray-400">{items.length} subjects</span>
            </div>

            {loading ? (
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
                      <th className="px-4 py-3 text-left text-[10px] font-bold text-gray-500 uppercase tracking-wider">Teacher</th>
                      <th className="px-4 py-3 text-center text-[10px] font-bold text-gray-500 uppercase tracking-wider">Hours/Week</th>
                      <th className="px-4 py-3 text-right text-[10px] font-bold text-gray-500 uppercase tracking-wider">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {items.map(item => (
                      <tr key={item.id} className="hover:bg-gray-50/80 transition-colors">
                        <td className="px-4 py-3">
                          <p className="text-sm font-semibold text-gray-800">{item.subject_name}</p>
                          <p className="text-[10px] text-gray-400">{item.subject_code}</p>
                        </td>
                        <td className="px-4 py-3">
                          <span className="text-xs text-gray-600">{item.category}</span>
                        </td>
                        <td className="px-4 py-3">
                          {isPrimary ? (
                            <span className="text-xs text-amber-700 italic">Class supervisor</span>
                          ) : editingId === item.id ? (
                            <select value={editTeacher} onChange={e => setEditTeacher(e.target.value)}
                              className="w-full px-2 py-1.5 border border-gray-200 rounded-lg text-xs focus:ring-2 focus:ring-teal-500 bg-white outline-none">
                              <option value="">No teacher</option>
                              {staff.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                            </select>
                          ) : (
                            <span className="text-sm text-gray-700">{item.teacher_name || <span className="text-gray-400">—</span>}</span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-center">
                          {editingId === item.id ? (
                            <input type="number" value={editHours} onChange={e => setEditHours(e.target.value)} min={1} max={20}
                              className="w-16 px-2 py-1.5 border border-gray-200 rounded-lg text-xs text-center focus:ring-2 focus:ring-teal-500 bg-white outline-none mx-auto" />
                          ) : (
                            <span className="text-sm text-gray-700">{item.weekly_hours ? `${item.weekly_hours}h` : '—'}</span>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center justify-end gap-1">
                            {editingId === item.id ? (
                              <>
                                <button onClick={() => handleUpdate(item.id)}
                                  className="px-2.5 py-1.5 bg-teal-600 text-white text-[10px] font-semibold rounded-lg hover:bg-teal-700">Save</button>
                                <button onClick={() => setEditingId(null)}
                                  className="px-2.5 py-1.5 bg-gray-100 text-gray-600 text-[10px] font-semibold rounded-lg hover:bg-gray-200">Cancel</button>
                              </>
                            ) : (
                              <>
                                <button onClick={() => startEdit(item)}
                                  className="p-1.5 text-teal-600 hover:bg-teal-50 rounded-lg transition-colors" title="Edit">
                                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                                </button>
                                <button onClick={() => handleDelete(item.id)}
                                  className="p-1.5 text-red-500 hover:bg-red-50 rounded-lg transition-colors" title="Remove">
                                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                                </button>
                              </>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
