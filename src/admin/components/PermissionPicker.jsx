import { useMemo, useState } from "react";

/**
 * Grid of permissions grouped by module. The selected set is held by the parent.
 * Expects:
 *   permissions: array of { id, name } from /access/permissions
 *   value: Set<string> | string[] of selected permission names (whether they
 *     originally came from a role or were direct — the admin can toggle any)
 *   onChange: (newSet: Set<string>) => void
 *   readOnly: boolean (optional)
 */
/* Permissions whose name alone does not say what they do. */
const PERMISSION_LABELS = {
  "student-profiles.view-all": "Student profiles: all classes",
  "student-profiles.scope-taught-classes": "Student profiles: only the classes they teach",
  "student-profiles.scope-homeroom": "Student profiles: only their own homeroom class",
  "special-activities.view": "Open Special Activities section",
};

const SECTION_PARENT_PERMISSIONS = {
  "surah-memorization": "special-activities.view",
  "science-projects": "special-activities.view",
  "weekly-recognition": "special-activities.view",
};

const MODULE_LABELS = {
  "special-activities": "Special Activities",
  "surah-memorization": "Surah Memorization",
  "science-projects": "Science Projects",
  "weekly-recognition": "Weekly Recognition",
};

const SPECIAL_ACTIVITY_MODULES = [
  "surah-memorization",
  "science-projects",
  "weekly-recognition",
];
const SPECIAL_ACTIVITY_MODULE_SET = new Set(SPECIAL_ACTIVITY_MODULES);

const groupItems = (group) => [
  ...group.items,
  ...(group.children || []).flatMap(groupItems),
];

export default function PermissionPicker({ permissions, value, onChange, readOnly = false }) {
  const [filter, setFilter] = useState("");

  const selected = useMemo(() => (value instanceof Set ? value : new Set(value || [])), [value]);

  const grouped = useMemo(() => {
    const byModule = {};
    (permissions || []).forEach((p) => {
      const [module] = p.name.split(".", 2);
      if (!byModule[module]) byModule[module] = [];
      byModule[module].push(p);
    });
    const modules = Object.entries(byModule)
      .map(([module, items]) => ({
        module,
        items: items.sort((a, b) => a.name.localeCompare(b.name)),
      }));
    const hasSpecialActivities = modules.some((g) => SPECIAL_ACTIVITY_MODULE_SET.has(g.module) || g.module === "special-activities");
    const regular = modules.filter((g) => !SPECIAL_ACTIVITY_MODULE_SET.has(g.module) && g.module !== "special-activities");
    const children = SPECIAL_ACTIVITY_MODULES
      .map((module) => modules.find((g) => g.module === module))
      .filter(Boolean);
    const specialActivities = hasSpecialActivities
      ? [{
          module: "special-activities",
          items: modules.find((g) => g.module === "special-activities")?.items || [],
          children,
        }]
      : [];
    return [...regular, ...specialActivities]
      .sort((a, b) => a.module.localeCompare(b.module));
  }, [permissions]);

  const filteredGroups = useMemo(() => {
    const q = filter.trim().toLowerCase();
    if (!q) return grouped;
    const filterGroup = (group) => {
      const label = (MODULE_LABELS[group.module] || group.module).toLowerCase();
      if (label.includes(q)) return group;
      const items = group.items.filter((p) => p.name.toLowerCase().includes(q));
      const children = (group.children || []).map(filterGroup).filter(Boolean);
      if (!items.length && !children.length) return null;
      return { ...group, items, children };
    };
    return grouped.map(filterGroup).filter(Boolean);
  }, [grouped, filter]);

  // Each module's "Receive section notifications" permission, by module name.
  // Opening a section's page requires it (PathPermissionGate), so granting any
  // action in the module must bring it along — otherwise a user given the
  // section is bounced to /403 for want of one easy-to-miss checkbox.
  const notifByModule = useMemo(() => {
    const map = {};
    (permissions || []).forEach((p) => {
      if (p.name.endsWith(".notifications") || p.name.endsWith(".notifications.receive")) {
        map[p.name.split(".", 1)[0]] = p.name;
      }
    });
    return map;
  }, [permissions]);

  const addDependencies = (next, name) => {
    if (name.endsWith(".notifications") || name.endsWith(".notifications.receive")) return;
    const module = name.split(".", 1)[0];
    const notif = notifByModule[module];
    if (notif) next.add(notif);
    const parent = SECTION_PARENT_PERMISSIONS[module];
    if (parent) next.add(parent);
  };

  const toggle = (name) => {
    if (readOnly) return;
    const next = new Set(selected);
    if (next.has(name)) {
      next.delete(name);
    } else {
      next.add(name);
      addDependencies(next, name);
    }
    onChange(next);
  };

  const toggleGroup = (group, allChecked) => {
    if (readOnly) return;
    const next = new Set(selected);
    groupItems(group).forEach((p) => {
      if (allChecked) {
        next.delete(p.name);
      } else {
        next.add(p.name);
        addDependencies(next, p.name);
      }
    });
    onChange(next);
  };

  const totalSelected = selected.size;
  const totalAvailable = (permissions || []).length;

  const renderGroup = (group, nested = false) => {
    const items = groupItems(group);
    if (!items.length) return null;
    const groupSelected = items.filter((p) => selected.has(p.name)).length;
    const allChecked = groupSelected === items.length;
    const someChecked = groupSelected > 0 && !allChecked;
    return (
      <div key={group.module} className={`${nested ? "rounded-lg" : "rounded-xl"} border border-gray-100 overflow-hidden`}>
        <div className="flex items-center justify-between gap-3 px-3 py-2 bg-gray-50 border-b border-gray-100">
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={allChecked}
              ref={(el) => { if (el) el.indeterminate = someChecked; }}
              onChange={() => toggleGroup(group, allChecked)}
              disabled={readOnly}
              className="w-4 h-4 text-teal-600 rounded focus:ring-teal-500"
            />
            <span className="text-xs font-bold uppercase tracking-wider text-gray-700">
              {MODULE_LABELS[group.module] || group.module}
            </span>
            <span className="text-[10px] text-gray-400">({groupSelected}/{items.length})</span>
          </div>
        </div>
        {group.items.length > 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-1 p-2">
            {group.items.map((p) => (
              <label key={p.id} className={`flex items-center gap-2 px-2 py-1.5 rounded-lg text-xs ${readOnly ? "" : "hover:bg-teal-50 cursor-pointer"}`}>
                <input
                  type="checkbox"
                  checked={selected.has(p.name)}
                  onChange={() => toggle(p.name)}
                  disabled={readOnly}
                  className="w-4 h-4 text-teal-600 rounded focus:ring-teal-500"
                />
                <span className="text-gray-700 break-all">
                  {PERMISSION_LABELS[p.name] || (p.name.endsWith(".notifications") || p.name.endsWith(".notifications.receive")
                    ? "Receive section notifications"
                    : p.name.split(".").slice(1).join(".") || p.name)}
                </span>
              </label>
            ))}
          </div>
        )}
        {group.children?.length > 0 && (
          <div className="space-y-2 border-t border-gray-100 bg-white p-2">
            {group.children.map((child) => renderGroup(child, true))}
          </div>
        )}
      </div>
    );
  };

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
        {filteredGroups.map((group) => renderGroup(group))}
        {filteredGroups.length === 0 && (
          <div className="text-center py-8 text-sm text-gray-400">No permissions match "{filter}"</div>
        )}
      </div>
    </div>
  );
}
