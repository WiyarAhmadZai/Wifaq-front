import { useEffect, useState } from "react";
import Swal from "sweetalert2";
import { FiMessageSquare, FiClock, FiVolume2, FiTrash2 } from "react-icons/fi";
import { chatApi } from "../../chat/chatApi";

// Retention windows mirror the backend ChatSetting::RETENTION_DAYS keys.
const RETENTION_OPTIONS = [
  { key: "1_day", label: "1 Day", hint: "Messages older than 1 day are deleted" },
  { key: "1_week", label: "1 Week", hint: "Messages older than 1 week are deleted" },
  { key: "1_month", label: "1 Month", hint: "Messages older than 1 month are deleted" },
  { key: "6_months", label: "6 Months", hint: "Messages older than 6 months are deleted" },
  { key: "1_year", label: "1 Year", hint: "Messages older than 1 year are deleted" },
  { key: "never", label: "Never Delete", hint: "Keep all messages forever" },
];

export default function ChatSettings() {
  const [retention, setRetention] = useState("never");
  const [sound, setSound] = useState(true);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    chatApi.getSettings()
      .then((r) => {
        const d = r.data?.data;
        if (d) { setRetention(d.retention_period); setSound(d.sound_enabled); }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const save = async (next = {}) => {
    const payload = {
      retention_period: next.retention ?? retention,
      sound_enabled: next.sound ?? sound,
    };
    setSaving(true);
    try {
      await chatApi.updateSettings(payload);
      if (next.retention !== undefined) setRetention(next.retention);
      if (next.sound !== undefined) setSound(next.sound);
      Swal.fire({
        toast: true, position: "top-end", icon: "success",
        title: "Chat settings saved", timer: 1800, showConfirmButton: false,
      });
    } catch (e) {
      Swal.fire({
        toast: true, position: "top-end", icon: "error",
        title: e?.response?.data?.message || "Could not save settings",
        timer: 2500, showConfirmButton: false,
      });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-[40vh] flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-4 border-teal-100 border-t-teal-600" />
      </div>
    );
  }

  return (
    <div className="px-4 py-6 max-w-3xl mx-auto">
      <div className="mb-6 flex items-center gap-3">
        <div className="w-11 h-11 rounded-xl bg-teal-50 flex items-center justify-center">
          <FiMessageSquare className="w-5 h-5 text-teal-600" />
        </div>
        <div>
          <h1 className="text-lg font-bold text-gray-900">Chat Settings</h1>
          <p className="text-xs text-gray-500 mt-0.5">Configure message retention and notifications for the messaging system.</p>
        </div>
      </div>

      {/* Retention */}
      <section className="bg-white rounded-xl border border-gray-200 overflow-hidden mb-6">
        <header className="px-5 py-4 border-b border-gray-100 flex items-center gap-2">
          <FiClock className="w-4 h-4 text-gray-400" />
          <div>
            <h2 className="text-sm font-bold text-gray-800">Message Retention</h2>
            <p className="text-[11px] text-gray-500 mt-0.5">How long chat messages and attachments are kept before automatic deletion.</p>
          </div>
        </header>
        <div className="p-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {RETENTION_OPTIONS.map((opt) => {
            const active = retention === opt.key;
            return (
              <button
                key={opt.key}
                disabled={saving}
                onClick={() => save({ retention: opt.key })}
                className={`text-left p-4 rounded-xl border-2 transition-all ${
                  active ? "border-teal-500 bg-teal-50/60 shadow-sm" : "border-gray-100 hover:border-gray-200 bg-white"
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className={`font-semibold text-sm ${active ? "text-teal-700" : "text-gray-800"}`}>{opt.label}</span>
                  {opt.key === "never"
                    ? <span className={`text-[10px] px-2 py-0.5 rounded-full ${active ? "bg-teal-100 text-teal-700" : "bg-gray-100 text-gray-500"}`}>Safe</span>
                    : <FiTrash2 className={`w-3.5 h-3.5 ${active ? "text-teal-500" : "text-gray-300"}`} />}
                </div>
                <p className="text-[11px] text-gray-500 mt-1">{opt.hint}</p>
              </button>
            );
          })}
        </div>
        <div className="px-5 py-3 bg-amber-50 border-t border-amber-100 text-[11px] text-amber-700">
          Deletion runs automatically once a day. Only chat messages and attachments are removed — users,
          conversations and these settings are never deleted.
        </div>
      </section>

      {/* Notifications */}
      <section className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <header className="px-5 py-4 border-b border-gray-100 flex items-center gap-2">
          <FiVolume2 className="w-4 h-4 text-gray-400" />
          <h2 className="text-sm font-bold text-gray-800">Notifications</h2>
        </header>
        <div className="p-5 flex items-center justify-between">
          <div>
            <div className="text-sm font-medium text-gray-800">Notification sound</div>
            <p className="text-[11px] text-gray-500 mt-0.5">Play a chime when a new message arrives.</p>
          </div>
          <button
            disabled={saving}
            onClick={() => save({ sound: !sound })}
            className={`relative w-12 h-6 rounded-full transition-colors ${sound ? "bg-teal-600" : "bg-gray-300"}`}
          >
            <span className={`absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform ${sound ? "translate-x-6" : "translate-x-0.5"}`} />
          </button>
        </div>
      </section>
    </div>
  );
}
