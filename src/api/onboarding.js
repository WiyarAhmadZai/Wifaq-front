import { get, post } from "./axios";

/**
 * Onboarding — the welcome message HR composes at hire time, and the
 * orientation + quiz the new hire works through inside the system.
 *
 * The compose endpoints exist against both an application (the hire moment)
 * and a staff record (a later re-send); the modal takes whichever base it is
 * given so one component covers both.
 */

export const applicationBase = (id) => `/recruitment/applications/${id}/onboarding-message`;
export const staffBase = (id) => `/hr/staff/${id}/onboarding-message`;

/** Defaults the compose dialog opens with (name, languages, links). */
export const getComposeDefaults = (applicationId) =>
  get(applicationBase(applicationId), { cache: false });

/** Same defaults for a staff record, plus messages already sent + quiz status. */
export const getStaffOnboarding = (staffId) =>
  get(`/hr/staff/${staffId}/onboarding`, { cache: false });

/** Render — but do not send — the message in the chosen languages. */
export const previewMessage = (base, payload) => post(`${base}/preview`, payload);

/** Send it. */
export const sendMessage = (base, payload) => post(base, payload);

// ── The employee's own side ──────────────────────────────────────────────────

export const getMyOnboarding = () => get("/profile/onboarding", { cache: false });

export const getQuizPaper = (lang) =>
  get(`/profile/onboarding/quiz?lang=${encodeURIComponent(lang)}`, { cache: false });

export const submitQuiz = (payload) => post("/profile/onboarding/quiz", payload);
