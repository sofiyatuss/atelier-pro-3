// The Atelier collector — run by .github/workflows/recommendations.yml. Generated from scripts/recommend.ts.
// scripts/recommend.ts
import { readFile, writeFile } from "node:fs/promises";

// src/recs/feeds.ts
var ENT = { amp: "&", lt: "<", gt: ">", quot: '"', apos: "'", nbsp: " ", hellip: "…", mdash: "—", ndash: "–", rsquo: "’", lsquo: "‘", rdquo: "”", ldquo: "“" };
function decodeEntities(s) {
  return s.replace(/&#x([0-9a-f]+);/gi, (_, h) => String.fromCodePoint(parseInt(h, 16))).replace(/&#(\d+);/g, (_, d) => String.fromCodePoint(Number(d))).replace(/&(\w+);/g, (all, n) => ENT[n] ?? all);
}
function unwrap(s) {
  const cdata = s.match(/^\s*<!\[CDATA\[([\s\S]*?)\]\]>\s*$/);
  return cdata ? cdata[1] : s;
}
function textFrom(html, max = 420) {
  if (!html) return null;
  let t = decodeEntities(unwrap(html));
  t = decodeEntities(t.replace(/<(script|style)[\s\S]*?<\/\1>/gi, " ").replace(/<[^>]+>/g, " ")).replace(/\s+/g, " ").trim();
  t = t.replace(/\s*(The post .* appeared first on .*|Continue reading.*|Read more.*)$/i, "").trim();
  if (!t) return null;
  if (t.length <= max) return t;
  const cut = t.slice(0, max);
  return cut.slice(0, Math.max(cut.lastIndexOf(" "), max - 40)).trimEnd() + "…";
}
function tag(xml, name) {
  const re = new RegExp(`<${name}(?:\\s[^>]*)?>([\\s\\S]*?)</${name}>`, "i");
  const m = xml.match(re);
  return m ? unwrap(m[1]).trim() : null;
}
function attr(xml, name, a) {
  const re = new RegExp(`<${name}\\b[^>]*\\b${a}="([^"]+)"`, "i");
  return xml.match(re)?.[1] ?? null;
}
function iso(d) {
  if (!d) return null;
  const t = Date.parse(d.trim());
  return Number.isNaN(t) ? null : new Date(t).toISOString();
}
function firstImage(html) {
  if (!html) return null;
  const m = decodeEntities(unwrap(html)).match(/<img[^>]+src="(https:[^"]+)"/i);
  return m ? m[1] : null;
}
function parseFeed(xml) {
  const isAtom = /<feed\b/i.test(xml) && !/<rss\b/i.test(xml);
  const blocks = isAtom ? xml.match(/<entry\b[\s\S]*?<\/entry>/gi) ?? [] : xml.match(/<item\b[\s\S]*?<\/item>/gi) ?? [];
  const out = [];
  for (const b of blocks) {
    const title = textFrom(tag(b, "title"), 300) ?? "";
    let url;
    if (isAtom) url = b.match(/<link\b[^>]*rel="alternate"[^>]*href="([^"]+)"/i)?.[1] ?? attr(b, "link", "href");
    else url = tag(b, "link") ?? (tag(b, "guid")?.startsWith("http") ? tag(b, "guid") : null);
    if (!url || !title) continue;
    url = decodeEntities(url.trim());
    const videoId = tag(b, "yt:videoId");
    const desc = tag(b, "media:description") ?? tag(b, "description") ?? tag(b, "summary") ?? tag(b, "content");
    const thumb = attr(b, "media:thumbnail", "url") ?? attr(b, "media:content", "url") ?? attr(b, "enclosure", "url") ?? firstImage(tag(b, "content:encoded") ?? desc);
    const author = textFrom(tag(b, "dc:creator") ?? tag(tag(b, "author") ?? "", "name") ?? tag(b, "author"), 120);
    out.push({
      url,
      title,
      author: author || null,
      publishedAt: iso(tag(b, "pubDate") ?? tag(b, "published") ?? tag(b, "updated") ?? tag(b, "dc:date")),
      summary: textFrom(desc),
      thumbnail: thumb && /^https:/.test(thumb) ? decodeEntities(thumb) : videoId ? `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg` : null,
      kind: videoId || /youtube\.com\/watch|youtu\.be\//.test(url) ? "video" : "article"
    });
  }
  return out;
}
function isShort(item) {
  return /\/shorts\//.test(item.url) || /#shorts?\b/i.test(`${item.title} ${item.summary ?? ""}`);
}
function youtubeId(url) {
  return url.match(/(?:youtube\.com\/(?:watch\?v=|embed\/|shorts\/|live\/)|youtu\.be\/)([\w-]{11})/)?.[1] ?? null;
}
function channelIdFromHtml(html) {
  return html.match(/"(?:channelId|externalId)":"(UC[\w-]{22})"/)?.[1] ?? html.match(/<link rel="canonical" href="https:\/\/www\.youtube\.com\/channel\/(UC[\w-]{22})"/)?.[1] ?? null;
}
function normalizeUrl(u) {
  try {
    const x = new URL(u);
    const yt2 = youtubeId(u);
    if (yt2) return `https://www.youtube.com/watch?v=${yt2}`;
    for (const k of Array.from(x.searchParams.keys())) if (/^(utm_|ref$|fbclid|gclid|mc_)/.test(k)) x.searchParams.delete(k);
    x.hash = "";
    return x.toString().replace(/\/$/, "");
  } catch {
    return u.trim();
  }
}

