const crypto = require("crypto");

const json = (statusCode, body) => ({
  statusCode,
  headers: {
    "Content-Type": "application/json; charset=utf-8",
    "Cache-Control": "no-store",
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "Content-Type",
    "Access-Control-Allow-Methods": "POST, OPTIONS"
  },
  body: JSON.stringify(body)
});

const firstValue = (...values) => values.map((value) => String(value ?? "").trim()).find(Boolean) || "";
const digits = (value) => String(value || "").replace(/^00/, "").replace(/\D/g, "");
const nowIso = () => new Date().toISOString();
const leadId = () => "INQ-" + new Date().toISOString().replace(/[-:.TZ]/g, "").slice(0, 14) + "-" + crypto.randomBytes(3).toString("hex").toUpperCase();

const parseBody = (event) => {
  const raw = event.body || "";
  const contentType = event.headers?.["content-type"] || event.headers?.["Content-Type"] || "";
  if (contentType.includes("application/json")) return raw ? JSON.parse(raw) : {};
  const params = new URLSearchParams(raw);
  return Object.fromEntries(params.entries());
};

const normalizeWhatsapp = (body) => {
  const countryCode = digits(firstValue(body.countryCode, body.country_code, body.leadCountryCode));
  const local = digits(firstValue(body.whatsappLocal, body.whatsapp_local, body.leadWhatsappLocal));
  if (countryCode && local) {
    const normalizedLocal = local.startsWith(countryCode) && local.length > countryCode.length + 4 ? local.slice(countryCode.length) : local;
    return {
      countryCode: "+" + countryCode,
      whatsappLocal: normalizedLocal,
      rawWhatsapp: "+" + countryCode + " " + normalizedLocal,
      whatsapp: countryCode + normalizedLocal
    };
  }
  const raw = firstValue(body.rawWhatsapp, body.raw_whatsapp, body.whatsapp, body.phone, body.mobile, body.tel);
  return { rawWhatsapp: raw, whatsapp: digits(raw) || raw };
};

const normalizeLead = (body = {}, event = {}) => {
  const whatsapp = normalizeWhatsapp(body);
  const createdAt = firstValue(body.createdAt, body.created_at, body.submittedAt, body.submitted_at) || nowIso();
  const vehicle = firstValue(body.vehicle, body.car_type, body.interestedModel, body.interested_model, body.model, body.car, body.requirement);
  const port = firstValue(body.destinationPort, body.port, body.destination_port, body.destination);
  const budget = firstValue(body.budget, body.budgetPerUnit, body.budget_per_unit, body.totalBudget, body.total_budget);
  const sourceUrl = firstValue(body.sourceUrl, body.source_url, body.pageUrl, body.page_url, event.headers?.referer);
  return {
    id: firstValue(body.id) || leadId(),
    createdAt,
    name: firstValue(body.name, body.contact_name, body.fullName, body.full_name),
    country: firstValue(body.country, body.market_country),
    port,
    destinationPort: port,
    vehicle,
    interestedModel: vehicle,
    budget,
    whatsapp: whatsapp.whatsapp,
    rawWhatsapp: whatsapp.rawWhatsapp,
    countryCode: whatsapp.countryCode || firstValue(body.countryCode, body.country_code),
    whatsappLocal: whatsapp.whatsappLocal || firstValue(body.whatsappLocal, body.whatsapp_local),
    email: firstValue(body.email, body.mail, body.emailAddress, body.customerEmail),
    message: firstValue(body.message, body.requirements, body.remark, body.comments),
    source: firstValue(body.source, body.sourceType, body.source_type) || "website_form",
    sourceDetail: firstValue(body.sourceDetail, body.source_detail),
    sourceChannel: firstValue(body.sourceChannel, body.source_channel),
    sourceEntry: firstValue(body.sourceEntry, body.source_entry),
    sourcePage: firstValue(body.sourcePage, body.source_page, body.page) || sourceUrl,
    sourceUrl,
    sourceButton: firstValue(body.sourceButton, body.source_button, body.buttonText),
    assignedTo: firstValue(body.assignedTo, body.assigned_to),
    status: firstValue(body.status) || "new",
    raw: body
  };
};

