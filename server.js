const http = require("http");
const fs = require("fs");
const fsp = fs.promises;
const path = require("path");
const os = require("os");
const crypto = require("crypto");
const { execFile } = require("child_process");

const ROOT = __dirname;
const PORT = Number(process.env.MEDIA_PORT || process.env.PORT || 3001);
const HOST = "0.0.0.0";
const PASSWORD = process.env.ZHONGGU_MEDIA_PASSWORD || "zg2026";
const CONFIG_PATH = path.join(ROOT, "data", "media-config.json");
const LEADS_PATH = path.join(ROOT, "leads.json");
const TMP_DIR = path.join(ROOT, "tmp");
const MAX_UPLOAD_SIZE = 600 * 1024 * 1024;

const SLOT_MAP = {
  vehiclePreparation: { kind: "image", group: "strengthImages", dir: "uploads/company/vehicle-preparation", prefix: "vehicle-preparation" },
  preShipmentInspection: { kind: "image", group: "strengthImages", dir: "uploads/company/pre-shipment-inspection", prefix: "pre-shipment-inspection" },
  customerDelivery: { kind: "image", group: "strengthImages", dir: "uploads/company/customer-delivery", prefix: "customer-delivery" },
  exportLoading: { kind: "image", group: "strengthImages", dir: "uploads/company/export-loading", prefix: "export-loading" },
  preShipmentVehicleInspection: { kind: "video", group: "companyVideos", dir: "uploads/company/videos/pre-shipment-inspection", prefix: "pre-shipment-inspection" },
  internationalExportLoading: { kind: "video", group: "companyVideos", dir: "uploads/company/videos/export-loading", prefix: "export-loading" }
};

const MIME_TYPES = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "application/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
  ".webp": "image/webp",
  ".gif": "image/gif",
  ".svg": "image/svg+xml",
  ".mp4": "video/mp4",
  ".webm": "video/webm",
  ".mov": "video/quicktime",
  ".m4v": "video/mp4"
};

const noCacheHeaders = {
  "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate",
  "Pragma": "no-cache",
  "Expires": "0"
};

const createDefaultConfig = () => ({
  strengthImages: {
    vehiclePreparation: { title: "Vehicle Preparation", active: "", items: [] },
    preShipmentInspection: { title: "Pre-shipment Inspection", active: "", items: [] },
    customerDelivery: { title: "Customer Delivery", active: "", items: [] },
    exportLoading: { title: "Export Loading", active: "", items: [] }
  },
  companyVideos: {
    preShipmentVehicleInspection: {
      title: "Pre-shipment Vehicle Inspection",
      subtitle: "Inspection and preparation footage from the export yard.",
      active: "",
      poster: "",
      items: []
    },
    internationalExportLoading: {
      title: "International Export Loading Process",
      subtitle: "Loading and delivery footage from the export dock.",
      active: "",
      poster: "",
      items: []
    }
  }
});
const ensureDirs = async () => {
  await fsp.mkdir(path.dirname(CONFIG_PATH), { recursive: true });
  if (!(await fsp.access(CONFIG_PATH).then(() => true).catch(() => false))) {
    await writeConfig(createDefaultConfig());
  }
  if (!(await fsp.access(LEADS_PATH).then(() => true).catch(() => false))) {
    await fsp.writeFile(LEADS_PATH, "[]\n", "utf8");
  }
  await fsp.mkdir(TMP_DIR, { recursive: true });
  await Promise.all(Object.values(SLOT_MAP).map((slot) => fsp.mkdir(path.join(ROOT, slot.dir), { recursive: true })));
};

const readConfig = async () => {
  let raw = await fsp.readFile(CONFIG_PATH, "utf8");
  if (raw.charCodeAt(0) === 0xFEFF) raw = raw.slice(1);
  return JSON.parse(raw);
};
const writeConfig = async (config) => fsp.writeFile(CONFIG_PATH, `${JSON.stringify(config, null, 2)}\n`, "utf8");
const readLeads = async () => { try { return JSON.parse(await fsp.readFile(LEADS_PATH, "utf8")); } catch { return []; } };
const writeLeads = async (items) => fsp.writeFile(LEADS_PATH, `${JSON.stringify(items, null, 2)}\n`, "utf8");
const appendLead = async (lead) => { const items = await readLeads(); items.unshift(lead); await writeLeads(items.slice(0, 500)); return items[0]; };
const publicUrlFor = (absolutePath) => `/${path.relative(ROOT, absolutePath).replace(/\\/g, "/")}`;
const sendJson = (res, status, data) => {
  res.writeHead(status, { ...noCacheHeaders, "Content-Type": "application/json; charset=utf-8" });
  res.end(JSON.stringify(data));
};

