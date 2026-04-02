// COMMIT Service Worker — handles push notifications and notification clicks

// Push event: server sends a notification via Web Push
self.addEventListener("push", (event) => {
  const data = event.data ? event.data.json() : {};
  const title = data.title || "COMMIT";
  const options = {
    body: data.body || "",
    icon: "/logo-icon.png",
    badge: "/logo-icon.png",
    data: { page: data.page || "/" },
    tag: data.tag || "commit-notification",
  };
  event.waitUntil(self.registration.showNotification(title, options));
});

// Notification click: open/focus app at the deep link page
self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const page = event.notification.data?.page || "/";
  event.waitUntil(
    clients
      .matchAll({ type: "window", includeUncontrolled: true })
      .then((windowClients) => {
        // Focus existing window if open
        for (const client of windowClients) {
          if (client.url.includes(self.location.origin) && "focus" in client) {
            return client.focus().then((c) => c.navigate(page));
          }
        }
        // Otherwise open a new window
        return clients.openWindow(page);
      }),
  );
});

// Activate: claim clients immediately so SW controls the page right away
self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});
