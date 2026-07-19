// DOB module API — birthdays for students, teachers and staff.
import api from "./axios";

export const birthdaysApi = {
  // type: "student" | "teacher" | "staff"
  // params: { month, search, scope: all|today|week|month|upcoming, days }
  list: (type, params = {}) => api.get(`/birthdays/${type}`, { params }),
  calendar: (type, year, month) => api.get(`/birthdays/${type}/calendar`, { params: { year, month } }),
  summary: () => api.get("/birthdays/summary"),
};

export default birthdaysApi;
