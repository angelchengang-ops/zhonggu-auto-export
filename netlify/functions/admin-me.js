const { ADMIN_USER, json, requireAdmin } = require("./admin-session");

exports.handler = async (event) => {
  if (event.httpMethod !== "GET") return json(405, { ok: false, success: false, message: "Method not allowed" });
  const user = requireAdmin(event);
  if (user.statusCode) return user;
  return json(200, { ok: true, success: true, user: ADMIN_USER });
};