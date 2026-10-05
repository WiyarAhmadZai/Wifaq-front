import { Link } from "react-router-dom";

/**
 * New staff orientation — the in-system copy of wifaqschool.com/orientation.html:
 * what to sign, what to read and digest, and what to browse and use, first for
 * every member of staff and then for teachers. Same sections, same links, same
 * look; no password screen, since only signed-in staff reach it.
 *
 * The page is Dari like the original, so it is kept out of the DOM translator.
 * Every link lives in GROUPS below — change or add one there. A page that
 * exists inside the system is linked with `to` (opens here); only what lives
 * outside the system uses `href` (opens in a new tab).
 */
const GROUPS = [
  {
    title: "برای همه کارمندان",
    cards: [
      {
        kind: "sign",
        items: [
          {
            title: "اصول رفتاری و مدیریتی وفاق",
            href: "https://docs.google.com/document/d/1UAoJHQGePRbEW8xsG4kwIqmX0Z5geNl6Mm7toyL-JTU/edit?tab=t.0#heading=h.buxmswl8eg7s",
          },
          {
            title: "تعهدنامه — تعهد به ارزش‌های وفاق",
            href: "https://docs.google.com/document/d/1Eec9X11Q9YTDpAy6AuFgJ17BqISGBcC6/edit",
          },
        ],
      },
      {
        kind: "read",
        items: [
          { title: "منشور تعلیم چهار بُعدی", href: "https://wifaqschool.com/4D/4D-intro.html" },
          { title: "معرفی سیستم تعلیم چهار بُعدی", href: "https://wifaqschool.com/4D/" },
        ],
      },
      {
        kind: "use",
        items: [
          { title: "صفحه عمومی مکتب وفاق", href: "https://wifaqschool.com" },
          { title: "صفحه شبکه تعلیمی وفاق", href: "https://www.wifaq.edu.af" },
          { title: "سیستم آنلاین وفاق", to: "/", cta: "ورود" },
        ],
        note: { icon: "📶", label: "وای‌فای دفتر (Wifaq Office):", value: "رمز — Wifaq!@2026" },
      },
    ],
  },
  {
    title: "برای معلمین",
    cards: [
      {
        kind: "read",
        items: [
          { title: "کتاب رسالت معلم", href: "https://wifaqschool.com/4D/guide/risalat_muallim.pdf" },
          {
            title: "رهنمود پلان درسی چهار بُعدی",
            href: "https://docs.google.com/document/d/1avveSn_2o9-4cW66NKhdiCZcDV4AuIckCLG5mHVR2kM/edit?tab=t.0",
          },
          { title: "رهنمود ثبت مشاهدات", href: "https://wifaqschool.com/4D/guide/observations-guide.html" },
        ],
      },
      {
        kind: "use",
        items: [
          {
            title: "پورتال استادان-این را فعلا فقط مرور کنید. برای استفاده به سیستم جدید مراجعه کنید",
            note: "همه فورم‌ها، پلان درسی، مشاهدات، رخصتی و منابع در یکجا",
            href: "https://wifaqschool.com/teachers.html",
            cta: "ورود",
            // The same things, in the new system — where they are actually used.
            links: [
              { label: "پلان درسی", to: "/education/lesson-plans/my" },
              { label: "مشاهدات", to: "/education/observations" },
              { label: "رخصتی", to: "/hr/leave-request" },
            ],
          },
        ],
        note: { icon: "🔑", label: "پاسورد پورتال استادان:", value: "wifaq2027" },
      },
    ],
  },
];

// Colours taken from the original page.
const KINDS = {
  sign: {
    title: "باید امضا شود",
    en: "To Sign",
    icon: "✍️",
    iconBg: "linear-gradient(135deg, #e74c3c, #c0392b)",
    go: "bg-[#FEE2E2] text-[#B91C1C]",
  },
  read: {
    title: "باید مطالعه و درک شود",
    en: "To Read & Digest",
    icon: "📖",
    iconBg: "linear-gradient(135deg, #14919B, #0D5C63)",
    go: "bg-[#E3F2FD] text-[#1565C0]",
  },
  use: {
    title: "باید بشناسید و استفاده کنید",
    en: "To Browse & Use",
    icon: "🧭",
    iconBg: "linear-gradient(135deg, #C9A227, #b8891a)",
    go: "bg-[#FEF3C7] text-[#92400E]",
  },
};

const AMIRI = { fontFamily: "'Amiri', serif" };
const PATTERN =
  "url(\"data:image/svg+xml,%3Csvg width='80' height='80' viewBox='0 0 80 80' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' stroke='%23ffffff' stroke-opacity='0.05' stroke-width='1'%3E%3Cpath d='M40 0 L80 40 L40 80 L0 40 Z'/%3E%3Ccircle cx='40' cy='40' r='20'/%3E%3C/g%3E%3C/svg%3E\")";

