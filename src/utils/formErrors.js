/* ============================================================
 * Date display helpers — project-wide rule: every visible date is
 * day/Month/year → DD/MM/YYYY. Display only; never for
 * <input type="date"> values or API payloads (those stay ISO).
 * ============================================================ */

function toDate(value) {
  if (value === null || value === undefined || value === "") return null;
  if (value instanceof Date) return isNaN(value.getTime()) ? null : value;
  if (typeof value === "string") {
    const m = value.match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (m) return new Date(+m[1], +m[2] - 1, +m[3]);
  }
  const d = new Date(value);
  return isNaN(d.getTime()) ? null : d;
}

const pad = (n) => String(n).padStart(2, "0");

/** DD/MM/YYYY — the canonical display format for the whole app. */
export function fmtDate(value, placeholder = "—") {
  const d = toDate(value);
  if (!d) return placeholder;
  return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()}`;
}

/** DD/MM/YYYY HH:mm — for timestamps that need the time of day. */
export function fmtDateTime(value, placeholder = "—") {
  const d = toDate(value);
  if (!d) return placeholder;
  return `${fmtDate(d)} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

/** Month label for pickers / period headers (stays a month name). */
export function fmtMonth(year, monthIndex0, opts = {}) {
  const d = new Date(Number(year) || 2000, Number(monthIndex0) || 0, 1);
  if (isNaN(d.getTime())) return "—";
  const name = d.toLocaleString("en-US", { month: "long" });
  return opts.yearless ? name : `${name} ${d.getFullYear()}`;
}

/**
 * Handle 422 validation errors from backend.
 * Sets errors state, navigates to correct step, applies red styling, scrolls to first error.
 */
export function handleValidationErrors(errorResponse, setErrors, setStep = null, stepFields = null) {
  if (errorResponse?.status === 422 && errorResponse?.data?.errors) {
    const errs = errorResponse.data.errors;
    setErrors(errs);

    const firstField = Object.keys(errs)[0];

    // Navigate to the step containing the error field
    if (setStep && stepFields) {
      for (const [s, fields] of Object.entries(stepFields)) {
        if (fields.includes(firstField)) {
          setStep(Number(s));
          break;
        }
      }
    }

    // Wait for React re-render (step change), then style and scroll
    setTimeout(() => {
      applyErrorStyling(errs);
    }, 300);

    return true;
  }
  return false;
}

/**
 * Apply red styling + error messages to fields with errors.
 * Works on any form by targeting DOM elements by name attribute.
 */
function applyErrorStyling(errs) {
  const errorFields = Object.keys(errs);
  let firstEl = null;

  errorFields.forEach(fieldName => {
    const el = document.querySelector(`[name="${fieldName}"]`);
    if (!el) return;

    if (!firstEl) firstEl = el;

    // Add red border and background
    el.style.borderColor = '#f87171';
    el.style.backgroundColor = '#fef2f2';
    el.style.outline = 'none';
    el.style.boxShadow = '0 0 0 2px rgba(248, 113, 113, 0.3)';

    // Remove existing error message if any
    const parent = el.closest('div') || el.parentElement;
    const existing = parent.querySelector('.validation-error-msg');
    if (existing) existing.remove();

    // Add error message below field
    const errMsg = document.createElement('p');
    errMsg.className = 'validation-error-msg';
    errMsg.style.cssText = 'color: #ef4444; font-size: 11px; font-weight: 500; margin-top: 4px;';
    errMsg.textContent = errs[fieldName][0];
    el.insertAdjacentElement('afterend', errMsg);

    // On focus, keep red ring
    const onFocus = () => {
      el.style.boxShadow = '0 0 0 2px rgba(248, 113, 113, 0.5)';
    };

    // Clear red styling when user types/changes
    const clearError = () => {
      el.style.borderColor = '';
      el.style.backgroundColor = '';
      el.style.boxShadow = '';
      el.style.outline = '';
      const msg = parent.querySelector('.validation-error-msg');
      if (msg) msg.remove();
      el.removeEventListener('input', clearError);
      el.removeEventListener('change', clearError);
      el.removeEventListener('focus', onFocus);
    };

    el.addEventListener('input', clearError);
    el.addEventListener('change', clearError);
    el.addEventListener('focus', onFocus);
  });

  // Scroll to and focus the first error field
  if (firstEl) {
    firstEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
    firstEl.focus();
  }
}
