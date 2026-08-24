import { useState, useEffect, useCallback } from "react";
import { useNavigate, useParams } from "react-router-dom";
import Swal from "sweetalert2";
import { get, post, put } from "../../api/axios";
import { useAuth } from "../../admin/context/AuthContext";

const TEAL = "#0D5C63";
const TEAL_LT = "#14919B";
const GOLD = "#C9A227";
const BORDER = "#D0E0E0";
const MUTED = "#5A7A7E";

const TONES = [
  { value: "info",    label: "Announcement", accent: TEAL,      wash: "#E8F6F6" },
  { value: "success", label: "Good news",    accent: "#2E7D5B", wash: "#E6F3EC" },
  { value: "warning", label: "Please note",  accent: "#8A6F10", wash: "#FFF8E7" },
];

const initials = (n) =>
  (n || "?").trim().split(/\s+/).map((w) => w[0]).slice(0, 2).join("").toUpperCase();

const field = "w-full px-3 py-2 border rounded-xl text-sm bg-white focus:ring-2 focus:ring-[#9CCBCB] focus:outline-none";

/**
 * Write a broadcast, with a live preview of the modal everyone will see.
 *
 * The preview is the point of this screen: a message that interrupts every
 * user in the school on their first visit of the day should never be sent
 * blind. What is rendered here is the same layout BroadcastModal draws.
 */
