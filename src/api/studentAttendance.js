import { get, post } from './axios';

const BASE = '/student-management/attendance';

// Classes the caller may take attendance for. A teacher gets only the classes
// they supervise; the office gets all. The backend decides — never filter this
// list client-side or a teacher could widen it by editing the request.
export const getAttendanceClasses = (params = {}) => get(`${BASE}/classes`, { params });

// Roster + whatever is already marked for one class on one date.
export const getAttendanceSheet = (params) => get(`${BASE}/sheet`, { params });

// Save the whole sheet. Absent / half-day marks notify the parents server-side.
export const saveAttendanceSheet = (data) => post(`${BASE}/sheet`, data);

// Everyone marked on a date (optionally one class / one status) with the parent
// contact routes — the working set for the broadcast tools.
export const getAttendanceRoster = (params) => get(`${BASE}/roster`, { params });

// daily | weekly | monthly | six_months | annual
export const getAttendanceReport = (params) => get(`${BASE}/report`, { params });

// Re-send the in-app notice for records whose parents were not reached.
export const notifyParents = (data) => post(`${BASE}/notify`, data);

// Optional extra channels. Email sends server-side; WhatsApp returns click-to-
// chat links because the school has no WhatsApp Business API.
export const emailParents = (data) => post(`${BASE}/email`, data);
export const whatsappParents = (data) => post(`${BASE}/whatsapp`, data);

// What each parent WOULD receive, with the typed note folded in. Composed by
// the same server code that sends, so the compose box shows the real message
// rather than a client-side guess at it.
export const previewBroadcast = (data) => post(`${BASE}/broadcast-preview`, data);

// A parent reading their own children's record.
export const getMyChildrenAttendance = (params = {}) => get(`${BASE}/my-children`, { params });

// One student's monthly statement. Reachable by staff holding
// `student-attendance.statement` and by the student's own parent — the server
// decides which, so the same call serves the office and the parent portal.
export const getStudentStatement = (studentId, params = {}) =>
  get(`${BASE}/statement/${studentId}`, { params });

/**
 * Download the same statement as a PDF.
 *
 * Blob rather than a plain link: the API needs the bearer token, which a raw
 * <a href> cannot send, so the browser would get a 401 and save the error page
 * as a .pdf.
 */
export const downloadStudentStatementPdf = async (studentId, { year, month, filename } = {}) => {
  const res = await get(`${BASE}/statement/${studentId}/pdf`, {
    params: { year, month },
    responseType: "blob",
  });
  const url = URL.createObjectURL(new Blob([res.data], { type: "application/pdf" }));
  const a = document.createElement("a");
  a.href = url;
  a.download = filename || `attendance-${studentId}-${year}-${String(month).padStart(2, "0")}.pdf`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  // Revoke on the next tick — Firefox cancels the download if it goes too soon.
  setTimeout(() => URL.revokeObjectURL(url), 1000);
};
