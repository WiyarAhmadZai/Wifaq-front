import Select from "react-select";

/**
 * Thin wrapper around react-select with consistent styling for the HR area.
 * Use it as a drop-in replacement for native <select>.
 *
 * Usage:
 *   <Select2 value={form.staff_id}
 *            onChange={(v) => setForm({ ...form, staff_id: v })}
 *            options={staff.map(s => ({ value: s.id, label: s.application?.full_name }))}
 *            placeholder="Select staff…" />
 *
 * `value` is the raw option value (not an option object). The wrapper handles
 * the lookup so callers stay simple.
 */
export default function Select2({
  value, onChange, options = [], placeholder = "Select…",
  disabled = false, isClearable = true, isMulti = false, className = "",
  size = "md", required = false, error = false,
}) {
  const sizes = {
    sm: { minHeight: "34px", fontSize: "0.75rem" },
    md: { minHeight: "40px", fontSize: "0.8125rem" },
    lg: { minHeight: "44px", fontSize: "0.875rem" },
  };
  const sz = sizes[size] || sizes.md;

  const normalised = options.map(o =>
    typeof o === "object" ? o : { value: o, label: o }
  );

  const selected = isMulti
    ? normalised.filter(o => Array.isArray(value) && value.includes(o.value))
    : normalised.find(o => String(o.value) === String(value)) || null;

  const styles = {
    control: (base, state) => ({
      ...base,
      minHeight: sz.minHeight,
      borderRadius: "0.75rem",
      borderColor: error ? "#f87171" : state.isFocused ? "#155c57" : "#e5e7eb",
      boxShadow: state.isFocused ? "0 0 0 2px rgba(21,92,87,0.2)" : "none",
      backgroundColor: error ? "#fef2f2" : disabled ? "#f9fafb" : "white",
      cursor: disabled ? "not-allowed" : "pointer",
      "&:hover": { borderColor: error ? "#f87171" : state.isFocused ? "#155c57" : "#d1d5db" },
    }),
    valueContainer: (base) => ({ ...base, padding: "0.125rem 0.5rem" }),
    placeholder: (base) => ({ ...base, color: "#9ca3af", fontSize: sz.fontSize }),
    singleValue: (base) => ({ ...base, fontSize: sz.fontSize, color: "#1f2937" }),
    multiValue: (base) => ({ ...base, backgroundColor: "#ecf2f1", borderRadius: "0.375rem" }),
    multiValueLabel: (base) => ({ ...base, color: "#0a3635", fontSize: "0.75rem", fontWeight: 600 }),
    multiValueRemove: (base) => ({
      ...base,
      color: "#0a3635",
      ":hover": { backgroundColor: "#155c57", color: "white" },
    }),
    input: (base) => ({ ...base, color: "#1f2937", fontSize: sz.fontSize, margin: 0 }),
    menu: (base) => ({
      ...base,
      borderRadius: "0.75rem",
      overflow: "hidden",
      boxShadow: "0 10px 25px -5px rgba(0,0,0,0.10), 0 8px 10px -6px rgba(0,0,0,0.06)",
      zIndex: 9999,
    }),
    menuPortal: (base) => ({ ...base, zIndex: 9999 }),
    option: (base, { isSelected, isFocused }) => ({
      ...base,
      backgroundColor: isSelected ? "#155c57" : isFocused ? "#ecf2f1" : "white",
      color: isSelected ? "white" : "#1f2937",
      fontSize: sz.fontSize,
      cursor: "pointer",
      ":active": { backgroundColor: "#0a3635", color: "white" },
    }),
    indicatorSeparator: () => ({ display: "none" }),
    dropdownIndicator: (base) => ({ ...base, color: "#9ca3af", padding: "0 0.5rem" }),
    clearIndicator: (base) => ({ ...base, color: "#9ca3af", padding: "0 0.25rem" }),
  };

  const handleChange = (opt) => {
    if (isMulti) {
      onChange(opt ? opt.map(o => o.value) : []);
    } else {
      onChange(opt ? opt.value : "");
    }
  };

  return (
    <Select
      className={className}
      classNamePrefix="r-select"
      options={normalised}
      value={selected}
      onChange={handleChange}
      placeholder={placeholder}
      isDisabled={disabled}
      isClearable={isClearable}
      isMulti={isMulti}
      isSearchable
      menuPortalTarget={typeof document !== "undefined" ? document.body : null}
      styles={styles}
      noOptionsMessage={() => "No matches"}
      required={required}
    />
  );
}
