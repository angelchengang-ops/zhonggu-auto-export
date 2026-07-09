const crypto = require("crypto");

const STORE_NAME = process.env.ZHONGGU_CRM_BLOBS_STORE || "zhonggu-crm";
const LEADS_KEY = "leads.json";
const SETTINGS_KEY = "whatsapp-settings.json";
const MAX_FORM_IMPORT = Number(process.env.ZHONGGU_FORMS_IMPORT_LIMIT || 200);

const memory = globalThis.__ZHONGGU_CRM_MEMORY__ || (globalThis.__ZHONGGU_CRM_MEMORY__ = { leads: [], settings: null });

const firstValue = (...values) => values.map((value) => String(value ?? "").trim()).find(Boolean) || "";
const clean = (value) => String(value ?? "").trim();
const nowIso = () => new Date().toISOString();
const clone = (value) => JSON.parse(JSON.stringify(value));
const leadId = (prefix = "INQ") => `${prefix}-${new Date().toISOString().replace(/[-:.TZ]/g, "").slice(0, 14)}-${crypto.randomBytes(3).toString("hex").toUpperCase()}`;

const getHeader = (headers = {}, name) => {
  const target = String(name).toLowerCase();
  const key = Object.keys(headers || {}).find((item) => item.toLowerCase() === target);
  return key ? headers[key] : "";
};

const isNetlifyRuntime = () => Boolean(process.env.NETLIFY || process.env.AWS_LAMBDA_FUNCTION_NAME || process.env.NETLIFY_DEV);
const compactError = (error) => String(error?.message || error || "Unknown error").split(/\r?\n/)[0].replace(/\s+imported from .+$/, "").replace(/\s+from \/var\/task\/.+$/, "");

const nativeImport = new Function("specifier", "return import(specifier)");
let blobStorePromise = null;
const getBlobStore = async () => {
  if (blobStorePromise) return blobStorePromise;
  blobStorePromise = (async () => {
    try {
      const blobs = await nativeImport("@netlify/blobs");
      const getStore = blobs.getStore || blobs.default?.getStore;
      if (typeof getStore !== "function") throw new Error("getStore export was not found");
      return getStore(STORE_NAME);
    } catch (error) {
      if (isNetlifyRuntime()) throw new Error(`Netlify Blobs module unavailable: ${compactError(error)}`);
      return null;
    }
  })();
  return blobStorePromise;
};

const readJson = async (key, fallback) => {
  const store = await getBlobStore();
  if (!store) return clone(key === LEADS_KEY ? memory.leads : (memory.settings || fallback));
  try {
    const value = await store.get(key, { type: "json", consistency: "strong" });
    return value ?? clone(fallback);
  } catch (error) {
    throw new Error(`Netlify Blobs read failed for ${STORE_NAME}/${key}: ${compactError(error)}`);
  }
};

const writeJson = async (key, value) => {
  const store = await getBlobStore();
  if (!store) {
    if (key === LEADS_KEY) memory.leads = clone(value);
    if (key === SETTINGS_KEY) memory.settings = clone(value);
    return { ok: true, storage: "memory" };
  }
  try {
    const result = typeof store.setJSON === "function"
      ? await store.setJSON(key, value)
      : await store.set(key, JSON.stringify(value), { contentType: "application/json; charset=utf-8" });
    if (key === LEADS_KEY) memory.leads = clone(value);
    if (key === SETTINGS_KEY) memory.settings = clone(value);
    return { ok: true, storage: "netlify-blobs", result };
  } catch (error) {
    throw new Error(`Netlify Blobs write failed for ${STORE_NAME}/${key}: ${compactError(error)}`);
  }
};

const sourceTypeOf = (item = {}) => {
  const sourceType = clean(item.sourceType || item.source_type).toLowerCase();
  const source = clean(item.source).toLowerCase();
  if (sourceType === "whatsapp_click" || source === "whatsapp_click" || source === "whatsapp") return "whatsapp_click";
  if (sourceType === "manual" || source === "manual") return "manual";
  return "website_form";
};