export default function BroadcastForm() {
  const navigate = useNavigate();
  const { id } = useParams();
  const editing = Boolean(id);
  const { user } = useAuth();

  const [loading, setLoading] = useState(editing);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    title: "", body: "", tone: "info", link_url: "", link_label: "", is_active: true,
  });

  const load = useCallback(async () => {
    if (!editing) return;
    try {
      const res = await get(`/broadcasts/show/${id}`);
      const b = res.data.data;
      setForm({
        title: b.title || "", body: b.body || "", tone: b.tone || "info",
        link_url: b.link_url || "", link_label: b.link_label || "",
        is_active: Boolean(b.is_active),
      });
    } catch (err) {
      Swal.fire("Error", err.response?.data?.message || "Failed to load the broadcast.", "error");
    } finally { setLoading(false); }
  }, [editing, id]);

  useEffect(() => { load(); }, [load]);

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const save = async () => {
    if (!form.body.trim()) {
      return Swal.fire("Message needed", "Write what you want everyone to read.", "info");
    }

    // Publishing supersedes whatever is currently on screen for everyone —
    // worth one confirmation, since it cannot be un-seen once people read it.
    if (!editing) {
      const ok = await Swal.fire({
        title: "Send to everyone?",
        html: "This replaces the current broadcast and shows to every user "
            + "on their first visit today.",
        icon: "question", showCancelButton: true, confirmButtonColor: TEAL,
        confirmButtonText: "Publish",
      });
      if (!ok.isConfirmed) return;
    }

    setSaving(true);
    try {
      const body = {
        title: form.title.trim() || null,
        body: form.body.trim(),
        tone: form.tone,
        link_url: form.link_url.trim() || null,
        link_label: form.link_label.trim() || null,
        is_active: form.is_active,
      };
      if (editing) await put(`/broadcasts/edit/${id}`, body);
      else await post("/broadcasts/store", body);

      Swal.fire({
        icon: "success",
        title: editing ? "Broadcast updated" : "Broadcast published",
        timer: 1400, showConfirmButton: false,
      });
      navigate("/broadcasts");
    } catch (err) {
      Swal.fire("Error",
        err.response?.data?.message
        || Object.values(err.response?.data?.errors || {})[0]?.[0]
        || "Failed to save the broadcast.", "error");
    } finally { setSaving(false); }
  };

  if (loading) {
    return (
      <div className="flex justify-center py-16">
        <div className="w-7 h-7 border-2 rounded-full animate-spin" style={{ borderColor: "#CFE6E6", borderTopColor: TEAL }} />
      </div>
    );
  }

  const tone = TONES.find((t) => t.value === form.tone) || TONES[0];

  return (
    <div className="min-h-screen bg-[#F4F8F8]">
      <div className="px-5 py-4" style={{ background: `linear-gradient(135deg, ${TEAL}, #063033)` }}>
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <p className="text-[10px] uppercase tracking-[0.2em]" style={{ color: GOLD }}>System-wide</p>
            <h1 className="text-base font-black text-white mt-0.5">
              {editing ? "Edit Broadcast" : "New Broadcast"}
            </h1>
          </div>
          <button onClick={save} disabled={saving}
            className="px-4 py-1.5 bg-white/15 hover:bg-white/25 text-white rounded-xl text-xs font-bold disabled:opacity-50">
            {saving ? "Saving…" : editing ? "Save changes" : "Publish to everyone"}
          </button>
        </div>
      </div>

      <div className="px-4 py-5 max-w-5xl mx-auto grid lg:grid-cols-2 gap-4 items-start">
        {/* ── Composer ── */}
        <div className="bg-white rounded-2xl border shadow-sm p-4 space-y-4" style={{ borderColor: BORDER }}>
          <div>
            <label className="block text-[11px] font-semibold mb-1" style={{ color: "#0A3A3E" }}>Tone</label>
            <div className="flex gap-2 flex-wrap">
              {TONES.map((t) => {
                const on = form.tone === t.value;
                return (
                  <button key={t.value} type="button" onClick={() => set("tone", t.value)}
                    className="px-3 py-1.5 rounded-full text-xs font-semibold border transition-colors"
                    style={on
                      ? { background: t.wash, color: t.accent, borderColor: t.accent }
                      : { background: "#fff", color: "#0A3A3E", borderColor: BORDER }}>
                    {t.label}
                  </button>
                );
              })}
            </div>
          </div>

          <div>
            <label className="block text-[11px] font-semibold mb-1" style={{ color: "#0A3A3E" }}>
              Headline <span className="font-normal text-gray-400">(optional)</span>
            </label>
            <input value={form.title} onChange={(e) => set("title", e.target.value)}
              placeholder="e.g. School closed on Thursday" className={field} style={{ borderColor: BORDER }} dir="auto" />
          </div>

          <div>
            <label className="block text-[11px] font-semibold mb-1" style={{ color: "#0A3A3E" }}>
              Message <span style={{ color: GOLD }}>*</span>
            </label>
            <textarea value={form.body} onChange={(e) => set("body", e.target.value)} rows={7}
              placeholder="Write it the way you would say it to the room. Line breaks are kept."
              className={field} style={{ borderColor: BORDER }} dir="auto" />
            <div className="flex justify-between mt-1">
              <p className="text-[10px] text-gray-400">Line breaks are preserved.</p>
              <p className="text-[10px]" style={{ color: form.body.length > 5000 ? "#B83230" : "#8AA4A7" }}>
                {form.body.length}/5000
              </p>
            </div>
          </div>

          <div className="grid sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] font-semibold mb-1" style={{ color: "#0A3A3E" }}>
                Button link <span className="font-normal text-gray-400">(optional)</span>
              </label>
              <input value={form.link_url} onChange={(e) => set("link_url", e.target.value)}
                placeholder="https://… or /assembly/calendar" className={field} style={{ borderColor: BORDER }} dir="ltr" />
            </div>
            <div>
              <label className="block text-[11px] font-semibold mb-1" style={{ color: "#0A3A3E" }}>Button text</label>
              <input value={form.link_label} onChange={(e) => set("link_label", e.target.value)}
                placeholder="e.g. See the calendar" className={field} style={{ borderColor: BORDER }} dir="auto" />
            </div>
          </div>

          <label className="flex items-center gap-2 cursor-pointer">
            <input type="checkbox" checked={form.is_active} onChange={(e) => set("is_active", e.target.checked)}
              className="w-4 h-4 rounded" style={{ accentColor: TEAL }} />
            <span className="text-xs" style={{ color: MUTED }}>
              Active — uncheck to take it down without deleting it
            </span>
          </label>

          <div className="flex gap-2 pt-1">
            <button onClick={save} disabled={saving}
              className="px-5 py-2 text-xs font-semibold text-white rounded-xl disabled:opacity-50"
              style={{ background: TEAL }}>
              {saving ? "Saving…" : editing ? "Save changes" : "Publish to everyone"}
            </button>
            <button onClick={() => navigate("/broadcasts")}
              className="px-4 py-2 text-xs font-semibold rounded-xl bg-white border"
              style={{ color: MUTED, borderColor: BORDER }}>
              Cancel
            </button>
          </div>
        </div>

        {/* ── Live preview: exactly what lands on everyone's screen ── */}
        <div className="lg:sticky lg:top-4">
          <p className="text-[10px] font-bold uppercase tracking-wider mb-2" style={{ color: MUTED }}>
            What everyone will see
          </p>
          <div className="rounded-2xl overflow-hidden shadow-lg bg-white" style={{ border: `1px solid ${BORDER}` }}>
            <div style={{ height: 4, background: `linear-gradient(90deg, ${tone.accent}, ${GOLD})` }} />

            <div className="flex items-start gap-3 px-4 pt-4 pb-3">
              {user?.profile_photo ? (
                <img src={user.profile_photo} alt="" className="w-11 h-11 rounded-full object-cover flex-shrink-0"
                  style={{ border: `2px solid ${tone.accent}` }} />
              ) : (
                <span className="w-11 h-11 rounded-full flex items-center justify-center text-sm font-black text-white flex-shrink-0"
                  style={{ background: `linear-gradient(140deg, ${TEAL_LT}, ${TEAL})` }}>
                  {initials(user?.name)}
                </span>
              )}
              <div className="min-w-0 flex-1">
                <bdi dir="auto" className="block text-sm font-bold" style={{ color: "#0A3A3E" }}>
                  {user?.name || "You"}
                </bdi>
                {user?.bio
                  ? <bdi dir="auto" className="block text-[11px] leading-snug text-gray-500">{user.bio}</bdi>
                  : <span className="block text-[11px] text-gray-300 italic">
                      Add a bio on your profile — it shows here
                    </span>}
                <div className="flex items-center gap-1.5 mt-0.5 text-[10px] text-gray-400">
                  <span className="px-1.5 py-0.5 rounded-full font-bold"
                    style={{ background: tone.wash, color: tone.accent }}>{tone.label}</span>
                  <span>·</span><span>just now</span>
                </div>
              </div>
              <span className="w-8 h-8 rounded-full flex items-center justify-center text-gray-300 flex-shrink-0">✕</span>
            </div>

            <div className="px-4 pb-4">
              {form.title && (
                <h2 className="text-base font-black mb-1.5" style={{ color: "#0A3A3E" }}>
                  <bdi dir="auto">{form.title}</bdi>
                </h2>
              )}
              <bdi dir="auto" className="block text-sm leading-relaxed whitespace-pre-wrap"
                style={{ color: form.body ? "#334A4C" : "#C3D0D0" }}>
                {form.body || "Your message appears here…"}
              </bdi>
            </div>

            <div className="px-4 py-3 flex items-center gap-2 flex-wrap"
              style={{ borderTop: `1px solid ${BORDER}`, background: "#FAFCFC" }}>
              {form.link_url && (
                <span className="px-4 py-2 rounded-xl text-xs font-bold text-white" style={{ background: tone.accent }}>
                  {form.link_label || "Open"} →
                </span>
              )}
              <span className="px-4 py-2 rounded-xl text-xs font-bold border bg-white"
                style={{ borderColor: BORDER, color: MUTED }}>Got it</span>
              <span className="ml-auto text-[10px] text-gray-400">Shown once a day</span>
            </div>
          </div>

          <p className="text-[10px] text-gray-400 mt-2 leading-relaxed">
            Publishing replaces the current broadcast. Each person sees it once on their first
            visit of the day, and can dismiss it with the ✕.
          </p>
        </div>
      </div>
    </div>
  );
}
