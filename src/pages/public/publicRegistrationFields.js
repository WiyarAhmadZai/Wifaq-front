// Non-confidential fields a parent fills on the public registration link.
// Shared by the public form (to render inputs) and the staff review page (to
// label the answers). Income, fees, discounts, special status and foundation
// help are intentionally absent — staff collect those in person.
// Option values match the Parents / Phase 2 forms so they save unchanged.

const EDUCATION = [
  "No Formal Education", "Primary School", "Secondary School", "High School", "Diploma",
  "Bachelor's Degree", "Master's Degree", "Doctorate/PhD", "Other",
].map((v) => ({ value: v, label: v }));

const YES_NO = "checkbox";

export const FAMILY_CORE_FIELDS = [
  { key: "father_name", label: "Father’s name", required: true },
  { key: "father_phone", label: "Father’s phone", required: true, type: "tel" },
  { key: "mother_name", label: "Mother’s name" },
  { key: "mother_phone", label: "Mother’s phone", type: "tel" },
  { key: "whatsapp_number", label: "WhatsApp number", type: "tel" },
];

export const FAMILY_DETAIL_SECTIONS = [
  {
    title: "Parents",
    fields: [
      { key: "father_name_en", label: "Father’s name (English)" },
      { key: "grandfather_name", label: "Grandfather’s name" },
      { key: "father_occupation", label: "Father’s occupation" },
      { key: "father_education_level", label: "Father’s education", type: "select", options: EDUCATION },
      { key: "mother_education_level", label: "Mother’s education", type: "select", options: EDUCATION },
      { key: "mother_tongue", label: "Mother tongue" },
      { key: "email", label: "Email", type: "email" },
      { key: "number_of_family_members", label: "Family members", type: "number" },
    ],
  },
  {
    title: "Address",
    fields: [
      { key: "permanent_province", label: "Permanent province" },
      { key: "permanent_district", label: "Permanent district" },
      { key: "permanent_village", label: "Permanent village" },
      { key: "temporary_province", label: "Current province" },
      { key: "temporary_district", label: "Current district" },
      { key: "temporary_village", label: "Current village" },
      { key: "address", label: "Full address", type: "textarea", wide: true },
    ],
  },
];

export const CHILD_DETAIL_SECTIONS = [
  {
    title: "Admission",
    fields: [
      { key: "enrollment_type", label: "Admission type", type: "select", options: [
        { value: "new", label: "New student" }, { value: "transfer", label: "Transfer from another school" },
      ] },
      { key: "transportation_required", label: "Needs school transport", type: YES_NO },
      { key: "uniform_required", label: "Needs school uniform", type: YES_NO },
    ],
  },
  {
    title: "Previous education",
    fields: [
      { key: "previous_school_name", label: "Previous school" },
      { key: "school_type", label: "School type", type: "select", options: [
        { value: "government", label: "Government" }, { value: "private", label: "Private" },
        { value: "religious", label: "Religious (Madrassa)" }, { value: "international", label: "International" },
        { value: "other", label: "Other" },
      ] },
      { key: "last_class_completed", label: "Last class completed" },
      { key: "last_years_result", label: "Last year’s result", type: "select", options: [
        { value: "excellent", label: "Excellent" }, { value: "very_good", label: "Very Good" },
        { value: "good", label: "Good" }, { value: "average", label: "Average" }, { value: "failed", label: "Failed" },
      ] },
      { key: "result_percentage", label: "Result percentage" },
      { key: "reason_for_change", label: "Reason for changing school", type: "textarea", wide: true },
    ],
  },
  {
    title: "Health & references",
    fields: [
      { key: "has_special_health_condition", label: "Has a special health condition", type: YES_NO },
      { key: "has_special_needs", label: "Has special needs", type: YES_NO },
      { key: "health_details", label: "Health details", type: "textarea", wide: true },
      { key: "how_did_you_hear", label: "How did you hear about us?", type: "select", options: [
        { value: "friend_acquaintance", label: "Friend / Acquaintance" }, { value: "media", label: "Media" },
        { value: "ads", label: "Ads" }, { value: "other", label: "Other" },
      ] },
      { key: "introducer_name", label: "Introducer’s name" },
      { key: "introducer_contact", label: "Introducer’s contact" },
      { key: "motivation_to_join", label: "Why do you want to join?", type: "textarea", wide: true },
    ],
  },
  {
    title: "Transport & uniform",
    fields: [
      { key: "transport_pickup_point", label: "Pickup point" },
      { key: "transport_dropoff_point", label: "Drop-off point" },
      { key: "need_uniform", label: "Order a uniform", type: YES_NO },
      { key: "uniform_chest", label: "Chest" },
      { key: "uniform_waist", label: "Waist" },
      { key: "uniform_height", label: "Height" },
      { key: "uniform_shoulder", label: "Shoulder" },
      { key: "uniform_sleeve", label: "Sleeve" },
      { key: "tailor_note", label: "Note for the tailor", type: "textarea", wide: true },
    ],
  },
];

/** Human-readable value of an answer for the staff review page. */
export function displayValue(field, value) {
  if (value === null || value === undefined || value === "") return null;
  if (field.type === YES_NO) return value ? "Yes" : "No";
  if (field.options) return field.options.find((o) => o.value === value)?.label || String(value);
  return String(value);
}
