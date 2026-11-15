import { createContext, useContext, useEffect, useMemo, useRef, useState, useCallback } from "react";
import { LANGUAGES, DEFAULT_LANG, STORAGE_KEY, langMeta } from "./languages";
import { setLanguage as applyToDom } from "./domTranslator";

/**
 * Interface language for the whole app.
 *
 * The chosen language lives in localStorage, so a reload keeps it, and it is
 * applied in two ways:
 *
 *   1. <html lang dir> flips, which turns the whole layout right-to-left for
 *      Dari and Pashto and switches the font stack (see i18n/rtl.css).
 *   2. The DOM translator swaps every English interface string it has a
 *      translation for. Anything that came from the database is left alone.
 *
 * Components can also translate explicitly with the t() from useI18n() — that
 * is the right tool for a string that is built at runtime, e.g. inside a
 * Swal.fire title, where reading it back off the DOM would be too late.
 */

const I18nContext = createContext({
  lang: DEFAULT_LANG,
  setLang: () => {},
  t: (s) => s,
  dir: "ltr",
  ready: true,
  languages: LANGUAGES,
});

/**
 * One dictionary file per language, code-split: an English user downloads
 * neither of them, and English needs none — en.js is the canonical source list
 * for translators, not a runtime substitution table.
 */
const loaders = {
  en: null,
  dr: () => import("./dr"),
  ps: () => import("./ps"),
};

const cache = new Map(); // code → { forward: Map, reverse: Map }

async function loadDict(code) {
  if (code === "en" || !loaders[code]) return { forward: new Map(), reverse: new Map() };
  if (cache.has(code)) return cache.get(code);

  const mod = await loaders[code]();
  const table = mod.default || mod.dictionary || {};
  const forward = new Map();
  const reverse = new Map();
  for (const [en, out] of Object.entries(table)) {
    if (!out || out === en) continue;
    forward.set(en, out);
    if (!reverse.has(out)) reverse.set(out, en);   // first English wins a clash
  }
  const entry = { forward, reverse };
  cache.set(code, entry);
  return entry;
}

const readStored = () => {
  try {
    const v = localStorage.getItem(STORAGE_KEY);
    return LANGUAGES.some((l) => l.code === v) ? v : DEFAULT_LANG;
  } catch {
    return DEFAULT_LANG;
  }
};

export function I18nProvider({ children }) {
  const [lang, setLangState] = useState(readStored);
  // Which language is actually on screen. Derived rather than a second flag so
  // nothing has to setState during the effect body just to say "loading".
  const [shown, setShown] = useState(() => (readStored() === DEFAULT_LANG ? DEFAULT_LANG : null));
  const ready = shown === lang;
  // The dictionary of the language currently on screen, for t().
  const [forward, setForward] = useState(() => new Map());
  // Reverse map of the language being replaced, so the translator can find its
  // way back to the English source on a second switch.
  const previous = useRef(new Map());

  useEffect(() => {
    let alive = true;

    loadDict(lang)
      .then(({ forward: f, reverse: r }) => {
        if (!alive) return;
        const meta = langMeta(lang);
        document.documentElement.lang = meta.htmlLang || lang;
        document.documentElement.dir = meta.dir;
        document.documentElement.setAttribute("data-lang", lang);

        applyToDom(lang, f, previous.current);
        previous.current = r;
        setForward(f);
        setShown(lang);
      })
      .catch(() => alive && setShown(lang));

    return () => { alive = false; };
  }, [lang]);

  const setLang = useCallback((code) => {
    if (!LANGUAGES.some((l) => l.code === code)) return;
    try { localStorage.setItem(STORAGE_KEY, code); } catch { /* private mode */ }
    setLangState(code);
  }, []);

  /**
   * Translate a string, optionally filling `{}` slots left to right.
   *
   *   t("Save")                          → "ساتل"
   *   t("Total {}", t("Branches"))       → "ټول شعبې"
   *
   * The slot form is what a shared component needs: `Total ${title}` composed
   * in JavaScript can never be matched by the DOM translator, because the
   * finished sentence is not a string any developer ever wrote. Keying the
   * TEMPLATE instead keeps one dictionary entry working for all 21 list pages,
   * and lets a language put the noun wherever its grammar wants it.
   */
  const t = useCallback(
    (text, ...values) => {
      if (text == null) return text;
      const out = forward.get(String(text).trim()) ?? text;
      return values.length ? values.reduce((s, v) => s.replace("{}", v), out) : out;
    },
    [forward]
  );

  const value = useMemo(
    () => ({ lang, setLang, t, dir: langMeta(lang).dir, ready, languages: LANGUAGES }),
    [lang, setLang, t, ready]
  );

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export const useI18n = () => useContext(I18nContext);

/**
 * Translate outside React (utility modules, axios interceptors, Swal helpers).
 * Reads the live dictionary the provider last loaded.
 */
export function translate(text) {
  const entry = cache.get(readStored());
  if (!entry) return text;
  return entry.forward.get(String(text ?? "").trim()) ?? text;
}
