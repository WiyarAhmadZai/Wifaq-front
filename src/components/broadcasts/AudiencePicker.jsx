import { useEffect, useState } from "react";
import { get } from "../../api/axios";
import Select2 from "../hr/Select2";

const TEAL = "#0D5C63";
const BORDER = "#D0E0E0";
const MUTED = "#5A7A7E";

export const AUDIENCES = [
  { value: "all",         label: "Everyone" },
  { value: "departments", label: "Specific departments" },
  { value: "users",       label: "Specific people" },
];

export const emptyAudience = () => ({ audience: "all", department_ids: [], user_ids: [] });

/** One line saying who a choice reaches, for confirmations and headers. */
export function describeAudience(value, options) {
  if (value.audience === "departments") {
    const n = value.department_ids.length;
    const names = (options?.departments || [])
      .filter((d) => value.department_ids.includes(d.id)).map((d) => d.name);
    return n === 0 ? "no department picked yet"
      : names.length <= 3 ? names.join(", ") : `${n} departments`;
  }
  if (value.audience === "users") {
    const n = value.user_ids.length;
    const names = (options?.users || [])
      .filter((u) => value.user_ids.includes(u.id)).map((u) => u.name);
    return n === 0 ? "nobody picked yet"
      : names.length <= 3 ? names.join(", ") : `${n} people`;
  }
  return "everyone";
}

/** True when the choice actually reaches somebody. */
export function audienceIsComplete(value) {
  if (value.audience === "departments") return value.department_ids.length > 0;
  if (value.audience === "users") return value.user_ids.length > 0;
  return true;
}

/** Loads the departments and people an author may address. */
export function useAudienceOptions() {
  const [options, setOptions] = useState({ departments: [], users: [] });
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    let alive = true;
    get("/broadcasts/audience-options")
      .then((r) => { if (alive) setOptions({ departments: r.data?.departments || [], users: r.data?.users || [] }); })
      .catch(() => { if (alive) setOptions({ departments: [], users: [] }); })
      .finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
  }, []);
  return { options, loading };
}

/**
 * Who a broadcast is for: everyone, some departments, or some people.
 *
 * `value` is { audience, department_ids, user_ids }; `onChange` receives the
 * whole object back. The picker never throws away a list when the author
 * switches modes, so flipping to "everyone" to check something and back
 * again does not lose ten carefully chosen names.
 */
export default function AudiencePicker({ value, onChange, options, loading = false, compact = false }) {
  const set = (patch) => onChange({ ...value, ...patch });

  const deptOptions = (options?.departments || []).map((d) => ({ value: d.id, label: d.name }));
  const userOptions = (options?.users || []).map((u) => ({
    value: u.id,
    label: u.department ? `${u.name} — ${u.department}` : u.name,
  }));

  return (
    <div className="space-y-2">
      <div className="flex gap-2 flex-wrap">
        {AUDIENCES.map((a) => {
          const on = value.audience === a.value;
          return (
            <button key={a.value} type="button" onClick={() => set({ audience: a.value })}
              className={`${compact ? "px-2.5 py-1 text-[11px]" : "px-3 py-1.5 text-xs"} rounded-full font-semibold border transition-colors`}
              style={on
                ? { background: "#E8F6F6", color: TEAL, borderColor: TEAL }
                : { background: "#fff", color: "#0A3A3E", borderColor: BORDER }}>
              {a.label}
            </button>
          );
        })}
      </div>

      {value.audience === "departments" && (
        <Select2 isMulti size={compact ? "sm" : "md"} value={value.department_ids}
          onChange={(ids) => set({ department_ids: ids })}
          options={deptOptions} disabled={loading}
          placeholder={loading ? "Loading departments…" : "Pick one or more departments"} />
      )}

      {value.audience === "users" && (
        <Select2 isMulti size={compact ? "sm" : "md"} value={value.user_ids}
          onChange={(ids) => set({ user_ids: ids })}
          options={userOptions} disabled={loading}
          placeholder={loading ? "Loading people…" : "Pick one or more people"} />
      )}

      <p className="text-[10px]" style={{ color: MUTED }}>
        {value.audience === "all" && "Shown to every user, and on the sign-in page."}
        {value.audience === "departments" && "Shown only to staff in these departments. Not shown on the sign-in page."}
        {value.audience === "users" && "Shown only to these people. Not shown on the sign-in page."}
      </p>
    </div>
  );
}
