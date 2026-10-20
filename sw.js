/* Baby Kids — service worker (offline cache) */
const CACHE = "babykids-v24";
const ASSETS = [
  "./",
  "index.html",
  "css/styles.css",
  "js/config.js",
  "js/data.js",
  "js/store.js",
  "js/sync.js",
  "js/app.js",
  "manifest.webmanifest",
  "icons/icon.svg",
  "icons/icon-192.png",
  "icons/icon-512.png",
];

self.addEventListener("install", (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(ASSETS)).then(() => self.skipWaiting()));
});

self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))).then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (e) => {
  const req = e.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  const sameOrigin = url.origin === self.location.origin;
  // network-first สำหรับหน้าเว็บ + ไฟล์โค้ด (js/css/manifest) → เห็นตัวใหม่ทันทีเมื่อออนไลน์
  const codeFile = sameOrigin && /\.(js|css|webmanifest)$/.test(url.pathname);

  if (req.mode === "navigate" || codeFile) {
    e.respondWith(
      fetch(req).then((res) => {
        const copy = res.clone();
        caches.open(CACHE).then((c) => c.put(req, copy)).catch(() => {});
        return res;
      }).catch(() => caches.match(req).then((c) => c || caches.match("index.html")))
    );
    return;
  }
  // อื่นๆ (รูป/ไอคอน/ฟอนต์) → cache-first เพื่อความเร็ว + ใช้ออฟไลน์ได้
  e.respondWith(
    caches.match(req).then((cached) => cached || fetch(req).then((res) => {
      const copy = res.clone();
      caches.open(CACHE).then((c) => c.put(req, copy)).catch(() => {});
      return res;
    }).catch(() => cached))
  );
});
