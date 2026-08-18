import { useState, useEffect, useCallback, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { get, post, del, peekCache } from "../../api/axios";
import Swal from "sweetalert2";
import { DIMS, DimPill, Spinner, StudentName, StudentPicker, cleanClass, TEAL } from "./weeklyUi";


/**
 * Teachers' screen: notice a student through the week and nominate them for the
 * week's topic. Several teachers nominating the same student is the point —
 * each nomination stacks as evidence the lead reads at review time.
 */
export default function WeeklyNominate() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState(null);
  const [saving, setSaving] = useState(false);

  const [studentId, setStudentId] = useState("");
  const [dims, setDims] = useState([]);
  const [reason, setReason] = useState("");

  const load = useCallback(async () => {
    const cached = peekCache("/weekly-recognition");
    if (cached) { setData(cached); setLoading(false); }
    try {
      const res = await get("/weekly-recognition");
      setData(res.data);
    } catch {
      Swal.fire("Error", "Failed to load this week's topic", "error");
    } finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const topic = data?.topic;
  const canNominate = Boolean(data?.can_nominate);
  const students = useMemo(() => data?.students || [], [data]);

  // Pre-select the topic's leaning area — most nominations follow it.
  useEffect(() => {
    if (topic?.primary_dimension && dims.length === 0) setDims([topic.primary_dimension]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [topic?.primary_dimension]);

  const toggleDim = (d) => setDims((prev) => (prev.includes(d) ? prev.filter((x) => x !== d) : [...prev, d]));

  const submit = async () => {
    if (!studentId) return Swal.fire("Pick a student", "Choose who you are nominating.", "info");
    if (dims.length === 0) return Swal.fire("Pick an area", "Which of the four areas did they show it in?", "info");
    if (!reason.trim()) return Swal.fire("Add the reason", "Write the specific contribution or conduct you noticed.", "info");

    setSaving(true);
    try {
      await post("/weekly-recognition/nominations", {
        weekly_topic_id: topic.id,
        student_id: Number(studentId),
        dimensions: dims,
        reason: reason.trim(),
      });
      Swal.fire({ icon: "success", title: "Nomination submitted", timer: 1200, showConfirmButton: false });
      setStudentId(""); setReason("");
      setDims(topic?.primary_dimension ? [topic.primary_dimension] : []);
      load();
    } catch (err) {
      Swal.fire("Error", err.response?.data?.message || "Failed to submit the nomination", "error");
    } finally { setSaving(false); }
  };

  const withdraw = async (n) => {
    const r = await Swal.fire({ title: "Withdraw this nomination?", icon: "warning", showCancelButton: true, confirmButtonColor: "#ef4444" });
    if (!r.isConfirmed) return;
    try { await del(`/weekly-recognition/nominations/${n.id}`); load(); }
    catch (err) { Swal.fire("Error", err.response?.data?.message || "Failed", "error"); }
  };

  if (loading) return <Spinner />;

  if (!topic) {
    return (
      <div className="min-h-screen bg-[#F4F8F8]">
        <div className="px-5 py-4" style={{ background: TEAL }}>
          <h1 className="text-sm font-bold text-white">Nominate a Student</h1>
        </div>
        <div className="max-w-2xl mx-auto px-4 py-10 text-center">
          <div className="text-3xl">🎯</div>
          <p className="text-sm font-semibold text-[#0A3A3E] mt-2">No weekly topic is set yet</p>
          <p className="text-xs text-[#5A7A7E] mt-1">The tarbiyati lead sets the topic before nominations open.</p>
          <button onClick={() => navigate("/education/weekly-recognition")}
            className="mt-4 px-5 py-2 text-xs font-semibold text-white rounded-xl" style={{ background: TEAL }}>
            Go to Weekly Topic
          </button>
        </div>
      </div>
    );
  }

  const closed = topic.status !== "open";

  return (
    <div className="min-h-screen bg-[#F4F8F8]">
      <div className="px-5 py-4" style={{ background: TEAL }}>
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h1 className="text-sm font-bold text-white">Nominate a Student</h1>
            <p className="text-xs text-[#CFE6E6] mt-0.5">
              This week's topic: <span className="font-semibold">{topic.title}</span> · {topic.week_start} → {topic.week_end}
            </p>
          </div>
          <button onClick={() => navigate("/education/weekly-recognition")}
            className="px-4 py-1.5 bg-white/15 hover:bg-white/25 text-white rounded-xl text-xs font-bold">
            🎯 Topic
          </button>
        </div>
      </div>

      <div className="px-4 py-5 space-y-4 max-w-3xl mx-auto">
        {closed && (
          <div className="bg-[#FFF8E7] border border-[#E8D48B] rounded-2xl px-4 py-3 text-xs text-[#8A6F10]">
            This week is already closed for nominations.
          </div>
        )}
        {!canNominate && (
          <div className="bg-[#FFF8E7] border border-[#E8D48B] rounded-2xl px-4 py-3 text-xs text-[#8A6F10]">
            You do not have permission to nominate students.
          </div>
        )}

        {canNominate && !closed && (
          <div className="bg-white rounded-2xl border border-[#D0E0E0] shadow-sm p-4">
            <h3 className="text-[10px] font-bold text-[#5A7A7E] uppercase tracking-wider mb-3">New nomination</h3>

            <StudentPicker students={students} value={studentId}
              onChange={setStudentId} scope={data?.scope} />

            <div className="mt-3">
              <label className="block text-[10px] text-[#5A7A7E] mb-1.5">
                Which area(s) did they show it in? <span className="text-[#8AA4A7]">— pick one or more</span>
              </label>
              <div className="flex flex-wrap gap-2">
                {Object.keys(DIMS).map((d) => (
                  <DimPill key={d} d={d} selected={dims.includes(d)} onClick={() => toggleDim(d)} />
                ))}
              </div>
            </div>

            <div className="mt-3">
              <label className="block text-[10px] text-[#5A7A7E] mb-1">
                What did you notice? <span className="text-[#8AA4A7]">— the specific contribution or conduct</span>
              </label>
              <textarea rows={4} value={reason} onChange={(e) => setReason(e.target.value)}
                placeholder="Be concrete — this is the evidence the tarbiyati lead reads at week's end."
                className="w-full px-3 py-2 border border-[#D0E0E0] rounded-xl text-sm focus:ring-2 focus:ring-[#9CCBCB] focus:outline-none" />
            </div>

            <button onClick={submit} disabled={saving}
              className="mt-4 px-5 py-2 text-xs font-semibold text-white rounded-xl disabled:opacity-50"
              style={{ background: "linear-gradient(135deg,#C9A227,#B08A1E)" }}>
              {saving ? "Submitting…" : "Submit nomination"}
            </button>
            <p className="text-[10px] text-[#8AA4A7] mt-2">
              Several teachers can nominate the same student — each nomination stacks as evidence.
              Re-nominating a student you already nominated updates your own entry.
            </p>
          </div>
        )}

        <div className="bg-white rounded-2xl border border-[#D0E0E0] shadow-sm p-4">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-[10px] font-bold text-[#5A7A7E] uppercase tracking-wider">Your nominations this week</h3>
            <span className="text-[11px] text-[#8AA4A7]">{data?.my_nominations?.length || 0} submitted</span>
          </div>
          {(data?.my_nominations || []).length === 0 ? (
            <p className="text-xs text-[#8AA4A7] py-3">You have not nominated anyone for this topic yet.</p>
          ) : (
            <div className="divide-y divide-[#D0E0E0]">
              {data.my_nominations.map((n) => (
                <div key={n.id} className="py-2.5 flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="text-sm font-semibold text-[#0A3A3E]">
                      <StudentName name={n.student} />
                      {cleanClass(n.class) && <span className="text-[#8AA4A7] font-normal text-xs"> · {cleanClass(n.class)}</span>}
                    </div>
                    <p className="text-xs text-[#5A7A7E] mt-0.5">{n.reason}</p>
                    <div className="flex flex-wrap gap-1.5 mt-1.5">
                      {(n.dimensions || []).map((d) => <DimPill key={d} d={d} />)}
                    </div>
                  </div>
                  <button onClick={() => withdraw(n)} className="text-[11px] font-semibold text-red-500 shrink-0">
                    Withdraw
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
