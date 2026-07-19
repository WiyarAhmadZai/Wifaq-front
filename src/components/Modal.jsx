/* ============================================================
 * Generic, responsive modal. Bottom-sheet on mobile, centered
 * card on desktop. Use instead of SweetAlert form dialogs.
 *
 *   <Modal open={open} onClose={() => setOpen(false)} title="Edit"
 *     footer={<button onClick={save}>Save</button>}>
 *     ...form...
 *   </Modal>
 * ============================================================ */

export default function Modal({ open, onClose, title, subtitle, children, footer, maxWidth = "sm:max-w-lg" }) {
  if (!open) return null;
  return (
    <div
      className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center p-0 sm:p-4"
      style={{ background: "rgba(5,37,40,.45)" }}
      onClick={onClose}
    >
      <div
        className={`bg-white w-full ${maxWidth} sm:rounded-2xl rounded-t-2xl shadow-2xl max-h-[92vh] overflow-y-auto`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="px-5 py-3.5 flex items-start justify-between gap-3 border-b sticky top-0 bg-white" style={{ borderColor: "#eef4f4" }}>
          <div>
            <h3 className="text-sm font-black text-gray-800">{title}</h3>
            {subtitle && <p className="text-[11px] text-gray-400 mt-0.5">{subtitle}</p>}
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg flex items-center justify-center text-gray-400 hover:bg-gray-100 hover:text-gray-600 flex-none"
            aria-label="Close"
          >
            ✕
          </button>
        </div>
        <div className="p-5">{children}</div>
        {footer && (
          <div className="px-5 py-3 border-t flex flex-wrap gap-2 justify-end sticky bottom-0 bg-white" style={{ borderColor: "#eef4f4" }}>
            {footer}
          </div>
        )}
      </div>
    </div>
  );
}