// src/recs/sources.ts
function sourceId(kind, url) {
  const key = url.trim().toLowerCase().replace(/^https?:\/\/(www\.)?/, "").replace(/^youtube\.com\//, "").replace(/[^a-z0-9@]+/g, "-").replace(/^-+|-+$/g, "");
  return `${kind}-${key}`.slice(0, 80);
}
var rss = (name, url, categories) => ({ id: sourceId("rss", url), name, kind: "rss", url, categories, enabled: true });
var yt = (name, handle, categories) => ({ id: sourceId("youtube", handle), name, kind: "youtube", url: handle, categories: ["video-essays", ...categories], enabled: true });
var DEFAULT_REC_SOURCES = [
  rss("Aeon", "https://aeon.co/feed.rss", ["philosophy", "psychology", "essays"]),
  rss("Psyche", "https://psyche.co/feed", ["psychology", "philosophy", "essays"]),
  rss("The Marginalian", "https://www.themarginalian.org/feed/", ["literature", "philosophy", "essays"]),
  rss("Noema", "https://www.noemamag.com/feed/", ["philosophy", "essays"]),
  rss("The Point", "https://thepointmag.com/feed/", ["philosophy", "literature", "essays"]),
  rss("1000-Word Philosophy", "https://1000wordphilosophy.com/feed/", ["philosophy"]),
  rss("Literary Hub", "https://lithub.com/feed/", ["literature"]),
  rss("The Paris Review", "https://www.theparisreview.org/blog/feed/", ["literature"]),
  rss("The Public Domain Review", "https://publicdomainreview.org/rss.xml", ["literature", "essays"]),
  rss("Nautilus", "https://nautil.us/feed/", ["psychology", "essays"]),
  rss("3 Quarks Daily", "https://3quarksdaily.com/feed", ["essays", "philosophy"]),
  yt("Philosophy Tube", "@PhilosophyTube", ["philosophy"]),
  yt("Like Stories of Old", "@LikeStoriesofOld", ["philosophy", "literature"]),
  yt("Academy of Ideas", "@academyofideas", ["philosophy", "psychology"]),
  yt("Pursuit of Wonder", "@PursuitofWonder", ["philosophy", "psychology"]),
  yt("Einzelgänger", "@Einzelgaenger", ["philosophy"]),
  yt("The Living Philosophy", "@TheLivingPhilosophy", ["philosophy"]),
  yt("Jonas Čeika – CCK Philosophy", "@JonasCeika", ["philosophy"]),
  yt("The School of Life", "@theschooloflifetv", ["psychology", "philosophy"]),
  yt("Wisecrack", "@wisecrack", ["philosophy", "literature"])
];

// src/news/sources.ts
var feed = (name, url, section, include) => ({ id: sourceId("rss", url), name, kind: "rss", url, categories: [section], enabled: true, ...include ? { include } : {} });
var BARCA_WORDS = ["Barcelona", "Barça", "Barca", "Camp Nou", "Blaugrana"];
var DEFAULT_NEWS_SOURCES = [
  feed("BBC News — World", "https://feeds.bbci.co.uk/news/world/rss.xml", "world"),
  feed("BBC News — Business", "https://feeds.bbci.co.uk/news/business/rss.xml", "economics"),
  feed("The Guardian — World", "https://www.theguardian.com/world/rss", "world"),
  feed("The Guardian — Politics", "https://www.theguardian.com/politics/rss", "politics"),
  feed("The Guardian — Business", "https://www.theguardian.com/business/rss", "economics"),
  feed("NPR — World", "https://feeds.npr.org/1004/rss.xml", "world"),
  feed("NPR — Politics", "https://feeds.npr.org/1014/rss.xml", "politics"),
  feed("NPR — Economy", "https://feeds.npr.org/1017/rss.xml", "economics"),
  feed("Al Jazeera", "https://www.aljazeera.com/xml/rss/all.xml", "world"),
  feed("DW — Top stories", "https://rss.dw.com/rdf/rss-en-top", "world"),
  feed("DW — Business", "https://rss.dw.com/rdf/rss-en-bus", "economics"),
  feed("The Guardian — Barcelona", "https://www.theguardian.com/football/barcelona/rss", "football"),
  feed("BBC Sport — European football", "https://feeds.bbci.co.uk/sport/football/european/rss.xml", "football", BARCA_WORDS)
];

// src/domain/types.ts
var NEWS_SECTIONS = ["world", "politics", "economics", "football"];

// src/sky/moon.ts
var RAD = Math.PI / 180;
var OBLIQUITY = RAD * 23.4397;
var SIGNS = ["aries", "taurus", "gemini", "cancer", "leo", "virgo", "libra", "scorpio", "sagittarius", "capricorn", "aquarius", "pisces"];

// src/sky/horoscope.ts
var MONTHS = ["january", "february", "march", "april", "may", "june", "july", "august", "september", "october", "november", "december"];
var DAYS = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"];
function astrostyleUrls(d) {
  const slug = `${DAYS[d.getUTCDay()]}-${MONTHS[d.getUTCMonth()]}-${d.getUTCDate()}-${d.getUTCFullYear()}`;
  return [`https://astrostyle.com/daily-horoscope-for-${slug}/`, `https://astrostyle.com/daily-horoscopes-for-${slug}/`];
}
function latestDailyPost(feedXml) {
  const item = parseFeed(feedXml).find((i) => /daily horoscopes? for/i.test(i.title));
  return item?.url ?? null;
}
function parseAstrostyle(html, url) {
  const clean = html.replace(/<(script|style|noscript)[\s\S]*?<\/\1>/gi, " ");
  const heads = [];
  const re = /<h[2-4][^>]*>([\s\S]*?)<\/h[2-4]>/gi;
  let m;
  const allHeads = [];
  while (m = re.exec(clean)) allHeads.push({ text: textFrom(m[1], 300) ?? "", start: m.index, end: re.lastIndex });
  for (const h of allHeads) {
    const hm = h.text.match(/^(\w+)\s*\([^)]*\)\s*daily horoscopes? for\s+(.+)$/i);
    const sign = hm && SIGNS.includes(hm[1].toLowerCase()) ? hm[1].toLowerCase() : null;
    if (sign) heads.push({ sign, date: hm[2].trim(), start: h.start, end: h.end });
  }
  const signs = {};
  heads.forEach((h, i) => {
    const nextHead = allHeads.find((x) => x.start > h.end);
    const stop = Math.min(heads[i + 1]?.start ?? clean.length, nextHead?.start ?? clean.length);
    const block = clean.slice(h.end, stop);
    const paras = Array.from(block.matchAll(/<p[^>]*>([\s\S]*?)<\/p>/gi)).map((x) => textFrom(x[1], 2e3) ?? "").filter((t) => t.length > 40 && !/^read .* (daily )?horoscope/i.test(t));
    const text = paras.join("\n\n");
    if (text.length >= 80) signs[h.sign] = { text, url, date: h.date };
  });
  let intro = null;
  const ih = allHeads.find((h) => /astrology today|in the stars/i.test(h.text));
  if (ih) {
    const after = clean.slice(ih.end, heads[0]?.start ?? clean.length);
    const p = Array.from(after.matchAll(/<p[^>]*>([\s\S]*?)<\/p>/gi)).map((x) => textFrom(x[1], 600) ?? "").find((t) => t.length > 60);
    intro = p ?? null;
  }
  return { signs, postDate: heads[0]?.date ?? null, intro };
}
var HOROSCOPE_COM_INDEX = { aries: 1, taurus: 2, gemini: 3, cancer: 4, leo: 5, virgo: 6, libra: 7, scorpio: 8, sagittarius: 9, capricorn: 10, aquarius: 11, pisces: 12 };
function horoscopeComUrl(sign) {
  return `https://www.horoscope.com/us/horoscopes/general/horoscope-general-daily-today.aspx?sign=${HOROSCOPE_COM_INDEX[sign]}`;
}
function parseHoroscopeCom(html, url) {
  const box = html.match(/class="main-horoscope"[^>]*>([\s\S]*?)<\/div>/i)?.[1] ?? "";
  const p = box.match(/<p[^>]*>([\s\S]*?)<\/p>/i)?.[1];
  if (!p) return null;
  const date = textFrom(p.match(/<strong[^>]*>([\s\S]*?)<\/strong>/i)?.[1] ?? "", 40);
  const text = (textFrom(p.replace(/<strong[^>]*>[\s\S]*?<\/strong>/i, ""), 2e3) ?? "").replace(/^\s*[-–—]\s*/, "");
  return text.length >= 80 ? { text: decodeEntities(text), url, date } : null;
}

