/* The Atelier service worker. Generated at build time from src/sw-template.js. */
const VERSION = '070f625d54eb';
const CACHE = `atelier-${VERSION}`;
const PRECACHE = ["./","KaTeX_AMS-Regular-U6PRYMIZ.woff2","KaTeX_Caligraphic-Bold-5QL5CMTE.woff2","KaTeX_Caligraphic-Regular-KX5MEWCF.woff2","KaTeX_Fraktur-Bold-2QVFK6NQ.woff2","KaTeX_Fraktur-Regular-2PEIFJSJ.woff2","KaTeX_Main-Bold-YP5VVQRP.woff2","KaTeX_Main-BoldItalic-N4V3DX7S.woff2","KaTeX_Main-Italic-RELBIK7M.woff2","KaTeX_Main-Regular-ARRPAO67.woff2","KaTeX_Math-BoldItalic-K4WTGH3J.woff2","KaTeX_Math-Italic-6KGCHLFN.woff2","KaTeX_SansSerif-Bold-RRNVJFFW.woff2","KaTeX_SansSerif-Italic-HMPFTM52.woff2","KaTeX_SansSerif-Regular-XIQ62X4E.woff2","KaTeX_Script-Regular-APUWIHLP.woff2","KaTeX_Size1-Regular-5LRUTBFT.woff2","KaTeX_Size2-Regular-LELKET5D.woff2","KaTeX_Size3-Regular-WQRQ47UD.woff2","KaTeX_Size4-Regular-CDMV7U5C.woff2","KaTeX_Typewriter-Regular-VBYJ4NRC.woff2","app.css","app.js","apple-touch-icon.png","chunk-2GYIC7WE.js","chunk-2MTZOEBX.js","chunk-2XCVJP6Q.js","chunk-3EZNY2YL.js","chunk-4J2UXI4P.js","chunk-5JIBRRAK.js","chunk-5JKIJ24G.js","chunk-5MDKGIJR.js","chunk-5PHQ5556.js","chunk-6NFPV4A4.js","chunk-6XA2ERK5.js","chunk-6YKR2PVE.js","chunk-74ZQVTO7.js","chunk-BEMSSFVO.js","chunk-BZUQDF23.js","chunk-CEP3YPA2.js","chunk-CIBOROJP.js","chunk-CQHI3C7G.js","chunk-CQLVEJPL.js","chunk-D3I7KSSR.js","chunk-EZZHOC3F.js","chunk-F4DFBHRU.js","chunk-FKVKJGP6.js","chunk-FMNS7UGD.js","chunk-FRVHJSYO.js","chunk-G3A2EUR2.js","chunk-GAGIZKXO.js","chunk-GJD6Q5M4.js","chunk-GJX2CGX3.js","chunk-HMFCBQGM.js","chunk-HSHIDOSB.js","chunk-HYXENKOJ.js","chunk-I2NE4OTE.js","chunk-JF4EOL3F.js","chunk-JSI5SXLI.js","chunk-JYMDHOIB.js","chunk-KLPTONVA.js","chunk-KSV33OPV.js","chunk-KTWLU6DK.js","chunk-N47KYXHX.js","chunk-N7LV3UUG.js","chunk-NAPMYOJN.js","chunk-NIGZUA6Y.js","chunk-OY2FH7FD.js","chunk-PLWUY44Q.js","chunk-QPMUPTBV.js","chunk-R3UVCH3Q.js","chunk-RUWMIBIC.js","chunk-S5DLPLCX.js","chunk-SCL7TTBL.js","chunk-T7AHGDXQ.js","chunk-U5DVTXRW.js","chunk-UE73D7E7.js","chunk-UJFSBRF5.js","chunk-WVJT3KGT.js","chunk-WXACCNUL.js","chunk-XL2ZLZUA.js","chunk-XOLARTUH.js","icon-192.png","icon-512.png","icon.svg","index.html","manifest.webmanifest","maskable-512.png","pdf.worker.min.js","voice-worker.js"];

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
