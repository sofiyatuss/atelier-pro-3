/* The Atelier service worker. Generated at build time from src/sw-template.js. */
const VERSION = '55410ffaf9c9';
const CACHE = `atelier-${VERSION}`;
const PRECACHE = ["./","KaTeX_AMS-Regular-U6PRYMIZ.woff2","KaTeX_Caligraphic-Bold-5QL5CMTE.woff2","KaTeX_Caligraphic-Regular-KX5MEWCF.woff2","KaTeX_Fraktur-Bold-2QVFK6NQ.woff2","KaTeX_Fraktur-Regular-2PEIFJSJ.woff2","KaTeX_Main-Bold-YP5VVQRP.woff2","KaTeX_Main-BoldItalic-N4V3DX7S.woff2","KaTeX_Main-Italic-RELBIK7M.woff2","KaTeX_Main-Regular-ARRPAO67.woff2","KaTeX_Math-BoldItalic-K4WTGH3J.woff2","KaTeX_Math-Italic-6KGCHLFN.woff2","KaTeX_SansSerif-Bold-RRNVJFFW.woff2","KaTeX_SansSerif-Italic-HMPFTM52.woff2","KaTeX_SansSerif-Regular-XIQ62X4E.woff2","KaTeX_Script-Regular-APUWIHLP.woff2","KaTeX_Size1-Regular-5LRUTBFT.woff2","KaTeX_Size2-Regular-LELKET5D.woff2","KaTeX_Size3-Regular-WQRQ47UD.woff2","KaTeX_Size4-Regular-CDMV7U5C.woff2","KaTeX_Typewriter-Regular-VBYJ4NRC.woff2","app.css","app.js","apple-touch-icon.png","chunk-22KPUZ5A.js","chunk-2JPCMQUC.js","chunk-2MIVM5OU.js","chunk-2UATZ657.js","chunk-3EUAMWRJ.js","chunk-4A5AOO4K.js","chunk-4EMJFCKT.js","chunk-4MD5OD7Y.js","chunk-4W4WOIM3.js","chunk-5PUNFFAX.js","chunk-5YKBHBYA.js","chunk-65R5AVD7.js","chunk-7H55DFCB.js","chunk-7QA2F2D4.js","chunk-AB7QU3U7.js","chunk-B3UTZT4G.js","chunk-BTYYMBYH.js","chunk-CKLLGWVI.js","chunk-CWPYZ3FT.js","chunk-EICNWH5S.js","chunk-ELFGEJ6E.js","chunk-F3Y7LEDG.js","chunk-F7CMF6YQ.js","chunk-FCLJQNB6.js","chunk-FQKSFUMH.js","chunk-FTCFETOE.js","chunk-FUFNAQFV.js","chunk-GYUAQ76Z.js","chunk-GZ346QZ7.js","chunk-H5W54BEC.js","chunk-HMFCBQGM.js","chunk-I24IF3FB.js","chunk-IGZ4TLIY.js","chunk-JPI7GHDL.js","chunk-KDFBWRNQ.js","chunk-KNMH3K63.js","chunk-KZIBCCNM.js","chunk-LAHZY7FP.js","chunk-LBQXOT2K.js","chunk-N255W5MJ.js","chunk-N5GEMQZZ.js","chunk-NAPMYOJN.js","chunk-NJRGIDA6.js","chunk-NNWMX3J7.js","chunk-OBZQWCZG.js","chunk-OHKN7YCD.js","chunk-OOPGEEQ5.js","chunk-PNVIAEOO.js","chunk-QWMQNSLU.js","chunk-RXOMSUJE.js","chunk-RXVS4HGW.js","chunk-STICJ2HK.js","chunk-T7AHGDXQ.js","chunk-TOTDF2DB.js","chunk-TQKC7UZE.js","chunk-U7JCUONF.js","chunk-UB77IB4Z.js","chunk-UNCVYOHR.js","chunk-VEJAMDSO.js","chunk-VIKW4ODM.js","chunk-VL36MHX5.js","chunk-W2WJASP7.js","chunk-WAM3AEL4.js","chunk-WDAHK4IF.js","chunk-WJ6JTXOS.js","chunk-WLAFC3CJ.js","chunk-WQ3JK4YE.js","chunk-WXBEJMCB.js","chunk-XLPR5BGJ.js","chunk-XXHEHYDT.js","chunk-YJ2RD4HS.js","chunk-YRIQKGOY.js","chunk-ZFRLGYI3.js","chunk-ZY2JG4J4.js","chunk-ZZZHF32J.js","icon-192.png","icon-512.png","icon.svg","index.html","manifest.webmanifest","maskable-512.png","pdf.worker.min.js","voice-worker.js"];

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