const assertLead = (lead, isClickEvent) => {
  if (isClickEvent) return;
  if (!lead.name) throw Object.assign(new Error("Name is required"), { statusCode: 400 });
  if (!lead.country) throw Object.assign(new Error("Country is required"), { statusCode: 400 });
  if (!lead.whatsapp) throw Object.assign(new Error("WhatsApp is required"), { statusCode: 400 });
  if (!lead.vehicle) throw Object.assign(new Error("Vehicle is required"), { statusCode: 400 });
};

const submitToNetlifyForm = async (lead, event) => {
  const siteUrl = (process.env.URL || process.env.DEPLOY_PRIME_URL || event.headers?.origin || "https://zhongguauto.com").replace(/\/$/, "");
  const params = new URLSearchParams();
  params.set("form-name", "inquiry");
  params.set("name", lead.name);
  params.set("country", lead.country);
  params.set("whatsapp", lead.rawWhatsapp || lead.whatsapp);
  params.set("email", lead.email);
  params.set("model", lead.vehicle);
  params.set("vehicle", lead.vehicle);
  params.set("car_type", lead.vehicle);
  params.set("destinationPort", lead.destinationPort);
  params.set("port", lead.destinationPort);
  params.set("budget", lead.budget);
  params.set("message", lead.message);
  params.set("source_page", lead.sourcePage);
  params.set("source_url", lead.sourceUrl);
  params.set("source", lead.source);
  params.set("createdAt", lead.createdAt);
  const response = await fetch(siteUrl + "/", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: params.toString()
  });
  if (!response.ok) throw new Error("Netlify Forms fallback failed with HTTP " + response.status);
  return true;
};

const forwardWebhook = async (lead) => {
  const url = process.env.ZHONGGU_LEAD_WEBHOOK_URL;
  if (!url) return false;
  const headers = { "Content-Type": "application/json" };
  if (process.env.ZHONGGU_LEAD_WEBHOOK_SECRET) headers["X-Zhonggu-Lead-Secret"] = process.env.ZHONGGU_LEAD_WEBHOOK_SECRET;
  const response = await fetch(url, { method: "POST", headers, body: JSON.stringify({ success: true, lead }) });
  if (!response.ok) throw new Error("Lead webhook failed with HTTP " + response.status);
  return true;
};

exports.handler = async (event) => {
  if (event.httpMethod === "OPTIONS") return json(204, {});
  if (event.httpMethod !== "POST") return json(405, { success: false, error: "POST required" });
  try {
    const body = parseBody(event);
    const isClickEvent = String(event.path || "").includes("whatsapp-clicks") || firstValue(body.eventType, body.event_type).includes("click") || firstValue(body.eventType, body.event_type) === "whatsapp_form_open";
    const lead = normalizeLead(body, event);
    if (isClickEvent) lead.status = "whatsapp_click";
    assertLead(lead, isClickEvent);
    const results = { webhook: false, netlifyForm: false };
    try { results.webhook = await forwardWebhook(lead); } catch (error) { results.webhookError = error.message; }
    if (!isClickEvent) {
      try { results.netlifyForm = await submitToNetlifyForm(lead, event); } catch (error) { results.netlifyFormError = error.message; }
    }
    const stored = Boolean(results.webhook || results.netlifyForm);
    return json(stored ? 200 : 202, { success: true, id: lead.id, lead, inquiry: lead, stored, results, storage: stored ? "netlify_function" : "not_persisted_configure_ZHONGGU_LEAD_WEBHOOK_URL" });
  } catch (error) {
    return json(error.statusCode || 500, { success: false, error: error.message || "Lead submission failed" });
  }
};
