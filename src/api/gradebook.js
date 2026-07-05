import { get, post, put } from "./axios";

// Gradebook + Homework module — mirrors /api/gradebook/*.
// Two flows converge on one marking screen: homework submissions (seeded from
// delivered lesson plans) and standalone assessments. Grades carry a numeric
// score + a required 4D dimension + a required qualitative tag.
const BASE = "/gradebook";

// The 4D spine — same keys/colours as the Lesson Plan module.
export const DIMENSIONS = [
  { key: "intellectual", label: "Intellectual", color: "#14919B" },
  { key: "character", label: "Character", color: "#C9A227" },
  { key: "social", label: "Social", color: "#C2607A" },
  { key: "practical", label: "Practical", color: "#2E7D5B" },
];

export const ASSESSMENT_TYPES = [
  { value: "homework", label: "Homework" },
  { value: "short_quiz", label: "Short quiz" },
  { value: "monthly_exam", label: "Monthly exam" },
  { value: "term_exam", label: "Term exam" },
  { value: "project", label: "Project" },
  { value: "class_activity", label: "Class activity" },
];

// ── Vocabulary ──────────────────────────────────────────────────────────
export const getTags = () => get(`${BASE}/tags`);

// ── Assessments (standalone flow) ───────────────────────────────────────
export const assessmentFormData = () => get(`${BASE}/assessments/form-data`);
export const linkablePlans = (params) => get(`${BASE}/assessments/linkable-plans`, { params });
export const listAssessments = (params = {}) => get(`${BASE}/assessments`, { params });
export const createAssessment = (data) => post(`${BASE}/assessments`, data);
export const getAssessment = (id) => get(`${BASE}/assessments/${id}`);

// ── Grades (the marking backend) ────────────────────────────────────────
export const saveGrade = (data) => post(`${BASE}/grades`, data);
export const updateGrade = (id, data) => put(`${BASE}/grades/${id}`, data);
export const voidGrade = (id, voided_reason) => post(`${BASE}/grades/${id}/void`, { voided_reason });
export const rewardGrade = (id) => post(`${BASE}/grades/${id}/reward`, {});

// ── Homework review queue ───────────────────────────────────────────────
export const assignHomework = (data) => post(`${BASE}/homework`, data);
export const homeworkQueue = (params = {}) => get(`${BASE}/homework/queue`, { params });
export const homeworkAssignment = (id) => get(`${BASE}/homework/assignment/${id}`);
export const homeworkSubmission = (id) => get(`${BASE}/homework/${id}`);
export const markHomework = (id, data) => post(`${BASE}/homework/${id}/mark`, data);

// ── Gradebook reads ─────────────────────────────────────────────────────
export const classGradebook = (classId, subjectId, params = {}) =>
  get(`${BASE}/class/${classId}/subject/${subjectId}`, { params });
export const studentSubject = (studentId, subjectId, params = {}) =>
  get(`${BASE}/student/${studentId}/subject/${subjectId}`, { params });
export const academicSummary = (studentId, params = {}) =>
  get(`${BASE}/student/${studentId}/academic-summary`, { params });

// ── Term exams (year-defining: midterm /40 + final /60 + re-exam /100) ──
export const TERM_EXAMS = [
  { key: "midterm", label: "Midterm", max: 40 },
  { key: "final", label: "Final term", max: 60 },
  { key: "reexam", label: "Re-exam", max: 100 },
];
export const termExamFormData = () => get(`${BASE}/term-exams/form-data`);
export const termExamSheet = (params) => get(`${BASE}/term-exams/sheet`, { params });
export const saveTermExam = (data) => post(`${BASE}/term-exams/save`, data);

// ── Promotion ───────────────────────────────────────────────────────────
export const promotionBoard = (params) => get(`${BASE}/promotion/board`, { params });
export const confirmPromotion = (data) => post(`${BASE}/promotion/confirm`, data);
export const assignPromotion = (data) => post(`${BASE}/promotion/assign`, data);
export const studentAcademicHistory = (studentId) => get(`${BASE}/promotion/student/${studentId}/history`);

// ── Admin panels (leadership) ───────────────────────────────────────────
export const crossClassSummary = (params = {}) => get(`${BASE}/admin/cross-class-summary`, { params });
export const homeworkCompliance = () => get(`${BASE}/admin/homework-compliance`);
export const coaching = () => get(`${BASE}/admin/coaching`);
