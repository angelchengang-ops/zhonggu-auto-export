const http = require("http");
const fs = require("fs");
const fsp = fs.promises;
const path = require("path");
const os = require("os");
const crypto = require("crypto");
const { execFile } = require("child_process");
let collectAutohomeImages;
let collectorModuleLoadError = "";
try {
  ({ collectAutohomeImages } = require("./scripts/collect-autohome-images.js"));
} catch (error) {
  collectorModuleLoadError = error.stack || error.message || String(error);
}

const ROOT = __dirname;
const PORT = Number(process.env.MEDIA_PORT || process.env.PORT || 3001);
const HOST = "0.0.0.0";
const PASSWORD = process.env.ZHONGGU_MEDIA_PASSWORD || "";
const CONFIG_PATH = path.join(ROOT, "data", "media-config.json");
const LEADS_PATH = path.join(ROOT, "leads.json");
const INQUIRIES_PATH = path.join(ROOT, "data", "inquiries.json");
const ADMIN_USERS_PATH = path.join(ROOT, "data", "admin-users.json");
const WHATSAPP_CLICKS_PATH = path.join(ROOT, "data", "whatsapp-clicks.json");
const WHATSAPP_SETTINGS_PATH = path.join(ROOT, "data", "whatsapp-settings.json");
const MANUAL_IMAGE_MAP_PATH = path.join(ROOT, "data", "manual-image-map.json");
const USED_CARS_PATH = path.join(ROOT, "data", "used-cars.json");
const CARS_PATH = path.join(ROOT, "cars.json");
const GROUPED_CARS_PATH = path.join(ROOT, "grouped-cars.json");
const RAW_CARS_PATH = path.join(ROOT, "data", "cars.raw.json");
const IMAGE_FALLBACK = "images/hero/hero-car.jpg";
const IMAGE_TRASH_DIR = "media-trash/images";
const NEW_CAR_IMAGE_DIR = "images/new-cars";
const TMP_DIR = path.join(ROOT, "tmp");
const WHATSAPP_LEAD_SUBMIT_LOG = path.join(TMP_DIR, "whatsapp-lead-submit.log");
const MAX_UPLOAD_SIZE = 600 * 1024 * 1024;
const SERVICE_STARTED_AT = new Date();
const PACKAGE_VERSION = (() => { try { return require("./package.json").version || "unknown"; } catch { return "unknown"; } })();
const hashPassword = (password, salt = crypto.randomBytes(16).toString("hex")) => {
  const cleanPassword = String(password || "");
  const cleanSalt = String(salt || "");
  const digest = crypto.createHash("sha256").update(cleanSalt + ":" + cleanPassword).digest("hex");
  return "sha256$" + cleanSalt + "$" + digest;
};
const verifyPasswordHash = (password, storedHash = "") => {
  const parts = String(storedHash || "").split("$");
  if (parts.length !== 3 || parts[0] !== "sha256" || !parts[1] || !parts[2]) return false;
  const expected = hashPassword(password, parts[1]);
  const left = Buffer.from(expected);
  const right = Buffer.from(storedHash);
  return left.length === right.length && crypto.timingSafeEqual(left, right);
};
const disabledPasswordValue = (value = "") => !String(value || "").trim() || /^(disabled|not-for-production|set-env|placeholder|change-me|__)/i.test(String(value || "").trim());
const envCredentialsForUser = (user = {}) => {
  const key = String(user.id || user.username || "").toLowerCase();
  if (key === "admin_chen" || key === "admin") return { password: process.env.ZHONGGU_ADMIN_PASSWORD || "", passwordHash: process.env.ZHONGGU_ADMIN_PASSWORD_HASH || "" };
  if (key === "sales_zheng" || key === "zheng") return { password: process.env.ZHONGGU_SALES_ZHENG_PASSWORD || "", passwordHash: process.env.ZHONGGU_SALES_ZHENG_PASSWORD_HASH || "" };
  return { password: "", passwordHash: "" };
};
const verifyAdminPassword = (user = {}, password = "") => {
  if (!password) return false;
  if (user.passwordHash && verifyPasswordHash(password, user.passwordHash)) return true;
  if (user.password && !disabledPasswordValue(user.password) && process.env.ZHONGGU_ALLOW_PLAIN_ADMIN_PASSWORDS === "true") return user.password === password;
  return false;
};


const SESSION_COOKIE = "zg_admin_session";
const sessions = new Map();
const whatsappLeadRateLimit = new Map();

const ADMIN_PAGES = [
  "/admin/",
  "/admin/index.html",
  "/admin/login.html",
  "/admin/inquiries.html",
  "/admin/sales-users.html",
  "/admin/employees.html",
  "/admin/whatsapp-settings.html",
  "/admin/new-car-intake.html",
  "/admin/image-mapping.html",
  "/admin/used-car-media.html",
  "/admin/media.html",
  "/admin/media-management.html"
];
const ADMIN_APIS = [
  "/api/inquiries",
  "/api/leads",
  "/api/whatsapp-clicks",
  "/api/admin/login",
  "/api/admin/logout",
  "/api/admin/me",
  "/api/admin/inquiries",
  "/api/admin/inquiries/:id",
  "/api/admin/inquiries/:id/assign",
  "/api/admin/inquiries/:id/status",
  "/api/admin/inquiries/:id/note",
  "/api/admin/inquiries/export.csv",
  "/api/admin/inquiry-stats",
  "/api/admin/whatsapp-clicks",
  "/api/admin/whatsapp-settings",
  "/api/public/whatsapp-config",
  "/api/public/whatsapp-link",
  "/api/public/whatsapp-lead",
  "/api/public/whatsapp-lead/status",
  "/api/admin/sales-users",
  "/api/admin/sales-users/:id",
  "/api/admin/employees",
  "/api/admin/users",
  "/api/admin/image-mapping",
  "/api/admin/image-mapping/delete",
  "/api/admin/media",
  "/api/admin/regenerate-vehicle-pages",
  "/api/admin/available-images",
  "/api/admin/used-cars",
  "/api/admin/used-car-media-library",
  "/api/admin/used-cars/:slug/media",
  "/api/admin/used-cars/:slug/cover",
  "/api/admin/used-cars/:slug/media/remove",
  "/api/admin/image-library/move-to-trash",
  "/api/admin/image-library/restore",
  "/api/admin/image-library/delete",
  "/api/admin/image-library/usage",
  "/api/admin/collect-autohome-images",
  "/api/admin/new-car-intake/collector-status",
  "/api/admin/new-car-intake/recognize",
  "/api/admin/new-car-intake/image-selection",
  "/api/admin/new-car-intake/process-image",
  "/api/admin/new-car-intake/draft",
  "/api/admin/new-car-intake/load-draft"
];
const ADMIN_PAGE_ALIASES = new Map([
  ["/admin/employees.html", "/admin/sales-users.html"],
  ["/admin/media-management.html", "/admin/media.html"]
]);
const ADMIN_ONLY_PAGE_PATHS = new Set([
  "/admin/sales-users.html",
  "/admin/employees.html",
  "/admin/whatsapp-settings.html",
  "/admin/new-car-intake.html",
  "/admin/image-mapping.html",
  "/admin/used-car-media.html",
  "/admin/media.html",
  "/admin/media-management.html"
]);
const ADMIN_ONLY_API_PATHS = [
  "/api/admin/whatsapp-settings",
  "/api/admin/whatsapp-clicks",
  "/api/admin/sales-users",
  "/api/admin/employees",
  "/api/admin/users",
  "/api/admin/new-car-intake",
  "/api/admin/image-mapping",
  "/api/admin/available-images",
  "/api/admin/regenerate-vehicle-pages",
  "/api/admin/collect-autohome-images",
  "/api/admin/image-library",
  "/api/admin/used-cars",
  "/api/admin/used-car-media-library",
  "/api/admin/media",
  "/api/admin/routes"
];
const ADMIN_ONLY_API_EXACT_PATHS = new Set([
  "/api/admin/inquiries/export.csv"
]);
const serviceHealthPayload = () => ({ success: true, service: "zhongguautoexport-website", message: "Media server is running", status: "ok", port: PORT, startedAt: SERVICE_STARTED_AT.toISOString(), version: PACKAGE_VERSION, pid: process.pid });

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

const DEFAULT_ADMIN_USERS = [
  {
    id: "admin_chen",
    name: "Chen Gang",
    role: "admin",
    username: "admin",
    passwordHash: process.env.ZHONGGU_ADMIN_PASSWORD_HASH || "",
    whatsapp: "+86 18661888866",
    markets: ["All"],
    active: true
  },
  {
    id: "sales_zheng",
    name: "郑国志",
    role: "sales",
    username: "zheng",
    passwordHash: process.env.ZHONGGU_SALES_ZHENG_PASSWORD_HASH || "",
    whatsapp: "",
    markets: ["Used Cars", "Africa"],
    active: true
  }
];

const MARKETS = ["Algeria", "West Africa", "Central Asia", "Southeast Asia", "Middle East", "South America", "Russia/CIS", "Used Cars", "Other"];
const VALID_STATUSES = ["whatsapp_lead", "new", "assigned", "contacted", "quoted", "waiting", "won", "lost", "closed"];
const DEFAULT_WHATSAPP_MESSAGE_TEMPLATES = [
  {
    id: "vehicle_inquiry",
    name: "车型询价",
    customerTextEn: "Hello, I am interested in {vehicle}. Could you please send me the FOB price, available stock, photos and shipping options?",
    salesNoteZh: "【官网车型询盘】客户对 {vehicle} 感兴趣。来源：{source}，页面：{page}，市场：{market}。请优先确认车型、数量、目的港和 FOB/CIF 需求。"
  },
  {
    id: "used_car_inquiry",
    name: "二手车询价",
    customerTextEn: "Hello, I am interested in this used car from Zhonggu Auto Export. Please send me the vehicle condition, mileage, photos, FOB price and shipping cost.",
    salesNoteZh: "【二手车询盘】客户咨询二手车。来源：{source}，页面：{page}，市场：{market}。请优先确认车况、里程、价格、库存、目的港和付款方式。"
  },
  {
    id: "bulk_purchase",
    name: "批量采购",
    customerTextEn: "Hello, I am looking for bulk vehicle supply from China. Please send me available models, MOQ, FOB prices and export documents support.",
    salesNoteZh: "【批量采购线索】客户可能有批量采购需求。来源：{source}，页面：{page}，市场：{market}。请优先确认采购数量、预算、目标车型、港口和付款方式。"
  },
  {
    id: "price_check",
    name: "价格咨询",
    customerTextEn: "Hello, I would like to check the latest export price for {vehicle}. Please send me the FOB price and CIF quotation if available.",
    salesNoteZh: "【价格咨询】客户想确认 {vehicle} 最新出口价格。来源：{source}，页面：{page}，市场：{market}。请优先确认 FOB/CIF、目的港和报价有效期。"
  },
  {
    id: "general_inquiry",
    name: "通用咨询",
    customerTextEn: "Hello, I am interested in vehicles from Zhonggu Auto Export. Please contact me with more details.",
    salesNoteZh: "【官网通用咨询】客户来自官网 WhatsApp。来源：{source}，页面：{page}，市场：{market}。请尽快询问客户需求车型、数量、预算和目的港。"
  }
];
const DEFAULT_WHATSAPP_SETTINGS = {
  activeMode: "default",
  defaultWhatsapp: {
    id: "default",
    name: "Default WhatsApp",
    displayName: "Zhonggu Auto Export",
    rawNumber: "+86 18661888866",
    waNumber: "8618661888866",
    active: true
  },
  salesNumbers: [
    { id: "chen_gang", name: "Chen Gang", displayName: "Chen Gang", role: "Sales Manager", rawNumber: "+86 18661888866", waNumber: "8618661888866", active: true, markets: ["All"], vehicleTypes: ["All"] },
    { id: "zheng_guozhi", name: "郑国志", displayName: "Zheng Guozhi", role: "Sales Manager", rawNumber: "", waNumber: "", active: true, markets: ["Used Cars", "Africa"], vehicleTypes: ["Used Cars"] }
  ],
  messageTemplate: {
    enabled: true,
    activeTemplateId: "vehicle_inquiry",
    templates: DEFAULT_WHATSAPP_MESSAGE_TEMPLATES,
    includeSource: true,
    includePage: true,
    includeVehicle: true,
    includeMarket: true
  },
  updatedAt: "",
  updatedBy: ""
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
  await fsp.mkdir(path.dirname(INQUIRIES_PATH), { recursive: true });
  if (!(await fsp.access(INQUIRIES_PATH).then(() => true).catch(() => false))) {
    await fsp.writeFile(INQUIRIES_PATH, "[]\n", "utf8");
  }
  await fsp.mkdir(path.dirname(ADMIN_USERS_PATH), { recursive: true });
  if (!(await fsp.access(ADMIN_USERS_PATH).then(() => true).catch(() => false))) {
    await fsp.writeFile(ADMIN_USERS_PATH, `${JSON.stringify(DEFAULT_ADMIN_USERS, null, 2)}\n`, "utf8");
  }
  await fsp.mkdir(path.dirname(WHATSAPP_CLICKS_PATH), { recursive: true });
  if (!(await fsp.access(WHATSAPP_CLICKS_PATH).then(() => true).catch(() => false))) {
    await fsp.writeFile(WHATSAPP_CLICKS_PATH, "[]\n", "utf8");
  }
  if (!(await fsp.access(WHATSAPP_SETTINGS_PATH).then(() => true).catch(() => false))) {
    await writeWhatsappSettings(DEFAULT_WHATSAPP_SETTINGS);
  }
  await fsp.mkdir(path.dirname(MANUAL_IMAGE_MAP_PATH), { recursive: true });
  if (!(await fsp.access(MANUAL_IMAGE_MAP_PATH).then(() => true).catch(() => false))) {
    await fsp.writeFile(MANUAL_IMAGE_MAP_PATH, "{}\n", "utf8");
  }
  await fsp.mkdir(TMP_DIR, { recursive: true });
  await fsp.mkdir(path.join(ROOT, IMAGE_TRASH_DIR), { recursive: true });
  await Promise.all(Object.values(SLOT_MAP).map((slot) => fsp.mkdir(path.join(ROOT, slot.dir), { recursive: true })));
};

