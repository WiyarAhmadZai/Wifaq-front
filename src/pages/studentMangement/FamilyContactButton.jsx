import { useEffect, useRef, useState } from "react";
import { FiPhone, FiMessageCircle, FiChevronDown } from "react-icons/fi";

// Normalise a raw phone number to E.164-ish digits for wa.me. Afghan numbers
// are the default: a leading 0 is the local trunk prefix → replace with 93;
// a bare 9/10-digit local number gets 93 prepended. Already-international
// numbers (starting with a country code) are kept as-is.
function waDigits(phone) {
  let d = (phone || "").replace(/[^\d]/g, "");
  if (!d) return null;
  if (d.startsWith("00")) d = d.slice(2);
  else if (d.startsWith("0")) d = "93" + d.slice(1);
  else if (!d.startsWith("93") && d.length <= 10) d = "93" + d;
  return d;
}

// A single row action: pick a family phone, then WhatsApp or Call it. Keeps the
// user on the page (opens wa.me / tel: — no in-app navigation).
export default function FamilyContactButton({ family }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    if (!open) return;
    const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  const phones = [
    { label: "Father", value: family?.father_phone },
    { label: "Mother", value: family?.mother_phone },
  ].filter((p) => p.value);

  if (phones.length === 0) {
    return (
      <span className="inline-flex items-center px-2 py-1 text-[10px] text-gray-300" title="No family phone on record">
        No contact
      </span>
    );
  }

  return (
    <div className="relative inline-block" ref={ref}>
      <button
        type="button"
        onClick={(e) => { e.stopPropagation(); setOpen((v) => !v); }}
        className="inline-flex items-center gap-1 px-2.5 py-1 text-[10px] font-semibold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded-lg"
        title="Contact family"
      >
        <FiPhone className="w-3 h-3" />
        Contact
        <FiChevronDown className="w-3 h-3" />
      </button>

      {open && (
        <div
          onClick={(e) => e.stopPropagation()}
          className="absolute right-0 z-30 mt-1 w-52 bg-white rounded-xl shadow-lg border border-gray-100 py-1 text-xs"
        >
          {phones.map((p) => (
            <div key={p.label} className="px-1">
              <div className="px-2 pt-1.5 pb-0.5 text-[10px] font-bold text-gray-400 uppercase tracking-wide">
                {p.label} — {p.value}
              </div>
              <div className="flex gap-1 px-1 pb-1.5">
                <a
                  href={`https://wa.me/${waDigits(p.value)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={() => setOpen(false)}
                  className="flex-1 inline-flex items-center justify-center gap-1 px-2 py-1.5 rounded-lg bg-green-500 hover:bg-green-600 text-white font-semibold"
                >
                  <FiMessageCircle className="w-3.5 h-3.5" />
                  WhatsApp
                </a>
                <a
                  href={`tel:${(p.value || "").replace(/[^\d+]/g, "")}`}
                  onClick={() => setOpen(false)}
                  className="flex-1 inline-flex items-center justify-center gap-1 px-2 py-1.5 rounded-lg bg-blue-500 hover:bg-blue-600 text-white font-semibold"
                >
                  <FiPhone className="w-3.5 h-3.5" />
                  Call
                </a>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
