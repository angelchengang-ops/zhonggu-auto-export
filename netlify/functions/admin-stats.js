const { buildStats, readLeads } = require("./crm-store");
const { json, requireAdmin } = require("./admin-session");

exports.handler = async (event) => {
  if (event.httpMethod !== "GET") return json(405, { ok: false, success: false, message: "Method not allowed" });
  const user = requireAdmin(event);
  if (user.statusCode) return user;
  const { items, formsImport } = await readLeads({ syncForms: true });
  return json(200, { ok: true, success: true, stats: buildStats(items), items, formsImport });
};