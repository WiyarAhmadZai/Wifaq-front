import { useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";

// This route exists only for backward compatibility.
// All create/edit flows now happen in the modal on /class-management/exams.
export default function ExamsForm() {
  const navigate = useNavigate();
  const { id } = useParams();

  useEffect(() => {
    const target = id ? `/class-management/exams?edit=${id}` : `/class-management/exams`;
    navigate(target, { replace: true });
  }, [id, navigate]);

  return (
    <div className="min-h-[60vh] flex items-center justify-center">
      <div className="animate-spin rounded-full h-10 w-10 border-3 border-teal-100 border-t-teal-600"></div>
    </div>
  );
}
