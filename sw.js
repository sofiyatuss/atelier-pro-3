/* The Atelier service worker. Generated at build time from src/sw-template.js. */
const VERSION = '7058aac69207';
const CACHE = `atelier-${VERSION}`;
const PRECACHE = ["./","KaTeX_AMS-Regular-U6PRYMIZ.woff2","KaTeX_Caligraphic-Bold-5QL5CMTE.woff2","KaTeX_Caligraphic-Regular-KX5MEWCF.woff2","KaTeX_Fraktur-Bold-2QVFK6NQ.woff2","KaTeX_Fraktur-Regular-2PEIFJSJ.woff2","KaTeX_Main-Bold-YP5VVQRP.woff2","KaTeX_Main-BoldItalic-N4V3DX7S.woff2","KaTeX_Main-Italic-RELBIK7M.woff2","KaTeX_Main-Regular-ARRPAO67.woff2","KaTeX_Math-BoldItalic-K4WTGH3J.woff2","KaTeX_Math-Italic-6KGCHLFN.woff2","KaTeX_SansSerif-Bold-RRNVJFFW.woff2","KaTeX_SansSerif-Italic-HMPFTM52.woff2","KaTeX_SansSerif-Regular-XIQ62X4E.woff2","KaTeX_Script-Regular-APUWIHLP.woff2","KaTeX_Size1-Regular-5LRUTBFT.woff2","KaTeX_Size2-Regular-LELKET5D.woff2","KaTeX_Size3-Regular-WQRQ47UD.woff2","KaTeX_Size4-Regular-CDMV7U5C.woff2","KaTeX_Typewriter-Regular-VBYJ4NRC.woff2","app.css","app.js","apple-touch-icon.png","chunk-2S2HUJTA.js","chunk-4YK6NIVC.js","chunk-5JIBRRAK.js","chunk-63IQ7QQQ.js","chunk-6B7TLQKT.js","chunk-7KZUYLVC.js","chunk-AX2OYLPU.js","chunk-BM3P3C24.js","chunk-C54FOFLL.js","chunk-CHCKOVD5.js","chunk-CLZYHSB7.js","chunk-CZLPONWA.js","chunk-EK3J7WLF.js","chunk-EZZHOC3F.js","chunk-FDQM5LGR.js","chunk-G5IXTB7Q.js","chunk-GAFMYDTW.js","chunk-GG67R6BV.js","chunk-GIYZDEGF.js","chunk-GKD6QBUD.js","chunk-HMFCBQGM.js","chunk-HTKMYP42.js","chunk-IGZYH2TK.js","chunk-IMWFTU2C.js","chunk-IXJG3TUQ.js","chunk-J5IBCZGX.js","chunk-JF4EOL3F.js","chunk-JSI5SXLI.js","chunk-JVZOJEQU.js","chunk-K3YJHRFH.js","chunk-KTWLU6DK.js","chunk-L5XZP7LB.js","chunk-LE2LQSCJ.js","chunk-LW42MYZH.js","chunk-N7BEN4KV.js","chunk-N7LV3UUG.js","chunk-NAPMYOJN.js","chunk-NYCBFICD.js","chunk-OVCCLD6K.js","chunk-PGUZHLCV.js","chunk-PIJUNJNJ.js","chunk-PJ6TWWDY.js","chunk-Q3I5KXT6.js","chunk-RJK7HOGE.js","chunk-RKRQVFC4.js","chunk-S6TELBEV.js","chunk-T7AHGDXQ.js","chunk-U5DVTXRW.js","chunk-UZOC7PA2.js","chunk-VLUCLMAI.js","chunk-VTTYRFQS.js","chunk-Y6XPHOVD.js","chunk-YHXW6RL7.js","chunk-YQ65ZSU6.js","chunk-Z7ECCXUX.js","chunk-ZGYWVLI6.js","chunk-ZPRX37OX.js","chunk-ZRQZAJ3P.js","icon-192.png","icon-512.png","icon.svg","index.html","manifest.webmanifest","maskable-512.png","pdf.worker.min.js","voice-worker.js"];

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
