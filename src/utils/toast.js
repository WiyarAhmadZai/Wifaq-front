/* ============================================================
 * Lightweight, dependency-free toast notifications.
 * Non-blocking, stacked, auto-dismissing — used app-wide in
 * place of blocking SweetAlert dialogs for success/error feedback.
 *
 *   import { toastSuccess, toastError } from "../../utils/toast";
 *   toastSuccess("Saved");
 *   toastError("Something went wrong");
 * ============================================================ */

let container = null;

function ensureContainer() {
  if (container && document.body.contains(container)) return container;
  container = document.createElement("div");
  container.setAttribute("data-toast-root", "");
  container.style.cssText =
    "position:fixed;top:16px;right:16px;z-index:9999;display:flex;flex-direction:column;gap:8px;max-width:min(92vw,360px);pointer-events:none";
  document.body.appendChild(container);
  return container;
}

const VARIANTS = {
  success: { fg: "#0D5C63", icon: "✓" },
  error: { fg: "#C0392B", icon: "⚠" },
  warn: { fg: "#9a6a12", icon: "⚠" },
  info: { fg: "#0D5C63", icon: "ℹ" },
};

export function toast(message, type = "success", ms = 2600) {
  if (!message) return;
  const c = ensureContainer();
  const v = VARIANTS[type] || VARIANTS.success;

  const el = document.createElement("div");
  el.style.cssText =
    `pointer-events:auto;display:flex;align-items:center;gap:9px;background:#fff;border-left:4px solid ${v.fg};` +
    "box-shadow:0 8px 28px rgba(5,37,40,.16);border-radius:12px;padding:11px 14px;min-width:200px;" +
    "font:600 13px/1.45 'Source Sans 3',system-ui,sans-serif;color:#0c1f20;" +
    "transform:translateX(120%);opacity:0;transition:transform .28s cubic-bezier(.2,.8,.2,1),opacity .28s";

  const icon = document.createElement("span");
  icon.style.cssText = `font-size:15px;color:${v.fg};flex:none`;
  icon.textContent = v.icon;
  const text = document.createElement("span");
  text.style.cssText = "flex:1;word-break:break-word";
  text.textContent = message;
  el.appendChild(icon);
  el.appendChild(text);
  c.appendChild(el);

  requestAnimationFrame(() => {
    el.style.transform = "translateX(0)";
    el.style.opacity = "1";
  });

  const dismiss = () => {
    el.style.transform = "translateX(120%)";
    el.style.opacity = "0";
    setTimeout(() => el.remove(), 300);
  };
  el.addEventListener("click", dismiss);
  setTimeout(dismiss, ms);
}

export const toastSuccess = (m) => toast(m, "success");
export const toastError = (m) => toast(m, "error");
export const toastWarn = (m) => toast(m, "warn");
export const toastInfo = (m) => toast(m, "info");
