import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import Swal from "sweetalert2";
import { getPlan, getReflection, saveReflection } from "../../api/planning";
import { PageHeader, Section, Spinner, InfoNote } from "../../components/hr/HrUI";

const ICON = "M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z";
const input = "w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-teal-500";

export default function Reflect() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [plan, setPlan] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ what_worked: "", what_didnt: "", lessons: "" });
  const [carry, setCarry] = useState({}); // item.id -> bool

  useEffect(() => {
    (async () => {
      try {
        const p = (await getPlan(id)).data?.data;
        setPlan(p);
        const r = (await getReflection(id)).data?.data;
        if (r) {
          setForm({ what_worked: r.what_worked || "", what_didnt: r.what_didnt || "", lessons: r.lessons || "" });
          const sel = {}; (r.items_to_carry || []).forEach((iid) => (sel[iid] = true));
          setCarry(sel);
        } else {
          // Q3 default: pre-select missed items for carry.
          const sel = {}; (p.items || []).forEach((it) => { if (it.state === "missed") sel[it.id] = true; });
          setCarry(sel);
        }
      } catch { setPlan(null); }
      finally { setLoading(false); }
    })();
  }, [id]);

  const save = async () => {
    setSaving(true);
    try {
      await saveReflection(id, {
        ...form,
        items_to_carry: Object.entries(carry).filter(([, v]) => v).map(([k]) => Number(k)),
      });
      await Swal.fire({ icon: "success", title: "Reflection saved", timer: 1300, showConfirmButton: false });
      navigate(`/planning/plans/show/${id}`);
    } catch (e) {
      Swal.fire("Error", e.response?.data?.message || "Could not save the reflection.", "error");
    } finally { setSaving(false); }
  };

  if (loading) return <div className="py-20 text-center"><Spinner /></div>;
  if (!plan) return <div className="px-4 py-5"><Section title="Plan not found" /></div>;

  const items = plan.items || [];
  const done = items.filter((i) => i.state === "done").length;
  const krs = (plan.objectives || []).flatMap((o) => o.key_results || []);

  return (
    <div className="px-4 py-5">
      <PageHeader title={`Reflect · ${plan.title}`} subtitle="End-of-cycle · required before archiving" icon={ICON}
        actions={<button onClick={save} disabled={saving} className="px-3.5 py-2 bg-white text-teal-700 text-xs font-bold rounded-xl hover:bg-teal-50 disabled:opacity-50">{saving ? "Saving…" : "Save reflection"}</button>} />

      <InfoNote tone="teal" title="Act — close the loop">
        A reflection is required before a plan can be archived. Tick the items worth carrying forward into the next plan.
      </InfoNote>

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_300px] gap-4">
        <Section title="4 questions" icon={ICON}>
          {[
            ["what_worked", "1 · What worked this cycle?"],
            ["what_didnt", "2 · What didn't work?"],
            ["lessons", "3 · What did we learn?"],
          ].map(([k, lbl]) => (
            <div key={k} className="mb-4">
              <label className="block text-[11px] font-semibold uppercase tracking-wider text-gray-500 mb-1">{lbl}</label>
              <textarea className={input} rows={3} value={form[k]} onChange={(e) => setForm((f) => ({ ...f, [k]: e.target.value }))} />
            </div>
          ))}
        </Section>

        <div className="space-y-4">
          <Section title="Carry forward" subtitle="Copied into the next plan" icon="M17 8l4 4m0 0l-4 4m4-4H3">
            {items.length === 0 ? <p className="text-xs text-gray-400">No items.</p> : (
              <div className="space-y-1">
                {items.map((it) => (
                  <label key={it.id} className="flex items-start gap-2 py-1.5 cursor-pointer">
                    <input type="checkbox" className="mt-0.5" checked={!!carry[it.id]} onChange={(e) => setCarry((c) => ({ ...c, [it.id]: e.target.checked }))} />
                    <div>
                      <div className="text-xs font-semibold text-gray-700">{it.title}</div>
                      <div className="text-[10px] text-gray-400 capitalize">{(it.state || "planned").replace("_", " ")}</div>
                    </div>
                  </label>
                ))}
              </div>
            )}
          </Section>

          <Section title="Recap" icon="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z">
            <div className="text-sm space-y-1.5">
              <Row k="Items completed">{done} / {items.length}</Row>
              <Row k="Key results">{krs.length}</Row>
              <Row k="At-risk KRs">{krs.filter((k) => k.at_risk).length}</Row>
            </div>
          </Section>
        </div>
      </div>
    </div>
  );
}

function Row({ k, children }) {
  return <div className="flex justify-between border-b border-gray-50 pb-1.5 last:border-0"><span className="text-gray-400 text-xs">{k}</span><span className="text-gray-700 text-xs font-semibold">{children}</span></div>;
}
