import { useEffect, useMemo, useState } from "react";
import { getAudienceOptions } from "../../api/drive";

/**
 * "Who can see this?" — the audience block on every Drive upload, link and
 * folder form.
 *
 * Three states:
 *   Only me   — nobody else, not even an item in a shared folder
 *   Specific  — classes, departments and named people
 *   Everyone  — all signed-in users
 *
 * The option lists come from the server: a teacher is offered only the classes
 * they actually teach, so the picker cannot even express a target the save
 * would reject. Administrators are offered every class and department.
 */

const VISIBILITY_COPY = {
  private: { label: "Only me", hint: "Nobody else can open it." },
  shared: { label: "Specific classes, departments or people", hint: "Only the people you pick below." },
  public: { label: "Everyone in the system", hint: "Every signed-in user can open it." },
};

/**
 * Options are the same for every form on the page, so they are fetched once and
 * held here. A module-level promise rather than context: the picker is mounted
 * inside three unrelated dialogs and none of them share a provider.
 */
let optionsPromise = null;
const loadOptions = () => {
  if (!optionsPromise) {
    optionsPromise = getAudienceOptions()
      .then((r) => r.data?.data || null)
      .catch(() => {
        optionsPromise = null; // let a later mount retry
        return null;
      });
  }
  return optionsPromise;
};

