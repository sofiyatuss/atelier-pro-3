/* The Atelier service worker. Generated at build time from src/sw-template.js. */
const VERSION = '650185227b05';
const CACHE = `atelier-${VERSION}`;
const PRECACHE = ["./","KaTeX_AMS-Regular-U6PRYMIZ.woff2","KaTeX_Caligraphic-Bold-5QL5CMTE.woff2","KaTeX_Caligraphic-Regular-KX5MEWCF.woff2","KaTeX_Fraktur-Bold-2QVFK6NQ.woff2","KaTeX_Fraktur-Regular-2PEIFJSJ.woff2","KaTeX_Main-Bold-YP5VVQRP.woff2","KaTeX_Main-BoldItalic-N4V3DX7S.woff2","KaTeX_Main-Italic-RELBIK7M.woff2","KaTeX_Main-Regular-ARRPAO67.woff2","KaTeX_Math-BoldItalic-K4WTGH3J.woff2","KaTeX_Math-Italic-6KGCHLFN.woff2","KaTeX_SansSerif-Bold-RRNVJFFW.woff2","KaTeX_SansSerif-Italic-HMPFTM52.woff2","KaTeX_SansSerif-Regular-XIQ62X4E.woff2","KaTeX_Script-Regular-APUWIHLP.woff2","KaTeX_Size1-Regular-5LRUTBFT.woff2","KaTeX_Size2-Regular-LELKET5D.woff2","KaTeX_Size3-Regular-WQRQ47UD.woff2","KaTeX_Size4-Regular-CDMV7U5C.woff2","KaTeX_Typewriter-Regular-VBYJ4NRC.woff2","app.css","app.js","apple-touch-icon.png","chunk-23N7NQXA.js","chunk-2V3LBXKV.js","chunk-33E34WKD.js","chunk-3IW7RUIO.js","chunk-4J2UXI4P.js","chunk-4JWN46R7.js","chunk-4MVVAKHX.js","chunk-53C67GLS.js","chunk-5EIFG6GM.js","chunk-5MGYLY6X.js","chunk-6YKR2PVE.js","chunk-74F45RIY.js","chunk-7M2AEP5I.js","chunk-7S5MAHBU.js","chunk-AS3CN2B6.js","chunk-B6OJ2BZM.js","chunk-CERQ2YAF.js","chunk-CQ6OZA75.js","chunk-CQLVEJPL.js","chunk-CTNPCVFD.js","chunk-DBEALFY7.js","chunk-DY33W3JE.js","chunk-EDZRNABH.js","chunk-EZZHOC3F.js","chunk-FQXKCLDD.js","chunk-GG6RDV6A.js","chunk-GJD6Q5M4.js","chunk-GJX2CGX3.js","chunk-GZ43CVHB.js","chunk-HMFCBQGM.js","chunk-HSHIDOSB.js","chunk-I5GM7NJ4.js","chunk-JF4EOL3F.js","chunk-JSI5SXLI.js","chunk-KSV33OPV.js","chunk-MNZVRCBQ.js","chunk-N4HGM5A2.js","chunk-N7LV3UUG.js","chunk-N7XSREA6.js","chunk-NAPMYOJN.js","chunk-NIGZUA6Y.js","chunk-NPHRI7KY.js","chunk-OY2FH7FD.js","chunk-PIBS5C3L.js","chunk-QMZDM5SD.js","chunk-QPMUPTBV.js","chunk-R3UVCH3Q.js","chunk-RUWMIBIC.js","chunk-S5DLPLCX.js","chunk-T7AHGDXQ.js","chunk-TINFC3MG.js","chunk-TJUAOSX7.js","chunk-UE73D7E7.js","chunk-UMAUQORC.js","chunk-WVJT3KGT.js","chunk-XBXYD2W7.js","chunk-XOLARTUH.js","chunk-YCLWZJSX.js","icon-192.png","icon-512.png","icon.svg","index.html","manifest.webmanifest","maskable-512.png","pdf.worker.min.js","voice-worker.js"];

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
