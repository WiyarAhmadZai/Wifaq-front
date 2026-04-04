/**
 * Handle 422 validation errors from backend.
 * Sets errors state and scrolls/focuses to the first error field.
 * For multi-step forms, pass setStep and stepFields to auto-navigate.
 *
 * @param {object} errorResponse - error.response from axios
 * @param {function} setErrors - setState function for errors
 * @param {function} [setStep] - setState for step (multi-step forms)
 * @param {object} [stepFields] - { 1: ['field1','field2'], 2: ['field3'] }
 * @returns {boolean} true if it was a 422 error, false otherwise
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

    // Scroll to and focus the error field
    setTimeout(() => {
      const el = document.querySelector(`[name="${firstField}"]`);
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'center' });
        el.focus();
      }
    }, 200);

    return true;
  }
  return false;
}
