const { json, requireAdmin } = require("./admin-session");

const settings = () => ({
  activeMode: "default",
  defaultWhatsapp: {
    id: "default",
    name: "Default WhatsApp",
    displayName: "Zhonggu Auto Export",
    rawNumber: "+44 7473 271351",
    waNumber: "447473271351",
    active: true
  },
  salesNumbers: [],
  messageTemplate: {
    enabled: true,
    activeTemplateId: "vehicle_inquiry",
    templates: [],
    includeSource: true,
    includePage: true,
    includeVehicle: true,
    includeMarket: true
  },
  updatedAt: "",
  updatedBy: ""
});

exports.handler = async (event) => {
  const user = requireAdmin(event);
  if (user.statusCode) return user;

  if (event.httpMethod === "GET") return json(200, { ok: true, success: true, settings: settings() });
  if (event.httpMethod === "POST") {
    return json(501, { ok: false, success: false, message: "当前线上后台为轻量版，暂不支持保存 WhatsApp 设置。", error: "当前线上后台为轻量版，暂不支持保存 WhatsApp 设置。" });
  }
  return json(405, { ok: false, success: false, message: "Method not allowed" });
};