const normalizeStatus = (value, fallback = "new") => {
  const status = clean(value || fallback).toLowerCase();
  if (status === "pending") return "waiting";
  if (["new", "assigned", "contacted", "quoted", "waiting", "won", "closed", "lost", "whatsapp_click", "whatsapp_lead"].includes(status)) return status;
  return fallback;
};

const normalizeAssignedTo = (value) => {
  const assigned = clean(value);
  if (!assigned || /^unassigned$/i.test(assigned) || assigned === "未分配") return "";
  const key = assigned.toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_+|_+$/g, "");
  if (["chen", "chen_gang", "admin", "admin_chen"].includes(key)) return "admin_chen";
  if (["zheng", "zheng_guozhi", "sales_zheng"].includes(key)) return "sales_zheng";
  return assigned;
};

const assignedName = (assignedTo) => {
  const id = normalizeAssignedTo(assignedTo);
  if (id === "admin_chen") return "Chen Gang";
  if (id === "sales_zheng") return "Zheng Guozhi";
  return id || "unassigned";
};

const normalizeWhatsapp = (body = {}) => {
  const raw = firstValue(body.rawWhatsapp, body.raw_whatsapp, body.whatsapp, body.phone, body.mobile, body.tel);
  const digits = raw.replace(/^00/, "").replace(/\D/g, "");
  return { rawWhatsapp: raw, whatsapp: digits || raw };
};

const clientIpHash = (event = {}) => {
  const raw = firstValue(
    getHeader(event.headers, "x-nf-client-connection-ip"),
    getHeader(event.headers, "client-ip"),
    getHeader(event.headers, "x-forwarded-for").split(",")[0]
  );
  if (!raw) return "";
  const salt = process.env.ZHONGGU_IP_HASH_SALT || "zhonggu-auto-export";
  return crypto.createHash("sha256").update(`${salt}:${raw}`).digest("hex").slice(0, 24);
};

