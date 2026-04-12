import { useState, useEffect } from 'react';
import { get, post, del } from '../../api/axios';
import Swal from 'sweetalert2';

const DAY_LABELS = {
  saturday: 'Sat', sunday: 'Sun', monday: 'Mon',
  tuesday: 'Tue', wednesday: 'Wed', thursday: 'Thu',
};
const DAY_LABELS_FULL = {
  saturday: 'Saturday', sunday: 'Sunday', monday: 'Monday',
  tuesday: 'Tuesday', wednesday: 'Wednesday', thursday: 'Thursday',
};

const CATEGORY_COLORS = {
  'Maarif Subjects': { bg: 'bg-teal-50', border: 'border-teal-200', text: 'text-teal-800', dot: 'bg-teal-500' },
  'Taqwayati Mayari': { bg: 'bg-blue-50', border: 'border-blue-200', text: 'text-blue-800', dot: 'bg-blue-500' },
  'Taqwayati Takhasosi': { bg: 'bg-purple-50', border: 'border-purple-200', text: 'text-purple-800', dot: 'bg-purple-500' },
};
const DEFAULT_COLOR = { bg: 'bg-gray-50', border: 'border-gray-200', text: 'text-gray-800', dot: 'bg-gray-500' };

export default function Schedule() {
  const [viewMode, setViewMode] = useState('class'); // 'class' | 'grade' | 'teacher'
  const [classes, setClasses] = useState([]);
  const [teachers, setTeachers] = useState([]);
  const [grades, setGrades] = useState([]);
  const [terms, setTerms] = useState([]);
  const [selectedTerm, setSelectedTerm] = useState('');
  const [selectedClass, setSelectedClass] = useState('');
  const [selectedGrade, setSelectedGrade] = useState('');
  const [selectedTeacher, setSelectedTeacher] = useState('');
  const [scheduleData, setScheduleData] = useState(null);
  const [gradeData, setGradeData] = useState(null);
  const [activeGradeTab, setActiveGradeTab] = useState(0);
  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const res = await get('/class-management/schedule/form-data');
        setTerms(res.data?.academic_terms || []);
        setTeachers(res.data?.teachers || []);
        if (res.data?.academic_terms?.length) setSelectedTerm(res.data.academic_terms[0].id);
        // Fetch grades list
        const gRes = await get('/grades/list');
        setGrades(gRes.data?.data || []);
      } catch {}
    })();
  }, []);

  useEffect(() => {
    if (!selectedTerm) return;
    (async () => {
      try {
        const res = await get(`/class-management/schedule/form-data?academic_term_id=${selectedTerm}`);
        setClasses(res.data?.classes || []);
      } catch {}
    })();
  }, [selectedTerm]);

  useEffect(() => {
    if (viewMode === 'class' && selectedClass) fetchClassSchedule();
    else if (viewMode === 'grade' && selectedGrade && selectedTerm) fetchGradeSchedule();
    else if (viewMode === 'teacher' && selectedTeacher && selectedTerm) fetchTeacherSchedule();
    else { setScheduleData(null); setGradeData(null); }
  }, [selectedClass, selectedGrade, selectedTeacher, viewMode]);

  const fetchClassSchedule = async () => {
    setLoading(true);
    try {
      const res = await get(`/class-management/schedule/class?class_id=${selectedClass}`);
      setScheduleData(res.data);
    } catch { setScheduleData(null); }
    finally { setLoading(false); }
  };

  const fetchGradeSchedule = async () => {
    setLoading(true);
    try {
      const res = await get(`/class-management/schedule/grade?grade_id=${selectedGrade}&academic_term_id=${selectedTerm}`);
      setGradeData(res.data);
      setActiveGradeTab(0);
      setScheduleData(null);
    } catch { setGradeData(null); }
    finally { setLoading(false); }
  };

  const fetchTeacherSchedule = async () => {
    setLoading(true);
    try {
      const res = await get(`/class-management/schedule/teacher?teacher_id=${selectedTeacher}&academic_term_id=${selectedTerm}`);
      setScheduleData(res.data);
    } catch { setScheduleData(null); }
    finally { setLoading(false); }
  };

  const handleGenerate = async () => {
    const confirm = await Swal.fire({
      title: 'Generate Schedule?',
      html: '<p class="text-sm text-gray-600">This will <strong>clear all existing schedules</strong> for this term and auto-generate new ones based on grade subjects and teacher assignments.</p>',
      icon: 'question',
      showCancelButton: true,
      confirmButtonColor: '#0d9488',
      confirmButtonText: 'Generate',
    });
    if (!confirm.isConfirmed) return;

    setGenerating(true);
    try {
      const res = await post('/class-management/schedule/generate', { academic_term_id: selectedTerm });
      const summary = res.data?.summary;
      let html = `<p class="text-sm font-semibold mb-2">${res.data?.message}</p>`;
      if (summary?.classes?.length) {
        html += '<div class="text-left text-xs max-h-48 overflow-y-auto mt-2 space-y-1">';
        summary.classes.forEach(c => {
          const icon = c.conflicts > 0 ? '⚠️' : '✅';
          html += `<div class="flex justify-between py-1 border-b border-gray-100"><span>${icon} ${c.class}</span><span class="text-gray-500">${c.placed} placed${c.conflicts ? `, <span class="text-red-600">${c.conflicts} unplaced</span>` : ''}</span></div>`;
        });
        html += '</div>';
      }
      await Swal.fire({ icon: 'success', title: 'Schedule Generated', html, confirmButtonColor: '#0d9488' });
      if (viewMode === 'class' && selectedClass) fetchClassSchedule();
      if (viewMode === 'grade' && selectedGrade) fetchGradeSchedule();
      if (viewMode === 'teacher' && selectedTeacher) fetchTeacherSchedule();
      // Refresh class list
      try {
        const r = await get(`/class-management/schedule/form-data?academic_term_id=${selectedTerm}`);
        setClasses(r.data?.classes || []);
      } catch {}
    } catch (error) {
      Swal.fire('Error', error.response?.data?.message || 'Failed to generate', 'error');
    } finally {
      setGenerating(false);
    }
  };

  const handleDeleteEntry = async (entryId) => {
    try {
      await del(`/class-management/schedule/entry/${entryId}`);
      if (viewMode === 'class') fetchClassSchedule();
      else fetchTeacherSchedule();
    } catch {}
  };

  const handleClearClass = async () => {
    if (!selectedClass) return;
    const confirm = await Swal.fire({
      title: 'Clear schedule?', text: 'Remove all periods for this class?',
      icon: 'warning', showCancelButton: true, confirmButtonColor: '#ef4444', confirmButtonText: 'Clear',
    });
    if (!confirm.isConfirmed) return;
    try {
      await post('/class-management/schedule/clear', { class_id: selectedClass });
      fetchClassSchedule();
      Swal.fire({ icon: 'success', title: 'Cleared', timer: 1200, showConfirmButton: false });
    } catch {}
  };

  // Drag and drop
  const [dragEntry, setDragEntry] = useState(null);
  const [dragOver, setDragOver] = useState(null); // "day-period"

  const handleDragStart = (entry) => {
    setDragEntry(entry);
  };

  const handleDrop = async (targetDay, targetPeriod) => {
    if (!dragEntry) return;
    // Don't drop on same slot
    if (dragEntry.day === targetDay && dragEntry.period === targetPeriod) {
      setDragEntry(null);
      setDragOver(null);
      return;
    }

    try {
      await post('/class-management/schedule/swap', {
        source_id: dragEntry.id,
        target_day: targetDay,
        target_period: targetPeriod,
      });
      fetchClassSchedule();
    } catch (error) {
      Swal.fire('Cannot Move', error.response?.data?.message || 'Failed to move entry', 'error');
    }
    setDragEntry(null);
    setDragOver(null);
  };

  const days = scheduleData?.days || [];
  const periodsCount = scheduleData?.periods_count || 6;
  const entries = scheduleData?.entries || [];

  const getEntry = (day, period) => {
    if (viewMode === 'class') return entries.find(e => e.day === day && e.period === period);
    return entries.filter(e => e.day === day && e.period === period);
  };

  const classInfo = scheduleData?.class;
  const hasEntries = entries.length > 0;

  return (
    <div className="px-4 py-5 space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-lg font-bold text-gray-800">Class Schedule</h1>
          <p className="text-xs text-gray-400 mt-0.5">View and auto-generate weekly timetables</p>
        </div>
        <div className="flex gap-2">
          {(scheduleData || gradeData) && (
            <button onClick={() => window.print()}
              className="inline-flex items-center gap-2 px-3 py-2 bg-white border border-gray-200 text-gray-700 text-xs font-semibold rounded-xl hover:bg-gray-50 transition-colors">
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" /></svg>
              Print
            </button>
          )}
          {viewMode === 'class' && selectedClass && hasEntries && (
            <button onClick={handleClearClass}
              className="inline-flex items-center gap-2 px-3 py-2 bg-white border border-red-200 text-red-600 text-xs font-semibold rounded-xl hover:bg-red-50 transition-colors">
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
              Clear
            </button>
          )}
          <button onClick={handleGenerate} disabled={!selectedTerm || generating}
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-teal-600 text-white text-sm font-semibold rounded-xl hover:bg-teal-700 transition-colors shadow-sm disabled:opacity-50">
            {generating ? (
              <><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />Generating...</>
            ) : (
              <><svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>Generate Schedule</>
            )}
          </button>
        </div>
      </div>

      {/* Controls */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
        <div className="flex items-center gap-2 mb-4">
          {[{ key: 'class', label: 'By Class' }, { key: 'grade', label: 'By Grade' }, { key: 'teacher', label: 'By Teacher' }].map(mode => (
            <button key={mode.key} onClick={() => { setViewMode(mode.key); setScheduleData(null); setGradeData(null); }}
              className={`px-4 py-2 rounded-xl text-xs font-semibold transition-all ${viewMode === mode.key ? 'bg-teal-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>
              {mode.label}
            </button>
          ))}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-[11px] font-semibold text-gray-500 uppercase tracking-wider mb-1.5">Academic Term</label>
            <select value={selectedTerm} onChange={e => { setSelectedTerm(e.target.value); setSelectedClass(''); setSelectedGrade(''); setSelectedTeacher(''); setScheduleData(null); setGradeData(null); }}
              className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-teal-500 bg-white outline-none">
              <option value="">Select term...</option>
              {terms.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
            </select>
          </div>

          {viewMode === 'class' && (
            <div>
              <label className="block text-[11px] font-semibold text-gray-500 uppercase tracking-wider mb-1.5">Class</label>
              <select value={selectedClass} onChange={e => setSelectedClass(e.target.value)}
                className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-teal-500 bg-white outline-none">
                <option value="">Select class...</option>
                {classes.map(c => (
                  <option key={c.id} value={c.id}>{c.name} ({c.shift === 'morning' ? 'AM' : 'PM'}){c.has_schedule ? ' ✓' : ''}</option>
                ))}
              </select>
            </div>
          )}

          {viewMode === 'grade' && (
            <div>
              <label className="block text-[11px] font-semibold text-gray-500 uppercase tracking-wider mb-1.5">Grade</label>
              <select value={selectedGrade} onChange={e => setSelectedGrade(e.target.value)}
                className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-teal-500 bg-white outline-none">
                <option value="">Select grade...</option>
                {grades.map(g => <option key={g.id} value={g.id}>{g.name}</option>)}
              </select>
            </div>
          )}

          {viewMode === 'teacher' && (
            <div>
              <label className="block text-[11px] font-semibold text-gray-500 uppercase tracking-wider mb-1.5">Teacher</label>
              <select value={selectedTeacher} onChange={e => setSelectedTeacher(e.target.value)}
                className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-teal-500 bg-white outline-none">
                <option value="">Select teacher...</option>
                {teachers.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
              </select>
            </div>
          )}
        </div>
      </div>

      {/* Class info banner */}
      {viewMode === 'class' && classInfo && (
        <div className="flex items-center gap-3 p-3 bg-teal-50 border border-teal-200 rounded-xl">
          <div className="w-10 h-10 rounded-xl bg-teal-600 flex items-center justify-center text-white font-bold text-sm flex-shrink-0">
            {classInfo.shift === 'morning' ? 'AM' : 'PM'}
          </div>
          <div>
            <p className="text-sm font-bold text-teal-900">{classInfo.name}</p>
            <p className="text-[11px] text-teal-700">{classInfo.grade} · Section {classInfo.section} · {classInfo.shift === 'morning' ? 'Morning' : 'Afternoon'} Shift</p>
          </div>
          <div className="ml-auto text-right">
            <p className="text-lg font-black text-teal-700">{entries.length}</p>
            <p className="text-[10px] text-teal-600">periods</p>
          </div>
        </div>
      )}

      {/* Timetable Grid */}
      {loading ? (
        <div className="text-center py-16">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-2 border-teal-600 border-t-transparent" />
          <p className="mt-2 text-gray-400 text-xs">Loading schedule...</p>
        </div>
      ) : scheduleData ? (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[700px]">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-100">
                  <th className="px-3 py-3 text-left text-[10px] font-bold text-gray-500 uppercase tracking-wider w-20 sticky left-0 bg-gray-50 z-10">Period</th>
                  {days.map(day => (
                    <th key={day} className="px-2 py-3 text-center text-[10px] font-bold text-gray-500 uppercase tracking-wider">
                      <span className="hidden sm:inline">{DAY_LABELS_FULL[day]}</span>
                      <span className="sm:hidden">{DAY_LABELS[day]}</span>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {Array.from({ length: periodsCount }, (_, i) => i + 1).map(period => (
                  <tr key={period} className="border-b border-gray-50">
                    <td className="px-3 py-2 sticky left-0 bg-white z-10">
                      <div className="flex items-center gap-2">
                        <span className="w-7 h-7 rounded-lg bg-teal-100 text-teal-700 flex items-center justify-center text-xs font-bold flex-shrink-0">{period}</span>
                      </div>
                    </td>
                    {days.map(day => {
                      if (viewMode === 'class') {
                        const entry = getEntry(day, period);
                        const colors = entry ? (CATEGORY_COLORS[entry.category] || DEFAULT_COLOR) : null;
                        const isDragTarget = dragOver === `${day}-${period}`;
                        return (
                          <td key={day} className="px-1 py-1"
                            onDragOver={e => { e.preventDefault(); setDragOver(`${day}-${period}`); }}
                            onDragLeave={() => setDragOver(null)}
                            onDrop={e => { e.preventDefault(); handleDrop(day, period); }}>
                            {entry ? (
                              <div draggable
                                onDragStart={() => handleDragStart(entry)}
                                onDragEnd={() => { setDragEntry(null); setDragOver(null); }}
                                className={`p-2 rounded-xl border ${colors.bg} ${colors.border} group relative min-h-[52px] cursor-grab active:cursor-grabbing transition-all ${dragEntry?.id === entry.id ? 'opacity-40 scale-95' : ''} ${isDragTarget ? 'ring-2 ring-teal-400' : ''}`}>
                                <div className="flex items-start gap-1.5">
                                  <div className={`w-1.5 h-1.5 rounded-full ${colors.dot} mt-1.5 flex-shrink-0`} />
                                  <div className="min-w-0 flex-1">
                                    <p className={`text-[11px] font-semibold ${colors.text} leading-tight`}>{entry.subject_name}</p>
                                    <p className="text-[9px] text-gray-400 mt-0.5 truncate">{entry.teacher_name || '—'}</p>
                                  </div>
                                </div>
                                <button onClick={() => handleDeleteEntry(entry.id)}
                                  className="absolute top-1 right-1 p-0.5 text-gray-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity">
                                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                                </button>
                              </div>
                            ) : (
                              <div className={`min-h-[52px] rounded-xl border border-dashed transition-all ${isDragTarget ? 'border-teal-400 bg-teal-50 ring-2 ring-teal-200' : 'border-gray-200 bg-gray-50/50'}`} />
                            )}
                          </td>
                        );
                      } else if (viewMode === 'teacher') {
                        const dayEntries = getEntry(day, period);
                        return (
                          <td key={day} className="px-1 py-1">
                            {dayEntries.length > 0 ? (
                              <div className="space-y-1">
                                {dayEntries.map(entry => {
                                  const colors = CATEGORY_COLORS[entry.category] || DEFAULT_COLOR;
                                  return (
                                    <div key={entry.id} className={`p-2 rounded-xl border ${colors.bg} ${colors.border} min-h-[52px]`}>
                                      <p className={`text-[11px] font-semibold ${colors.text} leading-tight`}>{entry.subject_name}</p>
                                      <p className="text-[9px] text-gray-400 mt-0.5 truncate">{entry.class_name} ({entry.shift === 'morning' ? 'AM' : 'PM'})</p>
                                    </div>
                                  );
                                })}
                              </div>
                            ) : (
                              <div className="min-h-[52px] rounded-xl border border-dashed border-gray-200 bg-gray-50/50" />
                            )}
                          </td>
                        );
                      }
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Legend */}
          <div className="px-4 py-3 bg-gray-50 border-t border-gray-100 flex items-center gap-4 flex-wrap">
            <p className="text-[10px] text-gray-400 font-semibold uppercase">Legend:</p>
            {Object.entries(CATEGORY_COLORS).map(([cat, colors]) => (
              <div key={cat} className="flex items-center gap-1.5">
                <div className={`w-2.5 h-2.5 rounded-full ${colors.dot}`} />
                <span className="text-[10px] text-gray-600">{cat}</span>
              </div>
            ))}
          </div>
        </div>
      ) : viewMode === 'grade' && gradeData && gradeData.classes?.length > 0 ? (
        <div className="space-y-4">
          {/* Grade header + section tabs */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
            <div className="px-5 py-3 bg-teal-50 border-b border-teal-100 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-teal-600 flex items-center justify-center text-white font-bold text-xs">{gradeData.grade_name?.replace('Grade ', '').substring(0, 3)}</div>
                <h3 className="text-sm font-bold text-gray-800">{gradeData.grade_name} — All Sections</h3>
              </div>
              <span className="text-xs text-gray-500">{gradeData.classes.length} class(es)</span>
            </div>
            <div className="px-5 py-3 flex items-center gap-2 border-b border-gray-100">
              {gradeData.classes.map((cls, idx) => (
                <button key={cls.class_id} onClick={() => setActiveGradeTab(idx)}
                  className={`px-4 py-2 rounded-xl text-xs font-semibold transition-all ${activeGradeTab === idx ? 'bg-teal-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>
                  Section {cls.section}
                  <span className={`ml-1.5 text-[10px] ${activeGradeTab === idx ? 'text-teal-200' : 'text-gray-400'}`}>
                    ({cls.shift === 'morning' ? 'AM' : 'PM'})
                  </span>
                </button>
              ))}
              <span className="ml-auto text-[10px] text-gray-400">Click a section to view its timetable</span>
            </div>

            {/* Active section timetable */}
            {(() => {
              const cls = gradeData.classes[activeGradeTab];
              if (!cls) return null;
              const clsEntries = cls.entries || [];
              const gDays = gradeData.days || [];
              const gPeriods = gradeData.periods_count || 6;
              const getClsEntry = (day, period) => clsEntries.find(e => e.day === day && e.period === period);

              return (
                <>
                  <div className="px-5 py-2 flex items-center gap-3 bg-gray-50">
                    <p className="text-xs font-semibold text-gray-700">{cls.class_name}</p>
                    <span className="text-[10px] text-gray-400">{clsEntries.length} periods scheduled</span>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full min-w-[700px]">
                      <thead>
                        <tr className="bg-gray-50 border-b border-gray-100">
                          <th className="px-3 py-3 text-left text-[10px] font-bold text-gray-500 uppercase tracking-wider w-20">Period</th>
                          {gDays.map(day => (
                            <th key={day} className="px-2 py-3 text-center text-[10px] font-bold text-gray-500 uppercase tracking-wider">
                              <span className="hidden sm:inline">{DAY_LABELS_FULL[day]}</span>
                              <span className="sm:hidden">{DAY_LABELS[day]}</span>
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {Array.from({ length: gPeriods }, (_, i) => i + 1).map(period => (
                          <tr key={period} className="border-b border-gray-50">
                            <td className="px-3 py-2">
                              <span className="w-7 h-7 rounded-lg bg-teal-100 text-teal-700 flex items-center justify-center text-xs font-bold">{period}</span>
                            </td>
                            {gDays.map(day => {
                              const entry = getClsEntry(day, period);
                              const colors = entry ? (CATEGORY_COLORS[entry.category] || DEFAULT_COLOR) : null;
                              return (
                                <td key={day} className="px-1 py-1">
                                  {entry ? (
                                    <div className={`p-2 rounded-xl border ${colors.bg} ${colors.border} min-h-[52px]`}>
                                      <div className="flex items-start gap-1.5">
                                        <div className={`w-1.5 h-1.5 rounded-full ${colors.dot} mt-1.5 flex-shrink-0`} />
                                        <div className="min-w-0 flex-1">
                                          <p className={`text-[11px] font-semibold ${colors.text} leading-tight`}>{entry.subject_name}</p>
                                          <p className="text-[9px] text-gray-400 mt-0.5 truncate">{entry.teacher_name || '—'}</p>
                                        </div>
                                      </div>
                                    </div>
                                  ) : (
                                    <div className="min-h-[52px] rounded-xl border border-dashed border-gray-200 bg-gray-50/50" />
                                  )}
                                </td>
                              );
                            })}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </>
              );
            })()}

            {/* Legend */}
            <div className="px-4 py-3 bg-gray-50 border-t border-gray-100 flex items-center gap-4 flex-wrap">
              <p className="text-[10px] text-gray-400 font-semibold uppercase">Legend:</p>
              {Object.entries(CATEGORY_COLORS).map(([cat, colors]) => (
                <div key={cat} className="flex items-center gap-1.5">
                  <div className={`w-2.5 h-2.5 rounded-full ${colors.dot}`} />
                  <span className="text-[10px] text-gray-600">{cat}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-16 text-center">
          <div className="w-16 h-16 bg-teal-50 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-teal-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
          </div>
          <p className="text-sm font-medium text-gray-600">
            Select a {viewMode === 'class' ? 'class' : viewMode === 'grade' ? 'grade' : 'teacher'} to view the schedule
          </p>
          <p className="text-xs text-gray-400 mt-1">Or click "Generate Schedule" to auto-create timetables for all classes</p>
        </div>
      )}
    </div>
  );
}
