/* The Atelier service worker. Generated at build time from src/sw-template.js. */
const VERSION = '5cebaad93b41';
const CACHE = `atelier-${VERSION}`;
const PRECACHE = ["./","KaTeX_AMS-Regular-U6PRYMIZ.woff2","KaTeX_Caligraphic-Bold-5QL5CMTE.woff2","KaTeX_Caligraphic-Regular-KX5MEWCF.woff2","KaTeX_Fraktur-Bold-2QVFK6NQ.woff2","KaTeX_Fraktur-Regular-2PEIFJSJ.woff2","KaTeX_Main-Bold-YP5VVQRP.woff2","KaTeX_Main-BoldItalic-N4V3DX7S.woff2","KaTeX_Main-Italic-RELBIK7M.woff2","KaTeX_Main-Regular-ARRPAO67.woff2","KaTeX_Math-BoldItalic-K4WTGH3J.woff2","KaTeX_Math-Italic-6KGCHLFN.woff2","KaTeX_SansSerif-Bold-RRNVJFFW.woff2","KaTeX_SansSerif-Italic-HMPFTM52.woff2","KaTeX_SansSerif-Regular-XIQ62X4E.woff2","KaTeX_Script-Regular-APUWIHLP.woff2","KaTeX_Size1-Regular-5LRUTBFT.woff2","KaTeX_Size2-Regular-LELKET5D.woff2","KaTeX_Size3-Regular-WQRQ47UD.woff2","KaTeX_Size4-Regular-CDMV7U5C.woff2","KaTeX_Typewriter-Regular-VBYJ4NRC.woff2","app.css","app.js","apple-touch-icon.png","chunk-2BZ7CPHX.js","chunk-2QWGSEWH.js","chunk-3CQMBQRC.js","chunk-3HJYAHI2.js","chunk-3JENV735.js","chunk-3JMOXFQZ.js","chunk-3K67VND2.js","chunk-3VS2W4YM.js","chunk-52HFJHOK.js","chunk-55KCWTZI.js","chunk-5YDA5AN3.js","chunk-5YXCKUQF.js","chunk-6KCNFBI5.js","chunk-73JX564E.js","chunk-766BWC3C.js","chunk-7BRD4ZIX.js","chunk-AWA6G45C.js","chunk-AXQWF7BN.js","chunk-BTC6ETAP.js","chunk-C2Z4TZDQ.js","chunk-CQIWVBX2.js","chunk-CTNHZRNA.js","chunk-CVXWCSRN.js","chunk-D45KUAMN.js","chunk-DFEGX243.js","chunk-DJBDN7MC.js","chunk-E5VRXIVG.js","chunk-EAT4QTQJ.js","chunk-EGDSB22G.js","chunk-EMCQXZPP.js","chunk-G2M4PXVQ.js","chunk-GOU564JQ.js","chunk-HAQTXCIE.js","chunk-HMFCBQGM.js","chunk-IF2WDO24.js","chunk-INJTPSMP.js","chunk-JCXAU3ED.js","chunk-JEUCRXHW.js","chunk-JJPAPF4K.js","chunk-JQUWHAJ2.js","chunk-JVGJ7HPG.js","chunk-KDW65K7P.js","chunk-KN2VAWYS.js","chunk-KPXBI3K4.js","chunk-L2LYNAPE.js","chunk-LPEVEYJ3.js","chunk-LYFAN6U2.js","chunk-M2EDWGOU.js","chunk-MJECAYKF.js","chunk-MJIBT22H.js","chunk-MKPLSLKP.js","chunk-NAPMYOJN.js","chunk-NCOK5KES.js","chunk-O5M3IQVX.js","chunk-OJXKXCZW.js","chunk-OLN3JSFW.js","chunk-PCKCXVQZ.js","chunk-PWKZ4QEP.js","chunk-QAXLIMQU.js","chunk-RYKLHXS2.js","chunk-RZRML5AC.js","chunk-SBLGSRBE.js","chunk-SOST4CBX.js","chunk-T7AHGDXQ.js","chunk-TLHWK24C.js","chunk-U45DQ2IZ.js","chunk-U7JCUONF.js","chunk-UP4RY24V.js","chunk-VBMYA7WD.js","chunk-W2E4KXNP.js","chunk-XWPB4FV7.js","chunk-YUC4VAZP.js","chunk-ZAEQ4KM3.js","icon-192.png","icon-512.png","icon.svg","index.html","manifest.webmanifest","maskable-512.png","pdf.worker.min.js","voice-worker.js"];

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