const normalizeLead = (input = {}, event = {}, options = {}) => {
  const body = input || {};
  const createdAt = firstValue(body.createdAt, body.created_at, body.submittedAt, body.submitted_at, body.timestamp) || nowIso();
  const updatedAt = firstValue(body.updatedAt, body.updated_at) || createdAt;
  const vehicle = firstValue(body.vehicle, body.car_type, body.interestedModel, body.interested_model, body.model, body.car, body.requirement);
  const destinationPort = firstValue(body.destinationPort, body.destination_port, body.port, body.destination);
  const fobOrCif = firstValue(body.fobOrCif, body.fob_or_cif, body.fobCif, body.quoteType, body.quote_type);
  const whatsapp = normalizeWhatsapp(body);
  const requestedSource = clean(options.sourceType || body.sourceType || body.source_type || body.source).toLowerCase();
  const isClick = options.kind === "whatsapp_click" || requestedSource === "whatsapp_click" || clean(body.eventType || body.event_type).toLowerCase().includes("click");
  const isManual = options.kind === "manual" || requestedSource === "manual";
  const source = isClick ? "whatsapp_click" : isManual ? "manual" : "website_form";
  const sourceType = isClick ? "whatsapp_click" : isManual ? "manual" : "website";
  const sourceUrl = firstValue(body.sourceUrl, body.source_url, body.pageUrl, body.page_url, body.url, getHeader(event.headers, "referer"));
  const idPrefix = isClick ? "WA" : isManual ? "MAN" : "INQ";
  const notes = Array.isArray(body.notes) ? body.notes : [];
  const noteText = firstValue(body.note, body.followUp, body.follow_up);
  if (noteText && !notes.some((note) => clean(note.text) === noteText)) notes.push({ id: leadId("NOTE"), createdAt: nowIso(), authorName: "admin", text: noteText });

  return {
    id: firstValue(body.id, body.leadId, body.lead_id) || leadId(idPrefix),
    createdAt,
    updatedAt,
    source,
    sourceType,
    sourceDetail: firstValue(body.sourceDetail, body.source_detail) || (isClick ? "WhatsApp Click" : isManual ? "Manual CRM Entry" : "Website Inquiry Form"),
    sourceChannel: firstValue(body.sourceChannel, body.source_channel),
    sourceEntry: firstValue(body.sourceEntry, body.source_entry),
    sourceButton: firstValue(body.sourceButton, body.source_button, body.buttonText, body.button_text),
    name: firstValue(body.name, body.customerName, body.customer_name, body.contact_name, body.fullName, body.full_name) || (isClick ? "未知客户" : ""),
    country: firstValue(body.country, body.market_country),
    market: firstValue(body.market, body.market_region, body.market_country) || "Other",
    whatsapp: whatsapp.whatsapp,
    rawWhatsapp: whatsapp.rawWhatsapp,
    email: firstValue(body.email, body.mail, body.emailAddress, body.customerEmail),
    vehicle,
    car_type: vehicle,
    interestedModel: firstValue(body.interestedModel, body.interested_model) || vehicle,
    quantity: firstValue(body.quantity, body.qty),
    budget: firstValue(body.budget, body.budgetPerUnit, body.budget_per_unit, body.totalBudget, body.total_budget),
    fobOrCif,
    quoteType: fobOrCif || firstValue(body.quoteType, body.quote_type) || "Unknown",
    destinationPort,
    message: firstValue(body.message, body.requirements, body.remark, body.comments),
    status: isClick ? "whatsapp_click" : normalizeStatus(body.status, "new"),
    assignedTo: normalizeAssignedTo(firstValue(body.assignedTo, body.assigned_to, body.owner, body.salesId, body.sales_id)),
    assignedName: assignedName(firstValue(body.assignedTo, body.assigned_to, body.owner, body.salesId, body.sales_id)),
    notes,
    note: notes.length ? notes[notes.length - 1].text : "",
    pageUrl: sourceUrl,
    sourcePage: firstValue(body.sourcePage, body.source_page, body.page) || sourceUrl,
    sourceUrl,
    userAgent: firstValue(body.userAgent, body.user_agent, getHeader(event.headers, "user-agent")),
    ipHash: firstValue(body.ipHash, body.ip_hash) || clientIpHash(event),
    eventType: firstValue(body.eventType, body.event_type),
    leadSessionId: firstValue(body.leadSessionId, body.lead_session_id),
    converted: body.converted === true || clean(body.converted).toLowerCase() === "true",
    convertedLeadId: firstValue(body.convertedLeadId, body.converted_lead_id),
    sourceSubmissionId: firstValue(body.sourceSubmissionId, body.netlifySubmissionId, body.netlify_submission_id),
    raw: body.raw && typeof body.raw === "object" ? body.raw : body
  };
};

const readLeadsRaw = async () => {
  const value = await readJson(LEADS_KEY, []);
  return Array.isArray(value) ? value.map((item) => normalizeLead(item)) : [];
};

const writeLeads = async (items) => writeJson(LEADS_KEY, items.map((item) => normalizeLead(item)));

const mergeLeads = (existing, incoming) => {
  const byId = new Map();
  existing.forEach((item) => byId.set(item.id, item));
  incoming.forEach((item) => {
    const duplicate = [...byId.values()].find((existingItem) => item.sourceSubmissionId && existingItem.sourceSubmissionId === item.sourceSubmissionId);
    if (duplicate) byId.set(duplicate.id, { ...duplicate, ...item, id: duplicate.id, notes: duplicate.notes?.length ? duplicate.notes : item.notes });
    else byId.set(item.id, item);
  });
  return [...byId.values()].sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));
};

const netlifyApi = async (path) => {
  const token = process.env.NETLIFY_AUTH_TOKEN;
  if (!token) throw new Error("NETLIFY_AUTH_TOKEN is not configured");
  const response = await fetch(`https://api.netlify.com/api/v1${path}`, { headers: { Authorization: `Bearer ${token}` } });
  if (!response.ok) throw new Error(`Netlify API ${path} failed with HTTP ${response.status}`);
  return response.json();
};

