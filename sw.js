/* The Atelier service worker. Generated at build time from src/sw-template.js. */
const VERSION = 'e6997e22f5d3';
const CACHE = `atelier-${VERSION}`;
const PRECACHE = ["./","KaTeX_AMS-Regular-U6PRYMIZ.woff2","KaTeX_Caligraphic-Bold-5QL5CMTE.woff2","KaTeX_Caligraphic-Regular-KX5MEWCF.woff2","KaTeX_Fraktur-Bold-2QVFK6NQ.woff2","KaTeX_Fraktur-Regular-2PEIFJSJ.woff2","KaTeX_Main-Bold-YP5VVQRP.woff2","KaTeX_Main-BoldItalic-N4V3DX7S.woff2","KaTeX_Main-Italic-RELBIK7M.woff2","KaTeX_Main-Regular-ARRPAO67.woff2","KaTeX_Math-BoldItalic-K4WTGH3J.woff2","KaTeX_Math-Italic-6KGCHLFN.woff2","KaTeX_SansSerif-Bold-RRNVJFFW.woff2","KaTeX_SansSerif-Italic-HMPFTM52.woff2","KaTeX_SansSerif-Regular-XIQ62X4E.woff2","KaTeX_Script-Regular-APUWIHLP.woff2","KaTeX_Size1-Regular-5LRUTBFT.woff2","KaTeX_Size2-Regular-LELKET5D.woff2","KaTeX_Size3-Regular-WQRQ47UD.woff2","KaTeX_Size4-Regular-CDMV7U5C.woff2","KaTeX_Typewriter-Regular-VBYJ4NRC.woff2","app.css","app.js","apple-touch-icon.png","chunk-2M7SDRKS.js","chunk-37MHQER2.js","chunk-3UY2EBML.js","chunk-4HHKEOW4.js","chunk-4M3IKSJY.js","chunk-53BLQA5R.js","chunk-5NB5LQII.js","chunk-7TTOLSDA.js","chunk-7VBJ45NG.js","chunk-A7FTK3WO.js","chunk-AAMBW6EK.js","chunk-ABVRTLTV.js","chunk-ARA6MVRK.js","chunk-B3BFX67Q.js","chunk-BN7UIKEF.js","chunk-EI4ZMS2A.js","chunk-EKE2I5OO.js","chunk-EKROHSCF.js","chunk-FL4NYEMP.js","chunk-FMHCP2WQ.js","chunk-FUPQK5EF.js","chunk-G4JUUDL5.js","chunk-GR235NQF.js","chunk-HFCPKM6U.js","chunk-HPCPGLZK.js","chunk-HR4E4HUZ.js","chunk-HVHRXW6J.js","chunk-IE42MQUS.js","chunk-IT3RJ5EB.js","chunk-J4DWM6AN.js","chunk-KSKDD3GQ.js","chunk-LKPPYNKM.js","chunk-N4FVQDME.js","chunk-NAPMYOJN.js","chunk-NZ6ZR7JX.js","chunk-OOO75RTO.js","chunk-QDW73O3C.js","chunk-RPGRRLPT.js","chunk-S2KLHA2Z.js","chunk-S6YUWXWX.js","chunk-SHBMWNER.js","chunk-SVAEECSJ.js","chunk-T4GHP3JD.js","chunk-T7AHGDXQ.js","chunk-UXVFODBZ.js","chunk-VGTR7XWA.js","chunk-VWEAY4VP.js","chunk-WGY7FHOT.js","chunk-XMEF4VN2.js","chunk-XPSYFWLM.js","chunk-YHXW6RL7.js","chunk-YIPJULOS.js","chunk-YJZT4RYX.js","chunk-YUXFFDTV.js","chunk-YXSFPSQT.js","icon-192.png","icon-512.png","icon.svg","index.html","manifest.webmanifest","maskable-512.png","pdf.worker.min.js","voice-worker.js"];

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
  // The on-device speech engine (Transformers.js + ONNX Runtime): versioned files, cache-first so
  // voice transcription keeps working offline. (Model weights are cached by the engine itself.)
  if (url.hostname === 'cdn.jsdelivr.net' && url.pathname.startsWith('/npm/@huggingface/transformers@')) {
    event.respondWith(caches.open('voice-engine-v1').then(async (c) => {
      const hit = await c.match(req);
      if (hit) return hit;
      const res = await fetch(req);
      if (res.ok) c.put(req, res.clone());
      return res;
    }));
    return;
  }
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