// scripts/recommend.ts
var OUT = process.argv[2] || "recommendations.json";
var SOURCES_FILE = process.argv[3] || "rec-sources.json";
var MAX_AGE_DAYS = 30;
var PER_SOURCE = 12;
var NEWS_MAX_AGE_DAYS = 3;
var NEWS_PER_SOURCE = 30;
var isNews = (s) => s.categories.some((c) => NEWS_SECTIONS.includes(c));
var UA = { "User-Agent": "Mozilla/5.0 (compatible; TheAtelierRecommendations/1.0; personal reading list)", Accept: "application/rss+xml, application/atom+xml, application/xml, text/xml, text/html;q=0.8" };
async function get(url) {
  const res = await fetch(url, { headers: UA, redirect: "follow", signal: AbortSignal.timeout(2e4) });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.text();
}
async function youtubeFeedUrl(handle) {
  if (/^UC[\w-]{22}$/.test(handle)) return `https://www.youtube.com/feeds/videos.xml?channel_id=${handle}`;
  const page = handle.startsWith("http") ? handle : `https://www.youtube.com/${handle.startsWith("@") ? handle : "@" + handle}`;
  const id = channelIdFromHtml(await get(page));
  if (!id) throw new Error("could not find the channel id for this handle");
  return `https://www.youtube.com/feeds/videos.xml?channel_id=${id}`;
}
var sources;
try {
  const raw = JSON.parse(await readFile(SOURCES_FILE, "utf8"));
  sources = (raw.sources ?? raw).filter((s) => s && s.url && s.enabled !== false);
  console.log(`Using ${sources.length} sources from ${SOURCES_FILE}`);
} catch {
  sources = [...DEFAULT_REC_SOURCES, ...DEFAULT_NEWS_SOURCES];
  console.log(`No ${SOURCES_FILE}; using the ${sources.length} default sources`);
}
var previous = [];
try {
  previous = JSON.parse(await readFile(OUT, "utf8")).items ?? [];
} catch {
}
var cutoff = Date.now() - MAX_AGE_DAYS * 864e5;
var status = [];
var fresh = [];
for (const s of sources) {
  try {
    const feedUrl = s.kind === "youtube" ? await youtubeFeedUrl(s.url) : s.url;
    const news = isNews(s);
    const since = news ? Date.now() - NEWS_MAX_AGE_DAYS * 864e5 : cutoff;
    const include = (s.include ?? []).map((w) => w.toLowerCase());
    const items2 = parseFeed(await get(feedUrl)).map((i, rank) => ({ ...i, rank })).filter((i) => !isShort(i)).filter((i) => !include.length || include.some((w) => `${i.title} ${i.summary ?? ""}`.toLowerCase().includes(w))).filter((i) => !i.publishedAt || Date.parse(i.publishedAt) >= since).slice(0, news ? NEWS_PER_SOURCE : PER_SOURCE);
    for (const i of items2) fresh.push({ ...i, url: normalizeUrl(i.url), sourceId: s.id, sourceName: s.name, categories: s.categories });
    status.push({ id: s.id, name: s.name, count: items2.length });
    console.log(`✓ ${s.name}: ${items2.length}`);
  } catch (e) {
    status.push({ id: s.id, name: s.name, count: 0, error: e.message });
    console.log(`✗ ${s.name}: ${e.message}`);
  }
  await new Promise((r) => setTimeout(r, 300));
}
var byUrl = /* @__PURE__ */ new Map();
for (const i of fresh) if (!byUrl.has(i.url)) byUrl.set(i.url, i);
for (const i of previous) if (!byUrl.has(i.url)) byUrl.set(i.url, isNews(i) ? { ...i, rank: 50 } : i);
var newsCutoff = Date.now() - NEWS_MAX_AGE_DAYS * 864e5;
var items = Array.from(byUrl.values()).filter((i) => !i.publishedAt || Date.parse(i.publishedAt) >= (isNews(i) ? newsCutoff : cutoff)).sort((a, b) => (b.publishedAt ?? "").localeCompare(a.publishedAt ?? "")).slice(0, 1500);
async function horoscopes() {
  const set = { source: "The AstroTwins", sourceUrl: "https://astrostyle.com", postUrl: null, postDate: null, fetchedAt: (/* @__PURE__ */ new Date()).toISOString(), intro: null, signs: {} };
  const candidates = [];
  try {
    const latest = latestDailyPost(await get("https://astrostyle.com/feed/"));
    if (latest) candidates.push(latest);
  } catch (e) {
    console.log(`horoscopes: feed unavailable (${e.message})`);
  }
  const now = Date.now();
  for (const off of [0, -1, 1]) candidates.push(...astrostyleUrls(new Date(now + off * 864e5)));
  for (const url of Array.from(new Set(candidates))) {
    try {
      const parsed = parseAstrostyle(await get(url), url);
      if (Object.keys(parsed.signs).length >= 6) {
        Object.assign(set, { postUrl: url, postDate: parsed.postDate, intro: parsed.intro, signs: parsed.signs });
        break;
      }
    } catch {
    }
  }
  console.log(`horoscopes: The AstroTwins ${Object.keys(set.signs).length}/12${set.postDate ? ` (${set.postDate})` : ""}`);
  const missing = SIGNS.filter((s) => !set.signs[s]);
  if (missing.length) {
    set.fallback = {};
    for (const s of missing) {
      try {
        const r = parseHoroscopeCom(await get(horoscopeComUrl(s)), horoscopeComUrl(s));
        if (r) set.fallback[s] = { ...r, source: "Horoscope.com" };
      } catch {
      }
      await new Promise((r) => setTimeout(r, 300));
    }
    console.log(`horoscopes: Horoscope.com filled ${Object.keys(set.fallback).length}/${missing.length}`);
  }
  return Object.keys(set.signs).length || Object.keys(set.fallback ?? {}).length ? set : null;
}
var horo = null;
try {
  horo = await horoscopes();
} catch (e) {
  console.log(`horoscopes failed: ${e.message}`);
}
if (!horo) {
  try {
    horo = JSON.parse(await readFile(OUT, "utf8")).horoscopes ?? null;
  } catch {
  }
}
var pool = { format: "atelier-recommendations", version: 3, generatedAt: (/* @__PURE__ */ new Date()).toISOString(), sources: status, items, horoscopes: horo };
await writeFile(OUT, JSON.stringify(pool, null, 0) + "\n");
console.log(`Wrote ${items.length} items (${fresh.length} fetched this run) to ${OUT}`);
