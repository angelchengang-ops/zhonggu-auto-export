const { readLeads, sourceTypeOf } = require("./crm-store");
const { json, requireAdmin } = require("./admin-session");

exports.handler = async (event) => {
  if (event.httpMethod !== "GET") return json(405, { ok: false, success: false, message: "Method not allowed" });
  const user = requireAdmin(event);
  if (user.statusCode) return user;
  const { items } = await readLeads({ syncForms: true });
  const clicks = items.filter((item) => !item.is_test && sourceTypeOf(item) === "whatsapp_click");
  return json(200, { ok: true, success: true, clicks });
};
