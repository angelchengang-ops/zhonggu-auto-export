const { readWhatsappSettings } = require("./crm-store");

const json = (statusCode, body) => ({
  statusCode,
  headers: {
    "Content-Type": "application/json; charset=utf-8",
    "Cache-Control": "no-store",
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "Content-Type",
    "Access-Control-Allow-Methods": "GET, OPTIONS"
  },
  body: JSON.stringify(body)
});

const clean = (value) => String(value ?? "").trim();
const digits = (value) => clean(value).replace(/^00/, "").replace(/\D/g, "");

const pickNumber = (settings = {}) => {
  const defaultNumber = settings.defaultWhatsapp || {};
  if (defaultNumber.active !== false && (defaultNumber.waNumber || defaultNumber.rawNumber)) {
    return {
      waNumber: digits(defaultNumber.waNumber || defaultNumber.rawNumber),
      displayName: clean(defaultNumber.displayName || defaultNumber.name || "Zhonggu Auto Export")
    };
  }
  const sales = (Array.isArray(settings.salesNumbers) ? settings.salesNumbers : []).find((item) => item.active !== false && (item.waNumber || item.rawNumber));
  return {
    waNumber: digits(sales?.waNumber || sales?.rawNumber || "8618661888866"),
    displayName: clean(sales?.displayName || sales?.name || "Zhonggu Auto Export")
  };
};

const pickTemplate = (settings = {}, templateId = "") => {
  const config = settings.messageTemplate || {};
  const templates = Array.isArray(config.templates) ? config.templates : [];
  const id = clean(templateId || config.activeTemplateId || "vehicle_inquiry");
  return templates.find((item) => item.id === id) || templates.find((item) => item.id === "general_inquiry") || {
    customerTextEn: "Hello, I am interested in {vehicle}. Please send me FOB prices and shipping options."
  };
};

const buildMessage = (template = {}, params = new URLSearchParams(), displayName = "Zhonggu Auto Export") => {
  const replacements = {
    vehicle: clean(params.get("vehicle")) || "vehicles from Zhonggu Auto Export",
    source: clean(params.get("source")) || "website",
    page: clean(params.get("page")) || clean(params.get("sourcePage")) || "/",
    market: clean(params.get("market")) || "",
    type: clean(params.get("type")) || "",
    salesName: displayName
  };
  const source = clean(template.customerTextEn || template.defaultText) || "Hello, I am interested in {vehicle}. Please send me FOB prices and shipping options.";
  return source.replace(/\{(vehicle|source|page|market|type|salesName)\}/g, (_, key) => replacements[key] || "");
};

exports.handler = async (event) => {
  if (event.httpMethod === "OPTIONS") return json(204, {});
  if (event.httpMethod !== "GET") return json(405, { ok: false, success: false, message: "Method not allowed" });

  const url = new URL(event.rawUrl || `https://www.zhongguauto.com${event.path || "/api/public/whatsapp-link"}`);
  const settings = await readWhatsappSettings();
  const number = pickNumber(settings);
  if (!number.waNumber) return json(500, { ok: false, success: false, message: "WhatsApp number is not configured" });

  const template = pickTemplate(settings, url.searchParams.get("templateId"));
  const message = buildMessage(template, url.searchParams, number.displayName);
  const waUrl = `https://wa.me/${number.waNumber}?text=${encodeURIComponent(message)}`;

  return json(200, { ok: true, success: true, url: waUrl, waNumber: number.waNumber, message });
};
