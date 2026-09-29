// Replace earlier cached builds with a network-only worker for this preview.
// Does not clear IndexedDB, localStorage, or user check-in records.
self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", event => event.waitUntil(self.clients.claim()));
