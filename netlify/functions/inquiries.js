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

const parseBody = (event) => {
  const raw = event.body || "";
  const contentType = event.headers?.["content-type"] || event.headers?.["Content-Type"] || "";
  if (!raw) return {};
  if (contentType.includes("application/json") || raw.trim().startsWith("{") || raw.trim().startsWith("[")) return JSON.parse(raw);
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

const submitToNetlifyForm = async (lead, event) => {
  const siteUrl = (process.env.URL || process.env.DEPLOY_PRIME_URL || event.headers?.origin || "https://zhongguauto.com").replace(/\/$/, "");
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
  if (event.httpMethod !== "POST") return json(405, { ok: false, success: false, error: "POST required" });
  try {
    const body = parseBody(event);
    const eventType = firstValue(body.eventType, body.event_type);
    const isClickEvent = String(event.path || "").includes("whatsapp-clicks") || eventType.includes("click") || eventType === "whatsapp_form_open";
    const lead = normalizeLead(body, event, { kind: isClickEvent ? "whatsapp_click" : "website" });
    assertLead(lead, isClickEvent);

    const results = { blobs: false, webhook: false, netlifyForm: false };
    try {
      const saved = await createLead(lead, event, { kind: isClickEvent ? "whatsapp_click" : "website" });
      results.blobs = true;
      results.storage = saved.storage;
      Object.assign(lead, saved.lead);
    } catch (error) {
      results.blobsError = error.message;
    }
    try { results.webhook = await forwardWebhook(lead); } catch (error) { results.webhookError = error.message; }
    if (!isClickEvent) {
      try { results.netlifyForm = await submitToNetlifyForm(lead, event); } catch (error) { results.netlifyFormError = error.message; }
    }

    const stored = Boolean(results.blobs || results.webhook || results.netlifyForm);
    return json(stored ? 200 : 202, { ok: true, success: true, id: lead.id, lead, inquiry: lead, stored, results, storage: results.blobs ? "netlify-blobs" : stored ? "fallback" : "not_persisted" });
  } catch (error) {
    return json(error.statusCode || 500, { ok: false, success: false, error: error.message || "Lead submission failed" });
  }
};