/* ============================================================
 * Certificate localisation — English, Dari (دری), Pashto (پښتو).
 *
 * Two things matter beyond the words themselves:
 *
 *   • Direction. Dari and Pashto are right-to-left, so the whole sheet flips.
 *   • Letter-spacing. The English design leans on wide tracking for its display
 *     lines, but tracking applied to Arabic script pushes the joined letterforms
 *     apart and makes the word look broken. Every RTL language therefore
 *     reports `track: false` and the certificate zeroes its tracking.
 *
 * TRANSLATION NOTE: the Dari and Pashto strings below are a best-effort
 * starting point and should be reviewed by a native speaker before this goes to
 * families — a certificate is a public document and awkward phrasing shows.
 * ============================================================ */

export const CERT_LANGS = [
  { code: "en", label: "English", native: "English" },
  { code: "fa", label: "Dari",    native: "دری" },
  { code: "ps", label: "Pashto",  native: "پښتو" },
];

/**
 * Serif stacks.
 *
 * The Arabic-script stack leads with Noto Naskh Arabic — a naskh serif suited
 * to a formal document and loaded by index.html — then Vazirmatn, which the app
 * already pulls in. The earlier stack named fonts nobody had installed, so it
 * fell through to Times New Roman, whose Arabic is thin and poorly fitted; that
 * is what made the Dari and Pashto sheets look wrong.
 */
const SERIF_LATIN = "'Georgia','Times New Roman',serif";
const SERIF_ARABIC = "'Noto Naskh Arabic','Vazirmatn','Segoe UI','Tahoma',serif";

export const CERT_STRINGS = {
  en: {
    dir: "ltr",
    font: SERIF_LATIN,
    track: true,
    org: "WIFAQ EDUCATION NETWORK",
    dept: "STUDENT RECOGNITION · TARBIYATI",
    certificate: "CERTIFICATE",
    ofRecognition: "OF RECOGNITION",
    certifyThat: "This is to certify that",
    recognisedAs: "is hereby recognised as",
    award: "BEST PERFORMER OF THE WEEK",
    forConduct: "for outstanding contribution and conduct during the theme of",
    nominations: (n) => `on the strength of ${n} teacher nomination${n === 1 ? "" : "s"}`,
    signRole: "TARBIYATI LEAD",
    dateRole: "DATE AWARDED",
    signatory: "Academic Director",
    dims: {
      intellectual: "Intellectual",
      moral: "Moral & Spiritual",
      practical: "Practical",
      social: "Social",
    },
  },

  fa: {
    dir: "rtl",
    font: SERIF_ARABIC,
    track: false,
    org: "شبکهٔ معارف وفاق",
    dept: "تقدیر شاگردان · تربیتی",
    certificate: "تصدیق‌نامه",
    ofRecognition: "قدردانی",
    certifyThat: "بدین‌وسیله تصدیق می‌گردد که",
    recognisedAs: "به‌عنوان",
    award: "بهترین شاگرد هفته",
    forConduct: "به‌خاطر سهم‌گیری و رفتار برجسته در موضوع هفته",
    nominations: (n) => `بر اساس ${n} پیشنهاد استادان`,
    signRole: "مسئول تربیتی",
    dateRole: "تاریخ اعطا",
    signatory: "مدیر تعلیمی",
    dims: {
      intellectual: "فکری",
      moral: "اخلاقی و معنوی",
      practical: "عملی",
      social: "اجتماعی",
    },
  },

  ps: {
    dir: "rtl",
    font: SERIF_ARABIC,
    track: false,
    org: "د وفاق د پوهنې شبکه",
    dept: "د زده‌کوونکو قدرداني · تربیتي",
    certificate: "تصدیق‌نامه",
    ofRecognition: "د قدردانۍ",
    certifyThat: "په دې وسیله تصدیق کیږي چې",
    recognisedAs: "په توګه پیژندل کیږي",
    award: "د اونۍ غوره زده‌کوونکی",
    forConduct: "د اونۍ د موضوع په ترڅ کې د غوره ونډې او چلند له امله",
    nominations: (n) => `د ښوونکو د ${n} وړاندیزونو پر بنسټ`,
    signRole: "د تربیتي مسئول",
    dateRole: "د ورکړې نېټه",
    signatory: "تعلیمي مدیر",
    dims: {
      intellectual: "فکري",
      moral: "اخلاقي او روحاني",
      practical: "عملي",
      social: "ټولنیز",
    },
  },
};

export const certText = (lang) => CERT_STRINGS[lang] || CERT_STRINGS.en;
