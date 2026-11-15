/**
 * Which way a piece of user-written text reads.
 *
 * The language the INTERFACE is in and the language a message is WRITTEN in are
 * two different things. An announcement typed in Dari has to read right-to-left
 * even while the chrome around it — "Announcement", "2h ago", "Got it" — is
 * still English.
 *
 * HTML's own `dir="auto"` decides this correctly, but only for the element it
 * sits on. Put it on an inline `<bdi>` and the characters flow the right way
 * while the surrounding BLOCK keeps its own alignment: that is how a Dari
 * headline ended up hugging the left edge above a right-aligned Dari body. The
 * direction has to be set on the block, which sometimes means knowing it in JS.
 *
 * Same rule the browser applies: the first strong directional character wins.
 * Spaces, punctuation, symbols and digits carry no direction of their own and
 * are skipped — which is why "۱۳۹۹ اعلان" and "2026 announcement" each come out
 * the way their WORDS read, not the way their numerals happen to be written.
 */

// The invisible marks an author can embed to force a direction. Checked first
// because they exist precisely to overrule what the surrounding letters imply.
const RTL_MARK = /[\u200F\u061C]/;  // RIGHT-TO-LEFT MARK, ARABIC LETTER MARK
const LTR_MARK = /[\u200E]/;        // LEFT-TO-RIGHT MARK

// Whitespace, punctuation, symbols, digits and format characters. None of these
// settle a direction, so the scan reads straight past them.
const NEUTRAL = /[\p{White_Space}\p{P}\p{S}\p{N}\p{C}]/u;

const RTL_SCRIPT = /[\p{Script=Arabic}\p{Script=Hebrew}\p{Script=Syriac}\p{Script=Thaana}\p{Script=Nko}\p{Script=Samaritan}\p{Script=Mandaic}\p{Script=Adlam}]/u;

const LTR_SCRIPT = /[\p{Script=Latin}\p{Script=Greek}\p{Script=Cyrillic}\p{Script=Armenian}\p{Script=Georgian}\p{Script=Han}\p{Script=Hiragana}\p{Script=Katakana}\p{Script=Hangul}\p{Script=Devanagari}]/u;

/**
 * @param {string} text            the message to inspect
 * @param {"ltr"|"rtl"} fallback   used when nothing in the text settles it
 *                                 (empty, digits only, punctuation, emoji)
 * @returns {"ltr"|"rtl"}
 */
export const textDirection = (text, fallback = "ltr") => {
  if (!text) return fallback;
  for (const ch of String(text)) {
    if (RTL_MARK.test(ch)) return "rtl";
    if (LTR_MARK.test(ch)) return "ltr";
    if (NEUTRAL.test(ch)) continue;
    if (RTL_SCRIPT.test(ch)) return "rtl";
    if (LTR_SCRIPT.test(ch)) return "ltr";
  }
  return fallback;
};

/** True when the text reads right-to-left. */
export const isRtlText = (text, fallback = "ltr") => textDirection(text, fallback) === "rtl";

/**
 * The Arabic-script face the rest of the app already loads, and the extra
 * leading it needs. Naskh sits on a smaller optical body than Latin at the same
 * px and runs taller line-for-line, so a block set in the Latin UI face reads
 * cramped and clips its descenders.
 *
 * Returned as a style object (undefined for LTR) so it can be spread:
 *   style={{ color: "...", ...arabicTextStyle(dir) }}
 */
export const ARABIC_FONT_STACK = '"Vazirmatn", "Noto Naskh Arabic", "Segoe UI", Tahoma, sans-serif';

export const arabicTextStyle = (dir) =>
  dir === "rtl" ? { fontFamily: ARABIC_FONT_STACK, lineHeight: 1.9 } : undefined;