const importNetlifyFormsIfConfigured = async () => {
  if (!process.env.NETLIFY_AUTH_TOKEN || !process.env.NETLIFY_SITE_ID) return { enabled: false, imported: 0 };
  const formName = process.env.NETLIFY_FORM_NAME || "inquiry";
  const forms = await netlifyApi(`/sites/${encodeURIComponent(process.env.NETLIFY_SITE_ID)}/forms`);
  const form = (Array.isArray(forms) ? forms : []).find((item) => item.name === formName || item.id === formName);
  if (!form?.id) return { enabled: true, imported: 0, warning: `Netlify form ${formName} not found` };
  const submissions = await netlifyApi(`/forms/${encodeURIComponent(form.id)}/submissions?per_page=${MAX_FORM_IMPORT}`);
  const imported = (Array.isArray(submissions) ? submissions : []).map((item) => normalizeLead({
    ...(item.data || {}),
    id: item.id ? `NF-${item.id}` : "",
    createdAt: item.created_at,
    updatedAt: item.created_at,
    source: "netlify-form",
    sourceType: "website",
    sourceSubmissionId: item.id,
    userAgent: item.user_agent,
    raw: { netlifySubmission: item }
  }));
  if (!imported.length) return { enabled: true, imported: 0 };
  const existing = await readLeadsRaw();
  const merged = mergeLeads(existing, imported);
  if (merged.length !== existing.length) await writeLeads(merged);
  return { enabled: true, imported: merged.length - existing.length };
};

const readLeads = async (options = {}) => {
  let formsImport = null;
  if (options.syncForms) {
    try { formsImport = await importNetlifyFormsIfConfigured(); }
    catch (error) { formsImport = { enabled: true, imported: 0, error: error.message }; }
  }
  const items = await readLeadsRaw();
  items.sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));
  return { items, formsImport };
};

const createLead = async (body, event = {}, options = {}) => {
  const lead = normalizeLead(body, event, options);
  const existing = await readLeadsRaw();
  const merged = mergeLeads(existing, [lead]);
  const result = await writeLeads(merged);
  return { lead, ...result };
};

const updateLead = async (id, patch = {}, user = {}) => {
  const existing = await readLeadsRaw();
  const index = existing.findIndex((item) => item.id === id);
  if (index < 0) return null;
  const current = existing[index];
  const next = { ...current, updatedAt: nowIso() };
  ["status", "market", "destinationPort", "budget", "vehicle", "interestedModel", "quantity", "fobOrCif", "quoteType", "message", "email", "whatsapp", "name", "country"].forEach((field) => {
    if (Object.prototype.hasOwnProperty.call(patch, field)) next[field] = clean(patch[field]);
  });
  if (Object.prototype.hasOwnProperty.call(patch, "assignedTo")) {
    next.assignedTo = normalizeAssignedTo(patch.assignedTo);
    next.assignedName = assignedName(next.assignedTo);
    if (next.assignedTo && next.status === "new") next.status = "assigned";
  }
  if (patch.status) next.status = normalizeStatus(patch.status, next.status);
  const noteText = firstValue(patch.note, patch.followUp, patch.follow_up);
  if (noteText) {
    next.notes = Array.isArray(next.notes) ? next.notes : [];
    next.notes.push({ id: leadId("NOTE"), createdAt: nowIso(), authorName: user.name || user.username || "admin", text: noteText });
    next.note = noteText;
    next.lastFollowUpAt = nowIso();
  }
  next.car_type = next.vehicle;
  next.interestedModel = next.interestedModel || next.vehicle;
  existing[index] = normalizeLead(next);
  await writeLeads(existing);
  return existing[index];
};