const readConfig = async () => {
  let raw = await fsp.readFile(CONFIG_PATH, "utf8");
  if (raw.charCodeAt(0) === 0xFEFF) raw = raw.slice(1);
  return JSON.parse(raw);
};
const writeConfig = async (config) => fsp.writeFile(CONFIG_PATH, `${JSON.stringify(config, null, 2)}\n`, "utf8");
const readJsonArray = async (filePath) => {
  try {
    let raw = await fsp.readFile(filePath, "utf8");
    if (raw.charCodeAt(0) === 0xFEFF) raw = raw.slice(1);
    const data = JSON.parse(raw || "[]");
    return Array.isArray(data) ? data : [];
  } catch {
    return [];
  }
};
const writeJsonArray = async (filePath, items) => {
  await fsp.mkdir(path.dirname(filePath), { recursive: true });
  const tempPath = path.join(path.dirname(filePath), `.${path.basename(filePath)}.${process.pid}.${Date.now()}.tmp`);
  await fsp.writeFile(tempPath, `${JSON.stringify(items, null, 2)}\n`, "utf8");
  await fsp.rename(tempPath, filePath);
};
const readLeads = async () => readJsonArray(LEADS_PATH);
const writeLeads = async (items) => writeJsonArray(LEADS_PATH, items);
const appendLead = async (lead) => { const items = await readLeads(); items.unshift(lead); await writeLeads(items.slice(0, 500)); return items[0]; };
const writeInquiries = async (items) => writeJsonArray(INQUIRIES_PATH, items);
const readAdminUsers = async () => {
  const users = await readJsonArray(ADMIN_USERS_PATH);
  return (users.length ? users : DEFAULT_ADMIN_USERS).map(normalizeAdminUser);
};
const normalizeAdminUser = (user = {}) => ({
  ...user,
  id: firstValue(user.id, user.username, user.user, user.account),
  name: firstValue(user.name, user.displayName, user.username, user.user, user.account),
  role: firstValue(user.role) || "sales",
  username: firstValue(user.username, user.user, user.account),
  password: firstValue(user.password, user.pass),
  passwordHash: firstValue(envCredentialsForUser({ id: firstValue(user.id, user.username, user.user, user.account), username: firstValue(user.username, user.user, user.account) }).passwordHash, user.passwordHash, user.password_hash) || (envCredentialsForUser({ id: firstValue(user.id, user.username, user.user, user.account), username: firstValue(user.username, user.user, user.account) }).password ? hashPassword(envCredentialsForUser({ id: firstValue(user.id, user.username, user.user, user.account), username: firstValue(user.username, user.user, user.account) }).password) : ""),
  active: user.active !== false && user.isActive !== false
});
const publicUser = (user = {}) => user ? {
  id: user.id,
  name: user.name,
  role: user.role,
  username: user.username,
  whatsapp: user.whatsapp || "",
  markets: Array.isArray(user.markets) ? user.markets : [],
  active: user.active !== false
} : null;
const isAdmin = (user = {}) => user?.role === "admin";
const isSales = (user = {}) => user?.role === "sales";
const firstValue = (...values) => values.map((value) => String(value ?? "").trim()).find(Boolean) || "";
const cloneJson = (value) => JSON.parse(JSON.stringify(value));
const WHATSAPP_MODES = new Set(["default", "by_vehicle_type", "by_market", "by_sales"]);
const whatsappFormatError = () => { const error = new Error("WhatsApp number format is invalid."); error.status = 400; return error; };
const formatWhatsappRawNumber = (waNumber) => {
  const digits = String(waNumber || "").replace(/\D/g, "");
  if (digits.startsWith("44") && digits.length === 12) return `+44 ${digits.slice(2, 6)} ${digits.slice(6)}`;
  return digits ? `+${digits}` : "";
};
const normalizeWhatsappNumber = (input, options = {}) => {
  const required = options.required !== false;
  const raw = firstValue(input);
  if (!raw) {
    if (required) throw whatsappFormatError();
    return { rawNumber: "", waNumber: "" };
  }
  let normalizedInput = raw.replace(/^00/, "");
  const waNumber = normalizedInput.replace(/\D/g, "");
  if (!/^\d+$/.test(waNumber) || waNumber.length < 8 || waNumber.length > 15) throw whatsappFormatError();
  return { rawNumber: formatWhatsappRawNumber(waNumber), waNumber };
};
const normalizeWhatsappList = (value) => Array.isArray(value) ? [...new Set(value.map(firstValue).filter(Boolean))] : firstValue(value).split(",").map(firstValue).filter(Boolean);
const normalizeWhatsappId = (value, fallback) => firstValue(value, fallback).toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_+|_+$/g, "") || fallback;
const normalizeTemplateId = (value, fallback = "general_inquiry") => firstValue(value, fallback).toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_+|_+$/g, "") || fallback;
const cloneWhatsappTemplates = () => cloneJson(DEFAULT_WHATSAPP_MESSAGE_TEMPLATES);
const sanitizeWhatsappTemplate = (template = {}, fallback = {}) => ({
  id: normalizeTemplateId(template.id, fallback.id || "general_inquiry"),
  name: firstValue(template.name, fallback.name, template.id, fallback.id, "消息模板"),
  customerTextEn: firstValue(template.customerTextEn, template.defaultText, template.text, fallback.customerTextEn),
  salesNoteZh: firstValue(template.salesNoteZh, template.salesNote, fallback.salesNoteZh)
});
const normalizeWhatsappMessageTemplate = (input = {}) => {
  const oldDefaultText = firstValue(input.defaultText);
  const defaults = cloneWhatsappTemplates();
  const byId = new Map(defaults.map((item) => [item.id, item]));
  if (oldDefaultText && byId.has("general_inquiry")) {
    byId.set("general_inquiry", { ...byId.get("general_inquiry"), customerTextEn: oldDefaultText });
  }
  const incoming = Array.isArray(input.templates) ? input.templates : [];
  incoming.forEach((template, index) => {
    const fallback = byId.get(firstValue(template.id)) || defaults[index] || byId.get("general_inquiry") || {};
    const clean = sanitizeWhatsappTemplate(template, fallback);
    byId.set(clean.id, clean);
  });
  const templates = defaults.map((item) => sanitizeWhatsappTemplate(byId.get(item.id) || item, item));
  byId.forEach((item, id) => {
    if (!templates.some((template) => template.id === id)) templates.push(sanitizeWhatsappTemplate(item));
  });
  const requestedActive = normalizeTemplateId(input.activeTemplateId || input.templateId, oldDefaultText ? "general_inquiry" : "vehicle_inquiry");
  const activeTemplateId = templates.some((item) => item.id === requestedActive) ? requestedActive : (oldDefaultText ? "general_inquiry" : "vehicle_inquiry");
  return {
    enabled: input.enabled !== false,
    activeTemplateId,
    templates,
    includeSource: input.includeSource !== false,
    includePage: input.includePage !== false,
    includeVehicle: input.includeVehicle !== false,
    includeMarket: input.includeMarket !== false
  };
};
const sanitizeSalesWhatsapp = (item = {}, index = 0) => {
  const rawInput = firstValue(item.rawNumber, item.waNumber, item.whatsapp);
  const normalized = normalizeWhatsappNumber(rawInput, { required: false });
  const name = firstValue(item.name, item.displayName, `Sales ${index + 1}`);
  return {
    id: normalizeWhatsappId(item.id, name || `sales_${index + 1}`),
    name,
    displayName: firstValue(item.displayName, item.name, name),
    role: firstValue(item.role, "Sales"),
    rawNumber: normalized.rawNumber,
    waNumber: normalized.waNumber,
    active: item.active !== false,
    markets: normalizeWhatsappList(item.markets),
    vehicleTypes: normalizeWhatsappList(item.vehicleTypes)
  };
};
const salesNumbersFromAdminUsers = (users = []) => users.map((user, index) => sanitizeSalesWhatsapp({
  id: user.id,
  name: user.name,
  displayName: user.name,
  role: user.role,
  rawNumber: user.whatsapp,
  active: user.active,
  markets: user.markets,
  vehicleTypes: ["All"]
}, index));
const normalizeWhatsappSettings = (input = {}, options = {}) => {
  const source = { ...cloneJson(DEFAULT_WHATSAPP_SETTINGS), ...(input || {}) };
  const defaultInput = { ...DEFAULT_WHATSAPP_SETTINGS.defaultWhatsapp, ...(input.defaultWhatsapp || {}) };
  const defaultNumber = normalizeWhatsappNumber(firstValue(defaultInput.rawNumber, defaultInput.waNumber), { required: true });
  const salesSource = Array.isArray(input.salesNumbers) ? input.salesNumbers : DEFAULT_WHATSAPP_SETTINGS.salesNumbers;
  return {
    activeMode: WHATSAPP_MODES.has(firstValue(source.activeMode)) ? firstValue(source.activeMode) : "default",
    defaultWhatsapp: {
      id: "default",
      name: firstValue(defaultInput.name, "Default WhatsApp"),
      displayName: firstValue(defaultInput.displayName, "Zhonggu Auto Export"),
      rawNumber: defaultNumber.rawNumber,
      waNumber: defaultNumber.waNumber,
      active: defaultInput.active !== false
    },
    salesNumbers: salesSource.map(sanitizeSalesWhatsapp),
    messageTemplate: normalizeWhatsappMessageTemplate(input.messageTemplate || DEFAULT_WHATSAPP_SETTINGS.messageTemplate),
    updatedAt: firstValue(options.updatedAt, input.updatedAt),
    updatedBy: firstValue(options.updatedBy, input.updatedBy)
  };
};
const readJsonObject = async (filePath) => {
  let raw = await fsp.readFile(filePath, "utf8");
  if (raw.charCodeAt(0) === 0xFEFF) raw = raw.slice(1);
  return JSON.parse(raw || "{}");
};
const writeJsonObjectAtomic = async (filePath, value) => {
  await fsp.mkdir(path.dirname(filePath), { recursive: true });
  const tempPath = path.join(path.dirname(filePath), `.${path.basename(filePath)}.${process.pid}.${Date.now()}.tmp`);
  await fsp.writeFile(tempPath, `${JSON.stringify(value, null, 2)}\n`, "utf8");
  await fsp.rename(tempPath, filePath);
};
const writeWhatsappSettings = async (settings) => writeJsonObjectAtomic(WHATSAPP_SETTINGS_PATH, normalizeWhatsappSettings(settings));
const readWhatsappSettings = async () => {
  try {
    const data = await readJsonObject(WHATSAPP_SETTINGS_PATH);
    const settings = normalizeWhatsappSettings(data);
    if (!Array.isArray(data.salesNumbers) || !data.salesNumbers.length) {
      const users = await readAdminUsers().catch(() => []);
      if (users.length) settings.salesNumbers = salesNumbersFromAdminUsers(users);
    }
    return settings;
  } catch (error) {
    const fallback = normalizeWhatsappSettings(DEFAULT_WHATSAPP_SETTINGS);
    if (error && error.code === "ENOENT") {
      await writeWhatsappSettings(fallback).catch(() => {});
    }
    return fallback;
  }
};
const publicWhatsappSettings = (settings) => ({
  success: true,
  activeMode: settings.activeMode,
  defaultWhatsapp: {
    displayName: settings.defaultWhatsapp.displayName,
    waNumber: settings.defaultWhatsapp.waNumber
  },
  messageTemplate: settings.messageTemplate
});
const selectWhatsappRecipient = (settings, params = {}) => {
  const salesId = firstValue(params.salesId, params.sales_id);
  const sales = salesId ? settings.salesNumbers.find((item) => item.id === salesId && item.active !== false && item.waNumber) : null;
  const recipient = sales || (settings.defaultWhatsapp.active !== false && settings.defaultWhatsapp.waNumber ? settings.defaultWhatsapp : DEFAULT_WHATSAPP_SETTINGS.defaultWhatsapp);
  return { recipient, salesId: sales?.id || "default" };
};
const whatsappTemplateVariables = (params = {}, templateConfig = {}, recipient = {}) => ({
  vehicle: templateConfig.includeVehicle === false ? "vehicles from Zhonggu Auto Export" : firstValue(params.vehicle, params.model, params.car, "vehicles from Zhonggu Auto Export"),
  source: templateConfig.includeSource === false ? "website" : firstValue(params.source, params.utm_source, "website"),
  page: templateConfig.includePage === false ? "current page" : firstValue(params.page, params.pageUrl, params.page_url, "current page"),
  market: templateConfig.includeMarket === false ? "unknown market" : firstValue(params.market, params.country, "unknown market"),
  type: firstValue(params.type, params.vehicleType, "vehicle inquiry"),
  salesName: firstValue(recipient.displayName, recipient.name, "Zhonggu Auto Export")
});
const fillWhatsappTemplate = (text, variables = {}) => firstValue(text).replace(/\{(vehicle|source|page|market|type|salesName)\}/g, (_match, key) => firstValue(variables[key]));
const findWhatsappTemplate = (templateConfig = {}, templateId = "") => {
  const templates = Array.isArray(templateConfig.templates) && templateConfig.templates.length ? templateConfig.templates : cloneWhatsappTemplates();
  const requested = normalizeTemplateId(templateId, normalizeTemplateId(templateConfig.activeTemplateId, "vehicle_inquiry"));
  return templates.find((item) => item.id === requested) || templates.find((item) => item.id === "general_inquiry") || cloneWhatsappTemplates().find((item) => item.id === "general_inquiry") || templates[0];
};
const buildWhatsappMessageFromParams = (params = {}, templateConfig = DEFAULT_WHATSAPP_SETTINGS.messageTemplate, recipient = {}) => {
  const normalizedTemplate = normalizeWhatsappMessageTemplate(templateConfig);
  const selectedTemplate = findWhatsappTemplate(normalizedTemplate, firstValue(params.templateId, params.template_id, normalizedTemplate.activeTemplateId));
  const variables = whatsappTemplateVariables(params, normalizedTemplate, recipient);
  const customerText = fillWhatsappTemplate(selectedTemplate.customerTextEn, variables);
  const salesNote = fillWhatsappTemplate(selectedTemplate.salesNoteZh, variables);
  if (normalizedTemplate.enabled === false || !salesNote) return customerText;
  return `${customerText}\n\n---\nSales note:\n${salesNote}`;
};
const queryParamsObject = (searchParams) => Object.fromEntries([...searchParams.entries()].map(([key, value]) => [key, firstValue(value)]));
const buildWhatsappLinkPayload = (settings, params = {}) => {
  const { recipient, salesId } = selectWhatsappRecipient(settings, params);
  const templateConfig = normalizeWhatsappMessageTemplate(settings.messageTemplate);
  const selectedTemplate = findWhatsappTemplate(templateConfig, firstValue(params.templateId, params.template_id, templateConfig.activeTemplateId));
  const message = buildWhatsappMessageFromParams(params, templateConfig, recipient);
  const waNumber = firstValue(recipient.waNumber, DEFAULT_WHATSAPP_SETTINGS.defaultWhatsapp.waNumber);
  return {
    success: true,
    waNumber,
    salesId,
    templateId: selectedTemplate.id,
    displayName: firstValue(recipient.displayName, recipient.name, "Zhonggu Auto Export"),
    url: `https://wa.me/${waNumber}?text=${encodeURIComponent(message)}`,
    message
  };
};
const normalizeMarkets = (value) => {
  const input = Array.isArray(value) ? value : String(value ?? "").split(",");
  return [...new Set(input.map(firstValue).filter(Boolean))];
};
const requireAdminRole = (user) => {
  if (user.role !== "admin") { const error = new Error("Only admin can manage sales users"); error.status = 403; throw error; }
};
const generateAdminUserId = (username) => "user_" + firstValue(username).toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_+|_+$/g, "") + "_" + crypto.randomBytes(2).toString("hex");
const generateInquiryId = () => "INQ-" + Date.now() + "-" + crypto.randomBytes(3).toString("hex").toUpperCase();
const generateWhatsappClickId = () => "WA-" + Date.now() + "-" + crypto.randomBytes(3).toString("hex").toUpperCase();
const generateWhatsappLeadId = () => "WALEAD-" + Date.now() + "-" + crypto.randomBytes(3).toString("hex").toUpperCase();
const normalizeCountry = (value = "") => firstValue(value).toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
const inferMarket = ({ country = "", interestedModel = "", source = "", pageUrl = "" } = {}) => {
  const c = normalizeCountry(country);
  const text = `${interestedModel} ${source} ${pageUrl}`.toLowerCase();
  if (text.includes("used car") || text.includes("used-cars") || text.includes("used_car")) return "Used Cars";
  if (text.includes("algeria")) return "Algeria";
  if (text.includes("west-africa")) return "West Africa";
  if (text.includes("central-asia") || text.includes("kazakhstan") || text.includes("uzbekistan") || text.includes("kyrgyzstan") || text.includes("tajikistan") || text.includes("turkmenistan")) return "Central Asia";
  if (c === "algeria") return "Algeria";
  if (["burkina faso", "benin", "togo", "ghana", "nigeria", "cote d'ivoire", "cote divoire", "côte d'ivoire", "senegal"].includes(c)) return "West Africa";
  if (["kazakhstan", "kyrgyzstan", "uzbekistan", "tajikistan", "turkmenistan"].includes(c)) return "Central Asia";
  if (["myanmar", "laos", "cambodia", "philippines", "thailand", "vietnam", "indonesia", "malaysia"].includes(c)) return "Southeast Asia";
  if (["uae", "united arab emirates", "saudi arabia", "iraq", "jordan", "oman", "qatar", "kuwait"].includes(c)) return "Middle East";
  if (["chile", "peru", "bolivia", "colombia", "ecuador", "brazil"].includes(c)) return "South America";
  if (["russia", "belarus", "armenia", "georgia", "azerbaijan"].includes(c)) return "Russia/CIS";
  return "Other";
};
const normalizeSourceValue = (value = "") => {
  const source = firstValue(value);
  if (!source || source === "quick_quote" || source === "website" || source === "website_form" || source === "\u7f51\u7ad9\u8868\u5355" || source === "\u7f51\u7ad9\u8be2\u76d8") return "website_form";
  if (["whatsapp_form", "website_whatsapp_form", "Website WhatsApp Form", "WhatsApp \u8868\u5355"].includes(source)) return "website_form";
  if (source === "whatsapp_click" || source === "WhatsApp \u70b9\u51fb") return "whatsapp_click";
  if (source === "manual" || source === "\u624b\u52a8\u5f55\u5165") return "manual";
  return source;
};
const getLeadSourceType = (lead = {}) => {
  if (!lead || (typeof lead !== "object" && typeof lead !== "string") || Array.isArray(lead)) return "unknown";
  if (typeof lead === "string") return normalizeSourceValue(lead) === "manual" ? "manual" : normalizeSourceValue(lead) === "whatsapp_click" ? "whatsapp_click" : "website_form";
  const sourceType = firstValue(lead.sourceType, lead.source_type, lead.raw?.sourceType, lead.raw?.source_type).toLowerCase();
  const source = firstValue(lead.source, lead.raw?.source).toLowerCase();
  if (sourceType === "whatsapp_click" || source === "whatsapp_click") return "whatsapp_click";
  if (sourceType === "manual" || source === "manual") return "manual";
  if (sourceType === "unknown") return "unknown";
  return "website_form";
};
const isWhatsappButtonEntry = (lead = {}) => {
  if (!lead || typeof lead !== "object" || Array.isArray(lead)) return false;
  const sourceType = firstValue(lead.sourceType, lead.source_type, lead.raw?.sourceType, lead.raw?.source_type).toLowerCase();
  const source = firstValue(lead.source, lead.raw?.source).toLowerCase();
  const sourceChannel = firstValue(lead.sourceChannel, lead.source_channel, lead.raw?.sourceChannel, lead.raw?.source_channel).toLowerCase();
  const sourceSubType = firstValue(lead.sourceSubType, lead.source_sub_type, lead.raw?.sourceSubType, lead.raw?.source_sub_type).toLowerCase();
  const createdFrom = firstValue(lead.createdFrom, lead.created_from, lead.raw?.createdFrom, lead.raw?.created_from).toLowerCase();
  const sourceDetail = firstValue(lead.sourceDetail, lead.source_detail, lead.raw?.sourceDetail, lead.raw?.source_detail).toLowerCase();
  return sourceType === "whatsapp_form" || source === "whatsapp_form" || sourceChannel === "whatsapp_button" || sourceSubType === "website_whatsapp_button" || createdFrom === "website_whatsapp_button" || sourceDetail.includes("whatsapp");
};
const getLeadEntryType = (lead = {}) => {
  if (!lead || typeof lead !== "object" || Array.isArray(lead)) return "unknown";
  const sourceEntry = firstValue(lead.sourceEntry, lead.source_entry, lead.raw?.sourceEntry, lead.raw?.source_entry).toLowerCase();
  const sourceDetail = firstValue(lead.sourceDetail, lead.source_detail, lead.raw?.sourceDetail, lead.raw?.source_detail).toLowerCase();
  const sourceSubType = firstValue(lead.sourceSubType, lead.source_sub_type, lead.raw?.sourceSubType, lead.raw?.source_sub_type).toLowerCase();
  const source = firstValue(lead.source, lead.raw?.source).toLowerCase();
  const sourceButton = firstValue(lead.sourceButton, lead.source_button, lead.buttonText, lead.button_text, lead.raw?.sourceButton, lead.raw?.buttonText).toLowerCase();
  const sourcePage = firstValue(lead.sourcePage, lead.source_page, lead.pageUrl, lead.page_url, lead.sourceUrl, lead.source_url, lead.raw?.sourcePage, lead.raw?.sourceUrl).toLowerCase();
  const vehicle = firstValue(lead.vehicle, lead.interestedModel, lead.interested_model).toLowerCase();
  if (sourceEntry.includes("quick_quote") || sourceDetail.includes("quick_quote") || sourceSubType.includes("quick_quote") || source.includes("quick_quote")) return "quick_quote";
  if ((sourcePage === "/" || sourcePage.includes("/index.html")) && (sourceButton.includes("get fob price") || sourceButton.includes("ask for fob price"))) return "home_get_fob";
  if (sourcePage.includes("/vehicles/") || (vehicle && vehicle !== "general vehicle inquiry" && vehicle !== "vehicles from zhonggu auto export")) return "vehicle_button";
  if (sourcePage.includes("landing") || sourceEntry.includes("landing")) return "landing_button";
  if (isWhatsappButtonEntry(lead)) return "whatsapp_button";
  return "normal_form";
};
const getLeadEntryLabel = (lead = {}) => ({ normal_form: "\u666e\u901a\u7f51\u7ad9\u8868\u5355", whatsapp_button: "WhatsApp \u6309\u94ae\u8868\u5355", home_get_fob: "\u9996\u9875 Get FOB Price", vehicle_button: "\u8f66\u8f86\u8be6\u60c5\u9875\u6309\u94ae", landing_button: "\u843d\u5730\u9875\u6309\u94ae", quick_quote: "\u5feb\u901f\u8be2\u4ef7\u8868\u5355", unknown: "\u672a\u77e5\u6765\u6e90\u5165\u53e3" }[getLeadEntryType(lead)] || "\u666e\u901a\u7f51\u7ad9\u8868\u5355");
const leadEntryMatches = (lead = {}, entry = "") => {
  const value = firstValue(entry);
  if (!value) return true;
  if (value === "whatsapp_button") return isWhatsappButtonEntry(lead);
  return getLeadEntryType(lead) === value;
};
const normalizeSource = (value = "") => getLeadSourceType(value);
const normalizeQuoteType = (value = "") => {
  const quoteType = firstValue(value).toUpperCase();
  if (quoteType === "FOB" || quoteType === "CIF") return quoteType;
  return "Unknown";
};
const normalizeNotes = (item = {}) => {
  if (Array.isArray(item.notes)) return item.notes;
  const note = firstValue(item.note);
  return note ? [{ createdAt: firstValue(item.updatedAt, item.createdAt) || new Date().toISOString(), authorId: "", authorName: "", text: note }] : [];
};
const normalizeAssignmentHistory = (item = {}) => Array.isArray(item.assignmentHistory) ? item.assignmentHistory : [];
const normalizeInquiryRecord = (item = {}, index = 0) => {
  const source = getLeadSourceType(item);
  const rawSourceDetail = firstValue(item.sourceDetail, item.source_detail, item.raw?.sourceDetail, item.raw?.source_detail, item.sourceButton, item.source_button, item.source_form_type, item.sourceFormType, item.source_page, item.source_page_title);
  const rawSourceSubType = firstValue(item.sourceSubType, item.source_sub_type, item.raw?.sourceSubType, item.raw?.source_sub_type, item.createdFrom, item.created_from, item.raw?.createdFrom, item.raw?.created_from);
  const sourceDetail = isWhatsappButtonEntry(item) ? firstValue(rawSourceDetail, "Website WhatsApp Button") : rawSourceDetail;
  const sourceSubType = isWhatsappButtonEntry(item) ? firstValue(rawSourceSubType, "website_whatsapp_button") : rawSourceSubType;
  const interestedModel = firstValue(item.interestedModel, item.interested_model, item.vehicle, item.car_type, item.model, item.car, item.vehicle_type);
  const pageUrl = firstValue(item.pageUrl, item.page_url, item.source_page_url, item.source_url, item.url);
  const country = firstValue(item.country);
  const market = MARKETS.includes(firstValue(item.market)) ? firstValue(item.market) : inferMarket({ country, interestedModel, source, pageUrl });
  return {
    ...item,
    id: firstValue(item.id) || `INQ-LEGACY-${Date.now()}-${index}`,
    createdAt: firstValue(item.createdAt, item.created_at) || new Date().toISOString(),
    source,
    sourceDetail,
    sourceType: source,
    sourceChannel: isWhatsappButtonEntry(item) ? firstValue(item.sourceChannel, item.source_channel, item.raw?.sourceChannel, item.raw?.source_channel, "whatsapp_button") : firstValue(item.sourceChannel, item.source_channel, item.raw?.sourceChannel, item.raw?.source_channel),
    sourceEntry: firstValue(item.sourceEntry, item.source_entry, item.raw?.sourceEntry, item.raw?.source_entry, isWhatsappButtonEntry(item) ? "get_fob_price_modal" : ""),
    sourceEntryLabel: getLeadEntryLabel(item),
    sourceSubType,
    sourcePage: firstValue(item.sourcePage, item.source_page, item.source_page_path, pageUrl),
    sourceUrl: firstValue(item.sourceUrl, item.source_url, pageUrl),
    sourceButton: firstValue(item.sourceButton, item.source_button, item.buttonText, item.button_text),
    createdFrom: firstValue(item.createdFrom, item.created_from),
    name: firstValue(item.name, item.contact_name, item.fullName, item.full_name),
    country,
    countryCode: firstValue(item.countryCode, item.country_code, item.raw?.countryCode, item.raw?.country_code),
    whatsappLocal: firstValue(item.whatsappLocal, item.whatsapp_local, item.raw?.whatsappLocal, item.raw?.whatsapp_local),
    market,
    rawWhatsapp: firstValue(item.rawWhatsapp, item.raw_whatsapp, item.whatsappRaw, item.whatsapp, item.whatsApp, item.phone, item.mobile, item.tel),
    whatsapp: firstValue(item.whatsapp, item.whatsApp, item.phone, item.mobile, item.tel),
    email: firstValue(item.email, item.mail, item.emailAddress, item.customerEmail),
    interestedModel,
    vehicle: firstValue(item.vehicle, interestedModel),
    vehicleFromPage: firstValue(item.vehicleFromPage, item.vehicle_from_page),
    quantity: firstValue(item.quantity, item.qty),
    quoteType: normalizeQuoteType(firstValue(item.quoteType, item.fobCif, item.fob_cif, item.quote_type, item.price_type, item.incoterm)),
    destinationPort: firstValue(item.destinationPort, item.port, item.destination_port, item.destination),
    message: firstValue(item.message, item.requirements, item.remark, item.comments),
    type: firstValue(item.type, item.vehicleType, item.vehicle_type),
    marketFromPage: firstValue(item.marketFromPage, item.market_from_page),
    pageUrl,
    status: VALID_STATUSES.includes(firstValue(item.status)) ? firstValue(item.status) : "new",
    priority: ["low", "normal", "high", "urgent"].includes(firstValue(item.priority)) ? firstValue(item.priority) : "normal",
    assignedTo: firstValue(item.assignedTo, item.assigned_to),
    assignedName: firstValue(item.assignedName, item.assigned_name, item.salesName, item.sales_name),
    tags: Array.isArray(item.tags) ? item.tags : [],
    notes: normalizeNotes(item),
    assignmentHistory: normalizeAssignmentHistory(item),
    lastFollowUpAt: firstValue(item.lastFollowUpAt, item.last_follow_up_at),
    nextFollowUpAt: firstValue(item.nextFollowUpAt, item.next_follow_up_at),
    note: firstValue(item.note),
    raw: item.raw || {}
  };
};
const isValidInquiryRecord = (item) => !!item && typeof item === "object" && !Array.isArray(item);
const readInquiries = async () => {
  const raw = await readJsonArray(INQUIRIES_PATH);
  const valid = raw.filter(isValidInquiryRecord);
  const skipped = raw.length - valid.length;
  if (skipped > 0) console.warn(`[CRM] skipped invalid lead records: ${skipped}`);
  const normalized = valid.map(normalizeInquiryRecord);
  return normalized;
};
const normalizeInquiry = (body = {}, req = null) => {
  const now = new Date().toISOString();
  const source = getLeadSourceType(body);
  const isWhatsappEntry = isWhatsappButtonEntry(body);
  const rawSourceDetail = firstValue(body.sourceDetail, body.source_detail, body.sourceButton, body.source_button, body.source_form_type, body.sourceFormType, body.source_page, body.source_page_title);
  const sourceDetail = isWhatsappEntry ? firstValue(rawSourceDetail, "Website WhatsApp Button") : rawSourceDetail;
  const sourceSubType = isWhatsappEntry ? firstValue(body.sourceSubType, body.source_sub_type, body.createdFrom, body.created_from, "website_whatsapp_button") : firstValue(body.sourceSubType, body.source_sub_type);
  const country = firstValue(body.country);
  const interestedModel = firstValue(body.interestedModel, body.interested_model, body.vehicle, body.car_type, body.model, body.car, body.vehicle_type);
  const pageUrl = firstValue(body.pageUrl, body.page_url, body.sourceUrl, body.source_url, body.source_page_url, body.url, req?.headers?.referer);
  const inquiry = normalizeInquiryRecord({
    id: generateInquiryId(),
    createdAt: now,
    source,
    sourceDetail,
    sourceType: source,
    sourceSubType,
    sourceChannel: isWhatsappEntry ? firstValue(body.sourceChannel, body.source_channel, "whatsapp_button") : firstValue(body.sourceChannel, body.source_channel),
    sourceEntry: firstValue(body.sourceEntry, body.source_entry, isWhatsappEntry ? "get_fob_price_modal" : ""),
    sourcePage: firstValue(body.sourcePage, body.source_page, body.source_page_path, pageUrl),
    sourceUrl: firstValue(body.sourceUrl, body.source_url, pageUrl),
    sourceButton: firstValue(body.sourceButton, body.source_button),
    createdFrom: firstValue(body.createdFrom, body.created_from),
    name: firstValue(body.name, body.contact_name, body.fullName, body.full_name),
    country,
    market: firstValue(body.market, body.marketFromPage, body.market_from_page) || inferMarket({ country, interestedModel, source, pageUrl }),
    rawWhatsapp: firstValue(body.rawWhatsapp, body.raw_whatsapp, body.whatsapp, body.whatsApp, body.phone, body.mobile, body.tel),
    whatsapp: firstValue(body.whatsapp, body.whatsApp, body.phone, body.mobile, body.tel),
    email: firstValue(body.email, body.mail, body.emailAddress, body.customerEmail),
    interestedModel,
    quantity: firstValue(body.quantity, body.qty),
    quoteType: normalizeQuoteType(firstValue(body.quoteType, body.fobCif, body.fob_cif, body.quote_type, body.price_type, body.incoterm)),
    destinationPort: firstValue(body.destinationPort, body.port, body.destination_port, body.destination),
    message: firstValue(body.message, body.requirements, body.remark, body.comments),
    pageUrl,
    status: "new",
    priority: firstValue(body.priority) || "normal",
    assignedTo: "",
    tags: isWhatsappEntry ? ["whatsapp-form"] : [],
    notes: [],
    lastFollowUpAt: "",
    nextFollowUpAt: "",
    raw: body
  });
  if (body.language) inquiry.language = firstValue(body.language);
  if (body.referrer) inquiry.referrer = firstValue(body.referrer);
  if (body.utm_source || body.utm_medium || body.utm_campaign) {
    inquiry.utm = { source: firstValue(body.utm_source), medium: firstValue(body.utm_medium), campaign: firstValue(body.utm_campaign) };
  }
  if (body.budget) inquiry.budget = firstValue(body.budget);
  if (body.budget_per_unit) inquiry.budgetPerUnit = firstValue(body.budget_per_unit);
  if (body.total_budget) inquiry.totalBudget = firstValue(body.total_budget);
  if (body.vehicle_condition) inquiry.vehicleCondition = firstValue(body.vehicle_condition);
  if (body.fuel_type) inquiry.fuelType = firstValue(body.fuel_type);
  if (body.year_range) inquiry.yearRange = firstValue(body.year_range);
  if (req?.socket?.remoteAddress) inquiry.ip = req.socket.remoteAddress;
  return inquiry;
};
const appendInquiry = async (body, req = null) => {
  const inquiry = normalizeInquiry(body, req);
  if (!inquiry.name) { const error = new Error("Name is required"); error.status = 400; throw error; }
  if (!inquiry.country) { const error = new Error("Country is required"); error.status = 400; throw error; }
  if (!inquiry.whatsapp) { const error = new Error("WhatsApp is required"); error.status = 400; throw error; }
  if (!inquiry.interestedModel) { const error = new Error("Interested Model is required"); error.status = 400; throw error; }
  const items = await readInquiries();
  items.unshift(inquiry);
  await writeInquiries(items.slice(0, 1000));
  return inquiry;
};
const getClientIp = (req = null) => firstValue(req?.headers?.["x-forwarded-for"]?.split(",")[0], req?.socket?.remoteAddress, "unknown");
const normalizeCustomerWhatsapp = (input = "") => {
  const raw = firstValue(input);
  const digits = raw.replace(/^00/, "").replace(/\D/g, "");
  const hasExplicitPrefix = raw.startsWith("+") || raw.startsWith("00");
  if (!raw || !digits || digits.length < 8 || digits.length > 15 || (!hasExplicitPrefix && digits.length < 11)) {
    const error = new Error("Please include country code, for example +44 or +971.");
    error.status = 400;
    throw error;
  }
  return { rawWhatsapp: raw, whatsapp: digits };
};
const normalizeCustomerWhatsappFromParts = (body = {}) => {
  const countryCodeRaw = firstValue(body.countryCode, body.country_code);
  const localRaw = firstValue(body.whatsappLocal, body.whatsapp_local);
  if (countryCodeRaw || localRaw) {
    const countryDigits = countryCodeRaw.replace(/^00/, "").replace(/\D/g, "");
    let localDigits = localRaw.replace(/^00/, "").replace(/\D/g, "");
    if (!countryDigits || !localDigits || localDigits.length < 5) {
      const error = new Error("Please select country code and enter your WhatsApp number.");
      error.status = 400;
      throw error;
    }
    let whatsapp = "";
    let whatsappLocal = localDigits;
    if (localDigits.startsWith(countryDigits) && localDigits.length > countryDigits.length + 4) {
      whatsapp = localDigits;
      whatsappLocal = localDigits.slice(countryDigits.length);
    } else {
      whatsapp = countryDigits + localDigits;
    }
    if (!/^\d{8,15}$/.test(whatsapp)) {
      const error = new Error("Please enter a valid WhatsApp number with country code.");
      error.status = 400;
      throw error;
    }
    return {
      countryCode: "+" + countryDigits,
      whatsappLocal,
      rawWhatsapp: "+" + countryDigits + " " + whatsappLocal,
      whatsapp
    };
  }
  const normalized = normalizeCustomerWhatsapp(firstValue(body.whatsapp, body.rawWhatsapp, body.phone, body.mobile));
  return {
    countryCode: firstValue(body.countryCode, body.country_code),
    whatsappLocal: firstValue(body.whatsappLocal, body.whatsapp_local),
    ...normalized
  };
};
const checkWhatsappLeadRateLimit = (req = null) => {
  const ip = getClientIp(req);
  const now = Date.now();
  const recent = (whatsappLeadRateLimit.get(ip) || []).filter((time) => now - time < 60 * 1000);
  if (recent.length >= 5) {
    const error = new Error("Too many submissions. Please try again later.");
    error.status = 429;
    throw error;
  }
  recent.push(now);
  whatsappLeadRateLimit.set(ip, recent);
};
const normalizeDuplicateKeyValue = (value = "") => firstValue(value).replace(/\s+/g, " ").trim().toLowerCase();
const isDuplicateWhatsappLead = (existing = {}, inquiry = {}, now = new Date()) => {
  const existingTime = new Date(existing.createdAt || 0).getTime();
  const nowTime = now.getTime();
  const withinWindow = !Number.isNaN(existingTime) && nowTime - existingTime >= 0 && nowTime - existingTime <= 5 * 60 * 1000;
  const sameContent = normalizeDuplicateKeyValue(existing.whatsapp) === normalizeDuplicateKeyValue(inquiry.whatsapp)
    && normalizeDuplicateKeyValue(existing.vehicle || existing.interestedModel) === normalizeDuplicateKeyValue(inquiry.vehicle || inquiry.interestedModel)
    && normalizeDuplicateKeyValue(existing.sourcePage || existing.pageUrl) === normalizeDuplicateKeyValue(inquiry.sourcePage || inquiry.pageUrl)
    && normalizeDuplicateKeyValue(existing.message) === normalizeDuplicateKeyValue(inquiry.message)
    && normalizeDuplicateKeyValue(existing.destinationPort) === normalizeDuplicateKeyValue(inquiry.destinationPort);
  const sameSession = firstValue(existing.leadSessionId) && firstValue(existing.leadSessionId) === firstValue(inquiry.leadSessionId);
  return sameContent && (withinWindow || sameSession);
};
const findDuplicateWhatsappLeadIndex = (items = [], inquiry = {}, now = new Date()) => items.findIndex((item) => isValidInquiryRecord(item) && isDuplicateWhatsappLead(item, inquiry, now));
const appendWhatsappLeadSubmitLog = async (entry = {}) => {
  try {
    await fsp.mkdir(TMP_DIR, { recursive: true });
    const safeEntry = {
      time: entry.time || new Date().toISOString(),
      name: firstValue(entry.name),
      rawWhatsapp: firstValue(entry.rawWhatsapp),
      whatsapp: firstValue(entry.whatsapp),
      vehicle: firstValue(entry.vehicle),
      sourcePage: firstValue(entry.sourcePage),
      sourceButton: firstValue(entry.sourceButton),
      leadSessionId: firstValue(entry.leadSessionId),
      action: firstValue(entry.action),
      leadId: firstValue(entry.leadId),
      reason: firstValue(entry.reason),
      matchedClickCount: Number(entry.matchedClickCount || 0),
      convertedClickIds: Array.isArray(entry.convertedClickIds) ? entry.convertedClickIds : []
    };
    await fsp.appendFile(WHATSAPP_LEAD_SUBMIT_LOG, JSON.stringify(safeEntry) + "\n", "utf8");
  } catch {}
};
const appendWhatsappFormLead = async (body = {}, req = null) => {
  const submittedAt = new Date();
  const logBase = {
    time: submittedAt.toISOString(),
    name: firstValue(body.name),
    rawWhatsapp: firstValue(body.rawWhatsapp, body.raw_whatsapp, body.whatsapp, body.phone, body.mobile),
    whatsapp: firstValue(body.whatsapp, body.phone, body.mobile),
    vehicle: firstValue(body.vehicle, body.interestedModel, body.model),
    sourcePage: firstValue(body.sourcePage, body.page, body.pageUrl),
    sourceButton: firstValue(body.sourceButton, "WhatsApp button"),
    leadSessionId: firstValue(body.leadSessionId, body.lead_session_id)
  };
  if (firstValue(body.leadCompanyTrap, body.companyWebsite, body.website, body.company_website)) {
    await appendWhatsappLeadSubmitLog({ ...logBase, action: "rejected", reason: "honeypot" });
    return { skipped: true, inquiry: null };
  }
  checkWhatsappLeadRateLimit(req);
  let normalizedWhatsapp;
  try {
    normalizedWhatsapp = normalizeCustomerWhatsappFromParts(body);
  } catch (error) {
    await appendWhatsappLeadSubmitLog({ ...logBase, action: "rejected", reason: error.message });
    error.logged = true;
    throw error;
  }
  const message = firstValue(body.message).slice(0, 1000);
  const payload = {
    ...body,
    ...normalizedWhatsapp,
    source: "website_form",
    sourceType: "website_form",
    sourceChannel: "whatsapp_button",
    sourceEntry: firstValue(body.sourceEntry, body.source_entry, "get_fob_price_modal"),
    sourceDetail: "Website WhatsApp Button",
    sourceSubType: firstValue(body.sourceSubType, body.source_sub_type, "website_whatsapp_button"),
    sourceButton: firstValue(body.sourceButton, "WhatsApp button"),
    sourcePage: firstValue(body.sourcePage, body.page, body.pageUrl),
    sourceUrl: firstValue(body.sourceUrl, body.pageUrl, req?.headers?.referer),
    pageUrl: firstValue(body.sourceUrl, body.pageUrl, req?.headers?.referer),
    interestedModel: firstValue(body.interestedModel, body.vehicle, body.model),
    vehicle: firstValue(body.vehicle, body.interestedModel, body.model),
    message,
    submittedAt: submittedAt.toISOString(),
    createdFrom: "website_whatsapp_button",
    leadSessionId: firstValue(body.leadSessionId, body.lead_session_id)
  };
  const inquiry = normalizeInquiry(payload, req);
  const reject = async (message, status = 400) => {
    await appendWhatsappLeadSubmitLog({ ...logBase, ...normalizedWhatsapp, vehicle: payload.vehicle, sourcePage: payload.sourcePage, sourceButton: payload.sourceButton, leadSessionId: payload.leadSessionId, action: "rejected", reason: message });
    const error = new Error(message);
    error.status = status;
    error.logged = true;
    throw error;
  };
  if (!inquiry.name) await reject("Name is required");
  if (!inquiry.country) await reject("Country is required");
  if (!inquiry.whatsapp) await reject("WhatsApp is required");
  if (!inquiry.interestedModel) await reject("Vehicle Model is required");
  inquiry.status = "new";
  inquiry.assignedTo = "";
  inquiry.assignedAt = "";
  inquiry.assignedBy = "";
  inquiry.lastContactedAt = "";
  inquiry.tags = [...new Set([...(Array.isArray(inquiry.tags) ? inquiry.tags : []), "whatsapp-form"])] ;
  const items = await readInquiries();
  const duplicateIndex = findDuplicateWhatsappLeadIndex(items, inquiry, submittedAt);
  if (duplicateIndex >= 0) {
    const existing = { ...items[duplicateIndex] };
    existing.duplicateSubmitCount = Number(existing.duplicateSubmitCount || 0) + 1;
    existing.lastDuplicateSubmitAt = submittedAt.toISOString();
    if (!firstValue(existing.leadSessionId) && firstValue(payload.leadSessionId)) existing.leadSessionId = payload.leadSessionId;
    const clickLink = await markWhatsappClicksConverted(existing, payload);
    Object.assign(existing, clickLink);
    items[duplicateIndex] = existing;
    await writeInquiries(items.slice(0, 1000));
    await appendWhatsappLeadSubmitLog({ ...logBase, ...normalizedWhatsapp, vehicle: inquiry.vehicle || inquiry.interestedModel, sourcePage: inquiry.sourcePage, sourceButton: inquiry.sourceButton, leadSessionId: inquiry.leadSessionId, action: "duplicate", leadId: existing.id, matchedClickCount: clickLink.clickCountBeforeSubmit || 0, convertedClickIds: clickLink.relatedClickIds || [], reason: clickLink.hasRelatedWhatsappClick ? "same whatsapp, vehicle, source page, destination port and message within duplicate window" : "duplicate; no matching whatsapp click found" });
    return { skipped: false, duplicate: true, inquiry: existing };
  }
  const clickLink = await markWhatsappClicksConverted(inquiry, payload);
  Object.assign(inquiry, clickLink);
  items.unshift(inquiry);
  await writeInquiries(items.slice(0, 1000));
  await appendWhatsappLeadSubmitLog({ ...logBase, ...normalizedWhatsapp, vehicle: inquiry.vehicle || inquiry.interestedModel, sourcePage: inquiry.sourcePage, sourceButton: inquiry.sourceButton, leadSessionId: inquiry.leadSessionId, action: "created", leadId: inquiry.id, matchedClickCount: clickLink.clickCountBeforeSubmit || 0, convertedClickIds: clickLink.relatedClickIds || [], reason: clickLink.hasRelatedWhatsappClick ? "created new website inquiry" : "created new website inquiry; no matching whatsapp click found" });
  return { skipped: false, duplicate: false, inquiry };
};
const MANUAL_SOURCE_DETAILS = new Set(["manual", "whatsapp_customer", "phone", "exhibition", "referral", "email_reply", "other"]);
const appendManualInquiry = async (body = {}, user) => {
  if (user.role !== "admin") { const error = new Error("Only admin can add manual leads"); error.status = 403; throw error; }
  const country = firstValue(body.country);
  const interestedModel = firstValue(body.interestedModel, body.model);
  const pageUrl = firstValue(body.pageUrl);
  const assignedTo = firstValue(body.assignedTo);
  const sourceDetailInput = firstValue(body.sourceDetail, body.source_detail, body.manualSource, body.leadSource) || "manual";
  const sourceDetail = MANUAL_SOURCE_DETAILS.has(sourceDetailInput) ? sourceDetailInput : "manual";
  const inquiry = normalizeInquiryRecord({
    id: generateInquiryId(),
    createdAt: new Date().toISOString(),
    source: "manual",
    sourceDetail,
    name: firstValue(body.name) || "客户未知",
    country,
    market: firstValue(body.market) || inferMarket({ country, interestedModel, source: "manual", pageUrl }),
    whatsapp: firstValue(body.whatsapp),
    email: firstValue(body.email, body.mail, body.emailAddress, body.customerEmail),
    interestedModel,
    quantity: firstValue(body.quantity),
    quoteType: normalizeQuoteType(firstValue(body.quoteType)),
    destinationPort: firstValue(body.destinationPort),
    message: firstValue(body.message),
    pageUrl,
    status: "new",
    priority: "normal",
    assignedTo,
    tags: ["manual"],
    notes: [],
    lastFollowUpAt: "",
    nextFollowUpAt: ""
  });
  const items = await readInquiries();
  items.unshift(inquiry);
  await writeInquiries(items.slice(0, 1000));
  return inquiry;
};
const parseCookies = (req) => Object.fromEntries(String(req.headers.cookie || "").split(";").map((part) => part.trim()).filter(Boolean).map((part) => {
  const index = part.indexOf("=");
  return index >= 0 ? [decodeURIComponent(part.slice(0, index)), decodeURIComponent(part.slice(index + 1))] : [part, ""];
}));
const sameSiteCookie = (name, value, options = "") => `${name}=${encodeURIComponent(value)}; Path=/; HttpOnly; SameSite=Lax${options ? "; " + options : ""}`;
const getSessionUser = async (req) => {
  const token = parseCookies(req)[SESSION_COOKIE];
  const session = token ? sessions.get(token) : null;
  if (!session || session.expiresAt < Date.now()) {
    if (token) sessions.delete(token);
    return null;
  }
  const users = await readAdminUsers();
  const user = users.find((item) => item.id === session.userId && item.active !== false);
  return user || null;
};
const getCurrentUser = getSessionUser;
const requireAdminUser = async (req) => {
  const user = await getCurrentUser(req);
  if (!user) {
    const error = new Error("Login required");
    error.status = 401;
    throw error;
  }
  return user;
};
const normalizeInquirySource = (value = "") => getLeadSourceType(value);
const isWhatsappInquiry = (item = {}) => getLeadSourceType(item) === "whatsapp_click";
const isFormalCustomerInquiry = (item = {}) => isWhatsappInquiry(item) ? false : true;
const normalizeAssignedTo = (value = "") => { const assigned = firstValue(value); return assigned === "unassigned" ? "" : assigned; };
const assignmentKey = (value = "") => firstValue(value).toLowerCase().replace(/[^a-z0-9\u4e00-\u9fff]+/g, "_").replace(/^_+|_+$/g, "");
const USER_ASSIGNMENT_ALIASES = {
  admin_chen: ["Chen Gang", "chen_gang", "admin"],
  sales_zheng: ["郑国志", "zheng_guozhi", "zheng"]
};
const userAssignmentKeys = (user = {}) => {
  const values = [user.id, user.username, user.name, user.displayName, ...(USER_ASSIGNMENT_ALIASES[user.id] || [])];
  return new Set(values.map(assignmentKey).filter(Boolean));
};
const inquiryAssignmentValues = (inquiry = {}) => [
  inquiry.assignedTo,
  inquiry.assigned_to,
  inquiry.assignedName,
  inquiry.assigned_name,
  inquiry.salesId,
  inquiry.sales_id,
  inquiry.salesName,
  inquiry.sales_name,
  inquiry.owner,
  inquiry.ownerName,
  inquiry.raw?.assignedTo,
  inquiry.raw?.assigned_to,
  inquiry.raw?.assignedName,
  inquiry.raw?.assigned_name
];
const isInquiryAssignedToUser = (inquiry = {}, user = {}) => {
  const keys = userAssignmentKeys(user);
  return inquiryAssignmentValues(inquiry).some((value) => keys.has(assignmentKey(value)));
};
const canSeeInquiry = (user, inquiry) => isAdmin(user) || (isSales(user) && isInquiryAssignedToUser(inquiry, user));
const visibleInquiries = (user, items) => isAdmin(user) ? items : items.filter((item) => canSeeInquiry(user, item));
const SALES_ALLOWED_STATUSES = new Set(["contacted", "quoted", "waiting", "won", "lost", "closed"]);
const assertSalesInquiryPatchAllowed = (patch = {}) => {
  const allowedKeys = new Set(["status", "note"]);
  const blockedKey = Object.keys(patch).find((key) => !allowedKeys.has(key));
  if (blockedKey) { const error = new Error("Forbidden: sales can only update own lead status and notes"); error.status = 403; throw error; }
  if (Object.prototype.hasOwnProperty.call(patch, "status") && !SALES_ALLOWED_STATUSES.has(firstValue(patch.status))) {
    const error = new Error("Forbidden: sales can only set follow-up statuses");
    error.status = 403;
    throw error;
  }
};
const getInquiryByIdForUser = async (id, user) => {
  const items = await readInquiries();
  const index = items.findIndex((item) => String(item.id) === String(id));
  if (index < 0) { const error = new Error("Inquiry not found"); error.status = 404; throw error; }
  const current = normalizeInquiryRecord(items[index], index);
  if (!canSeeInquiry(user, current)) { const error = new Error("Forbidden"); error.status = 403; throw error; }
  return { items, index, current };
};
const updateInquiry = async (id, patch = {}, user) => {
  const { items, index, current } = await getInquiryByIdForUser(id, user);
  if (!isAdmin(user)) assertSalesInquiryPatchAllowed(patch);
  const next = { ...current };
  const now = new Date().toISOString();
  if (Object.prototype.hasOwnProperty.call(patch, "assignedTo")) {
    if (!isAdmin(user)) { const error = new Error("Forbidden: admin only"); error.status = 403; throw error; }
    const users = await readAdminUsers();
    const from = next.assignedTo;
    const to = normalizeAssignedTo(patch.assignedTo);
    const nameFor = (id) => users.find((item) => item.id === id)?.name || id || "未分配";
    next.assignedTo = to;
    next.assignedAt = to ? now : "";
    next.assignedBy = to ? firstValue(user.id, user.username, user.name) : "";
    if (to && ["new", "whatsapp_lead"].includes(next.status)) next.status = "assigned";
    if (!to && next.status === "assigned") next.status = isWhatsappInquiry(next) ? "whatsapp_lead" : "new";
    if (from !== to) {
      const text = from ? `从 ${nameFor(from)} 改为${to ? nameFor(to) : "未分配"}` : (to ? `分配给 ${nameFor(to)}` : "保持未分配");
      const entry = { time: now, type: "assignment", operator: user.name || user.id, from: nameFor(from), to: nameFor(to), text };
      next.assignmentHistory = [...(Array.isArray(next.assignmentHistory) ? next.assignmentHistory : []), entry];
      next.notes = [...(Array.isArray(next.notes) ? next.notes : []), { createdAt: now, authorId: user.id, authorName: user.name, type: "assignment", text }];
      next.note = text;
    }
  }
  if (Object.prototype.hasOwnProperty.call(patch, "status")) {
    const status = firstValue(patch.status);
    if (!VALID_STATUSES.includes(status)) { const error = new Error("Invalid status"); error.status = 400; throw error; }
    next.status = status;
    if (["contacted", "quoted", "waiting", "won", "lost", "closed"].includes(status)) next.lastFollowUpAt = now;
  }
  if (Object.prototype.hasOwnProperty.call(patch, "priority")) {
    const priority = firstValue(patch.priority);
    next.priority = ["low", "normal", "high", "urgent"].includes(priority) ? priority : "normal";
  }
  if (Object.prototype.hasOwnProperty.call(patch, "email") || Object.prototype.hasOwnProperty.call(patch, "mail") || Object.prototype.hasOwnProperty.call(patch, "emailAddress") || Object.prototype.hasOwnProperty.call(patch, "customerEmail")) {
    next.email = firstValue(patch.email, patch.mail, patch.emailAddress, patch.customerEmail);
  }
  if (Object.prototype.hasOwnProperty.call(patch, "nextFollowUpAt")) next.nextFollowUpAt = firstValue(patch.nextFollowUpAt);
  if (Object.prototype.hasOwnProperty.call(patch, "note")) {
    const text = firstValue(patch.note);
    if (text) {
      next.notes = [...(Array.isArray(next.notes) ? next.notes : []), { createdAt: now, authorId: user.id, authorName: user.name, text }];
      next.note = text;
    }
  }
  next.updatedAt = now;
  items[index] = next;
  await writeInquiries(items);
  return next;
};
const readWhatsappClicks = async () => readJsonArray(WHATSAPP_CLICKS_PATH);
const writeWhatsappClicks = async (items) => writeJsonArray(WHATSAPP_CLICKS_PATH, items);
const simpleCompare = (value = "") => firstValue(value).toLowerCase().replace(/[^a-z0-9\u4e00-\u9fff]+/g, "");
const GENERIC_WHATSAPP_VEHICLE_KEYS = new Set(["generalvehicleinquiry", "vehiclesfromzhongguautoexport", "vehicleinquiry", "vehicles"]);
const GENERIC_WHATSAPP_BUTTON_KEYS = new Set(["website", "whatsappbutton", "getfobprice", "askforfobprice", "contactonwhatsapp", "whatsapp"]);
const sameOrClose = (left = "", right = "", options = {}) => {
  const a = simpleCompare(left);
  const b = simpleCompare(right);
  if (!a || !b) return true;
  if (options.genericSet && options.genericSet.has(a) && options.genericSet.has(b)) return true;
  return a === b || a.includes(b) || b.includes(a);
};
const markWhatsappClicksConverted = async (inquiry = {}, sourceBody = {}) => {
  const leadSessionId = firstValue(inquiry.leadSessionId, sourceBody.leadSessionId, sourceBody.lead_session_id);
  const submittedAt = new Date(firstValue(sourceBody.submittedAt, inquiry.createdAt, new Date().toISOString())).getTime();
  const sourcePage = firstValue(inquiry.sourcePage, sourceBody.sourcePage, sourceBody.page, inquiry.pageUrl, sourceBody.pageUrl);
  const sourceButton = firstValue(inquiry.sourceButton, sourceBody.sourceButton, sourceBody.buttonText);
  const vehicle = firstValue(inquiry.vehicle, inquiry.interestedModel, sourceBody.vehicle, sourceBody.model);
  const clicks = await readWhatsappClicks();
  const matchedIndexes = [];
  clicks.forEach((click, index) => {
    if (!click || typeof click !== "object" || Array.isArray(click)) return;
    if (leadSessionId && firstValue(click.leadSessionId, click.lead_session_id) === leadSessionId) matchedIndexes.push(index);
  });
  if (!matchedIndexes.length) {
    const minTime = submittedAt - 30 * 60 * 1000;
    clicks.forEach((click, index) => {
      if (!click || typeof click !== "object" || Array.isArray(click)) return;
      if (click.converted === true || firstValue(click.converted) === "true") return;
      const clickedAt = new Date(firstValue(click.createdAt, click.clickedAt, click.timestamp)).getTime();
      if (!clickedAt || Number.isNaN(clickedAt) || clickedAt > submittedAt || clickedAt < minTime) return;
      const clickPage = firstValue(click.sourcePage, click.page, click.pageUrl, click.sourceUrl);
      const clickButton = firstValue(click.sourceButton, click.buttonText, click.button_text, click.source);
      const clickVehicle = firstValue(click.vehicle, click.model, click.interestedModel, click.interested_model);
      if (sourcePage && clickPage && clickPage !== sourcePage) return;
      if (!sameOrClose(clickButton, sourceButton, { genericSet: GENERIC_WHATSAPP_BUTTON_KEYS })) return;
      if (!sameOrClose(clickVehicle, vehicle, { genericSet: GENERIC_WHATSAPP_VEHICLE_KEYS })) return;
      matchedIndexes.push(index);
    });
  }
  const uniqueIndexes = [...new Set(matchedIndexes)];
  if (!uniqueIndexes.length) return { hasRelatedWhatsappClick: false, relatedClickIds: [], firstClickAt: "", lastClickAt: "", clickCountBeforeSubmit: 0 };
  const now = new Date().toISOString();
  const related = uniqueIndexes.map((index) => {
    const original = clicks[index] || {};
    const id = firstValue(original.id, original.clickId) || generateWhatsappClickId();
    clicks[index] = { ...original, id, leadSessionId: firstValue(original.leadSessionId, leadSessionId), converted: true, conversionStatus: "submitted", convertedLeadId: inquiry.id, convertedAt: now, convertedTo: "website_form" };
    return clicks[index];
  });
  await writeWhatsappClicks(clicks.slice(0, 2000));
  const times = related.map((click) => firstValue(click.createdAt, click.clickedAt, click.timestamp)).filter(Boolean).sort();
  return { hasRelatedWhatsappClick: true, relatedClickIds: related.map((click) => click.id).filter(Boolean), firstClickAt: times[0] || "", lastClickAt: times[times.length - 1] || "", clickCountBeforeSubmit: related.length };
};
const linkWhatsappClickToExistingInquiry = async (click = {}) => {
  const leadSessionId = firstValue(click.leadSessionId, click.lead_session_id);
  if (!leadSessionId) return null;
  const items = await readInquiries();
  const index = items.findIndex((item) => isValidInquiryRecord(item) && getLeadSourceType(item) === "website_form" && firstValue(item.leadSessionId) === leadSessionId);
  if (index < 0) return null;
  const inquiry = { ...items[index] };
  const clickId = firstValue(click.id, click.clickId) || generateWhatsappClickId();
  click.id = clickId;
  const now = new Date().toISOString();
  const relatedClickIds = new Set(Array.isArray(inquiry.relatedClickIds) ? inquiry.relatedClickIds.filter(Boolean) : []);
  relatedClickIds.add(clickId);
  const times = [inquiry.firstClickAt, inquiry.lastClickAt, click.createdAt, click.clickedAt, click.timestamp].map((value) => firstValue(value)).filter(Boolean).sort();
  inquiry.hasRelatedWhatsappClick = true;
  inquiry.relatedClickIds = [...relatedClickIds];
  inquiry.firstClickAt = times[0] || "";
  inquiry.lastClickAt = times[times.length - 1] || "";
  inquiry.clickCountBeforeSubmit = inquiry.relatedClickIds.length;
  items[index] = inquiry;
  await writeInquiries(items.slice(0, 1000));
  return {
    converted: true,
    conversionStatus: "submitted",
    convertedLeadId: inquiry.id,
    convertedAt: now,
    convertedTo: "website_form"
  };
};
const normalizeWhatsappClickRecord = (item = {}, index = 0) => {
  if (!item || typeof item !== "object" || Array.isArray(item)) item = {};
  const createdAt = firstValue(item.createdAt, item.clickedAt, item.timestamp) || new Date().toISOString();
  const pageUrl = firstValue(item.pageUrl, item.sourceUrl, item.url, item.page);
  const sourcePage = firstValue(item.sourcePage, item.page, pageUrl);
  const sourceUrl = firstValue(item.sourceUrl, pageUrl);
  const sourceButton = firstValue(item.sourceButton, item.buttonText, item.button_text, item.source, "WhatsApp button");
  const vehicle = firstValue(item.vehicle, item.model, item.interestedModel, item.interested_model);
  const market = firstValue(item.market) || inferMarket({ country: item.country, interestedModel: vehicle, source: "whatsapp_click", pageUrl });
  const eventType = firstValue(item.eventType, item.event_type);
  const converted = item.converted === true || firstValue(item.converted) === "true" || eventType === "whatsapp_form_submit";
  const convertedLeadId = firstValue(item.convertedLeadId, item.converted_lead_id);
  return {
    id: firstValue(item.id) || ("WA-LEGACY-" + Date.now() + "-" + index),
    clickId: firstValue(item.clickId, item.id),
    createdAt,
    source: "whatsapp_click",
    sourceType: "whatsapp_click",
    sourceDetail: "WhatsApp Click",
    name: firstValue(item.name, item.customerName, item.customer_name) || "\u672a\u77e5\u5ba2\u6237",
    country: firstValue(item.country),
    market,
    rawWhatsapp: "",
    whatsapp: "",
    email: "",
    interestedModel: vehicle,
    vehicle,
    quantity: "",
    quoteType: "",
    destinationPort: "",
    pageUrl,
    sourcePage,
    sourceUrl,
    sourceButton,
    buttonText: sourceButton,
    eventType,
    leadSessionId: firstValue(item.leadSessionId, item.lead_session_id),
    converted,
    conversionStatus: firstValue(item.conversionStatus, item.conversion_status),
    convertedLeadId,
    convertedAt: firstValue(item.convertedAt, item.converted_at),
    convertedTo: firstValue(item.convertedTo, item.converted_to),
    waNumber: firstValue(item.waNumber, item.wa_number),
    targetWhatsapp: firstValue(item.targetWhatsapp, item.target_whatsapp, item.waNumber, item.wa_number),
    ip: firstValue(item.ip, item.clientIp, item.client_ip),
    userAgent: firstValue(item.userAgent, item.user_agent),
    status: "whatsapp_click",
    assignedTo: "",
    assignedAt: "",
    assignedBy: "",
    lastContactedAt: "",
    tags: ["whatsapp-click"],
    notes: [],
    message: converted ? "\u8be5\u70b9\u51fb\u5df2\u8f6c\u5316\u4e3a\u7f51\u7ad9\u8be2\u76d8\u7ebf\u7d22\uff0c\u53ef\u5728\u7f51\u7ad9\u8be2\u76d8\u6216\u5168\u90e8\u7ebf\u7d22\u4e2d\u67e5\u770b\u6b63\u5f0f\u5ba2\u6237\u4fe1\u606f\u3002" : "\u8be5\u8bb0\u5f55\u4ec5\u8868\u793a\u5ba2\u6237\u70b9\u51fb\u4e86 WhatsApp \u6309\u94ae\uff0c\u5c1a\u672a\u63d0\u4ea4\u8868\u5355\u3002",
    raw: item
  };
};
const normalizeWhatsappClickRecords = (items = []) => items.map(normalizeWhatsappClickRecord);
const appendWhatsappClick = async (body = {}, req = null) => {
  const eventType = firstValue(body.eventType, body.event_type);
  if (eventType === "whatsapp_form_submit") return { click: null, eventOnly: true, skipped: true };
  const pageUrl = firstValue(body.pageUrl, body.page_url, body.sourceUrl, body.source_url, req?.headers?.referer);
  const model = firstValue(body.model, body.interestedModel, body.interested_model);
  const country = firstValue(body.country);
  const source = firstValue(body.source) || "unknown";
  const buttonText = firstValue(body.buttonText, body.button_text);
  const market = firstValue(body.market) || inferMarket({ country, interestedModel: model, source, pageUrl });
  const waNumber = firstValue(body.waNumber, body.wa_number, body.targetWhatsapp, body.target_whatsapp).replace(/\D/g, "");
  const salesId = firstValue(body.salesId, body.sales_id);
  const click = {
    id: generateWhatsappClickId(),
    createdAt: new Date().toISOString(),
    pageUrl,
    page: firstValue(body.page, pageUrl),
    buttonText,
    model,
    vehicle: firstValue(body.vehicle, model),
    country,
    market,
    source,
    eventType,
    sourcePage: firstValue(body.sourcePage, body.source_page, body.page, pageUrl),
    sourceUrl: firstValue(body.sourceUrl, body.source_url, pageUrl),
    sourceButton: firstValue(body.sourceButton, body.source_button, buttonText, source, "WhatsApp button"),
    leadSessionId: firstValue(body.leadSessionId, body.lead_session_id),
    converted: false,
    conversionStatus: "",
    convertedLeadId: "",
    convertedAt: "",
    convertedTo: "",
    ip: getClientIp(req),
    salesId,
    waNumber,
    targetWhatsapp: firstValue(body.targetWhatsapp, body.target_whatsapp, waNumber),
    userAgent: firstValue(req?.headers?.["user-agent"])
  };
  const existingInquiryConversion = await linkWhatsappClickToExistingInquiry(click);
  if (existingInquiryConversion) Object.assign(click, existingInquiryConversion);
  const items = await readWhatsappClicks();
  items.unshift(click);
  await writeWhatsappClicks(items.slice(0, 2000));
  if (click.eventType === "whatsapp_form_open") {
    return { click, eventOnly: true };
  }
  const inquiries = await readInquiries();
  const tenMinutesAgo = Date.now() - 10 * 60 * 1000;
  const existingLead = inquiries.find((item) => item.source === "whatsapp_click"
    && item.pageUrl === pageUrl
    && firstValue(item.interestedModel) === model
    && new Date(item.createdAt || 0).getTime() >= tenMinutesAgo);
  if (existingLead) return { click, inquiry: existingLead, duplicateSuppressed: true };
  const lead = normalizeInquiryRecord({
    id: generateWhatsappLeadId(),
    createdAt: click.createdAt,
    source: "whatsapp_click",
    sourceDetail: buttonText,
    name: "客户未知",
    country,
    market,
    whatsapp: "",
    email: "",
    interestedModel: model,
    quantity: "",
    quoteType: "Unknown",
    destinationPort: "",
    message: "WhatsApp button clicked. Customer number unknown until they send a message.",
    pageUrl,
    salesId,
    waNumber,
    targetWhatsapp: firstValue(body.targetWhatsapp, body.target_whatsapp, waNumber),
    status: "whatsapp_lead",
    priority: "normal",
    assignedTo: "",
    tags: ["whatsapp-click"],
    notes: [],
    lastFollowUpAt: "",
    nextFollowUpAt: ""
  });
  inquiries.unshift(lead);
  await writeInquiries(inquiries.slice(0, 1000));
  return { click, inquiry: lead, duplicateSuppressed: false };
};
const findSalesUser = async (id) => (await readAdminUsers()).find((user) => user.id === id && user.active !== false);
const writeAdminUsers = async (items) => writeJsonArray(ADMIN_USERS_PATH, items.map(normalizeAdminUser));
const activeAdminCount = (users) => users.filter((item) => item.role === "admin" && item.active !== false).length;
const handleGetSalesUsers = async (user, res) => {
  requireAdminRole(user);
  return sendJson(res, 200, { success: true, users: (await readAdminUsers()).map(publicUser) });
};
const handleCreateSalesUser = async (req, user, res) => {
  requireAdminRole(user);
  const body = await parseJsonBody(req);
  const username = firstValue(body.username, body.user, body.account);
  const password = firstValue(body.password, body.pass);
  const name = firstValue(body.name, body.displayName, username);
  if (!username) return sendJson(res, 400, { success: false, error: "Username is required" });
  if (!password) return sendJson(res, 400, { success: false, error: "Password is required" });
  const users = await readAdminUsers();
  if (users.some((item) => item.username === username)) return sendJson(res, 409, { success: false, error: "Username already exists" });
  const created = normalizeAdminUser({
    id: generateAdminUserId(username),
    name,
    username,
    passwordHash: hashPassword(password),
    role: firstValue(body.role) === "admin" ? "admin" : "sales",
    whatsapp: firstValue(body.whatsapp, body.whatsApp, body.phone),
    markets: normalizeMarkets(body.markets),
    active: body.active !== false && body.active !== "false"
  });
  users.push(created);
  await writeAdminUsers(users);
  return sendJson(res, 200, { success: true, user: publicUser(created) });
};
const handlePatchSalesUser = async (req, id, user, res) => {
  requireAdminRole(user);
  const body = await parseJsonBody(req);
  const users = await readAdminUsers();
  const index = users.findIndex((item) => item.id === id);
  if (index < 0) return sendJson(res, 404, { success: false, error: "Sales user not found" });
  const current = users[index];
  const next = { ...current };
  if (Object.prototype.hasOwnProperty.call(body, "name")) next.name = firstValue(body.name) || next.name;
  if (Object.prototype.hasOwnProperty.call(body, "role")) next.role = firstValue(body.role) === "admin" ? "admin" : "sales";
  if (Object.prototype.hasOwnProperty.call(body, "whatsapp") || Object.prototype.hasOwnProperty.call(body, "whatsApp") || Object.prototype.hasOwnProperty.call(body, "phone")) next.whatsapp = firstValue(body.whatsapp, body.whatsApp, body.phone);
  if (Object.prototype.hasOwnProperty.call(body, "markets")) next.markets = normalizeMarkets(body.markets);
  if (Object.prototype.hasOwnProperty.call(body, "active")) next.active = body.active === true || body.active === "true";
  const newPassword = firstValue(body.password, body.newPassword, body.resetPassword);
  if (newPassword) { delete next.password; next.passwordHash = hashPassword(newPassword); }
  const simulated = users.map((item, itemIndex) => itemIndex === index ? normalizeAdminUser(next) : item);
  if (activeAdminCount(simulated) < 1) return sendJson(res, 400, { success: false, error: "Cannot disable or demote the last admin" });
  users[index] = normalizeAdminUser(next);
  await writeAdminUsers(users);
  return sendJson(res, 200, { success: true, user: publicUser(users[index]) });
};
const startOfLocalDay = (offset = 0) => {
  const date = new Date();
  date.setHours(0, 0, 0, 0);
  date.setDate(date.getDate() + offset);
  return date;
};
const startOfMonth = () => {
  const date = new Date();
  date.setDate(1);
  date.setHours(0, 0, 0, 0);
  return date;
};
const inRange = (value, start, end = null) => {
  const date = new Date(value || 0);
  if (Number.isNaN(date.getTime())) return false;
  return date >= start && (!end || date < end);
};
const isInquiryDueToday = (item = {}, today = startOfLocalDay(), tomorrow = startOfLocalDay(1)) => {
  if (firstValue(item.nextFollowUpAt) && inRange(item.nextFollowUpAt, today, tomorrow)) return true;
  const statusValue = firstValue(item.status);
  const activityTime = firstValue(item.lastContactedAt, item.lastFollowUpAt, item.createdAt);
  return ["new", "assigned", "waiting"].includes(statusValue || "new") && inRange(activityTime, today, tomorrow);
};
const filterInquiries = (items, params = new URLSearchParams()) => {
  const status = firstValue(params.get("status"));
  const market = firstValue(params.get("market"));
  const assignedTo = firstValue(params.get("assignedTo"), params.get("sales"));
  const leadType = firstValue(params.get("leadType"));
  const rawSource = firstValue(params.get("source"));
  const source = leadType && leadType !== "all" ? "" : (rawSource ? normalizeInquirySource(rawSource) : "");
  const entry = firstValue(params.get("entry"), params.get("sourceEntry"));
  const range = firstValue(params.get("range"), params.get("timeRange"));
  const due = firstValue(params.get("due"));
  const q = firstValue(params.get("q"), params.get("keyword")).toLowerCase();
  const today = startOfLocalDay();
  const tomorrow = startOfLocalDay(1);
  const yesterday = startOfLocalDay(-1);
  const sevenDays = startOfLocalDay(-6);
  const month = startOfMonth();
  return items.filter((item) => {
    if (status && item.status !== status) return false;
    if (market && item.market !== market) return false;
    if (assignedTo && item.assignedTo !== assignedTo) return false;
    const itemSource = getLeadSourceType(item);
    if (source && itemSource !== source) return false;
    if (!leadEntryMatches(item, entry)) return false;
    if (leadType === "website" && itemSource !== "website_form") return false;
    if (leadType === "manual" && itemSource !== "manual") return false;
    if (leadType === "whatsapp" && itemSource !== "whatsapp_click") return false;
    if (leadType === "all" && !["website_form", "manual"].includes(itemSource)) return false;
    if (range === "today" && !inRange(item.createdAt, today, tomorrow)) return false;
    if (range === "yesterday" && !inRange(item.createdAt, yesterday, today)) return false;
    if (range === "last7" && !inRange(item.createdAt, sevenDays)) return false;
    if (range === "month" && !inRange(item.createdAt, month)) return false;
    if (due === "today" && !isInquiryDueToday(item, today, tomorrow)) return false;
    if (q) {
      const haystack = [item.name, item.country, item.whatsapp, item.rawWhatsapp, item.interestedModel, item.vehicle, item.message, item.sourceButton, item.sourcePage, item.pageUrl].join(" ").toLowerCase();
      if (!haystack.includes(q)) return false;
    }
    return true;
  });
};
const buildInquiryStats = async (user) => {
  const allInquiries = visibleInquiries(user, await readInquiries());
  const users = await readAdminUsers();
  const activeUsers = users.filter((item) => item.active !== false);
  const sourceOf = (item) => getLeadSourceType(item);
  const customerLeadsList = allInquiries.filter((item) => sourceOf(item) !== "whatsapp_click");
  const whatsappButtonFormList = allInquiries.filter((item) => sourceOf(item) === "website_form" && isWhatsappButtonEntry(item));
  const whatsappClickRows = isAdmin(user) ? normalizeWhatsappClickRecords(await readWhatsappClicks()) : [];
  const whatsappClicks = whatsappClickRows;
  const convertedWhatsappClicks = whatsappClicks.filter((item) => item.converted === true);
  const unconvertedWhatsappClicks = whatsappClicks.filter((item) => item.converted !== true);
  const isAssignedToAnyActiveUser = (item) => activeUsers.some((activeUser) => isInquiryAssignedToUser(item, activeUser));
  const isUnassigned = (item) => !isAssignedToAnyActiveUser(item);
  const isAssigned = (item) => isAssignedToAnyActiveUser(item);
  const countAssignedTo = (id) => {
    const activeUser = activeUsers.find((item) => item.id === id) || { id };
    return customerLeadsList.filter((item) => isInquiryAssignedToUser(item, activeUser)).length;
  };
  const today = startOfLocalDay();
  const tomorrow = startOfLocalDay(1);
  const yesterday = startOfLocalDay(-1);
  const sevenDays = startOfLocalDay(-6);
  const month = startOfMonth();
  const countStatus = (statusValue) => customerLeadsList.filter((item) => item.status === statusValue).length;
  const countNew = () => customerLeadsList.filter((item) => {
    const statusValue = firstValue(item.status);
    return statusValue ? ["new", "assigned"].includes(statusValue) : true;
  }).length;
  const customerLeads = {
    total: customerLeadsList.length,
    today: customerLeadsList.filter((item) => inRange(item.createdAt, today, tomorrow)).length,
    yesterday: customerLeadsList.filter((item) => inRange(item.createdAt, yesterday, today)).length,
    last7Days: customerLeadsList.filter((item) => inRange(item.createdAt, sevenDays)).length,
    thisMonth: customerLeadsList.filter((item) => inRange(item.createdAt, month)).length
  };
  const source = {
    websiteForm: allInquiries.filter((item) => sourceOf(item) === "website_form").length,
    manual: allInquiries.filter((item) => sourceOf(item) === "manual").length,
    whatsappForm: whatsappButtonFormList.length,
    whatsappClickLeads: unconvertedWhatsappClicks.length,
    whatsappConvertedClicks: convertedWhatsappClicks.length,
    whatsappClickConversionRate: whatsappClicks.length ? Math.round((convertedWhatsappClicks.length / whatsappClicks.length) * 100) + "%" : "0%",
    allLeads: customerLeadsList.length,
    whatsappRawClicks: whatsappClickRows.length
  };
  const assignment = {
    unassigned: customerLeadsList.filter(isUnassigned).length,
    assigned: customerLeadsList.filter(isAssigned).length,
    admin_chen: countAssignedTo("admin_chen"),
    sales_zheng: countAssignedTo("sales_zheng")
  };
  const status = {
    new: countNew(),
    contacted: countStatus("contacted"),
    quoted: countStatus("quoted"),
    waiting: countStatus("waiting"),
    won: countStatus("won"),
    lost: countStatus("lost"),
    closed: countStatus("closed")
  };
  const tabs = {
    websiteForm: source.websiteForm,
    manual: source.manual,
    whatsappClick: unconvertedWhatsappClicks.length,
    all: customerLeadsList.length
  };
  const dueToday = customerLeadsList.filter((item) => isInquiryDueToday(item, today, tomorrow)).length;
  const assignedToday = isAdmin(user) ? 0 : customerLeadsList.filter((item) => inRange(item.assignedAt, today, tomorrow) || (item.assignmentHistory || []).some((entry) => userAssignmentKeys(user).has(assignmentKey(entry.to)) && inRange(entry.time, today, tomorrow))).length;
  return {
    customerLeads,
    source,
    assignment,
    status,
    tabs,
    total: customerLeads.total,
    allLeads: source.allLeads,
    tabWebsite: tabs.websiteForm,
    tabManual: tabs.manual,
    tabWhatsapp: tabs.whatsappClick,
    tabAll: tabs.all,
    today: customerLeads.today,
    yesterday: customerLeads.yesterday,
    last7Days: customerLeads.last7Days,
    thisMonth: customerLeads.thisMonth,
    websiteForm: source.websiteForm,
    manual: source.manual,
    unassigned: assignment.unassigned,
    assigned: assignment.assigned,
    assigned_admin_chen: assignment.admin_chen,
    assigned_sales_zheng: assignment.sales_zheng,
    whatsappClickTotal: source.whatsappRawClicks,
    whatsappLead: source.whatsappClickLeads,
    whatsappPending: whatsappClickRows.length,
    whatsappToday: whatsappClickRows.filter((item) => inRange(item.createdAt, today, tomorrow)).length,
    whatsappLast7Days: whatsappClickRows.filter((item) => inRange(item.createdAt, sevenDays)).length,
    whatsappThisMonth: whatsappClickRows.filter((item) => inRange(item.createdAt, month)).length,
    todayAssigned: assignedToday,
    todayDue: dueToday,
    dueToday,
    new: status.new,
    contacted: status.contacted,
    quoted: status.quoted,
    waiting: status.waiting,
    won: status.won,
    lost: status.lost,
    closed: status.closed
  };
};
const csvEscape = (value) => `"${String(value ?? "").replace(/"/g, '""')}"`;
const notesText = (item) => (Array.isArray(item.notes) ? item.notes.map((note) => `${note.createdAt || ""} ${note.authorName || ""}: ${note.text || ""}`.trim()).join(" | ") : firstValue(item.note));
const sendCsv = async (res, filename, rows) => {
  const header = ["时间", "客户", "国家", "市场", "WhatsApp", "Email", "车型", "数量", "FOB/CIF", "目的港", "留言", "来源页面", "来源", "来源细分", "状态", "负责人", "备注"];
  const users = await readAdminUsers();
  const userName = (id) => users.find((user) => user.id === id)?.name || "未分配";
  const lines = [header, ...rows.map((item) => [
    item.createdAt, item.name, item.country, item.market, item.whatsapp, item.email, item.interestedModel, item.quantity, item.quoteType,
    item.destinationPort, item.message, item.pageUrl, item.source, item.sourceDetail, item.status, userName(item.assignedTo), notesText(item)
  ])].map((row) => row.map(csvEscape).join(","));
  res.writeHead(200, {
    ...noCacheHeaders,
    "Content-Type": "text/csv; charset=utf-8",
    "Content-Disposition": `attachment; filename="${filename}"`
  });
  res.end("\uFEFF" + lines.join("\r\n"));
};
const publicUrlFor = (absolutePath) => `/${path.relative(ROOT, absolutePath).replace(/\\/g, "/")}`;
const sendJson = (res, status, data) => {
  res.writeHead(status, { ...noCacheHeaders, "Content-Type": "application/json; charset=utf-8" });
  res.end(JSON.stringify(data));
};
const sendAdminOnlyForbidden = (res) => sendJson(res, 403, { success: false, error: "Forbidden: admin only" });
const sendForbiddenPage = (res, message = "当前账号无权访问该功能。") => {
  res.writeHead(403, { ...noCacheHeaders, "Content-Type": "text/html; charset=utf-8" });
  res.end(`<!DOCTYPE html><html lang="zh-CN"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"><title>无权访问</title><style>body{margin:0;background:#f5f7fb;color:#172033;font-family:Arial,"Microsoft YaHei",sans-serif}.shell{width:min(680px,calc(100% - 32px));margin:56px auto;padding:24px;border:1px solid #e3e8f2;border-radius:8px;background:#fff;box-shadow:0 10px 28px rgba(15,23,42,.06)}h1{margin:0 0 10px;font-size:26px}p{margin:0 0 16px;color:#667085;line-height:1.6}.btn{min-height:36px;padding:0 12px;border-radius:7px;border:1px solid #153f75;background:#153f75;color:#fff;text-decoration:none;font-weight:700;display:inline-flex;align-items:center}</style></head><body><main class="shell"><h1>无权访问</h1><p>${message}</p><a class="btn" href="/admin/">返回销售首页</a></main></body></html>`);
};
const sendJsonWithHeaders = (res, status, data, headers = {}) => {
  res.writeHead(status, { ...noCacheHeaders, ...headers, "Content-Type": "application/json; charset=utf-8" });
  res.end(JSON.stringify(data));
};
const handleGetWhatsappSettings = async (_req, res) => {
  const settings = await readWhatsappSettings();
  return sendJson(res, 200, { success: true, settings });
};
const handleSaveWhatsappSettings = async (req, res, adminUser = null) => {
  const body = await parseJsonBody(req);
  const updatedAt = new Date().toISOString();
  const updatedBy = firstValue(adminUser?.name, adminUser?.username, adminUser?.id, "admin");
  const settings = normalizeWhatsappSettings(body, { updatedAt, updatedBy });
  await writeWhatsappSettings(settings);
  return sendJson(res, 200, { success: true, settings });
};
const handlePublicWhatsappConfig = async (_req, res) => {
  const settings = await readWhatsappSettings();
  return sendJson(res, 200, publicWhatsappSettings(settings));
};
const handlePublicWhatsappLink = async (req, res) => {
  const requestUrl = new URL(req.url, `http://${req.headers.host || "localhost"}`);
  const settings = await readWhatsappSettings();
  return sendJson(res, 200, buildWhatsappLinkPayload(settings, queryParamsObject(requestUrl.searchParams)));
};
const handlePublicWhatsappLeadStatus = async (_req, res) => sendJson(res, 200, {
  success: true,
  route: "/api/public/whatsapp-lead",
  postEnabled: true,
  crmDataFile: relFromRoot(INQUIRIES_PATH),
  serverTime: new Date().toISOString()
});
const adminPageKey = (pathname = "") => {
  if (pathname === "/admin") return "/admin/";
  if (pathname.startsWith("/admin/") && !pathname.endsWith("/") && !path.extname(pathname)) return pathname + ".html";
  return pathname;
};
const isAdminOnlyPagePath = (pathname = "") => ADMIN_ONLY_PAGE_PATHS.has(adminPageKey(pathname));
const adminAliasPath = (pathname = "") => ADMIN_PAGE_ALIASES.get(adminPageKey(pathname)) || pathname;
const pathMatchesPrefix = (pathname = "", prefix = "") => pathname === prefix || pathname.startsWith(prefix + "/");
const isAdminOnlyApiPath = (pathname = "") => ADMIN_ONLY_API_EXACT_PATHS.has(pathname) || ADMIN_ONLY_API_PATHS.some((prefix) => pathMatchesPrefix(pathname, prefix));
const requireAdminMediaApi = async (req, res) => {
  const user = await requireAdminUser(req);
  if (!isAdmin(user)) { sendAdminOnlyForbidden(res); return null; }
  return user;
};
const handlePublicWhatsappLead = async (req, res) => {
  const body = await parseJsonBody(req);
  try {
    const result = await appendWhatsappFormLead(body, req);
    if (result.skipped) return sendJson(res, 200, { success: true, skipped: true, message: "Inquiry received." });
    if (result.duplicate) return sendJson(res, 200, { success: true, duplicate: true, id: result.inquiry.id, message: "Your inquiry has already been received.", inquiry: result.inquiry });
    return sendJson(res, 200, { success: true, duplicate: false, id: result.inquiry.id, message: "Inquiry received.", inquiry: result.inquiry });
  } catch (error) {
    if (!error.logged) {
      await appendWhatsappLeadSubmitLog({
        name: firstValue(body.name),
        rawWhatsapp: firstValue(body.rawWhatsapp, body.raw_whatsapp, body.whatsapp, body.phone, body.mobile),
        whatsapp: firstValue(body.whatsapp, body.phone, body.mobile),
        vehicle: firstValue(body.vehicle, body.interestedModel, body.model),
        sourcePage: firstValue(body.sourcePage, body.page, body.pageUrl),
        sourceButton: firstValue(body.sourceButton, "WhatsApp button"),
        leadSessionId: firstValue(body.leadSessionId, body.lead_session_id),
        action: "rejected",
        reason: error.message
      });
    }
    throw error;
  }
};
const buildCustomerWhatsappMessage = (inquiry = {}) => {
  const name = firstValue(inquiry.name, "there");
  const vehicle = firstValue(inquiry.interestedModel, inquiry.vehicle);
  if (vehicle) return "Hello " + name + ", this is Zhonggu Auto Export. We received your inquiry about " + vehicle + ". Could you please confirm the quantity, destination port and whether you need FOB or CIF quotation?";
  return "Hello " + name + ", this is Zhonggu Auto Export. We received your inquiry from our website. Could you please tell us which vehicle model you are interested in?";
};
const handleContactWhatsappCustomer = async (id, user, res) => {
  const loaded = await getInquiryByIdForUser(id, user);
  const items = loaded.items;
  const index = loaded.index;
  const current = loaded.current;
  const normalized = normalizeCustomerWhatsapp(firstValue(current.whatsapp, current.rawWhatsapp));
  const now = new Date().toISOString();
  const noteText = firstValue(user.name, user.username, user.id, "admin") + " opened WhatsApp contact at " + now;
  const next = {
    ...current,
    whatsapp: normalized.whatsapp,
    rawWhatsapp: firstValue(current.rawWhatsapp, current.whatsapp),
    lastContactedAt: now,
    lastFollowUpAt: now,
    status: ["new", "assigned", "whatsapp_lead"].includes(current.status) ? "contacted" : current.status,
    notes: [...(Array.isArray(current.notes) ? current.notes : []), { createdAt: now, authorId: user.id, authorName: firstValue(user.name, user.username, user.id), type: "contact", text: noteText }],
    note: noteText,
    updatedAt: now
  };
  items[index] = normalizeInquiryRecord(next, index);
  await writeInquiries(items);
  const message = buildCustomerWhatsappMessage(next);
  const url = "https://wa.me/" + normalized.whatsapp + "?text=" + encodeURIComponent(message);
  return sendJson(res, 200, { success: true, url, message, inquiry: items[index] });
};
const redirectToLogin = (res) => {
  res.writeHead(302, { ...noCacheHeaders, Location: "/admin/login.html" });
  res.end();
};

