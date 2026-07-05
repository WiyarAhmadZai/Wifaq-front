/* Wifaq service worker — OS notifications (WhatsApp-Web style).
 *
 * On mobile, `new Notification()` is an "Illegal constructor" — notifications
 * MUST be shown via the service worker registration. The app calls
 * registration.showNotification(); this worker handles the click (focus the
 * open tab + tell it where to navigate, or open a new window).
 *
 * It also listens for server `push` events (when Web Push is enabled later).
 */

self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (event) => event.waitUntil(self.clients.claim()));

// Server-initiated Web Push (used once VAPID push is enabled on the backend).
self.addEventListener("push", (event) => {
  let data = {};
  try { data = event.data ? event.data.json() : {}; } catch (e) { data = { body: event.data && event.data.text() }; }
  const title = data.title || "Wifaq";
  event.waitUntil(
    self.registration.showNotification(title, {
      body: data.body || data.message || "",
      icon: "/favicon.ico",
      badge: "/favicon.ico",
      tag: data.tag || undefined,
      renotify: true,
      data: { link: data.link || "/" },
    })
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const link = (event.notification.data && event.notification.data.link) || "/";
  event.waitUntil((async () => {
    const all = await self.clients.matchAll({ type: "window", includeUncontrolled: true });
    for (const client of all) {
      if ("focus" in client) {
        await client.focus();
        try { client.postMessage({ type: "notif-navigate", link }); } catch (e) { /* ignore */ }
        return;
      }
    }
    if (self.clients.openWindow) await self.clients.openWindow(link);
  })());
});