const textMatch = (item, keyword) => {
  const q = clean(keyword).toLowerCase();
  if (!q) return true;
  return [item.id, item.name, item.country, item.market, item.whatsapp, item.rawWhatsapp, item.email, item.vehicle, item.interestedModel, item.message, item.sourcePage, item.sourceUrl, item.assignedTo, item.assignedName].join(" ").toLowerCase().includes(q);
};

const startOfDay = (offset = 0) => { const d = new Date(); d.setHours(0, 0, 0, 0); d.setDate(d.getDate() + offset); return d; };
const startOfMonth = () => { const d = new Date(); d.setHours(0, 0, 0, 0); d.setDate(1); return d; };
const inRange = (value, start, end) => { const time = new Date(value || 0).getTime(); return time >= start.getTime() && (!end || time < end.getTime()); };

const datePass = (item, range) => {
  const value = item.createdAt;
  if (!range) return true;
  if (range === "today") return inRange(value, startOfDay(), startOfDay(1));
  if (range === "yesterday") return inRange(value, startOfDay(-1), startOfDay());
  if (range === "last7") return inRange(value, startOfDay(-6));
  if (range === "month") return inRange(value, startOfMonth());
  return true;
};

const filterLeads = (items = [], params = new URLSearchParams()) => {
  const source = clean(params.get("source"));
  const status = clean(params.get("status"));
  const market = clean(params.get("market"));
  const assignedTo = normalizeAssignedTo(params.get("assignedTo"));
  const q = firstValue(params.get("q"), params.get("keyword"));
  const range = firstValue(params.get("range"), params.get("dateRange"));
  const leadType = clean(params.get("leadType"));
  return items.filter((item) => {
    const type = sourceTypeOf(item);
    if (leadType === "website" && type !== "website_form") return false;
    if (leadType === "manual" && type !== "manual") return false;
    if (leadType === "whatsapp" && type !== "whatsapp_click") return false;
    if (source && type !== source && item.source !== source && item.sourceType !== source) return false;
    if (status && normalizeStatus(item.status) !== normalizeStatus(status)) return false;
    if (market && item.market !== market) return false;
    if (assignedTo && normalizeAssignedTo(item.assignedTo) !== assignedTo) return false;
    if (!datePass(item, range)) return false;
    if (!textMatch(item, q)) return false;
    return true;
  });
};

const isWebsiteForm = (item) => sourceTypeOf(item) === "website_form";
const isManual = (item) => sourceTypeOf(item) === "manual";
const isWhatsappClick = (item) => sourceTypeOf(item) === "whatsapp_click";
const isWhatsappButtonForm = (item) => isWebsiteForm(item) && /whatsapp/i.test([item.sourceDetail, item.sourceChannel, item.sourceEntry, item.sourceButton].join(" "));
const isAssigned = (item) => Boolean(normalizeAssignedTo(item.assignedTo));

