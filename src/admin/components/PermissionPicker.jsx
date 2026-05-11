import { useMemo, useState } from "react";

/**
 * Grid of permissions grouped by module. The selected set is held by the parent.
 * Expects:
 *   permissions: array of { id, name } from /access/permissions
 *   value: Set<string> | string[] of selected permission names
 *   onChange: (newSet: Set<string>) => void
 *   readOnly: boolean (optional)
 */
export default function PermissionPicker({ permissions, value, onChange, readOnly = false }) {
  const [filter, setFilter] = useState("");

  const selected = useMemo(() => (value instanceof Set ? value : new Set(value || [])), [value]);

  const grouped = useMemo(() => {
    const groups = {};
    (permissions || []).forEach((p) => {
      const [module] = p.name.split(".", 2);
      if (!groups[module]) groups[module] = [];
      groups[module].push(p);
    });
    return Object.entries(groups)
      .map(([module, items]) => ({
        module,
        items: items.sort((a, b) => a.name.localeCompare(b.name)),
      }))
      .sort((a, b) => a.module.localeCompare(b.module));
  }, [permissions]);

  const filteredGroups = useMemo(() => {
    if (!filter.trim()) return grouped;
    const q = filter.toLowerCase();
    return grouped
      .map((g) => ({ ...g, items: g.items.filter((p) => p.name.toLowerCase().includes(q)) }))
      .filter((g) => g.items.length > 0);
  }, [grouped, filter]);

  const toggle = (name) => {
    if (readOnly) return;
    const next = new Set(selected);
    if (next.has(name)) next.delete(name);
    else next.add(name);
    onChange(next);
  };

  const toggleGroup = (group, allChecked) => {
    if (readOnly) return;
    const next = new Set(selected);
    group.items.forEach((p) => (allChecked ? next.delete(p.name) : next.add(p.name)));
    onChange(next);
  };

  const totalSelected = selected.size;
  const totalAvailable = (permissions || []).length;

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-3">
        <input
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          placeholder="Filter permissions..."
          className="flex-1 px-3 py-2 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-teal-400"
        />
        <span className="text-xs text-gray-500 whitespace-nowrap">
          {totalSelected} / {totalAvailable} selected
        </span>
      </div>

      <div className="space-y-3 max-h-[60vh] overflow-y-auto pr-1">
        {filteredGroups.map((g) => {
          const groupSelected = g.items.filter((p) => selected.has(p.name)).length;
          const allChecked = groupSelected === g.items.length;
          const someChecked = groupSelected > 0 && !allChecked;
          return (
            <div key={g.module} className="border border-gray-100 rounded-xl overflow-hidden">
              <div className="flex items-center justify-between gap-3 px-3 py-2 bg-gray-50 border-b border-gray-100">
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={allChecked}
                    ref={(el) => { if (el) el.indeterminate = someChecked; }}
                    onChange={() => toggleGroup(g, allChecked)}
                    disabled={readOnly}
                    className="w-4 h-4 text-teal-600 rounded focus:ring-teal-500"
                  />
                  <span className="text-xs font-bold uppercase tracking-wider text-gray-700">{g.module}</span>
                  <span className="text-[10px] text-gray-400">({groupSelected}/{g.items.length})</span>
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-1 p-2">
                {g.items.map((p) => (
                  <label key={p.id} className={`flex items-center gap-2 px-2 py-1.5 rounded-lg text-xs ${readOnly ? "" : "hover:bg-teal-50 cursor-pointer"}`}>
                    <input
                      type="checkbox"
                      checked={selected.has(p.name)}
                      onChange={() => toggle(p.name)}
                      disabled={readOnly}
                      className="w-4 h-4 text-teal-600 rounded focus:ring-teal-500"
                    />
                    <span className="text-gray-700 break-all">{p.name.split(".").slice(1).join(".") || p.name}</span>
                  </label>
                ))}
              </div>
            </div>
          );
        })}
        {filteredGroups.length === 0 && (
          <div className="text-center py-8 text-sm text-gray-400">No permissions match "{filter}"</div>
        )}
      </div>
    </div>
  );
}
