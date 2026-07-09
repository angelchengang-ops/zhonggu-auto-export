const { createLead, firstValue, normalizeLead } = require("./crm-store");

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

const getHeader = (headers = {}, name) => {
  const target = String(name).toLowerCase();
  const key = Object.keys(headers || {}).find((item) => item.toLowerCase() === target);
  return key ? headers[key] : "";
};

const parseBody = (event) => {
  let raw = event.body || "";
  if (event.isBase64Encoded && raw) raw = Buffer.from(raw, "base64").toString("utf8");
  const contentType = getHeader(event.headers, "content-type");
  if (!raw) return {};
  const text = String(raw).trim();
  if (contentType.includes("application/json") || text.startsWith("{") || text.startsWith("[")) return JSON.parse(text);
  const params = new URLSearchParams(raw);
  return Object.fromEntries(params.entries());
};

const assertLead = (lead, isClickEvent) => {
  if (isClickEvent) return;
  if (!lead.name) throw Object.assign(new Error("Name is required"), { statusCode: 400 });
  if (!lead.country) throw Object.assign(new Error("Country is required"), { statusCode: 400 });
  if (!lead.whatsapp) throw Object.assign(new Error("WhatsApp is required"), { statusCode: 400 });
  if (!lead.vehicle) throw Object.assign(new Error("Vehicle is required"), { statusCode: 400 });
};

const requestPath = (event = {}) => `${event.path || ""} ${event.rawUrl || ""}`;
const responseSourceFor = (event, isClickEvent) => {
  const path = requestPath(event).toLowerCase();
  if (isClickEvent) return "whatsapp_click";
  if (path.includes("/api/public/whatsapp-lead")) return "whatsapp";
  return "website";
};
const isWhatsappClickRequest = (event, body = {}) => {
  const eventType = firstValue(body.eventType, body.event_type).toLowerCase();
  const path = requestPath(event).toLowerCase();
  return path.includes("whatsapp-clicks") || eventType.includes("click") || eventType === "whatsapp_form_open";
};

const clickFallbackBody = (event = {}) => ({
  eventType: "whatsapp_click",
  source: "whatsapp_click",
  sourceType: "whatsapp_click",
  sourceDetail: "WhatsApp Click",
  sourceButton: "WhatsApp button",
  pageUrl: getHeader(event.headers, "referer") || "",
  sourceUrl: getHeader(event.headers, "referer") || "",
  sourcePage: getHeader(event.headers, "referer") || "",
  vehicle: "Vehicles from Zhonggu Auto Export",
  createdAt: new Date().toISOString()
});

const submitToNetlifyForm = async (lead, event) => {
  const siteUrl = (process.env.URL || process.env.DEPLOY_PRIME_URL || getHeader(event.headers, "origin") || "https://zhongguauto.com").replace(/\/$/, "");
  const params = new URLSearchParams();
  params.set("form-name", process.env.NETLIFY_FORM_NAME || "inquiry");
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
  if (event.httpMethod !== "POST") return json(405, { ok: false, success: false, stored: false, error: "POST required" });

  let body = {};
  let lead = null;
  let isClickEvent = false;
  const results = { blobs: false, webhook: false, netlifyFormFallback: false };

  try {
    body = parseBody(event);
    isClickEvent = isWhatsappClickRequest(event, body);
    if (isClickEvent && !Object.keys(body).length) body = clickFallbackBody(event);
    lead = normalizeLead(body, event, { kind: isClickEvent ? "whatsapp_click" : "website" });
    assertLead(lead, isClickEvent);

    console.info("[inquiries] received", { path: event.path, source: lead.source, sourceType: lead.sourceType, eventType: lead.eventType || "" });

    let saved;
    try {
      saved = await createLead(lead, event, { kind: isClickEvent ? "whatsapp_click" : "website" });
      results.blobs = true;
      results.storage = saved.storage;
      Object.assign(lead, saved.lead);
      console.info("[inquiries] stored in blobs", { id: lead.id, source: lead.source, sourceType: lead.sourceType, storage: saved.storage });
    } catch (error) {
      results.blobsError = error.message;
      console.error("[inquiries] blobs write failed", { source: lead.source, sourceType: lead.sourceType, error: error.message });
      if (!isClickEvent) {
        try { results.netlifyFormFallback = await submitToNetlifyForm(lead, event); }
        catch (fallbackError) { results.netlifyFormError = fallbackError.message; }
      }
      return json(500, {
        ok: false,
        success: false,
        stored: false,
        id: lead.id,
        source: responseSourceFor(event, isClickEvent),
        storedSource: lead.source,
        sourceType: lead.sourceType,
        error: error.message,
        results
      });
    }

    try { results.webhook = await forwardWebhook(lead); } catch (error) { results.webhookError = error.message; }

    return json(200, {
      ok: true,
      success: true,
      stored: true,
      id: lead.id,
      source: responseSourceFor(event, isClickEvent),
      storedSource: lead.source,
      sourceType: lead.sourceType,
      storage: results.storage || "netlify-blobs",
      lead,
      inquiry: lead,
      results
    });
  } catch (error) {
    console.error("[inquiries] request failed", { path: event.path, error: error.message });
    return json(error.statusCode || 500, {
      ok: false,
      success: false,
      stored: false,
      source: responseSourceFor(event, isClickEvent),
      storedSource: lead?.source || "",
      sourceType: lead?.sourceType || (isClickEvent ? "whatsapp_click" : "website"),
      error: error.message || "Lead submission failed"
    });
  }
};