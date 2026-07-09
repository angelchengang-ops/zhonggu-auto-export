const { clearSessionCookie, json } = require("./admin-session");

exports.handler = async (event) => {
  if (event.httpMethod !== "POST") return json(405, { ok: false, success: false, message: "Method not allowed" });
  return json(200, { ok: true, success: true }, { "Set-Cookie": clearSessionCookie() });
};