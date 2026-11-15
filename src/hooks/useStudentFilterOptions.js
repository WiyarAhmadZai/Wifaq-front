import { useEffect, useState } from "react";
import { get } from "../api/axios";


export default function useStudentFilterOptions() {
  const [grades, setGrades] = useState([]);
  const [classes, setClasses] = useState([]);
  const [terms, setTerms] = useState([]);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const r = await get("/grades/list");
        if (alive) setGrades((r.data?.data || r.data || []).map((g) => ({ value: g.id, label: g.name })));
      } catch { /* ignore */ }
      try {
        const r = await get("/class-management/classes/list?per_page=1000");
        if (alive) setClasses((r.data?.data || r.data || []).map((c) => ({ value: c.id, label: c.class_name })));
      } catch { /* ignore */ }
      try {
        const r = await get("/academic-terms/list");
        if (alive) setTerms((r.data?.data || r.data || []).map((t) => ({ value: t.id, label: t.name })));
      } catch { /* ignore */ }
    })();
    return () => { alive = false; };
  }, []);

  return { grades, classes, terms };
}

export const GENDER_OPTIONS = [
  { value: "male", label: "Male" },
  { value: "female", label: "Female" },
];
export const STUDENT_STATUS_OPTIONS = [
  { value: "pending", label: "Pending" },
  { value: "active", label: "Active" },
  { value: "graduated", label: "Graduated" },
  { value: "withdrawn", label: "Withdrawn" },
  { value: "transferred", label: "Transferred" },
];
export const SPECIAL_STATUS_OPTIONS = [
  { value: "none", label: "None" },
  { value: "orphan", label: "Orphan" },
  { value: "employee_child", label: "Employee child" },
  { value: "fourth_child", label: "Fourth child" },
];
