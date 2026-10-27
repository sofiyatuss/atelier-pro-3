/* The Atelier service worker. Generated at build time from src/sw-template.js. */
const VERSION = 'c3f0c454fd22';
const CACHE = `atelier-${VERSION}`;
const PRECACHE = ["./","KaTeX_AMS-Regular-U6PRYMIZ.woff2","KaTeX_Caligraphic-Bold-5QL5CMTE.woff2","KaTeX_Caligraphic-Regular-KX5MEWCF.woff2","KaTeX_Fraktur-Bold-2QVFK6NQ.woff2","KaTeX_Fraktur-Regular-2PEIFJSJ.woff2","KaTeX_Main-Bold-YP5VVQRP.woff2","KaTeX_Main-BoldItalic-N4V3DX7S.woff2","KaTeX_Main-Italic-RELBIK7M.woff2","KaTeX_Main-Regular-ARRPAO67.woff2","KaTeX_Math-BoldItalic-K4WTGH3J.woff2","KaTeX_Math-Italic-6KGCHLFN.woff2","KaTeX_SansSerif-Bold-RRNVJFFW.woff2","KaTeX_SansSerif-Italic-HMPFTM52.woff2","KaTeX_SansSerif-Regular-XIQ62X4E.woff2","KaTeX_Script-Regular-APUWIHLP.woff2","KaTeX_Size1-Regular-5LRUTBFT.woff2","KaTeX_Size2-Regular-LELKET5D.woff2","KaTeX_Size3-Regular-WQRQ47UD.woff2","KaTeX_Size4-Regular-CDMV7U5C.woff2","KaTeX_Typewriter-Regular-VBYJ4NRC.woff2","app.css","app.js","apple-touch-icon.png","chunk-2TV4JFQO.js","chunk-3NLPAYR2.js","chunk-3YLVIHUK.js","chunk-6JODDUKH.js","chunk-AM2QFVVG.js","chunk-B6AXE2TS.js","chunk-BI7CH2GO.js","chunk-BVVHFFNG.js","chunk-CKVY7I2K.js","chunk-DPT3QHYJ.js","chunk-EW2RXGFQ.js","chunk-H7G6RBXU.js","chunk-HTHO76DD.js","chunk-I32SZMWW.js","chunk-IJQW4PKM.js","chunk-JACBKPGQ.js","chunk-MOGGTP4G.js","chunk-MWI6X4YA.js","chunk-MWLTAZRC.js","chunk-NR7AFMYJ.js","chunk-OQ5GEUBA.js","chunk-ROKVKDET.js","chunk-SAAG7A2Q.js","chunk-SJGQFWUR.js","chunk-SYSQ2YVJ.js","chunk-T7AHGDXQ.js","chunk-V2QSXZC2.js","chunk-VBWRW4T7.js","chunk-WYZ2T5WC.js","chunk-XTH6PVIO.js","chunk-Y2HSQ43U.js","chunk-Z44RLXP4.js","icon-192.png","icon-512.png","icon.svg","index.html","manifest.webmanifest","maskable-512.png","pdf.worker.min.js"];

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(CACHE).then((c) => c.addAll(PRECACHE)));
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.filter((k) => k.startsWith('atelier-') && k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener('message', (event) => {
  if (event.data === 'skip-waiting') self.skipWaiting();
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  // Never cache third-party API traffic (PubMed, OpenAlex, Crossref, your AI endpoint).
  if (url.origin !== self.location.origin) return;

  // Discovery digests are produced by the scheduled GitHub Action: always try the network first.
  if (url.pathname.endsWith('/discoveries.json')) {
    event.respondWith(fetch(req).catch(() => caches.match(req)));
    return;
  }

  if (req.mode === 'navigate') {
    event.respondWith(fetch(req).catch(() => caches.match('./', { ignoreSearch: true })));
    return;
  }

  event.respondWith(
    caches.match(req, { ignoreSearch: true }).then((hit) => hit || fetch(req).then((res) => {
      if (res.ok && res.type === 'basic') {
        const copy = res.clone();
        caches.open(CACHE).then((c) => c.put(req, copy));
      }
      return res;
    })),
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const target = event.notification.data && event.notification.data.url ? event.notification.data.url : './';
  event.waitUntil(self.clients.matchAll({ type: 'window' }).then((wins) => {
    for (const w of wins) { if ('focus' in w) { w.navigate(target); return w.focus(); } }
    return self.clients.openWindow(target);
  }));
});