const isAuthorized = (req, body = {}) => {
  const url = new URL(req.url, `http://${req.headers.host || "localhost"}`);
  const provided = req.headers["x-media-password"] || body.password || url.searchParams.get("password");
  return Boolean(PASSWORD) && provided === PASSWORD;
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
  const text = body.toString("utf8");
  const contentType = String(req.headers["content-type"] || "");
  if (contentType.includes("application/x-www-form-urlencoded")) {
    return Object.fromEntries(new URLSearchParams(text));
  }
  return JSON.parse(text);
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

const readJsonSafe = async (filePath, fallback) => {
  try {
    let raw = await fsp.readFile(filePath, "utf8");
    if (raw.charCodeAt(0) === 0xFEFF) raw = raw.slice(1);
    return JSON.parse(raw);
  } catch {
    return fallback;
  }
};
const writeJsonFile = async (filePath, data) => {
  await fsp.mkdir(path.dirname(filePath), { recursive: true });
  await fsp.writeFile(filePath, JSON.stringify(data, null, 2) + "\n", "utf8");
};
const cleanPublicPath = (value = "") => String(value || "").replace(/^\/+/, "").replace(/\\/g, "/");
const pickFirstText = (value, fallback = "") => {
  if (value && typeof value === "object" && !Array.isArray(value)) return value.en || Object.values(value).find(Boolean) || fallback;
  return value || fallback;
};
const isPlaceholderVehicleImage = (value = "") => /generic-new-car-bg|new-car-image|suv-0|kia-suv|placeholder|hero-car/i.test(String(value));
const publicImageExists = async (value = "") => {
  const clean = cleanPublicPath(value);
  if (!clean || clean.includes("..")) return false;
  return fsp.stat(path.join(ROOT, clean)).then((stat) => stat.isFile()).catch(() => false);
};
const resolveVehicleImageForAdmin = async (car, manualMap) => {
  const manual = manualMap?.[car.id];
  const manualImage = cleanPublicPath(pickFirstText(manual?.image, ""));
  if (manual?.confirmed === true && manualImage && !isPlaceholderVehicleImage(manualImage) && await publicImageExists(manualImage)) {
    return { image: manualImage, source: "manual", is_fallback: false, confirmed: true };
  }
  const candidates = [
    ["primary_image", car.primary_image],
    ["image", car.image],
    ["images[0]", Array.isArray(car.images) ? car.images[0] : ""],
    ["gallery[0]", Array.isArray(car.gallery) ? car.gallery[0] : ""],
    ["coverImage", car.coverImage]
  ];
  for (const [source, raw] of candidates) {
    const image = cleanPublicPath(pickFirstText(raw, ""));
    if (image && !isPlaceholderVehicleImage(image) && await publicImageExists(image)) return { image, source, is_fallback: false, confirmed: false };
  }
  return { image: IMAGE_FALLBACK, source: "fallback", is_fallback: true, confirmed: false };
};
const getPngSize = (buffer) => buffer.length > 24 && buffer.toString("ascii", 1, 4) === "PNG" ? { width: buffer.readUInt32BE(16), height: buffer.readUInt32BE(20) } : null;
const getGifSize = (buffer) => buffer.length > 10 && buffer.toString("ascii", 0, 3) === "GIF" ? { width: buffer.readUInt16LE(6), height: buffer.readUInt16LE(8) } : null;
const getJpegSize = (buffer) => {
  if (buffer.length < 4 || buffer[0] !== 0xFF || buffer[1] !== 0xD8) return null;
  let offset = 2;
  while (offset + 9 < buffer.length) {
    if (buffer[offset] !== 0xFF) return null;
    const marker = buffer[offset + 1];
    const length = buffer.readUInt16BE(offset + 2);
    if (marker >= 0xC0 && marker <= 0xC3) return { height: buffer.readUInt16BE(offset + 5), width: buffer.readUInt16BE(offset + 7) };
    offset += 2 + length;
  }
  return null;
};
const getImageSize = async (absolutePath) => {
  try {
    const buffer = await fsp.readFile(absolutePath);
    return getPngSize(buffer) || getGifSize(buffer) || getJpegSize(buffer) || { width: "", height: "" };
  } catch {
    return { width: "", height: "" };
  }
};
const listFilesRecursive = async (dir, pattern = /\.(jpe?g|png|webp|gif)$/i) => {
  const absoluteDir = path.join(ROOT, dir);
  const entries = await fsp.readdir(absoluteDir, { withFileTypes: true }).catch(() => []);
  const files = [];
  for (const entry of entries) {
    const rel = path.join(dir, entry.name).replace(/\\/g, "/");
    if (entry.isDirectory()) files.push(...await listFilesRecursive(rel, pattern));
    else if (pattern.test(entry.name)) files.push(rel);
  }
  return files;
};
const listRootImagesOnly = async () => {
  const entries = await fsp.readdir(path.join(ROOT, "images"), { withFileTypes: true }).catch(() => []);
  return entries.filter((entry) => entry.isFile() && /\.(jpe?g|png|webp|gif)$/i.test(entry.name)).map((entry) => "images/" + entry.name);
};
const sourceDirForImage = (rel) => {
  const normalized = cleanPublicPath(rel);
  return ["media-trash/images", "images/new-cars", "images/used-cars", "images/company", "images/hero", "media-processed/images", "media-processed/videos", "videos/used-cars", "images"].find((dir) => normalized === dir || normalized.startsWith(dir + "/")) || "";
};
const imageCategoryFor = (rel) => {
  const normalized = cleanPublicPath(rel).toLowerCase();
  const filename = path.basename(normalized);
  const has = (...parts) => parts.some((part) => normalized.includes(part) || filename.includes(part));
  if (normalized === "images/hero/hero-car.jpg" || has("placeholder", "fallback", "default", "generic-new-car-bg", "new-car-image", "suv-0", "kia-suv", "hero-car")) return "fallback";
  if (normalized.startsWith(IMAGE_TRASH_DIR + "/")) return "trash";
  if (normalized.startsWith("images/used-cars/")) return "used_car";
  if (normalized.startsWith("images/new-cars/")) return "new_car";
  if (normalized.startsWith("media-processed/images/")) return "temp_image";
  if (normalized.startsWith("images/company/")) return "company";
  if (normalized.startsWith("images/hero/")) return "hero";
  if (normalized.startsWith("images/") && !normalized.slice("images/".length).includes("/")) return "unorganized";
  if (has("delivery", "showroom", "handover", "export-loading", "warehouse")) return "delivery";
  return "other";
};
const isImagePath = (rel = "") => /\.(jpe?g|png|webp|gif)$/i.test(cleanPublicPath(rel));
const imageUsageFor = async (rel) => {
  const target = cleanPublicPath(rel);
  const manualMap = await ensureManualImageMap();
  const cars = await loadAdminVehicles({ type: "new" });
  const usedBy = [];
  for (const car of cars) {
    const sources = [["manual", manualMap?.[car.id]?.image], ["primary_image", car.primary_image], ["image", car.image], ["imageUrl", car.imageUrl], ["mainImage", car.mainImage], ["imageSource", car.imageSource], ["coverImage", car.coverImage], ["images[0]", Array.isArray(car.images) ? car.images[0] : ""], ["gallery[0]", Array.isArray(car.gallery) ? car.gallery[0] : ""]];
    for (const [field, value] of sources) {
      const clean = cleanPublicPath(pickFirstText(value, ""));
      if (clean && clean === target) { usedBy.push({ slug: car.id, brand: pickFirstText(car.brand), model: pickFirstText(car.model || car.name || car.title), field }); break; }
    }
  }
  return usedBy;
};
const mediaItemFor = async (rel, type = "image") => {
  const stat = await fsp.stat(path.join(ROOT, rel)).catch(() => null);
  const size = type === "image" ? await getImageSize(path.join(ROOT, rel)) : { width: 0, height: 0 };
  const usedBy = type === "image" ? await imageUsageFor(rel) : [];
  return { path: rel, filename: path.basename(rel), type, bytes: stat?.size || 0, width: size.width || 0, height: size.height || 0, source_dir: sourceDirForImage(rel), category: type === "video" ? "video" : imageCategoryFor(rel), used_by: usedBy, is_used: usedBy.length > 0, in_trash: cleanPublicPath(rel).startsWith(IMAGE_TRASH_DIR + "/") };
};
const listAvailableImages = async () => {
  const dirs = ["images/new-cars", "media-processed/images", "images/company", "images/hero", IMAGE_TRASH_DIR];
  const relPaths = [...new Set([...(await Promise.all(dirs.map((dir) => listFilesRecursive(dir)))).flat(), ...(await listRootImagesOnly())])].sort((a, b) => a.localeCompare(b));
  return await Promise.all(relPaths.map((rel) => mediaItemFor(rel, "image")));
};
const listUsedCarMediaLibrary = async () => {
  const imageDirs = ["images/used-cars", "media-processed/images"];
  const videoDirs = ["videos/used-cars", "media-processed/videos"];
  const images = [...new Set((await Promise.all(imageDirs.map((dir) => listFilesRecursive(dir)))).flat())].sort((a, b) => a.localeCompare(b));
  const videos = [...new Set((await Promise.all(videoDirs.map((dir) => listFilesRecursive(dir, /\.(mp4|webm|mov|m4v)$/i)))).flat())].sort((a, b) => a.localeCompare(b));
  return { images: await Promise.all(images.map((rel) => mediaItemFor(rel, "image"))), videos: await Promise.all(videos.map((rel) => mediaItemFor(rel, "video"))) };
};
const normalizeVehicleRecordForAdmin = (car = {}) => {
  const slug = String(car.id || car.slug || car.vehicle_slug || "").trim();
  return slug ? { ...car, id: slug } : null;
};
const flattenGroupedCars = (value) => {
  if (Array.isArray(value)) return value;
  if (!value || typeof value !== "object") return [];
  return Object.values(value).flatMap((item) => Array.isArray(item) ? item : flattenGroupedCars(item));
};
const vehicleTypeForAdmin = (car = {}) => {
  const value = String(car.category || car.type || car.status || "").toLowerCase();
  if (value.includes("used")) return "used";
  if (String(car.id || "").startsWith("used-")) return "used";
  return "new";
};
const loadAdminVehicles = async ({ type = "new" } = {}) => {
  const sources = [
    await readJsonSafe(CARS_PATH, []),
    flattenGroupedCars(await readJsonSafe(GROUPED_CARS_PATH, [])),
    await readJsonSafe(RAW_CARS_PATH, [])
  ];
  const bySlug = new Map();
  for (const car of sources.flat()) {
    const normalized = normalizeVehicleRecordForAdmin(car);
    if (normalized && vehicleTypeForAdmin(normalized) === type && !bySlug.has(normalized.id)) bySlug.set(normalized.id, normalized);
  }
  return Array.from(bySlug.values());
};
const ensureManualImageMap = async () => {
  await fsp.mkdir(path.dirname(MANUAL_IMAGE_MAP_PATH), { recursive: true });
  const exists = await fsp.access(MANUAL_IMAGE_MAP_PATH).then(() => true).catch(() => false);
  if (!exists) await writeJsonFile(MANUAL_IMAGE_MAP_PATH, {});
  return await readJsonSafe(MANUAL_IMAGE_MAP_PATH, {});
};
const imageMappingPayload = async () => {
  const cars = await loadAdminVehicles({ type: "new" });
  const manualMap = await ensureManualImageMap();
  const vehicles = [];
  for (const car of cars.filter((item) => item.id)) {
    const resolved = await resolveVehicleImageForAdmin(car, manualMap);
    vehicles.push({
      slug: car.id,
      brand: pickFirstText(car.brand),
      model: pickFirstText(car.model || car.name || car.title),
      trim: pickFirstText(car.configuration || car.trimEn || car.trim || car.year || car.modelYear),
      price: pickFirstText(car.fobNanShaUsd || car.fobPriceDisplay || car.price || car.fobRange),
      current_image: resolved.image,
      image_source: resolved.source,
      using_fallback: resolved.is_fallback,
      is_fallback: resolved.is_fallback,
      confirmed: Boolean(manualMap?.[car.id]?.confirmed),
      manual_image: cleanPublicPath(pickFirstText(manualMap?.[car.id]?.image, "")),
      note: manualMap?.[car.id]?.note || ""
    });
  }
  return { vehicles, manual_map: manualMap, manualMap };
};
const handleGetImageMapping = async (res) => sendJson(res, 200, { success: true, ...(await imageMappingPayload()) });
const handleGetAvailableImages = async (res) => sendJson(res, 200, { success: true, images: await listAvailableImages() });
const handleSaveImageMapping = async (req, res) => {
  const body = await parseJsonBody(req);
  const slug = String(body.slug || "").trim();
  const image = cleanPublicPath(body.image || "");
  if (!slug) return sendJson(res, 400, { success: false, error: "Missing slug" });
  if (!image) return sendJson(res, 400, { success: false, error: "Missing image" });
  const cars = await loadAdminVehicles({ type: "new" });
  if (!cars.some((car) => car.id === slug)) return sendJson(res, 404, { success: false, error: "New vehicle slug not found" });
  if (image.includes("..") || !(await publicImageExists(image))) return sendJson(res, 400, { success: false, error: "Image path does not exist in project" });
  const manualMap = await ensureManualImageMap();
  manualMap[slug] = { image, confirmed: body.confirmed === true, note: String(body.note || ""), updated_at: new Date().toISOString() };
  await writeJsonFile(MANUAL_IMAGE_MAP_PATH, manualMap);
  return sendJson(res, 200, { success: true, message: "Saved", entry: manualMap[slug] });
};
const handleDeleteImageMapping = async (slug, res) => {
  const cleanSlug = decodeURIComponent(String(slug || "")).trim();
  if (!cleanSlug) return sendJson(res, 400, { success: false, error: "Missing slug" });
  const manualMap = await ensureManualImageMap();
  if (Object.prototype.hasOwnProperty.call(manualMap, cleanSlug)) {
    delete manualMap[cleanSlug];
    await writeJsonFile(MANUAL_IMAGE_MAP_PATH, manualMap);
  }
  return sendJson(res, 200, { success: true, message: "Deleted", slug: cleanSlug });
};

const IMAGE_LIBRARY_MOVE_DIRS = ["images/new-cars", "media-processed/images", "images/company", "images/hero"];
const IMAGE_LIBRARY_ERROR_LOG = path.join(ROOT, "tmp", "image-library-error.log");
const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const isUnderDir = (rel, dir) => rel === dir || rel.startsWith(dir + "/");
const logImageLibraryError = async ({ operation, source, target, error }) => {
  await fsp.mkdir(path.dirname(IMAGE_LIBRARY_ERROR_LOG), { recursive: true });
  const entry = [
    `[${new Date().toISOString()}] ${operation}`,
    `source=${source || ""}`,
    `target=${target || ""}`,
    `code=${error?.code || ""}`,
    `message=${error?.message || error || ""}`,
    ""
  ].join("\n");
  await fsp.appendFile(IMAGE_LIBRARY_ERROR_LOG, entry, "utf8").catch(() => {});
};
const retryFs = async (fn) => {
  const waits = [0, 300, 800];
  let lastError;
  for (const wait of waits) {
    if (wait) await delay(wait);
    try { return await fn(); } catch (error) { lastError = error; }
  }
  throw lastError;
};
const safeImageLibraryPath = async (rel, { mustBeTrash = false, allowedDirs = null } = {}) => {
  const clean = cleanPublicPath(rel);
  if (!clean || clean.includes("..") || path.isAbsolute(clean) || !isImagePath(clean)) return { ok: false, error: "图片路径不合法" };
  if (mustBeTrash && !isUnderDir(clean, IMAGE_TRASH_DIR)) return { ok: false, error: "只允许操作废弃图片目录" };
  if (allowedDirs && !allowedDirs.some((dir) => isUnderDir(clean, dir))) return { ok: false, error: "该图片不在允许移动的安全目录内" };
  const absolute = path.resolve(ROOT, clean);
  const root = path.resolve(ROOT) + path.sep;
  if (!absolute.startsWith(root)) return { ok: false, error: "图片路径越界" };
  const stat = await fsp.stat(absolute).catch(() => null);
  if (!stat?.isFile()) return { ok: false, error: "图片文件不存在" };
  return { ok: true, clean, absolute, size: stat.size };
};
const uniqueDestination = async (dir, filename, suffix = "restored") => {
  const ext = path.extname(filename);
  const base = path.basename(filename, ext);
  let candidate = path.join(ROOT, dir, filename);
  let index = 1;
  while (await fsp.access(candidate).then(() => true).catch(() => false)) {
    candidate = path.join(ROOT, dir, `${base}-${suffix}-${index}${ext}`);
    index += 1;
  }
  return candidate;
};
const readPathBody = async (req) => {
  if (req.method === "GET" || req.method === "DELETE") {
    const requestUrl = new URL(req.url, "http://" + (req.headers.host || "localhost"));
    return cleanPublicPath(requestUrl.searchParams.get("path") || "");
  }
  const body = await parseJsonBody(req);
  return cleanPublicPath(body.path || "");
};
const safeMoveFile = async (source, target) => {
  try {
    await retryFs(() => fsp.rename(source, target));
    return { moved: true, method: "rename" };
  } catch (renameError) {
    if (!["EPERM", "EXDEV", "EACCES", "ENOENT"].includes(renameError?.code)) throw renameError;
    await retryFs(() => fsp.copyFile(source, target));
    const targetStat = await fsp.stat(target).catch(() => null);
    if (!targetStat?.isFile() || targetStat.size <= 0) throw new Error("复制到废弃区后校验失败");
    try {
      await retryFs(() => fsp.unlink(source));
      return { moved: true, method: "copy-unlink", fallbackFrom: renameError.code };
    } catch (unlinkError) {
      unlinkError.partialCopy = true;
      unlinkError.renameCode = renameError.code;
      throw unlinkError;
    }
  }
};
const handleImageLibraryUsage = async (req, res) => {
  const requestUrl = new URL(req.url, "http://" + (req.headers.host || "localhost"));
  const imagePath = cleanPublicPath(requestUrl.searchParams.get("path") || "");
  if (!imagePath || imagePath.includes("..") || !isImagePath(imagePath)) return sendJson(res, 400, { success: false, error: "图片路径不合法" });
  const usedBy = await imageUsageFor(imagePath);
  return sendJson(res, 200, { success: true, path: imagePath, is_used: usedBy.length > 0, used_by: usedBy });
};
const handleMoveImageToTrash = async (req, res) => {
  const imagePath = await readPathBody(req);
  const safe = await safeImageLibraryPath(imagePath, { allowedDirs: IMAGE_LIBRARY_MOVE_DIRS });
  if (!safe.ok) return sendJson(res, 400, { success: false, error: safe.error });
  const usedBy = await imageUsageFor(safe.clean);
  if (usedBy.length) return sendJson(res, 409, { success: false, error: "该图片正在被车型使用，请先解除映射后再移入废弃区。", used_by: usedBy });
  await fsp.mkdir(path.join(ROOT, IMAGE_TRASH_DIR), { recursive: true });
  const destination = await uniqueDestination(IMAGE_TRASH_DIR, path.basename(safe.clean), "trash");
  try {
    const result = await safeMoveFile(safe.absolute, destination);
    const newPath = path.relative(ROOT, destination).replace(/\\/g, "/");
    return sendJson(res, 200, { success: true, message: result.method === "rename" ? "图片已移入废弃区" : "图片已通过复制方式移入废弃区", path: newPath, renamed: path.basename(newPath) !== path.basename(safe.clean), move_method: result.method });
  } catch (error) {
    await logImageLibraryError({ operation: "move-to-trash", source: safe.absolute, target: destination, error });
    if (error.partialCopy) return sendJson(res, 500, { success: false, code: error.code, error: "图片已复制到废弃区，但原文件被占用，暂时无法删除。请关闭预览或刷新后重试。" });
    if (["EPERM", "EACCES"].includes(error?.code)) return sendJson(res, 500, { success: false, code: error.code, error: "系统暂时不允许移动该图片，可能是文件正在被占用。请关闭图片预览、资源管理器预览窗口或稍后重试。" });
    return sendJson(res, 500, { success: false, code: error?.code || "MOVE_FAILED", error: "移入废弃区失败，请查看 tmp/image-library-error.log。" });
  }
};
const handleRestoreImageFromTrash = async (req, res) => {
  const imagePath = await readPathBody(req);
  const safe = await safeImageLibraryPath(imagePath, { mustBeTrash: true });
  if (!safe.ok) return sendJson(res, 400, { success: false, error: safe.error });
  await fsp.mkdir(path.join(ROOT, NEW_CAR_IMAGE_DIR), { recursive: true });
  const destination = await uniqueDestination(NEW_CAR_IMAGE_DIR, path.basename(safe.clean), "restored");
  try {
    const result = await safeMoveFile(safe.absolute, destination);
    const newPath = path.relative(ROOT, destination).replace(/\\/g, "/");
    return sendJson(res, 200, { success: true, message: "已恢复到新车图库", path: newPath, renamed: path.basename(newPath) !== path.basename(safe.clean), move_method: result.method });
  } catch (error) {
    await logImageLibraryError({ operation: "restore", source: safe.absolute, target: destination, error });
    return sendJson(res, 500, { success: false, code: error?.code || "RESTORE_FAILED", error: "恢复图片失败，请查看 tmp/image-library-error.log。" });
  }
};
const handleDeleteTrashImage = async (req, res) => {
  const imagePath = await readPathBody(req);
  const safe = await safeImageLibraryPath(imagePath, { mustBeTrash: true });
  if (!safe.ok) return sendJson(res, 400, { success: false, error: safe.error });
  const usedBy = await imageUsageFor(safe.clean);
  if (usedBy.length) return sendJson(res, 409, { success: false, error: "该图片正在被车型使用，禁止永久删除。", used_by: usedBy });
  try {
    await retryFs(() => fsp.unlink(safe.absolute));
    return sendJson(res, 200, { success: true, message: "已永久删除废弃图片", path: safe.clean });
  } catch (error) {
    await logImageLibraryError({ operation: "delete", source: safe.absolute, target: "", error });
    if (["EPERM", "EACCES"].includes(error?.code)) return sendJson(res, 500, { success: false, code: error.code, error: "系统暂时不允许删除该图片，可能是文件正在被占用。请关闭图片预览、资源管理器预览窗口或稍后重试。" });
    return sendJson(res, 500, { success: false, code: error?.code || "DELETE_FAILED", error: "永久删除失败，请查看 tmp/image-library-error.log。" });
  }
};const asArray = (value) => Array.isArray(value) ? value.filter(Boolean).map(cleanPublicPath) : [];
const uniquePaths = (items) => [...new Set(items.map(cleanPublicPath).filter(Boolean))];
const normalizeUsedCarMedia = (car = {}) => {
  const images = uniquePaths([...asArray(car.images), ...asArray(car.gallery), car.coverImage, car.mainImage, car.image, car.primary_image]);
  const videos = uniquePaths([...asArray(car.videos), car.video]);
  const coverImage = cleanPublicPath(car.coverImage || images[0] || car.image || car.mainImage || car.primary_image || "");
  return { ...car, images, videos, coverImage, mainImage: car.mainImage || coverImage, image: car.image || coverImage, primary_image: car.primary_image || coverImage, gallery: images };
};
const loadUsedCars = async () => (await readJsonSafe(USED_CARS_PATH, [])).map(normalizeUsedCarMedia);
const summarizeUsedCar = (car) => ({
  id: car.id, slug: car.id, brand: pickFirstText(car.brand), model: pickFirstText(car.model || car.name || car.title), title: pickFirstText(car.title) || [pickFirstText(car.brand), pickFirstText(car.model), car.year].filter(Boolean).join(" "), year: pickFirstText(car.year), price: pickFirstText(car.price || car.fobPriceDisplay || car.fobRange), coverImage: car.coverImage || IMAGE_FALLBACK, images_count: asArray(car.images).length, videos_count: asArray(car.videos).length
});
const writeUsedCarsAndSync = async (items) => {
  const normalized = items.map(normalizeUsedCarMedia);
  await writeJsonFile(USED_CARS_PATH, normalized);
  const syncFile = async (filePath) => {
    const list = await readJsonSafe(filePath, []);
    if (!Array.isArray(list)) return;
    const byId = new Map(normalized.map((car) => [car.id, car]));
    let changed = false;
    const next = list.map((item) => {
      const updated = byId.get(item.id);
      if (!updated) return item;
      changed = true;
      return { ...item, images: updated.images, videos: updated.videos, coverImage: updated.coverImage, mainImage: updated.mainImage, image: updated.image, primary_image: updated.primary_image, gallery: updated.gallery };
    });
    if (changed) await writeJsonFile(filePath, next);
  };
  await syncFile(CARS_PATH);
  await syncFile(RAW_CARS_PATH);
};
const findUsedCarIndex = (items, slug) => items.findIndex((car) => car.id === slug || car.slug === slug);
const handleGetUsedCars = async (res) => sendJson(res, 200, { success: true, vehicles: (await loadUsedCars()).map(summarizeUsedCar) });
const handleGetUsedCarMedia = async (slug, res) => {
  const cars = await loadUsedCars();
  const car = cars.find((item) => item.id === slug || item.slug === slug);
  if (!car) return sendJson(res, 404, { success: false, error: "Used car not found" });
  return sendJson(res, 200, { success: true, vehicle: summarizeUsedCar(car), media: { images: asArray(car.images), videos: asArray(car.videos), coverImage: car.coverImage || IMAGE_FALLBACK } });
};
const handleGetUsedCarMediaLibrary = async (res) => sendJson(res, 200, { success: true, ...(await listUsedCarMediaLibrary()) });
const updateUsedCarMedia = async (slug, mutator, res) => {
  const cars = await loadUsedCars();
  const index = findUsedCarIndex(cars, slug);
  if (index < 0) return sendJson(res, 404, { success: false, error: "Used car not found" });
  const updated = normalizeUsedCarMedia(await mutator({ ...cars[index] }));
  cars[index] = updated;
  await writeUsedCarsAndSync(cars);
  return sendJson(res, 200, { success: true, vehicle: summarizeUsedCar(updated), media: { images: updated.images, videos: updated.videos, coverImage: updated.coverImage || IMAGE_FALLBACK } });
};
const validateExistingMediaPath = async (rel, type) => {
  const clean = cleanPublicPath(rel);
  if (!clean || clean.includes("..")) return "";
  const okExt = type === "video" ? /\.(mp4|webm|mov|m4v)$/i.test(clean) : /\.(jpe?g|png|webp|gif)$/i.test(clean);
  if (!okExt) return "";
  const stat = await fsp.stat(path.join(ROOT, clean)).catch(() => null);
  return stat?.isFile() ? clean : "";
};
const handleAddUsedCarImage = async (req, slug, res) => {
  const body = await parseJsonBody(req);
  const image = await validateExistingMediaPath(body.path || body.image, "image");
  if (!image) return sendJson(res, 400, { success: false, error: "Image path does not exist in project" });
  return await updateUsedCarMedia(slug, (car) => ({ ...car, images: uniquePaths([...asArray(car.images), image]), coverImage: car.coverImage || image }), res);
};
const handleAddUsedCarVideo = async (req, slug, res) => {
  const body = await parseJsonBody(req);
  const video = await validateExistingMediaPath(body.path || body.video, "video");
  if (!video) return sendJson(res, 400, { success: false, error: "Video path does not exist in project" });
  return await updateUsedCarMedia(slug, (car) => ({ ...car, videos: uniquePaths([...asArray(car.videos), video]) }), res);
};
const handleSetUsedCarCover = async (req, slug, res) => {
  const body = await parseJsonBody(req);
  const image = await validateExistingMediaPath(body.path || body.image || body.coverImage, "image");
  if (!image) return sendJson(res, 400, { success: false, error: "Image path does not exist in project" });
  return await updateUsedCarMedia(slug, (car) => {
    const images = uniquePaths([...asArray(car.images), image]);
    return { ...car, images, coverImage: image, mainImage: image, image, primary_image: image, gallery: images };
  }, res);
};
const handleRemoveUsedCarImage = async (req, slug, res) => {
  const requestUrl = new URL(req.url, 'http://' + (req.headers.host || 'localhost'));
  const image = cleanPublicPath(requestUrl.searchParams.get("path") || "");
  if (!image) return sendJson(res, 400, { success: false, error: "Missing image path" });
  return await updateUsedCarMedia(slug, (car) => {
    const images = asArray(car.images).filter((item) => item !== image);
    const coverImage = car.coverImage === image ? (images[0] || "") : car.coverImage;
    return { ...car, images, coverImage, mainImage: coverImage, image: coverImage, primary_image: coverImage, gallery: images };
  }, res);
};
const handleRemoveUsedCarVideo = async (req, slug, res) => {
  const requestUrl = new URL(req.url, 'http://' + (req.headers.host || 'localhost'));
  const video = cleanPublicPath(requestUrl.searchParams.get("path") || "");
  if (!video) return sendJson(res, 400, { success: false, error: "Missing video path" });
  return await updateUsedCarMedia(slug, (car) => ({ ...car, videos: asArray(car.videos).filter((item) => item !== video) }), res);
};

const validateMediaList = async (items, type) => {
  const results = [];
  for (const item of asArray(items)) {
    const valid = await validateExistingMediaPath(item, type);
    if (!valid) throw new Error((type === "video" ? "Video" : "Image") + " path does not exist in project: " + item);
    results.push(valid);
  }
  return uniquePaths(results);
};
const handleSaveUsedCarMedia = async (req, slug, res) => {
  const body = await parseJsonBody(req);
  const replaceImages = Array.isArray(body.images);
  const replaceVideos = Array.isArray(body.videos);
  const imageInput = replaceImages ? body.images : [body.image, body.path && body.type !== "video" ? body.path : ""].filter(Boolean);
  const videoInput = replaceVideos ? body.videos : [body.video, body.path && body.type === "video" ? body.path : ""].filter(Boolean);
  const imagesToApply = await validateMediaList(imageInput, "image");
  const videosToApply = await validateMediaList(videoInput, "video");
  const coverInput = body.coverImage || body.cover || "";
  const coverImage = coverInput ? await validateExistingMediaPath(coverInput, "image") : "";
  if (coverInput && !coverImage) return sendJson(res, 400, { success: false, error: "Cover image path does not exist in project" });
  return await updateUsedCarMedia(slug, (car) => {
    const images = replaceImages ? uniquePaths([coverImage, ...imagesToApply]) : uniquePaths([...asArray(car.images), ...imagesToApply, coverImage]);
    const videos = replaceVideos ? uniquePaths(videosToApply) : uniquePaths([...asArray(car.videos), ...videosToApply]);
    const nextCover = coverImage || car.coverImage || images[0] || "";
    return { ...car, images, videos, coverImage: nextCover, mainImage: nextCover || car.mainImage, image: nextCover || car.image, primary_image: nextCover || car.primary_image, gallery: images };
  }, res);
};
const handleRemoveUsedCarMedia = async (req, slug, res) => {
  const body = await parseJsonBody(req);
  const mediaType = body.type || (body.video ? "video" : "image");
  const mediaPath = cleanPublicPath(body.path || body.image || body.video || "");
  if (!mediaPath) return sendJson(res, 400, { success: false, error: "Missing media path" });
  if (mediaType === "video") return await updateUsedCarMedia(slug, (car) => ({ ...car, videos: asArray(car.videos).filter((item) => item !== mediaPath) }), res);
  return await updateUsedCarMedia(slug, (car) => {
    const images = asArray(car.images).filter((item) => item !== mediaPath);
    const coverImage = car.coverImage === mediaPath ? (images[0] || "") : car.coverImage;
    return { ...car, images, coverImage, mainImage: coverImage, image: coverImage, primary_image: coverImage, gallery: images };
  }, res);
};

const summarizeOutput = (value = "") => String(value || "").split(/\r?\n/).filter(Boolean).slice(-40).join("\n");
const handleRegenerateVehiclePages = async (req, res) => {
  await new Promise((resolve) => req.resume().on("end", resolve));
  execFile(process.execPath, [path.join(ROOT, "scripts", "generate-vehicle-pages.js")], { cwd: ROOT, timeout: 120000, maxBuffer: 1024 * 1024 }, (error, stdout = "", stderr = "") => {
    if (error) {
      return sendJson(res, 500, { success: false, error: "车型页面重新生成失败", code: error.code || "REGENERATE_FAILED", stdout: summarizeOutput(stdout), stderr: summarizeOutput(stderr || error.message) });
    }
    return sendJson(res, 200, { success: true, message: "车型页面已重新生成", stdout: summarizeOutput(stdout), stderr: summarizeOutput(stderr) });
  });
};
const COLLECTOR_TOKEN_ALIASES = new Map([
  ["一汽奔腾", "faw-bestune"],
  ["奔腾", "bestune"],
  ["小马", "xiaoma"],
  ["奥迪", "audi"],
  ["宝马", "bmw"],
  ["奔驰", "mercedes-benz"],
  ["大众", "volkswagen"],
  ["丰田", "toyota"],
  ["本田", "honda"],
  ["比亚迪", "byd"],
  ["吉利", "geely"],
  ["奇瑞", "chery"],
  ["长安", "changan"],
  ["长城", "great-wall"],
  ["哈弗", "haval"],
  ["五菱", "wuling"]
]);
const collectorSlugify = (value) => String(COLLECTOR_TOKEN_ALIASES.get(String(value || "").trim()) || value || "")
  .trim()
  .toLowerCase()
  .normalize("NFD")
  .replace(/[\u0300-\u036f]/g, "")
  .replace(/[^a-z0-9]+/g, "-")
  .replace(/^-+|-+$/g, "");

const buildCollectorVehicleSlug = ({ brand, model, trim, guidePrice, brandEn, modelEn, trimEn }) => {
  const brandSlug = collectorSlugify(firstValue(brandEn, brand));
  const modelSlug = collectorSlugify(firstValue(modelEn, model));
  const trimSlug = collectorSlugify(firstValue(trimEn, trim));
  const fallbackSlug = collectorSlugify(guidePrice);
  const parts = [brandSlug, modelSlug, trimSlug || fallbackSlug].filter(Boolean);
  return parts.filter((part, index) => index === 0 || part !== parts[index - 1]).join("-");
};

const NEW_CAR_INTAKE_ERROR_LOG_PATH = path.join(TMP_DIR, "new-car-intake-error.log");
const collectorErrorStack = (error) => String(error?.stack || error?.message || error || "").split(/\r?\n/).slice(0, 20).join("\n");
const appendNewCarIntakeErrorLog = async (body = {}, step = "unknown", error = new Error("Unknown error")) => {
  try {
    await fsp.mkdir(TMP_DIR, { recursive: true });
    const lines = [
      "[" + new Date().toISOString() + "]",
      "url=" + firstValue(body.url, body.sourceUrl),
      "vehicle=" + [body.brand, body.model, body.trim, body.guidePrice].map((value) => String(value ?? "").trim()).filter(Boolean).join(" / "),
      "step=" + (step || "unknown"),
      "error.name=" + (error?.name || "Error"),
      "error.message=" + (error?.message || String(error || "")),
      "stack=",
      collectorErrorStack(error),
      ""
    ];
    await fsp.appendFile(NEW_CAR_INTAKE_ERROR_LOG_PATH, lines.join("\n") + "\n", "utf8");
  } catch {}
};
const collectorErrorLogRelativePath = () => path.relative(ROOT, NEW_CAR_INTAKE_ERROR_LOG_PATH).replace(/\\/g, "/");

const handleCollectAutohomeImages = async (req, res) => {
  const body = await parseJsonBody(req);
  if (typeof collectAutohomeImages !== "function") {
    const error = new Error(collectorModuleLoadError || "collectAutohomeImages is not exported as a function");
    await appendNewCarIntakeErrorLog(body, "collector_module_load", error);
    return sendJson(res, 500, {
      success: false,
      apiSuccess: true,
      scriptSuccess: false,
      collectorModuleLoaded: false,
      collectorFunctionType: typeof collectAutohomeImages,
      downloadedCount: 0,
      downloadedImages: 0,
      error: "\u91c7\u96c6\u6a21\u5757\u52a0\u8f7d\u5931\u8d25\uff1a" + error.message,
      reason: "COLLECTOR_MODULE_LOAD_FAILED",
      step: "collector_module_load",
      details: error.message,
      suggestion: "\u8bf7\u68c0\u67e5 scripts/collect-autohome-images.js \u662f\u5426\u5df2\u6b63\u786e module.exports collectAutohomeImages\u3002",
      errorLogPath: collectorErrorLogRelativePath(),
      log: [error.message],
      stdout: "",
      stderr: error.message
    });
  }
  const required = ["url", "brand", "model", "fobPrice"];
  const missing = required.filter((key) => !firstValue(body[key]));
  if (!firstValue(body.trim) && !firstValue(body.guidePrice)) missing.push("trim or guidePrice");
  if (missing.length) {
    const error = new Error(`Missing required fields: ${missing.join(", ")}`);
    await appendNewCarIntakeErrorLog(body, "validate_payload", error);
    return sendJson(res, 400, {
      success: false,
      apiSuccess: true,
      scriptSuccess: false,
      downloadedCount: 0,
      downloadedImages: 0,
      error: "\u56fe\u7247\u91c7\u96c6\u5931\u8d25\uff1a" + error.message,
      reason: "MISSING_FIELDS",
      step: "validate_payload",
      details: error.message,
      suggestion: "\u8bf7\u5148\u8865\u5168\u6c7d\u8f66\u4e4b\u5bb6\u94fe\u63a5\u3001\u54c1\u724c\u3001\u8f66\u578b\u3001\u914d\u7f6e\u6216\u6307\u5bfc\u4ef7\u3001FOB \u4ef7\u683c\u3002",
      errorLogPath: collectorErrorLogRelativePath(),
      log: [error.message],
      stdout: "",
      stderr: error.message
    });
  }

  let result;
  try {
    result = await collectAutohomeImages({
      ...body,
      url: firstValue(body.url),
      sourceUrl: firstValue(body.sourceUrl, body.url),
      brand: firstValue(body.brand),
      model: firstValue(body.model),
      trim: firstValue(body.trim),
      guidePrice: firstValue(body.guidePrice),
      fobPrice: firstValue(body.fobPrice),
      targetMarket: firstValue(body.targetMarket) || "auto",
      energyType: firstValue(body.energyType),
      bodyType: firstValue(body.bodyType),
      displacement: firstValue(body.displacement),
      keywords: normalizeKeywords(body.keywords),
      selectedMarkets: normalizeSelectedMarkets(body.selectedMarkets),
      maxImages: 30,
      maxPerType: 2,
      timeoutMs: 12000
    });
  } catch (error) {
    await appendNewCarIntakeErrorLog(body, error.step || "unknown", error);
    return sendJson(res, 500, {
      success: false,
      apiSuccess: true,
      scriptSuccess: false,
      downloadedCount: 0,
      downloadedImages: 0,
      error: "\u56fe\u7247\u91c7\u96c6\u5931\u8d25\uff1a" + (error.message || "\u91c7\u96c6\u51fd\u6570\u6267\u884c\u5f02\u5e38\u3002"),
      reason: "COLLECTOR_EXCEPTION",
      step: error.step || "unknown",
      details: error.message || String(error),
      suggestion: "\u8bf7\u67e5\u770b tmp/new-car-intake-error.log \u5b9a\u4f4d\u5177\u4f53\u5931\u8d25\u6b65\u9aa4\u3002",
      errorLogPath: collectorErrorLogRelativePath(),
      log: [error.stack || error.message || String(error)],
      stdout: "",
      stderr: error.stack || error.message || String(error)
    });
  }

  const metadataPath = result.metadataPath ? path.resolve(ROOT, result.metadataPath) : "";
  let metadata = result.metadata || {};
  if (metadataPath) {
    try {
      if (!metadata || !Object.keys(metadata).length) metadata = JSON.parse(await fsp.readFile(metadataPath, "utf8"));
      applyNewCarIntakeFields(metadata, body);
      metadata.metadataPath = path.relative(ROOT, metadataPath).replace(/\\/g, "/");
      metadata.collectionStatus = (Array.isArray(metadata.images) && metadata.images.length) ? "collected" : "no_images_found";
      await writeAutohomeMetadata(metadataPath, metadata);
    } catch (error) {
      await appendNewCarIntakeErrorLog(body, "write_metadata", error);
      return sendJson(res, 500, {
        success: false,
        apiSuccess: true,
        scriptSuccess: true,
        downloadedCount: result.downloadedCount || 0,
        downloadedImages: result.downloadedImages || 0,
        error: `\u56fe\u7247\u91c7\u96c6\u5df2\u6267\u884c\uff0c\u4f46 metadata.json \u8bfb\u53d6\u5931\u8d25\uff1a${error.message}`,
        reason: "METADATA_READ_FAILED",
        step: "write_metadata",
        details: error.message || String(error),
        suggestion: "\u8bf7\u68c0\u67e5 metadata.json \u662f\u5426\u5b58\u5728\u4e14\u683c\u5f0f\u6b63\u786e\u3002",
        errorLogPath: collectorErrorLogRelativePath(),
        log: result.log || [],
        stdout: result.stdout || "",
        stderr: result.stderr || ""
      });
    }
  }

  const images = Array.isArray(metadata.images) ? metadata.images : [];
  const log = Array.isArray(result.log) ? result.log : String(result.stdout || "").split(/\r?\n/).filter(Boolean);
  const noImageWarning = "\u672a\u91c7\u96c6\u5230\u56fe\u7247\uff0c\u8bf7\u624b\u52a8\u4e0a\u4f20\u6216\u8865\u5145\u7d20\u6750\u3002";
  const response = {
    success: Boolean(result.success),
    apiSuccess: true,
    scriptSuccess: Boolean(result.success),
    downloadedCount: images.length,
    downloadedImages: images.length,
    colorCount: Array.isArray(metadata.colors) ? metadata.colors.length : (result.colorCount || 0),
    outputDir: metadata.storagePolicy?.directory || result.outputDir || "",
    metadataPath: metadata.metadataPath || result.metadataPath || "",
    missingImageTypes: Array.isArray(metadata.missingImageTypes) ? metadata.missingImageTypes : (result.missingImageTypes || []),
    images,
    log,
    stdout: log.join("\n"),
    stderr: result.stderr || "",
    error: result.success ? "" : firstValue(result.error),
    warning: result.success && !images.length ? firstValue(result.warning, noImageWarning) : firstValue(result.warning),
    reason: result.success && images.length ? "" : firstValue(result.reason, images.length ? "" : "NO_IMAGES_FOUND"),
    step: firstValue(result.step, result.success && !images.length ? "parse_image_candidates" : ""),
    details: firstValue(result.details),
    suggestion: firstValue(result.suggestion, result.success && !images.length ? "\u8bf7\u5c06\u6388\u6743\u56fe\u7247\u6216\u81ea\u6709\u56fe\u7247\u653e\u5165\u8be5\u76ee\u5f55\uff0c\u518d\u56de\u5230\u672c\u9875\u9762\u5237\u65b0\u5019\u9009\u56fe\u7247\u3002" : ""),
    errorLogPath: firstValue(result.errorLogPath, collectorErrorLogRelativePath()),
    metadata
  };
  return sendJson(res, result.success ? 200 : 500, response);
};
const AUTOHOME_SOURCE_DIR = path.join(ROOT, "media-source", "autohome");
const PUBLIC_NEW_CAR_DIR = path.join(ROOT, "images", "new-cars");
const IMAGE_SELECTION_TYPES = ["front-right-45", "right-side-90", "rear", "front", "front-interior", "center-console", "other"];
const IMAGE_SELECTION_COLORS = ["white", "black", "gray", "silver", "red", "blue", "green", "pink", "yellow", "unknown-color"];
const IMAGE_THIRD_PARTY_LOGO_TYPES = new Set(["", "autohome", "watermark", "platform_logo", "other"]);
const IMAGE_PROCESS_MODES = new Set(["none", "plate", "watermark-right", "watermark-left"]);
const IMAGE_PUBLIC_FILE_BY_TYPE = {
  "front-right-45": "01-front-right-45.jpg",
  "right-side-90": "02-right-side-90.jpg",
  rear: "03-rear.jpg",
  front: "04-front.jpg",
  "front-interior": "05-front-interior.jpg",
  "center-console": "06-center-console.jpg"
};

const resolveAutohomeMetadataPath = (value) => {
  const relative = firstValue(value).replace(/\\/g, "/");
  if (!relative || path.isAbsolute(relative)) { const error = new Error("metadataPath must be a relative path"); error.status = 400; throw error; }
  if (!relative.endsWith("/metadata.json")) { const error = new Error("metadataPath must point to metadata.json"); error.status = 400; throw error; }
  const absolute = path.resolve(ROOT, relative);
  const base = path.resolve(AUTOHOME_SOURCE_DIR);
  if (!(absolute === base || absolute.startsWith(base + path.sep))) { const error = new Error("metadataPath must stay inside media-source/autohome"); error.status = 403; throw error; }
  return absolute;
};

const readAutohomeMetadata = async (metadataPath) => JSON.parse(await fsp.readFile(metadataPath, "utf8"));
const writeAutohomeMetadata = async (metadataPath, metadata) => fsp.writeFile(metadataPath, `${JSON.stringify(metadata, null, 2)}\n`, "utf8");
const relFromRoot = (absolute) => path.relative(ROOT, absolute).replace(/\\/g, "/");

const checkWritableDir = async (dir) => {
  try {
    await fsp.mkdir(dir, { recursive: true });
    const probe = path.join(dir, `.collector-probe-${process.pid}-${Date.now()}.tmp`);
    await fsp.writeFile(probe, "ok", "utf8");
    await fsp.unlink(probe);
    return true;
  } catch {
    return false;
  }
};

const handleCollectorStatus = async (_req, res) => {
  const mediaSourcePath = path.join(ROOT, "media-source", "autohome");
  const collectorModuleLoaded = typeof collectAutohomeImages === "function";
  const payload = {
    success: collectorModuleLoaded,
    collectorModuleLoaded,
    collectorFunctionType: typeof collectAutohomeImages,
    projectRoot: ROOT,
    mediaSourcePath,
    mediaSourceWritable: await checkWritableDir(mediaSourcePath),
    tmpWritable: await checkWritableDir(TMP_DIR),
    nodeVersion: process.version
  };
  if (!collectorModuleLoaded) payload.error = collectorModuleLoadError || "collectAutohomeImages is not exported as a function";
  return sendJson(res, collectorModuleLoaded ? 200 : 500, payload);
};

const normalizeKeywords = (value) => Array.isArray(value)
  ? value.map(firstValue).filter(Boolean)
  : firstValue(value).split(/[，,]/).map(firstValue).filter(Boolean);
const normalizeSelectedMarkets = (value) => Array.isArray(value) ? value.map(firstValue).filter(Boolean) : firstValue(value).split(/[，,]/).map(firstValue).filter(Boolean);


const AUTOHOME_BLOCKED_MESSAGE = "汽车之家页面可能限制抓取，请手动补充部分配置。";
const KNOWN_AUTOHOME_SPECS = { "73960": { brand: "一汽奔腾", model: "小马", trim: "闪耀马", guidePrice: "41900" } };
const VEHICLE_INTAKE_FIELDS = ["brand", "model", "trim", "brandEn", "modelEn", "trimEn", "displayNameEn", "guidePrice", "fobPrice", "energyType", "bodyType", "displacement", "engine", "transmission", "fuelConsumption", "range", "batteryType", "batteryCapacity", "motorPower", "horsepower", "seats", "dimensions", "powerText"];
const parseAutohomeSpecId = (value = "") => {
  const raw = firstValue(value);
  if (!raw) return "";
  try {
    const parsed = new URL(raw);
    const fromPath = parsed.pathname.match(/\/spec\/(\d+)/i);
    if (fromPath) return fromPath[1];
    return firstValue(parsed.searchParams.get("specid"), parsed.searchParams.get("specId"), parsed.searchParams.get("spec"));
  } catch {}
  return (raw.match(/\/spec\/(\d+)/i) || raw.match(/(?:specid|specId|spec)[=/](\d+)/) || [])[1] || "";
};
const decodeHtmlEntities = (value = "") => String(value || "")
  .replace(/&quot;|&#34;/g, '"')
  .replace(/&#39;|&apos;/g, "'")
  .replace(/&amp;/g, "&")
  .replace(/&lt;/g, "<")
  .replace(/&gt;/g, ">")
  .replace(/&#(\d+);/g, (_, n) => { try { return String.fromCharCode(Number(n)); } catch { return _; } });
const htmlAttrMap = (tag = "") => {
  const out = {};
  for (const m of String(tag).matchAll(/([a-zA-Z0-9:_-]+)\s*=\s*("([^"]*)"|'([^']*)'|([^\s>]+))/g)) out[m[1].toLowerCase()] = decodeHtmlEntities(m[3] || m[4] || m[5] || "");
  return out;
};
const extractAutohomePageData = (html = "") => {
  const title = decodeHtmlEntities((String(html).match(/<title[^>]*>([\s\S]*?)<\/title>/i) || [])[1] || "").trim();
  const meta = {};
  for (const m of String(html).matchAll(/<meta\b[^>]*>/gi)) {
    const attrs = htmlAttrMap(m[0]);
    const key = firstValue(attrs.name, attrs.property).toLowerCase();
    if (key && attrs.content) meta[key] = attrs.content;
  }
  const scriptText = [...String(html).matchAll(/<script\b[^>]*>([\s\S]*?)<\/script>/gi)].map((m) => m[1]).join(" ").slice(0, 200000);
  const text = decodeHtmlEntities(String(html).replace(/<script\b[\s\S]*?<\/script>/gi, " ").replace(/<style\b[\s\S]*?<\/style>/gi, " ").replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim()).slice(0, 200000);
  return { title, metaDescription: firstValue(meta.description, meta["og:description"]), metaKeywords: firstValue(meta.keywords), metaTitle: firstValue(meta["og:title"], meta.title), scriptText, pageText: text };
};
const fetchAutohomePageData = async (url, timeoutMs = 8000) => {
  const sourceUrl = firstValue(url);
  if (!sourceUrl) return { ok: false, error: "Missing Autohome URL", title: "", metaDescription: "", metaKeywords: "", metaTitle: "", scriptText: "", pageText: "" };
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(sourceUrl, { signal: controller.signal, headers: { "user-agent": "Mozilla/5.0 ZhongguAutoExportInternalRecognizer/1.0", "accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8", "referer": "https://www.autohome.com.cn/" } });
    if (!response.ok) throw new Error("HTTP " + response.status);
    const html = await response.text();
    return { ok: true, error: "", html, ...extractAutohomePageData(html) };
  } catch (error) {
    return { ok: false, error: error.name === "AbortError" ? "Autohome request timed out" : error.message, title: "", metaDescription: "", metaKeywords: "", metaTitle: "", scriptText: "", pageText: "" };
  } finally { clearTimeout(timer); }
};
const findLocalAutohomeMetadata = async (specId, sourceUrl = "") => {
  const targetSpecId = firstValue(specId) || parseAutohomeSpecId(sourceUrl);
  const entries = await fsp.readdir(AUTOHOME_SOURCE_DIR, { withFileTypes: true }).catch(() => []);
  const matches = [];
  for (const entry of entries) {
    if (!entry.isDirectory()) continue;
    const metadataPath = path.join(AUTOHOME_SOURCE_DIR, entry.name, "metadata.json");
    try {
      const metadata = JSON.parse(await fsp.readFile(metadataPath, "utf8"));
      const metadataSpecId = firstValue(metadata.specId) || parseAutohomeSpecId(metadata.sourceUrl);
      if ((targetSpecId && metadataSpecId === targetSpecId) || (sourceUrl && firstValue(metadata.sourceUrl) === sourceUrl)) matches.push({ metadata, metadataPath, directoryName: entry.name });
    } catch {}
  }
  if (!matches.length) return null;
  const score = (match) => {
    const m = match.metadata || {};
    const identity = [m.brand, m.model, m.trim].join(" ");
    const badIdentity = /\?/.test(identity) ? -100 : 0;
    const imageScore = Array.isArray(m.images) ? Math.min(m.images.length, 50) : 0;
    const fieldScore = [m.brand, m.model, m.trim, m.guidePrice].filter(firstValue).length * 10;
    const directoryScore = /faw-bestune|bestune|xiaoma/i.test(match.directoryName) ? 8 : 0;
    return badIdentity + imageScore + fieldScore + directoryScore;
  };
  return matches.sort((a, b) => score(b) - score(a))[0];
};
const normalizeTextForMatch = (value = "") => String(value || "").toLowerCase().replace(/\s+/g, " ");
const hasAnyToken = (text, words) => words.some((word) => text.includes(String(word).toLowerCase()));
const uniqueStrings = (items = []) => {
  const input = Array.isArray(items) ? items : String(items ?? "").split(/[，,]/);
  return [...new Set(input.flatMap((item) => Array.isArray(item) ? item : [item]).map(firstValue).filter(Boolean))];
};
const normalizeObjectArray = (value) => Array.isArray(value) ? value.filter((item) => item && typeof item === "object").map((item) => ({ ...item })) : [];
const INTAKE_MARKET_NAMES = new Set(["Algeria", "West Africa", "Central Asia", "Southeast Asia", "Middle East", "South America", "Russia/CIS", "Used Cars", "Other"]);
const INTAKE_KEYWORD_LABELS = new Map([
  ["EV", "small city EV"], ["mini car", "small city EV"], ["small city car", "city mobility"], ["low-cost vehicle", "low-cost vehicle"],
  ["city mobility", "city mobility"], ["short-distance commuting", "short-distance commuting"], ["easy parking", "easy parking"], ["low running cost", "low running cost"],
  ["dealer supply", "dealer supply"], ["FOB price", "FOB quotation"], ["FOB 报价", "FOB quotation"], ["CIF shipping support", "CIF shipping support"],
  ["export documents", "export documents"], ["出口文件", "export documents"], ["inspection report", "inspection support"], ["验车报告", "inspection support"],
  ["ready stock", "ready stock"], ["现车支持", "ready stock"], ["低价", "low-cost vehicle"], ["小型EV", "small city EV"],
  ["微型车", "small city EV"], ["城市代步", "city mobility"], ["短途通勤", "short-distance commuting"], ["低用车成本", "low running cost"],
  ["停车方便", "easy parking"], ["价格敏感市场", "price-sensitive market"], ["经销商测试车型", "dealer supply"],
  ["东南亚潜力车型", "Southeast Asia potential"], ["适合经销商测试", "dealer supply"]
]);
const isUnknownIntakeValue = (value) => {
  const raw = firstValue(value);
  return !raw || raw === "-" || /^(to be confirmed|unknown|null|undefined)$/i.test(raw);
};
const normalizeIntakeKeyword = (value) => {
  const raw = firstValue(value);
  if (!raw || INTAKE_MARKET_NAMES.has(raw)) return "";
  return INTAKE_KEYWORD_LABELS.get(raw) || raw;
};
const normalizeIntakeKeywords = (value) => uniqueStrings(value).map(normalizeIntakeKeyword).filter(Boolean);
const normalizeIntakeKeywordCandidates = (value, selected = []) => {
  const selectedSet = new Set(normalizeIntakeKeywords(selected));
  return normalizeIntakeKeywords(value).filter((item) => !selectedSet.has(item));
};
const normalizeDimensionsValue = (value) => {
  const raw = firstValue(value);
  if (isUnknownIntakeValue(raw)) return "";
  const nums = raw.match(/\d{3,5}/g) || [];
  if (nums.length >= 3) return nums[0] + " × " + nums[1] + " × " + nums[2] + " mm";
  return raw;
};
const isValidDimensionsValue = (value) => /^\d{3,5}\s*×\s*\d{3,5}\s*×\s*\d{3,5}\s*mm$/i.test(firstValue(value));
const hasCjk = (value = "") => /[\u3400-\u9fff]/.test(String(value || ""));
const cleanEnglishSpaces = (value = "") => firstValue(value).replace(/\s+/g, " ").trim();
const safeEnglishText = (value = "") => cleanEnglishSpaces(String(value || "").replace(/[\u3400-\u9fff]+/g, " ").replace(/[｜|_]+/g, " "));
const BRAND_EN_ALIASES = new Map([
  ["一汽奔腾", "FAW Bestune"], ["奔腾", "Bestune"], ["奥迪", "Audi"], ["宝马", "BMW"], ["奔驰", "Mercedes-Benz"],
  ["大众", "Volkswagen"], ["丰田", "Toyota"], ["本田", "Honda"], ["比亚迪", "BYD"], ["吉利", "Geely"],
  ["奇瑞", "Chery"], ["长安", "Changan"], ["长城", "Great Wall"], ["哈弗", "Haval"], ["五菱", "Wuling"]
]);
const MODEL_EN_ALIASES = new Map([["小马", "Xiaoma"]]);
const translateBrandEn = (brand = "", fallback = "") => cleanEnglishSpaces(fallback) || BRAND_EN_ALIASES.get(firstValue(brand)) || safeEnglishText(brand);
const translateModelEn = (model = "", fallback = "") => cleanEnglishSpaces(fallback) || MODEL_EN_ALIASES.get(firstValue(model)) || safeEnglishText(model);
const translateTrimEn = (trim = "", fallback = "") => {
  const manual = cleanEnglishSpaces(fallback);
  if (manual && !hasCjk(manual)) return { value: manual, needsConfirmation: false };
  const raw = firstValue(trim);
  let value = safeEnglishText(raw);
  const replacements = [["豪华动感型", "Luxury Dynamic"], ["豪华致雅型", "Luxury Elegant"], ["动感型", "Dynamic"], ["致雅型", "Elegant"], ["旗舰型", "Flagship"], ["豪华型", "Luxury"], ["舒适型", "Comfort"], ["进取型", "Progressive"]];
  const matchedReplacement = replacements.find(([cn]) => raw.includes(cn));
  if (matchedReplacement) value = cleanEnglishSpaces(value + " " + matchedReplacement[1]);
  value = value.replace(/\b(\d{2,3})\s*TFSI\b/i, (_, n) => n + " TFSI").replace(/\s+/g, " ").trim();
  const hasAsciiToken = /[A-Za-z0-9]/.test(value);
  const hasUntranslated = hasCjk(raw.replace(/[0-9A-Za-z\s.+-]/g, "")) && !replacements.some(([cn]) => raw.includes(cn));
  return { value: hasAsciiToken ? value : "", needsConfirmation: Boolean(hasUntranslated || (!hasAsciiToken && raw)) };
};
const applyEnglishVehicleFields = (vehicle = {}) => {
  const brandEn = translateBrandEn(vehicle.brand, vehicle.brandEn);
  const modelEn = translateModelEn(vehicle.model, vehicle.modelEn);
  const trim = translateTrimEn(vehicle.trim, vehicle.trimEn);
  const displayNameEn = cleanEnglishSpaces(vehicle.displayNameEn) || [brandEn, modelEn, trim.value].filter(Boolean).join(" ");
  const manualTrimEn = cleanEnglishSpaces(vehicle.trimEn);
  const forcedConfirmation = vehicle.trimEnNeedsConfirmation === true && (!manualTrimEn || hasCjk(manualTrimEn));
  return { ...vehicle, brandEn, modelEn, trimEn: trim.value, displayNameEn, trimEnNeedsConfirmation: forcedConfirmation || trim.needsConfirmation };
};
const englishSeoName = (vehicle = {}) => {
  const v = applyEnglishVehicleFields(vehicle);
  return cleanEnglishSpaces(v.displayNameEn) || [v.brandEn, v.modelEn].filter(Boolean).join(" ") || "China New Car";
};


const findPriceRmb = (text = "") => {
  const raw = String(text || "").replace(/,/g, "");
  const direct = raw.match(/(?:厂商指导价|指导价|官方指导价|售价|报价)[^\d]{0,20}(\d+(?:\.\d+)?)\s*万/);
  const fallback = raw.match(/(\d+(?:\.\d+)?)\s*万/);
  const m = direct || fallback;
  if (!m) return "";
  const value = Number(m[1]);
  if (!Number.isFinite(value) || value <= 0) return "";
  return String(Math.round(value * 10000));
};
const findTrimText = (text = "") => {
  const raw = String(text || "");
  const known = raw.match(/闪耀马|活力马|自在马|轻松马/);
  if (known) return known[0];
  const fromYear = raw.match(/\d{4}款\s*([^_｜|\-]{2,28}?)(?:报价|参数|图片|配置|_|\s{2,}|$)/);
  return fromYear ? firstValue(fromYear[1]) : "";
};
const extractVehicleFactsFromPageData = (pageData = {}) => {
  const titleText = [pageData.metaTitle, pageData.title].filter(Boolean).join(" ");
  const combined = [pageData.metaTitle, pageData.title, pageData.metaDescription, pageData.metaKeywords, pageData.pageText, pageData.scriptText].filter(Boolean).join(" ");
  const facts = {};
  if (/一汽奔腾|奔腾小马|Bestune/i.test(combined) && /小马|Xiaoma/i.test(combined)) { facts.brand = "一汽奔腾"; facts.model = "小马"; }
  const brandFromTitle = titleText.match(/_([^_]{2,24})_汽车之家/);
  if (!facts.brand && brandFromTitle) facts.brand = brandFromTitle[1].trim();
  if (!facts.model && /小马|Xiaoma/i.test(combined)) facts.model = "小马";
  const trim = findTrimText(combined);
  if (trim) facts.trim = trim;
  const guidePrice = findPriceRmb(combined);
  if (guidePrice) facts.guidePrice = guidePrice;
  return facts;
};
const findUnitValue = (text, patterns) => {
  for (const pattern of patterns) {
    const m = String(text || "").match(pattern);
    if (m) return firstValue(m[1] + (m[2] || ""));
  }
  return "";
};
const extractDisplacement = (text = "") => {
  const m = String(text).match(/(\d\.\d)\s*(L|T)/i);
  return m ? (m[1] + m[2].toUpperCase()) : "";
};
const extractTransmission = (text = "") => {
  const m = String(text).match(/\b(E-CVT|CVT|AT|DCT|MT|AMT)\b|双离合|手动|自动|无级变速/i);
  if (!m) return "";
  const raw = m[0].toUpperCase();
  if (raw === "双离合") return "DCT";
  if (raw === "手动") return "MT";
  if (raw === "自动") return "AT";
  if (raw === "无级变速") return "CVT";
  return raw;
};
const extractBatteryType = (text = "") => {
  if (/磷酸铁锂|LFP/i.test(text)) return "LFP";
  if (/三元锂|ternary/i.test(text)) return "ternary lithium";
  if (/锂电池|lithium/i.test(text)) return "lithium battery";
  return "";
};
const extractRange = (text = "") => {
  const direct = String(text).match(/(?:续航|CLTC|NEDC|WLTC)[^\d]{0,16}(\d{2,4})\s*(km|公里)/i);
  return direct ? direct[1] + " km" : "";
};
const normalizeUnitValue = (value, unit, options = {}) => {
  const raw = firstValue(value);
  if (isUnknownIntakeValue(raw)) return "";
  const cleaned = raw.replace(/\s+/g, " ").trim();
  const compact = options.compact === true;
  const joiner = compact ? "" : " ";
  const numberOnly = cleaned.match(/^(\d+(?:\.\d+)?)$/);
  if (numberOnly) return numberOnly[1] + joiner + unit;
  const patterns = options.patterns || [];
  if (patterns.length) {
    const exact = cleaned.match(new RegExp("^(\\d+(?:\\.\\d+)?)\\s*(?:" + patterns.join("|") + ")$", "i"));
    if (exact) return exact[1] + joiner + unit;
  }
  return cleaned
    .replace(/(\d+(?:\.\d+)?)\s*kw\b/ig, "$1 kW")
    .replace(/(\d+(?:\.\d+)?)\s*hp\b/ig, "$1 hp")
    .replace(/(\d+(?:\.\d+)?)\s*kwh\b/ig, "$1 kWh")
    .replace(/(\d+(?:\.\d+)?)\s*l\/100\s*km\b/ig, "$1 L/100km")
    .replace(/^(\d+(?:\.\d+)?)\s*l$/i, "$1L")
    .replace(/(\d+(?:\.\d+)?)\s*km\b/ig, "$1 km");
};
const normalizeMotorPowerValue = (value) => normalizeUnitValue(value, "kW", { patterns: ["kw"] });
const normalizeHorsepowerValue = (value) => normalizeUnitValue(value, "hp", { patterns: ["hp", "ps"] });
const normalizeRangeValue = (value) => normalizeUnitValue(value, "km", { patterns: ["km", "kilometers?", "kms?"] });
const normalizeBatteryCapacityValue = (value) => normalizeUnitValue(value, "kWh", { patterns: ["kwh"] });
const normalizeDisplacementUnitValue = (value) => normalizeUnitValue(value, "L", { compact: true, patterns: ["l"] });
const normalizeFuelConsumptionValue = (value) => normalizeUnitValue(value, "L/100km", { patterns: ["l\\/100\\s*km", "l\\/100km"] });
const normalizePowerPayload = (value = {}) => {
  const power = value && typeof value === "object" && !Array.isArray(value) ? (value.power && typeof value.power === "object" ? value.power : value) : {};
  const energyType = firstValue(value.energyType, power.type);
  const type = /phev/i.test(energyType) ? "phev" : /hybrid/i.test(energyType) ? "hybrid" : /ev|electric/i.test(energyType) ? "ev" : /diesel/i.test(energyType) ? "diesel" : /gasoline|petrol/i.test(energyType) ? "gasoline" : firstValue(power.type);
  return {
    type,
    motorPower: normalizeMotorPowerValue(firstValue(value.motorPower, power.motorPower)),
    horsepower: normalizeHorsepowerValue(firstValue(value.horsepower, power.horsepower)),
    range: normalizeRangeValue(firstValue(value.range, power.range)),
    batteryType: firstValue(value.batteryType, power.batteryType),
    batteryCapacity: normalizeBatteryCapacityValue(firstValue(value.batteryCapacity, power.batteryCapacity)),
    engine: firstValue(value.engine, power.engine),
    transmission: firstValue(value.transmission, power.transmission),
    displacement: normalizeDisplacementUnitValue(firstValue(value.displacement, power.displacement)),
    fuelConsumption: normalizeFuelConsumptionValue(firstValue(value.fuelConsumption, power.fuelConsumption)),
    powerText: firstValue(value.powerText, power.powerText)
  };
};
const addRecommendedMarket = (items, market, level, reason) => { if (!items.some((item) => item.market === market)) items.push({ market, level, reason }); };
const recommendVehicleMarkets = (vehicle = {}) => {
  const text = normalizeTextForMatch([vehicle.brand, vehicle.brandEn, vehicle.model, vehicle.modelEn, vehicle.trim, vehicle.trimEn, vehicle.energyType, vehicle.bodyType, vehicle.displacement, vehicle.keywords, vehicle.keywordCandidates, vehicle.pageText].flat().filter(Boolean).join(" "));
  const guidePrice = Number(firstValue(vehicle.guidePrice).replace(/,/g, ""));
  const fobPrice = Number(firstValue(vehicle.fobPrice).replace(/,/g, ""));
  const low = (Number.isFinite(guidePrice) && guidePrice > 0 && guidePrice <= 60000) || (Number.isFinite(fobPrice) && fobPrice > 0 && fobPrice <= 7000) || hasAnyToken(text, ["低价", "budget", "low price", "low-cost"]);
  const mini = hasAnyToken(text, ["小马", "mini", "micro", "small city", "小型", "微型", "mini car"]);
  const ev = hasAnyToken(text, ["ev", "electric", "纯电", "电动", "bev", "新能源"]);
  const gas = hasAnyToken(text, ["gasoline", "petrol", "fuel", "tfsi", "燃油", "汽油"]);
  const suv = hasAnyToken(text, ["suv", "越野"]);
  const sedan = hasAnyToken(text, ["sedan", "executive sedan", "premium sedan", "轿车", "a6l"]);
  const used = hasAnyToken(text, ["used", "second hand", "二手"]);
  const smallDisplacement = /(^|\D)(0\.[1-9]|1\.[0-6]|1\.0|1\.2|1\.3|1\.4|1\.5|1\.6)\s*l/i.test(text);
  const r = [];
  if ((low && mini) || (low && ev) || (mini && ev)) {
    addRecommendedMarket(r, "Southeast Asia", "recommended", "Low-cost small EV suitable for urban mobility and price-sensitive buyers.");
    addRecommendedMarket(r, "Middle East", "test", "Can be tested for city delivery and short-distance mobility segments.");
    addRecommendedMarket(r, "South America", "test", "Price-sensitive urban buyers may respond, but local EV demand should be verified.");
    addRecommendedMarket(r, "Algeria", "caution", "Algeria buyers currently prefer gasoline vehicles and lower displacement models; NEV acceptance should be verified.");
    addRecommendedMarket(r, "West Africa", "caution", "Charging infrastructure and used gasoline vehicle preference may limit demand.");
    addRecommendedMarket(r, "Central Asia", "caution", "Winter conditions and driving range can affect small EV usability.");
    return r;
  }
  if (used && gas) { addRecommendedMarket(r, "West Africa", "recommended", "Used gasoline vehicles have stronger existing demand in price-sensitive markets."); addRecommendedMarket(r, "Used Cars", "recommended", "Classify this lead under the used-car workflow for stock and media review."); }
  if (sedan && (gas || !ev)) { addRecommendedMarket(r, "Middle East", "test", "Premium sedan positioning can be tested with business and fleet buyers."); addRecommendedMarket(r, "Central Asia", "test", "Check cold-weather suitability, fuel quality and parts support before promotion."); addRecommendedMarket(r, "Algeria", "test", "Confirm import rules, displacement preference and local dealer demand before promotion."); }
  if (smallDisplacement && (gas || !ev)) { addRecommendedMarket(r, "Algeria", "recommended", "Small-displacement gasoline vehicles fit common import demand and buyer preference."); addRecommendedMarket(r, "West Africa", "test", "Can be tested where low purchase price and simple maintenance are priorities."); addRecommendedMarket(r, "Central Asia", "test", "Can be tested if cold-weather suitability and parts support are confirmed."); }
  if (suv && (gas || !ev)) { addRecommendedMarket(r, "Central Asia", "recommended", "SUV and left-hand-drive fuel vehicles fit road conditions and buyer preference."); addRecommendedMarket(r, "West Africa", "recommended", "SUVs and practical fuel vehicles are suitable for mixed road conditions."); }
  if (!r.length) { addRecommendedMarket(r, "Algeria", "test", "Market fit is unclear from the provided vehicle data; verify price, fuel type, and displacement."); addRecommendedMarket(r, "West Africa", "test", "Can be evaluated after confirming fuel type, ground clearance, and parts availability."); addRecommendedMarket(r, "Southeast Asia", "test", "Can be evaluated after confirming price and usage scenario."); }
  return r;
};


const buildKeywordSet = (vehicle = {}) => {
  const selected = [];
  const candidates = ["China export vehicle", "FOB quotation", "inspection support", "dealer supply", "export documents", "CIF shipping support", "ready stock"];
  const text = normalizeTextForMatch([vehicle.brand, vehicle.brandEn, vehicle.model, vehicle.modelEn, vehicle.trim, vehicle.trimEn, vehicle.energyType, vehicle.bodyType, vehicle.pageText, vehicle.currentKeywords].flat().filter(Boolean).join(" "));
  const isMiniEv = hasAnyToken(text, ["小马", "bestune xiaoma", "xiaoma", "mini ev", "小型ev", "小型 ev", "纯电", "电动", "bev"]);
  const isEv = /^EV$/i.test(firstValue(vehicle.energyType)) || hasAnyToken(text, ["electric", "ev", "bev", "新能源", "纯电", "电动"]);
  const isSedan = hasAnyToken(text, ["sedan", "轿车", "a6l", "奥迪", "audi"]);
  const isPremium = hasAnyToken(text, ["premium", "executive", "luxury", "豪华", "奥迪", "audi", "a6l"]);
  const isGasoline = hasAnyToken(text, ["gasoline", "petrol", "fuel", "燃油", "汽油", "tfsi"]);
  const isDiesel = hasAnyToken(text, ["diesel", "柴油"]);
  if (isMiniEv || (isEv && hasAnyToken(text, ["mini", "micro", "small city"]))) {
    selected.push("low-cost vehicle", "small city EV", "city mobility", "low running cost");
    candidates.unshift("short-distance commuting", "price-sensitive market", "Southeast Asia potential");
  } else if (isSedan || isPremium) {
    selected.push("premium sedan", isGasoline ? "gasoline vehicle" : (isDiesel ? "diesel vehicle" : "China export vehicle"), "executive sedan", "China export vehicle", "FOB quotation", "inspection support", "dealer supply");
    candidates.unshift("business use", "FOB quotation", "export documents");
  } else {
    if (isGasoline) selected.push("gasoline vehicle");
    if (isDiesel) selected.push("diesel vehicle");
    if (hasAnyToken(text, ["suv"])) selected.push("SUV");
    selected.push("China export vehicle", "FOB quotation", "inspection support");
  }
  return { selected: normalizeIntakeKeywords([selected]), candidates: normalizeIntakeKeywordCandidates(candidates, selected) };
};const buildCoreSpecs = (vehicle = {}) => {
  const power = normalizePowerPayload(vehicle);
  const energyType = firstValue(vehicle.energyType, power.type, "Unknown");
  const bodyType = firstValue(vehicle.bodyType, "Unknown");
  const specs = ["Energy type: " + energyType, "Body type: " + bodyType, "Guide price: " + (firstValue(vehicle.guidePrice) || "to be confirmed") + " RMB", "FOB price: " + (firstValue(vehicle.fobPrice) || "to be confirmed") + " USD"];
  if (/ev|electric/i.test(energyType)) {
    specs.push("Motor power: " + (firstValue(power.motorPower, vehicle.motorPower) || "to be confirmed"));
    specs.push("Horsepower: " + (firstValue(power.horsepower, vehicle.horsepower) || "to be confirmed"));
    specs.push("Range: " + (firstValue(vehicle.range, power.range) || "to be confirmed"));
    specs.push("Battery type: " + (firstValue(vehicle.batteryType, power.batteryType) || "to be confirmed"));
    specs.push("Battery capacity: " + (firstValue(vehicle.batteryCapacity, power.batteryCapacity) || "to be confirmed"));
  } else if (/phev|hybrid/i.test(energyType)) {
    specs.push("Engine displacement: " + (firstValue(vehicle.displacement, power.displacement) || "to be confirmed"));
    specs.push("Motor power: " + (firstValue(power.motorPower, vehicle.motorPower) || "to be confirmed"));
    specs.push("Combined range: " + (firstValue(vehicle.range, power.range) || "to be confirmed"));
    specs.push("Battery capacity: " + (firstValue(vehicle.batteryCapacity, power.batteryCapacity) || "to be confirmed"));
    specs.push("Fuel consumption: " + (firstValue(vehicle.fuelConsumption, power.fuelConsumption) || "to be confirmed"));
  } else if (/gasoline|petrol|diesel/i.test(energyType)) {
    specs.push("Displacement: " + (firstValue(vehicle.displacement, power.displacement) || "to be confirmed"));
    specs.push("Engine: " + (firstValue(vehicle.engine, power.engine) || "to be confirmed"));
    specs.push("Transmission: " + (firstValue(vehicle.transmission, power.transmission) || "to be confirmed"));
    if (firstValue(vehicle.fuelConsumption, power.fuelConsumption)) specs.push("Fuel consumption: " + firstValue(vehicle.fuelConsumption, power.fuelConsumption));
  } else if (firstValue(vehicle.powerText, power.powerText)) {
    specs.push("Power: " + firstValue(vehicle.powerText, power.powerText));
  }
  if (firstValue(vehicle.seats)) specs.push("Seats: " + firstValue(vehicle.seats));
  if (firstValue(vehicle.dimensions)) specs.push("Dimensions: " + normalizeDimensionsValue(vehicle.dimensions));
  if (/mini car/i.test(bodyType) || /小马|mini|city/i.test([vehicle.model, bodyType].join(" "))) specs.push("Suitable for city mobility and short-distance commuting");
  return uniqueStrings(specs);
};
const buildProductHighlights = (vehicle = {}) => {
  const energyType = firstValue(vehicle.energyType);
  const text = normalizeTextForMatch([vehicle.brand, vehicle.brandEn, vehicle.model, vehicle.modelEn, vehicle.trim, vehicle.trimEn, vehicle.bodyType, vehicle.keywords].flat().join(" "));
  if (/ev|electric/i.test(energyType) && hasAnyToken(text, ["mini", "small", "xiaoma", "小马", "小型"])) return ["Low-cost small EV for price-sensitive buyers", "Compact body size suitable for urban mobility", "Low running cost compared with gasoline vehicles", "Easy parking and flexible short-distance commuting", "Suitable for dealer test marketing in emerging markets"];
  if (/ev|electric/i.test(energyType)) return ["China EV model suitable for export quotation", "Low running cost compared with gasoline vehicles", "FOB/CIF quotation and export document support from China"];
  if (hasAnyToken(text, ["premium sedan", "executive sedan", "a6l", "audi", "奥迪", "豪华"])) return ["Premium sedan positioning", "Suitable for executive and business use", "China-sourced vehicle export support", "FOB/CIF quotation support"];
  return ["China-sourced vehicle export support", "FOB/CIF quotation support", "Inspection and export document support", "Dealer supply support from China"];
};const buildExportSellingPoints = (selectedMarkets = [], recommendedMarkets = [], vehicle = {}) => {
  const marketList = uniqueStrings(selectedMarkets).length ? uniqueStrings(selectedMarkets) : normalizeObjectArray(recommendedMarkets).map((item) => item.market).filter(Boolean);
  const recs = normalizeObjectArray(recommendedMarkets);
  const ev = /ev|electric/i.test(firstValue(vehicle.energyType));
  const points = [];
  for (const market of marketList) {
    if (market === "Southeast Asia") points.push(ev ? "Southeast Asia: Recommended for urban mobility, short-distance commuting and price-sensitive buyers." : "Southeast Asia: Verify executive sedan demand, homologation and dealer channel fit before promotion.");
    else if (market === "Middle East") points.push(ev ? "Middle East: Can be tested for city delivery and short-distance mobility segments." : "Middle East: Premium sedan positioning can be tested with business and fleet buyers.");
    else if (market === "South America") points.push(ev ? "South America: Price-sensitive urban buyers may respond, but local EV demand should be verified." : "South America: Confirm tariff, emission rules and executive sedan demand before promotion.");
    else if (market === "Algeria") points.push("Algeria: Confirm import rules, displacement preference and local dealer demand before promotion.");
    else if (market === "West Africa") points.push("West Africa: Confirm fuel quality, parts support and dealer pricing before promotion.");
    else if (market === "Central Asia") points.push("Central Asia: Check cold-weather suitability, fuel quality and parts support before promotion.");
    else if (market === "Russia/CIS") points.push("Russia/CIS: Cold-weather usability, fuel quality and homologation requirements should be checked before promotion.");
    else if (market === "Used Cars") points.push("Used Cars: Route this item through used-car stock and media review if the unit is not new-car inventory.");
    else if (market) points.push(market + ": Market fit should be confirmed by sales before public promotion.");
    const reason = recs.find((item) => item.market === market)?.reason;
    if (reason) points.push(market + ": " + reason);
  }
  return uniqueStrings(points);
};function inferVehicleAttributes(input = {}) {
  const pageText = firstValue(input.pageText);
  const currentKeywords = normalizeIntakeKeywords(input.currentKeywords || input.keywords);
  const text = normalizeTextForMatch([input.url, input.brand, input.brandEn, input.model, input.modelEn, input.trim, input.trimEn, input.guidePrice, input.fobPrice, input.energyType, input.bodyType, pageText, currentKeywords].flat().filter(Boolean).join(" "));
  let energyType = firstValue(input.energyType);
  if (!energyType) {
    if (hasAnyToken(text, ["phev", "插电", "插混"])) energyType = "PHEV";
    else if (hasAnyToken(text, ["hybrid", "hev", "混动", "油电混合"])) energyType = "Hybrid";
    else if (hasAnyToken(text, ["diesel", "柴油"])) energyType = "Diesel";
    else if (hasAnyToken(text, ["小马", "bestune xiaoma", "mini ev", "小型ev", "小型 ev", "纯电", "电动", "ev", "bev", "新能源"])) energyType = "EV";
    else if (hasAnyToken(text, ["1.5l", "1.6l", "2.0l", "tfsi", "gasoline", "petrol", "fuel", "燃油", "汽油"])) energyType = "Gasoline";
  }
  let bodyType = firstValue(input.bodyType);
  if (!bodyType) {
    if (hasAnyToken(text, ["小马", "mini ev", "mini car", "micro", "小型", "微型", "city car"])) bodyType = "mini car";
    else if (hasAnyToken(text, ["suv", "越野"])) bodyType = "SUV";
    else if (hasAnyToken(text, ["sedan", "轿车", "a6l"])) bodyType = "sedan";
    else if (hasAnyToken(text, ["pickup", "皮卡"])) bodyType = "pickup";
  }
  const displacement = firstValue(input.displacement, extractDisplacement(text));
  const transmission = firstValue(input.transmission, extractTransmission(text));
  const motorPower = firstValue(input.motorPower, findUnitValue(pageText, [/(\d+(?:\.\d+)?)\s*(kW|千瓦)/i]));
  const horsepower = firstValue(input.horsepower, findUnitValue(pageText, [/(\d{2,4})\s*(hp|ps|马力)/i]));
  const range = firstValue(input.range, extractRange(pageText));
  const batteryType = firstValue(input.batteryType, extractBatteryType(pageText));
  const batteryCapacity = firstValue(input.batteryCapacity, findUnitValue(pageText, [/(\d+(?:\.\d+)?)\s*(kWh|千瓦时|度)/i]));
  const fuelConsumption = firstValue(input.fuelConsumption, findUnitValue(pageText, [/(\d+(?:\.\d+)?)\s*(L\/100km|L\/100公里|升\/百公里)/i]));
  const engine = firstValue(input.engine, displacement ? (displacement.toUpperCase().includes("T") ? displacement + " Turbocharged Engine" : displacement + " Naturally Aspirated Engine") : "");
  const inferred = { ...input, energyType, bodyType, displacement, transmission, motorPower, horsepower, range, batteryType, batteryCapacity, fuelConsumption, engine, currentKeywords };
  const keywordSet = buildKeywordSet(inferred);
  const power = normalizePowerPayload({ ...inferred, type: energyType });
  const recommendedMarkets = recommendVehicleMarkets({ ...inferred, keywords: keywordSet.selected, keywordCandidates: keywordSet.candidates });
  const keywords = normalizeIntakeKeywords(keywordSet.selected);
  const keywordCandidates = normalizeIntakeKeywordCandidates(keywordSet.candidates, keywords);
  const selectedMarkets = normalizeSelectedMarkets(input.selectedMarkets);
  return { energyType, bodyType, power, displacement, engine, transmission, fuelConsumption, range, batteryType, batteryCapacity, keywords, keywordCandidates, coreSpecs: buildCoreSpecs({ ...inferred, power }), productHighlights: buildProductHighlights({ ...inferred, power, keywords }), exportSellingPoints: buildExportSellingPoints(selectedMarkets, recommendedMarkets, inferred), recommendedMarkets, source: "inferred" };
}


const missingVehicleFields = (vehicle = {}) => {
  const missing = [];
  for (const key of ["brand", "model", "trim", "guidePrice", "fobPrice", "energyType", "bodyType", "seats"]) if (isUnknownIntakeValue(vehicle[key])) missing.push(key);
  if (isUnknownIntakeValue(vehicle.dimensions) || !isValidDimensionsValue(vehicle.dimensions)) missing.push("dimensions");
  if (/ev|electric/i.test(firstValue(vehicle.energyType))) {
    if (!firstValue(vehicle.power?.motorPower, vehicle.motorPower)) missing.push("motorPower");
    if (!firstValue(vehicle.power?.range, vehicle.range)) missing.push("range");
    if (!firstValue(vehicle.power?.batteryType, vehicle.batteryType)) missing.push("batteryType");
    if (!firstValue(vehicle.power?.batteryCapacity, vehicle.batteryCapacity)) missing.push("batteryCapacity");
  }
  return missing;
};
const normalizeRecommendedMarkets = (value) => normalizeObjectArray(value).map((item) => ({ market: firstValue(item.market), level: firstValue(item.level, "test"), reason: firstValue(item.reason) })).filter((item) => item.market);
const applyNewCarIntakeFields = (metadata = {}, body = {}) => {
  for (const key of VEHICLE_INTAKE_FIELDS) if (Object.prototype.hasOwnProperty.call(body, key)) metadata[key] = firstValue(body[key]);
  if (Object.prototype.hasOwnProperty.call(body, "sourceUrl")) metadata.sourceUrl = firstValue(body.sourceUrl);
  if (Object.prototype.hasOwnProperty.call(body, "url")) metadata.sourceUrl = firstValue(body.url);
  metadata.specId = firstValue(metadata.specId, parseAutohomeSpecId(metadata.sourceUrl));
  if (Object.prototype.hasOwnProperty.call(body, "trimEnNeedsConfirmation")) metadata.trimEnNeedsConfirmation = body.trimEnNeedsConfirmation === true;
  Object.assign(metadata, applyEnglishVehicleFields(metadata));
  if (Object.prototype.hasOwnProperty.call(body, "dimensions")) metadata.dimensions = normalizeDimensionsValue(body.dimensions);
  metadata.power = normalizePowerPayload({ ...metadata, ...(body.power && typeof body.power === "object" ? body.power : {}), ...body });
  metadata.motorPower = metadata.power.motorPower;
  metadata.horsepower = metadata.power.horsepower;
  metadata.range = metadata.power.range;
  metadata.batteryType = metadata.power.batteryType;
  metadata.batteryCapacity = metadata.power.batteryCapacity;
  metadata.engine = metadata.power.engine;
  metadata.transmission = metadata.power.transmission;
  metadata.displacement = metadata.power.displacement;
  metadata.fuelConsumption = metadata.power.fuelConsumption;
  if (Object.prototype.hasOwnProperty.call(body, "keywords")) metadata.keywords = normalizeIntakeKeywords(body.keywords);
  if (Object.prototype.hasOwnProperty.call(body, "keywordCandidates")) metadata.keywordCandidates = normalizeIntakeKeywordCandidates(body.keywordCandidates, metadata.keywords);
  if (Object.prototype.hasOwnProperty.call(body, "selectedMarkets")) {
    metadata.selectedMarkets = normalizeSelectedMarkets(body.selectedMarkets).filter((item) => item !== "auto");
    metadata.selectedMarket = metadata.selectedMarkets[0] || "";
  }
  if (Object.prototype.hasOwnProperty.call(body, "targetMarket")) metadata.targetMarket = firstValue(body.targetMarket);
  if (Object.prototype.hasOwnProperty.call(body, "recommendedMarkets")) metadata.recommendedMarkets = normalizeRecommendedMarkets(body.recommendedMarkets);
  if (!Array.isArray(metadata.recommendedMarkets) || !metadata.recommendedMarkets.length) metadata.recommendedMarkets = inferVehicleAttributes(metadata).recommendedMarkets;
  if (Object.prototype.hasOwnProperty.call(body, "coreSpecs")) metadata.coreSpecs = uniqueStrings(body.coreSpecs);
  if (Object.prototype.hasOwnProperty.call(body, "productHighlights")) metadata.productHighlights = uniqueStrings(body.productHighlights);
  if (Object.prototype.hasOwnProperty.call(body, "exportSellingPoints")) metadata.exportSellingPoints = uniqueStrings(body.exportSellingPoints);
  metadata.coreSpecs = buildCoreSpecs(metadata);
  if (!Array.isArray(metadata.productHighlights) || !metadata.productHighlights.length) metadata.productHighlights = buildProductHighlights(metadata);
  const marketsForPoints = normalizeSelectedMarkets(metadata.selectedMarkets).length ? metadata.selectedMarkets : metadata.recommendedMarkets.map((item) => item.market);
  if (!Array.isArray(metadata.exportSellingPoints) || !metadata.exportSellingPoints.length) metadata.exportSellingPoints = buildExportSellingPoints(marketsForPoints, metadata.recommendedMarkets, metadata);
  return metadata;
};
const buildRecognizedVehicle = async (body = {}) => {
  const url = firstValue(body.url, body.sourceUrl);
  const specId = parseAutohomeSpecId(url);
  const pageData = await fetchAutohomePageData(url, 8000);
  const scraped = pageData.ok ? extractVehicleFactsFromPageData(pageData) : {};
  const local = await findLocalAutohomeMetadata(specId, url);
  const localMetadata = local?.metadata || {};
  const known = KNOWN_AUTOHOME_SPECS[specId] || {};
  const sourceMap = {};
  const pick = (key, inferredValue = "") => {
    if (firstValue(scraped[key])) { sourceMap[key] = "scraped"; return firstValue(scraped[key]); }
    if (firstValue(known[key])) { sourceMap[key] = "inferred"; return firstValue(known[key]); }
    if (firstValue(body[key])) { sourceMap[key] = "manual"; return firstValue(body[key]); }
    if (firstValue(inferredValue)) { sourceMap[key] = "inferred"; return firstValue(inferredValue); }
    if (["brand", "model", "trim", "guidePrice"].includes(key) && firstValue(localMetadata[key])) { sourceMap[key] = "local"; return firstValue(localMetadata[key]); }
    return "";
  };
  const base = { sourceUrl: url, specId, brand: pick("brand"), model: pick("model"), trim: pick("trim"), guidePrice: pick("guidePrice"), fobPrice: firstValue(body.fobPrice, localMetadata.fobPrice), pageText: [pageData.title, pageData.metaTitle, pageData.metaDescription, pageData.metaKeywords, pageData.pageText, pageData.scriptText].filter(Boolean).join(" "), currentKeywords: normalizeIntakeKeywords(body.currentKeywords || body.keywords) };
  const inferred = inferVehicleAttributes({ ...body, ...base });
  const vehicle = {
    sourceUrl: url,
    specId,
    brand: base.brand,
    model: base.model,
    trim: base.trim,
    guidePrice: base.guidePrice,
    fobPrice: base.fobPrice,
    energyType: pick("energyType", inferred.energyType),
    bodyType: pick("bodyType", inferred.bodyType),
    power: normalizePowerPayload({ ...inferred, ...body, ...(body.power && typeof body.power === "object" ? body.power : {}) }),
    transmission: firstValue(body.transmission, inferred.transmission),
    displacement: firstValue(body.displacement, inferred.displacement),
    fuelConsumption: firstValue(body.fuelConsumption, inferred.fuelConsumption),
    range: firstValue(body.range, inferred.range),
    batteryType: firstValue(body.batteryType, inferred.batteryType),
    batteryCapacity: firstValue(body.batteryCapacity, inferred.batteryCapacity),
    seats: firstValue(body.seats),
    dimensions: normalizeDimensionsValue(firstValue(body.dimensions)),
    keywords: inferred.keywords,
    keywordCandidates: inferred.keywordCandidates,
    coreSpecs: inferred.coreSpecs,
    productHighlights: inferred.productHighlights,
    recommendedMarkets: normalizeRecommendedMarkets(body.recommendedMarkets).length ? normalizeRecommendedMarkets(body.recommendedMarkets) : inferred.recommendedMarkets,
    source: Object.values(sourceMap).includes("scraped") ? "scraped" : "inferred",
    sourceDetail: pageData.ok ? "autohome_page" : (Object.values(sourceMap).includes("local") ? "local_metadata" : "rules"),
    sources: sourceMap,
    notices: pageData.ok ? [] : [AUTOHOME_BLOCKED_MESSAGE]
  };
  Object.assign(vehicle, applyEnglishVehicleFields({ ...vehicle, brandEn: body.brandEn, modelEn: body.modelEn, trimEn: body.trimEn, displayNameEn: body.displayNameEn }));
  if (vehicle.trimEnNeedsConfirmation) vehicle.notices = uniqueStrings([vehicle.notices, "trimEn 需人工确认"]);
  vehicle.motorPower = vehicle.power.motorPower;
  vehicle.horsepower = vehicle.power.horsepower;
  vehicle.range = vehicle.power.range;
  vehicle.batteryType = vehicle.power.batteryType;
  vehicle.batteryCapacity = vehicle.power.batteryCapacity;
  vehicle.engine = vehicle.power.engine;
  vehicle.transmission = vehicle.power.transmission;
  vehicle.displacement = vehicle.power.displacement;
  vehicle.fuelConsumption = vehicle.power.fuelConsumption;
  vehicle.exportSellingPoints = buildExportSellingPoints(normalizeSelectedMarkets(body.selectedMarkets), vehicle.recommendedMarkets, vehicle);
  vehicle.missingFields = missingVehicleFields(vehicle);
  return { specId, vehicle, pageData, local };
};
const createOrLoadIntakeMetadata = async (body = {}) => {
  if (firstValue(body.metadataPath)) {
    const metadataPath = resolveAutohomeMetadataPath(body.metadataPath);
    return { metadataPath, metadata: await readAutohomeMetadata(metadataPath) };
  }
  const recognized = await buildRecognizedVehicle(body);
  const vehicle = recognized.vehicle;
  const seed = applyNewCarIntakeFields({ source: "autohome", sourceUrl: firstValue(body.url, vehicle.sourceUrl), specId: firstValue(vehicle.specId, recognized.specId), brand: vehicle.brand, model: vehicle.model, trim: vehicle.trim, guidePrice: vehicle.guidePrice, fobPrice: vehicle.fobPrice, targetMarket: firstValue(body.targetMarket, "auto"), selectedMarkets: normalizeSelectedMarkets(body.selectedMarkets).filter((item) => item !== "auto"), selectedMarket: "", downloadedAt: new Date().toISOString(), licenseStatus: "pending_review", usageNote: "Internal reference only. Do not publish until rights are confirmed.", status: "draft_internal", collectionStatus: "not_collected", reviewStatus: "pending_review", allowedStatuses: ["collected", "pending_review", "approved_for_internal", "approved_for_public", "rejected"], colors: [], images: [], missingImageTypes: ["front-right-45", "right-side-90", "rear", "front", "front-interior", "center-console"], downloadErrors: [], pageError: recognized.pageData?.ok ? "" : firstValue(recognized.pageData?.error) }, { ...vehicle, ...body });
  const slug = buildCollectorVehicleSlug(seed) || (seed.specId ? "autohome-spec-" + seed.specId : "new-car-" + Date.now());
  const dir = path.join(AUTOHOME_SOURCE_DIR, slug);
  const metadataPath = path.join(dir, "metadata.json");
  await fsp.mkdir(dir, { recursive: true });
  let metadata = seed;
  try { metadata = applyNewCarIntakeFields({ ...JSON.parse(await fsp.readFile(metadataPath, "utf8")) }, { ...seed, ...body }); } catch {}
  metadata.storagePolicy = metadata.storagePolicy || { directory: path.relative(ROOT, dir).replace(/\\/g, "/"), publishDirectory: "images/new-cars", mayPublishOnlyWhen: "approved_for_public", removeWatermark: false, replaceThirdPartyBranding: false };
  await writeAutohomeMetadata(metadataPath, metadata);
  return { metadataPath, metadata };
};
const handleRecognizeNewCarIntake = async (req, res) => {
  const body = await parseJsonBody(req);
  if (!firstValue(body.url)) return sendJson(res, 400, { success: false, error: "Missing Autohome URL" });
  try {
    const result = await buildRecognizedVehicle(body);
    const canonicalSlug = buildCollectorVehicleSlug(result.vehicle);
    const metadataPathAbs = canonicalSlug ? path.join(AUTOHOME_SOURCE_DIR, canonicalSlug, "metadata.json") : "";
    const metadataExists = metadataPathAbs && await fsp.access(metadataPathAbs).then(() => true).catch(() => false);
    const metadataPath = metadataExists ? relFromRoot(metadataPathAbs) : "";
    const draftPathAbs = metadataExists ? path.join(path.dirname(metadataPathAbs), "draft.json") : "";
    const existingDraftPath = draftPathAbs && await fsp.access(draftPathAbs).then(() => true).catch(() => false) ? relFromRoot(draftPathAbs) : "";
    return sendJson(res, 200, { success: true, specId: result.specId, vehicle: result.vehicle, metadataPath, existingDraftPath, warning: result.vehicle.notices?.[0] || "" });
  } catch (error) {
    await appendNewCarIntakeErrorLog(body, error.step || "unknown", error);
    return sendJson(res, 500, { success: false, error: "车型信息识别失败: " + error.message });
  }
};

const hasOwn = (object, key) => Object.prototype.hasOwnProperty.call(object || {}, key);
const adminAuditName = (user) => firstValue(user?.displayName, user?.name, user?.username, user?.id, "admin");
const normalizeBooleanField = (value) => value === true || value === "true" || value === 1 || value === "1" || value === "on";
const normalizeLogoProcessMode = (value) => IMAGE_PROCESS_MODES.has(firstValue(value)) ? firstValue(value) : "none";
const normalizeThirdPartyLogoFields = (raw = {}, existing = {}) => {
  const inputType = hasOwn(raw, "thirdPartyLogoType") ? firstValue(raw.thirdPartyLogoType) : firstValue(existing.thirdPartyLogoType);
  let detected = hasOwn(raw, "thirdPartyLogoDetected") ? raw.thirdPartyLogoDetected : existing.thirdPartyLogoDetected;
  let type = IMAGE_THIRD_PARTY_LOGO_TYPES.has(inputType) ? inputType : "";
  if (["none", "no_logo", "no-logo", "false"].includes(inputType) || detected === false || detected === "false") {
    detected = false;
    type = "";
  } else if (inputType === "unknown" || detected === "unknown") {
    detected = "unknown";
    type = "";
  } else if (type) {
    detected = true;
  } else if (detected === true || detected === "true") {
    detected = true;
    type = IMAGE_THIRD_PARTY_LOGO_TYPES.has(firstValue(existing.thirdPartyLogoType)) ? firstValue(existing.thirdPartyLogoType) : "other";
  } else {
    detected = existing.thirdPartyLogoDetected === true ? true : (existing.thirdPartyLogoDetected === false ? false : "unknown");
    if (detected !== true) type = "";
  }
  if (!IMAGE_THIRD_PARTY_LOGO_TYPES.has(type)) type = "";
  if (detected !== true) type = "";
  return { thirdPartyLogoDetected: detected, thirdPartyLogoType: type };
};

const normalizeSelectionImages = (incomingImages, currentImages, adminUser = null) => {
  const byFile = new Map((currentImages || []).map((item) => [item.file, item]));
  const normalized = [];
  const now = new Date().toISOString();
  const auditBy = adminAuditName(adminUser);
  let mainSet = false;
  for (const raw of Array.isArray(incomingImages) ? incomingImages : []) {
    const existing = byFile.get(firstValue(raw.file));
    if (!existing) continue;
    const type = IMAGE_SELECTION_TYPES.includes(firstValue(raw.type)) ? firstValue(raw.type) : (IMAGE_SELECTION_TYPES.includes(existing.type) ? existing.type : "other");
    const color = IMAGE_SELECTION_COLORS.includes(firstValue(raw.color)) ? firstValue(raw.color) : (IMAGE_SELECTION_COLORS.includes(existing.color) ? existing.color : "unknown-color");
    const ignored = raw.ignored === true;
    const isMainImage = raw.isMainImage === true && !ignored && !mainSet;
    if (isMainImage) mainSet = true;
    const selected = isMainImage || (raw.selected === true && !ignored);
    const licenseConfirmed = hasOwn(raw, "licenseConfirmed") ? normalizeBooleanField(raw.licenseConfirmed) : existing.licenseConfirmed === true;
    const licenseEditAllowed = hasOwn(raw, "licenseEditAllowed") ? normalizeBooleanField(raw.licenseEditAllowed) : existing.licenseEditAllowed === true;
    const logoFields = normalizeThirdPartyLogoFields(raw, existing);
    normalized.push({
      ...existing,
      type,
      color,
      selected,
      ignored,
      isMainImage,
      status: firstValue(raw.status, existing.status, "pending_review"),
      width: Number(raw.width || existing.width || 0),
      height: Number(raw.height || existing.height || 0),
      fileSize: Number(raw.fileSize || existing.fileSize || 0),
      maybeThumbnail: raw.maybeThumbnail === "unknown" || existing.maybeThumbnail === "unknown" ? "unknown" : (raw.maybeThumbnail === true || existing.maybeThumbnail === true),
      watermarkDetected: firstValue(raw.watermarkDetected, existing.watermarkDetected, "unknown"),
      licenseConfirmed,
      licenseConfirmedAt: licenseConfirmed ? firstValue(existing.licenseConfirmedAt, now) : "",
      licenseConfirmedBy: licenseConfirmed ? firstValue(existing.licenseConfirmedBy, auditBy) : "",
      licenseEditAllowed,
      licenseEditConfirmedAt: licenseEditAllowed ? firstValue(existing.licenseEditConfirmedAt, now) : "",
      licenseEditConfirmedBy: licenseEditAllowed ? firstValue(existing.licenseEditConfirmedBy, auditBy) : "",
      licenseNote: hasOwn(raw, "licenseNote") ? String(raw.licenseNote ?? "").trim() : firstValue(existing.licenseNote),
      thirdPartyLogoDetected: logoFields.thirdPartyLogoDetected,
      thirdPartyLogoType: logoFields.thirdPartyLogoType,
      logoProcessMode: normalizeLogoProcessMode(firstValue(raw.logoProcessMode, existing.logoProcessMode, "none")),
      publicFile: firstValue(raw.publicFile, existing.publicFile),
      publicReady: licenseConfirmed ? (raw.publicReady === true || existing.publicReady === true) : false,
      processedAt: firstValue(raw.processedAt, existing.processedAt),
      processingAction: firstValue(raw.processingAction, existing.processingAction),
      processedBy: firstValue(raw.processedBy, existing.processedBy)
    });
  }
  return normalized.length ? normalized : currentImages;
};

const recomputeMetadataSummaries = (metadata) => {
  const required = ["front-right-45", "right-side-90", "rear", "front", "front-interior", "center-console"];
  metadata.colors = [...new Set((metadata.images || []).filter((item) => !item.ignored).map((item) => item.color || "unknown-color"))].sort();
  const activeTypes = new Set((metadata.images || []).filter((item) => !item.ignored).map((item) => item.type));
  metadata.missingImageTypes = required.filter((type) => !activeTypes.has(type));
  return metadata;
};
const recomputePublicImageSummaries = (metadata) => {
  const publicImages = (metadata.images || []).filter((item) => item.publicReady === true && item.licenseConfirmed === true && firstValue(item.publicFile));
  metadata.publicImages = publicImages.map((item) => item.publicFile);
  if (publicImages.length) metadata.publicImageStatus = "generated";
  else if (metadata.publicImageStatus === "generated") metadata.publicImageStatus = "pending_review";
  return metadata;
};

const handleSaveNewCarImageSelection = async (req, res, adminUser = null) => {
  const body = await parseJsonBody(req);
  const metadataPath = resolveAutohomeMetadataPath(body.metadataPath);
  const metadata = await readAutohomeMetadata(metadataPath);
  metadata.images = normalizeSelectionImages(body.images, metadata.images || [], adminUser);
  applyNewCarIntakeFields(metadata, body);
  metadata.updatedAt = new Date().toISOString();
  recomputeMetadataSummaries(metadata);
  recomputePublicImageSummaries(metadata);
  await writeAutohomeMetadata(metadataPath, metadata);
  metadata.metadataPath = relFromRoot(metadataPath);
  return sendJson(res, 200, { success: true, metadata });
};
const assertResolvedInside = (baseDir, targetPath, message) => {
  const base = path.resolve(baseDir);
  const target = path.resolve(targetPath);
  if (!(target === base || target.startsWith(base + path.sep))) {
    const error = new Error(message);
    error.status = 403;
    throw error;
  }
  return target;
};
const sourceImagePathForMetadata = (metadataPath, imageFile) => {
  const relative = firstValue(imageFile).replace(/\\/g, "/");
  if (!relative || path.isAbsolute(relative) || relative.includes("..")) {
    const error = new Error("imageFile must be a relative metadata image file");
    error.status = 400;
    throw error;
  }
  return assertResolvedInside(path.dirname(metadataPath), path.join(path.dirname(metadataPath), relative), "imageFile must stay inside the source metadata directory");
};
const publicVehicleFolder = (metadata, metadataPath) => {
  const slug = buildCollectorVehicleSlug(metadata) || collectorSlugify(path.basename(path.dirname(metadataPath))) || "new-car";
  return slug || "new-car";
};
const nextOtherPublicFile = (manifest) => {
  const used = new Set((manifest.images || []).map((item) => path.basename(firstValue(item.file))));
  for (let index = 1; index < 1000; index += 1) {
    const name = `other-${String(index).padStart(2, "0")}.jpg`;
    if (!used.has(name)) return name;
  }
  return `other-${Date.now()}.jpg`;
};
const publicFileNameForImage = (image, manifest) => {
  const existing = (manifest.images || []).find((item) => firstValue(item.sourceFile) === firstValue(image.sourceFileRel));
  if (existing?.file) return path.basename(existing.file);
  if (image.isMainImage === true) return "main.jpg";
  return IMAGE_PUBLIC_FILE_BY_TYPE[firstValue(image.type)] || nextOtherPublicFile(manifest);
};
const ZHONGGU_PIXEL_FONT = {
  Z: ["11111", "00010", "00100", "01000", "10000", "10000", "11111"],
  H: ["10001", "10001", "10001", "11111", "10001", "10001", "10001"],
  O: ["01110", "10001", "10001", "10001", "10001", "10001", "01110"],
  N: ["10001", "11001", "10101", "10011", "10001", "10001", "10001"],
  G: ["01110", "10001", "10000", "10111", "10001", "10001", "01110"],
  U: ["10001", "10001", "10001", "10001", "10001", "10001", "01110"]
};
const writeZhongguLogoPpm = async (logoPath) => {
  const width = 420;
  const height = 120;
  const pixels = Buffer.alloc(width * height * 3);
  const setPixel = (x, y, r, g, b) => {
    if (x < 0 || y < 0 || x >= width || y >= height) return;
    const index = (y * width + x) * 3;
    pixels[index] = r;
    pixels[index + 1] = g;
    pixels[index + 2] = b;
  };
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) setPixel(x, y, 21, 63, 117);
  }
  const scale = 8;
  const gap = 6;
  const text = "ZHONGGU";
  const textWidth = text.length * 5 * scale + (text.length - 1) * gap * scale;
  const startX = Math.round((width - textWidth) / 2);
  const startY = Math.round((height - 7 * scale) / 2);
  for (let charIndex = 0; charIndex < text.length; charIndex += 1) {
    const glyph = ZHONGGU_PIXEL_FONT[text[charIndex]];
    const charX = startX + charIndex * (5 + gap) * scale;
    glyph.forEach((row, rowIndex) => {
      [...row].forEach((cell, colIndex) => {
        if (cell !== "1") return;
        for (let dy = 0; dy < scale; dy += 1) {
          for (let dx = 0; dx < scale; dx += 1) setPixel(charX + colIndex * scale + dx, startY + rowIndex * scale + dy, 255, 255, 255);
        }
      });
    });
  }
  await fsp.mkdir(path.dirname(logoPath), { recursive: true });
  await fsp.writeFile(logoPath, Buffer.concat([Buffer.from(`P6\n${width} ${height}\n255\n`), pixels]));
};
const logoOverlayPlacement = (mode) => ({
  plate: { w: "main_w*0.28", x: "main_w*0.36", y: "main_h*0.70" },
  "watermark-right": { w: "main_w*0.26", x: "main_w*0.70", y: "main_h*0.84" },
  "watermark-left": { w: "main_w*0.26", x: "main_w*0.04", y: "main_h*0.84" }
}[mode] || null);
const execFfmpegImage = (args) => new Promise((resolve, reject) => {
  execFile("ffmpeg", args, { cwd: ROOT, timeout: 60000, maxBuffer: 1024 * 1024 }, (error, stdout = "", stderr = "") => {
    if (error) {
      error.message = `${error.message}${stderr ? `\n${stderr.split(/\r?\n/).slice(-8).join("\n")}` : ""}`;
      reject(error);
      return;
    }
    resolve({ stdout, stderr });
  });
});
const runFfmpegImageProcess = async (sourcePath, outputPath, processMode) => {
  const baseFilter = "scale=w=1600:h=-2:force_original_aspect_ratio=decrease";
  const placement = logoOverlayPlacement(processMode);
  if (!placement) return await execFfmpegImage(["-y", "-i", sourcePath, "-vf", baseFilter, "-frames:v", "1", "-q:v", "3", outputPath]);
  const logoPath = path.join(TMP_DIR, `zhonggu-logo-${process.pid}-${Date.now()}-${crypto.randomBytes(2).toString("hex")}.ppm`);
  await writeZhongguLogoPpm(logoPath);
  try {
    const filter = `[0:v]${baseFilter}[base];[1:v][base]scale2ref=w=${placement.w}:h=-1[logo][base2];[base2][logo]overlay=x=${placement.x}:y=${placement.y}`;
    return await execFfmpegImage(["-y", "-i", sourcePath, "-i", logoPath, "-filter_complex", filter, "-frames:v", "1", "-q:v", "3", outputPath]);
  } finally {
    await fsp.unlink(logoPath).catch(() => {});
  }
};
const readPublicImageManifest = async (manifestPath, vehicleFolder, sourceMetadata, publicImageDir) => {
  const existing = await fsp.readFile(manifestPath, "utf8").then((raw) => JSON.parse(raw)).catch(() => null);
  const now = new Date().toISOString();
  return {
    vehicleFolder,
    createdAt: firstValue(existing?.createdAt, now),
    updatedAt: now,
    sourceMetadata,
    publicImageDir,
    images: Array.isArray(existing?.images) ? existing.images : []
  };
};
const handleProcessNewCarIntakeImage = async (req, res, adminUser = null) => {
  const body = await parseJsonBody(req);
  if (firstValue(body.action) !== "process_for_public") {
    const error = new Error("Invalid process-image action");
    error.status = 400;
    throw error;
  }
  const metadataPath = resolveAutohomeMetadataPath(body.metadataPath);
  const metadata = await readAutohomeMetadata(metadataPath);
  const imageFile = firstValue(body.imageFile).replace(/\\/g, "/");
  const imageIndex = (metadata.images || []).findIndex((item) => firstValue(item.file).replace(/\\/g, "/") === imageFile);
  if (imageIndex < 0) {
    const error = new Error("imageFile must exist in metadata.images");
    error.status = 404;
    throw error;
  }
  const image = metadata.images[imageIndex];
  if (image.licenseConfirmed !== true) {
    const error = new Error("请先确认该图片已获得公开使用授权。");
    error.status = 403;
    throw error;
  }
  if (image.thirdPartyLogoDetected === true && image.licenseEditAllowed !== true) {
    const error = new Error("该图片含第三方平台标识。请确认是否拥有编辑/替换标识授权。");
    error.status = 403;
    throw error;
  }
  const processMode = normalizeLogoProcessMode(firstValue(body.logoProcessMode, image.logoProcessMode, "none"));
  if (processMode !== "none" && image.licenseEditAllowed !== true) {
    const error = new Error("替换第三方平台标识前必须确认编辑/裁切/替换授权。");
    error.status = 403;
    throw error;
  }
  const sourcePath = sourceImagePathForMetadata(metadataPath, imageFile);
  await fsp.access(sourcePath, fs.constants.R_OK);
  const vehicleFolder = publicVehicleFolder(metadata, metadataPath);
  const publicDir = assertResolvedInside(PUBLIC_NEW_CAR_DIR, path.join(PUBLIC_NEW_CAR_DIR, vehicleFolder), "public image directory must stay inside images/new-cars");
  await fsp.mkdir(publicDir, { recursive: true });
  const manifestPath = path.join(publicDir, "image-manifest.json");
  const sourceMetadata = relFromRoot(metadataPath);
  const publicImageDir = relFromRoot(publicDir);
  const manifest = await readPublicImageManifest(manifestPath, vehicleFolder, sourceMetadata, publicImageDir);
  image.sourceFileRel = relFromRoot(sourcePath);
  const publicName = publicFileNameForImage(image, manifest);
  const outputPath = assertResolvedInside(publicDir, path.join(publicDir, publicName), "public image output must stay inside its vehicle folder");
  const processingAction = processMode === "none" ? (image.thirdPartyLogoDetected === true ? "process_for_public_without_logo_replacement" : "process_for_public") : "replace_logo_with_zhonggu";
  await runFfmpegImageProcess(sourcePath, outputPath, processMode);
  const processedAt = new Date().toISOString();
  const processedBy = adminAuditName(adminUser);
  const publicFile = relFromRoot(outputPath);
  metadata.images[imageIndex] = {
    ...image,
    publicFile,
    publicReady: true,
    processedAt,
    processingAction,
    processedBy,
    logoProcessMode: processMode
  };
  const manifestEntry = {
    file: path.basename(publicFile),
    publicFile,
    sourceFile: relFromRoot(sourcePath),
    type: firstValue(image.type, "other"),
    color: firstValue(image.color, "unknown-color"),
    isMainImage: image.isMainImage === true,
    licenseConfirmed: true,
    licenseEditAllowed: image.licenseEditAllowed === true,
    thirdPartyLogoDetected: image.thirdPartyLogoDetected,
    thirdPartyLogoType: firstValue(image.thirdPartyLogoType),
    processingAction,
    logoProcessMode: processMode,
    licenseNote: firstValue(image.licenseNote),
    processedAt,
    processedBy
  };
  manifest.images = (manifest.images || []).filter((item) => firstValue(item.file) !== publicName && firstValue(item.sourceFile) !== relFromRoot(sourcePath));
  manifest.images.push(manifestEntry);
  manifest.updatedAt = processedAt;
  await fsp.writeFile(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`, "utf8");
  metadata.publicImageStatus = "generated";
  metadata.publicImageDir = publicImageDir;
  recomputePublicImageSummaries(metadata);
  metadata.updatedAt = processedAt;
  recomputeMetadataSummaries(metadata);
  await writeAutohomeMetadata(metadataPath, metadata);
  metadata.metadataPath = relFromRoot(metadataPath);
  return sendJson(res, 200, { success: true, metadata, publicFile, publicImageDir, manifestPath: relFromRoot(manifestPath), image: metadata.images[imageIndex] });
};
const handleLoadNewCarIntakeDraft = async (req, res) => {
  const body = await parseJsonBody(req);
  const metadataPath = resolveAutohomeMetadataPath(body.metadataPath);
  const metadata = applyNewCarIntakeFields(await readAutohomeMetadata(metadataPath), {});
  const draftPath = path.join(path.dirname(metadataPath), "draft.json");
  const draft = await fsp.readFile(draftPath, "utf8").then((raw) => JSON.parse(raw)).catch(() => null);
  metadata.metadataPath = relFromRoot(metadataPath);
  if (draft) metadata.draftPath = relFromRoot(draftPath);
  return sendJson(res, 200, { success: true, metadata, draft, metadataPath: metadata.metadataPath, draftPath: draft ? relFromRoot(draftPath) : "" });
};

const titleToken = (value) => {
  const raw = firstValue(value);
  if (raw === "一汽奔腾" || raw.toLowerCase() === "faw-bestune") return "Bestune";
  if (raw === "小马" || raw.toLowerCase() === "xiaoma") return "Xiaoma";
  return raw;
};
const draftSlugToken = (value) => collectorSlugify(titleToken(value));
const selectedDraftMarkets = (metadata) => {
  const selected = normalizeSelectedMarkets(metadata.selectedMarkets);
  if (selected.length) return selected;
  if (firstValue(metadata.selectedMarket)) return [firstValue(metadata.selectedMarket)];
  if (metadata.targetMarket && metadata.targetMarket !== "auto") return [metadata.targetMarket];
  return metadata.recommendedMarkets?.[0]?.market ? [metadata.recommendedMarkets[0].market] : [];
};
const exportPointsForMarket = (market, recommendedMarkets = []) => {
  const selected = recommendedMarkets.find((item) => item.market === market);
  const reason = selected?.reason;
  const points = [];
  if (market === "Southeast Asia") points.push("Urban mobility, price-sensitive buyers, and low running cost can be used as the first export angle.");
  else if (market === "Middle East") points.push("Short-distance city delivery and urban commuting can be tested before broader promotion.");
  else if (market === "South America") points.push("Selected cities may respond to low-cost urban EVs, subject to charging and homologation checks.");
  else if (market === "Algeria") points.push("Use caution: NEV acceptance should be verified against gasoline vehicle preference.");
  else if (market === "West Africa") points.push("Use caution: charging infrastructure and used gasoline vehicle preference may affect demand.");
  else if (market === "Central Asia") points.push("Use caution: winter conditions and range performance should be checked.");
  else if (market) points.push(`Market fit for ${market} should be confirmed by sales before public promotion.`);
  if (reason) points.push(reason);
  return [...new Set(points)];
};
const buildInternalDraft = (metadata) => {
  const normalized = applyNewCarIntakeFields({ ...metadata }, metadata);
  const activeImages = (normalized.images || []).filter((item) => item.ignored !== true);
  const publicReadyImages = activeImages.filter((item) => item.publicReady === true && item.licenseConfirmed === true && firstValue(item.publicFile));
  const draftImagePath = (item) => item?.publicReady === true && item?.licenseConfirmed === true && firstValue(item.publicFile) ? firstValue(item.publicFile) : firstValue(item?.file);
  const selectedImages = (publicReadyImages.length ? publicReadyImages : activeImages.filter((item) => item.selected)).map(draftImagePath).filter(Boolean);
  const mainImageRecord = publicReadyImages.find((item) => item.isMainImage) || publicReadyImages.find((item) => item.selected) || publicReadyImages[0] || activeImages.find((item) => item.isMainImage) || activeImages.find((item) => item.selected) || activeImages[0] || null;
  const mainImage = draftImagePath(mainImageRecord);
  const selectedMarkets = selectedDraftMarkets(normalized);
  const recommendedMarkets = normalizeRecommendedMarkets(normalized.recommendedMarkets).length ? normalizeRecommendedMarkets(normalized.recommendedMarkets) : inferVehicleAttributes(normalized).recommendedMarkets;
  const marketsForPoints = selectedMarkets.length ? selectedMarkets : recommendedMarkets.map((item) => item.market);
  const english = applyEnglishVehicleFields(normalized);
  const brandTitle = english.brandEn || titleToken(normalized.brand);
  const modelTitle = english.modelEn || titleToken(normalized.model);
  const seoTrim = english.trimEn || safeEnglishText(normalized.trim);
  const displayName = englishSeoName(english);
  const faqName = [brandTitle, modelTitle].filter(Boolean).join(" ") || "this model";
  const slugBase = collectorSlugify(displayName) || [draftSlugToken(brandTitle), draftSlugToken(modelTitle), draftSlugToken(seoTrim)].filter(Boolean).join("-");
  const slug = [slugBase, "export"].filter(Boolean).join("-");
  const power = normalizePowerPayload(normalized);
  const keywords = normalizeIntakeKeywords(normalized.keywords);
  const keywordCandidates = normalizeIntakeKeywordCandidates(normalized.keywordCandidates, keywords);
  const coreSpecs = buildCoreSpecs(normalized);
  const productHighlights = uniqueStrings(normalized.productHighlights).length ? uniqueStrings(normalized.productHighlights) : buildProductHighlights(normalized);
  const exportSellingPoints = buildExportSellingPoints(marketsForPoints, recommendedMarkets, normalized);
  const warnings = ["Internal draft only. Images are pending rights review and must not enter the public gallery until approved_for_public."];
  const missingDraftFields = missingVehicleFields(normalized);
  if (missingDraftFields.length) warnings.push("仍有配置字段需要人工确认，发布前请补全。");
  if (mainImageRecord && mainImageRecord.maybeThumbnail === true) warnings.push("当前主图可能是缩略图，建议更换高清主图。");
  if (!activeImages.length) warnings.push("No reviewed internal images selected yet. Keep public publishing disabled until image rights are confirmed.");
  if (!publicReadyImages.length) warnings.push("Current images are internal reference materials only and cannot be published on the official website.");
  return {
    status: "draft_internal",
    brand: normalized.brand || "",
    model: normalized.model || "",
    trim: normalized.trim || "",
    brandEn: english.brandEn || "",
    modelEn: english.modelEn || "",
    trimEn: english.trimEn || "",
    displayNameEn: displayName || "",
    trimEnNeedsConfirmation: english.trimEnNeedsConfirmation === true,
    guidePrice: normalized.guidePrice || "",
    fobPrice: normalized.fobPrice || "",
    energyType: normalized.energyType || "",
    bodyType: normalized.bodyType || "",
    power,
    displacement: firstValue(normalized.displacement, power.displacement),
    transmission: firstValue(normalized.transmission, power.transmission),
    range: firstValue(normalized.range, power.range),
    batteryType: firstValue(normalized.batteryType, power.batteryType),
    batteryCapacity: firstValue(normalized.batteryCapacity, power.batteryCapacity),
    seats: normalized.seats || "",
    dimensions: normalizeDimensionsValue(normalized.dimensions),
    keywords,
    keywordCandidates,
    selectedMarkets,
    recommendedMarkets,
    mainImage,
    selectedImages,
    publicImages: publicReadyImages.map((item) => firstValue(item.publicFile)).filter(Boolean),
    coreSpecs,
    productHighlights,
    exportSellingPoints,
    seo: {
      title: (displayName || "China New Car") + " Export Price from China | Zhonggu Auto Export",
      description: (displayName || "This model") + " is available for vehicle export from China. Contact Zhonggu Auto Export for FOB price, inspection support, export documents and shipping quotation.",
      slug,
      keywords: [brandTitle, modelTitle, seoTrim, "China car export", "FOB price"].filter((item) => item && !hasCjk(item))
    },
    faq: [
      "Is " + faqName + " available for export?",
      "What is the FOB price for " + faqName + "?",
      "Which markets are suitable for this model?",
      "Can Zhonggu Auto Export provide shipping and export documents?"
    ],
    warnings,
    warning: warnings.join(" "),
    createdAt: new Date().toISOString()
  };
};
const handleGenerateNewCarIntakeDraft = async (req, res) => {
  const body = await parseJsonBody(req);
  const loaded = await createOrLoadIntakeMetadata(body);
  const metadataPath = loaded.metadataPath;
  const metadata = applyNewCarIntakeFields(loaded.metadata, body);
  const selectedMarkets = normalizeSelectedMarkets(body.selectedMarkets).filter((item) => item !== "auto");
  if (selectedMarkets.length) {
    metadata.selectedMarkets = selectedMarkets;
    metadata.selectedMarket = selectedMarkets[0];
  }
  recomputeMetadataSummaries(metadata);
  const draft = buildInternalDraft(metadata);
  const draftPath = path.join(path.dirname(metadataPath), "draft.json");
  await fsp.writeFile(draftPath, JSON.stringify(draft, null, 2) + "\n", "utf8");
  metadata.draftPath = relFromRoot(draftPath);
  metadata.selectedMarkets = draft.selectedMarkets;
  metadata.selectedMarket = draft.selectedMarkets[0] || "";
  metadata.recommendedMarkets = draft.recommendedMarkets;
  metadata.coreSpecs = draft.coreSpecs;
  metadata.productHighlights = draft.productHighlights;
  metadata.exportSellingPoints = draft.exportSellingPoints;
  metadata.keywordCandidates = draft.keywordCandidates;
  metadata.keywords = draft.keywords;
  metadata.brandEn = draft.brandEn;
  metadata.modelEn = draft.modelEn;
  metadata.trimEn = draft.trimEn;
  metadata.displayNameEn = draft.displayNameEn;
  metadata.trimEnNeedsConfirmation = draft.trimEnNeedsConfirmation === true;
  metadata.power = draft.power;
  metadata.updatedAt = new Date().toISOString();
  await writeAutohomeMetadata(metadataPath, metadata);
  metadata.metadataPath = relFromRoot(metadataPath);
  return sendJson(res, 200, { success: true, draft, draftPath: relFromRoot(draftPath), metadata });
};
const transformWhatsappHtml = (html = "") => {
  let changed = false;
  let next = String(html || "");
  const replaceWaHref = (_match, quote, encodedText = "") => {
    changed = true;
    const messageAttr = encodedText ? ` data-whatsapp-message=${quote}${String(encodedText).replace(/&/g, "&amp;")}${quote}` : "";
    return `href=${quote}#contact-whatsapp${quote} data-whatsapp-button=${quote}true${quote}${messageAttr}`;
  };
  next = next.replace(/href=(["'])https:\/\/wa\.me\/[^"'?#\s]+(?:\?text=([^"']*))?\1/gi, replaceWaHref);
  next = next.replace(/href=(["'])https:\/\/api\.whatsapp\.com\/send\?[^"']*?(?:text=([^"'&]*))?[^"']*\1/gi, replaceWaHref);
  const shouldLoadModal = changed || /data-whatsapp-button=["']true["']|whatsapp-btn|whatsapp-button|data-action=["']whatsapp["']/i.test(next);
  if (shouldLoadModal && !/whatsapp-lead-modal\.js|whatsapp-config\.js/.test(next) && /<\/body>/i.test(next)) {
    const assets = '<link rel="stylesheet" href="/assets/css/whatsapp-lead-modal.css"><script src="/assets/js/whatsapp-lead-modal.js"></script>';
    next = next.replace(/<\/body>/i, assets + '</body>');
  }
  return next;
};
const transformWhatsappScript = (content = "", filePath = "") => {
  if (path.basename(filePath) !== "vehicle-inquiry.js") return content;
  return String(content || "")
    .replace('const WHATSAPP_NUMBER = "8618661888866";', 'const WHATSAPP_NUMBER = "";')
    .replace(/const buildVehicleWhatsappUrl = \(car = \{\}\) =>\s*`https:\/\/wa\.me\/\$\{WHATSAPP_NUMBER\}\?text=\$\{encodeURIComponent\(buildVehicleMessage\(car\)\)\}`;/, 'const buildVehicleWhatsappUrl = () => "#contact-whatsapp";');
};
const serveStatic = async (req, res) => {
  const requestUrl = new URL(req.url, `http://${req.headers.host || "localhost"}`);
  let pathname = decodeURIComponent(requestUrl.pathname === "/" ? "/index.html" : requestUrl.pathname);
  const protectedAdminAsset = pathname === "/admin" || pathname.startsWith("/admin/") || pathname.startsWith("/public/admin/");
  if (protectedAdminAsset && pathname !== "/admin/login.html") {
    const user = await getCurrentUser(req);
    if (!user) return redirectToLogin(res);
    if ((pathname.startsWith("/admin/") || pathname === "/admin") && isAdminOnlyPagePath(pathname) && !isAdmin(user)) {
      return sendForbiddenPage(res);
    }
    if (pathname.startsWith("/public/admin/") && !isAdmin(user)) {
      return sendForbiddenPage(res);
    }
  }
  pathname = adminAliasPath(pathname);
  const absolute = path.resolve(ROOT, `.${pathname}`);
  if (!absolute.startsWith(ROOT)) {
    res.writeHead(403, noCacheHeaders);
    res.end("Forbidden");
    return;
  }
  try {
    let filePath = absolute;
    let stat = await fsp.stat(filePath).catch(() => null);
    if (stat?.isDirectory()) {
      const directoryIndex = path.join(filePath, "index.html");
      const indexStat = await fsp.stat(directoryIndex).catch(() => null);
      if (indexStat?.isFile()) {
        filePath = directoryIndex;
        stat = indexStat;
      }
    }
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
    if (ext === ".html") {
      const html = await fsp.readFile(filePath, "utf8");
      res.end(transformWhatsappHtml(html));
      return;
    }
    if (path.basename(filePath) === "vehicle-inquiry.js") {
      const script = await fsp.readFile(filePath, "utf8");
      res.end(transformWhatsappScript(script, filePath));
      return;
    }
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
      return sendJson(res, 200, serviceHealthPayload());
    }
    if (req.method === "POST" && requestUrl.pathname === "/api/media-login") {
      const mediaUser = await requireAdminMediaApi(req, res);
      if (!mediaUser) return;
      const body = await parseJsonBody(req);
      if (!PASSWORD) return sendJson(res, 503, { success: false, message: "Media password is not configured" });
      if (body.password === PASSWORD) return sendJson(res, 200, { success: true });
      return sendJson(res, 401, { success: false, message: "Invalid password" });
    }
    if (req.method === "GET" && requestUrl.pathname === "/api/media-config") {
      const mediaUser = await requireAdminMediaApi(req, res);
      if (!mediaUser) return;
      if (!isAuthorized(req)) return sendJson(res, 401, { success: false, error: "Invalid password" });
      return sendJson(res, 200, { success: true, config: await readConfig() });
    }
    if (req.method === "POST" && requestUrl.pathname === "/api/admin/login") {
      const body = await parseJsonBody(req);
      const users = await readAdminUsers();
      const username = firstValue(body.username, body.user, body.account);
      const password = firstValue(body.password, body.pass, body.passwordHash);
      // Production passwords are verified by hash or by environment-provided credentials.
      const candidate = users.find((item) => item.username === username);
      if (!username || !password) {
        console.warn("[admin-login] missing username or password", { usernamePresent: !!username, passwordPresent: !!password });
        return sendJson(res, 401, { success: false, error: "Invalid username or password" });
      }
      if (!candidate) {
        console.warn("[admin-login] username not found", { username, usersPath: ADMIN_USERS_PATH, availableUsers: users.map((item) => item.username) });
        return sendJson(res, 401, { success: false, error: "Invalid username or password" });
      }
      if (candidate.active === false) {
        console.warn("[admin-login] inactive user rejected", { username, usersPath: ADMIN_USERS_PATH });
        return sendJson(res, 401, { success: false, error: "Invalid username or password" });
      }
      if (!verifyAdminPassword(candidate, password)) {
        console.warn("[admin-login] password mismatch", { username, usersPath: ADMIN_USERS_PATH });
        return sendJson(res, 401, { success: false, error: "Invalid username or password" });
      }
      const user = candidate;
      const token = crypto.randomBytes(24).toString("hex");
      sessions.set(token, { userId: user.id, createdAt: Date.now(), expiresAt: Date.now() + 1000 * 60 * 60 * 12 });
      return sendJsonWithHeaders(res, 200, { success: true, user: publicUser(user) }, { "Set-Cookie": sameSiteCookie(SESSION_COOKIE, token, "Max-Age=43200") });
    }
    if (req.method === "POST" && requestUrl.pathname === "/api/admin/logout") {
      const token = parseCookies(req)[SESSION_COOKIE];
      if (token) sessions.delete(token);
      return sendJsonWithHeaders(res, 200, { success: true }, { "Set-Cookie": sameSiteCookie(SESSION_COOKIE, "", "Max-Age=0") });
    }
    if (req.method === "GET" && requestUrl.pathname === "/api/admin/me") {
      const user = await requireAdminUser(req);
      return sendJson(res, 200, { success: true, user: publicUser(user) });
    }
    if (req.method === "POST" && requestUrl.pathname === "/api/upload-media") {
      const mediaUser = await requireAdminMediaApi(req, res);
      if (!mediaUser) return;
      return await handleUpload(req, res);
    }
    if (req.method === "POST" && (requestUrl.pathname === "/api/inquiries" || requestUrl.pathname === "/api/leads" || requestUrl.pathname === "/api/public/inquiries")) {
      const body = await parseJsonBody(req);
      const inquiry = await appendInquiry(body, req);
      if (requestUrl.pathname === "/api/leads") await appendLead({ ...body, inquiryId: inquiry.id, createdAt: inquiry.createdAt });
      return sendJson(res, 200, { success: true, inquiry, lead: inquiry, lead_id: inquiry.id });
    }
    if (req.method === "POST" && requestUrl.pathname === "/api/whatsapp-clicks") {
      const body = await parseJsonBody(req);
      const result = await appendWhatsappClick(body, req);
      return sendJson(res, 200, { success: true, ...result });
    }
    if (requestUrl.pathname === "/api/public/whatsapp-config") {
      if (req.method !== "GET") return sendJson(res, 405, { success: false, error: "GET required for /api/public/whatsapp-config", allowedMethods: ["GET"] });
      return await handlePublicWhatsappConfig(req, res);
    }
    if (requestUrl.pathname === "/api/public/whatsapp-link") {
      if (req.method !== "GET") return sendJson(res, 405, { success: false, error: "GET required for /api/public/whatsapp-link", allowedMethods: ["GET"] });
      return await handlePublicWhatsappLink(req, res);
    }
    if (req.method === "GET" && requestUrl.pathname === "/api/public/whatsapp-lead/status") return await handlePublicWhatsappLeadStatus(req, res);
    if (req.method === "POST" && (requestUrl.pathname === "/api/public/whatsapp-lead" || requestUrl.pathname === "/api/public/whatsapp-lead/")) return await handlePublicWhatsappLead(req, res);
    if (requestUrl.pathname === "/api/public/whatsapp-lead" || requestUrl.pathname === "/api/public/whatsapp-lead/") {
      return sendJson(res, 405, { success: false, error: "POST required for /api/public/whatsapp-lead", allowedMethods: ["POST"] });
    }
    const adminUser = requestUrl.pathname.startsWith("/api/admin/") ? await requireAdminUser(req) : null;
    if (adminUser && isAdminOnlyApiPath(requestUrl.pathname) && !isAdmin(adminUser)) return sendAdminOnlyForbidden(res);
    if (adminUser && requestUrl.pathname === "/api/admin/inquiries" && req.method !== "GET" && !isAdmin(adminUser)) return sendAdminOnlyForbidden(res);
    if (req.method === "POST" && requestUrl.pathname === "/api/admin/inquiries") {
      const body = await parseJsonBody(req);
      const inquiry = await appendManualInquiry(body, adminUser);
      return sendJson(res, 200, { success: true, inquiry });
    }
    if (req.method === "GET" && requestUrl.pathname === "/api/admin/inquiries") {
      const sourceType = firstValue(requestUrl.searchParams.get("leadType"));
      if (sourceType === "whatsapp") {
        const clicks = adminUser.role === "admin" ? normalizeWhatsappClickRecords(await readWhatsappClicks()) : [];
        const inquiries = filterInquiries(clicks, requestUrl.searchParams);
        inquiries.sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));
        return sendJson(res, 200, { success: true, inquiries });
      }
      const inquiries = filterInquiries(visibleInquiries(adminUser, await readInquiries()), requestUrl.searchParams);
      inquiries.sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));
      return sendJson(res, 200, { success: true, inquiries });
    }
    if (req.method === "GET" && requestUrl.pathname === "/api/admin/inquiries/export.csv") {
      const inquiries = filterInquiries(visibleInquiries(adminUser, await readInquiries()), requestUrl.searchParams);
      inquiries.sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));
      return await sendCsv(res, "inquiries.csv", inquiries);
    }
    if ((req.method === "PATCH" || req.method === "POST") && requestUrl.pathname.startsWith("/api/admin/inquiries/")) {
      const parts = requestUrl.pathname.split("/").filter(Boolean);
      const id = decodeURIComponent(parts[3] || "");
      const action = parts[4] || "";
      if (action === "contact-whatsapp") return await handleContactWhatsappCustomer(id, adminUser, res);
      const body = await parseJsonBody(req);
      const patch = action === "status" ? { status: body.status } : action === "note" ? { note: body.note } : action === "assign" ? { assignedTo: Object.prototype.hasOwnProperty.call(body, "assignedTo") ? body.assignedTo : (body.userId || body.salesId) } : body;
      const inquiry = await updateInquiry(id, patch, adminUser);
      return sendJson(res, 200, { success: true, inquiry });
    }
    if (req.method === "GET" && requestUrl.pathname === "/api/admin/inquiry-stats") { const items = visibleInquiries(adminUser, await readInquiries()); return sendJson(res, 200, { success: true, stats: await buildInquiryStats(adminUser), items }); }
    if (req.method === "GET" && requestUrl.pathname === "/api/admin/whatsapp-clicks") {
      if (adminUser.role !== "admin") return sendJson(res, 403, { success: false, error: "Only admin can view WhatsApp clicks" });
      return sendJson(res, 200, { success: true, clicks: normalizeWhatsappClickRecords(await readWhatsappClicks()) });
    }
    if (requestUrl.pathname === "/api/admin/whatsapp-settings") {
      if (req.method === "GET") return await handleGetWhatsappSettings(req, res);
      if (req.method === "POST") return await handleSaveWhatsappSettings(req, res, adminUser);
      return sendJson(res, 405, { success: false, error: "GET or POST required for /api/admin/whatsapp-settings", allowedMethods: ["GET", "POST"] });
    }
    const userCollectionApi = ["/api/admin/sales-users", "/api/admin/employees", "/api/admin/users"].includes(requestUrl.pathname);
    const userMemberApiPrefix = ["/api/admin/sales-users/", "/api/admin/employees/", "/api/admin/users/"].find((prefix) => requestUrl.pathname.startsWith(prefix));
    if (req.method === "GET" && userCollectionApi) return await handleGetSalesUsers(adminUser, res);
    if (req.method === "POST" && userCollectionApi) return await handleCreateSalesUser(req, adminUser, res);
    if (req.method === "PATCH" && userMemberApiPrefix) {
      const id = decodeURIComponent(requestUrl.pathname.slice(userMemberApiPrefix.length));
      return await handlePatchSalesUser(req, id, adminUser, res);
    }
    if (req.method === "GET" && requestUrl.pathname === "/api/admin/routes") return sendJson(res, 200, { success: true, pages: ADMIN_PAGES, apis: ADMIN_APIS });
    if (requestUrl.pathname === "/api/admin/collect-autohome-images") {
      if (req.method !== "POST") return sendJson(res, 405, { success: false, error: "POST required for /api/admin/collect-autohome-images", allowedMethods: ["POST"] });
      return await handleCollectAutohomeImages(req, res);
    }
    if (requestUrl.pathname === "/api/admin/new-car-intake/collector-status") {
      if (req.method !== "GET") return sendJson(res, 405, { success: false, error: "GET required for /api/admin/new-car-intake/collector-status", allowedMethods: ["GET"] });
      return await handleCollectorStatus(req, res);
    }
    if (requestUrl.pathname === "/api/admin/new-car-intake/recognize") {
      if (req.method !== "POST") return sendJson(res, 405, { success: false, error: "POST required for /api/admin/new-car-intake/recognize", allowedMethods: ["POST"] });
      return await handleRecognizeNewCarIntake(req, res);
    }
    if (requestUrl.pathname === "/api/admin/new-car-intake/image-selection") {
      if (req.method !== "POST") return sendJson(res, 405, { success: false, error: "POST required for /api/admin/new-car-intake/image-selection", allowedMethods: ["POST"] });
      return await handleSaveNewCarImageSelection(req, res, adminUser);
    }
    if (requestUrl.pathname === "/api/admin/new-car-intake/process-image") {
      if (req.method !== "POST") return sendJson(res, 405, { success: false, error: "POST required for /api/admin/new-car-intake/process-image", allowedMethods: ["POST"] });
      return await handleProcessNewCarIntakeImage(req, res, adminUser);
    }    if (requestUrl.pathname === "/api/admin/new-car-intake/draft") {
      if (req.method !== "POST") return sendJson(res, 405, { success: false, error: "POST required for /api/admin/new-car-intake/draft", allowedMethods: ["POST"] });
      return await handleGenerateNewCarIntakeDraft(req, res);
    }
    if (requestUrl.pathname === "/api/admin/new-car-intake/load-draft") {
      if (req.method !== "POST") return sendJson(res, 405, { success: false, error: "POST required for /api/admin/new-car-intake/load-draft", allowedMethods: ["POST"] });
      return await handleLoadNewCarIntakeDraft(req, res);
    }
    if (req.method === "POST" && requestUrl.pathname === "/api/admin/regenerate-vehicle-pages") return await handleRegenerateVehiclePages(req, res);
    if (req.method === "GET" && requestUrl.pathname === "/api/admin/image-mapping") return await handleGetImageMapping(res);
    if (req.method === "GET" && requestUrl.pathname === "/api/admin/available-images") return await handleGetAvailableImages(res);
    if (req.method === "GET" && requestUrl.pathname === "/api/admin/image-library/usage") return await handleImageLibraryUsage(req, res);
    if (req.method === "POST" && requestUrl.pathname === "/api/admin/image-library/move-to-trash") return await handleMoveImageToTrash(req, res);
    if (req.method === "POST" && requestUrl.pathname === "/api/admin/image-library/restore") return await handleRestoreImageFromTrash(req, res);
    if (req.method === "DELETE" && requestUrl.pathname === "/api/admin/image-library/delete") return await handleDeleteTrashImage(req, res);
    if (req.method === "GET" && requestUrl.pathname === "/api/admin/used-cars") return await handleGetUsedCars(res);
    if (req.method === "GET" && requestUrl.pathname === "/api/admin/used-car-media-library") return await handleGetUsedCarMediaLibrary(res);
    if (requestUrl.pathname.startsWith("/api/admin/used-cars/")) {
      const parts = requestUrl.pathname.split("/").filter(Boolean);
      const slug = decodeURIComponent(parts[3] || "");
      const action = parts[4] || "";
      const subAction = parts[5] || "";
      if (req.method === "GET" && action === "media") return await handleGetUsedCarMedia(slug, res);
      if (req.method === "POST" && action === "media" && subAction === "remove") return await handleRemoveUsedCarMedia(req, slug, res);
      if (req.method === "POST" && action === "media") return await handleSaveUsedCarMedia(req, slug, res);
      if (req.method === "POST" && action === "images") return await handleAddUsedCarImage(req, slug, res);
      if (req.method === "POST" && action === "videos") return await handleAddUsedCarVideo(req, slug, res);
      if (req.method === "POST" && action === "cover") return await handleSetUsedCarCover(req, slug, res);
      if (req.method === "DELETE" && action === "images") return await handleRemoveUsedCarImage(req, slug, res);
      if (req.method === "DELETE" && action === "videos") return await handleRemoveUsedCarVideo(req, slug, res);
    }
    if (req.method === "POST" && requestUrl.pathname === "/api/admin/image-mapping") return await handleSaveImageMapping(req, res);
    if (req.method === "POST" && requestUrl.pathname === "/api/admin/image-mapping/delete") { const body = await parseJsonBody(req); return await handleDeleteImageMapping(body.slug || body.id || "", res); }
    if (req.method === "DELETE" && requestUrl.pathname.startsWith("/api/admin/image-mapping/")) return await handleDeleteImageMapping(requestUrl.pathname.slice("/api/admin/image-mapping/".length), res);
    if (req.method === "POST" && requestUrl.pathname === "/api/set-active-media") {
      const mediaUser = await requireAdminMediaApi(req, res);
      if (!mediaUser) return;
      return await handleSetActive(req, res);
    }
    if (req.method === "GET" || req.method === "HEAD") return await serveStatic(req, res);
    sendJson(res, 405, { success: false, error: "Method not allowed" });
  } catch (error) {
    sendJson(res, error.status || 400, { success: false, error: error.message });
  }
});

ensureDirs().then(() => {
  server.listen(PORT, HOST, () => {
    const addresses = Object.values(os.networkInterfaces()).flat()
      .filter((item) => item && item.family === "IPv4" && !item.internal)
      .map((item) => item.address);
    console.log("");
    console.log("Media upload server started:");
    console.log(`Website: http://127.0.0.1:${PORT}/`);
    console.log(`Media:   http://127.0.0.1:${PORT}/admin/media.html`);
    console.log(`Images:  http://127.0.0.1:${PORT}/admin/image-mapping.html`);
    addresses.forEach((address) => console.log(`Network: http://${address}:${PORT}/admin/media.html`));
    console.log(`Health:  http://127.0.0.1:${PORT}/api/health`);
    console.log("");
  });
}).catch((error) => {
  console.error(error);
  process.exit(1);
});





