const isAuthorized = (req, body = {}) => {
  const url = new URL(req.url, `http://${req.headers.host || "localhost"}`);
  const provided = req.headers["x-media-password"] || body.password || url.searchParams.get("password");
  return provided === PASSWORD;
};

const readBody = (req, limit = MAX_UPLOAD_SIZE) => new Promise((resolve, reject) => {
  const chunks = [];
  let total = 0;
  req.on("data", (chunk) => {
    total += chunk.length;
    if (total > limit) {
      reject(new Error("Upload is too large"));
      req.destroy();
      return;
    }
    chunks.push(chunk);
  });
  req.on("end", () => resolve(Buffer.concat(chunks)));
  req.on("error", reject);
});

const parseJsonBody = async (req) => {
  const body = await readBody(req, 2 * 1024 * 1024);
  if (!body.length) return {};
  return JSON.parse(body.toString("utf8"));
};

const parseDisposition = (value = "") => {
  const result = {};
  value.split(";").map((part) => part.trim()).forEach((part) => {
    const [key, ...rest] = part.split("=");
    if (!rest.length) return;
    result[key] = rest.join("=").replace(/^"|"$/g, "");
  });
  return result;
};

const parseMultipart = (buffer, contentType = "") => {
  const boundaryMatch = contentType.match(/boundary=(?:(?:")([^"]+)(?:")|([^;]+))/i);
  if (!boundaryMatch) throw new Error("Missing multipart boundary");
  const boundary = Buffer.from(`--${boundaryMatch[1] || boundaryMatch[2]}`);
  const fields = {};
  const files = {};
  let cursor = buffer.indexOf(boundary);

  while (cursor !== -1) {
    cursor += boundary.length;
    if (buffer[cursor] === 45 && buffer[cursor + 1] === 45) break;
    if (buffer[cursor] === 13 && buffer[cursor + 1] === 10) cursor += 2;

    const headerEnd = buffer.indexOf(Buffer.from("\r\n\r\n"), cursor);
    if (headerEnd === -1) break;
    const rawHeaders = buffer.slice(cursor, headerEnd).toString("utf8");
    const headers = Object.fromEntries(rawHeaders.split("\r\n").map((line) => {
      const index = line.indexOf(":");
      return index === -1 ? [line.toLowerCase(), ""] : [line.slice(0, index).toLowerCase(), line.slice(index + 1).trim()];
    }));

    const bodyStart = headerEnd + 4;
    const nextBoundary = buffer.indexOf(Buffer.from("\r\n--" + (boundaryMatch[1] || boundaryMatch[2])), bodyStart);
    if (nextBoundary === -1) break;
    const data = buffer.slice(bodyStart, nextBoundary);
    const disposition = parseDisposition(headers["content-disposition"]);
    if (disposition.filename) {
      files[disposition.name] = {
        fieldname: disposition.name,
        originalname: disposition.filename,
        mimetype: headers["content-type"] || "application/octet-stream",
        buffer: data
      };
    } else if (disposition.name) {
      fields[disposition.name] = data.toString("utf8");
    }
    cursor = buffer.indexOf(boundary, nextBoundary + 2);
  }

  return { fields, files };
};

const stamp = () => {
  const d = new Date();
  const pad = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}-${pad(d.getHours())}${pad(d.getMinutes())}${pad(d.getSeconds())}`;
};

const extFor = (file, slot) => {
  const original = path.extname(file.originalname || "").toLowerCase();
  if (slot.kind === "image") {
    if ([".jpg", ".jpeg", ".png", ".webp", ".gif"].includes(original)) return original === ".jpeg" ? ".jpg" : original;
    if ((file.mimetype || "").includes("png")) return ".png";
    if ((file.mimetype || "").includes("webp")) return ".webp";
    return ".jpg";
  }
  if ([".mp4", ".webm", ".mov", ".m4v"].includes(original)) return original;
  return ".mp4";
};

const uniqueName = (slot, ext) => `${slot.prefix}-${stamp()}-${crypto.randomBytes(2).toString("hex")}${ext}`;
const runFfmpeg = (args) => new Promise((resolve, reject) => {
  execFile("ffmpeg", args, { cwd: ROOT }, (error) => error ? reject(error) : resolve());
});

const maybeTranscodeVideo = async (sourcePath, finalPath, ext) => {
  if (ext === ".mp4") return finalPath;
  try {
    await runFfmpeg(["-y", "-i", sourcePath, "-c:v", "libx264", "-preset", "veryfast", "-crf", "23", "-pix_fmt", "yuv420p", "-c:a", "aac", "-b:a", "128k", "-movflags", "+faststart", finalPath]);
    await fsp.unlink(sourcePath).catch(() => {});
    return finalPath;
  } catch {
    const originalFinal = finalPath.replace(/\.mp4$/i, ext);
    await fsp.rename(sourcePath, originalFinal);
    return originalFinal;
  }
};

const generatePoster = async (videoPath) => {
  const posterPath = videoPath.replace(/\.[^.]+$/, "-poster.jpg");
  try {
    await runFfmpeg(["-y", "-ss", "00:00:02", "-i", videoPath, "-frames:v", "1", "-q:v", "2", posterPath]);
    return publicUrlFor(posterPath);
  } catch {
    return "";
  }
};

const normalizeItems = (entry) => {
  if (!Array.isArray(entry.items)) entry.items = [];
};

const handleUpload = async (req, res) => {
  const body = await readBody(req);
  const { fields, files } = parseMultipart(body, req.headers["content-type"] || "");
  if (!isAuthorized(req, fields)) return sendJson(res, 401, { success: false, error: "Invalid password" });

  const slotKey = fields.slot;
  const slot = SLOT_MAP[slotKey];
  if (!slot) throw new Error("Unknown slot");
  if (fields.type && fields.type !== slot.kind) throw new Error(`Slot ${slotKey} expects ${slot.kind}`);
  const file = files.file;
  if (!file || !file.buffer?.length) throw new Error("Missing file");

  const ext = extFor(file, slot);
  const targetDir = path.join(ROOT, slot.dir);
  await fsp.mkdir(targetDir, { recursive: true });
  const finalExt = slot.kind === "video" && ext !== ".webm" ? ".mp4" : ext;
  let finalPath = path.join(targetDir, uniqueName(slot, finalExt));
  const tmpPath = path.join(TMP_DIR, `${crypto.randomBytes(8).toString("hex")}${ext}`);
  await fsp.writeFile(tmpPath, file.buffer);

  let url;
  let poster = "";
  if (slot.kind === "video") {
    if (ext === ".mp4") {
      await fsp.rename(tmpPath, finalPath);
    } else {
      finalPath = await maybeTranscodeVideo(tmpPath, finalPath, ext);
    }
    url = publicUrlFor(finalPath);
    poster = await generatePoster(finalPath);
  } else {
    await fsp.rename(tmpPath, finalPath);
    url = publicUrlFor(finalPath);
  }

  const config = await readConfig();
  const entry = config[slot.group][slotKey];
  normalizeItems(entry);
  if (slot.kind === "video") {
    const item = { url, poster };
    entry.items = entry.items.filter((existing) => (typeof existing === "string" ? existing : existing.url) !== url);
    entry.items.unshift(item);
    entry.active = url;
    if (poster) entry.poster = poster;
  } else {
    entry.items = entry.items.filter((existing) => existing !== url);
    entry.items.unshift(url);
    entry.active = url;
  }
  await writeConfig(config);
  sendJson(res, 200, { success: true, url, poster, config });
};

const handleSetActive = async (req, res) => {
  const body = await parseJsonBody(req);
  if (!isAuthorized(req, body)) return sendJson(res, 401, { success: false, error: "Invalid password" });
  const { slot: slotKey, url, poster } = body;
  const slot = SLOT_MAP[slotKey];
  if (!slot) throw new Error("Unknown slot");
  if (!url) throw new Error("Missing url");

  const config = await readConfig();
  const entry = config[slot.group][slotKey];
  normalizeItems(entry);
  entry.active = url;
  if (slot.kind === "video") {
    if (poster !== undefined) entry.poster = poster;
    const exists = entry.items.some((item) => (typeof item === "string" ? item : item.url) === url);
    if (!exists) entry.items.unshift({ url, poster: poster || "" });
  } else if (!entry.items.includes(url)) {
    entry.items.unshift(url);
  }
  await writeConfig(config);
  sendJson(res, 200, { success: true, config });
};

const serveStatic = async (req, res) => {
  const requestUrl = new URL(req.url, `http://${req.headers.host || "localhost"}`);
  const pathname = decodeURIComponent(requestUrl.pathname === "/" ? "/index.html" : requestUrl.pathname);
  const absolute = path.resolve(ROOT, `.${pathname}`);
  if (!absolute.startsWith(ROOT)) {
    res.writeHead(403, noCacheHeaders);
    res.end("Forbidden");
    return;
  }
  try {
    let filePath = absolute;
    let stat = await fsp.stat(filePath).catch(() => null);
    if ((!stat || !stat.isFile()) && !path.extname(filePath)) {
      const htmlFallback = `${filePath}.html`;
      const htmlStat = await fsp.stat(htmlFallback).catch(() => null);
      if (htmlStat?.isFile()) {
        filePath = htmlFallback;
        stat = htmlStat;
      }
    }
    if (!stat || !stat.isFile()) throw new Error("Not a file");
    const ext = path.extname(filePath).toLowerCase();
    res.writeHead(200, { ...noCacheHeaders, "Content-Type": MIME_TYPES[ext] || "application/octet-stream" });
    fs.createReadStream(filePath).pipe(res);
  } catch {
    res.writeHead(404, { ...noCacheHeaders, "Content-Type": "text/plain; charset=utf-8" });
    res.end("Not found");
  }
};

const server = http.createServer(async (req, res) => {
  try {
    const requestUrl = new URL(req.url, `http://${req.headers.host || "localhost"}`);
    if (req.method === "GET" && requestUrl.pathname === "/api/health") {
      return sendJson(res, 200, { success: true, message: "Media server is running" });
    }
    if (req.method === "POST" && requestUrl.pathname === "/api/media-login") {
      const body = await parseJsonBody(req);
      if (body.password === PASSWORD) return sendJson(res, 200, { success: true });
      return sendJson(res, 401, { success: false, message: "Invalid password" });
    }
    if (req.method === "GET" && requestUrl.pathname === "/api/media-config") {
      if (!isAuthorized(req)) return sendJson(res, 401, { success: false, error: "Invalid password" });
      return sendJson(res, 200, { success: true, config: await readConfig() });
    }
    if (req.method === "POST" && requestUrl.pathname === "/api/upload-media") return await handleUpload(req, res);
    if (req.method === "POST" && requestUrl.pathname === "/api/leads") {
      const body = await parseJsonBody(req);
      const lead = await appendLead(body);
      return sendJson(res, 200, { success: true, lead });
    }
    if (req.method === "POST" && requestUrl.pathname === "/api/set-active-media") return await handleSetActive(req, res);
    if (req.method === "GET" || req.method === "HEAD") return await serveStatic(req, res);
    sendJson(res, 405, { success: false, error: "Method not allowed" });
  } catch (error) {
    sendJson(res, 400, { success: false, error: error.message });
  }
});

ensureDirs().then(() => {
  server.listen(PORT, HOST, () => {
    const addresses = Object.values(os.networkInterfaces()).flat()
      .filter((item) => item && item.family === "IPv4" && !item.internal)
      .map((item) => item.address);
    console.log("");
    console.log("Media upload server started:");
    console.log(`Local:   http://127.0.0.1:${PORT}/admin/media.html`);
    addresses.forEach((address) => console.log(`Network: http://${address}:${PORT}/admin/media.html`));
    console.log(`Health:  http://127.0.0.1:${PORT}/api/health`);
    console.log("");
  });
}).catch((error) => {
  console.error(error);
  process.exit(1);
});
