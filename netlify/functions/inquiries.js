const { blobDebug, createLead, firstValue, normalizeLead, recoverSyntheticFormAttempts } = require("./crm-store");
const { getAdminUser } = require("./admin-session");
const phoneRules = require("../../scripts/lib/phone");

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

const syntheticRequested = (body = {}) => body.is_test === true || String(body.is_test ?? body.isTest ?? "").toLowerCase() === "true";
const APPROVED_SYNTHETIC_RECOVERY = Object.freeze({
  "AUTO-TEST-20260827": ["INQ-20260827023014-B00CF8", "NF-6a8fa138bd480f6fcad7a8ac"]
});
const safeEqual = (left, right) => {
  const a = Buffer.from(String(left || ""));
  const b = Buffer.from(String(right || ""));
  return a.length === b.length && require("crypto").timingSafeEqual(a, b);
};
const authorizeSynthetic = (event, body = {}) => {
  if (!syntheticRequested(body)) return false;
  const expected = process.env.ZHONGGU_SYNTHETIC_LEAD_SECRET;
  const supplied = getHeader(event.headers, "x-zhonggu-synthetic-secret");
  const secretAuthorized = Boolean(expected) && safeEqual(supplied, expected);
  const adminAuthorized = Boolean(getAdminUser(event));
  if (!secretAuthorized && !adminAuthorized) throw Object.assign(new Error("Synthetic lead authorization failed"), { statusCode: 403 });
  const testType = String(body.test_type || body.testType || "");
  const testId = String(body.test_id || body.testId || "");
  if (testType !== "daily_morning_check" || !/^AUTO-TEST-\d{8}(?:-[A-Z0-9_]{2,32})?$/.test(testId)) throw Object.assign(new Error("Invalid synthetic lead metadata"), { statusCode: 400 });
  if (body.id && String(body.id) !== testId) throw Object.assign(new Error("Synthetic lead ID must match test_id"), { statusCode: 400 });
  return true;
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
    const isTest = authorizeSynthetic(event, body);
    const markedTestUrl = [getHeader(event.headers, "referer"), body.sourceUrl, body.source_url, body.pageUrl, body.page_url]
      .some(value => { try { return new URL(value).searchParams.has("daily_test_id"); } catch { return false; } });
    if (!isTest && (markedTestUrl || body.test_id || body.testId || body.test_type || body.testType)) {
      throw Object.assign(new Error("Test-marked requests cannot enter the ordinary inquiry channel"), { statusCode: 403 });
    }
    if (isTest && APPROVED_SYNTHETIC_RECOVERY[body.test_id]) {
      results.recovery = await recoverSyntheticFormAttempts(body.test_id, APPROVED_SYNTHETIC_RECOVERY[body.test_id]);
    }
    isClickEvent = isWhatsappClickRequest(event, body);
    if (isClickEvent && !Object.keys(body).length) body = clickFallbackBody(event);
    if (!isClickEvent && !isTest) {
      const code = firstValue(body.callingCode, body.calling_code, body.countryCode, body.country_code, body.dial_code);
      const direct = firstValue(body.whatsapp, body.rawWhatsapp, body.raw_whatsapp, body.phone, body.mobile, body.tel);
      const national = firstValue(body.phoneNumber, body.phone_number, body.whatsappLocal, body.national_phone);
      const value = direct || national;
      const phone = phoneRules.normalize(value, code) || (!code && /^\d+$/.test(value) ? phoneRules.normalize('+' + value) : null);
      if (!phone) throw Object.assign(new Error("Enter a valid phone number with its country calling code"), { statusCode: 400 });
      body = { ...body, whatsapp: phone.number, rawWhatsapp: phone.formatted, countryCode: phone.callingCode,
        whatsappLocal: phone.nationalNumber, phoneCountry: phone.country };
      // Destination/customer country is deliberately independent of phoneCountry.
    }
    lead = normalizeLead(body, event, { kind: isClickEvent ? "whatsapp_click" : "website", isTest });
    assertLead(lead, isClickEvent);

    console.info("[inquiries] received", { path: event.path, source: lead.source, sourceType: lead.sourceType, eventType: lead.eventType || "" });

    let saved;
    try {
      saved = await createLead(lead, event, { kind: isClickEvent ? "whatsapp_click" : "website", isTest });
      results.blobs = true;
      results.storage = saved.storage;
      Object.assign(lead, saved.lead);
      results.duplicate = saved.duplicate === true;
      console.info("[inquiries] stored in blobs", { id: lead.id, source: lead.source, sourceType: lead.sourceType, storage: saved.storage });
    } catch (error) {
      results.blobsError = error.message;
      console.error("[inquiries] blobs write failed", { source: lead.source, sourceType: lead.sourceType, error: error.message });
      // A failed/uncertain primary write must not create a second ordinary lead
      // through a separate Forms channel. The client can retry the same request.
      return json(500, {
        ok: false,
        success: false,
        stored: false,
        id: lead.id,
        source: responseSourceFor(event, isClickEvent),
        storedSource: lead.source,
        sourceType: lead.sourceType,
        error: error.message,
        debug: blobDebug(),
        results
      });
    }

    if (lead.is_test) results.externalActionsSuppressed = true;
    else if (!results.duplicate) try { results.webhook = await forwardWebhook(lead); } catch (error) { results.webhookError = error.message; }

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
      error: error.message || "Lead submission failed",
      debug: blobDebug()
    });
  }
};