const buildStats = (items = []) => {
  const customer = items.filter((item) => !isWhatsappClick(item));
  const today = startOfDay();
  const tomorrow = startOfDay(1);
  const yesterday = startOfDay(-1);
  const last7 = startOfDay(-6);
  const month = startOfMonth();
  const countStatus = (status) => customer.filter((item) => normalizeStatus(item.status) === status).length;
  const websiteForm = items.filter(isWebsiteForm).length;
  const manual = items.filter(isManual).length;
  const whatsappClicks = items.filter(isWhatsappClick).length;
  const whatsappForms = items.filter(isWhatsappButtonForm).length;
  const stats = {
    total: customer.length,
    today: customer.filter((item) => inRange(item.createdAt, today, tomorrow)).length,
    yesterday: customer.filter((item) => inRange(item.createdAt, yesterday, today)).length,
    last7Days: customer.filter((item) => inRange(item.createdAt, last7)).length,
    thisMonth: customer.filter((item) => inRange(item.createdAt, month)).length,
    new: countStatus("new") + countStatus("assigned"),
    assigned: customer.filter(isAssigned).length,
    contacted: countStatus("contacted"),
    quoted: countStatus("quoted"),
    waiting: countStatus("waiting"),
    won: countStatus("won"),
    closed: countStatus("closed"),
    lost: countStatus("lost"),
    website: websiteForm,
    manual,
    whatsapp: whatsappClicks,
    whatsappToday: items.filter((item) => isWhatsappClick(item) && inRange(item.createdAt, today, tomorrow)).length,
    unassigned: customer.filter((item) => !isAssigned(item)).length
  };
  return {
    ...stats,
    customerLeads: { total: customer.length, today: stats.today, yesterday: stats.yesterday, last7Days: stats.last7Days, thisMonth: stats.thisMonth },
    source: {
      allLeads: customer.length,
      websiteForm,
      whatsappForm: whatsappForms,
      manual,
      whatsappClickLeads: whatsappClicks,
      whatsappRawClicks: whatsappClicks,
      whatsappConvertedClicks: items.filter((item) => isWhatsappClick(item) && item.converted).length,
      whatsappClickConversionRate: whatsappClicks ? `${Math.round((items.filter((item) => isWhatsappClick(item) && item.converted).length / whatsappClicks) * 100)}%` : "0%"
    },
    assignment: {
      unassigned: stats.unassigned,
      assigned: stats.assigned,
      admin_chen: customer.filter((item) => normalizeAssignedTo(item.assignedTo) === "admin_chen").length,
      sales_zheng: customer.filter((item) => normalizeAssignedTo(item.assignedTo) === "sales_zheng").length
    },
    status: { new: countStatus("new") + countStatus("assigned"), contacted: stats.contacted, quoted: stats.quoted, waiting: stats.waiting, won: stats.won, lost: stats.lost, closed: stats.closed },
    tabs: { websiteForm, manual, whatsappClick: whatsappClicks, all: customer.length }
  };
};

const escapeCsv = (value) => `"${String(value ?? "").replace(/"/g, '""').replace(/\r?\n/g, " ")}"`;
const toCsv = (items = []) => {
  const headers = ["createdAt", "name", "country", "whatsapp", "email", "vehicle", "quantity", "budget", "fobOrCif", "destinationPort", "source", "status", "assignedTo", "message", "notes"];
  const rows = items.map((item) => headers.map((key) => {
    if (key === "notes") return escapeCsv((item.notes || []).map((note) => `${note.createdAt || ""} ${note.authorName || ""}: ${note.text || ""}`).join(" | "));
    if (key === "assignedTo") return escapeCsv(assignedName(item.assignedTo));
    return escapeCsv(item[key]);
  }).join(","));
  return `\ufeff${headers.join(",")}\n${rows.join("\n")}${rows.length ? "\n" : ""}`;
};

const defaultWhatsappSettings = () => ({
  activeMode: "default",
  defaultWhatsapp: { id: "default", name: "Default WhatsApp", displayName: "Zhonggu Auto Export", rawNumber: "+44 7473 271351", waNumber: "447473271351", active: true },
  salesNumbers: [],
  messageTemplate: { enabled: true, activeTemplateId: "vehicle_inquiry", templates: [], includeSource: true, includePage: true, includeVehicle: true, includeMarket: true },
  updatedAt: "",
  updatedBy: ""
});

const readWhatsappSettings = async () => readJson(SETTINGS_KEY, defaultWhatsappSettings());
const writeWhatsappSettings = async (settings, user = {}) => {
  const next = { ...defaultWhatsappSettings(), ...(settings || {}), updatedAt: nowIso(), updatedBy: user.name || user.username || "admin" };
  await writeJson(SETTINGS_KEY, next);
  return next;
};

module.exports = {
  assignedName,
  buildStats,
  createLead,
  filterLeads,
  firstValue,
  leadId,
  normalizeAssignedTo,
  normalizeLead,
  readLeads,
  readWhatsappSettings,
  sourceTypeOf,
  toCsv,
  updateLead,
  writeWhatsappSettings
};