import { useCallback } from "react";
import { useNavigate, useLocation } from "react-router-dom";

/**
 * "Back" that actually goes back.
 *
 * Every detail/form page used to hard-code `navigate("/section/list")` on its
 * Back button. That threw away where the user came from: opening the third
 * applicant on page 4 of a filtered list and pressing Back dumped them on an
 * unfiltered page 1 — and the same happened when the page had been reached
 * from a dashboard, a search result or a notification.
 *
 * This walks the history entry back instead, so the browser restores the exact
 * previous URL (query string and all — filters, page number, tab) and
 * <ScrollMemory> puts the scroll position back where it was.
 *
 * The literal path is still needed as a fallback for the case history cannot
 * serve: the page was opened directly (pasted link, bookmark, new tab, a
 * notification deep-link), so there is no in-app entry to return to. React
 * Router stamps its stack index onto `history.state.idx`; index 0 means this
 * entry is the first of the session and `navigate(-1)` would leave the app.
 *
 *   const goBack = useSmartBack("/recruitment/applications");
 *   <button onClick={goBack}>Back</button>
 *
 * @param {string} fallback  where to land when there is no history to pop
 * @returns {(e?: Event) => void} click-ready handler
 */
export default function useSmartBack(fallback = "/") {
  const navigate = useNavigate();
  const location = useLocation();

  return useCallback(() => {
    // A page may hand the caller an explicit return target (`state.from`);
    // that wins, because it is the one thing more accurate than the stack.
    const from = location.state?.from;
    if (typeof from === "string" && from) {
      navigate(from, { replace: true });
      return;
    }

    const idx = window.history.state?.idx;
    if (typeof idx === "number" && idx > 0) {
      navigate(-1);
      return;
    }

    navigate(fallback, { replace: true });
  }, [navigate, fallback, location.state]);
}
