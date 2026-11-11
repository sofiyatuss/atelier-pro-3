// The Atelier collector — run by .github/workflows/recommendations.yml. Generated from scripts/recommend.ts.
// scripts/recommend.ts
import { readFile, writeFile } from "node:fs/promises";

// src/recs/feeds.ts
var ENT = { amp: "&", lt: "<", gt: ">", quot: '"', apos: "'", nbsp: " ", hellip: "…", mdash: "—", ndash: "–", rsquo: "’", lsquo: "‘", rdquo: "”", ldquo: "“" };
function decodeEntities(s) {
  return s.replace(/&#x([0-9a-f]+);/gi, (_, h) => String.fromCodePoint(parseInt(h, 16))).replace(/&#(\d+);/g, (_, d) => String.fromCodePoint(Number(d))).replace(/&(\w+);/g, (all2, n) => ENT[n] ?? all2);
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
  const key2 = url.trim().toLowerCase().replace(/^https?:\/\/(www\.)?/, "").replace(/^youtube\.com\//, "").replace(/[^a-z0-9@]+/g, "-").replace(/^-+|-+$/g, "");
  return `${kind}-${key2}`.slice(0, 80);
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
  feed("BBC Sport — European football", "https://feeds.bbci.co.uk/sport/football/european/rss.xml", "football", BARCA_WORDS),
  ...COUNTRY_NEWS_SOURCES()
];
function COUNTRY_NEWS_SOURCES() {
  return [
    feed("ORF — News (German)", "https://rss.orf.at/news.xml", "austria"),
    feed("Der Standard (German)", "https://www.derstandard.at/rss", "austria"),
    feed("The Local Austria", "https://feeds.thelocal.com/rss/at", "austria"),
    feed("The Guardian — Austria", "https://www.theguardian.com/world/austria/rss", "austria"),
    feed("RFE/RL — Kazakhstan", "https://www.rferl.org/api/zriiml-vomx-tpeogm_", "kazakhstan"),
    feed("The Times of Central Asia", "https://timesca.com/feed/", "kazakhstan", ["Kazakhstan", "Kazakh", "Astana", "Almaty", "Tokayev"]),
    feed("The Guardian — Kazakhstan", "https://www.theguardian.com/world/kazakhstan/rss", "kazakhstan"),
    feed("The Astana Times (government-aligned)", "https://astanatimes.com/feed/", "kazakhstan")
  ];
}

// src/domain/types.ts
var NEWS_SECTIONS = ["world", "politics", "economics", "football", "austria", "kazakhstan"];
var COUNTRY_SECTIONS = ["austria", "kazakhstan"];

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
    const text2 = paras.join("\n\n");
    if (text2.length >= 80) signs[h.sign] = { text: text2, url, date: h.date };
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
  const text2 = (textFrom(p.replace(/<strong[^>]*>[\s\S]*?<\/strong>/i, ""), 2e3) ?? "").replace(/^\s*[-–—]\s*/, "");
  return text2.length >= 80 ? { text: decodeEntities(text2), url, date } : null;
}

// src/barca/espn.ts
var BARCA_ESPN_ID = "83";
var API = "https://site.api.espn.com/apis/site/v2/sports/soccer";
var API_V2 = "https://site.api.espn.com/apis/v2/sports/soccer";
var COMPETITIONS = [
  { slug: "esp.1", name: "LaLiga", table: true },
  { slug: "uefa.champions", name: "Champions League", table: true },
  { slug: "esp.copa_del_rey", name: "Copa del Rey", table: false },
  { slug: "esp.super_cup", name: "Supercopa de España", table: false }
];
var num = (v) => {
  const n = typeof v === "number" ? v : typeof v === "string" && v.trim() !== "" ? Number(v) : NaN;
  return Number.isFinite(n) ? n : null;
};
var str = (v) => typeof v === "string" && v.trim() ? v.trim() : null;
function isBarca(team) {
  return String(team?.id ?? "") === BARCA_ESPN_ID || /^(fc )?barcelona$/i.test(str(team?.displayName) ?? str(team?.name) ?? "");
}
function scoreOf(c) {
  const s = c?.score;
  if (s == null) return null;
  if (typeof s === "object") return num(s.value) ?? num(s.displayValue);
  return num(s);
}
function parseSchedule(json2, comp) {
  const out = [];
  for (const e of Array.isArray(json2?.events) ? json2.events : []) {
    const c = e?.competitions?.[0];
    const teams = Array.isArray(c?.competitors) ? c.competitors : [];
    const home = teams.find((t) => t?.homeAway === "home") ?? teams[0];
    const away = teams.find((t) => t?.homeAway === "away") ?? teams[1];
    if (!home || !away) continue;
    const barcaHome = isBarca(home.team);
    if (!barcaHome && !isBarca(away.team)) continue;
    const date = str(e?.date) ?? str(c?.date);
    if (!date || Number.isNaN(Date.parse(date))) continue;
    const opp = barcaHome ? away : home;
    const type = c?.status?.type ?? e?.status?.type ?? {};
    const state = type.state === "in" || type.state === "post" ? type.state : "pre";
    const stage = str(c?.notes?.[0]?.headline) ?? str(e?.seasonType?.name) ?? null;
    out.push({
      id: String(e.id ?? `${comp.slug}-${date}`),
      date: new Date(date).toISOString(),
      timeValid: e?.timeValid !== false && c?.timeValid !== false,
      compSlug: comp.slug,
      competition: comp.name,
      stage: stage && !/regular season|league phase|^season$/i.test(stage) ? stage : null,
      home: str(home.team?.displayName) ?? str(home.team?.name) ?? "Home",
      away: str(away.team?.displayName) ?? str(away.team?.name) ?? "Away",
      barcaHome,
      opponent: str(opp.team?.displayName) ?? str(opp.team?.name) ?? "Opponent",
      opponentLogo: str(opp.team?.logos?.[0]?.href) ?? str(opp.team?.logo),
      venue: str(c?.venue?.fullName),
      state,
      status: str(type.shortDetail) ?? str(type.detail) ?? str(type.description),
      scoreHome: state === "pre" ? null : scoreOf(home),
      scoreAway: state === "pre" ? null : scoreOf(away)
    });
  }
  return out;
}
var POS = { G: "Goalkeeper", GK: "Goalkeeper", D: "Defender", DF: "Defender", M: "Midfielder", MF: "Midfielder", F: "Forward", FW: "Forward" };
function parseRoster(json2) {
  let athletes = Array.isArray(json2?.athletes) ? json2.athletes : [];
  if (athletes.length && Array.isArray(athletes[0]?.items)) athletes = athletes.flatMap((g) => g.items ?? []);
  const out = [];
  for (const a of athletes) {
    const name = str(a?.displayName) ?? str(a?.fullName);
    if (!name) continue;
    const abbr = str(a?.position?.abbreviation)?.toUpperCase() ?? "";
    const pname = str(a?.position?.displayName) ?? str(a?.position?.name) ?? "";
    const position = POS[abbr] ?? (/goal/i.test(pname) ? "Goalkeeper" : /defen|back/i.test(pname) ? "Defender" : /mid/i.test(pname) ? "Midfielder" : /forw|strik|wing|attack/i.test(pname) ? "Forward" : "Other");
    const inj = Array.isArray(a?.injuries) ? a.injuries.find((i) => i && !/^active$/i.test(String(i.status ?? ""))) : null;
    out.push({
      id: String(a.id ?? name),
      name,
      number: str(a?.jersey) ?? (num(a?.jersey) != null ? String(a.jersey) : null),
      position,
      age: num(a?.age),
      nationality: str(a?.citizenship) ?? str(a?.flag?.alt) ?? str(a?.birthPlace?.country),
      injury: inj ? {
        status: str(inj.status) ?? str(inj.type?.description) ?? "Injured",
        detail: str(inj.details?.type) ?? str(inj.details?.detail) ?? str(inj.shortComment) ?? str(inj.longComment) ?? str(inj.type?.abbreviation),
        date: str(inj.date),
        returnDate: str(inj.details?.returnDate)
      } : null
    });
  }
  const order = ["Goalkeeper", "Defender", "Midfielder", "Forward", "Other"];
  return out.sort((x, y) => order.indexOf(x.position) - order.indexOf(y.position) || Number(x.number ?? 99) - Number(y.number ?? 99) || x.name.localeCompare(y.name));
}
function entriesIn(json2) {
  const groups = [];
  const walk = (node) => {
    if (!node || typeof node !== "object") return;
    if (Array.isArray(node?.standings?.entries)) groups.push(node.standings.entries);
    for (const k of ["children", "groups"]) if (Array.isArray(node[k])) node[k].forEach(walk);
  };
  walk(json2);
  return groups;
}
function stat(entry, ...names) {
  for (const s of Array.isArray(entry?.stats) ? entry.stats : []) if (names.includes(s?.name) || names.includes(s?.type)) {
    const v = num(s.value) ?? num(s.displayValue);
    if (v != null) return v;
  }
  return null;
}
function parseStandings(json2, comp) {
  for (const entries of entriesIn(json2)) {
    const mine = entries.find((e) => isBarca(e?.team));
    if (!mine) continue;
    const ranked = entries.map((e, i) => ({ e, rank: stat(e, "rank") ?? i + 1 })).sort((a, b) => a.rank - b.rank);
    const me = ranked.find((x) => x.e === mine);
    const top = ranked[0];
    return {
      compSlug: comp.slug,
      competition: comp.name,
      rank: me.rank,
      of: entries.length,
      played: stat(mine, "gamesPlayed"),
      points: stat(mine, "points"),
      won: stat(mine, "wins"),
      drawn: stat(mine, "ties", "draws"),
      lost: stat(mine, "losses"),
      goalDiff: stat(mine, "pointDifferential", "goalDifference"),
      leader: top && top.e !== mine ? str(top.e?.team?.displayName) ?? str(top.e?.team?.name) : null,
      leaderPoints: top && top.e !== mine ? stat(top.e, "points") : null
    };
  }
  return null;
}
async function fetchBarca(f = fetch, now = Date.now()) {
  const errors = [];
  const get2 = async (url, label) => {
    try {
      const r = await f(url, { headers: { Accept: "application/json" } });
      if (!r.ok) {
        errors.push(`${label}: HTTP ${r.status}`);
        return null;
      }
      return await r.json();
    } catch (e) {
      errors.push(`${label}: ${e.message}`);
      return null;
    }
  };
  const matches = /* @__PURE__ */ new Map();
  const standings = [];
  await Promise.all(COMPETITIONS.map(async (c) => {
    const [fixtures, results] = await Promise.all([
      get2(`${API}/${c.slug}/teams/${BARCA_ESPN_ID}/schedule?fixture=true`, `${c.name} fixtures`),
      get2(`${API}/${c.slug}/teams/${BARCA_ESPN_ID}/schedule`, `${c.name} results`)
    ]);
    for (const m of [...parseSchedule(results, c), ...parseSchedule(fixtures, c)]) matches.set(m.id, m);
    if (c.table) {
      const s = parseStandings(await get2(`${API_V2}/${c.slug}/standings`, `${c.name} table`), c);
      if (s) standings.push(s);
    }
  }));
  const roster = await get2(`${API}/esp.1/teams/${BARCA_ESPN_ID}/roster`, "Squad");
  const all2 = Array.from(matches.values());
  const upcoming = all2.filter((m) => m.state !== "post" && Date.parse(m.date) > now - 3 * 36e5).sort((a, b) => a.date.localeCompare(b.date)).slice(0, 12);
  const recent = all2.filter((m) => m.state === "post").sort((a, b) => b.date.localeCompare(a.date)).slice(0, 8);
  return {
    fetchedAt: new Date(now).toISOString(),
    source: "ESPN",
    upcoming,
    recent,
    squad: parseRoster(roster),
    squadSource: "ESPN",
    squadFetchedAt: new Date(now).toISOString(),
    standings: COMPETITIONS.map((c) => standings.find((s) => s.compSlug === c.slug)).filter((s) => !!s),
    errors
  };
}
var hasBarcaData = (d) => !!d && d.upcoming.length + d.recent.length + d.squad.length > 0;

// src/barca/transfermarkt.ts
var TM_API = "https://tmapi.transfermarkt.technology";
var BARCA_TM_ID = "131";
var SITE = "https://www.transfermarkt.com";
var TmBlocked = class extends Error {
};
async function tmGet(f, path) {
  const r = await f(`${TM_API}${path}`, { headers: { Accept: "application/json", "User-Agent": "TheAtelier/1.0 (personal study app)" } });
  if (r.headers.get("x-amzn-waf-action") || r.status === 202 || r.status === 403 || r.status === 429) throw new TmBlocked(`Transfermarkt refused the request (${r.status})`);
  if (r.status === 404) return null;
  if (!r.ok) throw new Error(`Transfermarkt ${path}: HTTP ${r.status}`);
  const body = await r.json();
  if (!body || body.success !== true || !("data" in body)) throw new Error(`Transfermarkt ${path}: unexpected reply`);
  return body.data;
}
var POSITION = { GOALKEEPER: "Goalkeeper", DEFENDER: "Defender", MIDFIELDER: "Midfielder", FORWARD: "Forward" };
function money(m) {
  const c = m?.compact;
  if (!m?.value || !c) return null;
  return `${c.prefix ?? ""}${c.content ?? ""}${c.suffix ?? ""}`.trim() || null;
}
function current(list, today) {
  return (list ?? []).filter((x) => x?.start && x.start <= today && (!x.end || x.end >= today)).sort((a, b) => (b.start ?? "").localeCompare(a.start ?? ""))[0] ?? null;
}
function toPlayer(member, player, injuries, absences, countries, today, suspensionIds) {
  const a = player?.attributes ?? {};
  const nat = player?.nationalityDetails?.nationalities ?? {};
  const inj = current(injuries, today);
  const abs = current(absences, today);
  const out = inj ?? abs;
  const kind = inj ? "Injured" : abs ? suspensionIds.has(Number(abs.absenceId)) || /suspen|ban|card/i.test(abs.name ?? "") ? "Suspended" : "Unavailable" : null;
  return {
    id: String(member.playerId),
    name: player?.name || player?.shortName || `Player ${member.playerId}`,
    number: member.shirtNumber != null ? String(member.shirtNumber) : null,
    position: POSITION[a.positionGroup] ?? (a.position?.category === "Goalkeeper" ? "Goalkeeper" : a.position?.category === "Defender" ? "Defender" : a.position?.category === "Midfielder" ? "Midfielder" : a.position?.category === "Striker" ? "Forward" : "Other"),
    positionDetail: a.position?.name ?? null,
    age: typeof player?.lifeDates?.age === "number" ? player.lifeDates.age : null,
    nationality: [countries.get(nat.nationalityId), nat.secondNationalityId ? countries.get(nat.secondNationalityId) : null].filter(Boolean).join(" / ") || null,
    marketValue: money(player?.marketValueDetails?.current),
    contractUntil: a.contractUntil ?? null,
    profileUrl: player?.relativeUrl ? `${SITE}${player.relativeUrl}` : null,
    isCaptain: !!member.isCaptain,
    injury: out && kind ? { status: kind, detail: out.name ?? null, date: out.start ?? null, returnDate: out.end ?? null, missedGames: typeof out.missedGamesCount === "number" ? out.missedGamesCount : null } : null
  };
}
async function pool(items2, n, fn) {
  const out = new Array(items2.length);
  let i = 0;
  await Promise.all(Array.from({ length: Math.min(n, items2.length) }, async () => {
    while (i < items2.length) {
      const k = i++;
      out[k] = await fn(items2[k]);
    }
  }));
  return out;
}
async function fetchTransfermarktSquad(f = fetch, today = (/* @__PURE__ */ new Date()).toISOString().slice(0, 10)) {
  const errors = [];
  const squadData = await tmGet(f, `/club/${BARCA_TM_ID}/squad`);
  const members = (squadData?.squad ?? []).filter((m) => m?.playerId && (m.type ?? "current") === "current");
  if (!members.length) throw new Error("Transfermarkt returned an empty squad");
  const ids = members.map((m) => String(m.playerId));
  const players = /* @__PURE__ */ new Map();
  for (let i = 0; i < ids.length; i += 50) {
    const qs = ids.slice(i, i + 50).map((id) => `ids[]=${encodeURIComponent(id)}`).join("&");
    for (const p of await tmGet(f, `/players?${qs}`) ?? []) players.set(String(p.id), p);
  }
  const countries = /* @__PURE__ */ new Map();
  const suspensionIds = /* @__PURE__ */ new Set();
  try {
    const att = await tmGet(f, "/attributes");
    for (const c of att?.countries ?? []) countries.set(Number(c.id), c.name);
    for (const a of att?.absences ?? []) if (a.isSuspension) suspensionIds.add(Number(a.id));
  } catch (e) {
    errors.push(`Transfermarkt countries: ${e.message}`);
  }
  const health = await pool(ids, 4, async (id) => {
    const [inj, abs] = await Promise.all([
      tmGet(f, `/player/${id}/injury`).catch((e) => {
        errors.push(`injuries for ${players.get(id)?.name ?? id}: ${e.message}`);
        return null;
      }),
      tmGet(f, `/player/${id}/absence`).catch(() => null)
    ]);
    return { injuries: inj?.injuries ?? null, absences: abs?.absences ?? null };
  });
  const order = ["Goalkeeper", "Defender", "Midfielder", "Forward", "Other"];
  const squad = members.map((m, k) => toPlayer(m, players.get(ids[k]), health[k].injuries, health[k].absences, countries, today, suspensionIds)).sort((x, y) => order.indexOf(x.position) - order.indexOf(y.position) || Number(x.number ?? 99) - Number(y.number ?? 99));
  return { squad, errors };
}

// src/markets/yahoo.ts
var MARKETS = [
  { symbol: "^GSPC", name: "S&P 500", short: "S&P 500", kind: "index" },
  { symbol: "^IXIC", name: "Nasdaq Composite", short: "Nasdaq", kind: "index" },
  { symbol: "^DJI", name: "Dow Jones", short: "Dow", kind: "index" },
  { symbol: "^STOXX50E", name: "Euro Stoxx 50", short: "Stoxx 50", kind: "index" },
  { symbol: "^GDAXI", name: "DAX", short: "DAX", kind: "index" },
  { symbol: "^ATX", name: "ATX (Vienna)", short: "ATX", kind: "index" },
  { symbol: "^FTSE", name: "FTSE 100", short: "FTSE", kind: "index" },
  { symbol: "^N225", name: "Nikkei 225", short: "Nikkei", kind: "index" },
  { symbol: "GC=F", name: "Gold", short: "Gold", kind: "commodity" },
  { symbol: "BZ=F", name: "Brent crude", short: "Oil", kind: "commodity" },
  { symbol: "EURUSD=X", name: "Euro in dollars", short: "EUR/USD", kind: "fx" },
  { symbol: "BTC-USD", name: "Bitcoin", short: "Bitcoin", kind: "crypto" }
];
function parseChart(json2, def) {
  const r = json2?.chart?.result?.[0];
  const meta = r?.meta;
  const ts = Array.isArray(r?.timestamp) ? r.timestamp : [];
  const raw = Array.isArray(r?.indicators?.quote?.[0]?.close) ? r.indicators.quote[0].close : [];
  const bars = ts.map((t, i) => ({ t, c: raw[i] })).filter((b) => typeof b.c === "number" && Number.isFinite(b.c));
  const price = typeof meta?.regularMarketPrice === "number" ? meta.regularMarketPrice : bars.at(-1)?.c;
  if (price == null || bars.length < 2) return null;
  const tLast = typeof meta?.regularMarketTime === "number" ? meta.regularMarketTime : bars.at(-1).t;
  const sameDay = (a, b) => new Date(a * 1e3).toISOString().slice(0, 10) === new Date(b * 1e3).toISOString().slice(0, 10);
  const lastBarIsLatest = sameDay(bars.at(-1).t, tLast);
  const prev = lastBarIsLatest ? bars.at(-2).c : bars.at(-1).c;
  if (!prev) return null;
  const change = price - prev;
  const closes = lastBarIsLatest ? bars.map((b) => b.c) : [...bars.map((b) => b.c), price];
  return {
    symbol: def.symbol,
    name: def.name,
    short: def.short,
    kind: def.kind,
    price,
    prevClose: prev,
    change,
    changePct: change / prev * 100,
    currency: typeof meta?.currency === "string" ? meta.currency : null,
    time: new Date(tLast * 1e3).toISOString(),
    closes: closes.slice(-7)
  };
}
async function fetchMarkets(f = fetch, now = Date.now()) {
  const errors = [];
  const quotes = [];
  for (const def of MARKETS) {
    let got = null;
    for (const host of ["query1", "query2"]) {
      try {
        const r = await f(`https://${host}.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(def.symbol)}?range=7d&interval=1d`, { headers: { "User-Agent": "Mozilla/5.0 (compatible; TheAtelier/1.0)", Accept: "application/json" } });
        if (!r.ok) {
          if (host === "query2") errors.push(`${def.short}: HTTP ${r.status}`);
          continue;
        }
        got = parseChart(await r.json(), def);
        if (got) break;
      } catch (e) {
        if (host === "query2") errors.push(`${def.short}: ${e.message}`);
      }
    }
    if (got) quotes.push(got);
    await new Promise((res) => setTimeout(res, 150));
  }
  return { fetchedAt: new Date(now).toISOString(), source: "Yahoo Finance", quotes, errors };
}

// src/transit/wl.ts
var WL_STOPS_CSV = "https://www.wienerlinien.at/ogd_realtime/doku/ogd/wienerlinien-ogd-haltepunkte.csv";
function parseStopsCsv(csv) {
  const lines = csv.replace(/^﻿/, "").split(/\r?\n/).filter((l) => l.trim());
  if (!lines.length) return [];
  const split = (l) => l.split(";").map((c) => c.trim().replace(/^"(.*)"$/, "$1"));
  const head = split(lines[0]).map((h) => h.toLowerCase());
  const col = (name) => head.indexOf(name.toLowerCase());
  const iId = col("StopID"), iText = col("StopText"), iMun = col("Municipality"), iLon = col("Longitude"), iLat = col("Latitude");
  if (iId < 0 || iText < 0) throw new Error("Unexpected stops file format");
  const by = /* @__PURE__ */ new Map();
  for (const l of lines.slice(1)) {
    const c = split(l);
    const id = Number(c[iId]);
    const name = c[iText];
    if (!Number.isFinite(id) || !name) continue;
    if (iMun >= 0 && c[iMun] && !/^wien$/i.test(c[iMun])) continue;
    const g = by.get(name) ?? by.set(name, { ids: /* @__PURE__ */ new Set(), lat: [], lon: [] }).get(name);
    g.ids.add(id);
    const lat = Number((c[iLat] ?? "").replace(",", ".")), lon = Number((c[iLon] ?? "").replace(",", "."));
    if (Number.isFinite(lat) && lat) g.lat.push(lat);
    if (Number.isFinite(lon) && lon) g.lon.push(lon);
  }
  const avg = (a) => a.length ? Math.round(a.reduce((x, y) => x + y, 0) / a.length * 1e5) / 1e5 : null;
  return [...by.entries()].map(([name, g]) => [name, [...g.ids].sort((a, b) => a - b), avg(g.lat), avg(g.lon)]).sort((a, b) => a[0].localeCompare(b[0], "de"));
}

// src/lib/util.ts
function normalizeDoi(doi) {
  if (!doi) return null;
  const m = doi.trim().match(/10\.\d{4,9}\/\S+/i);
  return m ? m[0].replace(/[.,;]+$/, "").toLowerCase() : null;
}

// src/research/clients.ts
var ENTITIES = { amp: "&", lt: "<", gt: ">", quot: '"', apos: "'" };
function decode(s) {
  return s.replace(/<[^>]+>/g, "").replace(/&#x([0-9a-f]+);/gi, (_, h) => String.fromCodePoint(parseInt(h, 16))).replace(/&#(\d+);/g, (_, d) => String.fromCodePoint(Number(d))).replace(/&(\w+);/g, (all2, n) => ENTITIES[n] ?? all2).replace(/<\/?(?:i|b|u|em|strong|sup|sub|sc)>/gi, "").replace(/\s+/g, " ").trim();
}
var first = (xml, re) => {
  const m = xml.match(re);
  return m ? decode(m[1]) : null;
};
var all = (xml, re) => Array.from(xml.matchAll(re), (m) => m);
function parsePubmedXml(xml) {
  return all(xml, /<PubmedArticle>([\s\S]*?)<\/PubmedArticle>/g).map(([, a]) => {
    const pmid = first(a, /<PMID[^>]*>(\d+)<\/PMID>/);
    const title = first(a, /<ArticleTitle[^>]*>([\s\S]*?)<\/ArticleTitle>/) ?? "(untitled)";
    const abstractParts = all(a, /<AbstractText([^>]*)>([\s\S]*?)<\/AbstractText>/g).map((m) => {
      const label = m[1].match(/Label="([^"]+)"/)?.[1];
      const text2 = decode(m[2]);
      return label ? `${label[0]}${label.slice(1).toLowerCase()}: ${text2}` : text2;
    });
    const authors = all(a, /<Author\b[^>]*>([\s\S]*?)<\/Author>/g).map(([, au]) => {
      const last = first(au, /<LastName>([\s\S]*?)<\/LastName>/);
      const fore = first(au, /<ForeName>([\s\S]*?)<\/ForeName>/) ?? first(au, /<Initials>([\s\S]*?)<\/Initials>/);
      const coll = first(au, /<CollectiveName>([\s\S]*?)<\/CollectiveName>/);
      return coll ?? [fore, last].filter(Boolean).join(" ");
    }).filter(Boolean);
    const journal = first(a, /<Journal>[\s\S]*?<Title>([\s\S]*?)<\/Title>/);
    const yearS = first(a, /<PubDate>[\s\S]*?<Year>(\d{4})<\/Year>/) ?? first(a, /<PubDate>[\s\S]*?<MedlineDate>(\d{4})/) ?? first(a, /<ArticleDate[^>]*>[\s\S]*?<Year>(\d{4})<\/Year>/);
    const doi = normalizeDoi(first(a, /<ArticleId IdType="doi">([\s\S]*?)<\/ArticleId>/) ?? first(a, /<ELocationID EIdType="doi"[^>]*>([\s\S]*?)<\/ELocationID>/));
    const pmc = first(a, /<ArticleId IdType="pmc">([\s\S]*?)<\/ArticleId>/);
    const keywords = [
      ...all(a, /<Keyword[^>]*>([\s\S]*?)<\/Keyword>/g).map((m) => decode(m[1])),
      ...all(a, /<DescriptorName[^>]*>([\s\S]*?)<\/DescriptorName>/g).map((m) => decode(m[1]))
    ];
    return {
      title,
      authors,
      year: yearS ? Number(yearS) : null,
      journal,
      doi,
      pmid,
      openalexId: null,
      abstract: abstractParts.join("\n\n") || null,
      keywords: Array.from(new Set(keywords)).slice(0, 15),
      url: pmid ? `https://pubmed.ncbi.nlm.nih.gov/${pmid}/` : null,
      openAccess: pmc ? true : null,
      pdfUrl: pmc ? `https://pmc.ncbi.nlm.nih.gov/articles/${pmc}/` : null,
      citedBy: null,
      source: "pubmed"
    };
  });
}

// src/bulletin/core.ts
var EVIDENCE = {
  strong: { label: "Trial or meta-analysis", caution: "Strongest kind of evidence — still check who took part." },
  observational: { label: "Observational / early", caution: "A link, not proof of cause." },
  animal: { label: "Animal or cell study", caution: "In animals or cells — may not carry over to people." },
  preprint: { label: "Preprint · not peer-reviewed", caution: "Not yet checked by other scientists." },
  news: { label: "News & policy", caution: "" }
};
var ANIMAL = /\b(mice|mouse|murine|rats?|rodents?|zebrafish|drosophila|fruit fl(?:y|ies)|c\. elegans|primates?|macaques?|monkeys?|marmosets?|in vitro|cell cultures?|cultured (?:neurons|cells)|organoids?|ipscs?|ipsc-derived|stem cells?|lab-grown|grown in (?:a|the) lab|lab dish|petri dish|pigs?|sheep)\b/i;
var HUMAN = /\b(patients?|participants?|humans?|adults?|children|adolescents?|people|individuals|volunteers|women|men|veterans|students|twins|infants)\b/i;
var OBS = /\b(cohort|cross-sectional|case-control|observational|longitudinal|registry|population-based|survey|associated with|association between|linked to|mendelian randomi[sz]ation)\b/i;
var RCT = /\b(randomi[sz]ed (?:controlled |clinical )?trial|randomi[sz]ed,? (?:double|single)-blind|placebo-controlled)\b/i;
var META = /\b(meta-analys[ie]s|systematic review)\b/i;
function classify(c) {
  const t = `${c.title} ${c.text}`;
  const types = (c.pubTypes ?? []).map((x) => x.toLowerCase());
  const titleAnimal = ANIMAL.test(c.title);
  const animal = titleAnimal || ANIMAL.test(t) && !HUMAN.test(t);
  let studyType = "Study";
  let evidence = "observational";
  if (types.includes("meta-analysis") || META.test(c.title) && !animal) {
    evidence = "strong";
    studyType = types.includes("meta-analysis") || /meta-analys/i.test(c.title) ? "Meta-analysis" : "Systematic review";
  } else if (types.includes("systematic review")) {
    evidence = "strong";
    studyType = "Systematic review";
  } else if (types.includes("randomized controlled trial") || RCT.test(t) && !animal) {
    evidence = "strong";
    studyType = "Randomised trial";
  } else if (animal) {
    evidence = "animal";
    studyType = /in vitro|cell|organoid|ipsc|stem cell|lab-grown/i.test(t) && !/\b(mice|mouse|rats?|zebrafish|monkeys?|macaques?)\b/i.test(t) ? "Cell study" : "Animal study";
  } else if (types.includes("clinical trial")) {
    evidence = "observational";
    studyType = "Early clinical trial";
  } else if (OBS.test(t)) {
    evidence = "observational";
    studyType = "Observational study";
  } else if (types.some((x) => x === "review")) {
    evidence = "observational";
    studyType = "Review";
  }
  if (c.kind === "preprint") return { evidence: "preprint", studyType: studyType === "Study" ? "Preprint" : `${studyType} (preprint)` };
  if (c.kind === "news") {
    if (evidence === "strong" || evidence === "animal") return { evidence, studyType: `${studyType} (reported)` };
    return { evidence: "news", studyType: "Science news" };
  }
  return { evidence, studyType };
}
function categorize(c) {
  if (c.hint) return c.hint;
  const t = `${c.title} ${c.text}`.toLowerCase();
  if (/\b(policy|government|minister|legislation|law|funding cut|nih budget|nhs england|guideline|national plan|regulator|fda approv|ema approv)\b/.test(t)) return "policy";
  if (/\b(patients?|clinical|treatment|therapy|drug|trial|diagnos|dementia|alzheimer|parkinson|stroke|epilepsy|schizophren|bipolar|autism|adhd|multiple sclerosis|migraine)\b/.test(t)) return "clinical";
  if (/psycholog|behavio|emotion|social|personality|wellbeing|well-being|loneliness|motivation|decision|memory bias|attitude|stereotyp|happiness|stress\b/.test(t + " " + c.source.toLowerCase()) && !/\b(neurons?|synap|cortex|hippocamp|dopamine|fmri|eeg|brain)\b/.test(t)) return "psych";
  return "neuro";
}
function peopleIn(text2) {
  const m = text2.match(/\b(\d{1,3}(?:[,\s]\d{3})+|\d{2,7})\s+(?:participants|patients|adults|people|children|individuals|adolescents|women|men|veterans|twins|volunteers|students|older adults)\b/i);
  if (!m) return null;
  const n = Number(m[1].replace(/[,\s]/g, ""));
  return n >= 10 ? n : null;
}
var TOP_JOURNALS = /^(nature|science|cell|neuron|nature neuroscience|nature human behaviour|nature medicine|nature mental health|the lancet.*|lancet.*|new england journal of medicine|n engl j med|jama.*|bmj|brain|pnas|proceedings of the national academy of sciences.*|psychological science|american journal of psychiatry|molecular psychiatry|biological psychiatry|elife|current biology|nature communications|science advances|alzheimer's & dementia|annals of neurology|neurology|trends in .*|nature reviews .*|psychological bulletin|journal of neuroscience)$/i;
function score(c, cls = classify(c)) {
  let s = 0;
  if (TOP_JOURNALS.test(c.source.trim())) s += 5;
  if (cls.evidence === "strong") s += 3;
  if (cls.evidence === "animal") s -= 1;
  if (c.kind === "preprint") s -= 1;
  if (c.kind === "news") s += 2;
  if (c.text.length > 200) s += 1;
  const n = peopleIn(c.text);
  if (n && n >= 1e3) s += 1;
  return s;
}
var key = (title) => title.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim().slice(0, 70);
function dedupe(list) {
  const seen = /* @__PURE__ */ new Set();
  const out = [];
  for (const c of list) {
    const ks = [c.doi ? `doi:${c.doi.toLowerCase()}` : "", c.pmid ? `pmid:${c.pmid}` : "", `t:${key(c.title)}`].filter(Boolean);
    if (ks.some((k) => seen.has(k))) continue;
    ks.forEach((k) => seen.add(k));
    out.push(c);
  }
  return out;
}
function firstSentences(text2, max = 320) {
  const clean = text2.replace(/^(background|introduction|objectives?|aims?|purpose)\s*:\s*/i, "").replace(/\s+/g, " ").trim();
  const parts = clean.match(/[^.!?]+[.!?]+(\s|$)/g) ?? [clean];
  let out = "";
  for (const p of parts) {
    if ((out + p).length > max && out) break;
    out += p;
  }
  return (out || clean).trim().slice(0, max + 40);
}
var numbers = (s) => (s.match(/\d+(?:[.,]\d+)*/g) ?? []).map((n) => n.replace(/,/g, ""));
function numbersOk(aiText, source) {
  const have = new Set(numbers(source));
  return numbers(aiText).every((n) => have.has(n) || have.has(n.replace(/\.0+$/, "")));
}
function toItem(c, ai) {
  const cls = classify(c);
  const src = `${c.title} ${c.text}`;
  const okHead = ai?.headline && ai.headline.length <= 140 && numbersOk(ai.headline, src) ? ai.headline.trim() : null;
  const okSum = ai?.summary && numbersOk(ai.summary, src) ? ai.summary.trim() : null;
  const okWhy = ai?.why && numbersOk(ai.why, src) ? ai.why.trim() : void 0;
  const aiCat = ai?.category && ["neuro", "psych", "clinical", "policy"].includes(ai.category) ? ai.category : null;
  return {
    id: c.id,
    kind: c.kind,
    title: okHead ?? c.title,
    originalTitle: c.title,
    summary: okSum ?? firstSentences(c.text || c.title),
    why: okWhy,
    evidence: cls.evidence,
    studyType: cls.studyType,
    caution: EVIDENCE[cls.evidence].caution,
    category: aiCat ?? categorize(c),
    source: c.source,
    url: c.url,
    doi: c.doi ?? null,
    pmid: c.pmid ?? null,
    authors: c.authors?.slice(0, 8),
    year: c.year ?? null,
    publishedAt: c.publishedAt ?? null,
    abstract: c.text ? c.text.slice(0, 2500) : null,
    people: peopleIn(c.text),
    ai: !!(okHead || okSum)
  };
}
function fallbackQuestion(top) {
  if (!top) return "What makes a psychology finding trustworthy? Name three things you’d check.";
  const about = `About “${top.title}”: `;
  switch (top.evidence) {
    case "observational":
      return `${about}this shows a link. What else could explain it, and how would you test whether it’s a cause?`;
    case "animal":
      return `${about}what would need to be true for this result to apply to people — and how would you find out?`;
    case "strong":
      return `${about}who took part, and who might this result not apply to?`;
    case "preprint":
      return `${about}it hasn’t been peer-reviewed yet. What would you check before believing it?`;
    default:
      return `${about}who is affected, and what evidence would show whether it works?`;
  }
}
var readMinutes = (items2) => Math.max(1, Math.round(items2.reduce((n, i) => n + (i.title + " " + i.summary + " " + (i.why ?? "")).split(/\s+/).length, 0) / 200));
function assemble(date, candidates, ai, prevWeek = [], limit = 10, generatedAt = (/* @__PURE__ */ new Date()).toISOString(), sources2 = []) {
  const byId = new Map(candidates.map((c) => [c.id, c]));
  let items2;
  if (ai?.picks?.length) {
    const used = /* @__PURE__ */ new Set();
    items2 = ai.picks.filter((p) => byId.has(p.id) && !used.has(p.id) && used.add(p.id)).slice(0, limit).map((p) => toItem(byId.get(p.id), p));
  } else {
    items2 = candidates.map((c) => ({ c, s: score(c) })).sort((a, b) => b.s - a.s).slice(0, limit).map(({ c }) => toItem(c));
    items2 = balance(items2, limit);
  }
  const qOk = ai?.question?.text && ai.question.text.length < 400 ? ai.question : null;
  const question = qOk ? { text: qOk.text.trim(), itemId: qOk.id && items2.some((i) => i.id === qOk.id) ? qOk.id : null } : { text: fallbackQuestion(items2[0]), itemId: items2[0]?.id ?? null };
  const today = items2.slice(0, 3).map((i) => ({ date, id: i.id, title: i.title, url: i.url, evidence: i.evidence, category: i.category }));
  const week = [...today, ...prevWeek.filter((w) => w.date !== date)].filter((w) => daysApart(w.date, date) < 7).slice(0, 21);
  return { date, generatedAt, items: items2, question, readMinutes: readMinutes(items2), ai: items2.some((i) => i.ai), week, sources: sources2 };
}
function balance(items2, limit) {
  const out = [];
  const rest = [];
  const count = {};
  for (const i of items2) {
    if ((count[i.category] ?? 0) < 4) {
      out.push(i);
      count[i.category] = (count[i.category] ?? 0) + 1;
    } else rest.push(i);
  }
  return [...out, ...rest].slice(0, limit);
}
function daysApart(a, b) {
  return Math.abs(Math.round((Date.parse(`${b}T12:00:00Z`) - Date.parse(`${a}T12:00:00Z`)) / 864e5));
}
function viennaNow(d = /* @__PURE__ */ new Date()) {
  const parts = Object.fromEntries(new Intl.DateTimeFormat("en-GB", { timeZone: "Europe/Vienna", year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", hour12: false }).formatToParts(d).map((p) => [p.type, p.value]));
  return { date: `${parts.year}-${parts.month}-${parts.day}`, hour: Number(parts.hour) % 24 };
}

// src/bulletin/collect.ts
var BULLETIN_FEEDS = [
  { name: "ScienceDaily", url: "https://www.sciencedaily.com/rss/mind_brain.xml" },
  { name: "Neuroscience News", url: "https://neurosciencenews.com/feed/" },
  { name: "The Transmitter", url: "https://www.thetransmitter.org/feed/" },
  { name: "Medical Xpress", url: "https://medicalxpress.com/rss-feed/neuroscience-news/" }
];
var PUBMED_TERM = '(brain[tiab] OR neuroscien*[tiab] OR neuron*[tiab] OR cognit*[tiab] OR psycholog*[tiab] OR psychiatr*[tiab] OR dementia[tiab] OR alzheimer*[tiab] OR "mental health"[tiab] OR memory[tiab]) AND hasabstract AND english[la]';
var BIORXIV_CATS = /* @__PURE__ */ new Set(["neuroscience", "animal behavior and cognition"]);
var iso2 = (d) => d.toISOString().slice(0, 10);
var daysAgo = (n, from = /* @__PURE__ */ new Date()) => iso2(new Date(from.getTime() - n * 864e5));
async function json(f, url) {
  const r = await f(url, { headers: { Accept: "application/json", "User-Agent": "the-atelier-bulletin" } });
  if (!r.ok) throw new Error(`${r.status}`);
  return r.json();
}
async function text(f, url) {
  const r = await f(url, { headers: { "User-Agent": "Mozilla/5.0 (the-atelier-bulletin)" } });
  if (!r.ok) throw new Error(`${r.status}`);
  return r.text();
}
async function fromPubmed(f, now = /* @__PURE__ */ new Date()) {
  const q = new URLSearchParams({ db: "pubmed", retmode: "json", retmax: "150", term: PUBMED_TERM, sort: "relevance", datetype: "edat", mindate: daysAgo(2, now).replace(/-/g, "/"), maxdate: iso2(now).replace(/-/g, "/"), tool: "the-atelier" });
  const s = await json(f, `https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esearch.fcgi?${q}`);
  const ids = s?.esearchresult?.idlist ?? [];
  if (!ids.length) return [];
  const xml = await text(f, `https://eutils.ncbi.nlm.nih.gov/entrez/eutils/efetch.fcgi?db=pubmed&retmode=xml&tool=the-atelier&id=${ids.join(",")}`);
  return pubmedCandidates(xml);
}
function pubmedCandidates(xml) {
  const types = /* @__PURE__ */ new Map();
  for (const m of xml.matchAll(/<PubmedArticle>([\s\S]*?)<\/PubmedArticle>/g)) {
    const pmid = m[1].match(/<PMID[^>]*>(\d+)<\/PMID>/)?.[1];
    if (pmid) types.set(pmid, [...m[1].matchAll(/<PublicationType[^>]*>([\s\S]*?)<\/PublicationType>/g)].map((x) => x[1].trim()));
  }
  return parsePubmedXml(xml).filter((p) => p.abstract && !/^(erratum|correction|retraction|comment)/i.test(p.title)).map((p) => ({
    id: p.doi ? `doi:${p.doi.toLowerCase()}` : `pmid:${p.pmid}`,
    kind: "paper",
    title: p.title.replace(/\.$/, ""),
    text: p.abstract ?? "",
    source: p.journal ?? "PubMed",
    url: p.doi ? `https://doi.org/${p.doi}` : p.url ?? "",
    doi: p.doi,
    pmid: p.pmid,
    authors: p.authors,
    year: p.year,
    pubTypes: types.get(p.pmid ?? "") ?? []
  }));
}
async function fromBiorxiv(f, now = /* @__PURE__ */ new Date()) {
  const out = [];
  for (let cursor = 0, page = 0; page < 8; page++) {
    const d = await json(f, `https://api.biorxiv.org/details/biorxiv/${daysAgo(2, now)}/${iso2(now)}/${cursor}`);
    const list = d?.collection ?? [];
    for (const p of list) {
      if (!BIORXIV_CATS.has(String(p.category ?? "").toLowerCase())) continue;
      out.push({ id: `doi:${String(p.doi).toLowerCase()}`, kind: "preprint", title: String(p.title).trim(), text: String(p.abstract ?? ""), source: "bioRxiv", url: `https://doi.org/${p.doi}`, doi: p.doi, authors: String(p.authors ?? "").split(";").map((a) => a.trim()).filter(Boolean), publishedAt: p.date ?? null, year: p.date ? Number(String(p.date).slice(0, 4)) : null });
    }
    const total = Number(d?.messages?.[0]?.total ?? 0);
    cursor += list.length;
    if (!list.length || cursor >= total) break;
  }
  return out;
}
async function fromPsyarxiv(f, now = /* @__PURE__ */ new Date()) {
  const d = await json(f, `https://api.osf.io/v2/preprints/?filter%5Bprovider%5D=psyarxiv&filter%5Bdate_published%5D%5Bgte%5D=${daysAgo(2, now)}&page%5Bsize%5D=60`);
  return (d?.data ?? []).map((p) => {
    const a = p.attributes ?? {};
    const doi = a.doi ?? null;
    return { id: doi ? `doi:${String(doi).toLowerCase()}` : `osf:${p.id}`, kind: "preprint", title: String(a.title ?? "").trim(), text: String(a.description ?? ""), source: "PsyArXiv", url: p.links?.html ?? (doi ? `https://doi.org/${doi}` : `https://osf.io/${p.id}`), doi, publishedAt: a.date_published ?? null, year: a.date_published ? Number(String(a.date_published).slice(0, 4)) : null, hint: "psych" };
  }).filter((c) => c.title);
}
async function fromFeeds(f, now = /* @__PURE__ */ new Date()) {
  const list = [];
  const status2 = [];
  for (const feed2 of BULLETIN_FEEDS) {
    try {
      const items2 = parseFeed(await text(f, feed2.url)).filter((i) => !i.publishedAt || now.getTime() - Date.parse(i.publishedAt) < 3 * 864e5).slice(0, 25);
      for (const i of items2) list.push({ id: `url:${i.url}`, kind: "news", title: i.title, text: i.summary ?? "", source: feed2.name, url: i.url, publishedAt: i.publishedAt ?? null, hint: feed2.hint ?? null });
      status2.push({ name: feed2.name, count: items2.length });
    } catch (e) {
      status2.push({ name: feed2.name, count: 0, error: e.message });
    }
  }
  return { list, status: status2 };
}
var PROMPT = `You edit a short morning briefing on neuroscience and psychology for a strong 18-year-old about to study Psychological and Behavioural Sciences.
From the candidate stories (JSON), pick the 10 that matter most: real advances, large or rigorous studies, important clinical or policy news, and surprising findings. Skip duplicates of the same finding (keep the best source), minor technical papers, and hype.
For each pick write:
- "headline": plain English, max 90 characters, no hype, no clickbait. Do not use any number that is not in that story's text.
- "summary": two sentences in plain English saying what was done and found. Only use facts and numbers from that story's text.
- "why": one sentence on why it matters or what it changes.
- "category": one of "neuro", "psych", "clinical", "policy".
Order picks from most to least important. Also write "question": one short critical-thinking question about one of the picks (good for interview practice: causation, sampling, mechanism, ethics), with "id" of that story.
Return only JSON: {"picks":[{"id":"","headline":"","summary":"","why":"","category":""}],"question":{"text":"","id":""}}`;
var MODELS = ["gemini-flash-latest", "gemini-flash-lite-latest", "gemini-2.5-flash", "gemini-2.5-flash-lite"];
async function rankWithGemini(f, key2, candidates, model = "") {
  const payload = candidates.map((c) => ({ id: c.id, kind: c.kind, source: c.source, title: c.title, text: c.text.slice(0, 900) }));
  const body = JSON.stringify({
    systemInstruction: { parts: [{ text: PROMPT }] },
    contents: [{ role: "user", parts: [{ text: JSON.stringify(payload) }] }],
    generationConfig: { temperature: 0.3, responseMimeType: "application/json", maxOutputTokens: 8192 }
  });
  for (const m of [model, ...MODELS].filter((x, i, a) => x && a.indexOf(x) === i)) {
    for (let attempt = 0; attempt < 2; attempt++) {
      const r = await f(`https://generativelanguage.googleapis.com/v1beta/models/${m}:generateContent`, { method: "POST", headers: { "content-type": "application/json", "x-goog-api-key": key2 }, body });
      if (r.status === 404 || r.status === 400) break;
      if (r.status === 429) {
        console.log("bulletin: Gemini free limit reached; using the plain version");
        return null;
      }
      if (r.status >= 500) {
        await new Promise((res) => setTimeout(res, 3e3));
        continue;
      }
      if (!r.ok) {
        console.log(`bulletin: Gemini answered ${r.status}`);
        return null;
      }
      const j = await r.json();
      const txt = j?.candidates?.[0]?.content?.parts?.map((p) => p.text ?? "").join("") ?? "";
      const parsed = parseAi(txt);
      if (parsed) {
        console.log(`bulletin: ${parsed.picks.length} picks from ${m}`);
        return parsed;
      }
      console.log("bulletin: could not read Gemini’s answer");
      return null;
    }
  }
  console.log("bulletin: Gemini busy; using the plain version");
  return null;
}
function parseAi(txt) {
  try {
    const j = JSON.parse(txt.replace(/^```(?:json)?\s*|\s*```$/g, ""));
    if (!Array.isArray(j?.picks)) return null;
    return { picks: j.picks.filter((p) => p && typeof p.id === "string"), question: j.question && typeof j.question.text === "string" ? j.question : void 0 };
  } catch {
    return null;
  }
}
async function buildBulletin(o) {
  const f = o.f ?? fetch;
  const now = o.now ?? /* @__PURE__ */ new Date();
  const sources2 = [];
  const all2 = [];
  const grab = async (name, fn) => {
    try {
      const l = await fn();
      all2.push(...l);
      sources2.push({ name, count: l.length });
    } catch (e) {
      sources2.push({ name, count: 0, error: e.message });
    }
  };
  await grab("PubMed", () => fromPubmed(f, now));
  await grab("bioRxiv", () => fromBiorxiv(f, now));
  await grab("PsyArXiv", () => fromPsyarxiv(f, now));
  const feeds = await fromFeeds(f, now);
  all2.push(...feeds.list);
  sources2.push(...feeds.status);
  const pool3 = dedupe(all2).filter((c) => c.title && c.url).map((c) => ({ c, s: score(c) })).sort((a, b) => b.s - a.s).slice(0, 70).map((x) => x.c);
  const ai = o.geminiKey && pool3.length ? await rankWithGemini(f, o.geminiKey, pool3, o.geminiModel ?? "").catch((e) => {
    console.log(`bulletin: Gemini failed (${e.message})`);
    return null;
  }) : null;
  return assemble(o.date, pool3, ai, o.prevWeek ?? [], 10, now.toISOString(), sources2);
}

// scripts/recommend.ts
var OUT = process.argv[2] || "recommendations.json";
var SOURCES_FILE = process.argv[3] || "rec-sources.json";
var MAX_AGE_DAYS = 30;
var PER_SOURCE = 12;
var NEWS_MAX_AGE_DAYS = 3;
var NEWS_PER_SOURCE = 30;
var isNews = (s) => s.categories.some((c) => NEWS_SECTIONS.includes(c));
var isCountryNews = (s) => s.categories.some((c) => COUNTRY_SECTIONS.includes(c));
var newsAgeDays = (s) => isCountryNews(s) ? 7 : NEWS_MAX_AGE_DAYS;
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
    const since = news ? Date.now() - newsAgeDays(s) * 864e5 : cutoff;
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
var items = Array.from(byUrl.values()).filter((i) => !i.publishedAt || Date.parse(i.publishedAt) >= (isNews(i) ? Date.now() - newsAgeDays(i) * 864e5 : cutoff)).sort((a, b) => (b.publishedAt ?? "").localeCompare(a.publishedAt ?? "")).slice(0, 1500);
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
var barca = null;
try {
  barca = await fetchBarca(fetch);
  console.log(`barca: ${barca.upcoming.length} upcoming, ${barca.recent.length} results, ${barca.squad.length} players, ${barca.standings.length} tables${barca.errors.length ? ` · ${barca.errors.length} feeds failed: ${barca.errors.join("; ")}` : ""}`);
} catch (e) {
  console.log(`barca failed: ${e.message}`);
}
var previousBarca = null;
try {
  previousBarca = JSON.parse(await readFile(OUT, "utf8")).barca ?? null;
} catch {
}
if (!hasBarcaData(barca)) barca = previousBarca ?? barca;
if (barca) {
  try {
    const tm = await fetchTransfermarktSquad(fetch);
    barca = { ...barca, squad: tm.squad, squadSource: "Transfermarkt", squadFetchedAt: (/* @__PURE__ */ new Date()).toISOString(), errors: [...barca.errors, ...tm.errors.slice(0, 3)] };
    console.log(`transfermarkt: ${tm.squad.length} players, ${tm.squad.filter((p) => p.injury).length} unavailable${tm.errors.length ? ` · ${tm.errors.length} lookups failed` : ""}`);
  } catch (e) {
    console.log(`transfermarkt failed: ${e.message}`);
    const prev = previousBarca;
    if (prev?.squadSource === "Transfermarkt" && prev.squadFetchedAt && Date.now() - Date.parse(prev.squadFetchedAt) < 7 * 864e5) {
      barca = { ...barca, squad: prev.squad, squadSource: "Transfermarkt", squadFetchedAt: prev.squadFetchedAt };
    }
    barca = { ...barca, errors: [...barca.errors, `Transfermarkt: ${e.message}`] };
  }
}
var markets = null;
try {
  markets = await fetchMarkets(fetch);
  console.log(`markets: ${markets.quotes.length} quotes${markets.errors.length ? ` · failed: ${markets.errors.join("; ")}` : ""}`);
  if (!markets.quotes.length) {
    try {
      markets = JSON.parse(await readFile(OUT, "utf8")).markets ?? markets;
    } catch {
    }
  }
} catch (e) {
  console.log(`markets failed: ${e.message}`);
}
var wlStops = null;
try {
  wlStops = JSON.parse(await readFile(OUT, "utf8")).wlStops ?? null;
} catch {
}
if (!wlStops || Date.now() - Date.parse(wlStops.fetchedAt) > 7 * 864e5) {
  try {
    const r = await fetch(WL_STOPS_CSV, { headers: { "User-Agent": UA["User-Agent"] } });
    if (!r.ok) throw new Error(`HTTP ${r.status}`);
    const stations = parseStopsCsv(await r.text());
    if (stations.length < 100) throw new Error(`only ${stations.length} stations`);
    wlStops = { fetchedAt: (/* @__PURE__ */ new Date()).toISOString(), stations };
    console.log(`wiener linien stops: ${stations.length} stations`);
  } catch (e) {
    console.log(`wiener linien stops failed: ${e.message}${wlStops ? " (keeping the previous list)" : ""}`);
  }
}
var bulletin = null;
try {
  bulletin = JSON.parse(await readFile(OUT, "utf8")).bulletin ?? null;
} catch {
}
{
  const vn = viennaNow();
  const mode = process.env.BULLETIN ?? "";
  const due = mode === "force" || mode !== "off" && (!bulletin || bulletin.date !== vn.date) && vn.hour >= 4;
  if (due) {
    try {
      const fresh2 = await buildBulletin({ date: vn.date, geminiKey: process.env.GEMINI_API_KEY || null, geminiModel: process.env.GEMINI_MODEL || null, prevWeek: bulletin?.week ?? [] });
      console.log(`bulletin: ${fresh2.items.length} stories for ${fresh2.date}${fresh2.ai ? " (AI summaries)" : process.env.GEMINI_API_KEY ? " (plain: AI unavailable)" : " (plain: no GEMINI_API_KEY secret)"}; sources ${fresh2.sources.map((x) => `${x.name} ${x.count}${x.error ? " !" : ""}`).join(", ")}`);
      if (fresh2.items.length) bulletin = fresh2;
    } catch (e) {
      console.log(`bulletin: failed (${e.message}); keeping the previous edition`);
    }
  } else console.log(`bulletin: ${bulletin ? `keeping ${bulletin.date}` : "not yet (from 04:00 Vienna time)"}`);
}
var pool2 = { format: "atelier-recommendations", version: 7, markets, generatedAt: (/* @__PURE__ */ new Date()).toISOString(), sources: status, items, horoscopes: horo, barca, wlStops, bulletin };
await writeFile(OUT, JSON.stringify(pool2, null, 0) + "\n");
console.log(`Wrote ${items.length} items (${fresh.length} fetched this run) to ${OUT}`);
