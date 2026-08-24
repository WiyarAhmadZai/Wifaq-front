/**
 * The languages the interface is published in.
 *
 * One code, one dictionary file: en.js, ps.js, dr.js. `htmlLang` is the real
 * BCP-47 tag that goes on <html lang> — Dari is fa-AF to the browser, screen
 * readers and spell-checkers, whatever we call the file.
 */
export const LANGUAGES = [
  { code: "en", label: "English", native: "English", dir: "ltr", short: "EN",   htmlLang: "en" },
  { code: "dr", label: "Dari",    native: "دری",     dir: "rtl", short: "دری",  htmlLang: "fa-AF" },
  { code: "ps", label: "Pashto",  native: "پښتو",    dir: "rtl", short: "پښتو", htmlLang: "ps" },
];

export const DEFAULT_LANG = "en";

export const STORAGE_KEY = "wen.lang";

export const langMeta = (code) =>
  LANGUAGES.find((l) => l.code === code) || LANGUAGES[0];

export const isRtl = (code) => langMeta(code).dir === "rtl";
