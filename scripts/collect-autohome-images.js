#!/usr/bin/env node
"use strict";
const fs = require("fs");
const fsp = fs.promises;
const path = require("path");
const ROOT = path.resolve(__dirname, "..");
const SOURCE_ROOT = path.join(ROOT, "media-source", "autohome");
const TMP_DIR = path.join(ROOT, "tmp");
const ERROR_LOG_PATH = path.join(TMP_DIR, "new-car-intake-error.log");
const TYPES = [
  ["front-right-45", "01-front-right-45", ["front right", "right front", "45", "three quarter", "3/4", "右前", "前45", "外观"]],
  ["right-side-90", "02-right-side-90", ["right side", "side 90", "侧面", "右侧", "车侧"]],
  ["rear", "03-rear", ["rear", "back", "tail", "后方", "车尾", "尾部", "正后"]],
  ["front", "04-front", ["front", "face", "正面", "车头", "前脸", "正前"]],
  ["front-interior", "05-front-interior", ["front interior", "interior", "driver", "驾驶", "前排", "内饰", "座舱"]],
  ["center-console", "06-center-console", ["center console", "console", "dashboard", "control", "中控", "仪表", "屏幕"]],
  ["other", "07-other", []]
].map(([key, file, keywords]) => ({ key, file, keywords }));
const REQUIRED = TYPES.filter((t) => t.key !== "other").map((t) => t.key);
const COLORS = [["white", ["white", "白"]], ["black", ["black", "黑"]], ["gray", ["gray", "grey", "灰"]], ["silver", ["silver", "银"]], ["red", ["red", "红"]], ["blue", ["blue", "蓝"]], ["green", ["green", "绿"]], ["pink", ["pink", "粉"]], ["yellow", ["yellow", "黄"]]];
const ALIASES = new Map([["一汽奔腾", "faw-bestune"], ["奔腾", "bestune"], ["小马", "xiaoma"], ["奥迪", "audi"], ["宝马", "bmw"], ["奔驰", "mercedes-benz"], ["大众", "volkswagen"], ["丰田", "toyota"], ["本田", "honda"], ["比亚迪", "byd"], ["吉利", "geely"], ["奇瑞", "chery"], ["长安", "changan"], ["长城", "great-wall"], ["哈弗", "haval"], ["五菱", "wuling"]]);
const first = (...v) => v.map((x) => String(x ?? "").trim()).find(Boolean) || "";
const logLines = [];
const errorLines = [];
let currentStep = "unknown";
const log = (...a) => {
  const line = a.map((value) => String(value ?? "")).join(" ");
  logLines.push(`[autohome-collector] ${line}`);
};
const parseCliArgs = (argv = process.argv.slice(2)) => {
  const out = {};
  for (let i = 0; i < argv.length; i++) {
    const x = argv[i];
    if (!x.startsWith("--")) continue;
    const k = x.slice(2);
    const n = argv[i + 1];
    if (!n || n.startsWith("--")) out[k] = true;
    else { out[k] = n; i++; }
  }
  return out;
};
const joinList = (value) => Array.isArray(value) ? value.map(first).filter(Boolean).join(",") : first(value);
const firstMarket = (input) => Array.isArray(input.selectedMarkets) ? input.selectedMarkets.map(first).filter(Boolean)[0] || "" : first(input.selectedMarket);
const collectorInputArgs = (input = {}) => ({
  url: first(input.url, input.sourceUrl),
  brand: first(input.brand),
  model: first(input.model),
  trim: first(input.trim),
  brandEn: first(input.brandEn),
  modelEn: first(input.modelEn),
  trimEn: first(input.trimEn),
  displayNameEn: first(input.displayNameEn),
  guidePrice: first(input.guidePrice),
  fobPrice: first(input.fobPrice),
  targetMarket: first(input.targetMarket) || "auto",
  selectedMarket: firstMarket(input),
  energyType: first(input.energyType),
  bodyType: first(input.bodyType),
  displacement: first(input.displacement),
  keywords: joinList(input.keywords),
  maxImages: first(input.maxImages, 30),
  maxPerType: first(input.maxPerType, 2),
  timeoutMs: first(input.timeoutMs, 15000),
  skipFetch: input.skipFetch === true || /^true$/i.test(first(input.skipFetch))
});
let args = parseCliArgs();
const norm = (s) => { try { s = decodeURIComponent(String(s || "")); } catch {} return String(s || "").replace(/&quot;|&#34;/g, '"').replace(/&amp;/g, "&").replace(/[_-]+/g, " ").toLowerCase(); };
const hasAny = (text, words) => words.some((w) => text.includes(norm(w)));
const slugify = (v) => String(ALIASES.get(String(v || "").trim()) || v || "").trim().toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
const vehicleSlug = () => { const parts = [slugify(first(args.brandEn, args.brand)), slugify(first(args.modelEn, args.model)), slugify(first(args.trimEn, args.trim)) || slugify(args.guidePrice)].filter(Boolean); return parts.filter((p, i, a) => i === 0 || p !== a[i - 1]).join("-"); };
const specId = () => (String(args.url || "").match(/\/spec\/(\d+)/i) || [])[1] || "";
const numberValue = (v) => { const m = String(v || "").replace(/,/g, "").match(/\d+(?:\.\d+)?/); return m ? Number(m[0]) : 0; };
const keywordArray = (v) => Array.isArray(v) ? v.map(first).filter(Boolean) : first(v).split(/[，,]/).map(first).filter(Boolean);
const attrMap = (tag) => { const out = {}; for (const m of tag.matchAll(/([a-zA-Z0-9:_-]+)\s*=\s*("([^"]*)"|'([^']*)'|([^\s>]+))/g)) out[m[1].toLowerCase()] = m[3] || m[4] || m[5] || ""; return out; };
const absUrl = (raw, base) => { const v = first(raw).replace(/\\u002F/g, "/").replace(/\\\//g, "/"); if (!v || v.startsWith("data:") || v.startsWith("blob:")) return ""; try { return v.startsWith("//") ? new URL(`https:${v}`).toString() : new URL(v, base).toString(); } catch { return ""; } };
const likelyImage = (url) => /\.(jpe?g|png|webp)(\?|#|$)/i.test(url) || /autoimg\.cn|car\d*\.autoimg\.cn|img\.autohome/i.test(url);
const rejected = (url, ctx = "") => hasAny(norm(`${url} ${ctx}`), ["logo", "icon", "sprite", "avatar", "favicon", "brand-logo", "loading", "qrcode", "appdown"]);
const maybeThumb = (url) => /\d{2,4}x\d{2,4}|small|thumb|thumbnail|400x300|240x180/i.test(url);
const largeUrl = (url) => String(url || "").replace(/400x300_0_q\d+_c\d+_/i, "1024x0_1_q95_").replace(/240x180_0_q\d+_c\d+_/i, "1024x0_1_q95_").replace(/([?&])(w|width|h|height)=\d+/gi, "");
const srcsetFirst = (v) => first(String(v || "").split(",").map((x) => first(x.split(/\s+/)[0])));
function addCandidate(list, seen, raw, page, ctx) { const u0 = absUrl(raw, page); if (!u0 || !likelyImage(u0) || rejected(u0, ctx)) return; const u = absUrl(largeUrl(u0), page) || u0; if (seen.has(u)) return; seen.add(u); list.push({ url: u, sourcePage: page, context: first(ctx, u), maybeThumbnail: maybeThumb(u0) || maybeThumb(u) }); }
function extractImages(html, page) { const list = [], seen = new Set(); for (const m of html.matchAll(/<img\b[^>]*>/gi)) { const a = attrMap(m[0]); const ctx = [a.alt, a.title, a.class, a.id, a.src, a["data-src"], a["data-original"]].filter(Boolean).join(" "); [a.src, a["data-src"], a["data-original"], a["data-url"], srcsetFirst(a.srcset)].forEach((u) => addCandidate(list, seen, u, page, ctx)); } for (const m of html.matchAll(/<source\b[^>]*>/gi)) { const a = attrMap(m[0]); addCandidate(list, seen, first(srcsetFirst(a.srcset), a.src), page, [a.media, a.type].join(" ")); } for (const m of html.matchAll(/url\((['"]?)([^'")]+)\1\)/gi)) addCandidate(list, seen, m[2], page, m[0]); for (const m of html.matchAll(/["']([^"']+\.(?:jpg|jpeg|png|webp)(?:\?[^"']*)?)["']/gi)) addCandidate(list, seen, m[1], page, m[1]); return list; }
function inferType(c) { const text = norm(`${c.context} ${c.url}`); const hit = TYPES.filter((t) => t.key !== "other").map((t) => ({ t, score: t.keywords.reduce((n, k) => n + (text.includes(norm(k)) ? 1 : 0), 0) })).filter((x) => x.score > 0).sort((a, b) => b.score - a.score)[0]; return hit ? hit.t : TYPES.find((t) => t.key === "other"); }
function inferColor(c) { const text = norm(`${c.context} ${c.url}`); const hit = COLORS.find(([, words]) => hasAny(text, words)); return hit ? hit[0] : "unknown-color"; }
function ext(url) { const e = ((new URL(url).pathname.match(/\.(jpe?g|png|webp)$/i) || [])[1] || "jpg").toLowerCase(); return e === "jpeg" ? "jpg" : e; }
async function fetchWithTimeout(url, timeoutMs) { const c = new AbortController(); const t = setTimeout(() => c.abort(), timeoutMs); try { return await fetch(url, { signal: c.signal, headers: { "user-agent": "Mozilla/5.0 ZhongguAutoExportInternalImageCollector/1.0", accept: "text/html,image/webp,image/jpeg,image/png,image/*,*/*;q=0.8", referer: "https://www.autohome.com.cn/" } }); } finally { clearTimeout(t); } }
function imageInfo(buffer) {
  const size = buffer.length;
  try {
    if (buffer.length >= 24 && buffer.toString("ascii", 1, 4) === "PNG") {
      return { width: buffer.readUInt32BE(16), height: buffer.readUInt32BE(20), fileSize: size };
    }
    if (buffer.length >= 10 && buffer[0] === 0xff && buffer[1] === 0xd8) {
      let offset = 2;
      while (offset + 9 < buffer.length) {
        if (buffer[offset] !== 0xff) { offset += 1; continue; }
        const marker = buffer[offset + 1];
        const length = buffer.readUInt16BE(offset + 2);
        if ([0xc0,0xc1,0xc2,0xc3,0xc5,0xc6,0xc7,0xc9,0xca,0xcb,0xcd,0xce,0xcf].includes(marker)) {
          return { width: buffer.readUInt16BE(offset + 7), height: buffer.readUInt16BE(offset + 5), fileSize: size };
        }
        offset += 2 + length;
      }
    }
    if (buffer.length >= 30 && buffer.toString("ascii", 0, 4) === "RIFF" && buffer.toString("ascii", 8, 12) === "WEBP") {
      const chunk = buffer.toString("ascii", 12, 16);
      if (chunk === "VP8X") return { width: 1 + buffer.readUIntLE(24, 3), height: 1 + buffer.readUIntLE(27, 3), fileSize: size };
      if (chunk === "VP8 ") return { width: buffer.readUInt16LE(26) & 0x3fff, height: buffer.readUInt16LE(28) & 0x3fff, fileSize: size };
      if (chunk === "VP8L") return { width: 1 + (((buffer[22] & 0x3f) << 8) | buffer[21]), height: 1 + (((buffer[24] & 0x0f) << 10) | (buffer[23] << 2) | ((buffer[22] & 0xc0) >> 6)), fileSize: size };
    }
  } catch {}
  return { width: 0, height: 0, fileSize: size, unknown: true };
}async function download(c, file, timeoutMs) { const r = await fetchWithTimeout(c.url, timeoutMs); if (!r.ok) throw new Error(`HTTP ${r.status}`); const ct = r.headers.get("content-type") || ""; if (!ct.toLowerCase().includes("image")) throw new Error(`Unexpected content type: ${ct || "unknown"}`); const buf = Buffer.from(await r.arrayBuffer()); if (buf.length < 256) throw new Error("Image response was too small."); await fsp.writeFile(file, buf); return imageInfo(buf); }
const safeStack = (error) => String(error?.stack || error?.message || error || "").split(/\r?\n/).slice(0, 20).join("\n");
async function appendCollectorErrorLog(input, step, error) {
  try {
    await fsp.mkdir(TMP_DIR, { recursive: true });
    const lines = [
      "[" + new Date().toISOString() + "]",
      "url=" + first(input?.url, input?.sourceUrl),
      "vehicle=" + [input?.brand, input?.model, input?.trim, input?.guidePrice].map((v) => String(v ?? "").trim()).filter(Boolean).join(" / "),
      "step=" + (step || "unknown"),
      "error.name=" + (error?.name || "Error"),
      "error.message=" + (error?.message || String(error || "")),
      "stack=",
      safeStack(error),
      ""
    ];
    await fsp.appendFile(ERROR_LOG_PATH, lines.join("\n") + "\n", "utf8");
  } catch {}
}
function addMarket(items, market, level, reason) { if (!items.some((x) => x.market === market)) items.push({ market, level, reason }); }
function recommendMarkets() { const text = norm([args.brand, args.model, args.trim, args.energyType, args.bodyType, args.displacement, args.keywords].filter(Boolean).join(" ")); const gp = numberValue(args.guidePrice), fp = numberValue(args.fobPrice); const low = (gp && gp <= 60000) || (fp && fp <= 7000) || hasAny(text, ["low price", "budget", "低价"]); const mini = hasAny(text, ["mini", "micro", "small", "xiaoma", "小马", "微型", "小型"]); const ev = hasAny(text, ["ev", "electric", "bev", "新能源", "纯电", "电动"]); const gas = hasAny(text, ["gasoline", "petrol", "fuel", "燃油", "汽油"]); const suv = hasAny(text, ["suv", "越野"]); const used = hasAny(text, ["used", "second hand", "二手"]); const smallDisp = /(^|\D)(0\.[1-9]|1\.[0-6]|1\.0|1\.2|1\.3|1\.4|1\.5|1\.6)\s*l/.test(text); const r = []; if ((low && mini) || (low && ev) || (mini && ev)) { addMarket(r, "Southeast Asia", "recommended", "Low-cost small EV suitable for urban mobility and price-sensitive buyers."); addMarket(r, "Middle East", "test", "Can be tested for city delivery and short-distance mobility segments."); addMarket(r, "South America", "test", "Price-sensitive urban buyers may respond, but local EV demand should be verified."); addMarket(r, "Algeria", "caution", "Algeria buyers currently prefer gasoline vehicles and lower displacement models; NEV acceptance should be verified."); addMarket(r, "West Africa", "caution", "Charging infrastructure and used gasoline vehicle preference may limit demand."); addMarket(r, "Central Asia", "caution", "Winter conditions and driving range can affect small EV usability."); return r; } if (used && gas) { addMarket(r, "West Africa", "recommended", "Used gasoline vehicles have stronger existing demand in price-sensitive markets."); addMarket(r, "Used Cars", "recommended", "Classify this lead under the used-car workflow for stock and media review."); } if (smallDisp && (gas || !ev)) { addMarket(r, "Algeria", "recommended", "Small-displacement gasoline vehicles fit common import demand and buyer preference."); addMarket(r, "West Africa", "test", "Can be tested where low purchase price and simple maintenance are priorities."); addMarket(r, "Central Asia", "test", "Can be tested if cold-weather suitability and parts support are confirmed."); } if (suv && (gas || !ev)) { addMarket(r, "Central Asia", "recommended", "SUV and left-hand-drive fuel vehicles fit road conditions and buyer preference."); addMarket(r, "West Africa", "recommended", "SUVs and practical fuel vehicles are suitable for mixed road conditions."); } if (!r.length) { addMarket(r, "Algeria", "test", "Market fit is unclear from the provided vehicle data; verify price, fuel type, and displacement."); addMarket(r, "West Africa", "test", "Can be evaluated after confirming fuel type, ground clearance, and parts availability."); addMarket(r, "Southeast Asia", "test", "Can be evaluated after confirming price and usage scenario."); } return r; }
async function runCollector() { logLines.length = 0; errorLines.length = 0; currentStep = "validate_payload"; const missing = ["url", "brand", "model"].filter((k) => !first(args[k])); if (missing.length) { const error = new Error(`Missing required argument(s): ${missing.join(", ")}`); error.step = currentStep; throw error; } currentStep = "parse_spec_id"; if (!specId()) { const error = new Error("\u65e0\u6cd5\u4ece\u6c7d\u8f66\u4e4b\u5bb6\u94fe\u63a5\u89e3\u6790\u8f66\u578b\u914d\u7f6e ID\u3002"); error.step = currentStep; throw error; } currentStep = "create_output_dir"; const max = Math.min(30, Math.max(1, Number(args.maxImages || 30))); const timeoutMs = Math.max(1000, Number(args.timeoutMs || 15000)); const slug = vehicleSlug(); if (!slug) throw new Error("Unable to build target directory name from vehicle fields."); const dir = path.join(SOURCE_ROOT, slug); await fsp.mkdir(path.join(dir, "unknown-color"), { recursive: true }); currentStep = "fetch_autohome_page"; let candidates = [], pageError = ""; if (args.skipFetch) log("skipFetch enabled; created directory and metadata without downloading images."); else { try { log(`specId: ${specId() || "unknown"}`); log(`fetching source page: ${args.url}`); const page = await fetchWithTimeout(args.url, timeoutMs); if (!page.ok) throw new Error(`HTTP ${page.status}`); candidates = extractImages(await page.text(), args.url).slice(0, max); log(`found ${candidates.length} image candidate(s) on source page.`); } catch (e) { pageError = e.message; log(`could not fetch or parse source page: ${e.message}`); } } currentStep = "parse_image_candidates"; const prepared = candidates.map((c) => ({ c, type: inferType(c), color: inferColor(c) })); const groupTotals = new Map(); for (const p of prepared) { const key = `${p.color}/${p.type.key}`; groupTotals.set(key, (groupTotals.get(key) || 0) + 1); } currentStep = "download_images"; const counters = new Map(), images = [], downloadErrors = []; for (const p of prepared) { const { c, type, color } = p; await fsp.mkdir(path.join(dir, color), { recursive: true }); const key = `${color}/${type.key}`; const count = counters.get(key) || 0; counters.set(key, count + 1); const suffix = groupTotals.get(key) > 1 ? `-${String(count + 1).padStart(2, "0")}` : ""; const rel = `${color}/${type.file}${suffix}.${ext(c.url)}`; try { const info = await download(c, path.join(dir, rel), timeoutMs); const sizeThumb = info.unknown ? "unknown" : (info.width < 800 || info.height < 600); const thumbFlag = sizeThumb === "unknown" ? (c.maybeThumbnail ? true : "unknown") : (c.maybeThumbnail || sizeThumb); images.push({ file: rel, type: type.key, color, originalUrl: c.url, sourcePage: c.sourcePage, selected: false, ignored: false, isMainImage: false, status: "pending_review", width: info.width || 0, height: info.height || 0, fileSize: info.fileSize || 0, maybeThumbnail: thumbFlag, watermarkDetected: "unknown", copyrightNotice: "Autohome source image, pending rights review" }); log(`downloaded ${rel}`); } catch (e) { downloadErrors.push({ url: c.url, error: e.message }); log(`failed to download ${c.url}: ${e.message}`); } } const colors = [...new Set(images.map((i) => i.color))].sort(); const types = new Set(images.map((i) => i.type)); const missingImageTypes = REQUIRED.filter((t) => !types.has(t)); const metadata = { source: "autohome", sourceUrl: args.url, specId: specId(), brand: first(args.brand), model: first(args.model), trim: first(args.trim), brandEn: first(args.brandEn), modelEn: first(args.modelEn), trimEn: first(args.trimEn), displayNameEn: first(args.displayNameEn), guidePrice: first(args.guidePrice), fobPrice: first(args.fobPrice), energyType: first(args.energyType), bodyType: first(args.bodyType), displacement: first(args.displacement), keywords: keywordArray(args.keywords), targetMarket: first(args.targetMarket) || "auto", selectedMarkets: [], selectedMarket: first(args.selectedMarket), recommendedMarkets: recommendMarkets(), downloadedAt: new Date().toISOString(), licenseStatus: "pending_review", usageNote: "Internal reference only. Do not publish until rights are confirmed.", status: "collected", collectionStatus: "collected", reviewStatus: "pending_review", allowedStatuses: ["collected", "pending_review", "approved_for_internal", "approved_for_public", "rejected"], storagePolicy: { directory: path.relative(ROOT, dir).replace(/\\/g, "/"), publishDirectory: "images/new-cars", mayPublishOnlyWhen: "approved_for_public", removeWatermark: false, replaceThirdPartyBranding: false }, colors, images, missingImageTypes, downloadErrors, pageError }; currentStep = "write_metadata"; const metadataPath = path.join(dir, "metadata.json"); await fsp.writeFile(metadataPath, `${JSON.stringify(metadata, null, 2)}\n`, "utf8"); log(`metadata: ${path.relative(ROOT, metadataPath).replace(/\\/g, "/")}`); log(`downloaded images: ${images.length}`); log(`colors: ${colors.length ? colors.join(", ") : "none"}`); log(`missing image types: ${missingImageTypes.length ? missingImageTypes.join(", ") : "none"}`); currentStep = "complete"; return { success: true, scriptSuccess: true, metadata, metadataPath, stdout: logLines.join("\n"), stderr: errorLines.join("\n"), downloadedImages: images.length }; }
const relFromRoot = (absolute) => path.relative(ROOT, absolute).replace(/\\/g, "/");
const collectorResult = ({ success, error = "", reason = "", warning = "", step = currentStep || "unknown", details = "", suggestion = "", result = {}, metadata = result.metadata || null }) => {
  const images = Array.isArray(metadata?.images) ? metadata.images : [];
  const colors = Array.isArray(metadata?.colors) ? metadata.colors : [];
  const metadataPath = result.metadataPath ? relFromRoot(result.metadataPath) : (metadata?.metadataPath || "");
  const outputDir = metadata?.storagePolicy?.directory || (metadataPath ? metadataPath.replace(/\/metadata\.json$/i, "") : "");
  const log = String(result.stdout || "").split(/\r?\n/).filter(Boolean);
  return {
    success,
    error,
    warning,
    reason,
    step,
    details,
    suggestion,
    outputDir,
    metadataPath,
    downloadedCount: images.length,
    downloadedImages: images.length,
    colorCount: colors.length,
    missingImageTypes: Array.isArray(metadata?.missingImageTypes) ? metadata.missingImageTypes : [],
    images,
    metadata,
    log,
    stdout: log.join("\n"),
    stderr: result.stderr || "",
    errorLogPath: relFromRoot(ERROR_LOG_PATH)
  };
};
async function collectAutohomeImages(input = {}) {
  const previousArgs = args;
  args = collectorInputArgs(input);
  currentStep = "validate_payload";
  const missing = ["url", "brand", "model", "fobPrice"].filter((key) => !first(args[key]));
  if (!first(args.trim) && !first(args.guidePrice)) missing.push("trim or guidePrice");
  if (missing.length) {
    const error = new Error("\u7f3a\u5c11\u5fc5\u8981\u5b57\u6bb5\uff1a" + missing.join(", "));
    await appendCollectorErrorLog(args, currentStep, error);
    args = previousArgs;
    return collectorResult({ success: false, error: "\u56fe\u7247\u91c7\u96c6\u5931\u8d25\uff1a" + error.message, reason: "MISSING_FIELDS", step: currentStep, details: error.message, suggestion: "\u8bf7\u5148\u8865\u5168\u6c7d\u8f66\u4e4b\u5bb6\u94fe\u63a5\u3001\u54c1\u724c\u3001\u8f66\u578b\u3001\u914d\u7f6e\u6216\u6307\u5bfc\u4ef7\u3001FOB \u4ef7\u683c\u3002", result: { stdout: "", stderr: "", metadata: null } });
  }
  currentStep = "parse_spec_id";
  if (!specId()) {
    const error = new Error("\u65e0\u6cd5\u4ece\u6c7d\u8f66\u4e4b\u5bb6\u94fe\u63a5\u89e3\u6790\u8f66\u578b\u914d\u7f6e ID\u3002");
    await appendCollectorErrorLog(args, currentStep, error);
    args = previousArgs;
    return collectorResult({ success: false, error: error.message, reason: "SPEC_ID_PARSE_FAILED", step: currentStep, details: error.message, suggestion: "\u8bf7\u786e\u8ba4\u94fe\u63a5\u683c\u5f0f\u7c7b\u4f3c https://www.autohome.com.cn/spec/73960/\u3002", result: { stdout: "", stderr: "", metadata: null } });
  }
  try {
    const result = await runCollector();
    const metadata = result.metadata || null;
    const images = Array.isArray(metadata?.images) ? metadata.images : [];
    if (!images.length) {
      const blocked = Boolean(metadata?.pageError);
      return collectorResult({
        success: true,
        warning: "\u672a\u91c7\u96c6\u5230\u56fe\u7247\uff0c\u8bf7\u624b\u52a8\u4e0a\u4f20\u6216\u8865\u5145\u7d20\u6750\u3002",
        reason: blocked ? "AUTOHOME_FETCH_FAILED" : "NO_IMAGES_FOUND",
        step: blocked ? "fetch_autohome_page" : "parse_image_candidates",
        details: blocked ? (metadata?.pageError || "\u6c7d\u8f66\u4e4b\u5bb6\u9875\u9762\u53ef\u80fd\u9650\u5236\u6293\u53d6\u3002") : "\u672a\u4ece\u9875\u9762\u89e3\u6790\u5230\u5019\u9009\u56fe\u7247\u3002",
        suggestion: "\u8bf7\u5c06\u6388\u6743\u56fe\u7247\u6216\u81ea\u6709\u56fe\u7247\u653e\u5165\u8be5\u76ee\u5f55\uff0c\u518d\u56de\u5230\u672c\u9875\u9762\u5237\u65b0\u5019\u9009\u56fe\u7247\u3002",
        result,
        metadata
      });
    }
    return collectorResult({ success: true, result, metadata, step: "complete" });
  } catch (error) {
    const step = error.step || currentStep || "unknown";
    await appendCollectorErrorLog(args, step, error);
    const stdout = logLines.join("\n");
    const stderr = errorLines.concat(error.stack || error.message).filter(Boolean).join("\n");
    return collectorResult({
      success: false,
      error: "\u56fe\u7247\u91c7\u96c6\u5931\u8d25\uff1a" + (error.message || "\u91c7\u96c6\u51fd\u6570\u6267\u884c\u5f02\u5e38\u3002"),
      reason: "COLLECTOR_EXCEPTION",
      step,
      details: error.message || String(error),
      suggestion: "\u8bf7\u67e5\u770b tmp/new-car-intake-error.log \u5b9a\u4f4d\u5177\u4f53\u5931\u8d25\u6b65\u9aa4\u3002",
      result: { stdout, stderr, metadata: null }
    });
  } finally {
    args = previousArgs;
  }
}
if (require.main === module) {
  collectAutohomeImages(parseCliArgs()).then((result) => {
    process.stdout.write(JSON.stringify(result, null, 2) + "\n");
    if (!result.success) process.exitCode = 1;
  }).catch((e) => {
    console.error("[autohome-collector] " + (e.stack || e.message));
    process.exitCode = 1;
  });
}
module.exports = { collectAutohomeImages };