export default function OrientationResources() {
  return (
    <div dir="rtl" data-no-i18n className="orientation-text min-h-full bg-[#f0f7f8] text-[#1a2e30] leading-[1.7]">
      <header
        className="relative overflow-hidden px-6 pt-10 pb-8 text-center text-white"
        style={{ background: "linear-gradient(135deg, #052528 0%, #0D5C63 100%)" }}
      >
        <div aria-hidden className="pointer-events-none absolute inset-0" style={{ backgroundImage: PATTERN }} />
        <span
          dir="ltr"
          className="relative mb-3.5 inline-block rounded-full border border-[#C9A227]/40 bg-[#C9A227]/20 px-3 py-1 text-[0.7rem] tracking-wide text-[#f0d070]"
        >
          WEN · New Staff Orientation
        </span>
        <h1 className="relative mb-1.5 text-[1.9rem] font-bold" style={AMIRI}>
          راهنمای آشناسازی کارمندان جدید
        </h1>
        <p className="relative mx-auto max-w-[480px] text-[0.92rem] opacity-85">
          مجموعه‌ای از مهم‌ترین اسناد، منابع و ابزارها — دسته‌بندی شده بر اساس آنچه باید امضا کنید، بخوانید، یا از آن استفاده نمایید
        </p>
      </header>

      <div className="mx-auto max-w-[800px] px-5 pt-8 pb-12">
        {GROUPS.map((group, gi) => (
          <section key={group.title}>
            <div className={`flex items-center gap-3 mb-4 ${gi === 0 ? "" : "mt-9"}`}>
              <h2 className="whitespace-nowrap text-xl text-[#0D5C63]" style={AMIRI}>
                {group.title}
              </h2>
              <span className="h-px flex-1 bg-[#d4eaec]" />
            </div>
            {group.cards.map((card, i) => (
              <Stage key={i} card={card} />
            ))}
          </section>
        ))}
      </div>

      <footer className="px-6 pb-8 text-center text-[0.78rem] text-[#5a7a7d]">
        <div className="mb-0.5 text-base text-[#0D5C63]" style={AMIRI}>
          به خانوادۀ وفاق خوش آمدید
        </div>
        مدیریت شبکه تعلیمی وفاق
      </footer>
    </div>
  );
}

function Stage({ card }) {
  const kind = KINDS[card.kind];
  return (
    <div className="mb-4 rounded-2xl border border-[#d4eaec] bg-white px-5 py-5 shadow-[0_2px_12px_rgba(5,37,40,0.06)]">
      <div className="mb-3.5 flex items-center gap-2.5">
        <span
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-[9px] text-[0.95rem] text-white"
          style={{ background: kind.iconBg }}
        >
          {kind.icon}
        </span>
        <h3 className="text-[0.95rem] font-bold">
          {kind.title}
          <span dir="ltr" className="ms-1.5 text-[0.72rem] font-normal text-[#5a7a7d]">
            {kind.en}
          </span>
        </h3>
      </div>

      <div className="flex flex-col gap-2">
        {card.items.map((item) => (
          <div key={item.title}>
            <ItemLink item={item} go={kind.go} />
            {item.links && (
              <div className="mt-1.5 flex flex-wrap items-center gap-1.5 ps-1 text-[0.72rem]">
                <span className="text-[#5a7a7d]">در سیستم جدید:</span>
                {item.links.map((l) => (
                  <Link
                    key={l.to}
                    to={l.to}
                    className={`rounded-md px-2.5 py-1 font-bold transition-opacity hover:opacity-80 ${kind.go}`}
                  >
                    {l.label}
                  </Link>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>

      {card.note && (
        <div className="mt-3.5 rounded-[10px] border border-dashed border-[#C9A227] bg-[#fdf7e3] px-3.5 py-3 text-[0.78rem] text-[#7a5c10]">
          {card.note.icon} <b className="text-[#52400a]">{card.note.label}</b> {card.note.value}
        </div>
      )}
    </div>
  );
}

function ItemLink({ item, go }) {
  const cls =
    "flex flex-col items-start gap-3 rounded-[10px] border border-[#d4eaec] bg-[#f0f7f8] px-3.5 py-3 transition-all hover:-translate-x-0.5 hover:bg-[#e4f4f5] sm:flex-row sm:items-center sm:justify-between";
  const body = (
    <>
      <span className="text-[0.86rem] font-semibold">
        {item.title}
        {item.note && <span className="mt-0.5 block text-[0.72rem] font-normal text-[#5a7a7d]">{item.note}</span>}
      </span>
      <span className={`shrink-0 self-end whitespace-nowrap rounded-md px-2.5 py-1 text-[0.7rem] font-bold sm:self-auto ${go}`}>
        {item.cta || "باز کردن"}
        {item.href ? " ↗" : ""}
      </span>
    </>
  );

  if (item.to) {
    return (
      <Link to={item.to} className={cls}>
        {body}
      </Link>
    );
  }
  return (
    <a href={item.href} target="_blank" rel="noreferrer" className={cls}>
      {body}
    </a>
  );
}
