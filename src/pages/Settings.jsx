import { useState } from "react";
import {
  readIdleMinutes,
  writeIdleMinutes,
  DEFAULT_IDLE_MINUTES,
} from "../hooks/useIdleLogout";

// A handful of quick presets covers the realistic range (cashier on a shared
// terminal wants 1–2 min; back-office staff want 15–30 min; long-running
// admin work needs 60+). 0 disables the feature.
const PRESETS = [1, 2, 5, 10, 15, 30, 60, 120];

export default function Settings() {
  const [minutes, setMinutes] = useState(() => readIdleMinutes());
  const [savedAt, setSavedAt] = useState(null);

  const save = (value) => {
    const safe = writeIdleMinutes(value);
    setMinutes(safe);
    setSavedAt(new Date());
  };

  const isDisabled = minutes === 0;

  return (
    <div className="px-4 py-6 max-w-3xl mx-auto">
      <div className="mb-6">
        <h1 className="text-lg font-bold text-gray-900">Settings</h1>
        <p className="text-xs text-gray-500 mt-0.5">
          Preferences saved on this device.
        </p>
      </div>

      <section className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <header className="px-5 py-4 border-b border-gray-100">
          <h2 className="text-sm font-bold text-gray-800">Auto sign-out</h2>
          <p className="text-[11px] text-gray-500 mt-0.5 leading-relaxed">
            Sign out automatically after a period of inactivity. Activity means a
            click, key press, touch, or scroll anywhere in the app. Set to
            <strong className="text-gray-700"> Never</strong> to disable.
          </p>
        </header>

        <div className="px-5 py-5">
          <div className="flex items-center justify-between mb-4">
            <div>
              <p className="text-[10px] uppercase font-semibold tracking-wider text-gray-500">
                Current setting
              </p>
              <p className={`text-2xl font-bold mt-1 ${isDisabled ? "text-gray-400" : "text-teal-700"}`}>
                {isDisabled ? "Never" : formatMinutes(minutes)}
              </p>
            </div>
            {savedAt && (
              <span className="text-[10px] text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-full px-2 py-0.5">
                Saved {savedAt.toLocaleTimeString()}
              </span>
            )}
          </div>

          <p className="text-[10px] uppercase font-semibold tracking-wider text-gray-500 mb-2">
            Quick presets
          </p>
          <div className="flex flex-wrap gap-2 mb-5">
            {PRESETS.map((p) => {
              const active = minutes === p;
              return (
                <button
                  key={p}
                  onClick={() => save(p)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-colors ${
                    active
                      ? "bg-teal-600 text-white border-teal-600"
                      : "bg-white text-gray-700 border-gray-200 hover:border-teal-300 hover:bg-teal-50"
                  }`}
                >
                  {formatMinutes(p)}
                </button>
              );
            })}
            <button
              onClick={() => save(0)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-colors ${
                isDisabled
                  ? "bg-gray-700 text-white border-gray-700"
                  : "bg-white text-gray-700 border-gray-200 hover:border-gray-400 hover:bg-gray-50"
              }`}
            >
              Never
            </button>
          </div>

          <div className="border-t border-gray-100 pt-4">
            <label className="block text-[10px] uppercase font-semibold tracking-wider text-gray-500 mb-2">
              Custom value (minutes)
            </label>
            <div className="flex items-center gap-2 max-w-xs">
              <input
                type="number"
                min="0"
                max="720"
                step="1"
                value={minutes}
                onChange={(e) => setMinutes(Number(e.target.value) || 0)}
                className="w-24 px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:border-teal-500"
              />
              <button
                onClick={() => save(minutes)}
                className="px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 text-xs font-semibold"
              >
                Save
              </button>
              <button
                onClick={() => save(DEFAULT_IDLE_MINUTES)}
                className="px-3 py-2 bg-white border border-gray-200 text-gray-600 rounded-lg hover:bg-gray-50 text-xs font-medium"
                title={`Reset to default (${DEFAULT_IDLE_MINUTES} min)`}
              >
                Reset
              </button>
            </div>
            <p className="text-[10px] text-gray-400 mt-2">
              Enter <strong>0</strong> to disable. Max 720 minutes (12 hours).
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}

function formatMinutes(n) {
  if (n <= 0) return "Never";
  if (n < 60) return `${n} min`;
  const h = Math.floor(n / 60);
  const m = n % 60;
  return m === 0 ? `${h} hr` : `${h} hr ${m} min`;
}
