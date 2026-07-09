const { readWhatsappSettings, writeWhatsappSettings } = require("./crm-store");
const { json, requireAdmin } = require("./admin-session");

const parseBody = (event) => {
  const raw = event.body || "";
  if (!raw) return {};
  if (raw.trim().startsWith("{") || raw.trim().startsWith("[")) return JSON.parse(raw);
  return Object.fromEntries(new URLSearchParams(raw).entries());
};

exports.handler = async (event) => {
  const user = requireAdmin(event);
  if (user.statusCode) return user;
  if (event.httpMethod === "GET") return json(200, { ok: true, success: true, settings: await readWhatsappSettings() });
  if (event.httpMethod === "POST") return json(200, { ok: true, success: true, settings: await writeWhatsappSettings(parseBody(event), user) });
  return json(405, { ok: false, success: false, message: "Method not allowed" });
};