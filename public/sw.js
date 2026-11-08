/* Wifaq service worker — OS notifications (WhatsApp-Web style).
 *
 * On mobile, `new Notification()` is an "Illegal constructor" — notifications
 * MUST be shown via the service worker registration. The app calls
 * registration.showNotification(); this worker handles the click (focus the
 * open tab + tell it where to navigate, or open a new window).
 *
 * It also shows server `push` events. An incoming call gets Answer / Decline
 * buttons: Answer opens (or focuses) the system and answers that call at once;
 * Decline declines it from an open tab, or just closes the notification.
 */

self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (event) => event.waitUntil(self.clients.claim()));

/* The worker cannot read the page's language setting, so the page tells it
 * (see chat/push.js) and it is kept in the Cache API, which outlives the
 * worker being stopped between pushes. */
const LANG_CACHE = "wen-sw-lang";
const LANG_KEY = "/__sw-lang";
const TEXT = {
  en: { answer: "Answer", decline: "Decline", voice: "Incoming voice call", video: "Incoming video call", missed: "Missed call" },
  dr: { answer: "جواب", decline: "رد", voice: "تماس صوتی ورودی", video: "تماس تصویری ورودی", missed: "تماس از دست رفته" },
  ps: { answer: "ځواب", decline: "رد", voice: "راتلونکې غږیزه اړیکه", video: "راتلونکې ویډیويي اړیکه", missed: "له لاسه وتلې اړیکه" },
};

async function readLang() {
  try {
    const r = await (await caches.open(LANG_CACHE)).match(LANG_KEY);
    const lang = r ? await r.text() : "en";
    return TEXT[lang] ? lang : "en";
  } catch (e) { return "en"; }
}

self.addEventListener("message", (event) => {
  const d = event.data || {};
  if (d.type === "set-lang" && TEXT[d.lang]) {
    event.waitUntil(caches.open(LANG_CACHE).then((c) => c.put(LANG_KEY, new Response(d.lang))));
  }
});

// Server-initiated Web Push.
self.addEventListener("push", (event) => {
  let data = {};
  try { data = event.data ? event.data.json() : {}; } catch (e) { data = { body: event.data && event.data.text() }; }
  event.waitUntil((async () => {
    const t = TEXT[await readLang()];
    const isCall = Boolean(data.call && data.call_id);
    let body = data.body || data.message || "";
    if (data.call_id) body = data.missed ? t.missed : (data.media === "video" ? t.video : t.voice);
    await self.registration.showNotification(data.title || "Wifaq", {
      body,
      icon: "/favicon.png",
      badge: "/favicon.png",
      tag: data.tag || undefined,
      renotify: true,
      // An incoming call stays on screen and vibrates until it is answered or dismissed.
      requireInteraction: isCall,
      vibrate: isCall ? [400, 200, 400, 200, 400] : undefined,
      actions: isCall ? [{ action: "answer", title: t.answer }, { action: "decline", title: t.decline }] : [],
      data: { link: data.link || "/", callId: isCall ? data.call_id : null },
    });
  })());
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const { link = "/", callId = null } = event.notification.data || {};
  event.waitUntil((async () => {
    const all = await self.clients.matchAll({ type: "window", includeUncontrolled: true });
    const client = all.find((c) => "focus" in c);

    // Decline: only an open tab can tell the caller; with none, closing the
    // notification is all there is (the ring then times out as missed).
    if (callId && event.action === "decline") {
      if (client) { try { client.postMessage({ type: "call-decline", callId }); } catch (e) { /* ignore */ } }
      return;
    }

    // Answer (the button, or a tap on the call notification itself).
    if (callId) {
      if (client) {
        await client.focus();
        try { client.postMessage({ type: "call-answer", callId }); } catch (e) { /* ignore */ }
      } else if (self.clients.openWindow) {
        await self.clients.openWindow(`/?answer_call=${encodeURIComponent(callId)}`);
      }
      return;
    }

    if (client) {
      await client.focus();
      try { client.postMessage({ type: "notif-navigate", link }); } catch (e) { /* ignore */ }
      return;
    }
    if (self.clients.openWindow) await self.clients.openWindow(link);
  })());
});
