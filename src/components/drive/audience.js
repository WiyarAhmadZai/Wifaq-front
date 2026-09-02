/**
 * Audience helpers shared by the Drive forms.
 *
 * Kept out of AudiencePicker.jsx so that file exports components only — a
 * module that mixes components and plain values breaks React Fast Refresh.
 */

/** A brand-new item is private until someone says otherwise. */
export const EMPTY_AUDIENCE = {
  visibility: "private",
  classes: [],
  departments: [],
  users: [],
};

/** Read an item's stored audience back into picker state. */
export const audienceFromItem = (item) => {
  const rows = item?.audience || [];
  return {
    visibility: item?.visibility || "private",
    classes: rows.filter((r) => r.type === "class").map((r) => r.id),
    departments: rows.filter((r) => r.type === "department").map((r) => r.id),
    users: rows.filter((r) => r.type === "user").map((r) => r.id),
  };
};
