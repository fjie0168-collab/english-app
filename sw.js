// Service Worker：缓存应用外壳，实现离线可用
var CACHE = "english-app-v1";
var ASSETS = [
  "./",
  "index.html",
  "manifest.json",
  "icon.svg",
  "css/styles.css",
  "js/srs.js",
  "js/audio.js",
  "js/scenes.js",
  "js/scene.js",
  "js/app.js",
  "words/cet4.js",
  "words/cet6.js",
  "words/ielts.js",
  "words/daily.js",
  "words/content.js"
];

self.addEventListener("install", function (e) {
  e.waitUntil(caches.open(CACHE).then(function (c) { return c.addAll(ASSETS); }).then(function () { return self.skipWaiting(); }));
});

self.addEventListener("activate", function (e) {
  e.waitUntil(
    caches.keys().then(function (keys) {
      return Promise.all(keys.filter(function (k) { return k !== CACHE; }).map(function (k) { return caches.delete(k); }));
    }).then(function () { return self.clients.claim(); })
  );
});

self.addEventListener("fetch", function (e) {
  if (e.request.method !== "GET") return;
  e.respondWith(
    caches.match(e.request).then(function (hit) {
      if (hit) return hit;
      return fetch(e.request).then(function (res) {
        // 仅缓存同源静态资源
        if (res && res.status === 200 && res.type === "basic") {
          var copy = res.clone();
          caches.open(CACHE).then(function (c) { c.put(e.request, copy); });
        }
        return res;
      }).catch(function () { return caches.match("index.html"); });
    })
  );
});