export default function AudiencePicker({ value, onChange, compact = false }) {
  const [options, setOptions] = useState(null);
  const [loading, setLoading] = useState(true);
  const [userQuery, setUserQuery] = useState("");

  useEffect(() => {
    let alive = true;
    loadOptions().then((o) => {
      if (!alive) return;
      setOptions(o);
      setLoading(false);
    });
    return () => {
      alive = false;
    };
  }, []);

  const set = (patch) => onChange({ ...value, ...patch });

  const toggle = (key, id) => {
    const list = value[key] || [];
    set({ [key]: list.includes(id) ? list.filter((x) => x !== id) : [...list, id] });
  };

  const filteredUsers = useMemo(() => {
    const all = options?.users || [];
    const q = userQuery.trim().toLowerCase();
    // Always keep the already-picked people visible, otherwise typing a search
    // makes a selection you cannot see and cannot remove.
    const picked = new Set(value.users || []);
    const matches = q
      ? all.filter((u) => u.label?.toLowerCase().includes(q) || u.email?.toLowerCase().includes(q))
      : all;
    const shown = matches.slice(0, 40);
    const missing = all.filter((u) => picked.has(u.id) && !shown.some((s) => s.id === u.id));
    return [...missing, ...shown];
  }, [options, userQuery, value.users]);

  const selectedCount =
    (value.classes?.length || 0) + (value.departments?.length || 0) + (value.users?.length || 0);

  return (
    <div className={compact ? "space-y-2" : "space-y-3"}>
      <div>
        <label className="block text-[10px] font-semibold text-gray-500 uppercase tracking-wider mb-1">
          Who can see this?
        </label>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
          {["private", "shared", "public"].map((key) => {
            const on = value.visibility === key;
            return (
              <button
                key={key}
                type="button"
                onClick={() => set({ visibility: key })}
                aria-pressed={on}
                className={`text-left px-3 py-2 rounded-xl border transition-colors ${
                  on ? "border-teal-500 bg-teal-50 ring-1 ring-teal-300" : "border-gray-200 bg-white hover:border-teal-300"
                }`}
              >
                <p className={`text-xs font-semibold ${on ? "text-teal-800" : "text-gray-700"}`}>
                  {VISIBILITY_COPY[key].label}
                </p>
                <p className="text-[10px] text-gray-500 mt-0.5">{VISIBILITY_COPY[key].hint}</p>
              </button>
            );
          })}
        </div>
      </div>

      {value.visibility === "shared" && (
        <div className="rounded-xl border border-gray-200 bg-gray-50 p-3 space-y-3">
          {loading && <p className="text-[11px] text-gray-500">Loading options…</p>}

          {!loading && !options && (
            <p className="text-[11px] text-red-600">Could not load the audience options.</p>
          )}

          {!loading && options && (
            <>
              {/* Classes */}
              <Group
                title="Classes"
                hint={
                  options.is_admin
                    ? "Any active class."
                    : "Only the classes you teach or supervise."
                }
                empty="You are not linked to any class yet."
                items={options.classes}
                selected={value.classes}
                onToggle={(id) => toggle("classes", id)}
              />

              {/* Departments */}
              <Group
                title="Departments"
                hint={options.is_admin ? "Any department." : "Your own department."}
                empty="No department on your record."
                items={options.departments}
                selected={value.departments}
                onToggle={(id) => toggle("departments", id)}
              />

              {/* People */}
              <div>
                <div className="flex items-baseline justify-between gap-2 mb-1">
                  <p className="text-[11px] font-bold text-gray-700">People</p>
                  <p className="text-[10px] text-gray-500">Named individually.</p>
                </div>
                <input
                  value={userQuery}
                  onChange={(e) => setUserQuery(e.target.value)}
                  placeholder="Search by name or email"
                  className="w-full px-3 py-1.5 border border-gray-200 rounded-lg text-xs bg-white focus:ring-2 focus:ring-teal-500 focus:border-teal-500 outline-none mb-1.5"
                />
                <div className="max-h-40 overflow-y-auto rounded-lg border border-gray-200 bg-white divide-y divide-gray-100">
                  {filteredUsers.length === 0 && (
                    <p className="px-3 py-2 text-[11px] text-gray-400">No matching people.</p>
                  )}
                  {filteredUsers.map((u) => {
                    const on = (value.users || []).includes(u.id);
                    return (
                      <label
                        key={u.id}
                        className={`flex items-center gap-2 px-3 py-1.5 cursor-pointer ${on ? "bg-teal-50" : "hover:bg-gray-50"}`}
                      >
                        <input
                          type="checkbox"
                          checked={on}
                          onChange={() => toggle("users", u.id)}
                          className="rounded border-gray-300 text-teal-600 focus:ring-teal-500"
                        />
                        <Avatar name={u.label} src={u.avatar} className="w-5 h-5 text-[9px]" />
                        <span className="text-xs text-gray-700 truncate flex-1">{u.label}</span>
                      </label>
                    );
                  })}
                </div>
              </div>

              {selectedCount === 0 && (
                <p className="text-[11px] text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-2.5 py-1.5">
                  Pick at least one class, department or person — otherwise this is saved as private.
                </p>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}

function Group({ title, hint, empty, items, selected, onToggle }) {
  return (
    <div>
      <div className="flex items-baseline justify-between gap-2 mb-1">
        <p className="text-[11px] font-bold text-gray-700">{title}</p>
        <p className="text-[10px] text-gray-500">{hint}</p>
      </div>
      {(!items || items.length === 0) ? (
        <p className="text-[11px] text-gray-400 px-1">{empty}</p>
      ) : (
        <div className="flex flex-wrap gap-1.5">
          {items.map((it) => {
            const on = (selected || []).includes(it.id);
            return (
              <button
                key={it.id}
                type="button"
                onClick={() => onToggle(it.id)}
                aria-pressed={on}
                className={`px-2.5 py-1 rounded-lg border text-[11px] font-semibold transition-colors ${
                  on
                    ? "bg-teal-600 border-teal-600 text-white"
                    : "bg-white border-gray-200 text-gray-600 hover:border-teal-400"
                }`}
              >
                {it.label}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

/** Profile photo, or the initial when there is none. */
export function Avatar({ name, src, className = "w-6 h-6 text-[10px]" }) {
  const initial = (name || "?").trim().charAt(0).toUpperCase();
  return src ? (
    <img
      src={src}
      alt={name || ""}
      className={`${className} rounded-full object-cover flex-shrink-0 bg-gray-100`}
    />
  ) : (
    <span
      className={`${className} rounded-full bg-teal-600 text-white font-bold flex items-center justify-center flex-shrink-0`}
      aria-hidden="true"
    >
      {initial}
    </span>
  );
}

/**
 * "Ahmad Zia" with their photo — shown on any item you did not upload, so it is
 * always clear whose material you are looking at.
 */
export function OwnerBadge({ owner, mine, className = "" }) {
  if (!owner) return null;
  return (
    <span className={`inline-flex items-center gap-1.5 min-w-0 ${className}`} title={owner.name}>
      <Avatar name={owner.name} src={owner.avatar} className="w-5 h-5 text-[9px]" />
      <span className="text-[10px] text-gray-500 truncate">{mine ? "You" : owner.name}</span>
    </span>
  );
}

/** Chips naming the audience: "7-B", "Academic", "+2 people". */
export function AudienceChips({ item, className = "" }) {
  const rows = item?.audience || [];
  const visibility = item?.visibility || "private";

  if (visibility === "public") {
    return (
      <span className={`px-1.5 py-0.5 rounded bg-sky-50 text-sky-700 text-[10px] font-semibold ${className}`}>
        Everyone
      </span>
    );
  }
  if (visibility === "private") {
    return (
      <span className={`px-1.5 py-0.5 rounded bg-gray-100 text-gray-500 text-[10px] font-semibold ${className}`}>
        Only me
      </span>
    );
  }

  // Named targets read better than a count, so the first two are spelled out
  // and only the remainder collapses.
  const named = rows.slice(0, 2);
  const rest = rows.length - named.length;

  return (
    <span className={`inline-flex flex-wrap items-center gap-1 ${className}`}>
      {named.map((r) => (
        <span
          key={`${r.type}-${r.id}`}
          className={`px-1.5 py-0.5 rounded text-[10px] font-semibold ${
            r.type === "class"
              ? "bg-emerald-50 text-emerald-700"
              : r.type === "department"
                ? "bg-indigo-50 text-indigo-700"
                : "bg-amber-50 text-amber-700"
          }`}
        >
          {r.label}
        </span>
      ))}
      {rest > 0 && (
        <span className="px-1.5 py-0.5 rounded bg-gray-100 text-gray-600 text-[10px] font-semibold">
          +{rest} more
        </span>
      )}
    </span>
  );
}
