/* The Atelier service worker. Generated at build time from src/sw-template.js. */
const VERSION = '7352aef1ba73';
const CACHE = `atelier-${VERSION}`;
const PRECACHE = ["./","KaTeX_AMS-Regular-U6PRYMIZ.woff2","KaTeX_Caligraphic-Bold-5QL5CMTE.woff2","KaTeX_Caligraphic-Regular-KX5MEWCF.woff2","KaTeX_Fraktur-Bold-2QVFK6NQ.woff2","KaTeX_Fraktur-Regular-2PEIFJSJ.woff2","KaTeX_Main-Bold-YP5VVQRP.woff2","KaTeX_Main-BoldItalic-N4V3DX7S.woff2","KaTeX_Main-Italic-RELBIK7M.woff2","KaTeX_Main-Regular-ARRPAO67.woff2","KaTeX_Math-BoldItalic-K4WTGH3J.woff2","KaTeX_Math-Italic-6KGCHLFN.woff2","KaTeX_SansSerif-Bold-RRNVJFFW.woff2","KaTeX_SansSerif-Italic-HMPFTM52.woff2","KaTeX_SansSerif-Regular-XIQ62X4E.woff2","KaTeX_Script-Regular-APUWIHLP.woff2","KaTeX_Size1-Regular-5LRUTBFT.woff2","KaTeX_Size2-Regular-LELKET5D.woff2","KaTeX_Size3-Regular-WQRQ47UD.woff2","KaTeX_Size4-Regular-CDMV7U5C.woff2","KaTeX_Typewriter-Regular-VBYJ4NRC.woff2","app.css","app.js","apple-touch-icon.png","chunk-22ARDCKF.js","chunk-33C5GS3Z.js","chunk-3CQMBQRC.js","chunk-3HJYAHI2.js","chunk-3JENV735.js","chunk-3PMUFWJB.js","chunk-3W25A7X7.js","chunk-4K4B2HIV.js","chunk-4Z7IA2T2.js","chunk-6IJ7YNLP.js","chunk-6MDLSY7F.js","chunk-6R37ALBY.js","chunk-7UI6DFRE.js","chunk-AXQWF7BN.js","chunk-BAKFKPRW.js","chunk-BG3JUPBK.js","chunk-BOOP3ZZQ.js","chunk-BZTDUGQX.js","chunk-C2Z4TZDQ.js","chunk-CBGNJKEG.js","chunk-CI32M7UQ.js","chunk-DH53EJVP.js","chunk-DHXPTKEC.js","chunk-DJ54GYZU.js","chunk-EGLY6Y7J.js","chunk-FBJCOTX2.js","chunk-FHX75V5K.js","chunk-FKK4EPFS.js","chunk-GND4CHLD.js","chunk-H3GOLFDS.js","chunk-HMFCBQGM.js","chunk-I24RUE5V.js","chunk-I37EZ6TB.js","chunk-JANCIGCH.js","chunk-JODQFF4L.js","chunk-K7FX2HFE.js","chunk-KKSNKFN6.js","chunk-KN2VAWYS.js","chunk-KO7BEW77.js","chunk-LI65FU2X.js","chunk-LIWRV2ND.js","chunk-LOSZ6QZX.js","chunk-LYFAN6U2.js","chunk-MI52ITC6.js","chunk-MI7DQYLR.js","chunk-MNLVKHAN.js","chunk-MQVDBWB3.js","chunk-NAPMYOJN.js","chunk-NCOK5KES.js","chunk-NJMF7KFZ.js","chunk-Q7USGG35.js","chunk-QEZ5GIND.js","chunk-QHYJHORF.js","chunk-QIRF5QZ6.js","chunk-RCMLGLAH.js","chunk-SSGK3IKO.js","chunk-SYSCIVQI.js","chunk-T7AHGDXQ.js","chunk-TGZITMH3.js","chunk-U7JCUONF.js","chunk-UHDGQHQD.js","chunk-UI72UN3W.js","chunk-UPVSMTWH.js","chunk-V5SXFBWH.js","chunk-WO2IPSZH.js","chunk-Y54DFWQC.js","chunk-YAAKUUB4.js","chunk-YEJR4JJS.js","chunk-YG4MQUOH.js","chunk-YJSLB2DT.js","chunk-YMHLNXNR.js","chunk-YYVEC2AI.js","chunk-ZV3KKHMZ.js","icon-192.png","icon-512.png","icon.svg","index.html","manifest.webmanifest","maskable-512.png","pdf.worker.min.js","voice-worker.js"];

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
