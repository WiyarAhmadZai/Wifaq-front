import { DIMS, StudentName, cleanClass, cleanName, signatory, TEAL, GOLD, DARK, GOLD_DEEP } from "./weeklyUi";
import { certText } from "./certificateI18n";

/* ============================================================
 * Certificate of Recognition — Best Performer of the Week. Landscape A4.
 *
 * Composition rules this follows, learned the hard way:
 *   1. ONE centre axis. An earlier version split the page into a text column
 *      and a seal column, which pushed the body off the page's centreline and
 *      left it visibly misaligned under the centred title. The seal now sits in
 *      the signature rail, where a real certificate puts it, and every line
 *      shares the same axis.
 *   2. The three bands (letterhead / citation / rail) are distributed with
 *      space-between, so the page never opens a dead gap under the header.
 *   3. The background texture is a faint guilloche, not a giant word. A 300px
 *      monogram read as a grey slab behind the text and fought it for
 *      attention; fine diagonal rules give the same "security paper" feel and
 *      stay behind the type where they belong.
 *
 * Every ornament is inline SVG or CSS and every colour is a brand token, so it
 * needs no external asset and survives the print pipeline.
 * ============================================================ */


/** Engraved corner flourish, rotated into each corner of the frame. */
function Corner({ style }) {
  return (
    <svg width="78" height="78" viewBox="0 0 74 74" fill="none" style={{ position: "absolute", ...style }}>
      <path d="M4 70 L4 22 Q4 4 22 4 L70 4" stroke={GOLD} strokeWidth="1.4" fill="none" />
      <path d="M11 70 L11 25 Q11 11 25 11 L70 11" stroke={GOLD} strokeWidth="0.7" opacity="0.65" fill="none" />
      <path d="M11 44 Q26 44 26 28 Q26 18 18 18 Q11 18 11 25" stroke={GOLD} strokeWidth="0.7" opacity="0.5" fill="none" />
      <circle cx="18" cy="18" r="2.6" fill={GOLD} />
      <circle cx="34" cy="11" r="1.4" fill={GOLD} opacity="0.7" />
      <circle cx="11" cy="34" r="1.4" fill={GOLD} opacity="0.7" />
    </svg>
  );
}

/** Gold wax-seal medallion on a ribbon — the mark that makes it official. */
function Seal() {
  return (
    <svg width="126" height="160" viewBox="0 0 96 122" fill="none">
      <path d="M32 78 L20 118 L36 110 L44 121 L52 84 Z" fill={TEAL} />
      <path d="M64 78 L76 118 L60 110 L52 121 L44 84 Z" fill="#0A4A50" />
      <g>
        {Array.from({ length: 24 }).map((_, i) => {
          const a = (i / 24) * Math.PI * 2;
          return <circle key={i} cx={48 + Math.cos(a) * 40} cy={44 + Math.sin(a) * 40} r="4.6" fill={GOLD} />;
        })}
      </g>
      <circle cx="48" cy="44" r="39" fill={GOLD} />
      <circle cx="48" cy="44" r="33" fill="#F0D98A" />
      <circle cx="48" cy="44" r="30" fill="none" stroke={GOLD_DEEP} strokeWidth="1" opacity="0.55" />
      <circle cx="48" cy="44" r="26" fill={GOLD} />
      <path d="M48 26 L53.5 39.5 L68 40.5 L57 50 L60.5 64 L48 56.5 L35.5 64 L39 50 L28 40.5 L42.5 39.5 Z" fill="#FFF8E7" />
    </svg>
  );
}

/** Gold rule that tapers out from a centre diamond. */
function Divider({ width = 190 }) {
  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 9 }}>
      <span style={{ height: 1, width, background: `linear-gradient(90deg,transparent,${GOLD})` }} />
      <span style={{ width: 6, height: 6, background: GOLD, transform: "rotate(45deg)" }} />
      <span style={{ height: 1, width, background: `linear-gradient(90deg,${GOLD},transparent)` }} />
    </div>
  );
}

/** A signature rule with its role caption. */
function SignLine({ name, role, track, fs }) {
  return (
    <div style={{ textAlign: "center", width: 250 }}>
      <div style={{ borderTop: `1px solid ${TEAL}`, paddingTop: 6, fontSize: fs(13.5), fontWeight: 700 }}>
        {name || " "}
      </div>
      <div style={{ fontSize: fs(9.5), letterSpacing: track(1.9), color: "#5A7A7E", marginTop: 3 }}>{role}</div>
    </div>
  );
}

