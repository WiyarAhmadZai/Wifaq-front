import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import Swal from "sweetalert2";
import { getPlan, storeCheckIn } from "../../api/planning";
import { PageHeader, Section, Spinner, InfoNote } from "../../components/hr/HrUI";
import { DimensionBadge, ProgressBar } from "./planUtils";

const ICON = "M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z";
const input = "w-full px-2.5 py-1.5 border border-gray-200 rounded-lg text-xs focus:ring-2 focus:ring-teal-500";

export default function CheckIn() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [plan, setPlan] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [draft, setDraft] = useState({}); // kr.id -> {current_value, confidence_score, flag_at_risk, narrative}

  useEffect(() => {
    getPlan(id).then((r) => {
      const p = r.data?.data || r.data;
      setPlan(p);
      const seed = {};
      (p.objectives || []).forEach((o) => (o.key_results || []).forEach((k) => {
        seed[k.id] = {
          current_value: k.current_value ?? "",
          confidence_score: k.confidence_score ?? "",
          flag_at_risk: !!k.at_risk,
          narrative: "",
        };
      }));
      setDraft(seed);
    }).catch(() => setPlan(null)).finally(() => setLoading(false));
  }, [id]);

  const upd = (krId, patch) => setDraft((d) => ({ ...d, [krId]: { ...d[krId], ...patch } }));

  const saveAll = async () => {
    setSaving(true);
    try {
      const krs = (plan.objectives || []).flatMap((o) => o.key_results || []);
      for (const k of krs) {
        const d = draft[k.id];
        if (!d) continue;
        await storeCheckIn(k.id, {
          current_value: d.current_value === "" ? null : Number(d.current_value),
          confidence_score: d.confidence_score === "" ? null : Number(d.confidence_score),
          flag_at_risk: !!d.flag_at_risk,
          narrative: d.narrative || null,
        });
      }
      await Swal.fire({ icon: "success", title: "Check-in saved", timer: 1300, showConfirmButton: false });
      navigate(`/planning/plans/show/${id}`);
    } catch (e) {
      Swal.fire("Error", e.response?.data?.message || "Could not save the check-in.", "error");
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="py-20 text-center"><Spinner /></div>;
  if (!plan) return <div className="px-4 py-5"><Section title="Plan not found" /></div>;

  return (
    <div className="px-4 py-5">
      <PageHeader title={`Check-in · ${plan.title}`} subtitle="Update each KR's progress and confidence" icon={ICON}
        actions={<button onClick={saveAll} disabled={saving} className="px-3.5 py-2 bg-white text-teal-700 text-xs font-bold rounded-xl hover:bg-teal-50 disabled:opacity-50">{saving ? "Saving…" : "Save check-in"}</button>} />

      <InfoNote tone="teal" title="Why this matters">
        Confidence scores let you see drift early. If a 0.7 drops to 0.4, flag it at risk and note what's blocking — don't wait for the reflection.
      </InfoNote>

      {(plan.objectives || []).map((o) => (
        <Section key={o.id} title={o.statement} icon="M9 12l2 2 4-4" action={<DimensionBadge dimension={o.primary_4d_dimension} />}>
          <div className="space-y-3">
            {(o.key_results || []).map((k) => {
              const d = draft[k.id] || {};
              return (
                <div key={k.id} className="rounded-xl border border-gray-100 p-3 bg-gray-50/50">
                  <div className="text-xs font-semibold text-gray-700 mb-1">{k.statement}</div>
                  <div className="text-[11px] text-gray-400 mb-2">Baseline {k.baseline ?? "—"}{k.unit} → Target {k.target ?? "—"}{k.unit}</div>
                  <ProgressBar value={k.progress} />
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 mt-3">
                    <div>
                      <label className="text-[10px] font-semibold uppercase tracking-wider text-gray-500">Where it is now</label>
                      <input className={input} value={d.current_value} onChange={(e) => upd(k.id, { current_value: e.target.value })} placeholder={`value ${k.unit || ""}`} />
                    </div>
                    <div>
                      <label className="text-[10px] font-semibold uppercase tracking-wider text-gray-500">How sure (0–1)</label>
                      <input type="number" step="0.1" min="0" max="1" className={input} value={d.confidence_score} onChange={(e) => upd(k.id, { confidence_score: e.target.value })} />
                    </div>
                    <div>
                      <label className="text-[10px] font-semibold uppercase tracking-wider text-gray-500">Behind schedule?</label>
                      <select className={input} value={d.flag_at_risk ? "1" : "0"} onChange={(e) => upd(k.id, { flag_at_risk: e.target.value === "1" })}>
                        <option value="0">No</option>
                        <option value="1">Yes — needs attention</option>
                      </select>
                    </div>
                  </div>
                  <div className="mt-2">
                    <label className="text-[10px] font-semibold uppercase tracking-wider text-gray-500">What's helping or getting in the way</label>
                    <textarea className={input} rows={2} value={d.narrative} onChange={(e) => upd(k.id, { narrative: e.target.value })} placeholder="2–3 lines, optional" />
                  </div>
                  {(k.check_ins || []).length > 0 && (
                    <div className="mt-2 text-[10px] text-gray-400">
                      Last check-in: {k.check_ins[0].checked_at} · value {k.check_ins[0].current_value ?? "—"} · conf {k.check_ins[0].confidence_score ?? "—"}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </Section>
      ))}
    </div>
  );
}