export default function AwardCertificate({ award, topic, lang = "en" }) {
  const t = certText(lang);
  const rtl = t.dir === "rtl";
  // Tracking is a Latin display device. Applied to Arabic script it prises the
  // joined letterforms apart, so every RTL language collapses it to zero.
  const track = (px) => (t.track ? px : 0);
  // Naskh sits on a smaller optical body than Georgia, so the same px value
  // reads noticeably smaller in Dari/Pashto. Nudge the script up to match.
  const fs = (px) => (rtl ? Math.round(px * 1.12 * 10) / 10 : px);
  // Naskh also runs taller line-for-line, so the gaps between blocks are
  // tightened for RTL rather than shrinking the type back down — legibility
  // matters more than whitespace on a document families keep.
  const mt = (px) => (rtl ? Math.round(px * 0.6) : px);
  const cls = cleanClass(award.class);
  const announced = award.announced_at ? String(award.announced_at).slice(0, 10) : "";
  const week = [topic?.week_start, topic?.week_end].filter(Boolean).join("  —  ");
  const dims = award.dimensions || [];

  // The page has a fixed height, so the display size has to yield to the name.
  // Left at 76px a long name wrapped to three lines and pushed the seal and
  // signature rail clean off the sheet. Step it down by length instead.
  const name = cleanName(award.student);
  const nameSize = (rtl ? 0.92 : 1) * (name.length <= 16 ? 76
                 : name.length <= 26 ? 58
                 : name.length <= 38 ? 46
                 : 38);
  // A long citation gets a smaller measure for the same reason.
  const citation = award.citation || "";
  const citSize = citation.length > 190 ? 12 : citation.length > 120 ? 13 : 14;

  return (
    <div
      className="wen-no-break"
      dir={t.dir}
      style={{
        position: "relative",
        aspectRatio: "297 / 210",          // landscape A4, so preview = page
        background: "linear-gradient(150deg,#FFFFFF 0%,#FDFBF5 50%,#FAF6EA 100%)",
        padding: 11,
        color: DARK,
        fontFamily: t.font,
        overflow: "hidden",
      }}
    >
      <div style={{ border: `3px solid ${TEAL}`, padding: 4, height: "100%" }}>
        <div
          style={{
            border: `1px solid ${GOLD}`,
            position: "relative",
            height: "100%",
            padding: "22px 62px 18px",
            display: "flex",
            flexDirection: "column",
            justifyContent: "flex-start",
            overflow: "hidden",
          }}
        >
          {/* Guilloche texture — security-paper feel, stays behind the type. */}
          <div
            aria-hidden
            style={{
              position: "absolute", inset: 0, pointerEvents: "none", opacity: 0.5,
              backgroundImage:
                `repeating-linear-gradient(45deg, ${TEAL}0A 0 1px, transparent 1px 9px),` +
                `repeating-linear-gradient(-45deg, ${GOLD}0A 0 1px, transparent 1px 9px)`,
            }}
          />
          {/* A soft halo behind the recipient's name so it sits on light ground. */}
          <div
            aria-hidden
            style={{
              position: "absolute", left: "50%", top: "46%", width: 620, height: 200,
              transform: "translate(-50%,-50%)", pointerEvents: "none",
              background: "radial-gradient(ellipse at center, #FFFFFF 0%, #FFFFFFE0 45%, transparent 72%)",
            }}
          />

          <Corner style={{ top: 0, left: 0 }} />
          <Corner style={{ top: 0, right: 0, transform: "scaleX(-1)" }} />
          <Corner style={{ bottom: 0, left: 0, transform: "scaleY(-1)" }} />
          <Corner style={{ bottom: 0, right: 0, transform: "scale(-1,-1)" }} />

          {/* ── Band 1 · letterhead ──────────────────────────────────────── */}
          <div style={{ position: "relative", textAlign: "center", flexShrink: 0 }}>
            <div style={{ letterSpacing: track(6), fontSize: fs(12.5), color: TEAL, fontWeight: 700 }}>
              {t.org}
            </div>
            <div style={{ fontSize: fs(9.5), letterSpacing: track(3.4), color: "#5A7A7E", marginTop: 3 }}>
              {t.dept}
            </div>

            <div style={{ fontSize: rtl ? 46 : 56, letterSpacing: track(17), color: TEAL, marginTop: 10, fontWeight: 700, lineHeight: 1.25 }}>
              {t.certificate}
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 13, justifyContent: "center", marginTop: 3 }}>
              <span style={{ height: 1, width: 150, background: `linear-gradient(90deg,transparent,${GOLD})` }} />
              <span style={{ fontSize: fs(12), letterSpacing: track(6), color: GOLD_DEEP, fontWeight: 700, whiteSpace: "nowrap" }}>
                {t.ofRecognition}
              </span>
              <span style={{ height: 1, width: 150, background: `linear-gradient(90deg,${GOLD},transparent)` }} />
            </div>
          </div>

          {/* ── Band 2 · the award itself, on the page's centre axis.
                 flex:1 + centred means the whitespace splits evenly above and
                 below it rather than collecting under the header. ─────────── */}
          <div style={{
            position: "relative", textAlign: "center", flex: 1,
            display: "flex", flexDirection: "column", justifyContent: "center",
            padding: rtl ? "6px 0 4px" : "14px 0 8px",
          }}>
            <div style={{ fontSize: fs(15), fontStyle: rtl ? "normal" : "italic", color: "#5A7A7E" }}>
              {t.certifyThat}
            </div>

            <StudentName
              name={award.student}
              style={{
                display: "block", fontSize: nameSize, fontWeight: 700, color: TEAL,
                marginTop: 1, lineHeight: rtl ? 1.35 : 1.3, fontFamily: t.font,
              }}
            />

            {(cls || award.code) && (
              <div style={{ fontSize: fs(12), color: "#5A7A7E", marginTop: 5, letterSpacing: track(2) }}>
                {[cls, award.code].filter(Boolean).join("   ·   ")}
              </div>
            )}

            <div style={{ marginTop: mt(9) }}><Divider width={230} /></div>

            <div style={{ fontSize: fs(15.5), marginTop: mt(14), color: "#24494C", lineHeight: rtl ? 1.7 : 1.7 }}>
              {t.recognisedAs}{" "}
              <span style={{ color: GOLD_DEEP, fontWeight: 700, letterSpacing: track(2) }}>
                {t.award}
              </span>
              <br />
              {t.forConduct}
            </div>

            <div
              style={{
                display: "inline-block", alignSelf: "center", marginTop: mt(13), padding: "9px 40px",
                border: `1px solid ${GOLD}`, background: "#FFFBEF",
                fontSize: fs(27), fontWeight: 700, color: TEAL,
              }}
            >
              {topic?.title || award.topic}
            </div>

            {week && (
              <div dir="ltr" style={{ fontSize: 11, color: "#5A7A7E", marginTop: mt(9), letterSpacing: track(3) }}>{week}</div>
            )}

            {/* Areas as engraved small-caps, not web pills — this is paper. */}
            {dims.length > 0 && (
              <div
                style={{
                  display: "flex", justifyContent: "center", alignItems: "center",
                  flexWrap: "wrap", gap: 13, marginTop: mt(15),
                }}
              >
                {dims.map((d, i) => (
                  <span key={d} style={{ display: "inline-flex", alignItems: "center", gap: 10 }}>
                    {i > 0 && <span style={{ width: 4, height: 4, background: GOLD, transform: "rotate(45deg)" }} />}
                    <span
                      style={{
                        fontSize: fs(11.5), letterSpacing: track(2.6), fontWeight: 700,
                        color: (DIMS[d] || {}).fg || TEAL,
                        textTransform: rtl ? "none" : "uppercase",
                      }}
                    >
                      {t.dims[d] || (DIMS[d] || {}).label || d}
                    </span>
                  </span>
                ))}
              </div>
            )}

            {award.citation && (
              <div
                style={{
                  display: "inline-block", alignSelf: "center", maxWidth: 660, margin: `${mt(16)}px auto 0`,
                  fontSize: citSize, lineHeight: 1.75, fontStyle: rtl ? "normal" : "italic", color: "#4A5F62",
                  position: "relative", padding: "0 30px",
                }}
              >
                <span style={{ position: "absolute", left: 0, top: -6, fontSize: 32, color: GOLD, opacity: 0.55 }}>
                  &ldquo;
                </span>
                {award.citation}
                <span style={{ position: "absolute", right: 0, bottom: -20, fontSize: 32, color: GOLD, opacity: 0.55 }}>
                  &rdquo;
                </span>
              </div>
            )}
          </div>

          {/* ── Band 3 · seal centred in the signature rail ──────────────── */}
          <div
            style={{
              position: "relative", display: "flex", alignItems: "flex-end",
              justifyContent: "space-between", gap: 20, flexShrink: 0,
            }}
          >
            <SignLine name={signatory(award.selected_by, t.signatory)} role={t.signRole} track={track} fs={fs} />

            <div style={{ textAlign: "center", marginBottom: -4 }}>
              <Seal />
              <div style={{ fontSize: fs(9.5), color: "#5A7A7E", letterSpacing: track(0.5), marginTop: 3 }}>
                {t.nominations(award.nominations)}
              </div>
            </div>

            <SignLine name={announced} role={t.dateRole} track={track} fs={fs} />
          </div>
        </div>
      </div>
    </div>
  );
}
